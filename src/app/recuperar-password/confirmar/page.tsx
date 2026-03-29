'use client'

// src/app/recuperar-password/confirmar/page.tsx
// Paso 2: el usuario llegó desde el link del email, ingresa su nueva contraseña.
// Supabase procesa el token del hash automáticamente al cargar esta página.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmarPasswordPage() {
  const router = useRouter()
  const { actualizarPassword } = useAuth()

  const [nuevaPass,    setNuevaPass]    = useState('')
  const [confirmaPass, setConfirmaPass] = useState('')
  const [showPass,     setShowPass]     = useState(false)
  const [guardando,    setGuardando]    = useState(false)
  const [exito,        setExito]        = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [tokenValido,  setTokenValido]  = useState<boolean | null>(null) // null = verificando

  // Verificar que el token del hash es válido antes de mostrar el formulario
  useEffect(() => {
    const verificarToken = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      // Supabase procesa el hash automáticamente; si hay sesión, el token es válido
      setTokenValido(!!session)
    }
    void verificarToken()
  }, [])

  const validarPass = (): string | null => {
    if (nuevaPass.length < 6)
      return 'La contraseña debe tener al menos 6 caracteres'
    if (nuevaPass !== confirmaPass)
      return 'Las contraseñas no coinciden'
    return null
  }

  const traducirError = (msg: string): string => {
    if (msg.includes('same password'))
      return 'La nueva contraseña debe ser diferente a la anterior'
    if (msg.includes('weak') || msg.includes('Password should be'))
      return 'La contraseña es muy débil. Usá al menos 6 caracteres'
    return 'Hubo un error al actualizar la contraseña. Intentá de nuevo.'
  }

  const handleGuardar = async () => {
    const validacion = validarPass()
    if (validacion) { setError(validacion); return }
    setError(null)
    setGuardando(true)
    try {
      await actualizarPassword(nuevaPass)
      setExito(true)
      // Redirigir al dashboard después de 2 segundos — ya tiene sesión activa
      setTimeout(() => router.push('/dashboard'), 2200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(traducirError(msg))
    } finally {
      setGuardando(false)
    }
  }

  const estiloInput = {
    width: '100%', padding: '11px 40px 11px 14px', borderRadius: 10,
    border: '1.5px solid #e8e8e4', fontSize: 14, color: '#111827',
    outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'inherit', background: '#fafaf8',
  }

  const fortaleza = (() => {
    if (nuevaPass.length === 0) return null
    if (nuevaPass.length < 6)  return { label: 'Muy corta', color: '#dc2626', pct: 25 }
    if (nuevaPass.length < 8)  return { label: 'Aceptable', color: '#d97706', pct: 50 }
    const tieneNumero  = /\d/.test(nuevaPass)
    const tieneMayuscula = /[A-Z]/.test(nuevaPass)
    if (tieneNumero && tieneMayuscula)
      return { label: 'Fuerte', color: '#16a34a', pct: 100 }
    return { label: 'Buena',  color: '#0d9488', pct: 75 }
  })()

  // ── Verificando token ─────────────────────────────────────────────────────
  if (tokenValido === null) {
    return (
      <div suppressHydrationWarning style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafaf8', fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid #e8e8e4', borderTopColor: '#141210',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  // ── Token inválido o expirado ─────────────────────────────────────────────
  if (tokenValido === false) {
    return (
      <div suppressHydrationWarning style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafaf8', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20,
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⏰</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            El link expiró
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.5 }}>
            Los links de recupero son válidos por <strong>1 hora</strong>.<br/>
            Solicitá uno nuevo desde el inicio de sesión.
          </p>
          <button onClick={() => router.push('/recuperar-password')} style={{
            padding: '12px 28px', borderRadius: 12, border: 'none',
            background: '#141210', color: '#d4a96a',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Solicitar nuevo link
          </button>
        </div>
      </div>
    )
  }

  // ── Contraseña actualizada con éxito ──────────────────────────────────────
  if (exito) {
    return (
      <div suppressHydrationWarning style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafaf8', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20,
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🔓</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            ¡Contraseña actualizada!
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.5 }}>
            Tu nueva contraseña está activa. Te llevamos al dashboard en un momento.
          </p>
          <div style={{
            padding: '12px 18px', borderRadius: 12,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            fontSize: 13, color: '#166534', fontWeight: 600,
          }}>
            ✓ Redirigiendo a Finti...
          </div>
        </div>
      </div>
    )
  }

  // ── Formulario de nueva contraseña ────────────────────────────────────────
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
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Nueva contraseña</div>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '28px 24px',
          border: '1px solid #e8e8e4', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
            Creá tu nueva contraseña
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 22px', lineHeight: 1.5 }}>
            Elegí una contraseña segura que no uses en otros sitios.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Nueva contraseña */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Nueva contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={nuevaPass}
                  onChange={e => setNuevaPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  autoComplete="new-password"
                  style={estiloInput}
                  onFocus={e => e.currentTarget.style.borderColor = '#111827'}
                  onBlur={e => e.currentTarget.style.borderColor = '#e8e8e4'}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9ca3af', fontSize: 14, padding: 4,
                }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>

              {/* Indicador de fortaleza */}
              {fortaleza && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, borderRadius: 2, background: '#e8e8e4', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${fortaleza.pct}%`,
                      background: fortaleza.color,
                      transition: 'width 0.3s ease, background 0.3s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: fortaleza.color, fontWeight: 600, marginTop: 4 }}>
                    {fortaleza.label}
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Confirmá la contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmaPass}
                  onChange={e => setConfirmaPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleGuardar()}
                  placeholder="Repetí la contraseña"
                  autoComplete="new-password"
                  style={{
                    ...estiloInput,
                    borderColor: confirmaPass.length > 0
                      ? nuevaPass === confirmaPass ? '#16a34a' : '#dc2626'
                      : '#e8e8e4',
                  }}
                />
                {confirmaPass.length > 0 && (
                  <div style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 16,
                  }}>
                    {nuevaPass === confirmaPass ? '✅' : '❌'}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fff1f2', border: '1px solid #fecdd3',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 12, color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              onClick={() => void handleGuardar()}
              disabled={nuevaPass.length < 6 || guardando}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                background: nuevaPass.length >= 6 ? '#141210' : '#e5e7eb',
                color: nuevaPass.length >= 6 ? '#d4a96a' : '#9ca3af',
                fontSize: 14, fontWeight: 800,
                cursor: nuevaPass.length < 6 ? 'not-allowed' : guardando ? 'wait' : 'pointer',
                transition: 'all 0.15s', fontFamily: 'inherit', letterSpacing: '-0.2px',
              }}>
              {guardando ? 'Guardando...' : '🔒 Guardar nueva contraseña'}
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}