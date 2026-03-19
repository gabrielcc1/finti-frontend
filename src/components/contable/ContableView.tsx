'use client'

// src/components/contable/ContableView.tsx
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Sidebar } from '@/components/shared/Sidebar'
import type { useContable, EstadoResultados, FlujoEfectivo, BalanceGeneral, AsientoDiario, CambioPatrimonio, ActivoFijo, NuevoActivoData } from '@/hooks/useContable'

interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface ContableViewProps { usuario: UsuarioInfo; contable: ReturnType<typeof useContable> }

const toFloat = (v: unknown) => parseFloat(String(v ?? 0)) || 0
const fmt  = (n: number) => `$${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtN = (n: number) => n < 0 ? `(${fmt(n)})` : fmt(n)
const fmtPct = (n: number) => `${n.toFixed(1)}%`
const fmtPeriodo = (s: string) => {
  if (!s) return '—'
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

const tema = {
  light: {
    bg:'#fafaf8', surface:'#ffffff', surfaceAlt:'#f5f5f2', border:'#e8e8e4', borderLight:'#f0f0ec',
    text:'#111827', textMuted:'#6b7280', textFaint:'#9ca3af',
    accent:'#111827', accentText:'#ffffff',
    red:'#fff1f2', redNum:'#dc2626',
    green:'#f0fdf4', greenNum:'#16a34a',
    blue:'#eff6ff', blueNum:'#2563eb',
    amber:'#fffbeb', amberSub:'#d97706',
    navBg:'rgba(255,255,255,0.92)', shadow:'0 1px 4px rgba(0,0,0,0.06)', shadowMd:'0 4px 16px rgba(0,0,0,0.08)',
    skeletonBase:'#ebebeb', skeletonShine:'#f5f5f5',
    headerBg: '#f8f7f4',
    rowAlt: '#fafaf8',
  },
  dark: {
    bg:'#141210', surface:'#1c1916', surfaceAlt:'#211e1b', border:'#2e2924', borderLight:'#252019',
    text:'#e8e0d4', textMuted:'#7a6e62', textFaint:'#4a4238',
    accent:'#d4a96a', accentText:'#141210',
    red:'#1f0e0e', redNum:'#f87171',
    green:'#0e1f12', greenNum:'#4ade80',
    blue:'#0e1520', blueNum:'#60a5fa',
    amber:'#1f1a0e', amberSub:'#a87d30',
    navBg:'rgba(20,18,16,0.95)', shadow:'0 1px 6px rgba(0,0,0,0.4)', shadowMd:'0 4px 20px rgba(0,0,0,0.5)',
    skeletonBase:'#211e1b', skeletonShine:'#2e2924',
    headerBg: '#1a1714',
    rowAlt: '#1e1b18',
  },
}
type Tema = typeof tema.light

// Helpers de estilo para inputs y labels (usados en modales de activos)
const inp = (t: Tema): React.CSSProperties => ({
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: `1.5px solid ${t.border}`, background: t.surfaceAlt,
  color: t.text, fontSize: 13, outline: 'none',
  fontFamily: "'DM Sans',system-ui,sans-serif",
})
const lbl = (t: Tema) => ({
  fontSize: 11, fontWeight: 600 as const, color: t.textMuted,
  marginBottom: 4, display: 'block' as const,
})

function Sk({ h=16, radius=6, t }: { h?: number; radius?: number; t: Tema }) {
  return (
    <div style={{ height:h, borderRadius:radius, background:t.skeletonBase, overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg,transparent,${t.skeletonShine},transparent)`, animation:'shimmer 1.4s infinite' }} />
    </div>
  )
}

// ── Selector de período ────────────────────────────────────────────────────
function SelectorPeriodo({ periodos, actual, onChange, t }: { periodos: string[]; actual: string; onChange: (p: string) => void; t: Tema }) {
  if (periodos.length === 0) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ fontSize:11, color:t.textFaint }}>Período:</span>
      <select value={actual} onChange={e=>onChange(e.target.value)}
        style={{ padding:'5px 10px', borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.text, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
        {periodos.map(p => <option key={p} value={p}>{fmtPeriodo(p)}</option>)}
      </select>
    </div>
  )
}

