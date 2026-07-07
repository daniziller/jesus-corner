// Conquistas: outra forma (não-temporal) de medir e comemorar o progresso da
// leitura. `ctx` é montado em App.jsx a partir de computeGamificationStats +
// streak + biblePercent + blocks.
export const ACHIEVEMENTS = [
  { id: 'first-session', icon: 'Star', title: { pt: 'Primeiro passo', en: 'First step' }, desc: { pt: 'Marque sua primeira sessão de leitura', en: 'Mark your first reading session' }, check: ctx => ctx.chaptersRead > 0 },
  { id: 'streak-7', icon: 'Flame', title: { pt: 'Uma semana com Deus', en: 'A week with God' }, desc: { pt: '7 dias seguidos de leitura', en: '7 days in a row reading' }, check: ctx => ctx.streak >= 7 },
  { id: 'streak-30', icon: 'Flame', title: { pt: 'Um mês com Deus', en: 'A month with God' }, desc: { pt: '30 dias seguidos de leitura', en: '30 days in a row reading' }, check: ctx => ctx.streak >= 30 },
  { id: 'first-book', icon: 'BookOpen', title: { pt: 'Primeiro livro', en: 'First book' }, desc: { pt: 'Termine de ler um livro inteiro', en: 'Finish reading an entire book' }, check: ctx => ctx.booksCompleted >= 1 },
  { id: 'ten-books', icon: 'Library', title: { pt: 'Biblioteca em construção', en: 'Building a library' }, desc: { pt: '10 livros completos', en: '10 books completed' }, check: ctx => ctx.booksCompleted >= 10 },
  { id: 'thirty-books', icon: 'Archive', title: { pt: 'Grande conhecedor', en: 'Great knower' }, desc: { pt: '30 livros completos', en: '30 books completed' }, check: ctx => ctx.booksCompleted >= 30 },
  { id: 'half-bible', icon: 'TrendingUp', title: { pt: 'Na metade do caminho', en: 'Halfway there' }, desc: { pt: '50% da Bíblia concluída', en: '50% of the Bible completed' }, check: ctx => ctx.biblePercent >= 50 },
  { id: 'block-1', icon: 'Scroll', title: { pt: 'Pentateuco', en: 'Pentateuch' }, desc: { pt: 'Bloco 1 completo', en: 'Block 1 completed' }, check: ctx => ctx.blockDone(1) },
  { id: 'block-2', icon: 'Swords', title: { pt: 'Livros Históricos', en: 'Historical Books' }, desc: { pt: 'Bloco 2 completo', en: 'Block 2 completed' }, check: ctx => ctx.blockDone(2) },
  { id: 'block-3', icon: 'Music', title: { pt: 'Poéticos e Sapienciais', en: 'Poetry and Wisdom' }, desc: { pt: 'Bloco 3 completo', en: 'Block 3 completed' }, check: ctx => ctx.blockDone(3) },
  { id: 'block-4', icon: 'Flame', title: { pt: 'Livros Proféticos', en: 'Prophetic Books' }, desc: { pt: 'Bloco 4 completo', en: 'Block 4 completed' }, check: ctx => ctx.blockDone(4) },
  { id: 'block-5', icon: 'Cross', title: { pt: 'Evangelhos', en: 'Gospels' }, desc: { pt: 'Bloco 5 completo', en: 'Block 5 completed' }, check: ctx => ctx.blockDone(5) },
  { id: 'block-6', icon: 'Globe', title: { pt: 'Atos dos Apóstolos', en: 'Acts of the Apostles' }, desc: { pt: 'Bloco 6 completo', en: 'Block 6 completed' }, check: ctx => ctx.blockDone(6) },
  { id: 'block-7', icon: 'Mail', title: { pt: 'Cartas', en: 'Letters' }, desc: { pt: 'Bloco 7 completo', en: 'Block 7 completed' }, check: ctx => ctx.blockDone(7) },
  { id: 'block-8', icon: 'Eye', title: { pt: 'Apocalipse', en: 'Revelation' }, desc: { pt: 'Bloco 8 completo', en: 'Block 8 completed' }, check: ctx => ctx.blockDone(8) },
  { id: 'whole-bible', icon: 'Crown', title: { pt: 'Bíblia completa!', en: 'Whole Bible!' }, desc: { pt: 'Leia a Bíblia inteira do início ao fim', en: 'Read the entire Bible from start to finish' }, check: ctx => ctx.biblePercent >= 100 },
  { id: 'first-prayer-request', icon: 'HandHeart', title: { pt: 'Primeira oração registrada', en: 'First prayer logged' }, desc: { pt: 'Adicione seu primeiro pedido de oração', en: 'Add your first prayer request' }, check: ctx => ctx.requestsAdded >= 1 },
  { id: 'five-prayer-requests', icon: 'Repeat', title: { pt: 'Guerreiro de oração', en: 'Prayer warrior' }, desc: { pt: 'Registre 5 pedidos de oração', en: 'Log 5 prayer requests' }, check: ctx => ctx.requestsAdded >= 5 },
  { id: 'first-answered-prayer', icon: 'Sparkles', title: { pt: 'Deus responde!', en: 'God answers!' }, desc: { pt: 'Marque seu primeiro pedido como atendido', en: 'Mark your first request as answered' }, check: ctx => ctx.requestsAnswered >= 1 },
  { id: 'five-answered-prayers', icon: 'Award', title: { pt: 'Testemunha de milagres', en: 'Witness to miracles' }, desc: { pt: '5 pedidos de oração atendidos', en: '5 prayer requests answered' }, check: ctx => ctx.requestsAnswered >= 5 },
  { id: 'first-prayer-timer', icon: 'Hourglass', title: { pt: 'Tempo com Deus', en: 'Time with God' }, desc: { pt: 'Complete o cronômetro de oração pela primeira vez', en: 'Complete the prayer timer for the first time' }, check: ctx => ctx.timerCompletions >= 1 },
  { id: 'ten-prayer-timers', icon: 'Timer', title: { pt: 'Vida de oração', en: 'A life of prayer' }, desc: { pt: '10 sessões de oração cronometradas completas', en: '10 completed timed prayer sessions' }, check: ctx => ctx.timerCompletions >= 10 },
]

export function computeUnlockedAchievements(ctx, lang = 'pt') {
  return ACHIEVEMENTS.map(a => ({
    ...a,
    title: a.title[lang] ?? a.title.pt,
    desc: a.desc[lang] ?? a.desc.pt,
    unlocked: a.check(ctx),
  }))
}
