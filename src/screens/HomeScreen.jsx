// HomeScreen.jsx — Hoje (handoff-hoje-50, H1), rota `/`. Quatro blocos,
// nesta ordem e nada entre eles:
//   1. Sua caminhada — o cartão da Bíblia (a roda em 132px) e os três
//      quadrados Semanas · Dias · Selos;
//   2. Seu plano de hoje — os passos de hoje com círculos e o único botão
//      laranja da tela (o mesmo "abrir o passo de agora e emendar os
//      seguintes" do Meu Plano);
//   3. Próxima conquista — "a mais perto" de Minhas conquistas;
//   4. Para hoje — resumo da semana (só não lido), versículo do dia,
//      aplicação de ontem com "Cumpri", anotar uma pregação (e o desafio
//      de leitura do grupo, quando há um ativo).
// As mensagens novas viraram o número na aba Comunidade (BottomNav.jsx).
//
// Nada aqui é calculado de novo: percentual, semanas, cápsulas, selos,
// passos de hoje e "a mais perto" vêm das funções da gamificação
// (src/gamification) e do Meu Plano (src/meuPlano); src/hoje/hojeMath.js
// só dá as palavras de cada bloco. A tela pinta em camadas: a roda e o
// cartão do plano primeiro; semanas, selos, conquista e as linhas que
// dependem de busca chegam logo depois, com esqueleto — nunca um spinner
// de tela cheia.
import { useEffect, useMemo, useState } from 'react'
import { t as translate } from '../i18n'
import { getPinnedApplicationEntry, markPinnedApplicationFulfilled } from '../reflection/applicationPhraseStore'
import { getShowApplicationCard } from '../reflection/applicationCardVisibilityStore'
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
import ParaHoje from '../components/hoje/ParaHoje'
import FolhaVersiculo from '../components/hoje/FolhaVersiculo'
import { pickClosest } from '../gamification/achievementsMath'
import CartaoBiblia from '../components/hoje/CartaoBiblia'
import QuadradosCaminhada from '../components/hoje/QuadradosCaminhada'
import { computeBibleProgress } from '../gamification/bibleProgressMath'
import { bookInfo } from '../data/gamificationBlocks'
import { loadGamificationStats } from '../gamification/evaluate'
import { recentSeals } from '../gamification/sealDetails'
import { bibleFinishedIso, buildPlanCard, nextAchievement, paraHojeRows } from '../hoje/hojeMath'


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
    lastReadPosition, activeStudyId,
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
  const [verse, setVerse] = useState(null)
  const [verseSaved, setVerseSaved] = useState(false)
  const [sharingVerse, setSharingVerse] = useState(false)
  const [verseOpen, setVerseOpen] = useState(false)

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
    // getPinnedApplicationEntry funciona pra convidado também
    // (userDataStore.js resolve local vs. Supabase por dentro); uma falha
    // isolada não derruba a outra busca nem o resto da tela.
    Promise.allSettled([
      getPinnedApplicationEntry(email),
      chapterForVerse ? getHomeVerse({ ...chapterForVerse, lang }) : Promise.resolve(null),
    ]).then(([pinned, homeVerse]) => {
      if (!alive) return
      if (pinned.status === 'fulfilled') setPinnedEntry(pinned.value)
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

  // ── Bloco 4 — PARA HOJE (handoff-hoje-50 §6) ──
  // A frase escrita na Reflexão de HOJE só vira "aplicação de ontem"
  // amanhã; e a preferência de mostrar/esconder (Perfil → ProfileSheet,
  // por dispositivo, applicationCardVisibilityStore.js) continua valendo.
  const wroteApplicationToday = pinnedEntry?.key === `application:${todayKeyStr}`

  // "Cumpri": exatamente o que o botão do cartão antigo fazia — a mesma
  // chamada, o mesmo dado gravado. Marca sem navegar.
  async function handleFulfillApplication() {
    if (!pinnedEntry?.key || pinnedEntry.fulfilled) return
    setPinnedEntry(prev => prev ? { ...prev, fulfilled: true } : prev)
    try {
      await markPinnedApplicationFulfilled(email, pinnedEntry)
    } catch (err) {
      console.error('Failed to mark application phrase as fulfilled', err)
    }
  }

  const latestSummary = (weeklySummaries ?? [])[0]
  const challengeDay = groupChallenge?.day
  const paraHoje = paraHojeRows({
    challenge: groupChallenge ? {
      title: groupChallenge.title, dayTitle: challengeDay.dayTitle, done: groupChallenge.doneToday,
      ref: `${lang === 'en' ? (challengeDay.bookEn ?? challengeDay.book) : challengeDay.book} ${challengeDay.chStart === challengeDay.chEnd ? challengeDay.chStart : `${challengeDay.chStart}-${challengeDay.chEnd}`}`,
    } : null,
    summary: latestSummary ? { seen: !!latestSummary.seen, period: recapPeriodLabel(latestSummary, lang) } : null,
    verse: verseData, verseLoading: loading,
    application: pinnedEntry ? { text: pinnedEntry.text, fulfilled: !!pinnedEntry.fulfilled, writtenToday: wroteApplicationToday, visible: getShowApplicationCard() } : null,
  })
  function handleParaHojeOpen(key) {
    if (key === 'challenge') onOpenBiblePassage?.(challengeDay.book, challengeDay.chStart)
    else if (key === 'summary') onOpenWeeklySummary?.(latestSummary.weekKey)
    else if (key === 'verse') { if (verseData.text) setVerseOpen(true) }
    else if (key === 'application') onNavigate?.('applicationPhrases')
    else if (key === 'sermon') onOpenSermonNote?.()
  }
  function handleParaHojeAction(key) {
    if (key === 'challenge') handleMarkChallengeDone()
    else if (key === 'application') handleFulfillApplication()
  }

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

        {/* Bloco 4 — PARA HOJE (handoff-hoje-50 §6). */}
        <ParaHoje rows={paraHoje} onOpen={handleParaHojeOpen} onAction={handleParaHojeAction} />
      </div>

      {verseOpen && verseData.text && (
        <FolhaVersiculo
          verse={verseData} saved={verseSaved} sharing={sharingVerse}
          onSave={handleSaveVerse} onShare={handleShareVerse}
          onOpenText={() => { setVerseOpen(false); handleOpenVerseText() }}
          onClose={() => setVerseOpen(false)}
        />
      )}
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
}
