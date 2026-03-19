'use client'

// src/hooks/useCostos.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Producto, MateriaPrima } from '@/types/database'

// ── db(): cast centralizado ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

// ── Tipos para categoría de gasto (union literal de database.ts) ──────────────
type CategoriaGasto = 'compras' | 'servicios' | 'sueldos' | 'impuestos' | 'materia_prima' | 'insumos' | 'alquiler' | 'otros'

function toCategGasto(s: string): CategoriaGasto {
  const valid: CategoriaGasto[] = ['compras', 'servicios', 'sueldos', 'impuestos', 'materia_prima', 'insumos', 'alquiler', 'otros']
  return valid.includes(s as CategoriaGasto) ? (s as CategoriaGasto) : 'otros'
}

// ── Interfaces locales de Insert/Update ───────────────────────────────────────
interface ProductoUpdateLocal {
  costo_unitario?: string | null
  costo_envio?:    string
  costo_embalaje?: string
  precio_unitario?: string
}
interface GastoInsertLocal {
  negocio_id:  string
  descripcion: string
  monto:       string
  categoria:   CategoriaGasto | null
  fecha:       string
}
interface GastoUpdateLocal {
  descripcion?: string
  monto?:       string
  categoria?:   CategoriaGasto | null
  fecha?:       string
}
interface ProductoComboInsert {
  negocio_id:      string
  nombre:          string
  precio_unitario: string
  costo_unitario:  string
  stock_actual:    number
  stock_minimo:    number
  unidad:          string
  activo:          boolean
  tipo_producto:   string
}
interface ComboItemInsert {
  producto_id:   string
  componente_id: string
  cantidad:      number
}
interface RecetaInsert {
  producto_id:      string
  materia_prima_id: string
  cantidad:         string
}

export interface RentabilidadExtendida {
  id: string; negocio_id: string; nombre: string; tipo_producto: string | null
  precio: string; costo: string | null; costo_envio: string; costo_embalaje: string
  costo_total: string; ganancia_unitaria: string; margen_pct: number | null
  unidades_mes: number; ganancia_mes: string
}
export interface ComboItem {
  id: string; producto_id: string; componente_id: string; cantidad: number
  componente?: Pick<Producto, 'nombre' | 'precio_unitario' | 'costo_unitario' | 'unidad'>
}
export interface ComboConItems {
  producto: Producto; items: ComboItem[]
  costo_calculado: number; margen_calculado: number
}
export interface RecetaItem {
  materia_prima_id: string; producto_id: string; cantidad: number; mp?: MateriaPrima
}
export interface GastosMes {
  total_mes: number; alquiler: number; sueldos: number; servicios: number
  materia_prima: number; insumos: number; impuestos: number; otros: number
}
export interface GastoItem {
  id: string; descripcion: string; monto: string
  categoria: string | null; fecha: string; created_at: string
}
export interface NuevoGastoData {
  descripcion: string; monto: number; categoria: string; fecha?: string
}
export interface ActualizarCostosProductoData {
  costo_unitario?: number; costo_envio?: number; costo_embalaje?: number
}

async function getNegocioId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay usuario autenticado')
  const { data } = await db(supabase).from('usuarios').select('negocio_id').eq('id', user.id).single()
  const row = data as { negocio_id: string | null } | null
  if (!row?.negocio_id) throw new Error('No se encontró el negocio')
  return row.negocio_id
}

const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0

