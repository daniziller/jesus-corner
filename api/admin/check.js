// Chamado uma vez no bootstrap do app (ver src/App.jsx) pra decidir se
// mostra a aba Admin — requireAdmin já escreve o 401/403 sozinho quando não
// passa, então o client só precisa tratar "não veio 200" como isAdmin=false.
import { requireAdmin, adminMfaRequired } from '../_lib/adminAuth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  // Sem exigir a segunda etapa aqui: é este endpoint que conta ao painel
  // se ela falta (mfaRequired + aal), pra abrir o cadastro/verificação do
  // autenticador (src/admin/AdminMfaGate.jsx).
  const caller = await requireAdmin(req, res, { allowWithoutMfa: true, log: false })
  if (!caller) return

  return res.status(200).json({ isAdmin: true, mfaRequired: adminMfaRequired(), aal: caller.aal })
}
