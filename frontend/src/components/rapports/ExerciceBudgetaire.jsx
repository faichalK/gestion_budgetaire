/**
 * Affiche les informations de l'exercice budgétaire annuel
 * et le détail des allocations départementales.
 */
import { formaterNombre, formaterPourcentage } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })

export default function ExerciceBudgetaire({ budgetAnnuel, detailTrimestres }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Exercice budgétaire */}
      {budgetAnnuel && (
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--af-ink)', marginBottom: 14 }}>
            Exercice budgétaire {budgetAnnuel.annee}
          </h2>
          <div style={{
            background: '#fff', borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 1px 6px rgba(0,0,0,.07)',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  Budget global
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px', color: '#111827', marginTop: 2 }}>
                  {fmt(budgetAnnuel.montant_global)} FCFA
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  Allocations départementales
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px', color: '#111827', marginTop: 2 }}>
                  {budgetAnnuel.nb_allocations}
                </div>
              </div>
            </div>

            {budgetAnnuel.allocations?.length > 0 && (
              <div className="card p-0 overflow-hidden" style={{ marginTop: 8 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {['Département', 'Alloué', 'Consommé', 'Disponible', 'Taux'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {budgetAnnuel.allocations.map((a, i) => (
                      <tr key={i}>
                        <td className="font-medium">{a.departement}</td>
                        <td className="font-mono whitespace-nowrap">{fmt(a.montant_alloue)} <span style={{ fontSize: '10px', color: '#9CA3AF' }}>FCFA</span></td>
                        <td className="font-mono whitespace-nowrap">{fmt(a.montant_consomme)} <span style={{ fontSize: '10px', color: '#9CA3AF' }}>FCFA</span></td>
                        <td className="font-mono whitespace-nowrap">{fmt(a.montant_disponible)} <span style={{ fontSize: '10px', color: '#9CA3AF' }}>FCFA</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 60, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${Math.min(a.taux, 100)}%`,
                                borderRadius: 3,
                                background: a.taux > 75
                                  ? 'linear-gradient(90deg, #FCA5A5, #DC2626)'
                                  : a.taux > 50
                                    ? 'linear-gradient(90deg, #FCD34D, #D97706)'
                                    : 'linear-gradient(90deg, #6EE7B7, #059669)',
                              }} />
                            </div>
                            <span style={{
                              fontSize: '11px', fontWeight: 700,
                              color: a.taux > 75 ? '#DC2626' : a.taux > 50 ? '#D97706' : '#059669',
                            }}>
                              {formaterPourcentage(a.taux, { decimales: 1 })}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Détail par trimestre */}
      {detailTrimestres?.length > 0 && (
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--af-ink)', marginBottom: 14 }}>
            Évolution trimestrielle
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {detailTrimestres.map((t) => (
              <div key={t.trimestre} style={{
                background: '#fff', borderRadius: 10, padding: '14px 16px',
                boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                borderTop: '3px solid #C9910A',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '.5px', textTransform: 'uppercase' }}>
                  T{t.trimestre}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: '#111827', marginTop: 4 }}>
                  {fmt(t.total)} FCFA
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: 2 }}>
                  {t.nb} dépense{t.nb !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
