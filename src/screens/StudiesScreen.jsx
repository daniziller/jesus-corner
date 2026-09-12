import { useState, useEffect } from 'react'
import { STUDIES } from '../data/studies'
import { getCompletedStudySessions, setStudySessionDone, isStudySessionDone } from '../studies/studiesProgressStore'
import { generateStudy, getAiStudies, saveAiStudy, deleteAiStudy } from '../studies/aiStudiesStore'
import RoutineStepSwitcher from '../components/RoutineStepSwitcher'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function StudiesScreen({ session, authUser, onNavigate, onContinueSession, onMarkRoutineStep, onSelectActiveStudy, autoOpenStudyId, onAutoOpenStudyConsumed }) {
  const { lang, activeStudyId } = session
  const [completedSet, setCompletedSet] = useState(() => new Set())
  const [openStudyId, setOpenStudyId] = useState(null)
  const [openSessionId, setOpenSessionId] = useState(null)
  // Estudos criados por IA (ver "Criar estudo por tema" abaixo) — somados
  // aos estáticos de STUDIES numa lista só (allStudies), mesmo formato de
  // item (StudyDetail/SessionView não precisam saber a origem de cada um).
  const [aiStudies, setAiStudies] = useState([])
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  useEffect(() => {
    if (!authUser) return
    getCompletedStudySessions(authUser.email).then(setCompletedSet)
    getAiStudies(authUser.email).then(setAiStudies)
  }, [authUser?.email])

  const allStudies = [...STUDIES, ...aiStudies]

  // Abrir automaticamente vindo de um card de Estudo na Biblioteca (ver
  // NotesScreen.jsx/App.jsx) — espera o estudo aparecer em allStudies (na
  // 1ª visita, aiStudies ainda pode estar carregando). Consome (limpa no
  // App.jsx) assim que abre, senão voltar depois pra esta aba pela barra
  // reabriria o mesmo estudo de novo.
  useEffect(() => {
    if (!autoOpenStudyId) return
    const target = allStudies.find(s => s.id === autoOpenStudyId)
    if (!target) return
    setOpenStudyId(target.id)
    onAutoOpenStudyConsumed?.()
  })

  async function handleGenerate() {
    if (!title.trim() || !scope.trim() || generating) return
    setGenerating(true)
    setGenError('')
    try {
      const study = await generateStudy(title.trim(), scope.trim(), lang)
      const updated = await saveAiStudy(authUser.email, study)
      setAiStudies(updated)
      setCreating(false)
      setTitle('')
      setScope('')
      setOpenStudyId(study.id)
    } catch (err) {
      console.error('Failed to generate study', err)
      setGenError(
        err.message === 'subscription_required' ? t('studies.createByThemeSubscriptionRequired', undefined, lang)
        : err.message === 'study_limit_reached' ? t('studies.createByThemeLimitReached', undefined, lang)
        : t('studies.createByThemeError', undefined, lang)
      )
    } finally {
      setGenerating(false)
    }
  }

  // Só estudos criados por IA (não os estáticos de STUDIES) podem ser
  // apagados. Se o estudo apagado era o aberto/ativo, limpa ambos pra não
  // deixar ponteiro pra um estudo que não existe mais.
  async function handleDeleteStudy(study) {
    if (!window.confirm(t('studies.deleteConfirm', undefined, lang))) return
    try {
      const updated = await deleteAiStudy(authUser.email, study.id)
      setAiStudies(updated)
      if (openStudyId === study.id) { setOpenStudyId(null); setOpenSessionId(null) }
      if (session.activeStudyId === study.id) onSelectActiveStudy?.(null)
    } catch (err) {
      console.error('Failed to delete study', err)
    }
  }

  // Concluir uma sessão do estudo ATIVO (o escolhido em "Meu Plano" pra
  // seguir dia após dia — ver session.activeStudyId) também marca o passo
  // "Estudo guiado" de hoje na rotina, mesmo padrão de onPrayerCompleted/
  // onReflectionCompleted. Sessões de OUTROS estudos (não o ativo) não
  // contam — só progresso salvo, sem refletir na rotina do dia.
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
    if (done && studyId === session.activeStudyId) onMarkRoutineStep?.('study', true)
  }

  const openStudy = allStudies.find(s => s.id === openStudyId) ?? null
  const openSession = openStudy?.sessions.find(s => s.id === openSessionId) ?? null

  // No celular, master (lista) e detail (detalhe/sessão) funcionam como
  // antes — uma tela cheia de cada vez, trocando via hide-on-mobile conforme
  // openStudyId. No desktop (≥768px) as duas ficam sempre visíveis lado a
  // lado (ver .master-detail/.master-pane/.detail-pane em index.css —
  // padrão compartilhado com GroupsScreen.jsx), então a lista nunca
  // "desaparece" quando um estudo é aberto.
  return (
    <div className="master-detail">
      <div className={`master-pane${openStudy ? ' hide-on-mobile' : ''}`} style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
        {/* Título + subtítulo — antes só aparecia no desktop (o Figma nunca
            teve um quadro mobile pra Estudos), então no celular a única
            identidade visível era o AppHeader antigo (logo) por cima. Ela
            reparou que abrir um estudo ainda "parecia" o app antigo por
            causa disso — 2026-09-09: cabeçalho próprio (mesmos tokens
            bento de sempre) agora sempre visível, igual
            Rotina/Início/Comunidade; 'studies' também saiu do AppHeader
            (ver bentoScreen em App.jsx). */}
        <div style={styles.topHeader}>
          <h1 style={styles.pageTitle}>{t('studies.pageTitle', undefined, lang)}</h1>
          <p style={styles.pageSubtitle}>{t('studies.pageSubtitle', undefined, lang)}</p>
        </div>

        <RoutineStepSwitcher
          session={session}
          activeStep="study"
          onGoPrayer={() => onNavigate?.('prayer')}
          onGoReading={() => onContinueSession?.()}
          onGoReflection={() => onNavigate?.('reflection')}
        />

        <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Criar estudo por tema é gerado por IA — só no tier Premium + IA. */}
          {session.hasAI && (creating ? (
            <div style={styles.createCard}>
              <p style={styles.createLabel}>{t('studies.createByThemeTitleLabel', undefined, lang)}</p>
              <input
                type="text"
                style={styles.themeInput}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('studies.createByThemeTitlePlaceholder', undefined, lang)}
                maxLength={60}
                autoFocus
              />
              <p style={{ ...styles.createLabel, marginTop: 14 }}>{t('studies.createByThemeScopeLabel', undefined, lang)}</p>
              <textarea
                style={styles.scopeInput}
                value={scope}
                onChange={e => setScope(e.target.value)}
                placeholder={t('studies.createByThemeScopePlaceholder', undefined, lang)}
                maxLength={200}
                rows={3}
              />
              {genError && <p style={styles.errorText}>{genError}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button style={styles.generateBtn} onClick={handleGenerate} disabled={generating || !title.trim() || !scope.trim()}>
                  {generating ? t('studies.createByThemeGenerating', undefined, lang) : t('studies.createByThemeGenerateBtn', undefined, lang)}
                </button>
                <button style={styles.cancelBtn} onClick={() => { setCreating(false); setGenError('') }} disabled={generating}>
                  {t('studies.createByThemeCancel', undefined, lang)}
                </button>
              </div>
              {generating && <p style={styles.generatingHint}>{t('studies.createByThemeGeneratingHint', undefined, lang)}</p>}
            </div>
          ) : (
            <button style={styles.newStudyBtn} onClick={() => setCreating(true)}>
              <AppIcon name="Sparkles" size={16} color="white" />
              {t('studies.createByThemeBtn', undefined, lang)}
            </button>
          ))}

          {[...STUDIES, ...aiStudies].map(study => (
            <StudyCard
              key={study.id}
              study={study}
              lang={lang}
              completedSet={completedSet}
              isActiveStudy={activeStudyId === study.id}
              onOpen={() => setOpenStudyId(study.id)}
              onDelete={aiStudies.some(s => s.id === study.id) ? () => handleDeleteStudy(study) : null}
              onSetActive={() => onSelectActiveStudy?.(activeStudyId === study.id ? null : study.id, study.sessions?.length ?? 0)}
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
      <AppIcon name="GraduationCap" size={30} color="var(--bento-t4)" />
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-t5)' }}>{t('studies.emptyStateTitle', undefined, lang)}</p>
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', maxWidth: 260 }}>{t('studies.emptyStateSub', undefined, lang)}</p>
    </div>
  )
}

