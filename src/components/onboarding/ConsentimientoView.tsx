'use client'

// src/components/onboarding/ConsentimientoView.tsx
// Pantalla de consentimiento que aparece UNA SOLA VEZ durante el onboarding.
// Bloquea el acceso hasta que el usuario acepta los términos.

import { useState } from 'react'
import type { useConsentimiento } from '@/hooks/useConsentimiento'

interface ConsentimientoViewProps {
  consentimiento: ReturnType<typeof useConsentimiento>
  onAceptado: () => void
  usuarioNombre?: string
}

const SECCIONES = [
  {
    icono: '🔒',
    titulo: 'Tus datos son tuyos',
    texto: 'Toda la información que cargás en Finti — tus clientes, ventas, cobros y pedidos — es estrictamente tuya. No la compartimos, no la vendemos ni la cedemos a terceros bajo ninguna circunstancia.',
  },
  {
    icono: '⚖️',
    titulo: 'No entregamos datos a entes reguladores',
    texto: 'Finti no está obligada ni autorizada a entregar información a ningún organismo de control. Somos una herramienta de gestión privada, no una entidad financiera ni intermediaria de pagos.',
  },
  {
    icono: '💡',
    titulo: 'No manejamos dinero real',
    texto: 'Finti es exclusivamente una herramienta de gestión para emprendedores. No procesamos pagos, no movemos fondos, no emitimos instrumentos financieros ni actuamos como billetera digital. Los montos que registrás son solo información de gestión.',
  },
  {
    icono: '🛡️',
    titulo: 'Seguridad de tu información',
    texto: 'Tu información se almacena con cifrado de nivel bancario en servidores seguros. Podés solicitar la eliminación total de tus datos en cualquier momento escribiéndonos.',
  },
]

