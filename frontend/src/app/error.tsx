'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-slate-500 text-sm font-mono mb-2">error</div>
        <h2 className="text-white text-xl font-semibold mb-2">{error.message || 'Something went wrong'}</h2>
        <button onClick={reset} className="mt-4 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
          Try again
        </button>
      </div>
    </div>
  )
}
