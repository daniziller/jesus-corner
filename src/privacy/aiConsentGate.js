// O pedido de consentimento da escrita assistida na hora do uso (revisão de
// LGPD, 2026-11-18).
//
// Todo endpoint que manda texto da pessoa para a IA confere o consentimento
// ai_processing no servidor (api/_lib/aiBudget.js) e, sem ele, responde
// 403 { error: 'ai_consent_required' }. São mais de quinze telas que chamam
// esses endpoints, cada uma com o seu tratamento de erro — em vez de mexer
// em todas, este módulo observa as respostas do fetch: viu esse 403 numa
// rota /api/, avisa o app, que abre AiConsentSheet por cima da tela. A tela
// que chamou mostra o erro dela normalmente; depois de permitir, a pessoa
// toca de novo.
const EVENT = 'jc:ai-consent-required'

export function installAiConsentInterceptor() {
  if (typeof window === 'undefined' || window.__jcAiConsentGate) return
  window.__jcAiConsentGate = true
  const original = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const res = await original(input, init)
    if (res.status === 403) {
      const url = typeof input === 'string' ? input : input?.url ?? ''
      if (url.includes('/api/')) {
        res.clone().json()
          .then(body => { if (body?.error === 'ai_consent_required') window.dispatchEvent(new CustomEvent(EVENT)) })
          .catch(() => {})
      }
    }
    return res
  }
}

export function onAiConsentRequired(callback) {
  window.addEventListener(EVENT, callback)
  return () => window.removeEventListener(EVENT, callback)
}
