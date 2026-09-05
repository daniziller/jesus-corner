import { useState, useMemo, useEffect, useRef } from 'react'
import { Analytics } from '@vercel/analytics/react'
import AppHeader from './components/AppHeader'
import AppIcon from './icons/AppIcon'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
import { useIsDesktop } from './utils/useIsDesktop'
import AuthScreen, { HAS_AUTH_KEY } from './screens/AuthScreen'
import OnboardingFlow from './screens/OnboardingFlow'
import WelcomeScreen from './screens/WelcomeScreen'
import BrandMark from './components/BrandMark'
import BrandLogo from './components/BrandLogo'
import SignupScreen from './screens/SignupScreen'
import ConsentRefreshScreen from './screens/ConsentRefreshScreen'
import { needsConsentRefresh } from './privacy/consent'
import LanguageSelectScreen from './screens/LanguageSelectScreen'
import { hasGuestRow, migrateGuestRow } from './backend/userDataStore'
import { getGuestInviteThreshold, dismissGuestInvite, clearGuestInviteState } from './onboarding/guestInviteStore'
import { splitMinutes, saveOnboardingAnswers, savePendingReminder, getPendingReminder, clearPendingReminder } from './onboarding/onboardingAnswers'
import { setSavedPrayerMinutes } from './prayer/prayerDurationStore'
import { setSavedReflectionMinutes } from './reflection/reflectionDurationStore'
import HomeScreen from './screens/HomeScreen'
import PrayerScreen from './screens/PrayerScreen'
import ReflectionScreen from './screens/ReflectionScreen'
import RoutineScreen from './screens/RoutineScreen'
import AdjustPlanScreen from './screens/AdjustPlanScreen'
import AiSettingsScreen from './screens/AiSettingsScreen'
import ContactScreen from './screens/ContactScreen'
import NotesScreen from './screens/NotesScreen'
import ApplicationPhrasesScreen from './screens/ApplicationPhrasesScreen'
import ThemePlanScreen from './screens/ThemePlanScreen'
import ChronologicalPlanScreen from './screens/ChronologicalPlanScreen'
import JourneyScreen from './screens/JourneyScreen'
import GroupsScreen from './screens/GroupsScreen'
import StudiesScreen from './screens/StudiesScreen'
import InductiveMethodScreen from './screens/InductiveMethodScreen'
import ProgressScreen from './screens/ProgressScreen'
import ProfileScreen from './screens/ProfileScreen'
import ProfileSheet from './screens/ProfileSheet'
import LanguageSettingsScreen from './screens/LanguageSettingsScreen'
import GroupAdminScreen from './screens/GroupAdminScreen'
import UpgradeScreen from './screens/UpgradeScreen'
import AdminScreen from './screens/AdminScreen'
import HandsFreeScreen from './screens/HandsFreeScreen'
import { getCurrentUser, logout, updateLanguage } from './auth/authStore'
import { getCompletedSet, markKeysDone, markKeysUndone, resetProgress } from './progress/progressStore'
import { deriveProgress, pickActiveBlock, computeOverallStats, computeGamificationStats, computeTotalSessions, sessionKeys, computeCompletedBooks, computeBookChapterCounts } from './utils/progress'
import { levelFor, levelProgress } from './utils/levels'
import { isAtLeast } from './utils/age'
import { computeUnlockedAchievements } from './utils/achievements'
import { getSeenAchievements, markAchievementsSeen, ensureSeeded } from './achievements/seenAchievementsStore'
import AchievementCelebration from './components/AchievementCelebration'
import { getPrayerStats } from './prayer/prayerStatsStore'
import { getDailyRoutine, setStepDone, setThemePicks } from './routine/dailyRoutineStore'
import { computeRoutineXpBonus, DEFAULT_ROUTINE_MODULES, computeWeekGoalProgress, computeWeeksInGoal, DEFAULT_WEEKLY_GOAL_DAYS } from './routine/routineStreak'
import { getWeeklyGoalDays, setWeeklyGoalDays as persistWeeklyGoalDays } from './routine/weeklyGoalStore'
import { getRoutineModules, setRoutineModules as persistRoutineModules } from './routine/routineModulesStore'
import { getActiveStudyId, setActiveStudyId as persistActiveStudyId } from './studies/activeStudyStore'
import { dateKey } from './utils/dateKey'
import { getSelectedPlanId, setSelectedPlanId } from './plan/planStore'
import { getActiveAltPlan, setActiveAltPlan as persistActiveAltPlan } from './plan/activePlanStore'
import { resolveActivePlanSessions } from './plan/resolveActivePlan'
import { getThemePlans } from './themePlans/themePlansStore'
import { deriveChronoProgress } from './data/chronologicalPlan'
import { getReadingOrder, setReadingOrder as persistReadingOrder } from './reading/readingOrderStore'
import { getReadingSeconds } from './reading/readingTimeStore'
import HomeDashboard, { shouldShowDashboard } from './screens/HomeDashboard'
import ChapterRoomScreen from './screens/ChapterRoomScreen'
import RoutineCompleteScreen from './screens/RoutineCompleteScreen'
import MonthRecapScreen, { monthLabel, recapSummary } from './screens/MonthRecapScreen'
import { ensureSnapshotAndGetDueRecap, markRecapShown } from './recap/monthlyRecapStore'
import { renderRecapImage, shareRecapImage } from './recap/recapImage'
import { getHighlights } from './highlights/highlightsStore'
import { saveNote } from './notes/notesStore'
import { getLastReadPosition, setLastReadPosition } from './reading/lastReadPositionStore'
import { PLANS } from './data/bibleBlocks'
import { getAppLanguage, setAppLanguage } from './i18n/appLanguageStore'
import { getLargeTextEnabled, setLargeTextEnabled } from './utils/textScaleStore'
import { detectLanguageFromIp } from './i18n/detectLanguage'
import { t } from './i18n'
import { getMyActiveChallenges, recordChallengeProgress } from './groups/challengesStore'
import { getPendingGroupInvitesCount, getMyGroups } from './groups/groupsStore'
import { getPendingFriendRequestsCount } from './friends/friendsStore'
import { getMyProfile } from './profile/profileStore'
import { getMySubscription, isPremiumActive } from './billing/subscriptionStore'
import { resolveEntitlement } from './billing/entitlement'
import { checkIsAdmin } from './admin/adminStore'
import { applyPendingInvite, redeemPendingInviteCode } from './invites/inviteStore'
import { applyPendingOnboardingChoices } from './onboarding/pendingOnboardingChoices'
import { logActivity } from './activity/activityStore'
import { syncPushTimezone, subscribeToPush } from './notifications/pushStore'
import { avatarInitialsOf } from './utils/avatarInitials'

function defaultBlockIdFor(completedSet, planId, readingOrder) {
  return pickActiveBlock(deriveProgress(completedSet, planId, readingOrder).blocks).id
}

