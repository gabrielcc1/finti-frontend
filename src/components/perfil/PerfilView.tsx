'use client'

// src/components/perfil/PerfilView.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import { useDarkMode } from '@/hooks/useDarkMode'
import type { usePerfil } from '@/hooks/usePerfil'

interface PerfilViewProps {
  usuario: { nombre: string; negocio: string; tier: string; avatar: string }
  perfil:  ReturnType<typeof usePerfil>
}

// ── Tema ──────────────────────────────────────────────────────────────────────
const tema = {
  light: {
    bg:'#fafaf8', surface:'#ffffff', surfaceAlt:'#f5f5f2', border:'#e8e8e4',
    text:'#111827', textMuted:'#6b7280', textFaint:'#9ca3af',
    accent:'#111827', accentText:'#ffffff',
    green:'#f0fdf4', greenBorder:'#bbf7d0', greenText:'#166534',
    red:'#fff1f2', redBorder:'#fecdd3', redNum:'#dc2626',
    amber:'#fffbeb', amberBorder:'#fde68a', amberSub:'#d97706',
    shadow:'0 1px 4px rgba(0,0,0,0.06)', shadowMd:'0 4px 16px rgba(0,0,0,0.08)',
  },
  dark: {
    bg:'#141210', surface:'#1c1916', surfaceAlt:'#211e1b', border:'#2e2924',
    text:'#e8e0d4', textMuted:'#7a6e62', textFaint:'#4a4238',
    accent:'#d4a96a', accentText:'#141210',
    green:'#0e1f12', greenBorder:'#1a3820', greenText:'#4a7a54',
    red:'#1f0e0e', redBorder:'#3d1010', redNum:'#f87171',
    amber:'#1f1a0e', amberBorder:'#3d3010', amberSub:'#a87d30',
    shadow:'0 1px 6px rgba(0,0,0,0.4)', shadowMd:'0 4px 20px rgba(0,0,0,0.5)',
  },
}

// ── Plan info ─────────────────────────────────────────────────────────────────
const PLANES = {
  free: {
    label: 'Free', color: '#6b7280', bg: '#f5f5f2',
    features: [
      { texto: 'Dashboard y métricas básicas',     ok: true  },
      { texto: 'Ventas y cobranzas ilimitadas',     ok: true  },
      { texto: 'Pedidos y stock',                   ok: true  },
      { texto: 'Hasta 3 usuarios',                  ok: true  },
      { texto: 'Módulo Costos y rentabilidad',      ok: false },
      { texto: 'Módulo Contable',                   ok: false },
      { texto: 'Módulo Personal y finanzas propias',ok: false },
      { texto: 'Exportar reportes PDF/Excel',       ok: false },
      { texto: 'Soporte prioritario',               ok: false },
    ],
  },
  pro: {
    label: 'Pro', color: '#d97706', bg: '#fffbeb',
    features: [
      { texto: 'Todo lo del plan Free',             ok: true  },
      { texto: 'Módulo Costos y rentabilidad',      ok: true  },
      { texto: 'Módulo Contable',                   ok: true  },
      { texto: 'Módulo Personal y finanzas propias',ok: true  },
      { texto: 'Hasta 10 usuarios',                 ok: true  },
      { texto: 'Exportar reportes PDF/Excel',       ok: false },
      { texto: 'Soporte prioritario',               ok: false },
    ],
  },
  business: {
    label: 'Business', color: '#7c3aed', bg: '#f5f3ff',
    features: [
      { texto: 'Todo lo del plan Pro',              ok: true  },
      { texto: 'Usuarios ilimitados',               ok: true  },
      { texto: 'Exportar reportes PDF/Excel',       ok: true  },
      { texto: 'Soporte prioritario',               ok: true  },
      { texto: 'API access',                        ok: true  },
    ],
  },
}

// ── Input reutilizable ────────────────────────────────────────────────────────
function Campo({ label, value, onChange, placeholder, type = 'text', t }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
  t: typeof tema.light
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '9px 12px', borderRadius: 9, fontSize: 13, color: t.text,
          border: `1.5px solid ${t.border}`, background: t.bg,
          outline: 'none', fontFamily: 'inherit', width: '100%',
          boxSizing: 'border-box' as const,
        }}
        onFocus={e => (e.currentTarget.style.borderColor = t.accent)}
        onBlur={e => (e.currentTarget.style.borderColor = t.border)}
      />
    </div>
  )
}

// ── Select reutilizable ───────────────────────────────────────────────────────
function Select({ label, value, onChange, options, t }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
  t: typeof tema.light
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '9px 12px', borderRadius: 9, fontSize: 13, color: t.text,
          border: `1.5px solid ${t.border}`, background: t.bg,
          outline: 'none', fontFamily: 'inherit', width: '100%', cursor: 'pointer',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── Sección wrapper ───────────────────────────────────────────────────────────
function Seccion({ titulo, children, t }: { titulo: string; children: React.ReactNode; t: typeof tema.light }) {
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: '20px 22px', boxShadow: t.shadow }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 16 }}>{titulo}</div>
      {children}
    </div>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────
