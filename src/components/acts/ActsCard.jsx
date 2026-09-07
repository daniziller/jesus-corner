const ACTS_DATA = [
  {
    id: 'A',
    letter: 'A',
    title: { pt: 'Adoração', en: 'Adoration' },
    subtitle: { pt: 'Louve quem Deus é', en: 'Praise who God is' },
    duration: { pt: '4 min', en: '4 min' },
    durationMin: 4,
    // Âmbar (não laranja) de propósito — rgba(249,115,22)/#EA580C/#C2410C
    // eram exatamente o laranja de marca antigo, removido do resto do app
    // (ver commit "Limpa os últimos rastros do laranja antigo"); esse card
    // não representa a marca, só uma categoria entre 4 (A·C·T·S), mas usar
    // o hex idêntico ao banido lia como resíduo esquecido da limpeza.
    bgColor: 'rgba(217,119,6,.1)',
    letterColor: '#92400E',
    borderColor: 'rgba(217,119,6,.4)',
    stepBg: '#FFFBEB',
    dotColor: '#D97706',
    glow: 'rgba(217,119,6,.28)',
    verseBg: '#FFFBEB',
    verseBorder: '#D97706',
    verseRefColor: '#92400E',
    description: {
      pt: 'Comece focando em <b>quem Deus é</b>, não no que Ele fez. Declare Seus atributos com louvor genuíno.',
      en: 'Start by focusing on <b>who God is</b>, not what He has done. Declare His attributes with genuine praise.',
    },
    steps: {
      pt: [
        'Declare: <b>"Deus, Tu és Santo, Soberano, Eterno, Fiel..."</b>',
        'Use um <b>Salmo de louvor</b>: Salmo 145, 148 ou 150.',
        'Evite pedir. Foque em <b>contemplar Deus</b>.',
      ],
      en: [
        'Declare: <b>"God, You are Holy, Sovereign, Eternal, Faithful..."</b>',
        'Use a <b>psalm of praise</b>: Psalm 145, 148, or 150.',
        "Avoid asking for anything. Focus on <b>contemplating God</b>.",
      ],
    },
    verse: {
      pt: '"Grande é o Senhor e digníssimo de louvor; a sua grandeza é inescrutável."',
      en: '"Great is the Lord and most worthy of praise; his greatness no one can fathom."',
    },
    verseRef: { pt: 'Salmos 145:3', en: 'Psalm 145:3' },
  },
  {
    id: 'C',
    letter: 'C',
    title: { pt: 'Confissão', en: 'Confession' },
    subtitle: { pt: 'Reconheça seus pecados', en: 'Acknowledge your sins' },
    duration: { pt: '3 min', en: '3 min' },
    durationMin: 3,
    bgColor: 'rgba(220,38,38,.1)',
    letterColor: '#B91C1C',
    borderColor: 'rgba(220,38,38,.4)',
    stepBg: '#FFF1F2',
    dotColor: '#DC2626',
    glow: 'rgba(220,38,38,.28)',
    verseBg: '#FFF1F2',
    verseBorder: '#DC2626',
    verseRefColor: '#B91C1C',
    description: {
      pt: 'Com humildade, traga diante de Deus os pecados da semana — em pensamento, palavra ou ação.',
      en: "With humility, bring before God this week's sins — in thought, word, or deed.",
    },
    steps: {
      pt: [
        'Pergunte: <b>"Senhor, em que pequei esta semana?"</b> e espere.',
        'Confesse <b>especificamente</b>, sem generalizações.',
        'Depois, <b>receba o perdão</b> pela fé.',
      ],
      en: [
        'Ask: <b>"Lord, where have I sinned this week?"</b> and wait.',
        'Confess <b>specifically</b>, without generalizing.',
        'Then, <b>receive forgiveness</b> by faith.',
      ],
    },
    verse: {
      pt: '"Se confessarmos os nossos pecados, ele é fiel e justo para perdoar."',
      en: 'If we confess our sins, he is faithful and just and will forgive us.',
    },
    verseRef: { pt: '1 João 1:9', en: '1 John 1:9' },
  },
  {
    id: 'T',
    letter: 'T',
    title: { pt: 'Ação de Graças', en: 'Thanksgiving' },
    subtitle: { pt: 'Expresse gratidão', en: 'Express gratitude' },
    duration: { pt: '4 min', en: '4 min' },
    durationMin: 4,
    bgColor: 'rgba(22,163,74,.1)',
    letterColor: '#15803D',
    borderColor: 'rgba(22,163,74,.4)',
    stepBg: '#F0FDF4',
    dotColor: '#16A34A',
    glow: 'rgba(22,163,74,.28)',
    verseBg: '#F0FDF4',
    verseBorder: '#16A34A',
    verseRefColor: '#15803D',
    description: {
      pt: 'Aqui você agradece pelo que Deus <b>fez</b> — bênçãos concretas da sua vida.',
      en: 'Here you thank God for what He has <b>done</b> — concrete blessings in your life.',
    },
    steps: {
      pt: [
        'Liste <b>3 a 5 coisas específicas</b> pelas quais é grato hoje.',
        'Inclua também <b>dificuldades</b> pelas quais pode agradecer.',
        'Agradeça pelo <b>estudo de hoje</b> e pelo que Deus falou pela Palavra.',
      ],
      en: [
        "List <b>3 to 5 specific things</b> you're grateful for today.",
        "Also include <b>hardships</b> you can be thankful for.",
        "Thank God for <b>today's study</b> and what He spoke through the Word.",
      ],
    },
    verse: {
      pt: '"Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus."',
      en: 'Give thanks in all circumstances; for this is God\'s will for you in Christ Jesus.',
    },
    verseRef: { pt: '1 Tessalonicenses 5:18', en: '1 Thessalonians 5:18' },
  },
  {
    id: 'S',
    letter: 'S',
    title: { pt: 'Súplicas', en: 'Supplication' },
    subtitle: { pt: 'Apresente seus pedidos', en: 'Bring your requests' },
    duration: { pt: '4 min', en: '4 min' },
    durationMin: 4,
    bgColor: 'rgba(79,70,229,.1)',
    letterColor: '#4338CA',
    borderColor: 'rgba(79,70,229,.4)',
    stepBg: '#EEF2FF',
    dotColor: '#4F46E5',
    glow: 'rgba(79,70,229,.28)',
    verseBg: '#EEF2FF',
    verseBorder: '#4F46E5',
    verseRefColor: '#4338CA',
    // Texto de 25a ("Súplica · para hoje", o cartão escuro): "comece pelos
    // seus" é sobre os SEUS próprios pedidos silenciosos, não uma lista —
    // "os pedidos abaixo" são os até 3 de quem espera oração, renderizados
    // logo depois deste painel (ver PrayerScreen.jsx).
    description: {
      pt: 'Comece pelos seus — depois leve os pedidos abaixo, se houver. Um toque marca que você orou.',
      en: 'Start with your own — then bring the requests below, if any. One tap marks that you prayed.',
    },
    steps: {
      pt: [
        'Comece por <b>outros</b> antes de pedir por si mesmo.',
        'Ore com <b>fé e especificidade</b>.',
        'Encerre: <b>"Seja feita a Tua vontade, não a minha."</b>',
      ],
      en: [
        'Start with <b>others</b> before asking for yourself.',
        'Pray with <b>faith and specificity</b>.',
        'Close with: <b>"Your will be done, not mine."</b>',
      ],
    },
    verse: {
      pt: '"Em tudo sejam conhecidas, diante de Deus, as vossas petições."',
      en: 'In every situation, by prayer and petition, present your requests to God.',
    },
    verseRef: { pt: 'Filipenses 4:6', en: 'Philippians 4:6' },
  },
]

