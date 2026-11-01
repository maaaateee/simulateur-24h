// Coût et temps des trajets domicile-travail : un aller-retour par vacation.

export interface Trajet {
  /** Distance d'un aller (km). */
  distance: number
  /** Durée d'un aller (minutes). */
  minutes: number
  /** Consommation (L/100 km). */
  conso: number
  /** Prix du carburant (€/L). */
  prix: number
  /** Entretien, usure et dépréciation du véhicule (€/km). */
  entretien: number
  /** Péage d'un aller (€). */
  peage: number
}

export interface CoutTrajets {
  allersRetours: number
  km: number
  litres: number
  carburant: number
  entretien: number
  peage: number
  total: number
  heures: number
  /** CO₂ émis (kg) : environ 2,4 kg par litre de carburant brûlé (moyenne essence / gazole, ADEME). */
  co2: number
}

export const TRAJET_PAR_DEFAUT: Trajet = { distance: 40, minutes: 50, conso: 6.5, prix: 1.75, entretien: 0.15, peage: 0 }

export function coutTrajets(allersRetours: number, t: Trajet): CoutTrajets {
  const km = allersRetours * t.distance * 2
  const litres = (km / 100) * t.conso
  const carburant = litres * t.prix
  const entretien = km * t.entretien
  const peage = allersRetours * t.peage * 2
  return {
    allersRetours,
    km,
    litres,
    carburant,
    entretien,
    peage,
    total: carburant + entretien + peage,
    heures: (allersRetours * t.minutes * 2) / 60,
    co2: litres * 2.4,
  }
}
