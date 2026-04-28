'use client'

// src/components/ayuda/AyudaView.tsx
// Dos secciones:
//   1. Tutorial paso a paso para nuevos usuarios
//   2. Centro de ayuda con buscador y documentación de todos los módulos

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useOnboarding } from '@/hooks/useOnboarding'
import { Sidebar } from '@/components/shared/Sidebar'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface AyudaViewProps { usuario: UsuarioInfo }

// ── Tema (mismo sistema que el resto de Finti) ────────────────────────────────
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
    purple: '#faf5ff', purpleBorder: '#e9d5ff', purpleText: '#7c3aed',
    teal: '#f0fdfa', tealBorder: '#99f6e4', tealText: '#0d9488',
    shadow: '0 1px 4px rgba(0,0,0,0.06)', shadowMd: '0 4px 16px rgba(0,0,0,0.08)',
    navBg: 'rgba(255,255,255,0.92)',
  },
  dark: {
    bg: '#141210', surface: '#1c1916', surfaceAlt: '#211e1b',
    border: '#2e2924', borderLight: '#252019',
    text: '#e8e0d4', textMuted: '#7a6e62', textFaint: '#4a4238',
    accent: '#d4a96a', accentText: '#141210',
    green: '#0e1f12', greenBorder: '#1a3820', greenText: '#4ade80',
    amber: '#1f1a0e', amberBorder: '#3d3010', amberSub: '#a87d30',
    red: '#1f0e0e', redBorder: '#3d1010', redNum: '#f87171',
    blue: '#0e1520', blueBorder: '#1a2e50', blueText: '#60a5fa',
    purple: '#160e25', purpleBorder: '#3b1f5e', purpleText: '#a78bfa',
    teal: '#0e1f1e', tealBorder: '#1a3836', tealText: '#2dd4bf',
    shadow: '0 1px 6px rgba(0,0,0,0.4)', shadowMd: '0 4px 20px rgba(0,0,0,0.5)',
    navBg: 'rgba(20,18,16,0.95)',
  },
}
type Tema = typeof tema.light

// ── Datos del Tutorial ────────────────────────────────────────────────────────
interface Paso {
  num: number
  titulo: string
  desc: string
  chips?: { label: string; color: 'green' | 'amber' | 'blue' | 'purple' | 'teal' | 'red' }[]
  items?: { color: string; label: string; valor?: string }[]
  tip?: string
  completado?: boolean
}

const PASOS: Paso[] = [
  {
    num: 1,
    titulo: 'Bienvenido a Finti',
    desc: 'Tu ERP para emprendedores. En menos de 10 minutos vas a tener tu negocio configurado y listo para operar desde el celular o la computadora.',
    chips: [
      { label: '↗ Ventas', color: 'green' },
      { label: '◎ Cobranzas', color: 'amber' },
      { label: '▦ Stock', color: 'blue' },
      { label: '📦 Pedidos', color: 'purple' },
      { label: '📊 Costos', color: 'teal' },
      { label: '◉ Personal', color: 'red' },
    ],
    tip: 'Finti funciona como PWA — podés instalarlo en tu celular desde el navegador, sin pasar por la App Store.',
  },
  {
    num: 2,
    titulo: 'Configurá tu negocio',
    desc: 'Cargá los datos de tu negocio. Aparecen en todos los comprobantes PDF y son necesarios para la contabilidad.',
    items: [
      { color: '#4ade80', label: 'Nombre del negocio', valor: 'Tu nombre comercial' },
      { color: '#d97706', label: 'CUIT', valor: '20-12345678-9' },
      { color: '#60a5fa', label: 'Condición IVA', valor: 'Monotributo / RI' },
      { color: '#a78bfa', label: 'Teléfono y dirección', valor: 'Opcionales' },
    ],
    tip: 'Accedé desde el ícono de tu avatar en la barra lateral → "Mi perfil".',
  },
  {
    num: 3,
    titulo: 'Cargá tus productos',
    desc: 'Antes de registrar ventas, cargá tu catálogo. Podés hacerlo gradualmente, no necesitás todo desde el primer día.',
    items: [
      { color: '#4ade80', label: 'Nombre', valor: 'Remera básica T.M' },
      { color: '#d97706', label: 'Precio de venta', valor: '$8.500' },
      { color: '#60a5fa', label: 'Costo unitario', valor: '$4.200' },
      { color: '#a78bfa', label: 'Stock inicial', valor: '12 unidades' },
      { color: '#f87171', label: 'Stock mínimo', valor: '5 unidades' },
    ],
    tip: 'Con precio Y costo cargado, Finti calcula el margen automáticamente y te avisa si estás por debajo del 20%.',
  },
  {
    num: 4,
    titulo: 'Registrá tu primera venta',
    desc: 'Ir a Ventas → Nueva venta. El flujo es rápido: seleccionás el cliente, agregás productos y confirmás el cobro.',
    items: [
      { color: '#4ade80', label: '① Seleccioná o creá el cliente' },
      { color: '#d97706', label: '② Buscá y agregá productos' },
      { color: '#60a5fa', label: '③ Aplicá descuento si corresponde' },
      { color: '#a78bfa', label: '④ Elegí forma de pago' },
      { color: '#2dd4bf', label: '⑤ Si es en cuotas, definí cuántas' },
    ],
    tip: 'Si es en cuotas, Finti crea la cobranza automáticamente con todas las fechas de vencimiento.',
  },
  {
    num: 5,
    titulo: 'Seguí tus cobranzas',
    desc: 'El módulo de Cobranzas es el corazón de Finti. Acá vas a ver todo lo que te deben y cuándo vence cada cuota.',
    items: [
      { color: '#60a5fa', label: 'Cobranzas activas', valor: 'Todas las deudas pendientes' },
      { color: '#d97706', label: 'Recorrido del día', valor: 'Las cuotas que vencen hoy' },
      { color: '#f87171', label: 'Problemáticos', valor: 'Clientes con mora' },
    ],
    tip: 'Si un cliente no paga en 7 días de vencida la cuota, Finti lo marca automáticamente como problemático.',
  },
  {
    num: 6,
    titulo: 'Pedidos y entregas',
    desc: 'Para negocios con encargos: tortas, ropa a medida, muebles, etc. Llevá el ciclo completo de cada pedido.',
    items: [
      { color: '#6b7280', label: 'Recibido', valor: '→ Inicio' },
      { color: '#d97706', label: 'En elaboración', valor: '→ En proceso' },
      { color: '#4ade80', label: 'Listo', valor: '→ Para retirar' },
      { color: '#60a5fa', label: 'Entregado', valor: '→ Genera venta' },
    ],
    tip: 'Al entregar, Finti te pregunta si querés registrar la venta y el cobro automáticamente.',
  },
  {
    num: 7,
    titulo: '¡Todo listo!',
    desc: 'Ya tenés todo lo necesario para operar. El Dashboard te muestra en tiempo real el estado de tu negocio.',
    items: [
      { color: '#4ade80', label: 'Datos del negocio cargados' },
      { color: '#4ade80', label: 'Al menos un producto cargado' },
      { color: '#4ade80', label: 'Primera venta registrada' },
      { color: '#d97706', label: 'Explorar Costos y rentabilidad — Próximo' },
      { color: '#d97706', label: 'Configurar finanzas personales — Próximo' },
    ],
  },
]

