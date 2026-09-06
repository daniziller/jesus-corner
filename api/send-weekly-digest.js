// Cron job (ver vercel.json) — roda domingo às 20h (aproximado; ver nota de
// fuso abaixo) e monta o Resumo semanal (31a/31b/31c, Bloco 13) da semana
// que acabou de fechar (segunda a domingo) pra quem teve QUALQUER atividade
// real nela. Chega como notificação in-app (sino), push (Web Push) e email
// — e o resultado fica gravado em user_data.weekly_summaries pras telas
// 31a/31b/31c lerem depois, sem recalcular nem chamar IA de novo (mesmo
// resumo em todo lugar, uma chamada de IA por pessoa por semana).
//
// Reescrito no Bloco 13: até aqui a "semana" era RECONSTRUÍDA combinando
// daily_routine com anotações datadas, porque nada tinha data granular de
// verdade. Desde o Bloco 7, session_seconds e chapters_read têm data real
// por linha — a semana agora é uma consulta direta por intervalo de data,
// não mais uma aproximação.
//
// Aproximação de fuso que continua aceita (mesmo espírito documentado
// antes): o cron roda uma vez só, num horário fixo em UTC — domingo 23h UTC
// ≈ 20h em Brasília (que não observa horário de verão desde 2019). Não
// existe fuso por conta no app hoje (só por dispositivo, nas inscrições de
// push), então isso é aproximado pra quem não está em Brasília; a "semana"
// (segunda a domingo) usada nas consultas também é contada no fuso do
// servidor (UTC), não no fuso local de cada pessoa.
//
// Semana em branco (nenhuma sessão, nenhum capítulo, nenhuma nota — ver
// isBlankWeek) não gera resumo nenhum: sem chamada de IA, sem notificação,
// sem entrada no histórico. Isso é o item 15 do PROMPT: "semana em branco
// não gera texto motivacional".
//
// Só o Vercel Cron deve conseguir chamar isso — mesmo padrão de
// autenticação (`Authorization: Bearer $CRON_SECRET`) dos outros crons.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { mondayOf, computeRecentWeeksStatus, DEFAULT_WEEKLY_GOAL_DAYS } from '../src/routine/routineStreak.js'
import { totalsByStep, totalsByDay, averageSessionSeconds } from '../src/metrics/sessionDurationMath.js'
import { weekRangeFor, daysMetForWeek, isBlankWeek, longestDayOf } from '../src/recap/weeklySummaryMath.js'
import { generateWeeklySummaryText } from './_lib/ai.js'
import { sendEmail } from './_lib/resend.js'
import { emailFooterLinksHtml } from './_lib/emailFooter.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

if (process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VITE_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
}

const NOTIFICATION_TYPE = 'weekly_summary'
const APP_URL = 'https://app.jesuscorner.app'
// Quantos resumos guardar por pessoa — alimenta o seletor "Semanas ▾" de
// 31a (Bloco 13 escolheu construir o histórico completo, não só o mais
// recente).
const KEEP_LAST_SUMMARIES = 16

const COPY = {
  pt: {
    notifTitle: 'Sua semana está pronta',
    notifBody: 'O resumo da sua semana já está no app — toque pra ver.',
    emailSubject: 'Seu resumo da semana',
    weekLabel: 'Sua semana em resumo',
    ctaButton: 'Ver o resumo da semana',
  },
  en: {
    notifTitle: 'Your week is ready',
    notifBody: "Your weekly summary is ready in the app — tap to see it.",
    emailSubject: 'Your weekly summary',
    weekLabel: 'Your week in review',
    ctaButton: "See your week's summary",
  },
}

// Reimplementação mínima de parseNoteKey/noteTextOf/noteUpdatedAtOf (ver
// src/notes/notesStore.js) — não importa esse arquivo direto porque ele
// também importa o cliente Supabase do browser (../lib/supabaseClient),
// que não deve rodar em ambiente serverless.
function parseNoteKey(key) {
  if (key === 'application:pinned') return { type: 'unknown' }
  const dailyApplication = key.match(/^application:(\d{4}-\d{2}-\d{2})$/)
  if (dailyApplication) return { type: 'application-phrase', date: dailyApplication[1] }
  const daily = key.match(/^reflection:(\d{4}-\d{2}-\d{2})$/)
  if (daily) return { type: 'daily-reflection', date: daily[1] }
  const bookReflection = key.match(/^(.+):reflection$/)
  if (bookReflection) return { type: 'book-reflection', book: bookReflection[1] }
  const reading = key.match(/^(.+):(\d+)-(\d+)$/)
  if (reading) return { type: 'reading', book: reading[1], chStart: Number(reading[2]), chEnd: Number(reading[3]) }
  return { type: 'unknown' }
}
function noteTextOf(entry) {
  if (entry == null) return ''
  return typeof entry === 'string' ? entry : entry.text ?? ''
}
function noteUpdatedAtOf(entry) {
  return (typeof entry === 'object' && entry?.updatedAt) || null
}
function noteDateFor(parsed, entry) {
  if (parsed.date) return parsed.date
  const updatedAt = noteUpdatedAtOf(entry)
  return updatedAt ? updatedAt.slice(0, 10) : null
}

