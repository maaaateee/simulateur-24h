import { describe, expect, it } from 'vitest'
import { profilParDefaut } from '../domain/paie'
import { parsePayslip } from './payslip'
import type { TextItem } from './pdf'
import { profilDepuisFiche, qualificationDe } from './profilFiche'

// Fiche FICTIVE (aucune donnée réelle), à la mise en page d'un bulletin ADP :
// désignation < 270 pt, nombre 270-305, taux 305-350, montant 350-400 ; montants sans virgule.
const L = (y: number, ...cols: [number, string][]): TextItem[] => cols.map(([x, str]) => ({ page: 1, x, y, str }))
const fiche: TextItem[] = [
  ...L(68, [311.8, "PERIODE D'EMPLOI"], [379.5, 'DU :'], [408.2, '01'], [422.6, 'AOUT'], [446.6, '2026']),
  ...L(120, [20, 'ECHELON'], [60, ':'], [70, '210S']),
  ...L(300, [19.8, 'TRAITEMENT DE BASE'], [284.3, '15167'], [371, '262000']),
  ...L(310, [19.8, 'MAJ.75% S/HRS A 100'], [111, '07+'], [284.3, '3000'], [325.4, '10000'], [371, '30000']),
  ...L(318, [19.8, 'MAJ.100% JF S/TS'], [111, '07+'], [284.3, '1200'], [325.4, '13500'], [371, '16200']),
  ...L(326, [19.8, 'MAJ.75% S/HRS A 100'], [111, '06-'], [284.3, '1000'], [325.4, '9000'], [371, '9000-']),
  ...L(334, [19.8, 'ASSIDUITE'], [371, '7860']),
  ...L(342, [19.8, 'SUPPLEMENT FAMILIAL'], [371, '10000']),
  ...L(350, [19.8, 'PAIEMENT IDT'], [371, '5000']),
  ...L(358, [19.8, 'ANCIENNETE'], [325.4, '8000'], [371, '20960']),
  ...L(366, [19.8, 'PRIME 13EME MOIS (M)'], [371, '21833']),
  ...L(400, [19.8, '*REMUNERATION BRUTE'], [200, '350000']),
  ...L(408, [19.8, '*COTISAT.SALARIALES'], [200, '75000-']),
  ...L(420, [19.8, 'IMPOT SUR LE REVENU PRELEVE A LA SOURCE'], [325.4, '4000']),
]

describe('profil lu sur la fiche de paie', () => {
  it('reconnaît SSIAP 1 / SSIAP 2 à l’échelon', () => {
    expect(qualificationDe('122S')).toBe('SSIAP1')
    expect(qualificationDe('210S')).toBe('SSIAP2')
    expect(qualificationDe(undefined)).toBeUndefined()
  })

  it('lit échelon, traitement, ancienneté, taux, éléments fixes, cotisations et impôt', () => {
    const p = profilDepuisFiche(parsePayslip(fiche), profilParDefaut())
    expect(p).toMatchObject({
      source: 'fiche',
      periodeFiche: '2026-08',
      qualification: 'SSIAP2',
      echelon: '210S',
      traitementBase: 2347.68, // la grille 2B fait foi
      anciennete: 8,
      treizieme: true,
      autresFixes: 150, // supplément familial + IDT (l'assiduité est recalculée)
      tauxPas: 4,
    })
    // Les taux de la fiche font foi, même s'ils diffèrent du traitement ÷ 169.
    expect(p.t100).toBe(13.5)
    expect(p.t75).toBe(10)
    expect(p.tauxCotisations).toBeCloseTo(750 / 3500, 6)
  })

  it('refuse un PDF qui n’est pas une fiche de paie ADP', () => {
    expect(() => parsePayslip(L(10, [10, 'Facture']))).toThrow(/bulletin/)
  })
})
