import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// ── UTILIDADES ───────────────────────────────────────────────────────────────

// Fix 1: numeric(15,2) de Supabase llega como string → siempre parseFloat
const toFloat = (v) => parseFloat(v) || 0;
const formatPeso = (n) => `$${toFloat(n).toLocaleString("es-AR")}`;

// Fix 2: Semáforo de morosidad — lógica centralizada
// Refleja: cuotas.estado + cuotas.fecha_vencimiento vs hoy
const getSemaforo = (cuota) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(cuota.fecha_vencimiento);
  if (cuota.estado === "pagada") return "pagada";
  if (venc < hoy)               return "vencida";   // rojo
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  if (venc <= manana)           return "hoy";        // amarillo
  return "pendiente";                                // gris
};

const semaforoColor = (s, t) => ({
  pagada:   { bg: t.green,  border: t.greenBorder,  text: t.greenText,  label: "✓ cobrado"  },
  vencida:  { bg: t.red,    border: t.redBorder,    text: t.redNum,     label: "vencida"    },
  hoy:      { bg: t.amber,  border: t.amberBorder,  text: t.amberSub,   label: "hoy"        },
  pendiente:{ bg: t.surfaceAlt, border: t.borderLight, text: t.textMuted, label: "pendiente" },
}[s] || {});

// ── MOCK DATA — simula respuesta de Supabase ─────────────────────────────────
// Nota: montos como STRING tal como llegan de numeric(15,2) en Postgres
const mockUsuario = { nombre: "Juan", negocio: "Ropa Urbana JS", tier: "Pro", avatar: "JS" };

const mockCuotas = [
  { id: "1", cliente: "María González", avatar: "MG", monto: "8500.00",  numero_cuota: 3, cant_cuotas: 6, hora: "10:00", estado: "pendiente", fecha_vencimiento: new Date().toISOString().slice(0,10), zona: "Centro"       },
  { id: "2", cliente: "Carlos Rivas",   avatar: "CR", monto: "12000.00", numero_cuota: 1, cant_cuotas: 3, hora: "11:30", estado: "pendiente", fecha_vencimiento: new Date().toISOString().slice(0,10), zona: "Barrio Norte" },
  { id: "3", cliente: "Laura Mendez",   avatar: "LM", monto: "5200.00",  numero_cuota: 5, cant_cuotas: 6, hora: "09:00", estado: "pagada",    fecha_vencimiento: new Date().toISOString().slice(0,10), zona: "Centro"       },
  { id: "4", cliente: "Diego Herrera",  avatar: "DH", monto: "9800.00",  numero_cuota: 2, cant_cuotas: 4, hora: "16:00", estado: "pendiente", fecha_vencimiento: (() => { const d = new Date(); d.setDate(d.getDate()-2); return d.toISOString().slice(0,10); })(), zona: "Sur" },
];

const mockStock = [
  { producto: "Remera básica T.M", stock_actual: "3",  stock_minimo: "10" },
  { producto: "Jean slim 32",      stock_actual: "1",  stock_minimo: "5"  },
  { producto: "Campera de abrigo", stock_actual: "0",  stock_minimo: "8"  },
];

const mockVentas = [
  { dia: "Lun", ventas: "42500.00", cobros: "18000.00" },
  { dia: "Mar", ventas: "31200.00", cobros: "24500.00" },
  { dia: "Mié", ventas: "58900.00", cobros: "31000.00" },
  { dia: "Jue", ventas: "27400.00", cobros: "15500.00" },
  { dia: "Vie", ventas: "74100.00", cobros: "42000.00" },
  { dia: "Sáb", ventas: "89300.00", cobros: "28000.00" },
  { dia: "Hoy", ventas: "65000.00", cobros: "35000.00" },
];

const mockSpark = [{ v: 42 }, { v: 31 }, { v: 58 }, { v: 27 }, { v: 74 }, { v: 89 }, { v: 65 }];

const mockFinPersonal = {
  retiro_negocio: "180000.00",
  gastos:         "124500.00",
  ahorro:         "55500.00",
  pct_dependencia: 75,
};

