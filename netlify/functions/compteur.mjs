// Reçoit les événements anonymes du simulateur et en garde un par clé (aucune donnée personnelle).
import { getStore } from '@netlify/blobs'
import { filtrer } from '../compteur-commun.mjs'

export default async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 })
  let corps
  try {
    corps = await req.json()
  } catch {
    return new Response(null, { status: 400 })
  }
  const evenements = filtrer(corps?.e)
  if (evenements.length) {
    const store = getStore('compteur')
    const jour = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
    await Promise.all(evenements.map((e) => store.set(`e/${jour}/${e}/${crypto.randomUUID()}`, '1')))
  }
  return new Response(null, { status: 204 })
}

export const config = { path: '/api/compteur' }
