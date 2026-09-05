// Cron job (ver vercel.json) — roda toda segunda-feira de manhã e manda,
// pra quem teve alguma atividade na semana anterior (oração, leitura,
// reflexão ou estudo — ver `hasActivity` abaixo), um boletim semanal: um
// resumo gerado por IA da semana (a partir das anotações reais escritas),
// os temas espirituais recorrentes, as métricas atuais (nível, semanas na
// meta, % da Bíblia lida), as frases de aplicação pessoal escritas na
// semana (só as próprias palavras da pessoa — não passam pela IA) e uma
// frase de encorajamento pra semana seguinte. Chega tanto como notificação
// in-app (sino) quanto por email.
//
// Aproximação de fuso: o cron roda uma vez só, num horário fixo em UTC
// (0 9 * * 1 = ~6h em Brasília, que não observa horário de verão desde
// 2019) — não existe fuso por conta no app hoje (só por dispositivo, nas
// inscrições de push), então "segunda de manhã" é aproximado pra quem não
// está em Brasília, e a "semana" (segunda a domingo) usada nas métricas
// também é contada no fuso do servidor (UTC), não no fuso local de cada
// pessoa — mesmo espírito de aproximação já aceito no lembrete de leitura
// por push (que É exato, por fuso, mas esse aqui não precisa da mesma
// precisão pra fazer sentido).
//
// Fonte dos dados: como completed_keys não guarda QUANDO cada capítulo foi
// concluído (só QUAIS), não dá pra saber com exatidão o que foi lido nesta
// semana específica sem uma migração nova de tracking por data. Em vez
// disso, a "semana" é reconstruída combinando (1) dias de atividade da
// rotina (daily_routine, que já é por dia) com (2) as anotações com data
// própria escritas na semana (notes — reflexão diária, nota de leitura,
// frase de aplicação, reflexão de fechamento de livro) — o texto real que
// vira o resumo/temas da IA. As MÉTRICAS (nível, XP, % da Bíblia, semanas
// na meta) são o estado ATUAL, cumulativo, não só da semana. (Sequência de
// dias corridos removida de vez — decisão da autora, nenhuma tela ou
// mensagem do produto mostra isso mais.)
//
// Só o Vercel Cron deve conseguir chamar isso — mesmo padrão de
// autenticação (`Authorization: Bearer $CRON_SECRET`) dos outros crons.
import { createClient } from '@supabase/supabase-js'
import { deriveProgress, computeOverallStats, computeGamificationStats } from '../src/utils/progress.js'
import { levelFor } from '../src/utils/levels.js'
import { computeWeeklyRoutineStats, computeWeeksInGoal, computeRoutineXpBonus, DEFAULT_ROUTINE_MODULES, DEFAULT_WEEKLY_GOAL_DAYS } from '../src/routine/routineStreak.js'
import { dateKey } from '../src/utils/dateKey.js'
import { generateWeeklyDigest } from './_lib/ai.js'
import { sendEmail } from './_lib/resend.js'
import { emailFooterLinksHtml } from './_lib/emailFooter.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const NOTIFICATION_TYPE = 'weekly_digest'
const APP_URL = 'https://app.jesuscorner.app'
// Quantos boletins já enviados guardar por pessoa (só pra dedupe — ver
// migration 0041) — não precisa de histórico longo, só o suficiente pra
// nunca reenviar o mesmo, mesmo se o cron rodar mais de uma vez na mesma
// semana por retry.
const KEEP_LAST_DIGESTS = 8

const COPY = {
  pt: {
    notifTitle: 'Seu boletim semanal está pronto',
    emailSubject: 'Seu boletim semanal',
    weekSummaryLabel: 'Sua semana em resumo',
    themesLabel: 'Temas da semana',
    metricsLabel: 'Onde você está agora',
    applicationLabel: 'Suas frases de aplicação',
    encouragementLabel: 'Pra semana que vem',
    metricLevel: 'Nível atual',
    metricWeeksInGoal: 'Semanas na meta',
    metricBible: 'Da Bíblia lida',
    ctaButton: 'Abrir o app',
    activity: (d) => `Oração: ${d.prayerDays}/${d.totalDays} dias · Leitura: ${d.readingDays}/${d.totalDays} dias · Estudo: ${d.studyDays}/${d.totalDays} dias · Reflexão: ${d.reflectionDays}/${d.totalDays} dias`,
  },
  en: {
    notifTitle: 'Your weekly digest is ready',
    emailSubject: 'Your weekly digest',
    weekSummaryLabel: 'Your week in review',
    themesLabel: "This week's themes",
    metricsLabel: 'Where you stand now',
    applicationLabel: 'Your application notes',
    encouragementLabel: 'For the week ahead',
    metricLevel: 'Current level',
    metricWeeksInGoal: 'Weeks on goal',
    metricBible: 'Of the Bible read',
    ctaButton: 'Open the app',
    activity: (d) => `Prayer: ${d.prayerDays}/${d.totalDays} days · Reading: ${d.readingDays}/${d.totalDays} days · Study: ${d.studyDays}/${d.totalDays} days · Reflection: ${d.reflectionDays}/${d.totalDays} days`,
  },
}

