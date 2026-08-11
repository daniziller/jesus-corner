// Mostrar (ou não) o card da frase de aplicação na Home — preferência de
// UI por dispositivo, mesmo padrão de appLanguageStore.js/textScaleStore.js
// (localStorage). Liga por padrão: quem nunca mexeu nisso já vê o card
// assim que salva a 1a frase.
const KEY = 'jc_show_application_card'

export function getShowApplicationCard() {
  const raw = localStorage.getItem(KEY)
  return raw === null ? true : raw === 'true'
}

export function setShowApplicationCard(value) {
  localStorage.setItem(KEY, String(value))
}
