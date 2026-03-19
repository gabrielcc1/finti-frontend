'use client'

// src/hooks/usePedidos.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Pedido, Cliente } from '@/types/database'

// ── db(): cast centralizado ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

// ── Interfaces locales de Insert/Update ───────────────────────────────────────
interface PedidoInsertLocal {
  negocio_id:      string
  usuario_id:      string | null
  cliente_id:      string
  descripcion:     string
  monto_entrega:   string
  monto_seña:      string
  fecha_entrega:   string
  fecha_pedido:    string
  genera_cobranza: boolean
  cant_cuotas:     number
  notas:           string | null
  estado:          EstadoPedido
}
interface PedidoUpdateLocal {
  estado?:             EstadoPedido
  fecha_entrega_real?: string
  venta_id?:           string | null
  cobranza_id?:        string | null
}
interface VentaInsertLocal {
  negocio_id: string
  cliente_id: string | null
  fecha:      string
  total:      string
  descuento:  string
  tipo_pago:  'efectivo' | 'transferencia' | 'tarjeta' | 'cuotas'
  estado:     'completada' | 'pendiente' | 'cancelada'
  notas:      string | null
}
interface CobranzaInsertLocal {
  negocio_id:   string
  cliente_id:   string | null
  venta_id:     string
  descripcion:  string
  monto_total:  string
  cant_cuotas:  number
  cuotas_pagas: number
  fecha_inicio: string
  estado:       'activa' | 'completada' | 'vencida'
}
interface CuotaInsertLocal {
  cobranza_id:       string
  numero_cuota:      number
  monto:             string
  fecha_vencimiento: string
  estado:            'pendiente' | 'pagada' | 'vencida'
  intentos_cobro:    number
}

export type EstadoPedido = 'recibido' | 'en_elaboracion' | 'listo' | 'entregado' | 'cancelado'

export interface PedidoConCliente extends Pedido {
  clientes: Pick<Cliente, 'nombre' | 'telefono' | 'zona_comercial'> | null
  dias_restantes: number
}

export interface CrearPedidoData {
  cliente_id:       string
  descripcion:      string
  monto_entrega:    number
  monto_seña?:      number
  fecha_entrega:    string
  genera_cobranza?: boolean
  cant_cuotas?:     number
  notas?:           string
}

export interface DatosVentaEntrega {
  pedido_id:    string
  cliente_id:   string | null
  descripcion:  string
  monto_total:  number
  tipo_pago:    'efectivo' | 'transferencia' | 'tarjeta' | 'cuotas'
  cant_cuotas?: number
}

async function getNegocioId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay usuario autenticado')
  const { data } = await db(supabase).from('usuarios').select('negocio_id').eq('id', user.id).single()
  const row = data as { negocio_id: string | null } | null
  if (!row?.negocio_id) throw new Error('No se encontró el negocio')
  return row.negocio_id
}

