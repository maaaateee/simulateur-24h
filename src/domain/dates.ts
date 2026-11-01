// Dates manipulées en "YYYY-MM-DD" (heure locale, sans fuseau) pour éviter les décalages UTC.

export type ISODate = string

export const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(y: number, m: number, d: number): ISODate {
  return `${y}-${pad(m)}-${pad(d)}`
}

/** Date du jour (heure locale de l'appareil). */
export function aujourdhui(): ISODate {
  const n = new Date()
  return toISO(n.getFullYear(), n.getMonth() + 1, n.getDate())
}

export function parseISO(iso: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

/** Date UTC à minuit, utilisée uniquement pour l'arithmétique de jours. */
export function utc(iso: ISODate): Date {
  const { y, m, d } = parseISO(iso)
  return new Date(Date.UTC(y, m - 1, d))
}

export function fromUTC(date: Date): ISODate {
  return toISO(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

export function addDays(iso: ISODate, n: number): ISODate {
  const dt = utc(iso)
  dt.setUTCDate(dt.getUTCDate() + n)
  return fromUTC(dt)
}

/** 0 = dimanche … 6 = samedi */
export function weekday(iso: ISODate): number {
  return utc(iso).getUTCDay()
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Mois de la période de modulation (1er avril N → 31 mars N+1). */
export function modulationMonths(startYear: number): { y: number; m: number }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = ((3 + i) % 12) + 1
    return { y: m >= 4 ? startYear : startYear + 1, m }
  })
}

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const JOURS_COURTS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']
export const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