// Sessão (e respectivo bloco) que o card "Continue sua leitura" da Home (e
// o botão "Continuar sessão") reabre.
//
// Prioridade 1: o ÚLTIMO texto que a pessoa leu, em qualquer lugar do app
// — a sessão que contém esse capítulo (lastRead = { book, chapter }, ver
// lastReadPositionStore.js, gravado tanto na leitura guiada quanto na
// navegação livre pela aba Bíblia). Se ela releu Gênesis 1 estando em
// Levítico, o card volta pra Gênesis 1 — de propósito: "continuar" é
// sempre "de onde eu parei", não "a próxima da fila".
//
// Prioridade 2 (nada lido ainda, ou o capítulo lido não existe no plano
// ativo — ex: plano por tema): a primeira sessão pendente na ordem do
// plano (blocks já vem ordenado conforme reading_order).
//
// Prioridade 3 (plano inteiro concluído): a última sessão do último bloco,
// mostrada como "Revisar sessão" (ver ctaLabel em HomeScreen.jsx).
function findCurrentReadingSession(blocks, sessionsByBlock, lastRead = null) {
  if (lastRead?.book && lastRead?.chapter) {
    for (const block of blocks) {
      const session = sessionsByBlock[block.id].find(
        s => s.type !== 'reflection'
          && s.book === lastRead.book
          && s.chStart <= lastRead.chapter
          && s.chEnd >= lastRead.chapter
      )
      if (session) return { session, block }
    }
  }
  for (const block of blocks) {
    const session = sessionsByBlock[block.id].find(s => s.status !== 'done')
    if (session) return { session, block }
  }
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
function buildSession(authUser, blocks, sessionsByBlock, dailyRoutine, planId, completedSet, prayerStats, readingOrder, activeAltPlan, themePlans, routineModules, activeStudyId, lastReadPosition) {
  const lang = authUser.language ?? 'pt'
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
  const { session: currentSession, block: activeBlock } = findCurrentReadingSession(activePlanData.blocks, activePlanData.sessionsByBlock, lastReadPosition)
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

  // Gamificação: XP vem de 2 fontes somadas aqui — leitura (capítulos,
  // livros, blocos concluídos, computeGamificationStats, com teto natural:
  // a Bíblia acaba) e Oração/Reflexão do dia + bônus de rotina completa
  // (computeRoutineXpBonus, SEM teto — cresce a cada dia de uso). Cada
  // fonte fica pura/isolada no seu próprio arquivo; a soma acontece só
  // aqui. (Uma 3ª fonte existiu — Metas batidas, routine/goals.js — mas
  // era inteiramente baseada em sequência de dias corridos, sem nenhuma
  // tela mostrando essas metas; removida junto com a sequência, decisão
  // da autora.)
  const gami = computeGamificationStats(completedSet, sessionsByBlock, blocks)
  const routineXpBonus = computeRoutineXpBonus(dailyRoutine, routineModules)
  const achievements = computeUnlockedAchievements({
    ...gami,
    ...prayerStats,
    biblePercent: overall.biblePercent,
    blockDone: id => blocks.find(b => b.id === id)?.status === 'done',
  }, lang)
  const achievementsXpBonus = achievements.reduce((sum, a) => sum + (a.unlocked ? (a.xp ?? 0) : 0), 0)
  const xp = gami.xp + routineXpBonus + achievementsXpBonus
  const level = levelFor(xp, lang)
  const progressToNext = levelProgress(xp, lang)

  const displayTitle = lang === 'en' ? currentSession.titleEn : currentSession.title
  const displayPassage = lang === 'en' ? currentSession.passageEn : currentSession.passage
  const blockName = lang === 'en' ? activeBlock.nameEn : activeBlock.name

  // Bloco atual da Bíblia pra Home (redesign 1a) — nome do bloco em foco,
  // ícone, percentual, e "Livro X de Y capítulos" quando a sessão de hoje é
  // de leitura (reflexão de fim de livro não tem capítulo). O total de
  // capítulos do livro sai da mesma fonte de Progresso/Notas.
  const bookChapterCounts = computeBookChapterCounts(sessionsByBlock)
  const currentBookDisplay = lang === 'en' ? (currentSession.bookEn || currentSession.book) : currentSession.book
  const currentBlock = {
    name: blockName,
    icon: activeBlock.icon,
    percent: activeBlock.percent ?? 0,
    // Peças soltas pro painel 12a ("Gênesis 40 de 50").
    book: currentBookDisplay,
    chapter: (currentSession.type === 'reflection' || currentSession.chStart == null) ? null : currentSession.chStart,
    bookChapters: bookChapterCounts[currentSession.book] ?? null,
    chapterLabel: (currentSession.type === 'reflection' || currentSession.chStart == null)
      ? null
      : (lang === 'en'
        ? `${currentBookDisplay} ${currentSession.chStart} of ${bookChapterCounts[currentSession.book] ?? '?'} chapters`
        : `${currentBookDisplay} ${currentSession.chStart} de ${bookChapterCounts[currentSession.book] ?? '?'} capítulos`),
  }
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
    achievementsXp: achievementsXpBonus,
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
    currentBlock,
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
        titleEn: currentSession.titleEn,
        subtitle: currentSession.type === 'reflection'
          ? displayPassage
          : `${displayPassage} · ${chapterSpan} ${chapterWord}`,
        block: blockLine,
        progress: sessionProgress,
        needsThemePick: false,
        // Cru da sessão de leitura de hoje — o modo mãos-livres
        // (HandsFreeScreen.jsx) precisa disso pra buscar e ler o texto em
        // voz alta. `type` distingue sessão de leitura de sessão de
        // reflexão de fechamento de livro (essa não tem texto pra ler).
        book: currentSession.book,
        bookEn: currentSession.bookEn,
        chStart: currentSession.chStart ?? null,
        chEnd: currentSession.chEnd ?? null,
        type: currentSession.type,
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
  // Sidebar (nav lateral) só é visível em telas ≥768px (ver index.css) —
  // antes ficava sempre montada, só escondida por CSS no mobile, o que
  // disparava os efeitos de montagem dela (busca de notificações etc.) à
  // toa em todo carregamento no celular. Agora só monta quando realmente
  // aparece.
  const isDesktop = useIsDesktop()
  // Fica true assim que a sessão do Supabase (logado ou não) e, se logado, o
  // progresso salvo, terminam de carregar — antes disso mostramos uma tela
  // de carregamento em vez de renderizar com dados parciais/errados.
  const [bootstrapped, setBootstrapped] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  // Sessão ativa cujo consentimento obrigatório está faltando ou é de uma
  // versão anterior da política (ver POLICY_VERSION em src/privacy/consent.js).
  // Bloqueia o app até a pessoa reconsentir ou sair — o AuthScreen já cobre
  // o caso de quem chega pelo login; isto cobre quem já estava com sessão
  // aberta quando a política mudou.
  const [consentRefreshNeeded, setConsentRefreshNeeded] = useState(false)
  // "Já tenho conta" (boas-vindas 13a / ritmo do convidado / criar conta
  // 13c) — força AuthScreen em modo login mesmo num dispositivo que nunca
  // autenticou aqui (sem isso, cairia sempre nas boas-vindas do convidado,
  // mesmo pra quem já tem conta).
  const [authScreenForced, setAuthScreenForced] = useState(false)
  // Botão de voltar do login (13b) / "Continuar sem conta" (13c) num
  // dispositivo que já autenticou antes: em vez de cair de novo no login,
  // mostra as boas-vindas e deixa seguir como convidado.
  const [loginDismissed, setLoginDismissed] = useState(false)
  // Boas-vindas (13a) — a capa do app pra quem nunca autenticou neste
  // dispositivo. "Começar a ler" segue pro onboarding de 7 telas
  // (OnboardingFlow, 15a–15e); "Já tenho conta" vai pro login.
  const [welcomeDone, setWelcomeDone] = useState(false)
  // Reflexão com perguntas geradas (10d) na tela — ReflectionScreen avisa
  // (onAiFlowChange) pra o shell tirar cabeçalho e barra, como no quadro.
  const [reflectionAiActive, setReflectionAiActive] = useState(false)
  // Comunidade (5d): o painel Bento de UM grupo aberto tem cabeçalho
  // próprio (ver GroupHomeView) e não precisa do AppHeader antigo por
  // cima; a lista de vários grupos (fora do quadro 5d, sem desenho
  // próprio) continua dependendo dele. GroupsScreen avisa qual dos dois
  // está de fato na tela (onDetailOpenChange) pra o shell decidir.
  const [groupsDetailOpen, setGroupsDetailOpen] = useState(false)
  // Perfil como folha (quadro 19a) — sobe por cima da tela atual (com a
  // barra de abas continuando visível/tocável embaixo dela), em vez de
  // navegar pra uma aba própria. Alcançado pelo avatar (Home e AppHeader,
  // nas telas ainda com AppHeader — ver comentário mais abaixo). O
  // Sidebar de telas ≥768px continua indo pra 'profile' (ProfileScreen
  // antigo, tela cheia) — layout de desktop fora do escopo deste redesign.
  const [profileOpen, setProfileOpen] = useState(false)
  // Status da assinatura (Stripe) — ver src/billing/subscriptionStore.js.
  // null enquanto não carregou ou pra quem nunca assinou.
  const [subscription, setSubscription] = useState(null)
  // Só true pra quem está na allowlist ADMIN_EMAILS (checado no servidor,
  // ver api/_lib/adminAuth.js) — controla só se a aba Admin aparece; a
  // segurança de verdade é sempre re-checada em cada api/admin/*.js.
  const [isAdmin, setIsAdmin] = useState(false)
  // Três tiers (ver src/billing/entitlement.js): 'free' (leitura + oração/
  // reflexão avulsas + progresso básico), 'premium' (+ voz natural, mãos-
  // livres, rotina guiada, XP/níveis/conquistas, cronológico, notas,
  // comunidade) e 'premium_ai' (+ recursos de IA). Não há mais paywall
  // rígido — o tier grátis usa o app, só com menos recursos; cada recurso
  // pago gatea a si mesmo onde é usado (lockedTabs abaixo + session.hasPremium/
  // hasAI nas telas + PremiumRequired/PremiumLockCard).
  const entitlement = resolveEntitlement(subscription)
  const hasPremium = entitlement.hasPremium
  // Restrição de idade (18+) da Comunidade é independente da assinatura —
  // contas sem data de nascimento (criadas antes desse campo existir) não
  // são restringidas por idade (ver isAtLeast). O cadastro novo já exige
  // 18+ (ver src/privacy/minAge.js); este gate cobre as contas 12–17 que
  // podem existir de antes desse corte.
  const meetsMinAge = isAtLeast(authUser?.birthdate, 18)
  // disabledTabs — a aba nem existe (idade), fica esmaecida na barra.
  // lockedTabs — a aba existe e aparece normal na barra (redesign 1e —
  // "tirar os cadeados da barra", etapa 6), mas pede Premium: o clique é
  // encaminhado pra tela de assinar (ver navigateTo) em vez de abrir a
  // aba; a tela em si mostra o cadeado (PremiumRequired/PremiumLockCard).
  const disabledTabs = meetsMinAge ? [] : ['groups']
  // 'notes' (Biblioteca) sempre foi Premium (decisão da restrição do tier
  // grátis, antes desta leva) — agora que ocupa slot fixo na barra
  // (redesign 1e/etapa 6, no lugar de Progresso), precisa estar aqui pro
  // clique ser encaminhado pra 'upgrade' em vez de abrir uma tela em
  // branco (NotesScreen só monta pra hasPremium, ver mais abaixo).
  const lockedTabs = hasPremium ? [] : ['routine', 'groups', 'notes']
  const [appLanguage, setAppLanguageState] = useState(getAppLanguage)
  const [completedSet, setCompletedSet] = useState(() => new Set())
  const [activeTab, setActiveTab] = useState('home')
  // Tempo de leitura acumulado (segundos) — "horas de leitura" do painel
  // 12a. Relido sempre que a Home volta a ficar ativa, porque quem soma é o
  // leitor (ver useReadingTimer em ReadingBlockView.jsx), em lotes.
  const [readingSeconds, setReadingSeconds] = useState(0)
  // Leitura social (17a–17c): grupos da pessoa (o botão "Grupo" do leitor usa
  // o primeiro), a sala de capítulo aberta e a retrospectiva do mês devida.
  const [myGroups, setMyGroups] = useState([])
  const [chapterRoom, setChapterRoom] = useState(null) // { group, book, bookEn, chapter }
  const [monthRecap, setMonthRecap] = useState(null)
  const recapCheckedFor = useRef(null)
  useEffect(() => {
    if (activeTab !== 'home' || !authUser) return
    getReadingSeconds().then(setReadingSeconds).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authUser])
  // Pilha de abas visitadas — alimenta o botão "Voltar" global (header/
  // sidebar, ver goBack abaixo), pra sempre devolver a pessoa pra página
  // que ela estava antes, não importa por qual tela do app ela veio. Toda
  // troca de aba de verdade empilha a aba que estava sendo deixada (ver
  // goToTab); "Voltar" desempilha e volta pra ela, sem empilhar de novo (senão
  // "Voltar" agindo pra frente e pra trás criaria um loop). Teto de 20
  // entradas — suficiente pra qualquer sequência real de navegação, evita
  // a pilha crescer sem limite numa sessão longa.
  const [tabHistory, setTabHistory] = useState([])
  // "Rotina guiada" — quando a pessoa toca em Iniciar em Meu Plano, o app
  // encadeia os passos (Oração → Leitura → Reflexão): cada passo, ao ser
  // concluído, abre o próximo sozinho, sem voltar pro menu. null = fora do
  // modo guiado. { steps: [...], idx } — steps é só prayer/reading/reflection
  // que estão ligados, na ordem; idx é o passo atual. Ver advanceGuided,
  // startGuidedRoutine e GuidedFlowBanner.
  const [guidedFlow, setGuidedFlow] = useState(null)
  const guidedFlowRef = useRef(null)
  guidedFlowRef.current = guidedFlow
  // Snapshot pra tela de fechamento do dia (21c, RoutineCompleteScreen) —
  // { steps, readingSession }, montado no fim da rotina guiada (ver
  // advanceGuided abaixo) e limpo ao voltar pra Hoje. steps é a mesma lista
  // de guidedFlow.steps (prayer/reading/reflection incluídos nesta rotina);
  // readingSession é lastReadSession capturado ANTES de session.todaySession
  // avançar pra próxima sessão.
  const [routineCompleteInfo, setRoutineCompleteInfo] = useState(null)
  // Trava enquanto a transição de um passo pro próximo está agendada (ver
  // advanceGuided) — evita agendar duas vezes se markRoutineStep disparar
  // mais de uma vez pro mesmo passo.
  const guidedAdvancingRef = useRef(false)
  // Espelho do `session` do render atual — funções de callback (toggleSession,
  // advanceGuided) precisam ler a sessão de hoje sem depender da ordem em
  // que são declaradas (session só é montada bem mais abaixo, no render).
  const sessionRef = useRef(null)
  // Folha de celebração de conquista recém-desbloqueada (redesign 1f/etapa 5,
  // ver AchievementCelebration.jsx) — Progresso não mostra mais uma grade
  // permanente, então isto é a única forma de saber que ganhou uma. Lida de
  // `sessionRef` (não de `session`, que só existe mais abaixo, depois dos
  // retornos antecipados de bootstrap/login/consentimento) e roda a cada
  // render; internamente é barato (1 leitura de localStorage) depois da
  // primeira vez. `celebratingIdRef` evita reabrir a mesma folha enquanto ela
  // já está na tela, mesmo com `session.achievements` sendo um array novo a
  // cada render.
  const [celebratingAchievement, setCelebratingAchievement] = useState(null)
  const celebratingIdRef = useRef(null)
  useEffect(() => {
    const s = sessionRef.current
    if (!s || !s.hasPremium) return
    const unlockedIds = s.achievements.filter(a => a.unlocked).map(a => a.id)
    ensureSeeded(unlockedIds)
    if (celebratingIdRef.current) return
    const seen = getSeenAchievements()
    const nextId = unlockedIds.find(id => !seen.has(id))
    if (nextId) {
      celebratingIdRef.current = nextId
      setCelebratingAchievement(s.achievements.find(a => a.id === nextId))
    }
  })
  function dismissAchievementCelebration() {
    if (celebratingIdRef.current) markAchievementsSeen([celebratingIdRef.current])
    celebratingIdRef.current = null
    setCelebratingAchievement(null)
  }
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
  // Notas também fica sempre montada (mesma técnica) — o formulário de
  // anotação de sermão tem campos demais pra perder se a pessoa sair pra
  // conferir um versículo (ver link "ir pro texto" dentro do próprio
  // formulário, em NotesScreen.jsx) e usar "Voltar" pra retornar; sem isso,
  // trocar de aba e voltar remontaria a tela do zero e apagaria o rascunho.
  const notesVisitedRef = useRef(false)
  // Estudos também — mesmo motivo: o formulário do estudo indutivo
  // (Observação/Interpretação/Verdade Atemporal/Aplicação, ver
  // StudiesScreen.jsx) tem um botão "Ler o texto na Bíblia" que pula pra
  // outra aba antes de a pessoa necessariamente ter salvo o que escreveu.
  const studiesVisitedRef = useRef(false)
  const [planId, setPlanId] = useState('standard')
  const [readingOrder, setReadingOrderState] = useState('ot_first')
  const [weeklyGoalDays, setWeeklyGoalDaysState] = useState(DEFAULT_WEEKLY_GOAL_DAYS)
  const [activeBlockId, setActiveBlockId] = useState(1)
  // "Último texto lido" ({ book, chapter }, por dispositivo — ver
  // lastReadPositionStore.js). Alimenta o card "Continue sua leitura" da
  // Home e o botão "Continuar sessão", que reabrem exatamente esse
  // capítulo (ver findCurrentReadingSession). Relido do localStorage a
  // cada troca de aba e a cada capítulo marcado — é onde ele muda (dentro
  // de ReadingBlockView e em toggleChapter/toggleSession abaixo).
  const [lastReadPosition, setLastReadPositionState] = useState(getLastReadPosition)
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
  // Estudo pra abrir automaticamente ao entrar na aba Estudos vindo de um
  // card de Estudo na Biblioteca (ver NotesScreen.jsx/onOpenStudy) — mesmo
  // padrão de themeAutoOpenId acima. Consumido (limpo) pelo próprio
  // StudiesScreen assim que abre o estudo, senão voltar depois pra Estudos
  // pela barra reabriria o mesmo estudo sem a pessoa ter pedido.
  const [libraryOpenStudyId, setLibraryOpenStudyId] = useState(null)
  const [chronoAutoOpenMovementId, setChronoAutoOpenMovementId] = useState(null)
  // Rotina diária (Oração/Leitura/Reflexão) — alimenta a meta semanal
  // (isDayGoalMet/computeWeeksInGoal, routineStreak.js), não mais um login
  // diário.
  const [dailyRoutine, setDailyRoutine] = useState({})
  // Quais passos entram na rotina diária (ver routineModulesStore.js) — e
  // qual Estudo guiado está ativo no momento (activeStudyStore.js), pro
  // passo "study" saber pra onde continuar. Ambos independentes do plano de
  // leitura (planId acima).
  const [routineModules, setRoutineModulesState] = useState(DEFAULT_ROUTINE_MODULES)
  const [activeStudyId, setActiveStudyIdState] = useState(null)
  const [prayerStats, setPrayerStats] = useState(DEFAULT_PRAYER_STATS)
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
  // e a regra html.large-text .app-content-inner { zoom } em index.css.
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

  // ── Retrospectiva do mês (17b) ──
  // Uma vez por sessão de usuário: garante o snapshot do mês e, se o mês
  // anterior tem retrospectiva ainda não mostrada, abre a tela.
  useEffect(() => {
    if (!bootstrapped || !authUser || recapCheckedFor.current === (authUser.email ?? 'guest')) return
    recapCheckedFor.current = authUser.email ?? 'guest'
    let cancelled = false
    ;(async () => {
      const [seconds, hl] = await Promise.all([getReadingSeconds().catch(() => 0), getHighlights(authUser.email).catch(() => [])])
      const recap = await ensureSnapshotAndGetDueRecap({
        chaptersRead: [...completedSet].filter(k => !k.endsWith(':reflection')).length,
        readingSeconds: seconds,
        completedBooks: [...computeCompletedBooks(completedSet, sessionsByBlock)],
        highlights: hl,
        dailyRoutine,
        weeklyGoalDays,
      })
      if (!cancelled && recap) { setMonthRecap(recap); goToTab('monthRecap') }
    })().catch(err => console.error('Failed to compute month recap', err))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapped, authUser])

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
      let user = await getCurrentUser()
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
        // Sem sessão real, mas este dispositivo já tem progresso de
        // convidado (redesign 1g/etapa 7 — ver userDataStore.js) — retoma
        // direto no meio do app em vez de mostrar a pergunta de ritmo de
        // novo. Sem progresso nenhum ainda, o render mais abaixo mostra
        // OnboardingFlow (as perguntas do onboarding, antes de ler).
        if (!hasGuestRow()) {
          if (!cancelled) setBootstrapped(true)
          return
        }
        user = buildGuestUser()
      } else {
        // Sessão real encontrada com progresso de convidado ainda por
        // migrar (ex: voltando do redirect de confirmação de email depois
        // de ler como convidado e só então cadastrar) — mesma função que
        // SignupStep chama no caminho comum; aqui cobre o caminho que passa
        // por fora dele. Sem progresso de convidado, não faz nada.
        await migrateGuestRow().catch(err => console.error('Failed to migrate guest progress', err))
        clearGuestInviteState()
      }

      // Aplica plano/ordem de leitura pendentes (salvos no onboarding se a
      // confirmação de email interrompeu o cadastro) ANTES de ler
      // plano/ordem abaixo — senão a leitura corre em paralelo com essa
      // escrita e pode vencer a corrida, mostrando o default por engano
      // mesmo com o valor certo já salvo um instante depois.
      await applyPendingOnboardingChoices()
      if (cancelled) return

      const [set, userPlanId, userReadingOrder, userWeeklyGoalDays, userActiveAltPlan, userThemePlans, routine, userRoutineModules, userActiveStudyId, stats, challenges, pendingSocial, myProfile, mySubscription, adminStatus, inviteAppliedByEmail, inviteAppliedByCode, groups] = await Promise.all([
        getCompletedSet(user.email),
        getSelectedPlanId(user.email),
        getReadingOrder(user.email),
        getWeeklyGoalDays(user.email),
        getActiveAltPlan(user.email),
        getThemePlans(user.email),
        getDailyRoutine(),
        getRoutineModules(user.email),
        getActiveStudyId(user.email),
        getPrayerStats(user.email),
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
      getMyGroups().catch(() => []),
      ])
      if (cancelled) return
      const inviteApplied = inviteAppliedByEmail || inviteAppliedByCode

      // Se um convite de acesso grátis acabou de ser aplicado, a assinatura
      // buscada acima (em paralelo) já está desatualizada — busca de novo
      // pra os recursos Premium liberarem sozinhos, sem precisar de F5.
      const finalSubscription = inviteApplied ? await getMySubscription() : mySubscription
      if (cancelled) return

      setAuthUser(user)
      setCompletedSet(set)
      setPlanId(userPlanId)
      setReadingOrderState(userReadingOrder)
      setWeeklyGoalDaysState(userWeeklyGoalDays)
      setActiveAltPlanState(userActiveAltPlan)
      setThemePlans(userThemePlans)
      setActiveBlockId(defaultBlockIdFor(set, userPlanId, userReadingOrder))
      setDailyRoutine(routine)
      setRoutineModulesState(userRoutineModules)
      setActiveStudyIdState(userActiveStudyId)
      setPrayerStats(stats)
      setActiveChallenges(challenges)
      setPendingSocialCount(pendingSocial)
      setMyAvatarUrl(myProfile?.avatarUrl ?? null)
    setMyGroups(groups ?? [])
      setSubscription(finalSubscription)
      setIsAdmin(adminStatus)
      // Consentimento em dia? Se a política mudou de versão desde o último
      // "aceito", reapresenta antes de liberar o app (LGPD — não basta
      // pegar quem passa pelo login). Falha silenciosa: erro de rede aqui
      // não pode travar quem já consentiu. Convidado (redesign 1g/etapa 7)
      // nunca passa por aqui — sem sessão real, needsConsentRefresh() só
      // enxergaria uma tabela vazia (RLS) e diria "falta consentir",
      // travando a leitura ANTES de existir conta — exatamente o que essa
      // etapa existe pra evitar. Consentimento entra só no cadastro de
      // verdade (ver SignupStep, que já grava tudo antes de liberar o app).
      setConsentRefreshNeeded(user.isGuest ? false : await needsConsentRefresh().catch(() => false))
      setBootstrapped(true)
    }
    bootstrap()
    return () => { cancelled = true }
  }, [])

  // Mantém o fuso horário guardado da inscrição de push em dia com o do
  // aparelho — assim o lembrete de leitura continua tocando na hora local
  // escolhida (ex: 7h) mesmo depois de a pessoa mudar de fuso, sem precisar
  // reconfigurar. Fire-and-forget, só grava se o fuso mudou (ver
  // syncPushTimezone em src/notifications/pushStore.js).
  useEffect(() => {
    if (!authUser) return
    syncPushTimezone().catch(err => console.error('Failed to sync push timezone', err))
  }, [authUser?.email])

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

  // Relê o "último texto lido" do localStorage — ReadingBlockView grava lá
  // enquanto a pessoa lê (localStorage não dispara re-render do App
  // sozinho). Ao voltar pra Home (ou qualquer troca de aba) o card
  // "Continue sua leitura" já reflete onde ela parou. completedSet cobre o
  // caso de marcar um capítulo sem sair da leitura.
  useEffect(() => {
    setLastReadPositionState(getLastReadPosition())
  }, [activeTab, completedSet])

  // Navegação genérica entre abas — ao ir pra Jornada por essa via (menu
  // inferior, header, etc.) sempre reseta pro mapa de blocos (visão geral).
  // Rotina e Comunidade são restritas a assinantes (Comunidade também a
  // maiores de 18) — a Sidebar/BottomNav já escondem o clique, mas essa
  // checagem aqui é a segunda linha de defesa (mesmo espírito de "UI
  // esconde, a fonte da verdade decide" já usado nas policies RLS de
  // group_comments). 'upgrade' nunca é bloqueada — é pra onde a pessoa vai
  // justamente pra resolver o bloqueio.
  function navigateTo(tab) {
    if (disabledTabs.includes(tab) && tab !== 'upgrade') return
    // Aba que existe mas exige Premium (Meu Plano, Comunidade pra quem não
    // assina) — o clique leva pra tela de assinar em vez de abrir.
    if (lockedTabs.includes(tab)) { goToTab('upgrade'); return }
    // Sair do modo guiado se a pessoa navegar explicitamente pra fora do
    // fluxo (Oração/Leitura/Reflexão) — ex: tocar em Início ou Comunidade.
    if (guidedFlowRef.current && !['prayer', 'reflection', 'journey', 'themePlan', 'chronologicalPlan'].includes(tab)) {
      setGuidedFlow(null)
    }
    if (tab === 'journey') setJourneyEntryMode('overview')
    goToTab(tab)
  }

  // Troca de aba "de baixo nível" — usada por navigateTo (clique explícito
  // em aba/menu) e por toda função interna que pula direto pra uma tela
  // específica (continueToday, openBiblePassage, goToReflectionFrom etc.),
  // pra QUALQUER jeito de trocar de aba empilhar no histórico igual (ver
  // tabHistory acima) — sem isso, "Voltar" só funcionaria depois de cliques
  // no menu, não depois de atalhos como "Continuar sessão".
  function goToTab(tab) {
    if (tab !== activeTab) setTabHistory(prev => [...prev.slice(-19), activeTab])
    setActiveTab(tab)
  }

  // Botão "Voltar" global (AppHeader/Sidebar) — desempilha a última aba
  // visitada e volta pra ela, SEM resetar entryMode/auto-open — mesmo
  // tratamento que themePlan/chronologicalPlan já tinham (voltam pra
  // sessão exata que a pessoa estava, não pro início). Journey tinha um
  // reset forçado pro mapa de blocos aqui antes, que descartava a posição
  // de leitura (ex: "Continuar sessão" → trocar de aba → Voltar caía no
  // mapa geral, não no capítulo que estava lendo) — removido de propósito.
  function goBack() {
    setTabHistory(prev => {
      if (prev.length === 0) return prev
      const target = prev[prev.length - 1]
      setActiveTab(target)
      return prev.slice(0, -1)
    })
  }

  // ── Rotina guiada ─────────────────────────────────────────────────────
  // Passos possíveis, na ordem em que a rotina guiada os encadeia. Estudo
  // guiado fica de fora de propósito (não tem cronômetro/sinal de conclusão
  // e o pedido era "terminando na reflexão"), igual ao modo mãos-livres.
  const GUIDED_STEPS = ['prayer', 'reading', 'reflection']
  // Quanto tempo o passo recém-concluído fica na tela ("concluído!") antes
  // de o app abrir o próximo — respiro pra pessoa perceber a transição.
  const GUIDED_ADVANCE_MS = 2600

  function guidedTabFor(step) {
    return step === 'prayer' ? 'prayer' : step === 'reflection' ? 'reflection' : null
  }

  // Iniciar em Meu Plano — encadeia os passos ligados. Com 0 ou 1 passo não
  // há o que encadear: só abre aquele passo (ou nada), sem o "modo guiado".
  function startGuidedRoutine() {
    // Rotina guiada é recurso Premium — sem assinatura, o botão leva pra
    // tela de assinar (a aba Meu Plano já é travada, mas a Home também tem
    // um atalho de "Começar").
    if (!hasPremium) { goToTab('upgrade'); return }
    const steps = GUIDED_STEPS.filter(s => (routineModules ?? DEFAULT_ROUTINE_MODULES).includes(s))
    if (steps.length === 0) return
    // Começa no passo ATUAL — o primeiro ainda não feito hoje (redesign 1c:
    // "vai para o passo atual da rotina, não para o início dela"). Se todos
    // já foram feitos, reabre o último.
    const today = dailyRoutine[dateKey()] ?? {}
    let startIdx = steps.findIndex(s => !today[s])
    if (startIdx < 0) startIdx = steps.length - 1
    const openStep = step => step === 'reading' ? continueToday() : goToTab(step)
    // Sem passos pra encadear a partir daqui (só sobrou 1) — abre direto,
    // sem o "modo guiado".
    if (steps.length - startIdx <= 1) { openStep(steps[startIdx]); return }
    setGuidedFlow({ steps, idx: startIdx })
    openStep(steps[startIdx])
  }

  function exitGuidedRoutine() {
    guidedAdvancingRef.current = false
    setGuidedFlow(null)
  }

  // Um passo da rotina guiada foi concluído — agenda (com um respiro de
  // GUIDED_ADVANCE_MS, pra pessoa ver o "concluído") a abertura do próximo
  // passo, ou o fim da rotina. Ignora se o modo guiado não está ativo, se
  // já há uma transição agendada, ou se o passo que terminou não é o passo
  // atual (marcar um capítulo de outro dia também dispara
  // markRoutineStep('reading')). A troca de `idx` só acontece na hora de
  // navegar — assim o banner/aviso de "indo para X" continua visível na
  // tela do passo que acabou durante a espera.
  function advanceGuided(fromStep) {
    const gf = guidedFlowRef.current
    if (!gf || guidedAdvancingRef.current || gf.steps[gf.idx] !== fromStep) return
    guidedAdvancingRef.current = true
    const nextIdx = gf.idx + 1
    setTimeout(() => {
      guidedAdvancingRef.current = false
      if (guidedFlowRef.current !== gf) return // pessoa saiu do modo guiado nesse meio-tempo
      if (nextIdx >= gf.steps.length) {
        setGuidedFlow(null)
        // lastReadSession referenciado aqui é o do fechamento (closure desta
        // chamada, criada antes de markRoutineStep('reflection') zerá-lo) —
        // ver comentário de routineCompleteInfo acima.
        setRoutineCompleteInfo({ steps: gf.steps, readingSession: lastReadSession })
        goToTab('routineComplete')
        return
      }
      setGuidedFlow({ steps: gf.steps, idx: nextIdx })
      const nextStep = gf.steps[nextIdx]
      if (nextStep === 'reading') continueToday()
      else goToTab(guidedTabFor(nextStep))
    }, GUIDED_ADVANCE_MS)
  }

  // Todos os capítulos da leitura de hoje já concluídos? (usado pra saber
  // se o passo "Leitura" da rotina guiada pode avançar — marcar 1 de 3
  // capítulos não conta.)
  function guidedReadingComplete(set) {
    const ts = sessionRef.current?.todaySession
    if (!ts || ts.needsThemePick || ts.chStart == null || ts.type === 'reflection') return true
    for (let ch = ts.chStart; ch <= ts.chEnd; ch++) {
      if (!set.has(`${ts.book}:${ch}`)) return false
    }
    return true
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

  // Botão "Continue sua leitura" da Home/Rotina: reabre exatamente o
  // último capítulo que a pessoa estava lendo (lastReadPosition, ver
  // findCurrentReadingSession) — no plano fixo. Nos planos alternativos
  // (tema/cronológico) ainda abre pelo plano em destaque, sem o "último
  // lido" (as sessões deles não mapeiam 1:1 com livro:capítulo).
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
          goToTab('routine')
          return
        }
        setThemeAutoOpenId(themePlan.id)
        setThemeAutoOpenKeys(todayThemePicks?.planId === themePlan.id ? todayThemePicks.keys : null)
        goToTab('themePlan')
        return
      }
    }
    if (activeAltPlan?.type === 'chrono') {
      const chrono = deriveChronoProgress(completedSet, activeAltPlan.paceId)
      const { block } = findCurrentReadingSession(chrono.blocks, chrono.sessionsByBlock)
      setChronoAutoOpenMovementId(block.id)
      goToTab('chronologicalPlan')
      return
    }
    const { session: resumeSession, block } = findCurrentReadingSession(blocks, sessionsByBlock, lastReadPosition)
    setActiveBlockId(block.id)
    setJourneyResumeSessionId(resumeSession.id)
    setJourneyEntryMode('reading')
    goToTab('journey')
  }

  // Tocar numa sessão específica na aba Plano (ver PlanScreen.jsx) — mesmo
  // mecanismo de continueToday acima, só que pra uma sessão escolhida pela
  // pessoa em vez de sempre "onde ela parou".
  function openReadingSession(blockId, sessionId) {
    setActiveBlockId(blockId)
    setJourneyResumeSessionId(sessionId)
    setJourneyEntryMode('reading')
    goToTab('journey')
  }

  // Link "ir pro texto" de uma passagem bíblica citada numa anotação de
  // sermão (ver NotesScreen.jsx) — abre a aba Bíblia em modo livre (browse),
  // já no capítulo certo, sem depender do plano de leitura ativo. Livro+
  // capítulo (não uma sessão do plano) é a única coisa que a anotação de
  // sermão guarda, então usa browseSessionsByBlock (1 sessão = 1 capítulo)
  // em vez de sessionsByBlock. Passa por goToTab (não setActiveTab direto)
  // pra "Voltar" (ver goBack) devolver a pessoa pra onde ela estava — a
  // anotação de sermão que ainda estava escrevendo, por exemplo (ver
  // NotesScreen.jsx, que agora fica sempre montada).
  function openBiblePassage(book, chapter) {
    const block = blocks.find(b => b.books.includes(book))
    if (!block) return
    const targetSession = (browseSessionsByBlock[block.id] ?? []).find(
      s => s.book === book && s.chStart <= chapter && s.chEnd >= chapter
    )
    if (!targetSession) return
    setBrowseJumpTarget({ blockId: block.id, sessionId: targetSession.id })
    goToTab('journey')
  }

  // Tocar num plano por tema salvo na lista da aba Plano (ver PlanScreen.jsx)
  // — abre direto na leitura dele, sem passar pela lista de ThemePlanScreen.
  // Mostra o plano INTEIRO (sem restringir aos textos de hoje) — é um jeito
  // de navegar/revisar o plano todo, diferente de "Começar leitura de hoje".
  function openThemePlanFromList(planId) {
    setThemeAutoOpenId(planId)
    setThemeAutoOpenKeys(null)
    goToTab('themePlan')
  }

  // "Começar leitura de hoje" no card do plano por tema ativo (ver
  // PlanScreen.jsx) — grava a escolha do dia e já abre a leitura restrita a
  // só esses textos.
  function openThemePlanToday(planId, keys) {
    chooseThemeTexts(planId, keys)
    setThemeAutoOpenId(planId)
    setThemeAutoOpenKeys(keys)
    goToTab('themePlan')
  }

  // "Adicionar sessões à rotina do dia" logo depois de gerar um plano por
  // tema novo (ver ThemePlanScreen.jsx) — diferente de openThemePlanToday
  // acima, não pula direto pra leitura: torna o plano ativo, grava a
  // escolha de hoje e manda pra aba Rotina, já mostrando o tempo calculado
  // (activePlan.readingMinutes, ver resolveActivePlan.js/RoutineScreen.jsx).
  function addThemePlanToRoutine(planId, keys) {
    selectActivePlan({ type: 'theme', planId })
    chooseThemeTexts(planId, keys)
    goToTab('routine')
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
    goToTab('chronologicalPlan')
  }

  // "Ir para Reflexão" a partir de uma sessão de leitura recém-concluída
  // (ver ReadingBlockView.jsx/onGoToReflection, chamado por JourneyScreen/
  // ThemePlanScreen/ChronologicalPlanScreen) — guarda COMO voltar exatamente
  // pra essa sessão antes de trocar de aba (ver backToLastReadSession).
  function goToReflectionFrom(descriptor) {
    setLastReadSession(descriptor)
    goToTab('reflection')
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
      goToTab('themePlan')
    }
    else if (d.tab === 'chronologicalPlan') openChronoSession(d.movementId)
  }

  // Rebusca a assinatura e atualiza o estado — usado depois de resgatar um
  // convite de acesso grátis ou fechar uma compra (ver UpgradeScreen.jsx),
  // pra liberar os recursos Premium sozinho, sem precisar de F5.
  async function refreshSubscription() {
    const sub = await getMySubscription()
    setSubscription(sub)
  }

  // "Autenticado" sintético pro modo convidado (redesign 1g/etapa 7) — sem
  // sessão real nenhuma no Supabase, então id/email ficam null (nenhuma
  // store usa esses campos de verdade, ver comentário em
  // src/backend/userDataStore.js). Idioma vem da preferência de dispositivo
  // já resolvida no bootstrap (appLanguage), não do navigator.language
  // direto — mesma fonte que a tela de login usaria de qualquer forma.
  function buildGuestUser() {
    const lang = getAppLanguage() ?? 'pt'
    // Nome só de exibição (Sidebar/Perfil) — o formulário de criar conta
    // (SignupScreen.jsx) pede o nome de verdade nessa hora.
    return { id: null, email: null, name: lang === 'en' ? 'Guest' : 'Convidado', language: lang, birthdate: null, isGuest: true }
  }

  // Chamado pelo "Ler Gênesis 1 agora" do onboarding (15e, OnboardingFlow)
  // — grava as respostas na linha local de convidado (setSelectedPlanId e
  // cia. escrevem nela em vez do backend real, ver userDataStore.js) e entra
  // direto na leitura de hoje, que pra um convidado novo (completedSet
  // vazio) é sempre Gênesis 1, não importa o ritmo — por isso é seguro
  // chamar continueToday() logo em seguida, mesmo lendo `blocks`/
  // `sessionsByBlock` de um render que ainda não viu o plano recém-escolhido.
  async function startGuestReading(answers) {
    await setSelectedPlanId(null, answers.planId)
    await persistRoutineModules(null, answers.readOnly ? ['reading'] : DEFAULT_ROUTINE_MODULES)
    await persistWeeklyGoalDays(null, answers.days)
    if (!answers.readOnly) {
      // Divisão do tempo do método (15f) — os cronômetros de Oração e
      // Reflexão leem daqui (ver PrayerScreen/ReflectionScreen).
      const split = splitMinutes(answers.minutes)
      setSavedPrayerMinutes(split.prayer)
      setSavedReflectionMinutes(split.reflection)
    }
    saveOnboardingAnswers(answers)
    // O lembrete (15c) só vira inscrição push com uma conta de verdade —
    // fica pendente até o primeiro login (ver applyPendingReminder).
    savePendingReminder(answers.reminder)
    await handleAuthenticated(buildGuestUser())
    continueToday()
  }

  // Horário escolhido no onboarding, aplicado assim que existe usuário real
  // e a permissão de notificação foi dada (pedida no 15c). Todos os dias da
  // semana: a pessoa escolheu QUANTOS dias, não quais — o lembrete é "uma
  // vez por dia", e ela ajusta em Perfil.
  async function applyPendingReminder() {
    const pending = getPendingReminder()
    if (!pending) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
      await subscribeToPush({ hour: pending.hour, minute: pending.minute, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] })
      clearPendingReminder()
    } catch (err) {
      console.error('Failed to apply onboarding reminder', err)
    }
  }

  // Chamado depois de login/cadastro bem-sucedidos (inclusive o "login"
  // sintético do convidado acima): busca todo o progresso salvo do usuário
  // de uma vez só, e só então atualiza o estado (evita um frame renderizando
  // o usuário novo com dados do usuário anterior/vazios).
  async function handleAuthenticated(user) {
    // migrateGuestRow() só migra de verdade quando há sessão real — no
    // "login" sintético do convidado (sem sessão nenhuma) não faz nada, é
    // seguro chamar sempre (ver src/backend/userDataStore.js). Cobre quem
    // loga numa conta JÁ existente depois de ter lido um pouco como
    // convidado no mesmo dispositivo.
    await migrateGuestRow().catch(err => console.error('Failed to migrate guest progress', err))
    clearGuestInviteState()
    if (!user.isGuest) applyPendingReminder()
    // Mesmo motivo do bootstrap acima: aplicar ANTES de ler, pra não correr
    // contra a leitura de plano/ordem logo abaixo.
    await applyPendingOnboardingChoices()
    const [set, userPlanId, userReadingOrder, userWeeklyGoalDays, userActiveAltPlan, userThemePlans, stats, routine, userRoutineModules, userActiveStudyId, challenges, pendingSocial, myProfile, mySubscription, adminStatus, inviteAppliedByEmail, inviteAppliedByCode, groups] = await Promise.all([
      getCompletedSet(user.email),
      getSelectedPlanId(user.email),
      getReadingOrder(user.email),
      getWeeklyGoalDays(user.email),
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
      getMyGroups().catch(() => []),
    ])
    const inviteApplied = inviteAppliedByEmail || inviteAppliedByCode
    const finalSubscription = inviteApplied ? await getMySubscription() : mySubscription
    // O AuthScreen só chama onAuthenticated depois de resolver o próprio
    // gate de consentimento, então aqui já está em dia (limpa um eventual
    // true herdado de antes do logout).
    setConsentRefreshNeeded(false)
    setAuthUser(user)
    setCompletedSet(set)
    setPlanId(userPlanId)
    setReadingOrderState(userReadingOrder)
    setWeeklyGoalDaysState(userWeeklyGoalDays)
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
    setMyGroups(groups ?? [])
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
    setWeeklyGoalDaysState(DEFAULT_WEEKLY_GOAL_DAYS)
    setActiveAltPlanState(null)
    setThemePlans([])
    setRoutineModulesState(DEFAULT_ROUTINE_MODULES)
    setActiveStudyIdState(null)
    setPrayerStats(DEFAULT_PRAYER_STATS)
    setActiveChallenges([])
    setPendingSocialCount(0)
    setMyAvatarUrl(null)
    setSubscription(null)
    setIsAdmin(false)
    setReadingSeconds(0)
    setMyGroups([])
    setChapterRoom(null)
    setMonthRecap(null)
    setActiveTab('home')
    setTabHistory([])
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

  // "Ritmo da semana" em Ajustar meu plano (1d) — quantos dias por semana a
  // pessoa quer se comprometer (3–7). Ver src/routine/weeklyGoalStore.js.
  function selectWeeklyGoalDays(days) {
    setWeeklyGoalDaysState(days)
    if (authUser) {
      persistWeeklyGoalDays(authUser.email, days).catch(err => console.error('Failed to persist weekly goal days', err))
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
    setTabHistory([])
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
  // concluído — atualiza o estado local na hora (a meta semanal/calendário
  // da Home reagem no mesmo instante) e persiste em segundo plano. Usado tanto
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
      // Mesma gravação de src/routine/dailyRoutineStore.js (inclusive a hora
      // de conclusão em `${step}At`, usada só pelo cartão de passo feito).
      if (done) { today[step] = true; today[`${step}At`] = new Date().toISOString() }
      else { delete today[step]; delete today[`${step}At`] }
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
    if (done && hasPremium) detectAndLogMilestones(completedSet, nextSet)
    setCompletedSet(nextSet)
    const persist = done ? markKeysDone(authUser.email, keys) : markKeysUndone(authUser.email, keys)
    persist.catch(err => console.error('Failed to persist session progress', err))
    recordChallengeProgressForNewlyDoneKeys(newlyDoneKeys)
    if (done) {
      markRoutineStep('reading')
      // Marcar uma sessão como lida também conta como "último texto lido"
      // — o card "Continue sua leitura" volta pra ela (ver
      // findCurrentReadingSession).
      if (session.type !== 'reflection') {
        setLastReadPosition(session.book, session.chEnd)
        setLastReadPositionState({ book: session.book, chapter: session.chEnd })
      }
      if (guidedReadingComplete(nextSet)) advanceGuided('reading')
    }
  }

  // Modo mãos-livres terminou de ler a leitura do dia em voz alta — marca
  // essa sessão como concluída, igual a marcar pelo fluxo guiado normal.
  function finishReadingFromHandsFree() {
    const { session: s } = findCurrentReadingSession(blocks, sessionsByBlock, lastReadPosition)
    if (s && s.type !== 'reflection') toggleSession(s, true)
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
    if (done && hasPremium) detectAndLogMilestones(completedSet, nextSet)
    setCompletedSet(nextSet)
    const persist = done ? markKeysDone(authUser.email, [key]) : markKeysUndone(authUser.email, [key])
    persist.catch(err => console.error('Failed to persist chapter progress', err))
    recordChallengeProgressForNewlyDoneKeys(newlyDoneKeys)
    if (done) {
      markRoutineStep('reading')
      setLastReadPosition(session.book, chapter)
      setLastReadPositionState({ book: session.book, chapter })
      if (guidedReadingComplete(nextSet)) advanceGuided('reading')
    }
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
    // Redesign 1g/etapa 7 — quem já autenticou neste dispositivo alguma vez
    // (ou pediu "Já tenho conta" no meio do fluxo de convidado) vai direto
    // pro login de sempre. Quem nunca autenticou aqui vê a pergunta única
    // do onboarding (OnboardingFlow) em vez do cadastro — só entra em contato
    // com conta/senha/consentimento depois de já ter lido algo (ver
    // SignupScreen mais abaixo, no gate pós-bootstrapped).
    if (authScreenForced || (!loginDismissed && typeof localStorage !== 'undefined' && localStorage.getItem(HAS_AUTH_KEY))) {
      // authScreenForced sempre quer dizer "já tenho conta" (veio de um
      // link explícito no fluxo de convidado) — força login mesmo se este
      // dispositivo específico nunca autenticou aqui (nesse caso, sem o
      // initialMode, AuthScreen cairia no onboarding antigo por padrão).
      return (
        <>
          <AuthScreen
            onAuthenticated={handleAuthenticated}
            initialMode={authScreenForced ? 'login' : undefined}
            planId={planId}
            onBack={() => { setAuthScreenForced(false); setLoginDismissed(true) }}
            onContinueWithoutAccount={() => { setAuthScreenForced(false); setLoginDismissed(true) }}
          />
          <Analytics />
        </>
      )
    }
    if (!welcomeDone) {
      return (
        <>
          <WelcomeScreen onStart={() => setWelcomeDone(true)} onGoLogin={() => setAuthScreenForced(true)} />
          <Analytics />
        </>
      )
    }
    return (
      <>
        <OnboardingFlow onFinish={startGuestReading} onBack={() => setWelcomeDone(false)} />
        <Analytics />
      </>
    )
  }

  // Sessão ativa mas consentimento desatualizado (a política mudou de
  // versão desde o último "aceito") — bloqueia tudo até reconsentir ou sair.
  if (consentRefreshNeeded) {
    return (
      <>
        <ConsentRefreshScreen
          onAccepted={() => setConsentRefreshNeeded(false)}
          onDeclined={handleLogout}
        />
        <Analytics />
      </>
    )
  }

  // Criar conta depois de já ter lido (quadro 13c) — aparece depois da 1ª
  // leitura concluída em modo convidado, e de novo a cada duas leituras se
  // a pessoa continuar sem conta (ver src/onboarding/guestInviteStore.js).
  // Tela cheia: mostra o que vai para a conta; "Continuar sem conta" (e o
  // voltar) só adiam o convite, nada do progresso se perde.
  if (authUser.isGuest && completedSet.size >= getGuestInviteThreshold()) {
    const dismiss = () => { dismissGuestInvite(completedSet.size); goToTab('home') }
    return (
      <>
        <SignupScreen
          chaptersRead={completedSet.size}
          planId={planId}
          onAuthenticated={handleAuthenticated}
          onBack={dismiss}
          onContinueWithoutAccount={dismiss}
          onGoLogin={() => { setAuthScreenForced(true); setAuthUser(null) }}
        />
        <Analytics />
      </>
    )
  }

  const session = buildSession(authUser, blocks, sessionsByBlock, dailyRoutine, planId, completedSet, prayerStats, readingOrder, activeAltPlan, themePlans, routineModules, activeStudyId, lastReadPosition)
  // Modo guiado disponível pros componentes (banner + auto-avanço). idx/step
  // derivados aqui pra não repetir a conta em cada tela.
  session.guided = guidedFlow
    ? { steps: guidedFlow.steps, idx: guidedFlow.idx, total: guidedFlow.steps.length, step: guidedFlow.steps[guidedFlow.idx] }
    : null
  // Tier de acesso disponível pra toda tela (ver src/billing/entitlement.js).
  // hasPremium: rotina guiada, voz natural, mãos-livres, XP/conquistas,
  // cronológico, notas, comunidade. hasAI: recursos de IA.
  session.tier = entitlement.tier
  session.hasPremium = entitlement.hasPremium
  session.myGroups = myGroups
  session.hasAI = entitlement.hasAI
  // Constância semanal (redesign, etapa 4) — ver src/routine/routineStreak.js.
  // weekGoalDaysMet: dias já lidos esta semana. weeksInGoal: contador
  // histórico de semanas que bateram a meta (nunca reseta).
  session.weeklyGoalDays = weeklyGoalDays
  session.weekGoalDaysMet = computeWeekGoalProgress(dailyRoutine)
  session.weeksInGoal = computeWeeksInGoal(dailyRoutine, weeklyGoalDays)
  sessionRef.current = session

  // Trava o ref de visita assim que a aba vira ativa — feito aqui (não num
  // useEffect) pra já valer NESTE mesmo render, sem esperar o próximo ciclo
  // (senão a tela pisca em branco 1 frame na primeira visita, antes do ref
  // atualizar). Ver declaração de prayerVisitedRef/reflectionVisitedRef.
  if (activeTab === 'prayer') prayerVisitedRef.current = true
  if (activeTab === 'reflection') reflectionVisitedRef.current = true
  if (activeTab === 'notes') notesVisitedRef.current = true
  if (activeTab === 'studies') studiesVisitedRef.current = true

  // Livro/capítulo real que a Reflexão com perguntas geradas (10d, reskin
  // Bento) precisa pra ancorar as perguntas — diferente de
  // session.todaySession, que já pode ter avançado pro PRÓXIMO capítulo
  // assim que este foi marcado como lido (ver findCurrentReadingSession).
  // Vem direto no descriptor (ver onGoToReflectionFrom em JourneyScreen.jsx)
  // em vez de resolvido aqui por blockId+sessionId — sessionId sozinho é
  // AMBÍGUO (sessionsByBlock do plano fixo e browseSessionsByBlock da
  // navegação livre numeram sessões independentemente dentro do mesmo
  // bloco, então o mesmo id pode existir com book/chapter diferentes nos
  // dois; só quem monta o descriptor sabe de qual dos dois veio). Só
  // existe pra 'journey' — plano por tema/cronológico caem no fluxo antigo
  // da Reflexão, sem perguntas geradas (ver ReflectionScreen.jsx).
  const lastReadChapterInfo = (lastReadSession?.tab === 'journey' && lastReadSession.type !== 'reflection' && lastReadSession.book)
    ? { book: lastReadSession.book, bookEn: lastReadSession.bookEn, chStart: lastReadSession.chStart, chEnd: lastReadSession.chEnd }
    : null

  // Próximo livro depois do atual, na ordem do plano — "Próximo: Êxodo."
  const orderedSessions = blocks.flatMap(b => sessionsByBlock[b.id] ?? [])
  const bookEnFor = book => orderedSessions.find(x => x.book === book)?.bookEn ?? null
  const nextBookLabel = (() => {
    const cur = session.currentBlock?.book
    const idx = orderedSessions.findIndex(x => x.book === cur)
    const nxt = idx >= 0 ? orderedSessions.slice(idx).find(x => x.book !== cur && x.type !== 'reflection') : null
    return nxt ? (session.lang === 'en' ? (nxt.bookEn || nxt.book) : nxt.book) : null
  })()
  function closeRecap() {
    if (monthRecap) markRecapShown(monthRecap.month).catch(() => {})
    setMonthRecap(null)
    goBack()
  }
  async function saveRecapToLibrary() {
    if (!monthRecap) return
    const label = book => (session.lang === 'en' ? (bookEnFor(book) || book) : book)
    const { title, parts } = recapSummary(monthRecap, session.lang, label)
    const text = [title, parts.join(' · ')].filter(Boolean).join('\n')
    await saveNote(authUser.email, `recap:${monthRecap.month}`, text, { sessionTitle: t('recap.libraryTitle', { month: monthLabel(monthRecap.month, session.lang) }, session.lang) })
  }
  async function shareRecap({ verseText, title }) {
    if (!monthRecap) return
    const lang = session.lang
    const L = (k, vars) => t(`recap.${k}`, vars, lang)
    const tiles = []
    const h = Math.floor(monthRecap.seconds / 3600), m = Math.floor((monthRecap.seconds % 3600) / 60)
    if (monthRecap.chapters > 0) tiles.push({ num: String(monthRecap.chapters), label: L('chapters') })
    if (monthRecap.seconds >= 60) tiles.push(h ? { num: `${h}`, unit: `h${String(m).padStart(2, '0')}`, label: L('reading') } : { num: `${m}`, unit: 'min', label: L('reading') })
    if (monthRecap.weeksMet > 0) tiles.push({ num: String(monthRecap.weeksMet), unit: `/${monthRecap.weeksTotal}`, label: L('weeks'), accent: true })
    if (monthRecap.highlights > 0) tiles.push({ num: String(monthRecap.highlights), label: L('highlights') })
    const tv = monthRecap.topVerse
    const verse = tv && verseText ? { label: L('topVerse'), text: verseText, ref: `${lang === 'en' ? (tv.bookEn || tv.book) : tv.book} ${tv.chapter}:${tv.verse}` } : null
    const month = monthLabel(monthRecap.month, lang)
    const blob = await renderRecapImage({ month, title, tiles, verse, next: nextBookLabel ? L('next', { book: nextBookLabel }) : null, brandText: "Jesus' Corner" }).catch(() => null)
    const summary = [title, ...tiles.map(x => `${x.num}${x.unit ?? ''} ${x.label}`)].join(' · ')
    await shareRecapImage(blob, { title: month, text: L('shareText', { month, summary }) })
  }

  const screens = {
    // Regra do quadro 12a: nos primeiros 7 dias, e sempre que o painel
    // estiver zerado, a Home é 3c; o painel só entra depois da primeira
    // semana cumprida (ver shouldShowDashboard).
    home: shouldShowDashboard(session)
      ? <HomeDashboard session={session} readingSeconds={readingSeconds} onContinueSession={continueToday} onNavigate={navigateTo} onStartGuided={startGuidedRoutine} />
      : <HomeScreen    session={session} authUser={authUser} onContinueSession={continueToday} onNavigate={navigateTo} onStartGuided={startGuidedRoutine} onOpenProfile={() => setProfileOpen(true)} />,
    routine: hasPremium
      ? <RoutineScreen session={session} onContinueSession={continueToday} onNavigate={navigateTo} onStartGuided={startGuidedRoutine} />
      : <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />,
    adjustPlan: hasPremium
      ? <AdjustPlanScreen session={session} activeAltPlan={activeAltPlan} onSelectPace={selectPlan} onSelectActivePlan={selectActivePlan} onToggleRoutineModule={toggleRoutineModule} onSelectWeeklyGoal={selectWeeklyGoalDays} onNavigate={navigateTo} onBack={goBack} />
      : <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />,
    aiSettings: !session.hasAI
      ? <PremiumRequired feature="ai" lang={session.lang} onNavigate={navigateTo} />
      : <AiSettingsScreen session={session} onBack={goBack} />,
    contact: <ContactScreen session={session} authUser={authUser} />,
    applicationPhrases: <ApplicationPhrasesScreen session={session} authUser={authUser} />,
    inductiveMethod: <InductiveMethodScreen session={session} onOpenBiblePassage={openBiblePassage} />,
    themePlan: !session.hasAI
      ? <PremiumRequired feature="ai" lang={session.lang} onNavigate={navigateTo} />
      : <ThemePlanScreen session={session} authUser={authUser} completedSet={completedSet} plans={themePlans} isAdmin={isAdmin} onPlansChanged={setThemePlans} autoOpenPlanId={themeAutoOpenId} autoOpenKeys={themeAutoOpenKeys} onToggleSession={toggleSession} onToggleChapter={toggleChapter} onNavigate={navigateTo} onAddSessionsToRoutine={addThemePlanToRoutine} onStartThemeReading={startThemePlanReadingToday} onGoToReflectionFrom={goToReflectionFrom} />,
    chronologicalPlan: !hasPremium
      ? <PremiumRequired feature="generic" lang={session.lang} onNavigate={navigateTo} />
      : <ChronologicalPlanScreen session={session} authUser={authUser} completedSet={completedSet} paceId={activeAltPlan?.type === 'chrono' ? activeAltPlan.paceId : 'standard'} autoOpenMovementId={chronoAutoOpenMovementId} onToggleSession={toggleSession} onToggleChapter={toggleChapter} onNavigate={navigateTo} onGoToReflectionFrom={goToReflectionFrom} />,
    journey: <JourneyScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} browseSessionsByBlock={browseSessionsByBlock} completedSet={completedSet} onToggleSession={toggleSession} onToggleChapter={toggleChapter} initialBlockId={activeBlockId} entryMode={journeyEntryMode} resumeSessionId={journeyResumeSessionId} browseJumpTarget={browseJumpTarget} onBrowseJumpConsumed={() => setBrowseJumpTarget(null)} onNavigate={navigateTo} onContinueSession={continueToday} onGoToReflectionFrom={goToReflectionFrom} onExitGuided={exitGuidedRoutine} onExitReading={() => { exitGuidedRoutine(); setJourneyEntryMode('overview'); goBack() }} onOpenGroupRoom={target => { setChapterRoom(target); goToTab('chapterRoom') }} />,
    groups:  !meetsMinAge ? <MinAgeRestricted lang={session.lang} />
      : !hasPremium ? <PremiumRequired feature="groups" lang={session.lang} onNavigate={navigateTo} />
      : <GroupsScreen session={session} authUser={authUser} onSocialChange={refreshSocialState} onOpenGroupRoom={target => { setChapterRoom(target); goToTab('chapterRoom') }} onDetailOpenChange={setGroupsDetailOpen} />,
    stats:   <ProgressScreen session={session} blocks={blocks} sessionsByBlock={sessionsByBlock} onNavigate={navigateTo} />,
    // Sala do capítulo (17a) — aberta pelo botão "Grupo" da leitura (17c).
    chapterRoom: chapterRoom
      ? <ChapterRoomScreen
          group={chapterRoom.group} book={chapterRoom.book} bookEn={chapterRoom.bookEn} chapter={chapterRoom.chapter}
          completed={completedSet.has(`${chapterRoom.book}:${chapterRoom.chapter}`)}
          isModerator={chapterRoom.group.myRole === 'moderator'}
          lang={session.lang} authUser={authUser} onBack={goBack}
        />
      : null,
    // Retrospectiva do mês (17b) — aparece uma vez no mês seguinte.
    monthRecap: monthRecap
      ? <MonthRecapScreen
          recap={monthRecap} lang={session.lang}
          nextBook={nextBookLabel}
          bookLabel={(book, bookEn) => (session.lang === 'en' ? (bookEn || bookEnFor(book) || book) : book)}
          onClose={closeRecap}
          onSave={saveRecapToLibrary}
          onShare={shareRecap}
        />
      : null,
    // Rotina concluída (21c) — fecha o ciclo diário guiado (ver
    // advanceGuided). routineCompleteInfo só existe entre o fim da rotina e
    // "Voltar para Hoje".
    routineComplete: routineCompleteInfo
      ? <RoutineCompleteScreen
          session={session}
          authUser={authUser}
          steps={routineCompleteInfo.steps}
          readingSession={routineCompleteInfo.readingSession}
          onBack={() => { setRoutineCompleteInfo(null); goToTab('home') }}
          onOpenGroupRoom={target => { setChapterRoom(target); goToTab('chapterRoom') }}
        />
      : null,
    handsFree: hasPremium
      ? <HandsFreeScreen session={session} onExit={goBack} onNavigate={navigateTo} onMarkRoutineStep={markRoutineStep} onFinishReading={finishReadingFromHandsFree} />
      : <PremiumRequired feature="handsFree" lang={session.lang} onNavigate={navigateTo} />,
    upgrade: <UpgradeScreen session={session} subscription={subscription} onSubscriptionRefreshed={refreshSubscription} />,
    // Só alcançada pelo Sidebar (telas ≥768px) — no app (<768px) o avatar
    // abre a folha ProfileSheet (renderizada fora deste mapa, ver abaixo).
    profile: <ProfileScreen  session={session} authUser={authUser} subscription={subscription} isAdmin={isAdmin} onNavigate={navigateTo} onLogout={handleLogout} onResetProgress={handleResetProgress} onChangeLanguage={changeLanguage} onChangeReadingOrder={selectReadingOrder} onSelectPace={selectPlan} onProfileUpdated={handleProfileUpdated} />,
    // Bento 19b — Idioma e versão da Bíblia, alcançada pela folha do Perfil.
    language: <LanguageSettingsScreen session={session} authUser={authUser} onBack={goBack} onChangeLanguage={changeLanguage} />,
    // Bento 19c — Administração do grupo, alcançada pela folha do Perfil.
    groupAdmin: <GroupAdminScreen session={session} authUser={authUser} onBack={goBack} onOpenGroupRoom={target => { setChapterRoom(target); goToTab('chapterRoom') }} />,
    // Chave só existe pra quem é admin — evita montar (e disparar as
    // buscas de) AdminScreen pra qualquer conta comum.
    ...(isAdmin ? { admin: <AdminScreen session={session} /> } : {}),
    // Notas e Estudos são Premium — pra assinante ficam montadas persistentes
    // (display:contents, mais abaixo); pra grátis caem aqui.
    ...(hasPremium ? {} : {
      notes:   <PremiumRequired feature="generic" lang={session.lang} onNavigate={navigateTo} />,
      studies: <PremiumRequired feature="generic" lang={session.lang} onNavigate={navigateTo} />,
    }),
  }

  // Leitura imersiva (redesign 1b) — a leitura guiada de hoje ocupa a tela
  // inteira, sem barra de navegação nem sidebar: só a Palavra e os
  // controles de leitura. Sai pela seta do próprio cabeçalho da tela.
  const immersiveReading = activeTab === 'journey' && journeyEntryMode === 'reading'
  // Telas já na identidade Bento (design_handoff_jesus_corner/Jesus Corner
  // Redesign.dc.html — 3c, 4b, 5f, 4c, 5b, 5a, 10f, 5d, 21a): nenhum quadro
  // tem o cabeçalho com logotipo/sino/avatar — o título de cada tela é a
  // saudação ou o nome dela (ADENDO: "os cabeçalhos usam saudação"). O
  // AppHeader fica só nas telas que ainda não foram desenhadas (Estudos…),
  // e é lá que continuam o sino e o ajuste de tamanho de texto. Perfil não
  // é mais uma dessas — virou a folha ProfileSheet (19a), aberta pelo
  // avatar (Home e o próprio AppHeader) por cima de qualquer tela, sem
  // navegar de aba. 'groups' só entra quando um grupo está aberto de fato
  // (groupsDetailOpen — o painel 5d, que tem cabeçalho próprio); a lista
  // de vários grupos, sem quadro no redesign,
  // continua usando o AppHeader antigo, como sempre usou — só o painel de
  // dentro de um grupo tinha o AppHeader antigo empilhado por cima do
  // cabeçalho novo (achado numa auditoria, nunca chegou a ser notado
  // visualmente).
  const reflectionBento = activeTab === 'reflection' && reflectionAiActive
  const bentoScreen = ['home', 'routine', 'journey', 'notes', 'stats', 'adjustPlan', 'aiSettings', 'chapterRoom', 'monthRecap', 'prayer', 'routineComplete', 'language', 'groupAdmin'].includes(activeTab)
    || reflectionBento || (activeTab === 'groups' && groupsDetailOpen)
  // Sub-telas Bento cujo quadro não tem barra inferior (5a: o rodapé é o
  // botão "Salvar plano"; 10f: o rodapé é o aviso de offline; 10d: o
  // rodapé é "Próxima pergunta"); saem pela própria seta de voltar / ao
  // concluir.
  const navHidden = immersiveReading || ['adjustPlan', 'aiSettings', 'chapterRoom', 'monthRecap', 'prayer', 'routineComplete', 'language', 'groupAdmin'].includes(activeTab) || reflectionBento

  return (
    <div className="app-shell">
      {/* Navegação lateral — só visível em telas ≥768px (ver index.css) */}
      {isDesktop && !immersiveReading && (
        <Sidebar activeTab={activeTab} onNavigate={navigateTo} onBack={goBack} canGoBack={tabHistory.length > 0} avatarInitials={session.avatarInitials} avatarUrl={myAvatarUrl} userName={session.userName} groupsHasPending={pendingSocialCount > 0} disabledTabs={disabledTabs} pendingCount={pendingSocialCount} lang={session.lang} largeText={largeText} onToggleLargeText={toggleLargeText} />
      )}

      <div className="app-main">
        {/* Header fixo (logo + avatar), presente em todas as abas — só em
            telas <768px; a leitura imersiva usa o próprio cabeçalho compacto. */}
        {!immersiveReading && !bentoScreen && (
          <AppHeader avatarInitials={session.avatarInitials} avatarUrl={myAvatarUrl} onNavigate={navigateTo} onOpenProfile={() => setProfileOpen(true)} onBack={goBack} canGoBack={tabHistory.length > 0} pendingCount={pendingSocialCount} lang={session.lang} largeText={largeText} onToggleLargeText={toggleLargeText} />
        )}

        {/* Conteúdo da tela ativa */}
        <div className="app-content">
          <div className="app-content-inner">
            {activeTab !== 'prayer' && activeTab !== 'reflection' && !(hasPremium && (activeTab === 'notes' || activeTab === 'studies')) && screens[activeTab]}

            {/* Oração, Reflexão, Notas e Estudos ficam sempre montadas
                depois da 1a visita (ver prayerVisitedRef/reflectionVisitedRef/
                notesVisitedRef/studiesVisitedRef) — display:'contents' faz o
                wrapper "sumir" do layout quando oculto, sem atrapalhar o
                height:100% que a tela em si já assume. */}
            {prayerVisitedRef.current && (
              <div style={{ display: activeTab === 'prayer' ? 'contents' : 'none' }}>
                <PrayerScreen session={session} authUser={authUser} onPrayerCompleted={() => { markRoutineStep('prayer'); advanceGuided('prayer') }} onSkipStep={() => advanceGuided('prayer')} onContinueSession={continueToday} onNavigate={navigateTo} onExitGuided={exitGuidedRoutine} onBack={goBack} />
              </div>
            )}
            {reflectionVisitedRef.current && (
              <div style={{ display: activeTab === 'reflection' ? 'contents' : 'none' }}>
                <ReflectionScreen session={session} authUser={authUser} onReflectionCompleted={() => { markRoutineStep('reflection'); advanceGuided('reflection') }} hasPreviousReadingSession={!!lastReadSession} lastReadChapterInfo={lastReadChapterInfo} onBackToReading={backToLastReadSession} onNavigate={navigateTo} onContinueSession={continueToday} onExitGuided={exitGuidedRoutine} onAiFlowChange={setReflectionAiActive} />
              </div>
            )}
            {hasPremium && notesVisitedRef.current && (
              <div style={{ display: activeTab === 'notes' ? 'contents' : 'none' }}>
                <NotesScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} onOpenBiblePassage={openBiblePassage} onOpenStudy={id => { setLibraryOpenStudyId(id); navigateTo('studies') }} />
              </div>
            )}
            {hasPremium && studiesVisitedRef.current && (
              <div style={{ display: activeTab === 'studies' ? 'contents' : 'none' }}>
                <StudiesScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} onOpenBiblePassage={openBiblePassage} onNavigate={navigateTo} onContinueSession={continueToday} onMarkRoutineStep={markRoutineStep} onSelectActiveStudy={selectActiveStudy} autoOpenStudyId={libraryOpenStudyId} onAutoOpenStudyConsumed={() => setLibraryOpenStudyId(null)} />
              </div>
            )}
          </div>
        </div>

        {/* Navegação inferior — só em telas <768px; some na leitura imersiva */}
        {!navHidden && (
          <BottomNav activeTab={activeTab} onNavigate={navigateTo} groupsHasPending={pendingSocialCount > 0} disabledTabs={disabledTabs} lang={session.lang} />
        )}
      </div>

      <ProfileSheet
        open={profileOpen}
        session={session}
        authUser={authUser}
        subscription={subscription}
        isAdmin={isAdmin}
        largeText={largeText}
        onToggleLargeText={toggleLargeText}
        onNavigate={navigateTo}
        onClose={() => setProfileOpen(false)}
        onLogout={handleLogout}
        onResetProgress={handleResetProgress}
        onChangeReadingOrder={selectReadingOrder}
        onSelectPace={selectPlan}
        onProfileUpdated={handleProfileUpdated}
      />
      <AchievementCelebration achievement={celebratingAchievement} lang={session.lang} onClose={dismissAchievementCelebration} />
      <Analytics />
    </div>
  )
}

