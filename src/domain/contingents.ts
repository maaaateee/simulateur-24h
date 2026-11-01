// Contingents de repos d'un planning (droit, posé, reste), comme dans l'application Planning SSIAP.
// Le « posé » est relu sur le planning affiché : il suit les changements faits à la main.

import type { Bilan } from './conges'
import { RTT_HEURES } from './conges'
import { weekday } from './dates'
import { holidayName } from './holidays'
import type { Planning, Regime } from './planning'

export interface Contingent {
  code: 'CP' | 'RTT' | 'RF'
  nom: string
  unite: string
  droit: number
  pris: number
  aide: string
}

const ouvrable = (d: string) => weekday(d) !== 0 && !holidayName(d)

export function contingents(regime: Regime, planning: Planning, bilan: Bilan): Contingent[] {
  const jours = (codes: string[]) => Object.keys(planning).filter((d) => codes.includes(planning[d]))
  if (regime === '12h') {
    return [
      {
        code: 'CP',
        nom: 'CP',
        unite: 'jours',
        droit: 30,
        pris: jours(['CP', 'CPR']).filter(ouvrable).length,
        aide: "Congés payés : 30 jours ouvrables du 1er avril au 31 mars. Décomptés du premier jour d'absence à la dernière vacation non effectuée : les repos du milieu comptent, jamais les dimanches ni les fériés.",
      },
      {
        code: 'RTT',
        nom: 'RTT',
        unite: 'h',
        droit: RTT_HEURES,
        pris: jours(['RTT']).length * 12,
        aide: '77 heures par an, posées en heures entières ou en vacations, jamais un jour férié.',
      },
      {
        code: 'RF',
        nom: 'RF',
        unite: 'jours',
        droit: bilan.rf.feries,
        pris: jours(['RF']).length,
        aide: 'Récupérations de jours fériés : une par jour férié légal de la période, à prendre après le férié.',
      },
    ]
  }
  return [
    {
      code: 'CP',
      nom: 'CP',
      unite: 'CP',
      droit: bilan.cp.vacations,
      pris: jours(['CP']).length,
      aide: "Congés payés : un CP = une vacation de 24 h ; les repos entre deux vacations ne sont pas décomptés. Nombre estimé à partir du SSLIA (8,5 CP pour 1 656 h), augmenté pour rester à 1 501 h au plus.",
    },
    {
      code: 'RTT',
      nom: 'RTT',
      unite: 'h',
      droit: bilan.rtt.vacations * 24,
      pris: jours(['RTT']).length * 24,
      aide: 'Estimées à partir du SSLIA (11 RTT pour 1 656 h), augmentées pour rester à 1 501 h au plus. Une RTT = une vacation de 24 h.',
    },
    {
      code: 'RF',
      nom: 'RF',
      unite: 'jours',
      droit: bilan.rf.vacations,
      pris: jours(['RF']).length,
      aide: 'Récupérations de jours fériés : comme au SSLIA, 3 par an, de 24 h chacune.',
    },
  ]
}
