// Quebra `text` em torno de `part` (ex: a data de uma projeção — "novembro
// de 2031") pra destacar só aquele trecho em negrito sem precisar de duas
// chaves de tradução por idioma nem de HTML na string traduzida. Usado nos
// parágrafos de "Projeção" (35c/35i/35j) — mesmo texto/ordem de palavras em
// pt/en, só o pedaço variável (a data) ganha peso maior. Sem correspondência
// (`part` vazio ou não encontrado), devolve o texto inteiro num nó só.
export function splitBold(text, part) {
  if (!part) return [text]
  const i = text.indexOf(part)
  if (i === -1) return [text]
  return [text.slice(0, i), { bold: part }, text.slice(i + part.length)]
}
