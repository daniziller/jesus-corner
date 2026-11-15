// sealDetails.js — o que G8 (Livro completo) e G10 (Um selo) mostram de
// um livro terminado, além do selo em si: "{n} capítulos em {d} dias"
// (chapters_read, do primeiro ao último capítulo), "{t} de leitura"
// (session_seconds com `livro`), o primeiro versículo destacado no livro
// (highlights + texto da Bíblia), as notas do livro e a reflexão do
// último dia (notes). Parte pura testável (summarize*) + um carregador
// com I/O (loadSealDetails).
import { bookInfo, blockById } from '../data/gamificationBlocks.js'
import { dateKey, parseLocalDateKey } from '../utils/dateKey.js'
import { formatInt, formatDuration, dayMonthLong } from './format.js'
import { bookShort } from '../biblioteca/tiposMath.js'
import { bookNameFor } from '../utils/progress.js'
import { blockLabel } from '../data/achievements.js'
import { tr, trN } from '../i18n/tr.js'

const tx = (lang, key, vars) => tr(lang, `conquistasTx.${key}`, vars)
const txN = (lang, base, n, vars) => trN(lang, `conquistasTx.${base}`, n, { n: formatInt(n, lang), ...vars })

// Estado do selo (HANDOFF §6): 'completo' | 'andamento' | 'nao'.
export function sealState(lidos, total) {
  if (lidos >= total) return 'completo'
  if (lidos > 0) return 'andamento'
  return 'nao'
}

// Dias do primeiro ao último capítulo (inclusive), em dias locais; null
// se algum capítulo não tem linha datada.
export function readingSpanDays(nome, total, chapterRows) {
  const keys = []
  for (let ch = 1; ch <= total; ch++) {
    const row = (chapterRows ?? []).find(r => r.livro === nome && r.capitulo === ch && r.created_at)
    if (!row) return null
    keys.push(dateKey(new Date(row.created_at)))
  }
  keys.sort()
  const first = parseLocalDateKey(keys[0])
  const last = parseLocalDateKey(keys[keys.length - 1])
  return Math.round((last - first) / 86400000) + 1
}

// Segundos de leitura registrados com este livro; 0 quando nada foi
// registrado (leituras anteriores à coluna `livro`) — a tela esconde.
export function readingSecondsOf(nome, sessionRows) {
  return (sessionRows ?? []).filter(r => r?.livro === nome && r.passo === 'reading').reduce((s, r) => s + (r.segundos ?? 0), 0)
}

// Primeira marcação (por createdAt) feita neste livro, não escondida.
export function firstHighlightOf(nome, highlights) {
  return [...(highlights ?? [])]
    .filter(h => h && !h.hidden && h.book === nome && h.chapter && Array.isArray(h.verses) && h.verses.length > 0)
    .sort((a, b) => ((a.createdAt ?? '') < (b.createdAt ?? '') ? -1 : 1))[0] ?? null
}

// Notas de leitura deste livro ("Livro:a-b" — ver notesStore.noteKeyFor).
export function countBookNotes(nome, notes) {
  return Object.keys(notes ?? {}).filter(k => k.startsWith(`${nome}:`) && /:\d+-\d+$/.test(k)).length
}

// Linha de G8: o que este livro representa.
export function representsPhrase({ livrosCompletos, blocoCompletadoNome }, lang = 'pt') {
  if (blocoCompletadoNome) return tx(lang, 'repBlock', { block: blocoCompletadoNome })
  if (livrosCompletos <= 1) return tx(lang, 'repFirst')
  return tx(lang, 'repNth', { n: formatInt(livrosCompletos, lang) })
}

export function daysLabel(days, lang = 'pt') {
  return days == null ? null : txN(lang, 'days', days)
}

// "52 minutos de leitura" · "1 hora de leitura" · "2 h 05 de leitura" (G10).
export function readingTimeSentence(seconds, lang = 'pt') {
  const min = Math.round(seconds / 60)
  if (min < 60) return txN(lang, 'readMin', min)
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return txN(lang, 'readHour', h)
  return tx(lang, 'readHM', { h: formatInt(h, lang), m: String(m).padStart(2, '0') })
}

export function terminadoEm(completedAtIso, lang = 'pt') {
  return tx(lang, 'finishedOn', { date: dayMonthLong(completedAtIso, lang) })
}

export function summarizeSeal(nome, { seal, chapterRows, sessionRows, lang = 'pt' }) {
  const info = bookInfo(nome)
  const bloco = blockById(info.blocoId)
  const days = readingSpanDays(nome, info.capitulos, chapterRows)
  const seconds = readingSecondsOf(nome, sessionRows)
  return {
    nome, displayName: bookNameFor(nome, lang), sigla: lang === 'en' ? bookShort(nome, lang) : info.sigla, posicao: info.posicao, capitulos: info.capitulos,
    blocoId: bloco.id, blocoNome: blockLabel(bloco.id, lang),
    completedAt: seal?.completedAt ?? null, dateKnown: !!seal?.dateKnown, readings: Math.min(3, seal?.readings ?? 1),
    days, daysLabel: daysLabel(days, lang),
    seconds, timeLabel: seconds > 0 ? formatDuration(seconds) : null,
  }
}

// Os selos completos mais recentes, o mais novo primeiro (quadrado "Selos"
// do Hoje). `completos`: nomes dos livros completos (computeBibleProgress);
// `bookSeals`: { nome: { completedAt } } da linha gravada. Livro completo
// ainda sem linha gravada (a avaliação roda um instante depois) conta como
// o mais novo; empate de data → ordem em que `completos` veio.
export function recentSeals(completos, bookSeals, n = 3) {
  return (completos ?? [])
    .map((nome, i) => ({ nome, i, at: bookSeals?.[nome]?.completedAt ?? null }))
    .sort((a, b) => {
      if (a.at === b.at) return a.i - b.i
      if (a.at === null) return -1
      if (b.at === null) return 1
      return a.at < b.at ? 1 : -1
    })
    .slice(0, n)
    .map(x => x.nome)
}
