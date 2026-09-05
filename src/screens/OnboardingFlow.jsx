// OnboardingFlow.jsx — o onboarding de 7 telas até o primeiro versículo
// (quadros 15a → 15b → uma demonstração 14x → 15f → 15c → 15d → 15e).
//
// Cinco perguntas, cada uma com "Pular" no mesmo lugar e a linha "Por que eu
// pergunto"; uma demonstração escolhida pela dor marcada no 15b; e o
// resultado (15e), que repete as respostas e abre Gênesis 1. Nada aqui pede
// conta: as respostas viram plano/meta/rotina na linha local de convidado
// quando a pessoa toca "Ler Gênesis 1 agora" (ver App.startGuestReading e
// src/onboarding/onboardingAnswers.js). Substitui a pergunta única antiga
// (5c/GuestPaceScreen).
import { useState } from 'react'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import AppIcon from '../icons/AppIcon'
import OnboardingDemo from './OnboardingDemo'
import {
  PAINS, REMINDERS, WEEK_DAYS, demoFor, planIdFor, estimateCompletion, formatClock,
  STEP_MINUTES_DEFAULT, STEP_MINUTES_STEP, STEP_MINUTES_MIN, STEP_MINUTES_MAX,
} from '../onboarding/onboardingAnswers'

const FONT = 'var(--font-bento)'
const STEPS = ['history', 'pains', 'demo', 'minutes', 'reminder', 'days', 'result']
const TOTAL_QUESTIONS = 5

