// Compteur de visites anonyme du simulateur.
// Seuls des événements sans aucune donnée sont enregistrés, un par clé : « e/AAAA-MM-JJ/evenement/identifiant-aleatoire ».
// Jamais de fiche de paie, de montant, d'adresse IP ni d'identifiant d'agent.

/** Événements acceptés, et leur libellé sur la page de statistiques. */
export const EVENEMENTS = {
  visite: 'Visites',
  visiteur_jour: 'Visiteurs du jour',
  nouveau: 'Nouveaux visiteurs',
  mobile: 'Sur téléphone',
  ordinateur: 'Sur ordinateur',
  fiche: 'Fiches importées',
  partage: 'Partages',
  bascule: 'Passages au planning 12 h',
}

/** Garde les événements connus (8 au plus par envoi). */
export function filtrer(liste) {
  return (Array.isArray(liste) ? liste : []).filter((e) => typeof e === 'string' && Object.hasOwn(EVENEMENTS, e)).slice(0, 8)
}

/** Totaux par jour et sur toute la période, à partir des clés enregistrées. */
export function agreger(cles) {
  const parJour = {}
  const total = Object.fromEntries(Object.keys(EVENEMENTS).map((e) => [e, 0]))
  for (const cle of cles) {
    const [prefixe, jour, evenement] = cle.split('/')
    if (prefixe !== 'e' || !/^\d{4}-\d{2}-\d{2}$/.test(jour ?? '') || !Object.hasOwn(EVENEMENTS, evenement)) continue
    parJour[jour] ??= Object.fromEntries(Object.keys(EVENEMENTS).map((e) => [e, 0]))
    parJour[jour][evenement]++
    total[evenement]++
  }
  const jours = Object.keys(parJour).sort().reverse()
  return { total, jours: jours.map((j) => ({ jour: j, ...parJour[j] })) }
}

const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const dateFr = (iso) => {
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

/** Page de statistiques (HTML autonome, thème sombre). */
export function pageStats({ total, jours }, maintenant = new Date()) {
  const tuiles = [
    ['visite', '👀'],
    ['nouveau', '🙋'],
    ['fiche', '📄'],
    ['partage', '📤'],
    ['bascule', '🔁'],
  ]
  const appareils = total.mobile + total.ordinateur
  const pctMobile = appareils ? Math.round((total.mobile / appareils) * 100) : 0
  const colonnes = ['visite', 'visiteur_jour', 'nouveau', 'mobile', 'ordinateur', 'fiche', 'partage', 'bascule']
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Statistiques · Simulateur 24h</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#070b14;color:#eef2f8}
body{margin:0;padding:24px 16px 48px}main{max-width:980px;margin:0 auto}
h1{font-size:1.6rem;margin:0 0 4px}p.sous{color:#8090a8;margin:0 0 20px}
.tuiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:22px}
.tuile{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px}
.tuile span{color:#b6c1d3;font-size:.85rem;font-weight:600}.tuile strong{display:block;font-size:2rem;font-weight:800;margin-top:2px}
.note{color:#8090a8;font-size:.85rem;margin:6px 0 18px}
table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right;white-space:nowrap}
th{color:#b6c1d3;font-weight:600}th:first-child,td:first-child{text-align:left}.defile{overflow-x:auto}
</style></head><body><main>
<h1>Simulateur 24h · statistiques</h1>
<p class="sous">Compteur anonyme : aucune fiche de paie, aucun montant, aucune adresse. Mis à jour le ${echapper(maintenant.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }))}.</p>
<div class="tuiles">
${tuiles.map(([e, i]) => `<div class="tuile"><span>${i} ${echapper(EVENEMENTS[e])}</span><strong>${total[e].toLocaleString('fr-FR')}</strong></div>`).join('\n')}
<div class="tuile"><span>📱 Sur téléphone</span><strong>${pctMobile} %</strong></div>
</div>
<p class="note">« Nouveaux visiteurs » : premiers passages d'un téléphone ou d'un ordinateur (un collègue qui change d'appareil compte deux fois). « Visiteurs du jour » : appareils différents venus ce jour-là.</p>
<div class="defile"><table>
<thead><tr><th>Jour</th>${colonnes.map((c) => `<th>${echapper(EVENEMENTS[c])}</th>`).join('')}</tr></thead>
<tbody>
${jours.length ? jours.map((j) => `<tr><td>${dateFr(j.jour)}</td>${colonnes.map((c) => `<td>${j[c]}</td>`).join('')}</tr>`).join('\n') : `<tr><td colspan="${colonnes.length + 1}">Aucune visite comptée pour l'instant.</td></tr>`}
</tbody></table></div>
</main></body></html>`
}
