import { useEffect, useState } from 'react'

/** État gardé dans le navigateur (localStorage), pour retrouver sa simulation en revenant. */
export function useStored<T>(key: string, initial: T): [T, (v: T | ((old: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? { ...initial, ...JSON.parse(raw) } : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Navigation privée : la simulation n'est simplement pas gardée.
    }
  }, [key, value])
  return [value, setValue]
}
