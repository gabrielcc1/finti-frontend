'use client'

// src/components/pedidos/PedidosView.tsx
import { useState, useEffect, useCallback } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import { MenuMas } from '@/components/shared/MenuMas'
import { createClient } from '@/lib/supabase/client'
import type { usePedidos, PedidoConCliente, DatosVentaEntrega, EstadoPedido } from '@/hooks/usePedidos'
import type { Producto } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: ReturnType<typeof createClient>) => s as any

interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface PedidosViewProps {
  usuario: UsuarioInfo
  pedidos: ReturnType<typeof usePedidos>
}

const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0
const formatPeso = (n: string | number | null | undefined) => {
  const num = toFloat(n)
  const parts = num.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$${parts[0]},${parts[1]}`
}
const formatFecha = (s: string) => {
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const [, m, d] = s.slice(0, 10).split('-').map(Number)
  return `${d} ${meses[m - 1]}`
}

const tema = {
  light: {
    bg:'#fafaf8', surface:'#ffffff', surfaceAlt:'#f5f5f2',
    border:'#e8e8e4', text:'#111827', textMuted:'#6b7280', textFaint:'#9ca3af',
    accent:'#111827', accentText:'#ffffff',
    green:'#f0fdf4', greenBorder:'#bbf7d0', greenText:'#166534',
    amber:'#fffbeb', amberBorder:'#fde68a', amberSub:'#d97706',
    red:'#fff1f2', redBorder:'#fecdd3', redNum:'#dc2626',
    blue:'#eff6ff', blueBorder:'#bfdbfe', blueText:'#1d4ed8',
    purple:'#faf5ff', purpleBorder:'#e9d5ff', purpleText:'#7c3aed',
    shadow:'0 1px 4px rgba(0,0,0,0.06)', shadowMd:'0 4px 16px rgba(0,0,0,0.08)',
    navBg:'rgba(255,255,255,0.92)',
  },
  dark: {
    bg:'#141210', surface:'#1c1916', surfaceAlt:'#211e1b',
    border:'#2e2924', text:'#e8e0d4', textMuted:'#7a6e62', textFaint:'#4a4238',
    accent:'#d4a96a', accentText:'#141210',
    green:'#0e1f12', greenBorder:'#1a3820', greenText:'#4a7a54',
    amber:'#1f1a0e', amberBorder:'#3d3010', amberSub:'#a87d30',
    red:'#1f0e0e', redBorder:'#3d1010', redNum:'#f87171',
    blue:'#0e1525', blueBorder:'#1e3a5f', blueText:'#60a5fa',
    purple:'#160e25', purpleBorder:'#3b1f5e', purpleText:'#a78bfa',
    shadow:'0 1px 6px rgba(0,0,0,0.4)', shadowMd:'0 4px 20px rgba(0,0,0,0.5)',
    navBg:'rgba(20,18,16,0.95)',
  },
}
type Tema = typeof tema.light

const CONFIG_ESTADO: Record<EstadoPedido, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  recibido:       { label: 'Recibido',       emoji: '📥', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  en_elaboracion: { label: 'En preparación', emoji: '🔧', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  listo:          { label: 'Listo',          emoji: '✅', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  entregado:      { label: 'Entregado',      emoji: '📦', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  cancelado:      { label: 'Cancelado',      emoji: '❌', color: '#dc2626', bg: '#fff1f2', border: '#fecdd3' },
}

function diasLabel(d: number): string {
  if (d < 0) return `${Math.abs(d)}d atrasado`
  if (d === 0) return '¡Hoy!'
  if (d === 1) return 'Mañana'
  return `en ${d} días`
}
function diasColor(d: number): { color: string; bg: string; border: string } {
  if (d < 0)  return { color: '#dc2626', bg: '#fff1f2', border: '#fecdd3' }
  if (d === 0) return { color: '#dc2626', bg: '#fff1f2', border: '#fecdd3' }
  if (d <= 3)  return { color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
  return { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' }
}

// ── BANNER DE ALERTAS ─────────────────────────────────────────────────────────
function BannerAlertas({ alertas, t }: { alertas: ReturnType<typeof usePedidos>['alertas']; t: Tema }) {
  if (alertas.hoy.length === 0 && alertas.manana.length === 0 && alertas.atrasados.length === 0) return null
  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {alertas.atrasados.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 11, background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{alertas.atrasados.length} pedido{alertas.atrasados.length > 1 ? 's' : ''} atrasado{alertas.atrasados.length > 1 ? 's' : ''}</span>
            <span style={{ fontSize: 11, color: '#9f1239', marginLeft: 6 }}>{alertas.atrasados.map(p => p.clientes?.nombre ?? 'Cliente').join(', ')}</span>
          </div>
        </div>
      )}
      {alertas.hoy.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 11, background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>{alertas.hoy.length} entrega{alertas.hoy.length > 1 ? 's' : ''} para hoy</span>
            <span style={{ fontSize: 11, color: '#92400e', marginLeft: 6 }}>{alertas.hoy.map(p => p.clientes?.nombre ?? 'Cliente').join(', ')}</span>
          </div>
        </div>
      )}
      {alertas.manana.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 11, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⏰</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>{alertas.manana.length} entrega{alertas.manana.length > 1 ? 's' : ''} para mañana</span>
            <span style={{ fontSize: 11, color: '#1e40af', marginLeft: 6 }}>{alertas.manana.map(p => p.clientes?.nombre ?? 'Cliente').join(', ')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── RESUMEN SEMANAL ───────────────────────────────────────────────────────────
function ResumenSemanal({ pedidos, t }: { pedidos: PedidoConCliente[]; t: Tema }) {
  const semana = pedidos.filter(p => p.dias_restantes >= 0 && p.dias_restantes <= 7)
  if (semana.length === 0) return null
  const totalSemana = semana.reduce((s, p) => s + toFloat(p.monto_entrega), 0)
  const señasCobradas = semana.reduce((s, p) => s + toFloat(p.monto_seña), 0)
  return (
    <div style={{ margin: '0 20px', padding: '12px 16px', borderRadius: 13, background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>📅 Esta semana</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Pedidos', value: String(semana.length), sub: 'para entregar' },
          { label: 'A cobrar', value: formatPeso(totalSemana - señasCobradas), sub: 'al entregar' },
          { label: 'Señas cobradas', value: formatPeso(señasCobradas), sub: 'anticipado' },
        ].map((k, i) => (
          <div key={i}>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text, fontFamily: 'monospace' }}>{k.value}</div>
            <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontSize: 9, color: t.textFaint }}>{k.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── TARJETA DE PEDIDO ─────────────────────────────────────────────────────────
function TarjetaPedido({ pedido, t, dark, onAvanzar, onCancelar, onEntregar }: {
  pedido: PedidoConCliente; t: Tema; dark: boolean
  onAvanzar: () => void; onCancelar: () => void; onEntregar: () => void
}) {
  const [expandido, setExpandido] = useState(false)
  const estado = pedido.estado as EstadoPedido
  const cfg = CONFIG_ESTADO[estado]
  const dc = diasColor(pedido.dias_restantes)
  const seña = toFloat(pedido.monto_seña)
  const monto = toFloat(pedido.monto_entrega)
  const restaCobrar = monto - seña
  const puedeAvanzar = estado === 'recibido' || estado === 'en_elaboracion'
  const puedeEntregar = estado === 'listo' || estado === 'en_elaboracion' || estado === 'recibido'
  const labelAvanzar: Record<string, string> = {
    recibido: '🔧 Iniciar preparación',
    en_elaboracion: '✅ Marcar como listo',
  }
  return (
    <div style={{ borderRadius: 14, background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow, overflow: 'hidden' }}>
      <div onClick={() => setExpandido(!expandido)} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dc.color, boxShadow: `0 0 6px ${dc.color}88` }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pedido.descripcion}</div>
          <div style={{ fontSize: 10, color: t.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{pedido.clientes?.nombre ?? 'Cliente'}</span>
            {pedido.clientes?.zona_comercial && <span>· {pedido.clientes.zona_comercial}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.emoji} {cfg.label}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: dc.bg, color: dc.color, border: `1px solid ${dc.border}` }}>{formatFecha(pedido.fecha_entrega)} · {diasLabel(pedido.dias_restantes)}</span>
        </div>
        <span style={{ fontSize: 11, color: t.textFaint, marginLeft: 4 }}>{expandido ? '▲' : '▼'}</span>
      </div>
      {expandido && (
        <div style={{ borderTop: `1px solid ${t.border}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ padding: '8px 10px', borderRadius: 9, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 9, color: t.textFaint, marginBottom: 2 }}>Total pedido</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: 'monospace' }}>{formatPeso(monto)}</div>
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 9, background: seña > 0 ? t.green : t.surfaceAlt, border: `1px solid ${seña > 0 ? t.greenBorder : t.border}` }}>
              <div style={{ fontSize: 9, color: t.textFaint, marginBottom: 2 }}>Seña cobrada</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: seña > 0 ? t.greenText : t.textMuted, fontFamily: 'monospace' }}>{seña > 0 ? formatPeso(seña) : '—'}</div>
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 9, background: restaCobrar > 0 ? t.amber : t.surfaceAlt, border: `1px solid ${restaCobrar > 0 ? t.amberBorder : t.border}` }}>
              <div style={{ fontSize: 9, color: t.textFaint, marginBottom: 2 }}>Al entregar</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: restaCobrar > 0 ? t.amberSub : t.textMuted, fontFamily: 'monospace' }}>{restaCobrar > 0 ? formatPeso(restaCobrar) : '✓ Pago'}</div>
            </div>
          </div>
          {pedido.notas && (
            <div style={{ padding: '8px 10px', borderRadius: 9, background: t.surfaceAlt, border: `1px solid ${t.border}`, fontSize: 12, color: t.textMuted }}>📝 {pedido.notas}</div>
          )}
          {pedido.clientes?.telefono && (
            <div style={{ fontSize: 11, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📱</span><span>{pedido.clientes.telefono}</span>
            </div>
          )}
          {pedido.genera_cobranza && (
            <div style={{ fontSize: 11, color: '#7c3aed', padding: '5px 10px', borderRadius: 7, background: dark ? '#160e25' : '#faf5ff', border: `1px solid ${dark ? '#3b1f5e' : '#e9d5ff'}` }}>
              📋 Genera cobranza en {pedido.cant_cuotas} cuota{(pedido.cant_cuotas ?? 1) > 1 ? 's' : ''}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            {puedeAvanzar && (
              <button onClick={(e) => { e.stopPropagation(); onAvanzar() }}
                style={{ flex: 2, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${t.amberBorder}`, background: t.amber, color: t.amberSub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {labelAvanzar[estado]}
              </button>
            )}
            {puedeEntregar && (
              <button onClick={(e) => { e.stopPropagation(); onEntregar() }}
                style={{ flex: 2, padding: '9px 0', borderRadius: 10, border: 'none', background: t.accent, color: t.accentText, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                📦 Entregar
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onCancelar() }}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${t.redBorder}`, background: t.red, color: t.redNum, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MODAL CONFIRMAR ENTREGA ───────────────────────────────────────────────────
function ModalConfirmarEntrega({ pedido, t, dark, pedidosHook, onClose }: {
  pedido: PedidoConCliente; t: Tema; dark: boolean
  pedidosHook: ReturnType<typeof usePedidos>; onClose: () => void
}) {
  const [tipoPago,   setTipoPago]   = useState<DatosVentaEntrega['tipo_pago']>('efectivo')
  const [cantCuotas, setCantCuotas] = useState(pedido.cant_cuotas ?? 1)
  const [exito,      setExito]      = useState(false)
  const monto = toFloat(pedido.monto_entrega) - toFloat(pedido.monto_seña)

  const handleConVenta = async () => {
    await pedidosHook.confirmarEntregaConVenta({
      pedido_id: pedido.id, cliente_id: pedido.cliente_id,
      descripcion: pedido.descripcion,
      monto_total: toFloat(pedido.monto_entrega) - toFloat(pedido.monto_seña),
      tipo_pago: tipoPago, cant_cuotas: cantCuotas,
    })
    setExito(true)
    setTimeout(onClose, 1400)
  }
  const handleSinVenta = async () => {
    await pedidosHook.confirmarEntregaSinVenta(pedido.id)
    setExito(true)
    setTimeout(onClose, 1400)
  }

  if (exito) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 12 }}>
      <div style={{ fontSize: 52 }}>📦</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: t.text }}>¡Pedido entregado!</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '12px 14px', borderRadius: 11, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 4 }}>{pedido.descripcion}</div>
        <div style={{ fontSize: 11, color: t.textMuted }}>{pedido.clientes?.nombre ?? 'Cliente'}</div>
        {monto > 0 && <div style={{ fontSize: 15, fontWeight: 800, color: t.accent, fontFamily: 'monospace', marginTop: 6 }}>A cobrar: {formatPeso(monto)}</div>}
        {toFloat(pedido.monto_seña) > 0 && <div style={{ fontSize: 11, color: t.greenText, marginTop: 2 }}>✓ Seña ya cobrada: {formatPeso(pedido.monto_seña)}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>¿Querés registrar la venta?</div>
      {monto > 0 && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Forma de cobro</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['efectivo', 'transferencia', 'tarjeta', 'cuotas'] as const).map(tp => (
              <button key={tp} onClick={() => setTipoPago(tp)}
                style={{ padding: '9px 0', borderRadius: 10, border: `1.5px solid ${tipoPago === tp ? t.accent : t.border}`, background: tipoPago === tp ? (dark ? '#2a2218' : t.surfaceAlt) : t.surface, color: tipoPago === tp ? t.accent : t.textMuted, fontSize: 12, fontWeight: tipoPago === tp ? 700 : 400, cursor: 'pointer' }}>
                {tp === 'efectivo' ? '💵 Efectivo' : tp === 'transferencia' ? '📲 Transferencia' : tp === 'tarjeta' ? '💳 Tarjeta' : '📋 Cuotas'}
              </button>
            ))}
          </div>
          {tipoPago === 'cuotas' && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: t.textMuted }}>Cuotas:</span>
              <input type="number" min="2" max="60" value={cantCuotas} onChange={e => setCantCuotas(Math.max(2, parseInt(e.target.value) || 2))}
                style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: `1.5px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 13, outline: 'none' }} />
              <span style={{ fontSize: 11, color: t.textMuted }}>→ {formatPeso(monto / cantCuotas)} c/u</span>
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={handleConVenta} disabled={pedidosHook.saving}
          style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          {pedidosHook.saving ? 'Guardando...' : `✓ Sí, registrar venta${monto > 0 ? ` (${formatPeso(monto)})` : ''}`}
        </button>
        <button onClick={handleSinVenta} disabled={pedidosHook.saving}
          style={{ width: '100%', padding: 11, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          No, solo marcar como entregado
        </button>
        <button onClick={onClose} style={{ width: '100%', padding: 9, borderRadius: 12, border: 'none', background: 'none', color: t.textFaint, fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
      </div>
    </div>
  )
}

// ── ITEM DE PRODUCTO SELECCIONADO EN EL PEDIDO ───────────────────────────────
interface ItemPedido { producto_id: string; nombre: string; cantidad: number; precio: number }

// ── MODAL NUEVO PEDIDO — CON SELECTOR DE STOCK ────────────────────────────────
function ModalNuevoPedido({ pedidosHook, t, dark, onClose }: {
  pedidosHook: ReturnType<typeof usePedidos>; t: Tema; dark: boolean; onClose: () => void
}) {
  const [clienteId,    setClienteId]    = useState('')
  const [descripcion,  setDescripcion]  = useState('')
  const [monto,        setMonto]        = useState('')
  const [seña,         setSeña]         = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas,        setNotas]        = useState('')
  const [generaCob,    setGeneraCob]    = useState(false)
  const [cantCuotas,   setCantCuotas]   = useState(2)
  const [exito,        setExito]        = useState(false)
  const [errorLocal,   setErrorLocal]   = useState('')

  // ── Nuevo: selección de productos del stock ───────────────────────────────
  const [modoProductos, setModoProductos] = useState(false)  // toggle stock vs descripción libre
  const [productos,     setProductos]     = useState<Producto[]>([])
  const [items,         setItems]         = useState<ItemPedido[]>([])
  const [busqueda,      setBusqueda]      = useState('')
  const [cargandoProds, setCargandoProds] = useState(false)

  const supabase = createClient()

  // Cargar productos cuando se activa el modo stock
  useEffect(() => {
    if (!modoProductos || productos.length > 0) return
    setCargandoProds(true)
    db(supabase).from('productos').select('*').eq('activo', true).order('nombre')
      .then(({ data }: { data: Producto[] | null }) => {
        setProductos(data ?? [])
        setCargandoProds(false)
      })
  }, [modoProductos, supabase, productos.length])

  // Recalcular monto automáticamente cuando cambian los items
  useEffect(() => {
    if (!modoProductos) return
    const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
    if (total > 0) setMonto(total.toFixed(2))
  }, [items, modoProductos])

  // Recalcular descripción automáticamente desde los productos
  useEffect(() => {
    if (!modoProductos || items.length === 0) return
    const desc = items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')
    setDescripcion(desc)
  }, [items, modoProductos])

  const prodsFiltrados = productos.filter(p =>
    !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const agregarProducto = useCallback((prod: Producto) => {
    setItems(prev => {
      const existe = prev.find(i => i.producto_id === prod.id)
      if (existe) {
        return prev.map(i => i.producto_id === prod.id
          ? { ...i, cantidad: i.cantidad + 1 }
          : i
        )
      }
      return [...prev, { producto_id: prod.id, nombre: prod.nombre, cantidad: 1, precio: toFloat(prod.precio_unitario) }]
    })
    setBusqueda('')
  }, [])

  const cambiarCantItem = (id: string, delta: number) => {
    setItems(prev => prev
      .map(i => i.producto_id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i)
      .filter(i => i.cantidad > 0)
    )
  }

  const quitarItem = (id: string) => setItems(prev => prev.filter(i => i.producto_id !== id))

  const [minFecha] = useState(() => {
    const manana = new Date(); manana.setDate(manana.getDate() + 1)
    return manana.toISOString().slice(0, 10)
  })

  const puedeGuardar = clienteId !== '' && descripcion.trim() !== '' && monto !== '' && fechaEntrega !== '' &&
    (!modoProductos || items.length > 0)

  const handleGuardar = async () => {
    if (!puedeGuardar) { setErrorLocal('Completá cliente, descripción, monto y fecha de entrega.'); return }
    setErrorLocal('')
    try {
      await pedidosHook.crearPedido({
        cliente_id:      clienteId,
        descripcion:     descripcion.trim(),
        monto_entrega:   parseFloat(monto),
        monto_seña:      seña ? parseFloat(seña) : 0,
        fecha_entrega:   fechaEntrega,
        genera_cobranza: generaCob,
        cant_cuotas:     generaCob ? cantCuotas : 1,
        notas:           notas.trim() || undefined,
      })
      setExito(true)
      setTimeout(onClose, 1400)
    } catch {
      setErrorLocal('Error al guardar el pedido. Intentá de nuevo.')
    }
  }

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1.5px solid ${t.border}`, background: t.bg,
    color: t.text, fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box' as const,
  }
  const lbl = {
    fontSize: 11, fontWeight: 700 as const, color: t.textMuted,
    display: 'block' as const, marginBottom: 6,
    textTransform: 'uppercase' as const, letterSpacing: '0.04em',
  }

  if (exito) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, gap: 12 }}>
      <div style={{ fontSize: 52 }}>📋</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: t.text }}>¡Pedido registrado!</div>
      <div style={{ fontSize: 13, color: t.textMuted }}>{descripcion}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Cliente */}
      <div>
        <label style={lbl}>Cliente *</label>
        <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={{ ...inp }}>
          <option value="">Seleccioná un cliente...</option>
          {pedidosHook.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Toggle: productos de stock vs descripción libre */}
      <div style={{ display: 'flex', background: t.surfaceAlt, borderRadius: 10, padding: 3 }}>
        <button
          onClick={() => { setModoProductos(false); setItems([]) }}
          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: !modoProductos ? 700 : 400, background: !modoProductos ? t.surface : 'transparent', color: !modoProductos ? t.accent : t.textMuted, boxShadow: !modoProductos ? t.shadow : 'none' }}>
          ✏️ Descripción libre
        </button>
        <button
          onClick={() => setModoProductos(true)}
          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: modoProductos ? 700 : 400, background: modoProductos ? t.surface : 'transparent', color: modoProductos ? t.accent : t.textMuted, boxShadow: modoProductos ? t.shadow : 'none' }}>
          📦 Desde stock
        </button>
      </div>

      {/* MODO: Descripción libre */}
      {!modoProductos && (
        <div>
          <label style={lbl}>Descripción del pedido *</label>
          <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Ej: Torta de cumpleaños, remera talle M estampada..."
            style={inp} />
        </div>
      )}

      {/* MODO: Desde stock */}
      {modoProductos && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={lbl}>Buscar producto del stock</label>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="🔍 Escribí el nombre..."
              style={inp} autoFocus />
            {/* Dropdown de resultados */}
            {busqueda && (
              <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, background: t.surface, marginTop: 4, maxHeight: 180, overflowY: 'auto', boxShadow: t.shadowMd }}>
                {cargandoProds && <div style={{ padding: '12px 14px', color: t.textFaint, fontSize: 12 }}>Cargando...</div>}
                {!cargandoProds && prodsFiltrados.length === 0 && <div style={{ padding: '12px 14px', color: t.textFaint, fontSize: 12 }}>Sin resultados</div>}
                {prodsFiltrados.map(p => {
                  const stockBajo = p.stock_actual <= p.stock_minimo
                  const sinStock  = p.stock_actual === 0
                  return (
                    <div key={p.id} onClick={() => !sinStock && agregarProducto(p)}
                      style={{ padding: '10px 14px', cursor: sinStock ? 'not-allowed' : 'pointer', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: sinStock ? 0.5 : 1, background: 'transparent' }}
                      onMouseEnter={e => { if (!sinStock) e.currentTarget.style.background = t.surfaceAlt }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.nombre}</div>
                        <div style={{ fontSize: 10, color: sinStock ? t.redNum : stockBajo ? t.amberSub : t.textFaint }}>
                          Stock: {p.stock_actual} {p.unidad}
                          {sinStock ? ' · Sin stock' : stockBajo ? ' · Stock bajo' : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, fontFamily: 'monospace' }}>{formatPeso(p.precio_unitario)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Items seleccionados */}
          {items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(item => (
                <div key={item.producto_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                    <div style={{ fontSize: 10, color: t.textFaint }}>{formatPeso(item.precio)} c/u</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => cambiarCantItem(item.producto_id, -1)}
                      style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${t.border}`, background: t.surface, color: t.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.text, minWidth: 20, textAlign: 'center' }}>{item.cantidad}</span>
                    <button onClick={() => cambiarCantItem(item.producto_id, 1)}
                      style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${t.border}`, background: t.surface, color: t.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: 'monospace', minWidth: 64, textAlign: 'right', flexShrink: 0 }}>{formatPeso(item.precio * item.cantidad)}</div>
                  <button onClick={() => quitarItem(item.producto_id)}
                    style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: t.red, color: t.redNum, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                </div>
              ))}
              {/* Total automático */}
              <div style={{ padding: '8px 12px', borderRadius: 9, background: t.green, border: `1px solid ${t.greenBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: t.greenText }}>Total calculado del pedido</span>
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: t.greenText }}>{formatPeso(items.reduce((s, i) => s + i.precio * i.cantidad, 0))}</span>
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: t.textFaint, fontSize: 12, border: `1px dashed ${t.border}`, borderRadius: 10 }}>
              Buscá y seleccioná productos del stock para armar el pedido
            </div>
          )}
        </div>
      )}

      {/* Monto y seña — en modo stock el monto es editable por si querés modificarlo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lbl}>Monto total *{modoProductos ? ' (calculado)' : ''}</label>
          <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
            placeholder="$0" min="0" style={inp} />
        </div>
        <div>
          <label style={lbl}>Seña <span style={{ fontWeight: 400, textTransform: 'none' }}>(opc.)</span></label>
          <input type="number" value={seña} onChange={e => setSeña(e.target.value)}
            placeholder="$0" min="0" style={inp} />
        </div>
      </div>

      {/* Preview seña */}
      {monto && seña && parseFloat(seña) > 0 && (
        <div style={{ padding: '7px 12px', borderRadius: 9, background: t.green, border: `1px solid ${t.greenBorder}`, fontSize: 11, color: t.greenText }}>
          ✓ Seña: {formatPeso(seña)} · Al entregar: {formatPeso(parseFloat(monto) - parseFloat(seña))}
        </div>
      )}

      {/* Descripción editable si es modo stock (pre-llenado automático) */}
      {modoProductos && (
        <div>
          <label style={lbl}>Descripción del pedido *</label>
          <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Se completa automáticamente con los productos..."
            style={inp} />
        </div>
      )}

      {/* Fecha entrega */}
      <div>
        <label style={lbl}>Fecha de entrega *</label>
        <input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)}
          min={minFecha} style={inp} />
      </div>

      {/* Genera cobranza */}
      <div style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${generaCob ? '#7c3aed' : t.border}`, background: generaCob ? (dark ? '#160e25' : '#faf5ff') : t.surfaceAlt, cursor: 'pointer' }}
        onClick={() => setGeneraCob(!generaCob)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${generaCob ? '#7c3aed' : t.border}`, background: generaCob ? '#7c3aed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {generaCob && <span style={{ fontSize: 10, color: '#fff' }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: generaCob ? '#7c3aed' : t.text }}>Pago en cuotas al entregar</div>
            <div style={{ fontSize: 10, color: t.textFaint }}>Genera cobranza automáticamente</div>
          </div>
        </div>
        {generaCob && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: 12, color: '#7c3aed' }}>Cantidad de cuotas:</span>
            <input type="number" min="2" max="60" value={cantCuotas}
              onChange={e => setCantCuotas(Math.max(2, parseInt(e.target.value) || 2))}
              style={{ width: 70, padding: '5px 8px', borderRadius: 8, border: `1.5px solid #7c3aed`, background: t.bg, color: t.text, fontSize: 13, outline: 'none' }} />
            {monto && <span style={{ fontSize: 11, color: t.textMuted }}>→ {formatPeso((parseFloat(monto) - (seña ? parseFloat(seña) : 0)) / cantCuotas)} c/u</span>}
          </div>
        )}
      </div>

      {/* Notas */}
      <div>
        <label style={lbl}>Notas <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)}
          placeholder="Especificaciones del pedido, colores, talle, sabor..."
          rows={2} style={{ ...inp, resize: 'none' }} />
      </div>

      {errorLocal && (
        <div style={{ fontSize: 11, color: t.redNum, padding: '6px 10px', borderRadius: 7, background: t.red, border: `1px solid ${t.redBorder}` }}>⚠️ {errorLocal}</div>
      )}

      {/* Botones */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose}
          style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={!puedeGuardar || pedidosHook.saving}
          style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: puedeGuardar ? t.accent : t.surfaceAlt, color: puedeGuardar ? t.accentText : t.textFaint, fontSize: 13, fontWeight: 800, cursor: puedeGuardar ? 'pointer' : 'not-allowed' }}>
          {pedidosHook.saving ? 'Guardando...' : '✓ Registrar pedido'}
        </button>
      </div>
    </div>
  )
}

