import type { Trajet } from '../domain/transport'
import { Nombre } from './Champs'

export function Trajets({ trajet, onChange }: { trajet: Trajet; onChange: (t: Trajet) => void }) {
  const set = (part: Partial<Trajet>) => onChange({ ...trajet, ...part })
  return (
    <div className="grille-champs">
      <Nombre label="🛣️ Distance (aller)" value={trajet.distance} suffixe="km" onChange={(v) => set({ distance: v })} />
      <Nombre label="⏱️ Temps de trajet (aller)" value={trajet.minutes} suffixe="min" onChange={(v) => set({ minutes: v })} />
      <Nombre label="⛽ Consommation" value={trajet.conso} step={0.1} suffixe="L/100" onChange={(v) => set({ conso: v })} aide="0 si tu viens en transports en commun" />
      <Nombre label="💶 Prix du carburant" value={trajet.prix} step={0.01} suffixe="€/L" onChange={(v) => set({ prix: v })} />
      <Nombre label="🔧 Entretien et usure" value={trajet.entretien} step={0.01} suffixe="€/km" onChange={(v) => set({ entretien: v })} aide="Pneus, vidanges, freins, décote : 0,10 à 0,25 €/km" />
      <Nombre label="🚧 Péage (aller)" value={trajet.peage} step={0.1} suffixe="€" onChange={(v) => set({ peage: v })} />
    </div>
  )
}
