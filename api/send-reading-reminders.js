// Cron job (ver vercel.json) — manda o lembrete de leitura via push (Web
// Push) pra quem ativou o toggle "Lembretes" em Perfil (ver
// src/notifications/pushStore.js).
//
// Cada inscrição guarda o fuso horário de quando a pessoa ativou (ver
// migration 0027), e a função só manda pra quem está às 07:00 num dia de
// semana NAQUELE fuso — mas o cron em si roda só 1x por dia, às 10:00 UTC
// (07:00 em America/Sao_Paulo, sem horário de verão desde 2019), porque o
// plano Hobby da Vercel não permite cron mais frequente que 1x/dia. Na
// prática isso entrega certinho pra quem está no fuso de Brasília (o grosso
// do público) e não entrega perto das 07:00 local pra quem está em outro
// fuso. Pra corrigir isso pra todo mundo, troque o "schedule" abaixo pra
// "0 * * * *" (1x por hora) — exige upgrade pro plano Pro da Vercel.
//
// Só o Vercel Cron deve conseguir chamar isso — ele manda automaticamente
// `Authorization: Bearer $CRON_SECRET` quando essa env var está configurada
// no projeto (ver https://vercel.com/docs/cron-jobs/manage-cron-jobs).
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const TARGET_HOUR = 7
const WEEKDAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])

const COPY = {
  pt: {
    title: "Hora de ler a Bíblia 📖",
    body: 'Seu momento com Deus está te esperando — alguns minutos já fazem diferença.',
  },
  en: {
    title: 'Time for your Bible reading 📖',
    body: 'Your moment with God is waiting — a few minutes already make a difference.',
  },
}

// true se, agora, são 07:00 num dia de semana NESSE fuso.
function isReminderTimeIn(timezone, now) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
    }).formatToParts(now)
    const hour = Number(parts.find(p => p.type === 'hour')?.value)
    const weekday = parts.find(p => p.type === 'weekday')?.value
    return hour === TARGET_HOUR && WEEKDAYS.has(weekday)
  } catch {
    // Fuso inválido/desconhecido (não deveria acontecer — vem de
    // Intl.DateTimeFormat().resolvedOptions().timeZone no client) — não
    // manda em vez de derrubar o cron inteiro.
    return false
  }
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { data: subs, error: subsErr } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, timezone')

  if (subsErr) {
    console.error('Failed to load push subscriptions:', subsErr.message)
    return res.status(500).json({ error: 'query_failed' })
  }

  const now = new Date()
  const due = (subs ?? []).filter(s => isReminderTimeIn(s.timezone, now))

  // Uma pessoa pode ter mais de um dispositivo — busca o idioma 1x por
  // usuário, não 1x por inscrição.
  const langByUser = new Map()
  for (const userId of new Set(due.map(s => s.user_id))) {
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userErr || !userData?.user) {
      console.error('Failed to load user for reminder', userId, userErr?.message)
      continue
    }
    langByUser.set(userId, userData.user.user_metadata?.language === 'en' ? 'en' : 'pt')
  }

  let sent = 0
  let failed = 0
  let removed = 0

  for (const sub of due) {
    const lang = langByUser.get(sub.user_id)
    if (!lang) continue
    const copy = COPY[lang]

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: copy.title, body: copy.body, url: '/' })
      )
      sent++
    } catch (err) {
      failed++
      // 404/410 = inscrição não existe mais do lado do navegador (desinstalou
      // o app, limpou dados, etc.) — apaga pra parar de tentar pra sempre.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
        removed++
      } else {
        console.error('Failed to send push to', sub.id, err.message)
      }
    }
  }

  return res.status(200).json({ ok: true, checked: subs?.length ?? 0, due: due.length, sent, failed, removed })
}
