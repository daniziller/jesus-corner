// JourneyScreen.jsx — "Bíblia" (reskin Bento — tela 5f, leitura livre)
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { sessionKeys, computeBookChapterCounts } from '../utils/progress'
import { computeMetricsBlocks, computeTestamentTotals } from '../data/metricsBlocks'
import { getFreeReadingPosition } from '../bible/freeReadingPositionStore'
import { relativeDayPeriod } from '../bible/relativeDayPeriod'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import BibleVersionChip from '../components/bible/BibleVersionChip'
import { formatPercent } from '../bible/formatPercent'
import { saveSermonNote } from '../notes/sermonNotesStore'
import { postToRoom } from '../groups/chapterRoomStore'
import { getGroupMemberCounts } from '../groups/groupsStore'
import { avatarPaletteFor } from './ChapterRoomScreen'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { formatWeekdayDate } from '../utils/weekdayDateLabel'
import { dateKey } from '../utils/dateKey'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'
import BookChapterScreen from './BookChapterScreen'
import SearchResultsScreen from './SearchResultsScreen'
import ThemeAsStudyScreen from './ThemeAsStudyScreen'
import { getThemeById } from '../bible/themes'

const SERMON_NOTE_TYPES = ['sermon', 'service', 'class', 'lecture', 'video']
function sermonTypeLabel(type, lang) {
  if (type === 'sermon') return t('notes.typeSermon', undefined, lang)
  return t(`sermonNote.type${type[0].toUpperCase()}${type.slice(1)}`, undefined, lang)
}

