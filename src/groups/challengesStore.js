// Desafios de leitura dentro de um grupo, e o progresso ISOLADO de cada
// participante dentro de cada desafio (não é o progresso pessoal geral —
// ver reading_challenge_progress na migração). O cálculo de "% concluído"
// (que depende de quantos capítulos cada livro do desafio realmente tem)
// fica por conta de quem chama (ver src/screens/GroupsScreen.jsx), não
// aqui — este store só busca/grava as chaves cruas.
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// Propõe um novo desafio num grupo — qualquer membro pode chamar (a RLS
// só exige que quem chama seja membro 'joined' do grupo). name/description
// são opcionais (desafios antigos, criados antes desses campos existirem,
// ficam com eles nulos — ver getChallengesForGroup).
export async function createChallenge(groupId, books, endsAt, name, description) {
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')
  const { data, error } = await supabase
    .from('reading_challenges')
    .insert({
      group_id: groupId, books, ends_at: endsAt, created_by: userId,
      name: name?.trim() || null,
      description: description?.trim() || null,
    })
    .select()
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

// Todos os desafios (ativos e encerrados) de um grupo, mais recente primeiro
// — "encerrado" cobre tanto o prazo vencido quanto a conclusão manual pelo
// moderador (ver completeChallenge), diferenciados por manuallyCompleted
// pra UI mostrar "Concluído" em vez de "Encerrado" nesse caso.
export async function getChallengesForGroup(groupId) {
  const { data, error } = await supabase
    .from('reading_challenges')
    .select('id, name, description, books, starts_at, ends_at, completed_at, created_by, creator:profiles!reading_challenges_created_by_fkey(name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[challengesStore] getChallengesForGroup failed:', error.message); return [] }
  return (data ?? []).map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    books: c.books,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    active: !c.completed_at && new Date(c.ends_at).getTime() > Date.now(),
    manuallyCompleted: !!c.completed_at,
    createdByName: c.creator?.name ?? '',
  }))
}

// Moderador encerra um desafio antes do prazo — a RLS (is_group_moderator)
// garante que só quem modera o grupo consegue de verdade, mesmo que a UI
// falhe em esconder o botão de alguém.
export async function completeChallenge(challengeId) {
  const { error } = await supabase
    .from('reading_challenges')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', challengeId)
  if (error) throw new Error(error.message)
}

// Desafios ativos em que EU tenho linha de progresso, com o escopo de
// livros — usado no bootstrap do App.jsx pra saber, ao marcar um capítulo
// como lido, se ele conta pra algum desafio em andamento.
export async function getMyActiveChallenges() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('reading_challenge_progress')
    .select('challenge_id, reading_challenges!inner(id, books, ends_at, completed_at)')
    .eq('user_id', userId)
    .gt('reading_challenges.ends_at', new Date().toISOString())
    .is('reading_challenges.completed_at', null)
  if (error) { console.error('[challengesStore] getMyActiveChallenges failed:', error.message); return [] }
  return (data ?? [])
    .filter(row => row.reading_challenges)
    .map(row => ({ challengeId: row.challenge_id, books: row.reading_challenges.books }))
}

// Placar de um desafio: chaves concluídas de cada participante (o cálculo
// de % fica pra quem chama, ver comentário no topo do arquivo).
export async function getChallengeLeaderboard(challengeId) {
  const { data, error } = await supabase
    .from('reading_challenge_progress')
    .select('user_id, completed_keys, joined_at, participant:profiles!reading_challenge_progress_user_id_fkey(name)')
    .eq('challenge_id', challengeId)
  if (error) { console.error('[challengesStore] getChallengeLeaderboard failed:', error.message); return [] }
  return (data ?? []).map(row => ({
    userId: row.user_id,
    name: row.participant?.name ?? '',
    completedKeys: row.completed_keys ?? [],
    joinedAt: row.joined_at,
  }))
}

// Soma (union) as chaves recém-concluídas no progresso do desafio — só
// deve receber chaves que JÁ passaram pelo filtro "virou concluída agora,
// não já estava" (ver toggleSession/toggleChapter em src/App.jsx).
export async function recordChallengeProgress(challengeId, newKeys) {
  if (!newKeys || newKeys.length === 0) return
  const userId = await getUserId()
  if (!userId) return

  const { data: row, error: fetchError } = await supabase
    .from('reading_challenge_progress')
    .select('completed_keys')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle()
  if (fetchError) { console.error('[challengesStore] recordChallengeProgress fetch failed:', fetchError.message); return }
  if (!row) return // não sou participante desse desafio

  const merged = new Set([...(row.completed_keys ?? []), ...newKeys])
  const { error } = await supabase
    .from('reading_challenge_progress')
    .update({ completed_keys: [...merged] })
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
  if (error) console.error('[challengesStore] recordChallengeProgress update failed:', error.message)
}
