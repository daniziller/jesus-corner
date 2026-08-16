import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { groupSessionsByBook } from '../utils/groupByBook'
import { sessionKeys } from '../utils/progress'
import { BOOK_INFO } from '../data/bookInfo'
import { BOOK_INFO_EN } from '../data/bookInfo.en'
import { getNotes, saveNote, noteKeyFor, noteTextOf } from '../notes/notesStore'
import { getHighlights, saveHighlight, updateHighlightText, deleteHighlight } from '../highlights/highlightsStore'
import { getMessages, sendMessage, getDailyLimitStatus } from '../aiChat/aiChatStore'
import { formatVerseRanges } from '../utils/verseRanges'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId, setSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { BIBLE_VERSIONS, findBibleVersion } from '../data/bibleVersions'
import { setLastOpenedChapter } from '../reading/lastOpenedChapterStore'
import { dateKey } from '../utils/dateKey'
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

  // Progresso real DESTA sessão (não da "sessão de hoje" do plano ativo
  // global) — session.todaySession.progress era usado aqui antes, mas é o
  // progresso de outra sessão sempre que o hero está mostrando algo aberto
  // pela navegação livre (ex: um livro do NT nunca lido enquanto a leitura
  // ativa de verdade está em outro lugar), fazendo a barra mostrar uma
  // porcentagem sem relação nenhuma com o capítulo exibido.
  const heroSessionKeys = sessionKeys(heroSession)
  const heroSessionProgress = heroSessionKeys.length
    ? Math.round((heroSessionKeys.filter(k => completedSet.has(k)).length / heroSessionKeys.length) * 100)
    : 0

  // Qual capítulo tem o texto aberto INLINE, direto na lista de livros —
  // só existe em modo 'browse' (navegação livre pela Bíblia). Diferente do
  // modo 'session', aqui o texto não mora no card de destaque lá em cima:
  // abre embaixo do próprio capítulo que foi tocado, ver SessionCard.
  // Começa já aberto no capítulo de entrada (ex: veio de um chip de livro
  // clicável), pra já cair lendo sem precisar tocar de novo.
  const [expandedChapterId, setExpandedChapterId] = useState(
    mode === 'browse' ? (initialSessionId ?? autoHeroSession.id) : null
  )

  // Lembra o último capítulo aberto na navegação livre (mode 'browse') —
  // só aqui, não no fluxo guiado da Rotina/Plano (mode 'session'), que já
  // tem seu próprio "onde parei" (a sessão "current" do plano). É o que
  // alimenta o botão "Continuar leitura" na aba Bíblia (JourneyScreen.jsx).
  useEffect(() => {
    if (mode === 'browse' && expandedChapterId != null) {
      setLastOpenedChapter(block.id, expandedChapterId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, block.id, expandedChapterId])

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
    { key: 'ia',           icon: 'Bot',        label: t('reading.tagAskAi', undefined, lang) },
  ]
  const PANEL_KEYS = ['contexto', 'mapa', 'notas', 'curiosidades', 'ia']

  const [openPanel, setOpenPanel] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [hasSavedNote, setHasSavedNote] = useState(false)
  // Mapa INTEIRO de anotações (não só a da sessão em destaque) — é o que
  // permite mostrar o ícone de "tem anotação aqui" em qualquer capítulo da
  // lista abaixo (ver hasNoteFor/SessionCard), não só no card de destaque.
  const [notesMap, setNotesMap] = useState({})

  const heroNoteKey = noteKeyFor(heroSession)

  useEffect(() => {
    // Em modo 'browse', se a pessoa já estava lendo o texto, troca de
    // capítulo mantém o painel de Texto aberto — é o que permite continuar
    // lendo vários capítulos seguidos sem precisar tocar em "Texto" nem
    // vez. Qualquer outro painel (Contexto/Mapa/Notas/Curiosidades) sempre
    // fecha ao trocar, e em modo 'session' o comportamento é o de sempre.
    setOpenPanel(p => (mode === 'browse' && p === 'texto') ? 'texto' : null)
    if (!authUser?.email) { setNoteText(''); setHasSavedNote(false); setNotesMap({}); return }
    getNotes(authUser.email).then(map => {
      setNotesMap(map)
      setNoteText(noteTextOf(map[heroNoteKey]))
      setHasSavedNote(Boolean(noteTextOf(map[heroNoteKey])))
    })
  }, [heroNoteKey, authUser?.email, mode])

  function handleSaveNote(text) {
    setNoteText(text)
    setHasSavedNote(Boolean(text.trim()))
    // Atualiza o mapa local na hora (otimista) — sem isso, o ícone de "tem
    // anotação" na lista só apareceria depois de trocar de sessão e voltar
    // (próxima vez que o efeito acima buscasse de novo).
    setNotesMap(prev => {
      const next = { ...prev }
      if (text.trim()) next[heroNoteKey] = { text }
      else delete next[heroNoteKey]
      return next
    })
    saveNote(authUser?.email, heroNoteKey, text).catch(err => {
      console.error('Failed to persist note', err)
    })
  }

  function hasNoteFor(session) {
    return Boolean(noteTextOf(notesMap[noteKeyFor(session)]))
  }

  // Marcações de trechos específicos (versículo a versículo, ver
  // src/highlights/highlightsStore.js) — busca TODAS de uma vez (não só as
  // do livro em destaque), igual notesMap acima, pra alimentar o pontinho
  // no chip de qualquer capítulo da lista sem precisar trocar de sessão
  // pra descobrir. Só carrega 1 vez por usuário (não depende de
  // heroNoteKey/mode como o efeito das notas).
  const [highlights, setHighlights] = useState([])
  useEffect(() => {
    if (!authUser?.email) { setHighlights([]); return }
    getHighlights(authUser.email).then(setHighlights).catch(err => {
      console.error('Failed to load highlights', err)
    })
  }, [authUser?.email])

  // Otimista igual handleSaveNote acima: atualiza o estado local na hora,
  // persiste em segundo plano. sessionMode ('session'|'browse') é o que
  // decide se esse highlight aparece na Reflexão do dia (ver
  // ReflectionScreen.jsx) — só os feitos durante uma sessão guiada contam.
  function handleSaveHighlight(book, bookEn, chapter, verses, text) {
    const highlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      book, bookEn, chapter, verses,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      date: dateKey(),
      sessionMode: mode === 'session' ? 'session' : 'browse',
    }
    setHighlights(prev => [...prev, highlight])
    saveHighlight(authUser?.email, highlight).catch(err => {
      console.error('Failed to persist highlight', err)
    })
  }

  function handleUpdateHighlightText(id, text) {
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, text } : h))
    updateHighlightText(authUser?.email, id, text).catch(err => {
      console.error('Failed to update highlight', err)
    })
  }

  function handleDeleteHighlight(id) {
    setHighlights(prev => prev.filter(h => h.id !== id))
    deleteHighlight(authUser?.email, id).catch(err => {
      console.error('Failed to delete highlight', err)
    })
  }

  const heroBooks = [{ name: heroSession.book, displayName: heroSession.bookEn, info: bookInfoSource[heroSession.book] }].filter(b => b.info)
  const heroTitle = lang === 'en' ? heroSession.titleEn : heroSession.title
  const heroPassage = lang === 'en' ? heroSession.passageEn : heroSession.passage
  const heroChapterSpan = heroSession.type === 'reflection' ? 0 : heroSession.chEnd - heroSession.chStart + 1
  const heroChapterWord = lang === 'en' ? (heroChapterSpan === 1 ? 'chapter' : 'chapters') : (heroChapterSpan === 1 ? 'capítulo' : 'capítulos')
  const heroBookDisplayName = lang === 'en' ? heroSession.bookEn : heroSession.book

  // heroSession já é sempre "o que a pessoa está lendo agora" mesmo em modo
  // 'browse' — toggleInlineChapter (acima) chama featureSession sempre que
  // um capítulo é aberto na lista, então não precisa rastrear
  // expandedChapterId à parte aqui: abrir o chat sobre heroSession já
  // cobre tanto o card em destaque (modo 'session') quanto o capítulo
  // aberto na navegação livre (modo 'browse'). Não rola a tela: o chat
  // agora flutua por cima (ver aiChatOverlay* abaixo), então a pessoa
  // nunca sai de onde estava lendo pra abrir/fechar ele.
  function openAiChat() {
    setOpenPanel('ia')
  }

  return (
    <>
    {/* Portal pro <body> — não pro fluxo normal: .app-content-inner tem
        zoom:1.15 (recurso de texto grande, sempre ativo nessa escala
        mínima), e "zoom" cria um novo bloco de containment pra
        position:fixed no Chrome/Safari, fazendo o botão calcular a
        posição errada (testado: aparecia fora da tela). Fora dessa
        árvore, o mesmo truque de centralização de .bottom-nav
        (left:50%+translateX(-50%) dentro de max-width:var(--max-width))
        funciona igual. */}
    {heroSession.type !== 'reflection' && createPortal(
      <div style={styles.aiFabWrap}>
        <button type="button" style={styles.aiFab} onClick={openAiChat} aria-label={t('reading.tagAskAi', undefined, lang)}>
          <AppIcon name="Bot" size={22} color="white" />
        </button>
      </div>,
      document.body
    )}
    {/* Chat flutua por cima da leitura (mesmo motivo do portal acima) — a
        pessoa nunca sai de onde estava; fecha com o X ou tocando fora, e
        volta pra exatamente a mesma posição de rolagem de antes. */}
    {openPanel === 'ia' && heroSession.type !== 'reflection' && createPortal(
      <div style={styles.aiChatOverlayBackdrop} onClick={() => setOpenPanel(null)}>
        <div style={styles.aiChatOverlayWindow} onClick={e => e.stopPropagation()}>
          <div style={styles.aiChatOverlayHeader}>
            <span style={styles.aiChatOverlayTitle}>
              <span style={styles.aiChatOverlayIcon}><AppIcon name="Bot" size={15} color="#A21CAF" /></span>
              {t('reading.tagAskAi', undefined, lang)}
            </span>
            <button type="button" style={styles.aiChatOverlayClose} onClick={() => setOpenPanel(null)} aria-label={t('aiChat.close', undefined, lang)}>
              <AppIcon name="X" size={16} color="var(--g5)" />
            </button>
          </div>
          <div style={styles.aiChatOverlayBody}>
            <AiChatPanel session={heroSession} lang={lang} />
          </div>
        </div>
      </div>,
      document.body
    )}
    <div ref={scrollRef} style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
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
            <button onClick={onBack} style={styles.heroBackBtn} aria-label="back">
              <AppIcon name="ArrowLeft" size={17} color="white" />
            </button>
            <div style={styles.heroContent}>
              <p style={styles.heroCycle}>{isFreePlan ? blockName : `${blockName} · ${t('reading.sessionLabel', { n: heroSession.id }, lang)} ${lang === 'en' ? 'of' : 'de'} ${block.sessionsTotal}`}</p>
              <h2 style={styles.heroTitle}>{heroTitle}</h2>
              <p style={styles.heroSub}>
                {heroSession.type === 'reflection' ? heroPassage : `${heroPassage} · ${heroChapterSpan} ${heroChapterWord}`}
              </p>
              <div style={{ height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, width: `${heroSessionProgress}%` }} />
              </div>
              <div style={styles.heroTags}>
                {/* O chat de IA (FAB/overlay, mais abaixo) fica escondido em
                    sessões de Reflexão — sem isso a tag ficava "ativa"
                    (destacada) sem nenhum painel abrir de verdade. */}
                {(heroSession.type === 'reflection' ? TAGS.filter(tag => tag.key !== 'ia') : TAGS).map(tag => (
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
                highlights={highlights}
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
                <BibleTextPanel
                  session={heroSession}
                  lang={lang}
                  completedSet={completedSet}
                  onToggleChapter={onToggleChapter}
                  highlights={highlights}
                  onSaveHighlight={handleSaveHighlight}
                  onUpdateHighlightText={handleUpdateHighlightText}
                  onDeleteHighlight={handleDeleteHighlight}
                />
                {nextForHero && (
                  <button style={styles.nextChapterBtn} onClick={() => goToNextInline(heroSession)}>
                    {t('reading.nextChapter', { title: lang === 'en' ? nextForHero.titleEn : nextForHero.title }, lang)}
                    <AppIcon name="ChevronRight" size={15} />
                  </button>
                )}
              </div>
            ) : null
          })()}
          {openPanel && openPanel !== 'notas' && openPanel !== 'texto' && openPanel !== 'ia' && (
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

          {/* Sessão concluída no fluxo guiado (mode 'session', não a
              navegação livre da aba Bíblia) — próximo passo da rotina é a
              Reflexão, mesmo padrão do "Ir para a Leitura" que aparece no
              fim do cronômetro de Oração (PrayerScreen.jsx). */}
          {mode !== 'browse' && heroSession.status === 'done' && (
            <div style={{ padding: '0 14px 4px' }}>
              <button style={styles.nextStepBtn} onClick={() => onNavigate?.('reflection')}>
                {t('routine.goToReflection', undefined, lang)} <AppIcon name="ChevronRight" size={15} />
              </button>
            </div>
          )}
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
              hasNoteFor={hasNoteFor}
              highlights={highlights}
              onSaveHighlight={handleSaveHighlight}
              onUpdateHighlightText={handleUpdateHighlightText}
              onDeleteHighlight={handleDeleteHighlight}
            />
          ))}
        </div>
      </div>
    </div>
    </>
  )
}

