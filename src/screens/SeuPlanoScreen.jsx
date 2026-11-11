// SeuPlanoScreen.jsx — "Seu plano" (handoff-meu-plano-47, P6, HANDOFF §9):
// tela nova, aberta pela linha "Seu plano" do Meu Plano (some em dia de
// estudo). Guarda o que é para consultar: onde a leitura está, quando
// termina, a semana por extenso (sete linhas, sem bolinhas), "Mudar meus
// dias" (→ Ajustar com a Leitura aberta em "EM QUE DIAS"), "Organizar a
// leitura" (35i) e "Lembrete diário" (como hoje, no Perfil). Push, sem
// barra de abas. Cálculo em src/meuPlano/seuPlanoMath.js (puro, testado).
import { useEffect, useMemo, useState } from 'react'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'
import { getStepDays } from '../routine/stepDaysStore'
import { computeProjection } from '../plan/readingProjection'
import { getUseLearnedPace } from '../reading/readingPaceStore'
import { getMyReminderSchedule } from '../notifications/pushStore'
import { resolveMinutes, stepName } from '../meuPlano/meuPlanoMath'
import { computeWeekRows, daysWithSomething, countDaysWithSomething, paceSentence, readingHeadline, readingSubline, reminderLine } from '../meuPlano/seuPlanoMath'
import { BIBLE_CHAPTERS } from '../data/gamificationBlocks'

const FONT = 'var(--font-bento)'

