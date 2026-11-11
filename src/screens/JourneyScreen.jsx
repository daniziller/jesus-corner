// JourneyScreen.jsx — a aba "Bíblia": dona da navegação livre (raiz → livro
// → leitura → busca → tema) e da anotação de pregação. A raiz é B1
// (handoff-biblia-52, components/biblia/BibliaRaiz.jsx): os livros estão
// nela, por bloco — a lista de livros do testamento (39b) não existe mais.
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { sessionKeys, computeBookChapterCounts } from '../utils/progress'
import { getFreeReadingPosition } from '../bible/freeReadingPositionStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { useSpeechToText } from '../utils/useSpeechToText'
import BibliaRaiz from '../components/biblia/BibliaRaiz'
import { useReadingSessionToday } from '../biblia/useReadingSessionToday'
import { getSermonNotes, saveSermonNote, deleteSermonNote, sermonOwnWordsText, sermonOwnWordCount, generateSermonSummaryFor } from '../notes/sermonNotesStore'
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
import BuscaScreen from './BuscaScreen'
import ThemeAsStudyScreen from './ThemeAsStudyScreen'
import { getThemeById } from '../bible/themes'

// A anotação de sermão deixou de ser uma folha flutuante arrastável sobre
// a Bíblia (pedido dela, 2026-09-10 — "vamos fazer uma página mesmo de
// anotação") — virou uma tela própria (aba `sermonNote`, ver App.jsx), sem
// as três alturas/arrasto que a folha antiga tinha.

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

