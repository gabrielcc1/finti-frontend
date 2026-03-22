'use client'

// src/components/shared/MenuMas.tsx
// Menú "Más" del bottom nav mobile — compartido entre todos los módulos.
// Uso: <MenuMas t={t} dark={dark} />

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Tema {
  surface: string
  surfaceAlt: string
  border: string
  text: string
  textMuted: string
  textFaint: string
  accent: string
  accentText: string
  amber: string
  amberBorder: string
  amberSub: string
  green: string
  greenBorder: string
  greenText: string
  shadowMd: string
  navBg: string
}

interface MenuMasProps {
  t: Tema
  dark: boolean
  // Módulo activo actual (para no resaltarlo como si fuera destino)
  moduloActivo?: string
}

export function MenuMas({ t, dark, moduloActivo }: MenuMasProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const ir = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Botón ≋ Más en el bottom nav */}
      <div
        onClick={() => setOpen(true)}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}
      >
        <div style={{ fontSize: 18, color: t.textFaint }}>≋</div>
        <div style={{ fontSize: 9, color: t.textFaint, fontWeight: 400 }}>Más</div>
      </div>

      {/* Overlay + sheet */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: '22px 22px 0 0',
              padding: '20px 20px 36px',
              width: '100%',
              boxShadow: t.shadowMd,
              animation: 'popIn 0.18s ease',
            }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border, margin: '0 auto 18px' }} />
            <div style={{ fontSize: 13, fontWeight: 800, color: t.text, marginBottom: 14 }}>Módulos</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

              <button onClick={() => ir('/clientes')}
                style={{ padding: '13px 12px', borderRadius: 13, border: `1px solid ${t.border}`, background: t.surfaceAlt, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' as const }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>👥</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>Clientes</div>
                  <div style={{ fontSize: 10, color: t.textMuted }}>Base de datos</div>
                </div>
              </button>

              <button onClick={() => ir('/pedidos')}
                style={{ padding: '13px 12px', borderRadius: 13, border: `1px solid ${t.border}`, background: t.surfaceAlt, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' as const }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>📦</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>Pedidos</div>
                  <div style={{ fontSize: 10, color: t.textMuted }}>Entregas</div>
                </div>
              </button>

              <button onClick={() => ir('/costos')}
                style={{ padding: '13px 12px', borderRadius: 13, border: `1px solid ${t.amberBorder}`, background: t.amber, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' as const }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>💸</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.amberSub }}>Costos</div>
                  <div style={{ fontSize: 10, color: t.amberSub, opacity: 0.75 }}>Rentabilidad</div>
                </div>
              </button>

              <button onClick={() => ir('/contable')}
                style={{ padding: '13px 12px', borderRadius: 13, border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' as const }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>📊</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>Contable</div>
                  <div style={{ fontSize: 10, color: '#1d4ed8', opacity: 0.75 }}>Estados</div>
                </div>
              </button>

              <button onClick={() => ir('/personal')}
                style={{ padding: '13px 12px', borderRadius: 13, border: `1px solid ${t.greenBorder}`, background: t.green, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' as const }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>◉</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.greenText }}>Personal</div>
                  <div style={{ fontSize: 10, color: t.greenText, opacity: 0.75 }}>Mis finanzas</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{ marginTop: 14, width: '100%', padding: '12px', borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}