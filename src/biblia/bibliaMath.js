// bibliaMath.js — a aba Bíblia redesenhada (handoff-biblia-52): o que cada
// tela mostra, em funções puras. Nada aqui conta capítulo de novo — o
// progresso por livro e por bloco vem de computeBibleProgress (o mesmo da
// roda, da estante e do Hoje) e o estado de cada livro é o do selo
// (sealState). Estas funções só agrupam por testamento e escolhem as
// palavras. Testes em scripts/test-biblia.mjs.
import { GAMIFICATION_BLOCKS, BIBLE_BOOKS_TOTAL, bookInfo, blockById } from '../data/gamificationBlocks.js'
import { sealState, readingSecondsOf, countBookNotes } from '../gamification/sealDetails.js'
import { nextUnreadChapter, computeBibleProgress } from '../gamification/bibleProgressMath.js'
import { FAMILIES, familyAchievementId, blockAchievementId } from '../data/achievements.js'
import { formatInt, formatPct, deOf, formatDuration, dayMonthLong } from '../gamification/format.js'
import { originOf } from '../bible/chapterOrigin.js'
import { dateKey, parseLocalDateKey } from '../utils/dateKey.js'
import { todaysSteps } from '../meuPlano/meuPlanoMath.js'

// ── B1: a raiz (HANDOFF §2) ─────────────────────────────────────────────

export const TESTAMENTS = [
  { id: 'at', nome: 'Antigo Testamento', linhas: ['Antigo', 'Testamento'] },
  { id: 'nt', nome: 'Novo Testamento', linhas: ['Novo', 'Testamento'] },
]

export function blocksOfTestament(id) {
  return GAMIFICATION_BLOCKS.filter(b => b.testamento === id)
}

// 'at' | 'nt' do livro; null se o nome não é de um livro da Bíblia.
export function testamentOfBook(nome) {
  const info = nome ? bookInfo(nome) : null
  return info ? blockById(info.blocoId).testamento : null
}

// Qual testamento vem selecionado: a escolha lembrada; no primeiro uso, o
// do livro em que a pessoa está; sem nada disso, o Antigo.
export function initialTestament(saved, currentBook) {
  if (saved === 'at' || saved === 'nt') return saved
  return testamentOfBook(currentBook) ?? 'at'
}

// Progresso de um testamento: soma dos blocos dele.
export function testamentProgress(progress, id) {
  let lidos = 0
  let total = 0
  for (const b of progress.porBloco) {
    if (blockById(b.id).testamento !== id) continue
    lidos += b.lidos
    total += b.total
  }
  return { lidos, total, faltam: total - lidos, percent: total ? Math.round((lidos / total) * 1000) / 10 : 0, completo: total > 0 && lidos === total }
}

// Os textos de um cartão de testamento: "5,4%", "50 de 929 capítulos
// lidos", "faltam 879" (ou "completo").
export function testamentTexts(tp) {
  return {
    percent: formatPct(tp.percent),
    chapters: `${deOf(tp.lidos, tp.total)} capítulos lidos`,
    remaining: tp.completo ? 'completo' : `faltam ${formatInt(tp.faltam)}`,
  }
}

// Cartão de progresso: "4,2%", "50 de 1.189 capítulos", "1 livro completo
// · 3 blocos começados".
export function progressCardTexts(progress) {
  const l = progress.livrosCompletos
  const b = progress.blocosComecados
  const chapters = `${deOf(progress.capitulosLidos, progress.totalCapitulos)} capítulos`
  return {
    percent: formatPct(progress.percent),
    chapters,
    line: `${formatInt(l)} ${l === 1 ? 'livro completo' : 'livros completos'} · ${b} ${b === 1 ? 'bloco começado' : 'blocos começados'}`,
    aria: `Sua Bíblia, ${formatPct(progress.percent)} lida, ${chapters}`,
  }
}

// A barra dos oito blocos: um segmento por bloco, na ordem canônica, com
// a largura proporcional aos capítulos do bloco e o preenchimento = lidos
// ÷ capítulos do bloco.
export function blockBarSegments(progress) {
  return progress.porBloco.map(b => ({ id: b.id, flex: b.total, ratio: b.total ? b.lidos / b.total : 0, started: b.lidos > 0 }))
}

