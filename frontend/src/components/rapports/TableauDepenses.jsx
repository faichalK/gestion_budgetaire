/**
 * Tableau générique : dépenses par département ou top lignes.
 */
import { formaterNombre, formaterPourcentage } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })

export function DepensesParDepartement({ data, totalPeriode }) {
  if (!data?.length) return (
    <div className="empty-state" style={{ padding: '24px 0' }}>
      <p className="empty-body">Aucune dépense enregistrée sur cette période.</p>
    </div>
  )

  const total = parseFloat(totalPeriode || 0) || 1

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--af-ink)', marginBottom: 14 }}>
        Dépenses par département
      </h2>
      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              {['Département', 'Total consommé', 'Nb dépenses', 'Part', 'Répartition'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => {
              const nom   = d.ligne__budget__departement__nom || '—'
              const t     = parseFloat(d.total || 0)
              const partValue = (t / total) * 100
              const part = formaterPourcentage(partValue, { decimales: 1 })
              return (
                <tr key={i}>
                  <td className="font-medium">{nom}</td>
                  <td className="font-mono font-semibold whitespace-nowrap">
                    {fmt(t)} <span style={{ fontSize: '10px', color: '#9CA3AF' }}>FCFA</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{d.nb}</td>
                  <td style={{ fontWeight: 700, color: '#374151' }}>{part}</td>
                  <td style={{ minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${Math.min(partValue, 100)}%`,
                          borderRadius: 3,
                          background: 'linear-gradient(90deg, #6EE7B7, #059669)',
                        }} />
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}


export function TopDepenses({ data }) {
  if (!data?.length) return null

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--af-ink)', marginBottom: 14 }}>
        Top lignes budgétaires consommatrices
      </h2>
      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              {['#', 'Budget', 'Ligne budgétaire', 'Total consommé', 'Nb'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td style={{ color: '#9CA3AF', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td>
                  <span className="code-tag">{d.ligne__budget__code}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: 6 }}>
                    {d.ligne__budget__nom}
                  </span>
                </td>
                <td className="font-medium">{d.ligne__libelle}</td>
                <td className="font-mono font-semibold whitespace-nowrap">
                  {fmt(d.total)} <span style={{ fontSize: '10px', color: '#9CA3AF' }}>FCFA</span>
                </td>
                <td style={{ textAlign: 'center', color: '#6B7280' }}>{d.nb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


export function RepartitionBudgets({ data }) {
  if (!data?.length) return null

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--af-ink)', marginBottom: 14 }}>
        Répartition par budget
      </h2>
      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              {['Budget', 'Département', 'Total consommé', 'Nb dépenses'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td>
                  <span className="code-tag">{d.ligne__budget__code}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, marginLeft: 8 }}>
                    {d.ligne__budget__nom}
                  </span>
                </td>
                <td style={{ color: '#6B7280' }}>{d.ligne__budget__departement__nom || '—'}</td>
                <td className="font-mono font-semibold whitespace-nowrap">
                  {fmt(d.total_consomme)} <span style={{ fontSize: '10px', color: '#9CA3AF' }}>FCFA</span>
                </td>
                <td style={{ textAlign: 'center', color: '#6B7280' }}>{d.nb_depenses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
