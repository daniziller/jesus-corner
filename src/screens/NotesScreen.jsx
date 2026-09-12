// NotesScreen.jsx — "Biblioteca" (redesign 1e/etapa 6, reskin Bento — tela 4c)
// Endereço único para tudo que a pessoa produziu: notas de leitura,
// Reflexão diária, marcações de trecho, anotações de sermão e estudos —
// hoje cada uma só era visível "no contexto" onde foi escrita/criada.
// Entrou na barra de navegação no lugar de Progresso (ver BottomNav.jsx/
// Sidebar.jsx) — antes já tinha aba própria como "Notas" (sem Estudos).
// Duas formas de achar uma anotação: busca por palavra (instantânea,
// client-side, casa substring no texto) e busca por tema com IA
// (api/search-notes.js) — pra quando a pessoa lembra do ASSUNTO mas não da
// palavra exata que usou.
//
// Reskin Bento: o mockup 4c só mostra 4 chips (Todas/Notas/Marcações/
// Estudos) e um card por anotação sem ícone, sem painel de filtro por
// livro/cor/preletor/data. Toda essa funcionalidade real ficou — o chip
// "Sermões" continua (é um tipo de conteúdo de verdade, não dá pra sumir
// com ele), e o painel de filtros vira uma extensão além do mockup, com o
// mesmo tratamento visual das demais peças desta tela.
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getNotes, saveNote, noteTextOf, noteUpdatedAtOf, parseNoteKey } from '../notes/notesStore'
import { searchNotesByTheme } from '../notes/notesSearchStore'
import { getSermonNotes, deleteSermonNote } from '../notes/sermonNotesStore'
import { getNoteFolders, getArchivedNotes, createNoteFolder, deleteNoteFolder, archiveNote, unarchiveNote } from '../notes/noteOrganizationStore'
import { getPinnedApplicationPhrase, setPinnedApplicationPhrase } from '../reflection/applicationPhraseStore'
import { getHighlights, updateHighlightText, hideHighlight } from '../highlights/highlightsStore'
import { HIGHLIGHT_COLORS } from '../data/highlightColors'
import { formatVerseRanges } from '../utils/verseRanges'
import { dateKey } from '../utils/dateKey'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { STUDIES } from '../data/studies'
import { getCompletedStudySessions, isStudySessionDone, clearStudyProgress } from '../studies/studiesProgressStore'
import { getAiStudies, deleteAiStudy } from '../studies/aiStudiesStore'
import { getInductiveStudies, deleteInductiveStudy } from '../studies/inductiveStudiesStore'
import { getThemePlans } from '../themePlans/themePlansStore'
import { deriveThemeTexts } from '../themePlans/themeTexts'
import { getMyPublishedStudies, getMyStudyInvites, withdrawStudy, acceptStudyInvite } from '../studies/publicStudiesStore'
import { getAllPassageQuestions, removePassageQuestion } from '../aiChat/passageQuestionStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { monthLabel } from './MonthRecapScreen'

// Redesign 1e — 5 chips fixos: Todas · Notas · Marcações · Estudos ·
// Sermões. "Notas" agora reúne nota de capítulo, reflexão de fechamento de
// livro E a Reflexão diária/frase de aplicação — antes eram duas abas
// separadas ('reading'/'reflection'); a Biblioteca trata as duas como a
// mesma coisa (texto que a pessoa escreveu refletindo sobre a Palavra),
// diferente de uma marcação (trecho específico) ou um estudo (estrutura
// própria, ver studyEntries). 'sermon' é a anotação de sermão (ver
// src/notes/sermonNotesStore.js) — registro à parte, sem ligação com uma
// passagem/dia do plano de leitura. 'study' é sintético, montado a partir
// de STUDIES + IA + indutivo (ver studyEntries no useEffect abaixo), não
// tem uma "note" de verdade por trás.
// O quadro 4c mostra só quatro chips (Todas · Notas · Marcações ·
// Estudos), mas o de Sermões voltou a pedido da autora — sem ele (e sem
// o painel de filtros abaixo) não tinha mais como isolar só as
// anotações de sermão ou filtrar por livro/cor/preletor/data.
const FILTERS = [
  { key: 'all', types: null, labelKey: 'notes.filterAll' },
  { key: 'notes', types: ['reading', 'book-reflection', 'daily-reflection', 'application-phrase', 'recap'], labelKey: 'notes.filterNotes' },
  { key: 'highlight', types: ['highlight'], labelKey: 'notes.filterHighlights' },
  { key: 'study', types: ['study'], labelKey: 'notes.filterStudy' },
  { key: 'sermon', types: ['sermon'], labelKey: 'notes.filterSermon' },
  // Adição do README §13 — perguntas guardadas da IA (10a/10b, ligado em
  // Ajustes/10f: "Guardar minhas perguntas"). Sem quadro desenhado.
  { key: 'question', types: ['question'], labelKey: 'notes.filterQuestions' },
]

// Cor própria por tipo — mesma cor usada no rótulo de cada card, pra dar
// pra reconhecer o tipo de longe. Reskin Bento: o quadradinho de ícone
// saiu (o mockup 4c não tem — só o texto colorido já basta) e Sermão
// perdeu a cor de marca própria (#B5005D), virando neutro como no mockup.
// 'highlight' aqui é só o fallback; uma marcação específica usa a cor de
// verdade que a pessoa escolheu (ver HIGHLIGHT_COLORS/hc mais abaixo, que
// sobrescreve isso).
const TYPE_COLOR = {
  all:       'var(--bento-ink)',
  notes:     'var(--bento-accent)',
  highlight: 'var(--bento-sand-icon)',
  study:     'var(--bento-t3)',
  sermon:    'var(--bento-t3)',
  question:  'var(--bento-t3)',
}

// A que grupo de cor/ícone uma anotação pertence — mesmas 4 categorias da
// faixa de filtros acima ('notes' cobre nota de capítulo, reflexão de
// fechamento de livro, Reflexão diária e frase de aplicação).
function typeGroupFor(note) {
  if (note.type === 'highlight') return 'highlight'
  if (note.type === 'sermon') return 'sermon'
  if (note.type === 'study') return 'study'
  if (note.type === 'question') return 'question'
  return 'notes'
}

// Filtro por quando a anotação foi adicionada (updatedAt — só existe
// createdAt separado pra marcações, ver highlightEntries abaixo, então
// usa sempre updatedAt como "data" pra tratar tudo do mesmo jeito).
// 'custom' revela dois campos de data (de/até, ver dateFilterRangeFor).
const DATE_FILTERS = [
  { key: 'all', labelKey: 'notes.dateFilterAll' },
  { key: 'today', labelKey: 'notes.dateFilterToday' },
  { key: 'week', labelKey: 'notes.dateFilterWeek' },
  { key: 'month', labelKey: 'notes.dateFilterMonth' },
  { key: 'custom', labelKey: 'notes.dateFilterCustom' },
]

function dateFilterRangeFor(key, customFrom, customTo) {
  if (key === 'all') return null
  const today = new Date()
  if (key === 'today') { const k = dateKey(today); return { from: k, to: k } }
  if (key === 'week') {
    const dow = today.getDay()
    const diff = (dow === 0 ? -6 : 1) - dow
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff)
    return { from: dateKey(monday), to: dateKey(today) }
  }
  if (key === 'month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: dateKey(first), to: dateKey(today) }
  }
  return { from: customFrom || null, to: customTo || null }
}

