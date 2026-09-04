// "Perguntar" sobre um trecho selecionado — telas 10a/10b do redesign
// Bento (ver ADENDO-identidade-e-IA.md). Diferente de aiChatStore.js (chat
// livre, histórico salvo no servidor): aqui a pergunta E a resposta ficam
// só no aparelho (localStorage), agrupadas por capítulo — "Perguntas e
// respostas salvas em localStorage por padrão", desligável/apagável em
// Ajustes (10f, ainda não implementado). O ENVIO em si passa pelo servidor
// (api/ask-about-passage.js), que decide a resposta e confere a citação —
// aqui só guarda o resultado depois de já verificado.
import { supabase } from '../lib/supabaseClient'
import { getResponseTone } from './aiPreferencesStore'

const KEY = 'jc_passage_questions'

function chapterKey(book, chapter) {
  return `${book}:${chapter}`
}

function readAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

function writeAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* privado/cota cheia — só não persiste */ }
}

// Todas as perguntas já salvas de um capítulo (mais recente por último) —
// usado pra reabrir o histórico daquele capítulo, e futuramente pra listar
// na Biblioteca junto das notas.
export function getQuestionsForChapter(book, chapter) {
  return readAll()[chapterKey(book, chapter)] ?? []
}

export function getAllPassageQuestions() {
  return readAll()
}

function saveLocally(entry) {
  const all = readAll()
  const key = chapterKey(entry.book, entry.chapter)
  all[key] = [...(all[key] ?? []), entry]
  writeAll(all)
}

// Tira do aparelho uma pergunta já guardada — usado por "Reportar resposta"
// (10b): ao reportar, a resposta sai do histórico. Casa pela pergunta e pelo
// trecho (a mesma pergunta sobre o mesmo trecho é, na prática, a mesma
// entrada; se houver mais de uma, sai a mais recente).
export function removePassageQuestion({ book, chapter, verseStart, verseEnd, question }) {
  const all = readAll()
  const key = chapterKey(book, chapter)
  const list = all[key] ?? []
  let idx = -1
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i]
    if (e.question === question && e.verseStart === verseStart && e.verseEnd === verseEnd) { idx = i; break }
  }
  if (idx < 0) return false
  list.splice(idx, 1)
  if (list.length) all[key] = list
  else delete all[key]
  writeAll(all)
  return true
}

// "Reportar resposta" (10b) — manda o par pergunta+resposta pra revisão
// (api/report-ai-answer.js) e tira a entrada do histórico local. A remoção
// local acontece mesmo se o envio falhar: a pessoa pediu pra sumir com a
// resposta, e isso não depende de rede.
export async function reportPassageAnswer({ book, bookEn, chapter, verseStart, verseEnd, question, answer, lang }) {
  removePassageQuestion({ book, chapter, verseStart, verseEnd, question })
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/report-ai-answer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, bookEn, chapter, verseStart, verseEnd, question, answer, lang, tone: getResponseTone() }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || `request_failed_${res.status}`)
  }
}

// "Apagar todas as perguntas" (10f) — limpa tudo de uma vez, em qualquer
// capítulo.
export function clearAllPassageQuestions() {
  try { localStorage.removeItem(KEY) } catch { /* ignora */ }
}

// Liga/desliga guardar novas perguntas (10f — "Guardar minhas perguntas").
// Desligar não apaga o que já existe, só para de somar novas (mesmo
// espírito de qualquer outro interruptor de preferência do app).
const SAVE_ENABLED_KEY = 'jc_passage_questions_save_enabled'
export function getSaveQuestionsEnabled() {
  try {
    const v = localStorage.getItem(SAVE_ENABLED_KEY)
    return v === null ? true : v === '1'
  } catch {
    return true
  }
}
export function setSaveQuestionsEnabled(enabled) {
  try { localStorage.setItem(SAVE_ENABLED_KEY, enabled ? '1' : '0') } catch { /* ignora */ }
}

// Manda a pergunta pro servidor (que decide/verifica a resposta) e, se
// guardar estiver ligado, já salva o par pergunta+resposta localmente antes
// de devolver — quem chama não precisa se preocupar em salvar depois.
// Sugestões de pergunta pro menu 10a — GET público, cacheado na borda
// (ver api/suggest-passage-questions.js). Quem chama trata falha como
// "usa as três sugestões fixas", nunca como erro visível.
export async function fetchPassageSuggestions({ book, bookEn, chapter, verseStart, verseEnd, lang }) {
  const params = new URLSearchParams({ book, chapter: String(chapter), verseStart: String(verseStart), verseEnd: String(verseEnd), lang: lang === 'en' ? 'en' : 'pt' })
  if (bookEn) params.set('bookEn', bookEn)
  const res = await fetch(`/api/suggest-passage-questions?${params}`)
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  const body = await res.json()
  return Array.isArray(body.questions) ? body.questions.slice(0, 3) : []
}

export async function askAboutPassage({ book, bookEn, chapter, verseStart, verseEnd, question, lang }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/ask-about-passage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    // tone — Ajustes do assistente (10f, ver aiPreferencesStore.js).
    body: JSON.stringify({ book, bookEn, chapter, verseStart, verseEnd, question, lang, tone: getResponseTone() }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body?.error || `request_failed_${res.status}`)
    if (body?.remaining != null) Object.assign(err, { used: body.used, remaining: body.remaining, max: body.max })
    throw err
  }
  if (getSaveQuestionsEnabled()) {
    saveLocally({
      book, bookEn, chapter, verseStart, verseEnd, question,
      answer: body.answer, createdAt: new Date().toISOString(),
    })
  }
  return { answer: body.answer, used: body.used, remaining: body.remaining, max: body.max }
}
