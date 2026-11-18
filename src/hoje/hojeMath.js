// hojeMath.js — textos e estados do Hoje (handoff-hoje-50, H1). Nada aqui
// recalcula o que a gamificação e o Meu Plano já calculam: estas funções
// só dão forma (frase, rótulo, estado visual) ao que computeBibleProgress,
// weeksMath, computeMeuPlano e pickClosest devolvem. Puro, sem React nem
// stores — testado em scripts/test-hoje.mjs.
import { formatInt, formatPct, deOf, monthYearLong } from '../gamification/format.js'
import { footerBook } from '../gamification/bibleProgressMath.js'
import { bookInfo } from '../data/gamificationBlocks.js'
import { STEP_ORDER, stepName, doneWord, stepsCountText, stepShortDetail } from '../meuPlano/meuPlanoMath.js'
import { markedWeekdayUnion } from '../routine/stepDaysMath.js'
import { WEEKDAY_FULL } from '../routine/weeklyDaysMath.js'
import { tr, trN } from '../i18n/tr.js'
import { degrauName } from '../data/achievements.js'
import { activePedidos } from '../pedidos/pedidosMath.js'

// Textos em hojeTx (translations.js); `lang` vem de quem chama, com
// português como padrão.
const tx = (lang, key, vars) => tr(lang, `hojeTx.${key}`, vars)
const txN = (lang, base, n, vars) => trN(lang, `hojeTx.${base}`, n, vars)

// ── Bloco 1: Sua caminhada (HANDOFF §3) ─────────────────────────────────

// "50 de 1.189 capítulos"
export function chaptersLine(progress, lang = 'pt') {
  return `${deOf(progress.capitulosLidos, progress.totalCapitulos, lang)} ${tx(lang, 'chapters')}`
}

// Terceira linha do cartão da Bíblia: "Gênesis 41 de 50 · faltam 9 para o
// selo" · "falta 1 para o selo" · "Comece por onde quiser" (nada lido
// ainda) · "Terminada em setembro de 2026" (Bíblia inteira; vazio enquanto
// a data não chegou).
export function bibleBookLine(progress, currentBook, finishedIso, lang = 'pt', bookLabel = b => b) {
  if (progress.bibliaInteira) return finishedIso ? tx(lang, 'finishedIn', { date: monthYearLong(new Date(finishedIso), lang) }) : ''
  if (progress.capitulosLidos === 0) return tx(lang, 'startAnywhere')
  const book = footerBook(progress, currentBook)
  const p = book ? progress.porLivro[book] : null
  if (!p) return tx(lang, 'startAnywhere')
  const faltam = txN(lang, 'sealLeft', p.faltam, { n: formatInt(p.faltam, lang) })
  return `${bookLabel(book)} ${deOf(p.lidos, p.total, lang)} · ${faltam}`
}

// Data em que a Bíblia foi terminada: o capítulo lido mais recente.
export function bibleFinishedIso(chapterRows) {
  let max = null
  for (const r of chapterRows ?? []) if (r?.created_at && (!max || r.created_at > max)) max = r.created_at
  return max
}

