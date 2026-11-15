// celebrationText.js — as frases das telas de conquista (G4, G5, G6),
// puras e testáveis: o fato, dito com calma, com o número e desde quando
// (HANDOFF §0 e §5.3). Nunca "Incrível!". Plural e número em pt-BR.
import { formatInt, faltamPhrase, deOf } from './format.js'
import { familyName, degrauName, familyUnit, blockLabel } from '../data/achievements.js'
import { blockById } from '../data/gamificationBlocks.js'
import { bookNameFor } from '../utils/progress.js'
import { tr, trN } from '../i18n/tr.js'

const tx = (lang, key, vars) => tr(lang, `conquistasTx.${key}`, vars)

// Limiar sob cada medalha da escada: "1 h", "10 h" (tempo) ou o número.
export function thresholdLabel(familyId, limiar, lang = 'pt') {
  return familyId === 'tempo' ? `${formatInt(limiar, lang)} h` : formatInt(limiar, lang)
}

// "Parabéns, {nome}. Desde {mês}, ..." — `sinceMonth` null omite o "desde".
export function familyCelebrationPhrase(familyId, { nome, value, sinceMonth }, lang = 'pt') {
  const fato = ['constancia', 'leitura', 'tempo', 'oracao', 'livros'].includes(familyId)
    ? trN(lang, `conquistasTx.cel_${familyId}`, value, { n: formatInt(value, lang) })
    : ''
  const cap = text => `${text.charAt(0).toUpperCase()}${text.slice(1)}`
  const body = sinceMonth ? `${tx(lang, 'sinceCap', { month: sinceMonth })} ${fato}` : cap(fato)
  return `${tx(lang, 'congrats', { nome })} ${body}`.trim()
}

// Bloco completo: "Parabéns, {nome}. Com {último livro}, você completou
// todos os livros de {bloco}."
export function blockCelebrationPhrase(blocoId, { nome, ultimoLivro }, lang = 'pt') {
  const bloco = blockById(blocoId)
  const vars = { nome, n: bloco.livros.length, block: blockLabel(blocoId, lang) }
  return ultimoLivro ? tx(lang, 'celBlockWith', { ...vars, book: bookNameFor(ultimoLivro, lang) }) : tx(lang, 'celBlock', vars)
}

// "{Nome} — faltam 8 semanas na meta" (A mais perto, G5).
export function closestPhrase(closest, lang = 'pt') {
  if (!closest) return ''
  const name = degrauName(closest.familyId, closest.degrau, lang) || closest.nome
  // Sem família (só nome e unidades, como já veio de pickClosest), as
  // unidades que vieram junto.
  const one = closest.familyId ? familyUnit(closest.familyId, 1, lang) : closest.unidadeSingular
  const many = closest.familyId ? familyUnit(closest.familyId, 2, lang) : closest.unidade
  return tx(lang, 'closestPhrase', { name, left: faltamPhrase(closest.remaining, one, many, lang) })
}

// Rodapé do cartão "Blocos da Bíblia" (G5): "Livros completos: 1 de 66 ·
// a Lei acende quando você terminar Deuteronômio" — ou, com mais de um
// livro faltando, quantos faltam.
export function nextBlockFooter(progress, nextBlock, lang = 'pt') {
  const head = tx(lang, 'booksComplete', { x: deOf(progress.livrosCompletos, progress.totalLivros, lang) })
  if (!nextBlock) return tx(lang, 'allLit', { head })
  const bloco = blockById(nextBlock.id)
  const k = nextBlock.livrosFaltantes.length
  if (lang === 'en') {
    const block = blockLabel(nextBlock.id, lang)
    return k === 1 ? tx(lang, 'lightsOne', { head, block, book: bookNameFor(nextBlock.livrosFaltantes[0], lang) }) : tx(lang, 'lightsMany', { head, block, k })
  }
  if (k === 1) return `${head} · ${bloco.artigo} ${bloco.nome} acende quando você terminar ${nextBlock.livrosFaltantes[0]}`
  return `${head} · faltam ${k} livros para ${bloco.artigo} ${bloco.nome} ${bloco.artigo === 'a' ? 'acender' : 'acenderem'}`
}

// "{FAMÍLIA} · {n} DE 6" (G4) e "{n} de 6" (G5/G6).
export function degrauCount(familyId, degrau, lang = 'pt') {
  return tx(lang, 'degrauCount', { fam: familyName(familyId, lang).toUpperCase(), n: degrau })
}
