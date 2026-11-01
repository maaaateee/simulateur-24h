import type { Contingent } from '../domain/contingents'
import { nombre } from './format'
import { Info } from './Info'

export function Contingents({ liste, rcNuit }: { liste: Contingent[]; rcNuit: number }) {
  return (
    <div className="contingents">
      {liste.map((c) => {
        const reste = c.droit - c.pris
        const pct = c.droit ? Math.min(100, (c.pris / c.droit) * 100) : 0
        return (
          <div className={`contingent k-${c.code}`} key={c.code}>
            <span className="contingent-tete">
              <i className={`c-${c.code}`} /> {c.nom}
              <Info>{c.aide}</Info>
            </span>
            <strong>
              {nombre(c.pris)} <small>/ {nombre(c.droit)} {c.unite}</small>
            </strong>
            <span className="jauge" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
            <small className={reste < 0 ? 'negatif' : ''}>
              {reste > 0 ? `reste ${nombre(reste)} ${c.unite}` : reste < 0 ? `${nombre(-reste)} ${c.unite} de trop` : 'tout est posé'}
            </small>
          </div>
        )
      })}
      <div className="contingent k-nuit">
        <span className="contingent-tete">
          🌙 RC nuit
          <Info>Repos compensateur de nuit : 1,5 % des heures travaillées entre 21 h et 6 h, dû à partir de 270 h. Il se reporte d'une année sur l'autre.</Info>
        </span>
        <strong>
          {nombre(rcNuit)} <small>h acquises</small>
        </strong>
        <span className="jauge vide" aria-hidden="true" />
        <small>à poser quand tu veux</small>
      </div>
    </div>
  )
}
