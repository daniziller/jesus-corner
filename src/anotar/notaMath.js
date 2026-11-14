// notaMath.js — a folha "Nova" (N1) e a nota em um versículo (N4, handoff-
// biblioteca-55 §7A.1 e §7A.4), parte pura. Testes em
// scripts/test-nota.mjs.
//
// A nota de versículo é um registro de user_data.highlights (o mesmo das
// marcações — highlightsStore.js): { id, book, bookEn, chapter, verses,
// text, color, tags, sharedGroupIds, createdAt, date, sessionMode }. A
// que nasce como nota (o versículo não estava marcado) leva `kind:
// 'note'` e aparece em Notas; escrever numa marcação que já existia
// continua sendo uma marcação com nota.
import { formatVerseRanges } from '../utils/verseRanges.js'
import { bookDisplayName } from '../busca/referencia.js'
import { dateKey } from '../utils/dateKey.js'
import { DEFAULT_HIGHLIGHT_COLOR } from '../data/highlightColors.js'
import { whenLabel } from '../biblioteca/bibliotecaMath.js'

const oneLine = text => String(text ?? '').replace(/\s+/g, ' ').trim()

// ── N1: a folha "Nova" ──────────────────────────────────────────────────

// As quatro opções, na ordem fixa. Só "Anotação livre" é preta.
export const NEW_OPTIONS = [
  { key: 'free', title: 'Anotação livre', support: 'Uma página em branco. Dê o tipo e o título depois.', dark: true, marker: 'circle', color: 'accent' },
  { key: 'sermon', title: 'Anotar uma pregação', support: 'Sermão, culto, aula, palestra ou vídeo', marker: 'square', color: 'sand' },
  { key: 'verse', title: 'Nota em um versículo', support: 'Escolha o versículo e escreva sobre ele', marker: 'square', color: 'ink' },
  { key: 'study', title: 'Criar um estudo', support: 'Um plano de leitura sobre um tema ou livro', marker: 'circle', color: 'ink' },
]
export const NEW_TITLE = 'O que você quer guardar?'
export const NEW_SUPPORT = 'Tudo fica só com você, na sua Biblioteca.'

const firstWords = (text, max = 6) => {
  const words = oneLine(text).split(' ').filter(Boolean)
  return words.length > max ? `${words.slice(0, max).join(' ')}…` : words.join(' ')
}

// A linha do rascunho: a anotação não finalizada mais recente — "Rascunho
// de {quando}: {título} · continuar". Sem título, as primeiras palavras
// do texto. Nulo sem rascunho. `items` são os itens da Biblioteca.
export function draftLine(items, now = new Date()) {
  const stamp = item => item.updatedAt ?? item.at ?? ''
  const draft = (items ?? []).filter(item => item.type === 'pregacao' && item.draft).sort((a, b) => stamp(b).localeCompare(stamp(a)))[0]
  if (!draft) return null
  const when = whenLabel(draft.at, now, { weekday: true })
  const title = draft.title || firstWords(draft.text) || 'Sem título'
  return { id: draft.id, lead: `Rascunho de ${when}: `, title, tail: ' · continuar', aria: `Rascunho de ${when}: ${title}. Continuar` }
}

// ── N4: a nota em um versículo ──────────────────────────────────────────

// "Salmos 23:4" · "Salmos 23:4–5".
export function verseReference({ book, chapter, verses }, lang = 'pt') {
  return `${bookDisplayName(book, lang)} ${chapter}:${formatVerseRanges(verses)}`
}

export const noteTitle = (reference, lang = 'pt') => `Nota em ${verseReference(reference, lang)}`

// A segunda linha do cabeçalho: "Salva sozinha · só sua"; compartilhada,
// o trecho depois do ponto é o nome do grupo (dos grupos).
export function noteSubtitle({ groups = [], shared = [] } = {}) {
  const names = shared.map(id => groups.find(g => g.groupId === id)?.name).filter(Boolean)
  return `Salva sozinha · ${names.length ? names.join(' · ') : 'só sua'}`
}

export const NOTE_PLACEHOLDER = 'O que este versículo diz para você hoje?'
export const WHO_SEES_VERSE_NOTE = 'Dá para escolher mais de um grupo. Só o texto da nota e o versículo vão.'

