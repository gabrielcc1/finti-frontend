'use client'

// src/app/verificar-email/page.tsx
// Supabase redirige acá después de que el usuario hace clic en el link del email.
// El token se procesa automáticamente por el cliente de Supabase,
// y onAuthStateChange en useAuth se encarga de crear el perfil/negocio.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

export default function VerificarEmailPage() {
  const router = useRouter()
  const [estado, setEstado] = useState<'verificando' | 'exito' | 'error'>('verificando')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const supabase = createClient()

    const procesarConfirmacion = async () => {
      // Supabase maneja el token del hash automáticamente.
      // Solo hay que esperar a que la sesión esté disponible.
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        setEstado('error')
        setMensaje('El link de confirmación no es válido o ya expiró.')
        return
      }

      const user = session.user

      // Verificar si ya tiene perfil creado (puede ser que ya existía)
      const { data: perfilExistente } = await db(supabase)
        .from('usuarios')
        .select('id, negocio_id')
        .eq('id', user.id)
        .single()

      if (!perfilExistente) {
        // Primera vez: crear negocio y perfil usando el nombre guardado en user_metadata
        const nombreNegocio = user.user_metadata?.nombre_negocio ?? 'Mi negocio'

        const { data: negocioData, error: errN } = await db(supabase)
          .from('negocios')
          .insert({ nombre: nombreNegocio, tier: 'free' })
          .select()
          .single()

        if (errN || !negocioData) {
          setEstado('error')
          setMensaje('Hubo un problema al configurar tu cuenta. Contactá con soporte.')
          return
        }

        await db(supabase).from('usuarios').insert({
          id:         user.id,
          negocio_id: negocioData.id,
          rol:        'owner',
        })
      }

      setEstado('exito')
      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => router.push('/dashboard'), 2000)
    }

    void procesarConfirmacion()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>

        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: 18, background: '#141210',
          border: '1.5px solid #2e2924',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#d4a96a', fontSize: 26, fontWeight: 800, marginBottom: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>F</div>

        {estado === 'verificando' && (
          <>
            <div style={{ fontSize: 44, marginBottom: 16 }}>⏳</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              Verificando tu cuenta...
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Un momento, estamos confirmando tu email
            </p>
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '3px solid #e8e8e4', borderTopColor: '#141210',
              animation: 'spin 0.8s linear infinite',
              margin: '24px auto 0',
            }} />
          </>
        )}

        {estado === 'exito' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              ¡Cuenta confirmada!
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.5 }}>
              Tu cuenta está lista. En un momento te llevamos al dashboard.
            </p>
            <div style={{
              padding: '12px 18px', borderRadius: 12,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              fontSize: 13, color: '#166534', fontWeight: 600,
            }}>
              ✓ Redirigiendo a Finti...
            </div>
          </>
        )}

        {estado === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              Algo salió mal
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, lineHeight: 1.5 }}>
              {mensaje}
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>
              El link de confirmación tiene una validez de 24 horas.
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '12px 28px', borderRadius: 12, border: 'none',
                background: '#141210', color: '#d4a96a',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  )
}