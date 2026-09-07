// Ordem da leitura contínua da Bíblia — canônica/cronológica/"minha ordem"
// (bible_order_mode/custom_book_order, migration 0058). Mesmo padrão fino
// de readingOrderStore.js sobre fetchRow/updateRow — não confundir com ele:
// reading_order (0044) é "AT ou NT primeiro" (ordem de bloco, onboarding);
// esta store aqui é a ordem FINA dos 66 livros, ver HANDOFF-35-meu-plano.md
// 35i. A parte pura (cálculo da fila e do próximo capítulo) vive em
// bibleOrderMath.js, pra dar pra testar sem sessão.
import { fetchRow, updateRow } from '../backend/userDataStore'

export { BIBLE_ORDER_MODES, canonicalBookOrder, chronologicalBookOrder, resolveBookOrder, resolveNextChapter } from './bibleOrderMath'

export async function getBibleOrderMode() {
  const row = await fetchRow()
  return row?.bible_order_mode || 'canonical'
}

export async function setBibleOrderMode(mode) {
  await updateRow({ bible_order_mode: mode })
}

// Lista de nomes de livro (pt) na ordem que a pessoa montou pra "Minha
// ordem" — null enquanto ela nunca configurou nada (a UI parte da ordem
// canônica pra pessoa reordenar a partir dela).
export async function getCustomBookOrder() {
  const row = await fetchRow()
  return Array.isArray(row?.custom_book_order) ? row.custom_book_order : null
}

export async function setCustomBookOrder(bookOrder) {
  await updateRow({ custom_book_order: bookOrder })
}
