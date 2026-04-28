'use client'

// src/app/ayuda/page.tsx
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'

// Sin SSR para evitar destello de dark mode (mismo patrón que CobranzasPage)
const AyudaView = dynamic(
  () => import('@/components/ayuda/AyudaView').then(m => m.AyudaView),
  { ssr: false }
)

export default function AyudaPage() {
  const { perfil, negocio } = useAuth()

  return (
    <AyudaView
      usuario={{
        nombre:  perfil?.nombre ?? 'Usuario',
        negocio: negocio?.nombre ?? '',
        tier:    negocio?.tier ?? 'free',
        avatar:  (perfil?.nombre ?? 'U').slice(0, 2).toUpperCase(),
      }}
    />
  )
}