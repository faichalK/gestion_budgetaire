import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUtilisateurs, createUtilisateur, updateUtilisateur, deleteUtilisateur, adminResetPassword, debloquerUtilisateur, getUtilisateurActivite } from '../../api/accounts'
import { ConfirmModal } from '../../components/ui'
import { Icon } from '../../components/AtlasIcons'
import { formaterNombre } from '../../utils/formatters'

const fmt     = n => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

const ROLES = ['ADMINISTRATEUR', 'GESTIONNAIRE', 'COMPTABLE']

const STATUT_COLOR = {
  BROUILLON: '#9CA3AF', SOUMIS: '#D97706', APPROUVE: '#16A34A',
  REJETE: '#EF4444', SAISIE: '#D97706', VALIDEE: '#16A34A', REJETEE: '#EF4444',
}

const ROLE_COLOR = {
  ADMINISTRATEUR: 'var(--af-gold)',
  GESTIONNAIRE:   '#0E7490',
  COMPTABLE:      '#6D28D9',
}

const DEPT_COLORS = ['#C9A961','#3B82F6','#10B981','#8B5CF6','#E5A53D','#7DD3FC']

function getInitials(prenom, nom, email) {
  if (prenom && nom) return (prenom[0] + nom[0]).toUpperCase()
  if (prenom) return prenom.slice(0, 2).toUpperCase()
  return (email?.[0] || '?').toUpperCase()
}

