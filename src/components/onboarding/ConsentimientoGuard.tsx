'use client'

// src/components/onboarding/ConsentimientoGuard.tsx
// Envuelve cualquier página protegida.
// Si el usuario está autenticado pero NO aceptó los TyC → muestra la pantalla de consentimiento.
// Si ya aceptó → renderiza los hijos normalmente.
// Si está cargando → muestra un loader mínimo.

import { useConsentimiento } from '@/hooks/useConsentimiento'
import { ConsentimientoView } from '@/components/onboarding/ConsentimientoView'
import { useAuth } from '@/hooks/useAuth'

interface ConsentimientoGuardProps {
  children: React.ReactNode
}

export function ConsentimientoGuard({ children }: ConsentimientoGuardProps) {
  const consentimiento = useConsentimiento()
  const { perfil }     = useAuth()

  // Mientras carga, no mostrar nada para evitar flash
  if (consentimiento.cargando) return <FintiLoader />

  // Si ya aceptó → acceso normal
  if (consentimiento.acepto) return <>{children}</>

  // Si no aceptó → pantalla de consentimiento bloqueante
  return (
    <ConsentimientoView
      consentimiento={consentimiento}
      usuarioNombre={perfil?.nombre ?? undefined}
      onAceptado={() => {
        // El hook ya actualizó `acepto` a true internamente,
        // React re-renderiza automáticamente y muestra los hijos.
      }}
    />
  )
}

// ── Loader mínimo coherente con el tema de Finti ──────────────────────────────
function FintiLoader() {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0e0c0a',
      fontFamily: 'system-ui', flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 13,
        background: '#141210', border: '1.5px solid #2e2924',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#d4a96a', fontSize: 20, fontWeight: 800,
      }}>F</div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: '2px solid #2e2924',
        borderTopColor: '#d4a96a',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}