// celebrationText.js — as frases das telas de conquista (G4, G5, G6),
// puras e testáveis: o fato, dito com calma, com o número e desde quando
// (HANDOFF §0 e §5.3). Nunca "Incrível!". Plural e número em pt-BR.
import { formatInt, faltamPhrase, deOf } from './format.js'
import { familyById } from '../data/achievements.js'
import { blockById } from '../data/gamificationBlocks.js'

// Limiar sob cada medalha da escada: "1 h", "10 h" (tempo) ou o número.
export function thresholdLabel(familyId, limiar) {
  return familyId === 'tempo' ? `${formatInt(limiar)} h` : formatInt(limiar)
}

// "Parabéns, {nome}. Desde {mês}, ..." — `sinceMonth` null omite o "desde".
export function familyCelebrationPhrase(familyId, { nome, value, sinceMonth }) {
  const desde = sinceMonth ? `Desde ${sinceMonth}, ` : ''
  const cap = s => (desde ? s : s.charAt(0).toUpperCase() + s.slice(1))
  let fato
  switch (familyId) {
    case 'constancia':
      fato = cap(`você cumpriu o seu plano em ${formatInt(value)} ${value === 1 ? 'semana' : 'semanas'} — sem precisar que fossem seguidas.`)
      break
    case 'leitura':
      fato = cap(`você marcou ${formatInt(value)} ${value === 1 ? 'capítulo' : 'capítulos'} como ${value === 1 ? 'lido' : 'lidos'}.`)
      break
    case 'tempo':
      fato = cap(`somando oração, leitura e reflexão, ${value === 1 ? 'foi' : 'foram'} ${formatInt(value)} ${value === 1 ? 'hora inteira' : 'horas inteiras'}.`)
      break
    case 'oracao':
      fato = cap(`você orou ${formatInt(value)} ${value === 1 ? 'vez' : 'vezes'} por pedidos de outras pessoas.`)
      break
    case 'livros':
      fato = cap(`você leu ${formatInt(value)} ${value === 1 ? 'livro inteiro' : 'livros inteiros'}.`)
      break
    default:
      fato = ''
  }
  return `Parabéns, ${nome}. ${desde}${fato}`.trim()
}

// Bloco completo: "Parabéns, {nome}. Com {último livro}, você completou
// todos os livros de {bloco}."
export function blockCelebrationPhrase(blocoId, { nome, ultimoLivro }) {
  const bloco = blockById(blocoId)
  const com = ultimoLivro ? `Com ${ultimoLivro}, você` : 'Você'
  return `Parabéns, ${nome}. ${com} completou todos os ${bloco.livros.length} livros de ${bloco.nome}.`
}

// "{Nome} — faltam 8 semanas na meta" (A mais perto, G5).
export function closestPhrase(closest) {
  if (!closest) return ''
  return `${closest.nome} — ${faltamPhrase(closest.remaining, closest.unidadeSingular, closest.unidade)}`
}

// Rodapé do cartão "Blocos da Bíblia" (G5): "Livros completos: 1 de 66 ·
// a Lei acende quando você terminar Deuteronômio" — ou, com mais de um
// livro faltando, quantos faltam.
export function nextBlockFooter(progress, nextBlock) {
  const head = `Livros completos: ${deOf(progress.livrosCompletos, progress.totalLivros)}`
  if (!nextBlock) return `${head} · todos os blocos acesos`
  const bloco = blockById(nextBlock.id)
  const k = nextBlock.livrosFaltantes.length
  if (k === 1) return `${head} · ${bloco.artigo} ${bloco.nome} acende quando você terminar ${nextBlock.livrosFaltantes[0]}`
  return `${head} · faltam ${k} livros para ${bloco.artigo} ${bloco.nome} ${bloco.artigo === 'a' ? 'acender' : 'acenderem'}`
}

// "{FAMÍLIA} · {n} DE 6" (G4) e "{n} de 6" (G5/G6).
export function degrauCount(familyId, degrau) {
  return `${familyById(familyId).nome.toUpperCase()} · ${degrau} DE 6`
}
