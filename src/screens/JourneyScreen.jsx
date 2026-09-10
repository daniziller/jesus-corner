// JourneyScreen.jsx — "Bíblia" (reskin Bento — tela 5f, leitura livre)
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { sessionKeys, computeBookChapterCounts } from '../utils/progress'
import { computeMetricsBlocks, computeTestamentTotals } from '../data/metricsBlocks'
import { getFreeReadingPosition } from '../bible/freeReadingPositionStore'
import { relativeDayPeriod } from '../bible/relativeDayPeriod'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { useSpeechToText } from '../utils/useSpeechToText'
import BibleVersionChip from '../components/bible/BibleVersionChip'
import { formatPercent } from '../bible/formatPercent'
import { getSermonNotes, saveSermonNote, sermonOwnWordsText, sermonOwnWordCount, generateSermonSummaryFor } from '../notes/sermonNotesStore'
import { postToRoom } from '../groups/chapterRoomStore'
import { getGroupMemberCounts } from '../groups/groupsStore'
import { saveHighlight } from '../highlights/highlightsStore'
import { DEFAULT_HIGHLIGHT_COLOR } from '../data/highlightColors'
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

// Três alturas da folha (34d) — "recolhida no lápis" não é uma altura da
// folha em si, é sermonNoteOpen virando false (ver handleSheetHandlePointerUp).
const SHEET_FULL_VH = 72
const SHEET_HALF_VH = 42
const SHEET_MIN_VH = 20 // nunca deixa a folha ficar menor que isso ENQUANTO arrasta, antes de soltar
const SHEET_COLLAPSE_MARGIN_VH = 14 // arrastar mais que isso abaixo de HALF solta pro lápis

const SERMON_NOTE_TYPES = ['sermon', 'service', 'class', 'lecture', 'video']
// Tipo customizado ("Outros" — Regra 4 §5): a pessoa escreveu com as
// próprias palavras (ex: "retiro"), não é uma das 5 chaves fixas — o
// próprio texto digitado É o rótulo, sem passar por tradução nenhuma.
function sermonTypeLabel(type, lang) {
  if (!type) return ''
  if (type === 'sermon') return t('notes.typeSermon', undefined, lang)
  if (SERMON_NOTE_TYPES.includes(type)) return t(`sermonNote.type${type[0].toUpperCase()}${type.slice(1)}`, undefined, lang)
  return type
}

// Filtro do passo 1 da busca de referência (34g, "Versículo") — só pra
// ACHAR o livro na lista (Regra 5: "a referência entra por toque, nunca
// digitada" — o toque final é o que conta, isto aqui só estreita a
// lista pra rolar menos).
function foldAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// "As três passagens" (34h, Regra 3: exemplo explícito no HANDOFF) —
// numeral por EXTENSO, concordando com "passagem/passagens" (feminino).
// Só 1 e 2 têm forma própria em português ("uma"/"duas" vs "um"/"dois");
// de 3 em diante o cardinal já é igual pros dois gêneros — por isso não
// dá pra reaproveitar cardinalWord (estudosStore.js), que é masculino
// (mesma lição do reverto de numberWord em verseSelectionLabel.js: cada
// concordância de gênero pede sua própria lista, não uma função geral).
const FEMININE_CARDINAL_WORDS_PT = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze']
function femininePassageCount(n, lang) {
  if (lang === 'en') return String(n)
  return FEMININE_CARDINAL_WORDS_PT[n] ?? String(n)
}