// Rótulos dos quatro alvos da caminhada (leitor de tela).
export function bibleCardAria(progress, lang = 'pt') {
  return tx(lang, 'bibleAria', { pct: formatPct(progress.percent, lang), chapters: deOf(progress.capitulosLidos, progress.totalCapitulos, lang) })
}
export function weeksAria(total, lang = 'pt') {
  return txN(lang, 'weeksAria', total, { n: formatInt(total, lang) })
}
export function daysAria(feitos, meta, lang = 'pt') {
  return txN(lang, 'daysAria', meta, { done: feitos })
}
export function sealsAria(completos, totalLivros, lang = 'pt') {
  return txN(lang, 'sealsAria', completos, { total: totalLivros })
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
export function planHeaderRight(kind, state, lang = 'pt') {
  if (kind === 'before') return [txN(lang, 'planSteps', state.total), `${state.totalMinutes} min`]
  if (kind === 'during') return [stepsCountText(state.doneCount, state.total, lang), txN(lang, 'leftMin', state.remainingMinutes)]
  if (kind === 'done') return [tx(lang, 'planComplete'), `${state.totalMinutes} min`]
  return null
}

// O botão do cartão. `primary` = o laranja (um só na tela); `action` diz
// a quem chama o que fazer: 'start' abre o passo de agora e emenda os
// seguintes (o mesmo do Meu Plano), 'plan' vai pra aba Meu Plano, 'read'
// é a leitura livre, 'adjust' abre o Ajustar, 'retry' recarrega os dias.
const PLAN_BUTTONS = {
  before: { labelKey: 'btnStart', primary: true, arrow: true, action: 'start' },
  during: { labelKey: 'btnContinue', primary: true, arrow: true, action: 'start' },
  done: { labelKey: 'btnSee', primary: false, arrow: false, action: 'plan' },
  rest: { labelKey: 'btnReadAnyway', primary: false, arrow: false, action: 'read' },
  noPlan: { labelKey: 'btnCreate', primary: true, arrow: true, action: 'adjust' },
  error: { labelKey: 'btnRetry', primary: false, arrow: false, action: 'retry' },
}
export function planButton(kind, lang = 'pt') {
  const b = PLAN_BUTTONS[kind]
  if (!b) return null
  const { labelKey, ...rest } = b
  return { label: tx(lang, labelKey), ...rest }
}

// Título: a leitura de hoje ("Gênesis 42" — depois de feita, o que foi
// lido); em dia de estudo, o nome do estudo; sem leitura nem estudo hoje,
// o nome do primeiro passo.
export function planTitle(kind, state, ctx, lang = 'pt') {
  if (kind === 'rest') return tx(lang, 'restTitle')
  if (kind === 'noPlan') return tx(lang, 'noPlanTitle')
  if (kind === 'error') return tx(lang, 'errorTitle')
  const reading = state.steps.find(s => s.key === 'reading')
  if (reading) return (reading.status === 'done' ? ctx.readingDonePassage : null) || ctx.readingPassage || stepName('reading', lang)
  if (state.steps.some(s => s.key === 'study')) return ctx.study?.title || stepName('study', lang)
  return stepName(state.steps[0].key, lang)
}

// A linha solta abaixo do título: "Volta quinta." no descanso (o próximo
// dia com algo marcado) e a dica do erro de carregamento.
export function planLine(kind, nextWeekdayIdx, lang = 'pt') {
  if (kind === 'rest') return nextWeekdayIdx == null ? null : tx(lang, 'backOn', { day: (WEEKDAY_FULL[lang] ?? WEEKDAY_FULL.pt)[nextWeekdayIdx] })
  if (kind === 'error') return tx(lang, 'errorLine')
  return null
}

// As linhas da lista: só os passos de hoje. `right` = "{n} min" a fazer,
// "feita"/"feito" concordando com o passo; `aria` = nome, minutos e
// feito/a fazer.
export function planSteps(state, ctx, lang = 'pt') {
  return state.steps.map(step => {
    const done = step.status === 'done'
    const detailCtx = step.key === 'reading' && done && ctx.readingDonePassage ? { ...ctx, readingPassage: ctx.readingDonePassage } : ctx
    const name = stepName(step.key, lang)
    return {
      key: step.key, name, done,
      detail: stepShortDetail(step.key, detailCtx, lang),
      right: done ? doneWord(step.key, lang) : `${step.minutes} min`,
      aria: txN(lang, 'stepAria', step.minutes, { name, state: done ? doneWord(step.key, lang) : tx(lang, 'toDo') }),
    }
  })
}

// O cartão inteiro, pronto pra desenhar.
export function buildPlanCard({ loadError, stepDays, routineModules, state, ctx, nextWeekdayIdx, lang = 'pt' }) {
  const kind = planCardKind({ loadError, stepDays, routineModules, state })
  if (kind === 'loading') return { kind }
  const withSteps = kind === 'before' || kind === 'during' || kind === 'done'
  return {
    kind,
    title: planTitle(kind, state, ctx, lang),
    right: planHeaderRight(kind, state, lang),
    line: planLine(kind, nextWeekdayIdx, lang),
    steps: withSteps ? planSteps(state, ctx, lang) : [],
    button: planButton(kind, lang),
  }
}

// ── Bloco 3: Próxima conquista (HANDOFF §5) ─────────────────────────────
// `closest` é o que pickClosest devolve — "a mais perto" de Minhas
// conquistas, a mesma função. Aqui só entram as palavras: quanto falta,
// na unidade curta da família ("falta 1 h", "faltam 8 semanas"). Null
// com tudo conquistado: o cartão não aparece.
export function nextAchievement(closest, lang = 'pt') {
  if (!closest) return null
  const n = closest.remaining
  const unit = tx(lang, `unit${n === 1 ? 'One' : 'Many'}_${closest.familyId}`)
  const remaining = txN(lang, 'remaining', n, { n: formatInt(n, lang), unit })
  const nome = degrauName(closest.familyId, closest.degrau, lang) || closest.nome
  return {
    familyId: closest.familyId, degrau: closest.degrau, nome,
    remaining, progress: closest.progress,
    aria: tx(lang, 'nextAria', { name: nome, remaining }),
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
//   pedidos de oração (sempre — pedido dela, 2026-11-18: um acesso aos
//     pedidos na página inicial; o subtítulo diz quantos ainda esperam a
//     oração de hoje, ver requestsLine);
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

// O resumo dos pedidos pra linha do Hoje: quantos estão ativos e quantos
// ainda não receberam o "orei" de hoje. `list` é a lista unificada de
// pedidosMath (mergePedidos); sem lista (não carregou, ou sem Premium),
// null.
export function requestsSummary(list) {
  if (!list) return null
  const active = activePedidos(list)
  return { active: active.length, pending: active.filter(r => !r.prayedToday).length }
}

// O subtítulo da linha "Pedidos de oração": sem resumo, o que a linha é;
// sem pedido ativo, o convite a fazer o primeiro; com pedidos por orar,
// "2 de 7 esperando sua oração hoje"; todos orados, "Você orou por todos
// os 7 hoje" (ou "pelo seu pedido", com um só).
export function requestsLine(summary, lang = 'pt') {
  if (!summary) return tx(lang, 'requestsSub')
  if (summary.active === 0) return tx(lang, 'requestsNone')
  if (summary.pending > 0) return tx(lang, summary.pending === 1 ? 'requestsPendingOne' : 'requestsPendingMany', { n: summary.pending, total: summary.active })
  return tx(lang, summary.active === 1 ? 'requestsAllOne' : 'requestsAllMany', { n: summary.active })
}

export function paraHojeRows({ challenge, summary, verse, verseLoading, application, requests = null, lang = 'pt' }) {
  const rows = []
  if (challenge) {
    rows.push({
      key: 'challenge', title: tx(lang, 'challenge', { title: challenge.title }),
      subtitle: [challenge.ref, challenge.dayTitle].filter(Boolean).join(' · '),
      right: challenge.done ? { kind: 'done', label: tx(lang, 'challengeRead') } : { kind: 'button', label: tx(lang, 'challengeMark') },
    })
  }
  if (summary && !summary.seen) {
    rows.push({ key: 'summary', title: tx(lang, 'summaryTitle'), subtitle: tx(lang, 'summaryReady', { period: summary.period }), right: { kind: 'chevron' } })
  }
  if (verseLoading) {
    rows.push({ key: 'verse', title: tx(lang, 'verseTitle'), subtitle: null, right: { kind: 'chevron' } })
  } else if (verse?.text) {
    rows.push({ key: 'verse', title: tx(lang, 'verseTitle'), subtitle: `${quoted(verse.text)} ${verseShortRef(verse)}`.trim(), right: { kind: 'chevron' } })
  }
  if (application?.text && application.visible && !application.writtenToday) {
    rows.push({
      key: 'application', title: tx(lang, 'applicationTitle'), subtitle: quoted(application.text),
      right: application.fulfilled ? { kind: 'done', label: tx(lang, 'applicationDone') } : { kind: 'button', label: tx(lang, 'applicationMark') },
    })
  }
  rows.push({ key: 'requests', title: tx(lang, 'requestsTitle'), subtitle: requestsLine(requests, lang), right: { kind: 'chevron' } })
  rows.push({ key: 'sermon', title: tx(lang, 'sermonTitle'), subtitle: tx(lang, 'sermonSub'), right: { kind: 'chevron' } })
  return rows
}
