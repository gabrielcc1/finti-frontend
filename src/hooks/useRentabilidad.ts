'use client'

// src/hooks/useRentabilidad.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RentabilidadProducto, MateriaPrima } from '@/types/database'

// ── Tipos locales de Insert/Update (evitan el tipo 'never' del cliente) ──────
interface ProductoUpdateLocal {
  costo_unitario?: string | null
}
interface MateriaPrimaUpdateLocal {
  costo_por_unidad?: string
}
interface CompraMpInsertLocal {
  negocio_id: string
  materia_prima_id: string
  cantidad: string
  costo_total: string
  fecha: string
  proveedor?: string | null
}

// ── db(): cast centralizado, un solo as any en todo el archivo ───────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

const toFloat = (v: string | number | null | undefined): number =>
  parseFloat(String(v ?? 0)) || 0

// ── Helper negocio_id ──────────────────────────────────────────────────────
async function getNegocioId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay usuario autenticado')
  const { data } = await db(supabase).from('usuarios').select('negocio_id').eq('id', user.id).single()
  const row = data as { negocio_id: string | null } | null
  if (!row?.negocio_id) throw new Error('No se encontró el negocio')
  return row.negocio_id
}

interface ResumenRentabilidad {
  margenPromedio: number
  gananciaTotal: number
  productoMasRentable: string
  productoMenorMargen: string | null
  alertasMargen: RentabilidadProducto[]
}

export function useRentabilidad() {
  const [productos, setProductos] = useState<RentabilidadProducto[]>([])
  const [materias, setMaterias]   = useState<MateriaPrima[]>([])
  const [resumen, setResumen]     = useState<ResumenRentabilidad | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const supabase = createClient()

  const fetchRentabilidad = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('v_rentabilidad_productos')
      .select('*')
      .order('margen_pct', { ascending: true })

    if (err) throw new Error(`rentabilidad: ${err.message}`)
    const rows: RentabilidadProducto[] = (data as RentabilidadProducto[]) ?? []
    setProductos(rows)

    if (rows.length > 0) {
      const conCosto = rows.filter((p: RentabilidadProducto) => toFloat(p.costo) > 0)

      const margenProm = conCosto.length > 0
        ? conCosto.reduce((s: number, p: RentabilidadProducto) => s + toFloat(p.margen_pct), 0) / conCosto.length
        : 0

      const gananciaTotal = rows.reduce(
        (s: number, p: RentabilidadProducto) => s + toFloat(p.ganancia_mes), 0
      )

      const masRentable = [...rows].sort(
        (a: RentabilidadProducto, b: RentabilidadProducto) =>
          toFloat(b.margen_pct) - toFloat(a.margen_pct)
      )[0]

      const alertas = rows.filter(
        (p: RentabilidadProducto) => toFloat(p.costo) > 0 && toFloat(p.margen_pct) < 20
      )

      setResumen({
        margenPromedio:      Math.round(margenProm * 10) / 10,
        gananciaTotal,
        productoMasRentable: masRentable?.nombre ?? '—',
        productoMenorMargen: alertas[0]?.nombre ?? null,
        alertasMargen:       alertas,
      })
    }
  }, [supabase])

  const fetchMaterias = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('materias_primas')
      .select('*')
      .order('nombre')

    if (err) throw new Error(`materias: ${err.message}`)
    setMaterias((data as MateriaPrima[]) ?? [])
  }, [supabase])

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchRentabilidad(), fetchMaterias()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar rentabilidad')
      } finally {
        setLoading(false)
      }
    }
    void cargar()
  }, [fetchRentabilidad, fetchMaterias])

  const actualizarCosto = useCallback(async (
    productoId: string,
    nuevoCosto: number
  ): Promise<void> => {
    const update: ProductoUpdateLocal = {
      costo_unitario: nuevoCosto.toString(),
    }
    const { error: err } = await db(supabase)
      .from('productos')
      .update(update)
      .eq('id', productoId)

    if (err) throw new Error(`actualizarCosto: ${err.message}`)
    await fetchRentabilidad()
  }, [supabase, fetchRentabilidad])

  const registrarCompraMP = useCallback(async (data: {
    materia_prima_id: string
    cantidad: number
    costo_total: number
    proveedor?: string
  }): Promise<void> => {
    const negocioId = await getNegocioId(supabase)

    // 1. Insertar compra
    const insert: CompraMpInsertLocal = {
      negocio_id:       negocioId,
      materia_prima_id: data.materia_prima_id,
      cantidad:         data.cantidad.toString(),
      costo_total:      data.costo_total.toString(),
      proveedor:        data.proveedor ?? null,
      fecha:            new Date().toISOString().slice(0, 10),
    }
    const { error: errC } = await db(supabase)
      .from('compras_materia_prima')
      .insert(insert)
    if (errC) throw new Error(`registrarCompraMP: ${errC.message}`)

    // 2. Actualizar precio vigente de la MP
    const nuevoCostoUnitario = data.costo_total / data.cantidad
    const mpUpdate: MateriaPrimaUpdateLocal = {
      costo_por_unidad: nuevoCostoUnitario.toFixed(2),
    }
    await db(supabase)
      .from('materias_primas')
      .update(mpUpdate)
      .eq('id', data.materia_prima_id)

    // 3. Recalcular costo de productos que usan esta MP
    const { data: recetas } = await db(supabase)
      .from('recetas')
      .select('producto_id')
      .eq('materia_prima_id', data.materia_prima_id)

    for (const r of (recetas as { producto_id: string }[]) ?? []) {
      await db(supabase).rpc('recalcular_costo_producto', { p_producto_id: r.producto_id })
    }

    await fetchRentabilidad()
  }, [supabase, fetchRentabilidad])

  return {
    productos,
    materias,
    resumen,
    loading,
    error,
    actualizarCosto,
    registrarCompraMP,
  }
}