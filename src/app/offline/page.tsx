'use client'

// src/app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#141210',
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: '#e8e0d4',
      gap: '16px',
      padding: '20px',
      textAlign: 'center'
    }}>
      <style>{`
        .finti-icon {
          width: 72px; height: 72px; border-radius: 20px;
          background: #1c1916; border: 1.5px solid #2e2924;
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 800; color: #d4a96a;
          margin-bottom: 8px;
        }
        h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; margin: 0; }
        p  { font-size: 14px; color: #7a6e62; max-width: 280px; line-height: 1.5; margin: 0; }
        .retry-button {
          margin-top: 8px;
          padding: 12px 24px; border-radius: 12px;
          border: none; background: #d4a96a; color: #141210;
          font-size: 14px; font-weight: 700; cursor: pointer;
        }
      `}</style>

      <div className="finti-icon">F</div>
      <h1>Sin conexión</h1>
      <p>Finti necesita internet para sincronizar tus datos. Revisá tu conexión y volvé a intentar.</p>
      
      <button 
        className="retry-button"
        onClick={() => window.location.reload()}
      >
        Reintentar
      </button>
    </div>
  )
}