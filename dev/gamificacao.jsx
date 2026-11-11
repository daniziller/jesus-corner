// dev/gamificacao.jsx — pré-visualização das telas da gamificação SÓ em
// desenvolvimento (handoff-gamificacao-43-46, PROMPT-CODE "deixe um seletor
// de debug (só em desenvolvimento)"). Entrada à parte do Vite
// (dev/gamificacao.html → http://localhost:5173/dev/gamificacao.html);
// `vite build` só empacota index.html, então nada daqui vai pra produção.
//
// Renderiza as telas REAIS (HomeScreen, SuaBibliaScreen) com uma sessão
// de exemplo montada aqui — o app de verdade exige conta (decisão de
// 2026-09-07), e assim dá pra pôr cada tela e cada estado do HANDOFF §8
// ao lado do PNG sem login.
//
// Uso: ?tela=hoje|suaBiblia|conquistas|familia|novaConquista|estante|selo|livroCompleto|meuPlano
//      Meu Plano (handoff-meu-plano-47): &plano=p1|p2|p1i|p3|p4|um|quatro · tela=seuPlano · tela=ajustar&abrir=reading (Mudar meus dias)
//      Hoje (handoff-hoje-50): os mesmos &plano= valem pro cartão do plano (p1 no meio · p2 nada feito ·
//      p1i interrompido · p3 tudo feito · p4 descanso · um · quatro · p5 dia de estudo) + semplano · erro · carregando
//      Bíblia (handoff-biblia-52): tela=biblia — a aba de verdade (JourneyScreen), com os capítulos marcáveis na memória.
//      &estado=b1 (a conta da captura: Gênesis 40/50, Salmos 6/150, Jonas completo) | exemplo | nova | inteira | carregando
//      &livro=Gênesis (B2, o livro direto) &lidos=0|N (quantos capítulos dele estão lidos)
//      &cap=23 (B3, o capítulo direto na leitura livre) &marcar=1 (B4, ou o parabéns) &parabens=nao
//      &leitura=plano (a leitura pela sessão do plano, sem mudança nesta fase)
//      &busca= (B5, a busca ao abrir) &busca=jo 3 16 (B7) &busca=pastor (B6) &recentes=nao
//      &testamento=at|nt (a escolha lembrada) · &livre=4|sem|nao (leitura livre em Salmos 23: com versículo, sem, nenhuma)
//      · sessão de hoje: os mesmos &plano= (p2 tem sessão · p3 leitura feita · p4 descanso)
//      Passos do plano (handoff-passos-pedidos-53-54): tela=oracao — a oração ACTS (S1/S2), com os pedidos na memória.
//      &etapa=1|2|3|4 (Adoração, Confissão, Gratidão, Súplica) · &pedidos=3|0|7|erro|carregando (a lista da Súplica;
//      7 inclui amigo e anônimo) · &premium=nao (cartão de bloqueio) · &dia=estudo|um (quatro passos, ou só a oração)
//      · &feitos=prayer,reading (passos já feitos hoje) · &minutos=12 (duração da oração) · &metodo=livre (36c, sem mudança)
//      Para hoje: &aplicacao=ontem|cumprida|hoje|nenhuma · &resumo=novo|lido|nenhum · &parahoje=todas (as cinco linhas,
//      com o desafio do grupo) · barra de abas: &msgs=0|1|9|99|100 · &pendente=1 (bolinha de pedidos/convites)
//      &livro=Jonas (G10/G8) &bloco=poeticos (G9 rolada até a prateleira)
//      &estado=exemplo|nova|inteira|carregando &modo=livros|capitulos
//      &familia=constancia|leitura|tempo|oracao|livros (G6)
//      &id=tempo:2|bloco:profetas-menores (G4) &novas=1 (pontos de "nova" em G5)
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import HomeScreen from '../src/screens/HomeScreen'
import CartaoBiblia from '../src/components/hoje/CartaoBiblia'
import QuadradosCaminhada from '../src/components/hoje/QuadradosCaminhada'
import { computeBibleProgress } from '../src/gamification/bibleProgressMath'
import CartaoPlano from '../src/components/hoje/CartaoPlano'
import { buildPlanCard, paraHojeRows } from '../src/hoje/hojeMath'
import ParaHoje from '../src/components/hoje/ParaHoje'
import BottomNav from '../src/components/BottomNav'
import JourneyScreen from '../src/screens/JourneyScreen'
import BibliaRaiz from '../src/components/biblia/BibliaRaiz'
import { deriveProgress } from '../src/utils/progress'
import SuaBibliaScreen from '../src/screens/SuaBibliaScreen'
import { PLANS } from '../src/data/bibleBlocks'
import { GAMIFICATION_BOOKS, bookInfo } from '../src/data/gamificationBlocks'
import BookChapterScreen from '../src/screens/BookChapterScreen'
import BuscaScreen from '../src/screens/BuscaScreen'
import { getFreeReadingPosition } from '../src/bible/freeReadingPositionStore'
import { setWheelMode } from '../src/gamification/wheelModeStore'
import { dateKey } from '../src/utils/dateKey'
import ConquistasScreen from '../src/screens/ConquistasScreen'
import FamiliaScreen from '../src/screens/FamiliaScreen'
import NovaConquistaScreen from '../src/screens/NovaConquistaScreen'
import EstanteScreen from '../src/screens/EstanteScreen'
import SeloScreen from '../src/screens/SeloScreen'
import LivroCompletoScreen from '../src/screens/LivroCompletoScreen'
import MeuPlanoScreen from '../src/screens/MeuPlanoScreen'
import SeuPlanoScreen from '../src/screens/SeuPlanoScreen'
import AjustarPlanoScreen from '../src/screens/AjustarPlanoScreen'
import { evaluateGamification, loadGamificationStats, markAchievementsSeen } from '../src/gamification/evaluate'
import PrayerScreen from '../src/screens/PrayerScreen'
import { setPrayerMethod } from '../src/prayer/prayerMethodStore'
import { mergePedidos } from '../src/pedidos/pedidosMath'