export default function OnboardingFlow({ onFinish, onBack }) {
  const lang = getAppLanguage() ?? 'pt'
  const L = (k, vars) => t(`onb.${k}`, vars, lang)
  const [stepIdx, setStepIdx] = useState(0)
  const [history, setHistory] = useState(null)
  const [pains, setPains] = useState([])
  // 15f — três controles independentes (Oração/Leitura/Reflexão), 5 em 5
  // min. Leitura nunca zera (é a única que define o plano); Oração e
  // Reflexão podem, e zerar equivale a desligar aquele passo.
  const [prayerMinutes, setPrayerMinutes] = useState(STEP_MINUTES_DEFAULT.prayer)
  const [readingMinutes, setReadingMinutes] = useState(STEP_MINUTES_DEFAULT.reading)
  const [reflectionMinutes, setReflectionMinutes] = useState(STEP_MINUTES_DEFAULT.reflection)
  const [reminder, setReminder] = useState('morning') // 'morning' | 'midday' | 'night' | null
  const [days, setDays] = useState(5)
  const [starting, setStarting] = useState(false)

  const step = STEPS[stepIdx]
  const next = () => setStepIdx(i => Math.min(i + 1, STEPS.length - 1))
  const back = () => (stepIdx === 0 ? onBack() : setStepIdx(i => i - 1))

  const totalMinutes = prayerMinutes + readingMinutes + reflectionMinutes
  const answers = {
    history, pains, prayerMinutes, readingMinutes, reflectionMinutes, minutes: totalMinutes,
    planId: planIdFor(readingMinutes),
    reminder: reminder ? REMINDERS[reminder] : null,
    days,
  }

  async function finish() {
    if (starting) return
    setStarting(true)
    try {
      await onFinish(answers)
    } catch (err) {
      console.error('Failed to start reading', err)
      setStarting(false)
    }
  }

  // Permissão de notificação pedida aqui, com o motivo na mão (a pessoa
  // acabou de escolher o horário) — muito melhor que o alerta do sistema na
  // primeira abertura. Não bloqueia o fluxo: recusar só deixa sem lembrete.
  async function continueFromReminder() {
    if (reminder && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { await Notification.requestPermission() } catch { /* ignora */ }
    }
    next()
  }

  if (step === 'demo') {
    return <OnboardingDemo kind={demoFor(pains)} onContinue={next} onSkip={next} />
  }

  if (step === 'result') {
    return <ResultScreen L={L} lang={lang} answers={answers} onStart={finish} starting={starting} />
  }

  if (step === 'history') {
    return (
      <QuestionShell L={L} n={1} onBack={back} onSkip={() => { setHistory(null); next() }}
        title={L('historyTitle')} sub={L('historySub')} subMargin={26}
        why={L('historyWhy')} btnLabel={L('continueBtn')} onContinue={next}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['never', 'historyNever', 'historyNeverSub'], ['stopped', 'historyStopped', 'historyStoppedSub'], ['done', 'historyDone', 'historyDoneSub']].map(([id, k, ks]) => {
            const on = history === id
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => setHistory(id)}
                style={{ ...s.radioCard, background: on ? 'var(--bento-accent)' : 'var(--bento-card)' }}>
                <span style={{ ...s.radio, ...(on ? s.radioOn : s.radioOff) }}>
                  {on && <AppIcon name="Check" size={12} strokeWidth={3.2} color="var(--bento-accent)" />}
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span style={{ ...s.radioTitle, fontWeight: on ? 800 : 700 }}>{L(k)}</span>
                  <span style={{ ...s.radioSub, ...(on ? { fontWeight: 600, color: 'rgba(26,23,20,.6)' } : {}) }}>{L(ks)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </QuestionShell>
    )
  }

  if (step === 'pains') {
    const toggle = id => setPains(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
    return (
      <QuestionShell L={L} n={2} onBack={back} onSkip={() => { setPains([]); next() }}
        title={L('painsTitle')} sub={L('painsSub')} subMargin={24}
        why={L('painsWhy')} btnLabel={L('painsBtn')} onContinue={next}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {PAINS.map(id => {
            const on = pains.includes(id)
            const key = `pain${id[0].toUpperCase()}${id.slice(1)}`
            return (
              <button key={id} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(id)}
                style={{ ...s.checkCard, background: on ? 'var(--bento-accent)' : 'var(--bento-card)' }}>
                <span style={{ ...s.checkBox, ...(on ? s.checkBoxOn : s.checkBoxOff) }}>
                  {on && <AppIcon name="Check" size={11} strokeWidth={3.4} color="var(--bento-accent)" />}
                </span>
                <span style={{ ...s.checkText, fontWeight: on ? 800 : 700 }}>{L(key)}</span>
              </button>
            )
          })}
        </div>
      </QuestionShell>
    )
  }

  if (step === 'minutes') {
    // "Só quero ler" (atalho do quadro 15f) zera Oração e Reflexão juntas;
    // desfazer devolve o padrão de cada uma (mesmo padrão do atalho de
    // lembrete logo abaixo, no step 'reminder').
    const readOnly = prayerMinutes === 0 && reflectionMinutes === 0
    function toggleReadOnly() {
      if (readOnly) {
        setPrayerMinutes(STEP_MINUTES_DEFAULT.prayer)
        setReflectionMinutes(STEP_MINUTES_DEFAULT.reflection)
      } else {
        setPrayerMinutes(0)
        setReflectionMinutes(0)
      }
    }
    const rows = [
      { key: 'prayer', value: prayerMinutes, set: setPrayerMinutes, label: L('splitPrayer'), sub: L('minutesPrayerSub'), dark: false },
      { key: 'reading', value: readingMinutes, set: setReadingMinutes, label: L('splitReading'), sub: L('minutesReadingSub'), dark: true },
      { key: 'reflection', value: reflectionMinutes, set: setReflectionMinutes, label: L('splitReflection'), sub: L('minutesReflectionSub'), dark: false },
    ]
    return (
      <QuestionShell L={L} n={3} onBack={back} onSkip={next}
        title={L('minutesTitle')} sub={L('minutesSub')} subMargin={18}
        why={L('minutesWhy')} btnLabel={L('continueBtn')} onContinue={next}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 0 10px' }}>
          {rows.map(row => (
            <StepMinutesRow
              key={row.key} dark={row.dark} label={row.label} sub={row.sub} value={row.value} unit={L('min')}
              onDecrease={() => row.set(v => Math.max(STEP_MINUTES_MIN[row.key], v - STEP_MINUTES_STEP))}
              onIncrease={() => row.set(v => Math.min(STEP_MINUTES_MAX[row.key], v + STEP_MINUTES_STEP))}
            />
          ))}
        </div>
        <div style={s.totalCard}>
          <p style={s.totalLabel}>{L('minutesTotalLabel')}</p>
          <p style={s.totalValue}>{totalMinutes} <span style={s.totalUnit}>{L('min')}</span></p>
        </div>
        <button type="button" style={s.textLink} onClick={toggleReadOnly}>{readOnly ? L('readOnlyUndo') : L('readOnly')}</button>
      </QuestionShell>
    )
  }

  if (step === 'reminder') {
    const opts = [
      ['morning', 'reminderMorning', 'reminderMorningSub'],
      ['midday', 'reminderMidday', 'reminderMiddaySub'],
      ['night', 'reminderNight', 'reminderNightSub'],
    ]
    return (
      <QuestionShell L={L} n={4} onBack={back} onSkip={() => { setReminder(null); next() }}
        title={L('reminderTitle')} sub={L('reminderSub')} subMargin={24}
        why={L('reminderWhy')} btnLabel={L('continueBtn')} onContinue={continueFromReminder}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 0 16px' }}>
          {opts.map(([id, k, ks]) => {
            const on = reminder === id
            const { hour, minute } = REMINDERS[id]
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => setReminder(id)}
                style={{ ...s.timeCard, background: on ? 'var(--bento-ink)' : 'var(--bento-card)' }}>
                <span style={{ ...s.timeIcon, background: on ? 'var(--bento-accent)' : 'var(--bento-line)', ...(id === 'morning' ? { alignItems: 'flex-end', paddingBottom: 9 } : {}) }}>
                  <TimeShape id={id} color={on ? 'var(--bento-ink)' : 'var(--bento-t5)'} />
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span style={{ ...s.timeTitle, fontWeight: on ? 800 : 700, color: on ? '#fff' : 'var(--bento-ink)' }}>{L(k)}</span>
                  <span style={{ ...s.timeSub, fontWeight: on ? 600 : 500, color: on ? 'rgba(255,255,255,.5)' : 'var(--bento-t3)' }}>{L(ks, { time: formatClock(hour, minute) })}</span>
                </span>
                {on && (
                  <span style={s.timeCheck}><AppIcon name="Check" size={12} strokeWidth={3.2} color="var(--bento-ink)" /></span>
                )}
              </button>
            )
          })}
        </div>
        <button type="button" style={{ ...s.textLink, fontSize: 13.5 }} onClick={() => setReminder(r => (r ? null : 'morning'))}>
          {reminder ? L('reminderNone') : L('reminderNoneUndo')}
        </button>
      </QuestionShell>
    )
  }

  // step === 'days'
  const est = estimateCompletion(answers.planId, days)
  return (
    <QuestionShell L={L} n={5} onBack={back} onSkip={next}
      title={L('daysTitle')} sub={L('daysSub')} subMargin={24}
      why={L('daysWhy')} btnLabel={L('daysBtn')} onContinue={next}>
      <div style={{ display: 'flex', gap: 7, margin: '0 0 16px' }}>
        {WEEK_DAYS.map(d => <Tile key={d} on={days === d} n={d} unit={L('days')} height={64} onClick={() => setDays(d)} />)}
      </div>
      <div style={{ ...s.darkCard, margin: 0 }}>
        <p style={{ ...s.darkLabel, margin: '0 0 12px' }}>{L('withDays', { n: days })}</p>
        <p style={s.estTitle}>{L('finishIn', { duration: durationLabel(L, est) })}</p>
        <p style={s.estSub}>{est.perDay === 1 ? L('perDayOne', { min: totalMinutes }) : L('perDay', { n: est.perDay, min: totalMinutes })}</p>
      </div>
    </QuestionShell>
  )
}

