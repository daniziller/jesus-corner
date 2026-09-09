// Banco de estudos compartilháveis (26e/26f/26g, Bloco 12) — migration
// 0053_public_studies.sql. Diferente de themePlansStore.js (100% pessoal,
// dentro de user_data): isto é dado visível entre usuários — a segurança
// de verdade é a RLS da migration, não o código aqui (mesmo espírito de
// friendsStore.js/prayerRequestsStore.js).
//
// "Usar" um estudo do banco NÃO troca a fonte de verdade — só grava uma
// linha em study_uses (contador real de gente distinta, via trigger) e
// devolve os dados prontos pra quem chamou criar a PRÓPRIA cópia pessoal
// via saveThemePlan (themePlansStore.js). O banco e a cópia pessoal nunca
// se misturam: apagar do banco (withdrawStudy) não mexe em quem já usou.
import { supabase } from '../lib/supabaseClient'
import { resolveAvatarUrl } from '../profile/profileStore'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

function mapStudyRow(row) {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author?.name ?? row.system_author_name ?? '',
    title: row.title,
    overview: row.overview ?? '',
    format: row.format,
    tags: row.tags ?? [],
    passages: row.passages ?? [],
    visibility: row.visibility,
    hidden: row.hidden,
    usesCount: row.uses_count ?? 0,
    reportCount: row.report_count ?? 0,
    minutesPerDay: row.minutes_per_day ?? 15,
    reviewed: row.reviewed ?? true,
    groupId: row.group_id ?? null,
    groupName: row.group?.name ?? null,
    createdAt: row.created_at,
  }
}

const STUDY_COLUMNS = 'id, author_id, system_author_name, author:profiles!studies_author_id_fkey(name), title, overview, format, tags, passages, visibility, hidden, uses_count, report_count, minutes_per_day, reviewed, group_id, group:reading_groups!studies_group_id_fkey(name), created_at'

// Banco público (26e "estudos prontos" + 26g busca por tema) — nunca
// escondido (RLS já filtra `hidden`, mas o filtro explícito documenta a
// intenção). `query` casa contra título, resumo ou tema (41i: "Tema, livro
// ou situação" — livro normalmente já aparece no título/resumo, ex.
// "Filipenses em 4 dias"); `tag` contra o chip de tema ativo.
export async function searchPublicStudies({ query = '', tag = null, maxN = 30 } = {}) {
  let q = supabase.from('studies').select(STUDY_COLUMNS).eq('visibility', 'public').eq('hidden', false)
  const trimmed = query.trim()
  if (trimmed) q = q.or(`title.ilike.%${trimmed}%,overview.ilike.%${trimmed}%,tags.cs.{${trimmed}}`)
  if (tag) q = q.contains('tags', [tag])
  q = q.order('uses_count', { ascending: false }).limit(maxN)
  const { data, error } = await q
  if (error) { console.error('[publicStudiesStore] searchPublicStudies failed:', error.message); return [] }
  return (data ?? []).map(mapStudyRow)
}

// Busca do hub (41a: "tema, livro ou autor") — mesmo texto contra
// título/resumo/tema de searchPublicStudies, cruzando as 3 origens
// navegáveis (Jesus Corner + grupo + público) numa chamada só; "autor" só
// funciona pra nome exato/aproximado (ilike no nome do perfil ou no nome
// do sistema "Jesus' Corner" já cai em system_author_name). `groupIds`
// escopa a busca aos grupos de quem está buscando.
export async function searchStudiesByAnything(query, groupIds = []) {
  const trimmed = query.trim()
  if (!trimmed) return []
  const authorProfiles = await supabase.from('profiles').select('user_id').ilike('name', `%${trimmed}%`).limit(20)
  const authorIds = (authorProfiles.data ?? []).map(p => p.user_id)
  const orClauses = [`title.ilike.%${trimmed}%`, `overview.ilike.%${trimmed}%`, `tags.cs.{${trimmed}}`, `system_author_name.ilike.%${trimmed}%`]
  if (authorIds.length) orClauses.push(`author_id.in.(${authorIds.join(',')})`)
  let visibilityFilter = `visibility.eq.public`
  if (groupIds.length) visibilityFilter += `,and(visibility.eq.group,group_id.in.(${groupIds.join(',')}))`
  const { data, error } = await supabase
    .from('studies')
    .select(STUDY_COLUMNS)
    .eq('hidden', false)
    .or(orClauses.join(','))
    .or(visibilityFilter)
    .order('uses_count', { ascending: false })
    .limit(30)
  if (error) { console.error('[publicStudiesStore] searchStudiesByAnything failed:', error.message); return [] }
  return (data ?? []).map(mapStudyRow)
}

