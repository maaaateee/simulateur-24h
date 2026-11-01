import { EQUIPES } from '../domain/planning'
import type { Reglages, Simulation } from '../domain/simulation'
import { Choix, Interrupteur } from './Champs'
import { euros, heures, nombre, signe } from './format'

export function Resultat({ sim, reglages, onReglages }: { sim: Simulation; reglages: Reglages; onReglages: (r: Reglages) => void }) {
  const { c12, c24 } = sim
  const s12 = c12.resultat.stats
  const s24 = c24.resultat.stats
  const min = Math.min(...sim.parEquipe)
  const max = Math.max(...sim.parEquipe)
  const set = (part: Partial<Reglages>) => onReglages({ ...reglages, ...part })
  const lignes: { label: string; a: string; b: string; mieux?: 'a' | 'b' }[] = [
    { label: 'Salaire brut moyen par mois', a: euros(c12.brutMensuel), b: euros(c24.brutMensuel), mieux: c24.brutMensuel > c12.brutMensuel ? 'b' : 'a' },
    { label: 'Majorations sur l’année', a: euros(c12.resultat.montants.total), b: euros(c24.resultat.montants.total), mieux: 'b' },
    { label: 'Vacations = allers-retours', a: String(s12.vacations), b: String(s24.vacations), mieux: 'b' },
    { label: 'Heures travaillées (max. 1 501 h)', a: heures(s12.heures), b: heures(s24.heures) },
    { label: 'Temps passé sur la route', a: heures(c12.transport.heures), b: heures(c24.transport.heures), mieux: 'b' },
    { label: 'Coût des trajets', a: euros(c12.transport.total), b: euros(c24.transport.total), mieux: 'b' },
    { label: 'Week-ends entièrement libres', a: String(s12.weekendsLibres), b: String(s24.weekendsLibres), mieux: s24.weekendsLibres >= s12.weekendsLibres ? 'b' : 'a' },
    { label: 'Repos de 3 jours ou plus', a: String(s12.reposLongs), b: String(s24.reposLongs), mieux: s24.reposLongs >= s12.reposLongs ? 'b' : 'a' },
    { label: 'Plus longue période de repos', a: `${s12.plusLongRepos} jours`, b: `${s24.plusLongRepos} jours` },
    { label: 'Repos compensateur de nuit gagné', a: `${nombre(s12.rcNuit)} h`, b: `${nombre(s24.rcNuit)} h` },
  ]

  return (
    <div className="resultat">
      <div className="gros-chiffre">
        <span className="gros-label">Ce que le 24 h te rapporterait, net, sur un an</span>
        <strong className={sim.gainTotal >= 0 ? 'positif' : 'negatif'}>{signe(sim.gainTotal)}</strong>
        <span className="gros-sous">soit {signe(sim.gainTotal / 12)} par mois, dans ta poche</span>
      </div>

      <div className="tuiles">
        <div className="tuile">
          <span>💶 Salaire</span>
          <strong>{signe(sim.gainNet)}</strong>
          <small>net par an ({signe(sim.gainBrut)} brut)</small>
        </div>
        <div className="tuile">
          <span>🚗 Trajets</span>
          <strong>{signe(sim.economieTrajets)}</strong>
          <small>d'essence, d'usure et de péage en moins</small>
        </div>
        <div className="tuile">
          <span>🕒 Temps</span>
          <strong>{heures(c12.transport.heures - c24.transport.heures)}</strong>
          <small>de route en moins ({s12.vacations - s24.vacations} allers-retours)</small>
        </div>
        <div className="tuile">
          <span>🌱 CO₂</span>
          <strong>{nombre(Math.round((c12.transport.co2 - c24.transport.co2) / 10) / 100)} t</strong>
          <small>de CO₂ en moins par an</small>
        </div>
      </div>

      <div className="reglages">
        <div className="reglage">
          <span className="champ-label">Ton équipe en 24 h</span>
          <Choix label="Équipe" value={reglages.equipe} options={EQUIPES.map((e, i) => ({ value: i, label: e }))} onChange={(equipe) => set({ equipe })} />
          <small>
            Selon l'équipe, les fériés et les dimanches ne tombent pas pareil : de {signe(min)} à {signe(max)} par an.
          </small>
        </div>
        <div className="reglage">
          <span className="champ-label">Heure de début et de fin de la vacation de 24 h</span>
          <Choix
            label="Horaires"
            value={reglages.debut24}
            options={[6, 7, 8, 12].map((h) => ({ value: h, label: `${h} h` }))}
            onChange={(debut24) => set({ debut24 })}
          />
          <small>De {reglages.debut24} h à {reglages.debut24} h le lendemain. 7 h comme au SSLIA ; les horaires seraient choisis par un vote si la Direction laisse le choix.</small>
        </div>
      </div>

      <div className="tableau-defile">
        <table className="comparatif">
          <thead>
            <tr>
              <th />
              <th className="c12">12 h actuel</th>
              <th className="c24">24 h proposé</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.label}>
                <th scope="row">{l.label}</th>
                <td className={l.mieux === 'a' ? 'mieux' : ''}>{l.a}</td>
                <td className={l.mieux === 'b' ? 'mieux' : ''}>{l.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hypotheses">
        <Interrupteur
          checked={reglages.semainesChargees}
          onChange={(semainesChargees) => set({ semainesChargees })}
          aide="+25 % de la 40e à la 50e heure d'une semaine, dans les deux plannings (semaines à 48 h en 24 h)."
        >
          Compter les semaines chargées
        </Interrupteur>
        <Interrupteur
          checked={reglages.indemniteCp}
          onChange={(indemniteCp) => set({ indemniteCp })}
          aide="L'indemnité de congés payés vaut 1/10e de ce que tu as gagné dans l'année, majorations comprises."
        >
          Compter l'effet sur l'indemnité de congés payés
        </Interrupteur>
      </div>
    </div>
  )
}
