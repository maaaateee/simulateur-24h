import { SSLIA, type Bilan } from '../domain/conges'
import { MOIS } from '../domain/dates'
import { heures, nombre } from './format'

const date = (d: string) => `${Number(d.slice(8))} ${MOIS[Number(d.slice(5, 7)) - 1]}`

export function Methode({ b12, b24, an }: { b12: Bilan; b24: Bilan; an: number }) {
  const ligne = (v: number, h: number, signe = '−', note?: string) =>
    v === 0 && signe ? (
      <small>aucun</small>
    ) : (
      <>
        {signe}
        {v} vac. <small>({heures(h)})</small>
        {note && <small className="sous-note">{note}</small>}
      </>
    )
  const avecRc = b12.rc.vacations > 0 || b24.rc.vacations > 0
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
              <th scope="row">Congés payés</th>
              <td>{ligne(b12.cp.vacations, b12.cp.heures, '−', `${b12.cp.jours} jours ouvrables`)}</td>
              <td>{ligne(b24.cp.vacations, b24.cp.heures, '−', `${b24.cp.vacations} CP`)}</td>
            </tr>
            <tr>
              <th scope="row">Récup. de fériés</th>
              <td>{ligne(b12.rf.vacations, b12.rf.heures)}</td>
              <td>{ligne(b24.rf.vacations, b24.rf.heures)}</td>
            </tr>
            <tr>
              <th scope="row">RTT</th>
              <td>{ligne(b12.rtt.vacations, b12.rtt.heures, '−', b12.rtt.reste > 0 ? `${heures(b12.rtt.reste)} gardées` : undefined)}</td>
              <td>{ligne(b24.rtt.vacations, b24.rtt.heures)}</td>
            </tr>
            {avecRc && (
              <tr>
                <th scope="row">Repos de cycle</th>
                <td>{ligne(b12.rc.vacations, b12.rc.heures)}</td>
                <td>{ligne(b24.rc.vacations, b24.rc.heures)}</td>
              </tr>
            )}
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
          Les CP se décomptent en jours ouvrables, du premier jour d'absence à la dernière vacation non effectuée : <strong>les jours de repos au milieu sont décomptés</strong>{' '}
          (hachurés dans le calendrier), jamais les dimanches ni les fériés.
        </li>
        <li>
          Congé principal du {date(b12.ete.du)} au {date(b12.ete.au)} : {b12.ete.ouvrables} jours ouvrables (le minimum est 12), dont {b12.ete.reposDecomptes} jours de repos
          décomptés, pour {b12.ete.vacations} vacations libérées.
        </li>
        <li>Les 18 autres jours de CP en 6 blocs de 3 vacations de suite ; les RF et les RTT en blocs de 2 (2 repos accolés au plus), après le férié pour une RF.</li>
        <li>
          Tous les CP et toutes les RF sont posés, mais seulement {b12.rtt.vacations} vacations de RTT sur 6 : {heures(b12.rtt.reste)} de RTT sont gardées. Les dimanches et les
          fériés restent travaillés.
        </li>
      </ul>

      <h3>
        <i className="s24" /> En 24 h : un CP = une vacation, les repos au milieu ne sont pas décomptés
      </h3>
      <ul className="etapes-methode">
        <li>
          Congé d'été : 3 vacations de suite = 3 CP, du {date(b24.ete.du)} au {date(b24.ete.au)}, soit {b24.ete.jours} jours de repos d'affilée.
        </li>
        <li>
          Répartition inspirée du SSLIA ({nombre(SSLIA.cp)} CP, {SSLIA.rtt} RTT, {SSLIA.rf} RF pour 1 656 h par an), avec plus de CP et de RTT puisque nous restons à 1 501 h au
          plus : {b24.cp.vacations} CP, {b24.rtt.vacations} RTT, {b24.rf.vacations} RF.
        </li>
        <li>
          <strong>Même volume de repos que le 12 h</strong> : {heures(b24.final.heures)} contre {heures(b12.final.heures)}, à une vacation près. Le gain vient du rythme, pas d'un
          surplus de travail.
        </li>
        <li>On garde au travail les dimanches, les fériés et les semaines à 48 h ; un peu moins de vacations au printemps et en été.</li>
      </ul>
      <p className="note">
        Période du 1er avril {an} au 31 mars {an + 1}. Le repos compensateur de nuit, le repos Stoléru et les jours de bonification ne sont pas posés : ils dépendent de chacun.
      </p>
    </div>
  )
}
