'use client'

// src/components/shared/InstalarApp.tsx
// Banner que aparece en mobile cuando la app puede instalarse como PWA.
// Se usa en el DashboardView móvil.

import { useState } from 'react'
import { usePWA } from '@/hooks/usePWA'

interface InstalarAppProps {
  t: {
    surface: string; border: string; surfaceAlt: string
    accent: string; accentText: string
    text: string; textMuted: string; textFaint: string
    amber: string; amberBorder: string; amberSub: string
  }
}

export function InstalarApp({ t }: InstalarAppProps) {
  const { puedeInstalar, instalar, instalada } = usePWA()
  const [descartado, setDescartado] = useState(false)
  const [instalando,  setInstalando]  = useState(false)

  // No mostrar si ya está instalada, fue descartada, o no hay prompt disponible
  if (instalada || descartado || !puedeInstalar) return null

  const handleInstalar = async () => {
    setInstalando(true)
    const aceptado = await instalar()
    if (!aceptado) setInstalando(false)
  }

  return (
    <div style={{
      margin: '0 20px',
      padding: '12px 14px',
      borderRadius: 14,
      background: t.amber,
      border: `1.5px solid ${t.amberBorder}`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Ícono */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: '#141210',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 800, color: '#d4a96a', flexShrink: 0,
      }}>F</div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.amberSub }}>
          Instalá Finti en tu celular
        </div>
        <div style={{ fontSize: 10, color: t.amberSub, opacity: 0.8, marginTop: 1 }}>
          Acceso directo desde tu pantalla de inicio
        </div>
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => setDescartado(true)}
          style={{
            width: 28, height: 28, borderRadius: 8,
            border: `1px solid ${t.amberBorder}`,
            background: 'transparent', color: t.amberSub,
            fontSize: 14, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
        <button
          onClick={handleInstalar}
          disabled={instalando}
          style={{
            padding: '6px 12px', borderRadius: 8,
            border: 'none', background: t.amberSub,
            color: '#fff', fontSize: 11, fontWeight: 700,
            cursor: instalando ? 'not-allowed' : 'pointer',
            opacity: instalando ? 0.7 : 1,
            whiteSpace: 'nowrap' as const,
          }}
        >
          {instalando ? '...' : '⬇ Instalar'}
        </button>
      </div>
    </div>
  )
}