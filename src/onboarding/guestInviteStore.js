// Convite a salvar (redesign 1g/etapa 7) — quando reapresentar a folha
// "Você leu X, quer guardar isso?" pra quem está lendo sem conta (ver
// SignupScreen.jsx). Aparece depois da 1ª leitura concluída; se a
// pessoa escolher "Continuar sem conta", o convite some e só volta depois
// de mais duas leituras (repete daí em diante, a cada duas, em vez de
// insistir a cada capítulo). "Quantidade lida" aqui é o tamanho do
// completedSet (capítulos + reflexões marcados) — não precisa de contador
// próprio.
const KEY = 'jc_guest_invite_next_at'

export function getGuestInviteThreshold() {
  try {
    const v = Number(localStorage.getItem(KEY))
    return Number.isFinite(v) && v > 0 ? v : 1
  } catch {
    return 1
  }
}

export function dismissGuestInvite(currentCount) {
  try { localStorage.setItem(KEY, String(currentCount + 2)) } catch { /* ignora */ }
}

// Chamado junto de migrateGuestRow() — depois que a conta é criada de
// verdade, esse marcador (só de convidado) não tem mais função.
export function clearGuestInviteState() {
  try { localStorage.removeItem(KEY) } catch { /* ignora */ }
}
