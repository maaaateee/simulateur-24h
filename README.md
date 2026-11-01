# Simulateur 24h SSIAP

Simulateur en ligne du **Projet 24h SSIAP** (agents SSIAP d'ADP, CDG et Orly) : <https://simulateur-24h.netlify.app>.

Il compare, sur une période de modulation complète (1er avril → 31 mars) à **1 501 h au plus**, le rythme actuel en 12 h et le cycle 24/72 proposé :
salaire (majorations), trajets (coût, temps, CO₂) et repos (week-ends libres, repos longs).

- La fiche de paie ADP (PDF) est lue **sur l'appareil** (pdf.js, texte natif) : rien n'est envoyé. Seuls l'échelon, le traitement de base,
  l'ancienneté, les taux de majoration, les éléments fixes et les taux de cotisations / d'impôt sont gardés, dans le navigateur.
- Aucune statistique de visite, aucun traceur.

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

- Majorations (règlement 12.1.I, DG/2005/2199) : nuit 22 h – 6 h +75 %, dimanche +75 % sans cumul avec la nuit, férié +100 % exclusif et
  prioritaire ; dimanche de Pâques payé comme férié ; chaque heure rattachée à sa date réelle.
- Taux nominal = traitement de base ÷ 169 h (2 344,28 € → 13,87 € ; 2 333,22 € → 13,81 €) ; taux 75 % arrondi à 3 décimales.
- Semaines chargées (§ 3.1 et 3.3) : 40e à 42e heure +25 % du taux de base (traitement ÷ 151,67), 43e à 50e +25 %, au-delà +50 %.
- Indemnité de CP : 1/10e de la rémunération annuelle, majorations comprises.
- **Hypothèse** : en 24 h, mêmes règles qu'en 12 h. Le règlement renvoie à des accords spécifiques pour le SSLIA et le SMU (H24).

## Pose des repos jusqu'à 1 501 h

Même méthode en 12 h et en 24 h, droits à valeur égale en heures :

1. **CP** : 5 semaines (30 jours ouvrables), aux mêmes dates des deux côtés (3 semaines à partir du 2e lundi de juillet environ, semaine de
   Noël, une semaine mi-février). Toutes les vacations de ces semaines passent en CP.
2. **RF** : un par férié légal de la période × 12 h (12 vacations de 12 h ou 6 de 24 h en 2026-2027).
3. **RTT** : 77 h en vacations entières (6 de 12 h ou 3 de 24 h), jamais un férié ; 5 h restent à poser en heures.
4. **Repos de cycle** : juste ce qu'il faut pour ne pas dépasser 1 501 h (11 à 12 en 24 h, 1 en 12 h).

RF, RTT et repos de cycle sont répartis à intervalles réguliers, sans viser ni éviter dimanches et fériés.
Résultat 2026-2027 : 12 h → 125 vacations, 1 496 h ; 24 h → 62 vacations, 1 488 h (chaque équipe).
