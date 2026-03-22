'use client'

// src/components/shared/Sidebar.tsx
import { useRouter } from 'next/navigation'

interface SidebarProps {
  activo: 'dashboard' | 'ventas' | 'cobranzas' | 'pedidos' | 'stock' | 'costos' | 'personal' | 'contable'
  usuario: { nombre: string; tier: string; avatar: string }
  dark: boolean
  setDark: (v: boolean) => void
  t: {
    surface: string; border: string; surfaceAlt: string
    accent: string; accentText: string
    text: string; textMuted: string
  }
}

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: '⊞', href: '/dashboard'  },
  { id: 'ventas',     label: 'Ventas',      icon: '↗', href: '/ventas'     },
  { id: 'cobranzas',  label: 'Cobranzas',   icon: '◎', href: '/cobranzas'  },
  { id: 'clientes', label: 'Clientes', icon: '👥', href: '/clientes' },
  { id: 'pedidos',    label: 'Pedidos',     icon: '📦', href: '/pedidos'    },
  { id: 'stock',      label: 'Stock',       icon: '▦', href: '/stock'      },
  { id: 'costos',     label: 'Costos',      icon: '📊', href: '/costos'     },
  { id: 'personal',   label: 'Personal',    icon: '◉', href: '/personal'   },
  { id: 'contable',   label: 'Contable',    icon: '◒', href: '/contable'   },
] as const

const TIER_LABEL: Record<string, string> = {
  free:     'Free',
  pro:      'Pro ⚡',
  business: 'Business 💎',
}

export function Sidebar({ activo, usuario, dark, setDark, t }: SidebarProps) {
  const router = useRouter()

  return (
    <div style={{ width: 196, background: t.surface, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

      {/* Logo */}
      <div style={{ padding: '16px 12px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accentText, fontSize: 11, fontWeight: 800 }}>F</div>
        <span style={{ color: t.text, fontWeight: 800, fontSize: 15, letterSpacing: '-0.4px' }}>finti</span>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '8px 5px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV_ITEMS.map(({ id, label, icon, href }) => {
          const active = id === activo
          return (
            <button
              key={id}
              onClick={() => router.push(href)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 7px', borderRadius: 7, border: 'none',
                background: active ? t.surfaceAlt : 'transparent',
                borderLeft: `2px solid ${active ? t.accent : 'transparent'}`,
                color: active ? t.accent : t.textMuted,
                cursor: 'pointer', width: '100%', textAlign: 'left' as const,
                fontSize: 11, fontWeight: active ? 700 : 400,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.surfaceAlt }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 13, width: 16, textAlign: 'center' as const }}>{icon}</span>
              {label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '8px 5px', borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Toggle dark mode */}
        <button
          onClick={() => setDark(!dark)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 7px', borderRadius: 7, border: 'none', background: 'transparent', color: t.textMuted, cursor: 'pointer', fontSize: 11, width: '100%' }}
          onMouseEnter={e => e.currentTarget.style.background = t.surfaceAlt}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ width: 16, textAlign: 'center' as const, fontSize: 13 }}>{dark ? '☀' : '☾'}</span>
          {dark ? 'Modo claro' : 'Oscuro'}
        </button>

        {/* Avatar → link a /perfil */}
        <button
          onClick={() => router.push('/perfil')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 7px', borderRadius: 7, border: 'none',
            background: 'transparent', cursor: 'pointer', width: '100%',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = t.surfaceAlt}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Ver perfil"
        >
          <div style={{ width: 24, height: 24, borderRadius: 7, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accentText, fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
            {usuario.avatar}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario.nombre}</div>
            <div style={{ fontSize: 9, color: t.textMuted }}>{TIER_LABEL[usuario.tier] ?? usuario.tier}</div>
          </div>
          <span style={{ fontSize: 10, color: t.textMuted, flexShrink: 0 }}>›</span>
        </button>

      </div>
    </div>
  )
}