// ── Datos del Centro de Ayuda ─────────────────────────────────────────────────
interface Funcion { icono: string; titulo: string; texto: string }
interface Faq { q: string; a: string }
interface Modulo {
  id: string; icon: string; name: string; sub: string; desc: string
  funciones: Funcion[]
  faqs: Faq[]
}

const MODULOS: Modulo[] = [
  {
    id: 'dashboard', icon: '⊞', name: 'Dashboard', sub: 'Vista general',
    desc: 'Panel principal con el estado de tu negocio en tiempo real.',
    funciones: [
      { icono: '💰', titulo: 'Caja del día', texto: 'Total de ventas del día con sparkline de los últimos 7 días. También muestra las ventas del mes y la cantidad de transacciones.' },
      { icono: '⏰', titulo: 'Vencimientos del día', texto: 'Monto total de cuotas que vencen hoy y cantidad de cobros pendientes. Clickeando vas directo al módulo de Cobranzas.' },
      { icono: '🚨', titulo: 'Morosos', texto: 'Monto total adeudado por clientes con mora. Se actualiza automáticamente cuando Finti detecta 7+ días de mora en una cuota impaga.' },
      { icono: '📦', titulo: 'Entregas próximas', texto: 'Pedidos más urgentes ordenados por fecha de entrega. Verde = ok, amarillo = en 1-3 días, rojo = vence hoy o atrasado.' },
      { icono: '▦', titulo: 'Stock crítico', texto: 'Productos con stock igual o menor al mínimo definido. Incluye barra de progreso visual y semáforo de color.' },
      { icono: '📊', titulo: 'Gráfico ventas vs cobros', texto: 'Gráfico de área de los últimos 7 días comparando ventas registradas con cobros efectivamente recibidos.' },
    ],
    faqs: [
      { q: '¿Con qué frecuencia se actualiza el dashboard?', a: 'El gráfico y el stock se cargan al abrir la página. Las cuotas tienen actualización en tiempo real vía Supabase Realtime: si cobrás desde otro dispositivo, se refleja automáticamente.' },
      { q: '¿Qué diferencia hay entre "caja" y "cobros"?', a: 'Caja = ventas del día (contado + en cuotas). Cobros = cuotas de cobranzas pagadas ese día. Una venta de $10.000 en 3 cuotas suma $10.000 a caja, pero solo la cuota cobrada ese día suma a cobros.' },
    ],
  },
  {
    id: 'ventas', icon: '↗', name: 'Ventas', sub: 'Registrar y consultar',
    desc: 'Módulo para registrar ventas y ver el historial del mes.',
    funciones: [
      { icono: '➕', titulo: 'Nueva venta', texto: 'Flujo completo: seleccionás cliente (o creás uno nuevo inline), agregás productos buscándolos, aplicás descuento y confirmás el pago.' },
      { icono: '👤', titulo: 'Crear cliente desde la venta', texto: 'Si el cliente no existe, hacés clic en "+ Nuevo cliente" dentro del modal. Se crea y queda seleccionado automáticamente sin interrumpir la venta.' },
      { icono: '📋', titulo: 'Venta en cuotas', texto: 'Elegís "Cuotas" como forma de pago, definís cuántas y la fecha del primer cobro. Finti genera la cobranza con todas las fechas automáticamente, haciendo click en el calendario podes modificar la fecha de cobro.' },
      { icono: '⬇', titulo: 'Comprobante PDF', texto: 'Cada venta tiene un botón ⬇ que genera un PDF con datos del negocio, del cliente, los ítems y el total. Si es en cuotas, muestra el estado de cada cuota.' },
      { icono: '📦', titulo: 'Descuento de stock automático', texto: 'Al confirmar una venta, el stock de cada producto se descuenta automáticamente. Si queda por debajo del mínimo, aparece la alerta en el Dashboard.' },
    ],
    faqs: [
      { q: '¿Puedo registrar una venta sin producto cargado en el catálogo?', a: 'Sí, podés tipear el nombre manualmente como ítem libre. Pero si lo cargás como producto, Finti puede calcular el margen y descontar el stock.' },
      { q: '¿Puedo editar o cancelar una venta?', a: 'Podés editar una venta o tambien podes eliminarla de la base de datos.' },
    ],
  },
  {
    id: 'cobranzas', icon: '◎', name: 'Cobranzas', sub: 'Cuotas y morosos',
    desc: 'Módulo central para gestionar cobros en cuotas y clientes problemáticos.',
    funciones: [
      { icono: '📋', titulo: 'Cobranzas activas', texto: 'Lista todas las cobranzas activas o vencidas. Cada card muestra el cliente, la descripción, el progreso de cuotas y los botones de acción.' },
      { icono: '🗺', titulo: 'Recorrido del día', texto: 'Vista especial con las cuotas que vencen HOY. Podés ordenarlas arrastrando el handle ≡ para organizar tu recorrido de cobro. Incluye contador de cobrado vs pendiente.' },
      { icono: '✓', titulo: 'Registrar cobro', texto: 'Hacés clic en ✓ en cualquier cuota → modal de confirmación → se registra el pago con fecha de hoy, se actualiza el contador y se puede generar el comprobante.' },
      { icono: '🚨', titulo: 'Marcar como problemático', texto: 'Botón "Marcar" en cada cobranza para indicar el motivo: no pago, no retira pedido, no responde, cheque rechazado u otro.' },
      { icono: '✓', titulo: 'Normalizar cliente', texto: 'Cuando un cliente regulariza su situación, usás "Normalizar". Finti guarda el historial anterior con prefijo [NORMALIZADO] para no perder la información.' },
      { icono: '📅', titulo: 'Editar fecha de cuota', texto: 'Si un cliente pide extender un vencimiento, hacés clic directo en la fecha de la cuota en el panel expandido y la modificás. Guarda automáticamente.' },
      { icono: '➕', titulo: 'Cobranza manual', texto: 'Podés crear cobranzas sin una venta previa: préstamos personales, fiados, deudas anteriores. Vas a "Nueva" y completás cliente, descripción, monto y cuotas.' },
    ],
    faqs: [
      { q: '¿Cuándo se marca automáticamente como moroso?', a: 'Cuando una cuota lleva 7 o más días vencida sin pagar. Ocurre al entrar al módulo de Cobranzas: Finti verifica el estado al cargar los datos.' },
      { q: '¿Un cliente moroso puede seguir pagando cuotas?', a: 'Sí, los marcados como morosos que pagaron al menos una cuota siguen en Cobranzas Activas. Solo los que no pagaron nada van directo a la tab de Problemáticos.' },
    ],
  },
  {
    id: 'clientes', icon: '👥', name: 'Clientes', sub: 'Base de clientes',
    desc: 'Gestión completa de tu cartera de clientes.',
    funciones: [
      { icono: '👤', titulo: 'Ver ficha del cliente', texto: 'Cada cliente tiene una ficha con sus datos de contacto, historial de ventas, cobranzas activas y si está marcado como moroso.' },
      { icono: '➕', titulo: 'Nuevo cliente', texto: 'Creás clientes con nombre, teléfono, zona comercial, dirección, DNI y email. El teléfono y la zona son los campos más importantes para el recorrido de cobro.' },
      { icono: '🗺', titulo: 'Zona comercial', texto: 'El campo zona_comercial te permite agrupar clientes por barrio o sector para organizar mejor tus recorridos de cobro.' },
      { icono: '📊', titulo: 'Score interno', texto: 'Campo numérico que podés usar para rankear clientes por comportamiento de pago. Útil para análisis futuros de data science.' },
    ],
    faqs: [
      { q: '¿Puedo importar clientes en masa?', a: 'Actualmente no hay importación masiva desde la UI.' },
    ],
  },
  {
    id: 'pedidos', icon: '📦', name: 'Pedidos', sub: 'Encargos y entregas',
    desc: 'Gestión de pedidos y entregas para negocios con encargos.',
    funciones: [
      { icono: '📋', titulo: 'Nuevo pedido', texto: 'Registrás: cliente, descripción, monto total, seña (opcional), fecha de entrega y si genera cobranza en cuotas. También podés agregar notas con especificaciones.' },
      { icono: '🔧', titulo: 'Avanzar estado', texto: 'Cada pedido pasa por: Recibido → En elaboración → Listo → Entregado. Usás los botones "Iniciar preparación" o "Marcar como listo" para avanzar.' },
      { icono: '📦', titulo: 'Confirmar entrega', texto: 'Al entregar, Finti te pregunta si querés registrar la venta. Si es en cuotas, crea la cobranza automáticamente.' },
      { icono: '🚨', titulo: 'Alertas de entrega', texto: 'En el topbar aparecen alertas de pedidos atrasados, para hoy y para mañana. En el Dashboard también aparece el panel de entregas próximas.' },
      { icono: '🤝', titulo: 'Señas', texto: 'Al entregar, Finti calcula el saldo restante: monto total menos la seña ya cobrada. Te muestra exactamente cuánto tenés que cobrar.' },
    ],
    faqs: [
      { q: '¿Qué pasa si cancelo un pedido?', a: 'Se marca como "Cancelado" y desaparece de la lista activa. Si habías cobrado una seña, tenés que manejarlo manualmente (devolución o nota de crédito).' },
      { q: '¿Puedo cambiar la fecha de entrega?', a: 'Actualmente no hay edición inline de fecha en la card. La opción más rápida es cancelar y volver a crear el pedido con la fecha correcta.' },
    ],
  },
  {
    id: 'stock', icon: '▦', name: 'Stock', sub: 'Inventario',
    desc: 'Control de inventario de productos terminados y materias primas.',
    funciones: [
      { icono: '📦', titulo: 'Productos', texto: 'Listado con semáforo de stock: verde = ok, amarillo = por debajo del mínimo, rojo = sin stock. Incluye barra de progreso visual y el margen calculado.' },
      { icono: '⇅', titulo: 'Ajustar stock', texto: 'El botón ⇅ abre el modal de ajuste con 5 tipos: entrada compra, entrada producción, entrada ajuste, salida merma, salida ajuste.' },
      { icono: '🏭', titulo: 'Materias primas', texto: 'Tab separada para emprendedores que fabrican sus propios productos. Registrás insumos con unidad de medida, costo por unidad y stock.' },
      { icono: '🛒', titulo: 'Registrar compra de MP', texto: 'Al registrar una compra, Finti actualiza el stock Y el costo por unidad. Esto dispara el recálculo de costos de todos los productos que usan esa MP.' },
      { icono: '📋', titulo: 'Historial de movimientos', texto: 'Muestra todos los movimientos de los últimos 30 días. Filtrable por hoy, esta semana o último mes.' },
    ],
    faqs: [
      { q: '¿Cómo se descuenta el stock cuando vendo?', a: 'Automáticamente al confirmar una venta. Si el producto tiene receta definida en el módulo Costos, también se descuentan las materias primas correspondientes.' },
      { q: '¿Qué es el stock mínimo?', a: 'El número a partir del cual Finti te avisa que necesitás reponer. Definilo según tu ritmo de ventas para evitar quedarte sin stock.' },
    ],
  },
  {
    id: 'costos', icon: '📊', name: 'Costos', sub: 'Rentabilidad',
    desc: 'Análisis de márgenes, simulador de precios, combos y gastos fijos.',
    funciones: [
      { icono: '📊', titulo: 'Rentabilidad', texto: 'Lista todos los productos ordenados por menor margen primero. Ves precio, costo total (producción + envío + embalaje) y la ganancia por unidad y del mes.' },
      { icono: '🎛', titulo: 'Simulador de precio', texto: 'Seleccionás un producto, movés el slider y Finti muestra en tiempo real el margen: verde ≥40%, amarillo 20-40%, rojo <20%.' },
      { icono: '🎁', titulo: 'Combos', texto: 'Creás combos de productos. Finti calcula automáticamente el costo real sumando los costos de sus componentes.' },
      { icono: '📋', titulo: 'Gastos fijos', texto: 'Registrás gastos del mes (alquiler, sueldos, servicios). Finti calcula el punto de equilibrio: cuántas ventas necesitás para cubrir todos los costos.' },
      { icono: '🧪', titulo: 'Recetas de fabricación', texto: 'Definís recetas con sus ingredientes. Cuando sube el costo de un insumo, los costos de todos los productos que lo usan se recalculan solos.' },
    ],
    faqs: [
      { q: '¿Qué es el punto de equilibrio?', a: 'La cantidad mínima de ventas para cubrir todos los gastos fijos del mes. Si vendés menos que eso, el negocio pierde dinero aunque cada venta tenga margen positivo.' },
      { q: '¿Por qué algunos productos aparecen como "sin costo"?', a: 'Porque no tienen cargado el campo costo_unitario. Finti igual los muestra en la lista, marcados con un badge morado para que los completes.' },
    ],
  },
  {
    id: 'personal', icon: '◉', name: 'Finanzas personales', sub: 'Tus $',
    desc: 'Separá las finanzas del negocio de las tuyas personales.',
    funciones: [
      { icono: '💰', titulo: 'Ingresos personales', texto: 'Registrás ingresos por categoría: retiro del negocio, sueldo, freelance, alquiler, otros. Permite calcular cuánto dependés del negocio.' },
      { icono: '💸', titulo: 'Gastos personales', texto: 'Registrás gastos por categoría: vivienda, alimentación, transporte, salud, educación, ocio, otros. Podés marcarlos como recurrentes.' },
      { icono: '📋', titulo: 'Presupuesto mensual', texto: 'Definís un límite por categoría. Si lo superás, aparece una alerta con barra roja. Finti te avisa en el header del módulo.' },
      { icono: '🎯', titulo: 'Metas de ahorro', texto: 'Creás metas con nombre, monto objetivo y fecha. Vas abonando y Finti muestra el progreso con barra y porcentaje.' },
      { icono: '📊', titulo: 'Dependencia del negocio', texto: 'Muestra qué porcentaje de tus ingresos totales vienen del negocio. Útil para diversificar fuentes de ingreso.' },
    ],
    faqs: [
      { q: '¿Los datos de finanzas personales son separados del negocio?', a: 'Sí. Las tablas de ingresos, gastos, presupuesto y metas estan separados del resto de la base de datos. Esto te permite tener un control claro de tus finanzas personales sin mezclarlo con las operaciones del negocio.' },
    ],
  },
  {
    id: 'contable', icon: '◒', name: 'Contable', sub: 'Estados financieros',
    desc: 'Estados financieros completos y exportación a Excel y PDF para tu contador.',
    funciones: [
      { icono: '📊', titulo: 'Estado de resultados', texto: 'Ventas brutas → descuentos → ventas netas → costo de ventas → utilidad bruta → gastos operativos → resultado neto (EBIT). Con márgenes en porcentaje.' },
      { icono: '💧', titulo: 'Flujo de efectivo', texto: 'Entradas (cobros al contado + cobros de cuotas) vs salidas (gastos + compras de MP). Muestra el flujo neto con indicador positivo/negativo.' },
      { icono: '⚖️', titulo: 'Balance general', texto: 'Activo (caja, cuentas a cobrar, inventario, bienes de uso) vs Pasivo + Patrimonio neto. Incluye verificación de la ecuación contable.' },
      { icono: '🏭', titulo: 'Activos fijos', texto: 'Registrás bienes de uso (vehículo, maquinaria, tecnología) con o sin depreciación lineal. Finti calcula la cuota mensual y el valor libro actual automáticamente.' },
      { icono: '📒', titulo: 'Libro diario', texto: 'Asientos automáticos generados por tus ventas, cobros y compras de MP. Podés filtrar por tipo y buscar por descripción.' },
      { icono: '⬇', titulo: 'Exportar', texto: 'Exportación a Excel (.xlsx) compatible con cualquier sistema contable, o PDF para tu contador. Podés exportar cada módulo o todo junto.' },
    ],
    faqs: [
      { q: '¿Los datos contables son en tiempo real?', a: 'Sí, se basan en vistas SQL de Supabase que calculan todo en tiempo real. No hay que ingresar datos adicionales: salen de tus ventas, cobros y gastos.' },
      { q: '¿Qué es la depreciación lineal?', a: 'El valor de compra se divide en partes iguales a lo largo de la vida útil. Por ejemplo: moto de $3.000.000 con vida útil 60 meses → $50.000/mes de depreciación.' },
    ],
  },
]

