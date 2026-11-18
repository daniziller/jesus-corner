// homeVerseMath.js — parte pura (sem I/O) do "Versículo do dia" da Home.
// Testado em node puro, ver scripts/test-home-verse.mjs.
//
// Pedido dela (2026-11-18): o versículo do dia girava dentro do capítulo
// em foco e saía "muito aleatório" (um verso qualquer de uma narrativa).
// Agora gira pelos 500 versículos mais lidos da Bíblia
// (data/versiculosMaisLidos.js): um por dia, o mesmo o dia inteiro e
// pra qualquer pessoa que abrir o app nesse dia, avançando à meia-noite
// LOCAL e percorrendo a lista inteira antes de repetir. A contagem é de
// dias desde uma data fixa (não o dia do ano), pra o ciclo não recomeçar
// todo 1º de janeiro no mesmo versículo.
import { MOST_READ_VERSES } from '../data/versiculosMaisLidos.js'

const EPOCH = new Date(2026, 0, 1)

export function daysSinceEpoch(date = new Date()) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((local - EPOCH) / 86400000)
}

// Índice do dia dentro de uma lista de `count` itens (nunca negativo,
// mesmo antes da data fixa).
export function dailyRotationIndex(count, date = new Date()) {
  if (!count || count < 1) return 0
  return ((daysSinceEpoch(date) % count) + count) % count
}

// A referência do dia: { bookPt, chapter, verseNum }.
export function verseOfTheDayRef(date = new Date(), list = MOST_READ_VERSES) {
  const [bookPt, chapter, verseNum] = list[dailyRotationIndex(list.length, date)]
  return { bookPt, chapter, verseNum }
}

// O texto de um versículo como vem do arquivo do livro (poesia com
// quebras de linha) num parágrafo só.
export function flattenVerseText(text) {
  return String(text ?? '').replace(/\s*\n\s*/g, ' ').trim()
}

// Mantido para quem ainda gira dentro de um capítulo (dia do ano).
export function dailyVerseIndex(verseCount, date = new Date()) {
  if (!verseCount || verseCount < 1) return 0
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date - start) / 86400000)
  return dayOfYear % verseCount
}
