import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { groupSessionsByBook } from '../utils/groupByBook'
import { BOOK_INFO } from '../data/bookInfo'
import { BOOK_INFO_EN } from '../data/bookInfo.en'
import { getNotes, saveNote, noteKeyFor, noteTextOf } from '../notes/notesStore'
import { getHighlights, saveHighlight, updateHighlightText, hideHighlight } from '../highlights/highlightsStore'
import { getMessages, sendMessage, getDailyLimitStatus } from '../aiChat/aiChatStore'
import { formatVerseRanges } from '../utils/verseRanges'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId, setSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { BIBLE_VERSIONS, findBibleVersion } from '../data/bibleVersions'
import { setLastOpenedChapter } from '../reading/lastOpenedChapterStore'
import { setLastReadPosition } from '../reading/lastReadPositionStore'
import { getRecentChapters, addRecentChapter } from '../reading/recentChaptersStore'
import { dateKey } from '../utils/dateKey'
import { HIGHLIGHT_COLORS, DEFAULT_HIGHLIGHT_COLOR, highlightColorBg } from '../data/highlightColors'
import { useIsDesktop } from '../utils/useIsDesktop'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import RecentChaptersRow from '../components/RecentChaptersRow'
import RoutineStepSwitcher from '../components/RoutineStepSwitcher'

