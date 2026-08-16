import { setSelectedPlanId } from '../plan/planStore'
import { setReadingOrder } from '../reading/readingOrderStore'

// Guarda plano de leitura e ordem (AT/NT primeiro) escolhidos no onboarding
// pra sobreviverem ao desvio de confirmação de email — mesmo motivo e
// mesmo padrão de savePendingInviteCode/redeemPendingInviteCode em
// src/invites/inviteStore.js: setSelectedPlanId/setReadingOrder exigem uma
// sessão de verdade (escrevem em user_data via RLS), que só existe DEPOIS
// do redirect de página inteira da confirmação — e esse redirect apaga
// todo o estado do React, incluindo o que a pessoa tinha acabado de
// escolher no formulário de cadastro. Sem isso, quem precisa confirmar
// email (o padrão do projeto) sempre caía nos defaults do backend
// ('standard'/'ot_first'), silenciosamente.
//
// Tempos de oração/reflexão (setSavedPrayerMinutes/setSavedReflectionMinutes)
// NÃO precisam desse mecanismo — são gravação pura em localStorage, sem
// sessão nenhuma envolvida, então já sobrevivem ao redirect sozinhos desde
// que chamados antes do early-return (ver AuthScreen.jsx).
const PENDING_PLAN_KEY = 'jc_pending_plan_id'
const PENDING_ORDER_KEY = 'jc_pending_reading_order'

export function savePendingOnboardingChoices({ planId, readingOrder }) {
  if (planId) localStorage.setItem(PENDING_PLAN_KEY, planId)
  if (readingOrder) localStorage.setItem(PENDING_ORDER_KEY, readingOrder)
}

// Chamado no bootstrap (ver src/App.jsx), ANTES de ler plano/ordem de
// leitura — pra evitar corrida entre essa escrita e a leitura que acontece
// logo em seguida no mesmo carregamento. Sempre limpa as chaves depois,
// sucesso ou não, pra não tentar de novo a cada login.
export async function applyPendingOnboardingChoices() {
  const planId = localStorage.getItem(PENDING_PLAN_KEY)
  const readingOrder = localStorage.getItem(PENDING_ORDER_KEY)
  if (!planId && !readingOrder) return
  localStorage.removeItem(PENDING_PLAN_KEY)
  localStorage.removeItem(PENDING_ORDER_KEY)
  try {
    if (planId) await setSelectedPlanId(null, planId)
    if (readingOrder) await setReadingOrder(null, readingOrder)
  } catch (err) {
    console.error('[pendingOnboardingChoices] failed to apply', err)
  }
}
