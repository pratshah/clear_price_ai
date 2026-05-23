'use client'

import { useEffect, useRef, useState } from 'react'

const CHARTS_BASE_URL = process.env.NEXT_PUBLIC_ATLAS_CHARTS_BASE_URL ?? ''
const CHART_PRICE_HISTOGRAM = process.env.NEXT_PUBLIC_CHART_PRICE_HISTOGRAM_ID ?? ''
const CHART_PAYER_BREAKDOWN = process.env.NEXT_PUBLIC_CHART_PAYER_BREAKDOWN_ID ?? ''
const CHART_PRICE_TREND = process.env.NEXT_PUBLIC_CHART_PRICE_TREND_ID ?? ''

interface InsightsPanelProps {
  procedureCode: string | null
  codeType: string | null
}

interface ChartInstance {
  render(el: HTMLElement): Promise<void>
  setFilter(filter: Record<string, unknown>): Promise<void>
}

interface ChartsSDK {
  createChart(opts: { chartId: string; height: string; width: string; theme?: string }): ChartInstance
}

function ChartFrame({ chartId, title, filter }: { chartId: string; title: string; filter: Record<string, unknown> }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ChartInstance | null>(null)
  const sdkRef = useRef<ChartsSDK | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!CHARTS_BASE_URL || !chartId || !containerRef.current) {
      setStatus('error')
      return
    }

    let cancelled = false
    async function init() {
      try {
        // Dynamic import — browser only, avoid SSR
        const mod = await import('@mongodb-js/charts-embed-dom')
        const ChartsEmbedSDK = mod.default
        if (cancelled) return

        if (!sdkRef.current) {
          sdkRef.current = new ChartsEmbedSDK({ baseUrl: CHARTS_BASE_URL }) as ChartsSDK
        }

        const chart = sdkRef.current.createChart({
          chartId,
          height: '280px',
          width: '100%',
          theme: 'light',
        })
        chartRef.current = chart

        if (containerRef.current && !cancelled) {
          await chart.render(containerRef.current)
          setStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[InsightsPanel] chart error:', err)
          setStatus('error')
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [chartId])

  // Re-filter when procedure changes
  useEffect(() => {
    if (chartRef.current && status === 'ready' && Object.keys(filter).length > 0) {
      chartRef.current.setFilter(filter).catch(() => {})
    }
  }, [filter, status])

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{title}</span>
        {status === 'ready' && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Live
          </span>
        )}
      </div>
      <div className="relative" style={{ minHeight: 280 }}>
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading chart…</span>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 px-6">
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
              <p className="text-xs text-slate-400">
                Configure <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_ATLAS_CHARTS_BASE_URL</code> and chart IDs to enable live Atlas Charts.
              </p>
            </div>
          </div>
        )}
        <div ref={containerRef} className={status !== 'ready' ? 'invisible h-[280px]' : 'h-[280px]'} />
      </div>
    </div>
  )
}

export default function InsightsPanel({ procedureCode, codeType }: InsightsPanelProps) {
  const filter = procedureCode
    ? { procedure_code: procedureCode, procedure_code_type: codeType ?? 'DRG' }
    : {}

  const configured = Boolean(CHARTS_BASE_URL)

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

      {/* Price Distribution Histogram */}
      <ChartFrame
        chartId={CHART_PRICE_HISTOGRAM}
        title="National Price Distribution"
        filter={filter}
      />

      {/* Two-column row */}
      <div className="grid grid-cols-2 gap-4">
        <ChartFrame
          chartId={CHART_PAYER_BREAKDOWN}
          title="Payer Breakdown"
          filter={filter}
        />
        <ChartFrame
          chartId={CHART_PRICE_TREND}
          title="Price Trend"
          filter={filter}
        />
      </div>

      {/* Setup instructions if not configured */}
      {!configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-2">
          <p className="font-semibold">To enable live Atlas Charts:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to MongoDB Atlas → Charts → Create Dashboard</li>
            <li>Create 3 charts: Price Distribution (bar), Payer Breakdown (donut), Price Trend (line)</li>
            <li>Enable embedding: Charts → Embed → Unauthenticated</li>
            <li>Add to <code className="bg-amber-100 px-1 rounded">.env</code>:
              <pre className="mt-1 bg-amber-100 rounded p-2 overflow-x-auto">{`NEXT_PUBLIC_ATLAS_CHARTS_BASE_URL=https://charts.mongodb.com/charts-xxx
NEXT_PUBLIC_CHART_PRICE_HISTOGRAM_ID=<chart-id>
NEXT_PUBLIC_CHART_PAYER_BREAKDOWN_ID=<chart-id>
NEXT_PUBLIC_CHART_PRICE_TREND_ID=<chart-id>`}</pre>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}
