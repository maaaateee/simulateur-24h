import { useRef, useState } from 'react'
import { echelonsDe, GRILLES, type Qualification } from '../domain/echelons'
import { tauxDepuisTraitement, type Profil } from '../domain/paie'
import { MOIS } from '../domain/dates'
import { Choix, Interrupteur, Nombre } from './Champs'
import { Info } from './Info'
import { euros2, nombre } from './format'

const nomMois = (p?: string) => (p ? `${MOIS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}` : '')
/** « de juin 2026 », « d'avril 2026 » */
const deMois = (p?: string) => {
  const n = nomMois(p)
  return /^[aeiouéèh]/i.test(n) ? `d'${n}` : `de ${n}`
}

export function FichePaie({ profil, onChange }: { profil: Profil; onChange: (p: Profil) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [etat, setEtat] = useState<{ type: 'lecture' | 'erreur' | 'ok'; message: string } | null>(null)
  const [edition, setEdition] = useState(false)

  async function lire(fichiers: FileList | null) {
    if (!fichiers?.length) return
    setEtat({ type: 'lecture', message: 'Lecture de ta fiche…' })
    try {
      // Chargé seulement au moment de l'import : le reste du site reste léger.
      const [{ textItems }, { parsePayslip }, { profilDepuisFiche }] = await Promise.all([
        import('../import/pdf'),
        import('../import/payslip'),
        import('../import/profilFiche'),
      ])
      // Plusieurs fiches : on garde la plus récente.
      const fiches = []
      for (const f of Array.from(fichiers)) fiches.push(parsePayslip(await textItems(await f.arrayBuffer())))
      fiches.sort((a, b) => a.periode.localeCompare(b.periode))
      const fiche = fiches[fiches.length - 1]
      const p = profilDepuisFiche(fiche, profil)
      onChange(p)
      setEtat({ type: 'ok', message: `Fiche ${deMois(fiche.periode)} lue.` })
    } catch (e) {
      setEtat({ type: 'erreur', message: e instanceof Error && /bulletin/.test(e.message) ? e.message : "Impossible de lire ce PDF. Utilise le PDF de ta fiche de paie ADP (pas une photo), ou saisis tes chiffres à la main." })
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  const changer = (part: Partial<Profil>) => onChange({ ...profil, ...part, source: 'saisie' })
  const changerTraitement = (tb: number) => changer({ traitementBase: tb, ...tauxDepuisTraitement(tb) })
  const changerEchelon = (q: Qualification, e: string) => {
    const tb = GRILLES[q].traitement[e]
    changer({ qualification: q, echelon: e, ...(tb ? { traitementBase: tb, ...tauxDepuisTraitement(tb) } : {}) })
  }

  return (
    <div className="fiche">
      <button type="button" className="bouton principal large" onClick={() => input.current?.click()} disabled={etat?.type === 'lecture'}>
        📄 Importer ma fiche de paie (PDF)
      </button>
      <input ref={input} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => lire(e.target.files)} />
      <p className="note centre">
        🔒 Lue sur ton appareil, rien n'est envoyé
        <Info>Le PDF est lu directement sur ton téléphone ou ton ordinateur. Seuls l'échelon, le traitement de base, l'ancienneté, les taux de majoration et les primes fixes sont gardés, dans ton navigateur. Jamais d'IBAN, de numéro de sécurité sociale, d'adresse ni de net.</Info>
      </p>
      {etat && <p className={`etat ${etat.type}`}>{etat.message}</p>}

      <div className="profil">
        <div className="profil-tete">
          <strong>{profil.qualification === 'SSIAP2' ? 'SSIAP 2' : 'SSIAP 1'} · échelon {profil.echelon}</strong>
          <span className="pastille">{profil.source === 'fiche' ? `lu sur ta fiche ${deMois(profil.periodeFiche)}` : 'saisi à la main'}</span>
        </div>
        <dl className="profil-liste">
          <div>
            <dt>Traitement de base</dt>
            <dd>{euros2(profil.traitementBase)}</dd>
          </div>
          <div>
            <dt>Ancienneté</dt>
            <dd>{nombre(profil.anciennete)} %</dd>
          </div>
          <div>
            <dt>
              Heure à +75 % <Info>Nuit (22 h à 6 h) et dimanche. Ligne « MAJ.75% » de ta fiche.</Info>
            </dt>
            <dd>{profil.t75.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} €</dd>
          </div>
          <div>
            <dt>
              Heure fériée <Info>+100 %, ligne « MAJ.100% JF » de ta fiche.</Info>
            </dt>
            <dd>{euros2(profil.t100)}</dd>
          </div>
        </dl>
        <button type="button" className="lien" onClick={() => setEdition(!edition)} aria-expanded={edition}>
          {edition ? 'Fermer' : '✏️ Modifier mes chiffres'}
        </button>
      </div>

      {edition && (
        <div className="grille-champs">
          <div className="champ large">
            <span className="champ-label">Qualification</span>
            <Choix
              label="Qualification"
              value={profil.qualification}
              options={[
                { value: 'SSIAP1', label: 'SSIAP 1' },
                { value: 'SSIAP2', label: 'SSIAP 2' },
              ]}
              onChange={(q) => changerEchelon(q, q === profil.qualification ? profil.echelon : echelonsDe(q)[q === 'SSIAP1' ? 20 : 10])}
            />
          </div>
          <label className="champ">
            <span className="champ-label">Échelon</span>
            <select value={profil.echelon} onChange={(e) => changerEchelon(profil.qualification, e.target.value)}>
              {echelonsDe(profil.qualification).map((e) => (
                <option key={e} value={e}>
                  {e} · {euros2(GRILLES[profil.qualification].traitement[e])}
                </option>
              ))}
            </select>
          </label>
          <Nombre label="Traitement de base" value={profil.traitementBase} step={0.01} suffixe="€" onChange={changerTraitement} />
          <Nombre label="Ancienneté" value={profil.anciennete} step={1} suffixe="%" onChange={(v) => changer({ anciennete: v })} aide="1 % par année d'ancienneté : ligne ANCIENNETE de ta fiche." />
          <Nombre label="Heure à +75 % (nuit, dimanche)" value={profil.t75} step={0.001} suffixe="€" onChange={(v) => changer({ t75: v })} aide="Nuit et dimanche : ligne MAJ.75% de ta fiche." />
          <Nombre label="Heure fériée (+100 %)" value={profil.t100} step={0.01} suffixe="€" onChange={(v) => changer({ t100: v })} aide="Ligne MAJ.100% JF de ta fiche." />
          <Nombre label="Autres éléments fixes par mois" value={profil.autresFixes} step={0.01} suffixe="€" onChange={(v) => changer({ autresFixes: v })} aide="Supplément familial, IDT, indemnités kilométriques… Les mêmes en 12 h et en 24 h." />
          <Nombre label="Cotisations salariales" value={Math.round(profil.tauxCotisations * 1000) / 10} step={0.1} suffixe="%" onChange={(v) => changer({ tauxCotisations: v / 100 })} aide="Environ 21,4 % du brut sur les fiches SSIAP." />
          <Nombre label="Taux d'impôt à la source" value={profil.tauxPas} step={0.1} suffixe="%" onChange={(v) => changer({ tauxPas: v })} />
          <div className="champ large">
            <Interrupteur checked={profil.treizieme} onChange={(v) => changer({ treizieme: v })}>
              13e mois versé chaque mois
            </Interrupteur>
          </div>
        </div>
      )}
    </div>
  )
}
