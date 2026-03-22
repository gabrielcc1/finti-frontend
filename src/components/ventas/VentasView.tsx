'use client'

// src/components/ventas/VentasView.tsx
// NUEVO: filtros por período, editar venta, eliminar venta

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Sidebar } from '@/components/shared/Sidebar'
import { MenuMas } from '@/components/shared/MenuMas'
import { createClient } from '@/lib/supabase/client'
import type { useVentas, ItemVenta, NuevaVentaData, NuevoClienteData, VentaConItems } from '@/hooks/useVentas'
import { useComprobante } from '@/hooks/useComprobante'

interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface VentasViewProps { usuario: UsuarioInfo; ventas: ReturnType<typeof useVentas> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbs = (s: any) => s as any

const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0
const formatPeso = (n: string | number | null | undefined) => {
  const num = toFloat(n)
  const parts = num.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$${parts[0]},${parts[1]}`
}
const formatFecha = (iso: string) => {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}`
}

type Periodo = 'hoy' | 'semana' | 'mes'

function ventasDelPeriodo(lista: VentaConItems[], periodo: Periodo): VentaConItems[] {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const fin = new Date(); fin.setHours(23, 59, 59, 999)
  if (periodo === 'hoy') {
    return lista.filter(v => { const f = new Date(v.fecha + 'T12:00:00'); return f >= hoy && f <= fin })
  }
  if (periodo === 'semana') {
    const inicio = new Date(hoy); inicio.setDate(hoy.getDate() - 6)
    return lista.filter(v => { const f = new Date(v.fecha + 'T12:00:00'); return f >= inicio && f <= fin })
  }
  return lista
}

const tema = {
  light: {
    bg: '#fafaf8', surface: '#ffffff', surfaceAlt: '#f5f5f2', border: '#e8e8e4', borderLight: '#f0f0ec',
    text: '#111827', textMuted: '#6b7280', textFaint: '#9ca3af', accent: '#111827', accentText: '#ffffff',
    green: '#f0fdf4', greenBorder: '#bbf7d0', greenText: '#166534',
    amber: '#fffbeb', amberBorder: '#fde68a', amberSub: '#d97706',
    red: '#fff1f2', redBorder: '#fecdd3', redNum: '#dc2626',
    shadow: '0 1px 4px rgba(0,0,0,0.06)', shadowMd: '0 4px 16px rgba(0,0,0,0.08)', navBg: 'rgba(255,255,255,0.92)',
  },
  dark: {
    bg: '#141210', surface: '#1c1916', surfaceAlt: '#211e1b', border: '#2e2924', borderLight: '#252019',
    text: '#e8e0d4', textMuted: '#7a6e62', textFaint: '#4a4238', accent: '#d4a96a', accentText: '#141210',
    green: '#0e1f12', greenBorder: '#1a3820', greenText: '#4a7a54',
    amber: '#1f1a0e', amberBorder: '#3d3010', amberSub: '#a87d30',
    red: '#1f0e0e', redBorder: '#3d1010', redNum: '#f87171',
    shadow: '0 1px 6px rgba(0,0,0,0.4)', shadowMd: '0 4px 20px rgba(0,0,0,0.5)', navBg: 'rgba(20,18,16,0.95)',
  },
}
type Tema = typeof tema.light

// ── Modal editar venta ────────────────────────────────────────────────────────
function ModalEditarVenta({ venta, t, onConfirm, onCancel, saving }: {
  venta: VentaConItems; t: Tema
  onConfirm: (tipoPago: string, notas: string) => Promise<void>
  onCancel: () => void; saving: boolean
}) {
  const [tipoPago, setTipoPago] = useState(venta.tipo_pago ?? 'efectivo')
  const [notas, setNotas] = useState(venta.notas ?? '')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 22px', maxWidth: 380, width: '100%', boxShadow: t.shadowMd, animation: 'popIn 0.18s ease' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 4 }}>Editar venta</div>
        <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 20 }}>
          {venta.clientes?.nombre ?? 'Consumidor final'} · {formatFecha(venta.fecha)} · {formatPeso(venta.total)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Forma de pago</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['efectivo', 'transferencia', 'tarjeta', 'cuotas'] as const).map(tp => (
                <button key={tp} onClick={() => setTipoPago(tp)}
                  style={{ padding: '10px 0', borderRadius: 10, border: `1.5px solid ${tipoPago === tp ? t.accent : t.border}`, background: tipoPago === tp ? t.surfaceAlt : t.surface, color: tipoPago === tp ? t.accent : t.textMuted, fontSize: 12, fontWeight: tipoPago === tp ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {tp === 'efectivo' ? '💵 Efectivo' : tp === 'transferencia' ? '📲 Transf.' : tp === 'tarjeta' ? '💳 Tarjeta' : '📋 Cuotas'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Notas de la venta..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box' as const }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => onConfirm(tipoPago, notas)} disabled={saving}
              style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal eliminar venta ──────────────────────────────────────────────────────
function ModalEliminarVenta({ venta, t, onConfirm, onCancel, saving }: {
  venta: VentaConItems; t: Tema
  onConfirm: () => Promise<void>
  onCancel: () => void; saving: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: '28px 24px', maxWidth: 340, width: '100%', boxShadow: t.shadowMd, animation: 'popIn 0.18s ease', textAlign: 'center' as const }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🗑</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 6 }}>¿Eliminar esta venta?</div>
        <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 4 }}>{venta.clientes?.nombre ?? 'Consumidor final'}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.redNum, fontFamily: 'monospace', marginBottom: 16 }}>{formatPeso(venta.total)}</div>
        <div style={{ fontSize: 11, color: t.redNum, marginBottom: 20, padding: '8px 12px', borderRadius: 9, background: t.red, border: `1px solid ${t.redBorder}` }}>
          Esta acción no se puede deshacer. El stock no se restaura automáticamente.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} disabled={saving}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: t.redNum, color: '#fff', fontSize: 13, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Formulario nuevo cliente inline ──────────────────────────────────────────
