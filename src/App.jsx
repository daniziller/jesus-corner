import { useState, useMemo, useEffect, useRef } from 'react'
import { Analytics } from '@vercel/analytics/react'
import AppHeader from './components/AppHeader'
import AppIcon from './icons/AppIcon'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
import AuthScreen from './screens/AuthScreen'
import LanguageSelectScreen from './screens/LanguageSelectScreen'
import HomeScreen from './screens/HomeScreen'
import PrayerScreen from './screens/PrayerScreen'
import ReflectionScreen from './screens/ReflectionScreen'
import RoutineScreen from './screens/RoutineScreen'
import PlanScreen from './screens/PlanScreen'
import ContactScreen from './screens/ContactScreen'
import NotesScreen from './screens/NotesScreen'
import ApplicationPhrasesScreen from './screens/ApplicationPhrasesScreen'
import ThemePlanScreen from './screens/ThemePlanScreen'
import JourneyScreen from './screens/JourneyScreen'
import GroupsScreen from './screens/GroupsScreen'
import StudiesScreen from './screens/StudiesScreen'
import ProgressScreen from './screens/ProgressScreen'
import ProfileScreen from './screens/ProfileScreen'
import UpgradeScreen from './screens/UpgradeScreen'
import AdminScreen from './screens/AdminScreen'
import { getCurrentUser, logout, updateLanguage } from './auth/authStore'
import { getCompletedSet, markKeysDone, markKeysUndone, resetProgress } from './progress/progressStore'
import { deriveProgress, pickActiveBlock, computeOverallStats, computeGamificationStats, computeTotalSessions, sessionKeys, computeCompletedBooks } from './utils/progress'
import { levelFor, levelProgress } from './utils/levels'
import { isAtLeast } from './utils/age'
import { computeUnlockedAchievements } from './utils/achievements'
import { getPrayerStats } from './prayer/prayerStatsStore'
import { getDailyRoutine, setStepDone } from './routine/dailyRoutineStore'
import { computeRoutineStreak } from './routine/routineStreak'
import { dateKey } from './utils/dateKey'
import { getSelectedPlanId, setSelectedPlanId } from './plan/planStore'
import { getReadingOrder, setReadingOrder as persistReadingOrder } from './reading/readingOrderStore'
import { PLANS } from './data/bibleBlocks'
import { getAppLanguage, setAppLanguage } from './i18n/appLanguageStore'
import { getLargeTextEnabled, setLargeTextEnabled } from './utils/textScaleStore'
import { detectLanguageFromIp } from './i18n/detectLanguage'
import { t } from './i18n'
import { getMyActiveChallenges, recordChallengeProgress } from './groups/challengesStore'
import { getPendingGroupInvitesCount } from './groups/groupsStore'
import { getPendingFriendRequestsCount } from './friends/friendsStore'
import { getMyProfile } from './profile/profileStore'
import { getMySubscription, isPremiumActive } from './billing/subscriptionStore'
import { checkIsAdmin } from './admin/adminStore'
import { applyPendingInvite } from './invites/inviteStore'
import { logActivity } from './activity/activityStore'
import { avatarInitialsOf } from './utils/avatarInitials'

