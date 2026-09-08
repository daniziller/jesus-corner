// PrayerScreen.jsx — Oração (pacote 36-37, handoff-passos-36-37/, quadros
// 36b ACTS e 36c livre). Reescreve por inteiro a versão anterior (26a/26h):
// o método (ACTS ou livre) agora é decidido em Meu Plano/Ajustar (35c) e só
// LIDO aqui — sem chip pra trocar dentro da execução —, cada etapa do ACTS
// ganha sua PRÓPRIA tela em vez de aparecer como 4 linhas juntas, e o
// relógio se divide em dois: a pílula do cabeçalho conta a ETAPA, o filete
// abaixo conta a ORAÇÃO INTEIRA. RoutineStepSwitcher saiu — o quadro não
// mostra (o botão único de Meu Plano já emenda os passos sozinho).
//
// Sem persistência ainda para o que a pessoa escreve nos campos "comece
// assim"/"anote algo" — o quadro só promete privacidade ("é só seu"), não
// pede uma Biblioteca de orações; fica como texto local da sessão, perdido
// ao sair da tela. Se ela quiser guardar isso de verdade depois, é um
// pacote à parte (store novo).
import { useState, useEffect, useRef, useMemo } from 'react'
import { PRAYER_STAGES } from '../prayer/prayerStages'
import { getPrayerMethod } from '../prayer/prayerMethodStore'
import { getMyPrayerRequests, markPraying } from '../groups/prayerRequestsStore'
import { incrementPrayerStat } from '../prayer/prayerStatsStore'
import { logSessionSeconds } from '../metrics/sessionDurationStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import PrayerRequestCard from '../components/prayer/PrayerRequestCard'

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

// "2,5" — minutos de uma etapa, 1 casa decimal só quando precisa (vírgula
// em pt, ponto em en), usado nos chips e no rótulo da etapa atual.
function stageMinLabel(seconds, lang) {
  const min = Math.round((seconds / 60) * 10) / 10
  return min.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 1 })
}

