// Gera src/data/versiculosPorCapitulo.js — quantos versículos tem cada
// capítulo de cada livro, para o interpretador de referências da busca
// (handoff-biblia-52 §6.4: "tabela de livros com... versículos por
// capítulo"). Lê os índices de busca que já existem em
// public/bible-text/search-index/ (um por versão) e guarda, por capítulo,
// o maior número de versículo entre as versões — a tabela diz até onde
// uma referência PODE ir; se o versículo existe mesmo na versão em uso
// quem confere é a tela, ao buscar o texto (algumas versões juntam ou
// omitem versículos).
//
// node scripts/build-verse-counts.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { GAMIFICATION_BOOKS } from '../src/data/gamificationBlocks.js'

const INDEX_DIR = new URL('../public/bible-text/search-index/', import.meta.url)
const OUT = new URL('../src/data/versiculosPorCapitulo.js', import.meta.url)
const VERSIONS = ['pt-nvt', 'en-nlt']

const counts = {}
for (const folder of VERSIONS) {
  const entries = JSON.parse(await readFile(new URL(`${folder}.json`, INDEX_DIR), 'utf8'))
  for (const e of entries) {
    const book = (counts[e.book] ??= [])
    book[e.chapter - 1] = Math.max(book[e.chapter - 1] ?? 0, e.verse)
  }
}

const lines = GAMIFICATION_BOOKS.map(b => {
  const list = counts[b.nome]
  if (!list || list.length !== b.capitulos || list.some(n => !n)) throw new Error(`capítulos de ${b.nome} não batem com o texto`)
  return `  ${JSON.stringify(b.nome)}: [${list.join(', ')}],`
})

await writeFile(OUT, `// versiculosPorCapitulo.js — GERADO por scripts/build-verse-counts.mjs; não
// edite à mão. Para cada livro (nome canônico em português), o número do
// último versículo de cada capítulo, na ordem dos capítulos.
export const VERSES_PER_CHAPTER = {
${lines.join('\n')}
}

// Quantos versículos tem o capítulo; 0 quando o livro ou o capítulo não
// existe.
export function verseCount(book, chapter) {
  return VERSES_PER_CHAPTER[book]?.[chapter - 1] ?? 0
}
`)
console.log(`versiculosPorCapitulo.js: ${lines.length} livros`)
