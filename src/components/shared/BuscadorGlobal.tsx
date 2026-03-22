'use client'

// src/components/shared/BuscadorGlobal.tsx

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

interface ClienteRow {
  id: string; nombre: string; telefono: string | null
  zona_comercial: string | null; es_moroso: boolean
}
interface VentaRow {
  id: string; fecha: string; total: string
  tipo_pago: string | null
  clientes: { nombre: string } | null
}
interface CobranzaRow {
  id: string; descripcion: string | null; monto_total: string
  estado: string; cuotas_pagas: number; cant_cuotas: number
  clientes: { nombre: string } | null
}

export type TemaMinimoBuscador = {
  bg: string; surface: string; surfaceAlt: string; border: string
  text: string; textMuted: string; textFaint: string
  accent: string; accentText: string
  red: string; redNum: string
  shadow: string; shadowMd: string
}

type Resultado = {
  id: string; tipo: 'cliente' | 'venta' | 'cobranza'
  titulo: string; subtitulo: string; monto?: string
  badge?: string; badgeColor?: string; badgeBg?: string
  href: string
}

const toFloat = (v: unknown) => parseFloat(String(v ?? 0)) || 0
const formatPeso = (n: unknown) => `$${toFloat(n).toLocaleString('es-AR')}`
const ICONO: Record<Resultado['tipo'], string> = { cliente:'👤', venta:'🛒', cobranza:'💸' }

function useDebounce(value: string, delay: number): string {
  const [deb, setDeb] = useState(value)
  useEffect(() => { const t = setTimeout(()=>setDeb(value),delay); return()=>clearTimeout(t) }, [value, delay])
  return deb
}

