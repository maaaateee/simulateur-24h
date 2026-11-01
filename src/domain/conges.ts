// Pose des repos sur l'année, comme le font les agents : on garde au travail les vacations qui rapportent le plus
// (dimanches, fériés) et on pose des blocs de vacations pour avoir de longues périodes de repos.
//
// 12 h (règles ADP actuelles, PDG/2020/0607) :
//  - CP décomptés en jours ouvrables (lundi → samedi hors fériés), du premier jour d'absence à la dernière vacation non
//    effectuée : les repos situés entre deux vacations posées sont décomptés, les dimanches et les fériés jamais.
//  - Congé principal d'été : une période continue d'au moins 12 jours ouvrables. Le solde (18 jours) se fractionne en
//    6 fois au plus : des blocs de 3 vacations de suite.
//  - RF (un par férié légal, après le férié) et RTT (77 h, jamais un férié) : blocs de 2 vacations (2 repos accolés au plus).
// 24 h (règles à négocier) : les mêmes droits, comptés en heures, et des repos de cycle placés par le gestionnaire.
//  - Les deux agents ont le même volume de repos : le 24 h travaille autant d'heures que le 12 h (à 24 h près), jamais plus de 1 501 h.
//  - Congé d'été de 3 vacations de suite (72 h, la valeur de 12 jours ouvrables en 12 h) : 14 jours de repos d'affilée.
//  - On évite de casser une semaine à 48 h, et les mois comptent un peu moins de vacations au printemps et en été
//    qu'en automne et en hiver.

import { addDays, daysInMonth, weekday, type ISODate } from './dates'
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

export const CP_JOURS = 30
export const CP_PRINCIPAL_MIN = 12
export const RTT_HEURES = 77
/** Valeur d'un RF en heures : une vacation de 12 h, comme aujourd'hui. */
export const RF_HEURES = 12
/** Poids des mois (avril → mars) en 24 h : un peu moins de vacations au printemps et en été. */
const POIDS_24H = [0.9, 0.9, 0.86, 0.86, 0.9, 0.95, 1, 1.1, 1, 1.1, 1.12, 1.1]

export interface LignePose {
  code: CodeRepos
  vacations: number
  heures: number
}

export interface Bilan {
  regime: Regime
  /** Planning théorique, avant la pose des repos. */
  cycle: { vacations: number; heures: number }
  /** CP : en 12 h, `jours` = jours ouvrables décomptés. */
  cp: LignePose & { jours: number }
  /** Congé principal d'été : vacations posées, dates, jours ouvrables décomptés et jours de repos d'affilée. */
  ete: { vacations: number; du: ISODate; au: ISODate; ouvrables: number; jours: number }
  rf: LignePose & { feries: number }
  rtt: LignePose & { reste: number }
  rc: LignePose
  final: { vacations: number; heures: number }
}

export const ouvrable = (d: ISODate) => weekday(d) !== 0 && !holidayName(d)
/** Jours ouvrables (lundi → samedi hors fériés) du `du` au `au` compris. */
export function decompte(du: ISODate, au: ISODate): number {
  let n = 0
  for (let d = du; d <= au; d = addDays(d, 1)) if (ouvrable(d)) n++
  return n
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

/** Suites de jours consécutifs travaillés (ex. J, N, N du lundi au mercredi). */
function suites(p: Planning): ISODate[][] {
  const out: ISODate[][] = []
  for (const d of vacations(p)) {
    const der = out[out.length - 1]
    if (der && addDays(der[der.length - 1], 1) === d) der.push(d)
    else out.push([d])
  }
  return out
}

/** Nombre de vacations travaillées visé chaque mois en 24 h, réparties selon POIDS_24H. */
export function profil24h(an: number, total: number, theo: number[]): number[] {
  const poids = POIDS_24H.map((w, i) => {
    const m = ((3 + i) % 12) + 1
    return w * daysInMonth(m >= 4 ? an : an + 1, m)
  })
  const somme = poids.reduce((a, b) => a + b, 0)
  const brut = poids.map((w) => (w * total) / somme)
  const parts = brut.map((x, i) => Math.min(theo[i], Math.floor(x)))
  let reste = total - parts.reduce((a, b) => a + b, 0)
  const ordre = brut.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f)
  for (let k = 0; reste > 0 && k < 48; k++) {
    const { i } = ordre[k % 12]
    if (parts[i] < theo[i]) {
      parts[i]++
      reste--
    }
  }
  return parts
}

