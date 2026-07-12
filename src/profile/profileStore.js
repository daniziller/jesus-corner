// Perfil editável: nome/data de nascimento moram no user_metadata do
// Supabase Auth (mesmo lugar de sempre — editar via updateUser já atualiza a
// sessão local na hora, sem precisar recarregar). bio/foto/visibilidade
// moram na tabela profiles (pensada pra ser visível a amigos desde o
// início — ver supabase/migrations/0004_profile_editing.sql).
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

export async function getMyProfile() {
  const userId = await getUserId()
  if (!userId) return null
  let { data, error } = await supabase
    .from('profiles')
    .select('bio, avatar_url, is_public, has_seen_tour')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    // has_seen_tour só existe depois que a migração 0013 rodar no Supabase
    // — até lá, pedir essa coluna faz a busca INTEIRA falhar (e some foto,
    // bio e visibilidade junto). Tenta de novo sem ela antes de desistir,
    // pra o resto do perfil nunca ficar refém dessa coluna nova.
    const fallback = await supabase
      .from('profiles')
      .select('bio, avatar_url, is_public')
      .eq('user_id', userId)
      .maybeSingle()
    if (fallback.error) { console.error('[profileStore] getMyProfile failed:', fallback.error.message); return null }
    data = fallback.data
  }
  return {
    bio: data?.bio ?? '',
    avatarUrl: data?.avatar_url ?? null,
    isPublic: data?.is_public ?? false,
    // Fallback true: se a leitura vier nula (ex: antes da migração da coluna
    // rodar), nunca mostra o tutorial por engano.
    hasSeenTour: data?.has_seen_tour ?? true,
  }
}

// Chamada ao pular ou concluir o tutorial de primeiro acesso — nos dois
// casos marca como visto (ver src/tour/), sem estado de "progresso parcial"
// pra guardar. Erro só logado, nunca lançado: uma falha aqui não deve
// travar o usuário (pior caso, o tutorial reaparece uma vez a mais).
export async function markTourSeen() {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase.from('profiles').update({ has_seen_tour: true }).eq('user_id', userId)
  if (error) console.error('[profileStore] markTourSeen failed:', error.message)
}

// Atualiza os campos passados — name/birthdate viram uma chamada a
// updateUser (user_metadata), bio/isPublic viram um update em profiles.
// Cada grupo só roda se algum campo dele foi de fato passado.
export async function updateProfile({ name, birthdate, bio, isPublic }) {
  const authUpdates = {}
  if (name !== undefined) authUpdates.name = name.trim()
  if (birthdate !== undefined) authUpdates.birthdate = birthdate
  if (Object.keys(authUpdates).length > 0) {
    const { error } = await supabase.auth.updateUser({ data: authUpdates })
    if (error) throw new Error(error.message)
  }

  const profileUpdates = {}
  if (bio !== undefined) profileUpdates.bio = bio.trim()
  if (isPublic !== undefined) profileUpdates.is_public = isPublic
  if (Object.keys(profileUpdates).length > 0) {
    const userId = await getUserId()
    if (!userId) throw new Error('Você precisa estar logado.')
    const { error } = await supabase.from('profiles').update(profileUpdates).eq('user_id', userId)
    if (error) throw new Error(error.message)
  }
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function uploadAvatar(file) {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Envie uma imagem JPEG, PNG, WEBP ou GIF.')
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('A imagem precisa ter até 5MB.')
  }
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')

  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (uploadError) throw new Error(uploadError.message)

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Cache-busting: o caminho do arquivo é sempre o mesmo (avatar.<ext>), então
  // sem isso o navegador poderia continuar mostrando a foto antiga em cache.
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`

  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', userId)
  if (error) throw new Error(error.message)

  return avatarUrl
}

// Perfil básico de um amigo (nome, bio, foto, se é público) — a RLS de
// profiles já libera isso pra quem é amigo aceito ou colega de grupo (ver
// 0002_friends_groups_challenges.sql); aqui só formata o retorno.
export async function getFriendProfile(friendUserId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, bio, avatar_url, is_public')
    .eq('user_id', friendUserId)
    .maybeSingle()
  if (error) { console.error('[profileStore] getFriendProfile failed:', error.message); return null }
  if (!data) return null
  return {
    name: data.name,
    bio: data.bio ?? '',
    avatarUrl: data.avatar_url ?? null,
    isPublic: data.is_public ?? false,
  }
}

// Progresso/estudos/grupos de um amigo — só devolve dado real se a RPC
// confirmar amizade aceita E perfil público; senão volta { isPublic: false }.
export async function getFriendProgressSummary(friendUserId) {
  const { data, error } = await supabase.rpc('get_friend_progress_summary', { target_user_id: friendUserId })
  if (error) { console.error('[profileStore] getFriendProgressSummary failed:', error.message); return { isPublic: false } }
  return {
    isPublic: data.isPublic,
    planId: data.planId ?? 'standard',
    completedKeys: data.completedKeys ?? [],
    studiesCompletedCount: data.studiesCompletedCount ?? 0,
    groups: data.groups ?? [],
  }
}
