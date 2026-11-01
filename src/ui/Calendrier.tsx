import { useState } from 'react'
import { daysInMonth, JOURS, modulationMonths, MOIS, toISO, weekday, type ISODate } from '../domain/dates'
import { holidayName } from '../domain/holidays'
import { HEURES_CONTRAT, type Code, type Planning, type Regime } from '../domain/planning'
import type { Mois } from '../domain/calcul'
import { euros, heures } from './format'

export const LIBELLES: Record<Code, string> = {
  J: 'Jour 6 h → 18 h',
  N: 'Nuit 18 h → 6 h',
  J10: 'Jour 6 h → 16 h',
  V24: 'Vacation de 24 h',
  CP: 'Congé payé',
  RF: 'Récupération de jour férié',
  RTT: 'RTT',
  RC: 'Repos de cycle',
}

const COURT: Record<Code, string> = { J: 'J', N: 'N', J10: 'J', V24: '24', CP: 'CP', RF: 'RF', RTT: 'RT', RC: 'RC' }

const ORDRE: Record<Regime, (Code | 'R')[]> = {
  '12h': ['R', 'J', 'N', 'CP', 'RF', 'RTT', 'RC'],
  '24h': ['R', 'V24', 'CP', 'RF', 'RTT', 'RC'],
}

/** Code suivant quand on touche un jour en mode modification. */
export function codeSuivant(regime: Regime, actuel: Code | undefined): Code | 'R' {
  const ordre = ORDRE[regime]
  const i = ordre.indexOf(actuel ?? 'R')
  return ordre[(i + 1) % ordre.length]
}

export function Calendrier(props: {
  regime: Regime
  an: number
  planning: Planning
  auto: Planning
  parMois: Record<string, Mois>
  heuresTotal: number
  debut24: number
  onChange: (date: ISODate, code: Code | 'R') => void
  onRetablir: () => void
  modifie: boolean
}) {
  const [edition, setEdition] = useState(false)
  const [choisi, setChoisi] = useState<ISODate | null>(null)
  const { planning, regime } = props
  const libelle = (c: Code) => (c === 'V24' ? `Vacation de 24 h (${props.debut24} h → ${props.debut24} h)` : LIBELLES[c])
  const pct = Math.min(100, (props.heuresTotal / HEURES_CONTRAT) * 100)
  const depasse = props.heuresTotal > HEURES_CONTRAT

  const toucher = (d: ISODate) => {
    setChoisi(d)
    if (edition) props.onChange(d, codeSuivant(regime, planning[d]))
  }

  const infos = (d: ISODate) => {
    const c = planning[d]
    const f = holidayName(d)
    const date = `${JOURS[weekday(d)]} ${Number(d.slice(8))} ${MOIS[Number(d.slice(5, 7)) - 1]}`
    return `${date} : ${c ? libelle(c) : 'repos'}${f ? ` · ${f}` : ''}${(props.auto[d] ?? 'R') !== (c ?? 'R') ? ' · modifié' : ''}`
  }

  return (
    <div className="calendrier">
      <div className="compteur">
        <div>
          <strong className={depasse ? 'negatif' : ''}>{heures(props.heuresTotal)}</strong> travaillées sur 1 501 h
          {depasse && <span className="alerte"> · au-dessus du contrat</span>}
        </div>
        <div className="barre" aria-hidden="true">
          <span style={{ width: `${pct}%` }} className={depasse ? 'depasse' : ''} />
        </div>
      </div>

      <div className="barre-outils">
        <button type="button" className={`bouton ${edition ? 'principal' : ''}`} onClick={() => setEdition(!edition)} aria-pressed={edition}>
          {edition ? '✅ Terminer' : '✏️ Modifier ce planning'}
        </button>
        {props.modifie && (
          <button type="button" className="bouton" onClick={props.onRetablir}>
            ↩️ Revenir au planning automatique
          </button>
        )}
      </div>
      {edition && <p className="note">Touche un jour pour changer : {ORDRE[regime].map((c) => (c === 'R' ? 'repos' : COURT[c])).join(' → ')}.</p>}
      <p className="info-jour" aria-live="polite">
        {choisi ? infos(choisi) : 'Touche un jour pour voir son détail.'}
      </p>

      <div className="mois-grille">
        {modulationMonths(props.an).map(({ y, m }) => {
          const cle = `${y}-${String(m).padStart(2, '0')}`
          const n = daysInMonth(y, m)
          const decalage = (weekday(toISO(y, m, 1)) + 6) % 7
          const pm = props.parMois[cle]
          return (
            <div key={cle} className="mois">
              <div className="mois-tete">
                <strong>
                  {MOIS[m - 1]} {y}
                </strong>
                <span>
                  {pm?.vacations ?? 0} vac. · {euros(pm?.majorations ?? 0)}
                </span>
              </div>
              <div className="jours">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((j, i) => (
                  <span key={i} className="jsem">
                    {j}
                  </span>
                ))}
                {Array.from({ length: decalage }, (_, i) => (
                  <span key={`v${i}`} />
                ))}
                {Array.from({ length: n }, (_, i) => {
                  const d = toISO(y, m, i + 1)
                  const c = planning[d]
                  const ferie = !!holidayName(d)
                  const modif = (props.auto[d] ?? 'R') !== (c ?? 'R')
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`jour ${c ? `c-${c}` : 'c-R'} ${ferie ? 'ferie' : ''} ${modif ? 'modif' : ''} ${choisi === d ? 'choisi' : ''} ${weekday(d) === 0 ? 'dim' : ''}`}
                      onClick={() => toucher(d)}
                      title={infos(d)}
                      aria-label={infos(d)}
                    >
                      {c && c !== 'J' && c !== 'N' && c !== 'J10' && c !== 'V24' ? COURT[c] : i + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="legende">
        {(regime === '12h' ? (['J', 'N'] as Code[]) : (['V24'] as Code[])).concat(['CP', 'RF', 'RTT', 'RC']).map((c) => (
          <span key={c}>
            <i className={`c-${c}`} /> {c === 'V24' ? '24 h' : c === 'J' ? 'Jour' : c === 'N' ? 'Nuit' : LIBELLES[c]}
          </span>
        ))}
        <span>
          <i className="c-R ferie-pastille" /> Jour férié
        </span>
      </div>
    </div>
  )
}