// Fileira de capítulos clicáveis de uma sessão — usada no destaque (sempre
// visível). O botão "Texto" (quando informado) entra como 1o item da
// fileira, junto dos capítulos que ele exibe.
function ChapterChips({ session, completedSet, onToggleChapter, lang, textOpen, onToggleText, highlights }) {
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
        // Ponto dourado — mesmo tom das marcações em si (ver
        // styles.verseHighlighted) — avisa que esse capítulo tem algum
        // trecho marcado, sem precisar abrir o texto pra descobrir.
        const hasHighlight = highlights?.some(h => h.book === session.book && h.chapter === ch)
        return (
          <button
            key={ch}
            style={{ ...styles.chapterChip, ...(done ? styles.chapterChipDone : {}), position: 'relative' }}
            onClick={e => { e.stopPropagation(); onToggleChapter(session, ch, !done) }}
          >
            {done ? '✓ ' : ''}{chLabel} {ch}
            {hasHighlight && <span style={styles.chapterChipDot} />}
          </button>
        )
      })}
    </div>
  )
}

function ChapterChecklist({ session, completedSet, onToggleChapter, lang, textOpen, onToggleText, highlights }) {
  const chapters = []
  for (let ch = session.chStart; ch <= session.chEnd; ch++) chapters.push(ch)
  const doneCount = chapters.filter(ch => completedSet.has(`${session.book}:${ch}`)).length

  return (
    <div style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <p style={{ ...styles.panelBookLabel, marginBottom: 0 }}>{t('reading.chaptersOfSession', undefined, lang)}</p>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--g5)' }}>{t('reading.chaptersReadCount', { done: doneCount, total: chapters.length }, lang)}</span>
      </div>
      <ChapterChips session={session} completedSet={completedSet} onToggleChapter={onToggleChapter} lang={lang} textOpen={textOpen} onToggleText={onToggleText} highlights={highlights} />
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

function BibleTextPanel({ session, lang, completedSet, onToggleChapter, highlights, onSaveHighlight, onUpdateHighlightText, onDeleteHighlight }) {
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

  // Versículos escolhidos AGORA pra virar um highlight novo — sempre de um
  // capítulo só (ver decisão de escopo no plano); tocar num versículo de
  // outro capítulo enquanto uma seleção está em andamento troca pra ela,
  // não soma (evita misturar capítulos numa marcação só). `editingId` é o
  // highlight JÁ salvo aberto pra ver/editar/apagar (tocar num versículo
  // que já pertence a um cai aqui em vez de somar à seleção).
  const [selection, setSelection] = useState(null) // { chapter, verses: Set<number> } | null
  const [editingId, setEditingId] = useState(null)

  function highlightForVerse(ch, v) {
    return highlights?.find(h => h.book === session.book && h.chapter === ch && h.verses.includes(v))
  }

  function handleVerseNumberClick(ch, v) {
    const existing = highlightForVerse(ch, v)
    if (existing) { setEditingId(existing.id); setSelection(null); return }
    setEditingId(null)
    setSelection(prev => {
      if (!prev || prev.chapter !== ch) return { chapter: ch, verses: new Set([v]) }
      const verses = new Set(prev.verses)
      if (verses.has(v)) verses.delete(v)
      else verses.add(v)
      return verses.size === 0 ? null : { chapter: ch, verses }
    })
  }

  function handleSaveSelection(text) {
    if (!selection || !text.trim() || !onSaveHighlight) return
    onSaveHighlight(session.book, session.bookEn, selection.chapter, [...selection.verses].sort((a, b) => a - b), text)
    setSelection(null)
  }

  const editingHighlight = editingId ? highlights?.find(h => h.id === editingId) : null

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
                {verseNums.map((v, vIdx) => {
                  // Toca no NÚMERO (não no texto corrido) pra marcar — evita
                  // brigar com o toque normal de ler/rolar a tela. Versículo
                  // já marcado (highlight salvo) ganha fundo dourado sempre;
                  // em seleção (ainda não salvo) ganha um contorno tracejado.
                  const isHighlighted = Boolean(highlightForVerse(ch, v))
                  const isSelected = selection?.chapter === ch && selection.verses.has(v)
                  return (
                    <span key={v} style={isHighlighted ? styles.verseHighlighted : isSelected ? styles.verseSelected : undefined}>
                      {vIdx > 0 && chapter.breaks[String(v)] === 'L' && <br />}
                      <sup
                        style={{ ...styles.bibleTextVerseNum, ...styles.verseNumBtn }}
                        onClick={() => handleVerseNumberClick(ch, v)}
                      >
                        {v}
                      </sup>
                      {chapter.verses[String(v)].split('\n').map((line, lIdx, arr) => (
                        <span key={lIdx}>
                          {line}
                          {lIdx < arr.length - 1 && <br />}
                        </span>
                      ))}{' '}
                    </span>
                  )
                })}
              </p>
            ))}

            {/* Compor um highlight novo (versículos selecionados nesse
                capítulo) ou ver/editar/apagar um já salvo — só um dos dois
                por vez, nunca junto (ver handleVerseNumberClick). */}
            {selection?.chapter === ch && (
              <HighlightNoteBox
                countLabel={t('reading.markVerses', { n: selection.verses.size }, lang)}
                onSave={handleSaveSelection}
                onCancel={() => setSelection(null)}
                lang={lang}
              />
            )}
            {editingHighlight?.chapter === ch && (
              <HighlightNoteBox
                countLabel={`${chLabel} ${ch}:${formatVerseRanges(editingHighlight.verses)}`}
                initialText={editingHighlight.text}
                onSave={text => { onUpdateHighlightText?.(editingHighlight.id, text); setEditingId(null) }}
                onDelete={() => { onDeleteHighlight?.(editingHighlight.id); setEditingId(null) }}
                onCancel={() => setEditingId(null)}
                lang={lang}
              />
            )}

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