export function ConsentimientoView({ consentimiento, onAceptado, usuarioNombre }: ConsentimientoViewProps) {
  const [leido,          setLeido]          = useState(false)
  const [scrollLlegado,  setScrollLlegado]  = useState(false)
  const [seccionActiva,  setSeccionActiva]  = useState(0)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const llegadoAlFinal = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    if (llegadoAlFinal) setScrollLlegado(true)
  }

  const handleAceptar = async () => {
    if (!leido) return
    const ok = await consentimiento.aceptarTerminos()
    if (ok) onAceptado()
  }

  return (
    <div suppressHydrationWarning style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0e0c0a',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Fondo decorativo */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(212,169,106,0.12) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'radial-gradient(ellipse 60% 40% at 50% 110%, rgba(212,169,106,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulseGold {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,169,106,0.3); }
          50%       { box-shadow: 0 0 0 8px rgba(212,169,106,0); }
        }
        .consentimiento-card {
          animation: fadeUp 0.5s ease both;
        }
        .seccion-item {
          animation: fadeUp 0.4s ease both;
        }
        .seccion-item:nth-child(1) { animation-delay: 0.1s; }
        .seccion-item:nth-child(2) { animation-delay: 0.2s; }
        .seccion-item:nth-child(3) { animation-delay: 0.3s; }
        .seccion-item:nth-child(4) { animation-delay: 0.4s; }
        .btn-aceptar-active:hover {
          background: #c9943a !important;
          transform: translateY(-1px);
        }
        .btn-aceptar-active:active {
          transform: translateY(0px);
        }
      `}</style>

      {/* Card principal */}
      <div className="consentimiento-card" style={{
        width: '100%',
        maxWidth: 520,
        background: '#1a1714',
        border: '1px solid #2e2924',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,169,106,0.08)',
      }}>

        {/* Header */}
        <div style={{
          padding: '32px 32px 24px',
          borderBottom: '1px solid #2e2924',
          background: 'linear-gradient(180deg, #1e1b17 0%, #1a1714 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Shimmer decorativo en el header */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(212,169,106,0.6), transparent)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            {/* Logo */}
            <div style={{
              width: 44, height: 44, borderRadius: 13,
              background: '#141210',
              border: '1.5px solid #2e2924',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: '#d4a96a',
              flexShrink: 0,
            }}>F</div>
            <div>
              <div style={{ fontSize: 11, color: '#5a5044', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
                Finti · Términos de uso
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#e8e0d4', letterSpacing: '-0.4px', marginTop: 2 }}>
                {usuarioNombre ? `Hola, ${usuarioNombre} 👋` : 'Antes de empezar'}
              </div>
            </div>
          </div>

          <p style={{
            fontSize: 13, color: '#7a6e62', lineHeight: 1.65,
            margin: 0, fontWeight: 400,
          }}>
            Queremos que uses Finti con total tranquilidad. Leé brevemente cómo tratamos tu información antes de continuar.
          </p>
        </div>

        {/* Secciones scrolleables */}
        <div
          onScroll={handleScroll}
          style={{
            maxHeight: 340,
            overflowY: 'auto',
            padding: '20px 28px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#2e2924 transparent',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SECCIONES.map((s, i) => (
              <div
                key={i}
                className="seccion-item"
                onClick={() => setSeccionActiva(seccionActiva === i ? -1 : i)}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${seccionActiva === i ? '#3d3010' : '#252019'}`,
                  background: seccionActiva === i ? '#1f1a0e' : 'transparent',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header de sección */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: seccionActiva === i ? '#2a2010' : '#211e1b',
                    border: `1px solid ${seccionActiva === i ? '#3d3010' : '#2e2924'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}>
                    {s.icono}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: seccionActiva === i ? '#d4a96a' : '#c8bfb0',
                      letterSpacing: '-0.2px',
                      transition: 'color 0.2s ease',
                    }}>
                      {s.titulo}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 12, color: '#4a4238',
                    transform: seccionActiva === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }}>▼</div>
                </div>

                {/* Cuerpo expandible */}
                {seccionActiva === i && (
                  <div style={{
                    padding: '0 14px 14px 60px',
                    fontSize: 12, color: '#7a6e62', lineHeight: 1.7,
                    animation: 'fadeUp 0.2s ease',
                  }}>
                    {s.texto}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Versión y fecha */}
          <div style={{
            marginTop: 16, paddingTop: 14,
            borderTop: '1px solid #252019',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 10, color: '#3a3530', fontFamily: 'monospace' }}>
              Versión 1.0 · Abril 2026
            </span>
            <span style={{ fontSize: 10, color: '#3a3530' }}>
              Argentina · Ley 25.326
            </span>
          </div>
        </div>

        {/* Footer con checkbox y botón */}
        <div style={{
          padding: '20px 28px 28px',
          borderTop: '1px solid #252019',
          background: '#161310',
        }}>

          {/* Checkbox de confirmación */}
          <div
            onClick={() => {
              if (!scrollLlegado) {
                // Si no scrolleó, igual permitimos el check (UX amigable en mobile)
                setScrollLlegado(true)
              }
              setLeido(!leido)
            }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              marginBottom: 16, cursor: 'pointer',
              padding: '12px 14px',
              borderRadius: 11,
              border: `1.5px solid ${leido ? '#3d3010' : '#252019'}`,
              background: leido ? '#1a150a' : 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: `2px solid ${leido ? '#d4a96a' : '#3a3530'}`,
              background: leido ? '#d4a96a' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
              animation: leido ? 'pulseGold 0.4s ease' : 'none',
            }}>
              {leido && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4L4 7.5L10 1" stroke="#141210" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{
              fontSize: 12, lineHeight: 1.6,
              color: leido ? '#c8bfb0' : '#5a5044',
              transition: 'color 0.2s ease',
            }}>
              Leí y entiendo los términos de uso de Finti. Comprendo que es una herramienta de gestión, que no maneja dinero real y que mis datos están protegidos.
            </span>
          </div>

          {/* Botón aceptar */}
          <button
            onClick={handleAceptar}
            disabled={!leido || consentimiento.guardando}
            className={leido && !consentimiento.guardando ? 'btn-aceptar-active' : ''}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 13,
              border: 'none',
              background: leido ? '#d4a96a' : '#252019',
              color: leido ? '#141210' : '#3a3530',
              fontSize: 14,
              fontWeight: 800,
              cursor: leido && !consentimiento.guardando ? 'pointer' : 'not-allowed',
              letterSpacing: '-0.2px',
              transition: 'all 0.2s ease',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {consentimiento.guardando ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid #141210',
                  borderTopColor: 'transparent',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Guardando...
              </span>
            ) : (
              leido ? '✓ Acepto y quiero usar Finti' : 'Aceptá los términos para continuar'
            )}
            {/* Shimmer cuando está activo */}
            {leido && !consentimiento.guardando && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
                animation: 'shimmer 2.5s infinite',
              }} />
            )}
          </button>

          {/* Error si falla el guardado */}
          {consentimiento.error && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 9,
              background: '#1f0e0e', border: '1px solid #3d1010',
              fontSize: 11, color: '#f87171', textAlign: 'center',
            }}>
              ✕ {consentimiento.error} — Intentá de nuevo
            </div>
          )}

          {/* Nota legal */}
          <p style={{
            fontSize: 10, color: '#3a3530', textAlign: 'center',
            margin: '12px 0 0', lineHeight: 1.5,
          }}>
            Al aceptar confirmás haber leído la política de privacidad de Finti.<br />
            Podés solicitar la eliminación de tus datos en cualquier momento.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2e2924; border-radius: 4px; }
      `}</style>
    </div>
  )
}