function durationLabel(L, est) {
  const { years, restMonths, months } = est
  if (years >= 2) return restMonths ? L('aboutYearsMonths', { y: years, m: restMonths }) : L('aboutYears', { y: years })
  if (years === 1) return restMonths ? L('aboutOneYearMonths', { m: restMonths }) : L('aboutOneYear')
  return months === 1 ? L('aboutMonth') : L('aboutMonths', { m: months })
}

/* ── Casca comum das cinco perguntas ── */
function QuestionShell({ L, n, onBack, onSkip, title, sub, subMargin, why, btnLabel, onContinue, children }) {
  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" style={s.backBtn} onClick={onBack} aria-label={L('back')}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <button type="button" style={s.skip} onClick={onSkip}>{L('skip')}</button>
      </div>
      <div style={s.body}>
        <div style={s.progress}>
          {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
            <div key={i} style={{ ...s.segment, background: i < n ? 'var(--bento-accent)' : 'var(--bento-divider)' }} />
          ))}
        </div>
        <p style={s.qLabel}>{L('questionOf', { n, total: TOTAL_QUESTIONS })}</p>
        <p style={s.title}>{title}</p>
        <p style={{ ...s.sub, margin: `0 0 ${subMargin}px` }}>{sub}</p>
        {children}
      </div>
      <div style={s.footer}>
        <p style={s.why}>{L('whyPrefix')}{why}</p>
        <button type="button" style={s.btn} onClick={onContinue}>
          <span style={s.btnText}>{btnLabel}</span>
          <span style={s.btnArrow}>→</span>
        </button>
      </div>
    </div>
  )
}

