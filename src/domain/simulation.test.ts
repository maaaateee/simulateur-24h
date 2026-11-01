import { describe, expect, it } from 'vitest'
import { profilParDefaut, tauxDepuisTraitement } from './paie'
import { simuler } from './simulation'
import { TRAJET_PAR_DEFAUT } from './transport'

const profil = { ...profilParDefaut(), traitementBase: 2344.28, ...tauxDepuisTraitement(2344.28) }
const reglages = { equipe: 0, debut24: 7, semainesChargees: true, indemniteCp: true }

describe('simulation complète', () => {
  it('compare les deux plannings sur la même base', () => {
    const s = simuler(profil, TRAJET_PAR_DEFAUT, reglages, {}, {})
    expect(s.c12.resultat.stats.vacations).toBe(125)
    expect(s.c24.resultat.stats.vacations).toBe(62)
    expect(s.parEquipe).toHaveLength(4)
    expect(s.gainBrut).toBeCloseTo(s.c24.variable - s.c12.variable, 6)
    expect(s.gainBrut).toBeGreaterThan(0)
    expect(s.economieTrajets).toBeCloseTo(63 * 70 * (0.06 * 2.3 + 0.2), 0)
    expect(s.gainTotal).toBeCloseTo(s.gainNet + s.economieTrajets, 6)
  })

  it('les changements faits à la main sont pris en compte', () => {
    const base = simuler(profil, TRAJET_PAR_DEFAUT, reglages, {}, {})
    const premier = Object.keys(base.c24.planning).sort().find((d) => base.c24.planning[d] === 'V24')!
    const s = simuler(profil, TRAJET_PAR_DEFAUT, reglages, {}, { 0: { [premier]: 'CP' } })
    expect(s.c24.resultat.stats.vacations).toBe(61)
    expect(s.parEquipe[1]).toBe(base.parEquipe[1])
  })
})
