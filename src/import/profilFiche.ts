// Profil de paie lu sur une fiche de paie ADP (texte natif du PDF, lu sur l'appareil, rien n'est envoyé).
// On garde seulement ce qui sert à la simulation : échelon, traitement de base, ancienneté, taux des majorations,
// éléments fixes du mois et taux de cotisations / d'impôt. Jamais d'IBAN, de n° de sécurité sociale, d'adresse ni de net.

import { GRILLES, type Qualification } from '../domain/echelons'
import { tauxDepuisTraitement, type Profil } from '../domain/paie'
import type { Payslip } from './payslip'

/** Lignes propres à un mois (rappels, régularisations, absences…) ou recalculées par le simulateur. */
const NON_RECURRENT =
  /^(TRAITEMENT DE BASE|ANCIENNETE|ASSIDUITE$|PRIME 13EME|MAJ\.|COMP\.|ABS|PAI\.|IND\.|REDUC\.|RAP|REGUL|PRIME COMPLEMENTAIRE|ICPL|H COMPL|HS )| \d{2}[+-]$|\d+\/\d+/

export function elementsRecurrents(f: Payslip): { libelle: string; montant: number }[] {
  return (f.elements ?? []).filter((e) => !NON_RECURRENT.test(e.libelle))
}

/** SSIAP 1 : grille 1B2 (100S → 150S) ; SSIAP 2 : grille 2B (200S → 275S). */
export function qualificationDe(echelon: string | undefined): Qualification | undefined {
  const n = Number(echelon?.match(/^(\d{3})/)?.[1])
  if (!n) return undefined
  if (n >= 200) return 'SSIAP2'
  if (n >= 100) return 'SSIAP1'
  return undefined
}

export function profilDepuisFiche(f: Payslip, actuel: Profil): Profil {
  const qualification = qualificationDe(f.echelon) ?? actuel.qualification
  const echelon = f.echelon && GRILLES[qualification].traitement[f.echelon] ? f.echelon : actuel.echelon
  // La grille fait foi (le traitement de base du bulletin peut être proratisé un mois incomplet).
  const traitementBase = (f.echelon && GRILLES[qualification].traitement[f.echelon]) || f.traitementBase || actuel.traitementBase
  // Taux des majorations : la ligne « + » la plus récente (les rappels « − ancien taux » sont ignorés).
  const tauxLu = (type: 'maj75' | 'maj100') =>
    f.lignes
      .filter((l) => l.type === type && l.sens === '+' && l.taux && l.mois)
      .sort((a, b) => a.mois!.localeCompare(b.mois!))
      .pop()?.taux
  const derives = tauxDepuisTraitement(traitementBase)
  const fixes = elementsRecurrents(f).reduce((t, e) => t + e.montant, 0)
  return {
    source: 'fiche',
    periodeFiche: f.periode,
    qualification,
    echelon,
    traitementBase,
    anciennete: f.ancienneteTaux ?? actuel.anciennete,
    // Taux lus sur la fiche : ils sont propres à chaque agent (traitement de base ÷ 169 pour un SSIAP 1 récent,
    // mais pas pour tout le monde). Sans ligne de majoration, on les estime à partir du traitement.
    t75: tauxLu('maj75') ?? derives.t75,
    t100: tauxLu('maj100') ?? (tauxLu('maj75') ? Math.round((tauxLu('maj75')! / 0.75) * 100) / 100 : derives.t100),
    treizieme: (f.elements ?? []).some((e) => /^PRIME 13EME/.test(e.libelle)),
    autresFixes: Math.round(fixes * 100) / 100,
    tauxCotisations: f.brut && f.cotisationsSalariales ? f.cotisationsSalariales / f.brut : actuel.tauxCotisations,
    tauxPas: f.tauxPas ?? actuel.tauxPas,
  }
}
