import { useState, useEffect, useMemo } from 'react'
import { STUDIES } from '../data/studies'
import { getCompletedStudySessions, setStudySessionDone, isStudySessionDone } from '../studies/studiesProgressStore'
import { generateStudy, getAiStudies, saveAiStudy, deleteAiStudy } from '../studies/aiStudiesStore'
import { getInductiveStudies, saveInductiveStudy, deleteInductiveStudy } from '../studies/inductiveStudiesStore'
import { computeBookChapterCounts } from '../utils/progress'
import RoutineStepSwitcher from '../components/RoutineStepSwitcher'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// Uma sessão nova de estudo indutivo começa sem nenhum campo preenchido —
// só a passagem escolhida (ver blankInductiveSession/StudyDetail abaixo).
function blankPassageForm() {
  return { book: '', chapter: '', verseStart: '', verseEnd: '' }
}

export default function StudiesScreen({ session, authUser, blocks, sessionsByBlock, onOpenBiblePassage, onNavigate, onContinueSession, onMarkRoutineStep, onSelectActiveStudy }) {
  const { lang } = session
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

  // Estudos indutivos (método Observação/Interpretação/Verdade Atemporal/
  // Aplicação — ver src/studies/inductiveStudiesStore.js) — mesma lista
  // combinada de allStudies abaixo, distinguidos por `kind: 'inductive'`.
  const [inductiveStudies, setInductiveStudies] = useState([])
  const [creatingInductive, setCreatingInductive] = useState(false)
  const [inductiveTitle, setInductiveTitle] = useState('')

  useEffect(() => {
    if (!authUser) return
    getCompletedStudySessions(authUser.email).then(setCompletedSet)
    getAiStudies(authUser.email).then(setAiStudies)
    getInductiveStudies(authUser.email).then(setInductiveStudies)
  }, [authUser?.email])

  const allStudies = [...STUDIES, ...aiStudies, ...inductiveStudies]

  // Nome do livro (chave canônica, sempre em pt) -> nome em inglês + lista
  // ordenada de todos os livros + contagem de capítulos por livro — mesma
  // fonte/lógica já usada no seletor de passagem da anotação de sermão
  // (ver NotesScreen.jsx), reaproveitada aqui pro seletor de passagem do
  // estudo indutivo.
  const bookNameEn = useMemo(() => {
    const map = {}
    for (const b of blocks) b.books.forEach((name, i) => { map[name] = b.booksEn[i] })
    return map
  }, [blocks])
  const allBooksOrdered = useMemo(() => blocks.flatMap(b => b.books), [blocks])
  const bookChapterCounts = useMemo(() => computeBookChapterCounts(sessionsByBlock), [sessionsByBlock])
  function bookLabel(book) {
    return lang === 'en' ? (bookNameEn[book] ?? book) : book
  }

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

  // Cria um estudo indutivo novo, ainda sem nenhuma sessão/passagem — a
  // pessoa adiciona a primeira dentro de StudyDetail (ver
  // onAddInductiveSession abaixo). Sem geração por IA nem conteúdo
  // pré-escrito: o método é preenchido pela própria pessoa.
  async function handleCreateInductive() {
    if (!inductiveTitle.trim() || !authUser) return
    const study = {
      id: `ind-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: 'inductive',
      icon: 'Search',
      title: inductiveTitle.trim(),
      titleEn: inductiveTitle.trim(),
      createdAt: new Date().toISOString(),
      sessions: [],
    }
    try {
      const updated = await saveInductiveStudy(authUser.email, study)
      setInductiveStudies(updated)
      setCreatingInductive(false)
      setInductiveTitle('')
      setOpenStudyId(study.id)
    } catch (err) {
      console.error('Failed to create inductive study', err)
    }
  }

  // Adiciona uma nova sessão (passagem) a um estudo indutivo já existente —
  // salva o estudo INTEIRO de volta (mesmo padrão de
  // inductiveStudiesStore.js: cada save substitui o registro por completo).
  async function onAddInductiveSession(study, passage) {
    if (!authUser) return
    const newSession = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      book: passage.book,
      chapter: Number(passage.chapter),
      verseStart: passage.verseStart ? Number(passage.verseStart) : null,
      verseEnd: passage.verseEnd ? Number(passage.verseEnd) : null,
      observation: '', interpretation: '', timelessTruth: '', application: '',
      updatedAt: new Date().toISOString(),
    }
    const updatedStudy = { ...study, sessions: [...study.sessions, newSession] }
    try {
      const updated = await saveInductiveStudy(authUser.email, updatedStudy)
      setInductiveStudies(updated)
      setOpenSessionId(newSession.id)
    } catch (err) {
      console.error('Failed to add inductive study session', err)
    }
  }

  // Salva o texto de uma sessão de estudo indutivo (Observação/
  // Interpretação/Verdade Atemporal/Aplicação) — chamado pelo botão Salvar
  // dentro de SessionView.
  async function onSaveInductiveSession(study, sessionId, fields) {
    if (!authUser) return
    const nowIso = new Date().toISOString()
    const updatedStudy = {
      ...study,
      sessions: study.sessions.map(s => s.id === sessionId ? { ...s, ...fields, updatedAt: nowIso } : s),
    }
    try {
      const updated = await saveInductiveStudy(authUser.email, updatedStudy)
      setInductiveStudies(updated)
    } catch (err) {
      console.error('Failed to save inductive study session', err)
    }
  }

  async function onDeleteInductiveSession(study, sessionId) {
    if (!authUser) return
    const updatedStudy = { ...study, sessions: study.sessions.filter(s => s.id !== sessionId) }
    try {
      const updated = await saveInductiveStudy(authUser.email, updatedStudy)
      setInductiveStudies(updated)
      setOpenSessionId(null)
    } catch (err) {
      console.error('Failed to delete inductive study session', err)
    }
  }

  // Só estudos criados por IA ou indutivos (não os estáticos de STUDIES)
  // podem ser apagados. Se o estudo apagado era o aberto/ativo, limpa
  // ambos pra não deixar ponteiro pra um estudo que não existe mais.
  async function handleDeleteStudy(study) {
    const isInductive = study.kind === 'inductive'
    const confirmMsg = isInductive ? t('studies.inductiveDeleteConfirm', undefined, lang) : t('studies.deleteConfirm', undefined, lang)
    if (!window.confirm(confirmMsg)) return
    try {
      const updated = isInductive
        ? await deleteInductiveStudy(authUser.email, study.id)
        : await deleteAiStudy(authUser.email, study.id)
      if (isInductive) setInductiveStudies(updated)
      else setAiStudies(updated)
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
  // contam — só progresso salvo, sem refletir na rotina do dia. Funciona
  // igual pra estudos indutivos — mesma chave studyId:sessionId, mesmo
  // armazenamento (studiesProgressStore.js não precisa saber a origem).
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
        {/* Título + subtítulo — só no desktop (≥768px), igual
            Rotina/Início/Progresso. No mobile o Figma não tem esse
            cabeçalho (Estudos só tem frame desktop, sem referência mobile). */}
        <div className="page-header hide-on-mobile" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('studies.pageTitle', undefined, lang)}</h1>
          <p style={{ ...styles.pageSubtitle, padding: 0, marginTop: 4, marginBottom: 0 }}>{t('studies.pageSubtitle', undefined, lang)}</p>
        </div>

        <RoutineStepSwitcher
          session={session}
          activeStep="study"
          onGoPrayer={() => onNavigate?.('prayer')}
          onGoReading={() => onContinueSession?.()}
          onGoReflection={() => onNavigate?.('reflection')}
        />

        <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {creating ? (
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
          )}

          {/* Estudo indutivo — método Observação/Interpretação/Verdade
              Atemporal/Aplicação (ver src/studies/inductiveStudiesStore.js).
              Sem geração nenhuma: só pede um título (o livro/tema que a
              pessoa vai estudar) — as passagens/sessões são adicionadas
              depois, uma de cada vez, dentro do estudo. */}
          {creatingInductive ? (
            <div style={styles.createCard}>
              <p style={styles.inductiveIntro}>{t('studies.inductiveIntro', undefined, lang)}</p>
              <p style={{ ...styles.createLabel, marginTop: 12 }}>{t('studies.inductiveTitleLabel', undefined, lang)}</p>
              <input
                type="text"
                style={styles.themeInput}
                value={inductiveTitle}
                onChange={e => setInductiveTitle(e.target.value)}
                placeholder={t('studies.inductiveTitlePlaceholder', undefined, lang)}
                maxLength={60}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button style={styles.inductiveCreateBtn} onClick={handleCreateInductive} disabled={!inductiveTitle.trim()}>
                  {t('studies.inductiveCreateBtn', undefined, lang)}
                </button>
                <button style={styles.cancelBtn} onClick={() => { setCreatingInductive(false); setInductiveTitle('') }}>
                  {t('studies.createByThemeCancel', undefined, lang)}
                </button>
              </div>
            </div>
          ) : (
            <button style={styles.inductiveNewBtn} onClick={() => setCreatingInductive(true)}>
              <AppIcon name="Search" size={16} color="white" />
              {t('studies.inductiveNewBtn', undefined, lang)}
            </button>
          )}

          {allStudies.map(study => (
            <StudyCard
              key={study.id}
              study={study}
              lang={lang}
              completedSet={completedSet}
              onOpen={() => setOpenStudyId(study.id)}
              onDelete={(study.kind === 'inductive' || aiStudies.some(s => s.id === study.id)) ? () => handleDeleteStudy(study) : null}
            />
          ))}
        </div>
      </div>

      <div className={`detail-pane${!openStudy ? ' hide-on-mobile' : ''}`}>
        {openStudy && openSession && (
          openStudy.kind === 'inductive' ? (
            <InductiveSessionView
              study={openStudy}
              studySession={openSession}
              lang={lang}
              bookLabel={bookLabel}
              isDone={isStudySessionDone(completedSet, openStudy.id, openSession.id)}
              onToggleDone={done => toggleSessionDone(openStudy.id, openSession.id, done)}
              onSave={fields => onSaveInductiveSession(openStudy, openSession.id, fields)}
              onDelete={() => onDeleteInductiveSession(openStudy, openSession.id)}
              onOpenBiblePassage={onOpenBiblePassage}
              onBack={() => setOpenSessionId(null)}
            />
          ) : (
            <SessionView
              study={openStudy}
              studySession={openSession}
              lang={lang}
              isDone={isStudySessionDone(completedSet, openStudy.id, openSession.id)}
              onToggleDone={done => toggleSessionDone(openStudy.id, openSession.id, done)}
              onBack={() => setOpenSessionId(null)}
            />
          )
        )}
        {openStudy && !openSession && (
          <StudyDetail
            study={openStudy}
            lang={lang}
            completedSet={completedSet}
            bookLabel={bookLabel}
            allBooksOrdered={allBooksOrdered}
            bookChapterCounts={bookChapterCounts}
            onOpenSession={id => setOpenSessionId(id)}
            onAddSession={passage => onAddInductiveSession(openStudy, passage)}
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

function StudyCard({ study, lang, completedSet, onOpen, onDelete }) {
  const isInductive = study.kind === 'inductive'
  const title = lang === 'en' ? study.titleEn : study.title
  const subtitle = isInductive
    ? t('studies.inductiveCardSubtitle', { n: study.sessions.length }, lang)
    : (lang === 'en' ? study.subtitleEn : study.subtitle)
  const doneCount = study.sessions.filter(s => isStudySessionDone(completedSet, study.id, s.id)).length
  const total = study.sessions.length
  const percent = total ? Math.round((doneCount / total) * 100) : 0
  const label =
    total === 0 ? t('studies.inductiveAddFirstPassage', undefined, lang)
    : doneCount === 0 ? t('studies.startStudy', undefined, lang)
    : doneCount === total ? t('studies.reviewStudy', undefined, lang)
    : t('studies.continueStudy', undefined, lang)

  return (
    <div style={styles.studyCard} onClick={onOpen}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={styles.studyIcon}>
          <AppIcon name={study.icon} size={22} color="var(--or)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h3 style={styles.studyTitle}>{title}</h3>
            {isInductive && <span style={styles.inductiveBadge}>{t('studies.inductiveBadge', undefined, lang)}</span>}
          </div>
          <p style={styles.studySubtitle}>{subtitle}</p>
        </div>
        {onDelete && (
          <button
            style={styles.studyDeleteBtn}
            onClick={e => { e.stopPropagation(); onDelete() }}
            aria-label={t('studies.deleteAction', undefined, lang)}
          >
            <AppIcon name="Trash2" size={13} color="var(--re)" />
          </button>
        )}
      </div>
      {total > 0 && (
        <>
          <div style={{ height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden', margin: '12px 0 8px' }}>
            <div style={{ height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, width: `${percent}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={styles.studyMeta}>{t('studies.sessionsDoneCount', { done: doneCount, total }, lang)}</span>
            <span style={styles.studyCta}>{label}</span>
          </div>
        </>
      )}
      {total === 0 && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <span style={styles.studyCta}>{label}</span>
        </div>
      )}
    </div>
  )
}

