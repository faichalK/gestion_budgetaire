import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { getDepenses } from '../../api/depenses'
import { DepenseBadge } from '../../components/StatusBadge'
import Card from '../../components/ui/Card'
import { formaterNombre } from '../../utils/formatters'

const fmt  = n => formaterNombre(parseFloat(n) || 0, { maximumFractionDigits: 0 })
const fmtM = n => formaterNombre((parseFloat(n) || 0) / 1e6, { maximumFractionDigits: 2 })

const FILTRES = ['Tous', 'Validés', 'En attente', 'Rejetés']
const STATUT_MAP = { 'Validés': 'VALIDEE', 'En attente': 'SAISIE', 'Rejetés': 'REJETEE' }
const DELTA = { up: 'text-[#15803D]', down: 'text-[#B91C1C]', flat: 'text-[#5A6B7E]' }

function ChevronIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ width: 13, height: 13, transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>
      <path d="M9 18l6-6-6-6"/>
    </svg>
  )
}

function PjIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      style={{ width: 13, height: 13, color: 'var(--af-cream)' }}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  )
}

function DepenseRow({ depense, onClick }) {
  const [open, setOpen] = useState(false)
  const lignes = depense.lignes || []
  const titre  = depense.note || depense.fournisseur || `#${String(depense.id).slice(0, 8).toUpperCase()}`
  const fmtDate = iso => iso
    ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

  return (
    <>
      <tr
        style={{ cursor: 'pointer', background: open ? 'var(--af-steel)' : undefined }}
        onClick={() => setOpen(o => !o)}
      >
        <td style={{ paddingLeft: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--af-cream)' }}><ChevronIcon open={open} /></span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-ink)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {titre}
            </span>
          </div>
        </td>
        <td className="muted">{fmtDate(depense.date)}</td>
        <td>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-ivory)' }}>{depense.budget_code}</div>
          <div style={{ fontSize: 11, color: 'var(--af-cream)' }}>{(depense.budget_nom || '').slice(0, 32)}</div>
        </td>
        <td>
          {(depense.nombre_pieces > 0)
            ? <PjIcon />
            : <span style={{ color: 'var(--af-mute)', fontSize: 11 }}>—</span>}
        </td>
        <td className="num" style={{ fontWeight: 700 }}>{fmt(depense.montant_total)} FCFA</td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <DepenseBadge status={depense.statut} />
            {lignes.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--af-mute)' }}>
                {lignes.length} ligne{lignes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </td>
        <td style={{ paddingRight: 14 }}>
          <button
            onClick={e => { e.stopPropagation(); onClick(depense.id) }}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-gold)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px' }}
          >
            Détail →
          </button>
        </td>
      </tr>

      {open && lignes.map(cl => (
        <tr key={cl.id} style={{ background: 'rgba(14,42,71,0.03)' }}>
          <td style={{ paddingLeft: 48 }}>
            <div style={{ fontSize: 12, color: 'var(--af-cream)', fontStyle: 'italic' }}>
              {cl.ligne_code && cl.ligne_code !== '—' && (
                <span style={{ fontFamily: 'var(--af-mono)', fontSize: 11, color: 'var(--af-mute)', marginRight: 6 }}>{cl.ligne_code}</span>
              )}
              {cl.ligne_libelle || '—'}
            </div>
            {(cl.cat_libelle && cl.cat_libelle !== '—') && (
              <div style={{ fontSize: 10.5, color: 'var(--af-mute)', paddingLeft: 0 }}>
                {cl.cat_libelle} › {cl.sous_cat_libelle}
              </div>
            )}
          </td>
          <td className="muted" style={{ fontSize: 11 }}>
            {cl.date ? new Date(cl.date).toLocaleDateString('fr-FR') : '—'}
          </td>
          <td style={{ fontSize: 12, color: 'var(--af-cream)' }}>
            {cl.note || <span style={{ color: 'var(--af-mute)' }}>—</span>}
          </td>
          <td />
          <td className="num" style={{ fontSize: 12, color: 'var(--af-ivory)' }}>{fmt(cl.montant)} FCFA</td>
          <td colSpan={2} />
        </tr>
      ))}
    </>
  )
}

