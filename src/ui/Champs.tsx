import { useId, type ReactNode } from 'react'
import { Info } from './Info'

export function Nombre(props: {
  label: ReactNode
  value: number
  onChange: (v: number) => void
  step?: number
  suffixe?: string
  aide?: ReactNode
  min?: number
}) {
  const id = useId()
  return (
    <div className="champ">
      <span className="champ-tete">
        <label className="champ-label" htmlFor={id}>
          {props.label}
        </label>
        {props.aide && <Info>{props.aide}</Info>}
      </span>
      <span className="champ-saisie">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={props.step ?? 1}
          min={props.min ?? 0}
          value={Number.isFinite(props.value) ? props.value : ''}
          onChange={(e) => {
            const v = parseFloat(e.target.value.replace(',', '.'))
            props.onChange(Number.isFinite(v) ? v : 0)
          }}
        />
        {props.suffixe && <span className="suffixe">{props.suffixe}</span>}
      </span>
    </div>
  )
}

export function Choix<T extends string | number>(props: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="choix" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === props.value}
          className={o.value === props.value ? 'actif' : ''}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Interrupteur(props: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; aide?: ReactNode }) {
  return (
    <div className="interrupteur-ligne">
      <label className="interrupteur">
        <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
        <span className="curseur" aria-hidden="true" />
        <span>{props.children}</span>
      </label>
      {props.aide && <Info>{props.aide}</Info>}
    </div>
  )
}