export function PerfilView({ usuario, perfil: hook }: PerfilViewProps) {
  const [dark, setDark] = useDarkMode()
  const router = useRouter()
  const t = dark ? tema.dark : tema.light

  // Estados locales para los formularios
  const [nombreUsuario, setNombreUsuario] = useState(hook.perfil?.nombre ?? '')
  const [nombreNegocio, setNombreNegocio] = useState(hook.negocio?.nombre ?? '')
  const [cuit,          setCuit]          = useState(hook.negocio?.cuit ?? '')
  const [condicionIva,  setCondicionIva]  = useState(hook.negocio?.condicion_iva ?? '')
  const [telefono,      setTelefono]      = useState(hook.negocio?.telefono ?? '')
  const [emailNegocio,  setEmailNegocio]  = useState(hook.negocio?.email ?? '')
  const [direccion,     setDireccion]     = useState(hook.negocio?.direccion ?? '')

  // Contraseña
  const [nuevaPass,    setNuevaPass]    = useState('')
  const [confirmaPass, setConfirmaPass] = useState('')
  const [passError,    setPassError]    = useState<string | null>(null)

  // Sincronizar cuando cargan los datos
  const datosCargados = !hook.loading && hook.perfil !== null
  const nombreDisplay = hook.perfil?.nombre ?? usuario.nombre
  const avatarDisplay = nombreDisplay.slice(0, 2).toUpperCase()
  const tierActual = (hook.negocio?.tier ?? usuario.tier) as 'free' | 'pro' | 'business'
  const planInfo = PLANES[tierActual] ?? PLANES.free

  const handleGuardarPerfil = async () => {
    if (!nombreUsuario.trim()) return
    await hook.guardarPerfil({ nombre: nombreUsuario.trim() })
  }

  const handleGuardarNegocio = async () => {
    if (!nombreNegocio.trim()) return
    await hook.guardarNegocio({
      nombre:        nombreNegocio.trim(),
      cuit:          cuit.trim() || null,
      condicion_iva: condicionIva || null,
      telefono:      telefono.trim() || null,
      email:         emailNegocio.trim() || null,
      direccion:     direccion.trim() || null,
    })
  }

  const handleCambiarPass = async () => {
    setPassError(null)
    if (nuevaPass.length < 6) { setPassError('Mínimo 6 caracteres'); return }
    if (nuevaPass !== confirmaPass) { setPassError('Las contraseñas no coinciden'); return }
    await hook.cambiarPassword(nuevaPass)
    if (!hook.error) { setNuevaPass(''); setConfirmaPass('') }
  }

  return (
    <div suppressHydrationWarning style={{ height: '100vh', display: 'flex', background: t.bg, fontFamily: "'DM Sans', system-ui, sans-serif", overflow: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <Sidebar activo="dashboard" usuario={usuario} dark={dark} setDark={setDark} t={t} />

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.back()}
            style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ←
          </button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>Mi perfil</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>{hook.email}</div>
          </div>
          {/* Avatar grande */}
          <div style={{ marginLeft: 'auto', width: 48, height: 48, borderRadius: 14, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accentText, fontSize: 16, fontWeight: 800 }}>
            {avatarDisplay}
          </div>
        </div>

        {/* Feedback global */}
        {hook.success && (
          <div style={{ padding: '10px 16px', borderRadius: 10, background: t.green, border: `1px solid ${t.greenBorder}`, color: t.greenText, fontSize: 13, marginBottom: 16 }}>
            ✓ {hook.success}
          </div>
        )}
        {hook.error && (
          <div style={{ padding: '10px 16px', borderRadius: 10, background: t.red, border: `1px solid ${t.redBorder}`, color: t.redNum, fontSize: 13, marginBottom: 16 }}>
            ✕ {hook.error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>

          {/* ── Sección 1: Datos personales ── */}
          <Seccion titulo="👤 Datos personales" t={t}>
            {hook.loading ? (
              <div style={{ height: 40, borderRadius: 8, background: t.surfaceAlt }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Campo label="Tu nombre" value={nombreUsuario || (hook.perfil?.nombre ?? '')} onChange={setNombreUsuario} placeholder="Ej: María González" t={t} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleGuardarPerfil}
                    disabled={hook.saving}
                    style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: t.accent, color: t.accentText, fontSize: 12, fontWeight: 700, cursor: hook.saving ? 'not-allowed' : 'pointer', opacity: hook.saving ? 0.7 : 1 }}>
                    {hook.saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </Seccion>

          {/* ── Sección 2: Datos del negocio ── */}
          <Seccion titulo="🏪 Datos del negocio" t={t}>
            {hook.loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 38, borderRadius: 8, background: t.surfaceAlt }} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Campo label="Nombre del negocio" value={nombreNegocio || (hook.negocio?.nombre ?? '')} onChange={setNombreNegocio} placeholder="Ej: Tortas La Abuela" t={t} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Campo label="CUIT" value={cuit || (hook.negocio?.cuit ?? '')} onChange={setCuit} placeholder="20-12345678-9" t={t} />
                  <Select
                    label="Condición IVA"
                    value={condicionIva || (hook.negocio?.condicion_iva ?? '')}
                    onChange={setCondicionIva}
                    options={[
                      { value: '', label: 'Seleccionar...' },
                      { value: 'monotributo', label: 'Monotributista' },
                      { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
                      { value: 'exento', label: 'Exento' },
                      { value: 'consumidor_final', label: 'Consumidor Final' },
                    ]}
                    t={t}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Campo label="Teléfono" value={telefono || (hook.negocio?.telefono ?? '')} onChange={setTelefono} placeholder="+54 376 4123456" t={t} />
                  <Campo label="Email del negocio" value={emailNegocio || (hook.negocio?.email ?? '')} onChange={setEmailNegocio} placeholder="hola@minegocio.com" t={t} />
                </div>
                <Campo label="Dirección" value={direccion || (hook.negocio?.direccion ?? '')} onChange={setDireccion} placeholder="Ej: Av. San Martín 1234, Posadas" t={t} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleGuardarNegocio}
                    disabled={hook.saving}
                    style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: t.accent, color: t.accentText, fontSize: 12, fontWeight: 700, cursor: hook.saving ? 'not-allowed' : 'pointer', opacity: hook.saving ? 0.7 : 1 }}>
                    {hook.saving ? 'Guardando...' : 'Guardar negocio'}
                  </button>
                </div>
              </div>
            )}
          </Seccion>

          {/* ── Sección 3: Cambiar contraseña ── */}
          <Seccion titulo="🔑 Cambiar contraseña" t={t}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Campo label="Nueva contraseña" value={nuevaPass} onChange={setNuevaPass} type="password" placeholder="Mínimo 6 caracteres" t={t} />
              <Campo label="Confirmar contraseña" value={confirmaPass} onChange={setConfirmaPass} type="password" placeholder="Repetí la contraseña" t={t} />
              {passError && (
                <div style={{ fontSize: 12, color: t.redNum, padding: '6px 10px', borderRadius: 7, background: t.red, border: `1px solid ${t.redBorder}` }}>
                  ✕ {passError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={handleCambiarPass}
                  disabled={hook.saving || !nuevaPass}
                  style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: t.accent, color: t.accentText, fontSize: 12, fontWeight: 700, cursor: (hook.saving || !nuevaPass) ? 'not-allowed' : 'pointer', opacity: (hook.saving || !nuevaPass) ? 0.7 : 1 }}>
                  {hook.saving ? 'Actualizando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </div>
          </Seccion>

          {/* ── Sección 4: Plan actual ── */}
          <Seccion titulo="⚡ Tu plan" t={t}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Badge plan */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: t.surfaceAlt, border: `1.5px solid ${t.border}` }}>
                <div style={{ padding: '4px 12px', borderRadius: 20, background: planInfo.bg, color: planInfo.color, fontSize: 12, fontWeight: 800, border: `1px solid ${planInfo.color}20` }}>
                  {planInfo.label}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Plan {planInfo.label}</div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>Tu plan actual</div>
                </div>
                {tierActual === 'free' && (
                  <button
                    onClick={() => {/* TODO: flujo de upgrade */}}
                    style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: '#d97706', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    ↑ Mejorar plan
                  </button>
                )}
              </div>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {planInfo.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800,
                      background: f.ok ? t.green : t.surfaceAlt,
                      color: f.ok ? t.greenText : t.textFaint,
                      border: `1px solid ${f.ok ? t.greenBorder : t.border}`,
                    }}>
                      {f.ok ? '✓' : '✕'}
                    </div>
                    <span style={{ fontSize: 12, color: f.ok ? t.text : t.textFaint }}>{f.texto}</span>
                  </div>
                ))}
              </div>
            </div>
          </Seccion>

          {/* ── Sección 5: Cerrar sesión ── */}
          <div style={{ background: t.red, border: `1px solid ${t.redBorder}`, borderRadius: 16, padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.redNum }}>Cerrar sesión</div>
              <div style={{ fontSize: 11, color: t.redNum, opacity: 0.7, marginTop: 2 }}>Se cerrará tu sesión en este dispositivo</div>
            </div>
            <button
              onClick={hook.cerrarSesion}
              style={{ padding: '8px 18px', borderRadius: 9, border: `1.5px solid ${t.redNum}`, background: 'transparent', color: t.redNum, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Cerrar sesión
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}