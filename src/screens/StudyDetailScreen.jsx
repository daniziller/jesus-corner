// StudyDetailScreen.jsx — "O estudo por dentro" (41f, turno 41,
// handoff-estudos-41/). Aberta do cartão "Em andamento" de 41a ou de "Ver
// os 7 dias" em 41h (StudyOrganizeScreen.jsx). Só existe pro formato NOVO
// de Estudo (book/chStart/chEnd, ver isNewFormatStudy em App.jsx) — um
// Estudo do formato antigo continua com o "Ver os 7 dias" de sempre
// (lista simples, inline, em StudyOrganizeScreen.jsx).
//
// "Nos dias de estudo" — corrigido (2026-09-09, achado dela): Leitura e
// Estudo são passos 100% independentes, nunca se excluem; o único
// critério pra cada um cair num dia é o próprio calendário desse passo
// (Ajustar meu plano/StudyOrganizeScreen.jsx). O bloco 4 tinha introduzido
// um modo "substitui/soma" que fazia Estudo tirar a Leitura nos dias em
// que os dois coincidiam — revertido por inteiro (ver stepDaysMath.js);
// este card agora só explica a regra e linka pro calendário do estudo.
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { currentDayOf, nextScheduledDate } from '../studies/estudosStore'
import { formatWeekdayDate } from '../utils/weekdayDateLabel'
import { dateKey } from '../utils/dateKey'
import { naturalDayListSentence, WEEKDAY_ABBR3 } from '../routine/weeklyDaysMath'

const FONT = 'var(--font-bento)'
const INDIVIDUAL_FUTURE_COUNT = 2