function FormNuevoClienteInline({ t, dark, saving, onGuardar, onCancelar }: {
  t: Tema; dark: boolean; saving: boolean
  onGuardar: (data: NuevoClienteData) => Promise<void>
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [zonaComercial, setZonaComercial] = useState('')
  const [direccion, setDireccion] = useState('')
  const [dni, setDni] = useState('')
  const [email, setEmail] = useState('')
  const [errorLocal, setErrorLocal] = useState('')
  const puedeGuardar = nombre.trim() !== '' && telefono.trim() !== '' && zonaComercial.trim() !== ''

  const inp = { width: '100%', padding: '9px 11px', borderRadius: 9, border: `1.5px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { fontSize: 10, fontWeight: 700 as const, color: t.textMuted, display: 'block' as const, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }

  return (
    <div style={{ marginTop: 10, padding: '14px', borderRadius: 12, border: `1.5px solid ${t.accent}`, background: dark ? '#1a1714' : '#fafaf8', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>👤 Nuevo cliente</span>
      <div><label style={lbl}>Nombre *</label><input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="María González" style={inp} autoFocus /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div><label style={lbl}>Teléfono *</label><input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} style={inp} /></div>
        <div><label style={lbl}>Zona *</label><input type="text" value={zonaComercial} onChange={e => setZonaComercial(e.target.value)} style={inp} /></div>
      </div>
      <div><label style={lbl}>Dirección (opc.)</label><input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} style={inp} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div><label style={lbl}>DNI (opc.)</label><input type="text" value={dni} onChange={e => setDni(e.target.value)} style={inp} /></div>
        <div><label style={lbl}>Email (opc.)</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} /></div>
      </div>
      {errorLocal && <div style={{ fontSize: 11, color: t.redNum, padding: '6px 10px', borderRadius: 7, background: t.red }}>{errorLocal}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancelar} style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={async () => { if (!puedeGuardar) { setErrorLocal('Nombre, teléfono y zona son obligatorios.'); return } setErrorLocal(''); await onGuardar({ nombre, telefono, zona_comercial: zonaComercial, direccion, dni, email }) }}
          disabled={!puedeGuardar || saving}
          style={{ flex: 2, padding: '8px 0', borderRadius: 9, border: 'none', background: puedeGuardar && !saving ? t.accent : t.surfaceAlt, color: puedeGuardar && !saving ? t.accentText : t.textFaint, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Guardando...' : '✓ Crear cliente'}
        </button>
      </div>
    </div>
  )
}

// ── Formulario nueva venta ────────────────────────────────────────────────────
function FormNuevaVenta({ ventas, t, dark, onClose }: {
  ventas: ReturnType<typeof useVentas>; t: Tema; dark: boolean; onClose: () => void
}) {
  const [clienteId, setClienteId] = useState('')
  const [items, setItems] = useState<ItemVenta[]>([])
  const [descuento, setDescuento] = useState(0)
  const [tipoPago, setTipoPago] = useState<NuevaVentaData['tipo_pago']>('efectivo')
  const [cantCuotas, setCantCuotas] = useState(0)
  const [fechaPrimerCobro, setFechaPrimerCobro] = useState('')
  const [notas, setNotas] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [exito, setExito] = useState(false)
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false)
  const [clienteRecienCreado, setClienteRecienCreado] = useState<string | null>(null)
  const [clienteMoroso, setClienteMoroso] = useState<{ nombre: string; motivo: string | null } | null>(null)

  const total = items.reduce((s, i) => s + i.subtotal, 0) - descuento
  const prodsFilt = ventas.productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  const agregarProducto = useCallback((prod: ReturnType<typeof useVentas>['productos'][0]) => {
    setItems(prev => {
      const existe = prev.find(i => i.producto_id === prod.id)
      if (existe) return prev.map(i => i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio } : i)
      return [...prev, { producto_id: prod.id, nombre: prod.nombre, precio: toFloat(prod.precio_unitario), cantidad: 1, subtotal: toFloat(prod.precio_unitario) }]
    })
    setBusqueda('')
  }, [])

  const handleGuardar = async () => {
    if (items.length === 0) return
    try {
      await ventas.registrarVenta({ cliente_id: clienteId || null, items, descuento, tipo_pago: tipoPago, cant_cuotas: cantCuotas, notas: notas || undefined, fecha_primer_cobro: tipoPago === 'cuotas' && fechaPrimerCobro ? fechaPrimerCobro : undefined })
      setExito(true)
      setTimeout(() => { setExito(false); onClose() }, 1500)
    } catch (err) { console.error(err) }
  }

  if (exito) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
      <div style={{ fontSize: 56 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>¡Venta registrada!</div>
      <div style={{ fontSize: 13, color: t.textMuted }}>{formatPeso(total)}</div>
    </div>
  )

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cliente</label>
          {!mostrarFormCliente && <button onClick={() => { setMostrarFormCliente(true); setClienteId('') }} style={{ fontSize: 11, fontWeight: 700, color: t.accent, background: 'none', border: 'none', cursor: 'pointer' }}>+ Nuevo cliente</button>}
        </div>
        {!mostrarFormCliente && (
          <div>
            <select value={clienteId} onChange={e => {
              const id = e.target.value
              setClienteId(id)
              setClienteRecienCreado(null)
              // Verificar si el cliente seleccionado es moroso
              const c = ventas.clientes.find(c => c.id === id)
              setClienteMoroso(c?.es_moroso ? { nombre: c.nombre, motivo: c.motivo_moroso ?? null } : null)
            }} >
              <option value="">Consumidor final</option>
              {ventas.clientes.map(c => <option key={c.id} value={c.id}>{c.id === clienteRecienCreado ? `✓ ${c.nombre}` : c.nombre}</option>)}
            </select>
            {clienteRecienCreado && clienteId === clienteRecienCreado && <div style={{ marginTop: 6, padding: '5px 10px', borderRadius: 7, background: t.green, border: `1px solid ${t.greenBorder}`, fontSize: 11, color: t.greenText, fontWeight: 600 }}>✓ Cliente creado y seleccionado</div>}
          </div>
        )}
        {clienteMoroso && (
          <div style={{
            marginTop: 8,
            padding: '10px 14px',
            borderRadius: 11,
            background: t.red,
            border: `1.5px solid ${t.redBorder}`,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🚨</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: t.redNum }}>
                ¡Atención! {clienteMoroso.nombre} tiene deudas pendientes
              </div>
              {clienteMoroso.motivo && (
                <div style={{ fontSize: 11, color: t.redNum, opacity: 0.85, marginTop: 3 }}>
                  Motivo: {clienteMoroso.motivo}
                </div>
              )}
              <div style={{ fontSize: 11, color: t.redNum, opacity: 0.75, marginTop: 3 }}>
                Podés continuar de todas formas o revisar sus cobranzas antes.
              </div>
            </div>
          </div>
        )}
        {mostrarFormCliente && <FormNuevoClienteInline t={t} dark={dark} saving={ventas.saving} onGuardar={async (d) => { const n = await ventas.crearCliente(d); setClienteId(n.id); setClienteRecienCreado(n.id); setMostrarFormCliente(false) }} onCancelar={() => setMostrarFormCliente(false)} />}
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Agregar productos</label>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar producto..." style={inp} />
        {busqueda && (
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, background: t.surface, marginTop: 4, maxHeight: 180, overflowY: 'auto', boxShadow: t.shadowMd }}>
            {prodsFilt.length === 0 ? <div style={{ padding: '12px 14px', color: t.textFaint, fontSize: 12 }}>Sin resultados</div>
              : prodsFilt.map(p => (
                <div key={p.id} onClick={() => agregarProducto(p)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.surfaceAlt)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.nombre}</div><div style={{ fontSize: 10, color: t.textFaint }}>Stock: {p.stock_actual}</div></div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, fontFamily: 'monospace' }}>{formatPeso(p.precio_unitario)}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => (
            <div key={item.producto_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                <div style={{ fontSize: 10, color: t.textMuted }}>{formatPeso(item.precio)} c/u</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setItems(p => p.map(i => i.producto_id === item.producto_id ? { ...i, cantidad: Math.max(1, i.cantidad - 1), subtotal: Math.max(1, i.cantidad - 1) * i.precio } : i).filter(i => i.cantidad > 0))} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${t.border}`, background: t.surface, color: t.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: t.text, minWidth: 20, textAlign: 'center' }}>{item.cantidad}</span>
                <button onClick={() => setItems(p => p.map(i => i.producto_id === item.producto_id ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio } : i))} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${t.border}`, background: t.surface, color: t.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: 'monospace', minWidth: 70, textAlign: 'right' }}>{formatPeso(item.subtotal)}</div>
              <button onClick={() => setItems(p => p.filter(i => i.producto_id !== item.producto_id))} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: t.red, color: t.redNum, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          ))}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: t.surface, border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, color: t.textMuted }}>Subtotal</span><span style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: 'monospace' }}>{formatPeso(items.reduce((s, i) => s + i.subtotal, 0))}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: t.textMuted }}>Descuento</span>
              <input type="number" value={descuento || ''} onChange={e => setDescuento(Number(e.target.value))} placeholder="$0" min={0} style={{ width: 90, padding: '4px 8px', borderRadius: 7, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 12, fontFamily: 'monospace', outline: 'none', textAlign: 'right' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: t.text }}>TOTAL</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: t.accent, fontFamily: 'monospace' }}>{formatPeso(total)}</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Forma de pago</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['efectivo', 'transferencia', 'tarjeta', 'cuotas'] as const).map(tp => (
            <button key={tp} onClick={() => setTipoPago(tp)} style={{ padding: '10px 0', borderRadius: 10, border: `1.5px solid ${tipoPago === tp ? t.accent : t.border}`, background: tipoPago === tp ? t.surfaceAlt : t.surface, color: tipoPago === tp ? t.accent : t.textMuted, fontSize: 12, fontWeight: tipoPago === tp ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
              {tp === 'efectivo' ? '💵 Efectivo' : tp === 'transferencia' ? '📲 Transferencia' : tp === 'tarjeta' ? '💳 Tarjeta' : '📋 Cuotas'}
            </button>
          ))}
        </div>
        {tipoPago === 'cuotas' && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: t.textMuted, flexShrink: 0 }}>Cuotas:</span>
            <input type="number" min="1" max="60" value={cantCuotas || ''} onChange={e => setCantCuotas(Math.max(1, parseInt(e.target.value) || 1))} placeholder="Ej: 3"
              style={{ width: 90, padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            {cantCuotas > 0 && total > 0 && <span style={{ fontSize: 11, color: t.textMuted }}>{cantCuotas} × {formatPeso(total / cantCuotas)}</span>}
          </div>
        )}
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Notas (opcional)</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Ej: Cliente pagó con billete..."
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box' as const }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={handleGuardar} disabled={items.length === 0 || ventas.saving}
          style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: items.length === 0 ? t.surfaceAlt : t.accent, color: items.length === 0 ? t.textFaint : t.accentText, fontSize: 13, fontWeight: 800, cursor: items.length === 0 ? 'not-allowed' : 'pointer' }}>
          {ventas.saving ? 'Guardando...' : `✓ Confirmar ${formatPeso(total)}`}
        </button>
      </div>
    </div>
  )
}

// ── Lista de ventas ───────────────────────────────────────────────────────────
function ListaVentas({ ventas, t, dark, negocio, onEditar, onEliminar }: {
  ventas: ReturnType<typeof useVentas>; t: Tema; dark: boolean
  negocio: { nombre: string }
  onEditar: (v: VentaConItems) => void
  onEliminar: (v: VentaConItems) => void
}) {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const comprobante = useComprobante({ nombre: negocio.nombre })

  const coloresPago: Record<string, { bg: string; color: string; label: string }> = {
    efectivo: { bg: '#f0fdf4', color: '#166534', label: '💵 Efectivo' },
    transferencia: { bg: '#eff6ff', color: '#1d4ed8', label: '📲 Transf.' },
    tarjeta: { bg: '#faf5ff', color: '#7c3aed', label: '💳 Tarjeta' },
    cuotas: { bg: '#fffbeb', color: '#d97706', label: '📋 Cuotas' },
  }

  if (ventas.loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: t.surfaceAlt, overflow: 'hidden', position: 'relative' }}><div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg,transparent,${t.surface},transparent)`, animation: 'shimmer 1.4s infinite' }} /></div>)}
    </div>
  )

  const lista = ventasDelPeriodo(ventas.ventas as VentaConItems[], periodo)
  const totalPeriodo = lista.reduce((s, v) => s + toFloat(v.total), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Selector de período */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {([['hoy', 'Hoy'], ['semana', '7 días'], ['mes', 'Este mes']] as [Periodo, string][]).map(([p, label]) => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{ padding: '6px 13px', borderRadius: 20, border: `1.5px solid ${periodo === p ? t.accent : t.border}`, background: periodo === p ? t.surfaceAlt : 'transparent', color: periodo === p ? t.accent : t.textMuted, fontSize: 11, fontWeight: periodo === p ? 700 : 400, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: t.accent, fontFamily: 'monospace' }}>{formatPeso(totalPeriodo)}</div>
          <div style={{ fontSize: 9, color: t.textFaint }}>{lista.length} venta{lista.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: t.textFaint }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.textMuted }}>Sin ventas en este período</div>
        </div>
      ) : lista.map(v => {
        const col = coloresPago[v.tipo_pago ?? 'efectivo'] ?? coloresPago.efectivo
        const cliente = v.clientes?.nombre ?? 'Consumidor final'
        const iniciales = cliente.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        return (
          <div key={v.id} style={{ padding: '12px 14px', borderRadius: 13, background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
            {/* Fila 1: Avatar + Nombre + Acciones */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: t.surfaceAlt, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: t.textMuted }}>
                {iniciales}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, wordBreak: 'break-word', lineHeight: 1.3 }}>{cliente}</div>
                <div style={{ fontSize: 10, color: t.textFaint, marginTop: 2 }}>{formatFecha(v.fecha)} · {v.venta_items?.length ?? 0} ítem{(v.venta_items?.length ?? 0) !== 1 ? 's' : ''}</div>
              </div>
              {/* Botones: PDF · Editar · Eliminar */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => comprobante.descargarComprobanteVenta(v)} disabled={comprobante.generando} title="Descargar PDF"
                  style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: comprobante.generando ? 0.5 : 1 }}>
                  {comprobante.generando ? '⏳' : '⬇'}
                </button>
                <button onClick={() => onEditar(v)} title="Editar"
                  style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✎
                </button>
                <button onClick={() => onEliminar(v)} title="Eliminar"
                  style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${t.redBorder}`, background: t.red, color: t.redNum, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  🗑
                </button>
              </div>
            </div>
            {/* Fila 2: Badge + Monto */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 46 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: col.bg, color: col.color }}>{col.label}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: t.text, fontFamily: "'DM Mono',monospace" }}>{formatPeso(v.total)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VENTAS VIEW PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function VentasView({ usuario, ventas }: VentasViewProps) {
  const [dark, setDark] = useDarkMode()
  const [isMobile, setIsMobile] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [ventaEditar, setVentaEditar] = useState<VentaConItems | null>(null)
  const [ventaEliminar, setVentaEliminar] = useState<VentaConItems | null>(null)
  const [savingAccion, setSavingAccion] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const t = dark ? tema.dark : tema.light

  const handleEditarVenta = async (tipoPago: string, notas: string) => {
    if (!ventaEditar) return
    setSavingAccion(true)
    try {
      await dbs(supabase).from('ventas').update({ tipo_pago: tipoPago, notas: notas || null }).eq('id', ventaEditar.id)
      await ventas.refetch()
      setVentaEditar(null)
    } catch (err) { console.error(err) }
    finally { setSavingAccion(false) }
  }

  const handleEliminarVenta = async () => {
    if (!ventaEliminar) return
    setSavingAccion(true)
    try {
      await dbs(supabase).from('venta_items').delete().eq('venta_id', ventaEliminar.id)
      await dbs(supabase).from('ventas').delete().eq('id', ventaEliminar.id)
      await ventas.refetch()
      setVentaEliminar(null)
    } catch (err) { console.error(err) }
    finally { setSavingAccion(false) }
  }

  // FIX: refresca la lista de clientes antes de abrir el modal
  // para que los clientes eliminados desde otro módulo no aparezcan
  const handleAbrirNuevaVenta = useCallback(async () => {
    if (ventas.refetchClientes) {
      try { await ventas.refetchClientes() } catch { /* continuar igual */ }
    }
    setShowForm(true)
  }, [ventas])

  const kpis = [
    { label: 'Total mes', value: formatPeso(ventas.resumen.totalMes), icon: '📦' },
    { label: 'Ventas', value: String(ventas.resumen.cantidadMes), icon: '🛒' },
    { label: 'Efectivo', value: formatPeso(ventas.resumen.efectivo), icon: '💵' },
    { label: 'En cuotas', value: formatPeso(ventas.resumen.cuotas), icon: '📋' },
  ]

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

      <div suppressHydrationWarning style={{ height: '100vh', display: 'flex', background: t.bg, fontFamily: "'DM Sans',system-ui,sans-serif", overflow: 'hidden' }}>
        {!isMobile && <Sidebar activo="ventas" usuario={usuario} dark={dark} setDark={setDark} t={t} />}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Topbar */}
          <div style={{ height: 54, background: t.surface, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0 }}>
            {isMobile && <button onClick={() => router.push('/dashboard')} style={{ marginRight: 12, background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18 }}>←</button>}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Ventas</div>
              <div style={{ fontSize: 10, color: t.textMuted }}>{ventas.resumen.cantidadMes} ventas este mes</div>
            </div>
            <button onClick={handleAbrirNuevaVenta}
              style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 10, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
              ＋ Nueva venta
            </button>
          </div>

          {/* KPIs */}
          <div style={{ padding: '16px 20px 0', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12 }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 13, padding: '13px 15px', boxShadow: t.shadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: t.textMuted }}>{k.label}</span>
                  <span style={{ fontSize: 16 }}>{k.icon}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: 'monospace' }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: isMobile ? 90 : 20 }}>
            <ListaVentas ventas={ventas} t={t} dark={dark} negocio={{ nombre: usuario.negocio }}
              onEditar={v => setVentaEditar(v)}
              onEliminar={v => setVentaEliminar(v)} />
          </div>

          {/* Bottom nav mobile */}
          {isMobile && (
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.navBg, backdropFilter: 'blur(16px)', borderTop: `1px solid ${t.border}`, padding: '10px 0 20px', display: 'flex', justifyContent: 'space-around', zIndex: 50 }}>
              {([['⊞', 'Inicio', '/dashboard'], ['↗', 'Ventas', '/ventas'], ['◎', 'Cobros', '/cobranzas'], ['▦', 'Stock', '/stock']] as [string, string, string][]).map(([icon, label, href]) => (
                <div key={label} onClick={() => router.push(href)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                  <div style={{ fontSize: 18, color: label === 'Ventas' ? t.accent : t.textFaint }}>{icon}</div>
                  <div style={{ fontSize: 9, color: label === 'Ventas' ? t.accent : t.textFaint, fontWeight: label === 'Ventas' ? 700 : 400 }}>{label}</div>
                  {label === 'Ventas' && <div style={{ width: 4, height: 4, borderRadius: '50%', background: t.accent }} />}
                </div>
              ))}
              <MenuMas t={t} dark={dark} />
            </div>
          )}
        </div>
      </div>

      {/* Modal nueva venta */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: isMobile ? '20px 20px 0 0' : 20, padding: '24px 20px', width: '100%', maxWidth: isMobile ? '100%' : 480, maxHeight: isMobile ? '92vh' : '90vh', overflowY: 'auto', boxShadow: t.shadowMd }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>Nueva venta</div>
              <button onClick={() => setShowForm(false)} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <FormNuevaVenta ventas={ventas} t={t} dark={dark} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {ventaEditar && <ModalEditarVenta venta={ventaEditar} t={t} onConfirm={handleEditarVenta} onCancel={() => setVentaEditar(null)} saving={savingAccion} />}
      {ventaEliminar && <ModalEliminarVenta venta={ventaEliminar} t={t} onConfirm={handleEliminarVenta} onCancel={() => setVentaEliminar(null)} saving={savingAccion} />}
    </>
  )
}