'use client'

// src/hooks/useNotificaciones.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: ReturnType<typeof createClient>) => s as any

export type EstadoPermiso = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PreferenciasNotif {
  canal_push: boolean
  canal_email: boolean
  canal_whatsapp: boolean
  hora_resumen: string
  activo: boolean
}

const PREF_DEFAULT: PreferenciasNotif = {
  canal_push: true, canal_email: true, canal_whatsapp: true,
  hora_resumen: '08:00', activo: true,
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function useNotificaciones() {
  const [soportado, setSoportado] = useState(false)
  const [permiso, setPermiso] = useState<EstadoPermiso>('default')
  const [suscripto, setSuscripto] = useState(false)
  const [preferencias, setPreferencias] = useState<PreferenciasNotif | null>(null)
  const [prefExisteEnDB, setPrefExisteEnDB] = useState(false) // para saber si hacer insert o update
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      try {
        if ('serviceWorker' in navigator) {
          // Registro explícito antes de esperar al .ready
          await navigator.serviceWorker.register('/sw.js');
          console.log("Service Worker registrado con éxito");
        }
        // 1. Verificar soporte
        const pushOk = 'serviceWorker' in navigator && 'PushManager' in window
        setSoportado(pushOk)
        if (!pushOk) { setLoading(false); return }

        setPermiso(Notification.permission as EstadoPermiso)

        // 2. Obtener usuario
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) { setLoading(false); return }

        // 3. Cargar preferencias — sin .single(), sin insert automático
        // Si no existe la fila, simplemente mostramos los defaults en la UI.
        // El insert se hace solo cuando el usuario interactúa (guardarPreferencias).
        const { data: rows } = await db(supabase)
          .from('preferencias_notificaciones')
          .select('canal_push, canal_email, canal_whatsapp, hora_resumen, activo')
          .eq('usuario_id', user.id)
          .limit(1)

        const pref = Array.isArray(rows) ? rows[0] : null

        if (pref) {
          setPrefExisteEnDB(true)
          setPreferencias({
            canal_push: pref.canal_push ?? true,
            canal_email: pref.canal_email ?? true,
            canal_whatsapp: pref.canal_whatsapp ?? true,
            hora_resumen: pref.hora_resumen ?? '08:00',
            activo: pref.activo ?? true,
          })
        } else {
          // No existe en DB — mostrar defaults sin tocar la base de datos
          setPrefExisteEnDB(false)
          setPreferencias(PREF_DEFAULT)
        }

        // 4. Verificar suscripción push existente en el browser
        try {
          const reg = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 3000)
            ),
          ]) as ServiceWorkerRegistration

          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            const { data: subRows } = await db(supabase)
              .from('push_subscriptions')
              .select('id')
              .eq('usuario_id', user.id)
              .eq('endpoint', sub.endpoint)
              .limit(1)
            setSuscripto(!!(Array.isArray(subRows) && subRows[0]))
          }
        } catch {
          // SW no disponible todavía — no es crítico
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al inicializar')
      } finally {
        setLoading(false)
      }
    }
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Desuscribirse ─────────────────────────────────────────────────────────
  const desuscribirse = useCallback(async (): Promise<void> => {
    setSaving(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setSuscripto(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar')
    } finally {
      setSaving(false)
    }
  }, [])

  // ── Guardar preferencias (insert o update según corresponda) ──────────────
  // src/hooks/useNotificaciones.ts

  const guardarPreferencias = useCallback(async (data: Partial<PreferenciasNotif>): Promise<void> => {
    setSaving(true)
    setError(null)
    try {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) throw new Error('No autenticado')

      if (prefExisteEnDB) {
        // CASO A: La fila ya existe en la tabla -> UPDATE
        const { error: err } = await db(supabase)
          .from('preferencias_notificaciones')
          .update(data)
          .eq('usuario_id', user.id)

        if (err) throw new Error(err.message)
      } else {
        // CASO B: Es la primera vez que guarda -> INSERT
        // Combinamos los defaults con los cambios que vienen en 'data'
        const toInsert = {
          ...PREF_DEFAULT,
          ...data,
          usuario_id: user.id
        }

        const { error: err } = await db(supabase)
          .from('preferencias_notificaciones')
          .upsert({
            usuario_id: user.id,
            ...PREF_DEFAULT,
            ...data
          }, { onConflict: 'usuario_id' });

        if (err) {
          // Error 23503: Clave foránea violada (el usuario_id no existe en la tabla 'usuarios')
          if (err.code === '23503') {
            throw new Error('Error de perfil: Tu usuario aún no existe en la tabla de usuarios pública.')
          }
          throw new Error(err.message)
        }

        // Si el insert fue exitoso, marcamos que ahora sí existe en DB
        setPrefExisteEnDB(true)
      }

      // Actualizamos el estado local para que la UI se refresque
      setPreferencias(prev => prev ? { ...prev, ...data } : { ...PREF_DEFAULT, ...data })

      // Si desactivaron el canal push en la UI, cancelamos la suscripción del navegador
      if (data.canal_push === false && suscripto) {
        await desuscribirse()
      }

    } catch (err) {
      console.error('[Finti] Error en guardarPreferencias:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [supabase, prefExisteEnDB, suscripto, desuscribirse]) // Importante: desuscribirse debe estar definido arriba
  
  // ── Suscribirse ───────────────────────────────────────────────────────────
const suscribirse = useCallback(async (): Promise<boolean> => {
  if (!soportado) {
    setError('Tu navegador no soporta notificaciones push')
    return false
  }

  setSaving(true)
  setError(null)

  try {
    console.log('[Notif] Iniciando suscripción push...')

    // 1. Pedir permiso de notificaciones
    const nuevoPermiso = await Notification.requestPermission()
    setPermiso(nuevoPermiso as EstadoPermiso)

    if (nuevoPermiso !== 'granted') {
      const msg = nuevoPermiso === 'denied'
        ? 'Permiso denegado. Activá las notificaciones en la configuración del navegador.'
        : 'No se concedió el permiso'
      setError(msg)
      return false
    }

    // 2. Obtener Service Worker
    const reg = await navigator.serviceWorker.ready

    // 3. Obtener clave VAPID
    const vapidRes = await fetch('/api/push/vapid-public')
    if (!vapidRes.ok) throw new Error('No se pudo obtener la clave VAPID del servidor')
    const { publicKey } = await vapidRes.json()

    // 4. Crear subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
    })

    console.log('[Notif] Subscription creada en el browser')

    // 5. Obtener sesión actual (forma más confiable)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.access_token) {
      console.error('[Notif] ❌ No hay sesión activa:', sessionError)
      throw new Error('No hay sesión activa. Iniciá sesión nuevamente.')
    }

    console.log('[Notif] Sesión obtenida correctamente')

    // 6. Enviar subscription al backend
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ subscription }),
    })

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}))
      throw new Error(errorBody.error || `Error del servidor (${res.status})`)
    }

    setSuscripto(true)
    console.log('[Notif] ✅ Suscripción push completada con éxito')
    return true

  } catch (err: any) {
    console.error('[Notif] ❌ Error en suscribirse:', err)
    setError(err.message || 'Error al activar notificaciones')
    return false
  } finally {
    setSaving(false)
  }
}, [soportado, supabase])



  // ── Notificación de prueba corregida ────────────────────────────────────────
const probarNotificacion = useCallback(async (): Promise<void> => {
  setSaving(true)
  setError(null)
  try {
    // 1. Obtenemos la sesión actual para sacar el token
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No hay una sesión activa. Por favor, reingresá al sistema.')
    }

    // 2. Pasamos el token en el header Authorization
    const res = await fetch('/api/push/test', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}` // <--- ESTO ES LO QUE FALTA
      }
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Error del servidor (${res.status})`)
    }

    console.log('[Notif] Prueba enviada con éxito')

  } catch (err) {
    console.error('[Notif] Error en la prueba:', err)
    setError(err instanceof Error ? err.message : 'Error en la prueba')
  } finally {
    setSaving(false)
  }
}, [supabase]) // Agregá supabase a las dependencias

  return {
    soportado, permiso, suscripto, preferencias,
    loading, saving, error,
    suscribirse, desuscribirse, guardarPreferencias, probarNotificacion,
  }
}