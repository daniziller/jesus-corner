// HomeScreen.jsx
// Tela inicial com % da Bíblia em destaque, sessão do dia e stats

import { useState, useEffect } from 'react'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ActivityFeedItem from '../components/ActivityFeedItem'
import RoutineCalendar, { LegendDot } from '../components/RoutineCalendar'
import RoutineDayRing from '../components/RoutineDayRing'
import { getFriendsActivity } from '../activity/activityStore'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'
import { getSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { getPinnedApplicationPhrase } from '../reflection/applicationPhraseStore'
import { getShowApplicationCard } from '../reflection/applicationCardVisibilityStore'
import { shareProgressCard } from '../share/shareProgressCard'
import { computeWeeklyRoutineStats, averageFullRoutineDays, isDayComplete, computeReadingWeekStreak, DEFAULT_ROUTINE_MODULES } from '../routine/routineStreak'
import { computeCurrentWeekDays, WEEKDAY_LETTERS } from '../routine/weekRings'
import { getTodayUpliftingVerse } from '../utils/upliftingVerse'

export default function HomeScreen({ session, authUser, onContinueSession, onNavigate, onMarkRoutineStep }) {
  const {
    userName, biblePercent, atPercent, ntPercent,
    streak, todaySession, chaptersRead,
    level, nextLevel, levelPercent, xpForNext, xp, lang,
    dailyRoutine, todayRoutine, plan, activePlan, achievements, goals, routineModules, activeStudyId,
  } = session

  // Cartão de progresso pra compartilhar em rede social (ver
  // src/share/shareProgressCard.js) — 'idle' | 'generating' | 'error'.
  const [shareState, setShareState] = useState('idle')
  async function handleShareCard() {
    setShareState('generating')
    try {
      await shareProgressCard({ biblePercent, atPercent, ntPercent, streak, readingWeekStreak, achievements, lang, dailyRoutine, routineModules })
      setShareState('idle')
    } catch (err) {
      // AbortError = a pessoa fechou a folha de compartilhamento nativa sem
      // escolher nada — cancelamento normal, não é erro pra mostrar.
      if (err?.name === 'AbortError') { setShareState('idle'); return }
      console.error('Failed to share progress card', err)
      setShareState('error')
    }
  }

  const [friendActivity, setFriendActivity] = useState([])
  useEffect(() => {
    getFriendsActivity(3).then(setFriendActivity).catch(err => console.error('Failed to load friend activity', err))
  }, [])

  // Card da frase de aplicação (ver ReflectionScreen.jsx/
  // applicationPhraseStore.js) — só busca se a pessoa não desligou o card
  // em Perfil (getShowApplicationCard, preferência por dispositivo). Some
  // sozinho se ainda não existe nenhuma frase fixada.
  const [applicationPhrase, setApplicationPhrase] = useState('')
  useEffect(() => {
    if (!authUser?.email || !getShowApplicationCard()) { setApplicationPhrase(''); return }
    getPinnedApplicationPhrase(authUser.email)
      .then(setApplicationPhrase)
      .catch(err => console.error('Failed to load pinned application phrase', err))
  }, [authUser?.email])

  // Calcula o offset do anel SVG (circunferência = 2π×43 ≈ 270.18)
  const CIRCUMFERENCE = 270.18
  const offset = CIRCUMFERENCE - (biblePercent / 100) * CIRCUMFERENCE

  // Constância — mesma métrica de RoutineScreen.jsx (média de dias/semana
  // com a rotina completa nas últimas 4 semanas), agora também na Home.
  const weeklyStats = computeWeeklyRoutineStats(dailyRoutine ?? {}, routineModules, 4)
  const consistencyValue = averageFullRoutineDays(weeklyStats).toFixed(1).replace(/\.0$/, '')

  // Semanas seguidas com pelo menos 1 dia de leitura — métrica separada do
  // streak diário (que é sobre a rotina inteira), pedida especificamente
  // pra aparecer junto no card e na imagem de compartilhar.
  const readingWeekStreak = computeReadingWeekStreak(dailyRoutine ?? {})

  // Semana atual (segunda a domingo) pros anéis de constância no card de %
  // — mesma função usada na imagem compartilhável, pra nunca divergir.
  const weekDays = computeCurrentWeekDays(dailyRoutine ?? {})

  const ctaLabel = todaySession.needsThemePick
    ? translate('themePlan.chooseTodayCta', undefined, lang)
    : todaySession.progress === 100 ? translate('home.reviewSession', undefined, lang)
    : todaySession.progress > 0   ? translate('home.continueSession', undefined, lang)
    : translate('home.startSession', undefined, lang)

  // Versículo do dia, em rodízio (ver src/utils/upliftingVerse.js) — no
  // lugar do slogan fixo, no topo da Home. Mesmo versículo o dia inteiro,
  // sempre na versão licenciada de cada idioma (NVT/NLT).
  const todayVerse = getTodayUpliftingVerse(lang)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83 }}>

      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.heroOrbOrange} />
        <div style={styles.heroOrbPink} />
        <div style={styles.heroContent}>

          {/* Saudação + versículo do dia (rodízio, ver todayVerse acima) —
              antes era o slogan fixo do app; agora sempre um trecho da
              Bíblia (NVT/NLT), pra abrir a Home com algo que anima. */}
          <div>
            <p style={styles.greeting}>{translate('home.greeting', { name: userName }, lang)}</p>
            <h2 style={styles.sessionTitle}>“{todayVerse.text}”</h2>
            <p style={styles.heroVerseRef}>{todayVerse.ref}</p>
          </div>

        </div>
      </div>

      {/* ── Corpo (sheet flutuante sobre o hero) ── */}
      <div style={styles.body}>

        <div className="dashboard-grid">

          {/* Coluna primária — ordem pedida explicitamente:
              1) card de métrica  2) frase de aplicação  3) seu plano
              (tracker da rotina)  4) leitura do dia.
              No mobile empilha nessa ordem; os cards de nível/meta
              ("desafios") ficam na coluna secundária, sempre por último. */}
          <div className="dashboard-col">

            {/* 1. Card de métrica — % da Bíblia (anel) + rotina da semana,
                no mesmo wrapper sem gap (parece um card só que muda de cor
                na metade). */}
            <div style={styles.pctHeroWrap}>
            <div className="home-pct-hero" style={styles.pctHero}>
              <div style={styles.pctHeroGlow} />

              {/* Anel (com % só UMA vez, dentro dele) + texto "Bíblia lida"
                  embaixo, os retângulos de stat (streak/constância/semanas)
                  sempre ao lado dele (nunca quebra pra baixo — texto do
                  rótulo abaixo do anel ganhou largura máxima só pra isso,
                  ver pctLabelWrap), e o botão de compartilhar como último
                  item da própria linha (antes ficava sobreposto por cima
                  dos retângulos, position:absolute — ver
                  src/share/shareProgressCard.js pro que ele gera). */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <div style={styles.ringWrap}>
                    <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="7" />
                      <circle cx="50" cy="50" r="43" fill="none" stroke="white" strokeWidth="7"
                        strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} strokeLinecap="round" />
                    </svg>
                    <div style={styles.ringText}>
                      <span style={styles.ringValue}>
                        <span style={styles.ringNum}>{biblePercent}</span>
                        <span style={styles.ringPct}>%</span>
                      </span>
                    </div>
                  </div>
                  <div style={styles.pctLabelWrap}>
                    <p style={styles.pctLabel}>{translate('home.bibleReadLabel', undefined, lang)}</p>
                    <p style={styles.pctSub}>{translate('home.chaptersRead', { n: chaptersRead }, lang)}</p>
                  </div>
                </div>

                {/* Streak + constância — a mesma métrica de constância que só
                    existia na aba Rotina, agora também aqui. */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={styles.pctStatChip}>
                    <span style={styles.pctStatValue}><AppIcon name="Flame" size={13} /> {streak}</span>
                    <span style={styles.pctStatLabel}>{translate('home.streakLabel', undefined, lang)}</span>
                  </div>
                  <div style={styles.pctStatChip}>
                    <span style={styles.pctStatValue}><AppIcon name="Repeat" size={13} /> {consistencyValue}</span>
                    <span style={styles.pctStatLabel}>{translate('home.shareCardConsistencyLabel', undefined, lang)}</span>
                  </div>
                  <div style={styles.pctStatChip}>
                    <span style={styles.pctStatValue}><AppIcon name="Calendar" size={13} /> {readingWeekStreak}</span>
                    <span style={styles.pctStatLabel}>{translate('home.readingWeekStreakLabel', undefined, lang)}</span>
                  </div>
                </div>

                {/* Compartilhar em rede social — gera uma imagem própria
                    (não é print da tela), ver src/share/shareProgressCard.js. */}
                <button
                  onClick={handleShareCard}
                  disabled={shareState === 'generating'}
                  aria-label={translate('home.shareCardBtn', undefined, lang)}
                  title={translate('home.shareCardBtn', undefined, lang)}
                  style={styles.shareCardBtn}
                >
                  <AppIcon name={shareState === 'generating' ? 'RefreshCw' : 'Share2'} size={15} color="white" className={shareState === 'generating' ? 'icon-spin' : undefined} />
                </button>
              </div>

              {/* Barras AT/NT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <BarRow label={lang === 'en' ? 'OT' : 'AT'} pct={atPercent}  color="var(--white)" />
                <BarRow label="NT" pct={ntPercent}  color="var(--white)" />
              </div>
            </div>

            {/* Rotina da semana (segunda a domingo) — mesma lógica de
                cores do calendário de histórico (RoutineCalendar.jsx):
                círculo com gradiente dourado→marrom só quando os 3 passos
                do dia foram concluídos, 3 pontinhos coloridos por
                ROUTINE_STEP_COLORS embaixo. Cores pensadas pra fundo claro
                — por isso mora numa seção clara própria, não dentro do
                card com gradiente escuro (onde --or e preto quase somem). */}
            <div style={styles.weekRoutineCard}>
              <p style={styles.weekRoutineTitle}>{translate('home.weekRingsTitle', undefined, lang)}</p>
              <WeekRoutineRow days={weekDays} lang={lang} modules={routineModules} />
              <div style={styles.calendarLegendRow}>
                {routineModules.includes('prayer') && <LegendDot color={ROUTINE_STEP_COLORS.prayer} label={translate('home.routinePrayer', undefined, lang)} />}
                {routineModules.includes('reading') && <LegendDot color={ROUTINE_STEP_COLORS.reading} label={translate('home.routineReading', undefined, lang)} />}
                {routineModules.includes('study') && <LegendDot color={ROUTINE_STEP_COLORS.study} label={translate('home.routineStudy', undefined, lang)} />}
                {routineModules.includes('reflection') && <LegendDot color={ROUTINE_STEP_COLORS.reflection} label={translate('home.routineReflection', undefined, lang)} />}
              </div>
            </div>
            </div>
            {shareState === 'error' && (
              <p style={styles.shareCardErrorText}>{translate('home.shareCardError', undefined, lang)}</p>
            )}

            {/* 2. Frase de aplicação — só existe depois da 1a frase salva
                na Reflexão, e só se a pessoa não desligou o card em Perfil. */}
            {applicationPhrase && (
              <button style={styles.applicationCard} onClick={() => onNavigate?.('reflection')}>
                <span style={styles.applicationIcon}><AppIcon name="Sparkles" size={16} color="#A21CAF" /></span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={styles.applicationLabel}>{translate('home.applicationCardLabel', undefined, lang)}</span>
                  <span style={styles.applicationText}>{applicationPhrase}</span>
                </span>
              </button>
            )}

            {/* 3. Seu plano — tracker dos 4 passos diários, clicável, com
                calendário de histórico embutido. */}
            <DailyRoutineCard
              dailyRoutine={dailyRoutine}
              todayRoutine={todayRoutine}
              plan={plan}
              activePlan={activePlan}
              routineModules={routineModules}
              activeStudyId={activeStudyId}
              lang={lang}
              onNavigate={onNavigate}
              onContinueSession={onContinueSession}
              onMarkRoutineStep={onMarkRoutineStep}
            />

            {/* 4. Leitura do dia */}
            <div>
              <div className="section-header">
                <h3 className="section-title">
                  {todaySession.needsThemePick
                    ? translate('home.chooseReadingHeader', undefined, lang)
                    : translate('home.todayReadingHeader', undefined, lang)}
                </h3>
              </div>
              <div style={styles.todayCard}>
                <div style={styles.todayAccent} />
                <div style={styles.todayBadge}>
                  <span style={styles.todayDot} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--or)' }}>{todaySession.block}</span>
                </div>
                <h3 style={styles.todayTitle}>{todaySession.title}</h3>
                <p style={styles.todaySub}>{todaySession.subtitle}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--g5)' }}>{translate('home.todayProgress', undefined, lang)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--or)' }}>{todaySession.progress}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${todaySession.progress}%` }} />
                </div>
                <button style={styles.continueBtn} onClick={onContinueSession}>
                  {ctaLabel}
                </button>
              </div>
            </div>
          </div>

          {/* Coluna secundária — os "desafios" (nível/XP e meta mais
              próxima) sempre por último, mais a atividade dos amigos. No
              mobile empilha logo depois da coluna primária. */}
          <div className="dashboard-col">

            {/* 5. Nível e XP */}
            <LevelCard level={level} nextLevel={nextLevel} percent={levelPercent} xpForNext={xpForNext} xp={xp} lang={lang} />

            {/* 6. Meta mais próxima de bater (ver src/routine/goals.js) — não
                confundir com "Desafios" de leitura em grupo (Comunidade). A
                lista completa mora na aba Progresso. */}
            <GoalTeaserCard goals={goals} lang={lang} onNavigate={onNavigate} />

            {/* Atividade dos amigos (versão compacta — a completa mora na aba Comunidade) */}
            {friendActivity.length > 0 && (
              <div>
                <div className="section-header">
                  <h3 className="section-title">{translate('activity.homeTitle', undefined, lang)}</h3>
                  <span className="section-link" onClick={() => onNavigate?.('groups')}>{translate('activity.seeAll', undefined, lang)}</span>
                </div>
                <div style={styles.activityCard}>
                  {friendActivity.map((a, i) => (
                    <div key={a.id} style={{ paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0, borderTop: i > 0 ? '0.5px solid var(--g1)' : 'none' }}>
                      <ActivityFeedItem activity={a} lang={lang} />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  )
}

function LevelCard({ level, nextLevel, percent, xpForNext, xp, lang }) {
  return (
    <div style={styles.levelCard}>
      <div style={styles.levelEmoji}><AppIcon name={level.icon} size={24} color="var(--or)" /></div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={styles.levelTitle}>{lang === 'en' ? 'Level' : 'Nível'} {level.level} · {level.title}</span>
          <span style={{ ...styles.levelXp, fontFamily: 'var(--font-display)' }}>{xp} XP</span>
        </div>
        <div style={styles.levelBar}>
          <div style={{ ...styles.levelBarFill, width: `${percent}%` }} />
        </div>
        <p style={styles.levelSub}>
          {nextLevel
            ? <>{translate('home.xpToNext', { n: xpForNext, title: nextLevel.title }, lang)} <AppIcon name={nextLevel.icon} size={11} style={{ verticalAlign: 'middle' }} /></>
            : translate('home.maxLevel', undefined, lang)}
        </p>
      </div>
    </div>
  )
}

// Metas são por liberação (ver ProgressScreen.jsx) — mostra a PRÓXIMA da
// fila, não a de maior %. `goals` já vem na ordem certa (mesma ordem de
// GOALS em routine/goals.js), então a primeira ainda não concluída já é
// a próxima. Quando tudo já foi concluído, some (sem "parabéns, tudo
// feito" fixo ocupando espaço na Home).
function GoalTeaserCard({ goals, lang, onNavigate }) {
  const goal = (goals ?? []).find(g => !g.completed)
  if (!goal) return null

  return (
    <button style={styles.goalTeaserCard} onClick={() => onNavigate?.('stats')}>
      <span style={styles.goalTeaserIcon}><AppIcon name={goal.icon} size={18} color="var(--or)" /></span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <span style={styles.goalTeaserTitle}>{goal.title}</span>
          <span style={styles.goalTeaserLink}>{translate('goals.viewAllLink', undefined, lang)}</span>
        </div>
        <div style={styles.goalTeaserBar}>
          <div style={{ ...styles.goalTeaserBarFill, width: `${goal.percent}%` }} />
        </div>
        <p style={styles.goalTeaserProgress}>{translate('goals.daysProgress', { current: goal.current, target: goal.target }, lang)}</p>
      </div>
    </button>
  )
}

/* ── "Sua rotina com Deus" — passos diários clicáveis + calendário de
   histórico. A linha inteira de Oração/Leitura/Estudo navega pra onde o
   passo é feito de verdade; todos (menos Reflexão) também têm um
   ícone-checkbox próprio (clique separado, com stopPropagation, sem
   navegar) pra quem já fez fora do app e só quer marcar. Reflexão não tem
   uma tela própria, então o toggle acontece direto no card, na linha
   inteira. ── */
function DailyRoutineCard({ dailyRoutine, todayRoutine, plan, activePlan, routineModules, activeStudyId, lang, onNavigate, onContinueSession, onMarkRoutineStep }) {
  const [showCalendar, setShowCalendar] = useState(false)

  // Quais passos aparecem é decidido por routineModules (toggles
  // independentes em "Meu Plano" — ver routineModulesStore.js), não mais
  // fixo por plano. Oração/Reflexão mostram a duração escolhida na aba
  // Rotina (jc_prayer_minutes/jc_reflection_minutes), não o padrão do
  // plano — ela fica valendo até a pessoa trocar de novo, mesmo padrão que
  // PrayerScreen/ReflectionScreen já seguem.
  const prayerMinutes = getSavedPrayerMinutes() ?? plan.prayerMinutes
  const reflectionMinutes = getSavedReflectionMinutes() ?? plan.reflectionMinutes
  const allSteps = [
    {
      key: 'prayer', icon: 'HandHeart', color: ROUTINE_STEP_COLORS.prayer,
      title: translate('home.routinePrayer', undefined, lang),
      sub: translate('home.routinePrayerSub', { min: prayerMinutes }, lang),
      done: !!todayRoutine.prayer,
      onClick: () => onNavigate?.('prayer'),
      onToggleCheck: () => onMarkRoutineStep?.('prayer', !todayRoutine.prayer),
    },
    {
      key: 'reading', icon: 'BookOpen', color: ROUTINE_STEP_COLORS.reading,
      title: translate('home.routineReading', undefined, lang),
      sub: activePlan.needsThemePick
        ? translate('themePlan.chooseTodayCta', undefined, lang)
        : activePlan.readingMinutes == null
          ? translate('home.routineReadingSubFree', undefined, lang)
          : translate('home.routineReadingSub', { min: activePlan.readingMinutes }, lang),
      done: !!todayRoutine.reading,
      onClick: () => onContinueSession?.(),
      onToggleCheck: () => onMarkRoutineStep?.('reading', !todayRoutine.reading),
    },
    {
      key: 'study', icon: 'GraduationCap', color: ROUTINE_STEP_COLORS.study,
      title: translate('home.routineStudy', undefined, lang),
      sub: activeStudyId ? translate('home.routineStudySub', undefined, lang) : translate('home.routineStudyNoneSub', undefined, lang),
      done: !!todayRoutine.study,
      onClick: () => onNavigate?.('studies'),
      onToggleCheck: () => onMarkRoutineStep?.('study', !todayRoutine.study),
    },
    {
      key: 'reflection', icon: 'PenLine', color: ROUTINE_STEP_COLORS.reflection,
      title: translate('home.routineReflection', undefined, lang),
      sub: translate('home.routineReflectionSub', { min: reflectionMinutes }, lang),
      done: !!todayRoutine.reflection,
      onClick: () => onNavigate?.('reflection'),
      onToggleCheck: () => onMarkRoutineStep?.('reflection', !todayRoutine.reflection),
    },
  ]
  const steps = allSteps.filter(s => routineModules.includes(s.key))
  const doneCount = steps.filter(s => s.done).length
  // O primeiro passo ainda não feito ganha destaque — é "pra onde seguir"
  // depois de terminar o anterior.
  const nextIndex = steps.findIndex(s => !s.done)

  return (
    <div style={styles.routineCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <p style={styles.routineTitle}>{translate('home.routineTitle', undefined, lang)}</p>
          <p style={styles.routineSub}>{translate('home.routineStepsCount', { done: doneCount, total: steps.length }, lang)}</p>
        </div>
        <button style={styles.routineCalendarToggle} onClick={() => setShowCalendar(v => !v)}>
          <AppIcon name="Calendar" size={13} />
          {translate(showCalendar ? 'home.routineHideCalendar' : 'home.routineViewCalendar', undefined, lang)}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => {
          const isNext = i === nextIndex
          return (
            <button
              key={step.key}
              style={{
                ...styles.routineStepRow,
                ...(step.done ? styles.routineStepRowDone : {}),
                ...(isNext ? { borderColor: step.color } : {}),
              }}
              onClick={step.onClick}
            >
              {step.onToggleCheck ? (
                <span
                  role="button"
                  aria-label={translate('home.routineMarkDone', undefined, lang)}
                  style={{ ...styles.routineStepIcon, background: step.done ? step.color : 'var(--g1)', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); step.onToggleCheck() }}
                >
                  {step.done
                    ? <AppIcon name="Check" size={16} color="white" />
                    : <AppIcon name={step.icon} size={16} color="var(--g4)" />}
                </span>
              ) : (
                <div style={{ ...styles.routineStepIcon, background: step.done ? step.color : 'var(--g1)' }}>
                  {step.done
                    ? <AppIcon name="Check" size={16} color="white" />
                    : <AppIcon name={step.icon} size={16} color="var(--g4)" />}
                </div>
              )}
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={styles.routineStepTitle}>{step.title}</p>
                <p style={styles.routineStepSub}>{step.done ? translate('home.routineDoneTag', undefined, lang) : step.sub}</p>
              </div>
              <AppIcon name="ChevronRight" size={15} color="var(--g4)" />
            </button>
          )
        })}
      </div>

      {doneCount === steps.length && (
        <p style={styles.routineAllDone}>{translate('home.routineAllDoneMsg', undefined, lang)}</p>
      )}

      <button style={styles.routineAdjustBtn} onClick={() => onNavigate?.('routine')}>
        <AppIcon name="ClipboardList" size={13} />
        {translate('home.routineAdjustTimes', undefined, lang)}
        <AppIcon name="ChevronRight" size={13} />
      </button>

      {showCalendar && (
        <RoutineCalendar
          dailyRoutine={dailyRoutine}
          lang={lang}
          modules={routineModules}
          wrapStyle={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--g1)' }}
        />
      )}
    </div>
  )
}

// Anéis da semana (segunda a domingo) — 3 anéis concêntricos por dia
// (oração·leitura·reflexão, de fora pra dentro, na ordem em que a pessoa
// faz cada um), mesmo espírito do resumo semanal do Apple Health/Fitness.
// Dia atual ganha destaque; dias futuros da semana ficam só com a trilha
// vazia (mesmo tratamento visual de "não feito" — não dá pra já ter
// acontecido, então nunca aparecem preenchidos).
// Fileira segunda-domingo — mesmo desenho de cada dia do RoutineCalendar
// (anel dividido em fatias iguais por passo LIGADO, cada fatia na cor do
// passo quando feito naquele dia — ver RoutineDayRing.jsx), só trocando o
// número do dia do mês pela letra do dia da semana.
function WeekRoutineRow({ days, lang, modules }) {
  const letters = WEEKDAY_LETTERS[lang] ?? WEEKDAY_LETTERS.pt
  return (
    <div style={styles.weekRoutineGrid}>
      {days.map((day, i) => {
        // Ligar/desligar um passo em "Meu Plano" só vale a partir de hoje
        // — dias passados continuam com o anel de ANTES da mudança
        // (DEFAULT_ROUTINE_MODULES), sem "inventar" retroativamente uma
        // fatia vazia pra um passo que nem existia na rotina daquele dia.
        const dayModules = (day.isToday || day.isFuture) ? modules : DEFAULT_ROUTINE_MODULES
        const complete = !day.isFuture && isDayComplete(day, dayModules)
        return (
          <div key={day.key} style={styles.calendarDayCell}>
            <div style={styles.calendarDayRingWrap}>
              <RoutineDayRing modules={dayModules} done={day.isFuture ? {} : day} size={32} strokeWidth={3} />
              <span style={{
                ...styles.calendarDayNum,
                ...(complete ? styles.calendarDayNumComplete : {}),
                ...(day.isToday && !complete ? styles.weekRoutineTodayNum : {}),
              }}>
                {letters[i]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BarRow({ label, pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 700, width: 26, flexShrink: 0, color }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.25)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, borderRadius: 99, width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, width: 28, textAlign: 'right', color }}>{pct}%</span>
    </div>
  )
}

const styles = {
  routineCard:        { background: 'white', border: '0.5px solid var(--gold-soft)', borderRadius: 18, boxShadow: 'var(--shadow-premium)', padding: 14 },
  routineTitle:       { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--bk)', letterSpacing: '-0.1px' },
  routineSub:         { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', marginTop: 1 },
  routineCalendarToggle: { display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'var(--g1)', borderRadius: 20, padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--g6)', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 },
  routineStepRow:     { display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: '1.5px solid var(--g1)', background: 'var(--g1)', borderRadius: 14, padding: 10, cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' },
  routineStepRowDone: { background: 'white', borderColor: 'var(--g1)' },
  routineStepIcon:    { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  routineStepTitle:   { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  routineStepSub:     { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', marginTop: 1 },
  routineAllDone:     { fontSize: 12.5, fontWeight: 700, color: 'var(--or)', textAlign: 'center', marginTop: 10 },
  routineAdjustBtn:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', background: 'none', padding: '10px 0 2px', marginTop: 4, fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
  applicationCard:  { display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', border: '0.5px dashed rgba(192,38,211,.4)', borderRadius: 18, padding: 13, cursor: 'pointer', fontFamily: 'var(--font)' },
  applicationIcon:  { width: 32, height: 32, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  applicationLabel: { display: 'block', fontSize: 9, fontWeight: 700, color: '#A21CAF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  applicationText:  { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--bk)', lineHeight: 1.35 },
  hero:          { minHeight: 150, background: 'var(--bk-hero)', position: 'relative', overflow: 'hidden', flexShrink: 0 },
  heroOrbOrange: { position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(70px)', opacity: 0.55, top: -80, right: -60 },
  heroOrbPink:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(70px)', opacity: 0.35, bottom: -70, left: -50 },
  heroContent:   { position: 'relative', zIndex: 2, padding: '18px 20px 30px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' },
  greeting:      { fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.68)', marginBottom: 3 },
  sessionTitle:  { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, fontStyle: 'italic', color: 'white', lineHeight: 1.3, letterSpacing: '-0.2px' },
  heroVerseRef:  { fontSize: 11, fontWeight: 700, color: 'var(--or)', letterSpacing: 0.4, marginTop: 6 },
  body:          { flex: 1, background: 'var(--white)', borderRadius: '26px 26px 0 0', marginTop: -22, position: 'relative', zIndex: 3, boxShadow: '0 -12px 30px rgba(0,0,0,.05)', padding: '20px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  pctHeroWrap:   {},
  pctHero:       { background: 'var(--grad-vivid)', borderRadius: '22px 22px 0 0', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-glow)' },
  // Coluna (valor em cima, rótulo embaixo) em vez de linha com
  // justify-content:space-between — numa coluna estreita (2 colunas no
  // tablet/desktop, ver .dashboard-grid em index.css) não sobra largura
  // pro rótulo ("day streak"/"days/week") ao lado do valor sem cortar.
  pctStatChip:   { background: 'rgba(255,255,255,.16)', borderRadius: 12, padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 1 },
  pctStatValue:  { display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'white', lineHeight: 1 },
  pctStatLabel:  { fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.9)' },
  pctHeroGlow:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.18)', filter: 'blur(50px)', top: -70, right: -40 },
  // Rotina da semana — sheet clara logo abaixo do card de %, sem gap (a
  // sombra "puxa pra cima" o mesmo jeito que .body faz com o hero escuro
  // no topo da tela), pra ler como um card só mudando de cor na metade.
  weekRoutineCard:   { background: 'var(--card-bg)', borderRadius: '0 0 22px 22px', padding: '16px 18px 14px', boxShadow: '0 10px 24px rgba(0,0,0,.06)' },
  weekRoutineTitle:  { fontSize: 10, fontWeight: 700, color: 'var(--g5)', letterSpacing: 0.8, textTransform: 'uppercase', margin: '0 0 10px' },
  weekRoutineGrid:   { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' },
  weekRoutineTodayNum: { background: 'var(--olt)', color: 'var(--or)', fontWeight: 800 },
  calendarDayCell:   { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0' },
  calendarDayRingWrap: { position: 'relative', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  calendarDayNum:    { position: 'relative', fontSize: 11, fontWeight: 700, color: 'var(--g5)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  calendarDayNumComplete: { background: 'linear-gradient(135deg, var(--gold), var(--or))', color: 'white' },
  calendarLegendRow: { display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--g1)', flexWrap: 'wrap' },
  shareCardBtn:  { flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  shareCardErrorText: { fontSize: 11.5, fontWeight: 600, color: 'var(--re)', textAlign: 'center', margin: '-4px 0 0' },
  ringWrap:      { position: 'relative', width: 100, height: 100, flexShrink: 0 },
  ringText:      { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ringValue:     { display: 'flex', alignItems: 'baseline', gap: 1 },
  ringNum:       { fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, color: 'white', lineHeight: 1, letterSpacing: '-0.8px' },
  ringPct:       { fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 700, color: 'white', lineHeight: 1 },
  // Largura máxima = a do próprio anel — sem isso, "338 capítulos lidos"
  // não quebra linha e força essa coluna bem mais larga que o anel,
  // empurrando os retângulos de stat pra baixo dele em telas estreitas.
  pctLabelWrap:  { width: 100, textAlign: 'center' },
  pctLabel:      { fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.88)', letterSpacing: 1.2, textTransform: 'uppercase' },
  pctSub:        { fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.82)' },
  todayCard:     { position: 'relative', background: 'var(--white)', border: '0.5px solid var(--gold-soft)', borderRadius: 20, padding: '16px 16px 16px 21px', overflow: 'hidden', boxShadow: 'var(--shadow-premium)' },
  todayAccent:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: 'linear-gradient(180deg, var(--gold), var(--or))' },
  todayBadge:    { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(157,67,0,.12)', border: '0.5px solid rgba(157,67,0,.25)', borderRadius: 20, padding: '3px 9px', marginBottom: 10 },
  todayDot:      { width: 5, height: 5, borderRadius: '50%', background: 'var(--or)', animation: 'pulse 2s infinite' },
  todayTitle:    { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--bk)', marginBottom: 4, lineHeight: 1.3, letterSpacing: '-0.2px' },
  todaySub:      { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', marginBottom: 12 },
  progressBar:   { height: 3, background: 'var(--g2)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 },
  progressFill:  { height: '100%', background: 'var(--grad-premium)', borderRadius: 99, transition: 'width 0.6s ease' },
  continueBtn:   { width: '100%', background: 'var(--grad-primary)', border: 'none', borderRadius: 14, padding: 13, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-premium)' },
  activityCard:  { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 13, boxShadow: 'var(--shadow-card)' },
  levelCard:     { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 13, display: 'flex', gap: 12, alignItems: 'center', boxShadow: 'var(--shadow-card)' },
  levelEmoji:    { fontSize: 26, flexShrink: 0 },
  levelTitle:    { fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  levelXp:       { fontSize: 10.5, fontWeight: 700, color: 'var(--or)' },
  levelBar:      { height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden' },
  levelBarFill:  { height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, transition: 'width 0.6s ease' },
  levelSub:      { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', marginTop: 5 },

  goalTeaserCard:     { display: 'flex', gap: 11, alignItems: 'center', width: '100%', background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 18, padding: 12, boxShadow: 'var(--shadow-card)', cursor: 'pointer', fontFamily: 'var(--font)' },
  goalTeaserIcon:     { width: 34, height: 34, borderRadius: 10, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  goalTeaserTitle:    { fontSize: 12, fontWeight: 700, color: 'var(--bk)' },
  goalTeaserLink:     { fontSize: 10, fontWeight: 700, color: 'var(--or)', flexShrink: 0 },
  goalTeaserBar:      { height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden' },
  goalTeaserBarFill:  { height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, transition: 'width 0.6s ease' },
  goalTeaserProgress: { fontSize: 10, fontWeight: 600, color: 'var(--g5)', marginTop: 4 },
}