export default function ReadingBlockView({ session, authUser, onNavigate, blockId, blocks, sessionsByBlock, mode = 'session', completedSet, onToggleSession, onToggleChapter, initialSessionId, initialTextOpen, onBack, onGoToReflection, onJumpToChapter, embedded = false }) {
  const { lang } = session
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
  // tem seu próprio "onde parei" (a sessão "current" do plano). Alimenta o
  // botão "Continuar leitura" (lastOpenedChapterStore) e os cards de
  // "lidos recentemente" (recentChaptersStore) — mesmo gatilho pros dois.
  useEffect(() => {
    if (mode === 'browse' && expandedChapterId != null) {
      setLastOpenedChapter(block.id, expandedChapterId)
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

  const [openPanel, setOpenPanel] = useState(null)

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
      if (s) setLastReadPosition(s.book, s.chStart)
    } else if (openPanel === 'texto' && heroSession) {
      setLastReadPosition(heroSession.book, heroSession.chStart)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, expandedChapterId, openPanel, heroSession?.id])

  // Chat de IA e janela de grifo flutuam por CIMA da leitura (portal pro
  // <body>, ver mais abaixo) — de propósito em estados PRÓPRIOS, separados
  // de openPanel: abrir um dos dois não pode fechar/trocar o que já estava
  // aberto embaixo (o texto do capítulo, Contexto, Notas...). Antes os três
  // dividiam o mesmo openPanel, então abrir a IA com o texto aberto (modo
  // 'session') trocava openPanel de 'texto' pra 'ia' — ao fechar a IA,
  // openPanel virava null (não voltava pra 'texto'), e o texto que a
  // pessoa estava lendo sumia da tela sozinho.
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [highlightPanelOpen, setHighlightPanelOpen] = useState(false)
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
  function handleSaveHighlight(book, bookEn, chapter, verses, text, color) {
    const highlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      book, bookEn, chapter, verses,
      text: text.trim(),
      color: color ?? DEFAULT_HIGHLIGHT_COLOR,
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

  function handleUpdateHighlightText(id, text, color) {
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, text, color: color ?? h.color } : h))
    updateHighlightText(authUser?.email, id, text, color).catch(err => {
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
  // Uma seleção NOVA (ainda não salva) sempre abre na etapa de escolher cor
  // primeiro (círculos), não direto na anotação — só vira a etapa de
  // escrever quando a pessoa toca em "Adicionar anotação" (ver
  // startAnnotating). Editar um grifo já salvo pula direto pro editor
  // completo (não passa pela etapa de cor sozinha), então não usa este
  // estado — ver HighlightComposer.
  const [wantsToAnnotate, setWantsToAnnotate] = useState(false)
  // Retângulo (coordenadas de tela, de getBoundingClientRect) de onde a
  // pessoa tocou o número do versículo ou terminou de selecionar um
  // trecho — usado só pra ancorar o popup pequeno perto do toque (ver
  // HighlightPopup mais abaixo). Fica null quando a entrada foi pelo FAB
  // de lápis sem nada selecionado (sem um alvo específico na tela pra
  // ancorar) — nesse caso o painel some direto na folha de sempre.
  const [highlightAnchorRect, setHighlightAnchorRect] = useState(null)

  // Toque no NÚMERO de um versículo — alterna ele dentro/fora da seleção em
  // andamento (ou, se esse versículo já tem um grifo salvo, troca pro modo
  // "editar esse grifo" em vez de somar à seleção. Sempre abre o popup
  // ancorado perto do toque; fecha sozinho se a seleção esvaziar.
  function handleHighlightVerseClick(ch, v, rect) {
    const existing = highlights?.find(h => !h.hidden && h.book === heroSession.book && h.chapter === ch && h.verses.includes(v))
    if (existing) {
      setHighlightEditingId(existing.id)
      setHighlightSelection(null)
      setWantsToAnnotate(false)
      setHighlightAnchorRect(rect ?? null)
      setHighlightPanelOpen(true)
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
    setHighlightPanelOpen(Boolean(next))
  }

  // Seleção de texto "de verdade" (arrastar o dedo/mouse como se fosse
  // copiar) — ver detecção em BibleTextPanel (escuta selectionchange e
  // resolve o intervalo de versículos pelos atributos data-chapter/
  // data-verse). Sempre substitui a seleção em andamento (não soma a um
  // grifo já aberto pra edição), mesmo espírito de handleHighlightVerseClick.
  function handleHighlightTextRange(ch, verses, rect) {
    setHighlightEditingId(null)
    setHighlightSelection({ chapter: ch, verses })
    setWantsToAnnotate(false)
    setHighlightAnchorRect(rect ?? null)
    setHighlightPanelOpen(true)
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

  function startAnnotating() {
    setWantsToAnnotate(true)
  }

  function submitNewHighlight(text, color) {
    if (!highlightSelection || !text.trim()) return
    handleSaveHighlight(heroSession.book, heroSession.bookEn, highlightSelection.chapter, [...highlightSelection.verses].sort((a, b) => a - b), text, color)
    setHighlightSelection(null)
    setWantsToAnnotate(false)
    setHighlightAnchorRect(null)
    setHighlightPanelOpen(false)
  }

  // Sem exigir texto (diferente de submitNewHighlight) — editar um grifo já
  // salvo pode ser só pra trocar a cor, sem mexer na anotação (que pode
  // continuar vazia, se nunca teve uma).
  function submitHighlightEdit(text, color) {
    if (!highlightEditingId) return
    handleUpdateHighlightText(highlightEditingId, text, color)
    setHighlightEditingId(null)
    setWantsToAnnotate(false)
    setHighlightAnchorRect(null)
    setHighlightPanelOpen(false)
  }

  function removeEditingHighlight() {
    if (!highlightEditingId) return
    handleHideHighlight(highlightEditingId)
    setHighlightEditingId(null)
    setWantsToAnnotate(false)
    setHighlightAnchorRect(null)
    setHighlightPanelOpen(false)
  }

  function cancelHighlightCompose() {
    setHighlightSelection(null)
    setHighlightEditingId(null)
    setWantsToAnnotate(false)
    setHighlightAnchorRect(null)
    setHighlightPanelOpen(false)
  }

  // Tocar num grifo já salvo, dentro da lista da janela flutuante (estado
  // vazio, sem seleção em andamento) — abre ele pra ver/editar/apagar, sem
  // precisar fechar a janela e caçar o versículo de novo na lista.
  function editExistingHighlight(id) {
    setHighlightSelection(null)
    setHighlightEditingId(id)
    setWantsToAnnotate(false)
    setHighlightAnchorRect(null) // veio da lista (sem versículo específico na tela) — fica na folha
  }

  // FAB de lápis, sem nada selecionado — sempre a lista de grifos já
  // feitos (folha no rodapé, sem âncora), nunca um resquício de seleção/
  // edição de uma interação anterior.
  function openHighlightList() {
    setHighlightSelection(null)
    setHighlightEditingId(null)
    setWantsToAnnotate(false)
    setHighlightAnchorRect(null)
    setHighlightPanelOpen(true)
  }

  const heroBooks = [{ name: heroSession.book, displayName: heroSession.bookEn, info: bookInfoSource[heroSession.book] }].filter(b => b.info)
  const heroTitle = lang === 'en' ? heroSession.titleEn : heroSession.title
  const heroPassage = lang === 'en' ? heroSession.passageEn : heroSession.passage
  const heroChapterSpan = heroSession.type === 'reflection' ? 0 : heroSession.chEnd - heroSession.chStart + 1
  const heroChapterWord = lang === 'en' ? (heroChapterSpan === 1 ? 'chapter' : 'chapters') : (heroChapterSpan === 1 ? 'capítulo' : 'capítulos')
  const heroBookDisplayName = lang === 'en' ? heroSession.bookEn : heroSession.book
  const chLabel = lang === 'en' ? 'Ch.' : 'Cap.'
  // Grifos já salvos dentro do alcance da sessão em destaque — mostrados na
  // janela flutuante de grifo quando ela abre sem nenhuma seleção em
  // andamento (ver FAB de lápis), pra dar acesso rápido a editar/apagar um
  // já feito sem precisar caçar o versículo de novo na lista.
  const highlightsInHero = heroSession.type === 'reflection' ? [] : (highlights?.filter(h => !h.hidden && h.book === heroSession.book && h.chapter >= heroSession.chStart && h.chapter <= heroSession.chEnd) ?? [])

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
      <div style={styles.browseHeader}>
        {!embedded && (
          <button onClick={onBack} style={styles.browseBackBtn} aria-label="back">
            <AppIcon name="ArrowLeft" size={17} color="var(--bk)" />
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
              seria a mesma coisa duas vezes. */}
          {TAGS.filter(tag => tag.key !== 'ia').map(tag => (
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
      {/* Cards de "lidos recentemente" — só na navegação livre de tela
          cheia, nunca embutido (não faz sentido por livro). No desktop
          moram aqui dentro de .rb-detail, que já é sticky por conta
          própria (CSS, ≥768px). No celular ficam de FORA daqui (ver logo
          abaixo, fora desta variável) — sticky só funciona dentro dos
          limites do próprio pai, e .rb-detail é curto (só o cabeçalho). */}
      {!embedded && mode === 'browse' && isDesktop && (
        <RecentChaptersRow chapters={recentChapters} lang={lang} onOpen={onJumpToChapter} sticky />
      )}
      {mode !== 'browse' && (
        <>
          {/* Marcação capítulo a capítulo da sessão em destaque — só no
              fluxo guiado (mode 'session'); a navegação livre pula essa
              linha (ver acima). */}
          {heroSession.type !== 'reflection' && (
            <div style={{ padding: '0 14px 4px' }}>
              <ChapterChecklist
                session={heroSession}
                completedSet={completedSet}
                onToggleChapter={onToggleChapter}
                lang={lang}
                textOpen={openPanel === 'texto'}
                onToggleText={() => setOpenPanel(p => (p === 'texto' ? null : 'texto'))}
                highlights={highlights}
              />
            </div>
          )}
        </>
      )}

      {/* Seletor pra pular direto pra Oração/Reflexão sem voltar pra aba
          Rotina — só no fluxo guiado de tela cheia (a leitura livre não é
          "o passo de hoje" de coisa nenhuma, e embutido na aba Bíblia não
          tem esse contexto de rotina). Logo acima do texto de propósito —
          depois da lista de capítulos da sessão, não colado no cabeçalho. */}
      {!embedded && mode !== 'browse' && heroSession.type !== 'reflection' && (
        <RoutineStepSwitcher
          session={session}
          activeStep="reading"
          onGoPrayer={() => onNavigate?.('prayer')}
          onGoStudy={() => onNavigate?.('studies')}
          onGoReflection={() => onNavigate?.('reflection')}
        />
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
          caçar o próximo capítulo na lista estreita ao lado. Embutido
          (embedded) nunca usa esse caminho — não tem coluna "mestre"
          separada, então o texto sempre aparece junto do capítulo na
          lista (ver isDesktop abaixo forçado a false pra embedded). */}
      {(() => {
        const browseTextInHero = !embedded && mode === 'browse' && isDesktop && expandedChapterId != null
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
              highlightSelection={highlightSelection}
              onVerseNumberClick={handleHighlightVerseClick}
              onTextSelectionRange={handleHighlightTextRange}
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

      {/* Marcar/desmarcar a sessão em destaque — só no fluxo guiado; na
          navegação livre, cada capítulo já se marca sozinho na lista
          abaixo (BookGroup), sem precisar desse botão redundante. */}
      {mode !== 'browse' && (
        <div style={{ padding: '0 14px 4px' }}>
          <button
            style={{ ...styles.completeBtn, ...(heroSession.status === 'done' ? styles.completeBtnDone : {}) }}
            onClick={() => onToggleSession(heroSession, heroSession.status !== 'done')}
          >
            {heroSession.status === 'done' ? t('reading.markUndone', undefined, lang) : t('reading.markDone', undefined, lang)}
          </button>
        </div>
      )}

      {/* Sessão concluída no fluxo guiado (mode 'session', não a
          navegação livre da aba Bíblia) — próximo passo da rotina é a
          Reflexão, mesmo padrão do "Ir para a Leitura" que aparece no
          fim do cronômetro de Oração (PrayerScreen.jsx). */}
      {mode !== 'browse' && heroSession.status === 'done' && (
        <div style={{ padding: '0 14px 4px' }}>
          <button style={styles.nextStepBtn} onClick={() => (onGoToReflection ? onGoToReflection(heroSession) : onNavigate?.('reflection'))}>
            {t('routine.goToReflection', undefined, lang)} <AppIcon name="ChevronRight" size={15} />
          </button>
        </div>
      )}
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
        {/* Lápis em cima do robô da IA — mesmo FAB flutuante, mesma coluna,
            só empilhado (ver styles.highlightFab: mesmo `right`, `bottom`
            maior). Abre a mesma janela flutuante do grifo (ver embaixo);
            com uma seleção em andamento ela já mostra o compositor, sem
            seleção mostra os grifos já feitos neste trecho. */}
        <button type="button" style={styles.highlightFab} onClick={openHighlightList} aria-label={t('reading.tagHighlight', undefined, lang)}>
          <AppIcon name="Pencil" size={19} color="white" />
        </button>
        <button type="button" style={styles.aiFab} onClick={openAiChat} aria-label={t('reading.tagAskAi', undefined, lang)}>
          <AppIcon name="HelpCircle" size={22} color="white" />
        </button>
      </div>,
      document.body
    )}
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
    {/* Grifar/anotar — dois jeitos de mostrar o mesmo HighlightComposer:
        um popup pequeno ANCORADO perto de onde a pessoa tocou o
        versículo/selecionou um trecho (highlightAnchorRect preenchido —
        ver handleHighlightVerseClick/handleHighlightTextRange), deixando
        o próprio versículo visível por trás; ou a folha de sempre no
        rodapé — usada tanto sem âncora nenhuma (FAB de lápis tocado sem
        nada selecionado, pra navegar a lista de grifos já feitos) quanto
        assim que `wantsToAnnotate` liga (etapa de ESCREVER a anotação):
        essa etapa cresce bem mais que a de cor (citação + textarea), e
        ancorada perto do toque original ela às vezes ia parar perto do
        topo da tela, quase saindo da área visível — no rodapé sempre cabe
        inteira, com espaço de sobra pra rolar se precisar. */}
    {highlightPanelOpen && heroSession.type !== 'reflection' && (
      highlightAnchorRect && !wantsToAnnotate ? (
        <AnchoredHighlightPopup anchorRect={highlightAnchorRect} onClose={cancelHighlightCompose} lang={lang}>
          <HighlightComposer
            lang={lang}
            chLabel={chLabel}
            heroBook={heroSession.book}
            heroBookEn={heroSession.bookEn}
            selection={highlightSelection}
            wantsToAnnotate={wantsToAnnotate}
            editingHighlight={highlightEditingId ? highlights?.find(h => h.id === highlightEditingId && !h.hidden) : null}
            existingHighlights={highlightsInHero}
            onQuickColor={chooseQuickColor}
            onWantsToAnnotate={startAnnotating}
            onSaveNew={submitNewHighlight}
            onSaveEdit={submitHighlightEdit}
            onDelete={removeEditingHighlight}
            onEditExisting={editExistingHighlight}
          />
        </AnchoredHighlightPopup>
      ) : createPortal(
        <div style={styles.aiChatOverlayBackdrop} onClick={cancelHighlightCompose}>
          <div style={styles.highlightListSheetWindow} onClick={e => e.stopPropagation()}>
            <div style={styles.aiChatOverlayHeader}>
              <span style={styles.aiChatOverlayTitle}>
                <span style={{ ...styles.aiChatOverlayIcon, background: 'var(--olt)' }}><AppIcon name="Pencil" size={14} color="var(--brand-deep)" /></span>
                {t('reading.tagHighlight', undefined, lang)}
              </span>
              <button type="button" style={styles.aiChatOverlayClose} onClick={cancelHighlightCompose} aria-label={t('aiChat.close', undefined, lang)}>
                <AppIcon name="X" size={16} color="var(--g5)" />
              </button>
            </div>
            <div style={styles.aiChatOverlayBody}>
              <HighlightComposer
                lang={lang}
                chLabel={chLabel}
                heroBook={heroSession.book}
                heroBookEn={heroSession.bookEn}
                selection={highlightSelection}
                wantsToAnnotate={wantsToAnnotate}
                editingHighlight={highlightEditingId ? highlights?.find(h => h.id === highlightEditingId && !h.hidden) : null}
                existingHighlights={highlightsInHero}
                onQuickColor={chooseQuickColor}
                onWantsToAnnotate={startAnnotating}
                onSaveNew={submitNewHighlight}
                onSaveEdit={submitHighlightEdit}
                onDelete={removeEditingHighlight}
                onEditExisting={editExistingHighlight}
              />
            </div>
          </div>
        </div>,
        document.body
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
    ) : (
      // Tela cheia (fluxo guiado, mode 'session' — ou navegação livre
      // antiga, mantida só pro caso de algum caller ainda não migrado).
      // rb-enter (transição de entrada) mora neste wrapper de FORA, nunca
      // no próprio elemento que rola (scrollRef, overflow-y:auto logo
      // abaixo) — animar transform num elemento com scroll pode travar o
      // toque de rolar em alguns navegadores mobile, mesmo depois da
      // animação terminar (ver comentário do keyframe em index.css).
      <div className={mode === 'browse' ? 'rb-enter' : undefined} style={{ height: '100%' }}>
        <div ref={scrollRef} style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
          <div className="rb-body">
            {/* Detalhe: sessão em destaque + marcação + painéis — vem
                primeiro no DOM (ordem certa no celular); no desktop o CSS
                reordena pra direita e mantém fixo (sticky) enquanto a
                lista de livros rola. */}
            <div className="rb-detail">
              {headerAndPanels}
            </div>

            {/* Versão celular dos cards de "lidos recentemente" — de
                propósito FORA de .rb-detail (ver comentário dentro de
                headerAndPanels): como filha direta de .rb-body (que cobre
                TODA a altura, cabeçalho + lista), sticky consegue ficar
                colada no topo por toda a rolagem da lista de capítulos
                abaixo, não só enquanto .rb-detail (curto) durar. */}
            {mode === 'browse' && !isDesktop && (
              <RecentChaptersRow chapters={recentChapters} lang={lang} onOpen={onJumpToChapter} sticky />
            )}

            {/* Lista de livros do bloco (agrupados; só o livro em leitura
                já vem expandido) — no desktop vira o painel "mestre" à
                esquerda. */}
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
        // Ponto dourado — não tenta bater com a cor de nenhum grifo
        // específico (um capítulo pode ter vários, de cores diferentes) —
        // só avisa que esse capítulo tem algum trecho marcado, sem
        // precisar abrir o texto pra descobrir.
        const hasHighlight = highlights?.some(h => !h.hidden && h.book === session.book && h.chapter === ch)
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

function BibleTextPanel({ session, lang, completedSet, onToggleChapter, highlights, highlightSelection, onVerseNumberClick, onTextSelectionRange }) {
  const bookKey = lang === 'en' ? session.bookEn : session.book
  const availableVersions = BIBLE_VERSIONS[lang] ?? []
  const [versionId, setVersionId] = useState(() => getSelectedVersionId(lang))
  const version = findBibleVersion(versionId) ?? availableVersions[0]
  const [state, setState] = useState({ status: 'loading', chapters: null })
  const textRef = useRef(null)

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
  const chLabel = lang === 'en' ? 'Ch.' : 'Cap.'

  return (
    // Padding horizontal bem menor que o dos outros painéis (styles.panel
    // sozinho usa 14px) — texto corrido de leitura ganha mais com uma
    // coluna larga do que com respiro lateral generoso (ver também os dois
    // wrappers que chamam este componente, ambos com o mesmo ajuste).
    <div style={{ ...styles.panel, padding: '14px 8px' }} ref={textRef}>
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
          <div key={ch} data-chapter={ch} style={styles.bibleTextChapter}>
            <p style={styles.bibleTextChapterLabel}>{chLabel} {ch}</p>
            {paragraphs.map((verseNums, pIdx) => (
              <p key={pIdx} style={styles.bibleTextBody}>
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
                  const highlightStyle = existingHighlight
                    ? {
                        background: highlightColorBg(existingHighlight.color),
                        borderRadius: 3,
                        // Sublinhado leve SÓ quando tem anotação de verdade
                        // escrita (texto não-vazio) — grifo só de cor não
                        // ganha, já que não há "anotação" nenhuma pra indicar.
                        ...(existingHighlight.text ? styles.verseAnnotatedUnderline : {}),
                      }
                    : isSelected ? styles.verseSelected : undefined
                  const handleVerseTap = e => {
                    if (window.getSelection?.()?.toString()) return
                    const point = { top: e.clientY, bottom: e.clientY, left: e.clientX, right: e.clientX, width: 0, height: 0 }
                    onVerseNumberClick?.(ch, v, point)
                  }
                  return (
                    <span
                      key={v}
                      data-verse={v}
                      style={{ ...highlightStyle, ...styles.verseTapTarget }}
                      onClick={handleVerseTap}
                    >
                      {vIdx > 0 && chapter.breaks[String(v)] === 'L' && <br />}
                      <sup style={styles.bibleTextVerseNum}>{v}</sup>
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

// Popup pequeno, ancorado perto de onde a pessoa tocou o versículo (ou
// terminou de selecionar um trecho) — diferente do chat de IA/da folha de
// grifos salvos (sempre no rodapé, com fundo escuro cobrindo a tela), aqui
// o pedido foi manter o próprio versículo visível por trás/ao redor do
// popup. Por isso: sem fundo escuro (só uma camada TRANSPARENTE pra
// capturar o toque de fora e fechar) e posição calculada a partir do
// retângulo âncora, não fixa no rodapé.
//
// Mede o próprio tamanho depois de montar (useLayoutEffect roda antes da
// pintura, então não pisca na posição errada) porque o conteúdo muda de
// tamanho conforme a etapa (círculos de cor → editor com textarea), e o
// tamanho final só se sabe depois de renderizado.
function AnchoredHighlightPopup({ anchorRect, onClose, lang, children }) {
  const popupRef = useRef(null)
  const [pos, setPos] = useState(null) // { top, left } | null (ainda não medido)

  useLayoutEffect(() => {
    const el = popupRef.current
    if (!el || !anchorRect) return
    function reposition() {
      // window.visualViewport, quando existe, reflete a área REALMENTE
      // visível (exclui o teclado virtual aberto) — sem ele (Safari mais
      // antigo etc.) cai pro innerWidth/innerHeight de sempre.
      const vv = window.visualViewport
      const vw = vv?.width ?? window.innerWidth
      const vh = vv?.height ?? window.innerHeight
      const vLeft = vv?.offsetLeft ?? 0
      const vTop = vv?.offsetTop ?? 0
      const rect = el.getBoundingClientRect()
      const margin = 10

      let left = anchorRect.left + (anchorRect.width - rect.width) / 2
      left = Math.min(Math.max(left, vLeft + margin), vLeft + vw - rect.width - margin)

      // Prefere abrir embaixo do alvo; sem espaço (perto do rodapé da tela
      // ou do teclado), vira pra cima dele.
      let top = anchorRect.bottom + 8
      if (top + rect.height > vTop + vh - margin) {
        top = anchorRect.top - rect.height - 8
      }
      top = Math.min(Math.max(top, vTop + margin), vTop + vh - rect.height - margin)

      setPos({ top, left })
    }
    reposition()
    window.visualViewport?.addEventListener('resize', reposition)
    window.addEventListener('resize', reposition)
    return () => {
      window.visualViewport?.removeEventListener('resize', reposition)
      window.removeEventListener('resize', reposition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRect, children])

  // Fecha ao tocar fora do popup — MAS deixa passar toques num OUTRO
  // versículo (elemento com data-verse): esses precisam continuar chegando
  // no onClick de cada <span> (ver handleVerseTap/handleHighlightVerseClick
  // em BibleTextPanel/ReadingBlockView), que já sabe somar esse versículo à
  // seleção em andamento — é assim que a pessoa marca mais de um versículo
  // de uma vez, tocando um a um. Uma camada catcher cobrindo a tela inteira
  // (como antes) capturaria esses toques ANTES de chegarem no versículo,
  // fechando o popup em vez de estender a seleção — por isso não existe
  // mais uma div catcher aqui, só este listener no document (não intercepta
  // nada, só observa). Também não fecha mais ao ROLAR a tela (existia antes
  // uma versão que fechava): rolar é exatamente como a pessoa alcança um
  // versículo mais distante pra somar à seleção em andamento — fechar aí
  // perderia a seleção bem no meio do gesto. O popup (position:fixed) só
  // fica visualmente "parado" enquanto a lista rola por baixo dele; ao
  // tocar um novo versículo ele pula pra perto do toque de novo.
  useEffect(() => {
    function handleOutsideClick(e) {
      if (popupRef.current && e.target instanceof Node && popupRef.current.contains(e.target)) return
      if (e.target instanceof Element && e.target.closest('[data-verse]')) return
      onClose()
    }
    document.addEventListener('click', handleOutsideClick, true)
    return () => document.removeEventListener('click', handleOutsideClick, true)
  }, [onClose])

  return createPortal(
    <>
      <div
        ref={popupRef}
        style={{
          ...styles.highlightPopup,
          ...(pos ? { top: pos.top, left: pos.left, visibility: 'visible' } : { top: -9999, left: -9999, visibility: 'hidden' }),
        }}
        onClick={e => e.stopPropagation()}
      >
        <button type="button" style={styles.highlightPopupClose} onClick={onClose} aria-label={t('aiChat.close', undefined, lang)}>
          <AppIcon name="X" size={13} color="var(--g5)" />
        </button>
        {children}
      </div>
    </>,
    document.body
  )
}

// Corpo da janela flutuante de grifo (ver highlightPanelOpen no componente
// principal) — quatro estados possíveis:
// 1. `editingHighlight` preenchido: editor completo (cor + anotação) de um
//    grifo já salvo, com opção de apagar.
// 2. `selection` preenchida e `wantsToAnnotate` false: ETAPA DE COR —
//    círculos grandes pra grifar na hora (sem escrever nada) + botão
//    "Adicionar anotação", que leva pro editor completo (estado 3).
// 3. `selection` preenchida e `wantsToAnnotate` true: editor completo de um
//    grifo NOVO (mesma UI do 1, só que salva em vez de atualizar).
// 4. Nenhum dos dois (FAB de lápis tocado sem nada selecionado): dica de
//    como grifar + lista dos grifos já feitos nesta sessão, cada um
//    tocável pra cair direto no estado 1.
function HighlightComposer({
  lang, chLabel, heroBook, heroBookEn, selection, wantsToAnnotate, editingHighlight, existingHighlights,
  onQuickColor, onWantsToAnnotate, onSaveNew, onSaveEdit, onDelete, onEditExisting,
}) {
  const isEditing = Boolean(editingHighlight)
  // wantsToAnnotate é o único portão pro editor completo — inclusive
  // reabrir um versículo JÁ grifado passa primeiro pela etapa de cor
  // (com a cor atual já marcada, ver colorSwatchPickRow abaixo), só
  // revelando a anotação salva quando a pessoa toca o lápis de novo.
  const showComposer = wantsToAnnotate

  const [text, setText] = useState(editingHighlight?.text ?? '')
  const [color, setColor] = useState(editingHighlight?.color ?? DEFAULT_HIGHLIGHT_COLOR)

  // Troca de alvo (editar outro grifo da lista, uma seleção nova chegar, ou
  // avançar da etapa de cor pra de anotação) enquanto a janela já está
  // aberta — reidrata texto/cor do zero, senão ficaria mostrando o
  // rascunho do alvo anterior.
  useEffect(() => {
    setText(editingHighlight?.text ?? '')
    setColor(editingHighlight?.color ?? DEFAULT_HIGHLIGHT_COLOR)
  }, [editingHighlight?.id, selection?.chapter, wantsToAnnotate])

  // Texto de VERDADE do(s) versículo(s) sendo grifado(s) — pedido
  // explícito: a pessoa precisa ver sobre o que está anotando, não só a
  // referência ("Cap. 6:9-13"). Busca via o mesmo fetchBookText de
  // BibleTextPanel (cache em memória por versão+livro — chamar de novo
  // aqui não repete a rede se aquele painel já carregou o mesmo livro).
  const previewBook = editingHighlight?.book ?? heroBook
  const previewBookEn = editingHighlight?.bookEn ?? heroBookEn
  const previewChapter = editingHighlight?.chapter ?? selection?.chapter
  const previewVerses = editingHighlight ? editingHighlight.verses : (selection ? [...selection.verses].sort((a, b) => a - b) : [])
  const previewVersesKey = previewVerses.join(',')
  const [previewText, setPreviewText] = useState('')
  useEffect(() => {
    if (!showComposer || !previewChapter || !previewVersesKey) { setPreviewText(''); return }
    let cancelled = false
    const versionId = getSelectedVersionId(lang)
    const bookKey = lang === 'en' ? previewBookEn : previewBook
    fetchBookText(versionId, bookKey).then(chapters => {
      if (cancelled) return
      const chapterData = chapters[String(previewChapter)]
      if (!chapterData) { setPreviewText(''); return }
      const joined = previewVersesKey.split(',').map(v => chapterData.verses[v] ?? '').join(' ').replace(/\n/g, ' ')
      setPreviewText(joined)
    }).catch(() => { if (!cancelled) setPreviewText('') })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComposer, previewBook, previewBookEn, previewChapter, previewVersesKey, lang])

  if (!selection && !editingHighlight) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={styles.aiChatScopeNote}>{t('reading.highlightEmptyHint', undefined, lang)}</p>
        {existingHighlights?.length > 0 && (
          <>
            <p style={styles.highlightListTitle}>{t('reading.highlightYourNotes', undefined, lang)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
              {existingHighlights.map(h => (
                <button key={h.id} style={styles.highlightListItem} onClick={() => onEditExisting(h.id)}>
                  <span style={styles.highlightListRefRow}>
                    <span style={{ ...styles.highlightColorDot, background: HIGHLIGHT_COLORS.find(c => c.id === h.color)?.swatch ?? HIGHLIGHT_COLORS[0].swatch }} />
                    <span style={styles.highlightListRef}>{chLabel} {h.chapter}:{formatVerseRanges(h.verses)}</span>
                  </span>
                  <span style={styles.highlightListText}>{h.text || t('reading.highlightNoNoteYet', undefined, lang)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Etapa de cor — seleção nova, ainda sem decidir anotar (estado 2). Bem
  // enxuta de propósito (retângulo pequeno, ancorado perto do toque, ver
  // AnchoredHighlightPopup): sem repetir a citação do versículo aqui — ele
  // já está visível na tela, por trás/ao redor do próprio popup.
  if (!showComposer) {
    const pickLabel = isEditing
      ? `${chLabel} ${editingHighlight.chapter}:${formatVerseRanges(editingHighlight.verses)}`
      : t('reading.markVerses', { n: selection.verses.size }, lang)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={styles.highlightBoxLabel}>
          <AppIcon name="Highlighter" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {pickLabel}
        </p>
        <div style={styles.colorSwatchPickRow}>
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onQuickColor(c.id)}
              aria-label={t(c.labelKey, undefined, lang)}
              style={{ ...styles.colorSwatch, background: c.swatch, ...(isEditing && editingHighlight.color === c.id ? styles.colorSwatchActive : {}) }}
            />
          ))}
        </div>
        <button style={styles.highlightAddNoteBtn} onClick={onWantsToAnnotate}>
          <AppIcon name="PenLine" size={14} /> {t('reading.highlightAddNote', undefined, lang)}
        </button>
      </div>
    )
  }

  // Editor completo — grifo novo (com anotação) ou editando um já salvo.
  // Aqui SIM mostra a citação do trecho (pedido explícito: saber sobre o
  // que está anotando) — o popup já cresceu um pouco pra caber isso mais
  // a textarea, então pode estar cobrindo o próprio versículo na tela.
  const countLabel = editingHighlight
    ? `${chLabel} ${editingHighlight.chapter}:${formatVerseRanges(editingHighlight.verses)}`
    : `${chLabel} ${selection.chapter}:${formatVerseRanges([...selection.verses])}`

  return (
    // flex:1 + minHeight:0 + overflowY:auto: dentro da folha (altura
    // travada em 52vh, ver highlightListSheetWindow), sem isso o conteúdo
    // (citação + cor + textarea + Salvar) só cresce naturalmente e o
    // overflow:hidden do avô esconde o que não coube — inclusive o botão
    // Salvar, sem jeito nenhum de rolar até ele. Com isso, é este bloco
    // (não a folha inteira) que rola quando o texto grande deixa tudo alto
    // demais pra caber de uma vez.
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <p style={styles.highlightBoxLabel}>
        <AppIcon name="Highlighter" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        {countLabel}
      </p>
      {previewText && <p style={styles.highlightPreviewText}>“{previewText}”</p>}
      <div style={styles.colorSwatchSmallRow}>
        {HIGHLIGHT_COLORS.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setColor(c.id)}
            aria-label={t(c.labelKey, undefined, lang)}
            style={{ ...styles.colorSwatchSmall, background: c.swatch, ...(color === c.id ? styles.colorSwatchSmallActive : {}) }}
          />
        ))}
      </div>
      <textarea
        style={{ ...styles.notesTextarea, marginBottom: 0, maxHeight: 130, overflowY: 'auto' }}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('reading.highlightNotePlaceholder', undefined, lang)}
        rows={3}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          style={{ ...styles.notesSaveBtn, width: 'auto', flex: 1, marginBottom: 0 }}
          onClick={() => (editingHighlight ? onSaveEdit(text, color) : onSaveNew(text, color))}
          disabled={!editingHighlight && !text.trim()}
        >
          {t('reading.highlightSave', undefined, lang)}
        </button>
        {editingHighlight && (
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
  heroTagDot:  { display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--or)', marginLeft: 5 },
  // Cabeçalho compacto da navegação livre (mode 'browse') — substitui o
  // hero grande: sem título/barra de progresso/gradiente, só voltar + nome
  // do livro + as mesmas abas de Contexto/Mapa/Notas/Curiosidades.
  browseHeader:    { padding: '12px 14px 6px', display: 'flex', flexDirection: 'column', gap: 4 },
  browseBackBtn:   { width: 32, height: 32, borderRadius: '50%', border: '0.5px solid var(--g2)', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginBottom: 6 },
  browseHeaderCycle:{ fontSize: 9.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 1.2, textTransform: 'uppercase' },
  browseHeaderTitle:{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, fontStyle: 'italic', color: 'var(--bk)', letterSpacing: '-0.2px' },
  browseHeaderSub: { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)' },
  browseTagsRow:   { display: 'flex', gap: 7, overflowX: 'auto', marginTop: 6 },
  browseTag:       { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 20, padding: '5px 10px', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: 'var(--g5)', cursor: 'pointer' },
  browseTagActive: { background: 'var(--grad-primary)', border: '0.5px solid transparent', color: 'white', boxShadow: '0 4px 12px rgba(157,67,0,.3)' },
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
  verseTapTarget:  { cursor: 'pointer' },
  verseSelected:   { background: 'rgba(201,154,74,.14)', borderRadius: 3, outline: '1px dashed rgba(201,154,74,.7)', outlineOffset: 1 },
  verseAnnotatedUnderline: { textDecorationLine: 'underline', textDecorationColor: 'rgba(0,0,0,.38)', textDecorationThickness: 1.5, textUnderlineOffset: 3 },
  highlightBoxLabel:{ fontSize: 10.5, fontWeight: 700, color: 'var(--brand-deep)', display: 'flex', alignItems: 'center' },
  highlightDeleteBtn:{ width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--rel)', border: '0.5px solid rgba(220,38,38,.25)', borderRadius: 11, color: 'var(--re)', cursor: 'pointer' },
  highlightListTitle:{ fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', letterSpacing: 0.4, textTransform: 'uppercase', margin: '2px 0 0' },
  highlightListItem:{ width: '100%', textAlign: 'left', background: 'var(--olt)', border: '0.5px solid var(--gold-soft)', borderRadius: 12, padding: '9px 11px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', gap: 2 },
  highlightListRefRow: { display: 'flex', alignItems: 'center', gap: 5 },
  highlightListRef: { fontSize: 9.5, fontWeight: 700, color: 'var(--brand-deep)' },
  highlightListText:{ fontSize: 11.5, fontWeight: 500, color: 'var(--bk)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  // Bolinha de cor — mesma cor sólida (swatch) usada nos seletores, só
  // pequena, pra identificar de relance a cor de cada grifo salvo na lista.
  highlightColorDot: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  // Seletor de cor GRANDE (etapa 1, escolher rápido sem escrever nada) —
  // círculos maiores, mais fáceis de tocar, já que é a interação principal
  // dessa etapa.
  colorSwatchPickRow: { display: 'flex', gap: 12, justifyContent: 'center', padding: '4px 0 2px' },
  colorSwatch: { width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, boxShadow: '0 2px 6px rgba(0,0,0,.15)', flexShrink: 0 },
  // Anel indicando a cor JÁ ativa (reabrindo um grifo existente) — mesmo
  // espírito do colorSwatchSmallActive do editor completo, só num círculo
  // maior.
  colorSwatchActive: { boxShadow: '0 0 0 2.5px var(--bk), 0 2px 6px rgba(0,0,0,.15)' },
  // Seletor de cor PEQUENO (dentro do editor/composer, pra trocar a cor sem
  // sair da tela de escrever) — mais discreto, um círculo com contorno
  // marca qual está selecionada agora.
  colorSwatchSmallRow: { display: 'flex', gap: 8 },
  colorSwatchSmall: { width: 22, height: 22, borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0 },
  colorSwatchSmallActive: { border: '2px solid var(--bk)', boxShadow: '0 0 0 2px white inset' },
  highlightAddNoteBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 11, padding: 10, fontSize: 12, fontWeight: 700, color: 'var(--bk)', cursor: 'pointer', fontFamily: 'var(--font)' },
  // Trecho de verdade sendo grifado, mostrado dentro do editor — pra pessoa
  // lembrar do que está falando sem precisar sair pra conferir (pedido
  // explícito: "deixar o texto visível pra saber sobre o que está
  // anotando"). Itálico + aspas, mesmo espírito de uma citação.
  highlightPreviewText: { fontSize: 12, fontWeight: 500, fontStyle: 'italic', color: 'var(--g6)', lineHeight: 1.45, background: 'var(--g1)', borderRadius: 10, padding: '8px 10px', margin: 0 },

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
  // Lápis de grifar — mesmo FAB, empilhado em cima do da IA (mesmo `right`,
  // `bottom` maior em 52px do botão + 12px de respiro). Cor dourada/marrom
  // (var(--brand-deep)), mesmo tom já usado em highlightBoxLabel, pra
  // sinalizar "isso é sobre marcar o texto" — cor diferente da roxa da IA,
  // mesmo formato/tamanho.
  highlightFab: { position: 'absolute', right: 16, bottom: 'calc(var(--nav-height) + 16px + 64px)', width: 52, height: 52, borderRadius: '50%', border: 'none', background: 'var(--brand-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 24px rgba(157,67,0,.4)', pointerEvents: 'auto' },

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

  // Folha do FAB (lista de grifos já feitos, sem versículo específico pra
  // ancorar) — mesma família visual de aiChatOverlayWindow, só mais baixa
  // ("não tão grande" vale pra ela também, ver plano) em vez da altura
  // fixa de 72vh usada pelo chat de IA.
  highlightListSheetWindow: { width: '100%', maxWidth: 'var(--max-width)', height: 'auto', maxHeight: '52vh', background: 'var(--white)', borderRadius: '24px 24px 0 0', boxShadow: '0 -12px 40px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },

  // Popup ancorado (ver AnchoredHighlightPopup) — fecha via listener no
  // document (não uma camada cobrindo a tela, ver handleOutsideClick), pra
  // deixar passar toque num outro versículo (soma à seleção) e gestos de
  // rolagem, sem escurecer nada (o versículo grifado precisa continuar
  // visível, diferente de aiChatOverlayBackdrop).
  highlightPopup: { position: 'fixed', zIndex: 201, width: 252, maxWidth: 'calc(100vw - 20px)', maxHeight: '46vh', overflowY: 'auto', background: 'var(--white)', borderRadius: 16, boxShadow: '0 12px 32px rgba(0,0,0,.22), 0 0 0 0.5px rgba(0,0,0,.06)', padding: '14px 14px 12px' },
  highlightPopupClose: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
}
