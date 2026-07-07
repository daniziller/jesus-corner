import { useState, useMemo, useEffect } from 'react'
import AppHeader from './components/AppHeader'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
import AuthScreen from './screens/AuthScreen'
import LanguageSelectScreen from './screens/LanguageSelectScreen'
import HomeScreen from './screens/HomeScreen'
import PrayerScreen from './screens/PrayerScreen'
import JourneyScreen from './screens/JourneyScreen'
import StudiesScreen from './screens/StudiesScreen'
import ProgressScreen from './screens/ProgressScreen'
import ProfileScreen from './screens/ProfileScreen'
import { getCurrentUser, logout, updateLanguage } from './auth/authStore'
import { getCompletedSet, markKeysDone, markKeysUndone, resetProgress } from './progress/progressStore'
import { deriveProgress, pickActiveBlock, computeOverallStats, computeGamificationStats, computeTotalSessions, sessionKeys } from './utils/progress'
import { levelFor, levelProgress } from './utils/levels'
import { computeUnlockedAchievements } from './utils/achievements'
import { getPrayerStats } from './prayer/prayerStatsStore'
import { recordAccess } from './streak/streakStore'
import { getSelectedPlanId, setSelectedPlanId } from './plan/planStore'
import { PLANS } from './data/bibleBlocks'
import { getAppLanguage } from './i18n/appLanguageStore'

function avatarInitialsOf(name) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function defaultBlockIdFor(completedSet, planId) {
  return pickActiveBlock(deriveProgress(completedSet, planId).blocks).id
}

// Capítulo mais recentemente marcado como lido (Sets em JS preservam a ordem
// de inserção — markKeysDone só usa .add(), que não reordena uma chave já
// existente — então o último item ao iterar o Set é o último capítulo
// marcado pela primeira vez, não importa a ordem "sugerida" dos livros).
function lastCompletedKey(completedSet) {
  let last = null
  for (const key of completedSet) last = key
  return last
}

// Sessão (e respectivo bloco) "onde o usuário parou": a que contém o último
// capítulo marcado como lido, seguindo a ordem real de leitura do usuário, e
// não a ordem sugerida dos blocos/livros. Se essa sessão já foi concluída por
// completo, avança pra próxima sessão (do mesmo bloco, ou a primeira do
// próximo bloco) e a exibe como "Iniciar sessão".
function findCurrentReadingSession(blocks, sessionsByBlock, completedSet) {
  const lastKey = lastCompletedKey(completedSet)
  if (lastKey) {
    for (const block of blocks) {
      const sessions = sessionsByBlock[block.id]
      const idx = sessions.findIndex(s => sessionKeys(s).includes(lastKey))
      if (idx === -1) continue

      const session = sessions[idx]
      if (session.status !== 'done') return { session, block }

      const nextInBlock = sessions[idx + 1]
      if (nextInBlock) return { session: nextInBlock, block }

      const nextBlock = blocks.find(b => b.id === block.id + 1)
      if (nextBlock) return { session: sessionsByBlock[nextBlock.id][0], block: nextBlock }

      return { session, block } // Bíblia inteira concluída — não há próxima sessão.
    }
  }

  // Nada foi lido ainda: cai no fallback de sempre (primeira sessão pendente do bloco ativo).
  const activeBlock = pickActiveBlock(blocks)
  const activeSessions = sessionsByBlock[activeBlock.id]
  const session = activeSessions.find(s => s.status === 'current') ?? activeSessions[0]
  return { session, block: activeBlock }
}

