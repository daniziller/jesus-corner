import { useState, useEffect } from 'react'
import { STUDIES } from '../data/studies'
import { getCompletedStudySessions, setStudySessionDone, isStudySessionDone } from '../studies/studiesProgressStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function StudiesScreen({ session, authUser }) {
  const { lang } = session
  const [completedSet, setCompletedSet] = useState(() => new Set())
  const [openStudyId, setOpenStudyId] = useState(null)
  const [openSessionId, setOpenSessionId] = useState(null)

  useEffect(() => {
    if (!authUser) return
    getCompletedStudySessions(authUser.email).then(setCompletedSet)
  }, [authUser?.email])

  function toggleSessionDone(studyId, sessionId, done) {
    if (!authUser) return
    const key = `${studyId}:${sessionId}`
    const optimistic = new Set(completedSet)
    if (done) optimistic.add(key)
    else optimistic.delete(key)
    setCompletedSet(optimistic)
    setStudySessionDone(authUser.email, studyId, sessionId, done).catch(err => {
      console.error('Failed to persist study progress', err)
    })
  }

  const openStudy = STUDIES.find(s => s.id === openStudyId) ?? null
  const openSession = openStudy?.sessions.find(s => s.id === openSessionId) ?? null

  // No celular, master (lista) e detail (detalhe/sessão) funcionam como
  // antes — uma tela cheia de cada vez, trocando via hide-on-mobile conforme
  // openStudyId. No desktop (≥1024px) as duas ficam sempre visíveis lado a
  // lado (ver .master-detail/.master-pane/.detail-pane em index.css —
  // padrão compartilhado com GroupsScreen.jsx), então a lista nunca
  // "desaparece" quando um estudo é aberto.
  return (
    <div className="master-detail">
      <div className={`master-pane${openStudy ? ' hide-on-mobile' : ''}`} style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
        <div className="page-header">
          <h1 className="page-title">{t('studies.pageTitle', undefined, lang)}</h1>
        </div>
        <p style={styles.pageSubtitle}>{t('studies.pageSubtitle', undefined, lang)}</p>

        <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STUDIES.map(study => (
            <StudyCard
              key={study.id}
              study={study}
              lang={lang}
              completedSet={completedSet}
              onOpen={() => setOpenStudyId(study.id)}
            />
          ))}
        </div>
      </div>

      <div className={`detail-pane${!openStudy ? ' hide-on-mobile' : ''}`}>
        {openStudy && openSession && (
          <SessionView
            study={openStudy}
            studySession={openSession}
            lang={lang}
            isDone={isStudySessionDone(completedSet, openStudy.id, openSession.id)}
            onToggleDone={done => toggleSessionDone(openStudy.id, openSession.id, done)}
            onBack={() => setOpenSessionId(null)}
          />
        )}
        {openStudy && !openSession && (
          <StudyDetail
            study={openStudy}
            lang={lang}
            completedSet={completedSet}
            onOpenSession={id => setOpenSessionId(id)}
            onBack={() => setOpenStudyId(null)}
          />
        )}
        {!openStudy && <StudiesEmptyState lang={lang} />}
      </div>
    </div>
  )
}

// Só aparece no desktop (no celular .detail-pane fica hide-on-mobile
// enquanto nada foi aberto) — indica que é preciso escolher um estudo na
// lista à esquerda antes de ver o conteúdo aqui.
function StudiesEmptyState({ lang }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, textAlign: 'center' }}>
      <AppIcon name="GraduationCap" size={30} color="var(--g4)" />
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--g5)' }}>{t('studies.emptyStateTitle', undefined, lang)}</p>
      <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--g4)', maxWidth: 260 }}>{t('studies.emptyStateSub', undefined, lang)}</p>
    </div>
  )
}

