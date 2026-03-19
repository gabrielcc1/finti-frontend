'use client'

// src/components/stock/StockView.tsx
import { useState, useEffect } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import type { useStock } from '@/hooks/useStock'
import type { TipoMovimiento, MovimientoStock, NuevoProductoData, NuevaMateriaPrimaData, CompraMateriaPrimaData } from '@/hooks/useStock'
import type { Producto, MateriaPrima } from '@/types/database'

interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface StockViewProps {
  usuario: UsuarioInfo
  stock:   ReturnType<typeof useStock>
}

// ── Helpers ────────────────────────────────────────────────────────────────
const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0
const formatPeso = (n: string | number | null | undefined) => `$${toFloat(n).toLocaleString('es-AR')}`
const formatNum  = (n: number, dec = 0) => n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

function getSemaforo(actual: number, minimo: number): 'ok' | 'bajo' | 'critico' {
  if (actual === 0) return 'critico'
  if (actual <= minimo) return 'bajo'
  return 'ok'
}

function tipoLabel(tipo: TipoMovimiento): { text: string; color: string; signo: string } {
  const map: Record<TipoMovimiento, { text: string; color: string; signo: string }> = {
    entrada_compra:      { text: 'Compra',     color: '#16a34a', signo: '+' },
    entrada_produccion:  { text: 'Producción', color: '#0d9488', signo: '+' },
    entrada_ajuste:      { text: 'Ajuste ↑',   color: '#7c3aed', signo: '+' },
    salida_venta:        { text: 'Venta',       color: '#6b7280', signo: '−' },
    salida_merma:        { text: 'Merma',       color: '#dc2626', signo: '−' },
    salida_ajuste:       { text: 'Ajuste ↓',   color: '#9333ea', signo: '−' },
  }
  return map[tipo]
}

// ── Tema ───────────────────────────────────────────────────────────────────
const tema = {
  light: {
    bg:'#fafaf8', surface:'#ffffff', surfaceAlt:'#f5f5f2', border:'#e8e8e4', borderLight:'#f0f0ec',
    text:'#111827', textMuted:'#6b7280', textFaint:'#9ca3af',
    accent:'#111827', accentText:'#ffffff',
    amber:'#fffbeb', amberBorder:'#fde68a', amberSub:'#d97706',
    red:'#fff1f2', redBorder:'#fecdd3', redNum:'#dc2626',
    green:'#f0fdf4', greenBorder:'#bbf7d0', greenNum:'#16a34a',
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
    navBg:'rgba(20,18,16,0.95)', shadow:'0 1px 6px rgba(0,0,0,0.4)', shadowMd:'0 4px 20px rgba(0,0,0,0.5)',
    skeletonBase:'#211e1b', skeletonShine:'#2e2924',
  },
}
type Tema = typeof tema.light

