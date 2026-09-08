// Gera public/bible-text/search-index/<versao>.json — um único arquivo por
// versão com TODOS os versículos da Bíblia num array plano, pra alimentar
// a busca de texto livre (39k/39l, Bloco 6 do pacote 39). Lê os arquivos
// por livro que já existem em public/bible-text/<versao>/*.json (gerados
// por build-bible-text.mjs a partir da API licenciada — este script NÃO
// chama a API de novo, só reprocessa o que já está no disco), então não
// precisa de API_BIBLE_KEY nem de rede.
//
// Formato de saída: array de { book, bookEn, chapter, verse, text }, na
// ordem canônica (mesma ordem de BIBLE_BLOCKS). `book` é sempre o nome em
// PORTUGUÊS (a chave de armazenamento de sempre, ver completed_keys) —
// `bookEn` só acompanha pra exibição quando lang === 'en'. O texto
// NORMALIZADO pra busca (sem acento/caixa) não entra aqui — fica pro
// cliente calcular uma vez, na memória, ao carregar (ver
// src/bible/bibleSearch.js); guardar as duas formas no arquivo quase
// dobraria o tamanho pra economizar um cálculo que roda 1x por sessão.
//
// node scripts/build-bible-search-index.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'
import { slugify } from '../src/utils/slugify.js'

const SRC_DIR = new URL('../public/bible-text/', import.meta.url)
const OUT_DIR = new URL('../public/bible-text/search-index/', import.meta.url)

// `nameField` = qual nome (pt ou en) vira o slug do arquivo pra essa versão
// — igual à regra de fetchBookText em src/bible-text/bibleTextStore.js
// (bookKey = session.book pra pt, session.bookEn pra en).
const VERSIONS = [
  { folder: 'pt-nvt', nameField: 'books' },
  { folder: 'en-nlt', nameField: 'booksEn' },
]

async function buildOne(folder, nameField) {
  const entries = []
  for (const block of BIBLE_BLOCKS) {
    for (let i = 0; i < block.books.length; i++) {
      const book = block.books[i]
      const bookEn = block.booksEn[i]
      const slug = slugify(block[nameField][i])
      const raw = await readFile(new URL(`${folder}/${slug}.json`, SRC_DIR), 'utf8')
      const chapters = JSON.parse(raw)
      for (const chStr of Object.keys(chapters).sort((a, b) => Number(a) - Number(b))) {
        const chapter = Number(chStr)
        const verses = chapters[chStr]?.verses ?? {}
        for (const vStr of Object.keys(verses).sort((a, b) => Number(a) - Number(b))) {
          entries.push({ book, bookEn, chapter, verse: Number(vStr), text: verses[vStr] })
        }
      }
    }
  }
  return entries
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  for (const { folder, nameField } of VERSIONS) {
    const entries = await buildOne(folder, nameField)
    await writeFile(new URL(`${folder}.json`, OUT_DIR), JSON.stringify(entries))
    console.log(`${folder}: ${entries.length} versículos`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
