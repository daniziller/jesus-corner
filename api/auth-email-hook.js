// Custom Send Email Hook do Supabase Auth — substitui o envio padrão dos
// emails de "Confirm signup" e "Reset Password" (que o Supabase manda
// direto da própria infraestrutura, sem passar por aqui) por um envio via
// Resend com o idioma certo por conta.
//
// Por que isso existe: os templates do painel do Supabase são estáticos —
// não dá pra fazer o mesmo truque de IP usado no convite de amigo
// (api/invite-friend.js), porque a chamada que dispara o email
// (signUp()/resetPasswordForEmail()) vai direto do navegador do usuário
// pro Supabase, nunca passa por um Edge Function meu. Em vez de checar IP,
// este hook lê o idioma já salvo em user_metadata.language (gravado no
// cadastro a partir da detecção por IP que já existe em App.jsx) — mais
// confiável do que checar IP de novo, e resolve o mesmo problema.
//
// Configuração necessária no painel do Supabase (Authentication → Hooks):
// adicionar um hook "Send Email", tipo HTTPS, apontando pra
// https://app.jesuscorner.app/api/auth-email-hook — o Supabase gera um
// segredo (formato "v1,whsec_...") que precisa virar a env var
// SEND_EMAIL_HOOK_SECRET no Vercel.
export const config = { runtime: 'edge' }

const RESEND_API_KEY = process.env.RESEND_API_KEY
const HOOK_SECRET = process.env.SEND_EMAIL_HOOK_SECRET
const FROM_EMAIL = process.env.INVITE_FROM_EMAIL || "Jesus' Corner <convite@jesuscorner.app>"
const APP_URL = 'https://app.jesuscorner.app'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL

