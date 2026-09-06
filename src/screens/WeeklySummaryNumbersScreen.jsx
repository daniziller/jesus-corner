// WeeklySummaryNumbersScreen.jsx — "Os números da semana" (quadro 31a,
// Bloco 13). Primeira das 3 telas do Resumo semanal: número primeiro,
// texto da IA depois (31b). Todo o dado vem pronto de
// user_data.weekly_summaries (gravado pelo cron de domingo à noite, ver
// api/send-weekly-digest.js) — esta tela só formata e mostra, nunca
// recalcula nem chama IA.
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import WeekPickerSheet from '../components/WeekPickerSheet'
import { weekRangeLabel, chaptersRangeLabel } from '../recap/weeklySummaryMath'
import { WEEKDAY_ABBR3, WEEKDAY_FULL } from '../routine/weeklyDaysMath'

const FONT = 'var(--font-bento)'

function fmtMin(seconds) {
  return Math.round(seconds / 60)
}

export default function WeeklySummaryNumbersScreen({ session, weeklyDays, summaries, selectedIndex, onSelectWeek, onBack, onOpenText }) {
  const lang = session.lang
  const L = (k, vars) => t(`weeklySummary.${k}`, vars, lang)
  const [pickerOpen, setPickerOpen] = useState(false)

  const current = summaries[selectedIndex] ?? null

  if (!current) {
    return (
      <div style={s.screen}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
          </button>
          <p style={s.title}>{L('pageTitle')}</p>
        </div>
        <div style={s.emptyWrap}>
          <AppIcon name="Sparkles" size={26} color="var(--bento-t4)" />
          <p style={s.emptyTitle}>{L('emptyTitle')}</p>
          <p style={s.emptySub}>{L('emptySub')}</p>
        </div>
      </div>
    )
  }

  const abbr3 = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt
  const full = WEEKDAY_FULL[lang] ?? WEEKDAY_FULL.pt
  const markedDays = current.daysMet
    .map((done, i) => ({ done, index: i }))
    .filter((_, i) => weeklyDays?.[i])

  const missingMarked = markedDays.filter(d => !d.done)
  let statusLine
  if (missingMarked.length === 0) statusLine = L('goalMetLine')
  else if (missingMarked.length === 1) statusLine = L('goalMissedOneLine', { day: full[missingMarked[0].index] })
  else statusLine = L('goalMissedManyLine', { n: missingMarked.length })
  const streakLine = current.weeksMetStreak.of > 0
    ? L('streakLine', { met: current.weeksMetStreak.met, of: current.weeksMetStreak.of })
    : ''

  const totalStepSeconds = (current.stepSeconds.prayer ?? 0) + (current.stepSeconds.reading ?? 0) + (current.stepSeconds.reflection ?? 0)
  const stepPct = (seconds) => totalStepSeconds > 0 ? Math.round((seconds / totalStepSeconds) * 100) : 0
  const chaptersLabel = chaptersRangeLabel(current.chapters, lang)

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
          </button>
          <div>
            <p style={s.title}>{L('pageTitle')}</p>
            <p style={s.dateRange}>{weekRangeLabel(current.startKey, current.endKey, lang)}</p>
          </div>
        </div>
        {summaries.length > 1 && (
          <button style={s.weeksChip} onClick={() => setPickerOpen(true)}>
            <span>{L('weeksChip')}</span>
            <AppIcon name="ChevronDown" size={11} strokeWidth={2.6} color="var(--bento-t3)" />
          </button>
        )}
      </div>

      <div style={s.body}>
        <div style={s.darkCard}>
          <div style={s.darkHeadRow}>
            <p style={s.darkLabel}>{L('goalLabel')}</p>
            <span style={s.markedTag}>{L('daysMarkedTag', { n: markedDays.length })}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 16px' }}>
            <p style={s.bigNumber}>{L('metOfTotal', { met: current.daysMetCount, total: markedDays.length })}</p>
            <p style={s.bigNumberSub}>{L('daysMetSuffix')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, margin: '0 0 14px' }}>
            {markedDays.map(({ done, index }) => (
              <div key={index} style={{ ...s.dayCell, background: done ? 'var(--bento-accent)' : 'rgba(255,255,255,.08)' }}>
                {done
                  ? <AppIcon name="Check" size={13} strokeWidth={3} color="var(--bento-ink)" />
                  : <span style={s.dayCellDot} />}
                <span style={{ ...s.dayCellLabel, color: done ? 'var(--bento-ink)' : 'rgba(255,255,255,.5)' }}>{abbr3[index]}</span>
              </div>
            ))}
          </div>
          <p style={s.darkFootnote}>{statusLine} {streakLine}</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={s.statCard}>
            <p style={s.statNumber}>{current.chapters.length}</p>
            <p style={s.statLabel}>{L('chaptersLabel')}{chaptersLabel ? <><br />{chaptersLabel}</> : null}</p>
          </div>
          <div style={s.statCard}>
            <p style={s.statNumber}>{current.notesCount}</p>
            <p style={s.statLabel}>{L('notesLabel')}</p>
          </div>
          <div style={{ ...s.statCard, background: 'var(--bento-sand)' }}>
            <p style={{ ...s.statNumber, color: 'var(--bento-sand-icon)' }}>
              {current.applicationsFulfilled}<span style={s.statNumberSub}>/{current.applicationsTotal}</span>
            </p>
            <p style={{ ...s.statLabel, color: 'var(--bento-sand-ink)' }}>{L('applicationsLabel')}</p>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeadRow}>
            <p style={s.cardLabel}>{L('timePerStepLabel')}</p>
            <span style={s.cardHeadValue}>{L('totalTimeLabel', { min: fmtMin(totalStepSeconds) })}</span>
          </div>
          {['prayer', 'reading', 'reflection'].map(step => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 10px' }}>
              <span style={s.stepName}>{L(`step_${step}`)}</span>
              <div style={s.barTrack}><div style={{ ...s.barFill, width: `${stepPct(current.stepSeconds[step])}%` }} /></div>
              <span style={s.stepValue}>{L('minutesValue', { n: fmtMin(current.stepSeconds[step]) })}</span>
            </div>
          ))}
        </div>

        <div style={s.listCard}>
          <div style={s.listRow}>
            <span style={s.listLabel}>{L('avgSessionLabel')}</span>
            <span style={s.listValue}>{L('minutesValue', { n: fmtMin(current.avgSessionSeconds) })}</span>
          </div>
          {current.longestDay && (
            <div style={s.listRow}>
              <span style={s.listLabel}>{L('longestDayLabel')}</span>
              <span style={s.listValue}>{L('longestDayValue', { day: full[current.longestDay.dayIndex], min: fmtMin(current.longestDay.seconds) })}</span>
            </div>
          )}
          <div style={{ ...s.listRow, borderBottom: 'none' }}>
            <span style={s.listLabel}>{L('aiQuestionsLabel')}</span>
            <span style={s.listValue}>{L('aiQuestionsValue', { n: current.aiQuestionsCount })}</span>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <button style={s.readBtn} onClick={onOpenText}>
          <span>{L('readSummaryBtn')}</span>
          <span style={{ color: 'var(--bento-accent)' }}>→</span>
        </button>
      </div>

      {pickerOpen && (
        <WeekPickerSheet lang={lang} summaries={summaries} selectedIndex={selectedIndex} onSelect={onSelectWeek} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  dateRange: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  weeksChip: { flexShrink: 0, height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', cursor: 'pointer', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-ink)' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px', display: 'flex', flexDirection: 'column', gap: 8 },

  darkCard: { borderRadius: 26, background: 'var(--bento-ink)', padding: 20 },
  darkHeadRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' },
  darkLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  markedTag: { fontFamily: FONT, fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.45)' },
  bigNumber: { fontFamily: FONT, fontSize: 34, fontWeight: 800, letterSpacing: '-1.5px', color: '#fff', margin: 0 },
  bigNumberSub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-accent)', margin: 0 },
  dayCell: { flex: 1, height: 52, borderRadius: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 },
  dayCellDot: { width: 6, height: 6, borderRadius: 99, background: 'rgba(255,255,255,.35)' },
  dayCellLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800 },
  darkFootnote: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.5)', margin: 0 },

  statCard: { flex: 1, borderRadius: 20, background: 'var(--bento-card)', padding: '14px 13px' },
  statNumber: { fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: '-1.1px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  statNumberSub: { fontSize: 15, color: 'var(--bento-t5)' },
  statLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1.25, color: 'var(--bento-t3)', margin: 0, whiteSpace: 'pre-line' },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px' },
  cardHeadRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 14px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  cardHeadValue: { fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)' },
  stepName: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', width: 62, flexShrink: 0 },
  barTrack: { flex: 1, height: 8, borderRadius: 99, background: 'var(--bento-line)' },
  barFill: { height: 8, borderRadius: 99, background: 'var(--bento-accent)' },
  stepValue: { fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: 'var(--bento-ink)', width: 46, textAlign: 'right', flexShrink: 0 },

  listCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '2px 20px' },
  listRow: { display: 'flex', alignItems: 'center', gap: 12, height: 42, borderBottom: '1px solid var(--bento-line)' },
  listLabel: { flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t3)' },
  listValue: { fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)' },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  readBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: '#fff' },

  emptyWrap: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, textAlign: 'center' },
  emptyTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: 0 },
  emptySub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', margin: 0, maxWidth: 260 },
}