export function useCostos() {
  const [productos,      setProductos]      = useState<RentabilidadExtendida[]>([])
  const [todosProductos, setTodosProductos] = useState<Producto[]>([])
  const [materias,       setMaterias]       = useState<MateriaPrima[]>([])
  const [combos,         setCombos]         = useState<ComboConItems[]>([])
  const [recetas,        setRecetas]        = useState<RecetaItem[]>([])
  const [gastosMes,      setGastosMes]      = useState<GastosMes | null>(null)
  const [gastosLista,    setGastosLista]    = useState<GastoItem[]>([])
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const supabase = createClient()

  const fetchProductos = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('v_rentabilidad_productos').select('*').order('margen_pct', { ascending: true })
    if (err) throw new Error(`rentabilidad: ${err.message}`)
    setProductos((data as RentabilidadExtendida[]) ?? [])
  }, [supabase])

  const fetchTodosProductos = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('productos').select('*').eq('activo', true).order('nombre')
    if (err) throw new Error(`productos: ${err.message}`)
    setTodosProductos((data as Producto[]) ?? [])
  }, [supabase])

  const fetchMaterias = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('materias_primas').select('*').order('nombre')
    if (err) throw new Error(`materias: ${err.message}`)
    setMaterias((data as MateriaPrima[]) ?? [])
  }, [supabase])

  const fetchCombos = useCallback(async (): Promise<void> => {
    const { data: combosRaw, error: errC } = await db(supabase)
      .from('productos').select('*').eq('activo', true).eq('tipo_producto', 'combo').order('nombre')
    if (errC) throw new Error(`combos: ${errC.message}`)
    const combosProductos = (combosRaw as Producto[]) ?? []
    if (combosProductos.length === 0) { setCombos([]); return }

    const { data: itemsRaw, error: errI } = await db(supabase)
      .from('combo_items')
      .select('*, componente:componente_id(nombre, precio_unitario, costo_unitario, unidad)')
      .in('producto_id', combosProductos.map(c => c.id))
    if (errI) throw new Error(`combo_items: ${errI.message}`)

    const items = (itemsRaw as ComboItem[]) ?? []
    setCombos(combosProductos.map(prod => {
      const misItems = items.filter(i => i.producto_id === prod.id)
      const costoCalculado = misItems.reduce((s, i) => s + toFloat(i.componente?.costo_unitario) * i.cantidad, 0)
      const precio = toFloat(prod.precio_unitario)
      return { producto: prod, items: misItems, costo_calculado: costoCalculado, margen_calculado: precio > 0 ? ((precio - costoCalculado) / precio) * 100 : 0 }
    }))
  }, [supabase])

  const fetchRecetas = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase).from('recetas').select('*, mp:materia_prima_id(*)')
    if (err) throw new Error(`recetas: ${err.message}`)
    setRecetas((data as RecetaItem[]) ?? [])
  }, [supabase])

  const fetchGastosMes = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase).from('v_gastos_mes').select('*').single()
    if (err && err.code !== 'PGRST116') throw new Error(`gastos resumen: ${err.message}`)
    if (data) {
      const r = data as Record<string, string | null>
      setGastosMes({
        total_mes:     toFloat(r.total_mes),
        alquiler:      toFloat(r.alquiler),
        sueldos:       toFloat(r.sueldos),
        servicios:     toFloat(r.servicios),
        materia_prima: toFloat(r.materia_prima),
        insumos:       toFloat(r.insumos),
        impuestos:     toFloat(r.impuestos),
        otros:         toFloat(r.otros),
      })
    } else {
      setGastosMes(null)
    }
  }, [supabase])

  const fetchGastosLista = useCallback(async (): Promise<void> => {
    const desde = new Date(); desde.setDate(1)
    const { data, error: err } = await db(supabase)
      .from('gastos')
      .select('id, descripcion, monto, categoria, fecha, created_at')
      .gte('fecha', desde.toISOString().slice(0, 10))
      .order('fecha', { ascending: false })
    if (err) throw new Error(`gastos lista: ${err.message}`)
    setGastosLista((data as GastoItem[]) ?? [])
  }, [supabase])

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchProductos(), fetchTodosProductos(), fetchMaterias(), fetchCombos(), fetchRecetas(), fetchGastosMes(), fetchGastosLista()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar costos')
      } finally { setLoading(false) }
    }
    void cargar()
  }, [fetchProductos, fetchTodosProductos, fetchMaterias, fetchCombos, fetchRecetas, fetchGastosMes, fetchGastosLista])

  const actualizarCostos = useCallback(async (productoId: string, data: ActualizarCostosProductoData): Promise<void> => {
    setSaving(true)
    try {
      const update: ProductoUpdateLocal = {}
      if (data.costo_unitario !== undefined) update.costo_unitario = data.costo_unitario.toString()
      if (data.costo_envio    !== undefined) update.costo_envio    = data.costo_envio.toString()
      if (data.costo_embalaje !== undefined) update.costo_embalaje = data.costo_embalaje.toString()
      const { error: err } = await db(supabase).from('productos').update(update).eq('id', productoId)
      if (err) throw new Error(`actualizar costos: ${err.message}`)
      await fetchProductos()
    } finally { setSaving(false) }
  }, [supabase, fetchProductos])

  const actualizarPrecio = useCallback(async (productoId: string, nuevoPrecio: number): Promise<void> => {
    setSaving(true)
    try {
      const update: ProductoUpdateLocal = { precio_unitario: nuevoPrecio.toString() }
      const { error: err } = await db(supabase).from('productos').update(update).eq('id', productoId)
      if (err) throw new Error(`actualizar precio: ${err.message}`)
      await fetchProductos()
    } finally { setSaving(false) }
  }, [supabase, fetchProductos])

  const crearCombo = useCallback(async (data: { nombre: string; precio: number; items: { componente_id: string; cantidad: number }[] }): Promise<void> => {
    setSaving(true)
    try {
      const negocioId = await getNegocioId(supabase)
      const costoCalculado = data.items.reduce((s, item) => {
        const prod = todosProductos.find(p => p.id === item.componente_id)
        return s + toFloat(prod?.costo_unitario) * item.cantidad
      }, 0)
      const prodInsert: ProductoComboInsert = {
        negocio_id:      negocioId,
        nombre:          data.nombre,
        precio_unitario: data.precio.toString(),
        costo_unitario:  costoCalculado.toFixed(2),
        stock_actual:    0,
        stock_minimo:    0,
        unidad:          'unidad',
        activo:          true,
        tipo_producto:   'combo',
      }
      const { data: prodRaw, error: errP } = await db(supabase)
        .from('productos').insert(prodInsert).select().single()
      if (errP || !prodRaw) throw new Error(`crear combo: ${errP?.message}`)
      const comboId = (prodRaw as Producto).id

      if (data.items.length > 0) {
        const items: ComboItemInsert[] = data.items.map(i => ({
          producto_id:   comboId,
          componente_id: i.componente_id,
          cantidad:      i.cantidad,
        }))
        const { error: errI } = await db(supabase).from('combo_items').insert(items)
        if (errI) throw new Error(`combo_items: ${errI.message}`)
      }
      await Promise.all([fetchCombos(), fetchTodosProductos(), fetchProductos()])
    } finally { setSaving(false) }
  }, [supabase, todosProductos, fetchCombos, fetchTodosProductos, fetchProductos])

  const agregarGasto = useCallback(async (data: NuevoGastoData): Promise<void> => {
    setSaving(true)
    try {
      const negocioId = await getNegocioId(supabase)
      const insert: GastoInsertLocal = {
        negocio_id:  negocioId,
        descripcion: data.descripcion,
        monto:       data.monto.toString(),
        categoria:   toCategGasto(data.categoria),
        fecha:       data.fecha ?? new Date().toISOString().slice(0, 10),
      }
      const { error: err } = await db(supabase).from('gastos').insert(insert)
      if (err) throw new Error(`gasto: ${err.message}`)
      await Promise.all([fetchGastosMes(), fetchGastosLista()])
    } finally { setSaving(false) }
  }, [supabase, fetchGastosMes, fetchGastosLista])

  const editarGasto = useCallback(async (id: string, data: NuevoGastoData): Promise<void> => {
    setSaving(true)
    try {
      const update: GastoUpdateLocal = {
        descripcion: data.descripcion,
        monto:       data.monto.toString(),
        categoria:   toCategGasto(data.categoria),
        fecha:       data.fecha ?? new Date().toISOString().slice(0, 10),
      }
      const { error: err } = await db(supabase).from('gastos').update(update).eq('id', id)
      if (err) throw new Error(`editar gasto: ${err.message}`)
      await Promise.all([fetchGastosMes(), fetchGastosLista()])
    } finally { setSaving(false) }
  }, [supabase, fetchGastosMes, fetchGastosLista])

  const eliminarGasto = useCallback(async (id: string): Promise<void> => {
    setSaving(true)
    try {
      const { error: err } = await db(supabase).from('gastos').delete().eq('id', id)
      if (err) throw new Error(`eliminar gasto: ${err.message}`)
      setGastosLista(prev => prev.filter(g => g.id !== id))
      await fetchGastosMes()
    } finally { setSaving(false) }
  }, [supabase, fetchGastosMes])

  const agregarReceta = useCallback(async (data: { producto_id: string; materia_prima_id: string; cantidad: number }): Promise<void> => {
    setSaving(true)
    try {
      const insert: RecetaInsert = {
        producto_id:      data.producto_id,
        materia_prima_id: data.materia_prima_id,
        cantidad:         data.cantidad.toString(),
      }
      const { error: err } = await db(supabase).from('recetas').insert(insert)
      if (err) throw new Error(`receta: ${err.message}`)
      await db(supabase).rpc('recalcular_costo_producto', { p_producto_id: data.producto_id })
      await Promise.all([fetchRecetas(), fetchProductos()])
    } finally { setSaving(false) }
  }, [supabase, fetchRecetas, fetchProductos])

  const resumen = {
    margenPromedio: productos.length > 0
      ? Math.round(
          productos.filter(p => toFloat(p.costo_total) > 0)
            .reduce((s, p) => s + toFloat(p.margen_pct), 0) /
          Math.max(productos.filter(p => toFloat(p.costo_total) > 0).length, 1) * 10
        ) / 10
      : 0,
    gananciaEstimadaMes: productos.reduce((s, p) => s + toFloat(p.ganancia_mes), 0),
    alertasMargen:       productos.filter(p => toFloat(p.costo_total) > 0 && toFloat(p.margen_pct) < 20),
    sinCosto:            productos.filter(p => toFloat(p.costo_total) === 0),
    totalGastosFijos:    gastosMes?.total_mes ?? 0,
    puntoEquilibrio: gastosMes && productos.length > 0
      ? Math.ceil(
          gastosMes.total_mes /
          Math.max(productos.reduce((s, p) => s + toFloat(p.ganancia_unitaria), 0) / Math.max(productos.length, 1), 1)
        )
      : 0,
  }

  return {
    productos, todosProductos, materias, combos, recetas,
    gastosMes, gastosLista,
    resumen, loading, saving, error,
    actualizarCostos, actualizarPrecio, crearCombo,
    agregarGasto, editarGasto, eliminarGasto, agregarReceta,
    refetch: () => Promise.all([fetchProductos(), fetchTodosProductos(), fetchMaterias(), fetchCombos(), fetchRecetas(), fetchGastosMes(), fetchGastosLista()]),
  }
}