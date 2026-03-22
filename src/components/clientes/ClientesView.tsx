'use client'

// src/components/clientes/ClientesView.tsx

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Sidebar } from '@/components/shared/Sidebar'
import { createClient } from '@/lib/supabase/client'
import { MenuMas } from '@/components/shared/MenuMas'
import type { Cliente } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: ReturnType<typeof createClient>) => s as any

interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface ClientesViewProps { usuario: UsuarioInfo }

// ── Tipos locales ─────────────────────────────────────────────────────────────
interface ClienteConStats extends Cliente {
  total_ventas: number
  cant_ventas: number
  total_cobranzas_activas: number
  cant_cobranzas_activas: number
  ultima_venta: string | null
}

interface NuevoClienteData {
  nombre: string
  telefono: string
  zona_comercial: string
  direccion?: string
  dni?: string
  email?: string
  notas?: string
}

interface VentaResumen {
  id: string
  fecha: string
  total: string
  tipo_pago: string | null
  estado: string
}

interface CobranzaResumen {
  id: string
  descripcion: string | null
  monto_total: string
  cant_cuotas: number
  cuotas_pagas: number
  estado: string
}

// ── Utilidades ────────────────────────────────────────────────────────────────
const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0
const formatPeso = (n: string | number | null | undefined) => {
  const num = toFloat(n)
  const parts = num.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$${parts[0]},${parts[1]}`
}
const formatFechaCorta = (iso: string) => {
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const [, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${meses[m - 1]}`
}
const iniciales = (nombre: string) =>
  nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

