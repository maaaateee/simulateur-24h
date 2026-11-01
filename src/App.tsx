import { useMemo, useState } from 'react'
import { profilParDefaut, type Profil } from './domain/paie'
import { EQUIPES, type Code, type Regime } from './domain/planning'
import { AN, simuler, type Modifs, type Reglages } from './domain/simulation'
import { TRAJET_PAR_DEFAUT, TRAJET_V2, type Trajet } from './domain/transport'
import { contingents } from './domain/contingents'
import { Bascule } from './ui/Bascule'
import { Calendrier } from './ui/Calendrier'
import { Contingents } from './ui/Contingents'
import { Detail } from './ui/Detail'
import { FichePaie } from './ui/FichePaie'
import { Info, Repli } from './ui/Info'
import { Methode } from './ui/Methode'
import { Partage } from './ui/Partage'
import { Resultat } from './ui/Resultat'
import { BoutonTheme } from './ui/Theme'
import { Trajets } from './ui/Trajets'
import { heures } from './ui/format'
import { useStored } from './ui/useStored'

interface Etat {
  profil: Profil
  trajet: Trajet
  reglages: Reglages
  modifs12: Modifs
  modifs24: Record<number, Modifs>
}

const INITIAL: Etat = {
  profil: profilParDefaut(),
  trajet: TRAJET_PAR_DEFAUT,
  reglages: { equipe: 0, debut24: 7, semainesChargees: true, indemniteCp: true },
  modifs12: {},
  modifs24: {},
}

/** Nouvelles valeurs de trajet par défaut, si l'agent n'avait pas changé celles de la première version. */
const migrer = (e: Etat): Etat => (JSON.stringify(e.trajet) === JSON.stringify(TRAJET_V2) ? { ...e, trajet: TRAJET_PAR_DEFAUT } : e)

function Etape({ n, titre, info, children, id }: { n?: number; titre: string; info?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section className="etape" id={id}>
      <div className="etape-tete">
        {n && <span className="numero">{n}</span>}
        <h2>{titre}</h2>
        {info && <Info>{info}</Info>}
      </div>
      {children}
    </section>
  )
}

