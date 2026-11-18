// Adicionar amigo por e-mail (src/friends/friendsStore.js). Revisão de
// LGPD, 2026-11-18: o app não descobre mais se um e-mail tem conta (num
// app bíblico isso revela convicção religiosa). Este endpoint chama
// request_friend_by_email (migração 0086) com o service role: se o e-mail
// tem conta, o pedido de amizade é gravado ali mesmo; se não tem, vai o
// convite por e-mail. Para quem pediu, a resposta é a mesma nos dois casos.
// Teto de 20 tentativas por dia por pessoa. Roda como Edge
// Function pra ter acesso direto ao header de geolocalização da Vercel
// (x-vercel-ip-country) — o idioma do email é o do IP de quem está
// convidando (a pessoa logada fazendo a chamada), não do convidado, que
// ainda nem visitou o app.
import { emailFooterLinksHtml } from './_lib/emailFooter.js'

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.INVITE_FROM_EMAIL || "Jesus' Corner <convite@jesuscorner.app>"
const APP_URL = 'https://app.jesuscorner.app'

const COPY = {
  pt: {
    subject: name => `${name} convidou você pro Jesus' Corner`,
    preheader: 'Leitura guiada, oração estruturada e uma comunidade pra crescer junto — no seu tempo.',
    heading: name => `${name} quer ler a Bíblia com você`,
    body: "O Jesus' Corner é um app de leitura bíblica guiada, com oração estruturada (método ACTS) e uma Comunidade onde dá pra criar grupos de leitura, propor desafios com amigos e acompanhar o progresso de todo mundo.",
    cta: 'Criar minha conta',
    footer: "Você recebeu esse email porque alguém te adicionou como amigo no Jesus' Corner.",
    defaultName: 'Um amigo',
  },
  en: {
    subject: name => `${name} invited you to Jesus' Corner`,
    preheader: 'Guided reading, structured prayer, and a community to grow together — at your own pace.',
    heading: name => `${name} wants to read the Bible with you`,
    body: "Jesus' Corner is a guided Bible reading app with structured prayer (the ACTS method) and a Community where you can create reading groups, propose challenges with friends, and follow everyone's progress.",
    cta: 'Create my account',
    footer: "You're receiving this email because someone added you as a friend on Jesus' Corner.",
    defaultName: 'A friend',
  },
}

function buildEmailHtml(lang, inviterName) {
  const c = COPY[lang]
  return `<!doctype html>
<html lang="${lang}">
  <body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#F5F5F5;line-height:1px;max-height:0;overflow:hidden;">${c.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;">
          <tr><td style="background:#141414;padding:36px 32px;text-align:center;">
            <img src="${APP_URL}/icons/icon-192.png" width="56" height="56" style="border-radius:14px;display:block;margin:0 auto 12px;" alt="Jesus' Corner" />
            <div style="font-size:18px;font-weight:900;letter-spacing:0.5px;">
              <span style="color:#ffffff;">JESUS'</span> <span style="color:#9D4300;">CORNER</span>
            </div>
          </td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#121212;line-height:1.3;">${c.heading(inviterName)}</h1>
            <p style="margin:0 0 26px;font-size:14px;line-height:1.6;color:#525252;">${c.body}</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr><td style="background:#9D4300;border-radius:14px;">
                <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${c.cta} →</a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:0 32px 28px;border-top:1px solid #F5F5F5;text-align:center;">
            ${emailFooterLinksHtml()}
            <p style="margin:10px 0 0;font-size:11px;color:#A3A3A3;line-height:1.5;">${c.footer}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 })
  }
  // Valida a sessão de quem chamou via o próprio Supabase Auth — sem isso,
  // qualquer um (sem estar logado no app) poderia usar esse endpoint pra
  // mandar email pra qualquer lugar.
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader },
  })
  if (!userRes.ok) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }
  const caller = await userRes.json()

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
  }
  const email = (body.email ?? '').trim().toLowerCase()
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400 })
  }

  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

  // Procura e, se achar, grava o pedido — tudo no banco, com o service role.
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/request_friend_by_email`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_caller: caller.id, p_email: email }),
  })
  if (!rpcRes.ok) {
    console.error('invite-friend: request_friend_by_email falhou:', rpcRes.status)
    return json({ error: 'request_failed' }, 502)
  }
  const outcome = await rpcRes.json()
  if (outcome === 'rate_limited') return json({ error: 'rate_limited' }, 429)
  if (outcome === 'self') return json({ error: 'self' }, 400)
  if (outcome === 'invalid') return json({ error: 'invalid_email' }, 400)
  // Tem conta (pedido gravado, ou já existia): mesma resposta de "convite
  // enviado", sem e-mail nenhum.
  if (outcome !== 'not_found') return json({ status: 'ok' })
  if (!RESEND_API_KEY) {
    // Sem o serviço de e-mail configurado, responde igual (senão a falha
    // contaria que o e-mail não tem conta) — e avisa no log.
    console.error('invite-friend: RESEND_API_KEY ausente; convite não enviado')
    return json({ status: 'ok' })
  }

  const country = request.headers.get('x-vercel-ip-country')
  const lang = country === 'BR' ? 'pt' : 'en'
  // Escapa HTML — o nome vem de user_metadata (editável pelo próprio
  // usuário) e entrava cru no <h1> do e-mail: dava pra mandar HTML
  // arbitrário (links/botões falsos) do remetente oficial pra qualquer
  // endereço (varredura 2026-10-25).
  const rawName = caller.user_metadata?.name?.trim().slice(0, 80) || COPY[lang].defaultName
  const inviterName = rawName.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: COPY[lang].subject(inviterName),
      html: buildEmailHtml(lang, inviterName),
    }),
  })

  if (!emailRes.ok) {
    // Mesmo motivo: a falha só acontece quando não há conta — responder
    // erro aqui revelaria isso. Fica no log.
    console.error('invite-friend: Resend falhou:', emailRes.status)
  }

  return json({ status: 'ok' })
}
