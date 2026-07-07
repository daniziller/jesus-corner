import { BIBLE_BLOCKS, SESSIONS_BY_PLAN } from '../data/bibleBlocks'

// Chaves de progresso de uma sessão: capítulos individuais do livro (para
// sessões de leitura) ou uma chave única de reflexão (para a sessão que
// fecha o livro). Guardar por CAPÍTULO — não por id de sessão — é o que
// permite trocar de plano (Leve/Padrão/Intensivo) sem perder o que já foi
// lido: um mesmo capítulo pode cair em sessões diferentes em cada plano.
export function sessionKeys(session) {
  if (session.type === 'reflection') return [`${session.book}:reflection`]
  const keys = []
  for (let ch = session.chStart; ch <= session.chEnd; ch++) keys.push(`${session.book}:${ch}`)
  return keys
}

function isSessionDone(session, completedSet) {
  return sessionKeys(session).every(k => completedSet.has(k))
}

// A partir do conjunto de capítulos/reflexões já concluídos por um usuário e
// do plano escolhido (que define o TAMANHO das sessões — a ideia é sempre
// "1 sessão = 1 dia"), calcula o status de cada sessão (done/pending, com a
// primeira pendente destacada como "current") e o percentual de cada bloco.
// Todos os blocos e sessões ficam sempre acessíveis.
export function deriveProgress(completedSet, planId) {
  const sessionsSource = SESSIONS_BY_PLAN[planId] ?? SESSIONS_BY_PLAN.standard
  const blocks = []
  const sessionsByBlock = {}

  for (const block of BIBLE_BLOCKS) {
    const staticSessions = sessionsSource[block.id]
    let doneCount = 0
    let anyChapterDone = false

    const sessions = staticSessions.map(s => {
      const isDone = isSessionDone(s, completedSet)
      if (isDone) doneCount++
      if (!anyChapterDone && sessionKeys(s).some(k => completedSet.has(k))) anyChapterDone = true
      return { ...s, status: isDone ? 'done' : 'pending' }
    })

    // Destaca a primeira sessão ainda não concluída como sugestão de "próxima
    // leitura" — é só um destaque visual, não trava as demais.
    const firstPending = sessions.find(s => s.status === 'pending')
    if (firstPending) firstPending.status = 'current'

    const total = sessions.length
    const percent = total ? Math.round((doneCount / total) * 100) : 0
    const blockDone = doneCount === total

    // "todo" = nenhum capítulo desse bloco foi marcado ainda (nem parcialmente);
    // "active" assim que ao menos um capítulo é marcado, mesmo sem fechar uma sessão inteira.
    blocks.push({
      ...block,
      status: blockDone ? 'done' : anyChapterDone ? 'active' : 'todo',
      percent,
      sessionsTotal: total,
      sessionsDone: doneCount,
      sessionsLeft: total - doneCount,
      currentBook: firstPending ? firstPending.book : null,
      currentBookEn: firstPending ? firstPending.bookEn : null,
    })
    sessionsByBlock[block.id] = sessions
  }

  return { blocks, sessionsByBlock }
}

// Bloco "em foco" no momento: o primeiro ainda em andamento, ou o último
// concluído caso a Bíblia inteira já tenha sido lida.
export function pickActiveBlock(blocks) {
  return (
    blocks.find(b => b.status !== 'done') ??
    [...blocks].reverse().find(b => b.status === 'done') ??
    blocks[0]
  )
}

// Total de sessões do plano atual (soma de todos os blocos) — como a ideia é
// "1 sessão = 1 dia", esse número também é o total de dias do plano inteiro.
export function computeTotalSessions(blocks) {
  return blocks.reduce((s, b) => s + b.sessionsTotal, 0)
}

// Percentual real (não só do bloco ativo) do Antigo/Novo Testamento e da Bíblia toda,
// ponderado pelo número de sessões de cada bloco.
export function computeOverallStats(blocks) {
  const sum = (ids, key) => ids.reduce((s, id) => s + (blocks.find(b => b.id === id)?.[key] ?? 0), 0)
  const atIds = [1, 2, 3, 4], ntIds = [5, 6, 7, 8], allIds = [...atIds, ...ntIds]

  const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0)
  const atDone = sum(atIds, 'sessionsDone'), atTotal = sum(atIds, 'sessionsTotal')
  const ntDone = sum(ntIds, 'sessionsDone'), ntTotal = sum(ntIds, 'sessionsTotal')
  const totalDone = sum(allIds, 'sessionsDone'), totalAll = sum(allIds, 'sessionsTotal')

  return {
    biblePercent: pct(totalDone, totalAll),
    atPercent: pct(atDone, atTotal),
    ntPercent: pct(ntDone, ntTotal),
    sessionsDone: totalDone,
  }
}

// Quantos capítulos tem cada livro — derivado das sessões de leitura (o
// último chEnd de cada livro), então funciona com qualquer plano, já que o
// texto por trás é sempre o mesmo, só a divisão em sessões muda.
export function computeBookChapterCounts(sessionsByBlock) {
  const counts = {}
  for (const sessions of Object.values(sessionsByBlock)) {
    for (const s of sessions) {
      if (s.type === 'reflection') continue
      counts[s.book] = Math.max(counts[s.book] ?? 0, s.chEnd)
    }
  }
  return counts
}

// Métricas de progresso que NÃO dependem de tempo/minutos: capítulos lidos,
// livros e blocos completos, e um total de XP (10 por capítulo, +100 por
// livro concluído, +500 por bloco concluído) que alimenta o sistema de
// níveis (ver src/utils/levels.js).
export function computeGamificationStats(completedSet, sessionsByBlock, blocks) {
  const bookChapterCounts = computeBookChapterCounts(sessionsByBlock)
  const bookNames = Object.keys(bookChapterCounts)

  let chaptersRead = 0
  for (const key of completedSet) {
    const [book, part] = key.split(':')
    if (part !== 'reflection' && bookChapterCounts[book] != null) chaptersRead++
  }

  const booksCompleted = bookNames.filter(book => {
    const total = bookChapterCounts[book]
    for (let ch = 1; ch <= total; ch++) if (!completedSet.has(`${book}:${ch}`)) return false
    return completedSet.has(`${book}:reflection`)
  }).length

  const blocksCompleted = blocks.filter(b => b.status === 'done').length
  const totalChapters = bookNames.reduce((s, b) => s + bookChapterCounts[b], 0)
  const xp = chaptersRead * 10 + booksCompleted * 100 + blocksCompleted * 500

  return { chaptersRead, totalChapters, booksCompleted, totalBooks: bookNames.length, blocksCompleted, xp }
}
