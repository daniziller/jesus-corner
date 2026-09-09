// HomeScreen.jsx — Hoje (rodada 34, handoff-hoje-34/HANDOFF-34a-hoje.md),
// rota `/`. Substitui TODAS as versões anteriores de Início — a 3c antiga
// (ação única) e o painel de métricas (HomeDashboard.jsx, apagado em
// 2026-09-07 quando a Home virou sempre 3c) já tinham saído; esta rodada
// troca a própria 3c pelo quadro novo. Ordem dos blocos, fixa (handoff:
// "ação → alimento → informação → o que espera", não reordenar): plano de
// hoje → versículo do dia → aplicação de ontem → esta semana (com tempo
// por passo) → dois quadrados (mensagens/métricas) → resumo da semana →
// barra de abas (fora deste arquivo, App.jsx).
//
// Os quatro dados que não existiam em lugar nenhum do código antes desta
// rodada (frase de aplicação com estado "cumpri", versículo do trecho em
// leitura, resumo de continuidade, tempo real do dia) ganharam módulos
// próprios em vez de serem inventados aqui: applicationPhraseStore.js
// (getWeekApplicationStatus/markPinnedApplicationFulfilled),
// home/homeVerseStore.js (getHomeVerse/getContinuityExcerpt),
// metrics/sessionDurationStore.js (totalsForDay, novo). "Sua caminhada"
// (ProgressScreen.jsx) saiu de vez — já estava supersedida por Métricas
// (MetricsScreen.jsx, 30b), que é pra onde o quadrado "Minhas métricas"
// desta tela leva.
import { useEffect, useState } from 'react'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import TimePerStepSheet from '../components/TimePerStepSheet'
import { DEFAULT_ROUTINE_MODULES, mondayOf } from '../routine/routineStreak'
import { WEEKDAY_ABBR3, WEEKDAY_FULL } from '../routine/weeklyDaysMath'
import { isStepEnabled } from '../plan/stepMinutesStore'
import { getAllSessions } from '../metrics/sessionDurationStore'
import { totalsByStep } from '../metrics/sessionDurationMath'
import { splitHoursMinutes } from '../metrics/metricsSummary'
import { getPinnedApplicationEntry, markPinnedApplicationFulfilled, getWeekApplicationStatus } from '../reflection/applicationPhraseStore'
import { getShowApplicationCard } from '../reflection/applicationCardVisibilityStore'
import { getGroupMessagesSummary } from '../groups/messagesStore'
import { getHomeVerse, getContinuityExcerpt } from '../home/homeVerseStore'
import { renderVerseShareImage, shareVerseImage } from '../home/verseShareImage'
import { saveHighlight } from '../highlights/highlightsStore'
import { DEFAULT_HIGHLIGHT_COLOR } from '../data/highlightColors'
import { dateKey } from '../utils/dateKey'
import { getStepDays, stepsScheduledForWeekday } from '../routine/stepDaysStore'
import { STEP_ORDER } from '../routine/planTodayRows'
import { getPrayerMethod } from '../prayer/prayerMethodStore'
import { getReflectionMethod } from '../reflection/reflectionMethodStore'
import { nextScheduledWeekday } from '../routine/stepDaysStore'
import { STUDIES } from '../data/studies'
import { getAiStudies } from '../studies/aiStudiesStore'
import { getInductiveStudies } from '../studies/inductiveStudiesStore'
import { getCompletedStudySessions, isStudySessionDone } from '../studies/studiesProgressStore'

const STEPS = ['prayer', 'reading', 'reflection']
// Mesmo padrão de weeklyDaysStore.js (getWeeklyDays) — enquanto o prop
// ainda não chegou/carregou, assume o padrão de 5 dias (seg-sex).
const DEFAULT_WEEKLY_DAYS = [true, true, true, true, true, false, false]

function cap(s) { return s[0].toUpperCase() + s.slice(1) }

