// Convite a salvar (redesign 1g/etapa 7) — encerrado em 2026-09-07 (ver
// App.jsx: ninguém lê sem conta mais, então a folha "Você leu X, quer
// guardar isso?" nunca mais aparece; getGuestInviteThreshold/
// dismissGuestInvite, que controlavam quando reapresentá-la, saíram por
// não terem mais consumidor). Só sobra esta limpeza: um aparelho que já
// tinha essa marca gravada de antes desta mudança (jc_guest_invite_next_at)
// não precisa carregar isso pra sempre.
const KEY = 'jc_guest_invite_next_at'

export function clearGuestInviteState() {
  try { localStorage.removeItem(KEY) } catch { /* ignora */ }
}
