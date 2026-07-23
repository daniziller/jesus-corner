import { supabase } from '../lib/supabaseClient'

// A linha de subscriptions do usuário logado — RLS já filtra pra só a
// própria linha (user_id é a PK, ver supabase/migrations/0016_subscriptions.sql),
// então um select sem filtro nenhum já devolve exatamente isso. null se a
// pessoa nunca assinou (nenhuma linha ainda).
export async function getMySubscription() {
  const { data, error } = await supabase.from('subscriptions').select('*').maybeSingle()
  if (error) {
    console.error('Failed to fetch subscription', error)
    return null
  }
  return data
}

export function isPremiumActive(subscription) {
  if (!subscription) return false
  // Grátis e vitalício não têm ciclo de cobrança — uma vez ativados, ficam
  // ativos pra sempre (não existe "trialing"/"past_due" pra esses tipos).
  if (subscription.access_type === 'free' || subscription.access_type === 'lifetime') {
    return subscription.status === 'active'
  }
  return subscription.status === 'active' || subscription.status === 'trialing'
}

async function authorizedPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  return res.json()
}

// Devolve a URL do Stripe Checkout — quem chamar é responsável por
// redirecionar (window.location.href = url), já que isso sai do domínio do app.
// interval: 'month' ou 'year'. amountCents sempre > 0 — R$0 não passa por
// aqui, ver activateFreeAccess. currency: 'brl' ou 'usd', escolhida pela
// pessoa na tela — não dá pra confiar só na geolocalização por IP pra isso
// (cartão de banco brasileiro usado fora do Brasil, ou vice-versa, quebra
// a cobrança na moeda errada).
export async function startCheckout({ interval, amountCents, currency }) {
  const { url } = await authorizedPost('/api/create-checkout-session', { interval, amountCents, currency })
  return url
}

// Ativa acesso gratuito (R$0) — não envolve o Stripe, não redireciona.
export async function activateFreeAccess() {
  return authorizedPost('/api/activate-free-access')
}

// Devolve a URL do Stripe Billing Portal (cancelar/trocar cartão/ver fatura).
export async function openBillingPortalUrl() {
  const { url } = await authorizedPost('/api/create-portal-session')
  return url
}
