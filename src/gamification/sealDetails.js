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
export function representsPhrase({ livrosCompletos, blocoCompletadoNome }) {
  if (blocoCompletadoNome) return `O selo entrou na sua estante — com ele você completou ${blocoCompletadoNome}.`
  if (livrosCompletos <= 1) return 'O selo entrou na sua estante — e é o seu primeiro livro inteiro.'
  return `O selo entrou na sua estante — é o seu ${formatInt(livrosCompletos)}º livro.`
}

export function daysLabel(days) {
  return days == null ? null : `${formatInt(days)} ${days === 1 ? 'dia' : 'dias'}`
}

// "52 minutos de leitura" · "1 hora de leitura" · "2 h 05 de leitura" (G10).
export function readingTimeSentence(seconds) {
  const min = Math.round(seconds / 60)
  if (min < 60) return `${formatInt(min)} ${min === 1 ? 'minuto' : 'minutos'} de leitura`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return `${formatInt(h)} ${h === 1 ? 'hora' : 'horas'} de leitura`
  return `${formatInt(h)} h ${String(m).padStart(2, '0')} de leitura`
}

export function terminadoEm(completedAtIso) {
  return `Terminado em ${dayMonthLong(completedAtIso)}`
}

export function summarizeSeal(nome, { seal, chapterRows, sessionRows }) {
  const info = bookInfo(nome)
  const bloco = blockById(info.blocoId)
  const days = readingSpanDays(nome, info.capitulos, chapterRows)
  const seconds = readingSecondsOf(nome, sessionRows)
  return {
    nome, sigla: info.sigla, posicao: info.posicao, capitulos: info.capitulos,
    blocoId: bloco.id, blocoNome: bloco.nome,
    completedAt: seal?.completedAt ?? null, dateKnown: !!seal?.dateKnown, readings: Math.min(3, seal?.readings ?? 1),
    days, daysLabel: daysLabel(days),
    seconds, timeLabel: seconds > 0 ? formatDuration(seconds) : null,
  }
}