// ── TEMA ─────────────────────────────────────────────────────────────────────
const tema = {
  light: {
    bg: "#fafaf8", surface: "#ffffff", surfaceAlt: "#f5f5f2",
    border: "#e8e8e4", borderLight: "#f0f0ec",
    text: "#111827", textMuted: "#6b7280", textFaint: "#9ca3af",
    hero: "#111827", heroText: "#ffffff", heroSub: "#6b7280",
    accent: "#111827", sparkLine: "#a3e635", chartGrid: "#f3f4f6",
    amber: "#fffbeb", amberBorder: "#fde68a", amberText: "#92400e", amberNum: "#111827", amberSub: "#d97706",
    red: "#fff1f2", redBorder: "#fecdd3", redText: "#9f1239", redNum: "#dc2626",
    green: "#f0fdf4", greenBorder: "#bbf7d0", greenText: "#166534",
    navBg: "rgba(255,255,255,0.92)", shadow: "0 1px 4px rgba(0,0,0,0.06)", shadowMd: "0 4px 16px rgba(0,0,0,0.08)",
    skeletonBase: "#ebebeb", skeletonShine: "#f5f5f5",
  },
  dark: {
    bg: "#141210", surface: "#1c1916", surfaceAlt: "#211e1b",
    border: "#2e2924", borderLight: "#252019",
    text: "#e8e0d4", textMuted: "#7a6e62", textFaint: "#4a4238",
    hero: "#1c1916", heroText: "#e8e0d4", heroSub: "#5a5044",
    accent: "#d4a96a", sparkLine: "#d4a96a", chartGrid: "#252019",
    amber: "#1f1a0e", amberBorder: "#3d3010", amberText: "#a87d30", amberNum: "#fcd34d", amberSub: "#a87d30",
    red: "#1f0e0e", redBorder: "#3d1010", redText: "#7a2222", redNum: "#f87171",
    green: "#0e1f12", greenBorder: "#1a3820", greenText: "#4a7a54",
    navBg: "rgba(20,18,16,0.95)", shadow: "0 1px 6px rgba(0,0,0,0.4)", shadowMd: "0 4px 20px rgba(0,0,0,0.5)",
    skeletonBase: "#211e1b", skeletonShine: "#2e2924",
  },
};

