// Grilles de rémunération SSIAP (accord 2025 de refonte des grilles, glossaires 1B2 et 2B).
// Échelons numérotés de 5 en 5, inter-échelons entre deux. Un inter-échelon est garanti chaque année
// à la date anniversaire du précédent ; un échelon complet arrive en moyenne tous les 38 mois.

export type Qualification = 'SSIAP1' | 'SSIAP2'

const ligne = (base: number, valeurs: number[]) => Object.fromEntries(valeurs.map((v, i) => [`${base + i * 5}S`, v]))

export const GRILLES: Record<Qualification, { nom: string; categorie: string; icpl: number; traitement: Record<string, number> }> = {
  SSIAP1: {
    nom: 'Agent SSIAP 1',
    categorie: 'Exécution principale (1B2)',
    icpl: 1500,
    traitement: {
      ...ligne(100, [2058.24, 2115.46, 2155.38, 2260.99, 2322.16, 2380.41, 2429.93, 2482.71, 2538.67, 2595.95, 2654.42]),
      ...ligne(101, [2069.16, 2122.92, 2175.31, 2272.63, 2333.22, 2389.86, 2440.04, 2493.9, 2550.12, 2607.64]),
      ...ligne(102, [2080.09, 2130.39, 2195.24, 2284.27, 2344.28, 2399.32, 2450.15, 2505.09, 2561.58, 2619.33]),
      ...ligne(103, [2091.01, 2137.85, 2215.18, 2295.91, 2355.33, 2408.78, 2460.26, 2516.28, 2573.03, 2631.03]),
      ...ligne(104, [2101.94, 2145.32, 2235.11, 2307.55, 2366.39, 2418.24, 2470.37, 2527.48, 2584.49, 2642.72]),
    },
  },
  SSIAP2: {
    nom: "Chef d'équipe SSIAP 2",
    categorie: 'Maîtrise (2B)',
    icpl: 1750,
    traitement: {
      ...ligne(200, [2214.91, 2279.72, 2347.68, 2470.53, 2594.95, 2727.66, 2866.87, 3008.42, 3167.29, 3333.89, 3508.99, 3621.61, 3737.6, 3857.42, 3981.2, 4109.06]),
      ...ligne(201, [2226.5, 2291.87, 2370.74, 2493.8, 2619.78, 2753.7, 2893.29, 3038.22, 3198.53, 3366.73, 3531.52, 3644.81, 3761.56, 3882.18, 4006.77]),
      ...ligne(202, [2238.09, 2304.02, 2393.8, 2517.06, 2644.61, 2779.75, 2919.72, 3068.01, 3229.77, 3399.56, 3554.04, 3668.0, 3785.53, 3906.93, 4032.34]),
      ...ligne(203, [2249.68, 2316.17, 2416.85, 2540.33, 2669.44, 2805.79, 2946.14, 3097.8, 3261.01, 3432.4, 3576.56, 3691.2, 3809.49, 3931.69, 4057.91]),
      ...ligne(204, [2261.27, 2328.33, 2439.91, 2563.6, 2694.27, 2831.84, 2972.57, 3127.59, 3292.25, 3465.24, 3599.09, 3714.4, 3833.46, 3956.44, 4083.48]),
    },
  },
}

const num = (e: string) => Number(e.replace(/\D/g, ''))

/** Échelons de la grille, dans l'ordre (100S, 101S, … 150S). */
export function echelonsDe(q: Qualification): string[] {
  return Object.keys(GRILLES[q].traitement).sort((a, b) => num(a) - num(b))
}

export const estEchelonComplet = (e: string) => num(e) % 5 === 0

export interface Avancement {
  actuel: { echelon: string; traitement?: number }
  /** Prochain inter-échelon garanti, un an après le dernier changement. */
  prochain?: { echelon: string; traitement: number; date: string; gain: number }
  /** Échelon complet visé (selon l'entretien annuel, en moyenne tous les 38 mois). */
  completSuivant?: { echelon: string; traitement: number }
}

/** `dateDernier` au format "YYYY-MM". */
export function avancement(q: Qualification, echelon: string, dateDernier?: string): Avancement {
  const liste = echelonsDe(q)
  const g = GRILLES[q].traitement
  const i = liste.indexOf(echelon)
  const res: Avancement = { actuel: { echelon, traitement: g[echelon] } }
  if (i < 0) return res
  const suivant = liste[i + 1]
  if (suivant && dateDernier) {
    const [y, m] = dateDernier.split('-').map(Number)
    res.prochain = { echelon: suivant, traitement: g[suivant], date: `${y + 1}-${String(m).padStart(2, '0')}`, gain: Math.round((g[suivant] - g[echelon]) * 100) / 100 }
  }
  const complet = liste.slice(i + 1).find(estEchelonComplet)
  if (complet) res.completSuivant = { echelon: complet, traitement: g[complet] }
  return res
}

/** Échelon attendu à une date donnée, en ne comptant que les inter-échelons garantis (un par an). */
export function echelonAttendu(q: Qualification, echelon: string, dateDernier: string, le: string): string {
  const liste = echelonsDe(q)
  const [y0, m0] = dateDernier.split('-').map(Number)
  const [y1, m1] = le.split('-').map(Number)
  const ans = Math.floor((y1 * 12 + m1 - (y0 * 12 + m0)) / 12)
  const i = liste.indexOf(echelon)
  return i < 0 ? echelon : liste[Math.min(liste.length - 1, i + Math.max(0, ans))]
}
