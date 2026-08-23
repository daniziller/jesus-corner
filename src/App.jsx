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
import ContactScreen from './screens/ContactScreen'
import NotesScreen from './screens/NotesScreen'
import ApplicationPhrasesScreen from './screens/ApplicationPhrasesScreen'
import ThemePlanScreen from './screens/ThemePlanScreen'
import ChronologicalPlanScreen from './screens/ChronologicalPlanScreen'
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
import { getDailyRoutine, setStepDone, setThemePicks } from './routine/dailyRoutineStore'
import { computeRoutineStreak, computeRoutineXpBonus, DEFAULT_ROUTINE_MODULES } from './routine/routineStreak'
import { getRoutineModules, setRoutineModules as persistRoutineModules } from './routine/routineModulesStore'
import { getActiveStudyId, setActiveStudyId as persistActiveStudyId } from './studies/activeStudyStore'
import { computeGoalsStatus } from './routine/goals'
import { getCompletedGoals, recordCompletedGoal } from './routine/goalsStore'
import { dateKey } from './utils/dateKey'
import { getSelectedPlanId, setSelectedPlanId } from './plan/planStore'
import { getActiveAltPlan, setActiveAltPlan as persistActiveAltPlan } from './plan/activePlanStore'
import { resolveActivePlanSessions } from './plan/resolveActivePlan'
import { getThemePlans } from './themePlans/themePlansStore'
import { deriveChronoProgress } from './data/chronologicalPlan'
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
import { applyPendingInvite, redeemPendingInviteCode } from './invites/inviteStore'
import { applyPendingOnboardingChoices } from './onboarding/pendingOnboardingChoices'
import { logActivity } from './activity/activityStore'
import { avatarInitialsOf } from './utils/avatarInitials'

function defaultBlockIdFor(completedSet, planId, readingOrder) {
  return pickActiveBlock(deriveProgress(completedSet, planId, readingOrder).blocks).id
}

// Sessão (e respectivo bloco) "de hoje": sempre a PRÓXIMA sessão pendente na
// ordem do plano (blocks já vem ordenado conforme reading_order — ver
// src/utils/progress.js — então percorrer na ordem dada já é a ordem certa
// de percurso, AT ou NT primeiro conforme a preferência da pessoa).
// Antes essa função tentava adivinhar "onde a pessoa parou" a partir do
// ÚLTIMO capítulo marcado como lido (Sets em JS preservam ordem de
// inserção) — mas completedSet é global, sem distinguir capítulo marcado
// pelo fluxo guiado de capítulo marcado navegando livre pela aba Bíblia; um
// capítulo lido fora de ordem por lá (ex: adiantar ou reler algo) fazia
// "leitura de hoje" pular pra um lugar que não tinha nada a ver com o
// próximo texto do plano. Sempre pegar a primeira sessão pendente, na ordem
// do plano, corrige isso: "leitura de hoje" e o botão "Continuar sessão"
// (ver continueToday) sempre concordam com o próximo texto de verdade.
function findCurrentReadingSession(blocks, sessionsByBlock) {
  for (const block of blocks) {
    const session = sessionsByBlock[block.id].find(s => s.status !== 'done')
    if (session) return { session, block }
  }
  // Plano inteiro concluído — não há próxima sessão; mostra a última do
  // último bloco, como "Revisar sessão" (ver ctaLabel em HomeScreen.jsx).
  const lastBlock = blocks[blocks.length - 1]
  const lastSessions = sessionsByBlock[lastBlock.id]
  return { session: lastSessions[lastSessions.length - 1], block: lastBlock }
}

