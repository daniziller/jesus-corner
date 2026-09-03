// Reflexão com perguntas geradas — tela 10d do redesign Bento (ver
// ADENDO-identidade-e-IA.md). As PERGUNTAS vêm de api/generate-reflection-
// questions.js (público, cacheado — igual pra quem leu o mesmo capítulo);
// compor o parágrafo final a partir das respostas da pessoa é
// api/compose-reflection.js (por usuário, autenticado). O par
// perguntas+respostas+parágrafo aprovado fica salvo aqui, no aparelho —
// mesmo padrão/mesmo interruptor de "Guardar minhas perguntas" (10f) que
// src/aiChat/passageQuestionStore.js já usa pra 10a/10b (é uma coisa só na
// cabeça da pessoa: "minhas conversas com a IA", não duas listas
// separadas).
import { supabase } from '../lib/supabaseClient'
import { getSaveQuestionsEnabled } from './passageQuestionStore'

const ENABLED_KEY = 'jc_reflection_questions_enabled'
const STORE_KEY = 'jc_reflections'

// Desligado por padrão (ver ADENDO, tabela de 10f) — ao contrário do
// contexto de capítulo (10c), que já nasce ligado. Reflexão é uma
// substituição bem mais radical do fluxo atual (troca as fases com
// cronômetro pelas 3 perguntas — ver ReflectionScreen.jsx), então a
// pessoa opta por entrar, em vez de já cair nela.
export function getReflectionQuestionsEnabled() {
  try {
    const v = localStorage.getItem(ENABLED_KEY)
    return v === null ? false : v === '1'
  } catch {
    return false
  }
}
export function setReflectionQuestionsEnabled(enabled) {
  try { localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0') } catch { /* ignora */ }
}

function readAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}
function writeAll(all) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(all)) } catch { /* privado/cota cheia — só não persiste */ }
}

export function getAllReflections() {
  return readAll()
}

// "Apagar todas as perguntas" (10f) — mesmo botão que limpa
// passageQuestionStore.js também chama isto (é "minhas perguntas" junto,
// uma coisa só na cabeça da pessoa — ver AiSettingsScreen.jsx).
export function clearAllReflections() {
  try { localStorage.removeItem(STORE_KEY) } catch { /* ignora */ }
}

// Chamada depois que a pessoa aprova o parágrafo (ver ReflectionScreen.jsx)
// — só guarda se "Guardar minhas perguntas" estiver ligado.
function saveLocally(entry) {
  if (!getSaveQuestionsEnabled()) return
  writeAll([...readAll(), entry])
}

// GET público — mesmo espírito de fetchChapterContext em
// chapterContextStore.js: falha vira "pula pro fluxo antigo" pra quem
// chama, nunca uma parede.
export async function fetchReflectionQuestions({ book, bookEn, chStart, chEnd, lang }) {
  const params = new URLSearchParams({ book, chStart: String(chStart), chEnd: String(chEnd ?? chStart), lang: lang === 'en' ? 'en' : 'pt' })
  if (bookEn) params.set('bookEn', bookEn)
  const res = await fetch(`/api/generate-reflection-questions?${params}`)
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  const body = await res.json()
  return body.questions
}

// Junta as 3 respostas num parágrafo (rascunho — a pessoa ainda aprova
// antes de salvar, ver ReflectionScreen.jsx) e, se aprovado, chama
// saveLocally acima.
export async function composeReflectionDraft({ book, chapter, lang, qa }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/compose-reflection', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, chapter, lang, qa }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body?.error || `request_failed_${res.status}`)
    if (body?.remaining != null) Object.assign(err, { used: body.used, remaining: body.remaining, max: body.max })
    throw err
  }
  return body.paragraph
}

export function saveApprovedReflection({ book, chapter, qa, paragraph }) {
  saveLocally({ book, chapter, qa, paragraph, createdAt: new Date().toISOString() })
}
