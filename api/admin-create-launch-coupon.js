// TEMPORARY admin endpoint — creates the Stripe launch-discount coupon and
// promotion code using STRIPE_SECRET_KEY already configured in Vercel's env
// (so the secret never has to be pulled to a local shell). Restricted to
// ADMIN_EMAILS, callable only by the authenticated caller themselves.
// Delete this file after the coupon has been created and confirmed.
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['daniziller@hotmail.com']
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  annual: process.env.STRIPE_PRICE_ANNUAL,
}

const REDEEM_BY = 1786244399 // 2026-08-08 23:59:59 -03:00
const CODE = 'LANCAMENTO20'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })

  const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (callerErr || !callerData?.user || !ADMIN_EMAILS.includes(callerData.user.email)) {
    return res.status(403).json({ error: 'forbidden' })
  }

  try {
    const [monthlyPrice, annualPrice] = await Promise.all([
      stripe.prices.retrieve(PRICE_IDS.monthly),
      stripe.prices.retrieve(PRICE_IDS.annual),
    ])
    const productIds = [...new Set([monthlyPrice.product, annualPrice.product])]

    const coupon = await stripe.coupons.create({
      percent_off: 20,
      duration: 'once',
      name: 'Lançamento Jesus\' Corner',
      applies_to: { products: productIds },
      redeem_by: REDEEM_BY,
    })

    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: CODE,
      expires_at: REDEEM_BY,
    })

    return res.status(200).json({
      ok: true,
      mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'live' : 'test',
      couponId: coupon.id,
      promotionCodeId: promotionCode.id,
      code: promotionCode.code,
      percentOff: coupon.percent_off,
      duration: coupon.duration,
      expiresAt: REDEEM_BY,
      productIds,
    })
  } catch (err) {
    console.error('admin-create-launch-coupon error:', err.message)
    return res.status(500).json({ error: 'coupon_creation_failed', detail: err.message })
  }
}
