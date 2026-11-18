// O que a conta pode fazer, derivado da linha de subscriptions — a fonte
// única pra todo gate de recurso no cliente (ver session.hasPremium /
// session.hasAI em App.jsx, PremiumLockCard.jsx, telas).
//
// Duas versões (pedido dela, 2026-11-18):
//   free     — sem assinatura ativa. Leitura da Bíblia (ordem bíblica),
//              áudio com a voz do aparelho, oração e reflexão livre
//              avulsas, versículo do dia, lembrete e progresso básico.
//   premium  — qualquer assinatura ativa: tudo, IA incluída (plano diário
//              guiado, voz natural, mãos-livres, cronológico, Biblioteca,
//              estudos, comunidade, conquistas e os recursos de IA).
//
// Quem assinou o antigo "Premium" (sem IA) ou um plano anual continua com
// o preço que paga, e passa a ter tudo — não existe mais uma terceira
// versão. `hasAI` continua existindo só porque as telas já o usam; hoje
// ele é sempre igual a `hasPremium`. A lista do que cada versão entrega,
// pra mostrar na tela, mora em planFeatures.js.
//
// A checagem de verdade (que dá acesso) é sempre re-feita no servidor pros
// recursos que custam dinheiro — ver api/_lib/entitlement.js.
import { isPremiumActive } from './subscriptionStore'

export function resolveEntitlement(subscription) {
  if (!isPremiumActive(subscription)) {
    return { tier: 'free', hasPremium: false, hasAI: false }
  }
  return { tier: 'premium', hasPremium: true, hasAI: true }
}
