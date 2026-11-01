import type { Bilan } from '../domain/conges'
import { MOIS } from '../domain/dates'
import { heures } from './format'

const date = (d: string) => `${Number(d.slice(8))} ${MOIS[Number(d.slice(5, 7)) - 1]}`

export function Methode({ b12, b24, an }: { b12: Bilan; b24: Bilan; an: number }) {
  const ligne = (v: number, h: number, signe = '−') => (
    <>
      {signe}
      {v} vac. <small>({heures(h)})</small>
    </>
  )
  return (
    <div className="methode">
      <p>
        Les deux plannings respectent le contrat : <strong>1 501 h au plus</strong> du 1er avril {an} au 31 mars {an + 1}. On part du planning théorique (ton TDS annuel en 12 h, le
        cycle 24/72 en 24 h) et on pose les mêmes droits des deux côtés, à valeur égale en heures.
      </p>
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
                Congés payés <small>5 semaines, 30 jours ouvrables</small>
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
                RTT <small>77 h en vacations entières</small>
              </th>
              <td>{ligne(b12.rtt.vacations, b12.rtt.heures)}</td>
              <td>{ligne(b24.rtt.vacations, b24.rtt.heures)}</td>
            </tr>
            <tr>
              <th scope="row">
                Repos de cycle <small>pour rester sous 1 501 h</small>
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
      <ol className="etapes-methode">
        <li>
          <strong>Congés payés</strong> : 30 jours ouvrables, c'est 5 semaines d'absence, soit {b12.cp.vacations} vacations de 12 h ou {b24.cp.vacations} vacations de 24 h. Le
          congé principal d'été est réduit au minimum pour avoir au moins 12 jours de repos d'affilée : 2 semaines en 12 h ({b12.ete.vacations} vacations,{' '}
          {b12.ete.jours} jours de repos), 3 vacations de suite en 24 h (du {date(b24.ete.du)} au {date(b24.ete.au)}, {b24.ete.jours} jours de repos). Le reste est posé vacation
          par vacation dans l'année.
        </li>
        <li>
          <strong>Récupérations de fériés</strong> : une RF vaut aujourd'hui une vacation de 12 h. On garde la même valeur en heures : {b12.rf.feries} RF = {heures(b12.rf.feries * 12)},
          soit {b12.rf.vacations} vacations de 12 h ou {b24.rf.vacations} de 24 h. Une RF se prend après son férié.
        </li>
        <li>
          <strong>RTT</strong> : 77 h, soit {b12.rtt.vacations} vacations de 12 h ou {b24.rtt.vacations} de 24 h, jamais un jour férié. Il reste {heures(b24.rtt.reste)} à poser en
          heures, non comptées ici.
        </li>
        <li>
          <strong>Repos de cycle</strong> : le cycle 24/72 compte bien plus d'heures que le TDS 12 h ({heures(b24.cycle.heures)} contre {heures(b12.cycle.heures)}). Pour rester sous
          1 501 h, le planning 24 h prévoit {b24.rc.vacations} repos de plus, placés par le gestionnaire comme les repos d'un TDS. En 12 h, il en faut {b12.rc.vacations}.
        </li>
        <li>
          <strong>Comme le font les agents</strong>, les repos sont posés sur les vacations qui rapportent le moins : on garde au travail les dimanches et les fériés. En 12 h, les
          repos restent répartis régulièrement dans l'année. En 24 h, on évite aussi de casser une semaine à 48 h, et les mois comptent 4 à 5 vacations au printemps et en été, 5 à 6
          en automne et en hiver.
        </li>
      </ol>
    </div>
  )
}
