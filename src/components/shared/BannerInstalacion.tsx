'use client'

// src/components/shared/BannerInstalacion.tsx
//
// Muestra automáticamente instrucciones de instalación cuando el usuario
// entra desde un dispositivo móvil y la app NO está instalada como PWA.
//
// - Android Chrome: captura el evento nativo y muestra botón "Instalar"
// - iOS Safari: muestra instrucciones manuales (Apple no permite instalación automática)
// - Si ya está instalada como PWA: no muestra nada
//
// USO: Agregar en DashboardView mobile, justo arriba del hero card:
//   import { BannerInstalacion } from '@/components/shared/BannerInstalacion'
//   <BannerInstalacion />

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PlataformaPWA = 'android' | 'ios' | 'instalada' | 'desktop' | null

function detectarPlataforma(): PlataformaPWA {
  if (typeof window === 'undefined') return null

  // Ya está instalada como PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return 'instalada'
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return 'instalada'

  const ua = navigator.userAgent.toLowerCase()
  const esMovil = /android|iphone|ipad|ipod/.test(ua)
  if (!esMovil) return 'desktop'

  const esIOS = /iphone|ipad|ipod/.test(ua)
  return esIOS ? 'ios' : 'android'
}

export function BannerInstalacion() {
  const [plataforma,    setPlataforma]    = useState<PlataformaPWA>(null)
  const [promptEvent,   setPromptEvent]   = useState<BeforeInstallPromptEvent | null>(null)
  const [descartado,    setDescartado]    = useState(false)
  const [instalando,    setInstalando]    = useState(false)
  const [mostrarIOS,    setMostrarIOS]    = useState(false)

  useEffect(() => {
    // No mostrar si el usuario ya lo descartó en esta sesión
    const descartadoSession = sessionStorage.getItem('finti_banner_descartado')
    if (descartadoSession) { setDescartado(true); return }

    const p = detectarPlataforma()
    setPlataforma(p)

    if (p === 'android') {
      // Capturar el prompt nativo de Android/Chrome
      const handler = (e: Event) => {
        e.preventDefault()
        setPromptEvent(e as BeforeInstallPromptEvent)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleDescartar = () => {
    sessionStorage.setItem('finti_banner_descartado', '1')
    setDescartado(true)
    setMostrarIOS(false)
  }

  const handleInstalarAndroid = async () => {
    if (!promptEvent) return
    setInstalando(true)
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setDescartado(true)
    } else {
      setInstalando(false)
    }
  }

  // No mostrar en desktop, si ya está instalada, o si fue descartada
  if (descartado || plataforma === 'instalada' || plataforma === 'desktop' || plataforma === null) {
    return null
  }

  // ── Android: prompt nativo disponible ──────────────────────────────────────
  if (plataforma === 'android' && promptEvent) {
    return (
      <div style={{
        margin: '0 20px 4px',
        padding: '12px 14px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, #141210 0%, #1c1916 100%)',
        border: '1.5px solid #2e2924',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}>
        {/* Logo F */}
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: '#d4a96a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: '#141210',
        }}>F</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e8e0d4', marginBottom: 1 }}>
            Instalá Finti
          </div>
          <div style={{ fontSize: 10, color: '#7a6e62' }}>
            Acceso directo desde tu pantalla de inicio
          </div>
        </div>

        <button
          onClick={handleDescartar}
          style={{ background: 'none', border: 'none', color: '#4a4238', cursor: 'pointer', fontSize: 16, padding: '4px', flexShrink: 0 }}>
          ✕
        </button>

        <button
          onClick={handleInstalarAndroid}
          disabled={instalando}
          style={{
            padding: '8px 14px', borderRadius: 9, border: 'none',
            background: '#d4a96a', color: '#141210',
            fontSize: 12, fontWeight: 800, cursor: 'pointer',
            flexShrink: 0, whiteSpace: 'nowrap',
            opacity: instalando ? 0.7 : 1,
          }}>
          {instalando ? '...' : '⬇ Instalar'}
        </button>
      </div>
    )
  }

  // ── Android: sin prompt nativo (Chrome no disparó beforeinstallprompt todavía)
  // O el usuario ya interactuó con el prompt antes → mostrar instrucción manual
  if (plataforma === 'android' && !promptEvent) {
    return (
      <div style={{
        margin: '0 20px 4px',
        padding: '12px 14px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, #141210 0%, #1c1916 100%)',
        border: '1.5px solid #2e2924',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, background:'#d4a96a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#141210' }}>F</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#e8e0d4', marginBottom:2 }}>Instalá Finti en tu celu</div>
          <div style={{ fontSize:10, color:'#7a6e62', lineHeight:1.4 }}>
            Tocá el menú <strong style={{ color:'#a89880' }}>⋮</strong> de Chrome → <strong style={{ color:'#a89880' }}>"Agregar a pantalla de inicio"</strong>
          </div>
        </div>
        <button onClick={handleDescartar}
          style={{ background:'none', border:'none', color:'#4a4238', cursor:'pointer', fontSize:16, padding:'4px', flexShrink:0 }}>✕</button>
      </div>
    )
  }

  // ── iOS Safari ──────────────────────────────────────────────────────────────
  if (plataforma === 'ios') {

    // Botón compacto que expande las instrucciones
    if (!mostrarIOS) {
      return (
        <div style={{
          margin: '0 20px 4px',
          padding: '11px 14px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #141210 0%, #1c1916 100%)',
          border: '1.5px solid #2e2924',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:'#d4a96a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'#141210' }}>F</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#e8e0d4' }}>Instalá Finti en tu iPhone</div>
            <div style={{ fontSize:10, color:'#7a6e62' }}>Acceso rápido desde la pantalla de inicio</div>
          </div>
          <button onClick={handleDescartar}
            style={{ background:'none', border:'none', color:'#4a4238', cursor:'pointer', fontSize:15, padding:'4px', flexShrink:0 }}>✕</button>
          <button onClick={() => setMostrarIOS(true)}
            style={{ padding:'7px 12px', borderRadius:8, border:'none', background:'#d4a96a', color:'#141210', fontSize:11, fontWeight:800, cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
            Cómo →
          </button>
        </div>
      )
    }

    // Instrucciones expandidas para iOS
    return (
      <div style={{
        margin: '0 20px 4px',
        padding: '16px 16px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, #141210 0%, #1c1916 100%)',
        border: '1.5px solid #d4a96a44',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'#d4a96a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#141210' }}>F</div>
            <span style={{ fontSize:13, fontWeight:800, color:'#e8e0d4' }}>Instalá Finti</span>
          </div>
          <button onClick={handleDescartar}
            style={{ background:'none', border:'none', color:'#4a4238', cursor:'pointer', fontSize:18, padding:'2px' }}>✕</button>
        </div>

        {/* Pasos */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { n:'1', texto: <>Tocá el ícono <strong style={{ color:'#d4a96a', fontSize:16 }}>⎋</strong> de compartir en Safari (abajo del todo o arriba)</> },
            { n:'2', texto: <>Bajá y tocá <strong style={{ color:'#d4a96a' }}>"Agregar a pantalla de inicio"</strong></> },
            { n:'3', texto: <>Tocá <strong style={{ color:'#d4a96a' }}>"Agregar"</strong> arriba a la derecha</> },
          ].map(paso => (
            <div key={paso.n} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'#d4a96a22', border:'1px solid #d4a96a44', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#d4a96a', flexShrink:0, marginTop:1 }}>
                {paso.n}
              </div>
              <div style={{ fontSize:12, color:'#a89880', lineHeight:1.5 }}>{paso.texto}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:14, padding:'8px 12px', borderRadius:9, background:'#1c1916', border:'1px solid #2e2924', fontSize:10, color:'#5a5044', textAlign:'center' }}>
          Solo funciona desde Safari · No desde Chrome ni otros navegadores
        </div>
      </div>
    )
  }

  return null
}