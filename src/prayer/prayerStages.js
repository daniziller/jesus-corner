// prayerStages.js — as 4 etapas do ACTS na oração guiada (PrayerScreen.jsx,
// S1/S2 de handoff-passos-pedidos-53-54). Texto FIXO do app (não é gerado
// por IA, não muda): o nome, a orientação e as três frases de começo de
// cada etapa. A orientação e as frases da Confissão são as do quadro S1; a
// orientação da Súplica é a do quadro S2; as das outras duas etapas vêm
// do pacote 36-37 (36b), e as frases de começo delas foram propostas no
// mesmo tom. NÃO reaproveita src/components/acts/ActsCard.jsx (ACTS_DATA):
// o texto e até os nomes são outros ("Gratidão" aqui, "Ação de Graças"
// lá) — aquele continua servindo quem ainda depende dele.
//
// As frases de começo terminam em reticências — é como aparecem na
// pastilha; ao tocar, a frase entra no campo sem elas (passosMath.js,
// insertStarter).
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
      pt: ['Senhor, Tu és…', 'Eu te adoro porque…', 'Antes de pedir qualquer coisa, eu te louvo por…'],
      en: ['Lord, You are…', 'I worship you because…', 'Before I ask for anything, I praise you for…'],
    },
  },
  {
    id: 'confissao',
    letter: 'C',
    title: { pt: 'Confissão', en: 'Confession' },
    explanation: {
      pt: 'Diga o que pesa, com nome. Não é para se acusar — é para entregar. Nada do que você contar aqui é novidade para Deus.',
      en: "Say what's weighing on you, by name. It's not to accuse yourself — it's to hand it over. Nothing you share here is news to God.",
    },
    starters: {
      pt: ['Senhor, eu errei em…', 'Tenho carregado sozinho…', 'Me ajuda a largar…'],
      en: ['Lord, I was wrong in…', "I've been carrying alone…", 'Help me let go of…'],
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
      pt: ['Obrigado, Senhor, por…', 'Não quero esquecer que Tu…', 'Até nas coisas pequenas, obrigado por…'],
      en: ['Thank you, Lord, for…', "I don't want to forget that you…", 'Even in the small things, thank you for…'],
    },
  },
  {
    id: 'suplica',
    letter: 'S',
    title: { pt: 'Súplica', en: 'Supplication' },
    explanation: {
      pt: 'Peça. Pelos seus e pelos outros. Toque no pedido depois de orar por ele.',
      en: 'Ask. For your own and for others. Tap a request after praying for it.',
    },
    // Sem frases de começo: na Súplica o cartão de escrita dá lugar à lista
    // de pedidos (S2).
  },
]
