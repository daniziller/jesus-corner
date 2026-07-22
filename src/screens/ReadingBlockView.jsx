import { useState, useEffect, useRef } from 'react'
import { groupSessionsByBook } from '../utils/groupByBook'
import { BOOK_INFO } from '../data/bookInfo'
import { BOOK_INFO_EN } from '../data/bookInfo.en'
import { getNotes, saveNote, noteKeyFor } from '../notes/notesStore'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId, setSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { BIBLE_VERSIONS, findBibleVersion } from '../data/bibleVersions'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function ReadingBlockView({ session, authUser, onNavigate, blockId, blocks, sessionsByBlock, completedSet, onToggleSession, onToggleChapter, initialSessionId, onBack }) {
  const { lang } = session
  // Plano Livre não tem "Sessão N de X" — cada sessão já é 1 capítulo só,
  // então a numeração de sessão não ajuda em nada, só confunde.
  const isFreePlan = session.plan.id === 'free'
  const block = blocks.find(b => b.id === blockId) ?? blocks[0]
  const blockName = lang === 'en' ? block.nameEn : block.name
  const sessions = sessionsByBlock[block.id]
  const autoHeroSession = sessions.find(s => s.status === 'current') ?? sessions.find(s => s.status !== 'done') ?? sessions[0]
  const bookGroups = groupSessionsByBook(sessions)
  const bookInfoSource = lang === 'en' ? BOOK_INFO_EN : BOOK_INFO

  const scrollRef = useRef(null)
  // Sessão escolhida na lista abaixo, se houver — sobrepõe a sessão "atual"
  // automática e sobe pro destaque no topo. Começa a partir de um livro
  // específico quando aberto por um chip de livro clicável (initialSessionId).
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId ?? null)

  const heroSession = sessions.find(s => s.id === selectedSessionId) ?? autoHeroSession

  function featureSession(clickedSession) {
    setSelectedSessionId(clickedSession.id)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const TAGS = [
    // "Texto" não fica aqui — vira um botão junto dos capítulos, ver
    // ChapterChecklist (mais perto de onde a pessoa já está olhando).
    { key: 'contexto',     icon: 'BookOpen',   label: t('reading.tagContext', undefined, lang) },
    { key: 'mapa',         icon: 'Map',        label: t('reading.tagMap', undefined, lang) },
    { key: 'notas',        icon: 'StickyNote', label: t('reading.tagNotes', undefined, lang) },
    { key: 'curiosidades', icon: 'Lightbulb',  label: t('reading.tagTrivia', undefined, lang) },
  ]
  const PANEL_KEYS = ['contexto', 'mapa', 'notas', 'curiosidades']

  const [openPanel, setOpenPanel] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [hasSavedNote, setHasSavedNote] = useState(false)

  const heroNoteKey = noteKeyFor(heroSession)

  useEffect(() => {
    setOpenPanel(null)
    if (!authUser?.email) { setNoteText(''); setHasSavedNote(false); return }
    getNotes(authUser.email).then(map => {
      setNoteText(map[heroNoteKey] ?? '')
      setHasSavedNote(Boolean(map[heroNoteKey]))
    })
  }, [heroNoteKey, authUser?.email])

  function handleSaveNote(text) {
    setNoteText(text)
    setHasSavedNote(Boolean(text.trim()))
    saveNote(authUser?.email, heroNoteKey, text).catch(err => {
      console.error('Failed to persist note', err)
    })
  }

  const heroBooks = [{ name: heroSession.book, displayName: heroSession.bookEn, info: bookInfoSource[heroSession.book] }].filter(b => b.info)
  const heroTitle = lang === 'en' ? heroSession.titleEn : heroSession.title
  const heroPassage = lang === 'en' ? heroSession.passageEn : heroSession.passage
  const heroChapterSpan = heroSession.type === 'reflection' ? 0 : heroSession.chEnd - heroSession.chStart + 1
  const heroChapterWord = lang === 'en' ? (heroChapterSpan === 1 ? 'chapter' : 'chapters') : (heroChapterSpan === 1 ? 'capítulo' : 'capítulos')
  const heroBookDisplayName = lang === 'en' ? heroSession.bookEn : heroSession.book

  return (
    <div ref={scrollRef} style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={styles.backBtn} aria-label="back">
          <AppIcon name="ArrowLeft" size={19} color="var(--bk)" />
        </button>
        <h1 className="page-title">{blockName}</h1>
      </div>

      <div className="rb-body">

        {/* Detalhe: sessão em destaque + marcação + painéis — vem primeiro no
            DOM (ordem certa no celular); no desktop o CSS reordena pra
            direita e mantém fixo (sticky) enquanto a lista de livros rola. */}
        <div className="rb-detail">

          {/* Hero da sessão atual */}
          <div style={styles.hero}>
            <div style={styles.heroOrbOrange} />
            <div style={styles.heroOrbPink} />
            <div style={styles.heroOverlay} />
            <div style={styles.heroContent}>
              <p style={styles.heroCycle}>{isFreePlan ? blockName : `${blockName} · ${t('reading.sessionLabel', { n: heroSession.id }, lang)} ${lang === 'en' ? 'of' : 'de'} ${block.sessionsTotal}`}</p>
              <h2 style={styles.heroTitle}>{heroTitle}</h2>
              <p style={styles.heroSub}>
                {heroSession.type === 'reflection' ? heroPassage : `${heroPassage} · ${heroChapterSpan} ${heroChapterWord}`}
              </p>
              <div style={{ height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, width: `${heroSession.status === 'current' ? session.todaySession.progress : 0}%` }} />
              </div>
              <div style={styles.heroTags}>
                {TAGS.map(tag => (
                  <span
                    key={tag.key}
                    style={{ ...styles.heroTag, ...(openPanel === tag.key ? styles.heroTagActive : {}) }}
                    onClick={() => PANEL_KEYS.includes(tag.key) && setOpenPanel(p => (p === tag.key ? null : tag.key))}
                  >
                    <AppIcon name={tag.icon} size={12} /> {tag.label}{tag.key === 'notas' && hasSavedNote && <span style={styles.heroTagDot} />}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Marcação capítulo a capítulo da sessão em destaque — o botão
              "Texto" fica junto dos capítulos, não lá em cima no card do
              destaque, já que é sobre eles que a pessoa está agindo. */}
          {heroSession.type !== 'reflection' && (
            <div style={{ padding: '0 14px 4px' }}>
              <ChapterChecklist
                session={heroSession}
                completedSet={completedSet}
                onToggleChapter={onToggleChapter}
                lang={lang}
                textOpen={openPanel === 'texto'}
                onToggleText={() => setOpenPanel(p => (p === 'texto' ? null : 'texto'))}
              />
            </div>
          )}

          {/* Painel de texto / contexto / mapa / notas / curiosidades da
              sessão atual. */}
          {openPanel === 'notas' && (
            <div style={{ padding: '0 14px 4px' }}>
              <NotesPanel value={noteText} onSave={handleSaveNote} lang={lang} />
            </div>
          )}
          {openPanel === 'texto' && (
            <div style={{ padding: '0 14px 4px' }}>
              <BibleTextPanel session={heroSession} lang={lang} />
            </div>
          )}
          {openPanel && openPanel !== 'notas' && openPanel !== 'texto' && (
            <div style={{ padding: '0 14px 4px' }}>
              <InfoPanel type={openPanel} books={heroBooks} chStart={heroSession.chStart} chEnd={heroSession.chEnd} lang={lang} />
            </div>
          )}

          {/* Sessão de reflexão ao final do livro */}
          {heroSession.type === 'reflection' && (
            <div style={{ padding: '0 14px 4px' }}>
              <ReflectionCard bookKey={heroSession.book} displayName={heroBookDisplayName} info={bookInfoSource[heroSession.book]} lang={lang} />
            </div>
          )}

          {/* Marcar/desmarcar a sessão em destaque */}
          <div style={{ padding: '0 14px 4px' }}>
            <button
              style={{ ...styles.completeBtn, ...(heroSession.status === 'done' ? styles.completeBtnDone : {}) }}
              onClick={() => onToggleSession(heroSession, heroSession.status !== 'done')}
            >
              {heroSession.status === 'done' ? t('reading.markUndone', undefined, lang) : t('reading.markDone', undefined, lang)}
            </button>
          </div>
        </div>

        {/* Lista de livros do bloco (agrupados; só o livro em leitura já vem
            expandido) — no desktop vira o painel "mestre" à esquerda. */}
        <div className="rb-master" style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {bookGroups.map(group => (
            <BookGroup
              key={`${block.id}-${group.book}`}
              group={group}
              isCurrentBook={group.sessions.includes(heroSession)}
              heroSessionId={heroSession.id}
              completedSet={completedSet}
              onToggle={onToggleSession}
              onFeature={featureSession}
              isFreePlan={isFreePlan}
              lang={lang}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Fileira de capítulos clicáveis de uma sessão — usada no destaque (sempre
// visível). O botão "Texto" (quando informado) entra como 1o item da
// fileira, junto dos capítulos que ele exibe.
function ChapterChips({ session, completedSet, onToggleChapter, lang, textOpen, onToggleText }) {
  const chapters = []
  for (let ch = session.chStart; ch <= session.chEnd; ch++) chapters.push(ch)
  const chLabel = lang === 'en' ? 'Ch.' : 'Cap.'

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {onToggleText && (
        <button
          style={{ ...styles.chapterChip, ...styles.chapterTextBtn, ...(textOpen ? styles.chapterTextBtnActive : {}) }}
          onClick={e => { e.stopPropagation(); onToggleText() }}
        >
          <AppIcon name="Scroll" size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
          {t('reading.tagText', undefined, lang)}
        </button>
      )}
      {chapters.map(ch => {
        const done = completedSet.has(`${session.book}:${ch}`)
        return (
          <button
            key={ch}
            style={{ ...styles.chapterChip, ...(done ? styles.chapterChipDone : {}) }}
            onClick={e => { e.stopPropagation(); onToggleChapter(session, ch, !done) }}
          >
            {done ? '✓ ' : ''}{chLabel} {ch}
          </button>
        )
      })}
    </div>
  )
}

function ChapterChecklist({ session, completedSet, onToggleChapter, lang, textOpen, onToggleText }) {
  const chapters = []
  for (let ch = session.chStart; ch <= session.chEnd; ch++) chapters.push(ch)
  const doneCount = chapters.filter(ch => completedSet.has(`${session.book}:${ch}`)).length

  return (
    <div style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <p style={{ ...styles.panelBookLabel, marginBottom: 0 }}>{t('reading.chaptersOfSession', undefined, lang)}</p>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--g5)' }}>{t('reading.chaptersReadCount', { done: doneCount, total: chapters.length }, lang)}</span>
      </div>
      <ChapterChips session={session} completedSet={completedSet} onToggleChapter={onToggleChapter} lang={lang} textOpen={textOpen} onToggleText={onToggleText} />
    </div>
  )
}

// Contexto agora tem 2 camadas: uma visão geral do livro (sempre igual,
// info.contextOverview) e trechos narrativos específicos por capítulo
// (info.contextSections, cada um com chStart/chEnd) — mostra só os trechos
// que se sobrepõem aos capítulos da sessão em destaque, então o texto muda
// conforme a pessoa avança no livro, em vez de repetir o mesmo parágrafo em
// toda sessão. Livros que ainda não migraram pro novo formato (só têm
// info.context, o campo antigo) continuam funcionando — cai no fallback.
function InfoPanel({ type, books, chStart, chEnd, lang }) {
  const chLabel = lang === 'en' ? 'Ch.' : 'Cap.'
  return (
    <div style={styles.panel}>
      {books.map(({ name, displayName, info }, i) => {
        const overview = info.contextOverview ?? info.context
        const sections = (info.contextSections ?? []).filter(
          s => chStart != null && chEnd != null && s.chStart <= chEnd && s.chEnd >= chStart
        )
        return (
        <div key={name} style={{ marginTop: i > 0 ? 14 : 0 }}>
          {books.length > 1 && <p style={styles.panelBookLabel}>{displayName}</p>}

          {type === 'contexto' && (
            <>
              <p style={styles.panelText}>{overview}</p>
              {sections.length > 0 && (
                <div style={styles.contextSections}>
                  {sections.map((s, si) => (
                    <div key={si}>
                      <p style={styles.contextSectionTitle}>
                        {chLabel} {s.chStart}{s.chStart !== s.chEnd ? `–${s.chEnd}` : ''} · {s.title}
                      </p>
                      <p style={styles.panelText}>{s.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {type === 'mapa' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={styles.panelLocationIcon}><AppIcon name={info.location.icon} size={20} color="var(--or)" /></div>
              <div>
                <p style={styles.panelLocationName}>{info.location.name}</p>
                <p style={styles.panelText}>{info.location.description}</p>
              </div>
            </div>
          )}

          {type === 'curiosidades' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {info.curiosities.map((c, ci) => (
                <div key={ci} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={styles.panelBullet} />
                  <p style={styles.panelText}>{c}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}

// Painel "Texto" do acordeão — busca o livro inteiro (cache em
// bibleTextStore) e mostra só os capítulos da sessão em destaque, um a um,
// fechado por padrão (só abre quando a pessoa toca na tag "Texto").
function BibleTextPanel({ session, lang }) {
  const bookKey = lang === 'en' ? session.bookEn : session.book
  const availableVersions = BIBLE_VERSIONS[lang] ?? []
  const [versionId, setVersionId] = useState(() => getSelectedVersionId(lang))
  const version = findBibleVersion(versionId) ?? availableVersions[0]
  const [state, setState] = useState({ status: 'loading', chapters: null })

  // Reidrata a versão escolhida quando o idioma muda (ex: pessoa troca de
  // idioma do app enquanto está com esse painel montado em outra sessão).
  useEffect(() => { setVersionId(getSelectedVersionId(lang)) }, [lang])

  function handleChangeVersion(id) {
    setVersionId(id)
    setSelectedVersionId(lang, id)
  }

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', chapters: null })
    fetchBookText(versionId, bookKey)
      .then(chapters => { if (!cancelled) setState({ status: 'ready', chapters }) })
      .catch(() => { if (!cancelled) setState({ status: 'error', chapters: null }) })
    return () => { cancelled = true }
  }, [versionId, bookKey])

  const chapterNumbers = []
  for (let ch = session.chStart; ch <= session.chEnd; ch++) chapterNumbers.push(ch)
  const chLabel = lang === 'en' ? 'Ch.' : 'Cap.'

  return (
    <div style={styles.panel}>
      {availableVersions.length > 1 ? (
        <div style={styles.bibleTextVersionRow}>
          {availableVersions.map(v => (
            <button
              key={v.id}
              style={{ ...styles.bibleTextVersionBtn, ...(v.id === versionId ? styles.bibleTextVersionBtnActive : {}) }}
              onClick={() => handleChangeVersion(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      ) : (
        <p style={styles.panelBookLabel}>{version.label}</p>
      )}

      {state.status === 'loading' && <p style={styles.panelText}>{t('reading.textLoading', undefined, lang)}</p>}
      {state.status === 'error' && <p style={styles.panelText}>{t('reading.textError', undefined, lang)}</p>}

      {state.status === 'ready' && chapterNumbers.map(ch => {
        const verses = state.chapters[String(ch)] ?? {}
        const verseNumbers = Object.keys(verses).map(Number).sort((a, b) => a - b)
        return (
          <div key={ch} style={styles.bibleTextChapter}>
            <p style={styles.bibleTextChapterLabel}>{chLabel} {ch}</p>
            <p style={styles.bibleTextBody}>
              {verseNumbers.map(v => (
                <span key={v}>
                  <sup style={styles.bibleTextVerseNum}>{v}</sup>
                  {verses[String(v)]}{' '}
                </span>
              ))}
            </p>
          </div>
        )
      })}

      {state.status === 'ready' && (
        <p style={styles.bibleTextAttribution}>{version.attribution ?? t('reading.textSourceEn', undefined, lang)}</p>
      )}
    </div>
  )
}

function ReflectionCard({ bookKey, displayName, info, lang }) {
  if (!info) return null

  return (
    <div style={styles.panel}>
      <p style={styles.panelBookLabel}><AppIcon name="PenLine" size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />{t('reading.reflectionTitle', { book: displayName }, lang)}</p>

      <div style={styles.reflectionTip}>
        {t('reading.reflectionTip', { book: displayName }, lang)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {info.reflectionQuestions.map((q, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span style={styles.reflectionNumber}>{i + 1}</span>
            <p style={styles.panelText}>{q}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotesPanel({ value, onSave, lang }) {
  const [text, setText] = useState(value)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => { setText(value) }, [value])

  function handleSave() {
    onSave(text)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)
  }

  return (
    <div style={styles.panel}>
      <p style={styles.panelBookLabel}>{t('reading.notesLabel', undefined, lang)}</p>
      <textarea
        style={styles.notesTextarea}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('reading.notesPlaceholder', undefined, lang)}
        rows={4}
      />
      <button style={styles.notesSaveBtn} onClick={handleSave}>
        {justSaved ? t('reading.savedNote', undefined, lang) : t('reading.saveNote', undefined, lang)}
      </button>
    </div>
  )
}

function BookGroup({ group, isCurrentBook, heroSessionId, completedSet, onToggle, onFeature, isFreePlan, lang }) {
  const [open, setOpen] = useState(isCurrentBook)
  const total = group.sessions.length
  const doneCount = group.sessions.filter(s => s.status === 'done').length
  const allDone = doneCount === total
  const displayName = lang === 'en' ? group.sessions[0]?.bookEn : group.book

  // Clicar no cabeçalho do livro (não numa sessão específica) também move o
  // destaque (quadrado preto) pra esse livro — mesmo efeito de clicar numa
  // sessão dele, só que escolhendo a sessão "atual" (ou a primeira
  // pendente, ou a primeira mesmo) como destino.
  function handleHeaderClick() {
    setOpen(v => !v)
    const target = group.sessions.find(s => s.status === 'current')
      ?? group.sessions.find(s => s.status !== 'done')
      ?? group.sessions[0]
    onFeature(target)
  }

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${isCurrentBook ? 'rgba(249,115,22,.35)' : 'var(--g1)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: isCurrentBook ? 'var(--shadow-glow)' : 'var(--shadow-card)',
        cursor: 'pointer',
      }}
      onClick={handleHeaderClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, userSelect: 'none' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: allDone ? 'var(--grad-vivid)' : isCurrentBook ? 'var(--bk)' : 'var(--g1)',
        }}>
          <AppIcon name={allDone ? 'CheckCircle2' : 'BookOpen'} size={17} color={allDone || isCurrentBook ? 'white' : 'var(--g5)'} />
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bk)', marginBottom: 1 }}>{displayName}</p>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--g4)' }}>
            {doneCount}/{total} {t('reading.sessionsSuffix', undefined, lang)}{isCurrentBook ? ` · ${t('reading.readingNow', undefined, lang)}` : ''}
          </p>
        </div>

        <span style={{ fontSize: 13, color: 'var(--g4)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          ∨
        </span>
      </div>

      {open && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }} onClick={e => e.stopPropagation()}>
          {group.sessions.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              isFeatured={s.id === heroSessionId}
              completedSet={completedSet}
              onToggle={onToggle}
              onFeature={onFeature}
              isFreePlan={isFreePlan}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({ session, isFeatured, completedSet, onToggle, onFeature, isFreePlan, lang }) {
  const isDone       = session.status === 'done'
  const isCurrent    = session.status === 'current'
  const isReflection = session.type === 'reflection'
  const title = lang === 'en' ? session.titleEn : session.title
  const passage = lang === 'en' ? session.passageEn : session.passage

  const chapterCount = isReflection ? 0 : session.chEnd - session.chStart + 1
  const chaptersDone = isReflection ? 0 : Array.from(
    { length: chapterCount }, (_, i) => session.chStart + i
  ).filter(ch => completedSet.has(`${session.book}:${ch}`)).length

  return (
    <div
      style={{
        // Só a sessão em destaque (a que foi clicada/está no topo) recebe a cor
        // laranja — "current" continua indicado só pelo ícone de status, pra
        // não sobrar destacada quando outra sessão é escolhida.
        background: isFeatured ? 'var(--olt)' : 'var(--g1)',
        border: `0.5px solid ${isFeatured ? 'var(--gold-soft)' : isReflection ? 'rgba(168,85,247,.3)' : 'var(--g2)'}`,
        borderRadius: 13,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: isFeatured ? 'var(--shadow-premium)' : 'none',
      }}
      onClick={() => onFeature(session)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 11 }}>
        {/* Ícone de status — toque rápido marca/desmarca a sessão inteira */}
        <div
          style={{
            width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: isDone ? 'var(--grad-vivid)' : isCurrent ? 'var(--bk)' : isReflection ? '#A855F7' : 'var(--g3)',
          }}
          onClick={e => { e.stopPropagation(); onToggle(session, !isDone) }}
        >
          {isDone ? (
            <AppIcon name="Check" size={15} color="white" />
          ) : isReflection ? (
            <AppIcon name="PenLine" size={13} color="white" />
          ) : (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: isCurrent ? 'white' : 'var(--g5)' }}>{isFreePlan ? session.chStart : session.id}</span>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bk)', marginBottom: 1 }}>
            {isReflection || isFreePlan ? title : `${t('reading.sessionLabel', { n: session.id }, lang)} · ${title}`}
          </p>
          <p style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--g5)' }}>
            {isReflection
              ? `${passage}${isDone ? ` · ${t('reading.completedSession', undefined, lang)}` : ` · ${t('reading.tapToMark', undefined, lang)}`}`
              : `${passage} · ${chaptersDone}/${chapterCount} ${t('reading.chaptersSuffix', undefined, lang)}`}
          </p>
        </div>

        {/* Indicador: já em destaque no topo, ou toque pra destacar */}
        {isFeatured ? (
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--or)', whiteSpace: 'nowrap' }}>{lang === 'en' ? 'FEATURED' : 'EM DESTAQUE'}</span>
        ) : (
          <AppIcon name="ArrowUp" size={14} color="var(--g4)" />
        )}
      </div>
    </div>
  )
}

const styles = {
  backBtn:     { width: 32, height: 32, borderRadius: 10, border: '0.5px solid var(--g2)', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  hero:        { height: 224, margin: '10px 14px', borderRadius: 22, overflow: 'hidden', position: 'relative', background: '#141414', flexShrink: 0, boxShadow: '0 12px 28px rgba(0,0,0,.18)' },
  heroOrbOrange:{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(60px)', opacity: 0.5, top: -60, right: -50 },
  heroOrbPink: { position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(60px)', opacity: 0.3, bottom: -50, left: -40 },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 65%)' },
  heroContent: { position: 'absolute', bottom: 14, left: 14, right: 14 },
  heroCycle:   { fontSize: 9.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  heroTitle:   { fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 700, fontStyle: 'italic', color: 'white', marginBottom: 4, letterSpacing: '-0.2px', lineHeight: 1.15 },
  heroSub:     { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)' },
  heroTags:    { display: 'flex', gap: 7, overflowX: 'auto', marginTop: 12 },
  heroTag:     { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,.12)', border: '0.5px solid rgba(255,255,255,.18)', borderRadius: 20, padding: '5px 10px', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.85)', cursor: 'pointer' },
  heroTagActive:{ background: 'var(--grad-vivid)', border: '0.5px solid transparent', color: 'white', boxShadow: '0 4px 12px rgba(249,115,22,.4)' },
  heroTagDot:  { display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--or)', marginLeft: 5 },
  completeBtn: { width: '100%', background: 'var(--grad-premium)', border: 'none', borderRadius: 13, padding: 12, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-premium)' },
  completeBtnDone:{ background: 'var(--g1)', color: 'var(--g5)', boxShadow: 'none', border: '0.5px solid var(--g2)' },
  panel:       { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow-card)' },
  panelBookLabel:{ fontSize: 9.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  panelText:   { fontSize: 12, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.55 },
  contextSections:    { marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--g1)', display: 'flex', flexDirection: 'column', gap: 11 },
  contextSectionTitle:{ fontSize: 11, fontWeight: 700, color: 'var(--bk)', marginBottom: 3 },
  panelLocationIcon:{ width: 38, height: 38, borderRadius: 11, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  panelLocationName:{ fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 2 },
  panelBullet: { width: 5, height: 5, borderRadius: '50%', background: 'var(--or)', flexShrink: 0, marginTop: 6 },
  notesTextarea:{ width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: 10, background: 'var(--g1)' },
  notesSaveBtn:{ width: '100%', background: 'var(--grad-vivid)', border: 'none', borderRadius: 11, padding: 10, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-glow)' },
  chapterChip:    { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 20, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'var(--g6)', cursor: 'pointer', fontFamily: 'var(--font)' },
  chapterChipDone:{ background: 'var(--grad-vivid)', border: '0.5px solid transparent', color: 'white', boxShadow: '0 3px 8px rgba(249,115,22,.3)' },
  chapterTextBtn:      { background: 'var(--bk)', border: '0.5px solid var(--bk)', color: 'white' },
  chapterTextBtnActive:{ background: 'var(--grad-vivid)', border: '0.5px solid transparent', boxShadow: '0 3px 8px rgba(249,115,22,.3)' },
  reflectionTip:  { background: 'linear-gradient(135deg,#F3E8FF,#E1CBFF)', border: '0.5px dashed rgba(168,85,247,.4)', borderRadius: 11, padding: 11, fontSize: 12.5, fontWeight: 500, color: '#6B21A8', lineHeight: 1.5 },
  reflectionNumber:{ width: 20, height: 20, borderRadius: '50%', background: '#A855F7', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  bibleTextVersionRow:  { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  bibleTextVersionBtn:  { border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 20, padding: '5px 11px', fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
  bibleTextVersionBtnActive: { background: 'var(--grad-vivid)', border: '0.5px solid transparent', color: 'white', boxShadow: '0 3px 8px rgba(249,115,22,.3)' },
  bibleTextChapter:     { marginBottom: 16, paddingTop: 12, borderTop: '0.5px solid var(--g1)' },
  bibleTextChapterLabel:{ fontSize: 12.5, fontWeight: 800, color: 'var(--bk)', marginBottom: 6 },
  bibleTextBody:        { fontSize: 14, fontWeight: 500, color: 'var(--bk)', lineHeight: 1.75 },
  bibleTextVerseNum:    { fontSize: 9.5, fontWeight: 700, color: 'var(--or)', marginRight: 2 },
  bibleTextAttribution: { fontSize: 9.5, fontWeight: 500, color: 'var(--g4)', lineHeight: 1.5, marginTop: 14, paddingTop: 10, borderTop: '0.5px solid var(--g1)', fontStyle: 'italic' },
}
