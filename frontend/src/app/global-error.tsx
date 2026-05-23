'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <p style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>global error</p>
          <h2 style={{ marginBottom: 16 }}>Something went wrong</h2>
          <button onClick={reset} style={{ background: '#1B4FE8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