function Tile({ on, n, unit, height, onClick }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      style={{ ...s.tile, height, background: on ? 'var(--bento-accent)' : 'var(--bento-card)' }}>
      <span style={{ ...s.tileNum, fontSize: on ? 22 : 20 }}>{n}</span>
      <span style={{ ...s.tileUnit, ...(on ? { fontWeight: 700, color: 'rgba(26,23,20,.6)' } : {}) }}>{unit}</span>
    </button>
  )
}

// Linha de passo com -/valor/+ (quadro 15f) — a Leitura vem em destaque
// (fundo escuro), Oração e Reflexão em branco. Os dois botões trocam de
// cor com o fundo, mas o "+" fica sempre laranja — é o convite a ajustar.
function StepMinutesRow({ dark, label, sub, value, unit, onDecrease, onIncrease }) {
  const minusColor = dark ? 'rgba(255,255,255,.8)' : 'var(--bento-ink)'
  return (
    <div style={{ ...s.stepRow, background: dark ? 'var(--bento-ink)' : 'var(--bento-card)' }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ ...s.stepLabel, color: dark ? '#fff' : 'var(--bento-ink)' }}>{label}</span>
        <span style={{ ...s.stepSub, color: dark ? 'rgba(255,255,255,.5)' : 'var(--bento-t3)' }}>{sub}</span>
      </span>
      <button type="button" style={{ ...s.stepBtn, background: dark ? 'rgba(255,255,255,.08)' : 'var(--bento-line)' }} onClick={onDecrease} aria-label="-5">
        <AppIcon name="Minus" size={13} strokeWidth={2.4} color={minusColor} />
      </button>
      <span style={s.stepValueWrap}>
        <span style={{ ...s.stepValue, color: dark ? '#fff' : 'var(--bento-ink)' }}>{value}</span>
        <span style={{ ...s.stepUnit, color: dark ? 'rgba(255,255,255,.45)' : 'var(--bento-t4)' }}>{unit}</span>
      </span>
      <button type="button" style={s.stepBtnAccent} onClick={onIncrease} aria-label="+5">
        <AppIcon name="Plus" size={13} strokeWidth={2.4} color="var(--bento-ink)" />
      </button>
    </div>
  )
}

// Formas dos horários (quadro 15c): manhã = meio-sol, meio-dia = círculo,
// noite = quadrado arredondado.
function TimeShape({ id, color }) {
  if (id === 'morning') return <span style={{ width: 20, height: 10, borderRadius: '99px 99px 0 0', background: color, display: 'block' }} />
  if (id === 'midday') return <span style={{ width: 16, height: 16, borderRadius: 99, background: color, display: 'block' }} />
  return <span style={{ width: 16, height: 16, borderRadius: 5, background: color, display: 'block' }} />
}