// "2 de setembro" (34h, item 1) — só dia+mês, sem dia da semana (diferente
// da data de 34f, "Terça, 2 de setembro · 20:14", que usa formatWeekdayDate).
const SERMON_MONTH_NAMES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const SERMON_MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function sermonDateShort(dateStr, lang) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T00:00:00`)
  const names = lang === 'en' ? SERMON_MONTH_NAMES_EN : SERMON_MONTH_NAMES_PT
  return lang === 'en' ? `${names[d.getMonth()]} ${d.getDate()}` : `${d.getDate()} de ${names[d.getMonth()]}`
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
  // Altura da folha (turno 34, handoff-anotacao-34/34d) — só importa
  // enquanto sermonNoteOpen; a 3ª altura ("recolhida no lápis") NÃO é um
  // valor deste state, é sermonNoteOpen virando false (34e). "Já
  // expandida" (README, entrada pelo Hoje) = nasce em 'full'.
  const [sermonSheetHeight, setSermonSheetHeight] = useState('full')
  // Deslocamento AO VIVO (px) durante o arrasto da alça — puramente visual,
  // zera ao soltar; o valor que fica de fato é sermonSheetHeight (snap).
  const [sermonDragOffset, setSermonDragOffset] = useState(0)
  const sheetDragState = useRef(null)
  const [sermonSourceOpen, setSermonSourceOpen] = useState(false)
  const [sermonGroupPickerOpen, setSermonGroupPickerOpen] = useState(false)
  const [sermonShareOn, setSermonShareOn] = useState(false)
  const [sermonSelectedGroupIds, setSermonSelectedGroupIds] = useState([])
  const [sermonSaving, setSermonSaving] = useState(false)
  const [sermonGroupMemberCounts, setSermonGroupMemberCounts] = useState({})
  // Tarja escura de 34e — "some sozinha depois de alguns segundos",
  // deixando só o lápis. Reaparece a cada vez que o lápis fica visível de
  // novo (draft muda de "aberto" pra "minimizado").
  const [sermonTarjaVisible, setSermonTarjaVisible] = useState(true)
  const sermonTarjaTimeoutRef = useRef(null)
  useEffect(() => {
    if (sermonDraft && !sermonNoteOpen) {
      setSermonTarjaVisible(true)
      window.clearTimeout(sermonTarjaTimeoutRef.current)
      sermonTarjaTimeoutRef.current = window.setTimeout(() => setSermonTarjaVisible(false), 4000)
    }
    return () => window.clearTimeout(sermonTarjaTimeoutRef.current)
  }, [sermonDraft, sermonNoteOpen])
  // Retoma um rascunho que ficou em andamento (Regra 4 §6, "rascunho
  // automático... ao sair do app; reabrir restaura") — uma anotação sem
  // finalizedAt é uma anotação ainda não fechada em 34h/"Guardar na
  // biblioteca". Só restaura o ESTADO (lápis com selo aparece de novo);
  // não força a folha a abrir sozinha ao entrar na aba.
  // "Outros" (34f, Regra 4 §5) — texto livre digitado por ela vira uma
  // opção RE-APROVEITÁVEL: junta os noteType distintos que já usou antes
  // e que não são uma das 5 chaves fixas, oferece como sugestão dentro do
  // próprio campo "Outros" (não como um 7º botão fixo no grid — o grid é
  // 2×3 no quadro, ponto).
  const [sermonCustomTypes, setSermonCustomTypes] = useState([])
  const [sermonOtherOpen, setSermonOtherOpen] = useState(false)
  const isCustomSermonType = !!sermonDraft?.noteType && !SERMON_NOTE_TYPES.includes(sermonDraft.noteType)
  useEffect(() => {
    if (!authUser?.email) return
    let cancelled = false
    getSermonNotes(authUser.email).then(notes => {
      if (cancelled) return
      const inProgress = notes.find(n => !n.finalizedAt)
      if (inProgress) {
        setSermonDraft({
          id: inProgress.id, createdAt: inProgress.createdAt ?? new Date().toISOString(), date: inProgress.date ?? dateKey(),
          noteType: inProgress.noteType ?? 'sermon', title: inProgress.title ?? '', preacher: inProgress.preacher ?? '',
          church: inProgress.church ?? '', link: inProgress.link ?? '', passages: inProgress.passages ?? [], text: inProgress.text ?? '',
          body: Array.isArray(inProgress.body) ? inProgress.body : null,
          finalizedAt: inProgress.finalizedAt ?? null,
          durationSeconds: inProgress.durationSeconds ?? 0, groupId: inProgress.groupId ?? null,
        })
      }
      const custom = [...new Set(notes.map(n => n.noteType).filter(nt => nt && !SERMON_NOTE_TYPES.includes(nt)))]
      setSermonCustomTypes(custom)
    }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.email])
  // Posição do lápis arrastado (34e, "posição lembrada") — persiste entre
  // visitas/sessões (localStorage, só client-side: é posição de UI, não
  // dado da conta). Cai em {x:0,y:0} (canto padrão) se nunca mexeu, se o
  // valor salvo for inválido, ou se localStorage não estiver disponível
  // (modo privado, etc.) — nunca trava a tela por causa disso.
  const [sermonFabDrag, setSermonFabDrag] = useState(() => {
    try {
      const raw = window.localStorage.getItem('sermonFabPos')
      if (!raw) return { x: 0, y: 0 }
      const parsed = JSON.parse(raw)
      const x = Number(parsed?.x), y = Number(parsed?.y)
      return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 }
    } catch { return { x: 0, y: 0 } }
  })

  // 34g — a escrita em tela cheia (turno 34, Bloco 3). `sermonWriting`
  // troca o CONTEÚDO da mesma folha aberta (não é outro portal) — 34d
  // com sermonWriting=false, 34g com true. O corpo rico (sermonDraft.
  // body) é um ARRAY de blocos — texto/citação/tópico — em vez de uma
  // string só: é o que deixa um versículo citado ficar DENTRO do fluxo
  // sem que editar o texto ao redor mexa nele (Regra 4 §7). Nasce vazio;
  // ensureSermonBody() below cria o body a partir de sermonDraft.text na
  // PRIMEIRA vez que ela entra em 34g (compat com quem só escreveu na
  // área simples de 34d, sem nunca ter aberto 34g).
  const [sermonWriting, setSermonWriting] = useState(false)
  const [focusedSegId, setFocusedSegId] = useState(null)
  const activeTextareaRef = useRef(null)
  // Busca de referência (Regra 5 da área inteira: "a referência entra por
  // TOQUE, nunca digitada" — por isso é um funil de 3 toques (livro →
  // capítulo → versículo), nunca um campo onde ela escreve "Gênesis
  // 43:3" e confirma; o campo de texto do passo 1 só FILTRA a lista de
  // livros, a escolha em si é sempre um toque).
  const [sermonVerseSearchOpen, setSermonVerseSearchOpen] = useState(false)
  const [sermonVerseSearchStep, setSermonVerseSearchStep] = useState('book') // 'book' | 'chapter' | 'verse'
  const [sermonVerseSearchQuery, setSermonVerseSearchQuery] = useState('')
  const [sermonVerseSearchBook, setSermonVerseSearchBook] = useState(null) // { pt, en }
  const [sermonVerseSearchChapter, setSermonVerseSearchChapter] = useState(null) // { chapter, verses, breaks }
  const [sermonVerseSearchBusy, setSermonVerseSearchBusy] = useState(false)

  // 34h — o resumo (turno 34, Bloco 4). Troca de conteúdo dentro da MESMA
  // folha, igual 34g (não é outro portal). "Finalizar" (34g) entra aqui;
  // "Voltar e escrever mais" volta pra 34g; "Guardar na biblioteca"
  // encerra de vez (finalizedAt).
  const [sermonSummaryOpen, setSermonSummaryOpen] = useState(false)
  const [sermonSummaryData, setSermonSummaryData] = useState(null) // { before, highlight, after } | null
  const [sermonSummaryLoading, setSermonSummaryLoading] = useState(false)
  const [sermonMarkingHighlights, setSermonMarkingHighlights] = useState(false)
  const [sermonHighlightsMarked, setSermonHighlightsMarked] = useState(false)
  const [sermonFinalizing, setSermonFinalizing] = useState(false)

  // "24 min anotando" (34h, item 1: "o tempo real com a folha aberta") —
  // acumula em sermonDraft.durationSeconds sempre que a folha (34d/34g/
  // 34h, qualquer conteúdo dela) fecha ou minimiza; mesmo padrão de
  // durationSeconds em studyDayStore.js (soma, nunca sobrescreve).
  const sermonOpenSinceRef = useRef(null)
  useEffect(() => {
    if (sermonNoteOpen) {
      sermonOpenSinceRef.current = Date.now()
      return
    }
    if (!sermonOpenSinceRef.current) return
    const elapsed = Math.round((Date.now() - sermonOpenSinceRef.current) / 1000)
    sermonOpenSinceRef.current = null
    if (elapsed > 0) setSermonDraft(prev => (prev ? { ...prev, durationSeconds: (prev.durationSeconds ?? 0) + elapsed } : prev))
  }, [sermonNoteOpen])

  function newSermonSegment(type, text = '') {
    return { id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, text }
  }
  function ensureSermonBody() {
    if (!sermonDraft) return
    if (Array.isArray(sermonDraft.body) && sermonDraft.body.length > 0) return
    patchSermonDraft({ body: [newSermonSegment('text', sermonDraft.text ?? '')] })
  }
  function enterSermonWriting() {
    ensureSermonBody()
    setSermonWriting(true)
  }
  function exitSermonWriting() {
    setSermonWriting(false)
    if (sermonDictating) stopDictation()
  }

  // "Finalizar" (34g) — "não fecha a anotação em silêncio: ela volta
  // lida" (34h). Persiste na hora (mesmo texto que ela acabou de
  // escrever precisa estar salvo antes de gerar o resumo) e entra em
  // 34h; o resumo em si é buscado por um efeito à parte (abaixo),
  // disparado quando sermonSummaryOpen fica true.
  async function finishSermonWriting() {
    await saveSermonDraft()
    setSermonWriting(false)
    setSermonSummaryData(null)
    setSermonSummaryOpen(true)
  }
  // "Voltar e escrever mais" (34h) — "reabre 34g com a anotação como
  // estava" (README).
  function backToWritingFromSummary() {
    setSermonSummaryOpen(false)
    setSermonWriting(true)
  }

  // Resumo de 34h (Regra 4 §10) — só busca com ~40+ palavras ESCRITAS
  // POR ELA (sermonOwnWordCount pula os blocos de citação, que são texto
  // bíblico). "Sem material suficiente, não há resumo" — não é erro, é
  // silenciosamente não mostrar o cartão preto (ver render).
  useEffect(() => {
    if (!sermonSummaryOpen || !sermonDraft || sermonSummaryData) return
    const words = sermonOwnWordsText(sermonDraft)
    if (sermonOwnWordCount(sermonDraft) < 40) return
    let cancelled = false
    setSermonSummaryLoading(true)
    generateSermonSummaryFor(words, lang)
      .then(summary => { if (!cancelled) setSermonSummaryData(summary) })
      .catch(err => console.error('Failed to generate sermon summary', err))
      .finally(() => { if (!cancelled) setSermonSummaryLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sermonSummaryOpen])

  // "Marcar na Bíblia" (34h, Regra 4 §11) — todas as passagens de uma
  // vez, cor padrão (mesmo DEFAULT_HIGHLIGHT_COLOR que HomeScreen.jsx já
  // usa pro versículo do dia), sem texto de marcação (é só um
  // "lembrete", não uma anotação da passagem) — aparecem na Biblioteca
  // pela mesma lista de marcações de sempre.
  async function markPassagesOnBible() {
    if (!sermonDraft || sermonMarkingHighlights || sermonDraft.passages.length === 0) return
    setSermonMarkingHighlights(true)
    try {
      const today = dateKey()
      await Promise.all(sermonDraft.passages.map((p, i) => saveHighlight(authUser?.email, {
        id: `hl-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        book: p.book, bookEn: p.bookEn, chapter: p.chapter,
        verses: Array.from({ length: (p.verseEnd ?? p.verseStart) - p.verseStart + 1 }, (_, v) => p.verseStart + v),
        text: '', color: DEFAULT_HIGHLIGHT_COLOR, createdAt: new Date().toISOString(), date: today, sessionMode: 'browse',
      })))
      setSermonHighlightsMarked(true)
    } catch (err) {
      console.error('Failed to mark sermon passages on Bible', err)
    } finally {
      setSermonMarkingHighlights(false)
    }
  }

  // "Guardar na biblioteca" (34h, Regra 4 §13) — encerra de vez
  // (finalizedAt), publica no grupo escolhido se "Levar ao grupo"
  // estiver ligado (§12 — é AQUI que a publicação de fato acontece, não
  // em 34d/"Salvar", ver comentário em saveSermonDraft) e leva pra
  // Biblioteca (README: "chip 'Sermões'" — sem prop de filtro inicial
  // em NotesScreen.jsx hoje, então chega na Biblioteca geral; escolhido
  // não construir esse fio a mais só pra isto, ela toca o chip 1 vez).
  async function finalizeSermonNote() {
    if (!sermonDraft || sermonFinalizing) return
    setSermonFinalizing(true)
    try {
      const finalDraft = { ...sermonDraft, finalizedAt: new Date().toISOString() }
      await saveSermonNote(authUser?.email, buildSermonPayload(finalDraft))
      if (sermonShareOn && sermonSelectedGroupIds.length > 0) {
        const target = sermonDraft.passages[0] ?? sermonActiveChapterRef
        if (target) {
          const body = [sermonDraft.title.trim(), sermonOwnWordsText(sermonDraft)].filter(Boolean).join('\n\n')
          await Promise.allSettled(sermonSelectedGroupIds.map(groupId => postToRoom(groupId, target.book, target.chapter, body)))
        }
      }
      setSermonDraft(null)
      setSermonSummaryOpen(false)
      setSermonWriting(false)
      setSermonNoteOpen(false)
      setSermonSummaryData(null)
      setSermonHighlightsMarked(false)
      onNavigate?.('notes')
    } catch (err) {
      console.error('Failed to finalize sermon note', err)
    } finally {
      setSermonFinalizing(false)
    }
  }

  // Insere um bloco (citação/tópico) logo depois do segmento com foco —
  // se não houver foco nenhum (ex: acabou de abrir 34g), entra no fim.
  // Sempre garante um segmento de TEXTO logo depois do bloco novo, pra
  // sempre ter onde continuar escrevendo (Regra 2: "editar o texto ao
  // redor não quebra o bloco").
  function insertSegmentAfterFocused(newSeg) {
    setSermonDraft(prev => {
      if (!prev) return prev
      const body = prev.body ?? []
      const idx = focusedSegId ? body.findIndex(s => s.id === focusedSegId) : body.length - 1
      const insertAt = idx === -1 ? body.length : idx + 1
      const followingIsText = body[insertAt]?.type === 'text'
      const toInsert = followingIsText ? [newSeg] : [newSeg, newSermonSegment('text', '')]
      return { ...prev, body: [...body.slice(0, insertAt), ...toInsert, ...body.slice(insertAt)] }
    })
  }
  function updateSermonSegmentText(segId, text) {
    setSermonDraft(prev => (prev ? { ...prev, body: (prev.body ?? []).map(s => (s.id === segId ? { ...s, text } : s)) } : prev))
  }
  // "Apagar o bloco solta a passagem da lista" (Regra 4 §7) — só um
  // bloco de citação carrega passagem; tópico e texto não têm o que
  // soltar.
  function removeSermonSegment(seg) {
    setSermonDraft(prev => {
      if (!prev) return prev
      const body = (prev.body ?? []).filter(s => s.id !== seg.id)
      const passages = seg.type === 'quote'
        ? prev.passages.filter(p => !(p.book === seg.book && p.chapter === seg.chapter && p.verseStart === seg.verseStart && p.verseEnd === seg.verseEnd))
        : prev.passages
      return { ...prev, body, passages }
    })
  }
  function insertTopicSegment() {
    insertSegmentAfterFocused(newSermonSegment('topic', ''))
  }
  // Vem da busca (Regra 4 §7) — texto real da versão dela, referência
  // pronta embaixo (34g token: itálico #5A4327, ref laranja marrom
  // #7A4A1E/700). Passagem entra na MESMA lista que "Na tela agora"
  // alimenta (sermonDraft.passages) — é a fonte única de "N passagens"
  // tanto aqui quanto em 34d/34h.
  function insertQuoteSegment(quote) {
    const bookLabel = lang === 'en' ? quote.bookEn : quote.book
    const ref = quote.verseStart === quote.verseEnd
      ? `${bookLabel} ${quote.chapter}:${quote.verseStart}`
      : `${bookLabel} ${quote.chapter}:${quote.verseStart}-${quote.verseEnd}`
    insertSegmentAfterFocused({ ...newSermonSegment('quote'), ...quote, ref })
    setSermonDraft(prev => {
      if (!prev) return prev
      const already = prev.passages.some(p => p.book === quote.book && p.chapter === quote.chapter && p.verseStart === quote.verseStart && p.verseEnd === quote.verseEnd)
      if (already) return prev
      return { ...prev, passages: [...prev.passages, { book: quote.book, bookEn: quote.bookEn, chapter: quote.chapter, verseStart: quote.verseStart, verseEnd: quote.verseEnd }] }
    })
  }

  function openVerseSearch() {
    setSermonVerseSearchOpen(true)
    setSermonVerseSearchStep('book')
    setSermonVerseSearchQuery('')
    setSermonVerseSearchBook(null)
    setSermonVerseSearchChapter(null)
  }
  function pickVerseSearchBook(book) {
    setSermonVerseSearchBook(book)
    setSermonVerseSearchStep('chapter')
  }
  async function pickVerseSearchChapter(chNum) {
    if (!sermonVerseSearchBook) return
    setSermonVerseSearchBusy(true)
    try {
      const versionId = getSelectedVersionId(lang)
      const bookKey = lang === 'en' ? sermonVerseSearchBook.en : sermonVerseSearchBook.pt
      const chapters = await fetchBookText(versionId, bookKey)
      const chapterData = chapters[String(chNum)]
      if (!chapterData) return
      setSermonVerseSearchChapter({ chapter: chNum, ...chapterData })
      setSermonVerseSearchStep('verse')
    } catch (err) {
      console.error('Failed to fetch chapter for verse search', err)
    } finally {
      setSermonVerseSearchBusy(false)
    }
  }
  function pickVerseSearchVerse(verseNum) {
    if (!sermonVerseSearchBook || !sermonVerseSearchChapter) return
    const text = sermonVerseSearchChapter.verses?.[String(verseNum)]
    if (!text) return
    insertQuoteSegment({
      book: sermonVerseSearchBook.pt, bookEn: sermonVerseSearchBook.en,
      chapter: sermonVerseSearchChapter.chapter, verseStart: verseNum, verseEnd: verseNum,
      text: text.replace(/\n/g, ' '),
    })
    setSermonVerseSearchOpen(false)
  }

  // Ditado (Regra 4 §9) — insere no ponto do cursor do segmento com
  // foco, concatenando com um espaço quando precisa. `activeTextareaRef`
  // é a única forma confiável de saber onde o cursor estava no momento
  // em que o reconhecimento terminou (o React só sabe o VALOR do campo,
  // não a posição do cursor).
  const { listening: sermonDictating, start: startDictation, stop: stopDictation, supported: sermonDictationSupported } = useSpeechToText({
    lang,
    onResult: heard => {
      if (!focusedSegId) return
      setSermonDraft(prev => {
        if (!prev) return prev
        const seg = (prev.body ?? []).find(s => s.id === focusedSegId)
        if (!seg) return prev
        const cur = seg.text ?? ''
        const el = activeTextareaRef.current
        const atEl = el && el === document.activeElement
        const selStart = atEl ? (el.selectionStart ?? cur.length) : cur.length
        const selEnd = atEl ? (el.selectionEnd ?? cur.length) : cur.length
        const needsSpaceBefore = selStart > 0 && cur[selStart - 1] !== ' ' && cur[selStart - 1] !== '\n'
        const nextText = cur.slice(0, selStart) + (needsSpaceBefore ? ' ' : '') + heard + cur.slice(selEnd)
        return { ...prev, body: (prev.body ?? []).map(s => (s.id === focusedSegId ? { ...s, text: nextText } : s)) }
      })
    },
  })
  function handleSermonSegmentFocus(segId, e) {
    setFocusedSegId(segId)
    activeTextareaRef.current = e.target
  }
  // "Ficha areia 'N passagens' (toca e abre a lista completa)" — 34g
  // token. A "lista completa" é a mesma fileira de fichas de 34d, só que
  // recolhida por padrão aqui (a tira de 34g é uma linha só).
  const [sermonPassagesListOpen, setSermonPassagesListOpen] = useState(false)
  // Autogrow dos textareas de texto/tópico — sem isso cada parágrafo
  // ficaria preso numa altura fixa, cortando o que não coubesse.
  function autoGrowTextarea(e) {
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // 34h também mostra "N pessoas" (item 5, "Levar ao grupo") sem
  // necessariamente ter passado pelo picker de grupo antes (grupo único
  // = seleção automática, ver renderSermonSummary) — busca a contagem
  // nos dois casos, não só quando o picker abre.
  useEffect(() => {
    if ((!sermonGroupPickerOpen && !sermonSummaryOpen) || !session.myGroups?.length) return
    let cancelled = false
    getGroupMemberCounts(session.myGroups.map(g => g.groupId)).then(counts => { if (!cancelled) setSermonGroupMemberCounts(counts) }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sermonGroupPickerOpen, sermonSummaryOpen])
  // "Na tela agora" (34d) — reportado de baixo pra cima por quem estiver
  // mostrando texto de capítulo agora (ReadingBlockView.jsx, ver
  // onActiveChapterChange), null quando nenhum capítulo está aberto (39a/
  // 39b/39c) — nesse caso o botão "+ {ref}" simplesmente não aparece.
  const [sermonActiveChapterRef, setSermonActiveChapterRef] = useState(null)

  // Achado dela (2026-09-09, turno 34 novo pacote): tocar "Anotar uma
  // pregação" com um rascunho JÁ em andamento reabre ELE (folha cheia),
  // em vez de começar um segundo em paralelo e perder o primeiro de vista
  // — mesma regra de 34e ("toque com anotação aberta reabre 34d").
  function startOrResumeSermonNote() {
    if (sermonDraft) {
      setSermonSheetHeight('full')
      setSermonNoteOpen(true)
      return
    }
    startNewSermonNote()
  }

  function startNewSermonNote() {
    setSermonDraft({
      id: `sermon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(), date: dateKey(),
      noteType: 'sermon', title: '', preacher: '', church: '', link: '',
      passages: [], text: '', finalizedAt: null,
    })
    setSermonSourceOpen(false)
    setSermonGroupPickerOpen(false)
    setSermonShareOn(false)
    setSermonSelectedGroupIds([])
    setSermonSheetHeight('full')
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

  // Forma final pra sermonNotesStore.js, a partir do draft local — usada
  // pelo "Salvar"/"Finalizar" explícitos E pelo rascunho automático
  // (Regra 3), pra nunca duplicar a mesma montagem de objeto em dois
  // lugares. `text` continua sendo salvo como string plana (compat com
  // NotesScreen.jsx/Biblioteca, que só sabe mostrar texto corrido) —
  // derivada do body quando ele existe (34g já foi usado), senão o texto
  // simples de 34d.
  function buildSermonPayload(draft, { trim = true } = {}) {
    const clean = v => (trim ? v.trim() : v)
    const plainText = Array.isArray(draft.body) && draft.body.length > 0
      ? draft.body.map(seg => (seg.type === 'quote' ? `"${seg.text}" — ${seg.ref}` : seg.text)).filter(Boolean).join('\n\n')
      : draft.text
    return {
      id: draft.id, date: draft.date, createdAt: draft.createdAt, updatedAt: new Date().toISOString(),
      noteType: draft.noteType, title: clean(draft.title), preacher: clean(draft.preacher),
      church: clean(draft.church), link: clean(draft.link), passages: draft.passages,
      text: clean(plainText ?? ''), body: draft.body ?? null, finalizedAt: draft.finalizedAt ?? null,
      durationSeconds: draft.durationSeconds ?? 0, topics: (draft.body ?? []).filter(s => s.type === 'topic').map(s => s.text).filter(Boolean),
      groupId: draft.groupId ?? null,
    }
  }

  // "Salvar" (34d) — o mapa de navegação do README não lista destino
  // nenhum pra este botão (diferente de todas as outras ações da folha,
  // que levam a algum lugar): ele persiste na hora e CONTINUA em 34d — não
  // fecha nem esvazia o rascunho. Quem de fato encerra a anotação é
  // "Guardar na biblioteca" em 34h (turno 34, Bloco 4, ainda não
  // implementado neste bloco) — publicar no grupo também é ação DE LÁ
  // ("Levar ao grupo"), não daqui; o botão "Grupo" desta tela só escolhe
  // quais grupos ficam marcados (sermonShareOn/sermonSelectedGroupIds),
  // sem publicar nada ainda.
  async function saveSermonDraft() {
    if (!sermonDraft || sermonSaving) return
    setSermonSaving(true)
    try {
      await saveSermonNote(authUser?.email, buildSermonPayload(sermonDraft))
    } catch (err) {
      console.error('Failed to save sermon note', err)
    } finally {
      setSermonSaving(false)
    }
  }

  // Rascunho automático (Regra 3 da área inteira: "se salva sozinho, a
  // cada pausa") — debounce de 1200ms após a última mudança no draft,
  // mesma janela de saveStudyDayDraft/StudyDayScreen.jsx. Roda silencioso
  // (sem sermonSaving/spinner — isso é só pro "Salvar" explícito).
  const sermonAutosaveTimer = useRef(null)
  const sermonDraftAtMountRef = useRef(sermonDraft)
  useEffect(() => {
    if (!sermonDraft || !authUser?.email) return
    if (sermonDraft === sermonDraftAtMountRef.current) return
    window.clearTimeout(sermonAutosaveTimer.current)
    sermonAutosaveTimer.current = window.setTimeout(() => {
      saveSermonNote(authUser.email, buildSermonPayload(sermonDraft, { trim: false })).catch(err => console.error('Failed to autosave sermon note', err))
    }, 1200)
    return () => window.clearTimeout(sermonAutosaveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sermonDraft, authUser?.email])
  // "...e ao sair do app" (mesma regra) — grava na hora ao perder foco,
  // sem esperar o debounce (mesmo padrão de ReadingBlockView.jsx/
  // PrayerScreen.jsx/ReflectionScreen.jsx).
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden || !sermonDraft || !authUser?.email) return
      saveSermonNote(authUser.email, buildSermonPayload(sermonDraft, { trim: false })).catch(() => {})
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [sermonDraft, authUser?.email])

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
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: sermonFabDrag.x, baseY: sermonFabDrag.y, moved: false, lastPos: sermonFabDrag }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function handleFabPointerMove(e) {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragState.current.moved = true
    const next = { x: dragState.current.baseX + dx, y: dragState.current.baseY + dy }
    dragState.current.lastPos = next
    setSermonFabDrag(next)
  }
  // "Posição lembrada" (Regra 4 §3) — grava só ao SOLTAR (não a cada
  // pointermove, que dispararia dezenas de escritas por segundo). Toque
  // simples (sem arrasto): COM draft reabre a folha onde estava (altura
  // cheia); SEM draft começa uma nova (34e: "sem anotação em andamento...
  // um toque começa uma nova").
  function handleFabPointerUp() {
    const moved = dragState.current?.moved
    const lastPos = dragState.current?.lastPos
    dragState.current = null
    if (!moved) { startOrResumeSermonNote(); return }
    if (lastPos) { try { window.localStorage.setItem('sermonFabPos', JSON.stringify(lastPos)) } catch { /* modo privado etc. — posição só não persiste */ } }
  }

  // Arrasto da folha (34d, "arrasta para cima e para baixo; solta em três
  // alturas") — mesmo limiar de toque-vs-arrasto do lápis, só que aqui
  // não tem "toque" pra tratar (a alça só serve pra arrastar); o valor ao
  // vivo (sermonDragOffset) só existe visualmente durante o gesto, o que
  // fica de fato é o snap calculado em handleSheetHandlePointerUp.
  function handleSheetHandlePointerDown(e) {
    sheetDragState.current = { startY: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function handleSheetHandlePointerMove(e) {
    if (!sheetDragState.current) return
    setSermonDragOffset(e.clientY - sheetDragState.current.startY)
  }
  // Três alturas: solta perto de FULL fica cheia, perto de HALF fica meia,
  // abaixo da meia (arrastou pra baixo demais) recolhe pro lápis (34e) —
  // "recolhida no lápis" não é uma 3ª altura da folha, é a folha SUMINDO.
  function handleSheetHandlePointerUp() {
    if (!sheetDragState.current) return
    const dragPx = sermonDragOffset
    sheetDragState.current = null
    setSermonDragOffset(0)
    const baseVh = sermonSheetHeight === 'full' ? SHEET_FULL_VH : SHEET_HALF_VH
    const vh1 = window.innerHeight / 100
    const resultVh = baseVh - dragPx / vh1
    if (resultVh < SHEET_HALF_VH - SHEET_COLLAPSE_MARGIN_VH) { setSermonNoteOpen(false); return }
    setSermonSheetHeight(resultVh >= (SHEET_FULL_VH + SHEET_HALF_VH) / 2 ? 'full' : 'half')
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
      if (browseJumpTarget.openSermonNote) startOrResumeSermonNote()
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

  // 34g — a escrita em tela cheia. Renderiza DENTRO do mesmo container
  // de sermonSheet (ver renderSermonWidget), só troca o conteúdo — não é
  // outro portal.
  function renderSermonWriting() {
    if (sermonVerseSearchOpen) return renderVerseSearch()
    const body = sermonDraft.body ?? []
    let topicCount = 0
    return (
      <>
        <div style={styles.sermonHeader}>
          <button type="button" style={styles.sermonChevronBtn} onClick={exitSermonWriting} aria-label={t('sermonNote.minimize', undefined, lang)}>
            <AppIcon name="ChevronDown" size={16} color="var(--bento-ink)" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.sermonHeaderTitle}>{sermonDraft.title.trim() || t('sermonNote.newTitle', undefined, lang)}</p>
            <p style={styles.sermonHeaderSub}>{[sermonTypeLabel(sermonDraft.noteType, lang), sermonDraft.preacher, t('sermonNote.savedNow', undefined, lang)].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" style={{ ...styles.sermonSaveBtn, ...(sermonSaving ? styles.sermonSaveBtnDisabled : {}) }} disabled={sermonSaving} onClick={finishSermonWriting}>
            {t('sermonNote.finish', undefined, lang)}
          </button>
        </div>

        <div style={styles.sermonPassageStrip}>
          {sermonActiveChapterRef && (
            <button type="button" style={styles.sermonAddVerseBtnSmall} onClick={addOnScreenVerse}>
              {t('sermonNote.addVerse', { ref: passageRefLabel(sermonActiveChapterRef) }, lang)}
            </button>
          )}
          {sermonDraft.passages.length > 0 && (
            <button type="button" style={styles.sermonPassageCountChip} onClick={() => setSermonPassagesListOpen(v => !v)}>
              {t(sermonDraft.passages.length === 1 ? 'sermonNote.passageCountOne' : 'sermonNote.passageCountMany', { n: sermonDraft.passages.length }, lang)}
            </button>
          )}
          <span style={styles.sermonPassageTime}>{new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {sermonPassagesListOpen && sermonDraft.passages.length > 0 && (
          <div style={{ ...styles.sermonChipsRow, padding: '0 20px', marginTop: 0, marginBottom: 8 }}>
            {sermonDraft.passages.map((p, i) => (
              <button key={i} type="button" style={styles.sermonChip} onClick={() => removeSermonVerse(i)} aria-label={t('sermonNote.removeVerse', { ref: passageRefLabel(p) }, lang)}>
                {passageRefLabel(p)} <span style={styles.sermonChipX}>×</span>
              </button>
            ))}
          </div>
        )}

        <div style={styles.sermonWritingSurface}>
          {body.map((seg, i) => {
            if (seg.type === 'quote') {
              return (
                <div key={seg.id} style={styles.sermonQuoteBlock}>
                  <button type="button" style={styles.sermonQuoteRemove} onClick={() => removeSermonSegment(seg)} aria-label={t('sermonNote.removeVerse', { ref: seg.ref }, lang)}>×</button>
                  <p style={styles.sermonQuoteText}>&ldquo;{seg.text}&rdquo;</p>
                  <p style={styles.sermonQuoteRef}>{seg.ref} · {getSelectedVersionId(lang).toUpperCase()}</p>
                </div>
              )
            }
            if (seg.type === 'topic') {
              topicCount++
              return (
                <div key={seg.id} style={styles.sermonTopicRow}>
                  <span style={styles.sermonTopicNum}>{topicCount}</span>
                  <textarea
                    style={styles.sermonBodyTextarea}
                    value={seg.text}
                    placeholder={t('sermonNote.topicPlaceholder', undefined, lang)}
                    onChange={e => { updateSermonSegmentText(seg.id, e.target.value); autoGrowTextarea(e) }}
                    onFocus={e => handleSermonSegmentFocus(seg.id, e)}
                    onInput={autoGrowTextarea}
                    rows={1}
                  />
                </div>
              )
            }
            return (
              <textarea
                key={seg.id}
                style={styles.sermonBodyTextarea}
                value={seg.text}
                placeholder={i === 0 ? t('sermonNote.textPlaceholder', undefined, lang) : ''}
                onChange={e => { updateSermonSegmentText(seg.id, e.target.value); autoGrowTextarea(e) }}
                onFocus={e => handleSermonSegmentFocus(seg.id, e)}
                onInput={autoGrowTextarea}
                autoFocus={i === body.length - 1}
                rows={1}
              />
            )
          })}
        </div>

        <div style={styles.sermonWritingToolbar}>
          <button type="button" style={styles.sermonToolbarBtn} onClick={openVerseSearch}>
            <AppIcon name="Plus" size={13} strokeWidth={2.4} color="var(--bento-sand-icon)" />
            {t('sermonNote.verseBtn', undefined, lang)}
          </button>
          <button type="button" style={styles.sermonToolbarBtn} onClick={insertTopicSegment}>
            <AppIcon name="List" size={13} strokeWidth={2.4} color="var(--bento-t3)" />
            {t('sermonNote.topicBtn', undefined, lang)}
          </button>
          {sermonDictationSupported && (
            <button
              type="button" style={{ ...styles.sermonToolbarIconBtn, ...(sermonDictating ? styles.sermonToolbarIconBtnOn : {}) }}
              onClick={() => (sermonDictating ? stopDictation() : startDictation())}
              aria-label={t('sermonNote.dictateBtn', undefined, lang)}
            >
              <AppIcon name="Mic" size={15} strokeWidth={2.2} color={sermonDictating ? '#fff' : 'var(--bento-t3)'} />
            </button>
          )}
          <button type="button" style={styles.sermonKeyboardDownBtn} onClick={exitSermonWriting} aria-label={t('sermonNote.minimize', undefined, lang)}>
            <AppIcon name="ArrowDown" size={16} strokeWidth={2.4} color="var(--bento-accent)" />
          </button>
        </div>
      </>
    )
  }

  // Busca de referência (34g, "Versículo") — funil de 3 toques, ver
  // Regra 5 no topo do arquivo (comentário de sermonVerseSearchOpen).
  function renderVerseSearch() {
    const allBooks = blocks.flatMap(b => b.books.map((name, i) => ({ pt: name, en: b.booksEn[i] })))
    const query = foldAccents(sermonVerseSearchQuery.trim())
    const filteredBooks = query ? allBooks.filter(b => foldAccents(lang === 'en' ? b.en : b.pt).includes(query)) : allBooks
    const stepTitle = sermonVerseSearchStep === 'book' ? t('sermonNote.verseSearchBookStep', undefined, lang)
      : sermonVerseSearchStep === 'chapter' ? t('sermonNote.verseSearchChapterStep', undefined, lang)
      : t('sermonNote.verseSearchVerseStep', undefined, lang)
    return (
      <>
        <div style={styles.sermonSourceHeader}>
          <button
            type="button" style={styles.sermonChevronBtn}
            onClick={() => {
              if (sermonVerseSearchStep === 'verse') setSermonVerseSearchStep('chapter')
              else if (sermonVerseSearchStep === 'chapter') setSermonVerseSearchStep('book')
              else setSermonVerseSearchOpen(false)
            }}
            aria-label={t('sermonNote.ready', undefined, lang)}
          >
            <AppIcon name="ChevronLeft" size={16} color="var(--bento-ink)" />
          </button>
          <p style={{ ...styles.sermonSourceTitle, flex: 1, minWidth: 0 }}>{stepTitle}</p>
          <button type="button" style={styles.sermonReadyBtn} onClick={() => setSermonVerseSearchOpen(false)}>{t('sermonNote.ready', undefined, lang)}</button>
        </div>
        <div style={{ ...styles.sermonSheetBody, overflowY: 'auto' }}>
          {sermonVerseSearchStep === 'book' && (
            <>
              <input
                style={styles.sermonOtherTypeInput}
                value={sermonVerseSearchQuery}
                onChange={e => setSermonVerseSearchQuery(e.target.value)}
                placeholder={t('sermonNote.verseSearchBookPlaceholder', undefined, lang)}
                autoFocus
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                {filteredBooks.map(b => (
                  <button key={b.pt} type="button" style={styles.sermonVerseSearchRow} onClick={() => pickVerseSearchBook(b)}>
                    {lang === 'en' ? b.en : b.pt}
                  </button>
                ))}
              </div>
            </>
          )}
          {sermonVerseSearchStep === 'chapter' && sermonVerseSearchBook && (
            <div style={styles.sermonVerseSearchChapterGrid}>
              {Array.from({ length: bookChapterCounts[sermonVerseSearchBook.pt] ?? 0 }, (_, i) => i + 1).map(ch => (
                <button key={ch} type="button" style={styles.sermonVerseSearchChapterBtn} disabled={sermonVerseSearchBusy} onClick={() => pickVerseSearchChapter(ch)}>{ch}</button>
              ))}
            </div>
          )}
          {sermonVerseSearchStep === 'verse' && sermonVerseSearchChapter && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.keys(sermonVerseSearchChapter.verses ?? {}).sort((a, b) => Number(a) - Number(b)).map(v => (
                <button key={v} type="button" style={styles.sermonVerseSearchRow} onClick={() => pickVerseSearchVerse(Number(v))}>
                  <span style={styles.sermonVerseSearchVerseNum}>{v}</span> {(sermonVerseSearchChapter.verses[v] ?? '').replace(/\n/g, ' ').slice(0, 60)}
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  // 34h — o resumo. "'Finalizar' não fecha a anotação em silêncio: ela
  // volta lida" (README). Full-screen dentro da mesma folha, igual 34g.
  function renderSermonSummary() {
    const topics = (sermonDraft.body ?? []).filter(s => s.type === 'topic' && s.text.trim())
    const minutes = Math.max(1, Math.round((sermonDraft.durationSeconds ?? 0) / 60))
    const groups = session.myGroups ?? []
    const selectedGroup = groups.find(g => sermonSelectedGroupIds.includes(g.groupId))
    return (
      <div style={{ ...styles.sermonSheetBody, overflowY: 'auto', paddingTop: 4 }}>
        <div style={styles.sermonHeader}>
          <button type="button" style={styles.sermonChevronBtn} onClick={backToWritingFromSummary} aria-label={t('sermonNote.backToWriting', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={16} color="var(--bento-ink)" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.sermonHeaderTitle}>{sermonDraft.title.trim() || t('sermonNote.newTitle', undefined, lang)}</p>
            <p style={styles.sermonHeaderSub}>
              {[sermonTypeLabel(sermonDraft.noteType, lang), sermonDateShort(sermonDraft.date, lang), t('sermonNote.minAnnotating', { min: minutes }, lang)].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {sermonSummaryLoading && (
          <p style={styles.sermonSummaryLoadingText}>{t('sermonNote.summaryLoading', undefined, lang)}</p>
        )}
        {sermonSummaryData && (
          <div style={styles.sermonSummaryCard}>
            <div style={styles.sermonOnScreenLabelDark}>
              <span style={styles.sermonSummaryDiamond} />
              {t('sermonNote.whatStayedLabel', undefined, lang)}
            </div>
            <p style={styles.sermonSummaryText}>
              {sermonSummaryData.before ? `${sermonSummaryData.before} ` : ''}
              <strong style={styles.sermonSummaryHighlight}>{sermonSummaryData.highlight}</strong>
              {sermonSummaryData.after ? `. ${sermonSummaryData.after}` : '.'}
            </p>
            <p style={styles.sermonSummaryFootnote}>{t('sermonNote.summaryFooterNote', undefined, lang)}</p>
          </div>
        )}

        {topics.length > 0 && (
          <div style={styles.sermonPointsCard}>
            <p style={styles.sermonSectionLabel}>{t('sermonNote.pointsMarkedLabel', undefined, lang)}</p>
            {topics.map((seg, i) => (
              <div key={seg.id} style={styles.sermonPointRow}>
                <span style={styles.sermonPointNum}>{i + 1}</span>
                <p style={styles.sermonPointText}>{seg.text}</p>
              </div>
            ))}
          </div>
        )}

        {sermonDraft.passages.length > 0 && (
          <div style={styles.sermonPassagesCard}>
            <div style={styles.sermonOnScreenTop}>
              <span style={styles.sermonOnScreenLabel}>
                <span style={styles.sermonOnScreenDiamond} />
                {t(sermonDraft.passages.length === 1 ? 'sermonNote.passagesTitleOne' : 'sermonNote.passagesTitleMany', { n: femininePassageCount(sermonDraft.passages.length, lang) }, lang)}
              </span>
              <button type="button" style={styles.sermonMarkOnBibleBtn} onClick={markPassagesOnBible} disabled={sermonMarkingHighlights || sermonHighlightsMarked}>
                {sermonHighlightsMarked ? t('sermonNote.markedOnBible', undefined, lang) : t('sermonNote.markOnBible', undefined, lang)}
              </button>
            </div>
            <div style={styles.sermonChipsRow}>
              {sermonDraft.passages.map((p, i) => (
                <span key={i} style={styles.sermonChipStatic}>{passageRefLabel(p)}</span>
              ))}
            </div>
          </div>
        )}

        {groups.length > 0 && (
          <div style={styles.sermonGroupCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.sermonFieldLabel2}>{t('sermonNote.takeToGroupLabel', undefined, lang)}</p>
              <button
                type="button" style={styles.sermonGroupPickLink}
                onClick={() => (groups.length > 1 ? setSermonGroupPickerOpen(true) : null)}
              >
                {selectedGroup
                  ? `${selectedGroup.name} · ${t(sermonGroupMemberCounts[selectedGroup.groupId] === 1 ? 'reading.groupMemberOne' : 'reading.groupMemberMany', { n: sermonGroupMemberCounts[selectedGroup.groupId] ?? 0 }, lang)}`
                  : t('sermonNote.chooseGroupCta', undefined, lang)}
              </button>
            </div>
            <button
              role="switch" aria-checked={sermonShareOn}
              onClick={() => {
                const next = !sermonShareOn
                setSermonShareOn(next)
                if (next && groups.length === 1 && sermonSelectedGroupIds.length === 0) setSermonSelectedGroupIds([groups[0].groupId])
                if (next && groups.length > 1 && sermonSelectedGroupIds.length === 0) setSermonGroupPickerOpen(true)
              }}
              style={{ ...styles.sermonToggle, background: sermonShareOn ? 'var(--bento-ink)' : 'var(--bento-toggle-off)', justifyContent: sermonShareOn ? 'flex-end' : 'flex-start' }}
            >
              <span style={{ ...styles.sermonToggleThumb, background: sermonShareOn ? 'var(--bento-accent)' : '#fff' }} />
            </button>
          </div>
        )}

        <div style={styles.sermonSummaryFooter}>
          <button type="button" style={{ ...styles.sermonSaveToLibraryBtn, ...(sermonFinalizing ? styles.sermonSaveBtnDisabled : {}) }} disabled={sermonFinalizing} onClick={finalizeSermonNote}>
            {t('sermonNote.saveToLibrary', undefined, lang)}
          </button>
          <button type="button" style={styles.sermonBackToWritingBtn} onClick={backToWritingFromSummary}>
            {t('sermonNote.backToWriting', undefined, lang)}
          </button>
        </div>
      </div>
    )
  }

  // Selo + FAB (34e) + folha (34d/34f/escolha de grupo) — anexado em TODA
  // saída desta tela (README: "vive... na Bíblia inteira"), não só quando
  // um capítulo está aberto. Portal pro <body>, mesmo truque de
  // centralização de .bottom-nav (ver estilos, no fim do arquivo).
  function renderSermonWidget() {
    // Altura AO VIVO da folha — durante o arrasto, segue o dedo (clampada
    // em SHEET_MIN_VH pra nunca ficar ridícula antes de soltar); parada,
    // é a altura já assentada (34d Regra 2: "solta em três alturas"). Em
    // 34g/34h (sermonWriting/sermonSummaryOpen) a folha toma a tela
    // inteira e o arrasto nem existe (nenhuma das duas tem alça).
    const sermonFullScreen = sermonWriting || sermonSummaryOpen
    const liveVh = sermonFullScreen
      ? 100
      : sheetDragState.current
      ? Math.max(SHEET_MIN_VH, Math.min(94, (sermonSheetHeight === 'full' ? SHEET_FULL_VH : SHEET_HALF_VH) - sermonDragOffset / (window.innerHeight / 100)))
      : (sermonSheetHeight === 'full' ? SHEET_FULL_VH : SHEET_HALF_VH)

    return (
      <>
        {/* 34e — lápis flutuante. HANDOFF: "vive nas duas leituras e na
            Bíblia inteira... sem anotação em andamento ele aparece SEM
            SELO, e um toque começa uma nova" — o lápis em si NÃO depende
            de sermonDraft existir (achado comparando com o PNG: a versão
            anterior só desenhava o lápis quando já havia um rascunho, o
            que o fazia sumir de vez sem nenhuma anotação em andamento).
            A tarja (título + contagem) e o selo é que só existem COM
            draft. */}
        {!sermonNoteOpen && createPortal(
          <div style={styles.sermonFabWrap}>
            {sermonDraft && sermonTarjaVisible && (
              <button type="button" style={styles.sermonTarja} onClick={() => { setSermonSheetHeight('full'); setSermonNoteOpen(true) }}>
                <span style={styles.sermonTarjaDot} />
                <span style={{ minWidth: 0 }}>
                  <span style={styles.sermonTarjaTitle}>{sermonDraft.title.trim() || t('sermonNote.newTitle', undefined, lang)}</span>
                  <span style={styles.sermonTarjaSub}>
                    {sermonDraft.passages.length === 0
                      ? t('sermonNote.minimizedAnnotatingNone', undefined, lang)
                      : t(sermonDraft.passages.length === 1 ? 'sermonNote.minimizedAnnotatingOne' : 'sermonNote.minimizedAnnotatingMany', { n: sermonDraft.passages.length }, lang)}
                  </span>
                </span>
              </button>
            )}
            <button
              type="button" style={{ ...styles.sermonFab, transform: `translate(${sermonFabDrag.x}px, ${sermonFabDrag.y}px)` }}
              onPointerDown={handleFabPointerDown} onPointerMove={handleFabPointerMove} onPointerUp={handleFabPointerUp} onPointerCancel={handleFabPointerUp}
              aria-label={t('sermonNote.newTitle', undefined, lang)}
            >
              <AppIcon name="PenLine" size={22} color="#1A1714" strokeWidth={2.2} />
              {sermonDraft && sermonDraft.passages.length > 0 && <span style={styles.sermonFabBadge}>{sermonDraft.passages.length}</span>}
            </button>
          </div>,
          document.body
        )}

        {/* 34d — a folha SOBRE o texto: diferente do modal antigo (backdrop
            opaco cobrindo tudo), o capítulo continua visível e rolável por
            trás, só com um véu por cima (34d Regra 2) — por isso o véu tem
            pointer-events:none (o toque passa reto pro capítulo por baixo)
            e não existe onClick nenhum fechando a folha ao tocar fora. */}
        {sermonNoteOpen && sermonDraft && createPortal(
          <>
            {/* 34g/34h não têm véu (nada visível atrás pra escurecer — "o
                texto bíblico sai de cena"). */}
            {!sermonFullScreen && <div style={{ ...styles.sermonVeil, bottom: `${liveVh}vh` }} />}
            <div style={{ ...styles.sermonSheet, height: `${liveVh}vh`, ...(sermonFullScreen ? styles.sermonSheetWriting : null) }}>
              {/* 34g/34h também não têm alça de arrasto — a folha já É a
                  tela inteira, não há pra onde arrastar. */}
              {!sermonFullScreen && (
                <div
                  style={styles.sermonHandleWrap}
                  onPointerDown={handleSheetHandlePointerDown} onPointerMove={handleSheetHandlePointerMove}
                  onPointerUp={handleSheetHandlePointerUp} onPointerCancel={handleSheetHandlePointerUp}
                >
                  <span style={styles.sermonHandle} />
                </div>
              )}
              {sermonSummaryOpen ? (
                renderSermonSummary()
              ) : sermonWriting ? (
                renderSermonWriting()
              ) : sermonSourceOpen ? (
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
                  <div style={{ ...styles.sermonSheetBody, overflowY: 'auto' }}>
                    <div style={styles.sermonTypeCard}>
                      <p style={styles.sermonSectionLabel}>{t('sermonNote.whatAreYouNoting', undefined, lang)}</p>
                      <div style={styles.sermonTypeGrid}>
                        {SERMON_NOTE_TYPES.map(type => (
                          <button
                            key={type} type="button"
                            style={{ ...styles.sermonTypePill, ...(sermonDraft.noteType === type ? styles.sermonTypePillOn : {}) }}
                            onClick={() => { patchSermonDraft({ noteType: type }); setSermonOtherOpen(false) }}
                          >
                            <span style={{ ...styles.sermonTypeDot, ...(sermonDraft.noteType === type ? styles.sermonTypeDotOn : {}) }} />
                            {sermonTypeLabel(type, lang)}
                          </button>
                        ))}
                        {/* "Outros" (Regra 4 §5) — abre um campo curto pra
                            escrever o tipo com as próprias palavras; o que
                            ela digitou fica marcado (selecionado) mesmo
                            depois de fechar o campo. */}
                        <button
                          type="button"
                          style={{ ...styles.sermonTypePill, ...(isCustomSermonType ? styles.sermonTypePillOn : {}) }}
                          onClick={() => setSermonOtherOpen(v => !v)}
                        >
                          <span style={{ ...styles.sermonTypeDot, ...(isCustomSermonType ? styles.sermonTypeDotOn : {}) }} />
                          {isCustomSermonType ? sermonDraft.noteType : t('sermonNote.typeOther', undefined, lang)}
                        </button>
                      </div>
                      {(sermonOtherOpen || isCustomSermonType) && (
                        <>
                          <input
                            style={styles.sermonOtherTypeInput}
                            value={isCustomSermonType ? sermonDraft.noteType : ''}
                            placeholder={t('sermonNote.otherTypePlaceholder', undefined, lang)}
                            onChange={e => patchSermonDraft({ noteType: e.target.value })}
                            autoFocus={sermonOtherOpen && !isCustomSermonType}
                          />
                          {/* Reaproveita tipos que ela já escreveu antes
                              (Regra 4 §5: "vira uma opção reaproveitável nas
                              próximas anotações") — sem inventar um 7º
                              botão fixo no grid, só sugestões dentro do
                              próprio campo "Outros". */}
                          {sermonCustomTypes.filter(ct => ct !== sermonDraft.noteType).length > 0 && (
                            <div style={styles.sermonOtherSuggestRow}>
                              {sermonCustomTypes.filter(ct => ct !== sermonDraft.noteType).map(ct => (
                                <button key={ct} type="button" style={styles.sermonOtherSuggestChip} onClick={() => patchSermonDraft({ noteType: ct })}>{ct}</button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div style={styles.sermonFieldsHead}>
                      <span style={styles.sermonSectionLabel}>{t('sermonNote.fromLabel', undefined, lang)}</span>
                      <span style={styles.sermonOptionalTag}>{t('sermonNote.fromOptional', undefined, lang)}</span>
                    </div>
                    <div style={styles.sermonSourceFieldsCard}>
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
                  <div style={{ ...styles.sermonSheetBody, overflowY: 'auto' }}>
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
                      type="button" style={{ ...styles.sermonSaveBtn, ...(sermonSaving ? styles.sermonSaveBtnDisabled : {}) }}
                      disabled={sermonSaving}
                      onClick={saveSermonDraft}
                    >
                      {t('sermonNote.save', undefined, lang)}
                    </button>
                  </div>

                  <div style={styles.sermonSheetBody}>
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

                    {/* Toque na área de escrita → 34g (teclado sobe, folha
                        em tela cheia). Uma vez que o corpo já tem blocos
                        (citação/tópico — só existem depois de visitar
                        34g), esta área simples de 34d não consegue mais
                        representar o conteúdo de verdade (é só um
                        <textarea>, sem como desenhar um bloco citado) —
                        vira um botão de PRÉVIA que leva direto pra 34g,
                        em vez de deixar editar e arriscar perder a
                        estrutura. */}
                    {(!sermonDraft.body || sermonDraft.body.length <= 1) ? (
                      <textarea
                        style={styles.sermonTextarea}
                        value={sermonDraft.body?.[0]?.text ?? sermonDraft.text}
                        placeholder={t('sermonNote.textPlaceholder', undefined, lang)}
                        onFocus={enterSermonWriting}
                        onChange={e => {
                          const val = e.target.value
                          patchSermonDraft(sermonDraft.body?.[0]
                            ? { text: val, body: [{ ...sermonDraft.body[0], text: val }] }
                            : { text: val })
                        }}
                      />
                    ) : (
                      <button type="button" style={{ ...styles.sermonTextarea, textAlign: 'left', cursor: 'pointer' }} onClick={enterSermonWriting}>
                        {sermonDraft.body.map(seg => (seg.type === 'quote' ? `"${seg.text}"` : seg.text)).filter(Boolean).join(' ')}
                      </button>
                    )}
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
          </>,
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
  // 34d — o véu (rgba(26,23,20,.18), Regra 4 da área inteira) cobre o
  // capítulo visível ATÉ o topo da folha (bottom dinâmico = altura da
  // folha, ver renderSermonWidget). pointerEvents:none É o que deixa o
  // capítulo rolável por baixo enquanto a folha está por cima (34d texto:
  // "rolável por baixo da folha e coberto por um véu").
  // top = altura do cabeçalho da leitura (readerHeader em ReadingBlockView.
  // jsx: padding 20px+34px de chip+14px = 68px, sem elemento de safe-area
  // próprio nesse cabeçalho) — o véu cobre só o capítulo, o cabeçalho
  // (seletor de capítulo/versão) fica por fora, sem escurecer (34d: só "o
  // capítulo" leva véu, não o cabeçalho).
  sermonVeil: { position: 'fixed', top: 68, left: 0, right: 0, background: 'rgba(26,23,20,.18)', zIndex: 198, pointerEvents: 'none' },
  // A folha em si — fixed no rodapé, altura controlada por
  // renderSermonWidget (arrasto ao vivo ou já assentada numa das 3
  // alturas). Fundo = cor de fundo da tela (34d token), raio 32 só em
  // cima, sombra alta (34d texto: "sombra alta 0 -12px 34px rgba(26,23,
  // 20,.16)").
  sermonSheet: {
    position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 'var(--max-width)', bottom: 0, zIndex: 199,
    background: 'var(--bento-bg)', borderRadius: '32px 32px 0 0', boxShadow: '0 -12px 34px rgba(26,23,20,.16)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  sermonHandleWrap: { flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '10px 0 6px', cursor: 'grab', touchAction: 'none' },
  sermonHandle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-line)' },
  sermonSheetBody: { flex: 1, minHeight: 0, padding: '0 20px 12px', display: 'flex', flexDirection: 'column' },
  // 34g: a folha já É a tela inteira — sem canto arredondado (não tem
  // mais o que "cobrir por cima"), sem sombra, sem alça (ver render:
  // !sermonWriting condiciona a alça).
  sermonSheetWriting: { borderRadius: 0, boxShadow: 'none' },

  // 34e — lápis + tarja. A posição base já fica no canto inferior direito
  // (touchAction:none evita o scroll da página brigar com o arrasto
  // vertical); sermonFabDrag desloca a partir daí via transform.
  sermonFabWrap: {
    position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 'var(--max-width)',
    bottom: 'calc(var(--safe-bottom) + 16px)', zIndex: 199, padding: '0 20px',
    display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none',
  },
  // Tarja escura (34e token: preto #1A1714, raio 18) — "some sozinha
  // depois de alguns segundos" (ver sermonTarjaVisible/timeout).
  sermonTarja: {
    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, height: 52, padding: '0 16px 0 14px',
    borderRadius: 18, border: 'none', background: 'var(--bento-ink)', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'var(--font-bento)', pointerEvents: 'auto',
  },
  sermonTarjaDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--bento-accent)', flexShrink: 0 },
  sermonTarjaTitle: { display: 'block', fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sermonTarjaSub: { display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.5)', marginTop: 1 },
  // O lápis (34e tokens: 58×58, raio 20, laranja, sombra
  // 0 8px 20px rgba(240,102,43,.4)). Selo preto no canto superior direito
  // com o número em laranja.
  sermonFab: {
    position: 'fixed', right: 20, bottom: 'calc(var(--safe-bottom) + 16px)', zIndex: 199, touchAction: 'none', pointerEvents: 'auto',
    width: 58, height: 58, borderRadius: 20, border: 'none', background: 'var(--bento-accent)', boxShadow: '0 8px 20px rgba(240,102,43,.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab',
  },
  sermonFabBadge: {
    position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, padding: '0 5px', borderRadius: 99, background: 'var(--bento-ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, color: 'var(--bento-accent)',
  },

  sermonHeader: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '4px 20px 14px' },
  sermonHeaderTitle: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sermonHeaderSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sermonChevronBtn: { flexShrink: 0, width: 34, height: 34, borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  sermonSaveBtn: { flexShrink: 0, height: 34, padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--bento-accent)', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  sermonSaveBtnDisabled: { opacity: 0.4, cursor: 'default' },

  sermonOnScreenCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '12px 14px', marginBottom: 12, flexShrink: 0 },
  sermonOnScreenTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sermonOnScreenLabel: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-sand-label)' },
  sermonOnScreenDiamond: { width: 9, height: 9, borderRadius: 2, background: 'var(--bento-sand-icon)', transform: 'rotate(45deg)', flexShrink: 0 },
  sermonAddVerseBtn: { flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 11, border: 'none', background: 'var(--bento-sand-icon)', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-sand)', cursor: 'pointer' },
  sermonChipsRow: { display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  sermonChip: { height: 30, padding: '0 12px', borderRadius: 11, border: 'none', background: 'rgba(255,255,255,.6)', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-sand-ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  sermonChipX: { fontSize: 13, fontWeight: 700, color: 'var(--bento-sand-ink-mid)' },

  // 34g — tira das passagens (item 2 do HANDOFF): botão marrom + ficha
  // areia "N passagens" + hora, tudo numa linha só (o essencial do bloco
  // areia de 34d, encolhido).
  sermonPassageStrip: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px 14px', flexShrink: 0 },
  sermonAddVerseBtnSmall: { flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 11, border: 'none', background: 'var(--bento-sand-icon)', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-sand)', cursor: 'pointer' },
  sermonPassageCountChip: { flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 11, border: 'none', background: 'var(--bento-sand)', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-sand-ink)', cursor: 'pointer' },
  sermonPassageTime: { marginLeft: 'auto', flexShrink: 0, fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t4)' },

  // 34g — superfície de escrita (item 3): branco raio 26 só em cima,
  // segue até a barra de ferramentas "sem degrau" (raio 0 embaixo).
  sermonWritingSurface: { flex: 1, minHeight: 0, overflowY: 'auto', background: '#fff', borderRadius: '26px 26px 0 0', padding: '20px 20px 12px', display: 'flex', flexDirection: 'column', gap: 14 },
  sermonBodyTextarea: {
    width: '100%', border: 'none', outline: 'none', background: 'none', resize: 'none', overflow: 'hidden',
    fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 500, lineHeight: 1.75, color: 'var(--bento-ink)', padding: 0, caretColor: 'var(--bento-accent)',
  },
  // 34g — versículo inserido (item 4): fundo próprio (sem token exato no
  // app, hex do HANDOFF direto), filete marrom à esquerda, texto em
  // itálico. sermonQuoteRemove não está desenhado no quadro (nenhum
  // exemplo mostra o gesto de apagar em andamento), mas Regra 4 §7 exige
  // que apagar funcione — × discreto no canto, mesma linguagem das
  // fichas de passagem em todo o resto do pacote.
  sermonQuoteBlock: { position: 'relative', background: '#F7F2EA', borderLeft: '3px solid var(--bento-sand-icon)', borderRadius: '0 14px 14px 0', padding: '14px 36px 14px 16px' },
  sermonQuoteRemove: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(122,74,30,.12)', color: 'var(--bento-sand-icon)', fontSize: 14, fontWeight: 700, lineHeight: 1, cursor: 'pointer' },
  sermonQuoteText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.6, color: 'var(--bento-sand-ink)', margin: '0 0 6px' },
  sermonQuoteRef: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-sand-icon)', margin: 0 },
  // Tópico — numerado em laranja, mesma linguagem que 34h vai reusar pro
  // cartão "Os pontos que você marcou" (Bloco 4).
  sermonTopicRow: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  sermonTopicNum: { flexShrink: 0, width: 16, fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, color: 'var(--bento-accent)', lineHeight: 1.75, textAlign: 'center' },

  // 34g — barra acima do teclado (item 5): branca, filete em cima, só o
  // que se usa em pé (Versículo/Tópico/ditar) + botão preto que baixa o
  // teclado, encostado à direita.
  sermonWritingToolbar: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px calc(10px + var(--safe-bottom))', background: '#fff', borderTop: '1px solid var(--bento-line)' },
  sermonToolbarBtn: {
    flexShrink: 0, height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 13px', borderRadius: 13, border: 'none', background: 'var(--bento-line)',
    fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer',
  },
  sermonToolbarIconBtn: { flexShrink: 0, width: 38, height: 38, borderRadius: 13, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  sermonToolbarIconBtnOn: { background: 'var(--bento-accent)' },
  sermonKeyboardDownBtn: { marginLeft: 'auto', flexShrink: 0, width: 38, height: 38, borderRadius: 13, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  // Busca de referência (34g "Versículo") — funil livro→capítulo→
  // versículo, cartões brancos simples (não redesenhado a partir de
  // nenhum quadro — README/HANDOFF não desenham esta tela, só exigem
  // que ela exista de verdade, ver Regra 4 §7).
  sermonVerseSearchRow: { textAlign: 'left', display: 'flex', alignItems: 'baseline', gap: 8, width: '100%', padding: '13px 14px', borderRadius: 14, border: 'none', background: 'var(--bento-card)', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', cursor: 'pointer' },
  sermonVerseSearchVerseNum: { flexShrink: 0, fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, color: 'var(--bento-accent)' },
  sermonVerseSearchChapterGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 },
  sermonVerseSearchChapterBtn: { height: 44, borderRadius: 13, border: 'none', background: 'var(--bento-card)', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

  // 34h — item 2, "O que ficou desta anotação" (preto, cartão grande 26).
  sermonSummaryCard: { borderRadius: 26, background: 'var(--bento-ink)', padding: '20px 20px 18px', marginTop: 4 },
  sermonOnScreenLabelDark: { display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 14 },
  sermonSummaryDiamond: { width: 9, height: 9, borderRadius: 2, background: 'var(--bento-accent)', transform: 'rotate(45deg)', flexShrink: 0 },
  sermonSummaryText: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 500, lineHeight: 1.7, color: '#fff', margin: '0 0 14px' },
  sermonSummaryHighlight: { fontWeight: 700 },
  sermonSummaryFootnote: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.5)', margin: 0 },
  sermonSummaryLoadingText: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '8px 0' },

  // 34h — item 3, "Os pontos que você marcou" (branco, fixo, some se
  // não houver tópico nenhum).
  sermonPointsCard: { borderRadius: 26, background: '#fff', padding: '20px 20px 4px', marginTop: 12 },
  sermonPointRow: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  sermonPointNum: { flexShrink: 0, width: 18, fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, color: 'var(--bento-accent)', lineHeight: 1.5 },
  sermonPointText: { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-ink)', margin: 0 },

  // 34h — item 4, "As N passagens" (areia); fichas repetem as de 34d,
  // agora SEM "×" (não dá mais pra soltar por aqui).
  sermonPassagesCard: { borderRadius: 26, background: 'var(--bento-sand)', padding: '18px 20px', marginTop: 12 },
  sermonMarkOnBibleBtn: { flexShrink: 0, border: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-sand-icon)', cursor: 'pointer', padding: 0 },
  sermonChipStatic: { height: 30, padding: '0 12px', borderRadius: 11, background: 'rgba(255,255,255,.6)', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-sand-ink)', display: 'inline-flex', alignItems: 'center' },

  // 34h — item 5, "Levar ao grupo".
  sermonGroupCard: { display: 'flex', alignItems: 'center', gap: 14, borderRadius: 26, background: '#fff', padding: '18px 20px', marginTop: 12 },
  sermonFieldLabel2: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  sermonGroupPickLink: { border: 'none', background: 'none', padding: 0, textAlign: 'left', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', cursor: 'pointer' },

  // 34h — item 6, rodapé: "Guardar na biblioteca" (laranja 52px raio 18)
  // e "Voltar e escrever mais" (branco 46px).
  sermonSummaryFooter: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, paddingBottom: 12 },
  sermonSaveToLibraryBtn: { height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: 'var(--font-bento)', fontSize: 15.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  sermonBackToWritingBtn: { height: 46, borderRadius: 18, border: 'none', background: '#fff', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

  sermonTextarea: {
    flex: 1, minHeight: 150, width: '100%', border: 'none', borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px',
    fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 500, lineHeight: 1.65, color: 'var(--bento-ink)', resize: 'none', outline: 'none', caretColor: 'var(--bento-accent)',
  },
  sermonFooter: { flexShrink: 0, display: 'flex', gap: 8, padding: '12px 20px calc(12px + var(--safe-bottom))' },
  sermonFooterBtn: {
    flex: 1, height: 46, borderRadius: 16, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer',
  },
  sermonFooterIconBtn: { flexShrink: 0, width: 46, height: 46, borderRadius: 16, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  // "De onde veio" (34f) e "Grupo" (escolha de grupos, README: "a mesma
  // de 39f") — as duas trocam o conteúdo da mesma folha, mesmo cabeçalho.
  sermonSourceHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 20px 14px', flexShrink: 0 },
  // 34f token: "'De onde veio' (800/17)".
  sermonSourceTitle: { fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, letterSpacing: '-.3px', lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 2px' },
  sermonSourceDate: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  sermonReadyBtn: { flexShrink: 0, height: 34, padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--bento-accent)', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  sermonSectionLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  // 34f cartões grandes (token: "cartão grande 26") — "O que você está
  // anotando" e "De onde veio" são dois cartões BRANCOS separados sobre o
  // fundo da folha, cada um com seu rótulo DENTRO (não flutuando por
  // cima) — achado comparando com o PNG: a versão anterior desenhava o
  // rótulo/grade direto no fundo da folha, sem o cartão branco.
  sermonTypeCard: { borderRadius: 26, background: '#fff', padding: '18px 16px 16px', marginBottom: 12 },
  sermonTypeGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  sermonTypePill: {
    flex: '1 1 45%', minWidth: 130, display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', borderRadius: 15,
    border: 'none', background: 'var(--bento-line)', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', cursor: 'pointer', textAlign: 'left',
  },
  sermonTypePillOn: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },
  sermonTypeDot: { width: 8, height: 8, borderRadius: '50%', background: '#CFC6BC', flexShrink: 0 },
  sermonTypeDotOn: { background: 'var(--bento-accent)' },
  // "Outros" abre um campo curto (Regra 4 §5) — mesma linha do grid, mas
  // ocupando a largura toda (não é mais um botão, vira um campo de texto).
  sermonOtherTypeInput: {
    width: '100%', marginTop: 8, height: 48, padding: '0 14px', borderRadius: 15, border: 'none', background: 'var(--bento-line)',
    fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', outline: 'none',
  },
  sermonOtherSuggestRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  sermonOtherSuggestChip: {
    height: 30, padding: '0 12px', borderRadius: 11, border: 'none', background: 'var(--bento-line)',
    fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer',
  },
  // 34f: "De onde veio" (rótulo + "tudo opcional" + os 4 campos) é UM
  // cartão branco só, raio 26 — diferente de sermonFieldsCard (raio 18),
  // que continua servindo só o toggle de grupo (não redesenhado neste
  // bloco).
  sermonSourceFieldsCard: { borderRadius: 26, background: '#fff', padding: '18px 16px 4px' },
  sermonFieldsHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
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