export default function NotesScreen({ session, authUser, blocks, sessionsByBlock, onOpenBiblePassage, onOpenStudy, onOpenThemePlan, onUseBankStudy, onOpenSermonNote, onCreateSermonNote }) {
  const { lang } = session
  const [state, setState] = useState({ status: 'loading', notes: [] })
  // Painel de filtros (origem/livro/cor/data) minimizado por padrão — só
  // abre se a pessoa tocar em "Filtros". Os 4 filtros combinam entre si
  // (ver filteredNotes abaixo) — dá pra ver, por exemplo, só marcações
  // amarelas de Gênesis feitas essa semana, tudo ao mesmo tempo.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  // Filtro por livro — só existe em notas de leitura/marcação (reflexão
  // geral e frase de aplicação não têm livro); null = todos os livros.
  const [bookFilter, setBookFilter] = useState(null)
  // Filtro por cor — só faz sentido dentro da aba "Marcações" (ver
  // FILTERS acima); null = todas as cores.
  const [colorFilter, setColorFilter] = useState(null)
  // Filtro por preletor — só faz sentido dentro da aba "Sermão"; null =
  // todos os preletores.
  const [preacherFilter, setPreacherFilter] = useState(null)
  // Filtro por data de quando a anotação foi adicionada — independente dos
  // outros três, combina com eles (ver DATE_FILTERS acima).
  const [dateFilterKey, setDateFilterKey] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  // Busca por palavra — casa substring no texto, ao vivo, sem custo. Busca
  // por tema (IA) é uma AÇÃO à parte (botão), não roda a cada tecla —
  // manda o texto atual da caixa como o "tema" pra api/search-notes.js e
  // troca a lista pras chaves que voltarem. aiMatchKeys null = navegação
  // normal (filtro por origem + busca por palavra); array = modo IA ativo.
  const [searchQuery, setSearchQuery] = useState('')
  const [aiMatchKeys, setAiMatchKeys] = useState(null)
  const [aiSearching, setAiSearching] = useState(false)
  const [aiError, setAiError] = useState('')
  // Nota sendo editada agora (key) + o texto em rascunho — só uma por vez.
  const [editingKey, setEditingKey] = useState(null)
  const [editText, setEditText] = useState('')
  // Key da nota com uma ação (salvar edição/deletar) em andamento — trava
  // só os botões DAQUELE card, não a tela inteira.
  const [busyKey, setBusyKey] = useState(null)

  // Pastas + arquivo (pedido dela, 2026-09-12) — ver src/notes/
  // noteOrganizationStore.js. 'library' é a Biblioteca de sempre (some
  // tudo que está em archivedNotes); 'archive' é a tela à parte que só
  // mostra o que foi arquivado, filtrável por pasta. folderPickerFor: key
  // da nota sendo arquivada agora (abre a folha de escolher pasta) — o
  // sentinela '__standalone__' abre a MESMA folha só pra criar uma pasta
  // vazia (sem arquivar nada), usado pelo "+ Nova pasta" da tela de Arquivo.
  const [folders, setFolders] = useState([])
  const [archivedNotes, setArchivedNotes] = useState([])
  const [viewMode, setViewMode] = useState('library')
  const [archiveFolderFilter, setArchiveFolderFilter] = useState('all')
  const [folderPickerFor, setFolderPickerFor] = useState(null)
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderBusy, setNewFolderBusy] = useState(false)

  // Set das keys arquivadas + mapa key->entrada (folderId/archivedAt) —
  // ver src/notes/noteOrganizationStore.js. A Biblioteca (libraryNotes)
  // esconde tudo que está aqui; a tela de Arquivo (archivedEntries, mais
  // abaixo) mostra só isso.
  const archivedKeySet = useMemo(() => new Set(archivedNotes.map(a => a.noteKey)), [archivedNotes])
  const archivedMetaByKey = useMemo(() => {
    const map = {}
    for (const a of archivedNotes) map[a.noteKey] = a
    return map
  }, [archivedNotes])
  const folderById = useMemo(() => {
    const map = {}
    for (const f of folders) map[f.id] = f
    return map
  }, [folders])
  // Lista "de verdade" que a Biblioteca opera em cima — tudo que NÃO está
  // arquivado. Estudo/pergunta nunca entram em archivedKeySet (não têm
  // botão de arquivar, ver render mais abaixo), então passam direto.
  const libraryNotes = useMemo(
    () => state.notes.filter(n => !archivedKeySet.has(n.key)),
    [state.notes, archivedKeySet]
  )

  // Nome do livro (chave canônica, sempre em pt) -> nome em inglês, só pra
  // exibir certo com o app em EN — mesma fonte que o resto do app usa pra
  // nomes de livro (blocks.books/blocks.booksEn, arrays paralelos).
  const bookNameEn = useMemo(() => {
    const map = {}
    for (const b of blocks) b.books.forEach((name, i) => { map[name] = b.booksEn[i] })
    return map
  }, [blocks])

  // Só livros que têm pelo menos uma nota/marcação — evita um seletor com
  // os 66 livros da Bíblia quando a pessoa só anotou em 3. Ordem canônica
  // (Gênesis primeiro), não alfabética — vem de `blocks`, a mesma fonte de
  // ordem que o resto do app usa.
  const availableBooks = useMemo(() => {
    const present = new Set(libraryNotes.filter(n => n.book).map(n => n.book))
    const ordered = []
    for (const block of blocks) {
      for (const b of block.books) {
        if (present.has(b) && !ordered.includes(b)) ordered.push(b)
      }
    }
    return ordered
  }, [libraryNotes, blocks])

  // Preletores já usados em alguma anotação de sermão — mesma ideia de
  // availableBooks (só quem já apareceu, não uma lista fixa), em ordem
  // alfabética (sem ordem canônica pra nomes de pessoa, ao contrário de
  // livro).
  const availablePreachers = useMemo(() => {
    const present = new Set(
      libraryNotes.filter(n => n.type === 'sermon' && n.preacher).map(n => n.preacher)
    )
    return [...present].sort((a, b) => a.localeCompare(b))
  }, [libraryNotes])

  useEffect(() => {
    if (!authUser?.email) { setState({ status: 'ready', notes: [] }); return }
    let cancelled = false
    Promise.all([
      getNotes(authUser.email), getHighlights(authUser.email), getSermonNotes(authUser.email),
      getCompletedStudySessions(authUser.email), getAiStudies(authUser.email), getInductiveStudies(authUser.email),
      getNoteFolders(authUser.email), getArchivedNotes(authUser.email),
    ])
      .then(([map, highlightList, sermonList, completedStudySet, aiStudies, inductiveStudies, folderList, archivedList]) => {
        if (cancelled) return
        setFolders(folderList)
        setArchivedNotes(archivedList)
        const noteEntries = Object.entries(map)
          .map(([key, entry]) => ({
            key,
            text: noteTextOf(entry),
            updatedAt: noteUpdatedAtOf(entry),
            ...parseNoteKey(key),
          }))
          // 'unknown' cobre application:pinned (não é uma entrada por dia,
          // é só o valor fixado no card da Home — ver notesStore.js) e
          // qualquer chave futura que essa tela ainda não saiba rotular.
          .filter(n => n.text && n.type !== 'unknown')
        // Marcações de trecho específico (ver src/highlights/
        // highlightsStore.js) — id próprio (não uma chave do mapa de notas
        // de cima), então id vira a "key" aqui só pra reaproveitar o mesmo
        // formato de card/edição/exclusão da lista. Sem exigir texto — um
        // versículo só marcado com uma cor, sem anotação nenhuma, ainda é
        // uma marcação de verdade e deve aparecer na lista (ver
        // styles.cardTextEmpty abaixo, pro card sem corpo escrito).
        const highlightEntries = highlightList
          .filter(h => !h.hidden)
          .map(h => ({
            key: h.id, id: h.id, text: h.text ?? '', updatedAt: h.createdAt ?? h.updatedAt,
            type: 'highlight', book: h.book, bookEn: h.bookEn, chapter: h.chapter, verses: h.verses, color: h.color,
          }))
        // Anotações de sermão (ver src/notes/sermonNotesStore.js) — id
        // próprio, sem livro/capítulo únicos (pode ter várias passagens ou
        // nenhuma, ver passages).
        const sermonEntries = sermonList.map(s => ({
          key: s.id, id: s.id, text: s.text ?? '', updatedAt: s.updatedAt ?? s.createdAt, createdAt: s.createdAt,
          type: 'sermon', date: s.date, preacher: s.preacher, church: s.church, passages: s.passages ?? [],
        }))
        // Estudos (ver StudiesScreen.jsx) — três origens (catálogo pronto,
        // gerado por IA, indutivo pessoal) resumidas aqui num card só de
        // progresso ("Passo 2 de 6 · retomar"), sem o conteúdo do estudo em
        // si (isso continua só em StudiesScreen; tocar no card leva pra
        // lá). Pedido dela (2026-09-12): "nunca criar nota ao criar um
        // estudo" — antes, IA e indutivo apareciam aqui na hora de CRIAR
        // (0 sessões feitas, rótulo "Começar"), o que ela via como uma
        // "nota" fantasma criada sem ela ter escrito nada ainda. Agora as
        // três origens usam a MESMA regra: só aparece com doneCount > 0
        // (pelo menos uma sessão de verdade feita). `text: ''` (sem corpo
        // de texto) pra não quebrar a busca por palavra, que espera
        // n.text existir.
        const studyEntries = [
          ...STUDIES.map(study => ({ study, sourceKind: 'catalog' })),
          ...aiStudies.map(study => ({ study, sourceKind: 'ai' })),
          ...inductiveStudies.map(study => ({ study, sourceKind: 'inductive' })),
        ]
          .map(({ study, sourceKind }) => {
            const total = study.sessions.length
            const doneCount = study.sessions.filter(s => isStudySessionDone(completedStudySet, study.id, s.id)).length
            return { study, sourceKind, doneCount, total }
          })
          .filter(({ doneCount }) => doneCount > 0)
          .map(({ study, sourceKind, doneCount, total }) => {
            // "Última atividade" pro Estudo — indutivo usa a sessão
            // (capítulo) mexida mais recentemente; catálogo pronto não
            // grava NENHUM carimbo de data por sessão (studies_completed é
            // só um Set de ids, ver studiesProgressStore.js), então fica
            // sem updatedAt e naturalmente afunda pro fim da lista "Todas"
            // (mesmo tratamento que qualquer nota sem data, ver comentário
            // do sort logo abaixo) — não é um bug, é a informação real que
            // existe.
            const lastSessionUpdate = study.sessions.reduce((max, s) => (s.updatedAt && s.updatedAt > (max ?? '') ? s.updatedAt : max), null)
            return {
              key: `study:${study.id}`, id: study.id, type: 'study', text: '',
              updatedAt: sourceKind === 'inductive' ? (lastSessionUpdate ?? study.createdAt) : (study.createdAt ?? null),
              // Cru nos dois idiomas (não já resolvido) — mesmo motivo de
              // `book` nas outras entradas: labelFor()/render leem o
              // idioma ATUAL da sessão, não o de quando a lista carregou.
              titlePt: study.title, titleEn: study.titleEn,
              icon: study.icon ?? 'GraduationCap',
              book: sourceKind === 'inductive' ? study.book : null,
              // sourceKind/sessionIds só servem pra deleteStudyEntry saber
              // COMO apagar (deleteAiStudy/deleteInductiveStudy apagam o
              // estudo inteiro; catálogo não pode ser apagado — só zera o
              // progresso, ver clearStudyProgress em studiesProgressStore.js).
              sourceKind, sessionIds: study.sessions.map(s => s.id),
              doneCount, total,
            }
          })
        // Perguntas guardadas da IA (10a/10b, ligado em Ajustes/10f) —
        // adição do README §13, sem quadro desenhado. Só as de "Perguntar
        // sobre o texto" (10a/10b): a Reflexão com pergunta gerada (10d) já
        // aparece aqui como a nota de Reflexão de verdade (o parágrafo
        // aprovado, não o par pergunta/resposta cru) — listar os dois
        // duplicaria a mesma sessão de leitura na Biblioteca. Guardado em
        // localStorage (não no backend), então não passa pelo Promise.all
        // acima. `id: null` — apagar usa book+chapter+question (ver
        // deleteQuestion), não um id de linha.
        const questionEntries = Object.values(getAllPassageQuestions()).flat().map(q => ({
          key: `question:${q.book}:${q.chapter}:${q.verseStart}-${q.verseEnd}:${q.createdAt}`,
          id: null, text: q.question, updatedAt: q.createdAt,
          type: 'question', book: q.book, bookEn: q.bookEn, chapter: q.chapter,
          verseStart: q.verseStart, verseEnd: q.verseEnd, question: q.question,
          answerReply: q.answer?.outcome === 'answer' ? q.answer.reply : null,
        }))
        // Mais recentes primeiro; anotações salvas antes desta tela existir
        // não têm updatedAt (formato antigo, só texto) — ficam no fim, sem
        // embaralhar as que já têm data de verdade.
        const notes = [...noteEntries, ...highlightEntries, ...sermonEntries, ...studyEntries, ...questionEntries]
          .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
        setState({ status: 'ready', notes })
      })
      .catch(err => {
        console.error('Failed to load notes', err)
        if (!cancelled) setState({ status: 'error', notes: [] })
      })
    return () => { cancelled = true }
  }, [authUser?.email])

  // "Meus estudos" (4c, Bloco 12) — à parte do carregamento de notas acima
  // (dado/formato bem diferente: planos por tema com `passages`, não
  // `sessions`, ver themeTexts.js) e do banco de estudos compartilháveis
  // (migration 0053_public_studies.sql) — os que eu publiquei (com "sair
  // do banco") e os que amigos me convidaram (com "aceitar").
  const [myStudiesData, setMyStudiesData] = useState(null)

  function reloadMyStudies() {
    if (!authUser?.email) { setMyStudiesData(null); return }
    Promise.all([getThemePlans(authUser.email), getMyPublishedStudies(), getMyStudyInvites()])
      .then(([themePlans, published, invites]) => setMyStudiesData({ themePlans, published, invites }))
      .catch(err => console.error('Failed to load my studies', err))
  }

  useEffect(() => { reloadMyStudies() }, [authUser?.email])

  async function handleWithdrawStudy(studyId) {
    if (!window.confirm(t('notes.withdrawStudyConfirm', undefined, lang))) return
    try {
      await withdrawStudy(studyId)
      reloadMyStudies()
    } catch (err) {
      console.error('Failed to withdraw study', err)
    }
  }

  async function handleAcceptStudyInvite(study) {
    try {
      await acceptStudyInvite(study.id)
      reloadMyStudies()
      onUseBankStudy?.(study)
    } catch (err) {
      console.error('Failed to accept study invite', err)
    }
  }

  function bookLabel(book) {
    return lang === 'en' ? (bookNameEn[book] ?? book) : book
  }

  // Nota é salva por passagem exata (livro + capítulos), não por id de
  // sessão — sobrevive a troca de plano (ver notesStore.js). Pra mostrar
  // "Sessão N" mesmo assim, procura no plano ATUAL uma sessão com essa
  // mesma passagem; se o plano mudou depois que a nota foi escrita e
  // nenhuma sessão bate mais exatamente, some sozinho (só livro + capítulo
  // continuam aparecendo, sem número).
  function sessionNumberFor(note) {
    if (note.type !== 'reading') return null
    for (const block of blocks) {
      const match = (sessionsByBlock[block.id] ?? []).find(
        s => s.book === note.book && s.chStart === note.chStart && s.chEnd === note.chEnd
      )
      if (match) return match.id
    }
    return null
  }

  // Tempo relativo no canto do cartão, no formato do quadro 4c ("ontem",
  // "3 dias", "domingo" vira a data curta a partir de uma semana).
  function relativeLabel(iso) {
    const diffD = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (diffD <= 0) return lang === 'en' ? 'today' : 'hoje'
    if (diffD === 1) return lang === 'en' ? 'yesterday' : 'ontem'
    if (diffD < 7) return lang === 'en' ? `${diffD} days` : `${diffD} dias`
    return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'short' })
  }

  function labelFor(note) {
    if (note.type === 'daily-reflection' || note.type === 'application-phrase') {
      const d = new Date(`${note.date}T00:00:00`)
      const dateStr = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
      return note.type === 'application-phrase'
        ? `${dateStr} · ${t('notes.applicationPhraseTag', undefined, lang)}`
        : dateStr
    }
    if (note.type === 'sermon') {
      // Quadro 4c: "Pr. João Silva · Igreja Batista Central" (a data vira o
      // tempo relativo no canto do cartão).
      const who = [note.preacher, note.church].filter(Boolean).join(' · ')
      if (who) return who
      const d = new Date(`${note.date}T00:00:00`)
      return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
    }
    const chLabel = lang === 'en' ? 'Ch.' : 'Cap.'
    if (note.type === 'book-reflection') {
      return `${bookLabel(note.book)} · ${t('notes.bookReflectionTag', undefined, lang)}`
    }
    if (note.type === 'reading') {
      const range = note.chStart === note.chEnd ? `${chLabel} ${note.chStart}` : `${chLabel} ${note.chStart}–${note.chEnd}`
      const sessionN = sessionNumberFor(note)
      const sessionLabel = sessionN != null ? `${t('reading.sessionLabel', { n: sessionN }, lang)} · ` : ''
      return `${sessionLabel}${bookLabel(note.book)} · ${range}`
    }
    if (note.type === 'highlight') {
      return `${bookLabel(note.book)} ${note.chapter}:${formatVerseRanges(note.verses)}`
    }
    if (note.type === 'study') return studyTitleFor(note)
    // Retrospectiva do mês guardada (quadro 17b).
    if (note.type === 'recap') return `${monthLabel(note.month, lang)} · ${t('notes.typeRecap', undefined, lang)}`
    return note.key
  }

  // Título de um card de Estudo no idioma atual — lido de titlePt/titleEn
  // crus (ver studyEntries no useEffect acima), não de um valor já
  // resolvido, pra não ficar preso no idioma de quando a lista carregou.
  function studyTitleFor(note) {
    return lang === 'en' ? note.titleEn : note.titlePt
  }

  // Rótulo curto por tipo (substitui o quadradinho de ícone no reskin
  // Bento — ver TYPE_COLOR acima). 'book-reflection' e 'application-phrase'
  // já tinham rótulo próprio (bookReflectionTag/applicationPhraseTag),
  // usados também em labelFor.
  function typeCapLabel(note) {
    if (note.type === 'reading') return t('notes.typeReading', undefined, lang)
    if (note.type === 'book-reflection') return t('notes.bookReflectionTag', undefined, lang)
    if (note.type === 'daily-reflection') return t('notes.typeDailyReflection', undefined, lang)
    if (note.type === 'application-phrase') return t('notes.applicationPhraseTag', undefined, lang)
    if (note.type === 'highlight') return t('notes.typeHighlight', undefined, lang)
    if (note.type === 'sermon') return t('notes.typeSermon', undefined, lang)
    if (note.type === 'recap') return t('notes.typeRecap', undefined, lang)
    if (note.type === 'question') return t('notes.typeQuestion', undefined, lang)
    return ''
  }

  // labelFor() já embute a data por extenso pra esses 3 tipos — mostrar
  // TAMBÉM o tempo relativo no canto (ver renderização do card) seria
  // repetir a mesma informação duas vezes na mesma linha.
  function labelHasOwnDate(note) {
    return note.type === 'daily-reflection' || note.type === 'application-phrase' || note.type === 'sermon'
  }

  // Rótulo de uma passagem de sermão pra exibir no chip/link (ver
  // passages abaixo) — "Livro Cap" ou "Livro Cap:de-até" quando tem faixa
  // de versículo.
  function passageLabel(p) {
    const range = p.verseStart ? `:${p.verseStart}${p.verseEnd && p.verseEnd !== p.verseStart ? `-${p.verseEnd}` : ''}` : ''
    return `${bookLabel(p.book)} ${p.chapter}${range}`
  }

  function startEdit(note) {
    // Pedido dela (2026-09-12): tocar uma anotação de sermão — já feita ou
    // criando uma nova (ver o FAB, abaixo) — sempre abre a página de
    // anotação de verdade (JourneyScreen.jsx, mesma tela rica de título/
    // preletor/versículos/tópicos/resumo que "Anotar um sermão" usa), não
    // mais o formulário simples que existia embutido aqui.
    if (note.type === 'sermon') { onOpenSermonNote?.(note.id); return }
    setEditingKey(note.key)
    setEditText(note.text)
  }
  function cancelEdit() {
    setEditingKey(null)
    setEditText('')
  }

  // A frase fixada na Home (application:pinned) é uma cópia à parte,
  // comparável só pelo texto (ver mesmo helper em
  // ApplicationPhrasesScreen.jsx) — sem isso, editar/apagar uma frase de
  // aplicação por aqui (ela também aparece no filtro "Reflexão" desta
  // tela) deixava o card da Home com um texto já editado ou apagado.
  async function syncPinnedIfMatches(oldText, newText) {
    const pinned = await getPinnedApplicationPhrase(authUser.email).catch(() => '')
    if (pinned && pinned === oldText) {
      await setPinnedApplicationPhrase(authUser.email, newText).catch(err => {
        console.error('Failed to sync pinned application phrase', err)
      })
    }
  }

  async function saveEdit(note) {
    // Texto vazio deletaria a nota (mesma regra de saveNote) — pra isso
    // tem o botão de deletar, específico e com confirmação; edição vazia
    // simplesmente não salva.
    if (!editText.trim()) return
    setBusyKey(note.key)
    try {
      // Marcação de trecho (highlight) vive numa coluna própria, à parte do
      // mapa de notas de sempre — ver src/highlights/highlightsStore.js.
      if (note.type === 'highlight') await updateHighlightText(authUser.email, note.id, editText)
      else await saveNote(authUser.email, note.key, editText)
      if (note.type === 'application-phrase') await syncPinnedIfMatches(note.text, editText)
      setState(s => ({
        ...s,
        notes: s.notes
          .map(n => n.key === note.key ? { ...n, text: editText, updatedAt: new Date().toISOString() } : n)
          .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
      }))
      setEditingKey(null)
      setEditText('')
    } catch (err) {
      console.error('Failed to update note', err)
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteNote(note) {
    if (!window.confirm(t('notes.deleteConfirm', undefined, lang))) return
    setBusyKey(note.key)
    try {
      if (note.type === 'highlight') await hideHighlight(authUser.email, note.id)
      else if (note.type === 'sermon') await deleteSermonNote(authUser.email, note.id)
      else await saveNote(authUser.email, note.key, '')
      if (note.type === 'application-phrase') await syncPinnedIfMatches(note.text, '')
      setState(s => ({ ...s, notes: s.notes.filter(n => n.key !== note.key) }))
      // Limpa do arquivo também, se estava lá — sem isso sobrava uma
      // entrada órfã em archived_notes apontando pra uma nota que não
      // existe mais (inofensivo, mas some sozinho aqui).
      if (archivedKeySet.has(note.key)) {
        setArchivedNotes(prev => prev.filter(a => a.noteKey !== note.key))
        unarchiveNote(authUser.email, note.key).catch(() => {})
      }
    } catch (err) {
      console.error('Failed to delete note', err)
    } finally {
      setBusyKey(null)
    }
  }

  // Apaga uma pergunta guardada (ver questionEntries acima) — local
  // (localStorage), sem confirmação de servidor, mesmo store que
  // "Reportar resposta" (ReadingBlockView.jsx) usa pra tirar do histórico.
  function deleteQuestion(note) {
    if (!window.confirm(t('notes.deleteConfirm', undefined, lang))) return
    removePassageQuestion({ book: note.book, chapter: note.chapter, verseStart: note.verseStart, verseEnd: note.verseEnd, question: note.question })
    setState(s => ({ ...s, notes: s.notes.filter(n => n.key !== note.key) }))
  }

  // Apaga um card de Estudo na Biblioteca (pedido dela, 2026-09-12) — o
  // que "apagar" significa depende de onde o estudo veio (ver sourceKind
  // em studyEntries): IA/indutivo apagam o estudo inteiro (conteúdo é
  // dela); catálogo pronto não pode ser apagado (é conteúdo fixo do app)
  // — só zera o progresso, que já é suficiente pra sumir daqui (só
  // aparece com doneCount > 0).
  async function deleteStudyEntry(note) {
    const confirmKey = note.sourceKind === 'catalog' ? 'notes.clearStudyProgressConfirm' : 'notes.deleteStudyConfirm'
    if (!window.confirm(t(confirmKey, undefined, lang))) return
    setBusyKey(note.key)
    try {
      if (note.sourceKind === 'ai') await deleteAiStudy(authUser.email, note.id)
      else if (note.sourceKind === 'inductive') await deleteInductiveStudy(authUser.email, note.id)
      else await clearStudyProgress(authUser.email, note.id, note.sessionIds)
      setState(s => ({ ...s, notes: s.notes.filter(n => n.key !== note.key) }))
    } catch (err) {
      console.error('Failed to delete study entry', err)
    } finally {
      setBusyKey(null)
    }
  }

  // Editar a busca por palavra enquanto uma busca por tema (IA) está ativa
  // sai do modo IA — os resultados antigos não fazem mais sentido pra um
  // texto novo que ainda nem foi buscado.
  function handleSearchChange(value) {
    setSearchQuery(value)
    if (aiMatchKeys !== null) { setAiMatchKeys(null); setAiError('') }
  }

  async function runAiSearch() {
    const query = searchQuery.trim()
    if (!query || aiSearching) return
    setAiSearching(true)
    setAiError('')
    try {
      const notesForSearch = libraryNotes.map(n => ({ key: n.key, text: n.text }))
      const matches = await searchNotesByTheme(query, notesForSearch)
      setAiMatchKeys(matches)
    } catch (err) {
      console.error('Failed to search notes by theme', err)
      setAiError(
        err.message === 'subscription_required' ? t('notes.searchAiSubscriptionRequired', undefined, lang)
        : t('notes.searchAiError', undefined, lang)
      )
    } finally {
      setAiSearching(false)
    }
  }

  function clearAiSearch() {
    setAiMatchKeys(null)
    setAiError('')
  }

  const activeFilter = FILTERS.find(f => f.key === filter)
  const typeFiltered = activeFilter.types
    ? libraryNotes.filter(n => activeFilter.types.includes(n.type))
    : libraryNotes
  // Filtro por cor só se aplica dentro da aba "Marcações" — nas outras,
  // colorFilter é sempre null (ver função que troca de aba abaixo).
  const colorTypeFiltered = colorFilter
    ? typeFiltered.filter(n => n.color === colorFilter)
    : typeFiltered
  // Filtro por preletor — mesmo espírito do filtro por cor, só se aplica
  // dentro da aba "Sermão".
  const preacherTypeFiltered = preacherFilter
    ? colorTypeFiltered.filter(n => n.preacher === preacherFilter)
    : colorTypeFiltered
  // Filtro por livro — independente do filtro por origem, combina com ele
  // (ex: "Leitura" + "Gênesis" só mostra notas de leitura de Gênesis).
  const bookFiltered = bookFilter
    ? preacherTypeFiltered.filter(n => n.book === bookFilter)
    : preacherTypeFiltered
  // Filtro por data — compara a data LOCAL de updatedAt (não a fatia bruta
  // do ISO, que é UTC) contra os limites do filtro (também locais, ver
  // dateFilterRangeFor/dateKey). Comparar UTC com local fazia uma nota
  // criada "agora à noite" sumir do filtro "Hoje" por várias horas em
  // fusos atrás de UTC (Brasil incluso), porque a data UTC já tinha virado
  // enquanto a local ainda não.
  const dateRange = dateFilterRangeFor(dateFilterKey, customFrom, customTo)
  const dateFiltered = dateRange
    ? bookFiltered.filter(n => {
        const nk = n.updatedAt ? dateKey(new Date(n.updatedAt)) : null
        if (!nk) return false
        if (dateRange.from && nk < dateRange.from) return false
        if (dateRange.to && nk > dateRange.to) return false
        return true
      })
    : bookFiltered
  const trimmedQuery = searchQuery.trim().toLowerCase()
  // Modo IA ativo (aiMatchKeys != null) ignora origem/livro/cor/data de
  // propósito — buscar por tema deve olhar TODAS as anotações, não só as
  // que passam pelos outros filtros; a ordem devolvida (mais relevante
  // primeiro) também é preservada, ao contrário da lista normal (mais
  // recente primeiro).
  // Busca por palavra casa tanto o corpo da anotação quanto o rótulo
  // (nome do livro, data) — "genesis" deve achar as anotações de Gênesis
  // mesmo que a palavra em si nunca apareça no texto escrito.
  const filteredNotes = aiMatchKeys !== null
    ? aiMatchKeys.map(k => libraryNotes.find(n => n.key === k)).filter(Boolean)
    : trimmedQuery
      ? dateFiltered.filter(n => n.text.toLowerCase().includes(trimmedQuery) || labelFor(n).toLowerCase().includes(trimmedQuery))
      : dateFiltered

  // Tipo não entra nesta contagem — a faixa de tipos fica sempre visível
  // (fora do painel), então já mostra sozinha se está filtrando por tipo;
  // a bolinha do botão "Filtros" só conta os refinamentos escondidos dentro
  // do painel (livro/cor/preletor/data).
  const activeFilterCount =
    (bookFilter ? 1 : 0) + (colorFilter ? 1 : 0) + (preacherFilter ? 1 : 0) + (dateFilterKey !== 'all' ? 1 : 0)

  function clearFilters() {
    setFilter('all')
    setBookFilter(null)
    setColorFilter(null)
    setPreacherFilter(null)
    setDateFilterKey('all')
    setCustomFrom('')
    setCustomTo('')
  }

  function chooseFilter(key) {
    setFilter(key)
    setColorFilter(null)
    setPreacherFilter(null)
  }

  // Tela de Arquivo — tudo que está em archivedKeySet, mais recente
  // arquivado primeiro (não por updatedAt da anotação em si — ordem de
  // quando foi GUARDADA no arquivo). Filtro por pasta independente dos
  // filtros da Biblioteca (tipo/livro/cor/preletor/data não se aplicam
  // aqui — arquivo é só "tudo" ou "por pasta").
  const archivedEntries = useMemo(() => {
    const list = state.notes.filter(n => archivedKeySet.has(n.key))
    const withMeta = list.map(n => ({ note: n, meta: archivedMetaByKey[n.key] }))
    const folderScoped = archiveFolderFilter === 'all'
      ? withMeta
      : archiveFolderFilter === 'none'
        ? withMeta.filter(({ meta }) => !meta?.folderId)
        : withMeta.filter(({ meta }) => meta?.folderId === archiveFolderFilter)
    return folderScoped
      .sort((a, b) => (b.meta?.archivedAt ?? '').localeCompare(a.meta?.archivedAt ?? ''))
      .map(({ note }) => note)
  }, [state.notes, archivedKeySet, archivedMetaByKey, archiveFolderFilter])

  function openArchivePicker(note) {
    setFolderPickerFor(note.key)
    setNewFolderMode(false)
    setNewFolderName('')
  }

  function openStandaloneFolderCreate() {
    setFolderPickerFor('__standalone__')
    setNewFolderMode(true)
    setNewFolderName('')
  }

  function closeFolderPicker() {
    setFolderPickerFor(null)
    setNewFolderMode(false)
    setNewFolderName('')
  }

  async function handleArchive(note, folderId) {
    const key = note.key
    setArchivedNotes(prev => [{ noteKey: key, folderId, archivedAt: new Date().toISOString() }, ...prev.filter(a => a.noteKey !== key)])
    closeFolderPicker()
    try {
      const next = await archiveNote(authUser.email, key, folderId)
      setArchivedNotes(next)
    } catch (err) {
      console.error('Failed to archive note', err)
    }
  }

  async function handleUnarchive(note) {
    const key = note.key
    setArchivedNotes(prev => prev.filter(a => a.noteKey !== key))
    try {
      const next = await unarchiveNote(authUser.email, key)
      setArchivedNotes(next)
    } catch (err) {
      console.error('Failed to unarchive note', err)
    }
  }

  // Cria a pasta e, se veio de "arquivar esta nota" (não do "+ Nova pasta"
  // avulso da tela de Arquivo — ver folderPickerFor), já arquiva ela lá.
  async function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name || newFolderBusy) return
    setNewFolderBusy(true)
    try {
      const { folder, folders: nextFolders } = await createNoteFolder(authUser.email, name)
      setFolders(nextFolders)
      const archiveTargetKey = folderPickerFor && folderPickerFor !== '__standalone__' ? folderPickerFor : null
      if (archiveTargetKey) {
        const next = await archiveNote(authUser.email, archiveTargetKey, folder.id)
        setArchivedNotes(next)
      } else {
        setArchiveFolderFilter(folder.id)
      }
      closeFolderPicker()
    } catch (err) {
      console.error('Failed to create folder', err)
    } finally {
      setNewFolderBusy(false)
    }
  }

  async function handleDeleteFolder(folderId) {
    if (!window.confirm(t('notes.deleteFolderConfirm', undefined, lang))) return
    try {
      const { folders: nextFolders, archivedNotes: nextArchived } = await deleteNoteFolder(authUser.email, folderId)
      setFolders(nextFolders)
      setArchivedNotes(nextArchived)
      if (archiveFolderFilter === folderId) setArchiveFolderFilter('all')
    } catch (err) {
      console.error('Failed to delete folder', err)
    }
  }

  // Card de uma anotação "de verdade" (não Estudo/Pergunta, que têm o
  // próprio card mais simples acima) — usado tanto pela lista normal da
  // Biblioteca quanto pela tela de Arquivo (ver archivedEntries), o mesmo
  // card nos dois lugares. Ícones de arquivar/desarquivar e apagar ficam
  // sempre visíveis no cabeçalho (pedido dela, 2026-09-12) — antes só
  // dava pra apagar depois de entrar no modo de edição.
  function renderRegularCard(note) {
    const isEditing = editingKey === note.key
    const isBusy = busyKey === note.key
    const isArchived = archivedKeySet.has(note.key)
    const archivedFolder = isArchived ? folderById[archivedMetaByKey[note.key]?.folderId] : null
    // Marcação usa a própria cor escolhida em vez da cor fixa do
    // tipo "Marcações" — é a informação principal que diferencia
    // uma marcação da outra numa lista (ver HIGHLIGHT_COLORS). Os
    // outros tipos usam a cor fixa do grupo (ver TYPE_COLOR), pra
    // reconhecer o tipo de longe mesmo sem abrir filtro nenhum.
    // Quadro 4c: a marcação é sempre o cartão areia com rótulo e
    // referência em #7A4A1E (a cor escolhida no grifo segue guardada e
    // aparece na leitura); os outros tipos usam a cor fixa do grupo.
    const isHighlight = note.type === 'highlight'
    const typeColor = TYPE_COLOR[typeGroupFor(note)]
    // Tempo relativo no canto: sermão usa a data do culto.
    const timeIso = note.type === 'sermon' && note.date ? `${note.date}T12:00:00` : note.updatedAt
    return (
      // Tocar no cartão (fora dos botões) abre a edição inline.
      <div
        key={note.key}
        style={{ ...styles.card, ...(isHighlight ? styles.cardHighlight : {}), cursor: isEditing ? 'default' : 'pointer' }}
        onClick={e => { if (isEditing || isBusy) return; if (e.target instanceof Element && e.target.closest('button, textarea, a, input')) return; startEdit(note) }}
      >
        <div style={styles.cardHeader}>
          <span style={{ ...styles.cardTypeLabel, color: typeColor }}>{typeCapLabel(note)}</span>
          {archivedFolder && <span style={styles.cardFolderTag}><AppIcon name="Folder" size={10} color="var(--bento-t4)" /> {archivedFolder.name}</span>}
          <span style={{ ...styles.cardTime, ...(isHighlight ? { color: 'var(--bento-sand-label)' } : {}) }}>
            {timeIso ? relativeLabel(timeIso) : ''}
          </span>
          <div style={styles.cardIconRow}>
            <button
              type="button" style={styles.cardIconBtn} disabled={isBusy}
              onClick={() => (isArchived ? handleUnarchive(note) : openArchivePicker(note))}
              aria-label={t(isArchived ? 'notes.unarchiveAction' : 'notes.archiveIconLabel', undefined, lang)}
              title={t(isArchived ? 'notes.unarchiveAction' : 'notes.archiveIconLabel', undefined, lang)}
            >
              <AppIcon name={isArchived ? 'ArchiveRestore' : 'Archive'} size={15} strokeWidth={2} color="var(--bento-t4)" />
            </button>
            <button
              type="button" style={styles.cardIconBtn} disabled={isBusy}
              onClick={() => deleteNote(note)}
              aria-label={t('notes.deleteAction', undefined, lang)}
              title={t('notes.deleteAction', undefined, lang)}
            >
              <AppIcon name="Trash2" size={15} strokeWidth={2} color="var(--bento-t4)" />
            </button>
          </div>
        </div>

        {note.type === 'sermon' && note.passages?.length > 0 && (
          <div style={styles.passageChipRow}>
            {note.passages.map((p, i) => (
              <button
                key={i} style={styles.passageChip}
                onClick={() => onOpenBiblePassage?.(p.book, p.chapter)}
              >
                <AppIcon name="BookOpen" size={11} color="var(--bento-accent)" /> {passageLabel(p)}
              </button>
            ))}
          </div>
        )}

        {isEditing ? (
          <>
            <textarea
              style={styles.editTextarea}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={4}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                style={styles.editSaveBtn} onClick={() => saveEdit(note)}
                disabled={isBusy || !editText.trim()}
              >
                {isBusy ? t('notes.saving', undefined, lang) : t('notes.saveEdit', undefined, lang)}
              </button>
              <button style={styles.editCancelBtn} onClick={cancelEdit} disabled={isBusy}>
                {t('notes.cancelEdit', undefined, lang)}
              </button>
            </div>
          </>
        ) : isHighlight ? (
          // Marcação (quadro 4c): o VERSÍCULO em itálico, a referência
          // embaixo; a anotação da pessoa, se houver, vem depois.
          <>
            <HighlightQuote note={note} lang={lang} />
            <p style={{ ...styles.highlightRef, color: typeColor }}>{labelFor(note)}</p>
            {note.text && <p style={styles.highlightAnnotation}>{note.text}</p>}
          </>
        ) : (
          <>
            <p style={styles.cardTitleLine}>{labelFor(note)}</p>
            {note.text
              ? <p style={styles.cardText}>{note.text}</p>
              : <p style={{ ...styles.cardText, ...styles.cardTextEmpty }}>{t('notes.noAnnotationText', undefined, lang)}</p>}
          </>
        )}
      </div>
    )
  }

  // Card de uma anotação qualquer na lista — Estudo e Pergunta têm forma
  // própria (sem arquivar: Estudo é só progresso, edita em StudiesScreen;
  // Pergunta é local/efêmera, já tem seu próprio "Apagar"); os demais tipos
  // usam renderRegularCard acima (com arquivar/desarquivar + apagar).
  function renderNoteCard(note) {
    // Estudo — card à parte (ícone + título + progresso + seta). Toque
    // leva pra StudiesScreen já aberto no estudo certo (ver onOpenStudy,
    // App.jsx); só o conteúdo continua editável só por lá. "Apagar" (ícone
    // de lixo, pedido dela 2026-09-12) já funciona direto daqui — ver
    // deleteStudyEntry.
    if (note.type === 'study') {
      const label = note.doneCount === 0
        ? t('notes.studyStart', undefined, lang)
        : note.doneCount === note.total
          ? t('notes.studyReview', undefined, lang)
          : t('notes.studyResume', { step: Math.min(note.doneCount + 1, note.total), total: note.total }, lang)
      const isBusy = busyKey === note.key
      return (
        // div (não button) porque tem um botão de apagar aninhado —
        // mesmo padrão do card normal (ver renderRegularCard).
        <div
          key={note.key} style={styles.studyRow}
          onClick={e => { if (isBusy) return; if (e.target instanceof Element && e.target.closest('button')) return; onOpenStudy?.(note.id) }}
        >
          <span style={styles.studyRowIcon}>
            <AppIcon name={note.icon} size={16} color="var(--bento-accent)" />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={styles.studyRowTitle}>{studyTitleFor(note)}</span>
            <span style={styles.studyRowProgress}>{label}</span>
          </span>
          <button
            type="button" style={styles.cardIconBtn} disabled={isBusy}
            onClick={() => deleteStudyEntry(note)}
            aria-label={t('notes.deleteAction', undefined, lang)}
            title={t('notes.deleteAction', undefined, lang)}
          >
            <AppIcon name="Trash2" size={15} strokeWidth={2} color="var(--bento-t4)" />
          </button>
          <span style={styles.studyRowChevron}>›</span>
        </div>
      )
    }
    // Pergunta guardada da IA — card só de leitura (a pergunta/
    // resposta já foi verificada no momento em que foi feita; não
    // edita aqui). Toque na referência volta pro texto; "Apagar"
    // tira do histórico (mesmo botão que "Reportar resposta" usa
    // em ReadingBlockView.jsx).
    if (note.type === 'question') {
      return (
        <div key={note.key} style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.cardTypeLabel, color: TYPE_COLOR.question }}>{typeCapLabel(note)}</span>
            <span style={styles.cardTime}>{note.updatedAt ? relativeLabel(note.updatedAt) : ''}</span>
          </div>
          <button style={{ ...styles.passageChip, marginBottom: 8 }} onClick={() => onOpenBiblePassage?.(note.book, note.chapter)}>
            <AppIcon name="BookOpen" size={11} color="var(--bento-accent)" /> {bookLabel(note.book)} {note.chapter}
          </button>
          <p style={styles.cardText}>{note.question}</p>
          {note.answerReply && <p style={{ ...styles.cardText, color: 'var(--bento-t3)', marginTop: 6 }}>{note.answerReply}</p>}
          <button style={styles.editDeleteBtn} onClick={() => deleteQuestion(note)}>{t('notes.deleteAction', undefined, lang)}</button>
        </div>
      )
    }
    return renderRegularCard(note)
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
    <div style={styles.screen}>
      <div style={styles.body}>
        <div style={styles.titleRow}>
          <p style={styles.title}>{t('notes.pageTitle', undefined, lang)}</p>
          {viewMode === 'library' ? (
            archivedNotes.length > 0 && (
              <button style={styles.archiveToggleBtn} onClick={() => setViewMode('archive')}>
                <AppIcon name="Archive" size={13} color="var(--bento-t3)" />
                {t('notes.archiveViewBtn', undefined, lang)}
                <span style={styles.archiveCountBadge}>{archivedNotes.length}</span>
              </button>
            )
          ) : (
            <button style={styles.archiveToggleBtn} onClick={() => { setViewMode('library'); setArchiveFolderFilter('all') }}>
              <AppIcon name="ChevronLeft" size={13} color="var(--bento-t3)" />
              {t('notes.backToLibraryBtn', undefined, lang)}
            </button>
          )}
        </div>

        {viewMode === 'archive' ? (
          <>
            {/* Filtro por pasta — "Tudo", "Sem pasta" e cada pasta criada
                (ver folders/noteOrganizationStore.js), mais um "+" pra criar
                uma pasta nova sem precisar arquivar nada agora. */}
            <div style={styles.filterRow}>
              <button
                style={{ ...styles.filterBtn, ...(archiveFolderFilter === 'all' ? styles.filterBtnActive : {}) }}
                onClick={() => setArchiveFolderFilter('all')}
              >
                {t('notes.archiveFolderAll', undefined, lang)}
              </button>
              <button
                style={{ ...styles.filterBtn, ...(archiveFolderFilter === 'none' ? styles.filterBtnActive : {}) }}
                onClick={() => setArchiveFolderFilter('none')}
              >
                {t('notes.archiveFolderNone', undefined, lang)}
              </button>
              {folders.map(f => (
                <button
                  key={f.id}
                  style={{ ...styles.filterBtn, ...(archiveFolderFilter === f.id ? styles.filterBtnActive : {}) }}
                  onClick={() => setArchiveFolderFilter(f.id)}
                >
                  {f.name}
                </button>
              ))}
              <button style={styles.newFolderChipBtn} onClick={openStandaloneFolderCreate} aria-label={t('notes.archiveNewFolderBtn', undefined, lang)} title={t('notes.archiveNewFolderBtn', undefined, lang)}>
                <AppIcon name="FolderPlus" size={15} color="var(--bento-t3)" />
              </button>
            </div>

            {archiveFolderFilter !== 'all' && archiveFolderFilter !== 'none' && (
              <button style={styles.deleteFolderBtn} onClick={() => handleDeleteFolder(archiveFolderFilter)}>
                <AppIcon name="Trash2" size={12} color="var(--bento-accent)" /> {t('notes.deleteFolderAction', undefined, lang)}
              </button>
            )}

            {archivedEntries.length === 0 && (
              <p style={styles.emptyHint}>{t('notes.archiveEmpty', undefined, lang)}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {archivedEntries.map(renderNoteCard)}
            </div>
          </>
        ) : (
          <>

        {/* Busca por palavra (instantânea, casa substring no texto) +
            busca por tema com IA (botão à parte — só dispara ao tocar, não
            a cada tecla) — pra quando a pessoa lembra do assunto mas não
            da palavra exata que escreveu. */}
        {state.status === 'ready' && libraryNotes.length > 0 && (
          <>
            {/* Um campo só (quadro 4c): filtra por palavra enquanto digita;
                Enter dispara a busca por tema com IA (Premium + IA) — o botão
                roxo que existia pra isso saiu do quadro. */}
            <div style={styles.searchInputWrap}>
              <AppIcon name="Search" size={17} strokeWidth={2} color="var(--bento-t5)" />
              <input
                type="text"
                style={styles.searchInput}
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && session.hasAI && searchQuery.trim() && !aiSearching) runAiSearch() }}
                placeholder={t('notes.searchPlaceholder', undefined, lang)}
              />
            </div>

            {aiMatchKeys !== null && (
              <div style={styles.aiActiveRow}>
                <span style={styles.aiActiveTag}>
                  <AppIcon name="Sparkles" size={11} color="var(--bento-accent)" /> {t('notes.searchAiBtn', undefined, lang)}
                </span>
                <button style={styles.aiClearBtn} onClick={clearAiSearch}>{t('notes.searchAiClear', undefined, lang)}</button>
              </div>
            )}
            {aiError && <p style={styles.aiErrorText}>{aiError}</p>}
          </>
        )}

        {/* Tipo de anotação — SEMPRE visível (não fica escondido atrás do
            painel de filtros). Chip monocromático (ativo --bk/branco,
            inativo branco/--g6, ver handoff) — a cor por tipo mora só no
            ícone/rótulo de cada card abaixo, não mais aqui. Fileira rola
            horizontalmente com máscara de esmaecimento na borda (mesma
            correção que o handoff pede em qualquer fileira rolável do
            app). Some junto do resto na busca por tema (IA), que ignora
            filtros de propósito. */}
        {state.status === 'ready' && libraryNotes.length > 0 && aiMatchKeys === null && (
          <div style={styles.filterRow}>
            {FILTERS.map(f => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  style={{ ...styles.filterBtn, ...(active ? styles.filterBtnActive : {}) }}
                  onClick={() => chooseFilter(f.key)}
                >
                  {t(f.labelKey, undefined, lang)}
                </button>
              )
            })}
          </div>
        )}

        {/* Painel de filtros (livro/cor/preletor/data) — não está no quadro
            4c (só busca + chips), mas a autora pediu de volta: sem ele não
            tinha mais como filtrar por livro, cor da marcação, preletor ou
            data. Minimizado por padrão — só o botão "Filtros" aparece, com
            uma bolinha mostrando quantos estão ativos. */}
        {state.status === 'ready' && libraryNotes.length > 0 && aiMatchKeys === null && (
          <>
            <button style={styles.filtersToggleBtn} onClick={() => setFiltersOpen(v => !v)}>
              <AppIcon name="SlidersHorizontal" size={14} color="var(--bento-t3)" />
              <span style={styles.filtersToggleLabel}>{t('notes.filtersToggle', undefined, lang)}</span>
              {activeFilterCount > 0 && <span style={styles.filtersBadge}>{activeFilterCount}</span>}
              <AppIcon
                name="ChevronDown" size={14} color="var(--bento-t5)"
                style={{ marginLeft: 'auto', transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
              />
            </button>

            {filtersOpen && (
              <>
                {/* Livro — só notas de leitura/marcação têm um; lista só
                    os que já têm alguma anotação, em ordem canônica. */}
                {availableBooks.length > 0 && (
                  <select
                    style={styles.bookSelect}
                    value={bookFilter ?? ''}
                    onChange={e => setBookFilter(e.target.value || null)}
                    aria-label={t('notes.filterBookAll', undefined, lang)}
                  >
                    <option value="">{t('notes.filterBookAll', undefined, lang)}</option>
                    {availableBooks.map(b => (
                      <option key={b} value={b}>{bookLabel(b)}</option>
                    ))}
                  </select>
                )}

                {/* Cor — só dentro da aba "Marcações", pra achar um
                    versículo pela cor usada. */}
                {filter === 'highlight' && (
                  <div style={styles.colorFilterRow}>
                    <button
                      style={{ ...styles.colorFilterAllBtn, ...(colorFilter === null ? styles.colorFilterAllBtnActive : {}) }}
                      onClick={() => setColorFilter(null)}
                    >
                      {t('notes.filterColorAll', undefined, lang)}
                    </button>
                    {HIGHLIGHT_COLORS.map(c => (
                      <button
                        key={c.id}
                        style={{ ...styles.colorSwatchBtn, background: c.swatch, ...(colorFilter === c.id ? styles.colorSwatchBtnActive : {}) }}
                        onClick={() => setColorFilter(v => (v === c.id ? null : c.id))}
                        aria-label={t(c.labelKey, undefined, lang)}
                        aria-pressed={colorFilter === c.id}
                      />
                    ))}
                  </div>
                )}

                {/* Preletor — só dentro da aba "Sermão". */}
                {filter === 'sermon' && availablePreachers.length > 0 && (
                  <select
                    style={styles.bookSelect}
                    value={preacherFilter ?? ''}
                    onChange={e => setPreacherFilter(e.target.value || null)}
                    aria-label={t('notes.filterPreacherAll', undefined, lang)}
                  >
                    <option value="">{t('notes.filterPreacherAll', undefined, lang)}</option>
                    {availablePreachers.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}

                {/* Data de quando foi adicionada. */}
                <div style={styles.dateFilterRow}>
                  {DATE_FILTERS.map(d => (
                    <button
                      key={d.key}
                      style={{ ...styles.dateFilterChip, ...(dateFilterKey === d.key ? styles.dateFilterChipActive : {}) }}
                      onClick={() => setDateFilterKey(d.key)}
                    >
                      {t(d.labelKey, undefined, lang)}
                    </button>
                  ))}
                </div>
                {dateFilterKey === 'custom' && (
                  <div style={styles.dateRangeRow}>
                    <input
                      type="date" style={styles.dateInput} value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                      aria-label={t('notes.dateFilterFrom', undefined, lang)}
                    />
                    <span style={styles.dateRangeSep}>–</span>
                    <input
                      type="date" style={styles.dateInput} value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                      aria-label={t('notes.dateFilterTo', undefined, lang)}
                    />
                  </div>
                )}

                {activeFilterCount > 0 && (
                  <button style={styles.filtersClearBtn} onClick={clearFilters}>
                    {t('notes.filtersClear', undefined, lang)}
                  </button>
                )}
              </>
            )}
          </>
        )}

        {state.status === 'loading' && <p style={styles.emptyHint}>{t('notes.loading', undefined, lang)}</p>}
        {state.status === 'error' && <p style={styles.emptyHint}>{t('notes.error', undefined, lang)}</p>}
        {state.status === 'ready' && libraryNotes.length === 0 && (
          <p style={styles.emptyHint}>
            {state.notes.length > 0 ? t('notes.emptyAllArchived', undefined, lang) : t('notes.empty', undefined, lang)}
          </p>
        )}
        {state.status === 'ready' && libraryNotes.length > 0 && filteredNotes.length === 0 && (
          <p style={styles.emptyHint}>
            {aiMatchKeys !== null ? t('notes.searchAiEmpty', undefined, lang)
              : trimmedQuery ? t('notes.emptySearch', undefined, lang)
              : t('notes.emptyFiltered', undefined, lang)}
          </p>
        )}

        {filter === 'study' && !trimmedQuery && myStudiesData && (
          myStudiesData.themePlans.length + myStudiesData.published.length + myStudiesData.invites.length > 0
        ) && (
          <MyStudiesSection
            lang={lang}
            data={myStudiesData}
            activeStudyId={session.activeStudyId}
            onOpenThemePlan={onOpenThemePlan}
            onWithdraw={handleWithdrawStudy}
            onAcceptInvite={handleAcceptStudyInvite}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredNotes.map(renderNoteCard)}
        </div>
          </>
        )}
      </div>
    </div>

      {/* FAB — só ação desta tela que "cria" algo (as demais nascem em
          contexto: leitura, Reflexão, Estudos). position:absolute (não
          fixed) relativo ao wrapper logo acima, não ao viewport — evita o
          bug de position:fixed dentro do zoom:1.15 de .app-content-inner
          (ver comentário em ReadingBlockView.jsx) sem precisar de portal.
          Pedido dela (2026-09-12): igual a abrir uma já feita, criar uma
          nova sermão também vai direto pra página rica (JourneyScreen.jsx,
          sermonNoteFresh) — não existe mais formulário simples aqui. Some
          na tela de Arquivo (não faz sentido criar sermão novo por lá). */}
      {viewMode === 'library' && (
        <button style={styles.fab} onClick={onCreateSermonNote} aria-label={t('notes.sermonNewBtn', undefined, lang)} title={t('notes.sermonNewBtn', undefined, lang)}>
          <AppIcon name="Plus" size={22} color="var(--bento-ink)" />
        </button>
      )}

      {/* Folha de escolher/criar pasta pra arquivar — aberta pelo ícone de
          arquivar num card (folderPickerFor = key da nota) ou pelo "+" da
          tela de Arquivo (folderPickerFor = '__standalone__', só cria a
          pasta, sem arquivar nada). */}
      {folderPickerFor && (
        <FolderPickerSheet
          lang={lang}
          folders={folders}
          newFolderMode={newFolderMode}
          newFolderName={newFolderName}
          newFolderBusy={newFolderBusy}
          onChangeNewFolderName={setNewFolderName}
          onOpenNewFolder={() => setNewFolderMode(true)}
          onCreateFolder={handleCreateFolder}
          onChoose={folderId => handleArchive(state.notes.find(n => n.key === folderPickerFor), folderId)}
          isStandalone={folderPickerFor === '__standalone__'}
          onClose={closeFolderPicker}
        />
      )}
    </div>
  )
}

// Folha inferior de escolher pasta pra arquivar uma nota — ou (isStandalone)
// só criar uma pasta vazia, aberta pelo "+" da tela de Arquivo. Mesmo
// padrão visual de folha (sheetBackdrop/sheetPanel) usado em outras telas
// (ver GroupAdminScreen.jsx).
function FolderPickerSheet({ lang, folders, newFolderMode, newFolderName, newFolderBusy, onChangeNewFolderName, onOpenNewFolder, onCreateFolder, onChoose, isStandalone, onClose }) {
  return createPortal(
    <div style={styles.sheetBackdrop} onClick={onClose}>
      <div style={styles.sheetPanel} onClick={e => e.stopPropagation()}>
        <p style={styles.sheetTitle}>{t(isStandalone ? 'notes.archiveNewFolderBtn' : 'notes.archiveSheetTitle', undefined, lang)}</p>
        {!isStandalone && (
          <button style={styles.sheetOptionBtn} onClick={() => onChoose(null)}>
            <AppIcon name="Archive" size={15} color="var(--bento-t3)" /> {t('notes.archiveNoFolder', undefined, lang)}
          </button>
        )}
        {!isStandalone && folders.map(f => (
          <button key={f.id} style={styles.sheetOptionBtn} onClick={() => onChoose(f.id)}>
            <AppIcon name="Folder" size={15} color="var(--bento-t3)" /> {f.name}
          </button>
        ))}
        {newFolderMode ? (
          <div style={styles.newFolderRow}>
            <input
              type="text" autoFocus style={styles.newFolderInput} value={newFolderName}
              onChange={e => onChangeNewFolderName(e.target.value)}
              placeholder={t('notes.archiveNewFolderPlaceholder', undefined, lang)}
              maxLength={40}
            />
            <button style={styles.newFolderConfirmBtn} onClick={onCreateFolder} disabled={newFolderBusy || !newFolderName.trim()}>
              {t('notes.archiveNewFolderCreate', undefined, lang)}
            </button>
          </div>
        ) : (
          <button style={styles.sheetOptionBtn} onClick={onOpenNewFolder}>
            <AppIcon name="FolderPlus" size={15} color="var(--bento-accent)" /> {t('notes.archiveNewFolderBtn', undefined, lang)}
          </button>
        )}
        <button style={styles.secondarySmallBtn} onClick={onClose} disabled={newFolderBusy}>{t('notes.cancelEdit', undefined, lang)}</button>
      </div>
    </div>,
    document.body,
  )
}

// Texto do(s) versículo(s) marcado(s) — lido do mesmo JSON estático da
// leitura (bibleTextStore), na versão em uso; enquanto carrega mostra só a
// referência (que vem logo abaixo, ver card de marcação).
function HighlightQuote({ note, lang }) {
  const [quote, setQuote] = useState('')
  useEffect(() => {
    let cancelled = false
    const bookKey = lang === 'en' ? (note.bookEn || note.book) : note.book
    fetchBookText(getSelectedVersionId(lang), bookKey).then(chapters => {
      if (cancelled) return
      const verses = chapters?.[String(note.chapter)]?.verses ?? {}
      const text = [...(note.verses ?? [])].sort((a, b) => a - b).map(v => verses[String(v)]).filter(Boolean).join(' ')
      setQuote(text)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [note.book, note.bookEn, note.chapter, lang, (note.verses ?? []).join(',')])
  if (!quote) return null
  return <p style={styles.highlightQuote}>"{quote}"</p>
}

// "Meus estudos" (4c, Bloco 12) — planos por tema (22a-d), o que EU
// publiquei no banco (com "sair do banco") e convites de amigos pra fazer
// um estudo junto (com "aceitar"). À parte da lista genérica de notas
// logo abaixo — formato de dado bem diferente (ver comentário no useEffect
// que carrega isto).
function MyStudiesSection({ lang, data, activeStudyId, onOpenThemePlan, onWithdraw, onAcceptInvite }) {
  const { themePlans, published, invites } = data
  return (
    <div style={mss.card}>
      {themePlans.length > 0 && (
        <>
          <p style={mss.label}>{t('notes.myStudiesPlansLabel', undefined, lang)}</p>
          {themePlans.map(plan => {
            const texts = deriveThemeTexts(plan.passages)
            return (
              <button key={plan.id} style={styles.studyRow} onClick={() => onOpenThemePlan?.(plan.id)}>
                <span style={styles.studyRowIcon}>
                  <AppIcon name="Sparkles" size={16} color="var(--bento-accent)" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={styles.studyRowTitle}>{plan.title}</span>
                  <span style={styles.studyRowProgress}>
                    {activeStudyId === plan.id ? t('notes.myStudiesActiveTag', undefined, lang) : t('notes.myStudiesDaysCount', { n: texts.length }, lang)}
                  </span>
                </span>
                <span style={styles.studyRowChevron}>›</span>
              </button>
            )
          })}
        </>
      )}

      {published.length > 0 && (
        <>
          <p style={{ ...mss.label, marginTop: themePlans.length > 0 ? 14 : 0 }}>{t('notes.myStudiesPublishedLabel', undefined, lang)}</p>
          {published.map(study => (
            <div key={study.id} style={mss.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={mss.rowTitle}>{study.title}</p>
                <p style={mss.rowSub}>{t(study.visibility === 'public' ? 'notes.myStudiesVisibilityPublic' : 'notes.myStudiesVisibilityInvited', { n: study.usesCount }, lang)}</p>
              </div>
              <button type="button" style={mss.withdrawBtn} onClick={() => onWithdraw?.(study.id)}>{t('notes.myStudiesWithdrawBtn', undefined, lang)}</button>
            </div>
          ))}
        </>
      )}

      {invites.length > 0 && (
        <>
          <p style={{ ...mss.label, marginTop: 14 }}>{t('notes.myStudiesInvitesLabel', undefined, lang)}</p>
          {invites.map(({ status, study }) => (
            <div key={study.id} style={mss.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={mss.rowTitle}>{study.title}</p>
                <p style={mss.rowSub}>{t('notes.myStudiesInvitedBy', { name: study.authorName }, lang)}</p>
              </div>
              {status === 'invited' ? (
                <button type="button" style={mss.acceptBtn} onClick={() => onAcceptInvite?.(study)}>{t('notes.myStudiesAcceptBtn', undefined, lang)}</button>
              ) : (
                <button type="button" style={mss.withdrawBtn} onClick={() => onAcceptInvite?.(study)}>{t('notes.myStudiesContinueBtn', undefined, lang)}</button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

const mss = {
  card: { borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px', margin: '0 0 12px' },
  label: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 4px' },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid var(--bento-line)' },
  rowTitle: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  rowSub: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },
  withdrawBtn: { height: 30, padding: '0 12px', flexShrink: 0, borderRadius: 10, border: 'none', background: 'var(--bento-line)', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  acceptBtn: { height: 30, padding: '0 12px', flexShrink: 0, borderRadius: 10, border: 'none', background: 'var(--bento-ink)', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, color: '#fff', cursor: 'pointer' },
}

const styles = {
  screen:     { background: 'var(--bento-bg)', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  body:       { padding: '20px 20px calc(var(--nav-height) + 90px)', display: 'flex', flexDirection: 'column', gap: 12 },
  title:      { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: 0 },
  titleRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '0 0 2px' },
  archiveToggleBtn: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'var(--bento-card)', borderRadius: 12, padding: '7px 11px', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  archiveCountBadge: { minWidth: 16, height: 16, borderRadius: 8, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' },
  searchRow:      { display: 'flex', gap: 8 },
  searchInputWrap:{ flex: 1, minWidth: 0, height: 46, display: 'flex', alignItems: 'center', gap: 10, border: 'none', borderRadius: 16, padding: '0 16px', background: 'var(--bento-card)' },
  searchInput:    { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', padding: '10px 0', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 500, lineHeight: 1, color: 'var(--bento-ink)' },
  searchAiBtn:    { flexShrink: 0, width: 40, border: 'none', borderRadius: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bento-accent)' },
  aiActiveRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '-4px 2px 0' },
  aiActiveTag:    { display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-accent)' },
  aiClearBtn:     { border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t3)', padding: '2px 4px' },
  aiErrorText:    { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, color: 'var(--bento-accent)', margin: '-4px 2px 0' },
  filtersToggleBtn:  { display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: 'var(--bento-card)', borderRadius: 13, padding: '10px 12px', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-t2)' },
  filtersToggleLabel:{ flexShrink: 0 },
  filtersBadge:      { minWidth: 17, height: 17, borderRadius: 9, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' },
  filtersClearBtn:   { alignSelf: 'flex-start', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-accent)', padding: '2px 4px' },
  bookSelect:        { width: '100%', border: 'none', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, color: 'var(--bento-ink)', background: 'var(--bento-card)' },
  // Quatro chips cabem na largura do quadro 4c: sem rolagem nem máscara.
  filterRow:  { display: 'flex', gap: 8 },
  filterBtn:  {
    flexShrink: 0, height: 34, padding: '0 15px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 12, border: 'none', fontFamily: 'var(--font-bento)',
    background: 'var(--bento-card)', color: 'var(--bento-ink)', transition: 'background .15s, color .15s',
  },
  filterBtnActive: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },
  colorFilterRow:      { display: 'flex', alignItems: 'center', gap: 8, margin: '-2px 2px 0' },
  colorFilterAllBtn:   { border: 'none', background: 'var(--bento-line)', borderRadius: 20, padding: '6px 12px', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  colorFilterAllBtnActive: { background: 'var(--bento-ink)', color: '#fff' },
  colorSwatchBtn:      { width: 26, height: 26, borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer' },
  // Seleção em dois anéis (branco + tinta) sem usar box-shadow — outline
  // (que não conta como sombra) faz o mesmo efeito de "anel afastado".
  colorSwatchBtnActive:{ border: '2px solid #fff', outline: '2px solid var(--bento-ink)', outlineOffset: 0 },
  dateFilterRow:   { display: 'flex', gap: 6, flexWrap: 'wrap', margin: '-2px 2px 0' },
  dateFilterChip:  { border: 'none', background: 'var(--bento-line)', borderRadius: 20, padding: '6px 12px', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  dateFilterChipActive: { background: 'var(--bento-ink)', color: '#fff' },
  dateRangeRow:    { display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px' },
  dateRangeSep:    { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-t4)' },
  dateInput:       { flex: 1, minWidth: 0, border: 'none', borderRadius: 11, padding: '9px 10px', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, color: 'var(--bento-ink)', background: 'var(--bento-card)' },
  emptyHint:  { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '24px 12px' },
  card:       { background: 'var(--bento-card)', borderRadius: 24, padding: 20 },
  cardHighlight: { background: 'var(--bento-sand)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTypeLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.1em', textTransform: 'uppercase' },
  cardTime:   { flex: 1, minWidth: 0, textAlign: 'right', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t5)' },
  cardTitleLine: { fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 800, lineHeight: 1.4, color: 'var(--bento-ink)', margin: '0 0 6px' },
  cardText:   { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: 0 },
  cardTextEmpty: { color: 'var(--bento-t4)', fontStyle: 'italic' },
  highlightQuote: { fontFamily: 'var(--font-bento)', fontStyle: 'italic', fontSize: 15, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-sand-ink-strong)', margin: '0 0 8px' },
  highlightRef:   { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, lineHeight: 1, margin: 0 },
  highlightAnnotation: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-sand-ink)', margin: '8px 0 0', whiteSpace: 'pre-wrap' },
  editDeleteBtn:{ flex: 'none', background: 'none', border: 'none', padding: '9px 6px', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-accent)', cursor: 'pointer' },
  cardActions:  { display: 'flex', gap: 2, flexShrink: 0 },
  cardActionBtn:{ width: 24, height: 24, border: 'none', background: 'none', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  editTextarea: { width: '100%', border: 'none', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-ink)', resize: 'none', outline: 'none', lineHeight: 1.5, background: 'var(--bento-line)' },
  editSaveBtn:  { flex: 1, background: 'var(--bento-accent)', border: 'none', borderRadius: 11, padding: 9, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  editCancelBtn:{ flex: 1, background: 'var(--bento-line)', border: 'none', borderRadius: 11, padding: 9, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  fab: {
    position: 'absolute', right: 20, bottom: 96, width: 56, height: 56, borderRadius: 20,
    border: 'none', background: 'var(--bento-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  // Linha de Estudo (quadro 4c): rgba(255,255,255,.6) r24 p18/20 gap 14.
  studyRow: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
    background: 'rgba(255,255,255,.6)', border: 'none', borderRadius: 24, padding: '18px 20px',
    fontFamily: 'var(--font-bento)', cursor: 'pointer',
  },
  studyRowIcon: {
    width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  studyRowTitle: { display: 'block', fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 3 },
  studyRowProgress: { display: 'block', fontSize: 12, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },
  studyRowChevron: { fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t5)', flexShrink: 0 },
  passageChipRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  passageChip:    { display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'var(--bento-line)', borderRadius: 20, padding: '5px 10px', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-accent)', cursor: 'pointer' },

  // Ícones de arquivar/desarquivar + apagar no cabeçalho do card (pedido
  // dela, 2026-09-12) — ficam sempre visíveis, sem precisar entrar no modo
  // de edição primeiro (ver renderRegularCard).
  cardIconRow: { display: 'flex', gap: 2, flexShrink: 0 },
  cardIconBtn: { width: 26, height: 26, flexShrink: 0, border: 'none', background: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  cardFolderTag: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 700, color: 'var(--bento-t4)', background: 'var(--bento-line)', borderRadius: 20, padding: '3px 8px' },

  // Tela de Arquivo — chip "+ Nova pasta" e o link de apagar a pasta ativa.
  newFolderChipBtn: { flexShrink: 0, width: 34, height: 34, border: '1px dashed var(--bento-pending-border)', background: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  deleteFolderBtn: { alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-accent)', padding: '2px 4px' },

  // Folha de escolher/criar pasta (FolderPickerSheet) — mesmo padrão visual
  // de folha inferior usado em GroupAdminScreen.jsx.
  sheetBackdrop: { position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheetPanel: { width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', padding: '20px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10, animation: 'bookOpenIn .22s cubic-bezier(.32,.72,0,1)' },
  sheetTitle: { fontFamily: 'var(--font-bento)', fontSize: 16, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 4px' },
  sheetOptionBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', border: 'none', background: 'var(--bento-card)', borderRadius: 14, padding: '13px 16px', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  newFolderRow: { display: 'flex', gap: 8 },
  newFolderInput: { flex: 1, minWidth: 0, border: 'none', borderRadius: 14, padding: '0 14px', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-card)' },
  newFolderConfirmBtn: { flexShrink: 0, border: 'none', borderRadius: 14, padding: '0 16px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', background: 'var(--bento-accent)', cursor: 'pointer' },
  secondarySmallBtn: { width: '100%', border: 'none', background: 'var(--bento-line)', borderRadius: 14, padding: '13px 16px', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
}
