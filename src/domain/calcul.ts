// Majorations heure par heure, selon le règlement 12.1.I (DG/2005/2199) appliqué aujourd'hui en 12 h :
//  - jour férié : +100 %, exclusif et prioritaire (le dimanche de Pâques est payé comme férié chez ADP) ;
//  - nuit (22 h – 6 h) : +75 % ;
//  - dimanche : +75 %, sans cumul avec la nuit.
// Chaque heure est rattachée à sa date réelle (une nuit du 30/04 donne 6 h fériées le 1er mai).
// Semaines chargées (semaine civile, lundi 0 h → dimanche 24 h) :
//  - de la 40e à la 42e heure : +25 % du taux horaire de base (DG/2005/2199 § 3.1, ligne « COMP. 25 % » du bulletin) ;
//  - de la 43e à la 50e heure : +25 % (heures supplémentaires, § 3.3.2) ; au-delà de la 50e : +50 %.
// Hypothèse : en 24 h, les mêmes règles s'appliquent. Le règlement renvoie à des accords spécifiques pour le SSLIA et le SMU.

import { addDays, weekday, type ISODate } from './dates'
import { holidayName } from './holidays'
import { estTravail, horaire, joursPeriode, type Planning } from './planning'

export interface Taux {
  /** Taux des heures majorées à 75 % (nuit, dimanche), €/h : ligne « MAJ.75% » du bulletin. */
  t75: number
  /** Taux nominal, payé pour chaque heure fériée (+100 %) : ligne « MAJ.100% JF ». */
  t100: number
  /** Taux horaire de base (traitement de base ÷ 151,67 h), pour les semaines chargées. */
  base: number
}

export interface Heures {
  nuit: number
  dimanche: number
  ferie: number
  /** 40e à 42e heure de la semaine. */
  comp25: number
  /** 43e à 50e heure. */
  hs25: number
  /** Au-delà de la 50e heure. */
  hs50: number
}

export interface Montants extends Heures {
  total: number
}

export interface Mois {
  vacations: number
  heures: number
  majorations: number
}

export interface Stats {
  vacations: number
  heures: number
  /** Week-ends (samedi et dimanche) sans aucune heure de travail. */
  weekendsLibres: number
  /** Plus longue période sans travail, en jours. */
  plusLongRepos: number
  /** Repos d'au moins 3 jours (72 h) entre deux vacations. */
  reposLongs: number
  dimanchesTravailles: number
  feriesTravailles: number
  /** Heures entre 21 h et 6 h : base du repos compensateur de nuit (1,5 %, dû à partir de 270 h). */
  heures21a6: number
  rcNuit: number
}

export interface Resultat {
  heures: Heures
  montants: Montants
  parMois: Record<string, Mois>
  stats: Stats
}

const vide = (): Heures => ({ nuit: 0, dimanche: 0, ferie: 0, comp25: 0, hs25: 0, hs50: 0 })
const r2 = (n: number) => Math.round(n * 100) / 100

export function calculer(p: Planning, an: number, taux: Taux, opts: { debut24: number; semainesChargees: boolean }): Resultat {
  const h = vide()
  const parMois: Record<string, Mois> = {}
  const mois = (m: string) => (parMois[m] ??= { vacations: 0, heures: 0, majorations: 0 })
  const semaines: Record<ISODate, number> = {}
  const joursTouches = new Set<ISODate>()
  const intervalles: [number, number][] = []
  let heures = 0
  let heures21a6 = 0
  const jours = joursPeriode(an)
  const index = new Map(jours.map((d, i) => [d, i]))
  const dimanches = new Set<ISODate>()
  const feries = new Set<ISODate>()

  for (const d of Object.keys(p).sort()) {
    const c = p[d]
    if (!estTravail(c)) continue
    const { debut, duree } = horaire(c, opts.debut24)
    const m = mois(d.slice(0, 7))
    m.vacations++
    m.heures += duree
    heures += duree
    const i0 = (index.get(d) ?? 0) * 24 + debut
    intervalles.push([i0, i0 + duree])
    for (let k = 0; k < duree; k++) {
      const abs = debut + k
      const jour = addDays(d, Math.floor(abs / 24))
      const hd = abs % 24
      joursTouches.add(jour)
      const lundi = addDays(jour, -((weekday(jour) + 6) % 7))
      semaines[lundi] = (semaines[lundi] ?? 0) + 1
      if (hd >= 21 || hd < 6) heures21a6++
      const mj = mois(jour.slice(0, 7))
      if (holidayName(jour)) {
        h.ferie++
        mj.majorations += taux.t100
        if (hd >= 6 && hd < 22) feries.add(jour)
      } else if (hd >= 22 || hd < 6) {
        h.nuit++
        mj.majorations += taux.t75
      } else if (weekday(jour) === 0) {
        h.dimanche++
        mj.majorations += taux.t75
        dimanches.add(jour)
      }
    }
  }

  if (opts.semainesChargees) {
    for (const [lundi, n] of Object.entries(semaines)) {
      const comp = Math.max(0, Math.min(n, 42) - 39)
      const hs25 = Math.max(0, Math.min(n, 50) - 42)
      const hs50 = Math.max(0, n - 50)
      h.comp25 += comp
      h.hs25 += hs25
      h.hs50 += hs50
      // Rattachées au mois du jeudi de la semaine.
      mois(addDays(lundi, 3).slice(0, 7)).majorations += (comp + hs25) * taux.base * 0.25 + hs50 * taux.base * 0.5
    }
  }

  const montants: Montants = {
    nuit: r2(h.nuit * taux.t75),
    dimanche: r2(h.dimanche * taux.t75),
    ferie: r2(h.ferie * taux.t100),
    comp25: r2(h.comp25 * taux.base * 0.25),
    hs25: r2(h.hs25 * taux.base * 0.25),
    hs50: r2(h.hs50 * taux.base * 0.5),
    total: 0,
  }
  montants.total = r2(montants.nuit + montants.dimanche + montants.ferie + montants.comp25 + montants.hs25 + montants.hs50)
  for (const m of Object.values(parMois)) m.majorations = r2(m.majorations)

  // Repos : écarts entre la fin d'une vacation et le début de la suivante (bords de période compris).
  intervalles.sort((a, b) => a[0] - b[0])
  let plusLong = 0
  let reposLongs = 0
  let fin = 0
  for (const [de, a] of intervalles) {
    const ecart = de - fin
    if (ecart > plusLong) plusLong = ecart
    if (ecart >= 72 && fin > 0) reposLongs++
    fin = Math.max(fin, a)
  }
  plusLong = Math.max(plusLong, jours.length * 24 - fin)

  let weekendsLibres = 0
  for (const d of jours) if (weekday(d) === 6 && index.has(addDays(d, 1)) && !joursTouches.has(d) && !joursTouches.has(addDays(d, 1))) weekendsLibres++

  return {
    heures: h,
    montants,
    parMois,
    stats: {
      vacations: intervalles.length,
      heures,
      weekendsLibres,
      plusLongRepos: Math.floor(plusLong / 24),
      reposLongs,
      dimanchesTravailles: dimanches.size,
      feriesTravailles: feries.size,
      heures21a6,
      rcNuit: heures21a6 >= 270 ? r2(heures21a6 * 0.015) : 0,
    },
  }
}
