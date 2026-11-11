// HomeScreen.jsx — Hoje (rodada 34, handoff-hoje-34/HANDOFF-34a-hoje.md),
// rota `/`. Substitui TODAS as versões anteriores de Início — a 3c antiga
// (ação única) e o painel de métricas (HomeDashboard.jsx, apagado em
// 2026-09-07 quando a Home virou sempre 3c) já tinham saído; esta rodada
// troca a própria 3c pelo quadro novo. Ordem dos blocos, fixa (handoff:
// "ação → alimento → informação → o que espera", não reordenar): plano de
// hoje → versículo do dia → aplicação de ontem → esta semana (com tempo
// por passo) → dois quadrados (mensagens/métricas) → resumo da semana →
// barra de abas (fora deste arquivo, App.jsx). ÚNICA exceção (pedido dela,
// 2026-09-13, handoff-admin-42 42n: "aparece no Hoje... acima da leitura
// do plano"): o card do desafio de leitura por IA do grupo, quando ativo,
// vem ANTES até do plano de hoje — ver groupChallenge mais abaixo.
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
import { useEffect, useMemo, useState } from 'react'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { mondayOf } from '../routine/routineStreak'
import { getPinnedApplicationEntry, markPinnedApplicationFulfilled, getWeekApplicationStatus } from '../reflection/applicationPhraseStore'
import { getShowApplicationCard } from '../reflection/applicationCardVisibilityStore'
import { getGroupMessagesSummary } from '../groups/messagesStore'
import { getActiveGroupChallenge, getMyGroupChallengeProgress, markGroupChallengeDayDone } from '../groups/groupChallengesStore'
import { getHomeVerse } from '../home/homeVerseStore'
import { renderVerseShareImage, shareVerseImage } from '../home/verseShareImage'
import { saveHighlight } from '../highlights/highlightsStore'
import { DEFAULT_HIGHLIGHT_COLOR } from '../data/highlightColors'
import { dateKey, parseLocalDateKey } from '../utils/dateKey'
import { getStepDays } from '../routine/stepDaysStore'
import { getPrayerMethod } from '../prayer/prayerMethodStore'
import { getReflectionMethod } from '../reflection/reflectionMethodStore'
import { computeMeuPlano, resolveMinutes, tomorrowCard } from '../meuPlano/meuPlanoMath'
import { loadActiveStudy } from '../meuPlano/activeStudy'
import CartaoPlano from '../components/hoje/CartaoPlano'
import ProximaConquista from '../components/hoje/ProximaConquista'
import { pickClosest } from '../gamification/achievementsMath'
import CartaoBiblia from '../components/hoje/CartaoBiblia'
import QuadradosCaminhada from '../components/hoje/QuadradosCaminhada'
import { computeBibleProgress } from '../gamification/bibleProgressMath'
import { bookInfo } from '../data/gamificationBlocks'
import { loadGamificationStats } from '../gamification/evaluate'
import { recentSeals } from '../gamification/sealDetails'
import { bibleFinishedIso, buildPlanCard, nextAchievement } from '../hoje/hojeMath'


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
  session, authUser, completedSet, stepMinutes,
  onStartGuided, onNavigate, onOpenProfile,
  onOpenWeeklySummary, weeklySummaries, onOpenBiblePassage, onOpenSermonNote,
  applicationRefreshKey, onOpenSuaBiblia, onOpenEstante, onOpenFamilia, gamification,
}) {
  const {
    lang, userName, avatarInitials, todaySession,
    routineModules, plan, dailyRoutine, currentBlock, hasNoPlan,
    lastReadPosition, biblePercent, activeStudyId,
    chaptersRead, booksCompleted,
  } = session
  const L = (k, vars) => translate(`home.${k}`, vars, lang)
  const email = authUser?.email

  // ── Dados que só existem via I/O (rede/Supabase) — um flag de
  // carregando só (nunca um spinner de tela cheia, ver handoff: "Esqueleto
  // dos blocos... nunca spinner"), preenchido em paralelo. Cada busca trata
  // a própria falha (RPC ainda sem migration, rede fora) devolvendo um
  // default seguro — uma falha isolada nunca derruba a tela inteira.
  const [loading, setLoading] = useState(true)
  const [pinnedEntry, setPinnedEntry] = useState(null)
  const [weekAppStatus, setWeekAppStatus] = useState({ total: 0, fulfilled: 0 })
  const [messagesSummary, setMessagesSummary] = useState([])
  const [verse, setVerse] = useState(null)
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
  // Desafio de leitura por IA do grupo (handoff-admin-42, 42n: "aparece no
  // Hoje de quem entrar, acima da leitura do plano") — pedido dela
  // (2026-09-13), antes do Bloco 4. Sem gate de loading próprio, mesmo
  // padrão de stepDays/activeStudy acima: só aparece quando resolver, sem
  // travar o resto da tela. Se a pessoa está em mais de um grupo com
  // desafio ativo simultâneo, mostra só o primeiro encontrado —
  // simplificação disclosed (raro, ver comentário na PR).
  const [groupChallenge, setGroupChallenge] = useState(null)

  // Bug real (varredura geral, 2026-09-19): `.catch(() => {})` deixava
  // `stepDays` em `null` pra sempre se a busca falhasse de verdade (não só
  // "ainda carregando") e o cartão do plano mostrava descanso pra sessão
  // inteira, indistinguível de um dia sem nenhum passo agendado mesmo.
  // Hoje o erro tem estado próprio no cartão, com "Tentar novamente".
  const [stepDaysLoadError, setStepDaysLoadError] = useState(false)
  function loadStepDays() {
    setStepDaysLoadError(false)
    getStepDays().then(setStepDaysState).catch(err => { console.error('Failed to load step days', err); setStepDaysLoadError(true) })
  }
  useEffect(() => {
    loadStepDays()
    setPrayerMethodState(getPrayerMethod())
    setReflectionMethodState(getReflectionMethod())
  }, [])

  useEffect(() => {
    let alive = true
    const groups = session.myGroups ?? []
    if (groups.length === 0) { setGroupChallenge(null); return }
    Promise.all(groups.map(g => getActiveGroupChallenge(g.groupId).catch(() => null))).then(results => {
      if (!alive) return
      const active = results.find(Boolean)
      if (!active) { setGroupChallenge(null); return }
      // dayIndex 0-based: dia 0 = starts_at. Fora da janela (ainda não
      // começou, ou já passou do último dia) = não mostra nada — sem
      // "desafio encerrado" pendurado. parseLocalDateKey (não `new
      // Date(startsAt)` direto) — startsAt é uma "YYYY-MM-DD" e o
      // construtor puro lê isso como meia-noite UTC, virando o dia ~3h
      // antes da meia-noite local pra quem está em UTC-3 (bug real,
      // achado na varredura de 2026-09-19).
      const dayIndex = Math.floor((Date.now() - parseLocalDateKey(active.startsAt).getTime()) / 86400000)
      if (dayIndex < 0 || dayIndex >= active.totalDays) { setGroupChallenge(null); return }
      const day = active.days[dayIndex]
      getMyGroupChallengeProgress(active.id).then(completed => {
        if (!alive) return
        setGroupChallenge({ id: active.id, title: active.title, dayIndex, totalDays: active.totalDays, day, doneToday: completed.includes(dayIndex) })
      })
    })
    return () => { alive = false }
  }, [session.myGroups])

  async function handleMarkChallengeDone() {
    if (!groupChallenge || groupChallenge.doneToday) return
    setGroupChallenge(c => ({ ...c, doneToday: true }))
    try {
      await markGroupChallengeDayDone(groupChallenge.id, groupChallenge.dayIndex)
    } catch (err) {
      console.error('Failed to mark challenge day done', err)
      setGroupChallenge(c => (c ? { ...c, doneToday: false } : c))
    }
  }

  // Estudo ativo — a mesma carga do Meu Plano (título, dia atual).
  useEffect(() => {
    let alive = true
    loadActiveStudy(activeStudyId, lang).then(st => { if (alive) setActiveStudy(st) }).catch(() => {})
    return () => { alive = false }
  }, [activeStudyId, lang])

  // `applicationRefreshKey` (bug real, 2026-09-14, reportado por ela: "salvei
  // a aplicação do dia, mas não trocou") — Home fica montada o app inteiro
  // (display:'contents'/'none', nunca desmonta), então este efeito só
  // rodava de novo se book/capítulo/idioma mudassem. Trocar a frase fixada
  // em ApplicationPhrasesScreen.jsx ou confirmar o "trocar" em
  // ReflectionScreen.jsx não mexe em nenhuma dessas dependências — o
  // cartão ficava preso na frase de quando a Home montou pela primeira
  // vez na sessão, até um reload da página inteira. App.jsx incrementa
  // este contador nos dois lugares que podem mudar a frase fixada.
  useEffect(() => {
    let alive = true
    setLoading(true)
    const chapterForVerse = !todaySession.needsThemePick && todaySession.type !== 'reflection'
      ? { book: todaySession.book, chapter: todaySession.chStart }
      : null
    // getPinnedApplicationEntry/getWeekApplicationStatus
    // funcionam pra convidado também (guestTableStore.js/userDataStore.js
    // resolvem local vs. Supabase por dentro — ver comentário de cada um);
    // só getGroupMessagesSummary exige conta de verdade (chama RPC direto),
    // e ela mesma já trata a falha (console.error + []), então nem precisa
    // de guarda aqui — uma falha isolada não derruba o resto da tela.
    Promise.allSettled([
      getPinnedApplicationEntry(email),
      getWeekApplicationStatus(email),
      getGroupMessagesSummary(),
      chapterForVerse ? getHomeVerse({ ...chapterForVerse, lang }) : Promise.resolve(null),
    ]).then(([pinned, weekStatus, msgSummary, homeVerse]) => {
      if (!alive) return
      if (pinned.status === 'fulfilled') setPinnedEntry(pinned.value)
      if (weekStatus.status === 'fulfilled') setWeekAppStatus(weekStatus.value)
      if (msgSummary.status === 'fulfilled') setMessagesSummary(msgSummary.value)
      if (homeVerse.status === 'fulfilled') setVerse(homeVerse.value)
      setLoading(false)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, todaySession.book, todaySession.chStart, lang, applicationRefreshKey])

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

  const todayKeyStr = dateKey()
  const mondayKeyStr = dateKey(mondayOf(new Date()))

  // ── Bloco 2 — SEU PLANO DE HOJE (handoff-hoje-50 §4) ──
  // Os passos de hoje e o estado de cada um saem do MESMO computeMeuPlano
  // do Meu Plano (mesmos dias por passo, mesmos minutos, mesma entrada de
  // hoje) — o Hoje nunca discorda da aba Meu Plano sobre o que é hoje.
  // buildPlanCard só escolhe as palavras do cartão.
  const todayWeekdayIdx = weekdayIndexMonday(new Date())
  const planMinutes = useMemo(() => resolveMinutes(stepMinutes, plan), [stepMinutes, plan])
  const planDayEntry = dailyRoutine?.[todayKeyStr]
  const planState = useMemo(
    () => (stepDays ? computeMeuPlano({ routineModules, stepDays, minutes: planMinutes, dayEntry: planDayEntry, todayIdx: todayWeekdayIdx }) : null),
    [routineModules, stepDays, planMinutes, planDayEntry, todayWeekdayIdx],
  )
  const planCard = buildPlanCard({
    loadError: stepDaysLoadError, stepDays, routineModules, state: planState,
    ctx: {
      prayerMethod, reflectionMethod, study: activeStudy,
      readingPassage: !hasNoPlan && currentBlock?.book && currentBlock?.chapter ? `${currentBlock.book} ${currentBlock.chapter}` : '',
      readingDonePassage: lastReadPosition?.book && lastReadPosition?.chapter ? `${lastReadPosition.book} ${lastReadPosition.chapter}` : '',
    },
    nextWeekdayIdx: stepDays ? (tomorrowCard({ routineModules, stepDays, minutes: planMinutes, todayIdx: todayWeekdayIdx })?.weekdayIdx ?? null) : null,
  })
  // O botão do cartão: 'start' é a MESMA função do botão do Meu Plano
  // (abre o passo de agora e emenda os seguintes); as outras só navegam.
  function handlePlanAction(action) {
    if (action === 'start') onStartGuided?.()
    else if (action === 'plan') onNavigate?.('routine')
    else if (action === 'read') onNavigate?.(hasNoPlan ? 'adjustPlan' : 'journey')
    else if (action === 'adjust') onNavigate?.('adjustPlan')
    else if (action === 'retry') loadStepDays()
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

  // ── Bloco 6 — dois quadrados ──
  const unreadMessagesTotal = messagesSummary.reduce((sum, g) => sum + (g.unreadCount || 0), 0)
  const messageGroupNames = messagesSummary.filter(g => g.unreadCount > 0).map(g => g.groupName)
  function joinNames(names) {
    if (names.length <= 1) return names[0] ?? ''
    const sep = lang === 'en' ? ' and ' : ' e '
    return `${names.slice(0, -1).join(', ')}${sep}${names[names.length - 1]}`
  }
  const biblePctLabel = biblePercent.toLocaleString(lang === 'en' ? 'en' : 'pt-BR', { maximumFractionDigits: 1 }) + '%'

  // ── Bloco 7 — SUA SEMANA (resumo) ──
  const latestSummary = (weeklySummaries ?? [])[0]


  // ── Bloco 1 — SUA CAMINHADA (handoff-hoje-50 §3) ──
  // A roda: só completedSet (síncrono, 1.189 consultas num Set) — nada de rede,
  // nada que atrase a primeira pintura. Memo: recalcula só quando o
  // progresso muda. Marcador = livro da sessão de hoje, se for um livro
  // da Bíblia (sem plano de leitura ativo, sem marcador).
  const bibleProgress = useMemo(() => computeBibleProgress(completedSet), [completedSet])
  const bibleReads = useMemo(() => {
    const out = {}
    for (const nome in bibleProgress.porLivro) out[nome] = bibleProgress.porLivro[nome].lidos
    return out
  }, [bibleProgress])
  const currentBibleBook = todaySession?.type !== 'reflection' && todaySession?.book && bookInfo(todaySession.book) ? todaySession.book : null
  // Semanas, selos e a data de término vêm de UMA carga das fontes da
  // gamificação (a mesma de Minhas conquistas), que não segura o resto da
  // tela: enquanto não chega, só os números e complementos que dependem
  // dela ficam em esqueleto. Uma falha cai no mesmo default seguro de
  // antes (sem histórico de meta, sem datas).
  const [gami, setGami] = useState(null)
  useEffect(() => {
    let alive = true
    loadGamificationStats({ completedSet, dailyRoutine, weeklyGoalDays: session.weeklyGoalDays })
      .then(d => { if (alive) setGami(d) })
      .catch(err => {
        console.error('[hoje] gamificação', err)
        if (alive) setGami({ row: { goalHistory: [], bookSeals: {} }, firstActivityIso: null, stats: { chapterRows: [] }, states: null })
      })
    return () => { alive = false }
  }, [completedSet, dailyRoutine, session.weeklyGoalDays])
  const firstActivityKey = gami?.firstActivityIso ? dateKey(new Date(gami.firstActivityIso)) : null
  // Selos: a linha que o App mantém (atualizada logo depois de cada
  // avaliação) quando existe; senão a que veio na carga acima.
  const bookSeals = gamification?.bookSeals ?? gami?.row.bookSeals ?? null
  const sealNames = useMemo(() => (bookSeals ? recentSeals(bibleProgress.completos, bookSeals) : null), [bibleProgress, bookSeals])
  // Bloco 3 — PRÓXIMA CONQUISTA: "a mais perto", a mesma função de
  // Minhas conquistas, sobre a mesma carga. Null = tudo conquistado (ou a
  // carga falhou): o cartão não aparece.
  const nextConquista = useMemo(() => (gami?.states ? nextAchievement(pickClosest(gami.states.families)) : null), [gami])
  const bibleFinishedAt = useMemo(
    () => (bibleProgress.bibliaInteira && gami ? bibleFinishedIso(gami.stats.chapterRows) : null),
    [bibleProgress.bibliaInteira, gami],
  )

  // Esqueleto dos blocos que ainda dependem da busca principal (versículo,
  // aplicação, mensagens) — nunca spinner de tela cheia, e a caminhada não
  // espera por eles.
  const pendingBlocks = (
    <>
      <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 130 }} />
      <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 110 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 132, flex: 1 }} />
        <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 132, flex: 1 }} />
      </div>
      <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 90 }} />
    </>
  )

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
        {/* Bloco 1 — SUA CAMINHADA (handoff-hoje-50 §3): o cartão da Bíblia
            e os três quadrados Semanas · Dias · Selos. */}
        <CartaoBiblia
          progress={bibleProgress} reads={bibleReads} currentBook={currentBibleBook}
          finishedIso={bibleFinishedAt} onOpen={onOpenSuaBiblia}
        />
        <QuadradosCaminhada
          dailyRoutine={dailyRoutine} goalHistory={gami ? gami.row.goalHistory : null}
          weeklyGoalDays={session.weeklyGoalDays} weeklyDays={session.weeklyDays} firstActivityKey={firstActivityKey}
          livrosCompletos={bibleProgress.livrosCompletos} totalLivros={bibleProgress.totalLivros} sealNames={sealNames}
          onOpenMetrics={() => onNavigate?.('metrics')} onOpenEstante={onOpenEstante}
        />

        {/* Bloco 2 — SEU PLANO DE HOJE (handoff-hoje-50 §4). Pinta assim que
            os dias do plano chegam, sem esperar o resto da tela. */}
        <CartaoPlano card={planCard} onOpenPlan={() => onNavigate?.('routine')} onAction={handlePlanAction} />

        {/* Bloco 3 — PRÓXIMA CONQUISTA (handoff-hoje-50 §5). Chega logo
            depois do plano, com esqueleto enquanto a carga não vem. */}
        {!gami
          ? <div className="rb-context-skeleton" style={{ ...styles.skeletonBlock, height: 84 }} />
          : nextConquista && <ProximaConquista next={nextConquista} onOpen={onOpenFamilia} />}

        {loading ? pendingBlocks : (<>
        {/* Desafio de leitura por IA do grupo (handoff-admin-42, 42n) —
            pedido dela (2026-09-13): fica ACIMA do plano de hoje, exceção
            deliberada à ordem fixa desta tela (comentário do topo do
            arquivo, "não reordenar") — o próprio HANDOFF pede essa posição
            especificamente pra este card. Só aparece com um desafio
            ativo E dentro da janela de dias (ver useEffect acima). */}
        {groupChallenge && (
          <div style={styles.challengeCard}>
            <p style={styles.challengeKicker}>{L('challengeKicker', { title: groupChallenge.title })}</p>
            <p style={styles.challengeRef}>
              {(lang === 'en' ? (groupChallenge.day.bookEn ?? groupChallenge.day.book) : groupChallenge.day.book)}
              {' '}{groupChallenge.day.chStart === groupChallenge.day.chEnd ? groupChallenge.day.chStart : `${groupChallenge.day.chStart}-${groupChallenge.day.chEnd}`}
            </p>
            <p style={styles.challengeDayTitle}>{groupChallenge.day.dayTitle}</p>
            {groupChallenge.day.reflectionQuestion && <p style={styles.challengeQuestion}>{groupChallenge.day.reflectionQuestion}</p>}
            <div style={styles.challengeBtnRow}>
              <button
                type="button" style={styles.challengeReadBtn}
                onClick={() => onOpenBiblePassage?.(groupChallenge.day.book, groupChallenge.day.chStart)}
              >
                {L('challengeReadBtn')}
              </button>
              <button
                type="button" style={{ ...styles.challengeDoneBtn, ...(groupChallenge.doneToday ? styles.challengeDoneBtnOn : {}) }}
                onClick={handleMarkChallengeDone} disabled={groupChallenge.doneToday}
              >
                {groupChallenge.doneToday ? L('challengeDoneLabel') : L('challengeMarkDoneBtn')}
              </button>
            </div>
          </div>
        )}

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

        {/* Bloco 6 — dois quadrados. Pedido dela (2026-09-12): "Anotar uma
            pregação" virou quadrado pra ficar do lado do de mensagens —
            Métricas saiu daqui, agora é o card cheio logo abaixo, com mais
            destaque. "Mensagens novas" com badge/nomes só quando há de
            verdade algo não lido (nunca um "0" fingido). */}
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
          <button style={styles.squareLight} onClick={() => onOpenSermonNote?.()}>
            <div style={styles.squareTopRow}>
              <AppIcon name="FileText" size={16} color="var(--bento-accent)" strokeWidth={2} />
            </div>
            <div>
              <p style={styles.squareTitleLight}>{L('annotateSermonTitle')}</p>
              <p style={styles.squareSubLight}>{L('annotateSermonSub')}</p>
            </div>
          </button>
        </div>

        {/* Bloco 6.5 — Minhas métricas, esticado pra largura da tela
            (pedido dela, 2026-09-12: "mais visibilidade") — três números
            de cara (% da Bíblia, capítulos lidos, livros completos) em vez
            do quadrado pequeno de antes. Toque continua levando pra
            MetricsScreen (detalhe completo: tempo com Deus, sessão média,
            horário mais comum etc.). */}
        <button style={styles.metricsCard} onClick={() => onNavigate?.('metrics')}>
          <div style={styles.metricsCardHead}>
            <span style={styles.metricsCardIcon}><AppIcon name="BarChart3" size={15} color="var(--bento-accent)" strokeWidth={2} /></span>
            <p style={styles.metricsCardLabel}>{L('myMetrics')}</p>
            <span style={styles.metricsCardChevron}>›</span>
          </div>
          <div style={styles.metricsStatsRow}>
            <div style={styles.metricsStatItem}>
              <p style={styles.metricsStatValue}>{biblePctLabel}</p>
              <p style={styles.metricsStatLabel}>{L('metricsStatBible')}</p>
            </div>
            <div style={styles.metricsStatDivider} />
            <div style={styles.metricsStatItem}>
              <p style={styles.metricsStatValue}>{chaptersRead}</p>
              <p style={styles.metricsStatLabel}>{L('metricsStatChapters')}</p>
            </div>
            <div style={styles.metricsStatDivider} />
            <div style={styles.metricsStatItem}>
              <p style={styles.metricsStatValue}>{booksCompleted}</p>
              <p style={styles.metricsStatLabel}>{L('metricsStatBooks')}</p>
            </div>
          </div>
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
        </>)}
      </div>
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
  body: { padding: '14px 20px calc(var(--nav-height) + 24px)', display: 'flex', flexDirection: 'column', gap: 10 },
  greeting: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: 0, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  date: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t2)', margin: '4px 0 0' },
  avatar: {
    width: 38, height: 38, flexShrink: 0, borderRadius: 13, border: 'none', padding: 0, background: 'var(--bento-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: '38px', color: 'var(--bento-ink)',
  },

  skeletonBlock: { borderRadius: 24, background: 'var(--bento-line)' },

  // Bloco 2.
  // Desafio de leitura por IA do grupo (handoff-admin-42, 42n) — laranja
  // sólido com texto escuro (regra do app inteiro pra ação/destaque em
  // cima do acento, ver index.css: "ação primária é laranja sólido com
  // texto ESCURO, não branco"), pra se diferenciar do plano de hoje logo
  // abaixo (que é preto) e sinalizar "isto é novo/especial".
  challengeCard: { borderRadius: 28, background: 'var(--bento-accent)', padding: 20 },
  challengeKicker: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(26,23,20,.6)', margin: '0 0 10px' },
  challengeRef: { fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 2px' },
  challengeDayTitle: { fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 8px' },
  challengeQuestion: { fontFamily: FONT, fontSize: 13, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'rgba(26,23,20,.7)', margin: '0 0 14px' },
  challengeBtnRow: { display: 'flex', gap: 8 },
  challengeReadBtn: { flex: 1, height: 44, border: 'none', borderRadius: 14, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  challengeDoneBtn: { flex: 1, height: 44, border: 'none', borderRadius: 14, background: 'rgba(26,23,20,.12)', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  challengeDoneBtnOn: { background: 'rgba(26,23,20,.2)', cursor: 'default' },
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
  squareTitleDark: { fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1.15, color: '#fff', margin: '0 0 4px' },
  squareSubDark: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  squareTitleLight: { fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1.15, color: 'var(--bento-ink)', margin: '0 0 4px' },
  squareSubLight: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t2)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  // Bloco 6.5 — Minhas métricas, esticado (pedido dela, 2026-09-12).
  metricsCard: {
    display: 'flex', flexDirection: 'column', gap: 16, width: '100%',
    background: 'var(--bento-card)', borderRadius: 24, border: 'none', cursor: 'pointer',
    padding: '16px 20px 18px', textAlign: 'left', fontFamily: FONT,
  },
  metricsCardHead: { display: 'flex', alignItems: 'center', gap: 10 },
  metricsCardIcon: { width: 28, height: 28, flexShrink: 0, borderRadius: 10, background: 'var(--bento-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  metricsCardLabel: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', margin: 0 },
  metricsCardChevron: { fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t5)', flexShrink: 0 },
  metricsStatsRow: { display: 'flex', alignItems: 'stretch' },
  metricsStatItem: { flex: 1, minWidth: 0, textAlign: 'center' },
  metricsStatValue: { fontSize: 20, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 3px', fontVariantNumeric: 'tabular-nums' },
  metricsStatLabel: { fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t3)', margin: 0 },
  metricsStatDivider: { width: 1, alignSelf: 'stretch', background: 'var(--bento-line)' },

  // Bloco 7.
  recapCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '14px 20px' },
  recapLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 6px' },
  recapRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  recapText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  recapBtn: { flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 13, border: 'none', background: 'var(--bento-sand-icon)', color: 'var(--bento-sand)', fontFamily: FONT, fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  recapPendingText: { fontFamily: FONT, fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },
}
