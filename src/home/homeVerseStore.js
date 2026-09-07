// homeVerseStore.js — I/O do "Versículo do dia" e da linha de continuidade
// da Home (34a): tenta puxar um versículo real do capítulo em foco (regra
// do handoff: "prefira um versículo do trecho que a pessoa está lendo; só
// use a lista curada como fallback"), caindo pra lista curada
// (utils/upliftingVerse.js) só se o texto do capítulo não estiver
// disponível — nunca deixa o cartão vazio. Parte pura (índice do dia,
// corte do trecho) mora em homeVerseMath.js, testada em node puro (ver
// scripts/test-home-verse.mjs).
import { fetchBookText } from '../bible-text/bibleTextStore'
import { BIBLE_VERSIONS } from '../data/bibleVersions'
import { BIBLE_BLOCKS } from '../data/bibleBlocks'
import { getTodayUpliftingVerse } from '../utils/upliftingVerse'
import { dailyVerseIndex, excerptOf } from './homeVerseMath'

// pt → en, pra buscar o arquivo certo em /bible-text quando lang é 'en' e
// só se tem o nome canônico (pt) do livro à mão — ex: lastReadPosition,
// que grava sempre em pt (ver comentário em lastReadPositionStore.js).
// Mesmo padrão já usado (duplicado de propósito, não compartilhado) em
// src/recap/weeklySummaryMath.js.
const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)

function defaultVersion(lang) {
  return (BIBLE_VERSIONS[lang] ?? BIBLE_VERSIONS.pt)[0]
}

// { text, ref, version, bookPt, bookEn, chapter, verseNum } a partir de um
// capítulo real — null se o texto não estiver disponível (livro/capítulo
// inexistente, falha de rede etc.), pra quem chama decidir o fallback.
// bookPt/bookEn/chapter/verseNum crus (não só o `ref` formatado) pro botão
// "salvar" da Home poder gravar como marcação (highlightsStore.js) sem
// reconstruir isso a partir da string.
export async function getVerseForChapter(bookPt, chapter, lang) {
  if (!bookPt || !chapter) return null
  try {
    const version = defaultVersion(lang)
    const bookEn = BOOK_EN_BY_PT[bookPt] ?? bookPt
    const bookKey = lang === 'en' ? bookEn : bookPt
    const bookJson = await fetchBookText(version.id, bookKey)
    const verses = bookJson?.[String(chapter)]?.verses
    if (!verses) return null
    const verseNums = Object.keys(verses)
    if (verseNums.length === 0) return null
    const verseNum = Number(verseNums[dailyVerseIndex(verseNums.length)])
    const displayBook = lang === 'en' ? bookKey : bookPt
    return {
      text: verses[String(verseNum)], ref: `${displayBook} ${chapter}:${verseNum}`, version: version.short,
      bookPt, bookEn, chapter: Number(chapter), verseNum,
    }
  } catch (err) {
    console.error('[homeVerseStore] Failed to fetch verse for chapter', err)
    return null
  }
}

// Versículo do dia (34a, bloco 3) — NUNCA retorna null: a lista curada
// sempre tem uma resposta, mesmo sem sessão/rede.
export async function getHomeVerse({ book, chapter, lang }) {
  const fromChapter = await getVerseForChapter(book, chapter, lang)
  if (fromChapter) return fromChapter
  const fallback = getTodayUpliftingVerse(lang)
  return { ...fallback, version: null, chapter: fallback.chapter }
}

// "você parou em: '...'" (34a, bloco 2) — trecho real do 1º versículo do
// capítulo em `lastReadPosition`, cortado curto (ver excerptOf). null
// quando o texto não está disponível — a linha de continuidade some
// nesse caso em vez de mostrar algo inventado (só a hora da sessão fica).
export async function getContinuityExcerpt(bookPt, chapter, lang) {
  try {
    const version = defaultVersion(lang)
    const bookKey = lang === 'en' ? (BOOK_EN_BY_PT[bookPt] ?? bookPt) : bookPt
    const bookJson = await fetchBookText(version.id, bookKey)
    const verses = bookJson?.[String(chapter)]?.verses
    if (!verses) return null
    const firstNum = Object.keys(verses)[0]
    return excerptOf(verses[firstNum])
  } catch (err) {
    console.error('[homeVerseStore] Failed to fetch continuity excerpt', err)
    return null
  }
}