// "Você está em Gênesis 41" (progresso real) ou "Mateus é um bom começo"
// (zero progresso ainda) — quadro 28a. blocksSubset = os 4 blocos de um
// testamento (blocks 1–4 = AT, 5–8 = NT), na ordem canônica.
function testamentStatusLine(blocksSubset, completedSet, bookChapterCounts, lang) {
  const hasAnyProgress = blocksSubset.some(block => block.books.some(book => {
    const total = bookChapterCounts[book] ?? 0
    for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${book}:${ch}`)) return true
    return false
  }))
  if (!hasAnyProgress) {
    const firstBlock = blocksSubset[0]
    return { started: false, book: lang === 'en' ? firstBlock.booksEn[0] : firstBlock.books[0] }
  }
  for (const block of blocksSubset) {
    for (let i = 0; i < block.books.length; i++) {
      const book = block.books[i]
      const total = bookChapterCounts[book] ?? 0
      for (let ch = 1; ch <= total; ch++) {
        if (!completedSet.has(`${book}:${ch}`)) {
          return { started: true, book: lang === 'en' ? block.booksEn[i] : book, chapter: ch }
        }
      }
    }
  }
  // Testamento inteiro já lido — mostra onde ele termina.
  const lastBlock = blocksSubset[blocksSubset.length - 1]
  const lastIdx = lastBlock.books.length - 1
  const lastBook = lastBlock.books[lastIdx]
  return {
    started: true,
    book: lang === 'en' ? lastBlock.booksEn[lastIdx] : lastBook,
    chapter: bookChapterCounts[lastBook] ?? 0,
  }
}

// Achata os livros de um subconjunto de blocos numa lista única — reaproveitado
// tanto pela busca quanto pelas seções de testamento (Antigo/Novo). A ordem
// dos blocos passados já é a ordem canônica/bíblica dentro daquele
// testamento (blocks 1→4 = AT, 5→8 = NT), então concatenar na ordem em que
// os blocos chegam já dá a ordem bíblica, sem precisar de uma lista própria.
function flattenBooks(blocksSubset, lang) {
  return blocksSubset.flatMap(block => {
    const names = lang === 'en' ? block.booksEn : block.books
    return names.map((displayName, i) => ({ displayName, canonicalName: block.books[i], block }))
  })
}

// Rótulo do chip/cabeçalho de seção (39b) — o quadro mostra só "Profetas"
// pro bloco 4 (Livros Proféticos, maiores+menores juntos — bibleBlocks.js
// já os une num bloco só, diferente do agrupamento à parte que
// metricsBlocks.js usa só pra Progresso); os outros três blocos do Antigo
// e todos os do Novo já usam block.shortName tal e qual.
function sectionLabelFor(block, lang) {
  if (block.id === 4) return lang === 'en' ? 'Prophets' : 'Profetas'
  return lang === 'en' ? block.shortNameEn ?? block.nameEn : block.shortName ?? block.name
}

export default function JourneyScreen({
  session, authUser, blocks, sessionsByBlock, browseSessionsByBlock, completedSet,
  onToggleSession, onToggleChapter, onMarkChaptersManually, initialBlockId, entryMode, resumeSessionId, browseJumpTarget, onBrowseJumpConsumed, onNavigate, onContinueSession, onGoToReflectionFrom, onExitGuided, onExitReading, onOpenGroupRoom, onPastRootChange, onBuildThemeStudy,
}) {
  const { lang } = session
  const [searchQuery, setSearchQuery] = useState('')
  // 39k (Bloco 6) — string quando a busca de verdade está aberta (Enter no
  // campo acima), null quando não. 39l (themeOpenId) empilha POR CIMA de
  // 39k (não substitui: "‹" de 39l volta pra 39k com a mesma busca).
  const [searchOpen, setSearchOpen] = useState(null)
  const [themeOpenId, setThemeOpenId] = useState(null)
  // Seletor de versão (39b/39c cabeçalho, regra 3 da aba inteira: "vale
  // pra aba toda"). Só 1 versão por idioma hoje — ver BibleVersionChip.jsx.
  const [versionId, setVersionId] = useState(() => getSelectedVersionId(lang))

  // Qual testamento está visível agora — reskin Bento: em vez de duas
  // seções em acordeão (Antigo e Novo, cada uma abrindo/fechando por si),
  // vira um cartão só com um link pra trocar de lado (ver mockup 5f,
  // "Novo →"). Volta pro testamento certo sozinho ao voltar de um livro
  // (ver lastViewedBlockId) ou pular pra um vindo de fora da lista.
  const [testament, setTestament] = useState('at')
  // Bloco 5 do redesign (28a/28b): a aba abre nos DOIS testamentos, do
  // mesmo tamanho — não mais um cartão só com link "Novo →". Tocar
  // "Abrir" num deles entra na lista de livros (28b, testamentEntered);
  // "‹" na lista volta pros dois cartões. Buscar pula os dois estágios
  // (mesmo comportamento de sempre — ver gridBooks abaixo).
  const [testamentEntered, setTestamentEntered] = useState(false)
  // Chips de grupo dentro da lista de livros (28b: "Todos os 39 /
  // Pentateuco / Históricos / Poéticos / Proféticos") — reseta ao trocar
  // de testamento ou entrar de novo.
  const [blockFilter, setBlockFilter] = useState('all')
  function enterTestament(which) {
    setTestament(which)
    setBlockFilter('all')
    setTestamentEntered(true)
  }

  // Bloco "aberto" (visão de leitura) — null significa visão geral (mapa de
  // blocos). Quando entryMode é 'reading' (ex: botão "Continuar sessão" na
  // Home/Rotina), já abre direto no bloco ativo, featurando a mesma sessão
  // do plano exibida lá (resumeSessionId), em vez do mapa — e nesse caso a
  // leitura mostra a divisão em sessões do plano ("mode" abaixo). Qualquer
  // outra forma de entrar (busca, tocar num bloco/livro) é navegação livre
  // pela Bíblia, sem sessão nenhuma — só capítulo a capítulo.
  const [expandedBlockId, setExpandedBlockId] = useState(entryMode === 'reading' ? initialBlockId : null)
  const [initialSessionId, setInitialSessionId] = useState(entryMode === 'reading' ? resumeSessionId : null)
  const [readingMode, setReadingMode] = useState(entryMode === 'reading' ? 'session' : 'browse')
  // Só true quando abrindo um capítulo que a pessoa JÁ tinha escolhido ler
  // antes (ver RecentChaptersRow/openRecentChapter abaixo) — nesse caso faz
  // sentido já cair lendo, diferente de abrir um livro do zero (onOpenBook),
  // que mostra só os números dos capítulos pra escolher (ver ReadingBlockView.jsx).
  const [initialTextOpen, setInitialTextOpen] = useState(false)
  // Bloco de onde a pessoa acabou de voltar (fluxo guiado, ver closeBlock)
  // OU pro qual acabou de pular um livro (navegação livre, ver expandBook
  // abaixo) — nos dois casos, só serve pra garantir que o testamento certo
  // (Antigo/Novo) já esteja selecionado no cartão de mapa.
  const [lastViewedBlockId, setLastViewedBlockId] = useState(null)

  // Segue lastViewedBlockId sozinho — nunca precisa de toque manual depois
  // de voltar de um livro ou pular pra um vindo de fora da lista (blocks
  // 1–4 = Antigo, 5–8 = Novo).
  useEffect(() => {
    if (lastViewedBlockId != null) setTestament(lastViewedBlockId <= 4 ? 'at' : 'nt')
  }, [lastViewedBlockId])

  // Livro aberto (quadro 18a: Página do livro) — chave `${blockId}:${bookName}`,
  // navega pra uma tela própria (BookChapterScreen) em vez de expandir
  // inline na lista, como antes do reskin Bento.
  const [expandedBookKey, setExpandedBookKey] = useState(null)
  const [expandedInitialSessionId, setExpandedInitialSessionId] = useState(null)
  const [expandedInitialTextOpen, setExpandedInitialTextOpen] = useState(false)
  // 39k/39l (Bloco 6): tocar um cartão de busca/tema chega aqui já com um
  // versículo pra focar — ver initialFocusVerse em ReadingBlockView.jsx.
  const [expandedInitialFocusVerse, setExpandedInitialFocusVerse] = useState(null)

  // Folha de sermão flutuante (34d/34e/34f, handoff-app-completo) — mora
  // NESTA tela (não em ReadingBlockView.jsx): README, 34e — "arrastável,
  // vive nas duas leituras e na Bíblia inteira" — precisa sobreviver a
  // navegar entre a raiz/grade de livros e a leitura de um capítulo, não
  // só existir enquanto um capítulo específico está aberto. Mesmo padrão
  // de estado próprio + portal do chat de IA (ReadingBlockView.jsx), só
  // que um nível acima. Só um draft por vez: `sermonDraft` null = nada em
  // andamento; `sermonNoteOpen` decide se é a folha inteira (34d, com
  // "de onde veio"/34f ou "grupo" trocando o conteúdo) ou só o selo + FAB
  // minimizados (34e). "Salvar" persiste (sermonNotesStore.js) e posta
  // nos grupos marcados (se o toggle "compartilhar" estiver ligado —
  // desligado por padrão, mesmo padrão de 39f/VerseAnnotateScreen) — só
  // aí encerra a sessão flutuante; "Minimizar" esconde sem perder o draft.
  const [sermonDraft, setSermonDraft] = useState(null)
  const [sermonNoteOpen, setSermonNoteOpen] = useState(false)
  const [sermonSourceOpen, setSermonSourceOpen] = useState(false)
  const [sermonGroupPickerOpen, setSermonGroupPickerOpen] = useState(false)
  const [sermonShareOn, setSermonShareOn] = useState(false)
  const [sermonSelectedGroupIds, setSermonSelectedGroupIds] = useState([])
  const [sermonSaving, setSermonSaving] = useState(false)
  const [sermonGroupMemberCounts, setSermonGroupMemberCounts] = useState({})
  useEffect(() => {
    if (!sermonGroupPickerOpen || !session.myGroups?.length) return
    let cancelled = false
    getGroupMemberCounts(session.myGroups.map(g => g.groupId)).then(counts => { if (!cancelled) setSermonGroupMemberCounts(counts) }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sermonGroupPickerOpen])
  // "Na tela agora" (34d) — reportado de baixo pra cima por quem estiver
  // mostrando texto de capítulo agora (ReadingBlockView.jsx, ver
  // onActiveChapterChange), null quando nenhum capítulo está aberto (39a/
  // 39b/39c) — nesse caso o botão "+ {ref}" simplesmente não aparece.
  const [sermonActiveChapterRef, setSermonActiveChapterRef] = useState(null)
  // Posição arrastada do FAB (34e, "arrastável") — deslocamento a partir
  // da posição padrão (canto inferior direito), só nesta visita à aba;
  // não persiste entre sessões (não há quadro pedindo isso).
  const [sermonFabDrag, setSermonFabDrag] = useState({ x: 0, y: 0 })

  function startNewSermonNote() {
    setSermonDraft({
      id: `sermon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(), date: dateKey(),
      noteType: 'sermon', title: '', preacher: '', church: '', link: '',
      passages: [], text: '',
    })
    setSermonSourceOpen(false)
    setSermonGroupPickerOpen(false)
    setSermonShareOn(false)
    setSermonSelectedGroupIds([])
    setSermonNoteOpen(true)
  }

  function patchSermonDraft(patch) {
    setSermonDraft(prev => prev ? { ...prev, ...patch } : prev)
  }

  function passageRefLabel(p) {
    const bookLabel = lang === 'en' ? (p.bookEn ?? p.book) : p.book
    const range = p.verseStart ? `:${p.verseStart}${p.verseEnd && p.verseEnd !== p.verseStart ? `-${p.verseEnd}` : ''}` : ''
    return `${bookLabel} ${p.chapter}${range}`
  }

  function addOnScreenVerse() {
    if (!sermonActiveChapterRef) return
    const ref = sermonActiveChapterRef
    setSermonDraft(prev => {
      if (!prev) return prev
      const exists = prev.passages.some(p => p.book === ref.book && p.chapter === ref.chapter && p.verseStart === ref.verseStart && p.verseEnd === ref.verseEnd)
      if (exists) return prev
      return { ...prev, passages: [...prev.passages, ref] }
    })
  }

  function removeSermonVerse(idx) {
    setSermonDraft(prev => prev ? { ...prev, passages: prev.passages.filter((_, i) => i !== idx) } : prev)
  }

  function toggleSermonGroup(groupId) {
    setSermonSelectedGroupIds(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId])
  }

  function sermonSourceLine() {
    if (!sermonDraft) return ''
    return [sermonTypeLabel(sermonDraft.noteType, lang), sermonDraft.preacher, sermonDraft.church].filter(Boolean).join(' · ')
  }

  // "Salvar" (34d) — persiste em sermonNotesStore.js (mesmo registro que
  // NotesScreen.jsx/Biblioteca já lê e edita); se "compartilhar com grupo"
  // estiver ligado (34d → "Grupo" → mesma escolha de 39f, desligada por
  // padrão), posta o texto na sala de cada grupo marcado, no capítulo da
  // 1ª passagem citada (ou o que está na tela agora, sem passagem
  // nenhuma) — sem sala pra postar (nenhuma passagem e nada na tela), só
  // pula a postagem, não trava o salvamento da nota em si.
  async function saveSermonDraft() {
    if (!sermonDraft || sermonSaving) return
    if (!sermonDraft.text.trim() && !sermonDraft.title.trim()) return
    setSermonSaving(true)
    try {
      await saveSermonNote(authUser?.email, {
        id: sermonDraft.id, date: sermonDraft.date, createdAt: sermonDraft.createdAt,
        updatedAt: new Date().toISOString(), noteType: sermonDraft.noteType,
        title: sermonDraft.title.trim(), preacher: sermonDraft.preacher.trim(),
        church: sermonDraft.church.trim(), link: sermonDraft.link.trim(),
        passages: sermonDraft.passages, text: sermonDraft.text.trim(),
      })
      if (sermonShareOn && sermonSelectedGroupIds.length > 0) {
        const target = sermonDraft.passages[0] ?? sermonActiveChapterRef
        if (target) {
          const body = [sermonDraft.title.trim(), sermonDraft.text.trim()].filter(Boolean).join('\n\n')
          await Promise.allSettled(sermonSelectedGroupIds.map(groupId => postToRoom(groupId, target.book, target.chapter, body)))
        }
      }
      setSermonNoteOpen(false)
      setSermonSourceOpen(false)
      setSermonGroupPickerOpen(false)
      setSermonDraft(null)
    } catch (err) {
      console.error('Failed to save sermon note', err)
    } finally {
      setSermonSaving(false)
    }
  }

  // "Compartilhar" (34d, rodapé) — sem canvas próprio pra este pacote
  // (diferente de dayCompleteImage.js/verseShareImage.js, que têm spec de
  // imagem própria): compartilha o texto puro (Web Share API — que já
  // deixa escolher enviar como texto pro Instagram/WhatsApp/etc., mesmo
  // sem imagem —, com fallback pra área de transferência). O README pede
  // "texto ou imagem"; a variante em imagem fica pendente de um layout
  // próprio (nenhum quadro mostra o cartão) — disclosed, não fingida.
  async function shareSermonDraft() {
    if (!sermonDraft) return
    const text = [
      sermonDraft.title.trim() || t('sermonNote.newTitle', undefined, lang),
      sermonSourceLine(),
      sermonDraft.text.trim(),
      sermonDraft.passages.length > 0 ? sermonDraft.passages.map(passageRefLabel).join(', ') : null,
    ].filter(Boolean).join('\n\n')
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ text }) } catch { /* pessoa cancelou o seletor — não é erro */ }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  // Arrasto do FAB (34e, "arrastável") — diferença de posição em relação
  // ao ponto onde o toque começou; um deslocamento total menor que 6px
  // conta como toque (abre a folha), não como arrasto, mesmo limiar que
  // qualquer gesto de toque-vs-arrasto no navegador.
  const dragState = useRef(null)
  function handleFabPointerDown(e) {
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: sermonFabDrag.x, baseY: sermonFabDrag.y, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function handleFabPointerMove(e) {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragState.current.moved = true
    setSermonFabDrag({ x: dragState.current.baseX + dx, y: dragState.current.baseY + dy })
  }
  function handleFabPointerUp() {
    const moved = dragState.current?.moved
    dragState.current = null
    if (!moved) setSermonNoteOpen(true)
  }

  // "Barra de abas fixa só em 39a" — avisa App.jsx assim que a navegação
  // livre sai da raiz (39b, 39c, ou a leitura embutida dentro de 39c),
  // pra ele esconder a barra igual já faz com a leitura guiada. Roda de
  // novo no desmonte (voltar pra outra aba) — sem isso, journeyPastRoot
  // ficaria "true" preso em App.jsx entre uma visita e a próxima.
  useEffect(() => {
    onPastRootChange?.(testamentEntered || expandedBookKey != null)
    return () => onPastRootChange?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testamentEntered, expandedBookKey])

  // O botão "Ir para a leitura de hoje" (Rotina) chama onContinueSession
  // mesmo com a tela já montada (usuário já está na aba Bíblia) — os
  // estados acima só rodam no useState inicial (na primeira montagem),
  // então esse efeito cobre a navegação pra quem já estava aqui.
  useEffect(() => {
    if (entryMode === 'reading') {
      setExpandedBlockId(initialBlockId)
      setInitialSessionId(resumeSessionId)
      setReadingMode('session')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryMode, initialBlockId, resumeSessionId])

  // Expande um livro inline na lista — usado tanto por um toque direto na
  // própria linha (openBook abaixo) quanto por um pulo vindo de fora dela
  // (jumpToBook abaixo). Guarda o bloco real (não um id sintético) pra
  // manter compatível o "onde parei"/"lidos recentemente" (lastOpenedChapterStore/
  // recentChaptersStore, gravados por ReadingBlockView.jsx usando block.id).
  function expandBook(block, bookName, sessionIdToFeature, textOpen, focusVerse) {
    setExpandedBookKey(`${block.id}:${bookName}`)
    setExpandedInitialSessionId(sessionIdToFeature)
    setExpandedInitialTextOpen(textOpen)
    setExpandedInitialFocusVerse(focusVerse ?? null)
    setLastViewedBlockId(block.id)
  }

  // Abre um capítulo/versículo específico vindo de FORA da navegação livre
  // normal (39k/39l, Bloco 6: cartão de versículo/trecho) — acha o bloco a
  // partir do NOME do livro (`blocks` já é a lista fixa de sempre) e cai
  // direto na leitura, no capítulo certo, com o versículo em foco.
  function openChapterFromSearch(book, chapter, verse) {
    const block = blocks.find(b => b.books.includes(book))
    if (!block) return
    const sessions = browseSessionsByBlock[block.id] ?? []
    const target = sessions.find(sn => sn.book === book && sn.chStart <= chapter && chapter <= sn.chEnd)
    setSearchOpen(null)
    setThemeOpenId(null)
    expandBook(block, book, target?.id ?? null, true, verse != null ? { chapter, verse } : null)
  }

  // Pulo pra um livro vindo de FORA da lista de livros visível agora
  // ("Continuar leitura", card de "lido recentemente") — limpa a busca
  // (a tela do livro, 18a, não depende da lista continuar visível).
  function jumpToBook(block, bookName, sessionIdToFeature, textOpen) {
    setSearchQuery('')
    expandBook(block, bookName, sessionIdToFeature, textOpen)
  }

  // Tocar um card de "lido recentemente" (RecentChaptersRow) — diferente de
  // abrir um livro do zero, aqui já cai lendo o capítulo exato, sem passar
  // pela lista de números primeiro (ver initialTextOpen acima).
  function openRecentChapter(blockId, sessionId) {
    const block = blocks.find(b => b.id === blockId)
    const targetSession = browseSessionsByBlock[blockId]?.find(s => s.id === sessionId)
    if (!block || !targetSession) return
    jumpToBook(block, targetSession.book, sessionId, true)
  }

  // Link "ir pro texto" de uma anotação de sermão (ver App.jsx/
  // openBiblePassage) — objeto novo a cada pedido, então todo pedido roda
  // este efeito de novo mesmo pra pular pro MESMO capítulo de antes. Avisa
  // App.jsx que já consumiu (onBrowseJumpConsumed limpa o state lá) — sem
  // isso, o pedido ficava "pendente" pra sempre e essa tela pulava pro
  // mesmo capítulo de novo em TODA montagem futura (qualquer visita à aba
  // Bíblia depois de usar o link uma vez, não só via botão Voltar).
  // openSermonNote (34a/34d) pede pra já cair com a folha de sermão
  // aberta — a folha mora nesta tela (não em ReadingBlockView.jsx: README
  // "vive... na Bíblia inteira"), então abre direto aqui, sem precisar
  // encadear um prop pelas telas de baixo.
  useEffect(() => {
    if (browseJumpTarget) {
      openRecentChapter(browseJumpTarget.blockId, browseJumpTarget.sessionId)
      if (browseJumpTarget.openSermonNote) startNewSermonNote()
      onBrowseJumpConsumed?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browseJumpTarget])

  function closeBlock() {
    // Leitura imersiva (redesign 1b): a seta ← do cabeçalho não volta pro
    // mapa de blocos (a barra de navegação está escondida — a pessoa
    // ficaria presa) — sai da leitura de volta pra onde veio (Home/Oração).
    if (entryMode === 'reading' && onExitReading) {
      onExitReading()
      return
    }
    // Guarda de qual bloco a pessoa estava saindo — usado só pra decidir
    // qual testamento (Antigo/Novo) volta selecionado no cartão de mapa.
    // Sem isso, o cartão sempre voltava no Antigo Testamento, e quem
    // tinha acabado de ler algo do Novo perdia o lugar.
    setLastViewedBlockId(expandedBlockId)
    setExpandedBlockId(null)
    setInitialSessionId(null)
  }

  // Volta da página do livro (18a, BookChapterScreen) pro mapa/grade —
  // mesma guarda de testamento que closeBlock acima.
  function closeBook() {
    setLastViewedBlockId(expandedBookKey ? Number(expandedBookKey.split(':')[0]) : lastViewedBlockId)
    setExpandedBookKey(null)
    setExpandedInitialSessionId(null)
    setExpandedInitialFocusVerse(null)
  }

  // Toque direto numa sigla de livro (grade de 5f ou busca) — navega pra
  // 18a (BookChapterScreen), já com o 1º capítulo pendente (ou o 1º do
  // livro) em destaque — sempre pela divisão "1 capítulo = 1 sessão"
  // (browseSessionsByBlock), já que isso é sempre navegação livre, nunca o
  // fluxo guiado da Rotina.
  function openBook(block, bookName) {
    const sessions = browseSessionsByBlock[block.id]
    const bookSessions = sessions.filter(s => s.book === bookName)
    const target = bookSessions.find(s => sessionKeys(s).some(k => !completedSet.has(k))) ?? bookSessions[0]
    expandBook(block, bookName, target?.id ?? null, false)
  }

  // Selo + FAB (34e) + folha (34d/34f/escolha de grupo) — anexado em TODA
  // saída desta tela (README: "vive... na Bíblia inteira"), não só quando
  // um capítulo está aberto. Portal pro <body>, mesmo truque de
  // centralização de .bottom-nav (ver estilos, no fim do arquivo).
  function renderSermonWidget() {
    return (
      <>
        {sermonDraft && !sermonNoteOpen && createPortal(
          <div style={styles.sermonMiniWrap}>
            <button type="button" style={styles.sermonMiniPill} onClick={() => setSermonNoteOpen(true)}>
              <span style={styles.sermonMiniDot} />
              <span style={{ minWidth: 0 }}>
                <span style={styles.sermonMiniTitle}>{sermonDraft.title.trim() || t('sermonNote.newTitle', undefined, lang)}</span>
                <span style={styles.sermonMiniSub}>
                  {sermonDraft.passages.length === 0
                    ? t('sermonNote.minimizedAnnotatingNone', undefined, lang)
                    : t(sermonDraft.passages.length === 1 ? 'sermonNote.minimizedAnnotatingOne' : 'sermonNote.minimizedAnnotatingMany', { n: sermonDraft.passages.length }, lang)}
                </span>
              </span>
            </button>
            <button
              type="button" style={{ ...styles.sermonFab, transform: `translate(${sermonFabDrag.x}px, ${sermonFabDrag.y}px)` }}
              onPointerDown={handleFabPointerDown} onPointerMove={handleFabPointerMove} onPointerUp={handleFabPointerUp} onPointerCancel={handleFabPointerUp}
              aria-label={t('sermonNote.newTitle', undefined, lang)}
            >
              <AppIcon name="PenLine" size={19} color="var(--bento-ink)" strokeWidth={2.3} />
              {sermonDraft.passages.length > 0 && <span style={styles.sermonFabBadge}>{sermonDraft.passages.length}</span>}
            </button>
          </div>,
          document.body
        )}

        {sermonNoteOpen && sermonDraft && createPortal(
          <div style={styles.aiChatOverlayBackdrop} onClick={() => setSermonNoteOpen(false)}>
            <div style={styles.aiChatOverlayWindow} onClick={e => e.stopPropagation()}>
              {sermonSourceOpen ? (
                <>
                  <div style={styles.sermonSourceHeader}>
                    <button type="button" style={styles.sermonChevronBtn} onClick={() => setSermonSourceOpen(false)} aria-label={t('sermonNote.ready', undefined, lang)}>
                      <AppIcon name="ChevronDown" size={16} color="var(--bento-ink)" />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.sermonSourceTitle}>{t('sermonNote.fromLabel', undefined, lang)}</p>
                      <p style={styles.sermonSourceDate}>
                        {formatWeekdayDate(sermonDraft.date, lang).replace(/^./, c => c.toUpperCase())} · {new Date(sermonDraft.createdAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button type="button" style={styles.sermonReadyBtn} onClick={() => setSermonSourceOpen(false)}>{t('sermonNote.ready', undefined, lang)}</button>
                  </div>
                  <div style={{ ...styles.aiChatOverlayBody, overflowY: 'auto' }}>
                    <p style={styles.sermonSectionLabel}>{t('sermonNote.whatAreYouNoting', undefined, lang)}</p>
                    <div style={styles.sermonTypeGrid}>
                      {SERMON_NOTE_TYPES.map(type => (
                        <button
                          key={type} type="button"
                          style={{ ...styles.sermonTypePill, ...(sermonDraft.noteType === type ? styles.sermonTypePillOn : {}) }}
                          onClick={() => patchSermonDraft({ noteType: type })}
                        >
                          <span style={{ ...styles.sermonTypeDot, ...(sermonDraft.noteType === type ? styles.sermonTypeDotOn : {}) }} />
                          {sermonTypeLabel(type, lang)}
                        </button>
                      ))}
                    </div>

                    <div style={styles.sermonFieldsHead}>
                      <span style={styles.sermonSectionLabel}>{t('sermonNote.fromLabel', undefined, lang)}</span>
                      <span style={styles.sermonOptionalTag}>{t('sermonNote.fromOptional', undefined, lang)}</span>
                    </div>
                    <div style={styles.sermonFieldsCard}>
                      <label style={styles.sermonFieldRow}>
                        <span style={styles.sermonFieldLabel}>{t('sermonNote.titleFieldLabel', undefined, lang)}</span>
                        <input style={styles.sermonFieldInput} value={sermonDraft.title} placeholder={t('sermonNote.titlePlaceholder', undefined, lang)} onChange={e => patchSermonDraft({ title: e.target.value })} />
                      </label>
                      <label style={{ ...styles.sermonFieldRow, borderTop: '1px solid var(--bento-line)' }}>
                        <span style={styles.sermonFieldLabel}>{t('sermonNote.preacherLabel', undefined, lang)}</span>
                        <input style={styles.sermonFieldInput} value={sermonDraft.preacher} placeholder={t('sermonNote.preacherPlaceholder', undefined, lang)} onChange={e => patchSermonDraft({ preacher: e.target.value })} />
                      </label>
                      <label style={{ ...styles.sermonFieldRow, borderTop: '1px solid var(--bento-line)' }}>
                        <span style={styles.sermonFieldLabel}>{t('sermonNote.institutionLabel', undefined, lang)}</span>
                        <input style={styles.sermonFieldInput} value={sermonDraft.church} placeholder={t('sermonNote.institutionPlaceholder', undefined, lang)} onChange={e => patchSermonDraft({ church: e.target.value })} />
                      </label>
                      <label style={{ ...styles.sermonFieldRow, borderTop: '1px solid var(--bento-line)' }}>
                        <span style={styles.sermonFieldLabel}>{t('sermonNote.linkLabel', undefined, lang)}</span>
                        <input style={styles.sermonFieldInput} value={sermonDraft.link} placeholder={t('sermonNote.linkPlaceholder', undefined, lang)} onChange={e => patchSermonDraft({ link: e.target.value })} />
                      </label>
                    </div>
                  </div>
                </>
              ) : sermonGroupPickerOpen ? (
                <>
                  <div style={styles.sermonSourceHeader}>
                    <button type="button" style={styles.sermonChevronBtn} onClick={() => setSermonGroupPickerOpen(false)} aria-label={t('sermonNote.ready', undefined, lang)}>
                      <AppIcon name="ChevronDown" size={16} color="var(--bento-ink)" />
                    </button>
                    <p style={{ ...styles.sermonSourceTitle, flex: 1, minWidth: 0 }}>{t('room.groupBtn', undefined, lang)}</p>
                    <button type="button" style={styles.sermonReadyBtn} onClick={() => setSermonGroupPickerOpen(false)}>{t('sermonNote.ready', undefined, lang)}</button>
                  </div>
                  <div style={{ ...styles.aiChatOverlayBody, overflowY: 'auto' }}>
                    <div style={styles.sermonFieldsCard}>
                      <div style={{ ...styles.sermonFieldRow, justifyContent: 'space-between' }}>
                        <span style={styles.sermonFieldLabel}>{t('reading.shareInGroupTitle', undefined, lang)}</span>
                        <button
                          role="switch" aria-checked={sermonShareOn} onClick={() => setSermonShareOn(v => !v)}
                          style={{ ...styles.sermonToggle, background: sermonShareOn ? 'var(--bento-ink)' : 'var(--bento-toggle-off)', justifyContent: sermonShareOn ? 'flex-end' : 'flex-start' }}
                        >
                          <span style={{ ...styles.sermonToggleThumb, background: sermonShareOn ? 'var(--bento-accent)' : '#fff' }} />
                        </button>
                      </div>
                    </div>
                    {sermonShareOn && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        {session.myGroups.map(g => {
                          const on = sermonSelectedGroupIds.includes(g.groupId)
                          const palette = avatarPaletteFor(g.groupId)
                          const n = sermonGroupMemberCounts[g.groupId] ?? 0
                          return (
                            <button key={g.groupId} type="button" style={{ ...styles.sermonGroupRow, ...(on ? styles.sermonGroupRowActive : {}) }} onClick={() => toggleSermonGroup(g.groupId)}>
                              <span style={{ ...styles.sermonGroupAvatar, background: palette.bg, color: palette.fg }}>{avatarInitialsOf(g.name)}</span>
                              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                <span style={{ ...styles.sermonGroupName, color: on ? '#fff' : 'var(--bento-ink)' }}>{g.name}</span>
                                <span style={{ ...styles.sermonGroupCount, color: on ? 'rgba(255,255,255,.6)' : 'var(--bento-t3)' }}>
                                  {t(n === 1 ? 'reading.groupMemberOne' : 'reading.groupMemberMany', { n }, lang)}
                                </span>
                              </span>
                              {on ? <AppIcon name="Check" size={16} color="var(--bento-accent)" /> : <span style={styles.sermonGroupCheckEmpty} />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.sermonHeader}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.sermonHeaderTitle}>{sermonDraft.title.trim() || t('sermonNote.newTitle', undefined, lang)}</p>
                      {sermonSourceLine() && <p style={styles.sermonHeaderSub}>{sermonSourceLine()}</p>}
                    </div>
                    <button type="button" style={styles.sermonChevronBtn} onClick={() => setSermonSourceOpen(true)} aria-label={t('sermonNote.fromLabel', undefined, lang)}>
                      <AppIcon name="ChevronDown" size={16} color="var(--bento-ink)" />
                    </button>
                    <button
                      type="button" style={{ ...styles.sermonSaveBtn, ...((sermonSaving || (!sermonDraft.text.trim() && !sermonDraft.title.trim())) ? styles.sermonSaveBtnDisabled : {}) }}
                      disabled={sermonSaving || (!sermonDraft.text.trim() && !sermonDraft.title.trim())}
                      onClick={saveSermonDraft}
                    >
                      {t('sermonNote.save', undefined, lang)}
                    </button>
                  </div>

                  <div style={styles.aiChatOverlayBody}>
                    {sermonActiveChapterRef && (
                      <div style={styles.sermonOnScreenCard}>
                        <div style={styles.sermonOnScreenTop}>
                          <span style={styles.sermonOnScreenLabel}>
                            <span style={styles.sermonOnScreenDiamond} />
                            {t('sermonNote.onScreenNow', undefined, lang)}
                          </span>
                          <button type="button" style={styles.sermonAddVerseBtn} onClick={addOnScreenVerse}>
                            {t('sermonNote.addVerse', { ref: passageRefLabel(sermonActiveChapterRef) }, lang)}
                          </button>
                        </div>
                        {sermonDraft.passages.length > 0 && (
                          <div style={styles.sermonChipsRow}>
                            {sermonDraft.passages.map((p, i) => (
                              <button key={i} type="button" style={styles.sermonChip} onClick={() => removeSermonVerse(i)} aria-label={t('sermonNote.removeVerse', { ref: passageRefLabel(p) }, lang)}>
                                {passageRefLabel(p)} <span style={styles.sermonChipX}>×</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <textarea
                      style={styles.sermonTextarea}
                      value={sermonDraft.text}
                      placeholder={t('sermonNote.textPlaceholder', undefined, lang)}
                      onChange={e => patchSermonDraft({ text: e.target.value })}
                      autoFocus
                    />
                  </div>

                  <div style={styles.sermonFooter}>
                    <button type="button" style={styles.sermonFooterBtn} onClick={() => setSermonNoteOpen(false)}>
                      <AppIcon name="ChevronDown" size={14} color="var(--bento-ink)" strokeWidth={2.3} />
                      {t('sermonNote.minimize', undefined, lang)}
                    </button>
                    {(session.myGroups?.length ?? 0) > 0 && (
                      <button type="button" style={styles.sermonFooterBtn} onClick={() => setSermonGroupPickerOpen(true)}>
                        <AppIcon name="Users" size={14} color="var(--bento-ink)" strokeWidth={2.3} />
                        {t('room.groupBtn', undefined, lang)}
                      </button>
                    )}
                    <button type="button" style={styles.sermonFooterIconBtn} onClick={shareSermonDraft} aria-label={t('sermonNote.share', undefined, lang)}>
                      <AppIcon name="Share2" size={15} color="var(--bento-ink)" strokeWidth={2.2} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
      </>
    )
  }

  if (expandedBlockId != null) {
    // key inclui initialSessionId, não só expandedBlockId — vários livros
    // diferentes moram no MESMO bloco (ex: Evangelhos = Matthew+Mark+Luke+
    // John), então pular de um capítulo de um livro pro de outro dentro do
    // mesmo bloco (ex: via RecentChaptersRow) também precisa remontar do
    // zero, senão o estado interno (sessão em destaque, capítulo
    // expandido, livro aberto na lista) fica preso no livro antigo — ver
    // comentário em ReadingBlockView.jsx.
    return (
      <>
        <ReadingBlockView
          key={`${expandedBlockId}-${initialSessionId}`}
          session={session}
          authUser={authUser}
          onNavigate={onNavigate}
          blockId={expandedBlockId}
          blocks={blocks}
          sessionsByBlock={readingMode === 'session' ? sessionsByBlock : browseSessionsByBlock}
          mode={readingMode}
          completedSet={completedSet}
          onToggleSession={onToggleSession}
          onToggleChapter={onToggleChapter}
          initialSessionId={initialSessionId}
          initialTextOpen={initialTextOpen}
          onBack={closeBlock}
          onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'journey', blockId: expandedBlockId, sessionId: heroSession.id, book: heroSession.book, bookEn: heroSession.bookEn, chStart: heroSession.chStart, chEnd: heroSession.chEnd, words: heroSession.words, type: heroSession.type })}
          onJumpToChapter={openRecentChapter}
          onExitGuided={onExitGuided}
          onOpenGroupRoom={onOpenGroupRoom}
          onActiveChapterChange={setSermonActiveChapterRef}
        />
        {renderSermonWidget()}
      </>
    )
  }

  if (expandedBookKey != null) {
    const [blockIdStr, bookName] = expandedBookKey.split(':')
    const block = blocks.find(b => b.id === Number(blockIdStr))
    const bookIdx = block?.books.indexOf(bookName) ?? -1
    const displayName = bookIdx >= 0 ? (lang === 'en' ? block.booksEn[bookIdx] : bookName) : bookName
    return (
      // key inclui expandedInitialSessionId — pular pra um capítulo
      // DIFERENTE do MESMO livro (ex: via RecentChaptersRow) precisa
      // remontar do zero, senão o painel de leitura embutido continuaria
      // preso no capítulo antigo (mesmo raciocínio do ReadingBlockView
      // acima).
      <>
        <BookChapterScreen
          key={`${expandedBookKey}:${expandedInitialSessionId}`}
          session={session}
          authUser={authUser}
          block={block}
          bookName={bookName}
          displayName={displayName}
          sessionsByBlock={sessionsByBlock}
          browseSessionsByBlock={browseSessionsByBlock}
          completedSet={completedSet}
          onToggleSession={onToggleSession}
          onToggleChapter={onToggleChapter}
          onMarkChaptersManually={onMarkChaptersManually}
          onGoToReflectionFrom={onGoToReflectionFrom}
          onNavigate={onNavigate}
          onBack={closeBook}
          initialSessionId={expandedInitialSessionId}
          initialTextOpen={expandedInitialTextOpen}
          initialFocusVerse={expandedInitialFocusVerse}
          onActiveChapterChange={setSermonActiveChapterRef}
        />
        {renderSermonWidget()}
      </>
    )
  }

  // 39l empilha por cima de 39k (não substitui) — "‹" de 39l volta pra 39k
  // com a MESMA busca; "‹" de 39k volta pro mapa/lista de livros de sempre.
  if (themeOpenId != null) {
    const theme = getThemeById(themeOpenId)
    if (theme) {
      return (
        <>
          <ThemeAsStudyScreen
            session={session}
            theme={theme}
            completedSet={completedSet}
            onBack={() => setThemeOpenId(null)}
            onOpenChapter={openChapterFromSearch}
            onBuildStudy={onBuildThemeStudy}
          />
          {renderSermonWidget()}
        </>
      )
    }
  }
  if (searchOpen != null) {
    return (
      <>
        <SearchResultsScreen
          session={session}
          initialQuery={searchOpen}
          sessionsByBlock={browseSessionsByBlock}
          completedSet={completedSet}
          onBack={() => { setSearchOpen(null); setSearchQuery('') }}
          onOpenChapter={openChapterFromSearch}
          onOpenBook={(block, bookName) => { setSearchOpen(null); setSearchQuery(''); openBook(block, bookName) }}
          onOpenTheme={id => setThemeOpenId(id)}
        />
        {renderSermonWidget()}
      </>
    )
  }

  // "Continuar a leitura livre" (39a, pacote 39) — freeReadingPositionStore.js
  // é uma posição PRÓPRIA da aba Bíblia (livro + capítulo + versículo),
  // separada de session.lastReadPosition (essa continua servindo só o
  // Início/findCurrentReadingSession, "onde parei em QUALQUER modo" —
  // ver App.jsx). Resolve o bloco a partir do LIVRO salvo, como antes.
  const freeReadPos = getFreeReadingPosition()
  const freeReadBlock = freeReadPos ? blocks.find(b => b.books.includes(freeReadPos.book)) : null
  const freeReadSession = freeReadBlock
    ? (browseSessionsByBlock[freeReadBlock.id] ?? []).find(s => s.book === freeReadPos.book && s.chStart <= freeReadPos.chapter && s.chEnd >= freeReadPos.chapter)
    : null
  const freeReadWhen = freeReadPos?.readAt ? relativeDayPeriod(freeReadPos.readAt, lang) : null
  const freeReadWhenLabel = freeReadWhen
    ? `${freeReadWhen.day === 'today' ? t('journey.whenToday', undefined, lang) : freeReadWhen.day === 'yesterday' ? t('journey.whenYesterday', undefined, lang) : freeReadWhen.day} ${t(`journey.whenPeriod${freeReadWhen.period === 'morning' ? 'Morning' : freeReadWhen.period === 'afternoon' ? 'Afternoon' : 'Evening'}`, undefined, lang)}`
    : ''

  // Busca (39a → 39k, Bloco 6) — Enter aqui abre SearchResultsScreen (ver
  // searchOpen acima) com a busca de verdade (índice de texto, palpite de
  // referência, temas). O campo em 39a nunca filtrou a lista de livros por
  // texto (só os chips de seção fazem isso) — `trimmedQuery` só alimenta o
  // Enter.
  const trimmedQuery = searchQuery.trim()

  const atBooks = flattenBooks(blocks.filter(b => b.id <= 4), lang)
  const ntBooks = flattenBooks(blocks.filter(b => b.id >= 5), lang)
  const testamentBooks = testament === 'at' ? atBooks : ntBooks
  // Progresso por livro (39b): barra fina — laranja em curso, preta
  // concluído — e o total de capítulos ao lado (não quantos já leu; o
  // total é o dado estável, a barra já mostra o quanto).
  const bookChapterCounts = computeBookChapterCounts(sessionsByBlock ?? {})
  function progressFor(entry) {
    const total = bookChapterCounts[entry.canonicalName] ?? 0
    if (!total) return { done: 0, total: 0, pct: 0 }
    let done = 0
    for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${entry.canonicalName}:${ch}`)) done++
    return { done, total, pct: Math.round((done / total) * 100) }
  }

  // Grupos (Pentateuco/Históricos/Poéticos/Proféticos ou Evangelhos/Atos/
  // Cartas/Apocalipse) dentro do testamento aberto — viram chips em 39b.
  const groupBlocks = testament === 'at' ? blocks.filter(b => b.id <= 4) : blocks.filter(b => b.id >= 5)
  const filteredBooks = blockFilter === 'all' ? testamentBooks : testamentBooks.filter(e => e.block.id === blockFilter)
  const showTestamentCards = !testamentEntered

  // Os dois cartões de testamento (28a) — mesmo peso, cada um com anel de
  // %, quantos capítulos e uma linha de status real (onde você está, ou
  // sugestão de começo se ainda não leu nada ali). Reaproveita
  // metricsBlocks.js (Bloco 2) em vez de recalcular a mesma soma.
  const metricsBlocks = computeMetricsBlocks(completedSet)
  const { ot: otTotals, nt: ntTotals } = computeTestamentTotals(metricsBlocks)
  const testamentTotalsForHeader = testament === 'at' ? otTotals : ntTotals
  const atBlocksList = blocks.filter(b => b.id <= 4)
  const ntBlocksList = blocks.filter(b => b.id >= 5)
  const otStatus = testamentStatusLine(atBlocksList, completedSet, bookChapterCounts, lang)
  const ntStatus = testamentStatusLine(ntBlocksList, completedSet, bookChapterCounts, lang)
  // Qual testamento é "onde a pessoa está agora" (cartão escuro, 28a) —
  // o mesmo livro de session.currentBlock, comparado no idioma certo.
  const currentBookName = session.currentBlock?.book
  const activeTestament = currentBookName && atBlocksList.some(b => (lang === 'en' ? b.booksEn : b.books).includes(currentBookName))
    ? 'at' : 'nt'

  // Progresso total (39a, cabeçalho) — soma dos 8 blocos já calculados
  // acima pra "onde estou" dos dois testamentos (otTotals/ntTotals), nunca
  // recalculado à parte (evitaria dois números que podem divergir).
  const totalChaptersRead = otTotals.chaptersRead + ntTotals.chaptersRead
  const totalChapters = otTotals.chaptersTotal + ntTotals.chaptersTotal
  const totalPercent = totalChapters ? Math.round((totalChaptersRead / totalChapters) * 1000) / 10 : 0

  return (
    <>
    <div style={styles.screen}>
      <div style={styles.body}>
        <p style={styles.title}>{t('nav.journey', undefined, lang)}</p>
        <p style={styles.subtitle}>{t('journey.totalProgress', { done: totalChaptersRead.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR'), total: totalChapters.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR'), pct: formatPercent(totalPercent, lang) }, lang)}</p>
        <div style={styles.searchWrap}>
          <AppIcon name="Search" size={17} strokeWidth={2} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (trimmedQuery) setSearchOpen(trimmedQuery) } }}
            placeholder={t('journey.searchPlaceholder', undefined, lang)}
            style={styles.searchInput}
          />
          {trimmedQuery && (
            <button style={styles.searchClearBtn} onClick={() => setSearchQuery('')} aria-label="clear">
              <AppIcon name="X" size={13} color="var(--bento-t4)" />
            </button>
          )}
        </div>
      </div>

      <div style={styles.body2}>
        {/* Continuar a leitura livre (39a, bloco 3) — usa a posição
            PRÓPRIA de leitura livre (freeReadingPositionStore.js), não a
            mesma session.lastReadPosition do Início (essa é "onde parei
            em QUALQUER modo"; esta é só a aba Bíblia — podem divergir, é
            o próprio exemplo do quadro: plano em Gênesis, livre em
            Salmos). Some se a pessoa nunca leu livremente.
            Interino: abre pela mesma navegação de "tocar um livro"
            (BookChapterScreen com o capítulo em destaque) até o Bloco 2
            trazer 39d de verdade — sem posição de versículo ainda. */}
        {showTestamentCards && freeReadSession && (
          <button style={styles.lastReadCard} onClick={() => jumpToBook(freeReadBlock, freeReadPos.book, freeReadSession.id, true)}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={styles.lastReadLabel}>{t('journey.continueFreeReadingLabel', undefined, lang)}</span>
              <span style={styles.lastReadTitle}>
                {(lang === 'en' && freeReadPos.bookEn ? freeReadPos.bookEn : freeReadPos.book)} {freeReadPos.chapter}
              </span>
              <span style={styles.lastReadTime}>
                {freeReadWhenLabel}
                {freeReadPos.verse ? ` · ${t('journey.verseLabel', { n: freeReadPos.verse }, lang)}` : ''}
              </span>
            </span>
            <span style={styles.lastReadOpenBtn}>{t('journey.openBtn', undefined, lang)}</span>
          </button>
        )}

        {showTestamentCards ? (
          <>
            {/* Bíblia (28a) — os dois testamentos, do mesmo tamanho; o
                escuro é só onde a pessoa está agora (currentBlock), não um
                "principal" fixo. */}
            {[
              { key: 'at', totals: otTotals, status: otStatus, dark: activeTestament === 'at' },
              { key: 'nt', totals: ntTotals, status: ntStatus, dark: activeTestament === 'nt' },
            ].map(({ key, totals, status, dark }) => {
              const blocksList = key === 'at' ? atBlocksList : ntBlocksList
              const bookCount = blocksList.reduce((s, b) => s + b.books.length, 0)
              return (
                <div key={key} style={{ ...styles.testamentTile, background: dark ? 'var(--bento-ink)' : 'var(--bento-card)' }}>
                  <div style={styles.testamentTileTop}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...styles.testamentTileEyebrow, color: dark ? 'rgba(255,255,255,.42)' : 'var(--bento-t4)' }}>
                        {t('journey.booksCount', { n: bookCount }, lang)}
                      </p>
                      <p style={{ ...styles.testamentTileName, color: dark ? '#fff' : 'var(--bento-ink)' }}>
                        {t(key === 'at' ? 'journey.oldTestament' : 'journey.newTestament', undefined, lang)}
                      </p>
                      <p style={{ ...styles.testamentTileSub, color: dark ? 'rgba(255,255,255,.5)' : 'var(--bento-t3)' }}>
                        {t('journey.chaptersOfTotal', { done: totals.chaptersRead, total: totals.chaptersTotal }, lang)}
                      </p>
                    </div>
                    <div style={styles.testamentRing}>
                      {/* Anel de progresso em SVG — não conic-gradient, ver
                          o mesmo ajuste em BookChapterScreen.jsx (Bloco 1). */}
                      <svg width="62" height="62" viewBox="0 0 62 62" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                        <circle cx="31" cy="31" r="28" fill="none" stroke={dark ? 'rgba(255,255,255,.12)' : 'var(--bento-line)'} strokeWidth="6" />
                        <circle cx="31" cy="31" r="28" fill="none" stroke="var(--bento-accent)" strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${(totals.percent / 100) * 175.93} 175.93`} />
                      </svg>
                      <div style={{ ...styles.testamentRingInner, background: dark ? 'var(--bento-ink)' : '#fff' }}>
                        <span style={{ ...styles.testamentRingPct, color: dark ? '#fff' : 'var(--bento-t3)' }}>{formatPercent(totals.percent, lang)}%</span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.testamentTileFoot}>
                    <span style={{ ...styles.testamentStatusText, color: dark ? 'rgba(255,255,255,.45)' : 'var(--bento-t3)' }}>
                      {status.started
                        ? t('journey.youAreAt', { book: status.book, n: status.chapter }, lang)
                        : t('journey.goodStart', { book: status.book }, lang)}
                    </span>
                    <button
                      style={{ ...styles.testamentOpenBtn, background: dark ? 'var(--bento-accent)' : 'var(--bento-ink)', color: dark ? 'var(--bento-ink)' : '#fff' }}
                      onClick={() => enterTestament(key)}
                    >
                      {t('journey.openBtn', undefined, lang)}
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <>
            {/* 39b — lista de livros do testamento. Substitui por inteiro o
                antigo 28b: cabeçalho com contagem real + seletor de
                versão (novo, mora aqui porque "vale pra aba inteira"),
                chips SEMPRE visíveis (não somem ao buscar — a busca por
                texto livre saiu daqui pro Bloco 6/39k, ver trimmedQuery
                acima), e cabeçalho de seção SEMPRE aparecendo (antes só
                aparecia filtrando por busca — o quadro pede sempre). */}
            <div style={styles.bookListHeader}>
              <button style={styles.backChip} onClick={() => setTestamentEntered(false)} aria-label={t('a11y.goBack', undefined, lang)}>
                <AppIcon name="ChevronLeft" size={15} strokeWidth={2.4} color="var(--bento-ink)" />
              </button>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={styles.testamentLabel}>
                  {t(testament === 'at' ? 'journey.oldTestament' : 'journey.newTestament', undefined, lang)}
                </span>
                <span style={styles.testamentHeaderSub}>
                  {t('journey.chaptersOfTotal', { done: testamentTotalsForHeader.chaptersRead, total: testamentTotalsForHeader.chaptersTotal }, lang)}
                  {' · '}{formatPercent(testamentTotalsForHeader.percent, lang)}%
                </span>
              </span>
              <BibleVersionChip lang={lang} versionId={versionId} onChange={setVersionId} />
            </div>

            <div style={styles.chipsRow}>
              <button style={{ ...styles.filterChip, ...(blockFilter === 'all' ? styles.filterChipOn : {}) }} onClick={() => setBlockFilter('all')}>
                {t('journey.allBooksChip', { n: groupBlocks.reduce((s, b) => s + b.books.length, 0) }, lang)}
              </button>
              {groupBlocks.map(b => (
                <button
                  key={b.id}
                  style={{ ...styles.filterChip, ...(blockFilter === b.id ? styles.filterChipOn : {}) }}
                  onClick={() => setBlockFilter(b.id)}
                >
                  {sectionLabelFor(b, lang)}
                </button>
              ))}
            </div>

            <div style={styles.testamentCard}>
              {filteredBooks.length === 0 ? (
                <p style={styles.searchEmptyHint}>{t('journey.searchNoResults', { query: trimmedQuery }, lang)}</p>
              ) : (
                <div>
                  {filteredBooks.map((entry, i) => {
                    const key = `${entry.block.id}:${entry.canonicalName}`
                    const showSectionHeader = i === 0 || entry.block.id !== filteredBooks[i - 1].block.id
                    const { done, total, pct } = progressFor(entry)
                    const isLast = i === filteredBooks.length - 1
                    return (
                      <div key={key}>
                        {showSectionHeader && (
                          <p style={{ ...styles.sectionLabel, marginTop: i === 0 ? 0 : 14 }}>
                            {sectionLabelFor(entry.block, lang)}
                          </p>
                        )}
                        <button
                          style={{ ...styles.bookRow, borderBottom: isLast ? 'none' : '1px solid var(--bento-line)' }}
                          onClick={() => openBook(entry.block, entry.canonicalName)}
                        >
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={styles.bookRowName}>{entry.displayName}</span>
                            <span style={styles.bookRowChapters}>{t('journey.chaptersOfTotal', { done, total }, lang)}</span>
                          </span>
                          <span style={styles.bookRowStat}>
                            <span style={styles.bookRowBarTrack}>
                              <span style={{ ...styles.bookRowBarFill, width: `${pct}%`, background: pct >= 100 ? 'var(--bento-ink)' : 'var(--bento-accent)' }} />
                            </span>
                            <span style={{ ...styles.bookRowPct, color: pct >= 100 ? 'var(--bento-ink)' : pct > 0 ? 'var(--bento-accent)' : 'var(--bento-t3)' }}>{pct}%</span>
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Atalho de volta pra sessão estruturada do dia — as "duas portas
            para o mesmo texto" do quadro 5f. */}
        {showTestamentCards && onContinueSession && (
          <button style={styles.todaySessionCard} onClick={onContinueSession}>
            <span style={styles.todaySessionIcon}>
              <AppIcon name="BookOpen" size={16} strokeWidth={1.9} color="var(--bento-accent)" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={styles.todaySessionTitle}>{t('journey.todaySessionCta', undefined, lang)}</span>
              <span style={styles.todaySessionSub}>{session.todaySession.title} · {t('journey.countsInPlan', undefined, lang)}</span>
            </span>
            <span style={styles.todaySessionChevron}>›</span>
          </button>
        )}
      </div>
    </div>
    {renderSermonWidget()}
  </>
  )
}

const styles = {
  // Medidas do quadro 5f.
  screen: { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'scroll', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', paddingBottom: 'calc(var(--nav-height) + 18px)', background: 'var(--bento-bg)' },
  body:   { flex: 'none', padding: '22px 20px 0' },
  body2:  { padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 },
  title:      { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: '0 0 4px' },
  subtitle:   { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: '0 0 14px' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 10, height: 46, background: 'var(--bento-card)', borderRadius: 16, padding: '0 16px' },
  searchInput:{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', padding: 0, fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 500, lineHeight: 1, color: 'var(--bento-ink)' },
  searchClearBtn: { border: 'none', background: 'var(--bento-line)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  searchEmptyHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', padding: '14px 2px', textAlign: 'center', margin: 0 },

  lastReadCard:     { width: '100%', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bento-sand)', border: 'none', borderRadius: 24, padding: 20, cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  lastReadLabel:    { display: 'block', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', marginBottom: 8 },
  lastReadTitle:    { display: 'block', fontSize: 19, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.6px', color: 'var(--bento-sand-ink-strong)', marginBottom: 3 },
  lastReadTime:     { display: 'block', fontSize: 12, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-sand-label)' },
  lastReadOpenBtn:  { flexShrink: 0, height: 44, padding: '0 18px', borderRadius: 16, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand)' },

  // Os dois cartões de testamento (28a) — mesmo tamanho, o escuro é só
  // onde a pessoa está agora.
  testamentTile: { borderRadius: 26, padding: 22, display: 'flex', flexDirection: 'column' },
  testamentTileTop: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  testamentTileEyebrow: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 8px' },
  testamentTileName: { fontFamily: 'var(--font-bento)', fontSize: 25, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1px', margin: '0 0 6px' },
  testamentTileSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.3, margin: 0 },
  testamentRing: { position: 'relative', flexShrink: 0, width: 62, height: 62, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  testamentRingInner: { position: 'relative', width: 50, height: 50, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  testamentRingPct: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800 },
  testamentTileFoot: { display: 'flex', alignItems: 'center', gap: 10 },
  testamentStatusText: { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, lineHeight: 1.3 },
  testamentOpenBtn: { flexShrink: 0, height: 36, padding: '0 16px', borderRadius: 13, border: 'none', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' },

  // Lista de livros de um testamento (28b) — cabeçalho com voltar + chips
  // de grupo, no lugar do link "trocar" de 5f.
  bookListHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  backChip: { width: 30, height: 30, flexShrink: 0, borderRadius: 10, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  chipsRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterChip: { border: 'none', background: 'var(--bento-card)', borderRadius: 99, padding: '9px 12px', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', whiteSpace: 'nowrap' },
  filterChipOn: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },

  testamentCard:   { background: 'var(--bento-card)', borderRadius: 24, padding: 20 },
  testamentHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px' },
  testamentLabel:  { display: 'block', fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.3px', color: 'var(--bento-ink)' },
  testamentHeaderSub: { display: 'block', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', marginTop: 2 },
  testamentSwitchBtn: { border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', padding: 0 },
  // Cabeçalho de seção (Pentateuco, Históricos…) e linha de livro (28b):
  // nome + "N de M capítulos" à esquerda, barra fina + % à direita.
  sectionLabel: { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 2px' },
  bookRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, height: 62, border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' },
  bookRowName: { display: 'block', fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 4 },
  bookRowChapters: { display: 'block', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'var(--bento-t3)' },
  bookRowStat: { flexShrink: 0, width: 62, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 },
  bookRowBarTrack: { width: 62, height: 5, borderRadius: 99, background: 'var(--bento-line)', flexShrink: 0, overflow: 'hidden' },
  bookRowBarFill: { display: 'block', height: 5, borderRadius: 99 },
  bookRowPct: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1 },
  bookRowCount: { width: 34, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },

  todaySessionCard:  { width: '100%', borderRadius: 24, background: 'rgba(255,255,255,.6)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  todaySessionIcon:  { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  todaySessionTitle: { display: 'block', fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 3 },
  todaySessionSub:   { display: 'block', fontSize: 12, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },
  todaySessionChevron:{ fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t5)' },

  // ── Folha de sermão flutuante (34d/34e/34f, handoff-app-completo) ──
  // Mora aqui (não em ReadingBlockView.jsx) — README, 34e: "vive... na
  // Bíblia inteira". Reusa a "janela flutuante" da IA de ReadingBlockView
  // (mesmas dimensões/zIndex, só que dona é esta tela agora).
  aiChatOverlayBackdrop: { position: 'fixed', inset: 0, background: 'rgba(18,18,18,.32)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  aiChatOverlayWindow: { width: '100%', maxWidth: 'var(--max-width)', height: '72vh', maxHeight: 640, background: '#fff', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  aiChatOverlayBody: { flex: 1, minHeight: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column' },

  // Selo + FAB minimizados (34e) — mesmo truque de centralização de
  // .bottom-nav (index.css), portados pro <body>.
  sermonMiniWrap: {
    position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 'var(--max-width)',
    bottom: 'calc(var(--safe-bottom) + 16px)', zIndex: 199, padding: '0 20px',
    display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none',
  },
  sermonMiniPill: {
    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, height: 52, padding: '0 16px 0 14px',
    borderRadius: 18, border: 'none', background: 'var(--bento-ink)', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'var(--font-bento)', pointerEvents: 'auto',
  },
  sermonMiniDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--bento-accent)', flexShrink: 0 },
  sermonMiniTitle: { display: 'block', fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sermonMiniSub: { display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.5)', marginTop: 1 },
  // "Arrastável" (34e) — a posição base já é fixed no canto inferior
  // direito (touchAction:none evita o scroll da página brigar com o
  // arrasto vertical); sermonFabDrag desloca a partir daí via transform.
  sermonFab: {
    position: 'fixed', right: 20, bottom: 'calc(var(--safe-bottom) + 16px)', zIndex: 199, touchAction: 'none',
    width: 52, height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab',
  },
  sermonFabBadge: {
    position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, padding: '0 5px', borderRadius: 99, background: 'var(--bento-ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, color: '#fff',
  },

  sermonHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '0.5px solid var(--bento-line)', flexShrink: 0 },
  sermonHeaderTitle: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sermonHeaderSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sermonChevronBtn: { flexShrink: 0, width: 34, height: 34, borderRadius: 12, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  sermonSaveBtn: { flexShrink: 0, height: 34, padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--bento-accent)', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  sermonSaveBtnDisabled: { opacity: 0.4, cursor: 'default' },

  sermonOnScreenCard: { borderRadius: 18, background: 'var(--bento-sand)', padding: '12px 14px', marginBottom: 12, flexShrink: 0 },
  sermonOnScreenTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sermonOnScreenLabel: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-sand-label)' },
  sermonOnScreenDiamond: { width: 6, height: 6, background: 'var(--bento-sand-label)', transform: 'rotate(45deg)', flexShrink: 0 },
  sermonAddVerseBtn: { flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 11, border: 'none', background: 'var(--bento-sand-icon)', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-sand)', cursor: 'pointer' },
  sermonChipsRow: { display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  sermonChip: { height: 30, padding: '0 12px', borderRadius: 11, border: 'none', background: 'rgba(255,255,255,.6)', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-sand-ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  sermonChipX: { fontSize: 13, fontWeight: 700, color: 'var(--bento-sand-ink-mid)' },

  sermonTextarea: {
    flex: 1, minHeight: 140, width: '100%', border: 'none', borderRadius: 18, background: 'var(--bento-card)', padding: '14px 16px',
    fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-ink)', resize: 'none', outline: 'none',
  },
  sermonFooter: { flexShrink: 0, display: 'flex', gap: 8, padding: '12px 16px calc(12px + var(--safe-bottom))', borderTop: '0.5px solid var(--bento-line)' },
  sermonFooterBtn: {
    flex: 1, height: 44, borderRadius: 15, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer',
  },
  sermonFooterIconBtn: { flexShrink: 0, width: 44, height: 44, borderRadius: 15, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  // "De onde veio" (34f) e "Grupo" (escolha de grupos, README: "a mesma
  // de 39f") — as duas trocam o conteúdo da mesma folha, mesmo cabeçalho.
  sermonSourceHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '0.5px solid var(--bento-line)', flexShrink: 0 },
  sermonSourceTitle: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 2px' },
  sermonSourceDate: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  sermonReadyBtn: { flexShrink: 0, height: 34, padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--bento-accent)', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  sermonSectionLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  sermonTypeGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  sermonTypePill: {
    flex: '1 1 45%', minWidth: 130, display: 'flex', alignItems: 'center', gap: 9, height: 48, padding: '0 14px', borderRadius: 15,
    border: 'none', background: 'var(--bento-card)', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer', textAlign: 'left',
  },
  sermonTypePillOn: { background: 'var(--bento-ink)', color: '#fff' },
  sermonTypeDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--bento-t5)', flexShrink: 0 },
  sermonTypeDotOn: { background: 'var(--bento-accent)' },
  sermonFieldsHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  sermonOptionalTag: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t4)' },
  sermonFieldsCard: { borderRadius: 18, background: 'var(--bento-card)', padding: '0 16px' },
  sermonFieldRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0' },
  sermonFieldLabel: { flexShrink: 0, width: 90, fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 600, color: 'var(--bento-t3)' },
  sermonFieldInput: { flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 600, color: 'var(--bento-ink)', padding: 0 },

  // Toggle "compartilhar com grupo" (39f) + lista multi-select — mesmos
  // valores de estilo do toggle/lista de grupos de VerseAnnotateScreen
  // (ReadingBlockView.jsx), reconstruídos aqui (a folha de sermão mora
  // nesta tela agora, não faz sentido importar estilo de outro arquivo).
  sermonToggle: { flexShrink: 0, width: 46, height: 28, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  sermonToggleThumb: { width: 22, height: 22, borderRadius: 99 },
  sermonGroupRow: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 62, borderRadius: 18, border: 'none', background: 'var(--bento-line)',
    padding: '0 14px', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left',
  },
  sermonGroupRowActive: { background: 'var(--bento-ink)' },
  sermonGroupAvatar: { width: 34, height: 34, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800 },
  sermonGroupName: { display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 2 },
  sermonGroupCount: { fontSize: 12, fontWeight: 500 },
  sermonGroupCheckEmpty: { width: 20, height: 20, flexShrink: 0, borderRadius: 7, border: '1.5px solid var(--bento-t5)' },
}