// ─────────────────────────────────────────
// Monta o estado de "sessão do app" (em produção: substituir por Context
// API ou Zustand) a partir do usuário logado + progresso já derivado.
// A ideia central é "1 sessão = 1 dia": o plano (Leve/Padrão/Intensivo)
// muda o TAMANHO das sessões, então "dias restantes" é só a contagem de
// sessões que faltam no plano atual.
// ─────────────────────────────────────────
function buildSession(authUser, blocks, sessionsByBlock, streak, planId, completedSet, prayerStats) {
  const lang = authUser.language ?? 'pt'
  // Sessão (e bloco) onde o usuário realmente parou — baseado no último
  // capítulo marcado como lido, não na ordem sugerida dos livros/blocos.
  const { session: currentSession, block: activeBlock } = findCurrentReadingSession(blocks, sessionsByBlock, completedSet)
  const overall = computeOverallStats(blocks)
  const planRaw = PLANS.find(p => p.id === planId) ?? PLANS.find(p => p.id === 'standard')
  const plan = { ...planRaw, label: lang === 'en' ? planRaw.labelEn : planRaw.label }
  const daysLeft = computeTotalSessions(blocks) - overall.sessionsDone

  // Progresso real (capítulo a capítulo) da sessão do dia — permite mostrar
  // "Iniciar sessão" (0%), "Continuar sessão" (entre 0 e 100%) ou "Revisar
  // sessão" (100%, já lida por completo) na Home.
  const csKeys = sessionKeys(currentSession)
  const csDoneCount = csKeys.filter(k => completedSet.has(k)).length
  const sessionProgress = csKeys.length ? Math.round((csDoneCount / csKeys.length) * 100) : 0
  const chapterSpan = currentSession.type === 'reflection' ? 0 : currentSession.chEnd - currentSession.chStart + 1
  const chapterWord = lang === 'en' ? (chapterSpan === 1 ? 'chapter' : 'chapters') : (chapterSpan === 1 ? 'capítulo' : 'capítulos')

  // Gamificação: nada aqui é medido em tempo — XP vem de capítulos, livros e
  // blocos concluídos, e alimenta um sistema de níveis + conquistas.
  const gami = computeGamificationStats(completedSet, sessionsByBlock, blocks)
  const level = levelFor(gami.xp, lang)
  const progressToNext = levelProgress(gami.xp, lang)
  const achievements = computeUnlockedAchievements({
    ...gami,
    ...prayerStats,
    streak,
    biblePercent: overall.biblePercent,
    blockDone: id => blocks.find(b => b.id === id)?.status === 'done',
  }, lang)

  const displayTitle = lang === 'en' ? currentSession.titleEn : currentSession.title
  const displayPassage = lang === 'en' ? currentSession.passageEn : currentSession.passage
  const blockName = lang === 'en' ? activeBlock.nameEn : activeBlock.name
  const blockLine = lang === 'en'
    ? `${blockName} · Session ${currentSession.id} of ${activeBlock.sessionsTotal}`
    : `${blockName} · Sessão ${currentSession.id} de ${activeBlock.sessionsTotal}`

  return {
    lang,
    userName: authUser.name.trim().split(/\s+/)[0],
    avatarInitials: avatarInitialsOf(authUser.name),
    biblePercent: overall.biblePercent,
    atPercent: overall.atPercent,
    ntPercent: overall.ntPercent,
    streak,
    chaptersRead: gami.chaptersRead,
    totalChapters: gami.totalChapters,
    booksCompleted: gami.booksCompleted,
    totalBooks: gami.totalBooks,
    xp: gami.xp,
    level,
    nextLevel: progressToNext.next,
    levelPercent: progressToNext.percent,
    xpForNext: progressToNext.xpForNext,
    achievements,
    sessionsLeft: computeTotalSessions(blocks) - overall.sessionsDone,
    daysLeft,
    plan,
    todaySession: {
      number: currentSession.id,
      title: displayTitle,
      subtitle: currentSession.type === 'reflection'
        ? displayPassage
        : `${displayPassage} · ${chapterSpan} ${chapterWord}`,
      block: blockLine,
      progress: sessionProgress,
    },
  }
}

const DEFAULT_PRAYER_STATS = { requestsAdded: 0, requestsAnswered: 0, timerCompletions: 0 }

