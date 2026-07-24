// Endpoint de webhook pras App Store Server Notifications V2 — a Apple
// manda um POST com { signedPayload: <JWS> } sempre que uma assinatura
// muda de estado (renovação, cancelamento, reembolso, etc). Papel
// equivalente ao stripe-webhook.js e ao api/google-play-rtdn.js.
//
// FLAG: sem Xcode/app iOS de teste nesta máquina, esta rota nunca recebeu
// uma notificação de verdade da Apple — revisar com cuidado, principalmente
// a forma de extrair os campos da notificação decodificada.
import { createClient } from '@supabase/supabase-js'
import { decodeSignedNotification, decodeSignedTransaction, getSubscriptionStatuses, mapAppleSubscriptionState } from './_lib/apple.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const { signedPayload } = req.body ?? {}
  if (!signedPayload) {
    return res.status(200).json({ received: true })
  }

  let notification
  try {
    notification = await decodeSignedNotification(signedPayload)
  } catch (err) {
    console.error('Failed to verify Apple notification signature:', err.message)
    // Assinatura inválida não é algo que um retry resolve.
    return res.status(200).json({ received: true })
  }

  const signedTransactionInfo = notification.data?.signedTransactionInfo
  if (!signedTransactionInfo) {
    return res.status(200).json({ received: true })
  }

  let transaction
  try {
    transaction = await decodeSignedTransaction(signedTransactionInfo)
  } catch (err) {
    console.error('Failed to decode Apple transaction from notification:', err.message)
    return res.status(200).json({ received: true })
  }

  const originalTransactionId = transaction.originalTransactionId

  // Nunca confia no notificationType sozinho — sempre re-busca o estado
  // real na API antes de gravar (mesma filosofia do stripe-webhook.js e do
  // api/google-play-rtdn.js).
  let statusResponse
  try {
    statusResponse = await getSubscriptionStatuses(originalTransactionId)
  } catch (err) {
    console.error('Failed to re-fetch Apple subscription for notification:', err.message)
    return res.status(500).json({ error: 'refetch_failed' })
  }
  const rawStatus = statusResponse?.data?.[0]?.lastTransactions?.[0]?.status
  const status = mapAppleSubscriptionState(rawStatus)
  const currentPeriodEnd = transaction.expiresDate ? new Date(transaction.expiresDate).toISOString() : null

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('apple_original_transaction_id', originalTransactionId)
    .maybeSingle()

  if (findErr) {
    console.error('Failed to look up subscription for Apple notification:', findErr.message)
    return res.status(500).json({ error: 'lookup_failed' })
  }
  if (!existing) {
    console.warn('No subscription row found for Apple original transaction, skipping update')
    return res.status(200).json({ received: true })
  }

  const { error: updateErr } = await supabaseAdmin
    .from('subscriptions')
    .update({ status, current_period_end: currentPeriodEnd, updated_at: new Date().toISOString() })
    .eq('apple_original_transaction_id', originalTransactionId)

  if (updateErr) {
    console.error('Failed to update subscription from Apple notification:', updateErr.message)
    return res.status(500).json({ error: 'update_failed' })
  }

  return res.status(200).json({ received: true })
}
