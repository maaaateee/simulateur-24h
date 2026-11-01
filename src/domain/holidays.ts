import { addDays, toISO, type ISODate } from './dates'

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher). */
export function easter(y: number): ISODate {
  const a = y % 19
  const b = Math.floor(y / 100)
  const c = y % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return toISO(y, month, day)
}

/** Jours fériés payés comme tels à ADP. Le dimanche de Pentecôte et le lundi de Pentecôte restent à confirmer. */
export function holidays(y: number): Map<ISODate, string> {
  const p = easter(y)
  return new Map([
    [toISO(y, 1, 1), "Jour de l'an"],
    // Payé comme férié par ADP (vérifié sur la paie d'avril 2026), bien que non férié légalement.
    [p, 'Dimanche de Pâques'],
    [addDays(p, 1), 'Lundi de Pâques'],
    [toISO(y, 5, 1), 'Fête du travail'],
    [toISO(y, 5, 8), 'Victoire 1945'],
    [addDays(p, 39), 'Ascension'],
    [addDays(p, 50), 'Lundi de Pentecôte'],
    [toISO(y, 7, 14), 'Fête nationale'],
    [toISO(y, 8, 15), 'Assomption'],
    [toISO(y, 11, 1), 'Toussaint'],
    [toISO(y, 11, 11), 'Armistice 1918'],
    [toISO(y, 12, 25), 'Noël'],
  ])
}

const cache = new Map<number, Map<ISODate, string>>()

export function holidayName(iso: ISODate): string | undefined {
  const y = Number(iso.slice(0, 4))
  if (!cache.has(y)) cache.set(y, holidays(y))
  return cache.get(y)!.get(iso)
}