const params = new URLSearchParams(location.search)
const tela = params.get('tela') ?? 'hoje'
const estado = params.get('estado') ?? 'exemplo'
if (params.get('modo')) setWheelMode(params.get('modo'))

function keysFor(estado) {
  const set = new Set()
  const add = (nome, ate) => { for (let c = 1; c <= ate; c++) set.add(`${nome}:${c}`) }
  if (estado === 'exemplo') { add('Gênesis', 41); add('Salmos', 5); add('Jonas', 4) }
  if (estado === 'b1') { add('Gênesis', 40); add('Salmos', 6); add('Jonas', 4) }
  if (estado === 'inteira') for (const b of GAMIFICATION_BOOKS) add(b.nome, b.capitulos)
  return set
}

const completedSet = keysFor(estado)
// B2 (o livro): &livro=Rute abre o livro direto; &lidos=3 força quantos
// capítulos dele estão lidos (0 = não começado, o total = completo).
if (tela === 'biblia' && params.get('livro') && params.get('lidos') != null) {
  const nome = params.get('livro')
  for (let c = 1; c <= bookInfo(nome).capitulos; c++) completedSet.delete(`${nome}:${c}`)
  for (let c = 1; c <= Math.min(Number(params.get('lidos')), bookInfo(nome).capitulos); c++) completedSet.add(`${nome}:${c}`)
}

