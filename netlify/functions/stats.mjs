// Page de statistiques, réservée à qui a la clé (variable d'environnement STATS_CLE).
import { getStore } from '@netlify/blobs'
import { agreger, pageStats } from '../compteur-commun.mjs'

export default async (req) => {
  const cle = new URL(req.url).searchParams.get('cle')
  const attendue = process.env.STATS_CLE
  const entetes = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }
  if (!attendue) return new Response('Statistiques non configurées.', { status: 503, headers: entetes })
  if (cle !== attendue) return new Response('Accès refusé.', { status: 401, headers: entetes })
  const { blobs } = await getStore('compteur').list({ prefix: 'e/' })
  return new Response(pageStats(agreger(blobs.map((b) => b.key))), { status: 200, headers: entetes })
}

export const config = { path: '/api/stats' }
