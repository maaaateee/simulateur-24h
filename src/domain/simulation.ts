// Assemble la comparaison complète 12 h / 24 h : plannings à 1 501 h, majorations, salaire, trajets.

import { calculer, type Resultat } from './calcul'
import { poserRepos, type Bilan } from './conges'
import { cycle24h } from './cycle24'
import { fixeMensuel, indemniteCp, netDepuisBrut, tauxDuProfil, type Profil } from './paie'
import { appliquerModifs, EQUIPES, type Code, type Planning, type Regime } from './planning'
import { coutTrajets, type CoutTrajets, type Trajet } from './transport'
import { AN_TDS_12H, tds12h } from './tds12'

export type Modifs = Record<string, Code | 'R'>

export interface Reglages {
  /** Équipe du cycle 24 h (0 = A … 3 = D). */
  equipe: number
  /** Heure de début des vacations de 24 h. */
  debut24: number
  /** Compter les heures des semaines chargées (40e à 50e heure). */
  semainesChargees: boolean
  /** Compter l'effet des majorations sur l'indemnité de congés payés (règle du dixième). */
  indemniteCp: boolean
}

export interface Cote {
  regime: Regime
  /** Planning automatique (repos posés), avant les changements faits à la main. */
  auto: Planning
  planning: Planning
  bilan: Bilan
  resultat: Resultat
  /** Supplément d'indemnité de CP lié aux majorations (par an). */
  cp: number
  /** Majorations + indemnité de CP, par an : la seule partie du salaire qui change. */
  variable: number
  brutMensuel: number
  transport: CoutTrajets
}

export interface Simulation {
  an: number
  fixe: { libelle: string; montant: number }[]
  fixeTotal: number
  c12: Cote
  c24: Cote
  gainBrut: number
  gainNet: number
  economieTrajets: number
  gainTotal: number
  /** Gain total pour chacune des 4 équipes. */
  parEquipe: number[]
}

export const AN = AN_TDS_12H

// La pose des repos ne dépend que du planning et de l'heure de début : on la garde en mémoire.
const cache = new Map<string, ReturnType<typeof poserRepos>>()
function pose(regime: Regime, equipe: number, debut24: number) {
  const cle = `${regime}-${equipe}-${debut24}`
  if (!cache.has(cle)) cache.set(cle, poserRepos(regime === '12h' ? tds12h() : cycle24h(AN, equipe), regime, AN, debut24))
  return cache.get(cle)!
}

function cote(regime: Regime, equipe: number, modifs: Modifs, profil: Profil, trajet: Trajet, reglages: Reglages, fixeTotal: number): Cote {
  // Le planning 12 h ne dépend pas de l'heure de début du 24 h.
  const { planning: auto, bilan } = pose(regime, equipe, regime === '12h' ? 7 : reglages.debut24)
  const planning = appliquerModifs(auto, modifs)
  const resultat = calculer(planning, AN, tauxDuProfil(profil), reglages)
  const cp = reglages.indemniteCp ? indemniteCp(resultat.montants.total) : 0
  const variable = resultat.montants.total + cp
  return {
    regime,
    auto,
    planning,
    bilan,
    resultat,
    cp,
    variable,
    brutMensuel: fixeTotal + variable / 12,
    transport: coutTrajets(resultat.stats.vacations, trajet),
  }
}

export function simuler(profil: Profil, trajet: Trajet, reglages: Reglages, modifs12: Modifs, modifs24: Record<number, Modifs>): Simulation {
  const fixe = fixeMensuel(profil)
  const fixeTotal = fixe.reduce((t, l) => t + l.montant, 0)
  const c12 = cote('12h', 0, modifs12, profil, trajet, reglages, fixeTotal)
  const total = (c24: Cote) => {
    const gainBrut = c24.variable - c12.variable
    const gainNet = netDepuisBrut(gainBrut, profil)
    const economieTrajets = c12.transport.total - c24.transport.total
    return { gainBrut, gainNet, economieTrajets, gainTotal: gainNet + economieTrajets }
  }
  const equipes = EQUIPES.map((_, e) => cote('24h', e, modifs24[e] ?? {}, profil, trajet, reglages, fixeTotal))
  const c24 = equipes[reglages.equipe]
  return { an: AN, fixe, fixeTotal, c12, c24, ...total(c24), parEquipe: equipes.map((c) => total(c).gainTotal) }
}
