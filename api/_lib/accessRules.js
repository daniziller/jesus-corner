// Regras das cortesias do painel do Master (api/admin/access.js),
// separadas do endpoint pra terem teste (scripts/test-access-rules.mjs).

const norm = s => (s ?? '').trim().toLocaleLowerCase('pt-BR')

// Quem recebe a cortesia quando o Master digita um nome em vez de e-mail.
// `rows`: perfis cujo nome contém o texto ({ user_id, name }). Vale o nome
// exato (sem diferença de maiúsculas) ou, sem ele, o único que contém o
// texto; mais de um candidato é ambíguo — o painel pede o e-mail. Antes
// valia o primeiro que o banco devolvesse: "Ana" podia premiar "Mariana".
export function pickPersonByName(rows, query) {
  const list = rows ?? []
  const exact = list.filter(r => norm(r.name) === norm(query))
  if (exact.length === 1) return { userId: exact[0].user_id }
  if (exact.length > 1) return { error: 'ambiguous_name' }
  if (list.length === 1) return { userId: list[0].user_id }
  return { error: list.length ? 'ambiguous_name' : 'person_not_found' }
}

// Cortesia não entra por cima de acesso pago: gravar 'free' por cima de um
// vitalício comprado apagava a compra, e por cima de uma assinatura em dia
// fazia o vencimento da cortesia derrubar quem continua pagando. Devolve o
// motivo da recusa, ou null.
const PAYING = new Set(['active', 'trialing', 'past_due'])
export function grantBlockedBy(sub) {
  if (!sub || !PAYING.has(sub.status)) return null
  if (sub.access_type === 'lifetime') return 'already_lifetime'
  if (sub.access_type === 'recurring') return 'already_paying'
  return null
}

// Escapa os curingas do ILIKE (%, _ e a barra) no texto digitado.
export function likeContains(text) {
  return `%${String(text).replace(/[\\%_]/g, c => `\\${c}`)}%`
}
