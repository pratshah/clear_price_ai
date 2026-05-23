import Link from 'next/link'

// ─── Logo ────────────────────────────────────────────────────────────────────
function Logo({ size = 7 }: { size?: number }) {
  const cls = size === 8 ? 'w-8 h-8' : 'w-7 h-7'
  return (
    <div className={`${cls} rounded-lg bg-brand flex items-center justify-center flex-shrink-0`}>
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    </div>
  )
}

// ─── Badge ───────────────────────────────────────────────────────────────────
function Badge({ children, variant = 'blue' }: { children: React.ReactNode; variant?: 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'slate' }) {
  const variants: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    green: 'bg-green-500/10 text-green-300 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    slate: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  )
}

// ─── Section heading ─────────────────────────────────────────────────────────
function SectionHeading({ eyebrow, title, subtitle, dark = false }: {
  eyebrow?: string
  title: string
  subtitle?: string
  dark?: boolean
}) {
  return (
    <div className="text-center mb-14">
      {eyebrow && (
        <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? 'text-blue-400' : 'text-brand'}`}>
          {eyebrow}
        </div>
      )}
      <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight mb-4 ${dark ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`text-base md:text-lg max-w-2xl mx-auto leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ─── Arrow SVG helper ─────────────────────────────────────────────────────────
function ArrowDown({ label, dark = true }: { label?: string; dark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      {label && (
        <span className={`text-xs font-mono px-2 py-0.5 rounded ${dark ? 'text-slate-500 bg-slate-800/50' : 'text-slate-400 bg-slate-100'}`}>
          {label}
        </span>
      )}
      <div className={`w-px h-6 ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />
      <svg className={`w-3 h-3 ${dark ? 'text-slate-600' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 12 12">
        <path d="M6 9L1 4h10L6 9z" />
      </svg>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* ── 1. Fixed Nav ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={7} />
            <span className="font-bold text-lg text-white tracking-tight">ClearPrice</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-slate-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#data-sources" className="hover:text-white transition-colors">Data Sources</a>
            <a href="#agents" className="hover:text-white transition-colors">Agents</a>
            <a href="#why" className="hover:text-white transition-colors">Why It Matters</a>
          </div>
          <Link
            href="/app"
            className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-brand/30"
          >
            Open App →
          </Link>
        </div>
      </nav>

      {/* ── 2. Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center bg-slate-950 overflow-hidden pt-20">
        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1B4FE820_0%,_transparent_60%)] pointer-events-none" />
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center mb-16">
            {/* Hackathon badge */}
            <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/30 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Built for Google Cloud Rapid Agent Hackathon 2026
            </div>

            {/* H1 with gradient */}
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
              <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Hospital prices are public.
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
                Finally, they&apos;re human.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              5 AI agents. 3,000+ hospitals. Real Medicare data.
              Plain English answers in <span className="text-white font-semibold">8 seconds</span>.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/app"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-blue-600 transition-all shadow-2xl shadow-brand/40 hover:shadow-brand/60 hover:-translate-y-0.5"
              >
                Ask About Hospital Prices →
              </Link>
              <a
                href="#architecture"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/15 text-slate-300 px-8 py-3.5 rounded-xl text-base font-semibold hover:border-white/30 hover:text-white transition-all"
              >
                View Architecture ↓
              </a>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { n: '3,000+', label: 'Hospitals' },
                { n: '260K+', label: 'Procedures' },
                { n: '50', label: 'US States' },
              ].map(({ n, label }) => (
                <div key={label} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
                  <span className="text-white font-bold text-sm">{n}</span>
                  <span className="text-slate-500 text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal preview */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
              {/* Terminal bar */}
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-slate-500 text-xs ml-2 font-mono">clearprice — agent session</span>
              </div>

              <div className="p-6 font-mono text-sm space-y-4">
                {/* Input */}
                <div>
                  <span className="text-slate-600">&gt; </span>
                  <span className="text-white">&quot;knee replacement near zip 94102?&quot;</span>
                </div>

                {/* Agent status */}
                <div className="space-y-2 pl-4 border-l border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-green-400 text-xs font-bold">✓</span>
                    <span className="text-slate-400 text-xs w-40">Procedure Agent</span>
                    <span className="text-slate-300 text-xs">DRG 470, DRG 469 identified</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-400 text-xs font-bold">✓</span>
                    <span className="text-slate-400 text-xs w-40">Hospital Discovery</span>
                    <span className="text-slate-300 text-xs">9 hospitals within 25 miles</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400 text-xs animate-pulse">⟳</span>
                    <span className="text-slate-400 text-xs w-40">Price Intel</span>
                    <span className="text-slate-500 text-xs">fetching Medicare payments...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400 text-xs animate-pulse">⟳</span>
                    <span className="text-slate-400 text-xs w-40">Quality &amp; Finance</span>
                    <span className="text-slate-500 text-xs">loading CMS ratings...</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-800 pt-4 space-y-2">
                  <div className="text-slate-600 text-xs mb-3">— results —</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { name: 'Kaiser Foundation Hospital – SF', price: '$32,039', stars: '★★★★', pct: '-12%', pctColor: 'text-green-400' },
                      { name: 'CPMC Van Ness Campus', price: '$61,969', stars: '★★★', pct: '+70%', pctColor: 'text-red-400' },
                      { name: 'UCSF Medical Center', price: '$72,100', stars: '★★★★', pct: '+98%', pctColor: 'text-red-400' },
                    ].map((h) => (
                      <div key={h.name} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-300 flex-1">{h.name}</span>
                        <span className="text-white font-semibold tabular-nums w-16 text-right">{h.price}</span>
                        <span className="text-yellow-400 w-12 text-center">{h.stars}</span>
                        <span className={`${h.pctColor} w-10 text-right font-medium`}>{h.pct} vs national</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 text-xs text-slate-600">
                    National median DRG 470: <span className="text-slate-400">$36,400</span> · Medicare 2024 data
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. The Problem ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            dark
            eyebrow="The Problem"
            title="They published the data. Nobody made it readable."
            subtitle="Since January 2021, every US hospital must publish a machine-readable price file. Here's what that looks like — vs what ClearPrice gives you from the same data."
          />

          <div className="grid md:grid-cols-2 gap-6">
            {/* Raw CSV side */}
            <div className="rounded-2xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-slate-400 text-xs ml-2 font-mono">hospital_chargemaster_2024.csv — 523,841 rows</span>
              </div>
              <div className="bg-slate-950 p-5 font-mono text-xs overflow-x-auto">
                <div className="text-slate-700 mb-3 text-[11px]">payer_name | code_type | local_code | description | gross_charge | discounted_cash | negotiated_charge</div>
                <div className="space-y-1.5">
                  <div className="flex gap-3">
                    <span className="text-slate-500 w-20 flex-shrink-0">BCBS CA</span>
                    <span className="text-slate-600">DRG</span>
                    <span className="text-slate-400">470</span>
                    <span className="text-slate-600 flex-1 truncate">Major Hip...</span>
                    <span className="text-red-400 flex-shrink-0">$82,000</span>
                    <span className="text-slate-700">—</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-slate-500 w-20 flex-shrink-0">Aetna PPO</span>
                    <span className="text-slate-600">DRG</span>
                    <span className="text-slate-400">470</span>
                    <span className="text-slate-600 flex-1 truncate">Major Hip...</span>
                    <span className="text-red-400 flex-shrink-0">$82,000</span>
                    <span className="text-yellow-500">$31,200</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-slate-500 w-20 flex-shrink-0">United HC</span>
                    <span className="text-slate-600">DRG</span>
                    <span className="text-slate-400">470</span>
                    <span className="text-slate-600 flex-1 truncate">Maj Hip Kne...</span>
                    <span className="text-red-400 flex-shrink-0">$82,000</span>
                    <span className="text-slate-700">—</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-slate-500 w-20 flex-shrink-0">BCBS CA</span>
                    <span className="text-slate-600">CPT</span>
                    <span className="text-slate-400">27447</span>
                    <span className="text-slate-600 flex-1 truncate">TKA w/o MCC</span>
                    <span className="text-red-400 flex-shrink-0">$74,500</span>
                    <span className="text-slate-700">—</span>
                  </div>
                  <div className="text-slate-700 mt-3 text-[11px]">... 523,837 more rows</div>
                </div>
              </div>
              <div className="bg-slate-800/50 px-4 py-3 text-xs text-slate-500 border-t border-slate-700">
                What hospitals publish — legally required since 2021
              </div>
            </div>

            {/* ClearPrice output side */}
            <div className="rounded-2xl border border-blue-500/30 overflow-hidden">
              <div className="bg-brand/10 px-4 py-3 flex items-center gap-2 border-b border-blue-500/30">
                <Logo size={5} />
                <span className="text-blue-300 text-xs font-semibold">ClearPrice — same data, human language</span>
                <span className="ml-auto text-green-400 text-xs font-mono">8.2s</span>
              </div>
              <div className="bg-slate-950 p-5 space-y-4">
                <div className="text-slate-500 text-xs">
                  You asked: <span className="text-white">&quot;Knee replacement near zip 94102?&quot;</span>
                </div>

                <div className="bg-slate-900 rounded-xl p-4 space-y-3 border border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/20 rounded px-1.5 py-0.5">BEST VALUE</span>
                      <span className="text-white text-sm font-semibold">Kaiser Foundation Hospital – SF</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Medicare paid <span className="text-green-400 font-bold">$32,039</span> — <span className="text-green-400">12% below</span> the national median of $36,400.
                    </p>
                    <p className="text-slate-500 text-xs mt-1">CMS quality: <span className="text-yellow-400">★★★★</span> · 4.7 miles away</p>
                  </div>
                  <div className="border-t border-slate-800 pt-3 space-y-1">
                    <p className="text-slate-600 text-xs">vs UCSF Medical Center: $72,100 <span className="text-red-400">(+98% vs national)</span></p>
                    <p className="text-slate-600 text-xs">vs CPMC Van Ness: $61,969 <span className="text-red-400">(+70% vs national)</span></p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
                    <p className="text-blue-300 text-xs">
                      <span className="font-semibold">ASC alternative:</span> Highland Surgical Center — $18,200 outpatient. Save ~43% vs hospital inpatient.
                    </p>
                  </div>
                </div>

                <div className="text-slate-700 text-xs">
                  Powered by 5 AI agents · CMS Medicare FY2024 · DRG 470
                </div>
              </div>
              <div className="bg-brand/5 px-4 py-3 text-xs text-blue-400 border-t border-blue-500/20">
                What ClearPrice gives you — same data, 8 seconds
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Architecture Diagram ───────────────────────────────────────── */}
      <section id="architecture" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="System Architecture"
            title="End-to-End Architecture"
            subtitle="From your question to ranked hospital comparison — 5 specialized agents, 1 custom MCP server, MongoDB Atlas."
          />

          {/* Architecture tower */}
          <div className="flex flex-col items-center gap-0">

            {/* User Browser */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              🌐 User Browser
            </div>
            <ArrowDown label="SSE streaming" dark={false} />

            {/* Next.js */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm">
              Next.js Frontend — Cloud Run
            </div>
            <ArrowDown label="POST /api/chat" dark={false} />

            {/* Hono API */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm">
              Hono.js API — Cloud Run
            </div>
            <ArrowDown label="ADK runner" dark={false} />

            {/* Orchestrator */}
            <div className="bg-violet-100 border-2 border-violet-400 rounded-xl px-8 py-4 text-center shadow-lg">
              <div className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-1">Orchestrator Agent</div>
              <div className="text-sm font-bold text-violet-900">Gemini 2.5 Pro — Vertex AI Agent Runtime</div>
              <div className="text-xs text-violet-600 mt-0.5">Decomposes query → dispatches sub-agents in parallel → synthesizes</div>
            </div>
            <ArrowDown label="parallel dispatch" dark={false} />

            {/* Sub-agents row */}
            <div className="w-full max-w-4xl">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { name: 'Procedure Agent', sub: 'NL → DRG/APC', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', sub2: 'text-blue-500' },
                  { name: 'Hospital Discovery', sub: 'Geo + filters', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', sub2: 'text-purple-500' },
                  { name: 'Price Intel', sub: 'DRG/APC pricing', bg: 'bg-green-50 border-green-200', text: 'text-green-700', sub2: 'text-green-500' },
                  { name: 'Quality & Finance', sub: 'Stars + charity', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', sub2: 'text-amber-500' },
                  { name: 'Provider Agent', sub: 'Physicians + NPI', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', sub2: 'text-rose-500' },
                ].map((a) => (
                  <div key={a.name} className={`${a.bg} border rounded-xl p-3 text-center`}>
                    <div className={`text-xs font-bold ${a.text}`}>{a.name}</div>
                    <div className={`text-xs mt-0.5 ${a.sub2}`}>{a.sub}</div>
                  </div>
                ))}
              </div>
            </div>
            <ArrowDown label="MCPToolset / stdio" dark={false} />

            {/* MCP Server */}
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl px-8 py-4 text-center shadow-md">
              <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Custom MCP Server</div>
              <div className="text-sm font-bold text-amber-900">10 domain-aware tools — Cloud Run sidecar</div>
              <div className="text-xs text-amber-600 mt-0.5">search_procedures · find_hospitals_near · get_price_data · get_quality_scores · rank_hospitals + 5 more</div>
            </div>
            <ArrowDown label="MongoDB queries / REST" dark={false} />

            {/* Data stores */}
            <div className="w-full max-w-2xl grid grid-cols-3 gap-3">
              {[
                { name: 'MongoDB Atlas', sub: 'hospitals · prices · providers', bg: 'bg-green-50 border-green-300', text: 'text-green-800', sub2: 'text-green-600' },
                { name: 'Google Places API', sub: 'ratings + reviews', bg: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-800', sub2: 'text-emerald-600' },
                { name: 'NPI Registry', sub: 'provider directory', bg: 'bg-teal-50 border-teal-300', text: 'text-teal-800', sub2: 'text-teal-600' },
              ].map((d) => (
                <div key={d.name} className={`${d.bg} border rounded-xl p-3 text-center`}>
                  <div className={`text-xs font-bold ${d.text}`}>{d.name}</div>
                  <div className={`text-xs mt-0.5 ${d.sub2}`}>{d.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Timing bar */}
          <div className="mt-14 bg-slate-900 rounded-2xl p-6 text-white">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5 text-center">Request Timeline (~7 seconds total)</div>
            <div className="space-y-3">
              {[
                { step: 'Step 1', label: 'Procedure + Hospital', time: '~2s', note: 'runs in parallel', pct: '28%', color: 'bg-blue-500' },
                { step: 'Step 2', label: 'Price + Quality + Provider', time: '~3s', note: 'runs in parallel', pct: '43%', color: 'bg-violet-500' },
                { step: 'Step 3', label: 'Synthesis + response', time: '~2s', note: 'orchestrator writes answer', pct: '28%', color: 'bg-green-500' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-4">
                  <div className="w-16 text-xs text-slate-500 flex-shrink-0">{s.step}</div>
                  <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                    <div className={`${s.color} h-full rounded-full flex items-center justify-end pr-2`} style={{ width: s.pct }}>
                      <span className="text-white text-[10px] font-bold">{s.time}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 w-36 flex-shrink-0">{s.label}</div>
                  <span className="text-xs text-slate-600 hidden lg:block">{s.note}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 text-center text-sm text-slate-300 font-semibold">
              Total: ~7 seconds end-to-end
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. AI Agents Deep Dive ─────────────────────────────────────────── */}
      <section id="agents" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Multi-Agent System"
            title="5 Specialized AI Agents"
            subtitle="Each agent is a Gemini 2.5 Pro specialist with a focused job and access only to the tools it needs."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                num: '01',
                name: 'Procedure Agent',
                emoji: '🔬',
                border: 'border-blue-400',
                badge: 'border-blue-200 bg-blue-50 text-blue-700',
                accent: 'text-blue-600',
                triggers: 'Any query with a procedure name',
                tools: ['search_procedures'],
                returns: 'DRG/APC codes with plain names',
                exIn: '"knee replacement"',
                exOut: 'DRG 470 (Knee Replacement, inpatient), DRG 469 (with MCC)',
                toolColors: ['blue'],
              },
              {
                num: '02',
                name: 'Hospital Discovery',
                emoji: '🗺️',
                border: 'border-purple-400',
                badge: 'border-purple-200 bg-purple-50 text-purple-700',
                accent: 'text-purple-600',
                triggers: 'Any query with a location (zip/city)',
                tools: ['find_hospitals_near'],
                returns: 'Hospital list with CCNs, distances, coordinates',
                exIn: 'zip 94102, 25mi',
                exOut: '9 hospitals with CCNs and lat/lng coordinates',
                toolColors: ['purple'],
              },
              {
                num: '03',
                name: 'Price Intel Agent',
                emoji: '💰',
                border: 'border-green-400',
                badge: 'border-green-200 bg-green-50 text-green-700',
                accent: 'text-green-600',
                triggers: 'After hospital list + procedure codes are known',
                tools: ['get_price_data', 'get_asc_prices'],
                returns: 'Medicare payments + national median benchmark',
                exIn: 'DRG 470 at UCSF (050454)',
                exOut: 'avg Medicare paid $72,100, national median $36,400',
                toolColors: ['green', 'green'],
              },
              {
                num: '04',
                name: 'Quality & Financial',
                emoji: '⭐',
                border: 'border-amber-400',
                badge: 'border-amber-200 bg-amber-50 text-amber-700',
                accent: 'text-amber-600',
                triggers: 'After hospital list is known',
                tools: ['get_quality_scores', 'get_financial_assistance'],
                returns: 'CMS stars, Leapfrog grades, charity care ratios',
                exIn: 'CPMC Van Ness (CCN 050076)',
                exOut: '★★★ CMS, Grade B Leapfrog, 1.8% charity care ratio',
                toolColors: ['amber', 'amber'],
              },
              {
                num: '05',
                name: 'Provider Agent',
                emoji: '👨‍⚕️',
                border: 'border-rose-400',
                badge: 'border-rose-200 bg-rose-50 text-rose-700',
                accent: 'text-rose-600',
                triggers: 'When user asks about doctors or surgeons',
                tools: ['get_providers', 'get_provider_ratings'],
                returns: 'Physician list with specialties, ratings, NPI',
                exIn: 'Orthopedic surgeons at UCSF',
                exOut: '4 surgeons, avg Google 4.6★, 2 accepting new patients',
                toolColors: ['rose', 'rose'],
              },
            ].map((agent) => (
              <div key={agent.num} className={`bg-white rounded-2xl border-t-4 ${agent.border} border border-slate-200 p-5 shadow-sm flex flex-col gap-4`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{agent.emoji}</span>
                  <div>
                    <div className="text-xs text-slate-400 font-mono">Agent {agent.num}</div>
                    <div className="font-bold text-slate-900 text-sm">{agent.name}</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Triggers when</span>
                    <p className="text-slate-600 mt-0.5">{agent.triggers}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Tools used</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.tools.map((t) => (
                        <span key={t} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Returns</span>
                    <p className="text-slate-600 mt-0.5">{agent.returns}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 font-mono text-[11px] space-y-1">
                  <div><span className="text-slate-400">in  </span><span className="text-slate-700">{agent.exIn}</span></div>
                  <div className={`${agent.accent}`}><span className="text-slate-400">out </span>{agent.exOut}</div>
                </div>
              </div>
            ))}

            {/* Orchestrator card */}
            <div className="bg-gradient-to-br from-violet-900 to-violet-950 rounded-2xl border border-violet-700 p-5 shadow-md flex flex-col gap-4 text-white">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="text-xs text-violet-400 font-mono">Coordinator</div>
                  <div className="font-bold text-sm">Orchestrator</div>
                </div>
              </div>
              <div className="space-y-2 text-xs text-violet-200">
                <p>Receives user query, decomposes it into workstreams, dispatches sub-agents in parallel, synthesizes final ranked response.</p>
                <p>Checks session context before asking for zip code. Handles ambiguous procedure names with one clarifying question.</p>
              </div>
              <div className="bg-violet-800/50 rounded-lg p-3 text-[11px] space-y-1 font-mono">
                <div className="text-violet-400">Runs sub-agents in parallel:</div>
                <div className="text-violet-200">Step 1: Procedure + Hospital (concurrent)</div>
                <div className="text-violet-200">Step 2: Price + Quality + Provider (concurrent)</div>
                <div className="text-violet-200">Step 3: rank_hospitals → synthesize</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. MCP Server & Tools ─────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            dark
            eyebrow="Custom MCP Server"
            title="10 Domain-Aware Tools"
            subtitle="Built with @modelcontextprotocol/sdk. Bridges AI agents to MongoDB Atlas and external APIs. Each agent only sees the tools it needs."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: 'search_procedures',
                desc: 'Semantic search: natural language → DRG/APC codes',
                input: '{ query: string, top_k?: number }',
                source: 'Atlas Vector Search',
                color: 'text-blue-400',
                srcColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              },
              {
                name: 'find_hospitals_near',
                desc: 'Geocode ZIP/address → $near geo query on hospitals collection',
                input: '{ zip: string, radius_miles?: number, filters?: object }',
                source: 'Atlas $near / Geo',
                color: 'text-purple-400',
                srcColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
              },
              {
                name: 'get_price_data',
                desc: 'Aggregation pipeline: DRG/APC prices per hospital vs national',
                input: '{ hospital_ccns: string[], procedure_codes: string[] }',
                source: 'Atlas Aggregation',
                color: 'text-green-400',
                srcColor: 'bg-green-500/10 text-green-400 border-green-500/20',
              },
              {
                name: 'get_asc_prices',
                desc: 'ASC outpatient alternative pricing — surface the cheaper option',
                input: '{ procedure_codes: string[], zip: string }',
                source: 'asc_prices collection',
                color: 'text-emerald-400',
                srcColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              },
              {
                name: 'get_quality_scores',
                desc: 'CMS star ratings + Leapfrog safety grades per hospital',
                input: '{ hospital_ccns: string[] }',
                source: 'CMS + Leapfrog',
                color: 'text-amber-400',
                srcColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              },
              {
                name: 'get_financial_assistance',
                desc: 'Charity care ratio and uncompensated care from HCRIS',
                input: '{ hospital_ccns: string[] }',
                source: 'HCRIS Cost Reports',
                color: 'text-orange-400',
                srcColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
              },
              {
                name: 'get_providers',
                desc: 'Physicians at a hospital — Atlas Full-Text Search on specialty',
                input: '{ hospital_ccn: string, specialty?: string }',
                source: 'NPI Registry / CMS',
                color: 'text-rose-400',
                srcColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              },
              {
                name: 'get_provider_ratings',
                desc: 'Google Places rating for hospital or individual provider',
                input: '{ npi?: string, name?: string, address?: string }',
                source: 'Google Places API',
                color: 'text-pink-400',
                srcColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
              },
              {
                name: 'rank_hospitals',
                desc: 'Composite score: price + quality + distance + ratings (weighted)',
                input: '{ hospitals: HospitalData[], weights?: object }',
                source: 'Pure computation',
                color: 'text-violet-400',
                srcColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
              },
              {
                name: 'save_session / get_session',
                desc: 'Persist zip, payer, filters across conversation turns (TTL: 30d)',
                input: '{ session_id: string, context: object }',
                source: 'MongoDB TTL Index',
                color: 'text-slate-400',
                srcColor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
              },
            ].map((tool) => (
              <div key={tool.name} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
                <div className={`font-mono text-sm font-bold ${tool.color} mb-1`}>{tool.name}</div>
                <p className="text-slate-400 text-xs mb-3 leading-relaxed">{tool.desc}</p>
                <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-[10px] text-slate-500 mb-3 leading-relaxed">
                  {tool.input}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${tool.srcColor}`}>
                  {tool.source}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Data Sources ───────────────────────────────────────────────── */}
      <section id="data-sources" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Data Sources"
            title="7 Real Data Sources"
            subtitle="All public, all free. No synthetic data — ever."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: '🏥',
                name: 'CMS Medicare Inpatient',
                badge: 'DRG',
                badgeColor: 'bg-blue-100 text-blue-700',
                stat: '145,879',
                statDesc: 'procedure records across 3,000+ hospitals',
                desc: 'Annual bulk CSV from data.cms.gov. What Medicare actually paid per DRG per hospital — the definitive national benchmark.',
                detail: 'Covers knee replacement, cardiac bypass, C-section, hip replacement + hundreds more inpatient DRGs.',
                border: 'border-blue-200',
                bg: 'bg-blue-50',
              },
              {
                icon: '🔬',
                name: 'CMS Medicare Outpatient',
                badge: 'APC',
                badgeColor: 'bg-purple-100 text-purple-700',
                stat: '116,799',
                statDesc: 'outpatient procedure records',
                desc: 'Outpatient procedures billed to Medicare: colonoscopy, MRI, CT scan, minor surgeries, infusion therapy.',
                detail: 'Combined with ASC data to surface the cheapest setting for each procedure.',
                border: 'border-purple-200',
                bg: 'bg-purple-50',
              },
              {
                icon: '⭐',
                name: 'CMS Hospital General Information',
                badge: 'Quality',
                badgeColor: 'bg-yellow-100 text-yellow-700',
                stat: '5,432',
                statDesc: 'hospitals with quality ratings',
                desc: 'CMS 1–5 star ratings, addresses, CCN join key. Every hospital geocoded via Google Maps API.',
                detail: 'The primary join key (CCN) connects pricing data to quality ratings and financial data.',
                border: 'border-yellow-200',
                bg: 'bg-yellow-50',
              },
              {
                icon: '🛡️',
                name: 'Leapfrog Hospital Safety Grades',
                badge: 'Safety',
                badgeColor: 'bg-orange-100 text-orange-700',
                stat: 'A–F',
                statDesc: 'letter grades for surgical safety',
                desc: 'More meaningful than CMS stars for surgical procedures. Leapfrog grades focus specifically on preventable errors.',
                detail: 'Displayed alongside CMS stars — two independent quality signals for each hospital.',
                border: 'border-orange-200',
                bg: 'bg-orange-50',
              },
              {
                icon: '💙',
                name: 'HCRIS Cost Reports',
                badge: 'Charity Care',
                badgeColor: 'bg-rose-100 text-rose-700',
                stat: '$45B+',
                statDesc: 'uncompensated care tracked annually',
                desc: 'HCRIS data shows charity care costs and uncompensated care per hospital — critical for uninsured patients.',
                detail: '"This hospital forgives ~2% of charges — ask about financial counseling before your visit."',
                border: 'border-rose-200',
                bg: 'bg-rose-50',
              },
              {
                icon: '👨‍⚕️',
                name: 'NPI Registry (CMS)',
                badge: 'Providers',
                badgeColor: 'bg-green-100 text-green-700',
                stat: '3.37M',
                statDesc: 'physician and provider records',
                desc: 'Links doctors to their affiliated hospital via CCN. Free API, no key required.',
                detail: 'Combined with CMS Doctors & Clinicians dataset for quality scores and malpractice flags.',
                border: 'border-green-200',
                bg: 'bg-green-50',
              },
              {
                icon: '📍',
                name: 'Google Places API',
                badge: 'Consumer Ratings',
                badgeColor: 'bg-teal-100 text-teal-700',
                stat: '4.2★',
                statDesc: 'avg rating, 1,800+ reviews per hospital',
                desc: 'Consumer ratings and review counts for hospitals and individual practices. Cached in MongoDB after first lookup.',
                detail: '$200/mo free credit — zero cost at demo scale.',
                border: 'border-teal-200',
                bg: 'bg-teal-50',
              },
            ].map((ds) => (
              <div key={ds.name} className={`bg-white rounded-2xl border ${ds.border} p-5 shadow-sm`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{ds.icon}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ds.badgeColor}`}>{ds.badge}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{ds.name}</h3>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-2xl font-extrabold text-slate-900">{ds.stat}</span>
                  <span className="text-xs text-slate-500">{ds.statDesc}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-2">{ds.desc}</p>
                <p className="text-xs text-slate-400 italic leading-relaxed">{ds.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Geo & Location ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <SectionHeading
            eyebrow="Geospatial Layer"
            title="How Location Works"
            subtitle="From a ZIP code to a ranked list of nearby hospitals in under 2 seconds."
          />

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                step: '1',
                title: 'ZIP → Coordinates',
                desc: 'Google Maps Geocoding API converts any US ZIP code or address to lat/lng.',
                detail: '"94102" → { lat: 37.773, lng: -122.431 }',
                color: 'bg-blue-50 border-blue-200',
                num: 'text-blue-600',
              },
              {
                step: '2',
                title: 'MongoDB $near Query',
                desc: '2dsphere index on hospitals.location enables sub-100ms geo queries across 5,000+ hospitals.',
                detail: '$near + $maxDistance: radius × 1609.34',
                color: 'bg-purple-50 border-purple-200',
                num: 'text-purple-600',
              },
              {
                step: '3',
                title: 'Distance + Ranking',
                desc: 'Haversine distance in miles attached to each result. Fed into composite rank_hospitals score.',
                detail: 'Weight: distance 15%, price 35%, quality 30%, ratings 20%',
                color: 'bg-green-50 border-green-200',
                num: 'text-green-600',
              },
            ].map((s) => (
              <div key={s.step} className={`rounded-2xl border ${s.color} p-5`}>
                <div className={`text-3xl font-black mb-3 ${s.num}`}>{s.step}</div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">{s.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{s.desc}</p>
                <div className="bg-white/80 rounded-lg border border-slate-200 px-3 py-2 font-mono text-[11px] text-slate-500">{s.detail}</div>
              </div>
            ))}
          </div>

          {/* MongoDB geo query code block */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2 border-b border-slate-700">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="text-slate-500 text-xs ml-2 font-mono">mcp-server/src/tools/findHospitalsNear.ts</span>
            </div>
            <div className="p-5 font-mono text-xs leading-relaxed">
              <div className="text-slate-600">{'// Atlas $near geo query — requires 2dsphere index on hospitals.location'}</div>
              <div className="mt-2">
                <span className="text-purple-400">const</span>
                <span className="text-white"> hospitals </span>
                <span className="text-slate-400">= await db.collection(</span>
                <span className="text-green-400">&apos;hospitals&apos;</span>
                <span className="text-slate-400">).find({'({'}</span>
              </div>
              <div className="pl-4">
                <div><span className="text-slate-300">location</span><span className="text-slate-400">: {'{'}</span></div>
                <div className="pl-4">
                  <div><span className="text-blue-400">$near</span><span className="text-slate-400">: {'{'}</span></div>
                  <div className="pl-4">
                    <div><span className="text-blue-400">$geometry</span><span className="text-slate-400">: {'{ type: '}</span><span className="text-green-400">&apos;Point&apos;</span><span className="text-slate-400">{', coordinates: [lng, lat] }'}</span></div>
                    <div><span className="text-blue-400">$maxDistance</span><span className="text-slate-400">: radiusMiles * </span><span className="text-yellow-400">1609.34</span><span className="text-slate-400">,</span></div>
                  </div>
                  <div><span className="text-slate-400">{'},'}</span></div>
                </div>
                <div><span className="text-slate-400">{'}'}</span></div>
              </div>
              <div><span className="text-slate-400">{'}).limit(20).toArray();'}</span></div>
              <div className="mt-3 text-slate-600">{'// Returns hospitals sorted by distance. 2dsphere index makes this ~80ms.'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Real Data Sample ───────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="Real Data"
            title="Real Data. Real Hospitals. Real Prices."
            subtitle="DRG 470 — Major Knee/Hip Replacement. Medicare payment averages, fiscal year 2024."
          />

          {/* Price table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-6">
            {/* National median reference bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
              <div className="w-3 h-0.5 bg-slate-400 border-t-2 border-dashed border-slate-400" />
              <span className="text-xs text-slate-500 font-medium">National median (DRG 470): <span className="font-bold text-slate-700">$36,400</span></span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">City</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Medicare Paid</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">vs National</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CMS ★</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Discharges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { name: 'Good Samaritan Hospital', city: 'San Jose, CA', paid: '$29,800', pct: '-18%', pctPos: false, stars: 3, discharges: 156, best: false },
                    { name: 'Kaiser Foundation Hosp – SF', city: 'San Francisco, CA', paid: '$32,039', pct: '-12%', pctPos: false, stars: 4, discharges: 187, best: true },
                    { name: 'Stanford Health Care', city: 'Palo Alto, CA', paid: '$48,200', pct: '+32%', pctPos: true, stars: 5, discharges: 445, best: false },
                    { name: 'CPMC Van Ness Campus', city: 'San Francisco, CA', paid: '$61,969', pct: '+70%', pctPos: true, stars: 3, discharges: 203, best: false },
                    { name: 'UCSF Medical Center', city: 'San Francisco, CA', paid: '$72,100', pct: '+98%', pctPos: true, stars: 4, discharges: 312, best: false },
                  ].map((row) => (
                    <tr key={row.name} className={`hover:bg-slate-50 transition-colors ${row.best ? 'bg-green-50/50' : ''}`}>
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {row.best && (
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded flex-shrink-0">BEST VALUE</span>
                          )}
                          {row.name}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{row.city}</td>
                      <td className="px-4 py-3.5 text-right font-bold font-mono tabular-nums text-slate-900">{row.paid}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${row.pctPos ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {row.pct}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-yellow-500 text-sm">
                        {'★'.repeat(row.stars)}{'☆'.repeat(5 - row.stars)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-500 tabular-nums text-xs">{row.discharges.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            <span className="font-semibold text-slate-500">Source:</span> CMS Medicare Provider Utilization and Payment Data: Inpatient, FY2024.
            These are Medicare average payments — commercial rates are typically <span className="font-semibold">150–300% higher</span>.
            Individual patient costs vary based on plan, deductible, and network status.
          </p>
        </div>
      </section>

      {/* ── 10. MongoDB Features ──────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            dark
            eyebrow="MongoDB Atlas"
            title="Every Atlas Feature, Visibly Used"
            subtitle="Each MongoDB capability appears in the demo and directly shapes the user experience — not just listed in a README."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                feature: 'Atlas Vector Search',
                where: 'search_procedures tool',
                why: '"knee replacement" → DRG 470 via semantic similarity — no exact match needed',
                badge: 'Vector',
                color: 'border-blue-500/40 bg-blue-500/5',
                badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                icon: '🔍',
              },
              {
                feature: '$median Aggregation',
                where: 'Price Intel Agent',
                why: 'National benchmark across 260K+ records in a single pipeline stage',
                badge: 'Aggregation',
                color: 'border-green-500/40 bg-green-500/5',
                badgeColor: 'bg-green-500/10 text-green-400 border-green-500/20',
                icon: '📊',
              },
              {
                feature: '$near Geospatial',
                where: 'Hospital Discovery Agent',
                why: 'Find 20 nearest hospitals to any coordinates — requires 2dsphere index',
                badge: 'Geospatial',
                color: 'border-purple-500/40 bg-purple-500/5',
                badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                icon: '📍',
              },
              {
                feature: 'Atlas Full-Text Search',
                where: 'Compare page UI',
                why: 'Hospital name autocomplete, live search-as-you-type across 5,000 hospitals',
                badge: 'Full-Text',
                color: 'border-amber-500/40 bg-amber-500/5',
                badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                icon: '🔤',
              },
              {
                feature: 'TTL Index',
                where: 'sessions collection',
                why: 'Sessions auto-expire after 30 days — built-in privacy, zero application code needed',
                badge: 'TTL',
                color: 'border-rose-500/40 bg-rose-500/5',
                badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                icon: '⏰',
              },
              {
                feature: '2dsphere Index',
                where: 'hospitals + asc_prices collections',
                why: 'Prerequisite for $near queries. Without this, geo search is a full collection scan',
                badge: 'Index',
                color: 'border-teal-500/40 bg-teal-500/5',
                badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
                icon: '🌐',
              },
              {
                feature: 'Compound Indexes',
                where: 'prices collection',
                why: '{ procedure_code, hospital_ccn, cms_year } — sub-100ms queries on 260K+ docs',
                badge: 'Performance',
                color: 'border-orange-500/40 bg-orange-500/5',
                badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                icon: '⚡',
              },
              {
                feature: 'Aggregation Pipelines',
                where: 'get_price_data tool',
                why: '$match → $group → $project → $round — multi-stage price rollup per hospital',
                badge: 'Aggregation',
                color: 'border-violet-500/40 bg-violet-500/5',
                badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                icon: '🔄',
              },
            ].map((f) => (
              <div key={f.feature} className={`rounded-2xl border ${f.color} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl">{f.icon}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${f.badgeColor}`}>
                    {f.badge}
                  </span>
                </div>
                <div className="font-bold text-white text-sm mb-1">{f.feature}</div>
                <div className="text-slate-500 text-xs mb-2 font-mono">{f.where}</div>
                <p className="text-slate-400 text-xs leading-relaxed">{f.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. Why It Matters ────────────────────────────────────────────── */}
      <section id="why" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="Impact"
            title="Why This Matters"
            subtitle="100 million Americans carry medical debt. The data to prevent it has been public since 2021. Nobody made it usable — until now."
          />

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                audience: 'For Patients',
                emoji: '🧑‍⚕️',
                stat: '100M',
                statDesc: 'Americans with medical debt',
                points: [
                  'Compare prices before elective procedures',
                  'Find highest-rated hospital at lowest price',
                  'Identify hospitals with charity care programs',
                  'See if an ASC is 50% cheaper for your surgery',
                  '"I\'m uninsured" mode: cash prices + charity care',
                ],
                border: 'border-brand',
                statColor: 'text-brand',
                bg: 'bg-blue-50/50',
              },
              {
                audience: 'For Employers',
                emoji: '🏢',
                stat: '$23K',
                statDesc: 'avg annual family premium (2024)',
                points: [
                  'Benchmark insurer contracts vs Medicare rates',
                  'Build reference-based pricing programs',
                  'Identify Centers of Excellence',
                  'Negotiate better rates with real data',
                  'Surface ASC alternatives for employees',
                ],
                border: 'border-purple-400',
                statColor: 'text-purple-600',
                bg: 'bg-purple-50/50',
              },
              {
                audience: 'For Researchers',
                emoji: '📐',
                stat: '6,000+',
                statDesc: 'hospital price files — all normalized',
                points: [
                  'Price variation across geographies',
                  'Quality vs cost correlation analysis',
                  'Charity care distribution by system',
                  'Payer negotiation power analysis',
                  'ASC vs hospital setting savings by state',
                ],
                border: 'border-green-400',
                statColor: 'text-green-600',
                bg: 'bg-green-50/50',
              },
            ].map(({ audience, emoji, stat, statDesc, points, border, statColor, bg }) => (
              <div key={audience} className={`rounded-2xl border-2 ${border} ${bg} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{emoji}</span>
                  <h3 className="font-bold text-lg text-slate-900">{audience}</h3>
                </div>
                <div className={`text-4xl font-black ${statColor} mb-0.5`}>{stat}</div>
                <div className="text-xs text-slate-500 mb-5">{statDesc}</div>
                <ul className="space-y-2">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-green-500 mt-0.5 flex-shrink-0 font-bold">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12. Limitations ───────────────────────────────────────────────── */}
      <section id="limitations" className="py-16 px-6 bg-amber-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-4 py-1.5 text-xs font-semibold mb-4">
              ⚠ Known Limitations
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">What this tool can and can&apos;t do</h2>
            <p className="text-slate-600 text-sm">We believe in transparency. Here&apos;s exactly where ClearPrice falls short.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              {
                title: 'Medicare rates, not your insurer\'s rate',
                desc: 'Commercial rates are typically 150–300% of Medicare. Your out-of-pocket depends on your specific plan, deductible, and network.',
              },
              {
                title: 'Prices are averages, not guarantees',
                desc: 'Medicare payments shown are hospital-level averages. Individual cases vary by complexity, length of stay, and complications.',
              },
              {
                title: 'Data is 1–2 years behind',
                desc: 'CMS publishes annually with a 1–2 year lag. Prices reflect 2022–2024 data. Hospital rates change each year.',
              },
              {
                title: 'Not a substitute for medical advice',
                desc: 'ClearPrice presents data — it does not recommend providers, procedures, or treatments. Always consult your physician.',
              },
              {
                title: 'Rural coverage gaps',
                desc: 'Critical Access Hospitals and some rural facilities report differently or are excluded from CMS bulk datasets.',
              },
              {
                title: 'No PHI ever collected',
                desc: 'Session context (zip code, payer) is ephemeral with a 30-day TTL. Never linked to patient identity. No login required.',
              },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-amber-200 p-4 flex items-start gap-3">
                <span className="text-amber-500 flex-shrink-0 text-base mt-0.5">⚠</span>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 13. Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-32 px-6 bg-slate-950 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1B4FE815_0%,_transparent_70%)] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/30 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live — CMS 2024 Medicare data
          </div>

          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            <span className="text-white">The data was always public.</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
              We just made it human.
            </span>
          </h2>

          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Ask about any procedure, any zip code — 3,000+ hospitals, real Medicare prices, zero signup.
          </p>

          <Link
            href="/app"
            className="inline-flex items-center gap-2 bg-brand text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-blue-600 transition-all shadow-2xl shadow-brand/40 hover:shadow-brand/60 hover:-translate-y-0.5"
          >
            Ask About Hospital Prices →
          </Link>

          <p className="mt-5 text-sm text-slate-600">
            No account required · CMS FY2024 data · Free forever
          </p>

          {/* Tech badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-12">
            {[
              'Google ADK', 'Gemini 2.5 Pro', 'Vertex AI Agent Runtime',
              'MongoDB Atlas', 'Atlas Vector Search', 'Custom MCP Server',
              'Hono.js', 'Next.js 14', 'Cloud Run',
            ].map((tech) => (
              <span key={tech} className="bg-white/5 border border-white/10 text-slate-400 text-xs px-3 py-1.5 rounded-full">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-white/5 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2.5">
            <Logo size={5} />
            <span className="font-semibold text-slate-400">ClearPrice</span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline text-xs">Data from CMS.gov · Not medical advice · Prices are estimates</span>
          </div>
          <div className="flex gap-5 text-xs">
            <Link href="/app" className="hover:text-slate-300 transition-colors">App</Link>
            <Link href="/compare" className="hover:text-slate-300 transition-colors">Compare</Link>
            <Link href="/map" className="hover:text-slate-300 transition-colors">Map</Link>
            <a href="#architecture" className="hover:text-slate-300 transition-colors">Architecture</a>
            <a href="https://github.com" className="hover:text-slate-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
