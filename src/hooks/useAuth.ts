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

  // Carga perfil y negocio del usuario autenticado
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
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        cargarPerfil(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listener de cambios de auth
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

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: errAuth } = await supabase.auth.signUp({ email, password })
    if (errAuth || !authData.user) {
      setError(errAuth?.message ?? 'Error al registrar')
      throw errAuth
    }

    const userId = authData.user.id

    // 2. Crear negocio
    const negocioInsert: NegocioInsertLocal = { nombre: nombreNegocio, tier: 'free' }
    const { data: negocioData, error: errNegocio } = await db(supabase)
      .from('negocios')
      .insert(negocioInsert)
      .select()
      .single()

    if (errNegocio || !negocioData) {
      setError(errNegocio?.message ?? 'Error al crear negocio')
      throw errNegocio
    }

    // 3. Crear perfil de usuario
    const usuarioInsert: UsuarioInsertLocal = {
      id:         userId,
      negocio_id: (negocioData as Negocio).id,
      rol:        'owner',
    }
    await db(supabase).from('usuarios').insert(usuarioInsert)

  }, [supabase])

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
    setNegocio(null)
  }, [supabase])

  return { user, perfil, negocio, loading, error, signInWithEmail, signUpWithEmail, signOut }
}