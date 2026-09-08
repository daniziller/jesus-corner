// verseSelectionLabel.js — o título de 39e: "Um versículo selecionado" /
// "Três versículos selecionados" (pacote 39, regra "quando o número muda,
// a frase muda junto, em português correto"). Diferente da contagem de
// capítulos (essa sim em dígitos, "50 capítulos") — o HANDOFF pede o
// número por extenso aqui. Seleções de verdade dificilmente passam de
// uma dúzia de versículos de uma vez; além de doze cai pra dígito (sem
// pretensão de escrever "vinte e três" por extenso).
const WORDS_PT = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze']
const WORDS_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

function numberWord(n, lang) {
  const words = lang === 'en' ? WORDS_EN : WORDS_PT
  return words[n] ?? String(n)
}

export function verseSelectionLabel(n, lang = 'pt') {
  const word = numberWord(n, lang)
  const capitalized = word.charAt(0).toUpperCase() + word.slice(1)
  if (lang === 'en') return `${capitalized} verse${n === 1 ? '' : 's'} selected`
  return `${capitalized} versículo${n === 1 ? '' : 's'} selecionado${n === 1 ? '' : 's'}`
}
