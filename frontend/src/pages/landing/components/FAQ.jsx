import { useState } from 'react'
import { ChevronDown } from '../../../components/AtlasIcons'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const FAQ_ITEMS = [
  {
    question: 'Gestion Budgétaire est-il adapté aux PME et grandes entreprises ?',
    answer:
      "Oui, Gestion Budgétaire est conçu pour s'adapter à toutes les tailles d'organisation. Les PME bénéficient d'une solution clé en main facile à déployer, tandis que les grandes entreprises peuvent configurer des workflows complexes, des hiérarchies multi-niveaux et des contrôles d'accès granulaires selon leurs besoins spécifiques.",
  },
  {
    question: 'Combien de temps faut-il pour mettre en place Gestion Budgétaire ?',
    answer:
      "La configuration initiale prend généralement moins de 30 minutes. Notre assistant de démarrage guidé vous accompagne étape par étape : création de votre organisation, ajout des membres de l'équipe, configuration des structures budgétaires et paramétrage des workflows de validation. Notre équipe support est disponible pour vous aider à chaque étape.",
  },
  {
    question: "Peut-on importer des données depuis Excel ou d'autres outils ?",
    answer:
      "Absolument. Gestion Budgétaire propose des importateurs natifs pour Excel (XLS, XLSX), CSV et plusieurs logiciels comptables populaires. Vous pouvez importer vos budgets existants, vos plans de comptes et vos données historiques en quelques clics. Nous proposons également une API REST pour les intégrations personnalisées.",
  },
  {
    question: 'Comment fonctionne le workflow de validation ?',
    answer:
      "Vous définissez vos circuits d'approbation selon vos règles métier : validation séquentielle, parallèle, ou mixte. Chaque approbateur reçoit des notifications par email et/ou dans l'application. Il peut approuver, rejeter ou demander des modifications avec des commentaires. Toutes les actions sont horodatées et archivées pour la traçabilité.",
  },
  {
    question: "Quelles sont les fonctionnalités d'analyse IA ?",
    answer:
      "Notre moteur IA analyse vos historiques de dépenses pour identifier des tendances, détecter des anomalies et vous alerter en cas de dépassement imminent. Il génère également des recommandations pour optimiser vos allocations budgétaires, compare vos performances avec des benchmarks sectoriels et prédit vos besoins futurs sur la base de vos patterns.",
  },
  {
    question: 'Nos données sont-elles sécurisées ?',
    answer:
      "La sécurité est au cœur de notre architecture. Toutes les données sont chiffrées en transit (TLS 1.3) et au repos (AES-256). Nous hébergeons vos données dans des datacenters certifiés ISO 27001 en Afrique de l'Ouest, avec des sauvegardes automatiques quotidiennes et une réplication géographique. Nous sommes également conformes au RGPD et aux réglementations locales.",
  },
  {
    question: "Proposez-vous une période d'essai gratuite ?",
    answer:
      "Oui, nous offrons un essai gratuit de 30 jours sans engagement, sans carte bancaire requise. Vous avez accès à toutes les fonctionnalités Premium pendant cette période. À l'issue de l'essai, vous pouvez choisir le forfait qui correspond à vos besoins ou continuer avec notre formule gratuite limitée.",
  },
  {
    question: 'Quel support proposez-vous ?',
    answer:
      "Notre équipe support est disponible en français du lundi au vendredi, de 8h à 18h (heure d'Abidjan). Nous proposons un support par chat en direct, email et téléphone selon votre forfait. La documentation complète, les tutoriels vidéo et la base de connaissances sont accessibles 24h/24. Les clients Enterprise bénéficient d'un Customer Success Manager dédié.",
  },
]

function AccordionItem({ item, isOpen, onToggle, index, visible }) {
  return (
    <div
      className={`bg-white transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${index * 0.07}s` }}
    >
      <button
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
      >
        <span className={`font-medium transition-colors duration-200 pr-4`} style={{ color: isOpen ? 'var(--color-gold)' : 'var(--af-ink)' }}>
          {item.question}
        </span>
        <ChevronDown
          className="w-5 h-5 flex-shrink-0 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: isOpen ? '#C9910A' : '#9CA3AF' }}
          aria-hidden="true"
        />
      </button>
      <div
        id={`faq-answer-${index}`}
        role="region"
        aria-hidden={!isOpen}
        style={{ maxHeight: isOpen ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}
      >
        <p className="px-6 pb-6 text-sm text-gray-500 leading-relaxed m-0">
          {item.answer}
        </p>
      </div>
    </div>
  )
}

export default function FAQ() {
  const [open, setOpen] = useState(0)
  const [ref, visible] = useScrollAnimation(0.08)

  return (
    <section id="faq" className="py-24 px-6 bg-white" aria-labelledby="faq-title">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div
          ref={ref}
          className={`text-center mb-12 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#C9910A' }}>
            FAQ
          </p>
          <h2 id="faq-title" className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Questions fréquentes
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Vous avez des questions sur Gestion Budgétaire ? Nous avons les réponses.
          </p>
        </div>

        {/* Accordion */}
        <div className="max-w-2xl mx-auto mt-12 divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              item={item}
              index={i}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
              visible={visible}
            />
          ))}
        </div>

        {/* Support note */}
        <div className="text-center mt-10 p-6 bg-slate-50 rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">
            Vous ne trouvez pas la réponse à votre question ?{' '}
            <a href="/" className="font-semibold no-underline transition-colors" style={{ color: '#C9910A' }}>
              Contactez notre équipe support
            </a>{' '}
            — nous répondons en moins de 2 heures en jours ouvrés.
          </p>
        </div>
      </div>
    </section>
  )
}
