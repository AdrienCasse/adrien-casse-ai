'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Github, MapPin, GraduationCap, Briefcase, RotateCcw, ExternalLink } from 'lucide-react'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002'

const SUGGESTIONS = [
  { icon: '🗺️', text: 'D\'où vient Adrien ?', cat: 'Parcours' },
  { icon: '💼', text: 'Qu\'est-ce qu\'il fait chez C-Ways ?', cat: 'Expérience' },
  { icon: '🛠️', text: 'Quelle est sa stack technique réelle ?', cat: 'Skills' },
  { icon: '🎯', text: 'Comment se positionne-t-il sur le marché ?', cat: 'Stratégie' },
  { icon: '🌋', text: 'Pourquoi a-t-il quitté Maurice à 17 ans ?', cat: 'Histoire' },
  { icon: '📊', text: 'Quels sont ses projets data personnels ?', cat: 'Projets' },
  { icon: '🎭', text: 'Quelles sont ses passions hors data ?', cat: 'Humain' },
  { icon: '🚀', text: 'Ce qui le distingue des autres juniors ?', cat: 'Atouts' },
]

type Message = { role: 'user' | 'assistant'; content: string }

function AssistantMessage({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/).filter(Boolean)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{para}</p>
      ))}
    </div>
  )
}

export default function Home() {
  const [history, setHistory] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showProfile, setShowProfile] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  // Hide profile panel when chat starts on mobile
  useEffect(() => {
    if (history.length > 0 && window.innerWidth < 768) setShowProfile(false)
  }, [history.length])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    if (window.innerWidth < 768) setShowProfile(false)

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
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Exo 2', system-ui, sans-serif; background: #060D1F; color: #E2E8F0; overflow: hidden; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.25); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%,60%,100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .suggestion-btn:hover { background: rgba(56,189,248,0.1) !important; border-color: rgba(56,189,248,0.3) !important; transform: translateY(-1px); }
        .suggestion-btn { transition: all 0.2s ease !important; }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 20px rgba(56,189,248,0.4) !important; }
        .send-btn { transition: all 0.15s ease !important; }
        @media (max-width: 768px) {
          .layout { flex-direction: column !important; }
          .profile-panel { width: 100% !important; min-height: auto !important; border-right: none !important; border-bottom: 1px solid rgba(56,189,248,0.1) !important; padding: 16px !important; }
          .chat-panel { height: calc(100dvh - 120px) !important; }
        }
      `}</style>

      {/* Ambient background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: -200, left: -200, width: 600, height: 600,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,60,120,0.4) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, right: -100, width: 500, height: 500,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,40,80,0.35) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(56,189,248,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
      </div>

      <div className="layout" style={{ display: 'flex', height: '100dvh', position: 'relative', zIndex: 1 }}>

        {/* ── Profile Panel ── */}
        <div className="profile-panel" style={{
          width: 280, flexShrink: 0,
          background: 'linear-gradient(180deg, rgba(14,30,64,0.95) 0%, rgba(6,13,31,0.98) 100%)',
          borderRight: '1px solid rgba(56,189,248,0.1)',
          display: 'flex', flexDirection: 'column',
          padding: '28px 22px', overflowY: 'auto',
          backdropFilter: 'blur(20px)',
        }}>
          {/* Top accent */}
          <div style={{
            height: 2, marginBottom: 28, marginLeft: -22, marginRight: -22,
            background: 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 50%, transparent 100%)',
          }} />

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'linear-gradient(135deg, #0f4c8a, #38bdf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: 'white', letterSpacing: '-1px',
              boxShadow: '0 8px 32px rgba(56,189,248,0.25), 0 0 0 1px rgba(56,189,248,0.15)',
              marginBottom: 14,
            }}>AC</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '-0.3px', textAlign: 'center' }}>
              Adrien Casse
            </div>
            <div style={{
              marginTop: 5, fontSize: 11, fontWeight: 600, letterSpacing: '1.5px',
              textTransform: 'uppercase', color: '#38bdf8',
            }}>Data Scientist</div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)' }}>Disponible à l'écoute</span>
            </div>
          </div>

          {/* Bio facts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {[
              { Icon: MapPin, text: 'Paris · Île Maurice', color: '#f59e0b' },
              { Icon: Briefcase, text: 'C-Ways · CDI', color: '#38bdf8' },
              { Icon: GraduationCap, text: 'M2 Économétrie · Lyon 2', color: '#a78bfa' },
            ].map(({ Icon, text, color }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: `${color}15`, border: `1px solid ${color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <span style={{ fontSize: 12, color: 'rgba(203,213,225,0.85)' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Stack pills */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>Stack</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {['Python', 'SQL', 'GCP', 'BigQuery', 'FastAPI', 'XGBoost', 'R'].map(s => (
                <span key={s} style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.15)',
                  color: 'rgba(148,163,184,0.8)', fontFamily: 'JetBrains Mono, monospace',
                }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Passions */}
          <div style={{ marginBottom: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>Univers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: '🏔️', label: 'Guide randonnée · Maurice' },
                { icon: '🎭', label: 'Comédie musicale française' },
                { icon: '🎶', label: 'Variété / Jazz / Nostalgie' },
                { icon: '🎬', label: 'Cinéma · Paris' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(148,163,184,0.65)' }}>
                  <span style={{ fontSize: 14 }}>{icon}</span> {label}
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(56,189,248,0.1)', display: 'flex', gap: 8 }}>
            <a href="https://github.com/AdrienCasse" target="_blank" rel="noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.7)',
                textDecoration: 'none', fontSize: 11, transition: 'all 0.2s',
              }}>
              <Github size={13} /> GitHub
            </a>
            <a href="https://adrien-casse-rag.vercel.app" target="_blank" rel="noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px', borderRadius: 8, background: 'rgba(56,189,248,0.07)',
                border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8',
                textDecoration: 'none', fontSize: 11, transition: 'all 0.2s',
              }}>
              <ExternalLink size={13} /> Partager
            </a>
          </div>

          {/* Powered by */}
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 9, color: 'rgba(100,116,139,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
            RAG · fastembed · FAISS-numpy · Llama 3.3 70B
          </div>
        </div>

        {/* ── Chat Panel ── */}
        <div className="chat-panel" style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          height: '100dvh', overflow: 'hidden', padding: '0 0 0 0',
        }}>
          {/* Chat header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 28px 14px',
            borderBottom: '1px solid rgba(56,189,248,0.07)',
            background: 'rgba(6,13,31,0.6)', backdropFilter: 'blur(10px)',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(203,213,225,0.9)' }}>
                Pose lui une question
              </div>
              <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', marginTop: 2 }}>
                Répond en 3ème personne · connaît vraiment Adrien
              </div>
            </div>
            {history.length > 0 && (
              <button onClick={() => setHistory([])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, background: 'transparent',
                  border: '1px solid rgba(56,189,248,0.15)', borderRadius: 8,
                  padding: '6px 12px', fontSize: 11, color: 'rgba(148,163,184,0.6)', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                <RotateCcw size={11} /> Nouvelle conversation
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 12px' }}>

            {empty && (
              <div className="fade-up" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '100%', gap: 32, paddingBottom: 20,
              }}>
                <div style={{ textAlign: 'center', maxWidth: 480 }}>
                  <div style={{
                    fontSize: 13, color: 'rgba(148,163,184,0.6)', lineHeight: 1.8,
                    borderLeft: '2px solid rgba(56,189,248,0.3)',
                    paddingLeft: 14, textAlign: 'left', fontStyle: 'italic',
                  }}>
                    "De Pointe aux Sables à Paris — j'ai quitté l'île à 17 ans avec un bac S et l'envie de construire des choses qui servent vraiment."
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.5)', marginTop: 8, textAlign: 'right' }}>— Adrien Casse</div>
                </div>

                <div style={{ width: '100%', maxWidth: 560 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', color: 'rgba(100,116,139,0.5)', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>
                    Questions suggérées
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {SUGGESTIONS.map((s, i) => (
                      <button key={s.text} className="suggestion-btn"
                        onClick={() => send(s.text)}
                        style={{
                          background: 'rgba(14,30,64,0.6)', border: '1px solid rgba(56,189,248,0.12)',
                          borderRadius: 10, padding: '11px 14px', textAlign: 'left',
                          cursor: 'pointer', animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
                        }}>
                        <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 3, letterSpacing: '0.5px' }}>
                          {s.cat}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(203,213,225,0.75)', lineHeight: 1.4 }}>
                          {s.text}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!empty && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 8 }}>
                {history.map((m, i) => (
                  <div key={i} className="fade-up" style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: 10, alignItems: 'flex-start',
                  }}>
                    {m.role === 'assistant' && (
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 2,
                        background: 'linear-gradient(135deg, #0f4c8a, #38bdf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: '-0.5px',
                        boxShadow: '0 4px 12px rgba(56,189,248,0.2)',
                      }}>AC</div>
                    )}
                    <div style={{
                      maxWidth: '78%',
                      background: m.role === 'user'
                        ? 'linear-gradient(135deg, rgba(15,76,138,0.5), rgba(56,189,248,0.15))'
                        : 'rgba(14,30,64,0.7)',
                      border: `1px solid ${m.role === 'user' ? 'rgba(56,189,248,0.25)' : 'rgba(56,189,248,0.1)'}`,
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                      padding: '13px 17px', fontSize: 14,
                      color: m.role === 'user' ? 'rgba(186,230,253,0.95)' : 'rgba(226,232,240,0.92)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: m.role === 'user' ? '0 2px 16px rgba(56,189,248,0.08)' : 'none',
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
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #0f4c8a, #38bdf8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: 'white',
                    }}>AC</div>
                    <div style={{
                      background: 'rgba(14,30,64,0.7)', border: '1px solid rgba(56,189,248,0.1)',
                      borderRadius: '4px 16px 16px 16px', padding: '16px 20px',
                      backdropFilter: 'blur(10px)',
                    }}>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{
                            width: 7, height: 7, borderRadius: '50%', background: '#38bdf8',
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
          <div style={{ padding: '12px 28px 20px', flexShrink: 0 }}>
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-end',
              background: 'rgba(14,30,64,0.8)', backdropFilter: 'blur(20px)',
              border: `1px solid ${canSend ? 'rgba(56,189,248,0.4)' : 'rgba(56,189,248,0.12)'}`,
              borderRadius: 14, padding: '12px 14px',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: canSend ? '0 0 0 1px rgba(56,189,248,0.08), 0 4px 20px rgba(56,189,248,0.06)' : 'none',
            }}>
              <textarea ref={inputRef}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'rgba(226,232,240,0.92)', fontSize: 14, lineHeight: 1.5,
                  resize: 'none', minHeight: 22, maxHeight: 120,
                  fontFamily: "'Exo 2', system-ui, sans-serif",
                  caretColor: '#38bdf8',
                }}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Pose ta question sur Adrien..."
                rows={1}
              />
              <button onClick={() => send()} disabled={!canSend} className="send-btn"
                style={{
                  background: canSend ? 'linear-gradient(135deg, #0369a1, #38bdf8)' : 'rgba(56,189,248,0.07)',
                  border: canSend ? 'none' : '1px solid rgba(56,189,248,0.1)',
                  borderRadius: 10, padding: '9px 13px', cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: canSend ? '0 2px 12px rgba(56,189,248,0.25)' : 'none',
                }}>
                {loading
                  ? <Loader2 size={16} style={{ color: '#38bdf8', animation: 'spin 1s linear infinite' }} />
                  : <Send size={16} style={{ color: canSend ? 'white' : 'rgba(56,189,248,0.25)' }} />}
              </button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 9, color: 'rgba(100,116,139,0.35)', marginTop: 8, fontFamily: 'JetBrains Mono, monospace' }}>
              Llama 3.3 70B · Groq · RAG pipeline · adrien-casse-rag.vercel.app
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