// Linhas locais de convidado (guestTableStore.js lê daqui sem conta) com
// DATAS — é o que alimenta ritmo/projeção (G2) e, nas etapas seguintes,
// as datas das conquistas. Semeadas uma vez por estado.
function seedGuestTables(estado) {
  const day = n => new Date(Date.now() - n * 86400000).toISOString()
  const chapters = []
  const sessions = []
  let i = 0
  for (const key of completedSet) {
    const [livro, cap] = key.split(':')
    // estado=b1 é a conta dos quadros da aba Bíblia: Gênesis começado há
    // 23 dias, com os capítulos 39 e 40 marcados à mão (B2).
    const b1Genesis = estado === 'b1' && livro === 'Gênesis'
    chapters.push({
      livro, capitulo: Number(cap), origem: b1Genesis && Number(cap) >= 39 ? 'manual' : 'sessao',
      created_at: day(estado === 'inteira' ? Math.floor(i / 4) : b1Genesis ? Math.max(1, 23 - Math.floor(i / 2)) : 70 - i),
    })
    i++
  }
  // Conta nova: nenhum registro de atividade (nem sessão, nem capítulo).
  if (estado !== 'nova') for (let d = 70; d >= 2; d -= 2) sessions.push({ data: day(d).slice(0, 10), passo: 'reading', segundos: estado === 'b1' ? 600 : 900, created_at: day(d), livro: d >= 30 && d <= 36 ? 'Jonas' : 'Gênesis' })
  // B2: 6 h 10 de leitura em Gênesis (as sessões acima já somam parte).
  if (estado === 'b1') {
    const jaTem = sessions.filter(x => x.livro === 'Gênesis').reduce((t, x) => t + x.segundos, 0)
    sessions.push({ data: day(1).slice(0, 10), passo: 'reading', segundos: Math.max(0, 22200 - jaTem), created_at: day(1), livro: 'Gênesis' })
  }
  localStorage.setItem('jc_guest_table_chapters_read', JSON.stringify(chapters))
  localStorage.setItem('jc_guest_table_session_seconds', JSON.stringify(sessions))
  // 20 semanas de rotina: meta 4 dias (Seg/Ter/Qui/Sáb); 18 batem, 2 não.
  const routine = {}
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  for (let w = 20; w >= 1; w--) {
    const miss = w === 10 || w === 3
    for (const i of miss ? [0, 3] : [0, 1, 3, 5]) {
      const d = new Date(monday); d.setDate(d.getDate() - 7 * w + i)
      routine[dateKey(d)] = { reading: true, prayer: true }
    }
  }
  routine[dateKey(monday)] = { reading: true }
  const history = [{ desde: dateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7 * 20)), dias: 4 }]
  const nova = estado === 'nova'
  const highlights = nova ? [] : [{ id: 'hl-1', book: 'Jonas', bookEn: 'Jonah', chapter: 2, verses: [2], text: '', color: 'amarelo', createdAt: day(30), date: day(30).slice(0, 10) }]
  const notes = nova ? {} : { 'Jonas:1-2': { text: 'nota', updatedAt: day(33) }, 'Jonas:3-4': { text: 'nota', updatedAt: day(30) }, 'Jonas:4-4': { text: 'nota', updatedAt: day(30) } }
  // B3/B6: o versículo 4 do Salmo 23 marcado, com a nota do quadro da busca.
  if (estado === 'b1') highlights.push({ id: 'hl-sl-23', book: 'Salmos', bookEn: 'Psalms', chapter: 23, verses: [4], text: 'O pastor não tira o vale — anda comigo nele.', tags: ['Consolo'], color: 'yellow', createdAt: day(2), date: day(2).slice(0, 10) })
  // B2: 12 notas e marcações em Gênesis (5 notas + 7 marcações).
  if (estado === 'b1') {
    for (let n = 1; n <= 5; n++) notes[`Gênesis:${n}-${n}`] = { text: 'nota', updatedAt: day(20 - n) }
    for (let n = 1; n <= 7; n++) highlights.push({ id: `hl-gn-${n}`, book: 'Gênesis', bookEn: 'Genesis', chapter: n, verses: [1], text: '', color: 'amarelo', createdAt: day(20 - n), date: day(20 - n).slice(0, 10) })
  }
  // Sua aplicação (Para hoje): a frase fixada + a entrada do dia em que foi escrita.
  const aplicacao = params.get('aplicacao') ?? (nova ? 'nenhuma' : 'ontem')
  if (aplicacao !== 'nenhuma') {
    const frase = 'Hoje eu espero sem cobrar resposta.'
    const quando = dateKey(new Date(Date.now() - (aplicacao === 'hoje' ? 0 : 86400000)))
    notes['application:pinned'] = { text: frase, updatedAt: day(1) }
    notes[`application:${quando}`] = { text: frase, updatedAt: day(1), fulfilled: aplicacao === 'cumprida' }
  }
  // Meu Plano (P1–P5): dias por passo e a entrada de HOJE conforme `plano`.
  const todayIdx = (new Date().getDay() + 6) % 7
  const all = [true, true, true, true, true, true, true]
  const semHoje = all.map((_, i) => i !== todayIdx)
  const planoState = params.get('plano') ?? 'p1'
  const soHoje = all.map((_, i) => i === todayIdx)
  const nenhumDia = [false, false, false, false, false, false, false]
  const stepDays = planoState === 'semplano'
    ? { prayer: nenhumDia, reading: nenhumDia, study: nenhumDia, reflection: nenhumDia }
    : planoState === 'p4'
    ? { prayer: semHoje, reading: semHoje, study: [false, false, false, false, false, false, false], reflection: semHoje }
    : planoState === 'p5'
      ? { prayer: all, reading: semHoje, study: soHoje.map((v, i) => v || i === (todayIdx + 2) % 7 || i === (todayIdx + 4) % 7), reflection: all }
      : planoState === 'quatro'
        ? { prayer: all, reading: all, study: soHoje, reflection: all }
        : { prayer: all, reading: all, study: [false, false, false, false, false, false, false], reflection: all }
  // Estudo ativo de exemplo (formato novo, 7 dias, dia 1 feito) pra p5/quatro.
  const estudo = {
    id: 'est-ansiedade', title: 'Ansiedade', createdAt: day(10),
    sessions: [[4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4]].map(([a, b], i) => ({ id: i + 1, book: 'Filipenses', chStart: a, chEnd: b, passage: `Filipenses 4:${4 + i}-${6 + i}`, completedAt: i === 0 ? day(2) : undefined })),
  }
  const comEstudo = planoState === 'p5' || planoState === 'quatro'
  const hoje = new Date(); hoje.setHours(6, 42, 0, 0)
  const atH = (h, m) => { const d = new Date(hoje); d.setHours(h, m, 0, 0); return d.toISOString() }
  const todayEntry = {
    p1: { prayer: true, prayerAt: atH(6, 42) },
    p1i: { prayer: true, prayerAt: atH(6, 42), readingProgress: { startedAt: atH(7, 0), elapsedSeconds: 372 } },
    p2: {},
    p3: { prayer: true, prayerAt: atH(6, 42), reading: true, readingAt: atH(7, 1), reflection: true, reflectionAt: atH(7, 8) },
    p4: {}, um: {}, quatro: {}, p5: { prayer: true, prayerAt: atH(6, 40) },
  }[planoState] ?? {}
  routine[dateKey(new Date())] = { ...(routine[dateKey(new Date())] ?? {}), ...todayEntry }
  localStorage.setItem('jc_guest_data', JSON.stringify({ completed_keys: [...completedSet], daily_routine: nova ? {} : routine, weekly_goal_history: nova ? [] : history, highlights, notes, step_days: stepDays, ai_studies: comEstudo ? [estudo] : [], active_study: comEstudo ? { studyId: estudo.id } : null }))
  return nova ? {} : routine
}
const dailyRoutine = seedGuestTables(estado)
const planoState = params.get('plano') ?? 'p1'
const plan = PLANS.find(p => p.id === 'standard')
const todaySession = estado === 'inteira'
  ? { book: 'Apocalipse', chStart: 22, chEnd: 22, type: 'reading', needsThemePick: false, title: 'Apocalipse 22', id: 1 }
  : { book: 'Gênesis', chStart: 42, chEnd: 42, type: 'reading', needsThemePick: false, title: 'Gênesis 42', id: 1 }

