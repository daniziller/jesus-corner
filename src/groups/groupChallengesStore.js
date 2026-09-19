// Desafio de leitura por IA (handoff-admin-42, 42m→42n) — a geração em si
// (api/generate-group-challenge.js) fica fora daqui porque chama a IA
// (endpoint HTTP, não RPC); publicar/marcar dia lido são RPCs simples, no
// mesmo padrão dos outros stores de src/groups/.
import { supabase } from '../lib/supabaseClient'
import { parseLocalDateKey } from '../utils/dateKey'

export async function generateGroupChallenge(groupId, text, lang) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const res = await fetch('/api/generate-group-challenge', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, text, lang }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `request_failed_${res.status}`)
  return body.challenge
}

// 42n, "Publicar para o grupo" — challenge é o objeto devolvido por
// generateGroupChallenge (title/explanation/leaderText/lang/days), depois
// de eventuais ajustes de "Ajustar" (troca dia a dia). Devolve o id do
// desafio criado.
export async function publishGroupChallenge(groupId, challenge, startsAt, pauseGroupPlan) {
  const { data, error } = await supabase.rpc('publish_group_challenge', {
    target_group_id: groupId,
    p_title: challenge.title,
    p_explanation: challenge.explanation,
    p_leader_text: challenge.leaderText,
    p_lang: challenge.lang,
    p_days: challenge.days,
    p_starts_at: startsAt,
    p_pause_group_plan: pauseGroupPlan,
  })
  if (error) throw new Error(error.message)
  return data
}

// "Ajustar" (42n) — troca só o dia escolhido, sem regerar a proposta
// inteira (Regra 6.8: "'Ajustar' permite trocar dia a dia"). Reaproveita
// o mesmo endpoint de geração pedindo só 1 dia nas instruções seria mais
// caro/lento; em vez disso pede à IA (via o mesmo endpoint de geração,
// mas com um texto sintético) — simplificação disclosed: gera uma
// proposta nova inteira e usa só o primeiro dia dela como substituto,
// reaproveitando o endpoint existente em vez de criar um terceiro
// caminho de IA só pra isto.
export async function regenerateChallengeDay(groupId, leaderText, lang) {
  const challenge = await generateGroupChallenge(groupId, leaderText, lang)
  return challenge.days[0]
}

// Ativo = o mais recente cujo último dia ainda não passou (starts_at +
// days.length). Usado pelo card "Hoje" (Home) e por 42i (cartão Desafio).
export async function getActiveGroupChallenge(groupId) {
  const { data, error } = await supabase
    .from('group_challenges')
    .select('id, title, explanation, days, starts_at, lang, pause_group_plan')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const totalDays = data.days.length
  // parseLocalDateKey, não `new Date(data.starts_at)` — starts_at é uma
  // coluna `date` (ex: "2026-09-19"), e `new Date()` direto nesse formato
  // lê como meia-noite UTC, virando ~3h antes da meia-noite local pra
  // quem está em UTC-3 (bug real, achado na varredura de 2026-09-19).
  const endsAt = parseLocalDateKey(data.starts_at)
  endsAt.setDate(endsAt.getDate() + totalDays)
  if (endsAt.getTime() < Date.now()) return null
  return {
    id: data.id, title: data.title, explanation: data.explanation, days: data.days,
    startsAt: data.starts_at, lang: data.lang, pauseGroupPlan: data.pause_group_plan, totalDays,
  }
}

export async function getMyGroupChallengeProgress(challengeId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('group_challenge_members')
    .select('completed_days')
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) { console.error('[groupChallengesStore] getMyGroupChallengeProgress failed:', error.message); return [] }
  return data?.completed_days ?? []
}

export async function markGroupChallengeDayDone(challengeId, dayIndex) {
  const { error } = await supabase.rpc('mark_group_challenge_day_done', { target_challenge_id: challengeId, day_index: dayIndex })
  if (error) throw new Error(error.message)
}
