'use client'

// src/app/recuperar-password/page.tsx
// Paso 1: el usuario ingresa su email y le mandamos el link

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function RecuperarPasswordPage() {
  const router = useRouter()
  const { solicitarRecupero } = useAuth()

  const [email,      setEmail]      = useState('')
  const [enviando,   setEnviando]   = useState(false)
  const [enviado,    setEnviado]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [reenviando, setReenviando] = useState(false)
  const [reenviadoOk,setReenviadoOk]= useState(false)

  const puedeEnviar = email.trim().includes('@') && !enviando

  const traducirError = (msg: string): string => {
    if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit'))
      return 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.'
    if (msg.includes('User not found') || msg.includes('invalid'))
      return 'No encontramos una cuenta con ese email.'
    return 'Hubo un error al enviar el email. Intentá de nuevo.'
  }

  const handleEnviar = async () => {
    if (!puedeEnviar) return
    setError(null)
    setEnviando(true)
    try {
      await solicitarRecupero(email.trim())
      setEnviado(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(traducirError(msg))
    } finally {
      setEnviando(false)
    }
  }

  const handleReenviar = async () => {
    if (reenviando) return
    setReenviando(true)
    setReenviadoOk(false)
    try {
      await solicitarRecupero(email.trim())
      setReenviadoOk(true)
      setTimeout(() => setReenviadoOk(false), 4000)
    } catch {
      // silencioso
    } finally {
      setReenviando(false)
    }
  }

  const estiloInput = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid #e8e8e4', fontSize: 14, color: '#111827',
    outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'inherit', background: '#fafaf8',
  }

  // ── Pantalla post-envío ───────────────────────────────────────────────────
  if (enviado) {
    return (
      <div suppressHydrationWarning style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafaf8', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20,
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>

          {/* Ícono */}
          <div style={{
            width: 80, height: 80, borderRadius: 22, background: '#141210',
            border: '1.5px solid #2e2924',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, marginBottom: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>📬</div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', marginBottom: 8 }}>
            Revisá tu email
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 6, lineHeight: 1.5 }}>
            Te enviamos las instrucciones a
          </p>
          <p style={{
            fontSize: 15, fontWeight: 700, color: '#111827',
            padding: '8px 16px', borderRadius: 10,
            background: '#f5f5f2', border: '1px solid #e8e8e4',
            display: 'inline-block', marginBottom: 28,
            wordBreak: 'break-all',
          }}>
            {email}
          </p>

          {/* Instrucciones */}
          <div style={{
            background: '#fff', border: '1px solid #e8e8e4',
            borderRadius: 16, padding: '24px 22px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            marginBottom: 20, textAlign: 'left',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
              ¿Qué tenés que hacer?
            </div>
            {[
              { num: '1', texto: 'Abrí el email que te enviamos desde Finti' },
              { num: '2', texto: 'Hacé clic en "Restablecer mi contraseña"' },
              { num: '3', texto: 'Ingresá tu nueva contraseña y confirmá' },
            ].map(paso => (
              <div key={paso.num} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8, background: '#141210',
                  color: '#d4a96a', fontSize: 12, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  {paso.num}
                </div>
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{paso.texto}</span>
              </div>
            ))}

            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 10,
              background: '#fffbeb', border: '1px solid #fde68a',
              fontSize: 12, color: '#92400e',
            }}>
              💡 El link de recupero expira en <strong>1 hora</strong>. Si no lo encontrás, revisá la carpeta de spam.
            </div>
          </div>

          {/* Reenviar */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 10 }}>
              ¿No te llegó el email?
            </p>
            {reenviadoOk ? (
              <div style={{
                padding: '10px 18px', borderRadius: 10,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                fontSize: 13, color: '#166534', fontWeight: 600,
              }}>
                ✓ Email reenviado correctamente
              </div>
            ) : (
              <button onClick={handleReenviar} disabled={reenviando} style={{
                padding: '10px 24px', borderRadius: 12,
                border: '1.5px solid #e8e8e4', background: '#fff',
                color: '#111827', fontSize: 13, fontWeight: 600,
                cursor: reenviando ? 'wait' : 'pointer', opacity: reenviando ? 0.7 : 1,
              }}>
                {reenviando ? 'Enviando...' : '↺ Reenviar email'}
              </button>
            )}
          </div>

          {/* Volver */}
          <button onClick={() => router.push('/login')} style={{
            background: 'none', border: 'none', color: '#9ca3af',
            fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
          }}>
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario de solicitud ───────────────────────────────────────────────
  return (
    <div suppressHydrationWarning style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: '#141210',
            border: '1.5px solid #2e2924',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#d4a96a', fontSize: 24, fontWeight: 800, marginBottom: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}>F</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>finti</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Recupero de contraseña</div>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '28px 24px',
          border: '1px solid #e8e8e4', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
            ¿Olvidaste tu contraseña?
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 22px', lineHeight: 1.5 }}>
            Ingresá tu email y te mandamos un link para crear una nueva contraseña.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Email de tu cuenta
              </label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleEnviar()}
                placeholder="tu@email.com"
                autoFocus
                style={estiloInput}
                onFocus={e => e.currentTarget.style.borderColor = '#111827'}
                onBlur={e => e.currentTarget.style.borderColor = '#e8e8e4'}
              />
            </div>

            {error && (
              <div style={{
                background: '#fff1f2', border: '1px solid #fecdd3',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 12, color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            <button onClick={() => void handleEnviar()} disabled={!puedeEnviar} style={{
              width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
              background: puedeEnviar ? '#141210' : '#e5e7eb',
              color: puedeEnviar ? '#d4a96a' : '#9ca3af',
              fontSize: 14, fontWeight: 800,
              cursor: !puedeEnviar ? 'not-allowed' : enviando ? 'wait' : 'pointer',
              transition: 'all 0.15s', fontFamily: 'inherit', letterSpacing: '-0.2px',
            }}>
              {enviando ? 'Enviando...' : 'Enviar instrucciones'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button onClick={() => router.push('/login')} style={{
                background: 'none', border: 'none', color: '#9ca3af',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}