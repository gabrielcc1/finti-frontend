// src/app/api/push/cron/route.ts
// Envía notificaciones diarias de cuotas y pedidos.
// Vercel Cron llama con GET + header Authorization: Bearer CRON_SECRET
// Postman/manual: GET o POST con header x-cron-secret: TU_CRON_SECRET
// Schedule: "0 11 * * *" en vercel.json → 08:00 ART (UTC-3)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarPushAUsuario, pushTemplates } from '@/lib/push/sender'

interface SubRow     { endpoint: string; p256dh: string; auth: string }
interface PrefRow    { canal_push: boolean; activo: boolean }
interface CuotaRow   { usuario_id: string; total_cuotas: number; monto_total: number }
interface VencidaRow { usuario_id: string; total_vencidas: number; monto_vencido: number }
interface PedidoRow  { usuario_id: string; total_pedidos: number; pedidos_hoy: number; pedidos_manana: number }

// ── Validación de autorización ────────────────────────────────────────────────
// Acepta tres formas:
//   1. Vercel Cron automático: Authorization: Bearer <CRON_SECRET>
//   2. Postman/manual:         x-cron-secret: <CRON_SECRET>
//   3. Desarrollo local:       sin validación (NODE_ENV !== 'production')
function estaAutorizado(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true

  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron] CRON_SECRET no está configurado en las variables de entorno')
    return false
  }

  // Vercel Cron manda: Authorization: Bearer <secret>
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  // Postman o llamada manual: x-cron-secret: <secret>
  const manualHeader = req.headers.get('x-cron-secret')
  if (manualHeader === secret) return true

  return false
}

// ── Handler principal (compartido entre GET y POST) ───────────────────────────
async function handler(req: NextRequest): Promise<NextResponse> {
  if (!estaAutorizado(req)) {
    return NextResponse.json(
      {
        error: 'No autorizado',
        ayuda: 'Usá el header x-cron-secret con el valor exacto de CRON_SECRET, o Authorization: Bearer <secret>',
      },
      { status: 401 }
    )
  }

  // Service role para bypassar RLS — necesario porque el cron ve datos de todos los usuarios
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const resultado = {
    cuotasHoy:      0,
    cuotasVencidas: 0,
    pedidosHoy:     0,
    pedidosManana:  0,
    errores:        [] as string[],
    timestamp:      new Date().toISOString(),
  }

  // ── Helper: subscripciones push activas del usuario ───────────────────────
  async function getSubs(userId: string): Promise<SubRow[] | null> {
    const { data: pref } = await supabase
      .from('preferencias_notificaciones')
      .select('canal_push, activo')
      .eq('usuario_id', userId)
      .maybeSingle()

    const p = pref as PrefRow | null
    // Si no tiene preferencias guardadas asumimos que sí quiere (default true)
    if (p !== null && (!p.canal_push || !p.activo)) return null

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('usuario_id', userId)
      .eq('activa', true)

    const lista = (subs as SubRow[]) ?? []
    return lista.length > 0 ? lista : null
  }

  // ── Helper: marcar suscripciones expiradas como inactivas ─────────────────
  async function limpiarExpiradas(expiradas: string[]) {
    if (!expiradas.length) return
    await supabase
      .from('push_subscriptions')
      .update({ activa: false })
      .in('endpoint', expiradas)
  }

  // ── Helper: registrar en log ───────────────────────────────────────────────
  async function log(userId: string, tipo: string, payload: object, ok: boolean) {
    await supabase.from('notificaciones_log').insert({
      usuario_id: userId,
      tipo,
      canal:      'push',
      estado:     ok ? 'enviada' : 'fallida',
      contenido:  payload,
      enviada_at: new Date().toISOString(),
    })
  }

  // ─── 1. Cuotas que vencen HOY ─────────────────────────────────────────────
  // La función SQL filtra cuotas con fecha_vencimiento = current_date y estado = 'pendiente'
  try {
    const { data, error } = await supabase.rpc('get_usuarios_con_cuotas_hoy')
    if (error) throw error
    for (const row of ((data ?? []) as CuotaRow[])) {
      const subs = await getSubs(row.usuario_id)
      if (!subs?.length) continue
      const payload = pushTemplates.cuotasHoy(row.total_cuotas, row.monto_total)
      const { enviadas, expiradas } = await enviarPushAUsuario(subs, payload)
      resultado.cuotasHoy += enviadas
      await limpiarExpiradas(expiradas)
      await log(row.usuario_id, 'vencimiento_hoy', payload, enviadas > 0)
    }
  } catch (err) {
    const msg = `cuotasHoy: ${err instanceof Error ? err.message : String(err)}`
    console.error('[cron]', msg)
    resultado.errores.push(msg)
  }

  // ─── 2. Cuotas VENCIDAS (días anteriores sin pagar) ───────────────────────
  // La función SQL filtra cuotas con fecha_vencimiento < current_date y estado = 'pendiente'
 /* try {
    const { data, error } = await supabase.rpc('get_usuarios_con_cuotas_vencidas')
    if (error) throw error
    for (const row of ((data ?? []) as VencidaRow[])) {
      const subs = await getSubs(row.usuario_id)
      if (!subs?.length) continue
      const payload = pushTemplates.cuotasVencidas(row.total_vencidas, row.monto_vencido)
      const { enviadas, expiradas } = await enviarPushAUsuario(subs, payload)
      resultado.cuotasVencidas += enviadas
      await limpiarExpiradas(expiradas)
      await log(row.usuario_id, 'recordatorio_1d', payload, enviadas > 0)
    }
  } catch (err) {
    const msg = `cuotasVencidas: ${err instanceof Error ? err.message : String(err)}`
    console.error('[cron]', msg)
    resultado.errores.push(msg)
  } */
    

  // ─── 3. Pedidos con fecha_entrega = HOY o MAÑANA ──────────────────────────
  // La función SQL unifica ambos casos y devuelve cuántos son de hoy y cuántos de mañana
  try {
    const { data, error } = await supabase.rpc('get_usuarios_con_pedidos_proximos')
    if (error) throw error
    for (const row of ((data ?? []) as PedidoRow[])) {
      const subs = await getSubs(row.usuario_id)
      if (!subs?.length) continue

      // Notificación de pedidos para HOY (urgente)
      if (row.pedidos_hoy > 0) {
        const payload = pushTemplates.pedidosHoy(row.pedidos_hoy)
        const { enviadas, expiradas } = await enviarPushAUsuario(subs, payload)
        resultado.pedidosHoy += enviadas
        await limpiarExpiradas(expiradas)
        await log(row.usuario_id, 'vencimiento_hoy', payload, enviadas > 0)
      }

      // Notificación de pedidos para MAÑANA (aviso previo)
      if (row.pedidos_manana > 0) {
        const payload = pushTemplates.pedidosManana(row.pedidos_manana)
        const { enviadas, expiradas } = await enviarPushAUsuario(subs, payload)
        resultado.pedidosManana += enviadas
        await limpiarExpiradas(expiradas)
        await log(row.usuario_id, 'recordatorio_1d', payload, enviadas > 0)
      }
    }
  } catch (err) {
    const msg = `pedidosProximos: ${err instanceof Error ? err.message : String(err)}`
    console.error('[cron]', msg)
    resultado.errores.push(msg)
  }

  return NextResponse.json({ ok: true, ...resultado })
}

// Vercel Cron usa GET. Postman puede usar GET o POST. Ambos válidos.
export const GET  = handler
export const POST = handler