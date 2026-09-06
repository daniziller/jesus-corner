import { setSelectedPlanId } from '../plan/planStore'
import { setReadingOrder } from '../reading/readingOrderStore'
import { setStepMinutes } from '../plan/stepMinutesStore'

// Guarda plano de leitura, ordem (AT/NT primeiro) e minutos de cada passo
// escolhidos no cadastro (SignupScreen.jsx) pra sobreviverem ao desvio de
// confirmação de email — mesmo motivo e mesmo padrão de
// savePendingInviteCode/redeemPendingInviteCode em src/invites/inviteStore.js:
// as três gravações de baixo exigem uma sessão de verdade (escrevem em
// user_data via RLS), que só existe DEPOIS do redirect de página inteira da
// confirmação — e esse redirect apaga todo o estado do React, incluindo o
// que a pessoa tinha acabado de escolher no formulário de cadastro. Sem
// isso, quem precisa confirmar email (o padrão do projeto) sempre caía nos
// defaults do backend ('standard'/'ot_first'/sem minutos), silenciosamente.
//
// Minutos de cada passo entraram aqui no Bloco 8 (antes iam pras stores
// antigas prayerDurationStore/reflectionDurationStore, só localStorage —
// não precisavam desse mecanismo, mas também não eram a fonte real que
// Meu Plano/Oração/Reflexão leem desde o Bloco 4, ver stepMinutesStore.js).
const PENDING_PLAN_KEY = 'jc_pending_plan_id'
const PENDING_ORDER_KEY = 'jc_pending_reading_order'
const PENDING_MINUTES_KEY = 'jc_pending_step_minutes'

export function savePendingOnboardingChoices({ planId, readingOrder, stepMinutes }) {
  if (planId) localStorage.setItem(PENDING_PLAN_KEY, planId)
  if (readingOrder) localStorage.setItem(PENDING_ORDER_KEY, readingOrder)
  if (stepMinutes) localStorage.setItem(PENDING_MINUTES_KEY, JSON.stringify(stepMinutes))
}

// Chamado no bootstrap (ver src/App.jsx), ANTES de ler plano/ordem/minutos
// de leitura — pra evitar corrida entre essa escrita e a leitura que
// acontece logo em seguida no mesmo carregamento. Sempre limpa as chaves
// depois, sucesso ou não, pra não tentar de novo a cada login.
export async function applyPendingOnboardingChoices() {
  const planId = localStorage.getItem(PENDING_PLAN_KEY)
  const readingOrder = localStorage.getItem(PENDING_ORDER_KEY)
  const stepMinutesRaw = localStorage.getItem(PENDING_MINUTES_KEY)
  if (!planId && !readingOrder && !stepMinutesRaw) return
  localStorage.removeItem(PENDING_PLAN_KEY)
  localStorage.removeItem(PENDING_ORDER_KEY)
  localStorage.removeItem(PENDING_MINUTES_KEY)
  try {
    if (planId) await setSelectedPlanId(null, planId)
    if (readingOrder) await setReadingOrder(null, readingOrder)
    if (stepMinutesRaw) await setStepMinutes(JSON.parse(stepMinutesRaw))
  } catch (err) {
    console.error('[pendingOnboardingChoices] failed to apply', err)
  }
}
