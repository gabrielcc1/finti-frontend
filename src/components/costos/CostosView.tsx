'use client'

// src/components/costos/CostosView.tsx
import { useState, useEffect } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import type { useCostos } from '@/hooks/useCostos'
import type { RentabilidadExtendida, ComboConItems, NuevoGastoData, ActualizarCostosProductoData, GastoItem } from '@/hooks/useCostos'
import type { Producto } from '@/types/database'

interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface CostosViewProps {
  usuario: UsuarioInfo
  costos: ReturnType<typeof useCostos>
}

const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0
const fmt     = (n: number | string | null | undefined) => `$${toFloat(n).toLocaleString('es-AR')}`
const fmtPct  = (n: number | null | undefined) => `${toFloat(n).toFixed(1)}%`

// ── Tema ───────────────────────────────────────────────────────────────────
const tema = {
  light: {
    bg:'#fafaf8', surface:'#ffffff', surfaceAlt:'#f5f5f2', border:'#e8e8e4', borderLight:'#f0f0ec',
    text:'#111827', textMuted:'#6b7280', textFaint:'#9ca3af',
    accent:'#111827', accentText:'#ffffff',
    amber:'#fffbeb', amberBorder:'#fde68a', amberSub:'#d97706',
    red:'#fff1f2', redBorder:'#fecdd3', redNum:'#dc2626',
    green:'#f0fdf4', greenBorder:'#bbf7d0', greenNum:'#16a34a',
    purple:'#faf5ff', purpleBorder:'#e9d5ff', purpleNum:'#7c3aed',
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
    purple:'#1a0e2a', purpleBorder:'#3d1a6e', purpleNum:'#c084fc',
    navBg:'rgba(20,18,16,0.95)', shadow:'0 1px 6px rgba(0,0,0,0.4)', shadowMd:'0 4px 20px rgba(0,0,0,0.5)',
    skeletonBase:'#211e1b', skeletonShine:'#2e2924',
  },
}
type Tema = typeof tema.light

