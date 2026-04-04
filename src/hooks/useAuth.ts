'use client'

// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

export function useAuth() {
  const [user,    setUser]    = useState<Any>(null)
  const [perfil,  setPerfil]  = useState<Any>(null)
  const [negocio, setNegocio] = useState<Any>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [pendienteConfirmacion, setPendienteConfirmacion] = useState(false)
  const [emailPendiente,        setEmailPendiente]        = useState<string | null>(null)

  const supabase = createClient()

  const cargarPerfil = useCallback(async (userId: string): Promise<void> => {
    try {
      // FIX: .maybeSingle() nunca tira 406 — devuelve null si no hay fila
      const { data: perfilData } = await (supabase as Any)
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!perfilData) {
        // Usuario nuevo sin perfil todavía — es válido, no es error
        // Puede pasar cuando el trigger de DB no corrió o el registro
        // está en proceso. La app carga igual sin datos de perfil.
        setPerfil(null)
        setNegocio(null)
        return
      }

      setPerfil(perfilData)

      const perfilAny = perfilData as Any
      if (perfilAny.negocio_id) {
        const { data: negocioData } = await (supabase as Any)
          .from('negocios')
          .select('*')
          .eq('id', perfilAny.negocio_id)
          .maybeSingle()

        if (negocioData) setNegocio(negocioData)
      }
    } catch (err) {
      // No bloquear la carga por errores de perfil
      console.warn('[useAuth] cargarPerfil error:', err)
    } finally {
      // FIX CRÍTICO: setLoading(false) SIEMPRE debe ejecutarse.
      // Sin esto, si el perfil no existe (usuario nuevo), la app
      // se queda en loading infinito.
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        void cargarPerfil(session.user.id)
      } else {
        // Sin sesión — terminar loading
        setLoading(false)
      }
    })

    // Escuchar cambios de auth (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        void cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setNegocio(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, cargarPerfil])

  // ── Registro ──────────────────────────────────────────────────────────────
  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    nombreNegocio: string
  ): Promise<void> => {
    setError(null)

    const { data: authData, error: errAuth } = await supabase.auth.signUp({ email, password })

    if (errAuth) { setError(errAuth.message); throw errAuth }
    if (!authData.user) throw new Error('No se pudo crear el usuario')

    // Si requiere confirmación por email, no hay sesión activa todavía
    const requiereConfirmacion = !authData.session
    if (requiereConfirmacion) {
      setPendienteConfirmacion(true)
      setEmailPendiente(email)
      return
    }

    // Hay sesión activa — crear negocio y perfil
    try {
      // FIX: .maybeSingle() en lugar de .single() para el insert del negocio
      const { data: negocioData, error: errNegocio } = await (supabase as Any)
        .from('negocios')
        .insert({ nombre: nombreNegocio, tier: 'free' })
        .select()
        .maybeSingle()

      if (errNegocio || !negocioData) {
        throw new Error(`Error al crear negocio: ${errNegocio?.message ?? 'Sin respuesta'}`)
      }

      const { error: errUsuario } = await (supabase as Any)
        .from('usuarios')
        .insert({
          id:         authData.user.id,
          negocio_id: (negocioData as Any).id,
          rol:        'owner',
          nombre:     nombreNegocio,
        })

      if (errUsuario) {
        throw new Error(`Error al crear perfil: ${errUsuario.message}`)
      }

      // Recargar perfil con los datos recién creados
      await cargarPerfil(authData.user.id)

    } catch (err: Any) {
      setError(err.message || 'Error al completar el registro')
      throw err
    }
  }, [supabase, cargarPerfil])

  // ── Login ─────────────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string): Promise<void> => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); throw err }
  }, [supabase])

  // ── Logout ────────────────────────────────────────────────────────────────
  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
    setNegocio(null)
  }, [supabase])

  // ── Reenviar confirmación ─────────────────────────────────────────────────
  const reenviarConfirmacion = useCallback(async (email: string): Promise<void> => {
    setError(null)
    const { error: err } = await supabase.auth.resend({ type: 'signup', email })
    if (err) { setError(err.message); throw err }
  }, [supabase])

  // ── Recupero de contraseña ────────────────────────────────────────────────
  const solicitarRecupero = useCallback(async (email: string): Promise<void> => {
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-password/confirmar`,
    })
    if (err) { setError(err.message); throw err }
  }, [supabase])

  // ── Actualizar contraseña ─────────────────────────────────────────────────
  const actualizarPassword = useCallback(async (nuevaPass: string): Promise<void> => {
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password: nuevaPass })
    if (err) { setError(err.message); throw err }
  }, [supabase])

  return {
    user,
    perfil,
    negocio,
    loading,
    error,
    pendienteConfirmacion,
    emailPendiente,
    signInWithEmail,
    signUpWithEmail,
    reenviarConfirmacion,
    solicitarRecupero,
    actualizarPassword,
    signOut,
  }
}