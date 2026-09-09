// estudosStore.js — camada pessoal da área de Estudos unificada (turno 41,
// handoff-estudos-41/). Decisão confirmada com a autora, 2026-09-09: todo
// "plano por tema" do app é um Estudo (guardado em user_data.theme_plans,
// mesmo mecanismo de sempre — ver themePlansStore.js), venha de onde vier
// (`origin`). Os estudos "profundos" antigos (src/data/studies.js) saem da
// navegação — nenhum PNG do pacote 41 mostra esse formato — mas continuam
// no banco, só não aparecem mais aqui.
//
// "Trilhas independentes" (decisão confirmada, mesma conversa): Leitura e
// Estudo continuam sem se pausar um ao outro (ver activeStudyStore.js) —
// não existe "Gênesis pausa em 41 e volta em <data>" com data calculada.
// O modo substituir/soma (41f/41h) e o texto de 41b refletem isso: nos
// dias em que Leitura e Estudo caem juntos, "substituir" tira a Leitura
// SÓ NAQUELE dia (ela continua nos outros dias da semana, sem atraso, sem
// data de volta prevista); "somar" faz as duas acontecerem no mesmo dia.
import { getThemePlans, saveThemePlan } from '../themePlans/themePlansStore'
import { recordStudyUse } from './publicStudiesStore'
import { deriveThemeTexts, themeTextKey } from '../themePlans/themeTexts'

export const MAX_STUDIES_PER_MONTH = 4

// Origem de um Estudo pessoal — planos de antes desse campo existir só
// podiam nascer de "criar", então o default é 'created'.
export function estudoOrigin(plan) {
  return plan.origin ?? 'created'
}

// Só *criar* consome cota (regra 4 §3) — seguir do banco/grupo/Jesus
// Corner é ilimitado. Mesmo mês-calendário do servidor (ver
// api/generate-theme-plan.js) — computado aqui só pra UI, o servidor
// reconfere antes de gastar IA de qualquer jeito.
export function countCreatedThisMonth(plans) {
  const now = new Date()
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  return (plans ?? []).filter(p => estudoOrigin(p) === 'created' && p.createdAt && new Date(p.createdAt).getTime() >= monthStart).length
}

export function studyQuota(plans) {
  const used = countCreatedThisMonth(plans)
  return { used, max: MAX_STUDIES_PER_MONTH, remaining: Math.max(0, MAX_STUDIES_PER_MONTH - used), exhausted: used >= MAX_STUDIES_PER_MONTH }
}

// "Este é o terceiro de setembro" (41b) — por extenso, só até o teto real
// da cota (MAX_STUDIES_PER_MONTH = 4); nunca precisa passar disso, já que
// 41b não abre com a cota esgotada (o cartão preto vira aviso antes).
const ORDINAL_WORDS_PT = ['primeiro', 'segundo', 'terceiro', 'quarto']
const ORDINAL_WORDS_EN = ['first', 'second', 'third', 'fourth']
export function ordinalWord(n, lang) {
  const words = lang === 'en' ? ORDINAL_WORDS_EN : ORDINAL_WORDS_PT
  return words[n - 1] ?? String(n)
}

// Dia 1º do mês seguinte, no fuso da própria pessoa (só pra exibir — a
// cota em si é UTC no servidor, diferença de fuso nunca chega a 1 dia
// inteiro de erro visível aqui).
export function nextResetDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

function progressOf(plan, completedSet) {
  const texts = deriveThemeTexts(plan.passages)
  const done = texts.filter(t => completedSet.has(themeTextKey(t))).length
  return { texts, done, total: texts.length }
}

// "Em andamento" (41a) — o Estudo pessoal mais recente que ainda tem dia
// por fazer. `plans` já vem mais-recente-primeiro (ver saveThemePlan).
export function findActiveEstudo(plans, completedSet) {
  for (const plan of plans ?? []) {
    const { done, total } = progressOf(plan, completedSet)
    if (total > 0 && done < total) return { plan, done, total }
  }
  return null
}

// Todos os Estudos pessoais (chip "Salvos", 41a) — em andamento, pausados
// e concluídos, mais recente primeiro.
export function listMyEstudos(plans, completedSet) {
  return (plans ?? []).map(plan => {
    const { done, total } = progressOf(plan, completedSet)
    return { plan, done, total }
  })
}

function originForBankStudy(study) {
  if (study.groupId) return 'group'
  if (!study.authorId) return 'jesus_corner'
  return 'public'
}

// Adota um estudo do banco (41i "Ver" → usar) como cópia pessoal — não
// consome cota (não é "criar"), registra o uso real (contador de "N
// pessoas fizeram") e nunca move/edita a linha do banco (ver
// publicStudiesStore.js). `lang` decide o idioma da cópia (mesmo campo que
// generate-theme-plan.js grava).
export async function adoptStudy(study, lang) {
  const texts = deriveThemeTexts(study.passages)
  const plan = {
    id: `theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: study.title,
    scope: study.overview,
    overview: study.overview,
    lang: lang === 'en' ? 'en' : 'pt',
    createdAt: new Date().toISOString(),
    days: texts.length,
    passages: texts,
    format: study.format,
    minutesPerDay: study.minutesPerDay,
    origin: originForBankStudy(study),
    sourceStudyId: study.id,
    authorName: study.authorName,
  }
  const updated = await saveThemePlan(null, plan)
  recordStudyUse(study.id).catch(err => console.error('[estudosStore] recordStudyUse failed:', err.message))
  return { plan, plans: updated }
}

export { getThemePlans }

// ── Bloco 3 (41d/41e) — Estudo em ai_studies (ver src/studies/
// studyDayStore.js), não theme_plans. `sessions[i].completedAt` (novo,
// só existe a partir daqui) é a fonte de verdade de "dia feito" — dias
// antigos, de antes desse campo existir, nunca aparecem como feitos
// mesmo que a sessão tenha sido marcada pelo mecanismo antigo
// (studies_completed) — decisão de escopo: 41d/41e substituem o "marcar
// sessão" antigo por completo pra quem usa o modelo novo.
export function currentDayOf(study) {
  const sessions = study?.sessions ?? []
  const index = sessions.findIndex(s => !s.completedAt)
  if (index === -1) return { day: null, index: sessions.length, total: sessions.length, isLastDay: false }
  return { day: sessions[index], index, total: sessions.length, isLastDay: index === sessions.length - 1 }
}

// Próxima data em que `oneStepDays` (ex: stepDays.study, 7 booleanos
// Seg..Dom) volta a cair — usada em 41e ("O dia N+1 fica esperando...
// quarta, 10 de setembro"). Mesma semântica de nextScheduledWeekday
// (stepDaysMath.js), só que devolve uma Date de verdade em vez do índice
// do dia da semana — sem duplicar a lógica de weekday aqui, só o passo de
// "que dia do calendário é esse".
export function nextScheduledDate(oneStepDays, fromDate = new Date()) {
  const fromIdx = (fromDate.getDay() + 6) % 7 // Mon=0, mesma convenção de WEEKDAY_FULL/DAY_KEYS
  for (let step = 1; step <= 7; step++) {
    const idx = (fromIdx + step) % 7
    if (oneStepDays?.[idx]) {
      const d = new Date(fromDate)
      d.setDate(d.getDate() + step)
      return d
    }
  }
  return null
}