// ── Modal de búsqueda — EXPORTADO para poder usarlo en mobile también ─────────
export function ModalBusqueda({ t, dark, onClose }: {
  t: TemaMinimoBuscador; dark: boolean; onClose: () => void
}) {
  const [query,      setQuery]      = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading,    setLoading]    = useState(false)
  const [selIdx,     setSelIdx]     = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()
  const supabase = createClient()
  const dq = useDebounce(query, 250)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') setSelIdx(i=>Math.min(i+1, resultados.length-1))
      if (e.key === 'ArrowUp')   setSelIdx(i=>Math.max(i-1, 0))
      if (e.key === 'Enter' && resultados[selIdx]) { router.push(resultados[selIdx].href); onClose() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [resultados, selIdx, onClose, router])

  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResultados([]); return }
    setLoading(true)
    try {
      const term = q.trim()
      const [{ data: clientes }, { data: ventas }, { data: cobranzas }] = await Promise.all([
        db(supabase).from('clientes').select('id,nombre,telefono,zona_comercial,es_moroso').ilike('nombre',`%${term}%`).limit(5),
        db(supabase).from('ventas').select('id,fecha,total,tipo_pago,clientes(nombre)').ilike('clientes.nombre',`%${term}%`).limit(4),
        db(supabase).from('cobranzas').select('id,descripcion,monto_total,estado,cuotas_pagas,cant_cuotas,clientes(nombre)').or(`descripcion.ilike.%${term}%`).in('estado',['activa','vencida']).limit(4),
      ])
      const res: Resultado[] = []
      for (const c of ((clientes??[]) as ClienteRow[])) {
        res.push({ id:c.id, tipo:'cliente', titulo:c.nombre,
          subtitulo:[c.zona_comercial,c.telefono].filter(Boolean).join(' · '),
          badge: c.es_moroso ? '🚨 Deudor' : undefined,
          badgeColor: c.es_moroso ? t.redNum : undefined,
          badgeBg:    c.es_moroso ? t.red    : undefined,
          href:'/cobranzas' })
      }
      for (const v of ((ventas??[]) as VentaRow[])) {
        res.push({ id:v.id, tipo:'venta',
          titulo:`Venta — ${v.clientes?.nombre??'Sin cliente'}`,
          subtitulo:`${new Date(v.fecha+'T12:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'short'})} · ${v.tipo_pago}`,
          monto:formatPeso(v.total), href:'/ventas' })
      }
      for (const cb of ((cobranzas??[]) as CobranzaRow[])) {
        res.push({ id:cb.id, tipo:'cobranza',
          titulo:cb.clientes?.nombre??'Sin cliente',
          subtitulo:cb.descripcion??`${cb.cuotas_pagas}/${cb.cant_cuotas} cuotas`,
          monto:formatPeso(cb.monto_total),
          badge: cb.estado==='vencida'?'¡Vencida!':undefined,
          badgeColor: cb.estado==='vencida'?t.redNum:undefined,
          badgeBg:    cb.estado==='vencida'?t.red:undefined,
          href:'/cobranzas' })
      }
      setResultados(res); setSelIdx(0)
    } catch(e){ console.error(e) }
    finally{ setLoading(false) }
  }, [supabase, t])

  useEffect(() => { void buscar(dq) }, [dq, buscar])

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:2000, background:dark?'rgba(0,0,0,0.75)':'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'10vh 16px 16px' }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ width:'min(560px,100%)', background:t.surface, borderRadius:18, border:`1.5px solid ${t.border}`, boxShadow:t.shadowMd, overflow:'hidden', animation:'modalIn 0.15s ease' }}>

        {/* Input */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:`1px solid ${t.border}` }}>
          <span style={{ fontSize:18, flexShrink:0 }}>🔍</span>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Buscar cliente, venta, cobranza..."
            style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:15, color:t.text, fontFamily:'inherit' }} />
          {loading && <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${t.border}`, borderTopColor:t.accent, animation:'spin 0.7s linear infinite', flexShrink:0 }} />}
          <button onClick={onClose}
            style={{ width:28, height:28, borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            ✕
          </button>
        </div>

        {/* Resultados */}
        {resultados.length > 0 && (
          <div style={{ maxHeight:360, overflowY:'auto' }}>
            {resultados.map((r,i) => (
              <div key={`${r.tipo}-${r.id}`} onClick={()=>{router.push(r.href);onClose()}} onMouseEnter={()=>setSelIdx(i)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', cursor:'pointer', background:i===selIdx?t.surfaceAlt:'transparent', borderBottom:`1px solid ${t.border}`, transition:'background 0.1s' }}>
                <div style={{ width:34, height:34, borderRadius:9, background:t.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                  {ICONO[r.tipo]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' as const }}>
                    <span style={{ fontSize:13, fontWeight:600, color:t.text }}>{r.titulo}</span>
                    {r.badge && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:r.badgeBg, color:r.badgeColor }}>{r.badge}</span>}
                  </div>
                  <div style={{ fontSize:11, color:t.textFaint, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.subtitulo}</div>
                </div>
                {r.monto && <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:t.text, flexShrink:0 }}>{r.monto}</div>}
                <div style={{ fontSize:12, color:t.textFaint, flexShrink:0 }}>›</div>
              </div>
            ))}
          </div>
        )}

        {/* Empty / hint */}
        {query.length >= 2 && !loading && resultados.length === 0 && (
          <div style={{ padding:'28px 20px', textAlign:'center', color:t.textFaint }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
            <div style={{ fontSize:13, fontWeight:600, color:t.textMuted }}>Sin resultados para "{query}"</div>
          </div>
        )}
        {query.length < 2 && (
          <div style={{ padding:'14px 16px', display:'flex', gap:16 }}>
            {['👤 Clientes','🛒 Ventas','💸 Cobranzas'].map(l=><div key={l} style={{ fontSize:11, color:t.textFaint }}>{l}</div>)}
          </div>
        )}

        <div style={{ padding:'8px 16px', borderTop:`1px solid ${t.border}`, display:'flex', gap:12 }}>
          <span style={{ fontSize:10, color:t.textFaint }}>↑↓ navegar</span>
          <span style={{ fontSize:10, color:t.textFaint }}>↵ ir</span>
          <span style={{ fontSize:10, color:t.textFaint }}>ESC cerrar</span>
          <span style={{ marginLeft:'auto', fontSize:10, color:t.textFaint }}>Ctrl+K</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes modalIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

// ── Botón para el header desktop ──────────────────────────────────────────────
export function BuscadorGlobal({ t, dark }: { t: TemaMinimoBuscador; dark: boolean }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();setOpen(v=>!v)} }
    window.addEventListener('keydown', h); return()=>window.removeEventListener('keydown',h)
  }, [])
  return (
    <>
      <button onClick={()=>setOpen(true)}
        style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:9, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:11, cursor:'pointer' }}
        onMouseEnter={e=>(e.currentTarget.style.borderColor=t.accent)}
        onMouseLeave={e=>(e.currentTarget.style.borderColor=t.border)}>
        🔍 Buscar...
        <kbd style={{ fontSize:9, color:t.textFaint, border:`1px solid ${t.border}`, borderRadius:4, padding:'1px 4px', fontFamily:'monospace' }}>Ctrl K</kbd>
      </button>
      {open && <ModalBusqueda t={t} dark={dark} onClose={()=>setOpen(false)} />}
    </>
  )
}