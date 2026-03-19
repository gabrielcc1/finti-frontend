'use client'

// src/components/ventas/VentasView.tsx
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Sidebar } from '@/components/shared/Sidebar'
import type { useVentas, ItemVenta, NuevaVentaData, NuevoClienteData, VentaConItems } from '@/hooks/useVentas'
import { useComprobante } from '@/hooks/useComprobante'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface VentasViewProps {
  usuario: UsuarioInfo
  ventas:  ReturnType<typeof useVentas>
}

// ── Utilidades ────────────────────────────────────────────────────────────────
const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0
// Sin toLocaleString — evita hydration mismatch entre server y client en Next.js
const formatPeso = (n: string | number | null | undefined) => {
  const num = toFloat(n)
  const parts = num.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$${parts[0]},${parts[1]}`
}
// Sin toLocaleDateString — mismo motivo
const formatFecha = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// ── Temas (mismo que dashboard) ───────────────────────────────────────────────
const tema = {
  light: {
    bg:'#fafaf8', surface:'#ffffff', surfaceAlt:'#f5f5f2',
    border:'#e8e8e4', text:'#111827', textMuted:'#6b7280', textFaint:'#9ca3af',
    accent:'#111827', accentText:'#ffffff',
    green:'#f0fdf4', greenBorder:'#bbf7d0', greenText:'#166534',
    amber:'#fffbeb', amberBorder:'#fde68a', amberSub:'#d97706',
    red:'#fff1f2', redBorder:'#fecdd3', redNum:'#dc2626',
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
    shadow:'0 1px 6px rgba(0,0,0,0.4)', shadowMd:'0 4px 20px rgba(0,0,0,0.5)',
    navBg:'rgba(20,18,16,0.95)',
  },
}
type Tema = typeof tema.light

// ── Sub-formulario inline: Nuevo cliente ─────────────────────────────────────
function FormNuevoClienteInline({
  t, dark, saving,
  onGuardar, onCancelar,
}: {
  t: Tema
  dark: boolean
  saving: boolean
  onGuardar: (data: NuevoClienteData) => Promise<void>
  onCancelar: () => void
}) {
  const [nombre,        setNombre]        = useState('')
  const [telefono,      setTelefono]      = useState('')
  const [zonaComercial, setZonaComercial] = useState('')
  const [direccion,     setDireccion]     = useState('')
  const [dni,           setDni]           = useState('')
  const [email,         setEmail]         = useState('')
  const [errorLocal,    setErrorLocal]    = useState('')

  const puedeGuardar = nombre.trim() !== '' && telefono.trim() !== '' && zonaComercial.trim() !== ''

  const handleGuardar = async () => {
    if (!puedeGuardar) {
      setErrorLocal('Nombre, teléfono y zona comercial son obligatorios.')
      return
    }
    setErrorLocal('')
    await onGuardar({ nombre, telefono, zona_comercial: zonaComercial, direccion, dni, email })
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 11px',
    borderRadius: 9,
    border: `1.5px solid ${t.border}`,
    background: t.bg,
    color: t.text,
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: 10,
    fontWeight: 700 as const,
    color: t.textMuted,
    display: 'block' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  }

  return (
    <div style={{
      marginTop: 10,
      padding: '14px 14px 12px',
      borderRadius: 12,
      border: `1.5px solid ${t.accent}`,
      background: dark ? '#1a1714' : '#fafaf8',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Encabezado del sub-formulario */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: t.accent, color: t.accentText,
          fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>👤</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>Nuevo cliente</span>
        <span style={{ fontSize: 10, color: t.textFaint, marginLeft: 4 }}>
          * Nombre, teléfono y zona son obligatorios
        </span>
      </div>

      {/* Fila 1: Nombre (ancho completo) */}
      <div>
        <label style={labelStyle}>Nombre *</label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: María González"
          style={inputStyle}
          autoFocus
        />
      </div>

      {/* Fila 2: Teléfono + Zona comercial */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Teléfono *</label>
          <input
            type="tel"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            placeholder="Ej: 11 2345-6789"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Zona comercial *</label>
          <input
            type="text"
            value={zonaComercial}
            onChange={e => setZonaComercial(e.target.value)}
            placeholder="Ej: Palermo, Centro..."
            style={inputStyle}
          />
        </div>
      </div>

      {/* Fila 3: Dirección (ancho completo) */}
      <div>
        <label style={labelStyle}>Dirección <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
        <input
          type="text"
          value={direccion}
          onChange={e => setDireccion(e.target.value)}
          placeholder="Ej: Av. Corrientes 1234, piso 2"
          style={inputStyle}
        />
      </div>

      {/* Fila 4: DNI + Email opcionales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>DNI <span style={{ fontWeight: 400, textTransform: 'none' }}>(opc.)</span></label>
          <input
            type="text"
            value={dni}
            onChange={e => setDni(e.target.value)}
            placeholder="Ej: 30123456"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Email <span style={{ fontWeight: 400, textTransform: 'none' }}>(opc.)</span></label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="maria@email.com"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Error de validación */}
      {errorLocal && (
        <div style={{ fontSize: 11, color: t.redNum, padding: '6px 10px', borderRadius: 7, background: t.red, border: `1px solid ${t.redBorder}` }}>
          ⚠️ {errorLocal}
        </div>
      )}

      {/* Botones del sub-formulario */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          onClick={onCancelar}
          style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={!puedeGuardar || saving}
          style={{
            flex: 2, padding: '8px 0', borderRadius: 9, border: 'none',
            background: puedeGuardar && !saving ? t.accent : t.surfaceAlt,
            color: puedeGuardar && !saving ? t.accentText : t.textFaint,
            fontSize: 12, fontWeight: 700,
            cursor: puedeGuardar && !saving ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          {saving ? 'Guardando...' : '✓ Crear cliente'}
        </button>
      </div>
    </div>
  )
}

// ── FORMULARIO NUEVA VENTA ────────────────────────────────────────────────────
function FormNuevaVenta({ ventas, t, dark, onClose }: {
  ventas: ReturnType<typeof useVentas>
  t: Tema; dark: boolean
  onClose: () => void
}) {
  const [clienteId,       setClienteId]       = useState<string>('')
  const [items,           setItems]           = useState<ItemVenta[]>([])
  const [descuento,       setDescuento]       = useState(0)
  const [tipoPago,        setTipoPago]        = useState<NuevaVentaData['tipo_pago']>('efectivo')
  const [cantCuotas,      setCantCuotas]      = useState(0)
  const [fechaPrimerCobro, setFechaPrimerCobro] = useState('')
  const [notas,           setNotas]           = useState('')
  const [busqueda,        setBusqueda]        = useState('')
  const [exito,           setExito]           = useState(false)
  // Control del sub-formulario de nuevo cliente
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false)
  const [clienteRecienCreado, setClienteRecienCreado] = useState<string | null>(null)

  const total     = items.reduce((s, i) => s + i.subtotal, 0) - descuento
  const prodsFilt = ventas.productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const agregarProducto = useCallback((prod: ReturnType<typeof useVentas>['productos'][0]) => {
    setItems(prev => {
      const existe = prev.find(i => i.producto_id === prod.id)
      if (existe) {
        return prev.map(i => i.producto_id === prod.id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio }
          : i
        )
      }
      return [...prev, {
        producto_id: prod.id,
        nombre: prod.nombre,
        precio: toFloat(prod.precio_unitario),
        cantidad: 1,
        subtotal: toFloat(prod.precio_unitario),
      }]
    })
    setBusqueda('')
  }, [])

  const cambiarCantidad = (id: string | null, delta: number) => {
    setItems(prev => prev
      .map(i => i.producto_id === id
        ? { ...i, cantidad: Math.max(1, i.cantidad + delta), subtotal: Math.max(1, i.cantidad + delta) * i.precio }
        : i
      )
      .filter(i => i.cantidad > 0)
    )
  }

  const quitarItem = (id: string | null) => setItems(prev => prev.filter(i => i.producto_id !== id))

  // Crear cliente desde el flujo de venta y seleccionarlo automáticamente
  const handleCrearCliente = async (data: NuevoClienteData) => {
    const nuevoCliente = await ventas.crearCliente(data)
    setClienteId(nuevoCliente.id)
    setClienteRecienCreado(nuevoCliente.id)
    setMostrarFormCliente(false)
  }

  const handleGuardar = async () => {
    if (items.length === 0) return
    try {
      await ventas.registrarVenta({
        cliente_id: clienteId || null,
        items,
        descuento,
        tipo_pago: tipoPago,
        cant_cuotas: cantCuotas,
        notas: notas || undefined,
        fecha_primer_cobro: tipoPago === 'cuotas' && fechaPrimerCobro ? fechaPrimerCobro : undefined,
      })
      setExito(true)
      setTimeout(() => { setExito(false); onClose() }, 1500)
    } catch (err) {
      console.error(err)
    }
  }

  const input = (val: string, onChange: (v: string) => void, placeholder: string, type = 'text') => (
    <input type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${t.border}`,
        background:t.bg, color:t.text, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }} />
  )

  if (exito) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:12 }}>
      <div style={{ fontSize:56 }}>✅</div>
      <div style={{ fontSize:18, fontWeight:800, color:t.text }}>¡Venta registrada!</div>
      <div style={{ fontSize:13, color:t.textMuted }}>{formatPeso(total)}</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'4px 0' }}>

      {/* ── Sección cliente ──────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize:11, fontWeight:700, color:t.textMuted, textTransform:'uppercase', letterSpacing:'0.04em' }}>
            Cliente
          </label>
          {/* Botón toggle nuevo cliente */}
          {!mostrarFormCliente && (
            <button
              onClick={() => { setMostrarFormCliente(true); setClienteId('') }}
              style={{
                fontSize: 11, fontWeight: 700,
                color: t.accent,
                background: 'none', border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 0',
              }}
            >
              + Nuevo cliente
            </button>
          )}
        </div>

        {/* Selector de cliente existente */}
        {!mostrarFormCliente && (
          <div style={{ position: 'relative' }}>
            <select
              value={clienteId}
              onChange={e => { setClienteId(e.target.value); setClienteRecienCreado(null) }}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1.5px solid ${clienteRecienCreado ? t.accent : t.border}`,
                background: t.bg, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            >
              <option value="">Consumidor final</option>
              {ventas.clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.id === clienteRecienCreado ? `✓ ${c.nombre}` : c.nombre}
                </option>
              ))}
            </select>
            {/* Badge "recién creado" */}
            {clienteRecienCreado && clienteId === clienteRecienCreado && (
              <div style={{
                marginTop: 6, padding: '5px 10px', borderRadius: 7,
                background: t.green, border: `1px solid ${t.greenBorder}`,
                fontSize: 11, color: t.greenText, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                ✓ Cliente creado y seleccionado
              </div>
            )}
          </div>
        )}

        {/* Sub-formulario inline: nuevo cliente */}
        {mostrarFormCliente && (
          <FormNuevoClienteInline
            t={t}
            dark={dark}
            saving={ventas.saving}
            onGuardar={handleCrearCliente}
            onCancelar={() => setMostrarFormCliente(false)}
          />
        )}
      </div>

      {/* Buscador de productos */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:t.textMuted, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Agregar productos</label>
        {input(busqueda, setBusqueda, '🔍 Buscar producto...')}
        {busqueda && (
          <div style={{ border:`1px solid ${t.border}`, borderRadius:10, background:t.surface, marginTop:4, maxHeight:180, overflowY:'auto', boxShadow:t.shadowMd }}>
            {prodsFilt.length === 0
              ? <div style={{ padding:'12px 14px', color:t.textFaint, fontSize:12 }}>Sin resultados</div>
              : prodsFilt.map(p => (
                  <div key={p.id} onClick={() => agregarProducto(p)}
                    style={{ padding:'10px 14px', cursor:'pointer', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.surfaceAlt)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:t.text }}>{p.nombre}</div>
                      <div style={{ fontSize:10, color:t.textFaint }}>Stock: {p.stock_actual} {p.unidad}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:t.accent, fontFamily:'monospace' }}>{formatPeso(p.precio_unitario)}</div>
                  </div>
                ))
            }
          </div>
        )}
      </div>

      {/* Items agregados */}
      {items.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {items.map(item => {
            const prod = ventas.productos.find(p => p.id === item.producto_id)
            const stock = prod?.stock_actual ?? null
            const stockBajo = stock !== null && stock <= (prod?.stock_minimo ?? 0)
            const sinStock  = stock !== null && stock === 0
            const stockColor = sinStock ? '#dc2626' : stockBajo ? '#d97706' : '#6b7280'
            return (
            <div key={item.producto_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:t.surfaceAlt, border:`1px solid ${t.border}` }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:t.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.nombre}</div>
                <div style={{ fontSize:10, color:t.textMuted, display:'flex', alignItems:'center', gap:6 }}>
                  <span>{formatPeso(item.precio)} c/u</span>
                  {stock !== null && (
                    <span style={{ color: stockColor, fontWeight: sinStock || stockBajo ? 700 : 400 }}>
                      · Stock: {stock}{prod?.unidad ? ` ${prod.unidad}` : ''}
                      {sinStock ? ' ⚠️' : stockBajo ? ' ↓' : ''}
                    </span>
                  )}
                </div>
              </div>
              {/* Controles cantidad */}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <button onClick={() => cambiarCantidad(item.producto_id, -1)}
                  style={{ width:26, height:26, borderRadius:7, border:`1px solid ${t.border}`, background:t.surface, color:t.text, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                <span style={{ fontSize:13, fontWeight:700, color:t.text, minWidth:20, textAlign:'center' }}>{item.cantidad}</span>
                <button onClick={() => cambiarCantidad(item.producto_id, 1)}
                  style={{ width:26, height:26, borderRadius:7, border:`1px solid ${t.border}`, background:t.surface, color:t.text, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:t.text, fontFamily:'monospace', minWidth:70, textAlign:'right' }}>{formatPeso(item.subtotal)}</div>
              <button onClick={() => quitarItem(item.producto_id)}
                style={{ width:22, height:22, borderRadius:6, border:'none', background:t.red, color:t.redNum, cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            )
          })}

          {/* Subtotal y descuento */}
          <div style={{ padding:'12px 14px', borderRadius:10, background:t.surface, border:`1px solid ${t.border}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:12, color:t.textMuted }}>Subtotal</span>
              <span style={{ fontSize:12, fontWeight:600, color:t.text, fontFamily:'monospace' }}>{formatPeso(items.reduce((s,i)=>s+i.subtotal,0))}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:12, color:t.textMuted }}>Descuento</span>
              <input type="number" value={descuento || ''} onChange={e => setDescuento(Number(e.target.value))}
                placeholder="$0" min={0}
                style={{ width:90, padding:'4px 8px', borderRadius:7, border:`1px solid ${t.border}`, background:t.bg, color:t.text, fontSize:12, fontFamily:'monospace', outline:'none', textAlign:'right' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:`1px solid ${t.border}` }}>
              <span style={{ fontSize:14, fontWeight:800, color:t.text }}>TOTAL</span>
              <span style={{ fontSize:18, fontWeight:800, color:t.accent, fontFamily:'monospace' }}>{formatPeso(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tipo de pago */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:t.textMuted, display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.04em' }}>Forma de pago</label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {(['efectivo','transferencia','tarjeta','cuotas'] as const).map(tp => (
            <button key={tp} onClick={() => setTipoPago(tp)}
              style={{ padding:'10px 0', borderRadius:10, border:`1.5px solid ${tipoPago===tp ? t.accent : t.border}`, background:tipoPago===tp ? (dark?'#2a2218':t.surfaceAlt) : t.surface, color:tipoPago===tp ? t.accent : t.textMuted, fontSize:12, fontWeight:tipoPago===tp?700:400, cursor:'pointer', transition:'all 0.15s' }}>
              {tp === 'efectivo' ? '💵 Efectivo'
               : tp === 'transferencia' ? '📲 Transferencia'
               : tp === 'tarjeta' ? '💳 Tarjeta'
               : '📋 Cuotas'}
            </button>
          ))}
        </div>
        {tipoPago === 'cuotas' && (
          <>
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:12, color:t.textMuted, flexShrink:0 }}>Cantidad de cuotas:</span>
            <input
              type="number" min="1" max="60"
              value={cantCuotas || ''}
              onChange={e => setCantCuotas(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="Ej: 3"
              style={{ width:90, padding:'7px 10px', borderRadius:9, border:`1.5px solid ${t.border}`, background:t.bg, color:t.text, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }}
            />
            {cantCuotas > 0 && total > 0 && (
              <span style={{ fontSize:11, color:t.textMuted }}>
                → <strong style={{ color:t.text, fontFamily:'monospace' }}>{cantCuotas}</strong> × {formatPeso((total - descuento) / cantCuotas)}
              </span>
            )}
          </div>
          <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, color:t.textMuted, flexShrink:0 }}>📅 Fecha 1° cobro:</span>
            <input type="date" value={fechaPrimerCobro} onChange={e => setFechaPrimerCobro(e.target.value)}
              style={{ padding:'7px 10px', borderRadius:9, border:`1.5px solid ${t.border}`, background:t.bg, color:t.text, fontSize:13, outline:'none' }} />
            <span style={{ fontSize:10, color:t.textFaint }}>opcional · por defecto mes siguiente</span>
          </div>
          </>
        )}
      </div>

      {/* Notas */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:t.textMuted, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Notas (opcional)</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej: Cliente pagó con billete de $1000..."
          rows={2}
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${t.border}`, background:t.bg, color:t.text, fontSize:13, fontFamily:'inherit', outline:'none', resize:'none', boxSizing:'border-box' as const }} />
      </div>

      {/* Botones */}
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onClose}
          style={{ flex:1, padding:13, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={items.length === 0 || ventas.saving}
          style={{ flex:2, padding:13, borderRadius:12, border:'none', background:items.length===0?t.surfaceAlt:t.accent, color:items.length===0?t.textFaint:t.accentText, fontSize:13, fontWeight:800, cursor:items.length===0?'not-allowed':'pointer', transition:'all 0.15s' }}>
          {ventas.saving ? 'Guardando...' : `✓ Confirmar ${formatPeso(total)}`}
        </button>
      </div>
    </div>
  )
}

// ── LISTA DE VENTAS ───────────────────────────────────────────────────────────
function ListaVentas({ ventas, t, negocio }: { ventas: ReturnType<typeof useVentas>; t: Tema; negocio: { nombre: string } }) {
  const comprobante = useComprobante({ nombre: negocio.nombre })
  if (ventas.loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ height:64, borderRadius:12, background:t.surfaceAlt, animation:'shimmer 1.4s infinite' }} />
      ))}
    </div>
  )

  if (ventas.ventas.length === 0) return (
    <div style={{ textAlign:'center', padding:'40px 20px', color:t.textFaint }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🛒</div>
      <div style={{ fontSize:14, fontWeight:600, color:t.textMuted }}>Sin ventas este mes</div>
      <div style={{ fontSize:12, marginTop:4 }}>Registrá tu primera venta con el botón ＋</div>
    </div>
  )

  const coloresPago: Record<string, { bg: string; color: string; label: string }> = {
    efectivo:      { bg: '#f0fdf4', color: '#166534', label: '💵 Efectivo' },
    transferencia: { bg: '#eff6ff', color: '#1d4ed8', label: '📲 Transf.' },
    tarjeta:       { bg: '#faf5ff', color: '#7c3aed', label: '💳 Tarjeta' },
    cuotas:        { bg: '#fffbeb', color: '#d97706', label: '📋 Cuotas' },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {ventas.ventas.map(v => {
        const col = coloresPago[v.tipo_pago ?? 'efectivo'] ?? coloresPago.efectivo
        const cliente = v.clientes?.nombre ?? 'Consumidor final'
        return (
          <div key={v.id} style={{ padding:'12px 14px', borderRadius:13, background:t.surface, border:`1px solid ${t.border}`, boxShadow:t.shadow, display:'flex', alignItems:'center', gap:12 }}>
            {/* Avatar */}
            <div style={{ width:38, height:38, borderRadius:10, background:t.surfaceAlt, border:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:t.textMuted, flexShrink:0 }}>
              {cliente.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            {/* Info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:t.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{cliente}</div>
              <div style={{ fontSize:10, color:t.textFaint }}>
                {formatFecha(v.fecha)} · {v.venta_items?.length ?? 0} items
              </div>
            </div>
            {/* Pago badge */}
            <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:20, background:col.bg, color:col.color, flexShrink:0 }}>{col.label}</span>
            {/* Total */}
            <div style={{ fontSize:14, fontWeight:800, color:t.text, fontFamily:'monospace', flexShrink:0 }}>{formatPeso(v.total)}</div>
            {/* Botón comprobante */}
            <button
              onClick={() => comprobante.descargarComprobanteVenta(v as VentaConItems)}
              disabled={comprobante.generando}
              title="Descargar comprobante PDF"
              style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 8,
                border: `1px solid ${t.border}`, background: t.surfaceAlt,
                color: t.textMuted, cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: comprobante.generando ? 0.5 : 1,
              }}
            >
              {comprobante.generando ? '⏳' : '⬇'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VENTAS VIEW PRINCIPAL — responsive automático
// ══════════════════════════════════════════════════════════════════════════════
export function VentasView({ usuario, ventas }: VentasViewProps) {
  const [dark,       setDark]       = useDarkMode()
  const [isMobile,   setIsMobile]   = useState(false)
  const [showForm,   setShowForm]   = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const t = dark ? tema.dark : tema.light

  const kpis = [
    { label:'Total mes',      value: formatPeso(ventas.resumen.totalMes),    icon:'📦', color: t.accent },
    { label:'Ventas',         value: String(ventas.resumen.cantidadMes),      icon:'🛒', color: '#4ade80' },
    { label:'Efectivo',       value: formatPeso(ventas.resumen.efectivo),     icon:'💵', color: t.accent },
    { label:'En cuotas',      value: formatPeso(ventas.resumen.cuotas),       icon:'📋', color: t.amberSub },
  ]

  const router = useRouter()

  const sidebar = (
    <Sidebar activo="ventas" usuario={usuario} dark={dark} setDark={setDark} t={t} />
  )

  const content = (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Topbar */}
      <div style={{ height:54, background:t.surface, borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', padding:'0 20px', flexShrink:0 }}>
        {isMobile && (
          <button onClick={()=>router.push('/dashboard')} style={{ marginRight:12, background:'none', border:'none', color:t.textMuted, cursor:'pointer', fontSize:18 }}>←</button>
        )}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:t.text }}>Ventas</div>
          <div style={{ fontSize:10, color:t.textMuted }}>{ventas.resumen.cantidadMes} ventas este mes</div>
        </div>
        <button onClick={()=>setShowForm(true)}
          style={{ marginLeft:'auto', padding:'8px 16px', borderRadius:10, border:'none', background:t.accent, color:t.accentText, fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          ＋ Nueva venta
        </button>
      </div>

      {/* KPIs */}
      <div style={{ padding:'16px 20px 0', display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:12 }}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:13, padding:'13px 15px', boxShadow:t.shadow }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:10, color:t.textMuted }}>{k.label}</span>
              <span style={{ fontSize:16 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize:18, fontWeight:800, color:t.text, fontFamily:'monospace' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', paddingBottom: isMobile ? 80 : 20 }}>
        <div style={{ fontSize:12, fontWeight:700, color:t.textMuted, marginBottom:12, textTransform:'uppercase', letterSpacing:'0.04em' }}>
          Ventas del mes
        </div>
        <ListaVentas ventas={ventas} t={t} negocio={{ nombre: usuario.negocio }} />
      </div>

      {/* Bottom nav mobile */}
      {isMobile && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:t.navBg, backdropFilter:'blur(16px)', borderTop:`1px solid ${t.border}`, padding:'10px 0 20px', display:'flex', justifyContent:'space-around', zIndex:50 }}>
          {[['⊞','Inicio','/dashboard'],['↗','Ventas','/ventas'],['◎','Cobros','/cobranzas'],['▦','Stock','/stock'],['≋','Más','']].map(([icon,label,href])=>(
            <div key={label} onClick={()=>href&&router.push(href)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, cursor:'pointer' }}>
              <div style={{ fontSize:18, color:label==='Ventas'?t.accent:t.textFaint }}>{icon}</div>
              <div style={{ fontSize:9, color:label==='Ventas'?t.accent:t.textFaint, fontWeight:label==='Ventas'?700:400 }}>{label}</div>
              {label==='Ventas' && <div style={{ width:4, height:4, borderRadius:'50%', background:t.accent }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#33302a;border-radius:4px;}
      `}</style>

      <div suppressHydrationWarning style={{ height:'100vh', display:'flex', background:t.bg, fontFamily:"'DM Sans',system-ui,sans-serif", overflow:'hidden' }}>
        {!isMobile && sidebar}
        {content}
      </div>

      {/* Modal nueva venta */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius: isMobile ? '20px 20px 0 0' : 20, padding:'24px 20px', width:'100%', maxWidth: isMobile ? '100%' : 480, maxHeight: isMobile ? '92vh' : '90vh', overflowY:'auto', boxShadow:t.shadowMd }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:800, color:t.text }}>Nueva venta</div>
              <button onClick={()=>setShowForm(false)} style={{ width:28, height:28, borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <FormNuevaVenta ventas={ventas} t={t} dark={dark} onClose={()=>setShowForm(false)} />
          </div>
        </div>
      )}
    </>
  )
}