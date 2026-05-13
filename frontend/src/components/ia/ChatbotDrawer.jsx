import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Brain, Lock, RotateCcw, X } from '../AtlasIcons'
import { useAuth } from '../../context/AuthContext'
import {
  creerConversation,
  envoyerMessage,
  getConversations,
  supprimerConversation,
} from '../../api/ia'

const SUGGESTIONS_ADMIN = [
  "Résumé global des budgets",
  "Anomalies détectées",
  "Taux d'exécution par département",
  "Alertes de dépassement",
  "Dépenses en attente de validation",
  "Fonds disponibles globaux",
]

const SUGGESTIONS_COMPTABLE = SUGGESTIONS_ADMIN

const SUGGESTIONS_GESTIONNAIRE = [
  "Résumé de mes budgets",
  "Résumé de mes dépenses",
]

export default function ChatbotDrawer() {
  const { isGestionnaire } = useAuth()
  const [open,     setOpen]     = useState(false)
  const [convId,   setConvId]   = useState(() => sessionStorage.getItem('bf_chat_conv'))
  const [input,    setInput]    = useState('')
  const [messages, setMessages] = useState([])
  const [erreur,   setErreur]   = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  const suggestions = isGestionnaire ? SUGGESTIONS_GESTIONNAIRE : SUGGESTIONS_ADMIN
  const msgAccueil  = isGestionnaire ? MSG_ACCUEIL_GESTIONNAIRE : MSG_ACCUEIL_DEFAULT

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  useEffect(() => {
    const h = () => setOpen(true)
    window.addEventListener('open-chatbot', h)
    return () => window.removeEventListener('open-chatbot', h)
  }, [])

  const { mutate: creer, isPending: creating } = useMutation({
    mutationFn: () => creerConversation({ titre: 'Assistant Gestion Budgétaire' }),
    onSuccess: (r) => {
      const id = r.data?.data?.id || r.data?.id
      if (!id) return
      setConvId(id)
      sessionStorage.setItem('bf_chat_conv', id)
      setMessages([{ role: 'assistant', contenu: msgAccueil }])
    },
    onError: () => setErreur('Impossible de démarrer une conversation IA.'),
  })

  const { mutate: envoyer, isPending: sending } = useMutation({
    mutationFn: (msg) => envoyerMessage(convId, msg),
    onMutate: (msg) => {
      setMessages(prev => [...prev, { role: 'user', contenu: msg }])
      setInput('')
      setErreur(null)
    },
    onSuccess: (r) => {
      const contenu = r.data?.data?.contenu || r.data?.contenu || '(pas de réponse)'
      setMessages(prev => [...prev, { role: 'assistant', contenu }])
    },
    onError: () => {
      setErreur('Service IA indisponible. Réessayez dans quelques instants.')
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1))
    },
  })

  const { mutate: reinitialiser } = useMutation({
    mutationFn: async () => {
      if (convId) await supprimerConversation(convId).catch(() => {})
    },
    onSuccess: () => {
      setConvId(null)
      sessionStorage.removeItem('bf_chat_conv')
      setMessages([])
      setErreur(null)
      creer()
    },
  })

  useEffect(() => {
    if (!open) return
    const timeoutId = window.setTimeout(async () => {
      if (!convId) { creer(); return }
      if (messages.length !== 0) return
      try {
        const r = await getConversations()
        const convs = r.data?.data || r.data?.results || []
        const conv = convs.find(c => c.id === convId)
        if (conv?.messages?.length) {
          setMessages(conv.messages.map(m => ({ role: m.role, contenu: m.contenu })))
        } else {
          setMessages([{ role: 'assistant', contenu: msgAccueil }])
        }
      } catch {
        setConvId(null)
        sessionStorage.removeItem('bf_chat_conv')
        creer()
      }
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [open, convId, messages.length, msgAccueil, creer])

  const handleSubmit = (e) => {
    e?.preventDefault()
    const txt = input.trim()
    if (!txt || sending || !convId) return
    envoyer(txt)
  }

  const handleSuggestion = (suggestion) => {
    if (sending || !convId) return
    envoyer(suggestion)
  }

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 1001,
          width: 370, height: 540,
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          border: '1px solid var(--af-line-2)',
          boxShadow: '0 8px 40px rgba(14,42,71,.22)',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 14px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0,
            background: 'var(--af-ink)', borderBottom: '2px solid rgba(184,134,74,.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'rgba(255,255,255,.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Brain size={15} strokeWidth={2} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Assistant Gestion Budgétaire</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#86efac', animation: 'ia-pulse 2s ease-in-out infinite',
                  }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,.75)', fontWeight: 600, letterSpacing: '.3px' }}>
                    Propulsé par Claude IA
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => reinitialiser()}
                title="Nouvelle conversation"
                style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#fff', fontSize: 12 }}
              >
                <RotateCcw size={12} strokeWidth={2} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px', display: 'flex',
            flexDirection: 'column', gap: 10, background: 'var(--af-steel)',
          }}>
            {creating && (
              <div style={{ textAlign: 'center', color: 'var(--af-mute)', fontSize: 12, padding: '20px 0' }}>
                Connexion à l'assistant IA…
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {sending && (
              <div style={{
                alignSelf: 'flex-start', background: '#fff', borderRadius: '0 10px 10px 10px',
                padding: '8px 12px', border: '1px solid var(--af-line)',
              }}>
                <TypingDots />
              </div>
            )}
            {erreur && (
              <div style={{
                background: 'var(--color-danger-50)', color: 'var(--color-danger-700)',
                fontSize: 11, padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--color-danger-200)',
              }}>
                ⚠️ {erreur}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {!sending && convId && (
            <div style={{
              padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0,
              borderTop: '1px solid var(--af-line)', background: '#fff',
            }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  style={{
                    background: 'var(--af-steel)', border: '1px solid var(--af-line)',
                    borderRadius: 20, padding: '3px 10px', fontSize: 11,
                    color: 'var(--af-cream)', cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--af-gold-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--af-steel)'}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          {isGestionnaire ? (
            <div style={{
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
              borderTop: '1px solid var(--af-line)', background: 'var(--af-steel)', flexShrink: 0,
            }}>
              <Lock size={13} strokeWidth={2} style={{ color: 'var(--af-mute)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--af-mute)', fontStyle: 'italic' }}>
                Utilisez les raccourcis ci-dessus pour poser votre question
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{ padding: '10px 14px', display: 'flex', gap: 8, flexShrink: 0, borderTop: '1px solid var(--af-line)' }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={convId ? 'Votre question…' : 'Initialisation…'}
                disabled={sending || !convId}
                style={{
                  flex: 1, border: '1px solid var(--af-line-2)', borderRadius: 8,
                  padding: '8px 12px', fontSize: 13, outline: 'none',
                  background: '#fff', fontFamily: 'var(--af-sans)',
                  transition: 'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--af-gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--af-line-2)'}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || !convId}
                style={{
                  background: 'var(--af-ink)', color: 'var(--af-gold)',
                  border: '1px solid var(--af-gold-line)', borderRadius: 8,
                  padding: '8px 14px', cursor: 'pointer', fontSize: 14,
                  opacity: (!input.trim() || sending || !convId) ? 0.45 : 1,
                  transition: 'opacity .15s',
                }}
              >
                ➤
              </button>
            </form>
          )}
        </div>
      )}
    </>
  )
}

/* ── Sous-composants ──────────────────────────────────────────────────────── */

const MSG_ACCUEIL_DEFAULT = "Bonjour ! Je suis l'assistant IA Gestion Budgétaire. Je peux vous aider avec l'analyse des budgets, le suivi des dépenses, la détection d'anomalies et toutes vos questions de gestion financière. Comment puis-je vous aider ?"

const MSG_ACCUEIL_GESTIONNAIRE = "Bonjour ! Je suis votre assistant budgétaire. Je peux vous donner un **résumé de vos budgets** ou un **résumé de vos dépenses**. Sélectionnez l'une des deux options ci-dessous."

function renderMd(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    const parts = []
    let rest = line
    let key = 0
    while (rest.length) {
      const boldMatch   = rest.match(/^(.*?)\*\*(.+?)\*\*(.*)$/s)
      const italicMatch = rest.match(/^(.*?)_(.+?)_(.*)$/s)
      const codeMatch   = rest.match(/^(.*?)`(.+?)`(.*)$/s)
      const first = [boldMatch, italicMatch, codeMatch]
        .filter(Boolean)
        .sort((a, b) => a[1].length - b[1].length)[0]
      if (!first) { parts.push(<span key={key++}>{rest}</span>); break }
      if (first[1]) parts.push(<span key={key++}>{first[1]}</span>)
      if (first === boldMatch)
        parts.push(<strong key={key++}>{first[2]}</strong>)
      else if (first === italicMatch)
        parts.push(<em key={key++}>{first[2]}</em>)
      else
        parts.push(<code key={key++} style={{ background: 'rgba(0,0,0,.08)', borderRadius: 3, padding: '0 3px', fontFamily: 'monospace', fontSize: '0.85em' }}>{first[2]}</code>)
      rest = first[3]
    }
    if (!line.trim()) return <div key={i} style={{ height: 4 }} />
    return <div key={i} style={{ marginBottom: 1 }}>{parts}</div>
  })
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '82%', padding: '9px 13px', fontSize: 12.5,
        lineHeight: 1.6, wordBreak: 'break-word',
        background: isUser ? 'var(--af-ink)' : '#fff',
        color: isUser ? '#fff' : 'var(--af-ink)',
        border: isUser ? 'none' : '1px solid var(--af-line)',
        borderRadius: isUser ? '12px 12px 0 12px' : '0 12px 12px 12px',
      }}>
        {isUser ? msg.contenu : renderMd(msg.contenu)}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--af-mute)',
            animation: `typingBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