export default function App() {
  // Fica true assim que a sessão do Supabase (logado ou não) e, se logado, o
  // progresso salvo, terminam de carregar — antes disso mostramos uma tela
  // de carregamento em vez de renderizar com dados parciais/errados.
  const [bootstrapped, setBootstrapped] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [appLanguage, setAppLanguageState] = useState(getAppLanguage)
  const [completedSet, setCompletedSet] = useState(() => new Set())
  const [activeTab, setActiveTab] = useState('home')
  const [planId, setPlanId] = useState('standard')
  const [activeBlockId, setActiveBlockId] = useState(1)
  const [streak, setStreak] = useState(0)
  const [prayerStats, setPrayerStats] = useState(DEFAULT_PRAYER_STATS)
  // Controla se a aba Jornada (agora também dona da Leitura) abre no mapa de
  // blocos (visão geral) ou já direto na leitura do bloco ativo — usado pelo
  // botão "Continuar sessão" da Home pra pular a etapa do mapa.
  const [journeyEntryMode, setJourneyEntryMode] = useState('overview')
  // Sessão específica a destacar quando entryMode é 'reading' — garante que a
  // Leitura abra featurando exatamente a mesma sessão que a Home mostrou.
  const [journeyResumeSessionId, setJourneyResumeSessionId] = useState(null)

  const { blocks, sessionsByBlock } = useMemo(() => deriveProgress(completedSet, planId), [completedSet, planId])

  // Bootstrap inicial: verifica se já existe uma sessão do Supabase e, se
  // houver, carrega todo o progresso salvo de uma vez (registrando também o
  // acesso de hoje pra sequência de dias seguidos) antes de liberar a tela.
  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      const user = await getCurrentUser()
      if (cancelled) return
      if (!user) { setBootstrapped(true); return }

      const [set, userPlanId, userStreak, stats] = await Promise.all([
        getCompletedSet(user.email),
        getSelectedPlanId(user.email),
        recordAccess(user.email),
        getPrayerStats(user.email),
      ])
      if (cancelled) return

      setAuthUser(user)
      setCompletedSet(set)
      setPlanId(userPlanId)
      setActiveBlockId(defaultBlockIdFor(set, userPlanId))
      setStreak(userStreak)
      setPrayerStats(stats)
      setBootstrapped(true)
    }
    bootstrap()
    return () => { cancelled = true }
  }, [])

  // Mantém as estatísticas de oração em dia ao trocar de aba — evita mostrar
  // conquistas desatualizadas depois de orar ou registrar um pedido em outra tela.
  useEffect(() => {
    if (!authUser?.email) return
    getPrayerStats(authUser.email).then(setPrayerStats).catch(err => {
      console.error('Failed to refresh prayer stats', err)
    })
  }, [authUser?.email, activeTab])

  // Navegação genérica entre abas — ao ir pra Jornada por essa via (menu
  // inferior, header, etc.) sempre reseta pro mapa de blocos (visão geral).
  function navigateTo(tab) {
    if (tab === 'journey') setJourneyEntryMode('overview')
    setActiveTab(tab)
  }

  // Botão "Continuar sessão" da Home: pula direto pra leitura do bloco que
  // contém a sessão onde o usuário realmente parou, sem passar pelo mapa.
  function continueToday() {
    const { session: resumeSession, block } = findCurrentReadingSession(blocks, sessionsByBlock, completedSet)
    setActiveBlockId(block.id)
    setJourneyResumeSessionId(resumeSession.id)
    setJourneyEntryMode('reading')
    setActiveTab('journey')
  }

  // Chamado depois de login/cadastro bem-sucedidos: busca todo o progresso
  // salvo do usuário de uma vez só, e só então atualiza o estado (evita um
  // frame renderizando o usuário novo com dados do usuário anterior/vazios).
  async function handleAuthenticated(user) {
    const [set, userPlanId, stats, userStreak] = await Promise.all([
      getCompletedSet(user.email),
      getSelectedPlanId(user.email),
      getPrayerStats(user.email),
      recordAccess(user.email),
    ])
    setAuthUser(user)
    setCompletedSet(set)
    setPlanId(userPlanId)
    setActiveBlockId(defaultBlockIdFor(set, userPlanId))
    setPrayerStats(stats)
    setStreak(userStreak)
  }

  function handleLogout() {
    logout().catch(err => console.error('Failed to logout', err))
    setAuthUser(null)
    setCompletedSet(new Set())
    setStreak(0)
    setPlanId('standard')
    setPrayerStats(DEFAULT_PRAYER_STATS)
    setActiveTab('home')
  }

  function selectPlan(id) {
    setPlanId(id)
    if (authUser) {
      setSelectedPlanId(authUser.email, id).catch(err => console.error('Failed to persist plan', err))
    }
  }

  // Troca o idioma do app (chamado a partir do seletor na aba Perfil) —
  // atualiza o estado local na hora (UI otimista) e salva em segundo plano.
  function changeLanguage(language) {
    if (!authUser) return
    setAuthUser({ ...authUser, language })
    updateLanguage(authUser.email, language).catch(err => console.error('Failed to persist language', err))
  }

  // Reinicia a leitura do zero: apaga o progresso salvo e volta pra Sessão 1 do Pentateuco.
  function handleResetProgress() {
    if (!authUser) return
    setCompletedSet(new Set())
    setActiveBlockId(1)
    setActiveTab('home')
    resetProgress(authUser.email).catch(err => console.error('Failed to reset progress', err))
  }

  // Marca (ou desmarca) qualquer sessão como concluída, na hora que o usuário
  // quiser — nenhuma sessão ou bloco fica bloqueado esperando ordem. O
  // progresso é salvo por capítulo (não por id de sessão), então sobrevive a
  // trocas de plano. Atualiza o estado local na hora (UI otimista) e persiste
  // em segundo plano.
  function toggleSession(session, done) {
    if (!authUser) return
    const keys = sessionKeys(session)
    setCompletedSet(prev => {
      const next = new Set(prev)
      keys.forEach(k => done ? next.add(k) : next.delete(k))
      return next
    })
    const persist = done ? markKeysDone(authUser.email, keys) : markKeysUndone(authUser.email, keys)
    persist.catch(err => console.error('Failed to persist session progress', err))
  }

  // Marca (ou desmarca) um único capítulo dentro de uma sessão — permite
  // acompanhar a leitura capítulo por capítulo, sem precisar concluir a
  // sessão inteira de uma vez.
  function toggleChapter(session, chapter, done) {
    if (!authUser) return
    const key = `${session.book}:${chapter}`
    setCompletedSet(prev => {
      const next = new Set(prev)
      if (done) next.add(key)
      else next.delete(key)
      return next
    })
    const persist = done ? markKeysDone(authUser.email, [key]) : markKeysUndone(authUser.email, [key])
    persist.catch(err => console.error('Failed to persist chapter progress', err))
  }

  if (!bootstrapped) {
    return <SplashScreen />
  }

  if (!authUser) {
    // Primeira tela do app: escolher o idioma (uma vez por dispositivo) antes
    // de mostrar login/criar conta, que já nascem no idioma escolhido.
    if (!appLanguage) {
      return <LanguageSelectScreen onSelect={setAppLanguageState} />
    }
    return <AuthScreen onAuthenticated={handleAuthenticated} />
  }

  const session = buildSession(authUser, blocks, sessionsByBlock, streak, planId, completedSet, prayerStats)

  const screens = {
    home:    <HomeScreen    session={session} onContinueSession={continueToday} />,
    prayer:  <PrayerScreen  session={session} authUser={authUser} />,
    journey: <JourneyScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} completedSet={completedSet} onToggleSession={toggleSession} onToggleChapter={toggleChapter} onSelectPlan={selectPlan} initialBlockId={activeBlockId} entryMode={journeyEntryMode} resumeSessionId={journeyResumeSessionId} />,
    studies: <StudiesScreen session={session} authUser={authUser} />,
    stats:   <ProgressScreen session={session} blocks={blocks} />,
    profile: <ProfileScreen  session={session} authUser={authUser} onNavigate={navigateTo} onLogout={handleLogout} onResetProgress={handleResetProgress} onChangeLanguage={changeLanguage} />,
  }

  return (
    <div className="app-shell">
      {/* Navegação lateral — só visível em telas ≥1024px (ver index.css) */}
      <Sidebar activeTab={activeTab} onNavigate={navigateTo} avatarInitials={session.avatarInitials} userName={session.userName} />

      <div className="app-main">
        {/* Header fixo (logo + avatar), presente em todas as abas — só em telas <1024px */}
        <AppHeader avatarInitials={session.avatarInitials} onNavigate={navigateTo} />

        {/* Conteúdo da tela ativa */}
        <div className="app-content">
          <div className="app-content-inner">
            {screens[activeTab]}
          </div>
        </div>

        {/* Navegação inferior — só em telas <1024px */}
        <BottomNav activeTab={activeTab} onNavigate={navigateTo} />
      </div>
    </div>
  )
}

// Exibida enquanto verificamos se já existe uma sessão do Supabase e, se
// houver, carregamos o progresso salvo — evita um flash da tela de login ou
// de dados vazios antes do carregamento terminar.
function SplashScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#141414', gap: 14 }}>
      <img src="/icons/icon-192.png" alt="" style={{ width: 60, height: 60, borderRadius: 15, boxShadow: '0 10px 24px rgba(0,0,0,.35)' }} />
      <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>JESUS' <span style={{ color: 'var(--or)' }}>CORNER</span></span>
    </div>
  )
}
