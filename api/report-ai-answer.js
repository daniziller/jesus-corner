// "Reportar resposta" (quadro 10b) — a pessoa marca uma resposta por trecho
// como problemática. O app tira a resposta do histórico local e manda o par
// pergunta+resposta pra cá, que grava em ai_answer_reports (migration 0044)
// pra revisão. Gravado com a service role: a tabela não tem policy de
// INSERT, então só este endpoint escreve nela — e sempre em nome de quem
// está autenticado, nunca de outro usuário.
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TONES = ['direct', 'explained', 'study']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })

  const { book, chapter, verseStart, verseEnd, question, answer, lang, tone, reason } = req.body ?? {}
  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verseStart) || !Number.isInteger(verseEnd)) {
    return res.status(400).json({ error: 'invalid_payload' })
  }
  if (typeof question !== 'string' || !question.trim() || !answer || typeof answer !== 'object') {
    return res.status(400).json({ error: 'invalid_payload' })
  }

  const row = {
    user_id: userData.user.id,
    passage_key: `${String(book).slice(0, 60)}:${chapter}:${verseStart}-${verseEnd}`,
    lang: lang === 'en' ? 'en' : 'pt',
    tone: TONES.includes(tone) ? tone : null,
    question: question.trim().slice(0, 1000),
    answer,
    reason: typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 500) : null,
  }

  const { error } = await supabaseAdmin.from('ai_answer_reports').insert(row)
  if (error) {
    console.error('[report-ai-answer] insert failed', error)
    return res.status(500).json({ error: 'insert_failed' })
  }
  return res.status(200).json({ ok: true })
}
