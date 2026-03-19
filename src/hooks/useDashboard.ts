'use client'

// src/hooks/useDashboard.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CuotaConCliente, Producto } from '@/types/database'

// ── db(): cast centralizado ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

type VentaDia = { dia: string; ventas: number; cobros: number }

// ── Interfaces locales de Update ──────────────────────────────────────────────
interface CuotaUpdateLocal {
  estado:      'pagada' | 'pendiente' | 'vencida'
  fecha_pago:  string
  metodo_pago: string
}

export function useDashboard() {
  const [cuotasHoy,     setCuotasHoy]     = useState<CuotaConCliente[]>([])
  const [cajaHoy,       setCajaHoy]       = useState<number>(0)
  const [cajaMes,       setCajaMes]       = useState<number>(0)
  const [ventasMes,     setVentasMes]     = useState<number>(0)
  const [ventasSemana,  setVentasSemana]  = useState<VentaDia[]>([])
  const [stockCritico,  setStockCritico]  = useState<Producto[]>([])
  const [saludPersonal, setSaludPersonal] = useState<number | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [conexion,      setConexion]      = useState<'online' | 'syncing' | 'offline'>('online')

  const supabase = createClient()

  const toFloat = (v: string | number | null | undefined): number =>
    parseFloat(String(v ?? 0)) || 0

  // ── Cuotas de hoy ──────────────────────────────────────────────────────────
  const fetchCuotasHoy = useCallback(async (): Promise<void> => {
    const hoy = new Date().toISOString().slice(0, 10)
    const { data, error: err } = await db(supabase)
      .from('cuotas')
      .select(`
        *,
        cobranzas (
          descripcion,
          cant_cuotas,
          clientes ( nombre, telefono, zona_comercial )
        )
      `)
      .eq('fecha_vencimiento', hoy)
      .neq('estado', 'pagada')
      .order('fecha_vencimiento', { ascending: true })

    if (err) throw new Error(`cuotasHoy: ${err.message}`)
    setCuotasHoy((data as CuotaConCliente[]) ?? [])
  }, [supabase])

  // ── Caja hoy y del mes ─────────────────────────────────────────────────────
  const fetchCaja = useCallback(async (): Promise<void> => {
    const hoy       = new Date().toISOString().slice(0, 10)
    const inicioMes = hoy.slice(0, 7) + '-01'

    const { data: ventasHoy } = await db(supabase)
      .from('ventas').select('total').eq('fecha', hoy).eq('estado', 'completada')

    const { data: ventasMesData } = await db(supabase)
      .from('ventas').select('total').gte('fecha', inicioMes).eq('estado', 'completada')

    const totalHoy = ((ventasHoy ?? []) as { total: string }[]).reduce((s, v) => s + toFloat(v.total), 0)
    const totalMes = ((ventasMesData ?? []) as { total: string }[]).reduce((s, v) => s + toFloat(v.total), 0)

    setCajaHoy(totalHoy)
    setCajaMes(totalMes)
    setVentasMes(((ventasMesData ?? []) as unknown[]).length)
  }, [supabase])

  // ── Ventas últimos 7 días ──────────────────────────────────────────────────
  const fetchVentasSemana = useCallback(async (): Promise<void> => {
    const dias: VentaDia[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const fecha    = d.toISOString().slice(0, 10)
      const diaLabel = d.toLocaleDateString('es-AR', { weekday: 'short' })

      const { data: ventasData } = await db(supabase)
        .from('ventas').select('total').eq('fecha', fecha).eq('estado', 'completada')

      const { data: cobrosData } = await db(supabase)
        .from('cuotas').select('monto').eq('fecha_pago', fecha).eq('estado', 'pagada')

      dias.push({
        dia:    diaLabel,
        ventas: ((ventasData ?? []) as { total: string }[]).reduce((s, v) => s + toFloat(v.total), 0),
        cobros: ((cobrosData ?? []) as { monto: string }[]).reduce((s, c) => s + toFloat(c.monto), 0),
      })
    }
    setVentasSemana(dias)
  }, [supabase])

  // ── Stock crítico ──────────────────────────────────────────────────────────
  const fetchStockCritico = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('productos').select('*').eq('activo', true)

    if (err) { console.warn('stockCritico:', err.message); return }

    const criticos = ((data as Producto[]) ?? [])
      .filter(p => p.stock_actual <= p.stock_minimo)
      .sort((a, b) => a.stock_actual - b.stock_actual)
      .slice(0, 5)

    setStockCritico(criticos)
  }, [supabase])

  // ── Salud financiera personal ─────────────────────────────────────────────
  const fetchSaludPersonal = useCallback(async (): Promise<void> => {
    const { data } = await db(supabase)
      .from('v_salud_financiera_personal')
      .select('pct_dependencia_negocio')
      .single()

    if (data) setSaludPersonal(toFloat((data as { pct_dependencia_negocio: string | null }).pct_dependencia_negocio))
  }, [supabase])

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        setConexion('syncing')
        await Promise.all([
          fetchCuotasHoy(), fetchCaja(), fetchVentasSemana(),
          fetchStockCritico(), fetchSaludPersonal(),
        ])
        setConexion('online')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar dashboard')
        setConexion('offline')
      } finally { setLoading(false) }
    }
    void cargar()
  }, [fetchCuotasHoy, fetchCaja, fetchVentasSemana, fetchStockCritico, fetchSaludPersonal])

  // ── Realtime: escuchar cambios en cuotas ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('cuotas-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cuotas' },
        () => { void fetchCuotasHoy() }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [supabase, fetchCuotasHoy])

  // ── Registrar cobro de una cuota ──────────────────────────────────────────
  const registrarCobro = useCallback(async (cuotaId: string): Promise<void> => {
    setConexion('syncing')
    const hoy = new Date().toISOString().slice(0, 10)

    const cuotaUpdate: CuotaUpdateLocal = {
      estado:      'pagada',
      fecha_pago:  hoy,
      metodo_pago: 'efectivo',
    }
    const { error: err } = await db(supabase)
      .from('cuotas').update(cuotaUpdate).eq('id', cuotaId)

    if (err) {
      setConexion('offline')
      throw new Error(`registrarCobro: ${err.message}`)
    }

    // Incrementar cuotas_pagas en la cobranza
    await db(supabase).rpc('incrementar_cuotas_pagas', { p_cuota_id: cuotaId })

    setCuotasHoy(prev =>
      prev.map(c => c.id === cuotaId
        ? { ...c, estado: 'pagada' as const, fecha_pago: hoy }
        : c
      )
    )

    await fetchCaja()
    setConexion('online')
  }, [supabase, fetchCaja])

  return {
    cuotasHoy, cajaHoy, cajaMes, ventasMes,
    ventasSemana, stockCritico, saludPersonal,
    loading, error, conexion,
    registrarCobro,
  }
}