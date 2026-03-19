'use client'

// src/app/cobranzas/page.tsx
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import { useCobranzas } from '@/hooks/useCobranzas'

// Importación dinámica sin SSR — evita el destello de dark mode
// porque el componente solo se renderiza en el cliente, nunca en el servidor
const CobranzasView = dynamic(
  () => import('@/components/cobranzas/CobranzasView').then(m => m.CobranzasView),
  { ssr: false }
)

export default function CobranzasPage() {
  const { perfil, negocio } = useAuth()
  const cobranzas = useCobranzas()

  return (
    <CobranzasView
      usuario={{
        nombre:  perfil?.nombre ?? 'Usuario',
        negocio: negocio?.nombre ?? '',
        tier:    negocio?.tier ?? 'free',
        avatar:  (perfil?.nombre ?? 'U').slice(0, 2).toUpperCase(),
      }}
      cobranzas={cobranzas}
    />
  )
}