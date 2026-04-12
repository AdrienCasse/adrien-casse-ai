'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002'

const SUGGESTIONS = [
  'Parle-moi de ton parcours',
  'Qu\'est-ce que tu fais vraiment chez C-Ways ?',
  'Pourquoi tu as quitté l\'île Maurice à 17 ans ?',
  'Quels sont tes projets data personnels ?',
  'Comment tu travailles en équipe ?',
  'Tu te positionnes comment — analyst, scientist, engineer ?',
  'C\'est quoi ton rapport à la data ?',
  'Tu fais quoi en dehors du boulot ?',
]

type Message = { role: 'user' | 'assistant'; content: string }

function AssistantMessage({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/).filter(Boolean)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ margin: 0, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{para}</p>
      ))}
    </div>
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
        body: JSON.stringify({
          message: msg,
          history: newHistory.slice(0, -1),
        }),
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
    <div style={{
      minHeight: '100vh',
      background: '#020617',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Exo 2', system-ui, sans-serif",
      padding: '24px 16px',
    }}>
      {/* Dot grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', height: '100dvh', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ paddingTop: 24, paddingBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-1px',
              boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
            }}>AC</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>
                Adrien Casse
              </div>
              <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.8)', marginTop: 2 }}>
                Data Scientist · Paris — Pose-lui une question
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '3px 9px', fontWeight: 600 }}>
                ● En ligne
              </span>
              <a href="https://github.com/AdrienCasse" target="_blank" rel="noreferrer"
                style={{ fontSize: 10, color: 'rgba(148,163,184,0.7)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '3px 9px', textDecoration: 'none' }}>
                GitHub →
              </a>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>

          {empty && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, minHeight: '100%', paddingBottom: 32 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 8 }}>
                  Pose-moi une question
                </div>
                <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
                  Je connais son parcours, ses projets, sa façon de travailler et ce qui l'anime.
                  Demande-moi n'importe quoi — je réponds comme lui.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(148,163,184,0.85)', borderRadius: 10, padding: '11px 14px',
                      fontSize: 12, textAlign: 'left', lineHeight: 1.4, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget
                      el.style.background = 'rgba(59,130,246,0.08)'
                      el.style.borderColor = 'rgba(59,130,246,0.25)'
                      el.style.color = 'rgba(186,230,253,0.9)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget
                      el.style.background = 'rgba(255,255,255,0.03)'
                      el.style.borderColor = 'rgba(255,255,255,0.08)'
                      el.style.color = 'rgba(148,163,184,0.85)'
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!empty && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
              {history.map((m, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 10, alignItems: 'flex-start',
                }}>
                  {m.role === 'assistant' && (
                    <div style={{
                      width: 30, height: 30, borderRadius: 9, flexShrink: 0, marginTop: 2,
                      background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: '-0.5px',
                    }}>AC</div>
                  )}
                  <div style={{
                    maxWidth: '82%',
                    background: m.role === 'user' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${m.role === 'user' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                    padding: '12px 16px',
                    fontSize: 14,
                    color: m.role === 'user' ? 'rgba(186,230,253,0.9)' : 'rgba(226,232,240,0.92)',
                  }}>
                    {m.role === 'assistant'
                      ? <AssistantMessage content={m.content} />
                      : <span style={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{m.content}</span>}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: 'white',
                  }}>AC</div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px 14px 14px 14px', padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 6, height: 6, borderRadius: '50%', background: '#3b82f6',
                          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          flexShrink: 0, marginBottom: 16,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${canSend ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', gap: 10, alignItems: 'flex-end',
          transition: 'border-color 0.15s',
          boxShadow: canSend ? '0 0 0 1px rgba(59,130,246,0.1)' : 'none',
        }}>
          <textarea ref={inputRef}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'rgba(226,232,240,0.92)', fontSize: 14, lineHeight: 1.5,
              resize: 'none', minHeight: 22, maxHeight: 140,
              fontFamily: "'Exo 2', system-ui, sans-serif",
            }}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Pose ta question à Adrien..."
            rows={1}
          />
          <button onClick={() => send()} disabled={!canSend}
            style={{
              background: canSend ? 'linear-gradient(135deg, #1e40af, #3b82f6)' : 'rgba(255,255,255,0.06)',
              border: 'none', borderRadius: 9, padding: '9px 12px',
              cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
              boxShadow: canSend ? '0 2px 10px rgba(59,130,246,0.3)' : 'none',
            }}>
            {loading
              ? <Loader2 size={16} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
              : <Send size={16} style={{ color: canSend ? 'white' : 'rgba(148,163,184,0.4)' }} />}
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(148,163,184,0.3)', marginBottom: 8 }}>
          Propulsé par Llama 3.1 70B · pipeline RAG sentence-transformers + FAISS
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