export default function JourneyScreen({
  session, authUser, blocks, sessionsByBlock, browseSessionsByBlock, completedSet,
  onToggleSession, onToggleChapter, onMarkChaptersManually, initialBlockId, entryMode, resumeSessionId, forceChapterContext, browseJumpTarget, onBrowseJumpConsumed, onNavigate, onContinueSession, onGoToReflectionFrom, onExitReading, onOpenGroupRoom, onPastRootChange, onBuildThemeStudy,
  // Anotação de sermão — tela própria (pedido dela, 2026-09-10). Quando
  // sermonNoteMode, esta tela renderiza SÓ a anotação (nada de mapa da
  // Bíblia/busca/livro/capítulo) como página normal, sem barra de
  // navegação (ver App.jsx, tela `sermonNote`) — reaproveita o mesmo
  // componente porque toda a lógica/estado da anotação sempre morou aqui.
  // sermonNoteFresh: true = "começar uma nova" (sempre limpa); false =
  // retomar o rascunho em andamento (lápis flutuante, 2026-09-12). onBack
  // = botão de voltar da tela (só usado em sermonNoteMode; ver
  // leaveSermonPage — minimiza, não finaliza mais nada). onOpenSermonNote
  // = toque no lápis flutuante enquanto navegando na Bíblia normal (não
  // sermonNoteMode) — navega pra tela de anotação pra retomar.
  // sermonNoteEditId (pedido dela, 2026-09-12): tocar uma anotação JÁ
  // FEITA na Biblioteca — carrega ESSA anotação específica por id
  // (finalizada ou não), em vez de "a primeira em andamento" (resume) ou
  // uma em branco (fresh). Tem prioridade sobre sermonNoteFresh.
  sermonNoteMode = false, sermonNoteFresh = false, sermonNoteEditId = null, onBack, onOpenSermonNote,
  // Toque na referência/texto de um versículo citado na anotação (pedido
  // dela, 2026-09-13): navega pra Bíblia de verdade, na sessão/capítulo
  // certo — mesmo mecanismo já usado por NotesScreen.jsx (openBiblePassage,
  // App.jsx). Só passado quando sermonNoteMode (ver App.jsx, tela
  // `sermonNote`).
  onOpenBiblePassage,
  // Cartão de progresso da raiz (B1) → Sua Bíblia (G2).
  onOpenSuaBiblia,
  // Selo de um livro completo (B2) → Um selo (G10).
  onOpenSelo,
  // Leitura livre (B4): a marcação que completa livro, bloco ou degrau
  // abre a tela de parabéns na hora (App.jsx, celebrateGamificationNow).
  onCelebrateNow,
}) {
  const { lang } = session
  // "Sessão de hoje" do cartão preto da raiz (B1) — hook, então fica antes
  // de qualquer retorno antecipado.
  const sessionTitle = useReadingSessionToday(session)
  // Total de capítulos por livro — usado pelo grid de capítulo da busca
  // de versículo da anotação de sermão (renderVerseSearch). Precisa ficar
  // ANTES do `if (sermonNoteMode) return renderSermonPage()` mais abaixo
  // (bug real, 2026-09-13: declarado depois do retorno antecipado, a
  // variável era lida antes de existir — tela branca ao escolher capítulo
  // dentro de "+ Versículo").
  const bookChapterCounts = computeBookChapterCounts(sessionsByBlock ?? {})
  // Busca — string (o texto inicial, vazio ao abrir pelo campo da raiz)
  // quando a busca está aberta, null quando não. 39l (themeOpenId) empilha
  // POR CIMA dela (não substitui: "‹" de 39l volta pra mesma busca).
  const [searchOpen, setSearchOpen] = useState(null)
  const [themeOpenId, setThemeOpenId] = useState(null)
  // Seletor de versão (cabeçalho, regra 3 da aba inteira: "vale pra aba
  // toda"). Só 1 versão por idioma hoje — ver BibleVersionChip.jsx.
  const [versionId, setVersionId] = useState(() => getSelectedVersionId(lang))

  // Bloco "aberto" (visão de leitura) — null significa visão geral (mapa de
  // blocos). Quando entryMode é 'reading' (ex: botão "Continuar sessão" na
  // Home/Rotina), já abre direto no bloco ativo, featurando a mesma sessão
  // do plano exibida lá (resumeSessionId), em vez do mapa — é a leitura
  // pela sessão do plano. Qualquer outra forma de entrar (busca, tocar num
  // livro) é navegação livre pela Bíblia, capítulo a capítulo, e passa pela
  // tela do livro (expandedBookKey, abaixo).
  const [expandedBlockId, setExpandedBlockId] = useState(entryMode === 'reading' ? initialBlockId : null)
  const [initialSessionId, setInitialSessionId] = useState(entryMode === 'reading' ? resumeSessionId : null)
  // Livro aberto (quadro 18a: Página do livro) — chave `${blockId}:${bookName}`,
  // navega pra uma tela própria (BookChapterScreen) em vez de expandir
  // inline na lista, como antes do reskin Bento.
  const [expandedBookKey, setExpandedBookKey] = useState(null)
  const [expandedInitialSessionId, setExpandedInitialSessionId] = useState(null)
  const [expandedInitialTextOpen, setExpandedInitialTextOpen] = useState(false)
  // Busca (B5–B7) e tema (39l): tocar um resultado chega aqui já com um
  // versículo pra focar — ver initialFocusVerse em ReadingBlockView.jsx.
  const [expandedInitialFocusVerse, setExpandedInitialFocusVerse] = useState(null)

  // Anotação de sermão — página própria (sermonNoteMode, ver App.jsx/aba
  // `sermonNote`) + lápis flutuante (34e) enquanto navega a Bíblia
  // normalmente. Ajuste dela (2026-09-12): o lápis só existe quando há um
  // rascunho de verdade EM ANDAMENTO (não finalizado, com conteúdo real)
  // — nunca pra começar um novo (isso é sempre "Anotar um sermão" da
  // Home). Só um draft por vez.
  const [sermonDraft, setSermonDraft] = useState(null)
  const [sermonSourceOpen, setSermonSourceOpen] = useState(false)
  const [sermonGroupPickerOpen, setSermonGroupPickerOpen] = useState(false)
  const [sermonShareOn, setSermonShareOn] = useState(false)
  const [sermonSelectedGroupIds, setSermonSelectedGroupIds] = useState([])
  const [sermonSaving, setSermonSaving] = useState(false)
  const [sermonGroupMemberCounts, setSermonGroupMemberCounts] = useState({})
  // Tarja escura de 34e — "some sozinha depois de alguns segundos",
  // deixando só o lápis.
  const [sermonTarjaVisible, setSermonTarjaVisible] = useState(true)
  const sermonTarjaTimeoutRef = useRef(null)
  useEffect(() => {
    if (sermonDraft && !sermonNoteMode) {
      setSermonTarjaVisible(true)
      window.clearTimeout(sermonTarjaTimeoutRef.current)
      sermonTarjaTimeoutRef.current = window.setTimeout(() => setSermonTarjaVisible(false), 4000)
    }
    return () => window.clearTimeout(sermonTarjaTimeoutRef.current)
  }, [sermonDraft, sermonNoteMode])
  // "Outros" (34f, Regra 4 §5) — texto livre digitado por ela vira uma
  // opção RE-APROVEITÁVEL: junta os noteType distintos que já usou antes
  // e que não são uma das 5 chaves fixas, oferece como sugestão dentro do
  // próprio campo "Outros" (não como um 7º botão fixo no grid — o grid é
  // 2×3 no quadro, ponto).
  const [sermonCustomTypes, setSermonCustomTypes] = useState([])
  const [sermonOtherOpen, setSermonOtherOpen] = useState(false)
  const isCustomSermonType = !!sermonDraft?.noteType && !SERMON_NOTE_TYPES.includes(sermonDraft.noteType)
  // Retoma um rascunho que ficou em andamento — uma anotação sem
  // finalizedAt (minimizada, não fechada) é o que alimenta tanto o lápis
  // (nesta tela, fora de sermonNoteMode) quanto a retomada de verdade
  // (dentro de sermonNoteMode, quando sermonNoteFresh=false). Roda nos
  // DOIS casos — cada instância desta tela (aba Bíblia e aba de anotação)
  // busca por si. Correção dela (2026-09-12): dentro de sermonNoteMode
  // com sermonNoteEditId setado (tocou uma anotação JÁ FEITA na
  // Biblioteca), busca por ID específico em vez de "a primeira em
  // andamento" — pode até já estar finalizada, tudo bem.
  useEffect(() => {
    if (!authUser?.email) return
    let cancelled = false
    getSermonNotes(authUser.email).then(notes => {
      if (cancelled) return
      const editingSpecificNote = sermonNoteMode && sermonNoteEditId
      const target = editingSpecificNote
        ? notes.find(n => n.id === sermonNoteEditId)
        : notes.find(n => !n.finalizedAt)
      if (target) {
        // Correção dela (2026-09-09): essa busca é assíncrona — se
        // "Anotar um sermão" já tiver criado um rascunho NOVO e em
        // branco nesse meio-tempo (setSermonDraft síncrono, roda antes
        // desta resposta de rede chegar), o `prev ? prev : ...` abaixo
        // NÃO deixa essa busca sobrescrever o formulário em branco com
        // os valores da anotação anterior — "o form sempre abre limpo".
        //
        // Bug real (varredura geral, 2026-09-19): esse MESMO guard
        // impedia abrir uma anotação B pela Biblioteca enquanto uma
        // anotação A ainda estava residente no state (a tela é a mesma
        // instância reaproveitada, sem remontar) — a pessoa achava que
        // tinha aberto B, via/editava A, e o texto ia pro lugar errado.
        // A corrida original só existe no ramo "retomar rascunho em
        // andamento" (abaixo, sem sermonNoteEditId, onde
        // startNewSermonNote() pode criar um rascunho novo NO MEIO desta
        // busca assíncrona) — o ramo "abrir uma anotação ESPECÍFICA"
        // (sermonNoteEditId setado) nunca cria rascunho novo nenhum, e
        // por isso pode — e deve — sempre confiar no que acabou de buscar.
        setSermonDraft(prev => (editingSpecificNote || !prev) ? {
          id: target.id, createdAt: target.createdAt ?? new Date().toISOString(), date: target.date ?? dateKey(),
          noteType: target.noteType ?? 'sermon', title: target.title ?? '', preacher: target.preacher ?? '',
          church: target.church ?? '', link: target.link ?? '', passages: target.passages ?? [], text: target.text ?? '',
          // Bug real encontrado por ela (2026-09-13): abrir uma anotação
          // JÁ SALVA (sermonNoteEditId) que não tem `body` estruturado —
          // formato antigo, de antes do corpo em blocos existir, ou salva
          // pelo formulário simples que a Biblioteca tinha antes da PR
          // #165 — caía direto na tela de escrita (sermonSourceOpen
          // começa false) SEM passar por ensureSermonBody() primeiro (só
          // chamado ao sair dos campos, "Pronto"), então a superfície de
          // escrita renderizava vazia mesmo com `target.text` preenchido
          // — "o texto sumiu". Garante aqui, na carga, um segmento de
          // texto com o conteúdo salvo — mesma coisa que ensureSermonBody
          // faria, só que sem depender de passar pelos campos antes.
          body: Array.isArray(target.body) && target.body.length > 0 ? target.body : [newSermonSegment('text', target.text ?? '')],
          finalizedAt: target.finalizedAt ?? null,
          durationSeconds: target.durationSeconds ?? 0, groupId: target.groupId ?? null,
        } : prev)
      }
      const custom = [...new Set(notes.map(n => n.noteType).filter(nt => nt && !SERMON_NOTE_TYPES.includes(nt)))]
      setSermonCustomTypes(custom)
    }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.email, sermonNoteMode, sermonNoteEditId])
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

  // A escrita — corpo rico (sermonDraft.body) é um ARRAY de blocos —
  // texto/citação/tópico — em vez de uma string só: é o que deixa um
  // versículo citado ficar DENTRO do fluxo sem que editar o texto ao
  // redor mexa nele (Regra 4 §7). Nasce vazio; ensureSermonBody() garante
  // que exista assim que sai dos campos (34f) — sem mais um estado
  // separado pra "está escrevendo" (2026-09-10): numa página só, é sempre
  // a mesma superfície de escrita, não duas telas alternando.
  const [focusedSegId, setFocusedSegId] = useState(null)
  const activeTextareaRef = useRef(null)
  // Pedido dela (2026-09-13): "ao adicionar, aparecer no texto, na hora
  // que a pessoa adicionou" — um tópico/versículo novo entra DEPOIS do
  // segmento com foco (insertSegmentAfterFocused), que pode estar no meio
  // do corpo, fora da área visível; sem isso a pessoa via a escrita voltar
  // sem sinal nenhum de que algo mudou. Guarda o id do segmento recém-
  // inserido; o efeito logo abaixo rola até ele assim que o DOM atualiza.
  const pendingScrollSegRef = useRef(null)
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
  // "Poder escolher 1 ou mais versículos" (pedido dela, 2026-09-13) —
  // números marcados no passo de versículo (toque liga/desliga), não mais
  // um toque só que já insere e fecha. Sempre da MESMA passagem (livro +
  // capítulo do passo anterior) — reseta ao trocar de capítulo/livro/abrir
  // a busca de novo, ver openVerseSearch/pickVerseSearchBook/Chapter.
  const [sermonVerseSearchSelected, setSermonVerseSearchSelected] = useState([])

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
  // "Apertei para finalizar e a anotação não salvou na biblioteca"
  // (achado dela, 2026-09-13) — a escrita real no backend podia falhar
  // (rede, sessão) sem NUNCA virar exceção (ver sermonNotesStore.js:
  // saveSermonNote devolvia o array otimista mesmo sem ter salvo nada de
  // verdade), então finalizeSermonNote/finishSermonWriting seguiam como
  // se tivesse dado certo — limpando o rascunho e navegando pra
  // Biblioteca com o conteúdo perdido em silêncio. Agora que o erro é de
  // verdade (throw), este estado avisa ela e MANTÉM o rascunho intacto
  // pra poder tentar de novo, em vez de sumir sem avisar.
  const [sermonSaveError, setSermonSaveError] = useState(false)

  // "24 min anotando" (34h, item 1: "o tempo real com a página aberta") —
  // acumula em sermonDraft.durationSeconds do MONTE ao DESMONTE da página
  // de anotação (sermonNoteMode); mesmo padrão de durationSeconds em
  // studyDayStore.js (soma, nunca sobrescreve). sermonDraftRef existe só
  // pra isto: o efeito abaixo registra UMA vez (dependências não mudam
  // durante o tempo de vida da tela) e sua limpeza roda no desmonte — sem
  // o ref, ela leria o `sermonDraft` de quando montou (fechamento
  // desatualizado), não o mais recente. Grava direto (não só troca o
  // state local, que está prestes a ser destruído de qualquer jeito).
  const sermonDraftRef = useRef(sermonDraft)
  useEffect(() => { sermonDraftRef.current = sermonDraft }, [sermonDraft])
  useEffect(() => {
    if (!sermonNoteMode) return
    const start = Date.now()
    return () => {
      const elapsed = Math.round((Date.now() - start) / 1000)
      const draft = sermonDraftRef.current
      if (elapsed <= 0 || !authUser?.email || !draft) return
      const updated = { ...draft, durationSeconds: (draft.durationSeconds ?? 0) + elapsed }
      saveSermonNote(authUser.email, buildSermonPayload(updated, { trim: false })).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sermonNoteMode])

  function newSermonSegment(type, text = '') {
    return { id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, text }
  }
  function ensureSermonBody() {
    if (!sermonDraft) return
    if (Array.isArray(sermonDraft.body) && sermonDraft.body.length > 0) return
    patchSermonDraft({ body: [newSermonSegment('text', sermonDraft.text ?? '')] })
  }
  // "Pronto" nos campos (34f) — garante que o corpo exista (idempotente)
  // e volta pra escrita, que é a página principal agora.
  function readyFromSermonFields() {
    ensureSermonBody()
    setSermonSourceOpen(false)
  }

  // "Finalizar" — "não fecha a anotação em silêncio: ela volta lida"
  // (34h). Persiste na hora (mesmo texto que ela acabou de escrever
  // precisa estar salvo antes de gerar o resumo) e entra em 34h; o
  // resumo em si é buscado por um efeito à parte (abaixo), disparado
  // quando sermonSummaryOpen fica true.
  async function finishSermonWriting() {
    setSermonSaveError(false)
    const ok = await saveSermonDraft()
    if (!ok) { setSermonSaveError(true); return }
    setSermonSummaryData(null)
    setSermonSummaryOpen(true)
  }
  // "Voltar e escrever mais" (34h) — "reabre a escrita com a anotação
  // como estava" (README).
  function backToWritingFromSummary() {
    setSermonSummaryOpen(false)
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
    setSermonSaveError(false)
    try {
      const finalDraft = { ...sermonDraft, finalizedAt: new Date().toISOString() }
      await saveSermonNote(authUser?.email, buildSermonPayload(finalDraft))
      if (sermonShareOn && sermonSelectedGroupIds.length > 0) {
        const target = sermonDraft.passages[0]
        if (target) {
          const body = [sermonDraft.title.trim(), sermonOwnWordsText(sermonDraft)].filter(Boolean).join('\n\n')
          const results = await Promise.allSettled(sermonSelectedGroupIds.map(groupId => postToRoom(groupId, target.book, target.chapter, body)))
          // Bug real (varredura geral, 2026-09-19): os resultados nunca
          // eram olhados — uma falha de rede em TODAS as publicações
          // passava batido, a anotação era salva e finalizada normal (o
          // que está certo — o texto em si não se perde), mas "levei ao
          // grupo" nunca de fato aconteceu, sem nenhum sinal disso em
          // lugar nenhum. Não bloqueia a finalização (o registro já foi
          // salvo com sucesso acima); só deixa de ser invisível.
          const failed = results.filter(r => r.status === 'rejected')
          if (failed.length > 0) console.error(`Failed to post sermon note to ${failed.length}/${results.length} group(s)`, failed.map(r => r.reason))
        } else {
          // "Levar ao grupo" precisa de um versículo citado pra saber em
          // qual sala de capítulo publicar (ver aviso renderSermonSummary,
          // mesma varredura) — se chegou aqui sem passagem (ex: citou,
          // ligou o compartilhamento, depois apagou a citação), o
          // compartilhamento não acontece; log só pra não ficar invisível
          // no console durante debug, a finalização em si segue normal.
          console.error('Sermon note share-to-group skipped: no cited passage to post to')
        }
      }
      setSermonDraft(null)
      setSermonSummaryOpen(false)
      setSermonSummaryData(null)
      setSermonHighlightsMarked(false)
      // Fecha qualquer OUTRO rascunho esquecido em aberto (ver comentário
      // de closeOtherOpenSermonDrafts) — sem isso, finalizar esta
      // anotação não tirava o lápis flutuante se sobrava um rascunho
      // antigo, de uma sessão anterior, ainda sem finalizedAt. Best-
      // effort, não trava a navegação esperando.
      closeOtherOpenSermonDrafts(finalDraft.id)
      onNavigate?.('notes')
    } catch (err) {
      console.error('Failed to finalize sermon note', err)
      // NÃO limpa o rascunho nem navega — se o salvamento falhou de
      // verdade, some daqui só pioraria (ver comentário de
      // sermonSaveError acima). Ela continua na tela pra tentar de novo.
      setSermonSaveError(true)
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
    pendingScrollSegRef.current = newSeg.id
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
  // Rola até o segmento recém-inserido (pendingScrollSegRef, ver acima) e
  // já deixa o cursor de digitação nele (pedido dela, 2026-09-13: "manter
  // o cursor de digitação no número do tópico") — precisa ser um efeito
  // (não fazer direto em insertSegmentAfterFocused) porque o elemento só
  // existe DEPOIS do re-render que o setSermonDraft acima dispara. Tópico
  // marca o `data-sermon-seg` na LINHA (número + campo), não no campo em
  // si — por isso procura uma textarea dentro, se o próprio elemento não
  // for uma (citação não tem nenhuma, foca em nada, de propósito).
  useEffect(() => {
    if (!pendingScrollSegRef.current) return
    const id = pendingScrollSegRef.current
    pendingScrollSegRef.current = null
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-sermon-seg="${id}"]`)
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      const focusEl = el instanceof HTMLTextAreaElement ? el : el?.querySelector('textarea')
      focusEl?.focus()
    })
  }, [sermonDraft?.body])
  // "Ao apertar o enter, sair do tópico e ir para texto livre" (pedido
  // dela, 2026-09-13) — tópico é um rótulo de UMA linha (Regra visual:
  // negrito, rows=1 com auto-crescimento), então Enter nunca deveria virar
  // quebra de linha ali. Se já existe um segmento seguinte (o normal —
  // insertSegmentAfterFocused sempre garante um texto livre logo depois
  // de um tópico novo), só move o foco pra ele; sem nenhum (tópico ficou
  // sozinho no fim, ex: nota antiga), cria um texto livre novo ali.
  function handleTopicEnterKey(segId, e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const body = sermonDraft?.body ?? []
    const idx = body.findIndex(s => s.id === segId)
    const next = idx !== -1 ? body[idx + 1] : null
    if (next) {
      requestAnimationFrame(() => {
        document.querySelector(`[data-sermon-seg="${next.id}"]`)?.focus()
      })
    } else {
      insertSegmentAfterFocused(newSermonSegment('text', ''))
    }
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
      // Bug real (varredura geral, 2026-09-19): citar o MESMO trecho duas
      // vezes só entra uma vez em `passages` (insertQuoteSegment já evita
      // duplicar ali) — mas removia daqui incondicionalmente ao apagar
      // QUALQUER bloco de citação com esse book/chapter/verseStart/
      // verseEnd, mesmo sobrando outro bloco idêntico ainda no corpo.
      // "N passagens"/os chips/"Marcar na Bíblia" perdiam a referência
      // mesmo com uma citação dela ainda visível na anotação. Agora só
      // remove se NENHUM outro bloco no corpo (depois de tirar este)
      // ainda referenciar o mesmo trecho.
      const stillReferenced = (p) => body.some(s =>
        (s.type === 'quote' || s.type === 'link') &&
        s.book === p.book && s.chapter === p.chapter && s.verseStart === p.verseStart && s.verseEnd === p.verseEnd
      )
      const passages = (seg.type === 'quote' || seg.type === 'link')
        ? prev.passages.filter(p => !(p.book === seg.book && p.chapter === seg.chapter && p.verseStart === seg.verseStart && p.verseEnd === seg.verseEnd) || stillReferenced(p))
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

  // insertLinkSegment/jumpToPassageFromNote/addOnScreenVerse ("Na tela
  // agora") removidos (2026-09-10) — dependiam da folha flutuar POR CIMA
  // do capítulo aberto atrás dela; numa página própria não tem capítulo
  // nenhum "na tela atrás", então o mecanismo inteiro deixou de fazer
  // sentido. "Versículo" (insertQuoteSegment, busca por toque) continua
  // sendo o único jeito de adicionar passagem — já era independente de
  // ter algo aberto atrás.

  function openVerseSearch() {
    setSermonVerseSearchOpen(true)
    setSermonVerseSearchStep('book')
    setSermonVerseSearchQuery('')
    setSermonVerseSearchBook(null)
    setSermonVerseSearchChapter(null)
    setSermonVerseSearchSelected([])
  }
  function pickVerseSearchBook(book) {
    setSermonVerseSearchBook(book)
    setSermonVerseSearchStep('chapter')
    setSermonVerseSearchSelected([])
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
      setSermonVerseSearchSelected([])
    } catch (err) {
      console.error('Failed to fetch chapter for verse search', err)
    } finally {
      setSermonVerseSearchBusy(false)
    }
  }
  // Liga/desliga um número na seleção (pedido dela, 2026-09-13: "poder
  // escolher 1 ou mais versículos") — não insere nada ainda, só marca; ver
  // confirmVerseSearchSelection abaixo, que de fato adiciona.
  function toggleVerseSearchSelection(verseNum) {
    setSermonVerseSearchSelected(prev => (
      prev.includes(verseNum) ? prev.filter(v => v !== verseNum) : [...prev, verseNum]
    ))
  }
  // Adiciona do menor ao maior número marcado, de uma vez só (exemplo dela:
  // "Gênesis 1 de 9 até 14" — marcar só 9 e 14 já basta, o intervalo
  // inteiro entra) — um quote SÓ, não um por versículo.
  function confirmVerseSearchSelection() {
    if (!sermonVerseSearchBook || !sermonVerseSearchChapter || sermonVerseSearchSelected.length === 0) return
    const verseStart = Math.min(...sermonVerseSearchSelected)
    const verseEnd = Math.max(...sermonVerseSearchSelected)
    const text = Array.from({ length: verseEnd - verseStart + 1 }, (_, i) => verseStart + i)
      .map(v => sermonVerseSearchChapter.verses?.[String(v)])
      .filter(Boolean)
      .join(' ')
      .replace(/\n/g, ' ')
    if (!text) return
    insertQuoteSegment({
      book: sermonVerseSearchBook.pt, bookEn: sermonVerseSearchBook.en,
      chapter: sermonVerseSearchChapter.chapter, verseStart, verseEnd, text,
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
  // Pedido dela (2026-09-10): toda anotação nova SEMPRE abre a página de
  // campos (34f — "o usuário vai ter os dados do título e tals e aí pode
  // começar a anotação"). sermonSourceOpen começa true aqui, e só vira
  // false quando ela toca "Pronto".
  function startNewSermonNote() {
    const newId = `sermon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setSermonDraft({
      id: newId,
      createdAt: new Date().toISOString(), date: dateKey(),
      noteType: 'sermon', title: '', preacher: '', church: '', link: '',
      passages: [], text: '', finalizedAt: null,
    })
    setSermonSourceOpen(true)
    setSermonGroupPickerOpen(false)
    setSermonShareOn(false)
    setSermonSelectedGroupIds([])
    closeOtherOpenSermonDrafts(newId)
  }

  // Ponto de entrada da página de anotação (sermonNoteMode) — só dispara
  // startNewSermonNote() quando ela chegou aqui pra criar uma nova
  // (sermonNoteFresh, vindo do botão "Anotar um sermão" da Home). Vindo
  // pelo lápis flutuante OU editando uma anotação já feita da Biblioteca
  // (sermonNoteFresh=false nos dois casos), não faz nada aqui — o efeito
  // de retomada acima já resgata o rascunho/anotação certa sozinho (pelo
  // primeiro em andamento, ou por sermonNoteEditId).
  useEffect(() => {
    if (sermonNoteMode && sermonNoteFresh) startNewSermonNote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sermonNoteMode, sermonNoteFresh])

  function patchSermonDraft(patch) {
    setSermonDraft(prev => prev ? { ...prev, ...patch } : prev)
  }

  function passageRefLabel(p) {
    const bookLabel = lang === 'en' ? (p.bookEn ?? p.book) : p.book
    const range = p.verseStart ? `:${p.verseStart}${p.verseEnd && p.verseEnd !== p.verseStart ? `-${p.verseEnd}` : ''}` : ''
    return `${bookLabel} ${p.chapter}${range}`
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
      ? draft.body.map(seg => {
          if (seg.type === 'quote') return `"${seg.text}" — ${seg.ref}`
          if (seg.type === 'link') return `→ ${seg.ref}`
          return seg.text
        }).filter(Boolean).join('\n\n')
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
  // Devolve true/false (achado dela, 2026-09-13: ver comentário de
  // sermonSaveError acima) — quem chama e PRECISA saber se salvou de
  // verdade (finishSermonWriting) confere o retorno; quem dispara isto
  // só "de boa fé" (autosave, openVerseInBible) continua sem esperar
  // nada, como sempre foi.
  async function saveSermonDraft() {
    if (!sermonDraft || sermonSaving) return true
    setSermonSaving(true)
    try {
      await saveSermonNote(authUser?.email, buildSermonPayload(sermonDraft))
      return true
    } catch (err) {
      console.error('Failed to save sermon note', err)
      return false
    } finally {
      setSermonSaving(false)
    }
  }

  // Toque no versículo citado (referência OU texto — pedido dela,
  // 2026-09-13): abre a passagem de verdade na Bíblia. Salva o rascunho
  // ANTES de navegar (saveSermonDraft, sem esperar o debounce de 1200ms do
  // autosave logo abaixo) porque ir pra aba `journey` desmonta esta
  // instância da tela (App.jsx só monta a aba ativa) — sem isso, o que
  // ainda não tinha sido salvo sozinho poderia se perder.
  function openVerseInBible(seg) {
    saveSermonDraft()
    onOpenBiblePassage?.(seg.book, seg.chapter)
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
  // "Tem algo de verdade escrito?" — pra decidir, ao sair, se vira
  // registro definitivo ou some sem deixar rastro (pedido dela,
  // 2026-09-12): abrir "Anotar um sermão" sem querer e sair na hora não
  // pode deixar uma anotação vazia pendurada na Biblioteca.
  function sermonDraftHasContent(draft) {
    if (!draft) return false
    if (draft.title.trim() || draft.preacher.trim() || draft.church.trim() || draft.link.trim()) return true
    if (draft.passages.length > 0) return true
    if (sermonOwnWordsText(draft).trim().length > 0) return true
    return false
  }

  // Bug real (achado dela, 2026-09-13: "a nota está ficando meio que em
  // aberto mesmo depois de finalizar" — o lápis flutuante continuava
  // aparecendo mesmo depois de finalizar a anotação em que ela tinha
  // acabado de trabalhar). Causa: "Anotar um sermão" sempre cria um
  // rascunho NOVO (sermonNoteFresh — pedido dela, 2026-09-10: "sempre
  // limpa"), sem nunca checar se já sobrava outro rascunho ainda sem
  // finalizedAt por aí (minimizado antes, nunca finalizado nem
  // apagado). Com dois (ou mais) rascunhos em aberto ao mesmo tempo, o
  // lápis/retomada (efeito acima, `notes.find(n => !n.finalizedAt)`) só
  // sabe achar "o primeiro sem finalizedAt" — finalizar UM não tira o
  // lápis se sobra outro esquecido. Chamado sempre que uma anotação
  // NOVA de verdade começa: fecha qualquer outro rascunho aberto (nunca
  // o que acabou de começar) — com conteúdo de verdade, finaliza
  // (mesma regra de "fechar o app", ver commitSermonDraft); vazio,
  // apaga (mesma regra de "voltar sem ter escrito nada", ver
  // leaveSermonPage). Best-effort, em segundo plano — não trava a
  // pessoa esperando pra começar a escrever a nova.
  async function closeOtherOpenSermonDrafts(exceptId) {
    if (!authUser?.email) return
    try {
      const notes = await getSermonNotes(authUser.email)
      const stray = notes.filter(n => !n.finalizedAt && n.id !== exceptId)
      for (const note of stray) {
        const normalized = {
          title: note.title ?? '', preacher: note.preacher ?? '', church: note.church ?? '',
          link: note.link ?? '', passages: note.passages ?? [], body: note.body ?? null, text: note.text ?? '',
        }
        if (sermonDraftHasContent(normalized)) {
          await saveSermonNote(authUser.email, { ...note, finalizedAt: note.finalizedAt ?? new Date().toISOString() })
        } else {
          await deleteSermonNote(authUser.email, note.id)
        }
      }
    } catch (err) {
      console.error('Failed to close stray sermon drafts', err)
    }
  }

  // Comita o rascunho ATUAL — pedido dela (2026-09-12): "quando a pessoa
  // fechar o app... guardar somente na biblioteca". Com conteúdo de
  // verdade, vira um registro finalizado comum (a mesma anotação pode
  // continuar recebendo edição via Biblioteca depois, como qualquer
  // outra); sem nada digitado, simplesmente apaga — devolve o draft
  // final (já com finalizedAt) pra quem chamou decidir o que fazer com o
  // state local, ou null se apagou.
  // Bug real (achado dela, 2026-09-19: "o lápis laranja continua na aba
  // da Bíblia mesmo quando uma anotação não está ativa"). `null` aqui
  // tinha dois sentidos diferentes — "não tinha nada pra fazer" (sem
  // draft, ou sem sessão) E "apaguei o rascunho vazio" — e o chamador só
  // tratava o segundo (`if (finalDraft) setSermonDraft(...)` ignorava
  // ambos igualmente). Sem separar os dois casos, o state local
  // (`sermonDraft`) nunca era limpo depois de apagar um rascunho vazio,
  // então o lápis flutuante continuava aparecendo mesmo sem nenhuma
  // anotação em andamento. Agora: `undefined` = não fez nada, state
  // local intacto; `null` = apagou de vez, chamador precisa refletir
  // isso limpando o state.
  function commitSermonDraft() {
    if (!sermonDraft || !authUser?.email) return undefined
    if (!sermonDraftHasContent(sermonDraft)) {
      deleteSermonNote(authUser.email, sermonDraft.id).catch(() => {})
      return null
    }
    const finalDraft = { ...sermonDraft, finalizedAt: sermonDraft.finalizedAt ?? new Date().toISOString() }
    saveSermonNote(authUser.email, buildSermonPayload(finalDraft, { trim: false })).catch(() => {})
    return finalDraft
  }

  // "...e ao fechar o app" (pedido dela, 2026-09-12) — comita na hora ao
  // perder foco, sem esperar o debounce do autosave (mesmo padrão de
  // ReadingBlockView.jsx/PrayerScreen.jsx/ReflectionScreen.jsx pra
  // "salvar ao sair"). Roda nas DUAS instâncias desta tela que podem ter
  // um sermonDraft local — a de escrita (sermonNoteMode) e a da Bíblia
  // com o lápis mostrando um rascunho em andamento — fechar o app em
  // QUALQUER uma das duas finaliza de vez, sem "rascunho pendurado" se
  // ela nunca mais voltar. Continua na tela (não navega), só mantém o
  // state local coerente com o que já foi salvo como finalizado.
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden) return
      const finalDraft = commitSermonDraft()
      if (finalDraft !== undefined) setSermonDraft(finalDraft)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sermonDraft, authUser?.email])

  // Botão de voltar da página (topo, sempre visível) — ajuste dela
  // (2026-09-12): voltar volta a ser um MINIMIZAR (não finaliza mais
  // nada) — o rascunho continua em andamento, e o lápis flutuante
  // aparece na Bíblia pra ela retomar. A ÚNICA exceção é um rascunho
  // vazio (abriu "Anotar um sermão" sem querer e saiu na hora): esse é
  // descartado, não vira lápis nenhum — sem isso, todo toque acidental
  // deixaria um "retângulo" pendurado de novo.
  function leaveSermonPage() {
    if (sermonDraft && authUser?.email && !sermonDraftHasContent(sermonDraft)) {
      deleteSermonNote(authUser.email, sermonDraft.id).catch(() => {})
      // Bug real (achado dela, 2026-09-19): apagava o rascunho vazio no
      // servidor mas nunca limpava o state local — como esta tela é a
      // MESMA instância reaproveitada pela aba Bíblia (só troca
      // sermonNoteMode), o lápis flutuante (renderSermonFab, guiado só
      // por `sermonDraft` truthy) continuava aparecendo lá mesmo sem
      // nenhuma anotação em andamento.
      setSermonDraft(null)
    }
    onBack?.()
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
  // simples (sem arrasto): navega pra página de anotação pra RETOMAR o
  // rascunho em andamento (onOpenSermonNote → App.jsx/resumeSermonNote).
  // O lápis só aparece com sermonDraft (ver renderSermonFab), então
  // chegando aqui sempre há o que retomar — criar uma anotação nova
  // continua sendo sempre o botão "Anotar um sermão" da Home.
  function handleFabPointerUp() {
    const moved = dragState.current?.moved
    const lastPos = dragState.current?.lastPos
    dragState.current = null
    if (!moved) { onOpenSermonNote?.(); return }
    if (lastPos) { try { window.localStorage.setItem('sermonFabPos', JSON.stringify(lastPos)) } catch { /* modo privado etc. — posição só não persiste */ } }
  }

  // Barra de abas fixa só na raiz — avisa App.jsx assim que a navegação
  // livre sai dela (o livro, ou a leitura aberta de dentro dele),
  // pra ele esconder a barra igual já faz com a leitura guiada. Roda de
  // novo no desmonte (voltar pra outra aba) — sem isso, journeyPastRoot
  // ficaria "true" preso em App.jsx entre uma visita e a próxima.
  // A busca (B5–B7) também é fora da raiz, sem barra de abas; a tela do
  // tema (39l), que abre por cima dela, segue como sempre foi.
  const searchOnScreen = searchOpen != null && themeOpenId == null
  useEffect(() => {
    onPastRootChange?.(expandedBookKey != null || searchOnScreen)
    return () => onPastRootChange?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedBookKey, searchOnScreen])

  // O botão "Ir para a leitura de hoje" (Rotina) chama onContinueSession
  // mesmo com a tela já montada (usuário já está na aba Bíblia) — os
  // estados acima só rodam no useState inicial (na primeira montagem),
  // então esse efeito cobre a navegação pra quem já estava aqui.
  useEffect(() => {
    if (entryMode === 'reading') {
      setExpandedBlockId(initialBlockId)
      setInitialSessionId(resumeSessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryMode, initialBlockId, resumeSessionId])

  // Expande um livro inline na lista — usado tanto por um toque direto na
  // própria linha (openBook abaixo) quanto por um pulo vindo de fora dela
  // (jumpToBook abaixo). Guarda o bloco real (não um id sintético) pra
  // manter compatível o "onde parei" (gravado por ReadingBlockView.jsx).
  function expandBook(block, bookName, sessionIdToFeature, textOpen, focusVerse) {
    setExpandedBookKey(`${block.id}:${bookName}`)
    setExpandedInitialSessionId(sessionIdToFeature)
    setExpandedInitialTextOpen(textOpen)
    setExpandedInitialFocusVerse(focusVerse ?? null)
  }

  // Abre um capítulo/versículo específico vindo de FORA da navegação livre
  // normal (um resultado da busca ou um trecho do tema, 39l) — acha o bloco a
  // partir do NOME do livro (`blocks` já é a lista fixa de sempre) e cai
  // direto na leitura, no capítulo certo, com o versículo em foco.
  // `extra.noteId` (resultado "Nas suas notas" da busca): a leitura abre
  // com a nota daquela marcação aberta.
  function openChapterFromSearch(book, chapter, verse, extra) {
    const block = blocks.find(b => b.books.includes(book))
    if (!block) return
    const sessions = browseSessionsByBlock[block.id] ?? []
    const target = sessions.find(sn => sn.book === book && sn.chStart <= chapter && chapter <= sn.chEnd)
    setSearchOpen(null)
    setThemeOpenId(null)
    expandBook(block, book, target?.id ?? null, true, verse != null ? { chapter, verse, openNoteId: extra?.noteId ?? null } : null)
  }

  // Pulo pra um livro vindo de FORA da lista de livros visível agora
  // ("Continuar leitura", card de "lido recentemente") — limpa a busca
  // (a tela do livro, 18a, não depende da lista continuar visível).
  function jumpToBook(block, bookName, sessionIdToFeature, textOpen) {
    expandBook(block, bookName, sessionIdToFeature, textOpen)
  }

  // Abre direto um capítulo (bloco + sessão da navegação livre) — diferente
  // de abrir um livro do zero, aqui já cai lendo o capítulo exato, sem
  // passar pela grade de números primeiro. Usado pelos pulos vindos de
  // fora (browseJumpTarget, abaixo).
  function openBrowseChapter(blockId, sessionId) {
    const block = blocks.find(b => b.id === blockId)
    const targetSession = browseSessionsByBlock[blockId]?.find(s => s.id === sessionId)
    if (!block || !targetSession) return
    jumpToBook(block, targetSession.book, sessionId, true)
  }

  // Link "ir pro texto" (ex: das anotações, ver App.jsx/openBiblePassage)
  // — objeto novo a cada pedido, então todo pedido roda este efeito de
  // novo mesmo pra pular pro MESMO capítulo de antes. Avisa App.jsx que
  // já consumiu (onBrowseJumpConsumed limpa o state lá) — sem isso, o
  // pedido ficava "pendente" pra sempre e essa tela pulava pro mesmo
  // capítulo de novo em TODA montagem futura (qualquer visita à aba
  // Bíblia depois de usar o link uma vez, não só via botão Voltar).
  //
  // Não carrega mais nada de anotação de sermão (2026-09-10) — "Anotar um
  // sermão" agora navega direto pra uma aba própria (sermonNote, ver
  // App.jsx), sem passar por browseJumpTarget nenhum.
  useEffect(() => {
    if (browseJumpTarget) {
      if (browseJumpTarget.blockId != null) openBrowseChapter(browseJumpTarget.blockId, browseJumpTarget.sessionId)
      // Livro inteiro (grade de capítulos), não um capítulo — roda da
      // Bíblia/estante (gamificação, App.openBibleBook).
      else if (browseJumpTarget.bookName) {
        const block = blocks.find(b => b.books.includes(browseJumpTarget.bookName))
        if (block) openBook(block, browseJumpTarget.bookName)
      }
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
    setExpandedBlockId(null)
    setInitialSessionId(null)
  }

  // Volta da página do livro (18a, BookChapterScreen) pro mapa/grade —
  // mesma guarda de testamento que closeBlock acima.
  function closeBook() {
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

  // A escrita — pedido dela (2026-09-10), agora é o conteúdo PRINCIPAL da
  // página de anotação (sermonNoteMode), não mais uma folha flutuante em
  // tela cheia. Uma vez fora dos campos (sermonSourceOpen=false), é isto
  // que fica na tela; o chevron do cabeçalho volta pros campos pra
  // revisar/editar "de onde veio" (mesmo destino que o chevron de 34d
  // tinha, só que agora não existe mais 34d separado).
  function renderSermonWriting() {
    if (sermonVerseSearchOpen) return renderVerseSearch()
    const body = sermonDraft.body ?? []
    let topicCount = 0
    return (
      <>
        <div style={styles.sermonHeader}>
          <button type="button" style={styles.sermonChevronBtn} onClick={() => setSermonSourceOpen(true)} aria-label={t('sermonNote.fromLabel', undefined, lang)}>
            <AppIcon name="ChevronDown" size={16} color="var(--bento-ink)" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              style={styles.sermonHeaderTitleInput}
              value={sermonDraft.title}
              placeholder={t('sermonNote.newTitle', undefined, lang)}
              onChange={e => patchSermonDraft({ title: e.target.value })}
              aria-label={t('sermonNote.titlePlaceholder', undefined, lang)}
            />
            <p style={styles.sermonHeaderSub}>{[sermonTypeLabel(sermonDraft.noteType, lang), sermonDraft.preacher, t('sermonNote.savedNow', undefined, lang)].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" style={{ ...styles.sermonSaveBtn, ...(sermonSaving ? styles.sermonSaveBtnDisabled : {}) }} disabled={sermonSaving} onClick={finishSermonWriting}>
            {t('sermonNote.finish', undefined, lang)}
          </button>
        </div>
        {sermonSaveError && <p style={styles.sermonSaveErrorText}>{t('sermonNote.saveError', undefined, lang)}</p>}

        <div style={styles.sermonPassageStrip}>
          {sermonDraft.passages.length > 0 && (
            <button type="button" style={styles.sermonPassageCountChip} onClick={() => setSermonPassagesListOpen(v => !v)}>
              {t(sermonDraft.passages.length === 1 ? 'sermonNote.passageCountOne' : 'sermonNote.passageCountMany', { n: sermonDraft.passages.length }, lang)}
            </button>
          )}
          {(session.myGroups?.length ?? 0) > 0 && (
            <button type="button" style={styles.sermonStripIconBtn} onClick={() => setSermonGroupPickerOpen(true)} aria-label={t('room.groupBtn', undefined, lang)}>
              <AppIcon name="Users" size={14} color="var(--bento-ink)" strokeWidth={2.3} />
            </button>
          )}
          <button type="button" style={styles.sermonStripIconBtn} onClick={shareSermonDraft} aria-label={t('sermonNote.share', undefined, lang)}>
            <AppIcon name="Share2" size={14} color="var(--bento-ink)" strokeWidth={2.2} />
          </button>
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

        {/* Pedido dela (2026-09-12): "Versículo"/"Tópico" saíram da barra
            de baixo (perto do teclado) pra cá, ACIMA do card de escrita —
            ficam visíveis o tempo todo enquanto ela anota, sem depender
            de rolar até o fim ou de o teclado não estar cobrindo a barra
            de baixo. Ditar/esconder teclado continuam lá embaixo (fazem
            sentido perto do teclado, esses dois não). */}
        <div style={styles.sermonInsertToolbar}>
          <button type="button" style={styles.sermonToolbarBtn} onClick={openVerseSearch}>
            <AppIcon name="Plus" size={13} strokeWidth={2.4} color="var(--bento-sand-icon)" />
            {t('sermonNote.verseBtn', undefined, lang)}
          </button>
          <button type="button" style={styles.sermonToolbarBtn} onClick={insertTopicSegment}>
            <AppIcon name="List" size={13} strokeWidth={2.4} color="var(--bento-t3)" />
            {t('sermonNote.topicBtn', undefined, lang)}
          </button>
        </div>

        <div style={styles.sermonWritingSurface}>
          {body.map((seg, i) => {
            if (seg.type === 'quote') {
              return (
                <div key={seg.id} data-sermon-seg={seg.id} style={styles.sermonQuoteBlock}>
                  <button type="button" style={styles.sermonQuoteRemove} onClick={() => removeSermonSegment(seg)} aria-label={t('sermonNote.removeVerse', { ref: seg.ref }, lang)}>×</button>
                  {/* Link pro topo (pedido dela, 2026-09-13): a referência
                      vira um link de verdade — clicar abre a passagem na
                      Bíblia (openVerseInBible). O texto citado, logo
                      abaixo, também é clicável e leva pro mesmo lugar. */}
                  <button type="button" style={styles.sermonQuoteRef} onClick={() => openVerseInBible(seg)}>
                    <AppIcon name="BookOpen" size={11} color="var(--bento-sand-icon)" />
                    {seg.ref} · {getSelectedVersionId(lang).toUpperCase()}
                  </button>
                  <p style={styles.sermonQuoteText} onClick={() => openVerseInBible(seg)}>&ldquo;{seg.text}&rdquo;</p>
                </div>
              )
            }
            if (seg.type === 'topic') {
              topicCount++
              return (
                <div key={seg.id} data-sermon-seg={seg.id} style={styles.sermonTopicRow}>
                  <span style={styles.sermonTopicNum}>{topicCount}</span>
                  {/* Pedido dela (2026-09-12): tópico em negrito, pra se
                      destacar do texto corrido ao redor. */}
                  <textarea
                    style={styles.sermonTopicTextarea}
                    value={seg.text}
                    placeholder={t('sermonNote.topicPlaceholder', undefined, lang)}
                    onChange={e => { updateSermonSegmentText(seg.id, e.target.value); autoGrowTextarea(e) }}
                    onFocus={e => handleSermonSegmentFocus(seg.id, e)}
                    onInput={autoGrowTextarea}
                    onKeyDown={e => handleTopicEnterKey(seg.id, e)}
                    rows={1}
                  />
                </div>
              )
            }
            return (
              <textarea
                key={seg.id}
                data-sermon-seg={seg.id}
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
          {sermonDictationSupported && (
            <button
              type="button" style={{ ...styles.sermonToolbarIconBtn, ...(sermonDictating ? styles.sermonToolbarIconBtnOn : {}) }}
              onClick={() => (sermonDictating ? stopDictation() : startDictation())}
              aria-label={t('sermonNote.dictateBtn', undefined, lang)}
            >
              <AppIcon name="Mic" size={15} strokeWidth={2.2} color={sermonDictating ? '#fff' : 'var(--bento-t3)'} />
            </button>
          )}
          {/* Antes minimizava a folha (34d); numa página normal não tem
              mais "minimizar", só esconde o teclado (2026-09-10). */}
          <button type="button" style={styles.sermonKeyboardDownBtn} onClick={() => activeTextareaRef.current?.blur()} aria-label={t('sermonNote.dismissKeyboard', undefined, lang)}>
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
          {/* "Pronto" vira "Adicionar" assim que pelo menos 1 versículo
              está marcado no passo de versículo (pedido dela, 2026-09-13,
              "poder escolher 1 ou mais versículos") — nos outros passos,
              ou sem nada marcado ainda, continua só fechando a busca. */}
          {sermonVerseSearchStep === 'verse' && sermonVerseSearchSelected.length > 0 ? (
            <button type="button" style={styles.sermonReadyBtn} onClick={confirmVerseSearchSelection}>
              {t(sermonVerseSearchSelected.length === 1 ? 'sermonNote.addVerseBtnOne' : 'sermonNote.addVerseBtnMany', { n: sermonVerseSearchSelected.length }, lang)}
            </button>
          ) : (
            <button type="button" style={styles.sermonReadyBtn} onClick={() => setSermonVerseSearchOpen(false)}>{t('sermonNote.ready', undefined, lang)}</button>
          )}
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
          {/* Grade de números (pedido dela, 2026-09-13: "coloca uma
              rolagem com os números") — mesmo formato do passo de
              capítulo acima, em vez da lista com prévia de texto de
              antes: mais rápido pra quem já sabe o número do versículo. */}
          {sermonVerseSearchStep === 'verse' && sermonVerseSearchChapter && (
            <div style={styles.sermonVerseSearchChapterGrid}>
              {Object.keys(sermonVerseSearchChapter.verses ?? {}).sort((a, b) => Number(a) - Number(b)).map(v => {
                const selected = sermonVerseSearchSelected.includes(Number(v))
                return (
                  <button
                    key={v} type="button"
                    style={{ ...styles.sermonVerseSearchChapterBtn, ...(selected ? styles.sermonVerseSearchChapterBtnOn : null) }}
                    onClick={() => toggleVerseSearchSelection(Number(v))}
                    aria-pressed={selected}
                  >
                    {v}
                  </button>
                )
              })}
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
              {sermonDraft.passages.length === 0 ? (
                // Bug real (varredura geral, 2026-09-19): "Levar ao grupo"
                // publica no MURAL DO CAPÍTULO do primeiro versículo citado
                // (finalizeSermonNote acima) — sem nenhum versículo citado
                // (válido: a anotação pode ser só reflexão em palavras
                // próprias), não existe capítulo nenhum pra publicar em.
                // O toggle ficava visível e ligável, mas finalizeSermonNote
                // simplesmente não fazia nada — sem aviso nenhum. Agora
                // mostra por que não dá, em vez do toggle.
                <p style={styles.sermonGroupHint}>{t('sermonNote.takeToGroupNeedsPassage', undefined, lang)}</p>
              ) : (
                <button
                  type="button" style={styles.sermonGroupPickLink}
                  onClick={() => (groups.length > 1 ? setSermonGroupPickerOpen(true) : null)}
                >
                  {selectedGroup
                    ? `${selectedGroup.name} · ${t(sermonGroupMemberCounts[selectedGroup.groupId] === 1 ? 'reading.groupMemberOne' : 'reading.groupMemberMany', { n: sermonGroupMemberCounts[selectedGroup.groupId] ?? 0 }, lang)}`
                    : t('sermonNote.chooseGroupCta', undefined, lang)}
                </button>
              )}
            </div>
            {sermonDraft.passages.length > 0 && (
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
            )}
          </div>
        )}

        <div style={styles.sermonSummaryFooter}>
          {/* Sem o padding horizontal padrão do estilo aqui — este rodapé
              já mora dentro de sermonSheetBody (padding 0 20px 12px), e é
              um flex column com gap: 10 (as duas margens somadas
              desalinhariam este texto em relação aos botões abaixo). */}
          {sermonSaveError && <p style={{ ...styles.sermonSaveErrorText, padding: 0, margin: 0 }}>{t('sermonNote.saveError', undefined, lang)}</p>}
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

  // Lápis flutuante (34e) — ajuste dela (2026-09-12): "o lápis deve
  // aparecer somente quando uma anotação estiver em andamento e a pessoa
  // for para a bíblia". Só aparece com um rascunho de verdade em
  // andamento (não finalizado, com conteúdo — um vazio é descartado ao
  // minimizar, ver leaveSermonPage, então nunca chega até aqui). Toque
  // nele navega pra sermonNoteMode pra RETOMAR (onOpenSermonNote →
  // App.jsx/resumeSermonNote) — nunca começa uma anotação nova. Portal
  // pro <body>, mesmo truque de centralização de .bottom-nav (ver
  // estilos, no fim do arquivo).
  function renderSermonFab() {
    if (!sermonDraft) return null
    return createPortal(
      <div style={styles.sermonFabWrap}>
        {sermonTarjaVisible && (
          <button type="button" style={styles.sermonTarja} onClick={() => onOpenSermonNote?.()}>
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
          {sermonDraft.passages.length > 0 && <span style={styles.sermonFabBadge}>{sermonDraft.passages.length}</span>}
        </button>
      </div>,
      document.body
    )
  }

  // Página de anotação (sermonNoteMode) — pedido dela, 2026-09-10: "vamos
  // fazer uma página mesmo de anotação... não abrir por cima da bíblia".
  // Página normal (fluxo de documento, sem portal/véu/arrasto), chamada
  // como a tela INTEIRA desta montagem (ver o `if (sermonNoteMode)` bem
  // no topo do return principal, antes de qualquer navegação de Bíblia).
  //
  // Barra fina de voltar SEMPRE visível no topo, fora dos cabeçalhos de
  // cada etapa (campos/escrita/resumo/grupo) — "botão de voltar normal"
  // de uma página de verdade. Os chevrons de cada etapa continuam
  // navegando ENTRE etapas (escrita ↔ campos ↔ resumo/grupo); a barra
  // MINIMIZA (leaveSermonPage) — o rascunho continua em andamento, e o
  // lápis flutuante aparece na Bíblia pra retomar (ajuste dela,
  // 2026-09-12).
  function renderSermonPage() {
    return (
      <div style={styles.sermonPage}>
        <div style={styles.sermonPageTopBar}>
          <button type="button" style={styles.sermonPageBackBtn} onClick={leaveSermonPage} aria-label="back">
            <AppIcon name="ArrowLeft" size={18} color="var(--bento-ink)" strokeWidth={2.2} />
          </button>
        </div>
        {renderSermonPageContent()}
      </div>
    )
  }

  function renderSermonPageContent() {
    if (!sermonDraft) return <div style={{ padding: 20 }} />
    return (
      <>
        {sermonSummaryOpen ? (
          renderSermonSummary()
        ) : sermonSourceOpen ? (
          <>
            <div style={styles.sermonSourceHeader}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.sermonSourceTitle}>{t('sermonNote.fromLabel', undefined, lang)}</p>
                <p style={styles.sermonSourceDate}>
                  {formatWeekdayDate(sermonDraft.date, lang).replace(/^./, c => c.toUpperCase())} · {new Date(sermonDraft.createdAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button type="button" style={styles.sermonReadyBtn} onClick={readyFromSermonFields}>{t('sermonNote.ready', undefined, lang)}</button>
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
                      escrever o tipo com as próprias palavras; o que ela
                      digitou fica marcado (selecionado) mesmo depois de
                      fechar o campo. */}
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
                    {/* Reaproveita tipos que ela já escreveu antes (Regra
                        4 §5: "vira uma opção reaproveitável nas próximas
                        anotações") — sem inventar um 7º botão fixo no
                        grid, só sugestões dentro do próprio campo
                        "Outros". */}
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
                <AppIcon name="ChevronLeft" size={16} color="var(--bento-ink)" />
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
          renderSermonWriting()
        )}
      </>
    )
  }

  if (sermonNoteMode) {
    return renderSermonPage()
  }

  if (expandedBlockId != null) {
    // A leitura pela sessão do plano. key inclui initialSessionId, não só
    // expandedBlockId — pular de uma sessão pra outra do MESMO bloco
    // precisa remontar do zero, senão o estado interno (a sessão em
    // destaque) fica preso na anterior — ver comentário em
    // ReadingBlockView.jsx.
    return (
      <>
        <ReadingBlockView
          key={`${expandedBlockId}-${initialSessionId}`}
          session={session}
          authUser={authUser}
          onNavigate={onNavigate}
          blockId={expandedBlockId}
          blocks={blocks}
          sessionsByBlock={sessionsByBlock}
          mode="session"
          completedSet={completedSet}
          onToggleSession={onToggleSession}
          onToggleChapter={onToggleChapter}
          initialSessionId={initialSessionId}
          // Força o recap "onde a história está" no caminho de sessão
          // guiada (vindo da Bênção) — ver comentário em App.jsx.
          forceChapterContext={forceChapterContext}
          onBack={closeBlock}
          onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'journey', blockId: expandedBlockId, sessionId: heroSession.id, book: heroSession.book, bookEn: heroSession.bookEn, chStart: heroSession.chStart, chEnd: heroSession.chEnd, words: heroSession.words, type: heroSession.type })}
          onOpenGroupRoom={onOpenGroupRoom}
        />
        {renderSermonFab()}
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
      // DIFERENTE do MESMO livro precisa remontar do zero, senão a
      // leitura continuaria presa no capítulo antigo (mesmo raciocínio do
      // ReadingBlockView acima).
      <>
        <BookChapterScreen
          key={`${expandedBookKey}:${expandedInitialSessionId}`}
          session={session}
          authUser={authUser}
          block={block}
          bookName={bookName}
          displayName={displayName}
          browseSessionsByBlock={browseSessionsByBlock}
          completedSet={completedSet}
          onToggleSession={onToggleSession}
          onToggleChapter={onToggleChapter}
          onMarkChaptersManually={onMarkChaptersManually}
          onOpenSelo={onOpenSelo}
          onCelebrateNow={onCelebrateNow}
          onGoToReflectionFrom={onGoToReflectionFrom}
          onNavigate={onNavigate}
          onBack={closeBook}
          initialSessionId={expandedInitialSessionId}
          initialTextOpen={expandedInitialTextOpen}
          initialFocusVerse={expandedInitialFocusVerse}
        />
        {renderSermonFab()}
      </>
    )
  }

  // O tema (39l) empilha por cima da busca (não substitui) — "‹" do tema
  // volta pra busca com o MESMO texto; "‹" da busca volta pra raiz.
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
            onNavigate={onNavigate}
          />
          {renderSermonFab()}
        </>
      )
    }
  }
  // Leitura livre: a posição PRÓPRIA da aba (freeReadingPositionStore.js),
  // não a do plano — só vale se o capítulo ainda existe na navegação livre.
  // Usada pela raiz (B1) e pela busca ("Onde você estava", B5).
  const freeReadPos = getFreeReadingPosition()
  const freeReadBlock = freeReadPos ? blocks.find(b => b.books.includes(freeReadPos.book)) : null
  const freeReadSession = freeReadBlock
    ? (browseSessionsByBlock[freeReadBlock.id] ?? []).find(sn => sn.book === freeReadPos.book && sn.chStart <= freeReadPos.chapter && sn.chEnd >= freeReadPos.chapter)
    : null
  // Abre o livro (B2) pelo nome — da pastilha da raiz ou de um resultado
  // da busca.
  function openBookByName(nome) {
    const block = blocks.find(b => b.books.includes(nome))
    if (block) openBook(block, nome)
  }
  // "Continuar a leitura livre": volta ao versículo onde a pessoa parou
  // (sem realce) — o mesmo que a linha mostra em ", versículo n".
  function openFreeReading() {
    setSearchOpen(null)
    expandBook(freeReadBlock, freeReadPos.book, freeReadSession.id, true, freeReadPos.verse > 1 ? { chapter: freeReadPos.chapter, verse: freeReadPos.verse, scrollOnly: true } : null)
  }

  if (searchOpen != null) {
    return (
      <>
        <BuscaScreen
          session={session}
          authUser={authUser}
          initialQuery={searchOpen}
          completedSet={completedSet}
          sessionTitle={sessionTitle}
          free={freeReadSession ? freeReadPos : null}
          onBack={() => setSearchOpen(null)}
          onOpenChapter={openChapterFromSearch}
          onOpenBook={nome => { setSearchOpen(null); openBookByName(nome) }}
          // O tema (39l) abre por cima da busca; guardar o que estava
          // digitado faz o "voltar" de lá cair na mesma busca.
          onOpenTheme={(id, typed) => { setSearchOpen(typed ?? ''); setThemeOpenId(id) }}
          onReadSession={onContinueSession}
          onOpenFree={openFreeReading}
        />
        {renderSermonFab()}
      </>
    )
  }

  // ── A raiz (B1) ──

  return (
    <>
      <BibliaRaiz
        lang={lang} completedSet={completedSet} versionId={versionId} onChangeVersion={setVersionId}
        sessionTitle={sessionTitle} free={freeReadSession ? freeReadPos : null} currentBook={session.currentBlock?.book}
        onOpenSearch={() => setSearchOpen('')}
        onOpenSuaBiblia={onOpenSuaBiblia}
        onRead={onContinueSession}
        onOpenFree={openFreeReading}
        onOpenBook={openBookByName}
      />
      {renderSermonFab()}
    </>
  )
}

const styles = {
  // ── Folha de sermão flutuante (34d/34e/34f, handoff-app-completo) ──
  // Mora aqui (não em ReadingBlockView.jsx) — README, 34e: "vive... na
  // 34d — o véu (rgba(26,23,20,.18), Regra 4 da área inteira) cobre o
  // capítulo visível ATÉ o topo da folha (bottom dinâmico = altura da
  // folha, ver renderSermonWidget). pointerEvents:none É o que deixa o
  // Página de anotação (sermonNoteMode, 2026-09-10) — pedido dela: página
  // normal de verdade, não mais folha flutuante sobre a Bíblia (sem
  // position:fixed/véu/raio nos cantos/sombra/alça de arrasto — tudo isso
  // só existia pra "flutuar por cima"; uma página em fluxo normal não
  // precisa de nada disso).
  // Bug real (achado dela, 2026-09-13: "+Versículo"/"Tópico" iam "lá pra
  // cima" ao escrever) — faltava o `height: '100%'` (só tinha
  // `minHeight`, que é um PISO, não um teto). Sem uma altura de verdade
  // aqui, sermonWritingSurface (mais abaixo, flex:1 + overflow-y:auto)
  // nunca virava uma região de rolagem própria — em vez de rolar só o
  // texto, a PÁGINA inteira crescia com o conteúdo e tudo (cabeçalho,
  // "+Versículo"/"Tópico", texto) subia junto. Mesmo padrão já usado em
  // accountUi.jsx/OnboardingFlow.jsx (`screen: { height: '100%',
  // minHeight: '100%', ... }`) e no próprio `screen` (não-sermão) desta
  // tela, mais abaixo — só esta tinha ficado sem.
  sermonPage: { height: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  sermonPageTopBar: { flexShrink: 0, display: 'flex', alignItems: 'center', padding: '20px 20px 4px' },
  sermonPageBackBtn: { width: 36, height: 36, borderRadius: 12, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  sermonSheetBody: { flex: 1, minHeight: 0, padding: '0 20px 12px', display: 'flex', flexDirection: 'column' },

  // 34e — lápis + tarja, flutuando sobre a Bíblia normal (não
  // sermonNoteMode). A posição base já fica no canto inferior direito
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
  // Pedido dela (2026-09-13): título editável direto na página de
  // escrita, sem precisar voltar pros campos (34f) só pra isso — mesmo
  // visual de sermonHeaderTitle, só com os resets de <input>.
  sermonHeaderTitleInput: { width: '100%', border: 'none', outline: 'none', background: 'none', padding: 0, fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 2px' },
  sermonHeaderSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  // "Apertei para finalizar e a anotação não salvou na biblioteca"
  // (achado dela, 2026-09-13) — mesma cor de erro já usada em
  // ProfileScreen.jsx (errorText: var(--bento-accent), sem token de
  // "vermelho" dedicado no app). Padding horizontal de 20px porque, na
  // escrita (renderSermonWriting), este texto é irmão direto de
  // sermonHeader/sermonPassageStrip — cada um traz o próprio respiro
  // lateral, sem wrapper comum que já faça isso (ver sermonSheetBody, só
  // usado no resumo/34h). Lá no resumo o padding extra é inofensivo —
  // sermonSheetBody já tem o mesmo valor (20px).
  sermonSaveErrorText: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-accent)', margin: '6px 0 0', padding: '0 20px' },
  sermonChevronBtn: { flexShrink: 0, width: 34, height: 34, borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  sermonSaveBtn: { flexShrink: 0, height: 34, padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--bento-accent)', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  sermonSaveBtnDisabled: { opacity: 0.4, cursor: 'default' },

  sermonOnScreenTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sermonOnScreenLabel: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-sand-label)' },
  sermonOnScreenDiamond: { width: 9, height: 9, borderRadius: 2, background: 'var(--bento-sand-icon)', transform: 'rotate(45deg)', flexShrink: 0 },
  sermonChipsRow: { display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  sermonChip: { height: 30, padding: '0 12px', borderRadius: 11, border: 'none', background: 'rgba(255,255,255,.6)', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-sand-ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  sermonChipX: { fontSize: 13, fontWeight: 700, color: 'var(--bento-sand-ink-mid)' },

  // 34g — tira das passagens (item 2 do HANDOFF): botão marrom + ficha
  // areia "N passagens" + hora, tudo numa linha só (o essencial do bloco
  // areia de 34d, encolhido).
  sermonPassageStrip: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px 14px', flexShrink: 0 },
  sermonPassageCountChip: { flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 11, border: 'none', background: 'var(--bento-sand)', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-sand-ink)', cursor: 'pointer' },
  // Grupo/Compartilhar (2026-09-10) — moveram do rodapé de 34d (que não
  // existe mais) pra cá, junto da tira de passagens.
  sermonStripIconBtn: { flexShrink: 0, width: 32, height: 32, borderRadius: 11, border: 'none', background: 'var(--bento-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  sermonPassageTime: { marginLeft: 'auto', flexShrink: 0, fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t4)' },

  // "Versículo"/"Tópico" (pedido dela, 2026-09-12: subiram da barra perto
  // do teclado pra cá, ACIMA do card de escrita — ficam visíveis o tempo
  // todo enquanto ela anota, sem depender de rolar até o fim).
  sermonInsertToolbar: { display: 'flex', gap: 8, padding: '0 20px 10px', flexShrink: 0 },

  // 34g — superfície de escrita (item 3): branco raio 26 só em cima,
  // segue até a barra de ferramentas "sem degrau" (raio 0 embaixo).
  sermonWritingSurface: { flex: 1, minHeight: 0, overflowY: 'auto', background: '#fff', borderRadius: '26px 26px 0 0', padding: '20px 20px 12px', display: 'flex', flexDirection: 'column', gap: 14 },
  sermonBodyTextarea: {
    width: '100%', border: 'none', outline: 'none', background: 'none', resize: 'none', overflow: 'hidden',
    fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 500, lineHeight: 1.75, color: 'var(--bento-ink)', padding: 0, caretColor: 'var(--bento-accent)',
  },
  // Tópico em negrito (pedido dela, 2026-09-12) — mesmo resto do estilo
  // de sermonBodyTextarea, só troca o peso da fonte pra se destacar do
  // texto corrido ao redor.
  sermonTopicTextarea: {
    width: '100%', border: 'none', outline: 'none', background: 'none', resize: 'none', overflow: 'hidden',
    fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, lineHeight: 1.75, color: 'var(--bento-ink)', padding: 0, caretColor: 'var(--bento-accent)',
  },
  // 34g — versículo inserido (item 4): fundo próprio (sem token exato no
  // app, hex do HANDOFF direto), filete marrom à esquerda, texto em
  // itálico. sermonQuoteRemove não está desenhado no quadro (nenhum
  // exemplo mostra o gesto de apagar em andamento), mas Regra 4 §7 exige
  // que apagar funcione — × discreto no canto, mesma linguagem das
  // fichas de passagem em todo o resto do pacote.
  sermonQuoteBlock: { position: 'relative', background: '#F7F2EA', borderLeft: '3px solid var(--bento-sand-icon)', borderRadius: '0 14px 14px 0', padding: '14px 36px 14px 16px' },
  sermonQuoteRemove: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(122,74,30,.12)', color: 'var(--bento-sand-icon)', fontSize: 14, fontWeight: 700, lineHeight: 1, cursor: 'pointer' },
  sermonQuoteText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.6, color: 'var(--bento-sand-ink)', margin: 0, cursor: 'pointer' },
  // Vira link de verdade (pedido dela, 2026-09-13): agora fica no TOPO do
  // quadro (antes da citação) e navega pra Bíblia ao tocar — daí border
  // none/background none/padding 0 (reset de <button>) e o sublinhado pra
  // marcar que é clicável, diferente do texto puro de antes.
  sermonQuoteRef: { display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', padding: 0, marginBottom: 6, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-sand-icon)', textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' },
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
  sermonVerseSearchChapterGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 },
  sermonVerseSearchChapterBtn: { height: 44, borderRadius: 13, border: 'none', background: 'var(--bento-card)', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  // Versículo(s) marcado(s) no passo de versículo (pedido dela,
  // 2026-09-13) — mesmo botão do grid, só troca a cor quando selecionado.
  sermonVerseSearchChapterBtnOn: { background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontWeight: 800 },

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
  sermonGroupHint: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },

  // 34h — item 6, rodapé: "Guardar na biblioteca" (laranja 52px raio 18)
  // e "Voltar e escrever mais" (branco 46px).
  sermonSummaryFooter: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, paddingBottom: 12 },
  sermonSaveToLibraryBtn: { height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: 'var(--font-bento)', fontSize: 15.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  sermonBackToWritingBtn: { height: 46, borderRadius: 18, border: 'none', background: '#fff', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

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
