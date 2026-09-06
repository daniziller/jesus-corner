// "Sem cronômetro" (quadro 26d) — os passos de Oração/Reflexão continuam
// existindo (etapas, roteiro, campos), só não contam nem mostram tempo.
// Preferência de aparelho (como as duas durações antigas que ela substitui
// em espírito) — não afeta nenhum cálculo do servidor nem a divisão de
// sessões de leitura, é só um jeito de usar a tela sem relógio.
const KEY = 'jc_no_timer_mode'

export function getNoTimerMode() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setNoTimerMode(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // localStorage indisponível — a preferência só não persiste; sem risco.
  }
}
