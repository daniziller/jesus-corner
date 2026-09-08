// Perguntas 1 e 2 da Reflexão (37a, pacote 36-37) — o conteúdo vem de
// api/generate-reflection-question-pair.js (POST, autenticado, SEM cache:
// "Trocar perguntas" precisa de um par novo a cada toque, diferente do
// resto das telas de IA do app, que cacheiam por capítulo). Nada fica
// guardado aqui no aparelho — as respostas da pessoa são notas comuns
// (notesStore.js, chave reflection:{dia}, ver ReflectionScreen.jsx).
import { supabase } from '../lib/supabaseClient'

export async function fetchReflectionQuestionPair({ book, bookEn, chStart, chEnd, lang, avoidQuestions }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/generate-reflection-question-pair', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, bookEn, chStart, chEnd, lang: lang === 'en' ? 'en' : 'pt', avoidQuestions }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body?.error || `request_failed_${res.status}`)
    if (body?.remaining != null) Object.assign(err, { used: body.used, remaining: body.remaining, max: body.max })
    throw err
  }
  return body.questions
}
