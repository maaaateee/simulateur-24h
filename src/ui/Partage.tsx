import { useState } from 'react'
import type { Simulation } from '../domain/simulation'
import { compter } from './compteur'
import { heures, signe } from './format'

const ADRESSE = 'https://simulateur-24h.netlify.app'

export function textePartage(sim: Simulation): string {
  const trajets = sim.c12.resultat.stats.vacations - sim.c24.resultat.stats.vacations
  return [
    '🔥 Ma simulation Projet 24h SSIAP',
    `💰 En 24 h : ${signe(sim.gainTotal)} par an dans ma poche (salaire ${signe(sim.gainNet)} net + trajets ${signe(sim.economieTrajets)})`,
    `🚗 ${trajets} allers-retours en moins, ${heures(sim.c12.transport.heures - sim.c24.transport.heures)} de route gagnées`,
    `🏖️ ${sim.c24.resultat.stats.reposLongs} repos de 3 jours ou plus, contre ${sim.c12.resultat.stats.reposLongs} en 12 h`,
    `👉 Fais la tienne : ${ADRESSE}`,
  ].join('\n')
}

export function Partage({ sim }: { sim: Simulation }) {
  const [copie, setCopie] = useState(false)
  const texte = textePartage(sim)
  const partager = async () => {
    compter('partage')
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Simulateur 24h SSIAP', text: texte })
        return
      } catch {
        // Partage annulé : on propose la copie.
      }
    }
    await navigator.clipboard?.writeText(texte)
    setCopie(true)
    setTimeout(() => setCopie(false), 2500)
  }
  return (
    <div className="partage">
      <button type="button" className="bouton principal" onClick={partager}>
        📤 Partager mon résultat
      </button>
      <a className="bouton whatsapp" href={`https://wa.me/?text=${encodeURIComponent(texte)}`} target="_blank" rel="noopener noreferrer" onClick={() => compter('partage')}>
        WhatsApp
      </a>
      {copie && <span className="etat ok">Texte copié : colle-le où tu veux.</span>}
    </div>
  )
}
