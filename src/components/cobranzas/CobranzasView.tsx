'use client'

// src/components/cobranzas/CobranzasView.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import { MenuMas } from '@/components/shared/MenuMas'
import { createClient } from '@/lib/supabase/client'
import type { useCobranzas, MotivoProblema, CobranzaConDetalle } from '@/hooks/useCobranzas'
import type { Cuota } from '@/types/database'
import { useComprobante } from '@/hooks/useComprobante'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: ReturnType<typeof createClient>) => s as any

interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface CobranzasViewProps {
  usuario:   UsuarioInfo
  cobranzas: ReturnType<typeof useCobranzas>
}

const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0
const formatPeso = (n: string | number | null | undefined) => {
  const num = toFloat(n)
  const parts = num.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$${parts[0]},${parts[1]}`
}

function getSemaforoCuota(cuota: Cuota): 'pagada' | 'vencida' | 'hoy' | 'pendiente' {
  if (cuota.estado === 'pagada') return 'pagada'
  const partes = (cuota.fecha_vencimiento ?? '').slice(0, 10).split('-').map(Number)
  const venc = new Date(partes[0], partes[1] - 1, partes[2])
  const ahora = new Date(); ahora.setHours(0, 0, 0, 0)
  if (venc.getTime() === ahora.getTime()) return 'hoy'
  if (venc < ahora) return 'vencida'
  return 'pendiente'
}

const tema = {
  light: {
    bg:'#fafaf8', surface:'#ffffff', surfaceAlt:'#f5f5f2',
    border:'#e8e8e4', text:'#111827', textMuted:'#6b7280', textFaint:'#9ca3af',
    accent:'#111827', accentText:'#ffffff',
    green:'#f0fdf4', greenBorder:'#bbf7d0', greenText:'#166534',
    amber:'#fffbeb', amberBorder:'#fde68a', amberSub:'#d97706',
    red:'#fff1f2', redBorder:'#fecdd3', redNum:'#dc2626', redText:'#9f1239',
    shadow:'0 1px 4px rgba(0,0,0,0.06)', shadowMd:'0 4px 16px rgba(0,0,0,0.08)',
    navBg:'rgba(255,255,255,0.92)',
  },
  dark: {
    bg:'#141210', surface:'#1c1916', surfaceAlt:'#211e1b',
    border:'#2e2924', text:'#e8e0d4', textMuted:'#7a6e62', textFaint:'#4a4238',
    accent:'#d4a96a', accentText:'#141210',
    green:'#0e1f12', greenBorder:'#1a3820', greenText:'#4a7a54',
    amber:'#1f1a0e', amberBorder:'#3d3010', amberSub:'#a87d30',
    red:'#1f0e0e', redBorder:'#3d1010', redNum:'#f87171', redText:'#7a2222',
    shadow:'0 1px 6px rgba(0,0,0,0.4)', shadowMd:'0 4px 20px rgba(0,0,0,0.5)',
    navBg:'rgba(20,18,16,0.95)',
  },
}
type Tema = typeof tema.light

function Sk({ h=48, t }: { h?: number; t: Tema }) {
  return (
    <div style={{ height:h, borderRadius:12, background:t.surfaceAlt, overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg,transparent,${t.border},transparent)`, animation:'shimmer 1.4s infinite' }} />
    </div>
  )
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:bg, color, letterSpacing:'0.04em', whiteSpace:'nowrap' as const }}>{label}</span>
}

// ── Modal confirmar cobro ─────────────────────────────────────────────────────
function ModalCobro({ cuota, clienteNombre, onConfirm, onCancel, t }: {
  cuota: Cuota; clienteNombre: string
  onConfirm: () => void; onCancel: () => void; t: Tema; dark: boolean
}) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:22, padding:'28px 24px', maxWidth:340, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>💰</div>
          <div style={{ fontSize:16, fontWeight:800, color:t.text }}>Confirmar cobro</div>
          <div style={{ fontSize:13, color:t.textMuted, marginTop:4 }}>{clienteNombre}</div>
          <div style={{ fontSize:30, fontWeight:800, color:t.accent, fontFamily:'monospace', marginTop:8 }}>{formatPeso(cuota.monto)}</div>
          <div style={{ fontSize:11, color:t.textMuted, marginTop:4 }}>Cuota {cuota.numero_cuota} · vence {cuota.fecha_vencimiento?.slice(0,10).split('-').reverse().join('/')}</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor:'pointer' }}>✓ Cobrado</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal marcar problemático ─────────────────────────────────────────────────
