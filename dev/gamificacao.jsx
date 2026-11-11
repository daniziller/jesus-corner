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
// Uso: ?tela=hoje|suaBiblia|conquistas|familia|novaConquista
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
  for (let d = 70; d >= 0; d -= 2) sessions.push({ data: day(d).slice(0, 10), passo: 'reading', segundos: 900, created_at: day(d) })
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
  localStorage.setItem('jc_guest_data', JSON.stringify({ completed_keys: [...completedSet], daily_routine: nova ? {} : routine, weekly_goal_history: nova ? [] : history }))
  return nova ? {} : routine
}
const dailyRoutine = seedGuestTables(estado)
const plan = PLANS.find(p => p.id === 'standard')
const todaySession = estado === 'inteira'
  ? { book: 'Apocalipse', chStart: 22, chEnd: 22, type: 'reading', needsThemePick: false, title: 'Apocalipse 22', id: 1 }
  : { book: 'Gênesis', chStart: 42, chEnd: 42, type: 'reading', needsThemePick: false, title: 'Gênesis 42', id: 1 }

const session = {
  lang: 'pt', userName: 'Diego', avatarInitials: 'DZ', todaySession,
  routineModules: ['prayer', 'reading', 'reflection'], plan,
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
  if (screen === 'conquistas') {
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
