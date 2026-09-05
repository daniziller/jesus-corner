// HomeScreen.jsx — Início (redesign 1a, reskin Bento — tela 3c)
//
// A Home é uma tela de UMA decisão: continuar a leitura de hoje. Em ordem:
// saudação+avatar → cartão da ação principal (o único --bento-ink da tela,
// com o passo atual do dia) → Sequência/Bíblia (dois números grandes) →
// Esta semana (grade de dias) → Versículo do dia. Métricas completas (anel
// de %, AT/NT, níveis, conquistas, metas, feed de amigos) ficam em
// Progresso — ver design_handoff_jesus_corner/README.md.
//
// Fora do escopo deste reskin: o botão redondo de "modo mãos-livres" que
// existia ao lado do CTA saiu — o mockup 3c não o mostra no cartão de ação
// (só o botão "Continuar leitura →"); o atalho continua acessível pela aba
// Bíblia e pelo card "Modo mãos-livres" em Meu Plano.

import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import PremiumLockCard from '../components/PremiumLockCard'
import { getTodayUpliftingVerse } from '../utils/upliftingVerse'
import { computeCurrentWeekDays, WEEKDAY_LETTERS } from '../routine/weekRings'
import { isDayGoalMet, DEFAULT_ROUTINE_MODULES } from '../routine/routineStreak'
import { getSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes } from '../reflection/reflectionDurationStore'

// Passos que o "cartão da ação" resume (Estudo fica de fora, igual ao fluxo
// guiado — ver GUIDED_STEPS em App.jsx).
const CARD_STEPS = ['prayer', 'reading', 'reflection']

function cap(s) { return s[0].toUpperCase() + s.slice(1) }

