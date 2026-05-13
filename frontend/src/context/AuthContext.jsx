import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

/* ── Traductions FR / EN ───────────────────────────────────────────────────── */
const TR = {
  fr: {
    nav_dashboard:'Tableau de bord', nav_budget_annuel:'Budget annuel', nav_departements:'Départements',
    nav_utilisateurs:'Utilisateurs', nav_statistiques:'Statistiques', nav_rapports_detail:'Rapports détaillés',
    nav_assistance_ia:'Analyse budgétaire', nav_parametres:'Paramètres', nav_mes_budgets:'Mes budgets',
    nav_mes_depenses:'Mes dépenses', nav_validation:'Budgets à valider', nav_depenses_valider:'Dépenses à valider', nav_depenses:'Dépenses',
    section_principal:'PRINCIPAL', section_admin:'ADMINISTRATION', section_rapports:'RAPPORTS',
    section_assistance:'ASSISTANCE', section_systeme:'SYSTÈME', section_budgets:'BUDGETS',
    section_depenses:'DÉPENSES', section_validation:'VALIDATION',
    mon_profil:'Mon profil', deconnexion:'Déconnexion', plateforme:'Plateforme budgétaire',
    topbar_titre:'Atlas Finance', topbar_assistance:'Assistance',
    notif_titre:'Notifications', notif_a_jour:'Tout est à jour', notif_tout_lire:'Tout lire',
    notif_aucune:'Aucune notification', notif_vous_a_jour:'Vous êtes à jour !',
    notif_attente:'notification(s) en attente de lecture', notif_rafraich:'Rafraîchissement automatique toutes les 15 secondes',
    param_titre:'Paramètres', param_sous_titre:'Personnalisez votre expérience sur la plateforme',
    tab_apparence:'Apparence', tab_notifications:'Notifications', tab_audit:"Journal d'audit", tab_about:'À propos',
    theme_label:"Thème de l'interface", theme_desc:'Clair, sombre ou automatique selon le système.',
    theme_clair:'Clair', theme_sombre:'Sombre', theme_systeme:'Système',
    langue_label:'Langue', langue_desc:"Langue d'affichage de l'interface.",
    densite_label:'Densité du tableau', densite_desc:'Espacement des lignes dans les listes de données.',
    densite_compact:'Compact', densite_normal:'Normal', densite_aere:'Aéré',
    notif_budgets_label:'Alertes budgets', notif_depenses_label:'Alertes dépenses',
    notif_email_label:'Notifications par email', notif_son_label:'Son de notification',
    notif_budgets_desc:"Notifié lors de la création, soumission, validation ou rejet d'un budget.",
    notif_depenses_desc:"Notifié lors de l'enregistrement ou du traitement d'une dépense.",
    notif_email_desc:'Recevoir un résumé des activités importantes par email.',
    notif_son_desc:"Jouer un son lors de l'arrivée d'une nouvelle notification. Cliquez pour tester.",
    pref_enregistree:'Préférence enregistrée',
  },
  en: {
    nav_dashboard:'Dashboard', nav_budget_annuel:'Annual Budget', nav_departements:'Departments',
    nav_utilisateurs:'Users', nav_statistiques:'Statistics', nav_rapports_detail:'Detailed Reports',
    nav_assistance_ia:'Budget Analysis', nav_parametres:'Settings', nav_mes_budgets:'My Budgets',
    nav_mes_depenses:'My Expenses', nav_validation:'Budgets to Validate', nav_depenses_valider:'Expenses to Validate', nav_depenses:'Expenses',
    section_principal:'MAIN', section_admin:'ADMINISTRATION', section_rapports:'REPORTS',
    section_assistance:'ASSISTANCE', section_systeme:'SYSTEM', section_budgets:'BUDGETS',
    section_depenses:'EXPENSES', section_validation:'VALIDATION',
    mon_profil:'My Profile', deconnexion:'Log Out', plateforme:'Budget Platform',
    topbar_titre:'Atlas Finance', topbar_assistance:'Assistant',
    notif_titre:'Notifications', notif_a_jour:'All up to date', notif_tout_lire:'Mark all read',
    notif_aucune:'No notifications', notif_vous_a_jour:'You are up to date!',
    notif_attente:'notification(s) pending', notif_rafraich:'Auto-refresh every 15 seconds',
    param_titre:'Settings', param_sous_titre:'Customize your experience on the platform',
    tab_apparence:'Appearance', tab_notifications:'Notifications', tab_audit:'Audit Log', tab_about:'About',
    theme_label:'Interface Theme', theme_desc:'Light, dark or automatic based on system preference.',
    theme_clair:'Light', theme_sombre:'Dark', theme_systeme:'System',
    langue_label:'Language', langue_desc:'Interface display language.',
    densite_label:'Table Density', densite_desc:'Row spacing in data lists.',
    densite_compact:'Compact', densite_normal:'Normal', densite_aere:'Spacious',
    notif_budgets_label:'Budget alerts', notif_depenses_label:'Expense alerts',
    notif_email_label:'Email notifications', notif_son_label:'Notification sound',
    notif_budgets_desc:'Notified when a budget is created, submitted, approved or rejected.',
    notif_depenses_desc:'Notified when an expense is recorded or processed.',
    notif_email_desc:'Receive a summary of important activities by email.',
    notif_son_desc:'Play a sound when a new notification arrives. Click to test.',
    pref_enregistree:'Preference saved',
  },
}

function loadLang() {
  try {
    const v = localStorage.getItem('pref_lang')
    return v === 'en' ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

function getStoredAccessToken() {
  try {
    return localStorage.getItem('access_token')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(() => Boolean(getStoredAccessToken()))
  const [lang,    setLangState] = useState(loadLang)

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  useEffect(() => {
    const token = getStoredAccessToken()
    if (!token) return undefined

    let active = true
    api.get('/accounts/me/')
      .then(({ data }) => {
        if (active) setUser(data)
      })
      .catch(() => {
        localStorage.clear()
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/accounts/login/', { email, password })
    localStorage.setItem('access_token',  data.access)
    localStorage.setItem('refresh_token', data.refresh)
    const me = await api.get('/accounts/me/')
    setUser(me.data)
    return me.data
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  const setLanguage = useCallback((l) => {
    setLangState(l)
    try {
      localStorage.setItem('pref_lang', l)
    } catch {
      // Ignore storage errors on locked-down browsers.
    }
    document.documentElement.setAttribute('lang', l)
  }, [])

  const t = useCallback((key) => TR[lang]?.[key] ?? TR['fr'][key] ?? key, [lang])

  /* Helpers rôles */
  const isAdmin       = user?.role === 'ADMINISTRATEUR'
  const isGestionnaire= user?.role === 'GESTIONNAIRE'
  const isComptable   = user?.role === 'COMPTABLE'

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/accounts/me/')
    setUser(data)
    return data
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isGestionnaire, isComptable, lang, setLanguage, t, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