// ── SKELETON ─────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 16, radius = 6, t }) {
  return (
    <div style={{ width: w, height: h, borderRadius: radius, background: t.skeletonBase, overflow: "hidden", position: "relative" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(90deg, transparent 0%, ${t.skeletonShine} 50%, transparent 100%)`,
        animation: "shimmer 1.4s infinite",
      }} />
    </div>
  );
}

function SkeletonCard({ t }) {
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "14px 16px" }}>
      <Skeleton w="60%" h={11} t={t} />
      <div style={{ marginTop: 10 }}><Skeleton w="80%" h={22} t={t} /></div>
      <div style={{ marginTop: 8 }}><Skeleton w="50%" h={11} t={t} /></div>
    </div>
  );
}

// ── CONFIRM MODAL (cobro rápido) ─────────────────────────────────────────────
function ConfirmCobro({ cuota, onConfirm, onCancel, t, dark }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 22, padding: "28px 24px", maxWidth: 340, width: "100%",
        boxShadow: t.shadowMd, animation: "popIn 0.18s ease",
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.text, letterSpacing: "-0.3px" }}>Confirmar cobro</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>{cuota.cliente}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.accent, fontFamily: "'DM Mono', monospace", letterSpacing: "-1px", marginTop: 10 }}>
            {formatPeso(cuota.monto)}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>Cuota {cuota.numero_cuota}/{cuota.cant_cuotas}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.surfaceAlt, color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(cuota.id)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: t.accent, color: dark ? "#141210" : "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            ✓ Cobrado
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BADGE + AVATAR ────────────────────────────────────────────────────────────
const Badge = ({ children, color, bg, border }) => (
  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: bg, color, border: border ? `1px solid ${border}` : "none", letterSpacing: "0.04em" }}>{children}</span>
);

const Avatar = ({ initials, size = 36, t }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: t.surfaceAlt, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.27, fontWeight: 700, color: t.textMuted, flexShrink: 0 }}>
    {initials}
  </div>
);

// ── CUSTOM TOOLTIP ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, t }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: t.shadowMd }}>
      <p style={{ color: t.textMuted, fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 12, fontWeight: 700, margin: "2px 0" }}>
          {p.name}: {formatPeso(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── FILA DE COBRO (reutilizable mobile + desktop) ─────────────────────────────
function CuotaRow({ cuota, onCheck, t, dark, compact = false }) {
  const sem = getSemaforo(cuota);
  const col = semaforoColor(sem, t);
  const pad = compact ? "7px 8px" : "9px 10px";
  const radius = compact ? 10 : 12;

  return (
    <div
      onDoubleClick={() => sem !== "pagada" && onCheck(cuota)}
      title={sem !== "pagada" ? "Doble clic para registrar cobro" : ""}
      style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 10, padding: pad, borderRadius: radius, background: col.bg, border: `1px solid ${col.border}`, cursor: sem !== "pagada" ? "pointer" : "default", transition: "opacity 0.15s", userSelect: "none" }}
    >
      <Avatar initials={cuota.avatar} size={compact ? 30 : 36} t={t} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? 11 : 12, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cuota.cliente}</div>
        <div style={{ fontSize: 9, color: t.textFaint }}>Cuota {cuota.numero_cuota}/{cuota.cant_cuotas} · {cuota.hora}hs</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: t.text, fontFamily: "'DM Mono', monospace" }}>{formatPeso(cuota.monto)}</div>
        <Badge color={col.text} bg={col.bg} border={col.border}>{col.label}</Badge>
      </div>
      {sem !== "pagada" && (
        <button
          onClick={(e) => { e.stopPropagation(); onCheck(cuota); }}
          title="Registrar cobro"
          style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${col.border}`, background: col.bg, color: col.text, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >✓</button>
      )}
    </div>
  );
}

