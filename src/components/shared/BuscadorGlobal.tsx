'use client'

// src/components/shared/BuscadorGlobal.tsx
// Buscador global accesible desde el Dashboard (botón) o Ctrl+K desde cualquier módulo.
// Busca en tiempo real: clientes, ventas recientes y cobranzas activas.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

// ── Tipos locales para los resultados de las queries ──────────────────────────
interface ClienteRow {
  id: string; nombre: string; telefono: string | null
  zona_comercial: string | null; es_moroso: boolean
}
interface VentaRow {
  id: string; fecha: string; total: string
  tipo_pago: string | null; estado: string
  clientes: { nombre: string } | null
}
interface CobranzaRow {
  id: string; descripcion: string | null; monto_total: string
  estado: string; cuotas_pagas: number; cant_cuotas: number
  clientes: { nombre: string } | null
}

type Tema = {
  bg: string; surface: string; surfaceAlt: string; border: string
  text: string; textMuted: string; textFaint: string; accent: string; accentText: string
  green: string; greenBorder: string; greenText: string
  amber: string; amberBorder: string; amberSub: string
  red: string; redBorder: string; redNum: string
  shadow: string; shadowMd: string
}

type Resultado = {
  id: string
  tipo: 'cliente' | 'venta' | 'cobranza'
  titulo: string
  subtitulo: string
  monto?: string
  badge?: string
  badgeColor?: string
  badgeBg?: string
  href: string
}

const toFloat = (v: unknown) => parseFloat(String(v ?? 0)) || 0
const formatPeso = (n: unknown) => `$${toFloat(n).toLocaleString('es-AR')}`