// "0 de 5 livros" · "1 de 12 livros" no cabeçalho de um bloco.
export function blockBooksCount(blockProgress) {
  return `${blockProgress.livrosCompletos} de ${blockProgress.livrosTotal} livros`
}

function chaptersWord(n) {
  return n === 1 ? '1 capítulo' : `${formatInt(n)} capítulos`
}

// A pastilha de um livro: o estado (o mesmo do selo), a linha de apoio e
// o rótulo de leitor de tela ("Gênesis, 40 de 50 capítulos").
export function bookTile(nome, p) {
  const state = sealState(p.lidos, p.total)
  const support = state === 'completo'
    ? `${chaptersWord(p.total)} · completo`
    : state === 'andamento' ? deOf(p.lidos, p.total) : chaptersWord(p.total)
  return {
    state, support,
    ratio: p.total ? p.lidos / p.total : 0,
    aria: `${nome}, ${deOf(p.lidos, p.total)} ${p.total === 1 ? 'capítulo' : 'capítulos'}`,
  }
}

// Sessão de hoje pelo plano: o trecho ("Gênesis 41") quando a Leitura cai
// hoje, ainda não foi feita e o plano tem um trecho; null em dia de
// descanso, de estudo sem leitura, com a leitura já feita ou sem plano de
// leitura. Os passos de hoje são os mesmos do Meu Plano (todaysSteps).
export function readingSessionToday({ routineModules, stepDays, todayIdx, dayEntry, passage }) {
  if (!passage) return null
  if (!todaysSteps(routineModules, stepDays, todayIdx).includes('reading')) return null
  if (dayEntry?.reading) return null
  return passage
}

// O cartão preto "continuar": a sessão de hoje (botão "Ler") e a leitura
// livre (linha). Sem sessão, a leitura livre ocupa o cartão; sem as duas,
// não há cartão (null). O versículo só entra quando é conhecido.
export function continueCard({ sessionTitle, free }) {
  const freeLine = free?.book && free?.chapter
    ? { passage: `${free.book} ${free.chapter}`, verse: free.verse > 1 ? free.verse : null }
    : null
  if (!sessionTitle && !freeLine) return null
  return {
    label: sessionTitle ? 'SESSÃO DE HOJE · CONTA NO PLANO' : 'CONTINUAR A LEITURA LIVRE',
    sessionTitle: sessionTitle || null,
    free: freeLine,
  }
}

// ── B2: o livro (HANDOFF §3) ────────────────────────────────────────────

// "Lei · livro 1 de 66"
export function bookHeaderSub(nome) {
  const info = bookInfo(nome)
  return `${blockById(info.blocoId).nome} · livro ${info.posicao} de ${BIBLE_BOOKS_TOTAL}`
}

// A frase ao lado do selo: "Faltam 10 capítulos para o selo" · "Falta 1
// capítulo para o selo" · "50 capítulos para o selo" (nada lido) · "Selo
// ganho em 14 de setembro" (completo; sem a data conhecida, "Selo ganho").
// `seal` é a entrada do livro na linha gravada ({ completedAt, dateKnown }).
export function bookSealLine(p, seal) {
  if (p.completo) return seal?.completedAt && seal.dateKnown !== false ? `Selo ganho em ${dayMonthLong(seal.completedAt)}` : 'Selo ganho'
  if (p.lidos === 0) return `${chaptersWord(p.total)} para o selo`
  return p.faltam === 1 ? 'Falta 1 capítulo para o selo' : `Faltam ${formatInt(p.faltam)} capítulos para o selo`
}

// Data do primeiro capítulo lido do livro (o registro mais antigo em
// chapters_read); null quando nenhum capítulo dele tem data registrada.
export function firstChapterIso(nome, chapterRows) {
  let min = null
  for (const r of chapterRows ?? []) if (r?.livro === nome && r.created_at && (!min || r.created_at < min)) min = r.created_at
  return min
}

// Marcações (não escondidas) feitas neste livro.
export function countBookMarks(nome, highlights) {
  return (highlights ?? []).filter(h => h && !h.hidden && h.book === nome).length
}

