// MetricsScreen.jsx — "Minhas métricas" (quadro 30b, Bloco 7). Alcançada
// pelo Perfil (19a, "Minhas métricas"). Uma métrica por pergunta que a
// pessoa faz de verdade: quanto tempo com Deus, em quê, quanto já leu,
// quanto falta e quando termina (ver nota da autora no handoff).
//
// Dependência real que o handoff aponta: nada disso existia sem registrar
// duração de sessão. session_seconds (migration 0049) e a tabela já
// existiam desde o Bloco 2, mas NINGUÉM gravava nela ainda — esta rodada
// conecta finishPrayer (PrayerScreen), finishReflection (ReflectionScreen,
// os dois fluxos) e o cronômetro de leitura (ReadingBlockView) pra
// gravarem de verdade. "Capítulos lidos" por período tem a mesma lacuna:
// chapters_read (mesma migration) só recebia marcação MANUAL até agora —
// toggleSession/toggleChapter em App.jsx passam a gravar lá também
// (origem 'sessao'), ver chapterReadLog.js.
//
// Limitação real, não escondida: "30 dias"/"Este ano" só contam capítulos
// marcados A PARTIR desta mudança — quem já lia antes vê esses dois
// períodos mais baixos que o real nos primeiros dias após o lançamento.
// "Desde o começo" nunca tem esse problema (usa completed_keys via
// countChaptersRead, não chapters_read).
import { useState, useEffect, useMemo } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getAllSessions } from '../metrics/sessionDurationStore'
import { totalsByStep, averageSessionSeconds } from '../metrics/sessionDurationMath'
import { getAllChapterReadRows } from '../bible/chapterReadLog'
import { getDailyRoutine } from '../routine/dailyRoutineStore'
import { getWeeklyDays } from '../routine/weeklyDaysStore'
import { periodSinceDate, mostCommonHour, hourRangeLabel, chaptersReadInPeriod, reflectionDaysInPeriod, splitHoursMinutes } from '../metrics/metricsSummary'
import { countChaptersRead, totalBibleChapters, computeProjection, formatYearsMonths } from '../plan/readingProjection'
import { computeCompletedBooks } from '../utils/progress'

const PERIODS = ['30d', 'year', 'all']

