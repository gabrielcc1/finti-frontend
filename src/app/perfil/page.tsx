'use client'

// src/app/perfil/page.tsx
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import { usePerfil } from '@/hooks/usePerfil'

const PerfilView = dynamic(
  () => import('@/components/perfil/PerfilView').then(m => ({ default: m.PerfilView })),
  { ssr: false }
)

export default function PerfilPage() {
  const { perfil, negocio } = useAuth()
  const perfilHook = usePerfil()

  return (
    <PerfilView
      usuario={{
        nombre:  perfil?.nombre ?? 'Usuario',
        negocio: negocio?.nombre ?? '',
        tier:    negocio?.tier ?? 'free',
        avatar:  (perfil?.nombre ?? 'U').slice(0, 2).toUpperCase(),
      }}
      perfil={perfilHook}
    />
  )
}