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
  const { data, error } = await supabase
    .from('profiles')
    .select('bio, avatar_url, is_public')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) { console.error('[profileStore] getMyProfile failed:', error.message); return null }
  return {
    bio: data?.bio ?? '',
    avatarUrl: await resolveAvatarUrl(data?.avatar_url),
    isPublic: data?.is_public ?? false,
  }
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
const SIGNED_URL_TTL_SECONDS = 60 * 60

// O bucket 'avatars' deixou de ser público na migration 0025: antes a foto
// era acessível a qualquer um com o link, sem autenticação e para sempre.
// Agora avatar_url guarda só o CAMINHO do arquivo, e a URL é assinada na
// hora de exibir, com validade de 1 hora.
//
// Linhas antigas guardam a URL pública inteira. Em vez de migrar o banco,
// extraímos o caminho dela — o arquivo é o mesmo, só muda a forma de acessar.
function toStoragePath(value) {
  if (!value) return null
  if (!value.startsWith('http')) return value.split('?')[0]
  const marker = '/avatars/'
  const i = value.indexOf(marker)
  if (i === -1) return null
  return value.slice(i + marker.length).split('?')[0]
}

// Devolve uma URL exibível, ou null se o arquivo sumiu ou se quem pede não
// tem permissão de ver (a policy de storage repete a regra de visibilidade
// de profiles: dono, amigo aceito ou colega de grupo).
export async function resolveAvatarUrl(value) {
  const path = toStoragePath(value)
  if (!path) return null
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error) {
    console.error('[profileStore] resolveAvatarUrl failed:', error.message)
    return null
  }
  return data?.signedUrl ?? null
}

// Assina vários avatares de uma vez, para listas (amigos, feed, pedidos de
// oração). Um createSignedUrl por item em série deixaria a lista lenta.
export async function resolveAvatarUrls(rows, getValue, setValue) {
  return Promise.all(rows.map(async row => setValue(row, await resolveAvatarUrl(getValue(row)))))
}

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

  // Guarda o caminho, não a URL: URL assinada expira, e persistir uma URL
  // morta seria pior do que não ter nada.
  const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('user_id', userId)
  if (error) throw new Error(error.message)

  return resolveAvatarUrl(path)
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
    avatarUrl: await resolveAvatarUrl(data.avatar_url),
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
