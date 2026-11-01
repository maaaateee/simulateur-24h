// Compteur de visites anonyme : seulement des noms d'événements (« visite », « fiche »…), jamais de chiffre ni de donnée.
// Désactivable par l'agent (« Ne pas compter mes visites »), et inactif hors du site en ligne (aperçus, ordinateur de développement).

const CLE_REFUS = 'simulateur-24h:compteur'
const CLE_VU = 'simulateur-24h:vu'
const SITE = 'simulateur-24h.netlify.app'
const dejaEnvoyes = new Set<string>()

export function compteurActif(): boolean {
  try {
    return localStorage.getItem(CLE_REFUS) !== 'non'
  } catch {
    return true
  }
}

export function activerCompteur(actif: boolean) {
  try {
    if (actif) localStorage.removeItem(CLE_REFUS)
    else localStorage.setItem(CLE_REFUS, 'non')
  } catch {
    // Navigation privée : rien n'est gardé, et rien n'est compté non plus d'une visite à l'autre.
  }
}

export function compter(...evenements: string[]) {
  if (location.hostname !== SITE || !compteurActif() || !evenements.length) return
  const corps = JSON.stringify({ e: evenements })
  try {
    if (!navigator.sendBeacon?.('/api/compteur', new Blob([corps], { type: 'application/json' })))
      void fetch('/api/compteur', { method: 'POST', body: corps, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {})
  } catch {
    // Le compteur ne doit jamais gêner le simulateur.
  }
}

/** Une seule fois par chargement de page et par événement (ex. le premier passage au planning 12 h). */
export function compterUneFois(evenement: string) {
  if (dejaEnvoyes.has(evenement)) return
  dejaEnvoyes.add(evenement)
  compter(evenement)
}

/** Visite : nouveau visiteur (jamais venu sur cet appareil), visiteur du jour, téléphone ou ordinateur. */
export function compterVisite() {
  const ev = ['visite']
  const jour = new Date().toISOString().slice(0, 10)
  try {
    const vu = localStorage.getItem(CLE_VU)
    if (!vu) ev.push('nouveau')
    if (vu !== jour) ev.push('visiteur_jour')
    localStorage.setItem(CLE_VU, jour)
  } catch {
    ev.push('visiteur_jour')
  }
  ev.push(window.matchMedia?.('(max-width: 760px)').matches ? 'mobile' : 'ordinateur')
  compter(...ev)
}
