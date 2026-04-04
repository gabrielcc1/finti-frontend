'use client'

// src/components/perfil/NotificacionesSection.tsx
import { useState } from 'react'
import { useNotificaciones } from '@/hooks/useNotificaciones'

// Tipo mínimo del tema — compatible con el tema de PerfilView
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tema = any

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, sub, disabled = false, t }: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
  sub?: string
  disabled?: boolean
  t: Tema
}) {
  return (
    <div
      onClick={() => !disabled && onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '11px 0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>{sub}</div>}
      </div>
      {/* Pill toggle */}
      <div style={{
        width: 42, height: 24, borderRadius: 12, flexShrink: 0,
        background: value ? t.accent : t.border,
        position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          left: value ? 21 : 3, transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }} />
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function NotificacionesSection({ t }: { t: Tema }) {
  const notif = useNotificaciones()
  const [pruebaOk,  setPruebaOk]  = useState(false)
  const [exitoMsg,  setExitoMsg]  = useState<string | null>(null)

  const handleActivar = async () => {
    const ok = await notif.suscribirse()
    if (ok) {
      setExitoMsg('¡Notificaciones activadas! Te avisaremos cuando tengas cobros o pedidos del día.')
      setTimeout(() => setExitoMsg(null), 4000)
    }
  }

  const handleDesactivar = async () => {
    await notif.desuscribirse()
    setExitoMsg('Notificaciones desactivadas en este dispositivo.')
    setTimeout(() => setExitoMsg(null), 3000)
  }

  const handlePrueba = async () => {
    await notif.probarNotificacion()
    if (!notif.error) {
      setPruebaOk(true)
      setTimeout(() => setPruebaOk(false), 3000)
    }
  }

  // Cargando
  if (notif.loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 42, borderRadius: 9, background: t.surfaceAlt }} />
        ))}
      </div>
    )
  }

  // Navegador sin soporte
  if (!notif.soportado) {
    return (
      <div style={{
        padding: '16px', borderRadius: 12,
        background: t.surfaceAlt, border: `1px solid ${t.border}`,
        textAlign: 'center' as const,
      }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>😕</div>
        <div style={{ fontSize: 13, color: t.textMuted }}>
          Tu navegador no soporta notificaciones push.
        </div>
        <div style={{ fontSize: 11, color: t.textFaint, marginTop: 4 }}>
          Usá Chrome, Edge o Safari en iOS 16.4+ para activarlas.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Estado + botón principal ──────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '13px 16px', borderRadius: 12,
        background: notif.suscripto ? t.green : t.surfaceAlt,
        border: `1.5px solid ${notif.suscripto ? t.greenBorder : t.border}`,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
            {notif.suscripto ? '🔔 Activas en este dispositivo' : '🔕 Desactivadas'}
          </div>
          <div style={{ fontSize: 11, color: t.textFaint, marginTop: 3 }}>
            {notif.suscripto
              ? 'Recibirás alertas de cobros y pedidos del día'
              : 'Activá para no perderte ningún cobro ni entrega'}
          </div>
        </div>

        {notif.suscripto ? (
          <button
            onClick={handleDesactivar}
            disabled={notif.saving}
            style={{
              padding: '7px 14px', borderRadius: 9,
              border: `1.5px solid ${t.redBorder}`,
              background: t.red, color: t.redNum,
              fontSize: 11, fontWeight: 700,
              cursor: notif.saving ? 'wait' : 'pointer',
              flexShrink: 0, opacity: notif.saving ? 0.7 : 1,
            }}
          >
            {notif.saving ? '...' : 'Desactivar'}
          </button>
        ) : (
          <button
            onClick={handleActivar}
            disabled={notif.saving || notif.permiso === 'denied'}
            style={{
              padding: '7px 16px', borderRadius: 9,
              border: 'none', background: t.accent, color: t.accentText,
              fontSize: 11, fontWeight: 700,
              cursor: (notif.saving || notif.permiso === 'denied') ? 'not-allowed' : 'pointer',
              flexShrink: 0, opacity: notif.saving ? 0.7 : 1,
              whiteSpace: 'nowrap' as const,
            }}
          >
            {notif.saving ? 'Activando...' : '🔔 Activar'}
          </button>
        )}
      </div>

      {/* ── Permiso bloqueado ────────────────────────────────────── */}
      {notif.permiso === 'denied' && (
        <div style={{
          padding: '12px 14px', borderRadius: 11,
          background: t.amber, border: `1px solid ${t.amberBorder}`,
          fontSize: 12, color: t.amberSub,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 5 }}>⚠️ Permiso bloqueado en el navegador</div>
          <div>1. Hacé clic en el candado 🔒 en la barra de dirección</div>
          <div>2. Buscá &quot;Notificaciones&quot; → Permitir</div>
          <div>3. Recargá la página</div>
        </div>
      )}

      {/* ── Mensajes de éxito / error ────────────────────────────── */}
      {exitoMsg && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: t.green, border: `1px solid ${t.greenBorder}`,
          fontSize: 12, color: t.greenText, fontWeight: 600,
        }}>
          ✓ {exitoMsg}
        </div>
      )}
      {notif.error && !exitoMsg && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: t.red, border: `1px solid ${t.redBorder}`,
          fontSize: 12, color: t.redNum,
        }}>
          ✕ {notif.error}
        </div>
      )}

      {/* ── Preferencias (solo si está suscripto) ────────────────── */}
      {notif.suscripto && notif.preferencias && (
        <>
          {/* Canales */}
          <div style={{
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 12, padding: '12px 16px',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: t.textMuted,
              textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 2,
            }}>
              Canales
            </div>
            <Toggle
              value={notif.preferencias.canal_push}
              onChange={v => notif.guardarPreferencias({ canal_push: v })}
              label="📱 Push (este dispositivo)"
              sub="Alertas instantáneas en el celular o PC"
              disabled={notif.saving}
              t={t}
            />
            <div style={{ height: 1, background: t.border }} />
            <Toggle
              value={notif.preferencias.canal_whatsapp}
              onChange={v => notif.guardarPreferencias({ canal_whatsapp: v })}
              label="💬 WhatsApp"
              sub="Resúmenes por WhatsApp (próximamente)"
              disabled={notif.saving}
              t={t}
            />
            <div style={{ height: 1, background: t.border }} />
            <Toggle
              value={notif.preferencias.canal_email}
              onChange={v => notif.guardarPreferencias({ canal_email: v })}
              label="📧 Email"
              sub="Resúmenes semanales por email"
              disabled={notif.saving}
              t={t}
            />
          </div>

          {/* Horario del resumen */}
          <div style={{
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                Horario del resumen diario
              </div>
              <div style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>
                Cuotas y pedidos del día llegan a esta hora
              </div>
            </div>
            {/* Hora fija - Cuadradito estático 08:00 AM */}
<div style={{
  padding: '10px 16px',
  borderRadius: 10,
  border: `2px solid ${t.border}`,
  background: t.surfaceAlt,
  color: t.text,
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'monospace',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  boxShadow: t.shadow,
}}>
  ⏰ 08:00 AM
</div>
          </div>

          {/* Qué notificaciones recibís */}
          <div style={{
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 12, padding: '12px 16px',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: t.textMuted,
              textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 10,
            }}>
              Qué notificaciones recibís
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                ['⏰', 'Cuotas que vencen hoy',  'Cada mañana si hay cobros del día'],
                ['🚨', 'Cuotas vencidas',         'Seguimiento diario de morosos'],
                ['📦', 'Pedidos del día',          'Recordatorio de entregas programadas'],
                ['✅', 'Pago confirmado',           'Al registrar un cobro desde la app'],
              ] as const).map(([emoji, titulo, desc]) => (
                <div key={titulo} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{emoji}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{titulo}</div>
                    <div style={{ fontSize: 10, color: t.textFaint }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botón de prueba */}
          <button
            onClick={handlePrueba}
            disabled={notif.saving || pruebaOk}
            style={{
              padding: '11px 0', borderRadius: 10,
              border: `1.5px solid ${t.border}`,
              background: t.surfaceAlt, color: t.textMuted,
              fontSize: 12, fontWeight: 700,
              cursor: notif.saving ? 'wait' : 'pointer',
              opacity: notif.saving ? 0.7 : 1,
            }}
          >
            {pruebaOk
              ? '✓ Prueba enviada — revisá tu dispositivo'
              : notif.saving
              ? 'Enviando...'
              : '🔔 Enviar notificación de prueba'}
          </button>
        </>
      )}
    </div>
  )
}