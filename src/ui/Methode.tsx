import type { Bilan } from '../domain/conges'
import { blocsCP } from '../domain/conges'
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
        Les deux plannings respectent le contrat : <strong>1 501 h au plus</strong> sur la période du 1er avril {an} au 31 mars {an + 1}. On part du planning
        théorique (ton TDS annuel en 12 h, le cycle 24/72 en 24 h), puis on pose les mêmes droits des deux côtés, à valeur égale en heures.
      </p>
      <div className="tableau-defile">
        <table className="comparatif">
          <thead>
            <tr>
              <th />
              <th className="c12">12 h</th>
              <th className="c24">24 h</th>
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
                Congés payés <small>5 semaines (30 jours ouvrables)</small>
              </th>
              <td>{ligne(b12.cp.vacations, b12.cp.heures)}</td>
              <td>{ligne(b24.cp.vacations, b24.cp.heures)}</td>
            </tr>
            <tr>
              <th scope="row">
                Récup. fériés <small>{b12.rf.feries} fériés × 12 h</small>
              </th>
              <td>{ligne(b12.rf.vacations, b12.rf.heures)}</td>
              <td>{ligne(b24.rf.vacations, b24.rf.heures)}</td>
            </tr>
            <tr>
              <th scope="row">
                RTT <small>77 h, en vacations entières</small>
              </th>
              <td>{ligne(b12.rtt.vacations, b12.rtt.heures)}</td>
              <td>{ligne(b24.rtt.vacations, b24.rtt.heures)}</td>
            </tr>
            <tr>
              <th scope="row">
                Repos de cycle <small>pour ne pas dépasser 1 501 h</small>
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
          <strong>Congés payés</strong> : 30 jours ouvrables, c'est 5 semaines d'absence. Elles sont posées aux mêmes dates dans les deux plannings :{' '}
          {blocsCP(an)
            .map((b) => `${b.nom} (du ${date(b.du)} au ${date(b.au)})`)
            .join(', ')}
          . Toutes les vacations de ces semaines passent en CP.
        </li>
        <li>
          <strong>Récupérations de fériés</strong> : un RF vaut aujourd'hui une vacation de 12 h. On garde la même valeur en heures : {b12.rf.feries} RF = {heures(b12.rf.feries * 12)}, soit{' '}
          {b12.rf.vacations} vacations de 12 h ou {b24.rf.vacations} vacations de 24 h.
        </li>
        <li>
          <strong>RTT</strong> : 77 h, soit {b12.rtt.vacations} vacations de 12 h ou {b24.rtt.vacations} vacations de 24 h. Il reste {heures(b24.rtt.reste)} à poser en heures (début
          ou fin de vacation), non comptées ici. Jamais sur un jour férié.
        </li>
        <li>
          <strong>Repos de cycle</strong> : le cycle 24/72 compte bien plus d'heures que le TDS 12 h ({heures(b24.cycle.heures)} contre {heures(b12.cycle.heures)}). Pour ne pas
          dépasser 1 501 h, le planning 24 h prévoit {b24.rc.vacations} repos de plus, placés par le gestionnaire comme les repos d'un TDS (ce n'est pas un droit à poser). En 12 h,
          il en faut {b12.rc.vacations}.
        </li>
        <li>
          RF, RTT et repos de cycle sont répartis à intervalles réguliers dans l'année, sans viser ni éviter les dimanches et les fériés : aucun des deux plannings n'est avantagé.
          Les jours de bonification et le repos compensateur de nuit s'ajoutent selon les cas.
        </li>
      </ol>
    </div>
  )
}
