// Contexto antes do capítulo — tela 10c do redesign Bento (ver
// ADENDO-identidade-e-IA.md). O conteúdo em si vem de api/generate-
// chapter-context.js (público, cacheado na borda — ver comentário lá);
// aqui só ficam duas coisas locais ao aparelho: o interruptor "Contexto
// antes do capítulo" (10f, ainda não implementado — liga por padrão) e
// quais capítulos a pessoa já viu o contexto (pra não mostrar de novo
// toda vez que reabrir o mesmo capítulo).
const ENABLED_KEY = 'jc_chapter_context_enabled'
const SEEN_KEY = 'jc_chapter_context_seen'

export function getChapterContextEnabled() {
  try {
    const v = localStorage.getItem(ENABLED_KEY)
    return v === null ? true : v === '1'
  } catch {
    return true
  }
}
export function setChapterContextEnabled(enabled) {
  try { localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0') } catch { /* ignora */ }
}

function seenKey(book, chapter, lang) {
  return `${book}:${chapter}:${lang}`
}

function readSeen() {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY))
    return Array.isArray(raw) ? new Set(raw) : new Set()
  } catch {
    return new Set()
  }
}

export function isChapterContextSeen(book, chapter, lang) {
  return readSeen().has(seenKey(book, chapter, lang))
}

// Cap de tamanho (500 entradas, remove as mais antigas) — só pra o registro
// não crescer sem limite pra quem lê a Bíblia inteira várias vezes; não
// precisa ser exato, é só o "já vi isso" de uma tela opcional e pulável.
const MAX_SEEN = 500
export function markChapterContextSeen(book, chapter, lang) {
  const seen = readSeen()
  seen.add(seenKey(book, chapter, lang))
  const arr = [...seen]
  const trimmed = arr.length > MAX_SEEN ? arr.slice(arr.length - MAX_SEEN) : arr
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(trimmed)) } catch { /* ignora */ }
}

// GET público (ver api/generate-chapter-context.js) — sem token, sem
// tratamento de limite diário: se falhar por qualquer motivo (rede,
// offline, servidor), quem chama trata como "pula o contexto", nunca como
// parede (ver ChapterContextScreen em ReadingBlockView.jsx).
export async function fetchChapterContext({ book, bookEn, chapter, lang }) {
  const params = new URLSearchParams({ book, chapter: String(chapter), lang: lang === 'en' ? 'en' : 'pt' })
  if (bookEn) params.set('bookEn', bookEn)
  const res = await fetch(`/api/generate-chapter-context?${params}`)
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  const body = await res.json()
  return body.context
}