// Aceita tanto base64 padrão quanto base64url (o segredo do Supabase pode
// vir em qualquer um dos dois, e base64url usa "-"/"_" no lugar de "+"/"/",
// que atob() não entende sozinho).
function base64ToBytes(b64) {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

async function hmacSha256Base64(keyBytes, message) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

// Verificação de assinatura no formato Standard Webhooks (o mesmo que o
// Supabase usa pra todos os seus Auth Hooks) — evita que qualquer um chame
// esse endpoint fingindo ser o Supabase e mande email arbitrário em nome
// do app.
async function verifyWebhookSignature(rawBody, headers) {
  if (!HOOK_SECRET) return false
  const id = headers.get('webhook-id')
  const timestamp = headers.get('webhook-timestamp')
  const signatureHeader = headers.get('webhook-signature')
  if (!id || !timestamp || !signatureHeader) return false

  const ageMs = Date.now() - Number(timestamp) * 1000
  if (!Number.isFinite(ageMs) || Math.abs(ageMs) > 5 * 60 * 1000) return false

  // Remove o prefixo "v1,whsec_" procurando a substring exata, em vez de
  // fazer split("_") — o payload base64 em si pode conter "_" (variante
  // base64url), e um split ingênuo cortaria o segredo no lugar errado.
  const prefix = 'whsec_'
  const prefixIndex = HOOK_SECRET.indexOf(prefix)
  const secretB64 = prefixIndex === -1 ? HOOK_SECRET : HOOK_SECRET.slice(prefixIndex + prefix.length)
  const keyBytes = base64ToBytes(secretB64)
  const expected = await hmacSha256Base64(keyBytes, `${id}.${timestamp}.${rawBody}`)

  return signatureHeader.split(' ').some(part => {
    const sig = part.includes(',') ? part.split(',')[1] : part
    return sig === expected
  })
}

const COPY = {
  pt: {
    signup: {
      subject: token => `Confirme seu email — ${token} · Jesus' Corner`,
      heading: 'Confirme seu email',
      body: 'Use o código abaixo pra confirmar sua conta e começar sua jornada de leitura bíblica.',
      cta: 'Ou confirme com um clique →',
      note: 'Esse código expira em 1 hora. Não compartilhe com ninguém.',
    },
    recovery: {
      subject: token => `Redefinir senha — ${token} · Jesus' Corner`,
      heading: 'Redefinir senha',
      body: 'Use o código abaixo pra criar uma nova senha da sua conta.',
      cta: 'Ou redefina com um clique →',
      note: 'Esse código expira em 1 hora. Se você não pediu essa redefinição, ignore este email — sua senha continua a mesma.',
    },
    default: {
      subject: token => `Seu código — ${token} · Jesus' Corner`,
      heading: 'Seu código de verificação',
      body: 'Use o código abaixo pra continuar.',
      cta: 'Ou continue com um clique →',
      note: 'Esse código expira em 1 hora.',
    },
  },
  en: {
    signup: {
      subject: token => `Confirm your email — ${token} · Jesus' Corner`,
      heading: 'Confirm your email',
      body: 'Use the code below to confirm your account and start your Bible reading journey.',
      cta: 'Or confirm with one click →',
      note: "This code expires in 1 hour. Don't share it with anyone.",
    },
    recovery: {
      subject: token => `Reset your password — ${token} · Jesus' Corner`,
      heading: 'Reset your password',
      body: 'Use the code below to create a new password for your account.',
      cta: 'Or reset with one click →',
      note: "This code expires in 1 hour. If you didn't request this, you can safely ignore this email.",
    },
    default: {
      subject: token => `Your code — ${token} · Jesus' Corner`,
      heading: 'Your verification code',
      body: 'Use the code below to continue.',
      cta: 'Or continue with one click →',
      note: 'This code expires in 1 hour.',
    },
  },
}

// A URL de confirmação precisa apontar pro endpoint /auth/v1/verify do
// PRÓPRIO Supabase (não pro app) — é o Supabase quem valida o token_hash e
// só então redireciona pro app. site_url no payload é a "Site URL" do
// projeto (app.jesuscorner.app), não a URL do Supabase, por isso usa
// SUPABASE_URL aqui, não site_url. O nome do parâmetro é "token" mesmo
// recebendo o valor de token_hash — convenção do endpoint /verify do
// Supabase, não um erro de digitação.
function buildConfirmationUrl({ token_hash, redirect_to, email_action_type }) {
  const params = new URLSearchParams({ token: token_hash, type: email_action_type, redirect_to: redirect_to || APP_URL })
  return `${SUPABASE_URL}/auth/v1/verify?${params.toString()}`
}

function buildEmailHtml(lang, actionType, token, confirmationUrl) {
  const c = (COPY[lang] ?? COPY.pt)[actionType] ?? (COPY[lang] ?? COPY.pt).default
  return `<!doctype html>
<html lang="${lang}">
  <body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#F5F5F5;line-height:1px;max-height:0;overflow:hidden;">${c.heading}: ${token}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;">
          <tr><td style="background:#141414;padding:36px 32px;text-align:center;">
            <img src="${APP_URL}/icons/icon-192.png" width="56" height="56" style="border-radius:14px;display:block;margin:0 auto 12px;" alt="Jesus' Corner" />
            <div style="font-size:18px;font-weight:900;letter-spacing:0.5px;">
              <span style="color:#ffffff;">JESUS'</span> <span style="color:#F97316;">CORNER</span>
            </div>
          </td></tr>
          <tr><td style="padding:32px 32px 8px;">
            <h1 style="margin:0 0 10px;font-size:20px;font-weight:800;color:#121212;line-height:1.3;">${c.heading}</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#525252;">${c.body}</p>
          </td></tr>
          <tr><td style="padding:0 32px 8px;text-align:center;">
            <div style="background:#FFF7ED;border:1.5px dashed #F97316;border-radius:16px;padding:22px 16px;">
              <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#EA580C;font-family:'Courier New',monospace;">${token}</div>
            </div>
            <p style="margin:14px 0 0;font-size:12px;color:#A3A3A3;">${c.note}</p>
          </td></tr>
          <tr><td style="padding:24px 32px 32px;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr><td style="background:#F97316;border-radius:14px;">
                <a href="${confirmationUrl}" style="display:inline-block;padding:13px 26px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;">${c.cta}</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 })
  }
  if (!RESEND_API_KEY || !HOOK_SECRET) {
    console.error('[auth-email-hook] missing RESEND_API_KEY or SEND_EMAIL_HOOK_SECRET')
    return new Response(JSON.stringify({ error: 'not_configured' }), { status: 500 })
  }

  const rawBody = await request.text()
  const validSignature = await verifyWebhookSignature(rawBody, request.headers).catch(err => {
    console.error('[auth-email-hook] signature verification threw:', err.message)
    return false
  })
  if (!validSignature) {
    return new Response(JSON.stringify({ error: 'invalid_signature' }), { status: 401 })
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
  }

  const user = payload?.user
  const emailData = payload?.email_data
  const to = user?.email
  const token = emailData?.token
  if (!to || !token) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400 })
  }

  const lang = user?.user_metadata?.language === 'en' ? 'en' : 'pt'
  const actionType = ['signup', 'recovery'].includes(emailData?.email_action_type) ? emailData.email_action_type : 'default'
  const confirmationUrl = buildConfirmationUrl(emailData)
  const copyForSubject = (COPY[lang] ?? COPY.pt)[actionType] ?? (COPY[lang] ?? COPY.pt).default

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: copyForSubject.subject(token),
      html: buildEmailHtml(lang, actionType, token, confirmationUrl),
    }),
  })

  if (!emailRes.ok) {
    console.error('[auth-email-hook] Resend error:', await emailRes.text().catch(() => ''))
    return new Response(JSON.stringify({ error: 'send_failed' }), { status: 500 })
  }

  return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
}
