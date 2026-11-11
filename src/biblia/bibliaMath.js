// bibliaMath.js — a aba Bíblia redesenhada (handoff-biblia-52): o que cada
// tela mostra, em funções puras. Nada aqui conta capítulo de novo — o
// progresso por livro e por bloco vem de computeBibleProgress (o mesmo da
// roda, da estante e do Hoje) e o estado de cada livro é o do selo
// (sealState). Estas funções só agrupam por testamento e escolhem as
// palavras. Testes em scripts/test-biblia.mjs.
import { GAMIFICATION_BLOCKS, bookInfo, blockById } from '../data/gamificationBlocks.js'
import { sealState } from '../gamification/sealDetails.js'
import { formatInt, formatPct, deOf } from '../gamification/format.js'
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
