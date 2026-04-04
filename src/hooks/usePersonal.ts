'use client'

// src/hooks/usePersonal.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── db(): cast centralizado — evita el tipo 'never' del cliente tipado ────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

// ── Tipos locales para tablas que no están en database.ts ────────────────────
// presupuesto_personal, metas_ahorro y v_salud_financiera_personal
// no están declaradas en src/types/database.ts → TypeScript las resuelve
// como propiedad inexistente. Se definen acá hasta que se agreguen al schema.

export type CategoriaIngreso = 'retiro_negocio' | 'sueldo' | 'freelance' | 'otros'
export type CategoriaGasto   = 'vivienda' | 'alimentacion' | 'transporte' | 'salud' | 'educacion' | 'ocio' | 'otros'
export type EstadoMeta       = 'activa' | 'pausada' | 'completada'

export interface IngresoRow {
  id: string
  usuario_id: string
  descripcion: string
  monto: string
  categoria: CategoriaIngreso | null
  fecha: string
  created_at: string
}

export interface GastoRow {
  id: string
  usuario_id: string
  descripcion: string
  monto: string
  categoria: CategoriaGasto | null
  fecha: string
  recurrente: boolean
  created_at: string
}

export interface PresupRow {
  id: string
  usuario_id: string
  mes: number
  anio: number
  categoria: string
  monto_limite: string
  created_at: string
}

export interface MetaRow {
  id: string
  usuario_id: string
  nombre: string
  monto_objetivo: string
  monto_actual: string
  fecha_objetivo: string | null
  estado: EstadoMeta
  created_at: string
}

export type { IngresoRow as Ingreso, GastoRow as GastoPersonal, PresupRow as Presupuesto, MetaRow as Meta }

export interface NuevoIngresoData {
  descripcion: string
  monto: number
  categoria: string
  fecha?: string
}
export interface NuevoGastoData {
  descripcion: string
  monto: number
  categoria: string
  fecha?: string
  recurrente?: boolean
}
export interface NuevoPresupuestoData {
  categoria: string
  monto_limite: number
  mes?: number
  anio?: number
}
export interface NuevaMetaData {
  nombre: string
  monto_objetivo: number
  fecha_objetivo?: string
}

export interface SaludFinanciera {
  ingresos_del_negocio: number
  ingresos_totales: number
  pct_dependencia_negocio: number
}

// ── Interfaces de Insert/Update ───────────────────────────────────────────────
interface IngresoInsert {
  usuario_id: string
  descripcion: string
  monto: string
  categoria: CategoriaIngreso | null
  fecha: string
}
interface IngresoUpdate {
  descripcion?: string
  monto?: string
  categoria?: CategoriaIngreso | null
  fecha?: string
}
interface GastoInsert {
  usuario_id: string
  descripcion: string
  monto: string
  categoria: CategoriaGasto | null
  fecha: string
  recurrente: boolean
}
interface GastoUpdate {
  descripcion?: string
  monto?: string
  categoria?: CategoriaGasto | null
  fecha?: string
  recurrente?: boolean
}
interface PresupInsert {
  usuario_id: string
  mes: number
  anio: number
  categoria: string
  monto_limite: string
}
interface PresupUpdate {
  monto_limite?: string
}
interface MetaInsert {
  usuario_id: string
  nombre: string
  monto_objetivo: string
  monto_actual: string
  fecha_objetivo: string | null
  estado: EstadoMeta
}
interface MetaUpdate {
  monto_actual?: string
  estado?: EstadoMeta
}

const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0

async function getUserId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay usuario autenticado')
  return user.id
}

// ── Helpers para castear categorías de string a los tipos union ───────────────
function toCategIngreso(s: string): CategoriaIngreso {
  const valid: CategoriaIngreso[] = ['retiro_negocio', 'sueldo', 'freelance', 'otros']
  return valid.includes(s as CategoriaIngreso) ? (s as CategoriaIngreso) : 'otros'
}
function toCategGasto(s: string): CategoriaGasto {
  const valid: CategoriaGasto[] = ['vivienda', 'alimentacion', 'transporte', 'salud', 'educacion', 'ocio', 'otros']
  return valid.includes(s as CategoriaGasto) ? (s as CategoriaGasto) : 'otros'
}

