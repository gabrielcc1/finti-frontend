'use client'

// src/hooks/useCobranzas.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cliente, Cobranza, Cuota } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

// ── Interfaces locales de Insert/Update ───────────────────────────────────────
interface CobranzaInsertLocal {
  negocio_id:   string
  cliente_id:   string
  venta_id:     null
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
interface CuotaUpdateLocal {
  estado?:             'pendiente' | 'pagada' | 'vencida'
  fecha_pago?:         string
  fecha_vencimiento?:  string
}
interface ClienteUpdateLocal {
  es_moroso?:    boolean
  motivo_moroso?: string | null
}

// ── Tipos extendidos ──────────────────────────────────────────────────────────
export interface CuotaConCobranza extends Cuota {
  cobranzas: {
    id: string
    descripcion: string | null
    cant_cuotas: number
    monto_total: string
    clientes: Pick<Cliente, 'id' | 'nombre' | 'telefono' | 'es_moroso' | 'motivo_moroso'> | null
  } | null
}

export interface CobranzaConDetalle extends Cobranza {
  clientes: Pick<Cliente, 'id' | 'nombre' | 'telefono' | 'es_moroso' | 'motivo_moroso'> | null
  cuotas: Cuota[]
}

export interface ResumenCobranzas {
  totalPendiente:   number
  totalVencido:     number
  totalCobradoMes:  number
  cantMorosos:      number
  cuotasHoy:        number
}

export type MotivoProblema =
  | 'no_pago'
  | 'no_retiro_pedido'
  | 'no_responde'
  | 'cheque_rechazado'
  | 'otro'

export function useCobranzas() {
  const [cobranzas,     setCobranzas]     = useState<CobranzaConDetalle[]>([])
  const [clientes,      setClientes]      = useState<Cliente[]>([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const supabase = createClient()
  const toFloat  = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0

  // ── Cargar cobranzas activas ───────────────────────────────────────────────
  const fetchCobranzas = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('cobranzas')
      .select(`
        *,
        clientes ( id, nombre, telefono, es_moroso, motivo_moroso ),
        cuotas ( * )
      `)
      .in('estado', ['activa', 'vencida'])
      .order('created_at', { ascending: false })

    if (err) throw new Error(`cobranzas: ${err.message}`)
    const lista = (data as CobranzaConDetalle[]) ?? []

    // ── Marcado automático: 7 días vencida sin pagar → es_moroso = true ──────
    const hoyMs = new Date().setHours(0, 0, 0, 0)
    const DIAS_LIMITE = 7

    for (const cob of lista) {
      const cliente = cob.clientes
      if (!cliente || cliente.es_moroso) continue  // ya marcado, saltar

      // Verificar si NINGUNA cuota fue pagada (cliente no pagó nada)
      const cuotas = cob.cuotas ?? []
      const noPagoNada = cuotas.length > 0 && cuotas.every(c => c.estado !== 'pagada')

      const tieneVencida7dias = cuotas.some(c => {
        if (c.estado === 'pagada') return false
        const partes = (c.fecha_vencimiento ?? '').slice(0, 10).split('-').map(Number)
        const venc = new Date(partes[0], partes[1] - 1, partes[2]).getTime()
        const diasVencida = Math.floor((hoyMs - venc) / (1000 * 60 * 60 * 24))
        return diasVencida >= DIAS_LIMITE
      })

      if (tieneVencida7dias) {
        const motivo = noPagoNada
          ? 'No pagó ninguna cuota (marcado automáticamente)'
          : 'No pagó cuotas vencidas (marcado automáticamente)'
        const upd: ClienteUpdateLocal = { es_moroso: true, motivo_moroso: motivo }
        await db(supabase).from('clientes').update(upd).eq('id', cliente.id)
        // Actualizar localmente sin esperar refetch
        ;(cliente as typeof cliente).es_moroso = true
        ;(cliente as typeof cliente).motivo_moroso = motivo
      }
    }

    setCobranzas([...lista])
  }, [supabase])

  // ── Cargar clientes (para nueva cobranza manual) ───────────────────────────
  const fetchClientes = useCallback(async (): Promise<void> => {
    const { data } = await db(supabase).from('clientes').select('*').order('nombre')
    setClientes((data as Cliente[]) ?? [])
  }, [supabase])

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchCobranzas(), fetchClientes()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar')
      } finally {
        setLoading(false)
      }
    }
    void cargar()
  }, [fetchCobranzas, fetchClientes])

  // ── Registrar cobro de una cuota ──────────────────────────────────────────
  const cobrarCuota = useCallback(async (cuotaId: string): Promise<void> => {
    setSaving(true)
    try {
      const hoy = new Date().toISOString().slice(0, 10)

      // 1. Marcar cuota como pagada
      const cuotaUpd: CuotaUpdateLocal = { estado: 'pagada', fecha_pago: hoy }
      await db(supabase).from('cuotas').update(cuotaUpd).eq('id', cuotaId)

      // 2. Incrementar cuotas_pagas en la cobranza (via función SQL)
      await db(supabase).rpc('incrementar_cuotas_pagas', { p_cuota_id: cuotaId })

      await fetchCobranzas()
    } finally {
      setSaving(false)
    }
  }, [supabase, fetchCobranzas])

  // ── Crear cobranza manual (sin venta) ─────────────────────────────────────
  const crearCobranzaManual = useCallback(async (data: {
    cliente_id: string
    descripcion: string
    monto_total: number
    cant_cuotas: number
    fecha_inicio: string
  }): Promise<void> => {
    setSaving(true)
    try {
      // Obtener negocio_id — necesario para que RLS permita el insert
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario autenticado')
      const { data: usuarioData } = await db(supabase)
        .from('usuarios').select('negocio_id').eq('id', user.id).single()
      const uRow = usuarioData as { negocio_id: string | null } | null
      if (!uRow?.negocio_id) throw new Error('No se encontró el negocio')
      const negocioId = uRow.negocio_id

      const cobInsert: CobranzaInsertLocal = {
        negocio_id:   negocioId,
        cliente_id:   data.cliente_id,
        venta_id:     null,
        descripcion:  data.descripcion,
        monto_total:  data.monto_total.toFixed(2),
        cant_cuotas:  data.cant_cuotas,
        cuotas_pagas: 0,
        fecha_inicio: data.fecha_inicio,
        estado:       'activa',
      }
      const { data: cobRaw, error: errC } = await db(supabase)
        .from('cobranzas').insert(cobInsert).select().single()
      if (errC || !cobRaw) throw new Error(`cobranza: ${errC?.message}`)
      const cobranzaId = (cobRaw as { id: string }).id

      const montoCuota = data.monto_total / data.cant_cuotas
      const cuotas: CuotaInsertLocal[] = Array.from({ length: data.cant_cuotas }, (_, i) => {
        const f = new Date(data.fecha_inicio)
        f.setMonth(f.getMonth() + i + 1)
        return {
          cobranza_id:       cobranzaId,
          numero_cuota:      i + 1,
          monto:             montoCuota.toFixed(2),
          fecha_vencimiento: f.toISOString().slice(0, 10),
          estado:            'pendiente' as const,
          intentos_cobro:    0,
        }
      })
      await db(supabase).from('cuotas').insert(cuotas)
      await fetchCobranzas()
    } finally {
      setSaving(false)
    }
  }, [supabase, fetchCobranzas])

  // ── Marcar cliente como problemático (manual) ─────────────────────────────
  const marcarClienteProblematico = useCallback(async (
    clienteId: string,
    motivo: MotivoProblema,
    detalle?: string
  ): Promise<void> => {
    const motivoTexto: Record<MotivoProblema, string> = {
      no_pago:           'No pagó cuotas',
      no_retiro_pedido:  'No retiró pedido',
      no_responde:       'No responde',
      cheque_rechazado:  'Cheque rechazado',
      otro:              detalle ?? 'Otro motivo',
    }
    const update: ClienteUpdateLocal = {
      es_moroso:     true,
      motivo_moroso: motivoTexto[motivo],
    }
    await db(supabase).from('clientes').update(update).eq('id', clienteId)
    await Promise.all([fetchCobranzas(), fetchClientes()])
  }, [supabase, fetchCobranzas, fetchClientes])

  // ── Quitar marca de problemático ──────────────────────────────────────────
  const quitarMarcaProblematico = useCallback(async (clienteId: string): Promise<void> => {
    // Conservar el motivo anterior como historial con prefijo [NORMALIZADO]
    const clienteActual = clientes.find(c => c.id === clienteId)
    const motivoAnterior = clienteActual?.motivo_moroso ?? ''
    const historial = motivoAnterior.startsWith('[NORMALIZADO]')
      ? motivoAnterior
      : motivoAnterior
        ? `[NORMALIZADO] ${motivoAnterior}`
        : '[NORMALIZADO]'
    const update: ClienteUpdateLocal = { es_moroso: false, motivo_moroso: historial }
    await db(supabase).from('clientes').update(update).eq('id', clienteId)
    await Promise.all([fetchCobranzas(), fetchClientes()])
  }, [supabase, clientes, fetchCobranzas, fetchClientes])

  // ── Resumen calculado ─────────────────────────────────────────────────────
  // Parseo local para evitar desfase UTC: "YYYY-MM-DD" → Date(year, month-1, day)
  const parseFechaLocal = (iso: string | null | undefined): Date | null => {
    if (!iso) return null
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const hoy = parseFechaLocal(new Date().toISOString().slice(0, 10))!

  const todasLasCuotas = cobranzas.flatMap(c => c.cuotas ?? [])

  const resumen: ResumenCobranzas = {
    totalPendiente: todasLasCuotas
      .filter(c => c.estado === 'pendiente')
      .reduce((s, c) => s + toFloat(c.monto), 0),

    // "vencida" = fecha de vencimiento estrictamente anterior a hoy (no incluye hoy)
    totalVencido: todasLasCuotas
      .filter(c => {
        if (c.estado !== 'pendiente') return false
        const venc = parseFechaLocal(c.fecha_vencimiento)
        return venc !== null && venc < hoy
      })
      .reduce((s, c) => s + toFloat(c.monto), 0),

    totalCobradoMes: todasLasCuotas
      .filter(c => {
        if (c.estado !== 'pagada' || !c.fecha_pago) return false
        const fp = parseFechaLocal(c.fecha_pago)
        return fp !== null && fp.getMonth() === hoy.getMonth() && fp.getFullYear() === hoy.getFullYear()
      })
      .reduce((s, c) => s + toFloat(c.monto), 0),

    cantMorosos: clientes.filter(c => c.es_moroso).length,

    // "cuotasHoy" = exactamente hoy — estas aparecen en el módulo Recorrido
    cuotasHoy: todasLasCuotas.filter(c => {
      if (c.estado !== 'pendiente') return false
      const venc = parseFechaLocal(c.fecha_vencimiento)
      return venc !== null && venc.getTime() === hoy.getTime()
    }).length,
  }

  const editarFechaCuota = useCallback(async (cuotaId: string, nuevaFecha: string): Promise<void> => {
    setSaving(true)
    try {
      const fechaUpd: CuotaUpdateLocal = { fecha_vencimiento: nuevaFecha }
      const { error: err } = await db(supabase).from('cuotas')
        .update(fechaUpd).eq('id', cuotaId)
      if (err) throw new Error(`editarFecha: ${err.message}`)
      // Actualizar estado local optimistamente
      setCobranzas(prev => prev.map(cb => ({
        ...cb,
        cuotas: (cb.cuotas ?? []).map(c => c.id === cuotaId ? { ...c, fecha_vencimiento: nuevaFecha } : c)
      })))
    } finally {
      setSaving(false)
    }
  }, [supabase])

  return {
    cobranzas, clientes, resumen,
    loading, saving, error,
    cobrarCuota,
    editarFechaCuota,
    crearCobranzaManual,
    marcarClienteProblematico,
    quitarMarcaProblematico,
    refetch: fetchCobranzas,
  }
}