// prayerStages.js — as 4 etapas do ACTS na oração guiada nova (pacote
// 36-37, PrayerScreen.jsx). Texto FIXO do app (handoff: "não é gerada por
// IA, não muda") — título e explicação de cada etapa vêm literalmente do
// HANDOFF-36-37-passos.md; NÃO reaproveita src/components/acts/ActsCard.jsx
// (ACTS_DATA) porque o texto e até os nomes mudaram (ex.: "Gratidão" aqui,
// "Ação de Graças" lá) — ActsCard.jsx continua servindo quem ainda depende
// dele (ReflectionScreen.jsx, HandsFreeScreen.jsx), sem relação com esta tela.
//
// "starters" (as três "frases de partida" de cada etapa, 36b) só têm
// exemplo no quadro pra Confissão — as outras três foram propostas por
// mim no mesmo tom, aguardando aprovação dela (ver PR).
export const PRAYER_STAGES = [
  {
    id: 'adoracao',
    letter: 'A',
    title: { pt: 'Adoração', en: 'Adoration' },
    explanation: {
      pt: 'Comece dizendo quem Deus é, não o que você precisa. Louvar antes de pedir muda o tamanho do pedido.',
      en: 'Start by saying who God is, not what you need. Praising before asking changes the size of the request.',
    },
    starters: {
      pt: ['Senhor, Tu és...', 'Eu te adoro porque...', 'Antes de pedir qualquer coisa, eu te louvo por...'],
      en: ['Lord, You are...', 'I worship you because...', 'Before I ask for anything, I praise you for...'],
    },
  },
  {
    id: 'confissao',
    letter: 'C',
    title: { pt: 'Confissão', en: 'Confession' },
    explanation: {
      pt: 'Diga o que pesa, com nome. Não é para se acusar — é para entregar. Nada do que você contar aqui é novidade para Deus, e nada disso muda o amor dele por você.',
      en: "Say what's weighing on you, by name. It's not to accuse yourself — it's to hand it over. Nothing you share here is news to God, and none of it changes his love for you.",
    },
    starters: {
      pt: ['Senhor, eu errei em...', 'Tenho carregado isso sozinho:...', 'Me ajuda a largar...'],
      en: ['Lord, I was wrong in...', "I've been carrying this alone:...", 'Help me let go of...'],
    },
  },
  {
    id: 'gratidao',
    letter: 'G',
    title: { pt: 'Gratidão', en: 'Gratitude' },
    explanation: {
      pt: 'Agradeça o que já veio, o pequeno junto com o grande. Lembrar do que Deus fez é o que sustenta a fé no que ainda não veio.',
      en: "Thank him for what's already come, the small things with the big ones. Remembering what God has done is what sustains faith for what hasn't come yet.",
    },
    starters: {
      pt: ['Obrigado, Senhor, por...', 'Não quero esquecer que Tu...', 'Até nas coisas pequenas, obrigado por...'],
      en: ['Thank you, Lord, for...', "I don't want to forget that you...", 'Even in the small things, thank you for...'],
    },
  },
  {
    id: 'suplica',
    letter: 'S',
    title: { pt: 'Súplica', en: 'Supplication' },
    explanation: {
      pt: 'Agora peça, com nome e detalhe. Por você e pelos outros — e não tenha medo de repetir o mesmo pedido.',
      en: "Now ask, by name and in detail. For yourself and for others — and don't be afraid to repeat the same request.",
    },
    starters: {
      pt: ['Senhor, eu peço por...', 'E também levo até ti...', 'Não sei como resolver, mas confio a ti...'],
      en: ['Lord, I ask for...', 'I also bring before you...', "I don't know how to solve this, but I trust you with..."],
    },
  },
]
