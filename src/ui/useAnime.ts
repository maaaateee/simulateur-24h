import { useEffect, useRef, useState } from 'react'

/** Fait défiler un nombre jusqu'à sa nouvelle valeur (0,6 s), sauf si l'appareil demande moins d'animations. */
export function useAnime(cible: number): number {
  const [valeur, setValeur] = useState(cible)
  const depart = useRef(cible)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValeur(cible)
      return
    }
    const de = depart.current
    const t0 = performance.now()
    let id = 0
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / 600)
      const v = de + (cible - de) * (1 - Math.pow(1 - k, 3))
      depart.current = v
      setValeur(v)
      if (k < 1) id = requestAnimationFrame(pas)
    }
    id = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(id)
  }, [cible])
  return valeur
}
