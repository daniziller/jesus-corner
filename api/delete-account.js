// Exclusão de conta — art. 18, VI da LGPD, e também exigência da App Store
// (desde 2022) e do Google Play para apps com login.
//
// Não é um DELETE simples. Duas armadilhas no schema justificam a sequência
// abaixo:
//
//  1. reading_groups.created_by referencia profiles(user_id) ON DELETE
//     CASCADE. Apagar a linha de profiles apagaria os grupos criados pela
//     pessoa e, em cascata, os membros, comentários e pedidos de oração de
//     TODO MUNDO naquele grupo. A migration 0025 soltou profiles de
//     auth.users justamente pra permitir que a linha sobreviva anonimizada.
//
//  2. A assinatura precisa ser cancelada no provedor ANTES de sumir a linha
//     em subscriptions — senão o Stripe continua cobrando um cliente que não
//     existe mais no nosso banco.
//
// O que é APAGADO de verdade: auth.users (email e senha), user_data (notas e
// pedidos de oração privados), notificações, amizades, atividade, avatar no
// Storage, mensagens de contato e o registro de consentimento.
//
// O que é ANONIMIZADO: comentários e pedidos de oração feitos em grupo. O
// texto pertence à conversa dos outros membros; o vínculo com a pessoa é
// desfeito de forma irreversível.
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const ANON_NAME = 'Conta removida'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })

  const user = userData.user
  const userId = user.id
  const email = user.email

  // Confirmação explícita: o cliente precisa mandar o próprio email. Evita
  // que um clique acidental (ou um CSRF) destrua a conta.
  const confirmation = (req.body?.confirmEmail || '').trim().toLowerCase()
  if (!email || confirmation !== email.toLowerCase()) {
    return res.status(400).json({ error: 'confirmation_mismatch' })
  }

  const steps = []
  const warn = (step, err) => {
    // Uma etapa que falha não pode abortar a exclusão: deixar a conta em
    // estado intermediário é pior do que seguir e registrar o resíduo.
    console.error(`delete-account: falha em ${step}`, err)
    steps.push({ step, ok: false })
  }
  const ok = step => steps.push({ step, ok: true })

  // ── 1. Cancelar a assinatura no provedor ─────────────────────────────────
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, billing_provider')
      .eq('user_id', userId)
      .maybeSingle()

    if (sub?.stripe_subscription_id) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id)
      ok('stripe_cancel')
    } else if (sub?.billing_provider === 'apple' || sub?.billing_provider === 'google_play') {
      // Compras nas lojas só o próprio usuário cancela, pelo sistema dela.
      // O cliente já avisa isso na tela antes de confirmar.
      steps.push({ step: 'store_subscription_manual', ok: true })
    }
  } catch (err) { warn('stripe_cancel', err) }

  // ── 2. Anonimizar o que fica (conteúdo em grupo) ─────────────────────────
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        name: ANON_NAME,
        bio: '',
        avatar_url: null,
        is_public: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
    if (error) throw error
    ok('profile_anonymized')
  } catch (err) { warn('profile_anonymized', err) }

  // Grupos criados pela pessoa passam para outro moderador, se houver. Sem
  // isso o grupo fica órfão de administração — a lápide não modera nada.
  try {
    const { data: owned } = await supabaseAdmin
      .from('reading_groups').select('id').eq('created_by', userId)

    for (const g of owned ?? []) {
      const { data: heir } = await supabaseAdmin
        .from('reading_group_members')
        .select('user_id')
        .eq('group_id', g.id).eq('status', 'joined').eq('role', 'moderator')
        .neq('user_id', userId)
        .limit(1).maybeSingle()

      if (heir) {
        await supabaseAdmin.from('reading_groups')
          .update({ created_by: heir.user_id }).eq('id', g.id)
      }
    }
    ok('groups_reassigned')
  } catch (err) { warn('groups_reassigned', err) }

  // ── 3. Apagar o que é privado e não pertence a mais ninguém ──────────────
  const purge = [
    ['user_data', 'user_id'],              // notas e pedidos de oração privados
    ['friendships', 'requester_id'],
    ['friendships', 'addressee_id'],
    ['friend_activity', 'user_id'],
    ['group_prayer_intentions', 'user_id'],
    ['group_comment_likes', 'user_id'],
    ['group_prayer_comment_likes', 'user_id'],
    ['reading_challenge_progress', 'user_id'],
    ['reading_group_members', 'user_id'],
    ['consents', 'user_id'],
  ]
  for (const [table, col] of purge) {
    try {
      const { error } = await supabaseAdmin.from(table).delete().eq(col, userId)
      if (error) throw error
    } catch (err) { warn(`purge_${table}_${col}`, err) }
  }
  ok('private_data_purged')

  // contact_messages guarda nome e email sem FK — só dá pra achar pelo email.
  try {
    await supabaseAdmin.from('contact_messages').delete().ilike('email', email)
    ok('contact_messages_purged')
  } catch (err) { warn('contact_messages_purged', err) }

  // ── 4. Avatar no Storage ─────────────────────────────────────────────────
  // O Storage não segue o cascade do Postgres: sem isso a foto continuaria
  // acessível por URL depois da conta apagada.
  try {
    const { data: files } = await supabaseAdmin.storage.from('avatars').list(userId)
    if (files?.length) {
      await supabaseAdmin.storage.from('avatars')
        .remove(files.map(f => `${userId}/${f.name}`))
    }
    ok('avatar_removed')
  } catch (err) { warn('avatar_removed', err) }

  // ── 5. Apagar o usuário ──────────────────────────────────────────────────
  // Por último, e só aqui o email some. Cascateia subscriptions e
  // notifications; onboarding_events fica com user_id nulo (anonimizado).
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error
    ok('auth_user_deleted')
  } catch (err) {
    warn('auth_user_deleted', err)
    // Esta é a única etapa que não pode falhar em silêncio: sem ela o email
    // continua no banco e a exclusão não aconteceu de verdade.
    return res.status(500).json({ error: 'deletion_incomplete', steps })
  }

  return res.status(200).json({ ok: true, steps })
}