// Mostrada no lugar da aba Grupos pra contas de menores de 18 anos — segunda
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

// Mostrada no lugar de uma aba inteira que exige Premium (Meu Plano,
// Comunidade, mãos-livres) — segunda linha de defesa (mesmo espírito de
// MinAgeRestricted acima): a Sidebar/BottomNav já levam o clique pra
// 'upgrade', isto cobre o caso de activeTab cair aqui por outro caminho.
// `feature` escolhe o texto ('routine' | 'groups' | 'handsFree'), com
// fallback genérico.
function PremiumRequired({ feature, lang, onNavigate }) {
  const key = ['routine', 'groups', 'handsFree', 'ai'].includes(feature) ? feature : 'generic'
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, textAlign: 'center' }}>
      <AppIcon name={key === 'ai' ? 'Sparkles' : 'Crown'} size={30} color="var(--or)" />
      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--bk)' }}>{t(`billing.premiumRequired.${key}.title`, undefined, lang)}</p>
      <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', maxWidth: 280, lineHeight: 1.5 }}>{t(`billing.premiumRequired.${key}.sub`, undefined, lang)}</p>
      <button
        onClick={() => onNavigate?.('upgrade')}
        style={{ marginTop: 4, border: 'none', background: 'var(--grad-vivid)', color: 'white', borderRadius: 12, padding: '10px 20px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-glow)' }}
      >
        {t('billing.premiumRequired.cta', undefined, lang)}
      </button>
    </div>
  )
}

// Exibida enquanto verificamos se já existe uma sessão do Supabase e, se
// houver, carregamos o progresso salvo — evita um flash da tela de login ou
// de dados vazios antes do carregamento terminar.
function SplashScreen() {
  return (
    // Marca nova (quadros 16a/13a): sobre fundo escuro, o símbolo na placa
    // clara e o logotipo com "Corner" laranja.
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bento-ink)', gap: 14 }}>
      <BrandMark size={66} variant="plate" />
      <BrandLogo size={19} onDark letterSpacing="-.8px" />
    </div>
  )
}
