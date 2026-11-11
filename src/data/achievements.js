// achievements.js — as 38 conquistas da gamificação (handoff-gamificacao-
// 43-46/data/conquistas.json, HANDOFF §5.1): 5 famílias × 6 degraus + 8
// blocos. Só dados estáticos (nomes, limiares, material de cada degrau);
// o cálculo de quem já ganhou o quê vive em src/gamification/.
//
// Não existe ponto, XP, nível nem ranking em lugar nenhum deste sistema
// (HANDOFF §0) — uma conquista é um fato cruzado, nunca um saldo.
import { GAMIFICATION_BLOCKS } from './gamificationBlocks.js'

export const TOTAL_ACHIEVEMENTS = 38
export const DEGRAUS_POR_FAMILIA = 6

// unidade: plural e singular — "faltam 8 semanas na meta" / "falta 1
// semana na meta" (G5, G6, G9). `mede` é a frase do cartão areia de G6.
// unidadeCurta: a forma curta que cabe ao lado do rótulo "PRÓXIMA
// CONQUISTA" no Hoje (handoff-hoje-50 §5) — "falta 1 h", "faltam 8
// semanas".
export const FAMILIES = [
  {
    id: 'constancia', nome: 'Constância',
    unidade: 'semanas na meta', unidadeSingular: 'semana na meta',
    unidadeCurta: 'semanas', unidadeCurtaSingular: 'semana',
    mede: 'Conta as semanas em que você cumpriu o seu plano — não precisam ser seguidas. Uma semana fraca não tira nada daqui.',
    degraus: [
      { degrau: 1, limiar: 1, nome: 'Primeira semana' },
      { degrau: 2, limiar: 4, nome: 'Um mês fiel' },
      { degrau: 3, limiar: 12, nome: 'Uma estação' },
      { degrau: 4, limiar: 26, nome: 'Meio ano' },
      { degrau: 5, limiar: 52, nome: 'Um ano inteiro' },
      { degrau: 6, limiar: 104, nome: 'Dois anos' },
    ],
  },
  {
    id: 'leitura', nome: 'Leitura',
    unidade: 'capítulos', unidadeSingular: 'capítulo',
    unidadeCurta: 'capítulos', unidadeCurtaSingular: 'capítulo',
    mede: 'Conta os capítulos distintos que você marcou como lidos. Reler um capítulo não conta de novo.',
    degraus: [
      { degrau: 1, limiar: 10, nome: 'Dez capítulos' },
      { degrau: 2, limiar: 50, nome: 'Cinquenta capítulos' },
      { degrau: 3, limiar: 150, nome: 'Um saltério' },
      { degrau: 4, limiar: 300, nome: 'Um quarto da Bíblia' },
      { degrau: 5, limiar: 600, nome: 'Metade da Bíblia' },
      { degrau: 6, limiar: 1189, nome: 'A Bíblia inteira' },
    ],
  },
  {
    id: 'tempo', nome: 'Tempo com Deus',
    unidade: 'horas', unidadeSingular: 'hora',
    unidadeCurta: 'h', unidadeCurtaSingular: 'h',
    mede: 'Soma a duração das suas sessões de oração, leitura e reflexão, em horas inteiras.',
    degraus: [
      { degrau: 1, limiar: 1, nome: 'A primeira hora' },
      { degrau: 2, limiar: 10, nome: 'Dez horas' },
      { degrau: 3, limiar: 25, nome: 'Vinte e cinco horas' },
      { degrau: 4, limiar: 50, nome: 'Cinquenta horas' },
      { degrau: 5, limiar: 100, nome: 'Cem horas' },
      { degrau: 6, limiar: 250, nome: 'Duzentas e cinquenta horas' },
    ],
  },
  {
    id: 'oracao', nome: 'Oração pelos outros',
    unidade: 'pedidos orados', unidadeSingular: 'pedido orado',
    unidadeCurta: 'pedidos', unidadeCurtaSingular: 'pedido',
    mede: 'Conta os toques em "Orei" em pedidos de outras pessoas — no máximo um por pedido por dia.',
    degraus: [
      { degrau: 1, limiar: 10, nome: 'Dez orações' },
      { degrau: 2, limiar: 50, nome: 'Cinquenta orações' },
      { degrau: 3, limiar: 100, nome: 'Cem orações' },
      { degrau: 4, limiar: 250, nome: 'Duzentas e cinquenta' },
      { degrau: 5, limiar: 500, nome: 'Quinhentas orações' },
      { degrau: 6, limiar: 1000, nome: 'Intercessor' },
    ],
  },
  {
    id: 'livros', nome: 'Livros completos',
    unidade: 'livros', unidadeSingular: 'livro',
    unidadeCurta: 'livros', unidadeCurtaSingular: 'livro',
    mede: 'Conta os livros em que você leu todos os capítulos.',
    degraus: [
      { degrau: 1, limiar: 1, nome: 'Primeiro livro' },
      { degrau: 2, limiar: 5, nome: 'Cinco livros' },
      { degrau: 3, limiar: 12, nome: 'Doze livros' },
      { degrau: 4, limiar: 27, nome: 'Vinte e sete livros' },
      { degrau: 5, limiar: 39, nome: 'Trinta e nove livros' },
      { degrau: 6, limiar: 66, nome: 'Os 66 livros' },
    ],
  },
]

const FAMILY_BY_ID = new Map(FAMILIES.map(f => [f.id, f]))
export function familyById(id) {
  return FAMILY_BY_ID.get(id) ?? null
}

// Material de cada degrau (HANDOFF §5.2): o glifo nunca muda, só o
// material. Cores como tokens de src/index.css — a Medalha lê daqui.
export const DEGRAU_MATERIAL = {
  1: { tile: 'var(--bento-ink)', glifo: 'var(--bento-t4)', bordaInterna: false, halo: false },
  2: { tile: 'var(--bento-ink)', glifo: 'var(--bloco-historicos)', bordaInterna: false, halo: false },
  3: { tile: 'var(--bento-ink)', glifo: 'var(--bento-accent)', bordaInterna: false, halo: false },
  4: { tile: 'var(--bento-ink)', glifo: 'var(--bento-accent)', bordaInterna: true, halo: false },
  5: { tile: 'var(--bento-accent)', glifo: 'var(--bento-ink)', bordaInterna: false, halo: false },
  6: { tile: 'var(--bento-accent)', glifo: 'var(--bento-ink)', bordaInterna: false, halo: true },
}

// Ids persistidos em user_data.achievements — "{família}:{degrau}" e
// "bloco:{id do bloco}". Nunca renomear: é a chave que diz "já ganhou".
export function familyAchievementId(familyId, degrau) {
  return `${familyId}:${degrau}`
}
export function blockAchievementId(blocoId) {
  return `bloco:${blocoId}`
}

export const BLOCK_ACHIEVEMENTS = GAMIFICATION_BLOCKS.map(b => ({
  id: blockAchievementId(b.id), blocoId: b.id, nome: b.nome, cor: b.cor,
}))

export const ALL_ACHIEVEMENT_IDS = [
  ...FAMILIES.flatMap(f => f.degraus.map(d => familyAchievementId(f.id, d.degrau))),
  ...BLOCK_ACHIEVEMENTS.map(b => b.id),
]

// Desmonta um id em { familyId, degrau } ou { blocoId } — pra quem recebe
// só a chave gravada (G5 "nova", G4) saber que medalha desenhar.
export function parseAchievementId(id) {
  if (id.startsWith('bloco:')) return { blocoId: id.slice(6) }
  const [familyId, degrau] = id.split(':')
  return { familyId, degrau: Number(degrau) }
}