// Os três números do livro. Cada um só aparece quando existe de verdade:
// tempo de leitura (zero = nada registrado, some), dias desde o primeiro
// capítulo (sem data registrada, some) e notas + marcações (sempre).
export function bookNumbers({ nome, sessionRows, chapterRows, notes, highlights, today = new Date() }) {
  const out = []
  const seconds = readingSecondsOf(nome, sessionRows)
  if (seconds > 0) out.push({ key: 'time', value: formatDuration(seconds), caption: 'de leitura' })
  const first = firstChapterIso(nome, chapterRows)
  if (first) {
    const days = Math.max(1, Math.round((parseLocalDateKey(dateKey(today)) - parseLocalDateKey(dateKey(new Date(first)))) / 86400000))
    out.push({ key: 'days', value: `${formatInt(days)} ${days === 1 ? 'dia' : 'dias'}`, caption: 'desde o primeiro' })
  }
  out.push({ key: 'notes', value: formatInt(countBookNotes(nome, notes) + countBookMarks(nome, highlights)), caption: 'notas e marcações' })
  return out
}

// As casas da grade: 'app' (lido no app, cor do bloco) · 'manual' (marcado
// à mão, tom do bloco) · 'next' (o primeiro não lido, laranja) · 'none'.
// `originMap` vem de buildChapterOriginMap (chapters_read).
export function chapterCells(nome, total, completedSet, originMap) {
  const next = nextUnreadChapter(nome, total, completedSet)
  return Array.from({ length: total }, (_, i) => {
    const ch = i + 1
    const done = completedSet.has(`${nome}:${ch}`)
    const state = done ? (originOf(originMap, nome, ch) === 'manual' ? 'manual' : 'app') : ch === next ? 'next' : 'none'
    return { ch, state }
  })
}

const CELL_WORDS = { app: 'lido no app', manual: 'marcado à mão', next: 'próximo', none: 'não lido' }
export function chapterCellAria(cell) {
  return `Capítulo ${cell.ch}, ${CELL_WORDS[cell.state]}`
}

// A legenda: só os estados que existem na grade, nesta ordem.
export function chapterLegend(cells) {
  return ['app', 'manual', 'next'].filter(st => cells.some(c => c.state === st)).map(st => ({ state: st, label: CELL_WORDS[st] }))
}

// O botão fixo do rodapé: "Abrir Gênesis 41" (o próximo não lido) ·
// "Começar Gênesis" (nada lido) · "Ler Gênesis de novo" (completo, abre o
// capítulo 1).
export function bookFooterButton(nome, p, completedSet) {
  if (p.completo) return { label: `Ler ${nome} de novo`, chapter: 1 }
  if (p.lidos === 0) return { label: `Começar ${nome}`, chapter: 1 }
  const next = nextUnreadChapter(nome, p.total, completedSet)
  return { label: `Abrir ${nome} ${next}`, chapter: next }
}

// As duas linhas da lista de ações. Livro completo: a primeira vira
// "Desmarcar o livro".
export function bookActions(nome, p) {
  return [
    p.completo
      ? { key: 'unmark', title: 'Desmarcar o livro', sub: p.total === 1 ? 'O capítulo volta a não lido' : `Os ${formatInt(p.total)} capítulos voltam a não lidos` }
      : { key: 'mark', title: 'Marcar o livro inteiro como lido', sub: `Para quem já leu ${nome} antes do app` },
    { key: 'plan', title: 'Começar meu plano aqui', sub: `Faz de ${nome} o ponto de partida` },
  ]
}

// ── B3: lendo (HANDOFF §4) ──────────────────────────────────────────────

// O fio de progresso do livro: quanto dele está lido e a frase à direita.
// "· leitura livre" só entra na leitura livre — e sai enquanto o cartão
// de capítulo marcado (B4) está na tela, que já diz isso. Na leitura do
// plano (S3), `step` ("Passo 2 de 3") vem na frente.
export function readingThread(p, { free = false, step = '' } = {}) {
  return {
    ratio: p.total > 0 ? p.lidos / p.total : 0,
    text: `${step ? `${step} · ` : ''}${deOf(p.lidos, p.total)} ${p.lidos === 1 ? 'lido' : 'lidos'}${free ? ' · leitura livre' : ''}`,
  }
}

// Rótulo do capítulo em cima do texto: "Salmo 23" no livro de Salmos,
// "Capítulo 3" nos outros (vira maiúscula por CSS).
export function chapterLabel(nome, chapter, lang = 'pt') {
  const word = nome === 'Salmos' ? (lang === 'en' ? 'Psalm' : 'Salmo') : (lang === 'en' ? 'Chapter' : 'Capítulo')
  return `${word} ${chapter}`
}

