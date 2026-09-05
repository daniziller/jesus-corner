// groupPlansStore.js — Plano do grupo (quadro 22d): o moderador monta um
// plano (ver src/groups/groupBookPlan.js) e envia pro grupo; membros
// recebem como convite e podem aceitar/recusar (nunca trocam a leitura sem
// saber — ver README, "Duas regras de produto"). Aceitar seta
// activeAltPlan tipo 'group' (ver src/plan/activePlanStore.js/App.jsx) —
// daí pra frente funciona como qualquer outro plano alternativo (mesmo
// mecanismo de src/plan/resolveActivePlan.js).
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// Convites de plano de grupo ainda pendentes pra mim, em qualquer grupo do
// qual sou membro — alimenta o banner de aceitar/recusar em GroupsScreen.
export async function getMyPendingGroupPlanInvites() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('group_reading_plan_members')
    .select('plan_id, group_reading_plans(id, title, book, book_en, group_id, reading_groups(name))')
    .eq('user_id', userId)
    .eq('status', 'invited')
  if (error) { console.error('[groupPlansStore] getMyPendingGroupPlanInvites failed:', error.message); return [] }
  return (data ?? [])
    .filter(row => row.group_reading_plans)
    .map(row => ({
      planId: row.plan_id,
      title: row.group_reading_plans.title,
      book: row.group_reading_plans.book,
      bookEn: row.group_reading_plans.book_en,
      groupId: row.group_reading_plans.group_id,
      groupName: row.group_reading_plans.reading_groups?.name ?? '',
    }))
}

// Planos de grupo que eu já ACEITEI — é o que resolveActivePlanSessions usa
// pra montar a leitura de hoje quando activeAltPlan.type === 'group'
// (passages já vem no formato flat que deriveThemeTexts espera).
export async function getMyAcceptedGroupPlans() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('group_reading_plan_members')
    .select('group_reading_plans(id, title, book, book_en, overview, passages, group_id)')
    .eq('user_id', userId)
    .eq('status', 'accepted')
  if (error) { console.error('[groupPlansStore] getMyAcceptedGroupPlans failed:', error.message); return [] }
  return (data ?? [])
    .filter(row => row.group_reading_plans)
    .map(row => ({
      id: row.group_reading_plans.id,
      title: row.group_reading_plans.title,
      book: row.group_reading_plans.book,
      bookEn: row.group_reading_plans.book_en,
      overview: row.group_reading_plans.overview,
      passages: row.group_reading_plans.passages,
      groupId: row.group_reading_plans.group_id,
    }))
}

// O plano de grupo mais recente ENVIADO num grupo (se houver) — usado por
// GroupAdminScreen (quadro 19c, linha "Plano do grupo") pro moderador ver
// status/aceite. Não existe conceito de "encerrar" um plano ainda (ver
// README) — o mais recente por created_at já é, na prática, "o" plano
// vigente do grupo.
export async function getLatestGroupPlan(groupId) {
  const { data: plan, error } = await supabase
    .from('group_reading_plans')
    .select('id, title, book, book_en, overview, weeks, passages, starts_at, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) { console.error('[groupPlansStore] getLatestGroupPlan failed:', error.message); return null }
  if (!plan) return null

  const { data: members, error: membersError } = await supabase
    .from('group_reading_plan_members')
    .select('status')
    .eq('plan_id', plan.id)
  if (membersError) console.error('[groupPlansStore] getLatestGroupPlan members failed:', membersError.message)
  const counts = { invited: 0, accepted: 0, declined: 0 }
  for (const m of members ?? []) counts[m.status] = (counts[m.status] ?? 0) + 1

  return { ...plan, memberCounts: counts, totalMembers: (members ?? []).length }
}

// Envia o plano montado (ver buildGroupPlan) pro grupo — cria a linha e já
// convida todo mundo (o próprio moderador entra aceito, ver
// send_group_reading_plan na migração). Devolve o plano criado (com id).
export async function sendGroupReadingPlan({ groupId, book, bookEn, title, overview, weeks, passages, startsAt }) {
  const { data, error } = await supabase.rpc('send_group_reading_plan', {
    target_group_id: groupId, book, book_en: bookEn, title, overview,
    weeks, passages, starts_at: startsAt,
  })
  if (error) throw new Error(error.message)
  return data
}

// Aceita ou recusa um convite de plano do grupo pendente. Não mexe em
// activeAltPlan (isso é decisão de quem chama, ver App.jsx) — só grava a
// resposta.
export async function respondToGroupReadingPlan(planId, accept) {
  const { error } = await supabase.rpc('respond_to_group_reading_plan', { target_plan_id: planId, accept })
  if (error) throw new Error(error.message)
}

// Sugestão de "pergunta da semana" (22d) — GET público, cacheado no
// servidor (mesmo espírito de fetchReflectionQuestions em
// src/aiChat/reflectionQuestionsStore.js): a pergunta sugerida é igual pra
// quem abrir o mesmo capítulo, o líder sempre revisa/edita antes de
// publicar (ver README, "a voz na Comunidade continua humana") — falha
// aqui não trava o fluxo, GroupPlanProposalScreen só deixa o campo vazio
// pra escrever na mão.
export async function fetchWeeklyQuestionSuggestion({ book, bookEn, chStart, chEnd, lang }) {
  const params = new URLSearchParams({ book, chStart: String(chStart), chEnd: String(chEnd ?? chStart), lang: lang === 'en' ? 'en' : 'pt' })
  if (bookEn) params.set('bookEn', bookEn)
  const res = await fetch(`/api/suggest-weekly-question?${params}`)
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  const body = await res.json()
  return body.question
}
