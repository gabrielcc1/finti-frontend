'use client'

// src/components/personal/PersonalView.tsx
import { useState, useEffect } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import type { usePersonal } from '@/hooks/usePersonal'
import type { Ingreso, GastoPersonal, Meta, NuevoIngresoData, NuevoGastoData, NuevaMetaData } from '@/hooks/usePersonal'

interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface PersonalViewProps { usuario: UsuarioInfo; personal: ReturnType<typeof usePersonal> }

const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0
const fmt     = (n: number | string | null | undefined) => `$${toFloat(n).toLocaleString('es-AR')}`
const fmtPct  = (n: number) => `${n.toFixed(1)}%`
const MESES   = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CAT_INGRESO: Record<string, { label: string; icon: string; color: string }> = {
  retiro_negocio: { label: 'Retiro del negocio', icon: '🏪', color: '#0d9488' },
  sueldo:         { label: 'Sueldo',             icon: '💼', color: '#7c3aed' },
  freelance:      { label: 'Freelance',           icon: '💻', color: '#2563eb' },
  alquiler:       { label: 'Alquiler',            icon: '🏠', color: '#d97706' },
  otros:          { label: 'Otros',               icon: '💰', color: '#6b7280' },
}
const CAT_GASTO: Record<string, { label: string; icon: string; color: string }> = {
  vivienda:      { label: 'Vivienda',      icon: '🏠', color: '#7c3aed' },
  alimentacion:  { label: 'Alimentación', icon: '🍽', color: '#16a34a' },
  transporte:    { label: 'Transporte',   icon: '🚗', color: '#2563eb' },
  salud:         { label: 'Salud',        icon: '❤️', color: '#dc2626' },
  educacion:     { label: 'Educación',    icon: '📚', color: '#0d9488' },
  ocio:          { label: 'Ocio',         icon: '🎉', color: '#d97706' },
  otros:         { label: 'Otros',        icon: '•',  color: '#6b7280' },
}

const tema = {
  light: {
    bg:'#fafaf8', surface:'#ffffff', surfaceAlt:'#f5f5f2', border:'#e8e8e4', borderLight:'#f0f0ec',
    text:'#111827', textMuted:'#6b7280', textFaint:'#9ca3af',
    accent:'#111827', accentText:'#ffffff',
    amber:'#fffbeb', amberBorder:'#fde68a', amberSub:'#d97706',
    red:'#fff1f2', redBorder:'#fecdd3', redNum:'#dc2626',
    green:'#f0fdf4', greenBorder:'#bbf7d0', greenNum:'#16a34a',
    blue:'#eff6ff', blueBorder:'#bfdbfe', blueNum:'#2563eb',
    teal:'#f0fdfa', tealBorder:'#99f6e4', tealNum:'#0d9488',
    navBg:'rgba(255,255,255,0.92)', shadow:'0 1px 4px rgba(0,0,0,0.06)', shadowMd:'0 4px 16px rgba(0,0,0,0.08)',
    skeletonBase:'#ebebeb', skeletonShine:'#f5f5f5',
  },
  dark: {
    bg:'#141210', surface:'#1c1916', surfaceAlt:'#211e1b', border:'#2e2924', borderLight:'#252019',
    text:'#e8e0d4', textMuted:'#7a6e62', textFaint:'#4a4238',
    accent:'#d4a96a', accentText:'#141210',
    amber:'#1f1a0e', amberBorder:'#3d3010', amberSub:'#a87d30',
    red:'#1f0e0e', redBorder:'#3d1010', redNum:'#f87171',
    green:'#0e1f12', greenBorder:'#1a3820', greenNum:'#4ade80',
    blue:'#0e1520', blueBorder:'#1a2e50', blueNum:'#60a5fa',
    teal:'#0e1f1e', tealBorder:'#1a3836', tealNum:'#2dd4bf',
    navBg:'rgba(20,18,16,0.95)', shadow:'0 1px 6px rgba(0,0,0,0.4)', shadowMd:'0 4px 20px rgba(0,0,0,0.5)',
    skeletonBase:'#211e1b', skeletonShine:'#2e2924',
  },
}
type Tema = typeof tema.light

