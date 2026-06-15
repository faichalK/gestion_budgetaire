/**
 * notifRefresh — émet un événement custom pour forcer le rafraîchissement
 * immédiat des notifications sans attendre le prochain polling.
 *
 * Appeler après toute action métier qui génère une notification :
 *   soumettre un budget, enregistrer une dépense, approuver, rejeter…
 *
 * Usage :
 *   import { notifRefresh } from '../../utils/notifRefresh'
 *   await soumettreBudget(id)
 *   notifRefresh()
 */
export function notifRefresh() {
  window.dispatchEvent(new CustomEvent('atlasfinance:notif-refresh'))
}
