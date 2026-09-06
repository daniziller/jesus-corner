// HomeDashboard.jsx — Início com painel de métricas (quadros 29a + 30a, que
// substituem o 12a original: 29a é o topo novo — versículo do dia, "onde
// você está" com o último texto lido, e a aplicação de ontem com "Cumpri" —
// e 30a é a continuação rolando, a mesma constância/números de sempre.
// É UMA tela só, rolando (ver nota de 30a: "cartão claro no topo é o fim do
// bloco de hoje"); o "Hoje" (resumo dos passos) marca essa fronteira.
//
// Entra no lugar da Home de uma decisão (3c, HomeScreen.jsx) depois da
// primeira semana cumprida — ver shouldShowDashboard abaixo (regra mantida
// como estava; o redesign não pediu mudança nela, só no conteúdo de 12a).
import { useEffect, useState } from 'react'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { formatToday, greetingFor } from './HomeScreen'
import { getTodayUpliftingVerse } from '../utils/upliftingVerse'
import { getNote, saveNote } from '../notes/notesStore'
import { dateKey } from '../utils/dateKey'
import { computeCurrentWeekDays } from '../routine/weekRings'
import { isDayGoalMet, computeRecentWeeksStatus, DEFAULT_ROUTINE_MODULES } from '../routine/routineStreak'
import { getWeeklyDays, WEEKDAY_ABBR3, WEEKDAY_FULL } from '../routine/weeklyDaysStore'
import { getApplicationPhraseForDate, setApplicationFulfilled } from '../reflection/applicationPhraseStore'

const CARD_STEPS = ['prayer', 'reading', 'reflection']
const FONT = 'var(--font-bento)'
const WEEKS_BACK = 9
const FIRST_DAYS = 7

function cap(s) { return s[0].toUpperCase() + s.slice(1) }

// Regra do quadro 12a: nos primeiros 7 dias, e sempre que o painel estiver
// zerado, a Home é 3c — o painel só entra depois da primeira semana
// cumprida. "Primeiro dia" é a entrada mais antiga da rotina diária.
export function shouldShowDashboard(session) {
  const { dailyRoutine, weeksInGoal, chaptersRead } = session
  if (!weeksInGoal || !chaptersRead) return false
  const keys = Object.keys(dailyRoutine ?? {}).sort()
  if (!keys.length) return false
  const [y, m, d] = keys[0].split('-').map(Number)
  const first = new Date(y, m - 1, d)
  const ageDays = (Date.now() - first.getTime()) / 86400000
  return ageDays >= FIRST_DAYS
}

// "hoje às 6:48" / "ontem às 6:48" / "em 3 de set, às 6:48" — a partir do
// readAt de lastReadPositionStore.js. null (registro salvo antes de readAt
// existir, ou sem leitura ainda) esconde a linha inteira em vez de inventar
// uma hora.
function formatReadAt(iso, lang) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  const time = d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: 'numeric', minute: '2-digit' })
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(d, now)) return translate('home.whereReadToday', { time }, lang)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, yesterday)) return translate('home.whereReadYesterday', { time }, lang)
  const date = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'short' })
  return translate('home.whereReadOnDate', { date, time }, lang)
}

// "Hoje é sexta — falta a sessão de hoje e domingo." (30a) — a partir dos
// dias MARCADOS (weekly_days), não dos 7 da semana. "Falta" só olha pra
// frente (hoje e depois) — dia marcado perdido no passado não vira dívida
// (ADENDO 27: "dia em branco é dia livre de culpa").
function weekRemainingNote(markedDays, todayIndex, lang) {
  const FULL = WEEKDAY_FULL[lang] ?? WEEKDAY_FULL.pt
  const todayMarked = markedDays.find(d => d.index === todayIndex)
  const remaining = markedDays.filter(d => (d.index === todayIndex || d.isFuture) && !d.done)
  if (remaining.length === 0) return translate('home.weekAllDoneNote', undefined, lang)
  if (!todayMarked) {
    return translate('home.weekNextMarkedNote', { day: FULL[remaining[0].index] }, lang)
  }
  const parts = []
  if (!todayMarked.done) parts.push(translate('home.weekTodaySession', undefined, lang))
  parts.push(...remaining.filter(d => d.index !== todayIndex).map(d => FULL[d.index]))
  const sep = lang === 'en' ? ' and ' : ' e '
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')}${sep}${parts[parts.length - 1]}` : parts[0]
  return translate('home.weekRemainingNote', { today: FULL[todayIndex], list }, lang)
}

