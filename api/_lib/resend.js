// Wrapper fino sobre a mesma chamada Resend já usada em
// api/invite-friend.js e api/auth-email-hook.js — só pros endpoints novos
// em api/admin/*.js. Não mexe nos dois arquivos existentes, que continuam
// com seu fetch direto.
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.INVITE_FROM_EMAIL || "Jesus' Corner <convite@jesuscorner.app>"

export async function sendEmail({ to, subject, html, from = FROM_EMAIL }) {
  if (!RESEND_API_KEY) throw new Error('email_service_not_configured')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    console.error('Resend error:', await res.text().catch(() => ''))
    throw new Error(`resend_failed_${res.status}`)
  }
  return res.json()
}
