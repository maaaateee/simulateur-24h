// Plannings annuels sur la période de modulation ADP (1er avril → 31 mars).
// Un planning ne contient que les jours où il se passe quelque chose : vacation travaillée ou repos posé
// sur une vacation prévue. Un jour absent est un jour de repos.

import { addDays, toISO, utc, type ISODate } from './dates'
import { holidays } from './holidays'

export type Regime = '12h' | '24h'
/** J : 6 h → 18 h, N : 18 h → 6 h, J10 : 6 h → 16 h, V24 : vacation de 24 h. */
export type CodeTravail = 'J' | 'N' | 'J10' | 'V24'
/** CP : congés payés, RF : récupération de jour férié, RTT, RC : repos de cycle (pour ne pas dépasser 1 501 h). */
export type CodeRepos = 'CP' | 'RF' | 'RTT' | 'RC'
export type Code = CodeTravail | CodeRepos
export type Planning = Record<ISODate, Code>

/** Durée du contrat en horaire continu (avenant ARTT). */
export const HEURES_CONTRAT = 1501
/** Heures de début possibles d'une vacation de 24 h (le SSLIA travaille de 7 h à 7 h). */
export const DEBUTS_24H = [6, 7, 8, 12] as const
export const EQUIPES = ['A', 'B', 'C', 'D'] as const

export const estTravail = (c: Code | undefined): c is CodeTravail => c === 'J' || c === 'N' || c === 'J10' || c === 'V24'

/** Heure de début et durée d'une vacation. */
export function horaire(code: CodeTravail, debut24: number): { debut: number; duree: number } {
  switch (code) {
    case 'J':
      return { debut: 6, duree: 12 }
    case 'N':
      return { debut: 18, duree: 12 }
    case 'J10':
      return { debut: 6, duree: 10 }
    case 'V24':
      return { debut: debut24, duree: 24 }
  }
}

export const duree = (c: CodeTravail) => horaire(c, 0).duree

export const debutPeriode = (an: number): ISODate => toISO(an, 4, 1)
export const finPeriode = (an: number): ISODate => toISO(an + 1, 3, 31)

/** Tous les jours de la période, dans l'ordre. */
export function joursPeriode(an: number): ISODate[] {
  const out: ISODate[] = []
  for (let d = debutPeriode(an); d <= finPeriode(an); d = addDays(d, 1)) out.push(d)
  return out
}

export const ecartJours = (a: ISODate, b: ISODate) => Math.round((utc(b).getTime() - utc(a).getTime()) / 864e5)

/** Jours fériés légaux de la période : chacun donne une récupération (RF). Le dimanche de Pâques est payé comme férié mais ne donne pas de RF. */
export function feriesLegaux(an: number): ISODate[] {
  return [...holidays(an), ...holidays(an + 1)]
    .filter(([d, nom]) => d >= debutPeriode(an) && d <= finPeriode(an) && nom !== 'Dimanche de Pâques')
    .map(([d]) => d)
    .sort()
}

export function heuresTravaillees(p: Planning): number {
  return Object.values(p).reduce((t, c) => t + (estTravail(c) ? duree(c) : 0), 0)
}

export function vacations(p: Planning): ISODate[] {
  return Object.keys(p)
    .filter((d) => estTravail(p[d]))
    .sort()
}

/** Applique les changements faits à la main ('R' = repos). */
export function appliquerModifs(p: Planning, modifs: Record<ISODate, Code | 'R'>): Planning {
  const out = { ...p }
  for (const [d, c] of Object.entries(modifs)) {
    if (c === 'R') delete out[d]
    else out[d] = c
  }
  return out
}