// ── LISTA DE PEDIDOS ──────────────────────────────────────────────────────────
function ListaPedidos({ pedidos: hook, t, dark, onEntregar }: {
  pedidos: ReturnType<typeof usePedidos>; t: Tema; dark: boolean
  onEntregar: (p: PedidoConCliente) => void
}) {
  const [filtro, setFiltro] = useState<EstadoPedido | 'todos'>('todos')
  const filtrados = filtro === 'todos' ? hook.pedidos : hook.pedidos.filter(p => p.estado === filtro)
  const tabs: { key: EstadoPedido | 'todos'; label: string }[] = [
    { key: 'todos',          label: `Todos (${hook.pedidos.length})` },
    { key: 'recibido',       label: `📥 Recibidos` },
    { key: 'en_elaboracion', label: `🔧 En prep.` },
    { key: 'listo',          label: `✅ Listos` },
  ]
  if (hook.loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3].map(i => <div key={i} style={{ height: 66, borderRadius: 13, background: t.surfaceAlt }} />)}
    </div>
  )
  if (hook.pedidos.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: t.textFaint }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: t.textMuted }}>Sin pedidos activos</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>Registrá tu primer pedido con el botón ＋</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setFiltro(tab.key)}
            style={{ padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${filtro === tab.key ? t.accent : t.border}`, background: filtro === tab.key ? (dark ? '#2a2218' : t.surfaceAlt) : t.surface, color: filtro === tab.key ? t.accent : t.textMuted, fontSize: 11, fontWeight: filtro === tab.key ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
            {tab.label}
          </button>
        ))}
      </div>
      {filtrados.length === 0
        ? <div style={{ textAlign: 'center', padding: '24px 0', color: t.textFaint, fontSize: 12 }}>Sin pedidos en este estado</div>
        : filtrados.map(p => (
          <TarjetaPedido key={p.id} pedido={p} t={t} dark={dark}
            onAvanzar={() => hook.avanzarEstado(p.id, p.estado as EstadoPedido)}
            onCancelar={() => hook.cancelarPedido(p.id)}
            onEntregar={() => onEntregar(p)}
          />
        ))
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PEDIDOS VIEW PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function PedidosView({ usuario, pedidos }: PedidosViewProps) {
  const [dark, setDark] = useDarkMode()
  const [isMobile,        setIsMobile]        = useState(false)
  const [showNuevo,       setShowNuevo]       = useState(false)
  const [pedidoEntregar,  setPedidoEntregar]  = useState<PedidoConCliente | null>(null)
  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const t = dark ? tema.dark : tema.light
  const totalActivos    = pedidos.pedidos.length
  const montoSemana     = pedidos.alertas.estaSemana.reduce((s, p) => s + toFloat(p.monto_entrega) - toFloat(p.monto_seña), 0)
  const listos          = pedidos.pedidos.filter(p => p.estado === 'listo').length
  const señasPendientes = pedidos.pedidos.reduce((s, p) => s + toFloat(p.monto_seña), 0)

  const kpis = [
    { label: 'Pedidos activos',   value: String(totalActivos),       icon: '📋' },
    { label: 'A cobrar semana',   value: formatPeso(montoSemana),    icon: '💰' },
    { label: 'Listos p/ entrega', value: String(listos),             icon: '✅' },
    { label: 'Señas cobradas',    value: formatPeso(señasPendientes), icon: '🤝' },
  ]

  const sidebar = <Sidebar activo="pedidos" usuario={usuario} dark={dark} setDark={setDark} t={t} />

  const content = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 54, background: t.surface, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0 }}>
        {isMobile && <button onClick={() => router.push('/dashboard')} style={{ marginRight: 12, background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18 }}>←</button>}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Pedidos</div>
          <div style={{ fontSize: 10, color: t.textMuted }}>{totalActivos} activos · {pedidos.alertas.hoy.length + pedidos.alertas.atrasados.length > 0 ? `⚠️ ${pedidos.alertas.hoy.length + pedidos.alertas.atrasados.length} urgentes` : 'Todo al día ✓'}</div>
        </div>
        <button onClick={() => setShowNuevo(true)}
          style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 10, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          ＋ Nuevo pedido
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: isMobile ? 80 : 20 }}>
        <div style={{ padding: '16px 20px 0', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 10 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 13, padding: '12px 14px', boxShadow: t.shadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: t.textMuted }}>{k.label}</span>
                <span style={{ fontSize: 15 }}>{k.icon}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: t.text, fontFamily: 'monospace' }}>{k.value}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 0 0' }}><BannerAlertas alertas={pedidos.alertas} t={t} /></div>
        <div style={{ padding: '12px 0 0' }}><ResumenSemanal pedidos={pedidos.pedidos} t={t} /></div>
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pedidos activos</div>
          <ListaPedidos pedidos={pedidos} t={t} dark={dark} onEntregar={setPedidoEntregar} />
        </div>
      </div>

      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.navBg, backdropFilter: 'blur(16px)', borderTop: `1px solid ${t.border}`, padding: '10px 0 20px', display: 'flex', justifyContent: 'space-around', zIndex: 50 }}>
          {[['⊞','Inicio','/dashboard'],['↗','Ventas','/ventas'],['◎','Cobros','/cobranzas'],['📋','Pedidos','/pedidos']].map(([icon,label,href]) => (
            <div key={label} onClick={() => href && router.push(href)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
              <div style={{ fontSize: 18, color: label === 'Pedidos' ? t.accent : t.textFaint }}>{icon}</div>
              <div style={{ fontSize: 9, color: label === 'Pedidos' ? t.accent : t.textFaint, fontWeight: label === 'Pedidos' ? 700 : 400 }}>{label}</div>
              {label === 'Pedidos' && <div style={{ width: 4, height: 4, borderRadius: '50%', background: t.accent }} />}
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
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}} *{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#33302a;border-radius:4px;}`}</style>

      <div style={{ height: '100vh', display: 'flex', background: t.bg, fontFamily: "'DM Sans',system-ui,sans-serif", overflow: 'hidden' }}>
        {!isMobile && sidebar}
        {content}
      </div>

      {/* Modal nuevo pedido */}
      {showNuevo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: isMobile ? '20px 20px 0 0' : 20, padding: '24px 20px', width: '100%', maxWidth: isMobile ? '100%' : 500, maxHeight: isMobile ? '96vh' : '92vh', overflowY: 'auto', boxShadow: t.shadowMd }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>Nuevo pedido</div>
              <button onClick={() => setShowNuevo(false)} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <ModalNuevoPedido pedidosHook={pedidos} t={t} dark={dark} onClose={() => setShowNuevo(false)} />
          </div>
        </div>
      )}

      {/* Modal confirmar entrega */}
      {pedidoEntregar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: isMobile ? '20px 20px 0 0' : 20, padding: '24px 20px', width: '100%', maxWidth: isMobile ? '100%' : 440, maxHeight: isMobile ? '85vh' : '80vh', overflowY: 'auto', boxShadow: t.shadowMd }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>📦 Confirmar entrega</div>
              <button onClick={() => setPedidoEntregar(null)} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <ModalConfirmarEntrega pedido={pedidoEntregar} t={t} dark={dark} pedidosHook={pedidos} onClose={() => setPedidoEntregar(null)} />
          </div>
        </div>
      )}
    </>
  )
}