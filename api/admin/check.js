// Chamado uma vez no bootstrap do app (ver src/App.jsx) pra decidir se
// mostra a aba Admin — requireAdmin já escreve o 401/403 sozinho quando não
// passa, então o client só precisa tratar "não veio 200" como isAdmin=false.
import { requireAdmin } from '../_lib/adminAuth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  return res.status(200).json({ isAdmin: true })
}
