// AjustarPlanoScreen.jsx — "Ajustar meu plano" (handoff-meu-plano-47,
// A1–A4, HANDOFF §12). Substitui AdjustPlanScreen.jsx (35c). Responde às
// mesmas perguntas — quais passos, quanto tempo, em que dias — e edita
// exatamente os mesmos campos (passo ligado/desligado, minutos, modo,
// dias de cada passo, as três opções do cronômetro), sem campo novo.
//
// Tudo o que a pessoa mexe fica num RASCUNHO em memória (App.jsx guarda
// o rascunho, pra ele sobreviver à ida e volta a 35i/35j/lembrete); o
// cartão preto, os resumos e o rodapé são derivados dele a cada toque;
// nada é gravado antes de "Salvar plano" (onSave grava pelas mesmas
// funções que 35c já usava). Voltar com mudanças pede "Sair sem salvar?".
// Um passo aberto por vez (A2/A3); A4 é a folha do cronômetro, desenhada
// aqui mesmo (mexe no mesmo rascunho; "1 mudança · cronômetro").
// Cálculo em src/meuPlano/ajustarMath.js (puro, testado).
import { useEffect, useMemo, useRef, useState } from 'react'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'
import { getStepDays } from '../routine/stepDaysStore'
import { getPrayerMethod } from '../prayer/prayerMethodStore'
import { getReflectionMethod } from '../reflection/reflectionMethodStore'
import { getReadingClockPrefs } from '../reading/readingClockPrefsStore'
import { getMyReminderSchedule } from '../notifications/pushStore'
import { computeProjection } from '../plan/readingProjection'
import { WEEKDAY_ABBR3 } from '../routine/weeklyDaysMath'
import { loadActiveStudy } from '../meuPlano/activeStudy'
import WeekdayChipRow from '../components/WeekdayChipRow'
import FolhaInferior from '../components/FolhaInferior'
import { getReadingPaceSessions, getUseLearnedPace } from '../reading/readingPaceStore'
import { estimateReadingPace, chaptersPerSession } from '../reading/readingPaceMath'
import { BIBLE_TOTAL_WORDS } from '../data/bibleBlocks'
import { totalBibleChapters } from '../plan/readingProjection'
import { reminderLine } from '../meuPlano/seuPlanoMath'
import { stepName } from '../meuPlano/meuPlanoMath'
import {
  buildPlan, weekMinutes, daysWithSomethingCount, barHeight, stepSummary, clockSummary, canDisable, LAST_BIBLE_STEP_MESSAGE,
  withEnabled, withMinutes, withMethod, withDayToggled, withClock, diffPlans, changesLine, reconcileDraft, weekFooter,
  chaptersApprox, stageMinutes, perWeekLabel, MIN_MINUTES, MAX_MINUTES, MINUTES_STEP,
} from '../meuPlano/ajustarMath'
import { STEP_KEYS } from '../routine/stepDaysMath'
import { daysWithSomething } from '../meuPlano/seuPlanoMath'

const FONT = 'var(--font-bento)'
const AVG_WORDS_PER_CHAPTER = BIBLE_TOTAL_WORDS / totalBibleChapters()