export interface OptionsPose {
  debut24?: number
  /** 24 h : heures à ne pas dépasser (celles du planning 12 h, pour un même volume de repos). */
  heuresCible?: number
}

export function poserRepos(theorique: Planning, regime: Regime, an: number, opts: OptionsPose = {}): { planning: Planning; bilan: Bilan } {
  const debut24 = opts.debut24 ?? 7
  const p: Planning = { ...theorique }
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
  const feries = feriesLegaux(an)
  const rfDisponible = (d: ISODate) => feries.filter((f) => f <= d).length > lignes.RF.vacations
  let joursCp = 0
  let ete: ISODate[] = []

  if (regime === '12h') {
    // 1. Congé principal : la période d'au moins 12 jours ouvrables, en juillet-août, qui libère le plus de vacations.
    const blocs = suites(p)
    let meilleur: { du: ISODate; au: ISODate; jours: number; vac: ISODate[]; cout: number } | undefined
    for (const [i, a] of blocs.entries()) {
      const du = a[0]
      if (du < `${an}-07-01` || du > `${an}-08-31`) continue
      for (const b of blocs.slice(i)) {
        const au = [...b].reverse().find(ouvrable)
        if (!au) continue
        const jours = decompte(du, au)
        if (jours < CP_PRINCIPAL_MIN) continue
        const vac = vacations(p).filter((d) => d >= du && d <= b[b.length - 1])
        const cout = vac.reduce((t, d) => t + val.get(d)!, 0)
        const mieux =
          !meilleur ||
          jours < meilleur.jours ||
          (jours === meilleur.jours && (vac.length > meilleur.vac.length || (vac.length === meilleur.vac.length && cout < meilleur.cout)))
        if (mieux) meilleur = { du, au: b[b.length - 1], jours, vac, cout }
        break
      }
    }
    if (meilleur) {
      ete = meilleur.vac
      joursCp += meilleur.jours
      ete.forEach((d) => poser(d, 'CP'))
    }

    // 2. Blocs de l'année : le solde des CP en 6 blocs de 3 vacations, RF et RTT en blocs de 2.
    const resteCp = CP_JOURS - joursCp
    const nRf = feries.length
    const nRtt = Math.floor(RTT_HEURES / 12)
    const fractions = Math.min(6, Math.ceil(resteCp / 3))
    const blocsRepos = Math.ceil((nRf + nRtt) / 2)
    const total = fractions + blocsRepos
    const exclus = (d: ISODate) => ete.length > 0 && d >= addDays(ete[0], -3) && d <= addDays(ete[ete.length - 1], 3)
    let cpRestants = resteCp
    let reposRestants = nRf + nRtt
    for (let k = 0; k < total; k++) {
      // Les blocs de CP sont intercalés régulièrement parmi les blocs de RF / RTT.
      const estCp = Math.floor(((k + 1) * fractions) / total) > Math.floor((k * fractions) / total) && cpRestants > 0
      const taille = estCp ? Math.min(3, cpRestants) : Math.min(2, reposRestants)
      if (taille <= 0) continue
      const cible = addDays(debut, Math.floor(((k + 0.5) * longueur) / total))
      // Candidats : toutes les sous-suites de `taille` jours consécutifs travaillés, hors été.
      const candidats: { jours: ISODate[]; cout: number; ecart: number }[] = []
      for (const s of suites(p)) {
        for (let i = 0; i + taille <= s.length; i++) {
          const jours = s.slice(i, i + taille)
          if (jours.some(exclus)) continue
          const ecart = Math.abs(ecartJours(cible, jours[0]))
          if (ecart > 20) continue
          // Coût : majorations perdues ; on préfère une suite entière (le repos qui suit est plus long).
          const entiere = jours.length === s.length ? 0 : 0.5
          candidats.push({ jours, cout: jours.reduce((t, d) => t + val.get(d)!, 0) * 10 + entiere, ecart })
        }
      }
      const choix = candidats.sort((a, b) => a.cout - b.cout || a.ecart - b.ecart)[0]
      if (!choix) continue
      if (estCp) {
        choix.jours.forEach((d) => poser(d, 'CP'))
        const j = decompte(choix.jours[0], [...choix.jours].reverse().find(ouvrable) ?? choix.jours[0])
        joursCp += j
        cpRestants -= j
      } else {
        for (const d of choix.jours) {
          const rf = lignes.RF.vacations < nRf && rfDisponible(d)
          const rtt = lignes.RTT.vacations < nRtt && !holidayName(d)
          // RF dès qu'elles sont acquises, RTT sinon (RTT anticipées possibles en avril).
          poser(d, rf && (!rtt || lignes.RF.vacations / nRf <= lignes.RTT.vacations / nRtt) ? 'RF' : rtt ? 'RTT' : lignes.RF.vacations < nRf ? 'RF' : 'CP')
          reposRestants--
        }
      }
    }
  } else {
    // 24 h : droits comptés en heures, même volume de repos que le 12 h.
    const cpVac = 9
    const nRf = Math.round((feries.length * RF_HEURES) / 24)
    const nRtt = Math.floor(RTT_HEURES / 24)
    // 1. Congé d'été : 3 vacations de suite en juillet, au moment qui coûte le moins.
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
    ete.forEach((d) => poser(d, 'CP'))

    // 2. Nombre de vacations travaillées : autant d'heures que le 12 h, jamais plus de 1 501 h.
    const plafond = Math.min(HEURES_CONTRAT, opts.heuresCible ?? HEURES_CONTRAT)
    const cible = Math.floor(plafond / 24)
    const moisCles = Array.from({ length: 12 }, (_, i) => {
      const m = ((3 + i) % 12) + 1
      return `${m >= 4 ? an : an + 1}-${String(m).padStart(2, '0')}`
    })
    const theo = moisCles.map((c) => vacations(p).filter((d) => d.startsWith(c)).length)
    const profil = profil24h(an, cible, theo)

    // 3. Vacations retirées mois par mois : la moins rentable, sans casser une semaine à 48 h, en espaçant les repos.
    const retirees: ISODate[] = []
    const coutHs = (d: ISODate) => (vacations(p).some((x) => x !== d && lundiDe(x) === lundiDe(d)) ? 2.5 : 0)
    moisCles.forEach((cle, i) => {
      const reste = () => vacations(p).filter((d) => d.startsWith(cle))
      while (reste().length > profil[i]) {
        const pris = Object.keys(p).filter((d) => !estTravail(p[d]))
        const loin = (d: ISODate) => Math.min(8, ...pris.map((x) => Math.abs(ecartJours(x, d))))
        const d = reste()
          .map((d) => ({ d, cout: val.get(d)! + coutHs(d), loin: loin(d) }))
          .sort((a, b) => a.cout - b.cout || b.loin - a.loin || a.d.localeCompare(b.d))[0].d
        retirees.push(d)
        p[d] = 'RC'
      }
    })

    // 4. Type de chaque repos, dans l'ordre de l'année, chaque type réparti au fil des mois.
    retirees.sort()
    const besoins: Record<CodeRepos, number> = { CP: cpVac - ete.length, RF: nRf, RTT: nRtt, RC: 0 }
    besoins.RC = Math.max(0, retirees.length - besoins.CP - besoins.RF - besoins.RTT)
    const types: CodeRepos[] = ['RF', 'CP', 'RTT', 'RC']
    retirees.forEach((d, k) => {
      const restants = types.filter((t) => lignes[t].vacations - (t === 'CP' ? ete.length : 0) < besoins[t])
      const possibles = restants.filter((t) => (t !== 'RF' || rfDisponible(d)) && (t !== 'RTT' || !holidayName(d)))
      const liste = possibles.length ? possibles : restants
      const retard = (t: CodeRepos) => (besoins[t] * (k + 1)) / retirees.length - (lignes[t].vacations - (t === 'CP' ? ete.length : 0))
      const t = liste.sort((a, b) => retard(b) - retard(a))[0] ?? 'RC'
      p[d] = theorique[d]
      poser(d, t)
    })
    joursCp = lignes.CP.vacations
  }

  // Repos de cycle si le plafond est encore dépassé (ne devrait pas arriver).
  for (let i = 0; heuresTravaillees(p) > HEURES_CONTRAT && i < 60; i++) {
    const v = vacations(p)
    poser(v[Math.floor(((i * 0.618) % 1) * v.length)], 'RC')
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
      cp: { ...lignes.CP, jours: joursCp },
      ete: {
        vacations: ete.length,
        du: ete[0] ?? debut,
        au: ete[ete.length - 1] ?? debut,
        ouvrables: ete.length ? decompte(ete[0], [...ete].reverse().find(ouvrable) ?? ete[0]) : 0,
        jours,
      },
      rf: { ...lignes.RF, feries: feries.length },
      rtt: { ...lignes.RTT, reste: RTT_HEURES - lignes.RTT.heures },
      rc: lignes.RC,
      final: { vacations: vacations(p).length, heures: heuresTravaillees(p) },
    },
  }
}
