// TimePerStepSheet.jsx — "Quanto tempo em cada passo" (quadro 26d), a folha
// de relógio aberta pelo pílula de tempo do cabeçalho da Oração (26a) e da
// Leitura (26b), e reaproveitada inteira dentro de AdjustPlanScreen.jsx
// (5a) como o card "Tempo de cada passo".
//
// Bloco 4 do redesign, decisão tomada com a autora: os minutos de LEITURA
// aqui são a fonte REAL do tamanho da sessão (ver dynamicSessions.js/
// deriveProgress em utils/progress.js) — não mais os 4 ritmos fixos
// (Leve/Padrão/Intensivo, mantidos só pro plano Livre/navegação). Por isso
// Leitura nunca vai a zero (não tem "desligar a leitura"), diferente de
// Oração/Reflexão, que zeram e saem da rotina do dia.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { PLANS } from '../data/bibleBlocks'
import { computeProjection, formatYearsMonths } from '../plan/readingProjection'
import { getWeeklyDays } from '../routine/weeklyDaysStore'
import { getNoTimerMode, setNoTimerMode } from '../plan/noTimerModeStore'

const STEPS = ['prayer', 'reading', 'reflection']
const STEP_COLOR = { prayer: 'var(--bento-accent)', reading: 'var(--bento-sand)', reflection: 'rgba(255,255,255,.25)' }
const MIN_FOR = { prayer: 0, reading: 1, reflection: 0 }

// Rápido/Padrão/Longo (26d) — os mesmos 3 ritmos de sempre (Leve/Padrão/
// Intensivo, ver PLANS em bibleBlocks.js), só com nomes novos pra esta
// folha: dado real do app, não os números de exemplo do mockup (8/33/60).
const PRESET_PLAN_IDS = { fast: 'light', standard: 'standard', long: 'intensive' }

