// A conferência da síntese de uma anotação ("O que ficou desta
// anotação", api/generate-sermon-summary.js): a frase em destaque precisa
// estar ancorada no que a pessoa escreveu — ao menos uma palavra de
// conteúdo dela aparece na frase. Sem isso, não há como saber se a IA
// inventou um assunto.
//
// Antes a comparação era por palavra idêntica, e a síntese — que resume
// com outras palavras — quase sempre caía ("esperou" no texto, "espera"
// na frase). Agora compara pelo começo da palavra (as quatro primeiras
// letras, sem acento), o que junta as variações de uma mesma palavra
// ("espera", "esperar", "esperança"), e ignora as palavras de ligação,
// que não dizem nada sobre o assunto.

const STOPWORDS = new Set([
  // português
  'para', 'pelo', 'pela', 'pelos', 'pelas', 'como', 'mais', 'menos', 'isso', 'isto', 'essa', 'esse', 'esta', 'este', 'estas', 'estes',
  'essas', 'esses', 'aquilo', 'aquele', 'aquela', 'quando', 'onde', 'qual', 'quais', 'quem', 'mesmo', 'mesma', 'tambem', 'muito', 'muita',
  'pouco', 'sobre', 'entre', 'depois', 'antes', 'ainda', 'sempre', 'nunca', 'agora', 'porque', 'pois', 'mas', 'seus', 'suas', 'dela', 'dele',
  'delas', 'deles', 'voce', 'voces', 'nossa', 'nosso', 'minha', 'meus', 'minhas', 'tudo', 'nada', 'cada', 'outro', 'outra', 'outros', 'outras',
  'sera', 'seria', 'esta', 'estava', 'foram', 'sido', 'tinha', 'temos', 'fazer', 'feito', 'aqui', 'ali', 'entao', 'assim', 'apenas', 'algo',
  'alguem', 'coisa', 'coisas', 'vezes', 'duas', 'tres', 'mais', 'atraves', 'diante', 'contra', 'desde', 'durante', 'ate',
  // inglês
  'that', 'this', 'with', 'from', 'what', 'when', 'where', 'which', 'there', 'their', 'they', 'them', 'have', 'been', 'were', 'your',
  'about', 'into', 'than', 'then', 'also', 'just', 'more', 'most', 'some', 'only', 'over', 'very', 'even', 'each', 'other', 'because',
])

export function foldWords(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
}

const stem = word => word.slice(0, 4)

// A frase em destaque tem ao menos uma palavra de conteúdo que aparece
// (pelo começo) no texto da pessoa?
export function highlightIsGrounded(highlight, text) {
  const source = new Set(foldWords(text).map(stem))
  return foldWords(highlight).some(word => source.has(stem(word)))
}
