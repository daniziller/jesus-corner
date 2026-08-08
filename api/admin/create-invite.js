// Cria um convite de acesso grátis vitalício ou desconto (%) pra um e-mail
// específico, e manda o e-mail explicando o benefício + o código.
//
// Desconto reaproveita o suporte nativo do Stripe a código promocional que
// já existe no checkout (allow_promotion_codes:true em
// api/create-checkout-session.js) — cria um Coupon + um Promotion Code
// customizado (o mesmo texto salvo em `code`), resgatável tanto direto na
// tela do Stripe quanto pelo campo "tenho um código" do app (ver
// api/redeem-invite-code.js). Acesso grátis não passa pelo Stripe, é
// resolvido só quando a pessoa loga/resgata (ver api/apply-pending-invite.js
// e api/redeem-invite-code.js).
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { sendEmail } from '../_lib/resend.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const APP_URL = 'https://app.jesuscorner.app'

// Sem 0/O/1/I/L — evita confusão na hora de digitar o código manualmente.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function generateCode() {
  let code = ''
  for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

// Convite é conteúdo estruturado (não texto livre como o Aviso geral), então
// não precisa de campo pro admin escrever — só templates fixos PT/EN,
// escolhidos por checkbox (ver InvitesTab em AdminScreen.jsx). Com os dois
// idiomas marcados, o e-mail sai bilíngue: um bloco de texto por idioma,
// código e botão compartilhados (não são texto, não precisam duplicar).
const COPY = {
  pt: {
    heading: (kind, pct) => kind === 'free' ? 'Você ganhou acesso vitalício grátis!' : `Você ganhou ${pct}% de desconto!`,
    body: (kind, pct, duration) => kind === 'free'
      ? "Alguém do Jesus' Corner liberou acesso completo e grátis pra sempre na sua conta. Basta entrar no app com este e-mail — o acesso já libera sozinho. Se preferir, também dá pra digitar o código abaixo em qualquer conta, em Perfil → Minha assinatura."
      : `Alguém do Jesus' Corner liberou ${pct}% de desconto ${duration === 'forever' ? 'em toda a sua assinatura' : 'no seu primeiro pagamento'}. Use o código abaixo na tela de assinatura (ou digite direto no checkout do Stripe).`,
    cta: "Abrir o Jesus' Corner",
    subject: (kind, pct) => kind === 'free' ? "Você ganhou acesso vitalício grátis" : `Você ganhou ${pct}% de desconto`,
  },
  en: {
    heading: (kind, pct) => kind === 'free' ? "You've received free lifetime access!" : `You've received ${pct}% off!`,
    body: (kind, pct, duration) => kind === 'free'
      ? "Someone from Jesus' Corner unlocked full, free access forever on your account. Just log into the app with this email — access unlocks automatically. You can also enter the code below on any account, under Profile → My subscription."
      : `Someone from Jesus' Corner unlocked ${pct}% off ${duration === 'forever' ? 'your entire subscription' : 'your first payment'}. Use the code below on the subscription screen (or enter it directly at Stripe checkout).`,
    cta: "Open Jesus' Corner",
    subject: (kind, pct) => kind === 'free' ? "You've received free lifetime access" : `You've received ${pct}% off`,
  },
}