function defaultBlockIdFor(completedSet, planId, readingOrder) {
  return pickActiveBlock(deriveProgress(completedSet, planId, readingOrder).blocks).id
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

      // Próximo bloco na ordem de PERCURSO atual (blocks já vem ordenado por
      // deriveProgress conforme reading_order) — não necessariamente id+1,
      // já que a ordem pode ser NT primeiro (ver src/utils/progress.js).
      const nextBlock = blocks[blocks.indexOf(block) + 1]
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
function buildSession(authUser, blocks, sessionsByBlock, dailyRoutine, planId, completedSet, prayerStats, readingOrder) {
  const lang = authUser.language ?? 'pt'
  const streak = computeRoutineStreak(dailyRoutine)
  const todayRoutine = dailyRoutine[dateKey()] ?? {}
  // Sessão (e bloco) onde o usuário realmente parou — baseado no último
  // capítulo marcado como lido, não na ordem sugerida dos livros/blocos.
  const { session: currentSession, block: activeBlock } = findCurrentReadingSession(blocks, sessionsByBlock, completedSet)
  const overall = computeOverallStats(blocks)
  const planRaw = PLANS.find(p => p.id === planId) ?? PLANS.find(p => p.id === 'standard')
  const plan = { ...planRaw, label: lang === 'en' ? planRaw.labelEn : planRaw.label }

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
  // Plano Livre não tem "Sessão N de X" — cada sessão já é 1 capítulo só.
  const blockLine = planId !== 'free'
    ? (lang === 'en'
      ? `${blockName} · Session ${currentSession.id} of ${activeBlock.sessionsTotal}`
      : `${blockName} · Sessão ${currentSession.id} de ${activeBlock.sessionsTotal}`)
    : blockName

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
    plan,
    readingOrder,
    // Nome do 1º bloco na ordem ATUAL (Pentateuco ou Evangelhos) — usado no
    // texto de "Reiniciar leitura" da aba Perfil, pra não ficar hardcoded
    // "Pentateuco" quando a ordem for NT primeiro (ver ProfileScreen.jsx).
    firstBlockName: lang === 'en' ? blocks[0].nameEn : blocks[0].name,
    dailyRoutine,
    todayRoutine,
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

// Pedidos de amizade + convites de grupo pendentes, somados — alimenta o
// sino de notificações (AppHeader/Sidebar) e o indicador na aba Comunidade
// (ver Sidebar/BottomNav, que só precisa saber se a soma é > 0).
async function getPendingSocialCount() {
  const [friendRequests, groupInvites] = await Promise.all([
    getPendingFriendRequestsCount(),
    getPendingGroupInvitesCount(),
  ])
  return friendRequests + groupInvites
}

export default function App() {
  // Fica true assim que a sessão do Supabase (logado ou não) e, se logado, o
  // progresso salvo, terminam de carregar — antes disso mostramos uma tela
  // de carregamento em vez de renderizar com dados parciais/errados.
  const [bootstrapped, setBootstrapped] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  // Status da assinatura (Stripe) — ver src/billing/subscriptionStore.js.
  // null enquanto não carregou ou pra quem nunca assinou.
  const [subscription, setSubscription] = useState(null)
  // Só true pra quem está na allowlist ADMIN_EMAILS (checado no servidor,
  // ver api/_lib/adminAuth.js) — controla só se a aba Admin aparece; a
  // segurança de verdade é sempre re-checada em cada api/admin/*.js.
  const [isAdmin, setIsAdmin] = useState(false)
  // Toda conta precisa de um access_type ativo pra usar o app — free (R$0),
  // lifetime ou recurring, todos concedem acesso completo (ver
  // isPremiumActive). Sem isso, PaywallGate (mais abaixo) substitui o app
  // inteiro por uma tela única de contribuição, antes de qualquer outra
  // rota ser montada.
  const isPremium = isPremiumActive(subscription)
  // Restrição de idade (16+) da Comunidade é independente da assinatura —
  // contas sem data de nascimento (criadas antes desse campo existir) não
  // são restringidas por idade (ver isAtLeast).
  const meetsMinAge = isAtLeast(authUser?.birthdate, 16)
  const canAccessGroups = meetsMinAge
  const disabledTabs = meetsMinAge ? [] : ['groups']
  const [appLanguage, setAppLanguageState] = useState(getAppLanguage)
  const [completedSet, setCompletedSet] = useState(() => new Set())
  const [activeTab, setActiveTab] = useState('home')
  // Oração e Reflexão têm cronômetro rodando de verdade (setInterval, wake
  // lock) — se a tela desmontasse ao trocar de aba, como as outras, o
  // cronômetro perderia todo o progresso (useState/useRef voltam do zero ao
  // remontar). Por isso, uma vez visitada, essa aba fica sempre montada (só
  // escondida via CSS quando não é a ativa — ver perto do JSX que lê esses
  // refs), e o cronômetro continua contando mesmo com a pessoa em outra aba
  // do app. Ref (não state) porque só precisa "travar" true na hora certa do
  // render — não precisa disparar um re-render próprio pra isso.
  const prayerVisitedRef = useRef(false)
  const reflectionVisitedRef = useRef(false)
  const [planId, setPlanId] = useState('standard')
  const [readingOrder, setReadingOrderState] = useState('ot_first')
  const [activeBlockId, setActiveBlockId] = useState(1)
  // Rotina diária (Oração/Leitura/Reflexão) — o streak exibido é derivado
  // dela (ver computeRoutineStreak), não mais de um login diário.
  const [dailyRoutine, setDailyRoutine] = useState({})
  const [prayerStats, setPrayerStats] = useState(DEFAULT_PRAYER_STATS)
  // Foto de perfil (profiles.avatar_url) — mora fora de authUser porque não
  // é user_metadata, é a tabela profiles (pensada pra ser visível a amigos).
  // Refletida no Sidebar/AppHeader assim que muda (ver onProfileUpdated).
  const [myAvatarUrl, setMyAvatarUrl] = useState(null)
  // Desafios de grupo ativos dos quais participo (challengeId + livros do
  // escopo) — usado só pra decidir, ao marcar um capítulo como lido, se
  // ele também conta pro placar de algum desafio (ver toggleSession/
  // toggleChapter mais abaixo). Nenhuma tela de leitura precisa saber que
  // desafios existem.
  const [activeChallenges, setActiveChallenges] = useState([])
  // Pedidos de amizade + convites de grupo pendentes — alimenta o sino de
  // notificações e a bolinha na aba Comunidade.
  const [pendingSocialCount, setPendingSocialCount] = useState(0)
  // Controla se a aba Jornada (agora também dona da Leitura) abre no mapa de
  // blocos (visão geral) ou já direto na leitura do bloco ativo — usado pelo
  // botão "Continuar sessão" da Home pra pular a etapa do mapa.
  const [journeyEntryMode, setJourneyEntryMode] = useState('overview')
  // Sessão específica a destacar quando entryMode é 'reading' — garante que a
  // Leitura abra featurando exatamente a mesma sessão que a Home mostrou.
  const [journeyResumeSessionId, setJourneyResumeSessionId] = useState(null)
  // Acessibilidade: "texto grande" — por dispositivo, ver src/utils/textScaleStore.js
  // e a regra html.large-text #root { zoom } em index.css.
  const [largeText, setLargeText] = useState(getLargeTextEnabled)

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText)
  }, [largeText])

  function toggleLargeText() {
    setLargeText(prev => {
      const next = !prev
      setLargeTextEnabled(next)
      return next
    })
  }

  const { blocks, sessionsByBlock } = useMemo(() => deriveProgress(completedSet, planId, readingOrder), [completedSet, planId, readingOrder])
  // Sessões "1 capítulo = 1 sessão" (plano Livre), independentes do plano de
  // leitura ativo — usadas só quando a pessoa está navegando livremente
  // pela aba Bíblia (fora do fluxo guiado da Rotina), pra mostrar divisão
  // por capítulo em vez de "Sessão N de X" (ver ReadingBlockView, mode
  // 'browse'). Só depende de completedSet, nunca de planId.
  const { sessionsByBlock: browseSessionsByBlock } = useMemo(() => deriveProgress(completedSet, 'free'), [completedSet])

  // Bootstrap inicial: verifica se já existe uma sessão do Supabase e, se
  // houver, carrega todo o progresso salvo de uma vez (registrando também o
  // acesso de hoje pra sequência de dias seguidos) antes de liberar a tela.
  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      const user = await getCurrentUser()
      if (cancelled) return
      if (!user) {
        // Ninguém logado ainda — se o dispositivo também não tem idioma
        // escolhido, tenta detectar pelo IP (Brasil → pt, resto → en) antes
        // de decidir se mostra a tela de escolha manual. Falha silenciosa:
        // sem detecção, cai de volta pra tela de escolha normal.
        if (!getAppLanguage()) {
          const detected = await detectLanguageFromIp()
          if (!cancelled && detected) {
            setAppLanguage(detected)
            setAppLanguageState(detected)
          }
        }
        if (!cancelled) setBootstrapped(true)
        return
      }

      const [set, userPlanId, userReadingOrder, routine, stats, challenges, pendingSocial, myProfile, mySubscription, adminStatus, inviteApplied] = await Promise.all([
        getCompletedSet(user.email),
        getSelectedPlanId(user.email),
        getReadingOrder(user.email),
        getDailyRoutine(),
        getPrayerStats(user.email),
        getMyActiveChallenges(),
        getPendingSocialCount(),
        getMyProfile(),
        getMySubscription(),
        checkIsAdmin(),
        applyPendingInvite(),
      ])
      if (cancelled) return

      // Se um convite de acesso grátis acabou de ser aplicado, a assinatura
      // buscada acima (em paralelo) já está desatualizada — busca de novo
      // pra o PaywallGate liberar sozinho, sem precisar de F5.
      const finalSubscription = inviteApplied ? await getMySubscription() : mySubscription
      if (cancelled) return

      setAuthUser(user)
      setCompletedSet(set)
      setPlanId(userPlanId)
      setReadingOrderState(userReadingOrder)
      setActiveBlockId(defaultBlockIdFor(set, userPlanId, userReadingOrder))
      setDailyRoutine(routine)
      setPrayerStats(stats)
      setActiveChallenges(challenges)
      setPendingSocialCount(pendingSocial)
      setMyAvatarUrl(myProfile?.avatarUrl ?? null)
      setSubscription(finalSubscription)
      setIsAdmin(adminStatus)
      setBootstrapped(true)
    }
    bootstrap()
    return () => { cancelled = true }
  }, [])

  // Mantém as estatísticas de oração, o indicador de pendência e os
  // desafios ativos em dia ao trocar de aba — evita mostrar conquistas
  // desatualizadas, uma bolinha de pendência que já devia ter sumido, ou
  // deixar de contar progresso de um desafio que outra pessoa do grupo
  // acabou de criar enquanto eu já estava com o app aberto.
  // dailyRoutine NÃO entra aqui de propósito: os três gatilhos que a mudam
  // (toggleSession/toggleChapter, onPrayerCompleted, o toggle da Home) já
  // atualizam o estado local direto via markRoutineStep — uma busca "atrasada"
  // aqui poderia sobrescrever essa atualização otimista com um dado velho.
  useEffect(() => {
    if (!authUser?.email) return
    getPrayerStats(authUser.email).then(setPrayerStats).catch(err => {
      console.error('Failed to refresh prayer stats', err)
    })
    getPendingSocialCount().then(setPendingSocialCount).catch(err => {
      console.error('Failed to refresh pending social indicator', err)
    })
    getMyActiveChallenges().then(setActiveChallenges).catch(err => {
      console.error('Failed to refresh active challenges', err)
    })
  }, [authUser?.email, activeTab])

  // Navegação genérica entre abas — ao ir pra Jornada por essa via (menu
  // inferior, header, etc.) sempre reseta pro mapa de blocos (visão geral).
  // Rotina e Comunidade são restritas a assinantes (Comunidade também a
  // maiores de 16) — a Sidebar/BottomNav já escondem o clique, mas essa
  // checagem aqui é a segunda linha de defesa (mesmo espírito de "UI
  // esconde, a fonte da verdade decide" já usado nas policies RLS de
  // group_comments). 'upgrade' nunca é bloqueada — é pra onde a pessoa vai
  // justamente pra resolver o bloqueio.
  function navigateTo(tab) {
    if (disabledTabs.includes(tab) && tab !== 'upgrade') return
    if (tab === 'journey') setJourneyEntryMode('overview')
    setActiveTab(tab)
  }

  // Depois de voltar do Stripe Checkout (success_url leva pra cá com
  // ?checkout=success) — o webhook grava a assinatura de forma assíncrona,
  // então tenta buscar de novo algumas vezes em vez de só uma, pra dar tempo
  // dele processar antes de desistir.
  useEffect(() => {
    if (!authUser) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') !== 'success') return
    window.history.replaceState({}, '', window.location.pathname)
    let cancelled = false
    let attempts = 0
    async function poll() {
      const sub = await getMySubscription()
      if (cancelled) return
      setSubscription(sub)
      attempts += 1
      if (!isPremiumActive(sub) && attempts < 4) setTimeout(poll, 1500)
    }
    poll()
    return () => { cancelled = true }
  }, [authUser])

  // Botão "Continuar sessão" da Home: pula direto pra leitura do bloco que
  // contém a sessão onde o usuário realmente parou, sem passar pelo mapa.
  function continueToday() {
    const { session: resumeSession, block } = findCurrentReadingSession(blocks, sessionsByBlock, completedSet)
    setActiveBlockId(block.id)
    setJourneyResumeSessionId(resumeSession.id)
    setJourneyEntryMode('reading')
    setActiveTab('journey')
  }

  // Tocar numa sessão específica na aba Plano (ver PlanScreen.jsx) — mesmo
  // mecanismo de continueToday acima, só que pra uma sessão escolhida pela
  // pessoa em vez de sempre "onde ela parou".
  function openReadingSession(blockId, sessionId) {
    setActiveBlockId(blockId)
    setJourneyResumeSessionId(sessionId)
    setJourneyEntryMode('reading')
    setActiveTab('journey')
  }

  // Rebusca a assinatura e atualiza o estado — usado depois de resgatar um
  // convite de acesso grátis (ver UpgradeScreen.jsx), pra liberar o
  // PaywallGate sozinho, sem precisar de F5.
  async function refreshSubscription() {
    const sub = await getMySubscription()
    setSubscription(sub)
  }

  // Chamado depois de login/cadastro bem-sucedidos: busca todo o progresso
  // salvo do usuário de uma vez só, e só então atualiza o estado (evita um
  // frame renderizando o usuário novo com dados do usuário anterior/vazios).
  async function handleAuthenticated(user) {
    const [set, userPlanId, userReadingOrder, stats, routine, challenges, pendingSocial, myProfile, mySubscription, adminStatus, inviteApplied] = await Promise.all([
      getCompletedSet(user.email),
      getSelectedPlanId(user.email),
      getReadingOrder(user.email),
      getPrayerStats(user.email),
      getDailyRoutine(),
      getMyActiveChallenges(),
      getPendingSocialCount(),
      getMyProfile(),
      getMySubscription(),
      checkIsAdmin(),
      applyPendingInvite(),
    ])
    const finalSubscription = inviteApplied ? await getMySubscription() : mySubscription
    setAuthUser(user)
    setCompletedSet(set)
    setPlanId(userPlanId)
    setReadingOrderState(userReadingOrder)
    setActiveBlockId(defaultBlockIdFor(set, userPlanId, userReadingOrder))
    setPrayerStats(stats)
    setDailyRoutine(routine)
    setActiveChallenges(challenges)
    setPendingSocialCount(pendingSocial)
    setMyAvatarUrl(myProfile?.avatarUrl ?? null)
    setSubscription(finalSubscription)
    setIsAdmin(adminStatus)
  }

  // Chamado pelo ProfileScreen depois de salvar uma edição de perfil —
  // atualiza name/birthdate (que vivem em authUser) e a foto na hora (UI
  // otimista, o ProfileScreen já persistiu antes de chamar isso).
  function handleProfileUpdated({ name, birthdate, avatarUrl }) {
    if (!authUser) return
    setAuthUser({ ...authUser, name, birthdate })
    if (avatarUrl !== undefined) setMyAvatarUrl(avatarUrl)
  }

  function handleLogout() {
    logout().catch(err => console.error('Failed to logout', err))
    setAuthUser(null)
    setCompletedSet(new Set())
    setStreak(0)
    setPlanId('standard')
    setReadingOrderState('ot_first')
    setPrayerStats(DEFAULT_PRAYER_STATS)
    setActiveChallenges([])
    setPendingSocialCount(false)
    setMyAvatarUrl(null)
    setSubscription(null)
    setIsAdmin(false)
    setActiveTab('home')
  }

  // Chamado pelo GroupsScreen depois de qualquer ação que possa mudar
  // desafios ativos ou pendências (aceitar convite, sair de um grupo,
  // entrar num desafio novo) — evita esperar a próxima troca de aba pra
  // essas listas ficarem em dia.
  function refreshSocialState() {
    if (!authUser?.email) return
    Promise.all([getMyActiveChallenges(), getPendingSocialCount()])
      .then(([challenges, pendingSocial]) => {
        setActiveChallenges(challenges)
        setPendingSocialCount(pendingSocial)
      })
      .catch(err => console.error('Failed to refresh social state', err))
  }

  function selectPlan(id) {
    setPlanId(id)
    if (authUser) {
      setSelectedPlanId(authUser.email, id).catch(err => console.error('Failed to persist plan', err))
    }
  }

  // Troca a ordem de leitura (AT primeiro / NT primeiro) — chamado a partir
  // do seletor na aba Perfil (mesmo padrão de selectPlan acima). blocks/
  // sessionsByBlock/todaySession recalculam sozinhos (useMemo depende de
  // readingOrder), então a próxima sessão sugerida já reflete a nova ordem
  // na hora, sem perder nada do progresso já lido.
  function selectReadingOrder(order) {
    setReadingOrderState(order)
    if (authUser) {
      persistReadingOrder(authUser.email, order).catch(err => console.error('Failed to persist reading order', err))
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
    // Primeiro bloco da ordem de leitura ATUAL, não sempre o 1 (Pentateuco)
    // — com NT primeiro, reiniciar deve voltar pros Evangelhos.
    setActiveBlockId(defaultBlockIdFor(new Set(), planId, readingOrder))
    setActiveTab('home')
    resetProgress(authUser.email).catch(err => console.error('Failed to reset progress', err))
  }

  // Grava, nos desafios de grupo ativos, os capítulos que acabaram de virar
  // concluídos nesta ação — só os que já não estavam marcados antes, e só
  // os que pertencem ao(s) livro(s) do escopo de cada desafio. É assim que
  // "só conta o que foi lido depois de entrar no desafio" funciona, sem
  // precisar comparar datas (ver reading_challenge_progress na migração).
  function recordChallengeProgressForNewlyDoneKeys(newlyDoneKeys) {
    if (newlyDoneKeys.length === 0 || activeChallenges.length === 0) return
    for (const challenge of activeChallenges) {
      const matching = newlyDoneKeys.filter(k => challenge.books.includes(k.split(':')[0]))
      if (matching.length > 0) {
        recordChallengeProgress(challenge.challengeId, matching).catch(err => {
          console.error('Failed to record challenge progress', err)
        })
      }
    }
  }

  // Detecta, comparando o completedSet antes/depois de uma ação, se algum
  // livro acabou de ser concluído ou se o nível subiu — e registra cada
  // marco no feed de atividade dos amigos (ver src/activity/activityStore.js).
  // Nível é calculado só no client (src/utils/levels.js), então a detecção
  // também precisa ser aqui — não dá pra fazer isso num trigger do banco sem
  // duplicar a fórmula de XP/nível em SQL.
  function detectAndLogMilestones(prevSet, nextSet) {
    const prevBooks = computeCompletedBooks(prevSet, sessionsByBlock)
    const nextBooks = computeCompletedBooks(nextSet, sessionsByBlock)
    for (const book of nextBooks) {
      if (!prevBooks.has(book)) {
        logActivity('book_completed', { book }).catch(err => console.error('Failed to log activity', err))
      }
    }

    const { blocks: nextBlocks } = deriveProgress(nextSet, planId, readingOrder)
    const prevXp = computeGamificationStats(prevSet, sessionsByBlock, blocks).xp
    const nextXp = computeGamificationStats(nextSet, sessionsByBlock, nextBlocks).xp
    const prevLevelNum = levelFor(prevXp).level
    const nextLevelNum = levelFor(nextXp).level
    if (nextLevelNum > prevLevelNum) {
      logActivity('level_up', { level: nextLevelNum }).catch(err => console.error('Failed to log activity', err))
    }
  }

  // Marca um passo da rotina diária (oração/leitura/reflexão) como
  // concluído — atualiza o estado local na hora (o streak/calendário da
  // Home reagem no mesmo instante) e persiste em segundo plano. Usado tanto
  // por gatilhos automáticos (marcar um capítulo, terminar o cronômetro de
  // oração/reflexão) quanto pelo toggle manual que ainda existir na Home.
  // Junto grava o plano ativo no momento — é ele que decide, dali pra
  // frente, quais passos aquele dia específico precisa pra contar como
  // completo (ver isDayComplete em routineStreak.js), mesmo que a pessoa
  // troque de plano depois.
  function markRoutineStep(step, done = true) {
    if (!authUser) return
    const key = dateKey()
    setDailyRoutine(prev => {
      const today = { ...prev[key], planId }
      if (done) today[step] = true
      else delete today[step]
      return { ...prev, [key]: today }
    })
    setStepDone(step, done, planId).catch(err => console.error('Failed to persist routine step', err))
  }

  // Marca (ou desmarca) qualquer sessão como concluída, na hora que o usuário
  // quiser — nenhuma sessão ou bloco fica bloqueado esperando ordem. O
  // progresso é salvo por capítulo (não por id de sessão), então sobrevive a
  // trocas de plano. Atualiza o estado local na hora (UI otimista) e persiste
  // em segundo plano.
  function toggleSession(session, done) {
    if (!authUser) return
    const keys = sessionKeys(session)
    const newlyDoneKeys = done ? keys.filter(k => !completedSet.has(k)) : []
    const nextSet = new Set(completedSet)
    keys.forEach(k => done ? nextSet.add(k) : nextSet.delete(k))
    if (done) detectAndLogMilestones(completedSet, nextSet)
    setCompletedSet(nextSet)
    const persist = done ? markKeysDone(authUser.email, keys) : markKeysUndone(authUser.email, keys)
    persist.catch(err => console.error('Failed to persist session progress', err))
    recordChallengeProgressForNewlyDoneKeys(newlyDoneKeys)
    if (done) markRoutineStep('reading')
  }

  // Marca (ou desmarca) um único capítulo dentro de uma sessão — permite
  // acompanhar a leitura capítulo por capítulo, sem precisar concluir a
  // sessão inteira de uma vez.
  function toggleChapter(session, chapter, done) {
    if (!authUser) return
    const key = `${session.book}:${chapter}`
    const newlyDoneKeys = done && !completedSet.has(key) ? [key] : []
    const nextSet = new Set(completedSet)
    if (done) nextSet.add(key)
    else nextSet.delete(key)
    if (done) detectAndLogMilestones(completedSet, nextSet)
    setCompletedSet(nextSet)
    const persist = done ? markKeysDone(authUser.email, [key]) : markKeysUndone(authUser.email, [key])
    persist.catch(err => console.error('Failed to persist chapter progress', err))
    recordChallengeProgressForNewlyDoneKeys(newlyDoneKeys)
    if (done) markRoutineStep('reading')
  }

  if (!bootstrapped) {
    return (
      <>
        <SplashScreen />
        <Analytics />
      </>
    )
  }

  if (!authUser) {
    // Primeira tela do app: escolher o idioma (uma vez por dispositivo) antes
    // de mostrar login/criar conta, que já nascem no idioma escolhido.
    if (!appLanguage) {
      return (
        <>
          <LanguageSelectScreen onSelect={setAppLanguageState} />
          <Analytics />
        </>
      )
    }
    return (
      <>
        <AuthScreen onAuthenticated={handleAuthenticated} />
        <Analytics />
      </>
    )
  }

  const session = buildSession(authUser, blocks, sessionsByBlock, dailyRoutine, planId, completedSet, prayerStats, readingOrder)

  // O app inteiro agora exige assinatura ativa — não existe mais versão
  // grátis. Quem não é assinante só vê essa tela (com botão de assinar e de
  // sair); nenhuma outra rota é montada, então não precisa de gate
  // individual em cada tela/recurso (isPremium abaixo é sempre true depois
  // daqui, mantido só porque telas internas ainda recebem a prop).
  if (!isPremium) {
    return (
      <>
        <PaywallGate session={session} subscription={subscription} onLogout={handleLogout} onSubscriptionRefreshed={refreshSubscription} />
        <Analytics />
      </>
    )
  }

  // Trava o ref de visita assim que a aba vira ativa — feito aqui (não num
  // useEffect) pra já valer NESTE mesmo render, sem esperar o próximo ciclo
  // (senão a tela pisca em branco 1 frame na primeira visita, antes do ref
  // atualizar). Ver declaração de prayerVisitedRef/reflectionVisitedRef.
  if (activeTab === 'prayer') prayerVisitedRef.current = true
  if (activeTab === 'reflection') reflectionVisitedRef.current = true

  const screens = {
    home:    <HomeScreen    session={session} authUser={authUser} onContinueSession={continueToday} onNavigate={navigateTo} onMarkRoutineStep={markRoutineStep} />,
    routine: <RoutineScreen session={session} blocks={blocks} onNavigate={navigateTo} onContinueSession={continueToday} onSelectPlan={selectPlan} onMarkRoutineStep={markRoutineStep} />,
    plan:    <PlanScreen session={session} blocks={blocks} sessionsByBlock={sessionsByBlock} completedSet={completedSet} onSelectPlan={selectPlan} onToggleSession={toggleSession} onOpenSession={openReadingSession} onNavigate={navigateTo} />,
    contact: <ContactScreen session={session} authUser={authUser} />,
    notes:   <NotesScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} />,
    applicationPhrases: <ApplicationPhrasesScreen session={session} authUser={authUser} />,
    themePlan: <ThemePlanScreen session={session} authUser={authUser} completedSet={completedSet} onToggleSession={toggleSession} onToggleChapter={toggleChapter} onNavigate={navigateTo} />,
    journey: <JourneyScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} browseSessionsByBlock={browseSessionsByBlock} completedSet={completedSet} onToggleSession={toggleSession} onToggleChapter={toggleChapter} initialBlockId={activeBlockId} entryMode={journeyEntryMode} resumeSessionId={journeyResumeSessionId} onNavigate={navigateTo} />,
    groups:  !meetsMinAge ? <MinAgeRestricted lang={session.lang} /> : <GroupsScreen session={session} authUser={authUser} onSocialChange={refreshSocialState} />,
    studies: <StudiesScreen session={session} authUser={authUser} />,
    stats:   <ProgressScreen session={session} blocks={blocks} onNavigate={navigateTo} />,
    upgrade: <UpgradeScreen session={session} subscription={subscription} onSubscriptionRefreshed={refreshSubscription} />,
    profile: <ProfileScreen  session={session} authUser={authUser} subscription={subscription} isAdmin={isAdmin} onNavigate={navigateTo} onLogout={handleLogout} onResetProgress={handleResetProgress} onChangeLanguage={changeLanguage} onChangeReadingOrder={selectReadingOrder} onProfileUpdated={handleProfileUpdated} />,
    // Chave só existe pra quem é admin — evita montar (e disparar as
    // buscas de) AdminScreen pra qualquer conta comum.
    ...(isAdmin ? { admin: <AdminScreen session={session} /> } : {}),
  }

  return (
    <div className="app-shell">
      {/* Navegação lateral — só visível em telas ≥1024px (ver index.css) */}
      <Sidebar activeTab={activeTab} onNavigate={navigateTo} avatarInitials={session.avatarInitials} avatarUrl={myAvatarUrl} userName={session.userName} groupsHasPending={pendingSocialCount > 0} disabledTabs={disabledTabs} pendingCount={pendingSocialCount} lang={session.lang} largeText={largeText} onToggleLargeText={toggleLargeText} />

      <div className="app-main">
        {/* Header fixo (logo + avatar), presente em todas as abas — só em telas <1024px */}
        <AppHeader avatarInitials={session.avatarInitials} avatarUrl={myAvatarUrl} onNavigate={navigateTo} pendingCount={pendingSocialCount} lang={session.lang} largeText={largeText} onToggleLargeText={toggleLargeText} />

        {/* Conteúdo da tela ativa */}
        <div className="app-content">
          <div className="app-content-inner">
            {activeTab !== 'prayer' && activeTab !== 'reflection' && screens[activeTab]}

            {/* Oração e Reflexão ficam sempre montadas depois da 1a visita
                (ver prayerVisitedRef/reflectionVisitedRef) — display:'contents'
                faz o wrapper "sumir" do layout quando oculto, sem atrapalhar
                o height:100% que a tela em si já assume. */}
            {prayerVisitedRef.current && (
              <div style={{ display: activeTab === 'prayer' ? 'contents' : 'none' }}>
                <PrayerScreen session={session} authUser={authUser} onPrayerCompleted={() => markRoutineStep('prayer')} onContinueSession={continueToday} />
              </div>
            )}
            {reflectionVisitedRef.current && (
              <div style={{ display: activeTab === 'reflection' ? 'contents' : 'none' }}>
                <ReflectionScreen session={session} authUser={authUser} onReflectionCompleted={() => markRoutineStep('reflection')} />
              </div>
            )}
          </div>
        </div>

        {/* Navegação inferior — só em telas <1024px */}
        <BottomNav activeTab={activeTab} onNavigate={navigateTo} groupsHasPending={pendingSocialCount > 0} disabledTabs={disabledTabs} lang={session.lang} />
      </div>

      <Analytics />
    </div>
  )
}