export default function PrayerScreen({ session, authUser, stepMinutes, onPrayerCompleted, onContinueSession, onNavigate, onExitGuided, onBack }) {
  const { lang } = session
  const guided = session.guided?.step === 'prayer'
  const L = (k, vars) => t(`prayer.${k}`, vars, lang)
  const email = authUser?.email
  const method = useMemo(getPrayerMethod, [])
  const totalMinutes = stepMinutes?.prayer ?? session.plan.prayerMinutes
  const TOTAL_SECONDS = totalMinutes * 60

  // "passo N de M" do cabeçalho — sempre os passos de HOJE (session.
  // todaysSteps, App.jsx), não só dentro do modo guiado: Oração pode ser o
  // único passo restante hoje e nunca entrar em guidedFlow (ver
  // startGuidedRoutine em App.jsx), mas o cabeçalho do quadro sempre mostra
  // a posição mesmo assim.
  const todaysSteps = session.todaysSteps ?? ['prayer']
  const stepIdx = Math.max(0, todaysSteps.indexOf('prayer'))

  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  // ACTS: duração de cada etapa (segundos) — começa igual (total ÷ 4),
  // "Pular etapa" redistribui o que sobrou da etapa atual pelas seguintes
  // (ver skipStage abaixo). currentStageIdx só avança por toque (etapa que
  // zera não avança sozinha — só passa a contar pra cima).
  const baseStageSeconds = Math.round(TOTAL_SECONDS / 4)
  const [stageDurations, setStageDurations] = useState(() => [baseStageSeconds, baseStageSeconds, baseStageSeconds, baseStageSeconds])
  const [currentStageIdx, setCurrentStageIdx] = useState(0)
  const [stageElapsedBefore, setStageElapsedBefore] = useState(0)
  const [stageNotes, setStageNotes] = useState({})
  const [freeNote, setFreeNote] = useState('')
  const [justZeroed, setJustZeroed] = useState(false)

  // Pedidos de oração (36d, Bloco 2) — na etapa Súplica do ACTS a
  // linha-resumo vira a própria lista (ver isSuplica mais abaixo, no JSX);
  // nas outras etapas/oração livre continua só a linha-resumo → 36d.
  const [requests, setRequests] = useState([])
  useEffect(() => {
    getMyPrayerRequests().then(setRequests).catch(() => setRequests([]))
  }, [])
  const activeRequests = requests.filter(r => r.status !== 'closed')
  const requestCounts = { active: activeRequests.length, group: activeRequests.filter(r => !r.isMine).length }

  function handlePray(request) {
    setRequests(prev => prev.map(r => r.id === request.id
      ? { ...r, prayedToday: true, prayCount: r.isMine ? r.prayCount : r.prayCount + 1, diasOrados: r.isMine ? r.diasOrados + 1 : r.diasOrados }
      : r))
    markPraying(request.id).catch(err => console.error('Failed to mark praying', err))
  }

  const intervalRef = useRef(null)
  const startedAtRef = useRef(null)
  const accumulatedRef = useRef(0)
  const wakeLockRef = useRef(null)
  const zeroedStagesRef = useRef(new Set())

  function computeElapsed() {
    if (!startedAtRef.current) return accumulatedRef.current
    return accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000
  }

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch (err) {
      console.error('[PrayerScreen] wake lock request failed:', err.message)
    }
  }
  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  function pause() {
    accumulatedRef.current = computeElapsed()
    startedAtRef.current = null
    setRunning(false)
    releaseWakeLock()
    clearInterval(intervalRef.current)
  }

  function tick() {
    const now = computeElapsed()
    setElapsed(now)
    if (method === 'acts') {
      const stageLocal = now - stageElapsedBefore
      const remaining = stageDurations[currentStageIdx] - stageLocal
      if (remaining <= 0 && !zeroedStagesRef.current.has(currentStageIdx)) {
        zeroedStagesRef.current.add(currentStageIdx)
        navigator.vibrate?.(200)
        setJustZeroed(true)
        setTimeout(() => setJustZeroed(false), 700)
      }
    }
  }

  useEffect(() => {
    if (running) intervalRef.current = setInterval(tick, 250)
    else clearInterval(intervalRef.current)
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, stageElapsedBefore, currentStageIdx, stageDurations])

  // "Sair do app pausa" (handoff) — diferente do resto do app, este
  // cronômetro NÃO se recupera sozinho ao voltar: some da tela = pausa de
  // verdade, só retoma com um toque.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden' && running) pause()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  useEffect(() => () => releaseWakeLock(), [])

  function toggleRunning() {
    if (running) { pause(); return }
    startedAtRef.current = Date.now()
    setRunning(true)
    requestWakeLock()
  }

  // Avança pra próxima etapa. `redistribute`=true (Pular etapa) devolve o
  // que sobrou da etapa atual pras seguintes; o botão nomeado (ex.:
  // "Gratidão →") não mexe nas durações — só carrega o tempo REAL gasto.
  function advanceStage(redistribute) {
    const now = computeElapsed()
    const usedInStage = now - stageElapsedBefore
    if (redistribute) {
      const leftover = Math.max(0, stageDurations[currentStageIdx] - usedInStage)
      if (leftover > 0) {
        const remainingCount = stageDurations.length - currentStageIdx - 1
        if (remainingCount > 0) {
          const share = leftover / remainingCount
          setStageDurations(prev => prev.map((d, i) => (i > currentStageIdx ? d + share : d)))
        }
      }
    }
    setStageElapsedBefore(now)
    setCurrentStageIdx(idx => idx + 1)
  }

  function saveStageNote(text) {
    const stage = PRAYER_STAGES[currentStageIdx]
    setStageNotes(prev => ({ ...prev, [stage.id]: text }))
  }

  function finishPrayer() {
    pause()
    logSessionSeconds('prayer', elapsed).catch(err => console.error('Failed to log prayer session seconds', err))
    incrementPrayerStat(email, 'timerCompletions').catch(() => {})
    onPrayerCompleted?.()
  }

  const stage = PRAYER_STAGES[currentStageIdx]
  const stageTitle = stage.title[lang] ?? stage.title.pt
  const isLastStage = currentStageIdx === PRAYER_STAGES.length - 1
  const isSuplica = method === 'acts' && stage.id === 'suplica'
  const stageLocalElapsed = method === 'acts' ? elapsed - stageElapsedBefore : 0
  const stageRemaining = method === 'acts' ? Math.round(stageDurations[currentStageIdx] - stageLocalElapsed) : 0
  const stageOvertime = stageRemaining < 0
  const wholeProgress = Math.min(1, elapsed / TOTAL_SECONDS)
  const freeRemaining = Math.round(TOTAL_SECONDS - elapsed)
  const freeOvertime = freeRemaining < 0

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={guided ? onExitGuided : onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.title}>{L('pageTitle')}</p>
          <p style={styles.subtitle}>{L('stepOf', { n: stepIdx + 1, total: todaysSteps.length })} · {method === 'acts' ? L('methodSuffixActs') : L('methodSuffixFree')}</p>
        </div>
        {method === 'acts' && (
          <button style={{ ...styles.clockPill, ...(justZeroed ? styles.clockPillFlash : null) }} onClick={toggleRunning}>
            <AppIcon name="Timer" size={13} strokeWidth={2.4} color="var(--bento-accent)" />
            <span style={{ color: stageOvertime ? 'var(--bento-t3)' : '#fff' }}>{fmt(Math.abs(stageRemaining))}</span>
          </button>
        )}
      </div>

      {method === 'acts' && (
        <div style={styles.wholeTrack}>
          <div style={{ ...styles.wholeFill, width: `${wholeProgress * 100}%` }} />
        </div>
      )}

      <div style={styles.body}>
        {/* Frase fixa — idêntica em 36b, 36c e 36d, nunca muda. */}
        <div style={styles.fixedCard}>
          <p style={styles.fixedText}>{L('fixedVerse')}</p>
        </div>

        {method === 'acts' ? (
          <>
            {/* 4 chips de etapa — só status, sem interação (o quadro não
                mostra nenhum toque neles; a etapa em vista é sempre a
                atual do cronômetro). */}
            <div style={styles.chipsRow}>
              {PRAYER_STAGES.map((s, i) => {
                const st = i < currentStageIdx ? 'done' : i === currentStageIdx ? 'now' : 'later'
                const title = s.title[lang] ?? s.title.pt
                return (
                  <div key={s.id} style={{ ...styles.chip, ...(st === 'done' ? styles.chipDone : st === 'now' ? styles.chipNow : styles.chipLater) }}>
                    <p style={{ ...styles.chipTitle, color: st === 'done' ? 'var(--bento-sand-icon)' : st === 'now' ? '#fff' : 'var(--bento-t3)' }}>{title}</p>
                    <p style={{ ...styles.chipSub, color: st === 'done' ? 'var(--bento-sand-icon)' : st === 'now' ? 'rgba(255,255,255,.6)' : 'var(--bento-t4)' }}>
                      {st === 'done' ? L('stageDoneTag') : L('stageMinShort', { min: stageMinLabel(stageDurations[i], lang) })}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Etapa atual — nome + explicação de duas frases (texto fixo). */}
            <div style={styles.stageCard}>
              <p style={styles.stageLabel}>{L('stageLabel', { n: currentStageIdx + 1, min: stageMinLabel(stageDurations[currentStageIdx], lang) })}</p>
              <p style={styles.stageTitle}>{stageTitle}</p>
              <p style={styles.stageExplanation}>{stage.explanation[lang] ?? stage.explanation.pt}</p>
            </div>

            {/* "Se ajudar, comece assim" — 3 frases fixas + campo opcional. */}
            <div style={styles.helpCard}>
              <p style={styles.helpLabel}>{L('starterLabel')}</p>
              {(stage.starters[lang] ?? stage.starters.pt).map((line, i) => (
                <p key={i} style={styles.starterLine}>&ldquo;{line}&rdquo;</p>
              ))}
              <textarea
                style={styles.textarea}
                placeholder={L('writePlaceholder')}
                value={stageNotes[stage.id] ?? ''}
                onChange={e => saveStageNote(e.target.value)}
              />
              <p style={styles.privacyNote}>{L('privacyNote')}</p>
            </div>
          </>
        ) : (
          <>
            {/* Oração livre — bloco escuro com o relógio grande + folha. */}
            <div style={styles.freeCard}>
              <p style={styles.freeLabel}>{L('freeTimeLabel')}</p>
              <p style={{ ...styles.freeClock, color: freeOvertime ? 'var(--bento-t3)' : '#fff' }}>{fmt(Math.abs(freeRemaining))}</p>
              <button style={styles.freeSub} onClick={toggleRunning}>
                {running ? L('freeTimeSub', { n: totalMinutes }) : L('freeTimeSubPaused', { n: totalMinutes })}
              </button>
              <div style={styles.freeTrack}>
                <div style={{ ...styles.freeFill, width: `${Math.min(1, elapsed / TOTAL_SECONDS) * 100}%` }} />
              </div>
            </div>

            <div style={styles.helpCard}>
              <p style={styles.helpLabel}>{L('freeNoteLabel')}</p>
              <textarea
                style={styles.textarea}
                placeholder={L('freeWritePlaceholder')}
                value={freeNote}
                onChange={e => setFreeNote(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Pedidos de oração — linha navegável → 36d (PrayerRequestsScreen).
            Na etapa Súplica do ACTS a linha vira a própria lista, dentro
            da etapa (handoff: "esta linha vira a própria lista de
            pedidos") — mesmo cartão de 36d, sem folha de arquivar aqui
            (arquivar precisa da tela cheia, não faz sentido no meio da
            oração; quem quiser, entra em 36d pelo link "Ver todos"). */}
        {isSuplica ? (
          <div style={styles.inlineRequests}>
            <div style={styles.inlineRequestsHeader}>
              <p style={styles.helpLabel}>{t('prayerRequests.headerTitle', undefined, lang)}</p>
              <button style={styles.inlineSeeAll} onClick={() => onNavigate?.('prayerRequests')}>{t('prayerRequests.newBtn', undefined, lang)}</button>
            </div>
            {activeRequests.length === 0 ? (
              <p style={styles.requestsSub}>{t('prayerRequests.emptyActive', undefined, lang)}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeRequests.map(r => (
                  <PrayerRequestCard key={r.id} request={r} lang={lang} onPray={handlePray} onArchive={() => onNavigate?.('prayerRequests')} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <button type="button" style={styles.requestsRow} onClick={() => onNavigate?.('prayerRequests')}>
            <span style={styles.requestsIcon}><AppIcon name="Heart" size={16} color="var(--bento-sand-icon)" /></span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={styles.requestsTitle}>{L('requestsRowTitle')}</p>
              <p style={styles.requestsSub}>
                {L(requestCounts.active === 1 ? 'requestsCountActiveOne' : 'requestsCountActiveMany', { n: requestCounts.active })}
                {requestCounts.group > 0 ? ` · ${L(requestCounts.group === 1 ? 'requestsCountGroupOne' : 'requestsCountGroupMany', { n: requestCounts.group })}` : ''}
              </p>
            </div>
            <AppIcon name="ChevronRight" size={15} color="var(--bento-t5)" />
          </button>
        )}
      </div>

      <div style={styles.footer}>
        {method === 'acts' && !isLastStage ? (
          <>
            <button style={styles.skipBtn} onClick={() => advanceStage(true)}>{L('skipStageBtn')}</button>
            <button style={styles.nextBtn} onClick={() => advanceStage(false)}>
              <span>{PRAYER_STAGES[currentStageIdx + 1].title[lang] ?? PRAYER_STAGES[currentStageIdx + 1].title.pt}</span>
              <span>→</span>
            </button>
          </>
        ) : (
          <button style={{ ...styles.nextBtn, flex: 1 }} onClick={finishPrayer}>
            <span>{L('finishPrayingBtn')}</span>
            <span>→</span>
          </button>
        )}
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.3px', margin: 0 },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0' },
  clockPill: { flexShrink: 0, height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' },
  clockPillFlash: { background: 'var(--bento-accent)' },

  wholeTrack: { flexShrink: 0, height: 4, background: 'var(--bento-line)', margin: '0 20px' },
  wholeFill: { height: '100%', background: 'var(--bento-accent)', borderRadius: 99 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  fixedCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '16px 18px', borderLeft: '3px solid var(--bento-sand-icon)' },
  fixedText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--bento-sand-ink-strong)', margin: 0 },

  chipsRow: { display: 'flex', gap: 6 },
  chip: { flex: 1, minWidth: 0, borderRadius: 15, padding: '11px 10px' },
  chipDone: { background: 'var(--bento-sand)' },
  chipNow: { background: 'var(--bento-ink)' },
  chipLater: { background: 'var(--bento-line)' },
  chipTitle: { fontFamily: FONT, fontSize: 12, fontWeight: 800, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chipSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, margin: 0 },

  stageCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '20px 22px' },
  stageLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 8px' },
  stageTitle: { fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: '-.8px', color: '#fff', margin: '0 0 12px' },
  stageExplanation: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,.75)', margin: 0 },

  helpCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px' },
  helpLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  starterLine: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, fontStyle: 'italic', color: 'var(--bento-t2)', margin: '0 0 8px' },
  textarea: { width: '100%', minHeight: 84, boxSizing: 'border-box', border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: '12px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)', resize: 'vertical', margin: '4px 0 10px' },
  privacyNote: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t4)', margin: 0 },

  freeCard: { borderRadius: 26, background: 'var(--bento-ink)', padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  freeLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 10px' },
  freeClock: { fontFamily: FONT, fontSize: 56, fontWeight: 800, letterSpacing: '-1.5px', margin: '0 0 8px', fontVariantNumeric: 'tabular-nums' },
  freeSub: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: '0 0 16px' },
  freeTrack: { width: '100%', height: 6, borderRadius: 99, background: 'rgba(255,255,255,.14)' },
  freeFill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },

  requestsRow: { width: '100%', boxSizing: 'border-box', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bento-card)', borderRadius: 22, padding: '16px 18px' },
  requestsIcon: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  requestsTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 2px' },
  requestsSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },

  inlineRequests: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  inlineRequestsHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  inlineSeeAll: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-accent)' },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  skipBtn: { flexShrink: 0, height: 54, padding: '0 18px', borderRadius: 18, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },
  nextBtn: { flex: 1, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
}