// Miolo reaproveitado pela folha (26d) e por AdjustPlanScreen.jsx (5a, sem
// nenhuma moldura de folha por cima — só o cartão embutido na página).
// minutes/onChange controlados por quem chama, pra 5a poder salvar direto
// (sem passo de "abrir folha, confirmar, fechar") e a folha poder manter
// seu próprio rascunho até "Salvar tempos".
export function StepMinutesEditor({ minutes, onChange, completedSet, lang, showNoTimer = true }) {
  const L = (k, vars) => translate(`timeSheet.${k}`, vars, lang)
  const [weeklyDays, setWeeklyDays] = useState(null)
  const [noTimer, setNoTimer] = useState(getNoTimerMode)

  useEffect(() => {
    getWeeklyDays().then(setWeeklyDays).catch(() => setWeeklyDays([true, true, true, true, true, false, false]))
  }, [])

  function bump(step, delta) {
    onChange({ ...minutes, [step]: Math.max(MIN_FOR[step], Math.min(60, (minutes[step] ?? 0) + delta)) })
  }

  function applyPreset(key) {
    const plan = PLANS.find(p => p.id === PRESET_PLAN_IDS[key])
    onChange({ prayer: plan.prayerMinutes, reading: plan.readingMinutes, reflection: plan.reflectionMinutes })
  }

  const total = STEPS.reduce((sum, k) => sum + (minutes[k] ?? 0), 0)
  const proj = weeklyDays && completedSet
    ? computeProjection({ completedSet, readingMinutesPerDay: minutes.reading, weeklyDays, lang })
    : null

  return (
    <>
      <div style={s.todayCard}>
        <div style={s.todayHead}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.todayLabel}>{L('todaySession')}</p>
            <p style={s.todayMin}>{L('minCount', { n: total })}</p>
          </div>
          <div style={s.todayBar}>
            {STEPS.map(k => (
              <div key={k} style={{ flex: Math.max(1, minutes[k] ?? 0), borderRadius: 99, background: STEP_COLOR[k] }} />
            ))}
          </div>
        </div>
        {proj?.monthsRemaining != null && (
          <div style={s.projBox}>
            <p style={s.projLine1}>
              {L('projPrefix')} <span style={{ color: 'var(--bento-accent)' }}>{formatYearsMonths(proj.monthsRemaining, lang)}</span>
            </p>
            <p style={s.projLine2}>{L('projFoot', { date: proj.finishDateLabel, remaining: proj.chaptersRemaining })}</p>
          </div>
        )}
      </div>

      <div style={s.stepsCard}>
        {STEPS.map(k => (
          <div key={k} style={s.stepRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.stepTitle}>{translate(`home.routine${k[0].toUpperCase()}${k.slice(1)}`, undefined, lang)}</p>
              <p style={s.stepSub}>{L(`${k}Sub`)}</p>
            </div>
            <div style={s.stepControls}>
              <button style={s.stepBtn} onClick={() => bump(k, -1)} aria-label="-" disabled={(minutes[k] ?? 0) <= MIN_FOR[k]}>
                <AppIcon name="Minus" size={12} strokeWidth={2.4} color="var(--bento-ink)" />
              </button>
              <div style={s.stepValue}><span style={s.stepValueNum}>{minutes[k] ?? 0}</span><span style={s.stepValueUnit}>{L('minUnit')}</span></div>
              <button style={s.stepBtnDark} onClick={() => bump(k, 1)} aria-label="+" disabled={(minutes[k] ?? 0) >= 60}>
                <AppIcon name="Plus" size={12} strokeWidth={2.4} color="var(--bento-accent)" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={s.presetsRow}>
        {['fast', 'standard', 'long'].map(key => {
          const plan = PLANS.find(p => p.id === PRESET_PLAN_IDS[key])
          const presetTotal = plan.prayerMinutes + plan.readingMinutes + plan.reflectionMinutes
          return (
            <button key={key} style={s.presetBtn} onClick={() => applyPreset(key)}>
              {L(`preset_${key}`, { n: presetTotal })}
            </button>
          )
        })}
      </div>

      {showNoTimer && (
        <div style={s.noTimerCard}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.noTimerTitle}>{L('noTimerTitle')}</p>
            <p style={s.noTimerSub}>{L('noTimerSub')}</p>
          </div>
          <button
            role="switch" aria-checked={noTimer}
            style={{ ...s.noTimerSwitch, justifyContent: noTimer ? 'flex-end' : 'flex-start' }}
            onClick={() => { const next = !noTimer; setNoTimer(next); setNoTimerMode(next) }}
          >
            <span style={s.noTimerThumb} />
          </button>
        </div>
      )}
    </>
  )
}

export default function TimePerStepSheet({ open, onClose, initialMinutes, completedSet, onSave, lang }) {
  const L = (k, vars) => translate(`timeSheet.${k}`, vars, lang)
  const [minutes, setMinutes] = useState(initialMinutes)

  useEffect(() => {
    if (!open) return
    setMinutes(initialMinutes)
  }, [open, initialMinutes])

  if (!open) return null

  function handleSave() {
    onSave(minutes)
    onClose?.()
  }

  return createPortal(
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handleWrap} onClick={onClose}><div style={s.handle} /></div>
        <p style={s.title}>{L('title')}</p>
        <p style={s.subtitle}>{L('subtitle')}</p>

        <div style={s.body}>
          <StepMinutesEditor minutes={minutes} onChange={setMinutes} completedSet={completedSet} lang={lang} />
        </div>

        <div style={s.footer}>
          <button style={s.saveBtn} onClick={handleSave}>{L('saveBtn')}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const FONT = 'var(--font-bento)'
const s = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 130, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)', borderRadius: '22px 22px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: '0 20px calc(20px + var(--safe-bottom))' },
  handleWrap: { display: 'flex', justifyContent: 'center', padding: '14px 0 10px', cursor: 'pointer', flex: 'none' },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)' },
  title: { flex: 'none', fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  subtitle: { flex: 'none', fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 16px' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 4 },

  todayCard: { borderRadius: 22, background: 'var(--bento-ink)', padding: '16px 20px' },
  todayHead: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 },
  todayLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 8px' },
  todayMin: { fontFamily: FONT, fontSize: 28, fontWeight: 800, letterSpacing: '-1.2px', color: '#fff', margin: 0 },
  todayBar: { flexShrink: 0, display: 'flex', gap: 3, width: 120, height: 10 },
  projBox: { borderRadius: 14, background: 'rgba(240,102,43,.14)', padding: '11px 13px' },
  projLine1: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, color: '#fff', margin: '0 0 3px' },
  projLine2: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'rgba(255,255,255,.5)', margin: 0 },

  stepsCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '2px 18px' },
  stepRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--bento-line)' },
  stepTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  stepSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  stepControls: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 },
  stepBtn: { width: 30, height: 30, borderRadius: 10, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepBtnDark: { width: 30, height: 30, borderRadius: 10, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepValue: { width: 46, textAlign: 'center', whiteSpace: 'nowrap' },
  stepValueNum: { fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)' },
  stepValueUnit: { fontFamily: FONT, fontSize: 9.5, fontWeight: 600, color: 'var(--bento-t4)', marginLeft: 2 },

  presetsRow: { display: 'flex', gap: 8 },
  presetBtn: { flex: 1, height: 40, borderRadius: 14, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-t3)', cursor: 'pointer' },

  noTimerCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 },
  noTimerTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  noTimerSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  noTimerSwitch: { flexShrink: 0, width: 44, height: 26, borderRadius: 99, border: 'none', background: 'var(--bento-toggle-off)', display: 'flex', alignItems: 'center', padding: '0 3px', cursor: 'pointer' },
  noTimerThumb: { width: 20, height: 20, borderRadius: 99, background: '#fff' },

  footer: { flex: 'none', padding: '14px 0 0' },
  saveBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
}
