import { UPLIFTING_VERSES } from '../data/upliftingVerses'

// Dia do ano (1-366) em horário LOCAL — mesmo espírito de dateKey.js (não
// usa UTC de propósito, pra não trocar de versículo antes/depois da meia-
// noite dependendo do fuso de quem usa o app).
function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date - start) / 86400000)
}

// Versículo do dia, em rodízio — mesmo versículo o dia inteiro (e pra
// qualquer pessoa que abrir o app nesse dia), avança sozinho à meia-noite
// local, percorre a lista inteira antes de repetir. Mostrado na Home no
// lugar do slogan fixo do app (ver HomeScreen.jsx).
export function getTodayUpliftingVerse(lang, date = new Date()) {
  const index = dayOfYear(date) % UPLIFTING_VERSES.length
  const v = UPLIFTING_VERSES[index]
  const book = lang === 'en' ? v.bookEn : v.book
  return {
    text: lang === 'en' ? v.textEn : v.textPt,
    ref: `${book} ${v.chapter}:${v.verse}`,
  }
}
