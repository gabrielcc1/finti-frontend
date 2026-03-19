'use client'

// src/app/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  // authLoading es el loading de verificación de sesión — NO lo usamos para el botón
  const { signInWithEmail, signUpWithEmail, error: authError } = useAuth()

  const [modo, setModo]         = useState<'login' | 'registro'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [negocio, setNegocio]   = useState('')
  const [submitting, setSubmitting] = useState(false)  // estado propio del submit
  const [error, setError]       = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  const puedeSubmit = email.trim() !== '' && password.trim() !== '' && !submitting

 const handleSubmit = async () => {
    if (!puedeSubmit) return
    setError(null)
    setSubmitting(true)
    
    console.log("Intentando login para:", email.trim()) // LOG 1

    // ... dentro de handleSubmit
try {
  if (modo === 'login') {
    const result = await signInWithEmail(email.trim(), password)
    console.log("Resultado de signIn:", result)
  } else {
    if (!negocio.trim()) { setError('Ingresá el nombre de tu negocio'); setSubmitting(false); return }
    await signUpWithEmail(email.trim(), password, negocio.trim())
  }

  console.log("Login exitoso, refrescando y redirigiendo...")
  
  // 1. Refrescamos para que el navegador "asiente" la cookie
  router.refresh() 
  
  // 2. Pequeña espera para asegurar que el proceso de escritura de cookie termine
  setTimeout(() => {
    router.push('/dashboard')
  }, 100)

   } catch (err: any) {
      console.error("Error capturado en handleSubmit:", err) // LOG ERROR
      setError(err?.message || 'Error desconocido')
    } finally {
      // IMPORTANTE: Si la redirección funciona, la página se muere antes de llegar acá.
      // Si el botón vuelve a decir "Ingresar", es porque llegó al finally.
      setSubmitting(false) 
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSubmit()
  }

  // Traducir errores de Supabase al español
  const mensajeError = (msg: string | null) => {
    if (!msg) return null
    if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos'
    if (msg.includes('Email not confirmed'))       return 'Confirmá tu email antes de ingresar'
    if (msg.includes('User already registered'))   return 'Ya existe una cuenta con ese email'
    if (msg.includes('Password should be'))        return 'La contraseña debe tener al menos 6 caracteres'
    return msg
  }

  return (
    <div suppressHydrationWarning style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo — F dorada sobre fondo oscuro, consistente con la app */}
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
                fontWeight: modo === m ? 700 : 400,
                fontSize: 13,
                boxShadow: modo === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}>
                {m === 'login' ? 'Ingresar' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* Campos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {modo === 'registro' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Nombre del negocio
                </label>
                <input
                  type="text"
                  value={negocio}
                  onChange={e => setNegocio(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ej: Panadería El Sol"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    border: '1.5px solid #e8e8e4', fontSize: 14, color: '#111827',
                    outline: 'none', boxSizing: 'border-box' as const,
                    fontFamily: 'inherit', background: '#fafaf8',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#111827'}
                  onBlur={e => e.currentTarget.style.borderColor = '#e8e8e4'}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="tu@email.com"
                autoComplete="email"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1.5px solid #e8e8e4', fontSize: 14, color: '#111827',
                  outline: 'none', boxSizing: 'border-box' as const,
                  fontFamily: 'inherit', background: '#fafaf8',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#111827'}
                onBlur={e => e.currentTarget.style.borderColor = '#e8e8e4'}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                  style={{
                    width: '100%', padding: '11px 40px 11px 14px', borderRadius: 10,
                    border: '1.5px solid #e8e8e4', fontSize: 14, color: '#111827',
                    outline: 'none', boxSizing: 'border-box' as const,
                    fontFamily: 'inherit', background: '#fafaf8',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#111827'}
                  onBlur={e => e.currentTarget.style.borderColor = '#e8e8e4'}
                />
                {/* Toggle ver contraseña */}
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', fontSize: 14, padding: 4,
                  }}
                >
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
                {mensajeError(error)}
              </div>
            )}

            {/* Botón submit — usa submitting propio, NO el loading del hook */}
            <button
              onClick={() => void handleSubmit()}
              disabled={!puedeSubmit}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                background: puedeSubmit ? '#141210' : '#e5e7eb',
                color: puedeSubmit ? '#d4a96a' : '#9ca3af',
                fontSize: 14, fontWeight: 800,
                cursor: !puedeSubmit ? 'not-allowed' : submitting ? 'wait' : 'pointer',
                marginTop: 4, transition: 'all 0.15s',
                fontFamily: 'inherit',
                letterSpacing: '-0.2px',
              }}
            >
              {submitting
                ? 'Un momento...'
                : modo === 'login' ? 'Ingresar' : 'Crear cuenta gratis'
              }
            </button>

            {/* Link olvido contraseña */}
            {modo === 'login' && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => {/* TODO: flujo de recupero */}}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                >
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