export default function MesDepenses() {
  const navigate = useNavigate()
  const [depenses, setDepenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtre,   setFiltre]   = useState('Tous')

  useEffect(() => {
    getDepenses()
      .then(r => setDepenses(r.data?.data ?? r.data?.results ?? []))
      .finally(() => setLoading(false))
  }, [])

  const validees   = depenses.filter(d => d.statut === 'VALIDEE')
  const enAttente  = depenses.filter(d => d.statut === 'SAISIE')
  const rejetees   = depenses.filter(d => d.statut === 'REJETEE')
  const totalEngage  = depenses.reduce((s, d) => s + (parseFloat(d.montant_total) || 0), 0)
  const totalValide  = validees.reduce((s, d) => s + (parseFloat(d.montant_total) || 0), 0)
  const totalAttente = enAttente.reduce((s, d) => s + (parseFloat(d.montant_total) || 0), 0)
  const totalRejete  = rejetees.reduce((s, d) => s + (parseFloat(d.montant_total) || 0), 0)

  const depensesFiltrees = filtre === 'Tous'
    ? depenses
    : depenses.filter(d => d.statut === STATUT_MAP[filtre])

  const depensesSorted = [...depensesFiltrees].sort((a, b) =>
    new Date(b.date || 0) - new Date(a.date || 0)
  )

  if (loading) return (
    <div className="af-loader"><div className="af-spinner"/><span>Chargement…</span></div>
  )

  return (
    <div>
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">
            {depenses.length} dépense{depenses.length !== 1 ? 's' : ''} · {new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
          </div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">
            Suivi des dépenses
          </h1>
          <div className="text-[13px] text-[#5A6B7E]">Consultez et suivez l'avancement de vos dépenses par dossier.</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        {[
          { label: 'Total engagé', value: fmtM(totalEngage), unit: ' M FCFA', delta: 'up',   sub: `${depenses.length} dépense${depenses.length !== 1 ? 's' : ''}` },
          { label: 'Validé',       value: fmtM(totalValide), unit: ' M FCFA', delta: 'flat', sub: `${validees.length} validée${validees.length !== 1 ? 's' : ''}` },
          { label: 'En attente',   value: fmtM(totalAttente),unit: ' M FCFA', delta: 'flat', sub: `${enAttente.length} en attente` },
          { label: 'Rejeté',       value: fmtM(totalRejete), unit: ' M FCFA', delta: rejetees.length > 0 ? 'down' : 'flat', sub: `${rejetees.length} rejetée${rejetees.length !== 1 ? 's' : ''}` },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">{k.label}</div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">
              {k.value}<span className="text-[#B8864A] text-[16px] ml-0.5">{k.unit}</span>
            </div>
            <div className={cn('text-[11px] inline-flex items-center gap-1', DELTA[k.delta])}>{k.sub}</div>
          </div>
        ))}
      </div>

      <Card.Table>
        <div className="flex items-center px-5 py-4 border-b border-[rgba(14,42,71,0.08)]">
          <h3 className="text-base font-semibold text-[#0E2A47] tracking-tight">Dépenses</h3>
          <div className="ml-auto flex gap-1.5">
            {FILTRES.map(f => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className={cn(
                  'inline-flex px-2.5 py-1 rounded-full text-[12px] border transition-all duration-150',
                  filtre === f
                    ? 'text-[#B8864A] border-[#B8864A] bg-[rgba(184,134,74,0.12)]'
                    : 'text-[#5A6B7E] border-[rgba(14,42,71,0.16)] bg-white hover:border-[#B8864A] hover:text-[#B8864A]'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {depensesSorted.length === 0 ? (
          <div className="py-10 px-5 text-center text-[13px] text-[rgba(90,107,126,0.7)]">
            Aucune dépense{filtre !== 'Tous' ? ` "${filtre}"` : ''}.
          </div>
        ) : (
          <table className="af-table">
            <thead>
              <tr>
                <th>Référence / Libellé</th>
                <th>Date</th>
                <th>Budget</th>
                <th>PJ</th>
                <th>Montant total</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {depensesSorted.map(d => (
                <DepenseRow
                  key={d.id}
                  depense={d}
                  onClick={id => navigate(`/mes-depenses/${id}`)}
                />
              ))}
            </tbody>
          </table>
        )}
      </Card.Table>
    </div>
  )
}
