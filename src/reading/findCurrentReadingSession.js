// findCurrentReadingSession.js — extraído de App.jsx (correção do bug
// "leitura livre marcada fora de ordem não afeta o plano", 2026-09-08).
//
// Sessão (e bloco) que o card "Continue sua leitura" da Home, o botão
// "Continuar sessão" e "Meu Plano" reabrem — SEMPRE a primeira sessão
// ainda não concluída, na ordem canônica do plano (blocks já vem ordenado
// conforme reading_order).
//
// Antes, a prioridade 1 era o ÚLTIMO texto tocado (lastReadPosition) —
// proposital, pra "reler" um capítulo em outro lugar trazer o card de
// volta pra ele. Só que isso também significa que marcar um capítulo
// como lido FORA de ordem (Marcar lidos/28c, ou até abrir um capítulo
// distante em navegação livre) nunca "empurra" o plano — ele fica preso
// onde estava até alguém tocar especificamente em algo mais à frente. Ela
// pediu pra corrigir: "o plano segue sua ordem" — a posição de leitura
// nunca mais é ancorada em onde a pessoa tocou por último, só no que
// falta na ordem, seja qual for a origem da marcação (leitura guiada,
// livre, ou "Marcar lidos" em lote).
// `lastReadPosition` continua existindo e sendo gravado (ver
// lastReadPositionStore.js) — só não entra mais NESTA função. Outros usos
// legítimos dele (linha de continuidade da Home, "onde um amigo parou" em
// GroupsScreen, "Último texto lido" em JourneyScreen) não mudam.
export function findCurrentReadingSession(blocks, sessionsByBlock) {
  for (const block of blocks) {
    const session = sessionsByBlock[block.id].find(s => s.status !== 'done')
    if (session) return { session, block }
  }
  const lastBlock = blocks[blocks.length - 1]
  const lastSessions = sessionsByBlock[lastBlock.id]
  return { session: lastSessions[lastSessions.length - 1], block: lastBlock }
}