// Caixa pra compor a nota de um highlight novo (countLabel = "Marcar N
// versículos") ou ver/editar/apagar um já salvo (countLabel = referência
// tipo "Cap. 6:9–13", initialText preenchido, onDelete presente). Mesmo
// padrão visual das outras caixas de nota do arquivo (NotesPanel).
function HighlightNoteBox({ countLabel, initialText = '', onSave, onDelete, onCancel, lang }) {
  const [text, setText] = useState(initialText)

  return (
    <div style={styles.highlightBox}>
      <p style={styles.highlightBoxLabel}>
        <AppIcon name="Highlighter" size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        {countLabel}
      </p>
      <textarea
        style={styles.notesTextarea}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('reading.highlightNotePlaceholder', undefined, lang)}
        rows={2}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ ...styles.notesSaveBtn, width: 'auto', flex: 1, marginBottom: 0 }} onClick={() => onSave(text)} disabled={!text.trim()}>
          {t('reading.highlightSave', undefined, lang)}
        </button>
        <button style={styles.highlightCancelBtn} onClick={onCancel}>
          {t('reading.highlightCancel', undefined, lang)}
        </button>
        {onDelete && (
          <button style={styles.highlightDeleteBtn} onClick={onDelete} aria-label={t('reading.highlightDelete', undefined, lang)}>
            <AppIcon name="Trash2" size={13} />
          </button>
        )}
      </div>
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

