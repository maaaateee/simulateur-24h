import { describe, expect, it } from 'vitest'
import { calculer } from './calcul'
import type { Planning } from './planning'

const taux = { t75: 10.403, t100: 13.87, base: 2344.28 / 151.67 }
const calc = (p: Planning, debut24 = 7, semainesChargees = true) => calculer(p, 2026, taux, { debut24, semainesChargees })

describe('majorations heure par heure', () => {
  it('une nuit du 30 avril donne 2 h de nuit et 6 h fériées le 1er mai', () => {
    const r = calc({ '2026-04-30': 'N' })
    expect(r.heures).toMatchObject({ nuit: 2, ferie: 6, dimanche: 0 })
    expect(r.montants.total).toBeCloseTo(2 * 10.403 + 6 * 13.87, 2)
    expect(r.parMois['2026-05'].majorations).toBeCloseTo(6 * 13.87, 2)
  })

  it('un jour de dimanche donne 12 h à +75 %, le dimanche de Pâques 12 h fériées', () => {
    expect(calc({ '2026-04-12': 'J' }).heures).toMatchObject({ dimanche: 12, nuit: 0 })
    expect(calc({ '2026-04-05': 'J' }).heures).toMatchObject({ ferie: 12, dimanche: 0 })
  })

  it('une vacation de 24 h compte toujours 8 h de nuit, et le dimanche selon l’heure de début', () => {
    // Samedi 11 avril 2026, de 7 h à 7 h : 15 h normales, 2 + 6 h de nuit, 1 h de dimanche (6 h → 7 h).
    expect(calc({ '2026-04-11': 'V24' }, 7).heures).toMatchObject({ nuit: 8, dimanche: 1 })
    // Dimanche 12 avril, de 7 h à 7 h : 15 h de dimanche en journée + 8 h de nuit.
    expect(calc({ '2026-04-12': 'V24' }, 7).heures).toMatchObject({ nuit: 8, dimanche: 15 })
    expect(calc({ '2026-04-12': 'V24' }, 12).heures).toMatchObject({ nuit: 8, dimanche: 10 })
  })

  it('une semaine à 48 h : 3 h à +25 % (40e à 42e) et 6 h supplémentaires à +25 %', () => {
    const p: Planning = { '2026-04-13': 'V24', '2026-04-16': 'V24' }
    expect(calc(p, 6).heures).toMatchObject({ comp25: 3, hs25: 6, hs50: 0 })
    expect(calc(p, 6, false).heures).toMatchObject({ comp25: 0, hs25: 0 })
  })

  it('statistiques : week-ends libres, repos longs, repos compensateur de nuit', () => {
    const r = calc({ '2026-04-01': 'V24', '2026-04-05': 'V24' })
    expect(r.stats.vacations).toBe(2)
    expect(r.stats.reposLongs).toBe(1)
    expect(r.stats.heures21a6).toBe(18)
    expect(r.stats.rcNuit).toBe(0) // moins de 270 h : pas encore travailleur de nuit
    expect(r.stats.weekendsLibres).toBe(51) // 52 week-ends, celui du 4-5 avril est pris
  })
})
