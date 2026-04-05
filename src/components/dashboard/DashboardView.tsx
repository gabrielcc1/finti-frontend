'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Sidebar } from '@/components/shared/Sidebar'
import { BuscadorGlobal, ModalBusqueda } from '@/components/shared/BuscadorGlobal'
import { useRouter, usePathname } from 'next/navigation'
import type { useDashboard } from '@/hooks/useDashboard'
import { BannerInstalacion } from '@/components/shared/BannerInstalacion'
import type { usePedidos } from '@/hooks/usePedidos'

interface UsuarioInfo { nombre: string; negocio: string; tier: string; avatar: string }
interface DashboardViewProps {
  usuario:   UsuarioInfo
  dashboard: ReturnType<typeof useDashboard>
  pedidos:   ReturnType<typeof usePedidos>
}

const toFloat = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0
const formatPeso = (n: string | number | null | undefined) => `$${toFloat(n).toLocaleString('es-AR')}`

type SemaforoEstado = 'pagada' | 'vencida' | 'hoy' | 'manana' | 'pendiente'
function getSemaforo(cuota: { estado: string; fecha_vencimiento: string }): SemaforoEstado {
  if (cuota.estado === 'pagada') return 'pagada'
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const partes = (cuota.fecha_vencimiento ?? '').slice(0,10).split('-').map(Number)
  const venc = new Date(partes[0], partes[1] - 1, partes[2])
  if (venc < hoy) return 'vencida'
  if (venc.getTime() === hoy.getTime()) return 'hoy'
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1)
  if (venc.getTime() === manana.getTime()) return 'manana'
  return 'pendiente'
}
function getSemaforoPedido(d: number): 'urgente'|'proximo'|'ok' {
  if (d <= 0) return 'urgente'; if (d <= 2) return 'proximo'; return 'ok'
}

const tema = {
  light: {
    bg:'#fafaf8',surface:'#ffffff',surfaceAlt:'#f5f5f2',border:'#e8e8e4',borderLight:'#f0f0ec',
    text:'#111827',textMuted:'#6b7280',textFaint:'#9ca3af',hero:'#111827',heroText:'#ffffff',
    accent:'#111827',accentText:'#ffffff',sparkLine:'#a3e635',chartGrid:'#f3f4f6',
    amber:'#fffbeb',amberBorder:'#fde68a',amberText:'#92400e',amberNum:'#111827',amberSub:'#d97706',
    red:'#fff1f2',redBorder:'#fecdd3',redText:'#9f1239',redNum:'#dc2626',
    green:'#f0fdf4',greenBorder:'#bbf7d0',greenText:'#166534',
    navBg:'rgba(255,255,255,0.92)',shadow:'0 1px 4px rgba(0,0,0,0.06)',shadowMd:'0 4px 16px rgba(0,0,0,0.08)',
    skeletonBase:'#ebebeb',skeletonShine:'#f5f5f5',
  },
  dark: {
    bg:'#141210',surface:'#1c1916',surfaceAlt:'#211e1b',border:'#2e2924',borderLight:'#252019',
    text:'#e8e0d4',textMuted:'#7a6e62',textFaint:'#4a4238',hero:'#1c1916',heroText:'#e8e0d4',
    accent:'#d4a96a',accentText:'#141210',sparkLine:'#d4a96a',chartGrid:'#252019',
    amber:'#1f1a0e',amberBorder:'#3d3010',amberText:'#a87d30',amberNum:'#fcd34d',amberSub:'#a87d30',
    red:'#1f0e0e',redBorder:'#3d1010',redText:'#7a2222',redNum:'#f87171',
    green:'#0e1f12',greenBorder:'#1a3820',greenText:'#4a7a54',
    navBg:'rgba(20,18,16,0.95)',shadow:'0 1px 6px rgba(0,0,0,0.4)',shadowMd:'0 4px 20px rgba(0,0,0,0.5)',
    skeletonBase:'#211e1b',skeletonShine:'#2e2924',
  },
}
type Tema = typeof tema.light

