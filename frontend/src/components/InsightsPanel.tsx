'use client'

const CHARTS_BASE_URL = process.env.NEXT_PUBLIC_ATLAS_CHARTS_BASE_URL ?? ''
const DASHBOARD_ID = process.env.NEXT_PUBLIC_ATLAS_DASHBOARD_ID ?? ''

interface InsightsPanelProps {
  procedureCode: string | null
  codeType: string | null
}

export default function InsightsPanel({ procedureCode, codeType }: InsightsPanelProps) {
  const configured = Boolean(CHARTS_BASE_URL) && Boolean(DASHBOARD_ID)

  const src = configured
    ? `${CHARTS_BASE_URL}/embed/dashboards?id=${DASHBOARD_ID}&theme=light&autoRefresh=true&maxDataAge=3600&showTitleAndDesc=false&scalingWidth=fixed&scalingHeight=fixed`
    : ''

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Market Insights</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {procedureCode
              ? `Showing national data for ${codeType} ${procedureCode}`
              : 'Ask about a procedure to filter these charts'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          <span className={`w-1.5 h-1.5 rounded-full ${configured ? 'bg-green-400' : 'bg-amber-400'}`} />
          {configured ? 'Atlas Charts' : 'Atlas Charts (unconfigured)'}
        </div>
      </div>

      {configured ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white" style={{ height: 500 }}>
          <iframe
            src={src}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="MongoDB Atlas Charts Dashboard"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-2">
          <p className="font-semibold">To enable live Atlas Charts:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to MongoDB Atlas → Charts → Embed Dashboard</li>
            <li>Enable unauthenticated access and copy the dashboard ID</li>
            <li>Add to your <code className="bg-amber-100 px-1 rounded">.env</code>:
              <pre className="mt-1 bg-amber-100 rounded p-2 overflow-x-auto">{`NEXT_PUBLIC_ATLAS_CHARTS_BASE_URL=https://charts.mongodb.com/charts-YOUR-ID
NEXT_PUBLIC_ATLAS_DASHBOARD_ID=<dashboard-id>`}</pre>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}
