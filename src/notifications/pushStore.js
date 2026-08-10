// Web Push — o lembrete diário de leitura (toggle "Lembretes" em
// ProfileScreen.jsx) de verdade, ao contrário do sino de notificações
// (notificationsStore.js), que só aparece quando a pessoa já abriu o app.
// Push chega mesmo com o app fechado, direto do sistema operacional.
import { supabase } from '../lib/supabaseClient'

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

// A chave pública do VAPID vem em base64url; a Push API espera um
// Uint8Array — essa é a conversão padrão recomendada pelo MDN.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// true se ESTE navegador/dispositivo já está inscrito — não é por conta,
// já que cada aparelho tem sua própria inscrição (ver migration 0027).
export async function isSubscribedToPush() {
  if (!isPushSupported()) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('Este navegador não tem suporte a notificações push.')
  }
  if (Notification.permission === 'denied') {
    throw new Error('As notificações estão bloqueadas nas configurações do navegador.')
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação não concedida.')
  }

  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    })
  }

  const json = subscription.toJSON()
  // Guardado no momento da inscrição pra o cron (api/send-reading-reminders.js)
  // calcular quando são 07:00 pra essa pessoa, sem precisar de um cron por fuso.
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    timezone,
  }, { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}