const session = {
  lang: 'pt', userName: 'Diego', avatarInitials: 'DZ', todaySession,
  routineModules: planoState === 'um' ? ['prayer'] : ['prayer', 'reading', 'study', 'reflection'], plan,
  todayRoutine: {}, dailyRoutine,
  lastReadPosition: { book: 'Gênesis', chapter: 41 },
  biblePercent: 4.2, activeStudyId: (planoState === 'p5' || planoState === 'quatro') ? 'est-ansiedade' : null,
  chaptersRead: completedSet.size,
  myGroups: [], hasNoPlan: false, hasPremium: true, weeklyGoalDays: 4, weeklyDays: [true, true, false, true, false, true, false],
  currentBlock: { name: 'Pentateuco', book: 'Gênesis', chapter: estado === 'b1' ? 41 : 42, bookChapters: 50, bookPercent: 82 },
}
const authUser = { email: 'preview@example.com' }
// Resumo da semana (Para hoje): pronto e não lido, já lido, ou nenhum.
const resumo = params.get('resumo') ?? 'nenhum'
const weeklySummaries = resumo === 'nenhum' ? [] : [{ weekKey: '2026-08-25', startKey: '2026-08-25', endKey: '2026-08-31', seen: resumo === 'lido' }]

// Conquistas: a migração silenciosa roda uma vez sobre os dados semeados
// (guest row) e devolve a linha; com `novas=1`, duas ficam como não vistas
// pra mostrar o ponto laranja de G5.
function useGamificationRow() {
  const [row, setRow] = useState(null)
  const [data, setData] = useState(null)
  useState(() => {
    localStorage.removeItem('jc_guest_gami_done')
    evaluateGamification({ completedSet, dailyRoutine, weeklyGoalDays: 4, silent: true }).then(async res => {
      let r = res.row
      if (params.get('novas') === '1') {
        const raw = JSON.parse(localStorage.getItem('jc_guest_data'))
        for (const id of ['leitura:2', 'constancia:3']) if (raw.achievements[id]) raw.achievements[id].seen = false
        localStorage.setItem('jc_guest_data', JSON.stringify(raw))
        r = { ...r, achievements: raw.achievements }
      }
      setRow(r)
      setData(await loadGamificationStats({ completedSet, dailyRoutine, weeklyGoalDays: 4 }))
    })
  })
  return [row, setRow, data]
}