export function usePersonal() {
  const [ingresos,    setIngresos]    = useState<IngresoRow[]>([])
  const [gastos,      setGastos]      = useState<GastoRow[]>([])
  const [presupuesto, setPresupuesto] = useState<PresupRow[]>([])
  const [metas,       setMetas]       = useState<MetaRow[]>([])
  const [salud,       setSalud]       = useState<SaludFinanciera | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const supabase = createClient()
  const hoy = new Date()
  const mesActual   = hoy.getMonth() + 1
  const anioActual  = hoy.getFullYear()
  const primerDiaMes = `${anioActual}-${String(mesActual).padStart(2, '0')}-01`

  // ── Fetch ingresos del mes ──────────────────────────────────────────────────
  const fetchIngresos = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('ingresos_personales').select('*')
      .gte('fecha', primerDiaMes)
      .order('fecha', { ascending: false })
    if (err) throw new Error(`ingresos: ${err.message}`)
    setIngresos((data as IngresoRow[]) ?? [])
  }, [supabase, primerDiaMes])

  // ── Fetch gastos del mes ────────────────────────────────────────────────────
  const fetchGastos = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('gastos_personales').select('*')
      .gte('fecha', primerDiaMes)
      .order('fecha', { ascending: false })
    if (err) throw new Error(`gastos: ${err.message}`)
    setGastos((data as GastoRow[]) ?? [])
  }, [supabase, primerDiaMes])

  // ── Fetch presupuesto del mes ───────────────────────────────────────────────
  const fetchPresupuesto = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('presupuesto_personal').select('*')
      .eq('mes', mesActual).eq('anio', anioActual)
    if (err) throw new Error(`presupuesto: ${err.message}`)
    setPresupuesto((data as PresupRow[]) ?? [])
  }, [supabase, mesActual, anioActual])

  // ── Fetch metas ─────────────────────────────────────────────────────────────
  const fetchMetas = useCallback(async (): Promise<void> => {
    const { data, error: err } = await db(supabase)
      .from('metas_ahorro').select('*')
      .order('created_at', { ascending: false })
    if (err) throw new Error(`metas: ${err.message}`)
    setMetas((data as MetaRow[]) ?? [])
  }, [supabase])

  // ── Fetch salud financiera ──────────────────────────────────────────────────
   const fetchSalud = useCallback(async (): Promise<void> => {
    // FIX: usar .maybeSingle() en lugar de .single()
    // La vista v_salud_financiera_personal puede no tener fila para usuarios
    // nuevos que aún no registraron ingresos. .single() tira 406 en ese caso.
    const { data, error: err } = await db(supabase)
      .from('v_salud_financiera_personal')
      .select('usuario_id, ingresos_del_negocio, ingresos_totales, pct_dependencia_negocio')
      .maybeSingle()
 
    // Silenciar error — es esperable para usuarios nuevos sin datos
    if (err) {
      console.warn('[usePersonal] fetchSalud:', err.message)
      setSalud(null)
      return
    }
 
    if (data) {
      const row = data as {
        ingresos_del_negocio:    unknown
        ingresos_totales:        unknown
        pct_dependencia_negocio: unknown
      }
      setSalud({
        ingresos_del_negocio:    toFloat(row.ingresos_del_negocio as string),
        ingresos_totales:        toFloat(row.ingresos_totales as string),
        pct_dependencia_negocio: toFloat(row.pct_dependencia_negocio as string),
      })
    } else {
      // Usuario sin datos todavía — mostrar ceros
      setSalud({ ingresos_del_negocio: 0, ingresos_totales: 0, pct_dependencia_negocio: 0 })
    }
  }, [supabase])

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchIngresos(), fetchGastos(), fetchPresupuesto(), fetchMetas(), fetchSalud()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar finanzas personales')
      } finally {
        setLoading(false)
      }
    }
    void cargar()
  }, [fetchIngresos, fetchGastos, fetchPresupuesto, fetchMetas, fetchSalud])

  // ── INGRESOS ────────────────────────────────────────────────────────────────
  const agregarIngreso = useCallback(async (data: NuevoIngresoData): Promise<void> => {
    setSaving(true)
    try {
      const userId = await getUserId(supabase)
      const insert: IngresoInsert = {
        usuario_id:  userId,
        descripcion: data.descripcion,
        monto:       data.monto.toString(),
        categoria:   toCategIngreso(data.categoria),
        fecha:       data.fecha ?? new Date().toISOString().slice(0, 10),
      }
      const { error: err } = await db(supabase).from('ingresos_personales').insert(insert)
      if (err) throw new Error(`agregar ingreso: ${err.message}`)
      await Promise.all([fetchIngresos(), fetchSalud()])
    } finally { setSaving(false) }
  }, [supabase, fetchIngresos, fetchSalud])

  const editarIngreso = useCallback(async (id: string, data: NuevoIngresoData): Promise<void> => {
    setSaving(true)
    try {
      const update: IngresoUpdate = {
        descripcion: data.descripcion,
        monto:       data.monto.toString(),
        categoria:   toCategIngreso(data.categoria),
        fecha:       data.fecha ?? new Date().toISOString().slice(0, 10),
      }
      const { error: err } = await db(supabase).from('ingresos_personales').update(update).eq('id', id)
      if (err) throw new Error(`editar ingreso: ${err.message}`)
      await Promise.all([fetchIngresos(), fetchSalud()])
    } finally { setSaving(false) }
  }, [supabase, fetchIngresos, fetchSalud])

  const eliminarIngreso = useCallback(async (id: string): Promise<void> => {
    setSaving(true)
    try {
      const { error: err } = await db(supabase).from('ingresos_personales').delete().eq('id', id)
      if (err) throw new Error(`eliminar ingreso: ${err.message}`)
      setIngresos(prev => prev.filter(i => i.id !== id))
      await fetchSalud()
    } finally { setSaving(false) }
  }, [supabase, fetchSalud])

  // ── GASTOS PERSONALES ───────────────────────────────────────────────────────
  const agregarGasto = useCallback(async (data: NuevoGastoData): Promise<void> => {
    setSaving(true)
    try {
      const userId = await getUserId(supabase)
      const insert: GastoInsert = {
        usuario_id:  userId,
        descripcion: data.descripcion,
        monto:       data.monto.toString(),
        categoria:   toCategGasto(data.categoria),
        fecha:       data.fecha ?? new Date().toISOString().slice(0, 10),
        recurrente:  data.recurrente ?? false,
      }
      const { error: err } = await db(supabase).from('gastos_personales').insert(insert)
      if (err) throw new Error(`agregar gasto: ${err.message}`)
      await fetchGastos()
    } finally { setSaving(false) }
  }, [supabase, fetchGastos])

  const editarGasto = useCallback(async (id: string, data: NuevoGastoData): Promise<void> => {
    setSaving(true)
    try {
      const update: GastoUpdate = {
        descripcion: data.descripcion,
        monto:       data.monto.toString(),
        categoria:   toCategGasto(data.categoria),
        fecha:       data.fecha ?? new Date().toISOString().slice(0, 10),
        recurrente:  data.recurrente ?? false,
      }
      const { error: err } = await db(supabase).from('gastos_personales').update(update).eq('id', id)
      if (err) throw new Error(`editar gasto: ${err.message}`)
      await fetchGastos()
    } finally { setSaving(false) }
  }, [supabase, fetchGastos])

  const eliminarGasto = useCallback(async (id: string): Promise<void> => {
    setSaving(true)
    try {
      const { error: err } = await db(supabase).from('gastos_personales').delete().eq('id', id)
      if (err) throw new Error(`eliminar gasto: ${err.message}`)
      setGastos(prev => prev.filter(g => g.id !== id))
    } finally { setSaving(false) }
  }, [supabase])

  // ── PRESUPUESTO ─────────────────────────────────────────────────────────────
  const guardarPresupuesto = useCallback(async (data: NuevoPresupuestoData): Promise<void> => {
    setSaving(true)
    try {
      const userId = await getUserId(supabase)
      const mes  = data.mes  ?? mesActual
      const anio = data.anio ?? anioActual
      const existing = presupuesto.find(p => p.categoria === data.categoria)
      if (existing) {
        const update: PresupUpdate = { monto_limite: data.monto_limite.toString() }
        const { error: err } = await db(supabase).from('presupuesto_personal').update(update).eq('id', existing.id)
        if (err) throw new Error(`actualizar presupuesto: ${err.message}`)
      } else {
        const insert: PresupInsert = {
          usuario_id:   userId,
          mes,
          anio,
          categoria:    data.categoria,
          monto_limite: data.monto_limite.toString(),
        }
        const { error: err } = await db(supabase).from('presupuesto_personal').insert(insert)
        if (err) throw new Error(`crear presupuesto: ${err.message}`)
      }
      await fetchPresupuesto()
    } finally { setSaving(false) }
  }, [supabase, presupuesto, mesActual, anioActual, fetchPresupuesto])

  // ── METAS ────────────────────────────────────────────────────────────────────
  const crearMeta = useCallback(async (data: NuevaMetaData): Promise<void> => {
    setSaving(true)
    try {
      const userId = await getUserId(supabase)
      const insert: MetaInsert = {
        usuario_id:     userId,
        nombre:         data.nombre,
        monto_objetivo: data.monto_objetivo.toString(),
        monto_actual:   '0',
        fecha_objetivo: data.fecha_objetivo ?? null,
        estado:         'activa',
      }
      const { error: err } = await db(supabase).from('metas_ahorro').insert(insert)
      if (err) throw new Error(`crear meta: ${err.message}`)
      await fetchMetas()
    } finally { setSaving(false) }
  }, [supabase, fetchMetas])

  const abonarMeta = useCallback(async (id: string, monto: number): Promise<void> => {
    setSaving(true)
    try {
      const meta = metas.find(m => m.id === id)
      if (!meta) throw new Error('Meta no encontrada')
      const nuevoMonto = Math.min(toFloat(meta.monto_actual) + monto, toFloat(meta.monto_objetivo))
      const completada = nuevoMonto >= toFloat(meta.monto_objetivo)
      const update: MetaUpdate = {
        monto_actual: nuevoMonto.toString(),
        estado:       completada ? 'completada' : 'activa',
      }
      const { error: err } = await db(supabase).from('metas_ahorro').update(update).eq('id', id)
      if (err) throw new Error(`abonar meta: ${err.message}`)
      setMetas(prev => prev.map(m => m.id === id ? { ...m, ...update } : m))
    } finally { setSaving(false) }
  }, [supabase, metas])

  const cambiarEstadoMeta = useCallback(async (id: string, estado: EstadoMeta): Promise<void> => {
    setSaving(true)
    try {
      const update: MetaUpdate = { estado }
      const { error: err } = await db(supabase).from('metas_ahorro').update(update).eq('id', id)
      if (err) throw new Error(`cambiar estado meta: ${err.message}`)
      setMetas(prev => prev.map(m => m.id === id ? { ...m, estado } : m))
    } finally { setSaving(false) }
  }, [supabase])

  const eliminarMeta = useCallback(async (id: string): Promise<void> => {
    setSaving(true)
    try {
      const { error: err } = await db(supabase).from('metas_ahorro').delete().eq('id', id)
      if (err) throw new Error(`eliminar meta: ${err.message}`)
      setMetas(prev => prev.filter(m => m.id !== id))
    } finally { setSaving(false) }
  }, [supabase])

  // ── Resumen calculado ───────────────────────────────────────────────────────
  const totalIngresos = ingresos.reduce((s, i) => s + toFloat(i.monto), 0)
  const totalGastos   = gastos.reduce((s, g) => s + toFloat(g.monto), 0)
  const balance       = totalIngresos - totalGastos
  const tasaAhorro    = totalIngresos > 0 ? (balance / totalIngresos) * 100 : 0

  const gastosPorCat = gastos.reduce((acc, g) => {
    const cat = g.categoria ?? 'otros'
    acc[cat] = (acc[cat] ?? 0) + toFloat(g.monto)
    return acc
  }, {} as Record<string, number>)

  const alertasPresupuesto = presupuesto.filter(p => (gastosPorCat[p.categoria] ?? 0) > toFloat(p.monto_limite))

  const resumen = {
    totalIngresos,
    totalGastos,
    balance,
    tasaAhorro,
    gastosPorCat,
    alertasPresupuesto,
    metasActivas:     metas.filter(m => m.estado === 'activa').length,
    metasCompletadas: metas.filter(m => m.estado === 'completada').length,
    ahorroTotal:      metas.reduce((s, m) => s + toFloat(m.monto_actual), 0),
  }

  return {
    ingresos, gastos, presupuesto, metas, salud, resumen,
    loading, saving, error,
    agregarIngreso, editarIngreso, eliminarIngreso,
    agregarGasto,   editarGasto,   eliminarGasto,
    guardarPresupuesto,
    crearMeta, abonarMeta, cambiarEstadoMeta, eliminarMeta,
    mesActual, anioActual,
    refetch: () => Promise.all([fetchIngresos(), fetchGastos(), fetchPresupuesto(), fetchMetas(), fetchSalud()]),
  }
}