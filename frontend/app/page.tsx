'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Github, Linkedin, RotateCcw } from 'lucide-react'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002'

const SUGGESTIONS = [
  'Quel est son profil en quelques mots ?',
  'Ce qu\'il fait concrètement chez C-Ways ?',
  'Pourquoi sa stack GCP en prod se distingue ?',
  'Comment il rend la donnée utile pour les équipes ?',
  'Ses projets data personnels ?',
  'Ses prétentions salariales et sa disponibilité ?',
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
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          background: #0a0f1e;
          color: #cbd5e1;
          height: 100dvh;
          overflow: hidden;
        }
        ::placeholder { color: rgba(100,116,139,0.6); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(51,65,85,0.8); border-radius: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%,60%,100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .suggestion:hover {
          background: rgba(30,41,59,0.9) !important;
          border-color: rgba(51,65,85,0.8) !important;
          color: #e2e8f0 !important;
        }
        .suggestion { transition: all 0.15s; }
        .link:hover { opacity: 1 !important; }
        .link { transition: opacity 0.15s; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0 16px',
          borderBottom: '1px solid rgba(30,41,59,0.8)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '-0.5px',
            }}>AC</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.2px' }}>
                Adrien Casse
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                Data Analyst · Data Scientist Junior · Paris
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="https://github.com/AdrienCasse" target="_blank" rel="noreferrer" className="link"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 7,
                background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(30,41,59,0.9)',
                color: '#94a3b8', textDecoration: 'none', fontSize: 11, opacity: 0.8,
              }}>
              <Github size={12} /> GitHub
            </a>
            <a href="https://www.linkedin.com/in/adrien-casse" target="_blank" rel="noreferrer" className="link"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 7,
                background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(30,41,59,0.9)',
                color: '#94a3b8', textDecoration: 'none', fontSize: 11, opacity: 0.8,
              }}>
              <Linkedin size={12} /> LinkedIn
            </a>
            {!empty && (
              <button onClick={() => { setHistory([]); setInput('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 10px', borderRadius: 7,
                  background: 'transparent', border: '1px solid rgba(30,41,59,0.9)',
                  color: '#64748b', cursor: 'pointer', fontSize: 11,
                }}>
                <RotateCcw size={11} /> Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0 12px' }}>

          {empty && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 16 }}>
              {/* Intro */}
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.5px', marginBottom: 10 }}>
                  Bonjour, je suis Adrien.
                </div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.75, maxWidth: 540 }}>
                  Data Analyst et Data Scientist Junior. Je construis des pipelines de données et des analyses
                  qui rendent la donnée lisible, utile, et actionnée — pour que toute l'équipe puisse décider
                  sur des bases solides, pas sur des intuitions. Posez-moi vos questions.
                </div>
              </div>

              {/* Suggestions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, color: '#334155', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Suggestions
                </div>
                {SUGGESTIONS.map(s => (
                  <button key={s} className="suggestion" onClick={() => send(s)}
                    style={{
                      background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(30,41,59,0.8)',
                      borderRadius: 8, padding: '10px 14px',
                      color: '#94a3b8', fontSize: 13, textAlign: 'left',
                      cursor: 'pointer', lineHeight: 1.4,
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
                  alignItems: 'flex-start', gap: 10,
                }}>
                  {m.role === 'assistant' && (
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0, marginTop: 2,
                      background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: '-0.3px',
                    }}>AC</div>
                  )}
                  <div style={{
                    maxWidth: '82%',
                    background: m.role === 'user' ? 'rgba(30,41,59,0.8)' : 'rgba(15,23,42,0.5)',
                    border: `1px solid ${m.role === 'user' ? 'rgba(51,65,85,0.7)' : 'rgba(30,41,59,0.7)'}`,
                    borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '3px 12px 12px 12px',
                    padding: '11px 14px', fontSize: 13.5,
                    color: m.role === 'user' ? '#cbd5e1' : '#b0bec5',
                    lineHeight: 1.7,
                  }}>
                    {m.role === 'assistant'
                      ? <AssistantMessage content={m.content} />
                      : <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: 'white',
                  }}>AC</div>
                  <div style={{
                    background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(30,41,59,0.7)',
                    borderRadius: '3px 12px 12px 12px', padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 6, height: 6, borderRadius: '50%', background: '#2563eb',
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
        <div style={{ flexShrink: 0, paddingBottom: 20 }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'rgba(15,23,42,0.8)',
            border: `1px solid ${canSend ? 'rgba(37,99,235,0.4)' : 'rgba(30,41,59,0.9)'}`,
            borderRadius: 10, padding: '11px 12px',
            transition: 'border-color 0.15s',
          }}>
            <textarea ref={inputRef}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#e2e8f0', fontSize: 14, lineHeight: 1.5,
                resize: 'none', minHeight: 22, maxHeight: 120,
                fontFamily: 'inherit',
              }}
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
            <button onClick={() => send()} disabled={!canSend}
              style={{
                background: canSend ? '#2563eb' : 'rgba(30,41,59,0.8)',
                border: 'none', borderRadius: 7, padding: '8px 11px',
                cursor: canSend ? 'pointer' : 'not-allowed', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
              {loading
                ? <Loader2 size={15} style={{ color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
                : <Send size={15} style={{ color: canSend ? 'white' : '#334155' }} />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
