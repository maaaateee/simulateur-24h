import { useState } from 'react'

export function BoutonTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'dark')
  const basculer = () => {
    const t = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = t
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#070b14' : '#f3f5fa')
    try {
      localStorage.setItem('simulateur-24h:theme', t)
    } catch {
      // Navigation privée : le choix n'est pas gardé.
    }
    setTheme(t)
  }
  return (
    <button type="button" className="bouton-theme" onClick={basculer} aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}>
      <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
      {theme === 'dark' ? 'Clair' : 'Sombre'}
    </button>
  )
}