// Separa as anotações da semana em (1) texto pra IA resumir, (2) até 3
// trechos reais pra mostrar em 31b ("O que você anotou" — guardados junto
// no resumo, não recalculados depois: uma semana passada sempre mostra as
// MESMAS 3 notas, mesmo que a pessoa edite/apague anotações depois), e (3)
// a frase de aplicação da semana (só uma — a mais recente — já que
// applicationPhraseStore.js grava no máximo uma por dia; pega a que tiver
// `fulfilled` mais recente marcado, senão a mais recente sem marcar).
function collectWeekNotes(notes, weekStartKey, weekEndKey) {
  const readingLines = []
  const quotes = []
  const applicationEntries = []

  for (const [key, entry] of Object.entries(notes ?? {})) {
    const parsed = parseNoteKey(key)
    if (parsed.type === 'unknown') continue
    const date = noteDateFor(parsed, entry)
    if (!date || date < weekStartKey || date > weekEndKey) continue
    const text = noteTextOf(entry).trim()
    if (!text) continue

    if (parsed.type === 'application-phrase') {
      applicationEntries.push({ date, text, fulfilled: !!(typeof entry === 'object' && entry?.fulfilled) })
      continue
    }
    let ref = null
    if (parsed.type === 'reading') {
      const range = parsed.chStart === parsed.chEnd ? `${parsed.chStart}` : `${parsed.chStart}–${parsed.chEnd}`
      ref = `${parsed.book} ${range}`
      readingLines.push(`Leu ${ref}: "${text}"`)
    } else if (parsed.type === 'book-reflection') {
      ref = parsed.book
      readingLines.push(`Encerrou ${ref} com esta reflexão: "${text}"`)
    } else if (parsed.type === 'daily-reflection') {
      ref = null
      readingLines.push(`Reflexão do dia ${date}: "${text}"`)
    }
    quotes.push({ date, text, ref })
  }

  quotes.sort((a, b) => b.date.localeCompare(a.date))
  applicationEntries.sort((a, b) => a.date.localeCompare(b.date))
  // "A que ficou" (31b) — a mais recente cumprida, senão a mais recente
  // escrita; o TOTAL/fulfilled de verdade (31a "3 de 4") conta todas as
  // frases da semana, não só esta.
  const application = applicationEntries.find(a => a.fulfilled) ?? applicationEntries[applicationEntries.length - 1] ?? null

  return {
    notesText: readingLines.join('\n'),
    noteQuotes: quotes.slice(0, 3).map(({ date, text, ref }) => ({ date, text, ref })),
    application,
    applicationsFulfilledCount: applicationEntries.filter(a => a.fulfilled).length,
    applicationsTotalCount: applicationEntries.length,
  }
}

