// Método de oração escolhido — 'acts' (padrão, 4 etapas guiadas) ou 'free'
// (26h, sem etapas). "A escolha é lembrada; quem escolhe livre nunca mais
// vê as quatro etapas" (nota do quadro 26h) — por aparelho, mesmo padrão de
// prayerDurationStore.js (preferência de uso, não dado de progresso; não
// precisa de coluna própria pra sincronizar entre aparelhos).
const KEY = 'jc_prayer_method'

export function getPrayerMethod() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'free' ? 'free' : 'acts'
  } catch {
    return 'acts'
  }
}

export function setPrayerMethod(method) {
  try {
    localStorage.setItem(KEY, method === 'free' ? 'free' : 'acts')
  } catch {
    // localStorage indisponível — a escolha só não persiste; sem risco.
  }
}
