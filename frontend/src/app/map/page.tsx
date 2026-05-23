'use client'

import { useState } from 'react'
import Link from 'next/link'
import HospitalMap, { Hospital } from '../../components/HospitalMap'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

interface HospitalsResponse {
  hospitals: Hospital[]
}

export default function MapPage() {
  const [zip, setZip] = useState('')
  const [radius, setRadius] = useState('25')
  const [minStars, setMinStars] = useState('')
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const search = async () => {
    if (!zip) { setError('Enter a zip code'); return }
    setError('')
    setLoading(true)
    try {
      const params = new URLSearchParams({ zip, radius })
      if (minStars) params.set('min_stars', minStars)
      const res = await fetch(`${API_URL}/api/hospitals/search?${params}`)
      if (!res.ok) throw new Error('Search failed')
      const data: HospitalsResponse = await res.json()
      setHospitals(data.hospitals)
      setSearched(true)
      if (!data.hospitals.length) setError('No hospitals found. Try a larger radius.')
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
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Hospital Map</h1>
        <p className="text-slate-500 text-sm mb-6">Find hospitals near a zip code and filter by quality rating.</p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Zip code"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand w-32"
            />
            <select
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="10">10 miles</option>
              <option value="25">25 miles</option>
              <option value="50">50 miles</option>
            </select>
            <select
              value={minStars}
              onChange={(e) => setMinStars(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Any quality</option>
              <option value="3">3+ stars</option>
              <option value="4">4+ stars</option>
              <option value="5">5 stars only</option>
            </select>
            <button
              onClick={search}
              disabled={loading}
              className="bg-brand text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>

        <HospitalMap hospitals={hospitals} apiKey={MAPS_KEY} />

        {searched && hospitals.length > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
              {hospitals.length} hospitals found
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left px-4 py-2 font-medium">Hospital</th>
                  <th className="text-left px-4 py-2 font-medium">Location</th>
                  <th className="text-right px-4 py-2 font-medium">Distance</th>
                  <th className="text-right px-4 py-2 font-medium">CMS ★</th>
                  <th className="text-right px-4 py-2 font-medium">Google ★</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((h) => (
                  <tr key={h.ccn} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{h.name}</div>
                      <div className="text-xs text-slate-400">CCN {h.ccn}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {h.address?.city}, {h.address?.state}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {h.distance_miles != null ? `${h.distance_miles} mi` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {h.quality?.cms_star_rating ? (
                        <span className="flex items-center justify-end gap-0.5">
                          <span className="text-yellow-400">★</span>
                          <span>{h.quality.cms_star_rating}</span>
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {h.google?.rating ? (
                        <span className="flex items-center justify-end gap-0.5">
                          <span className="text-yellow-400">★</span>
                          <span>{h.google.rating}</span>
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
