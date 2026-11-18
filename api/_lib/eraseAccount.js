// Exclusão de conta — art. 18, VI da LGPD, e também exigência da App Store
// e do Google Play para apps com login. Usada por api/delete-account.js (a
// própria pessoa, no app) e por api/admin/person.js (a equipe, a pedido
// por e-mail — a página pública jesuscorner.app/excluir-conta oferece esse
// caminho, com prazo de 15 dias).
//
// A ordem importa:
//  1. Cancelar a assinatura no Stripe ANTES de sumir a linha em
//     subscriptions — senão o Stripe continua cobrando. Se falhar, para
//     tudo: melhor a pessoa tentar de novo do que ser cobrada sem conta.
//  2. erase_user_content (migração 0082), numa transação só: apaga o que é
//     só dela (pedidos privados, notas, curtidas, participações...),
//     anonimiza o que é conversa dos outros e transforma o perfil em
//     lápide. Se falhar, para tudo — nada foi apagado pela metade, e a
//     pessoa pode tentar de novo.
//  3. A foto no Storage (o Storage não segue o cascade do Postgres).
//  4. O usuário do auth, por último: só aqui somem e-mail e senha, e
//     cascateia o que aponta pra auth.users (assinatura, notificações,
//     consentimentos, conversas com perguntas sobre o texto, histórico de
//     leitura, uso do limite...).
//
// Por que não apagar a linha de profiles: reading_groups.created_by,
// planos e desafios de grupo apontam pra ela com ON DELETE CASCADE —
// apagá-la levaria junto conteúdo de TODO MUNDO do grupo. Ela fica como
// "Conta removida", sem nada que identifique a pessoa.

export async function eraseAccount({ userId, email, db, stripe }) {
  const steps = []
  const ok = step => steps.push({ step, ok: true })
  const fail = (step, err) => {
    console.error(`eraseAccount: falha em ${step}:`, err?.message ?? err)
    steps.push({ step, ok: false })
  }

  // 1. Assinatura
  let storeSubscription = false
  let stripeCustomerId = null
  try {
    const { data: sub, error } = await db.from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, billing_provider, status')
      .eq('user_id', userId).maybeSingle()
    if (error) throw error
    stripeCustomerId = sub?.stripe_customer_id ?? null
    if (sub?.stripe_subscription_id && sub.status !== 'canceled') {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id)
    }
    storeSubscription = sub?.billing_provider === 'apple' || sub?.billing_provider === 'google_play'
    ok('subscription')
  } catch (err) {
    // Assinatura já cancelada no Stripe não é falha.
    if (err?.code === 'resource_missing') ok('subscription')
    else { fail('subscription', err); return { ok: false, steps } }
  }

  // 2. Conteúdo
  try {
    const { error } = await db.rpc('erase_user_content', { p_user_id: userId, p_email: email ?? '' })
    if (error) throw error
    ok('content')
  } catch (err) {
    fail('content', err)
    return { ok: false, steps }
  }

  // 2b. O cliente no Stripe (revisão de LGPD, segunda entrega): apagar o
  // cliente tira de lá nome, e-mail e cartões guardados. As faturas e
  // cobranças já feitas o Stripe mantém, por obrigação fiscal (art. 16, I).
  // Falha aqui não trava a exclusão — fica no log pra apagar à mão.
  if (stripeCustomerId) {
    try {
      await stripe.customers.del(stripeCustomerId)
      ok('stripe_customer')
    } catch (err) {
      if (err?.code === 'resource_missing') ok('stripe_customer')
      else fail('stripe_customer', err)
    }
  }

  // 3. Foto
  try {
    const { data: files } = await db.storage.from('avatars').list(userId)
    if (files?.length) {
      const { error } = await db.storage.from('avatars').remove(files.map(f => `${userId}/${f.name}`))
      if (error) throw error
    }
    ok('avatar')
  } catch (err) { fail('avatar', err) }

  // 4. Usuário
  try {
    const { error } = await db.auth.admin.deleteUser(userId)
    if (error) throw error
    ok('auth_user')
  } catch (err) {
    fail('auth_user', err)
    return { ok: false, steps }
  }

  return { ok: true, steps, storeSubscription }
}
