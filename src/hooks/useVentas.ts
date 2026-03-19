'use client'

// src/hooks/useVentas.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Venta, VentaItem, Cliente, Producto } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any


export interface ItemVenta {
  producto_id: string | null
  nombre: string
  precio: number
  cantidad: number
  subtotal: number
}

export interface NuevaVentaData {
  cliente_id: string | null
  items: ItemVenta[]
  descuento: number
  tipo_pago: 'efectivo' | 'transferencia' | 'tarjeta' | 'cuotas'
  cant_cuotas?: number
  notas?: string
  fecha_primer_cobro?: string
}

// Datos mínimos para crear un cliente desde el flujo de venta
export interface NuevoClienteData {
  nombre: string        // requerido
  telefono: string      // requerido
  zona_comercial: string // requerido
  direccion?: string
  dni?: string
  email?: string
}

export interface VentaConItems extends Venta {
  clientes: Pick<Cliente, 'nombre' | 'telefono'> | null
  venta_items: (VentaItem & { productos: Pick<Producto, 'nombre'> | null })[]
}

export function useVentas() {
  const [ventas,    setVentas]    = useState<VentaConItems[]>([])
  const [clientes,  setClientes]  = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const supabase = createClient()
  const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0

  const fetchVentas = useCallback(async (): Promise<void> => {
    const inicioMes = new Date(); inicioMes.setDate(1)
    const desde = inicioMes.toISOString().slice(0, 10)
    const { data, error: err } = await db(supabase)
      .from('ventas')
      .select('*, clientes(nombre,telefono), venta_items(id, cantidad, precio_unitario, subtotal, nombre_snapshot, productos(nombre))')
      .gte('fecha', desde)
      .order('created_at', { ascending: false })
    if (err) throw new Error(`ventas: ${err.message}`)
    setVentas((data as VentaConItems[]) ?? [])
  }, [supabase])

  const fetchFormData = useCallback(async (): Promise<void> => {
    const [{ data: cls }, { data: prds }] = await Promise.all([
      db(supabase).from('clientes').select('*').order('nombre'),
      db(supabase).from('productos').select('*').eq('activo', true).order('nombre'),
    ])
    setClientes((cls as Cliente[]) ?? [])
    setProductos((prds as Producto[]) ?? [])
  }, [supabase])

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchVentas(), fetchFormData()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error')
      } finally {
        setLoading(false)
      }
    }
    void cargar()
  }, [fetchVentas, fetchFormData])

  // ── Crear cliente desde el flujo de venta ────────────────────────────────────
  // Devuelve el cliente recién creado (con su id) y actualiza la lista local
  const crearCliente = useCallback(async (data: NuevoClienteData): Promise<Cliente> => {
    setSaving(true)
    try {
      // Obtener negocio_id — patrón estándar con RLS
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario autenticado')
      const { data: usuarioData } = await supabase
        .from('usuarios').select('negocio_id').eq('id', user.id).single()
      const negocioId = (usuarioData as { negocio_id: string } | null)?.negocio_id
      if (!negocioId) throw new Error('No se encontró el negocio')

      const clienteInsert = {
        negocio_id:       negocioId,
        nombre:           data.nombre.trim(),
        telefono:         data.telefono.trim() || null,
        zona_comercial:   data.zona_comercial.trim() || null,
        direccion:        data.direccion?.trim() || null,
        dni:              data.dni?.trim() || null,
        email:            data.email?.trim() || null,
        es_moroso:        false,
        motivo_moroso:    null,
        notas:            null,
        score_interno:    0,
        fecha_nacimiento: null,
        latitud:          null,
        longitud:         null,
      }

      const { data: nuevoCliente, error: errC } = await supabase
        .from('clientes')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(clienteInsert as any)
        .select()
        .single()

      if (errC || !nuevoCliente) throw new Error(`cliente: ${errC?.message}`)

      const clienteCreado = nuevoCliente as Cliente

      // Actualizar lista local sin necesidad de refetch completo
      setClientes(prev => [...prev, clienteCreado].sort((a, b) => a.nombre.localeCompare(b.nombre)))

      return clienteCreado
    } finally {
      setSaving(false)
    }
  }, [supabase])

  // ── Registrar venta ───────────────────────────────────────────────────────────
  const registrarVenta = useCallback(async (data: NuevaVentaData): Promise<string> => {
    setSaving(true)
    try {
      const hoy   = new Date().toISOString().slice(0, 10)
      const total = data.items.reduce((s, i) => s + i.subtotal, 0) - data.descuento

      // Obtener negocio_id — necesario para que RLS permita el insert
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario autenticado')
      const { data: usuarioData } = await supabase
        .from('usuarios').select('negocio_id').eq('id', user.id).single()
      const negocioId = (usuarioData as { negocio_id: string } | null)?.negocio_id
      if (!negocioId) throw new Error('No se encontró el negocio')

      const ventaInsert = {
        negocio_id:      negocioId,
        cliente_id:      data.cliente_id,
        fecha:           hoy,
        total:           total.toFixed(2),
        descuento:       data.descuento.toFixed(2),
        tipo_pago:       data.tipo_pago,
        estado:          'completada',
        notas:           data.notas ?? null,
        usuario_id:      null,
        numero_factura:  null,
      }
      const { data: ventaRaw, error: errV } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('ventas').insert(ventaInsert as any).select().single()
      if (errV || !ventaRaw) throw new Error(`venta: ${errV?.message}`)
      const ventaId = (ventaRaw as Venta).id

      const itemsInsert = data.items.map(i => ({
        venta_id: ventaId,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio.toFixed(2),
        subtotal: i.subtotal.toFixed(2),
        nombre_snapshot: i.nombre,
        precio_snapshot: i.precio.toFixed(2),
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('venta_items').insert(itemsInsert as any)

      // Descontar stock
      for (const item of data.items) {
        if (!item.producto_id) continue
        const prod = productos.find(p => p.id === item.producto_id)
        if (!prod) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('productos')
          .update({ stock_actual: Math.max(0, prod.stock_actual - item.cantidad) })
          .eq('id', item.producto_id)
      }

      // Crear cobranza si es en cuotas
      if (data.tipo_pago === 'cuotas' && (data.cant_cuotas ?? 1) > 1) {
        const cant = data.cant_cuotas ?? 2
        const cobInsert = {
          negocio_id:      negocioId,
          cliente_id:      data.cliente_id,
          venta_id:        ventaId,
          descripcion:     data.items.map(i => `${i.nombre} x${i.cantidad}`).join(', '),
          monto_total:     total.toFixed(2),
          cant_cuotas:     cant,
          cuotas_pagas:    0,
          fecha_inicio:    hoy,
          estado:          'activa',
          dia_vencimiento: null,
        }
        const { data: cobRaw, error: errC } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from('cobranzas').insert(cobInsert as any).select().single()
        if (errC || !cobRaw) throw new Error(`cobranza: ${errC?.message}`)
        const cobranzaId = (cobRaw as { id: string }).id
        const montoCuota = total / cant
        const baseDate = data.fecha_primer_cobro
          ? new Date(data.fecha_primer_cobro + 'T12:00:00')
          : (() => { const d = new Date(hoy); d.setMonth(d.getMonth() + 1); return d })()
        const cuotas = Array.from({ length: cant }, (_, i) => {
          const f = new Date(baseDate); f.setMonth(f.getMonth() + i)
          return {
            cobranza_id:              cobranzaId,
            numero_cuota:             i + 1,
            monto:                    montoCuota.toFixed(2),
            fecha_vencimiento:        f.toISOString().slice(0, 10),
            estado:                   'pendiente' as const,
            intentos_cobro:           0,
            fecha_pago:               null,
            metodo_pago:              null,
            notas:                    null,
            ultima_notificacion_sent: null,
          }
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('cuotas').insert(cuotas as any)
      }

      await fetchVentas()
      return ventaId
    } finally {
      setSaving(false)
    }
  }, [supabase, productos, fetchVentas])

  const resumen = {
    totalMes:      ventas.reduce((s, v) => s + toFloat(v.total), 0),
    cantidadMes:   ventas.length,
    efectivo:      ventas.filter(v => v.tipo_pago === 'efectivo').reduce((s, v) => s + toFloat(v.total), 0),
    transferencia: ventas.filter(v => v.tipo_pago === 'transferencia').reduce((s, v) => s + toFloat(v.total), 0),
    cuotas:        ventas.filter(v => v.tipo_pago === 'cuotas').reduce((s, v) => s + toFloat(v.total), 0),
  }

  return {
    ventas, clientes, productos, resumen,
    loading, saving, error,
    registrarVenta, crearCliente,
    refetch: fetchVentas,
  }
}