// formatPercent.js — "5,4%"/"0%"/"3,4%" (39a/39b/39c, pacote 39). O
// quadro mostra 1 casa decimal só quando ela existe de verdade (5,4% mas
// 0%, nunca 0,0%) — inteiro sem decimal, fracionário com 1 casa e vírgula
// em pt. Pura, testável.
export function formatPercent(value, lang = 'pt') {
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'
  const isWhole = Number.isInteger(value)
  return value.toLocaleString(locale, { minimumFractionDigits: isWhole ? 0 : 1, maximumFractionDigits: 1 })
}
