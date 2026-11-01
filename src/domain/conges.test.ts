import { describe, expect, it } from 'vitest'
import { decompte, poserRepos, profil24h, valeur } from './conges'
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

describe('outils', () => {
  it('valeur d’une vacation : férié 1, dimanche en journée 0,75, nuit 0', () => {
    expect(valeur('2026-07-14', 'J', 7)).toBe(12)
    expect(valeur('2026-04-12', 'J', 7)).toBe(9)
    expect(valeur('2026-04-14', 'N', 7)).toBe(0)
    expect(valeur('2026-04-11', 'V24', 7)).toBe(0.75)
  })

  it('décompte en jours ouvrables : ni dimanche ni férié', () => {
    // Du vendredi 17 au vendredi 24 juillet 2026 : 7 jours ouvrables (le dimanche 19 ne compte pas).
    expect(decompte('2026-07-17', '2026-07-24')).toBe(7)
    // Du lundi 13 au samedi 18 juillet : 5 (le 14 juillet est férié).
    expect(decompte('2026-07-13', '2026-07-18')).toBe(5)
  })

  it('profil 24 h : moins de vacations au printemps et en été', () => {
    const p = profil24h(2026, 62, Array(12).fill(8))
    expect(p.reduce((a, b) => a + b, 0)).toBe(62)
    expect(Math.max(...p.slice(0, 6))).toBeLessThanOrEqual(Math.min(...p.slice(6)) + 1)
    expect(p.slice(0, 6).reduce((a, b) => a + b, 0)).toBeLessThan(p.slice(6).reduce((a, b) => a + b, 0))
  })
})

describe('12 h : pose comme les agents', () => {
  const { planning, bilan } = poserRepos(tds12h(), '12h', 2026)

  it('congé principal d’été : au moins 12 jours ouvrables décomptés, d’un seul tenant, repos du milieu en CP', () => {
    expect(bilan.ete.ouvrables).toBeGreaterThanOrEqual(12)
    expect(bilan.ete.du >= '2026-07-01' && bilan.ete.au <= '2026-08-31').toBe(true)
    // Toutes les vacations de la période sont posées, et les jours de repos du milieu sont décomptés (CPR).
    const tds = tds12h()
    for (let d = bilan.ete.du; d <= bilan.ete.au; d = new Date(Date.parse(`${d}T12:00:00Z`) + 864e5).toISOString().slice(0, 10))
      expect(planning[d]).toBe(tds[d] ? 'CP' : 'CPR')
    expect(bilan.ete.reposDecomptes).toBeGreaterThan(0)
  })

  it('tous les CP (30 jours) et toutes les RF, une partie des RTT, sous 1 501 h', () => {
    expect(bilan.cp.jours).toBe(30)
    expect(bilan.rf.vacations).toBe(12)
    expect(bilan.rtt.vacations).toBe(3)
    expect(bilan.rtt.reste).toBe(41)
    expect(heuresTravaillees(planning)).toBeLessThanOrEqual(HEURES_CONTRAT)
  })

  it('repos posés en blocs de 2 ou 3 vacations de suite', () => {
    const repos = Object.keys(planning)
      .filter((d) => !estTravail(planning[d]) && (d < bilan.ete.du || d > bilan.ete.au))
      .sort()
    const blocs: string[][] = []
    for (const d of repos) {
      const b = blocs[blocs.length - 1]
      const veille = new Date(`${d}T12:00:00`)
      veille.setDate(veille.getDate() - 1)
      if (b && b[b.length - 1] === veille.toISOString().slice(0, 10)) b.push(d)
      else blocs.push([d])
    }
    // Blocs de 2 ou 3 ; au plus une RF ou RTT isolée (nombre impair de repos).
    expect(blocs.filter((b) => b.length < 2).length).toBeLessThanOrEqual(1)
  })
})

describe('24 h', () => {
  it('même volume de repos que le 12 h si demandé, sinon 1 501 h au plus ; répartition du SSLIA', () => {
    for (let e = 0; e < 4; e++) {
      const libre = poserRepos(cycle24h(2026, e), '24h', 2026)
      expect(heuresTravaillees(libre.planning)).toBe(1488)
      const egal = poserRepos(cycle24h(2026, e), '24h', 2026, { heuresCible: 1400 })
      expect(heuresTravaillees(egal.planning)).toBe(1392)
      expect(egal.bilan.ete.vacations).toBe(3)
      expect(egal.bilan.rf.vacations).toBe(3)
      expect(egal.bilan.rc.vacations).toBe(0)
      // CP et RTT dans la proportion du SSLIA (8,5 pour 11).
      const { cp, rtt } = { cp: egal.bilan.cp.vacations, rtt: egal.bilan.rtt.vacations }
      expect(Math.abs(cp / (cp + rtt) - 8.5 / 19.5)).toBeLessThan(0.05)
      const m = parMois(egal.planning)
      expect(m.slice(0, 6).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(m.slice(6).reduce((a, b) => a + b, 0))
    }
  })

  it('on garde au travail les fériés, et les RF se prennent après leur férié', () => {
    const { planning } = poserRepos(cycle24h(2026, 2), '24h', 2026)
    const retirees = Object.keys(planning).filter((d) => !estTravail(planning[d]))
    expect(retirees.filter((d) => holidayName(d))).toEqual([])
    const rf = retirees.filter((d) => planning[d] === 'RF').sort()
    const feries = ['2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25', '2026-07-14']
    rf.forEach((d, i) => expect(d >= feries[i]).toBe(true))
  })
})