export default function HomeDashboard({ session, authUser, readingSeconds = 0, onContinueSession, onNavigate, onStartGuided, onOpenProfile, onOpenBiblePassage }) {
  const {
    lang, userName, avatarInitials, todaySession, weeksInGoal,
    chaptersRead, booksCompleted, currentBlock, hasNoPlan,
    dailyRoutine, routineModules, plan, activePlan,
    weeklyGoalDays, weekGoalDaysMet, lastReadPosition,
  } = session
  const L = (k, vars) => translate(`home.${k}`, vars, lang)
  const locale = lang === 'en' ? 'en' : 'pt-BR'
  const fmt = n => n.toLocaleString(locale)

  const verse = getTodayUpliftingVerse(lang)
  const [verseSaved, setVerseSaved] = useState(false)
  const verseNoteKey = `verse:${dateKey()}`
  useEffect(() => {
    if (!authUser?.email) return
    getNote(authUser.email, verseNoteKey).then(v => setVerseSaved(!!v)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.email])
  function toggleSaveVerse() {
    if (!authUser?.email) return
    const next = !verseSaved
    setVerseSaved(next)
    saveNote(authUser.email, verseNoteKey, next ? `"${verse.text}" — ${verse.ref}` : '').catch(err => {
      console.error('Failed to save verse', err)
      setVerseSaved(!next)
    })
  }
  function shareVerse() {
    const text = `"${verse.text}" — ${verse.ref}`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
  }

  // ── Onde você está (29a) ──
  const readAtLabel = formatReadAt(lastReadPosition?.readAt, lang)
  const hasLastRead = !!lastReadPosition?.book && !!lastReadPosition?.chapter
  // currentBlock.bookPercent é do livro da PRÓXIMA sessão pendente — só bate
  // com o livro do último capítulo lido na maioria do tempo (meio de livro);
  // logo depois de terminar um livro os dois divergem por uma sessão (o
  // próximo pendente já é o livro seguinte). Só mostra o "X% de Livro"
  // quando os dois concordam, pra nunca mostrar um percentual errado.
  const showBookPercent = hasLastRead && currentBlock?.book === lastReadPosition.book && currentBlock?.bookPercent != null

  // ── Sua aplicação de ontem (29a) ──
  const [application, setApplication] = useState(null) // { text, fulfilled, stats } | null
  useEffect(() => {
    if (!authUser?.email) { setApplication(null); return }
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    getApplicationPhraseForDate(authUser.email, dateKey(yesterday))
      .then(setApplication)
      .catch(err => { console.error('Failed to load application phrase', err); setApplication(null) })
  }, [authUser?.email])
  async function toggleCumpri() {
    if (!authUser?.email || !application) return
    const nextFulfilled = !application.fulfilled
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    setApplication(a => a && { ...a, fulfilled: nextFulfilled, stats: { ...a.stats, fulfilled: a.stats.fulfilled + (nextFulfilled ? 1 : -1) } })
    try {
      await setApplicationFulfilled(authUser.email, dateKey(yesterday), nextFulfilled)
    } catch (err) {
      console.error('Failed to save Cumpri', err)
    }
  }

  // ── "Hoje" (resumo dos passos do dia — 29a/30a) ──
  // Bloco 4 do redesign: plan.prayerMinutes/reflectionMinutes já vêm do
  // valor real salvo (stepMinutesStore.js) — as duas stores antigas
  // (localStorage, por aparelho) saíram de uso aqui.
  const enabledSteps = CARD_STEPS.filter(s => (routineModules ?? DEFAULT_ROUTINE_MODULES).includes(s))
  const stepMinMap = {
    prayer: plan.prayerMinutes ?? 0,
    reading: activePlan.readingMinutes ?? plan.readingMinutes ?? 0,
    reflection: plan.reflectionMinutes ?? 0,
  }
  function handleStart() {
    if (todaySession.needsThemePick) { onNavigate?.('routine'); return }
    if (session.hasPremium && onStartGuided) onStartGuided()
    else onContinueSession?.()
  }
  // "Sem plano" (28d): Leitura não tem minutos de trecho pra mostrar —
  // vira só o nome, sem número, em vez de "Leitura 0".
  const todayStripText = enabledSteps
    .map(s => s === 'reading' && hasNoPlan
      ? translate('home.routineReading', undefined, lang)
      : `${translate(`home.routine${cap(s)}`, undefined, lang)} ${stepMinMap[s]}`)
    .join(' · ')

  // ── Constância · últimas 9 semanas ──
  const goalDays = weeklyGoalDays ?? 5
  const weeks = computeRecentWeeksStatus(dailyRoutine ?? {}, goalDays, WEEKS_BACK)

  // ── Esta semana (30a) — só os dias MARCADOS, não sempre 7 ──
  const [weeklyDays, setWeeklyDays] = useState(null)
  useEffect(() => {
    getWeeklyDays().then(setWeeklyDays).catch(() => setWeeklyDays([true, true, true, true, true, false, false]))
  }, [])
  const weekDaysAll = computeCurrentWeekDays(dailyRoutine ?? {})
  const todayIndexRaw = new Date().getDay()
  const todayIndex = todayIndexRaw === 0 ? 6 : todayIndexRaw - 1 // 0=seg..6=dom
  const abbr3 = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt
  const markedDays = weeklyDays
    ? weekDaysAll
      .map((d, i) => ({ ...d, index: i, done: !d.isFuture && isDayGoalMet(d) }))
      .filter((_, i) => weeklyDays[i])
    : []
  const daysMet = weekGoalDaysMet ?? 0

  const hours = Math.floor(readingSeconds / 3600)
  // Barra do cartão "Onde você está": % do LIVRO quando dá pra confiar nele
  // (showBookPercent, mesmo critério do pill "80% de Gênesis"); senão cai
  // pro % do bloco (Pentateuco etc.) — sempre dado real, nunca inventado.
  const whereBarPct = Math.max(0, Math.min(100, (showBookPercent ? currentBlock.bookPercent : currentBlock?.percent) ?? 0))

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div>
          <p style={s.greeting}>{greetingFor(lang, userName)}</p>
          <p style={s.date}>{formatToday(lang)}</p>
        </div>
        <button style={s.avatar} onClick={() => onOpenProfile?.()} aria-label={translate('nav.profile', undefined, lang)}>
          {avatarInitials}
        </button>
      </div>

      <div style={s.body}>
        {/* Versículo do dia */}
        <div style={s.verseCard}>
          <div style={s.verseHead}>
            <p style={s.verseLabel}>{L('verseOfDay')}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.verseIconBtn} onClick={toggleSaveVerse} aria-label={L('verseSaveAria')}>
                <AppIcon name="BookMarked" size={13} color={verseSaved ? 'var(--bento-accent)' : 'var(--bento-ink)'} strokeWidth={1.9} fill={verseSaved ? 'var(--bento-accent)' : 'none'} />
              </button>
              <button style={s.verseIconBtn} onClick={shareVerse} aria-label={L('verseShareAria')}>
                <AppIcon name="Share2" size={13} color="var(--bento-ink)" strokeWidth={1.9} />
              </button>
            </div>
          </div>
          <p style={s.verseText}>"{verse.text}"</p>
          <p style={s.verseRef}>{verse.ref}</p>
        </div>

        {/* Onde você está */}
        <div style={s.whereCard}>
          <div style={s.whereHead}>
            <p style={s.darkLabel}>{L('whereLabel')}</p>
            {showBookPercent && (
              <span style={s.wherePct}>{L('wherePercentOfBook', { pct: currentBlock.bookPercent, book: currentBlock.book })}</span>
            )}
          </div>
          {hasNoPlan ? (
            // "Sem plano" (28d) — não existe "onde parou" pra mostrar; o
            // convite é sempre pra aba Bíblia, onde a pessoa lê e marca o
            // que quiser (28c).
            <>
              <p style={s.whereTitle}>{L('whereNoPlanTitle')}</p>
              <p style={s.whereSub}>{L('whereNoPlanBody')}</p>
              <button style={{ ...s.whereContinueBtn, width: '100%' }} onClick={() => onNavigate?.('journey')}>
                <span style={s.whereContinueText}>{L('whereNoPlanCta')}</span>
                <span style={s.whereContinueArrow}>→</span>
              </button>
            </>
          ) : hasLastRead ? (
            <>
              <p style={s.whereTitle}>{L('whereStoppedAt', { book: lastReadPosition.book, chapter: lastReadPosition.chapter })}</p>
              {readAtLabel && <p style={s.whereSub}>{L('whereLastReadPrefix', { when: readAtLabel })}</p>}
              <div style={s.whereBarTrack}><div style={{ ...s.whereBarFill, width: `${whereBarPct}%` }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button style={s.whereContinueBtn} onClick={handleStart}>
                  <span style={s.whereContinueText}>
                    {currentBlock?.chapter != null ? L('whereContinueAt', { chapter: currentBlock.chapter }) : translate('home.resumeRoutine', undefined, lang)}
                  </span>
                  <span style={s.whereContinueArrow}>→</span>
                </button>
                <button style={s.whereRereadBtn} onClick={() => onOpenBiblePassage?.(lastReadPosition.book, lastReadPosition.chapter)}>
                  <span style={s.whereRereadText}>{L('whereReread', { chapter: lastReadPosition.chapter })}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={s.whereTitle}>{L('whereStartTitle')}</p>
              <p style={s.whereSub}>{L('whereStartBody')}</p>
              <button style={{ ...s.whereContinueBtn, width: '100%' }} onClick={handleStart}>
                <span style={s.whereContinueText}>{translate('home.beginReading', undefined, lang)}</span>
                <span style={s.whereContinueArrow}>→</span>
              </button>
            </>
          )}
        </div>

        {/* Sua aplicação de ontem */}
        {application && (
          <div style={s.applicationCard}>
            <div style={s.applicationHead}>
              <p style={s.applicationLabel}>{L('applicationYesterdayLabel')}</p>
              <button style={s.applicationTrocarBtn} onClick={() => onNavigate?.('applicationPhrases')}>
                <span style={s.applicationTrocarText}>{L('applicationTrocar')}</span>
              </button>
            </div>
            <p style={s.applicationText}>"{application.text}"</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button style={s.cumpriBtn} onClick={toggleCumpri}>
                <span style={s.cumpriBtnText}>{application.fulfilled ? L('applicationCumprido') : L('applicationCumpri')}</span>
              </button>
              <span style={s.applicationWeeklyNote}>
                {L(application.stats.written === 1 ? 'applicationWeeklyCountOne' : 'applicationWeeklyCountMany', application.stats)}
              </span>
            </div>
          </div>
        )}

        {/* Hoje — fronteira entre 29a e 30a (mesma rolagem) */}
        {!!todayStripText && (
          <button style={s.todayStrip} onClick={handleStart}>
            <span style={s.todayStripLabel}>{L('todayStripLabel')}</span>
            <span style={s.todayStripText}>{todayStripText}</span>
            <span style={s.todayStripChevron}>›</span>
          </button>
        )}

        {/* Constância */}
        <button style={s.darkCard} onClick={() => onNavigate?.('stats')}>
          <div style={s.darkHead}>
            <p style={s.darkLabel}>{L('dashConstancy')}</p>
            <span style={s.darkHint}>{L('dashLastWeeks')}</span>
          </div>
          <div style={s.bigRow}>
            <p style={s.bigNumber}>{weeksInGoal}</p>
            <p style={s.bigCaption}>{L('dashWeeksInGoal')}</p>
          </div>
          <div style={s.bars}>
            {weeks.map((w, i) => {
              const ratio = Math.min(1, w.daysMet / goalDays)
              const height = `${Math.max(8, Math.round(ratio * 100))}%`
              const background = w.isCurrent ? 'rgba(255,255,255,.18)' : w.met ? 'var(--bento-accent)' : 'rgba(240,102,43,.45)'
              return <div key={i} style={{ flex: 1, height, borderRadius: 5, background }} />
            })}
          </div>
          <p style={s.darkNote}>{L('dashBarNote')}</p>
        </button>

        {/* Esta semana — só os dias marcados */}
        <div style={s.weekCard}>
          <div style={s.weekHead}>
            <p style={s.cardLabel}>{translate('routine.weekSectionLabel', undefined, lang)}</p>
            <p style={s.weekCount}>
              <span style={s.weekCountStrong}>
                {translate(daysMet === 1 ? 'routine.weekCompletedOfOne' : 'routine.weekCompletedOfMany', { n: daysMet }, lang)}
              </span>{' '}
              {translate('routine.weekCompletedOfSuffix', { total: goalDays }, lang)}
            </p>
          </div>
          {markedDays.length > 0 && (
            <div style={s.weekGrid}>
              {markedDays.map(d => {
                const state = d.done ? 'done' : d.isToday ? 'today' : 'other'
                return (
                  <div key={d.key} style={s.weekDayCol}>
                    <span style={{ ...s.weekDaySquare, ...s.weekDaySquare_[state] }}>
                      {state === 'done' && <AppIcon name="Check" size={14} color="var(--bento-ink)" strokeWidth={2.8} />}
                      {state === 'today' && <span style={s.weekDayDot} />}
                    </span>
                    <span style={s.weekDayLetter}>{abbr3[d.index]}</span>
                  </div>
                )
              })}
              <p style={s.weekNote}>{weekRemainingNote(markedDays, todayIndex, lang)}</p>
            </div>
          )}
        </div>

        {/* Aplicações cumpridas */}
        {application && (
          <button style={s.appsFulfilledCard} onClick={() => onNavigate?.('applicationPhrases')}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.applicationsFulfilledLabel}>{L('applicationsFulfilledLabel')}</p>
              <p style={s.appsFulfilledNumber}>
                {L('applicationsFulfilledOf', application.stats)}{' '}
                <span style={s.appsFulfilledSuffix}>{L('applicationsFulfilledThisWeek')}</span>
              </p>
            </div>
            <span style={s.appsFulfilledViewBtn}>{L('applicationsFulfilledView')}</span>
          </button>
        )}

        {/* Três números que só sobem */}
        <div style={s.statsRow}>
          <button style={s.statCard} onClick={() => onNavigate?.('stats')}>
            <p style={s.statNumber}>{fmt(chaptersRead)}</p>
            <p style={s.statLabel}>{L('dashChapters')}</p>
          </button>
          <button style={s.statCard} onClick={() => onNavigate?.('stats')}>
            <p style={s.statNumber}>{fmt(hours)}<span style={s.statUnit}>h</span></p>
            <p style={s.statLabel}>{L('dashHours')}</p>
          </button>
          <button style={{ ...s.statCard, background: 'var(--bento-sand)' }} onClick={() => onNavigate?.('stats')}>
            <p style={{ ...s.statNumber, color: 'var(--bento-sand-icon)' }}>{fmt(booksCompleted)}</p>
            <p style={{ ...s.statLabel, color: 'var(--bento-sand-label)' }}>{L('dashBooks')}</p>
          </button>
        </div>

        {/* Minhas métricas completas */}
        <button style={s.metricsLinkCard} onClick={() => onNavigate?.('stats')}>
          <span style={s.metricsLinkIcon}><AppIcon name="BarChart3" size={16} color="var(--bento-ink)" strokeWidth={1.9} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.metricsLinkTitle}>{L('fullMetricsTitle')}</p>
            <p style={s.metricsLinkSub}>{L('fullMetricsSub')}</p>
          </div>
          <span style={s.metricsLinkChevron}>›</span>
        </button>
      </div>
    </div>
  )
}

