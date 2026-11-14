// guardadaMath.js — a anotação guardada (N5, handoff-biblioteca-55
// §7A.5), parte pura: a linha do cabeçalho, a síntese (guardada no
// registro e só pedida de novo se o texto mudar; com menos de ~40
// palavras, não há síntese), os três números, os pontos, as passagens, a
// linha de "Ler a anotação inteira" e o que vai ao grupo. Testes em
// scripts/test-guardada.mjs.
import { sermonOwnWordsText, sermonOwnWordCount } from '../notes/sermonText.js'
import { formatInt, plural, monthName } from '../gamification/format.js'
import { DEFAULT_HIGHLIGHT_COLOR } from '../data/highlightColors.js'
import { dateKey } from '../utils/dateKey.js'
import { noteTypeName, passageLabel, UNTITLED } from './anotarMath.js'
import { findHighlight, newNoteId } from './notaMath.js'

const oneLine = text => String(text ?? '').replace(/\s+/g, ' ').trim()

// ── Cabeçalho ───────────────────────────────────────────────────────────

// "2 de setembro"; de outro ano, "2 de setembro de 2025".
export function longDate(day, now = new Date()) {
  if (!day) return ''
  const [year, month, date] = String(day).slice(0, 10).split('-').map(Number)
  if (!year || !month || !date) return ''
  const text = `${date} de ${monthName(new Date(year, month - 1, 1))}`
  return year === now.getFullYear() ? text : `${text} de ${year}`
}

export const savedTitle = note => oneLine(note?.title) || UNTITLED

// "{Tipo} · {Preletor} · {data}" — só o que existe. A anotação livre não
// tem preletor.
export function savedHeaderLine(note, now = new Date()) {
  const preacher = note?.noteType === 'free' ? '' : oneLine(note?.preacher)
  const day = note?.date ?? (note?.createdAt ? dateKey(new Date(note.createdAt)) : '')
  return [noteTypeName(note?.noteType), preacher, longDate(day, now)].filter(Boolean).join(' · ')
}

// ── A síntese ───────────────────────────────────────────────────────────

export const SUMMARY_MIN_WORDS = 40
export const SUMMARY_LABEL = 'O que ficou desta anotação'
export const SUMMARY_NOTE = 'Escrito a partir das suas próprias palavras. Nada foi acrescentado.'

// A impressão digital do que a pessoa escreveu: muda quando o texto muda.
export function wordsFingerprint(note) {
  const text = sermonOwnWordsText(note).trim()
  let hash = 5381
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0
  return `${text.length}-${hash.toString(36)}`
}

// O que fazer com a síntese ao abrir: 'none' — menos de ~40 palavras
// escritas pela pessoa, o bloco não aparece; 'stored' — a síntese guardada
// é do texto como está; 'request' — pedir (não há, ou o texto mudou).
export function summaryPlan(note) {
  if (sermonOwnWordCount(note) < SUMMARY_MIN_WORDS) return { action: 'none', summary: null }
  const fingerprint = wordsFingerprint(note)
  const stored = note?.summary
  if (stored?.highlight && stored.of === fingerprint) return { action: 'stored', summary: stored, fingerprint }
  return { action: 'request', summary: null, fingerprint, words: sermonOwnWordsText(note) }
}

// A síntese como é guardada no registro: os três trechos e de que texto é.
export function storedSummary(summary, fingerprint) {
  if (!summary?.highlight) return null
  return { before: summary.before ?? '', highlight: summary.highlight, after: summary.after ?? '', of: fingerprint }
}

// A síntese em três pedaços para a tela: o que vem antes, o trecho-chave
// (em branco, 800) e o que vem depois — montada como em 34h.
export function summaryParts(summary) {
  return { before: summary.before ? `${summary.before} ` : '', highlight: summary.highlight, after: summary.after ? `. ${summary.after}` : '.' }
}

// ── Os três números, os pontos e as passagens ───────────────────────────

const minutesOf = note => {
  const seconds = note?.durationSeconds ?? 0
  return seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0
}
export const savedPoints = note => (note?.body ?? []).filter(seg => seg?.type === 'topic' && oneLine(seg.text)).map((seg, i) => ({ key: seg.id ?? `p${i}`, n: i + 1, text: oneLine(seg.text) }))

// "{n} min" / anotando · {n} / pontos · {n} / passagens. Um número zero
// não tem coluna; os três zerados, a lista vem vazia (o cartão não
// aparece).
export function savedNumbers(note) {
  const minutes = minutesOf(note)
  const points = savedPoints(note).length
  const passages = (note?.passages ?? []).length
  return [
    minutes > 0 && { key: 'time', value: `${formatInt(minutes)} min`, label: 'anotando' },
    points > 0 && { key: 'points', value: formatInt(points), label: plural(points, 'ponto', 'pontos') },
    passages > 0 && { key: 'passages', value: formatInt(passages), label: plural(passages, 'passagem', 'passagens') },
  ].filter(Boolean)
}

export const POINTS_LABEL = 'Os pontos que você marcou'
export const PASSAGES_LABEL = 'As passagens'
export const MARK_LABEL = 'Marcar na Bíblia'