// Paginado (500 por página) — select() sem range() no PostgREST/Supabase
// devolve no máximo 1000 linhas por padrão, o que silenciosamente ignoraria
// o resto da base assim que ela crescesse além disso.
async function fetchAllPaged(table, columns, apply) {
  const PAGE = 500
  const rows = []
  for (let from = 0; ; from += PAGE) {
    let q = supabaseAdmin.from(table).select(columns).range(from, from + PAGE - 1)
    if (apply) q = apply(q)
    const { data, error } = await q
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

function groupBy(rows, keyFn) {
  const map = new Map()
  for (const r of rows) {
    const k = keyFn(r)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  }
  return map
}

function buildSummaryHtml({ lang, copy, summaryData }) {
  const { openingParagraph, closingParagraph } = summaryData.summary
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;">
          <tr><td style="background:#141414;padding:36px 32px;text-align:center;">
            <img src="${APP_URL}/icons/icon-192.png" width="56" height="56" style="border-radius:14px;display:block;margin:0 auto 12px;" alt="Jesus' Corner" />
            <div style="font-size:18px;font-weight:900;letter-spacing:0.5px;">
              <span style="color:#ffffff;">JESUS'</span> <span style="color:#9D4300;">CORNER</span>
            </div>
          </td></tr>
          <tr><td style="padding:32px 32px 8px;">
            <h1 style="margin:0 0 14px;font-size:20px;font-weight:800;color:#121212;line-height:1.3;">${copy.weekLabel}</h1>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#525252;">${openingParagraph}</p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:#525252;">${closingParagraph}</p>
          </td></tr>
          <tr><td style="padding:0 32px 28px;">
            <a href="${APP_URL}" style="display:block;text-align:center;background:#9D4300;color:#ffffff;font-size:14px;font-weight:800;padding:14px;border-radius:12px;text-decoration:none;">${copy.ctaButton}</a>
          </td></tr>
          <tr><td style="padding:0 32px 28px;border-top:1px solid #F5F5F5;text-align:center;">
            ${emailFooterLinksHtml()}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  // Roda no próprio domingo à noite (não na segunda seguinte, como o cron
  // antigo) — mondayOf(now) num domingo já devolve a segunda-feira DESTA
  // mesma semana (a que está terminando agora), sem precisar voltar 7 dias.
  // Atividade depois das 20h de domingo (raro, mas existe) fica de fora
  // desta semana — mesma aproximação intencional do horário do próprio job.
  const now = new Date()
  const monday = mondayOf(now)
  const { weekKey, startKey, endKey } = weekRangeFor(monday)
  // Bordas do intervalo em timestamptz (created_at) — endKey + 1 dia,
  // exclusivo, cobre o domingo inteiro até meia-noite.
  const endExclusiveIso = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7).toISOString()
  const startIso = monday.toISOString()

  let userDataRows, sessionRows, chapterRows, intentionRows, memberRows, commentRows, pushSubs, aiChatRows
  try {
    [userDataRows, sessionRows, chapterRows, intentionRows, memberRows, commentRows, pushSubs, aiChatRows] = await Promise.all([
      fetchAllPaged('user_data', 'user_id, plan_id, reading_order, notes, daily_routine, weekly_goal_days, weekly_summaries'),
      fetchAllPaged('session_seconds', 'user_id, data, passo, segundos, created_at', q => q.gte('data', startKey).lte('data', endKey)),
      fetchAllPaged('chapters_read', 'user_id, livro, capitulo, created_at', q => q.gte('created_at', startIso).lt('created_at', endExclusiveIso)),
      fetchAllPaged('group_prayer_intentions', 'user_id, prayer_request_id, created_at, prayer_request:group_prayer_requests!group_prayer_intentions_prayer_request_id_fkey(user_id)', q => q.gte('created_at', startIso).lt('created_at', endExclusiveIso)),
      fetchAllPaged('reading_group_members', 'user_id, group_id, reading_groups(name)', q => q.eq('status', 'joined')),
      fetchAllPaged('group_comments', 'group_id, created_at', q => q.gte('created_at', startIso).lt('created_at', endExclusiveIso)),
      fetchAllPaged('push_subscriptions', 'user_id, endpoint, p256dh, auth'),
      // "Perguntas à IA" (31a) — só as mensagens que a PRÓPRIA pessoa
      // mandou (role='user'), não a resposta da IA junto.
      fetchAllPaged('text_ai_chats', 'user_id, created_at', q => q.eq('role', 'user').gte('created_at', startIso).lt('created_at', endExclusiveIso)),
    ])
  } catch (err) {
    console.error('Failed to load weekly digest source data:', err.message)
    return res.status(500).json({ error: 'query_failed' })
  }

  const sessionByUser = groupBy(sessionRows, r => r.user_id)
  const chaptersByUser = groupBy(chapterRows, r => r.user_id)
  const membershipByUser = groupBy(memberRows, r => r.user_id)
  const aiQuestionCountByUser = new Map()
  for (const c of aiChatRows) aiQuestionCountByUser.set(c.user_id, (aiQuestionCountByUser.get(c.user_id) ?? 0) + 1)
  const commentCountByGroup = new Map()
  for (const c of commentRows) commentCountByGroup.set(c.group_id, (commentCountByGroup.get(c.group_id) ?? 0) + 1)
  const pushByUser = groupBy(pushSubs, r => r.user_id)

  // "Você orou por N pedidos" (distinto por pedido) e "oraram pelo seu
  // pedido: N pessoas" (distinto por pessoa) — group_prayer_intentions tem
  // PK composta (prayer_request_id, user_id), então cada linha já é um par
  // único; não tem como contar a mesma pessoa/pedido duas vezes aqui.
  const prayedForByUser = new Map() // user_id -> Set(prayer_request_id)
  const peoplePrayedForAuthor = new Map() // author_id -> Set(user_id que orou)
  for (const it of intentionRows) {
    if (!prayedForByUser.has(it.user_id)) prayedForByUser.set(it.user_id, new Set())
    prayedForByUser.get(it.user_id).add(it.prayer_request_id)
    const authorId = it.prayer_request?.user_id
    if (authorId) {
      if (!peoplePrayedForAuthor.has(authorId)) peoplePrayedForAuthor.set(authorId, new Set())
      peoplePrayedForAuthor.get(authorId).add(it.user_id)
    }
  }

  let sent = 0, skippedBlank = 0, skippedAlreadyDone = 0, skippedNoEmail = 0, failed = 0

  for (const row of userDataRows) {
    try {
      const summaries = row.weekly_summaries ?? []
      if (summaries.some(s => s.weekKey === weekKey)) { skippedAlreadyDone++; continue }

      const mySessions = sessionByUser.get(row.user_id) ?? []
      const myChapters = (chaptersByUser.get(row.user_id) ?? []).map(c => ({ book: c.livro, capitulo: c.capitulo }))
      const stepSeconds = totalsByStep(mySessions)
      const dayTotals = totalsByDay(mySessions)

      // notesCount aqui já filtra pela semana (collectWeekNotes abaixo) —
      // calculado antes só pra alimentar isBlankWeek.
      const { notesText, noteQuotes, application, applicationsFulfilledCount, applicationsTotalCount } = collectWeekNotes(row.notes, startKey, endKey)
      if (isBlankWeek({ stepSeconds, chaptersCount: myChapters.length, notesCount: noteQuotes.length + applicationsTotalCount })) {
        skippedBlank++
        continue
      }

      const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(row.user_id)
      if (userErr || !userData?.user?.email) { skippedNoEmail++; continue }
      const lang = userData.user.user_metadata?.language === 'en' ? 'en' : 'pt'
      const copy = COPY[lang]

      const dailyRoutine = row.daily_routine ?? {}
      const weeklyGoalDays = row.weekly_goal_days || DEFAULT_WEEKLY_GOAL_DAYS
      const { days: daysMet, met: daysMetCount } = daysMetForWeek(dailyRoutine, monday, now)
      const recentWeeks = computeRecentWeeksStatus(dailyRoutine, weeklyGoalDays, 19, now)
      const weeksMetStreak = { met: recentWeeks.filter(w => w.met).length, of: recentWeeks.length }

      const applicationLine = application ? `"${application.text}"${application.fulfilled ? ' (cumprida)' : ' (não marcada como cumprida)'}` : null

      let summaryText
      try {
        summaryText = await generateWeeklySummaryText({ lang, notesText, applicationLine })
      } catch (err) {
        console.error('Failed to generate weekly summary text for', row.user_id, err.message)
        continue
      }

      const myGroups = membershipByUser.get(row.user_id) ?? []
      const groups = myGroups
        .map(m => ({ groupId: m.group_id, groupName: m.reading_groups?.name ?? '', messageCount: commentCountByGroup.get(m.group_id) ?? 0 }))
        .filter(g => g.messageCount > 0)

      const summaryEntry = {
        weekKey, startKey, endKey,
        daysMet, daysMetCount, daysGoalTotal: weeklyGoalDays,
        weeksMetStreak,
        chapters: myChapters,
        notesCount: noteQuotes.length,
        applicationsFulfilled: applicationsFulfilledCount,
        applicationsTotal: applicationsTotalCount,
        applicationText: application?.text ?? null,
        noteQuotes,
        stepSeconds,
        avgSessionSeconds: averageSessionSeconds(mySessions),
        longestDay: longestDayOf(dayTotals, monday),
        aiQuestionsCount: aiQuestionCountByUser.get(row.user_id) ?? 0,
        prayer: {
          prayedForCount: prayedForByUser.get(row.user_id)?.size ?? 0,
          peoplePrayedForMe: peoplePrayedForAuthor.get(row.user_id)?.size ?? 0,
        },
        groups,
        summary: summaryText,
        computedAt: now.toISOString(),
      }

      const trimmedHistory = [summaryEntry, ...summaries].slice(0, KEEP_LAST_SUMMARIES)
      const { error: updateErr } = await supabaseAdmin.from('user_data').update({ weekly_summaries: trimmedHistory }).eq('user_id', row.user_id)
      if (updateErr) { console.error('Failed to store weekly summary for', row.user_id, updateErr.message); continue }

      const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
        user_id: row.user_id, type: NOTIFICATION_TYPE, title: copy.notifTitle, body: copy.notifBody,
      })
      if (notifErr) console.error('Failed to insert weekly summary notification for', row.user_id, notifErr.message)

      for (const sub of pushByUser.get(row.user_id) ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: copy.notifTitle, body: copy.notifBody, url: '/' })
          )
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          } else {
            console.error('Failed to send weekly summary push to', sub.endpoint, err.message)
          }
        }
      }

      try {
        await sendEmail({ to: userData.user.email, subject: copy.emailSubject, html: buildSummaryHtml({ lang, copy, summaryData: summaryEntry }) })
      } catch (err) {
        console.error('Failed to send weekly summary email for', row.user_id, err.message)
      }

      sent++
    } catch (err) {
      failed++
      console.error('Failed to process weekly summary for', row.user_id, err.message)
    }
  }

  return res.status(200).json({ ok: true, checked: userDataRows.length, sent, skippedBlank, skippedAlreadyDone, skippedNoEmail, failed })
}