// ── Tema ──────────────────────────────────────────────────────────────────────
const tema = {
  light: {
    bg: '#fafaf8', surface: '#ffffff', surfaceAlt: '#f5f5f2',
    border: '#e8e8e4', borderLight: '#f0f0ec',
    text: '#111827', textMuted: '#6b7280', textFaint: '#9ca3af',
    accent: '#111827', accentText: '#ffffff',
    green: '#f0fdf4', greenBorder: '#bbf7d0', greenText: '#166534',
    amber: '#fffbeb', amberBorder: '#fde68a', amberSub: '#d97706',
    red: '#fff1f2', redBorder: '#fecdd3', redNum: '#dc2626',
    blue: '#eff6ff', blueBorder: '#bfdbfe', blueText: '#1d4ed8',
    shadow: '0 1px 4px rgba(0,0,0,0.06)', shadowMd: '0 4px 16px rgba(0,0,0,0.08)',
    navBg: 'rgba(255,255,255,0.92)',
    skeletonBase: '#ebebeb', skeletonShine: '#f5f5f5',
  },
  dark: {
    bg: '#141210', surface: '#1c1916', surfaceAlt: '#211e1b',
    border: '#2e2924', borderLight: '#252019',
    text: '#e8e0d4', textMuted: '#7a6e62', textFaint: '#4a4238',
    accent: '#d4a96a', accentText: '#141210',
    green: '#0e1f12', greenBorder: '#1a3820', greenText: '#4a7a54',
    amber: '#1f1a0e', amberBorder: '#3d3010', amberSub: '#a87d30',
    red: '#1f0e0e', redBorder: '#3d1010', redNum: '#f87171',
    blue: '#0e1525', blueBorder: '#1e3a5f', blueText: '#60a5fa',
    shadow: '0 1px 6px rgba(0,0,0,0.4)', shadowMd: '0 4px 20px rgba(0,0,0,0.5)',
    navBg: 'rgba(20,18,16,0.95)',
    skeletonBase: '#211e1b', skeletonShine: '#2e2924',
  },
}
type Tema = typeof tema.light

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ h = 16, radius = 8, t }: { h?: number; radius?: number; t: Tema }) {
  return (
    <div style={{ height: h, borderRadius: radius, background: t.skeletonBase, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg,transparent,${t.skeletonShine},transparent)`, animation: 'shimmer 1.4s infinite' }} />
    </div>
  )
}

// ── Modal nuevo / editar cliente ──────────────────────────────────────────────
function ModalCliente({ cliente, t, dark, saving, onConfirm, onCancel }: {
  cliente?: ClienteConStats | null
  t: Tema; dark: boolean; saving: boolean
  onConfirm: (data: NuevoClienteData) => Promise<void>
  onCancel: () => void
}) {
  const [nombre,        setNombre]        = useState(cliente?.nombre ?? '')
  const [telefono,      setTelefono]      = useState(cliente?.telefono ?? '')
  const [zona,          setZona]          = useState(cliente?.zona_comercial ?? '')
  const [direccion,     setDireccion]     = useState(cliente?.direccion ?? '')
  const [dni,           setDni]           = useState(cliente?.dni ?? '')
  const [email,         setEmail]         = useState(cliente?.email ?? '')
  const [notas,         setNotas]         = useState(cliente?.notas ?? '')
  const [err,           setErr]           = useState('')

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: `1.5px solid ${t.border}`, background: t.bg,
    color: t.text, fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: t.textMuted,
    display: 'block', marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }

  const handleSubmit = async () => {
    if (!nombre.trim()) { setErr('El nombre es obligatorio'); return }
    setErr('')
    await onConfirm({ nombre: nombre.trim(), telefono: telefono.trim(), zona_comercial: zona.trim(), direccion: direccion.trim(), dni: dni.trim(), email: email.trim(), notas: notas.trim() })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 20px', maxWidth: 440, width: '100%', boxShadow: t.shadowMd, animation: 'popIn 0.18s ease' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 20 }}>
          {cliente ? '✎ Editar cliente' : '+ Nuevo cliente'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={lbl}>Nombre *</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María González" style={inp} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Teléfono</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+54 376 4123456" style={inp} />
            </div>
            <div>
              <label style={lbl}>Zona comercial</label>
              <input type="text" value={zona} onChange={e => setZona(e.target.value)} placeholder="Centro, Barrio Norte..." style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Dirección</label>
            <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Av. San Martín 1234" style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>DNI</label>
              <input type="text" value={dni} onChange={e => setDni(e.target.value)} placeholder="30123456" style={inp} />
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mail@ejemplo.com" style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Notas internas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Preferencias, observaciones..." rows={2}
              style={{ ...inp, resize: 'none' }} />
          </div>
          {err && <div style={{ fontSize: 11, color: t.redNum, padding: '6px 10px', borderRadius: 7, background: t.red, border: `1px solid ${t.redBorder}` }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal confirmar eliminación ───────────────────────────────────────────────
function ModalEliminar({ cliente, cantVentas, cantCobranzas, t, saving, onConfirm, onCancel }: {
  cliente: ClienteConStats; cantVentas: number; cantCobranzas: number
  t: Tema; saving: boolean
  onConfirm: () => Promise<void>; onCancel: () => void
}) {
  const [confirma, setConfirma] = useState('')
  const tieneData = cantVentas > 0 || cantCobranzas > 0
  const puedeEliminar = !tieneData || confirma === cliente.nombre

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: t.surface, border: `1px solid ${t.redBorder}`, borderRadius: 20, padding: '28px 24px', maxWidth: 380, width: '100%', boxShadow: t.shadowMd, animation: 'popIn 0.18s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🗑</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>Eliminar cliente</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.redNum, marginTop: 6 }}>{cliente.nombre}</div>
        </div>

        {tieneData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: t.red, border: `1.5px solid ${t.redBorder}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.redNum, marginBottom: 6 }}>⚠️ Este cliente tiene datos asociados:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cantVentas > 0 && <div style={{ fontSize: 12, color: t.redNum }}>• {cantVentas} venta{cantVentas !== 1 ? 's' : ''} registrada{cantVentas !== 1 ? 's' : ''}</div>}
                {cantCobranzas > 0 && <div style={{ fontSize: 12, color: t.redNum }}>• {cantCobranzas} cobranza{cantCobranzas !== 1 ? 's' : ''} activa{cantCobranzas !== 1 ? 's' : ''}</div>}
              </div>
              <div style={{ fontSize: 11, color: t.redNum, marginTop: 8, opacity: 0.85 }}>
                Eliminar al cliente <strong>no borra</strong> sus ventas ni cobranzas — esos registros quedarán sin cliente asignado.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
                Para confirmar, escribí el nombre exacto del cliente:
              </div>
              <input
                type="text"
                value={confirma}
                onChange={e => setConfirma(e.target.value)}
                placeholder={cliente.nombre}
                autoFocus
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${puedeEliminar && confirma ? t.redNum : t.border}`, background: t.bg, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: t.textMuted, textAlign: 'center', marginBottom: 16 }}>
            Este cliente no tiene ventas ni cobranzas.<br />¿Confirmás la eliminación?
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={!puedeEliminar || saving}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: puedeEliminar ? t.redNum : t.surfaceAlt, color: puedeEliminar ? '#fff' : t.textFaint, fontSize: 13, fontWeight: 800, cursor: puedeEliminar && !saving ? 'pointer' : 'not-allowed', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Eliminando...' : '🗑 Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panel de detalle lateral ──────────────────────────────────────────────────
function PanelDetalle({ cliente, t, dark, onEditar, onEliminar, onMarcarMoroso, onQuitarMoroso, onClose }: {
  cliente: ClienteConStats; t: Tema; dark: boolean
  onEditar: () => void
  onEliminar: () => void
  onMarcarMoroso: () => void
  onQuitarMoroso: () => void
  onClose: () => void
}) {
  const [ventas,     setVentas]     = useState<VentaResumen[]>([])
  const [cobranzas,  setCobranzas]  = useState<CobranzaResumen[]>([])
  const [cargando,   setCargando]   = useState(true)
  // FIX: useRef estabiliza la instancia entre renders. Sin esto createClient()
  // se ejecuta en cada render → nueva instancia → RLS rechaza silenciosamente
  // las operaciones async (especialmente delete) por contexto de sesión inconsistente.
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try {
        const [{ data: v }, { data: c }] = await Promise.all([
          db(supabase).from('ventas').select('id, fecha, total, tipo_pago, estado').eq('cliente_id', cliente.id).order('fecha', { ascending: false }).limit(10),
          db(supabase).from('cobranzas').select('id, descripcion, monto_total, cant_cuotas, cuotas_pagas, estado').eq('cliente_id', cliente.id).in('estado', ['activa', 'vencida', 'mora']).order('created_at', { ascending: false }),
        ])
        setVentas((v ?? []) as VentaResumen[])
        setCobranzas((c ?? []) as CobranzaResumen[])
      } finally {
        setCargando(false)
      }
    }
    void cargar()
  }, [cliente.id])

  const labelPago: Record<string, string> = { efectivo: '💵', transferencia: '📲', tarjeta: '💳', cuotas: '📋' }

  const esMoroso = cliente.es_moroso
  const tieneHistorial = !esMoroso && cliente.motivo_moroso?.startsWith('[NORMALIZADO]')

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: t.bg, overflowY: 'auto' }}>

      {/* Header del panel */}
      <div style={{ padding: '20px 20px 16px', background: t.surface, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Avatar grande */}
          <div style={{
            width: 52, height: 52, borderRadius: 15, flexShrink: 0,
            background: esMoroso ? t.red : tieneHistorial ? t.amber : t.surfaceAlt,
            border: `2px solid ${esMoroso ? t.redBorder : tieneHistorial ? t.amberBorder : t.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800,
            color: esMoroso ? t.redNum : tieneHistorial ? t.amberSub : t.textMuted,
          }}>
            {iniciales(cliente.nombre)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: t.text, lineHeight: 1.2 }}>{cliente.nombre}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {esMoroso && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: t.red, color: t.redNum }}>🚨 Problemático</span>}
              {tieneHistorial && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: t.amber, color: t.amberSub }}>⚠️ Antecedentes</span>}
              {cliente.zona_comercial && <span style={{ fontSize: 10, color: t.textFaint }}>📍 {cliente.zona_comercial}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        </div>

        {/* Datos de contacto */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {cliente.telefono && <div style={{ fontSize: 12, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}><span>📱</span><span>{cliente.telefono}</span></div>}
          {cliente.email && <div style={{ fontSize: 12, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}><span>✉️</span><span>{cliente.email}</span></div>}
          {cliente.direccion && <div style={{ fontSize: 12, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}><span>🏠</span><span>{cliente.direccion}</span></div>}
          {cliente.dni && <div style={{ fontSize: 12, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}><span>🪪</span><span>DNI {cliente.dni}</span></div>}
          {cliente.notas && <div style={{ marginTop: 4, padding: '7px 10px', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}`, fontSize: 11, color: t.textMuted, fontStyle: 'italic' }}>📝 {cliente.notas}</div>}
        </div>

        {/* Historial de morosidad */}
        {esMoroso && cliente.motivo_moroso && (
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 9, background: t.red, border: `1px solid ${t.redBorder}` }}>
            <div style={{ fontSize: 10, color: t.redNum }}>⚠️ {cliente.motivo_moroso}</div>
          </div>
        )}
        {tieneHistorial && cliente.motivo_moroso && (
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 9, background: t.amber, border: `1px solid ${t.amberBorder}` }}>
            <div style={{ fontSize: 10, color: t.amberSub }}>{cliente.motivo_moroso.replace('[NORMALIZADO] ', '🕐 Historial: ')}</div>
          </div>
        )}

        {/* Acciones */}
        <div style={{ marginTop: 14, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button onClick={onEditar} style={{ padding: '7px 14px', borderRadius: 9, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.text, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✎ Editar</button>
          {!esMoroso
            ? <button onClick={onMarcarMoroso} style={{ padding: '7px 14px', borderRadius: 9, border: `1px solid ${t.redBorder}`, background: t.red, color: t.redNum, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>🚨 Marcar problema</button>
            : <button onClick={onQuitarMoroso} style={{ padding: '7px 14px', borderRadius: 9, border: `1px solid ${t.greenBorder}`, background: t.green, color: t.greenText, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✓ Normalizar</button>
          }
          <button onClick={onEliminar} style={{ padding: '7px 14px', borderRadius: 9, border: `1px solid ${t.redBorder}`, background: t.red, color: t.redNum, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>🗑 Eliminar</button>
        </div>
      </div>

      {/* KPIs del cliente */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '11px 14px', boxShadow: t.shadow }}>
            <div style={{ fontSize: 9, color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total comprado</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: t.text }}>{formatPeso(cliente.total_ventas)}</div>
            <div style={{ fontSize: 10, color: t.textFaint, marginTop: 2 }}>{cliente.cant_ventas} ventas</div>
          </div>
          <div style={{ background: cobranzas.length > 0 ? t.amber : t.surface, border: `1px solid ${cobranzas.length > 0 ? t.amberBorder : t.border}`, borderRadius: 12, padding: '11px 14px', boxShadow: t.shadow }}>
            <div style={{ fontSize: 9, color: cobranzas.length > 0 ? t.amberSub : t.textFaint, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Cobranzas activas</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: cobranzas.length > 0 ? t.amberSub : t.text }}>{cobranzas.length}</div>
            <div style={{ fontSize: 10, color: cobranzas.length > 0 ? t.amberSub : t.textFaint, marginTop: 2 }}>
              {cobranzas.length > 0 ? formatPeso(cobranzas.reduce((s, c) => s + toFloat(c.monto_total), 0)) : 'Sin deuda'}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Cobranzas activas */}
        {!cargando && cobranzas.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Cobranzas activas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cobranzas.map(c => {
                const progreso = c.cant_cuotas > 0 ? (c.cuotas_pagas / c.cant_cuotas) * 100 : 0
                const vencida = c.estado === 'vencida' || c.estado === 'mora'
                return (
                  <div key={c.id} style={{ padding: '10px 12px', borderRadius: 11, background: vencida ? t.red : t.surface, border: `1px solid ${vencida ? t.redBorder : t.border}`, boxShadow: t.shadow }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.descripcion ?? 'Cobranza'}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: vencida ? t.redNum : t.text, flexShrink: 0, marginLeft: 8 }}>{formatPeso(c.monto_total)}</div>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: t.border, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${progreso}%`, background: vencida ? t.redNum : '#4ade80', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 10, color: vencida ? t.redNum : t.textFaint }}>
                      {c.cuotas_pagas}/{c.cant_cuotas} cuotas pagadas
                      {vencida && ' · 🚨 Vencida'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Historial de ventas */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Historial de ventas {ventas.length > 0 && `(${ventas.length})`}
          </div>
          {cargando
            ? [1, 2, 3].map(i => <div key={i} style={{ marginBottom: 8 }}><Sk h={48} t={t} /></div>)
            : ventas.length === 0
              ? <div style={{ padding: '20px 0', textAlign: 'center', color: t.textFaint, fontSize: 12 }}>Sin ventas registradas</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {ventas.map(v => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: t.surface, border: `1px solid ${t.border}` }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: t.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                        {labelPago[v.tipo_pago ?? 'efectivo'] ?? '💰'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: t.textMuted }}>{formatFechaCorta(v.fecha)}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: t.text }}>{formatPeso(v.total)}</div>
                    </div>
                  ))}
                </div>
          }
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de cliente ────────────────────────────────────────────────────────
function TarjetaCliente({ cliente, activo, t, onClick }: {
  cliente: ClienteConStats; activo: boolean; t: Tema; onClick: () => void
}) {
  const esMoroso = cliente.es_moroso
  const tieneHistorial = !esMoroso && cliente.motivo_moroso?.startsWith('[NORMALIZADO]')

  return (
    <div
      onClick={onClick}
      style={{
        padding: '13px 14px', borderRadius: 14, cursor: 'pointer',
        background: activo ? (esMoroso ? t.red : t.surfaceAlt) : t.surface,
        border: `1.5px solid ${activo ? (esMoroso ? t.redBorder : t.accent) : esMoroso ? t.redBorder : t.border}`,
        boxShadow: activo ? t.shadowMd : t.shadow,
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: esMoroso ? t.red : tieneHistorial ? t.amber : t.surfaceAlt,
        border: `1.5px solid ${esMoroso ? t.redBorder : tieneHistorial ? t.amberBorder : t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
        color: esMoroso ? t.redNum : tieneHistorial ? t.amberSub : t.textMuted,
      }}>
        {iniciales(cliente.nombre)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cliente.nombre}</span>
          {esMoroso && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: t.red, color: t.redNum, flexShrink: 0 }}>🚨</span>}
          {tieneHistorial && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: t.amber, color: t.amberSub, flexShrink: 0 }}>⚠️</span>}
        </div>
        <div style={{ fontSize: 10, color: t.textFaint, display: 'flex', gap: 8, alignItems: 'center' }}>
          {cliente.telefono && <span>{cliente.telefono}</span>}
          {cliente.zona_comercial && <span>· {cliente.zona_comercial}</span>}
        </div>
      </div>

      {/* Totales */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: t.text }}>{formatPeso(cliente.total_ventas)}</div>
        <div style={{ fontSize: 9, color: t.textFaint }}>{cliente.cant_ventas} ventas</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK LOCAL: useClientes
// ══════════════════════════════════════════════════════════════════════════════
function useClientes() {
  const [clientes,  setClientes]  = useState<ClienteConStats[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // FIX: useRef estabiliza la instancia entre renders. Sin esto createClient()
  // se ejecuta en cada render → nueva instancia → RLS rechaza silenciosamente
  // las operaciones async (especialmente delete) por contexto de sesión inconsistente.
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: err } = await db(supabase)
        .from('clientes')
        .select(`
          *,
          ventas(total, estado),
          cobranzas(monto_total, estado)
        `)
        .order('nombre', { ascending: true })

      if (err) throw new Error(err.message)

      const lista: ClienteConStats[] = ((data ?? []) as (Cliente & {
        ventas: { total: string; estado: string }[]
        cobranzas: { monto_total: string; estado: string }[]
      })[]).map(c => {
        const ventasCompletadas = (c.ventas ?? []).filter(v => v.estado === 'completada')
        const cobranzasActivas  = (c.cobranzas ?? []).filter(cb => ['activa', 'vencida', 'mora'].includes(cb.estado))
        const ultimaVenta = (c.ventas ?? []).length > 0 ? null : null
        return {
          ...c,
          total_ventas:             ventasCompletadas.reduce((s, v) => s + toFloat(v.total), 0),
          cant_ventas:              ventasCompletadas.length,
          total_cobranzas_activas:  cobranzasActivas.reduce((s, cb) => s + toFloat(cb.monto_total), 0),
          cant_cobranzas_activas:   cobranzasActivas.length,
          ultima_venta:             ultimaVenta,
        }
      })

      setClientes(lista)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { void fetchClientes() }, [fetchClientes])

  // ── Obtener negocio_id ──────────────────────────────────────────────────────
  const getNegocioId = useCallback(async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Sin autenticación')
    const { data } = await db(supabase).from('usuarios').select('negocio_id').eq('id', user.id).single()
    const row = data as { negocio_id: string | null } | null
    if (!row?.negocio_id) throw new Error('No se encontró el negocio')
    return row.negocio_id
  }, [supabase])

  // ── Crear cliente ───────────────────────────────────────────────────────────
  const crearCliente = useCallback(async (data: NuevoClienteData) => {
    setSaving(true)
    try {
      const negocioId = await getNegocioId()
      const insert = {
        negocio_id:    negocioId,
        nombre:        data.nombre,
        telefono:      data.telefono || null,
        zona_comercial: data.zona_comercial || null,
        direccion:     data.direccion || null,
        dni:           data.dni || null,
        email:         data.email || null,
        notas:         data.notas || null,
        es_moroso:     false,
        motivo_moroso: null,
        score_interno: 0,
      }
      const { error: err } = await db(supabase).from('clientes').insert(insert)
      if (err) throw new Error(err.message)
      await fetchClientes()
    } finally { setSaving(false) }
  }, [supabase, getNegocioId, fetchClientes])

  // ── Editar cliente ──────────────────────────────────────────────────────────
  const editarCliente = useCallback(async (id: string, data: NuevoClienteData) => {
    setSaving(true)
    try {
      const update = {
        nombre:        data.nombre,
        telefono:      data.telefono || null,
        zona_comercial: data.zona_comercial || null,
        direccion:     data.direccion || null,
        dni:           data.dni || null,
        email:         data.email || null,
        notas:         data.notas || null,
      }
      const { error: err } = await db(supabase).from('clientes').update(update).eq('id', id)
      if (err) throw new Error(err.message)
      await fetchClientes()
    } finally { setSaving(false) }
  }, [supabase, fetchClientes])

  // ── Eliminar cliente ────────────────────────────────────────────────────────
  const eliminarCliente = useCallback(async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      // ── Diagnóstico de sesión ───────────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[eliminarCliente] user:', user?.id ?? 'NULL — SIN SESIÓN')
      if (!user) throw new Error('Sin sesión activa. Volvé a iniciar sesión.')

      // Verificar que get_my_business_id() retorna algo válido
      const { data: negocioCheck, error: negErr } = await (supabase as any)
        .rpc('get_my_business_id')
      console.log('[eliminarCliente] get_my_business_id:', negocioCheck, 'error:', negErr)
      if (!negocioCheck) throw new Error('RLS: get_my_business_id() retornó null. Verificá la tabla usuarios.')

      // ── 1. Desvincular ventas ───────────────────────────────────────────────
      const { error: errV, count: cV } = await (supabase as any)
        .from('ventas')
        .update({ cliente_id: null })
        .eq('cliente_id', id)
        .select('id', { count: 'exact', head: true })
      console.log('[eliminarCliente] desvincular ventas — error:', errV, 'count:', cV)
      if (errV) throw new Error(`Error al desvincular ventas: ${errV.message}`)

      // ── 2. Desvincular cobranzas ────────────────────────────────────────────
      const { error: errC, count: cC } = await (supabase as any)
        .from('cobranzas')
        .update({ cliente_id: null })
        .eq('cliente_id', id)
        .select('id', { count: 'exact', head: true })
      console.log('[eliminarCliente] desvincular cobranzas — error:', errC, 'count:', cC)
      if (errC) throw new Error(`Error al desvincular cobranzas: ${errC.message}`)

      // ── 3. Eliminar el cliente ──────────────────────────────────────────────
      const deleteResult = await (supabase as any)
        .from('clientes')
        .delete()
        .eq('id', id)
        .select('id')   // select() después de delete() devuelve las filas eliminadas
      console.log('[eliminarCliente] delete result completo:', JSON.stringify(deleteResult))

      if (deleteResult.error) throw new Error(`Error al eliminar: ${deleteResult.error.message}`)

      // Si data es array vacío → RLS bloqueó el delete (no hay error pero tampoco eliminó)
      if (!deleteResult.data || deleteResult.data.length === 0) {
        throw new Error('El cliente no se pudo eliminar. Verificá que pertenece a tu negocio (RLS). Revisá la consola del navegador para más detalles.')
      }

      console.log('[eliminarCliente] ✓ eliminado correctamente, filas afectadas:', deleteResult.data.length)

      // Actualizar estado local y sincronizar con la BD
      setClientes(prev => prev.filter(c => c.id !== id))
      await fetchClientes()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar cliente'
      setError(msg)
      console.error('[eliminarCliente] ERROR:', err)
      throw err
    } finally {
      setSaving(false)
    }
  }, [supabase, fetchClientes])

  // ── Marcar moroso ───────────────────────────────────────────────────────────
  const marcarMoroso = useCallback(async (id: string, motivo: string) => {
    setSaving(true)
    try {
      await db(supabase).from('clientes').update({ es_moroso: true, motivo_moroso: motivo }).eq('id', id)
      setClientes(prev => prev.map(c => c.id === id ? { ...c, es_moroso: true, motivo_moroso: motivo } : c))
    } finally { setSaving(false) }
  }, [supabase])

  // ── Quitar moroso ───────────────────────────────────────────────────────────
  const quitarMoroso = useCallback(async (id: string) => {
    setSaving(true)
    try {
      const c = clientes.find(x => x.id === id)
      const historial = c?.motivo_moroso && !c.motivo_moroso.startsWith('[NORMALIZADO]')
        ? `[NORMALIZADO] ${c.motivo_moroso}` : '[NORMALIZADO]'
      await db(supabase).from('clientes').update({ es_moroso: false, motivo_moroso: historial }).eq('id', id)
      setClientes(prev => prev.map(c => c.id === id ? { ...c, es_moroso: false, motivo_moroso: historial } : c))
    } finally { setSaving(false) }
  }, [supabase, clientes])

  return { clientes, loading, saving, error, crearCliente, editarCliente, eliminarCliente, marcarMoroso, quitarMoroso, refetch: fetchClientes }
}

// ── Modal marcar problemático ─────────────────────────────────────────────────
function ModalProblematico({ nombre, t, onConfirm, onCancel, saving }: {
  nombre: string; t: Tema; saving: boolean
  onConfirm: (motivo: string) => Promise<void>; onCancel: () => void
}) {
  const motivos = [
    { key: 'no_pago',          label: 'No pagó cuotas',   icon: '💸' },
    { key: 'no_retiro_pedido', label: 'No retiró pedido', icon: '📦' },
    { key: 'no_responde',      label: 'No responde',      icon: '🔕' },
    { key: 'cheque_rechazado', label: 'Cheque rechazado', icon: '❌' },
    { key: 'otro',             label: 'Otro motivo',      icon: '⚠️' },
  ]
  const [sel,     setSel]     = useState('no_pago')
  const [detalle, setDetalle] = useState('')

  const motivoTexto: Record<string, string> = {
    no_pago: 'No pagó cuotas', no_retiro_pedido: 'No retiró pedido',
    no_responde: 'No responde', cheque_rechazado: 'Cheque rechazado',
    otro: detalle || 'Otro motivo',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 22px', maxWidth: 360, width: '100%', boxShadow: t.shadowMd, animation: 'popIn 0.18s ease' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 4 }}>🚨 Marcar problemático</div>
        <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 18 }}>{nombre}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
          {motivos.map(m => (
            <button key={m.key} onClick={() => setSel(m.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${sel === m.key ? t.redNum : t.border}`, background: sel === m.key ? t.red : t.surfaceAlt, color: sel === m.key ? t.redNum : t.textMuted, cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: sel === m.key ? 700 : 400 }}>
              <span>{m.icon}</span><span>{m.label}</span>
            </button>
          ))}
        </div>
        {sel === 'otro' && (
          <textarea value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Describí brevemente el problema..." rows={2}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'none', marginBottom: 14, boxSizing: 'border-box' as const }} />
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onConfirm(motivoTexto[sel])} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: t.redNum, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            {saving ? 'Guardando...' : '🚨 Marcar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENTES VIEW PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function ClientesView({ usuario }: ClientesViewProps) {
  const [dark, setDark] = useDarkMode()
  const [isMobile,   setIsMobile]   = useState(false)
  const router = useRouter()

  const hook = useClientes()

  // Modales
  const [modalNuevo,      setModalNuevo]      = useState(false)
  const [modalEditar,     setModalEditar]     = useState<ClienteConStats | null>(null)
  const [modalEliminar,   setModalEliminar]   = useState<ClienteConStats | null>(null)
  const [modalMoroso,     setModalMoroso]     = useState<ClienteConStats | null>(null)
  const [clienteDetalle,  setClienteDetalle]  = useState<ClienteConStats | null>(null)

  // Filtros y búsqueda
  const [busqueda,  setBusqueda]  = useState('')
  const [filtro,    setFiltro]    = useState<'todos' | 'morosos' | 'con_deuda'>('todos')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const t = dark ? tema.dark : tema.light

  // Filtrado
  const clientesFiltrados = hook.clientes
    .filter(c => {
      if (filtro === 'morosos')   return c.es_moroso
      if (filtro === 'con_deuda') return c.cant_cobranzas_activas > 0
      return true
    })
    .filter(c => {
      if (!busqueda) return true
      const q = busqueda.toLowerCase()
      return (
        c.nombre.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.zona_comercial?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.dni?.includes(q)
      )
    })

  // KPIs
  const kpis = [
    { label: 'Total clientes',  value: String(hook.clientes.length),                                icon: '👥', color: t.text },
    { label: 'Con deuda activa', value: String(hook.clientes.filter(c => c.cant_cobranzas_activas > 0).length), icon: '💸', color: t.amberSub },
    { label: 'Problemáticos',   value: String(hook.clientes.filter(c => c.es_moroso).length),       icon: '🚨', color: t.redNum },
    { label: 'Zonas',           value: String(new Set(hook.clientes.map(c => c.zona_comercial).filter(Boolean)).size), icon: '📍', color: t.blueText },
  ]

  const handleCrearCliente = async (data: NuevoClienteData) => {
    await hook.crearCliente(data)
    setModalNuevo(false)
  }

  const handleEditarCliente = async (data: NuevoClienteData) => {
    if (!modalEditar) return
    await hook.editarCliente(modalEditar.id, data)
    setModalEditar(null)
    if (clienteDetalle?.id === modalEditar.id) {
      setClienteDetalle(prev => prev ? { ...prev, ...data } as ClienteConStats : null)
    }
  }

  const handleEliminarCliente = async () => {
    if (!modalEliminar) return
    try {
      await hook.eliminarCliente(modalEliminar.id)
      // Solo cerrar el modal si la eliminación fue exitosa
      if (clienteDetalle?.id === modalEliminar.id) setClienteDetalle(null)
      setModalEliminar(null)
    } catch {
      // El error ya fue seteado en hook.error por eliminarCliente
      // No cerramos el modal para que el usuario vea qué pasó
    }
  }

  const handleMarcarMoroso = async (motivo: string) => {
    if (!modalMoroso) return
    await hook.marcarMoroso(modalMoroso.id, motivo)
    setModalMoroso(null)
    if (clienteDetalle?.id === modalMoroso.id) {
      setClienteDetalle(prev => prev ? { ...prev, es_moroso: true, motivo_moroso: motivo } : null)
    }
  }

  const handleQuitarMoroso = async (id: string) => {
    await hook.quitarMoroso(id)
    if (clienteDetalle?.id === id) {
      const c = hook.clientes.find(x => x.id === id)
      if (c) setClienteDetalle({ ...c, es_moroso: false })
    }
  }

  const sidebar = <Sidebar activo="dashboard" usuario={usuario} dark={dark} setDark={setDark} t={t} />

  const listaContent = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ height: 54, background: t.surface, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0 }}>
        {isMobile && (
          <button onClick={() => router.push('/dashboard')} style={{ marginRight: 12, background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18 }}>←</button>
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Clientes</div>
          <div style={{ fontSize: 10, color: t.textMuted }}>{hook.clientes.length} registrados · {hook.clientes.filter(c => c.es_moroso).length} problemáticos</div>
        </div>
        <button onClick={() => setModalNuevo(true)}
          style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 10, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          ＋ Nuevo
        </button>
      </div>

      {/* KPIs */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 10 }}>
          {hook.loading
            ? [1, 2, 3, 4].map(i => <Sk key={i} h={68} radius={12} t={t} />)
            : kpis.map((k, i) => (
                <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '11px 14px', boxShadow: t.shadow }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: t.textMuted }}>{k.label}</span>
                    <span style={{ fontSize: 16 }}>{k.icon}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'monospace' }}>{k.value}</div>
                </div>
              ))
          }
        </div>
      </div>

      {/* Buscador y filtros */}
      <div style={{ padding: '12px 20px 0', display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre, teléfono, zona..."
          style={{
            flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 10,
            border: `1.5px solid ${t.border}`, background: t.surfaceAlt,
            color: t.text, fontSize: 12, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', gap: 5 }}>
          {([
            ['todos',     'Todos'],
            ['morosos',   '🚨 Problemáticos'],
            ['con_deuda', '💸 Con deuda'],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFiltro(key)}
              style={{ padding: '7px 13px', borderRadius: 20, border: `1.5px solid ${filtro === key ? t.accent : t.border}`, background: filtro === key ? t.surfaceAlt : 'transparent', color: filtro === key ? t.accent : t.textMuted, fontSize: 11, fontWeight: filtro === key ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', paddingBottom: isMobile ? 80 : 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hook.loading
          ? [1, 2, 3, 4, 5].map(i => <Sk key={i} h={70} radius={14} t={t} />)
          : clientesFiltrados.length === 0
            ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: t.textFaint }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>{busqueda ? '🔍' : '👥'}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.textMuted }}>{busqueda ? `Sin resultados para "${busqueda}"` : 'Sin clientes registrados'}</div>
                {!busqueda && <div style={{ fontSize: 12, marginTop: 6 }}>Creá tu primer cliente con el botón ＋</div>}
              </div>
            )
            : clientesFiltrados.map(c => (
                <TarjetaCliente
                  key={c.id}
                  cliente={c}
                  activo={clienteDetalle?.id === c.id}
                  t={t}
                  onClick={() => setClienteDetalle(clienteDetalle?.id === c.id ? null : c)}
                />
              ))
        }
      </div>

      {/* Bottom nav mobile */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.navBg, backdropFilter: 'blur(16px)', borderTop: `1px solid ${t.border}`, padding: '10px 0 20px', display: 'flex', justifyContent: 'space-around', zIndex: 50 }}>
          {([['⊞','Inicio','/dashboard'],['↗','Ventas','/ventas'],['◎','Cobros','/cobranzas'],['👥','Clientes','/clientes'],['▦','Stock','/stock']] as [string,string,string][]).map(([icon, label, href]) => (
            <div key={label} onClick={() => router.push(href)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
              <div style={{ fontSize: 18, color: label === 'Clientes' ? t.accent : t.textFaint }}>{icon}</div>
              <div style={{ fontSize: 9, color: label === 'Clientes' ? t.accent : t.textFaint, fontWeight: label === 'Clientes' ? 700 : 400 }}>{label}</div>
              {label === 'Clientes' && <div style={{ width: 4, height: 4, borderRadius: '50%', background: t.accent }} />}
            </div>
          ))}
          <MenuMas t={t} dark={dark} />
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

      <div style={{ height: '100vh', display: 'flex', background: t.bg, fontFamily: "'DM Sans',system-ui,sans-serif", overflow: 'hidden' }}>
        {!isMobile && sidebar}

        {/* Layout split: lista + panel detalle en desktop */}
        {!isMobile && clienteDetalle ? (
          <>
            <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: `1px solid ${t.border}` }}>
              {listaContent}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', borderLeft: `1px solid ${t.border}` }}>
              <PanelDetalle
                cliente={hook.clientes.find(c => c.id === clienteDetalle.id) ?? clienteDetalle}
                t={t} dark={dark}
                onEditar={() => setModalEditar(hook.clientes.find(c => c.id === clienteDetalle.id) ?? clienteDetalle)}
                onEliminar={() => setModalEliminar(hook.clientes.find(c => c.id === clienteDetalle.id) ?? clienteDetalle)}
                onMarcarMoroso={() => setModalMoroso(hook.clientes.find(c => c.id === clienteDetalle.id) ?? clienteDetalle)}
                onQuitarMoroso={() => handleQuitarMoroso(clienteDetalle.id)}
                onClose={() => setClienteDetalle(null)}
              />
            </div>
          </>
        ) : isMobile && clienteDetalle ? (
          // Mobile: panel detalle ocupa toda la pantalla
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <PanelDetalle
              cliente={hook.clientes.find(c => c.id === clienteDetalle.id) ?? clienteDetalle}
              t={t} dark={dark}
              onEditar={() => setModalEditar(hook.clientes.find(c => c.id === clienteDetalle.id) ?? clienteDetalle)}
              onEliminar={() => setModalEliminar(hook.clientes.find(c => c.id === clienteDetalle.id) ?? clienteDetalle)}
              onMarcarMoroso={() => setModalMoroso(hook.clientes.find(c => c.id === clienteDetalle.id) ?? clienteDetalle)}
              onQuitarMoroso={() => handleQuitarMoroso(clienteDetalle.id)}
              onClose={() => setClienteDetalle(null)}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {listaContent}
          </div>
        )}
      </div>

      {/* Modales */}
      {modalNuevo && (
        <ModalCliente t={t} dark={dark} saving={hook.saving} onConfirm={handleCrearCliente} onCancel={() => setModalNuevo(false)} />
      )}
      {modalEditar && (
        <ModalCliente cliente={modalEditar} t={t} dark={dark} saving={hook.saving} onConfirm={handleEditarCliente} onCancel={() => setModalEditar(null)} />
      )}
      {modalEliminar && (
        <ModalEliminar
          cliente={modalEliminar}
          cantVentas={modalEliminar.cant_ventas}
          cantCobranzas={modalEliminar.cant_cobranzas_activas}
          t={t} saving={hook.saving}
          onConfirm={handleEliminarCliente}
          onCancel={() => setModalEliminar(null)}
        />
      )}
      {modalMoroso && (
        <ModalProblematico
          nombre={modalMoroso.nombre}
          t={t} saving={hook.saving}
          onConfirm={handleMarcarMoroso}
          onCancel={() => setModalMoroso(null)}
        />
      )}
    </>
  )
}