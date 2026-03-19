'use client'

// src/hooks/useContable.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── db(): cast centralizado ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

// ── Interfaces locales para activos_fijos (tabla no tipada en database.ts) ────
interface ActivoFijoInsert {
  negocio_id:      string
  nombre:          string
  categoria:       string
  descripcion:     string | null
  valor_compra:    number
  fecha_compra:    string
  deprecia:        boolean
  vida_util_meses: number | null
  valor_residual:  number
  notas:           string | null
  estado:          string
}
interface ActivoFijoUpdate {
  nombre?:          string
  categoria?:       string
  descripcion?:     string | null
  valor_compra?:    number
  fecha_compra?:    string
  deprecia?:        boolean
  vida_util_meses?: number | null
  valor_residual?:  number
  notas?:           string | null
  estado?:          string
  fecha_baja?:      string
  valor_venta?:     number | null
}

export interface EstadoResultados {
  periodo: string
  ingresos_ventas: number
  descuentos: number
  costo_ventas: number
  gastos_operativos: number
  ventas_netas: number
  utilidad_bruta: number
  utilidad_operativa: number
  margen_bruto_pct: number
  margen_operativo_pct: number
}

export interface FlujoEfectivo {
  periodo: string
  cobros_contado: number
  cobros_cuotas: number
  egresos_gastos: number
  egresos_compras_mp: number
  flujo_neto: number
  total_entradas: number
  total_salidas: number
}

export interface BalanceGeneral {
  fecha_balance: string
  caja_estimada: number
  cuentas_cobrar: number
  inventario: number
  activos_fijos_valor_libro: number
  activos_fijos_valor_compra: number
  total_activo_corriente: number
  total_activo_no_corriente: number
  total_activo: number
  obligaciones_pedidos: number
  total_pasivo: number
  ingresos_acumulados: number
  gastos_acumulados: number
  patrimonio_neto: number
}

export interface AsientoDiario {
  negocio_id: string; fecha: string; numero_asiento: string
  tipo: string; descripcion: string; debe: number; haber: number
  cuenta_debe: string; cuenta_haber: string; ref_id: string
  comprobante: string | null
}

export interface CambioPatrimonio {
  periodo: string; resultado_periodo: number
  patrimonio_inicio: number; patrimonio_fin: number; variacion_pct: number
}

export interface ActivoFijo {
  id: string; negocio_id: string; nombre: string; categoria: string
  descripcion: string | null; valor_compra: number; fecha_compra: string
  deprecia: boolean; vida_util_meses: number | null; valor_residual: number
  estado: string; valor_venta: number | null; fecha_baja: string | null
  notas: string | null; created_at: string; meses_uso: number
  depreciacion_acumulada: number; cuota_depreciacion_mensual: number
  valor_libro: number
}

export interface NuevoActivoData {
  nombre: string; categoria: string; descripcion?: string
  valor_compra: number; fecha_compra: string
  deprecia: boolean; vida_util_meses?: number
  valor_residual?: number; notas?: string
}

const toFloat = (v: unknown) => parseFloat(String(v ?? 0)) || 0

async function getNegocioId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sin autenticación')
  const { data } = await db(supabase).from('usuarios').select('negocio_id').eq('id', user.id).single()
  const row = data as { negocio_id: string | null } | null
  return row?.negocio_id ?? ''
}