export default function AjustarPlanoScreen({ session, completedSet, stepMinutes, draftState, onDraftChange, onClearDraft, onSave, onBack, onNavigate, initialOpenStep = null, scrollToDays = false }) {
  const { lang, plan, routineModules, activeStudyId, currentBlock, hasNoPlan } = session
  const [saved, setSaved] = useState(null)
  const [activeStudy, setActiveStudy] = useState(null)
  const [reminder, setReminder] = useState(null)
  const [openKey, setOpenKey] = useState(initialOpenStep)
  const [warningKey, setWarningKey] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [leaveAsk, setLeaveAsk] = useState(false)
  const [clockOpen, setClockOpen] = useState(false)
  const clockRowRef = useRef(null)
  const [pace, setPace] = useState(null) // { wordsPerMinute, isColdStart } quando o ritmo aprendido está ligado
  const bodyRef = useRef(null)
  const rowRefs = useRef({})
  const daysRefs = useRef({})
  const pendingScrollRef = useRef(initialOpenStep ? { key: initialOpenStep, days: scrollToDays } : null)

  // Carrega o salvo e monta (ou reconcilia) o rascunho — ver reconcileDraft.
  useEffect(() => {
    let alive = true
    // O lembrete vem à parte: depende do service worker e nunca pode
    // segurar o rascunho (sem push, a promessa pode nem resolver).
    getMyReminderSchedule().then(r => { if (alive) setReminder(r) }).catch(() => {})
    Promise.all([getUseLearnedPace(), getReadingPaceSessions()]).then(([on, sessions]) => {
      if (!alive) return
      const est = estimateReadingPace(sessions)
      setPace(on && !est.isColdStart ? est : null)
    }).catch(() => {})
    Promise.all([getStepDays(), getReadingClockPrefs().catch(() => ({})), loadActiveStudy(activeStudyId, lang).catch(() => null)])
      .then(([stepDays, clockPrefs, study]) => {
        if (!alive) return
        const fresh = buildPlan({ routineModules, stepMinutes, plan, prayerMethod: getPrayerMethod(), reflectionMethod: getReflectionMethod(), stepDays, clockPrefs })
        setSaved(fresh)
        setActiveStudy(study)
        const d = draftState?.draft ? reconcileDraft(draftState.draft, draftState.saved, fresh) : fresh
        onDraftChange?.({ saved: fresh, draft: d })
        // "Mudar meus dias" (P6): abre a Leitura; desligada, o primeiro
        // passo ligado (HANDOFF §12.4).
        if (initialOpenStep) {
          const target = d.enabled[initialOpenStep] ? initialOpenStep : STEP_KEYS.find(k => d.enabled[k]) ?? null
          setOpenKey(target)
          pendingScrollRef.current = target ? { key: target, days: scrollToDays } : null
        }
      })
      .catch(err => console.error('[ajustar] carregar', err))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const draft = draftState?.draft ?? null
  const hasActiveStudy = !!activeStudy
  const changes = useMemo(() => (saved && draft ? diffPlans(saved, draft) : []), [saved, draft])
  const mins = useMemo(() => (draft ? weekMinutes(draft, hasActiveStudy) : null), [draft, hasActiveStudy])
  const proj = draft && draft.enabled.reading && !hasNoPlan
    ? computeProjection({ completedSet, readingMinutesPerDay: draft.minutes.reading, weeklyDays: draft.stepDays.reading, lang })
    : null
  const readingPassage = !hasNoPlan && currentBlock?.book && currentBlock?.chapter ? `${currentBlock.book} ${currentBlock.chapter}` : ''
  const summaryCtx = { readingPassage, study: activeStudy ? { title: activeStudy.title, dayN: activeStudy.dayN, dayTotal: activeStudy.dayTotal } : null }

  function update(next) { onDraftChange?.({ saved, draft: next }) }

  function toggleStep(key, on) {
    if (!draft) return
    if (!on && !canDisable(draft, key)) { setWarningKey(key); setOpenKey(key); return }
    setWarningKey(null)
    const next = withEnabled(draft, key, on)
    update(next)
    if (!on && openKey === key) setOpenKey(null)
  }

  function toggleOpen(key) {
    if (!draft?.enabled[key]) return
    const opening = openKey !== key
    setOpenKey(opening ? key : null)
    if (opening) pendingScrollRef.current = { key, days: false }
  }

  // Ao abrir, a tela rola pro topo do cartão ficar visível (ou até "EM
  // QUE DIAS", vindo de "Mudar meus dias"). Sem animação forçada: o
  // navegador respeita prefers-reduced-motion com behavior 'auto'.
  useEffect(() => {
    const p = pendingScrollRef.current
    if (!p || openKey !== p.key) return
    pendingScrollRef.current = null
    const el = p.days ? daysRefs.current[p.key] : rowRefs.current[p.key]
    el?.scrollIntoView({ block: p.days ? 'center' : 'start', behavior: 'auto' })
  }, [openKey, draft])

  function setMinutes(key, delta) {
    if (!draft) return
    update(withMinutes(draft, key, draft.minutes[key] + delta))
  }
  function setDays(key, days) {
    if (!draft) return
    // Desmarcar o último dia desliga o passo e fecha (HANDOFF §12.3).
    const idx = days.findIndex((v, i) => v !== draft.stepDays[key][i])
    if (idx < 0) return
    const r = withDayToggled(draft, key, idx)
    update(r.plan)
    if (r.disabled) setOpenKey(null)
  }

  // Texto de apoio de QUANTO TEMPO (HANDOFF §12.3).
  function timeHint(key) {
    if (key === 'prayer') return draft.prayerMethod === 'acts' ? stageMinutes(draft.minutes.prayer) : null
    if (key === 'reading') return pace ? chaptersApprox(chaptersPerSession(pace.wordsPerMinute, draft.minutes.reading, AVG_WORDS_PER_CHAPTER)) : null
    if (key === 'reflection') return draft.reflectionMethod === 'questions' ? 'Perguntas geradas do trecho do dia' : null
    return null
  }

  async function save() {
    if (!saved || !draft || changes.length === 0 || saving) return
    setSaving(true); setSaveError(false)
    try {
      await onSave?.(saved, draft)
      onClearDraft?.()
      onBack?.()
    } catch (err) {
      console.error('[ajustar] salvar', err)
      setSaveError(true)
      setSaving(false)
    }
  }

  function back() {
    if (clockOpen) { setClockOpen(false); return }
    if (changes.length > 0) { setLeaveAsk(true); return }
    onClearDraft?.()
    onBack?.()
  }
  function discard() { setLeaveAsk(false); onClearDraft?.(); onBack?.() }

  const abbr = WEEKDAY_ABBR3.pt

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={back} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>Ajustar meu plano</p>
      </div>

      <div ref={bodyRef} style={s.body}>
        {!draft ? (
          <>
            <div className="rb-context-skeleton" style={{ ...s.skeleton, height: 210, borderRadius: 26 }} />
            {[0, 1, 2, 3].map(i => <div key={i} className="rb-context-skeleton" style={{ ...s.skeleton, height: 70 }} />)}
          </>
        ) : (
          <>
            <div style={s.weekCard} aria-label={`Sua semana com este plano: ${daysWithSomething(daysWithSomethingCount(draft))}`}>
              <div style={s.weekHead}>
                <p style={s.weekLabel}>SUA SEMANA COM ESTE PLANO</p>
                <p style={s.weekCount}>{daysWithSomething(daysWithSomethingCount(draft))}</p>
              </div>
              <div style={s.cols}>
                {mins.map((m, i) => (
                  <div key={i} style={s.col}>
                    <span style={{ ...s.colMin, color: m > 0 ? '#fff' : 'rgba(255,255,255,.3)' }}>{m > 0 ? m : '—'}</span>
                    {m > 0
                      ? <span style={{ ...s.barFill, height: barHeight(m) }} />
                      : <span style={s.barEmpty} />}
                    <span style={s.colAbbr}>{abbr[i]}</span>
                  </div>
                ))}
              </div>
              <p style={s.weekFooter}>{weekFooter(draft, hasActiveStudy, proj?.finishDateLabel ?? null)}</p>
            </div>

            <p style={s.sectionLabel}>PASSOS, NA ORDEM DO DIA</p>

            {STEP_KEYS.map(key => {
              const on = draft.enabled[key]
              const open = on && openKey === key
              const name = stepName(key)
              const summary = stepSummary(key, draft, summaryCtx)
              return (
                <div key={key} ref={el => { rowRefs.current[key] = el }} style={{ ...s.row, ...(on ? {} : s.rowOff), ...(open ? s.rowOpen : {}) }}>
                  <div
                    style={s.rowHead} role="button" tabIndex={on ? 0 : -1} aria-expanded={on ? open : undefined}
                    aria-label={`${name}, ${on ? `${draft.minutes[key]} minutos, ligado, ${open ? 'aberto' : 'fechado'}` : 'desligado'}`}
                    onClick={() => toggleOpen(key)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOpen(key) } }}
                  >
                    <span style={{ ...s.minBox, ...(on ? {} : s.minBoxOff) }}>
                      {on ? <><span style={s.minNum}>{draft.minutes[key]}</span><span style={s.minUnit}>min</span></> : <span style={s.minDash}>—</span>}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ ...s.rowName, fontWeight: open ? 800 : 700, color: on ? 'var(--bento-ink)' : 'var(--bento-t4)' }}>{name}</span>
                      <span style={{ ...s.rowSummary, color: on ? 'var(--bento-t3)' : 'var(--bento-t5)' }}>{summary}</span>
                    </span>
                    {on && <AppIcon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} strokeWidth={2} color="var(--bento-t3)" />}
                    <button
                      type="button" role="switch" aria-checked={on} aria-label={`${name}: ${on ? 'ligado' : 'desligado'}`}
                      style={{ ...s.switch, background: on ? 'var(--bento-ink)' : 'var(--bento-t6)', justifyContent: on ? 'flex-end' : 'flex-start' }}
                      onClick={e => { e.stopPropagation(); toggleStep(key, !on) }}
                    >
                      <span style={{ ...s.thumb, background: on ? 'var(--bento-accent)' : '#fff' }} />
                    </button>
                  </div>
                  {warningKey === key && (
                    <p style={s.warning}>{LAST_BIBLE_STEP_MESSAGE}</p>
                  )}
                  {open && (key === 'prayer' || key === 'reflection') && (
                    <div style={s.section}>
                      <p style={s.sectionTitle}>COMO</p>
                      <div style={s.modeRow} role="radiogroup" aria-label="Como">
                        {(key === 'prayer'
                          ? [['acts', 'ACTS', '4 etapas guiadas'], ['free', 'Livre', 'só o cronômetro']]
                          : [['questions', 'Com perguntas', 'três sobre o texto'], ['free', 'Livre', 'só a folha em branco']]
                        ).map(([id, title, sub]) => {
                          const active = (key === 'prayer' ? draft.prayerMethod : draft.reflectionMethod) === id
                          return (
                            <button key={id} type="button" role="radio" aria-checked={active} style={{ ...s.modeBtn, ...(active ? s.modeBtnOn : {}) }} onClick={() => update(withMethod(draft, key, id))}>
                              <span style={{ ...s.modeTitle, color: active ? '#fff' : 'var(--bento-ink)' }}>{title}</span>
                              <span style={{ ...s.modeSub, color: active ? 'rgba(255,255,255,.55)' : 'var(--bento-t3)' }}>{sub}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {open && !(key === 'study' && !activeStudy) && (
                    <div style={s.section}>
                      <p style={s.sectionTitle}>QUANTO TEMPO</p>
                      <div style={s.timeRow}>
                        <span style={s.timeHint}>{timeHint(key) ?? ''}</span>
                        <div style={s.stepper}>
                          <button type="button" aria-label="Menos 5 minutos" style={{ ...s.stepMinus, opacity: draft.minutes[key] <= MIN_MINUTES ? 0.4 : 1 }} disabled={draft.minutes[key] <= MIN_MINUTES} onClick={() => setMinutes(key, -MINUTES_STEP)}>
                            <AppIcon name="Minus" size={16} strokeWidth={2.4} color="var(--bento-ink)" />
                          </button>
                          <span style={s.stepValue}><span style={s.stepNum}>{draft.minutes[key]}</span><span style={s.stepUnit}> min</span></span>
                          <button type="button" aria-label="Mais 5 minutos" style={{ ...s.stepPlus, opacity: draft.minutes[key] >= MAX_MINUTES ? 0.4 : 1 }} disabled={draft.minutes[key] >= MAX_MINUTES} onClick={() => setMinutes(key, MINUTES_STEP)}>
                            <AppIcon name="Plus" size={16} strokeWidth={2.4} color="var(--bento-accent)" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {open && !(key === 'study' && !activeStudy) && (
                    <div style={s.section} ref={el => { daysRefs.current[key] = el }}>
                      <div style={s.sectionHead}>
                        <p style={{ ...s.sectionTitle, margin: 0 }}>EM QUE DIAS</p>
                        <span style={s.sectionValue}>{perWeekLabel(draft.stepDays[key])}</span>
                      </div>
                      <WeekdayChipRow days={draft.stepDays[key]} onChange={days => setDays(key, days)} lang="pt" tone="ajustar" />
                      {key === 'reading' && <p style={s.daysNote}>Os outros dias podem ser do estudo.</p>}
                    </div>
                  )}
                  {open && (key === 'reading' || key === 'study') && (
                    <button type="button" style={{ ...s.shortcut, ...(key === 'study' && !activeStudy ? { marginTop: 14 } : {}) }} onClick={() => onNavigate?.(key === 'reading' ? 'readingOrganize' : 'studyOrganize')}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={s.shortcutTitle}>{key === 'reading' ? 'Organizar a leitura' : 'Organizar o estudo'}</span>
                        <span style={s.shortcutSub}>{key === 'reading' ? 'Onde começar, ordem e ritmo' : 'Estudo atual e banco de estudos'}</span>
                      </span>
                      <AppIcon name="ChevronRight" size={14} strokeWidth={2} color="var(--bento-t5)" />
                    </button>
                  )}
                </div>
              )
            })}

            <div style={s.list}>
              <button ref={clockRowRef} type="button" style={{ ...s.listRow, borderBottom: '1px solid var(--bento-line)' }} onClick={() => setClockOpen(true)} aria-haspopup="dialog" aria-expanded={clockOpen}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={s.listTitle}>Cronômetro</span>
                  <span style={s.listSub}>{clockSummary(draft.clock)}</span>
                </span>
                <AppIcon name="ChevronRight" size={14} strokeWidth={2} color="var(--bento-t5)" />
              </button>
              <button type="button" style={s.listRow} onClick={() => onNavigate?.('profile')}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={s.listTitle}>Lembrete diário</span>
                  <span style={s.listSub}>{reminderLine(reminder) ?? t('routine.dailyReminderOff', undefined, lang)}</span>
                </span>
                <AppIcon name="ChevronRight" size={14} strokeWidth={2} color="var(--bento-t5)" />
              </button>
            </div>
          </>
        )}
      </div>

      <div style={s.footer}>
        {saveError && <p style={s.saveError}>Não deu para salvar. Tente de novo.</p>}
        {changes.length > 0 && !saveError && <p style={s.changesLine}>{changesLine(changes)}</p>}
        {changes.length === 0
          ? <button type="button" style={s.saveOff} disabled>Nada para salvar</button>
          : <button type="button" style={{ ...s.saveOn, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar plano'}</button>}
      </div>

      {clockOpen && draft && (
        <ClockSheet
          lang={lang}
          clock={draft.clock}
          onToggle={key => update(withClock(draft, key, !draft.clock[key]))}
          onClose={() => { setClockOpen(false); clockRowRef.current?.focus?.() }}
        />
      )}

      {leaveAsk && (
        <div style={s.veil} onClick={() => setLeaveAsk(false)}>
          <div style={s.dialog} role="dialog" aria-modal="true" aria-label="Sair sem salvar?" onClick={e => e.stopPropagation()}>
            <p style={s.dialogTitle}>Sair sem salvar?</p>
            <div style={s.dialogRow}>
              <button type="button" style={s.dialogSecondary} onClick={discard}>Descartar</button>
              <button type="button" style={s.dialogPrimary} onClick={() => { setLeaveAsk(false); save() }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// A4 — folha do cronômetro (HANDOFF §12.5). Os três interruptores de 35c,
// com os mesmos textos (routine.*) e os mesmos efeitos em 35f/35g; aqui
// mexem só no rascunho. Fecha por "Pronto", toque no véu, arrastar para
// baixo, Esc ou o voltar da tela (back() de quem a abriu). Prende o foco:
// Tab circula só dentro da folha; ao fechar, o foco volta à linha
// "Cronômetro".
const CLOCK_ROWS = [
  { key: 'showOnReading', title: 'routine.showOnReadingTitle', sub: 'routine.showOnReadingSub' },
  { key: 'warnAtZero', title: 'routine.warnAtZeroTitle', sub: 'routine.warnAtZeroSub' },
  { key: 'askToContinue', title: 'routine.askContinueTitle', sub: 'routine.askContinueSub' },
]

function ClockSheet({ lang, clock, onToggle, onClose }) {
  return (
    <FolhaInferior onClose={onClose} labelledBy="ajustar-cronometro-titulo">
      <p id="ajustar-cronometro-titulo" style={s.sheetTitle}>Cronômetro</p>
      <p style={s.sheetSub}>Vale para a leitura e para o estudo.</p>
      {CLOCK_ROWS.map((row, i) => {
        const on = !!clock[row.key]
        const title = t(row.title, undefined, lang)
        return (
          <div key={row.key} style={{ ...s.sheetRow, borderTop: i > 0 ? '1px solid var(--bento-line)' : 'none' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={s.sheetRowTitle}>{title}</span>
              <span style={s.sheetRowSub}>{t(row.sub, undefined, lang)}</span>
            </span>
            <button
              type="button" role="switch" aria-checked={on} aria-label={`${title}: ${on ? 'ligado' : 'desligado'}`}
              onClick={() => onToggle(row.key)}
              style={{ ...s.switch, background: on ? 'var(--bento-ink)' : 'var(--bento-t6)', justifyContent: on ? 'flex-end' : 'flex-start' }}
            >
              <span style={{ ...s.thumb, background: on ? 'var(--bento-accent)' : '#fff' }} />
            </button>
          </div>
        )
      })}
      <button type="button" style={s.sheetDone} onClick={onClose}>Pronto</button>
    </FolhaInferior>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)', position: 'relative' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  skeleton: { borderRadius: 22, background: 'var(--bento-line)', flexShrink: 0 },
  weekCard: { borderRadius: 26, background: 'var(--bento-ink)', padding: '18px 18px 16px', flexShrink: 0 },
  weekHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 },
  weekLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  weekCount: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-accent)', margin: 0 },
  cols: { display: 'flex', gap: 6, alignItems: 'flex-end' },
  col: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 },
  colMin: { fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: 1 },
  barFill: { width: '100%', borderRadius: 9, background: 'var(--bento-accent)' },
  barEmpty: { width: '100%', height: 6, borderRadius: 99, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.2)' },
  colAbbr: { fontFamily: FONT, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.5)' },
  weekFooter: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.6)', margin: '16px 0 0' },
  sectionLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '6px 2px -2px' },
  row: { borderRadius: 22, background: '#fff', padding: '13px 14px', flexShrink: 0 },
  rowOff: { background: 'rgba(255,255,255,.55)' },
  rowOpen: { borderRadius: 24, boxShadow: 'inset 0 0 0 2px var(--bento-ink)', padding: '13px 14px 14px' },
  rowHead: { display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minHeight: 44 },
  minBox: { width: 44, height: 44, borderRadius: 14, background: 'var(--bento-line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, flexShrink: 0 },
  minBoxOff: { background: 'none', boxShadow: 'inset 0 0 0 1.5px var(--medalha-glifo-apagado)' },
  minNum: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1, color: 'var(--bento-ink)' },
  minUnit: { fontFamily: FONT, fontSize: 8.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)' },
  minDash: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-t5)' },
  rowName: { display: 'block', fontFamily: FONT, fontSize: 14.5, letterSpacing: '-0.2px' },
  rowSummary: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.25, marginTop: 3 },
  switch: { width: 46, height: 28, borderRadius: 99, border: 'none', padding: 3, display: 'flex', alignItems: 'center', flexShrink: 0, cursor: 'pointer', boxSizing: 'border-box' },
  thumb: { width: 22, height: 22, borderRadius: '50%', display: 'block' },
  section: { borderTop: '1px solid var(--bento-line)', paddingTop: 14, marginTop: 14 },
  sectionTitle: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 9px' },
  sectionHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 },
  sectionValue: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)' },
  modeRow: { display: 'flex', gap: 8 },
  modeBtn: { flex: 1, minWidth: 0, borderRadius: 14, border: 'none', background: 'var(--bento-line)', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', minHeight: 44 },
  modeBtnOn: { background: 'var(--bento-ink)' },
  modeTitle: { fontFamily: FONT, fontSize: 13, fontWeight: 800 },
  modeSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500 },
  timeRow: { display: 'flex', alignItems: 'center', gap: 12 },
  timeHint: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-t3)' },
  stepper: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  stepMinus: { width: 40, height: 40, borderRadius: 13, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 },
  stepPlus: { width: 40, height: 40, borderRadius: 13, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 },
  stepValue: { minWidth: 54, textAlign: 'center', whiteSpace: 'nowrap' },
  stepNum: { fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '-0.8px', color: 'var(--bento-ink)' },
  stepUnit: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t3)' },
  daysNote: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '9px 0 0' },
  shortcut: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, height: 52, border: 'none', borderTop: '1px solid var(--bento-line)', background: 'none', padding: '4px 0 0', marginTop: 14, textAlign: 'left', cursor: 'pointer' },
  shortcutTitle: { display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)' },
  shortcutSub: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', marginTop: 2 },
  warning: { margin: '12px 0 0', borderRadius: 12, background: 'var(--bento-sand)', padding: '10px 12px', fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink-strong)' },
  list: { borderRadius: 24, background: 'var(--bento-card)', padding: '6px 18px', marginTop: 2, flexShrink: 0 },
  listRow: { width: '100%', height: 56, display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' },
  listTitle: { display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)' },
  listSub: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', marginTop: 2 },
  footer: { flex: 'none', background: 'var(--bento-bg)', borderTop: '1px solid rgba(0,0,0,.06)', padding: '12px 20px calc(22px + var(--safe-bottom))' },
  changesLine: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t2)', textAlign: 'center', margin: '0 0 9px' },
  saveError: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-destructive)', textAlign: 'center', margin: '0 0 9px' },
  saveOff: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--medalha-glifo-apagado)', fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-t4)' },
  saveOn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  veil: { position: 'absolute', inset: 0, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', zIndex: 5 },
  sheetTitle: { fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--bento-ink)', margin: 0 },
  sheetSub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '4px 0 6px' },
  sheetRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' },
  sheetRowTitle: { display: 'block', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)' },
  sheetRowSub: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', marginTop: 2 },
  sheetDone: { width: '100%', height: 52, borderRadius: 17, border: 'none', background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer', marginTop: 10 },
  dialog: { width: '100%', background: '#fff', borderRadius: '32px 32px 0 0', padding: '24px 20px calc(24px + var(--safe-bottom))', boxShadow: '0 -18px 40px rgba(0,0,0,.18)' },
  dialogTitle: { fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--bento-ink)', margin: '0 0 16px' },
  dialogRow: { display: 'flex', gap: 10 },
  dialogSecondary: { flex: 1, height: 48, borderRadius: 16, border: 'none', background: 'var(--bento-line)', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  dialogPrimary: { flex: 1, height: 48, borderRadius: 16, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
}
