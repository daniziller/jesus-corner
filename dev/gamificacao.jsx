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
//      Meu Plano (handoff-meu-plano-47): &plano=p1|p2|p1i|p3|p4|um|quatro
//      &livro=Jonas (G10/G8) &bloco=poeticos (G9 rolada até a prateleira)
//      &estado=exemplo|nova|inteira|carregando &modo=livros|capitulos
//      &familia=constancia|leitura|tempo|oracao|livros (G6)
//      &id=tempo:2|bloco:profetas-menores (G4) &novas=1 (pontos de "nova" em G5)
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import HomeScreen from '../src/screens/HomeScreen'
import SuaBibliaScreen from '../src/screens/SuaBibliaScreen'
import { PLANS } from '../src/data/bibleBlocks'
import { GAMIFICATION_BOOKS, bookInfo } from '../src/data/gamificationBlocks'
import { setWheelMode } from '../src/gamification/wheelModeStore'
import { dateKey } from '../src/utils/dateKey'
import ConquistasScreen from '../src/screens/ConquistasScreen'
import FamiliaScreen from '../src/screens/FamiliaScreen'
import NovaConquistaScreen from '../src/screens/NovaConquistaScreen'
import EstanteScreen from '../src/screens/EstanteScreen'
import SeloScreen from '../src/screens/SeloScreen'
import LivroCompletoScreen from '../src/screens/LivroCompletoScreen'
import MeuPlanoScreen from '../src/screens/MeuPlanoScreen'
import { evaluateGamification, loadGamificationStats, markAchievementsSeen } from '../src/gamification/evaluate'

const params = new URLSearchParams(location.search)
const tela = params.get('tela') ?? 'hoje'
const estado = params.get('estado') ?? 'exemplo'
if (params.get('modo')) setWheelMode(params.get('modo'))

function keysFor(estado) {
  const set = new Set()
  const add = (nome, ate) => { for (let c = 1; c <= ate; c++) set.add(`${nome}:${c}`) }
  if (estado === 'exemplo') { add('Gênesis', 41); add('Salmos', 5); add('Jonas', 4) }
  if (estado === 'inteira') for (const b of GAMIFICATION_BOOKS) add(b.nome, b.capitulos)
  return set
}

const completedSet = keysFor(estado)

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
    chapters.push({ livro, capitulo: Number(cap), origem: 'sessao', created_at: day(estado === 'inteira' ? Math.floor(i / 4) : 70 - i) })
    i++
  }
  for (let d = 70; d >= 2; d -= 2) sessions.push({ data: day(d).slice(0, 10), passo: 'reading', segundos: 900, created_at: day(d), livro: d >= 30 && d <= 36 ? 'Jonas' : 'Gênesis' })
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
  // Meu Plano (P1–P5): dias por passo e a entrada de HOJE conforme `plano`.
  const todayIdx = (new Date().getDay() + 6) % 7
  const all = [true, true, true, true, true, true, true]
  const semHoje = all.map((_, i) => i !== todayIdx)
  const planoState = params.get('plano') ?? 'p1'
  const stepDays = planoState === 'p4'
    ? { prayer: semHoje, reading: semHoje, study: [false, false, false, false, false, false, false], reflection: semHoje }
    : { prayer: all, reading: all, study: [false, false, false, false, false, false, false], reflection: all }
  const hoje = new Date(); hoje.setHours(6, 42, 0, 0)
  const atH = (h, m) => { const d = new Date(hoje); d.setHours(h, m, 0, 0); return d.toISOString() }
  const todayEntry = {
    p1: { prayer: true, prayerAt: atH(6, 42) },
    p1i: { prayer: true, prayerAt: atH(6, 42), readingProgress: { startedAt: atH(7, 0), elapsedSeconds: 372 } },
    p2: {},
    p3: { prayer: true, prayerAt: atH(6, 42), reading: true, readingAt: atH(7, 1), reflection: true, reflectionAt: atH(7, 8) },
    p4: {}, um: {}, quatro: {},
  }[planoState] ?? {}
  routine[dateKey(new Date())] = { ...(routine[dateKey(new Date())] ?? {}), ...todayEntry }
  localStorage.setItem('jc_guest_data', JSON.stringify({ completed_keys: [...completedSet], daily_routine: nova ? {} : routine, weekly_goal_history: nova ? [] : history, highlights, notes, step_days: stepDays }))
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
  routineModules: planoState === 'um' ? ['prayer'] : ['prayer', 'reading', 'reflection'], plan,
  todayRoutine: {}, dailyRoutine,
  lastReadPosition: { book: 'Gênesis', chapter: 41 },
  biblePercent: 4.2, activeStudyId: null,
  chaptersRead: completedSet.size, booksCompleted: 1,
  myGroups: [], hasNoPlan: false, hasPremium: true, weeklyGoalDays: 4, weeklyDays: [true, true, false, true, false, true, false],
  currentBlock: { book: 'Gênesis', chapter: 42, bookChapters: 50, bookPercent: 82 },
}
const authUser = { email: 'preview@example.com' }

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

function Preview() {
  const [screen, setScreen] = useState(tela)
  const [gami, setGami, gamiData] = useGamificationRow()
  const familia = params.get('familia') ?? 'constancia'
  const celebId = params.get('id') ?? 'tempo:2'
  const [forceLoading] = useState(estado === 'carregando')
  const common = { session, authUser, completedSet }
  let body
  const livro = params.get('livro') ?? 'Jonas'
  if (screen === 'meuPlano') {
    body = <MeuPlanoScreen {...common} stepMinutes={{ prayer: 10, reading: 15, study: 10, reflection: 5 }} onStartGuided={() => alert('abrir o passo de agora e emendar os seguintes')} onNavigate={t => alert(`navegar: ${t}`)} />
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
  } else {
    body = (
      <HomeScreen
        {...common} stepMinutes={{ prayer: 10, reading: 15, reflection: 8 }} weeklySummaries={[]}
        onNavigate={t => alert(`navegar: ${t}`)} onOpenProfile={() => {}} onSaveStepMinutes={() => {}}
        onOpenWeeklySummary={() => {}} onOpenBiblePassage={() => {}} onOpenSermonNote={() => {}}
        applicationRefreshKey={0}
        onOpenSuaBiblia={() => setScreen('suaBiblia')}
        key={forceLoading ? 'loading' : 'ready'}
      />
    )
  }
  return <div style={{ height: '100%' }}>{body}</div>
}

createRoot(document.getElementById('root')).render(<StrictMode><Preview /></StrictMode>)