export function useContable() {
  const [resultados,  setResultados]  = useState<EstadoResultados[]>([])
  const [flujos,      setFlujos]      = useState<FlujoEfectivo[]>([])
  const [balance,     setBalance]     = useState<BalanceGeneral | null>(null)
  const [libroDiario, setLibroDiario] = useState<AsientoDiario[]>([])
  const [patrimonio,  setPatrimonio]  = useState<CambioPatrimonio[]>([])
  const [activos,     setActivos]     = useState<ActivoFijo[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [periodoSel,  setPeriodoSel]  = useState<string>('')

  const supabase = createClient()

  const fetchResultados = useCallback(async () => {
    const { data, error: err } = await db(supabase).from('v_estado_resultados').select('*').limit(12)
    if (err) throw new Error(`resultados: ${err.message}`)
    const rows = ((data ?? []) as Record<string, unknown>[]).map(r => {
      const iv = toFloat(r.ingresos_ventas), desc = toFloat(r.descuentos)
      const cv = toFloat(r.costo_ventas),    go   = toFloat(r.gastos_operativos)
      const vn = iv - desc, ub = vn - cv,    uo   = ub - go
      return {
        periodo: String(r.periodo), ingresos_ventas: iv, descuentos: desc,
        costo_ventas: cv, gastos_operativos: go, ventas_netas: vn,
        utilidad_bruta: ub, utilidad_operativa: uo,
        margen_bruto_pct:     vn > 0 ? (ub / vn) * 100 : 0,
        margen_operativo_pct: vn > 0 ? (uo / vn) * 100 : 0,
      }
    })
    setResultados(rows)
    if (rows.length > 0 && !periodoSel) setPeriodoSel(rows[0].periodo)
  }, [supabase, periodoSel])

  const fetchFlujos = useCallback(async () => {
    const { data, error: err } = await db(supabase).from('v_flujo_efectivo').select('*').limit(12)
    if (err) throw new Error(`flujos: ${err.message}`)
    setFlujos(((data ?? []) as Record<string, unknown>[]).map(r => ({
      periodo: String(r.periodo),
      cobros_contado:     toFloat(r.cobros_contado),
      cobros_cuotas:      toFloat(r.cobros_cuotas),
      egresos_gastos:     toFloat(r.egresos_gastos),
      egresos_compras_mp: toFloat(r.egresos_compras_mp),
      flujo_neto:         toFloat(r.flujo_neto),
      total_entradas:     toFloat(r.cobros_contado) + toFloat(r.cobros_cuotas),
      total_salidas:      toFloat(r.egresos_gastos) + toFloat(r.egresos_compras_mp),
    })))
  }, [supabase])

  const fetchBalance = useCallback(async () => {
    const negocioId = await getNegocioId(supabase)
    const { data, error: err } = await db(supabase)
      .from('v_balance_general').select('*').eq('negocio_id', negocioId).single()
    if (err && err.code !== 'PGRST116') throw new Error(`balance: ${err.message}`)
    if (data) {
      const r = data as Record<string, unknown>
      const caja = toFloat(r.caja_estimada), cc = toFloat(r.cuentas_cobrar)
      const inv  = toFloat(r.inventario)
      const afVL = toFloat(r.activos_fijos_valor_libro)
      const afVC = toFloat(r.activos_fijos_valor_compra)
      const oblig = toFloat(r.obligaciones_pedidos)
      const corriente   = caja + cc + inv
      const noCorriente = afVL
      const ingAc = toFloat(r.ingresos_acumulados)
      const gtoAc = toFloat(r.gastos_acumulados)
      setBalance({
        fecha_balance: String(r.fecha_balance),
        caja_estimada: caja, cuentas_cobrar: cc, inventario: inv,
        activos_fijos_valor_libro: afVL, activos_fijos_valor_compra: afVC,
        total_activo_corriente: corriente, total_activo_no_corriente: noCorriente,
        total_activo: corriente + noCorriente,
        obligaciones_pedidos: oblig, total_pasivo: oblig,
        ingresos_acumulados: ingAc, gastos_acumulados: gtoAc,
        patrimonio_neto: ingAc - gtoAc - oblig + afVL,
      })
    }
  }, [supabase])

  const fetchLibroDiario = useCallback(async () => {
    const { data, error: err } = await db(supabase).from('v_libro_diario').select('*').limit(200)
    if (err) throw new Error(`libro: ${err.message}`)
    setLibroDiario(((data ?? []) as Record<string, unknown>[]).map(r => ({
      negocio_id: String(r.negocio_id), fecha: String(r.fecha),
      numero_asiento: String(r.numero_asiento), tipo: String(r.tipo),
      descripcion: String(r.descripcion), debe: toFloat(r.debe), haber: toFloat(r.haber),
      cuenta_debe: String(r.cuenta_debe), cuenta_haber: String(r.cuenta_haber),
      ref_id: String(r.ref_id), comprobante: r.comprobante ? String(r.comprobante) : null,
    })))
  }, [supabase])

  const fetchActivos = useCallback(async () => {
    const { data, error: err } = await db(supabase)
      .from('v_activos_fijos').select('*').order('fecha_compra', { ascending: false })
    if (err) throw new Error(`activos: ${err.message}`)
    setActivos(((data ?? []) as Record<string, unknown>[]).map(r => ({
      id: String(r.id), negocio_id: String(r.negocio_id),
      nombre: String(r.nombre), categoria: String(r.categoria),
      descripcion: r.descripcion ? String(r.descripcion) : null,
      valor_compra: toFloat(r.valor_compra), fecha_compra: String(r.fecha_compra),
      deprecia: Boolean(r.deprecia),
      vida_util_meses: r.vida_util_meses ? Number(r.vida_util_meses) : null,
      valor_residual: toFloat(r.valor_residual), estado: String(r.estado),
      valor_venta: r.valor_venta ? toFloat(r.valor_venta) : null,
      fecha_baja: r.fecha_baja ? String(r.fecha_baja) : null,
      notas: r.notas ? String(r.notas) : null, created_at: String(r.created_at),
      meses_uso: Number(r.meses_uso ?? 0),
      depreciacion_acumulada:     toFloat(r.depreciacion_acumulada),
      cuota_depreciacion_mensual: toFloat(r.cuota_depreciacion_mensual),
      valor_libro: toFloat(r.valor_libro),
    })))
  }, [supabase])

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchResultados(), fetchFlujos(), fetchBalance(), fetchLibroDiario(), fetchActivos()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos contables')
      } finally { setLoading(false) }
    }
    void cargar()
  }, [fetchResultados, fetchFlujos, fetchBalance, fetchLibroDiario, fetchActivos])

  const calcPatrimonio = useCallback((rows: EstadoResultados[]) => {
    let acumulado = 0
    const cambios = [...rows].sort((a, b) => a.periodo.localeCompare(b.periodo)).map(r => {
      const inicio = acumulado; acumulado += r.utilidad_operativa
      return {
        periodo: r.periodo, resultado_periodo: r.utilidad_operativa,
        patrimonio_inicio: inicio, patrimonio_fin: acumulado,
        variacion_pct: inicio !== 0 ? ((acumulado - inicio) / Math.abs(inicio)) * 100 : 0,
      }
    })
    setPatrimonio(cambios.reverse())
  }, [])

  useEffect(() => { if (resultados.length > 0) calcPatrimonio(resultados) }, [resultados, calcPatrimonio])

  // ── ACTIVOS FIJOS — CRUD ────────────────────────────────────────────────────
  const agregarActivo = useCallback(async (data: NuevoActivoData) => {
    setSaving(true)
    try {
      const negocioId = await getNegocioId(supabase)
      const insert: ActivoFijoInsert = {
        negocio_id:      negocioId,
        nombre:          data.nombre,
        categoria:       data.categoria,
        descripcion:     data.descripcion ?? null,
        valor_compra:    data.valor_compra,
        fecha_compra:    data.fecha_compra,
        deprecia:        data.deprecia,
        vida_util_meses: data.deprecia ? (data.vida_util_meses ?? null) : null,
        valor_residual:  data.deprecia ? (data.valor_residual ?? 0) : 0,
        notas:           data.notas ?? null,
        estado:          'activo',
      }
      const { error: err } = await db(supabase).from('activos_fijos').insert(insert)
      if (err) throw new Error(`agregar activo: ${err.message}`)
      await Promise.all([fetchActivos(), fetchBalance()])
    } finally { setSaving(false) }
  }, [supabase, fetchActivos, fetchBalance])

  const editarActivo = useCallback(async (id: string, data: NuevoActivoData) => {
    setSaving(true)
    try {
      const update: ActivoFijoUpdate = {
        nombre:          data.nombre,
        categoria:       data.categoria,
        descripcion:     data.descripcion ?? null,
        valor_compra:    data.valor_compra,
        fecha_compra:    data.fecha_compra,
        deprecia:        data.deprecia,
        vida_util_meses: data.deprecia ? (data.vida_util_meses ?? null) : null,
        valor_residual:  data.deprecia ? (data.valor_residual ?? 0) : 0,
        notas:           data.notas ?? null,
      }
      const { error: err } = await db(supabase).from('activos_fijos').update(update).eq('id', id)
      if (err) throw new Error(`editar activo: ${err.message}`)
      await Promise.all([fetchActivos(), fetchBalance()])
    } finally { setSaving(false) }
  }, [supabase, fetchActivos, fetchBalance])

  const darDeBaja = useCallback(async (id: string, tipo: 'vendido' | 'baja', valorVenta?: number) => {
    setSaving(true)
    try {
      const update: ActivoFijoUpdate = {
        estado:     tipo,
        fecha_baja: new Date().toISOString().slice(0, 10),
        valor_venta: valorVenta ?? null,
      }
      const { error: err } = await db(supabase).from('activos_fijos').update(update).eq('id', id)
      if (err) throw new Error(`dar de baja: ${err.message}`)
      await Promise.all([fetchActivos(), fetchBalance()])
    } finally { setSaving(false) }
  }, [supabase, fetchActivos, fetchBalance])

  const eliminarActivo = useCallback(async (id: string) => {
    setSaving(true)
    try {
      const { error: err } = await db(supabase).from('activos_fijos').delete().eq('id', id)
      if (err) throw new Error(`eliminar activo: ${err.message}`)
      setActivos(prev => prev.filter(a => a.id !== id))
      await fetchBalance()
    } finally { setSaving(false) }
  }, [supabase, fetchBalance])

  const resumenActivos = {
    totalValorCompra:  activos.filter(a => a.estado === 'activo').reduce((s, a) => s + a.valor_compra, 0),
    totalValorLibro:   activos.filter(a => a.estado === 'activo').reduce((s, a) => s + a.valor_libro, 0),
    totalDepreciacion: activos.filter(a => a.estado === 'activo').reduce((s, a) => s + a.depreciacion_acumulada, 0),
    cuotaMensualTotal: activos.filter(a => a.estado === 'activo' && a.deprecia).reduce((s, a) => s + a.cuota_depreciacion_mensual, 0),
    cantActivos:       activos.filter(a => a.estado === 'activo').length,
  }

  return {
    resultados, flujos, balance, libroDiario, patrimonio, activos, resumenActivos,
    resultadoActual: resultados.find(r => r.periodo === periodoSel) ?? resultados[0] ?? null,
    flujoActual:     flujos.find(f => f.periodo === periodoSel)     ?? flujos[0]     ?? null,
    periodos: resultados.map(r => r.periodo), periodoSel, setPeriodoSel,
    loading, saving, error,
    agregarActivo, editarActivo, darDeBaja, eliminarActivo,
    refetch: () => Promise.all([fetchResultados(), fetchFlujos(), fetchBalance(), fetchLibroDiario(), fetchActivos()]),
  }
}