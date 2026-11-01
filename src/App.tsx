import { useMemo, useState } from 'react'
import { profilParDefaut, type Profil } from './domain/paie'
import { EQUIPES, type Code, type Regime } from './domain/planning'
import { AN, simuler, type Modifs, type Reglages } from './domain/simulation'
import { TRAJET_PAR_DEFAUT, type Trajet } from './domain/transport'
import { Calendrier } from './ui/Calendrier'
import { Choix } from './ui/Champs'
import { Detail } from './ui/Detail'
import { FichePaie } from './ui/FichePaie'
import { Methode } from './ui/Methode'
import { Partage } from './ui/Partage'
import { Resultat } from './ui/Resultat'
import { Trajets } from './ui/Trajets'
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

function Etape({ n, titre, children, id }: { n?: number; titre: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="etape" id={id}>
      <h2>
        {n && <span className="numero">{n}</span>}
        {titre}
      </h2>
      {children}
    </section>
  )
}

export default function App() {
  const [etat, setEtat] = useStored<Etat>('simulateur-24h:v2', INITIAL)
  const [vue, setVue] = useState<Regime>('24h')
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
      <header className="entete">
        <div className="contenu">
          <span className="badge">Projet 24h SSIAP</span>
          <h1>12 h ou 24 h : fais ta simulation</h1>
          <p>
            Ton salaire, tes trajets et tes repos sur une année complète à 1 501 h, entre ton rythme actuel et le cycle 24/72 proposé. Importe ta fiche de paie, renseigne ton
            trajet : le calcul se fait tout seul.
          </p>
        </div>
      </header>

      <main className="contenu">
        <Etape n={1} titre="Ta paie">
          <FichePaie profil={etat.profil} onChange={(profil) => set({ profil })} />
        </Etape>

        <Etape n={2} titre="Ton trajet domicile – travail">
          <Trajets trajet={etat.trajet} onChange={(trajet) => set({ trajet })} />
        </Etape>

        <Etape n={3} titre="Ton résultat" id="resultat">
          <Resultat sim={sim} reglages={etat.reglages} onReglages={(reglages) => set({ reglages })} />
          <Partage sim={sim} />
        </Etape>

        <Etape titre="📅 Les deux plannings, mois par mois">
          <p className="note">
            Période du 1er avril {AN} au 31 mars {AN + 1}. En 12 h : un vrai TDS annuel SSIAP 1 de CDG. En 24 h : le cycle 24/72 de l'équipe {EQUIPES[etat.reglages.equipe]}. Dans les
            deux, les congés sont déjà posés pour rester sous 1 501 h. Tu peux modifier les jours pour coller à ton propre planning.
          </p>
          <Choix
            label="Planning affiché"
            value={vue}
            options={[
              { value: '12h', label: '🔴 12 h actuel' },
              { value: '24h', label: `🟢 24 h · équipe ${EQUIPES[etat.reglages.equipe]}` },
            ]}
            onChange={setVue}
          />
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

        <Etape titre="⚖️ Comment on arrive à 1 501 h">
          <Methode b12={sim.c12.bilan} b24={sim.c24.bilan} an={AN} />
        </Etape>

        <Etape titre="🧮 Le détail du calcul">
          <Detail sim={sim} profil={etat.profil} />
        </Etape>
      </main>

      <footer className="pied">
        <div className="contenu">
          <p>
            <strong>L'équipe SSIAP du Projet 24h.</strong> Simulation indicative, fondée sur les règles ADP appliquées aujourd'hui (règlement DG/2005/2199, accord ARTT, grilles
            2025). Elle ne remplace pas ta fiche de paie.
          </p>
          <p>Tes chiffres restent sur ton appareil. Aucune donnée n'est envoyée.</p>
          <button type="button" className="lien" onClick={() => confirm('Effacer ta simulation et revenir aux valeurs de départ ?') && setEtat(INITIAL)}>
            Tout effacer
          </button>
        </div>
      </footer>
    </>
  )
}
