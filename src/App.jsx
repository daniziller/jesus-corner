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
import { migrateGuestRow } from './backend/userDataStore'
import { migrateGuestExtraTables } from './backend/guestTableStore'
import { clearGuestInviteState } from './onboarding/guestInviteStore'
import { saveOnboardingAnswers, savePendingReminder, getPendingReminder, clearPendingReminder } from './onboarding/onboardingAnswers'
import HomeScreen from './screens/HomeScreen'
import PrayerScreen from './screens/PrayerScreen'
import PrayerRequestsScreen from './screens/PrayerRequestsScreen'
import BlessingScreen from './screens/BlessingScreen'
import ReadingSummaryScreen from './screens/ReadingSummaryScreen'
import ReflectionScreen from './screens/ReflectionScreen'
import RoutineScreen from './screens/RoutineScreen'
import AdjustPlanScreen from './screens/AdjustPlanScreen'
import ReadingOrganizeScreen from './screens/ReadingOrganizeScreen'
import StudyOrganizeScreen from './screens/StudyOrganizeScreen'
import ChooseStartScreen from './screens/ChooseStartScreen'
import ExistingProgressScreen from './screens/ExistingProgressScreen'
import AiSettingsScreen from './screens/AiSettingsScreen'
import ContactScreen from './screens/ContactScreen'
import NotesScreen from './screens/NotesScreen'
import ApplicationPhrasesScreen from './screens/ApplicationPhrasesScreen'
import ThemePlanScreen from './screens/ThemePlanScreen'
import AddStudyScreen from './screens/AddStudyScreen'
import PublicStudiesScreen from './screens/PublicStudiesScreen'
import CreateStudyScreen from './screens/CreateStudyScreen'
import StudyProposalScreen from './screens/StudyProposalScreen'
import CreateAiStudyScreen from './screens/CreateAiStudyScreen'
import StudyProposalNewScreen from './screens/StudyProposalNewScreen'
import GroupPlanProposalScreen from './screens/GroupPlanProposalScreen'
import GroupPlanReaderScreen from './screens/GroupPlanReaderScreen'
import ChronologicalPlanScreen from './screens/ChronologicalPlanScreen'
import JourneyScreen from './screens/JourneyScreen'
import GroupsScreen from './screens/GroupsScreen'
import MessagesScreen from './screens/MessagesScreen'
import StudiesScreen from './screens/StudiesScreen'
import MetricsScreen from './screens/MetricsScreen'
import MetricsBlocksScreen from './screens/MetricsBlocksScreen'
import ProfileScreen from './screens/ProfileScreen'
import ProfileSheet from './screens/ProfileSheet'
import LanguageSettingsScreen from './screens/LanguageSettingsScreen'
import AppearanceScreen from './screens/AppearanceScreen'
import GroupAdminScreen from './screens/GroupAdminScreen'
import UpgradeScreen from './screens/UpgradeScreen'
import AdminScreen from './screens/AdminScreen'
import HandsFreeScreen from './screens/HandsFreeScreen'
import { getCurrentUser, logout, updateLanguage } from './auth/authStore'
import { getCompletedSet, markKeysDone, markKeysUndone, resetProgress } from './progress/progressStore'
import { markChaptersManually, unmarkChaptersManually } from './bible/manualChapterMarks'
import { logChaptersRead } from './bible/chapterReadLog'
import { deriveProgress, pickActiveBlock, computeOverallStats, computeGamificationStats, computeTotalSessions, sessionKeys, computeCompletedBooks, computeBookChapterCounts } from './utils/progress'
import { isAtLeast } from './utils/age'
import { getPrayerStats } from './prayer/prayerStatsStore'
import { getDailyRoutine, setStepDone, setThemePicks } from './routine/dailyRoutineStore'
import { DEFAULT_ROUTINE_MODULES, computeWeekGoalProgress, computeWeeksInGoal, DEFAULT_WEEKLY_GOAL_DAYS } from './routine/routineStreak'
import { getWeeklyGoalDays } from './routine/weeklyGoalStore'
import { getRoutineModules, setRoutineModules as persistRoutineModules } from './routine/routineModulesStore'
import { getActiveStudyId, setActiveStudyId as persistActiveStudyId } from './studies/activeStudyStore'
import { getBibleOrderMode, setBibleOrderMode as persistBibleOrderMode } from './reading/bibleOrderStore'
import { getStepDays, setStepDays as persistStepDays, stepsScheduledForWeekday, nextScheduledWeekday } from './routine/stepDaysStore'
import { getStudyFinishPrefs } from './studies/studyFinishPrefsStore'
import { WEEKDAY_FULL } from './routine/weeklyDaysMath'
import { STEP_ORDER } from './routine/planTodayRows'
import { dateKey } from './utils/dateKey'
import { getSelectedPlanId, setSelectedPlanId } from './plan/planStore'
import { getActiveAltPlan, setActiveAltPlan as persistActiveAltPlan } from './plan/activePlanStore'
import { resolveActivePlanSessions } from './plan/resolveActivePlan'
import { getStepMinutes, setStepMinutes as persistStepMinutes } from './plan/stepMinutesStore'
import { getWeeklyDays, setWeeklyDays as persistWeeklyDays, countTrue } from './routine/weeklyDaysStore'
import { getThemePlans, saveThemePlan, generateThemePlan, regenerateThemePassage } from './themePlans/themePlansStore'
import { publishStudy, recordStudyUse } from './studies/publicStudiesStore'
import { saveAiStudy, getAiStudies } from './studies/aiStudiesStore'
import { studyQuota, currentDayOf } from './studies/estudosStore'
import StudyDayScreen from './screens/StudyDayScreen'
import StudyDayCompleteScreen from './screens/StudyDayCompleteScreen'
import StudyDetailScreen from './screens/StudyDetailScreen'
import StudyCompleteScreen from './screens/StudyCompleteScreen'
import { themeTextKey, deriveThemeTexts } from './themePlans/themeTexts'
import { deriveChronoProgress } from './data/chronologicalPlan'
import { getReadingOrder, setReadingOrder as persistReadingOrder } from './reading/readingOrderStore'
import { getReadingSeconds } from './reading/readingTimeStore'
import ChapterRoomScreen from './screens/ChapterRoomScreen'
import DayCompleteScreen from './screens/DayCompleteScreen'
import MonthRecapScreen, { monthLabel, recapSummary } from './screens/MonthRecapScreen'
import { ensureSnapshotAndGetDueRecap, markRecapShown } from './recap/monthlyRecapStore'
import WeeklySummaryNumbersScreen from './screens/WeeklySummaryNumbersScreen'
import WeeklySummaryTextScreen from './screens/WeeklySummaryTextScreen'
import WeeklySummaryPrayerGroupScreen from './screens/WeeklySummaryPrayerGroupScreen'
import { getWeeklySummaries, markWeeklySummarySeen } from './recap/weeklySummaryStore'
import { renderRecapImage, shareRecapImage } from './recap/recapImage'
import { getHighlights } from './highlights/highlightsStore'
import { saveNote, getNotes } from './notes/notesStore'
import { getLastReadPosition, setLastReadPosition } from './reading/lastReadPositionStore'
import { PLANS } from './data/bibleBlocks'
import { getAppLanguage, setAppLanguage } from './i18n/appLanguageStore'
import { getFontSizePt, setFontSizePt, zoomForFontSize, FONT_SIZE_STEPS, DEFAULT_FONT_SIZE_PT } from './utils/textScaleStore'
import { detectLanguageFromIp } from './i18n/detectLanguage'
import { t } from './i18n'
import { getMyActiveChallenges, recordChallengeProgress } from './groups/challengesStore'
import { getPendingGroupInvitesCount, getMyGroups } from './groups/groupsStore'
import {
  getMyPendingGroupPlanInvites, getMyAcceptedGroupPlans,
  sendGroupReadingPlan, respondToGroupReadingPlan,
} from './groups/groupPlansStore'
import { setRoomQuestion } from './groups/chapterRoomStore'
import { getPendingFriendRequestsCount } from './friends/friendsStore'
import { getMyProfile } from './profile/profileStore'
import { getMySubscription, isPremiumActive } from './billing/subscriptionStore'
import { resolveEntitlement } from './billing/entitlement'
import { checkIsAdmin } from './admin/adminStore'
import { applyPendingInvite, redeemPendingInviteCode } from './invites/inviteStore'
import { savePendingFriendUsername, redeemPendingFriendUsername } from './friends/inviteLinkStore'
import { applyPendingOnboardingChoices } from './onboarding/pendingOnboardingChoices'
import { logActivity } from './activity/activityStore'
import { syncPushTimezone, subscribeToPush } from './notifications/pushStore'
import { avatarInitialsOf } from './utils/avatarInitials'
import { findCurrentReadingSession } from './reading/findCurrentReadingSession'

function defaultBlockIdFor(completedSet, planId, readingOrder, readingMinutesPerDay = null) {
  return pickActiveBlock(deriveProgress(completedSet, planId, readingOrder, readingMinutesPerDay).blocks).id
}

