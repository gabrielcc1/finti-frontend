// src/lib/push/sender.ts
// Instalar: npm install web-push && npm install -D @types/web-push
import webpush from 'web-push'

let configured = false

function setup() {
  if (configured) return
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const sub  = process.env.VAPID_SUBJECT || 'mailto:hola@finti.app'
  if (!pub || !priv) throw new Error('Faltan variables VAPID. Corré: npx web-push generate-vapid-keys')
  webpush.setVapidDetails(sub, pub, priv)
  configured = true
}

export type PushTipo =
  | 'cuota_vence_hoy' | 'cuota_vencida' | 'pedido_entrega_hoy'
  | 'pago_confirmado' | 'stock_critico' | 'general' | 'pedido_manana'

export interface PushPayload {
  title: string
  body:  string
  type:  PushTipo
  url?:  string
}

export interface SubData { endpoint: string; p256dh: string; auth: string }

export async function enviarPush(
  sub: SubData,
  payload: PushPayload
): Promise<{ ok: boolean; expired?: boolean }> {
  setup()
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ ...payload, icon: '/icons/icon-192x192.png', badge: '/icons/icon-96x96.png' }),
      {
        TTL:     60 * 60 * 24,
        urgency: ['cuota_vence_hoy', 'pedido_entrega_hoy'].includes(payload.type) ? 'high' : 'normal',
      }
    )
    return { ok: true }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const s = (err as { statusCode: number }).statusCode
      if (s === 410 || s === 404) return { ok: false, expired: true }
    }
    return { ok: false }
  }
}

export async function enviarPushAUsuario(
  subs: SubData[],
  payload: PushPayload
): Promise<{ enviadas: number; expiradas: string[] }> {
  const results = await Promise.allSettled(subs.map(s => enviarPush(s, payload)))
  let enviadas = 0
  const expiradas: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      if (r.value.ok) enviadas++
      else if (r.value.expired) expiradas.push(subs[i].endpoint)
    }
  })
  return { enviadas, expiradas }
}

// Formateador de pesos sin toLocaleString para evitar diferencias entre entornos
function fmt(n: number): string {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export const pushTemplates = {
  cuotasHoy: (cant: number, monto: number): PushPayload => ({
    title: `${cant} cobro${cant > 1 ? 's' : ''} para hoy`,
    body:  `Tenés ${cant} cuota${cant > 1 ? 's' : ''} por cobrar — ${fmt(monto)} en total. ¡A trabajar! 💪`,
    type:  'cuota_vence_hoy',
    url:   '/cobranzas',
  }),
  cuotasVencidas: (cant: number, monto: number): PushPayload => ({
    title: `${cant} cuota${cant > 1 ? 's' : ''} vencida${cant > 1 ? 's' : ''}`,
    body:  `Hay ${fmt(monto)} sin cobrar de cuotas vencidas. Hacé el seguimiento antes de que se complique.`,
    type:  'cuota_vencida',
    url:   '/cobranzas',
  }),
  pedidosHoy: (cant: number): PushPayload => ({
    title: `${cant} entrega${cant > 1 ? 's' : ''} programada${cant > 1 ? 's' : ''} para hoy`,
    body:  `Tenés ${cant} pedido${cant > 1 ? 's' : ''} para entregar hoy. Revisá los detalles.`,
    type:  'pedido_entrega_hoy',
    url:   '/pedidos',
  }),
 pedidosManana: (cant: number): PushPayload => ({
    type: 'pedido_manana',
    title: `⏰ ${cant} entrega${cant > 1 ? 's' : ''} para mañana`,
    body:  cant === 1
      ? 'Tenés 1 pedido para entregar mañana. ¡Preparalo hoy!'
      : `Tenés ${cant} pedidos para entregar mañana. Verificá que estén listos.`,
    url: '/pedidos',
  }),
  pagoConfirmado: (cliente: string, monto: number): PushPayload => ({
    title: `✅ Pago de ${cliente}`,
    body:  `${cliente} pagó ${fmt(monto)}. ¡Cobro registrado!`,
    type:  'pago_confirmado',
    url:   '/cobranzas',
  }),
}