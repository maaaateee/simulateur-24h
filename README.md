# Simulateur 24h SSIAP

Simulateur en ligne du **Projet 24h SSIAP** (agents SSIAP d'ADP, CDG et Orly) : <https://simulateur-24h.netlify.app>.

Il compare, sur une période de modulation complète (1er avril → 31 mars) à **1 501 h au plus**, le rythme actuel en 12 h et le cycle 24/72 proposé :
salaire (majorations), trajets (coût, temps, CO₂) et repos (week-ends libres, repos longs).

- La fiche de paie ADP (PDF) est lue **sur l'appareil** (pdf.js, texte natif) : rien n'est envoyé. Seuls l'échelon, le traitement de base,
  l'ancienneté, les taux de majoration, les éléments fixes et les taux de cotisations / d'impôt sont gardés, dans le navigateur.
- Mesure d'audience anonyme et maison (`netlify/functions/compteur.mjs`, Netlify Blobs) : seulement des noms d'événements
  (visite, nouveau visiteur, téléphone ou ordinateur, fiche importée, partage, passage au planning 12 h), un par clé, sans
  aucune donnée ni identifiant. Désactivable en bas de page. Statistiques : `/api/stats?cle=…` (variable Netlify `STATS_CLE`).
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

## Pose des repos sur l'année

Comme le font les agents : des blocs de vacations pour de longues périodes de repos, en gardant au travail les dimanches et les fériés.

**12 h, règles ADP actuelles (PDG/2020/0607)** : CP décomptés en jours ouvrables (lundi → samedi hors fériés), du premier jour d'absence
à la dernière vacation non effectuée ; les repos entre deux vacations posées comptent (code `CPR`, hachuré), jamais les dimanches ni les fériés.
- Congé principal d'été : la période d'au moins 12 jours ouvrables, en juillet-août, qui libère le plus de vacations.
- Solde de 18 jours en 6 fractions au plus : 6 blocs de 3 vacations de suite.
- RF (après leur férié) et RTT (jamais un férié) : blocs de 2 vacations (2 repos accolés au plus).
- Tous les CP ; RF et RTT juste assez pour approcher 1 501 h sans les dépasser (le reste est gardé). 2026-2027 : 5 RF, 2 vacations
  de RTT, 125 vacations, 1 496 h.

**24 h (règles à négocier)** : un CP = une vacation de 24 h, les repos entre les vacations ne sont pas décomptés. Congé d'été de
3 vacations de suite (3 CP, 14 jours de repos). Répartition inspirée du SSLIA (8,5 CP, 11 RTT, 3 RF pour 1 656 h, constante `SSLIA`) :
3 RF, le reste en CP et RTT dans la proportion 8,5 / 11. Le 24 h travaille **autant d'heures que le 12 h** (`HEURES_EGALES` dans
`simulation.ts`), à une vacation près et jamais plus de 1 501 h : 62 vacations, 1 488 h (12 CP, 15 RTT, 3 RF). Mois répartis par
`profil24h` ; on garde dimanches, fériés et semaines à 48 h.

**Contingents** (`src/domain/contingents.ts`) : droit, posé et reste de chaque repos, relus sur le planning affiché (suivent les modifications).

## Ce que montre une fiche de paie SSLIA en 24 h (août 2026)

Une vacation compte 24 h de travail (« 24 00 » dans les informations journalières) ; lignes « MAJ.75% S/HRS A 100 » (nuits et dimanches à +75 %),
« COMP. 25% S/HRS 100 » (semaines chargées à +25 %) et « FORF.HEURES COMPL. » (forfait d'environ 8,83 h par mois payées à 100 %, propre au SSLIA
qui travaille au-delà de 1 501 h). Le simulateur applique au 24 h SSIAP les mêmes majorations, sans forfait (les SSIAP restent à 1 501 h).
Les taux de majoration varient d'un agent à l'autre : ils sont lus sur la fiche ; sans fiche, estimés à traitement de base ÷ 169 h.
