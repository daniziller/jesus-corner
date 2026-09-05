// PrayerScreen.jsx — Oração, passo 1 de 3 (reskin Bento, quadro 21a).
//
// Duas entradas possíveis: guiada (session.guided?.step === 'prayer',
// vinda de "Ler agora" em Meu Plano/4b — mostra o cabeçalho com chip
// escuro "passo N de 3" e "Pular") ou avulsa (tocando "Oração" direto,
// ex: RoutineStepSwitcher a partir de Leitura/Reflexão/Estudos — cabeçalho
// mais simples, sem "passo N de 3" nem "Pular", já que não há fluxo pra
// pular). O quadro só desenha a entrada guiada.
//
// Fora do quadro 21a, mantidos por serem funcionalidade real sem outro
// lugar pra morar: o seletor de duração total (5a hoje só EXIBE os minutos
// de cada passo, não deixa editar — ver AdjustPlanScreen.jsx) e a lista de
// pedidos de oração pessoais (PrayerRequests).
import { useState, useEffect, useRef, useMemo } from 'react'
import { ACTS_DATA, phaseMinutesFor } from '../components/acts/ActsCard'
import PrayerRequests from '../components/prayer/PrayerRequests'
import { incrementPrayerStat } from '../prayer/prayerStatsStore'
import { getSavedPrayerMinutes, setSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import RoutineStepSwitcher from '../components/RoutineStepSwitcher'

const DURATION_OPTIONS = [5, 10, 15, 20, 30]

// Fronteiras (em segundos, desde o início do cronômetro) de cada trecho do
// ACTS, a partir dos minutos por etapa do perfil de duração ativo. Usado
// pra saber, a qualquer momento, em qual trecho o cronômetro está de
// verdade e disparar o aviso sonoro na troca.
function computePhaseBounds(phaseMinutes) {
  let acc = 0
  const bounds = ACTS_DATA.map((d, i) => {
    const start = acc
    acc += phaseMinutes[i] * 60
    return { id: d.id, start }
  })
  return { bounds, totalSeconds: acc }
}

function phaseIndexAt(bounds, elapsedSeconds) {
  let idx = 0
  for (let i = 0; i < bounds.length; i++) {
    if (elapsedSeconds >= bounds[i].start) idx = i
  }
  return idx
}

export default function PrayerScreen({ session, authUser, onPrayerCompleted, onContinueSession, onNavigate, onExitGuided, onSkipStep, onBack }) {
  const { lang } = session
  const guided = session.guided?.step === 'prayer' ? session.guided : null
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  // Qual etapa o painel "para hoje" mostra — segue a etapa real do
  // cronômetro por padrão (tick() abaixo atualiza sozinho), mas tocar
  // numa fileira das 4 etapas prevalece (dá pra espiar o guia de uma
  // etapa futura/já feita sem mexer no cronômetro de verdade).
  const [previewPhaseId, setPreviewPhaseId] = useState(null)
  const [stepsExpanded, setStepsExpanded] = useState(false)
  // Duração total escolhida na hora — parte do que a pessoa já escolheu
  // antes (jc_prayer_minutes) ou, na primeira vez, do plano ativo. Trocar
  // aqui sobrescreve o padrão do plano até a pessoa escolher de novo.
  const [totalMinutes, setTotalMinutes] = useState(() => getSavedPrayerMinutes() ?? session.plan.prayerMinutes)
  const email = authUser?.email

  const phaseMinutes = useMemo(() => phaseMinutesFor(totalMinutes), [totalMinutes])
  const { bounds: PHASE_BOUNDS, totalSeconds: TOTAL_SECONDS } = useMemo(
    () => computePhaseBounds(phaseMinutes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalMinutes]
  )

  const intervalRef = useRef(null)
  // Tempo é calculado por relógio (Date.now()), não por contagem de ticks —
  // assim, se o navegador atrasar/pausar o setInterval em segundo plano (tela
  // bloqueada, troca de aba), o cronômetro se recupera sozinho no tick
  // seguinte em vez de "perder" o tempo que passou de verdade.
  const startedAtRef = useRef(null)
  const accumulatedRef = useRef(0)
  const wakeLockRef = useRef(null)
  const audioCtxRef = useRef(null)
  const announcedPhaseRef = useRef(-1)

  function computeElapsed() {
    if (!startedAtRef.current) return accumulatedRef.current
    return accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000
  }

  // AudioContext só pode ser criado/retomado a partir de um gesto real do
  // usuário (política de autoplay dos navegadores) — por isso isso só é
  // chamado dentro do clique de "Iniciar", nunca de dentro do tick.
  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
  }

  // Toque de aviso gerado na hora (sem depender de nenhum arquivo de áudio)
  // — uma sequência curta de tons. Duas notas pra troca de trecho, três pra
  // conclusão da oração inteira.
  function playChime(freqs) {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = now + i * 0.16
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.22, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.42)
    })
  }

  // Wake Lock mantém a TELA ligada enquanto o cronômetro roda — é o jeito
  // real de "continuar rodando com o celular inativo": o navegador libera
  // temporizadores e som quando a tela apaga, então em vez disso evitamos
  // que ela apague durante a oração. O navegador libera o wake lock sozinho
  // quando a aba fica invisível, por isso ele é readquirido no
  // visibilitychange (ver useEffect abaixo).
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch (err) {
      console.error('[PrayerScreen] wake lock request failed:', err.message)
    }
  }
  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  function tick() {
    const now = Math.min(computeElapsed(), TOTAL_SECONDS)
    setElapsed(now)

    const phaseIdx = phaseIndexAt(PHASE_BOUNDS, now)
    if (phaseIdx !== announcedPhaseRef.current) {
      const wasAlreadyAnnounced = announcedPhaseRef.current !== -1
      announcedPhaseRef.current = phaseIdx
      setPreviewPhaseId(null) // volta a seguir a etapa real
      if (wasAlreadyAnnounced) playChime([659, 880])
    }

    if (now >= TOTAL_SECONDS) {
      clearInterval(intervalRef.current)
      setRunning(false)
      releaseWakeLock()
      playChime([659, 880, 1047])
      incrementPrayerStat(email, 'timerCompletions').catch(err => {
        console.error('Failed to persist prayer stat', err)
      })
    }
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 250)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, email])

  // Ao voltar pra tela (ex: desbloqueou o celular) recalcula na hora em vez
  // de esperar o próximo tick, e readquire o wake lock que o navegador
  // liberou sozinho ao ficar em segundo plano.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && running) {
        tick()
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  useEffect(() => () => releaseWakeLock(), [])

  const remaining = Math.max(0, Math.round(TOTAL_SECONDS - elapsed))
  // Etapa real do cronômetro (independe do que está sendo espiado no
  // painel "para hoje") — é o que colore as 4 fileiras e a barra do topo,
  // no código de 3 estados do quadro 4b: areia = feita, preto = agora,
  // branco = depois.
  const realPhaseIdx = phaseIndexAt(PHASE_BOUNDS, elapsed)

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  function toggleRunning() {
    if (remaining <= 0) return
    if (running) {
      accumulatedRef.current = computeElapsed()
      startedAtRef.current = null
      setRunning(false)
      releaseWakeLock()
    } else {
      ensureAudioContext()
      startedAtRef.current = Date.now()
      setRunning(true)
      requestWakeLock()
      if (announcedPhaseRef.current === -1) {
        announcedPhaseRef.current = 0
      }
    }
  }

  // "Próxima etapa" (mockup 21a) — avança antes do tempo acabar. Pula pra
  // fronteira da próxima etapa (ou pro fim, na última — o que já completa a
  // oração pelo mesmo caminho do cronômetro normal, via tick()).
  function skipToNextPhase() {
    const nextBound = PHASE_BOUNDS[realPhaseIdx + 1]?.start ?? TOTAL_SECONDS
    accumulatedRef.current = nextBound
    if (running) startedAtRef.current = Date.now()
    tick()
  }

  // Troca a duração total escolhida — reinicia o cronômetro (os limites de
  // cada etapa mudam) e lembra a escolha pra próxima vez.
  function selectDuration(minutes) {
    if (minutes === totalMinutes) return
    clearInterval(intervalRef.current)
    releaseWakeLock()
    setRunning(false)
    setElapsed(0)
    accumulatedRef.current = 0
    startedAtRef.current = null
    announcedPhaseRef.current = -1
    setPreviewPhaseId(null)
    setTotalMinutes(minutes)
    setSavedPrayerMinutes(minutes)
  }

  // "Concluir e ir para a leitura" (rodapé fixo) — sempre disponível,
  // mesmo antes do cronômetro acabar: ninguém precisa do relógio pra saber
  // que terminou de orar. Marca o dia e, fora do fluxo guiado (que já leva
  // sozinho pro próximo passo via advanceGuided), navega direto pra leitura.
  function finishPrayer() {
    onPrayerCompleted?.()
    if (!guided) onContinueSession?.()
  }

  const previewIdx = previewPhaseId != null ? ACTS_DATA.findIndex(d => d.id === previewPhaseId) : realPhaseIdx
  const previewPhase = ACTS_DATA[previewIdx]
  const L = (k, vars) => t(`prayer.${k}`, vars, lang)

  const runBtnLabel = running ? L('pauseBtn') : elapsed > 0 ? L('resumeBtn') : L('startBtn')
  const runBtnIcon = running ? 'Pause' : 'Play'

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={guided ? onExitGuided : onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        {guided ? (
          <div style={styles.stepChip}>
            <span style={styles.stepChipTitle}>{L('pageTitle')}</span>
            <span style={styles.stepChipSub}>{L('stepOf', { n: guided.idx + 1, total: guided.total })}</span>
          </div>
        ) : (
          <p style={styles.plainTitle}>{L('pageTitle')}</p>
        )}
        <div style={{ flex: 1 }} />
        {guided && (
          <button style={styles.skipBtn} onClick={onSkipStep}>{L('skipStepBtn')}</button>
        )}
      </div>

      <div style={styles.body}>
        {/* Método ACTS · duração total — bloco branco com a barra de 4
            segmentos (uma por etapa) e o relógio grande da oração inteira. */}
        <div style={styles.methodCard}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.methodLabel}>{L('methodLabel', { n: totalMinutes })}</p>
            <div style={styles.segmentRow}>
              {ACTS_DATA.map((d, i) => (
                <div
                  key={d.id}
                  style={{
                    ...styles.segment,
                    background: i < realPhaseIdx ? 'var(--bento-sand-icon)' : i === realPhaseIdx ? 'var(--bento-accent)' : 'var(--bento-line)',
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={styles.methodTime}>{fmt(remaining)}</p>
            <p style={styles.methodTimeLabel}>{L('remainingShort')}</p>
          </div>
        </div>

        {/* As 4 etapas — código de 3 estados de 4b: areia (feita) / preto
            (agora) / branco translúcido (depois). Tocar numa fileira só
            troca o que o painel abaixo mostra — não mexe no cronômetro. */}
        {ACTS_DATA.map((d, i) => {
          const state = i < realPhaseIdx ? 'done' : i === realPhaseIdx ? 'now' : 'later'
          const title = d.title[lang] ?? d.title.pt
          return (
            <button
              key={d.id}
              style={{
                ...styles.phaseRow,
                ...(state === 'done' ? styles.phaseRowDone : state === 'now' ? styles.phaseRowNow : styles.phaseRowLater),
              }}
              onClick={() => setPreviewPhaseId(d.id)}
            >
              <div style={{
                ...styles.phaseLetter,
                background: state === 'done' ? 'var(--bento-sand-icon)' : state === 'now' ? 'var(--bento-accent)' : 'var(--bento-line)',
                color: state === 'done' ? 'var(--bento-sand)' : state === 'now' ? 'var(--bento-ink)' : 'var(--bento-t4)',
              }}>
                {d.letter}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={{ ...styles.phaseTitle, color: state === 'done' ? 'var(--bento-sand-ink-strong)' : state === 'now' ? '#fff' : 'var(--bento-t3)' }}>{title}</p>
                <p style={{ ...styles.phaseSub, color: state === 'done' ? 'var(--bento-sand-label)' : state === 'now' ? 'rgba(255,255,255,.5)' : 'var(--bento-t5)' }}>
                  {state === 'done' ? L('phaseStatusDone', { n: phaseMinutes[i] }) : state === 'now' ? L('phaseStatusNow', { n: phaseMinutes[i] }) : L('phaseStatusLater')}
                </p>
              </div>
              {state === 'done' && <AppIcon name="Check" size={15} strokeWidth={2.6} color="var(--bento-sand-icon)" />}
              {state === 'now' && <span style={styles.phaseNowClock}>{fmt(Math.max(0, Math.round((PHASE_BOUNDS[i + 1]?.start ?? TOTAL_SECONDS) - elapsed)))}</span>}
              {state === 'later' && <span style={styles.phaseLaterMin}>{phaseMinutes[i]} min</span>}
            </button>
          )
        })}

        {/* Painel "para hoje" — guia da etapa espiada (previewPhaseId) ou,
            por padrão, da etapa real em andamento. Conteúdo completo
            (3 passos + versículo) mantido atrás de "Ver os passos e o
            versículo" — o quadro só mostra uma frase, mas os passos/
            versículo já existiam no app (ActsCard.jsx) e não tinham pra
            onde ir sem essa expansão. */}
        <div style={styles.stagePanel}>
          <p style={styles.stagePanelLabel}>{L('phaseForToday', { stage: previewPhase.title[lang] ?? previewPhase.title.pt })}</p>
          <p style={styles.stagePanelText} dangerouslySetInnerHTML={{ __html: previewPhase.description[lang] ?? previewPhase.description.pt }} />

          <button style={styles.stepsToggle} onClick={() => setStepsExpanded(v => !v)}>
            {stepsExpanded ? L('hideStepsAndVerse') : L('viewStepsAndVerse')}
          </button>
          {stepsExpanded && (
            <div style={styles.stepsExpanded}>
              {(previewPhase.steps[lang] ?? previewPhase.steps.pt).map((step, i) => (
                <div key={i} style={styles.stepLine}>
                  <span style={styles.stepDot} />
                  <p style={styles.stepText} dangerouslySetInnerHTML={{ __html: step }} />
                </div>
              ))}
              <div style={styles.verseBox}>
                <p style={styles.verseText}>{previewPhase.verse[lang] ?? previewPhase.verse.pt}</p>
                <p style={styles.verseRef}>{previewPhase.verseRef[lang] ?? previewPhase.verseRef.pt}</p>
              </div>
            </div>
          )}

          {remaining > 0 && (
            <div style={styles.stagePanelActions}>
              <button style={styles.pauseBtn} onClick={toggleRunning}>
                <AppIcon name={runBtnIcon} size={13} color="#fff" />
                <span>{runBtnLabel}</span>
              </button>
              <button style={styles.nextPhaseBtn} onClick={skipToNextPhase}>
                <span>{L('nextPhaseBtn')}</span>
                <AppIcon name="ArrowRight" size={13} strokeWidth={2.6} color="var(--bento-ink)" />
              </button>
            </div>
          )}
        </div>

        {/* Duração total — fora do quadro 21a (ver comentário no topo do
            arquivo). */}
        <div style={styles.durationCard}>
          <p style={styles.durationLabel}>{L('durationSectionLabel')}</p>
          <div style={styles.durationRow}>
            {DURATION_OPTIONS.map(n => (
              <button
                key={n}
                style={{ ...styles.durationBtn, ...(n === totalMinutes ? styles.durationBtnActive : null) }}
                onClick={() => selectDuration(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <RoutineStepSwitcher
          session={session}
          activeStep="prayer"
          onGoReading={() => onContinueSession?.()}
          onGoStudy={() => onNavigate?.('studies')}
          onGoReflection={() => onNavigate?.('reflection')}
        />

        {/* Pedidos de oração pessoais — fora do quadro 21a, mantidos tal
            como já existiam (não reskinado por inteiro nesta passada). */}
        <div style={styles.requestsWrap}>
          <PrayerRequests authUser={authUser} lang={lang} />
        </div>
      </div>

      {/* Rodapé fixo — sempre ativo, mesmo antes do cronômetro acabar. */}
      <div style={styles.footer}>
        <button style={styles.finishBtn} onClick={finishPrayer}>
          <span>{L('finishAndReadBtn')}</span>
          <span style={styles.finishArrow}>→</span>
        </button>
      </div>
    </div>
  )
}

const styles = {
  // Sem barra inferior nesta tela (quadro 21a): o rodapé é "Concluir e ir
  // para a leitura" — mesmo padrão de AdjustPlanScreen.jsx (5a).
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepChip: { height: 34, borderRadius: 12, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' },
  stepChipTitle: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: '#fff' },
  stepChipSub: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.45)' },
  plainTitle: { fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.3px' },
  skipBtn: { height: 34, borderRadius: 12, border: 'none', background: 'var(--bento-card)', padding: '0 12px', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px', display: 'flex', flexDirection: 'column', gap: 8 },

  methodCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 },
  methodLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  segmentRow: { display: 'flex', gap: 3, height: 8 },
  segment: { flex: 1, borderRadius: 99, transition: 'background .3s' },
  methodTime: { fontFamily: 'var(--font-bento)', fontSize: 22, fontWeight: 800, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 3px', fontVariantNumeric: 'tabular-nums' },
  methodTimeLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t4)', margin: 0 },

  phaseRow: { width: '100%', borderRadius: 20, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  phaseRowDone: { background: 'var(--bento-sand)' },
  phaseRowNow: { background: 'var(--bento-ink)', padding: '16px 18px' },
  phaseRowLater: { background: 'var(--bento-card)' },
  phaseLetter: { width: 32, height: 32, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 },
  phaseTitle: { fontSize: 14.5, fontWeight: 800, lineHeight: 1.2, margin: '0 0 2px' },
  phaseSub: { fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, margin: 0 },
  phaseNowClock: { fontSize: 15, fontWeight: 800, color: 'var(--bento-accent)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
  phaseLaterMin: { fontSize: 12, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },

  stagePanel: { borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px', display: 'flex', flexDirection: 'column' },
  stagePanelLabel: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 10px' },
  stagePanelText: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,.9)', margin: 0 },
  stepsToggle: { alignSelf: 'flex-start', marginTop: 12, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-accent)' },
  stepsExpanded: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 },
  stepLine: { display: 'flex', gap: 9, alignItems: 'flex-start' },
  stepDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--bento-accent)', flexShrink: 0, marginTop: 6 },
  stepText: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.85)', margin: 0 },
  verseBox: { borderRadius: 14, background: 'rgba(255,255,255,.06)', padding: '12px 14px', marginTop: 4 },
  verseText: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.55, color: 'rgba(255,255,255,.8)', margin: '0 0 4px' },
  verseRef: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-accent)', margin: 0 },
  stagePanelActions: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 },
  pauseBtn: { flex: 1, height: 44, borderRadius: 14, border: 'none', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: '#fff' },
  nextPhaseBtn: { flex: 1, height: 44, borderRadius: 14, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)' },

  durationCard: { borderRadius: 20, background: 'var(--bento-card)', padding: '14px 18px' },
  durationLabel: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 8px' },
  durationRow: { display: 'flex', gap: 6, background: 'var(--bento-line)', borderRadius: 12, padding: 4 },
  durationBtn: { flex: 1, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', background: 'transparent', transition: 'background .15s, color .15s' },
  durationBtnActive: { background: 'var(--bento-ink)', color: '#fff' },

  requestsWrap: { marginTop: 4 },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  finishBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', boxShadow: '0 10px 26px rgba(240,102,43,.35)' },
  finishArrow: { fontSize: 15, fontWeight: 700 },
}
