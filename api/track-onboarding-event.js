// Grava um evento do funil de onboarding (ver supabase/migrations/0022 e
// src/analytics/onboardingEvents.js). Sem autenticação de propósito — a
// maior parte do wizard roda antes de a conta existir. Validação restrita
// a uma lista fixa de passos pra não virar uma tabela de texto livre aberta
// ao público.
import { supabaseAdmin } from './_lib/invites.js'

const ALLOWED_STEPS = new Set([
  'name', 'features', 'prayerTime', 'readingPlan', 'reflectionTime', 'preview', 'signup',
  'signup_completed', 'checkout_started', 'subscribed',
])

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const { sessionId, step, userId, language } = req.body || {}
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 100) {
    return res.status(400).json({ error: 'invalid_session_id' })
  }
  if (!ALLOWED_STEPS.has(step)) return res.status(400).json({ error: 'invalid_step' })

  const { error } = await supabaseAdmin.from('onboarding_events').insert({
    session_id: sessionId,
    step,
    user_id: typeof userId === 'string' ? userId : null,
    language: language === 'en' ? 'en' : 'pt',
  })

  // Analytics nunca deve travar a experiência — loga e responde 204 mesmo
  // em erro, o cliente já ignora a resposta.
  if (error) console.error('Failed to insert onboarding event:', error.message)
  return res.status(204).end()
}