export default function UtilisateursPage() {
  const navigate = useNavigate()
  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(null)
  const [targetUser,  setTargetUser]  = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')
  const [createForm,  setCreateForm]  = useState({ email: '', matricule: '', nom: '', prenom: '', role: 'GESTIONNAIRE', password: '' })
  const [pwdForm,     setPwdForm]     = useState({ nouveau_password: '', confirmer: '' })
  const [search,      setSearch]      = useState('')
  const [filterRole,  setFilterRole]  = useState('')
  const [filterActif, setFilterActif] = useState('')
  const [visibleCount,setVisibleCount]= useState(15)
  const [activite,    setActivite]    = useState(null)
  const [activiteTab, setActiviteTab] = useState('budgets')
  const [activiteLoading, setActiviteLoading] = useState(false)
  const [confirmModal,    setConfirmModal]     = useState(null)

  const load = () => {
    setLoading(true)
    getUtilisateurs()
      .then(u => setUsers(u.data.results ?? u.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const payload = { ...createForm }
      if (!payload.departement) delete payload.departement
      await createUtilisateur(payload)
      setModal(null)
      setCreateForm({ email: '', matricule: '', nom: '', prenom: '', role: 'GESTIONNAIRE', password: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erreur serveur')
    } finally { setSaving(false) }
  }

  const handleToggle = async user => {
    try { await updateUtilisateur(user.id, { actif: !user.actif }); load() }
    catch (err) { alert(err.response?.data?.detail || 'Erreur') }
  }

  const handleDelete = user => {
    setConfirmModal({
      title: "Supprimer l'utilisateur",
      message: `Supprimer définitivement ${user.prenom} ${user.nom} (${user.email}) ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        try { await deleteUtilisateur(user.id); load() }
        catch (err) { alert(err.response?.data?.detail || 'Impossible de supprimer.') }
      },
    })
  }

  const openResetPwd = user => {
    setTargetUser(user); setPwdForm({ nouveau_password: '', confirmer: '' }); setError(''); setSuccess(''); setModal('resetPwd')
  }

  const handleDebloquer = user => {
    setConfirmModal({
      title: 'Débloquer le compte',
      message: `Débloquer le compte de ${user.prenom} ${user.nom} ?`,
      confirmLabel: 'Débloquer',
      variant: 'warning',
      onConfirm: async () => {
        try { await debloquerUtilisateur(user.id); load() }
        catch (err) { alert(err.response?.data?.detail || 'Erreur.') }
      },
    })
  }

  const openActivite = user => {
    setTargetUser(user); setActivite(null)
    setActiviteTab(user.role === 'COMPTABLE' ? 'validees' : 'budgets')
    setModal('activite'); setActiviteLoading(true)
    getUtilisateurActivite(user.id)
      .then(r => setActivite(r.data))
      .catch(() => setActivite({ error: true }))
      .finally(() => setActiviteLoading(false))
  }

  const handleResetPwd = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    if (pwdForm.nouveau_password !== pwdForm.confirmer) {
      setError('Les mots de passe ne correspondent pas.'); setSaving(false); return
    }
    try {
      await adminResetPassword(targetUser.id, { nouveau_password: pwdForm.nouveau_password })
      setSuccess(`Mot de passe de ${targetUser.prenom} ${targetUser.nom} réinitialisé.`)
      setPwdForm({ nouveau_password: '', confirmer: '' })
      setTimeout(() => { setModal(null); setSuccess('') }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur')
    } finally { setSaving(false) }
  }

  const q = search.toLowerCase().trim()
  const filtered = users.filter(u => {
    if (q && !(
      u.prenom?.toLowerCase().includes(q) ||
      u.nom?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.matricule?.toLowerCase().includes(q)
    )) return false
    if (filterRole && u.role !== filterRole) return false
    if (filterActif === 'actif'   && !u.actif)  return false
    if (filterActif === 'inactif' && u.actif)   return false
    if (filterActif === 'bloque'  && !u.bloque) return false
    return true
  })
  const visibleUsers = filtered.slice(0, visibleCount)
  const hasMore      = visibleCount < filtered.length
  const hasFilters   = search || filterRole || filterActif

  if (loading) return (
    <div className="af-loader"><div className="af-spinner"/><span>Chargement…</span></div>
  )

  return (
    <div>
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">{users.length} utilisateurs · {users.filter(u => u.actif).length} actifs</div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">Gestion des accès</h1>
          <div className="text-[13px] text-[#5A6B7E]">Rôles, départements, dernière connexion.</div>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button className="btn btn-primary btn-sm" onClick={() => { setCreateForm({ email: '', matricule: '', nom: '', prenom: '', role: 'GESTIONNAIRE', password: '' }); setError(''); setModal('create') }}>
            {Icon.plus} Inviter un utilisateur
          </button>
        </div>
      </div>

      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
        {/* ── Barre recherche + filtres ───────────────────────────────────── */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--af-line)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
          <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ width: 13, height: 13, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--af-mute)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Nom, email, matricule…"
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(15) }}
              className="form-input"
              style={{ paddingLeft: 32, fontSize: 12, height: 34, width: '100%' }}
            />
          </div>
          <select className="form-select" value={filterRole} onChange={e => { setFilterRole(e.target.value); setVisibleCount(15) }}
            style={{ fontSize: 12, height: 34, width: 148, flexShrink: 0 }}>
            <option value="">Tous les rôles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
          </select>
          <select className="form-select" value={filterActif} onChange={e => { setFilterActif(e.target.value); setVisibleCount(15) }}
            style={{ fontSize: 12, height: 34, width: 140, flexShrink: 0 }}>
            <option value="">Tous les statuts</option>
            <option value="actif">Actifs</option>
            <option value="inactif">Inactifs</option>
            <option value="bloque">Bloqués</option>
          </select>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterRole(''); setFilterActif('') }}
              style={{ fontSize: 12, height: 34, flexShrink: 0 }}>
              ✕
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--af-mute)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {filtered.length} / {users.length}
          </span>
        </div>

        {visibleUsers.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>
            Aucun utilisateur ne correspond à la recherche.
          </div>
        ) : (
          <table className="af-table">
            <thead>
              <tr>
                <th>Utilisateur</th><th>Rôle</th><th>Département</th>
                <th>Dernière connexion</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u, i) => (
                <tr key={u.id} style={{ opacity: u.actif ? 1 : 0.65 }}>
                  <td>
                    <div className="af-audit-user">
                      <div className="av" style={{ background: u.actif ? 'var(--af-gold)' : 'var(--af-line)' }}>
                        {getInitials(u.prenom, u.nom, u.email)}
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--af-ivory)' }}>
                          {u.prenom} {u.nom}
                          {u.bloque && <span className="af-badge reject" style={{ marginLeft: 6, fontSize: 9 }}>BLOQUÉ</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--af-cream)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="af-pill" style={{ color: ROLE_COLOR[u.role] || 'var(--af-ivory)', borderColor: u.role === 'ADMINISTRATEUR' ? 'var(--af-gold)' : 'var(--af-line)' }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.departement_detail?.nom ? (
                      <span className="af-dept-chip">
                        <span className="d" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }}/>
                        {u.departement_detail.nom.replace(/^Ministère (de |du |des |de l')?/i, '').trim().slice(0, 26)}
                      </span>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td className="muted">{u.derniere_connexion ? fmtDate(u.derniere_connexion) : '—'}</td>
                  <td>
                    {u.actif
                      ? <span className="af-badge approve">ACTIF</span>
                      : <span className="af-badge draft">INACTIF</span>}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {(u.role === 'GESTIONNAIRE' || u.role === 'COMPTABLE') && (
                        <button className="btn btn-ghost btn-sm" title="Activité" onClick={() => openActivite(u)}>
                          {Icon.kpi}
                        </button>
                      )}
                      <button
                        className={u.actif ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                        title={u.actif ? 'Désactiver' : 'Activer'}
                        onClick={() => handleToggle(u)}
                        style={{ fontSize: 11, padding: '4px 8px' }}
                      >
                        {u.actif ? 'Désactiver' : 'Activer'}
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Réinitialiser mot de passe" onClick={() => openResetPwd(u)}>
                        {Icon.settings}
                      </button>
                      {u.bloque && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDebloquer(u)} style={{ fontSize: 11, padding: '4px 8px' }}>
                          Débloquer
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" title="Supprimer" onClick={() => handleDelete(u)} style={{ gap: 5 }}>
                        {Icon.reject} Suppr.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {hasMore && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setVisibleCount(c => c + 15)}>
            Charger plus ({Math.min(15, filtered.length - visibleCount)} utilisateurs)
          </button>
          <p style={{ fontSize: 11, color: 'var(--af-mute)' }}>{visibleCount} sur {filtered.length} affichés</p>
        </div>
      )}

      {/* Modal création */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-panel" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--af-serif)' }}>Créer un utilisateur</h2>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="mb-[18px]">
                    <label>Prénom</label>
                    <input className="form-input" required value={createForm.prenom} onChange={e => setCreateForm(f => ({ ...f, prenom: e.target.value }))}/>
                  </div>
                  <div className="mb-[18px]">
                    <label>Nom</label>
                    <input className="form-input" required value={createForm.nom} onChange={e => setCreateForm(f => ({ ...f, nom: e.target.value }))}/>
                  </div>
                </div>
                <div className="mb-[18px]" style={{ marginTop: 14 }}>
                  <label>Email</label>
                  <input className="form-input" type="email" required value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}/>
                </div>
                <div className="mb-[18px]" style={{ marginTop: 14 }}>
                  <label>Matricule</label>
                  <input className="form-input" required value={createForm.matricule} onChange={e => setCreateForm(f => ({ ...f, matricule: e.target.value }))}/>
                </div>
                <div className="mb-[18px]" style={{ marginTop: 14 }}>
                  <label>Rôle</label>
                  <select className="form-select" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="mb-[18px]" style={{ marginTop: 14 }}>
                  <label>Mot de passe temporaire</label>
                  <input className="form-input" type="password" required minLength={4} value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 4 caractères"/>
                </div>
                {error && <p style={{ fontSize: 12, color: 'var(--af-st-reject)', marginTop: 10 }}>{error}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary btn-sm">Annuler</button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal activité */}
      {modal === 'activite' && targetUser && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-panel" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'var(--af-ink)', borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="av" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--af-gold)', color: 'var(--af-ink)', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getInitials(targetUser.prenom, targetUser.nom, targetUser.email)}
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--af-serif)', fontWeight: 700, fontSize: 15, color: 'var(--af-ivory)', margin: 0 }}>
                    {targetUser.prenom} {targetUser.nom}
                  </h2>
                  <div style={{ fontSize: 11, color: 'var(--af-gold)', marginTop: 2 }}>{targetUser.role} — {targetUser.email}</div>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="btn btn-ghost btn-sm">{Icon.close}</button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--af-line)' }}>
              {targetUser.role !== 'COMPTABLE' && (
                <button onClick={() => setActiviteTab('budgets')} style={{ padding: '10px 18px', border: 'none', background: 'transparent', borderBottom: activiteTab === 'budgets' ? '2px solid var(--af-gold)' : '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: activiteTab === 'budgets' ? 700 : 500, color: activiteTab === 'budgets' ? 'var(--af-ivory)' : 'var(--af-cream)' }}>
                  {Icon.budget} Budgets créés
                </button>
              )}
              {targetUser.role !== 'COMPTABLE' && (
                <button onClick={() => setActiviteTab('depenses')} style={{ padding: '10px 18px', border: 'none', background: 'transparent', borderBottom: activiteTab === 'depenses' ? '2px solid var(--af-gold)' : '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: activiteTab === 'depenses' ? 700 : 500, color: activiteTab === 'depenses' ? 'var(--af-ivory)' : 'var(--af-cream)' }}>
                  {Icon.expense} Dépenses saisies
                </button>
              )}
              {targetUser.role === 'COMPTABLE' && (
                <button onClick={() => setActiviteTab('validees')} style={{ padding: '10px 18px', border: 'none', background: 'transparent', borderBottom: activiteTab === 'validees' ? '2px solid var(--af-gold)' : '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--af-ivory)' }}>
                  {Icon.validate} Dépenses validées
                </button>
              )}
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {activiteLoading ? (
                <div className="af-loader"><div className="af-spinner"/><span>Chargement…</span></div>
              ) : activite?.error ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>Erreur de chargement</div>
              ) : (
                <>
                  {activiteTab === 'budgets' && (
                    <table className="af-table">
                      <thead><tr><th>Code</th><th>Nom</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
                      <tbody>
                        {(activite?.budgets_crees || []).length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--af-mute)', padding: 24 }}>Aucun budget créé</td></tr>
                        ) : (activite?.budgets_crees || []).map(b => (
                          <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => { setModal(null); navigate(`/budgets/${b.id}`) }}>
                            <td className="ref">{b.code}</td>
                            <td>{b.nom}</td>
                            <td className="num">{fmt(b.montant_global)} FCFA</td>
                            <td><span style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[b.statut] || 'var(--af-mute)' }}>{b.statut}</span></td>
                            <td className="muted">{fmtDate(b.date_creation)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {activiteTab === 'depenses' && (
                    <table className="af-table">
                      <thead><tr><th>Réf.</th><th>Budget</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
                      <tbody>
                        {(activite?.depenses_enregistrees || []).length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--af-mute)', padding: 24 }}>Aucune dépense saisie</td></tr>
                        ) : (activite?.depenses_enregistrees || []).map(d => (
                          <tr key={d.id}>
                            <td className="ref">{d.reference}</td>
                            <td className="muted">{d.budget_code}</td>
                            <td className="num">{fmt(d.montant)} FCFA</td>
                            <td><span style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[d.statut] || 'var(--af-mute)' }}>{d.statut}</span></td>
                            <td className="muted">{fmtDate(d.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {activiteTab === 'validees' && (
                    <table className="af-table">
                      <thead><tr><th>Réf.</th><th>Budget</th><th>Saisie par</th><th>Montant</th><th>Date</th></tr></thead>
                      <tbody>
                        {(activite?.depenses_validees || []).length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--af-mute)', padding: 24 }}>Aucune dépense traitée</td></tr>
                        ) : (activite?.depenses_validees || []).map(d => (
                          <tr key={d.id}>
                            <td className="ref">{d.reference}</td>
                            <td className="muted">{d.budget_code}</td>
                            <td className="muted">{d.enregistre_par}</td>
                            <td className="num">{fmt(d.montant)} FCFA</td>
                            <td className="muted">{fmtDate(d.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-secondary btn-sm">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal réinitialisation MDP */}
      {modal === 'resetPwd' && targetUser && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-panel" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Réinitialiser le mot de passe</h2>
            </div>
            <form onSubmit={handleResetPwd}>
              <div className="modal-body">
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 9, background: 'rgba(201,169,97,.1)', border: '1px solid rgba(201,169,97,.3)', fontSize: 13, color: 'var(--af-cream)' }}>
                  Utilisateur : <strong style={{ color: 'var(--af-ivory)' }}>{targetUser.prenom} {targetUser.nom}</strong> ({targetUser.email})
                </div>
                <div className="mb-[18px]">
                  <label>Nouveau mot de passe</label>
                  <input className="form-input" type="password" required minLength={8} value={pwdForm.nouveau_password} onChange={e => setPwdForm(f => ({ ...f, nouveau_password: e.target.value }))} placeholder="Minimum 8 caractères"/>
                </div>
                <div className="mb-[18px]" style={{ marginTop: 14 }}>
                  <label>Confirmer le mot de passe</label>
                  <input className="form-input" type="password" required value={pwdForm.confirmer} onChange={e => setPwdForm(f => ({ ...f, confirmer: e.target.value }))} placeholder="••••••••"/>
                </div>
                {error   && <p style={{ fontSize: 12, color: 'var(--af-st-reject)',   marginTop: 10 }}>{error}</p>}
                {success && <p style={{ fontSize: 12, color: 'var(--af-st-approve)', marginTop: 10 }}>{success}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary btn-sm">Annuler</button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? 'Réinitialisation…' : 'Réinitialiser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </div>
  )
}
