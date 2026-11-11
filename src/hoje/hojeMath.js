// hojeMath.js — textos e estados do Hoje (handoff-hoje-50, H1). Nada aqui
// recalcula o que a gamificação e o Meu Plano já calculam: estas funções
// só dão forma (frase, rótulo, estado visual) ao que computeBibleProgress,
// weeksMath, computeMeuPlano e pickClosest devolvem. Puro, sem React nem
// stores — testado em scripts/test-hoje.mjs.
import { formatInt, formatPct, deOf, monthYearLong } from '../gamification/format.js'
import { footerBook } from '../gamification/bibleProgressMath.js'
import { familyById } from '../data/achievements.js'
import { bookInfo } from '../data/gamificationBlocks.js'
import { STEP_ORDER, stepName, doneWord, stepsCountText, stepShortDetail } from '../meuPlano/meuPlanoMath.js'
import { markedWeekdayUnion } from '../routine/stepDaysMath.js'
import { WEEKDAY_FULL } from '../routine/weeklyDaysMath.js'

// ── Bloco 1: Sua caminhada (HANDOFF §3) ─────────────────────────────────

// "50 de 1.189 capítulos"
export function chaptersLine(progress) {
  return `${deOf(progress.capitulosLidos, progress.totalCapitulos)} capítulos`
}

// Terceira linha do cartão da Bíblia: "Gênesis 41 de 50 · faltam 9 para o
// selo" · "falta 1 para o selo" · "Comece por onde quiser" (nada lido
// ainda) · "Terminada em setembro de 2026" (Bíblia inteira; vazio enquanto
// a data não chegou).
export function bibleBookLine(progress, currentBook, finishedIso) {
  if (progress.bibliaInteira) return finishedIso ? `Terminada em ${monthYearLong(new Date(finishedIso))}` : ''
  if (progress.capitulosLidos === 0) return 'Comece por onde quiser'
  const book = footerBook(progress, currentBook)
  const p = book ? progress.porLivro[book] : null
  if (!p) return 'Comece por onde quiser'
  const faltam = p.faltam === 1 ? 'falta 1 para o selo' : `faltam ${formatInt(p.faltam)} para o selo`
  return `${book} ${deOf(p.lidos, p.total)} · ${faltam}`
}

// Data em que a Bíblia foi terminada: o capítulo lido mais recente.
export function bibleFinishedIso(chapterRows) {
  let max = null
  for (const r of chapterRows ?? []) if (r?.created_at && (!max || r.created_at > max)) max = r.created_at
  return max
}

// Rótulos dos quatro alvos da caminhada (leitor de tela).
export function bibleCardAria(progress) {
  return `Sua Bíblia, ${formatPct(progress.percent)} lida, ${deOf(progress.capitulosLidos, progress.totalCapitulos)} capítulos`
}
export function weeksAria(total) {
  return `${formatInt(total)} ${total === 1 ? 'semana' : 'semanas'} na meta`
}
export function daysAria(feitos, meta) {
  return `${feitos} de ${meta} ${meta === 1 ? 'dia' : 'dias'} na meta esta semana`
}
export function sealsAria(completos, totalLivros) {
  return `${completos} ${completos === 1 ? 'selo' : 'selos'} de ${totalLivros} livros`
}

// Os sete pontos do quadrado "Dias": quatro estados visuais a partir dos
// cinco de computeWeekDayStates (dia fora do plano, descanso e dia que
// passou sem leitura têm a mesma cara — sem vermelho, sem X).
const DOT_KIND = { leu: 'done', hoje: 'today', plano: 'upcoming' }
export function dayDotKind(state) {
  return DOT_KIND[state] ?? 'off'
}

// ── Bloco 2: Seu plano de hoje (HANDOFF §4) ─────────────────────────────
// Tudo aqui parte do estado que computeMeuPlano já devolve (os mesmos
// passos de hoje, na mesma ordem, com o mesmo "feito") — o Hoje só escolhe
// as palavras do seu cartão.

