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

interface UsuarioConNegocio {
  user:    User | null
  perfil:  Perfil | null
  negocio: Negocio | null
  loading: boolean
  error:   string | null
}

export function useAuth(): UsuarioConNegocio & {
  signInWithEmail:  (email: string, password: string) => Promise<void>
  signUpWithEmail:  (email: string, password: string, nombreNegocio: string) => Promise<void>
  signOut:          () => Promise<void>
} {
  const [user,    setUser]    = useState<User | null>(null)
  const [perfil,  setPerfil]  = useState<Perfil | null>(null)
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const supabase = createClient()

  const cargarPerfil = useCallback(async (userId: string): Promise<void> => {
    const { data: perfilData } = await db(supabase)
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()

    if (!perfilData) return
    setPerfil(perfilData as Perfil)

    const row = perfilData as { negocio_id: string | null }
    if (row.negocio_id) {
      const { data: negocioData } = await db(supabase)
        .from('negocios')
        .select('*')
        .eq('id', row.negocio_id)
        .single()

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

  const signInWithEmail = useCallback(async (
    email: string,
    password: string
  ): Promise<void> => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      throw err
    }
    await supabase.auth.getSession()
  }, [supabase])

  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    nombreNegocio: string
  ): Promise<void> => {
    setError(null)

    // ── PASO 1: Crear usuario en Supabase Auth ──────────────────────────────
    const { data: authData, error: errAuth } = await supabase.auth.signUp({
      email,
      password,
    })

    if (errAuth || !authData.user) {
      const msg = errAuth?.message ?? 'Error al registrar el usuario'
      setError(msg)
      throw new Error(msg)
    }

    const userId = authData.user.id

    // ── PASO 2: Crear negocio + usuario via función RPC ─────────────────────
    //
    // No hacemos INSERT directo porque en el momento del signUp la sesión
    // autenticada puede no estar disponible → RLS bloquea con error 42501.
    //
    // La función `crear_negocio_y_usuario` (definida en fix_rls_definitivo.sql)
    // usa SECURITY DEFINER para ejecutarse con permisos elevados.

    const { data: rpcData, error: errRpc } = await db(supabase)
      .rpc('crear_negocio_y_usuario', {
        p_nombre_negocio: nombreNegocio.trim(),
        p_user_id:        userId,
      })

    if (errRpc) {
      console.error('Error RPC:', JSON.stringify(errRpc))
      const msg = errRpc?.message ?? `Error al configurar el negocio (${errRpc?.code ?? 'desconocido'})`
      setError(msg)
      throw new Error(msg)
    }

    const resultado = rpcData as { ok: boolean; error?: string; negocio_id?: string }

    if (!resultado?.ok) {
      const msg = resultado?.error ?? 'Error al crear el negocio'
      console.error('Error en función RPC:', msg)
      setError(msg)
      throw new Error(msg)
    }

    // El onAuthStateChange se encarga de cargar el perfil automáticamente
  }, [supabase])

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
    setNegocio(null)
  }, [supabase])

  return { user, perfil, negocio, loading, error, signInWithEmail, signUpWithEmail, signOut }
}