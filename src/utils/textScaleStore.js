// Preferência de "texto grande" (acessibilidade) — por dispositivo, mesmo
// padrão de appLanguageStore.js. Persiste entre sessões até a pessoa
// desligar de novo.
const KEY = 'jc_large_text'

export function getLargeTextEnabled() {
  return localStorage.getItem(KEY) === '1'
}

export function setLargeTextEnabled(enabled) {
  localStorage.setItem(KEY, enabled ? '1' : '0')
}