// Chat com IA sobre o texto em destaque — ver api/chat-about-text.js
// (escopo: contexto histórico/geográfico/cultural e o que o texto bíblico
// em si diz, nunca doutrina/interpretação pessoal — ver outOfScopeNote
// abaixo, sempre visível, não só quando a IA recusa algo). Histórico
// carrega 1x ao abrir o painel (mesma passage_key de noteKeyFor, já usada
// pelas anotações) e cresce localmente (otimista) a cada envio, sem
// recarregar tudo de novo.
function AiChatPanel({ session, lang }) {
  const passageKey = noteKeyFor(session)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  // Quantas perguntas já foram feitas hoje (limite diário) — null enquanto
  // não carregou ainda. Buscado uma vez ao abrir o painel (não depende da
  // passagem, é um limite por dia pra pessoa toda) e atualizado a cada
  // envio, pra mostrar o limite de forma clara ANTES de esbarrar nele.
  const [limitStatus, setLimitStatus] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getMessages(passageKey).then(rows => {
      if (!cancelled) setMessages(rows)
    }).catch(err => {
      console.error('Failed to load AI chat history', err)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [passageKey])

  useEffect(() => {
    let cancelled = false
    getDailyLimitStatus().then(status => {
      if (!cancelled) setLimitStatus(status)
    }).catch(err => {
      console.error('Failed to load AI chat daily limit', err)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, sending])

  const atLimit = limitStatus != null && limitStatus.remaining <= 0

  async function handleSend() {
    const message = text.trim()
    if (!message || sending || atLimit) return
    setSending(true)
    setError('')
    setText('')
    try {
      const { userMessage, assistantMessage, used, remaining, max } = await sendMessage({
        book: session.book, chStart: session.chStart, chEnd: session.chEnd, message, lang,
      })
      setMessages(prev => [...prev, userMessage, assistantMessage])
      if (remaining != null) setLimitStatus({ used, remaining, max })
    } catch (err) {
      if (err.remaining != null) setLimitStatus({ used: err.used, remaining: err.remaining, max: err.max })
      setError(
        err.message === 'subscription_required' ? t('aiChat.subscriptionRequired', undefined, lang)
        : err.message === 'daily_limit_reached' ? t('aiChat.dailyLimitReached', undefined, lang)
        : t('aiChat.genericError', undefined, lang)
      )
      setText(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={styles.aiChatBody}>
      <p style={styles.aiChatScopeNote}>{t('aiChat.outOfScopeNote', undefined, lang)}</p>

      <div ref={listRef} style={styles.aiChatList}>
        {!loading && messages.length === 0 && (
          <p style={styles.aiChatEmptyHint}>{t('aiChat.emptyHint', undefined, lang)}</p>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ ...styles.aiChatBubble, ...(m.role === 'user' ? styles.aiChatBubbleUser : styles.aiChatBubbleAi) }}>
            {m.content}
          </div>
        ))}
        {sending && (
          <div style={{ ...styles.aiChatBubble, ...styles.aiChatBubbleAi, ...styles.aiChatBubbleTyping }}>
            {t('aiChat.generatingHint', undefined, lang)}
          </div>
        )}
      </div>

      {/* Erro pontual de um envio (ex: falha de rede) tem prioridade; sem
          erro novo, mas já no limite, mostra a mensagem de limite de forma
          persistente — não só depois de tentar enviar e falhar. */}
      {(error || atLimit) && <p style={styles.errorText}>{error || t('aiChat.dailyLimitReached', undefined, lang)}</p>}

      <div style={styles.aiChatInputRow}>
        <input
          type="text"
          style={styles.aiChatInput}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
          placeholder={t('aiChat.placeholder', undefined, lang)}
          maxLength={500}
          disabled={sending || atLimit}
        />
        <button style={styles.aiChatSendBtn} onClick={handleSend} disabled={sending || atLimit || !text.trim()}>
          <AppIcon name="ArrowUp" size={16} color="white" />
        </button>
      </div>

      {/* Contador do limite diário — sempre visível assim que carrega, pra
          o limite nunca ser surpresa (pedido explícito: deixar mais claro
          pro usuário). */}
      {limitStatus && !atLimit && (
        <p style={styles.aiChatLimitCounter}>
          {t('aiChat.dailyLimitCounter', { remaining: limitStatus.remaining, max: limitStatus.max }, lang)}
        </p>
      )}
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

function BookGroup({ group, isCurrentBook, heroSessionId, completedSet, onToggle, onToggleChapter, onFeature, isFreePlan, lang, mode, expandedChapterId, onToggleInline, onNextInline, getNextSessionFor, registerCardRef, lastClickedId, isDesktop, hasNoteFor, highlights, onSaveHighlight, onUpdateHighlightText, onDeleteHighlight }) {
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

  // O nome do livro agora é só um cabeçalho leve (sem fundo de card em volta
  // dele nem dos capítulos) — antes o texto do capítulo expandido ficava
  // dentro de DOIS blocos aninhados (este card do livro + o card do próprio
  // capítulo), deixando a coluna de leitura estreita demais. Sem o card
  // externo, o texto só fica dentro de 1 bloco (o do capítulo).
  return (
    <div>
      {/* Cabeçalho do livro — sem card nenhum (nem fundo, nem ícone num
          quadrado colorido): só ícone simples + texto, com uma linha fina
          embaixo separando do próximo livro. "Lendo agora" vira só a cor do
          texto (laranja), não mais um bloco preenchido — mesmo espírito
          minimalista da lista de capítulos logo abaixo. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 2px', userSelect: 'none', cursor: 'pointer',
          borderBottom: '0.5px solid var(--g1)',
        }}
        onClick={handleHeaderClick}
      >
        <AppIcon name={allDone ? 'CheckCircle2' : 'BookOpen'} size={15} color={allDone ? 'var(--gr)' : isCurrentBook ? 'var(--or)' : 'var(--g4)'} style={{ flexShrink: 0 }} />

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bk)', marginBottom: 1 }}>{displayName}</p>
          <p style={{ fontSize: 9.5, fontWeight: 500, color: isCurrentBook ? 'var(--or)' : 'var(--g4)' }}>
            {doneCount}/{total} {t(isFreePlan ? 'reading.chaptersSuffix' : 'reading.sessionsSuffix', undefined, lang)}{isCurrentBook ? ` · ${t('reading.readingNow', undefined, lang)}` : ''}
          </p>
        </div>

        <AppIcon name="ChevronDown" size={14} color="var(--g4)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </div>

      {open && (
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }} onClick={e => e.stopPropagation()}>
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
              hasNote={hasNoteFor(s)}
              highlights={highlights}
              onSaveHighlight={onSaveHighlight}
              onUpdateHighlightText={onUpdateHighlightText}
              onDeleteHighlight={onDeleteHighlight}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({ session, isFeatured, completedSet, onToggle, onToggleChapter, onFeature, isFreePlan, lang, mode, isExpanded, onToggleInline, onNextInline, nextSession, registerCardRef, lastClickedId, isDesktop, hasNote, highlights, onSaveHighlight, onUpdateHighlightText, onDeleteHighlight }) {
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
        // Redesenho minimalista: sem fundo/borda/sombra por padrão (só o
        // espaçamento entre linhas já separa uma sessão da outra) — a
        // sessão em destaque ganha só um fundo suave, sem borda pesada nem
        // sombra, pra marcar sem parecer um bloco solto na tela.
        background: isFeatured ? 'var(--olt)' : 'transparent',
        borderRadius: 11,
        cursor: 'pointer',
      }}
      onClick={() => (isBrowse ? onToggleInline(session) : onFeature(session))}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px' }}>
        {/* Ícone de status — toque rápido marca/desmarca a sessão inteira */}
        <div
          style={{
            width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: isDone ? 'var(--grad-vivid)' : isBadgeActive ? 'var(--bk)' : isReflection ? '#A855F7' : 'var(--g1)',
          }}
          onClick={e => { e.stopPropagation(); onToggle(session, !isDone) }}
        >
          {isDone ? (
            <AppIcon name="Check" size={13} color="white" />
          ) : isReflection ? (
            <AppIcon name="PenLine" size={11} color="white" />
          ) : (
            <span style={{ fontSize: 10, fontWeight: 700, color: isBadgeActive ? 'white' : 'var(--g5)' }}>{isFreePlan ? session.chStart : session.id}</span>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bk)', marginBottom: 1 }}>
            {isReflection || isFreePlan ? title : `${t('reading.sessionLabel', { n: session.id }, lang)} · ${title}`}
            {/* Ícone de "já tem anotação aqui" — pra não precisar abrir o
                capítulo de novo só pra descobrir se escreveu algo nele.
                Ver hasNoteFor em ReadingBlockView (componente pai). */}
            {hasNote && (
              <AppIcon
                name="StickyNote" size={11} color="var(--or)"
                style={{ verticalAlign: 'middle', marginLeft: 5, position: 'relative', top: -1 }}
              />
            )}
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
          <AppIcon name="ChevronDown" size={14} color="var(--g4)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
        ) : isFeatured ? (
          <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--or)', whiteSpace: 'nowrap' }}>{lang === 'en' ? 'FEATURED' : 'EM DESTAQUE'}</span>
        ) : (
          <AppIcon name="ArrowUp" size={13} color="var(--g4)" />
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
          <BibleTextPanel
            session={session}
            lang={lang}
            completedSet={completedSet}
            onToggleChapter={onToggleChapter}
            highlights={highlights}
            onSaveHighlight={onSaveHighlight}
            onUpdateHighlightText={onUpdateHighlightText}
            onDeleteHighlight={onDeleteHighlight}
          />
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
  hero:        { height: 224, margin: '10px 14px', borderRadius: 22, overflow: 'hidden', position: 'relative', background: 'var(--bk-hero)', flexShrink: 0, boxShadow: '0 12px 28px rgba(0,0,0,.18)' },
  heroOrbOrange:{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(60px)', opacity: 0.5, top: -60, right: -50 },
  heroOrbPink: { position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(60px)', opacity: 0.3, bottom: -50, left: -40 },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 65%)' },
  heroBackBtn: { position: 'absolute', top: 14, left: 14, zIndex: 1, width: 32, height: 32, borderRadius: '50%', border: '0.5px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  heroContent: { position: 'absolute', bottom: 14, left: 14, right: 14 },
  heroCycle:   { fontSize: 9.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  heroTitle:   { fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 700, fontStyle: 'italic', color: 'white', marginBottom: 4, letterSpacing: '-0.2px', lineHeight: 1.15 },
  heroSub:     { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)' },
  heroTags:    { display: 'flex', gap: 7, overflowX: 'auto', marginTop: 12 },
  heroTag:     { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,.12)', border: '0.5px solid rgba(255,255,255,.18)', borderRadius: 20, padding: '5px 10px', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.85)', cursor: 'pointer' },
  heroTagActive:{ background: 'var(--grad-primary)', border: '0.5px solid transparent', color: 'white', boxShadow: '0 4px 12px rgba(157,67,0,.4)' },
  heroTagDot:  { display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--or)', marginLeft: 5 },
  completeBtn: { width: '100%', background: 'var(--grad-primary)', border: 'none', borderRadius: 13, padding: 12, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-premium)' },
  completeBtnDone:{ background: 'var(--g1)', color: 'var(--g5)', boxShadow: 'none', border: '0.5px solid var(--g2)' },
  nextStepBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', borderRadius: 13, padding: 12, fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font)', color: 'white', cursor: 'pointer', background: 'var(--bk)', boxShadow: 'var(--shadow-premium)' },
  panel:       { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  panelBookLabel:{ fontSize: 9.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  panelText:   { fontSize: 12, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.55 },
  contextSections:    { marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--g1)', display: 'flex', flexDirection: 'column', gap: 11 },
  contextSectionTitle:{ fontSize: 11, fontWeight: 700, color: 'var(--bk)', marginBottom: 3 },
  panelLocationIcon:{ width: 38, height: 38, borderRadius: 11, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  panelLocationName:{ fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 2 },
  panelBullet: { width: 5, height: 5, borderRadius: '50%', background: 'var(--or)', flexShrink: 0, marginTop: 6 },
  notesTextarea:{ width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: 10, background: 'var(--g1)' },
  notesSaveBtn:{ width: '100%', background: 'var(--grad-primary)', border: 'none', borderRadius: 11, padding: 10, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-premium)' },
  chapterChip:    { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 20, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'var(--g6)', cursor: 'pointer', fontFamily: 'var(--font)' },
  chapterChipDone:{ background: 'var(--grad-vivid)', border: '0.5px solid transparent', color: 'white', boxShadow: '0 3px 8px rgba(157,67,0,.3)' },
  chapterTextBtn:      { background: 'var(--bk)', border: '0.5px solid var(--bk)', color: 'white' },
  chapterTextBtnActive:{ background: 'var(--grad-primary)', border: '0.5px solid transparent', boxShadow: '0 3px 8px rgba(157,67,0,.3)' },
  reflectionTip:  { background: 'linear-gradient(135deg,#F3E8FF,#E1CBFF)', border: '0.5px dashed rgba(168,85,247,.4)', borderRadius: 11, padding: 11, fontSize: 12.5, fontWeight: 500, color: '#6B21A8', lineHeight: 1.5 },
  reflectionNumber:{ width: 20, height: 20, borderRadius: '50%', background: '#A855F7', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  bibleTextVersionRow:  { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  bibleTextVersionBtn:  { border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 20, padding: '5px 11px', fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
  bibleTextVersionBtnActive: { background: 'var(--grad-primary)', border: '0.5px solid transparent', color: 'white', boxShadow: '0 3px 8px rgba(157,67,0,.3)' },
  bibleTextChapter:     { marginBottom: 16, paddingTop: 12, borderTop: '0.5px solid var(--g1)' },
  bibleTextChapterLabel:{ fontSize: 12.5, fontWeight: 800, color: 'var(--bk)', marginBottom: 6 },
  bibleTextBody:        { fontSize: 14, fontWeight: 500, color: 'var(--bk)', lineHeight: 1.75, marginBottom: 16 },
  bibleTextVerseNum:    { fontSize: 9.5, fontWeight: 700, color: 'var(--or)', marginRight: 2 },
  bibleTextAttribution: { fontSize: 9.5, fontWeight: 500, color: 'var(--g4)', lineHeight: 1.5, marginTop: 14, paddingTop: 10, borderTop: '0.5px solid var(--g1)', fontStyle: 'italic' },
  nextChapterBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', borderRadius: 13, padding: 12, marginTop: 12, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-premium)' },
  chapterDoneBtn:       { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: '0.5px solid var(--g2)', borderRadius: 12, padding: 10, marginTop: 10, fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)', background: 'var(--g1)' },
  chapterDoneBtnActive: { background: 'var(--grad-primary)', border: '0.5px solid transparent', color: 'white', boxShadow: '0 3px 8px rgba(157,67,0,.3)' },

  // Marcação de trechos específicos (versículo a versículo) — ver
  // src/highlights/highlightsStore.js. Mesma família de tom do resto do
  // app pra "destaque" (--gold), não o marrom/laranja de marca (--or),
  // pra não confundir com "capítulo lido" (chapterChipDone já usa --grad-vivid).
  chapterChipDot:  { position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', border: '1.5px solid var(--card-bg)' },
  verseNumBtn:     { cursor: 'pointer', padding: '0 2px' },
  verseHighlighted:{ background: 'rgba(201,154,74,.28)', borderRadius: 3 },
  verseSelected:   { background: 'rgba(201,154,74,.14)', borderRadius: 3, outline: '1px dashed rgba(201,154,74,.7)', outlineOffset: 1 },
  highlightBox:    { background: 'var(--olt)', border: '0.5px dashed var(--gold-soft)', borderRadius: 13, padding: 11, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 },
  highlightBoxLabel:{ fontSize: 10.5, fontWeight: 700, color: 'var(--brand-deep)', display: 'flex', alignItems: 'center' },
  highlightCancelBtn:{ flex: 1, background: 'white', border: '0.5px solid var(--g2)', borderRadius: 11, padding: 10, fontSize: 12, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
  highlightDeleteBtn:{ width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--rel)', border: '0.5px solid rgba(220,38,38,.25)', borderRadius: 11, color: 'var(--re)', cursor: 'pointer' },

  // Chat com IA sobre o texto (ver AiChatPanel) — flutua por cima da
  // leitura (ver aiChatOverlay* mais abaixo) em vez de abrir um card
  // dentro do fluxo da página, pra não tirar a pessoa de onde estava lendo.
  // Bolhas reaproveitam as mesmas cores de botão/marca já usadas no resto
  // do app (--grad-primary pra "eu"/usuário, --g1 neutro pra IA), nada de
  // paleta nova.
  aiChatBody:      { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
  aiChatScopeNote: { fontSize: 10.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.4, margin: '0 0 10px', paddingBottom: 10, borderBottom: '0.5px solid var(--g1)', flexShrink: 0 },
  aiChatList:      { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 10 },
  aiChatEmptyHint: { fontSize: 12, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', padding: '14px 4px' },
  aiChatBubble:    { maxWidth: '85%', padding: '9px 12px', borderRadius: 14, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  aiChatBubbleUser:{ alignSelf: 'flex-end', background: 'var(--grad-primary)', color: 'white', borderBottomRightRadius: 4 },
  aiChatBubbleAi:  { alignSelf: 'flex-start', background: 'var(--g1)', color: 'var(--bk)', borderBottomLeftRadius: 4 },
  aiChatBubbleTyping: { color: 'var(--g5)', fontStyle: 'italic' },
  aiChatInputRow:  { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
  aiChatInput:     { flex: 1, border: '0.5px solid var(--g2)', borderRadius: 20, padding: '10px 14px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', outline: 'none', background: 'var(--g1)' },
  aiChatSendBtn:   { width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow-premium)' },
  errorText:       { fontSize: 11.5, fontWeight: 600, color: 'var(--re)', marginBottom: 8, flexShrink: 0 },
  aiChatLimitCounter: { fontSize: 10, fontWeight: 500, color: 'var(--g4)', textAlign: 'right', margin: '5px 2px 0', flexShrink: 0 },

  // Botão flutuante do chat com IA — sempre visível enquanto lendo, atalho
  // pra mesma aba "Perguntar à IA" (ver openAiChat). Wrap com o mesmo
  // truque de centralização de .bottom-nav (left:50%+translateX(-50%)
  // dentro de max-width:var(--max-width)) pra ficar alinhado com a coluna
  // real do app em telas largas, não colado na borda física da janela.
  // Cor roxa (#A21CAF) — mesmo tom já usado em todo recurso de IA do app
  // (ThemePlanScreen.jsx), pra sinalizar "isso é IA" de forma consistente.
  aiFabWrap: { position: 'fixed', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 'var(--max-width)', zIndex: 90, pointerEvents: 'none' },
  aiFab: { position: 'absolute', right: 16, bottom: 'calc(var(--nav-height) + 16px)', width: 52, height: 52, borderRadius: '50%', border: 'none', background: '#A21CAF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 24px rgba(162,28,175,.4)', pointerEvents: 'auto' },

  // Janela flutuante do chat — "nuvem" pedida: aparece por cima da leitura
  // (ancorada embaixo, tipo bandeja de mensagens), sem tirar a pessoa da
  // posição de rolagem em que estava. Mesmo truque de centralização de
  // .bottom-nav/.aiFabWrap, portada pro <body> (ver comentário no JSX
  // sobre zoom:1.15 quebrar position:fixed dentro de .app-content-inner).
  aiChatOverlayBackdrop: { position: 'fixed', inset: 0, background: 'rgba(18,18,18,.32)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  aiChatOverlayWindow: { width: '100%', maxWidth: 'var(--max-width)', height: '72vh', maxHeight: 640, background: 'var(--white)', borderRadius: '24px 24px 0 0', boxShadow: '0 -12px 40px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  aiChatOverlayHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid var(--g1)', flexShrink: 0 },
  aiChatOverlayTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: 'var(--bk)' },
  aiChatOverlayIcon: { width: 28, height: 28, borderRadius: 9, background: '#FAE8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  aiChatOverlayClose: { width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  aiChatOverlayBody: { flex: 1, minHeight: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column' },
}
