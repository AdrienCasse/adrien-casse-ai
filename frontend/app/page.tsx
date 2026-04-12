'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Github, MapPin, GraduationCap, Briefcase, RotateCcw, Linkedin, Check } from 'lucide-react'

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
  const [toast, setToast] = useState(false)
  const [typedQuote, setTypedQuote] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const QUOTE = "Un bon modèle qui tourne, c'est mieux qu'un beau modèle qui dort."

  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      setTypedQuote(QUOTE.slice(0, i + 1))
      i++
      if (i >= QUOTE.length) clearInterval(timer)
    }, 28)
    return () => clearInterval(timer)
  }, [])

  function handleShare() {
    navigator.clipboard.writeText('https://adrien-casse-rag.vercel.app').then(() => {
      setToast(true)
      setTimeout(() => setToast(false), 2200)
    })
  }

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
        .suggestion-btn:hover { background: rgba(56,189,248,0.12) !important; border-color: rgba(56,189,248,0.4) !important; transform: translateY(-2px); box-shadow: 0 4px 16px rgba(56,189,248,0.08) !important; }
        .suggestion-btn:active { transform: translateY(0) !important; }
        .suggestion-btn { transition: all 0.18s ease !important; }
        .send-btn:hover:not(:disabled) { transform: scale(1.06); box-shadow: 0 4px 20px rgba(56,189,248,0.4) !important; }
        .send-btn { transition: all 0.15s ease !important; }
        .profile-link:hover { opacity: 1 !important; transform: translateY(-1px); }
        .profile-link { transition: all 0.18s ease !important; }
        @keyframes rotateBorder {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cursor {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
        .status-dot { animation: pulseGlow 2s ease-in-out infinite; }
        .cursor { display: inline-block; animation: cursor 0.9s ease-in-out infinite; margin-left: 1px; }
        @media (max-width: 768px) {
          .layout { flex-direction: column !important; }
          .profile-panel {
            width: 100% !important;
            flex-shrink: 0 !important;
            min-height: auto !important;
            max-height: 90px !important;
            overflow: hidden !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(56,189,248,0.1) !important;
            padding: 10px 16px !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 12px !important;
          }
          .profile-panel-hidden { display: none !important; }
          .profile-desktop-only { display: none !important; }
          .profile-bio-facts { display: none !important; }
          .profile-avatar-section {
            flex-direction: row !important;
            align-items: center !important;
            gap: 12px !important;
            margin-bottom: 0 !important;
          }
          .profile-avatar-section > div:first-child {
            width: 40px !important;
            height: 40px !important;
            font-size: 14px !important;
            border-radius: 10px !important;
            margin-bottom: 0 !important;
            flex-shrink: 0 !important;
          }
          .chat-panel { flex: 1 !important; height: auto !important; min-height: 0 !important; }
          .suggestions-grid { grid-template-columns: 1fr !important; }
          .mobile-profile-toggle { display: flex !important; }
          .messages-area { padding: 16px 16px 8px !important; }
          .input-area { padding: 8px 12px max(14px, env(safe-area-inset-bottom)) !important; }
        }
        @media (min-width: 769px) {
          .mobile-profile-toggle { display: none !important; }
          .profile-panel-hidden { display: flex !important; }
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
        <div className={`profile-panel${!showProfile ? ' profile-panel-hidden' : ''}`} style={{
          width: 280, flexShrink: 0,
          background: 'linear-gradient(180deg, rgba(14,30,64,0.95) 0%, rgba(6,13,31,0.98) 100%)',
          borderRight: '1px solid rgba(56,189,248,0.1)',
          display: 'flex', flexDirection: 'column',
          padding: '28px 22px', overflowY: 'auto',
          backdropFilter: 'blur(20px)',
        }}>
          {/* Top accent */}
          <div className="profile-desktop-only" style={{
            height: 2, marginBottom: 28, marginLeft: -22, marginRight: -22,
            background: 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 50%, transparent 100%)',
          }} />

          {/* Avatar */}
          <div className="profile-avatar-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{
              width: 76, height: 76, borderRadius: 22, padding: 2,
              background: 'linear-gradient(135deg, #38bdf8, #0f4c8a, #a78bfa, #38bdf8)',
              backgroundSize: '300% 300%',
              animation: 'rotateBorder 4s ease infinite',
              marginBottom: 14, flexShrink: 0,
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: 20,
                background: 'linear-gradient(135deg, #0f4c8a, #1e3a6e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 800, color: 'white', letterSpacing: '-1px',
              }}>AC</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '-0.3px', textAlign: 'center' }}>
              Adrien Casse
            </div>
            <div style={{
              marginTop: 5, fontSize: 11, fontWeight: 600, letterSpacing: '1.5px',
              textTransform: 'uppercase', color: '#38bdf8',
            }}>Data Scientist</div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <div className="status-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)' }}>Disponible à l'écoute</span>
            </div>
          </div>

          {/* Bio facts */}
          <div className="profile-bio-facts" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
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
          <div className="profile-desktop-only" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>Stack</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {['Python', 'SQL', 'GCP', 'BigQuery', 'FastAPI', 'R', 'Next.js'].map(s => (
                <span key={s} style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.15)',
                  color: 'rgba(148,163,184,0.8)', fontFamily: 'JetBrains Mono, monospace',
                }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Passions */}
          <div className="profile-desktop-only" style={{ marginBottom: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>Univers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: '⚽', label: 'Manchester United · Premier League' },
                { icon: '🎌', label: 'Japon · Jujutsu Kaisen' },
                { icon: '🎭', label: 'Comédie musicale' },
                { icon: '🏋️', label: 'Sport · Athlétisme' },
                { icon: '🏔️', label: 'Randonnée · Maurice' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(148,163,184,0.65)' }}>
                  <span style={{ fontSize: 14 }}>{icon}</span> {label}
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="profile-desktop-only" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(56,189,248,0.1)', display: 'flex', gap: 8 }}>
            <a href="https://github.com/AdrienCasse" target="_blank" rel="noreferrer" className="profile-link"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.7)',
                textDecoration: 'none', fontSize: 11, opacity: 0.85,
              }}>
              <Github size={13} /> GitHub
            </a>
            <a href="https://www.linkedin.com/in/adrien-casse" target="_blank" rel="noreferrer" className="profile-link"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px', borderRadius: 8, background: 'rgba(10,102,194,0.12)',
                border: '1px solid rgba(10,102,194,0.3)', color: '#60a5fa',
                textDecoration: 'none', fontSize: 11, opacity: 0.85,
              }}>
              <Linkedin size={13} /> LinkedIn
            </a>
            <button onClick={handleShare} className="profile-link"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px', borderRadius: 8, background: toast ? 'rgba(34,197,94,0.1)' : 'rgba(56,189,248,0.07)',
                border: toast ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(56,189,248,0.2)',
                color: toast ? '#22c55e' : '#38bdf8', fontSize: 11, cursor: 'pointer', opacity: 0.85,
                transition: 'all 0.2s',
              }}>
              {toast ? <><Check size={13} /> Copié !</> : 'Partager'}
            </button>
          </div>

          {/* Powered by */}
          <div className="profile-desktop-only" style={{ marginTop: 14, textAlign: 'center', fontSize: 9, color: 'rgba(100,116,139,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
            RAG · fastembed · NumPy cosine · Llama 3.3 70B
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="mobile-profile-toggle"
                onClick={() => setShowProfile(v => !v)}
                style={{
                  display: 'none', alignItems: 'center', gap: 5, background: 'transparent',
                  border: '1px solid rgba(56,189,248,0.15)', borderRadius: 8,
                  padding: '6px 10px', fontSize: 11, color: '#38bdf8', cursor: 'pointer',
                }}>
                AC ↕
              </button>
              {history.length > 0 && (
                <button onClick={() => { setHistory([]); setShowProfile(true) }}
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
          </div>

          {/* Messages */}
          <div className="messages-area" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 12px' }}>

            {empty && (
              <div className="fade-up" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '100%', gap: 32, paddingBottom: 20,
              }}>
                <div style={{ textAlign: 'center', maxWidth: 480 }}>
                  <div style={{
                    fontSize: 13, color: 'rgba(148,163,184,0.6)', lineHeight: 1.8,
                    borderLeft: '2px solid rgba(56,189,248,0.3)',
                    paddingLeft: 14, textAlign: 'left', fontStyle: 'italic', minHeight: '2.6em',
                  }}>
                    "{typedQuote}<span className="cursor" style={{ color: '#38bdf8', fontStyle: 'normal' }}>|</span>"
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.5)', marginTop: 8, textAlign: 'right' }}>— Adrien Casse</div>
                </div>

                <div style={{ width: '100%', maxWidth: 560 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', color: 'rgba(100,116,139,0.5)', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>
                    Questions suggérées
                  </div>
                  <div className="suggestions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
          <div className="input-area" style={{ padding: '12px 28px 20px', flexShrink: 0 }}>
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
              Llama 3.3 70B · Groq · fastembed · NumPy cosine
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
