// Pose des repos pour arriver à 1 501 h au plus, comme le font les agents : on garde au travail les vacations
// qui rapportent le plus (dimanches, fériés) et on pose les repos sur les autres.
//
// Droits, à valeur égale en heures dans les deux plannings :
//  - CP : 30 jours ouvrables, soit 5 semaines d'absence = 35 jours × la part de jours travaillés du planning
//    (15 vacations de 12 h ou 9 de 24 h en 2026-2027). Congé principal en été, le minimum pour avoir
//    au moins 12 jours de repos d'affilée : 2 semaines en 12 h, 3 vacations de suite en 24 h (15 jours de repos).
//    Le reste des CP est posé vacation par vacation dans l'année (CP isolé autorisé une fois le principal posé).
//  - RF : un par jour férié légal × 12 h (une RF ne se prend qu'après le férié).
//  - RTT : 77 h en vacations entières, jamais un jour férié ; il reste 5 h à poser en heures.
//  - Repos de cycle : ce qu'il faut en plus pour ne pas dépasser 1 501 h.
// En 12 h, les repos sont répartis régulièrement dans l'année, sur la vacation la moins rentable des environs
// (on évite les dimanches et les fériés). En 24 h, on évite aussi de casser une semaine à 48 h, et les mois
// suivent un profil : 4 à 5 vacations travaillées au printemps et en été, 5 à 6 en automne et en hiver.

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
  horaire,
  vacations,
  type CodeRepos,
  type CodeTravail,
  type Planning,
  type Regime,
} from './planning'

export const CP_SEMAINES = 5
export const RTT_HEURES = 77
/** Valeur d'un RF en heures : une vacation de 12 h, comme aujourd'hui. */
export const RF_HEURES = 12
/** Vacations travaillées visées chaque mois en 24 h (avril → mars) : 62 en tout, soit 1 488 h. */
export const PROFIL_24H = [5, 5, 4, 4, 5, 5, 5, 6, 5, 6, 6, 6]

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
  /** Congé principal d'été : vacations posées et plus longue période de repos d'affilée qu'il donne. */
  ete: { vacations: number; du: ISODate; au: ISODate; jours: number }
  rf: LignePose & { feries: number }
  rtt: LignePose & { reste: number }
  rc: LignePose
  final: { vacations: number; heures: number }
}

function lundiSuivant(d: ISODate): ISODate {
  while (weekday(d) !== 1) d = addDays(d, 1)
  return d
}

/**
 * Ce que rapporte une vacation en majorations, en heures au taux nominal : férié 1, dimanche en journée 0,75.
 * Les heures de nuit ne sont pas comptées : on ne cherche pas à garder les nuits.
 */
export function valeur(d: ISODate, c: CodeTravail, debut24: number): number {
  const { debut, duree: n } = horaire(c, debut24)
  let v = 0
  for (let k = 0; k < n; k++) {
    const abs = debut + k
    const jour = addDays(d, Math.floor(abs / 24))
    const h = abs % 24
    if (holidayName(jour)) v += 1
    else if (weekday(jour) === 0 && h >= 6 && h < 22) v += 0.75
  }
  return v
}

const lundiDe = (d: ISODate) => addDays(d, -((weekday(d) + 6) % 7))

