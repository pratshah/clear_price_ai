'use client'

export type AgentStatus = 'pending' | 'running' | 'complete'

export interface AgentState {
  procedure_agent: AgentStatus
  hospital_discovery_agent: AgentStatus
  price_intel_agent: AgentStatus
  quality_financial_agent: AgentStatus
  provider_agent: AgentStatus
  insurance_agent: AgentStatus
}

const AGENT_LABELS: Record<keyof AgentState, string> = {
  procedure_agent: 'Procedure Lookup',
  hospital_discovery_agent: 'Hospital Search',
  price_intel_agent: 'Price Intel',
  quality_financial_agent: 'Quality & Finance',
  provider_agent: 'Provider Lookup',
  insurance_agent: 'Insurance & Out-Of-Pocket',
}

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === 'complete') {
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  if (status === 'running') {
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
        <svg className="w-3 h-3 text-blue-600 animate-spin-slow" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </span>
    )
  }
  return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
      <span className="w-2 h-2 rounded-full bg-slate-300" />
    </span>
  )
}

export default function AgentStatusPanel({ agents }: { agents: AgentState }) {
  const anyActive = Object.values(agents).some((s) => s !== 'pending')
  if (!anyActive) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Autonomous Multi-Agent Pipeline (Google ADK & MCP)</p>
      <div className="space-y-1.5">
        {(Object.keys(AGENT_LABELS) as Array<keyof AgentState>).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <StatusIcon status={agents[key]} />
            <span className={`text-sm ${
              agents[key] === 'running' ? 'text-blue-700 font-medium' :
              agents[key] === 'complete' ? 'text-slate-600' :
              'text-slate-400'
            }`}>
              {AGENT_LABELS[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
