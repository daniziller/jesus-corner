import { useState, useEffect, useMemo } from 'react'
import { STUDIES } from '../data/studies'
import { getCompletedStudySessions, setStudySessionDone, isStudySessionDone } from '../studies/studiesProgressStore'
import { generateStudy, getAiStudies, saveAiStudy, deleteAiStudy } from '../studies/aiStudiesStore'
import { getInductiveStudies, saveInductiveStudy, deleteInductiveStudy } from '../studies/inductiveStudiesStore'
import { computeBookChapterCounts } from '../utils/progress'
import RoutineStepSwitcher from '../components/RoutineStepSwitcher'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function StudiesScreen({ session, authUser, blocks, sessionsByBlock, onOpenBiblePassage, onNavigate, onContinueSession, onMarkRoutineStep, onSelectActiveStudy, autoOpenStudyId, onAutoOpenStudyConsumed }) {
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

  // Estudos indutivos (método Observação/Interpretação/Verdade Atemporal/
  // Aplicação — ver src/studies/inductiveStudiesStore.js) — mesma lista
  // combinada de allStudies abaixo, distinguidos por `kind: 'inductive'`.
  const [inductiveStudies, setInductiveStudies] = useState([])
  const [creatingInductive, setCreatingInductive] = useState(false)
  const [inductiveBook, setInductiveBook] = useState('')

  // Duas abas lado a lado dentro de Estudos — indutivo (a pessoa escreve)
  // e guiado (conteúdo pronto, estático ou por IA). Só decide o que
  // aparece na LISTA (o estudo já aberto continua achável em allStudies,
  // não importa a aba ativa).
  const [studiesTab, setStudiesTab] = useState('inductive')

  useEffect(() => {
    if (!authUser) return
    getCompletedStudySessions(authUser.email).then(setCompletedSet)
    getAiStudies(authUser.email).then(setAiStudies)
    getInductiveStudies(authUser.email).then(setInductiveStudies)
  }, [authUser?.email])

  const allStudies = [...STUDIES, ...aiStudies, ...inductiveStudies]

  // Abrir automaticamente vindo de um card de Estudo na Biblioteca (ver
  // NotesScreen.jsx/App.jsx) — espera o estudo aparecer em allStudies (na
  // 1ª visita, aiStudies/inductiveStudies ainda podem estar carregando) e
  // troca pra aba certa antes de abrir. Consome (limpa no App.jsx) assim
  // que abre, senão voltar depois pra esta aba pela barra reabriria o
  // mesmo estudo de novo.
  useEffect(() => {
    if (!autoOpenStudyId) return
    const target = allStudies.find(s => s.id === autoOpenStudyId)
    if (!target) return
    setStudiesTab(target.kind === 'inductive' ? 'inductive' : 'guided')
    setOpenStudyId(target.id)
    onAutoOpenStudyConsumed?.()
  })

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

  // Cria um estudo indutivo novo pra um livro inteiro — já com UMA sessão
  // por capítulo do livro (pedido explícito: a pessoa só escolhe o livro,
  // o resto é automático). Sem geração por IA nem conteúdo pré-escrito: só
  // a passagem de cada sessão vem pronta, o método em si (Observação/
  // Interpretação/Verdade Atemporal/Aplicação) é preenchido pela própria
  // pessoa, capítulo a capítulo.
  async function handleCreateInductive() {
    if (!inductiveBook || !authUser) return
    const chapterCount = bookChapterCounts[inductiveBook] ?? 0
    const nowIso = new Date().toISOString()
    const sessions = Array.from({ length: chapterCount }, (_, i) => ({
      id: `s-${Date.now()}-${i}`,
      book: inductiveBook,
      chapter: i + 1,
      verseStart: null,
      verseEnd: null,
      observation: '', interpretation: '', timelessTruth: '', application: '',
      updatedAt: nowIso,
    }))
    const study = {
      id: `ind-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: 'inductive',
      icon: 'Search',
      book: inductiveBook,
      title: inductiveBook,
      titleEn: bookNameEn[inductiveBook] ?? inductiveBook,
      createdAt: nowIso,
      sessions,
    }
    try {
      const updated = await saveInductiveStudy(authUser.email, study)
      setInductiveStudies(updated)
      setCreatingInductive(false)
      setInductiveBook('')
      setOpenStudyId(study.id)
    } catch (err) {
      console.error('Failed to create inductive study', err)
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
        {/* Título + subtítulo — visível em qualquer largura. O Figma só tem
            frame desktop pra Estudos (sem referência mobile), mas agora que
            esta tela entrou em bentoScreen (ver App.jsx) o AppHeader antigo
            não envolve mais o mobile, então este título passa a ser a única
            identificação da aba — sem ele o mobile ficaria sem cabeçalho
            nenhum. Estilo replicado de Rotina/Início/Progresso. */}
        <div style={{ ...styles.bHeader }}>
          <p style={styles.bTitle}>{t('studies.pageTitle', undefined, lang)}</p>
          <p style={styles.bSubtitle}>{t('studies.pageSubtitle', undefined, lang)}</p>
        </div>

        <RoutineStepSwitcher
          session={session}
          activeStep="study"
          onGoPrayer={() => onNavigate?.('prayer')}
          onGoReading={() => onContinueSession?.()}
          onGoReflection={() => onNavigate?.('reflection')}
        />

        {/* Duas abas lado a lado — Estudo Indutivo (a pessoa escreve, ver
            src/studies/inductiveStudiesStore.js) e Estudos Guiados
            (conteúdo pronto, estático ou por IA). */}
        <div style={{ padding: '10px 20px 0' }}>
          <div style={styles.segmentToggle}>
            <button
              style={{ ...styles.segmentBtn, ...(studiesTab === 'inductive' ? styles.segmentBtnActive : {}) }}
              onClick={() => setStudiesTab('inductive')}
            >
              {t('studies.tabInductive', undefined, lang)}
            </button>
            <button
              style={{ ...styles.segmentBtn, ...(studiesTab === 'guided' ? styles.segmentBtnActive : {}) }}
              onClick={() => setStudiesTab('guided')}
            >
              {t('studies.tabGuided', undefined, lang)}
            </button>
          </div>
          <p style={styles.recommendHint}>{t('studies.recommendHint', undefined, lang)}</p>
        </div>

        <div style={{ padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {studiesTab === 'guided' && (
            <>
              {/* Criar estudo por tema é gerado por IA — só no tier Premium + IA. */}
              {session.hasAI && (creating ? (
                <div style={styles.card}>
                  <p style={styles.cardLabel}>{t('studies.createByThemeTitleLabel', undefined, lang)}</p>
                  <input
                    type="text"
                    style={styles.input}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={t('studies.createByThemeTitlePlaceholder', undefined, lang)}
                    maxLength={60}
                    autoFocus
                  />
                  <p style={{ ...styles.cardLabel, marginTop: 14 }}>{t('studies.createByThemeScopeLabel', undefined, lang)}</p>
                  <textarea
                    style={styles.textarea}
                    value={scope}
                    onChange={e => setScope(e.target.value)}
                    placeholder={t('studies.createByThemeScopePlaceholder', undefined, lang)}
                    maxLength={200}
                    rows={3}
                  />
                  {genError && <p style={styles.errorText}>{genError}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button style={styles.themeBtn} onClick={handleGenerate} disabled={generating || !title.trim() || !scope.trim()}>
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
                  <AppIcon name="Sparkles" size={16} color="#fff" />
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
                  onDelete={aiStudies.some(s2 => s2.id === study.id) ? () => handleDeleteStudy(study) : null}
                  onSetActive={() => onSelectActiveStudy?.(activeStudyId === study.id ? null : study.id)}
                />
              ))}
            </>
          )}

          {studiesTab === 'inductive' && (
            <>
              {/* Link fixo pra explicação do método — sempre visível
                  enquanto a pessoa estiver no contexto do estudo indutivo
                  (ver também dentro de StudyDetail/InductiveSessionView). */}
              <button style={styles.methodLinkBtn} onClick={() => onNavigate?.('inductiveMethod')}>
                <AppIcon name="HelpCircle" size={14} color="#7C3AED" /> {t('studies.inductiveMethodLinkBtn', undefined, lang)}
              </button>

              {/* Estudo indutivo — método Observação/Interpretação/Verdade
                  Atemporal/Aplicação (ver src/studies/inductiveStudiesStore.js).
                  Sem geração nenhuma: a pessoa escolhe o LIVRO inteiro que
                  vai estudar — os capítulos/sessões são adicionados depois,
                  um de cada vez, dentro do próprio estudo. */}
              {creatingInductive ? (
                <div style={styles.card}>
                  <p style={styles.inductiveIntro}>{t('studies.inductiveIntro', undefined, lang)}</p>
                  <p style={styles.inductiveSuggestHint}>
                    <AppIcon name="Sparkles" size={12} color="var(--bento-accent)" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {t('studies.inductiveSuggestPhilippians', undefined, lang)}
                  </p>
                  <p style={{ ...styles.cardLabel, marginTop: 12 }}>{t('studies.inductiveTitleLabel', undefined, lang)}</p>
                  <select
                    style={styles.input}
                    value={inductiveBook}
                    onChange={e => setInductiveBook(e.target.value)}
                    autoFocus
                  >
                    <option value="">{t('notes.sermonPassageBookPlaceholder', undefined, lang)}</option>
                    {allBooksOrdered.map(b => <option key={b} value={b}>{bookLabel(b)}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button style={styles.inductiveCreateBtn} onClick={handleCreateInductive} disabled={!inductiveBook}>
                      {t('studies.inductiveCreateBtn', undefined, lang)}
                    </button>
                    <button style={styles.cancelBtn} onClick={() => { setCreatingInductive(false); setInductiveBook('') }}>
                      {t('studies.createByThemeCancel', undefined, lang)}
                    </button>
                  </div>
                </div>
              ) : (
                <button style={styles.inductiveNewBtn} onClick={() => setCreatingInductive(true)}>
                  <AppIcon name="Search" size={16} color="#fff" />
                  {t('studies.inductiveNewBtn', undefined, lang)}
                </button>
              )}

              {inductiveStudies.map(study => (
                <StudyCard
                  key={study.id}
                  study={study}
                  lang={lang}
                  completedSet={completedSet}
                  isActiveStudy={activeStudyId === study.id}
                  onOpen={() => setOpenStudyId(study.id)}
                  onDelete={() => handleDeleteStudy(study)}
                  onSetActive={() => onSelectActiveStudy?.(activeStudyId === study.id ? null : study.id)}
                />
              ))}
            </>
          )}
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
              onNavigate={onNavigate}
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
            onOpenSession={id => setOpenSessionId(id)}
            onNavigate={onNavigate}
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
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-t3)' }}>{t('studies.emptyStateTitle', undefined, lang)}</p>
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', maxWidth: 260 }}>{t('studies.emptyStateSub', undefined, lang)}</p>
    </div>
  )
}

function StudyCard({ study, lang, completedSet, isActiveStudy, onOpen, onDelete, onSetActive }) {
  const isInductive = study.kind === 'inductive'
  const title = lang === 'en' ? study.titleEn : study.title
  const subtitle = isInductive
    ? t('studies.inductiveCardSubtitle', { n: study.sessions.length }, lang)
    : (lang === 'en' ? study.subtitleEn : study.subtitle)
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
          {(isInductive || isActiveStudy) && (
            <div style={styles.studyBadgeRow}>
              {isInductive && <span style={styles.inductiveBadge}>{t('studies.inductiveBadge', undefined, lang)}</span>}
              {isActiveStudy && <span style={styles.currentStudyBadge}>{t('studies.currentStudyBadge', undefined, lang)}</span>}
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
          <AppIcon name="Star" size={16} color={isActiveStudy ? 'var(--bento-accent)' : 'var(--bento-t4)'} fill={isActiveStudy ? 'var(--bento-accent)' : 'none'} />
        </button>
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

// Rótulo "Livro Capítulo" ou "Livro Capítulo:de-até" de uma sessão de
// estudo indutivo — mesma ideia de passageLabel em NotesScreen.jsx (a
// anotação de sermão usa o mesmo formato pra suas passagens).
function inductivePassageLabel(s, bookLabel) {
  const range = s.verseStart ? `:${s.verseStart}${s.verseEnd && s.verseEnd !== s.verseStart ? `-${s.verseEnd}` : ''}` : ''
  return `${bookLabel(s.book)} ${s.chapter}${range}`
}

function StudyDetail({ study, lang, completedSet, bookLabel, onOpenSession, onNavigate, onBack }) {
  const title = lang === 'en' ? study.titleEn : study.title
  const isInductive = study.kind === 'inductive'

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
      <div style={styles.detailHeader}>
        <button onClick={onBack} style={styles.backBtn} aria-label="back">
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={styles.detailHeaderTitle}>{title}</p>
      </div>

      <div style={{ padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {isInductive && (
          <button style={styles.methodLinkBtn} onClick={() => onNavigate?.('inductiveMethod')}>
            <AppIcon name="HelpCircle" size={14} color="#7C3AED" /> {t('studies.inductiveMethodLinkBtn', undefined, lang)}
          </button>
        )}

        {study.sessions.map(sess => {
          const done = isStudySessionDone(completedSet, study.id, sess.id)
          const sTitle = isInductive ? inductivePassageLabel(sess, bookLabel) : (lang === 'en' ? sess.titleEn : sess.title)
          const passageSub = isInductive
            ? (sess.observation || sess.interpretation || sess.timelessTruth || sess.application ? t('studies.inductiveHasNotesHint', undefined, lang) : t('studies.inductiveNoNotesHint', undefined, lang))
            : (lang === 'en' ? sess.passageEn : sess.passage)
          return (
            <div key={sess.id} style={styles.sessionRow} onClick={() => onOpenSession(sess.id)}>
              <div style={{ ...styles.sessionIcon, background: done ? 'var(--bento-accent)' : 'var(--bento-line)' }}>
                {done
                  ? <AppIcon name="Check" size={15} color="var(--bento-ink)" />
                  : (isInductive ? <AppIcon name="Search" size={14} color="var(--bento-t3)" /> : <span style={{ fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)' }}>{sess.id}</span>)}
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
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={styles.detailHeaderTitle}>{title}</p>
      </div>

      <div style={{ padding: '4px 20px 4px' }}>
        <div style={styles.hero}>
          <p style={styles.heroPassage}>{passage}</p>
        </div>
      </div>

      <div style={{ padding: '10px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {studySession.sections.map(section => (
          <div key={section.key} style={styles.panel}>
            <p style={styles.panelLabel}>{t(sectionLabelKeys[section.key], undefined, lang)}</p>
            <p style={styles.panelText}>{lang === 'en' ? section.bodyEn : section.body}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 20px 4px' }}>
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

      <div style={{ padding: '10px 20px 20px' }}>
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
// Atemporal → Aplicação). O texto
// bíblico em si não é reproduzido aqui dentro (evita duplicar toda a
// leitura/tradução já existente na aba Bíblia) — em vez disso, um link
// abre a passagem exata na aba Bíblia pra consulta, mesmo padrão já usado
// nas anotações de sermão (ver NotesScreen.jsx/onOpenBiblePassage).
function InductiveSessionView({ study, studySession, lang, bookLabel, isDone, onToggleDone, onSave, onDelete, onOpenBiblePassage, onNavigate, onBack }) {
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
      <div style={styles.detailHeader}>
        <button onClick={onBack} style={styles.backBtn} aria-label="back">
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={{ ...styles.detailHeaderTitle, flex: 1 }}>{passageTitle}</p>
        <button style={styles.sessionDeleteBtn} onClick={handleDelete} aria-label={t('studies.inductiveDeleteSessionAction', undefined, lang)}>
          <AppIcon name="Trash2" size={15} color="var(--re)" />
        </button>
      </div>

      <div style={{ padding: '4px 20px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          style={styles.readPassageBtn}
          onClick={() => onOpenBiblePassage?.(studySession.book, studySession.chapter)}
        >
          <AppIcon name="BookOpen" size={14} color="var(--bento-accent)" /> {t('studies.inductiveReadPassage', undefined, lang)}
        </button>
        <button style={styles.methodLinkBtn} onClick={() => onNavigate?.('inductiveMethod')}>
          <AppIcon name="HelpCircle" size={14} color="#7C3AED" /> {t('studies.inductiveMethodLinkBtn', undefined, lang)}
        </button>
      </div>

      <div style={{ padding: '10px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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

      <div style={{ padding: '10px 20px 4px' }}>
        <button style={styles.inductiveSaveBtn} onClick={handleSave} disabled={saving || !dirty}>
          {saving ? t('notes.saving', undefined, lang) : t('studies.inductiveSaveBtn', undefined, lang)}
        </button>
        {saved && !dirty && <p style={styles.savedHint}>{t('studies.inductiveSavedHint', undefined, lang)}</p>}
      </div>

      <div style={{ padding: '10px 20px 20px' }}>
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

const FONT = 'var(--font-bento)'

const styles = {
  bHeader:      { padding: '20px 20px 0' },
  bTitle:       { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.7px', color: 'var(--bento-ink)', margin: 0 },
  bSubtitle:    { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: '4px 0 0' },

  detailHeader: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 14px' },
  detailHeaderTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  backBtn:      { width: 34, height: 34, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },

  studyCard:    { background: 'var(--bento-card)', borderRadius: 22, padding: 16, cursor: 'pointer' },
  studyCardActive: { boxShadow: '0 0 0 1.5px var(--bento-accent)' },
  studyIcon:    { width: 44, height: 44, borderRadius: 13, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  studyTitle:   { fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 3, letterSpacing: '-0.2px' },
  studySubtitle:{ fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.5 },
  studyMeta:    { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t3)' },
  studyCta:     { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-accent)' },
  studyStarBtn: { width: 28, height: 28, border: 'none', background: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  studyDeleteBtn:{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  studyBadgeRow: { display: 'flex', gap: 6, flexWrap: 'wrap', margin: '-1px 0 4px' },
  inductiveBadge: { fontFamily: FONT, fontSize: 9, fontWeight: 800, color: '#7C3AED', background: 'rgba(124,58,237,.12)', borderRadius: 6, padding: '2px 6px', letterSpacing: 0.3, textTransform: 'uppercase', flexShrink: 0 },
  currentStudyBadge: { fontFamily: FONT, fontSize: 9, fontWeight: 800, color: 'var(--bento-sand-icon)', background: 'var(--bento-mark)', borderRadius: 6, padding: '2px 6px', letterSpacing: 0.3, textTransform: 'uppercase', flexShrink: 0 },
  recommendHint: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-accent)', lineHeight: 1.5, margin: '8px 2px 0' },
  sessionRow:   { display: 'flex', alignItems: 'center', gap: 11, background: 'var(--bento-card)', borderRadius: 19, padding: 12, cursor: 'pointer' },
  sessionIcon:  { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sessionTitle: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', marginBottom: 2 },
  sessionSub:   { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)' },
  sessionDeleteBtn: { width: 32, height: 32, borderRadius: 10, border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  doneBadge:    { fontFamily: FONT, fontSize: 9, fontWeight: 700, color: 'var(--bento-accent)', whiteSpace: 'nowrap' },
  hero:         { background: 'var(--bento-ink)', borderRadius: 20, padding: 18 },
  heroPassage:  { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px', margin: 0 },
  panel:        { background: 'var(--bento-card)', borderRadius: 20, padding: 16 },
  panelLabel:   { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, color: 'var(--bento-accent)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 },
  panelText:    { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.6, margin: 0 },
  qNumber:      { width: 20, height: 20, borderRadius: '50%', background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  completeBtn:      { width: '100%', background: 'var(--bento-accent)', border: 'none', borderRadius: 16, padding: 14, fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  completeBtnDone:  { background: 'var(--bento-line)', color: 'var(--bento-t3)' },

  newStudyBtn:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 16, padding: 14, fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer', background: '#A21CAF' },
  card:          { background: 'var(--bento-card)', borderRadius: 20, padding: 16 },
  cardLabel:     { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-t4)', marginBottom: 6 },
  input:         { width: '100%', border: 'none', borderRadius: 12, padding: '11px 13px', fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-ink)', background: 'var(--bento-line)', boxSizing: 'border-box', outline: 'none' },
  textarea:      { width: '100%', border: 'none', borderRadius: 12, padding: '11px 13px', fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-ink)', background: 'var(--bento-line)', resize: 'none', boxSizing: 'border-box', outline: 'none' },
  errorText:     { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--re)', marginTop: 8 },
  themeBtn:      { flex: 1, border: 'none', borderRadius: 13, padding: 12, fontFamily: FONT, fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', background: '#A21CAF' },
  cancelBtn:     { border: 'none', borderRadius: 13, padding: '12px 16px', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', background: 'var(--bento-line)' },
  generatingHint:{ fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', lineHeight: 1.4, marginTop: 10 },

  // Estudo indutivo
  inductiveNewBtn:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 16, padding: 14, fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer', background: '#7C3AED' },
  inductiveIntro:   { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.5, margin: 0 },
  inductiveSuggestHint: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-accent)', lineHeight: 1.5, marginTop: 8 },
  inductiveCreateBtn: { flex: 1, border: 'none', borderRadius: 13, padding: 12, fontFamily: FONT, fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', background: '#7C3AED' },
  readPassageBtn: { display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'var(--bento-mark)', borderRadius: 13, padding: '10px 14px', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-sand-icon)', cursor: 'pointer' },
  inductiveFieldHint: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.5, marginBottom: 8 },
  inductiveTextarea: { width: '100%', border: 'none', borderRadius: 12, padding: '11px 13px', fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-ink)', resize: 'none', outline: 'none', lineHeight: 1.5, background: 'var(--bento-line)', boxSizing: 'border-box' },
  inductiveSaveBtn: { width: '100%', background: '#7C3AED', border: 'none', borderRadius: 16, padding: 14, fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  savedHint:      { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-accent)', textAlign: 'center', marginTop: 8 },
  methodLinkBtn:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', background: 'rgba(124,58,237,.08)', borderRadius: 13, padding: '10px 12px', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: '#7C3AED', cursor: 'pointer' },

  // Abas Estudo Indutivo / Estudos Guiados
  segmentToggle: { display: 'flex', gap: 4, background: 'var(--bento-line)', borderRadius: 14, padding: 4 },
  segmentBtn:    { flex: 1, textAlign: 'center', padding: '10px 4px', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', borderRadius: 10, border: 'none', background: 'transparent' },
  segmentBtnActive: { color: '#fff', background: 'var(--bento-ink)' },
}
