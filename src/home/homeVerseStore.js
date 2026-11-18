// homeVerseStore.js — I/O do "Versículo do dia" do Hoje: o versículo do
// dia é um dos 500 mais lidos da Bíblia (data/versiculosMaisLidos.js, um
// por dia — ver homeVerseMath.js), com o texto puxado do arquivo do livro
// na versão do idioma (NVT/NLT). Só se esse texto não estiver disponível
// (rede fora, cache vazio) cai na lista curada com texto embutido
// (utils/upliftingVerse.js). Pedido dela (2026-11-18): antes o versículo
// era sorteado dentro do capítulo em foco e saía "muito aleatório".
import { fetchBookText } from '../bible-text/bibleTextStore'
import { BIBLE_VERSIONS } from '../data/bibleVersions'
import { BIBLE_BLOCKS } from '../data/bibleBlocks'
import { getTodayUpliftingVerse } from '../utils/upliftingVerse'
import { verseOfTheDayRef, flattenVerseText } from './homeVerseMath'

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

// { text, ref, version, bookPt, bookEn, chapter, verseNum } de um
// versículo real — null se o texto não estiver disponível (falha de rede
// etc.), pra quem chama decidir o fallback. bookPt/bookEn/chapter/verseNum
// crus (não só o `ref` formatado) pro botão "salvar" da Home poder gravar
// como marcação (highlightsStore.js) sem reconstruir isso a partir da
// string.
export async function getVerseText(bookPt, chapter, verseNum, lang) {
  if (!bookPt || !chapter || !verseNum) return null
  try {
    const version = defaultVersion(lang)
    const bookEn = BOOK_EN_BY_PT[bookPt] ?? bookPt
    const bookKey = lang === 'en' ? bookEn : bookPt
    const bookJson = await fetchBookText(version.id, bookKey)
    const raw = bookJson?.[String(chapter)]?.verses?.[String(verseNum)]
    if (!raw) return null
    const displayBook = lang === 'en' ? bookKey : bookPt
    return {
      text: flattenVerseText(raw), ref: `${displayBook} ${chapter}:${verseNum}`, version: version.short,
      bookPt, bookEn, chapter: Number(chapter), verseNum: Number(verseNum),
    }
  } catch (err) {
    console.error('[homeVerseStore] Failed to fetch verse', err)
    return null
  }
}

// Versículo do dia (34a, bloco 3) — NUNCA retorna null: a lista curada
// sempre tem uma resposta, mesmo sem sessão/rede.
export async function getHomeVerse({ lang, date = new Date() }) {
  const ref = verseOfTheDayRef(date)
  const fromText = await getVerseText(ref.bookPt, ref.chapter, ref.verseNum, lang)
  if (fromText) return fromText
  const fallback = getTodayUpliftingVerse(lang, date)
  return { ...fallback, version: null, chapter: fallback.chapter }
}