function Skeleton({ w='100%', h=16, radius=6, t }: { w?: string|number; h?: number; radius?: number; t: Tema }) {
  return (
    <div style={{width:w,height:h,borderRadius:radius,background:t.skeletonBase,overflow:'hidden',position:'relative'}}>
      <div style={{position:'absolute',inset:0,background:`linear-gradient(90deg,transparent,${t.skeletonShine},transparent)`,animation:'shimmer 1.4s infinite'}} />
    </div>
  )
}
function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20,background:bg,color,letterSpacing:'0.04em'}}>{children}</span>
}
function ConexionDot({ status }: { status: string }) {
  const colors: Record<string,string> = {online:'#4ade80',syncing:'#f59e0b',offline:'#ef4444'}
  const c = colors[status] ?? '#9ca3af'
  return <div style={{width:7,height:7,borderRadius:'50%',background:c,boxShadow:status==='online'?`0 0 6px ${c}`:'none'}} />
}

function ModalCobro({ cuota, onConfirm, onCancel, t, dark }: {
  cuota:{cliente:string;monto:string;numero_cuota:number;cant_cuotas:number;id:string}
  onConfirm:(id:string)=>void; onCancel:()=>void; t:Tema; dark:boolean
}) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:22,padding:'28px 24px',maxWidth:340,width:'100%',boxShadow:t.shadowMd,animation:'popIn 0.18s ease'}}>
        <div style={{textAlign:'center',marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:10}}>💰</div>
          <div style={{fontSize:16,fontWeight:800,color:t.text}}>Confirmar cobro</div>
          <div style={{fontSize:13,color:t.textMuted,marginTop:4}}>{cuota.cliente}</div>
          <div style={{fontSize:28,fontWeight:800,color:t.accent,fontFamily:'monospace',marginTop:8}}>{formatPeso(cuota.monto)}</div>
          <div style={{fontSize:11,color:t.textMuted,marginTop:4}}>Cuota {cuota.numero_cuota}/{cuota.cant_cuotas}</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:12,borderRadius:12,border:`1.5px solid ${t.border}`,background:t.surfaceAlt,color:t.textMuted,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
          <button onClick={()=>onConfirm(cuota.id)} style={{flex:1,padding:12,borderRadius:12,border:'none',background:t.accent,color:t.accentText,fontSize:13,fontWeight:800,cursor:'pointer'}}>✓ Cobrado</button>
        </div>
      </div>
    </div>
  )
}

