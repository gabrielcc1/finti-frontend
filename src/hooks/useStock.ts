'use client'

// src/hooks/useStock.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Producto, MateriaPrima } from '@/types/database'

// ── Tipos locales (evitan depender del tipado generado del cliente) ──────────
// El cliente de Supabase tipado con Database puede resolver ciertas tablas
// como 'never' si hay un mismatch entre el schema generado y la versión del
// cliente. Definir los tipos acá es la solución más robusta y mantenible.

export type TipoMovimiento =
  | 'entrada_compra'
  | 'entrada_produccion'
  | 'entrada_ajuste'
  | 'salida_venta'
  | 'salida_merma'
  | 'salida_ajuste'

export interface MovimientoStock {
  id: string
  producto_id: string
  tipo: TipoMovimiento
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  motivo: string | null
  created_at: string
  productos: { nombre: string } | null
}

export interface NuevoProductoData {
  nombre: string
  descripcion?: string
  codigo?: string
  precio_unitario: number
  costo_unitario?: number
  stock_actual: number
  stock_minimo: number
  unidad: string
}

export interface AjusteStockData {
  producto_id: string
  tipo: TipoMovimiento
  cantidad: number       // positivo siempre — el tipo indica si suma o resta
  motivo?: string
}

export interface NuevaMateriaPrimaData {
  nombre: string
  unidad: string
  costo_por_unidad: number
  stock_actual: number
  stock_minimo: number
}

export interface CompraMateriaPrimaData {
  materia_prima_id: string
  cantidad: number
  costo_total: number
  proveedor?: string
}

// ── Interfaces de Insert/Update definidas localmente ────────────────────────
interface ProductoInsertLocal {
  negocio_id: string
  nombre: string
  descripcion?: string | null
  codigo?: string | null
  precio_unitario: string
  costo_unitario?: string | null
  stock_actual: number
  stock_minimo: number
  unidad: string
  activo: boolean
}
interface ProductoUpdateLocal {
  nombre?: string
  descripcion?: string | null
  codigo?: string | null
  precio_unitario?: string
  costo_unitario?: string | null
  stock_actual?: number
  stock_minimo?: number
  unidad?: string
}
interface MateriaPrimaInsertLocal {
  negocio_id: string
  nombre: string
  unidad: string
  costo_por_unidad: string
  stock_actual?: string
  stock_minimo?: string
}
interface MateriaPrimaUpdateLocal {
  stock_actual?: string
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
interface MovimientoInsertLocal {
  negocio_id: string
  producto_id: string
  tipo: TipoMovimiento
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  motivo: string | null
  usuario_id: string | null
}

// ── db(): acceso sin tipado estricto, acotado a este archivo ────────────────
// Centraliza el cast en un solo lugar. Todo el resto del código usa tipos
// explícitos definidos arriba, así que no se pierde seguridad real.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

// ── Helper negocio_id ──────────────────────────────────────────────────────
async function getNegocioId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay usuario autenticado')
  const { data } = await db(supabase).from('usuarios').select('negocio_id').eq('id', user.id).single()
  const row = data as { negocio_id: string | null } | null
  if (!row?.negocio_id) throw new Error('No se encontró el negocio')
  return row.negocio_id
}

const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0

// ── Helper insertar movimiento ─────────────────────────────────────────────
async function insertarMovimiento(
  supabase: ReturnType<typeof createClient>,
  mov: MovimientoInsertLocal
): Promise<void> {
  const { error: err } = await db(supabase).from('movimientos_stock').insert(mov)
  if (err) throw new Error(`registrar movimiento: ${err.message}`)
}

