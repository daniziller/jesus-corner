// "O que ficou desta anotação" (34h, turno 34, handoff-anotacao-34/,
// Regra 4 §10) — analisa só as palavras que a PRÓPRIA PESSOA escreveu
// (parágrafos de texto + tópicos; nunca os versículos citados, que são
// texto bíblico). Chamado só com ~40+ palavras escritas — quem chama já
// filtra isso antes (ver estimateWordCount em sermonNotesStore.js),
// então esta rota não recebe textos curtos demais pra ter padrão real.
//
// Verificação (adaptada da "regra de ouro" de generate-study-synthesis.js):
// ali `highlightQuote` precisa ser substring LITERAL de uma resposta —
// aqui a frase em destaque é uma SÍNTESE da IA (não um trecho copiado),
// então a checagem é por PALAVRAS-CHAVE reais da frase aparecendo no
// texto original — sem isso, não tem como confirmar que a IA não
// inventou um assunto que não estava lá.
import { createClient } from '@supabase/supabase-js'
import { generateSermonSummary } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MAX_TEXT_LENGTH = 8000
const MIN_WORDS = 30 // piso do lado do servidor; o cliente já filtra em ~40

function foldWords(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 3)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })

  const ent = await fetchEntitlement(supabase, userData.user.id)
  if (!ent.hasAI) return res.status(403).json({ error: 'ai_tier_required' })

  const { text, lang } = req.body ?? {}
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const cleanText = typeof text === 'string' ? text.trim().slice(0, MAX_TEXT_LENGTH) : ''
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length
  if (wordCount < MIN_WORDS) return res.status(400).json({ error: 'text_too_short' })

  let raw
  try {
    raw = await generateSermonSummary({ text: cleanText, lang: cleanLang })
  } catch (err) {
    console.error('[generate-sermon-summary] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  // A frase em destaque precisa ter pelo menos uma palavra real (não
  // conectivo) que apareça de verdade no texto que ela escreveu — sem
  // isso, não tem garantia de que a IA não inventou um assunto.
  const sourceWords = new Set(foldWords(cleanText))
  const highlightWords = foldWords(raw.highlight ?? '')
  const hasRealOverlap = highlightWords.some(w => sourceWords.has(w))
  if (!raw.highlight?.trim() || !hasRealOverlap) {
    console.error('[generate-sermon-summary] highlight failed keyword verification, discarding response')
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  return res.status(200).json({
    ok: true,
    summary: { before: raw.before?.trim() || '', highlight: raw.highlight.trim(), after: raw.after?.trim() || '' },
  })
}