// ── Fila de estado contable ────────────────────────────────────────────────
function FilaEstado({ label, valor, nivel=0, negrita=false, total=false, color, t }: {
  label: string; valor: number; nivel?: number; negrita?: boolean; total?: boolean; color?: string; t: Tema
}) {
  const indent = nivel * 16
  const c = color ?? (total ? t.text : valor < 0 ? t.redNum : t.text)
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 16px', paddingLeft: 16 + indent, borderTop: total ? `1px solid ${t.border}` : 'none', marginTop: total ? 4 : 0, background: total ? t.surfaceAlt : 'transparent' }}>
      <span style={{ fontSize: total ? 13 : 12, fontWeight: (negrita || total) ? 700 : 400, color: total ? t.text : t.textMuted }}>{label}</span>
      <span style={{ fontSize: total ? 14 : 12, fontWeight: (negrita || total) ? 800 : 500, fontFamily:'monospace', color: c }}>{fmtN(valor)}</span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: ESTADO DE RESULTADOS
// ══════════════════════════════════════════════════════════════════════════════
function TabResultados({ contable, t }: { contable: ReturnType<typeof useContable>; t: Tema }) {
  const r = contable.resultadoActual
  if (contable.loading) return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{[1,2,3,4,5].map(i=><Sk key={i} h={44} t={t} />)}</div>
  if (!r) return <EmptyState icon="📊" titulo="Sin datos de ventas" sub="Registrá ventas para generar el estado de resultados" t={t} />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:560 }}>
      <SelectorPeriodo periodos={contable.periodos} actual={contable.periodoSel} onChange={contable.setPeriodoSel} t={t} />

      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, overflow:'hidden', boxShadow:t.shadow }}>
        {/* Header */}
        <div style={{ padding:'14px 16px', background:t.headerBg, borderBottom:`1px solid ${t.border}` }}>
          <div style={{ fontSize:14, fontWeight:800, color:t.text }}>Estado de Resultados</div>
          <div style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>Período: {fmtPeriodo(r.periodo)}</div>
        </div>

        <div style={{ paddingTop:8, paddingBottom:8 }}>
          <div style={{ padding:'4px 16px 8px', fontSize:10, fontWeight:700, color:t.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>Ingresos</div>
          <FilaEstado label="Ventas brutas"   valor={r.ingresos_ventas}    nivel={1} t={t} />
          <FilaEstado label="(-) Descuentos"  valor={-r.descuentos}        nivel={1} t={t} />
          <FilaEstado label="Ventas netas"    valor={r.ventas_netas}       total     t={t} />

          <div style={{ padding:'12px 16px 8px', fontSize:10, fontWeight:700, color:t.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>Costos</div>
          <FilaEstado label="(-) Costo de ventas"  valor={-r.costo_ventas} nivel={1} t={t} />
          <FilaEstado label="Utilidad bruta"        valor={r.utilidad_bruta} total color={r.utilidad_bruta >= 0 ? t.greenNum : t.redNum} t={t} />
          <div style={{ padding:'4px 16px 2px', textAlign:'right' }}>
            <span style={{ fontSize:10, color:t.textFaint }}>Margen bruto: </span>
            <span style={{ fontSize:11, fontWeight:700, color: r.margen_bruto_pct >= 30 ? t.greenNum : t.amberSub }}>{fmtPct(r.margen_bruto_pct)}</span>
          </div>

          <div style={{ padding:'12px 16px 8px', fontSize:10, fontWeight:700, color:t.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>Gastos operativos</div>
          <FilaEstado label="(-) Gastos del período" valor={-r.gastos_operativos} nivel={1} t={t} />
          <FilaEstado
            label="Utilidad operativa (EBIT)"
            valor={r.utilidad_operativa}
            total
            color={r.utilidad_operativa >= 0 ? t.greenNum : t.redNum}
            t={t}
          />
          <div style={{ padding:'4px 16px 12px', textAlign:'right' }}>
            <span style={{ fontSize:10, color:t.textFaint }}>Margen operativo: </span>
            <span style={{ fontSize:11, fontWeight:700, color: r.margen_operativo_pct >= 15 ? t.greenNum : r.margen_operativo_pct >= 0 ? t.amberSub : t.redNum }}>{fmtPct(r.margen_operativo_pct)}</span>
          </div>
        </div>
      </div>

      {/* Indicadores */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        {[
          { label:'Ventas netas',    value: fmt(r.ventas_netas),    color: t.text },
          { label:'Utilidad bruta',  value: fmtN(r.utilidad_bruta), color: r.utilidad_bruta >= 0 ? t.greenNum : t.redNum },
          { label:'Resultado neto',  value: fmtN(r.utilidad_operativa), color: r.utilidad_operativa >= 0 ? t.greenNum : t.redNum },
        ].map((k,i) => (
          <div key={i} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'11px 14px', boxShadow:t.shadow }}>
            <div style={{ fontSize:9, color:t.textFaint, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>{k.label}</div>
            <div style={{ fontSize:15, fontWeight:800, fontFamily:'monospace', color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: FLUJO DE EFECTIVO
// ══════════════════════════════════════════════════════════════════════════════
function TabFlujo({ contable, t }: { contable: ReturnType<typeof useContable>; t: Tema }) {
  const f = contable.flujoActual
  if (contable.loading) return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{[1,2,3,4].map(i=><Sk key={i} h={50} t={t} />)}</div>
  if (!f) return <EmptyState icon="💧" titulo="Sin datos de flujo" sub="Registrá ventas y gastos para generar el flujo de efectivo" t={t} />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:560 }}>
      <SelectorPeriodo periodos={contable.periodos} actual={contable.periodoSel} onChange={contable.setPeriodoSel} t={t} />

      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, overflow:'hidden', boxShadow:t.shadow }}>
        <div style={{ padding:'14px 16px', background:t.headerBg, borderBottom:`1px solid ${t.border}` }}>
          <div style={{ fontSize:14, fontWeight:800, color:t.text }}>Estado de Flujo de Efectivo</div>
          <div style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>Período: {fmtPeriodo(f.periodo)}</div>
        </div>

        <div style={{ paddingTop:8, paddingBottom:8 }}>
          <div style={{ padding:'4px 16px 8px', fontSize:10, fontWeight:700, color:t.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>Actividades operativas — Entradas</div>
          <FilaEstado label="Ventas cobradas al contado"  valor={f.cobros_contado}     nivel={1} color={t.greenNum} t={t} />
          <FilaEstado label="Cobros de cuotas"            valor={f.cobros_cuotas}      nivel={1} color={t.greenNum} t={t} />
          <FilaEstado label="Total entradas"              valor={f.total_entradas}      total color={t.greenNum} t={t} />

          <div style={{ padding:'12px 16px 8px', fontSize:10, fontWeight:700, color:t.textFaint, textTransform:'uppercase', letterSpacing:'0.06em' }}>Actividades operativas — Salidas</div>
          <FilaEstado label="(-) Gastos operativos pagados" valor={-f.egresos_gastos}      nivel={1} t={t} />
          <FilaEstado label="(-) Compras de insumos/MP"     valor={-f.egresos_compras_mp}  nivel={1} t={t} />
          <FilaEstado label="Total salidas"                  valor={-f.total_salidas}        total t={t} />

          <div style={{ height:8 }} />
          <FilaEstado
            label="FLUJO NETO DEL PERÍODO"
            valor={f.flujo_neto}
            total negrita
            color={f.flujo_neto >= 0 ? t.greenNum : t.redNum}
            t={t}
          />
          <div style={{ padding:'4px 16px 12px', textAlign:'right' }}>
            <span style={{ fontSize:11, color: f.flujo_neto >= 0 ? t.greenNum : t.redNum, fontWeight:700 }}>
              {f.flujo_neto >= 0 ? '✓ Flujo positivo — generás más de lo que gastás' : '⚠ Flujo negativo — revisá gastos'}
            </span>
          </div>
        </div>
      </div>

      {/* Barras comparativas */}
      {contable.flujos.length > 1 && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 16px', boxShadow:t.shadow }}>
          <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:12 }}>Flujo neto histórico</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {contable.flujos.slice(0,6).map(f => {
              const max = Math.max(...contable.flujos.map(x => Math.abs(x.flujo_neto)), 1)
              const pct = (Math.abs(f.flujo_neto) / max) * 100
              return (
                <div key={f.periodo} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:10, color:t.textMuted, width:80, flexShrink:0 }}>{fmtPeriodo(f.periodo).split(' ')[0]}</span>
                  <div style={{ flex:1, height:6, borderRadius:3, background:t.border, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background: f.flujo_neto >= 0 ? t.greenNum : t.redNum, borderRadius:3 }} />
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace', color: f.flujo_neto >= 0 ? t.greenNum : t.redNum, width:80, textAlign:'right', flexShrink:0 }}>{fmtN(f.flujo_neto)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: BALANCE GENERAL
// ══════════════════════════════════════════════════════════════════════════════
function TabBalance({ contable, t }: { contable: ReturnType<typeof useContable>; t: Tema }) {
  const b = contable.balance
  if (contable.loading) return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{[1,2,3,4,5].map(i=><Sk key={i} h={44} t={t} />)}</div>
  if (!b) return <EmptyState icon="⚖️" titulo="Sin datos" sub="No hay información suficiente para generar el balance" t={t} />

  const ecuacion = Math.abs(b.total_activo - (b.total_pasivo + b.patrimonio_neto))
  const balanceado = ecuacion < 1 // tolerancia $1

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:560 }}>
      <div style={{ fontSize:11, color:t.textFaint }}>Al {new Date(b.fecha_balance + 'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' })}</div>

      {/* Activo */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, overflow:'hidden', boxShadow:t.shadow }}>
        <div style={{ padding:'12px 16px', background:t.headerBg, borderBottom:`1px solid ${t.border}` }}>
          <div style={{ fontSize:13, fontWeight:800, color:t.text }}>ACTIVO</div>
        </div>
        <div style={{ paddingTop:8, paddingBottom:8 }}>
          <div style={{ padding:'4px 16px 6px', fontSize:10, fontWeight:700, color:t.textFaint, textTransform:'uppercase' }}>Activo corriente</div>
          <FilaEstado label="Caja y Bancos (estimada)"          valor={b.caja_estimada}   nivel={1} t={t} />
          <FilaEstado label="Cuentas a Cobrar (cuotas pend.)"   valor={b.cuentas_cobrar}  nivel={1} t={t} />
          <FilaEstado label="Inventario valorizado"              valor={b.inventario}      nivel={1} t={t} />
          <FilaEstado label="Total activo corriente"             valor={b.total_activo_corriente} total t={t} />
          {b.activos_fijos_valor_libro > 0 && (
            <>
              <div style={{ padding:'10px 16px 6px', fontSize:10, fontWeight:700, color:t.textFaint, textTransform:'uppercase' }}>Activo no corriente (bienes de uso)</div>
              <FilaEstado label="Bienes de uso (valor libro)"    valor={b.activos_fijos_valor_libro}  nivel={1} t={t} />
              <FilaEstado label="  (valor original de compra)"   valor={b.activos_fijos_valor_compra} nivel={2} color={t.textFaint} t={t} />
              <FilaEstado label="Total activo no corriente"      valor={b.total_activo_no_corriente} total t={t} />
            </>
          )}
          <FilaEstado label="TOTAL ACTIVO"                       valor={b.total_activo}    total color={t.blueNum} t={t} />
        </div>
      </div>

      {/* Pasivo + Patrimonio */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, overflow:'hidden', boxShadow:t.shadow }}>
        <div style={{ padding:'12px 16px', background:t.headerBg, borderBottom:`1px solid ${t.border}` }}>
          <div style={{ fontSize:13, fontWeight:800, color:t.text }}>PASIVO + PATRIMONIO NETO</div>
        </div>
        <div style={{ paddingTop:8, paddingBottom:8 }}>
          <div style={{ padding:'4px 16px 6px', fontSize:10, fontWeight:700, color:t.textFaint, textTransform:'uppercase' }}>Pasivo</div>
          <FilaEstado label="Pedidos pendientes de entrega" valor={b.obligaciones_pedidos} nivel={1} t={t} />
          <FilaEstado label="TOTAL PASIVO"                  valor={b.total_pasivo}          total t={t} />

          <div style={{ padding:'12px 16px 6px', fontSize:10, fontWeight:700, color:t.textFaint, textTransform:'uppercase' }}>Patrimonio neto</div>
          <FilaEstado label="Ingresos acumulados"    valor={b.ingresos_acumulados}  nivel={1} color={t.greenNum} t={t} />
          <FilaEstado label="(-) Gastos acumulados"  valor={-b.gastos_acumulados}   nivel={1} t={t} />
          <FilaEstado label="(-) Pasivos"            valor={-b.total_pasivo}        nivel={1} t={t} />
          <FilaEstado label="PATRIMONIO NETO"        valor={b.patrimonio_neto}       total color={b.patrimonio_neto >= 0 ? t.greenNum : t.redNum} t={t} />
          <FilaEstado label="TOTAL PASIVO + PN"      valor={b.total_pasivo + b.patrimonio_neto} total color={t.blueNum} t={t} />
        </div>
      </div>

      {/* Verificación ecuación contable */}
      <div style={{ padding:'10px 14px', borderRadius:12, background: balanceado ? t.green : t.amber, border:`1px solid ${balanceado ? t.greenNum+'33' : t.amberSub+'33'}` }}>
        <span style={{ fontSize:12, fontWeight:700, color: balanceado ? t.greenNum : t.amberSub }}>
          {balanceado ? '✓ Ecuación contable equilibrada — Activo = Pasivo + PN' : `ℹ Diferencia de ${fmt(ecuacion)} — Balance simplificado basado en datos disponibles`}
        </span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4: CAMBIOS EN PATRIMONIO
// ══════════════════════════════════════════════════════════════════════════════
function TabPatrimonio({ contable, t }: { contable: ReturnType<typeof useContable>; t: Tema }) {
  if (contable.loading) return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{[1,2,3].map(i=><Sk key={i} h={50} t={t} />)}</div>
  if (contable.patrimonio.length === 0) return <EmptyState icon="📈" titulo="Sin historial" sub="Necesitás al menos 2 meses de datos para ver la evolución patrimonial" t={t} />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:600 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, overflow:'hidden', boxShadow:t.shadow }}>
        <div style={{ padding:'12px 16px', background:t.headerBg, borderBottom:`1px solid ${t.border}` }}>
          <div style={{ fontSize:13, fontWeight:800, color:t.text }}>Estado de Cambios en el Patrimonio Neto</div>
        </div>

        {/* Tabla */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:t.surfaceAlt }}>
                {['Período','Resultado','PN Inicio','PN Cierre','Variación'].map(h => (
                  <th key={h} style={{ padding:'8px 14px', textAlign: h === 'Período' ? 'left' : 'right', fontSize:10, fontWeight:700, color:t.textMuted, textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:`1px solid ${t.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contable.patrimonio.map((p, i) => (
                <tr key={p.periodo} style={{ background: i % 2 === 0 ? 'transparent' : t.rowAlt }}>
                  <td style={{ padding:'9px 14px', color:t.textMuted, fontWeight:500 }}>{fmtPeriodo(p.periodo)}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:700, color: p.resultado_periodo >= 0 ? t.greenNum : t.redNum }}>{fmtN(p.resultado_periodo)}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'monospace', color:t.textMuted }}>{fmtN(p.patrimonio_inicio)}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:t.text }}>{fmtN(p.patrimonio_fin)}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'monospace', fontSize:11, color: p.variacion_pct >= 0 ? t.greenNum : t.redNum }}>
                    {p.variacion_pct !== 0 ? `${p.variacion_pct > 0 ? '+' : ''}${fmtPct(p.variacion_pct)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico de barras patrimonio */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 16px', boxShadow:t.shadow }}>
        <div style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:12 }}>Evolución del patrimonio neto</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:80 }}>
          {contable.patrimonio.slice().reverse().map(p => {
            const max = Math.max(...contable.patrimonio.map(x => Math.abs(x.patrimonio_fin)), 1)
            const h = Math.max((Math.abs(p.patrimonio_fin) / max) * 70, 4)
            return (
              <div key={p.periodo} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ width:'100%', height:h, borderRadius:'4px 4px 0 0', background: p.patrimonio_fin >= 0 ? t.greenNum : t.redNum, opacity:0.8 }} />
                <span style={{ fontSize:8, color:t.textFaint, textAlign:'center' }}>{fmtPeriodo(p.periodo).split(' ')[0]}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5: LIBRO DIARIO
// ══════════════════════════════════════════════════════════════════════════════
function TabLibroDiario({ contable, t }: { contable: ReturnType<typeof useContable>; t: Tema }) {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [busqueda,   setBusqueda]   = useState('')

  const tipos = ['todos', ...Array.from(new Set(contable.libroDiario.map(a => a.tipo)))]

  const lista = contable.libroDiario.filter(a => {
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false
    if (busqueda && !a.descripcion.toLowerCase().includes(busqueda.toLowerCase()) && !a.numero_asiento.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const totalDebe  = lista.reduce((s, a) => s + a.debe, 0)
  const totalHaber = lista.reduce((s, a) => s + a.haber, 0)

  const tipoColor: Record<string, string> = {
    'Venta':        '#16a34a',
    'Gasto':        '#dc2626',
    'Cobro cuota':  '#2563eb',
    'Compra insumo':'#d97706',
  }

  if (contable.loading) return <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{[1,2,3,4,5].map(i=><Sk key={i} h={56} t={t} />)}</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Filtros */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍 Buscar asiento..."
          style={{ padding:'7px 12px', borderRadius:9, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.text, fontSize:12, outline:'none', fontFamily:'inherit', flex:1, minWidth:160 }} />
        <div style={{ display:'flex', gap:5 }}>
          {tipos.map(tipo => (
            <button key={tipo} onClick={()=>setFiltroTipo(tipo)}
              style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${filtroTipo===tipo ? (tipoColor[tipo]??t.accent) : t.border}`, background: filtroTipo===tipo ? `${tipoColor[tipo]??t.accent}18` : 'transparent', color: filtroTipo===tipo ? (tipoColor[tipo]??t.accent) : t.textMuted, fontSize:10, fontWeight:filtroTipo===tipo?700:400, cursor:'pointer', whiteSpace:'nowrap' }}>
              {tipo === 'todos' ? `Todos (${contable.libroDiario.length})` : tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, overflow:'hidden', boxShadow:t.shadow }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:t.headerBg }}>
                {['Fecha','N° Asiento','Tipo','Descripción','Cuenta Debe','Cuenta Haber','Debe','Haber'].map(h => (
                  <th key={h} style={{ padding:'9px 12px', textAlign: ['Debe','Haber'].includes(h) ? 'right' : 'left', fontSize:9, fontWeight:700, color:t.textMuted, textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:`1px solid ${t.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0
                ? <tr><td colSpan={8} style={{ padding:'32px', textAlign:'center', color:t.textFaint }}>Sin asientos para los filtros seleccionados</td></tr>
                : lista.map((a, i) => (
                    <tr key={a.ref_id + a.tipo} style={{ background: i % 2 === 0 ? 'transparent' : t.rowAlt, borderBottom:`1px solid ${t.borderLight}` }}>
                      <td style={{ padding:'8px 12px', color:t.textMuted, whiteSpace:'nowrap' }}>{new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' })}</td>
                      <td style={{ padding:'8px 12px', fontFamily:'monospace', fontSize:10, color:t.textFaint, whiteSpace:'nowrap' }}>{a.numero_asiento}</td>
                      <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${tipoColor[a.tipo]??'#6b7280'}18`, color:tipoColor[a.tipo]??t.textMuted }}>
                          {a.tipo}
                        </span>
                      </td>
                      <td style={{ padding:'8px 12px', color:t.text, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.descripcion}</td>
                      <td style={{ padding:'8px 12px', color:t.textFaint, fontSize:10, whiteSpace:'nowrap' }}>{a.cuenta_debe}</td>
                      <td style={{ padding:'8px 12px', color:t.textFaint, fontSize:10, whiteSpace:'nowrap' }}>{a.cuenta_haber}</td>
                      <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:t.greenNum, whiteSpace:'nowrap' }}>{a.debe > 0 ? fmt(a.debe) : '—'}</td>
                      <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:t.redNum, whiteSpace:'nowrap' }}>{a.haber > 0 ? fmt(a.haber) : '—'}</td>
                    </tr>
                  ))
              }
            </tbody>
            {lista.length > 0 && (
              <tfoot>
                <tr style={{ background:t.surfaceAlt, borderTop:`2px solid ${t.border}` }}>
                  <td colSpan={6} style={{ padding:'9px 12px', fontSize:11, fontWeight:700, color:t.textMuted }}>TOTALES ({lista.length} asientos)</td>
                  <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:t.greenNum }}>{fmt(totalDebe)}</td>
                  <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:t.redNum }}>{fmt(totalHaber)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 6: EXPORTAR
// ══════════════════════════════════════════════════════════════════════════════
function TabExportar({ contable, negocio, t }: { contable: ReturnType<typeof useContable>; negocio: string; t: Tema }) {
  const [exportando, setExportando] = useState<string | null>(null)
  const [exito,      setExito]      = useState<string | null>(null)

  const exportarExcel = async (tipo: string) => {
    setExportando(tipo)
    try {
      // Importar SheetJS dinámicamente
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      if (tipo === 'resultados' || tipo === 'completo') {
        const data = contable.resultados.map(r => ({
          'Período':              fmtPeriodo(r.periodo),
          'Ventas Brutas ($)':    r.ingresos_ventas,
          'Descuentos ($)':       r.descuentos,
          'Ventas Netas ($)':     r.ventas_netas,
          'Costo de Ventas ($)':  r.costo_ventas,
          'Utilidad Bruta ($)':   r.utilidad_bruta,
          'Margen Bruto (%)':     parseFloat(r.margen_bruto_pct.toFixed(1)),
          'Gastos Operativos ($)':r.gastos_operativos,
          'Resultado Neto ($)':   r.utilidad_operativa,
          'Margen Operativo (%)': parseFloat(r.margen_operativo_pct.toFixed(1)),
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws['!cols'] = Array(10).fill({ wch: 20 })
        XLSX.utils.book_append_sheet(wb, ws, 'Estado de Resultados')
      }

      if (tipo === 'flujo' || tipo === 'completo') {
        const data = contable.flujos.map(f => ({
          'Período':                  fmtPeriodo(f.periodo),
          'Cobros Contado ($)':       f.cobros_contado,
          'Cobros Cuotas ($)':        f.cobros_cuotas,
          'Total Entradas ($)':       f.total_entradas,
          'Gastos Pagados ($)':       f.egresos_gastos,
          'Compras MP ($)':           f.egresos_compras_mp,
          'Total Salidas ($)':        f.total_salidas,
          'Flujo Neto ($)':           f.flujo_neto,
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws['!cols'] = Array(8).fill({ wch: 22 })
        XLSX.utils.book_append_sheet(wb, ws, 'Flujo de Efectivo')
      }

      if (tipo === 'libro' || tipo === 'completo') {
        const data = contable.libroDiario.map(a => ({
          'Fecha':          a.fecha,
          'N° Asiento':     a.numero_asiento,
          'Tipo':           a.tipo,
          'Descripción':    a.descripcion,
          'Cuenta Debe':    a.cuenta_debe,
          'Cuenta Haber':   a.cuenta_haber,
          'Debe ($)':       a.debe > 0 ? a.debe : '',
          'Haber ($)':      a.haber > 0 ? a.haber : '',
          'Comprobante':    a.comprobante ?? '',
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws['!cols'] = [{ wch:12 },{ wch:14 },{ wch:14 },{ wch:30 },{ wch:22 },{ wch:22 },{ wch:14 },{ wch:14 },{ wch:16 }]
        XLSX.utils.book_append_sheet(wb, ws, 'Libro Diario')
      }

      if (tipo === 'balance' || tipo === 'completo') {
        const b = contable.balance
        if (b) {
          const data = [
            { 'Sección': 'ACTIVO',             'Cuenta': '',                              'Monto ($)': '' },
            { 'Sección': 'Activo Corriente',   'Cuenta': 'Caja y Bancos (estimada)',      'Monto ($)': b.caja_estimada },
            { 'Sección': 'Activo Corriente',   'Cuenta': 'Cuentas a Cobrar',              'Monto ($)': b.cuentas_cobrar },
            { 'Sección': 'Activo Corriente',   'Cuenta': 'Inventario',                    'Monto ($)': b.inventario },
            { 'Sección': 'TOTAL ACTIVO',       'Cuenta': '',                              'Monto ($)': b.total_activo },
            { 'Sección': '',                   'Cuenta': '',                              'Monto ($)': '' },
            { 'Sección': 'PASIVO',             'Cuenta': '',                              'Monto ($)': '' },
            { 'Sección': 'Pasivo Corriente',   'Cuenta': 'Obligaciones por pedidos',      'Monto ($)': b.obligaciones_pedidos },
            { 'Sección': 'TOTAL PASIVO',       'Cuenta': '',                              'Monto ($)': b.total_pasivo },
            { 'Sección': '',                   'Cuenta': '',                              'Monto ($)': '' },
            { 'Sección': 'PATRIMONIO NETO',    'Cuenta': 'Resultado acumulado',           'Monto ($)': b.patrimonio_neto },
            { 'Sección': 'TOTAL PAS + PN',     'Cuenta': '',                              'Monto ($)': b.total_pasivo + b.patrimonio_neto },
          ]
          const ws = XLSX.utils.json_to_sheet(data)
          ws['!cols'] = [{ wch:22 }, { wch:28 }, { wch:16 }]
          XLSX.utils.book_append_sheet(wb, ws, 'Balance General')
        }
      }

      const fecha = new Date().toISOString().slice(0,10)
      const nombre = `Finti_${negocio.replace(/\s+/g,'_')}_${tipo}_${fecha}.xlsx`
      XLSX.writeFile(wb, nombre)
      setExito(tipo)
      setTimeout(() => setExito(null), 3000)
    } catch (err) {
      console.error('Error exportando Excel:', err)
    } finally {
      setExportando(null)
    }
  }

  const exportarPDF = async (tipo: string) => {
    setExportando(`pdf_${tipo}`)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, M = 20
      let y = M

      const addHeader = (titulo: string, subtitulo: string) => {
        doc.setFillColor(17, 24, 39)
        doc.rect(0, 0, W, 28, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(18); doc.setFont('helvetica','bold')
        doc.text('finti', M, 14)
        doc.setFontSize(9); doc.setFont('helvetica','normal')
        doc.text(negocio, M + 22, 14)
        doc.setFontSize(14); doc.setFont('helvetica','bold')
        doc.text(titulo, W/2, 20, { align:'center' })
        y = 38
        doc.setTextColor(100, 116, 139)
        doc.setFontSize(9); doc.setFont('helvetica','normal')
        doc.text(subtitulo, W/2, y, { align:'center' })
        y += 8
        doc.setDrawColor(228, 228, 228)
        doc.line(M, y, W - M, y)
        y += 8
        doc.setTextColor(17, 24, 39)
      }

      const addFila = (label: string, valor: string, negrita = false, bg = false) => {
        if (y > 270) { doc.addPage(); y = M }
        if (bg) { doc.setFillColor(248, 247, 244); doc.rect(M, y-4, W-2*M, 7, 'F') }
        doc.setFont('helvetica', negrita ? 'bold' : 'normal')
        doc.setFontSize(10)
        doc.setTextColor(negrita ? 17 : 100, negrita ? 24 : 116, negrita ? 39 : 139)
        doc.text(label, M + 4, y)
        doc.setTextColor(17, 24, 39)
        doc.text(valor, W - M - 4, y, { align:'right' })
        y += 7
      }

      if (tipo === 'resultados' && contable.resultadoActual) {
        const r = contable.resultadoActual
        addHeader('Estado de Resultados', `Período: ${fmtPeriodo(r.periodo)}`)
        addFila('Ventas brutas',            fmt(r.ingresos_ventas))
        addFila('(-) Descuentos',           `(${fmt(r.descuentos)})`)
        addFila('Ventas netas',             fmt(r.ventas_netas), true, true)
        y += 3
        addFila('(-) Costo de ventas',      `(${fmt(r.costo_ventas)})`)
        addFila('Utilidad bruta',           fmtN(r.utilidad_bruta), true, true)
        addFila(`Margen bruto`,             fmtPct(r.margen_bruto_pct))
        y += 3
        addFila('(-) Gastos operativos',    `(${fmt(r.gastos_operativos)})`)
        addFila('Resultado neto (EBIT)',     fmtN(r.utilidad_operativa), true, true)
        addFila('Margen operativo',         fmtPct(r.margen_operativo_pct))
      }

      if (tipo === 'balance' && contable.balance) {
        const b = contable.balance
        addHeader('Balance General', `Al ${new Date(b.fecha_balance + 'T12:00:00').toLocaleDateString('es-AR')}`)
        y += 4
        doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(37,99,235)
        doc.text('ACTIVO', M, y); y += 8
        addFila('Caja y Bancos (estimada)',  fmt(b.caja_estimada))
        addFila('Cuentas a Cobrar',          fmt(b.cuentas_cobrar))
        addFila('Inventario',                fmt(b.inventario))
        addFila('TOTAL ACTIVO',              fmt(b.total_activo), true, true)
        y += 6
        doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(220,38,38)
        doc.text('PASIVO', M, y); y += 8
        addFila('Obligaciones por pedidos',  fmt(b.obligaciones_pedidos))
        addFila('TOTAL PASIVO',              fmt(b.total_pasivo), true, true)
        y += 6
        doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(22,163,74)
        doc.text('PATRIMONIO NETO', M, y); y += 8
        addFila('Resultado acumulado',       fmtN(b.patrimonio_neto))
        addFila('TOTAL PASIVO + PN',         fmtN(b.total_pasivo + b.patrimonio_neto), true, true)
      }

      // Pie de página
      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text(`Generado por Finti · ${new Date().toLocaleDateString('es-AR')}`, W/2, 290, { align:'center' })

      const fecha = new Date().toISOString().slice(0,10)
      doc.save(`Finti_${tipo}_${fecha}.pdf`)
      setExito(`pdf_${tipo}`)
      setTimeout(() => setExito(null), 3000)
    } catch (err) {
      console.error('Error exportando PDF:', err)
    } finally {
      setExportando(null)
    }
  }

  const informes = [
    { id:'resultados', titulo:'Estado de Resultados',       icon:'📊', desc:'Ingresos, costos y utilidad por período' },
    { id:'flujo',      titulo:'Flujo de Efectivo',          icon:'💧', desc:'Entradas y salidas de caja por período' },
    { id:'balance',    titulo:'Balance General',            icon:'⚖️', desc:'Activo, Pasivo y Patrimonio Neto' },
    { id:'libro',      titulo:'Libro Diario',               icon:'📒', desc:'Todos los asientos contables' },
    { id:'completo',   titulo:'Informe Completo',           icon:'📦', desc:'Todos los estados en un solo archivo' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:560 }}>
      <div style={{ padding:'12px 16px', borderRadius:12, background:t.blue, border:`1px solid ${t.blueNum}22` }}>
        <div style={{ fontSize:12, fontWeight:700, color:t.blueNum, marginBottom:4 }}>ℹ Formatos de exportación</div>
        <div style={{ fontSize:11, color:t.blueNum, opacity:0.85 }}>
          <strong>Excel (.xlsx)</strong> — compatible con Excel, Google Sheets, Tango, Contasol y cualquier sistema contable.<br />
          <strong>PDF</strong> — para presentar a tu contador o entidad financiera.
        </div>
      </div>

      {informes.map(inf => (
        <div key={inf.id} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:13, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, boxShadow:t.shadow }}>
          <span style={{ fontSize:28, flexShrink:0 }}>{inf.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:t.text }}>{inf.titulo}</div>
            <div style={{ fontSize:11, color:t.textFaint, marginTop:2 }}>{inf.desc}</div>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={() => exportarExcel(inf.id)} disabled={!!exportando}
              style={{ padding:'7px 13px', borderRadius:9, border:`1px solid ${t.border}`, background: exito===inf.id ? t.green : t.surfaceAlt, color: exito===inf.id ? t.greenNum : t.textMuted, fontSize:11, fontWeight:700, cursor:exportando?'wait':'pointer', whiteSpace:'nowrap' }}>
              {exportando===inf.id ? '⏳' : exito===inf.id ? '✓' : '⬇'} Excel
            </button>
            {['resultados','balance'].includes(inf.id) && (
              <button onClick={() => exportarPDF(inf.id)} disabled={!!exportando}
                style={{ padding:'7px 13px', borderRadius:9, border:`1px solid ${t.border}`, background: exito===`pdf_${inf.id}` ? t.green : t.surfaceAlt, color: exito===`pdf_${inf.id}` ? t.greenNum : t.textMuted, fontSize:11, fontWeight:700, cursor:exportando?'wait':'pointer', whiteSpace:'nowrap' }}>
                {exportando===`pdf_${inf.id}` ? '⏳' : exito===`pdf_${inf.id}` ? '✓' : '⬇'} PDF
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ icon, titulo, sub, t }: { icon: string; titulo: string; sub: string; t: Tema }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:t.textFaint }}>
      <div style={{ fontSize:44, marginBottom:14 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:700, color:t.textMuted }}>{titulo}</div>
      <div style={{ fontSize:12, color:t.textFaint, marginTop:6, maxWidth:300, margin:'8px auto 0' }}>{sub}</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTABLE VIEW PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
// ── AGREGAR AL FINAL DE ContableView.tsx, antes del componente ContableView ──
// src/components/contable/TabActivosFijos.tsx (o pegar inline en ContableView)

const CAT_ACTIVO: Record<string, { label: string; icon: string; color: string }> = {
  vehiculo:   { label: 'Vehículo',    icon: '🚗', color: '#2563eb' },
  maquinaria: { label: 'Maquinaria',  icon: '⚙️', color: '#7c3aed' },
  mobiliario: { label: 'Mobiliario',  icon: '🪑', color: '#d97706' },
  tecnologia: { label: 'Tecnología',  icon: '💻', color: '#0d9488' },
  inmueble:   { label: 'Inmueble',    icon: '🏠', color: '#16a34a' },
  otro:       { label: 'Otro',        icon: '📦', color: '#6b7280' },
}

const VIDA_UTIL_SUGERIDA: Record<string, number> = {
  vehiculo: 60, maquinaria: 120, mobiliario: 60, tecnologia: 36, inmueble: 240, otro: 60,
}

function ModalActivo({ item, onConfirm, onCancel, saving, t }: {
  item?: ActivoFijo | null
  onConfirm: (d: NuevoActivoData) => void
  onCancel: () => void
  saving: boolean
  t: Tema
}) {
  const [nombre,    setNombre]    = useState(item?.nombre ?? '')
  const [cat,       setCat]       = useState(item?.categoria ?? 'vehiculo')
  const [desc,      setDesc]      = useState(item?.descripcion ?? '')
  const [valor,     setValor]     = useState(item ? item.valor_compra.toString() : '')
  const [fecha,     setFecha]     = useState(item?.fecha_compra ?? new Date().toISOString().slice(0,10))
  const [deprecia,  setDep]       = useState(item?.deprecia ?? false)
  const [vidaUtil,  setVida]      = useState(item?.vida_util_meses?.toString() ?? '')
  const [valResid,  setResid]     = useState(item?.valor_residual?.toString() ?? '0')
  const [notas,     setNotas]     = useState(item?.notas ?? '')
  const [err,       setErr]       = useState('')

  // Sugerir vida útil al cambiar categoría
  const handleCat = (c: string) => {
    setCat(c)
    if (!item && deprecia && !vidaUtil) setVida(VIDA_UTIL_SUGERIDA[c]?.toString() ?? '')
  }
  const handleDep = (v: boolean) => {
    setDep(v)
    if (v && !vidaUtil) setVida(VIDA_UTIL_SUGERIDA[cat]?.toString() ?? '60')
  }

  const cuotaMensual = deprecia && toFloat(vidaUtil) > 0
    ? (toFloat(valor) - toFloat(valResid)) / toFloat(vidaUtil)
    : 0

  const handleSubmit = () => {
    if (!nombre.trim())        { setErr('Ingresá el nombre del bien'); return }
    if (toFloat(valor) <= 0)   { setErr('El valor de compra debe ser mayor a 0'); return }
    if (deprecia && toFloat(vidaUtil) < 1) { setErr('Ingresá la vida útil en meses'); return }
    setErr('')
    onConfirm({
      nombre: nombre.trim(), categoria: cat, descripcion: desc || undefined,
      valor_compra: toFloat(valor), fecha_compra: fecha,
      deprecia, vida_util_meses: deprecia ? Math.round(toFloat(vidaUtil)) : undefined,
      valor_residual: deprecia ? toFloat(valResid) : undefined,
      notas: notas || undefined,
    })
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'22px 20px', maxWidth:440, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:18 }}>
          {item ? '✎ Editar bien' : '+ Registrar bien de uso'}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Categoría */}
          <div>
            <label style={lbl(t)}>Categoría</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
              {Object.entries(CAT_ACTIVO).map(([key, cfg]) => (
                <button key={key} onClick={() => handleCat(key)}
                  style={{ padding:'7px 8px', borderRadius:9, border:`1.5px solid ${cat===key ? cfg.color : t.border}`, background: cat===key ? `${cfg.color}15` : 'transparent', color: cat===key ? cfg.color : t.textMuted, fontSize:11, fontWeight: cat===key ? 700 : 400, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                  <span>{cfg.icon}</span><span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label style={lbl(t)}>Nombre *</label>
            <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)}
              placeholder="Ej: Ford Transit 2023, Horno industrial..." style={inp(t)} autoFocus />
          </div>

          {/* Valor + Fecha */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={lbl(t)}>Valor de compra $</label>
              <input type="number" min="0" value={valor} onChange={e=>setValor(e.target.value)} style={inp(t)} />
            </div>
            <div>
              <label style={lbl(t)}>Fecha de compra</label>
              <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inp(t)} />
            </div>
          </div>

          {/* Toggle depreciación */}
          <div
            onClick={() => handleDep(!deprecia)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:11, background: deprecia ? `${t.blueNum}12` : t.surfaceAlt, border:`1.5px solid ${deprecia ? t.blueNum : t.border}`, cursor:'pointer' }}>
            <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${deprecia ? t.blueNum : t.border}`, background: deprecia ? t.blueNum : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {deprecia && <span style={{ color:'#fff', fontSize:12, lineHeight:1 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color: deprecia ? t.blueNum : t.text }}>Aplicar depreciación lineal</div>
              <div style={{ fontSize:10, color:t.textFaint }}>El bien pierde valor con el tiempo</div>
            </div>
          </div>

          {/* Campos depreciación (solo si activa) */}
          {deprecia && (
            <div style={{ padding:'12px 14px', borderRadius:12, background:t.surfaceAlt, border:`1px solid ${t.border}`, display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={lbl(t)}>Vida útil (meses) *</label>
                  <input type="number" min="1" value={vidaUtil} onChange={e=>setVida(e.target.value)} style={inp(t)}
                    placeholder={`Sugerido: ${VIDA_UTIL_SUGERIDA[cat] ?? 60}`} />
                  <div style={{ fontSize:9, color:t.textFaint, marginTop:3 }}>
                    {toFloat(vidaUtil) > 0 ? `= ${(toFloat(vidaUtil)/12).toFixed(1)} años` : ''}
                  </div>
                </div>
                <div>
                  <label style={lbl(t)}>Valor residual $</label>
                  <input type="number" min="0" value={valResid} onChange={e=>setResid(e.target.value)} style={inp(t)} />
                  <div style={{ fontSize:9, color:t.textFaint, marginTop:3 }}>Valor al final de la vida útil</div>
                </div>
              </div>
              {cuotaMensual > 0 && (
                <div style={{ padding:'8px 12px', borderRadius:8, background:`${t.blueNum}12`, border:`1px solid ${t.blueNum}30` }}>
                  <span style={{ fontSize:11, color:t.blueNum }}>
                    📉 Depreciación mensual: <strong>{fmt(cuotaMensual)}/mes</strong>
                    {' '}· Totalmente depreciado en <strong>{(toFloat(vidaUtil)/12).toFixed(1)} años</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Descripción */}
          <div>
            <label style={lbl(t)}>Descripción / Notas (opcional)</label>
            <input type="text" value={notas} onChange={e=>setNotas(e.target.value)}
              placeholder="Ej: Patente ABC-123, N° serie 45678..." style={inp(t)} />
          </div>

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

function ModalBaja({ activo, onConfirm, onCancel, saving, t }: {
  activo: ActivoFijo; onConfirm: (tipo:'vendido'|'baja', monto?: number) => void
  onCancel: () => void; saving: boolean; t: Tema
}) {
  const [tipo,  setTipo]  = useState<'vendido'|'baja'>('vendido')
  const [monto, setMonto] = useState(activo.valor_libro.toString())
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'22px 20px', maxWidth:360, width:'100%', boxShadow:t.shadowMd, animation:'popIn 0.18s ease' }}>
        <div style={{ fontSize:15, fontWeight:800, color:t.text, marginBottom:4 }}>Dar de baja: {activo.nombre}</div>
        <div style={{ fontSize:11, color:t.textMuted, marginBottom:18 }}>Valor libro actual: {fmt(activo.valor_libro)}</div>
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {(['vendido','baja'] as const).map(op => (
            <button key={op} onClick={()=>setTipo(op)}
              style={{ flex:1, padding:'9px 0', borderRadius:10, border:`1.5px solid ${tipo===op ? (op==='vendido'?t.greenNum:t.redNum) : t.border}`, background: tipo===op ? (op==='vendido'?`${t.greenNum}15`:`${t.redNum}15`) : 'transparent', color: tipo===op ? (op==='vendido'?t.greenNum:t.redNum) : t.textMuted, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              {op === 'vendido' ? '💰 Vendido' : '🗑 Dado de baja'}
            </button>
          ))}
        </div>
        {tipo === 'vendido' && (
          <div style={{ marginBottom:14 }}>
            <label style={lbl(t)}>Precio de venta $</label>
            <input type="number" min="0" value={monto} onChange={e=>setMonto(e.target.value)} style={inp(t)} />
          </div>
        )}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
          <button onClick={()=>onConfirm(tipo, tipo==='vendido'?toFloat(monto):undefined)} disabled={saving}
            style={{ flex:1, padding:12, borderRadius:12, border:'none', background:t.redNum, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
            {saving ? '...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabActivosFijos({ contable, t }: { contable: ReturnType<typeof useContable>; t: Tema }) {
  const [modalNuevo,  setModalNuevo]  = useState(false)
  const [modalEditar, setModalEditar] = useState<ActivoFijo | null>(null)
  const [modalBaja,   setModalBaja]   = useState<ActivoFijo | null>(null)
  const [filtroEstado, setFiltro]     = useState<'activo'|'vendido'|'baja'|'todos'>('activo')

  const lista = contable.activos.filter(a => filtroEstado === 'todos' || a.estado === filtroEstado)
  const rs    = contable.resumenActivos

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:640 }}>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'11px 14px', boxShadow:t.shadow }}>
          <div style={{ fontSize:9, color:t.textFaint, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>Valor de compra</div>
          <div style={{ fontSize:16, fontWeight:800, fontFamily:'monospace', color:t.text }}>{fmt(rs.totalValorCompra)}</div>
        </div>
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'11px 14px', boxShadow:t.shadow }}>
          <div style={{ fontSize:9, color:t.textFaint, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>Valor libro actual</div>
          <div style={{ fontSize:16, fontWeight:800, fontFamily:'monospace', color:t.blueNum }}>{fmt(rs.totalValorLibro)}</div>
        </div>
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'11px 14px', boxShadow:t.shadow }}>
          <div style={{ fontSize:9, color:t.textFaint, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>Deprec. mensual</div>
          <div style={{ fontSize:16, fontWeight:800, fontFamily:'monospace', color:t.amberSub }}>{rs.cuotaMensualTotal > 0 ? fmt(rs.cuotaMensualTotal) : '—'}</div>
        </div>
      </div>

      {/* Depreciación acumulada vs valor compra */}
      {rs.totalValorCompra > 0 && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'12px 16px', boxShadow:t.shadow }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:700, color:t.text }}>Depreciación acumulada sobre bienes activos</span>
            <span style={{ fontSize:11, fontFamily:'monospace', color:t.amberSub }}>{fmt(rs.totalDepreciacion)}</span>
          </div>
          <div style={{ height:8, borderRadius:4, background:t.border, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min((rs.totalDepreciacion/rs.totalValorCompra)*100,100)}%`, background:t.amberSub, borderRadius:4 }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
            <span style={{ fontSize:10, color:t.textFaint }}>Valor libro: {fmt(rs.totalValorLibro)}</span>
            <span style={{ fontSize:10, color:t.textFaint }}>{((rs.totalDepreciacion/rs.totalValorCompra)*100).toFixed(1)}% depreciado</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', gap:5 }}>
          {(['activo','vendido','baja','todos'] as const).map(e => (
            <button key={e} onClick={()=>setFiltro(e)}
              style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${filtroEstado===e?t.accent:t.border}`, background:filtroEstado===e?t.surfaceAlt:'transparent', color:filtroEstado===e?t.accent:t.textMuted, fontSize:10, fontWeight:filtroEstado===e?700:400, cursor:'pointer' }}>
              {e === 'activo' ? `Activos (${contable.activos.filter(a=>a.estado==='activo').length})`
                : e === 'vendido' ? 'Vendidos' : e === 'baja' ? 'Baja' : 'Todos'}
            </button>
          ))}
        </div>
        <button onClick={()=>setModalNuevo(true)}
          style={{ padding:'8px 18px', borderRadius:10, border:'none', background:t.accent, color:t.accentText, fontSize:12, fontWeight:700, cursor:'pointer' }}>
          + Agregar bien
        </button>
      </div>

      {/* Lista */}
      {contable.loading
        ? [1,2,3].map(i=><Sk key={i} h={90} radius={12} t={t} />)
        : lista.length === 0
          ? <div style={{ textAlign:'center', padding:'50px 20px', color:t.textFaint }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🏭</div>
              <div style={{ fontSize:13, color:t.textMuted }}>Sin bienes registrados</div>
              <div style={{ fontSize:11, color:t.textFaint, marginTop:4 }}>Registrá vehículos, máquinas, equipos y más</div>
            </div>
          : lista.map(activo => {
              const cfg = CAT_ACTIVO[activo.categoria] ?? CAT_ACTIVO.otro
              const pctDeprec = activo.valor_compra > 0 ? (activo.depreciacion_acumulada / activo.valor_compra) * 100 : 0
              const inactivo = activo.estado !== 'activo'
              return (
                <div key={activo.id} style={{ background:t.surface, border:`1px solid ${inactivo ? t.border : t.border}`, borderRadius:14, padding:'14px 16px', boxShadow:t.shadow, opacity: inactivo ? 0.65 : 1 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    {/* Ícono */}
                    <div style={{ width:40, height:40, borderRadius:11, background:`${cfg.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{cfg.icon}</div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                        <span style={{ fontSize:13, fontWeight:800, color:t.text }}>{activo.nombre}</span>
                        <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${cfg.color}18`, color:cfg.color }}>{cfg.label}</span>
                        {inactivo && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:20, background:t.surfaceAlt, color:t.textMuted }}>{activo.estado === 'vendido' ? '💰 Vendido' : '🗑 Baja'}</span>}
                      </div>
                      <div style={{ fontSize:10, color:t.textFaint }}>
                        Compra: {new Date(activo.fecha_compra + 'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })}
                        {' · '}{activo.meses_uso} meses de uso
                        {activo.notas && ` · ${activo.notas}`}
                      </div>

                      {/* Valores */}
                      <div style={{ display:'flex', gap:16, marginTop:8 }}>
                        <div>
                          <div style={{ fontSize:9, color:t.textFaint }}>Valor compra</div>
                          <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:t.text }}>{fmt(activo.valor_compra)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:9, color:t.textFaint }}>Valor libro</div>
                          <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:t.blueNum }}>{fmt(activo.valor_libro)}</div>
                        </div>
                        {activo.deprecia && (
                          <div>
                            <div style={{ fontSize:9, color:t.textFaint }}>Deprec. acumulada</div>
                            <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:t.amberSub }}>{fmt(activo.depreciacion_acumulada)}</div>
                          </div>
                        )}
                        {activo.deprecia && activo.cuota_depreciacion_mensual > 0 && (
                          <div>
                            <div style={{ fontSize:9, color:t.textFaint }}>Por mes</div>
                            <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:t.textMuted }}>{fmt(activo.cuota_depreciacion_mensual)}</div>
                          </div>
                        )}
                      </div>

                      {/* Barra depreciación */}
                      {activo.deprecia && activo.vida_util_meses && (
                        <div style={{ marginTop:8 }}>
                          <div style={{ height:5, borderRadius:3, background:t.border, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${Math.min(pctDeprec,100)}%`, background: pctDeprec >= 80 ? t.redNum : pctDeprec >= 50 ? t.amberSub : t.blueNum, borderRadius:3 }} />
                          </div>
                          <div style={{ fontSize:9, color:t.textFaint, marginTop:3 }}>
                            {pctDeprec.toFixed(0)}% depreciado · vida útil {activo.vida_util_meses} meses
                            {activo.meses_uso < activo.vida_util_meses
                              ? ` · quedan ${activo.vida_util_meses - activo.meses_uso} meses`
                              : ' · completamente depreciado'}
                          </div>
                        </div>
                      )}
                      {!activo.deprecia && (
                        <div style={{ marginTop:6, fontSize:9, color:t.textFaint }}>Sin depreciación aplicada</div>
                      )}
                    </div>

                    {/* Acciones */}
                    {!inactivo && (
                      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                        <button onClick={()=>setModalEditar(activo)} title="Editar"
                          style={{ width:30, height:30, borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.textMuted, cursor:'pointer', fontSize:13 }}>✎</button>
                        <button onClick={()=>setModalBaja(activo)} title="Dar de baja"
                          style={{ width:30, height:30, borderRadius:8, border:`1px solid ${t.border}`, background:t.surfaceAlt, color:t.redNum, cursor:'pointer', fontSize:13 }}>↓</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
      }

      {/* Modales */}
      {(modalNuevo || modalEditar) && (
        <ModalActivo
          item={modalEditar}
          onConfirm={async d => {
            if (modalEditar) await contable.editarActivo(modalEditar.id, d)
            else             await contable.agregarActivo(d)
            setModalNuevo(false); setModalEditar(null)
          }}
          onCancel={() => { setModalNuevo(false); setModalEditar(null) }}
          saving={contable.saving} t={t}
        />
      )}
      {modalBaja && (
        <ModalBaja
          activo={modalBaja}
          onConfirm={async (tipo, monto) => {
            await contable.darDeBaja(modalBaja.id, tipo, monto)
            setModalBaja(null)
          }}
          onCancel={() => setModalBaja(null)}
          saving={contable.saving} t={t}
        />
      )}
    </div>
  )
}
export function ContableView({ usuario, contable }: ContableViewProps) {
  const [dark,     setDark]     = useDarkMode()
  const [isMobile, setIsMobile] = useState(false)
  const [tab, setTab] = useState<'resultados'|'flujo'|'balance'|'patrimonio'|'activos'|'diario'|'exportar'>('resultados')

  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const t = dark ? tema.dark : tema.light

  const TABS = [
    { key:'resultados', label:'📊 Resultados'  },
    { key:'flujo',      label:'💧 Flujo'       },
    { key:'balance',    label:'⚖️ Balance'     },
    { key:'patrimonio', label:'📈 Patrimonio'  },
    { key:'activos',    label:'🏭 Activos'     },
    { key:'diario',     label:'📒 Libro Diario'},
    { key:'exportar',   label:'⬇ Exportar'    },
  ] as const

  const r = contable.resultadoActual
  const kpis = [
    { label:'Ventas netas',   value: r ? fmt(r.ventas_netas)    : '—', color: t.text },
    { label:'Utilidad bruta', value: r ? fmtN(r.utilidad_bruta) : '—', color: r && r.utilidad_bruta  >= 0 ? t.greenNum : t.redNum },
    { label:'Resultado neto', value: r ? fmtN(r.utilidad_operativa) : '—', color: r && r.utilidad_operativa >= 0 ? t.greenNum : t.redNum },
    { label:'Asientos diario',value: contable.libroDiario.length.toString(), color: t.text },
  ]

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#33302a;border-radius:4px;}
      `}</style>

      <div style={{ height:'100vh', display:'flex', background:t.bg, fontFamily:"'DM Sans',system-ui,sans-serif", overflow:'hidden' }}>
        {!isMobile && (
          <Sidebar activo={'personal' as 'personal'} usuario={usuario} dark={dark} setDark={setDark} t={t} />
        )}

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Header */}
          <div style={{ padding: isMobile ? '52px 20px 14px' : '18px 24px 14px', borderBottom:`1px solid ${t.border}`, background:t.surface, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {isMobile && (
                <button onClick={()=>router.push('/personal')} style={{ background:'transparent', border:'none', cursor:'pointer', color:t.textMuted, fontSize:18 }}>←</button>
              )}
              <div>
                <div style={{ fontSize: isMobile ? 20 : 18, fontWeight:800, color:t.text, letterSpacing:'-0.4px' }}>Contabilidad</div>
                <div style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>
                  {usuario.negocio} · Estados financieros
                  {contable.periodoSel && <span style={{ marginLeft:8 }}>· {fmtPeriodo(contable.periodoSel)}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ padding:'14px 20px 0', flexShrink:0 }}>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10 }}>
              {contable.loading ? [1,2,3,4].map(i=><Sk key={i} h={68} radius={12} t={t} />) : kpis.map((k,i) => (
                <div key={i} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'11px 14px', boxShadow:t.shadow }}>
                  <div style={{ fontSize:10, color:t.textMuted, marginBottom:4 }}>{k.label}</div>
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
            {tab === 'resultados' && <TabResultados  contable={contable} t={t} />}
            {tab === 'flujo'      && <TabFlujo        contable={contable} t={t} />}
            {tab === 'balance'    && <TabBalance       contable={contable} t={t} />}
            {tab === 'patrimonio' && <TabPatrimonio    contable={contable} t={t} />}
            {tab === 'activos'    && <TabActivosFijos  contable={contable} t={t} />}
            {tab === 'diario'     && <TabLibroDiario   contable={contable} t={t} />}
            {tab === 'exportar'   && <TabExportar      contable={contable} negocio={usuario.negocio} t={t} />}
          </div>
        </div>
      </div>
    </>
  )
}