// O texto do(s) versículo(s), na ordem, numa linha só.
export function verseQuote(chapterVerses, verses) {
  return [...(verses ?? [])].sort((a, b) => a - b).map(v => chapterVerses?.[String(v)] ?? '').filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

// "+ versículo": do menor ao maior versículo escolhido, num trecho só.
export function verseRange(verseStart, verseEnd) {
  return Array.from({ length: verseEnd - verseStart + 1 }, (_, i) => verseStart + i)
}

export function newNoteId(now = Date.now()) {
  return `hl-${now}-${Math.random().toString(36).slice(2, 8)}`
}

// A marcação da pessoa que já existe exatamente naquele trecho — é nela
// que a nota é escrita, em vez de nascer outra por cima.
export function findHighlight(highlights, { book, chapter, verses }) {
  const wanted = [...(verses ?? [])].sort((a, b) => a - b).join(',')
  return (highlights ?? []).find(h => h && !h.hidden && h.book === book && h.chapter === chapter && [...(h.verses ?? [])].sort((a, b) => a - b).join(',') === wanted) ?? null
}

// A nota aberta na tela, a partir da marcação que já existe (`existing`)
// ou do trecho escolhido. "Quem vê" de uma nota que nasce é sempre "Só
// eu" (nenhum grupo); numa já guardada, o que foi escolhido.
export function openVerseNote({ existing = null, reference = null, id = newNoteId() } = {}) {
  if (existing) {
    return {
      id: existing.id, stored: true, bornHere: false, kind: existing.kind ?? null,
      book: existing.book, bookEn: existing.bookEn ?? null, chapter: existing.chapter, verses: [...existing.verses].sort((a, b) => a - b),
      text: existing.text ?? '', tags: (existing.tags ?? []).filter(Boolean), sharedGroupIds: existing.sharedGroupIds ?? [],
    }
  }
  return {
    id, stored: false, bornHere: true, kind: 'note',
    book: reference.book, bookEn: reference.bookEn ?? null, chapter: reference.chapter, verses: [...reference.verses].sort((a, b) => a - b),
    text: '', tags: [], sharedGroupIds: [],
  }
}

// O registro de uma nota que nasce — o mesmo formato de uma marcação, com
// `kind: 'note'`. Nasce só da pessoa: nenhum grupo.
export function newVerseNoteRecord(note, { now = new Date(), sessionMode = 'browse' } = {}) {
  return {
    id: note.id, kind: 'note', book: note.book, bookEn: note.bookEn, chapter: note.chapter, verses: note.verses,
    text: note.text.trim(), color: DEFAULT_HIGHLIGHT_COLOR, tags: note.tags, sharedGroupIds: [],
    createdAt: now.toISOString(), date: dateKey(now), sessionMode,
  }
}

// O que gravar ao pausar: com texto, cria (a primeira vez) ou atualiza;
// sem texto, nada — uma nota vazia não é guardada, e o texto antigo não é
// apagado só porque o campo ficou vazio por um instante.
export function pauseAction(note) {
  if (!note.text.trim()) return 'none'
  return note.stored ? 'update' : 'create'
}

// O que fazer ao sair (voltar ou "Pronto") com o campo vazio: a nota que
// nasceu aqui e foi esvaziada some; a que já era só nota também (o texto
// antigo continua guardado, escondido); numa marcação, só a nota sai — a
// marcação fica.
export function emptyAction(note) {
  if (note.text.trim()) return 'none'
  if (!note.stored) return 'none'
  return note.kind === 'note' ? 'hide' : 'clear'
}

// Para quais grupos a nota vai ao tocar em "Pronto": os recém-escolhidos
// e, se o texto mudou, também os que já tinham recebido (como hoje, em
// que gravar de novo publica de novo). Sem texto, nenhum.
export function groupsToPublish({ before = [], chosen = [], text = '', textChanged = false } = {}) {
  if (!text.trim()) return []
  return chosen.filter(id => textChanged || !before.includes(id))
}

// O que vai ao grupo: só o texto da nota e o versículo. As etiquetas
// nunca vão.
export function groupPost({ note, verseText, versionShort = '', lang = 'pt' }) {
  const ref = verseReference(note, lang)
  return { book: note.book, chapter: note.chapter, body: note.text.trim(), quote: { text: verseText, ref: versionShort ? `${ref} (${versionShort})` : ref } }
}

// A cópia da nota que ficou no aparelho ainda precisa ser gravada? Sim,
// se tem texto e a conta não tem aquela nota, ou tem com outro texto,
// mais antigo. Devolve o que fazer: { action: 'create' | 'update', record }.
export function pendingLocalNote(local, highlights) {
  if (!local?.id || !String(local.text ?? '').trim() || !local.book || !local.verses?.length) return null
  const stored = (highlights ?? []).find(h => h?.id === local.id)
  if (!stored) return { action: 'create', record: local }
  if (stored.hidden) return null
  const storedAt = stored.updatedAt ?? stored.createdAt ?? ''
  const changed = String(stored.text ?? '') !== local.text.trim() || (stored.tags ?? []).join('|') !== (local.tags ?? []).join('|')
  return changed && (local.updatedAt ?? '') > storedAt ? { action: 'update', record: local } : null
}
