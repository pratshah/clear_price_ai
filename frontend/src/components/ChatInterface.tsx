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

function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function AssistantMarkdown({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className={`prose prose-sm max-w-none text-slate-800 ${streaming ? 'streaming-cursor' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Tables — clean bordered style
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
          // Bold
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          // Lists
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 my-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 my-1">{children}</ol>,
          li: ({ children }) => <li className="text-slate-700">{children}</li>,
          // Paragraphs
          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
          // Code
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
}

export default function ChatInterface({ onMessage, onUserSend }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m **ClearPrice**. Ask me about hospital prices near you — for example:\n\n- *"What will a knee replacement cost near zip 94102?"*\n- *"Compare colonoscopy prices for hospitals in Chicago"*\n- *"Which hospital near 10001 has the best value for hip replacement?"*',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState<AgentState>(DEFAULT_AGENTS)
  const sessionIdRef = useRef(generateSessionId())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const resetAgents = () => setAgents(DEFAULT_AGENTS)

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setLoading(true)
    resetAgents()

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

      if (!res.ok) {
        throw new Error(`API error ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            // handled in next iteration
          } else if (line.startsWith('data: ')) {
            const eventLine = lines[lines.indexOf(line) - 1] ?? ''
            const event = eventLine.replace('event: ', '')
            const data = line.replace('data: ', '')

            try {
              const parsed = JSON.parse(data)

              if (event === 'agent_status') {
                const { agent, status } = parsed as { agent: keyof AgentState; status: 'running' | 'complete' }
                setAgents((prev) => ({ ...prev, [agent]: status }))
              } else if (event === 'message_chunk') {
                const chunk = parsed.text ?? ''
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === assistantIdx ? { ...m, content: m.content + chunk, streaming: true } : m
                  )
                )
              } else if (event === 'message') {
                const finalContent = parsed.content ?? ''
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === assistantIdx ? { ...m, content: finalContent, streaming: false } : m
                  )
                )
                onMessage?.(finalContent)
              } else if (event === 'error') {
                throw new Error(parsed.error)
              }
            } catch {
              // ignore parse errors for non-data lines
            }
          }
        }
      }

      // Mark any still-running agents complete
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
      setLoading(false)
    }
  }, [loading, messages.length, onMessage])

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
                {m.content
                  ? <AssistantMarkdown content={m.content} streaming={m.streaming} />
                  : m.streaming
                    ? <span className="inline-block w-4 h-4 rounded-full bg-slate-200 animate-pulse" />
                    : null
                }
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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <div className="flex gap-2 mt-2 flex-wrap">
          {['Knee replacement near 94102', 'Colonoscopy in Chicago', 'Hip replacement 10001'].map((q) => (
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
