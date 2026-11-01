// Lecture d'un bulletin de paie ADP à partir du texte natif du PDF (pas d'OCR).
// On ne garde que ce qui sert au contrôle : période, lignes de majorations et de CP, informations journalières, soldes.
// IBAN, n° de sécurité sociale, adresse et montants nets ne sont jamais extraits.

import { toISO, type ISODate } from '../domain/dates'
import type { TextItem } from './pdf'

const MOIS_MAJ = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE']

export interface PayLine {
  libelle: string
  /** Mois de référence de l'élément ("05" dans "MAJ.75% … 05+"), en "YYYY-MM". */
  mois?: string
  sens?: '+' | '-'
  nombre?: number
  taux?: number
  montant?: number
  /** Type reconnu pour le contrôle des majorations. */
  type?: 'maj75' | 'maj100' | 'autre'
}

export interface PayDay {
  date: ISODate
  travail?: number
  incident?: { heures: number; code: string }
}

export interface Payslip {
  /** Mois de paie "YYYY-MM". */
  periode: string
  matricule?: string
  lignes: PayLine[]
  /** Période des informations journalières (mois précédent en général). */
  journalier?: { du: ISODate; au: ISODate }
  jours: PayDay[]
  soldes: { cp?: number; jrttHeures?: number; recupJf?: number }
  /** Échelon (ex. 121S), traitement de base mensuel et taux d'ancienneté (%), pour vérifier l'avancement. */
  echelon?: string
  traitementBase?: number
  ancienneteTaux?: number
  /** Légende des codes des informations journalières (ex. EM → ENFANT MALADE). */
  legende?: Record<string, string>
  /** Éléments du brut (libellé, montant signé), le brut total, les cotisations salariales et le taux d'impôt à la source : pour la simulation. */
  elements?: { libelle: string; montant: number }[]
  brut?: number
  cotisationsSalariales?: number
  tauxPas?: number
}

const num = (s: string | undefined, decimals: number) => {
  if (!s) return undefined
  const neg = s.endsWith('-')
  const v = Number(s.replace('-', '')) / 10 ** decimals
  return neg ? -v : v
}
const frNum = (s: string | undefined) => (s ? Number(s.replace(/\s/g, '').replace(',', '.')) : undefined)

/** Regroupe les morceaux de texte par ligne (même ordonnée, à 2 pt près). */
function lines(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
  const out: TextItem[][] = []
  for (const it of sorted) {
    const last = out[out.length - 1]
    if (last && last[0].page === it.page && Math.abs(last[0].y - it.y) <= 2) last.push(it)
    else out.push([it])
  }
  return out.map((l) => l.sort((a, b) => a.x - b.x))
}

const text = (l: TextItem[]) => l.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()

