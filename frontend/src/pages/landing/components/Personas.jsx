import { useScrollAnimation } from '../hooks/useScrollAnimation'

const PERSONAS = [
  {
    role: 'Administrateur',
    tagColor: '#C9910A',
    tagBg: '#FDF6E3',
    avatarBg: 'var(--af-ink)',
    initials: 'AD',
    description: 'Responsable de la gouvernance budgétaire globale',
    features: [
      'Allocation des enveloppes budgétaires par département',
      'Gestion complète des utilisateurs et des rôles',
      'Création et gestion des départements',
      "Accès aux journaux d'audit et aux KPIs",
      'Paramétrage du budget annuel global',
    ],
  },
  {
    role: 'Gestionnaire',
    tagColor: '#10B981',
    tagBg: '#F0FDF4',
    avatarBg: 'linear-gradient(135deg, #047857, #10B981)',
    initials: 'GT',
    description: 'Chef de projet ou responsable de département',
    features: [
      'Création de budgets opérationnels structurés',
      'Enregistrement des dépenses avec justificatifs',
      'Upload de pièces justificatives (PDF, JPG, PNG)',
      'Suivi en temps réel de la consommation',
      'Resoumission après correction et rejet',
    ],
  },
  {
    role: 'Comptable',
    tagColor: '#8B5CF6',
    tagBg: '#F5F3FF',
    avatarBg: 'linear-gradient(135deg, #6D28D9, #8B5CF6)',
    initials: 'CT',
    description: 'Responsable du contrôle financier',
    features: [
      'Validation et approbation des budgets soumis',
      'Vérification des pièces justificatives',
      'Export des rapports PDF et CSV',
      'Vue consolidée de toutes les dépenses',
      'Accès aux KPIs et tableaux de bord avancés',
    ],
  },
]

function PersonaCard({ persona, index, visible }) {
  const { role, tagColor, tagBg, avatarBg, initials, description, features } = persona

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
      style={
        visible
          ? { animation: `personaFadeUp 0.6s ease ${index * 0.15}s both` }
          : { opacity: 0 }
      }
    >
      {/* Colored top strip */}
      <div className="h-1.5 w-full" style={{ background: tagColor }} />

      <div className="p-8 flex flex-col flex-1">
        {/* Avatar + role */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0 shadow-md"
            style={{ background: avatarBg }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full tracking-wide"
                style={{ background: tagBg, color: tagColor }}
              >
                {role}
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-tight">{description}</p>
          </div>
        </div>

        {/* Feature list */}
        <ul className="list-none p-0 m-0 space-y-2.5 mb-6 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
              <span className="mt-0.5 text-xs font-bold flex-shrink-0" style={{ color: tagColor }}>✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* Badge rôle bas */}
        <div className="mt-auto pt-4" style={{ borderTop: `1px solid ${tagBg}` }}>
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: tagBg, color: tagColor }}
          >
            Rôle : {role}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Personas() {
  const [ref, visible] = useScrollAnimation(0.08)

  return (
    <>
      <style>{`
        @keyframes personaFadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <section id="personas" className="py-24 px-6 bg-white" aria-labelledby="personas-title">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div
            ref={ref}
            className={`text-center mb-16 transition-all duration-700 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#C9910A' }}>
              Acteurs du système
            </p>
            <h2 id="personas-title" className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Trois rôles, une plateforme unifiée
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
              Gestion Budgétaire définit des droits d'accès précis pour chaque profil d'utilisateur,
              garantissant sécurité et traçabilité à chaque niveau.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PERSONAS.map((persona, index) => (
              <PersonaCard
                key={persona.role}
                persona={persona}
                index={index}
                visible={visible}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
