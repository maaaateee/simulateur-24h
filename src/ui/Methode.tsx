import type { Bilan } from '../domain/conges'
import { MOIS } from '../domain/dates'
import { heures } from './format'

const date = (d: string) => `${Number(d.slice(8))} ${MOIS[Number(d.slice(5, 7)) - 1]}`

export function Methode({ b12, b24, an }: { b12: Bilan; b24: Bilan; an: number }) {
  const ligne = (v: number, h: number, signe = '−') =>
    v === 0 && signe ? (
      <small>aucun</small>
    ) : (
      <>
        {signe}
        {v} vac. <small>({heures(h)})</small>
      </>
    )
  return (
    <div className="methode">
      <div className="tableau-defile">
        <table className="comparatif">
          <thead>
            <tr>
              <th />
              <th>
                <i className="s12" /> 12 h
              </th>
              <th>
                <i className="s24" /> 24 h
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Planning théorique</th>
              <td>{ligne(b12.cycle.vacations, b12.cycle.heures, '')}</td>
              <td>{ligne(b24.cycle.vacations, b24.cycle.heures, '')}</td>
            </tr>
            <tr>
              <th scope="row">
                Congés payés <small>30 jours ouvrables</small>
              </th>
              <td>{ligne(b12.cp.vacations, b12.cp.heures)}</td>
              <td>{ligne(b24.cp.vacations, b24.cp.heures)}</td>
            </tr>
            <tr>
              <th scope="row">
                Récup. de fériés <small>{b12.rf.feries} fériés × 12 h</small>
              </th>
              <td>{ligne(b12.rf.vacations, b12.rf.heures)}</td>
              <td>{ligne(b24.rf.vacations, b24.rf.heures)}</td>
            </tr>
            <tr>
              <th scope="row">
                RTT <small>77 h</small>
              </th>
              <td>{ligne(b12.rtt.vacations, b12.rtt.heures)}</td>
              <td>{ligne(b24.rtt.vacations, b24.rtt.heures)}</td>
            </tr>
            <tr>
              <th scope="row">
                Repos de cycle <small>placés par le gestionnaire</small>
              </th>
              <td>{ligne(b12.rc.vacations, b12.rc.heures)}</td>
              <td>{ligne(b24.rc.vacations, b24.rc.heures)}</td>
            </tr>
            <tr className="total">
              <th scope="row">Travaillé</th>
              <td>{ligne(b12.final.vacations, b12.final.heures, '')}</td>
              <td>{ligne(b24.final.vacations, b24.final.heures, '')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>
        <i className="s12" /> En 12 h : les règles d'aujourd'hui, utilisées comme le font les agents
      </h3>
      <ul className="etapes-methode">
        <li>
          Les CP se décomptent en jours ouvrables, du premier jour d'absence à la dernière vacation non effectuée : les repos entre deux vacations posées comptent, jamais les
          dimanches ni les fériés.
        </li>
        <li>
          Congé principal du {date(b12.ete.du)} au {date(b12.ete.au)} : {b12.ete.ouvrables} jours ouvrables décomptés (le minimum est 12), {b12.ete.vacations} vacations
          libérées, {b12.ete.jours} jours de repos d'affilée.
        </li>
        <li>Les 18 autres jours de CP en 6 blocs de 3 vacations de suite, les RF et les RTT en blocs de 2 (2 repos accolés au plus).</li>
        <li>Les blocs évitent les dimanches et les fériés, qui rapportent le plus, et une RF se prend après son férié.</li>
      </ul>

      <h3>
        <i className="s24" /> En 24 h : les mêmes droits, comptés en heures
      </h3>
      <ul className="etapes-methode">
        <li>
          <strong>Même volume de repos que le 12 h</strong> : le 24 h travaille autant d'heures ({heures(b24.final.heures)} contre {heures(b12.final.heures)}, à une vacation près).
          Le gain vient donc du rythme, pas d'un surplus de travail.
        </li>
        <li>
          Congé d'été : 3 vacations de suite (72 h, la valeur de 12 jours ouvrables en 12 h), du {date(b24.ete.du)} au {date(b24.ete.au)}, soit {b24.ete.jours} jours de repos
          d'affilée.
        </li>
        <li>
          RF : {b24.rf.feries} × 12 h = {b24.rf.vacations} vacations. RTT : 77 h = {b24.rtt.vacations} vacations (il reste {heures(b24.rtt.reste)} à poser en heures). Le reste en
          repos de cycle.
        </li>
        <li>On garde au travail les dimanches, les fériés et les semaines à 48 h ; les mois comptent un peu moins de vacations au printemps et en été.</li>
      </ul>
      <p className="note">
        Période du 1er avril {an} au 31 mars {an + 1}. Les jours de bonification et le repos compensateur de nuit s'ajoutent selon les cas.
      </p>
    </div>
  )
}
