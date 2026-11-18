// Rastreamento do funil de onboarding (ver supabase/migrations/0022/0023) —
// sessionId anônimo porque a conta só existe a partir do passo de cadastro,
// sem isso não daria pra contar quem abandona antes de criar conta.
// Best-effort: nunca deve travar nem atrasar a experiência do onboarding.
import { getAppLanguage } from '../i18n/appLanguageStore'
import { supabase } from '../lib/supabaseClient'

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

// O evento só fica ligado a uma conta quando vem com a sessão dela (o
// servidor confere o token — revisão de LGPD, 2026-11-18: antes qualquer um
// gravava eventos com o id de outra pessoa).
export function trackOnboardingEvent(step, { userId } = {}) {
  const sessionId = getSessionId()
  if (!sessionId) return
  const language = getAppLanguage() === 'en' ? 'en' : 'pt'
  const send = token => {
    try {
      fetch('/api/track-onboarding-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ sessionId, step, userId: userId ?? null, language }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // ambiente sem fetch/sessionStorage (ex: SSR) — ignora silenciosamente
    }
  }
  if (!userId) { send(null); return }
  supabase.auth.getSession().then(({ data }) => send(data?.session?.access_token ?? null)).catch(() => send(null))
}
