// src/app/api/push/cron/route.ts
// Envía notificaciones diarias de cuotas y pedidos.
// Configurar en vercel.json: { "crons": [{ "path": "/api/push/cron", "schedule": "0 11 * * *" }] }
// 0 11 UTC = 08:00 ART

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarPushAUsuario, pushTemplates } from '@/lib/push/sender'

interface SubRow      { endpoint: string; p256dh: string; auth: string }
interface PrefRow     { canal_push: boolean; activo: boolean }
interface CuotaRow    { usuario_id: string; total_cuotas: number; monto_total: number }
interface VencidaRow  { usuario_id: string; total_vencidas: number; monto_vencido: number }
interface PedidoRow   { usuario_id: string; total_pedidos: number }

export async function POST(req: NextRequest) {
  // Validar secret en producción
  if (process.env.NODE_ENV === 'production') {
    const secret = req.headers.get('x-cron-secret')
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  // Service role para bypassar RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const res = { cuotasHoy: 0, cuotasVencidas: 0, pedidosHoy: 0 }

  // ── Helper: obtener subs del usuario y verificar que tiene push activo ─────
  async function getSubs(userId: string): Promise<SubRow[] | null> {
    const { data: pref } = await supabase
      .from('preferencias_notificaciones')
      .select('canal_push, activo')
      .eq('usuario_id', userId)
      .single()

    const p = pref as PrefRow | null
    if (!p?.canal_push || !p?.activo) return null

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('usuario_id', userId)
      .eq('activa', true)

    return (subs as SubRow[]) ?? null
  }

  async function limpiarExpiradas(expiradas: string[]) {
    if (!expiradas.length) return
    await supabase.from('push_subscriptions').update({ activa: false }).in('endpoint', expiradas)
  }

  async function log(userId: string, tipo: string, payload: object, ok: boolean) {
    await supabase.from('notificaciones_log').insert({
      usuario_id: userId, tipo, canal: 'push',
      estado: ok ? 'enviada' : 'fallida',
      contenido: payload, enviada_at: new Date().toISOString(),
    })
  }

  // ─── 1. Cuotas que vencen HOY ─────────────────────────────────────────────
  try {
    const { data } = await supabase.rpc('get_usuarios_con_cuotas_hoy')
    for (const row of ((data ?? []) as CuotaRow[])) {
      const subs = await getSubs(row.usuario_id)
      if (!subs?.length) continue
      const payload = pushTemplates.cuotasHoy(row.total_cuotas, row.monto_total)
      const { enviadas, expiradas } = await enviarPushAUsuario(subs, payload)
      res.cuotasHoy += enviadas
      await limpiarExpiradas(expiradas)
      await log(row.usuario_id, 'vencimiento_hoy', payload, enviadas > 0)
    }
  } catch (err) { console.error('[cron] cuotasHoy:', err) }

  // ─── 2. Cuotas VENCIDAS ───────────────────────────────────────────────────
  try {
    const { data } = await supabase.rpc('get_usuarios_con_cuotas_vencidas')
    for (const row of ((data ?? []) as VencidaRow[])) {
      const subs = await getSubs(row.usuario_id)
      if (!subs?.length) continue
      const payload = pushTemplates.cuotasVencidas(row.total_vencidas, row.monto_vencido)
      const { enviadas, expiradas } = await enviarPushAUsuario(subs, payload)
      res.cuotasVencidas += enviadas
      await limpiarExpiradas(expiradas)
      await log(row.usuario_id, 'vencimiento_hoy', payload, enviadas > 0)
    }
  } catch (err) { console.error('[cron] cuotasVencidas:', err) }

  // ─── 3. Pedidos del día ───────────────────────────────────────────────────
  try {
    const { data } = await supabase.rpc('get_usuarios_con_pedidos_hoy')
    for (const row of ((data ?? []) as PedidoRow[])) {
      const subs = await getSubs(row.usuario_id)
      if (!subs?.length) continue
      const payload = pushTemplates.pedidosHoy(row.total_pedidos)
      const { enviadas, expiradas } = await enviarPushAUsuario(subs, payload)
      res.pedidosHoy += enviadas
      await limpiarExpiradas(expiradas)
      await log(row.usuario_id, 'vencimiento_hoy', payload, enviadas > 0)
    }
  } catch (err) { console.error('[cron] pedidosHoy:', err) }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), ...res })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'finti-push-cron', status: 'activo' })
}