/* ── 15e — resultado ── */
function ResultScreen({ L, lang, answers, onStart, starting }) {
  const ref = lang === 'en' ? 'Genesis 1' : 'Gênesis 1'
  const est = estimateCompletion(answers.planId, answers.days)
  const rest = 7 - answers.days
  const month = est.endDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { month: 'long', year: 'numeric' })
  const startKey = answers.history === 'never' ? 'resultStartNever' : answers.history === 'done' ? 'resultStartDone' : 'resultStartStopped'
  // Parte o texto em volta de {ref} pra pôr a referência em negrito.
  const [startA, startB] = L(startKey, { ref: '\u0000' }).split('\u0000')

  const rows = [
    <>{startA}<strong style={s.strong}>{ref}</strong>{startB}</>,
    <><strong style={s.strong}>{L('resultDays', { n: answers.days })}</strong>{L(`resultRest${Math.min(rest, 4)}`)}</>,
    answers.reminder
      ? <>{L('resultReminderPrefix')}<strong style={s.strong}>{formatClock(answers.reminder.hour, answers.reminder.minute)}</strong>{L('resultReminderSuffix')}</>
      : <>{L('resultNoReminder')}</>,
    ...(answers.pains.includes('understand') ? [<><strong style={s.strong}>{L('resultAi')}</strong>{L('resultAiSuffix')}</>] : []),
    ...(answers.readOnly ? [<><strong style={s.strong}>{L('resultReadOnly')}</strong>{L('resultReadOnlySuffix')}</>] : []),
    <>{L('resultFinishPrefix')}<strong style={s.strong}>{month}</strong></>,
  ]

  return (
    <div style={{ ...s.screen, background: 'var(--bento-ink)' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '44px 24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={s.resultCheck}><AppIcon name="Check" size={22} strokeWidth={2.8} color="var(--bento-ink)" /></div>
        <p style={s.resultTitle}>{L('resultTitle')}</p>
        <p style={s.resultSub}>{L('resultSub')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rows.map((row, i) => (
            <div key={i} style={s.resultRow}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--bento-accent)', flex: 'none' }} />
              <p style={s.resultText}>{row}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 'none', padding: '22px 24px calc(32px + var(--safe-bottom))' }}>
        <button type="button" style={{ ...s.resultBtn, ...(starting ? { opacity: .7 } : {}) }} onClick={onStart} disabled={starting}>
          <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' }}>{L('resultBtn', { ref })}</span>
          <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' }}>→</span>
        </button>
        <p style={s.resultNote}>{L('resultNote')}</p>
      </div>
    </div>
  )
}

// Medidas dos quadros 15a–15f.
const s = {
  screen: { height: '100%', minHeight: '100%', background: 'var(--bento-bg)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: FONT },
  header: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 22px 0' },
  backBtn: { width: 34, height: 34, borderRadius: 12, background: 'var(--bento-card)', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  skip: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t4)' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '30px 22px 0', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  progress: { display: 'flex', gap: 5, margin: '0 0 22px', flex: 'none' },
  segment: { flex: 1, height: 5, borderRadius: 99 },
  qLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 14px' },
  title: { fontFamily: FONT, fontSize: 30, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1.3px', color: 'var(--bento-ink)', margin: '0 0 10px', textWrap: 'pretty' },
  sub: { fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-t3)', textWrap: 'pretty' },
  footer: { flex: 'none', padding: '16px 22px calc(30px + var(--safe-bottom))' },
  why: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t4)', margin: '0 0 14px' },
  btn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', padding: 0 },
  btnText: { fontFamily: FONT, fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: '#fff' },
  btnArrow: { fontFamily: FONT, fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-accent)' },
  // 15a
  radioCard: { borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' },
  radio: { width: 22, height: 22, borderRadius: 99, boxSizing: 'border-box', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  radioOff: { border: '2px solid var(--bento-divider)' },
  radioOn: { background: 'var(--bento-ink)' },
  radioTitle: { display: 'block', fontFamily: FONT, fontSize: 15, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 3px' },
  radioSub: { display: 'block', fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },
  // 15b
  checkCard: { borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 13, border: 'none', cursor: 'pointer', width: '100%' },
  checkBox: { width: 20, height: 20, borderRadius: 7, boxSizing: 'border-box', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  checkBoxOff: { border: '2px solid var(--bento-divider)' },
  checkBoxOn: { background: 'var(--bento-ink)' },
  checkText: { flex: 1, fontFamily: FONT, fontSize: 14.5, lineHeight: 1.25, color: 'var(--bento-ink)', margin: 0, textAlign: 'left' },
  // 15f / 15d
  tile: { flex: 1, borderRadius: 16, border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 },
  tileNum: { fontFamily: FONT, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' },
  tileUnit: { fontFamily: FONT, fontSize: 9.5, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },
  darkCard: { borderRadius: 22, background: 'var(--bento-ink)', padding: 20, margin: '0 0 10px' },
  darkLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 14px' },
  // Linha de passo (StepMinutesRow, quadro 15f) — nome+apoio à esquerda,
  // -/valor/+ à direita. Reaproveitada em branco (Oração/Reflexão) e em
  // --bento-ink (Leitura, em destaque — é a única que afeta o plano).
  stepRow: { borderRadius: 20, padding: '14px 14px 14px 18px', display: 'flex', alignItems: 'center', gap: 10 },
  stepLabel: { display: 'block', fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1.2, marginBottom: 2 },
  stepSub: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3 },
  stepBtn: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepBtnAccent: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepValueWrap: { width: 52, flexShrink: 0, textAlign: 'center' },
  stepValue: { fontFamily: FONT, fontSize: 20, fontWeight: 800, lineHeight: 1, letterSpacing: '-.6px' },
  stepUnit: { fontFamily: FONT, fontSize: 10, fontWeight: 600, lineHeight: 1, marginLeft: 2 },
  totalCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 12px' },
  totalLabel: { flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 600, lineHeight: 1.35, color: 'var(--bento-sand-ink)', margin: 0 },
  totalValue: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '-.8px', color: 'var(--bento-sand-ink-strong)', margin: 0 },
  totalUnit: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-sand-label)' },
  textLink: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0, textAlign: 'center', width: '100%' },
  estTitle: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.8px', color: '#fff', margin: '0 0 8px' },
  estSub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.5)', margin: 0 },
  // 15c
  timeCard: { borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer', width: '100%' },
  timeIcon: { width: 38, height: 38, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', flex: 'none' },
  timeTitle: { display: 'block', fontFamily: FONT, fontSize: 15.5, lineHeight: 1.2, margin: '0 0 3px' },
  timeSub: { display: 'block', fontFamily: FONT, fontSize: 12, lineHeight: 1.3, margin: 0 },
  timeCheck: { width: 22, height: 22, borderRadius: 99, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  // 15e
  resultCheck: { width: 44, height: 44, borderRadius: 15, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0 22px', flex: 'none' },
  resultTitle: { fontFamily: FONT, fontSize: 32, fontWeight: 800, lineHeight: 1.12, letterSpacing: '-1.4px', color: '#fff', margin: '0 0 10px', textWrap: 'pretty' },
  resultSub: { fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,.5)', margin: '0 0 26px', textWrap: 'pretty' },
  resultRow: { borderRadius: 18, background: 'rgba(255,255,255,.06)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 },
  resultText: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, color: 'rgba(255,255,255,.62)', margin: 0 },
  strong: { color: '#fff', fontWeight: 800 },
  resultBtn: { width: '100%', height: 56, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, margin: '0 0 12px', cursor: 'pointer', padding: 0 },
  resultNote: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.35)', margin: 0, textAlign: 'center' },
}
