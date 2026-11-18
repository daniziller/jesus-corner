// Confere quem chama um endpoint que custa dinheiro por chamada (IA).
// Devolve { supabase, caller, ent } ou, se a pessoa não pode, responde
// 401/403 e devolve null — quem chama só precisa de `if (!who) return`.
//
// `needsAI`: além de estar logada, a pessoa precisa do Premium (o mesmo
// critério de fetchEntitlement, ver entitlement.js) — a conta grátis não
// usa IA nenhuma. `budget`: e ainda ter saldo no limite mensal de IA
// (api/_lib/aiBudget.js); sem saldo, responde 429 `ai_budget_reached`.
import { createClient } from '@supabase/supabase-js'
import { fetchEntitlement } from './entitlement.js'
import { ensureAiBudget } from './aiBudget.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

export async function requireCaller(req, res, { needsAI = false, budget = false } = {}) {
  const authHeader = req.headers.authorization
  if (!authHeader) { res.status(401).json({ error: 'unauthorized' }); return null }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) { res.status(401).json({ error: 'unauthorized' }); return null }
  const ent = await fetchEntitlement(supabase, data.user.id)
  if (needsAI && !ent.hasAI) { res.status(403).json({ error: 'subscription_required' }); return null }
  if (budget && !(await ensureAiBudget(res, data.user.id))) return null
  return { supabase, caller: data.user, ent }
}