function Sk({ h=16, radius=6, t }: { h?: number; radius?: number; t: Tema }) {
  return (
    <div style={{ height: h, borderRadius: radius, background: t.skeletonBase, overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg,transparent,${t.skeletonShine},transparent)`, animation:'shimmer 1.4s infinite' }} />
    </div>
  )
}

function MargenBadge({ pct, t }: { pct: number | null | undefined; t: Tema }) {
  const v = toFloat(pct)
  const cfg = v >= 40 ? { bg: t.green, color: t.greenNum }
            : v >= 20 ? { bg: t.amber, color: t.amberSub }
            :           { bg: t.red,   color: t.redNum }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      {fmtPct(v)}
    </span>
  )
}

// ── Input compartido ───────────────────────────────────────────────────────
const inputStyle = (t: Tema) => ({
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: `1.5px solid ${t.border}`, background: t.surfaceAlt,
  color: t.text, fontSize: 13, outline: 'none',
  fontFamily: "'DM Sans', system-ui, sans-serif",
})
const labelStyle = (t: Tema) => ({
  fontSize: 11, fontWeight: 600 as const, color: t.textMuted, marginBottom: 4, display: 'block' as const,
})

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: RENTABILIDAD
// ══════════════════════════════════════════════════════════════════════════════
function TabRentabilidad({
  costos, t, dark,
  onEditarCostos,
}: {
  costos: ReturnType<typeof useCostos>
  t: Tema; dark: boolean
  onEditarCostos: (p: RentabilidadExtendida) => void
}) {
  const [orden, setOrden] = useState<'margen' | 'ganancia' | 'nombre'>('margen')
  const [soloAlerta, setSoloAlerta] = useState(false)

  const lista = [...costos.productos]
    .filter(p => !soloAlerta || toFloat(p.margen_pct) < 20)
    .sort((a, b) => {
      if (orden === 'margen')    return toFloat(a.margen_pct) - toFloat(b.margen_pct)
      if (orden === 'ganancia')  return toFloat(b.ganancia_mes) - toFloat(a.ganancia_mes)
      return a.nombre.localeCompare(b.nombre)
    })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Alertas */}
      {costos.resumen.alertasMargen.length > 0 && (
        <div style={{ padding:'10px 14px', borderRadius:12, background:t.amber, border:`1px solid ${t.amberBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <span style={{ fontSize:12, fontWeight:700, color:t.amberSub }}>⚠ {costos.resumen.alertasMargen.length} producto{costos.resumen.alertasMargen.length>1?'s':''} con margen bajo 20%</span>
            <div style={{ fontSize:10, color:t.amberSub, marginTop:2 }}>{costos.resumen.alertasMargen.map(p=>p.nombre).join(', ')}</div>
          </div>
          <button onClick={()=>setSoloAlerta(v=>!v)}
            style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${t.amberBorder}`, background:'transparent', color:t.amberSub, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            {soloAlerta ? 'Ver todos' : 'Filtrar'}
          </button>
        </div>
      )}

      {costos.resumen.sinCosto.length > 0 && (
        <div style={{ padding:'10px 14px', borderRadius:12, background:t.purple, border:`1px solid ${t.purpleBorder}` }}>
          <span style={{ fontSize:12, fontWeight:700, color:t.purpleNum }}>ℹ {costos.resumen.sinCosto.length} producto{costos.resumen.sinCosto.length>1?'s':''} sin costo cargado</span>
          <div style={{ fontSize:10, color:t.purpleNum, marginTop:2 }}>{costos.resumen.sinCosto.map(p=>p.nombre).join(', ')}</div>
        </div>
      )}

      {/* Controles */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {(['margen','ganancia','nombre'] as const).map(o => (
          <button key={o} onClick={()=>setOrden(o)}
            style={{ padding:'6px 13px', borderRadius:20, border:`1.5px solid ${orden===o?t.accent:t.border}`, background:orden===o?t.surfaceAlt:'transparent', color:orden===o?t.accent:t.textMuted, fontSize:11, fontWeight:orden===o?700:400, cursor:'pointer' }}>
            {o === 'margen' ? '↑ Menor margen primero' : o === 'ganancia' ? '↓ Mayor ganancia' : 'A–Z'}
          </button>
        ))}
      </div>

      {/* Lista productos */}
      {costos.loading
        ? [1,2,3,4].map(i=><Sk key={i} h={80} radius={12} t={t} />)
        : lista.map(p => {
            const sinCosto = toFloat(p.costo_total) === 0
            const tieneEnvio = toFloat(p.costo_envio) > 0 || toFloat(p.costo_embalaje) > 0
            return (
              <div key={p.id} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'13px 16px', boxShadow:t.shadow }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:13, fontWeight:700, color:t.text }}>{p.nombre}</span>
                      {!sinCosto && <MargenBadge pct={p.margen_pct} t={t} />}
                      {sinCosto && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:t.purple, color:t.purpleNum }}>sin costo</span>}
                      {p.tipo_producto === 'combo' && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:t.surfaceAlt, color:t.textMuted }}>combo</span>}
                    </div>

                    {/* Desglose costos */}
                    <div style={{ display:'flex', gap:16, marginTop:8, flexWrap:'wrap' }}>
                      <div style={{ fontSize:10, color:t.textFaint }}>
                        Precio: <span style={{ fontWeight:700, color:t.text, fontFamily:'monospace' }}>{fmt(p.precio)}</span>
                      </div>
                      <div style={{ fontSize:10, color:t.textFaint }}>
                        Costo prod: <span style={{ fontWeight:700, color:t.text, fontFamily:'monospace' }}>{fmt(p.costo)}</span>
                      </div>
                      {tieneEnvio && <>
                        {toFloat(p.costo_envio) > 0 && (
                          <div style={{ fontSize:10, color:t.textFaint }}>
                            Envío: <span style={{ fontWeight:700, color:t.amberSub, fontFamily:'monospace' }}>{fmt(p.costo_envio)}</span>
                          </div>
                        )}
                        {toFloat(p.costo_embalaje) > 0 && (
                          <div style={{ fontSize:10, color:t.textFaint }}>
                            Embalaje: <span style={{ fontWeight:700, color:t.amberSub, fontFamily:'monospace' }}>{fmt(p.costo_embalaje)}</span>
                          </div>
                        )}
                        <div style={{ fontSize:10, color:t.textFaint }}>
                          Costo total: <span style={{ fontWeight:700, color:t.text, fontFamily:'monospace' }}>{fmt(p.costo_total)}</span>
                        </div>
                      </>}
                    </div>
                  </div>

                  {/* Ganancia + botón */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    {!sinCosto && (
                      <>
                        <div style={{ fontSize:18, fontWeight:800, color:t.greenNum, fontFamily:'monospace', lineHeight:1 }}>{fmt(p.ganancia_unitaria)}</div>
                        <div style={{ fontSize:9, color:t.textFaint }}>por unidad</div>
                        {toFloat(p.ganancia_mes) > 0 && (
                          <div style={{ fontSize:10, color:t.textMuted, marginTop:4 }}>{fmt(p.ganancia_mes)}<span style={{ color:t.textFaint }}> este mes</span></div>
                        )}
                      </>
                    )}
                    <button onClick={()=>onEditarCostos(p)}
                      style={{ marginTop:8, padding:'5px 12px', borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:11, cursor:'pointer' }}>
                      ✎ Costos
                    </button>
                  </div>
                </div>
              </div>
            )
          })
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: SIMULADOR DE PRECIO
// ══════════════════════════════════════════════════════════════════════════════
function TabSimulador({
  costos, t, onGuardar,
}: {
  costos: ReturnType<typeof useCostos>
  t: Tema
  onGuardar: (id: string, precio: number) => void
}) {
  const [selId,    setSelId]    = useState<string>(costos.productos[0]?.id ?? '')
  const [precio,   setPrecio]   = useState(0)
  const [guardado, setGuardado] = useState(false)

  const prod = costos.productos.find(p => p.id === selId)

  useEffect(() => {
    if (prod) { setPrecio(toFloat(prod.precio)); setGuardado(false) }
  }, [selId, prod])

  const costoTotal = toFloat(prod?.costo_total)
  const ganancia   = precio - costoTotal
  const margen     = precio > 0 ? (ganancia / precio) * 100 : 0
  const margenColor = margen >= 40 ? t.greenNum : margen >= 20 ? t.amberSub : t.redNum

  const handleGuardar = () => {
    if (!selId || precio <= 0) return
    onGuardar(selId, precio)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  if (costos.productos.length === 0) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:t.textFaint }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
      <div style={{ fontSize:14, color:t.textMuted }}>Cargá al menos un producto con costo para usar el simulador</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:520 }}>
      {/* Selector de producto */}
      <div>
        <label style={labelStyle(t)}>Producto a simular</label>
        <select value={selId} onChange={e=>setSelId(e.target.value)} style={{ ...inputStyle(t), cursor:'pointer' }}>
          {costos.productos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre} — costo: {fmt(p.costo_total)}</option>
          ))}
        </select>
      </div>

      {prod && (
        <>
          {/* Desglose de costos */}
          <div style={{ padding:'14px 16px', borderRadius:13, background:t.surfaceAlt, border:`1px solid ${t.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:t.textMuted, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.04em' }}>Desglose de costos</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                ['Costo de producción / compra', prod.costo],
                ['Costo de envío',  prod.costo_envio],
                ['Costo de embalaje', prod.costo_embalaje],
              ].map(([label, val]) => toFloat(val) > 0 && (
                <div key={label as string} style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:t.textMuted }}>{label as string}</span>
                  <span style={{ fontSize:12, fontWeight:700, fontFamily:'monospace', color:t.text }}>{fmt(val)}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, borderTop:`1px solid ${t.border}`, marginTop:2 }}>
                <span style={{ fontSize:12, fontWeight:700, color:t.text }}>Costo total</span>
                <span style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', color:t.text }}>{fmt(costoTotal)}</span>
              </div>
            </div>
          </div>

          {/* Slider de precio */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <label style={labelStyle(t)}>Precio de venta</label>
              <span style={{ fontSize:13, fontWeight:800, fontFamily:'monospace', color:t.text }}>{fmt(precio)}</span>
            </div>
            <input
              type="range"
              min={Math.max(costoTotal * 0.5, 1)}
              max={Math.max(costoTotal * 4, precio * 2, 1000)}
              step={Math.max(Math.round(costoTotal / 100) * 10, 10)}
              value={precio}
              onChange={e=>setPrecio(parseFloat(e.target.value))}
              style={{ width:'100%', accentColor:t.accent, cursor:'pointer' }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              <span style={{ fontSize:9, color:t.textFaint }}>Sin ganancia</span>
              <span style={{ fontSize:9, color:t.textFaint }}>4× el costo</span>
            </div>

            {/* Input manual */}
            <div style={{ marginTop:8 }}>
              <label style={labelStyle(t)}>O ingresá el precio manualmente</label>
              <input
                type="number" min="0" value={precio}
                onChange={e=>setPrecio(parseFloat(e.target.value)||0)}
                style={inputStyle(t)}
              />
            </div>
          </div>

          {/* Panel de resultados */}
          <div style={{ padding:'18px 20px', borderRadius:16, background:t.surface, border:`2px solid ${margenColor}22`, boxShadow:t.shadowMd }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <div style={{ fontSize:10, color:t.textFaint, marginBottom:4 }}>Ganancia por unidad</div>
                <div style={{ fontSize:28, fontWeight:800, fontFamily:'monospace', color: ganancia > 0 ? t.greenNum : t.redNum, lineHeight:1 }}>
                  {fmt(ganancia)}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:t.textFaint, marginBottom:4 }}>Margen</div>
                <div style={{ fontSize:28, fontWeight:800, fontFamily:'monospace', color:margenColor, lineHeight:1 }}>
                  {fmtPct(margen)}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:t.textFaint, marginBottom:4 }}>Precio actual</div>
                <div style={{ fontSize:16, fontWeight:700, fontFamily:'monospace', color:t.textMuted }}>{fmt(prod.precio)}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:t.textFaint, marginBottom:4 }}>Diferencia</div>
                <div style={{ fontSize:16, fontWeight:700, fontFamily:'monospace', color: precio > toFloat(prod.precio) ? t.greenNum : precio < toFloat(prod.precio) ? t.redNum : t.textMuted }}>
                  {precio > toFloat(prod.precio) ? '+' : ''}{fmt(precio - toFloat(prod.precio))}
                </div>
              </div>
            </div>

            {/* Semáforo de margen */}
            <div style={{ marginTop:16, padding:'8px 12px', borderRadius:10, background: margen >= 40 ? t.green : margen >= 20 ? t.amber : t.red, textAlign:'center' }}>
              <span style={{ fontSize:12, fontWeight:700, color:margenColor }}>
                {margen < 0   ? '🚨 Estás vendiendo a pérdida'
                : margen < 20 ? '⚠ Margen bajo — revisá el precio'
                : margen < 40 ? '✓ Margen aceptable'
                :               '🏆 Excelente margen'}
              </span>
            </div>
          </div>

          <button onClick={handleGuardar} disabled={costos.saving || precio === toFloat(prod.precio)}
            style={{ padding:14, borderRadius:12, border:'none', background: guardado ? t.green : t.accent, color: guardado ? t.greenNum : t.accentText, fontSize:13, fontWeight:800, cursor: costos.saving ? 'wait' : 'pointer', opacity: precio === toFloat(prod.precio) ? 0.5 : 1 }}>
            {guardado ? '✓ Precio actualizado' : costos.saving ? 'Guardando...' : `Aplicar precio ${fmt(precio)}`}
          </button>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: COMBOS Y PROMOCIONES
