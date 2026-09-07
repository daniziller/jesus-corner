// guestMergeMath.js — parte pura (sem I/O) da fusão de progresso de
// convidado pra dentro de uma conta real (migrateGuestRow em
// userDataStore.js). Extraída num arquivo à parte pra poder testar em node
// puro (ver scripts/test-guest-merge.mjs) — esta é a peça que causou uma
// perda de dado real numa conta de produção em 2026-09-07 (ver PR de
// correção), então merece teste automatizado, não só revisão de código.
//
// Regra ÚNICA, sem exceção — "servidor vence": um campo do convidado só
// entra na conta se o campo da CONTA estiver vazio (null, array vazio ou
// objeto vazio). Nunca existe um caminho que sobrescreve um valor que a
// conta já tinha, mesmo logo após um cadastro — pra alguém que já tem
// conta (login, ou 1º login social que na prática já existia por outro
// meio) e por qualquer motivo tem um resto de progresso de convidado no
// mesmo aparelho, isso nunca pode trocar o que já é real por migalhas.
export function isEmptyValue(value) {
  return value == null
    || (Array.isArray(value) && value.length === 0)
    || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
}

// { campo: valorDoConvidado } só pros campos onde o valor da CONTA está
// vazio — o patch pra mandar em updateRow(). `guestPatch` já vem sem
// `updated_at` (quem chama tira antes). `serverRow` pode ser null (conta
// sem linha ainda, corrida rara logo após o signup) — nesse caso todo
// campo do convidado entra, porque não há nada real pra perder.
export function computeGuestMergePatch(guestPatch, serverRow) {
  const patch = {}
  for (const [key, guestValue] of Object.entries(guestPatch)) {
    if (isEmptyValue(serverRow?.[key])) patch[key] = guestValue
  }
  return patch
}
