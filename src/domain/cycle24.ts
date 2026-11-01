// Cycle 24/72 : une vacation de 24 h tous les 4 jours, 4 équipes décalées d'un jour (A commence le 1er avril).

import { joursPeriode, type Planning } from './planning'

export function cycle24h(an: number, equipe: number): Planning {
  const p: Planning = {}
  joursPeriode(an).forEach((d, i) => {
    if (i % 4 === equipe) p[d] = 'V24'
  })
  return p
}
