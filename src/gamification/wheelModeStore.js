// Modo da roda em Sua Bíblia (G2): 'livros' (fatias iguais, enche de
// dentro pra fora) ou 'capitulos' (fatias proporcionais, enche no sentido
// horário). "A escolha é lembrada" (HANDOFF §4.1) — por aparelho, como
// prayerDurationStore.js; é preferência de exibição, não dado da conta.
const KEY = 'jc_roda_modo'
export const WHEEL_MODES = ['livros', 'capitulos']

export function getWheelMode() {
  try {
    const raw = localStorage.getItem(KEY)
    return WHEEL_MODES.includes(raw) ? raw : 'livros'
  } catch {
    return 'livros'
  }
}

export function setWheelMode(mode) {
  try { localStorage.setItem(KEY, mode) } catch { /* privado/cota cheia — segue sem lembrar */ }
}
