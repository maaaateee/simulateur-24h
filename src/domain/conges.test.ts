import { describe, expect, it } from 'vitest'
import { blocsCP, poserRepos } from './conges'
import { cycle24h } from './cycle24'
import { holidayName } from './holidays'
import { HEURES_CONTRAT, heuresTravaillees, vacations } from './planning'
import { tds12h } from './tds12'

describe('pose des repos jusqu’à 1 501 h', () => {
  it('12 h : le TDS annuel 2026-2027 descend sous 1 501 h avec CP, RF et RTT', () => {
    const { planning, bilan } = poserRepos(tds12h(), '12h', 2026)
    expect(bilan.cycle).toEqual({ vacations: 159, heures: 1902 })
    expect(bilan.rf).toMatchObject({ feries: 12, vacations: 12, heures: 144 })
    expect(bilan.rtt).toMatchObject({ vacations: 6, reste: 5 })
    expect(heuresTravaillees(planning)).toBeLessThanOrEqual(HEURES_CONTRAT)
    expect(bilan.final.heures).toBe(heuresTravaillees(planning))
    expect(bilan.final.vacations).toBe(125)
  })

  it('24 h : chaque équipe travaille 62 vacations, soit 1 488 h', () => {
    for (let e = 0; e < 4; e++) {
      const { planning, bilan } = poserRepos(cycle24h(2026, e), '24h', 2026)
      expect(bilan.cycle.vacations).toBeGreaterThanOrEqual(91)
      expect(bilan.rf.vacations).toBe(6)
      expect(bilan.rtt.vacations).toBe(3)
      expect(vacations(planning)).toHaveLength(62)
      expect(heuresTravaillees(planning)).toBe(1488)
    }
  })

  it('les CP tombent aux mêmes semaines, et les RTT jamais un jour férié', () => {
    const blocs = blocsCP(2026)
    expect(blocs.map((b) => [b.du, b.au])).toEqual([
      ['2026-07-13', '2026-08-02'],
      ['2026-12-21', '2026-12-27'],
      ['2027-02-15', '2027-02-21'],
    ])
    for (const p of [poserRepos(tds12h(), '12h', 2026).planning, poserRepos(cycle24h(2026, 1), '24h', 2026).planning]) {
      for (const [d, c] of Object.entries(p)) {
        if (c === 'CP') expect(blocs.some((b) => d >= b.du && d <= b.au)).toBe(true)
        if (c === 'RTT') expect(holidayName(d)).toBeUndefined()
      }
    }
  })
})