// "Terça, 2 de setembro" / "Tuesday, September 2" — mesmo formato de
// sempre (3c), a base da linha "{dia da semana}, {D} de {mês} · {tipo do
// dia}" do quadro 34a.
export function formatToday(lang) {
  const raw = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const s = lang === 'en' ? raw : raw.replace('-feira', '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function greetingFor(lang, name) {
  const h = new Date().getHours()
  const key = h < 12 ? 'greetingMorning' : h < 18 ? 'greetingAfternoon' : 'greetingEvening'
  return translate(`home.${key}`, { name }, lang)
}

// Segunda=0 … domingo=6 — mesma convenção de weekly_days/DAY_KEYS
// (routine/weeklyDaysMath.js), só que a partir de Date.getDay() (0=domingo).
function weekdayIndexMonday(date) {
  return (date.getDay() + 6) % 7
}

export default function HomeScreen({
  session, authUser, completedSet, weeklyDays, stepMinutes,
  onContinueSession, onNavigate, onOpenProfile,
  onSaveStepMinutes, onOpenWeeklySummary, weeklySummaries, onOpenBiblePassage, onOpenSermonNote,
}) {
  const {
    lang, userName, avatarInitials, todaySession,
    routineModules, plan, todayRoutine, dailyRoutine,
    lastReadPosition, biblePercent, weeksInGoal, activeStudyId,
  } = session
  const L = (k, vars) => translate(`home.${k}`, vars, lang)
  const R = (k, vars) => translate(`routine.${k}`, vars, lang) // metas de passo compartilhadas com Meu Plano
  const email = authUser?.email

  // ── Dados que só existem via I/O (rede/Supabase) — um flag de
  // carregando só (nunca um spinner de tela cheia, ver handoff: "Esqueleto
  // dos blocos... nunca spinner"), preenchido em paralelo. Cada busca trata
  // a própria falha (RPC ainda sem migration, rede fora) devolvendo um
  // default seguro — uma falha isolada nunca derruba a tela inteira.
  const [loading, setLoading] = useState(true)
  const [sessionRows, setSessionRows] = useState([])
  const [pinnedEntry, setPinnedEntry] = useState(null)
  const [weekAppStatus, setWeekAppStatus] = useState({ total: 0, fulfilled: 0 })
  const [messagesSummary, setMessagesSummary] = useState([])
  const [verse, setVerse] = useState(null)
  const [continuityExcerpt, setContinuityExcerpt] = useState(null)
  const [timeSheetOpen, setTimeSheetOpen] = useState(false)
  const [verseSaved, setVerseSaved] = useState(false)
  const [sharingVerse, setSharingVerse] = useState(false)

  // ── Bloco 2, dados do modelo de passos com dias próprios (2026-09-08) —
  // mesmas fontes de RoutineScreen.jsx/Meu Plano, pra "Seu plano de hoje"
  // nunca discordar de "Meu Plano" sobre o que é hoje. Sem gate de loading
  // próprio (mesmo padrão de RoutineScreen.jsx): assume o fallback até
  // resolver, sem travar o resto da tela.
  const [stepDays, setStepDaysState] = useState(null)
  const [prayerMethod, setPrayerMethodState] = useState('acts')
  const [reflectionMethod, setReflectionMethodState] = useState('questions')
  const [activeStudy, setActiveStudy] = useState(null)

  useEffect(() => {
    getStepDays().then(setStepDaysState).catch(() => {})
    setPrayerMethodState(getPrayerMethod())
    setReflectionMethodState(getReflectionMethod())
  }, [])

  useEffect(() => {
    if (!activeStudyId) { setActiveStudy(null); return }
    Promise.all([getAiStudies(), getInductiveStudies(), getCompletedStudySessions()]).then(([ai, inductive, doneSet]) => {
      const study = [...STUDIES, ...ai, ...inductive].find(s => s.id === activeStudyId)
      if (!study) return
      const total = study.sessions?.length ?? 0
      const done = (study.sessions ?? []).filter(s => isStudySessionDone(doneSet, study.id, s.id)).length
      const current = (study.sessions ?? [])[Math.min(done, total - 1)]
      setActiveStudy({
        title: study.title ?? study.titleEn ?? '',
        passage: current ? (lang === 'en' ? (current.passageEn ?? current.passage) : current.passage) : '',
        dayDone: done, dayTotal: total,
      })
    }).catch(() => {})
  }, [activeStudyId, lang])

  useEffect(() => {
    let alive = true
    setLoading(true)
    const chapterForVerse = !todaySession.needsThemePick && todaySession.type !== 'reflection'
      ? { book: todaySession.book, chapter: todaySession.chStart }
      : null
    // getAllSessions/getPinnedApplicationEntry/getWeekApplicationStatus
    // funcionam pra convidado também (guestTableStore.js/userDataStore.js
    // resolvem local vs. Supabase por dentro — ver comentário de cada um);
    // só getGroupMessagesSummary exige conta de verdade (chama RPC direto),
    // e ela mesma já trata a falha (console.error + []), então nem precisa
    // de guarda aqui — uma falha isolada não derruba o resto da tela.
    Promise.allSettled([
      getAllSessions(),
      getPinnedApplicationEntry(email),
      getWeekApplicationStatus(email),
      getGroupMessagesSummary(),
      chapterForVerse ? getHomeVerse({ ...chapterForVerse, lang }) : Promise.resolve(null),
      lastReadPosition ? getContinuityExcerpt(lastReadPosition.book, lastReadPosition.chapter, lang) : Promise.resolve(null),
    ]).then(([rows, pinned, weekStatus, msgSummary, homeVerse, excerpt]) => {
      if (!alive) return
      if (rows.status === 'fulfilled') setSessionRows(rows.value)
      if (pinned.status === 'fulfilled') setPinnedEntry(pinned.value)
      if (weekStatus.status === 'fulfilled') setWeekAppStatus(weekStatus.value)
      if (msgSummary.status === 'fulfilled') setMessagesSummary(msgSummary.value)
      if (homeVerse.status === 'fulfilled') setVerse(homeVerse.value)
      if (excerpt.status === 'fulfilled') setContinuityExcerpt(excerpt.value)
      setLoading(false)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, todaySession.book, todaySession.chStart, lastReadPosition?.book, lastReadPosition?.chapter, lang])

  const verseData = verse ?? { text: '', ref: '', version: null }
  const dateLabel = formatToday(lang)
  const greeting = greetingFor(lang, userName)

  useEffect(() => { setVerseSaved(false) }, [verseData.ref])

  // "Salvar" o versículo do dia (bloco 3) — grava como marcação
  // (highlightsStore.js, mesmo mecanismo da Bíblia/Notas), sem anotação
  // própria (texto vazio, só o realce) — reaproveita a infra que já
  // existe em vez de criar uma tabela nova só pra isto.
  async function handleSaveVerse() {
    if (verseSaved || !verseData.bookPt || !verseData.chapter || !verseData.verseNum) return
    setVerseSaved(true)
    try {
      await saveHighlight(email, {
        id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        book: verseData.bookPt, bookEn: verseData.bookEn, chapter: verseData.chapter,
        verses: [verseData.verseNum], text: '', color: DEFAULT_HIGHLIGHT_COLOR,
        createdAt: new Date().toISOString(), date: todayKeyStr, sessionMode: 'browse',
      })
    } catch (err) {
      console.error('Failed to save verse of the day as highlight', err)
    }
  }

  // "Compartilhar" (bloco 3) — gera uma imagem no formato do Instagram
  // Stories (1080×1920, com a marca e o @ do app) e abre o seletor nativo
  // de compartilhamento (home/verseShareImage.js) — é o que faz o
  // Instagram oferecer "Adicionar aos stories" no próprio seletor, não tem
  // API própria acessível de dentro de um PWA. Mesmo mecanismo já usado
  // pela retrospectiva do mês (recap/recapImage.js), só que vertical.
  async function handleShareVerse() {
    if (sharingVerse) return
    setSharingVerse(true)
    try {
      const blob = await renderVerseShareImage({
        text: verseData.text, ref: verseData.ref, version: verseData.version, brandText: "Jesus' Corner",
      }).catch(err => { console.error('Failed to render verse share image', err); return null })
      await shareVerseImage(blob, { title: L('verseOfDay'), text: `"${verseData.text}" — ${verseData.ref}` })
    } finally {
      setSharingVerse(false)
    }
  }

  // "Ir para o texto" (bloco 3) — toca no versículo, abre o capítulo na
  // aba Bíblia (mesma função já usada por NotesScreen/StudiesScreen/
  // InductiveMethodScreen pra deep-link num livro:capítulo específico —
  // ver openBiblePassage em App.jsx). Sem-efeito silencioso se o capítulo
  // não existir em nenhum bloco (não deveria acontecer, mas mesma postura
  // defensiva dos outros chamadores).
  function handleOpenVerseText() {
    if (!verseData.bookPt || !verseData.chapter) return
    onOpenBiblePassage?.(verseData.bookPt, verseData.chapter)
  }

  // ── Bloco 2 — SEU PLANO DE HOJE ──
  // "Esta semana" (Bloco 5) continua com o modelo antigo de sempre (um
  // weeklyDays só, sem Estudo) — fora de escopo aqui, pedido dela era só
  // sobre este bloco. enabledSteps/minutesFor seguem servindo o Bloco 5.
  const enabledSteps = STEPS.filter(s => {
    const inRoutine = (routineModules ?? DEFAULT_ROUTINE_MODULES).includes(s)
    const minutesMap = { prayer: plan.prayerMinutes, reading: plan.readingMinutes, reflection: plan.reflectionMinutes }
    return inRoutine && isStepEnabled(minutesMap[s])
  })
  const minutesFor = { prayer: plan.prayerMinutes, reading: plan.readingMinutes, reflection: plan.reflectionMinutes }
  const todayKeyStr = dateKey()
  const mondayKeyStr = dateKey(mondayOf(new Date()))
  const todayWeekdayIdx = weekdayIndexMonday(new Date())
  // 2026-09-09 — tela branca real em produção (2ª vez, mesma classe de
  // bug de continuityLine acima): `weekdayFull` era declarada só perto
  // do "Bloco 5" (~180 linhas abaixo), mas `nextWeekdayLabel` (função
  // hoisted, ok) já era CHAMADA dentro de planSubtitleText bem antes —
  // `ReferenceError: Cannot access 'weekdayFull' before initialization`
  // de verdade. Passou a disparar de verdade com o modo "substitui" do
  // turno 41 (Estudo tira a Leitura do dia — activeStepsToday.includes
  // ('reading') && !readingToday vira um caminho comum), mas o bug já
  // existia antes disso (mesma condição também batia sem "substitui",
  // com Leitura e Estudo em dias diferentes há muito tempo) — só não
  // tinha sido pego ainda.
  const weekdayFull = WEEKDAY_FULL[lang] ?? WEEKDAY_FULL.pt
  const activeWeeklyDays = Array.isArray(weeklyDays) && weeklyDays.length === 7 ? weeklyDays : DEFAULT_WEEKLY_DAYS

  // 2026-09-08 — "Seu plano de hoje" passa a usar o MESMO modelo de dias
  // por passo de Meu Plano (stepDays), em vez do STEPS fixo
  // [oração,leitura,reflexão] antigo (que não sabia de Estudo nem de dias
  // por passo, e usava um weeklyDays só pra "descanso"). Trilhas
  // independentes (handoff-app-completo, 34b/34c venceram sobre a
  // substituição antiga): Leitura e Estudo têm dias próprios e podem cair
  // no mesmo dia. `activeStepsToday` segue só o toggle (routineModules) —
  // achado dela (2026-09-09): "study" chegou a contar como ativo com o
  // toggle desligado, contanto que houvesse um `activeStudyId` — mesmo bug
  // de RoutineScreen.jsx, mesma correção (toggle desligado = passo pausado,
  // sem exceção; `activeStudyId` só decide o CONTEÚDO do passo quando ele
  // já está ligado pelo toggle).
  const routineModulesSet = new Set(routineModules ?? DEFAULT_ROUTINE_MODULES)
  const activeStepsToday = STEP_ORDER.filter(k => routineModulesSet.has(k))
  const todaysSteps = stepDays ? stepsScheduledForWeekday(stepDays, activeStepsToday, todayWeekdayIdx, session.studyReplacesReading) : []

  const stepMinutesAll = {
    prayer: minutesFor.prayer, reading: minutesFor.reading,
    study: stepMinutes?.study ?? 15, reflection: minutesFor.reflection,
  }
  function minutesForStep(key) { return stepMinutesAll[key] }
  const totalPlanMin = todaysSteps.reduce((sum, k) => sum + (minutesForStep(k) || 0), 0)
  const currentKey = todaysSteps.find(k => !todayRoutine[k]) ?? null
  const allDoneToday = todaysSteps.length > 0 && !currentKey

  const planState = session.hasNoPlan ? 'noPlan' : todaysSteps.length === 0 ? 'dayOff' : 'normal'

  const stepTitle = k => translate(`home.routine${cap(k)}`, undefined, lang)

  function handleOnlyRead() {
    if (todaySession.needsThemePick) { onNavigate?.('routine'); return }
    onContinueSession?.()
  }

  // ── Bloco 2, quadro novo (34a/34b/34c) — título grande, subtítulo de
  // continuidade e a grade de tiles (um por passo ATIVO, ligado ou
  // "desligado hoje" — nenhum tile some, ver 34c). Só entra quando o dia
  // NÃO está com a rotina inteira cumprida (esse estado mantém a lista
  // antiga acima, sem quadro de referência próprio — ver comentário mais
  // abaixo, junto do JSX).
  const readingChapterLabel = todaySession.needsThemePick ? L('noPlanTitle') : todaySession.title
  const readingToday = todaysSteps.includes('reading')
  const studyToday = todaysSteps.includes('study')
  const studyTitleDay = activeStudy ? `${activeStudy.title} · ${R('dayXofY', { n: activeStudy.dayDone + 1, total: activeStudy.dayTotal })}` : stepTitle('study')

  const planTitleText = readingToday && studyToday
    ? L('planTitleBoth', { chapter: readingChapterLabel })
    : readingToday
      ? readingChapterLabel
      : studyToday
        ? studyTitleDay
        : (todaysSteps.length > 0 ? joinNames(todaysSteps.map(k => stepTitle(k))) : '')

  // "Volta {dia}" — dia da semana em que um passo OFF hoje volta a cair,
  // a partir de stepDays[passo] (ver nextScheduledWeekday, stepDaysMath.js).
  function nextWeekdayLabel(key) {
    const days = stepDays?.[key]
    if (!days) return null
    const idx = nextScheduledWeekday(days, todayWeekdayIdx)
    return idx == null ? null : weekdayFull[idx]
  }

  // Continuidade — "Ontem às 6:48 você parou em: '...'" (só quando existe
  // um último texto lido de verdade — sem isso, a linha simplesmente não
  // aparece, nunca um texto inventado). O dia (Hoje/Ontem/dia da semana) é
  // calculado a partir de readAt real, não fixado em "Ontem" — a cópia do
  // handoff usa "Ontem" como exemplo mais comum, mas o dado é real.
  //
  // Precisa vir ANTES de planSubtitleText (acha aqui embaixo) — achado
  // reparando o "tela branca" real em produção (2026-09-09):
  // `continuityLine` era usada em planSubtitleText mais de 40 linhas antes
  // de ser declarada nesta mesma função, um `ReferenceError: Cannot access
  // 'continuityLine' before initialization` de verdade (TDZ de `const`),
  // não um efeito de bundler/dependência circular — só derrubava quem já
  // tinha sessão (Home só renderiza autenticado, por isso nunca aparecia
  // testando sem login).
  function continuityDayWord(readAtIso) {
    const readDate = new Date(readAtIso)
    const diffDays = Math.round((new Date(dateKey()) - new Date(dateKey(readDate))) / 86400000)
    if (diffDays <= 0) return L('continuityToday')
    if (diffDays === 1) return L('continuityYesterday')
    return readDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long' })
  }
  const continuityHour = lastReadPosition?.readAt
    ? new Date(lastReadPosition.readAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: 'numeric', minute: '2-digit' })
    : null
  const continuityLine = (lastReadPosition && continuityHour)
    ? L('continuityLine', { day: continuityDayWord(lastReadPosition.readAt), hour: continuityHour })
      + (continuityExcerpt ? ' ' + L('continuityExcerpt', { text: continuityExcerpt }) : '')
    : null

  const planSubtitleText = readingToday
    ? continuityLine
    : (studyToday && activeStepsToday.includes('reading') && nextWeekdayLabel('reading'))
      ? L('planSubtitleStudyOnly', { weekday: nextWeekdayLabel('reading'), ref: readingChapterLabel })
      : null

  // Detalhe (3ª linha) de cada tile — sempre presente (pedido dela,
  // 2026-09-08: "sempre com a 3ª linha"), mesmo nos 3 tiles de 34a (o
  // quadro de referência só não mostra por acaso, com todos os passos
  // ligados hoje). Reflexão sempre "Três perguntas do dia" e Estudo
  // sempre "{título} · dia N de M" — mesmo com estudo ativo mostrando
  // passagem em 34c, ela escolheu padronizar no formato de 34b pros dois.
  function tileDetailFor(key, on) {
    if (key === 'prayer') {
      if (on) return prayerMethod === 'acts' ? L('tilePrayerActs') : L('tilePrayerFree')
      const wd = nextWeekdayLabel('prayer')
      return wd ? L('tileVoltaWeekday', { weekday: wd }) : null
    }
    if (key === 'reading') {
      if (on) return `${readingChapterLabel} · ${L('tileBibleContinuous')}`
      const wd = nextWeekdayLabel('reading')
      return wd ? L('tileVoltaWeekdayRef', { weekday: wd, ref: readingChapterLabel }) : null
    }
    if (key === 'study') {
      if (on) return activeStudy ? studyTitleDay : null
      const wd = nextWeekdayLabel('study')
      if (!wd) return null
      return activeStudy ? L('tileVoltaWeekdayRef', { weekday: wd, ref: activeStudy.title }) : L('tileVoltaWeekday', { weekday: wd })
    }
    // reflection
    if (on) return L('tileReflectionOn')
    const wd = nextWeekdayLabel('reflection')
    return wd ? L('tileVoltaWeekday', { weekday: wd }) : null
  }

  // ── Bloco 4 — SUA APLICAÇÃO DE ONTEM ──
  // Estado especial de "rotina cumprida": se a Reflexão de HOJE já
  // escreveu uma frase nova, ela sobe pro 2º lugar em bloco escuro (a
  // frase de ontem, já tratada, sai de cena) — sem botão "Cumpri" ainda
  // (só volta amanhã).
  const todayApplicationKey = `application:${todayKeyStr}`
  const wroteApplicationToday = pinnedEntry?.key === todayApplicationKey
  // Respeita a preferência de mostrar/esconder o card (Perfil → ProfileSheet,
  // por dispositivo — ver applicationCardVisibilityStore.js, pré-existente
  // à rodada 34, não inventada aqui).
  const showApplicationCard = !!pinnedEntry?.text && getShowApplicationCard()

  async function handleFulfillApplication() {
    if (!pinnedEntry?.key || pinnedEntry.fulfilled) return
    setPinnedEntry(prev => prev ? { ...prev, fulfilled: true } : prev)
    // Só soma na contagem semanal se a frase em si foi ESCRITA nesta
    // semana (mesmo critério de getWeekApplicationStatus/mondayOf) — uma
    // frase de semana passada, ainda fixada por falta de uma nova, pode
    // ser marcada cumprida sem contar como "1 de 1" numa semana que não é
    // a dela (bug encontrado testando: sem essa checagem, a Home mostrava
    // "1 de 1" por um instante e voltava pra "0 de 0" ao recarregar).
    if (pinnedEntry.date && pinnedEntry.date >= mondayKeyStr && pinnedEntry.date <= todayKeyStr) {
      setWeekAppStatus(prev => ({ total: Math.max(prev.total, 1), fulfilled: prev.fulfilled + 1 }))
    }
    try {
      await markPinnedApplicationFulfilled(email, pinnedEntry)
    } catch (err) {
      console.error('Failed to mark application phrase as fulfilled', err)
    }
  }

  // ── Bloco 5 — ESTA SEMANA ──
  // Pedido explícito da Daniela (2026-09-07, comparando com screens/34a.png):
  // o bloco fica sempre na tela, com o dado real que existir (mesmo que seja
  // zero) — sem estado "primeiros 7 dias" escondendo o quadro inteiro.
  const monday = mondayOf(new Date())
  const markedDayIdxs = activeWeeklyDays.map((on, i) => on ? i : null).filter(i => i !== null)
  const weekDayCells = markedDayIdxs.map(i => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const key = dateKey(d)
    const isToday = key === todayKeyStr
    const isFuture = key > todayKeyStr
    const done = !isFuture && !!dailyRoutine?.[key]?.reading
    return { key, isToday, isFuture, done, weekdayIdx: i }
  })
  const daysMetThisWeek = weekDayCells.filter(c => c.done).length
  const weekTotals = totalsByStep(sessionRows, dateKey(monday))
  const weekTotalSeconds = weekTotals.prayer + weekTotals.reading + weekTotals.reflection
  const weekdayAbbr = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt

  // ── Bloco 6 — dois quadrados ──
  const unreadMessagesTotal = messagesSummary.reduce((sum, g) => sum + (g.unreadCount || 0), 0)
  const messageGroupNames = messagesSummary.filter(g => g.unreadCount > 0).map(g => g.groupName)
  function joinNames(names) {
    if (names.length <= 1) return names[0] ?? ''
    const sep = lang === 'en' ? ' and ' : ' e '
    return `${names.slice(0, -1).join(', ')}${sep}${names[names.length - 1]}`
  }
  const totalHM = splitHoursMinutes(sessionRows.reduce((sum, r) => sum + r.segundos, 0))
  const biblePctLabel = biblePercent.toLocaleString(lang === 'en' ? 'en' : 'pt-BR', { maximumFractionDigits: 1 }) + '%'

  // ── Bloco 7 — SUA SEMANA (resumo) ──
  const latestSummary = (weeklySummaries ?? [])[0]

  const initialStepMinutes = { prayer: plan.prayerMinutes, reading: plan.readingMinutes, reflection: plan.reflectionMinutes }

  if (loading) {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <div>
            <p style={styles.greeting}>{greeting}</p>
            <p style={styles.date}>{dateLabel}</p>
          </div>
          <button style={styles.avatar} onClick={() => onOpenProfile?.()} aria-label={translate('nav.profile', undefined, lang)}>
            {avatarInitials}
          </button>
        </div>
        <div style={styles.body}>
          <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 210 }} />
          <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 130 }} />
          <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 110 }} />
          <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 180 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 132, flex: 1 }} />
            <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 132, flex: 1 }} />
          </div>
          <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 90 }} />
        </div>
      </div>
    )
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <div>
          <p style={styles.greeting}>{greeting}</p>
          <p style={styles.date}>{dateLabel}</p>
        </div>
        <button style={styles.avatar} onClick={() => onOpenProfile?.()} aria-label={translate('nav.profile', undefined, lang)}>
          {avatarInitials}
        </button>
      </div>

      <div style={styles.body}>

        {/* Bloco 2 — SEU PLANO DE HOJE (2026-09-08: passos com dias
            próprios, mesmo modelo de Meu Plano — ver planTodayRows.js).
            Concluído (2026-09-09, pedido dela): o card fica com as MESMAS
            cores de sempre (nada de fundo/kicker próprios pro estado
            "feito" — tirado o cinza-ardósia que tinha antes) e a MESMA
            estrutura (título + grade de tiles), só troca o texto de cima
            e acrescenta um check em cada tile já feito — ver isDone dentro
            do .map() dos tiles, mais abaixo. */}
        <div style={styles.planCard}>
          <div style={styles.planHead}>
            <p style={styles.planLabel}>
              {planState === 'normal' && allDoneToday ? L('planDoneLabel') : L('planLabel')}
            </p>
            {planState === 'normal' && !allDoneToday && totalPlanMin > 0 && (
              <button style={styles.planMin} onClick={() => setTimeSheetOpen(true)}>{L('minShort', { n: totalPlanMin })}</button>
            )}
          </div>

          {planState === 'noPlan' && (
            <>
              <p style={styles.planTitle}>{L('noPlanTitle')}</p>
              <button style={styles.startBtn} onClick={() => onNavigate?.('chooseStart')}>
                <span style={styles.startBtnText}>{L('noPlanCta')}</span>
                <span style={styles.startBtnArrow}>→</span>
              </button>
            </>
          )}

          {/* "Dia off" — nenhum passo do plano cai hoje (stepDays de todos
              os passos ativos desmarcados pra hoje). "Adiantar" reaproveita
              o mesmo onContinueSession de "Só ler": abre a próxima leitura
              pendente de verdade, sem mexer nos dias configurados. */}
          {planState === 'dayOff' && (
            <>
              <p style={styles.planTitle}>{L('dayOffTitle')}</p>
              <p style={styles.continuityLine}>{L('dayOffSub')}</p>
              <button style={{ ...styles.onlyReadBtn, width: '100%' }} onClick={handleOnlyRead}>
                <span style={styles.onlyReadBtnText}>{L('dayOffCta')}</span>
              </button>
            </>
          )}

          {/* Dia em andamento OU concluído (34a/34b/34c) — título grande
              (capítulo, ou capítulo + estudo, ou estudo sozinho quando a
              Leitura não cai hoje), subtítulo de continuidade, e a grade
              de tiles: um por passo ATIVO, sempre 3 linhas, nunca some
              (passo fora de hoje vira "dia off" + "Volta {dia}"). Um botão
              só, "Ir para meu plano" — nenhum PNG mostra "Começar agora"/
              "Só ler" mais. Concluído (2026-09-09, pedido dela): mesmo
              card de sempre, só troca o texto de cima (ver planHead acima)
              e cada tile já feito ganha um check no canto — nenhum PNG
              desenha esse estado, mas ela decidiu que o card "quase igual"
              é melhor que o desenho próprio (linhas + "capítulo extra"/
              "ver no grupo") que existia aqui antes. */}
          {planState === 'normal' && (
            <>
              <p style={styles.planTitle}>{planTitleText}</p>
              {planSubtitleText && <p style={styles.continuityLine}>{planSubtitleText}</p>}

              {/* README (fluxo de 34a): "quadros de tempo ► 35c Ajustar
                  meu plano" — cada tile abre o ajuste de tempo/dias do
                  passo, mesmo destino pros quatro. */}
              <div style={{ ...styles.tilesRow, ...(activeStepsToday.length >= 4 ? styles.tilesGrid4 : null) }}>
                {activeStepsToday.map(k => {
                  const on = todaysSteps.includes(k)
                  const detail = tileDetailFor(k, on)
                  const isDone = on && !!todayRoutine[k]
                  return (
                    <button key={k} type="button" style={{ ...styles.tile, position: 'relative' }} onClick={() => onNavigate?.('adjustPlan')}>
                      {isDone ? (
                        <span style={styles.tileCheck}>
                          <AppIcon name="Check" size={11} strokeWidth={3} color="var(--bento-ink)" />
                        </span>
                      ) : on && (
                        <span style={styles.tileCirclePending} />
                      )}
                      <p style={styles.tileTop}>
                        {on ? <>{minutesForStep(k)}<span style={styles.tileTopUnit}> min</span></> : L('tileDayOff')}
                      </p>
                      <p style={styles.tileStepName}>{stepTitle(k)}</p>
                      {detail && <p style={styles.tileDetail}>{detail}</p>}
                    </button>
                  )
                })}
              </div>

              <button style={{ ...styles.startBtn, width: '100%' }} onClick={() => onNavigate?.('routine')}>
                <span style={styles.startBtnText}>{L('goToMyPlan')}</span>
                <span style={styles.startBtnArrow}>→</span>
              </button>
            </>
          )}
        </div>

        {/* Bloco 3 — VERSÍCULO DO DIA. */}
        <div style={styles.verseCard}>
          <div style={styles.verseHead}>
            <p style={styles.verseLabel}>{L('verseOfDay')}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={styles.verseIconBtn} aria-label={L(verseSaved ? 'verseSaved' : 'saveVerse')} onClick={handleSaveVerse}>
                <AppIcon name="BookMarked" size={13} color={verseSaved ? 'var(--bento-accent)' : 'var(--bento-t2)'} strokeWidth={2} />
              </button>
              <button style={styles.verseIconBtn} aria-label={L('shareVerse')} onClick={handleShareVerse} disabled={sharingVerse}>
                <AppIcon name="Share2" size={13} color="var(--bento-t2)" strokeWidth={2} />
              </button>
            </div>
          </div>
          {/* Toca no texto pra abrir o capítulo na aba Bíblia — mesmo
              padrão dos tiles do plano de hoje (tocar abre algo, sem
              chrome visual extra pra não fugir do layout do 34a.png). */}
          <button style={styles.verseTextBtn} onClick={handleOpenVerseText} aria-label={L('openVerseText')}>
            <p style={styles.verseText}>&ldquo;{verseData.text}&rdquo;</p>
            <p style={styles.verseRef}>{verseData.ref}{verseData.version ? ` · ${verseData.version}` : ''}</p>
          </button>
        </div>

        {/* Bloco 4 — SUA APLICAÇÃO DE ONTEM. */}
        {showApplicationCard && (
          <div style={{ ...styles.applyCard, ...(wroteApplicationToday ? styles.applyCardDark : {}) }}>
            <div style={styles.applyHead}>
              <p style={{ ...styles.applyLabel, ...(wroteApplicationToday ? styles.applyLabelDark : {}) }}>{L('applyLabel')}</p>
              {!wroteApplicationToday && (
                <button style={styles.applyChangeBtn} onClick={() => onNavigate?.('applicationPhrases')}>{L('applyChange')}</button>
              )}
            </div>
            <p style={{ ...styles.applyText, ...(wroteApplicationToday ? styles.applyTextDark : {}) }}>{pinnedEntry.text}</p>
            {wroteApplicationToday ? (
              <p style={styles.applyPendingNote}>{L('applyPendingNote')}</p>
            ) : (
              <div style={styles.applyFootRow}>
                <button
                  style={{ ...styles.fulfillBtn, ...(pinnedEntry.fulfilled ? styles.fulfillBtnDone : {}) }}
                  onClick={handleFulfillApplication}
                  disabled={pinnedEntry.fulfilled}
                >
                  {pinnedEntry.fulfilled ? L('fulfilledDone') : L('fulfillBtn')}
                </button>
                <span style={styles.applyWeekCount}>
                  {L(weekAppStatus.total === 1 ? 'applyWeekCountOne' : 'applyWeekCountMany', { done: weekAppStatus.fulfilled, total: weekAppStatus.total })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bloco 5 — ESTA SEMANA. */}
        <div style={styles.weekCard}>
          <div style={styles.weekHead}>
            <p style={styles.weekLabel}>{L('weekLabel')}</p>
            <p style={styles.weekCount}>
              <span style={styles.weekCountStrong}>{daysMetThisWeek}</span> {L('ofDaysSuffix', { total: markedDayIdxs.length })}
            </p>
          </div>
          <div style={styles.weekGridRow}>
            <div style={styles.weekGrid}>
              {weekDayCells.map(c => {
                const state = c.done ? 'done' : c.isToday ? 'today' : 'other'
                return (
                  <div key={c.key} style={styles.weekDayCol}>
                    <span style={{ ...styles.weekDaySquare, ...styles.weekDaySquare_[state] }}>
                      {state === 'done' && <AppIcon name="Check" size={14} color="var(--bento-ink)" strokeWidth={2.8} />}
                      {state === 'today' && <span style={styles.weekTodayDot} />}
                    </span>
                    <span style={{ ...styles.weekDayLetter, ...styles.weekDayLetter_[state] }}>{weekdayAbbr[c.weekdayIdx]}</span>
                  </div>
                )
              })}
            </div>
            <p style={styles.weekNote}>{L('weekNote', { day: weekdayFull[todayWeekdayIdx] })}</p>
          </div>

          {enabledSteps.length > 0 && (
            <div style={styles.weekTimeRow}>
              {STEPS.filter(s => enabledSteps.includes(s)).map(s => (
                <div key={s} style={styles.weekTimeCol}>
                  <p style={styles.weekTimeValue}>{Math.round((weekTotals[s] || 0) / 60)}<span style={styles.weekTimeUnit}>{L('minUnit')}</span></p>
                  <p style={styles.weekTimeLabel}>{L(`step${cap(s)}`)}</p>
                </div>
              ))}
              <div style={{ ...styles.weekTimeCol, alignItems: 'flex-end', textAlign: 'right' }}>
                <p style={styles.weekTimeValue}>{Math.round(weekTotalSeconds / 60)}<span style={styles.weekTimeUnit}>{L('minUnit')}</span></p>
                <p style={styles.weekTimeLabel}>{L('inTotal')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bloco 6 — dois quadrados. Pedido explícito da Daniela: os dois
            quadrados ficam sempre na tela (mesmo padrão do Bloco 5 acima) —
            "Mensagens novas" com badge/nomes só quando há de verdade algo
            não lido (nunca um "0" fingido), "Minhas métricas" sempre com o
            dado real (mesmo que seja 0%/0h). */}
        <div style={styles.squaresRow}>
          <button style={styles.squareDark} onClick={() => onNavigate?.('groupMessages')}>
            <div style={styles.squareTopRow}>
              <AppIcon name="Users" size={16} color="rgba(255,255,255,.55)" strokeWidth={2} />
              {unreadMessagesTotal > 0 && <span style={styles.squareBadge}>{unreadMessagesTotal > 99 ? '99+' : unreadMessagesTotal}</span>}
            </div>
            <div>
              <p style={styles.squareTitleDark}>{L('newMessages')}</p>
              <p style={styles.squareSubDark}>{unreadMessagesTotal > 0 ? joinNames(messageGroupNames) : L('noNewMessages')}</p>
            </div>
          </button>
          <button style={styles.squareLight} onClick={() => onNavigate?.('metrics')}>
            <div style={styles.squareTopRow}>
              <AppIcon name="BarChart3" size={16} color="var(--bento-t3)" strokeWidth={2} />
              <span style={styles.squarePctLight}>{biblePctLabel}</span>
            </div>
            <div>
              <p style={styles.squareTitleLight}>{L('myMetrics')}</p>
              <p style={styles.squareSubLight}>{L('metricsSummaryLine', { hours: totalHM.h, weeks: weeksInGoal })}</p>
            </div>
          </button>
        </div>

        {/* Bloco 6.5 — atalho pra anotação de sermão flutuante (34d,
            handoff-app-completo). Abre a Bíblia (capítulo de hoje, ou o
            último lido) já com a folha aberta — ver openSermonNoteFromHome,
            App.jsx. */}
        <button style={styles.annotateCard} onClick={() => onOpenSermonNote?.()}>
          <span style={styles.annotateIcon}><AppIcon name="FileText" size={17} color="var(--bento-accent)" strokeWidth={2} /></span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={styles.annotateTitle}>{L('annotateSermonTitle')}</span>
            <span style={styles.annotateSub}>{L('annotateSermonSub')}</span>
          </span>
          <span style={styles.annotateChevron}>›</span>
        </button>

        {/* Bloco 7 — SUA SEMANA (resumo). Sempre visível — antes do 1º
            resumo gerado (cron de domingo à noite) mostra um aviso honesto
            em vez de fingir um resumo pronto; depois, mostra sempre (não
            só "não lido ainda") com o botão "Ler" sempre disponível. */}
        <div style={styles.recapCard}>
          <p style={styles.recapLabel}>{L('recapLabel')}</p>
          {latestSummary ? (
            <div style={styles.recapRow}>
              <p style={styles.recapText}>{L('recapReady', { period: recapPeriodLabel(latestSummary, lang) })}</p>
              <button style={styles.recapBtn} onClick={() => onOpenWeeklySummary?.(latestSummary.weekKey)}>{L('recapRead')}</button>
            </div>
          ) : (
            <p style={styles.recapPendingText}>{L('recapPending')}</p>
          )}
        </div>
      </div>

      <TimePerStepSheet
        open={timeSheetOpen}
        onClose={() => setTimeSheetOpen(false)}
        initialMinutes={initialStepMinutes}
        completedSet={completedSet}
        onSave={onSaveStepMinutes}
        lang={lang}
      />
    </div>
  )
}

// "25 a 31 de agosto" — mesmo formato de weekRangeLabel
// (recap/weeklySummaryMath.js), reimplementado igual aqui só pra não puxar
// o módulo inteiro do resumo semanal (que também carrega chaptersRangeLabel
// etc., sem uso nesta tela) por uma função só.
function recapPeriodLabel(summary, lang) {
  const [sy, sm, sd] = summary.startKey.split('-').map(Number)
  const [ey, em, ed] = summary.endKey.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'
  if (sy === ey && sm === em) {
    const month = end.toLocaleDateString(locale, { month: 'long' })
    return lang === 'en' ? `${sd}–${ed} ${month}` : `${sd} a ${ed} de ${month}`
  }
  const startLabel = start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const endLabel = end.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  return lang === 'en' ? `${startLabel} – ${endLabel}` : `${startLabel} a ${endLabel}`
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { background: 'var(--bento-bg)', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 20px 0' },
  body: { padding: '20px 20px calc(var(--nav-height) + 24px)', display: 'flex', flexDirection: 'column', gap: 12 },
  greeting: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: 0, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  date: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t2)', margin: '4px 0 0' },
  avatar: {
    width: 38, height: 38, flexShrink: 0, borderRadius: 13, border: 'none', padding: 0, background: 'var(--bento-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: '38px', color: 'var(--bento-ink)',
  },

  skeletonBlock: { borderRadius: 24, background: 'var(--bento-line)' },

  // Bloco 2.
  planCard: { borderRadius: 28, background: 'var(--bento-ink)', padding: 20 },
  planHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  planLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: 0 },
  planMin: { fontFamily: FONT, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.42)', border: 'none', background: 'none', padding: 0, cursor: 'pointer' },
  planTitle: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.12, letterSpacing: '-.8px', color: '#fff', margin: '0 0 8px' },
  continuityLine: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'rgba(255,255,255,.5)', margin: '0 0 16px' },

  // Grade de tiles (34a/34b/34c) — uma linha só quando cabem ≤3 passos
  // ativos (34a), 2×2 quando são 4 (34b/34c); nunca some um tile, o
  // "desligado hoje" vira "dia off" no lugar do número. Plano concluído
  // (2026-09-09): mesmo grid, cada tile já feito ganha o selinho
  // `tileCheck` no canto — nenhuma outra mudança de cor/estrutura.
  tilesRow: { display: 'flex', gap: 6, marginBottom: 16 },
  tilesGrid4: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  tile: { flex: 1, minWidth: 0, borderRadius: 14, background: 'rgba(255,255,255,.08)', padding: '11px 12px', boxSizing: 'border-box', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FONT },
  tileTop: { fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1.2, color: '#fff', margin: 0 },
  tileTopUnit: { fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)' },
  tileStepName: { fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.02em', color: 'rgba(255,255,255,.55)', margin: '2px 0 0' },
  tileDetail: { fontFamily: FONT, fontSize: 9.5, fontWeight: 500, lineHeight: 1.3, color: 'rgba(255,255,255,.4)', margin: '4px 0 0' },
  tileCheck: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  // Círculo pontilhado cinza = passo agendado pra hoje mas ainda não
  // concluído; vira o tileCheck (laranja) assim que é feito.
  tileCirclePending: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,.3)' },

  startBtn: { flex: 1, height: 48, borderRadius: 16, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT },
  startBtnText: { fontSize: 14.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' },
  startBtnArrow: { fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', lineHeight: 1 },
  onlyReadBtn: { height: 48, padding: '0 16px', borderRadius: 16, border: 'none', background: 'rgba(255,255,255,.08)', cursor: 'pointer', fontFamily: FONT },
  onlyReadBtnText: { fontSize: 12.5, fontWeight: 700, color: '#fff' },

  // Bloco 3.
  verseCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px' },
  verseHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  verseLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  verseIconBtn: { width: 28, height: 28, borderRadius: 10, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  verseTextBtn: { display: 'block', width: '100%', border: 'none', background: 'none', padding: 0, margin: 0, textAlign: 'left', cursor: 'pointer' },
  verseText: { fontFamily: FONT, fontStyle: 'italic', fontWeight: 500, fontSize: 16.5, lineHeight: 1.5, color: 'var(--bento-ink)', textWrap: 'pretty', margin: '0 0 8px' },
  verseRef: { fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: 'var(--bento-accent)', margin: 0 },

  // Bloco 4.
  applyCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 20px' },
  applyCardDark: { background: 'var(--bento-ink)' },
  applyHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  applyLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: 0 },
  applyLabelDark: { color: 'rgba(255,255,255,.42)' },
  applyChangeBtn: { border: 'none', background: 'none', padding: 0, fontFamily: FONT, fontSize: 10.5, fontWeight: 700, color: 'var(--bento-sand-ink-mid)', cursor: 'pointer' },
  applyText: { fontFamily: FONT, fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: 'var(--bento-sand-ink-strong)', margin: '0 0 14px' },
  applyTextDark: { color: '#fff' },
  applyPendingNote: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.5)', margin: 0 },
  applyFootRow: { display: 'flex', alignItems: 'center', gap: 10 },
  fulfillBtn: { height: 34, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--bento-sand-icon)', color: 'var(--bento-sand)', fontFamily: FONT, fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  fulfillBtnDone: { opacity: 0.6, cursor: 'default' },
  applyWeekCount: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-sand-ink)' },

  // Bloco 5.
  weekCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px' },
  weekHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  weekLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  weekCount: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t2)', margin: 0 },
  weekCountStrong: { fontWeight: 800, color: 'var(--bento-ink)' },
  weekGridRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  weekGrid: { display: 'flex', gap: 8, flexShrink: 0 },
  weekDayCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  weekDaySquare: { width: 30, height: 30, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' },
  weekDaySquare_: {
    done: { background: 'var(--bento-accent)' },
    today: { background: 'var(--bento-ink)' },
    other: { background: 'var(--bento-bg)' },
  },
  weekTodayDot: { width: 6, height: 6, borderRadius: 99, background: 'var(--bento-accent)' },
  weekDayLetter: { fontFamily: FONT, fontSize: 9.5, lineHeight: 1 },
  weekDayLetter_: {
    done: { fontWeight: 800, color: 'var(--bento-ink)' },
    today: { fontWeight: 800, color: 'var(--bento-ink)' },
    other: { fontWeight: 700, color: 'var(--bento-t2)' },
  },
  weekNote: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.35, color: 'var(--bento-t2)', margin: 0 },
  weekTimeRow: { display: 'flex', gap: 10, borderTop: '1px solid var(--bento-line)', marginTop: 14, paddingTop: 12 },
  weekTimeCol: { flex: 1, minWidth: 0 },
  weekTimeValue: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 2px' },
  weekTimeUnit: { fontSize: 10, fontWeight: 600, color: 'var(--bento-t2)' },
  weekTimeLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 600, color: 'var(--bento-t2)', margin: 0 },

  // Bloco 6.
  squaresRow: { display: 'flex', gap: 10 },
  squareDark: {
    flex: 1, minWidth: 0, minHeight: 132, borderRadius: 24, background: 'var(--bento-ink)', border: 'none', cursor: 'pointer',
    padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', fontFamily: FONT,
  },
  squareLight: {
    flex: 1, minWidth: 0, minHeight: 132, borderRadius: 24, background: 'var(--bento-card)', border: 'none', cursor: 'pointer',
    padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', fontFamily: FONT,
  },
  squareTopRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  squareBadge: { minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  squarePctLight: { fontFamily: FONT, fontSize: 11, fontWeight: 800, color: 'var(--bento-accent)' },
  squareTitleDark: { fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1.15, color: '#fff', margin: '0 0 4px' },
  squareSubDark: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  squareTitleLight: { fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1.15, color: 'var(--bento-ink)', margin: '0 0 4px' },
  squareSubLight: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t2)', margin: 0 },

  // Bloco 6.5.
  annotateCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'var(--bento-card)', borderRadius: 24, padding: '18px 20px', border: 'none', cursor: 'pointer', fontFamily: FONT },
  annotateIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  annotateTitle: { display: 'block', fontSize: 14.5, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 3 },
  annotateSub: { display: 'block', fontSize: 11.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },
  annotateChevron: { fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t5)', flexShrink: 0 },

  // Bloco 7.
  recapCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '14px 20px' },
  recapLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 6px' },
  recapRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  recapText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  recapBtn: { flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 13, border: 'none', background: 'var(--bento-sand-icon)', color: 'var(--bento-sand)', fontFamily: FONT, fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  recapPendingText: { fontFamily: FONT, fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },
}
