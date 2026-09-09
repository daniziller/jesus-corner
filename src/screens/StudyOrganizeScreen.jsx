// StudyOrganizeScreen.jsx — "Estudo" (turno 35, Bloco 1, handoff-meu-
// plano-35/, tela 35j). Aberta de "Organizar o estudo" em 35c. Estudo em
// andamento (atalho pra ver os dias/encerrar), atalho pro banco de estudos
// (35h — ainda não existe, Bloco 4; por ora leva pra Estudos/addStudy),
// dias do estudo (independentes dos da Bíblia) e o que fazer quando o
// estudo ativo terminar.
//
// "Ver os 7 dias": pro Estudo do formato novo (book/chStart/chEnd, ver
// turno 41 handoff-estudos-41/) abre 41f (StudyDetailScreen.jsx) de
// verdade, com o "trocar"/substituir-soma completos. Pra um Estudo do
// formato antigo (sections/reflectionQuestions, de antes do turno 41),
// continua abrindo a lista inline só de leitura de sempre — nunca existiu
// um 41f equivalente pra esse formato.
import { useEffect, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import WeekdayChipRow from '../components/WeekdayChipRow'
import { getStepDays, setStepDays as persistStepDays } from '../routine/stepDaysStore'
import { STUDIES } from '../data/studies'
import { getAiStudies } from '../studies/aiStudiesStore'
import { getInductiveStudies } from '../studies/inductiveStudiesStore'
import { getCompletedStudySessions, isStudySessionDone } from '../studies/studiesProgressStore'
import { getStudyFinishPrefs, setStudyFinishPrefs } from '../studies/studyFinishPrefsStore'
import { naturalDayListSentence } from '../routine/weeklyDaysMath'

function weeksLabel(totalDays, daysPerWeek, lang) {
  const L = (k, vars) => t(`studyOrganize.${k}`, vars, lang)
  if (daysPerWeek <= 0) return ''
  const weeks = totalDays / daysPerWeek
  const rounded = Math.round(weeks * 2) / 2
  if (Number.isInteger(rounded)) return L(rounded === 1 ? 'weeksOne' : 'weeksMany', { n: rounded })
  return L('weeksHalf', { n: Math.floor(rounded) })
}

export default function StudyOrganizeScreen({ session, onEndStudy, onNavigate, onBack, onOpenStudyDetail }) {
  const { lang, activeStudyId } = session
  const L = (k, vars) => t(`studyOrganize.${k}`, vars, lang)
  const abbr = { pt: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }[lang] ?? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  const [stepDays, setStepDaysState] = useState(null)
  const [study, setStudy] = useState(null)
  const [source, setSource] = useState(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [nextSaved, setNextSaved] = useState(null)
  const [finishPrefs, setFinishPrefsState] = useState(null)
  const [showDays, setShowDays] = useState(false)
  const [completedStudySet, setCompletedStudySet] = useState(() => new Set())

  useEffect(() => {
    getStepDays().then(setStepDaysState).catch(() => {})
    getStudyFinishPrefs().then(setFinishPrefsState).catch(() => {})
    Promise.all([getAiStudies(), getInductiveStudies(), getCompletedStudySessions()]).then(([ai, inductive, doneSet]) => {
      setCompletedStudySet(doneSet)
      const active = activeStudyId ? [...STUDIES, ...ai, ...inductive].find(s => s.id === activeStudyId) : null
      setStudy(active ?? null)
      setSource(active ? (ai.some(s => s.id === active.id) ? 'ai' : inductive.some(s => s.id === active.id) ? 'inductive' : 'jesusCorner') : null)
      if (active) {
        const total = active.sessions?.length ?? 0
        const done = (active.sessions ?? []).filter(s => isStudySessionDone(doneSet, active.id, s.id)).length
        setProgress({ done, total })
      }
      const queued = ai.find(s => s.id !== activeStudyId)
      setNextSaved(queued ?? null)
    }).catch(() => {})
  }, [activeStudyId])

  const daysPerWeek = stepDays ? stepDays.study.filter(Boolean).length : 0
  // "Seg, qua e sex voltam a ser leitura contínua" — frase, não rótulo
  // (ver naturalDayListSentence, diferente do join simples usado em 35c/35i).
  const studyDaysAbbr = stepDays ? naturalDayListSentence(stepDays.study, abbr, lang) : ''

  // Formato real do estudo (plano temático/livro/tema/grupo — regra 3:
  // "quando o formato muda, a frase muda junto"), não mais fixo em
  // "plano temático" pra qualquer estudo criado.
  function sourceLabel() {
    if (source === 'ai') {
      const format = study?.format ?? 'thematic'
      const formatLabel = t(`createStudy.format${format[0].toUpperCase()}${format.slice(1)}Label`, undefined, lang)
      return t('studyOrganize.createdByAi', { format: formatLabel }, lang) || ''
    }
    if (source === 'inductive') return t('studyOrganize.createdInductive', undefined, lang) || ''
    return t('studyOrganize.createdByJesusCorner', undefined, lang) || ''
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={styles.headerTitle}>{L('title')}</p>
          <p style={styles.headerSubtitle}>{L('subtitle')}</p>
        </div>
      </div>

      <div style={styles.body}>
        <div style={{ ...styles.card, background: 'var(--bento-sand)' }}>
          {study ? (
            <>
              <div style={styles.stepsHead}>
                <p style={{ ...styles.sectionLabel, color: 'var(--bento-sand-label)' }}>{L('inProgressLabel')}</p>
                <p style={styles.sandCount}>{L('dayXofY', { n: progress.done + 1 <= progress.total ? progress.done + 1 : progress.total, total: progress.total })}</p>
              </div>
              <p style={styles.studyTitle}>{study.title ?? study.titleEn ?? ''}</p>
              <p style={styles.studySub}>{sourceLabel()}</p>
              {progress.total > 0 && (
                <div style={styles.trailRow}>
                  {Array.from({ length: progress.total }, (_, i) => (
                    <span key={i} style={{ ...styles.trailSeg, background: i < progress.done ? 'var(--bento-sand-icon)' : 'rgba(122,74,30,.18)' }} />
                  ))}
                </div>
              )}
              <div style={styles.actionsRow}>
                <button
                  style={styles.seeDaysBtn}
                  onClick={() => (study.sessions?.[0]?.book ? onOpenStudyDetail?.() : setShowDays(v => !v))}
                >
                  {progress.total === 1 ? L('seeDaysOne') : L('seeDaysMany', { n: progress.total })}
                </button>
                <button style={styles.endBtn} onClick={onEndStudy}>{L('end')}</button>
              </div>
              {/* "Ver os 7 dias" agora abre 41f (StudyDetailScreen.jsx) pra
                  um Estudo do formato novo (book/chStart/chEnd) — a lista
                  inline abaixo (showDays) sobrevive só pra formato antigo
                  (sections/reflectionQuestions, de antes deste bloco). */}
              {showDays && !study.sessions?.[0]?.book && (
                <div style={styles.daysList}>
                  {(study.sessions ?? []).map((s, i) => (
                    <div key={s.id ?? i} style={styles.daysListRow}>
                      <span style={{ ...styles.daysListIdx, ...(isStudySessionDone(completedStudySet, study.id, s.id) ? styles.daysListIdxDone : {}) }}>{i + 1}</span>
                      <span style={styles.daysListTitle}>{lang === 'en' ? (s.titleEn ?? s.title) : s.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p style={{ ...styles.sectionLabel, color: 'var(--bento-sand-label)' }}>{L('inProgressLabel')}</p>
              <p style={styles.studyTitle}>{L('noActiveTitle')}</p>
              <p style={styles.studySub}>{L('noActiveSub')}</p>
            </>
          )}
        </div>

        <button style={styles.darkCard} onClick={() => onNavigate?.('addStudy')}>
          <span style={styles.darkIcon}><AppIcon name="GraduationCap" size={18} color="var(--bento-sand-icon)" /></span>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <p style={styles.darkTitle}>{L('myStudies')}</p>
            <p style={styles.darkSub}>{L('myStudiesSub')}</p>
          </div>
          <AppIcon name="ArrowRight" size={16} color="var(--bento-accent)" />
        </button>

        <div style={{ ...styles.card, background: 'var(--bento-sand)' }}>
          <div style={styles.stepsHead}>
            <p style={{ ...styles.sectionLabel, color: 'var(--bento-sand-label)' }}>{L('daysLabel')}</p>
            <p style={styles.sandCount}>{L('daysCountMany', { n: daysPerWeek })}</p>
          </div>
          <p style={{ ...styles.hint, color: 'var(--bento-sand-ink-mid)' }}>
            {L('daysHintIndependent')} {progress.total > 0 && daysPerWeek > 0 ? L('daysHintCalendar', { total: progress.total, weeks: weeksLabel(progress.total, daysPerWeek, lang) }) : ''}
          </p>
          {stepDays && (
            <WeekdayChipRow
              days={stepDays.study}
              lang={lang}
              onChange={days => {
                setStepDaysState(prev => ({ ...prev, study: days }))
                persistStepDays({ study: days }).catch(err => console.error('Failed to persist study days', err))
              }}
            />
          )}
        </div>

        {finishPrefs && (
          <div style={styles.card}>
            <p style={styles.sectionLabel}>{L('whenFinishedLabel')}</p>
            <div style={styles.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.rowTitle}>{L('startNextTitle')}</p>
                <p style={styles.rowSub}>{nextSaved ? L('startNextSub', { title: nextSaved.title ?? nextSaved.titleEn ?? '' }) : L('startNextSubEmpty')}</p>
              </div>
              <button
                role="switch" aria-checked={finishPrefs.autoNext}
                onClick={() => { const next = { ...finishPrefs, autoNext: !finishPrefs.autoNext }; setFinishPrefsState(next); setStudyFinishPrefs({ autoNext: next.autoNext }).catch(() => {}) }}
                style={{ ...styles.switch, background: finishPrefs.autoNext ? 'var(--bento-accent)' : 'var(--bento-line)', justifyContent: finishPrefs.autoNext ? 'flex-end' : 'flex-start' }}
              >
                <span style={styles.switchThumb} />
              </button>
            </div>
            <div style={styles.divider} />
            <div style={styles.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.rowTitle}>{L('returnDaysTitle')}</p>
                <p style={styles.rowSub}>{studyDaysAbbr ? L('returnDaysSubDays', { days: studyDaysAbbr }) : L('returnDaysSubEmpty')}</p>
              </div>
              <button
                role="switch" aria-checked={finishPrefs.returnDays}
                onClick={() => { const next = { ...finishPrefs, returnDays: !finishPrefs.returnDays }; setFinishPrefsState(next); setStudyFinishPrefs({ returnDays: next.returnDays }).catch(() => {}) }}
                style={{ ...styles.switch, background: finishPrefs.returnDays ? 'var(--bento-accent)' : 'var(--bento-line)', justifyContent: finishPrefs.returnDays ? 'flex-end' : 'flex-start' }}
              >
                <span style={styles.switchThumb} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button style={styles.saveBtn} onClick={onBack}>{L('save')}</button>
      </div>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 16px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  headerSubtitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  sectionLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  stepsHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  sandCount: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-sand-icon)', margin: 0, flexShrink: 0 },
  studyTitle: { fontFamily: 'var(--font-bento)', fontSize: 20, fontWeight: 800, lineHeight: 1.15, color: 'var(--bento-sand-ink-strong)', margin: '0 0 4px' },
  studySub: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-sand-ink-mid)', margin: '0 0 14px' },
  trailRow: { display: 'flex', gap: 4, marginBottom: 16 },
  trailSeg: { flex: 1, height: 6, borderRadius: 99 },
  actionsRow: { display: 'flex', gap: 10 },
  seeDaysBtn: { flex: 1, height: 48, borderRadius: 16, border: 'none', background: 'var(--bento-sand-icon)', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  endBtn: { flex: 1, height: 48, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,.5)', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 700, color: 'var(--bento-sand-ink-mid)', cursor: 'pointer' },
  daysList: { marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 },
  daysListRow: { display: 'flex', alignItems: 'center', gap: 10 },
  daysListIdx: { width: 22, height: 22, flexShrink: 0, borderRadius: '50%', background: 'rgba(122,74,30,.18)', color: 'var(--bento-sand-ink-mid)', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  daysListIdxDone: { background: 'var(--bento-sand-icon)', color: '#fff' },
  daysListTitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 600, color: 'var(--bento-sand-ink-strong)' },

  darkCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', border: 'none', borderRadius: 28, background: 'var(--bento-ink)', padding: '18px 20px', cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  darkIcon: { width: 40, height: 40, flexShrink: 0, borderRadius: 12, background: 'rgba(240,102,43,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  darkTitle: { fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 3px' },
  darkSub: { fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0, lineHeight: 1.3 },

  hint: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 12px' },

  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' },
  rowTitle: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 3px' },
  rowSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  divider: { height: 1, background: 'var(--bento-line)', margin: '2px 0' },
  switch: { width: 46, height: 28, flexShrink: 0, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' },
  switchThumb: { width: 22, height: 22, borderRadius: '50%', background: '#fff' },

  footer: { flexShrink: 0, padding: '16px 20px calc(22px + var(--safe-bottom))' },
  saveBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: 'var(--font-bento)', fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
}