export default function MetricsScreen({ session, completedSet, sessionsByBlock, stepMinutes, onNavigate, onBack }) {
  const { lang } = session
  const L = (k, vars) => t(`metrics.${k}`, vars, lang)
  const [period, setPeriod] = useState('all')
  const [sessionRows, setSessionRows] = useState([])
  const [chapterRows, setChapterRows] = useState([])
  const [dailyRoutine, setDailyRoutine] = useState({})
  const [weeklyDays, setWeeklyDays] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([getAllSessions(), getAllChapterReadRows(), getDailyRoutine(), getWeeklyDays()])
      .then(([sessions, chapters, routine, days]) => {
        if (!alive) return
        setSessionRows(sessions)
        setChapterRows(chapters)
        setDailyRoutine(routine)
        setWeeklyDays(days)
      })
      .catch(err => console.error('Failed to load metrics data', err))
    return () => { alive = false }
  }, [])

  const sinceDate = periodSinceDate(period)

  const totals = useMemo(() => totalsByStep(sessionRows, sinceDate), [sessionRows, sinceDate])
  const totalSeconds = totals.prayer + totals.reading + totals.reflection
  const totalHM = splitHoursMinutes(totalSeconds)
  const pct = secs => totalSeconds > 0 ? Math.round((secs / totalSeconds) * 100) : 0

  const chaptersInPeriod = useMemo(
    () => period === 'all' ? countChaptersRead(completedSet) : chaptersReadInPeriod(chapterRows, sinceDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, chapterRows, sinceDate, completedSet]
  )
  const reflectionCount = useMemo(() => reflectionDaysInPeriod(dailyRoutine, sinceDate), [dailyRoutine, sinceDate])

  const totalChapters = totalBibleChapters()
  const chaptersRemaining = Math.max(0, totalChapters - countChaptersRead(completedSet))
  const chaptersPercent = totalChapters ? Math.round((countChaptersRead(completedSet) / totalChapters) * 1000) / 10 : 0

  const readingMinutesPerDay = stepMinutes?.reading ?? session.plan.readingMinutes
  const projection = weeklyDays
    ? computeProjection({ completedSet, readingMinutesPerDay, weeklyDays, lang })
    : null

  const avgSeconds = useMemo(() => averageSessionSeconds(sessionRows, sinceDate), [sessionRows, sinceDate])
  const commonHour = useMemo(() => mostCommonHour(sessionRows, 'reading', sinceDate), [sessionRows, sinceDate])
  const completedBooks = useMemo(() => computeCompletedBooks(completedSet, sessionsByBlock ?? {}).size, [completedSet, sessionsByBlock])

  const prayingHM = splitHoursMinutes(totals.prayer)
  const readingHM = splitHoursMinutes(totals.reading)
  const reflectingHM = splitHoursMinutes(totals.reflection)

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div style={s.headerTop}>
          <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
          </button>
          <p style={s.title}>{L('title')}</p>
        </div>
        <div style={s.periodRow}>
          {PERIODS.map(p => (
            <button key={p} style={{ ...s.periodBtn, ...(period === p ? s.periodBtnOn : {}) }} onClick={() => setPeriod(p)}>
              {L(`period_${p}`)}
            </button>
          ))}
        </div>
      </div>

      <div style={s.body}>
        <div style={s.heroCard}>
          <p style={s.heroLabel}>{L('timeWithGod')}</p>
          <p style={s.heroValue}>{L('heroValue', { h: totalHM.h, m: totalHM.m })}</p>
          <div style={s.heroBar}>
            <div style={{ ...s.heroSeg, width: `${pct(totals.prayer)}%`, background: 'var(--bento-accent)' }} />
            <div style={{ ...s.heroSeg, width: `${pct(totals.reading)}%`, background: 'var(--bento-sand)' }} />
            <div style={{ ...s.heroSeg, width: `${pct(totals.reflection)}%`, background: 'rgba(255,255,255,.3)' }} />
          </div>
          <div style={s.heroLegend}>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bento-accent)' }} />{L('legendPraying')}</span>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bento-sand)' }} />{L('legendReading')}</span>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'rgba(255,255,255,.3)' }} />{L('legendReflecting')}</span>
          </div>
        </div>

        <div style={s.statsRow}>
          <div style={s.statCard}>
            <p style={s.statValue}>{prayingHM.h}<span style={s.statUnit}>h</span>{prayingHM.m}</p>
            <p style={s.statSub}>{L('statPrayingLine1')}<br />{L('statPrayingLine2')}</p>
          </div>
          <div style={s.statCard}>
            <p style={s.statValue}>{readingHM.h}<span style={s.statUnit}>h</span>{readingHM.m}</p>
            <p style={s.statSub}>{L('statReadingLine1')}<br />{L(chaptersInPeriod === 1 ? 'statReadingChapterOne' : 'statReadingChaptersMany', { n: chaptersInPeriod })}</p>
          </div>
          <div style={s.statCard}>
            <p style={s.statValue}>{reflectingHM.h}<span style={s.statUnit}>h</span>{reflectingHM.m}</p>
            <p style={s.statSub}>{L('statReflectingLine1')}<br />{L(reflectionCount === 1 ? 'statReflectingAnswerOne' : 'statReflectingAnswersMany', { n: reflectionCount })}</p>
          </div>
        </div>

        <div style={s.chaptersCard}>
          <div style={s.chaptersTopRow}>
            <p style={s.cardLabel}>{L('chaptersLabel')}</p>
            <span style={s.chaptersPercent}>{chaptersPercent}%</span>
          </div>
          <div style={s.chaptersNumRow}>
            <p style={s.chaptersBig}>{countChaptersRead(completedSet)}</p>
            <p style={s.chaptersOf}>{L('chaptersReadRemaining', { n: chaptersRemaining })}</p>
          </div>
          <div style={s.chaptersBarTrack}><div style={{ ...s.chaptersBarFill, width: `${chaptersPercent}%` }} /></div>
          {projection?.monthsRemaining != null && (
            <p style={s.projectionText}>{L('projectionText', { n: chaptersRemaining, time: formatYearsMonths(projection.monthsRemaining, lang) })}</p>
          )}
        </div>

        <div style={s.listCard}>
          <div style={s.listRow}>
            <span style={s.listLabel}>{L('avgSessionLabel')}</span>
            <span style={s.listValue}>{avgSeconds > 0 ? L('avgSessionValue', { n: Math.round(avgSeconds / 60) }) : '—'}</span>
          </div>
          <div style={s.listRow}>
            <span style={s.listLabel}>{L('commonHourLabel')}</span>
            <span style={s.listValue}>{hourRangeLabel(commonHour) ?? '—'}</span>
          </div>
          <div style={{ ...s.listRow, borderBottom: 'none' }}>
            <span style={s.listLabel}>{L('booksCompletedLabel')}</span>
            <span style={s.listValue}>{L('booksCompletedValue', { n: completedBooks })}</span>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <button style={s.blocksBtn} onClick={() => onNavigate?.('metricsBlocks')}>
          <span>{L('seeBlocksBtn')}</span>
          <span style={{ color: 'var(--bento-accent)', fontWeight: 700 }}>→</span>
        </button>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', padding: '22px 20px 12px' },
  headerTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },
  periodRow: { display: 'flex', gap: 6 },
  periodBtn: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t2)', background: '#fff', border: 'none', borderRadius: 99, padding: '9px 13px', cursor: 'pointer' },
  periodBtnOn: { fontWeight: 800, color: '#fff', background: 'var(--bento-ink)' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  heroCard: { borderRadius: 26, background: 'var(--bento-ink)', padding: 20 },
  heroLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 10px' },
  heroValue: { fontFamily: FONT, fontSize: 38, fontWeight: 800, letterSpacing: '-1.8px', color: '#fff', margin: '0 0 16px' },
  heroBar: { display: 'flex', gap: 3, height: 10, margin: '0 0 14px' },
  heroSeg: { borderRadius: 99 },
  heroLegend: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.6)' },
  legendDot: { width: 8, height: 8, borderRadius: 3, flexShrink: 0 },

  statsRow: { display: 'flex', gap: 8 },
  statCard: { flex: 1, minWidth: 0, borderRadius: 20, background: '#fff', padding: '14px 14px' },
  statValue: { fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: '-1px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  statUnit: { fontSize: 14 },
  statSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1.25, color: 'var(--bento-t2)', margin: 0 },

  chaptersCard: { borderRadius: 24, background: '#fff', padding: '18px 20px' },
  chaptersTopRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  chaptersPercent: { fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-accent)' },
  chaptersNumRow: { display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 12px' },
  chaptersBig: { fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: '-1.3px', color: 'var(--bento-ink)', margin: 0 },
  chaptersOf: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t2)', margin: 0 },
  chaptersBarTrack: { height: 10, borderRadius: 99, background: 'var(--bento-line)', margin: '0 0 10px' },
  chaptersBarFill: { height: 10, borderRadius: 99, background: 'var(--bento-accent)' },
  projectionText: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t2)', margin: 0 },

  listCard: { borderRadius: 24, background: '#fff', padding: '0 20px' },
  listRow: { display: 'flex', alignItems: 'center', gap: 12, height: 44, borderBottom: '1px solid var(--bento-line)' },
  listLabel: { flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t2)' },
  listValue: { fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)' },

  footer: { flex: 'none', padding: '12px 20px calc(20px + var(--safe-bottom))' },
  blocksBtn: { width: '100%', height: 50, borderRadius: 17, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)' },
}
