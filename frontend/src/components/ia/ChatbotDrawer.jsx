/**
 * ChatbotDrawer — Chatbot IA flottant accessible depuis toutes les pages
 * Suggestions et accès filtrés selon le rôle de l'utilisateur.
 */
import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Brain, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  creerConversation,
  envoyerMessage,
  getConversations,
  supprimerConversation,
} from '../../api/ia'

/* Suggestions par rôle */
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
  const qc = useQueryClient()

  const suggestions = isGestionnaire ? SUGGESTIONS_GESTIONNAIRE : SUGGESTIONS_ADMIN
  const msgAccueil  = isGestionnaire ? MSG_ACCUEIL_GESTIONNAIRE : MSG_ACCUEIL_DEFAULT

  /* ── Scroll auto vers le bas ───────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── Focus input quand le drawer s'ouvre ──────────────────────────────── */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  /* ── Ouverture depuis n'importe quelle page via événement custom ───────── */
  useEffect(() => {
    const h = () => setOpen(true)
    window.addEventListener('open-chatbot', h)
    return () => window.removeEventListener('open-chatbot', h)
  }, [])

  /* ── Charger l'historique d'une conversation existante ────────────────── */
  const chargerConversation = async (id) => {
    if (!id) return
    try {
      const r     = await getConversations()
      const convs = r.data?.data || r.data?.results || []
      const conv  = convs.find(c => c.id === id)
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
  }

  /* ── Mutation : créer une conversation ───────────────────────────────── */
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

  /* ── Mutation : envoyer un message ───────────────────────────────────── */
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

  /* ── Mutation : réinitialiser ─────────────────────────────────────────── */
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

  /* ── Ouvrir le drawer ─────────────────────────────────────────────────── */
  const handleOpen = () => {
    setOpen(true)
    if (!convId) {
      creer()
    } else if (messages.length === 0) {
      chargerConversation(convId)
    }
  }

  /* ── Soumettre un message ─────────────────────────────────────────────── */
  const handleSubmit = (e) => {
    e?.preventDefault()
    const txt = input.trim()
    if (!txt || sending || !convId) return
    envoyer(txt)
  }

  /* ── Cliquer sur une suggestion ──────────────────────────────────────── */
  const handleSuggestion = (suggestion) => {
    if (sending || !convId) return
    envoyer(suggestion)
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Drawer */}
      {open && (
        <div
          className="fixed bottom-[88px] right-6 z-[1001] w-[370px] h-[540px] bg-white rounded-[16px] overflow-hidden flex flex-col border border-[#E5E7EB]"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,.18)' }}
        >

          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between shrink-0"
            style={{ background: 'var(--af-ink)', borderBottom: '2px solid rgba(184,134,74,.3)' }}
          >
            <div className="flex items-center gap-[10px]">
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'rgba(255,255,255,.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Brain size={15} strokeWidth={2} style={{ color: '#fff' }} />
              </div>
              <div>
                <div className="text-white font-bold text-[.85rem]">Assistant Gestion Budgétaire</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#86efac', animation: 'ia-pulse 2s ease-in-out infinite',
                  }} />
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,.75)', fontWeight: 600, letterSpacing: '.3px' }}>
                    Propulsé par Claude IA
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-[6px]">
              <button
                onClick={() => reinitialiser()}
                title="Nouvelle conversation"
                className="text-white text-[.75rem] rounded-[6px] px-2 py-1 border-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,.15)' }}
              >
                🔄
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-white text-[.85rem] leading-none rounded-[6px] px-2 py-1 border-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,.15)' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-[14px] py-3 flex flex-col gap-[10px]">
            {creating && (
              <div className="text-center text-[#9CA3AF] text-[.75rem] py-5">
                Connexion à l'assistant IA…
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {sending && (
              <div className="self-start bg-[#F3F4F6] rounded-[0_12px_12px_12px] px-3 py-2">
                <TypingDots />
              </div>
            )}
            {erreur && (
              <div className="bg-[#fff1f2] text-[#be123c] text-[.72rem] px-[10px] py-2 rounded-[8px] border border-[#fecdd3]">
                ⚠️ {erreur}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions — gestionnaire : toujours visibles + saisie libre bloquée */}
          {!sending && convId && (
            <div className="px-3 pb-2 flex gap-[6px] flex-wrap shrink-0">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[20px] px-[10px] py-1 text-[.68rem] text-[#4B5563] cursor-pointer whitespace-nowrap hover:bg-[#FEF9EC] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input — masqué pour le gestionnaire */}
          {isGestionnaire ? (
            <div
              className="px-[14px] py-[10px] border-t border-[#F3F4F6] flex items-center gap-2 shrink-0"
              style={{ background: '#F9FAFB' }}
            >
              <Lock size={13} strokeWidth={2} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic' }}>
                Utilisez les raccourcis ci-dessus pour poser votre question
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="px-[14px] py-[10px] border-t border-[#F3F4F6] flex gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={convId ? 'Votre question…' : 'Initialisation…'}
                disabled={sending || !convId}
                className="flex-1 border border-[#E5E7EB] rounded-[8px] px-3 py-2 text-[.8rem] outline-none bg-[#F9FAFB] transition-colors focus:border-[#C9910A]"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || !convId}
                className="border-none rounded-[8px] px-[14px] py-2 text-[.85rem] cursor-pointer transition-opacity"
                style={{ background: 'var(--af-ink)', color: 'var(--color-gold)', border: '1px solid var(--color-gold-line)', opacity: (!input.trim() || sending || !convId) ? 0.45 : 1 }}
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

const MSG_ACCUEIL_DEFAULT = "Bonjour\u00a0! Je suis l'assistant IA Gestion Budgétaire. Je peux vous aider avec l'analyse des budgets, le suivi des dépenses, la détection d'anomalies et toutes vos questions de gestion financière. Comment puis-je vous aider\u00a0?"

const MSG_ACCUEIL_GESTIONNAIRE = "Bonjour\u00a0! Je suis votre assistant budgétaire. Je peux vous donner un **résumé de vos budgets** ou un **résumé de vos dépenses**. Sélectionnez l'une des deux options ci-dessous."

/* Rendu Markdown minimal : **gras**, _italique_, `code`, listes */
function renderMd(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    // Convertir les segments inline : **bold**, _italic_, `code`
    const parts = []
    let rest = line
    let key = 0
    while (rest.length) {
      const boldMatch  = rest.match(/^(.*?)\*\*(.+?)\*\*(.*)$/s)
      const italicMatch = rest.match(/^(.*?)_(.+?)_(.*)$/s)
      const codeMatch  = rest.match(/^(.*?)`(.+?)`(.*)$/s)
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
    // Lignes vides → espaceur
    if (!line.trim()) return <div key={i} style={{ height: 4 }} />
    return <div key={i} style={{ marginBottom: 1 }}>{parts}</div>
  })
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[82%] px-3 py-[9px] text-[.78rem] leading-[1.6] break-words"
        style={{
          background: isUser ? 'var(--af-ink)' : '#F3F4F6',
          color: isUser ? '#fff' : '#1F2937',
          borderRadius: isUser ? '12px 12px 0 12px' : '0 12px 12px 12px',
        }}
      >
        {isUser ? msg.contenu : renderMd(msg.contenu)}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-[2px]">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-[6px] h-[6px] rounded-full bg-[#9CA3AF]"
          style={{ animation: `typingBounce 1.2s ${i * 0.2}s ease-in-out infinite` }}
        />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes ia-chatbot-ring {
          0%, 90%, 100% { box-shadow: 0 4px 20px rgba(201,168,76,.4); }
          45% { box-shadow: 0 4px 20px rgba(201,168,76,.4), 0 0 0 8px rgba(201,168,76,.12); }
        }
      `}</style>
    </div>
  )
}