function ModalProblematico({ cliente, onConfirm, onCancel, t }: {
  cliente: { id: string; nombre: string; es_moroso?: boolean | null }
  onConfirm: (motivo: MotivoProblema, detalle: string) => void
  onCancel: () => void; t: Tema
}) {
  const [motivo,  setMotivo]  = useState<MotivoProblema>('no_pago')
  const [detalle, setDetalle] = useState('')
  const motivos: { key: MotivoProblema; label: string; icon: string }[] = [
    { key:'no_pago',          label:'No pagó cuotas',   icon:'💸' },
    { key:'no_retiro_pedido', label:'No retiró pedido', icon:'📦' },
    { key:'no_responde',      label:'No responde',      icon:'🔕' },
    { key:'cheque_rechazado', label:'Cheque rechazado', icon:'❌' },
    { key:'otro',             label:'Otro motivo',      icon:'⚠️' },
  ]
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:22, padding:'28px 24px', maxWidth:380, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🚨</div>
          <div style={{ fontSize:16, fontWeight:800, color:t.text }}>Marcar como problemático</div>
          <div style={{ fontSize:13, color:t.textMuted, marginTop:4 }}>{cliente.nombre}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {motivos.map(m => (
            <button key={m.key} onClick={() => setMotivo(m.key)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:11, border:`1.5px solid ${motivo===m.key ? t.redNum : t.border}`, background:motivo===m.key ? t.red : t.surfaceAlt, color:motivo===m.key ? t.redNum : t.textMuted, cursor:'pointer', textAlign:'left' as const, fontSize:13, fontWeight:motivo===m.key?700:400 }}>
              <span style={{ fontSize:16 }}>{m.icon}</span>{m.label}
            </button>
          ))}
        </div>
        {motivo === 'otro' && (
          <textarea value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Describí brevemente el problema..." rows={2}
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${t.border}`, background:t.bg, color:t.text, fontSize:13, fontFamily:'inherit', outline:'none', resize:'none', marginBottom:16, boxSizing:'border-box' as const }} />
        )}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
          <button onClick={() => onConfirm(motivo, detalle)} style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.redNum, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>🚨 Marcar</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal ELIMINAR cobranza ────────────────────────────────────────────────────
function ModalEliminarCobranza({ cobranza, t, onConfirm, onCancel, eliminando }: {
  cobranza: CobranzaConDetalle; t: Tema
  onConfirm: () => void; onCancel: () => void; eliminando: boolean
}) {
  const [confirma, setConfirma] = useState(false)
  const cliente = cobranza.clientes?.nombre ?? 'Cliente'
  const cuotasPagas = (cobranza.cuotas ?? []).filter(c => c.estado === 'pagada').length

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.redBorder}`, borderRadius:22, padding:'28px 24px', maxWidth:380, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ textAlign:'center', marginBottom:18 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🗑</div>
          <div style={{ fontSize:16, fontWeight:800, color:t.text }}>Eliminar cobranza</div>
          <div style={{ fontSize:13, fontWeight:700, color:t.redNum, marginTop:4 }}>{cliente}</div>
          <div style={{ fontSize:12, color:t.textMuted, marginTop:6 }}>{cobranza.descripcion ?? 'Cobranza'}</div>
        </div>

        {/* Info de la cobranza */}
        <div style={{ padding:'12px 14px', borderRadius:12, background:t.red, border:`1px solid ${t.redBorder}`, marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:t.redNum, marginBottom:6 }}>⚠️ Esta acción no se puede deshacer</div>
          <div style={{ fontSize:11, color:t.redNum }}>
            • Monto: {formatPeso(cobranza.monto_total)}<br/>
            • {cuotasPagas} de {cobranza.cant_cuotas} cuotas ya cobradas<br/>
            • El historial de morosidad del cliente <strong>se mantiene</strong>
          </div>
          <div style={{ fontSize:11, color:t.redNum, marginTop:8, opacity:0.8 }}>
            La cobranza se eliminará de la lista activa. Los cobros ya realizados quedaron registrados en las ventas.
          </div>
        </div>

        {/* Checkbox de confirmación */}
        <div
          onClick={() => setConfirma(!confirma)}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:`1.5px solid ${confirma ? t.redNum : t.border}`, background:confirma ? t.red : t.surfaceAlt, cursor:'pointer', marginBottom:16 }}>
          <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${confirma ? t.redNum : t.border}`, background:confirma ? t.redNum : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {confirma && <span style={{ color:'#fff', fontSize:11 }}>✓</span>}
          </div>
          <span style={{ fontSize:12, color:confirma ? t.redNum : t.textMuted, fontWeight:confirma?700:400 }}>
            Entiendo que esto eliminará la cobranza de la lista
          </span>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={!confirma || eliminando}
            style={{ flex:1, padding:12, borderRadius:12, border:'none', background:confirma ? t.redNum : t.surfaceAlt, color:confirma ? '#fff' : t.textFaint, fontSize:13, fontWeight:800, cursor:confirma&&!eliminando?'pointer':'not-allowed', opacity:eliminando?0.7:1 }}>
            {eliminando ? 'Eliminando...' : '🗑 Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panel de cuotas de una cobranza ───────────────────────────────────────────
function PanelCuotas({ cobranza, t, dark, onCobrar, onEditarFecha }: {
  cobranza: CobranzaConDetalle; t: Tema; dark: boolean
  onCobrar: (cuota: Cuota, clienteNombre: string) => void
  onEditarFecha: (cuotaId: string, nuevaFecha: string) => void
}) {
  const cuotas = [...(cobranza.cuotas ?? [])].sort((a,b) => a.numero_cuota - b.numero_cuota)
  const cliente = cobranza.clientes?.nombre ?? 'Cliente'
  const colores = {
    pagada:   { bg:t.green,      border:t.greenBorder, text:t.greenText, label:'✓ Pagada'  },
    vencida:  { bg:t.red,        border:t.redBorder,   text:t.redNum,    label:'Vencida'   },
    hoy:      { bg:t.amber,      border:t.amberBorder, text:t.amberSub,  label:'Vence hoy' },
    pendiente:{ bg:t.surfaceAlt, border:t.border,      text:t.textMuted, label:'Pendiente' },
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:10, paddingTop:10, borderTop:`1px dashed ${t.border}` }}>
      {cuotas.map(c => {
        const sem = getSemaforoCuota(c)
        const col = colores[sem]
        return (
          <div key={c.id} style={{ padding:'8px 10px', borderRadius:10, background:col.bg, border:`1px solid ${col.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ fontSize:10, fontWeight:800, color:col.text, flexShrink:0, minWidth:16 }}>{c.numero_cuota}</div>
              <input type="date" defaultValue={c.fecha_vencimiento}
                onBlur={e => { if (e.target.value && e.target.value !== c.fecha_vencimiento) onEditarFecha(c.id, e.target.value) }}
                style={{ fontSize:11, color:t.text, fontWeight:600, border:'none', background:'transparent', outline:'none', cursor:'pointer', fontFamily:'inherit', padding:0, flex:1, minWidth:0 }} />
              <div style={{ fontSize:12, fontWeight:700, color:t.text, fontFamily:'monospace', flexShrink:0 }}>{formatPeso(c.monto)}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:5 }}>
              <Badge label={col.label} color={col.text} bg={col.bg} />
              {sem !== 'pagada' && (
                <button onClick={() => onCobrar(c, cliente)}
                  style={{ padding:'4px 14px', borderRadius:8, border:`1px solid ${col.border}`, background:t.surface, color:col.text, cursor:'pointer', fontSize:12, fontWeight:700 }}>
                  ✓ Cobrar
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Card de cobranza ──────────────────────────────────────────────────────────
function CardCobranza({ cobranza, t, dark, onCobrar, onMarcarProblematico, onEditarFecha, onComprobante, onQuitarProblematico, onEliminar }: {
  cobranza: CobranzaConDetalle; t: Tema; dark: boolean
  onCobrar: (cuota: Cuota, clienteNombre: string) => void
  onMarcarProblematico: (cliente: { id: string; nombre: string; es_moroso?: boolean | null }) => void
  onEditarFecha: (cuotaId: string, nuevaFecha: string) => void
  onComprobante: (cobranza: CobranzaConDetalle) => void
  onQuitarProblematico: (clienteId: string) => void
  onEliminar: (cobranza: CobranzaConDetalle) => void  // NUEVO
}) {
  const [expandida, setExpandida] = useState(false)
  const cuotas   = cobranza.cuotas ?? []
  const pagas    = cuotas.filter(c => c.estado === 'pagada').length
  const vencidas = cuotas.filter(c => getSemaforoCuota(c) === 'vencida').length
  const totalMonto = toFloat(cobranza.monto_total)
  const progreso   = cobranza.cant_cuotas > 0 ? (pagas / cobranza.cant_cuotas) * 100 : 0
  const cliente        = cobranza.clientes
  const esMoroso       = cliente?.es_moroso
  const tieneHistorial = !esMoroso && cliente?.motivo_moroso?.startsWith('[NORMALIZADO]')

  return (
    <div style={{ background:t.surface, border:`1px solid ${vencidas>0 ? t.redBorder : t.border}`, borderRadius:15, padding:'14px 16px', boxShadow:t.shadow }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:esMoroso?t.red:tieneHistorial?t.amber:t.surfaceAlt, border:`1.5px solid ${esMoroso?t.redBorder:tieneHistorial?t.amberBorder:t.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:esMoroso?t.redNum:tieneHistorial?t.amberSub:t.textMuted }}>
            {(cliente?.nombre ?? 'C').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          {esMoroso && <div style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:t.redNum, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>🚨</div>}
          {tieneHistorial && <div style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:t.amberSub, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>⚠️</div>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' as const }}>
            <span style={{ fontSize:14, fontWeight:700, color:t.text }}>{cliente?.nombre ?? 'Cliente'}</span>
            {esMoroso && <Badge label="Problemático" color={t.redNum} bg={t.red} />}
            {tieneHistorial && <Badge label="Antecedentes" color={t.amberSub} bg={t.amber} />}
            {vencidas > 0 && !esMoroso && <Badge label={`${vencidas} vencida${vencidas>1?'s':''}`} color={t.redNum} bg={t.red} />}
          </div>
          <div style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>
            {cobranza.descripcion ?? 'Cobranza'} · {pagas}/{cobranza.cant_cuotas} cuotas
          </div>
          {esMoroso && cliente?.motivo_moroso && (
            <div style={{ fontSize:10, color:t.redNum, marginTop:3, fontStyle:'italic' }}>⚠️ {cliente.motivo_moroso}</div>
          )}
          {tieneHistorial && cliente?.motivo_moroso && (
            <div style={{ fontSize:10, color:t.amberSub, marginTop:3, fontStyle:'italic' }}>
              {cliente.motivo_moroso.replace('[NORMALIZADO] ', '🕐 Anterior: ')}
            </div>
          )}
        </div>
        <div style={{ textAlign:'right' as const, flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:t.text, fontFamily:'monospace' }}>{formatPeso(totalMonto)}</div>
          <div style={{ fontSize:10, color:t.textMuted }}>total</div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div style={{ marginTop:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ fontSize:10, color:t.textFaint }}>{pagas} de {cobranza.cant_cuotas} cuotas pagas</span>
          <span style={{ fontSize:10, fontWeight:700, color:progreso===100?t.greenText:t.textMuted }}>{Math.round(progreso)}%</span>
        </div>
        <div style={{ height:5, borderRadius:3, background:t.border, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progreso}%`, background:vencidas>0?t.redNum:progreso===100?'#4ade80':t.accent, borderRadius:3 }} />
        </div>
      </div>

      {/* Acciones — fila 1 */}
      <div style={{ display:'flex', gap:8, marginTop:12 }}>
        <button onClick={() => setExpandida(!expandida)}
          style={{ flex:1, padding:'7px 0', borderRadius:9, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:11, fontWeight:600, cursor:'pointer' }}>
          {expandida ? '▲ Ocultar cuotas' : '▼ Ver cuotas'}
        </button>
        <button onClick={() => onComprobante(cobranza)} title="Descargar comprobante"
          style={{ padding:'7px 10px', borderRadius:9, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' as const }}>
          ⬇ PDF
        </button>
        {!esMoroso ? (
          <button onClick={() => cliente && onMarcarProblematico(cliente)}
            style={{ padding:'7px 12px', borderRadius:9, border:`1px solid ${t.redBorder}`, background:t.red, color:t.redNum, fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' as const }}>
            🚨 Marcar
          </button>
        ) : (
          <button onClick={() => cliente && onQuitarProblematico(cliente.id)}
            style={{ padding:'7px 12px', borderRadius:9, border:`1px solid ${t.greenBorder}`, background:t.green, color:t.greenText, fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' as const }}>
            ✓ Normalizar
          </button>
        )}
      </div>

      {/* Botón eliminar — separado y más chico para no confundir */}
      <div style={{ marginTop:6 }}>
        <button onClick={() => onEliminar(cobranza)}
          style={{ width:'100%', padding:'6px 0', borderRadius:9, border:`1px solid ${t.border}`, background:'transparent', color:t.textFaint, fontSize:10, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
          <span style={{ fontSize:12 }}>🗑</span> Eliminar cobranza de la lista
        </button>
      </div>

      {expandida && <PanelCuotas cobranza={cobranza} t={t} dark={dark} onCobrar={onCobrar} onEditarFecha={onEditarFecha} />}
    </div>
  )
}

// ── Modal nueva cobranza ──────────────────────────────────────────────────────
function ModalNuevaCobranza({ cobranzas, t, onClose }: {
  cobranzas: ReturnType<typeof useCobranzas>; t: Tema; dark: boolean; onClose: () => void
}) {
  const [clienteId,   setClienteId]   = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto,       setMonto]       = useState('')
  const [cant,        setCant]        = useState(0)
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0,10))
  const [exito,       setExito]       = useState(false)

  const handleGuardar = async () => {
    if (!clienteId || !monto || !descripcion) return
    try {
      await cobranzas.crearCobranzaManual({ cliente_id: clienteId, descripcion, monto_total: parseFloat(monto), cant_cuotas: cant, fecha_inicio: fechaInicio })
      setExito(true)
      setTimeout(() => { setExito(false); onClose() }, 1400)
    } catch (err) { console.error(err) }
  }

  const inp = { width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${t.border}`, background:t.bg, color:t.text, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }

  if (exito) return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:240, gap:12 }}><div style={{ fontSize:52 }}>✅</div><div style={{ fontSize:16, fontWeight:800, color:t.text }}>Cobranza creada</div></div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:t.textMuted, display:'block', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>Cliente</label>
        <select value={clienteId} onChange={e=>setClienteId(e.target.value)} style={{ ...inp }}>
          <option value="">Seleccioná un cliente</option>
          {cobranzas.clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}{c.es_moroso?' 🚨':''}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:t.textMuted, display:'block', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>Descripción</label>
        <input value={descripcion} onChange={e=>setDescripcion(e.target.value)} placeholder="Ej: Préstamo personal, Fiado mercadería..." style={inp} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:t.textMuted, display:'block', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>Monto total</label>
          <input type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="$0" style={inp} />
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:t.textMuted, display:'block', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>Cuotas</label>
          <input type="number" min="1" max="60" value={cant||''} onChange={e=>setCant(Math.max(1, parseInt(e.target.value)||1))} placeholder="Ej: 3" style={inp} />
        </div>
      </div>
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:t.textMuted, display:'block', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>Inicio</label>
        <input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} style={inp} />
      </div>
      {monto && cant > 0 && (
        <div style={{ padding:'10px 14px', borderRadius:10, background:t.surfaceAlt, border:`1px solid ${t.border}`, fontSize:12, color:t.textMuted }}>
          → {cant} cuotas de <strong style={{ color:t.text, fontFamily:'monospace' }}>{formatPeso(parseFloat(monto||'0')/cant)}</strong> mensuales
        </div>
      )}
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onClose} style={{ flex:1, padding:13, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
        <button onClick={handleGuardar} disabled={!clienteId||!monto||!descripcion||cobranzas.saving}
          style={{ flex:2, padding:13, borderRadius:12, border:'none', background:(!clienteId||!monto||!descripcion)?t.surfaceAlt:t.accent, color:(!clienteId||!monto||!descripcion)?t.textFaint:t.accentText, fontSize:13, fontWeight:800, cursor:'pointer' }}>
          {cobranzas.saving ? 'Guardando...' : '✓ Crear cobranza'}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COBRANZAS VIEW PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function CobranzasView({ usuario, cobranzas }: CobranzasViewProps) {
  const [dark,       setDark]       = useDarkMode()
  const [isMobile,   setIsMobile]   = useState(false)
  const [tab,        setTab]        = useState<'activas'|'recorrido'|'morosos'>('activas')
  const [showNueva,  setShowNueva]  = useState(false)
  const [modalCobro, setModalCobro] = useState<{ cuota: Cuota; cliente: string } | null>(null)
  const [modalProb,  setModalProb]  = useState<{ id: string; nombre: string; es_moroso?: boolean | null } | null>(null)
  // NUEVO: estado para eliminar cobranza
  const [modalEliminar, setModalEliminar] = useState<CobranzaConDetalle | null>(null)
  const [eliminando,    setEliminando]    = useState(false)

  const comprobante  = useComprobante({ nombre: usuario.negocio })
  const supabaseRef  = useRef(createClient())
  const supabase     = supabaseRef.current

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const t = dark ? tema.dark : tema.light

  // ── Eliminar cobranza ────────────────────────────────────────────────────────
  const handleEliminarCobranza = useCallback(async () => {
    if (!modalEliminar) return
    setEliminando(true)
    try {
      // Eliminar cuotas primero (ON DELETE CASCADE debería manejarlo, pero por seguridad)
      await db(supabase).from('cuotas').delete().eq('cobranza_id', modalEliminar.id)
      // Eliminar la cobranza
      const { error: err } = await db(supabase).from('cobranzas').delete().eq('id', modalEliminar.id)
      if (err) throw new Error(err.message)
      setModalEliminar(null)
      // Refrescar lista de cobranzas
      await cobranzas.refetch()
    } catch (err) {
      console.error('[eliminarCobranza]', err)
    } finally {
      setEliminando(false)
    }
  }, [modalEliminar, supabase, cobranzas])

  const cobranzasActivas = cobranzas.cobranzas.filter(c => {
    if (c.estado !== 'activa' && c.estado !== 'vencida') return false
    if (!c.clientes?.es_moroso) return true
    const cuotas = c.cuotas ?? []
    return cuotas.some(q => q.estado === 'pagada')
  })
  const cobranzasMorosos = cobranzas.cobranzas.filter(c => c.clientes?.es_moroso)

  const [hoy] = useState(() => new Date().toISOString().slice(0, 10))
  const cobranzasConCuotasHoy = cobranzasActivas.filter(c =>
    (c.cuotas ?? []).some(q => q.fecha_vencimiento?.slice(0, 10) === hoy && q.estado === 'pendiente')
  )
  const [recorrido,    setRecorrido]    = useState<CobranzaConDetalle[]>([])
  const [dragIdx,      setDragIdx]      = useState<number | null>(null)
  const [dragOverIdx,  setDragOverIdx]  = useState<number | null>(null)
  const touchFromIdx   = useRef<number | null>(null)
  const touchToIdx     = useRef<number | null>(null)
  const listRef        = useRef<HTMLDivElement>(null)
  const [cobradosHoy,  setCobradosHoy]  = useState<Set<string>>(new Set())

  useEffect(() => {
    if (cobranzasConCuotasHoy.length === 0 && cobranzas.loading) return
    setRecorrido(prev => {
      const prevIds = new Set(prev.map(c => c.id))
      const nuevas = cobranzasConCuotasHoy.filter(c => !prevIds.has(c.id))
      const actualizadas = prev.filter(c => cobranzasConCuotasHoy.some(x => x.id === c.id)).map(c => cobranzasConCuotasHoy.find(x => x.id === c.id) ?? c)
      return [...actualizadas, ...nuevas]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobranzas.loading, cobranzas.cobranzas.length])

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver  = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx) }
  const handleDrop      = (toIdx: number) => {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDragOverIdx(null); return }
    setRecorrido(prev => { const arr=[...prev]; const [moved]=arr.splice(dragIdx,1); arr.splice(toIdx,0,moved); return arr })
    setDragIdx(null); setDragOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  const handleTouchStart = (e: React.TouchEvent, idx: number) => { e.stopPropagation(); touchFromIdx.current=idx; touchToIdx.current=idx; setDragIdx(idx) }
  const handleTouchMove  = (e: React.TouchEvent) => {
    if (touchFromIdx.current===null||!listRef.current) return
    e.preventDefault()
    const touch=e.touches[0]
    const children=Array.from(listRef.current.children) as HTMLElement[]
    for (let i=0;i<children.length;i++) {
      const rect=children[i].getBoundingClientRect()
      if (touch.clientY>=rect.top&&touch.clientY<=rect.bottom) { if (touchToIdx.current!==i){touchToIdx.current=i;setDragOverIdx(i)}; break }
    }
  }
  const handleTouchEnd = () => {
    const from=touchFromIdx.current; const to=touchToIdx.current
    if (from!==null&&to!==null&&from!==to) {
      setRecorrido(prev=>{const arr=[...prev];const [moved]=arr.splice(from,1);arr.splice(to,0,moved);return arr})
    }
    touchFromIdx.current=null; touchToIdx.current=null; setDragIdx(null); setDragOverIdx(null)
  }

  const editarFechaCuota = useCallback(async (cuotaId: string, nuevaFecha: string) => {
    await cobranzas.editarFechaCuota(cuotaId, nuevaFecha)
  }, [cobranzas])

  const lista = tab === 'activas' ? cobranzasActivas : cobranzasMorosos

  const kpis = [
    { label:'A cobrar',   value:formatPeso(cobranzas.resumen.totalPendiente),  icon:'📋', color:t.accent },
    { label:'Vencido',    value:formatPeso(cobranzas.resumen.totalVencido),    icon:'🚨', color:t.redNum  },
    { label:'Cobrado mes',value:formatPeso(cobranzas.resumen.totalCobradoMes), icon:'✅', color:'#4ade80' },
    { label:'Morosos',    value:String(cobranzas.resumen.cantMorosos),         icon:'⚠️', color:t.amberSub},
  ]

  const router = useRouter()
  const sidebar = <Sidebar activo="cobranzas" usuario={usuario} dark={dark} setDark={setDark} t={t} />

  const content = (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ height:54, background:t.surface, borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', padding:'0 20px', flexShrink:0 }}>
        {isMobile && <button onClick={()=>router.push('/dashboard')} style={{ marginRight:12, background:'none', border:'none', color:t.textMuted, cursor:'pointer', fontSize:18 }}>←</button>}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:t.text }}>Cobranzas</div>
          <div style={{ fontSize:10, color:t.textMuted }}>{cobranzas.resumen.cuotasHoy} vencen hoy · {cobranzas.resumen.cantMorosos} morosos</div>
        </div>
        <button onClick={()=>setShowNueva(true)} style={{ marginLeft:'auto', padding:'8px 14px', borderRadius:10, border:'none', background:t.accent, color:t.accentText, fontSize:12, fontWeight:800, cursor:'pointer' }}>＋ Nueva</button>
      </div>

      <div style={{ padding:'16px 20px 0', display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)', gap:12 }}>
        {kpis.map((k,i)=>(
          <div key={i} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:13, padding:'13px 15px', boxShadow:t.shadow }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:10, color:t.textMuted }}>{k.label}</span>
              <span style={{ fontSize:16 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize:18, fontWeight:800, color:k.color, fontFamily:'monospace' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:'14px 20px 0', display:'flex', gap:6 }}>
        {([['activas','Cobranzas activas'],['recorrido','🗺 Recorrido del día'],['morosos','Clientes problemáticos']] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{ padding:'7px 16px', borderRadius:20, border:`1.5px solid ${tab===key?t.accent:t.border}`, background:tab===key?(dark?'#2a2218':t.surfaceAlt):'transparent', color:tab===key?t.accent:t.textMuted, fontSize:12, fontWeight:tab===key?700:400, cursor:'pointer' }}>
            {label}
            {key==='morosos' && cobranzas.resumen.cantMorosos > 0 && (
              <span style={{ marginLeft:6, background:t.redNum, color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:9, fontWeight:700 }}>{cobranzas.resumen.cantMorosos}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 20px', paddingBottom:isMobile?80:20, display:'flex', flexDirection:'column', gap:10 }}>

        {/* Tab Recorrido */}
        {tab === 'recorrido' && (
          <div ref={listRef} style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ padding:'4px 0 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:t.text }}>Cobros de hoy — {recorrido.length} parada{recorrido.length!==1?'s':''}</div>
                <div style={{ fontSize:11, color:t.textFaint, marginTop:2 }}>Arrastrá ≡ para ordenar tu recorrido</div>
              </div>
              {recorrido.length > 0 && (() => {
                const totalDia = recorrido.reduce((s,c) => { const q=(c.cuotas??[]).find(cq=>cq.fecha_vencimiento?.slice(0,10)===hoy); return s+toFloat(q?.monto??0) },0)
                const totalCobrado = recorrido.reduce((s,c) => { const q=(c.cuotas??[]).find(cq=>cq.fecha_vencimiento?.slice(0,10)===hoy); const cobrado=cobradosHoy.has(c.id)||q?.estado==='pagada'; return s+(cobrado?toFloat(q?.monto??0):0) },0)
                return (
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, fontFamily:'monospace', fontWeight:800, color:totalCobrado===totalDia&&totalDia>0?t.greenText:t.accent }}>
                      {formatPeso(totalCobrado)} <span style={{ fontWeight:400, color:t.textFaint }}>/ {formatPeso(totalDia)}</span>
                    </div>
                    <div style={{ fontSize:9, color:t.textFaint, marginTop:1 }}>cobrado / total</div>
                  </div>
                )
              })()}
            </div>
            {recorrido.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:t.textFaint }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🗺</div>
                <div style={{ fontSize:13, fontWeight:600, color:t.textMuted }}>Sin cobros para hoy</div>
              </div>
            ) : recorrido.map((c, idx) => {
              const cuotaHoy = (c.cuotas??[]).find(q=>q.fecha_vencimiento?.slice(0,10)===hoy&&q.estado==='pendiente')
              const cuotaHoyPagada = cobradosHoy.has(c.id) ? (c.cuotas??[]).find(q=>q.fecha_vencimiento?.slice(0,10)===hoy) : undefined
              const cuotaMostrar = cuotaHoy ?? cuotaHoyPagada
              const cobrado = cobradosHoy.has(c.id)
              const cliente = c.clientes
              const isDragging = dragIdx===idx
              const isDragOver = dragOverIdx===idx&&dragIdx!==idx
              return (
                <div key={c.id} draggable={!cobrado}
                  onDragStart={()=>!cobrado&&handleDragStart(idx)} onDragOver={e=>handleDragOver(e,idx)} onDrop={()=>handleDrop(idx)} onDragEnd={handleDragEnd}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:14, background:cobrado?t.green:isDragOver?t.surfaceAlt:t.surface, border:`1.5px solid ${cobrado?t.greenBorder:isDragOver?t.accent:t.border}`, boxShadow:isDragging?t.shadowMd:t.shadow, opacity:isDragging?0.5:1, cursor:cobrado?'default':'grab', transform:isDragOver?'scale(1.01)':'none' }}>
                  <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:cobrado?16:12, fontWeight:800, background:cobrado?t.greenBorder:t.accent, color:cobrado?t.greenText:t.accentText }}>
                    {cobrado ? '✓' : idx + 1}
                  </div>
                  {!cobrado && (
                    <div onTouchStart={e=>handleTouchStart(e,idx)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                      style={{ fontSize:16, color:t.textFaint, flexShrink:0, cursor:'grab', userSelect:'none', touchAction:'none', padding:'4px 2px' }}>≡</div>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:cobrado?t.greenText:t.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textDecoration:cobrado?'line-through':'none', opacity:cobrado?0.8:1 }}>{cliente?.nombre??'Cliente'}</div>
                    <div style={{ fontSize:10, color:cobrado?t.greenText:t.textFaint, marginTop:2, opacity:cobrado?0.7:1 }}>{cobrado?'¡Cobrado!':(c.descripcion??'Sin descripción')}{!cobrado&&cliente?.telefono?` · ${cliente.telefono}`:''}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', color:cobrado?t.greenText:t.text, textDecoration:cobrado?'line-through':'none', opacity:cobrado?0.7:1 }}>{formatPeso(cuotaMostrar?.monto??0)}</div>
                    <div style={{ fontSize:9, color:cobrado?t.greenText:t.textFaint }}>Cuota {cuotaMostrar?.numero_cuota??'?'}/{c.cant_cuotas}</div>
                  </div>
                  {cobrado ? (
                    <div style={{ width:36, height:36, borderRadius:10, background:t.greenBorder, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>✅</div>
                  ) : cuotaHoy && (
                    <button onClick={() => setModalCobro({ cuota: cuotaHoy, cliente: cliente?.nombre??'Cliente' })}
                      style={{ width:36, height:36, borderRadius:10, border:'none', background:t.accent, color:t.accentText, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:700 }}>✓</button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Tabs activas y morosos */}
        {tab !== 'recorrido' && (
          <>
            {cobranzas.loading
              ? [1,2,3].map(i=><Sk key={i} h={120} t={t} />)
              : lista.length === 0
                ? <div style={{ textAlign:'center', padding:'40px 20px', color:t.textFaint }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>{tab==='activas'?'📋':'✅'}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:t.textMuted }}>{tab==='activas'?'Sin cobranzas activas':'Sin clientes problemáticos'}</div>
                  </div>
                : lista.map(c=>(
                    <CardCobranza key={c.id} cobranza={c} t={t} dark={dark}
                      onCobrar={(cuota, cliente) => setModalCobro({ cuota, cliente })}
                      onMarcarProblematico={cliente => setModalProb(cliente)}
                      onEditarFecha={editarFechaCuota}
                      onComprobante={cobranza => comprobante.descargarComprobanteCobranza(cobranza)}
                      onQuitarProblematico={clienteId => cobranzas.quitarMarcaProblematico(clienteId)}
                      onEliminar={cobranza => setModalEliminar(cobranza)}
                    />
                  ))
            }
          </>
        )}
      </div>

      {isMobile && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:t.navBg, backdropFilter:'blur(16px)', borderTop:`1px solid ${t.border}`, padding:'10px 0 20px', display:'flex', justifyContent:'space-around', zIndex:50 }}>
          {[['⊞','Inicio','/dashboard'],['↗','Ventas','/ventas'],['◎','Cobros','/cobranzas'],['▦','Stock','/stock']].map(([icon,label,href])=>(
            <div key={label} onClick={()=>href&&router.push(href)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, cursor:'pointer' }}>
              <div style={{ fontSize:18, color:label==='Cobros'?t.accent:t.textFaint }}>{icon}</div>
              <div style={{ fontSize:9, color:label==='Cobros'?t.accent:t.textFaint, fontWeight:label==='Cobros'?700:400 }}>{label}</div>
              {label==='Cobros' && <div style={{ width:4, height:4, borderRadius:'50%', background:t.accent }} />}
            </div>
          ))}
          <MenuMas t={t} dark={dark} />
        </div>
      )}
    </div>
  )

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}} @keyframes popIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}} *{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#33302a;border-radius:4px;}`}</style>

      <div style={{ height:'100vh', display:'flex', background:t.bg, fontFamily:"'DM Sans',system-ui,sans-serif", overflow:'hidden' }}>
        {!isMobile && sidebar}
        {content}
      </div>

      {modalCobro && (
        <ModalCobro cuota={modalCobro.cuota} clienteNombre={modalCobro.cliente} dark={dark}
          onConfirm={async () => {
            const cobranzaId = cobranzas.cobranzas.find(cb=>(cb.cuotas??[]).some(q=>q.id===modalCobro.cuota.id))?.id
            await cobranzas.cobrarCuota(modalCobro.cuota.id)
            if (cobranzaId) setCobradosHoy(prev=>new Set([...prev, cobranzaId]))
            setModalCobro(null)
          }}
          onCancel={() => setModalCobro(null)} t={t} />
      )}

      {modalProb && (
        <ModalProblematico cliente={modalProb}
          onConfirm={async (motivo, detalle) => { await cobranzas.marcarClienteProblematico(modalProb.id, motivo, detalle); setModalProb(null) }}
          onCancel={() => setModalProb(null)} t={t} />
      )}

      {/* Modal NUEVO: eliminar cobranza */}
      {modalEliminar && (
        <ModalEliminarCobranza
          cobranza={modalEliminar} t={t}
          onConfirm={handleEliminarCobranza}
          onCancel={() => setModalEliminar(null)}
          eliminando={eliminando}
        />
      )}

      {showNueva && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:isMobile?'flex-end':'center', justifyContent:'center', padding:isMobile?0:20 }}>
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:isMobile?'20px 20px 0 0':20, padding:'24px 20px', width:'100%', maxWidth:isMobile?'100%':460, maxHeight:isMobile?'92vh':'90vh', overflowY:'auto', boxShadow:t.shadowMd }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:800, color:t.text }}>Nueva cobranza</div>
              <button onClick={()=>setShowNueva(false)} style={{ width:28, height:28, borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <ModalNuevaCobranza cobranzas={cobranzas} t={t} dark={dark} onClose={()=>setShowNueva(false)} />
          </div>
        </div>
      )}
    </>
  )
}