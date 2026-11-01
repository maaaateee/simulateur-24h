import { describe, expect, it } from 'vitest'
import { profilParDefaut, tauxDepuisTraitement } from './paie'
import { simuler } from './simulation'
import { TRAJET_PAR_DEFAUT } from './transport'

const profil = { ...profilParDefaut(), traitementBase: 2344.28, ...tauxDepuisTraitement(2344.28) }
const reglages = { equipe: 0, debut24: 7, semainesChargees: true, indemniteCp: true }

describe('simulation complète', () => {
  it('compare les deux plannings sur la même base', () => {
    const s = simuler(profil, TRAJET_PAR_DEFAUT, reglages, {}, {})
    expect(s.c12.resultat.stats.vacations).toBe(117)
    // Même volume de repos : le 24 h travaille autant d'heures que le 12 h, à une vacation près.
    expect(s.c12.resultat.stats.heures - s.c24.resultat.stats.heures).toBeGreaterThanOrEqual(0)
    expect(s.c12.resultat.stats.heures - s.c24.resultat.stats.heures).toBeLessThan(24)
    expect(s.parEquipe).toHaveLength(4)
    expect(s.gainBrut).toBeCloseTo(s.c24.variable - s.c12.variable, 6)
    expect(s.gainBrut).toBeGreaterThan(0)
    const ecart = s.c12.resultat.stats.vacations - s.c24.resultat.stats.vacations
    expect(s.economieTrajets).toBeCloseTo(ecart * 70 * (0.06 * 2.3 + 0.2), 0)
    expect(s.gainTotal).toBeCloseTo(s.gainNet + s.economieTrajets, 6)
  })

  it('les changements faits à la main sont pris en compte', () => {
    const base = simuler(profil, TRAJET_PAR_DEFAUT, reglages, {}, {})
    const premier = Object.keys(base.c24.planning).sort().find((d) => base.c24.planning[d] === 'V24')!
    const s = simuler(profil, TRAJET_PAR_DEFAUT, reglages, {}, { 0: { [premier]: 'CP' } })
    expect(s.c24.resultat.stats.vacations).toBe(base.c24.resultat.stats.vacations - 1)
    expect(s.parEquipe[1]).toBe(base.parEquipe[1])
  })
})