export default function SeuPlanoScreen({ session, completedSet, stepMinutes, onBack, onNavigate, onChangeDays }) {
  const { lang, plan, routineModules, dailyRoutine, currentBlock, chaptersRead, hasNoPlan } = session
  const [stepDays, setStepDays] = useState(null)
  const [useLearnedPace, setUseLearnedPace] = useState(false)
  const [reminder, setReminder] = useState(null)

  useEffect(() => {
    let alive = true
    getStepDays().then(d => { if (alive) setStepDays(d) }).catch(err => console.error('[seu plano] dias', err))
    getUseLearnedPace().then(v => { if (alive) setUseLearnedPace(!!v) }).catch(() => {})
    getMyReminderSchedule().then(r => { if (alive) setReminder(r) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const minutes = useMemo(() => resolveMinutes(stepMinutes, plan), [stepMinutes, plan])
  const rows = useMemo(() => (stepDays ? computeWeekRows({ stepDays, routineModules, minutes, dailyRoutine }) : []), [stepDays, routineModules, minutes, dailyRoutine])
  const readingDays = stepDays ? stepDays.reading.filter(Boolean).length : 0
  const proj = stepDays && !hasNoPlan ? computeProjection({ completedSet, readingMinutesPerDay: minutes.reading, weeklyDays: stepDays.reading, lang }) : null
  const planName = t('routine.bibleWholeLabel', undefined, lang)
  const bar = Math.round((Math.min(chaptersRead, BIBLE_CHAPTERS) / BIBLE_CHAPTERS) * 100)

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>Seu plano</p>
        <button type="button" style={s.adjustBtn} onClick={() => onNavigate?.('adjustPlan')}>
          <AppIcon name="SlidersHorizontal" size={15} strokeWidth={2.2} color="var(--bento-ink)" />
          Ajustar
        </button>
      </div>

      <div style={s.body}>
        <div style={s.card}>
          <div style={s.cardHead}>
            <p style={s.label}>LEITURA</p>
            <p style={s.planName}>{planName}</p>
          </div>
          {currentBlock?.book && currentBlock?.chapter && (
            <p style={s.headline}>{readingHeadline(currentBlock.book, currentBlock.chapter, currentBlock.bookChapters)}</p>
          )}
          <p style={s.subline}>{readingSubline(currentBlock?.name ?? '', chaptersRead ?? 0, BIBLE_CHAPTERS)}</p>
          <div style={s.track} role="progressbar" aria-valuemin={0} aria-valuemax={BIBLE_CHAPTERS} aria-valuenow={chaptersRead ?? 0}>
            {chaptersRead > 0 && <span style={{ ...s.fill, width: `max(8px, ${bar}%)` }} />}
          </div>
          <div style={s.divider} />
          {proj?.finishDateLabel ? (
            <>
              <p style={s.finish}>Termina em {proj.finishDateLabel}</p>
              <p style={s.pace}>{paceSentence(proj.chaptersPerDay, useLearnedPace, readingDays)}</p>
            </>
          ) : (
            stepDays && <div className="rb-context-skeleton" style={{ height: 36, borderRadius: 8, background: 'var(--bento-line)' }} />
          )}
        </div>

        <div style={s.weekCard}>
          <div style={{ ...s.cardHead, marginBottom: 0 }}>
            <p style={s.label}>SUA SEMANA</p>
            <p style={s.planName}>{daysWithSomething(countDaysWithSomething(stepDays, routineModules))}</p>
          </div>
          {rows.length === 0 ? (
            <div className="rb-context-skeleton" style={{ height: 300, borderRadius: 12, background: 'var(--bento-line)', margin: '14px 0' }} />
          ) : rows.map((row, i) => {
            const dayStyle = row.isToday ? s.dayToday : row.state === 'done' ? s.dayDone : s.dayOther
            return (
              <div key={row.key} style={{ ...s.weekRow, ...(i > 0 ? s.weekRowDivider : {}) }}>
                <div style={{ ...s.day, ...dayStyle.box }} aria-label={`${row.abbr} ${row.dayNumber}${row.isToday ? ', hoje' : ''}`}>
                  <span style={{ ...s.dayAbbr, color: dayStyle.abbr }}>{row.abbr}</span>
                  <span style={{ ...s.dayNum, color: dayStyle.num }}>{row.dayNumber}</span>
                </div>
                {row.state === 'rest' ? (
                  <span style={s.restText}>Dia de descanso</span>
                ) : (
                  <>
                    <div style={s.chips}>
                      {row.chips.map(c => (
                        <span key={c.key} style={{ ...s.chip, ...s.chip_[c.state] }}>{stepName(c.key)}</span>
                      ))}
                    </div>
                    {row.fulfilled
                      ? <span style={s.rightDone}>feito</span>
                      : <span style={s.rightMin}>{row.minutes} min</span>}
                  </>
                )}
              </div>
            )
          })}
        </div>

        <button type="button" style={s.changeDays} onClick={() => onChangeDays?.()}>
          <AppIcon name="SlidersHorizontal" size={15} strokeWidth={2.2} color="var(--bento-ink)" />
          Mudar meus dias
        </button>

        <div style={s.list}>
          <button type="button" style={{ ...s.row, borderBottom: '1px solid var(--bento-line)' }} onClick={() => onNavigate?.('readingOrganize')}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={s.rowTitle}>Organizar a leitura</span>
              <span style={s.rowSub}>Onde começar, ordem e ritmo</span>
            </span>
            <AppIcon name="ChevronRight" size={14} strokeWidth={2} color="var(--bento-t5)" />
          </button>
          <button type="button" style={s.row} onClick={() => onNavigate?.('profile')}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={s.rowTitle}>Lembrete diário</span>
              <span style={s.rowSub}>{reminderLine(reminder) ?? t('routine.dailyReminderOff', undefined, lang)}</span>
            </span>
            <AppIcon name="ChevronRight" size={14} strokeWidth={2} color="var(--bento-t5)" />
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  adjustBtn: { height: 34, flexShrink: 0, padding: '0 12px', borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 22px', display: 'flex', flexDirection: 'column', gap: 12 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 18px 16px' },
  cardHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  planName: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', margin: 0 },
  headline: { fontFamily: FONT, fontSize: 24, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.9px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  subline: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 14px' },
  track: { height: 8, borderRadius: 99, background: 'var(--bento-line)', overflow: 'hidden', marginBottom: 16 },
  fill: { display: 'block', height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },
  divider: { height: 1, background: 'var(--bento-line)', marginBottom: 14 },
  finish: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--bento-ink)', margin: '0 0 4px' },
  pace: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  weekCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 16px 4px' },
  weekRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' },
  weekRowDivider: { borderTop: '1px solid var(--bento-line)' },
  day: { width: 40, height: 44, borderRadius: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, flexShrink: 0 },
  dayToday: { box: { background: 'var(--bento-accent)' }, abbr: 'var(--bento-ink)', num: 'var(--bento-ink)' },
  dayDone: { box: { background: 'var(--bento-ink)' }, abbr: 'rgba(255,255,255,.6)', num: '#fff' },
  dayOther: { box: { background: 'var(--bento-line)' }, abbr: 'var(--bento-t4)', num: 'var(--bento-ink)' },
  dayAbbr: { fontFamily: FONT, fontSize: 9, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', lineHeight: 1 },
  dayNum: { fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1 },
  chips: { flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 5 },
  chip: { height: 26, borderRadius: 9, padding: '0 9px', display: 'inline-flex', alignItems: 'center', fontFamily: FONT, fontSize: 11.5, fontWeight: 700 },
  chip_: {
    done: { background: 'var(--bento-sand-icon)', color: '#fff' },
    now: { background: 'var(--bento-accent)', color: 'var(--bento-ink)' },
    todo: { background: 'var(--bento-line)', color: 'var(--bento-ink)' },
  },
  rightDone: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-sand-icon)', flexShrink: 0 },
  rightMin: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)', flexShrink: 0 },
  restText: { flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t5)' },
  changeDays: { height: 46, minHeight: 46, flexShrink: 0, borderRadius: 15, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  list: { borderRadius: 24, background: 'var(--bento-card)', padding: '6px 18px' },
  row: { width: '100%', height: 56, display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' },
  rowTitle: { display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)' },
  rowSub: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', marginTop: 2 },
}