function StudyCard({ study, lang, completedSet, isActiveStudy, onOpen, onDelete, onSetActive }) {
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
    <div style={{ ...styles.studyCard, ...(isActiveStudy ? styles.studyCardActive : {}) }} onClick={onOpen}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={styles.studyIcon}>
          <AppIcon name={study.icon} size={22} color="var(--bento-accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={styles.studyTitle}>{title}</h3>
          {isActiveStudy && (
            <div style={styles.studyBadgeRow}>
              <span style={styles.currentStudyBadge}>{t('studies.currentStudyBadge', undefined, lang)}</span>
            </div>
          )}
          <p style={styles.studySubtitle}>{subtitle}</p>
        </div>
        <button
          style={styles.studyStarBtn}
          onClick={e => { e.stopPropagation(); onSetActive?.() }}
          aria-label={t(isActiveStudy ? 'studies.unsetCurrentAction' : 'studies.setCurrentAction', undefined, lang)}
          title={t(isActiveStudy ? 'studies.unsetCurrentAction' : 'studies.setCurrentAction', undefined, lang)}
        >
          <AppIcon name="Star" size={16} color={isActiveStudy ? 'var(--bento-accent)' : 'var(--bento-t3)'} fill={isActiveStudy ? 'var(--bento-accent)' : 'none'} />
        </button>
        {onDelete && (
          <button
            style={styles.studyDeleteBtn}
            onClick={e => { e.stopPropagation(); onDelete() }}
            aria-label={t('studies.deleteAction', undefined, lang)}
          >
            <AppIcon name="Trash2" size={13} color="var(--bento-accent)" />
          </button>
        )}
      </div>
      <div style={{ height: 5, background: 'var(--bento-line)', borderRadius: 99, overflow: 'hidden', margin: '12px 0 8px' }}>
        <div style={{ height: '100%', background: 'var(--bento-accent)', borderRadius: 99, width: `${percent}%` }} />
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
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
      <div style={styles.detailHeader}>
        <button onClick={onBack} style={styles.backBtn} aria-label="back">
          <AppIcon name="ArrowLeft" size={19} color="var(--bento-ink)" />
        </button>
        <h1 style={styles.detailTitle}>{title}</h1>
      </div>

      <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {study.sessions.map(s => {
          const done = isStudySessionDone(completedSet, study.id, s.id)
          const sTitle = lang === 'en' ? s.titleEn : s.title
          const passageSub = lang === 'en' ? s.passageEn : s.passage
          return (
            <div key={s.id} style={styles.sessionRow} onClick={() => onOpenSession(s.id)}>
              <div style={{ ...styles.sessionIcon, background: done ? 'var(--bento-accent)' : 'var(--bento-line)' }}>
                {done
                  ? <AppIcon name="Check" size={15} color="white" />
                  : <span style={{ fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t5)' }}>{s.id}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.sessionTitle}>{sTitle}</p>
                <p style={styles.sessionSub}>{passageSub}</p>
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
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
      <div style={styles.detailHeader}>
        <button onClick={onBack} style={styles.backBtn} aria-label="back">
          <AppIcon name="ArrowLeft" size={19} color="var(--bento-ink)" />
        </button>
        <h1 style={styles.detailTitle}>{title}</h1>
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
  // Cabeçalho de topo (só desktop, ver hide-on-mobile acima) e cabeçalho
  // de sub-tela com seta de voltar — StudiesScreen ficou de fora do
  // bentoScreen do App.jsx (Etapa 12 antiga: "reskin só de cor, cabeçalho
  // antigo mantido"); migrados na varredura de identidade do Bloco 12
  // pra Manrope/tokens --bento-* (antes usavam .page-header/.page-title,
  // que ainda puxavam --font-display/--bk do index.css).
  topHeader:    { flexShrink: 0, padding: '22px 20px 0' },
  pageTitle:    { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.7px', color: 'var(--bento-ink)', margin: 0 },
  pageSubtitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t5)', margin: '4px 0 0' },
  detailHeader: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 4px' },
  detailTitle:  { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  backBtn:      { width: 32, height: 32, borderRadius: 10, border: '0.5px solid var(--bento-line)', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  studyCard:    { background: 'var(--bento-card)', border: 'none', borderRadius: 22, padding: 14, cursor: 'pointer' },
  studyCardActive: { border: '0.5px solid var(--bento-accent)' },
  studyIcon:    { width: 44, height: 44, borderRadius: 13, background: 'var(--bento-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  studyTitle:   { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 3, letterSpacing: '-0.2px' },
  studySubtitle:{ fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t5)', lineHeight: 1.5 },
  studyMeta:    { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t5)' },
  studyCta:     { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-accent)' },
  studyStarBtn: { width: 28, height: 28, border: 'none', background: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  studyDeleteBtn:{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  studyBadgeRow: { display: 'flex', gap: 6, flexWrap: 'wrap', margin: '-1px 0 4px' },
  currentStudyBadge: { fontFamily: 'var(--font-bento)', fontSize: 9, fontWeight: 800, color: 'var(--gold-deep, #9D7A1F)', background: 'rgba(201,154,74,.15)', borderRadius: 6, padding: '2px 6px', letterSpacing: 0.3, textTransform: 'uppercase', flexShrink: 0 },
  sessionRow:   { display: 'flex', alignItems: 'center', gap: 11, background: 'var(--bento-card)', border: 'none', borderRadius: 19, padding: 12, cursor: 'pointer' },
  sessionIcon:  { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sessionTitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', marginBottom: 2 },
  sessionSub:   { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t5)' },
  doneBadge:    { fontFamily: 'var(--font-bento)', fontSize: 9, fontWeight: 700, color: 'var(--bento-accent)', whiteSpace: 'nowrap' },
  hero:         { background: 'var(--bento-accent)', borderRadius: 18, padding: 16 },
  heroPassage:  { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.2px' },
  panel:        { background: 'var(--bento-card)', border: 'none', borderRadius: 20, padding: 14 },
  panelLabel:   { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 700, color: 'var(--bento-accent)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  panelText:    { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.6 },
  qNumber:      { fontFamily: 'var(--font-bento)', width: 20, height: 20, borderRadius: '50%', background: 'var(--bento-accent)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  completeBtn:      { width: '100%', background: 'var(--bento-ink)', border: 'none', borderRadius: 13, padding: 12, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  completeBtnDone:  { background: 'var(--bento-line)', color: 'var(--bento-t5)', boxShadow: 'none', border: '0.5px solid var(--bento-line)' },

  newStudyBtn:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 16, padding: 13, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-bento)', color: 'white', cursor: 'pointer', background: 'var(--bento-ink)' },
  createCard:    { background: 'var(--bento-card)', border: 'none', borderRadius: 20, padding: 14 },
  createLabel:   { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t5)', marginBottom: 6 },
  themeInput:    { width: '100%', border: '0.5px solid var(--bento-line)', borderRadius: 11, padding: '10px 12px', fontSize: 12.5, fontFamily: 'var(--font-bento)', color: 'var(--bento-ink)', background: '#fff' },
  scopeInput:    { width: '100%', border: '0.5px solid var(--bento-line)', borderRadius: 11, padding: '10px 12px', fontSize: 12.5, fontFamily: 'var(--font-bento)', color: 'var(--bento-ink)', background: '#fff', resize: 'none' },
  errorText:     { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 600, color: 'var(--bento-accent)', marginTop: 8 },
  generateBtn:   { flex: 1, border: 'none', borderRadius: 11, padding: 11, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-bento)', color: 'white', cursor: 'pointer', background: 'var(--bento-ink)' },
  cancelBtn:     { border: '0.5px solid var(--bento-line)', borderRadius: 11, padding: '11px 16px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-bento)', color: 'var(--bento-t5)', cursor: 'pointer', background: 'var(--bento-line)' },
  generatingHint:{ fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t5)', textAlign: 'center', lineHeight: 1.4, marginTop: 10 },
}