// Medidas dos quadros 29a/30a.
const s = {
  screen: { background: 'var(--bento-bg)', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 'var(--nav-height)', boxSizing: 'border-box' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 20px 0' },
  greeting: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: 0 },
  date: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: '4px 0 0' },
  avatar: {
    width: 36, height: 36, flexShrink: 0, borderRadius: 14, border: 'none', padding: 0, background: 'var(--bento-ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    fontFamily: FONT, fontSize: 11, fontWeight: 800, lineHeight: '36px', color: 'var(--bento-bg)',
  },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 },

  verseCard: { flex: 'none', borderRadius: 26, background: 'var(--bento-card)', padding: 20 },
  verseHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' },
  verseLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  verseIconBtn: { width: 28, height: 28, borderRadius: 10, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  verseText: { fontFamily: FONT, fontStyle: 'italic', fontSize: 17, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-ink)', margin: '0 0 10px' },
  verseRef: { fontFamily: FONT, fontSize: 11.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-accent)', margin: 0 },

  whereCard: { flex: 'none', borderRadius: 26, background: 'var(--bento-ink)', padding: 20 },
  whereHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 10px' },
  wherePct: { fontFamily: FONT, fontSize: 11.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-accent)' },
  whereTitle: { fontFamily: FONT, fontSize: 20, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.7px', color: '#fff', margin: '0 0 8px' },
  whereSub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'rgba(255,255,255,.5)', margin: '0 0 14px' },
  whereBarTrack: { height: 8, borderRadius: 99, background: 'rgba(255,255,255,.12)', margin: '0 0 14px', overflow: 'hidden' },
  whereBarFill: { height: 8, borderRadius: 99, background: 'var(--bento-accent)' },
  whereContinueBtn: { flex: 1, height: 44, borderRadius: 15, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },
  whereContinueText: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' },
  whereContinueArrow: { fontFamily: FONT, fontSize: 13, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' },
  whereRereadBtn: { flex: 'none', height: 44, padding: '0 16px', borderRadius: 15, border: 'none', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  whereRereadText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1, color: '#fff' },

  applicationCard: { flex: 'none', borderRadius: 24, background: 'var(--bento-sand)', padding: '18px 20px' },
  applicationHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 10px' },
  applicationLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: 0 },
  applicationTrocarBtn: { border: 'none', background: 'none', padding: 0, cursor: 'pointer' },
  applicationTrocarText: { fontFamily: FONT, fontSize: 10.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-sand-label)' },
  applicationText: { fontFamily: FONT, fontSize: 15.5, fontWeight: 700, lineHeight: 1.45, color: 'var(--bento-sand-icon)', margin: '0 0 12px' },
  cumpriBtn: { flex: 'none', height: 34, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  cumpriBtnText: { fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand)' },
  applicationWeeklyNote: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.3, color: 'var(--bento-sand-label)' },

  todayStrip: { flex: 'none', border: 'none', borderRadius: 22, background: 'rgba(255,255,255,.6)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' },
  todayStripLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', flex: 'none' },
  todayStripText: { flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)' },
  todayStripChevron: { fontFamily: FONT, fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t5)', flex: 'none' },

  darkCard: { flex: 'none', borderRadius: 28, background: 'var(--bento-ink)', padding: 20, color: '#fff', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: FONT },
  darkHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' },
  darkLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  darkHint: { fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,.38)' },
  bigRow: { display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 14px' },
  bigNumber: { fontFamily: FONT, fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: '-2px', margin: 0, color: '#fff' },
  bigCaption: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: 'rgba(255,255,255,.55)', margin: 0, whiteSpace: 'pre-line' },
  bars: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 44, margin: '0 0 10px' },
  darkNote: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.45)', margin: 0 },

  statsRow: { flex: 'none', display: 'flex', gap: 8 },
  statCard: { flex: 1, minWidth: 0, borderRadius: 20, border: 'none', background: 'var(--bento-card)', padding: '14px 13px', textAlign: 'left', cursor: 'pointer', fontFamily: FONT },
  statNumber: { fontFamily: FONT, fontSize: 34, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.6px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  statUnit: { fontSize: 19, letterSpacing: '-.6px' },
  statLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1.25, color: 'var(--bento-t3)', margin: 0, whiteSpace: 'pre-line' },

  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },

  weekCard: { flex: 'none', borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px' },
  weekHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 14px' },
  weekCount: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t3)', margin: 0 },
  weekCountStrong: { fontWeight: 800, color: 'var(--bento-ink)' },
  weekGrid: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 14px' },
  weekDayCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 },
  weekDaySquare: { width: 30, height: 30, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' },
  weekDaySquare_: {
    done: { background: 'var(--bento-accent)' },
    today: { background: 'var(--bento-ink)' },
    other: { background: 'var(--bento-bg)' },
  },
  weekDayDot: { width: 7, height: 7, borderRadius: 99, background: 'var(--bento-accent)' },
  weekDayLetter: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' },
  weekNote: { flex: '1 0 100%', fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.35, color: 'var(--bento-t3)', margin: '14px 0 0' },

  appsFulfilledCard: { flex: 'none', border: 'none', borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left' },
  applicationsFulfilledLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 8px' },
  appsFulfilledNumber: { fontFamily: FONT, fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.1px', color: 'var(--bento-sand-icon)', margin: 0 },
  appsFulfilledSuffix: { fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-sand-label)' },
  appsFulfilledViewBtn: { flex: 'none', height: 36, padding: '0 14px', borderRadius: 13, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand)' },

  metricsLinkCard: { flex: 'none', border: 'none', borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left' },
  metricsLinkIcon: { width: 34, height: 34, flex: 'none', borderRadius: 12, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  metricsLinkTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 3px' },
  metricsLinkSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: 0 },
  metricsLinkChevron: { fontFamily: FONT, fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t5)' },
}
