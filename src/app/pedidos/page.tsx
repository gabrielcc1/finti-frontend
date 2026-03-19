'use client'

// src/app/pedidos/page.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePedidos } from '@/hooks/usePedidos'
import { PedidosView } from '@/components/pedidos/PedidosView'

export default function PedidosPage() {
  const router = useRouter()
  const { user, perfil, negocio, loading: authLoading } = useAuth()
  const pedidos = usePedidos()

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  if (authLoading) return <FintiLoader />

  return (
    <PedidosView
      usuario={{
        nombre:  perfil?.nombre ?? 'Usuario',
        negocio: negocio?.nombre ?? '',
        tier:    negocio?.tier ?? 'free',
        avatar:  (perfil?.nombre ?? 'U').slice(0, 2).toUpperCase(),
      }}
      pedidos={pedidos}
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