function StudyCard({ study, lang, completedSet, onOpen }) {
  const title = lang === 'en' ? study.titleEn : study.title
  const subtitle = lang === 'en' ? study.subtitleEn : study.subtitle
  const doneCount = study.sessions.filter(s => isStudySessionDone(completedSet, study.id, s.id)).length
  const total = study.sessions.length
  const percent = total ? Math.round((doneCount / total) * 100) : 0
  const label =
    doneCount === 0 ? t('studies.startStudy', undefined, lang)
    : doneCount === total ? t('studies.reviewStudy', undefined, lang)
    : t('studies.continueStudy', undefined, lang)

  return (
    <div style={styles.studyCard} onClick={onOpen}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={styles.studyIcon}>
          <AppIcon name={study.icon} size={22} color="var(--or)" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={styles.studyTitle}>{title}</h3>
          <p style={styles.studySubtitle}>{subtitle}</p>
        </div>
      </div>
      <div style={{ height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden', margin: '12px 0 8px' }}>
        <div style={{ height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, width: `${percent}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={styles.studyMeta}>{t('studies.sessionsDoneCount', { done: doneCount, total }, lang)}</span>
        <span style={styles.studyCta}>{label}</span>
      </div>
    </div>
  )
}

function StudyDetail({ study, lang, completedSet, onOpenSession, onBack }) {
  const title = lang === 'en' ? study.titleEn : study.title

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={styles.backBtn} aria-label="back">
          <AppIcon name="ArrowLeft" size={19} color="var(--bk)" />
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {study.sessions.map(s => {
          const done = isStudySessionDone(completedSet, study.id, s.id)
          const sTitle = lang === 'en' ? s.titleEn : s.title
          const passage = lang === 'en' ? s.passageEn : s.passage
          return (
            <div key={s.id} style={styles.sessionRow} onClick={() => onOpenSession(s.id)}>
              <div style={{ ...styles.sessionIcon, background: done ? 'var(--grad-vivid)' : 'var(--g1)' }}>
                {done
                  ? <AppIcon name="Check" size={15} color="white" />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--g5)' }}>{s.id}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={styles.sessionTitle}>{sTitle}</p>
                <p style={styles.sessionSub}>{passage}</p>
              </div>
              {done && <span style={styles.doneBadge}>{t('studies.sessionDoneBadge', undefined, lang)}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SessionView({ study, studySession, lang, isDone, onToggleDone, onBack }) {
  const title = lang === 'en' ? studySession.titleEn : studySession.title
  const passage = lang === 'en' ? studySession.passageEn : studySession.passage
  const sectionLabelKeys = { historical: 'studies.sectionHistorical', geographical: 'studies.sectionGeographical', theological: 'studies.sectionTheological' }
  const questions = lang === 'en' ? studySession.reflectionQuestionsEn : studySession.reflectionQuestions

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={styles.backBtn} aria-label="back">
          <AppIcon name="ArrowLeft" size={19} color="var(--bk)" />
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div style={{ padding: '4px 14px 4px' }}>
        <div style={styles.hero}>
          <p style={styles.heroPassage}>{passage}</p>
        </div>
      </div>

      <div style={{ padding: '10px 14px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {studySession.sections.map(section => (
          <div key={section.key} style={styles.panel}>
            <p style={styles.panelLabel}>{t(sectionLabelKeys[section.key], undefined, lang)}</p>
            <p style={styles.panelText}>{lang === 'en' ? section.bodyEn : section.body}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 14px 4px' }}>
        <div style={styles.panel}>
          <p style={styles.panelLabel}>
            <AppIcon name="PenLine" size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {t('studies.reflectionTitle', undefined, lang)}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {questions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span style={styles.qNumber}>{i + 1}</span>
                <p style={styles.panelText}>{q}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 14px 14px' }}>
        <button
          style={{ ...styles.completeBtn, ...(isDone ? styles.completeBtnDone : {}) }}
          onClick={() => onToggleDone(!isDone)}
        >
          {isDone ? t('reading.markUndone', undefined, lang) : t('reading.markDone', undefined, lang)}
        </button>
      </div>
    </div>
  )
}

const styles = {
  pageSubtitle: { fontSize: 12, fontWeight: 500, color: 'var(--g5)', padding: '0 14px', marginTop: -6, marginBottom: 8 },
  backBtn:      { width: 32, height: 32, borderRadius: 10, border: '0.5px solid var(--g2)', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  studyCard:    { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: 14, boxShadow: 'var(--shadow-card)', cursor: 'pointer' },
  studyIcon:    { width: 44, height: 44, borderRadius: 13, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  studyTitle:   { fontSize: 14.5, fontWeight: 800, color: 'var(--bk)', marginBottom: 3, letterSpacing: '-0.2px' },
  studySubtitle:{ fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5 },
  studyMeta:    { fontSize: 10.5, fontWeight: 600, color: 'var(--g5)' },
  studyCta:     { fontSize: 11, fontWeight: 700, color: 'var(--or)' },
  sessionRow:   { display: 'flex', alignItems: 'center', gap: 11, background: 'white', border: '0.5px solid var(--g1)', borderRadius: 15, padding: 12, cursor: 'pointer', boxShadow: 'var(--shadow-card)' },
  sessionIcon:  { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sessionTitle: { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)', marginBottom: 2 },
  sessionSub:   { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)' },
  doneBadge:    { fontSize: 9, fontWeight: 700, color: 'var(--gr)', whiteSpace: 'nowrap' },
  hero:         { background: 'var(--grad-vivid)', borderRadius: 18, padding: 16, boxShadow: 'var(--shadow-glow)' },
  heroPassage:  { fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.2px' },
  panel:        { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow-card)' },
  panelLabel:   { fontSize: 9.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  panelText:    { fontSize: 12.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.6 },
  qNumber:      { width: 20, height: 20, borderRadius: '50%', background: 'var(--or)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  completeBtn:      { width: '100%', background: 'var(--grad-vivid)', border: 'none', borderRadius: 13, padding: 12, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-glow)' },
  completeBtnDone:  { background: 'var(--g1)', color: 'var(--g5)', boxShadow: 'none', border: '0.5px solid var(--g2)' },
}
