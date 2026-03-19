// public/sw.js
// Service Worker de Finti — cache básico para funcionamiento offline
// Estrategia: Cache First para assets estáticos, Network First para datos

const CACHE_NAME = 'finti-v1'
const CACHE_STATIC = 'finti-static-v1'

// Assets que se cachean en la instalación (shell de la app)
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

// ── Instalación: pre-cachear assets estáticos ─────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      console.log('[SW] Pre-cacheando assets...')
      // No falla si algún asset no está disponible
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => null))
      )
    }).then(() => self.skipWaiting())
  )
})

// ── Activación: limpiar caches viejos ────────────────────────────────────────
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

// ── Fetch: estrategia por tipo de request ────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requests de Supabase y APIs externas (siempre online)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.com') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return // dejar pasar al network sin interceptar
  }

  // Ignorar requests que no son GET
  if (request.method !== 'GET') return

  // Para navegación (HTML pages): Network First con fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline') || caches.match('/dashboard'))
    )
    return
  }

  // Para assets estáticos (JS, CSS, imágenes, fuentes): Cache First
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

// ── Push Notifications (preparado para el futuro) ────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Finti', body: event.data.text() }
  }

  const options = {
    body:    data.body ?? 'Tenés notificaciones nuevas',
    icon:    '/icons/icon-192x192.png',
    badge:   '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag:     data.tag ?? 'finti-notification',
    data:    { url: data.url ?? '/dashboard' },
    actions: data.actions ?? [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Finti', options)
  )
})

// Click en notificación → navegar a la URL correspondiente
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const existing = windowClients.find(c => c.url.includes(url) && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})