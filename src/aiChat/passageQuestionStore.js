// "Perguntar" sobre um trecho selecionado — telas 10a/10b do redesign
// Bento (ver ADENDO-identidade-e-IA.md). Diferente de aiChatStore.js (chat
// livre, histórico salvo no servidor): aqui a pergunta E a resposta ficam
// só no aparelho (localStorage), agrupadas por capítulo — "Perguntas e
// respostas salvas em localStorage por padrão", desligável/apagável em
// Ajustes (10f, ainda não implementado). O ENVIO em si passa pelo servidor
// (api/ask-about-passage.js), que decide a resposta e confere a citação —
// aqui só guarda o resultado depois de já verificado.
import { supabase } from '../lib/supabaseClient'

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
export async function askAboutPassage({ book, bookEn, chapter, verseStart, verseEnd, question, lang }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/ask-about-passage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, bookEn, chapter, verseStart, verseEnd, question, lang }),
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
