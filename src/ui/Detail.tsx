import type { Cote, Simulation } from '../domain/simulation'
import type { Profil } from '../domain/paie'
import { euros2, nombre, signe } from './format'

function Lignes({ c, profil }: { c: Cote; profil: Profil }) {
  const h = c.resultat.heures
  const m = c.resultat.montants
  const base = profil.traitementBase / 151.67
  const rows: [string, number, string, number][] = [
    ['🌙 Nuit (22 h – 6 h)', h.nuit, `× ${nombre(profil.t75)} €`, m.nuit],
    ['☀️ Dimanche (hors nuit)', h.dimanche, `× ${nombre(profil.t75)} €`, m.dimanche],
    ['🎉 Jours fériés', h.ferie, `× ${nombre(profil.t100)} €`, m.ferie],
    ['✨ 40e à 42e heure de la semaine', h.comp25, `× 25 % de ${nombre(Math.round(base * 100) / 100)} € (base ÷ 151,67 h)`, m.comp25],
    ['⏰ 43e à 50e heure', h.hs25, '× 25 %', m.hs25],
    ['⚡ Au-delà de la 50e heure', h.hs50, '× 50 %', m.hs50],
  ]
  return (
    <table className="detail">
      <tbody>
        {rows
          .filter((r) => r[1] > 0 || r[0].startsWith('🌙'))
          .map(([l, n, t, v]) => (
            <tr key={l}>
              <th scope="row">
                {l}
                <small>{t}</small>
              </th>
              <td>{nombre(n)} h</td>
              <td>{euros2(v)}</td>
            </tr>
          ))}
        <tr className="total">
          <th scope="row">Majorations sur l'année</th>
          <td />
          <td>{euros2(m.total)}</td>
        </tr>
        {c.cp > 0 && (
          <tr>
            <th scope="row">
              Indemnité de CP<small>1/10e des majorations</small>
            </th>
            <td />
            <td>{euros2(c.cp)}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export function Detail({ sim, profil }: { sim: Simulation; profil: Profil }) {
  return (
    <div className="detail-calcul">
      <h3>Partie fixe du salaire (la même en 12 h et en 24 h)</h3>
      <table className="detail">
        <tbody>
          {sim.fixe.map((l) => (
            <tr key={l.libelle}>
              <th scope="row">{l.libelle}</th>
              <td>{euros2(l.montant)}</td>
            </tr>
          ))}
          <tr className="total">
            <th scope="row">Total par mois</th>
            <td>{euros2(sim.fixeTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div className="deux-colonnes">
        <div>
          <h3 className="c12">Majorations en 12 h</h3>
          <Lignes c={sim.c12} profil={profil} />
        </div>
        <div>
          <h3 className="c24">Majorations en 24 h</h3>
          <Lignes c={sim.c24} profil={profil} />
        </div>
      </div>

      <h3>Du brut au net</h3>
      <p>
        Écart de salaire brut sur l'année : <strong>{signe(sim.gainBrut)}</strong>. Après cotisations ({nombre(Math.round(profil.tauxCotisations * 1000) / 10)} %) et impôt à la source (
        {nombre(profil.tauxPas)} %) : <strong>{signe(sim.gainNet)}</strong>. Les économies de trajet ne sont ni cotisées ni imposées : elles s'ajoutent telles quelles.
      </p>
      <p className="note">
        💡 L'impôt sur le revenu est progressif par tranches : gagner plus ne fait jamais baisser ce qui reste dans ta poche.
      </p>

      <h3>Les règles appliquées</h3>
      <ul className="regles">
        <li>Règlement ADP 12.1.I (DG/2005/2199) : nuit de 22 h à 6 h +75 %, dimanche +75 % (sans cumul avec la nuit), jour férié +100 % (prioritaire).</li>
        <li>Chaque heure compte à sa date réelle : une nuit qui commence la veille d'un férié donne 6 h fériées. Le dimanche de Pâques est payé comme un férié chez ADP.</li>
        <li>Heure à +75 % = 75 % du taux nominal ; taux nominal = traitement de base ÷ 169 h (par exemple 2 344,28 € ÷ 169 = 13,87 €, comme sur les fiches 2026).</li>
        <li>Semaines chargées : de la 40e à la 42e heure +25 % (ligne « COMP. 25 % »), de la 43e à la 50e +25 %, au-delà +50 % (§ 3.1 et 3.3 du même règlement).</li>
        <li>Les primes fixes (traitement de base, ancienneté, assiduité, 13e mois, supplément familial, IDT…) ne changent pas avec le rythme de travail.</li>
      </ul>
      <p className="avertissement">
        ⚠️ <strong>Hypothèse du projet</strong> : en 24 h, on applique les mêmes règles de majoration qu'aujourd'hui en 12 h. Pour le SSLIA et le SMU, déjà en H24, le règlement renvoie à
        des accords spécifiques : les règles définitives seraient à négocier avec la Direction. Ce simulateur donne une estimation et ne remplace pas ta fiche de paie.
      </p>
    </div>
  )
}