function Sk({ h=16, radius=6, t }: { h?: number; radius?: number; t: Tema }) {
  return (
    <div style={{ height:h, borderRadius:radius, background:t.skeletonBase, overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg,transparent,${t.skeletonShine},transparent)`, animation:'shimmer 1.4s infinite' }} />
    </div>
  )
}
const inp = (t: Tema) => ({ width:'100%', padding:'9px 12px', borderRadius:10, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.text, fontSize:13, outline:'none', fontFamily:"'DM Sans',system-ui,sans-serif" })
const lbl = (t: Tema) => ({ fontSize:11, fontWeight:600 as const, color:t.textMuted, marginBottom:4, display:'block' as const })

// ── Modal genérico ingreso/gasto ───────────────────────────────────────────
function ModalMovimiento({ tipo, item, onConfirm, onCancel, saving, t }: {
  tipo: 'ingreso' | 'gasto'
  item?: Ingreso | GastoPersonal | null
  onConfirm: (data: NuevoIngresoData | NuevoGastoData) => void
  onCancel: () => void; saving: boolean; t: Tema
}) {
  const cats = tipo === 'ingreso' ? CAT_INGRESO : CAT_GASTO
  const [desc, setDesc]   = useState((item as Ingreso)?.descripcion ?? '')
  const [monto, setMonto] = useState(item ? toFloat(item.monto).toString() : '')
  const [cat,   setCat]   = useState(item?.categoria ?? Object.keys(cats)[0])
  const [fecha, setFecha] = useState(item?.fecha ?? new Date().toISOString().slice(0,10))
  const [recur, setRecur] = useState((item as GastoPersonal)?.recurrente ?? false)
  const [err,   setErr]   = useState('')

  const handleSubmit = () => {
    if (!desc.trim())             { setErr('Ingresá una descripción'); return }
    if (!monto || toFloat(monto) <= 0) { setErr('Ingresá un monto válido'); return }
    setErr('')
    const base = { descripcion: desc.trim(), monto: toFloat(monto), categoria: cat, fecha }
    onConfirm(tipo === 'gasto' ? { ...base, recurrente: recur } : base)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:380, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:18 }}>
          {item ? 'Editar' : 'Nuevo'} {tipo === 'ingreso' ? 'ingreso' : 'gasto'}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={lbl(t)}>Categoría</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {Object.entries(cats).map(([key, cfg]) => (
                <button key={key} onClick={() => setCat(key)}
                  style={{ padding:'8px 10px', borderRadius:9, border:`1.5px solid ${cat===key ? cfg.color : t.border}`, background: cat===key ? `${cfg.color}18` : 'transparent', color: cat===key ? cfg.color : t.textMuted, fontSize:11, fontWeight: cat===key ? 700 : 400, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:6 }}>
                  <span>{cfg.icon}</span><span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl(t)}>Descripción *</label>
            <input type="text" value={desc} onChange={e=>setDesc(e.target.value)} placeholder={tipo==='ingreso'?'Ej: Retiro de caja marzo':'Ej: Alquiler depto'} style={inp(t)} autoFocus />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={lbl(t)}>Monto $</label>
              <input type="number" min="0" value={monto} onChange={e=>setMonto(e.target.value)} style={inp(t)} />
            </div>
            <div>
              <label style={lbl(t)}>Fecha</label>
              <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inp(t)} />
            </div>
          </div>
          {tipo === 'gasto' && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:t.surfaceAlt, border:`1px solid ${t.border}`, cursor:'pointer' }} onClick={()=>setRecur(v=>!v)}>
              <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${recur?t.accent:t.border}`, background:recur?t.accent:'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {recur && <span style={{ color:t.accentText, fontSize:11, lineHeight:1 }}>✓</span>}
              </div>
              <span style={{ fontSize:12, color:t.textMuted }}>Gasto recurrente (se repite cada mes)</span>
            </div>
          )}
          {err && <div style={{ fontSize:11, color:t.redNum }}>{err}</div>}
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor:saving?'wait':'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal Meta ─────────────────────────────────────────────────────────────
function ModalMeta({ onConfirm, onCancel, saving, t }: { onConfirm: (d: NuevaMetaData) => void; onCancel: () => void; saving: boolean; t: Tema }) {
  const [nombre, setNombre] = useState('')
  const [obj,    setObj]    = useState('')
  const [fecha,  setFecha]  = useState('')
  const [err,    setErr]    = useState('')
  const handleSubmit = () => {
    if (!nombre.trim())         { setErr('Ingresá un nombre'); return }
    if (!obj || toFloat(obj)<=0){ setErr('Ingresá el monto objetivo'); return }
    setErr('')
    onConfirm({ nombre: nombre.trim(), monto_objetivo: toFloat(obj), fecha_objetivo: fecha || undefined })
  }
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:360, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:18 }}>🎯 Nueva meta de ahorro</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={lbl(t)}>Nombre *</label><input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Vacaciones, Auto, Fondo emergencia" style={inp(t)} autoFocus /></div>
          <div><label style={lbl(t)}>Monto objetivo $</label><input type="number" min="0" value={obj} onChange={e=>setObj(e.target.value)} style={inp(t)} /></div>
          <div><label style={lbl(t)}>Fecha objetivo (opcional)</label><input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inp(t)} /></div>
          {err && <div style={{ fontSize:11, color:t.redNum }}>{err}</div>}
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving} style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor:saving?'wait':'pointer', opacity:saving?0.7:1 }}>{saving?'Creando...':'✓ Crear'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal Abonar Meta ──────────────────────────────────────────────────────
function ModalAbonar({ meta, onConfirm, onCancel, saving, t }: { meta: Meta; onConfirm: (monto: number) => void; onCancel: () => void; saving: boolean; t: Tema }) {
  const [monto, setMonto] = useState('')
  const faltante = toFloat(meta.monto_objetivo) - toFloat(meta.monto_actual)
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:340, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:4 }}>💸 Abonar a meta</div>
        <div style={{ fontSize:12, color:t.textMuted, marginBottom:20 }}>{meta.nombre} · Falta {fmt(faltante)}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={lbl(t)}>Monto a abonar $</label><input type="number" min="1" max={faltante} value={monto} onChange={e=>setMonto(e.target.value)} style={inp(t)} autoFocus /></div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[faltante/4, faltante/2, faltante].map((v,i) => (
              <button key={i} onClick={()=>setMonto(Math.round(v).toString())}
                style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:11, cursor:'pointer' }}>
                {i===0?'25%':i===1?'50%':'Completar'} ({fmt(v)})
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
            <button onClick={()=>toFloat(monto)>0&&onConfirm(toFloat(monto))} disabled={saving||toFloat(monto)<=0} style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor:saving?'wait':'pointer', opacity:(saving||toFloat(monto)<=0)?0.5:1 }}>{saving?'Guardando...':'✓ Abonar'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal Presupuesto ──────────────────────────────────────────────────────
function ModalPresupuesto({ categoria, limiteActual, onConfirm, onCancel, saving, t }: { categoria: string; limiteActual: number; onConfirm: (monto: number) => void; onCancel: () => void; saving: boolean; t: Tema }) {
  const [monto, setMonto] = useState(limiteActual > 0 ? limiteActual.toString() : '')
  const cfg = CAT_GASTO[categoria] ?? { label: categoria, icon: '•', color: t.accent }
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:320, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:4 }}>{cfg.icon} Límite de {cfg.label}</div>
        <div style={{ fontSize:12, color:t.textMuted, marginBottom:18 }}>¿Cuánto máximo querés gastar este mes?</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={lbl(t)}>Límite mensual $</label><input type="number" min="0" value={monto} onChange={e=>setMonto(e.target.value)} style={inp(t)} autoFocus /></div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
            <button onClick={()=>toFloat(monto)>0&&onConfirm(toFloat(monto))} disabled={saving||toFloat(monto)<=0} style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor:'pointer', opacity:(saving||toFloat(monto)<=0)?0.5:1 }}>{saving?'Guardando...':'✓ Guardar'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TAB RESUMEN ────────────────────────────────────────────────────────────
function TabResumen({ personal, t }: { personal: ReturnType<typeof usePersonal>; t: Tema }) {
  const r = personal.resumen
  const s = personal.salud
  const tasaColor = r.tasaAhorro >= 20 ? t.greenNum : r.tasaAhorro >= 0 ? t.amberSub : t.redNum

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:600 }}>
      {/* Alertas presupuesto */}
      {r.alertasPresupuesto.length > 0 && (
        <div style={{ padding:'10px 14px', borderRadius:12, background:t.amber, border:`1px solid ${t.amberBorder}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:t.amberSub }}>⚠ Superaste el presupuesto en {r.alertasPresupuesto.length} categoría{r.alertasPresupuesto.length>1?'s':''}</div>
          <div style={{ fontSize:10, color:t.amberSub, marginTop:2 }}>{r.alertasPresupuesto.map(p=>CAT_GASTO[p.categoria]?.label ?? p.categoria).join(', ')}</div>
        </div>
      )}

      {/* Cards principales */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div style={{ background:t.green, border:`1px solid ${t.greenBorder}`, borderRadius:14, padding:'14px 16px' }}>
          <div style={{ fontSize:10, color:t.greenNum, marginBottom:4 }}>Ingresos del mes</div>
          <div style={{ fontSize:26, fontWeight:800, fontFamily:'monospace', color:t.greenNum, lineHeight:1 }}>{fmt(r.totalIngresos)}</div>
        </div>
        <div style={{ background:t.red, border:`1px solid ${t.redBorder}`, borderRadius:14, padding:'14px 16px' }}>
          <div style={{ fontSize:10, color:t.redNum, marginBottom:4 }}>Gastos del mes</div>
          <div style={{ fontSize:26, fontWeight:800, fontFamily:'monospace', color:t.redNum, lineHeight:1 }}>{fmt(r.totalGastos)}</div>
        </div>
      </div>

      {/* Balance y tasa ahorro */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 16px', boxShadow:t.shadow }}>
          <div style={{ fontSize:10, color:t.textMuted, marginBottom:4 }}>Balance del mes</div>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'monospace', color: r.balance >= 0 ? t.greenNum : t.redNum, lineHeight:1 }}>{r.balance >= 0 ? '+' : ''}{fmt(r.balance)}</div>
        </div>
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 16px', boxShadow:t.shadow }}>
          <div style={{ fontSize:10, color:t.textMuted, marginBottom:4 }}>Tasa de ahorro</div>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'monospace', color:tasaColor, lineHeight:1 }}>{fmtPct(r.tasaAhorro)}</div>
          <div style={{ fontSize:9, color:t.textFaint, marginTop:2 }}>{r.tasaAhorro >= 20 ? '🏆 Excelente' : r.tasaAhorro >= 10 ? '✓ Bien' : r.tasaAhorro >= 0 ? '↓ Mejorable' : '🚨 Déficit'}</div>
        </div>
      </div>

      {/* Dependencia del negocio */}
      {s && (
        <div style={{ background:t.teal, border:`1px solid ${t.tealBorder}`, borderRadius:14, padding:'16px 18px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:t.tealNum, marginBottom:10 }}>📊 Dependencia del negocio</div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:36, fontWeight:800, fontFamily:'monospace', color:t.tealNum, lineHeight:1 }}>{fmtPct(s.pct_dependencia_negocio)}</div>
            <div>
              <div style={{ fontSize:11, color:t.tealNum }}>de tus ingresos vienen del negocio</div>
              <div style={{ fontSize:10, color:t.tealNum, opacity:0.7, marginTop:2 }}>
                {fmt(s.ingresos_del_negocio)} negocio · {fmt(s.ingresos_totales - s.ingresos_del_negocio)} otras fuentes
              </div>
            </div>
          </div>
          <div style={{ marginTop:10, height:8, borderRadius:4, background:`${t.tealNum}30`, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(s.pct_dependencia_negocio,100)}%`, background:t.tealNum, borderRadius:4, transition:'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize:10, color:t.tealNum, marginTop:6, opacity:0.8 }}>
            {s.pct_dependencia_negocio >= 90 ? '⚠ Alta dependencia — diversificar ingresos recomendado'
              : s.pct_dependencia_negocio >= 50 ? '✓ Dependencia moderada'
              : '🏆 Buena diversificación de ingresos'}
          </div>
        </div>
      )}

      {/* Distribución gastos */}
      {Object.keys(r.gastosPorCat).length > 0 && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 16px', boxShadow:t.shadow }}>
          <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:12 }}>Distribución de gastos personales</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(r.gastosPorCat).sort((a,b)=>b[1]-a[1]).map(([cat, monto]) => {
              const cfg = CAT_GASTO[cat] ?? { label: cat, icon:'•', color:'#6b7280' }
              const pct = r.totalGastos > 0 ? (monto / r.totalGastos) * 100 : 0
              const presup = personal.presupuesto.find(p => p.categoria === cat)
              const superado = presup && monto > toFloat(presup.monto_limite)
              return (
                <div key={cat} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, width:18, flexShrink:0 }}>{cfg.icon}</span>
                  <span style={{ fontSize:11, color:t.textMuted, width:90, flexShrink:0 }}>{cfg.label}</span>
                  <div style={{ flex:1, height:6, borderRadius:3, background:t.border, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background: superado ? t.redNum : cfg.color, borderRadius:3, transition:'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace', color: superado ? t.redNum : t.text, width:72, textAlign:'right', flexShrink:0 }}>{fmt(monto)}</span>
                  {superado && <span style={{ fontSize:9, color:t.redNum, flexShrink:0 }}>⚠</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── TAB INGRESOS / GASTOS (lista compartida) ───────────────────────────────
function TabMovimientos({ tipo, personal, t, onNuevo, onEditar, onEliminar }: {
  tipo: 'ingreso' | 'gasto'
  personal: ReturnType<typeof usePersonal>; t: Tema
  onNuevo: () => void
  onEditar: (item: Ingreso | GastoPersonal) => void
  onEliminar: (id: string, desc: string) => void
}) {
  const lista  = tipo === 'ingreso' ? personal.ingresos : personal.gastos
  const cats   = tipo === 'ingreso' ? CAT_INGRESO : CAT_GASTO
  const total  = lista.reduce((s, i) => s + toFloat(i.monto), 0)
  const color  = tipo === 'ingreso' ? t.greenNum : t.redNum

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:600 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, fontFamily:'monospace', color }}>{fmt(total)}</div>
          <div style={{ fontSize:11, color:t.textFaint }}>total del mes · {lista.length} registro{lista.length!==1?'s':''}</div>
        </div>
        <button onClick={onNuevo} style={{ padding:'8px 18px', borderRadius:10, border:'none', background:t.accent, color:t.accentText, fontSize:12, fontWeight:700, cursor:'pointer' }}>
          + {tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
        </button>
      </div>

      {personal.loading ? [1,2,3].map(i=><Sk key={i} h={64} radius={12} t={t} />) :
       lista.length === 0
        ? <div style={{ textAlign:'center', padding:'50px 20px', color:t.textFaint }}>
            <div style={{ fontSize:36, marginBottom:10 }}>{tipo==='ingreso'?'💰':'💸'}</div>
            <div style={{ fontSize:13, color:t.textMuted }}>Sin {tipo==='ingreso'?'ingresos':'gastos'} registrados este mes</div>
          </div>
        : lista.map(item => {
            const cfg = cats[item.categoria ?? 'otros'] ?? { label:'Otros', icon:'•', color:'#6b7280' }
            const fechaStr = new Date(item.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' })
            return (
              <div key={item.id} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:13, padding:'11px 14px', display:'flex', alignItems:'center', gap:12, boxShadow:t.shadow }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${cfg.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{cfg.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:t.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.descripcion}</div>
                  <div style={{ fontSize:10, color:t.textFaint, marginTop:1 }}>
                    {cfg.label} · {fechaStr}
                    {(item as GastoPersonal).recurrente && <span style={{ marginLeft:6, color:t.amberSub, fontWeight:600 }}>↻ recurrente</span>}
                  </div>
                </div>
                <div style={{ fontSize:16, fontWeight:800, fontFamily:'monospace', color, flexShrink:0 }}>{fmt(item.monto)}</div>
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  <button onClick={()=>onEditar(item)} title="Editar" style={{ width:28, height:28, borderRadius:7, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, cursor:'pointer', fontSize:12 }}>✎</button>
                  <button onClick={()=>onEliminar(item.id, item.descripcion)} title="Eliminar" style={{ width:28, height:28, borderRadius:7, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.redNum, cursor:'pointer', fontSize:12 }}>✕</button>
                </div>
              </div>
            )
          })
      }
    </div>
  )
}

// ── TAB PRESUPUESTO ────────────────────────────────────────────────────────
function TabPresupuesto({ personal, t, onEditar }: { personal: ReturnType<typeof usePersonal>; t: Tema; onEditar: (cat: string) => void }) {
  const todasCats = Object.keys(CAT_GASTO)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:560 }}>
      <div style={{ fontSize:12, color:t.textMuted }}>Definí un límite de gasto mensual por categoría. Finti te avisa cuando lo superás.</div>
      {todasCats.map(cat => {
        const cfg   = CAT_GASTO[cat]
        const presup = personal.presupuesto.find(p => p.categoria === cat)
        const gasto  = personal.resumen.gastosPorCat[cat] ?? 0
        const limite = presup ? toFloat(presup.monto_limite) : 0
        const pct    = limite > 0 ? Math.min((gasto / limite) * 100, 100) : 0
        const superado = limite > 0 && gasto > limite
        const barColor = superado ? t.redNum : pct > 75 ? t.amberSub : t.greenNum
        return (
          <div key={cat} style={{ background:t.surface, border:`1px solid ${superado ? t.redBorder : t.border}`, borderRadius:13, padding:'13px 16px', boxShadow:t.shadow }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>{cfg.icon}</span>
                <span style={{ fontSize:13, fontWeight:700, color:t.text }}>{cfg.label}</span>
                {superado && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:t.red, color:t.redNum }}>⚠ Superado</span>}
              </div>
              <button onClick={()=>onEditar(cat)}
                style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:11, cursor:'pointer' }}>
                {limite > 0 ? '✎ Editar' : '+ Límite'}
              </button>
            </div>
            {limite > 0 ? (
              <>
                <div style={{ height:8, borderRadius:4, background:t.border, overflow:'hidden', marginBottom:6 }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:4, transition:'width 0.4s ease' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:barColor, fontFamily:'monospace' }}>{fmt(gasto)} gastado</span>
                  <span style={{ fontSize:11, color:t.textFaint, fontFamily:'monospace' }}>límite: {fmt(limite)}</span>
                </div>
                {superado && <div style={{ fontSize:10, color:t.redNum, marginTop:4 }}>Excediste por {fmt(gasto - limite)}</div>}
              </>
            ) : (
              <div style={{ fontSize:11, color:t.textFaint }}>Sin límite definido · Gastado: {fmt(gasto)}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── TAB METAS ──────────────────────────────────────────────────────────────
function TabMetas({ personal, t, onNueva, onAbonar, onCambiarEstado, onEliminar }: {
  personal: ReturnType<typeof usePersonal>; t: Tema
  onNueva: () => void
  onAbonar: (m: Meta) => void
  onCambiarEstado: (id: string, estado: 'activa' | 'pausada' | 'completada') => void
  onEliminar: (id: string, nombre: string) => void
}) {
  const activas    = personal.metas.filter(m => m.estado === 'activa')
  const pausadas   = personal.metas.filter(m => m.estado === 'pausada')
  const completadas= personal.metas.filter(m => m.estado === 'completada')

  const MetaCard = ({ meta }: { meta: Meta }) => {
    const obj   = toFloat(meta.monto_objetivo)
    const act   = toFloat(meta.monto_actual)
    const pct   = obj > 0 ? Math.min((act / obj) * 100, 100) : 0
    const falta = obj - act
    const diasRestantes = meta.fecha_objetivo
      ? Math.max(0, Math.ceil((new Date(meta.fecha_objetivo).getTime() - Date.now()) / 86400000))
      : null
    const completada = meta.estado === 'completada'
    const pausada    = meta.estado === 'pausada'

    return (
      <div style={{ background:t.surface, border:`1px solid ${completada ? t.greenBorder : pausada ? t.border : t.border}`, borderRadius:14, padding:'14px 16px', boxShadow:t.shadow, opacity: pausada ? 0.7 : 1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:800, color:t.text }}>{completada ? '🏆' : pausada ? '⏸' : '🎯'} {meta.nombre}</span>
              {completada && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:t.green, color:t.greenNum }}>Completada</span>}
              {pausada    && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:t.surfaceAlt, color:t.textMuted }}>Pausada</span>}
            </div>
            {meta.fecha_objetivo && !completada && (
              <div style={{ fontSize:10, color: diasRestantes !== null && diasRestantes < 30 ? t.amberSub : t.textFaint, marginTop:2 }}>
                {diasRestantes !== null ? `${diasRestantes} días restantes` : ''}
                {' · '}{new Date(meta.fecha_objetivo + 'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })}
              </div>
            )}
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:18, fontWeight:800, fontFamily:'monospace', color: completada ? t.greenNum : t.text }}>{fmt(act)}</div>
            <div style={{ fontSize:10, color:t.textFaint }}>de {fmt(obj)}</div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div style={{ height:10, borderRadius:5, background:t.border, overflow:'hidden', marginBottom:6 }}>
          <div style={{ height:'100%', width:`${pct}%`, background: completada ? t.greenNum : pct >= 75 ? t.amberSub : t.blueNum, borderRadius:5, transition:'width 0.5s ease' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontSize:11, fontWeight:700, color: completada ? t.greenNum : t.blueNum }}>{pct.toFixed(0)}% completado</span>
          {!completada && <span style={{ fontSize:11, color:t.textFaint }}>Falta {fmt(falta)}</span>}
        </div>

        {/* Acciones */}
        <div style={{ display:'flex', gap:6 }}>
          {!completada && meta.estado === 'activa' && (
            <button onClick={()=>onAbonar(meta)} style={{ flex:1, padding:'7px 0', borderRadius:9, border:'none', background:t.accent, color:t.accentText, fontSize:11, fontWeight:700, cursor:'pointer' }}>💸 Abonar</button>
          )}
          {meta.estado === 'activa' && (
            <button onClick={()=>onCambiarEstado(meta.id, 'pausada')} style={{ padding:'7px 12px', borderRadius:9, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:11, cursor:'pointer' }}>⏸</button>
          )}
          {meta.estado === 'pausada' && (
            <button onClick={()=>onCambiarEstado(meta.id, 'activa')} style={{ flex:1, padding:'7px 0', borderRadius:9, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.text, fontSize:11, fontWeight:600, cursor:'pointer' }}>▶ Retomar</button>
          )}
          <button onClick={()=>onEliminar(meta.id, meta.nombre)} style={{ padding:'7px 12px', borderRadius:9, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.redNum, fontSize:11, cursor:'pointer' }}>✕</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:560 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:t.text }}>{activas.length} meta{activas.length!==1?'s':''} activa{activas.length!==1?'s':''}</div>
          <div style={{ fontSize:11, color:t.textFaint }}>Ahorro acumulado: {fmt(personal.resumen.ahorroTotal)}</div>
        </div>
        <button onClick={onNueva} style={{ padding:'8px 18px', borderRadius:10, border:'none', background:t.accent, color:t.accentText, fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Nueva meta</button>
      </div>

      {personal.loading ? [1,2].map(i=><Sk key={i} h={140} radius={14} t={t} />) : (
        <>
          {personal.metas.length === 0 && (
            <div style={{ textAlign:'center', padding:'50px 20px', color:t.textFaint }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
              <div style={{ fontSize:14, color:t.textMuted, fontWeight:600 }}>Sin metas de ahorro</div>
              <div style={{ fontSize:12, color:t.textFaint, marginTop:4 }}>Creá tu primera meta y empezá a ahorrar</div>
            </div>
          )}
          {activas.map(m => <MetaCard key={m.id} meta={m} />)}
          {pausadas.length > 0 && (
            <div style={{ fontSize:11, fontWeight:700, color:t.textFaint, textTransform:'uppercase', letterSpacing:'0.04em', marginTop:4 }}>Pausadas</div>
          )}
          {pausadas.map(m => <MetaCard key={m.id} meta={m} />)}
          {completadas.length > 0 && (
            <div style={{ fontSize:11, fontWeight:700, color:t.textFaint, textTransform:'uppercase', letterSpacing:'0.04em', marginTop:4 }}>Completadas 🏆</div>
          )}
          {completadas.map(m => <MetaCard key={m.id} meta={m} />)}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PERSONAL VIEW PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function PersonalView({ usuario, personal }: PersonalViewProps) {
  const [dark, setDark] = useDarkMode()
  const [isMobile,  setIsMobile]  = useState(false)
  const [tab,       setTab]       = useState<'resumen'|'ingresos'|'gastos'|'presupuesto'|'metas'>('resumen')

  const [modalMov,      setModalMov]      = useState<{tipo:'ingreso'|'gasto'; item?: Ingreso|GastoPersonal}|null>(null)
  const [modalMeta,     setModalMeta]     = useState(false)
  const [modalAbonar,   setModalAbonar]   = useState<Meta|null>(null)
  const [modalPresup,   setModalPresup]   = useState<string|null>(null)  // categoria
  const [confirmarDel,  setConfirmarDel]  = useState<{id:string;desc:string;tipo:'ingreso'|'gasto'|'meta'}|null>(null)

  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const t = dark ? tema.dark : tema.light

  const handleGuardarMov = async (data: NuevoIngresoData | NuevoGastoData) => {
    if (!modalMov) return
    try {
      if (modalMov.tipo === 'ingreso') {
        if (modalMov.item) await personal.editarIngreso(modalMov.item.id, data as NuevoIngresoData)
        else               await personal.agregarIngreso(data as NuevoIngresoData)
      } else {
        if (modalMov.item) await personal.editarGasto(modalMov.item.id, data as NuevoGastoData)
        else               await personal.agregarGasto(data as NuevoGastoData)
      }
      setModalMov(null)
    } catch (err) { console.error(err) }
  }

  const handleEliminar = async () => {
    if (!confirmarDel) return
    try {
      if (confirmarDel.tipo === 'ingreso') await personal.eliminarIngreso(confirmarDel.id)
      if (confirmarDel.tipo === 'gasto')   await personal.eliminarGasto(confirmarDel.id)
      if (confirmarDel.tipo === 'meta')    await personal.eliminarMeta(confirmarDel.id)
      setConfirmarDel(null)
    } catch (err) { console.error(err) }
  }

  const kpis = [
    { label:'Ingresos mes',  value: fmt(personal.resumen.totalIngresos),  icon:'💰', color: t.greenNum },
    { label:'Gastos mes',    value: fmt(personal.resumen.totalGastos),    icon:'💸', color: t.redNum   },
    { label:'Balance',       value: fmt(personal.resumen.balance),        icon:'📊', color: personal.resumen.balance >= 0 ? t.greenNum : t.redNum },
    { label:'Metas activas', value: personal.resumen.metasActivas.toString(), icon:'🎯', color: t.text },
  ]

  const TABS = [
    { key:'resumen',      label:'📊 Resumen'     },
    { key:'ingresos',     label:'💰 Ingresos'    },
    { key:'gastos',       label:'💸 Gastos'      },
    { key:'presupuesto',  label:'📋 Presupuesto' },
    { key:'metas',        label:'🎯 Metas'       },
  ] as const

  const content = (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:t.bg }}>
      {/* Header */}
      <div style={{ padding: isMobile ? '52px 20px 14px' : '18px 24px 14px', borderBottom:`1px solid ${t.border}`, background:t.surface, flexShrink:0 }}>
        <div style={{ fontSize: isMobile ? 20 : 18, fontWeight:800, color:t.text, letterSpacing:'-0.4px' }}>
          Finanzas personales
        </div>
        <div style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>
          {MESES[personal.mesActual]} {personal.anioActual}
          {personal.resumen.alertasPresupuesto.length > 0 && (
            <span style={{ color:t.amberSub, marginLeft:8 }}>⚠ {personal.resumen.alertasPresupuesto.length} presupuesto{personal.resumen.alertasPresupuesto.length>1?'s':''} superado{personal.resumen.alertasPresupuesto.length>1?'s':''}</span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding:'14px 20px 0', flexShrink:0 }}>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10 }}>
          {personal.loading ? [1,2,3,4].map(i=><Sk key={i} h={68} radius={12} t={t} />) : kpis.map((k,i) => (
            <div key={i} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'11px 14px', boxShadow:t.shadow }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:10, color:t.textMuted }}>{k.label}</span>
                <span style={{ fontSize:16 }}>{k.icon}</span>
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:k.color, fontFamily:'monospace' }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:'12px 20px 0', display:'flex', gap:5, overflowX:'auto', flexShrink:0 }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={()=>setTab(key)}
            style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${tab===key?t.accent:t.border}`, background:tab===key?(dark?'#2a2218':t.surfaceAlt):'transparent', color:tab===key?t.accent:t.textMuted, fontSize:11, fontWeight:tab===key?700:400, cursor:'pointer', whiteSpace:'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 20px', paddingBottom: isMobile ? 80 : 20 }}>
        {tab === 'resumen'     && <TabResumen personal={personal} t={t} />}
        {tab === 'ingresos'    && <TabMovimientos tipo="ingreso" personal={personal} t={t} onNuevo={()=>setModalMov({tipo:'ingreso'})} onEditar={item=>setModalMov({tipo:'ingreso',item:item as Ingreso})} onEliminar={(id,desc)=>setConfirmarDel({id,desc,tipo:'ingreso'})} />}
        {tab === 'gastos'      && <TabMovimientos tipo="gasto"   personal={personal} t={t} onNuevo={()=>setModalMov({tipo:'gasto'})}   onEditar={item=>setModalMov({tipo:'gasto',item:item as GastoPersonal})} onEliminar={(id,desc)=>setConfirmarDel({id,desc,tipo:'gasto'})} />}
        {tab === 'presupuesto' && <TabPresupuesto personal={personal} t={t} onEditar={cat=>setModalPresup(cat)} />}
        {tab === 'metas'       && <TabMetas personal={personal} t={t} onNueva={()=>setModalMeta(true)} onAbonar={setModalAbonar} onCambiarEstado={personal.cambiarEstadoMeta} onEliminar={(id,nombre)=>setConfirmarDel({id,desc:nombre,tipo:'meta'})} />}
      </div>

      {/* Bottom nav mobile */}
      {isMobile && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:t.navBg, backdropFilter:'blur(16px)', borderTop:`1px solid ${t.border}`, padding:'10px 0 20px', display:'flex', justifyContent:'space-around', zIndex:50 }}>
          {([['⊞','Inicio','/dashboard'],['↗','Ventas','/ventas'],['▦','Stock','/stock'],['📊','Costos','/costos'],['◉','Personal','/personal']] as [string,string,string][]).map(([ico,lbl,hr]) => (
            <div key={lbl} onClick={()=>hr&&router.push(hr)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, cursor:'pointer' }}>
              <div style={{ fontSize:18, color:lbl==='Personal'?t.accent:t.textFaint }}>{ico}</div>
              <div style={{ fontSize:9, color:lbl==='Personal'?t.accent:t.textFaint, fontWeight:lbl==='Personal'?700:400 }}>{lbl}</div>
              {lbl==='Personal' && <div style={{ width:4, height:4, borderRadius:'50%', background:t.accent }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#33302a;border-radius:4px;}
      `}</style>

      <div style={{ height:'100vh', display:'flex', background:t.bg, fontFamily:"'DM Sans',system-ui,sans-serif", overflow:'hidden' }}>
        {!isMobile && <Sidebar activo="personal" usuario={usuario} dark={dark} setDark={setDark} t={t} />}
        {content}
      </div>

      {/* Modales */}
      {modalMov && (
        <ModalMovimiento tipo={modalMov.tipo} item={modalMov.item} onConfirm={handleGuardarMov} onCancel={()=>setModalMov(null)} saving={personal.saving} t={t} />
      )}
      {modalMeta && (
        <ModalMeta onConfirm={async d => { await personal.crearMeta(d); setModalMeta(false) }} onCancel={()=>setModalMeta(false)} saving={personal.saving} t={t} />
      )}
      {modalAbonar && (
        <ModalAbonar meta={modalAbonar} onConfirm={async m => { await personal.abonarMeta(modalAbonar.id, m); setModalAbonar(null) }} onCancel={()=>setModalAbonar(null)} saving={personal.saving} t={t} />
      )}
      {modalPresup && (
        <ModalPresupuesto
          categoria={modalPresup}
          limiteActual={toFloat(personal.presupuesto.find(p=>p.categoria===modalPresup)?.monto_limite)}
          onConfirm={async m => { await personal.guardarPresupuesto({ categoria: modalPresup, monto_limite: m }); setModalPresup(null) }}
          onCancel={()=>setModalPresup(null)}
          saving={personal.saving} t={t}
        />
      )}

      {/* Confirmación eliminar */}
      {confirmarDel && (
        <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:320, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🗑</div>
            <div style={{ fontSize:15, fontWeight:800, color:t.text, marginBottom:8 }}>¿Eliminar?</div>
            <div style={{ fontSize:12, color:t.textMuted, marginBottom:20 }}><strong>{confirmarDel.desc}</strong><br/>Esta acción no se puede deshacer.</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setConfirmarDel(null)} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
              <button onClick={handleEliminar} disabled={personal.saving} style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.redNum, color:'#fff', fontSize:13, fontWeight:800, cursor: personal.saving?'wait':'pointer', opacity: personal.saving?0.7:1 }}>
                {personal.saving ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}