// Segunda-feira (00:00) da semana em que "d" cai — mesma lógica de
// mondayOf() em src/routine/routineStreak.js (não exportada de lá, então
// duplicada aqui; é só 4 linhas).
function mondayOf(d) {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
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

// Data (YYYY-MM-DD) de uma anotação — vem da própria chave quando o
// formato já é por dia (reflexão diária, frase de aplicação); pras outras
// (leitura, reflexão de fechamento de livro), só a chave não diz QUANDO,
// então usa updatedAt. Sem nenhuma das duas fontes (nota antiga, salva
// antes de updatedAt existir), a data é desconhecida e a anotação não entra
// no boletim — não dá pra saber se é desta semana ou de anos atrás.
function noteDateFor(parsed, entry) {
  if (parsed.date) return parsed.date
  const updatedAt = noteUpdatedAtOf(entry)
  return updatedAt ? updatedAt.slice(0, 10) : null
}

// Separa as anotações da semana (weekStartKey..weekEndKey, ambos
// YYYY-MM-DD) em texto pra IA resumir (leitura/reflexões) e frases de
// aplicação (mostradas literalmente, sem passar pela IA).
function collectWeekNotes(notes, weekStartKey, weekEndKey, lang) {
  const readingLines = []
  const applicationPhrases = []

  for (const [key, entry] of Object.entries(notes ?? {})) {
    const parsed = parseNoteKey(key)
    if (parsed.type === 'unknown') continue
    const date = noteDateFor(parsed, entry)
    if (!date || date < weekStartKey || date > weekEndKey) continue
    const text = noteTextOf(entry).trim()
    if (!text) continue

    if (parsed.type === 'application-phrase') {
      applicationPhrases.push({ date, text })
      continue
    }
    if (parsed.type === 'reading') {
      const range = parsed.chStart === parsed.chEnd ? `${parsed.chStart}` : `${parsed.chStart}–${parsed.chEnd}`
      readingLines.push(lang === 'en' ? `Read ${parsed.book} ${range}: "${text}"` : `Leu ${parsed.book} ${range}: "${text}"`)
    } else if (parsed.type === 'book-reflection') {
      readingLines.push(lang === 'en' ? `Finished ${parsed.book} with this reflection: "${text}"` : `Encerrou ${parsed.book} com esta reflexão: "${text}"`)
    } else if (parsed.type === 'daily-reflection') {
      readingLines.push(lang === 'en' ? `Reflection on ${date}: "${text}"` : `Reflexão do dia ${date}: "${text}"`)
    }
  }

  applicationPhrases.sort((a, b) => a.date.localeCompare(b.date))
  return { notesText: readingLines.join('\n'), applicationPhrases }
}

function buildDigestHtml({ lang, copy, summary, themes, encouragement, applicationPhrases, metrics }) {
  const themesHtml = themes.length
    ? `<div style="margin:0 0 20px;"><p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#9D4300;text-transform:uppercase;letter-spacing:0.5px;">${copy.themesLabel}</p>
        <p style="margin:0;">${themes.map(t => `<span style="display:inline-block;background:#FFF3E8;color:#9D4300;font-size:12.5px;font-weight:700;padding:5px 10px;border-radius:999px;margin:0 6px 6px 0;">${t}</span>`).join('')}</p></div>`
    : ''

  const applicationHtml = applicationPhrases.length
    ? `<div style="margin:0 0 20px;"><p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#9D4300;text-transform:uppercase;letter-spacing:0.5px;">${copy.applicationLabel}</p>
        ${applicationPhrases.map(p => `<p style="margin:0 0 8px;font-size:13.5px;line-height:1.6;color:#404040;padding:10px 12px;background:#FAFAFA;border-radius:10px;border-left:3px solid #9D4300;">"${p.text}"</p>`).join('')}</div>`
    : ''

  const metricCell = (label, value) => `<td style="text-align:center;padding:12px 6px;">
      <div style="font-size:19px;font-weight:900;color:#121212;">${value}</div>
      <div style="font-size:10px;font-weight:700;color:#8A8A8A;text-transform:uppercase;letter-spacing:0.3px;margin-top:2px;">${label}</div>
    </td>`

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
            <h1 style="margin:0 0 14px;font-size:20px;font-weight:800;color:#121212;line-height:1.3;">${copy.weekSummaryLabel}</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:#525252;">${summary}</p>
            ${themesHtml}
            ${applicationHtml}
          </td></tr>
          <tr><td style="padding:0 24px 24px;">
            <p style="margin:0 0 8px;padding:0 8px;font-size:12px;font-weight:800;color:#9D4300;text-transform:uppercase;letter-spacing:0.5px;">${copy.metricsLabel}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;border-radius:14px;">
              <tr>
                ${metricCell(copy.metricLevel, metrics.levelTitle)}
                ${metricCell(copy.metricWeeksInGoal, metrics.weeksInGoal)}
                ${metricCell(copy.metricBible, `${metrics.biblePercent}%`)}
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:0 32px 28px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:800;color:#9D4300;text-transform:uppercase;letter-spacing:0.5px;">${copy.encouragementLabel}</p>
            <p style="margin:0 0 24px;font-size:14.5px;line-height:1.65;color:#121212;font-weight:600;font-style:italic;">${encouragement}</p>
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

// Paginado (500 por página) — select() sem range() no PostgREST/Supabase
// devolve no máximo 1000 linhas por padrão, o que silenciosamente ignoraria
// o resto da base assim que ela crescesse além disso.
async function fetchAllUserDataRows() {
  const PAGE = 500
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('user_data')
      .select('user_id, plan_id, reading_order, completed_keys, notes, daily_routine, routine_modules, weekly_goal_days, weekly_digests')
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  let rows
  try {
    rows = await fetchAllUserDataRows()
  } catch (err) {
    console.error('Failed to load user_data for weekly digest:', err.message)
    return res.status(500).json({ error: 'query_failed' })
  }

  const now = new Date()
  const weekStart = new Date(mondayOf(now)); weekStart.setDate(weekStart.getDate() - 7)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartKey = dateKey(weekStart)
  const weekEndKey = dateKey(weekEnd)
  const digestWeekKey = dateKey(mondayOf(now))

  let sent = 0, skippedNoActivity = 0, skippedAlreadySent = 0, skippedNoEmail = 0, failed = 0

  for (const row of rows) {
    try {
      const alreadySent = (row.weekly_digests ?? []).some(d => d.weekKey === digestWeekKey)
      if (alreadySent) { skippedAlreadySent++; continue }

      const dailyRoutine = row.daily_routine ?? {}
      const routineModules = row.routine_modules ?? DEFAULT_ROUTINE_MODULES
      const weeks = computeWeeklyRoutineStats(dailyRoutine, routineModules, 2, now)
      const lastWeek = weeks[0]
      const hasActivity = lastWeek.prayerDays + lastWeek.readingDays + lastWeek.studyDays + lastWeek.reflectionDays > 0
      if (!hasActivity) { skippedNoActivity++; continue }

      const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(row.user_id)
      if (userErr || !userData?.user?.email) { skippedNoEmail++; continue }
      const lang = userData.user.user_metadata?.language === 'en' ? 'en' : 'pt'
      const copy = COPY[lang]

      const { notesText, applicationPhrases } = collectWeekNotes(row.notes, weekStartKey, weekEndKey, lang)
      const activityLine = copy.activity(lastWeek)

      const digest = await generateWeeklyDigest({ lang, notesText, activityLine })

      const completedSet = new Set(row.completed_keys ?? [])
      const { blocks, sessionsByBlock } = deriveProgress(completedSet, row.plan_id, row.reading_order)
      const overall = computeOverallStats(blocks)
      const gami = computeGamificationStats(completedSet, sessionsByBlock, blocks)
      const routineXpBonus = computeRoutineXpBonus(dailyRoutine, routineModules, now)
      const xp = gami.xp + routineXpBonus
      const level = levelFor(xp, lang)
      const weeksInGoal = computeWeeksInGoal(dailyRoutine, row.weekly_goal_days || DEFAULT_WEEKLY_GOAL_DAYS, now)

      const metrics = { levelTitle: level.title, weeksInGoal, biblePercent: overall.biblePercent }

      const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
        user_id: row.user_id,
        type: NOTIFICATION_TYPE,
        title: copy.notifTitle,
        body: digest.summary,
      })
      if (notifErr) throw new Error(`notification_insert_failed: ${notifErr.message}`)

      await sendEmail({
        to: userData.user.email,
        subject: copy.emailSubject,
        html: buildDigestHtml({ lang, copy, summary: digest.summary, themes: digest.themes ?? [], encouragement: digest.encouragement, applicationPhrases, metrics }),
      })

      const trimmedHistory = [...(row.weekly_digests ?? []), { weekKey: digestWeekKey, sentAt: now.toISOString() }].slice(-KEEP_LAST_DIGESTS)
      const { error: updateErr } = await supabaseAdmin.from('user_data').update({ weekly_digests: trimmedHistory }).eq('user_id', row.user_id)
      if (updateErr) console.error('Failed to record weekly digest history for', row.user_id, updateErr.message)

      sent++
    } catch (err) {
      failed++
      console.error('Failed to send weekly digest for', row.user_id, err.message)
    }
  }

  return res.status(200).json({ ok: true, checked: rows.length, sent, skippedNoActivity, skippedAlreadySent, skippedNoEmail, failed })
}