const ICONO: Record<Resultado['tipo'], string> = {
  cliente: '👤',
  venta: '🛒',
  cobranza: '💸',
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Modal de búsqueda ─────────────────────────────────────────────────────────
function ModalBusqueda({ t, dark, onClose }: { t: Tema; dark: boolean; onClose: () => void }) {
  const [query, setQuery]         = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading]     = useState(false)
  const [selIdx, setSelIdx]       = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()
  const supabase = createClient()
  const debouncedQuery = useDebounce(query, 250)

  // Focus al abrir
  useEffect(() => { inputRef.current?.focus() }, [])

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') setSelIdx(i => Math.min(i + 1, resultados.length - 1))
      if (e.key === 'ArrowUp')   setSelIdx(i => Math.max(i - 1, 0))
      if (e.key === 'Enter' && resultados[selIdx]) {
        router.push(resultados[selIdx].href)
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [resultados, selIdx, onClose, router])

  // Búsqueda
  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResultados([]); return }
    setLoading(true)
    try {
      const term = q.trim()

      // Buscar en paralelo
      const [{ data: clientes }, { data: ventas }, { data: cobranzas }] = await Promise.all([
        db(supabase)
          .from('clientes')
          .select('id, nombre, telefono, zona_comercial, es_moroso')
          .ilike('nombre', `%${term}%`)
          .limit(5),
        db(supabase)
          .from('ventas')
          .select('id, fecha, total, tipo_pago, estado, clientes(nombre)')
          .ilike('clientes.nombre', `%${term}%`)
          .limit(4),
        db(supabase)
          .from('cobranzas')
          .select('id, descripcion, monto_total, estado, cuotas_pagas, cant_cuotas, clientes(nombre)')
          .or(`descripcion.ilike.%${term}%`)
          .in('estado', ['activa', 'vencida'])
          .limit(4),
      ])

      const res: Resultado[] = []

      // Clientes
      for (const c of ((clientes ?? []) as ClienteRow[])) {
        res.push({
          id: c.id,
          tipo: 'cliente',
          titulo: c.nombre,
          subtitulo: [c.zona_comercial, c.telefono].filter(Boolean).join(' · '),
          badge: c.es_moroso ? '⚠ Moroso' : undefined,
          badgeColor: c.es_moroso ? t.redNum : undefined,
          badgeBg: c.es_moroso ? t.red : undefined,
          href: '/cobranzas',
        })
      }

      // Ventas
      for (const v of ((ventas ?? []) as VentaRow[])) {
        const cliente = v.clientes?.nombre ?? 'Sin cliente'
        res.push({
          id: v.id,
          tipo: 'venta',
          titulo: `Venta — ${cliente}`,
          subtitulo: `${new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' })} · ${v.tipo_pago}`,
          monto: formatPeso(v.total),
          href: '/ventas',
        })
      }

      // Cobranzas
      for (const cb of ((cobranzas ?? []) as CobranzaRow[])) {
        const cliente = cb.clientes?.nombre ?? 'Sin cliente'
        const vencida = cb.estado === 'vencida'
        res.push({
          id: cb.id,
          tipo: 'cobranza',
          titulo: `${cliente}`,
          subtitulo: cb.descripcion ?? `${cb.cuotas_pagas}/${cb.cant_cuotas} cuotas`,
          monto: formatPeso(cb.monto_total),
          badge: vencida ? '¡Vencida!' : undefined,
          badgeColor: vencida ? t.redNum : undefined,
          badgeBg: vencida ? t.red : undefined,
          href: '/cobranzas',
        })
      }

      setResultados(res)
      setSelIdx(0)
    } catch (e) {
      console.error('Búsqueda global error:', e)
    } finally {
      setLoading(false)
    }
  }, [supabase, t])

  useEffect(() => { void buscar(debouncedQuery) }, [debouncedQuery, buscar])

  const irA = (r: Resultado) => { router.push(r.href); onClose() }

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:1000,
        background: dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.35)',
        backdropFilter:'blur(4px)',
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        paddingTop:'12vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:'min(560px, 92vw)',
          background:t.surface,
          borderRadius:18,
          border:`1.5px solid ${t.border}`,
          boxShadow:t.shadowMd,
          overflow:'hidden',
        }}
      >
        {/* Input */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderBottom:`1px solid ${t.border}` }}>
          <span style={{ fontSize:18, flexShrink:0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar cliente, venta, cobranza&hellip;"
            style={{
              flex:1, border:'none', outline:'none', background:'transparent',
              fontSize:15, color:t.text, fontFamily:'inherit',
            }}
          />
          {loading && (
            <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${t.border}`, borderTopColor:t.accent, animation:'spin 0.7s linear infinite', flexShrink:0 }} />
          )}
          <kbd style={{ fontSize:10, color:t.textFaint, border:`1px solid ${t.border}`, borderRadius:5, padding:'2px 5px', fontFamily:'monospace', flexShrink:0 }}>ESC</kbd>
        </div>

        {/* Resultados */}
        {resultados.length > 0 && (
          <div style={{ maxHeight:340, overflowY:'auto' }}>
            {resultados.map((r, i) => (
              <div
                key={`${r.tipo}-${r.id}`}
                onClick={() => irA(r)}
                onMouseEnter={() => setSelIdx(i)}
                style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 18px',
                  cursor:'pointer',
                  background: i === selIdx ? t.surfaceAlt : 'transparent',
                  borderBottom:`1px solid ${t.border}`,
                  transition:'background 0.1s',
                }}
              >
                {/* Ícono tipo */}
                <div style={{ width:32, height:32, borderRadius:9, background:t.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                  {ICONO[r.tipo]}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:t.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {r.titulo}
                    </span>
                    {r.badge && (
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:20, background:r.badgeBg, color:r.badgeColor, flexShrink:0 }}>
                        {r.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:t.textFaint, marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {r.subtitulo}
                  </div>
                </div>

                {/* Monto */}
                {r.monto && (
                  <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:t.text, flexShrink:0 }}>
                    {r.monto}
                  </div>
                )}

                {/* Flecha */}
                <div style={{ fontSize:12, color:t.textFaint, flexShrink:0 }}>›</div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query.length >= 2 && !loading && resultados.length === 0 && (
          <div style={{ padding:'32px 20px', textAlign:'center', color:t.textFaint }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
            <div style={{ fontSize:13, fontWeight:600, color:t.textMuted }}>Sin resultados para &quot;{query}&quot;</div>
            <div style={{ fontSize:11, marginTop:4 }}>Probá con el nombre del cliente o descripción</div>
          </div>
        )}

        {/* Hint inicial */}
        {query.length < 2 && (
          <div style={{ padding:'20px 18px', display:'flex', gap:16 }}>
            {(['👤 Clientes', '🛒 Ventas', '💸 Cobranzas'] as const).map(label => (
              <div key={label} style={{ fontSize:11, color:t.textFaint, display:'flex', alignItems:'center', gap:4 }}>
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:'8px 18px', borderTop:`1px solid ${t.border}`, display:'flex', gap:14, alignItems:'center' }}>
          <span style={{ fontSize:10, color:t.textFaint }}>↑↓ navegar</span>
          <span style={{ fontSize:10, color:t.textFaint }}>↵ ir</span>
          <span style={{ fontSize:10, color:t.textFaint }}>ESC cerrar</span>
          <span style={{ marginLeft:'auto', fontSize:10, color:t.textFaint }}>Ctrl+K para abrir</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ── Botón que se pone en el header ────────────────────────────────────────────
export function BuscadorGlobal({ t, dark }: { t: Tema; dark: boolean }) {
  const [open, setOpen] = useState(false)

  // Ctrl+K global
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'5px 12px', borderRadius:9,
          border:`1px solid ${t.border}`,
          background:t.surfaceAlt,
          color:t.textMuted, fontSize:11, cursor:'pointer',
          transition:'border 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.accent }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.border }}
      >
        🔍 Buscar...
        <kbd style={{ fontSize:9, color:t.textFaint, border:`1px solid ${t.border}`, borderRadius:4, padding:'1px 4px', fontFamily:'monospace' }}>
          Ctrl K
        </kbd>
      </button>

      {open && <ModalBusqueda t={t} dark={dark} onClose={() => setOpen(false)} />}
    </>
  )
}