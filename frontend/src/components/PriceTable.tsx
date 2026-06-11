import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export interface HospitalPrice {
  ccn: string
  hospital_name: string
  avg_covered_charges: number
  avg_medicare_payments: number
  avg_total_payments: number
  total_discharges: number
  total_services?: number
  avg_medicare_allowed?: number
  national_median_payment: number | null
  pct_vs_national: number | null
  cms_star_rating: number | null
  google_rating: number | null
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return '$' + Math.round(n).toLocaleString()
}

function fmtPayment(n: number | null | undefined, isEstimate: boolean) {
  if (n == null) return '—'
  const val = '$' + Math.round(n).toLocaleString()
  return isEstimate ? `~${val} (Est.)` : val
}

function Stars({ n }: { n: number | null }) {
  if (n == null) return <span className="text-slate-400">—</span>
  return (
    <span className="flex items-center gap-0.5">
      <span className="text-yellow-400">★</span>
      <span className="tabular-nums text-sm font-medium">{n}</span>
    </span>
  )
}

function PctBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-slate-400">—</span>
  const color = pct <= -5 ? 'text-green-700 bg-green-50' : pct >= 10 ? 'text-red-700 bg-red-50' : 'text-slate-600 bg-slate-100'
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${color}`}>
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  )
}

interface Props {
  prices: HospitalPrice[]
  procedureCode: string
  codeType: string
  nationalMedian: number | null
  medicarePlan?: 'original' | 'plan_g' | 'plan_f' | 'uninsured'
  onPlanChange?: (plan: 'original' | 'plan_g' | 'plan_f' | 'uninsured') => void
}

export default function PriceTable({
  prices,
  procedureCode,
  codeType,
  nationalMedian,
  medicarePlan: externalPlan,
  onPlanChange,
}: Props) {
  if (!prices.length) return null

  const [localPlan, setLocalPlan] = useState<'original' | 'plan_g' | 'plan_f' | 'uninsured'>('original')
  const medicarePlan = externalPlan ?? localPlan
  const handlePlanChange = onPlanChange ?? setLocalPlan

  const [savingCcn, setSavingCcn] = useState<string | null>(null)
  const [savedCcns, setSavedCcns] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`${API_URL}/api/portfolio`)
      .then((res) => res.json())
      .then((data) => {
        if (data.portfolio) {
          setSavedCcns(new Set(data.portfolio.map((h: any) => h.ccn)))
        }
      })
      .catch(() => {})
  }, [prices])

  const toggleSave = async (p: HospitalPrice) => {
    const isSaved = savedCcns.has(p.ccn)
    setSavingCcn(p.ccn)
    try {
      if (isSaved) {
        const res = await fetch(`${API_URL}/api/portfolio/${p.ccn}`, { method: 'DELETE' })
        if (res.ok) {
          setSavedCcns((prev) => {
            const next = new Set(prev)
            next.delete(p.ccn)
            return next
          })
        }
      } else {
        const res = await fetch(`${API_URL}/api/portfolio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ccn: p.ccn,
            name: p.hospital_name,
            cms_star_rating: p.cms_star_rating,
            google_rating: p.google_rating,
          }),
        })
        if (res.ok) {
          setSavedCcns((prev) => {
            const next = new Set(prev)
            next.add(p.ccn)
            return next
          })
        }
      }
    } catch {
    } finally {
      setSavingCcn(null)
    }
  }

  const isDRG = codeType.toUpperCase() === 'DRG'

  const calculateOOP = (p: HospitalPrice, useEstimate: boolean = false) => {
    const rate = p.avg_medicare_payments || p.avg_medicare_allowed || (useEstimate ? p.national_median_payment : null)
    if (rate === null && !p.avg_covered_charges) {
      return null
    }

    const rateVal = rate || 0
    
    if (medicarePlan === 'uninsured') {
      return p.avg_covered_charges || (rateVal * 2.5)
    }

    if (isDRG) {
      // Part A - Inpatient
      const partADeductible = 1676
      if (medicarePlan === 'plan_g' || medicarePlan === 'plan_f') {
        return 0
      }
      return partADeductible
    } else {
      // Part B - Outpatient
      const partBDeductible = 240
      const coinsurance = rateVal * 0.2
      if (medicarePlan === 'plan_f') {
        return 0
      }
      if (medicarePlan === 'plan_g') {
        return partBDeductible
      }
      return partBDeductible + coinsurance
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Table header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-slate-700">{procedureCode}</span>
          <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{codeType}</span>
        </div>
        {nationalMedian && (
          <div className="text-xs text-slate-500">
            National median: <span className="font-semibold text-slate-700">{fmt(nationalMedian)}</span>
          </div>
        )}
      </div>

      {/* Insurance Plan Selector Bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Coverage:</span>
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            {(['original', 'plan_g', 'plan_f', 'uninsured'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePlanChange(p)}
                className={`text-xs px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                  medicarePlan === p
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {p === 'original' ? 'Original Medicare' :
                 p === 'plan_g' ? 'Medigap Plan G' :
                 p === 'plan_f' ? 'Medigap Plan F' :
                 'Uninsured'}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-500 font-medium italic">
          {medicarePlan === 'original' && (isDRG ? 'Subject to Part A deductible ($1,676).' : 'Subject to Part B deductible ($240) + 20% coinsurance.')}
          {medicarePlan === 'plan_g' && (isDRG ? 'Plan G covers 100% of Part A deductible ($0 OOP).' : 'Plan G covers coinsurance. You pay Part B deductible ($240).')}
          {medicarePlan === 'plan_f' && 'Plan F covers 100% of all deductibles and coinsurances ($0 OOP).'}
          {medicarePlan === 'uninsured' && 'Estimated full hospital billed charges.'}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-slate-100">
            <th className="text-left px-4 py-2 font-medium">Hospital</th>
            <th className="text-right px-4 py-2 font-medium">Billed</th>
            <th className="text-right px-4 py-2 font-medium">Medicare Paid</th>
            <th className="text-right px-4 py-2 font-medium text-brand font-semibold">Your Est. OOP</th>
            <th className="text-right px-4 py-2 font-medium">vs National</th>
            <th className="text-right px-4 py-2 font-medium">Discharges</th>
            <th className="text-right px-4 py-2 font-medium">CMS ★</th>
            <th className="text-right px-4 py-2 font-medium">Google ★</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((p, i) => {
            const hasLocalPrice = p.avg_medicare_payments != null || p.avg_medicare_allowed != null
            const useEstimate = !hasLocalPrice && p.national_median_payment != null
            const displayPayment = hasLocalPrice 
              ? (p.avg_medicare_payments || p.avg_medicare_allowed) 
              : (useEstimate ? p.national_median_payment : null)

            return (
              <tr key={p.ccn} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i === 0 ? 'bg-green-50/40' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.preventDefault(); toggleSave(p); }}
                      disabled={savingCcn === p.ccn}
                      className="text-base focus:outline-none transition-transform hover:scale-125 duration-100 mr-1"
                      title={savedCcns.has(p.ccn) ? "Remove from Portfolio" : "Save to Portfolio"}
                    >
                      {savedCcns.has(p.ccn) ? (
                        <span className="text-amber-400">★</span>
                      ) : (
                        <span className="text-slate-300 hover:text-amber-400">☆</span>
                      )}
                    </button>
                    {i === 0 && (
                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Best Value</span>
                    )}
                    <span className="font-medium text-slate-800">{p.hospital_name}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">CCN {p.ccn}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{fmt(p.avg_covered_charges)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {fmtPayment(displayPayment, useEstimate)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-brand bg-brand/5">
                  {fmtPayment(calculateOOP(p, useEstimate), useEstimate)}
                </td>
                <td className="px-4 py-3 text-right"><PctBadge pct={p.pct_vs_national} /></td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{(p.total_discharges || p.total_services || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right"><Stars n={p.cms_star_rating} /></td>
                <td className="px-4 py-3 text-right"><Stars n={p.google_rating} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
        Estimated Out-of-Pocket (OOP) costs are modeled using standard Medicare Part A/B rules for the respective procedure setting. Actual costs may vary.
      </div>
    </div>
  )
}
