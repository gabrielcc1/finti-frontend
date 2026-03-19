// src/lib/generarComprobante.ts
// Genera comprobantes PDF de ventas y cobranzas usando jsPDF (browser-side).
// No requiere servidor — todo se genera en el cliente y se descarga directamente.
//
// INSTALACIÓN (si no está ya):
//   npm install jspdf
//
// USO:
//   import { generarComprobanteVenta, generarComprobanteCobranza } from '@/lib/generarComprobante'

import type { VentaConItems } from '@/hooks/useVentas'
import type { CobranzaConDetalle } from '@/hooks/useCobranzas'

// ── Helpers internos ──────────────────────────────────────────────────────────

const toFloat = (v: string | number | null | undefined) =>
  parseFloat(String(v ?? 0)) || 0

function formatPeso(n: string | number | null | undefined): string {
  const num = toFloat(n)
  const parts = num.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$${parts[0]},${parts[1]}`
}

function formatFecha(iso: string): string {
  // Devuelve "15/03/2026" sin depender de toLocaleDateString (evita hydration issues)
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function formatFechaLarga(iso: string): string {
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`
}

// Número de comprobante legible (últimos 8 chars del UUID)
function nroComprobante(id: string): string {
  return id.replace(/-/g, '').slice(-8).toUpperCase()
}

// ── Tipos de datos del negocio ─────────────────────────────────────────────────
export interface DatosNegocio {
  nombre: string
  // Campos opcionales — se muestran si están presentes
  telefono?:       string | null
  email?:          string | null
  direccion?:      string | null
  cuit?:           string | null
  condicion_iva?:  string | null
}

// ── Paleta de colores del comprobante ─────────────────────────────────────────
const COLOR = {
  negro:     [17,  24,  39 ] as [number, number, number],
  gris:      [107, 114, 128] as [number, number, number],
  grisFaint: [229, 231, 235] as [number, number, number],
  grisBg:    [249, 250, 251] as [number, number, number],
  verde:     [22,  101, 52 ] as [number, number, number],
  verdeBg:   [240, 253, 244] as [number, number, number],
  ambar:     [217, 119, 6  ] as [number, number, number],
  ambarBg:   [255, 251, 235] as [number, number, number],
  rojo:      [220, 38,  38 ] as [number, number, number],
  rojoBg:    [255, 241, 242] as [number, number, number],
  acento:    [17,  24,  39 ] as [number, number, number],  // mismo que negro para simplificar
}