// "Terça, 2 de setembro" / "Tuesday, September 2" — dia de semana curto,
// primeira letra maiúscula.
export function formatToday(lang) {
  const raw = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const s = lang === 'en' ? raw : raw.replace('-feira', '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Saudação por horário: manhã / tarde / noite — puramente local ao
// aparelho, sem depender de fuso salvo em lugar nenhum.
export function greetingFor(lang, name) {
  const h = new Date().getHours()
  const key = h < 12 ? 'greetingMorning' : h < 18 ? 'greetingAfternoon' : 'greetingEvening'
  return translate(`home.${key}`, { name }, lang)
}

export default function HomeScreen({ session, authUser, onContinueSession, onNavigate, onStartGuided, onOpenProfile }) {
  const {
    lang, hasPremium, userName, avatarInitials, todaySession, weeksInGoal,
    biblePercent, chaptersRead, totalChapters,
    dailyRoutine, todayRoutine, routineModules, plan, activePlan,
    weeklyGoalDays, weekGoalDaysMet,
  } = session
  const L = (k, vars) => translate(`home.${k}`, vars, lang)

  const verse = getTodayUpliftingVerse(lang)
  const dateLabel = formatToday(lang)
  const greeting = greetingFor(lang, userName)

  // ── Cartão da ação principal ──
  // O passo "de agora" é o primeiro passo ligado ainda não feito hoje (cai
  // em 'reading' quando tudo já foi feito — a Leitura é a âncora da Home).
  const enabledSteps = CARD_STEPS.filter(s => (routineModules ?? DEFAULT_ROUTINE_MODULES).includes(s))
  const stepDone = {
    prayer: !!todayRoutine.prayer,
    reading: !!todayRoutine.reading,
    reflection: !!todayRoutine.reflection,
  }
  const currentStepKey = enabledSteps.find(s => !stepDone[s]) ?? 'reading'
  const currentIndex = Math.max(0, enabledSteps.indexOf(currentStepKey))
  const isReadingStep = currentStepKey === 'reading'

  const prayerMin = getSavedPrayerMinutes() ?? plan.prayerMinutes ?? 0
  const reflectionMin = getSavedReflectionMinutes() ?? plan.reflectionMinutes ?? 0
  const readingMin = activePlan.readingMinutes ?? plan.readingMinutes ?? 0
  const stepMinMap = { prayer: prayerMin, reading: readingMin, reflection: reflectionMin }
  const currentMin = stepMinMap[currentStepKey]

  const stepLabel = translate('routine.nowStepOf', { i: currentIndex + 1, total: enabledSteps.length }, lang)

  const started = todaySession.progress > 0
  const cardTitle = todaySession.needsThemePick
    ? todaySession.title
    : isReadingStep ? todaySession.title : translate(`home.routine${cap(currentStepKey)}`, undefined, lang)
  const startLabel = todaySession.needsThemePick
    ? translate('themePlan.chooseTodayCta', undefined, lang)
    : isReadingStep
      ? L(started ? 'continueReading' : 'beginReading')
      : translate(`routine.start_${currentStepKey}`, undefined, lang)

  function handleStart() {
    if (todaySession.needsThemePick) { onNavigate?.('routine'); return }
    if (hasPremium && onStartGuided) onStartGuided()
    else onContinueSession?.()
  }

  // ── Esta semana (constância semanal, etapa 4) ──
  // O dia conta pra meta quando a LEITURA foi concluída — Oração e
  // Reflexão somam qualidade, não obrigação (ver isDayGoalMet). Um dia
  // perdido não zera nada: é sempre "X de 7 dias esta semana", nunca uma
  // sequência que quebra.
  const weekDays = computeCurrentWeekDays(dailyRoutine ?? {})
  const letters = WEEKDAY_LETTERS[lang] ?? WEEKDAY_LETTERS.pt
  const daysMet = weekGoalDaysMet ?? 0
  const goalDays = weeklyGoalDays ?? 5

  const pctLabel = biblePercent.toLocaleString(lang === 'en' ? 'en' : 'pt-BR', { maximumFractionDigits: 1 }) + '%'
  const chaptersLabel = translate('home.chaptersOfShort', {
    done: chaptersRead.toLocaleString(lang === 'en' ? 'en' : 'pt-BR'),
    total: totalChapters.toLocaleString(lang === 'en' ? 'en' : 'pt-BR'),
  }, lang)

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <div>
          <p style={styles.greeting}>{greeting}</p>
          <p style={styles.date}>{dateLabel}</p>
        </div>
        {/* O avatar abre a folha do Perfil (19a) por cima da Home, sem
            navegar de aba — ver ProfileSheet.jsx/profileOpen em App.jsx. */}
        <button style={styles.avatar} onClick={() => onOpenProfile?.()} aria-label={translate('nav.profile', undefined, lang)}>
          {avatarInitials}
        </button>
      </div>

      <div style={styles.body}>

      {/* Cartão da ação principal — único fundo --bento-ink da tela. */}
      <div style={styles.actionCard}>
        <div style={styles.actionHead}>
          <p style={styles.actionLabel}>{stepLabel}</p>
          {!todaySession.needsThemePick && !!currentMin && (
            <span style={styles.actionMin}>{translate('routine.minShort', { n: currentMin }, lang)}</span>
          )}
        </div>
        <p style={styles.actionTitle}>{cardTitle}</p>
        <button style={styles.startBtn} onClick={handleStart}>
          <span style={styles.startBtnText}>{startLabel}</span>
          <span style={styles.startBtnArrow}>→</span>
        </button>
      </div>

      {/* Sequência / Bíblia — dois números grandes (mesma fonte de dado do
          card de constância e da barra de % em Progresso). Tocar em qualquer
          um abre "Sua caminhada" (5b) — o quadro 5b diz que ela "entra por
          Sua caminhada no Início", e estes dois cartões são o resumo dela. */}
      <div style={styles.statsRow}>
        <button style={styles.statCard} onClick={() => onNavigate?.('stats')}>
          <p style={styles.statLabel}>{L('sequenceLabel')}</p>
          <p style={{ ...styles.statNumber, color: 'var(--bento-ink)' }}>{weeksInGoal}</p>
          <p style={{ ...styles.statSub, color: 'var(--bento-t3)' }}>{translate('progress.weeksInGoal', undefined, lang)}</p>
        </button>
        <button style={{ ...styles.statCard, background: 'var(--bento-sand)' }} onClick={() => onNavigate?.('stats')}>
          <p style={{ ...styles.statLabel, color: 'var(--bento-sand-label)' }}>{translate('nav.journey', undefined, lang)}</p>
          <p style={{ ...styles.statNumber, color: 'var(--bento-sand-icon)' }}>{pctLabel}</p>
          <p style={{ ...styles.statSub, color: 'var(--bento-sand-label)' }}>{chaptersLabel}</p>
        </button>
      </div>

      {/* Esta semana */}
      <div style={styles.weekCard}>
        <div style={styles.weekHead}>
          <p style={styles.weekLabel}>{translate('routine.weekSectionLabel', undefined, lang)}</p>
          <p style={styles.weekCount}>
            <span style={styles.weekCountStrong}>
              {translate(daysMet === 1 ? 'routine.weekCompletedOfOne' : 'routine.weekCompletedOfMany', { n: daysMet }, lang)}
            </span>{' '}
            {translate('routine.weekCompletedOfSuffix', { total: goalDays }, lang)}
          </p>
        </div>
        <div style={styles.weekGrid}>
          {weekDays.map((d, i) => {
            const done = !d.isFuture && isDayGoalMet(d)
            const state = done ? 'done' : d.isToday ? 'today' : 'other'
            return (
              <div key={d.key} style={styles.weekDayCol}>
                <span style={{ ...styles.weekDaySquare, ...styles.weekDaySquare_[state] }}>
                  {state === 'done' && <AppIcon name="Check" size={15} color="var(--bento-ink)" strokeWidth={2.8} />}
                </span>
                <span style={{ ...styles.weekDayLetter, ...styles.weekDayLetter_[state] }}>{letters[i]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Versículo do dia. */}
      <div style={styles.verseCard}>
        <p style={styles.verseLabel}>{L('verseOfDay')}</p>
        <p style={styles.verseText}>"{verse.text}"</p>
        <p style={styles.verseRef}>{verse.ref}</p>
      </div>

      {!hasPremium && (
        <div style={{ marginTop: 20 }}>
          <PremiumLockCard lang={lang} onNavigate={onNavigate} variant="premium" />
        </div>
      )}
      </div>
    </div>
  )
}

const styles = {
  // Medidas do quadro 3c: cabeçalho com padding 22px 20px 0; conteúdo
  // 20px abaixo dele, blocos empilhados com gap 12.
  screen: {
    background: 'var(--bento-bg)',
    height: '100%',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    display: 'flex',
    flexDirection: 'column',
  },
  header: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 20px 0' },
  body: { padding: '20px 20px calc(var(--nav-height) + 24px)', display: 'flex', flexDirection: 'column', gap: 12 },
  greeting: { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: 0 },
  date: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: '4px 0 0' },
  avatar: {
    width: 36, height: 36, flexShrink: 0, borderRadius: 14, border: 'none', padding: 0, background: 'var(--bento-ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, lineHeight: '36px', color: 'var(--bento-bg)',
  },

  actionCard: { borderRadius: 28, background: 'var(--bento-ink)', padding: 24, color: '#fff' },
  actionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 18px' },
  actionLabel: {
    fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, lineHeight: 1, letterSpacing: '.12em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0,
  },
  actionMin: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,.5)' },
  actionTitle: {
    fontFamily: 'var(--font-bento)', fontSize: 32, fontWeight: 800, letterSpacing: '-1.2px',
    lineHeight: 1.05, margin: '0 0 20px',
  },
  startBtn: {
    width: '100%', height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: 'pointer', fontFamily: 'var(--font-bento)',
  },
  startBtnText: { fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' },
  startBtnArrow: { fontSize: 15, fontWeight: 700, color: 'var(--bento-ink)', lineHeight: 1 },

  statsRow: { display: 'flex', gap: 12 },
  statCard: { flex: 1, minWidth: 0, borderRadius: 24, border: 'none', background: 'var(--bento-card)', padding: 20, textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  statLabel: {
    fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, lineHeight: 1, letterSpacing: '.12em',
    textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 14px',
  },
  statNumber: { fontFamily: 'var(--font-bento)', fontSize: 34, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.4px', margin: '0 0 4px' },
  statSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, margin: 0 },

  weekCard: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  weekHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 16px' },
  weekLabel: {
    fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, lineHeight: 1, letterSpacing: '.12em',
    textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0,
  },
  weekCount: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t3)', margin: 0 },
  weekCountStrong: { fontWeight: 800, color: 'var(--bento-ink)' },
  weekGrid: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  weekDayCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  weekDaySquare: { width: 34, height: 34, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' },
  weekDaySquare_: {
    done: { background: 'var(--bento-accent)' },
    today: { border: '2px dashed var(--bento-accent)' },
    other: { background: 'var(--bento-line)' },
  },
  weekDayLetter: { fontFamily: 'var(--font-bento)', fontSize: 10, lineHeight: 1 },
  weekDayLetter_: {
    done: { fontWeight: 800, color: 'var(--bento-ink)' },
    today: { fontWeight: 800, color: 'var(--bento-accent)' },
    other: { fontWeight: 600, color: 'var(--bento-t5)' },
  },

  verseCard: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  verseLabel: {
    fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, lineHeight: 1, letterSpacing: '.12em',
    textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px',
  },
  verseText: {
    fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 600, lineHeight: 1.55,
    color: 'var(--bento-ink)', textWrap: 'pretty', margin: '0 0 8px',
  },
  verseRef: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-accent)', margin: 0 },
}
