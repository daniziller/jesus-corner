// Marcação livre de capítulo (item 5 da seção 5; telas 28c/32b) — marcar um
// capítulo como lido fora de uma sessão do plano ("já li isso antes do
// app"). A fonte de verdade da porcentagem continua sendo
// user_data.completed_keys (ver src/progress/progressStore.js): marcar aqui
// USA markKeysDone/markKeysUndone por baixo, então automaticamente NÃO
// mexe em daily_routine nem em weekly_days/streak — são colunas separadas,
// só tocadas quando a pessoa de fato conclui a sessão de hoje pela rotina.
// "Capítulo marcado à mão entra na porcentagem; não conta como sessão nem
// mexe na sequência" (regra do PROMPT) já sai satisfeita estruturalmente.
//
// A tabela chapters_read (migration 0049) é só o traço de origem — pra
// distinguir, se um dia precisar (relatório, admin, desfazer em lote), o
// que veio de sessão do que foi marcado à mão.
import { markKeysDone, markKeysUndone } from '../progress/progressStore'
import { insertRow, selectRows } from '../backend/guestTableStore'

const TABLE = 'chapters_read'

// Marca uma lista de capítulos de UM livro como lidos manualmente. `book` é
// o nome canônico em português (mesma chave de completed_keys/BIBLE_BLOCKS).
export async function markChaptersManually(book, chapters) {
  if (chapters.length === 0) return
  const keys = chapters.map(ch => `${book}:${ch}`)
  await markKeysDone(null, keys)
  // Best-effort: o traço de origem não pode travar a marcação em si (a
  // porcentagem já está correta mesmo se este insert falhar por algum
  // motivo). Cada insert é independente pra um erro num capítulo não
  // derrubar os outros.
  await Promise.all(
    chapters.map(ch =>
      insertRow(TABLE, { livro: book, capitulo: ch, origem: 'manual' }).catch(err =>
        console.error(`Failed to log manual chapter mark ${book}:${ch}`, err)
      )
    )
  )
}

// Desmarca — usado por "Desmarcar tudo"/toque de novo num capítulo já
// marcado, e pelo "Começar limpo" de 28e. Não apaga a linha de
// chapters_read (é histórico de auditoria, não o estado atual); quem quiser
// saber o estado atual usa completed_keys via getCompletedSet.
export async function unmarkChaptersManually(book, chapters) {
  if (chapters.length === 0) return
  const keys = chapters.map(ch => `${book}:${ch}`)
  await markKeysUndone(null, keys)
}

// Todos os registros de marcação manual do usuário — usado pra distinguir
// "lido de verdade" de "importado" onde isso importar na UI (ex: um selo
// discreto na Biblioteca, se a autora pedir depois).
export async function getManuallyMarkedChapters() {
  return selectRows(TABLE)
}