// ── Componentes del Tutorial ──────────────────────────────────────────────────
function Chip({ label, color, t }: { label: string; color: string; t: Tema }) {
  const colores: Record<string, { bg: string; text: string; border: string }> = {
    green:  { bg: t.green,  text: t.greenText,  border: t.greenBorder },
    amber:  { bg: t.amber,  text: t.amberSub,   border: t.amberBorder },
    blue:   { bg: t.blue,   text: t.blueText,   border: t.blueBorder },
    purple: { bg: t.purple, text: t.purpleText, border: t.purpleBorder },
    teal:   { bg: t.teal,   text: t.tealText,   border: t.tealBorder },
    red:    { bg: t.red,    text: t.redNum,     border: t.redBorder },
  }
  const c = colores[color] ?? colores.green
  return (
    <span style={{
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {label}
    </span>
  )
}

function MiniRow({ color, label, valor, t }: { color: string; label: string; valor?: string; t: Tema }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 0', borderBottom: `1px solid ${t.borderLight}`,
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: t.textMuted, flex: 1 }}>{label}</span>
      {valor && <span style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: "'DM Mono', monospace" }}>{valor}</span>}
    </div>
  )
}

function TipBox({ texto, t }: { texto: string; t: Tema }) {
  return (
    <div style={{
      background: t.amber, border: `1px solid ${t.amberBorder}`,
      borderRadius: 10, padding: '10px 14px',
      fontSize: 12, color: t.amberSub, marginTop: 14, lineHeight: 1.6,
    }}>
      <strong>Tip:</strong> {texto}
    </div>
  )
}