// ── Importar jsPDF de forma lazy (solo en browser) ────────────────────────────
async function getJsPDF() {
  // Importación dinámica para no romper SSR
  const { jsPDF } = await import('jspdf')
  return jsPDF
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPROBANTE DE VENTA (efectivo / transferencia / tarjeta / cuotas-pago único)
// ─────────────────────────────────────────────────────────────────────────────
export async function generarComprobanteVenta(
  venta: VentaConItems,
  negocio: DatosNegocio,
  cuotasVenta?: Array<{
    numero_cuota: number
    monto: string | number
    fecha_vencimiento: string
    fecha_pago: string | null
    estado: string
  }>
): Promise<void> {
  const JsPDF = await getJsPDF()
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PW  = 210  // page width
  const M   = 18   // margin
  const CW  = PW - M * 2  // content width
  let   Y   = M   // current Y cursor

  const labelPago: Record<string, string> = {
    efectivo:      'Efectivo',
    transferencia: 'Transferencia',
    tarjeta:       'Tarjeta',
    cuotas:        'En cuotas',
  }

  // ── Encabezado ──────────────────────────────────────────────────────────────
  // Franja superior
  doc.setFillColor(...COLOR.negro)
  doc.rect(0, 0, PW, 28, 'F')

  // Nombre del negocio
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(negocio.nombre.toUpperCase(), M, 12)

  // Título COMPROBANTE
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 180)
  doc.text('COMPROBANTE DE VENTA', M, 20)

  // Número de comprobante (derecha)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  const nro = `N° ${nroComprobante(venta.id)}`
  doc.text(nro, PW - M, 12, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 180)
  doc.text(`Fecha: ${formatFecha(venta.fecha)}`, PW - M, 20, { align: 'right' })

  Y = 38

  // ── Datos del negocio (info de contacto) ────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR.gris)

  const infoLineas: string[] = []
  if (negocio.cuit)           infoLineas.push(`CUIT: ${negocio.cuit}`)
  if (negocio.condicion_iva)  infoLineas.push(negocio.condicion_iva)
  if (negocio.direccion)      infoLineas.push(negocio.direccion)
  if (negocio.telefono)       infoLineas.push(`Tel: ${negocio.telefono}`)
  if (negocio.email)          infoLineas.push(negocio.email)

  if (infoLineas.length > 0) {
    doc.text(infoLineas.join('  ·  '), M, Y)
    Y += 6
  }

  // Línea divisoria
  doc.setDrawColor(...COLOR.grisFaint)
  doc.setLineWidth(0.3)
  doc.line(M, Y, PW - M, Y)
  Y += 8

  // ── Datos del cliente ────────────────────────────────────────────────────────
  const nombreCliente = venta.clientes?.nombre ?? 'Consumidor final'
  const telefonoCliente = venta.clientes?.telefono

  doc.setFillColor(...COLOR.grisBg)
  doc.roundedRect(M, Y, CW, telefonoCliente ? 20 : 14, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR.gris)
  doc.text('CLIENTE', M + 6, Y + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR.negro)
  doc.text(nombreCliente, M + 6, Y + 13)

  if (telefonoCliente) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR.gris)
    doc.text(`Tel: ${telefonoCliente}`, M + 6, Y + 19)
  }

  Y += telefonoCliente ? 28 : 22

  // ── Tabla de ítems ───────────────────────────────────────────────────────────
  // Header
  doc.setFillColor(...COLOR.negro)
  doc.rect(M, Y, CW, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('PRODUCTO / SERVICIO', M + 4, Y + 6)
  doc.text('CANT.', M + CW * 0.60, Y + 6, { align: 'center' })
  doc.text('PRECIO UNIT.', M + CW * 0.77, Y + 6, { align: 'center' })
  doc.text('SUBTOTAL', PW - M - 4, Y + 6, { align: 'right' })
  Y += 9

  // Filas
  const items = venta.venta_items ?? []
  items.forEach((item, idx) => {
    const nombre   = item.nombre_snapshot ?? item.productos?.nombre ?? 'Ítem'
    const cant     = item.cantidad
    const precio   = toFloat(item.precio_unitario)
    const subtotal = toFloat(item.subtotal)

    // Fila alternada
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 248)
      doc.rect(M, Y, CW, 9, 'F')
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.negro)
    // Truncar nombre largo
    const nombreTrunc = nombre.length > 45 ? nombre.slice(0, 42) + '...' : nombre
    doc.text(nombreTrunc, M + 4, Y + 6)
    doc.text(String(cant), M + CW * 0.60, Y + 6, { align: 'center' })
    doc.setTextColor(...COLOR.gris)
    doc.text(formatPeso(precio), M + CW * 0.77, Y + 6, { align: 'center' })
    doc.setTextColor(...COLOR.negro)
    doc.text(formatPeso(subtotal), PW - M - 4, Y + 6, { align: 'right' })
    Y += 9
  })

  // Borde tabla
  doc.setDrawColor(...COLOR.grisFaint)
  doc.setLineWidth(0.3)
  doc.rect(M, Y - (9 * items.length) - 9, CW, 9 * items.length + 9, 'S')

  Y += 6

  // ── Totales ──────────────────────────────────────────────────────────────────
  const subtotalBruto = items.reduce((s, i) => s + toFloat(i.subtotal), 0)
  const descuento     = toFloat(venta.descuento)
  const total         = toFloat(venta.total)
  const totalesX      = PW - M - 70

  // Subtotal (solo si hay descuento)
  if (descuento > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.gris)
    doc.text('Subtotal:', totalesX, Y)
    doc.text(formatPeso(subtotalBruto), PW - M - 4, Y, { align: 'right' })
    Y += 7

    doc.setTextColor(...COLOR.verde)
    doc.text(`Descuento:`, totalesX, Y)
    doc.text(`- ${formatPeso(descuento)}`, PW - M - 4, Y, { align: 'right' })
    Y += 7
  }

  // Línea antes del total
  doc.setDrawColor(...COLOR.grisFaint)
  doc.line(totalesX, Y, PW - M, Y)
  Y += 5

  // TOTAL grande
  doc.setFillColor(...COLOR.negro)
  doc.roundedRect(totalesX - 4, Y - 1, (PW - M - totalesX) + 8, 14, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL:', totalesX + 2, Y + 9)
  doc.setFontSize(14)
  doc.text(formatPeso(total), PW - M - 2, Y + 9, { align: 'right' })
  Y += 20

  // ── Forma de pago ────────────────────────────────────────────────────────────
  const tipoPago = labelPago[venta.tipo_pago ?? 'efectivo'] ?? venta.tipo_pago ?? '—'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gris)
  doc.text(`Forma de pago: `, M, Y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR.negro)
  doc.text(tipoPago, M + 34, Y)
  Y += 10

  // Notas
  if (venta.notas) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR.gris)
    const notasLines = doc.splitTextToSize(`Nota: ${venta.notas}`, CW)
    doc.text(notasLines, M, Y)
    Y += notasLines.length * 5 + 4
  }

  // ── Cuotas (si la venta fue en cuotas) ──────────────────────────────────────
  if (venta.tipo_pago === 'cuotas' && cuotasVenta && cuotasVenta.length > 0) {
    Y += 4
    // Título sección
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.negro)
    doc.text('DETALLE DE CUOTAS', M, Y)
    Y += 6

    // Estado general
    const totalPagado  = cuotasVenta.filter(c => c.estado === 'pagada').reduce((s, c) => s + toFloat(c.monto), 0)
    const totalPendiente = cuotasVenta.filter(c => c.estado !== 'pagada').reduce((s, c) => s + toFloat(c.monto), 0)
    const todasPagadas = cuotasVenta.every(c => c.estado === 'pagada')

    if (todasPagadas) {
      doc.setFillColor(240, 253, 244)
      doc.roundedRect(M, Y, CW, 10, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(22, 101, 52)
      doc.text('✓ VENTA TOTALMENTE ABONADA', M + CW / 2, Y + 7, { align: 'center' })
      Y += 14
    }

    // Encabezado tabla cuotas
    doc.setFillColor(...COLOR.negro)
    doc.rect(M, Y, CW, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text('N°', M + 8, Y + 5.5, { align: 'center' })
    doc.text('VENCIMIENTO', M + CW * 0.30, Y + 5.5, { align: 'center' })
    doc.text('MONTO', M + CW * 0.57, Y + 5.5, { align: 'center' })
    doc.text('ESTADO', M + CW * 0.76, Y + 5.5, { align: 'center' })
    doc.text('FECHA PAGO', PW - M - 4, Y + 5.5, { align: 'right' })
    Y += 8

    cuotasVenta.forEach((cuota, idx) => {
      const pagada  = cuota.estado === 'pagada'
      const vencida = cuota.estado === 'vencida' || (
        cuota.estado !== 'pagada' &&
        new Date(cuota.fecha_vencimiento) < new Date()
      )

      // Fila alternada
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 248)
        doc.rect(M, Y, CW, 8, 'F')
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...COLOR.negro)
      doc.text(String(cuota.numero_cuota), M + 8, Y + 5.5, { align: 'center' })

      // Fecha vencimiento
      const fVenc = cuota.fecha_vencimiento?.slice(0, 10).split('-').reverse().join('/')
      doc.text(fVenc ?? '—', M + CW * 0.30, Y + 5.5, { align: 'center' })

      // Monto
      doc.text(formatPeso(cuota.monto), M + CW * 0.57, Y + 5.5, { align: 'center' })

      // Estado con color
      if (pagada) {
        doc.setTextColor(...COLOR.verde)
        doc.setFont('helvetica', 'bold')
        doc.text('✓ PAGADA', M + CW * 0.76, Y + 5.5, { align: 'center' })
      } else if (vencida) {
        doc.setTextColor(220, 38, 38)
        doc.setFont('helvetica', 'bold')
        doc.text('VENCIDA', M + CW * 0.76, Y + 5.5, { align: 'center' })
      } else {
        doc.setTextColor(...COLOR.gris)
        doc.setFont('helvetica', 'normal')
        doc.text('Pendiente', M + CW * 0.76, Y + 5.5, { align: 'center' })
      }

      // Fecha de pago
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLOR.gris)
      const fPago = cuota.fecha_pago
        ? cuota.fecha_pago.slice(0, 10).split('-').reverse().join('/')
        : '—'
      doc.text(fPago, PW - M - 4, Y + 5.5, { align: 'right' })
      Y += 8
    })

    // Borde tabla
    doc.setDrawColor(...COLOR.grisFaint)
    doc.setLineWidth(0.3)
    doc.rect(M, Y - (8 * cuotasVenta.length) - 8, CW, 8 * cuotasVenta.length + 8, 'S')
    Y += 4

    // Resumen cobrado/pendiente
    if (!todasPagadas) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...COLOR.verde)
      doc.text(`Cobrado: ${formatPeso(totalPagado)}`, M, Y)
      doc.setTextColor(220, 38, 38)
      doc.text(`Pendiente: ${formatPeso(totalPendiente)}`, M + 50, Y)
      Y += 8
    }
  }

  // ── Pie de página ────────────────────────────────────────────────────────────
  _piePagina(doc, negocio, PW, M)

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const nombreArchivo = `comprobante-venta-${nroComprobante(venta.id)}.pdf`
  doc.save(nombreArchivo)
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPROBANTE DE COBRANZA EN CUOTAS
// Muestra todas las cuotas con estado: pagada / pendiente / vencida
// ─────────────────────────────────────────────────────────────────────────────
export async function generarComprobanteCobranza(
  cobranza: CobranzaConDetalle,
  negocio: DatosNegocio
): Promise<void> {
  const JsPDF = await getJsPDF()
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PW  = 210
  const M   = 18
  const CW  = PW - M * 2
  let   Y   = M

  const cuotas = [...(cobranza.cuotas ?? [])].sort((a, b) => a.numero_cuota - b.numero_cuota)
  const hoy    = new Date(); hoy.setHours(0, 0, 0, 0)

  const pagadas   = cuotas.filter(c => c.estado === 'pagada').length
  const pendientes = cuotas.filter(c => c.estado !== 'pagada').length
  const montoCobrado = cuotas.filter(c => c.estado === 'pagada').reduce((s, c) => s + toFloat(c.monto), 0)
  const montoPendiente = cuotas.filter(c => c.estado !== 'pagada').reduce((s, c) => s + toFloat(c.monto), 0)

  // ── Encabezado ──────────────────────────────────────────────────────────────
  doc.setFillColor(...COLOR.negro)
  doc.rect(0, 0, PW, 28, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(negocio.nombre.toUpperCase(), M, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 180)
  doc.text('COMPROBANTE DE COBRANZA EN CUOTAS', M, 20)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(`N° ${nroComprobante(cobranza.id)}`, PW - M, 12, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 180)
  doc.text(`Emitido: ${formatFecha(new Date().toISOString())}`, PW - M, 20, { align: 'right' })

  Y = 38

  // Info del negocio
  const infoLineas: string[] = []
  if (negocio.cuit)          infoLineas.push(`CUIT: ${negocio.cuit}`)
  if (negocio.condicion_iva) infoLineas.push(negocio.condicion_iva)
  if (negocio.direccion)     infoLineas.push(negocio.direccion)
  if (negocio.telefono)      infoLineas.push(`Tel: ${negocio.telefono}`)
  if (negocio.email)         infoLineas.push(negocio.email)

  if (infoLineas.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR.gris)
    doc.text(infoLineas.join('  ·  '), M, Y)
    Y += 6
  }

  doc.setDrawColor(...COLOR.grisFaint)
  doc.setLineWidth(0.3)
  doc.line(M, Y, PW - M, Y)
  Y += 8

  // ── Cliente ──────────────────────────────────────────────────────────────────
  const nombreCliente  = cobranza.clientes?.nombre  ?? 'Cliente'
  const telefonoCliente = cobranza.clientes?.telefono

  doc.setFillColor(...COLOR.grisBg)
  doc.roundedRect(M, Y, CW, telefonoCliente ? 20 : 14, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR.gris)
  doc.text('CLIENTE', M + 6, Y + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR.negro)
  doc.text(nombreCliente, M + 6, Y + 13)

  if (telefonoCliente) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR.gris)
    doc.text(`Tel: ${telefonoCliente}`, M + 6, Y + 19)
  }

  Y += telefonoCliente ? 28 : 22

  // ── Descripción y resumen ────────────────────────────────────────────────────
  if (cobranza.descripcion) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.gris)
    doc.text('Concepto:', M, Y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR.negro)
    const desc = doc.splitTextToSize(cobranza.descripcion, CW - 22)
    doc.text(desc, M + 20, Y)
    Y += desc.length * 5 + 6
  }

  // Cuadro resumen 3 columnas: Monto total / Pagado / Pendiente
  const colW = CW / 3
  const resumenItems = [
    { label: 'MONTO TOTAL',  value: formatPeso(cobranza.monto_total), color: COLOR.negro },
    { label: 'COBRADO',       value: formatPeso(montoCobrado),          color: COLOR.verde },
    { label: 'PENDIENTE',     value: formatPeso(montoPendiente),         color: pendientes > 0 ? COLOR.ambar : COLOR.verde },
  ]
  resumenItems.forEach((item, i) => {
    const x = M + colW * i
    doc.setFillColor(...COLOR.grisBg)
    doc.rect(x, Y, colW - 2, 22, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...COLOR.gris)
    doc.text(item.label, x + colW / 2 - 1, Y + 7, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...item.color)
    doc.text(item.value, x + colW / 2 - 1, Y + 17, { align: 'center' })
  })
  Y += 28

  // Barra de progreso visual
  const pctCobrado = toFloat(cobranza.monto_total) > 0
    ? montoCobrado / toFloat(cobranza.monto_total)
    : 0
  doc.setFillColor(...COLOR.grisFaint)
  doc.roundedRect(M, Y, CW, 5, 2, 2, 'F')
  if (pctCobrado > 0) {
    doc.setFillColor(...COLOR.verde)
    doc.roundedRect(M, Y, CW * pctCobrado, 5, 2, 2, 'F')
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR.gris)
  doc.text(`${pagadas} de ${cobranza.cant_cuotas} cuotas pagadas (${Math.round(pctCobrado * 100)}%)`, M, Y + 10)
  Y += 16

  // ── Tabla de cuotas ──────────────────────────────────────────────────────────
  doc.setFillColor(...COLOR.negro)
  doc.rect(M, Y, CW, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('N°', M + 4, Y + 6)
  doc.text('VENCIMIENTO', M + CW * 0.18, Y + 6)
  doc.text('MONTO', M + CW * 0.50, Y + 6)
  doc.text('ESTADO', M + CW * 0.68, Y + 6)
  doc.text('FECHA PAGO', PW - M - 4, Y + 6, { align: 'right' })
  Y += 9

  cuotas.forEach((cuota, idx) => {
    const venc    = new Date(cuota.fecha_vencimiento); venc.setHours(0, 0, 0, 0)
    const pagada  = cuota.estado === 'pagada'
    const vencida = !pagada && venc < hoy

    // Fondo de fila
    if (pagada) {
      doc.setFillColor(240, 253, 244)   // verde suave
    } else if (vencida) {
      doc.setFillColor(255, 241, 242)   // rojo suave
    } else if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 248)
    } else {
      doc.setFillColor(255, 255, 255)
    }
    doc.rect(M, Y, CW, 9, 'F')

    // N°
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR.negro)
    doc.text(String(cuota.numero_cuota), M + 4, Y + 6)

    // Vencimiento
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR.gris)
    doc.text(formatFecha(cuota.fecha_vencimiento), M + CW * 0.18, Y + 6)

    // Monto
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR.negro)
    doc.text(formatPeso(cuota.monto), M + CW * 0.50, Y + 6)

    // Estado badge (texto con color)
    if (pagada) {
      doc.setTextColor(...COLOR.verde)
      doc.text('✓ PAGADA', M + CW * 0.68, Y + 6)
    } else if (vencida) {
      doc.setTextColor(...COLOR.rojo)
      doc.text('VENCIDA', M + CW * 0.68, Y + 6)
    } else {
      doc.setTextColor(...COLOR.ambar)
      doc.text('Pendiente', M + CW * 0.68, Y + 6)
    }

    // Fecha de pago (si fue pagada)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR.gris)
    if (cuota.fecha_pago) {
      doc.text(formatFecha(cuota.fecha_pago), PW - M - 4, Y + 6, { align: 'right' })
    } else {
      doc.text('—', PW - M - 4, Y + 6, { align: 'right' })
    }

    Y += 9

    // Salto de página si se acerca al final
    if (Y > 260) {
      doc.addPage()
      Y = M + 10
    }
  })

  // Borde tabla
  doc.setDrawColor(...COLOR.grisFaint)
  doc.setLineWidth(0.3)

  Y += 10

  // ── Próxima cuota a pagar ────────────────────────────────────────────────────
  const proximaCuota = cuotas.find(c => c.estado !== 'pagada')
  if (proximaCuota) {
    const vencProxima = new Date(proximaCuota.fecha_vencimiento); vencProxima.setHours(0, 0, 0, 0)
    const estaVencida = vencProxima < hoy

    doc.setFillColor(...(estaVencida ? COLOR.rojoBg : COLOR.ambarBg))
    doc.roundedRect(M, Y, CW, 16, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...(estaVencida ? COLOR.rojo : COLOR.ambar))
    const labelProxima = estaVencida ? '⚠ Cuota vencida sin pagar:' : 'Próximo vencimiento:'
    doc.text(labelProxima, M + 6, Y + 10)
    doc.setTextColor(...COLOR.negro)
    doc.text(
      `Cuota ${proximaCuota.numero_cuota} — ${formatFechaLarga(proximaCuota.fecha_vencimiento)} — ${formatPeso(proximaCuota.monto)}`,
      M + (estaVencida ? 50 : 42),
      Y + 10
    )
    Y += 22
  } else {
    // Todas pagas
    doc.setFillColor(...COLOR.verdeBg)
    doc.roundedRect(M, Y, CW, 14, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COLOR.verde)
    doc.text('✓ Cobranza completamente cancelada', M + CW / 2, Y + 9, { align: 'center' })
    Y += 20
  }

  // ── Pie ──────────────────────────────────────────────────────────────────────
  _piePagina(doc, negocio, PW, M)

  const nombreArchivo = `comprobante-cuotas-${nroComprobante(cobranza.id)}.pdf`
  doc.save(nombreArchivo)
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPROBANTE PEDIDO (al confirmar entrega con venta)
// ─────────────────────────────────────────────────────────────────────────────
export interface DatosPedidoComprobante {
  id:          string
  descripcion: string
  fecha:       string
  total:       number
  monto_seña?: number
  tipo_pago:   'efectivo' | 'transferencia' | 'tarjeta' | 'cuotas'
  cant_cuotas?: number
  cliente: {
    nombre:    string
    telefono?: string | null
  } | null
  notas?: string | null
}

