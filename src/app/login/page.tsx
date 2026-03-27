'use client'

// src/app/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { signInWithEmail, signUpWithEmail, reenviarConfirmacion, error: authError } = useAuth()

  const [modo, setModo]         = useState<'login' | 'registro'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [negocio, setNegocio]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  // Estado post-registro exitoso con confirmación pendiente
  const [esperandoConfirmacion, setEsperandoConfirmacion] = useState(false)
  const [emailRegistrado, setEmailRegistrado] = useState('')
  const [reenviando, setReenviando] = useState(false)
  const [reenviadoOk, setReenviadoOk] = useState(false)

  const puedeSubmit = email.trim() !== '' && password.trim() !== '' && !submitting

  // Traducir errores de Supabase al español con mensajes claros
  const traducirError = (msg: string | null): string | null => {
    if (!msg) return null
    if (msg.includes('Invalid login credentials'))
      return 'Email o contraseña incorrectos'
    if (msg.includes('Email not confirmed'))
      return 'Todavía no confirmaste tu email. Revisá tu bandeja de entrada (y la carpeta de spam).'
    if (msg.includes('User already registered'))
      return 'Ya existe una cuenta con ese email. Intentá ingresar con tu contraseña.'
    if (msg.includes('Password should be'))
      return 'La contraseña debe tener al menos 6 caracteres'
    if (msg.includes('Email rate limit exceeded'))
      return 'Demasiados intentos. Esperá unos minutos antes de volver a intentar.'
    if (msg.includes('over_email_send_rate_limit'))
      return 'Límite de envíos alcanzado. Esperá unos minutos e intentá de nuevo.'
    return msg
  }

  const handleSubmit = async () => {
    if (!puedeSubmit) return
    setError(null)
    setSubmitting(true)

    try {
      if (modo === 'login') {
        await signInWithEmail(email.trim(), password)
        router.refresh()
        setTimeout(() => router.push('/dashboard'), 100)

      } else {
        // Registro
        if (!negocio.trim()) {
          setError('Ingresá el nombre de tu negocio')
          setSubmitting(false)
          return
        }

        await signUpWithEmail(email.trim(), password, negocio.trim())

        // Si llegamos acá sin error: registro exitoso.
        // Puede ser con o sin confirmación de email según config de Supabase.
        // useAuth internamente sabe si hay sesión o no. Acá detectamos
        // si Supabase requiere confirmación chequeando que no haya redirigido:
        setEmailRegistrado(email.trim())
        setEsperandoConfirmacion(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReenviar = async () => {
    if (!emailRegistrado || reenviando) return
    setReenviando(true)
    setReenviadoOk(false)
    try {
      await reenviarConfirmacion(emailRegistrado)
      setReenviadoOk(true)
      setTimeout(() => setReenviadoOk(false), 4000)
    } catch {
      // silencioso — si el email ya fue confirmado Supabase igual devuelve ok
    } finally {
      setReenviando(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSubmit()
  }

  // ── Pantalla "Revisá tu email" ──────────────────────────────────────────────
  if (esperandoConfirmacion) {
    return (
      <div suppressHydrationWarning style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafaf8', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20,
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>

          {/* Ícono animado */}
          <div style={{
            width: 80, height: 80, borderRadius: 22, background: '#141210',
            border: '1.5px solid #2e2924',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, marginBottom: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            📬
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', marginBottom: 8 }}>
            Revisá tu email
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 6, lineHeight: 1.5 }}>
            Te enviamos un link de confirmación a
          </p>
          <p style={{
            fontSize: 15, fontWeight: 700, color: '#111827',
            padding: '8px 16px', borderRadius: 10,
            background: '#f5f5f2', border: '1px solid #e8e8e4',
            display: 'inline-block', marginBottom: 24,
            wordBreak: 'break-all',
          }}>
            {emailRegistrado}
          </p>

          {/* Card de instrucciones */}
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
              { num: '2', texto: 'Hacé clic en el botón "Confirmar mi cuenta"' },
              { num: '3', texto: 'Vas a quedar logueado automáticamente' },
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

            {/* Tip spam */}
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 10,
              background: '#fffbeb', border: '1px solid #fde68a',
              fontSize: 12, color: '#92400e',
            }}>
              💡 Si no lo encontrás, revisá la carpeta de <strong>spam o correo no deseado</strong>
            </div>
          </div>

          {/* Reenviar email */}
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
              <button
                onClick={handleReenviar}
                disabled={reenviando}
                style={{
                  padding: '10px 24px', borderRadius: 12,
                  border: '1.5px solid #e8e8e4', background: '#fff',
                  color: '#111827', fontSize: 13, fontWeight: 600,
                  cursor: reenviando ? 'wait' : 'pointer',
                  opacity: reenviando ? 0.7 : 1,
                }}>
                {reenviando ? 'Enviando...' : '↺ Reenviar email de confirmación'}
              </button>
            )}
          </div>

          {/* Volver al login */}
          <button
            onClick={() => {
              setEsperandoConfirmacion(false)
              setModo('login')
              setPassword('')
            }}
            style={{
              background: 'none', border: 'none',
              color: '#9ca3af', fontSize: 13,
              cursor: 'pointer', textDecoration: 'underline',
            }}>
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla de login / registro ────────────────────────────────────────────
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
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            {modo === 'login' ? 'Ingresá a tu cuenta' : 'Creá tu cuenta gratis'}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '28px 24px',
          border: '1px solid #e8e8e4', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#f5f5f2', borderRadius: 10, padding: 3, marginBottom: 24 }}>
            {(['login', 'registro'] as const).map(m => (
              <button key={m} onClick={() => { setModo(m); setError(null) }} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: modo === m ? '#fff' : 'transparent',
                color: modo === m ? '#111827' : '#6b7280',
                fontWeight: modo === m ? 700 : 400, fontSize: 13,
                boxShadow: modo === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}>
                {m === 'login' ? 'Ingresar' : 'Registrarse'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Campo negocio (solo en registro) */}
            {modo === 'registro' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Nombre del negocio
                </label>
                <input
                  type="text" value={negocio}
                  onChange={e => setNegocio(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ej: Panadería El Sol"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    border: '1.5px solid #e8e8e4', fontSize: 14, color: '#111827',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafaf8',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#111827'}
                  onBlur={e => e.currentTarget.style.borderColor = '#e8e8e4'}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="tu@email.com"
                autoComplete="email"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1.5px solid #e8e8e4', fontSize: 14, color: '#111827',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafaf8',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#111827'}
                onBlur={e => e.currentTarget.style.borderColor = '#e8e8e4'}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                  style={{
                    width: '100%', padding: '11px 40px 11px 14px', borderRadius: 10,
                    border: '1.5px solid #e8e8e4', fontSize: 14, color: '#111827',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafaf8',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#111827'}
                  onBlur={e => e.currentTarget.style.borderColor = '#e8e8e4'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', fontSize: 14, padding: 4,
                  }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10,
                padding: '10px 14px', fontSize: 12, color: '#dc2626',
              }}>
                {traducirError(error)}
                {/* Si el error es "email no confirmado", mostrar botón de reenvío */}
                {error.includes('Email not confirmed') && (
                  <button
                    onClick={async () => {
                      setEmailRegistrado(email.trim())
                      setEsperandoConfirmacion(true)
                    }}
                    style={{
                      display: 'block', marginTop: 8, fontSize: 11, fontWeight: 700,
                      color: '#dc2626', background: 'none', border: 'none',
                      cursor: 'pointer', padding: 0, textDecoration: 'underline',
                    }}>
                    Ver instrucciones de confirmación →
                  </button>
                )}
              </div>
            )}

            {/* Botón submit */}
            <button
              onClick={() => void handleSubmit()}
              disabled={!puedeSubmit}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                background: puedeSubmit ? '#141210' : '#e5e7eb',
                color: puedeSubmit ? '#d4a96a' : '#9ca3af',
                fontSize: 14, fontWeight: 800,
                cursor: !puedeSubmit ? 'not-allowed' : submitting ? 'wait' : 'pointer',
                marginTop: 4, transition: 'all 0.15s', fontFamily: 'inherit', letterSpacing: '-0.2px',
              }}>
              {submitting
                ? 'Un momento...'
                : modo === 'login' ? 'Ingresar' : 'Crear cuenta gratis'
              }
            </button>

            {/* Link recupero contraseña */}
            {modo === 'login' && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => router.push('/recuperar-password')}
                  style={{
                    background: 'none', border: 'none', color: '#9ca3af',
                    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#9ca3af' }}>
          Al continuar aceptás los términos de uso de Finti
        </div>
      </div>
    </div>
  )
}