export function poserRepos(theorique: Planning, regime: Regime, an: number, debut24 = 7, plafond = HEURES_CONTRAT): { planning: Planning; bilan: Bilan } {
  const p: Planning = { ...theorique }
  const hVac = regime === '24h' ? 24 : 12
  const debut = debutPeriode(an)
  const fin = finPeriode(an)
  const longueur = ecartJours(debut, fin) + 1
  const cycle = { vacations: vacations(p).length, heures: heuresTravaillees(p) }
  const val = new Map(vacations(p).map((d) => [d, valeur(d, p[d] as CodeTravail, debut24)]))
  const ligne = (code: CodeRepos): LignePose => ({ code, vacations: 0, heures: 0 })
  const lignes: Record<CodeRepos, LignePose> = { CP: ligne('CP'), RF: ligne('RF'), RTT: ligne('RTT'), RC: ligne('RC') }
  const poser = (d: ISODate, code: CodeRepos) => {
    const c = p[d]
    if (!estTravail(c)) return
    lignes[code].heures += duree(c)
    lignes[code].vacations++
    p[d] = code
  }

  // Droits en vacations.
  const cpTotal = Math.round((CP_SEMAINES * 7 * cycle.vacations) / longueur)
  const feries = feriesLegaux(an)
  const nRf = Math.round((feries.length * RF_HEURES) / hVac)
  const nRtt = Math.floor(RTT_HEURES / hVac)

  // 1. Congé principal d'été.
  let ete: ISODate[] = []
  if (regime === '12h') {
    // 2 semaines (12 jours ouvrables) à partir du 2e lundi de juillet environ.
    const du = lundiSuivant(`${an}-07-13`)
    const au = addDays(du, 13)
    ete = vacations(p).filter((d) => d >= du && d <= au)
  } else {
    // 3 vacations de suite en juillet (15 jours de repos), au moment qui coûte le moins.
    const juillet = vacations(p).filter((d) => d.startsWith(`${an}-07`))
    let meilleur = Infinity
    for (let i = 0; i + 2 < juillet.length; i++) {
      const bloc = juillet.slice(i, i + 3)
      const cout = bloc.reduce((t, d) => t + val.get(d)!, 0)
      if (cout < meilleur) {
        meilleur = cout
        ete = bloc
      }
    }
  }
  ete.forEach((d) => poser(d, 'CP'))

  // 2. Choix des vacations à retirer, hors congé d'été.
  const retirees: ISODate[] = []
  const coutHs = (d: ISODate) => {
    // En 24 h, retirer une vacation d'une semaine à 48 h fait perdre les heures des semaines chargées.
    if (regime !== '24h') return 0
    const l = lundiDe(d)
    return vacations(p).filter((x) => x !== d && lundiDe(x) === l).length ? 2.5 : 0
  }
  const choisir = (candidats: ISODate[], cible: ISODate) => {
    // La moins rentable ; à égalité, la plus éloignée des repos déjà posés, puis la plus proche de la cible.
    const pris = Object.keys(p).filter((d) => !estTravail(p[d]))
    const eloignement = (d: ISODate) => Math.min(99, ...pris.map((x) => Math.abs(ecartJours(x, d))))
    return candidats
      .map((d) => ({ d, cout: val.get(d)! + coutHs(d), loin: eloignement(d), pres: Math.abs(ecartJours(cible, d)) }))
      .sort((a, b) => a.cout - b.cout || Math.min(b.loin, 8) - Math.min(a.loin, 8) || a.pres - b.pres)[0]?.d
  }
  const retirer = (d: ISODate | undefined) => {
    if (!d) return
    retirees.push(d)
    p[d] = 'RC' // provisoire : le type est attribué ensuite
  }

  if (regime === '24h') {
    // Profil mensuel : on retire ce qu'il faut pour garder le nombre de vacations visé chaque mois.
    for (let i = 0; i < 12; i++) {
      const m = ((3 + i) % 12) + 1
      const cle = `${m >= 4 ? an : an + 1}-${String(m).padStart(2, '0')}`
      const reste = () => vacations(p).filter((d) => d.startsWith(cle))
      while (reste().length > PROFIL_24H[i]) retirer(choisir(reste(), `${cle}-15`))
    }
  } else {
    // Répartition régulière : chaque repos vise une date et prend la vacation la moins rentable à ±10 jours.
    const n = cpTotal - ete.length + nRf + nRtt
    for (let i = 0; i < n; i++) {
      const cible = addDays(debut, Math.floor(((i + 0.5) * longueur) / n))
      const proches = vacations(p).filter((d) => Math.abs(ecartJours(cible, d)) <= 10)
      retirer(choisir(proches.length ? proches : vacations(p), cible))
    }
  }

  // 3. Type de chaque repos, dans l'ordre de l'année, en répartissant chaque type au fil des mois.
  retirees.sort()
  const besoins: Record<CodeRepos, number> = { CP: Math.max(0, cpTotal - ete.length), RF: nRf, RTT: nRtt, RC: 0 }
  besoins.RC = Math.max(0, retirees.length - besoins.CP - besoins.RF - besoins.RTT)
  const utilises: Record<CodeRepos, number> = { CP: 0, RF: 0, RTT: 0, RC: 0 }
  const types: CodeRepos[] = ['RF', 'CP', 'RTT', 'RC']
  retirees.forEach((d, k) => {
    const restants = types.filter((t) => utilises[t] < besoins[t])
    const possibles = restants.filter(
      (t) => (t !== 'RF' || feries.filter((f) => f <= d).length > utilises.RF) && (t !== 'RTT' || !holidayName(d)),
    )
    const liste = possibles.length ? possibles : restants
    const retard = (t: CodeRepos) => (besoins[t] * (k + 1)) / retirees.length - utilises[t]
    const t = liste.sort((a, b) => retard(b) - retard(a))[0] ?? 'RC'
    utilises[t]++
    p[d] = theorique[d]
    poser(d, t)
  })

  // 4. Repos de cycle supplémentaires si le plafond est encore dépassé (répartis dans l'année).
  let i = 0
  while (heuresTravaillees(p) > plafond && vacations(p).length && i < 60) {
    const cible = addDays(debut, Math.floor(((i * 0.618) % 1) * longueur))
    const d = choisir(vacations(p).filter((x) => Math.abs(ecartJours(cible, x)) <= 15), cible) ?? choisir(vacations(p), cible)
    if (d) poser(d, 'RC')
    i++
  }

  // Plus longue période de repos autour du congé d'été.
  const travail = vacations(p)
  const avant = [...travail].reverse().find((d) => d < (ete[0] ?? debut))
  const apres = travail.find((d) => d > (ete[ete.length - 1] ?? debut))
  // Jours entiers sans travail : une vacation de 24 h ou de nuit déborde sur le lendemain matin.
  const debutRepos = avant ? addDays(avant, regime === '24h' || p[avant] === 'N' ? 2 : 1) : debut
  const au = apres ? addDays(apres, -1) : fin
  const jours = ete.length ? ecartJours(debutRepos, au) + 1 : 0

  return {
    planning: p,
    bilan: {
      regime,
      cycle,
      cp: lignes.CP,
      ete: { vacations: ete.length, du: ete[0] ?? debut, au: ete[ete.length - 1] ?? debut, jours },
      rf: { ...lignes.RF, feries: feries.length },
      rtt: { ...lignes.RTT, reste: RTT_HEURES - lignes.RTT.heures },
      rc: lignes.RC,
      final: { vacations: vacations(p).length, heures: heuresTravaillees(p) },
    },
  }
}
