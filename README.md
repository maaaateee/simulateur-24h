# Simulateur 24h SSIAP

Simulateur en ligne du **Projet 24h SSIAP** (agents SSIAP d'ADP, CDG et Orly) : <https://simulateur-24h.netlify.app>.

Il compare, sur une période de modulation complète (1er avril → 31 mars) à **1 501 h au plus**, le rythme actuel en 12 h et le cycle 24/72 proposé :
salaire (majorations), trajets (coût, temps, CO₂) et repos (week-ends libres, repos longs).

- La fiche de paie ADP (PDF) est lue **sur l'appareil** (pdf.js, texte natif) : rien n'est envoyé. Seuls l'échelon, le traitement de base,
  l'ancienneté, les taux de majoration, les éléments fixes et les taux de cotisations / d'impôt sont gardés, dans le navigateur.
- Aucune statistique de visite, aucun traceur.
- L'ancien simulateur (version d'octobre 2025) reste en ligne en sauvegarde : `public/ancien/index.html`, servi à `/ancien/`.

## Développement

```bash
npm install
npm run dev     # site en local
npm test        # tests (Vitest)
npm run build   # site publié dans dist/
```

Le site Netlify est relié à la branche `main` : chaque commit sur `main` est mis en ligne (réglages dans `netlify.toml`).

## Carte du code

- `src/domain/planning.ts` : codes (J, N, J10, V24, CP, RF, RTT, RC), horaires, période, fériés légaux.
- `src/domain/tds12.ts` : planning 12 h de référence (un TDS annuel SSIAP 1 de CDG 2026-2027, en J/N seulement).
- `src/domain/cycle24.ts` : cycle 24/72 des 4 équipes.
- `src/domain/conges.ts` : pose des repos jusqu'à 1 501 h (même logique des deux côtés, voir plus bas).
- `src/domain/calcul.ts` : majorations heure par heure, semaines chargées, statistiques de repos.
- `src/domain/paie.ts` : taux (traitement de base ÷ 169), partie fixe, indemnité de CP au 1/10e, net.
- `src/domain/transport.ts` : coût et temps des trajets.
- `src/domain/simulation.ts` : assemble la comparaison.
- `src/import/payslip.ts`, `pdf.ts` : lecture de la fiche de paie (repris de l'application Planning SSIAP) ; `profilFiche.ts` : profil de paie.
- `src/domain/dates.ts`, `holidays.ts`, `echelons.ts` : repris de Planning SSIAP (fériés dont dimanche de Pâques, grilles 1B2 et 2B).
- `src/ui/` : une carte par étape (fiche de paie, trajets, résultat, calendrier, méthode, détail, partage).

## Règles appliquées

- Majorations (règlement 12.1.I, DG/2005/2199) : nuit 22 h à 6 h +75 %, dimanche +75 % sans cumul avec la nuit, férié +100 % exclusif et
  prioritaire ; dimanche de Pâques payé comme férié ; chaque heure rattachée à sa date réelle.
- Taux de majoration lus sur la fiche ; sans fiche, taux nominal = traitement de base ÷ 169 h (2 344,28 € → 13,87 € ; 2 333,22 € → 13,81 €), taux 75 % arrondi à 3 décimales.
- Semaines chargées (§ 3.1 et 3.3) : 40e à 42e heure +25 % du taux de base (traitement ÷ 151,67), 43e à 50e +25 %, au-delà +50 %.
- Indemnité de CP : 1/10e de la rémunération annuelle, majorations comprises.
- En 24 h, mêmes règles qu'en 12 h, comme sur la fiche SSLIA ci-dessous. Le règlement renvoie à des accords spécifiques pour le SSLIA et le SMU (H24).

## Pose des repos jusqu'à 1 501 h

Comme le font les agents : les repos sont posés sur les vacations qui rapportent le moins, en gardant au travail les dimanches et les fériés.
Droits à valeur égale en heures dans les deux plannings :

1. **CP** : 5 semaines = 35 jours × la part de jours travaillés (15 vacations de 12 h, 9 de 24 h). Congé principal d'été réduit au minimum
   pour avoir au moins 12 jours de repos d'affilée : 2 semaines en 12 h, 3 vacations de suite en juillet en 24 h. Le reste vacation par vacation.
2. **RF** : un par férié légal × 12 h (12 vacations de 12 h ou 6 de 24 h en 2026-2027), chacune après son férié.
3. **RTT** : 77 h en vacations entières (6 de 12 h ou 3 de 24 h), jamais un férié ; 5 h restent à poser en heures.
4. **Repos de cycle** : ce qu'il faut pour ne pas dépasser 1 501 h.

- 12 h : repos répartis régulièrement dans l'année, sur la vacation la moins rentable à ±10 jours (fériés et dimanches évités, nuits non).
- 24 h : on évite aussi de casser une semaine à 48 h, et chaque mois suit un profil de vacations travaillées (`PROFIL_24H` :
  5 5 4 4 5 5 / 5 6 5 6 6 6, d'avril à mars, soit 62 vacations et 1 488 h).

## Ce que montre une fiche de paie SSLIA en 24 h (août 2026)

Une vacation compte 24 h de travail (« 24 00 » dans les informations journalières) ; lignes « MAJ.75% S/HRS A 100 » (nuits et dimanches à +75 %),
« COMP. 25% S/HRS 100 » (semaines chargées à +25 %) et « FORF.HEURES COMPL. » (forfait d'environ 8,83 h par mois payées à 100 %, propre au SSLIA
qui travaille au-delà de 1 501 h). Le simulateur applique au 24 h SSIAP les mêmes majorations, sans forfait (les SSIAP restent à 1 501 h).
Les taux de majoration varient d'un agent à l'autre : ils sont lus sur la fiche ; sans fiche, estimés à traitement de base ÷ 169 h.
