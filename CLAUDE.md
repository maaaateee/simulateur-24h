# Simulateur 24h SSIAP — contexte pour Claude

Réponds en français, en tutoyant l'utilisateur (agent SSIAP 1 d'ADP, porteur du Projet 24h) ; il n'est pas développeur : explique simplement, propose, puis fais.

- Dépôt **public** : n'y mets **jamais** de donnée personnelle (fiche de paie, nom, matricule, montants réels d'un agent). Les tests utilisent
  une fiche **fictive**. Les vrais PDF de test vont dans `dev-fixtures/` (ignoré par Git).
- En ligne : https://simulateur-24h.netlify.app (site Netlify `simulateur-24h`, id 00ea77e7-c022-482e-add8-f44c10d462fd), relié à `main` :
  un commit sur `main` = mise en ligne. Travailler sur une branche et ne fusionner qu'après accord de l'utilisateur.
- Stack : Vite + React + TypeScript, tests Vitest (`npm test`), `npm run build`.
- Les règles ADP et le lecteur de fiche viennent de l'application privée Planning SSIAP (maaaateee/planning-ssiap) : garder les deux cohérents.
- Voir README.md pour la carte du code, les règles et la méthode de pose des repos jusqu'à 1 501 h.

## Décisions de l'utilisateur (01/11/2026)

- Horaires 24 h : inconnus ; le SSLIA travaille de 7 h à 7 h (valeur par défaut). Vote prévu entre 6 h, 7 h, 8 h et 12 h si la Direction laisse le choix.
- Règles de majoration en 24 h : inconnues → hypothèse « mêmes règles qu'en 12 h », affichée comme telle.
- Planning 12 h : le TDS annuel 2026-2027 de l'agent (J/N seulement), avec repos posés pour rester ≤ 1 501 h.
- IDT, indemnités kilométriques : éléments fixes, comme dans Planning (même montant en 12 h et en 24 h).
- Sondage : « 92 % » est le chiffre à utiliser (minimum, les nouvelles recrues sont favorables).
- Microsoft Clarity retiré (il aurait pu enregistrer les montants affichés).
