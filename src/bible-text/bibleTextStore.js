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
