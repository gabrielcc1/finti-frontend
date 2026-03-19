'use client'

// src/app/ventas/page.tsx
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import { useVentas } from '@/hooks/useVentas'

// Importación dinámica sin SSR — evita el destello de dark mode
// porque el componente solo se renderiza en el cliente, nunca en el servidor
const VentasView = dynamic(
  () => import('@/components/ventas/VentasView').then(m => m.VentasView),
  { ssr: false }
)

export default function VentasPage() {
  const { perfil, negocio } = useAuth()
  const ventas = useVentas()

  return (
    <VentasView
      usuario={{
        nombre:  perfil?.nombre ?? 'Usuario',
        negocio: negocio?.nombre ?? '',
        tier:    negocio?.tier ?? 'free',
        avatar:  (perfil?.nombre ?? 'U').slice(0, 2).toUpperCase(),
      }}
      ventas={ventas}
    />
  )
}