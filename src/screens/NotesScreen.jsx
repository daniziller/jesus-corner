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
import { getSermonNotes, saveSermonNote, deleteSermonNote } from '../notes/sermonNotesStore'
import { getPinnedApplicationPhrase, setPinnedApplicationPhrase } from '../reflection/applicationPhraseStore'
import { getHighlights, updateHighlightText, hideHighlight } from '../highlights/highlightsStore'
import { HIGHLIGHT_COLORS } from '../data/highlightColors'
import { formatVerseRanges } from '../utils/verseRanges'
import { computeBookChapterCounts } from '../utils/progress'
import { dateKey } from '../utils/dateKey'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { STUDIES } from '../data/studies'
import { getCompletedStudySessions, isStudySessionDone } from '../studies/studiesProgressStore'
import { getAiStudies } from '../studies/aiStudiesStore'
import { getInductiveStudies } from '../studies/inductiveStudiesStore'
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

// Uma faixa nova de anotação de sermão, sem livro/capítulo/versículo
// escolhidos ainda (ver addPassageRow).
function blankPassage() {
  return { book: '', chapter: '', verseStart: '', verseEnd: '' }
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

export default function NotesScreen({ session, authUser, blocks, sessionsByBlock, onOpenBiblePassage, onOpenStudy }) {
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

  // Formulário de anotação de sermão — bem mais campos que uma nota comum
  // (preletor/igreja/passagens/texto), então usa seu próprio formulário
  // rico em vez do textarea genérico de edição. sermonEditing != null =
  // editando uma existente (guarda o registro original, pra preservar
  // id/data/createdAt ao salvar); null = criando uma nova.
  const [creatingSermon, setCreatingSermon] = useState(false)
  const [sermonEditing, setSermonEditing] = useState(null)
  const [sermonPreacher, setSermonPreacher] = useState('')
  const [sermonChurch, setSermonChurch] = useState('')
  const [sermonPassages, setSermonPassages] = useState([])
  const [sermonText, setSermonText] = useState('')
  const [sermonBusy, setSermonBusy] = useState(false)
  const [sermonError, setSermonError] = useState('')

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
    const present = new Set(state.notes.filter(n => n.book).map(n => n.book))
    const ordered = []
    for (const block of blocks) {
      for (const b of block.books) {
        if (present.has(b) && !ordered.includes(b)) ordered.push(b)
      }
    }
    return ordered
  }, [state.notes, blocks])

  // Preletores já usados em alguma anotação de sermão — mesma ideia de
  // availableBooks (só quem já apareceu, não uma lista fixa), em ordem
  // alfabética (sem ordem canônica pra nomes de pessoa, ao contrário de
  // livro).
  const availablePreachers = useMemo(() => {
    const present = new Set(
      state.notes.filter(n => n.type === 'sermon' && n.preacher).map(n => n.preacher)
    )
    return [...present].sort((a, b) => a.localeCompare(b))
  }, [state.notes])

  // TODOS os 66 livros, em ordem canônica — usado no seletor de livro do
  // formulário de sermão (diferente de availableBooks acima, que só serve
  // pro FILTRO e por isso só lista quem já tem anotação).
  const allBooksOrdered = useMemo(() => blocks.flatMap(b => b.books), [blocks])
  // Quantos capítulos cada livro tem — popula o seletor de capítulo do
  // formulário de sermão (mesmo cálculo já usado em JourneyScreen.jsx pra
  // saber o total de capítulos por livro).
  const bookChapterCounts = useMemo(() => computeBookChapterCounts(sessionsByBlock), [sessionsByBlock])

  useEffect(() => {
    if (!authUser?.email) { setState({ status: 'ready', notes: [] }); return }
    let cancelled = false
    Promise.all([
      getNotes(authUser.email), getHighlights(authUser.email), getSermonNotes(authUser.email),
      getCompletedStudySessions(authUser.email), getAiStudies(authUser.email), getInductiveStudies(authUser.email),
    ])
      .then(([map, highlightList, sermonList, completedStudySet, aiStudies, inductiveStudies]) => {
        if (cancelled) return
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
        // lá). Só entram estudos que a pessoa já "produziu" de alguma
        // forma: o catálogo pronto só aparece se já começou (começar a ler
        // não é produzir nada); IA e indutivo sempre aparecem, já que
        // gerar/criar um já é um ato de produção, mesmo com 0 sessões
        // feitas ainda. `text: ''` (sem corpo de texto) pra não quebrar a
        // busca por palavra, que espera n.text existir.
        const studyEntries = [...STUDIES, ...aiStudies, ...inductiveStudies]
          .map(study => {
            const total = study.sessions.length
            const doneCount = study.sessions.filter(s => isStudySessionDone(completedStudySet, study.id, s.id)).length
            return { study, doneCount, total }
          })
          .filter(({ study, doneCount }) => study.kind === 'inductive' || aiStudies.includes(study) || doneCount > 0)
          .map(({ study, doneCount, total }) => {
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
              updatedAt: study.kind === 'inductive' ? (lastSessionUpdate ?? study.createdAt) : (study.createdAt ?? null),
              // Cru nos dois idiomas (não já resolvido) — mesmo motivo de
              // `book` nas outras entradas: labelFor()/render leem o
              // idioma ATUAL da sessão, não o de quando a lista carregou.
              titlePt: study.title, titleEn: study.titleEn,
              icon: study.icon ?? 'GraduationCap',
              book: study.kind === 'inductive' ? study.book : null,
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
    // Anotação de sermão tem campos demais (preletor/igreja/passagens) pro
    // textarea genérico — abre o formulário rico lá em cima já preenchido,
    // em vez de expandir inline neste card (ver startEditSermon abaixo).
    if (note.type === 'sermon') { startEditSermon(note); return }
    setEditingKey(note.key)
    setEditText(note.text)
  }
  function cancelEdit() {
    setEditingKey(null)
    setEditText('')
  }

  function startCreateSermon() {
    setSermonEditing(null)
    setSermonPreacher('')
    setSermonChurch('')
    setSermonPassages([])
    setSermonText('')
    setSermonError('')
    setCreatingSermon(true)
  }

  function startEditSermon(note) {
    setSermonEditing(note)
    setSermonPreacher(note.preacher ?? '')
    setSermonChurch(note.church ?? '')
    setSermonPassages((note.passages ?? []).map(p => ({
      book: p.book ?? '', chapter: p.chapter ? String(p.chapter) : '',
      verseStart: p.verseStart ? String(p.verseStart) : '', verseEnd: p.verseEnd ? String(p.verseEnd) : '',
    })))
    setSermonText(note.text ?? '')
    setSermonError('')
    setCreatingSermon(true)
  }

  function cancelSermonForm() {
    setCreatingSermon(false)
    setSermonEditing(null)
    setSermonError('')
  }

  function addPassageRow() {
    setSermonPassages(prev => [...prev, blankPassage()])
  }
  function updatePassageRow(index, field, value) {
    setSermonPassages(prev => prev.map((p, i) => {
      if (i !== index) return p
      // Trocar de livro invalida o capítulo escolhido (contagem de
      // capítulos é outra) — mesmo espírito de qualquer seletor
      // dependente.
      return field === 'book' ? { ...p, book: value, chapter: '' } : { ...p, [field]: value }
    }))
  }
  function removePassageRow(index) {
    setSermonPassages(prev => prev.filter((_, i) => i !== index))
  }

  async function saveSermon() {
    if (!sermonText.trim() || sermonBusy) return
    setSermonBusy(true)
    setSermonError('')
    try {
      const cleanPassages = sermonPassages
        .filter(p => p.book && p.chapter)
        .map(p => ({
          book: p.book,
          chapter: Number(p.chapter),
          verseStart: p.verseStart ? Number(p.verseStart) : null,
          verseEnd: p.verseEnd ? Number(p.verseEnd) : null,
        }))
      const nowIso = new Date().toISOString()
      // Data/createdAt preservados ao editar (o dia do sermão é quando foi
      // OUVIDO, não quando a anotação foi editada por último).
      const finalNote = {
        id: sermonEditing?.id ?? `sermon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: sermonEditing?.date ?? dateKey(),
        createdAt: sermonEditing?.createdAt ?? nowIso,
        updatedAt: nowIso,
        preacher: sermonPreacher.trim(),
        church: sermonChurch.trim(),
        passages: cleanPassages,
        text: sermonText.trim(),
      }
      await saveSermonNote(authUser.email, finalNote)
      const entry = {
        key: finalNote.id, id: finalNote.id, text: finalNote.text, updatedAt: finalNote.updatedAt, createdAt: finalNote.createdAt,
        type: 'sermon', date: finalNote.date, preacher: finalNote.preacher, church: finalNote.church, passages: finalNote.passages,
      }
      setState(s => ({
        ...s,
        notes: [entry, ...s.notes.filter(n => n.key !== finalNote.id)]
          .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
      }))
      cancelSermonForm()
    } catch (err) {
      console.error('Failed to save sermon note', err)
      setSermonError(t('notes.sermonSaveError', undefined, lang))
    } finally {
      setSermonBusy(false)
    }
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
      // Apagou a que estava sendo editada no formulário de sermão — fecha
      // o formulário pra não deixar salvar uma anotação que não existe mais.
      if (sermonEditing?.key === note.key) cancelSermonForm()
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
      const notesForSearch = state.notes.map(n => ({ key: n.key, text: n.text }))
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
    ? state.notes.filter(n => activeFilter.types.includes(n.type))
    : state.notes
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
    ? aiMatchKeys.map(k => state.notes.find(n => n.key === k)).filter(Boolean)
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

  return (
    <div style={{ position: 'relative', height: '100%' }}>
    <div style={styles.screen}>
      <div style={styles.body}>
        <p style={styles.title}>{t('notes.pageTitle', undefined, lang)}</p>

        {/* Anotação de sermão — registro de um sermão ouvido na igreja
            (preletor, igreja, passagens bíblicas lidas, texto livre), à
            parte das anotações de leitura/reflexão (ver
            src/notes/sermonNotesStore.js). Redesign 1e: deixou de ser
            conteúdo fixo no topo da tela — agora é o FAB (ver fora deste
            bloco condicional) que abre o formulário numa folha inferior. */}
        {creatingSermon && createPortal(
          <div style={styles.sheetBackdrop} onClick={cancelSermonForm}>
            <div style={styles.sheetCard} onClick={e => e.stopPropagation()}>
              <div style={styles.sheetHandleWrap} onClick={cancelSermonForm}><div style={styles.sheetHandle} /></div>
              <div style={styles.sermonFormCard}>
            <p style={styles.sermonFormTitle}>
              {sermonEditing ? t('notes.sermonEditTitle', undefined, lang) : t('notes.sermonNewTitle', undefined, lang)}
            </p>

            <p style={styles.createLabel}>{t('notes.sermonPreacherLabel', undefined, lang)}</p>
            <input
              type="text" style={styles.sermonInput} value={sermonPreacher}
              onChange={e => setSermonPreacher(e.target.value)}
              placeholder={t('notes.sermonPreacherPlaceholder', undefined, lang)}
              maxLength={80}
            />

            <p style={{ ...styles.createLabel, marginTop: 10 }}>{t('notes.sermonChurchLabel', undefined, lang)}</p>
            <input
              type="text" style={styles.sermonInput} value={sermonChurch}
              onChange={e => setSermonChurch(e.target.value)}
              placeholder={t('notes.sermonChurchPlaceholder', undefined, lang)}
              maxLength={80}
            />

            <p style={{ ...styles.createLabel, marginTop: 10 }}>{t('notes.sermonPassagesLabel', undefined, lang)}</p>
            {sermonPassages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {sermonPassages.map((p, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={styles.passageRow}>
                      <select
                        style={styles.passageBookSelect} value={p.book}
                        onChange={e => updatePassageRow(i, 'book', e.target.value)}
                      >
                        <option value="">{t('notes.sermonPassageBookPlaceholder', undefined, lang)}</option>
                        {allBooksOrdered.map(b => <option key={b} value={b}>{bookLabel(b)}</option>)}
                      </select>
                      <select
                        style={styles.passageChapterSelect} value={p.chapter} disabled={!p.book}
                        onChange={e => updatePassageRow(i, 'chapter', e.target.value)}
                      >
                        <option value="">{t('notes.sermonPassageChapterPlaceholder', undefined, lang)}</option>
                        {Array.from({ length: bookChapterCounts[p.book] ?? 0 }, (_, idx) => idx + 1).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <input
                        type="number" min="1" inputMode="numeric" style={styles.passageVerseInput}
                        placeholder={t('notes.sermonVerseFrom', undefined, lang)} value={p.verseStart}
                        onChange={e => updatePassageRow(i, 'verseStart', e.target.value)}
                      />
                      <span style={styles.passageVerseSep}>–</span>
                      <input
                        type="number" min="1" inputMode="numeric" style={styles.passageVerseInput}
                        placeholder={t('notes.sermonVerseTo', undefined, lang)} value={p.verseEnd}
                        onChange={e => updatePassageRow(i, 'verseEnd', e.target.value)}
                      />
                      <button
                        style={styles.passageRemoveBtn} onClick={() => removePassageRow(i)}
                        aria-label={t('notes.sermonRemovePassage', undefined, lang)}
                      >
                        <AppIcon name="X" size={13} color="var(--bento-t3)" />
                      </button>
                    </div>
                    {/* Link "ir pro texto" já ativo assim que livro+capítulo
                        são escolhidos — não precisa salvar a anotação
                        primeiro (ver onOpenBiblePassage). A tela de Notas
                        fica montada mesmo trocando de aba (ver App.jsx/
                        notesVisitedRef), então o rascunho do formulário
                        continua aqui quando a pessoa usa "Voltar" pra
                        retornar. */}
                    {p.book && p.chapter && (
                      <button
                        style={{ ...styles.passageChip, alignSelf: 'flex-start' }}
                        onClick={() => onOpenBiblePassage?.(p.book, Number(p.chapter))}
                      >
                        <AppIcon name="BookOpen" size={11} color="var(--bento-accent)" /> {passageLabel(p)}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button style={styles.addPassageBtn} onClick={addPassageRow}>
              <AppIcon name="Plus" size={13} color="var(--bento-accent)" /> {t('notes.sermonAddPassage', undefined, lang)}
            </button>

            <p style={{ ...styles.createLabel, marginTop: 12 }}>{t('notes.sermonTextLabel', undefined, lang)}</p>
            <textarea
              style={styles.sermonTextarea} value={sermonText}
              onChange={e => setSermonText(e.target.value)}
              placeholder={t('notes.sermonTextPlaceholder', undefined, lang)}
              rows={5}
            />

            {sermonError && <p style={styles.aiErrorText}>{sermonError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                style={styles.editSaveBtn} onClick={saveSermon}
                disabled={sermonBusy || !sermonText.trim()}
              >
                {sermonBusy ? t('notes.saving', undefined, lang) : t('notes.sermonSaveBtn', undefined, lang)}
              </button>
              <button style={styles.editCancelBtn} onClick={cancelSermonForm} disabled={sermonBusy}>
                {t('notes.cancelEdit', undefined, lang)}
              </button>
            </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

        {/* Busca por palavra (instantânea, casa substring no texto) +
            busca por tema com IA (botão à parte — só dispara ao tocar, não
            a cada tecla) — pra quando a pessoa lembra do assunto mas não
            da palavra exata que escreveu. */}
        {state.status === 'ready' && state.notes.length > 0 && (
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
                  <AppIcon name="Sparkles" size={11} color="#A21CAF" /> {t('notes.searchAiBtn', undefined, lang)}
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
        {state.status === 'ready' && state.notes.length > 0 && aiMatchKeys === null && (
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
        {state.status === 'ready' && state.notes.length > 0 && aiMatchKeys === null && (
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
        {state.status === 'ready' && state.notes.length === 0 && (
          <p style={styles.emptyHint}>{t('notes.empty', undefined, lang)}</p>
        )}
        {state.status === 'ready' && state.notes.length > 0 && filteredNotes.length === 0 && (
          <p style={styles.emptyHint}>
            {aiMatchKeys !== null ? t('notes.searchAiEmpty', undefined, lang)
              : trimmedQuery ? t('notes.emptySearch', undefined, lang)
              : t('notes.emptyFiltered', undefined, lang)}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredNotes.map(note => {
            // Estudo — card à parte (ícone + título + progresso + seta),
            // sem editar/deletar por aqui (isso é papel de StudiesScreen).
            // Toque leva pra lá já aberto no estudo certo (ver onOpenStudy,
            // App.jsx).
            if (note.type === 'study') {
              const label = note.doneCount === 0
                ? t('notes.studyStart', undefined, lang)
                : note.doneCount === note.total
                  ? t('notes.studyReview', undefined, lang)
                  : t('notes.studyResume', { step: Math.min(note.doneCount + 1, note.total), total: note.total }, lang)
              return (
                <button key={note.key} style={styles.studyRow} onClick={() => onOpenStudy?.(note.id)}>
                  <span style={styles.studyRowIcon}>
                    <AppIcon name={note.icon} size={16} color="var(--bento-accent)" />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={styles.studyRowTitle}>{studyTitleFor(note)}</span>
                    <span style={styles.studyRowProgress}>{label}</span>
                  </span>
                  <span style={styles.studyRowChevron}>›</span>
                </button>
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
            const isEditing = editingKey === note.key
            const isBusy = busyKey === note.key
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
              // Sem ícones de editar/apagar (o quadro não tem): tocar no
              // cartão abre a edição inline, onde também dá pra apagar.
              <div
                key={note.key}
                style={{ ...styles.card, ...(isHighlight ? styles.cardHighlight : {}), cursor: isEditing ? 'default' : 'pointer' }}
                onClick={e => { if (isEditing || isBusy) return; if (e.target instanceof Element && e.target.closest('button, textarea, a, input')) return; startEdit(note) }}
              >
                <div style={styles.cardHeader}>
                  <span style={{ ...styles.cardTypeLabel, color: typeColor }}>{typeCapLabel(note)}</span>
                  <span style={{ ...styles.cardTime, ...(isHighlight ? { color: 'var(--bento-sand-label)' } : {}) }}>
                    {timeIso ? relativeLabel(timeIso) : ''}
                  </span>
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
                      <button style={styles.editDeleteBtn} onClick={() => deleteNote(note)} disabled={isBusy}>
                        {t('notes.deleteAction', undefined, lang)}
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
          })}
        </div>
      </div>
    </div>

      {/* FAB — só ação desta tela que "cria" algo (as demais nascem em
          contexto: leitura, Reflexão, Estudos). position:absolute (não
          fixed) relativo ao wrapper logo acima, não ao viewport — evita o
          bug de position:fixed dentro do zoom:1.15 de .app-content-inner
          (ver comentário em ReadingBlockView.jsx) sem precisar de portal. */}
      <button style={styles.fab} onClick={startCreateSermon} aria-label={t('notes.sermonNewBtn', undefined, lang)} title={t('notes.sermonNewBtn', undefined, lang)}>
        <AppIcon name="Plus" size={22} color="var(--bento-ink)" />
      </button>
    </div>
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

const styles = {
  screen:     { background: 'var(--bento-bg)', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  body:       { padding: '20px 20px calc(var(--nav-height) + 90px)', display: 'flex', flexDirection: 'column', gap: 12 },
  title:      { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: '0 0 2px' },
  searchRow:      { display: 'flex', gap: 8 },
  searchInputWrap:{ flex: 1, minWidth: 0, height: 46, display: 'flex', alignItems: 'center', gap: 10, border: 'none', borderRadius: 16, padding: '0 16px', background: 'var(--bento-card)' },
  searchInput:    { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', padding: '10px 0', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 500, lineHeight: 1, color: 'var(--bento-ink)' },
  searchAiBtn:    { flexShrink: 0, width: 40, border: 'none', borderRadius: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #C026D4 0%, #86198F 100%)', boxShadow: '0 6px 16px rgba(162,28,175,.3)' },
  aiActiveRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '-4px 2px 0' },
  aiActiveTag:    { display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: '#A21CAF' },
  aiClearBtn:     { border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t3)', padding: '2px 4px' },
  aiErrorText:    { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, color: 'var(--re, #DC2626)', margin: '-4px 2px 0' },
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
  colorSwatchBtn:      { width: 26, height: 26, borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', boxShadow: '0 0 0 1px var(--bento-line)' },
  colorSwatchBtnActive:{ border: '2px solid #fff', boxShadow: '0 0 0 2px var(--bento-ink)' },
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
    border: 'none', background: 'var(--bento-accent)', boxShadow: '0 10px 26px rgba(240,102,43,.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  sheetBackdrop: {
    position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(26,23,20,.45)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheetCard: {
    width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)',
    borderRadius: '22px 22px 0 0', maxHeight: '86vh', overflowY: 'auto',
    padding: '0 14px calc(20px + var(--safe-bottom))',
    animation: 'bookOpenIn .26s cubic-bezier(.32,.72,0,1)',
  },
  sheetHandleWrap: { display: 'flex', justifyContent: 'center', padding: '10px 0 6px', cursor: 'pointer' },
  sheetHandle: { width: 36, height: 4, borderRadius: 99, background: 'var(--bento-t5)' },
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
  sermonFormCard: { background: 'var(--bento-card)', borderRadius: 20, padding: 14 },
  sermonFormTitle:{ fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 10 },
  createLabel:    { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t3)', marginBottom: 6 },
  sermonInput:    { width: '100%', border: 'none', borderRadius: 11, padding: '10px 12px', fontSize: 12.5, fontFamily: 'var(--font-bento)', color: 'var(--bento-ink)', background: 'var(--bento-line)' },
  sermonTextarea: { width: '100%', border: 'none', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-ink)', resize: 'none', outline: 'none', lineHeight: 1.5, background: 'var(--bento-line)' },
  passageRow:     { display: 'flex', alignItems: 'center', gap: 5 },
  passageBookSelect:   { flex: '1.3 1 0', minWidth: 0, border: 'none', borderRadius: 9, padding: '8px 6px', fontSize: 11, fontFamily: 'var(--font-bento)', color: 'var(--bento-ink)', background: 'var(--bento-line)' },
  passageChapterSelect:{ flex: '0.8 1 0', minWidth: 0, border: 'none', borderRadius: 9, padding: '8px 4px', fontSize: 11, fontFamily: 'var(--font-bento)', color: 'var(--bento-ink)', background: 'var(--bento-line)' },
  passageVerseInput:   { flex: '0.7 1 0', minWidth: 0, border: 'none', borderRadius: 9, padding: '8px 4px', fontSize: 11, fontFamily: 'var(--font-bento)', color: 'var(--bento-ink)', background: 'var(--bento-line)' },
  passageVerseSep:     { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t4)', flexShrink: 0 },
  passageRemoveBtn:    { flexShrink: 0, width: 24, height: 24, border: 'none', background: 'var(--bento-line)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  addPassageBtn:  { display: 'flex', alignItems: 'center', gap: 5, border: '1px dashed var(--bento-pending-border)', background: 'none', borderRadius: 9, padding: '7px 10px', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-accent)', cursor: 'pointer' },
  sermonMeta:     { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)', marginBottom: 6 },
  passageChipRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  passageChip:    { display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'var(--bento-line)', borderRadius: 20, padding: '5px 10px', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-accent)', cursor: 'pointer' },
}
