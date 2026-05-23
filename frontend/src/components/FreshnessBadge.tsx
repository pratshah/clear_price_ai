'use client'

import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

interface Freshness {
  prices: { last_updated: string | null; age_days: number | null; record_count: number }
  hospitals: { record_count: number }
  data_source: string
  cms_year: number
}

function ageLabel(days: number | null): string {
  if (days === null) return 'CMS 2024'
  if (days === 0) return 'Updated today'
  if (days === 1) return 'Updated yesterday'
  if (days < 30) return `Updated ${days}d ago`
  const months = Math.floor(days / 30)
  return `Updated ${months}mo ago`
}

export default function FreshnessBadge() {
  const [data, setData] = useState<Freshness | null>(null)
  const [dot, setDot] = useState<'green' | 'amber' | 'red'>('green')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/meta/freshness`)
        if (!res.ok) return
        const json = await res.json() as Freshness
        if (!cancelled) {
          setData(json)
          const days = json.prices.age_days
          setDot(days === null ? 'green' : days < 90 ? 'green' : days < 180 ? 'amber' : 'red')
        }
      } catch {
        // API not running — silent
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const dotColor = dot === 'green' ? 'bg-green-400' : dot === 'amber' ? 'bg-amber-400' : 'bg-red-400'

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
      {data ? (
        <span title={`${data.prices.record_count.toLocaleString()} price records · ${data.data_source}`}>
          {ageLabel(data.prices.age_days)}
        </span>
      ) : (
        <span>CMS 2024 data</span>
      )}
    </div>
  )
}