export async function generarComprobantePedido(
  pedido: DatosPedidoComprobante,
  negocio: DatosNegocio
): Promise<void> {
  const JsPDF = await getJsPDF()
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PW = 210
  const M  = 18
  const CW = PW - M * 2
  let   Y  = M

  const labelPago: Record<string, string> = {
    efectivo:      'Efectivo',
    transferencia: 'Transferencia',
    tarjeta:       'Tarjeta',
    cuotas:        'En cuotas',
  }

  // ── Encabezado ──────────────────────────────────────────────────────────────
  doc.setFillColor(...COLOR.negro)
  doc.rect(0, 0, PW, 28, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(negocio.nombre.toUpperCase(), M, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 180)
  doc.text('COMPROBANTE DE ENTREGA / PEDIDO', M, 20)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(`N° ${nroComprobante(pedido.id)}`, PW - M, 12, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 180)
  doc.text(`Fecha: ${formatFecha(pedido.fecha)}`, PW - M, 20, { align: 'right' })

  Y = 38

  // Info negocio
  const infoLineas: string[] = []
  if (negocio.cuit)          infoLineas.push(`CUIT: ${negocio.cuit}`)
  if (negocio.condicion_iva) infoLineas.push(negocio.condicion_iva)
  if (negocio.telefono)      infoLineas.push(`Tel: ${negocio.telefono}`)
  if (infoLineas.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR.gris)
    doc.text(infoLineas.join('  ·  '), M, Y)
    Y += 6
  }

  doc.setDrawColor(...COLOR.grisFaint)
  doc.line(M, Y, PW - M, Y)
  Y += 8

  // Cliente
  doc.setFillColor(...COLOR.grisBg)
  doc.roundedRect(M, Y, CW, pedido.cliente?.telefono ? 20 : 14, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR.gris)
  doc.text('CLIENTE', M + 6, Y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR.negro)
  doc.text(pedido.cliente?.nombre ?? 'Cliente', M + 6, Y + 13)
  if (pedido.cliente?.telefono) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR.gris)
    doc.text(`Tel: ${pedido.cliente.telefono}`, M + 6, Y + 19)
  }
  Y += pedido.cliente?.telefono ? 28 : 22

  // Descripción del pedido
  doc.setFillColor(...COLOR.grisBg)
  doc.roundedRect(M, Y, CW, 22, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR.gris)
  doc.text('DESCRIPCIÓN DEL PEDIDO', M + 6, Y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLOR.negro)
  const descLines = doc.splitTextToSize(pedido.descripcion, CW - 12)
  doc.text(descLines, M + 6, Y + 14)
  Y += 28

  // Monto seña si hubo
  if (pedido.monto_seña && pedido.monto_seña > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.gris)
    doc.text('Seña cobrada:', M, Y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR.negro)
    doc.text(formatPeso(pedido.monto_seña), PW - M, Y, { align: 'right' })
    Y += 8

    doc.setTextColor(...COLOR.gris)
    doc.setFont('helvetica', 'normal')
    doc.text('Saldo a cobrar:', M, Y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR.negro)
    doc.text(formatPeso(pedido.total - pedido.monto_seña), PW - M, Y, { align: 'right' })
    Y += 8

    doc.setDrawColor(...COLOR.grisFaint)
    doc.line(M, Y, PW - M, Y)
    Y += 5
  }

  // Total grande
  const totalesX = PW - M - 70
  doc.setFillColor(...COLOR.negro)
  doc.roundedRect(totalesX - 4, Y - 1, (PW - M - totalesX) + 8, 14, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL:', totalesX + 2, Y + 9)
  doc.setFontSize(14)
  doc.text(formatPeso(pedido.total), PW - M - 2, Y + 9, { align: 'right' })
  Y += 20

  // Pago
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gris)
  doc.text('Forma de pago:', M, Y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR.negro)
  let labelPagoCompleto = labelPago[pedido.tipo_pago] ?? pedido.tipo_pago
  if (pedido.tipo_pago === 'cuotas' && pedido.cant_cuotas) {
    labelPagoCompleto += ` (${pedido.cant_cuotas} cuotas de ${formatPeso(pedido.total / pedido.cant_cuotas)})`
  }
  doc.text(labelPagoCompleto, M + 34, Y)
  Y += 10

  if (pedido.notas) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR.gris)
    const notasLines = doc.splitTextToSize(`Nota: ${pedido.notas}`, CW)
    doc.text(notasLines, M, Y)
  }

  _piePagina(doc, negocio, PW, M)
  doc.save(`comprobante-pedido-${nroComprobante(pedido.id)}.pdf`)
}

// ── Pie de página compartido ──────────────────────────────────────────────────
function _piePagina(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  negocio: DatosNegocio,
  PW: number,
  M: number
) {
  const pageH = 297  // A4
  const pieY  = pageH - 16

  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.line(M, pieY - 4, PW - M, pieY - 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(156, 163, 175)

  const izq = `${negocio.nombre} — Comprobante no válido como factura legal`
  doc.text(izq, M, pieY + 2)

  const der = `Generado con Finti · ${new Date().toLocaleDateString('es-AR')}`
  doc.text(der, PW - M, pieY + 2, { align: 'right' })
}