// Os 3 prontos "livro inteiro, 1 capítulo por dia" (26e) — mesma busca
// pública, só que sempre os do sistema (author_id nulo), pouco tráfego,
// sem paginação.
export async function getReadyMadeStudies() {
  const { data, error } = await supabase.from('studies').select(STUDY_COLUMNS).is('author_id', null).eq('hidden', false)
  if (error) { console.error('[publicStudiesStore] getReadyMadeStudies failed:', error.message); return [] }
  return (data ?? []).map(mapStudyRow)
}

// "Dos seus grupos" (41a) — estudos visibility='group' de qualquer grupo
// que EU seja membro ('joined', ver getMyGroups em groupsStore.js).
// `groupIds` vem pronto de quem chama (evita essa store depender de
// groupsStore.js só por isso).
export async function getGroupStudies(groupIds) {
  if (!groupIds?.length) return []
  const { data, error } = await supabase.from('studies').select(STUDY_COLUMNS).eq('visibility', 'group').eq('hidden', false).in('group_id', groupIds)
  if (error) { console.error('[publicStudiesStore] getGroupStudies failed:', error.message); return [] }
  return (data ?? []).map(mapStudyRow)
}

// Estudos que EU publiquei (banco), qualquer visibilidade — usado em 4c
// pra "sair do banco".
export async function getMyPublishedStudies() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase.from('studies').select(STUDY_COLUMNS).eq('author_id', userId).order('created_at', { ascending: false })
  if (error) { console.error('[publicStudiesStore] getMyPublishedStudies failed:', error.message); return [] }
  return (data ?? []).map(mapStudyRow)
}

// Convites de estudo pendentes/aceitos ONDE EU sou o convidado (4c) —
// junta com o estudo pra já trazer título/autor.
export async function getMyStudyInvites() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('study_invitees')
    .select(`status, study:studies!study_invitees_study_id_fkey(${STUDY_COLUMNS})`)
    .eq('invitee_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[publicStudiesStore] getMyStudyInvites failed:', error.message); return [] }
  return (data ?? []).filter(row => row.study).map(row => ({ status: row.status, study: mapStudyRow(row.study) }))
}

// Publica um estudo no banco — `inviteeIds` só é usado quando
// visibility='invited' (ignorado em 'public'). Devolve o estudo criado.
export async function publishStudy({ title, overview, format, tags, passages, visibility, inviteeIds = [] }) {
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')
  const { data, error } = await supabase
    .from('studies')
    .insert({ author_id: userId, title, overview, format, tags, passages, visibility })
    .select(STUDY_COLUMNS)
    .single()
  if (error) throw new Error(error.message)
  if (visibility === 'invited' && inviteeIds.length > 0) {
    const { error: inviteError } = await supabase
      .from('study_invitees')
      .insert(inviteeIds.map(invitee_id => ({ study_id: data.id, invitee_id })))
    if (inviteError) console.error('[publicStudiesStore] failed to invite friends', inviteError.message)
  }
  return mapStudyRow(data)
}

export async function setStudyVisibility(studyId, visibility) {
  const { error } = await supabase.rpc('set_study_visibility', { target_study_id: studyId, new_visibility: visibility })
  if (error) throw new Error(error.message)
}

// "Sair do banco" (4c) — apaga só a linha compartilhada (cascade nos
// convites/usos/denúncias dela); quem já criou ou usou mantém a própria
// cópia pessoal (theme_plans), intocada.
export async function withdrawStudy(studyId) {
  const { error } = await supabase.from('studies').delete().eq('id', studyId)
  if (error) throw new Error(error.message)
}

// Registra que EU adotei este estudo (conta pra "quantas pessoas
// fizeram" — trigger na migration soma direto em studies.uses_count).
// Idempotente (PK study_id+user_id) — usar de novo um estudo já usado não
// duplica nem falha.
export async function recordStudyUse(studyId) {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase.from('study_uses').insert({ study_id: studyId, user_id: userId })
  // 23505 = violação de unique (já tinha usado antes) — não é erro de verdade.
  if (error && error.code !== '23505') console.error('[publicStudiesStore] recordStudyUse failed:', error.message)
}

export async function acceptStudyInvite(studyId) {
  const { error } = await supabase.rpc('accept_study_invite', { target_study_id: studyId })
  if (error) throw new Error(error.message)
}

export async function reportStudy(studyId) {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase.from('study_reports').insert({ study_id: studyId, reporter_id: userId })
  if (error && error.code !== '23505') throw new Error(error.message)
}