// Rótulo "Livro Capítulo" ou "Livro Capítulo:de-até" de uma sessão de
// estudo indutivo — mesma ideia de passageLabel em NotesScreen.jsx (a
// anotação de sermão usa o mesmo formato pra suas passagens).
function inductivePassageLabel(s, bookLabel) {
  const range = s.verseStart ? `:${s.verseStart}${s.verseEnd && s.verseEnd !== s.verseStart ? `-${s.verseEnd}` : ''}` : ''
  return `${bookLabel(s.book)} ${s.chapter}${range}`
}

function StudyDetail({ study, lang, completedSet, bookLabel, allBooksOrdered, bookChapterCounts, onOpenSession, onAddSession, onBack }) {
  const title = lang === 'en' ? study.titleEn : study.title
  const isInductive = study.kind === 'inductive'
  const [addingPassage, setAddingPassage] = useState(false)
  const [passage, setPassage] = useState(blankPassageForm())

  function submitPassage() {
    if (!passage.book || !passage.chapter) return
    onAddSession(passage)
    setPassage(blankPassageForm())
    setAddingPassage(false)
  }

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={styles.backBtn} aria-label="back">
          <AppIcon name="ArrowLeft" size={19} color="var(--bk)" />
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {isInductive && (
          addingPassage ? (
            <div style={styles.createCard}>
              <p style={styles.createLabel}>{t('studies.inductiveAddPassageLabel', undefined, lang)}</p>
              <div style={styles.passageRow}>
                <select
                  style={styles.passageBookSelect} value={passage.book}
                  onChange={e => setPassage(p => ({ ...p, book: e.target.value, chapter: '' }))}
                >
                  <option value="">{t('notes.sermonPassageBookPlaceholder', undefined, lang)}</option>
                  {allBooksOrdered.map(b => <option key={b} value={b}>{bookLabel(b)}</option>)}
                </select>
                <select
                  style={styles.passageChapterSelect} value={passage.chapter} disabled={!passage.book}
                  onChange={e => setPassage(p => ({ ...p, chapter: e.target.value }))}
                >
                  <option value="">{t('notes.sermonPassageChapterPlaceholder', undefined, lang)}</option>
                  {Array.from({ length: bookChapterCounts[passage.book] ?? 0 }, (_, idx) => idx + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <input
                  type="number" min="1" inputMode="numeric" style={styles.passageVerseInput}
                  placeholder={t('notes.sermonVerseFrom', undefined, lang)} value={passage.verseStart}
                  onChange={e => setPassage(p => ({ ...p, verseStart: e.target.value }))}
                />
                <span style={styles.passageVerseSep}>–</span>
                <input
                  type="number" min="1" inputMode="numeric" style={styles.passageVerseInput}
                  placeholder={t('notes.sermonVerseTo', undefined, lang)} value={passage.verseEnd}
                  onChange={e => setPassage(p => ({ ...p, verseEnd: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={styles.inductiveCreateBtn} onClick={submitPassage} disabled={!passage.book || !passage.chapter}>
                  {t('studies.inductiveAddPassageConfirm', undefined, lang)}
                </button>
                <button style={styles.cancelBtn} onClick={() => { setAddingPassage(false); setPassage(blankPassageForm()) }}>
                  {t('studies.createByThemeCancel', undefined, lang)}
                </button>
              </div>
            </div>
          ) : (
            <button style={styles.addPassageBtn} onClick={() => setAddingPassage(true)}>
              <AppIcon name="Plus" size={14} color="var(--or)" /> {t('studies.inductiveAddPassageBtn', undefined, lang)}
            </button>
          )
        )}

        {isInductive && study.sessions.length === 0 && !addingPassage && (
          <p style={styles.emptyHint}>{t('studies.inductiveEmptyState', undefined, lang)}</p>
        )}

        {study.sessions.map(s => {
          const done = isStudySessionDone(completedSet, study.id, s.id)
          const sTitle = isInductive ? inductivePassageLabel(s, bookLabel) : (lang === 'en' ? s.titleEn : s.title)
          const passageSub = isInductive
            ? (s.observation || s.interpretation || s.timelessTruth || s.application ? t('studies.inductiveHasNotesHint', undefined, lang) : t('studies.inductiveNoNotesHint', undefined, lang))
            : (lang === 'en' ? s.passageEn : s.passage)
          return (
            <div key={s.id} style={styles.sessionRow} onClick={() => onOpenSession(s.id)}>
              <div style={{ ...styles.sessionIcon, background: done ? 'var(--grad-vivid)' : 'var(--g1)' }}>
                {done
                  ? <AppIcon name="Check" size={15} color="white" />
                  : (isInductive ? <AppIcon name="Search" size={14} color="var(--g5)" /> : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--g5)' }}>{s.id}</span>)}
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

// Sessão de estudo indutivo — em vez de conteúdo pronto pra ler (ver
// SessionView acima), mostra 4 campos guiados que a PRÓPRIA pessoa
// preenche, na ordem do método (Observação → Interpretação → Verdade
// Atemporal → Aplicação — ver YWAM School of Biblical Studies). O texto
// bíblico em si não é reproduzido aqui dentro (evita duplicar toda a
// leitura/tradução já existente na aba Bíblia) — em vez disso, um link
// abre a passagem exata na aba Bíblia pra consulta, mesmo padrão já usado
// nas anotações de sermão (ver NotesScreen.jsx/onOpenBiblePassage).
function InductiveSessionView({ study, studySession, lang, bookLabel, isDone, onToggleDone, onSave, onDelete, onOpenBiblePassage, onBack }) {
  const passageTitle = inductivePassageLabel(studySession, bookLabel)
  const [observation, setObservation] = useState(studySession.observation ?? '')
  const [interpretation, setInterpretation] = useState(studySession.interpretation ?? '')
  const [timelessTruth, setTimelessTruth] = useState(studySession.timelessTruth ?? '')
  const [application, setApplication] = useState(studySession.application ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const dirty = observation !== (studySession.observation ?? '') || interpretation !== (studySession.interpretation ?? '')
    || timelessTruth !== (studySession.timelessTruth ?? '') || application !== (studySession.application ?? '')

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setSaved(false)
    try {
      await onSave({ observation, interpretation, timelessTruth, application })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (window.confirm(t('studies.inductiveDeleteSessionConfirm', undefined, lang))) onDelete()
  }

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={styles.backBtn} aria-label="back">
          <AppIcon name="ArrowLeft" size={19} color="var(--bk)" />
        </button>
        <h1 className="page-title">{passageTitle}</h1>
        <button style={styles.sessionDeleteBtn} onClick={handleDelete} aria-label={t('studies.inductiveDeleteSessionAction', undefined, lang)}>
          <AppIcon name="Trash2" size={15} color="var(--re)" />
        </button>
      </div>

      <div style={{ padding: '4px 14px 4px' }}>
        <button
          style={styles.readPassageBtn}
          onClick={() => onOpenBiblePassage?.(studySession.book, studySession.chapter)}
        >
          <AppIcon name="BookOpen" size={14} color="var(--or)" /> {t('studies.inductiveReadPassage', undefined, lang)}
        </button>
      </div>

      <div style={{ padding: '10px 14px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <InductiveField
          label={t('studies.inductiveObservationLabel', undefined, lang)}
          hint={t('studies.inductiveObservationHint', undefined, lang)}
          placeholder={t('studies.inductiveObservationPlaceholder', undefined, lang)}
          value={observation} onChange={setObservation}
        />
        <InductiveField
          label={t('studies.inductiveInterpretationLabel', undefined, lang)}
          hint={t('studies.inductiveInterpretationHint', undefined, lang)}
          placeholder={t('studies.inductiveInterpretationPlaceholder', undefined, lang)}
          value={interpretation} onChange={setInterpretation}
        />
        <InductiveField
          label={t('studies.inductiveTimelessTruthLabel', undefined, lang)}
          hint={t('studies.inductiveTimelessTruthHint', undefined, lang)}
          placeholder={t('studies.inductiveTimelessTruthPlaceholder', undefined, lang)}
          value={timelessTruth} onChange={setTimelessTruth}
          rows={2}
        />
        <InductiveField
          label={t('studies.inductiveApplicationLabel', undefined, lang)}
          hint={t('studies.inductiveApplicationHint', undefined, lang)}
          placeholder={t('studies.inductiveApplicationPlaceholder', undefined, lang)}
          value={application} onChange={setApplication}
        />
      </div>

      <div style={{ padding: '10px 14px 4px' }}>
        <button style={styles.inductiveSaveBtn} onClick={handleSave} disabled={saving || !dirty}>
          {saving ? t('notes.saving', undefined, lang) : t('studies.inductiveSaveBtn', undefined, lang)}
        </button>
        {saved && !dirty && <p style={styles.savedHint}>{t('studies.inductiveSavedHint', undefined, lang)}</p>}
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

function InductiveField({ label, hint, placeholder, value, onChange, rows = 4 }) {
  return (
    <div style={styles.panel}>
      <p style={styles.panelLabel}>{label}</p>
      <p style={styles.inductiveFieldHint}>{hint}</p>
      <textarea
        style={styles.inductiveTextarea}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  )
}

const styles = {
  pageSubtitle: { fontSize: 12, fontWeight: 500, color: 'var(--g5)', padding: '14px 14px 0', marginBottom: 8 },
  backBtn:      { width: 32, height: 32, borderRadius: 10, border: '0.5px solid var(--g2)', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  studyCard:    { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, padding: 14, boxShadow: 'var(--shadow-card)', cursor: 'pointer' },
  studyIcon:    { width: 44, height: 44, borderRadius: 13, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  studyTitle:   { fontSize: 14.5, fontWeight: 800, color: 'var(--bk)', marginBottom: 3, letterSpacing: '-0.2px' },
  studySubtitle:{ fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5 },
  studyMeta:    { fontSize: 10.5, fontWeight: 600, color: 'var(--g5)' },
  studyCta:     { fontSize: 11, fontWeight: 700, color: 'var(--or)' },
  studyDeleteBtn:{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  inductiveBadge: { fontSize: 9, fontWeight: 800, color: '#7C3AED', background: 'rgba(124,58,237,.12)', borderRadius: 6, padding: '2px 6px', letterSpacing: 0.3, textTransform: 'uppercase', flexShrink: 0 },
  sessionRow:   { display: 'flex', alignItems: 'center', gap: 11, background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 19, padding: 12, cursor: 'pointer', boxShadow: 'var(--shadow-card)' },
  sessionIcon:  { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sessionTitle: { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)', marginBottom: 2 },
  sessionSub:   { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)' },
  sessionDeleteBtn: { width: 32, height: 32, borderRadius: 10, border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  doneBadge:    { fontSize: 9, fontWeight: 700, color: 'var(--gr)', whiteSpace: 'nowrap' },
  hero:         { background: 'var(--grad-vivid)', borderRadius: 18, padding: 16, boxShadow: 'var(--shadow-glow)' },
  heroPassage:  { fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.2px' },
  panel:        { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  panelLabel:   { fontSize: 9.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  panelText:    { fontSize: 12.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.6 },
  qNumber:      { width: 20, height: 20, borderRadius: '50%', background: 'var(--or)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  completeBtn:      { width: '100%', background: 'var(--grad-primary)', border: 'none', borderRadius: 13, padding: 12, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-premium)' },
  completeBtnDone:  { background: 'var(--g1)', color: 'var(--g5)', boxShadow: 'none', border: '0.5px solid var(--g2)' },

  newStudyBtn:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 16, padding: 13, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', color: 'white', cursor: 'pointer', background: 'linear-gradient(135deg, #C026D4 0%, #86198F 100%)', boxShadow: '0 10px 24px rgba(162,28,175,.3)' },
  createCard:    { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  createLabel:   { fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', marginBottom: 6 },
  themeInput:    { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontSize: 12.5, fontFamily: 'var(--font)', color: 'var(--bk)', background: 'var(--white)' },
  scopeInput:    { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontSize: 12.5, fontFamily: 'var(--font)', color: 'var(--bk)', background: 'var(--white)', resize: 'none' },
  errorText:     { fontSize: 11, fontWeight: 600, color: 'var(--re, #DC2626)', marginTop: 8 },
  generateBtn:   { flex: 1, border: 'none', borderRadius: 11, padding: 11, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', color: 'white', cursor: 'pointer', background: '#A21CAF' },
  cancelBtn:     { border: '0.5px solid var(--g2)', borderRadius: 11, padding: '11px 16px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', color: 'var(--g5)', cursor: 'pointer', background: 'var(--g1)' },
  generatingHint:{ fontSize: 10.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', lineHeight: 1.4, marginTop: 10 },

  // Estudo indutivo
  inductiveNewBtn:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 16, padding: 13, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', color: 'white', cursor: 'pointer', background: '#7C3AED', boxShadow: '0 10px 24px rgba(124,58,237,.3)' },
  inductiveIntro:   { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5 },
  inductiveCreateBtn: { flex: 1, border: 'none', borderRadius: 11, padding: 11, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', color: 'white', cursor: 'pointer', background: '#7C3AED' },
  addPassageBtn:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '0.5px dashed var(--g3)', background: 'none', borderRadius: 13, padding: '11px 10px', fontSize: 12, fontWeight: 700, color: 'var(--or)', cursor: 'pointer', fontFamily: 'var(--font)' },
  emptyHint:      { fontSize: 12, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', padding: '18px 8px' },
  passageRow:     { display: 'flex', alignItems: 'center', gap: 5 },
  passageBookSelect:   { flex: '1.3 1 0', minWidth: 0, border: '0.5px solid var(--g2)', borderRadius: 9, padding: '8px 6px', fontSize: 11, fontFamily: 'var(--font)', color: 'var(--bk)', background: 'var(--white)' },
  passageChapterSelect:{ flex: '0.8 1 0', minWidth: 0, border: '0.5px solid var(--g2)', borderRadius: 9, padding: '8px 4px', fontSize: 11, fontFamily: 'var(--font)', color: 'var(--bk)', background: 'var(--white)' },
  passageVerseInput:   { flex: '0.7 1 0', minWidth: 0, border: '0.5px solid var(--g2)', borderRadius: 9, padding: '8px 4px', fontSize: 11, fontFamily: 'var(--font)', color: 'var(--bk)', background: 'var(--white)' },
  passageVerseSep:     { fontSize: 11, fontWeight: 700, color: 'var(--g4)', flexShrink: 0 },
  readPassageBtn: { display: 'flex', alignItems: 'center', gap: 6, border: '0.5px solid rgba(157,67,0,.25)', background: 'var(--olt)', borderRadius: 13, padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--or)', cursor: 'pointer', fontFamily: 'var(--font)' },
  inductiveFieldHint: { fontSize: 11, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, marginBottom: 8 },
  inductiveTextarea: { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', lineHeight: 1.5, background: 'var(--white)' },
  inductiveSaveBtn: { width: '100%', background: '#7C3AED', border: 'none', borderRadius: 13, padding: 12, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },
  savedHint:      { fontSize: 11, fontWeight: 600, color: 'var(--gr)', textAlign: 'center', marginTop: 8 },
}