export function parsePayslip(items: TextItem[]): Payslip {
  const ls = lines(items)
  const all = ls.map(text)

  // Période d'emploi : "PERIODE D'EMPLOI DU : 01 JUIN 2026"
  const per = all.map((t) => t.match(/PERIODE D'EMPLOI DU : \d{2} ([A-ZÉÛ]+) (\d{4})/)).find(Boolean)
  if (!per) throw new Error("Ce PDF ne ressemble pas à un bulletin de paie ADP (période d'emploi introuvable).")
  const pm = MOIS_MAJ.indexOf(per[1].normalize('NFD').replace(/[̀-ͯ]/g, '')) + 1
  const py = Number(per[2])
  const periode = `${py}-${String(pm).padStart(2, '0')}`
  const matricule = all.map((t) => t.match(/NO DE SALARIE : (\d{8})/)?.[1]).find(Boolean)

  const refMonth = (mm: string) => {
    const m = Number(mm)
    return `${m > pm ? py - 1 : py}-${mm}`
  }

  // Corps du bulletin : colonnes désignation (< 270 pt), nombre (270-305), taux (305-350), montant (350-400).
  const lignes: PayLine[] = []
  for (const l of ls) {
    const body = l.filter((i) => i.x < 445)
    if (!body.length) continue
    const des = body.filter((i) => i.x < 270).map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()
    const ref = des.match(/ (\d{2})([+-])$/)
    if (!ref || !/^(MAJ|ABS|PAI|HS|HC|IDT|IND|PRIME)/.test(des)) continue
    const col = (a: number, b: number) => body.find((i) => i.x >= a && i.x < b)?.str
    const libelle = des.slice(0, ref.index).trim()
    const type = /^MAJ\./.test(libelle) ? (/JF/.test(libelle) ? 'maj100' : /75%/.test(libelle) ? 'maj75' : 'autre') : 'autre'
    lignes.push({
      libelle,
      mois: refMonth(ref[1]),
      sens: ref[2] as '+' | '-',
      nombre: num(col(270, 305), 2),
      taux: num(col(305, 350), 3),
      montant: num(col(350, 400), 2),
      type,
    })
  }

  // Informations journalières : "DU 01-05-2026 AU 31-05-2026" puis une ligne par jour à droite (x > 445).
  const jr = all.map((t) => t.match(/DU (\d{2})-(\d{2})-(\d{4}) AU (\d{2})-(\d{2})-(\d{4})/)).find(Boolean)
  const journalier = jr ? { du: toISO(+jr[3], +jr[2], +jr[1]), au: toISO(+jr[6], +jr[5], +jr[4]) } : undefined
  const jours: PayDay[] = []
  if (journalier) {
    const [y, m] = journalier.du.split('-').map(Number)
    for (const l of ls) {
      const right = l.filter((i) => i.x >= 445)
      const t = right.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()
      // "L 1111 00 1 00 TH" : jour 11, travail 11,00 h, incident 1,00 h de RTT
      const d = t.match(/^[LMJVSD] (\d{2})(\d{1,2} \d{2})?(?: (\d{1,2} \d{2}) ([A-Z]{2}))?$/)
      // Certains bulletins font deux pages avec le même journalier : on garde la première occurrence.
      if (!d || jours.some((j) => j.date === toISO(y, m, Number(d[1])))) continue
      jours.push({
        date: toISO(y, m, Number(d[1])),
        travail: d[2] ? frNum(d[2].replace(' ', ',')) : undefined,
        incident: d[3] ? { heures: frNum(d[3].replace(' ', ','))!, code: d[4] } : undefined,
      })
    }
  }

  const joined = all.join(' ')
  const soldes = {
    cp: frNum(joined.match(/CP EN COURS : ([\d,]+)/)?.[1]),
    jrttHeures: frNum(joined.match(/HEURES JRTT : ([\d,]+)/)?.[1]),
    recupJf: frNum(joined.match(/RECUP JF : ([\d,]+)/)?.[1]),
  }

  // Échelon et éléments de base (pas de net, pas de cotisations).
  const echelon = all.map((t) => t.match(/ECHELON : (\d{3}[A-Z]?)/)?.[1]).find(Boolean)
  const ligneDe = (re: RegExp) => ls.find((l) => re.test(l.filter((i) => i.x < 270).map((i) => i.str).join(' ')))
  const colonne = (l: TextItem[] | undefined, a: number, b: number) => l?.find((i) => i.x >= a && i.x < b)?.str
  const tb = ligneDe(/^TRAITEMENT DE BASE/)
  const anc = ligneDe(/^ANCIENNETE/)
  const traitementBase = num(colonne(tb, 350, 400), 2)
  const ancienneteTaux = num(colonne(anc, 305, 350), 3)

  // Légende en bas des informations journalières : « FP JOURNEE FORM.PAYEE », « EM ENFANT MALADE »…
  const legende: Record<string, string> = {}
  for (const l of ls) {
    const t = l.filter((i) => i.x >= 445).map((i) => i.str).join(' ').trim()
    const m = t.match(/^([A-Z]{2}) ([A-Z][A-Z .'/()-]{3,})$/)
    if (m && l[0].y > 700) legende[m[1]] = m[2].trim()
  }

  // Éléments de rémunération : toutes les lignes du corps jusqu'au total « REMUNERATION BRUTE ».
  const elements: { libelle: string; montant: number }[] = []
  let brut: number | undefined
  let cotisationsSalariales: number | undefined
  let tauxPas: number | undefined
  for (const l of ls) {
    const body = l.filter((i) => i.x < 445)
    const des = body.filter((i) => i.x < 270).map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()
    if (!des) continue
    const total = des.match(/^\*(REMUNERATION BRUTE|COTISAT\.SALARIALES).*?(\d{3,}-?)$/)
    if (total) {
      if (total[1] === 'REMUNERATION BRUTE') brut = num(total[2], 2)
      else cotisationsSalariales = Math.abs(num(total[2], 2) ?? 0)
      continue
    }
    if (/^IMPOT SUR LE REVENU PRELEVE/.test(des)) tauxPas = num(colonne(l, 305, 350), 3)
    if (brut !== undefined) continue
    const montant = num(colonne(body, 350, 400), 2)
    if (montant !== undefined && Number.isFinite(montant) && /^[A-Z]/.test(des)) elements.push({ libelle: des, montant })
  }

  return { periode, matricule, lignes, journalier, jours, soldes, echelon, traitementBase, ancienneteTaux, legende, elements, brut, cotisationsSalariales, tauxPas }
}