// ── INDICADOR DE CONEXIÓN ─────────────────────────────────────────────────────
function ConexionDot({ status }) {
  const colors = { online: "#4ade80", syncing: "#f59e0b", offline: "#ef4444" };
  const labels = { online: "Conectado", syncing: "Sincronizando…", offline: "Sin conexión" };
  return (
    <div title={labels[status]} style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: colors[status],
        boxShadow: status === "online" ? `0 0 6px ${colors[status]}` : "none",
        animation: status === "syncing" ? "pulse 1s infinite" : "none",
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function MobileView({ dark, setDark, cuotas, setCuotas, loading, conexion }) {
  const t = dark ? tema.dark : tema.light;
  const [confirmCuota, setConfirmCuota] = useState(null);

  const pendientes = cuotas.filter(c => getSemaforo(c) !== "pagada");
  const totalPendiente = pendientes.reduce((s, c) => s + toFloat(c.monto), 0);
  const vencidas = cuotas.filter(c => getSemaforo(c) === "vencida");
  const montoVencido = vencidas.reduce((s, c) => s + toFloat(c.monto), 0);

  const handleConfirm = useCallback(async (id) => {
  try {
    await registrarCobro(id)   // UPDATE real en Supabase + optimistic update
    setConfirmCuota(null)
  } catch (err) {
    console.error('Error al registrar cobro:', err)
  }
}, [registrarCobro])

  return (
    <div style={{ background: t.bg, minHeight: "100%", fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 90, transition: "background 0.25s" }}>

      {confirmCuota && <ConfirmCobro cuota={confirmCuota} onConfirm={handleConfirm} onCancel={() => setConfirmCuota(null)} t={t} dark={dark} />}

      {/* Header */}
      <div style={{ padding: "48px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: t.textFaint, marginBottom: 2 }}>lun · 3 de marzo</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: t.text, letterSpacing: "-0.4px" }}>Hola, {mockUsuario.nombre} 👋</div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{mockUsuario.negocio}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
          <ConexionDot status={conexion} />
          <button onClick={() => setDark(!dark)} style={{ width: 33, height: 33, borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, cursor: "pointer", color: t.textMuted, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {dark ? "☀" : "☾"}
          </button>
          <div style={{ width: 33, height: 33, borderRadius: 10, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "#141210" : "#fff", fontSize: 11, fontWeight: 800 }}>
            {mockUsuario.avatar}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Hero card compacta */}
        {loading ? <SkeletonCard t={t} /> : (
          <div style={{ background: t.hero, borderRadius: 20, padding: "18px 20px", boxShadow: t.shadowMd, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, color: dark ? t.heroSub : "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Caja hoy</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: t.heroText, fontFamily: "'DM Mono', monospace", letterSpacing: "-1.5px", lineHeight: 1 }}>$74.100</div>
                <div style={{ fontSize: 11, color: t.sparkLine, marginTop: 5, fontWeight: 600 }}>↑ +18% vs ayer</div>
              </div>
              <div style={{ width: 88, height: 48 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockSpark}>
                    <Line type="monotone" dataKey="v" stroke={t.sparkLine} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 20 }}>
              {[["Este mes", "$335.800"], ["Ventas", "47"], ["Ticket prom.", "$7.145"]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: dark ? "#5a5044" : "#9ca3af" }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: dark ? "#a89880" : "#374151", fontFamily: "'DM Mono', monospace" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <SkeletonCard t={t} /><SkeletonCard t={t} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: t.amber, border: `1.5px solid ${t.amberBorder}`, borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>⏰</div>
              <div style={{ fontSize: 10, color: t.amberText, fontWeight: 500 }}>Vencimientos</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: t.amberNum, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.5px", marginTop: 2 }}>{formatPeso(totalPendiente)}</div>
              <div style={{ fontSize: 10, color: t.amberSub, marginTop: 3, fontWeight: 600 }}>{pendientes.length} cobros hoy</div>
            </div>
            <div style={{ background: t.red, border: `1.5px solid ${t.redBorder}`, borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>🚨</div>
              <div style={{ fontSize: 10, color: t.redText, fontWeight: 500 }}>Morosos</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: t.redNum, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.5px", marginTop: 2 }}>{formatPeso(montoVencido || 18500)}</div>
              <div style={{ fontSize: 10, color: t.redNum, marginTop: 3, fontWeight: 600 }}>{vencidas.length || 2} clientes</div>
            </div>
          </div>
        )}

        {/* Cobros del día */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18, padding: "16px", boxShadow: t.shadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Cobros de hoy</span>
            <span style={{ fontSize: 10, color: t.textMuted }}>doble clic = cobrar</span>
          </div>
          {loading
            ? [1, 2, 3].map(i => <div key={i} style={{ marginBottom: 8 }}><Skeleton h={52} radius={12} t={t} /></div>)
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cuotas.map(c => <CuotaRow key={c.id} cuota={c} onCheck={setConfirmCuota} t={t} dark={dark} />)}
              </div>
          }
        </div>

        {/* Acciones — Fix 3: zIndex > bottom nav */}
        <div style={{ display: "flex", gap: 10, position: "relative", zIndex: 20 }}>
          <button style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: t.accent, color: dark ? "#141210" : "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            ＋ Nueva venta
          </button>
          <button style={{ flex: 1, padding: "14px", borderRadius: 14, border: `1.5px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            ✓ Cobrar
          </button>
        </div>
      </div>

      {/* Bottom nav — Fix 3: zIndex 10, menor que botones */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, background: t.navBg, backdropFilter: "blur(16px)", borderTop: `1px solid ${t.border}`, padding: "10px 0 24px", display: "flex", justifyContent: "space-around" }}>
        {[["⊞","Inicio",true],["↗","Ventas"],["◎","Cobros"],["▦","Stock"],["≋","Más"]].map(([icon, label, active]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}>
            <div style={{ fontSize: 18, color: active ? t.accent : t.textFaint }}>{icon}</div>
            <div style={{ fontSize: 9, color: active ? t.accent : t.textFaint, fontWeight: active ? 700 : 400 }}>{label}</div>
            {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: t.accent }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESKTOP VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function DesktopView({ dark, setDark, cuotas, setCuotas, loading, conexion }) {
  const t = dark ? tema.dark : tema.light;
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [confirmCuota, setConfirmCuota] = useState(null);

  const pendientes = cuotas.filter(c => getSemaforo(c) !== "pagada");
  const totalPendiente = pendientes.reduce((s, c) => s + toFloat(c.monto), 0);

  const handleConfirm = useCallback(async (id) => {
  try {
    await registrarCobro(id)   // UPDATE real en Supabase + optimistic update
    setConfirmCuota(null)
  } catch (err) {
    console.error('Error al registrar cobro:', err)
  }
}, [registrarCobro])

  const navItems = [
    ["dashboard","Dashboard","⊞"], ["ventas","Ventas","↗"], ["cobranzas","Cobranzas","◎"],
    ["stock","Stock","▦"], ["finanzas","Finanzas","≋"], ["personal","Personal","◉"], ["reportes","Reportes","⊟"],
  ];

  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, fontFamily: "'DM Sans', system-ui, sans-serif", transition: "background 0.25s" }}>
      {confirmCuota && <ConfirmCobro cuota={confirmCuota} onConfirm={handleConfirm} onCancel={() => setConfirmCuota(null)} t={t} dark={dark} />}

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 196 : 52, background: t.surface, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", transition: "width 0.22s ease", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "16px 12px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8, minHeight: 54 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "#141210" : "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>F</div>
          {sidebarOpen && <span style={{ color: t.text, fontWeight: 800, fontSize: 15, letterSpacing: "-0.4px", whiteSpace: "nowrap" }}>finti</span>}
          <div style={{ marginLeft: "auto", cursor: "pointer", color: t.textMuted, fontSize: 13, flexShrink: 0 }} onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? "←" : "→"}</div>
        </div>
        <nav style={{ flex: 1, padding: "8px 5px", display: "flex", flexDirection: "column", gap: 1 }}>
          {navItems.map(([id, label, icon]) => (
            <button key={id} onClick={() => setActiveNav(id)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "8px 7px", borderRadius: 7, border: "none",
              background: activeNav === id ? t.surfaceAlt : "transparent",
              borderLeft: `2px solid ${activeNav === id ? t.accent : "transparent"}`,
              color: activeNav === id ? t.accent : t.textMuted,
              cursor: "pointer", transition: "all 0.12s", width: "100%", textAlign: "left",
              fontSize: 11, fontWeight: activeNav === id ? 700 : 400, whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: 14, width: 16, textAlign: "center", flexShrink: 0 }}>{icon}</span>
              {sidebarOpen && label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "8px 5px", borderTop: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 4 }}>
          <button onClick={() => setDark(!dark)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 7px", borderRadius: 7, border: "none", background: t.surfaceAlt, color: t.textMuted, cursor: "pointer", fontSize: 11, width: "100%", whiteSpace: "nowrap" }}>
            <span style={{ width: 16, textAlign: "center", fontSize: 12 }}>{dark ? "☀" : "☾"}</span>
            {sidebarOpen && (dark ? "Modo claro" : "Oscuro")}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 7px", cursor: "pointer", position: "relative" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "#141210" : "#fff", fontSize: 9, fontWeight: 800 }}>{mockUsuario.avatar}</div>
              <div style={{ position: "absolute", bottom: -1, right: -1 }}><ConexionDot status={conexion} /></div>
            </div>
            {sidebarOpen && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.text }}>{mockUsuario.nombre} Silva</div>
                <div style={{ fontSize: 9, color: t.textMuted }}>{mockUsuario.tier} · {mockUsuario.negocio}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ height: 54, background: t.surface, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 14, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Buenos días, {mockUsuario.nombre} 👋</div>
            <div style={{ fontSize: 10, color: t.textMuted }}>Lunes 3 de marzo · {pendientes.length} cobros pendientes hoy</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <ConexionDot status={conexion} />
            <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 11px", color: t.textMuted, fontSize: 11 }}>🔍 Buscar...</div>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: t.surfaceAlt, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
              🔔
              <div style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: "50%", background: t.redNum, border: `1.5px solid ${t.surface}` }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {loading ? [1,2,3,4].map(i => <SkeletonCard key={i} t={t} />) : [
              { label: "Caja hoy", value: "$74.100", sub: "↑ +18% vs ayer", subColor: "#4ade80", icon: "💰", topColor: t.accent },
              { label: "Vencimientos", value: formatPeso(totalPendiente), sub: `${pendientes.length} cobros pendientes`, subColor: t.amberSub, icon: "⏰", topColor: t.amberSub, bg: t.amber, border: t.amberBorder },
              { label: "Morosos", value: "$18.500", sub: "2 clientes en mora", subColor: t.redNum, icon: "🚨", topColor: t.redNum, bg: t.red, border: t.redBorder },
              { label: "Stock crítico", value: "3 items", sub: "Reposición urgente", subColor: t.amberSub, icon: "▦", topColor: t.amberSub },
            ].map((k, i) => (
              <div key={i} style={{ background: k.bg || t.surface, border: `1px solid ${k.border || t.border}`, borderRadius: 13, padding: "13px 15px", boxShadow: t.shadow, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: k.topColor, borderRadius: "13px 13px 0 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>{k.label}</div>
                  <div style={{ fontSize: 16 }}>{k.icon}</div>
                </div>
                <div style={{ fontSize: 21, fontWeight: 800, color: t.text, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.5px", marginTop: 5 }}>{k.value}</div>
                <div style={{ fontSize: 10, color: k.subColor, marginTop: 2, fontWeight: 600 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Chart + Cobros */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 13, padding: "16px", boxShadow: t.shadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>Ventas y Cobros</div>
                  <div style={{ fontSize: 10, color: t.textMuted }}>Últimos 7 días</div>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
                  {[["Ventas", t.accent], ["Cobros", t.amberSub]].map(([n, c]) => (
                    <span key={n} style={{ color: c, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 8, height: 3, borderRadius: 2, background: c, display: "inline-block" }} />{n}
                    </span>
                  ))}
                </div>
              </div>
              {loading ? <Skeleton h={150} t={t} /> : (
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={mockVentas.map(d => ({ ...d, ventas: toFloat(d.ventas), cobros: toFloat(d.cobros) }))}>
                    <defs>
                      <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={t.accent} stopOpacity={dark ? 0.22 : 0.12} />
                        <stop offset="95%" stopColor={t.accent} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={t.amberSub} stopOpacity={dark ? 0.18 : 0.1} />
                        <stop offset="95%" stopColor={t.amberSub} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                    <XAxis dataKey="dia" tick={{ fill: t.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: t.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={34} />
                    <Tooltip content={<ChartTooltip t={t} />} />
                    <Area type="monotone" dataKey="ventas" name="Ventas" stroke={t.accent} strokeWidth={1.8} fill="url(#gV)" />
                    <Area type="monotone" dataKey="cobros" name="Cobros" stroke={t.amberSub} strokeWidth={1.8} fill="url(#gC)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 13, padding: "14px", boxShadow: t.shadow, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>Cobros de hoy</span>
                <span style={{ fontSize: 9, color: t.textMuted }}>2× clic = cobrar</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {loading
                  ? [1,2,3,4].map(i => <Skeleton key={i} h={46} radius={10} t={t} />)
                  : cuotas.map(c => <CuotaRow key={c.id} cuota={c} onCheck={setConfirmCuota} t={t} dark={dark} compact />)
                }
              </div>
            </div>
          </div>

          {/* Stock + Finanzas personales */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 13, padding: "14px", boxShadow: t.shadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>Stock crítico</span>
                <Badge color={t.redNum} bg={t.red} border={t.redBorder}>3 items</Badge>
              </div>
              {loading ? [1,2,3].map(i => <div key={i} style={{ marginBottom: 10 }}><Skeleton h={32} t={t} /></div>) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {mockStock.map((s, i) => {
                    const actual = toFloat(s.stock_actual), minimo = toFloat(s.stock_minimo);
                    const pct = Math.min((actual / minimo) * 100, 100);
                    const color = actual === 0 ? t.redNum : t.amberSub;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: color, boxShadow: `0 0 5px ${color}` }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: t.text }}>{s.producto}</div>
                          <div style={{ height: 3, borderRadius: 2, background: t.border, marginTop: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: color }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{actual}/{minimo}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ background: t.green, border: `1px solid ${t.greenBorder}`, borderRadius: 13, padding: "14px", boxShadow: t.shadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.greenText }}>Finanzas personales</div>
                  <div style={{ fontSize: 9, color: t.greenText, opacity: 0.7 }}>v_salud_financiera_personal · Marzo 2026</div>
                </div>
                <Badge color={t.greenText} bg={t.greenBorder}>◉ PERSONAL</Badge>
              </div>
              {[
                { label: "Retiro del negocio", value: mockFinPersonal.retiro_negocio, pct: 75 },
                { label: "Gastos del mes",     value: mockFinPersonal.gastos,         pct: 52 },
                { label: "Ahorro acumulado",   value: mockFinPersonal.ahorro,         pct: 30 },
              ].map((row, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: t.greenText }}>{row.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.greenText, fontFamily: "'DM Mono', monospace" }}>{formatPeso(row.value)}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: t.greenBorder, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${row.pct}%`, borderRadius: 2, background: t.greenText, opacity: 0.5 }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: t.greenBorder, fontSize: 10, color: t.greenText }}>
                📊 El <strong>{mockFinPersonal.pct_dependencia}%</strong> de tus ingresos vienen del negocio
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — simula ciclo de vida con Supabase
// ═══════════════════════════════════════════════════════════════════════════════
export default function FintiApp() {
  const [dark, setDark] = useState(false);
  const [view, setView] = useState("both");
  const {
  cuotasHoy,
  setCuotasHoy,    // para optimistic update
  loading,
  conexion,
  cajaHoy,
  cajaMes,
  ventasMes,
  ventasSemana,
  stockCritico,
  saludPersonal,
  registrarCobro,
} = useDashboard()

  // Simula fetch desde Supabase con delay realista
  useEffect(() => {
    setLoading(true);
    setConexion("syncing");
    const t = setTimeout(() => {
      setCuotas(mockCuotas);
      setLoading(false);
      setConexion("online");
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#111", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes popIn   { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #33302a; border-radius: 4px; }
      `}</style>

      {/* Toolbar */}
      <div style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "7px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: dark ? "#d4a96a" : "#111827", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800 }}>F</div>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>finti</span>
        <span style={{ color: "#444", fontSize: 11 }}>— dashboard v2</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {[["both","📱 + 🖥"],["mobile","📱"],["desktop","🖥"]].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} style={{ padding: "4px 10px", borderRadius: 7, border: "none", cursor: "pointer", background: view === id ? "#fff" : "rgba(255,255,255,0.08)", color: view === id ? "#111" : "#888", fontSize: 11, fontWeight: view === id ? 700 : 400 }}>{label}</button>
          ))}
          <button onClick={() => setDark(!dark)} style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid #333", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer" }}>
            {dark ? "☀ Claro" : "☾ Oscuro"}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {(view === "both" || view === "mobile") && (
          <div style={{ width: view === "mobile" ? "100%" : 370, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", padding: 16, flexShrink: 0 }}>
            <div style={{ width: 350, height: "100%", maxHeight: 690, borderRadius: 34, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.4), 0 0 0 6px #2a2a2a, 0 0 0 8px #333", position: "relative" }}>
              <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
                <MobileView dark={dark} setDark={setDark} cuotas={cuotas} setCuotas={setCuotas} loading={loading} conexion={conexion} />
              </div>
            </div>
          </div>
        )}
        {(view === "both" || view === "desktop") && (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <DesktopView dark={dark} setDark={setDark} cuotas={cuotas} setCuotas={setCuotas} loading={loading} conexion={conexion} />
          </div>
        )}
      </div>
    </div>
  );
}