function buildInviteHtml({ kind, discountPercent, discountDuration, code, languages }) {
  const sections = languages.map((lang, i) => {
    const c = COPY[lang]
    const topPad = i === 0 ? '' : 'border-top:1px solid #F5F5F5;margin-top:20px;padding-top:20px;'
    return `<div style="${topPad}">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#121212;line-height:1.3;">${c.heading(kind, discountPercent)}</h1>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#525252;">${c.body(kind, discountPercent, discountDuration)}</p>
    </div>`
  }).join('')
  const ctaLabel = languages.map(lang => COPY[lang].cta).join(' / ')

  return `<!doctype html>
<html lang="${languages[0]}">
  <body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;">
          <tr><td style="background:#141414;padding:36px 32px;text-align:center;">
            <img src="${APP_URL}/icons/icon-192.png" width="56" height="56" style="border-radius:14px;display:block;margin:0 auto 12px;" alt="Jesus' Corner" />
            <div style="font-size:18px;font-weight:900;letter-spacing:0.5px;">
              <span style="color:#ffffff;">JESUS'</span> <span style="color:#F97316;">CORNER</span>
            </div>
          </td></tr>
          <tr><td style="padding:32px;">
            ${sections}
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px;">
              <tr><td style="background:#F5F5F5;border-radius:12px;padding:16px;text-align:center;">
                <span style="font-size:22px;font-weight:900;letter-spacing:4px;color:#121212;">${code}</span>
              </td></tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
              <tr><td style="background:#F97316;border-radius:14px;">
                <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${ctaLabel} →</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const { email, kind, discountPercent, discountDuration, languages = ['pt', 'en'] } = req.body ?? {}
  const cleanEmail = (email ?? '').trim().toLowerCase()
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'invalid_email' })
  }
  if (kind !== 'free' && kind !== 'discount') {
    return res.status(400).json({ error: 'invalid_kind' })
  }
  if (!Array.isArray(languages) || languages.length === 0 || languages.some(l => l !== 'pt' && l !== 'en')) {
    return res.status(400).json({ error: 'invalid_languages' })
  }
  if (kind === 'discount') {
    const pct = Number(discountPercent)
    if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
      return res.status(400).json({ error: 'invalid_discount_percent' })
    }
    if (discountDuration !== 'once' && discountDuration !== 'forever') {
      return res.status(400).json({ error: 'invalid_discount_duration' })
    }
  }

  const code = generateCode()
  let stripeCouponId = null
  let stripePromotionCodeId = null

  if (kind === 'discount') {
    try {
      const coupon = await stripe.coupons.create({
        percent_off: Number(discountPercent),
        duration: discountDuration,
      })
      // Versão atual da API do Stripe aninha a referência ao coupon dentro
      // de `promotion` (não é mais um campo `coupon` de primeiro nível) —
      // ver https://docs.stripe.com/api/promotion_codes/create.
      const promo = await stripe.promotionCodes.create({
        promotion: { type: 'coupon', coupon: coupon.id },
        code,
        max_redemptions: 1,
      })
      stripeCouponId = coupon.id
      stripePromotionCodeId = promo.id
    } catch (err) {
      console.error('Failed to create Stripe coupon/promotion code:', err.message)
      return res.status(502).json({ error: 'stripe_error' })
    }
  }

  const { data: invite, error: insertErr } = await supabaseAdmin
    .from('admin_invites')
    .insert({
      code,
      email: cleanEmail,
      kind,
      discount_percent: kind === 'discount' ? Number(discountPercent) : null,
      discount_duration: kind === 'discount' ? discountDuration : null,
      stripe_coupon_id: stripeCouponId,
      stripe_promotion_code_id: stripePromotionCodeId,
      created_by: caller.id,
    })
    .select('id')
    .single()

  if (insertErr) {
    console.error('Failed to insert admin invite:', insertErr.message)
    return res.status(500).json({ error: 'insert_failed' })
  }

  try {
    const subject = languages.map(lang => COPY[lang].subject(kind, discountPercent)).join(' / ') + " — Jesus' Corner"
    await sendEmail({
      to: cleanEmail,
      subject,
      html: buildInviteHtml({ kind, discountPercent, discountDuration, code, languages }),
    })
  } catch (err) {
    console.error('Failed to send invite email (invite still created):', err.message)
    // Convite já existe e o código funciona mesmo se o e-mail falhar —
    // devolve ok:true com um aviso, em vez de desfazer o que já foi criado.
    return res.status(200).json({ ok: true, id: invite.id, code, emailSent: false })
  }

  return res.status(200).json({ ok: true, id: invite.id, code, emailSent: true })
}