function formatTotalMinutes(totalSeconds, lang) {
  const totalMin = Math.round((totalSeconds ?? 0) / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  return lang === 'en' ? `${h}h${String(m).padStart(2, '0')}` : `${h}h${String(m).padStart(2, '0')}`
}

export default function StudyDetailScreen({ session, study, stepDays, onBack, onOpenDay, onChangeStudyDays, onPause, onSwitchStudy }) {
  const { lang } = session
  const L = (k, vars) => t(`studyDetail.${k}`, vars, lang)

  const [expanded, setExpanded] = useState(false)

  const sessions = study.sessions ?? []
  const total = sessions.length
  const { index: currentIdx } = currentDayOf(study)
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0)

  const [titleMain, titleSub] = study.title?.includes(':')
    ? [study.title.split(':')[0].trim(), study.title.split(':').slice(1).join(':').trim()]
    : [study.title, null]

  // Datas projetadas dos dias futuros, encadeadas (dia N+1 a partir de
  // hoje, dia N+2 a partir da data do N+1, e assim por diante) — mesma
  // ideia de 41e, só que pra vários dias de uma vez.
  const futureDates = {}
  if (stepDays?.study) {
    let from = new Date()
    // Começa em currentIdx+1: nextScheduledDate(stepDays.study, hoje) já
    // é a data do PRÓXIMO dia de estudo depois de hoje — ou seja, a data
    // do dia currentIdx+1, não de currentIdx (que é hoje mesmo).
    for (let i = (currentIdx ?? total - 1) + 1; i < total; i++) {
      const next = nextScheduledDate(stepDays.study, from)
      if (!next) break
      futureDates[i] = next
      from = next
    }
  }

  const visibleIndices = []
  const collapsedIndices = []
  sessions.forEach((s, i) => {
    if (i <= (currentIdx ?? -1) + INDIVIDUAL_FUTURE_COUNT || expanded) visibleIndices.push(i)
    else collapsedIndices.push(i)
  })

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.headerTitle}>{titleMain}</p>
          <p style={s.headerSub}>{titleSub ? `${titleSub} · ` : ''}{L('daysCount', { n: total })}</p>
        </div>
        <span style={s.activeBadge}>{L('activeBadge')}</span>
      </div>

      <div style={s.body}>
        <div style={s.card}>
          <div style={s.cardHeadRow}>
            <p style={s.cardLabel}>{L('whereLabel')}</p>
            <p style={s.whereCount}>{L('whereCount', { done: Math.min((currentIdx ?? total - 1) + 1, total), total, time: formatTotalMinutes(totalSeconds, lang) })}</p>
          </div>
          <div style={s.trackRow}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} style={{ ...s.trackBar, background: i < currentIdx ? 'var(--bento-ink)' : i === currentIdx ? 'var(--bento-accent)' : 'var(--bento-line)' }} />
            ))}
          </div>
        </div>

        {visibleIndices.map(i => {
          const sess = sessions[i]
          const passageLabel = sess.chStart === sess.chEnd ? `${sess.book} ${sess.chStart}` : `${sess.book} ${sess.chStart}–${sess.chEnd}`
          const isDone = !!sess.completedAt
          const isToday = i === currentIdx
          if (isDone) {
            return (
              <div key={sess.id ?? i} style={s.dayRow}>
                <span style={s.dayNumDone}><AppIcon name="Check" size={14} strokeWidth={2.8} color="var(--bento-accent)" /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.dayTitle}>{passageLabel}</p>
                  <p style={s.daySubQuote}>{sess.answer ? `“${sess.answer}”` : L('skippedNote')}</p>
                </div>
                <span style={s.dayMinutes}>{Math.max(1, Math.round((sess.durationSeconds ?? 0) / 60))} min</span>
              </div>
            )
          }
          if (isToday) {
            return (
              <div key={sess.id ?? i} style={s.dayCardToday}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={s.dayNumToday}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.dayTitleToday}>{passageLabel}</p>
                    <p style={s.daySubToday}>{L('todayLabel', { min: Math.max(1, sess.minutes ?? studyMinutes) })}{sess.draft ? ` · ${L('draftSaved')}` : ''}</p>
                  </div>
                </div>
                <button style={s.resumeBtn} onClick={onOpenDay}>{sess.draft ? L('resumeDay', { n: i + 1 }) : L('doDay', { n: i + 1 })}</button>
              </div>
            )
          }
          const projected = futureDates[i]
          return (
            <div key={sess.id ?? i} style={s.dayRowFuture}>
              <span style={s.dayNumFuture}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={s.dayTitleFuture}>{passageLabel}</p>
                {projected && <p style={s.daySubFuture}>{formatWeekdayDate(dateKey(projected), lang)}</p>}
              </div>
            </div>
          )
        })}

        {collapsedIndices.length > 0 && (
          <button style={s.collapsedRow} onClick={() => setExpanded(true)}>
            <p style={s.collapsedText}>{L('collapsedDays', { range: `${collapsedIndices[0] + 1}, ${collapsedIndices.slice(1, -1).map(i => i + 1).join(', ')}${collapsedIndices.length > 1 ? ` ${lang === 'en' ? 'and' : 'e'} ${collapsedIndices[collapsedIndices.length - 1] + 1}` : ''}`, books: collapsedIndices.map(i => lang === 'en' ? (sessions[i].bookEn ?? sessions[i].book) : sessions[i].book).join(lang === 'en' ? ', ' : ', ') })}</p>
            <AppIcon name="ChevronRight" size={16} color="var(--bento-t4)" />
          </button>
        )}

        {stepDays?.study && (
          <div style={s.sandCard}>
            <p style={s.sandLabel}>{L('studyDaysRuleLabel')}</p>
            <p style={s.sandIntro}>{L('studyDaysRuleIntro', { days: naturalDayListSentence(stepDays.study, WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt, lang) })}</p>
            <button style={s.changeDaysLink} onClick={onChangeStudyDays}>
              <span>{L('changeDaysLink')}</span>
              <AppIcon name="ChevronRight" size={15} color="var(--bento-sand-icon)" />
            </button>
          </div>
        )}
      </div>

      <div style={s.footer}>
        <button style={s.pauseBtn} onClick={onPause}>{L('pauseBtn')}</button>
        <button style={s.switchBtn} onClick={onSwitchStudy}>{L('switchBtn')}</button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  activeBadge: { flexShrink: 0, fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--bento-accent)', background: 'rgba(240,102,43,.14)', borderRadius: 99, padding: '7px 14px' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px' },
  cardHeadRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  whereCount: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', margin: 0 },
  trackRow: { display: 'flex', gap: 4 },
  trackBar: { flex: 1, height: 5, borderRadius: 3 },

  dayRow: { display: 'flex', alignItems: 'center', gap: 12, borderRadius: 22, background: 'var(--bento-card)', padding: '14px 18px' },
  dayNumDone: { width: 32, height: 32, flexShrink: 0, borderRadius: 12, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dayTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  daySubQuote: { fontFamily: FONT, fontSize: 12, fontWeight: 500, fontStyle: 'italic', color: 'var(--bento-t3)', margin: 0 },
  dayMinutes: { flexShrink: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t4)' },

  dayCardToday: { borderRadius: 24, background: 'var(--bento-ink)', padding: '16px 18px' },
  dayNumToday: { width: 32, height: 32, flexShrink: 0, borderRadius: 12, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)' },
  dayTitleToday: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 2px' },
  daySubToday: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },
  resumeBtn: { width: '100%', height: 46, borderRadius: 15, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },

  dayRowFuture: { display: 'flex', alignItems: 'center', gap: 12, borderRadius: 22, background: 'rgba(255,255,255,.55)', padding: '14px 18px' },
  dayNumFuture: { width: 32, height: 32, flexShrink: 0, borderRadius: 12, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-t4)' },
  dayTitleFuture: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-t4)', margin: '0 0 2px' },
  daySubFuture: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },

  collapsedRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', border: 'none', borderRadius: 22, background: 'rgba(255,255,255,.4)', padding: '14px 18px', cursor: 'pointer' },
  collapsedText: { flex: 1, minWidth: 0, textAlign: 'left', fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t3)', margin: 0 },

  sandCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 },
  sandLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: 0 },
  sandIntro: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-sand-ink-mid)', margin: '0 0 4px' },
  changeDaysLink: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', background: 'rgba(255,255,255,.5)', borderRadius: 16, padding: '13px 16px', marginTop: 4, cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-sand-ink-strong)' },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '10px 20px calc(20px + var(--safe-bottom))' },
  pauseBtn: { flex: 1, height: 50, borderRadius: 16, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  switchBtn: { flex: 1, height: 50, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,.5)', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-t4)', cursor: 'pointer' },
}
