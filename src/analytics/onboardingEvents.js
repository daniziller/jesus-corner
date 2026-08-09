// Rastreamento do funil de onboarding (ver supabase/migrations/0022) —
// sessionId anônimo porque a conta só existe a partir do passo de cadastro,
// sem isso não daria pra contar quem abandona antes de criar conta.
// Best-effort: nunca deve travar nem atrasar a experiência do onboarding.
const SESSION_KEY = 'jc_onboarding_session'

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

export function trackOnboardingEvent(step, { userId } = {}) {
  const sessionId = getSessionId()
  if (!sessionId) return
  try {
    fetch('/api/track-onboarding-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, step, userId: userId ?? null }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ambiente sem fetch/sessionStorage (ex: SSR) — ignora silenciosamente
  }
}