// ── Componentes base ───────────────────────────────────────────────────────
function Sk({ h = 16, radius = 6, t }: { h?: number; radius?: number; t: Tema }) {
  return (
    <div style={{ height: h, borderRadius: radius, background: t.skeletonBase, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg,transparent,${t.skeletonShine},transparent)`, animation: 'shimmer 1.4s infinite' }} />
    </div>
  )
}

function SemaforoIndicator({ actual, minimo, t }: { actual: number; minimo: number; t: Tema }) {
  const sem = getSemaforo(actual, minimo)
  const cfg = {
    ok:      { color: t.greenNum,  bg: t.green,  label: 'OK' },
    bajo:    { color: t.amberSub,  bg: t.amber,  label: '↓ Bajo' },
    critico: { color: t.redNum,    bg: t.red,    label: '⚠ Crítico' },
  }[sem]
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function BarraStock({ actual, minimo, t }: { actual: number; minimo: number; t: Tema }) {
  const sem = getSemaforo(actual, minimo)
  const color = sem === 'ok' ? t.greenNum : sem === 'bajo' ? t.amberSub : t.redNum
  const pct = minimo > 0 ? Math.min((actual / (minimo * 2)) * 100, 100) : actual > 0 ? 100 : 0
  return (
    <div style={{ height: 4, borderRadius: 2, background: t.border, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
    </div>
  )
}

// ── Modal: Ajuste de stock ─────────────────────────────────────────────────
function ModalAjuste({
  producto, onConfirm, onCancel, saving, t, dark
}: {
  producto: Producto
  onConfirm: (tipo: TipoMovimiento, cantidad: number, motivo: string) => void
  onCancel: () => void
  saving: boolean
  t: Tema
  dark: boolean
}) {
  const [tipo,     setTipo]     = useState<TipoMovimiento>('entrada_compra')
  const [cantidad, setCantidad] = useState('')
  const [motivo,   setMotivo]   = useState('')
  const [error,    setError]    = useState('')

  const esEntrada = tipo.startsWith('entrada_')
  const cant = parseInt(cantidad) || 0
  const nuevoStock = esEntrada
    ? producto.stock_actual + cant
    : Math.max(0, producto.stock_actual - cant)

  const handleSubmit = () => {
    if (!cantidad || cant <= 0) { setError('Ingresá una cantidad válida'); return }
    setError('')
    onConfirm(tipo, cant, motivo)
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: `1.5px solid ${t.border}`, background: t.surfaceAlt,
    color: t.text, fontSize: 13, outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4, display: 'block' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 22px', maxWidth: 380, width: '100%', boxShadow: t.shadowMd, animation: 'popIn 0.18s ease' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>Ajustar stock</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{producto.nombre}</div>
          <div style={{ fontSize: 11, color: t.textFaint, marginTop: 1 }}>Stock actual: <strong style={{ color: t.text }}>{producto.stock_actual} {producto.unidad}</strong></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tipo */}
          <div>
            <label style={labelStyle}>Tipo de movimiento</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {([
                ['entrada_compra',     '🛒 Compra'],
                ['entrada_produccion', '🏭 Producción'],
                ['entrada_ajuste',     '↑ Ajuste +'],
                ['salida_merma',       '🗑 Merma'],
                ['salida_ajuste',      '↓ Ajuste −'],
              ] as [TipoMovimiento, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setTipo(val)}
                  style={{
                    padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${tipo === val ? t.accent : t.border}`,
                    background: tipo === val ? (dark ? '#2a2218' : '#f0f0ec') : 'transparent',
                    color: tipo === val ? t.accent : t.textMuted,
                    fontSize: 11, fontWeight: tipo === val ? 700 : 400, cursor: 'pointer', textAlign: 'left',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <label style={labelStyle}>Cantidad ({producto.unidad})</label>
            <input
              type="number" min="1" value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="0" style={inputStyle}
              autoFocus
            />
          </div>

          {/* Preview stock nuevo */}
          {cant > 0 && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, color: t.textMuted }}>Stock resultante</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: t.text, fontFamily: 'monospace', marginTop: 2 }}>
                {formatNum(nuevoStock)} <span style={{ fontSize: 12, fontWeight: 400 }}>{producto.unidad}</span>
              </div>
              <div style={{ fontSize: 10, color: esEntrada ? t.greenNum : nuevoStock < producto.stock_minimo ? t.redNum : t.textMuted, marginTop: 2 }}>
                {esEntrada ? `+${cant}` : `−${cant}`} unidades
              </div>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label style={labelStyle}>Motivo (opcional)</label>
            <input
              type="text" value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Compra proveedor García..."
              style={inputStyle}
            />
          </div>

          {error && <div style={{ fontSize: 11, color: t.redNum }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : '✓ Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Nuevo producto ──────────────────────────────────────────────────
function ModalProducto({
  productoEditar, onConfirm, onCancel, saving, t
}: {
  productoEditar?: Producto | null
  onConfirm: (data: NuevoProductoData) => void
  onCancel: () => void
  saving: boolean
  t: Tema
}) {
  const [nombre,   setNombre]   = useState(productoEditar?.nombre ?? '')
  const [precio,   setPrecio]   = useState(productoEditar ? toFloat(productoEditar.precio_unitario).toString() : '')
  const [costo,    setCosto]    = useState(productoEditar?.costo_unitario ? toFloat(productoEditar.costo_unitario).toString() : '')
  const [stockAct, setStockAct] = useState(productoEditar ? productoEditar.stock_actual.toString() : '0')
  const [stockMin, setStockMin] = useState(productoEditar ? productoEditar.stock_minimo.toString() : '5')
  const [unidad,   setUnidad]   = useState(productoEditar?.unidad ?? 'unidad')
  const [codigo,   setCodigo]   = useState(productoEditar?.codigo ?? '')
  const [error,    setError]    = useState('')

  const handleSubmit = () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!precio || toFloat(precio) <= 0) { setError('Ingresá un precio válido'); return }
    setError('')
    onConfirm({
      nombre:          nombre.trim(),
      precio_unitario: toFloat(precio),
      costo_unitario:  costo ? toFloat(costo) : undefined,
      stock_actual:    parseInt(stockAct) || 0,
      stock_minimo:    parseInt(stockMin) || 0,
      unidad:          unidad || 'unidad',
      codigo:          codigo || undefined,
    })
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: `1.5px solid ${t.border}`, background: t.surfaceAlt,
    color: t.text, fontSize: 13, outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4, display: 'block' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 22px', maxWidth: 440, width: '100%', boxShadow: t.shadowMd, animation: 'popIn 0.18s ease', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 18 }}>
          {productoEditar ? 'Editar producto' : 'Nuevo producto'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Torta casera" style={inputStyle} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Precio de venta *</label>
              <input type="number" min="0" value={precio} onChange={e => setPrecio(e.target.value)}
                placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Costo unitario</label>
              <input type="number" min="0" value={costo} onChange={e => setCosto(e.target.value)}
                placeholder="0" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Stock actual</label>
              <input type="number" min="0" value={stockAct} onChange={e => setStockAct(e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Stock mínimo</label>
              <input type="number" min="0" value={stockMin} onChange={e => setStockMin(e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Unidad</label>
              <select value={unidad} onChange={e => setUnidad(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['unidad', 'docena', 'kg', 'litro', 'metro', 'caja', 'bolsa', 'par'].map(u =>
                  <option key={u} value={u}>{u}</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Código (opcional)</label>
            <input type="text" value={codigo} onChange={e => setCodigo(e.target.value)}
              placeholder="SKU, código de barra..." style={inputStyle} />
          </div>

          {/* Preview margen */}
          {toFloat(precio) > 0 && toFloat(costo) > 0 && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 10, color: t.textMuted }}>Margen estimado</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: t.greenNum, marginTop: 2 }}>
                {((1 - toFloat(costo) / toFloat(precio)) * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: 10, color: t.textMuted }}>
                {formatPeso(toFloat(precio) - toFloat(costo))} por {unidad}
              </div>
            </div>
          )}

          {error && <div style={{ fontSize: 11, color: t.redNum }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : productoEditar ? '✓ Guardar' : '✓ Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Compra de materia prima ─────────────────────────────────────────
function ModalCompraMP({
  materias, onConfirm, onCancel, saving, t
}: {
  materias: MateriaPrima[]
  onConfirm: (data: CompraMateriaPrimaData) => void
  onCancel: () => void
  saving: boolean
  t: Tema
}) {
  const [mpId,      setMpId]      = useState(materias[0]?.id ?? '')
  const [cantidad,  setCantidad]  = useState('')
  const [costoTotal,setCostoTotal]= useState('')
  const [proveedor, setProveedor] = useState('')
  const [error,     setError]     = useState('')

  const mp = materias.find(m => m.id === mpId)
  const cant = parseFloat(cantidad) || 0
  const costo = parseFloat(costoTotal) || 0
  const costoUnit = cant > 0 && costo > 0 ? costo / cant : 0

  const handleSubmit = () => {
    if (!mpId) { setError('Seleccioná una materia prima'); return }
    if (!cantidad || cant <= 0) { setError('Ingresá una cantidad válida'); return }
    if (!costoTotal || costo <= 0) { setError('Ingresá el costo total'); return }
    setError('')
    onConfirm({ materia_prima_id: mpId, cantidad: cant, costo_total: costo, proveedor: proveedor || undefined })
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: `1.5px solid ${t.border}`, background: t.surfaceAlt,
    color: t.text, fontSize: 13, outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4, display: 'block' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 22px', maxWidth: 400, width: '100%', boxShadow: t.shadowMd, animation: 'popIn 0.18s ease' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 18 }}>Registrar compra</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={labelStyle}>Materia prima</label>
            <select value={mpId} onChange={e => setMpId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>

          {mp && (
            <div style={{ fontSize: 11, color: t.textMuted, padding: '6px 10px', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
              Stock actual: <strong style={{ color: t.text }}>{formatNum(toFloat(mp.stock_actual), 2)} {mp.unidad}</strong>
              {' · '}Costo vigente: <strong style={{ color: t.text }}>{formatPeso(mp.costo_por_unidad)}/{mp.unidad}</strong>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Cantidad {mp ? `(${mp.unidad})` : ''}</label>
              <input type="number" min="0.001" step="0.001" value={cantidad}
                onChange={e => setCantidad(e.target.value)} placeholder="0" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Costo total $</label>
              <input type="number" min="0" value={costoTotal}
                onChange={e => setCostoTotal(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
          </div>

          {costoUnit > 0 && (
            <div style={{ padding: '8px 12px', borderRadius: 10, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 10, color: t.textMuted }}>Nuevo costo unitario</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace', color: t.text, marginTop: 2 }}>
                {formatPeso(costoUnit)}/{mp?.unidad ?? 'u'}
              </div>
              {mp && toFloat(mp.costo_por_unidad) > 0 && (
                <div style={{ fontSize: 10, color: costoUnit > toFloat(mp.costo_por_unidad) ? t.redNum : t.greenNum, marginTop: 2 }}>
                  {costoUnit > toFloat(mp.costo_por_unidad) ? '↑' : '↓'} vs anterior {formatPeso(mp.costo_por_unidad)}
                </div>
              )}
            </div>
          )}

          <div>
            <label style={labelStyle}>Proveedor (opcional)</label>
            <input type="text" value={proveedor} onChange={e => setProveedor(e.target.value)}
              placeholder="Nombre del proveedor" style={inputStyle} />
          </div>

          {error && <div style={{ fontSize: 11, color: t.redNum }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : '✓ Registrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Nueva materia prima ─────────────────────────────────────────────
function ModalNuevaMP({
  onConfirm, onCancel, saving, t
}: {
  onConfirm: (data: NuevaMateriaPrimaData) => void
  onCancel: () => void
  saving: boolean
  t: Tema
}) {
  const [nombre,  setNombre]  = useState('')
  const [unidad,  setUnidad]  = useState('kg')
  const [costo,   setCosto]   = useState('')
  const [stockAct,setStockAct]= useState('0')
  const [stockMin,setStockMin]= useState('1')
  const [error,   setError]   = useState('')

  const handleSubmit = () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!costo || toFloat(costo) <= 0) { setError('Ingresá el costo por unidad'); return }
    setError('')
    onConfirm({
      nombre: nombre.trim(),
      unidad,
      costo_por_unidad: toFloat(costo),
      stock_actual: parseFloat(stockAct) || 0,
      stock_minimo: parseFloat(stockMin) || 0,
    })
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: `1.5px solid ${t.border}`, background: t.surfaceAlt,
    color: t.text, fontSize: 13, outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4, display: 'block' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 22px', maxWidth: 400, width: '100%', boxShadow: t.shadowMd, animation: 'popIn 0.18s ease' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 18 }}>Nueva materia prima</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Harina 0000" style={inputStyle} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Unidad de medida</label>
              <select value={unidad} onChange={e => setUnidad(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['kg', 'g', 'litro', 'ml', 'metro', 'cm', 'unidad', 'docena', 'caja'].map(u =>
                  <option key={u} value={u}>{u}</option>
                )}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Costo por {unidad || 'unidad'} $</label>
              <input type="number" min="0" value={costo} onChange={e => setCosto(e.target.value)}
                placeholder="0" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Stock actual ({unidad})</label>
              <input type="number" min="0" step="0.001" value={stockAct}
                onChange={e => setStockAct(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Stock mínimo ({unidad})</label>
              <input type="number" min="0" step="0.001" value={stockMin}
                onChange={e => setStockMin(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {error && <div style={{ fontSize: 11, color: t.redNum }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : '✓ Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab Productos ──────────────────────────────────────────────────────────
function TabProductos({
  stock, t, dark,
  onAjustar, onNuevo, onEditar,
}: {
  stock: ReturnType<typeof useStock>
  t: Tema; dark: boolean
  onAjustar: (p: Producto) => void
  onNuevo: () => void
  onEditar: (p: Producto) => void
}) {
  const [filtro, setFiltro] = useState<'todos' | 'criticos' | 'ok'>('todos')
  const [busqueda, setBusqueda] = useState('')

  const lista = stock.productos
    .filter(p => {
      if (filtro === 'criticos') return p.stock_actual <= p.stock_minimo
      if (filtro === 'ok')       return p.stock_actual > p.stock_minimo
      return true
    })
    .filter(p => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Barra de búsqueda y filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar producto..."
          style={{
            flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 10,
            border: `1.5px solid ${t.border}`, background: t.surfaceAlt,
            color: t.text, fontSize: 12, outline: 'none',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        />
        <div style={{ display: 'flex', gap: 5 }}>
          {(['todos', 'criticos', 'ok'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              style={{
                padding: '7px 13px', borderRadius: 20,
                border: `1.5px solid ${filtro === f ? t.accent : t.border}`,
                background: filtro === f ? (dark ? '#2a2218' : t.surfaceAlt) : 'transparent',
                color: filtro === f ? t.accent : t.textMuted,
                fontSize: 11, fontWeight: filtro === f ? 700 : 400, cursor: 'pointer',
              }}>
              {f === 'todos' ? `Todos (${stock.productos.length})` : f === 'criticos' ? `⚠ Críticos (${stock.resumen.productosCriticos})` : `✓ Ok`}
            </button>
          ))}
        </div>
        <button onClick={onNuevo}
          style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: t.accent, color: t.accentText, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Nuevo
        </button>
      </div>

      {/* Lista de productos */}
      {stock.loading
        ? [1, 2, 3, 4].map(i => <Sk key={i} h={72} radius={13} t={t} />)
        : lista.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 20px', color: t.textFaint }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.textMuted }}>
                {busqueda ? 'Sin resultados' : 'No hay productos cargados'}
              </div>
              {!busqueda && <div style={{ fontSize: 12, color: t.textFaint, marginTop: 4 }}>
                Creá tu primer producto con el botón "+ Nuevo"
              </div>}
            </div>
          : lista.map(p => {
              const sem = getSemaforo(p.stock_actual, p.stock_minimo)
              const dotColor = sem === 'ok' ? t.greenNum : sem === 'bajo' ? t.amberSub : t.redNum
              const margen = toFloat(p.precio_unitario) > 0 && toFloat(p.costo_unitario) > 0
                ? ((1 - toFloat(p.costo_unitario) / toFloat(p.precio_unitario)) * 100).toFixed(0)
                : null

              return (
                <div key={p.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 13, padding: '12px 14px', boxShadow: t.shadow, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Semáforo */}
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, boxShadow: `0 0 6px ${dotColor}`, flexShrink: 0 }} />

                  {/* Info principal */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{p.nombre}</span>
                      <SemaforoIndicator actual={p.stock_actual} minimo={p.stock_minimo} t={t} />
                      {p.codigo && <span style={{ fontSize: 9, color: t.textFaint, background: t.surfaceAlt, padding: '1px 6px', borderRadius: 6 }}>{p.codigo}</span>}
                    </div>
                    <BarraStock actual={p.stock_actual} minimo={p.stock_minimo} t={t} />
                    <div style={{ fontSize: 10, color: t.textFaint, marginTop: 3 }}>
                      Mín: {p.stock_minimo} {p.unidad}
                    </div>
                  </div>

                  {/* Números */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: t.text, fontFamily: 'monospace', lineHeight: 1 }}>
                      {formatNum(p.stock_actual)}
                    </div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>{p.unidad}</div>
                    <div style={{ fontSize: 10, color: t.textFaint, marginTop: 2 }}>
                      {formatPeso(p.precio_unitario)}
                      {margen && <span style={{ color: t.greenNum, marginLeft: 4 }}>{margen}% margen</span>}
                    </div>
                  </div>

                  {/* Botones */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => onAjustar(p)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.text, cursor: 'pointer', fontSize: 14 }}
                      title="Ajustar stock">⇅</button>
                    <button onClick={() => onEditar(p)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, cursor: 'pointer', fontSize: 12 }}
                      title="Editar">✎</button>
                  </div>
                </div>
              )
            })
      }
    </div>
  )
}

// ── Tab Insumos ────────────────────────────────────────────────────────────
function TabInsumos({
  stock, t, dark,
  onComprar, onNueva,
}: {
  stock: ReturnType<typeof useStock>
  t: Tema; dark: boolean
  onComprar: () => void
  onNueva: () => void
}) {
  const costoReponer = stock.materias
    .filter(m => toFloat(m.stock_actual) <= toFloat(m.stock_minimo))
    .reduce((s, m) => {
      const falta = Math.max(0, toFloat(m.stock_minimo) - toFloat(m.stock_actual))
      return s + falta * toFloat(m.costo_por_unidad)
    }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Resumen insumos */}
      {costoReponer > 0 && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: t.amber, border: `1.5px solid ${t.amberBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.amberSub }}>💡 Necesitás reponer {stock.resumen.insumosCriticos} insumo{stock.resumen.insumosCriticos !== 1 ? 's' : ''}</div>
            <div style={{ fontSize: 11, color: t.amberSub, marginTop: 2 }}>Costo estimado de reposición: <strong>{formatPeso(costoReponer)}</strong></div>
          </div>
          <button onClick={onComprar}
            style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: t.accent, color: t.accentText, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Registrar compra
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.textMuted }}>{stock.materias.length} insumos cargados</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onComprar}
            style={{ padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🛒 Registrar compra
          </button>
          <button onClick={onNueva}
            style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: t.accent, color: t.accentText, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Nueva MP
          </button>
        </div>
      </div>

      {stock.loading
        ? [1, 2, 3].map(i => <Sk key={i} h={68} radius={13} t={t} />)
        : stock.materias.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 20px', color: t.textFaint }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏭</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.textMuted }}>Sin materias primas cargadas</div>
              <div style={{ fontSize: 12, color: t.textFaint, marginTop: 4 }}>
                Usá este módulo si fabricás tus propios productos
              </div>
            </div>
          : stock.materias.map(m => {
              const actNum = toFloat(m.stock_actual)
              const minNum = toFloat(m.stock_minimo)
              const sem    = getSemaforo(actNum, minNum)
              const dotColor = sem === 'ok' ? t.greenNum : sem === 'bajo' ? t.amberSub : t.redNum
              const faltante = Math.max(0, minNum - actNum)
              const costoFaltante = faltante * toFloat(m.costo_por_unidad)

              return (
                <div key={m.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 13, padding: '12px 14px', boxShadow: t.shadow, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, boxShadow: `0 0 6px ${dotColor}`, flexShrink: 0 }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{m.nombre}</span>
                      <SemaforoIndicator actual={actNum} minimo={minNum} t={t} />
                    </div>
                    <BarraStock actual={actNum} minimo={minNum} t={t} />
                    <div style={{ fontSize: 10, color: t.textFaint, marginTop: 3 }}>
                      Mín: {formatNum(minNum, 2)} {m.unidad}
                      {faltante > 0 && <span style={{ color: t.amberSub, marginLeft: 6 }}>· Falta: {formatNum(faltante, 2)} {m.unidad} ≈ {formatPeso(costoFaltante)}</span>}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: t.text, fontFamily: 'monospace', lineHeight: 1 }}>
                      {formatNum(actNum, 2)}
                    </div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>{m.unidad}</div>
                    <div style={{ fontSize: 10, color: t.textFaint, marginTop: 2 }}>{formatPeso(m.costo_por_unidad)}/{m.unidad}</div>
                  </div>
                </div>
              )
            })
      }
    </div>
  )
}

// ── Tab Historial ──────────────────────────────────────────────────────────
function TabHistorial({ movimientos, t }: { movimientos: MovimientoStock[]; t: Tema }) {
  const [filtroDia, setFiltroDia] = useState<'hoy' | 'semana' | 'mes'>('semana')

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const semana = new Date(hoy); semana.setDate(hoy.getDate() - 7)
  const mes = new Date(hoy); mes.setDate(hoy.getDate() - 30)

  const filtrada = movimientos.filter(m => {
    const fecha = new Date(m.created_at)
    if (filtroDia === 'hoy')   return fecha >= hoy
    if (filtroDia === 'semana') return fecha >= semana
    return fecha >= mes
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {(['hoy', 'semana', 'mes'] as const).map(f => (
          <button key={f} onClick={() => setFiltroDia(f)}
            style={{
              padding: '6px 13px', borderRadius: 20,
              border: `1.5px solid ${filtroDia === f ? t.accent : t.border}`,
              background: filtroDia === f ? t.surfaceAlt : 'transparent',
              color: filtroDia === f ? t.accent : t.textMuted,
              fontSize: 11, fontWeight: filtroDia === f ? 700 : 400, cursor: 'pointer',
            }}>
            {f === 'hoy' ? 'Hoy' : f === 'semana' ? 'Esta semana' : 'Último mes'}
          </button>
        ))}
      </div>

      {filtrada.length === 0
        ? <div style={{ textAlign: 'center', padding: '40px 20px', color: t.textFaint }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 13, color: t.textMuted }}>Sin movimientos en este período</div>
          </div>
        : filtrada.map(m => {
            const cfg = tipoLabel(m.tipo as TipoMovimiento)
            const esEntrada = m.tipo.startsWith('entrada_')
            const fecha = new Date(m.created_at)
            const fechaStr = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
            const horaStr  = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

            return (
              <div key={m.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, color: cfg.color, fontWeight: 800 }}>{cfg.signo}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{m.productos?.nombre ?? '—'}</div>
                  <div style={{ fontSize: 10, color: t.textFaint, marginTop: 1 }}>
                    <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.text}</span>
                    {m.motivo && <span> · {m.motivo}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: esEntrada ? t.greenNum : t.redNum }}>
                    {cfg.signo}{m.cantidad}
                  </div>
                  <div style={{ fontSize: 9, color: t.textFaint }}>
                    {m.stock_anterior} → {m.stock_nuevo}
                  </div>
                  <div style={{ fontSize: 9, color: t.textFaint }}>{fechaStr} {horaStr}</div>
                </div>
              </div>
            )
          })
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STOCK VIEW PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function StockView({ usuario, stock }: StockViewProps) {
  const [dark, setDark] = useDarkMode()
  const [isMobile,    setIsMobile]    = useState(false)
  const [tab,         setTab]         = useState<'productos' | 'insumos' | 'historial'>('productos')
  const [modalAjuste, setModalAjuste] = useState<Producto | null>(null)
  const [modalProd,   setModalProd]   = useState<false | 'nuevo' | Producto>(false)
  const [modalCompra, setModalCompra] = useState(false)
  const [modalNuevaMP,setModalNuevaMP]= useState(false)

  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const t = dark ? tema.dark : tema.light

  const handleAjustar = async (tipo: TipoMovimiento, cantidad: number, motivo: string) => {
    if (!modalAjuste) return
    try {
      await stock.ajustarStock({ producto_id: modalAjuste.id, tipo, cantidad, motivo })
      setModalAjuste(null)
    } catch (err) { console.error(err) }
  }

  const handleCrearProducto = async (data: NuevoProductoData) => {
    try {
      await stock.crearProducto(data)
      setModalProd(false)
    } catch (err) { console.error(err) }
  }

  const handleEditarProducto = async (data: NuevoProductoData) => {
    if (!modalProd || modalProd === 'nuevo') return
    try {
      await stock.editarProducto((modalProd as Producto).id, data)
      setModalProd(false)
    } catch (err) { console.error(err) }
  }

  const handleCompraMP = async (data: CompraMateriaPrimaData) => {
    try {
      await stock.registrarCompraMP(data)
      setModalCompra(false)
    } catch (err) { console.error(err) }
  }

  const handleNuevaMP = async (data: NuevaMateriaPrimaData) => {
    try {
      await stock.crearMateriaPrima(data)
      setModalNuevaMP(false)
    } catch (err) { console.error(err) }
  }

  const kpis = [
    { label: 'Productos activos', value: stock.resumen.totalProductos.toString(),              icon: '📦', color: t.text },
    { label: 'Stock crítico',     value: stock.resumen.productosCriticos.toString(),           icon: '⚠️', color: stock.resumen.productosCriticos > 0 ? t.redNum : t.greenNum },
    { label: 'Valor inventario',  value: formatPeso(stock.resumen.valorInventario),            icon: '💰', color: t.text },
    { label: 'Insumos por reponer',value: stock.resumen.insumosCriticos.toString(),            icon: '🏭', color: stock.resumen.insumosCriticos > 0 ? t.amberSub : t.greenNum },
  ]

  const content = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bg }}>
      {/* Header */}
      <div style={{ padding: isMobile ? '52px 20px 14px' : '18px 24px 14px', borderBottom: `1px solid ${t.border}`, background: t.surface, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: isMobile ? 20 : 18, fontWeight: 800, color: t.text, letterSpacing: '-0.4px' }}>Stock</div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
              {stock.resumen.productosCriticos > 0
                ? <span style={{ color: t.redNum }}>⚠ {stock.resumen.productosCriticos} producto{stock.resumen.productosCriticos !== 1 ? 's' : ''} en nivel crítico</span>
                : <span style={{ color: t.greenNum }}>✓ Stock en orden</span>
              }
            </div>
          </div>
          {!isMobile && (
            <button onClick={() => setModalProd('nuevo')}
              style={{ padding: '9px 18px', borderRadius: 11, border: 'none', background: t.accent, color: t.accentText, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nuevo producto
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 10 }}>
          {stock.loading
            ? [1, 2, 3, 4].map(i => <Sk key={i} h={68} radius={12} t={t} />)
            : kpis.map((k, i) => (
                <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '11px 14px', boxShadow: t.shadow }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: t.textMuted }}>{k.label}</span>
                    <span style={{ fontSize: 16 }}>{k.icon}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: k.color, fontFamily: 'monospace' }}>{k.value}</div>
                </div>
              ))
          }
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '14px 20px 0', display: 'flex', gap: 6, flexShrink: 0 }}>
        {([
          ['productos',  `📦 Productos (${stock.resumen.totalProductos})`],
          ['insumos',    `🏭 Insumos (${stock.resumen.totalInsumos})`],
          ['historial',  '📋 Historial'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              padding: '7px 14px', borderRadius: 20,
              border: `1.5px solid ${tab === key ? t.accent : t.border}`,
              background: tab === key ? (dark ? '#2a2218' : t.surfaceAlt) : 'transparent',
              color: tab === key ? t.accent : t.textMuted,
              fontSize: 11, fontWeight: tab === key ? 700 : 400, cursor: 'pointer',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Contenido tab */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', paddingBottom: isMobile ? 80 : 20 }}>
        {tab === 'productos' && (
          <TabProductos
            stock={stock} t={t} dark={dark}
            onAjustar={p => setModalAjuste(p)}
            onNuevo={() => setModalProd('nuevo')}
            onEditar={p => setModalProd(p)}
          />
        )}
        {tab === 'insumos' && (
          <TabInsumos
            stock={stock} t={t} dark={dark}
            onComprar={() => setModalCompra(true)}
            onNueva={() => setModalNuevaMP(true)}
          />
        )}
        {tab === 'historial' && (
          <TabHistorial movimientos={stock.movimientos} t={t} />
        )}
      </div>

      {/* Bottom nav mobile */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.navBg, backdropFilter: 'blur(16px)', borderTop: `1px solid ${t.border}`, padding: '10px 0 20px', display: 'flex', justifyContent: 'space-around', zIndex: 50 }}>
          {([['⊞','Inicio','/dashboard'],['↗','Ventas','/ventas'],['◎','Cobros','/cobranzas'],['▦','Stock','/stock'],['≋','Más','']] as [string,string,string][]).map(([ico, lbl, hr]) => (
            <div key={lbl} onClick={() => hr && router.push(hr)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
              <div style={{ fontSize: 18, color: lbl === 'Stock' ? t.accent : t.textFaint }}>{ico}</div>
              <div style={{ fontSize: 9, color: lbl === 'Stock' ? t.accent : t.textFaint, fontWeight: lbl === 'Stock' ? 700 : 400 }}>{lbl}</div>
              {lbl === 'Stock' && <div style={{ width: 4, height: 4, borderRadius: '50%', background: t.accent }} />}
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

      <div style={{ height: '100vh', display: 'flex', background: t.bg, fontFamily: "'DM Sans', system-ui, sans-serif", overflow: 'hidden' }}>
        {!isMobile && <Sidebar activo="stock" usuario={usuario} dark={dark} setDark={setDark} t={t} />}
        {content}
      </div>

      {/* Modales */}
      {modalAjuste && (
        <ModalAjuste
          producto={modalAjuste}
          onConfirm={handleAjustar}
          onCancel={() => setModalAjuste(null)}
          saving={stock.saving}
          t={t} dark={dark}
        />
      )}
      {modalProd !== false && (
        <ModalProducto
          productoEditar={modalProd === 'nuevo' ? null : modalProd}
          onConfirm={modalProd === 'nuevo' ? handleCrearProducto : handleEditarProducto}
          onCancel={() => setModalProd(false)}
          saving={stock.saving}
          t={t}
        />
      )}
      {modalCompra && stock.materias.length > 0 && (
        <ModalCompraMP
          materias={stock.materias}
          onConfirm={handleCompraMP}
          onCancel={() => setModalCompra(false)}
          saving={stock.saving}
          t={t}
        />
      )}
      {modalNuevaMP && (
        <ModalNuevaMP
          onConfirm={handleNuevaMP}
          onCancel={() => setModalNuevaMP(false)}
          saving={stock.saving}
          t={t}
        />
      )}
    </>
  )
}