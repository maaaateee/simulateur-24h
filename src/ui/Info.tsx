import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Petite bulle d'aide « i » : au survol sur ordinateur, au toucher sur téléphone, au clavier avec Tab. */
export function Info({ children, label = "Plus d'informations" }: { children: ReactNode; label?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const bulle = useRef<HTMLSpanElement>(null)
  const souris = useRef(false)
  const id = useId()

  useLayoutEffect(() => {
    if (!ouvert || !bouton.current || !bulle.current) {
      setPos(null)
      return
    }
    const r = bouton.current.getBoundingClientRect()
    const b = bulle.current.getBoundingClientRect()
    const left = Math.min(Math.max(8, r.left + r.width / 2 - b.width / 2), window.innerWidth - b.width - 8)
    const top = r.top - b.height - 10 < 8 ? r.bottom + 10 : r.top - b.height - 10
    setPos({ left, top })
  }, [ouvert])

  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: PointerEvent) => {
      if (!bouton.current?.contains(e.target as Node) && !bulle.current?.contains(e.target as Node)) setOuvert(false)
    }
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false)
    const fermer = () => setOuvert(false)
    window.addEventListener('pointerdown', dehors)
    window.addEventListener('keydown', touche)
    window.addEventListener('scroll', fermer, { passive: true })
    window.addEventListener('resize', fermer)
    return () => {
      window.removeEventListener('pointerdown', dehors)
      window.removeEventListener('keydown', touche)
      window.removeEventListener('scroll', fermer)
      window.removeEventListener('resize', fermer)
    }
  }, [ouvert])

  return (
    <span className="info">
      <button
        ref={bouton}
        type="button"
        className="info-bouton"
        aria-label={label}
        aria-expanded={ouvert}
        aria-describedby={ouvert ? id : undefined}
        onPointerDown={(e) => (souris.current = e.pointerType === 'mouse')}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setOuvert(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setOuvert(false)}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && setOuvert(true)}
        onBlur={() => setOuvert(false)}
        onClick={() => setOuvert((o) => (souris.current ? true : !o))}
      >
        i
      </button>
      {ouvert && (
        <span ref={bulle} id={id} role="tooltip" className="bulle" style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}>
          {children}
        </span>
      )}
    </span>
  )
}

/** Bloc qui se déroule (fermé par défaut). */
export function Repli({ titre, children, id, ouvert }: { titre: ReactNode; children: ReactNode; id?: string; ouvert?: boolean }) {
  return (
    <details className="etape repli" id={id} open={ouvert}>
      <summary>
        <span>{titre}</span>
        <span className="chevron" aria-hidden="true" />
      </summary>
      <div className="repli-contenu">{children}</div>
    </details>
  )
}
