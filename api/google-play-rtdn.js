// Endpoint de push do Cloud Pub/Sub — recebe as Real-time Developer
// Notifications do Google Play sempre que uma assinatura muda de estado
// (renovação, cancelamento, expiração, etc). Papel equivalente ao
// stripe-webhook.js, mas o transporte é bem diferente: aqui é JSON normal
// entregue pelo Pub/Sub (sem HMAC de corpo bruto), então — diferente do
// stripe-webhook.js — NÃO precisa desligar o bodyParser padrão do Vercel.
//
// Autenticação: secret compartilhado via query string (?token=), checado
// contra GOOGLE_PLAY_RTDN_SECRET. Mais simples que validar o cabeçalho
// OIDC assinado que o Pub/Sub também manda — considerar migrar pra isso
// depois, é a opção mais correta.
import { createClient } from '@supabase/supabase-js'
import { getSubscriptionPurchase, mapPlaySubscriptionState } from './_lib/googlePlay.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (req.query?.token !== process.env.GOOGLE_PLAY_RTDN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  let notification
  try {
    const raw = Buffer.from(req.body?.message?.data ?? '', 'base64').toString('utf8')
    notification = JSON.parse(raw)
  } catch (err) {
    console.error('Failed to decode Play RTDN payload:', err.message)
    // 200 mesmo em payload ilegível — não é algo que um retry do Pub/Sub
    // vai resolver.
    return res.status(200).json({ received: true })
  }

  // Notificações de teste (enviadas pelo botão "testar" do Play Console) e
  // de produto avulso não têm token de assinatura — só confirma recebimento.
  const purchaseToken = notification.subscriptionNotification?.purchaseToken
  if (!purchaseToken) {
    return res.status(200).json({ received: true })
  }

  // Nunca confia no tipo da notificação sozinho — sempre re-busca o estado
  // real na API antes de gravar (mesma filosofia do stripe-webhook.js, que
  // sempre re-busca via stripe.subscriptions.retrieve).
  let purchase
  try {
    purchase = await getSubscriptionPurchase(purchaseToken)
  } catch (err) {
    console.error('Failed to re-fetch Play subscription for RTDN:', err.message)
    // Erro transitório de verdade (API fora do ar, etc) — deixa o Pub/Sub
    // tentar de novo.
    return res.status(500).json({ error: 'refetch_failed' })
  }

  const status = mapPlaySubscriptionState(purchase.subscriptionState)
  const currentPeriodEnd = purchase.lineItems?.[0]?.expiryTime ?? null

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('google_play_purchase_token', purchaseToken)
    .maybeSingle()

  if (findErr) {
    console.error('Failed to look up subscription for Play RTDN:', findErr.message)
    return res.status(500).json({ error: 'lookup_failed' })
  }

  // Sem linha nenhuma pra esse token — pode ser uma compra que nunca passou
  // por api/verify-google-play-purchase.js (ex: teste manual no Play
  // Console). Não tem user_id pra vincular sem isso, então só loga e
  // confirma recebimento — não é um erro que valha a pena o Pub/Sub tentar
  // de novo.
  if (!existing) {
    console.warn('No subscription row found for Play purchase token, skipping RTDN update')
    return res.status(200).json({ received: true })
  }

  const { error: updateErr } = await supabaseAdmin
    .from('subscriptions')
    .update({ status, current_period_end: currentPeriodEnd, updated_at: new Date().toISOString() })
    .eq('google_play_purchase_token', purchaseToken)

  if (updateErr) {
    console.error('Failed to update subscription from Play RTDN:', updateErr.message)
    return res.status(500).json({ error: 'update_failed' })
  }

  return res.status(200).json({ received: true })
}
