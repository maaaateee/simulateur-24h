# Simulateur 24h SSIAP : contexte pour Claude

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

## Retours de l'utilisateur (01/11/2026, soir)

- Design : thème **sombre par défaut**, bouton clair/sombre (`src/ui/Theme.tsx`, `simulateur-24h:theme`) ; pas de tiret cadratin ni demi-cadratin
  dans les textes. Couleurs des séries validées (daltonisme) : 12 h orange `#e8650f`, 24 h vert d'eau `#119e8f`, en clair comme en sombre.
- Trajet par défaut : 35 km, 50 min, 6 L/100, 2,30 €/L, 0,20 €/km (les anciennes valeurs enregistrées sont remplacées si non modifiées).
- Pose des repos comme le font les agents (voir README) : en 12 h, règles réelles de décompte des CP (principal ≥ 12 jours ouvrables,
  repos intermédiaires décomptés, 6 blocs de 3, RF/RTT par 2) ; en 24 h, droits en heures, congé d'été de 3 vacations, dimanches,
  fériés et semaines à 48 h gardés. Le 24 h travaille autant d'heures que le 12 h (`HEURES_EGALES`), pour que le gain ne vienne pas
  d'un surplus de travail (décision expliquée à l'utilisateur le 01/11/2026).
- Interface : explications dans des bulles « i » (`Info`) et des blocs dépliables (`Repli`) ; ligne « week-ends libres » retirée
  à la demande de l'utilisateur ; version ordinateur à partir de 1 100 px (saisie à gauche, résultat à droite, calendrier sur 4 colonnes).
- Fiche SSLIA en 24 h : mêmes lignes MAJ.75% et COMP. 25 % que les SSIAP, vacation comptée 24 h, plus un forfait d'heures complémentaires.
  Les taux sont propres à chaque agent : on lit ceux de la fiche (traitement ÷ 169 seulement à défaut).

## Retours de l'utilisateur (01/11/2026, nuit)

- 12 h : tous les CP et toutes les RF posés, une partie des RTT gardée (`RTT_POSEES_12H` = 3) pour rester plus près de 1 501 h ;
  jours de repos d'une période de CP affichés en CP hachuré (`CPR`, décomptés sauf dimanche et férié).
- 24 h : un CP = une vacation (le congé d'été de 3 vacations = 3 CP) ; contingents d'un pompier SSLIA à 1 656 h : 8,5 CP, 11 RTT, 3 RF,
  donc plus de CP et de RTT pour les SSIAP à 1 501 h, dans la même proportion. Plus de « repos de cycle ».
- Le « brut par mois » est bien le brut (traitement, ancienneté, assiduité, 13e mois, supplément familial, IDT, majorations) : détail en bulle,
  part des majorations et net estimé affichés sous chaque carte du face-à-face.
- Paragraphe sur la fiche SSLIA retiré de l'application (c'était une vérification).

## Retours de l'utilisateur (01/11/2026, fin de soirée)

- Face-à-face : **net par mois en gros**, brut et majorations en petit, détail brut → net dans la bulle.
- 12 h au plus près de 1 501 h : tous les CP, puis RF et RTT juste assez pour ne pas dépasser 1 501 h (1 496 h en 2026-2027) ;
  24 h au même nombre d'heures, sous 1 501 h (1 488 h).
- Plannings : contingents de repos (CP, RTT, RF : droit, posé, reste ; RC nuit acquis), comme dans Planning SSIAP.
- Les agents ne voyaient pas qu'on pouvait passer du planning 24 h au 12 h : grands onglets pleine largeur, l'autre onglet clignote
  (pointillés, halo) avec « Touche pour afficher » tant qu'il n'a jamais été ouvert (`simulateur-24h:bascule`).
