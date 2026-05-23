'use client'

import { useState, useCallback, useRef } from 'react'
import ChatInterface from '../../components/ChatInterface'
import PriceTable, { HospitalPrice } from '../../components/PriceTable'
import HospitalMap, { Hospital } from '../../components/HospitalMap'
import InsightsPanel from '../../components/InsightsPanel'
import FreshnessBadge from '../../components/FreshnessBadge'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

type Tab = 'map' | 'table' | 'insights'

function extractZip(text: string): string | null {
  const m = text.match(/\b(\d{5})\b/)
  return m ? m[1] : null
}

// Try to extract an explicit DRG/APC code from agent text first
function extractExplicitCode(text: string): { code: string; type: 'DRG' | 'APC' } | null {
  const m = text.match(/\b(DRG|APC)\s+(?:codes?\s+)?(\d{3,4})/i)
  if (m) return { code: m[2], type: m[1].toUpperCase() as 'DRG' | 'APC' }
  return null
}

// Keyword → DRG/APC code mapping for the most common procedures
const PROCEDURE_MAP: Array<{ terms: string[]; code: string; type: 'DRG' | 'APC' }> = [
  { terms: ['knee replacement', 'knee arthroplasty', 'tka', 'tkr'], code: '470', type: 'DRG' },
  { terms: ['hip replacement', 'hip arthroplasty', 'tha', 'thr'], code: '469', type: 'DRG' },
  { terms: ['hip revision', 'knee revision'], code: '467', type: 'DRG' },
  { terms: ['colonoscopy'], code: '0074', type: 'APC' },
  { terms: ['cardiac bypass', 'cabg', 'bypass surgery', 'coronary bypass'], code: '231', type: 'DRG' },
  { terms: ['c-section', 'caesarean', 'cesarean'], code: '370', type: 'DRG' },
  { terms: ['spinal fusion', 'spine fusion', 'lumbar fusion'], code: '460', type: 'DRG' },
  { terms: ['pneumonia'], code: '194', type: 'DRG' },
  { terms: ['stroke', 'hemorrhagic stroke'], code: '065', type: 'DRG' },
  { terms: ['hip fracture', 'femur fracture'], code: '536', type: 'DRG' },
  { terms: ['appendectomy'], code: '0042', type: 'APC' },
  { terms: ['mri', 'magnetic resonance'], code: '0265', type: 'APC' },
  { terms: ['ct scan', 'cat scan', 'computed tomography'], code: '0332', type: 'APC' },
  { terms: ['cataract'], code: '0240', type: 'APC' },
  { terms: ['gallbladder', 'cholecystectomy'], code: '417', type: 'DRG' },
  { terms: ['hysterectomy'], code: '742', type: 'DRG' },
  { terms: ['hernia'], code: '0042', type: 'APC' },
  { terms: ['chemotherapy', 'chemo'], code: '0673', type: 'APC' },
]

