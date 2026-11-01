import { describe, expect, it } from 'vitest'
import { PROFIL_24H, poserRepos, valeur } from './conges'
import { cycle24h } from './cycle24'
import { holidayName } from './holidays'
import { HEURES_CONTRAT, estTravail, heuresTravaillees, vacations, type Planning } from './planning'
import { tds12h } from './tds12'

const parMois = (p: Planning) => {
  const m: Record<string, number> = {}
  for (const d of vacations(p)) m[d.slice(0, 7)] = (m[d.slice(0, 7)] ?? 0) + 1
  return Object.keys(m)
    .sort()
    .map((k) => m[k])
}

describe('valeur d’une vacation', () => {
  it('férié 1, dimanche en journée 0,75, nuit 0', () => {
    expect(valeur('2026-07-14', 'J', 7)).toBe(12)
    expect(valeur('2026-04-12', 'J', 7)).toBe(9)
    expect(valeur('2026-04-14', 'N', 7)).toBe(0)
    // 24 h du samedi 11 avril, 7 h → 7 h : 1 h de dimanche en journée (6 h → 7 h).
    expect(valeur('2026-04-11', 'V24', 7)).toBe(0.75)
  })
})

describe('pose des repos jusqu’à 1 501 h', () => {
  it('12 h : CP, RF, RTT et repos de cycle, sous 1 501 h', () => {
    const { planning, bilan } = poserRepos(tds12h(), '12h', 2026)
    expect(bilan.cycle).toEqual({ vacations: 159, heures: 1902 })
    expect(bilan.cp.vacations).toBe(15)
    expect(bilan.rf).toMatchObject({ feries: 12, vacations: 12, heures: 144 })
    expect(bilan.rtt).toMatchObject({ vacations: 6, reste: 5 })
    expect(bilan.ete.jours).toBeGreaterThanOrEqual(12)
    expect(heuresTravaillees(planning)).toBeLessThanOrEqual(HEURES_CONTRAT)
    expect(bilan.final.heures).toBe(heuresTravaillees(planning))
  })

  it('24 h : 62 vacations par équipe, profil mensuel 4-5 puis 5-6, été de 3 vacations', () => {
    for (let e = 0; e < 4; e++) {
      const { planning, bilan } = poserRepos(cycle24h(2026, e), '24h', 2026)
      expect(bilan.cp.vacations).toBe(9)
      expect(bilan.ete.vacations).toBe(3)
      expect(bilan.ete.jours).toBeGreaterThanOrEqual(12)
      expect(bilan.rf.vacations).toBe(6)
      expect(bilan.rtt.vacations).toBe(3)
      expect(parMois(planning)).toEqual(PROFIL_24H)
      expect(heuresTravaillees(planning)).toBe(1488)
    }
  })

  it('on garde au travail les fériés et les dimanches', () => {
    for (const [p, regime] of [
      [tds12h(), '12h'],
      [cycle24h(2026, 0), '24h'],
    ] as const) {
      const pose = poserRepos(p, regime, 2026).planning
      const retirees = Object.keys(pose).filter((d) => !estTravail(pose[d]))
      const feriesRetires = retirees.filter((d) => holidayName(d))
      expect(feriesRetires.length).toBeLessThanOrEqual(regime === '24h' ? 0 : 1)
      for (const d of retirees) if (pose[d] === 'RTT') expect(holidayName(d)).toBeUndefined()
    }
  })

  it('une RF ne se prend qu’après le férié', () => {
    const { planning } = poserRepos(cycle24h(2026, 2), '24h', 2026)
    const rf = Object.keys(planning)
      .filter((d) => planning[d] === 'RF')
      .sort()
    const feries = ['2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25', '2026-07-14']
    rf.forEach((d, i) => expect(d >= feries[i]).toBe(true))
  })
})
