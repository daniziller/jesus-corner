// Gate de assinatura compartilhado pelos endpoints que custam dinheiro de
// verdade por chamada (IA e text-to-speech). Antes cada um repetia inline o
// mesmo bloco "isPremium" lendo status+access_type; agora todos passam por
// aqui, que também resolve o `tier` (premium vs premium_ai).
//
// Espelha resolveEntitlement de src/billing/entitlement.js — mantenha os
// dois em sincronia. Desde 2026-11-18 só há uma versão paga: qualquer
// assinatura ativa dá tudo, IA incluída (inclusive a quem assinou o antigo
// "Premium" sem IA). `ai_tier_required` continua sendo o erro de quem não
// assina.
//
// Uso:
//   const ent = await fetchEntitlement(supabase, caller.id)
//   if (!ent.hasAI) { res.status(403).json({ error: 'ai_tier_required' }); return }

// Mesma regra de isPremiumActive (src/billing/subscriptionStore.js): free e
// vitalício não têm ciclo de cobrança, então só valem com status 'active';
// recorrente também vale em 'trialing'.
export function isActive(sub, nowMs = Date.now()) {
  if (!sub) return false
  if (sub.access_type === 'free' || sub.access_type === 'lifetime') {
    return sub.status === 'active'
  }
  // Cancelada valendo até o fim do período: passada a data, não conta mais,
  // mesmo que o aviso de expiração do provedor atrase (2026-11-19).
  if (sub.cancel_at_period_end && sub.current_period_end && Date.parse(sub.current_period_end) <= nowMs) return false
  return sub.status === 'active' || sub.status === 'trialing'
}

export async function fetchEntitlement(supabase, userId) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, access_type, tier, cancel_at_period_end, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  if (!isActive(sub)) return { active: false, tier: 'free', hasPremium: false, hasAI: false }

  return { active: true, tier: 'premium', hasPremium: true, hasAI: true }
}