export default function App() {
  const [etat, setEtat] = useStored<Etat>('simulateur-24h:v2', INITIAL, migrer)
  const [vue, setVue] = useState<Regime>('24h')
  // L'onglet de l'autre planning clignote tant que l'agent ne l'a jamais ouvert.
  const [decouvert, setDecouvert] = useState(() => {
    try {
      return localStorage.getItem('simulateur-24h:bascule') === '1'
    } catch {
      return false
    }
  })
  const basculer = (r: Regime) => {
    setVue(r)
    if (r !== vue && !decouvert) {
      setDecouvert(true)
      try {
        localStorage.setItem('simulateur-24h:bascule', '1')
      } catch {
        // Navigation privée.
      }
    }
  }
  const set = (part: Partial<Etat>) => setEtat((e) => ({ ...e, ...part }))
  const sim = useMemo(() => simuler(etat.profil, etat.trajet, etat.reglages, etat.modifs12, etat.modifs24), [etat])

  const cote = vue === '12h' ? sim.c12 : sim.c24
  const modifs = vue === '12h' ? etat.modifs12 : (etat.modifs24[etat.reglages.equipe] ?? {})
  const ecrireModifs = (m: Modifs) =>
    vue === '12h' ? set({ modifs12: m }) : set({ modifs24: { ...etat.modifs24, [etat.reglages.equipe]: m } })
  const changerJour = (d: string, c: Code | 'R') => {
    const m = { ...modifs, [d]: c }
    if ((cote.auto[d] ?? 'R') === c) delete m[d]
    ecrireModifs(m)
  }

  return (
    <>
      <header className="barre-haut">
        <div className="contenu barre-haut-int">
          <a className="marque" href="#haut">
            <span className="logo" aria-hidden="true">
              24h
            </span>
            <span>
              Simulateur 24h<small>Projet 24h SSIAP</small>
            </span>
          </a>
          <nav className="raccourcis" aria-label="Aller à">
            <a href="#paie">Paie</a>
            <a href="#trajet">Trajet</a>
            <a href="#resultat">Résultat</a>
            <a href="#plannings">Plannings</a>
          </nav>
          <BoutonTheme />
        </div>
      </header>

      <section className="hero contenu" id="haut">
        <div>
          <span className="badge">Période 2026-2027 · 1 501 h</span>
          <h1>
            12 h ou 24 h ?<br />
            <span className="degrade">Fais ta simulation.</span>
          </h1>
          <p>Ton salaire, tes trajets et tes repos sur une année complète, entre ton rythme actuel et le cycle 24/72 proposé.</p>
        </div>
        <ul className="atouts">
          <li>🔒 Ta fiche de paie reste sur ton appareil</li>
          <li>📅 Une année complète, repos posés</li>
          <li>⚖️ Le même volume de repos des deux côtés</li>
        </ul>
      </section>

      <main className="contenu">
        <div className="disposition">
          <div className="colonne-saisie">
            <Etape n={1} titre="Ta paie" id="paie" info="Importe ta dernière fiche de paie : l'échelon, le traitement et tes taux de majoration sont repris tout seuls. Tu peux aussi tout saisir à la main.">
              <FichePaie profil={etat.profil} onChange={(profil) => set({ profil })} />
            </Etape>

            <Etape n={2} titre="Ton trajet" id="trajet" info="Domicile-travail. Un aller-retour par vacation : deux fois moins en 24 h.">
              <Trajets trajet={etat.trajet} onChange={(trajet) => set({ trajet })} />
            </Etape>
          </div>

          <div className="colonne-resultat">
            <Etape n={3} titre="Ton résultat" id="resultat" info={`Estimation sur la période du 1er avril ${AN} au 31 mars ${AN + 1}.`}>
              <Resultat sim={sim} profil={etat.profil} reglages={etat.reglages} onReglages={(reglages) => set({ reglages })} />
              <Partage sim={sim} />
            </Etape>
          </div>
        </div>

        <Etape
          titre="📅 Les plannings"
          id="plannings"
          info={
            <>
              En 12 h, un vrai TDS annuel SSIAP 1 de CDG ; en 24 h, le cycle 24/72 de l'équipe {EQUIPES[etat.reglages.equipe]}. Les repos sont déjà posés comme le ferait un agent. Tu
              peux modifier les jours pour coller à ton propre planning.
            </>
          }
        >
          <Bascule
            vue={vue}
            onChange={basculer}
            decouvert={decouvert}
            onglets={{
              '12h': {
                titre: (
                  <>
                    <i className="s12" /> 12 h actuel
                  </>
                ),
                sous: `${sim.c12.resultat.stats.vacations} vacations · ${heures(sim.c12.resultat.stats.heures)}`,
              },
              '24h': {
                titre: (
                  <>
                    <i className="s24" /> 24 h proposé
                  </>
                ),
                sous: `Équipe ${EQUIPES[etat.reglages.equipe]} · ${sim.c24.resultat.stats.vacations} vacations · ${heures(sim.c24.resultat.stats.heures)}`,
              },
            }}
          />
          <Contingents liste={contingents(vue, cote.planning, cote.bilan)} rcNuit={cote.resultat.stats.rcNuit} />
          <Calendrier
            key={`${vue}-${etat.reglages.equipe}`}
            regime={vue}
            an={AN}
            planning={cote.planning}
            auto={cote.auto}
            parMois={cote.resultat.parMois}
            heuresTotal={cote.resultat.stats.heures}
            debut24={etat.reglages.debut24}
            onChange={changerJour}
            onRetablir={() => ecrireModifs({})}
            modifie={Object.keys(modifs).length > 0}
          />
        </Etape>

        <Repli titre="⚖️ Comment les repos sont posés (1 501 h au plus)" id="methode">
          <Methode b12={sim.c12.bilan} b24={sim.c24.bilan} an={AN} />
        </Repli>

        <Repli titre="🧮 Le détail du calcul et les règles appliquées" id="detail">
          <Detail sim={sim} profil={etat.profil} />
        </Repli>
      </main>

      <footer className="pied">
        <div className="contenu pied-int">
          <p>
            <strong>L'équipe SSIAP du Projet 24h</strong> · simulation indicative, qui ne remplace pas ta fiche de paie · tes chiffres restent sur ton appareil.
          </p>
          <p>
            <a href="/ancien/">Ancienne version</a>
            {' · '}
            <button type="button" className="lien" onClick={() => confirm('Effacer ta simulation et revenir aux valeurs de départ ?') && setEtat(INITIAL)}>
              Tout effacer
            </button>
          </p>
        </div>
      </footer>
    </>
  )
}
