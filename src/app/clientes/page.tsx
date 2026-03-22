'use client'

// src/app/clientes/page.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ClientesView } from '@/components/clientes/ClientesView'

export default function ClientesPage() {
  const router = useRouter()
  const { user, perfil, negocio, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  if (authLoading) return <FintiLoader />

  return (
    <ClientesView
      usuario={{
        nombre:  perfil?.nombre ?? 'Usuario',
        negocio: negocio?.nombre ?? '',
        tier:    negocio?.tier ?? 'free',
        avatar:  (perfil?.nombre ?? 'U').slice(0, 2).toUpperCase(),
      }}
    />
  )
}

function FintiLoader() {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
      fontFamily: 'system-ui', flexDirection: 'column', gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent-text)', fontSize: 16, fontWeight: 800,
        animation: 'pulse 1.2s infinite',
      }}>F</div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando finti...</span>
    </div>
  )
}