// As pastilhas das passagens, com a referência por extenso.
export function savedPassages(note, lang = 'pt') {
  return (note?.passages ?? []).map((p, i) => ({ key: `${p.book}-${p.chapter}-${p.verseStart ?? 0}-${p.verseEnd ?? 0}-${i}`, label: passageLabel(p, lang), book: p.book, chapter: p.chapter, verse: p.verseStart ?? null }))
}

const versesOf = p => Array.from({ length: (p.verseEnd ?? p.verseStart) - p.verseStart + 1 }, (_, i) => p.verseStart + i)

// "Marcar na Bíblia": uma marcação por passagem (cor padrão, sem nota),
// como em 34h. Não repete o que já está marcado exatamente ali, nem marca
// um capítulo inteiro (passagem sem versículo).
export function passagesToMark(note, highlights = [], now = new Date()) {
  const seen = new Set()
  const records = []
  for (const p of note?.passages ?? []) {
    if (!p?.book || !p.chapter || !p.verseStart) continue
    const verses = versesOf(p)
    const key = `${p.book}:${p.chapter}:${verses.join(',')}`
    if (seen.has(key) || findHighlight(highlights, { book: p.book, chapter: p.chapter, verses })) continue
    seen.add(key)
    records.push({ id: newNoteId(now.getTime() + records.length), book: p.book, bookEn: p.bookEn ?? null, chapter: p.chapter, verses, text: '', color: DEFAULT_HIGHLIGHT_COLOR, createdAt: now.toISOString(), date: dateKey(now), sessionMode: 'browse' })
  }
  return records
}

// Há o que marcar? Sem passagem com versículo, ou com todas já marcadas,
// a ação mostra que está feito.
export function markState(note, highlights = []) {
  const markable = (note?.passages ?? []).filter(p => p?.verseStart)
  if (markable.length === 0) return 'none'
  return passagesToMark(note, highlights).length === 0 ? 'done' : 'todo'
}

// ── A lista ─────────────────────────────────────────────────────────────

// "412 palavras · # espera · # família".
export function readLine(note) {
  const words = sermonOwnWordCount(note)
  return [`${formatInt(words)} ${plural(words, 'palavra', 'palavras')}`, ...(note?.tags ?? []).filter(Boolean).map(tag => `# ${tag}`)].join(' · ')
}

// O que aparece e o que some em N5.
export function savedBlocks(note) {
  return {
    summary: sermonOwnWordCount(note) >= SUMMARY_MIN_WORDS,
    numbers: savedNumbers(note).length > 0,
    points: savedPoints(note).length > 0,
    passages: (note?.passages ?? []).length > 0,
  }
}

// ── Levar ao grupo ──────────────────────────────────────────────────────

// O que vai ao grupo, como hoje: o título e as palavras da pessoa, na
// sala do capítulo da primeira passagem citada. As etiquetas nunca vão.
// Sem passagem citada (ou sem texto), não há para onde ir: nulo.
export function groupPostOfNote(note) {
  const target = (note?.passages ?? [])[0]
  const body = [oneLine(note?.title), sermonOwnWordsText(note).trim()].filter(Boolean).join('\n\n')
  if (!target?.book || !target.chapter || !body) return null
  return { book: target.book, chapter: target.chapter, body }
}

// Para quais grupos a anotação vai agora. Um rascunho não vai a lugar
// nenhum; ao ser finalizado, vai aos grupos escolhidos; numa anotação já
// finalizada, só aos grupos escolhidos depois (os de antes já receberam).
export function groupsToShare({ chosen = [], wasFinalized = false, finalizedNow = false, sharedBefore = [] } = {}) {
  if (wasFinalized) return chosen.filter(id => !sharedBefore.includes(id))
  return finalizedNow ? [...chosen] : []
}

// A linha de confirmação: "Compartilhada com {grupo}." (com dois ou mais,
// "… com A e B." / "… com A, B e C.").
export function sharedLine(groups = [], ids = []) {
  const names = ids.map(id => groups.find(g => g.groupId === id)?.name).filter(Boolean)
  if (names.length === 0) return null
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
  return `Compartilhada com ${list}.`
}

export const NOT_SHARED_NO_PASSAGE = 'Não foi ao grupo: para ir, a anotação precisa citar um versículo.'
export const NOT_SHARED_FAILED = 'Não deu para levar ao grupo agora. Escolha o grupo de novo em "Quem vê" quando a internet voltar.'

// ── Compartilhar (para fora do app) ─────────────────────────────────────

// O texto de "Compartilhar": o título, de onde veio, as palavras da
// pessoa e as passagens — como a página de anotação já compartilhava.
export function shareTextOfNote(note, lang = 'pt') {
  const source = [noteTypeName(note?.noteType), note?.noteType === 'free' ? '' : oneLine(note?.preacher), oneLine(note?.church)].filter(Boolean).join(' · ')
  const passages = (note?.passages ?? []).map(p => passageLabel(p, lang)).join(', ')
  return [savedTitle(note), source, sermonOwnWordsText(note).trim(), passages].filter(Boolean).join('\n\n')
}