export function usePedidos() {
  const [pedidos,  setPedidos]  = useState<PedidoConCliente[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const supabase = createClient()
  const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0

  const fetchPedidos = useCallback(async (): Promise<void> => {
    const hoy = new Date().toISOString().slice(0, 10)
    const { data, error: err } = await db(supabase)
      .from('pedidos')
      .select('*, clientes(nombre, telefono, zona_comercial)')
      .not('estado', 'in', '("entregado","cancelado")')
      .order('fecha_entrega', { ascending: true })

    if (err) throw new Error(`pedidos: ${err.message}`)

    const hoyDate = new Date(hoy)
    const raw = (data ?? []) as (Pedido & { clientes: PedidoConCliente['clientes'] })[]
    const conDias: PedidoConCliente[] = raw.map(p => {
      const entrega = new Date(p.fecha_entrega)
      const diff = Math.ceil((entrega.getTime() - hoyDate.getTime()) / (1000 * 60 * 60 * 24))
      return { ...p, dias_restantes: diff }
    })
    setPedidos(conDias)
  }, [supabase])

  const fetchClientes = useCallback(async (): Promise<void> => {
    const { data } = await db(supabase).from('clientes').select('*').order('nombre')
    setClientes((data as Cliente[]) ?? [])
  }, [supabase])

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchPedidos(), fetchClientes()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar pedidos')
      } finally { setLoading(false) }
    }
    void cargar()
  }, [fetchPedidos, fetchClientes])

  const crearPedido = useCallback(async (data: CrearPedidoData): Promise<void> => {
    setSaving(true)
    try {
      const negocioId = await getNegocioId(supabase)
      const { data: { user } } = await supabase.auth.getUser()

      const insert: PedidoInsertLocal = {
        negocio_id:      negocioId,
        usuario_id:      user?.id ?? null,
        cliente_id:      data.cliente_id,
        descripcion:     data.descripcion.trim(),
        monto_entrega:   data.monto_entrega.toFixed(2),
        monto_seña:      (data.monto_seña ?? 0).toFixed(2),
        fecha_entrega:   data.fecha_entrega,
        genera_cobranza: data.genera_cobranza ?? false,
        cant_cuotas:     data.cant_cuotas ?? 1,
        notas:           data.notas?.trim() ?? null,
        estado:          'recibido',
        fecha_pedido:    new Date().toISOString().slice(0, 10),
      }
      const { error: err } = await db(supabase).from('pedidos').insert(insert)
      if (err) throw new Error(`crearPedido: ${err.message}`)
      await fetchPedidos()
    } finally { setSaving(false) }
  }, [supabase, fetchPedidos])

  const avanzarEstado = useCallback(async (id: string, estadoActual: EstadoPedido): Promise<void> => {
    const siguientes: Partial<Record<EstadoPedido, EstadoPedido>> = {
      recibido:       'en_elaboracion',
      en_elaboracion: 'listo',
      listo:          'listo',
    }
    const nuevoEstado = siguientes[estadoActual]
    if (!nuevoEstado || nuevoEstado === estadoActual) return

    const update: PedidoUpdateLocal = { estado: nuevoEstado }
    const { error: err } = await db(supabase).from('pedidos').update(update).eq('id', id)
    if (err) throw new Error(`avanzarEstado: ${err.message}`)
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
  }, [supabase])

  const cancelarPedido = useCallback(async (id: string): Promise<void> => {
    const update: PedidoUpdateLocal = { estado: 'cancelado' }
    const { error: err } = await db(supabase).from('pedidos').update(update).eq('id', id)
    if (err) throw new Error(`cancelarPedido: ${err.message}`)
    setPedidos(prev => prev.filter(p => p.id !== id))
  }, [supabase])

  const confirmarEntregaConVenta = useCallback(async (datos: DatosVentaEntrega): Promise<void> => {
    setSaving(true)
    try {
      const negocioId = await getNegocioId(supabase)
      const hoy = new Date().toISOString().slice(0, 10)

      // 1. Insertar venta
      const ventaInsert: VentaInsertLocal = {
        negocio_id: negocioId,
        cliente_id: datos.cliente_id,
        fecha:      hoy,
        total:      datos.monto_total.toFixed(2),
        descuento:  '0',
        tipo_pago:  datos.tipo_pago,
        estado:     'completada',
        notas:      `Entrega pedido: ${datos.descripcion}`,
      }
      const { data: ventaRaw, error: errV } = await db(supabase)
        .from('ventas').insert(ventaInsert).select().single()
      if (errV || !ventaRaw) throw new Error(`venta: ${errV?.message}`)
      const ventaId = (ventaRaw as { id: string }).id

      // 2. Si es en cuotas → crear cobranza + cuotas
      let cobranzaId: string | null = null
      const cant = datos.cant_cuotas ?? 1

      if (datos.tipo_pago === 'cuotas' && cant > 1) {
        const cobInsert: CobranzaInsertLocal = {
          negocio_id:   negocioId,
          cliente_id:   datos.cliente_id,
          venta_id:     ventaId,
          descripcion:  datos.descripcion,
          monto_total:  datos.monto_total.toFixed(2),
          cant_cuotas:  cant,
          cuotas_pagas: 0,
          fecha_inicio: hoy,
          estado:       'activa',
        }
        const { data: cobRaw, error: errC } = await db(supabase)
          .from('cobranzas').insert(cobInsert).select().single()
        if (errC || !cobRaw) throw new Error(`cobranza: ${errC?.message}`)
        cobranzaId = (cobRaw as { id: string }).id

        const montoCuota = datos.monto_total / cant
        const cuotas: CuotaInsertLocal[] = Array.from({ length: cant }, (_, i) => {
          const f = new Date(hoy); f.setMonth(f.getMonth() + i + 1)
          return {
            cobranza_id:       cobranzaId as string,
            numero_cuota:      i + 1,
            monto:             montoCuota.toFixed(2),
            fecha_vencimiento: f.toISOString().slice(0, 10),
            estado:            'pendiente' as const,
            intentos_cobro:    0,
          }
        })
        await db(supabase).from('cuotas').insert(cuotas)
      }

      // 3. Marcar pedido como entregado y vincular venta
      const pedidoUpdate: PedidoUpdateLocal = {
        estado:             'entregado',
        fecha_entrega_real: hoy,
        venta_id:           ventaId,
        cobranza_id:        cobranzaId,
      }
      await db(supabase).from('pedidos').update(pedidoUpdate).eq('id', datos.pedido_id)
      setPedidos(prev => prev.filter(p => p.id !== datos.pedido_id))
    } finally { setSaving(false) }
  }, [supabase])

  const confirmarEntregaSinVenta = useCallback(async (id: string): Promise<void> => {
    setSaving(true)
    try {
      const hoy = new Date().toISOString().slice(0, 10)
      const update: PedidoUpdateLocal = { estado: 'entregado', fecha_entrega_real: hoy }
      const { error: err } = await db(supabase).from('pedidos').update(update).eq('id', id)
      if (err) throw new Error(`confirmarEntrega: ${err.message}`)
      setPedidos(prev => prev.filter(p => p.id !== id))
    } finally { setSaving(false) }
  }, [supabase])

  const alertas = {
    hoy:        pedidos.filter(p => p.dias_restantes === 0),
    manana:     pedidos.filter(p => p.dias_restantes === 1),
    estaSemana: pedidos.filter(p => p.dias_restantes >= 0 && p.dias_restantes <= 7),
    atrasados:  pedidos.filter(p => p.dias_restantes < 0),
    total:      pedidos.length,
  }

  return {
    pedidos, clientes,
    loading, saving, error, alertas,
    crearPedido, avanzarEstado, cancelarPedido,
    confirmarEntregaConVenta, confirmarEntregaSinVenta,
    refetch: fetchPedidos,
  }
}