// Gate de assinatura compartilhado pelos endpoints que custam dinheiro de
// verdade por chamada (IA e text-to-speech). Antes cada um repetia inline o
// mesmo bloco "isPremium" lendo status+access_type; agora todos passam por
// aqui, que também resolve o `tier` (premium vs premium_ai).
//
// Espelha resolveEntitlement de src/billing/entitlement.js — mantenha os
// dois em sincronia.
//
// Uso:
//   const ent = await fetchEntitlement(supabase, caller.id)
//   if (!ent.hasAI) { res.status(403).json({ error: 'ai_tier_required' }); return }

// Mesma regra de isPremiumActive (src/billing/subscriptionStore.js): free e
// vitalício não têm ciclo de cobrança, então só valem com status 'active';
// recorrente também vale em 'trialing'.
function isActive(sub) {
  if (!sub) return false
  if (sub.access_type === 'free' || sub.access_type === 'lifetime') {
    return sub.status === 'active'
  }
  return sub.status === 'active' || sub.status === 'trialing'
}

export async function fetchEntitlement(supabase, userId) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, access_type, tier')
    .eq('user_id', userId)
    .maybeSingle()

  if (!isActive(sub)) return { active: false, tier: 'free', hasPremium: false, hasAI: false }

  const tier = sub.tier === 'premium_ai' ? 'premium_ai' : 'premium'
  return { active: true, tier, hasPremium: true, hasAI: tier === 'premium_ai' }
}