function PasoCard({ paso, t }: { paso: Paso; t: Tema }) {
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 16, padding: '18px 20px', boxShadow: t.shadow,
    }}>
      {/* Chips */}
      {paso.chips && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
          {paso.chips.map(c => <Chip key={c.label} label={c.label} color={c.color} t={t} />)}
        </div>
      )}

      {/* Items */}
      {paso.items && (
        <div style={{
          background: t.surfaceAlt, border: `1px solid ${t.border}`,
          borderRadius: 10, padding: '4px 14px', marginTop: 10,
        }}>
          {paso.items.map((it, i) => (
            <MiniRow key={i} color={it.color} label={it.label} valor={it.valor} t={t} />
          ))}
        </div>
      )}

      {/* Último paso: checklist visual */}
      {paso.num === 7 && (
        <div style={{
          background: t.green, border: `1px solid ${t.greenBorder}`,
          borderRadius: 10, padding: '12px 16px', marginTop: 14,
          fontSize: 13, color: t.greenText, fontWeight: 600, textAlign: 'center',
        }}>
          Visitá el Centro de Ayuda para ver todas las funciones en detalle.
        </div>
      )}

      {paso.tip && <TipBox texto={paso.tip} t={t} />}
    </div>
  )
}

// ── Tutorial ──────────────────────────────────────────────────────────────────
function Tutorial({ t, onCompletado, isMobile }: { t: Tema; onCompletado: () => void; isMobile: boolean }) {
  const { pasoActual, setPasoActual, marcarCompletado } = useOnboarding()
  const totalPasos = PASOS.length
  const paso = PASOS[pasoActual]
  const pct = Math.round(((pasoActual + 1) / totalPasos) * 100)

  const siguiente = () => {
    if (pasoActual < totalPasos - 1) { setPasoActual(pasoActual + 1) }
    else { marcarCompletado(); onCompletado() }
  }
  const anterior = () => { if (pasoActual > 0) setPasoActual(pasoActual - 1) }

  const contenidoPaso = (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {PASOS.map((_, i) => (
          <div key={i} onClick={() => setPasoActual(i)} style={{
            width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
            background: i === pasoActual ? t.accent : t.border, transition: 'background .25s',
          }} />
        ))}
      </div>

      <div style={{ height: 3, borderRadius: 2, background: t.border, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: t.accent, borderRadius: 2, transition: 'width .4s ease' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9, background: t.accent,
          color: t.accentText, fontSize: 12, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {paso.num === 7 ? '✓' : paso.num}
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: t.text, letterSpacing: '-.3px' }}>
          {paso.titulo}
        </h2>
      </div>

      <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, marginBottom: 20, paddingLeft: 42 }}>
        {paso.desc}
      </p>

      <PasoCard paso={paso} t={t} />

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        {pasoActual > 0 && (
          <button onClick={anterior} style={{
            flex: 1, padding: 12, borderRadius: 12,
            border: `1.5px solid ${t.border}`, background: t.surfaceAlt,
            color: t.textMuted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>← Anterior</button>
        )}
        <button onClick={siguiente} style={{
          flex: 2, padding: 12, borderRadius: 12, border: 'none',
          background: t.accent, color: t.accentText,
          fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {pasoActual === totalPasos - 1 ? '¡Ir al Centro de Ayuda!' : 'Siguiente →'}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: t.textFaint }}>
        Paso {pasoActual + 1} de {totalPasos}
      </div>
    </>
  )

  // ── Mobile: sin panel lateral ─────────────────────────────────────────────
  if (isMobile) {
    return <div style={{ padding: '20px 16px' }}>{contenidoPaso}</div>
  }

  // ── Desktop: dos columnas con panel lateral de progreso ───────────────────
  return (
    <div style={{ padding: '24px 28px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>

      <div style={{ flex: 1, minWidth: 0, maxWidth: 560 }}>
        {contenidoPaso}
      </div>

      <div style={{
        width: 210, flexShrink: 0, position: 'sticky', top: 24,
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 14, padding: '16px', boxShadow: t.shadow,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.textFaint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
          Progreso del tutorial
        </div>
        {PASOS.map((p, i) => {
          const esActual   = i === pasoActual
          const completado = i < pasoActual
          return (
            <div key={i} onClick={() => setPasoActual(i)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
              background: esActual ? t.surfaceAlt : 'transparent',
              marginBottom: 2, transition: 'background .12s',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800,
                background: completado ? t.green : esActual ? t.accent : t.border,
                color: completado ? t.greenText : esActual ? t.accentText : t.textFaint,
                border: completado ? `1px solid ${t.greenBorder}` : 'none',
              }}>
                {completado ? '✓' : p.num}
              </div>
              <span style={{
                fontSize: 11, fontWeight: esActual ? 700 : 400,
                color: esActual ? t.text : completado ? t.textMuted : t.textFaint,
                lineHeight: 1.3,
              }}>
                {p.titulo}
              </span>
            </div>
          )
        })}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: t.textFaint }}>Completado</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.accent }}>{pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: t.border, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: t.accent, borderRadius: 2, transition: 'width .4s ease' }} />
          </div>
        </div>
      </div>

    </div>
  )
}
// ── Centro de Ayuda ───────────────────────────────────────────────────────────
function CentroAyuda({ t }: { t: Tema }) {
  const [busqueda, setBusqueda] = useState('')
  const [moduloActivo, setModuloActivo] = useState<Modulo | null>(null)
  const [funcionesAbiertas, setFuncionesAbiertas] = useState<Set<number>>(new Set())
  const [faqsAbiertas, setFaqsAbiertas] = useState<Set<number>>(new Set())

  // Volver arriba al cambiar de módulo
  useEffect(() => {
    setFuncionesAbiertas(new Set())
    setFaqsAbiertas(new Set())
  }, [moduloActivo])

  const toggleFuncion = (i: number) => {
    setFuncionesAbiertas(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }
  const toggleFaq = (i: number) => {
    setFaqsAbiertas(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  // Resultados de búsqueda
  interface Resultado extends Funcion { moduloName: string; moduloIcon: string }
  const resultados: Resultado[] = busqueda.trim().length > 1
    ? MODULOS.flatMap(m =>
        m.funciones
          .filter(f =>
            f.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
            f.texto.toLowerCase().includes(busqueda.toLowerCase()) ||
            m.name.toLowerCase().includes(busqueda.toLowerCase())
          )
          .map(f => ({ ...f, moduloName: m.name, moduloIcon: m.icon }))
      )
    : []

  const inputStyle: React.CSSProperties = {
    border: 'none', background: 'transparent', fontSize: 13,
    color: t.text, flex: 1, outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  }

  // Vista de detalle del módulo
  if (moduloActivo) {
    return (
      <div style={{ padding: '20px 28px' }}>
        {/* Back */}
        <button
          onClick={() => setModuloActivo(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: t.textMuted, cursor: 'pointer',
            background: 'none', border: 'none', fontFamily: 'inherit',
            marginBottom: 18, padding: 0,
          }}
        >
          ← Todos los módulos
        </button>

        {/* Header módulo */}
        <div style={{
          background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 16, padding: '18px 20px', marginBottom: 14, boxShadow: t.shadow,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>{moduloActivo.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{moduloActivo.name}</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{moduloActivo.desc}</div>
            </div>
          </div>
        </div>

        {/* Funciones */}
        <div style={{
          background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 14, overflow: 'hidden', marginBottom: 14,
        }}>
          {moduloActivo.funciones.map((f, i) => (
            <div
              key={i}
              onClick={() => toggleFuncion(i)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: i < moduloActivo.funciones.length - 1 ? `1px solid ${t.borderLight}` : 'none',
                background: funcionesAbiertas.has(i) ? t.surfaceAlt : 'transparent',
                transition: 'background .12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{f.icono}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.text, flex: 1 }}>{f.titulo}</span>
                <span style={{ fontSize: 11, color: t.textFaint, flexShrink: 0 }}>
                  {funcionesAbiertas.has(i) ? '−' : '+'}
                </span>
              </div>
              {funcionesAbiertas.has(i) && (
                <p style={{ fontSize: 12, color: t.textMuted, marginTop: 8, lineHeight: 1.6, paddingLeft: 24 }}>
                  {f.texto}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* FAQs */}
        {moduloActivo.faqs.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.textFaint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              Preguntas frecuentes
            </div>
            {moduloActivo.faqs.map((faq, i) => (
              <div
                key={i}
                onClick={() => toggleFaq(i)}
                style={{
                  border: `1px solid ${t.border}`, borderRadius: 10,
                  padding: '11px 14px', marginBottom: 8, cursor: 'pointer',
                  background: faqsAbiertas.has(i) ? t.surfaceAlt : t.surface,
                  transition: 'background .12s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{faq.q}</div>
                {faqsAbiertas.has(i) && (
                  <p style={{ fontSize: 11, color: t.textMuted, marginTop: 8, lineHeight: 1.6 }}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      {/* Buscador */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: t.surfaceAlt, border: `1.5px solid ${t.border}`,
        borderRadius: 11, padding: '10px 14px', marginBottom: 20,
      }}>
        <span style={{ fontSize: 14, color: t.textFaint }}>🔍</span>
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar función, módulo, concepto..."
          style={inputStyle}
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: 14, padding: 0 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Resultados de búsqueda */}
      {busqueda.trim().length > 1 && (
        <div>
          {resultados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: t.textFaint }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textMuted }}>Sin resultados para "{busqueda}"</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Probá con el nombre del módulo o una acción</div>
            </div>
          ) : (
            <div style={{
              background: t.surface, border: `1px solid ${t.border}`,
              borderRadius: 14, overflow: 'hidden',
            }}>
              {resultados.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '11px 16px', display: 'flex', alignItems: 'flex-start', gap: 10,
                    borderBottom: i < resultados.length - 1 ? `1px solid ${t.borderLight}` : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const m = MODULOS.find(x => x.name === r.moduloName)
                    if (m) { setModuloActivo(m); setBusqueda('') }
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{r.icono}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{r.titulo}</div>
                    <div style={{ fontSize: 10, color: t.textFaint }}>{r.moduloIcon} {r.moduloName}</div>
                  </div>
                  <span style={{ fontSize: 11, color: t.textFaint }}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid de módulos */}
      {busqueda.trim().length <= 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {MODULOS.map(m => (
            <div
              key={m.id}
              onClick={() => setModuloActivo(m)}
              style={{
                background: t.surface, border: `1px solid ${t.border}`,
                borderRadius: 13, padding: '14px', cursor: 'pointer',
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = t.accent}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = t.border}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{m.name}</div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── VIEW PRINCIPAL ────────────────────────────────────────────────────────────
export function AyudaView({ usuario }: AyudaViewProps) {
  const [dark, setDark] = useDarkMode()
  const [isMobile, setIsMobile] = useState(false)
  const [tabActiva, setTabActiva] = useState<'tutorial' | 'ayuda'>('tutorial')
  const { reiniciarTutorial } = useOnboarding()
  const router = useRouter()

  const t = dark ? tema.dark : tema.light

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sidebar = (
    <Sidebar
      activo={'dashboard' as const}
      usuario={usuario}
      dark={dark}
      setDark={setDark}
      t={t}
    />
  )

  const content = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Topbar */}
      <div style={{
        height: 54, background: t.surface, borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0,
      }}>
        {isMobile && (
          <button
            onClick={() => router.push('/dashboard')}
            style={{ marginRight: 12, background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18 }}
          >
            ←
          </button>
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Ayuda</div>
          <div style={{ fontSize: 10, color: t.textMuted }}>Tutorial de inicio y centro de ayuda</div>
        </div>
        {/* Botón reiniciar tutorial */}
        <button
          onClick={() => { reiniciarTutorial(); setTabActiva('tutorial') }}
          title="Reiniciar tutorial desde el paso 1"
          style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 9,
            border: `1.5px solid ${t.border}`, background: t.surfaceAlt,
            color: t.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ↺ Reiniciar tutorial
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, background: t.surface,
        borderBottom: `1px solid ${t.border}`, padding: '0 20px', flexShrink: 0,
      }}>
        {([
          { key: 'tutorial', label: 'Tutorial de inicio' },
          { key: 'ayuda', label: 'Centro de ayuda' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setTabActiva(tab.key)}
            style={{
              padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: 'none', background: 'transparent', fontFamily: 'inherit',
              color: tabActiva === tab.key ? t.accent : t.textMuted,
              borderBottom: `2px solid ${tabActiva === tab.key ? t.accent : 'transparent'}`,
              transition: 'all .15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto', background: t.bg, paddingBottom: isMobile ? 80 : 20 }}>
        {tabActiva === 'tutorial' && (
          <Tutorial t={t} onCompletado={() => setTabActiva('ayuda')} isMobile={isMobile} />
        )}
        {tabActiva === 'ayuda' && (
          <CentroAyuda t={t} />
        )}
      </div>

      {/* Bottom nav mobile */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: t.navBg, backdropFilter: 'blur(16px)',
          borderTop: `1px solid ${t.border}`, padding: '10px 0 20px',
          display: 'flex', justifyContent: 'space-around', zIndex: 50,
        }}>
          {([
            ['⊞', 'Inicio', '/dashboard'],
            ['↗', 'Ventas', '/ventas'],
            ['◎', 'Cobros', '/cobranzas'],
            ['▦', 'Stock', '/stock'],
            ['?', 'Ayuda', '/ayuda'],
          ] as const).map(([icon, label, href]) => (
            <div
              key={label}
              onClick={() => router.push(href)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}
            >
              <div style={{ fontSize: 18, color: label === 'Ayuda' ? t.accent : t.textFaint }}>{icon}</div>
              <div style={{ fontSize: 9, color: label === 'Ayuda' ? t.accent : t.textFaint, fontWeight: label === 'Ayuda' ? 700 : 400 }}>{label}</div>
              {label === 'Ayuda' && <div style={{ width: 4, height: 4, borderRadius: '50%', background: t.accent }} />}
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
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#33302a;border-radius:4px;}
      `}</style>
      <div style={{
        height: '100vh', display: 'flex', background: t.bg,
        fontFamily: "'DM Sans', system-ui, sans-serif", overflow: 'hidden',
      }}>
        {!isMobile && sidebar}
        {content}
      </div>
    </>
  )
}