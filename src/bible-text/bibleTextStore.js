import { findBibleVersion } from '../data/bibleVersions'
import { slugify } from '../utils/slugify'

// Cache em memória por "versionId:bookKey" — evita rebuscar o mesmo livro
// ao trocar de sessão/capítulo (ou de versão e voltar) dentro da mesma
// visita (o arquivo do livro inteiro já traz todos os capítulos, um fetch
// por livro basta).
const cache = new Map()

// bookKey = session.book (pt) ou session.bookEn (en), o mesmo nome já usado
// em bibleBlocks.js — o slug precisa bater exatamente com o gerado pelo
// script (ver scripts/build-bible-text.mjs).
export function fetchBookText(versionId, bookKey) {
  const cacheKey = `${versionId}:${bookKey}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const version = findBibleVersion(versionId)
  const slug = slugify(bookKey)
  const promise = fetch(`/bible-text/${version.folder}/${slug}.json`)
    .then(res => {
      if (!res.ok) throw new Error(`Bible text not found: ${cacheKey}`)
      return res.json()
    })
    .catch(err => {
      cache.delete(cacheKey) // não guarda falha em cache — permite tentar de novo
      throw err
    })

  cache.set(cacheKey, promise)
  return promise
}

// Agrupa os versículos de um capítulo em parágrafos, seguindo a divisão
// que a própria versão (NVT/NLT) já publica — ver scripts/build-bible-
// text.mjs. chapter.breaks[versículo] é 'P' (começa parágrafo novo) ou
// 'L' (só uma linha nova dentro do mesmo parágrafo, ex: poesia) —
// versículos sem marca continuam no parágrafo atual. Extraída de
// ReadingBlockView.jsx (turno 41, StudyDayScreen.jsx) pra não duplicar —
// qualquer lugar que mostre texto bíblico real usa a mesma divisão.
export function groupIntoParagraphs(chapter) {
  // Defensivo: um cache de PWA desatualizado (bible-text-cache) pode, em
  // tese, ainda entregar um formato antigo pra quem não atualizou o app —
  // sem isso, a tela toda ficava em branco (erro não tratado no render)
  // em vez de só aquele capítulo vir vazio.
  if (!chapter?.verses || typeof chapter.verses !== 'object') return []
  const verseNumbers = Object.keys(chapter.verses).map(Number).sort((a, b) => a - b)
  const paragraphs = []
  let current = null
  for (const v of verseNumbers) {
    if (!current || chapter.breaks?.[String(v)] === 'P') {
      current = []
      paragraphs.push(current)
    }
    current.push(v)
  }
  return paragraphs
}
