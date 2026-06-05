'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import AgentStatusPanel, { AgentState } from './AgentStatusPanel'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const DEFAULT_AGENTS: AgentState = {
  procedure_agent: 'pending',
  hospital_discovery_agent: 'pending',
  price_intel_agent: 'pending',
  quality_financial_agent: 'pending',
  provider_agent: 'pending',
  insurance_agent: 'pending',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

const THINKING_STEPS = [
  { label: 'Looking up medical codes…', duration: 3000 },
  { label: 'Finding hospitals nearby…', duration: 4000 },
  { label: 'Fetching prices & quality scores…', duration: 4000 },
  { label: 'Preparing your comparison…', duration: Infinity },
]

function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function ThinkingIndicator() {
  const [stepIdx, setStepIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => setElapsed((e) => e + 100), 100)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    if (stepIdx >= THINKING_STEPS.length - 1) return
    const { duration } = THINKING_STEPS[stepIdx]
    const t = setTimeout(() => setStepIdx((i) => i + 1), duration)
    return () => clearTimeout(t)
  }, [stepIdx])

  // Progress within current step
  const stepDuration = THINKING_STEPS[stepIdx].duration === Infinity ? 5000 : THINKING_STEPS[stepIdx].duration
  const stepElapsed = elapsed - THINKING_STEPS.slice(0, stepIdx).reduce((acc, s) => acc + (s.duration === Infinity ? 0 : s.duration), 0)
  const stepProgress = Math.min((stepElapsed / stepDuration) * 100, stepIdx === THINKING_STEPS.length - 1 ? 85 : 95)

  // Overall progress (rough)
  const totalEstimate = 14000
  const overallProgress = Math.min((elapsed / totalEstimate) * 100, 90)

  return (
    <div className="space-y-3 w-64">
      {/* Overall progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-600">Thinking…</span>
          <span className="text-xs text-slate-400">{(elapsed / 1000).toFixed(1)}s</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-1.5">
        {THINKING_STEPS.map((step, i) => {
          const isDone = i < stepIdx
          const isActive = i === stepIdx
          return (
            <div key={i} className="flex items-center gap-2">
              {isDone ? (
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : isActive ? (
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                </span>
              ) : (
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                </span>
              )}
              <span className={`text-xs ${isDone ? 'text-slate-400 line-through' : isActive ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                {step.label}
              </span>
              {isActive && (
                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${stepProgress}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AssistantMarkdown({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className={`prose prose-sm max-w-none text-slate-800 ${streaming ? 'streaming-cursor' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
          th: ({ children }) => (
            <th className="text-left px-2 py-1.5 font-semibold text-slate-600 border border-slate-200 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1.5 border border-slate-200 tabular-nums">{children}</td>
          ),
          tr: ({ children }) => <tr className="even:bg-slate-50">{children}</tr>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 my-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 my-1">{children}</ol>,
          li: ({ children }) => <li className="text-slate-700">{children}</li>,
          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
          code: ({ children }) => (
            <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

interface Props {
  onMessage?: (content: string) => void
  onUserSend?: (text: string) => void
  onLoadingChange?: (loading: boolean) => void
}

export default function ChatInterface({ onMessage, onUserSend, onLoadingChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m **ClearPrice**. Ask me about hospital prices near you — for example:\n\n- *"What will a knee replacement cost near zip 94102?"*\n- *"Compare colonoscopy prices for hospitals in Chicago"*\n- *"Which hospital near 10001 has the best value for hip replacement?"*',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState<AgentState>(DEFAULT_AGENTS)
  const [suggestionChips, setSuggestionChips] = useState<string[]>([])
  const sessionIdRef = useRef(generateSessionId())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const setLoadingState = useCallback((val: boolean) => {
    setLoading(val)
    onLoadingChange?.(val)
  }, [onLoadingChange])

  const resetAgents = () => setAgents(DEFAULT_AGENTS)

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setLoadingState(true)
    resetAgents()
    setSuggestionChips([])

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    onUserSend?.(text)

    const assistantIdx = messages.length + 1
    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }])

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          message: text,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (let line of lines) {
          line = line.trim()
          if (!line) continue

          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim()
            try {
              const parsed = JSON.parse(dataStr)

              if (currentEvent === 'agent_status') {
                const { agent, status } = parsed as { agent: keyof AgentState; status: 'running' | 'complete' }
                setAgents((prev) => ({ ...prev, [agent]: status }))
              } else if (currentEvent === 'message_chunk') {
                const chunk = parsed.text ?? ''
                setMessages((prev) => {
                  if (prev.length === 0) return prev
                  const last = prev[prev.length - 1]
                  if (last.role === 'assistant') {
                    const next = [...prev]
                    next[next.length - 1] = { ...last, content: last.content + chunk, streaming: true }
                    return next
                  }
                  return prev
                })
              } else if (currentEvent === 'suggestion_chips') {
                setSuggestionChips((parsed.chips ?? []) as string[])
              } else if (currentEvent === 'message') {
                const finalContent = parsed.content ?? ''
                setMessages((prev) => {
                  if (prev.length === 0) return prev
                  const last = prev[prev.length - 1]
                  if (last.role === 'assistant') {
                    const next = [...prev]
                    next[next.length - 1] = { ...last, content: finalContent, streaming: false }
                    return next
                  }
                  return prev
                })
                onMessage?.(finalContent)
              } else if (currentEvent === 'error') {
                throw new Error(parsed.error)
              }
            } catch (err) {
              console.error('[ChatInterface] SSE parse error:', err, 'for data:', dataStr)
            }
          }
        }
      }

      setAgents((prev) => {
        const next = { ...prev }
        for (const k of Object.keys(next) as Array<keyof AgentState>) {
          if (next[k] === 'running') next[k] = 'complete'
        }
        return next
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === assistantIdx
              ? { ...m, content: `Sorry, something went wrong: ${(err as Error).message}`, streaming: false }
              : m
          )
        )
      }
    } finally {
      setLoadingState(false)
    }
  }, [loading, messages.length, onMessage, onUserSend, setLoadingState])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand flex items-center justify-center mr-2 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            )}
            {m.role === 'assistant' ? (
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-slate-200 shadow-sm">
                {m.content ? (
                  <AssistantMarkdown content={m.content} streaming={m.streaming} />
                ) : m.streaming ? (
                  <ThinkingIndicator />
                ) : null}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed bg-brand text-white">
                {m.content}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Agent status */}
      <div className="px-4 pb-2">
        <AgentStatusPanel agents={agents} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about hospital prices near you..."
            rows={1}
            className="flex-1 resize-none outline-none text-sm text-slate-800 placeholder-slate-400 bg-transparent py-1 max-h-32"
            style={{ minHeight: '1.5rem' }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
        <div className="flex gap-2 mt-2 flex-wrap">
          {(suggestionChips.length > 0
            ? suggestionChips
            : ['Knee replacement near 94102', 'Colonoscopy in Chicago', 'Hip replacement 10001']
          ).map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={loading}
              className="text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 hover:border-brand hover:text-brand transition-colors disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