function inferProcedureCode(text: string): { code: string; type: 'DRG' | 'APC' } | null {
  const lower = text.toLowerCase()
  for (const { terms, code, type } of PROCEDURE_MAP) {
    if (terms.some((t) => lower.includes(t))) return { code, type }
  }
  return null
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('map')
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [prices, setPrices] = useState<HospitalPrice[]>([])
  const [pricesMeta, setPricesMeta] = useState<{ procedure_code: string; code_type: string; national_median: number | null } | null>(null)
  const [insightsProcedure, setInsightsProcedure] = useState<{ code: string; type: string } | null>(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [medicarePlan, setMedicarePlan] = useState<'original' | 'plan_g' | 'plan_f' | 'uninsured'>('original')
  const lastUserQuery = useRef<string>('')
  const currentHospitalsRef = useRef<Hospital[]>([])

  const fetchHospitalsForMap = useCallback(async (zip: string) => {
    setMapLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/hospitals/search?zip=${encodeURIComponent(zip)}&radius=25`)
      if (!res.ok) return
      const data = await res.json() as { hospitals: Hospital[] }
      if (data.hospitals?.length) {
        setHospitals(data.hospitals)
        currentHospitalsRef.current = data.hospitals
        setTab('map')
        return data.hospitals
      }
    } catch {
      // silent
    } finally {
      setMapLoading(false)
    }
    return null
  }, [])

  const fetchPriceTable = useCallback(async (ccns: string[], procedureCode: string, codeType: 'DRG' | 'APC') => {
    setTableLoading(true)
    try {
      const res = await fetch(
        `${API_URL}/api/prices/compare?hospital_ccns=${ccns.slice(0, 10).join(',')}&procedure_code=${encodeURIComponent(procedureCode)}&code_type=${codeType}`
      )
      if (!res.ok) return
      const data = await res.json() as { prices: HospitalPrice[]; procedure_code: string; code_type: string; national_median: number | null }
      if (data.prices?.length) {
        setPrices(data.prices)
        setPricesMeta({ procedure_code: data.procedure_code, code_type: data.code_type, national_median: data.national_median })
        setInsightsProcedure({ code: data.procedure_code, type: data.code_type })
        setTab('table')
      }
    } catch {
      // silent
    } finally {
      setTableLoading(false)
    }
  }, [])

  const handleUserSend = useCallback((text: string) => {
    lastUserQuery.current = text
    const zip = extractZip(text)
    if (zip) fetchHospitalsForMap(zip)
  }, [fetchHospitalsForMap])

  const handleMessage = useCallback(async (content: string) => {
    // 1. Resolve procedure code: explicit DRG/APC in response → keyword in user query → keyword in response
    const proc =
      extractExplicitCode(content) ??
      inferProcedureCode(lastUserQuery.current) ??
      inferProcedureCode(content)

    if (!proc) return

    // 2. Resolve hospitals: use ref (avoids stale closure), fallback to fetching via zip in response
    let hosps = currentHospitalsRef.current
    if (!hosps.length) {
      const zip = extractZip(content) ?? extractZip(lastUserQuery.current)
      if (zip) {
        const fetched = await fetchHospitalsForMap(zip)
        if (fetched) hosps = fetched
      }
    }

    if (hosps.length) {
      await fetchPriceTable(hosps.map((h) => h.ccn), proc.code, proc.type)
    }
  }, [fetchHospitalsForMap, fetchPriceTable])

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-lg">ClearPrice</span>
          <span className="text-xs text-slate-400 ml-1">Hospital Price Transparency</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/compare" className="text-sm text-slate-600 hover:text-brand transition-colors">Compare</a>
          <a href="/map" className="text-sm text-slate-600 hover:text-brand transition-colors">Map</a>
          <a href="/" className="text-sm text-slate-500 hover:text-brand transition-colors">← Home</a>
          <FreshnessBadge />
        </div>
      </header>

      {/* Split pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel — 40% */}
        <div className="w-2/5 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          <ChatInterface onMessage={handleMessage} onUserSend={handleUserSend} />
        </div>

        {/* Results panel — 60% */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Tabs */}
          <div className="flex-shrink-0 border-b border-slate-200 px-4 flex items-center gap-1 pt-2">
            {(['map', 'table', 'insights'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors capitalize ${
                  tab === t
                    ? 'border-brand text-brand'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'map' ? (
                  <span className="flex items-center gap-1.5">
                    Map
                    {mapLoading && <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />}
                    {!mapLoading && hospitals.length > 0 && (
                      <span className="text-xs bg-brand text-white rounded-full px-1.5 py-0">{hospitals.length}</span>
                    )}
                  </span>
                ) : t === 'table' ? (
                  <span className="flex items-center gap-1.5">
                    Price Table
                    {tableLoading && <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />}
                    {!tableLoading && prices.length > 0 && (
                      <span className="text-xs bg-brand text-white rounded-full px-1.5 py-0">{prices.length}</span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Insights
                    <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0">Atlas Charts</span>
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'map' && (
              <div className="space-y-4">
                <HospitalMap hospitals={hospitals} apiKey={MAPS_KEY} />
                {!hospitals.length && !mapLoading && (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">Ask ClearPrice about hospital prices near a zip code<br />to see hospitals on the map</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'table' && (
              <div className="space-y-4">
                {pricesMeta ? (
                  <PriceTable
                    prices={prices}
                    procedureCode={pricesMeta.procedure_code}
                    codeType={pricesMeta.code_type}
                    nationalMedian={pricesMeta.national_median}
                    medicarePlan={medicarePlan}
                    onPlanChange={setMedicarePlan}
                  />
                ) : (
                  <div className="text-center py-16 text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                    </svg>
                    <p className="text-sm">Price comparison will appear here<br />after you ask about a procedure</p>
                    <a href="/compare" className="inline-block mt-3 text-sm text-brand hover:underline">
                      Or use the Compare page →
                    </a>
                  </div>
                )}
              </div>
            )}

            {tab === 'insights' && (
              <InsightsPanel
                procedureCode={insightsProcedure?.code ?? null}
                codeType={insightsProcedure?.type ?? null}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