// Em que estado o cartão está:
//   'loading' — os dias do plano ainda não chegaram;
//   'error'   — não deu pra carregar os dias (botão de tentar de novo);
//   'noPlan'  — nenhum passo ligado tem dia marcado na semana;
//   'rest'    — nada cai hoje;
//   'before'  — nada feito; 'during' — no meio (ou passo aberto e
//               interrompido, mesmo sem nenhum feito); 'done' — tudo feito.
export function planCardKind({ loadError, stepDays, routineModules, state }) {
  if (loadError) return 'error'
  if (!stepDays || !state) return 'loading'
  const active = STEP_ORDER.filter(k => (routineModules ?? []).includes(k))
  if (!markedWeekdayUnion(stepDays, active).some(Boolean)) return 'noPlan'
  if (state.kind === 'before' && state.now?.interrupted) return 'during'
  return state.kind
}

// As duas linhas à direita do cabeçalho; null onde o quadro não as tem.
export function planHeaderRight(kind, state) {
  if (kind === 'before') return [`${state.total} ${state.total === 1 ? 'passo' : 'passos'}`, `${state.totalMinutes} min`]
  if (kind === 'during') return [stepsCountText(state.doneCount, state.total), state.remainingMinutes === 1 ? 'falta 1 min' : `faltam ${state.remainingMinutes} min`]
  if (kind === 'done') return ['Plano completo', `${state.totalMinutes} min`]
  return null
}

// O botão do cartão. `primary` = o laranja (um só na tela); `action` diz
// a quem chama o que fazer: 'start' abre o passo de agora e emenda os
// seguintes (o mesmo do Meu Plano), 'plan' vai pra aba Meu Plano, 'read'
// é a leitura livre, 'adjust' abre o Ajustar, 'retry' recarrega os dias.
const PLAN_BUTTONS = {
  before: { label: 'Começar meu plano', primary: true, arrow: true, action: 'start' },
  during: { label: 'Continuar meu plano', primary: true, arrow: true, action: 'start' },
  done: { label: 'Ver meu plano', primary: false, arrow: false, action: 'plan' },
  rest: { label: 'Quero ler hoje mesmo assim', primary: false, arrow: false, action: 'read' },
  noPlan: { label: 'Criar meu plano', primary: true, arrow: true, action: 'adjust' },
  error: { label: 'Tentar novamente', primary: false, arrow: false, action: 'retry' },
}
export function planButton(kind) {
  return PLAN_BUTTONS[kind] ?? null
}

// Título: a leitura de hoje ("Gênesis 42" — depois de feita, o que foi
// lido); em dia de estudo, o nome do estudo; sem leitura nem estudo hoje,
// o nome do primeiro passo.
export function planTitle(kind, state, ctx) {
  if (kind === 'rest') return 'Hoje é descanso'
  if (kind === 'noPlan') return 'Monte seu plano'
  if (kind === 'error') return 'Não foi possível carregar seu plano'
  const reading = state.steps.find(s => s.key === 'reading')
  if (reading) return (reading.status === 'done' ? ctx.readingDonePassage : null) || ctx.readingPassage || stepName('reading')
  if (state.steps.some(s => s.key === 'study')) return ctx.study?.title || stepName('study')
  return stepName(state.steps[0].key)
}

// A linha solta abaixo do título: "Volta quinta." no descanso (o próximo
// dia com algo marcado) e a dica do erro de carregamento.
export function planLine(kind, nextWeekdayIdx) {
  if (kind === 'rest') return nextWeekdayIdx == null ? null : `Volta ${WEEKDAY_FULL.pt[nextWeekdayIdx]}.`
  if (kind === 'error') return 'Verifique sua conexão e tente de novo.'
  return null
}

// As linhas da lista: só os passos de hoje. `right` = "{n} min" a fazer,
// "feita"/"feito" concordando com o passo; `aria` = nome, minutos e
// feito/a fazer.
export function planSteps(state, ctx) {
  return state.steps.map(step => {
    const done = step.status === 'done'
    const detailCtx = step.key === 'reading' && done && ctx.readingDonePassage ? { ...ctx, readingPassage: ctx.readingDonePassage } : ctx
    const name = stepName(step.key)
    return {
      key: step.key, name, done,
      detail: stepShortDetail(step.key, detailCtx),
      right: done ? doneWord(step.key) : `${step.minutes} min`,
      aria: `${name}, ${step.minutes} ${step.minutes === 1 ? 'minuto' : 'minutos'}, ${done ? doneWord(step.key) : 'a fazer'}`,
    }
  })
}

