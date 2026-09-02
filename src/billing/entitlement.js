// O que a conta pode fazer, derivado da linha de subscriptions — a fonte
// única pra todo gate de recurso no cliente (ver session.hasPremium /
// session.hasAI em App.jsx, PremiumLockCard.jsx, telas).
//
// Três tiers:
//   free        — sem assinatura ativa. Leitura da Bíblia (ordem canônica,
//                 4 ritmos), oração/reflexão avulsas, áudio com voz do
//                 aparelho, progresso básico. Nada mais.
//   premium     — + voz natural, mãos-livres, rotina guiada, XP/níveis/
//                 conquistas, cronológico, notas, comunidade.
//   premium_ai  — + os recursos de IA (chat, planos/estudos gerados, busca
//                 nas anotações).
//
// A checagem de verdade (que dá acesso) é sempre re-feita no servidor pros
// recursos que custam dinheiro — ver api/_lib/entitlement.js.
import { isPremiumActive } from './subscriptionStore'

export function resolveEntitlement(subscription) {
  if (!isPremiumActive(subscription)) {
    return { tier: 'free', hasPremium: false, hasAI: false }
  }
  const tier = subscription?.tier === 'premium_ai' ? 'premium_ai' : 'premium'
  return { tier, hasPremium: true, hasAI: tier === 'premium_ai' }
}