// A aba Bíblia de verdade (handoff-biblia-52): JourneyScreen com os mesmos
// dados de navegação que o App monta (deriveProgress) e os capítulos
// marcáveis na memória, pra dar pra abrir livro, ler e marcar.
if (tela === 'biblia') {
  const livre = params.get('livre') ?? '4'
  if (livre === 'nao') localStorage.removeItem('jc_free_reading_position')
  else localStorage.setItem('jc_free_reading_position', JSON.stringify({ book: 'Salmos', bookEn: 'Psalms', chapter: 23, verse: livre === 'sem' ? null : Number(livre), readAt: new Date(Date.now() - 2 * 86400000).toISOString() }))
  if (params.get('testamento')) localStorage.setItem('jc_bible_testament', params.get('testamento'))
  else localStorage.removeItem('jc_bible_testament')
  // Busca (B5): as três buscas recentes do quadro; &recentes=nao começa sem nenhuma.
  if (params.get('recentes') === 'nao') localStorage.removeItem('jc_bible_recent_searches')
  else localStorage.setItem('jc_bible_recent_searches', JSON.stringify([{ text: 'pastor', sub: '14 versículos' }, { text: 'Romanos 8', sub: 'Capítulo' }, { text: 'ansiedade', sub: 'Tema · 21 trechos' }]))
}
function BibliaPreview({ onPastRootChange }) {
  const [done, setDone] = useState(completedSet)
  const { blocks, sessionsByBlock } = deriveProgress(done, 'standard')
  const { sessionsByBlock: browseSessionsByBlock } = deriveProgress(done, 'free')
  const mark = (book, chapters, on) => setDone(prev => {
    const next = new Set(prev)
    for (const ch of chapters) { if (on) next.add(`${book}:${ch}`); else next.delete(`${book}:${ch}`) }
    return next
  })
  if (estado === 'carregando') {
    // Os dias do plano chegam na hora no preview — o esqueleto do cartão preto é montado aqui.
    return <BibliaRaiz lang="pt" completedSet={done} versionId="pt-nvt" sessionTitle={undefined} free={null} currentBook="Gênesis" />
  }
  // B5–B7 direto: &busca= (vazio = ao abrir) ou &busca=jo 3 16 — a tela da
  // busca de verdade; &plano=semplano tira a sessão de hoje, &livre=nao a
  // leitura livre e &recentes=nao as buscas recentes.
  if (params.has('busca')) {
    const freePos = getFreeReadingPosition()
    return (
      <BuscaScreen
        session={session} authUser={authUser} initialQuery={params.get('busca')} completedSet={done}
        sessionTitle={planoState === 'semplano' ? null : `${session.currentBlock.book} ${session.currentBlock.chapter}`} free={freePos}
        onBack={() => alert('voltar à raiz da Bíblia')}
        onOpenChapter={(book, chapter, verse, extra) => alert(`abrir ${book} ${chapter}${verse ? ` no versículo ${verse}` : ''}${extra?.noteId ? ' com a nota aberta' : ''}`)}
        onOpenTheme={id => alert(`abrir o tema ${id}`)}
        onOpenBook={nome => alert(`abrir o livro ${nome}`)}
        onReadSession={() => alert('ler a sessão de hoje (conta no plano)')}
        onOpenFree={() => alert('continuar a leitura livre')}
      />
    )
  }
  const livro = params.get('livro')
  // B3/B4: &cap=23 abre o capítulo direto na leitura livre; &marcar=1 toca
  // "Marcar como lido" sozinho (o cartão B4, ou o parabéns quando for o
  // caso); &parabens=nao simula a avaliação que não achou parabéns nenhum.
  const cap = Number(params.get('cap')) || null
  const celebrarAgora = () => {
    if (params.get('parabens') === 'nao') return Promise.resolve(false)
    alert('parabéns na hora (G8 ou G4)')
    return Promise.resolve(true)
  }
  useEffect(() => {
    if (!cap || params.get('marcar') !== '1') return undefined
    const timer = setTimeout(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Marcar como lido')?.click(), 900)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (livro) {
    // B2 direto: a tela do livro de verdade, sem passar pela raiz.
    const block = blocks.find(x => x.books.includes(livro))
    return (
      <BookChapterScreen
        session={session} authUser={authUser} block={block} bookName={livro} displayName={livro}
        browseSessionsByBlock={browseSessionsByBlock} completedSet={done}
        onToggleSession={() => {}} onToggleChapter={(sn, chapter, on) => mark(sn.book, [chapter], on)}
        onMarkChaptersManually={(book, chapters, on) => mark(book, chapters, on)} onOpenSelo={nome => alert(`abrir o selo de ${nome}`)}
        onNavigate={t => alert(`navegar: ${t}`)} onBack={() => alert('voltar à raiz da Bíblia')}
        onCelebrateNow={celebrarAgora}
        initialSessionId={cap ? (browseSessionsByBlock[block.id] ?? []).find(x => x.book === livro && x.chStart <= cap && cap <= x.chEnd)?.id : undefined}
        initialTextOpen={!!cap}
      />
    )
  }
  // &leitura=plano: a leitura pela sessão do plano (a sessão em andamento do
  // primeiro bloco) — pra conferir que ela não muda quando a leitura livre muda.
  const planReading = params.get('leitura') === 'plano'
  const planSession = planReading ? (sessionsByBlock[blocks[0].id].find(x => x.status === 'current') ?? sessionsByBlock[blocks[0].id].find(x => x.status !== 'done')) : null
  return (
    <JourneyScreen
      session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} browseSessionsByBlock={browseSessionsByBlock}
      completedSet={done} entryMode={planReading ? 'reading' : 'overview'} initialBlockId={planReading ? blocks[0].id : undefined} resumeSessionId={planSession?.id}
      onGoToReflectionFrom={() => alert('ir pra reflexão')} onExitReading={() => alert('sair da leitura')}
      onToggleSession={() => {}} onToggleChapter={(sn, chapter, on) => mark(sn.book, [chapter], on)}
      onMarkChaptersManually={(book, chapters, on) => mark(book, chapters, on)} onOpenSelo={nome => alert(`abrir o selo de ${nome}`)}
      onNavigate={t => alert(`navegar: ${t}`)} onContinueSession={() => alert('ler a sessão de hoje (conta no plano)')}
      onOpenSuaBiblia={() => alert('abrir Sua Bíblia')} onPastRootChange={onPastRootChange} onCelebrateNow={celebrarAgora}
    />
  )
}

// Oração ACTS (S1/S2): a tela de verdade, com os pedidos na memória — os
// da captura S2 e, com &pedidos=7, mais quatro (um de amigo, um anônimo).
if (tela === 'oracao') setPrayerMethod(params.get('metodo') === 'livre' ? 'free' : 'acts')
function pedidosDeExemplo() {
  const ha = dias => new Date(Date.now() - dias * 86400000).toISOString()
  const meu = (id, body, dias, extra = {}) => ({ id, body, scope: 'only_me', groupId: null, groupName: '', isMine: true, status: 'open', resposta: null, notaResposta: null, createdAt: ha(dias), respondidoEm: null, prayCount: 0, diasOrados: 0, prayedToday: false, prayedEver: false, commentCount: 0, ...extra })
  const tres = [
    meu('p1', 'Sabedoria para decidir sobre a mudança de cidade', 24, { diasOrados: 9, prayedToday: true, prayedEver: true }),
    { ...meu('p2', 'A cirurgia da mãe da Marina, na quinta', 2), scope: 'group', groupId: 'g1', groupName: 'Grupo Semente', isMine: false, prayCount: 5 },
    meu('p3', 'Meu pai voltar a falar com meu irmão', 92),
  ]
  const mais = [
    { ...meu('p4', 'Emprego para o Lucas, que está há oito meses procurando', 5), scope: 'group', groupId: 'g2', groupName: 'Batista Central', isMine: false, prayCount: 1 },
    meu('p5', 'Paciência com as crianças nas manhãs', 11),
  ]
  const amigos = [
    { id: 'p6', authorName: 'Marina Alves', body: 'Prova de residência no sábado', anonymous: false, scope: 'friends', createdAt: ha(1), prayCount: 0, prayingByMe: false, prayedEver: false, isMine: false, status: 'open' },
    { id: 'p7', authorName: null, body: 'Um diagnóstico que ainda não contei a ninguém', anonymous: true, scope: 'friends', createdAt: ha(3), prayCount: 12, prayingByMe: false, prayedEver: false, isMine: false, status: 'open' },
  ]
  const qual = params.get('pedidos') ?? '3'
  const mine = qual === '0' ? [] : qual === '7' ? [...tres, ...mais] : tres
  return mergePedidos({ mine, feed: qual === '7' ? amigos : [], intentions: null, todayKey: dateKey() })
}
const pedidosDePreview = {
  load: () => {
    const qual = params.get('pedidos')
    if (qual === 'carregando') return new Promise(() => {})
    if (qual === 'erro') return Promise.reject(new Error('sem rede (pré-visualização)'))
    return new Promise(resolve => setTimeout(() => resolve(pedidosDeExemplo()), 150))
  },
  orar: p => { console.log('[preview] orei:', p.id, p.isMine ? '(meu: só a data)' : '(de outra pessoa: conta em "Oração pelos outros")'); return Promise.resolve() },
  desfazer: p => { console.log('[preview] desfiz o orei:', p.id); return Promise.resolve() },
}
function OracaoPreview() {
  const dia = params.get('dia')
  const steps = dia === 'um' ? ['prayer'] : dia === 'estudo' ? ['prayer', 'reading', 'study', 'reflection'] : ['prayer', 'reading', 'reflection']
  const feitos = Object.fromEntries((params.get('feitos') ?? '').split(',').filter(Boolean).map(k => [k, true]))
  const minutos = Number(params.get('minutos')) || 10
  const s = { ...session, hasPremium: params.get('premium') !== 'nao', todaysSteps: steps, todayRoutine: feitos }
  return (
    <PrayerScreen
      session={s} authUser={authUser} stepMinutes={{ prayer: minutos, reading: 15, study: 15, reflection: 5 }}
      initialStage={Math.min(4, Math.max(1, Number(params.get('etapa')) || 1)) - 1} pedidosApi={pedidosDePreview}
      onPrayerCompleted={() => alert('oração terminada → bênção (36f)')} onNavigate={t => alert(`navegar: ${t}`)}
      onExitGuided={() => {}} onBack={() => alert('voltar')}
    />
  )
}

function Preview() {
  const [screen, setScreen] = useState(tela)
  const [bibliaPastRoot, setBibliaPastRoot] = useState(!!params.get('livro') || params.has('busca'))
  const [gami, setGami, gamiData] = useGamificationRow()
  const familia = params.get('familia') ?? 'constancia'
  const celebId = params.get('id') ?? 'tempo:2'
  const common = { session, authUser, completedSet }
  let body
  const livro = params.get('livro') ?? 'Jonas'
  const [draftState, setDraftState] = useState(null)
  if (screen === 'oracao') {
    body = <OracaoPreview />
  } else if (screen === 'ajustar') {
    body = <AjustarPlanoScreen {...common} stepMinutes={{ prayer: 10, reading: 15, study: 10, reflection: 5 }} draftState={draftState} onDraftChange={setDraftState} onClearDraft={() => setDraftState(null)} onSave={async () => { await new Promise(r => setTimeout(r, 800)) }} onBack={() => setScreen('meuPlano')} onNavigate={t => alert(`navegar: ${t}`)} initialOpenStep={params.get('abrir')} scrollToDays={!!params.get('abrir')} />
  } else if (screen === 'seuPlano') {
    body = <SeuPlanoScreen {...common} stepMinutes={{ prayer: 10, reading: 15, study: 10, reflection: 5 }} onBack={() => setScreen('meuPlano')} onNavigate={t => alert(`navegar: ${t}`)} onChangeDays={() => alert('Ajustar com a Leitura aberta')} />
  } else if (screen === 'meuPlano') {
    body = <MeuPlanoScreen {...common} stepMinutes={{ prayer: 10, reading: 15, study: 10, reflection: 5 }} onStartGuided={() => alert('abrir o passo de agora e emendar os seguintes')} onNavigate={t => alert(`navegar: ${t}`)} onEndStudy={() => alert('encerrar o estudo e devolver a leitura')} />
  } else if (screen === 'estante') {
    body = <EstanteScreen {...common} gamification={gami} scrollToBlock={params.get('bloco')} onBack={() => setScreen('hoje')} onOpenSelo={n => alert(`selo ${n}`)} onOpenBook={n => alert(`abrir ${n}`)} onOpenBookAt={(n, c) => alert(`abrir ${n} ${c}`)} />
  } else if (screen === 'selo') {
    body = gami ? <SeloScreen {...common} nome={livro} gamification={gami} onBack={() => setScreen('estante')} onReadAgain={n => alert(`ler ${n} de novo`)} onOpenNotes={() => alert('notas')} /> : null
  } else if (screen === 'livroCompleto') {
    body = gamiData && gami ? <LivroCompletoScreen nome={livro} data={{ ...gamiData, row: gami, newIds: [] }} onVerEstante={() => setScreen('estante')} onContinuar={() => setScreen('hoje')} /> : null
  } else if (screen === 'conquistas') {
    body = <ConquistasScreen {...common} gamification={gami} onBack={() => setScreen('hoje')} onOpenFamilia={id => alert(`família ${id}`)} onSeen={ids => markAchievementsSeen(ids).then(setGami)} />
  } else if (screen === 'familia') {
    body = <FamiliaScreen {...common} familyId={familia} gamification={gami} onBack={() => setScreen('conquistas')} />
  } else if (screen === 'novaConquista') {
    body = gamiData ? <NovaConquistaScreen celebration={{ kind: celebId.startsWith('bloco:') ? 'bloco' : 'degrau', id: celebId }} data={gamiData} userName="Diego" onContinue={() => setScreen('hoje')} onOpenConquistas={() => setScreen('conquistas')} /> : null
  } else if (screen === 'suaBiblia') {
    body = <SuaBibliaScreen {...common} onBack={() => setScreen('hoje')} onOpenBook={nome => alert(`abrir ${nome} na Bíblia`)} />
  } else if (params.get('parahoje') === 'todas') {
    // As cinco linhas de "Para hoje" juntas (o desafio do grupo depende de
    // um grupo de verdade, então a lista é montada aqui com paraHojeRows).
    const rows = paraHojeRows({
      challenge: { title: 'Romanos em 16 dias', ref: 'Romanos 8', dayTitle: 'Nenhuma condenação', done: false },
      summary: { seen: false, period: '25 a 31 de agosto' },
      verse: { text: 'O Senhor estava com José e lhe mostrou sua fiel bondade.', bookPt: 'Gênesis', chapter: 39, verseNum: 21 },
      application: { text: 'Hoje eu espero sem cobrar resposta — ligo para o meu irmão e não falo do processo.', fulfilled: false, writtenToday: false, visible: true },
    })
    body = (
      <div style={{ background: 'var(--bento-bg)', height: '100%', padding: '14px 20px', boxSizing: 'border-box' }}>
        <ParaHoje rows={rows} onOpen={k => alert(`abrir: ${k}`)} onAction={k => alert(`marcar: ${k}`)} />
      </div>
    )
  } else if (planoState === 'erro' || planoState === 'carregando') {
    // Cartão do plano sem os dias do plano: ainda carregando, ou a busca
    // falhou (os dados locais do preview nunca falham, então monta aqui).
    const card = buildPlanCard({ loadError: planoState === 'erro', stepDays: null, routineModules: session.routineModules, state: null, ctx: {}, nextWeekdayIdx: null })
    body = (
      <div style={{ background: 'var(--bento-bg)', height: '100%', padding: '14px 20px', boxSizing: 'border-box' }}>
        <CartaoPlano card={card} onAction={a => alert(`ação: ${a}`)} />
      </div>
    )
  } else if (estado === 'carregando') {
    // Hoje carregando (handoff-hoje-50 §8): os dados locais do preview
    // chegam na hora, então o esqueleto da caminhada é montado aqui com os
    // mesmos componentes e nada carregado ainda.
    const progress = computeBibleProgress(completedSet)
    const reads = Object.fromEntries(Object.entries(progress.porLivro).map(([nome, p]) => [nome, p.lidos]))
    body = (
      <div style={{ background: 'var(--bento-bg)', height: '100%', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10, boxSizing: 'border-box' }}>
        <CartaoBiblia progress={progress} reads={reads} currentBook="Gênesis" finishedIso={null} />
        <QuadradosCaminhada
          dailyRoutine={dailyRoutine} goalHistory={null} weeklyGoalDays={4} weeklyDays={session.weeklyDays} firstActivityKey={null}
          livrosCompletos={progress.livrosCompletos} totalLivros={progress.totalLivros} sealNames={null}
        />
      </div>
    )
  } else {
    body = (
      <HomeScreen
        {...common} stepMinutes={{ prayer: 10, reading: 15, reflection: 8 }} weeklySummaries={weeklySummaries}
        onNavigate={t => alert(`navegar: ${t}`)} onOpenProfile={() => {}}
        onStartGuided={() => alert('abrir o passo de agora e emendar os seguintes')}
        onOpenWeeklySummary={k => alert(`resumo ${k}`)} onOpenBiblePassage={(b, c) => alert(`abrir ${b} ${c}`)} onOpenSermonNote={() => alert('anotar pregação')}
        applicationRefreshKey={0}
        onOpenSuaBiblia={() => setScreen('suaBiblia')} onOpenEstante={() => setScreen('estante')}
        onOpenFamilia={id => alert(`família ${id}`)}
        gamification={gami}
      />
    )
  }
  // A aba Bíblia com a barra de abas de verdade — que some fora da raiz
  // (livro, leitura, busca), como no App.
  if (screen === 'biblia') {
    return (
      <div style={{ height: '100%' }}>
        <BibliaPreview onPastRootChange={setBibliaPastRoot} />
        {!bibliaPastRoot && params.get('leitura') !== 'plano' && <BottomNav activeTab="journey" onNavigate={t => alert(`aba: ${t}`)} lang="pt" />}
      </div>
    )
  }
  const nav = screen === 'hoje' && params.get('msgs') != null
    ? <BottomNav activeTab="home" onNavigate={t => alert(`aba: ${t}`)} groupsUnread={Number(params.get('msgs'))} groupsHasPending={params.get('pendente') === '1'} lang="pt" />
    : null
  return <div style={{ height: '100%' }}>{body}{nav}</div>
}

createRoot(document.getElementById('root')).render(<StrictMode><Preview /></StrictMode>)
