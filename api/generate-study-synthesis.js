// Estudo concluído (41g, turno 41, handoff-estudos-41/) — "o fio das suas
// respostas": analisa os textos que a PRÓPRIA PESSOA escreveu ao longo do
// estudo (nunca o texto bíblico) e escolhe uma frase pra destacar. Só
// chamado com 3+ respostas escritas (regra 4 §9: "com menos de 3
// respostas escritas, só a frase" — sem síntese nenhuma, quem chama
// resolve isso localmente sem gastar uma chamada de IA à toa).
//
// Regra de ouro adaptada: `highlightQuote` só sai se for mesmo uma
// substring literal de uma das respostas fornecidas — a IA não pode
// "melhorar" ou reescrever a frase da pessoa. Se não bater, a resposta
// inteira é descartada.
import { createClient } from '@supabase/supabase-js'
import { generateStudySynthesis } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MAX_ANSWERS = 30
const MAX_ANSWER_LENGTH = 2000

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })

  const ent = await fetchEntitlement(supabase, userData.user.id)
  if (!ent.hasAI) return res.status(403).json({ error: 'subscription_required' })

  const { answers, lang } = req.body ?? {}
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  if (!Array.isArray(answers) || answers.length < 3 || answers.length > MAX_ANSWERS) {
    return res.status(400).json({ error: 'invalid_answers' })
  }
  const cleanAnswers = answers
    .filter(a => Number.isInteger(a?.dayIndex) && typeof a?.text === 'string' && a.text.trim())
    .map(a => ({ dayIndex: a.dayIndex, text: a.text.trim().slice(0, MAX_ANSWER_LENGTH) }))
  if (cleanAnswers.length < 3) return res.status(400).json({ error: 'invalid_answers' })

  let raw
  try {
    raw = await generateStudySynthesis({ answers: cleanAnswers, lang: cleanLang })
  } catch (err) {
    console.error('[generate-study-synthesis] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  // Regra de ouro: a frase em destaque só sai se existir de verdade,
  // literalmente, dentro de alguma resposta fornecida.
  const match = cleanAnswers.find(a => raw.highlightQuote && a.text.includes(raw.highlightQuote.trim()))
  if (!match) {
    console.error('[generate-study-synthesis] highlight quote failed verification, discarding response')
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  return res.status(200).json({
    ok: true,
    synthesis: { body: raw.synthesisBody, highlightDayIndex: match.dayIndex, highlightQuote: raw.highlightQuote.trim() },
  })
}