// ══════════════════════════════════════════════════════════════════════════════
export function useStock() {
  const [productos,    setProductos]    = useState<Producto[]>([])
  const [materias,     setMaterias]     = useState<MateriaPrima[]>([])
  const [movimientos,  setMovimientos]  = useState<MovimientoStock[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const supabase = createClient()

  // ── Fetch productos ────────────────────────────────────────────────────────
  const fetchProductos = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('productos').select('*').eq('activo', true).order('nombre')
    if (err) throw new Error(`productos: ${err.message}`)
    setProductos((data as Producto[]) ?? [])
  }, [supabase])

  // ── Fetch materias primas ──────────────────────────────────────────────────
  const fetchMaterias = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('materias_primas').select('*').order('nombre')
    if (err) throw new Error(`materias: ${err.message}`)
    setMaterias((data as MateriaPrima[]) ?? [])
  }, [supabase])

  // ── Fetch historial de movimientos (último mes) ────────────────────────────
  const fetchMovimientos = useCallback(async (): Promise<void> => {
    const desde = new Date()
    desde.setDate(desde.getDate() - 30)
    const { data, error: err } = await db(supabase)
      .from('movimientos_stock')
      .select('*, productos(nombre)')
      .gte('created_at', desde.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)
    if (err) throw new Error(`movimientos: ${err.message}`)
    setMovimientos((data as MovimientoStock[]) ?? [])
  }, [supabase])

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchProductos(), fetchMaterias(), fetchMovimientos()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar stock')
      } finally {
        setLoading(false)
      }
    }
    void cargar()
  }, [fetchProductos, fetchMaterias, fetchMovimientos])

  // ── Ajustar stock de producto terminado ───────────────────────────────────
  const ajustarStock = useCallback(async (data: AjusteStockData): Promise<void> => {
    setSaving(true)
    try {
      const negocioId = await getNegocioId(supabase)
      const { data: { user } } = await supabase.auth.getUser()

      const prod = productos.find(p => p.id === data.producto_id)
      if (!prod) throw new Error('Producto no encontrado')

      const esEntrada = data.tipo.startsWith('entrada_')
      const stockAnterior = prod.stock_actual
      const stockNuevo = esEntrada
        ? stockAnterior + data.cantidad
        : Math.max(0, stockAnterior - data.cantidad)

      // Actualizar stock del producto
      const update: ProductoUpdateLocal = { stock_actual: stockNuevo }
      const { error: errP } = await db(supabase)
        .from('productos').update(update).eq('id', data.producto_id)
      if (errP) throw new Error(`actualizar stock: ${errP.message}`)

      // Registrar movimiento
      await insertarMovimiento(supabase, {
        negocio_id:     negocioId,
        producto_id:    data.producto_id,
        tipo:           data.tipo,
        cantidad:       data.cantidad,
        stock_anterior: stockAnterior,
        stock_nuevo:    stockNuevo,
        motivo:         data.motivo ?? null,
        usuario_id:     user?.id ?? null,
      })

      // Actualizar estado local inmediatamente
      setProductos(prev => prev.map(p =>
        p.id === data.producto_id ? { ...p, stock_actual: stockNuevo } : p
      ))
      await fetchMovimientos()
    } finally {
      setSaving(false)
    }
  }, [supabase, productos, fetchMovimientos])

  // ── Crear producto nuevo ───────────────────────────────────────────────────
  const crearProducto = useCallback(async (data: NuevoProductoData): Promise<Producto> => {
    setSaving(true)
    try {
      const negocioId = await getNegocioId(supabase)

      const insert: ProductoInsertLocal = {
        negocio_id:      negocioId,
        nombre:          data.nombre,
        descripcion:     data.descripcion ?? null,
        codigo:          data.codigo ?? null,
        precio_unitario: data.precio_unitario.toString(),
        costo_unitario:  data.costo_unitario ? data.costo_unitario.toString() : null,
        stock_actual:    data.stock_actual,
        stock_minimo:    data.stock_minimo,
        unidad:          data.unidad,
        activo:          true,
      }
      const { data: raw, error: err } = await db(supabase)
        .from('productos').insert(insert).select().single()
      if (err || !raw) throw new Error(`crear producto: ${err?.message}`)

      const nuevo = raw as Producto

      // Si tiene stock inicial, registrar el movimiento
      if (data.stock_actual > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        await insertarMovimiento(supabase, {
          negocio_id:     negocioId,
          producto_id:    nuevo.id,
          tipo:           'entrada_ajuste',
          cantidad:       data.stock_actual,
          stock_anterior: 0,
          stock_nuevo:    data.stock_actual,
          motivo:         'Stock inicial al crear producto',
          usuario_id:     user?.id ?? null,
        })
      }

      setProductos(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      return nuevo
    } finally {
      setSaving(false)
    }
  }, [supabase])

  // ── Editar producto ────────────────────────────────────────────────────────
  const editarProducto = useCallback(async (
    id: string,
    data: Partial<NuevoProductoData>
  ): Promise<void> => {
    setSaving(true)
    try {
      const update: ProductoUpdateLocal = {}
      if (data.nombre          !== undefined) update.nombre          = data.nombre
      if (data.descripcion     !== undefined) update.descripcion     = data.descripcion ?? null
      if (data.codigo          !== undefined) update.codigo          = data.codigo ?? null
      if (data.precio_unitario !== undefined) update.precio_unitario = data.precio_unitario.toString()
      if (data.costo_unitario  !== undefined) update.costo_unitario  = data.costo_unitario ? data.costo_unitario.toString() : null
      if (data.stock_minimo    !== undefined) update.stock_minimo    = data.stock_minimo
      if (data.unidad          !== undefined) update.unidad          = data.unidad

      const { error: err } = await db(supabase)
        .from('productos').update(update).eq('id', id)
      if (err) throw new Error(`editar producto: ${err.message}`)

      setProductos(prev => prev.map(p =>
        p.id === id ? {
          ...p,
          ...update,
          precio_unitario: update.precio_unitario ?? p.precio_unitario,
          costo_unitario:  update.costo_unitario  ?? p.costo_unitario,
        } : p
      ))
    } finally {
      setSaving(false)
    }
  }, [supabase])

  // ── Crear materia prima ────────────────────────────────────────────────────
  const crearMateriaPrima = useCallback(async (data: NuevaMateriaPrimaData): Promise<MateriaPrima> => {
    setSaving(true)
    try {
      const negocioId = await getNegocioId(supabase)
      const insert: MateriaPrimaInsertLocal = {
        negocio_id:       negocioId,
        nombre:           data.nombre,
        unidad:           data.unidad,
        costo_por_unidad: data.costo_por_unidad.toString(),
        stock_actual:     data.stock_actual.toString(),
        stock_minimo:     data.stock_minimo.toString(),
      }
      const { data: raw, error: err } = await db(supabase)
        .from('materias_primas').insert(insert).select().single()
      if (err || !raw) throw new Error(`crear MP: ${err?.message}`)
      const nueva = raw as MateriaPrima
      setMaterias(prev => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      return nueva
    } finally {
      setSaving(false)
    }
  }, [supabase])

  // ── Registrar compra de materia prima ──────────────────────────────────────
  const registrarCompraMP = useCallback(async (data: CompraMateriaPrimaData): Promise<void> => {
    setSaving(true)
    try {
      const negocioId = await getNegocioId(supabase)
      const mp = materias.find(m => m.id === data.materia_prima_id)
      if (!mp) throw new Error('Materia prima no encontrada')

      const nuevoCostoUnitario = data.costo_total / data.cantidad
      const stockNuevo = toFloat(mp.stock_actual) + data.cantidad

      // 1. Insertar compra
      const compraInsert: CompraMpInsertLocal = {
        negocio_id:       negocioId,
        materia_prima_id: data.materia_prima_id,
        cantidad:         data.cantidad.toString(),
        costo_total:      data.costo_total.toString(),
        proveedor:        data.proveedor ?? null,
        fecha:            new Date().toISOString().slice(0, 10),
      }
      const { error: errC } = await db(supabase)
        .from('compras_materia_prima').insert(compraInsert)
      if (errC) throw new Error(`compra MP: ${errC.message}`)

      // 2. Actualizar stock y costo de la MP
      const mpUpdate: MateriaPrimaUpdateLocal = {
        stock_actual:     stockNuevo.toString(),
        costo_por_unidad: nuevoCostoUnitario.toFixed(2),
      }
      const { error: errMP } = await db(supabase)
        .from('materias_primas').update(mpUpdate).eq('id', data.materia_prima_id)
      if (errMP) throw new Error(`actualizar MP: ${errMP.message}`)

      // 3. Recalcular costo de productos que usan esta MP
      const { data: recetas } = await db(supabase)
        .from('recetas').select('producto_id').eq('materia_prima_id', data.materia_prima_id)
      for (const r of (recetas as { producto_id: string }[]) ?? []) {
        await db(supabase).rpc('recalcular_costo_producto', { p_producto_id: r.producto_id })
      }

      // Actualizar estado local
      setMaterias(prev => prev.map(m =>
        m.id === data.materia_prima_id
          ? { ...m, stock_actual: stockNuevo.toString(), costo_por_unidad: nuevoCostoUnitario.toFixed(2) }
          : m
      ))
      // Refrescar productos por si cambiaron costos
      await fetchProductos()
    } finally {
      setSaving(false)
    }
  }, [supabase, materias, fetchProductos])

  // ── KPIs calculados ────────────────────────────────────────────────────────
  const resumen = {
    totalProductos:     productos.length,
    productosCriticos:  productos.filter(p => p.stock_actual <= p.stock_minimo).length,
    productosAgotados:  productos.filter(p => p.stock_actual === 0).length,
    valorInventario:    productos.reduce((s, p) => s + toFloat(p.precio_unitario) * p.stock_actual, 0),
    costoInventario:    productos.reduce((s, p) => s + toFloat(p.costo_unitario) * p.stock_actual, 0),
    totalInsumos:       materias.length,
    insumosCriticos:    materias.filter(m => toFloat(m.stock_actual) <= toFloat(m.stock_minimo)).length,
    insumosAgotados:    materias.filter(m => toFloat(m.stock_actual) === 0).length,
  }

  return {
    productos,
    materias,
    movimientos,
    resumen,
    loading,
    saving,
    error,
    ajustarStock,
    crearProducto,
    editarProducto,
    crearMateriaPrima,
    registrarCompraMP,
    refetch: () => Promise.all([fetchProductos(), fetchMaterias(), fetchMovimientos()]),
  }
}