import { describe, expect, it } from 'vitest'
import { agreger, filtrer, pageStats } from './compteur-commun.mjs'

describe('compteur anonyme', () => {
  it('ne garde que les événements connus, 8 au plus', () => {
    expect(filtrer(['visite', 'fiche', 'salaire', 42, 'partage'])).toEqual(['visite', 'fiche', 'partage'])
    expect(filtrer('visite')).toEqual([])
    expect(filtrer(Array(20).fill('visite'))).toHaveLength(8)
  })

  it('additionne par jour et au total, en ignorant les clés inconnues', () => {
    const r = agreger([
      'e/2026-11-01/visite/a',
      'e/2026-11-01/visite/b',
      'e/2026-11-01/fiche/c',
      'e/2026-11-02/visite/d',
      'e/2026-11-02/inconnu/e',
      'autre/2026-11-02/visite/f',
    ])
    expect(r.total).toMatchObject({ visite: 3, fiche: 1, partage: 0 })
    expect(r.jours.map((j) => [j.jour, j.visite])).toEqual([
      ['2026-11-02', 1],
      ['2026-11-01', 2],
    ])
  })

  it('page de statistiques : totaux affichés, rien d’injectable', () => {
    const html = pageStats(agreger(['e/2026-11-01/visite/a', 'e/2026-11-01/mobile/b']), new Date('2026-11-01T20:00:00Z'))
    expect(html).toContain('Simulateur 24h · statistiques')
    expect(html).toContain('100 %')
    expect(html).not.toContain('<script')
  })
})