// O botão da barra inferior da leitura livre.
export function markButton(done) {
  return done ? { done: true, label: 'Lido · desmarcar' } : { done: false, label: 'Marcar como lido' }
}

// O versículo que está no topo da área de leitura — `items` são os
// versículos na ordem do texto, cada um com o `bottom` da sua caixa;
// `edge` é onde a área visível começa (logo abaixo do cabeçalho). É o
// primeiro que ainda não saiu por cima; nulo sem versículo nenhum.
export function topVisibleVerse(items, edge) {
  const hit = (items ?? []).find(it => it.bottom > edge)
  return hit ? hit.verse : null
}

// ── B4: capítulo marcado (HANDOFF §5) ───────────────────────────────────

// O próximo degrau da família Leitura para quem tem `lidos` capítulos.
export function nextLeituraStep(lidos) {
  const d = FAMILIES.find(f => f.id === 'leitura').degraus.find(x => x.limiar > lidos)
  return d ? { nome: d.nome, faltam: d.limiar - lidos } : null
}

const faltamValue = k => (k === 1 ? 'falta 1' : `faltam ${formatInt(k)}`)

// O cartão que entra no lugar da barra quando o capítulo é marcado.
// `progress` já é o de DEPOIS da marcação. O terceiro número aponta o
// próximo degrau de Leitura — ou o selo do livro, quando faltam 3
// capítulos ou menos pra ele. No último capítulo não há "Seguir para".
export function markedCard({ nome, displayName = nome, chapter, progress }) {
  const p = progress.porLivro[nome]
  const numbers = [
    { value: deOf(p.lidos, p.total), caption: `em ${displayName}` },
    { value: formatInt(progress.capitulosLidos), caption: progress.capitulosLidos === 1 ? 'capítulo na Bíblia' : 'capítulos na Bíblia' },
  ]
  const seal = p.faltam > 0 ? { value: faltamValue(p.faltam), caption: `para o selo de ${displayName}` } : null
  const step = nextLeituraStep(progress.capitulosLidos)
  const third = seal && p.faltam <= 3 ? seal : step ? { value: faltamValue(step.faltam), caption: `para "${step.nome}"` } : seal
  if (third) numbers.push(third)
  const title = `${displayName} ${chapter} lido`
  return {
    title,
    sub: 'Leitura livre · não mexe no seu plano',
    numbers,
    next: chapter < p.total ? { chapter: chapter + 1, label: `Seguir para ${displayName} ${chapter + 1}` } : null,
    aria: `${title}. ${numbers.map(n => `${n.value} ${n.caption}`).join(', ')}.`,
  }
}

// Marcar este capítulo abre o cartão (B4) ou a tela de parabéns? Parabéns
// quando a marcação completa o livro, completa um bloco ou sobe um degrau
// de Leitura — e só se isso ainda não foi ganho antes (`sealedBooks`:
// livros que já têm selo; `earnedIds`: conquistas já gravadas; quem
// desmarca e marca de novo não ganha duas vezes). As outras famílias
// (constância, tempo) dependem de dados da conta e seguem pelo caminho de
// sempre: aparecem ao voltar pro Hoje.
export function markOutcome({ nome, chapter, completedSet, earnedIds = null, sealedBooks = null }) {
  const key = `${nome}:${chapter}`
  if (completedSet.has(key)) return 'card'
  const before = computeBibleProgress(completedSet)
  const after = computeBibleProgress(new Set(completedSet).add(key))
  if (after.porLivro[nome].completo && !sealedBooks?.has(nome)) return 'celebration'
  const blocoId = bookInfo(nome).blocoId
  const wasComplete = before.porBloco.find(b => b.id === blocoId).completo
  if (!wasComplete && after.porBloco.find(b => b.id === blocoId).completo && !earnedIds?.has(blockAchievementId(blocoId))) return 'celebration'
  for (const d of FAMILIES.find(f => f.id === 'leitura').degraus) {
    if (before.capitulosLidos < d.limiar && after.capitulosLidos >= d.limiar && !earnedIds?.has(familyAchievementId('leitura', d.degrau))) return 'celebration'
  }
  return 'card'
}

