// Planning 12 h de référence : un vrai TDS annuel SSIAP 1 de CDG (modulation 2026-2027), avant la pose des congés.
// Une lettre par jour, un mois par ligne : J = jour 6 h → 18 h, N = nuit 18 h → 6 h, j = petite vacation 6 h → 16 h, . = repos.
// Les 2 journées de formation (FP00) sont comptées comme des repos : elles existent de la même façon en 24 h.

import { toISO } from './dates'
import type { Planning } from './planning'

const MOIS_2026_2027 = [
  '...JNN....JJ..JJN.....JJN...JJ', // 2026-04
  'N...JJN...JJN........JJJ....JJJ', // 2026-05
  '..JjN...JNN...JN....JJ..JJ..JJ', // 2026-06
  'N....JJ...NN....JJJ..JJN...JJN.', // 2026-07
  '..JN....JN....JJ..JJN...JJ..JNN', // 2026-08
  '....JJ...JJN...JJ..JN....JJ..J', // 2026-09
  'JJ..JNN.....jJN...JJ...NN...JJN', // 2026-10
  '...JJJ...JNN...JJN.....JJ...JJ', // 2026-11
  'N...JN....J....JJN...JjN...JN..', // 2026-12
  '..JN...JJN...JJN...JJJ...JJ...J', // 2027-01
  'JN...JNN....JJ..JJN.....JJN.', // 2027-02
  '..JJN...JJN...JJN........JJJ...', // 2027-03
]

export const AN_TDS_12H = 2026

export function tds12h(): Planning {
  const p: Planning = {}
  MOIS_2026_2027.forEach((ligne, i) => {
    const m = ((3 + i) % 12) + 1
    const y = m >= 4 ? AN_TDS_12H : AN_TDS_12H + 1
    ;[...ligne].forEach((c, j) => {
      if (c === 'J') p[toISO(y, m, j + 1)] = 'J'
      else if (c === 'N') p[toISO(y, m, j + 1)] = 'N'
      else if (c === 'j') p[toISO(y, m, j + 1)] = 'J10'
    })
  })
  return p
}
