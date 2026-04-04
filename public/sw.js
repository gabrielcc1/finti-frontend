// public/sw.js
// Service Worker de Finti — cache offline + push notifications completas
// v2.0 — agrega notificaciones ricas con acciones y tipos

const CACHE_NAME = 'finti-v1'
const CACHE_STATIC = 'finti-static-v1'

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/ventas',
  '/cobranzas',
  '/pedidos',
  '/stock',
  '/offline',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
]

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => null))
      )
    }).then(() => self.skipWaiting())
  )
})

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== CACHE_STATIC)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.com') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) return

  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline') || caches.match('/dashboard'))
    )
    return
  }

  if (
    url.pathname.includes('/_next/static/') ||
    url.pathname.includes('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webp') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_STATIC).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }
})

// ── Push: notificaciones ricas por tipo ───────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Finti', body: event.data.text(), type: 'general' }
  }

  const tipo = data.type || 'general'

  const configs = {
    cuota_vence_hoy: {
      tag:                'cuotas-hoy',
      vibrate:            [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'abrir',  title: '💰 Ver cobros' },
        { action: 'cerrar', title: 'Después' },
      ],
    },
    cuota_vencida: {
      tag:                'cuotas-vencidas',
      vibrate:            [300, 100, 300, 100, 300],
      requireInteraction: true,
      actions: [
        { action: 'abrir',  title: '🚨 Ver morosos' },
        { action: 'cerrar', title: 'Ignorar' },
      ],
    },
    pedido_entrega_hoy: {
      tag:                'pedidos-hoy',
      vibrate:            [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'abrir',  title: '📦 Ver pedidos' },
        { action: 'cerrar', title: 'Después' },
      ],
    },
    pago_confirmado: {
      tag:                'pago-' + Date.now(),
      vibrate:            [100, 50, 100],
      requireInteraction: false,
      actions:            [],
    },
    stock_critico: {
      tag:                'stock-critico',
      vibrate:            [200, 100, 200],
      requireInteraction: false,
      actions: [
        { action: 'abrir', title: '📦 Ver stock' },
      ],
    },
    general: {
      tag:                'finti-general',
      vibrate:            [200, 100, 200],
      requireInteraction: false,
      actions:            [],
    },
  }

  const cfg = configs[tipo] || configs.general

  const options = {
    body:               data.body || 'Tenés notificaciones nuevas',
    icon:               '/icons/icon-192x192.png',
    badge:              '/icons/icon-96x96.png',
    vibrate:            cfg.vibrate,
    tag:                cfg.tag,
    renotify:           true,
    requireInteraction: cfg.requireInteraction,
    actions:            cfg.actions,
    data: {
      url:  data.url || '/dashboard',
      type: tipo,
    },
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Finti', options)
  )
})

// ── NotificationClick ─────────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  if (event.action === 'cerrar') return

  const { url } = event.notification.data || {}
  const destino = url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        const clientUrl = new URL(client.url)
        if (clientUrl.origin === self.location.origin && 'focus' in client) {
          client.focus()
          return client.navigate(destino)
        }
      }
      return clients.openWindow(destino)
    })
  )
})

// ── PushSubscriptionChange: renovar si expira ─────────────────────────────────
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly:      true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then(newSub => fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscription: newSub, renewed: true }),
      }))
      .catch(err => console.error('[SW] Error renovando suscripción:', err))
  )
})