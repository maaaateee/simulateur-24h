import type { ReactNode } from 'react'
import type { Regime } from '../domain/planning'

/** Grands onglets 12 h / 24 h ; l'autre onglet clignote doucement tant qu'on ne l'a jamais ouvert. */
export function Bascule({
  vue,
  onChange,
  onglets,
  decouvert,
}: {
  vue: Regime
  onChange: (r: Regime) => void
  onglets: Record<Regime, { titre: ReactNode; sous: string }>
  decouvert: boolean
}) {
  return (
    <div className="bascule" role="tablist" aria-label="Planning affiché">
      {(['12h', '24h'] as Regime[]).map((r) => {
        const actif = r === vue
        return (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={actif}
            className={`onglet o${r} ${actif ? 'actif' : ''} ${!actif && !decouvert ? 'appel' : ''}`}
            onClick={() => onChange(r)}
          >
            <span className="onglet-titre">{onglets[r].titre}</span>
            <span className="onglet-sous">{onglets[r].sous}</span>
            {!actif && <span className="onglet-indice">👆 Touche pour afficher</span>}
          </button>
        )
      })}
    </div>
  )
}
