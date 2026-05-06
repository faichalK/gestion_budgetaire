import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUtilisateurs, createUtilisateur, updateUtilisateur, deleteUtilisateur, adminResetPassword, debloquerUtilisateur, getUtilisateurActivite } from '../../api/accounts'
import { Plus, KeyRound, Trash2, UserCheck, UserX, Building2, Search, X, Activity, Wallet, CreditCard, CheckCircle2, ChevronRight, ShieldOff } from 'lucide-react'
import { ConfirmModal } from '../../components/ui'
import { RoleBadge, StatutBadge } from '../../components/StatusBadge'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

const STATUT_COLOR = {
  BROUILLON: '#9CA3AF', SOUMIS: '#D97706', APPROUVE: '#16A34A',
  REJETE: '#EF4444', SAISIE: '#D97706', VALIDEE: '#16A34A', REJETEE: '#EF4444',
}

const ROLES = ['ADMINISTRATEUR', 'GESTIONNAIRE', 'COMPTABLE']

function TabBtn({ label, icon, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px', border: 'none', background: 'transparent',
        borderBottom: active ? '2px solid #C9910A' : '2px solid transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: active ? 700 : 500,
        color: active ? 'var(--af-ink)' : 'var(--af-cream)',
        transition: 'all .15s',
      }}
    >
      {icon} {label}
      {count !== undefined && (
        <span style={{ background: active ? '#FEF9EC' : '#F3F4F6', color: active ? '#78350F' : '#6B7280', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, border: active ? '1px solid #F3D07A' : 'none' }}>
          {count ?? '…'}
        </span>
      )}
    </button>
  )
}