// ══════════════════════════════════════════════════════════════════════════════
function TabCombos({
  costos, t,
  onCrear,
}: {
  costos: ReturnType<typeof useCostos>
  t: Tema
  onCrear: () => void
}) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:t.text }}>{costos.combos.length} combo{costos.combos.length!==1?'s':''} definido{costos.combos.length!==1?'s':''}</div>
          <div style={{ fontSize:11, color:t.textFaint }}>Los combos aparecen en Ventas como cualquier producto</div>
        </div>
        <button onClick={onCrear}
          style={{ padding:'8px 16px', borderRadius:10, border:'none', background:t.accent, color:t.accentText, fontSize:12, fontWeight:700, cursor:'pointer' }}>
          + Nuevo combo
        </button>
      </div>

      {costos.loading ? [1,2].map(i=><Sk key={i} h={100} radius={12} t={t} />) :
       costos.combos.length === 0
        ? <div style={{ textAlign:'center', padding:'50px 20px', color:t.textFaint }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎁</div>
            <div style={{ fontSize:14, color:t.textMuted, fontWeight:600 }}>Sin combos creados</div>
            <div style={{ fontSize:12, color:t.textFaint, marginTop:6, maxWidth:280, margin:'8px auto 0' }}>
              Creá un combo para calcular su costo real y margen automáticamente
            </div>
          </div>
        : costos.combos.map(c => (
            <div key={c.producto.id} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 16px', boxShadow:t.shadow }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:t.text }}>🎁 {c.producto.nombre}</span>
                    <MargenBadge pct={c.margen_calculado} t={t} />
                  </div>
                  <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
                    {c.items.map(item => (
                      <div key={item.id} style={{ fontSize:11, color:t.textMuted, display:'flex', gap:8 }}>
                        <span style={{ color:t.textFaint }}>·</span>
                        <span>{item.componente?.nombre ?? 'Producto'}</span>
                        <span style={{ color:t.textFaint }}>×{item.cantidad}</span>
                        <span style={{ color:t.text, fontFamily:'monospace' }}>{fmt(toFloat(item.componente?.costo_unitario) * item.cantidad)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color:t.textFaint }}>Precio</div>
                  <div style={{ fontSize:18, fontWeight:800, fontFamily:'monospace', color:t.text }}>{fmt(c.producto.precio_unitario)}</div>
                  <div style={{ fontSize:10, color:t.textFaint, marginTop:4 }}>Costo real: {fmt(c.costo_calculado)}</div>
                  <div style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', color:t.greenNum, marginTop:2 }}>{fmt(toFloat(c.producto.precio_unitario) - c.costo_calculado)}</div>
                  <div style={{ fontSize:9, color:t.textFaint }}>ganancia/unidad</div>
                </div>
              </div>
            </div>
          ))
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4: GASTOS FIJOS Y PUNTO DE EQUILIBRIO
// ══════════════════════════════════════════════════════════════════════════════
function TabGastos({
  costos, t,
  onAgregarGasto, onEditarGasto, onEliminarGasto,
}: {
  costos: ReturnType<typeof useCostos>
  t: Tema
  onAgregarGasto: () => void
  onEditarGasto: (g: import('@/hooks/useCostos').GastoItem) => void
  onEliminarGasto: (id: string, desc: string) => void
}) {
  const g = costos.gastosMes
  const categorias = g ? [
    { label:'Alquiler',      monto: g.alquiler,      color:'#7c3aed', icon:'🏠' },
    { label:'Sueldos',       monto: g.sueldos,        color:'#0d9488', icon:'👥' },
    { label:'Servicios',     monto: g.servicios,      color:'#d97706', icon:'⚡' },
    { label:'Materia prima', monto: g.materia_prima,  color:'#dc2626', icon:'🌾' },
    { label:'Insumos',       monto: g.insumos,        color:'#9333ea', icon:'📦' },
    { label:'Impuestos',     monto: g.impuestos,      color:'#c2410c', icon:'📋' },
    { label:'Otros',         monto: g.otros,          color:'#6b7280', icon:'•' },
  ].filter(c => c.monto > 0) : []

  const totalGastos = g?.total_mes ?? 0
  const gananciaPromedio = costos.resumen.gananciaEstimadaMes
  const resultado = gananciaPromedio - totalGastos

  const catIcon: Record<string, string> = {
    alquiler:'🏠', sueldos:'👥', servicios:'⚡', materia_prima:'🌾',
    insumos:'📦', impuestos:'📋', compras:'🛒', otros:'•'
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:600 }}>
      {/* Resumen mensual */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        {[
          { label:'Gastos del mes',    value: fmt(totalGastos),       color: t.redNum },
          { label:'Ganancia estimada', value: fmt(gananciaPromedio),  color: t.greenNum },
          { label:'Resultado neto',    value: fmt(resultado),         color: resultado > 0 ? t.greenNum : t.redNum },
        ].map((k,i) => (
          <div key={i} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'12px 14px', boxShadow:t.shadow }}>
            <div style={{ fontSize:10, color:t.textMuted, marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:18, fontWeight:800, fontFamily:'monospace', color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Punto de equilibrio */}
      <div style={{ padding:'16px 18px', borderRadius:14, background:t.surfaceAlt, border:`1px solid ${t.border}` }}>
        <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:6 }}>📍 Punto de equilibrio mensual</div>
        <div style={{ fontSize:32, fontWeight:800, fontFamily:'monospace', color:t.accent, lineHeight:1 }}>
          {costos.resumen.puntoEquilibrio.toLocaleString('es-AR')}
        </div>
        <div style={{ fontSize:12, color:t.textMuted, marginTop:4 }}>
          ventas promedio necesarias para cubrir {fmt(totalGastos)} de gastos fijos
        </div>
      </div>

      {/* Distribución de gastos */}
      {categorias.length > 0 && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 16px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:12 }}>Distribución de gastos</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {categorias.sort((a,b)=>b.monto-a.monto).map(c => {
              const pct = totalGastos > 0 ? (c.monto / totalGastos) * 100 : 0
              return (
                <div key={c.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:12, width:16 }}>{c.icon}</span>
                  <span style={{ fontSize:11, color:t.textMuted, width:100, flexShrink:0 }}>{c.label}</span>
                  <div style={{ flex:1, height:6, borderRadius:3, background:t.border, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:c.color, borderRadius:3, transition:'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace', color:t.text, width:80, textAlign:'right', flexShrink:0 }}>{fmt(c.monto)}</span>
                  <span style={{ fontSize:9, color:t.textFaint, width:36, textAlign:'right', flexShrink:0 }}>{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de gastos individuales con editar/eliminar */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:t.text }}>Gastos del mes</div>
          <button onClick={onAgregarGasto}
            style={{ padding:'6px 14px', borderRadius:9, border:'none', background:t.accent, color:t.accentText, fontSize:11, fontWeight:700, cursor:'pointer' }}>
            + Agregar
          </button>
        </div>

        {costos.gastosLista.length === 0
          ? <div style={{ textAlign:'center', padding:'24px 0', color:t.textFaint, fontSize:12 }}>Sin gastos registrados este mes</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {costos.gastosLista.map(gasto => (
                <div key={gasto.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:t.surfaceAlt, border:`1px solid ${t.borderLight}` }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>{catIcon[gasto.categoria ?? 'otros'] ?? '•'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:t.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{gasto.descripcion}</div>
                    <div style={{ fontSize:10, color:t.textFaint, marginTop:1 }}>
                      {gasto.categoria?.replace('_',' ') ?? '—'} · {new Date(gasto.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' })}
                    </div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', color:t.redNum, flexShrink:0 }}>{fmt(gasto.monto)}</div>
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    <button onClick={() => onEditarGasto(gasto)}
                      title="Editar"
                      style={{ width:28, height:28, borderRadius:7, border:`1px solid ${t.border}`, background:t.surface, color:t.textMuted, cursor:'pointer', fontSize:12 }}>
                      ✎
                    </button>
                    <button onClick={() => onEliminarGasto(gasto.id, gasto.descripcion)}
                      title="Eliminar"
                      style={{ width:28, height:28, borderRadius:7, border:`1px solid ${t.border}`, background:t.surface, color:t.redNum, cursor:'pointer', fontSize:12 }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5: RECETAS (fabricantes)
// ══════════════════════════════════════════════════════════════════════════════
function TabRecetas({
  costos, t,
  onAgregarIngrediente,
}: {
  costos: ReturnType<typeof useCostos>
  t: Tema
  onAgregarIngrediente: () => void
}) {
  // Agrupar recetas por producto
  const porProducto = costos.recetas.reduce((acc, r) => {
    if (!acc[r.producto_id]) acc[r.producto_id] = []
    acc[r.producto_id].push(r)
    return acc
  }, {} as Record<string, typeof costos.recetas>)

  const productosConReceta = costos.todosProductos.filter(p => porProducto[p.id])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:t.text }}>Recetas de fabricación</div>
          <div style={{ fontSize:11, color:t.textFaint }}>El costo del producto se recalcula automáticamente al comprar insumos</div>
        </div>
        <button onClick={onAgregarIngrediente}
          style={{ padding:'8px 16px', borderRadius:10, border:'none', background:t.accent, color:t.accentText, fontSize:12, fontWeight:700, cursor:'pointer' }}>
          + Agregar ingrediente
        </button>
      </div>

      {costos.materias.length === 0 && (
        <div style={{ padding:'12px 16px', borderRadius:12, background:t.purple, border:`1px solid ${t.purpleBorder}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:t.purpleNum }}>ℹ Primero cargá tus materias primas en el módulo Stock → Tab Insumos</div>
        </div>
      )}

      {costos.loading ? [1,2].map(i=><Sk key={i} h={90} radius={12} t={t} />) :
       productosConReceta.length === 0
        ? <div style={{ textAlign:'center', padding:'50px 20px', color:t.textFaint }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🧪</div>
            <div style={{ fontSize:14, color:t.textMuted, fontWeight:600 }}>Sin recetas definidas</div>
            <div style={{ fontSize:12, color:t.textFaint, marginTop:6 }}>Solo para emprendedores que fabrican sus productos</div>
          </div>
        : productosConReceta.map(prod => {
            const items = porProducto[prod.id] ?? []
            const costoReceta = items.reduce((s, r) => s + toFloat(r.mp?.costo_por_unidad) * toFloat(r.cantidad), 0)
            return (
              <div key={prod.id} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 16px', boxShadow:t.shadow }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:t.text }}>🧪 {prod.nombre}</div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:10, color:t.textFaint }}>Costo por receta</div>
                    <div style={{ fontSize:18, fontWeight:800, fontFamily:'monospace', color:t.text }}>{fmt(costoReceta)}</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {items.map(r => (
                    <div key={r.materia_prima_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 10px', borderRadius:8, background:t.surfaceAlt }}>
                      <span style={{ flex:1, fontSize:12, color:t.text }}>{r.mp?.nombre ?? '—'}</span>
                      <span style={{ fontSize:11, color:t.textMuted, fontFamily:'monospace' }}>{toFloat(r.cantidad).toLocaleString('es-AR')} {r.mp?.unidad}</span>
                      <span style={{ fontSize:11, color:t.textFaint }}>{fmt(r.mp?.costo_por_unidad)}/{r.mp?.unidad}</span>
                      <span style={{ fontSize:12, fontWeight:700, fontFamily:'monospace', color:t.text }}>{fmt(toFloat(r.mp?.costo_por_unidad) * toFloat(r.cantidad))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MODALES
// ══════════════════════════════════════════════════════════════════════════════

function ModalEditarCostos({ prod, onConfirm, onCancel, saving, t }: {
  prod: RentabilidadExtendida
  onConfirm: (id: string, data: ActualizarCostosProductoData) => void
  onCancel: () => void
  saving: boolean
  t: Tema
}) {
  const [costo,    setCosto]    = useState(toFloat(prod.costo).toString())
  const [envio,    setEnvio]    = useState(toFloat(prod.costo_envio).toString())
  const [embalaje, setEmbalaje] = useState(toFloat(prod.costo_embalaje).toString())

  const costoTotal = (parseFloat(costo)||0) + (parseFloat(envio)||0) + (parseFloat(embalaje)||0)
  const precio = toFloat(prod.precio)
  const margen = precio > 0 ? ((precio - costoTotal) / precio) * 100 : 0
  const margenColor = margen >= 40 ? '#16a34a' : margen >= 20 ? '#d97706' : '#dc2626'

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:400, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:4 }}>Editar costos</div>
        <div style={{ fontSize:12, color:t.textMuted, marginBottom:20 }}>{prod.nombre} · Precio: {fmt(prod.precio)}</div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={labelStyle(t)}>Costo de producción / compra $</label>
            <input type="number" min="0" value={costo} onChange={e=>setCosto(e.target.value)} style={inputStyle(t)} autoFocus />
          </div>
          <div>
            <label style={labelStyle(t)}>Costo de envío $ <span style={{ fontWeight:400, color:t.textFaint }}>(por unidad)</span></label>
            <input type="number" min="0" value={envio} onChange={e=>setEnvio(e.target.value)} style={inputStyle(t)} />
          </div>
          <div>
            <label style={labelStyle(t)}>Costo de embalaje $ <span style={{ fontWeight:400, color:t.textFaint }}>(caja, bolsa, etc.)</span></label>
            <input type="number" min="0" value={embalaje} onChange={e=>setEmbalaje(e.target.value)} style={inputStyle(t)} />
          </div>

          {/* Preview */}
          <div style={{ padding:'10px 14px', borderRadius:10, background:t.surfaceAlt, border:`1px solid ${t.border}` }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:t.textMuted }}>Costo total</span>
              <span style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', color:t.text }}>{fmt(costoTotal)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              <span style={{ fontSize:11, color:t.textMuted }}>Margen resultante</span>
              <span style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', color:margenColor }}>{fmtPct(margen)}</span>
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
            <button onClick={()=>onConfirm(prod.id, { costo_unitario: parseFloat(costo)||0, costo_envio: parseFloat(envio)||0, costo_embalaje: parseFloat(embalaje)||0 })}
              disabled={saving}
              style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor: saving?'wait':'pointer', opacity: saving?0.7:1 }}>
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalNuevoCombo({ costos, onConfirm, onCancel, saving, t }: {
  costos: ReturnType<typeof useCostos>
  onConfirm: (data: { nombre: string; precio: number; items: { componente_id: string; cantidad: number }[] }) => void
  onCancel: () => void
  saving: boolean
  t: Tema
}) {
  const [nombre,  setNombre]  = useState('')
  const [precio,  setPrecio]  = useState('')
  const [items,   setItems]   = useState<{ componente_id: string; cantidad: number }[]>([{ componente_id: costos.todosProductos.filter(p=>p.tipo_producto!=='combo')[0]?.id ?? '', cantidad: 1 }])
  const [error,   setError]   = useState('')

  const productosBase = costos.todosProductos.filter(p => p.tipo_producto !== 'combo')

  const costoCalculado = items.reduce((s, item) => {
    const prod = productosBase.find(p => p.id === item.componente_id)
    return s + toFloat(prod?.costo_unitario) * item.cantidad
  }, 0)

  const precioNum = parseFloat(precio) || 0
  const margen = precioNum > 0 ? ((precioNum - costoCalculado) / precioNum) * 100 : 0

  const agregarItem = () => setItems(prev => [...prev, { componente_id: productosBase[0]?.id ?? '', cantidad: 1 }])
  const quitarItem  = (idx: number) => setItems(prev => prev.filter((_,i) => i !== idx))
  const cambiarItem = (idx: number, campo: 'componente_id' | 'cantidad', val: string | number) =>
    setItems(prev => prev.map((item,i) => i === idx ? { ...item, [campo]: val } : item))

  const handleSubmit = () => {
    if (!nombre.trim())         { setError('Ingresá un nombre'); return }
    if (!precio || precioNum<=0){ setError('Ingresá un precio'); return }
    if (items.some(i=>!i.componente_id)) { setError('Completá todos los componentes'); return }
    setError('')
    onConfirm({ nombre: nombre.trim(), precio: precioNum, items })
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:460, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:18 }}>🎁 Nuevo combo</div>

        <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
          <div>
            <label style={labelStyle(t)}>Nombre del combo *</label>
            <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Combo desayuno, Pack 3x2..." style={inputStyle(t)} autoFocus />
          </div>
          <div>
            <label style={labelStyle(t)}>Precio de venta *</label>
            <input type="number" min="0" value={precio} onChange={e=>setPrecio(e.target.value)} placeholder="0" style={inputStyle(t)} />
          </div>

          {/* Items del combo */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <label style={labelStyle(t)}>Componentes del combo</label>
              <button onClick={agregarItem} style={{ fontSize:11, color:t.accent, background:'transparent', border:'none', cursor:'pointer', fontWeight:700 }}>+ Agregar</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <select value={item.componente_id} onChange={e=>cambiarItem(idx,'componente_id',e.target.value)}
                    style={{ ...inputStyle(t), flex:3, cursor:'pointer' }}>
                    {productosBase.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <input type="number" min="0.1" step="0.1" value={item.cantidad}
                    onChange={e=>cambiarItem(idx,'cantidad',parseFloat(e.target.value)||1)}
                    style={{ ...inputStyle(t), flex:1, textAlign:'center' }} />
                  {items.length > 1 && (
                    <button onClick={()=>quitarItem(idx)} style={{ width:28, height:36, borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.redNum, cursor:'pointer', flexShrink:0 }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {precioNum > 0 && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:t.surfaceAlt, border:`1px solid ${t.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, color:t.textMuted }}>Costo calculado</span>
                <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:t.text }}>{fmt(costoCalculado)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={{ fontSize:11, color:t.textMuted }}>Ganancia por combo</span>
                <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:t.greenNum }}>{fmt(precioNum - costoCalculado)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={{ fontSize:11, color:t.textMuted }}>Margen</span>
                <span style={{ fontSize:13, fontWeight:800, fontFamily:'monospace', color: margen >= 40 ? t.greenNum : margen >= 20 ? t.amberSub : t.redNum }}>{fmtPct(margen)}</span>
              </div>
            </div>
          )}

          {error && <div style={{ fontSize:11, color:t.redNum }}>{error}</div>}

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor: saving?'wait':'pointer', opacity: saving?0.7:1 }}>
              {saving ? 'Creando...' : '✓ Crear combo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalNuevoGasto({ onConfirm, onCancel, saving, t }: {
  onConfirm: (data: NuevoGastoData) => void
  onCancel: () => void
  saving: boolean
  t: Tema
}) {
  const [desc,  setDesc]  = useState('')
  const [monto, setMonto] = useState('')
  const [cat,   setCat]   = useState('servicios')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10))
  const [error, setError] = useState('')

  const categorias = ['alquiler','sueldos','servicios','materia_prima','insumos','impuestos','compras','otros']

  const handleSubmit = () => {
    if (!desc.trim())         { setError('Ingresá una descripción'); return }
    if (!monto || toFloat(monto)<=0) { setError('Ingresá un monto válido'); return }
    setError('')
    onConfirm({ descripcion: desc.trim(), monto: toFloat(monto), categoria: cat, fecha })
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:380, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:18 }}>Registrar gasto</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={labelStyle(t)}>Categoría</label>
            <select value={cat} onChange={e=>setCat(e.target.value)} style={{ ...inputStyle(t), cursor:'pointer' }}>
              {categorias.map(c => <option key={c} value={c}>{c.replace('_',' ').replace(/^\w/,l=>l.toUpperCase())}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(t)}>Descripción *</label>
            <input type="text" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ej: Alquiler local enero" style={inputStyle(t)} autoFocus />
          </div>
          <div>
            <label style={labelStyle(t)}>Monto $</label>
            <input type="number" min="0" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0" style={inputStyle(t)} />
          </div>
          <div>
            <label style={labelStyle(t)}>Fecha</label>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inputStyle(t)} />
          </div>
          {error && <div style={{ fontSize:11, color:t.redNum }}>{error}</div>}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor: saving?'wait':'pointer', opacity: saving?0.7:1 }}>
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalEditarGasto({ gasto, onConfirm, onCancel, saving, t }: {
  gasto: GastoItem
  onConfirm: (id: string, data: NuevoGastoData) => void
  onCancel: () => void
  saving: boolean
  t: Tema
}) {
  const [desc,  setDesc]  = useState(gasto.descripcion)
  const [monto, setMonto] = useState(toFloat(gasto.monto).toString())
  const [cat,   setCat]   = useState(gasto.categoria ?? 'otros')
  const [fecha, setFecha] = useState(gasto.fecha)
  const [error, setError] = useState('')

  const categorias = ['alquiler','sueldos','servicios','materia_prima','insumos','impuestos','compras','otros']

  const handleSubmit = () => {
    if (!desc.trim())              { setError('Ingresá una descripción'); return }
    if (!monto || toFloat(monto)<=0) { setError('Ingresá un monto válido'); return }
    setError('')
    onConfirm(gasto.id, { descripcion: desc.trim(), monto: toFloat(monto), categoria: cat, fecha })
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:380, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:18 }}>Editar gasto</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={labelStyle(t)}>Categoría</label>
            <select value={cat} onChange={e=>setCat(e.target.value)} style={{ ...inputStyle(t), cursor:'pointer' }}>
              {categorias.map(c => <option key={c} value={c}>{c.replace('_',' ').replace(/^\w/,l=>l.toUpperCase())}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(t)}>Descripción *</label>
            <input type="text" value={desc} onChange={e=>setDesc(e.target.value)} style={inputStyle(t)} autoFocus />
          </div>
          <div>
            <label style={labelStyle(t)}>Monto $</label>
            <input type="number" min="0" value={monto} onChange={e=>setMonto(e.target.value)} style={inputStyle(t)} />
          </div>
          <div>
            <label style={labelStyle(t)}>Fecha</label>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inputStyle(t)} />
          </div>
          {error && <div style={{ fontSize:11, color:t.redNum }}>{error}</div>}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor: saving?'wait':'pointer', opacity: saving?0.7:1 }}>
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalAgregarIngrediente({ costos, onConfirm, onCancel, saving, t }: {
  costos: ReturnType<typeof useCostos>
  onConfirm: (data: { producto_id: string; materia_prima_id: string; cantidad: number }) => void
  onCancel: () => void
  saving: boolean
  t: Tema
}) {
  const productos = costos.todosProductos.filter(p => p.tipo_producto !== 'combo')
  const [prodId, setProdId] = useState(productos[0]?.id ?? '')
  const [mpId,   setMpId]   = useState(costos.materias[0]?.id ?? '')
  const [cant,   setCant]   = useState('1')
  const [error,  setError]  = useState('')

  const mp   = costos.materias.find(m => m.id === mpId)
  const aporte = (parseFloat(cant)||0) * toFloat(mp?.costo_por_unidad)

  const handleSubmit = () => {
    if (!prodId || !mpId) { setError('Seleccioná producto y materia prima'); return }
    if (!cant || parseFloat(cant) <= 0) { setError('Ingresá una cantidad válida'); return }
    setError('')
    onConfirm({ producto_id: prodId, materia_prima_id: mpId, cantidad: parseFloat(cant) })
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:400, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:18 }}>🧪 Agregar ingrediente</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={labelStyle(t)}>Producto terminado</label>
            <select value={prodId} onChange={e=>setProdId(e.target.value)} style={{ ...inputStyle(t), cursor:'pointer' }}>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(t)}>Materia prima</label>
            <select value={mpId} onChange={e=>setMpId(e.target.value)} style={{ ...inputStyle(t), cursor:'pointer' }}>
              {costos.materias.map(m => <option key={m.id} value={m.id}>{m.nombre} — {fmt(m.costo_por_unidad)}/{m.unidad}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(t)}>Cantidad {mp ? `(${mp.unidad})` : ''} por unidad producida</label>
            <input type="number" min="0.001" step="0.001" value={cant} onChange={e=>setCant(e.target.value)} style={inputStyle(t)} autoFocus />
          </div>
          {aporte > 0 && (
            <div style={{ padding:'8px 12px', borderRadius:10, background:t.surfaceAlt, border:`1px solid ${t.border}` }}>
              <span style={{ fontSize:11, color:t.textMuted }}>Aporte al costo: </span>
              <span style={{ fontSize:13, fontWeight:800, fontFamily:'monospace', color:t.text }}>{fmt(aporte)}</span>
            </div>
          )}
          {error && <div style={{ fontSize:11, color:t.redNum }}>{error}</div>}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor: saving?'wait':'pointer', opacity: saving?0.7:1 }}>
              {saving ? 'Guardando...' : '✓ Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COSTOS VIEW PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function CostosView({ usuario, costos }: CostosViewProps) {
  const [dark, setDark] = useDarkMode()
  const [isMobile,   setIsMobile]   = useState(false)
  const [tab,        setTab]        = useState<'rentabilidad'|'simulador'|'combos'|'gastos'|'recetas'>('rentabilidad')
  const [modalCostos,       setModalCostos]       = useState<RentabilidadExtendida | null>(null)
  const [modalCombo,        setModalCombo]        = useState(false)
  const [modalGasto,        setModalGasto]        = useState(false)
  const [modalEditarGasto,  setModalEditarGasto]  = useState<GastoItem | null>(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState<{id:string;desc:string}|null>(null)
  const [modalReceta,       setModalReceta]       = useState(false)

  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const t = dark ? tema.dark : tema.light

  const handleActualizarCostos = async (id: string, data: ActualizarCostosProductoData) => {
    try { await costos.actualizarCostos(id, data); setModalCostos(null) }
    catch (err) { console.error(err) }
  }

  const handleGuardarPrecio = async (id: string, precio: number) => {
    try { await costos.actualizarPrecio(id, precio) }
    catch (err) { console.error(err) }
  }

  const handleCrearCombo = async (data: Parameters<typeof costos.crearCombo>[0]) => {
    try { await costos.crearCombo(data); setModalCombo(false) }
    catch (err) { console.error(err) }
  }

  const handleEditarGasto = async (id: string, data: NuevoGastoData) => {
    try { await costos.editarGasto(id, data); setModalEditarGasto(null) }
    catch (err) { console.error(err) }
  }

  const handleEliminarGasto = async (id: string) => {
    try { await costos.eliminarGasto(id); setConfirmarEliminar(null) }
    catch (err) { console.error(err) }
  }

  const handleAgregarGasto = async (data: NuevoGastoData) => {
    try { await costos.agregarGasto(data); setModalGasto(false) }
    catch (err) { console.error(err) }
  }

  const handleAgregarReceta = async (data: Parameters<typeof costos.agregarReceta>[0]) => {
    try { await costos.agregarReceta(data); setModalReceta(false) }
    catch (err) { console.error(err) }
  }

  const kpis = [
    { label: 'Margen promedio',     value: fmtPct(costos.resumen.margenPromedio),        icon: '📊', color: costos.resumen.margenPromedio >= 30 ? t.greenNum : t.amberSub },
    { label: 'Ganancia estimada mes',value: fmt(costos.resumen.gananciaEstimadaMes),     icon: '💰', color: t.greenNum },
    { label: 'Alertas margen bajo', value: costos.resumen.alertasMargen.length.toString(),icon: '⚠️', color: costos.resumen.alertasMargen.length > 0 ? t.redNum : t.greenNum },
    { label: 'Gastos fijos mes',    value: fmt(costos.resumen.totalGastosFijos),          icon: '📋', color: t.text },
  ]

  const TABS = [
    { key: 'rentabilidad', label: '📊 Rentabilidad' },
    { key: 'simulador',    label: '🎛 Simulador'    },
    { key: 'combos',       label: '🎁 Combos'       },
    { key: 'gastos',       label: '📋 Gastos fijos' },
    { key: 'recetas',      label: '🧪 Recetas'      },
  ] as const

  const content = (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:t.bg }}>
      {/* Header */}
      <div style={{ padding: isMobile ? '52px 20px 14px' : '18px 24px 14px', borderBottom:`1px solid ${t.border}`, background:t.surface, flexShrink:0 }}>
        <div style={{ fontSize: isMobile ? 20 : 18, fontWeight:800, color:t.text, letterSpacing:'-0.4px' }}>Costos</div>
        <div style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>
          {costos.resumen.alertasMargen.length > 0
            ? <span style={{ color:t.redNum }}>⚠ {costos.resumen.alertasMargen.length} producto{costos.resumen.alertasMargen.length>1?'s':''} con margen bajo</span>
            : <span style={{ color:t.greenNum }}>✓ Márgenes en orden</span>
          }
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding:'14px 20px 0', flexShrink:0 }}>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10 }}>
          {costos.loading
            ? [1,2,3,4].map(i=><Sk key={i} h={68} radius={12} t={t} />)
            : kpis.map((k,i) => (
                <div key={i} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'11px 14px', boxShadow:t.shadow }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:10, color:t.textMuted }}>{k.label}</span>
                    <span style={{ fontSize:16 }}>{k.icon}</span>
                  </div>
                  <div style={{ fontSize:18, fontWeight:800, color:k.color, fontFamily:'monospace' }}>{k.value}</div>
                </div>
              ))
          }
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
        {tab === 'rentabilidad' && <TabRentabilidad costos={costos} t={t} dark={dark} onEditarCostos={setModalCostos} />}
        {tab === 'simulador'    && <TabSimulador    costos={costos} t={t} onGuardar={handleGuardarPrecio} />}
        {tab === 'combos'       && <TabCombos       costos={costos} t={t} onCrear={()=>setModalCombo(true)} />}
        {tab === 'gastos'       && <TabGastos       costos={costos} t={t} onAgregarGasto={()=>setModalGasto(true)} onEditarGasto={g=>setModalEditarGasto(g)} onEliminarGasto={(id,desc)=>setConfirmarEliminar({id,desc})} />}
        {tab === 'recetas'      && <TabRecetas      costos={costos} t={t} onAgregarIngrediente={()=>setModalReceta(true)} />}
      </div>

      {/* Bottom nav mobile */}
      {isMobile && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:t.navBg, backdropFilter:'blur(16px)', borderTop:`1px solid ${t.border}`, padding:'10px 0 20px', display:'flex', justifyContent:'space-around', zIndex:50 }}>
          {([['⊞','Inicio','/dashboard'],['↗','Ventas','/ventas'],['◎','Cobros','/cobranzas'],['▦','Stock','/stock'],['≋','Más','']] as [string,string,string][]).map(([ico,lbl,hr]) => (
            <div key={lbl} onClick={()=>hr&&router.push(hr)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, cursor:'pointer' }}>
              <div style={{ fontSize:18, color:lbl==='Más'?t.accent:t.textFaint }}>{ico}</div>
              <div style={{ fontSize:9, color:lbl==='Más'?t.accent:t.textFaint, fontWeight:lbl==='Más'?700:400 }}>{lbl}</div>
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

      <div style={{ height:'100vh', display:'flex', background:t.bg, fontFamily:"'DM Sans', system-ui, sans-serif", overflow:'hidden' }}>
        {!isMobile && <Sidebar activo="costos" usuario={usuario} dark={dark} setDark={setDark} t={t} />}
        {content}
      </div>

      {modalCostos  && <ModalEditarCostos  prod={modalCostos} onConfirm={handleActualizarCostos} onCancel={()=>setModalCostos(null)} saving={costos.saving} t={t} />}
      {modalCombo   && <ModalNuevoCombo    costos={costos} onConfirm={handleCrearCombo} onCancel={()=>setModalCombo(false)} saving={costos.saving} t={t} />}
      {modalGasto   && <ModalNuevoGasto    onConfirm={handleAgregarGasto} onCancel={()=>setModalGasto(false)} saving={costos.saving} t={t} />}
      {modalReceta  && costos.materias.length > 0 && <ModalAgregarIngrediente costos={costos} onConfirm={handleAgregarReceta} onCancel={()=>setModalReceta(false)} saving={costos.saving} t={t} />}
      {modalEditarGasto && <ModalEditarGasto gasto={modalEditarGasto} onConfirm={handleEditarGasto} onCancel={()=>setModalEditarGasto(null)} saving={costos.saving} t={t} />}

      {/* Confirmación de eliminación */}
      {confirmarEliminar && (
        <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'24px 22px', maxWidth:340, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🗑</div>
            <div style={{ fontSize:15, fontWeight:800, color:t.text, marginBottom:8 }}>¿Eliminar gasto?</div>
            <div style={{ fontSize:12, color:t.textMuted, marginBottom:20 }}>
              <strong>{confirmarEliminar.desc}</strong><br/>Esta acción no se puede deshacer.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setConfirmarEliminar(null)}
                style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={()=>handleEliminarGasto(confirmarEliminar.id)} disabled={costos.saving}
                style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.redNum, color:'#fff', fontSize:13, fontWeight:800, cursor: costos.saving?'wait':'pointer', opacity: costos.saving?0.7:1 }}>
                {costos.saving ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}