// Salaire brut mensuel moyen et passage au net. Les éléments fixes (traitement de base, ancienneté, assiduité,
// 13e mois, supplément familial, IDT…) sont les mêmes en 12 h et en 24 h : seules les majorations changent,
// et avec elles l'indemnité de congés payés (règle du dixième, qui inclut les majorations).

import { GRILLES, type Qualification } from './echelons'
import type { Taux } from './calcul'

export interface Profil {
  source: 'fiche' | 'saisie'
  /** Mois de la fiche de paie lue ("YYYY-MM"). */
  periodeFiche?: string
  qualification: Qualification
  echelon: string
  traitementBase: number
  /** Taux d'ancienneté (% du traitement de base). */
  anciennete: number
  t75: number
  t100: number
  /** 13e mois versé chaque mois (« PRIME 13EME MOIS (M) »). */
  treizieme: boolean
  /** Autres éléments fixes du mois (supplément familial, IDT, indemnités kilométriques…). */
  autresFixes: number
  /** Part des cotisations salariales dans le brut (≈ 21,4 % sur les bulletins SSIAP). */
  tauxCotisations: number
  /** Taux d'impôt à la source (%). */
  tauxPas: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** Taux nominal = traitement de base ÷ 169 h (vérifié : 2 344,28 € → 13,87 € ; 2 333,22 € → 13,81 €), taux 75 % arrondi à 3 décimales. */
export function tauxDepuisTraitement(tb: number): { t100: number; t75: number } {
  const t100 = Math.round((tb / 169) * 100 + 1e-9) / 100
  return { t100, t75: Math.round(t100 * 750 + 1e-6) / 1000 }
}

export function profilParDefaut(): Profil {
  const echelon = '120S'
  const tb = GRILLES.SSIAP1.traitement[echelon]
  return {
    source: 'saisie',
    qualification: 'SSIAP1',
    echelon,
    traitementBase: tb,
    anciennete: 10,
    ...tauxDepuisTraitement(tb),
    treizieme: true,
    autresFixes: 0,
    tauxCotisations: 0.214,
    tauxPas: 0,
  }
}

export function tauxDuProfil(p: Profil): Taux {
  return { t75: p.t75, t100: p.t100, base: p.traitementBase / 151.67 }
}

/** Partie fixe du brut mensuel, identique dans les deux plannings. */
export function fixeMensuel(p: Profil): { libelle: string; montant: number }[] {
  const tb = p.traitementBase
  const lignes = [
    { libelle: 'Traitement de base', montant: tb },
    { libelle: `Ancienneté (${p.anciennete.toLocaleString('fr-FR')} %)`, montant: r2((tb * p.anciennete) / 100) },
    { libelle: 'Assiduité (3 %)', montant: r2(tb * 0.03) },
  ]
  if (p.treizieme) lignes.push({ libelle: '13e mois (mensualisé)', montant: r2(tb / 12) })
  if (p.autresFixes) lignes.push({ libelle: 'Autres éléments fixes', montant: r2(p.autresFixes) })
  return lignes
}

/** Supplément d'indemnité de CP : le dixième de la rémunération annuelle, majorations comprises. */
export const indemniteCp = (majorationsAnnuelles: number) => r2(majorationsAnnuelles * 0.1)

/** Passage du brut au net : cotisations, puis impôt à la source sur le net fiscal (≈ net × 1,064). */
export function netDepuisBrut(brut: number, p: Profil): number {
  const net = brut * (1 - p.tauxCotisations)
  return r2(net - net * 1.064 * (p.tauxPas / 100))
}
