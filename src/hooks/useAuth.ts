'use client'

// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

type Negocio = Database['public']['Tables']['negocios']['Row']
type Perfil  = Database['public']['Tables']['usuarios']['Row']

interface NegocioInsertLocal { nombre: string; tier: 'free' | 'pro' | 'business' }
interface UsuarioInsertLocal { id: string; negocio_id: string; rol: 'owner' | 'empleado' | 'contador' }

interface UsuarioConNegocio {
  user:    User | null
  perfil:  Perfil | null
  negocio: Negocio | null
  loading: boolean
  error:   string | null
  pendienteConfirmacion: boolean
  emailPendiente: string | null
}

export function useAuth(): UsuarioConNegocio & {
  signInWithEmail:      (email: string, password: string) => Promise<void>
  signUpWithEmail:      (email: string, password: string, nombreNegocio: string) => Promise<void>
  reenviarConfirmacion: (email: string) => Promise<void>
  solicitarRecupero:    (email: string) => Promise<void>
  actualizarPassword:   (nuevaPass: string) => Promise<void>
  signOut:              () => Promise<void>
} {
  const [user,    setUser]    = useState<User | null>(null)
  const [perfil,  setPerfil]  = useState<Perfil | null>(null)
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [pendienteConfirmacion, setPendienteConfirmacion] = useState(false)
  const [emailPendiente,        setEmailPendiente]        = useState<string | null>(null)

  const supabase = createClient()

  const cargarPerfil = useCallback(async (userId: string): Promise<void> => {
    const { data: perfilData } = await db(supabase)
      .from('usuarios').select('*').eq('id', userId).single()
    if (!perfilData) return
    setPerfil(perfilData as Perfil)
    const row = perfilData as { negocio_id: string | null }
    if (row.negocio_id) {
      const { data: negocioData } = await db(supabase)
        .from('negocios').select('*').eq('id', row.negocio_id).single()
      if (negocioData) setNegocio(negocioData as Negocio)
    }
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        cargarPerfil(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        void cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setNegocio(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, cargarPerfil])

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<void> => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); throw err }
    await supabase.auth.getSession()
  }, [supabase])

  const signUpWithEmail = useCallback(async (
    email: string, password: string, nombreNegocio: string
  ): Promise<void> => {
    setError(null)
    const { data: authData, error: errAuth } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre_negocio: nombreNegocio } },
    })
    if (errAuth) { setError(errAuth.message); throw errAuth }
    if (!authData.user) {
      const err = new Error('No se pudo crear el usuario')
      setError(err.message); throw err
    }
    const requiereConfirmacion = !authData.session
    if (requiereConfirmacion) {
      setPendienteConfirmacion(true)
      setEmailPendiente(email)
      return
    }
    // Sin confirmación: crear negocio y perfil de inmediato
    const userId = authData.user.id
    const negocioInsert: NegocioInsertLocal = { nombre: nombreNegocio, tier: 'free' }
    const { data: negocioData, error: errNegocio } = await db(supabase)
      .from('negocios').insert(negocioInsert).select().single()
    if (errNegocio || !negocioData) {
      setError(errNegocio?.message ?? 'Error al crear negocio'); throw errNegocio
    }
    const usuarioInsert: UsuarioInsertLocal = {
      id: userId, negocio_id: (negocioData as Negocio).id, rol: 'owner',
    }
    await db(supabase).from('usuarios').insert(usuarioInsert)
  }, [supabase])

  const reenviarConfirmacion = useCallback(async (email: string): Promise<void> => {
    setError(null)
    const { error: err } = await supabase.auth.resend({ type: 'signup', email })
    if (err) { setError(err.message); throw err }
  }, [supabase])

  // ── Solicitar recupero de contraseña ─────────────────────────────────────
  // Supabase envía un email con link → redirige a /recuperar-password/confirmar
  const solicitarRecupero = useCallback(async (email: string): Promise<void> => {
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-password/confirmar`,
    })
    if (err) { setError(err.message); throw err }
  }, [supabase])

  // ── Actualizar contraseña (llamar desde la página de confirmar) ───────────
  // Solo funciona cuando el usuario tiene una sesión de recupero activa
  // (es decir, llegó desde el link del email)
  const actualizarPassword = useCallback(async (nuevaPass: string): Promise<void> => {
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password: nuevaPass })
    if (err) { setError(err.message); throw err }
  }, [supabase])

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null); setPerfil(null); setNegocio(null)
  }, [supabase])

  return {
    user, perfil, negocio, loading, error,
    pendienteConfirmacion, emailPendiente,
    signInWithEmail, signUpWithEmail, reenviarConfirmacion,
    solicitarRecupero, actualizarPassword, signOut,
  }
}