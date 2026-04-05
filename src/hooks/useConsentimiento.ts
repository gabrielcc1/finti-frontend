'use client'

// src/hooks/useConsentimiento.ts
// Maneja si el usuario ya aceptó los términos de uso de Finti.
// Se guarda en la tabla `usuarios` con un campo `acepto_tyc` (boolean) y `fecha_tyc` (timestamptz).
// Si la tabla no tiene esos campos todavía, ver el SQL al final de este archivo.

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: ReturnType<typeof createClient>) => s as any

export interface EstadoConsentimiento {
  cargando:  boolean
  acepto:    boolean | null   // null = todavía no se sabe (cargando)
  guardando: boolean
  error:     string | null
}

export function useConsentimiento() {
  const [cargando,  setCargando]  = useState(true)
  const [acepto,    setAcepto]    = useState<boolean | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const supabase = createClient()

  // ── Verificar si ya aceptó ──────────────────────────────────────────────────
  const verificar = useCallback(async () => {
    try {
      setCargando(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAcepto(false); return }

      const { data } = await db(supabase)
        .from('usuarios')
        .select('acepto_tyc')
        .eq('id', user.id)
        .single()

      const row = data as { acepto_tyc: boolean | null } | null
      setAcepto(row?.acepto_tyc === true)
    } catch {
      setAcepto(false)
    } finally {
      setCargando(false)
    }
  }, [supabase])

  useEffect(() => { void verificar() }, [verificar])

  // ── Registrar aceptación ────────────────────────────────────────────────────
  const aceptarTerminos = useCallback(async (): Promise<boolean> => {
    setGuardando(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa')

      const { error: err } = await db(supabase)
        .from('usuarios')
        .update({
          acepto_tyc:  true,
          fecha_tyc:   new Date().toISOString(),
        })
        .eq('id', user.id)

      if (err) throw new Error(err.message)

      setAcepto(true)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setError(msg)
      return false
    } finally {
      setGuardando(false)
    }
  }, [supabase])

  return { cargando, acepto, guardando, error, aceptarTerminos, verificar }
}

/*
── SQL para agregar los campos necesarios en Supabase ──────────────────────────
Ejecutar en Supabase → SQL Editor:

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS acepto_tyc  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_tyc   timestamptz;

-- Índice para consultas rápidas (opcional)
CREATE INDEX IF NOT EXISTS idx_usuarios_acepto_tyc ON usuarios(acepto_tyc);
──────────────────────────────────────────────────────────────────────────────*/