// ─────────────────────────────────────────
// Monta o estado de "sessão do app" (em produção: substituir por Context
// API ou Zustand) a partir do usuário logado + progresso já derivado.
// A ideia central é "1 sessão = 1 dia": o plano (Leve/Padrão/Intensivo)
// muda o TAMANHO das sessões, então "dias restantes" é só a contagem de
// sessões que faltam no plano atual.
// ─────────────────────────────────────────
function buildSession(authUser, blocks, sessionsByBlock, dailyRoutine, planId, completedSet, prayerStats, readingOrder, activeAltPlan, themePlans, routineModules, activeStudyId, lastReadPosition, groupPlans, stepMinutes) {
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
  const activePlanData = resolveActivePlanSessions(activeAltPlan, themePlans, completedSet, blocks, sessionsByBlock, planId, todayThemePicks, groupPlans, stepMinutes?.reading)
  // Sessão (e bloco) onde o plano realmente está — a primeira ainda não
  // concluída, na ordem canônica (ver findCurrentReadingSession.js: não
  // depende mais de onde a pessoa tocou por último, só do completedSet).
  const { session: currentSession, block: activeBlock } = findCurrentReadingSession(activePlanData.blocks, activePlanData.sessionsByBlock)
  // Onde o plano fixo (Gênesis…) ficou pausado, pra mostrar em Meu Plano
  // (quadro 22c: "Gênesis pausado em 41 · Retomar já") enquanto um estudo
  // (activeAltPlan) estiver ativo — sempre calculado a partir de
  // blocks/sessionsByBlock ORIGINAIS (não activePlanData.blocks, que já
  // seriam os do estudo), então não depende de qual plano está "de hoje".
  const pausedFixedSession = activePlanData.kind !== 'fixed'
    ? findCurrentReadingSession(blocks, sessionsByBlock).session
    : null
  const overall = computeOverallStats(blocks)
  const planRaw = PLANS.find(p => p.id === planId) ?? PLANS.find(p => p.id === 'standard')
  // Minutos de cada passo (Bloco 4 do redesign) — a fonte real agora é
  // stepMinutes (conta, sincroniza entre aparelhos — ver stepMinutesStore.js),
  // não mais o ritmo escolhido; planRaw só entra como PADRÃO enquanto a
  // pessoa não tiver salvo nada ainda (stepMinutes.<passo> null). Leitura é
  // a única sem 0 como resposta válida (ver validação no store) — sempre
  // um número, nunca desliga o passo.
  const plan = {
    ...planRaw,
    label: lang === 'en' ? planRaw.labelEn : planRaw.label,
    prayerMinutes: stepMinutes?.prayer ?? planRaw.prayerMinutes,
    readingMinutes: stepMinutes?.reading ?? planRaw.readingMinutes,
    reflectionMinutes: stepMinutes?.reflection ?? planRaw.reflectionMinutes,
  }
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

  // computeGamificationStats devolve capítulos/livros/blocos concluídos —
  // dado real, usado em Métricas e na Home. O campo `xp` que ela também
  // calcula (e o sistema de XP/nível/conquistas que crescia em cima dele)
  // saiu na varredura de identidade (Bloco 1, FLUXO-DO-APP.md seção 11).
  const gami = computeGamificationStats(completedSet, sessionsByBlock, blocks)

  const displayTitle = lang === 'en' ? currentSession.titleEn : currentSession.title
  const displayPassage = lang === 'en' ? currentSession.passageEn : currentSession.passage
  const blockName = lang === 'en' ? activeBlock.nameEn : activeBlock.name

  // Bloco atual da Bíblia pra Home (redesign 1a) — nome do bloco em foco,
  // ícone, percentual, e "Livro X de Y capítulos" quando a sessão de hoje é
  // de leitura (reflexão de fim de livro não tem capítulo). O total de
  // capítulos do livro sai da mesma fonte de Progresso/Notas.
  const bookChapterCounts = computeBookChapterCounts(sessionsByBlock)
  const currentBookDisplay = lang === 'en' ? (currentSession.bookEn || currentSession.book) : currentSession.book
  // Progresso do LIVRO onde a pessoa está (não do bloco inteiro) — "80% de
  // Gênesis" no quadro 29a ("Onde você está"). Conta capítulos concluídos
  // com a mesma chave de sessionKeys ("livro:capítulo"), 1 a 1 até o total
  // do livro; reflexão de fim de livro não entra nessa conta.
  const bookTotalChapters = bookChapterCounts[currentSession.book] ?? 0
  let bookChaptersDone = 0
  for (let ch = 1; ch <= bookTotalChapters; ch++) {
    if (completedSet.has(`${currentSession.book}:${ch}`)) bookChaptersDone++
  }
  const bookPercent = bookTotalChapters > 0 ? Math.round((bookChaptersDone / bookTotalChapters) * 100) : 0
  const currentBlock = {
    name: blockName,
    icon: activeBlock.icon,
    percent: activeBlock.percent ?? 0,
    // Peças soltas pro painel 12a ("Gênesis 40 de 50").
    book: currentBookDisplay,
    chapter: (currentSession.type === 'reflection' || currentSession.chStart == null) ? null : currentSession.chStart,
    bookChapters: bookChapterCounts[currentSession.book] ?? null,
    bookPercent,
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
    sessionsLeft: computeTotalSessions(blocks) - overall.sessionsDone,
    // "Sem plano" (28d) — a pessoa escolheu não ter um trecho do dia pra
    // Leitura; ela lê e marca livre pela aba Bíblia (28c). Home/Meu Plano
    // checam isso pra trocar "sessão de hoje" por um convite pra ler livre
    // em vez de fingir que existe um alvo — Oração/Reflexão continuam
    // normais, é só a LEITURA que muda de figura.
    hasNoPlan: planId === 'none',
    plan,
    activePlan,
    readingOrder,
    // Quais passos entram na rotina diária, independente do plano de
    // leitura acima (ver routineModulesStore.js) — Home/Rotina/Reflexão e
    // o RoutineStepSwitcher leem daqui em vez de plan.modules.
    routineModules: routineModules ?? DEFAULT_ROUTINE_MODULES,
    activeStudyId: activeStudyId ?? null,
    // Quadro 22c ("Gênesis pausado em 41 · Retomar já") — null quando não
    // há nada pausado (plano fixo já é o de hoje, ver activePlan.kind).
    pausedFixedSession: pausedFixedSession
      ? { title: lang === 'en' ? pausedFixedSession.titleEn ?? pausedFixedSession.title : pausedFixedSession.title }
      : null,
    // Nome do 1º bloco na ordem ATUAL (Pentateuco ou Evangelhos) — usado no
    // texto de "Reiniciar leitura" da aba Perfil, pra não ficar hardcoded
    // "Pentateuco" quando a ordem for NT primeiro (ver ProfileScreen.jsx).
    firstBlockName: lang === 'en' ? blocks[0].nameEn : blocks[0].name,
    dailyRoutine,
    todayRoutine,
    currentBlock,
    // "Você parou em Gênesis 41" + "ontem às 6:48" (29a) — última posição
    // salva por lastReadPositionStore.js (por dispositivo, ver o arquivo).
    // Pode ser diferente de currentBlock.chapter: aquele é o PRÓXIMO
    // capítulo pendente (pra "Continuar em 42"), este é o ÚLTIMO que a
    // pessoa de fato abriu/concluiu.
    lastReadPosition: lastReadPosition
      ? { book: lastReadPosition.book, chapter: lastReadPosition.chapter, readAt: lastReadPosition.readAt ?? null }
      : null,
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
  // Botão de voltar do login (13b) num dispositivo que já autenticou antes:
  // em vez de cair de novo no login, mostra as boas-vindas de novo.
  const [loginDismissed, setLoginDismissed] = useState(false)
  // Boas-vindas (13a) — a capa do app pra quem nunca autenticou neste
  // dispositivo. "Começar a ler" segue pro onboarding de 7 telas
  // (OnboardingFlow, 15a–15e); "Já tenho conta" vai pro login.
  const [welcomeDone, setWelcomeDone] = useState(false)
  // Onboarding concluído, esperando o cadastro (obrigatório desde
  // 2026-09-07 — ver finishOnboarding) — guarda as respostas só pra
  // alimentar o cartão "o que vai pra conta" do SignupScreen (chaptersRead,
  // planId); o progresso de verdade já foi salvo na linha local de
  // convidado por finishOnboarding, antes deste estado ser setado.
  const [pendingSignupAnswers, setPendingSignupAnswers] = useState(null)
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
  // Painel admin (23a-d, Bloco 14) roda fora do chrome do app inteiro — ver
  // .admin-active em index.css. Precisa ficar ANTES dos retornos antecipados
  // de bootstrap/login (mais abaixo) pra não virar um hook condicional: como
  // 'activeTab' só existe de verdade DEPOIS do login, chamar este useEffect
  // junto da tela principal (só alcançada pós-login) fazia a árvore de hooks
  // ter uma quantidade diferente entre a tela de login e a tela do app,
  // travando o React inteiro em branco ("Rendered more hooks than during
  // the previous render") assim que alguém terminava o cadastro/onboarding.
  useEffect(() => {
    document.documentElement.classList.toggle('admin-active', activeTab === 'admin')
  }, [activeTab])
  // Leitura social (17a–17c): grupos da pessoa (o botão "Grupo" do leitor usa
  // o primeiro), a sala de capítulo aberta e a retrospectiva do mês devida.
  const [myGroups, setMyGroups] = useState([])
  const [chapterRoom, setChapterRoom] = useState(null) // { group, book, bookEn, chapter }
  const [monthRecap, setMonthRecap] = useState(null)
  const recapCheckedFor = useRef(null)
  // Resumo semanal (31a/31b/31c, Bloco 13) — histórico já pronto, gravado
  // pelo cron de domingo à noite (ver api/send-weekly-digest.js); o app só
  // lê. `weekSummaryIndex` é qual semana as 3 telas estão mostrando agora
  // (0 = mais recente) — mora aqui, não em cada tela, pra sobreviver à
  // navegação entre as 3.
  const [weeklySummaries, setWeeklySummaries] = useState([])
  const [weekSummaryIndex, setWeekSummaryIndex] = useState(0)
  useEffect(() => {
    if (!authUser?.email) { setWeeklySummaries([]); return }
    getWeeklySummaries().then(setWeeklySummaries).catch(err => console.error('Failed to load weekly summaries', err))
  }, [authUser?.email])

  // "SUA SEMANA" (Home, 34a) — único ponto de entrada real das 3 telas de
  // resumo semanal até agora (weeklySummaryNumbers/Text/PrayerGroup
  // existiam desde o Bloco 13, mas nenhuma tela navegava até elas — ver
  // handoff-hoje-34). Marca vista na hora (a Home some com o cartão assim
  // que a pessoa toca "Ler", não só depois de voltar) — otimista, com
  // fallback pro estado anterior se a gravação falhar.
  function openWeeklySummaryFromHome(weekKey) {
    setWeekSummaryIndex(0)
    goToTab('weeklySummaryNumbers')
    const previous = weeklySummaries
    setWeeklySummaries(prev => prev.map(s => s.weekKey === weekKey ? { ...s, seen: true } : s))
    markWeeklySummarySeen(weekKey).catch(err => {
      console.error('Failed to mark weekly summary as seen', err)
      setWeeklySummaries(previous)
    })
  }
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
  // Snapshot pra tela de fechamento do dia (37c, DayCompleteScreen) —
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
  // Dias específicos da semana (Bloco 2/8, weekly_days) — weeklyGoalDays
  // acima continua existindo em paralelo (compatibilidade, ver
  // weeklyDaysStore.js), mas quem decide QUAIS dias marcar/lembrar é este
  // array de 7 booleanos, editável de verdade em Ajustar meu plano (27a).
  const [weeklyDays, setWeeklyDaysState] = useState([true, true, true, true, true, false, false])
  // Minutos reais de cada passo (Bloco 4 do redesign, item 2/6 da seção 5 —
  // ver stepMinutesStore.js) — null em cada campo até carregar/enquanto sem
  // preferência salva (quem lê decide o padrão: session.plan.*Minutes cobre
  // isso em buildSession). reading, desde a decisão tomada com a autora
  // neste bloco, é a fonte REAL do tamanho da sessão de leitura do plano
  // fixo (ver deriveProgress/dynamicSessions.js) — substitui os 4 ritmos
  // fixos (Leve/Padrão/Intensivo), mantidos só pro plano Livre/navegação.
  const [stepMinutes, setStepMinutesState] = useState({ prayer: null, reading: null, reflection: null })
  // Dias por passo (turno 35, stepDaysStore.js) — precisado aqui (não só em
  // HomeScreen/RoutineScreen) pra "Começar meu plano" (startGuidedRoutine
  // abaixo) encadear os passos de HOJE de verdade, incluindo Estudo — antes
  // usava um GUIDED_STEPS fixo [oração,leitura,reflexão] que ignorava
  // stepDays e nunca sabia de Estudo, discordando do que Meu Plano/Home já
  // mostravam (achado corrigindo o pacote 36-37, ver startGuidedRoutine).
  const [stepDays, setStepDaysState] = useState(null)
  const [activeBlockId, setActiveBlockId] = useState(1)
  // "Onde começar" (28d/28e, Bloco 6) — a escolha feita em 28d, guardada só
  // enquanto a folha 28e (reconciliação de progresso prévio) está aberta;
  // nunca persiste sozinha (aplicar de vez é applyStartChoice/
  // applyExistingProgressChoice, chamados só na confirmação final).
  const [pendingStartChoice, setPendingStartChoice] = useState(null) // { book, order } | null
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
  // Turno 41, Bloco 2 — cota mensal de verdade (41b): a criação por IA
  // (CreateAiStudyScreen.jsx/35d) persiste em ai_studies, não theme_plans
  // (ver saveAiStudyDraftAsPersonalCopy), então a cota precisa ler daqui,
  // não de themePlans (que é o que api/generate-theme-plan.js já conferia
  // — checagem real mas contra o array errado, nunca disparava).
  const [aiStudies, setAiStudies] = useState([])
  // Plano recém-gerado em CreateStudyScreen.jsx (22a), ainda não salvo —
  // vive só entre a geração e a decisão em StudyProposalScreen.jsx (22b:
  // "Salvar p/ depois" ou "Começar"). Null fora dessa janela.
  const [generatedStudyPlan, setGeneratedStudyPlan] = useState(null)
  // Texto digitado no mini-campo de "Criar com a IA" de AddStudyScreen.jsx
  // (26e) — carregado pro campo de verdade de CreateStudyScreen.jsx (22a)
  // pra revisar/escolher formato antes de gerar (26e não gera nada sozinho).
  const [createStudyInitialText, setCreateStudyInitialText] = useState('')
  // Planos do grupo (22d) que EU já aceitei — mesmo motivo de themePlans
  // acima: buildSession precisa saber as sessões do plano de grupo ativo
  // sem esperar um fetch. Convites ainda pendentes (não aceitos/recusados)
  // ficam à parte, só pro banner de GroupsScreen (ver refreshGroupPlans).
  const [groupPlans, setGroupPlans] = useState([])
  const [pendingGroupPlanInvites, setPendingGroupPlanInvites] = useState([])
  // Plano de grupo recém-montado em CreateStudyScreen.jsx (formato "Para o
  // grupo"), ainda não enviado — vive só entre montar e decidir em
  // GroupPlanProposalScreen.jsx (22d: "Enviar para o grupo"). Null fora
  // dessa janela — mesmo padrão de generatedStudyPlan acima.
  const [generatedGroupPlan, setGeneratedGroupPlan] = useState(null)
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
  // Ordem da leitura contínua da Bíblia (turno 35, 35i) — 'canonical' e
  // 'chronological' são espelhadas em activeAltPlan (ver saveBibleOrderMode
  // mais abaixo), reusando o mecanismo de plano cronológico alternativo que
  // já existia (mesmo completedSet, nunca reseta progresso — só 'custom'
  // ("Minha ordem") ainda não tem essa ponte: afeta o que 35c/35i MOSTRAM,
  // mas "Ler agora" ainda abre a ordem canônica de verdade até uma leva
  // futura — decisão registrada, não um esquecimento).
  const [bibleOrderMode, setBibleOrderModeState] = useState('canonical')
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
  // "Barra de abas fixa só em 39a" (pacote 39) — JourneyScreen.jsx avisa
  // quando a navegação livre passa da raiz (lista de livros, grade de
  // capítulos, leitura embutida), pra esconder a barra igual à leitura
  // guiada (immersiveReading abaixo), sem precisar de um activeTab à parte
  // pra cada tela empilhada dentro da aba.
  const [journeyPastRoot, setJourneyPastRoot] = useState(false)
  // Sessão específica a destacar quando entryMode é 'reading' — garante que a
  // Leitura abra featurando exatamente a mesma sessão que a Home mostrou.
  const [journeyResumeSessionId, setJourneyResumeSessionId] = useState(null)
  // Pedido de pular direto pra um livro+capítulo específico em modo livre
  // (browse) — usado pelos links de passagem bíblica das anotações de
  // sermão (ver openBiblePassage abaixo). Objeto novo a cada pedido (nunca
  // reaproveitado), pra JourneyScreen.jsx sempre detectar a mudança mesmo
  // quando o alvo é o mesmo capítulo de antes.
  const [browseJumpTarget, setBrowseJumpTarget] = useState(null)
  // Pular de 33b (Mensagens) pra um grupo específico ou pra Adicionar
  // amigos (24c) dentro da Comunidade — mesmo padrão de browseJumpTarget
  // acima: GroupsScreen.jsx consome e limpa sozinho (useEffect).
  const [groupsEntryTarget, setGroupsEntryTarget] = useState(null)
  // Acessibilidade: tamanho do texto — por dispositivo (19a, "Aparência e
  // texto"), ver src/utils/textScaleStore.js e a regra .app-content-inner
  // { zoom: var(--text-zoom) } em index.css.
  const [fontSizePt, setFontSizePtState] = useState(getFontSizePt)

  useEffect(() => {
    document.documentElement.style.setProperty('--text-zoom', String(zoomForFontSize(fontSizePt)))
  }, [fontSizePt])

  function changeFontSizePt(pt) {
    setFontSizePtState(pt)
    setFontSizePt(pt)
  }

  // Atalho rápido do "T" no cabeçalho/barra lateral (AppHeader.jsx/
  // Sidebar.jsx) — alterna entre o tamanho padrão e um "grande" (20pt),
  // mesmo espírito do liga/desliga antigo; o controle fino (os 5 tamanhos)
  // mora só em 19a.
  const largeText = fontSizePt > DEFAULT_FONT_SIZE_PT
  function toggleLargeText() {
    changeFontSizePt(largeText ? DEFAULT_FONT_SIZE_PT : 20)
  }

  const { blocks, sessionsByBlock } = useMemo(
    () => deriveProgress(completedSet, planId, readingOrder, stepMinutes.reading),
    [completedSet, planId, readingOrder, stepMinutes.reading]
  )
  // Total de capítulos por livro — usado pelo fluxo "onde começar" (28d/28e,
  // Bloco 6) pra saber quantos capítulos tem o livro escolhido, sem
  // depender de estar dentro de buildSession.
  const bookChapterCounts = useMemo(() => computeBookChapterCounts(sessionsByBlock), [sessionsByBlock])

  // ── Retrospectiva do mês (17b) ──
  // Uma vez por sessão de usuário: garante o snapshot do mês e, se o mês
  // anterior tem retrospectiva ainda não mostrada, abre a tela.
  useEffect(() => {
    if (!bootstrapped || !authUser || recapCheckedFor.current === (authUser.email ?? 'guest')) return
    recapCheckedFor.current = authUser.email ?? 'guest'
    let cancelled = false
    ;(async () => {
      const [seconds, hl, notes] = await Promise.all([getReadingSeconds().catch(() => 0), getHighlights(authUser.email).catch(() => []), getNotes(authUser.email).catch(() => ({}))])
      const recap = await ensureSnapshotAndGetDueRecap({
        chaptersRead: [...completedSet].filter(k => !k.endsWith(':reflection')).length,
        readingSeconds: seconds,
        completedBooks: [...computeCompletedBooks(completedSet, sessionsByBlock)],
        highlights: hl,
        notes,
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
        // Sem sessão real — decisão de produto de 2026-09-07: ninguém lê
        // sem conta, nem quem já tinha um resto de progresso de convidado
        // salvo neste aparelho de antes desta mudança (redesign 1g/etapa 7,
        // encerrado — ver App.jsx no PR que apagou o modo convidado). O
        // render mais abaixo mostra Boas-vindas → Onboarding → Cadastro; o
        // progresso local antigo (se existir) migra pra dentro da conta
        // assim que ela for criada (migrateGuestRow(), sempre "servidor
        // vence" — ver userDataStore.js), sem se perder.
        if (!cancelled) setBootstrapped(true)
        return
      } else {
        // Sessão real encontrada com progresso de convidado ainda por
        // migrar (ex: voltando do redirect de confirmação de email depois
        // de ler como convidado e só então cadastrar) — mesma função que
        // SignupScreen chama no caminho comum. Sem progresso de convidado,
        // não faz nada. migrateGuestRow() sempre faz "servidor vence" —
        // nunca sobrescreve um campo que a conta já tinha, mesmo aqui: este
        // branch roda em QUALQUER carregamento do app com sessão real +
        // resto de convidado no aparelho, não só logo após um cadastro de
        // verdade (não dá pra saber diferenciar isso só pelo momento da
        // chamada) — ver o comentário de migrateGuestRow em
        // userDataStore.js pra a perda de dado real que essa distinção
        // causou numa conta em produção.
        await migrateGuestRow().catch(err => console.error('Failed to migrate guest progress', err))
        // Bloco 2 do redesign — session_seconds/chapters_read (tabelas à
        // parte de user_data) têm sua própria migração de convidado, ver
        // src/backend/guestTableStore.js.
        await migrateGuestExtraTables().catch(err => console.error('Failed to migrate guest extra tables', err))
        clearGuestInviteState()
      }

      // Aplica plano/ordem de leitura pendentes (salvos no onboarding se a
      // confirmação de email interrompeu o cadastro) ANTES de ler
      // plano/ordem abaixo — senão a leitura corre em paralelo com essa
      // escrita e pode vencer a corrida, mostrando o default por engano
      // mesmo com o valor certo já salvo um instante depois.
      await applyPendingOnboardingChoices()
      if (cancelled) return

      const [set, userPlanId, userReadingOrder, userWeeklyGoalDays, userWeeklyDays, userStepMinutes, userStepDays, userActiveAltPlan, userThemePlans, userAiStudies, routine, userRoutineModules, userActiveStudyId, userBibleOrderMode, stats, challenges, pendingSocial, myProfile, mySubscription, adminStatus, inviteAppliedByEmail, inviteAppliedByCode, groups, acceptedGroupPlans, pendingGroupPlans] = await Promise.all([
        getCompletedSet(user.email),
        getSelectedPlanId(user.email),
        getReadingOrder(user.email),
        getWeeklyGoalDays(user.email),
        getWeeklyDays(),
        getStepMinutes(),
        getStepDays(),
        getActiveAltPlan(user.email),
        getThemePlans(user.email),
        getAiStudies(user.email),
        getDailyRoutine(),
        getRoutineModules(user.email),
        getActiveStudyId(user.email),
        getBibleOrderMode(),
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
      getMyAcceptedGroupPlans().catch(() => []),
      getMyPendingGroupPlanInvites().catch(() => []),
      ])
      if (cancelled) return
      // Username de /d/:username salvo antes de existir sessão (ver
      // App.jsx mais abaixo e src/friends/inviteLinkStore.js) — mesmo
      // padrão de redeemPendingInviteCode, só que não afeta assinatura,
      // por isso fica fora do Promise.all de cima.
      redeemPendingFriendUsername().catch(() => false)
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
      setWeeklyDaysState(userWeeklyDays)
      setStepMinutesState(userStepMinutes)
      setStepDaysState(userStepDays)
      setActiveAltPlanState(userActiveAltPlan)
      setThemePlans(userThemePlans)
      setAiStudies(userAiStudies)
      setActiveBlockId(defaultBlockIdFor(set, userPlanId, userReadingOrder, userStepMinutes.reading))
      setDailyRoutine(routine)
      setRoutineModulesState(userRoutineModules)
      setActiveStudyIdState(userActiveStudyId)
      setBibleOrderModeState(userBibleOrderMode)
      setPrayerStats(stats)
      setActiveChallenges(challenges)
      setPendingSocialCount(pendingSocial)
      setMyAvatarUrl(myProfile?.avatarUrl ?? null)
    setMyGroups(groups ?? [])
      setGroupPlans(acceptedGroupPlans ?? [])
      setPendingGroupPlanInvites(pendingGroupPlans ?? [])
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
    if (guidedFlowRef.current && !['prayer', 'prayerRequests', 'blessing', 'reflection', 'journey', 'themePlan', 'chronologicalPlan'].includes(tab)) {
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
  // Quanto tempo o passo recém-concluído fica na tela ("concluído!") antes
  // de o app abrir o próximo — respiro pra pessoa perceber a transição.
  const GUIDED_ADVANCE_MS = 2600

  function guidedTabFor(step) {
    if (step === 'prayer') return 'prayer'
    if (step === 'reflection') return 'reflection'
    return null
  }

  // Passos de HOJE, na ordem em que a rotina guiada os encadeia — MESMA
  // conta de RoutineScreen.jsx/HomeScreen.jsx (stepDays por passo). Antes
  // disto, "Começar meu plano" usava um GUIDED_STEPS fixo [oração,leitura,
  // reflexão] que ignorava stepDays e nunca incluía Estudo — discordando
  // do que a própria lista de Meu Plano/Home já mostravam (achado
  // corrigindo o pacote 36-37: o botão "abre o passo da vez" precisa
  // abrir o MESMO passo que a lista aponta como "agora").
  //
  // A substituição leitura→estudo daqui (quando havia activeStudyId) saiu
  // em 2026-09-09: era resquício do modelo antigo de "estudo ativo
  // substitui a leitura", já abandonado pelas trilhas independentes
  // (RoutineScreen.jsx/HomeScreen.jsx não fazem mais essa troca desde o
  // handoff-app-completo) — só este arquivo ainda fazia, e junto com o
  // mesmo achado dela (toggle desligado não pausava o Estudo de verdade)
  // podia encadear pro passo Estudo mesmo com o toggle dele desligado.
  // Cada passo agora só entra aqui se estiver de fato ligado E agendado
  // pra hoje — leitura e estudo, se os dois estiverem, aparecem os dois,
  // na ordem de STEP_ORDER. Leitura e Estudo são 100% independentes: o
  // único critério é o calendário de CADA passo (Ajustar meu plano) — os
  // dois podem coincidir no mesmo dia sem problema (ver comentário em
  // stepDaysMath.js).
  function todaysGuidedSteps() {
    const enabled = new Set(routineModules ?? DEFAULT_ROUTINE_MODULES)
    const activeSteps = STEP_ORDER.filter(k => enabled.has(k))
    const todayIdx = (new Date().getDay() + 6) % 7
    return stepDays ? stepsScheduledForWeekday(stepDays, activeSteps, todayIdx) : []
  }

  // Iniciar em Meu Plano — encadeia os passos ligados. Com 0 ou 1 passo não
  // há o que encadear: só abre aquele passo (ou nada), sem o "modo guiado".
  function startGuidedRoutine() {
    // Rotina guiada é recurso Premium — sem assinatura, o botão leva pra
    // tela de assinar (a aba Meu Plano já é travada, mas a Home também tem
    // um atalho de "Começar").
    if (!hasPremium) { goToTab('upgrade'); return }
    const steps = todaysGuidedSteps()
    if (steps.length === 0) return
    // Começa no passo ATUAL — o primeiro ainda não feito hoje (redesign 1c:
    // "vai para o passo atual da rotina, não para o início dela"). Se todos
    // já foram feitos, reabre o último.
    const today = dailyRoutine[dateKey()] ?? {}
    let startIdx = steps.findIndex(s => !today[s])
    if (startIdx < 0) startIdx = steps.length - 1
    const openStep = step => step === 'reading' ? continueToday() : step === 'study' ? openActiveStudy() : goToTab(step)
    // Sem passos pra encadear a partir daqui (só sobrou 1) — abre direto,
    // sem o "modo guiado". Estudo entra na CONTAGEM (Oração/Reflexão
    // mostram "passo N de M" certo em dia de Estudo ativo), mas não no
    // encadeamento automático — StudiesScreen não avisa quando o dia
    // termina (mesma exceção de sempre, ver comentário de advanceGuided).
    if (steps.length - startIdx <= 1 || steps[startIdx] === 'study') { openStep(steps[startIdx]); return }
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
      const nextStep = gf.steps[nextIdx]
      // Estudo não tem sinal de conclusão (StudiesScreen não chama
      // advanceGuided) — abre, mas sai do modo guiado; a pessoa retoma o
      // encadeamento tocando de novo em "Continuar meu plano".
      if (nextStep === 'study') {
        setGuidedFlow(null)
        openActiveStudy()
        return
      }
      setGuidedFlow({ steps: gf.steps, idx: nextIdx })
      if (nextStep === 'reading') continueToday()
      else goToTab(guidedTabFor(nextStep))
    }, GUIDED_ADVANCE_MS)
  }

  // Fim da Oração (pacote 36-37) — diferente dos outros passos, a Oração
  // não encadeia direto pro próximo (advanceGuided, com banner e delay):
  // ela sempre passa pela bênção (36f) primeiro, que tem seus PRÓPRIOS
  // botões pra continuar. Por isso avança o bookkeeping de guidedFlow na
  // hora (sem esperar GUIDED_ADVANCE_MS) e vai direto pra 'blessing' — sem
  // isso o auto-avanço de advanceGuided pularia a bênção e iria direto pro
  // próximo passo, contra o quadro (36b/36c → 36f → 35f/37c).
  function finishPrayerStep() {
    markRoutineStep('prayer')
    const gf = guidedFlowRef.current
    if (gf && gf.steps[gf.idx] === 'prayer') {
      const nextIdx = gf.idx + 1
      setGuidedFlow(nextIdx >= gf.steps.length ? null : { steps: gf.steps, idx: nextIdx })
    }
    goToTab('blessing')
  }

  // "Terminar o dia" em 36f, quando a Oração era o último passo de hoje —
  // interino: ainda leva pro fecho antigo (routineComplete) até o Bloco 5
  // desta leva (37c/37d) trazer o fecho de verdade.
  function finishDayFromBlessing() {
    setGuidedFlow(null)
    setRoutineCompleteInfo({ steps: session.todaysSteps ?? ['prayer'], readingSession: lastReadSession })
    goToTab('routineComplete')
  }

  function backToPlanFromBlessing() {
    exitGuidedRoutine()
    goToTab('routine')
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

  // Link pessoal de amigo (24c, "jesuscorner.app/d/username" — ver
  // src/friends/inviteLinkStore.js) — o app não tem roteamento de verdade
  // (é tudo estado do React), então quem abre /d/:username cai aqui uma vez
  // no carregamento: guarda o username e limpa a URL na hora, ANTES de
  // saber se a pessoa já tem sessão ou não. redeemPendingFriendUsername()
  // (chamada no bootstrap logo abaixo e em handleAuthenticated) é quem de
  // fato manda o pedido, assim que existir sessão — cobre tanto quem já
  // estava logado quanto quem precisa criar conta/entrar primeiro.
  useEffect(() => {
    const match = /^\/d\/([a-z0-9_]{3,20})\/?$/i.exec(window.location.pathname)
    if (!match) return
    window.history.replaceState({}, '', '/')
    savePendingFriendUsername(match[1])
  }, [])

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
    // "Sem plano" (28d) — não existe "sessão de hoje" pra abrir; manda pra
    // aba Bíblia em modo livre, onde a pessoa lê e marca o que quiser (ver
    // session.hasNoPlan em buildSession).
    if (planId === 'none' && !activeAltPlan) {
      goToTab('journey')
      return
    }
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
    // Plano do grupo (22d) — sem "sessão de hoje" restrita como o por tema
    // (needsThemePick não existe aqui, ver resolveActivePlan.js), então
    // sempre dá pra abrir direto no leitor (GroupPlanReaderScreen.jsx acha
    // sozinho onde a pessoa parou, via completedSet).
    if (activeAltPlan?.type === 'group') {
      goToTab('groupPlanReader')
      return
    }
    const { session: resumeSession, block } = findCurrentReadingSession(blocks, sessionsByBlock)
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

  // "Anotar uma pregação"/"Anotar um sermão" (Home) — correção pedida em
  // 2026-09-09: NÃO entra na Bíblia de cara mais (isso era o comportamento
  // antigo, que pulava pro último capítulo lido com 34d já expandida).
  // Agora só sinaliza pra JourneyScreen.jsx começar uma anotação nova a
  // partir da folha de campos (34f — tipo/título/preletor/...), sem
  // navegar pra nenhum capítulo; depois de preencher e tocar "Pronto", a
  // folha (34d) abre sobre a tela INICIAL da Bíblia (Antigo/Novo
  // Testamento), não sobre um texto específico — ver browseJumpTarget
  // .openSermonNote em JourneyScreen.jsx.
  function openSermonNoteFromHome() {
    setBrowseJumpTarget({ openSermonNote: true })
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

  // "Meus estudos" (4c, Biblioteca/NotesScreen.jsx) — só abre o plano pra
  // ver/retomar dentro de ThemePlanScreen, sem trocar a leitura de hoje
  // (isso é openThemePlanToday acima, de "Continuar sessão"/plano recém-gerado).
  function openThemePlanDetail(planId) {
    setThemeAutoOpenId(planId)
    setThemeAutoOpenKeys(null)
    navigateTo('themePlan')
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

  // Etapa 10 (22a/22b) — CreateStudyScreen gera o plano (IA ou, no formato
  // Livro, 100% local) mas ainda não salva nada; StudyProposalScreen
  // mostra a proposta e só aqui, na decisão final, o plano vira real.
  function reviewGeneratedStudy(plan) {
    // Formato "Para o grupo" segue pra 22d (GroupPlanProposalScreen), não
    // pra 22b — proposta/envio de plano de grupo é um fluxo bem diferente
    // (pergunta da semana, convite pra cada membro), mas nasce do MESMO
    // botão "Criar"/CreateStudyScreen.jsx, então reaproveita o mesmo
    // callback onGenerated em vez de duplicar a tela inteira.
    if (plan.format === 'group') {
      setGeneratedGroupPlan(plan)
      goToTab('groupPlanProposal')
      return
    }
    setGeneratedStudyPlan(plan)
    goToTab('studyProposal')
  }

  // "Refazer" (quadro 22b) — pede outra proposta inteira pro MESMO
  // assunto, sem sair da tela de revisão. Só existe pra planos com `scope`
  // (formato Livro não tem assunto pra regenerar — o botão nem aparece
  // nesse caso, ver StudyProposalScreen.jsx).
  async function refazerGeneratedStudy(currentPlan) {
    const fresh = await generateThemePlan(currentPlan.scope, 'standard', session.lang)
    setGeneratedStudyPlan({ ...fresh, format: currentPlan.format })
  }

  // "Usar" um pronto (26e) ou um do banco da comunidade (26g) — pula 22a
  // de vez (não há "pedido" pra revisar, o conteúdo já existe) direto pra
  // 26f/22b com o conteúdo do banco já carregado. Sem `scope`: os botões
  // de regenerar/trocar dia não aparecem (mesma regra do formato Livro).
  function useStudyFromBank(study) {
    recordStudyUse(study.id).catch(err => console.error('Failed to record study use', err))
    setGeneratedStudyPlan({ id: study.id, title: study.title, overview: study.overview, format: study.format, passages: study.passages })
    goToTab('studyProposal')
  }

  // Publica no banco de estudos (migration 0053) quando 26f escolheu
  // 'invited'/'public' — chamado DEPOIS de salvar a cópia pessoal (Salvar
  // p/ depois/Começar), nunca no lugar dela; as duas coisas não se
  // misturam (ver StudyProposalScreen.jsx). Falha aqui não desfaz a cópia
  // pessoal já salva — só loga, pra não travar quem só queria começar a
  // ler por causa de um erro de publicação.
  async function publishStudyIfShared(plan, shareOptions) {
    if (!shareOptions) return
    try {
      await publishStudy({
        title: plan.title,
        overview: plan.overview ?? null,
        format: plan.format ?? 'thematic',
        tags: shareOptions.tags,
        passages: plan.passages,
        visibility: shareOptions.visibility,
        inviteeIds: shareOptions.inviteeIds,
      })
    } catch (err) {
      console.error('Failed to publish study to the bank', err)
    }
  }

  // As passagens que a IA (ou, no formato Livro, o próprio livro escolhido)
  // trouxe podem coincidir com capítulos já lidos antes, fora desse plano
  // — sem desmarcar, o checklist de textos do plano mostraria esses textos
  // como "concluído", travados pra não poderem ser escolhidos de novo,
  // mesmo sendo a primeira vez que a pessoa lê aquele texto DENTRO desse
  // plano. Chamado nos dois pontos em que um plano novo vira real (22b:
  // "Salvar p/ depois" e "Começar").
  function offerUnmarkAlreadyRead(plan) {
    const newTexts = deriveThemeTexts(plan.passages)
    const alreadyReadTexts = newTexts.filter(txt => sessionKeys(txt).some(k => completedSet.has(k)))
    if (alreadyReadTexts.length > 0 && window.confirm(t('themePlan.unmarkReadConfirm', { count: alreadyReadTexts.length }, session.lang))) {
      alreadyReadTexts.forEach(txt => toggleSession(txt, false))
    }
  }

  // "Salvar p/ depois" (22b) — persiste o plano na lista, mas não o torna
  // ativo. Aparece na lista de planos de ThemePlanScreen pra ativar depois.
  // `shareOptions` (26f, null em 'só eu') publica no banco à parte — ver
  // publishStudyIfShared.
  async function saveStudyForLater(plan, shareOptions) {
    if (!authUser) return
    const updated = await saveThemePlan(authUser.email, plan)
    setThemePlans(updated)
    setGeneratedStudyPlan(null)
    offerUnmarkAlreadyRead(plan)
    await publishStudyIfShared(plan, shareOptions)
    goToTab('routine')
  }

  // "Começar hoje/amanhã" (22b) — salva e ativa de uma vez. `startedToday`
  // decide se pula direto pra leitura (ainda não leu nada hoje) ou só
  // ativa e volta pra Meu Plano (leitura de hoje já em andamento — mesma
  // regra do quadro: "'hoje' aparece se ainda não leu"). `shareOptions`
  // como em saveStudyForLater acima.
  async function startGeneratedStudy(plan, startedToday, shareOptions) {
    if (!authUser) return
    const updated = await saveThemePlan(authUser.email, plan)
    setThemePlans(updated)
    setGeneratedStudyPlan(null)
    offerUnmarkAlreadyRead(plan)
    await publishStudyIfShared(plan, shareOptions)
    const passages = updated.find(p => p.id === plan.id)?.passages ?? plan.passages
    const keys = passages[0] ? [themeTextKey(passages[0])] : []
    if (startedToday) addThemePlanToRoutine(plan.id, keys)
    else startThemePlanReadingToday(plan.id, keys)
  }

  // ── Turno 35, Bloco 4 (35d/35e/35h) ──────────────────────────────────
  // Fluxo NOVO, paralelo ao de cima: em vez de theme_plans/activeAltPlan.
  // theme (sem contagem de dia fixa), salva em ai_studies e ativa via
  // selectActiveStudy — a mesma fonte que "Estudos"/StudiesScreen.jsx já
  // usa e que o "Estudo ativo" (35b, já em produção desde o Bloco 2)
  // espera. Decisão tomada com a autora ao montar este bloco, pra 35b
  // funcionar de verdade pra um estudo criado por 35d, sem misturar com o
  // fluxo antigo de plano por tema (que CreateStudyScreen.jsx/
  // ThemePlanScreen.jsx continuam servindo do jeito de sempre).
  const [aiStudyDraft, setAiStudyDraft] = useState(null) // { ...plan, mode: 'generate'|'preview', publicToBank }
  // Turno 41, Bloco 3 — o dia que ACABOU de ser concluído em 41d (por
  // enquanto 'studyDay' sempre mostra o dia ATUAL, que já avançou pro
  // seguinte no instante em que 41e precisa mostrar o que a pessoa
  // acabou de fazer — guardado à parte só durante a transição).
  const [justCompletedStudyDay, setJustCompletedStudyDay] = useState(null) // { studyId, dayId }
  // 41g "A partir de amanhã" — os dias que voltaram a ser leitura
  // contínua (só existe quando finalizeCompletedStudy decidiu devolver).
  const [returnedStudyDays, setReturnedStudyDays] = useState(null)

  async function handleGeneratePersonalStudy({ scope, format, days, publicToBank, plan }) {
    if (plan) {
      // Formato Livro — já montado 100% local (buildBookPlan), sem IA.
      // buildBookPlan devolve passages "crus" (só book/chStart/chEnd/words,
      // sem título/minutos) — precisa do mesmo deriveThemeTexts que
      // qualquer outro plano por tema usa pra virar o formato que 35e
      // espera (title/passage/minutes/id por dia).
      setAiStudyDraft({ ...plan, format, scope: null, days: plan.passages.length, publicToBank: false, mode: 'generate', passages: deriveThemeTexts(plan.passages) })
      goToTab('studyProposalNew')
      return
    }
    const fresh = await generateThemePlan(scope, 'standard', session.lang, days)
    setAiStudyDraft({ ...fresh, format, publicToBank, mode: 'generate' })
    goToTab('studyProposalNew')
  }

  // "Montar estudo de N dias" (39l, Bloco 6 do pacote 39) — chama o MESMO
  // caminho de cima (handleGeneratePersonalStudy), com o `scope` sendo a
  // descrição do tema em texto livre (aiScope/aiScopeEn, ver
  // src/bible/themes.js), exatamente como CreateAiStudyScreen.jsx manda o
  // texto que a pessoa digitou. A IA escolhe/distribui as passagens de
  // novo a partir desse assunto — não é garantido que sejam os MESMOS
  // trechos listados em ThemeAsStudyScreen.jsx (é o comportamento real de
  // "chama o mesmo gerador de 35d", não uma cópia direta da lista). Nada
  // entra no plano até a aprovação em 35e, como qualquer outro estudo por
  // IA.
  function buildThemeStudy(theme, days) {
    const scope = session.lang === 'en' ? (theme.aiScopeEn ?? theme.aiScope) : theme.aiScope
    return handleGeneratePersonalStudy({ scope, format: 'thematic', days, publicToBank: false })
  }

  async function handleRefazeAiStudyDraft() {
    if (!aiStudyDraft?.scope) return
    const fresh = await generateThemePlan(aiStudyDraft.scope, 'standard', session.lang, aiStudyDraft.days)
    setAiStudyDraft(prev => ({ ...prev, ...fresh }))
  }

  async function handleSwapAiStudyDay(index) {
    if (!aiStudyDraft?.scope) return
    const others = aiStudyDraft.passages.filter((_, i) => i !== index)
    const replacement = await regenerateThemePassage(aiStudyDraft.scope, others, 'standard', session.lang)
    setAiStudyDraft(prev => {
      const nextPassages = [...prev.passages]
      // Mantém o MESMO id (dia) do trecho trocado — api/regenerate-theme-
      // passage.js não sabe qual posição está sendo substituída, então não
      // devolve um id; sem isso, o progresso desse dia (studies_completed,
      // studyId:sessionId) ficaria com uma chave quebrada assim que o
      // estudo virasse ativo.
      nextPassages[index] = { ...replacement, id: prev.passages[index].id }
      return { ...prev, passages: nextPassages }
    })
  }

  // Publica no banco (migration 0053) — mesmo mecanismo de sempre
  // (publicStudiesStore.js), só chamado quando o toggle de 35d estava
  // ligado. Falha aqui não desfaz a cópia pessoal já salva, só loga (mesmo
  // espírito de publishStudyIfShared acima).
  async function publishAiStudyIfRequested(draft) {
    if (!draft.publicToBank) return
    try {
      await publishStudy({ title: draft.title, overview: draft.overview ?? null, format: draft.format ?? 'thematic', tags: [], passages: draft.passages, visibility: 'public' })
    } catch (err) {
      console.error('Failed to publish AI study to the bank', err)
    }
  }

  async function saveAiStudyDraftAsPersonalCopy(draft) {
    const id = draft.id ?? `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    // `origin: 'created'` (turno 41, Bloco 2) — este é o caminho de CRIAR
    // de verdade (35d, texto livre → IA), o único que consome a cota
    // mensal (ver studyQuota em estudosStore.js e o cartão de limite em
    // CreateAiStudyScreen.jsx).
    const study = { id, title: draft.title, overview: draft.overview ?? null, scope: draft.scope ?? null, format: draft.format ?? 'thematic', createdAt: draft.createdAt ?? new Date().toISOString(), sessions: draft.passages, origin: 'created' }
    const updated = await saveAiStudy(authUser.email, study)
    setAiStudies(updated)
    return updated.find(s => s.id === id) ?? study
  }

  async function handleSaveAiStudyForLater() {
    if (!authUser || !aiStudyDraft) return
    const saved = await saveAiStudyDraftAsPersonalCopy(aiStudyDraft)
    await publishAiStudyIfRequested(aiStudyDraft)
    setAiStudyDraft(null)
    goToTab('addStudy')
  }

  async function handleStartAiStudy() {
    if (!authUser || !aiStudyDraft) return
    const saved = await saveAiStudyDraftAsPersonalCopy(aiStudyDraft)
    await publishAiStudyIfRequested(aiStudyDraft)
    await selectActiveStudy(saved.id, saved.sessions.length)
    setAiStudyDraft(null)
    // "Começar agora"/"Começar amanhã" (41c) — bug real (2026-09-09,
    // reportado por ela): antes só ia pra Meu Plano ("entra no plano",
    // README) sem realmente abrir o dia 1, pré-datando 41d, que não
    // existia ainda. Agora abre 41d de verdade — `saved` (não
    // `aiStudies`/openActiveStudy) porque o estado ainda não assentou
    // nesta mesma função (ver comentário de goToStudyOrFallback).
    goToStudyOrFallback(saved)
  }

  // Prévia de um cartão de 35h (Jesus Corner/grupo/banco público/salvos) —
  // mesma tela de 35e, sem Refazer/trocar dia (sem `scope` pra regenerar
  // nada) e com "Começar" só. `study.sourceStudyId`/`isPublicBank` (banco
  // público) alimentam recordStudyUse ao adotar.
  function handleOpenStudyPreview(study) {
    setAiStudyDraft({ ...study, mode: 'preview' })
    goToTab('studyProposalNew')
  }

  async function handleStartPreviewStudy() {
    if (!authUser || !aiStudyDraft) return
    // Reusa o id de origem (Jesus Corner/grupo/salvos) em vez de gerar um
    // novo — pra "Salvos" isso significa só ativar o que já existia, sem
    // duplicar; pra Jesus Corner/grupo/banco público, cada conta guarda a
    // própria cópia em ai_studies (arrays por usuário), então reusar o
    // mesmo id não colide com o de mais ninguém.
    const id = aiStudyDraft.sourceStudyId ?? `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    // `createdAt` preserva o original quando já existe (reabrir/recomeçar
    // um "Salvo" não é um evento novo — achado corrigindo a cota do Bloco
    // 2: antes esta linha SEMPRE carimbava agora, então só reabrir um
    // estudo salvo bastava pra "criar" de novo contra a cota). `origin`
    // (idem) — Jesus Corner/grupo/banco público/salvos NUNCA consomem
    // cota (regra 4 §3); só o "Salvos" reabre o próprio 'created' de
    // quando foi gerado a primeira vez (aiStudyDraft.origin já vem certo
    // dos cartões de 41a/41i, ver onOpenPreview).
    const study = { id, title: aiStudyDraft.title, overview: aiStudyDraft.overview ?? null, format: aiStudyDraft.format ?? 'thematic', createdAt: aiStudyDraft.createdAt ?? new Date().toISOString(), sessions: aiStudyDraft.sessions, origin: aiStudyDraft.origin ?? 'created' }
    const updated = await saveAiStudy(authUser.email, study)
    setAiStudies(updated)
    const saved = updated.find(s => s.id === id) ?? study
    if (aiStudyDraft.fromPublicBank && aiStudyDraft.sourceStudyId) {
      recordStudyUse(aiStudyDraft.sourceStudyId).catch(err => console.error('Failed to record study use', err))
    }
    await selectActiveStudy(saved.id, saved.sessions.length)
    setAiStudyDraft(null)
    goToStudyOrFallback(saved) // mesmo motivo de handleStartAiStudy acima
  }

  // "Enviar para o grupo" (22d) — grava o plano de verdade (RPC
  // send_group_reading_plan já convida todo mundo e já entra o próprio
  // moderador 'accepted', ver migração) e publica a pergunta da 1ª semana
  // (se a pessoa deixou uma) na sala do capítulo dessa semana — mesmo
  // mecanismo de sempre (setRoomQuestion, ver ChapterRoomScreen.jsx),
  // então a pergunta já aparece em 17a sem nenhum código novo lá.
  async function sendGeneratedGroupPlan(plan, question) {
    if (!authUser) return
    const startsAt = new Date().toISOString().slice(0, 10)
    const created = await sendGroupReadingPlan({
      groupId: plan.groupId, book: plan.book, bookEn: plan.bookEn, title: plan.title,
      overview: plan.overview ?? null, weeks: plan.weeks, passages: plan.passages, startsAt,
    })
    const firstWeek = plan.weeks[0]
    if (question?.trim() && firstWeek) {
      await setRoomQuestion(plan.groupId, plan.book, firstWeek.chStart, question.trim())
        .catch(err => console.error('Failed to publish weekly question', err))
    }
    setGeneratedGroupPlan(null)
    // O próprio moderador já nasce 'accepted' no envio — reflete isso na
    // hora (troca a leitura de hoje), sem esperar um refetch pra saber.
    selectActivePlan({ type: 'group', planId: created.id })
    refreshSocialState()
    goToTab('routine')
  }

  // "Aceitar"/"Recusar" um convite de plano do grupo (banner em
  // GroupsScreen.jsx) — aceitar troca a leitura de hoje pro plano do grupo
  // (mesmo mecanismo de ativar qualquer plano alternativo, ver
  // selectActivePlan); recusar só grava a resposta, nada muda pra pessoa.
  async function respondToGroupPlanInvite(planId, accept) {
    await respondToGroupReadingPlan(planId, accept)
    if (accept) selectActivePlan({ type: 'group', planId })
    refreshSocialState()
  }

  // Tocar numa sessão da lista "Sessões do plano" (PlanScreen.jsx) quando o
  // plano ativo é o cronológico — mesma ideia de openReadingSession acima,
  // só que abrindo o movimento certo em ChronologicalPlanScreen em vez do
  // mapa de blocos de sempre.
  function openChronoSession(movementId) {
    setChronoAutoOpenMovementId(movementId)
    goToTab('chronologicalPlan')
  }

  // "Concluir"/"Finalizar por aqui" numa sessão de leitura (ver
  // ReadingBlockView.jsx/onGoToReflection, chamado por JourneyScreen/
  // ThemePlanScreen/ChronologicalPlanScreen/GroupPlanReaderScreen/
  // BookChapterScreen — todos só encapam ReadingBlockView, então este é o
  // ÚNICO ponto de saída da leitura) — guarda COMO voltar exatamente pra
  // essa sessão (ver backToLastReadSession) e abre 37e (pacote 36-37,
  // ReadingSummaryScreen) ANTES da Reflexão, não mais direto nela. Mesmo
  // padrão arquitetural de 36f (Oração também passa por uma tela de
  // transição própria antes do próximo passo, em vez de pular direto).
  // Marcar via checkbox solto (toggleChapter/toggleSession, sem passar por
  // "Concluir") continua indo direto — o handoff só pede 37e nesses dois
  // gatilhos específicos.
  function goToReflectionFrom(descriptor) {
    setLastReadSession(descriptor)
    goToTab('readingSummary')
  }

  // Botão "Começar a reflexão" de 37e — o que goToReflectionFrom fazia
  // direto antes desta tela existir.
  function beginReflectionFromSummary() {
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
    else if (d.tab === 'groupPlanReader') goToTab('groupPlanReader')
  }

  // Rebusca a assinatura e atualiza o estado — usado depois de resgatar um
  // convite de acesso grátis ou fechar uma compra (ver UpgradeScreen.jsx),
  // pra liberar os recursos Premium sozinho, sem precisar de F5.
  async function refreshSubscription() {
    const sub = await getMySubscription()
    setSubscription(sub)
  }

  // Chamado pelo botão final do onboarding (15e, OnboardingFlow) — grava as
  // respostas na linha local de convidado (setSelectedPlanId e cia. escrevem
  // nela em vez do backend real, ver userDataStore.js, enquanto não existe
  // sessão) e manda pro cadastro (SignupScreen) em vez de liberar a leitura
  // direto. Decisão de produto de 2026-09-07: ninguém lê sem criar conta —
  // o onboarding só recolhe as preferências, a conta é obrigatória logo em
  // seguida. O que foi salvo aqui migra pra dentro da conta assim que o
  // cadastro terminar (migrateGuestRow(), sempre "servidor vence").
  //
  // Bloco 8 do redesign: antes esta função gravava oração/reflexão nas
  // stores antigas (prayerDurationStore/reflectionDurationStore, só
  // localStorage) e a meta semanal só como número — desde o Bloco 4/27a a
  // fonte real dos três passos é stepMinutesStore.js (sincroniza entre
  // aparelhos) e weekly_days (quais dias, não só quantos). Ficar gravando
  // nos dois lugares antigos deixava Meu Plano/Oração/Reflexão sem ver o que
  // a pessoa respondeu no onboarding assim que ela criasse conta de verdade.
  async function finishOnboarding(answers) {
    await setSelectedPlanId(null, answers.planId)
    // Cada passo do 15f é independente agora — zerar Oração ou Reflexão
    // desliga só aquele passo (Leitura nunca zera, é a única obrigatória).
    const modules = ['reading']
    if (answers.prayerMinutes > 0) modules.push('prayer')
    if (answers.reflectionMinutes > 0) modules.push('reflection')
    await persistRoutineModules(null, modules)
    await persistWeeklyDays(answers.weeklyDays)
    await persistStepMinutes({ prayer: answers.prayerMinutes, reading: answers.readingMinutes, reflection: answers.reflectionMinutes })
    // "Onde começar" (28d, pergunta extra no fim do onboarding) — mesma
    // lógica de applyStartChoice (App.jsx), só que com email explícito nulo:
    // authUser ainda não existe neste ponto (handleAuthenticated só roda
    // logo abaixo), então os wrappers que checam `if (authUser)` (selectPlan,
    // selectActivePlan) não persistiriam nada; aqui chama a store de baixo
    // nível direto, do mesmo jeito que setSelectedPlanId(null, ...) acima já
    // fazia.
    if (answers.startOrder === 'chrono') {
      await persistActiveAltPlan(null, { type: 'chrono', paceId: answers.planId })
    } else if (answers.startOrder === 'none') {
      await setSelectedPlanId(null, 'none')
    } else if (answers.startBook) {
      const block = blocks.find(b => b.books.includes(answers.startBook))
      await persistReadingOrder(null, block && block.id >= 5 ? 'nt_first' : 'ot_first')
    }
    saveOnboardingAnswers(answers)
    // O lembrete (15c) só vira inscrição push com uma conta de verdade —
    // fica pendente até o primeiro login (ver applyPendingReminder).
    savePendingReminder(answers.reminder)
    // Sincroniza o estado local de plano AGORA — sem sessão nenhuma ainda,
    // o próximo bootstrap (que recarregaria isso do banco) só roda depois
    // do cadastro; SignupScreen usa `planId` pra montar o cartão "o que vai
    // pra conta".
    setPlanId(answers.planId)
    setPendingSignupAnswers(answers)
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
    // seguro chamar sempre (ver src/backend/userDataStore.js). Sempre
    // "servidor vence" pros campos que competem, pra não trocar o progresso
    // real da conta pelas migalhas do convidado — inclusive aqui, no
    // caminho de LOGIN, que cobre quem entra numa conta JÁ existente depois
    // de ter lido um pouco como convidado no mesmo dispositivo.
    await migrateGuestRow().catch(err => console.error('Failed to migrate guest progress', err))
    await migrateGuestExtraTables().catch(err => console.error('Failed to migrate guest extra tables', err))
    clearGuestInviteState()
    if (!user.isGuest) applyPendingReminder()
    // Mesmo motivo do bootstrap acima: aplicar ANTES de ler, pra não correr
    // contra a leitura de plano/ordem logo abaixo.
    await applyPendingOnboardingChoices()
    const [set, userPlanId, userReadingOrder, userWeeklyGoalDays, userWeeklyDays, userStepMinutes, userStepDays, userActiveAltPlan, userThemePlans, userAiStudies, stats, routine, userRoutineModules, userActiveStudyId, userBibleOrderMode, challenges, pendingSocial, myProfile, mySubscription, adminStatus, inviteAppliedByEmail, inviteAppliedByCode, groups, acceptedGroupPlans, pendingGroupPlans] = await Promise.all([
      getCompletedSet(user.email),
      getSelectedPlanId(user.email),
      getReadingOrder(user.email),
      getWeeklyGoalDays(user.email),
      getWeeklyDays(),
      getStepMinutes(),
      getStepDays(),
      getActiveAltPlan(user.email),
      getThemePlans(user.email),
      getAiStudies(user.email),
      getPrayerStats(user.email),
      getDailyRoutine(),
      getRoutineModules(user.email),
      getActiveStudyId(user.email),
      getBibleOrderMode(),
      getMyActiveChallenges(),
      getPendingSocialCount(),
      getMyProfile(),
      getMySubscription(),
      checkIsAdmin(),
      applyPendingInvite(),
      redeemPendingInviteCode(),
      getMyGroups().catch(() => []),
      getMyAcceptedGroupPlans().catch(() => []),
      getMyPendingGroupPlanInvites().catch(() => []),
    ])
    redeemPendingFriendUsername().catch(() => false)
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
    setWeeklyDaysState(userWeeklyDays)
    setStepMinutesState(userStepMinutes)
    setStepDaysState(userStepDays)
    setActiveAltPlanState(userActiveAltPlan)
    setThemePlans(userThemePlans)
    setAiStudies(userAiStudies)
    setActiveBlockId(defaultBlockIdFor(set, userPlanId, userReadingOrder, userStepMinutes.reading))
    setPrayerStats(stats)
    setDailyRoutine(routine)
    setRoutineModulesState(userRoutineModules)
    setActiveStudyIdState(userActiveStudyId)
    setBibleOrderModeState(userBibleOrderMode)
    setActiveChallenges(challenges)
    setPendingSocialCount(pendingSocial)
    setMyAvatarUrl(myProfile?.avatarUrl ?? null)
    setMyGroups(groups ?? [])
    setGroupPlans(acceptedGroupPlans ?? [])
    setPendingGroupPlanInvites(pendingGroupPlans ?? [])
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
    setWeeklyDaysState([true, true, true, true, true, false, false])
    setStepMinutesState({ prayer: null, reading: null, study: null, reflection: null })
    setActiveAltPlanState(null)
    setThemePlans([])
    setAiStudies([])
    setRoutineModulesState(DEFAULT_ROUTINE_MODULES)
    setActiveStudyIdState(null)
    setBibleOrderModeState('canonical')
    setPrayerStats(DEFAULT_PRAYER_STATS)
    setActiveChallenges([])
    setPendingSocialCount(0)
    setMyAvatarUrl(null)
    setSubscription(null)
    setIsAdmin(false)
    setMyGroups([])
    setGroupPlans([])
    setPendingGroupPlanInvites([])
    setGeneratedGroupPlan(null)
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
    Promise.all([getMyActiveChallenges(), getPendingSocialCount(), getMyAcceptedGroupPlans(), getMyPendingGroupPlanInvites()])
      .then(([challenges, pendingSocial, acceptedGroupPlans, pendingGroupPlans]) => {
        setActiveChallenges(challenges)
        setPendingSocialCount(pendingSocial)
        setGroupPlans(acceptedGroupPlans)
        setPendingGroupPlanInvites(pendingGroupPlans)
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

  // Ordem da leitura contínua da Bíblia (35i) — turno 35. 'canonical' e
  // 'chronological' espelham em activeAltPlan (reusa o mecanismo de plano
  // cronológico alternativo que já existia — mesmo completedSet, nunca
  // reseta progresso, ver deriveChronoProgress); só troca de verdade a
  // sessão de "Ler agora" quando NÃO há um estudo (tema/grupo) pausando o
  // plano principal no momento — trocar a ordem enquanto um estudo está
  // ativo só vale pra quando ele acabar. 'custom' ("Minha ordem") ainda não
  // tem essa ponte — ver comentário no useState de bibleOrderMode acima.
  function saveBibleOrderMode(mode) {
    setBibleOrderModeState(mode)
    persistBibleOrderMode(mode).catch(err => console.error('Failed to persist bible order mode', err))
    const noStudyPausing = !activeAltPlan || activeAltPlan.type === 'chrono' || activeAltPlan.type === 'fixed'
    if (!noStudyPausing) return
    if (mode === 'chronological') {
      selectActivePlan({ type: 'chrono', paceId: planId === 'none' ? 'standard' : planId })
    } else if (activeAltPlan?.type === 'chrono') {
      selectActivePlan({ type: 'fixed', id: planId })
    }
  }

  // "Onde começar" (28d, Bloco 6) — troca o plano fixo pra começar num
  // livro/ordem escolhidos. Simplificação deliberada: "outro livro" fora
  // de Gênesis/Mateus não reposiciona o ponteiro pro meio do testamento —
  // a granularidade que já existe (readingOrder) é por TESTAMENTO, não por
  // livro; qualquer livro do AT vira ot_first, qualquer um do NT vira
  // nt_first (documentado em ChooseStartScreen.jsx).
  function applyStartChoice(book, order) {
    if (order === 'none') {
      selectActivePlan({ type: 'fixed', id: 'none' })
      return
    }
    const realPlanId = planId === 'none' ? 'standard' : planId
    if (order === 'chrono') {
      selectActivePlan({ type: 'chrono', paceId: realPlanId })
      return
    }
    selectActivePlan({ type: 'fixed', id: realPlanId })
    const block = blocks.find(b => b.books.includes(book))
    selectReadingOrder(block && block.id >= 5 ? 'nt_first' : 'ot_first')
  }

  // Reconciliação de progresso prévio num livro (28e) — as 4 saídas do
  // quadro. 'continue'/'reread' nunca mexem em completedSet (a marcação
  // livre de 28c continua sendo a única fonte de verdade pro que foi lido
  // de verdade); só 'clean' e 'finish' chamam markChaptersManuallyFor, a
  // mesma trilha de auditoria de 28c — não conta como sessão nem hábito.
  function applyExistingProgressChoice(book, action) {
    const total = bookChapterCounts[book] ?? 0
    if (action === 'reread') {
      setLastReadPosition(book, 1)
      setLastReadPositionState({ book, chapter: 1 })
      return
    }
    if (action === 'clean') {
      const allChapters = Array.from({ length: total }, (_, i) => i + 1)
      markChaptersManuallyFor(book, allChapters, false)
      setLastReadPosition(book, 1)
      setLastReadPositionState({ book, chapter: 1 })
      return
    }
    if (action === 'finish') {
      const remaining = Array.from({ length: total }, (_, i) => i + 1).filter(ch => !completedSet.has(`${book}:${ch}`))
      markChaptersManuallyFor(book, remaining, true)
      return
    }
    // 'continue' — nada a fazer, o ponteiro (lastReadPosition/completedSet)
    // já reflete onde a pessoa parou.
  }

  // "Continuar" em 28d — se o livro escolhido já tem progresso, abre 28e
  // pra decidir o que fazer com ele ANTES de aplicar (setActiveTab direto,
  // sem empilhar histórico — um só "Voltar" depois de confirmar em 28e já
  // devolve pra tela de onde "Trocar plano" foi aberto). Sem progresso
  // prévio, aplica de vez e volta.
  function handleChooseStartContinue(book, order) {
    if (order !== 'none' && book) {
      const total = bookChapterCounts[book] ?? 0
      let done = 0
      for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${book}:${ch}`)) done++
      if (done > 0) {
        setPendingStartChoice({ book, order })
        setActiveTab('chooseStartExisting')
        return
      }
    }
    applyStartChoice(book, order)
    goBack()
  }

  // Confirmação final de 28e — aplica ordem/livro E a reconciliação de
  // progresso junto, na mesma ação (a pessoa só vê um botão).
  function handleExistingProgressConfirm(action) {
    if (!pendingStartChoice) return
    applyStartChoice(pendingStartChoice.book, pendingStartChoice.order)
    applyExistingProgressChoice(pendingStartChoice.book, action)
    setPendingStartChoice(null)
    goBack()
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

  // "Ritmo da semana" em Ajustar meu plano (27a, Bloco 8) — dias
  // específicos da semana, não só uma quantidade (WeeklyDaysPicker.jsx,
  // compartilhado com o onboarding). Grava em weeklyDaysStore.js, que
  // mantém weekly_days (o array que 29a/30a/4b usam pra saber QUAIS dias) e
  // weekly_goal_days (o número, compatibilidade com quem já lia só ele)
  // sincronizados no banco; aqui espelha os dois no estado local na hora,
  // sem esperar um refetch. Substitui a antiga selectWeeklyDaysCount (só
  // dava pra escolher uma quantidade, não quais dias).
  function saveWeeklyDays(days) {
    setWeeklyDaysState(days)
    setWeeklyGoalDaysState(countTrue(days))
    if (authUser) {
      persistWeeklyDays(days).catch(err => console.error('Failed to persist weekly days', err))
    }
  }

  // Minutos de cada passo (26d/5a, Bloco 4) — patch: { prayer?, reading?,
  // reflection? }, cada um null (sem preferência) ou 0-60 (0 desliga o
  // passo, exceto Leitura — ver validação em stepMinutesStore.js). UI
  // otimista: session.plan.*Minutes reflete a mudança antes do save
  // terminar (buildSession lê stepMinutes direto do estado).
  //
  // "Zerar um passo o remove da rotina" (nota do quadro 26d) — cruzar de/pra
  // 0 também liga/desliga o módulo em routineModules (a mesma chave que
  // Home/Rotina/Reflexão já filtram por routineModules.includes), pra não
  // ter dois interruptores contando histórias diferentes sobre o mesmo
  // passo. Leitura nunca cruza (mínimo 1, ver stepMinutesStore.js).
  function saveStepMinutes(patch) {
    setStepMinutesState(prev => {
      const next = { ...prev, ...patch }
      for (const key of ['prayer', 'reflection']) {
        if (!(key in patch)) continue
        const wasOn = (prev[key] ?? 1) > 0
        const isOn = (patch[key] ?? 1) > 0
        if (wasOn !== isOn) toggleRoutineModule(key, isOn)
      }
      return next
    })
    if (authUser) {
      persistStepMinutes(patch).catch(err => console.error('Failed to persist step minutes', err))
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
    setActiveBlockId(defaultBlockIdFor(new Set(), planId, readingOrder, stepMinutes.reading))
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
  // livro acabou de ser concluído — e registra o marco no feed de atividade
  // dos amigos (ver src/activity/activityStore.js). O marco de "subiu de
  // nível" saiu daqui na varredura de identidade (Bloco 1, FLUXO-DO-APP.md
  // seção 11) — XP/nível não existem mais em lugar nenhum do app.
  function detectAndLogMilestones(prevSet, nextSet) {
    const prevBooks = computeCompletedBooks(prevSet, sessionsByBlock)
    const nextBooks = computeCompletedBooks(nextSet, sessionsByBlock)
    for (const book of nextBooks) {
      if (!prevBooks.has(book)) {
        logActivity('book_completed', { book }).catch(err => console.error('Failed to log activity', err))
      }
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
  // limpa a escolha (ex: encerrar/trocar de estudo, ver StudyOrganizeScreen.
  // jsx "Encerrar"). Trilhas independentes (handoff-app-completo, achado
  // conferindo Hoje contra Meu Plano): ativar um estudo NÃO pausa mais a
  // leitura contínua — Bíblia e Estudo têm dias próprios e podem coincidir
  // no mesmo dia (antes pausava até uma data de fim calculada; esse
  // cálculo saiu, junto com activeStudyMath.js). `totalDays` (a duração do
  // estudo) segue chegando de quem chama, mas não é mais usado aqui —
  // mantido no parâmetro só pra não quebrar quem já passa.
  async function selectActiveStudy(studyId, totalDays = 0) {
    if (!authUser) return
    setActiveStudyIdState(studyId)
    persistActiveStudyId(authUser.email, studyId).catch(err => console.error('Failed to persist active study', err))
  }

  // "Ler agora" em Meu Plano (35b) quando o passo de hoje é o Estudo ativo —
  // mesmo mecanismo que a Biblioteca já usa pra abrir um estudo específico
  // (ver libraryOpenStudyId/NotesScreen.jsx).
  // Botão "Começar/Continuar" do passo Estudo (RoutineScreen.startStep/
  // openDoneStep) — antes, sem nenhum estudo ativo escolhido ainda (o
  // toggle de Estudo pode estar ligado sem study nenhum selecionado, ver
  // PR #132), essa função só dava `return` e o botão não fazia nada
  // (bug real, 2026-09-09). Agora leva pra "Adicionar estudo" pra
  // escolher/criar um, mesmo destino do cartão "Meus estudos".
  // Turno 41, Bloco 3: ai_studies guarda DOIS formatos de sessão — o
  // antigo (StudiesScreen.jsx, "criar por tema" com sections/
  // reflectionQuestions, sem pergunta única por dia) e o novo (41b/41c em
  // diante, com book/chStart/chEnd — o que 41d sabe abrir). Só o novo
  // ganha a tela nova; um estudo antigo ainda ativo continua abrindo do
  // jeito de sempre (StudiesScreen), sem quebrar quem já tinha um rodando
  // antes deste bloco.
  function isNewFormatStudy(study) {
    return !!study?.sessions?.[0]?.book
  }
  // Recebe o Estudo já pronto (`study`), nunca relê de `aiStudies`/
  // `activeStudyId` por conta própria — achado num bug real (2026-09-09,
  // reportado por ela): chamar isso *na mesma função* que ACABOU de
  // `setAiStudies`/`selectActiveStudy` via closure em `aiStudies`/
  // `activeStudyId` lia os valores de ANTES do setState (React só aplica
  // no próximo render), então caía sempre no fallback errado logo depois
  // de criar/adotar um estudo. `openActiveStudy()` abaixo (chamado de
  // fora, sem acabar de mudar nada) ainda lê o estado — ali é seguro.
  function goToStudyOrFallback(study) {
    if (study && isNewFormatStudy(study)) {
      if (currentDayOf(study).day) { goToTab('studyDay'); return }
      // Todos os dias já feitos — 41f ("estudo por dentro", Bloco 4) e 41g
      // (síntese, Bloco 5) ainda não existem; por ora volta pro hub.
      goToTab('addStudy')
      return
    }
    if (study) { setLibraryOpenStudyId(study.id); goToTab('studies'); return }
    goToTab('addStudy')
  }
  function openActiveStudy() {
    if (!activeStudyId) { goToTab('addStudy'); return }
    goToStudyOrFallback(aiStudies.find(s => s.id === activeStudyId))
  }

  // Fecho de um dia (41d → 41e) — guarda qual dia foi concluído (a
  // referência "atual" já avançou pro seguinte) e marca o passo "Estudo"
  // de hoje como feito (mesmo evento que StudiesScreen.jsx já disparava
  // ao concluir uma sessão do estudo ativo).
  // Regra 4 §8 — "ao terminar, encadear o próximo salvo e/ou devolver os
  // dias à leitura". studyFinishPrefsStore.js já documentava isso como
  // pendente ("o gatilho que as consome ainda não existe") — este é esse
  // gatilho, disparado só na conclusão NATURAL do último dia (41g), não
  // num "Pausar"/"Encerrar" manual (41f/41h) — abandonar antes do fim não
  // implica escolher o próximo nem devolver dia nenhum.
  async function finalizeCompletedStudy(finishedStudyId) {
    try {
      const prefs = await getStudyFinishPrefs()
      if (prefs.returnDays) {
        // Guarda os dias de ANTES de limpar — 41g mostra "Seg, qua e sex
        // voltam a ser leitura contínua" citando os dias reais que
        // tinham Estudo, não o array já zerado.
        setReturnedStudyDays(stepDays?.study ?? null)
        const cleared = [false, false, false, false, false, false, false]
        setStepDaysState(prev => (prev ? { ...prev, study: cleared } : prev))
        persistStepDays({ study: cleared }).catch(err => console.error('Failed to return study days to reading', err))
      }
      if (prefs.autoNext) {
        const queued = aiStudies.find(s => s.id !== finishedStudyId && !(s.sessions ?? []).every(sess => sess.completedAt))
        if (queued) { await selectActiveStudy(queued.id, queued.sessions?.length ?? 0); return }
      }
      await selectActiveStudy(null)
    } catch (err) {
      console.error('Failed to finalize completed study', err)
    }
  }

  function handleStudyDayCompleted(studyId, dayId, isLastDay) {
    markRoutineStep('study', true)
    setJustCompletedStudyDay({ studyId, dayId })
    if (isLastDay) {
      finalizeCompletedStudy(studyId)
      goToTab('studyComplete')
      return
    }
    goToTab('studyDayComplete')
  }

  // "Continuar meu plano" (41e) — mesma ideia de advanceGuided, mas sem
  // modo guiado: acha o primeiro passo de hoje ainda não feito e abre
  // direto; se não sobrou nenhum, vai pro resumo do dia (mesmo destino de
  // sempre quando o último passo termina).
  function continueStudyDayToNextStep() {
    const nextKey = (session.todaysSteps ?? []).find(k => !session.todayRoutine?.[k])
    if (!nextKey) {
      setRoutineCompleteInfo({ steps: session.todaysSteps ?? ['study'], readingSession: lastReadSession })
      goToTab('routineComplete')
      return
    }
    if (nextKey === 'reading') { continueToday(); return }
    if (nextKey === 'study') { openActiveStudy(); return }
    goToTab(guidedTabFor(nextKey))
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
    // Traço de auditoria com data (chapters_read, origem 'sessao') — sem
    // isso "capítulos lidos" em 30 dias/este ano (métricas, 30b) não tem
    // como filtrar por período (completed_keys não guarda quando cada
    // capítulo foi lido). Best-effort, não bloqueia a marcação em si.
    if (done && newlyDoneKeys.length) logChaptersRead(newlyDoneKeys, 'sessao')
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
    const { session: s } = findCurrentReadingSession(blocks, sessionsByBlock)
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
    if (done && newlyDoneKeys.length) logChaptersRead(newlyDoneKeys, 'sessao')
    if (done) {
      markRoutineStep('reading')
      setLastReadPosition(session.book, chapter)
      setLastReadPositionState({ book: session.book, chapter })
      if (guidedReadingComplete(nextSet)) advanceGuided('reading')
    }
  }

  // Marcação livre de capítulo (28c, "Marcar lidos") — quem já leu antes
  // do app marca capítulos à mão. Conta pro progresso (%) e pode disparar
  // conquista de livro concluído, mas NUNCA marca a rotina do dia, o
  // "último texto lido" nem avança o fluxo guiado — é dado de mapa, não de
  // hábito (mesma distinção do quadro: "progresso e hábito continuam
  // separados"). done=true marca todos os `chapters`; done=false desmarca.
  function markChaptersManuallyFor(book, chapters, done) {
    if (!authUser || chapters.length === 0) return
    const keys = chapters.map(ch => `${book}:${ch}`)
    const newlyDoneKeys = done ? keys.filter(k => !completedSet.has(k)) : []
    const nextSet = new Set(completedSet)
    keys.forEach(k => done ? nextSet.add(k) : nextSet.delete(k))
    if (done && hasPremium) detectAndLogMilestones(completedSet, nextSet)
    setCompletedSet(nextSet)
    const persist = done ? markChaptersManually(book, chapters) : unmarkChaptersManually(book, chapters)
    persist.catch(err => console.error('Failed to persist manual chapter marks', err))
    recordChallengeProgressForNewlyDoneKeys(newlyDoneKeys)
  }

  // "Escolher" em 35i (Onde começar) — turno 35, Bloco 1. Diferente do
  // "Trocar plano" antigo (applyStartChoice, ChooseStartScreen/28d): aqui
  // não existe reordenar testamento nem plano alternativo, só marcar como
  // lido tudo que vem ANTES do capítulo escolhido na ordem atual da leitura
  // contínua (bibleOrderStore.js) — o mesmo princípio de "marcação manual"
  // que 28c já usa (chapters_read, origem='manual'), só que em lote pra
  // vários livros de uma vez. O capítulo escolhido em diante fica por ler.
  function applyReadingStartPosition(bookOrder, book, chapter) {
    for (const b of bookOrder) {
      if (b === book) {
        const before = Array.from({ length: chapter - 1 }, (_, i) => i + 1)
        if (before.length) markChaptersManuallyFor(b, before, true)
        break
      }
      const total = bookChapterCounts[b] ?? 0
      if (total > 0) markChaptersManuallyFor(b, Array.from({ length: total }, (_, i) => i + 1), true)
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
    // Redesign 1g/etapa 7, encerrado em 2026-09-07 — ninguém lê sem conta
    // mais. Quem já autenticou neste dispositivo alguma vez (ou pediu "Já
    // tenho conta") vai direto pro login de sempre. Quem nunca autenticou
    // aqui vê Boas-vindas → Onboarding (recolhe as preferências) → Cadastro
    // (obrigatório, ver pendingSignupAnswers/finishOnboarding) — sem opção
    // de pular pra dentro do app sem criar conta em nenhum dos dois casos.
    if (authScreenForced || (!loginDismissed && typeof localStorage !== 'undefined' && localStorage.getItem(HAS_AUTH_KEY))) {
      // authScreenForced sempre quer dizer "já tenho conta" — força login
      // mesmo se este dispositivo específico nunca autenticou aqui (nesse
      // caso, sem o initialMode, AuthScreen cairia no onboarding antigo por
      // padrão).
      return (
        <>
          <AuthScreen
            onAuthenticated={handleAuthenticated}
            initialMode={authScreenForced ? 'login' : undefined}
            planId={planId}
            onBack={() => { setAuthScreenForced(false); setLoginDismissed(true) }}
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
    if (pendingSignupAnswers) {
      return (
        <>
          <SignupScreen
            chaptersRead={0}
            planId={pendingSignupAnswers.planId}
            onAuthenticated={handleAuthenticated}
            onBack={() => setPendingSignupAnswers(null)}
            onGoLogin={() => { setAuthScreenForced(true); setPendingSignupAnswers(null) }}
          />
          <Analytics />
        </>
      )
    }
    return (
      <>
        <OnboardingFlow onFinish={finishOnboarding} onBack={() => setWelcomeDone(false)} />
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

  const session = buildSession(authUser, blocks, sessionsByBlock, dailyRoutine, planId, completedSet, prayerStats, readingOrder, activeAltPlan, themePlans, routineModules, activeStudyId, lastReadPosition, groupPlans, stepMinutes)
  // Modo guiado disponível pros componentes (banner + auto-avanço). idx/step
  // derivados aqui pra não repetir a conta em cada tela.
  session.guided = guidedFlow
    ? { steps: guidedFlow.steps, idx: guidedFlow.idx, total: guidedFlow.steps.length, step: guidedFlow.steps[guidedFlow.idx] }
    : null
  // Passos de hoje, na ordem (mesma conta de startGuidedRoutine acima) —
  // pras telas de execução (Oração 36b/36c, Reflexão 37a/37b) mostrarem
  // "passo N de M" certo mesmo fora do modo guiado (ex: Oração é o único
  // passo restante hoje, então nunca entra em guidedFlow — ver
  // startGuidedRoutine). Independe de session.guided de propósito.
  session.todaysSteps = todaysGuidedSteps()
  // RoutineScreen.jsx/HomeScreen.jsx recomputam "passos de hoje" cada uma
  // com o próprio fetch de stepDays (não leem session.todaysSteps direto),
  // mas chamam a mesma stepsScheduledForWeekday pura — sem 4º argumento,
  // Leitura e Estudo são independentes (ver stepDaysMath.js).
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
  // Vem direto no descriptor (ver onGoToReflectionFrom em JourneyScreen.jsx
  // e nos outros 4 lugares que montam o mesmo formato — pacote 36-37,
  // 37e, precisou de book/chStart/chEnd em TODOS eles, não só 'journey')
  // em vez de resolvido aqui por blockId+sessionId — sessionId sozinho é
  // AMBÍGUO (sessionsByBlock do plano fixo e browseSessionsByBlock da
  // navegação livre numeram sessões independentemente dentro do mesmo
  // bloco, então o mesmo id pode existir com book/chapter diferentes nos
  // dois; só quem monta o descriptor sabe de qual dos dois veio).
  const lastReadChapterInfo = (lastReadSession?.type !== 'reflection' && lastReadSession?.book)
    ? { book: lastReadSession.book, bookEn: lastReadSession.bookEn, chStart: lastReadSession.chStart, chEnd: lastReadSession.chEnd, words: lastReadSession.words }
    : null

  // Próximo livro depois do atual, na ordem do plano — "Próximo: Êxodo, a
  // partir de quarta." (17b: o quadro sempre inclui quando a leitura
  // contínua volta a cair, mesmo cálculo de nextScheduledWeekday já usado
  // no tile "Volta {dia}" do Hoje). O "a partir de {dia}" já vem pronto
  // dentro do nome — os dois lugares que interpolam {book} (o cartão e a
  // imagem compartilhável) não precisam saber desse detalhe.
  const orderedSessions = blocks.flatMap(b => sessionsByBlock[b.id] ?? [])
  const bookEnFor = book => orderedSessions.find(x => x.book === book)?.bookEn ?? null
  const nextBookLabel = (() => {
    const cur = session.currentBlock?.book
    const idx = orderedSessions.findIndex(x => x.book === cur)
    const nxt = idx >= 0 ? orderedSessions.slice(idx).find(x => x.book !== cur && x.type !== 'reflection') : null
    if (!nxt) return null
    const name = session.lang === 'en' ? (nxt.bookEn || nxt.book) : nxt.book
    const todayIdx = (new Date().getDay() + 6) % 7
    const readingDays = stepDays?.reading
    const weekdayIdx = readingDays ? nextScheduledWeekday(readingDays, todayIdx) : null
    if (weekdayIdx == null) return name
    const weekday = (WEEKDAY_FULL[session.lang] ?? WEEKDAY_FULL.pt)[weekdayIdx]
    return t('recap.nextBookFromWeekday', { book: name, weekday }, session.lang)
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

  // Turno 41, Bloco 3 — resolvidos aqui (não em estado à parte) pra nunca
  // dessincronizar com aiStudies: 41d sempre mostra o dia atual de
  // verdade; 41e mostra o dia que acabou de ser concluído (ver
  // justCompletedStudyDay, limpo ao sair de 41e).
  const activeStudyForDay = aiStudies.find(s => s.id === activeStudyId)
  const currentDay = activeStudyForDay ? currentDayOf(activeStudyForDay) : null
  const justCompletedStudy = justCompletedStudyDay ? aiStudies.find(s => s.id === justCompletedStudyDay.studyId) : null
  const justCompletedDayIndex = justCompletedStudy?.sessions?.findIndex(s => s.id === justCompletedStudyDay?.dayId) ?? -1
  const justCompletedDay = justCompletedDayIndex >= 0 ? justCompletedStudy.sessions[justCompletedDayIndex] : null
  // Próximo passo de hoje ainda não feito (pro rodapé "Continuar meu
  // plano" de 41e) — mesma conta de stepMinutesAll em HomeScreen.jsx.
  const nextRoutineStepKey = (session.todaysSteps ?? []).find(k => !session.todayRoutine?.[k])
  const nextStepMinutesByKey = { prayer: session.plan?.prayerMinutes, reading: session.plan?.readingMinutes, study: stepMinutes?.study ?? 15, reflection: session.plan?.reflectionMinutes }
  const nextRoutineStepInfo = nextRoutineStepKey
    ? { label: t(`home.routine${nextRoutineStepKey[0].toUpperCase()}${nextRoutineStepKey.slice(1)}`, undefined, session.lang), minutes: nextStepMinutesByKey[nextRoutineStepKey] }
    : null

  const screens = {
    // Rodada 34 (2026-09-07, handoff-hoje-34/HANDOFF-34a-hoje.md) — Hoje
    // reescrita de novo: plano de hoje → versículo → aplicação de ontem →
    // esta semana (com tempo por passo) → mensagens/métricas → resumo da
    // semana. Substitui de vez a 3c (decisão anterior, mesmo dia) — a 3c
    // era mais simples que este quadro, não o contrário, então não houve
    // conflito entre as duas decisões, só uma sequência.
    home: <HomeScreen
      session={session} authUser={authUser} completedSet={completedSet} stepMinutes={stepMinutes}
      weeklySummaries={weeklySummaries} onContinueSession={continueToday} onNavigate={navigateTo}
      onOpenProfile={() => setProfileOpen(true)}
      onSaveStepMinutes={saveStepMinutes} onOpenWeeklySummary={openWeeklySummaryFromHome}
      onOpenBiblePassage={openBiblePassage} onOpenSermonNote={openSermonNoteFromHome}
    />,
    // Turno 35, Bloco 2 (handoff-meu-plano-35/) — 35a/35b substituem a 4b
    // por inteiro: rotina do dia consumindo o modelo novo (step_days,
    // estudo com dias/minutos próprios, ordem de leitura) nascido no Bloco 1.
    routine: hasPremium
      ? <RoutineScreen session={session} completedSet={completedSet} stepMinutes={stepMinutes} onContinueSession={continueToday} onOpenActiveStudy={openActiveStudy} onNavigate={navigateTo} onStartGuided={startGuidedRoutine} />
      : <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />,
    // Turno 35, Bloco 1 (handoff-meu-plano-35/) — 35c substitui a 5a por
    // inteiro: passos com dias próprios em vez de um "ritmo da semana" só;
    // "onde começar/ordem/ritmo" e "estudo atual/banco/dias" saíram pras
    // telas próprias readingOrganize (35i) e studyOrganize (35j) abaixo.
    adjustPlan: hasPremium
      ? <AdjustPlanScreen session={session} completedSet={completedSet} stepMinutes={stepMinutes} onSaveStepMinutes={saveStepMinutes} onToggleRoutineModule={toggleRoutineModule} bookChapterCounts={bookChapterCounts} onNavigate={navigateTo} onBack={goBack} />
      : <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />,
    readingOrganize: hasPremium
      ? <ReadingOrganizeScreen session={session} completedSet={completedSet} blocks={blocks} bookChapterCounts={bookChapterCounts} stepMinutes={stepMinutes} bibleOrderMode={bibleOrderMode} onSaveBibleOrderMode={saveBibleOrderMode} onSetStartPosition={applyReadingStartPosition} onNavigate={navigateTo} onBack={goBack} />
      : <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />,
    studyOrganize: hasPremium
      ? <StudyOrganizeScreen session={session} onEndStudy={() => selectActiveStudy(null)} onNavigate={navigateTo} onBack={goBack} onOpenStudyDetail={() => goToTab('studyDetail')} />
      : <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />,
    // "Onde começar" (28d/28e, Bloco 6) — "Trocar plano" em Ajustar meu
    // plano (5a). chooseStartExisting nunca é alcançada por navegação
    // direta (setActiveTab, não navigateTo) — só via handleChooseStartContinue.
    chooseStart: hasPremium
      ? <ChooseStartScreen session={session} completedSet={completedSet} bookChapterCounts={bookChapterCounts} blocks={blocks} initialChoice={pendingStartChoice} onContinue={handleChooseStartContinue} onBack={goBack} />
      : <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />,
    chooseStartExisting: hasPremium && pendingStartChoice
      ? <ExistingProgressScreen session={session} blocks={blocks} book={pendingStartChoice.book} order={pendingStartChoice.order} completedSet={completedSet} bookChapterCounts={bookChapterCounts} readingMinutes={stepMinutes.reading} onConfirm={handleExistingProgressConfirm} onBack={() => setActiveTab('chooseStart')} />
      : <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />,
    aiSettings: !session.hasAI
      ? <PremiumRequired feature="ai" lang={session.lang} onNavigate={navigateTo} />
      : <AiSettingsScreen session={session} onBack={goBack} />,
    contact: <ContactScreen session={session} authUser={authUser} onBack={goBack} />,
    applicationPhrases: <ApplicationPhrasesScreen session={session} authUser={authUser} onBack={goBack} />,
    themePlan: !session.hasAI
      ? <PremiumRequired feature="ai" lang={session.lang} onNavigate={navigateTo} />
      : <ThemePlanScreen session={session} authUser={authUser} completedSet={completedSet} plans={themePlans} isAdmin={isAdmin} onPlansChanged={setThemePlans} autoOpenPlanId={themeAutoOpenId} autoOpenKeys={themeAutoOpenKeys} onToggleSession={toggleSession} onToggleChapter={toggleChapter} onNavigate={navigateTo} onCreateStudy={() => navigateTo('addStudy')} onGoToReflectionFrom={goToReflectionFrom} onBack={goBack} />,
    // 26e — entrada real de "Adicionar estudo" (pelo botão "Criar" em Meu
    // Plano/RoutineScreen.jsx): prontos + banco da comunidade não pedem IA
    // nenhuma, só o cartão "Criar com a IA" lá dentro pede session.hasAI —
    // por isso esta aba só trava por hasPremium (a rotina inteira já é
    // hasPremium), não por hasAI.
    // Turno 35, Bloco 4 — 35h substitui por inteiro o addStudy antigo.
    addStudy: !hasPremium
      ? <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />
      : <AddStudyScreen
          session={session}
          onBack={goBack}
          onCreateStudy={() => navigateTo('createAiStudy')}
          onChangeStudyDays={() => navigateTo('studyOrganize')}
          onOpenPreview={handleOpenStudyPreview}
          onOpenPublicBank={() => navigateTo('publicStudies')}
          onOpenStudyDetail={() => goToTab('studyDetail')}
        />,
    // Turno 41, 41i — "Banco público" (busca por situação, chips de tema).
    // Mesma trava de addStudy (rotina inteira é hasPremium).
    publicStudies: !hasPremium
      ? <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />
      : <PublicStudiesScreen
          session={session}
          onBack={goBack}
          onOpenPreview={handleOpenStudyPreview}
          onGoToSaved={() => navigateTo('addStudy')}
        />,
    // Etapa 10 (22a/22b) — fluxo ANTIGO (theme_plans/activeAltPlan.theme),
    // mantido pra quem ainda chega por ThemePlanScreen.jsx. Turno 35,
    // Bloco 4 não navega mais pra cá — ver createAiStudy/studyProposalNew.
    createStudy: !session.hasAI
      ? <PremiumRequired feature="ai" lang={session.lang} onNavigate={navigateTo} />
      : <CreateStudyScreen session={session} initialText={createStudyInitialText} onBack={goBack} onGenerated={reviewGeneratedStudy} />,
    studyProposal: generatedStudyPlan
      ? <StudyProposalScreen session={session} plan={generatedStudyPlan} onBack={goBack} onRefazer={refazerGeneratedStudy} onSaveForLater={saveStudyForLater} onStart={startGeneratedStudy} />
      : null,
    // Turno 35, Bloco 4 — 35d/35e (fluxo novo: ai_studies/selectActiveStudy).
    // `quota` (turno 41, 41b "cartão do limite") soma ai_studies + theme_plans
    // — mesma conta de api/generate-theme-plan.js (a cota é por CONTA, não
    // por mecanismo). Conta admin nunca esgota (mesma isenção do servidor).
    createAiStudy: !session.hasAI
      ? <PremiumRequired feature="ai" lang={session.lang} onNavigate={navigateTo} />
      : <CreateAiStudyScreen session={session} quota={isAdmin ? { ...studyQuota([]), exhausted: false } : studyQuota([...aiStudies, ...themePlans])} onBack={goBack} onGeneratePersonal={handleGeneratePersonalStudy} onGeneratedGroup={plan => { setGeneratedGroupPlan(plan); goToTab('groupPlanProposal') }} />,
    studyProposalNew: !aiStudyDraft
      ? null
      : <StudyProposalNewScreen
          session={session} plan={aiStudyDraft} mode={aiStudyDraft.mode}
          onBack={goBack} onRefazer={handleRefazeAiStudyDraft} onSwapDay={handleSwapAiStudyDay}
          onSaveForLater={handleSaveAiStudyForLater}
          onStart={aiStudyDraft.mode === 'preview' ? handleStartPreviewStudy : handleStartAiStudy}
        />,
    // Turno 41, Bloco 3 — 41d "O dia do estudo, aberto". `activeStudyForDay`/
    // `currentDay` resolvidos aqui (não guardados à parte) porque o dia
    // "atual" É sempre o mais recente incompleto — nunca dessincroniza.
    studyDay: !hasPremium
      ? <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />
      : !activeStudyForDay || !currentDay?.day
      ? null
      : <StudyDayScreen
          session={session} authUser={authUser} study={activeStudyForDay}
          day={currentDay.day} dayIndex={currentDay.index} totalDays={currentDay.total}
          onBack={goBack} onOpenBiblePassage={openBiblePassage}
          onStudyUpdated={setAiStudies}
          onCompleted={handleStudyDayCompleted}
          onSavedForLater={() => goToTab('routine')}
        />,
    // 41e "Fim do dia do estudo" — `justCompletedDay` é o dia que ACABOU
    // de ser concluído (guardado em justCompletedStudyDay na hora, ver
    // handleStudyDayCompleted), não o "atual" (que já é o seguinte).
    studyDayComplete: !hasPremium
      ? <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />
      : !justCompletedDay
      ? null
      : <StudyDayCompleteScreen
          session={session} authUser={authUser} study={justCompletedStudy}
          day={justCompletedDay} dayIndex={justCompletedDayIndex} totalDays={justCompletedStudy?.sessions?.length ?? 0}
          stepDays={stepDays} nextStep={nextRoutineStepInfo}
          onStudyUpdated={setAiStudies}
          onContinuePlan={() => { setJustCompletedStudyDay(null); continueStudyDayToNextStep() }}
          onFinishHere={() => { setJustCompletedStudyDay(null); goToTab('routine') }}
        />,
    // 41g "Estudo concluído" — substitui 41e no último dia (M de M, ver
    // handleStudyDayCompleted). Reusa justCompletedStudy/justCompletedDay
    // já resolvidos acima pra 41e (mesmo studyId/dayId, a diferença é só
    // qual tela renderiza).
    studyComplete: !hasPremium
      ? <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />
      : !justCompletedStudy
      ? null
      : <StudyCompleteScreen
          session={session} authUser={authUser} study={justCompletedStudy} returnedDays={returnedStudyDays}
          onChooseAnother={() => { setJustCompletedStudyDay(null); setReturnedStudyDays(null); goToTab('addStudy') }}
          onOnlyReadingForNow={() => { setJustCompletedStudyDay(null); setReturnedStudyDays(null); goToTab('routine') }}
          onBackToPlan={() => { setJustCompletedStudyDay(null); setReturnedStudyDays(null); goToTab('routine') }}
        />,
    // 41f "O estudo por dentro" — só o Estudo do formato novo chega aqui
    // (o antigo continua no "Ver os 7 dias" inline de StudyOrganizeScreen
    // .jsx). `activeStudyForDay` já é o mesmo resolvido pra 41d.
    studyDetail: !hasPremium
      ? <PremiumRequired feature="routine" lang={session.lang} onNavigate={navigateTo} />
      : !activeStudyForDay
      ? null
      : <StudyDetailScreen
          session={session} study={activeStudyForDay} stepDays={stepDays}
          onBack={goBack} onOpenDay={() => goToTab('studyDay')}
          onChangeStudyDays={() => navigateTo('studyOrganize')}
          onPause={() => { selectActiveStudy(null); goBack() }}
          onSwitchStudy={() => goToTab('addStudy')}
        />,
    // Etapa 10 (22d) — proposta e envio de um plano de grupo (só quem
    // modera chega aqui, ver CreateStudyScreen.jsx), e o leitor dele depois
    // de aceito (aberto por "Continuar sessão", ver continueToday).
    groupPlanProposal: generatedGroupPlan
      ? <GroupPlanProposalScreen session={session} authUser={authUser} plan={generatedGroupPlan} onBack={goBack} onSend={sendGeneratedGroupPlan} />
      : null,
    groupPlanReader: <GroupPlanReaderScreen session={session} authUser={authUser} completedSet={completedSet} plan={groupPlans.find(p => p.id === activeAltPlan?.planId)} onToggleSession={toggleSession} onToggleChapter={toggleChapter} onNavigate={navigateTo} onBack={goBack} onGoToReflectionFrom={goToReflectionFrom} />,
    chronologicalPlan: !hasPremium
      ? <PremiumRequired feature="generic" lang={session.lang} onNavigate={navigateTo} />
      : <ChronologicalPlanScreen session={session} authUser={authUser} completedSet={completedSet} paceId={activeAltPlan?.type === 'chrono' ? activeAltPlan.paceId : 'standard'} autoOpenMovementId={chronoAutoOpenMovementId} onToggleSession={toggleSession} onToggleChapter={toggleChapter} onNavigate={navigateTo} onGoToReflectionFrom={goToReflectionFrom} onBack={goBack} />,
    journey: <JourneyScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} browseSessionsByBlock={browseSessionsByBlock} completedSet={completedSet} onToggleSession={toggleSession} onToggleChapter={toggleChapter} onMarkChaptersManually={markChaptersManuallyFor} initialBlockId={activeBlockId} entryMode={journeyEntryMode} resumeSessionId={journeyResumeSessionId} browseJumpTarget={browseJumpTarget} onBrowseJumpConsumed={() => setBrowseJumpTarget(null)} onNavigate={navigateTo} onContinueSession={continueToday} onGoToReflectionFrom={goToReflectionFrom} onExitGuided={exitGuidedRoutine} onExitReading={() => { exitGuidedRoutine(); setJourneyEntryMode('overview'); goBack() }} onOpenGroupRoom={target => { setChapterRoom(target); goToTab('chapterRoom') }} onPastRootChange={setJourneyPastRoot} onBuildThemeStudy={buildThemeStudy} />,
    groups:  !meetsMinAge ? <MinAgeRestricted lang={session.lang} />
      : !hasPremium ? <PremiumRequired feature="groups" lang={session.lang} onNavigate={navigateTo} />
      : <GroupsScreen session={session} authUser={authUser} pendingGroupPlanInvites={pendingGroupPlanInvites} onRespondGroupPlanInvite={respondToGroupPlanInvite} onSocialChange={refreshSocialState} onOpenGroupRoom={target => { setChapterRoom(target); goToTab('chapterRoom') }} onOpenMessages={() => goToTab('groupMessages')} onOpenProfile={() => setProfileOpen(true)} entryTarget={groupsEntryTarget} onEntryTargetConsumed={() => setGroupsEntryTarget(null)} onDetailOpenChange={setGroupsDetailOpen} />,
    // Caixa de mensagens (33b) — página própria, aberta pelo sino de 33a;
    // "Ver" num grupo/pedido de amizade volta pra Comunidade (groups) já
    // no lugar certo, via groupsEntryTarget acima.
    groupMessages: !meetsMinAge ? <MinAgeRestricted lang={session.lang} />
      : !hasPremium ? <PremiumRequired feature="groups" lang={session.lang} onNavigate={navigateTo} />
      : <MessagesScreen session={session} authUser={authUser} blocks={blocks} onBack={goBack} onOpenGroupRoom={target => { setChapterRoom(target); goToTab('chapterRoom') }} onOpenGroup={groupId => { setGroupsEntryTarget({ type: 'group', groupId }); goToTab('groups') }} onOpenFriends={() => { setGroupsEntryTarget({ type: 'friends' }); goToTab('groups') }} onOpenBiblePassage={openBiblePassage} />,
    // "Minhas métricas" (30b/30c, Bloco 7) — quadrado "Minhas métricas" da
    // Home (34a) e Perfil (19a). Não tem gate de hasPremium: é a mesma
    // info de "progresso básico". "Sua caminhada" (ProgressScreen.jsx, aba
    // `stats`) saiu de vez em 2026-09-07 (rodada 34) — já estava
    // supersedida por esta tela, e o handoff pede pra apagar qualquer
    // "Progresso"/"Sua caminhada" que ainda existisse.
    metrics: <MetricsScreen session={session} completedSet={completedSet} sessionsByBlock={sessionsByBlock} stepMinutes={stepMinutes} hasWeeklySummary={weeklySummaries.length > 0} onNavigate={navigateTo} onBack={goBack} />,
    metricsBlocks: <MetricsBlocksScreen session={session} completedSet={completedSet} onBack={goBack} />,
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
    // Resumo semanal (31a/31b/31c, Bloco 13) — 3 telas em sequência, dado
    // já pronto (weeklySummaries, gravado pelo cron de domingo à noite).
    weeklySummaryNumbers: <WeeklySummaryNumbersScreen
      session={session} weeklyDays={weeklyDays} summaries={weeklySummaries} selectedIndex={weekSummaryIndex}
      onSelectWeek={setWeekSummaryIndex} onBack={goBack} onOpenText={() => goToTab('weeklySummaryText')}
    />,
    weeklySummaryText: <WeeklySummaryTextScreen
      session={session} summaries={weeklySummaries} selectedIndex={weekSummaryIndex}
      onSelectWeek={setWeekSummaryIndex} onBack={goBack} onOpenPrayerGroup={() => goToTab('weeklySummaryPrayerGroup')}
      onOpenLibrary={() => navigateTo('notes')}
    />,
    weeklySummaryPrayerGroup: <WeeklySummaryPrayerGroupScreen
      session={session} summaries={weeklySummaries} selectedIndex={weekSummaryIndex} onBack={goBack}
    />,
    // Rotina concluída (21c) — fecha o ciclo diário guiado (ver
    // advanceGuided). routineCompleteInfo só existe entre o fim da rotina e
    // "Voltar para Hoje".
    routineComplete: routineCompleteInfo
      ? <DayCompleteScreen
          session={session}
          authUser={authUser}
          steps={routineCompleteInfo.steps}
          readingSession={routineCompleteInfo.readingSession}
          onBack={() => { setRoutineCompleteInfo(null); goToTab('home') }}
        />
      : null,
    // Pacote 36-37, 36f — fim da Oração, sempre passa por aqui antes de
    // seguir (ver finishPrayerStep acima). Sem timer/estado que precise
    // sobreviver a troca de aba (ao contrário de prayer/reflection), entra
    // no mapa normal de telas.
    blessing: <BlessingScreen
      session={session} stepMinutes={stepMinutes}
      onContinueSession={continueToday} onNavigate={navigateTo}
      onFinishDay={finishDayFromBlessing} onBackToPlan={backToPlanFromBlessing}
    />,
    // Pacote 36-37, 36d — "Pedidos de oração" (linha em 36b/36c). Push
    // dentro de Meu Plano: fica fora de navHidden de propósito (barra de
    // abas continua fixa no rodapé, ver handoff).
    prayerRequests: <PrayerRequestsScreen session={session} authUser={authUser} onBack={goBack} />,
    // Pacote 36-37, 37e — fecho da leitura, sempre entre "Concluir"/
    // "Finalizar por aqui" (ReadingBlockView.jsx) e a Reflexão (ver
    // goToReflectionFrom/beginReflectionFromSummary acima).
    readingSummary: <ReadingSummaryScreen session={session} authUser={authUser} descriptor={lastReadSession} onBeginReflection={beginReflectionFromSummary} onBackToReading={backToLastReadSession} />,
    handsFree: hasPremium
      ? <HandsFreeScreen session={session} onExit={goBack} onNavigate={navigateTo} onMarkRoutineStep={markRoutineStep} onFinishReading={finishReadingFromHandsFree} />
      : <PremiumRequired feature="handsFree" lang={session.lang} onNavigate={navigateTo} />,
    upgrade: <UpgradeScreen session={session} subscription={subscription} onSubscriptionRefreshed={refreshSubscription} />,
    // Só alcançada pelo Sidebar (telas ≥768px) — no app (<768px) o avatar
    // abre a folha ProfileSheet (renderizada fora deste mapa, ver abaixo).
    profile: <ProfileScreen  session={session} authUser={authUser} subscription={subscription} isAdmin={isAdmin} onNavigate={navigateTo} onLogout={handleLogout} onResetProgress={handleResetProgress} onChangeLanguage={changeLanguage} onChangeReadingOrder={selectReadingOrder} onSelectPace={selectPlan} onProfileUpdated={handleProfileUpdated} />,
    // Bento 19b — Idioma e versão da Bíblia, alcançada pela folha do Perfil.
    language: <LanguageSettingsScreen session={session} authUser={authUser} onBack={goBack} onChangeLanguage={changeLanguage} />,
    // 19a, "Aparência e texto" — só o tamanho do texto é um seletor de
    // verdade (5 passos); "Claro" é informativo (ver comentário no
    // próprio arquivo, mesma "Regra Zero" de LanguageSettingsScreen.jsx
    // pra versão da Bíblia: o app não tem modo escuro pra escolher).
    appearance: <AppearanceScreen session={session} fontSizePt={fontSizePt} onChangeFontSizePt={changeFontSizePt} onBack={goBack} />,
    // Bento 19c — Administração do grupo, alcançada pela folha do Perfil.
    groupAdmin: <GroupAdminScreen session={session} authUser={authUser} onBack={goBack} onNavigate={navigateTo} onOpenGroupRoom={target => { setChapterRoom(target); goToTab('chapterRoom') }} />,
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
  const immersiveReading = activeTab === 'journey' && (journeyEntryMode === 'reading' || journeyPastRoot)
  // Telas já na identidade Bento (design_handoff_jesus_corner/Jesus Corner
  // Redesign.dc.html — 3c, 4b, 5f, 4c, 5b, 5a, 10f, 5d, 21a): nenhum quadro
  // tem o cabeçalho com logotipo/sino/avatar — o título de cada tela é a
  // saudação ou o nome dela (ADENDO: "os cabeçalhos usam saudação"). O
  // AppHeader fica só nas telas que ainda não foram desenhadas (Estudos…),
  // e é lá que continuam o sino e o ajuste de tamanho de texto. Perfil não
  // é mais uma dessas — virou a folha ProfileSheet (19a), aberta pelo
  // avatar (Home e o próprio AppHeader) por cima de qualquer tela, sem
  // navegar de aba. 'groups' SEMPRE entra aqui, aberto num grupo ou não —
  // achado corrigido em 2026-09-07: o comentário antigo aqui dizia que a
  // LISTA de grupos "não tem quadro no redesign" e por isso mantinha o
  // AppHeader antigo por cima; isso datava de antes do pacote novo
  // (rodadas 24-32) chegar — 24a é exatamente essa lista, tela canônica
  // própria, sem logotipo/sino/avatar nenhum por cima (só "Comunidade" +
  // contagem + busca + "+"). GroupsScreen.jsx já tinha o cabeçalho certo
  // (aHeader/bTitle, mesmo padding-top 22px das telas sem AppHeader) desde
  // a leva anterior — só a condição aqui é que nunca deixava ele aparecer
  // sozinho; ficava sempre com o AppHeader antigo empilhado em cima
  // (visível na aba Comunidade tanto com quanto sem grupo aberto, nunca
  // notado porque a varredura de identidade olhou tokens de cor, não
  // esse tipo de duplicação estrutural).
  // 'profile' entrou nesta lista junto da migração pra Bento do Perfil de
  // desktop (antes ficava de fora, com o AppHeader antigo por cima da
  // versão antiga da tela); 'contact'/'applicationPhrases'/'themePlan'
  // entraram junto da migração dessas telas — cada uma tem cabeçalho
  // Bento próprio agora. 'studies' MESMO BUG de 'groups' antes de
  // 2026-09-07 (ver comentário logo acima): StudyDetail/SessionView já
  // tinham cabeçalho próprio (seta de voltar + título, tokens --bento-*)
  // desde sempre, mas ficava com o AppHeader antigo (logo) empilhado em
  // cima — "abrir o estudo ainda parece o app antigo", reportado por ela
  // 2026-09-09. Corrigido junto com o cabeçalho de topo da lista, que
  // agora também aparece no mobile (era hide-on-mobile) — ver
  // StudiesScreen.jsx.
  const bentoScreen = ['home', 'routine', 'journey', 'notes', 'profile', 'adjustPlan', 'readingOrganize', 'studyOrganize', 'chooseStart', 'chooseStartExisting', 'metrics', 'metricsBlocks', 'aiSettings', 'contact', 'applicationPhrases', 'themePlan', 'chapterRoom', 'monthRecap', 'prayer', 'prayerRequests', 'blessing', 'readingSummary', 'reflection', 'routineComplete', 'language', 'appearance', 'groupAdmin', 'addStudy', 'createStudy', 'studyProposal', 'createAiStudy', 'studyProposalNew', 'groupPlanProposal', 'groupPlanReader', 'weeklySummaryNumbers', 'weeklySummaryText', 'weeklySummaryPrayerGroup', 'admin', 'groups', 'groupMessages', 'studies', 'publicStudies', 'studyDay', 'studyDayComplete', 'studyDetail', 'studyComplete'].includes(activeTab)
  // Sub-telas Bento cujo quadro não tem barra inferior (5a: o rodapé é o
  // botão "Salvar plano"; 10f: o rodapé é o aviso de offline; 10d: o
  // rodapé é "Próxima pergunta"); saem pela própria seta de voltar / ao
  // concluir. 'admin' (23a-d, Bloco 14) tem sidebar e cabeçalho PRÓPRIOS —
  // roda fora do chrome do app inteiro (ver .admin-active em index.css).
  // 'contact'/'applicationPhrases' também saem sozinhas (tela de
  // utilidade cheia, sem rodapé de rotina).
  // 35h (addStudy) fica DE FORA desta lista de propósito — HANDOFF-35 pede
  // barra de abas fixa nessa tela ("é um push dentro da aba Meu Plano"),
  // diferente de 35d/35e (createAiStudy/studyProposalNew), que têm botão
  // primário fixo no rodapé no lugar da barra, como o antigo createStudy/
  // studyProposal já tinham.
  // 'publicStudies' (41i) entrou aqui 2026-09-09: HANDOFF-41 é explícito
  // ("barra de abas só em 41a") — só o hub (addStudy) mostra a barra;
  // todas as outras telas de Estudos (41b em diante) ficam empilhadas com
  // voltar, sem barra.
  const navHidden = immersiveReading || ['adjustPlan', 'readingOrganize', 'studyOrganize', 'chooseStart', 'chooseStartExisting', 'metrics', 'metricsBlocks', 'aiSettings', 'contact', 'applicationPhrases', 'chapterRoom', 'monthRecap', 'prayer', 'blessing', 'readingSummary', 'reflection', 'routineComplete', 'language', 'appearance', 'groupAdmin', 'createStudy', 'studyProposal', 'createAiStudy', 'studyProposalNew', 'groupPlanProposal', 'weeklySummaryNumbers', 'weeklySummaryText', 'weeklySummaryPrayerGroup', 'admin', 'groupMessages', 'publicStudies', 'studyDay', 'studyDayComplete', 'studyDetail', 'studyComplete'].includes(activeTab)
  const isAdminScreen = activeTab === 'admin'

  return (
    <div className="app-shell">
      {/* Navegação lateral — só visível em telas ≥768px (ver index.css) */}
      {isDesktop && !immersiveReading && !isAdminScreen && (
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
                <PrayerScreen session={session} authUser={authUser} stepMinutes={stepMinutes} onPrayerCompleted={finishPrayerStep} onContinueSession={continueToday} onNavigate={navigateTo} onExitGuided={exitGuidedRoutine} onBack={goBack} />
              </div>
            )}
            {reflectionVisitedRef.current && (
              <div style={{ display: activeTab === 'reflection' ? 'contents' : 'none' }}>
                <ReflectionScreen session={session} authUser={authUser} stepMinutes={stepMinutes} lastReadChapterInfo={lastReadChapterInfo} onReflectionCompleted={() => { markRoutineStep('reflection'); advanceGuided('reflection') }} onNavigate={navigateTo} onContinueSession={continueToday} onExitGuided={exitGuidedRoutine} onBack={goBack} />
              </div>
            )}
            {hasPremium && notesVisitedRef.current && (
              <div style={{ display: activeTab === 'notes' ? 'contents' : 'none' }}>
                <NotesScreen session={session} authUser={authUser} blocks={blocks} sessionsByBlock={sessionsByBlock} onOpenBiblePassage={openBiblePassage} onOpenStudy={id => { setLibraryOpenStudyId(id); navigateTo('studies') }} onOpenThemePlan={openThemePlanDetail} onUseBankStudy={useStudyFromBank} />
              </div>
            )}
            {hasPremium && studiesVisitedRef.current && (
              <div style={{ display: activeTab === 'studies' ? 'contents' : 'none' }}>
                <StudiesScreen session={session} authUser={authUser} onNavigate={navigateTo} onContinueSession={continueToday} onMarkRoutineStep={markRoutineStep} onSelectActiveStudy={selectActiveStudy} autoOpenStudyId={libraryOpenStudyId} onAutoOpenStudyConsumed={() => setLibraryOpenStudyId(null)} />
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
        fontSizePt={fontSizePt}
        onNavigate={navigateTo}
        onClose={() => setProfileOpen(false)}
        onLogout={handleLogout}
        onResetProgress={handleResetProgress}
        onChangeReadingOrder={selectReadingOrder}
        onSelectPace={selectPlan}
        onProfileUpdated={handleProfileUpdated}
      />
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
      <AppIcon name="Lock" size={30} color="var(--bento-t4)" />
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-t3)' }}>{t('groups.minAgeRestrictedTitle', undefined, lang)}</p>
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t4)', maxWidth: 260 }}>{t('groups.minAgeRestrictedSub', undefined, lang)}</p>
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
      <AppIcon name={key === 'ai' ? 'Sparkles' : 'Crown'} size={30} color="var(--bento-accent)" />
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)' }}>{t(`billing.premiumRequired.${key}.title`, undefined, lang)}</p>
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', maxWidth: 280, lineHeight: 1.5 }}>{t(`billing.premiumRequired.${key}.sub`, undefined, lang)}</p>
      <button
        onClick={() => onNavigate?.('upgrade')}
        style={{ marginTop: 4, border: 'none', background: 'var(--bento-accent)', color: 'var(--bento-ink)', borderRadius: 12, padding: '10px 20px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}
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
