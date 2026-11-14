// Ordem da leitura contínua da Bíblia — canônica/cronológica/"minha ordem"/
// "ordem livre" (bible_order_mode/custom_book_order, migration 0058; a
// ordem livre e reading_plan_position, migration 0076). Mesmo padrão fino
// de readingOrderStore.js sobre fetchRow/updateRow — não confundir com ele:
// reading_order (0044) é "AT ou NT primeiro" (ordem de bloco, onboarding);
// esta store aqui é a ordem FINA dos 66 livros, ver HANDOFF-35-meu-plano.md
// 35i. A parte pura (cálculo da fila e do próximo capítulo) vive em
// bibleOrderMath.js, pra dar pra testar sem sessão.
import { fetchRow, updateRow } from '../backend/userDataStore'

export async function getBibleOrderMode() {
  const row = await fetchRow()
  return row?.bible_order_mode || 'canonical'
}

export async function setBibleOrderMode(mode) {
  await updateRow({ bible_order_mode: mode })
}

// Lista de nomes de livro (pt) na ordem que a pessoa montou pra "Minha
// ordem" — só os livros que fazem parte do plano. null enquanto ela nunca
// configurou nada (a UI parte dos 66 na ordem canônica).
export async function getCustomBookOrder() {
  const row = await fetchRow()
  return Array.isArray(row?.custom_book_order) ? row.custom_book_order : null
}

export async function setCustomBookOrder(bookOrder) {
  await updateRow({ custom_book_order: bookOrder })
}

// De onde o plano começa e segue — { start: { book, chapter } | null,
// free: { book, chapter } | null }. `start` é o ponto de partida escolhido
// nas ordens canônica, cronológica e minha ordem; `free`, onde a pessoa
// está na ordem livre. Nenhum dos dois marca nada como lido.
export async function getPlanPosition() {
  const row = await fetchRow()
  const saved = row?.reading_plan_position
  return saved && typeof saved === 'object' ? { start: saved.start ?? null, free: saved.free ?? null } : { start: null, free: null }
}

export async function setPlanPosition(position) {
  await updateRow({ reading_plan_position: position })
}