// O cartão inteiro, pronto pra desenhar.
export function buildPlanCard({ loadError, stepDays, routineModules, state, ctx, nextWeekdayIdx }) {
  const kind = planCardKind({ loadError, stepDays, routineModules, state })
  if (kind === 'loading') return { kind }
  const withSteps = kind === 'before' || kind === 'during' || kind === 'done'
  return {
    kind,
    title: planTitle(kind, state, ctx),
    right: planHeaderRight(kind, state),
    line: planLine(kind, nextWeekdayIdx),
    steps: withSteps ? planSteps(state, ctx) : [],
    button: planButton(kind),
  }
}

// ── Bloco 3: Próxima conquista (HANDOFF §5) ─────────────────────────────
// `closest` é o que pickClosest devolve — "a mais perto" de Minhas
// conquistas, a mesma função. Aqui só entram as palavras: quanto falta,
// na unidade curta da família ("falta 1 h", "faltam 8 semanas"). Null
// com tudo conquistado: o cartão não aparece.
export function nextAchievement(closest) {
  if (!closest) return null
  const fam = familyById(closest.familyId)
  const n = closest.remaining
  const remaining = n === 1 ? `falta 1 ${fam.unidadeCurtaSingular}` : `faltam ${formatInt(n)} ${fam.unidadeCurta}`
  return {
    familyId: closest.familyId, degrau: closest.degrau, nome: closest.nome,
    remaining, progress: closest.progress,
    aria: `Próxima conquista: ${closest.nome}, ${remaining}`,
  }
}

// ── Bloco 4: Para hoje (HANDOFF §6) ─────────────────────────────────────
// Quais linhas aparecem, nesta ordem — linha sem conteúdo não aparece:
//   desafio de leitura do grupo (só com desafio ativo no dia);
//   resumo da semana (só com resumo NÃO lido);
//   versículo do dia (sempre que houver versículo; enquanto carrega, a
//     linha fica com o subtítulo em esqueleto);
//   aplicação de ontem (só com frase fixada que não seja a de hoje, e com
//     o cartão ligado no Perfil);
//   anotar uma pregação (sempre).
// `right`: { kind: 'chevron' } · { kind: 'button', label } · { kind:
// 'done', label } (o botão depois de marcado vira texto).

// "Gn 39:21" — a sigla do livro (a mesma dos selos) + capítulo:versículo;
// sem os dados crus, a referência por extenso.
export function verseShortRef(verse) {
  const sigla = verse?.bookPt ? bookInfo(verse.bookPt)?.sigla : null
  if (sigla && verse.chapter && verse.verseNum) return `${sigla} ${verse.chapter}:${verse.verseNum}`
  return verse?.ref ?? ''
}

// Entre aspas — sem duplicar as que o texto já traz.
function quoted(text) {
  const t = String(text ?? '').trim()
  return /^["“]/.test(t) ? t : `"${t}"`
}

export function paraHojeRows({ challenge, summary, verse, verseLoading, application }) {
  const rows = []
  if (challenge) {
    rows.push({
      key: 'challenge', title: `Desafio · ${challenge.title}`,
      subtitle: [challenge.ref, challenge.dayTitle].filter(Boolean).join(' · '),
      right: challenge.done ? { kind: 'done', label: 'Lida' } : { kind: 'button', label: 'Já li' },
    })
  }
  if (summary && !summary.seen) {
    rows.push({ key: 'summary', title: 'Resumo da sua semana', subtitle: `${summary.period} está pronto`, right: { kind: 'chevron' } })
  }
  if (verseLoading) {
    rows.push({ key: 'verse', title: 'Versículo do dia', subtitle: null, right: { kind: 'chevron' } })
  } else if (verse?.text) {
    rows.push({ key: 'verse', title: 'Versículo do dia', subtitle: `${quoted(verse.text)} ${verseShortRef(verse)}`.trim(), right: { kind: 'chevron' } })
  }
  if (application?.text && application.visible && !application.writtenToday) {
    rows.push({
      key: 'application', title: 'Sua aplicação de ontem', subtitle: quoted(application.text),
      right: application.fulfilled ? { kind: 'done', label: 'Cumprida' } : { kind: 'button', label: 'Cumpri' },
    })
  }
  rows.push({ key: 'sermon', title: 'Anotar uma pregação', subtitle: 'Abre a Bíblia com a folha de anotação', right: { kind: 'chevron' } })
  return rows
}