// Mostrada no lugar da aba Grupos pra contas de menores de 16 anos — segunda
// linha de defesa (a Sidebar/BottomNav já impedem o clique), pro caso de
// activeTab ficar em 'groups' por algum outro caminho (ex: sessão antiga).
function MinAgeRestricted({ lang }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, textAlign: 'center' }}>
      <AppIcon name="Lock" size={30} color="var(--g4)" />
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--g5)' }}>{t('groups.minAgeRestrictedTitle', undefined, lang)}</p>
      <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--g4)', maxWidth: 260 }}>{t('groups.minAgeRestrictedSub', undefined, lang)}</p>
    </div>
  )
}

// Mostrada no lugar de Rotina/Comunidade pra quem ainda não é assinante —
// segunda linha de defesa (mesmo espírito de MinAgeRestricted acima), pro
// caso de activeTab ficar numa dessas abas por algum outro caminho.
// Tela única mostrada pra quem ainda não tem assinatura ativa — substitui
// o app-shell inteiro (sem Sidebar/BottomNav, já que não há mais nenhuma
// outra rota acessível sem assinar). Cabeçalho sempre visível (não usa a
// classe .app-header, que soma display:none no breakpoint desktop em favor
// da Sidebar — aqui não existe Sidebar) com logo e um jeito de sair, e o
// corpo é a própria UpgradeScreen, reaproveitando .app-content/.app-content-inner
// pro mesmo max-width responsivo já usado no resto do app.
function PaywallGate({ session, subscription, onLogout, onSubscriptionRefreshed }) {
  return (
    <div className="app-shell">
      <div className="app-main" style={{ width: '100%' }}>
        <div style={paywallStyles.header}>
          <div style={paywallStyles.brand}>
            <img src="/icons/icon-192.png" alt="" style={paywallStyles.logo} />
            <span style={paywallStyles.brandName}>JESUS' CORNER</span>
          </div>
          <button onClick={onLogout} style={paywallStyles.logoutBtn}>
            {t('profile.logoutLabel', undefined, session.lang)}
          </button>
        </div>
        <div className="app-content">
          <div className="app-content-inner">
            <UpgradeScreen session={session} subscription={subscription} onSubscriptionRefreshed={onSubscriptionRefreshed} />
          </div>
        </div>
      </div>
    </div>
  )
}

const paywallStyles = {
  header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 20px', flexShrink: 0, background: 'var(--header-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' },
  brand:      { display: 'flex', alignItems: 'center', gap: 12 },
  logo:       { width: 32, height: 32, borderRadius: 8, flexShrink: 0 },
  brandName:  { fontSize: 18, fontWeight: 700, lineHeight: '28px', color: 'var(--brand-deep)', letterSpacing: -0.45, whiteSpace: 'nowrap' },
  logoutBtn:  { border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: 'var(--g6)', cursor: 'pointer', fontFamily: 'var(--font)' },
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
