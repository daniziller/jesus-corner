// groupBookPlan.js — formato "Para o grupo" dos quadros 22a/22d. O único
// exemplo do mockup mostra um plano de grupo em formato Livro ("Filipenses,
// capítulo a capítulo", 22d) — não existe nenhum exemplo de plano de grupo
// por tema/IA, então "Para o grupo" sempre monta um plano de Livro (mesma
// ideia de src/themePlans/bookPlan.js), com uma diferença estrutural: cada
// SEMANA é exatamente UM capítulo (nunca uma faixa de capítulos), ao
// contrário do plano de Livro pessoal (que agrupa por palavras/dia).
//
// Por quê: a sala de discussão do grupo (17a, group_chapter_questions) é
// por UM capítulo só — group_id + book + chapter, chave primária com
// `chapter` inteiro, não faixa. Se uma "semana" cobrisse 2+ capítulos, não
// haveria uma sala única e correta pra ela. 1 semana = 1 capítulo elimina
// essa ambiguidade de propósito — é também o que o mockup pede ("Um
// capítulo por semana").
//
// Regra Zero, documentada: o quadro mostra 3 "leituras curtas" por semana
// (Seg/Qua/Sex, cada uma uma faixa de versículos dentro do capítulo — ex:
// Fp 1:1-11, 1:12-26, 1:27-30). Dividir um capítulo em faixas de versículo
// exigiria contagem de palavras POR VERSÍCULO, que não existe no cliente
// (chapterWordCounts.js só tem o total por capítulo — dividir por
// versículo pediria buscar o texto real de cada livro, como
// api/generate-theme-plan.js faz no servidor). Sem esse dado, fingir 3
// faixas "iguais" seria dividir por posição, não por conteúdo — pior que
// não dividir. Em vez disso, cada semana é só o capítulo inteiro, uma
// leitura só; a pessoa lê no próprio ritmo dentro da semana.
import { BIBLE_BLOCKS } from '../data/bibleBlocks'
import { getChapterWords } from '../data/chapterWordCounts'
import { allBooksFlat } from '../themePlans/bookPlan'

const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)

export function buildGroupPlan(canonicalBook, lang) {
  const entry = allBooksFlat(lang).find(b => b.canonicalName === canonicalBook)
  const displayName = entry?.displayName ?? canonicalBook
  const bookEn = BOOK_EN_BY_PT[canonicalBook] ?? canonicalBook
  const words = getChapterWords(canonicalBook)

  const weeks = words.map((w, i) => ({ chStart: i + 1, chEnd: i + 1 }))
  const passages = words.map((w, i) => ({ book: canonicalBook, chStart: i + 1, chEnd: i + 1, words: w }))

  return {
    // Só pra distinguir uma montagem da outra ANTES de salvar (ver
    // GroupPlanProposalScreen.jsx — precisa saber quando o livro escolhido
    // mudou, pra buscar a sugestão de pergunta de novo) — mesmo padrão de
    // buildBookPlan em themePlans/bookPlan.js. O id de verdade, gravado no
    // banco, só nasce em send_group_reading_plan (ver groupPlansStore.js).
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    book: canonicalBook,
    bookEn,
    title: displayName,
    overview: null,
    weeks,
    passages,
  }
}
