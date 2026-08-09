import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { groupSessionsByBook } from '../utils/groupByBook'
import { BOOK_INFO } from '../data/bookInfo'
import { BOOK_INFO_EN } from '../data/bookInfo.en'
import { getNotes, saveNote, noteKeyFor } from '../notes/notesStore'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId, setSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { BIBLE_VERSIONS, findBibleVersion } from '../data/bibleVersions'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// Mesmo breakpoint do master-detail em index.css (.rb-body/.rb-master/
// .rb-detail, min-width: 1024px) — usado só em modo 'browse' pra decidir
// ONDE o texto do capítulo aparece (ver comentário perto de onde é usado).
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = e => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function ReadingBlockView({ session, authUser, onNavigate, blockId, blocks, sessionsByBlock, mode = 'session', completedSet, onToggleSession, onToggleChapter, initialSessionId, onBack }) {
  const { lang } = session
  const isDesktop = useIsDesktop()
  // Sem "Sessão N de X" em dois casos: plano Livre (cada sessão já é 1
  // capítulo só) ou navegação livre pela aba Bíblia (mode 'browse' —
  // JourneyScreen já manda sessionsByBlock com 1 capítulo por sessão nesse
  // caso, ver App.jsx: browseSessionsByBlock). A divisão em sessões do
  // plano só aparece mesmo dentro do fluxo guiado da Rotina (mode 'session').
  const isFreePlan = mode === 'browse' || session.plan.id === 'free'
  const block = blocks.find(b => b.id === blockId) ?? blocks[0]
  const blockName = lang === 'en' ? block.nameEn : block.name
  const sessions = sessionsByBlock[block.id]
  const autoHeroSession = sessions.find(s => s.status === 'current') ?? sessions.find(s => s.status !== 'done') ?? sessions[0]
  const bookGroups = groupSessionsByBook(sessions)
  const bookInfoSource = lang === 'en' ? BOOK_INFO_EN : BOOK_INFO

  const scrollRef = useRef(null)
  // Guarda o elemento DOM de cada card de capítulo (preenchido pelos
  // próprios SessionCard via registerCardRef) — usado só pra rolar até o
  // topo do card ao clicar em "Próximo" (ver goToNextInline).
  const chapterRefs = useRef({})
  function registerCardRef(sessionId, el) {
    chapterRefs.current[sessionId] = el
  }
  // Id do capítulo pro qual precisa rolar assim que o DOM terminar de
  // refletir a troca (capítulo anterior fecha/encolhe, o novo abre/cresce)
  // — rolar antes disso mira na altura antiga da lista, ver useLayoutEffect
  // abaixo.
  const pendingScrollId = useRef(null)
  // Sessão escolhida na lista abaixo, se houver — sobrepõe a sessão "atual"
  // automática e sobe pro destaque no topo. Começa a partir de um livro
  // específico quando aberto por um chip de livro clicável (initialSessionId).
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId ?? null)

  const heroSession = sessions.find(s => s.id === selectedSessionId) ?? autoHeroSession

  // Qual capítulo tem o texto aberto INLINE, direto na lista de livros —
  // só existe em modo 'browse' (navegação livre pela Bíblia). Diferente do
  // modo 'session', aqui o texto não mora no card de destaque lá em cima:
  // abre embaixo do próprio capítulo que foi tocado, ver SessionCard.
  // Começa já aberto no capítulo de entrada (ex: veio de um chip de livro
  // clicável), pra já cair lendo sem precisar tocar de novo.
  const [expandedChapterId, setExpandedChapterId] = useState(
    mode === 'browse' ? (initialSessionId ?? autoHeroSession.id) : null
  )

  // Próximo capítulo pra continuar lendo sem precisar voltar pra lista —
  // só faz sentido em modo 'browse'; em modo 'session' as sessões já podem
  // ter mais de 1 capítulo cada, então "só ler o próximo" não é bem
  // definido do mesmo jeito. Se acabou o bloco (ex: terminou Deuteronômio
  // no Pentateuco), pula pro 1o capítulo do próximo bloco.
  function getNextSessionFor(fromSession) {
    const idx = sessions.findIndex(s => s.id === fromSession.id)
    let next = sessions[idx + 1]
    if (!next) {
      // Próximo bloco na ordem de PERCURSO atual (blocks já vem ordenado
      // conforme reading_order, ver src/utils/progress.js) — não
      // necessariamente id+1.
      const nextBlock = blocks[blocks.indexOf(block) + 1]
      next = nextBlock ? sessionsByBlock[nextBlock.id]?.[0] ?? null : null
    }
    return next ?? null
  }

  // Clicar num capítulo/sessão na lista NÃO rola a página em modo 'browse'
  // (navegação livre) — é assim que dá pra ler vários capítulos seguidos
  // sem o susto de voltar pro topo da tela a cada clique. Em modo
  // 'session' mantém o comportamento de sempre (rola pra revelar o
  // destaque no topo), já que ali a pessoa normalmente troca de sessão
  // vindo de bem mais longe na lista.
  function featureSession(clickedSession) {
    setSelectedSessionId(clickedSession.id)
    if (mode !== 'browse') {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Abre/fecha o texto embaixo do capítulo tocado (acordeão) — mantém o
  // card de destaque lá em cima sincronizado também (featureSession), pra
  // Contexto/Mapa/Notas continuarem batendo com o capítulo sendo lido.
  function toggleInlineChapter(clickedSession) {
    setExpandedChapterId(id => id === clickedSession.id ? null : clickedSession.id)
    featureSession(clickedSession)
  }

  function goToNextInline(fromSession) {
    const next = getNextSessionFor(fromSession)
    if (!next) return
    pendingScrollId.current = next.id
    setExpandedChapterId(next.id)
    featureSession(next)
  }

  // Só depois que o capítulo anterior encolhe (fecha) e o novo cresce
  // (abre) — ou seja, depois que o DOM já reflete o novo layout — é que dá
  // pra rolar certo até o topo do novo card. Rolar antes (ex: direto no
  // clique) mira na altura de quando o texto antigo ainda ocupava a tela
  // inteira, e a pessoa cai num lugar aleatório da lista.
  useLayoutEffect(() => {
    if (pendingScrollId.current == null || pendingScrollId.current !== expandedChapterId) return
    chapterRefs.current[expandedChapterId]?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    pendingScrollId.current = null
  }, [expandedChapterId])

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
    // Em modo 'browse', se a pessoa já estava lendo o texto, troca de
    // capítulo mantém o painel de Texto aberto — é o que permite continuar
    // lendo vários capítulos seguidos sem precisar tocar em "Texto" nem
    // vez. Qualquer outro painel (Contexto/Mapa/Notas/Curiosidades) sempre
    // fecha ao trocar, e em modo 'session' o comportamento é o de sempre.
    setOpenPanel(p => (mode === 'browse' && p === 'texto') ? 'texto' : null)
    if (!authUser?.email) { setNoteText(''); setHasSavedNote(false); return }
    getNotes(authUser.email).then(map => {
      setNoteText(map[heroNoteKey] ?? '')
      setHasSavedNote(Boolean(map[heroNoteKey]))
    })
  }, [heroNoteKey, authUser?.email, mode])

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

          {/* Marcação capítulo a capítulo da sessão em destaque. Em modo
              'session' o botão "Texto" mora aqui, junto dos capítulos; em
              modo 'browse' ele some daqui — o texto abre embutido embaixo
              do próprio capítulo na lista logo abaixo (ver SessionCard),
              não faz sentido ter os dois jeitos de abrir ao mesmo tempo. */}
          {heroSession.type !== 'reflection' && (
            <div style={{ padding: '0 14px 4px' }}>
              <ChapterChecklist
                session={heroSession}
                completedSet={completedSet}
                onToggleChapter={onToggleChapter}
                lang={lang}
                textOpen={openPanel === 'texto'}
                onToggleText={mode === 'browse' ? undefined : () => setOpenPanel(p => (p === 'texto' ? null : 'texto'))}
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
          {/* Em modo 'browse' o texto normalmente mora embutido embaixo do
              capítulo tocado na lista (ver SessionCard) — faz sentido no
              celular, onde a lista já ocupa a tela toda. No desktop, porém,
              essa lista vira a coluna "mestre" fixa em 300px (.rb-master),
              estreita demais pra texto corrido, enquanto esse card de
              destaque vira a coluna larga da direita (.rb-detail) e já fica
              parado (sticky) na tela — então ali sim o texto aparece aqui
              em cima, com o botão "Próximo" também (mesmo que a versão
              embutida do celular), pra continuar a leitura sem precisar
              caçar o próximo capítulo na lista estreita ao lado. */}
          {(() => {
            const browseTextInHero = mode === 'browse' && isDesktop && expandedChapterId != null
            const nextForHero = browseTextInHero ? getNextSessionFor(heroSession) : null
            return (mode !== 'browse' && openPanel === 'texto') || browseTextInHero ? (
              // Margem lateral bem menor que os outros painéis (Contexto/Mapa/
              // Notas usam 14px) — é texto corrido pra ler, não uma lista de
              // botões/cards, então vale abrir mão de respiro lateral em troca
              // de uma coluna de leitura mais larga (ver também styles.panel
              // sobrescrito dentro de BibleTextPanel).
              <div style={{ padding: '0 6px 4px' }}>
                <BibleTextPanel session={heroSession} lang={lang} completedSet={completedSet} onToggleChapter={onToggleChapter} />
                {nextForHero && (
                  <button style={styles.nextChapterBtn} onClick={() => goToNextInline(heroSession)}>
                    {t('reading.nextChapter', { title: lang === 'en' ? nextForHero.titleEn : nextForHero.title }, lang)}
                    <AppIcon name="ChevronRight" size={15} />
                  </button>
                )}
              </div>
            ) : null
          })()}
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
              onToggleChapter={onToggleChapter}
              onFeature={featureSession}
              isFreePlan={isFreePlan}
              lang={lang}
              mode={mode}
              expandedChapterId={expandedChapterId}
              onToggleInline={toggleInlineChapter}
              onNextInline={goToNextInline}
              getNextSessionFor={getNextSessionFor}
              registerCardRef={registerCardRef}
              lastClickedId={selectedSessionId}
              isDesktop={isDesktop}
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
// Agrupa os versículos de um capítulo em parágrafos, seguindo a divisão
// que a própria versão (NVT/NLT) já publica — ver scripts/build-bible-text.mjs.
// chapter.breaks[versículo] é 'P' (começa parágrafo novo) ou 'L' (só uma
// linha nova dentro do mesmo parágrafo, ex: poesia) — versículos sem marca
// continuam no parágrafo atual.
function groupIntoParagraphs(chapter) {
  // Defensivo: um cache de PWA desatualizado (bible-text-cache) pode, em
  // tese, ainda entregar um formato antigo pra quem não atualizou o app —
  // sem isso, a tela toda ficava em branco (erro não tratado no render)
  // em vez de só aquele capítulo vir vazio.
  if (!chapter?.verses || typeof chapter.verses !== 'object') return []
  const verseNumbers = Object.keys(chapter.verses).map(Number).sort((a, b) => a - b)
  const paragraphs = []
  let current = null
  for (const v of verseNumbers) {
    if (!current || chapter.breaks[String(v)] === 'P') {
      current = []
      paragraphs.push(current)
    }
    current.push(v)
  }
  return paragraphs
}

function BibleTextPanel({ session, lang, completedSet, onToggleChapter }) {
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
    // Padding horizontal bem menor que o dos outros painéis (styles.panel
    // sozinho usa 14px) — texto corrido de leitura ganha mais com uma
    // coluna larga do que com respiro lateral generoso (ver também os dois
    // wrappers que chamam este componente, ambos com o mesmo ajuste).
    <div style={{ ...styles.panel, padding: '14px 8px' }}>
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
        const chapter = state.chapters[String(ch)] ?? { verses: {}, breaks: {} }
        const paragraphs = groupIntoParagraphs(chapter)
        const chDone = completedSet?.has(`${session.book}:${ch}`)
        return (
          <div key={ch} style={styles.bibleTextChapter}>
            <p style={styles.bibleTextChapterLabel}>{chLabel} {ch}</p>
            {paragraphs.map((verseNums, pIdx) => (
              <p key={pIdx} style={styles.bibleTextBody}>
                {verseNums.map((v, vIdx) => (
                  <span key={v}>
                    {vIdx > 0 && chapter.breaks[String(v)] === 'L' && <br />}
                    <sup style={styles.bibleTextVerseNum}>{v}</sup>
                    {chapter.verses[String(v)].split('\n').map((line, lIdx, arr) => (
                      <span key={lIdx}>
                        {line}
                        {lIdx < arr.length - 1 && <br />}
                      </span>
                    ))}{' '}
                  </span>
                ))}
              </p>
            ))}
            {/* Marcar o capítulo como lido direto no fim do texto — sem
                precisar voltar pro topo e caçar o chip dele (ver
                ChapterChips, que continua existindo pra quem prefere). */}
            {onToggleChapter && (
              <button
                style={{ ...styles.chapterDoneBtn, ...(chDone ? styles.chapterDoneBtnActive : {}) }}
                onClick={() => onToggleChapter(session, ch, !chDone)}
              >
                <AppIcon name={chDone ? 'Check' : 'Circle'} size={13} />
                {chDone ? t('reading.chapterMarkedDone', { n: ch }, lang) : t('reading.markChapterDone', { n: ch }, lang)}
              </button>
            )}
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

function BookGroup({ group, isCurrentBook, heroSessionId, completedSet, onToggle, onToggleChapter, onFeature, isFreePlan, lang, mode, expandedChapterId, onToggleInline, onNextInline, getNextSessionFor, registerCardRef, lastClickedId, isDesktop }) {
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
            {doneCount}/{total} {t(isFreePlan ? 'reading.chaptersSuffix' : 'reading.sessionsSuffix', undefined, lang)}{isCurrentBook ? ` · ${t('reading.readingNow', undefined, lang)}` : ''}
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
              onToggleChapter={onToggleChapter}
              onFeature={onFeature}
              isFreePlan={isFreePlan}
              lang={lang}
              mode={mode}
              isExpanded={mode === 'browse' && s.id === expandedChapterId}
              onToggleInline={onToggleInline}
              onNextInline={onNextInline}
              nextSession={mode === 'browse' && s.id === expandedChapterId ? getNextSessionFor(s) : null}
              registerCardRef={registerCardRef}
              lastClickedId={lastClickedId}
              isDesktop={isDesktop}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({ session, isFeatured, completedSet, onToggle, onToggleChapter, onFeature, isFreePlan, lang, mode, isExpanded, onToggleInline, onNextInline, nextSession, registerCardRef, lastClickedId, isDesktop }) {
  const isDone       = session.status === 'done'
  const isCurrent    = session.status === 'current'
  const isReflection = session.type === 'reflection'
  const isBrowse     = mode === 'browse'
  const title = lang === 'en' ? session.titleEn : session.title
  const passage = lang === 'en' ? session.passageEn : session.passage

  // Nos capítulos da Bíblia (isFreePlan — o número mostrado é o capítulo em
  // si), o destaque preto é do ÚLTIMO capítulo em que a pessoa tocou, não
  // do "atual" do plano — enquanto nada foi tocado (lastClickedId nulo),
  // todos ficam no mesmo cinza padrão. Fora daí (sessões com vários
  // capítulos, plano guiado), continua indicando a sessão "current" de
  // sempre.
  const isBadgeActive = isFreePlan ? (lastClickedId != null && session.id === lastClickedId) : isCurrent

  const chapterCount = isReflection ? 0 : session.chEnd - session.chStart + 1
  const chaptersDone = isReflection ? 0 : Array.from(
    { length: chapterCount }, (_, i) => session.chStart + i
  ).filter(ch => completedSet.has(`${session.book}:${ch}`)).length

  return (
    <div
      ref={el => registerCardRef?.(session.id, el)}
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
      onClick={() => (isBrowse ? onToggleInline(session) : onFeature(session))}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 11 }}>
        {/* Ícone de status — toque rápido marca/desmarca a sessão inteira */}
        <div
          style={{
            width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: isDone ? 'var(--grad-vivid)' : isBadgeActive ? 'var(--bk)' : isReflection ? '#A855F7' : 'var(--g3)',
          }}
          onClick={e => { e.stopPropagation(); onToggle(session, !isDone) }}
        >
          {isDone ? (
            <AppIcon name="Check" size={15} color="white" />
          ) : isReflection ? (
            <AppIcon name="PenLine" size={13} color="white" />
          ) : (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: isBadgeActive ? 'white' : 'var(--g5)' }}>{isFreePlan ? session.chStart : session.id}</span>
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

        {/* Indicador: em modo 'browse' mostra seta de abrir/fechar o texto
            embutido; nos outros modos, já em destaque no topo ou toque pra
            destacar. */}
        {isBrowse ? (
          <AppIcon name="ChevronDown" size={15} color="var(--g4)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
        ) : isFeatured ? (
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--or)', whiteSpace: 'nowrap' }}>{lang === 'en' ? 'FEATURED' : 'EM DESTAQUE'}</span>
        ) : (
          <AppIcon name="ArrowUp" size={14} color="var(--g4)" />
        )}
      </div>

      {/* Texto do capítulo embutido, abre logo abaixo do card tocado — só
          em modo 'browse' (ver toggleInlineChapter/expandedChapterId lá em
          cima) e só no celular: no desktop essa lista é a coluna "mestre"
          estreita (300px), então ali o texto aparece no card de destaque
          largo ao lado (ver o mesmo openPanel==='texto' lá em cima, agora
          também cobrindo esse caso). O chevron abaixo continua girando
          igual nos dois casos, só pra indicar qual capítulo está aberto. */}
      {isBrowse && isExpanded && !isDesktop && (
        // Margem lateral reduzida (ver mesmo ajuste no painel de texto em
        // modo 'session') — o card já tem seu próprio respiro, não precisa
        // somar mais um em cima do padding do painel logo abaixo.
        <div style={{ padding: '0 4px 11px' }} onClick={e => e.stopPropagation()}>
          <BibleTextPanel session={session} lang={lang} completedSet={completedSet} onToggleChapter={onToggleChapter} />
          {nextSession && (
            <button style={styles.nextChapterBtn} onClick={() => onNextInline(session)}>
              {t('reading.nextChapter', { title: lang === 'en' ? nextSession.titleEn : nextSession.title }, lang)}
              <AppIcon name="ChevronRight" size={15} />
            </button>
          )}
        </div>
      )}
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
  panel:       { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
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
  bibleTextBody:        { fontSize: 14, fontWeight: 500, color: 'var(--bk)', lineHeight: 1.75, marginBottom: 16 },
  bibleTextVerseNum:    { fontSize: 9.5, fontWeight: 700, color: 'var(--or)', marginRight: 2 },
  bibleTextAttribution: { fontSize: 9.5, fontWeight: 500, color: 'var(--g4)', lineHeight: 1.5, marginTop: 14, paddingTop: 10, borderTop: '0.5px solid var(--g1)', fontStyle: 'italic' },
  nextChapterBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', borderRadius: 13, padding: 12, marginTop: 12, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: 'var(--grad-vivid)', boxShadow: 'var(--shadow-glow)' },
  chapterDoneBtn:       { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: '0.5px solid var(--g2)', borderRadius: 12, padding: 10, marginTop: 10, fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)', background: 'var(--g1)' },
  chapterDoneBtnActive: { background: 'var(--grad-vivid)', border: '0.5px solid transparent', color: 'white', boxShadow: '0 3px 8px rgba(249,115,22,.3)' },
}
