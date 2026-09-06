// Link pessoal de convite de amigo (quadro 24c, "Compartilhar meu
// convite" — jesuscorner.app/d/diego no mockup). Precisa de um
// identificador público de conta que não existia antes (nome é livre e
// repetível, e-mail é privado) — ver migration 0050_username.sql.
//
// Simplificação deliberada, documentada: o link real usa o domínio do APP
// (app.jesuscorner.app/d/username), não o domínio nu do mockup
// (jesuscorner.app) — aquele é o site de marketing, um repositório
// separado (jesus-corner-site) que não resolve rotas do app. Resolver
// /d/:username de verdade exige que o link aponte pra onde essa rota
// realmente existe.
import { supabase } from '../lib/supabaseClient'
import { resolveAvatarUrl } from '../profile/profileStore'
import { sendFriendRequestByUserId } from './friendsStore'

const APP_URL = 'https://app.jesuscorner.app'
const PENDING_USERNAME_KEY = 'jc_pending_friend_username'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// Só letras minúsculas/dígitos, sem acento nem espaço — mesmo alfabeto da
// constraint do banco (profiles_username_format). `name` pode vir vazio
// (ex: convidado que nunca chegou a preencher) — cai no fallback 'user'.
function baseCandidateFrom(name) {
  const cleaned = (name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 16)
  if (cleaned.length >= 3) return cleaned
  return (cleaned + '000').slice(0, 3)
}

// Devolve o username já salvo, ou gera um na hora (a partir do nome,
// completando com dígitos se precisar ser único) e salva antes de devolver.
// Só é chamada quando a pessoa abre o cartão de convite pela primeira vez —
// ninguém escolhe um username antes disso, não é um passo de cadastro.
export async function getOrCreateMyUsername(name) {
  const userId = await getUserId()
  if (!userId) throw new Error('not_authenticated')
  const { data: existing, error: readErr } = await supabase
    .from('profiles').select('username').eq('user_id', userId).maybeSingle()
  if (readErr) throw new Error(readErr.message)
  if (existing?.username) return existing.username

  const base = baseCandidateFrom(name)
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 20)
    const { error } = await supabase.from('profiles').update({ username: candidate }).eq('user_id', userId)
    if (!error) return candidate
    if (error.code !== '23505') throw new Error(error.message) // não é conflito de unicidade — desiste
  }
  throw new Error('failed_to_generate_username')
}

export function inviteLinkFor(username) {
  return `${APP_URL}/d/${username}`
}

// Resolve "quem é @username" via RPC pública (ver migration 0050) — funciona
// sem sessão, porque quem visita o link pode ainda não ter conta. null
// quando o username não existe.
export async function resolveUsername(username) {
  const clean = (username ?? '').trim().toLowerCase()
  if (!clean) return null
  const { data, error } = await supabase.rpc('resolve_username', { target_username: clean })
  if (error) { console.error('[inviteLinkStore] resolveUsername failed:', error.message); return null }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return { userId: row.user_id, name: row.name, avatarUrl: await resolveAvatarUrl(row.avatar_url) }
}

// Resolve + manda o pedido de amizade — usado quando quem visita o link JÁ
// tem sessão. Sem conta ainda, ver savePendingFriendUsername abaixo.
export async function sendFriendRequestByUsername(username) {
  const target = await resolveUsername(username)
  if (!target) throw new Error('username_not_found')
  await sendFriendRequestByUserId(target.userId)
  return target
}

// Guarda o username do link pra sobreviver ao cadastro/confirmação de
// e-mail — mesmo motivo e mesmo padrão de savePendingInviteCode em
// src/invites/inviteStore.js: quem abre /d/:username sem conta ainda
// precisa criar uma (ou entrar) antes do pedido poder ser enviado, e esse
// caminho passa por um redirect de página inteira que apaga o estado do
// React.
export function savePendingFriendUsername(username) {
  const trimmed = (username ?? '').trim()
  if (trimmed) localStorage.setItem(PENDING_USERNAME_KEY, trimmed)
}

// Chamado no bootstrap (ver App.jsx), junto de redeemPendingInviteCode() —
// tenta mandar o pedido salvo assim que existe sessão de verdade, e sempre
// limpa a chave depois, sucesso ou não.
export async function redeemPendingFriendUsername() {
  const username = localStorage.getItem(PENDING_USERNAME_KEY)
  if (!username) return false
  localStorage.removeItem(PENDING_USERNAME_KEY)
  try {
    await sendFriendRequestByUsername(username)
    return true
  } catch (err) {
    console.error('[inviteLinkStore] failed to redeem pending friend username', err)
    return false
  }
}