// Duração de cada uma das 4 etapas (A·C·T·S, mesma ordem de ACTS_DATA) por
// duração total do plano — Leve ora 10min, Padrão/Intensivo oram 15min (o
// ACTS "clássico", com os minutos originais de cada etapa). Ver
// PrayerScreen.jsx, que escolhe o perfil certo a partir de
// session.plan.prayerMinutes.
export const ACTS_DURATIONS = {
  15: [4, 3, 4, 4],
  10: [3, 2, 3, 2],
}

// Pesos usados pra dividir qualquer duração total (escolhida livremente na
// tela de Oração) entre as 4 etapas — mesma proporção das durações
// curadas acima (Adoração/Ação de Graças pesam mais que Confissão/Súplicas).
// Arredonda pelo "maior resto" pra sempre bater exatamente o total escolhido
// e garantir pelo menos 1 minuto por etapa.
const PHASE_WEIGHTS = [0.3, 0.2, 0.3, 0.2]

export function phaseMinutesFor(totalMinutes) {
  if (ACTS_DURATIONS[totalMinutes]) return ACTS_DURATIONS[totalMinutes]
  const raw = PHASE_WEIGHTS.map(w => w * totalMinutes)
  const floors = raw.map(Math.floor)
  const remainder = totalMinutes - floors.reduce((a, b) => a + b, 0)
  const byFractionDesc = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
  const result = [...floors]
  for (let k = 0; k < remainder; k++) result[byFractionDesc[k].i] += 1
  return result
}

export { ACTS_DATA }
