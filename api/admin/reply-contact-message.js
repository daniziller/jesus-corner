// Responde por email uma mensagem do "Fale Conosco" e marca como respondida
// — só marca replied_at/admin_reply DEPOIS do Resend confirmar o envio, pra
// uma falha transitória não fazer a mensagem sumir da fila de pendentes.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { sendEmail } from '../_lib/resend.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const APP_URL = 'https://app.jesuscorner.app'

function buildReplyHtml(name, replyBody) {
  return `<!doctype html>
<html lang="pt-BR">
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
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#121212;line-height:1.3;">Oi, ${name}</h1>
            <p style="margin:0 0 26px;font-size:14px;line-height:1.6;color:#525252;white-space:pre-wrap;">${replyBody}</p>
          </td></tr>
          <tr><td style="padding:0 32px 28px;border-top:1px solid #F5F5F5;">
            <p style="margin:20px 0 0;font-size:11px;color:#A3A3A3;line-height:1.5;">Essa é uma resposta à sua mensagem enviada pelo formulário "Fale Conosco" do Jesus' Corner.</p>
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

  const { id, replyBody } = req.body ?? {}
  if (!id || !replyBody?.trim()) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  const { data: message, error: fetchErr } = await supabaseAdmin
    .from('contact_messages')
    .select('id, name, email')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !message) {
    return res.status(404).json({ error: 'not_found' })
  }

  try {
    await sendEmail({
      to: message.email,
      subject: "Resposta — Jesus' Corner",
      html: buildReplyHtml(message.name, replyBody.trim()),
    })
  } catch (err) {
    console.error('Failed to send contact-message reply:', err.message)
    return res.status(502).json({ error: 'send_failed' })
  }

  const { error: updateErr } = await supabaseAdmin
    .from('contact_messages')
    .update({ replied_at: new Date().toISOString(), replied_by: caller.id, admin_reply: replyBody.trim() })
    .eq('id', id)

  if (updateErr) {
    console.error('Failed to mark contact message as replied:', updateErr.message)
    return res.status(500).json({ error: 'update_failed' })
  }

  return res.status(200).json({ ok: true })
}
