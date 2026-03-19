'use client'

// src/hooks/usePerfil.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

interface PerfilData {
  nombre:     string | null
  avatar_url: string | null
  rol:        string | null
}

interface NegocioData {
  nombre:        string
  cuit:          string | null
  condicion_iva: string | null
  telefono:      string | null
  email:         string | null
  direccion:     string | null
  tier:          'free' | 'pro' | 'business'
}

interface PerfilUpdateLocal {
  nombre?:     string | null
  avatar_url?: string | null
}

interface NegocioUpdateLocal {
  nombre?:        string
  cuit?:          string | null
  condicion_iva?: string | null
  telefono?:      string | null
  email?:         string | null
  direccion?:     string | null
}

export function usePerfil() {
  const [perfil,   setPerfil]   = useState<PerfilData | null>(null)
  const [negocio,  setNegocio]  = useState<NegocioData | null>(null)
  const [email,    setEmail]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  const supabase = createClient()

  // ── Cargar datos ──────────────────────────────────────────────────────────
  const fetchPerfil = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setEmail(user.email ?? null)

    const { data: perfilData } = await db(supabase)
      .from('usuarios')
      .select('nombre, avatar_url, rol, negocio_id')
      .eq('id', user.id)
      .single()

    if (!perfilData) return
    const row = perfilData as PerfilData & { negocio_id: string | null }
    setPerfil({ nombre: row.nombre, avatar_url: row.avatar_url, rol: row.rol })

    if (row.negocio_id) {
      const { data: negocioData } = await db(supabase)
        .from('negocios')
        .select('nombre, cuit, condicion_iva, telefono, email, direccion, tier')
        .eq('id', row.negocio_id)
        .single()
      if (negocioData) setNegocio(negocioData as NegocioData)
    }
  }, [supabase])

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        await fetchPerfil()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar perfil')
      } finally {
        setLoading(false)
      }
    }
    void cargar()
  }, [fetchPerfil])

  // ── Guardar perfil (nombre del usuario) ───────────────────────────────────
  const guardarPerfil = useCallback(async (data: PerfilUpdateLocal) => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario')

      const { error: err } = await db(supabase)
        .from('usuarios')
        .update(data)
        .eq('id', user.id)
      if (err) throw new Error(err.message)

      setPerfil(prev => prev ? { ...prev, ...data } : prev)
      setSuccess('Perfil actualizado')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [supabase])

  // ── Guardar datos del negocio ─────────────────────────────────────────────
  const guardarNegocio = useCallback(async (data: NegocioUpdateLocal) => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario')

      const { data: usuarioData } = await db(supabase)
        .from('usuarios').select('negocio_id').eq('id', user.id).single()
      const negocioId = (usuarioData as { negocio_id: string | null } | null)?.negocio_id
      if (!negocioId) throw new Error('No se encontró el negocio')

      const { error: err } = await db(supabase)
        .from('negocios')
        .update(data)
        .eq('id', negocioId)
      if (err) throw new Error(err.message)

      setNegocio(prev => prev ? { ...prev, ...data } : prev)
      setSuccess('Negocio actualizado')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [supabase])

  // ── Cambiar contraseña ────────────────────────────────────────────────────
  const cambiarPassword = useCallback(async (nueva: string) => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: nueva })
      if (err) throw new Error(err.message)
      setSuccess('Contraseña actualizada')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar contraseña')
    } finally {
      setSaving(false)
    }
  }, [supabase])

  // ── Cerrar sesión ─────────────────────────────────────────────────────────
  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [supabase])

  return {
    perfil, negocio, email,
    loading, saving, error, success,
    guardarPerfil, guardarNegocio,
    cambiarPassword, cerrarSesion,
  }
}