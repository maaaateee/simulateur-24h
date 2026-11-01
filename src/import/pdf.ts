import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export interface TextItem {
  page: number
  /** Position en points depuis le coin haut-gauche. */
  x: number
  y: number
  str: string
}

/** Texte natif du PDF (sans OCR), pour les documents qui en contiennent, comme les fiches de paie. */
export async function textItems(data: ArrayBuffer): Promise<TextItem[]> {
  const doc = await pdfjs.getDocument({ data }).promise
  const out: TextItem[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const height = page.getViewport({ scale: 1 }).height
    const tc = await page.getTextContent()
    for (const it of tc.items) {
      if (!('str' in it) || !it.str.trim()) continue
      out.push({ page: i, x: it.transform[4], y: height - it.transform[5], str: it.str })
    }
  }
  return out
}
