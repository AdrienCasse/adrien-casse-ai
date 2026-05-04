'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Github, Linkedin, RotateCcw, MapPin, Briefcase, ShieldCheck } from 'lucide-react'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002'

const SUGGESTIONS = [
  'Quel est son profil en quelques mots ?',
  'Que fait-il concrètement au quotidien ?',
  'Pourquoi cherche-t-il un nouveau poste ?',
  'Comment fonctionne ce chatbot techniquement ?',
  'Ses projets data personnels ?',
  'Ses prétentions salariales et sa disponibilité ?',
]

const STACK = ['Python', 'SQL', 'GCP', 'BigQuery', 'FastAPI', 'R', 'Next.js']

type Message = { role: 'user' | 'assistant'; content: string }

function AssistantMessage({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/).filter(Boolean)
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </>
  )
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sb-identity">
        <div className="sb-avatar">AC</div>
        <div>
          <div className="sb-name">Adrien Casse</div>
          <div className="sb-role">Data Scientist</div>
        </div>
        <div className="sb-status">
          <span className="sb-status-dot" />
          En écoute du marché
        </div>
      </div>

      <div className="sb-section">
        <div className="sb-row">
          <div className="sb-row-icon"><MapPin size={14} /></div>
          <div className="sb-row-label">Paris · Île Maurice</div>
        </div>
        <div className="sb-row">
          <div className="sb-row-icon"><Briefcase size={14} /></div>
          <div className="sb-row-label">2 ans · CDI Data Science</div>
        </div>
        <div className="sb-row">
          <div className="sb-row-icon"><ShieldCheck size={14} /></div>
          <div className="sb-row-label">Passeport Talent · 2026–2030</div>
        </div>
      </div>

      <div className="sb-stack-section">
        <div className="section-label">Stack</div>
        <div className="sb-stack-tags">
          {STACK.map(s => (
            <span key={s} className="sb-stack-tag">{s}</span>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default function Home() {
  const [history, setHistory] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const newHistory: Message[] = [...history, { role: 'user', content: msg }]
    setHistory(newHistory)
    setLoading(true)

    try {
      const res = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: newHistory.slice(0, -1) }),
      })
      const data = await res.json()
      setHistory(h => [...h, { role: 'assistant', content: data.reply }])
    } catch {
      setHistory(h => [...h, { role: 'assistant', content: 'Erreur de connexion.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const empty = history.length === 0
  const canSend = !!input.trim() && !loading

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="chat-shell">
        <div className="chat-shell-inner">

          <header className="chat-header">
            <div className="mobile-id">
              <div className="mobile-id-avatar">AC</div>
              <div style={{ minWidth: 0 }}>
                <div className="mobile-id-name">Adrien Casse</div>
                <div className="mobile-id-sub">Data Scientist · Paris</div>
              </div>
            </div>

            <div className="header-actions">
              <a href="https://github.com/AdrienCasse" target="_blank" rel="noreferrer" className="btn-link" aria-label="GitHub">
                <Github size={13} /> GitHub
              </a>
              <a href="https://www.linkedin.com/in/adrien-casse" target="_blank" rel="noreferrer" className="btn-link" aria-label="LinkedIn">
                <Linkedin size={13} /> LinkedIn
              </a>
              {!empty && (
                <button onClick={() => { setHistory([]); setInput('') }}
                        className="btn-link btn-reset"
                        aria-label="Réinitialiser la conversation">
                  <RotateCcw size={12} /> Réinitialiser
                </button>
              )}
            </div>
          </header>

          <div className="chat-body">

            {empty && (
              <div className="empty-state">
                <div>
                  <div className="empty-title">Bonjour, je suis Adrien.</div>
                  <div className="empty-sub">
                    Le micro est à vous — questions pros sur son parcours, sa stack, ses projets, son fonctionnement. Le RAG fait le reste.
                  </div>
                </div>

                <div>
                  <div className="section-label" style={{ marginBottom: 10 }}>Suggestions</div>
                  <div className="suggestions">
                    {SUGGESTIONS.map(s => (
                      <button key={s} className="suggestion" onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!empty && (
              <div className="messages">
                {history.map((m, i) => (
                  <div key={i} className={`msg-row ${m.role}`}>
                    {m.role === 'assistant' && <div className="msg-avatar">AC</div>}
                    <div className={`bubble ${m.role}`}>
                      {m.role === 'assistant'
                        ? <AssistantMessage content={m.content} />
                        : <p>{m.content}</p>}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="msg-row assistant">
                    <div className="msg-avatar">AC</div>
                    <div className="typing">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="input-area">
            <div className={`input-shell ${canSend ? 'active' : ''}`}>
              <textarea
                ref={inputRef}
                className="input-textarea"
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Posez votre question..."
                rows={1}
              />
              <button
                onClick={() => send()}
                disabled={!canSend}
                className={`send-btn ${canSend ? 'active' : ''}`}
                aria-label="Envoyer"
              >
                {loading
                  ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={15} />}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
