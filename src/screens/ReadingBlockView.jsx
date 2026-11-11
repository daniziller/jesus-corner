import { Fragment, useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { BOOK_INFO } from '../data/bookInfo'
import { BOOK_INFO_EN } from '../data/bookInfo.en'
import { getNotes, saveNote, noteKeyFor, noteTextOf } from '../notes/notesStore'
import { getHighlights, saveHighlight, updateHighlightText, hideHighlight } from '../highlights/highlightsStore'
import { getMessages, sendMessage, getDailyLimitStatus } from '../aiChat/aiChatStore'
import { formatVerseRanges } from '../utils/verseRanges'
import { askAboutPassage, fetchPassageSuggestions, reportPassageAnswer } from '../aiChat/passageQuestionStore'
import { getChapterContextEnabled, isChapterContextSeen, markChapterContextSeen, fetchChapterContext } from '../aiChat/chapterContextStore'
import { getAskEnabled } from '../aiChat/aiPreferencesStore'
import { fetchBookText, groupIntoParagraphs } from '../bible-text/bibleTextStore'
import { getSelectedVersionId, setSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { computeBookChapterCounts } from '../utils/progress'
import { BIBLE_VERSIONS, findBibleVersion } from '../data/bibleVersions'
import { setLastReadPosition } from '../reading/lastReadPositionStore'
import { getFreeReadingPosition, setFreeReadingPosition } from '../bible/freeReadingPositionStore'
import { addReadingSeconds } from '../reading/readingTimeStore'
import { logSessionSeconds } from '../metrics/sessionDurationStore'
import { notifyChapterOpened } from '../gamification/rereadTracker'
import { getGamificationRow } from '../gamification/achievementsStore'
import { computeBibleProgress } from '../gamification/bibleProgressMath'
import { bookInfo } from '../data/gamificationBlocks'
import { readingThread, chapterLabel, topVisibleVerse, markedCard, markOutcome } from '../biblia/bibliaMath'
import { getReadingClockPrefs } from '../reading/readingClockPrefsStore'
import { addReadingPaceSession } from '../reading/readingPaceStore'
import { getGroupMarks, getGroupMarksVisible, setGroupMarksVisible, postToRoom } from '../groups/chapterRoomStore'
import { getGroupMemberCounts } from '../groups/groupsStore'
import { collectTagVocabulary } from '../notes/noteTags'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'
import { avatarPaletteFor } from './ChapterRoomScreen'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { dateKey } from '../utils/dateKey'
import { HIGHLIGHT_COLORS, DEFAULT_HIGHLIGHT_COLOR, highlightColorBg } from '../data/highlightColors'
import { verseSelectionLabel } from '../bible/verseSelectionLabel'
import { getLastCopyFormat, setLastCopyFormat } from '../bible/copyFormatPrefs'
import { formatCopyText } from '../bible/formatCopyText'
import { renderVerseCardImage, shareVerseCardImage, downloadVerseCardImage, VERSE_CARD_STYLES, VERSE_CARD_FORMATS } from '../bible/verseCardImage'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import BibleAudioPlayer from '../components/BibleAudioPlayer'
import ToolsSheet from '../components/ToolsSheet'
import ChapterPickerSheet from '../components/ChapterPickerSheet'
import LeituraLivreTopo from '../components/biblia/LeituraLivreTopo'
import LeituraLivreRodape from '../components/biblia/LeituraLivreRodape'
import StepTimerPill from '../components/timer/StepTimerPill'
import { usePlanTotalToday } from '../timer/usePlanTotalToday'
import { formatClock } from '../timer/formatClock'

export default function ReadingBlockView({ session, authUser, onNavigate, blockId, blocks, sessionsByBlock, mode = 'session', completedSet, onToggleSession, onToggleChapter, initialSessionId, initialTextOpen, initialFocusVerse, onActiveChapterChange, onBack, onCelebrateNow, onGoToReflection, onOpenGroupRoom, forceChapterContext = false }) {
  const { lang, hasPremium, hasAI } = session
  // A leitura é sempre de tela cheia (redesign 1b): cabeçalho que some ao
  // rolar, o texto num cartão e o rodapé fixo, sem barra de navegação. Há
  // dois modos: a leitura pela sessão do plano (mode 'session': relógio,
  // player, Ferramentas + Concluir) e a leitura livre da aba Bíblia (mode
  // 'browse', B3: fio de progresso do livro, lápis + Marcar como lido).
  const freeReading = mode === 'browse'
  const block = blocks.find(b => b.id === blockId) ?? blocks[0]
  const sessions = sessionsByBlock[block.id]
  // Versão em uso (39d): mora aqui, não só dentro de BibleTextPanel, porque
  // a leitura livre agora tem o SELETOR no cabeçalho (39d) — trocar a
  // versão ali precisa refletir no texto embaixo. Nos outros modos
  // (nenhum tem o chip hoje, só 1 versão por idioma existe) o painel segue
  // se virando sozinho — ver versionId/onChangeVersion opcionais em
  // BibleTextPanel.
  const [versionId, setVersionId] = useState(() => getSelectedVersionId(lang))
  useEffect(() => { setVersionId(getSelectedVersionId(lang)) }, [lang])
  function handleChangeVersion(id) {
    setSelectedVersionId(lang, id)
    setVersionId(id)
  }
  const autoHeroSession = sessions.find(s => s.status === 'current') ?? sessions.find(s => s.status !== 'done') ?? sessions[0]
  const bookInfoSource = lang === 'en' ? BOOK_INFO_EN : BOOK_INFO

  const scrollRef = useRef(null)
  // Cartão branco do texto do capítulo em foco — é onde a leitura livre
  // procura o versículo que está no topo (ver o efeito de "onde parou").
  const textCardRef = useRef(null)
  // Sessão escolhida, se houver (a que veio de fora em initialSessionId, ou
  // a que o seletor de capítulo trocou) — sobrepõe a sessão "atual"
  // automática. SÓ funciona corretamente porque quem chama este componente
  // usa uma key com o bloco e a sessão (ver JourneyScreen.jsx e
  // BookChapterScreen.jsx) — sem isso, pular pra outro livro com a tela já
  // montada manteria esse estado com o id antigo, que por coincidência
  // pode ser válido no bloco novo (ids de sessão são só sequenciais dentro
  // de cada bloco) — abriria o capítulo errado sem nenhum erro visível.
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId ?? null)

  const heroSession = sessions.find(s => s.id === selectedSessionId) ?? autoHeroSession

  // Leitura livre (mode 'browse'): qual capítulo está aberto — o que a
  // tela do livro (BookChapterScreen.jsx) mandou abrir (initialTextOpen +
  // initialSessionId), e depois o que o seletor de capítulo ou "Seguir
  // para…" trocarem. Na leitura do plano não se aplica: ali o texto é
  // sempre o da sessão em destaque.
  const [expandedChapterId, setExpandedChapterId] = useState(initialTextOpen ? initialSessionId : null)

  // A sessão seguinte do plano, para "Continuar lendo" (35g).
  function getNextSessionFor(fromSession) {
    const idx = sessions.findIndex(s => s.id === fromSession.id)
    // Só dentro do bloco atual (varredura 2026-10-25): os ids de sessão
    // recomeçam em 1 a cada bloco, e featureSession/heroSession procuram
    // por id SÓ em `sessions` (deste bloco) — "continuar" no fim de
    // Deuteronômio prometia Josué 1 e abria Gênesis 1–2. Fim do bloco =
    // sem próximo (a TimeUpSheet já tem o texto de "acabou").
    return sessions[idx + 1] ?? null
  }

  // Troca a sessão em destaque. Na leitura do plano, volta ao topo do
  // texto novo; na leitura livre, quem troca de capítulo cuida da rolagem
  // (ver goToFreeChapter).
  function featureSession(clickedSession) {
    setSelectedSessionId(clickedSession.id)
    if (mode !== 'browse') {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Seletor de capítulo (18b) — troca de capítulo SEM sair da leitura
  // imersiva, achando a sessão que cobre aquele número (uma sessão pode
  // cobrir mais de 1 capítulo no plano estruturado).
  function openChapterFromPicker(ch) {
    const target = sessions.find(s => s.book === heroSession.book && s.chStart <= ch && ch <= s.chEnd)
    if (target) {
      featureSession(target)
      // Em modo 'browse' (39d), o "último texto lido" segue expandedChapterId
      // (ver efeito mais abaixo), não selectedSessionId — sem isso, pular de
      // capítulo pelo seletor do cabeçalho deixaria a posição salva presa no
      // capítulo antigo.
      if (mode === 'browse') setExpandedChapterId(target.id)
    }
    setChapterPickerOpen(false)
  }

  // Contexto/Mapa/Notas/Curiosidades vivem na folha Ferramentas.
  const [toolsOpen, setToolsOpen] = useState(false)
  // Seletor de capítulo (quadro 18b) — aberto pelo chip escuro do
  // cabeçalho. Mesma folha escura da IA, mas sem losango.
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false)
  // Cabeçalho da leitura imersiva some ao rolar pra baixo, volta ao rolar
  // pra cima (redesign 1b). scrollRef é o container que rola (ver JSX).
  const [readerHeaderHidden, setReaderHeaderHidden] = useState(false)
  const lastReaderScrollY = useRef(0)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      // Preso aos limites da rolagem — o "elástico" do iOS passa do fim e
      // volta, e essa volta não é a pessoa rolando pra cima.
      const y = Math.max(0, Math.min(el.scrollTop, el.scrollHeight - el.clientHeight))
      if (y > lastReaderScrollY.current + 8 && y > 56) setReaderHeaderHidden(true)
      else if (y < lastReaderScrollY.current - 8 || y < 24) setReaderHeaderHidden(false)
      // Cartão de capítulo marcado (B4): fecha sozinho quando a pessoa rola
      // o texto pra cima.
      if (y < lastReaderScrollY.current - 8) setMarkedChapter(null)
      lastReaderScrollY.current = y
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [heroSession?.id])

  // Relógio do passo — segundos desde que ESTA sessão de leitura começou;
  // zera a cada capítulo (exceto ao avançar por "Continuar lendo", 35g, que
  // deixa o relógio correndo — ver keepClockOnNextSessionChange), diferente
  // do acumulado de sempre em readingTimeStore.js (esse continua contando
  // pro painel de métricas, sem relação com este). Só conta com a aba
  // visível, mesmo cuidado do efeito de tempo de leitura logo abaixo.
  const [stepElapsedSeconds, setStepElapsedSeconds] = useState(0)

  // Relógio de leitura (turno 35, Bloco 3 — 35f/35g). Só existe pro plano
  // fixo (a Bíblia contínua, em qualquer ORDEM — canônica ou cronológica,
  // ver bibleOrderMode/35i: cronológica também espelha em
  // activePlan.kind==='chrono', mesma leitura contínua, só noutra fila) —
  // plano por tema/grupo já tem sua própria tela — e nunca na reflexão de
  // fechamento de livro. "Mostrar na leitura"
  // (35c/readingClockPrefsStore.js) decide se aparece.
  const [readingClockPrefs, setReadingClockPrefsState] = useState(null)
  useEffect(() => { getReadingClockPrefs().then(setReadingClockPrefsState).catch(() => {}) }, [])
  const showReadingClock = !freeReading && ['fixed', 'chrono'].includes(session.activePlan?.kind) && heroSession.type !== 'reflection' && !!readingClockPrefs?.showOnReading
  const targetClockSeconds = Math.max(0, (session.plan.readingMinutes ?? 0) * 60)
  // "tempo total do plano" (unificação do cronômetro, 2026-09-21) — mesmo
  // hook que Oração/Reflexão usam, somado ao stepElapsedSeconds ao vivo.
  const planPriorSeconds = usePlanTotalToday()

  const [clockPaused, setClockPaused] = useState(false)
  const clockPausedRef = useRef(false)
  useEffect(() => { clockPausedRef.current = clockPaused }, [clockPaused])
  const [hasZeroed, setHasZeroed] = useState(false)
  const [zeroFlash, setZeroFlash] = useState(false)
  const [timeUpSheetOpen, setTimeUpSheetOpen] = useState(false)
  // "Continuar lendo" (35g) avança de sessão sem reiniciar o relógio — o
  // efeito abaixo só zera stepElapsedSeconds quando a troca de heroSession
  // NÃO veio desse fluxo (ver handleContinueReading).
  const keepClockOnNextSessionChange = useRef(false)

  useEffect(() => {
    if (!showReadingClock) return
    if (!keepClockOnNextSessionChange.current) {
      setStepElapsedSeconds(0)
      setHasZeroed(false)
      setClockPaused(false)
    }
    keepClockOnNextSessionChange.current = false
    const interval = setInterval(() => {
      if (clockPausedRef.current) return
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        setStepElapsedSeconds(s => s + 1)
      }
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReadingClock, heroSession?.id])

  // Wake lock (unificação do cronômetro, 2026-09-21) — Leitura era a única
  // das três telas sem isso; mantém a tela acesa igual Oração/Reflexão
  // enquanto o relógio está rodando. Mantém o comportamento próprio de
  // Leitura de retomar sozinho ao voltar pra aba (diferente do "pausa de
  // verdade" de Oração/Reflexão) — só a tela acesa é nova aqui.
  useEffect(() => {
    if (!showReadingClock || clockPaused) return
    let wakeLock = null
    let cancelled = false
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen')
        .then(lock => { if (cancelled) lock.release().catch(() => {}); else wakeLock = lock })
        .catch(err => console.error('[ReadingBlockView] wake lock request failed:', err.message))
    }
    return () => { cancelled = true; wakeLock?.release().catch(() => {}) }
  }, [showReadingClock, clockPaused])

  // Ao zerar: toque discreto (haptic + pisca uma vez) e passa a contar pra
  // cima — nunca bloqueia nem fecha a leitura (HANDOFF, 35f).
  useEffect(() => {
    if (!showReadingClock || hasZeroed || targetClockSeconds <= 0) return
    if (stepElapsedSeconds < targetClockSeconds) return
    setHasZeroed(true)
    if (readingClockPrefs?.warnAtZero) {
      navigator.vibrate?.(200)
      setZeroFlash(true)
      setTimeout(() => setZeroFlash(false), 700)
    }
  }, [stepElapsedSeconds, showReadingClock, hasZeroed, targetClockSeconds, readingClockPrefs])

  // Ritmo aprendido (35i) — cada trecho concluído (por "Concluir" ou por
  // "Continuar lendo" em 35g) vira uma amostra de palavras/minuto. Sessões
  // curtas demais (<30s ativos) não entram — não são leitura de verdade.
  function recordPaceSampleIfNeeded() {
    if (!showReadingClock || stepElapsedSeconds < 30 || !heroSession.words) return
    const wordsPerMinute = Math.round((heroSession.words / stepElapsedSeconds) * 60)
    if (wordsPerMinute > 0) {
      addReadingPaceSession({ wordsPerMinute, activeSeconds: stepElapsedSeconds, at: new Date().toISOString() }).catch(() => {})
    }
  }

  // "Concluir" (rodapé) — 35g só entra no meio quando sobrou tempo de
  // verdade E a preferência "perguntar se quero continuar" está ligada;
  // do contrário, fecha o passo direto (comportamento de sempre).
  function handleConcludePress() {
    if (showReadingClock && !hasZeroed && readingClockPrefs?.askToContinue) {
      setTimeUpSheetOpen(true)
      return
    }
    finishReadingStep()
  }

  // Leitura livre (handoff-biblia-52, B3/B4). "Marcar como lido" não fecha
  // sessão de plano nenhuma nem vai pra Reflexão: grava o capítulo como
  // lido no app (o mesmo onToggleChapter de sempre) e a barra dá lugar ao
  // cartão de capítulo marcado (B4) — a pessoa fica no texto. Quando a
  // marcação completa o livro, um bloco ou sobe um degrau de Leitura, o
  // cartão não aparece: entra a tela de parabéns na hora (onCelebrateNow,
  // App.jsx). Se no fim não havia parabéns nenhum a mostrar, o cartão
  // entra do mesmo jeito. `markedChapter` é o capítulo cujo cartão está
  // aberto; trocar de capítulo, desmarcar, fechar no X ou rolar pra cima
  // fecha.
  const [markedChapter, setMarkedChapter] = useState(null)
  // Conquistas e selos já ganhos — pra não prometer parabéns a quem
  // desmarcou e marcou de novo (markOutcome). Lidos ao abrir e de novo
  // depois de cada marcação.
  const earnedRef = useRef({ earnedIds: null, sealedBooks: null })
  function refreshEarned() {
    getGamificationRow()
      .then(row => { earnedRef.current = { earnedIds: new Set(Object.keys(row.achievements)), sealedBooks: new Set(Object.keys(row.bookSeals)) } })
      .catch(() => {})
  }
  useEffect(() => {
    if (freeReading) refreshEarned()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeReading])
  const heroSessionRef = useRef(heroSession)
  heroSessionRef.current = heroSession
  function handleMarkFreeChapterRead() {
    if (heroSession.type === 'reflection') return
    const marked = heroSession
    const ch = marked.chStart
    const outcome = markOutcome({ nome: marked.book, chapter: ch, completedSet, ...earnedRef.current })
    for (let c = marked.chStart; c <= marked.chEnd; c++) onToggleChapter?.(marked, c, true)
    setTimeout(refreshEarned, 4000)
    if (outcome === 'celebration' && onCelebrateNow) {
      Promise.resolve(onCelebrateNow())
        .then(opened => { if (!opened && heroSessionRef.current?.id === marked.id) setMarkedChapter(ch) })
        .catch(() => {})
      return
    }
    setMarkedChapter(ch)
  }
  function handleUnmarkFreeChapter() {
    if (heroSession.type === 'reflection') return
    setMarkedChapter(null)
    for (let c = heroSession.chStart; c <= heroSession.chEnd; c++) onToggleChapter?.(heroSession, c, false)
  }
  // "Seguir para {Livro} {capítulo}" (B4) — o mesmo caminho do seletor de
  // capítulo, e o texto novo começa do topo.
  function goToFreeChapter(ch) {
    setMarkedChapter(null)
    openChapterFromPicker(ch)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  // Fecha o passo de verdade (marca feito, vai pra Reflexão) — quem chama
  // já gravou a amostra de ritmo antes, se for o caso (ver
  // handleConcludePress/handleContinueReading), pra nunca gravar 2x.
  function goToReflectionAfterReading() {
    if (heroSession.status !== 'done') onToggleSession(heroSession, true)
    if (onGoToReflection) onGoToReflection(heroSession)
    else onNavigate?.('reflection')
  }

  function finishReadingStep() {
    recordPaceSampleIfNeeded()
    goToReflectionAfterReading()
  }

  // "Continuar lendo" (35g) — fecha o trecho atual, mas em vez de ir pra
  // Reflexão segue pro próximo trecho da MESMA leitura, com o relógio
  // correndo sem reiniciar (keepClockOnNextSessionChange). Sem próximo
  // trecho (fim do plano), cai no mesmo caminho de "Finalizar por aqui".
  function handleContinueReading() {
    setTimeUpSheetOpen(false)
    recordPaceSampleIfNeeded()
    const next = getNextSessionFor(heroSession)
    if (!next) { goToReflectionAfterReading(); return }
    if (heroSession.status !== 'done') onToggleSession(heroSession, true)
    keepClockOnNextSessionChange.current = true
    featureSession(next)
  }

  function handleFinishHere() {
    setTimeUpSheetOpen(false)
    finishReadingStep()
  }

  // Só calculado quando a folha 35g está de fato aberta — getNextSessionFor
  // percorre a lista de sessões, sem custo pra chamar sempre, mas não tem
  // por que fazer isso em toda renderização.
  const nextSessionForTimeUp = timeUpSheetOpen ? getNextSessionFor(heroSession) : null

  // "Último texto lido" — grava o capítulo que a pessoa está lendo agora,
  // em QUALQUER modo, pro card "Continue sua leitura" da Home reabrir
  // exatamente ele (ver findCurrentReadingSession em App.jsx). Navegação
  // livre: o capítulo com o texto aberto na lista (expandedChapterId).
  // Fluxo guiado: o 1º capítulo da sessão em destaque, mas só quando o
  // painel "Texto" está aberto (só navegar pela lista de sessões não
  // conta como "ler").
  useEffect(() => {
    if (heroSession?.type === 'reflection') return
    if (mode === 'browse') {
      if (expandedChapterId == null) return
      const s = sessions.find(x => x.id === expandedChapterId)
      if (s) {
        setLastReadPosition(s.book, s.chStart)
        // Posição PRÓPRIA da leitura livre ("Continuar a leitura livre",
        // B1). Abrir um capítulo começa do versículo 1 — a não ser que
        // seja o mesmo capítulo já guardado, que mantém o versículo onde
        // a pessoa parou. O versículo é atualizado enquanto ela rola (ver
        // o efeito logo abaixo).
        const stored = getFreeReadingPosition()
        setFreeReadingPosition(s.book, s.bookEn, s.chStart, stored && stored.book === s.book && stored.chapter === s.chStart ? stored.verse : null)
        // Releitura de um livro já completo (gamificação, G10) — ver
        // gamification/rereadTracker.js.
        notifyChapterOpened(s.book, s.chStart)
      }
    } else if (heroSession) {
      setLastReadPosition(heroSession.book, heroSession.chStart)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, expandedChapterId, heroSession?.id])

  // Onde a pessoa parou na leitura livre: o versículo que está no topo da
  // área de leitura, guardado um instante depois de cada rolagem — é o
  // ", versículo 4" do cartão "Continuar a leitura livre" (B1). O topo da
  // área é a base do cabeçalho enquanto ele está à vista.
  const freeTopRef = useRef(null)
  useEffect(() => {
    if (!freeReading || !heroSession || heroSession.type === 'reflection') return undefined
    const el = scrollRef.current
    if (!el) return undefined
    const open = heroSession
    let timer = null
    function save() {
      const card = textCardRef.current
      if (!card) return
      const top = el.getBoundingClientRect().top
      const headerBottom = freeTopRef.current?.getBoundingClientRect().bottom ?? top
      const items = [...card.querySelectorAll(`[data-chapter="${open.chStart}"] [data-verse]`)]
        .map(node => ({ verse: Number(node.dataset.verse), bottom: node.getBoundingClientRect().bottom }))
      const verse = el.scrollTop < 8 ? 1 : topVisibleVerse(items, Math.max(top, headerBottom))
      if (verse != null) setFreeReadingPosition(open.book, open.bookEn, open.chStart, verse)
    }
    // Só conta a rolagem feita pela pessoa (dedo, roda do mouse, teclado) —
    // a rolagem automática de "voltar onde parei" não regrava a posição.
    let moved = false
    const markMoved = () => { moved = true }
    function onScroll() {
      if (!moved) return
      clearTimeout(timer)
      timer = setTimeout(save, 250)
    }
    const gestures = ['touchmove', 'wheel', 'pointerdown', 'keydown']
    gestures.forEach(name => el.addEventListener(name, markMoved, { passive: true }))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      gestures.forEach(name => el.removeEventListener(name, markMoved))
      el.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeReading, heroSession?.id])

  // Tempo de leitura (painel 12a, "horas de leitura acumulada") — conta só
  // enquanto um texto de capítulo está aberto E a aba está visível; segundos
  // com a aba escondida não entram. Descarrega em lotes de ~30s e ao fechar
  // (ver src/reading/readingTimeStore.js). O mesmo lote também vira uma
  // linha em session_seconds (passo 'reading') — é a fonte de "lendo" em
  // 30b; sem isso o acumulado de sempre existe mas não dá pra separar por
  // dia/passo nem calcular sessão média/horário mais comum.
  const readingActive = mode === 'browse'
    ? expandedChapterId != null
    : (!!heroSession && heroSession.type !== 'reflection')
  // O livro que está aberto (o capítulo da navegação livre, ou a sessão em
  // destaque na leitura do plano) — vai junto do tempo, pra dar o "tempo de
  // leitura neste livro" (selo, livro completo, B2).
  const readingBook = (mode === 'browse' ? sessions.find(x => x.id === expandedChapterId) : heroSession)?.book ?? null
  useEffect(() => {
    if (!readingActive) return
    let last = Date.now()
    let pending = 0
    const tick = () => {
      const now = Date.now()
      if (typeof document === 'undefined' || document.visibilityState === 'visible') pending += (now - last) / 1000
      last = now
    }
    const flush = () => {
      if (pending >= 1) {
        addReadingSeconds(pending).catch(() => {})
        logSessionSeconds('reading', pending, undefined, readingBook).catch(() => {})
        pending = 0
      }
    }
    const interval = setInterval(() => { tick(); if (pending >= 30) flush() }, 5000)
    const onVisibility = () => { tick(); if (document.visibilityState !== 'visible') flush() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      tick(); flush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingActive, heroSession?.id, expandedChapterId])

  // O chat de IA flutua por CIMA da leitura (portal pro <body>, ver mais
  // abaixo), em estado próprio: abrir ou fechar a IA não mexe no texto.
  const [aiChatOpen, setAiChatOpen] = useState(false)

  const [noteText, setNoteText] = useState('')
  const heroNoteKey = noteKeyFor(heroSession)

  // A nota da sessão em destaque (folha Ferramentas → Notas).
  useEffect(() => {
    if (!authUser?.email) { setNoteText(''); return }
    getNotes(authUser.email).then(map => setNoteText(noteTextOf(map[heroNoteKey])))
  }, [heroNoteKey, authUser?.email])

  function handleSaveNote(text) {
    setNoteText(text)
    saveNote(authUser?.email, heroNoteKey, text).catch(err => {
      console.error('Failed to persist note', err)
    })
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
  // tags/sharedGroupIds opcionais (39f, pacote 39) — quem chama sem elas
  // (chooseQuickColor, HighlightComposer antigo) continua criando/editando
  // sem etiqueta nem grupo nenhum, como sempre.
  function handleSaveHighlight(book, bookEn, chapter, verses, text, color, tags = [], sharedGroupIds = []) {
    const highlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      book, bookEn, chapter, verses,
      text: text.trim(),
      color: color ?? DEFAULT_HIGHLIGHT_COLOR,
      tags, sharedGroupIds,
      createdAt: new Date().toISOString(),
      date: dateKey(),
      sessionMode: mode === 'session' ? 'session' : 'browse',
    }
    setHighlights(prev => [...prev, highlight])
    saveHighlight(authUser?.email, highlight).catch(err => {
      console.error('Failed to persist highlight', err)
    })
    return highlight.id
  }

  function handleUpdateHighlightText(id, text, color, tags, sharedGroupIds) {
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, text, color: color ?? h.color, tags: tags ?? h.tags ?? [], sharedGroupIds: sharedGroupIds ?? h.sharedGroupIds ?? [] } : h))
    updateHighlightText(authUser?.email, id, text, color, tags, sharedGroupIds).catch(err => {
      console.error('Failed to update highlight', err)
    })
  }

  // "Remover" nunca apaga de verdade — só esconde (ver comentário em
  // hideHighlight). Local, marca `hidden` sem tirar do array, pra todo
  // filtro `!h.hidden` (highlightForVerse) parar de mostrar na hora.
  function handleHideHighlight(id) {
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, hidden: true } : h))
    hideHighlight(authUser?.email, id).catch(err => {
      console.error('Failed to hide highlight', err)
    })
  }

  // Grifar/anotar um trecho — antes abria uma caixinha inline embaixo do
  // próprio texto (HighlightNoteBox dentro de BibleTextPanel); agora abre
  // flutuando por cima, mesmo padrão do chat de IA (ver aiChatOverlay* e o
  // FAB de lápis logo abaixo), pra caber mais espaço pra escrever e não
  // empurrar o texto/lista pra baixo. Por isso mora aqui (não mais dentro
  // de BibleTextPanel): o FAB e a janela flutuante ficam neste nível,
  // junto do FAB/janela da IA — BibleTextPanel só recebe de volta o
  // essencial pra pintar o texto (`highlightSelection`, pra sublinhar o
  // que está selecionado) e dois callbacks de toque/seleção.
  // `initialFocusVerse` (39k/39l, Bloco 6: chegar aqui vindo de um cartão
  // de busca/tema) só preenche a seleção inicial — nunca abre a folha
  // (selectionMenuOpen continua false), pra dar o "mesmo realce de 39e,
  // sem abrir a folha" que o quadro de 39l pede: reaproveita o MESMO
  // destaque visual que uma seleção em andamento já usa (ver isSelected em
  // BibleTextPanel), sem duplicar um estilo "em foco" à parte.
  const [highlightSelection, setHighlightSelection] = useState(() => (
    initialFocusVerse && !initialFocusVerse.scrollOnly ? { chapter: initialFocusVerse.chapter, verses: new Set([initialFocusVerse.verse]) } : null
  )) // { chapter, verses: Set<number> } | null
  const [highlightEditingId, setHighlightEditingId] = useState(null)
  // Chegar por um resultado "Nas suas notas" da busca (initialFocusVerse.
  // openNoteId): assim que as marcações carregam, abre a nota daquela
  // marcação (a folha de 39f), uma vez só.
  const noteToOpenRef = useRef(initialFocusVerse?.openNoteId ?? null)
  useEffect(() => {
    const id = noteToOpenRef.current
    if (!id || !highlights?.some(h => h.id === id && !h.hidden)) return
    noteToOpenRef.current = null
    setHighlightSelection(null)
    setHighlightEditingId(id)
    setWantsToAnnotate(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights])

  // Avisa JourneyScreen.jsx (dono da folha de sermão flutuante, 34d/34e/
  // 34f — README: "vive... na Bíblia inteira", por isso mora lá, não
  // aqui) qual é o "na tela agora" pro botão "+ {ref}" — o versículo
  // selecionado (highlightSelection), se houver, senão o 1º do capítulo
  // aberto. Limpa (null) ao desmontar/trocar de capítulo, senão a folha
  // continuaria sugerindo um capítulo que a pessoa já fechou.
  useEffect(() => {
    if (heroSession.type === 'reflection') { onActiveChapterChange?.(null); return undefined }
    const hasSel = highlightSelection?.chapter != null && highlightSelection.verses?.size
    onActiveChapterChange?.({
      book: heroSession.book, bookEn: heroSession.bookEn,
      chapter: hasSel ? highlightSelection.chapter : heroSession.chStart,
      verseStart: hasSel ? Math.min(...highlightSelection.verses) : 1,
      verseEnd: hasSel ? Math.max(...highlightSelection.verses) : 1,
    })
    return () => onActiveChapterChange?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroSession.book, heroSession.chStart, heroSession.type, highlightSelection])
  // Liga quando "Anotar" (39e) é tocado — vira a tela cheia de 39f (ver o
  // early return logo no início do corpo da função). Fica ligado até
  // "Salvar" ou "voltar", nos dois casos (seleção nova ou grifo já salvo
  // reaberto).
  const [wantsToAnnotate, setWantsToAnnotate] = useState(false)
  // Liga quando "Compartilhar" (39e) é tocado — vira a tela cheia de 39i,
  // mesmo padrão de wantsToAnnotate/39f.
  const [wantsToShareImage, setWantsToShareImage] = useState(false)
  // Liga quando "Perguntar sobre este versículo" (39e) é tocado — vira a
  // tela cheia de 39j (mesmo padrão de wantsToAnnotate/39f).
  const [wantsToAsk, setWantsToAsk] = useState(false)
  // Retângulo (coordenadas de tela, de getBoundingClientRect) de onde a
  // pessoa tocou o número do versículo ou terminou de selecionar um
  // trecho — usado só pra ancorar a folha de 39e perto do toque (ver
  // VerseActionsSheet).
  // Folha do versículo selecionado (39e, reskin Bento) — só na leitura
  // imersiva (35f/39d). Selecionar um trecho abre esta folha (ver
  // VerseActionsSheet, handleHighlightVerseClick/handleHighlightTextRange).
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false)
  // "Copiar" (39e) abre 39g em vez de copiar na hora — troca o conteúdo
  // da mesma folha (mesmo padrão do estado "asking" dentro de
  // VerseActionsSheet), sem empilhar uma segunda folha por cima.
  const [copySheetOpen, setCopySheetOpen] = useState(false)
  // Resposta da IA sobre o trecho selecionado (10b) — null | {status:
  // 'loading'|'ready'|'error', ...}. Guarda a referência (book/chapter/
  // verses) separada da resposta em si, pra "Perguntar outra coisa" poder
  // reusar o mesmo trecho sem precisar de uma seleção nova.
  const [passageAnswer, setPassageAnswer] = useState(null)

  // Contexto antes do capítulo (10c, reskin Bento) — tela opcional e
  // pulável mostrada ANTES do texto, só na leitura imersiva e só se este
  // capítulo específico ainda não foi visto (ver chapterContextStore.js) —
  // EXCETO quando `forceChapterContext` vem true (pedido dela, 2026-09-09:
  // vindo da Bênção — "ir para a leitura" — sempre mostra o resumo, mesmo
  // capítulo já visto; ver App.jsx/JourneyScreen.jsx). Os outros gates
  // (precisa de IA, toggle ligado, online) continuam valendo mesmo forçado
  // — não é uma parede que vale a pena furar. Decidido uma vez só, na
  // montagem (não muda de novo enquanto esta sessão de leitura estiver
  // aberta, mesmo que o toggle mude no meio). Offline nem tenta
  // (implicação técnica 5 do adendo — degradação explícita, sem tentativa
  // de rede) — vai direto pro texto.
  const [contextGate, setContextGate] = useState(() => (
    heroSession.type !== 'reflection' && hasAI && getChapterContextEnabled()
      && (forceChapterContext || !isChapterContextSeen(heroSession.book, heroSession.chStart, lang))
      && (typeof navigator === 'undefined' || navigator.onLine)
  ))
  const [contextData, setContextData] = useState(null) // null (carregando) | objeto pronto

  useEffect(() => {
    if (!contextGate) return
    let cancelled = false
    fetchChapterContext({ book: heroSession.book, bookEn: heroSession.bookEn, chapter: heroSession.chStart, lang })
      .then(data => { if (!cancelled) setContextData(data) })
      // Falhou (rede, offline, geração) — nunca vira parede: pula direto
      // pro texto, como se a pessoa tivesse tocado "Pular contexto".
      .catch(() => { if (!cancelled) setContextGate(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextGate])

  function dismissChapterContext() {
    markChapterContextSeen(heroSession.book, heroSession.chStart, lang)
    setContextGate(false)
  }

  // "Relembre onde a história parou" (follow-up, turno 39) — o mesmo
  // conteúdo do contexto de 10c, mas como botão sempre disponível em cima
  // do texto, pra reler quando quiser (não só uma vez, antes de começar).
  // Busca de novo a cada abertura — sem custo de IA de verdade, já que
  // agora existe um cache de verdade no servidor (chapter_contexts,
  // migration 0060): reabrir o mesmo capítulo nunca gera de novo, só
  // consulta.
  const [recallOpen, setRecallOpen] = useState(false)
  const [recallData, setRecallData] = useState(null) // null = carregando | false = erro | objeto pronto
  useEffect(() => {
    if (!recallOpen) return
    let cancelled = false
    setRecallData(null)
    fetchChapterContext({ book: heroSession.book, bookEn: heroSession.bookEn, chapter: heroSession.chStart, lang })
      .then(data => { if (!cancelled) setRecallData(data) })
      .catch(() => { if (!cancelled) setRecallData(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recallOpen, heroSession?.id])

  // Toque no NÚMERO de um versículo — alterna ele dentro/fora da seleção em
  // andamento (ou, se esse versículo já tem um grifo salvo, troca pro modo
  // "editar esse grifo" em vez de somar à seleção. Sempre abre o popup
  // ancorado perto do toque; fecha sozinho se a seleção esvaziar.
  function handleHighlightVerseClick(ch, v) {
    if (!hasPremium) return // grifar/anotar é recurso Premium
    const existing = highlights?.find(h => !h.hidden && h.book === heroSession.book && h.chapter === ch && h.verses.includes(v))
    if (existing) {
      setHighlightEditingId(existing.id)
      setHighlightSelection(null)
      setWantsToAnnotate(false)
      // "Segurar um versículo abre 39e" vale pra QUALQUER versículo,
      // marcado ou não.
      setSelectionMenuOpen(true)
      return
    }
    setHighlightEditingId(null)
    let next
    if (!highlightSelection || highlightSelection.chapter !== ch) {
      next = { chapter: ch, verses: new Set([v]) }
      setWantsToAnnotate(false) // seleção nova — sempre começa na etapa de cor
    } else {
      const verses = new Set(highlightSelection.verses)
      if (verses.has(v)) verses.delete(v)
      else verses.add(v)
      next = verses.size === 0 ? null : { chapter: ch, verses }
    }
    setHighlightSelection(next)
    setSelectionMenuOpen(Boolean(next))
  }

  // Seleção de texto "de verdade" (arrastar o dedo/mouse como se fosse
  // copiar) — ver detecção em BibleTextPanel (escuta selectionchange e
  // resolve o intervalo de versículos pelos atributos data-chapter/
  // data-verse). Sempre substitui a seleção em andamento (não soma a um
  // grifo já aberto pra edição), mesmo espírito de handleHighlightVerseClick.
  function handleHighlightTextRange(ch, verses) {
    if (!hasPremium) return // grifar/anotar é recurso Premium
    setHighlightEditingId(null)
    setHighlightSelection({ chapter: ch, verses })
    setWantsToAnnotate(false)
    setSelectionMenuOpen(true)
  }

  // Turno 39, Bloco 3 (39e): "o versículo em foco" agora vem de duas
  // fontes possíveis — uma seleção nova, ainda sem grifo (highlightSelection)
  // ou um grifo já salvo reaberto (highlightEditingId, ver
  // handleHighlightVerseClick acima). Copiar/Compartilhar/Perguntar
  // precisam funcionar nos dois casos — antes só liam highlightSelection,
  // então reabrir um grifo salvo e tocar "Copiar" não copiava nada.
  function currentVerseTarget() {
    if (highlightSelection) return { chapter: highlightSelection.chapter, verses: [...highlightSelection.verses].sort((a, b) => a - b) }
    if (highlightEditingId) {
      const h = highlights?.find(x => x.id === highlightEditingId)
      if (h) return { chapter: h.chapter, verses: [...h.verses].sort((a, b) => a - b) }
    }
    return null
  }

  // Texto real dos versículos em foco (mesma fonte que o texto na tela,
  // ver fetchBookText) — base de Copiar (39g) e Compartilhar (39e).
  async function fetchVerseTargetText() {
    const target = currentVerseTarget()
    if (!target) return null
    const versionId = getSelectedVersionId(lang)
    const bookKey = lang === 'en' ? heroSession.bookEn : heroSession.book
    const chapters = await fetchBookText(versionId, bookKey)
    const chapterData = chapters?.[String(target.chapter)]
    const text = target.verses.map(v => chapterData?.verses?.[String(v)]).filter(Boolean).join(' ')
    const ref = `${lang === 'en' ? heroSession.bookEn : heroSession.book} ${target.chapter}:${formatVerseRanges(target.verses)}`
    return text ? { text, ref } : null
  }

  // "Compartilhar" (39e) — fecha a folha e liga wantsToShareImage: o
  // próprio componente troca pra tela cheia de 39i (mesmo padrão de
  // startAnnotatingFromSheet pra 39f).
  function openShareImageScreen() {
    setSelectionMenuOpen(false)
    setWantsToShareImage(true)
  }

  // "Perguntar sobre este versículo" (39e) — fecha a folha e liga
  // wantsToAsk: o próprio componente troca pra tela cheia de 39j.
  function openAskScreen() {
    setSelectionMenuOpen(false)
    setWantsToAsk(true)
  }
  // "voltar" (39j) — fecha a conversa e volta pra leitura, limpando o
  // versículo em foco (mesma despedida de cancelHighlightCompose, mas
  // sem depender dela: 39j pode fechar sem nunca ter tido grifo/seleção
  // pendente se a pessoa só veio perguntar).
  function closeAskScreen() {
    setWantsToAsk(false)
    setPassageAnswer(null)
    setHighlightSelection(null)
    setHighlightEditingId(null)
  }

  // "Perguntar" (39e) — manda a pergunta pro servidor
  // (api/ask-about-passage.js), que decide/verifica a resposta, e abre a
  // folha de resposta (10b) já em estado de carregamento.
  // Referência (livro/capítulo/versículo inicial e final) do trecho em
  // foco — o que vai pro modelo tanto pras sugestões quanto pra resposta.
  const selectionRef = (() => {
    const target = currentVerseTarget()
    if (!target) return null
    return { book: heroSession.book, bookEn: heroSession.bookEn, chapter: target.chapter, verseStart: target.verses[0], verseEnd: target.verses[target.verses.length - 1] }
  })()
  // "Perguntar" (39e) — chamado tanto do estado "asking" da folha nova
  // (VerseActionsSheet) quanto de uma sugestão pronta tocada ali dentro.
  async function askAboutSelection(question) {
    if (!selectionRef) return
    const ref = selectionRef
    setSelectionMenuOpen(false)
    setPassageAnswer({ status: 'loading', ref, question })
    try {
      const { answer } = await askAboutPassage({ ...ref, question, lang })
      setPassageAnswer({ status: 'ready', ref, question, answer })
    } catch (err) {
      console.error('Failed to ask about passage', err)
      setPassageAnswer({ status: 'error', ref, question, error: err.message })
    }
  }

  // "Salvar na nota" (10b) — soma a resposta à anotação do CAPÍTULO (não
  // substitui o que a pessoa já tinha escrito, como handleSaveNote faria
  // sozinho). heroNoteKey aqui é sempre o da sessão em foco — correto
  // porque a folha de resposta só existe enquanto essa mesma sessão está
  // aberta (nunca sobrevive a uma troca de capítulo).
  function saveAnswerToNote(question, replyText) {
    const addition = `${question}\n${replyText}`
    const combined = noteText.trim() ? `${noteText}\n\n${addition}` : addition
    handleSaveNote(combined)
  }

  // Tocar direto numa cor, na etapa de escolha (sem escrever nada) — grifa
  // na hora, mas continua com a caixinha aberta (não fecha mais sozinha):
  // dá pra trocar de cor de novo, tocar "Adicionar anotação" em seguida, ou
  // tocar mais versículos pra somar à seleção, tudo sem precisar reabrir.
  // "Adicionar anotação" (startAnnotating) continua sendo o único jeito de
  // chegar na etapa de escrever de verdade. Dois casos: seleção NOVA (grifa
  // na hora, texto vazio, e passa a editar ESSE grifo recém-criado — assim
  // tocar outra cor em seguida atualiza em vez de criar um grifo duplicado)
  // ou reabrindo um grifo JÁ salvo (só troca a cor, mantém a anotação que
  // já tinha — ou continua vazia, se nunca teve uma).
  function chooseQuickColor(colorId) {
    if (highlightEditingId) {
      const current = highlights?.find(h => h.id === highlightEditingId)
      handleUpdateHighlightText(highlightEditingId, current?.text ?? '', colorId)
    } else if (highlightSelection) {
      const newId = handleSaveHighlight(heroSession.book, heroSession.bookEn, highlightSelection.chapter, [...highlightSelection.verses].sort((a, b) => a - b), '', colorId)
      setHighlightEditingId(newId)
      setHighlightSelection(null)
    }
  }

  function removeEditingHighlight() {
    if (!highlightEditingId) return
    handleHideHighlight(highlightEditingId)
    setHighlightEditingId(null)
    setWantsToAnnotate(false)
  }

  function cancelHighlightCompose() {
    setHighlightSelection(null)
    setHighlightEditingId(null)
    setWantsToAnnotate(false)
  }

  // Fechos da folha de 39e (VerseActionsSheet):
  // - "x" da tarja Marcar texto: remove o grifo se já existe um (a cor foi
  //   escolhida antes), ou só cancela a seleção se ainda não tinha nenhum
  //   grifo salvo (nada pra remover ainda).
  // - toque fora / fechar a folha sem escolher nada: só cancela.
  function handleSheetRemove() {
    if (highlightEditingId) removeEditingHighlight()
    else cancelHighlightCompose()
    setSelectionMenuOpen(false)
    setCopySheetOpen(false)
  }
  function handleSheetClose() {
    cancelHighlightCompose()
    setSelectionMenuOpen(false)
    setCopySheetOpen(false)
  }
  // "Anotar" (39e) — fecha a folha e liga wantsToAnnotate: o próprio
  // componente troca pra tela cheia de 39f (ver o `if` logo no topo do
  // corpo desta função, antes do `return` de sempre — mesmo padrão de
  // BookChapterScreen.jsx pra 39d no Bloco 2).
  function startAnnotatingFromSheet() {
    setSelectionMenuOpen(false)
    setWantsToAnnotate(true)
  }
  // "Copiar" (39e) — não copia mais na hora: troca o conteúdo da mesma
  // folha pra 39g (formato + pré-visualização real). "Copiar" (39g) — de
  // volta pra 39e, mantendo o versículo em foco.
  function openCopySheet() {
    setCopySheetOpen(true)
  }
  // "Copiar" (39g, ação de verdade) — o formato final vai pro
  // clipboard, com a versão sempre junto quando a referência entra
  // (ver formatCopyText); lembra o formato pra próxima vez.
  async function copyWithFormat(format) {
    try {
      const found = await fetchVerseTargetText()
      if (found) {
        const versionShort = findBibleVersion(getSelectedVersionId(lang))?.short ?? ''
        await navigator.clipboard?.writeText(formatCopyText(format, found.text, found.ref, versionShort))
      }
    } catch (err) {
      console.error('Failed to copy with format', err)
    }
    setLastCopyFormat(format)
  }

  // "Salvar" (39f) — cria/atualiza o grifo com texto+etiquetas (a cor não
  // muda aqui, já foi escolhida em 39e — omitida, os dois helpers acima
  // preservam/usam o padrão sozinhos), e publica em quem foi escolhido
  // (postToRoom, sala do capítulo de cada grupo — 17a) quando
  // "Compartilhar em um grupo" está ligado E há texto de verdade
  // (publicar uma nota vazia num grupo não diz nada pra ninguém; a
  // marcação em si já fica salva na Biblioteca do jeito que for). "Só o
  // texto da nota e o versículo vão; etiquetas ficam com você" (HANDOFF)
  // — por isso as tags nunca entram no post do grupo.
  function submitAnnotation(text, tags, groupIds, quote) {
    if (highlightEditingId) {
      handleUpdateHighlightText(highlightEditingId, text, undefined, tags, groupIds)
    } else if (highlightSelection) {
      handleSaveHighlight(heroSession.book, heroSession.bookEn, highlightSelection.chapter, [...highlightSelection.verses].sort((a, b) => a - b), text, undefined, tags, groupIds)
    }
    if (groupIds.length && text.trim() && quote) {
      const chapter = highlightSelection?.chapter ?? highlights?.find(h => h.id === highlightEditingId)?.chapter
      for (const groupId of groupIds) {
        postToRoom(groupId, heroSession.book, chapter, text, quote).catch(err => {
          console.error('Failed to share note to group', groupId, err)
        })
      }
    }
    setHighlightSelection(null)
    setHighlightEditingId(null)
    setWantsToAnnotate(false)
  }

  const heroBooks = [{ name: heroSession.book, displayName: heroSession.bookEn, info: bookInfoSource[heroSession.book] }].filter(b => b.info)
  const heroTitle = lang === 'en' ? heroSession.titleEn : heroSession.title
  const heroPassage = lang === 'en' ? heroSession.passageEn : heroSession.passage
  const heroChapterSpan = heroSession.type === 'reflection' ? 0 : heroSession.chEnd - heroSession.chStart + 1
  // Subtítulo do cabeçalho imersivo (quadro 4a): "NVT · cap. 40 de 50" —
  // sigla da versão em uso + posição do capítulo (ou do intervalo da sessão)
  // dentro do livro. Total de capítulos do livro vem da mesma fonte de
  // Progresso/Biblioteca (computeBookChapterCounts).
  const readerHeaderSub = (() => {
    if (heroSession.type === 'reflection') return heroPassage
    const short = findBibleVersion(getSelectedVersionId(lang))?.short
    const total = computeBookChapterCounts(sessionsByBlock)[heroSession.book]
    const range = heroChapterSpan === 1 ? `${heroSession.chStart}` : `${heroSession.chStart}–${heroSession.chEnd}`
    const cap = lang === 'en' ? 'ch.' : 'cap.'
    const of = lang === 'en' ? 'of' : 'de'
    return [short, total ? `${cap} ${range} ${of} ${total}` : `${cap} ${range}`].filter(Boolean).join(' · ')
  })()
  const heroBookDisplayName = lang === 'en' ? heroSession.bookEn : heroSession.book
  const chLabel = lang === 'en' ? 'Ch.' : 'Cap.'
  // Camada do grupo na leitura (quadro 17c): pontilhado laranja sob o
  // versículo marcado por outros do grupo + chip com a contagem. Só pra quem
  // está num grupo (primeiro grupo da pessoa), na leitura imersiva, e com a
  // chave "Ver marcações do grupo" ligada (rodapé). Só contagens por padrão;
  // nomes e notas só de quem tem perfil público (ver group_chapter_marks).
  const myGroup = session.myGroups?.[0] ?? null
  const [groupLayerOn, setGroupLayerOn] = useState(getGroupMarksVisible)
  const [groupMarks, setGroupMarks] = useState({})
  useEffect(() => {
    if (!myGroup || !groupLayerOn || !heroSession || heroSession.type === 'reflection') { setGroupMarks({}); return }
    let cancelled = false
    const chapters = []
    for (let ch = heroSession.chStart; ch <= heroSession.chEnd; ch++) chapters.push(ch)
    Promise.all(chapters.map(ch => getGroupMarks(myGroup.groupId, heroSession.book, ch).then(m => [ch, m])))
      .then(entries => { if (!cancelled) setGroupMarks(Object.fromEntries(entries)) })
      .catch(err => console.error('Failed to load group marks', err))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myGroup?.groupId, groupLayerOn, heroSession?.id, heroSession?.book])
  function toggleGroupLayer() {
    const next = !groupLayerOn
    setGroupLayerOn(next)
    setGroupMarksVisible(next)
  }

  // heroSession já é sempre "o que a pessoa está lendo agora" mesmo em modo
  // 'browse' — toggleInlineChapter (acima) chama featureSession sempre que
  // um capítulo é aberto na lista, então não precisa rastrear
  // expandedChapterId à parte aqui: abrir o chat sobre heroSession já
  // cobre tanto o card em destaque (modo 'session') quanto o capítulo
  // aberto na navegação livre (modo 'browse'). Não rola a tela: o chat
  // agora flutua por cima (ver aiChatOverlay* abaixo), então a pessoa
  // nunca sai de onde estava lendo pra abrir/fechar ele.
  function openAiChat() {
    setAiChatOpen(true)
  }

  // Leitura livre (B3/B4): o livro aberto na estrutura da gamificação (cor
  // do bloco, total de capítulos), o fio de progresso e o cartão de
  // capítulo marcado. O fio perde o "· leitura livre" enquanto o cartão
  // está na tela — o cartão já diz.
  const freeProgress = useMemo(() => (freeReading ? computeBibleProgress(completedSet) : null), [freeReading, completedSet])
  const freeBookInfo = freeReading ? bookInfo(heroSession.book) : null
  const freeBookProgress = freeReading ? freeProgress.porLivro[heroSession.book] : null
  const freeChapterDone = freeReading && completedSet.has(`${heroSession.book}:${heroSession.chStart}`)
  const freeCard = freeReading && freeChapterDone && markedChapter === heroSession.chStart
    ? markedCard({ nome: heroSession.book, displayName: heroBookDisplayName, chapter: heroSession.chStart, progress: freeProgress })
    : null
  const freeThread = freeReading ? readingThread(freeBookProgress, { free: !freeCard }) : null
  // Altura do rodapé da leitura livre, medida — vira o respiro de baixo da
  // rolagem (ver o JSX). 90 = a barra do quadro B3 (14 + 54 + 22).
  const [freeFooterHeight, setFreeFooterHeight] = useState(90)
  const freeFooterObserver = useRef(null)
  function measureFreeFooter(node) {
    freeFooterObserver.current?.disconnect()
    freeFooterObserver.current = null
    if (!node) return
    setFreeFooterHeight(Math.ceil(node.getBoundingClientRect().height))
    if (typeof ResizeObserver === 'undefined') return
    freeFooterObserver.current = new ResizeObserver(() => setFreeFooterHeight(Math.ceil(node.getBoundingClientRect().height)))
    freeFooterObserver.current.observe(node)
  }

  // O que rola: o cabeçalho (preso no topo) e o texto.
  const headerAndPanels = (
    <>
      {freeReading ? (
        // Leitura livre (B3): topo próprio, com o fio de progresso do livro.
        <LeituraLivreTopo
          ref={freeTopRef}
          lang={lang}
          title={heroTitle}
          hidden={readerHeaderHidden}
          blocoId={freeBookInfo.blocoId}
          thread={freeThread}
          lidos={freeBookProgress.lidos}
          total={freeBookProgress.total}
          versionId={versionId}
          onChangeVersion={handleChangeVersion}
          onBack={onBack}
          onOpenPicker={() => setChapterPickerOpen(true)}
          onOpenMenu={() => setToolsOpen(true)}
        />
      ) : (
        // Cabeçalho (identidade Bento, tela 4a; relógio turno 35/35f) —
        // some ao rolar pra baixo, volta ao rolar pra cima
        // (readerHeaderHidden). Fica fixo no topo. Turno 35, Bloco 3: este
        // é o ÚNICO cabeçalho da Leitura agora, inclusive dentro do fluxo
        // guiado da Rotina — 35f não tem a faixa "Agora · Passo N de 3"
        // (essa informação já mora no cartão da Rotina/Meu Plano); o
        // encadeamento pro próximo passo ao concluir continua funcionando
        // igual (decisão tomada com a autora ao montar este bloco).
        <>
          <div style={{
            ...styles.readerHeader,
            transform: readerHeaderHidden ? 'translateY(-100%)' : 'none',
          }}>
            <div style={styles.readerHeaderLeft}>
              <button onClick={onBack} style={styles.readerIconBtn} aria-label={t('a11y.goBack', undefined, lang)}>
                <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Chip escuro (quadro 4a) — abre o seletor de capítulo
                      (18b), a mesma folha escura da IA mas sem losango (aqui
                      não é a máquina falando). Só tocável numa sessão de
                      leitura de verdade — a reflexão de fechamento de livro
                      não tem capítulo pra escolher numa grade de números. */}
                  {heroSession.type === 'reflection' ? (
                    <div style={styles.readerChapterChip}><span style={styles.readerChapterChipText}>{heroTitle}</span></div>
                  ) : (
                    <button style={styles.readerChapterChip} onClick={() => setChapterPickerOpen(true)}>
                      <span style={styles.readerChapterChipText}>{heroTitle}</span>
                      <AppIcon name="ChevronUp" size={11} strokeWidth={2.6} color="var(--bento-accent)" />
                    </button>
                  )}
                </div>
                <p style={styles.readerHeaderSub}>{readerHeaderSub}</p>
              </div>
            </div>
            {showReadingClock ? (
              // Pílula do relógio (cronômetro unificado, 2026-09-21) — toca
              // pra pausar/retomar; ao zerar passa a contar pra cima,
              // discreto, nunca bloqueia a leitura. Versão compacta do
              // mesmo cronômetro de Oração/Reflexão (StepTimerPill.jsx) —
              // aqui não cabe o card grande, a leitura é imersiva.
              <StepTimerPill
                lang={lang}
                planSeconds={planPriorSeconds + stepElapsedSeconds}
                passoSeconds={stepElapsedSeconds}
                passoDurationSeconds={targetClockSeconds}
                running={!clockPaused}
                onToggle={() => setClockPaused(p => !p)}
                onStop={handleConcludePress}
                flash={zeroFlash}
              />
            ) : (
              <div style={styles.readerHeaderRight}>
                {/* Botão "Grupo" (quadro 17c) — abre a sala do capítulo (17a). */}
                {myGroup && heroSession.type !== 'reflection' && (
                  <button
                    style={styles.groupBtn}
                    onClick={() => onOpenGroupRoom?.({ group: myGroup, book: heroSession.book, bookEn: heroSession.bookEn, chapter: heroSession.chStart })}
                  >
                    <span style={{ display: 'flex' }}>
                      <span style={{ ...styles.groupBtnAvatar, background: 'var(--bento-accent)' }} />
                      <span style={{ ...styles.groupBtnAvatar, background: 'var(--bento-sand)', marginLeft: -6 }} />
                    </span>
                    <span style={styles.groupBtnText}>{t('room.groupBtn', undefined, lang)}</span>
                  </button>
                )}
                {/* Dois ícones por fidelidade visual à 4a (ondas + menu) —
                    os dois abrem Ferramentas, a mesma única ação que o
                    cabeçalho já tinha; não inventamos uma 2ª
                    funcionalidade nova (decisão tomada com a autora antes
                    de implementar esta tela). */}
                <button onClick={() => setToolsOpen(true)} style={styles.readerIconBtn} aria-label={t('reading.toolsBtn', undefined, lang)}>
                  <AppIcon name="AudioLines" size={16} color="var(--bento-ink)" />
                </button>
                <button onClick={() => setToolsOpen(true)} style={styles.readerIconBtn} aria-label={t('reading.toolsBtn', undefined, lang)}>
                  <AppIcon name="MoreVertical" size={16} color="var(--bento-ink)" />
                </button>
              </div>
            )}
          </div>
          {showReadingClock && !readerHeaderHidden && (
            <div style={styles.clockElapsedTrack}>
              <div style={{ ...styles.clockElapsedFill, width: `${targetClockSeconds > 0 ? Math.min(100, Math.round((stepElapsedSeconds / targetClockSeconds) * 100)) : 0}%` }} />
            </div>
          )}
        </>
      )}
      {/* "Relembre onde a história parou" (follow-up, turno 39) — em cima
          do texto, sempre que a leitura imersiva abre um capítulo de
          verdade (não reflexão). Mesmo par hasAI/toggle do contexto
          automático de 10c — é o mesmo conteúdo, só reaberto sob demanda. */}
      {heroSession.type !== 'reflection' && hasAI && getChapterContextEnabled() && (
        <div style={{ padding: '0 20px 4px' }}>
          <button type="button" style={styles.recallBtn} onClick={() => setRecallOpen(true)}>
            <span style={styles.recallBtnDiamond} />
            <span>{t('context.recallButton', undefined, lang)}</span>
          </button>
        </div>
      )}
      {/* O texto: na leitura do plano, o da sessão em destaque; na leitura
          livre, o do capítulo aberto. Um cartão branco sobre o fundo creme. */}
      {(mode !== 'browse' || expandedChapterId != null) && (
        <div style={freeReading ? styles.readerTextCardWrapFree : styles.readerTextCardWrap}>
          <div ref={textCardRef} style={freeReading ? styles.readerTextCardFree : styles.readerTextCard}>
            <BibleTextPanel
              session={heroSession}
              lang={lang}
              highlights={highlights}
              highlightSelection={highlightSelection}
              focusVerseRequest={initialFocusVerse}
              onVerseNumberClick={handleHighlightVerseClick}
              onTextSelectionRange={handleHighlightTextRange}
              groupMarks={myGroup && groupLayerOn ? groupMarks : null}
              versionId={freeReading ? versionId : undefined}
              onChangeVersion={freeReading ? handleChangeVersion : undefined}
              chapterLabelFor={freeReading ? ch => chapterLabel(heroSession.book, ch, lang) : undefined}
            />
          </div>
        </div>
      )}

      {/* Sessão de reflexão ao final do livro */}
      {heroSession.type === 'reflection' && (
        <div style={{ padding: '0 14px 4px' }}>
          <ReflectionCard bookKey={heroSession.book} displayName={heroBookDisplayName} info={bookInfoSource[heroSession.book]} lang={lang} />
        </div>
      )}
    </>
  )

  // Contexto antes do capítulo (10c) — substitui a tela de leitura inteira
  // até a pessoa começar a ler de verdade ou pular (ver dismissChapterContext
  // acima). Só chega aqui depois de TODOS os hooks já terem rodado.
  if (contextGate) {
    return (
      <ChapterContextScreen
        lang={lang}
        book={lang === 'en' ? heroSession.bookEn : heroSession.book}
        chapter={heroSession.chStart}
        data={contextData}
        onBegin={dismissChapterContext}
        onSkip={dismissChapterContext}
      />
    )
  }

  // "Anotar" (39e → 39f, Bloco 4) — mesmo padrão do contextGate acima e de
  // BookChapterScreen.jsx pra 39d: o próprio componente troca o que
  // retorna, sem rota nova em App.jsx. "voltar"/"Salvar" (onBack/onSave)
  // fecham 39f e voltam direto pra leitura.
  if (wantsToAnnotate && (highlightSelection || highlightEditingId)) {
    return (
      <VerseAnnotateScreen
        lang={lang}
        chLabel={chLabel}
        heroBook={heroSession.book}
        heroBookEn={heroSession.bookEn}
        selection={highlightSelection}
        editingHighlight={highlightEditingId ? highlights?.find(h => h.id === highlightEditingId && !h.hidden) : null}
        myGroups={session.myGroups ?? []}
        tagVocabulary={collectTagVocabulary(highlights)}
        onBack={cancelHighlightCompose}
        onSave={submitAnnotation}
      />
    )
  }

  // "Compartilhar" (39e → 39i, Bloco 5) — mesmo padrão.
  if (wantsToShareImage && (highlightSelection || highlightEditingId)) {
    return (
      <VerseShareScreen
        lang={lang}
        chLabel={chLabel}
        heroBook={heroSession.book}
        heroBookEn={heroSession.bookEn}
        selection={highlightSelection}
        editingHighlight={highlightEditingId ? highlights?.find(h => h.id === highlightEditingId && !h.hidden) : null}
        onBack={() => { setWantsToShareImage(false); cancelHighlightCompose() }}
      />
    )
  }

  // "Perguntar sobre este versículo" (39e → 39j, Bloco 5) — mesmo padrão;
  // aqui "voltar" é closeAskScreen (não cancelHighlightCompose sozinho),
  // porque também precisa limpar passageAnswer.
  if (wantsToAsk && (highlightSelection || highlightEditingId)) {
    return (
      <VersePerguntarScreen
        lang={lang}
        chLabel={chLabel}
        heroBook={heroSession.book}
        heroBookEn={heroSession.bookEn}
        selection={highlightSelection}
        editingHighlight={highlightEditingId ? highlights?.find(h => h.id === highlightEditingId && !h.hidden) : null}
        state={passageAnswer}
        onBack={closeAskScreen}
        onAsk={askAboutSelection}
        onAskAgain={askAboutSelection}
        onSaveNote={saveAnswerToNote}
      />
    )
  }

  return (
    <>
    {/* Portal pro <body> — não pro fluxo normal: .app-content-inner ganha
        zoom quando "texto grande" está ligado (ver html.large-text em
        index.css), e "zoom" cria um novo bloco de containment pra
        position:fixed no Chrome/Safari, fazendo o botão calcular a
        posição errada (testado: aparecia fora da tela). Fora dessa
        árvore, o mesmo truque de centralização de .bottom-nav
        (left:50%+translateX(-50%) dentro de max-width:var(--max-width))
        funciona igual. */}
    {/* Chat flutua por cima da leitura (mesmo motivo do portal acima) — a
        pessoa nunca sai de onde estava; fecha com o X ou tocando fora, e
        volta pra exatamente a mesma posição de rolagem de antes. */}
    {aiChatOpen && heroSession.type !== 'reflection' && createPortal(
      <div style={styles.aiChatOverlayBackdrop} onClick={() => setAiChatOpen(false)}>
        <div style={styles.aiChatOverlayWindow} onClick={e => e.stopPropagation()}>
          <div style={styles.aiChatOverlayHeader}>
            <span style={styles.aiChatOverlayTitle}>
              <span style={styles.aiChatOverlayIcon}><AppIcon name="HelpCircle" size={15} color="var(--bento-accent)" /></span>
              {t('reading.tagAskAi', undefined, lang)}
            </span>
            <button type="button" style={styles.aiChatOverlayClose} onClick={() => setAiChatOpen(false)} aria-label={t('aiChat.close', undefined, lang)}>
              <AppIcon name="X" size={16} color="var(--bento-t3)" />
            </button>
          </div>
          <div style={styles.aiChatOverlayBody}>
            <AiChatPanel session={heroSession} lang={lang} />
          </div>
        </div>
      </div>,
      document.body
    )}
    {/* Folha do versículo selecionado (39e, pacote 39) — só imersivo, ver
        selectionMenuOpen acima. Sobe sobre a leitura, que fica visível e
        escurecida atrás; vale igual na leitura do plano (35f) e na livre
        (39d). "Copiar" troca pra 39g (VerseCopySheet) dentro da mesma
        folha — mutuamente exclusivas, nunca as duas montadas juntas. */}
    {selectionMenuOpen && (
      copySheetOpen ? (
        <VerseCopySheet
          lang={lang}
          heroBook={heroSession.book}
          heroBookEn={heroSession.bookEn}
          selection={highlightSelection}
          editingHighlight={highlightEditingId ? highlights?.find(h => h.id === highlightEditingId && !h.hidden) : null}
          onClose={handleSheetClose}
          onCopy={copyWithFormat}
        />
      ) : (
        <VerseActionsSheet
          lang={lang}
          hasAI={hasAI && getAskEnabled()}
          chLabel={chLabel}
          heroBook={heroSession.book}
          heroBookEn={heroSession.bookEn}
          selection={highlightSelection}
          editingHighlight={highlightEditingId ? highlights?.find(h => h.id === highlightEditingId && !h.hidden) : null}
          onClose={handleSheetClose}
          onChooseColor={chooseQuickColor}
          onRemove={handleSheetRemove}
          onAnnotate={startAnnotatingFromSheet}
          onCopy={openCopySheet}
          onShare={openShareImageScreen}
          onAsk={openAskScreen}
        />
      )
    )}
    {/* A leitura: o texto rolável com o cabeçalho preso no topo, e o rodapé
        fixo. */}
      <div style={{ height: '100%', background: 'var(--bento-bg)' }}>
        {/* Leitura livre: o respiro de baixo é a altura do próprio rodapé
            (a barra, ou o cartão de capítulo marcado, que é mais alto) —
            o fim do texto sempre consegue subir pra cima dele. */}
        <div ref={scrollRef} style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: freeReading ? freeFooterHeight : 148, height: '100%' }}>
          {headerAndPanels}
        </div>
        {/* Rodapé portalado pro <body> — position:fixed dentro de
            .app-content-inner com zoom ligado (texto grande) calcularia a
            posição errada, mesmo problema/solução dos FABs mais abaixo e
            da .bottom-nav. */}
        {/* Turno 39, Bloco 3: a folha de 39e (VerseActionsSheet) cobre o
            rodapé inteiro enquanto aberta — esconde igual em qualquer um
            dos seus dois estados (escolhendo cor/ação, ou perguntando). */}
        {!selectionMenuOpen && freeReading && createPortal(
          <LeituraLivreRodape
            ref={measureFreeFooter}
            card={freeCard}
            blocoId={freeBookInfo.blocoId}
            done={freeChapterDone}
            onTools={() => setToolsOpen(true)}
            onMark={handleMarkFreeChapterRead}
            onUnmark={handleUnmarkFreeChapter}
            onCloseCard={() => setMarkedChapter(null)}
            onNext={goToFreeChapter}
          />,
          document.body,
        )}
        {!selectionMenuOpen && !freeReading && createPortal(
          <div style={styles.readerFooter}>
            {/* Chave da camada do grupo (quadro 17c) — só pra quem está num
                grupo. */}
            {myGroup && heroSession.type !== 'reflection' && (
              <div style={styles.groupLayerCard}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.groupLayerTitle}>{t('room.showMarks', undefined, lang)}</p>
                  <p style={styles.groupLayerSub}>{t('room.showMarksSub', undefined, lang)}</p>
                </div>
                <button role="switch" aria-checked={groupLayerOn} onClick={toggleGroupLayer}
                  style={{ ...styles.groupLayerSwitch, background: groupLayerOn ? 'var(--bento-ink)' : 'var(--bento-toggle-off)', justifyContent: groupLayerOn ? 'flex-end' : 'flex-start' }}>
                  <span style={{ ...styles.groupLayerThumb, background: groupLayerOn ? 'var(--bento-accent)' : '#fff' }} />
                </button>
              </div>
            )}
            {/* Quadro 17c: com grupo, o rodapé é a chave + Ferramentas/Concluir,
                sem o player — o áudio continua em Ferramentas. */}
            {heroSession.type !== 'reflection' && !myGroup && (
              <BibleAudioPlayer session={heroSession} lang={lang} hasNext={false} allowPremiumVoice={hasPremium} compact />
            )}
            <div style={styles.readerFooterRow}>
              <button style={styles.readerToolsBtn} onClick={() => setToolsOpen(true)}>
                <ToolboxIcon />
                {t('reading.toolsBtn', undefined, lang)}
              </button>
              <button style={styles.readerDoneBtn} onClick={handleConcludePress}>
                <AppIcon name="Check" size={16} strokeWidth={2.6} color="var(--bento-ink)" />
                {t('reading.finishShort', undefined, lang)}
              </button>
            </div>
          </div>,
          document.body,
        )}
        {timeUpSheetOpen && createPortal(
          <TimeUpSheet
            lang={lang}
            remainingSeconds={targetClockSeconds > stepElapsedSeconds ? targetClockSeconds - stepElapsedSeconds : 0}
            finishedTitle={heroTitle}
            nextTitle={nextSessionForTimeUp ? (lang === 'en' ? nextSessionForTimeUp.titleEn : nextSessionForTimeUp.title) : null}
            onContinue={handleContinueReading}
            onFinishHere={handleFinishHere}
          />,
          document.body,
        )}
        <ToolsSheet
          open={toolsOpen}
          onClose={() => setToolsOpen(false)}
          lang={lang}
          title={t('reading.toolsBtn', undefined, lang)}
          subtitle={t('reading.toolsSubtitle', {
            ref: `${heroBookDisplayName} ${heroSession.chStart}${heroSession.chStart !== heroSession.chEnd ? `–${heroSession.chEnd}` : ''}`,
          }, lang)}
          items={[
            // Com grupo (17c) o player sai do rodapé e passa a viver aqui.
            // Fora do quadro 5e (que só desenha os 4 cards fixos) — vira
            // linha cheia abaixo da grade, não um 5º card.
            ...(myGroup && heroSession.type !== 'reflection' ? [
              { key: 'audio', icon: 'AudioLines', label: t('bibleAudio.listenChapter', undefined, lang), node: <BibleAudioPlayer session={heroSession} lang={lang} hasNext={false} allowPremiumVoice={hasPremium} compact /> },
            ] : []),
            ...(heroBooks.length > 0 ? [
              { key: 'contexto', icon: 'BookOpen', label: t('reading.tagContext', undefined, lang), sub: t('reading.toolsContextSub', undefined, lang), node: <InfoPanel type="contexto" books={heroBooks} chStart={heroSession.chStart} chEnd={heroSession.chEnd} lang={lang} /> },
              { key: 'mapa', icon: 'Map', label: t('reading.tagMap', undefined, lang), sub: t('reading.toolsMapSub', { place: heroBooks[0].info.location.name }, lang), node: <InfoPanel type="mapa" books={heroBooks} chStart={heroSession.chStart} chEnd={heroSession.chEnd} lang={lang} /> },
            ] : []),
            ...(hasPremium ? [{ key: 'notas', icon: 'StickyNote', label: t('reading.toolsNotesTitle', undefined, lang), sub: t(noteText.trim() ? 'reading.toolsNotesSubHas' : 'reading.toolsNotesSubEmpty', undefined, lang), node: <NotesPanel value={noteText} onSave={handleSaveNote} lang={lang} /> }] : []),
            ...(heroBooks.length > 0 ? [
              { key: 'curiosidades', icon: 'Lightbulb', label: t('reading.tagTrivia', undefined, lang), sub: t('reading.toolsTriviaSub', { n: heroBooks[0].info.curiosities.length }, lang), node: <InfoPanel type="curiosidades" books={heroBooks} chStart={heroSession.chStart} chEnd={heroSession.chEnd} lang={lang} /> },
            ] : []),
          ]}
          extra={hasAI ? (
            // Preto + iconizinho laranja — mesma identidade de "Perguntar à
            // IA" já usada na folha de ações de versículo (verseSheetAskCard,
            // acima nesta tela); pedido dela, 2026-09-09, pra bater aqui
            // também (antes era um cartão claro com ícone e texto laranja).
            <button
              style={styles.toolsExtraBtn}
              onClick={() => { setToolsOpen(false); openAiChat() }}
            >
              <span style={styles.toolsExtraBtnDiamondWrap}><span style={styles.toolsExtraBtnDiamond} /></span>
              {t('reading.tagAskAi', undefined, lang)}
            </button>
          ) : null}
        />
        <ChapterPickerSheet
          open={chapterPickerOpen}
          onClose={() => setChapterPickerOpen(false)}
          lang={lang}
          bookDisplayName={heroBookDisplayName}
          totalChapters={computeBookChapterCounts(sessionsByBlock)[heroSession.book] ?? 0}
          currentChapter={heroSession.chStart}
          completedSet={completedSet}
          bookKey={heroSession.book}
          onSelectChapter={openChapterFromPicker}
          onSwitchBook={() => { setChapterPickerOpen(false); onNavigate?.('journey') }}
        />
        {recallOpen && (
          <ChapterRecallSheet
            lang={lang}
            book={heroBookDisplayName}
            chapter={heroSession.chStart}
            data={recallData}
            onClose={() => setRecallOpen(false)}
          />
        )}
      </div>
    </>
  )
}

// Anotar o versículo (39f, pacote 39) — TELA CHEIA (não folha, ao contrário
// de 39e/39g), aberta a partir de "Anotar" em 39e (ver o early return de
// wantsToAnnotate acima). Cor do grifo não muda aqui — já foi escolhida em
// 39e; esta tela cuida só de texto, etiqueta (uma só — "a ativa em
// preto", singular no HANDOFF) e compartilhar em grupo (esse sim,
// seleção múltipla). "Salvar"/"voltar" fecham 39f e voltam direto pra
// leitura, nunca pra 39e (a escolha de cor já foi feita, reabrir a folha
// de cor não faria sentido).
function VerseAnnotateScreen({
  lang, chLabel, heroBook, heroBookEn, selection, editingHighlight,
  myGroups, tagVocabulary, onBack, onSave,
}) {
  const L = (k, vars) => t(`reading.${k}`, vars, lang)
  const [text, setText] = useState(editingHighlight?.text ?? '')
  const [tag, setTag] = useState(editingHighlight?.tags?.[0] ?? null)
  const [addingTag, setAddingTag] = useState(false)
  const [newTagText, setNewTagText] = useState('')
  const [shareOn, setShareOn] = useState((editingHighlight?.sharedGroupIds?.length ?? 0) > 0)
  const [selectedGroupIds, setSelectedGroupIds] = useState(editingHighlight?.sharedGroupIds ?? [])
  const [memberCounts, setMemberCounts] = useState({})

  useEffect(() => {
    if (!myGroups?.length) return
    let cancelled = false
    getGroupMemberCounts(myGroups.map(g => g.groupId)).then(counts => { if (!cancelled) setMemberCounts(counts) }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chapter = editingHighlight?.chapter ?? selection?.chapter
  const verses = editingHighlight ? editingHighlight.verses : (selection ? [...selection.verses].sort((a, b) => a - b) : [])
  const versesKey = verses.join(',')
  const refText = `${lang === 'en' ? heroBookEn : heroBook} ${chapter}:${formatVerseRanges(verses)}`
  const versionShort = findBibleVersion(getSelectedVersionId(lang))?.short ?? ''

  // Texto de verdade do(s) versículo(s) — a pessoa vê sobre o que está
  // anotando sem precisar lembrar (mesmo motivo/fonte de HighlightComposer
  // antes dele, ver fetchBookText).
  const [quoteText, setQuoteText] = useState('')
  useEffect(() => {
    if (!chapter || !versesKey) { setQuoteText(''); return }
    let cancelled = false
    const versionId = getSelectedVersionId(lang)
    const bookKey = lang === 'en' ? heroBookEn : heroBook
    fetchBookText(versionId, bookKey).then(chapters => {
      if (cancelled) return
      const chapterData = chapters[String(chapter)]
      if (!chapterData) { setQuoteText(''); return }
      setQuoteText(versesKey.split(',').map(v => chapterData.verses[v] ?? '').join(' ').replace(/\n/g, ' '))
    }).catch(() => { if (!cancelled) setQuoteText('') })
    return () => { cancelled = true }
  }, [lang, heroBook, heroBookEn, chapter, versesKey])

  function toggleTag(name) {
    setTag(cur => cur === name ? null : name)
    setAddingTag(false)
  }
  function confirmNewTag() {
    const clean = newTagText.trim()
    if (clean) setTag(clean)
    setNewTagText('')
    setAddingTag(false)
  }
  function toggleGroup(id) {
    setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function handleSave() {
    const tags = tag ? [tag] : []
    const groupIds = shareOn ? selectedGroupIds : []
    const quote = quoteText ? { text: quoteText, ref: `${refText} (${versionShort})` } : null
    onSave(text, tags, groupIds, quote)
  }

  // A etiqueta desta nota pode ser uma recém-digitada, ainda fora do
  // vocabulário — some na lista de chips mesmo assim (some some de volta
  // se a pessoa trocar de etiqueta antes de salvar, sem problema).
  const allTags = tag && !tagVocabulary.includes(tag) ? [...tagVocabulary, tag] : tagVocabulary

  return (
    <div style={{ height: '100%', background: 'var(--bento-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={annotateStyles.header}>
        <button style={annotateStyles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={annotateStyles.headerTitle}>{L('annotateTitle')}</p>
          <p style={annotateStyles.headerSub}>{refText}</p>
        </div>
        <button style={annotateStyles.saveBtn} onClick={handleSave}>{L('annotateSave')}</button>
      </div>

      <div style={annotateStyles.body}>
        <div style={annotateStyles.quoteCard}>
          {quoteText && <p style={annotateStyles.quoteText}>“{quoteText}”</p>}
          <p style={annotateStyles.quoteRef}>{refText} · {versionShort}</p>
        </div>

        <div style={annotateStyles.card}>
          <div style={annotateStyles.cardHeaderRow}>
            <p style={annotateStyles.cardLabel}>{L('yourNoteLabel')}</p>
            <p style={annotateStyles.optionalLabel}>{L('optional')}</p>
          </div>
          <textarea
            style={annotateStyles.textarea}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={L('notePlaceholderVerse')}
          />
        </div>

        <div style={annotateStyles.card}>
          <p style={annotateStyles.cardLabel}>{L('tagsLabel')}</p>
          <div style={annotateStyles.tagsRow}>
            {allTags.map(name => (
              <button key={name} type="button" style={{ ...annotateStyles.tagChip, ...(tag === name ? annotateStyles.tagChipActive : {}) }} onClick={() => toggleTag(name)}>
                {name}
              </button>
            ))}
            {addingTag ? (
              <input
                autoFocus type="text" style={annotateStyles.tagInput} value={newTagText}
                onChange={e => setNewTagText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmNewTag(); if (e.key === 'Escape') { setAddingTag(false); setNewTagText('') } }}
                onBlur={confirmNewTag}
                placeholder={L('newTagPlaceholder')}
                maxLength={24}
              />
            ) : (
              <button type="button" style={annotateStyles.tagChip} onClick={() => setAddingTag(true)}>{L('newTagChip')}</button>
            )}
          </div>
        </div>

        {myGroups?.length > 0 && (
          <div style={annotateStyles.card}>
            <div style={annotateStyles.shareRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={annotateStyles.shareTitle}>{L('shareInGroupTitle')}</p>
                <p style={annotateStyles.shareSub}>{shareOn ? L('shareInGroupOnSub') : L('shareInGroupOffSub')}</p>
              </div>
              <button role="switch" aria-checked={shareOn} onClick={() => setShareOn(v => !v)}
                style={{ ...annotateStyles.toggle, background: shareOn ? 'var(--bento-ink)' : 'var(--bento-toggle-off)', justifyContent: shareOn ? 'flex-end' : 'flex-start' }}>
                <span style={{ ...annotateStyles.toggleThumb, background: shareOn ? 'var(--bento-accent)' : '#fff' }} />
              </button>
            </div>
            {shareOn && (
              <>
                <p style={annotateStyles.whichGroupsLabel}>{L('whichGroupsLabel')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myGroups.map(g => {
                    const on = selectedGroupIds.includes(g.groupId)
                    const palette = avatarPaletteFor(g.groupId)
                    const n = memberCounts[g.groupId] ?? 0
                    return (
                      <button key={g.groupId} type="button" style={{ ...annotateStyles.groupRow, ...(on ? annotateStyles.groupRowActive : {}) }} onClick={() => toggleGroup(g.groupId)}>
                        <span style={{ ...annotateStyles.groupAvatar, background: palette.bg, color: palette.fg }}>{avatarInitialsOf(g.name)}</span>
                        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <span style={{ ...annotateStyles.groupName, color: on ? '#fff' : 'var(--bento-ink)' }}>{g.name}</span>
                          <span style={{ ...annotateStyles.groupCount, color: on ? 'rgba(255,255,255,.6)' : 'var(--bento-t3)', display: 'block' }}>
                            {L(n === 1 ? 'groupMemberOne' : 'groupMemberMany', { n })}
                          </span>
                        </span>
                        {on ? <AppIcon name="Check" size={16} color="var(--bento-accent)" /> : <span style={annotateStyles.groupCheckboxEmpty} />}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            <p style={annotateStyles.shareFooterNote}>{L('shareGroupFooterNote')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

const annotateStyles = {
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 16px', flexShrink: 0 },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0' },
  saveBtn: { flexShrink: 0, height: 40, padding: '0 18px', borderRadius: 14, border: 'none', background: 'var(--bento-accent)', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 20px calc(24px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 14 },
  // Filete #7A4A1E === var(--bento-sand-icon), já o hex exato do HANDOFF.
  quoteCard: { background: 'var(--bento-sand)', borderRadius: 22, padding: '18px 20px', borderLeft: '3px solid var(--bento-sand-icon)' },
  quoteText: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--bento-sand-ink-strong)', margin: '0 0 8px' },
  quoteRef: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-sand-ink)', margin: 0 },
  card: { background: 'var(--bento-card)', borderRadius: 22, padding: '18px 20px' },
  cardHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  optionalLabel: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  textarea: {
    width: '100%', minHeight: 170, border: 'none', outline: 'none', resize: 'none', background: 'var(--bento-line)', borderRadius: 18,
    padding: '14px 16px', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-ink)',
  },
  tagsRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tagChip: { height: 36, padding: '0 16px', borderRadius: 99, border: 'none', background: 'var(--bento-line)', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)' },
  tagChipActive: { background: 'var(--bento-ink)', color: '#fff' },
  tagInput: {
    height: 36, minWidth: 90, padding: '0 14px', borderRadius: 99, border: '1.5px solid var(--bento-line)', outline: 'none',
    fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', background: '#fff',
  },
  shareRow: { display: 'flex', alignItems: 'center', gap: 12 },
  shareTitle: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  shareSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  toggle: { flexShrink: 0, width: 46, height: 28, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  toggleThumb: { width: 22, height: 22, borderRadius: 99 },
  whichGroupsLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '16px 0 10px' },
  groupRow: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 62, borderRadius: 18, border: 'none', background: 'var(--bento-line)',
    padding: '0 14px', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left',
  },
  groupRowActive: { background: 'var(--bento-ink)' },
  groupAvatar: { width: 34, height: 34, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800 },
  groupName: { display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 2 },
  groupCount: { fontSize: 12, fontWeight: 500 },
  groupCheckboxEmpty: { width: 20, height: 20, flexShrink: 0, borderRadius: 7, border: '1.5px solid var(--bento-t5)' },
  shareFooterNote: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t4)', margin: '16px 0 0' },
}

// Compartilhar como imagem (39i, pacote 39) — TELA CHEIA. "O que se vê é
// a imagem, em escala — não um painel que depois vira imagem" (mesmo
// princípio de 37d/dayCompleteImage.js): o cartão aqui dentro É o
// resultado do canvas (renderVerseCardImage), só reduzido por CSS, e
// redesenha sozinho a cada troca de estilo/formato/nota.
function VerseShareScreen({ lang, chLabel, heroBook, heroBookEn, selection, editingHighlight, onBack }) {
  const L = (k, vars) => t(`reading.${k}`, vars, lang)
  const [style, setStyle] = useState('dark')
  const [format, setFormat] = useState('portrait')
  const [includeNote, setIncludeNote] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [busy, setBusy] = useState(false)

  const chapter = editingHighlight?.chapter ?? selection?.chapter
  const verses = editingHighlight ? editingHighlight.verses : (selection ? [...selection.verses].sort((a, b) => a - b) : [])
  const versesKey = verses.join(',')
  const refText = `${lang === 'en' ? heroBookEn : heroBook} ${chapter}:${formatVerseRanges(verses)}`
  const versionShort = findBibleVersion(getSelectedVersionId(lang))?.short ?? ''
  const noteText = editingHighlight?.text ?? ''
  const dims = VERSE_CARD_FORMATS_DIMS[format]

  useEffect(() => {
    if (!chapter || !versesKey) { setQuoteText(''); return }
    let cancelled = false
    const versionId = getSelectedVersionId(lang)
    const bookKey = lang === 'en' ? heroBookEn : heroBook
    fetchBookText(versionId, bookKey).then(chapters => {
      if (cancelled) return
      const chapterData = chapters[String(chapter)]
      if (!chapterData) { setQuoteText(''); return }
      setQuoteText(versesKey.split(',').map(v => chapterData.verses[v] ?? '').join(' ').replace(/\n/g, ' '))
    }).catch(() => { if (!cancelled) setQuoteText('') })
    return () => { cancelled = true }
  }, [lang, heroBook, heroBookEn, chapter, versesKey])

  const cardData = useMemo(() => ({
    text: quoteText, ref: refText, versionShort,
    note: includeNote ? noteText : null,
    style, format,
  }), [quoteText, refText, versionShort, includeNote, noteText, style, format])

  useEffect(() => {
    if (!quoteText) return
    let cancelled = false
    renderVerseCardImage(cardData).then(blob => {
      if (cancelled || !blob) return
      const url = URL.createObjectURL(blob)
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardData, quoteText])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  async function handleShare() {
    if (busy || !quoteText) return
    setBusy(true)
    try {
      const blob = await renderVerseCardImage(cardData)
      await shareVerseCardImage(blob, { title: refText, text: refText })
    } finally {
      setBusy(false)
    }
  }
  async function handleSave() {
    if (busy || !quoteText) return
    setBusy(true)
    try {
      const blob = await renderVerseCardImage(cardData)
      downloadVerseCardImage(blob)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ height: '100%', background: 'var(--bento-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={annotateStyles.header}>
        <button style={annotateStyles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={annotateStyles.headerTitle}>{L('shareTitle')}</p>
          <p style={annotateStyles.headerSub}>{L('shareSub', { ref: refText, w: dims.w, h: dims.h })}</p>
        </div>
      </div>

      <div style={annotateStyles.body}>
        <div style={{ ...shareStyles.imageWrap, aspectRatio: `${dims.w} / ${dims.h}` }}>
          {previewUrl && <img src={previewUrl} alt="" style={shareStyles.imagePreview} />}
        </div>

        <div style={annotateStyles.card}>
          <p style={annotateStyles.cardLabel}>{L('shareStyleLabel')}</p>
          <div style={shareStyles.swatchRow}>
            {VERSE_CARD_STYLES.map(id => (
              <button
                key={id} type="button" aria-label={id} aria-pressed={style === id}
                style={{ ...shareStyles.swatch, background: VERSE_CARD_STYLE_SWATCH[id], ...(style === id ? shareStyles.swatchActive : {}) }}
                onClick={() => setStyle(id)}
              />
            ))}
          </div>
          <div style={shareStyles.formatRow}>
            {VERSE_CARD_FORMATS.map(id => (
              <button key={id} type="button" style={{ ...shareStyles.formatBtn, ...(format === id ? shareStyles.formatBtnActive : {}) }} onClick={() => setFormat(id)}>
                {L(`shareFormat${id[0].toUpperCase()}${id.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {noteText.trim() && (
          <div style={annotateStyles.card}>
            <div style={annotateStyles.shareRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={annotateStyles.shareTitle}>{L('shareIncludeNoteTitle')}</p>
                <p style={shareStyles.notePreview}>"{noteText.trim()}"</p>
              </div>
              <button role="switch" aria-checked={includeNote} onClick={() => setIncludeNote(v => !v)}
                style={{ ...annotateStyles.toggle, background: includeNote ? 'var(--bento-ink)' : 'var(--bento-toggle-off)', justifyContent: includeNote ? 'flex-end' : 'flex-start' }}>
                <span style={{ ...annotateStyles.toggleThumb, background: includeNote ? 'var(--bento-accent)' : '#fff' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={shareStyles.footer}>
        <button style={shareStyles.saveBtn} onClick={handleSave} disabled={busy || !quoteText}>{L('shareSaveBtn')}</button>
        <button style={shareStyles.shareBtn} onClick={handleShare} disabled={busy || !quoteText}>
          <AppIcon name="Upload" size={16} strokeWidth={2.2} color="var(--bento-ink)" />
          {L('verseShare')}
        </button>
      </div>
    </div>
  )
}

const VERSE_CARD_FORMATS_DIMS = {
  portrait: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
}
const VERSE_CARD_STYLE_SWATCH = { dark: '#1A1714', sand: '#E6DACB', light: '#EDE8E2', orange: '#F0662B' }

const shareStyles = {
  imageWrap: { borderRadius: 24, overflow: 'hidden', background: '#1A1714', marginBottom: 14, maxHeight: '48vh', margin: '0 auto 14px' },
  imagePreview: { display: 'block', width: '100%', height: '100%', objectFit: 'contain' },
  swatchRow: { display: 'flex', gap: 10, marginBottom: 14 },
  swatch: { width: 44, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 },
  swatchActive: { outline: '2.5px solid var(--bento-accent)', outlineOffset: 2 },
  formatRow: { display: 'flex', gap: 8 },
  formatBtn: { flex: 1, height: 40, borderRadius: 14, border: 'none', background: 'var(--bento-line)', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-t3)' },
  formatBtnActive: { background: 'var(--bento-ink)', color: '#fff' },
  notePreview: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, fontStyle: 'italic', color: 'var(--bento-t3)', lineHeight: 1.4, margin: '4px 0 0' },
  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  saveBtn: { flex: 1, height: 54, borderRadius: 18, border: 'none', background: '#fff', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)' },
  shareBtn: { flex: 1, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)' },
}

// Perguntar sobre o versículo (39j, pacote 39) — TELA CHEIA, substitui a
// folha escura de sempre (10b) por um visual claro, no mesmo espírito de
// 39f/39g/39i. "A IA mora dentro da leitura, nunca numa aba própria"
// (HANDOFF) — reaproveita a MESMA lógica de sempre (askAboutPassage,
// citações já conferidas no servidor, casos de doutrina divergente/risco/
// fora do escopo, reportar resposta, salvar na nota) só com a casca nova;
// nenhuma dessas regras de segurança/conferência foi reescrita aqui.
// Sugestões prontas ficam visíveis o tempo todo (não somem depois da
// primeira pergunta) — "a conversa continua na mesma tela".
function VersePerguntarScreen({
  lang, chLabel, heroBook, heroBookEn, selection, editingHighlight,
  state, onBack, onAsk, onAskAgain, onSaveNote,
}) {
  const L = (k, vars) => t(`reading.${k}`, vars, lang)
  const LA = (k, vars) => t(`aiPassage.${k}`, vars, lang)
  const [question, setQuestion] = useState('')
  const [suggestions, setSuggestions] = useState(null)
  const [savedNote, setSavedNote] = useState(false)
  const [doctrineTextsOpen, setDoctrineTextsOpen] = useState(false)
  const [doctrineNoted, setDoctrineNoted] = useState(false)
  const [reported, setReported] = useState(false)
  const [quoteText, setQuoteText] = useState('')

  const chapter = editingHighlight?.chapter ?? selection?.chapter
  const verses = editingHighlight ? editingHighlight.verses : (selection ? [...selection.verses].sort((a, b) => a - b) : [])
  const versesKey = verses.join(',')
  const refText = `${lang === 'en' ? heroBookEn : heroBook} ${chapter}:${formatVerseRanges(verses)}`
  const versionShort = findBibleVersion(getSelectedVersionId(lang))?.short ?? ''

  useEffect(() => {
    if (!chapter || !versesKey) { setQuoteText(''); return }
    let cancelled = false
    const versionId = getSelectedVersionId(lang)
    const bookKey = lang === 'en' ? heroBookEn : heroBook
    fetchBookText(versionId, bookKey).then(chapters => {
      if (cancelled) return
      const chapterData = chapters[String(chapter)]
      if (!chapterData) { setQuoteText(''); return }
      setQuoteText(versesKey.split(',').map(v => chapterData.verses[v] ?? '').join(' ').replace(/\n/g, ' '))
    }).catch(() => { if (!cancelled) setQuoteText('') })
    return () => { cancelled = true }
  }, [lang, heroBook, heroBookEn, chapter, versesKey])

  const passageRef = { book: heroBook, bookEn: heroBookEn, chapter, verseStart: verses[0], verseEnd: verses[verses.length - 1] }
  const refKey = `${passageRef.book}:${passageRef.chapter}:${passageRef.verseStart}-${passageRef.verseEnd}`
  useEffect(() => {
    let cancelled = false
    setSuggestions(null)
    const fallback = [LA('suggestion1'), LA('suggestion2'), LA('suggestion3')]
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setSuggestions(fallback); return }
    fetchPassageSuggestions({ ...passageRef, lang })
      .then(list => { if (!cancelled) setSuggestions(list.length === 3 ? list : fallback) })
      .catch(() => { if (!cancelled) setSuggestions(fallback) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey, lang])

  // Reseta os estados de uma resposta anterior sempre que a resposta muda
  // (ex: depois de "Perguntar outra coisa") — mesmo motivo de sempre: sem
  // isso, "Salvo!"/"Reportada" de uma resposta antiga ficaria colado na
  // próxima.
  useEffect(() => { setSavedNote(false); setDoctrineTextsOpen(false); setDoctrineNoted(false); setReported(false) }, [state])

  function submitQuestion(q) {
    const clean = q.trim()
    if (!clean) return
    setQuestion('')
    onAsk(clean)
  }
  function submitFollowUp() {
    submitQuestion(question)
  }
  function handleSaveNote() {
    if (state?.status !== 'ready') return
    onSaveNote(state.question, state.answer.reply)
    setSavedNote(true)
  }
  function handleCopyAnswer() {
    if (state?.status !== 'ready') return
    navigator.clipboard?.writeText(state.answer.reply).catch(() => {})
  }
  function handleReport() {
    if (state?.status !== 'ready' || reported) return
    setReported(true)
    reportPassageAnswer({
      book: passageRef.book, bookEn: passageRef.bookEn, chapter: passageRef.chapter,
      verseStart: passageRef.verseStart, verseEnd: passageRef.verseEnd,
      question: state.question, answer: state.answer, lang,
    }).catch(err => console.error('Failed to report AI answer', err))
  }
  function handleNoteToAsk() {
    if (state?.status !== 'ready' || doctrineNoted) return
    onSaveNote(state.question, `${LA('doctrineNotePrefix')} ${state.question}`)
    setDoctrineNoted(true)
  }

  const isRisk = state?.status === 'ready' && state.answer.outcome === 'risk'

  return (
    <div style={{ height: '100%', background: 'var(--bento-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={annotateStyles.header}>
        <button style={annotateStyles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={annotateStyles.headerTitle}>{L('askScreenTitle')}</p>
          <p style={annotateStyles.headerSub}>{refText} · {versionShort}</p>
        </div>
      </div>

      <div style={annotateStyles.body}>
        <div style={annotateStyles.quoteCard}>
          {quoteText && <p style={annotateStyles.quoteText}>“{quoteText}”</p>}
          <p style={annotateStyles.quoteRef}>{refText} · {versionShort}</p>
        </div>

        {suggestions && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map((s, i) => (
              <button key={i} type="button" style={askStyles.suggestChip} onClick={() => submitQuestion(s)}>{s}</button>
            ))}
          </div>
        )}

        {state && (
          <div style={askStyles.questionBubble}>
            <p style={askStyles.questionText}>{state.question}</p>
          </div>
        )}

        {state?.status === 'loading' && <p style={askStyles.loadingText}>{LA('generating')}</p>}

        {state?.status === 'error' && (
          <p style={askStyles.errorText}>
            {state.error === 'subscription_required' ? LA('errorSubscription')
              : state.error === 'daily_limit_reached' ? LA('errorLimit')
              : state.error === 'citation_unverifiable' ? LA('errorCitation')
              : LA('errorGeneric')}
          </p>
        )}

        {state?.status === 'ready' && (() => {
          const { answer } = state
          const isAnswer = answer.outcome === 'answer'
          const isDoctrine = answer.outcome === 'doctrine_divergent'
          const isOutOfScope = answer.outcome === 'out_of_scope'
          const replyText = isDoctrine ? LA('doctrineReply')
            : isOutOfScope ? (answer.nearTopic ? LA('outOfScopeReply', { topic: answer.nearTopic }) : LA('outOfScopeReplyNoTopic'))
            : answer.reply

          if (isRisk) {
            return (
              <div style={annotateStyles.card}>
                <p style={askStyles.riskText}>{LA('riskLine')}</p>
                {lang !== 'en' && <a href="tel:188" style={askStyles.riskBtn}>{LA('riskCta')}</a>}
              </div>
            )
          }

          return (
            <>
              <div style={annotateStyles.card}>
                <div style={askStyles.answerLabelRow}>
                  <span style={askStyles.answerDiamond} />
                  <p style={askStyles.answerLabel}>{L('answerLabel')}</p>
                </div>
                <p style={askStyles.answerText}>{reported ? LA('reportedNote') : replyText}</p>

                {isDoctrine && !doctrineTextsOpen && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="button" style={askStyles.chipAccent} onClick={() => setDoctrineTextsOpen(true)}>{LA('seeTexts')}</button>
                    <button type="button" style={askStyles.chipGhost} onClick={handleNoteToAsk} disabled={doctrineNoted}>{doctrineNoted ? LA('noteToAskDone') : LA('noteToAsk')}</button>
                  </div>
                )}

                {/* "Também aparece em" — support + expansion citations juntas
                    num bloco só (ambas já verificadas no servidor antes de
                    chegar aqui; o quadro 39j não distingue as duas
                    visualmente, então unificadas aqui também). */}
                {isAnswer && !reported && (
                  <div style={askStyles.crossRefBox}>
                    <p style={askStyles.crossRefLabel}>{L('crossRefLabel')}</p>
                    <p style={askStyles.crossRefLine}><strong>{answer.supportCitation.reference}</strong> · {answer.supportCitation.quote}</p>
                    <p style={askStyles.crossRefLine}><strong>{answer.expansionCitation.reference}</strong> · {answer.expansionCitation.note}</p>
                  </div>
                )}

                {isDoctrine && doctrineTextsOpen && (
                  <div style={askStyles.crossRefBox}>
                    <p style={askStyles.crossRefLine}><strong>{answer.doctrineSideA.label} · {answer.doctrineSideA.reference}</strong> — {answer.doctrineSideA.quote}</p>
                    <p style={askStyles.crossRefLine}><strong>{answer.doctrineSideB.label} · {answer.doctrineSideB.reference}</strong> — {answer.doctrineSideB.quote}</p>
                  </div>
                )}
              </div>

              {isAnswer && !reported && (
                <div style={askStyles.disclaimerBox}>
                  <AppIcon name="Check" size={15} strokeWidth={2.4} color="var(--bento-t3)" />
                  <p style={askStyles.disclaimerText}>{L('askDisclaimer')}</p>
                </div>
              )}

              {isAnswer && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" style={askStyles.saveLibraryBtn} onClick={handleSaveNote} disabled={savedNote || reported}>
                    <AppIcon name="Bookmark" size={15} strokeWidth={1.9} color="var(--bento-ink)" />
                    <span>{savedNote ? L('savedToLibrary') : L('saveToLibrary')}</span>
                  </button>
                  <button type="button" style={askStyles.copyIconBtn} onClick={handleCopyAnswer} aria-label={L('verseCopy')}>
                    <AppIcon name="Copy" size={16} strokeWidth={1.9} color="var(--bento-ink)" />
                  </button>
                </div>
              )}
              {isAnswer && !reported && (
                <button type="button" style={askStyles.reportBtn} onClick={handleReport}>{LA('reportAnswer')}</button>
              )}
            </>
          )
        })()}
      </div>

      {!isRisk && (
        <div style={askStyles.footer}>
          <input
            type="text" style={askStyles.footerInput} value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitFollowUp() }}
            placeholder={LA('askSomethingElse')} maxLength={300}
          />
          <button style={askStyles.footerSend} onClick={submitFollowUp} disabled={!question.trim()} aria-label={L('verseAskSend')}>
            <AppIcon name="ArrowUp" size={15} color="#fff" />
          </button>
        </div>
      )}
    </div>
  )
}

const askStyles = {
  suggestChip: { height: 38, padding: '0 16px', borderRadius: 99, border: 'none', background: '#fff', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 600, color: 'var(--bento-ink)', textAlign: 'left' },
  questionBubble: { alignSelf: 'flex-end', maxWidth: 300, borderRadius: '18px 18px 4px 18px', background: 'var(--bento-ink)', padding: '12px 16px' },
  questionText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.4, color: '#fff', margin: 0 },
  loadingText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, color: 'var(--bento-t3)' },
  errorText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-accent)' },
  answerLabelRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  answerDiamond: { width: 9, height: 9, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  answerLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  answerText: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 500, lineHeight: 1.65, color: 'var(--bento-ink)', margin: 0, whiteSpace: 'pre-line' },
  crossRefBox: { marginTop: 14, borderRadius: 16, background: 'var(--bento-line)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  crossRefLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 2px' },
  crossRefLine: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)', margin: 0 },
  chipAccent: { border: 'none', borderRadius: 99, padding: '9px 12px', background: 'rgba(240,102,43,.12)', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-accent)', cursor: 'pointer' },
  chipGhost: { border: 'none', borderRadius: 99, padding: '9px 12px', background: 'var(--bento-line)', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  riskText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.6, color: 'var(--bento-sand-ink)', margin: '0 0 14px' },
  riskBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 14, background: 'var(--bento-sand-ink-strong)', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-sand)', textDecoration: 'none' },
  // Linha de conferência (39j) — obrigatória, texto fixo (ver askDisclaimer).
  disclaimerBox: { display: 'flex', alignItems: 'flex-start', gap: 10, borderRadius: 16, background: 'var(--bento-card)', padding: '14px 16px' },
  disclaimerText: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: 0 },
  saveLibraryBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 16, border: 'none', background: '#fff', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)' },
  copyIconBtn: { width: 50, height: 50, flexShrink: 0, borderRadius: 16, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  reportBtn: { alignSelf: 'center', border: 'none', background: 'none', padding: 4, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t4)' },
  footer: {
    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, margin: '0 20px calc(16px + var(--safe-bottom))',
    height: 54, borderRadius: 18, background: 'var(--bento-card)', padding: '0 6px 0 18px',
  },
  footerInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)' },
  footerSend: { width: 42, height: 42, flexShrink: 0, borderRadius: 13, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
}

// Ícone do botão "Ferramentas" do rodapé imersivo (quadro 4a) — o traçado
// do protótipo (uma caixa aberta) não tem equivalente no Lucide, então o
// SVG é copiado do HTML, no mesmo tamanho/peso (16px, traço 1.9).
function ToolboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--bento-ink)" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4h12M4 4v9l6 3 6-3V4" />
    </svg>
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
              <div style={styles.panelLocationIcon}><AppIcon name={info.location.icon} size={20} color="var(--bento-accent)" /></div>
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
// groupIntoParagraphs (agrupa por parágrafo real da versão, ver
// chapter.breaks) mora em bibleTextStore.js — turno 41, StudyDayScreen.jsx
// passou a precisar da mesma divisão, então saiu daqui pra não duplicar.

function BibleTextPanel({ session, lang, highlights, highlightSelection, focusVerseRequest, onVerseNumberClick, onTextSelectionRange, groupMarks = null, versionId: versionIdProp, onChangeVersion: onChangeVersionProp, chapterLabelFor }) {
  // Chip da camada do grupo aberto (mostra nomes/notas de quem compartilhou).
  const [openMark, setOpenMark] = useState(null)
  const bookKey = lang === 'en' ? session.bookEn : session.book
  const availableVersions = BIBLE_VERSIONS[lang] ?? []
  // Turno 39, Bloco 2: versionId/onChangeVersion agora podem vir de FORA
  // (39d controla pelo seletor do cabeçalho) — sem eles, o painel continua
  // se virando sozinho, como sempre (ninguém mais passa esses props hoje).
  const [internalVersionId, setInternalVersionId] = useState(() => getSelectedVersionId(lang))
  const versionId = versionIdProp ?? internalVersionId
  const version = findBibleVersion(versionId) ?? availableVersions[0]
  const [state, setState] = useState({ status: 'loading', chapters: null })
  const textRef = useRef(null)

  // Reidrata a versão escolhida quando o idioma muda (ex: pessoa troca de
  // idioma do app enquanto está com esse painel montado em outra sessão) —
  // só quando ninguém de fora está controlando a versão.
  useEffect(() => { if (versionIdProp == null) setInternalVersionId(getSelectedVersionId(lang)) }, [lang, versionIdProp])

  function handleChangeVersion(id) {
    setSelectedVersionId(lang, id)
    if (onChangeVersionProp) onChangeVersionProp(id)
    else setInternalVersionId(id)
  }

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', chapters: null })
    fetchBookText(versionId, bookKey)
      .then(chapters => { if (!cancelled) setState({ status: 'ready', chapters }) })
      .catch(() => { if (!cancelled) setState({ status: 'error', chapters: null }) })
    return () => { cancelled = true }
  }, [versionId, bookKey])

  // Rola até o versículo pedido (39k/39l, Bloco 6) assim que o texto do
  // capítulo carrega — só 1x (focusVerseRequest não muda depois da
  // abertura; ver initialFocusVerse em ReadingBlockView.jsx). O realce em
  // si já vem de fora (highlightSelection inicial, ver mesmo comentário) —
  // este efeito só cuida de rolar até lá.
  useEffect(() => {
    if (!focusVerseRequest || state.status !== 'ready') return
    const el = textRef.current?.querySelector(`[data-chapter="${focusVerseRequest.chapter}"] [data-verse="${focusVerseRequest.verse}"]`)
    if (!el) return
    // "Continuar a leitura livre" (B1): volta ao versículo onde a pessoa
    // parou, no topo da leitura, sem realce — a folga é a altura do
    // cabeçalho, que pode estar à vista.
    if (focusVerseRequest.scrollOnly) {
      el.style.scrollMarginTop = '112px'
      el.scrollIntoView({ block: 'start' })
      return
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status])

  // Selecionar um trecho arrastando o dedo/mouse (como se fosse copiar)
  // também grifa — além de tocar no número do versículo (ver onClick do
  // <sup> abaixo). Escuta `selectionchange` (não mouseup/touchend: no
  // toque, a seleção às vezes só "assenta" de vez um instante depois de
  // soltar o dedo) com um pequeno atraso, resolve o capítulo/intervalo de
  // versículos pelos atributos data-chapter/data-verse dos elementos onde
  // a seleção começa/termina (ver mais abaixo), e limpa a seleção nativa
  // do navegador — a marcação visual daqui pra frente é toda nossa (ver
  // isSelected/isHighlighted mais abaixo).
  const onTextSelectionRangeRef = useRef(onTextSelectionRange)
  onTextSelectionRangeRef.current = onTextSelectionRange
  useEffect(() => {
    let timer = null
    function handleSelectionChange() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !sel.toString().trim()) return
        if (!textRef.current || !sel.anchorNode || !textRef.current.contains(sel.anchorNode)) return
        const anchorEl = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode
        const focusEl = sel.focusNode?.nodeType === 3 ? sel.focusNode.parentElement : sel.focusNode
        const startVerseEl = anchorEl?.closest('[data-verse]')
        const endVerseEl = focusEl?.closest('[data-verse]')
        const chapterEl = anchorEl?.closest('[data-chapter]')
        if (!startVerseEl || !endVerseEl || !chapterEl) return
        let vStart = Number(startVerseEl.dataset.verse)
        let vEnd = Number(endVerseEl.dataset.verse)
        if (vStart > vEnd) { const tmp = vStart; vStart = vEnd; vEnd = tmp }
        const verses = new Set()
        for (let v = vStart; v <= vEnd; v++) verses.add(v)
        sel.removeAllRanges()
        onTextSelectionRangeRef.current?.(Number(chapterEl.dataset.chapter), verses)
      }, 250)
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => { document.removeEventListener('selectionchange', handleSelectionChange); clearTimeout(timer) }
    // Sem depender de onTextSelectionRange (lido via ref acima) — a função
    // muda a cada render do pai, e com o relógio batendo todo segundo o
    // efeito reiniciava e cancelava o timer de 250 ms no meio de ~1 em 4
    // seleções (varredura 2026-10-25).
  }, [])

  function highlightForVerse(ch, v) {
    return highlights?.find(h => !h.hidden && h.book === session.book && h.chapter === ch && h.verses.includes(v))
  }

  const chapterNumbers = []
  for (let ch = session.chStart; ch <= session.chEnd; ch++) chapterNumbers.push(ch)
  // A palavra inteira ("CAPÍTULO 41", vira maiúscula por CSS).
  const chLabel = lang === 'en' ? 'Chapter' : 'Capítulo'

  return (
    // Sem cartão próprio: o cartão branco vem do wrapper de fora (ver
    // readerTextCard).
    <div ref={textRef}>
      {availableVersions.length > 1 && (
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
      )}

      {state.status === 'loading' && <p style={styles.panelText}>{t('reading.textLoading', undefined, lang)}</p>}
      {state.status === 'error' && <p style={styles.panelText}>{t('reading.textError', undefined, lang)}</p>}

      {state.status === 'ready' && chapterNumbers.map(ch => {
        const chapter = state.chapters[String(ch)] ?? { verses: {}, breaks: {} }
        const paragraphs = groupIntoParagraphs(chapter)
        return (
          <div key={ch} data-chapter={ch} style={styles.bibleTextChapterBento}>
            <p style={styles.bibleTextChapterLabelBento}>{chapterLabelFor ? chapterLabelFor(ch) : `${chLabel} ${ch}`}</p>

            {paragraphs.map((verseNums, pIdx) => (
              <Fragment key={pIdx}>
              <p style={styles.bibleTextBodyBento}>
                {verseNums.map((v, vIdx) => {
                  // Toca no versículo inteiro (número OU texto corrido) pra
                  // marcar — usa as coordenadas do toque (não o retângulo do
                  // span, que pode ser gigante em versículo de várias linhas)
                  // pra ancorar o popup exatamente onde a pessoa tocou.
                  // SELECIONAR o texto corrido (arrastar, como se fosse
                  // copiar) também marca — ver o efeito de selectionchange
                  // acima, que usa este data-verse (e o data-chapter do <div>
                  // acima) pra descobrir o intervalo; navegadores não disparam
                  // "click" depois de um arraste que gerou seleção, então os
                  // dois caminhos não brigam entre si. Versículo já marcado
                  // (highlight salvo) ganha o fundo da COR escolhida na hora
                  // de grifar (ver HIGHLIGHT_COLORS); em seleção (ainda não
                  // salvo) ganha um contorno tracejado.
                  const existingHighlight = highlightForVerse(ch, v)
                  const isSelected = highlightSelection?.chapter === ch && highlightSelection.verses.has(v)
                  // Turno 39, Bloco 3 (39e): a leitura imersiva (quadro 4a)
                  // mostrava sempre o mesmo realce Bento fixo (#FFE3C9),
                  // ignorando a cor escolhida — a cor só aparecia na
                  // Biblioteca. Com quatro cores de verdade pra escolher em
                  // 39e, isso deixou de fazer sentido: a cor marcada agora
                  // aparece na hora.
                  const highlightStyle = existingHighlight
                    ? {
                        background: highlightColorBg(existingHighlight.color),
                        borderRadius: 4,
                        padding: '1px 3px',
                        // Sublinhado leve SÓ quando tem anotação de verdade
                        // escrita (texto não-vazio) — grifo só de cor não
                        // ganha, já que não há "anotação" nenhuma pra indicar.
                        ...(existingHighlight.text ? styles.verseAnnotatedUnderline : {}),
                      }
                    : isSelected ? styles.verseSelectedBento : undefined
                  const groupMark = groupMarks?.[ch]?.[v]
                  const groupStyle = groupMark ? styles.verseGroupMarked : undefined
                  const handleVerseTap = () => {
                    if (window.getSelection?.()?.toString()) return
                    onVerseNumberClick?.(ch, v)
                  }
                  return (
                    <span
                      key={v}
                      data-verse={v}
                      style={{ ...highlightStyle, ...groupStyle, ...styles.verseTapTarget }}
                      onClick={handleVerseTap}
                    >
                      {vIdx > 0 && chapter.breaks[String(v)] === 'L' && <br />}
                      <sup style={{ ...styles.bibleTextVerseNumBento, margin: vIdx === 0 ? '0 4px 0 0' : '0 4px 0 6px' }}>{v}</sup>
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
              {/* Chips da camada do grupo (17c): um por versículo marcado por
                  outros, logo depois do parágrafo em que ele está. Tocar
                  abre nomes e notas de quem compartilhou (perfil público). */}
              {groupMarks?.[ch] && verseNums.filter(v => groupMarks[ch][v]).map(v => {
                const gm = groupMarks[ch][v]
                const key = `${ch}:${v}`
                const notes = gm.sharers.filter(x => x.note).length
                const open = openMark === key
                return (
                  <div key={key} style={styles.groupChipWrap}>
                    <button type="button" style={styles.groupChip} onClick={() => setOpenMark(open ? null : key)}>
                      <span style={{ display: 'flex' }}>
                        {Array.from({ length: Math.min(3, gm.marks) }, (_, i) => (
                          <span key={i} style={{ ...styles.groupChipAvatar, background: avatarPaletteFor(`${key}:${i}`).bg, marginLeft: i ? -7 : 0 }} />
                        ))}
                      </span>
                      <span style={styles.groupChipText}>{gm.marks === 1 ? t('room.marksOne', undefined, lang) : t('room.marksMany', { n: gm.marks }, lang)}</span>
                      {notes > 0 && <span style={styles.groupChipNotes}>{notes === 1 ? t('room.notesOne', undefined, lang) : t('room.notesMany', { n: notes }, lang)}</span>}
                    </button>
                    {open && (
                      <div style={styles.groupSharers}>
                        {gm.sharers.length === 0 && <p style={styles.groupSharerNote}>{t('room.sharersNone', undefined, lang)}</p>}
                        {gm.sharers.map((sh, i) => (
                          <p key={i} style={styles.groupSharerNote}><strong style={{ color: 'var(--bento-ink)' }}>{sh.name}</strong>{sh.note ? ` — ${sh.note}` : ''}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              </Fragment>
            ))}
          </div>
        )
      })}

      {state.status === 'ready' && (
        <p style={styles.bibleTextAttributionBento}>{version.attribution ?? t('reading.textSourceEn', undefined, lang)}</p>
      )}
    </div>
  )
}

// Contexto antes do capítulo (10c, reskin Bento) — tela cheia própria,
// substitui a leitura inteira até a pessoa começar ou pular (ver
// contextGate no componente principal). Enquanto `data` ainda é null
// (carregando), mostra os mesmos blocos com um miolo em branco pulsando —
// o botão "Pular contexto" já funciona nesse momento, nunca trava esperando
// a IA responder.
function ChapterContextScreen({ lang, book, chapter, data, onBegin, onSkip }) {
  const L = (k, vars) => t(`context.${k}`, vars, lang)
  const loading = !data

  return (
    <div style={styles.contextScreen}>
      <div style={styles.contextHeader}>
        <button style={styles.contextBackBtn} onClick={onSkip} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={styles.contextHeaderTitle}>{book} {chapter}</p>
          <p style={styles.contextHeaderSub}>{L('beforeStart')}</p>
        </div>
      </div>

      <div style={styles.contextBody}>
        <div style={styles.contextDarkCard}>
          <div style={styles.contextAiLabelRow}>
            <span style={styles.contextAiDiamond} />
            <p style={styles.contextAiLabel}>{L('whereYouAre')}</p>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              <span className="rb-context-skeleton" style={{ ...styles.contextSkeletonLine, width: '100%' }} />
              <span className="rb-context-skeleton" style={{ ...styles.contextSkeletonLine, width: '92%' }} />
              <span className="rb-context-skeleton" style={{ ...styles.contextSkeletonLine, width: '70%' }} />
            </div>
          ) : (
            <p style={styles.contextRecap}>{data.recap}</p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={styles.contextSubBlock}>
              <p style={styles.contextSubBlockLabel}>{L('whoAppears')}</p>
              <p style={styles.contextSubBlockValue}>{loading ? '' : data.whoAppears}</p>
            </div>
            <div style={styles.contextSubBlock}>
              <p style={styles.contextSubBlockLabel}>{L('chapterThread')}</p>
              <p style={styles.contextSubBlockValue}>{loading ? '' : data.chapterThread}</p>
            </div>
          </div>
        </div>

        <div style={styles.contextWatchCard}>
          <p style={styles.contextWatchLabel}>{L('watchForTitle')}</p>
          <p style={styles.contextWatchHint}>{L('watchForHint')}</p>
          {/* Padding das linhas como no quadro: 1ª "0 0 12", do meio "12 0",
              última "12 0 0" (sem borda). */}
          {(loading ? [0, 1, 2] : data.watchFor).map((point, i) => (
            <div key={i} style={{ ...styles.contextWatchRow, ...(i === 0 ? { paddingTop: 0 } : {}), ...(i === 2 ? { borderBottom: 'none', paddingBottom: 0 } : {}) }}>
              <span style={styles.contextWatchDot} />
              {loading
                ? <span className="rb-context-skeleton" style={{ ...styles.contextSkeletonLine, width: '80%' }} />
                : <p style={styles.contextWatchText}>{point}</p>}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.contextFooter}>
        <button style={styles.contextBeginBtn} onClick={onBegin}>
          <span>{L('beginReading')}</span>
        </button>
        <button style={styles.contextSkipBtn} onClick={onSkip}>{L('skipContext')}</button>
      </div>
    </div>
  )
}

// "Relembre onde a história parou" (follow-up, turno 39) — o MESMO
// conteúdo de ChapterContextScreen (recap/quem aparece/fio do capítulo/
// fique de olho em), só que como folha reaberta sob demanda em vez de
// tela cheia automática — por isso não tem onBegin/onSkip, só onClose.
// `data` null = carregando, false = erro (rede/geração falhou — mesma
// postura de sempre, nunca vira parede: mostra uma linha curta e o
// fechar continua funcionando).
function ChapterRecallSheet({ lang, book, chapter, data, onClose }) {
  const L = (k, vars) => t(`context.${k}`, vars, lang)
  const loading = data === null
  const failed = data === false

  return createPortal(
    <div style={styles.verseSheetBackdrop} onClick={onClose}>
      <div style={styles.verseSheet} onClick={e => e.stopPropagation()}>
        <div style={styles.verseSheetHandleWrap}><div style={styles.verseSheetHandle} /></div>
        <p style={styles.verseSheetTitle}>{book} {chapter}</p>
        <p style={styles.verseSheetSub}>{L('beforeStart')}</p>

        {failed ? (
          <p style={styles.recallErrorText}>{t('aiPassage.errorGeneric', undefined, lang)}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={styles.contextDarkCard}>
              <div style={styles.contextAiLabelRow}>
                <span style={styles.contextAiDiamond} />
                <p style={styles.contextAiLabel}>{L('whereYouAre')}</p>
              </div>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  <span className="rb-context-skeleton" style={{ ...styles.contextSkeletonLine, width: '100%' }} />
                  <span className="rb-context-skeleton" style={{ ...styles.contextSkeletonLine, width: '92%' }} />
                  <span className="rb-context-skeleton" style={{ ...styles.contextSkeletonLine, width: '70%' }} />
                </div>
              ) : (
                <p style={styles.contextRecap}>{data.recap}</p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={styles.contextSubBlock}>
                  <p style={styles.contextSubBlockLabel}>{L('whoAppears')}</p>
                  <p style={styles.contextSubBlockValue}>{loading ? '' : data.whoAppears}</p>
                </div>
                <div style={styles.contextSubBlock}>
                  <p style={styles.contextSubBlockLabel}>{L('chapterThread')}</p>
                  <p style={styles.contextSubBlockValue}>{loading ? '' : data.chapterThread}</p>
                </div>
              </div>
            </div>

            <div style={styles.contextWatchCard}>
              <p style={styles.contextWatchLabel}>{L('watchForTitle')}</p>
              <p style={styles.contextWatchHint}>{L('watchForHint')}</p>
              {(loading ? [0, 1, 2] : data.watchFor).map((point, i) => (
                <div key={i} style={{ ...styles.contextWatchRow, ...(i === 0 ? { paddingTop: 0 } : {}), ...(i === 2 ? { borderBottom: 'none', paddingBottom: 0 } : {}) }}>
                  <span style={styles.contextWatchDot} />
                  {loading
                    ? <span className="rb-context-skeleton" style={{ ...styles.contextSkeletonLine, width: '80%' }} />
                    : <p style={styles.contextWatchText}>{point}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// Folha do versículo selecionado (39e, pacote 39) — sobe sobre a leitura
// (que continua visível, escurecida atrás por rgba(26,23,20,.45)), raio
// 32 no topo, alça 44×5. Substitui o antigo menu pequeno ancorado perto
// do toque (SelectionAiMenu) + a etapa de cor isolada de HighlightComposer:
// aqui a cor já é a ação principal (toca e marca na hora, sem uma etapa
// "Marcar" no meio), e Anotar/Copiar/Compartilhar/Perguntar viram
// cartões nesta mesma folha. "Vale igual na leitura do plano (35f) e na
// livre" (HANDOFF) — mesmo componente nos dois.
//
// Duas fontes possíveis pro versículo em foco: uma seleção nova, ainda
// sem grifo (`selection`) ou um grifo já salvo reaberto
// (`editingHighlight`) — nunca as duas ao mesmo tempo (ver
// handleHighlightVerseClick/handleHighlightTextRange no componente
// principal). Turno 39, Bloco 5: "Perguntar" deixou de ser um estado
// interno desta folha (sugestões+campo aqui dentro) — agora é a mesma
// troca de tela cheia que Anotar/Compartilhar já fazem, pra 39j de
// verdade (ver VersePerguntarScreen).
function VerseActionsSheet({
  lang, hasAI, chLabel, heroBook, heroBookEn, selection, editingHighlight,
  onClose, onChooseColor, onRemove, onAnnotate, onCopy, onShare, onAsk,
}) {
  const L = (k, vars) => t(`reading.${k}`, vars, lang)

  const chapter = editingHighlight?.chapter ?? selection?.chapter
  const verses = editingHighlight ? editingHighlight.verses : (selection ? [...selection.verses].sort((a, b) => a - b) : [])
  const currentColor = editingHighlight?.color ?? null

  if (verses.length === 0) return null

  const refText = `${lang === 'en' ? heroBookEn : heroBook} ${chapter}:${formatVerseRanges(verses)}`

  return createPortal(
    <div style={styles.verseSheetBackdrop} onClick={onClose}>
      <div style={styles.verseSheet} onClick={e => e.stopPropagation()}>
        <div style={styles.verseSheetHandleWrap}><div style={styles.verseSheetHandle} /></div>
        <p style={styles.verseSheetTitle}>{refText}</p>
        <p style={styles.verseSheetSub}>{verseSelectionLabel(verses.length, lang)}</p>

        <p style={styles.verseSheetMarkLabel}>{L('verseMarkLabel')}</p>
        <div style={styles.verseSheetColorRow}>
          {HIGHLIGHT_COLORS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              style={{ ...styles.verseSheetColorSwatch, background: c.swatch, ...(currentColor === c.id ? styles.verseSheetColorSwatchActive : {}) }}
              onClick={() => onChooseColor(c.id)}
              aria-label={L('verseColorPosition', { n: i + 1 })}
              aria-pressed={currentColor === c.id}
            />
          ))}
          <button type="button" style={styles.verseSheetColorRemove} onClick={onRemove} aria-label={L('verseColorRemove')}>
            <AppIcon name="X" size={16} color="var(--bento-t2)" />
          </button>
        </div>

        <div style={styles.verseSheetActionsGrid}>
          <button type="button" style={styles.verseSheetActionCard} onClick={onAnnotate}>
            <AppIcon name="Bookmark" size={17} strokeWidth={1.9} color="var(--bento-ink)" />
            <span>{L('verseAnnotate')}</span>
          </button>
          <button type="button" style={styles.verseSheetActionCard} onClick={onCopy}>
            <AppIcon name="Copy" size={17} strokeWidth={1.9} color="var(--bento-ink)" />
            <span>{L('verseCopy')}</span>
          </button>
        </div>
        <button type="button" style={styles.verseSheetActionCardWide} onClick={onShare}>
          <AppIcon name="Upload" size={17} strokeWidth={1.9} color="var(--bento-ink)" />
          <span>{L('verseShare')}</span>
        </button>

        {hasAI && (
          <button type="button" style={styles.verseSheetAskCard} onClick={onAsk}>
            <span style={styles.verseSheetAskDiamondWrap}><span style={styles.verseSheetAskDiamond} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={styles.verseSheetAskTitle}>{L('verseAskTitle')}</span>
              <span style={styles.verseSheetAskSub}>{L('verseAskSub')}</span>
            </span>
            <AppIcon name="ArrowRight" size={16} color="var(--bento-accent)" />
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}

// Copiar (39g, pacote 39) — folha sobre a leitura, mesma família visual
// de 39e (dentro do MESMO backdrop escurecido — ver o call site: 39e e
// 39g nunca aparecem juntas, uma troca a outra). "Copiar não é um toque
// cego: a folha mostra exatamente o que vai ser colado" — cada formato
// já com a pré-visualização do texto real, a versão sempre junto quando
// a referência entra. Busca o próprio texto (não recebe pronto) porque
// pode ser aberta reabrindo um grifo salvo, sem seleção nova nenhuma.
function VerseCopySheet({ lang, heroBook, heroBookEn, selection, editingHighlight, onClose, onCopy }) {
  const L = (k, vars) => t(`reading.${k}`, vars, lang)
  const [format, setFormat] = useState(getLastCopyFormat)
  const [copied, setCopied] = useState(false)
  const [quoteText, setQuoteText] = useState('')

  const chapter = editingHighlight?.chapter ?? selection?.chapter
  const verses = editingHighlight ? editingHighlight.verses : (selection ? [...selection.verses].sort((a, b) => a - b) : [])
  const versesKey = verses.join(',')
  const refText = `${lang === 'en' ? heroBookEn : heroBook} ${chapter}:${formatVerseRanges(verses)}`
  const versionShort = findBibleVersion(getSelectedVersionId(lang))?.short ?? ''

  useEffect(() => {
    if (!chapter || !versesKey) { setQuoteText(''); return }
    let cancelled = false
    const versionId = getSelectedVersionId(lang)
    const bookKey = lang === 'en' ? heroBookEn : heroBook
    fetchBookText(versionId, bookKey).then(chapters => {
      if (cancelled) return
      const chapterData = chapters[String(chapter)]
      if (!chapterData) { setQuoteText(''); return }
      setQuoteText(versesKey.split(',').map(v => chapterData.verses[v] ?? '').join(' ').replace(/\n/g, ' '))
    }).catch(() => { if (!cancelled) setQuoteText('') })
    return () => { cancelled = true }
  }, [lang, heroBook, heroBookEn, chapter, versesKey])

  // ~3s e a confirmação some sozinha; a folha inteira fecha junto
  // ("confirma e fecha", README) — sem botão de fechar próprio, o
  // resultado da ação É o encerramento.
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copied])

  function handleCopyPress() {
    onCopy(format)
    setCopied(true)
  }

  const FORMATS = [
    { id: 'full', label: L('copyFormatFull'), preview: quoteText ? formatCopyText('full', quoteText, refText, versionShort) : '' },
    { id: 'textOnly', label: L('copyFormatTextOnly'), preview: quoteText ? formatCopyText('textOnly', quoteText, refText, versionShort) : '' },
    { id: 'refOnly', label: L('copyFormatRefOnly'), preview: formatCopyText('refOnly', quoteText, refText, versionShort) },
  ]

  return createPortal(
    <div style={styles.verseSheetBackdrop} onClick={onClose}>
      <div style={styles.verseSheet} onClick={e => e.stopPropagation()}>
        <div style={styles.verseSheetHandleWrap}><div style={styles.verseSheetHandle} /></div>
        <p style={copyStyles.title}>{L('copyTitle')}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {FORMATS.map(f => {
            const active = format === f.id
            return (
              <button key={f.id} type="button" style={{ ...copyStyles.formatCard, ...(active ? copyStyles.formatCardActive : {}) }} onClick={() => setFormat(f.id)}>
                <div style={copyStyles.formatHeaderRow}>
                  <span style={{ ...copyStyles.formatLabel, color: active ? 'var(--bento-accent)' : 'var(--bento-t4)' }}>{f.label}</span>
                  {active && <AppIcon name="Check" size={15} strokeWidth={2.6} color="var(--bento-accent)" />}
                </div>
                <p style={{ ...copyStyles.formatPreview, color: active ? '#fff' : 'var(--bento-ink)' }}>{f.preview}</p>
              </button>
            )
          })}
        </div>

        <button type="button" style={copyStyles.copyBtn} onClick={handleCopyPress}>
          <AppIcon name="Copy" size={16} strokeWidth={2.2} color="var(--bento-ink)" />
          {L('copyBtn')}
        </button>

        {copied && (
          <div style={copyStyles.confirmPill}>
            <AppIcon name="Check" size={15} strokeWidth={2.6} color="var(--bento-accent)" />
            {L('copiedConfirm')}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

const copyStyles = {
  title: { fontFamily: 'var(--font-bento)', fontSize: 20, fontWeight: 800, color: 'var(--bento-ink)', margin: '4px 0 18px' },
  formatCard: { width: '100%', textAlign: 'left', borderRadius: 20, border: 'none', background: '#fff', padding: '14px 16px', cursor: 'pointer' },
  formatCardActive: { background: 'var(--bento-ink)' },
  formatHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  formatLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' },
  formatPreview: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.45, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  copyBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 54, borderRadius: 18, border: 'none',
    background: 'var(--bento-accent)', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)',
  },
  confirmPill: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 48, borderRadius: 16, marginTop: 10,
    background: 'var(--bento-ink)', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: '#fff',
  },
}

// Folha de resposta da IA sobre o trecho (10b, reskin Bento) — cobre ~75%
// da tela, raio superior 34px, fundo --bento-ink. O cartão branco no topo
// (recorte do próprio trecho perguntado, com o texto selecionado destacado)
// é auto-contido nesta folha — não depende de rolar a tela de trás pra
// mostrar o versículo certo, funciona não importa onde a leitura estava
// parada quando a pergunta foi feita.
//
// TimeUpSheet (turno 35, Bloco 3 — 35g) — folha por cima da leitura,
// disparada pelo "Concluir" quando sobrou tempo no relógio (35f) e a
// preferência "perguntar se quero continuar" está ligada. Sem botão de
// fechar/overlay clicável de propósito — a pessoa escolhe uma das duas
// ações, não "cancela" (as duas fecham a folha; não existe um terceiro
// caminho "deixa pra lá", ver HANDOFF-35-meu-plano.md, 35g).
function TimeUpSheet({ lang, remainingSeconds, finishedTitle, nextTitle, onContinue, onFinishHere }) {
  const L = (k, vars) => t(`reading.${k}`, vars, lang)
  return (
    <div style={sheetStyles.overlay}>
      <div style={sheetStyles.sheet}>
        <div style={sheetStyles.grabber} />
        <div style={sheetStyles.labelRow}>
          <span style={sheetStyles.diamond} />
          <p style={sheetStyles.label}>{L('timeUpLabel', { time: formatClock(remainingSeconds) })}</p>
        </div>
        <p style={sheetStyles.title}>{L('timeUpTitle', { title: finishedTitle })}</p>
        <p style={sheetStyles.question}>{L('timeUpQuestion')}</p>

        <button style={sheetStyles.continueCard} onClick={onContinue}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={sheetStyles.continueTitle}>{L('continueReading')}</p>
            <p style={sheetStyles.continueSub}>{nextTitle ? L('continueReadingSub', { next: nextTitle }) : L('continueReadingSubEnd')}</p>
          </div>
          <AppIcon name="ArrowRight" size={17} color="var(--bento-accent)" />
        </button>

        <button style={sheetStyles.finishCard} onClick={onFinishHere}>
          <p style={sheetStyles.finishTitle}>{L('finishHere')}</p>
          <p style={sheetStyles.finishSub}>{L('finishHereSub')}</p>
        </button>

        <p style={sheetStyles.footerNote}>{L('timeUpFooter')}</p>
      </div>
    </div>
  )
}

const sheetStyles = {
  overlay: { position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,.35)' },
  sheet: { width: '100%', background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', padding: '10px 20px calc(24px + var(--safe-bottom))' },
  grabber: { width: 36, height: 4, borderRadius: 99, background: 'var(--bento-line)', margin: '0 auto 18px' },
  labelRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  diamond: { width: 9, height: 9, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  label: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  title: { fontFamily: 'var(--font-bento)', fontSize: 20, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 8px' },
  question: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 20px' },
  continueCard: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', border: 'none', borderRadius: 24,
    background: 'var(--bento-ink)', padding: '18px 20px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-bento)', marginBottom: 10,
  },
  continueTitle: { fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 4px' },
  continueSub: { fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.6)', margin: 0 },
  finishCard: {
    display: 'block', width: '100%', border: 'none', borderRadius: 24, background: 'var(--bento-card)',
    padding: '18px 20px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-bento)', marginBottom: 16,
  },
  finishTitle: { fontSize: 16, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 4px' },
  finishSub: { fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  footerNote: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t4)', margin: 0 },
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
          <AppIcon name="ArrowUp" size={16} color="var(--bento-ink)" />
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

const styles = {

  // ── Contexto antes do capítulo (10c, reskin Bento) ──
  contextScreen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  contextHeader: { flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  contextBackBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  contextHeaderTitle: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  contextHeaderSub: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: '3px 0 0' },
  contextBody: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  contextDarkCard: { borderRadius: 28, background: 'var(--bento-ink)', padding: 22 },
  contextAiLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  contextAiDiamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  contextAiLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  contextRecap: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 500, lineHeight: 1.65, color: 'rgba(255,255,255,.9)', textWrap: 'pretty', margin: '0 0 18px' },
  contextSkeletonLine: { display: 'block', height: 15, borderRadius: 6, background: 'rgba(255,255,255,.14)' },
  contextSubBlock: { flex: 1, minWidth: 0, borderRadius: 16, background: 'rgba(255,255,255,.06)', padding: '13px 14px' },
  contextSubBlockLabel: { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.38)', margin: '0 0 6px' },
  contextSubBlockValue: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, color: '#fff', margin: 0, minHeight: '1.35em' },
  contextWatchCard: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  contextWatchLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  contextWatchHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 14px' },
  contextWatchRow: { display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 0', borderBottom: '1px solid var(--bento-line)' },
  contextWatchDot: { width: 7, height: 7, borderRadius: 99, background: 'var(--bento-accent)', marginTop: 5, flexShrink: 0 },
  contextWatchText: { flex: 1, fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-ink)', margin: 0 },
  contextFooter: { flex: 'none', padding: '12px 20px calc(20px + var(--safe-bottom))' },
  contextBeginBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-bento)', fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  contextSkipBtn: { width: '100%', border: 'none', background: 'none', padding: 0, marginTop: 12, fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-t4)', textAlign: 'center', cursor: 'pointer' },

  // "Relembre onde a história parou" — botão discreto em cima do texto
  // (ver ChapterRecallSheet), mesmo losango laranja de sempre pra
  // sinalizar "isso é gerado" sem repetir o card inteiro aqui.
  recallBtn: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 9, height: 44, borderRadius: 16, border: 'none',
    background: 'var(--bento-card)', padding: '0 16px', cursor: 'pointer',
    fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'var(--bento-t2)', textAlign: 'left',
  },
  recallBtnDiamond: { width: 8, height: 8, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  recallErrorText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)' },

  // ── Leitura imersiva (redesign 1b, reskin Bento — tela 4a) ──
  readerHeader: {
    position: 'sticky', top: 0, zIndex: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 20px 14px', background: 'var(--bento-bg)',
    transition: 'transform .2s ease-out',
  },
  // Pílula do relógio de leitura — substitui os ícones de Ferramentas no
  // cabeçalho quando o relógio está ativo (a folha de Ferramentas continua
  // acessível pelo botão do rodapé). O componente em si (StepTimerPill,
  // cronômetro unificado 2026-09-21) já traz seu próprio estilo — só a
  // barrinha de progresso abaixo do cabeçalho continua definida aqui.
  clockElapsedTrack: { height: 4, background: 'rgba(0,0,0,.07)', flexShrink: 0 },
  clockElapsedFill: { height: '100%', background: 'var(--bento-accent)', transition: 'width 1s linear' },
  readerHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  readerHeaderRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  readerIconBtn: {
    width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  // Chip escuro tocável "{Livro} {capítulo}" (quadro 4a) — abre o seletor
  // de capítulo (18b). readerHeaderSub (versão + posição no livro) é dado
  // real fora do quadro, mantido como legenda abaixo do chip.
  readerChapterChip: {
    display: 'flex', alignItems: 'center', gap: 8, height: 34, maxWidth: '100%',
    border: 'none', borderRadius: 12, background: 'var(--bento-ink)', padding: '0 12px 0 14px', cursor: 'pointer',
  },
  readerChapterChipText: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  readerHeaderSub: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.2, margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  readerTextCardWrap: { padding: '0 20px 4px' },
  readerTextCard: { background: 'var(--bento-card)', borderRadius: 28, padding: '26px 24px' },
  // Leitura livre (B3): cartão de raio 26, respiro 24/24/26; o respiro de
  // cima vem do topo (os 14px abaixo do fio) e o de baixo, do rodapé.
  readerTextCardWrapFree: { padding: '0 20px' },
  readerTextCardFree: { background: 'var(--bento-card)', borderRadius: 26, padding: '24px 24px 26px' },
  readerFooter: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 'min(var(--max-width), 560px)', zIndex: 90,
    padding: '0 20px calc(12px + var(--safe-bottom))',
    background: 'var(--bento-bg)',
    display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12,
  },
  readerFooterRow: { display: 'flex', gap: 10 },
  // Camada do grupo (quadro 17c).
  groupBtn: { height: 34, borderRadius: 12, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', cursor: 'pointer', flexShrink: 0 },
  groupBtnAvatar: { width: 16, height: 16, borderRadius: 99, border: '1.5px solid var(--bento-ink)', boxSizing: 'border-box', display: 'block' },
  groupBtnText: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, lineHeight: 1, color: '#fff' },
  verseGroupMarked: { borderBottom: '2.5px dotted var(--bento-accent)', paddingBottom: 1 },
  groupChipWrap: { margin: '-10px 0 18px' },
  groupChip: { display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, borderRadius: 99, background: 'var(--bento-line)', padding: '0 12px 0 6px', border: 'none', cursor: 'pointer' },
  groupChipAvatar: { width: 20, height: 20, borderRadius: 99, border: '1.5px solid var(--bento-line)', boxSizing: 'border-box', display: 'block' },
  groupChipText: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' },
  groupChipNotes: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)' },
  groupSharers: { margin: '8px 0 0', borderLeft: '3px solid var(--bento-accent)', padding: '2px 0 2px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  groupSharerNote: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)', margin: 0 },
  groupLayerCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  groupLayerTitle: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 3px' },
  groupLayerSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },
  groupLayerSwitch: { flexShrink: 0, width: 46, height: 28, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  groupLayerThumb: { width: 22, height: 22, borderRadius: 99 },
  readerToolsBtn: {
    flex: 1, height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-card)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer',
  },
  readerDoneBtn: {
    flex: 1.35, height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer',
  },
  toolsExtraBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
    border: 'none', borderRadius: 16, background: 'var(--bento-ink)',
    padding: '14px 16px', cursor: 'pointer', fontFamily: 'var(--font-bento)',
    fontSize: 13.5, fontWeight: 800, color: '#fff',
  },
  toolsExtraBtnDiamondWrap: { display: 'flex', flexShrink: 0 },
  toolsExtraBtnDiamond: { width: 11, height: 11, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2 },
  panel:       { background: 'var(--bento-card)', borderRadius: 20, padding: 16 },
  panelBookLabel:{ fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, color: 'var(--bento-accent)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  panelText:   { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.55 },
  contextSections:    { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bento-line)', display: 'flex', flexDirection: 'column', gap: 11 },
  contextSectionTitle:{ fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 3 },
  panelLocationIcon:{ width: 38, height: 38, borderRadius: 11, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  panelLocationName:{ fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 2 },
  panelBullet: { width: 5, height: 5, borderRadius: '50%', background: 'var(--bento-accent)', flexShrink: 0, marginTop: 6 },
  notesTextarea:{ width: '100%', border: 'none', borderRadius: 12, padding: '10px 12px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-ink)', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: 10, background: 'var(--bento-line)' },
  notesSaveBtn:{ width: '100%', background: 'var(--bento-accent)', border: 'none', borderRadius: 12, padding: 11, fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  reflectionTip:  { background: 'var(--bento-sand)', borderRadius: 11, padding: 11, fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-sand-ink)', lineHeight: 1.5 },
  reflectionNumber:{ width: 20, height: 20, borderRadius: '50%', background: ROUTINE_STEP_COLORS.reflection, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  bibleTextVersionRow:  { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  bibleTextVersionBtn:  { border: 'none', background: 'var(--bento-line)', borderRadius: 20, padding: '6px 12px', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  bibleTextVersionBtnActive: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },
  // ── Variantes usadas só pela leitura imersiva (mesmos tokens Bento dos 4
  // estilos acima — a diferença entre elas é só de layout/margem, não mais
  // de paleta; ver comentário em cada uma). Valores extraídos do bloco
  // id="4a" do HTML do handoff.
  // Sem a linha divisória/padding do modo antigo: o bloco branco já é o
  // limite do capítulo (quadro 4a).
  bibleTextChapterBento: { marginBottom: 16 },
  bibleTextChapterLabelBento: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, lineHeight: 1, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 18px' },
  // Atribuição exigida pela licença da versão (ver bibleVersions.js) — não
  // está no quadro 4a, mas não pode sair; fica discreta, nos tokens Bento.
  bibleTextAttributionBento: { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 500, color: 'var(--bento-t4)', lineHeight: 1.5, marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--bento-line)', fontStyle: 'italic' },
  bibleTextBodyBento:   { fontFamily: 'var(--font-bento)', fontSize: 18.5, fontWeight: 500, color: 'var(--bento-ink)', lineHeight: 1.72, margin: '0 0 18px', textWrap: 'pretty' },
  bibleTextVerseNumBento: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, color: 'var(--bento-accent)', verticalAlign: 'super' },

  verseTapTarget:  { cursor: 'pointer' },
  // Trecho em foco enquanto a folha de 39e está aberta — hex exatos do
  // HANDOFF (39e: "realce #FFE3C9 mais um contorno laranja de 2px"),
  // trocou o azul antigo (--bento-select) no Bloco 3.
  verseSelectedBento: { background: '#FFE3C9', borderRadius: 4, outline: '2px solid var(--bento-accent)' },
  verseAnnotatedUnderline: { textDecorationLine: 'underline', textDecorationColor: 'rgba(0,0,0,.38)', textDecorationThickness: 1.5, textUnderlineOffset: 3 },

  // Chat com IA sobre o texto (ver AiChatPanel) — flutua por cima da
  // leitura (ver aiChatOverlay* mais abaixo) em vez de abrir um card
  // dentro do fluxo da página, pra não tirar a pessoa de onde estava lendo.
  // Bolhas reaproveitam as mesmas cores de botão/marca já usadas no resto
  // do app (--grad-primary pra "eu"/usuário, --g1 neutro pra IA), nada de
  // paleta nova.
  aiChatBody:      { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
  aiChatScopeNote: { fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.4, margin: '0 0 10px', paddingBottom: 10, borderBottom: '0.5px solid var(--bento-line)', flexShrink: 0 },
  aiChatList:      { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 10 },
  aiChatEmptyHint: { fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '14px 4px' },
  aiChatBubble:    { maxWidth: '85%', padding: '9px 12px', borderRadius: 14, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  aiChatBubbleUser:{ alignSelf: 'flex-end', background: 'var(--bento-accent)', color: 'var(--bento-ink)', borderBottomRightRadius: 4 },
  aiChatBubbleAi:  { alignSelf: 'flex-start', background: 'var(--bento-line)', color: 'var(--bento-ink)', borderBottomLeftRadius: 4 },
  aiChatBubbleTyping: { color: 'var(--bento-t3)', fontStyle: 'italic' },
  aiChatInputRow:  { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
  aiChatInput:     { flex: 1, border: '0.5px solid var(--bento-line)', borderRadius: 20, padding: '10px 14px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)' },
  aiChatSendBtn:   { width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  errorText:       { fontSize: 11.5, fontWeight: 600, color: 'var(--bento-accent)', marginBottom: 8, flexShrink: 0 },
  aiChatLimitCounter: { fontSize: 10, fontWeight: 500, color: 'var(--bento-t4)', textAlign: 'right', margin: '5px 2px 0', flexShrink: 0 },

  // Janela flutuante do chat — "nuvem" pedida: aparece por cima da leitura
  // (ancorada embaixo, tipo bandeja de mensagens), sem tirar a pessoa da
  // posição de rolagem em que estava. Mesmo truque de centralização de
  // .bottom-nav/.aiFabWrap, portada pro <body> (ver comentário no JSX
  // sobre zoom quebrar position:fixed dentro de .app-content-inner quando
  // "texto grande" está ligado).
  aiChatOverlayBackdrop: { position: 'fixed', inset: 0, background: 'rgba(18,18,18,.32)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  aiChatOverlayWindow: { width: '100%', maxWidth: 'var(--max-width)', height: '72vh', maxHeight: 640, background: '#fff', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  aiChatOverlayHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid var(--bento-line)', flexShrink: 0 },
  aiChatOverlayTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)' },
  aiChatOverlayIcon: { width: 28, height: 28, borderRadius: 9, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  aiChatOverlayClose: { width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  aiChatOverlayBody: { flex: 1, minHeight: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column' },

  // ── Folha do versículo selecionado (39e, pacote 39) ──
  // Hex exatos do HANDOFF: escurecido rgba(26,23,20,.45), alça #D6CFC7,
  // raio 32 no topo. zIndex acima do rodapé (90) e do FAB de IA.
  verseSheetBackdrop: { position: 'fixed', inset: 0, zIndex: 201, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  verseSheet: { width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)', borderRadius: '32px 32px 0 0', padding: '0 20px calc(20px + var(--safe-bottom))', maxHeight: '80vh', overflowY: 'auto' },
  verseSheetHandleWrap: { display: 'flex', justifyContent: 'center', padding: '14px 0 6px' },
  verseSheetHandle: { width: 44, height: 5, borderRadius: 99, background: '#D6CFC7' },
  verseSheetTitle: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', margin: '4px 0 2px' },
  verseSheetSub: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 18px' },
  verseSheetMarkLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  // Cores sem nome nenhum no rótulo — só a12y por posição (verseColorPosition).
  verseSheetColorRow: { display: 'flex', gap: 8, marginBottom: 18 },
  verseSheetColorSwatch: { flex: 1, height: 46, borderRadius: 14, border: 'none', cursor: 'pointer', padding: 0 },
  verseSheetColorSwatchActive: { outline: '2px solid var(--bento-ink)', outlineOffset: -2 },
  verseSheetColorRemove: { width: 46, height: 46, flexShrink: 0, borderRadius: 14, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  verseSheetActionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  verseSheetActionCard: {
    display: 'flex', alignItems: 'center', gap: 10, height: 58, borderRadius: 18, border: 'none', background: '#fff',
    padding: '0 16px', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)',
  },
  verseSheetActionCardWide: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 58, borderRadius: 18, border: 'none', background: '#fff',
    padding: '0 16px', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', marginBottom: 14,
  },
  // "Perguntar sobre este versículo" — o único item colorido da folha.
  verseSheetAskCard: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', borderRadius: 20, border: 'none', background: 'var(--bento-ink)',
    padding: '16px 16px', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left',
  },
  verseSheetAskDiamondWrap: { display: 'flex', flexShrink: 0 },
  verseSheetAskDiamond: { width: 11, height: 11, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2 },
  verseSheetAskTitle: { display: 'block', fontSize: 14.5, fontWeight: 800, color: '#fff', marginBottom: 3 },
  verseSheetAskSub: { display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.6)' },
}
