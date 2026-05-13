import { TrendingUp, TrendingDown, Wallet, CreditCard, CheckCircle2 } from '../AtlasIcons'
import { formaterNombre, formaterPourcentage } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtPct = (n) => formaterPourcentage(n, { decimales: 1 })

function KpiCard({ icon, label, value, sub, color = 'var(--af-ink)', bg = '#F8FAFC' }) {
  const Icon = icon
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '16px 20px',
      borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 6px rgba(0,0,0,.07)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} strokeWidth={2} style={{ color }} />
        </div>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#9CA3AF' }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '18px', color: '#111827' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: '#6B7280' }}>{sub}</div>}
    </div>
  )
}

export default function ResumeExecutif({ resume, totalDepenses, nbDepenses, comparaison }) {
  if (!resume) return null

  const nbParStatut = resume.nb_par_statut || {}
  const variation   = comparaison?.variation_pct

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--af-ink)', marginBottom: 14 }}>Résumé exécutif</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard
          icon={Wallet}
          label="Budgets actifs"
          value={resume.nb_budgets}
          color="var(--af-ink)"
          bg="#F8FAFC"
        />
        <KpiCard
          icon={CreditCard}
          label="Montant global"
          value={fmt(resume.montant_global) + ' FCFA'}
          sub={`Consommé : ${fmt(resume.montant_consomme)} FCFA`}
          color="#C9910A"
          bg="#FEF9EC"
        />
        <KpiCard
          icon={TrendingUp}
          label="Taux consommation"
          value={fmtPct(resume.taux_global)}
          sub={`Disponible : ${fmt(resume.montant_disponible)} FCFA`}
          color={resume.taux_global > 75 ? '#DC2626' : resume.taux_global > 50 ? '#D97706' : '#059669'}
          bg={resume.taux_global > 75 ? '#FFF1F2' : resume.taux_global > 50 ? '#FFFBEB' : '#F0FDF4'}
        />
        <KpiCard
          icon={CreditCard}
          label="Dépenses période"
          value={nbDepenses || 0}
          sub={`Total : ${fmt(totalDepenses)} FCFA`}
          color="#0E2A47"
          bg="rgba(14,42,71,0.08)"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Approuvés / Soumis"
          value={`${nbParStatut.APPROUVE || 0} / ${nbParStatut.SOUMIS || 0}`}
          sub={`Rejetés : ${nbParStatut.REJETE || 0}  ·  Clôturés : ${nbParStatut.CLOTURE || 0}`}
          color="#059669"
          bg="#F0FDF4"
        />
        {comparaison && variation !== null && variation !== undefined && (
          <KpiCard
            icon={variation >= 0 ? TrendingUp : TrendingDown}
            label="vs année préc."
            value={`${variation >= 0 ? '+' : ''}${fmtPct(Math.abs(variation))}`}
            sub={`${comparaison.annee_precedente} : ${fmt(comparaison.total_precedent)} FCFA`}
            color={variation > 10 ? '#DC2626' : variation < 0 ? '#059669' : '#D97706'}
            bg={variation > 10 ? '#FFF1F2' : variation < 0 ? '#F0FDF4' : '#FFFBEB'}
          />
        )}
      </div>

      {/* Barre de progression globale */}
      <div style={{
        background: '#fff', borderRadius: 10, padding: '14px 18px',
        boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 4,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Taux de consommation global</span>
          <span style={{
            fontSize: '12px', fontWeight: 700,
            color: resume.taux_global > 75 ? '#DC2626' : resume.taux_global > 50 ? '#D97706' : '#059669',
          }}>
            {fmtPct(resume.taux_global)}
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: '#F3F4F6', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(resume.taux_global, 100)}%`,
            borderRadius: 5,
            background: resume.taux_global > 75
              ? 'linear-gradient(90deg, #FCA5A5, #DC2626)'
              : resume.taux_global > 50
                ? 'linear-gradient(90deg, #FCD34D, #D97706)'
                : 'linear-gradient(90deg, #6EE7B7, #059669)',
            transition: 'width .5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '11px', color: '#9CA3AF' }}>
          <span>0 FCFA</span>
          <span>{fmt(resume.montant_global)} FCFA</span>
        </div>
      </div>
    </div>
  )
}