// ─────────────────────────────────────────
// Monta o estado de "sessão do app" (em produção: substituir por Context
// API ou Zustand) a partir do usuário logado + progresso já derivado.
// A ideia central é "1 sessão = 1 dia": o plano (Leve/Padrão/Intensivo)
// muda o TAMANHO das sessões, então "dias restantes" é só a contagem de
// sessões que faltam no plano atual.
// ─────────────────────────────────────────
function buildSession(authUser, blocks, sessionsByBlock, dailyRoutine, planId, completedSet, prayerStats, readingOrder, activeAltPlan, themePlans, completedGoals, routineModules, activeStudyId) {
  const lang = authUser.language ?? 'pt'
  const streak = computeRoutineStreak(dailyRoutine, routineModules)
  const todayRoutine = dailyRoutine[dateKey()] ?? {}

  // Plano ativo pra fins de "sessão de hoje" — o fixo de sempre, ou um plano
  // por tema/cronológico que a pessoa tenha destacado na aba Plano (ver
  // resolveActivePlanSessions acima). blocks/sessionsByBlock ORIGINAIS
  // (parâmetros desta função) continuam intactos pra gamificação/Progresso —
  // só a leitura "de hoje" muda de fonte. todayThemePicks (quais textos a
  // pessoa escolheu ler hoje, se o plano ativo for por tema) também vem do
  // dia de hoje na rotina — ver src/routine/dailyRoutineStore.js/setThemePicks.
  const todayThemePicks = todayRoutine.themePicks
  const activePlanData = resolveActivePlanSessions(activeAltPlan, themePlans, completedSet, blocks, sessionsByBlock, planId, todayThemePicks)
  // Sessão (e bloco) onde o usuário realmente parou — baseado no último
  // capítulo marcado como lido, não na ordem sugerida dos livros/blocos.
  // Continua olhando pra TODOS os textos do plano (não só os de hoje) —
  // sessionsByBlock nunca fica vazio, então nunca quebra; a escolha do dia
  // só afeta o que é mostrado como "sessão de hoje" logo abaixo.
  const { session: currentSession, block: activeBlock } = findCurrentReadingSession(activePlanData.blocks, activePlanData.sessionsByBlock)
  const overall = computeOverallStats(blocks)
  const planRaw = PLANS.find(p => p.id === planId) ?? PLANS.find(p => p.id === 'standard')
  const plan = { ...planRaw, label: lang === 'en' ? planRaw.labelEn : planRaw.label }
  const activePlan = {
    kind: activePlanData.kind,
    icon: activePlanData.icon,
    label: lang === 'en' ? activePlanData.labelEn : activePlanData.label,
    readingMinutes: activePlanData.readingMinutes,
    doneCount: activePlanData.doneCount,
    totalCount: activePlanData.totalCount,
    percent: activePlanData.percent,
    needsThemePick: activePlanData.needsThemePick ?? false,
  }

  // Progresso real (capítulo a capítulo) da sessão do dia — permite mostrar
  // "Iniciar sessão" (0%), "Continuar sessão" (entre 0 e 100%) ou "Revisar
  // sessão" (100%, já lida por completo) na Home.
  const csKeys = sessionKeys(currentSession)
  const csDoneCount = csKeys.filter(k => completedSet.has(k)).length
  const sessionProgress = csKeys.length ? Math.round((csDoneCount / csKeys.length) * 100) : 0
  const chapterSpan = currentSession.type === 'reflection' ? 0 : currentSession.chEnd - currentSession.chStart + 1
  const chapterWord = lang === 'en' ? (chapterSpan === 1 ? 'chapter' : 'chapters') : (chapterSpan === 1 ? 'capítulo' : 'capítulos')

  // Gamificação: XP vem de 3 fontes somadas aqui — leitura (capítulos,
  // livros, blocos concluídos, computeGamificationStats, com teto natural:
  // a Bíblia acaba), Metas batidas (goals.js, bônus único por meta), e
  // Oração/Reflexão do dia + bônus de rotina completa (computeRoutineXpBonus,
  // SEM teto — cresce a cada dia de uso). Cada fonte fica pura/isolada no
  // seu próprio arquivo; a soma acontece só aqui.
  const gami = computeGamificationStats(completedSet, sessionsByBlock, blocks)
  const goals = computeGoalsStatus(dailyRoutine, completedGoals, routineModules, lang)
  const goalsXpBonus = goals.reduce((sum, g) => sum + (g.completed ? g.xp : 0), 0)
  const routineXpBonus = computeRoutineXpBonus(dailyRoutine, routineModules)
  const xp = gami.xp + goalsXpBonus + routineXpBonus
  const level = levelFor(xp, lang)
  const progressToNext = levelProgress(xp, lang)
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
  // Planos por tema/cronológico sempre têm (mesmo formato de sessão com id
  // sequencial + sessionsTotal do bloco/plano sintético).
  const blockLine = (activePlanData.kind === 'fixed' && planId === 'free')
    ? blockName
    : (lang === 'en'
      ? `${blockName} · Session ${currentSession.id} of ${activeBlock.sessionsTotal}`
      : `${blockName} · Sessão ${currentSession.id} de ${activeBlock.sessionsTotal}`)

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
    xp,
    level,
    nextLevel: progressToNext.next,
    levelPercent: progressToNext.percent,
    xpForNext: progressToNext.xpForNext,
    achievements,
    goals,
    sessionsLeft: computeTotalSessions(blocks) - overall.sessionsDone,
    plan,
    activePlan,
    readingOrder,
    // Quais passos entram na rotina diária, independente do plano de
    // leitura acima (ver routineModulesStore.js) — Home/Rotina/Reflexão e
    // o RoutineStepSwitcher leem daqui em vez de plan.modules.
    routineModules: routineModules ?? DEFAULT_ROUTINE_MODULES,
    activeStudyId: activeStudyId ?? null,
    // Nome do 1º bloco na ordem ATUAL (Pentateuco ou Evangelhos) — usado no
    // texto de "Reiniciar leitura" da aba Perfil, pra não ficar hardcoded
    // "Pentateuco" quando a ordem for NT primeiro (ver ProfileScreen.jsx).
    firstBlockName: lang === 'en' ? blocks[0].nameEn : blocks[0].name,
    dailyRoutine,
    todayRoutine,
    // Plano por tema ativo sem escolha de hoje ainda (activePlan.needsThemePick)
    // — Home/Rotina mostram um convite pra escolher os textos em vez de uma
    // sessão normal (ver DailyRoutineCard/todaySessionCard), então título/
    // subtítulo aqui viram só esse convite; number/progress ficam neutros.
    todaySession: activePlan.needsThemePick
      ? {
        number: 0,
        title: lang === 'en' ? "Choose today's texts" : 'Escolha os textos de hoje',
        subtitle: lang === 'en' ? "Pick what you'll read today" : 'Escolha o que vai ler hoje',
        block: blockLine,
        progress: 0,
        needsThemePick: true,
      }
      : {
        number: currentSession.id,
        title: displayTitle,
        subtitle: currentSession.type === 'reflection'
          ? displayPassage
          : `${displayPassage} · ${chapterSpan} ${chapterWord}`,
        block: blockLine,
        progress: sessionProgress,
        needsThemePick: false,
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
  // Plano ativo "alternativo" (por tema ou cronológico) em destaque na aba
  // Plano — null significa "sem alternativo", plano ativo é o fixo de
  // sempre (planId acima). Ver resolveActivePlanSessions/buildSession.
  const [activeAltPlan, setActiveAltPlanState] = useState(null)
  // Planos por tema salvos — levantado pra cá (em vez de só existir dentro
  // de ThemePlanScreen.jsx) porque buildSession roda de forma síncrona a
  // cada render e precisa saber as sessões do plano por tema ativo sem
  // esperar um fetch.
  const [themePlans, setThemePlans] = useState([])
  // "Auto-abrir" — consumidos por ThemePlanScreen/ChronologicalPlanScreen
  // quando "Continuar sessão" (Home/Rotina) aponta pra um plano alternativo,
  // mesmo padrão de journeyEntryMode/journeyResumeSessionId abaixo.
  const [themeAutoOpenId, setThemeAutoOpenId] = useState(null)
  // Textos pra restringir a leitura quando abre um plano por tema vindo de
  // "Continuar sessão"/"Começar leitura de hoje" — null mostra o plano
  // inteiro (ex: abrindo pela lista completa em PlanScreen.jsx). Só vale
  // enquanto themeAutoOpenId aponta pro MESMO plano (ver ThemePlanScreen.jsx).
  const [themeAutoOpenKeys, setThemeAutoOpenKeys] = useState(null)
  const [chronoAutoOpenMovementId, setChronoAutoOpenMovementId] = useState(null)
  // Rotina diária (Oração/Leitura/Reflexão) — o streak exibido é derivado
  // dela (ver computeRoutineStreak), não mais de um login diário.
  const [dailyRoutine, setDailyRoutine] = useState({})
  // Quais passos entram na rotina diária (ver routineModulesStore.js) — e
  // qual Estudo guiado está ativo no momento (activeStudyStore.js), pro
  // passo "study" saber pra onde continuar. Ambos independentes do plano de
  // leitura (planId acima).
  const [routineModules, setRoutineModulesState] = useState(DEFAULT_ROUTINE_MODULES)
  const [activeStudyId, setActiveStudyIdState] = useState(null)
  const [prayerStats, setPrayerStats] = useState(DEFAULT_PRAYER_STATS)
  // Metas de constância já concluídas pra sempre (ver src/routine/goals.js/
  // goalsStore.js) — { [goalId]: { completedAt } }. Mesmo motivo de
  // dailyRoutine não entrar no refresh periódico abaixo: a detecção de
  // meta nova (useEffect logo depois do bootstrap) já atualiza isso local
  // e otimista, uma busca atrasada poderia sobrescrever com dado velho.
  const [completedGoals, setCompletedGoals] = useState({})
  // De onde veio a última sessão de leitura marcada como concluída antes de
  // ir pra Reflexão (ver ReadingBlockView.jsx/onGoToReflection) — só o
  // suficiente pra reabrir EXATAMENTE aquela sessão (não a próxima, que já
  // avançou — ver findCurrentReadingSession), de qualquer uma das 3
  // superfícies de leitura (plano fixo, por tema, cronológico). Local só —
  // nunca persistido, não precisa sobreviver a um F5. null = nenhuma
  // sessão recente conhecida (Reflexão aberta direto pela aba, por
  // exemplo) — nesse caso o botão de voltar simplesmente não aparece.
  const [lastReadSession, setLastReadSession] = useState(null)
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
  // Pedido de pular direto pra um livro+capítulo específico em modo livre
  // (browse) — usado pelos links de passagem bíblica das anotações de
  // sermão (ver openBiblePassage abaixo). Objeto novo a cada pedido (nunca
  // reaproveitado), pra JourneyScreen.jsx sempre detectar a mudança mesmo
  // quando o alvo é o mesmo capítulo de antes.
  const [browseJumpTarget, setBrowseJumpTarget] = useState(null)
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

      // Aplica plano/ordem de leitura pendentes (salvos no onboarding se a
      // confirmação de email interrompeu o cadastro) ANTES de ler
      // plano/ordem abaixo — senão a leitura corre em paralelo com essa
      // escrita e pode vencer a corrida, mostrando o default por engano
      // mesmo com o valor certo já salvo um instante depois.
      await applyPendingOnboardingChoices()
      if (cancelled) return

      const [set, userPlanId, userReadingOrder, userActiveAltPlan, userThemePlans, routine, userRoutineModules, userActiveStudyId, stats, userCompletedGoals, challenges, pendingSocial, myProfile, mySubscription, adminStatus, inviteAppliedByEmail, inviteAppliedByCode] = await Promise.all([
        getCompletedSet(user.email),
        getSelectedPlanId(user.email),
        getReadingOrder(user.email),
        getActiveAltPlan(user.email),
        getThemePlans(user.email),
        getDailyRoutine(),
        getRoutineModules(user.email),
        getActiveStudyId(user.email),
        getPrayerStats(user.email),
        getCompletedGoals(),
        getMyActiveChallenges(),
        getPendingSocialCount(),
        getMyProfile(),
        getMySubscription(),
        checkIsAdmin(),
        applyPendingInvite(),
        // Código de convite digitado num cadastro que precisou confirmar
        // email antes (ver savePendingInviteCode em AuthScreen.jsx) — só
        // existe algo pra fazer aqui se a chave estiver salva; do
        // contrário devolve false na hora, sem custo.
        redeemPendingInviteCode(),
      ])
      if (cancelled) return
      const inviteApplied = inviteAppliedByEmail || inviteAppliedByCode

      // Se um convite de acesso grátis acabou de ser aplicado, a assinatura
      // buscada acima (em paralelo) já está desatualizada — busca de novo
      // pra o PaywallGate liberar sozinho, sem precisar de F5.
      const finalSubscription = inviteApplied ? await getMySubscription() : mySubscription
      if (cancelled) return

      setAuthUser(user)
      setCompletedSet(set)
      setPlanId(userPlanId)
      setReadingOrderState(userReadingOrder)
      setActiveAltPlanState(userActiveAltPlan)
      setThemePlans(userThemePlans)
      setActiveBlockId(defaultBlockIdFor(set, userPlanId, userReadingOrder))
      setDailyRoutine(routine)
      setRoutineModulesState(userRoutineModules)
      setActiveStudyIdState(userActiveStudyId)
      setPrayerStats(stats)
      setCompletedGoals(userCompletedGoals)
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

  // Detecta metas de constância recém-batidas (ver src/routine/goals.js)
  // sempre que dailyRoutine mudar — cobre tanto marcar um passo da rotina
  // quanto o dia virar sozinho (uma janela como "300 dos últimos 365" pode
  // passar a qualificar sem nenhuma ação nova hoje). Atualiza o estado
  // local na hora (otimista, mesmo espírito de markRoutineStep) e grava no
  // backend em segundo plano — goalsStore.recordCompletedGoal já evita
  // gravar 2x a mesma meta.
  useEffect(() => {
    if (!authUser?.email) return
    const status = computeGoalsStatus(dailyRoutine, completedGoals, routineModules, 'pt')
    const newlyCompleted = status.filter(g => g.completed && !completedGoals[g.id])
    if (newlyCompleted.length === 0) return
    setCompletedGoals(prev => {
      const next = { ...prev }
      for (const g of newlyCompleted) if (!next[g.id]) next[g.id] = { completedAt: new Date().toISOString() }
      return next
    })
    for (const g of newlyCompleted) {
      recordCompletedGoal(g.id).catch(err => console.error('Failed to persist completed goal', err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyRoutine, authUser?.email])

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

  // Botão "Continuar sessão" da Home/Rotina: pula direto pra leitura de onde
  // a pessoa parou — no plano fixo (mapa de blocos) ou no plano alternativo
  // (tema/cronológico) que estiver em destaque no momento (ver
  // resolveActivePlanSessions/selectActivePlan). ReadingBlockView já
  // auto-destaca a sessão "current" sozinho (ver ReadingBlockView.jsx), não
  // precisa apontar pra uma sessão específica — só abrir o plano certo.
  function continueToday() {
    if (activeAltPlan?.type === 'theme') {
      const themePlan = themePlans.find(p => p.id === activeAltPlan.planId)
      if (themePlan) {
        const todayThemePicks = dailyRoutine[dateKey()]?.themePicks
        const activePlanData = resolveActivePlanSessions(activeAltPlan, themePlans, completedSet, blocks, sessionsByBlock, planId, todayThemePicks)
        // Sem escolha de hoje ainda — manda pra aba Plano, onde mora o
        // checklist de textos (ver PlanScreen.jsx), em vez de abrir a
        // leitura direto (não saberia o que abrir).
        if (activePlanData.needsThemePick) {
          setActiveTab('routine')
          return
        }
        setThemeAutoOpenId(themePlan.id)
        setThemeAutoOpenKeys(todayThemePicks?.planId === themePlan.id ? todayThemePicks.keys : null)
        setActiveTab('themePlan')
        return
      }
    }
    if (activeAltPlan?.type === 'chrono') {
      const chrono = deriveChronoProgress(completedSet, activeAltPlan.paceId)
      const { block } = findCurrentReadingSession(chrono.blocks, chrono.sessionsByBlock)
      setChronoAutoOpenMovementId(block.id)
      setActiveTab('chronologicalPlan')
      return
    }
    const { session: resumeSession, block } = findCurrentReadingSession(blocks, sessionsByBlock)
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

  // Link "ir pro texto" de uma passagem bíblica citada numa anotação de
  // sermão (ver NotesScreen.jsx) — abre a aba Bíblia em modo livre (browse),
  // já no capítulo certo, sem depender do plano de leitura ativo. Livro+
  // capítulo (não uma sessão do plano) é a única coisa que a anotação de
  // sermão guarda, então usa browseSessionsByBlock (1 sessão = 1 capítulo)
  // em vez de sessionsByBlock.
  function openBiblePassage(book, chapter) {
    const block = blocks.find(b => b.books.includes(book))
    if (!block) return
    const targetSession = (browseSessionsByBlock[block.id] ?? []).find(
      s => s.book === book && s.chStart <= chapter && s.chEnd >= chapter
    )
    if (!targetSession) return
    setBrowseJumpTarget({ blockId: block.id, sessionId: targetSession.id })
    setActiveTab('journey')
  }

  // Tocar num plano por tema salvo na lista da aba Plano (ver PlanScreen.jsx)
  // — abre direto na leitura dele, sem passar pela lista de ThemePlanScreen.
  // Mostra o plano INTEIRO (sem restringir aos textos de hoje) — é um jeito
  // de navegar/revisar o plano todo, diferente de "Começar leitura de hoje".
  function openThemePlanFromList(planId) {
    setThemeAutoOpenId(planId)
    setThemeAutoOpenKeys(null)
    setActiveTab('themePlan')
  }

  // "Começar leitura de hoje" no card do plano por tema ativo (ver
  // PlanScreen.jsx) — grava a escolha do dia e já abre a leitura restrita a
  // só esses textos.
  function openThemePlanToday(planId, keys) {
    chooseThemeTexts(planId, keys)
    setThemeAutoOpenId(planId)
    setThemeAutoOpenKeys(keys)
    setActiveTab('themePlan')
  }

  // "Adicionar sessões à rotina do dia" logo depois de gerar um plano por
  // tema novo (ver ThemePlanScreen.jsx) — diferente de openThemePlanToday
  // acima, não pula direto pra leitura: torna o plano ativo, grava a
  // escolha de hoje e manda pra aba Rotina, já mostrando o tempo calculado
  // (activePlan.readingMinutes, ver resolveActivePlan.js/RoutineScreen.jsx).
  function addThemePlanToRoutine(planId, keys) {
    selectActivePlan({ type: 'theme', planId })
    chooseThemeTexts(planId, keys)
    setActiveTab('routine')
  }

  // "Começar a leitura" no mesmo checklist (ThemeTextsChecklist, usado tanto
  // em PlanScreen.jsx — plano já ativo — quanto em ThemePlanScreen.jsx —
  // plano recém-gerado, ainda não ativo). selectActivePlan é idempotente
  // (reselecionar o mesmo plano não tem efeito colateral), então esta MESMA
  // função serve pros dois casos: garante que o plano está ativo e já pula
  // pra leitura, restrita aos textos escolhidos (ver openThemePlanToday).
  function startThemePlanReadingToday(planId, keys) {
    selectActivePlan({ type: 'theme', planId })
    openThemePlanToday(planId, keys)
  }

  // Tocar numa sessão da lista "Sessões do plano" (PlanScreen.jsx) quando o
  // plano ativo é o cronológico — mesma ideia de openReadingSession acima,
  // só que abrindo o movimento certo em ChronologicalPlanScreen em vez do
  // mapa de blocos de sempre.
  function openChronoSession(movementId) {
    setChronoAutoOpenMovementId(movementId)
    setActiveTab('chronologicalPlan')
  }

  // "Ir para Reflexão" a partir de uma sessão de leitura recém-concluída
  // (ver ReadingBlockView.jsx/onGoToReflection, chamado por JourneyScreen/
  // ThemePlanScreen/ChronologicalPlanScreen) — guarda COMO voltar exatamente
  // pra essa sessão antes de trocar de aba (ver backToLastReadSession).
  function goToReflectionFrom(descriptor) {
    setLastReadSession(descriptor)
    setActiveTab('reflection')
  }

  // Botão "Voltar à sessão de leitura" na Reflexão — reabre a sessão que
  // ficou guardada em lastReadSession, reaproveitando os MESMOS mecanismos
  // de "abrir sessão específica" que já existem pra cada superfície de
  // leitura, exceto no caso do plano por tema: openThemePlanToday chama
  // chooseThemeTexts de novo, o que RESTRINGIRIA a escolha de hoje só a
  // esse texto — se a pessoa tinha escolhido vários textos pra hoje e leu
  // só um antes de refletir, isso apagaria os outros da escolha do dia. Só
  // reabre a tela no texto certo, sem tocar na escolha já salva.
  function backToLastReadSession() {
    if (!lastReadSession) return
    const d = lastReadSession
    if (d.tab === 'journey') openReadingSession(d.blockId, d.sessionId)
    else if (d.tab === 'themePlan') {
      setThemeAutoOpenId(d.planId)
      setThemeAutoOpenKeys(d.keys)
      setActiveTab('themePlan')
    }
    else if (d.tab === 'chronologicalPlan') openChronoSession(d.movementId)
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
    // Mesmo motivo do bootstrap acima: aplicar ANTES de ler, pra não correr
    // contra a leitura de plano/ordem logo abaixo.
    await applyPendingOnboardingChoices()
    const [set, userPlanId, userReadingOrder, userActiveAltPlan, userThemePlans, stats, routine, userRoutineModules, userActiveStudyId, challenges, pendingSocial, myProfile, mySubscription, adminStatus, inviteAppliedByEmail, inviteAppliedByCode] = await Promise.all([
      getCompletedSet(user.email),
      getSelectedPlanId(user.email),
      getReadingOrder(user.email),
      getActiveAltPlan(user.email),
      getThemePlans(user.email),
      getPrayerStats(user.email),
      getDailyRoutine(),
      getRoutineModules(user.email),
      getActiveStudyId(user.email),
      getMyActiveChallenges(),
      getPendingSocialCount(),
      getMyProfile(),
      getMySubscription(),
      checkIsAdmin(),
      applyPendingInvite(),
      redeemPendingInviteCode(),
    ])
    const inviteApplied = inviteAppliedByEmail || inviteAppliedByCode
    const finalSubscription = inviteApplied ? await getMySubscription() : mySubscription
    setAuthUser(user)
    setCompletedSet(set)
    setPlanId(userPlanId)
    setReadingOrderState(userReadingOrder)
    setActiveAltPlanState(userActiveAltPlan)
    setThemePlans(userThemePlans)
    setActiveBlockId(defaultBlockIdFor(set, userPlanId, userReadingOrder))
    setPrayerStats(stats)
    setDailyRoutine(routine)
    setRoutineModulesState(userRoutineModules)
    setActiveStudyIdState(userActiveStudyId)
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
    setPlanId('standard')
    setReadingOrderState('ot_first')
    setActiveAltPlanState(null)
    setThemePlans([])
    setRoutineModulesState(DEFAULT_ROUTINE_MODULES)
    setActiveStudyIdState(null)
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

  // Escolher qual plano fica em destaque (aba Plano) e vira "sessão de
  // hoje" (Home/Rotina) — ref = {type:'fixed', id} | {type:'theme', planId}
  // | {type:'chrono', paceId}. Escolher um plano fixo reusa o selectPlan de
  // sempre e zera o alternativo; escolher tema/cronológico NÃO muda planId
  // (o plano fixo de fundo continua governando a aba Bíblia/Progresso).
  function selectActivePlan(ref) {
    if (ref.type === 'fixed') {
      selectPlan(ref.id)
      setActiveAltPlanState(null)
      if (authUser) {
        persistActiveAltPlan(authUser.email, null).catch(err => console.error('Failed to clear active alt plan', err))
      }
      return
    }
    setActiveAltPlanState(ref)
    if (authUser) {
      persistActiveAltPlan(authUser.email, ref).catch(err => console.error('Failed to persist active alt plan', err))
    }
  }

  // Escolhe quais textos de um plano por tema a pessoa vai ler HOJE (card do
  // plano ativo, ver PlanScreen.jsx) — mesmo padrão otimista de
  // markRoutineStep abaixo: atualiza dailyRoutine local na hora, persiste em
  // segundo plano. Reseta sozinho a cada dia novo (ver
  // src/routine/dailyRoutineStore.js/setThemePicks).
  function chooseThemeTexts(planId, keys) {
    if (!authUser) return
    const key = dateKey()
    setDailyRoutine(prev => ({ ...prev, [key]: { ...prev[key], themePicks: { planId, keys } } }))
    setThemePicks(planId, keys).catch(err => console.error('Failed to persist theme picks', err))
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
    // Reflexão concluída — "Voltar à sessão de leitura" (ver
    // lastReadSession/backToLastReadSession abaixo) deixa de fazer sentido
    // depois disso, então some sozinho em vez de continuar apontando pra
    // uma sessão já fechada.
    if (step === 'reflection' && done) setLastReadSession(null)
  }

  // Liga/desliga um passo da rotina diária (Oração/Leitura/Estudo guiado/
  // Reflexão) — independente de qual plano de leitura está ativo (ver
  // "Meu Plano"/routineModulesStore.js). Atualiza o estado local na hora,
  // persiste em segundo plano.
  function toggleRoutineModule(key, on) {
    if (!authUser) return
    setRoutineModulesState(prev => {
      const next = on ? [...new Set([...prev, key])] : prev.filter(m => m !== key)
      persistRoutineModules(authUser.email, next).catch(err => console.error('Failed to persist routine modules', err))
      return next
    })
  }

  // Qual Estudo guiado está ativo (ver activeStudyStore.js) — passar null
  // limpa a escolha (ex: apagar/trocar de estudo).
  function selectActiveStudy(studyId) {
    if (!authUser) return
    setActiveStudyIdState(studyId)
    persistActiveStudyId(authUser.email, studyId).catch(err => console.error('Failed to persist active study', err))
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

  const session = buildSession(authUser, blocks, sessionsByBlock, dailyRoutine, planId, completedSet, prayerStats, readingOrder, activeAltPlan, themePlans, completedGoals, routineModules, activeStudyId)

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
    routine: <RoutineScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} completedSet={completedSet} themePlans={themePlans} activeAltPlan={activeAltPlan} todayThemePicks={dailyRoutine[dateKey()]?.themePicks} onNavigate={navigateTo} onContinueSession={continueToday} onMarkRoutineStep={markRoutineStep} onToggleRoutineModule={toggleRoutineModule} onSelectActiveStudy={selectActiveStudy} onSelectActivePlan={selectActivePlan} onOpenThemePlan={openThemePlanFromList} onAddSessionsToRoutine={addThemePlanToRoutine} onStartThemeReading={startThemePlanReadingToday} onToggleSession={toggleSession} onOpenSession={openReadingSession} onOpenChronoSession={openChronoSession} />,
    contact: <ContactScreen session={session} authUser={authUser} />,
    notes:   <NotesScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} onOpenBiblePassage={openBiblePassage} />,
    applicationPhrases: <ApplicationPhrasesScreen session={session} authUser={authUser} />,
    themePlan: <ThemePlanScreen session={session} authUser={authUser} completedSet={completedSet} plans={themePlans} isAdmin={isAdmin} onPlansChanged={setThemePlans} autoOpenPlanId={themeAutoOpenId} autoOpenKeys={themeAutoOpenKeys} onToggleSession={toggleSession} onToggleChapter={toggleChapter} onNavigate={navigateTo} onAddSessionsToRoutine={addThemePlanToRoutine} onStartThemeReading={startThemePlanReadingToday} onGoToReflectionFrom={goToReflectionFrom} />,
    chronologicalPlan: <ChronologicalPlanScreen session={session} authUser={authUser} completedSet={completedSet} paceId={activeAltPlan?.type === 'chrono' ? activeAltPlan.paceId : 'standard'} autoOpenMovementId={chronoAutoOpenMovementId} onToggleSession={toggleSession} onToggleChapter={toggleChapter} onNavigate={navigateTo} onGoToReflectionFrom={goToReflectionFrom} />,
    journey: <JourneyScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} browseSessionsByBlock={browseSessionsByBlock} completedSet={completedSet} onToggleSession={toggleSession} onToggleChapter={toggleChapter} initialBlockId={activeBlockId} entryMode={journeyEntryMode} resumeSessionId={journeyResumeSessionId} browseJumpTarget={browseJumpTarget} onNavigate={navigateTo} onGoToReflectionFrom={goToReflectionFrom} />,
    groups:  !meetsMinAge ? <MinAgeRestricted lang={session.lang} /> : <GroupsScreen session={session} authUser={authUser} onSocialChange={refreshSocialState} />,
    studies: <StudiesScreen session={session} authUser={authUser} onNavigate={navigateTo} onContinueSession={continueToday} onMarkRoutineStep={markRoutineStep} onSelectActiveStudy={selectActiveStudy} />,
    stats:   <ProgressScreen session={session} blocks={blocks} onNavigate={navigateTo} />,
    upgrade: <UpgradeScreen session={session} subscription={subscription} onSubscriptionRefreshed={refreshSubscription} />,
    profile: <ProfileScreen  session={session} authUser={authUser} subscription={subscription} isAdmin={isAdmin} onNavigate={navigateTo} onLogout={handleLogout} onResetProgress={handleResetProgress} onChangeLanguage={changeLanguage} onChangeReadingOrder={selectReadingOrder} onProfileUpdated={handleProfileUpdated} />,
    // Chave só existe pra quem é admin — evita montar (e disparar as
    // buscas de) AdminScreen pra qualquer conta comum.
    ...(isAdmin ? { admin: <AdminScreen session={session} /> } : {}),
  }

  return (
    <div className="app-shell">
      {/* Navegação lateral — só visível em telas ≥768px (ver index.css) */}
      <Sidebar activeTab={activeTab} onNavigate={navigateTo} avatarInitials={session.avatarInitials} avatarUrl={myAvatarUrl} userName={session.userName} groupsHasPending={pendingSocialCount > 0} disabledTabs={disabledTabs} pendingCount={pendingSocialCount} lang={session.lang} largeText={largeText} onToggleLargeText={toggleLargeText} />

      <div className="app-main">
        {/* Header fixo (logo + avatar), presente em todas as abas — só em telas <768px */}
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
                <PrayerScreen session={session} authUser={authUser} onPrayerCompleted={() => markRoutineStep('prayer')} onContinueSession={continueToday} onNavigate={navigateTo} />
              </div>
            )}
            {reflectionVisitedRef.current && (
              <div style={{ display: activeTab === 'reflection' ? 'contents' : 'none' }}>
                <ReflectionScreen session={session} authUser={authUser} onReflectionCompleted={() => markRoutineStep('reflection')} hasPreviousReadingSession={!!lastReadSession} onBackToReading={backToLastReadSession} onNavigate={navigateTo} onContinueSession={continueToday} />
              </div>
            )}
          </div>
        </div>

        {/* Navegação inferior — só em telas <768px */}
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
