import { Fragment, useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { groupSessionsByBook } from '../utils/groupByBook'
import { BOOK_INFO } from '../data/bookInfo'
import { BOOK_INFO_EN } from '../data/bookInfo.en'
import { getNotes, saveNote, noteKeyFor, noteTextOf } from '../notes/notesStore'
import { getHighlights, saveHighlight, updateHighlightText, hideHighlight } from '../highlights/highlightsStore'
import { getMessages, sendMessage, getDailyLimitStatus } from '../aiChat/aiChatStore'
import { formatVerseRanges } from '../utils/verseRanges'
import { askAboutPassage, fetchPassageSuggestions, reportPassageAnswer } from '../aiChat/passageQuestionStore'
import { getChapterContextEnabled, isChapterContextSeen, markChapterContextSeen, fetchChapterContext } from '../aiChat/chapterContextStore'
import { getAskEnabled } from '../aiChat/aiPreferencesStore'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId, setSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { computeBookChapterCounts } from '../utils/progress'
import { BIBLE_VERSIONS, findBibleVersion } from '../data/bibleVersions'
import { setLastReadPosition } from '../reading/lastReadPositionStore'
import { setFreeReadingPosition } from '../bible/freeReadingPositionStore'
import { addReadingSeconds } from '../reading/readingTimeStore'
import { logSessionSeconds } from '../metrics/sessionDurationStore'
import { getReadingClockPrefs } from '../reading/readingClockPrefsStore'
import { addReadingPaceSession } from '../reading/readingPaceStore'
import { getGroupMarks, getGroupMarksVisible, setGroupMarksVisible, postToRoom } from '../groups/chapterRoomStore'
import { getGroupMemberCounts } from '../groups/groupsStore'
import { collectTagVocabulary } from '../notes/noteTags'
import { avatarPaletteFor } from './ChapterRoomScreen'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { getRecentChapters, addRecentChapter } from '../reading/recentChaptersStore'
import { dateKey } from '../utils/dateKey'
import { HIGHLIGHT_COLORS, DEFAULT_HIGHLIGHT_COLOR, highlightColorBg } from '../data/highlightColors'
import { verseSelectionLabel } from '../bible/verseSelectionLabel'
import { getLastCopyFormat, setLastCopyFormat } from '../bible/copyFormatPrefs'
import { formatCopyText } from '../bible/formatCopyText'
import { renderVerseCardImage, shareVerseCardImage, downloadVerseCardImage, VERSE_CARD_STYLES, VERSE_CARD_FORMATS } from '../bible/verseCardImage'
import { useIsDesktop } from '../utils/useIsDesktop'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import BibleVersionChip from '../components/bible/BibleVersionChip'
import RecentChaptersRow from '../components/RecentChaptersRow'
import BibleAudioPlayer from '../components/BibleAudioPlayer'
import GuidedFlowBanner from '../components/GuidedFlowBanner'
import RoutineStepSwitcher from '../components/RoutineStepSwitcher'
import ToolsSheet from '../components/ToolsSheet'
import ChapterPickerSheet from '../components/ChapterPickerSheet'

// "6:20" — mm:ss do relógio do passo (26b), sem zero à esquerda no minuto
// (mesmo formato usado em 26a/26h/26c pro cronômetro de cada passo).
function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const sec = Math.floor(totalSeconds % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function ReadingBlockView({ session, authUser, onNavigate, blockId, blocks, sessionsByBlock, mode = 'session', completedSet, onToggleSession, onToggleChapter, initialSessionId, initialTextOpen, onBack, onGoToReflection, onJumpToChapter, onExitGuided, onOpenGroupRoom, embedded = false }) {
  const { lang, hasPremium, hasAI } = session
  const guidedReading = mode === 'session' && session.guided?.step === 'reading' ? session.guided : null
  // Leitura imersiva (redesign 1b) — leitura guiada de tela cheia: cabeçalho
  // compacto que some ao rolar, texto no topo sem card, rodapé fixo com
  // player + Ferramentas + Concluir, sem barra de navegação. Turno 39,
  // Bloco 2: passou a valer TAMBÉM pra navegação livre da aba Bíblia
  // (mode 'browse') quando não está embutida — 39d é a mesma casca
  // imersiva, só com o rodapé/cabeçalho ajustados via `freeReading`
  // abaixo. `embedded` (usado hoje só por BookChapterScreen pro "toque
  // abre" antigo) segue sendo a única saída dela.
  const freeReading = mode === 'browse' && !embedded
  const immersive = !embedded
  // Mesmo breakpoint do master-detail em index.css (.rb-body/.rb-master/
  // .rb-detail, min-width: 768px) — usado só em modo 'browse' pra decidir
  // ONDE o texto do capítulo aparece (ver comentário perto de onde é usado).
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
  const bookGroups = groupSessionsByBook(sessions)
  const bookInfoSource = lang === 'en' ? BOOK_INFO_EN : BOOK_INFO

  const scrollRef = useRef(null)
  // Card branco do texto do capítulo em foco (readerTextCard) — usado só
  // pra medir o progresso de leitura do capítulo (quadro 26b, ver o efeito
  // de scroll abaixo), não pra rolar até ele.
  const textCardRef = useRef(null)
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
  // SÓ funciona corretamente porque quem chama este componente usa
  // key={blockId} (ver JourneyScreen.jsx) — sem isso, pular pra um livro
  // DIFERENTE com a tela já montada (ex: tocar um card de "lido
  // recentemente") manteria esse estado (e o de BookGroup mais abaixo)
  // com o id antigo, que por coincidência pode ser válido no bloco novo
  // (ids de sessão são só sequenciais dentro de cada bloco) — abriria o
  // capítulo errado sem nenhum erro visível.
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId ?? null)

  const heroSession = sessions.find(s => s.id === selectedSessionId) ?? autoHeroSession


  // Qual capítulo tem o texto aberto INLINE, direto na lista de livros —
  // só existe em modo 'browse' (navegação livre pela Bíblia). Diferente do
  // modo 'session', aqui o texto não mora no card de destaque lá em cima:
  // abre embaixo do próprio capítulo que foi tocado, ver SessionCard.
  // Fechado por padrão (nenhum capítulo pré-aberto) — ao tocar um livro do
  // zero, a pessoa vê os números dos capítulos e escolhe qual quer ler, em
  // vez de já cair lendo um escolhido pelo app. Exceção: initialTextOpen
  // (true só quando vem de um card de "lido recentemente", ver
  // RecentChaptersRow/openRecentChapter em JourneyScreen.jsx) — aí já cai
  // lendo o capítulo exato, sem repetir o passo de escolher de novo algo
  // que a pessoa já tinha escolhido antes.
  const [expandedChapterId, setExpandedChapterId] = useState(initialTextOpen ? initialSessionId : null)

  // Cards estilo "stories" dos últimos capítulos lidos (ver
  // RecentChaptersRow/recentChaptersStore.js) — precisa de estado próprio
  // (não só ler localStorage direto no render, como JourneyScreen.jsx faz)
  // porque É este componente que grava um capítulo novo na lista (efeito
  // abaixo); sem re-renderizar sozinho, o card recém-aberto só apareceria
  // na próxima vez que a tela montasse.
  const [recentChapters, setRecentChapters] = useState(getRecentChapters)

  // Lembra o último capítulo aberto na navegação livre (mode 'browse') —
  // só aqui, não no fluxo guiado da Rotina/Plano (mode 'session'), que já
  // tem seu próprio "onde parei" (a sessão "current" do plano). Alimenta os
  // cards de "lidos recentemente" (recentChaptersStore) — lastOpenedChapterStore
  // (o "Continuar leitura" irmão) saiu em 2026-09-07, redundante com
  // "Último texto lido" (lastReadPositionStore, grava nos dois modos).
  useEffect(() => {
    if (mode === 'browse' && expandedChapterId != null) {
      const openedSession = sessions.find(s => s.id === expandedChapterId)
      if (openedSession) {
        setRecentChapters(addRecentChapter({
          blockId: block.id,
          sessionId: openedSession.id,
          book: openedSession.book,
          bookEn: openedSession.bookEn,
          chapter: openedSession.chStart,
        }))
      }
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
    { key: 'ia',           icon: 'HelpCircle', label: t('reading.tagAskAi', undefined, lang) },
  ]

  // Na leitura guiada o texto está sempre aberto (redesign 1b) — Contexto/
  // Mapa/Notas/Curiosidades saíram do openPanel e vivem na folha Ferramentas.
  const [openPanel, setOpenPanel] = useState(mode !== 'browse' ? 'texto' : null)
  const [toolsOpen, setToolsOpen] = useState(false)
  // Seletor de capítulo (quadro 18b) — aberto pelo chip escuro do
  // cabeçalho. Mesma folha escura da IA, mas sem losango.
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false)
  // Cabeçalho da leitura imersiva some ao rolar pra baixo, volta ao rolar
  // pra cima (redesign 1b). scrollRef é o container que rola (ver JSX).
  const [readerHeaderHidden, setReaderHeaderHidden] = useState(false)
  const lastReaderScrollY = useRef(0)
  // Progresso de LEITURA do capítulo (quadro 26b — "a barra fina é o quanto
  // falta do CAPÍTULO, não do tempo") — quanto do card branco do texto
  // (textCardRef) já passou pelo topo da tela, 0 a 100. Reaproveita o MESMO
  // listener de scroll do cabeçalho que some/aparece, em vez de um 2º
  // listener, e recalcula na hora (onScroll() direto) sempre que o capítulo
  // muda, não só ao rolar.
  const [chapterProgressPct, setChapterProgressPct] = useState(0)
  useEffect(() => {
    if (!immersive) return
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      const y = el.scrollTop
      if (y > lastReaderScrollY.current + 8 && y > 56) setReaderHeaderHidden(true)
      else if (y < lastReaderScrollY.current - 8 || y < 24) setReaderHeaderHidden(false)
      lastReaderScrollY.current = y
      const textEl = textCardRef.current
      if (textEl) {
        const containerRect = el.getBoundingClientRect()
        const textRect = textEl.getBoundingClientRect()
        const textTop = el.scrollTop + (textRect.top - containerRect.top)
        const ratio = textRect.height > 0 ? (el.scrollTop + containerRect.height - textTop) / textRect.height : 0
        setChapterProgressPct(Math.max(0, Math.min(100, Math.round(ratio * 100))))
      }
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [immersive, heroSession?.id])

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
  const showReadingClock = immersive && !freeReading && ['fixed', 'chrono'].includes(session.activePlan?.kind) && heroSession.type !== 'reflection' && !!readingClockPrefs?.showOnReading
  const targetClockSeconds = Math.max(0, (session.plan.readingMinutes ?? 0) * 60)

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

  const clockDisplaySeconds = hasZeroed ? Math.max(0, stepElapsedSeconds - targetClockSeconds) : Math.max(0, targetClockSeconds - stepElapsedSeconds)

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

  // "Marcar como lido" (39d, rodapé da leitura livre) — diferente de
  // "Concluir" acima: não fecha sessão de plano nenhuma (não existe uma
  // aqui) nem vai pra Reflexão. Só grava o(s) capítulo(s) em chapters_read
  // com origem 'sessao' (mesmo onToggleChapter que o app já usa pra "lido
  // de verdade", a mesma ação que hoje mora dentro do texto — ver
  // BibleTextPanel), e volta pra grade (39c). "Entra no mapa, não no
  // plano" — Meu Plano nunca é tocado por este botão.
  function handleMarkFreeChapterRead() {
    if (heroSession.type !== 'reflection') {
      for (let ch = heroSession.chStart; ch <= heroSession.chEnd; ch++) onToggleChapter?.(heroSession, ch, true)
    }
    onBack?.()
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
        // Posição PRÓPRIA da leitura livre (39a, "Continuar a leitura
        // livre") — pacote 39. Sem versículo específico ainda aqui (o
        // rastro por versículo entra junto de 39e, quando existir
        // seleção de trecho na leitura livre); cai no padrão (1) da
        // store até lá.
        setFreeReadingPosition(s.book, s.bookEn, s.chStart, null)
      }
    } else if (openPanel === 'texto' && heroSession) {
      setLastReadPosition(heroSession.book, heroSession.chStart)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, expandedChapterId, openPanel, heroSession?.id])

  // Tempo de leitura (painel 12a, "horas de leitura acumulada") — conta só
  // enquanto um texto de capítulo está aberto E a aba está visível; segundos
  // com a aba escondida não entram. Descarrega em lotes de ~30s e ao fechar
  // (ver src/reading/readingTimeStore.js). O mesmo lote também vira uma
  // linha em session_seconds (passo 'reading') — é a fonte de "lendo" em
  // 30b; sem isso o acumulado de sempre existe mas não dá pra separar por
  // dia/passo nem calcular sessão média/horário mais comum.
  const readingActive = mode === 'browse'
    ? expandedChapterId != null
    : (openPanel === 'texto' && !!heroSession && heroSession.type !== 'reflection')
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
        logSessionSeconds('reading', pending).catch(() => {})
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

  // Chat de IA e janela de grifo flutuam por CIMA da leitura (portal pro
  // <body>, ver mais abaixo) — de propósito em estados PRÓPRIOS, separados
  // de openPanel: abrir um dos dois não pode fechar/trocar o que já estava
  // aberto embaixo (o texto do capítulo, Contexto, Notas...). Antes os três
  // dividiam o mesmo openPanel, então abrir a IA com o texto aberto (modo
  // 'session') trocava openPanel de 'texto' pra 'ia' — ao fechar a IA,
  // openPanel virava null (não voltava pra 'texto'), e o texto que a
  // pessoa estava lendo sumia da tela sozinho.
  const [aiChatOpen, setAiChatOpen] = useState(false)
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
    setOpenPanel(p => (mode !== 'browse' || p === 'texto') ? 'texto' : null)
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
  // filtro `!h.hidden` (highlightForVerse, highlightsInHero, o pontinho
  // de ChapterChips) parar de mostrar na hora.
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
  const [highlightSelection, setHighlightSelection] = useState(null) // { chapter, verses: Set<number> } | null
  const [highlightEditingId, setHighlightEditingId] = useState(null)
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
  const [highlightAnchorRect, setHighlightAnchorRect] = useState(null)
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
  // capítulo específico ainda não foi visto (ver chapterContextStore.js).
  // Decidido uma vez só, na montagem (não muda de novo enquanto esta
  // sessão de leitura estiver aberta, mesmo que o toggle mude no meio).
  // Offline nem tenta (implicação técnica 5 do adendo — degradação
  // explícita, sem tentativa de rede) — vai direto pro texto.
  const [contextGate, setContextGate] = useState(() => (
    immersive && heroSession.type !== 'reflection' && hasAI && getChapterContextEnabled()
      && !isChapterContextSeen(heroSession.book, heroSession.chStart, lang)
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
  function handleHighlightVerseClick(ch, v, rect) {
    if (!hasPremium) return // grifar/anotar é recurso Premium
    const existing = highlights?.find(h => !h.hidden && h.book === heroSession.book && h.chapter === ch && h.verses.includes(v))
    if (existing) {
      setHighlightEditingId(existing.id)
      setHighlightSelection(null)
      setWantsToAnnotate(false)
      setHighlightAnchorRect(rect ?? null)
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
    setHighlightAnchorRect(next ? (rect ?? null) : null)
    setSelectionMenuOpen(Boolean(next))
  }

  // Seleção de texto "de verdade" (arrastar o dedo/mouse como se fosse
  // copiar) — ver detecção em BibleTextPanel (escuta selectionchange e
  // resolve o intervalo de versículos pelos atributos data-chapter/
  // data-verse). Sempre substitui a seleção em andamento (não soma a um
  // grifo já aberto pra edição), mesmo espírito de handleHighlightVerseClick.
  function handleHighlightTextRange(ch, verses, rect) {
    if (!hasPremium) return // grifar/anotar é recurso Premium
    setHighlightEditingId(null)
    setHighlightSelection({ chapter: ch, verses })
    setWantsToAnnotate(false)
    setHighlightAnchorRect(rect ?? null)
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
    setHighlightAnchorRect(null)
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
    setHighlightAnchorRect(null)
  }

  function cancelHighlightCompose() {
    setHighlightSelection(null)
    setHighlightEditingId(null)
    setWantsToAnnotate(false)
    setHighlightAnchorRect(null)
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
  function closeCopySheet() {
    setCopySheetOpen(false)
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
    setHighlightAnchorRect(null)
  }

  const heroBooks = [{ name: heroSession.book, displayName: heroSession.bookEn, info: bookInfoSource[heroSession.book] }].filter(b => b.info)
  const heroTitle = lang === 'en' ? heroSession.titleEn : heroSession.title
  const heroPassage = lang === 'en' ? heroSession.passageEn : heroSession.passage
  const heroChapterSpan = heroSession.type === 'reflection' ? 0 : heroSession.chEnd - heroSession.chStart + 1
  const heroChapterWord = lang === 'en' ? (heroChapterSpan === 1 ? 'chapter' : 'chapters') : (heroChapterSpan === 1 ? 'capítulo' : 'capítulos')
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
  // Grifos já salvos dentro do alcance da sessão em destaque — mostrados na
  // janela flutuante de grifo quando ela abre sem nenhuma seleção em
  // andamento (ver FAB de lápis), pra dar acesso rápido a editar/apagar um
  // já feito sem precisar caçar o versículo de novo na lista.
  const highlightsInHero = heroSession.type === 'reflection' ? [] : (highlights?.filter(h => !h.hidden && h.book === heroSession.book && h.chapter >= heroSession.chStart && h.chapter <= heroSession.chEnd) ?? [])

  // Camada do grupo na leitura (quadro 17c): pontilhado laranja sob o
  // versículo marcado por outros do grupo + chip com a contagem. Só pra quem
  // está num grupo (primeiro grupo da pessoa), na leitura imersiva, e com a
  // chave "Ver marcações do grupo" ligada (rodapé). Só contagens por padrão;
  // nomes e notas só de quem tem perfil público (ver group_chapter_marks).
  const myGroup = session.myGroups?.[0] ?? null
  const [groupLayerOn, setGroupLayerOn] = useState(getGroupMarksVisible)
  const [groupMarks, setGroupMarks] = useState({})
  useEffect(() => {
    if (!immersive || !myGroup || !groupLayerOn || !heroSession || heroSession.type === 'reflection') { setGroupMarks({}); return }
    let cancelled = false
    const chapters = []
    for (let ch = heroSession.chStart; ch <= heroSession.chEnd; ch++) chapters.push(ch)
    Promise.all(chapters.map(ch => getGroupMarks(myGroup.groupId, heroSession.book, ch).then(m => [ch, m])))
      .then(entries => { if (!cancelled) setGroupMarks(Object.fromEntries(entries)) })
      .catch(err => console.error('Failed to load group marks', err))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immersive, myGroup?.groupId, groupLayerOn, heroSession?.id, heroSession?.book])
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

  // Cabeçalho + painéis (Contexto/Mapa/Notas/Curiosidades/Texto) — extraído
  // numa variável porque `embedded` (ver JourneyScreen.jsx: um livro
  // expandido dentro da própria lista de testamento, sem navegar) usa
  // exatamente o mesmo conteúdo, só SEM o wrapper de tela cheia (rb-enter/
  // scrollRef/rb-detail·rb-master) por fora. Sem essa variável, o mesmo
  // JSX teria que ser escrito duas vezes.
  const headerAndPanels = (
    <>
      {guidedReading && !embedded && !immersive && (
        <GuidedFlowBanner guided={guidedReading} lang={lang} onExit={onExitGuided} />
      )}
      {immersive ? (
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
                    <div style={freeReading ? styles.readerChapterChipFree : styles.readerChapterChip}><span style={freeReading ? styles.readerChapterChipTextFree : styles.readerChapterChipText}>{heroTitle}</span></div>
                  ) : (
                    <button style={freeReading ? styles.readerChapterChipFree : styles.readerChapterChip} onClick={() => setChapterPickerOpen(true)}>
                      <span style={freeReading ? styles.readerChapterChipTextFree : styles.readerChapterChipText}>{heroTitle}</span>
                      <AppIcon name="ChevronUp" size={11} strokeWidth={2.6} color="var(--bento-accent)" />
                    </button>
                  )}
                </div>
                {/* 39d não repete versão/posição embaixo do chip — a versão
                    ganhou seletor próprio à direita (abaixo) e "de quantos
                    capítulos" já mora no bloco de progresso de 39c. */}
                {!freeReading && <p style={styles.readerHeaderSub}>{readerHeaderSub}</p>}
              </div>
            </div>
            {showReadingClock ? (
              // Pílula do relógio (35f) — toca pra pausar/retomar; ao zerar
              // passa a contar pra cima, discreto, nunca bloqueia a leitura.
              <button
                style={{ ...styles.clockPill, ...(zeroFlash ? styles.clockPillFlash : {}) }}
                onClick={() => setClockPaused(p => !p)}
                aria-label={clockPaused ? t('reading.clockResume', undefined, lang) : t('reading.clockPause', undefined, lang)}
              >
                <AppIcon name={clockPaused ? 'Play' : 'Timer'} size={13} strokeWidth={2.4} color="var(--bento-accent)" />
                <span style={{ ...styles.clockPillText, ...(hasZeroed ? styles.clockPillTextOvertime : {}) }}>{formatClock(clockDisplaySeconds)}</span>
              </button>
            ) : freeReading ? (
              // Cabeçalho de 39d: sem chave de grupo nem ícone de áudio
              // duplicado (o player mora em Ferramentas) — só o seletor de
              // versão (vale pra aba inteira, por isso mora aqui) e o menu.
              <div style={styles.readerHeaderRight}>
                <BibleVersionChip lang={lang} versionId={versionId} onChange={handleChangeVersion} />
                <button onClick={() => setToolsOpen(true)} style={styles.readerIconBtn} aria-label={t('reading.toolsBtn', undefined, lang)}>
                  <AppIcon name="MoreVertical" size={16} color="var(--bento-ink)" />
                </button>
              </div>
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
          {/* Tarja "leitura livre" (39d) — logo abaixo do cabeçalho (esse sim
              sticky); ela mesma rola com o conteúdo, como no quadro. */}
          {freeReading && (
            <div style={{ padding: '0 20px 10px' }}>
              <span style={styles.freeReadingTag}>{t('reading.freeReadingTag', undefined, lang)}</span>
            </div>
          )}
          {showReadingClock && !readerHeaderHidden && (
            <div style={styles.clockElapsedTrack}>
              <div style={{ ...styles.clockElapsedFill, width: `${targetClockSeconds > 0 ? Math.min(100, Math.round((stepElapsedSeconds / targetClockSeconds) * 100)) : 0}%` }} />
            </div>
          )}
        </>
      ) : (
        <div style={styles.browseHeader}>
          {!embedded && (
            <button onClick={onBack} style={styles.browseBackBtn} aria-label="back">
              <AppIcon name="ArrowLeft" size={17} color="var(--bento-ink)" />
            </button>
          )}
          {mode !== 'browse' && (
            <p style={styles.browseHeaderCycle}>
              {isFreePlan ? blockName : `${blockName} · ${t('reading.sessionLabel', { n: heroSession.id }, lang)} ${lang === 'en' ? 'of' : 'de'} ${block.sessionsTotal}`}
            </p>
          )}
          {/* Embutido: o nome do livro já mora na linha da lista, fora deste
              componente (ver BookRow em JourneyScreen.jsx) — repetir aqui
              seria redundante. */}
          {!embedded && (
            <span style={styles.browseHeaderTitle}>{mode === 'browse' ? heroBookDisplayName : heroTitle}</span>
          )}
          {mode !== 'browse' && (
            <p style={styles.browseHeaderSub}>
              {heroSession.type === 'reflection' ? heroPassage : `${heroPassage} · ${heroChapterSpan} ${heroChapterWord}`}
            </p>
          )}
          <div style={styles.browseTagsRow}>
            {/* IA nunca entra aqui — tem seu próprio botão flutuante (FAB),
                em qualquer um dos dois modos; repetir na lista de abas
                seria a mesma coisa duas vezes. Notas exige Premium. */}
            {TAGS.filter(tag => tag.key !== 'ia' && (tag.key !== 'notas' || hasPremium)).map(tag => (
              <span
                key={tag.key}
                style={{ ...styles.browseTag, ...(openPanel === tag.key ? styles.browseTagActive : {}) }}
                onClick={() => setOpenPanel(p => (p === tag.key ? null : tag.key))}
              >
                <AppIcon name={tag.icon} size={12} /> {tag.label}{tag.key === 'notas' && hasSavedNote && <span style={styles.heroTagDot} />}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* Ouvir a Bíblia — player de áudio da navegação livre (fora de
          plano). Fica montado aqui no topo (não por capítulo) pra que o
          modo "contínuo" atravesse a troca de capítulo sem cortar o som.
          O contínuo vai até o fim do livro aberto (getNextSessionFor pode
          apontar pra outro livro/bloco, que não está renderizado nesta
          lista embutida — então limita ao mesmo livro). */}
      {/* 39d não tem player nenhum fora de Ferramentas (ver rodapé) — o
          quadro vai direto da tarja pro texto. */}
      {mode === 'browse' && !freeReading && expandedChapterId != null && heroSession.type !== 'reflection' && (() => {
        const nextInBook = (() => {
          const n = getNextSessionFor(heroSession)
          return n && n.book === heroSession.book ? n : null
        })()
        return (
          <div style={{ padding: '4px 8px 0' }}>
            <BibleAudioPlayer
              session={heroSession}
              lang={lang}
              hasNext={!!nextInBook}
              onAdvance={() => goToNextInline(heroSession)}
              allowPremiumVoice={hasPremium}
            />
          </div>
        )
      })()}
      {/* Cards de "lidos recentemente" — só na navegação livre de tela
          cheia, nunca embutido (não faz sentido por livro). No desktop
          moram aqui dentro de .rb-detail, que já é sticky por conta
          própria (CSS, ≥768px). No celular ficam de FORA daqui (ver logo
          abaixo, fora desta variável) — sticky só funciona dentro dos
          limites do próprio pai, e .rb-detail é curto (só o cabeçalho). */}
      {!embedded && mode === 'browse' && isDesktop && (
        <RecentChaptersRow chapters={recentChapters} lang={lang} onOpen={onJumpToChapter} sticky />
      )}
      {/* A marcação capítulo a capítulo do fluxo guiado antigo (ChapterChecklist,
          mode!=='browse' && !immersive) foi removida na varredura de
          identidade (Bloco 1) pelo mesmo motivo do bloco completeBtn/
          nextStepBtn acima: essa combinação nunca ocorre de verdade. */}

      {/* Seletor pra pular direto pra Oração/Reflexão sem voltar pra aba
          Rotina — só no fluxo guiado de tela cheia (a leitura livre não é
          "o passo de hoje" de coisa nenhuma, e embutido na aba Bíblia não
          tem esse contexto de rotina). Logo acima do texto de propósito —
          depois da lista de capítulos da sessão, não colado no cabeçalho. */}
      {!embedded && mode !== 'browse' && !immersive && heroSession.type !== 'reflection' && (
        <RoutineStepSwitcher
          session={session}
          activeStep="reading"
          onGoPrayer={() => onNavigate?.('prayer')}
          onGoStudy={() => onNavigate?.('studies')}
          onGoReflection={() => onNavigate?.('reflection')}
        />
      )}

      {/* "Relembre onde a história parou" (follow-up, turno 39) — em cima
          do texto, sempre que a leitura imersiva abre um capítulo de
          verdade (não reflexão). Mesmo par hasAI/toggle do contexto
          automático de 10c — é o mesmo conteúdo, só reaberto sob demanda. */}
      {immersive && heroSession.type !== 'reflection' && hasAI && getChapterContextEnabled() && (
        <div style={{ padding: '0 20px 4px' }}>
          <button type="button" style={styles.recallBtn} onClick={() => setRecallOpen(true)}>
            <span style={styles.recallBtnDiamond} />
            <span>{t('context.recallButton', undefined, lang)}</span>
          </button>
        </div>
      )}
      {/* Painel de texto / contexto / mapa / notas / curiosidades da
          sessão atual. Na leitura imersiva, Contexto/Mapa/Notas/Curiosidades
          vivem na folha Ferramentas (ToolsSheet, mais abaixo) — aqui fica só
          o texto. */}
      {openPanel === 'notas' && !immersive && (
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
          caçar o próximo capítulo na lista estreita ao lado. Embutido
          (embedded) nunca usa esse caminho — não tem coluna "mestre"
          separada, então o texto sempre aparece junto do capítulo na
          lista (ver isDesktop abaixo forçado a false pra embedded). */}
      {(() => {
        // Turno 39, Bloco 2: freeReading (39d, sempre de tela cheia, nunca
        // só desktop) também mostra o texto aqui em cima — deixou de
        // depender de isDesktop, que só fazia sentido pro layout
        // mestre/detalhe antigo (hoje sem nenhum outro caminho vivo: mode
        // 'browse' sem embedded só existe nesta tela).
        const browseTextInHero = !embedded && mode === 'browse' && (isDesktop || freeReading) && expandedChapterId != null
        const nextForHero = browseTextInHero && !freeReading ? getNextSessionFor(heroSession) : null
        return (mode !== 'browse' && openPanel === 'texto') || browseTextInHero ? (
          // Leitura imersiva (reskin Bento, tela 4a): bloco branco próprio
          // (raio 28, padding 26/24) sobre o fundo creme da tela, só com
          // respiro lateral de 20px. Nos outros casos, margem lateral bem
          // menor que os painéis de lista pra dar coluna de leitura mais larga.
          <div style={immersive ? styles.readerTextCardWrap : { padding: '0 6px 4px' }}>
            {(() => {
              const panel = (
                <BibleTextPanel
                  session={heroSession}
                  lang={lang}
                  immersive={immersive}
                  completedSet={completedSet}
                  onToggleChapter={onToggleChapter}
                  highlights={highlights}
                  highlightSelection={highlightSelection}
                  onVerseNumberClick={handleHighlightVerseClick}
                  onTextSelectionRange={handleHighlightTextRange}
                  groupMarks={immersive && myGroup && groupLayerOn ? groupMarks : null}
                  versionId={freeReading ? versionId : undefined}
                  onChangeVersion={freeReading ? handleChangeVersion : undefined}
                />
              )
              return immersive ? <div ref={textCardRef} style={styles.readerTextCard}>{panel}</div> : panel
            })()}
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

      {/* O antigo botão "Marcar/desmarcar sessão" + "Ir para a reflexão"
          (fluxo guiado pré-Bento, mode!=='browse' && !immersive) foi
          removido daqui na varredura de identidade (Bloco 1): essa
          combinação nunca ocorre de fato — todo mode==='session' passa por
          embedded===false, o que já torna immersive true (ver definição de
          `immersive` no topo do componente) — então o bloco nunca
          renderizava. Na leitura imersiva de verdade isso é o botão
          "Concluir leitura" do rodapé fixo (ver readerFooter, mais abaixo). */}
    </>
  )

  // Lista de livros do bloco (agrupados; só o livro em leitura já vem
  // expandido) — extraída pelo mesmo motivo de headerAndPanels acima:
  // embedded reaproveita exatamente essa lista, só sem virar a coluna
  // "mestre" (.rb-master) de tela cheia.
  const bookListItems = bookGroups.map(group => (
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
      isDesktop={!embedded && isDesktop}
      hasNoteFor={hasNoteFor}
      highlights={highlights}
      highlightSelection={highlightSelection}
      onHighlightVerseClick={handleHighlightVerseClick}
      onHighlightTextRange={handleHighlightTextRange}
    />
  ))

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
    {/* FAB de grifo/IA (pré-Bento) removido no Bloco 4 (39f): já era
        `!immersive`-gated (sem chamador vivo desde que immersive passou a
        valer sempre, ver Bloco 2) e seu botão de lápis chamava
        openHighlightList, também removido — a lista de grifos existentes
        sem seleção nenhuma não tem tela própria no pacote 39. A IA segue
        acessível via Ferramentas (ver extra={hasAI ? ... openAiChat()}
        mais abaixo). */}
    {/* Chat flutua por cima da leitura (mesmo motivo do portal acima) — a
        pessoa nunca sai de onde estava; fecha com o X ou tocando fora, e
        volta pra exatamente a mesma posição de rolagem de antes. Estado
        próprio (aiChatOpen, não openPanel) — abrir a IA não pode fechar o
        que já estava aberto embaixo (o texto do capítulo, Contexto...), e
        fechar a IA não pode fazer o que estava aberto sumir junto. */}
    {aiChatOpen && heroSession.type !== 'reflection' && createPortal(
      <div style={styles.aiChatOverlayBackdrop} onClick={() => setAiChatOpen(false)}>
        <div style={styles.aiChatOverlayWindow} onClick={e => e.stopPropagation()}>
          <div style={styles.aiChatOverlayHeader}>
            <span style={styles.aiChatOverlayTitle}>
              <span style={styles.aiChatOverlayIcon}><AppIcon name="HelpCircle" size={15} color="#A21CAF" /></span>
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
    {embedded ? (
      // Embutido: sem wrapper de tela cheia nenhum — quem rola é a página
      // que contém isso (a lista da aba Bíblia), não este componente. Sem
      // transição de entrada (rb-enter) também — não é uma tela nova
      // abrindo, é um item da lista crescendo no lugar.
      <>
        {headerAndPanels}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {bookListItems}
        </div>
      </>
    ) : immersive ? (
      // Leitura imersiva (redesign 1b, reskin Bento — tela 4a) — só o texto
      // rolável + cabeçalho sticky + rodapé fixo. Sem lista de livros, sem
      // cards de "lidos recentemente".
      <div style={{ height: '100%', background: 'var(--bento-bg)' }}>
        <div ref={scrollRef} style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 148, height: '100%' }}>
          {headerAndPanels}
        </div>
        {/* Rodapé portalado pro <body> — position:fixed dentro de
            .app-content-inner com zoom ligado (texto grande) calcularia a
            posição errada, mesmo problema/solução dos FABs mais abaixo e
            da .bottom-nav. */}
        {/* Turno 39, Bloco 3: a folha de 39e (VerseActionsSheet) cobre o
            rodapé inteiro enquanto aberta — esconde igual em qualquer um
            dos seus dois estados (escolhendo cor/ação, ou perguntando). */}
        {!selectionMenuOpen && createPortal(
          <div style={styles.readerFooter}>
            {/* Chave da camada do grupo (quadro 17c) — só pra quem está num
                grupo, e nunca na leitura livre (39d): sem sessão de plano,
                não há "marcações do grupo NESTA sessão" pra mostrar aqui. */}
            {myGroup && heroSession.type !== 'reflection' && !freeReading && (
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
                sem o player — o áudio continua em Ferramentas. Em 39d
                (freeReading) o quadro também não traz o player aqui —
                ele mora em Ferramentas junto com o resto. */}
            {heroSession.type !== 'reflection' && !myGroup && !freeReading && (
              <BibleAudioPlayer session={heroSession} lang={lang} hasNext={false} allowPremiumVoice={hasPremium} compact />
            )}
            <div style={styles.readerFooterRow}>
              <button style={styles.readerToolsBtn} onClick={() => setToolsOpen(true)}>
                <ToolboxIcon />
                {t('reading.toolsBtn', undefined, lang)}
              </button>
              {freeReading ? (
                <button style={styles.readerDoneBtnFree} onClick={handleMarkFreeChapterRead}>
                  <AppIcon name="Check" size={16} strokeWidth={2.6} color="var(--bento-accent)" />
                  {t('reading.markAsReadShort', undefined, lang)}
                </button>
              ) : (
                <button style={styles.readerDoneBtn} onClick={handleConcludePress}>
                  <AppIcon name="Check" size={16} strokeWidth={2.6} color="var(--bento-ink)" />
                  {t('reading.finishShort', undefined, lang)}
                </button>
              )}
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
            <button
              style={styles.toolsExtraBtn}
              onClick={() => { setToolsOpen(false); openAiChat() }}
            >
              <AppIcon name="HelpCircle" size={16} color="var(--bento-accent)" />
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
    ) : (
      // Tela cheia antiga (fluxo guiado não-migrado / navegação livre antiga).
      // rb-enter (transição de entrada) mora neste wrapper de FORA, nunca
      // no próprio elemento que rola (scrollRef, overflow-y:auto logo
      // abaixo) — animar transform num elemento com scroll pode travar o
      // toque de rolar em alguns navegadores mobile, mesmo depois da
      // animação terminar (ver comentário do keyframe em index.css).
      <div className={mode === 'browse' ? 'rb-enter' : undefined} style={{ height: '100%' }}>
        <div ref={scrollRef} style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
          <div className="rb-body">
            <div className="rb-detail">
              {headerAndPanels}
            </div>
            {mode === 'browse' && !isDesktop && (
              <RecentChaptersRow chapters={recentChapters} lang={lang} onOpen={onJumpToChapter} sticky />
            )}
            <div className="rb-master" style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {bookListItems}
            </div>
          </div>
        </div>
      </div>
    )}
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
  errorText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: '#DC2626' },
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

function BibleTextPanel({ session, lang, completedSet, onToggleChapter, highlights, highlightSelection, onVerseNumberClick, onTextSelectionRange, immersive = false, groupMarks = null, versionId: versionIdProp, onChangeVersion: onChangeVersionProp }) {
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

  // Selecionar um trecho arrastando o dedo/mouse (como se fosse copiar)
  // também grifa — além de tocar no número do versículo (ver onClick do
  // <sup> abaixo). Escuta `selectionchange` (não mouseup/touchend: no
  // toque, a seleção às vezes só "assenta" de vez um instante depois de
  // soltar o dedo) com um pequeno atraso, resolve o capítulo/intervalo de
  // versículos pelos atributos data-chapter/data-verse dos elementos onde
  // a seleção começa/termina (ver mais abaixo), e limpa a seleção nativa
  // do navegador — a marcação visual daqui pra frente é toda nossa (ver
  // isSelected/isHighlighted mais abaixo).
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
        // Retângulo da seleção em si (não de um elemento) — pra ancorar o
        // popup de grifo perto de onde o dedo/mouse realmente passou, não
        // só perto do primeiro versículo tocado. Precisa ser lido ANTES de
        // limpar a seleção (removeAllRanges) — depois disso o Range não dá
        // mais coordenadas úteis.
        const rect = sel.getRangeAt(0).getBoundingClientRect()
        sel.removeAllRanges()
        onTextSelectionRange?.(Number(chapterEl.dataset.chapter), verses, rect)
      }, 250)
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => { document.removeEventListener('selectionchange', handleSelectionChange); clearTimeout(timer) }
  }, [onTextSelectionRange])

  function highlightForVerse(ch, v) {
    return highlights?.find(h => !h.hidden && h.book === session.book && h.chapter === ch && h.verses.includes(v))
  }

  const chapterNumbers = []
  for (let ch = session.chStart; ch <= session.chEnd; ch++) chapterNumbers.push(ch)
  // Imersivo (reskin Bento, 4a) usa a palavra inteira ("CAPÍTULO 41", vira
  // maiúscula por CSS) — fora dele continua abreviado ("Cap. 41"), como
  // sempre foi.
  const chLabel = immersive ? (lang === 'en' ? 'Chapter' : 'Capítulo') : (lang === 'en' ? 'Ch.' : 'Cap.')

  return (
    // Imersivo (1b): sem card de painel (o card branco próprio já vem do
    // wrapper de fora, ver readerTextCard). Nos outros casos, card de painel
    // com padding lateral menor — texto corrido ganha mais com coluna larga
    // que com respiro generoso.
    <div style={immersive ? undefined : { ...styles.panel, padding: '14px 8px' }} ref={textRef}>
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
      ) : !immersive ? (
        // A 4a não mostra esse selo de versão quando só há uma (o rodapé já
        // traz a atribuição completa) — decorativo demais pra tela mais
        // silenciosa do app.
        <p style={styles.panelBookLabel}>{version.label}</p>
      ) : null}

      {state.status === 'loading' && <p style={styles.panelText}>{t('reading.textLoading', undefined, lang)}</p>}
      {state.status === 'error' && <p style={styles.panelText}>{t('reading.textError', undefined, lang)}</p>}

      {state.status === 'ready' && chapterNumbers.map(ch => {
        const chapter = state.chapters[String(ch)] ?? { verses: {}, breaks: {} }
        const paragraphs = groupIntoParagraphs(chapter)
        const chDone = completedSet?.has(`${session.book}:${ch}`)
        return (
          <div key={ch} data-chapter={ch} style={immersive ? styles.bibleTextChapterBento : styles.bibleTextChapter}>
            <p style={immersive ? styles.bibleTextChapterLabelBento : styles.bibleTextChapterLabel}>{chLabel} {ch}</p>

            {/* Mesma ação de "marcar como lido" também no INÍCIO do texto —
                antes só existia no fim (ver comentário mais abaixo); quem
                já sabe que vai ler o capítulo inteiro marca de saída, sem
                precisar rolar até o final pra achar o botão. */}
            {onToggleChapter && !immersive && (
              <button
                style={{ ...styles.chapterDoneBtn, ...styles.chapterDoneBtnTop, ...(chDone ? styles.chapterDoneBtnActive : {}) }}
                onClick={() => onToggleChapter(session, ch, !chDone)}
              >
                <AppIcon name={chDone ? 'Check' : 'Circle'} size={13} />
                {chDone ? t('reading.chapterMarkedDone', { n: ch }, lang) : t('reading.markChapterDone', { n: ch }, lang)}
              </button>
            )}

            {paragraphs.map((verseNums, pIdx) => (
              <Fragment key={pIdx}>
              <p style={immersive ? styles.bibleTextBodyBento : styles.bibleTextBody}>
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
                  // aparece na hora, nos dois modos (raio só muda por
                  // fidelidade a cada desenho — 4 no imersivo, 3 fora dele).
                  const highlightStyle = existingHighlight
                    ? {
                        background: highlightColorBg(existingHighlight.color),
                        borderRadius: immersive ? 4 : 3,
                        padding: immersive ? '1px 3px' : undefined,
                        // Sublinhado leve SÓ quando tem anotação de verdade
                        // escrita (texto não-vazio) — grifo só de cor não
                        // ganha, já que não há "anotação" nenhuma pra indicar.
                        ...(existingHighlight.text ? styles.verseAnnotatedUnderline : {}),
                      }
                    : isSelected ? (immersive ? styles.verseSelectedBento : styles.verseSelected) : undefined
                  const groupMark = groupMarks?.[ch]?.[v]
                  const groupStyle = groupMark ? styles.verseGroupMarked : undefined
                  const handleVerseTap = e => {
                    if (window.getSelection?.()?.toString()) return
                    const point = { top: e.clientY, bottom: e.clientY, left: e.clientX, right: e.clientX, width: 0, height: 0 }
                    onVerseNumberClick?.(ch, v, point)
                  }
                  return (
                    <span
                      key={v}
                      data-verse={v}
                      style={{ ...highlightStyle, ...groupStyle, ...styles.verseTapTarget }}
                      onClick={handleVerseTap}
                    >
                      {vIdx > 0 && chapter.breaks[String(v)] === 'L' && <br />}
                      <sup style={immersive
                        ? { ...styles.bibleTextVerseNumBento, margin: vIdx === 0 ? '0 4px 0 0' : '0 4px 0 6px' }
                        : styles.bibleTextVerseNum}
                      >{v}</sup>
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

            {/* Marcar o capítulo como lido direto no fim do texto — sem
                precisar voltar pro topo e caçar o chip dele (ver
                ChapterChips, que continua existindo pra quem prefere). */}
            {onToggleChapter && !immersive && (
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
        <p style={immersive ? styles.bibleTextAttributionBento : styles.bibleTextAttribution}>{version.attribution ?? t('reading.textSourceEn', undefined, lang)}</p>
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
// livre (39d)" (HANDOFF) — mesmo componente nos dois, já que os dois são
// `immersive` agora (ver Bloco 2, freeReading).
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

function BookGroup({ group, isCurrentBook, heroSessionId, completedSet, onToggle, onToggleChapter, onFeature, isFreePlan, lang, mode, expandedChapterId, onToggleInline, onNextInline, getNextSessionFor, registerCardRef, lastClickedId, isDesktop, hasNoteFor, highlights, highlightSelection, onHighlightVerseClick, onHighlightTextRange }) {
  const [open, setOpen] = useState(isCurrentBook)
  // No plano livre, o rótulo diz "capítulos" — a sessão de reflexão de
  // fechamento do livro (session.type === 'reflection') não é um capítulo
  // de verdade, então não deve entrar nessa contagem (senão um livro de 5
  // capítulos com reflexão mostrava "0/6 capítulos"). No modo com sessões
  // (não-livre), o rótulo diz "sessões" e a reflexão É uma sessão de
  // verdade, então continua contando normalmente.
  const countableSessions = isFreePlan ? group.sessions.filter(s => s.type !== 'reflection') : group.sessions
  const total = countableSessions.length
  const doneCount = countableSessions.filter(s => s.status === 'done').length
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
          borderBottom: '1px solid var(--bento-line)',
        }}
        onClick={handleHeaderClick}
      >
        <AppIcon name={allDone ? 'CheckCircle2' : 'BookOpen'} size={15} color={allDone ? 'var(--bento-ink)' : isCurrentBook ? 'var(--bento-accent)' : 'var(--bento-t4)'} style={{ flexShrink: 0 }} />

        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 1 }}>{displayName}</p>
          <p style={{ fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 600, color: isCurrentBook ? 'var(--bento-accent)' : 'var(--bento-t4)' }}>
            {doneCount}/{total} {t(isFreePlan ? 'reading.chaptersSuffix' : 'reading.sessionsSuffix', undefined, lang)}{isCurrentBook ? ` · ${t('reading.readingNow', undefined, lang)}` : ''}
          </p>
        </div>

        <AppIcon name="ChevronDown" size={14} color="var(--bento-t4)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
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
              highlightSelection={highlightSelection}
              onHighlightVerseClick={onHighlightVerseClick}
              onHighlightTextRange={onHighlightTextRange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({ session, isFeatured, completedSet, onToggle, onToggleChapter, onFeature, isFreePlan, lang, mode, isExpanded, onToggleInline, onNextInline, nextSession, registerCardRef, lastClickedId, isDesktop, hasNote, highlights, highlightSelection, onHighlightVerseClick, onHighlightTextRange }) {
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
        background: isFeatured ? 'var(--bento-mark)' : 'transparent',
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
            background: isDone ? 'var(--bento-ink)' : isBadgeActive ? 'var(--bento-ink)' : isReflection ? '#A855F7' : 'var(--bento-line)',
          }}
          onClick={e => { e.stopPropagation(); onToggle(session, !isDone) }}
        >
          {isDone ? (
            <AppIcon name="Check" size={13} color="#fff" />
          ) : isReflection ? (
            <AppIcon name="PenLine" size={11} color="#fff" />
          ) : (
            <span style={{ fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 700, color: isBadgeActive ? '#fff' : 'var(--bento-t3)' }}>{isFreePlan ? session.chStart : session.id}</span>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-ink)', marginBottom: 1 }}>
            {isReflection || isFreePlan ? title : `${t('reading.sessionLabel', { n: session.id }, lang)} · ${title}`}
            {/* Ícone de "já tem anotação aqui" — pra não precisar abrir o
                capítulo de novo só pra descobrir se escreveu algo nele.
                Ver hasNoteFor em ReadingBlockView (componente pai). */}
            {hasNote && (
              <AppIcon
                name="StickyNote" size={11} color="var(--bento-accent)"
                style={{ verticalAlign: 'middle', marginLeft: 5, position: 'relative', top: -1 }}
              />
            )}
          </p>
          <p style={{ fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 500, color: 'var(--bento-t3)' }}>
            {isReflection
              ? `${passage}${isDone ? ` · ${t('reading.completedSession', undefined, lang)}` : ` · ${t('reading.tapToMark', undefined, lang)}`}`
              : `${passage} · ${chaptersDone}/${chapterCount} ${t('reading.chaptersSuffix', undefined, lang)}`}
          </p>
        </div>

        {/* Indicador: em modo 'browse' mostra seta de abrir/fechar o texto
            embutido; nos outros modos, já em destaque no topo ou toque pra
            destacar. */}
        {isBrowse ? (
          <AppIcon name="ChevronDown" size={14} color="var(--bento-t4)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
        ) : isFeatured ? (
          <span style={{ fontFamily: 'var(--font-bento)', fontSize: 8.5, fontWeight: 800, color: 'var(--bento-accent)', whiteSpace: 'nowrap' }}>{lang === 'en' ? 'FEATURED' : 'EM DESTAQUE'}</span>
        ) : (
          <AppIcon name="ArrowUp" size={13} color="var(--bento-t4)" />
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
            highlightSelection={highlightSelection}
            onVerseNumberClick={onHighlightVerseClick}
            onTextSelectionRange={onHighlightTextRange}
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
  heroTagDot:  { display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--bento-accent)', marginLeft: 5 },
  // Cabeçalho compacto da navegação livre (mode 'browse') — substitui o
  // hero grande: sem título/barra de progresso/gradiente, só voltar + nome
  // do livro + as mesmas abas de Contexto/Mapa/Notas/Curiosidades.
  browseHeader:    { padding: '14px 0 6px', display: 'flex', flexDirection: 'column', gap: 4 },
  browseBackBtn:   { width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginBottom: 6 },
  browseHeaderCycle:{ fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, color: 'var(--bento-accent)', letterSpacing: 1.2, textTransform: 'uppercase' },
  browseHeaderTitle:{ fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.4px' },
  browseHeaderSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)' },
  browseTagsRow:   { display: 'flex', gap: 7, overflowX: 'auto', marginTop: 6 },
  browseTag:       { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bento-line)', border: 'none', borderRadius: 20, padding: '6px 11px', whiteSpace: 'nowrap', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  browseTagActive: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },

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
  // Pílula do relógio de leitura (turno 35, 35f) — substitui os ícones de
  // Ferramentas no cabeçalho quando o relógio está ativo (a folha de
  // Ferramentas continua acessível pelo botão do rodapé).
  clockPill: {
    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, height: 34,
    border: 'none', borderRadius: 12, background: 'var(--bento-ink)', padding: '0 12px', cursor: 'pointer',
    transition: 'background .15s',
  },
  clockPillFlash: { background: 'var(--bento-accent)' },
  clockPillText: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' },
  clockPillTextOvertime: { color: '#8B8279' },
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
  // Variante clara do chip de capítulo, só pra 39d (leitura livre) — o
  // quadro mostra esse chip em branco com texto escuro, diferente do chip
  // escuro da leitura do plano (35f); mesma geometria (altura/raio/gap).
  readerChapterChipFree: {
    display: 'flex', alignItems: 'center', gap: 8, height: 34, maxWidth: '100%',
    border: 'none', borderRadius: 12, background: 'var(--bento-card)', padding: '0 12px 0 14px', cursor: 'pointer',
  },
  readerChapterChipTextFree: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  readerStepBadge: { flexShrink: 0, fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t4)' },
  readerHeaderSub: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.2, margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  // Tarja "Leitura livre · não conta no plano" (39d) — pílula areia, texto
  // marrom uppercase; hex exatos do HANDOFF, não os tokens de tema
  // (--bento-sand/--bento-t2 não batem com essa combinação específica).
  freeReadingTag: {
    display: 'inline-block', fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 700,
    letterSpacing: '.03em', textTransform: 'uppercase', color: '#6B5A45', background: '#E6DACB',
    borderRadius: 99, padding: '7px 14px',
  },
  readerTextCardWrap: { padding: '0 20px 4px' },
  readerTextCard: { background: 'var(--bento-card)', borderRadius: 28, padding: '26px 24px' },
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
  // "Marcar como lido" (39d) — preto com check laranja, ao contrário do
  // "Concluir" acima (laranja com ícone escuro): o quadro inverte as cores
  // de propósito pra não confundir as duas ações (uma fecha sessão do
  // plano, a outra só marca o mapa).
  readerDoneBtnFree: {
    flex: 1.35, height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 800, lineHeight: 1, color: '#fff', cursor: 'pointer',
  },
  toolsExtraBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
    border: 'none', borderRadius: 16, background: 'var(--bento-card)',
    padding: '14px 16px', cursor: 'pointer', fontFamily: 'var(--font-bento)',
    fontSize: 13.5, fontWeight: 800, color: 'var(--bento-accent)',
  },
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
  reflectionNumber:{ width: 20, height: 20, borderRadius: '50%', background: '#A855F7', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  bibleTextVersionRow:  { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  bibleTextVersionBtn:  { border: 'none', background: 'var(--bento-line)', borderRadius: 20, padding: '6px 12px', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  bibleTextVersionBtnActive: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },
  bibleTextChapter:     { marginBottom: 16, paddingTop: 12, borderTop: '1px solid var(--bento-line)' },
  // "CAP. 2" — rótulo de seção (reskin Bento: mesmos tokens da variante
  // imersiva, ver bibleTextChapterLabelBento abaixo).
  bibleTextChapterLabel:{ fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', marginBottom: 12 },
  // Texto bíblico — 19px/1.72: a tela mais usada deve ser a mais silenciosa.
  // Vale pra leitura guiada E pra aba Bíblia (embutida em BookChapterScreen.jsx).
  bibleTextBody:        { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 500, color: 'var(--bento-ink)', lineHeight: 1.72, marginBottom: 18, textWrap: 'pretty' },
  bibleTextVerseNum:    { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, color: 'var(--bento-accent)', verticalAlign: 'super', marginRight: 2 },
  bibleTextAttribution: { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 500, color: 'var(--bento-t4)', lineHeight: 1.5, marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--bento-line)', fontStyle: 'italic' },
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
  nextChapterBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', borderRadius: 14, padding: 13, marginTop: 12, fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer', background: 'var(--bento-accent)' },
  chapterDoneBtn:       { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', borderRadius: 13, padding: 11, marginTop: 10, fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', background: 'var(--bento-line)' },
  chapterDoneBtnActive: { background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontWeight: 800 },
  // Versão do botão acima pro topo do capítulo (antes do 1º parágrafo) —
  // marginTop:0 (nada antes dele pra afastar) e um pouco mais de respiro
  // embaixo, já que aqui ele antecede texto corrido, não sucede.
  chapterDoneBtnTop:    { marginTop: 0, marginBottom: 16 },

  verseTapTarget:  { cursor: 'pointer' },
  verseSelected:   { background: 'rgba(201,154,74,.14)', borderRadius: 3, outline: '1px dashed rgba(201,154,74,.7)', outlineOffset: 1 },
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
  errorText:       { fontSize: 11.5, fontWeight: 600, color: '#DC2626', marginBottom: 8, flexShrink: 0 },
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
  aiChatOverlayIcon: { width: 28, height: 28, borderRadius: 9, background: '#FAE8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
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
