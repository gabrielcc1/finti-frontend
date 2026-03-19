'use client'

// src/hooks/usePWA.ts
// Maneja el registro del Service Worker y el prompt de instalación de la PWA.
// Uso: const { puedeInstalar, instalar, instalada } = usePWA()

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const [promptEvent,  setPromptEvent]  = useState<BeforeInstallPromptEvent | null>(null)
  const [puedeInstalar, setPuedeInstalar] = useState(false)
  const [instalada,    setInstalada]    = useState(false)
  const [swRegistrado, setSwRegistrado] = useState(false)

  useEffect(() => {
    // Detectar si ya está instalada como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalada(true)
    }

    // Capturar el evento de instalación antes que el browser lo descarte
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
      setPuedeInstalar(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Detectar cuando se instala
    window.addEventListener('appinstalled', () => {
      setInstalada(true)
      setPuedeInstalar(false)
      setPromptEvent(null)
    })

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('[SW] Registrado:', reg.scope)
          setSwRegistrado(true)
        })
        .catch(err => console.warn('[SW] Error al registrar:', err))
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const instalar = useCallback(async () => {
    if (!promptEvent) return false
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setPuedeInstalar(false)
      setPromptEvent(null)
    }
    return outcome === 'accepted'
  }, [promptEvent])

  return { puedeInstalar, instalar, instalada, swRegistrado }
}