export default function UtilisateursPage() {
  const navigate = useNavigate()
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)   // null | 'create' | 'resetPwd' | 'activite'
  const [targetUser, setTargetUser] = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const [createForm, setCreateForm] = useState({ email: '', matricule: '', nom: '', prenom: '', role: 'GESTIONNAIRE', password: '' })
  const [pwdForm,    setPwdForm]    = useState({ nouveau_password: '', confirmer: '' })
  const [search,       setSearch]       = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [filterActif,  setFilterActif]  = useState('')
  const [visibleCount, setVisibleCount] = useState(10)
  const [activite,     setActivite]     = useState(null)
  const [activiteTab,  setActiviteTab]  = useState('budgets')
  const [activiteLoading, setActiviteLoading] = useState(false)
  const [confirmModal,    setConfirmModal]    = useState(null)

  const load = () => {
    setLoading(true)
    getUtilisateurs()
      .then(u => setUsers(u.data.results ?? u.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
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

  const handleToggle = async (user) => {
    try {
      await updateUtilisateur(user.id, { actif: !user.actif })
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur')
    }
  }

  const handleDelete = (user) => {
    setConfirmModal({
      title: "Supprimer l'utilisateur",
      message: `Supprimer définitivement le compte de ${user.prenom} ${user.nom} (${user.email}) ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        try { await deleteUtilisateur(user.id); load() }
        catch (err) { alert(err.response?.data?.detail || 'Impossible de supprimer cet utilisateur.') }
      },
    })
  }

  const openResetPwd = (user) => {
    setTargetUser(user)
    setPwdForm({ nouveau_password: '', confirmer: '' })
    setError(''); setSuccess('')
    setModal('resetPwd')
  }

  const handleDebloquer = (user) => {
    setConfirmModal({
      title: 'Débloquer le compte',
      message: `Débloquer le compte de ${user.prenom} ${user.nom} ? Le compteur de tentatives sera réinitialisé.`,
      confirmLabel: 'Débloquer',
      variant: 'warning',
      onConfirm: async () => {
        try { await debloquerUtilisateur(user.id); load() }
        catch (err) { alert(err.response?.data?.detail || 'Erreur lors du déblocage.') }
      },
    })
  }

  const openActivite = (user) => {
    setTargetUser(user)
    setActivite(null)
    setActiviteTab(user.role === 'COMPTABLE' ? 'validees' : 'budgets')
    setModal('activite')
    setActiviteLoading(true)
    getUtilisateurActivite(user.id)
      .then(r => setActivite(r.data))
      .catch(() => setActivite({ error: true }))
      .finally(() => setActiviteLoading(false))
  }

  const handleResetPwd = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    if (pwdForm.nouveau_password !== pwdForm.confirmer) {
      setError('Les mots de passe ne correspondent pas.')
      setSaving(false); return
    }
    try {
      await adminResetPassword(targetUser.id, { nouveau_password: pwdForm.nouveau_password })
      setSuccess(`Mot de passe de ${targetUser.prenom} ${targetUser.nom} réinitialisé.`)
      setPwdForm({ nouveau_password: '', confirmer: '' })
      setTimeout(() => { setModal(null); setSuccess('') }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erreur')
    } finally { setSaving(false) }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter(u => {
      if (q && !(
        u.prenom?.toLowerCase().includes(q) ||
        u.nom?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.matricule?.toLowerCase().includes(q) ||
        u.departement_detail?.nom?.toLowerCase().includes(q)
      )) return false
      if (filterRole && u.role !== filterRole) return false
      if (filterActif === 'actif'   && !u.actif)  return false
      if (filterActif === 'inactif' && u.actif)   return false
      if (filterActif === 'bloque'  && !u.bloque) return false
      return true
    })
  }, [users, search, filterRole, filterActif])

  const hasFilters   = search || filterRole || filterActif
  const visibleUsers = filtered.slice(0, visibleCount)
  const hasMore      = visibleCount < filtered.length

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">
            {filtered.length} / {users.length} compte{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setCreateForm({ email: '', matricule: '', nom: '', prenom: '', role: 'GESTIONNAIRE', password: '' }); setError(''); setModal('create') }}
          className="btn btn-primary btn-md gap-[7px]"
        >
          <Plus size={16} strokeWidth={2.5} /> Nouvel utilisateur
        </button>
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex gap-3 mb-5 items-center" style={{ flexWrap: 'nowrap' }}>
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[340px]">
          <Search size={15} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, matricule…"
            value={search}
            onChange={e => { setSearch(e.target.value); setVisibleCount(10) }}
            className="form-input"
            style={{ paddingLeft: 34, height: 38, fontSize: 13 }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtre rôle */}
        <select
          value={filterRole}
          onChange={e => { setFilterRole(e.target.value); setVisibleCount(10) }}
          className="form-select"
          style={{ height: 38, fontSize: 13, minWidth: 160 }}
        >
          <option value="">Tous les rôles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Filtre statut */}
        <select
          value={filterActif}
          onChange={e => { setFilterActif(e.target.value); setVisibleCount(10) }}
          className="form-select"
          style={{ height: 38, fontSize: 13, minWidth: 140 }}
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="inactif">Inactifs</option>
          <option value="bloque">Bloqués</option>
        </select>

        {/* Réinitialiser */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterRole(''); setFilterActif('') }}
            className="btn btn-secondary btn-sm gap-[5px]"
          >
            <X size={13} /> Réinitialiser
          </button>
        )}
      </div>

      {/* Grille utilisateurs */}
      <div className="grid gap-[14px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {visibleUsers.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400 text-sm">
            Aucun utilisateur ne correspond à votre recherche.
          </div>
        )}
        {visibleUsers.map(u => (
          <div
            key={u.id}
            className="card"
            style={{ opacity: u.actif ? 1 : 0.65, outline: u.bloque ? '2px solid #EF4444' : 'none' }}
          >
            {/* Avatar + nom */}
            <div className="flex items-center gap-3 mb-[14px]">
              <div
                className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-[16px]"
                style={{
                  background: u.actif
                    ? 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))'
                    : 'var(--color-gray-300)',
                }}
              >
                {(u.prenom?.[0] || u.email[0]).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[7px]">
                  <span className="font-bold text-[14px] overflow-hidden text-ellipsis whitespace-nowrap text-gray-900">
                    {u.prenom} {u.nom}
                  </span>
                  {u.bloque && (
                    <span className="text-[9px] font-bold px-[6px] py-[1px] rounded-[20px] bg-[#FEE2E2] text-[#DC2626] shrink-0 tracking-[.3px]">
                      BLOQUÉ
                    </span>
                  )}
                  {!u.actif && !u.bloque && (
                    <span className="text-[9px] font-bold px-[6px] py-[1px] rounded-[20px] bg-[#E5E7EB] text-[#6B7280] shrink-0 tracking-[.3px]">
                      INACTIF
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[#9CA3AF] overflow-hidden text-ellipsis whitespace-nowrap">
                  {u.email}
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-[7px] flex-wrap mb-[10px]">
              <RoleBadge role={u.role} />
              {u.matricule && (
                <span className="px-[10px] py-[3px] rounded-[20px] text-[11px] font-semibold bg-[#F3F4F6] text-[#4B5563] font-mono">
                  {u.matricule}
                </span>
              )}
            </div>

            {u.departement_detail?.nom && (
              <div className="flex items-center gap-[6px] mb-[14px] text-[12px] text-[#6B7280]">
                <Building2 size={12} strokeWidth={2} />
                {u.departement_detail.nom}
              </div>
            )}

            {/* Actions */}
            <div className="card-footer">
              {(u.role === 'GESTIONNAIRE' || u.role === 'COMPTABLE') && (
                <button
                  onClick={() => openActivite(u)}
                  className="btn btn-secondary btn-sm gap-[5px] flex-1"
                  title="Voir l'activité"
                >
                  <Activity size={12} strokeWidth={2} /> Activité
                </button>
              )}
              <button
                onClick={() => handleToggle(u)}
                className={`btn btn-sm gap-[5px] ${u.actif ? 'btn-warning' : 'btn-success'}`}
                title={u.actif ? 'Désactiver' : 'Activer'}
              >
                {u.actif ? <UserX size={12} strokeWidth={2} /> : <UserCheck size={12} strokeWidth={2} />}
              </button>
              <button
                onClick={() => openResetPwd(u)}
                className="btn btn-secondary btn-sm gap-[5px]"
                title="Réinitialiser mot de passe"
              >
                <KeyRound size={12} strokeWidth={2} />
              </button>
              {u.bloque && (
                <button
                  onClick={() => handleDebloquer(u)}
                  className="btn btn-sm gap-[5px]"
                  title="Débloquer le compte"
                  style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
                >
                  <ShieldOff size={12} strokeWidth={2} /> Débloquer
                </button>
              )}
              <button
                onClick={() => handleDelete(u)}
                className="btn btn-danger btn-sm gap-[5px]"
                title="Supprimer"
              >
                <Trash2 size={12} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex flex-col items-center gap-[6px] mt-[20px]">
          <button
            onClick={() => setVisibleCount(c => c + 10)}
            className="btn btn-secondary btn-md gap-[7px]"
            style={{ minWidth: 180 }}
          >
            Charger plus
            <span style={{ background: 'var(--color-gray-200)', color: 'var(--color-gray-600)', fontSize: '11px', padding: '1px 7px', borderRadius: 8, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              +{Math.min(10, filtered.length - visibleCount)}
            </span>
          </button>
          <p style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>
            {visibleCount} sur {filtered.length} utilisateurs affichés
          </p>
        </div>
      )}

      {/* Modal création */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-panel max-w-[500px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="font-display font-bold text-[15px]">Créer un utilisateur</h2>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="grid form-grid-2 gap-[14px]" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <div>
                    <label className="form-label">Prénom</label>
                    <input className="form-input" required value={createForm.prenom} onChange={e => setCreateForm(f => ({ ...f, prenom: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Nom</label>
                    <input className="form-input" required value={createForm.nom} onChange={e => setCreateForm(f => ({ ...f, nom: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-[14px]">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" required value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="mt-[14px]">
                  <label className="form-label">Matricule</label>
                  <input className="form-input" required value={createForm.matricule} onChange={e => setCreateForm(f => ({ ...f, matricule: e.target.value }))} />
                </div>
                <div className="mt-[14px]">
                  <label className="form-label">Rôle</label>
                  <select className="form-select" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="mt-[14px]">
                  <label className="form-label">Mot de passe temporaire</label>
                  <input className="form-input" type="password" required minLength={4} value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 4 caractères" />
                </div>
                {error && <p className="text-[#DC2626] text-[12px] mt-[10px]">{error}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary btn-md">Annuler</button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-md">
                  {saving ? <><span className="spinner-sm" /> Création…</> : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal activité ── */}
      {modal === 'activite' && targetUser && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-panel" style={{ maxWidth: 720, width: '95vw' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header" style={{ background: 'var(--af-ink)', borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #C9910A, #C9910A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                  {(targetUser.prenom?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Lora, serif', fontWeight: 700, fontSize: 15, color: '#F8FAFC', margin: 0 }}>
                    {targetUser.prenom} {targetUser.nom}
                  </h2>
                  <div style={{ fontSize: 11, color: 'rgba(201,168,76,.7)', marginTop: 2, letterSpacing: '.4px' }}>
                    {targetUser.role} — {targetUser.email}
                  </div>
                </div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,.7)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Onglets */}
            <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
              {targetUser.role !== 'COMPTABLE' && (
                <TabBtn label="Budgets créés" icon={<Wallet size={13} />} count={activite?.budgets_crees?.length} active={activiteTab === 'budgets'} onClick={() => setActiviteTab('budgets')} />
              )}
              {targetUser.role !== 'COMPTABLE' && (
                <TabBtn label="Dépenses saisies" icon={<CreditCard size={13} />} count={activite?.depenses_enregistrees?.length} active={activiteTab === 'depenses'} onClick={() => setActiviteTab('depenses')} />
              )}
              {targetUser.role === 'COMPTABLE' && (
                <TabBtn label="Dépenses validées" icon={<CheckCircle2 size={13} />} count={activite?.depenses_validees?.length} active={activiteTab === 'validees'} onClick={() => setActiviteTab('validees')} />
              )}
            </div>

            {/* Contenu */}
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {activiteLoading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner mx-auto" /></div>
              ) : activite?.error ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Erreur de chargement</div>
              ) : (
                <>
                  {/* Budgets créés */}
                  {activiteTab === 'budgets' && (
                    <table className="data-table">
                      <thead><tr><th>Code</th><th>Nom</th><th>Montant global</th><th>Statut</th><th>Date</th><th></th></tr></thead>
                      <tbody>
                        {(activite?.budgets_crees || []).length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', padding: '24px' }}>Aucun budget créé</td></tr>
                        ) : (activite?.budgets_crees || []).map(b => (
                          <tr key={b.id} className="clickable" onClick={() => { setModal(null); navigate(`/budgets/${b.id}`) }}>
                            <td><span className="code-tag">{b.code}</span></td>
                            <td style={{ fontWeight: 500, maxWidth: 180 }}><div className="truncate">{b.nom}</div></td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(b.montant_global)} FCFA</td>
                            <td><span style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[b.statut] || '#6B7280' }}>{b.statut}</span></td>
                            <td style={{ color: '#9CA3AF', fontSize: 12 }}>{fmtDate(b.date_creation)}</td>
                            <td><ChevronRight size={13} style={{ color: '#D1D5DB' }} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Dépenses saisies */}
                  {activiteTab === 'depenses' && (
                    <table className="data-table">
                      <thead><tr><th>Référence</th><th>Budget</th><th>Ligne</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
                      <tbody>
                        {(activite?.depenses_enregistrees || []).length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', padding: '24px' }}>Aucune dépense saisie</td></tr>
                        ) : (activite?.depenses_enregistrees || []).map(d => (
                          <tr key={d.id}>
                            <td><span className="code-tag">{d.reference}</span></td>
                            <td style={{ fontSize: 12 }}>{d.budget_code}</td>
                            <td style={{ fontSize: 12, maxWidth: 160 }}><div className="truncate">{d.ligne_designation}</div></td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(d.montant)} FCFA</td>
                            <td><span style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[d.statut] || '#6B7280' }}>{d.statut}</span></td>
                            <td style={{ color: '#9CA3AF', fontSize: 12 }}>{fmtDate(d.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Dépenses validées (comptable) */}
                  {activiteTab === 'validees' && (
                    <table className="data-table">
                      <thead><tr><th>Référence</th><th>Budget</th><th>Saisie par</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
                      <tbody>
                        {(activite?.depenses_validees || []).length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', padding: '24px' }}>Aucune dépense traitée</td></tr>
                        ) : (activite?.depenses_validees || []).map(d => (
                          <tr key={d.id}>
                            <td><span className="code-tag">{d.reference}</span></td>
                            <td style={{ fontSize: 12 }}>{d.budget_code}</td>
                            <td style={{ fontSize: 12 }}>{d.enregistre_par}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(d.montant)} FCFA</td>
                            <td><span style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLOR[d.statut] || '#6B7280' }}>{d.statut}</span></td>
                            <td style={{ color: '#9CA3AF', fontSize: 12 }}>{fmtDate(d.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-secondary btn-md">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal réinitialisation mot de passe */}
      {modal === 'resetPwd' && targetUser && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-panel max-w-[440px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="font-display font-bold text-[15px]">Réinitialiser le mot de passe</h2>
            </div>
            <form onSubmit={handleResetPwd}>
              <div className="modal-body">
                <div className="mb-[18px] px-[14px] py-[10px] rounded-[9px] bg-[#FEF9EC] border border-[#F3D07A] text-[13px] text-[#78350F]">
                  Utilisateur : <strong>{targetUser.prenom} {targetUser.nom}</strong> ({targetUser.email})
                </div>
                <div className="mb-[14px]">
                  <label className="form-label">Nouveau mot de passe</label>
                  <input className="form-input" type="password" required minLength={8} value={pwdForm.nouveau_password}
                    onChange={e => setPwdForm(f => ({ ...f, nouveau_password: e.target.value }))} placeholder="Minimum 8 caractères" />
                </div>
                <div>
                  <label className="form-label">Confirmer le mot de passe</label>
                  <input className="form-input" type="password" required value={pwdForm.confirmer}
                    onChange={e => setPwdForm(f => ({ ...f, confirmer: e.target.value }))} placeholder="••••••••" />
                </div>
                {error   && <p className="text-[#DC2626]  text-[12px] mt-[10px]">{error}</p>}
                {success && <p className="text-[#16A34A] text-[12px] mt-[10px]">{success}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary btn-md">Annuler</button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-md">
                  {saving ? <><span className="spinner-sm" /> Réinitialisation…</> : 'Réinitialiser'}
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