function CuotaRow({ cuota, onCheck, t, dark, compact=false }: {
  cuota:{id:string;estado:string;fecha_vencimiento:string;monto:string;numero_cuota:number;cobranzas:{cant_cuotas:number;clientes:{nombre:string}|null}|null}
  onCheck:(c:{id:string;cliente:string;monto:string;numero_cuota:number;cant_cuotas:number})=>void
  t:Tema; dark:boolean; compact?:boolean
}) {
  const sem = getSemaforo(cuota)
  const colores = {
    pagada:{bg:t.green,border:t.greenBorder,text:t.greenText,label:'✓ cobrado'},
    vencida:{bg:t.red,border:t.redBorder,text:t.redNum,label:'vencida'},
    hoy:{bg:t.amber,border:t.amberBorder,text:t.amberSub,label:'hoy'},
    manana:{bg:t.amber,border:t.amberBorder,text:t.amberSub,label:'mañana'},
    pendiente:{bg:t.surfaceAlt,border:t.borderLight,text:t.textMuted,label:'pendiente'},
  }
  const col = colores[sem]
  const nombre = cuota.cobranzas?.clientes?.nombre ?? 'Cliente'
  const cantCuotas = cuota.cobranzas?.cant_cuotas ?? 1
  const payload = {id:cuota.id,cliente:nombre,monto:cuota.monto,numero_cuota:cuota.numero_cuota,cant_cuotas:cantCuotas}
  return (
    <div onDoubleClick={()=>sem!=='pagada'&&onCheck(payload)}
      style={{display:'flex',alignItems:'center',gap:compact?8:10,padding:compact?'7px 8px':'9px 10px',borderRadius:compact?10:12,background:col.bg,border:`1px solid ${col.border}`,cursor:sem!=='pagada'?'pointer':'default',userSelect:'none'}}>
      <div style={{width:compact?30:36,height:compact?30:36,borderRadius:10,background:t.surfaceAlt,border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:compact?9:10,fontWeight:700,color:t.textMuted,flexShrink:0}}>
        {nombre.split(' ').map((n:string)=>n[0]).join('').slice(0,2)}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:compact?11:12,fontWeight:600,color:t.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nombre}</div>
        <div style={{fontSize:9,color:t.textFaint}}>Cuota {cuota.numero_cuota}/{cantCuotas}</div>
      </div>
      <div style={{textAlign:'right',flexShrink:0}}>
        <div style={{fontSize:compact?12:13,fontWeight:700,color:t.text,fontFamily:'monospace'}}>{formatPeso(cuota.monto)}</div>
        <Badge color={col.text} bg={col.bg}>{col.label}</Badge>
      </div>
      {sem!=='pagada'&&(
        <button onClick={(e)=>{e.stopPropagation();onCheck(payload)}}
          style={{width:26,height:26,borderRadius:8,border:`1px solid ${col.border}`,background:col.bg,color:col.text,cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✓</button>
      )}
    </div>
  )
}

function PanelPedidos({ pedidos, t }: { pedidos: ReturnType<typeof usePedidos>; t: Tema }) {
  const cols = {
    urgente: { color: t.redNum,   bg: t.red   },
    proximo: { color: t.amberSub, bg: t.amber },
    ok:      { color: t.greenText,bg: t.green },
  }
  if (pedidos.loading) return <div style={{height:80,background:t.surfaceAlt,borderRadius:12}} />
  if (pedidos.pedidos.length===0) return <div style={{padding:16,textAlign:'center',color:t.textFaint,fontSize:12}}>Sin pedidos próximos 🎉</div>
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {pedidos.pedidos.slice(0,4).map(p=>{
        const col=cols[getSemaforoPedido(p.dias_restantes)]
        return (
          <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:11,background:col.bg,border:`1px solid ${col.color}22`}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:col.color,flexShrink:0,boxShadow:`0 0 5px ${col.color}`}} />
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:t.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.descripcion}</div>
              <div style={{fontSize:10,color:t.textFaint}}>{p.clientes?.nombre ?? 'Cliente'} · {new Date(p.fecha_entrega).toLocaleDateString('es-AR')}</div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:700,color:t.text,fontFamily:'monospace'}}>{formatPeso(p.monto_entrega)}</div>
              <Badge color={col.color} bg={col.bg}>{p.dias_restantes<=0?'¡Hoy!':`en ${p.dias_restantes}d`}</Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface SharedViewProps {
  usuario:UsuarioInfo; dashboard:ReturnType<typeof useDashboard>; pedidos:ReturnType<typeof usePedidos>
  dark:boolean; setDark:(v:boolean)=>void; t:Tema
  setModalCuota:(v:{id:string;cliente:string;monto:string;numero_cuota:number;cant_cuotas:number}|null)=>void
  pendientes:ReturnType<typeof useDashboard>['cuotasHoy']; totalPendiente:number
  vencidas:ReturnType<typeof useDashboard>['cuotasHoy']; montoVencido:number; pedidosUrgentes:number
}

