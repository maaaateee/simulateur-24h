import { EQUIPES } from '../domain/planning'
import type { Reglages, Simulation } from '../domain/simulation'
import { Choix, Interrupteur } from './Champs'
import { Info } from './Info'
import { netDepuisBrut, type Profil } from '../domain/paie'
import type { Cote } from '../domain/simulation'
import { euros, euros2, heures, nombre, signe } from './format'
import { useAnime } from './useAnime'

interface Mesure {
  label: string
  a: number
  b: number
  format: (n: number) => string
}

/** Barres côte à côte : 12 h (orange) et 24 h (vert d'eau), valeur au bout de chaque barre. */
function FaceAFace({ mesures }: { mesures: Mesure[] }) {
  return (
    <div className="barres" role="group" aria-label="Comparaison 12 h et 24 h">
      <div className="legende-series" aria-hidden="true">
        <span>
          <i className="s12" /> 12 h actuel
        </span>
        <span>
          <i className="s24" /> 24 h proposé
        </span>
      </div>
      {mesures.map((m) => {
        const max = Math.max(m.a, m.b) || 1
        return (
          <div className="barre-ligne" key={m.label}>
            <div className="barre-titre">{m.label}</div>
            {(
              [
                ['s12', '12 h', m.a],
                ['s24', '24 h', m.b],
              ] as const
            ).map(([cls, nom, v]) => (
              <div className="barre-piste" key={cls} title={`${nom} : ${m.format(v)}`}>
                <span className={`barre ${cls}`} style={{ width: `calc((100% - 6.5rem) * ${v / max})` }} />
                <em>{m.format(v)}</em>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** Carte du face-à-face : net mensuel estimé en gros, brut et détail en bulle. */
function CarteDuel({ c, sim, profil, titre, serie, gagnant }: { c: Cote; sim: Simulation; profil: Profil; titre: string; serie: 's12' | 's24'; gagnant?: boolean }) {
  const net = netDepuisBrut(c.brutMensuel, profil)
  return (
    <div className={`duel-carte ${serie === 's12' ? 'c12' : 'c24'} ${gagnant ? 'gagnant' : ''}`}>
      <span className="duel-titre">
        <i className={serie} /> {titre}
      </span>
      <strong>≈ {euros(net)}</strong>
      <small>
        net par mois en moyenne
        <Info>
          <span className="bulle-titre">Brut mensuel moyen</span>
          {sim.fixe.map((l) => (
            <span className="bulle-ligne" key={l.libelle}>
              <span>{l.libelle}</span>
              <b>{euros2(l.montant)}</b>
            </span>
          ))}
          <span className="bulle-ligne">
            <span>Majorations (moyenne)</span>
            <b>{euros2(c.resultat.montants.total / 12)}</b>
          </span>
          {c.cp > 0 && (
            <span className="bulle-ligne">
              <span>Indemnité de CP (part des majorations)</span>
              <b>{euros2(c.cp / 12)}</b>
            </span>
          )}
          <span className="bulle-ligne total">
            <span>Total brut</span>
            <b>{euros2(c.brutMensuel)}</b>
          </span>
          <span className="bulle-ligne">
            <span>Cotisations ({nombre(Math.round(profil.tauxCotisations * 1000) / 10)} %) et impôt ({nombre(profil.tauxPas)} %)</span>
            <b>−{euros2(c.brutMensuel - net)}</b>
          </span>
          <span className="bulle-ligne total">
            <span>Net estimé</span>
            <b>{euros2(net)}</b>
          </span>
          <span className="bulle-note">Hors primes ponctuelles (prime de juin, rappels…). Le traitement, l'ancienneté et les primes fixes sont les mêmes en 12 h et en 24 h.</span>
        </Info>
      </small>
      <span className="duel-lignes">
        <span>
          brut <b>{euros(c.brutMensuel)}</b>
        </span>
        <span>
          dont majorations <b>{euros(c.resultat.montants.total / 12)}</b>
        </span>
      </span>
    </div>
  )
}

export function Resultat({ sim, profil, reglages, onReglages }: { sim: Simulation; profil: Profil; reglages: Reglages; onReglages: (r: Reglages) => void }) {
  const { c12, c24 } = sim
  const s12 = c12.resultat.stats
  const s24 = c24.resultat.stats
  const min = Math.min(...sim.parEquipe)
  const max = Math.max(...sim.parEquipe)
  const set = (part: Partial<Reglages>) => onReglages({ ...reglages, ...part })
  const gain = useAnime(sim.gainTotal)
  const lignes: { label: string; a: string; b: string }[] = [
    { label: 'Salaire brut moyen par mois', a: euros(c12.brutMensuel), b: euros(c24.brutMensuel) },
    { label: 'Majorations sur l’année', a: euros(c12.resultat.montants.total), b: euros(c24.resultat.montants.total) },
    { label: 'Indemnité de CP liée aux majorations', a: euros(c12.cp), b: euros(c24.cp) },
    { label: 'Vacations (allers-retours)', a: String(s12.vacations), b: String(s24.vacations) },
    { label: 'Heures travaillées (1 501 h au plus)', a: heures(s12.heures), b: heures(s24.heures) },
    { label: 'Temps passé sur la route', a: heures(c12.transport.heures), b: heures(c24.transport.heures) },
    { label: 'Coût des trajets', a: euros(c12.transport.total), b: euros(c24.transport.total) },
    { label: 'Repos de 3 jours ou plus', a: String(s12.reposLongs), b: String(s24.reposLongs) },
    { label: 'Plus longue période de repos', a: `${s12.plusLongRepos} jours`, b: `${s24.plusLongRepos} jours` },
    { label: 'Dimanches travaillés', a: String(s12.dimanchesTravailles), b: String(s24.dimanchesTravailles) },
    { label: 'Repos compensateur de nuit gagné', a: `${nombre(s12.rcNuit)} h`, b: `${nombre(s24.rcNuit)} h` },
  ]

  return (
    <div className="resultat">
      <div className={`hero-gain ${sim.gainTotal >= 0 ? '' : 'perte'}`}>
        <span className="hero-label">
          Avec le 24 h, sur un an, net dans ta poche
          <Info>Salaire net en plus (majorations, après cotisations et impôt) et frais de trajet économisés, sur la période du 1er avril 2026 au 31 mars 2027.</Info>
        </span>
        <strong className="hero-chiffre">{signe(gain)}</strong>
        <span className="hero-sous">
          soit <b>{signe(sim.gainTotal / 12)}</b> par mois, salaire et trajets compris
        </span>
      </div>

      <div className="tuiles">
        <div className="tuile">
          <span className="tuile-label">💶 Salaire net</span>
          <strong>{signe(sim.gainNet)}</strong>
          <small>par an ({signe(sim.gainBrut)} brut)</small>
        </div>
        <div className="tuile">
          <span className="tuile-label">🚗 Trajets</span>
          <strong>{signe(sim.economieTrajets)}</strong>
          <small>de carburant et d'usure en moins</small>
        </div>
        <div className="tuile">
          <span className="tuile-label">🕒 Route</span>
          <strong>−{heures(c12.transport.heures - c24.transport.heures)}</strong>
          <small>{s12.vacations - s24.vacations} allers-retours en moins</small>
        </div>
        <div className="tuile">
          <span className="tuile-label">🌱 CO₂</span>
          <strong>−{nombre(Math.round((c12.transport.co2 - c24.transport.co2) / 10) / 100)} t</strong>
          <small>en moins par an</small>
        </div>
      </div>

      <div className="duel">
        <CarteDuel c={c12} sim={sim} profil={profil} titre="12 h actuel" serie="s12" />
        <span className="duel-vs" aria-hidden="true">
          VS
        </span>
        <CarteDuel c={c24} sim={sim} profil={profil} titre="24 h proposé" serie="s24" gagnant={c24.brutMensuel >= c12.brutMensuel} />
      </div>

      <FaceAFace
        mesures={[
          { label: 'Majorations sur l’année', a: c12.resultat.montants.total, b: c24.resultat.montants.total, format: euros },
          { label: 'Allers-retours au travail', a: s12.vacations, b: s24.vacations, format: (n) => String(n) },
          { label: 'Heures sur la route', a: c12.transport.heures, b: c24.transport.heures, format: heures },
          { label: 'Coût des trajets', a: c12.transport.total, b: c24.transport.total, format: euros },
          { label: 'Repos de 3 jours ou plus', a: s12.reposLongs, b: s24.reposLongs, format: (n) => String(n) },
        ]}
      />

      <div className="reglages">
        <div className="reglage">
          <span className="champ-label">
            Ton équipe en 24 h
            <Info>
              Les fériés et les dimanches ne tombent pas pareil selon l'équipe : de {signe(min)} à {signe(max)} par an.
            </Info>
          </span>
          <Choix label="Équipe" value={reglages.equipe} options={EQUIPES.map((e, i) => ({ value: i, label: e }))} onChange={(equipe) => set({ equipe })} />
        </div>
        <div className="reglage">
          <span className="champ-label">
            Prise de service en 24 h
            <Info>
              De {reglages.debut24} h à {reglages.debut24} h le lendemain. 7 h comme au SSLIA ; un vote est prévu si la Direction laisse le choix.
            </Info>
          </span>
          <Choix label="Heure de début" value={reglages.debut24} options={[6, 7, 8, 12].map((h) => ({ value: h, label: `${h} h` }))} onChange={(debut24) => set({ debut24 })} />
        </div>
      </div>

      <details className="tout">
        <summary>Voir tous les chiffres</summary>
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
              {lignes.map((l) => (
                <tr key={l.label}>
                  <th scope="row">{l.label}</th>
                  <td>{l.a}</td>
                  <td>{l.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="hypotheses">
        <Interrupteur
          checked={reglages.semainesChargees}
          onChange={(semainesChargees) => set({ semainesChargees })}
          aide="+25 % de la 40e à la 50e heure d'une semaine, dans les deux plannings. Payé au SSLIA en 24 h (ligne COMP. 25 % de leur fiche)."
        >
          Semaines à 48 h payées +25 %
        </Interrupteur>
        <Interrupteur
          checked={reglages.indemniteCp}
          onChange={(indemniteCp) => set({ indemniteCp })}
          aide="L'indemnité de congés payés vaut 1/10e de ce que tu as gagné dans l'année, majorations comprises : plus de majorations, c'est aussi plus d'indemnité de CP."
        >
          Effet sur l'indemnité de congés payés
        </Interrupteur>
      </div>
    </div>
  )
}
