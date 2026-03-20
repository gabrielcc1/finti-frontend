'use client'

// src/components/shared/MenuMas.tsx
// Menú "Más" para el bottom nav mobile — compatible con el tema de cualquier módulo.
// Se extrajo acá para evitar dependencias cruzadas entre módulos y errores de tipos.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Solo las propiedades que MenuMas realmente necesita.
// Así es compatible con el tema de StockView, CostosView, VentasView, etc.
interface TemaMinimo {
  surface:    string
  surfaceAlt: string
  border:     string
  text:       string
  textMuted:  string
  textFaint:  string
  accent:     string
  accentText: string
  green:      string
  greenBorder: string
  amber:      string
  amberSub:   string
  shadowMd?:  string  // opcional — no todos los temas lo tienen con ese nombre
}

interface MenuMasProps {
  t:    TemaMinimo
  dark: boolean
}

export function MenuMas({ t, dark }: MenuMasProps) {
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()

  const shadowMd = t.shadowMd ?? '0 4px 16px rgba(0,0,0,0.12)'

  return (
    <>
      {/* Botón del nav */}
      <div
        onClick={() => setShowMenu(true)}
        style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, cursor:'pointer' }}>
        <div style={{ fontSize:18, color:t.textFaint }}>≋</div>
        <div style={{ fontSize:9, color:t.textFaint, fontWeight:400 }}>Más</div>
      </div>

      {/* Sheet modal */}
      {showMenu && (
        <div
          style={{
            position:'fixed', inset:0, zIndex:1000,
            background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)',
            display:'flex', alignItems:'flex-end', justifyContent:'center',
          }}
          onClick={() => setShowMenu(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: '22px 22px 0 0',
              padding: '20px 20px 36px',
              maxWidth: 480,
              width: '100%',
              boxShadow: shadowMd,
              animation: 'popIn 0.18s ease',
            }}
          >
            {/* Handle visual */}
            <div style={{ width:36, height:4, borderRadius:2, background:t.border, margin:'0 auto 18px' }} />

            <div style={{ fontSize:14, fontWeight:800, color:t.text, marginBottom:14 }}>
              Módulos adicionales
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { label:'💸 Costos',   href:'/costos',    bg:t.amber,      color:t.amberSub         },
                { label:'📊 Contable', href:'/contable',  bg:'#1d4ed8',    color:'#ffffff'           },
                { label:'👤 Personal', href:'/personal',  bg:t.green,      color: dark ? '#4ade80' : '#166534' },
                { label:'📦 Pedidos',  href:'/pedidos',   bg:t.surfaceAlt, color:t.text              },
                { label:'🛒 Ventas',   href:'/ventas',    bg:t.surfaceAlt, color:t.text              },
                { label:'◎ Cobros',    href:'/cobranzas', bg:t.surfaceAlt, color:t.text              },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { setShowMenu(false); router.push(item.href) }}
                  style={{
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: item.bg,
                    color: item.color,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    fontFamily: 'inherit',
                  }}
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={() => setShowMenu(false)}
                style={{
                  marginTop: 4,
                  padding: '11px',
                  borderRadius: 12,
                  border: `1.5px solid ${t.border}`,
                  background: t.surfaceAlt,
                  color: t.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </>
  )
}