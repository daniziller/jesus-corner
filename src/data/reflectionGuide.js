// Roteiro da Reflexão Guiada diária — mesmo formato de src/components/acts/ActsCard.jsx
// (ACTS_DATA), mas com prompts genéricos sobre a leitura do dia (não por
// livro/passagem específica, ao contrário do ReflectionCard de fechamento de
// livro em ReadingBlockView.jsx — são features diferentes).
export const REFLECTION_DATA = [
  {
    id: 'R',
    letter: 'R',
    title: { pt: 'Reviver', en: 'Recall' },
    subtitle: { pt: 'Relembre o que leu', en: 'Recall what you read' },
    duration: { pt: '3 min', en: '3 min' },
    durationMin: 3,
    bgColor: 'rgba(124,58,237,.1)',
    letterColor: '#6D28D9',
    borderColor: 'rgba(124,58,237,.4)',
    stepBg: '#F5F3FF',
    dotColor: '#7C3AED',
    glow: 'rgba(124,58,237,.28)',
    verseBg: '#F5F3FF',
    verseBorder: '#7C3AED',
    verseRefColor: '#6D28D9',
    description: {
      pt: 'Antes de interpretar, só relembre o que você leu hoje — sem pressa, sem julgar.',
      en: "Before interpreting, just recall what you read today — no rush, no judging.",
    },
    steps: {
      pt: [
        'O que mais chamou sua atenção na leitura de hoje?',
        'Relembre o trecho principal, como se contasse pra um amigo.',
        'Não force uma lição ainda — só <b>relembre os fatos</b>.',
      ],
      en: [
        'What stood out most in today\'s reading?',
        'Recall the main passage, as if telling a friend.',
        "Don't force a lesson yet — just <b>remember the facts</b>.",
      ],
    },
    verse: {
      pt: '"Guardei a tua palavra no coração, para não pecar contra ti."',
      en: 'I have hidden your word in my heart that I might not sin against you.',
    },
    verseRef: { pt: 'Salmos 119:11', en: 'Psalm 119:11' },
  },
  {
    id: 'E',
    letter: 'E',
    title: { pt: 'Entender', en: 'Understand' },
    subtitle: { pt: 'O que isso revela', en: 'What it reveals' },
    duration: { pt: '4 min', en: '4 min' },
    durationMin: 4,
    bgColor: 'rgba(168,85,247,.1)',
    letterColor: '#7E22CE',
    borderColor: 'rgba(168,85,247,.4)',
    stepBg: '#FAF5FF',
    dotColor: '#A855F7',
    glow: 'rgba(168,85,247,.28)',
    verseBg: '#FAF5FF',
    verseBorder: '#A855F7',
    verseRefColor: '#7E22CE',
    description: {
      pt: 'Agora pergunte o porquê: o que esse trecho revela sobre o caráter de Deus ou sobre a condição humana?',
      en: "Now ask why: what does this passage reveal about God's character, or about the human condition?",
    },
    steps: {
      pt: [
        'O que esse texto mostra sobre <b>quem Deus é</b>?',
        'Há algum mandamento, promessa ou advertência nele?',
        'O que isso teria significado pra quem ouviu/leu pela primeira vez?',
      ],
      en: [
        'What does this text show about <b>who God is</b>?',
        'Is there a command, a promise, or a warning in it?',
        'What would this have meant to its first hearers or readers?',
      ],
    },
    verse: {
      pt: '"Toda a Escritura é inspirada por Deus e útil para o ensino, para a repreensão, para a correção."',
      en: 'All Scripture is God-breathed and is useful for teaching, rebuking, correcting.',
    },
    verseRef: { pt: '2 Timóteo 3:16', en: '2 Timothy 3:16' },
  },
  {
    id: 'A',
    letter: 'A',
    title: { pt: 'Aplicar', en: 'Apply' },
    subtitle: { pt: 'Viva isso hoje', en: 'Live it out today' },
    duration: { pt: '3 min', en: '3 min' },
    durationMin: 3,
    bgColor: 'rgba(192,38,211,.1)',
    letterColor: '#A21CAF',
    borderColor: 'rgba(192,38,211,.4)',
    stepBg: '#FDF4FF',
    dotColor: '#C026D3',
    glow: 'rgba(192,38,211,.28)',
    verseBg: '#FDF4FF',
    verseBorder: '#C026D3',
    verseRefColor: '#A21CAF',
    description: {
      pt: 'Termine trazendo isso pra sua vida real hoje — uma verdade bíblica só transforma quando é vivida.',
      en: "Finish by bringing this into your real life, today — a biblical truth only transforms when it's lived out.",
    },
    steps: {
      pt: [
        'Existe algo que você precisa <b>mudar, parar ou começar</b> a fazer?',
        'Escolha <b>uma aplicação concreta</b> pra hoje, não a lista inteira.',
        'Escreva uma frase curta pra lembrar disso ao longo do dia.',
      ],
      en: [
        'Is there something you need to <b>change, stop, or start</b> doing?',
        'Pick <b>one concrete application</b> for today, not the whole list.',
        'Write a short sentence to remember this throughout the day.',
      ],
    },
    verse: {
      pt: '"Sede praticantes da palavra, e não somente ouvintes, enganando-vos a vós mesmos."',
      en: 'Do not merely listen to the word, and so deceive yourselves. Do what it says.',
    },
    verseRef: { pt: 'Tiago 1:22', en: 'James 1:22' },
  },
]

// Duração de cada uma das 3 etapas (Reviver·Entender·Aplicar, mesma ordem
// de REFLECTION_DATA) por duração total do plano — Leve reflete 8min,
// Padrão 10min, Intensivo 15min. Ver ReflectionScreen.jsx, que escolhe o
// perfil certo a partir de session.plan.reflectionMinutes.
export const REFLECTION_DURATIONS = {
  8:  [2, 3, 3],
  10: [3, 4, 3],
  15: [4, 6, 5],
}