function MobileView({ usuario, dashboard, pedidos, dark, setDark, t, setModalCuota, pendientes, totalPendiente, vencidas, montoVencido, pedidosUrgentes }: SharedViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)
   const [showBuscador, setShowBuscador] = useState(false)
  return (
    <div style={{height:'100vh',overflowY:'auto',background:t.bg,paddingBottom:80}}>
      <div style={{padding:'52px 20px 16px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div style={{fontSize:11,color:t.textFaint}}>{new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</div>
          <div style={{fontSize:21,fontWeight:800,color:t.text,letterSpacing:'-0.4px'}}>Hola, {usuario.nombre} 👋</div>
          <div style={{fontSize:11,color:t.textMuted}}>{usuario.negocio}</div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center',marginTop:4,flexShrink:0}}>
          <ConexionDot status={dashboard.conexion} />
          <button onClick={()=>setDark(!dark)} style={{width:32,height:32,borderRadius:9,border:`1px solid ${t.border}`,background:t.surface,cursor:'pointer',color:t.textMuted,fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {dark?'☀':'☾'}
          </button>
          <button onClick={()=>setShowBuscador(true)} style={{width:32,height:32,borderRadius:9,border:`1px solid ${t.border}`,background:t.surface,cursor:'pointer',color:t.textMuted,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>
            🔍
          </button>
          <div onClick={()=>router.push('/perfil')} title="Ver perfil" style={{cursor:'pointer',flexShrink:0}}>
            <div style={{width:32,height:32,borderRadius:9,background:t.accent,display:'flex',alignItems:'center',justifyContent:'center',color:t.accentText,fontSize:10,fontWeight:800}}>
              {usuario.avatar}
            </div>
          </div>
        </div>
      </div>
      <div style={{padding:'0 20px',display:'flex',flexDirection:'column',gap:12}}>
        {/* Banner instalación PWA — solo aparece en mobile si no está instalada */}
        <BannerInstalacion />
        {dashboard.loading?<Skeleton h={120} radius={20} t={t} />:(
          <div style={{background:t.hero,borderRadius:20,padding:'18px 20px',boxShadow:t.shadowMd}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:11,color:dark?'#5a5044':'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>Caja hoy</div>
                <div style={{fontSize:32,fontWeight:800,color:t.heroText,fontFamily:'monospace',letterSpacing:'-1.5px',lineHeight:1}}>{formatPeso(dashboard.cajaHoy)}</div>
                <div style={{fontSize:11,color:t.sparkLine,marginTop:5,fontWeight:600}}>{formatPeso(dashboard.cajaMes)} este mes · {dashboard.ventasMes} ventas</div>
              </div>
              <div style={{width:88,height:48}}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboard.ventasSemana}>
                    <Area type="monotone" dataKey="ventas" stroke={t.sparkLine} strokeWidth={2} fill="transparent" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{background:t.amber,border:`1.5px solid ${t.amberBorder}`,borderRadius:16,padding:'14px 16px'}}>
            <div style={{fontSize:18,marginBottom:4}}>⏰</div>
            <div style={{fontSize:10,color:t.amberText}}>Vencimientos</div>
            <div style={{fontSize:21,fontWeight:800,color:t.amberNum,fontFamily:'monospace',marginTop:2}}>{formatPeso(totalPendiente)}</div>
            <div style={{fontSize:10,color:t.amberSub,marginTop:2,fontWeight:600}}>{pendientes.length} cobros hoy</div>
          </div>
          <div style={{background:t.red,border:`1.5px solid ${t.redBorder}`,borderRadius:16,padding:'14px 16px'}}>
            <div style={{fontSize:18,marginBottom:4}}>🚨</div>
            <div style={{fontSize:10,color:t.redText}}>Morosos</div>
            <div style={{fontSize:21,fontWeight:800,color:t.redNum,fontFamily:'monospace',marginTop:2}}>{formatPeso(montoVencido)}</div>
            <div style={{fontSize:10,color:t.redNum,marginTop:2,fontWeight:600}}>{vencidas.length} clientes</div>
          </div>
        </div>
        <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:18,padding:16,boxShadow:t.shadow}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:700,color:t.text}}>Cobros de hoy</span>
            <span style={{fontSize:10,color:t.textMuted}}>2× clic = cobrar</span>
          </div>
          {dashboard.loading
            ?[1,2,3].map(i=><div key={i} style={{marginBottom:8}}><Skeleton h={48} radius={12} t={t} /></div>)
            :<div style={{display:'flex',flexDirection:'column',gap:7}}>
              {dashboard.cuotasHoy.map(c=>(<CuotaRow key={c.id} cuota={c as Parameters<typeof CuotaRow>[0]['cuota']} onCheck={setModalCuota} t={t} dark={dark} />))}
              {dashboard.cuotasHoy.length===0&&<div style={{textAlign:'center',color:t.textFaint,fontSize:12,padding:12}}>Sin cobros para hoy 🎉</div>}
            </div>
          }
        </div>
        <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:18,padding:16,boxShadow:t.shadow}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:700,color:t.text}}>Entregas próximas</span>
            {pedidosUrgentes>0&&<Badge color={t.redNum} bg={t.red}>{pedidosUrgentes} urgente{pedidosUrgentes>1?'s':''}</Badge>}
          </div>
          <PanelPedidos pedidos={pedidos} t={t} />
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>router.push('/ventas')} style={{flex:1,padding:14,borderRadius:14,border:'none',background:t.accent,color:t.accentText,fontSize:13,fontWeight:800,cursor:'pointer'}}>＋ Nueva venta</button>
          <button onClick={()=>router.push('/pedidos')} style={{flex:1,padding:14,borderRadius:14,border:`1.5px solid ${t.border}`,background:t.surface,color:t.text,fontSize:13,fontWeight:700,cursor:'pointer'}}>📦 Pedido</button>
        </div>
      </div>
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:t.navBg,backdropFilter:'blur(16px)',borderTop:`1px solid ${t.border}`,padding:'10px 0 20px',display:'flex',justifyContent:'space-around',zIndex:50}}>
        {([['⊞','Inicio','/dashboard'],['↗','Ventas','/ventas'],['◎','Cobros','/cobranzas'],['▦','Stock','/stock'],['≋','Más','']] as const).map(([icon,label,href])=>(
          <div key={label} 
            onClick={()=>label==='Más'?setShowMenu(true):href&&router.push(href)}
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer'}}>
            <div style={{fontSize:18,color:(href&&pathname===href)?t.accent:t.textFaint}}>{icon}</div>
            <div style={{fontSize:9,color:(href&&pathname===href)?t.accent:t.textFaint,fontWeight:(href&&pathname===href)?700:400}}>{label}</div>
            {(href&&pathname===href)&&<div style={{width:4,height:4,borderRadius:'50%',background:t.accent}} />}
          </div>
        ))}
      </div>
      {showMenu && (
        <div
          style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}
          onClick={()=>setShowMenu(false)}
        >
          <div
            onClick={e=>e.stopPropagation()}
            style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:'22px 22px 0 0',padding:'20px 20px 36px',width:'100%',boxShadow:t.shadowMd,animation:'popIn 0.18s ease'}}
          >
            {/* Handle drag */}
            <div style={{width:36,height:4,borderRadius:2,background:t.border,margin:'0 auto 18px'}} />
            <div style={{fontSize:13,fontWeight:800,color:t.text,marginBottom:14}}>Módulos</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>

              {/* Clientes */}
              <button onClick={()=>{setShowMenu(false);router.push('/clientes')}}
                style={{padding:'13px 12px',borderRadius:13,border:`1px solid ${t.border}`,background:t.surfaceAlt,cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left' as const}}>
                <span style={{fontSize:22,flexShrink:0}}>👥</span>
                <div><div style={{fontSize:12,fontWeight:700,color:t.text}}>Clientes</div><div style={{fontSize:10,color:t.textMuted}}>Base de datos</div></div>
              </button>

              {/* Pedidos */}
              <button onClick={()=>{setShowMenu(false);router.push('/pedidos')}}
                style={{padding:'13px 12px',borderRadius:13,border:`1px solid ${t.border}`,background:t.surfaceAlt,cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left' as const}}>
                <span style={{fontSize:22,flexShrink:0}}>📦</span>
                <div><div style={{fontSize:12,fontWeight:700,color:t.text}}>Pedidos</div><div style={{fontSize:10,color:t.textMuted}}>Entregas</div></div>
              </button>

              {/* Costos */}
              <button onClick={()=>{setShowMenu(false);router.push('/costos')}}
                style={{padding:'13px 12px',borderRadius:13,border:`1px solid ${t.amberBorder}`,background:t.amber,cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left' as const}}>
                <span style={{fontSize:22,flexShrink:0}}>💸</span>
                <div><div style={{fontSize:12,fontWeight:700,color:t.amberSub}}>Costos</div><div style={{fontSize:10,color:t.amberSub,opacity:0.75}}>Rentabilidad</div></div>
              </button>

              {/* Contable */}
              <button onClick={()=>{setShowMenu(false);router.push('/contable')}}
                style={{padding:'13px 12px',borderRadius:13,border:'1px solid #bfdbfe',background:'#eff6ff',cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left' as const}}>
                <span style={{fontSize:22,flexShrink:0}}>📊</span>
                <div><div style={{fontSize:12,fontWeight:700,color:'#1d4ed8'}}>Contable</div><div style={{fontSize:10,color:'#1d4ed8',opacity:0.75}}>Estados</div></div>
              </button>

              {/* Personal */}
              <button onClick={()=>{setShowMenu(false);router.push('/personal')}}
                style={{padding:'13px 12px',borderRadius:13,border:`1px solid ${t.greenBorder}`,background:t.green,cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left' as const}}>
                <span style={{fontSize:22,flexShrink:0}}>◉</span>
                <div><div style={{fontSize:12,fontWeight:700,color:t.greenText}}>Personal</div><div style={{fontSize:10,color:t.greenText,opacity:0.75}}>Mis finanzas</div></div>
              </button>

            </div>
            <button onClick={()=>setShowMenu(false)}
              style={{marginTop:14,width:'100%',padding:'12px',borderRadius:12,border:`1.5px solid ${t.border}`,background:t.surfaceAlt,color:t.textMuted,fontSize:13,fontWeight:600,cursor:'pointer'}}>
              Cerrar
            </button>
          </div>
        </div>
      )}
      {showBuscador && (<ModalBusqueda t={t} dark={dark} onClose={() => setShowBuscador(false)} />)}
    </div>
  )
}

function DesktopView({ usuario, dashboard, pedidos, dark, setDark, t, setModalCuota, pendientes, totalPendiente, vencidas, montoVencido, pedidosUrgentes }: SharedViewProps) {
  const router = useRouter()
  return (
    <div style={{height:'100vh',display:'flex',background:t.bg,overflow:'hidden'}}>
      <Sidebar activo="dashboard" usuario={usuario} dark={dark} setDark={setDark} t={t} />
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{height:54,background:t.surface,borderBottom:`1px solid ${t.border}`,display:'flex',alignItems:'center',padding:'0 20px',gap:14,flexShrink:0}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:t.text}}>Buenos días, {usuario.nombre} 👋</div>
            <div style={{fontSize:10,color:t.textMuted}}>{pendientes.length} cobros · {pedidosUrgentes} entregas urgentes hoy</div>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
            <ConexionDot status={dashboard.conexion} />
            <BuscadorGlobal t={t} dark={dark} />
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'18px 20px',display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {dashboard.loading?[1,2,3,4].map(i=><Skeleton key={i} h={80} radius={13} t={t} />):[
              {label:'Caja hoy',value:formatPeso(dashboard.cajaHoy),sub:`${formatPeso(dashboard.cajaMes)} este mes`,subColor:'#4ade80',icon:'💰',top:t.accent},
              {label:'Vencimientos',value:formatPeso(totalPendiente),sub:`${pendientes.length} cobros pendientes`,subColor:t.amberSub,icon:'⏰',top:t.amberSub,bg:t.amber,border:t.amberBorder},
              {label:'Morosos',value:formatPeso(montoVencido),sub:`${vencidas.length} clientes en mora`,subColor:t.redNum,icon:'🚨',top:t.redNum,bg:t.red,border:t.redBorder},
              {label:'Entregas hoy',value:`${pedidosUrgentes} pedidos`,sub:`${pedidos.pedidos.length} esta semana`,subColor:t.amberSub,icon:'📦',top:t.amberSub},
            ].map((k,i)=>(
              <div key={i} style={{background:(k as {bg?:string}).bg??t.surface,border:`1px solid ${(k as {border?:string}).border??t.border}`,borderRadius:13,padding:'13px 15px',boxShadow:t.shadow,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:k.top,borderRadius:'13px 13px 0 0'}} />
                <div style={{display:'flex',justifyContent:'space-between'}}><div style={{fontSize:10,color:t.textMuted,marginTop:2}}>{k.label}</div><div style={{fontSize:16}}>{k.icon}</div></div>
                <div style={{fontSize:20,fontWeight:800,color:t.text,fontFamily:'monospace',marginTop:5}}>{k.value}</div>
                <div style={{fontSize:10,color:k.subColor,marginTop:2,fontWeight:600}}>{k.sub}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,alignItems:'start'}}>
            <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:13,padding:16,boxShadow:t.shadow,minWidth:0,height:250}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
                <div><div style={{fontSize:12,fontWeight:700,color:t.text}}>Ventas y Cobros</div><div style={{fontSize:10,color:t.textMuted}}>Últimos 7 días</div></div>
                <div style={{display:'flex',gap:12,fontSize:10,alignItems:'center'}}>
                  {[['Ventas',t.accent],['Cobros',t.amberSub]].map(([n,c])=>(<span key={n} style={{color:c,display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:3,borderRadius:2,background:c,display:'inline-block'}} />{n}</span>))}
                </div>
              </div>
              {dashboard.loading?<Skeleton h={150} t={t} />:(
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={dashboard.ventasSemana}>
                    <defs>
                      <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={t.accent} stopOpacity={dark?0.22:0.12} /><stop offset="95%" stopColor={t.accent} stopOpacity={0} /></linearGradient>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={t.amberSub} stopOpacity={dark?0.18:0.1} /><stop offset="95%" stopColor={t.amberSub} stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                    <XAxis dataKey="dia" tick={{fill:t.textMuted,fontSize:9}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill:t.textMuted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={(v:number)=>`$${(v/1000).toFixed(0)}k`} width={34} />
                    <Tooltip formatter={(v:number)=>formatPeso(v)} />
                    <Area type="monotone" dataKey="ventas" name="Ventas" stroke={t.accent} strokeWidth={1.8} fill="url(#gV)" />
                    <Area type="monotone" dataKey="cobros" name="Cobros" stroke={t.amberSub} strokeWidth={1.8} fill="url(#gC)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:13,padding:14,boxShadow:t.shadow,display:'flex',flexDirection:'column',maxHeight:250,overflow:'hidden'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><span style={{fontSize:12,fontWeight:700,color:t.text}}>Cobros de hoy</span><span style={{fontSize:9,color:t.textMuted}}>2× clic = cobrar</span></div>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:6,overflowY:'auto'}}>
                {dashboard.loading?[1,2,3,4].map(i=><Skeleton key={i} h={44} radius={10} t={t} />)
                  :dashboard.cuotasHoy.map(c=>(<CuotaRow key={c.id} cuota={c as Parameters<typeof CuotaRow>[0]['cuota']} onCheck={setModalCuota} t={t} dark={dark} compact />))}
              </div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:13,padding:14,boxShadow:t.shadow}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><span style={{fontSize:12,fontWeight:700,color:t.text}}>Entregas próximas</span>{pedidosUrgentes>0&&<Badge color={t.redNum} bg={t.red}>{pedidosUrgentes} urgente{pedidosUrgentes>1?'s':''}</Badge>}</div>
              <PanelPedidos pedidos={pedidos} t={t} />
            </div>
            <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:13,padding:14,boxShadow:t.shadow}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><span style={{fontSize:12,fontWeight:700,color:t.text}}>Stock crítico</span>{dashboard.stockCritico.length>0&&<Badge color={t.redNum} bg={t.red}>{dashboard.stockCritico.length} items</Badge>}</div>
              {dashboard.loading?[1,2,3].map(i=><div key={i} style={{marginBottom:10}}><Skeleton h={30} t={t} /></div>):(
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {dashboard.stockCritico.map((s,i)=>{
                    const pct=Math.min((s.stock_actual/Math.max(s.stock_minimo,1))*100,100)
                    const color=s.stock_actual===0?t.redNum:t.amberSub
                    return (<div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:6,height:6,borderRadius:'50%',background:color,boxShadow:`0 0 5px ${color}`,flexShrink:0}} />
                      <div style={{flex:1}}><div style={{fontSize:11,color:t.text}}>{s.nombre}</div><div style={{height:3,borderRadius:2,background:t.border,marginTop:4,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:2}} /></div></div>
                      <span style={{fontSize:10,fontWeight:700,color,fontFamily:'monospace',flexShrink:0}}>{s.stock_actual}/{s.stock_minimo}</span>
                    </div>)
                  })}
                  {dashboard.stockCritico.length===0&&<div style={{textAlign:'center',color:t.textFaint,fontSize:11,padding:8}}>Stock ok ✓</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardView({ usuario, dashboard, pedidos }: DashboardViewProps) {
  const [dark,setDark]             = useDarkMode()
  const [isMobile,setIsMobile]     = useState(false)
  const [modalCuota,setModalCuota] = useState<{id:string;cliente:string;monto:string;numero_cuota:number;cant_cuotas:number}|null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize',check)
    return () => window.removeEventListener('resize',check)
  }, [])

  const t = dark ? tema.dark : tema.light

  const handleConfirmarCobro = useCallback(async (id:string) => {
    try { await dashboard.registrarCobro(id); setModalCuota(null) }
    catch(err) { console.error(err) }
  }, [dashboard])

  const pendientes      = dashboard.cuotasHoy.filter(c=>getSemaforo(c)!=='pagada')
  const totalPendiente  = pendientes.reduce((s,c)=>s+toFloat(c.monto),0)
  const vencidas        = dashboard.cuotasHoy.filter(c=>getSemaforo(c)==='vencida')
  const montoVencido    = vencidas.reduce((s,c)=>s+toFloat(c.monto),0)
  const pedidosUrgentes = pedidos.pedidos.filter(p=>p.dias_restantes<=1).length

  const sharedProps = { usuario, dashboard, pedidos, dark, setDark, t, setModalCuota, pendientes, totalPendiente, vencidas, montoVencido, pedidosUrgentes }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes popIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#33302a;border-radius:4px;}`}</style>
      {modalCuota&&<ModalCobro cuota={modalCuota} onConfirm={handleConfirmarCobro} onCancel={()=>setModalCuota(null)} t={t} dark={dark} />}
      {isMobile?<MobileView {...sharedProps} />:<DesktopView {...sharedProps} />}
    </>
  )
}