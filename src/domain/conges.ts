// Pose automatique des repos pour arriver à 1 501 h au plus, avec la même logique en 12 h et en 24 h :
//  1. CP : 30 jours ouvrables = 5 semaines d'absence, posées aux mêmes semaines dans les deux plannings
//     (3 semaines l'été, la semaine de Noël, une semaine en février). Toutes les vacations de ces semaines sont en CP.
//  2. RF : un par jour férié légal de la période. Un RF vaut aujourd'hui une vacation de 12 h : on garde la même valeur
//     en heures (12 RF × 12 h = 144 h = 12 vacations de 12 h ou 6 vacations de 24 h).
//  3. RTT : 77 h, posées en vacations entières (6 de 12 h ou 3 de 24 h), jamais un jour férié ; il reste 5 h à poser en heures.
//  4. Repos de cycle : si le planning dépasse encore 1 501 h, des vacations sont retirées et réparties dans l'année.
//     Le cycle 24/72 compte beaucoup plus d'heures que le TDS 12 h : c'est là que se fait l'ajustement.
// RF, RTT et repos de cycle sont répartis à intervalles réguliers, sans choisir les dimanches ni les fériés,
// pour ne favoriser aucun des deux plannings.

import { addDays, weekday, type ISODate } from './dates'
import { holidayName } from './holidays'
import {
  HEURES_CONTRAT,
  debutPeriode,
  duree,
  ecartJours,
  estTravail,
  feriesLegaux,
  finPeriode,
  heuresTravaillees,
  vacations,
  type CodeRepos,
  type Planning,
  type Regime,
} from './planning'

export const CP_SEMAINES = 5
export const RTT_HEURES = 77
/** Valeur d'un RF en heures : une vacation de 12 h, comme aujourd'hui. */
export const RF_HEURES = 12

export interface Bloc {
  du: ISODate
  au: ISODate
  nom: string
}

function lundiSuivant(d: ISODate): ISODate {
  while (weekday(d) !== 1) d = addDays(d, 1)
  return d
}
function lundiPrecedent(d: ISODate): ISODate {
  while (weekday(d) !== 1) d = addDays(d, -1)
  return d
}

/** Les 5 semaines de CP (lundi → dimanche), identiques pour les deux plannings. */
export function blocsCP(an: number): Bloc[] {
  const ete = lundiSuivant(`${an}-07-13`)
  const noel = lundiPrecedent(`${an}-12-24`)
  const hiver = lundiSuivant(`${an + 1}-02-15`)
  return [
    { du: ete, au: addDays(ete, 20), nom: 'congé principal, 3 semaines en été' },
    { du: noel, au: addDays(noel, 6), nom: 'semaine de Noël' },
    { du: hiver, au: addDays(hiver, 6), nom: "semaine des vacances d'hiver" },
  ]
}

export interface LignePose {
  code: CodeRepos
  vacations: number
  heures: number
}

export interface Bilan {
  regime: Regime
  /** Planning théorique, avant la pose des repos. */
  cycle: { vacations: number; heures: number }
  cp: LignePose
  rf: LignePose & { feries: number }
  rtt: LignePose & { reste: number }
  rc: LignePose
  final: { vacations: number; heures: number }
}

export function poserRepos(theorique: Planning, regime: Regime, an: number, plafond = HEURES_CONTRAT): { planning: Planning; bilan: Bilan } {
  const p: Planning = { ...theorique }
  const hVac = regime === '24h' ? 24 : 12
  const cycle = { vacations: vacations(p).length, heures: heuresTravaillees(p) }
  const ligne = (code: CodeRepos): LignePose => ({ code, vacations: 0, heures: 0 })
  const poser = (l: LignePose, d: ISODate) => {
    const c = p[d]
    if (!estTravail(c)) return
    l.heures += duree(c)
    l.vacations++
    p[d] = l.code
  }

  // 1. CP : toutes les vacations des 5 semaines.
  const cp = ligne('CP')
  for (const b of blocsCP(an)) for (const d of vacations(p)) if (d >= b.du && d <= b.au) poser(cp, d)

  // Répartition régulière : la i-ème pose vise le jour (i + décalage) × durée / n de la période,
  // et prend la première vacation encore travaillée à partir de ce jour.
  const debut = debutPeriode(an)
  const longueur = ecartJours(debut, finPeriode(an)) + 1
  const repartir = (l: LignePose, n: number, decalage: number, accepte: (d: ISODate) => boolean = () => true) => {
    for (let i = 0; i < n; i++) {
      const cible = addDays(debut, Math.floor(((i + decalage) * longueur) / n))
      const libres = vacations(p).filter(accepte)
      const d = libres.find((x) => x >= cible) ?? libres[libres.length - 1]
      if (d) poser(l, d)
    }
  }

  // 2. RF : même valeur en heures qu'en 12 h.
  const feries = feriesLegaux(an).length
  const rf = { ...ligne('RF'), feries }
  repartir(rf, Math.round((feries * RF_HEURES) / hVac), 0.5)

  // 3. RTT : vacations entières, jamais un jour férié.
  const rtt = { ...ligne('RTT'), reste: 0 }
  repartir(rtt, Math.floor(RTT_HEURES / hVac), 0.1, (d) => !holidayName(d))
  rtt.reste = RTT_HEURES - rtt.heures

  // 4. Repos de cycle : juste ce qu'il faut pour ne pas dépasser le plafond.
  const rc = ligne('RC')
  const exces = heuresTravaillees(p) - plafond
  if (exces > 0) repartir(rc, Math.ceil(exces / hVac), 0.8)
  while (heuresTravaillees(p) > plafond && vacations(p).length) repartir(rc, 1, 0.9)

  return { planning: p, bilan: { regime, cycle, cp, rf, rtt, rc, final: { vacations: vacations(p).length, heures: heuresTravaillees(p) } } }
}
