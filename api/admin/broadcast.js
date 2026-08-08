// Manda um aviso — pra todo mundo, um usuário específico, ou um segmento
// (filtros combináveis: assinatura, idioma, grupo de leitura) — sempre como
// notificação in-app (tabela notifications, sino), e opcionalmente também
// por email. Título e corpo em PT e EN (o admin preenche os dois), escolhido
// por usuário via user_metadata.language (mesmo campo/checagem de
// api/send-contribution-reminders.js).
//
// dryRun: true devolve só a contagem de destinatários (recipients), sem
// gravar notificação nem mandar email — usado pelo botão "Verificar
// destinatários" no client antes de disparar de verdade.
//
// Email roda em lotes de concorrência limitada, não tudo de uma vez, pra
// não estourar rate limit do Resend nem o tempo de execução da function.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { sendEmail } from '../_lib/resend.js'
import { listAllUsers } from '../_lib/adminUsers.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOTIFICATION_TYPE = 'admin_broadcast'
const NOTIFICATION_BATCH_SIZE = 500
const EMAIL_CONCURRENCY = 15
const APP_URL = 'https://app.jesuscorner.app'

function intersect(a, b) {
  return new Set([...a].filter(x => b.has(x)))
}

// Devolve o set de user ids que atendem ao filtro escolhido. 'all' e 'user'
// resolvem sem tocar o banco; 'segment' cruza (AND) cada dimensão marcada
// contra a lista completa de usuários — dimensões não marcadas (null) não
// restringem nada.
async function resolveRecipientIds({ recipientMode, recipientUserId, segment }, allUsers) {
  if (recipientMode === 'user') {
    return recipientUserId ? new Set([recipientUserId]) : new Set()
  }
  if (recipientMode !== 'segment') {
    return new Set(allUsers.map(u => u.id))
  }

  let allowed = new Set(allUsers.map(u => u.id))

  if (segment?.language) {
    const matchLang = new Set(
      allUsers
        .filter(u => (u.user_metadata?.language === 'en' ? 'en' : 'pt') === segment.language)
        .map(u => u.id)
    )
    allowed = intersect(allowed, matchLang)
  }

  if (segment?.accessType || segment?.plan || segment?.currency) {
    let query = supabaseAdmin.from('subscriptions').select('user_id')
    if (segment.accessType) query = query.eq('access_type', segment.accessType)
    if (segment.plan) query = query.eq('plan', segment.plan)
    if (segment.currency) query = query.eq('currency', segment.currency)
    const { data, error } = await query
    if (error) throw error
    allowed = intersect(allowed, new Set((data ?? []).map(r => r.user_id)))
  }

  if (segment?.groupId) {
    const { data, error } = await supabaseAdmin
      .from('reading_group_members')
      .select('user_id')
      .eq('group_id', segment.groupId)
      .eq('status', 'joined')
    if (error) throw error
    allowed = intersect(allowed, new Set((data ?? []).map(r => r.user_id)))
  }

  return allowed
}

function buildBroadcastHtml(title, body) {
  return `<!doctype html>
<html>
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
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#121212;line-height:1.3;">${title}</h1>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#525252;white-space:pre-wrap;">${body}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

async function sendEmailBatches(recipients) {
  let emailsSent = 0
  let emailsFailed = 0
  for (let i = 0; i < recipients.length; i += EMAIL_CONCURRENCY) {
    const chunk = recipients.slice(i, i + EMAIL_CONCURRENCY)
    const results = await Promise.allSettled(
      chunk.map(r => sendEmail({ to: r.email, subject: r.title, html: buildBroadcastHtml(r.title, r.body) }))
    )
    for (const result of results) {
      if (result.status === 'fulfilled') emailsSent++
      else emailsFailed++
    }
  }
  return { emailsSent, emailsFailed }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const {
    titlePt, titleEn, bodyPt, bodyEn, sendEmail: shouldSendEmail,
    recipientMode = 'all', recipientUserId = null, segment = null,
    dryRun = false,
  } = req.body ?? {}

  if (!titlePt?.trim() || !titleEn?.trim() || !bodyPt?.trim() || !bodyEn?.trim()) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  if (recipientMode === 'user' && !recipientUserId) {
    return res.status(400).json({ error: 'missing_recipient_user' })
  }

  let users
  try {
    users = await listAllUsers()
  } catch (err) {
    console.error('Failed to list users for broadcast:', err.message)
    return res.status(500).json({ error: 'list_users_failed' })
  }

  let allowedIds
  try {
    allowedIds = await resolveRecipientIds({ recipientMode, recipientUserId, segment }, users)
  } catch (err) {
    console.error('Failed to resolve broadcast recipients:', err.message)
    return res.status(500).json({ error: 'resolve_recipients_failed' })
  }

  const recipients = users
    .filter(u => allowedIds.has(u.id))
    .map(u => {
      const lang = u.user_metadata?.language === 'en' ? 'en' : 'pt'
      return {
        id: u.id,
        email: u.email,
        title: lang === 'en' ? titleEn.trim() : titlePt.trim(),
        body: lang === 'en' ? bodyEn.trim() : bodyPt.trim(),
      }
    })

  if (dryRun) {
    return res.status(200).json({ ok: true, dryRun: true, recipients: recipients.length })
  }

  for (let i = 0; i < recipients.length; i += NOTIFICATION_BATCH_SIZE) {
    const chunk = recipients.slice(i, i + NOTIFICATION_BATCH_SIZE)
    const { error } = await supabaseAdmin.from('notifications').insert(
      chunk.map(r => ({ user_id: r.id, type: NOTIFICATION_TYPE, title: r.title, body: r.body }))
    )
    if (error) {
      console.error('Failed to insert broadcast notifications batch:', error.message)
      return res.status(500).json({ error: 'notification_insert_failed' })
    }
  }

  let emailsSent = 0
  let emailsFailed = 0
  if (shouldSendEmail) {
    const emailable = recipients.filter(r => r.email)
    ;({ emailsSent, emailsFailed } = await sendEmailBatches(emailable))
  }

  return res.status(200).json({ ok: true, recipients: recipients.length, emailsSent, emailsFailed })
}
