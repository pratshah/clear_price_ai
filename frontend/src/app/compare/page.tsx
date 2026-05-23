'use client'

import { useState } from 'react'
import Link from 'next/link'
import PriceTable, { HospitalPrice } from '../../components/PriceTable'
import HospitalMap, { Hospital } from '../../components/HospitalMap'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

interface PricesResponse {
  prices: HospitalPrice[]
  procedure_code: string
  code_type: string
  national_median: number | null
  national_hospital_count: number
}

interface HospitalsResponse {
  hospitals: Hospital[]
}

export default function ComparePage() {
  const [zip, setZip] = useState('')
  const [procedure, setProcedure] = useState('')
  const [codeType, setCodeType] = useState<'DRG' | 'APC'>('DRG')
  const [radius, setRadius] = useState('25')

  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [prices, setPrices] = useState<HospitalPrice[]>([])
  const [meta, setMeta] = useState<{ procedure_code: string; code_type: string; national_median: number | null; national_hospital_count: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async () => {
    if (!zip || !procedure) {
      setError('Enter a zip code and procedure code')
      return
    }
    setError('')
    setLoading(true)

    try {
      // Step 1: find hospitals near zip
      const hRes = await fetch(`${API_URL}/api/hospitals/search?zip=${encodeURIComponent(zip)}&radius=${radius}`)
      if (!hRes.ok) throw new Error('Hospital search failed')
      const hData: HospitalsResponse = await hRes.json()
      setHospitals(hData.hospitals)

      if (!hData.hospitals.length) {
        setError('No hospitals found near that zip code')
        setLoading(false)
        return
      }

      // Step 2: get prices for those hospitals
      const ccns = hData.hospitals.slice(0, 10).map((h) => h.ccn).join(',')
      const pRes = await fetch(
        `${API_URL}/api/prices/compare?hospital_ccns=${ccns}&procedure_code=${encodeURIComponent(procedure)}&code_type=${codeType}`
      )
      if (!pRes.ok) throw new Error('Price lookup failed')
      const pData: PricesResponse = await pRes.json()
      setPrices(pData.prices)
      setMeta({
        procedure_code: pData.procedure_code,
        code_type: pData.code_type,
        national_median: pData.national_median,
        national_hospital_count: pData.national_hospital_count,
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-lg">ClearPrice</span>
        </Link>
        <Link href="/" className="text-sm text-slate-600 hover:text-brand transition-colors">← Chat</Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Compare Hospital Prices</h1>
        <p className="text-slate-500 text-sm mb-6">Enter a zip code and procedure code (DRG or APC) to compare Medicare payment rates across nearby hospitals.</p>

        {/* Search form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Zip code (e.g. 94102)"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition-colors w-36"
            />
            <input
              type="text"
              placeholder="Procedure code (e.g. 470)"
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition-colors w-48"
            />
            <select
              value={codeType}
              onChange={(e) => setCodeType(e.target.value as 'DRG' | 'APC')}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition-colors"
            >
              <option value="DRG">DRG (Inpatient)</option>
              <option value="APC">APC (Outpatient)</option>
            </select>
            <select
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition-colors"
            >
              <option value="10">10 miles</option>
              <option value="25">25 miles</option>
              <option value="50">50 miles</option>
            </select>
            <button
              onClick={search}
              disabled={loading}
              className="bg-brand text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Compare'}
            </button>
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-slate-400">Quick examples:</span>
            {[
              { zip: '94102', code: '470', type: 'DRG' as const, label: 'Knee replacement SF' },
              { zip: '10001', code: '469', type: 'DRG' as const, label: 'Hip replacement NYC' },
              { zip: '60601', code: '0074', type: 'APC' as const, label: 'Colonoscopy Chicago' },
            ].map((ex) => (
              <button
                key={ex.label}
                onClick={() => { setZip(ex.zip); setProcedure(ex.code); setCodeType(ex.type) }}
                className="text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-full px-2.5 py-1 transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        {hospitals.length > 0 && (
          <div className="mb-6">
            <HospitalMap hospitals={hospitals} apiKey={MAPS_KEY} />
          </div>
        )}

        {/* Price table */}
        {meta && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Found price data for <span className="font-semibold">{prices.length}</span> hospitals out of {hospitals.length} found near {zip}
              </div>
              <div className="text-xs text-slate-400">{meta.national_hospital_count.toLocaleString()} hospitals nationally have data for this code</div>
            </div>
            <PriceTable
              prices={prices}
              procedureCode={meta.procedure_code}
              codeType={meta.code_type}
              nationalMedian={meta.national_median}
            />
          </>
        )}

        {/* Empty state after search */}
        {meta && prices.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
            <p className="text-sm">No price data found for procedure <strong>{procedure}</strong> at hospitals near {zip}.</p>
            <p className="text-xs mt-1">Try a different procedure code or expand the search radius.</p>
          </div>
        )}
      </main>
    </div>
  )
}
