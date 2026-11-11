// reflexaoMath.js — a parte pura da reflexão com perguntas (handoff-
// passos-pedidos-53-54 §5, S4): uma pergunta por vez. As perguntas são as
// de sempre — duas geradas do trecho, opcionais, e a terceira, fixa, que
// vira a frase do dia. Sem as geradas (não há trecho, ou a geração falhou)
// fica só a fixa.

// A lista de perguntas do dia: as geradas (nenhuma ou duas) e, por último,
// a fixa.
export function reflectionQuestions(generated, fixed) {
  return [
    ...(generated ?? []).filter(Boolean).map(text => ({ text, fixed: false })),
    { text: fixed, fixed: true },
  ]
}

// O começo do que foi escrito, pra linha de uma pergunta já respondida: a
// primeira linha com texto; sem nada, "Sem resposta".
export function answerPreview(text) {
  const line = String(text ?? '').split('\n').map(l => l.trim()).find(Boolean)
  return line || 'Sem resposta'
}

// O botão laranja na última pergunta: "Terminar o dia" — ou "Terminar a
// reflexão" quando ainda falta outro passo de hoje (a reflexão foi feita
// fora de ordem).
export function reflectionFinishLabel(todaysSteps, dayEntry) {
  const pending = (todaysSteps ?? []).some(k => k !== 'reflection' && !dayEntry?.[k])
  return pending ? 'Terminar a reflexão' : 'Terminar o dia'
}

// Tudo o que a tela mostra para a pergunta `current` (índice). `answers`:
// o que foi escrito em cada uma, na mesma ordem.
export function reflectionView({ questions, current, answers = [], todaysSteps, dayEntry }) {
  const total = questions.length
  const idx = Math.min(Math.max(0, current), total - 1)
  const q = questions[idx]
  const last = idx === total - 1
  const row = i => ({ index: i, n: i + 1, text: questions[i].text })
  // Na última, as anteriores com o começo da resposta — tocar volta a ela.
  // Antes disso, as que ainda faltam, só para ler.
  const rows = last
    ? questions.slice(0, idx).map((_, i) => ({ ...row(i), sub: answerPreview(answers[i]), tappable: true }))
    : questions.slice(idx + 1).map((item, j) => ({ ...row(idx + 1 + j), sub: item.fixed ? 'Vira a sua frase do dia' : 'Opcional', tappable: false }))
  return {
    index: idx,
    last,
    // Vira maiúscula por CSS.
    label: `Pergunta ${idx + 1} de ${total}${q.fixed ? ' · sua frase do dia' : ''}`,
    markers: questions.map((_, i) => i === idx),
    question: q.text,
    placeholder: q.fixed
      ? 'Sua frase de aplicação — aparece no Início até você trocar.'
      : 'Escreva se quiser. Pensar também conta.',
    // "Trocar" troca só a pergunta atual; a fixa não se troca.
    secondary: q.fixed ? null : 'Trocar',
    // Avançar com o campo vazio é permitido em todas.
    primary: last ? reflectionFinishLabel(todaysSteps, dayEntry) : 'Próxima pergunta',
    list: rows.length ? { title: last ? 'Já respondidas' : 'Depois', rows } : null,
  }
}

// O cartão areia do trecho: o que a pessoa marcou na leitura de hoje ou,
// sem marcação, o primeiro versículo do que acabou de ler (num dia de
// estudo, o trecho do estudo). Sem texto, o cartão não aparece.
export function passageCard({ reference, text, marked }) {
  const clean = String(text ?? '').trim()
  if (!reference || !clean) return null
  return {
    // Vira maiúscula por CSS.
    label: `${reference} · ${marked ? 'o trecho que você marcou' : 'você acabou de ler'}`,
    text: `"${clean}"`,
  }
}

// As duas perguntas geradas e as respostas num texto corrido só — é a nota
// do dia na Biblioteca (a mesma chave da reflexão livre). Pergunta sem
// resposta não entra.
export function combineQaText(questions, answers) {
  return (questions ?? [])
    .map((q, i) => (q && String(answers?.[i] ?? '').trim() ? `${q}\n${answers[i].trim()}` : null))
    .filter(Boolean)
    .join('\n\n')
}
