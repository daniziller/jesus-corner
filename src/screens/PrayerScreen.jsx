// PrayerScreen.jsx — Oração. Dois jeitos, decididos em Meu Plano/Ajustar e
// só LIDOS aqui:
//
//   · ACTS (S1/S2, handoff-passos-pedidos-53-54 §2–§3): cada etapa numa
//     tela — cabeçalho com o relógio da oração inteira e a barra do dia, a
//     trilha das quatro etapas, o cartão preto com a orientação e, embaixo,
//     o cartão de escrita (Adoração, Confissão, Gratidão) ou a lista de
//     pedidos (Súplica). O botão laranja leva à etapa seguinte e, na
//     última, termina a oração.
//   · livre (36c, handoff-passos-36-37): sem etapas — não mudou.
//
// O motor é o mesmo dos dois: o relógio (useStepTimer), o aviso quando uma
// etapa zera, o tempo que sobra de uma etapa pulada indo para as
// seguintes, e o que acontece ao terminar (finishPrayer).
//
// Privacidade: o que a pessoa escreve nas etapas vive só no estado desta
// tela (stageNotes) — não é gravado nem enviado a lugar nenhum, e some
// quando a oração termina.
import { useState, useEffect, useRef, useMemo } from 'react'
import { PRAYER_STAGES } from '../prayer/prayerStages'
import { getPrayerMethod } from '../prayer/prayerMethodStore'
import { getMyPrayerRequests } from '../groups/prayerRequestsStore'
import { incrementPrayerStat } from '../prayer/prayerStatsStore'
import { logSessionSeconds } from '../metrics/sessionDurationStore'
import { playStageChime } from '../utils/chime'
import { useStepTimer } from '../timer/useStepTimer'
import { usePlanTotalToday } from '../timer/usePlanTotalToday'
import { resolveMinutes } from '../meuPlano/meuPlanoMath'
import { dayBarSegments, dayBarAria, stepSubtitle, actsTrail, actsTrailAria, stageCardLabel, actsFooter } from '../passos/passosMath'
import { useKeyboardInset } from '../passos/useKeyboardInset'
import { usePedidos } from '../pedidos/usePedidos'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import FolhaFazerPedido from '../components/pedidos/FolhaFazerPedido'
import PremiumLockCard from '../components/PremiumLockCard'
import StepTimerCard from '../components/timer/StepTimerCard'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import RelogioDoPasso from '../components/passos/RelogioDoPasso'
import TrilhaActs from '../components/passos/TrilhaActs'
import CartaoAgora from '../components/passos/CartaoAgora'
import CartaoDeEscrita from '../components/passos/CartaoDeEscrita'
import PedidosDaSuplica from '../components/passos/PedidosDaSuplica'
import RodapeDoPasso from '../components/passos/RodapeDoPasso'

// `active`: a tela está na frente (ela fica montada, escondida, depois da
// primeira visita — ver prayerVisitedRef em App.jsx). `pedidosApi`,
// `formApi` e `initialStage` só existem para a pré-visualização de
// desenvolvimento.
export default function PrayerScreen({ session, authUser, stepMinutes, active = true, onPrayerCompleted, onNavigate, onExitGuided, onBack, timerControlsRef, onTimerRunningChange, pedidosApi, formApi, initialStage = 0 }) {
  const { lang } = session
  const guided = session.guided?.step === 'prayer'
  const L = (k, vars) => t(`prayer.${k}`, vars, lang)
  const email = authUser?.email
  const method = useMemo(getPrayerMethod, [])
  const acts = method === 'acts'
  const totalMinutes = stepMinutes?.prayer ?? session.plan.prayerMinutes
  const TOTAL_SECONDS = totalMinutes * 60

  // ACTS: duração de cada etapa (segundos) — começa igual (total ÷ 4),
  // "Pular" redistribui o que sobrou da etapa atual pelas seguintes (ver
  // advanceStage abaixo). currentStageIdx só avança por toque (etapa que
  // zera não avança sozinha — o relógio só segue contando).
  const baseStageSeconds = Math.round(TOTAL_SECONDS / 4)
  const [stageDurations, setStageDurations] = useState(() => [baseStageSeconds, baseStageSeconds, baseStageSeconds, baseStageSeconds])
  const [currentStageIdx, setCurrentStageIdx] = useState(initialStage)
  const [stageElapsedBefore, setStageElapsedBefore] = useState(0)
  const [stageNotes, setStageNotes] = useState({})
  const [freeNote, setFreeNote] = useState('')
  const [justZeroed, setJustZeroed] = useState(false)

  // ACTS — os pedidos da Súplica (S2): os meus, os dos meus grupos e os dos
  // meus amigos, com o mesmo "orei" da lista de pedidos. Pedidos de oração
  // são da Comunidade, então Premium: quem não assina não carrega a lista.
  const pedidos = usePedidos({ api: pedidosApi, enabled: acts && !!session.hasPremium })

  // Oração livre — a linha-resumo "Pedidos de oração" (36c, sem mudança).
  // Falha de leitura não é "nenhum pedido": o store lança, e a linha avisa.
  const [requests, setRequests] = useState([])
  const [requestsLoadError, setRequestsLoadError] = useState(false)
  useEffect(() => {
    if (acts) return
    getMyPrayerRequests().then(setRequests).catch(err => { console.error('Failed to load prayer requests', err); setRequestsLoadError(true) })
  }, [acts])
  const activeRequests = requests.filter(r => r.status !== 'closed')
  const requestCounts = { active: activeRequests.length, group: activeRequests.filter(r => !r.isMine).length }

  // "Fazer um pedido" sem sair da oração — ao guardar, a lista recarrega
  // com o pedido novo.
  const [addRequestOpen, setAddRequestOpen] = useState(false)

  const zeroedStagesRef = useRef(new Set())

  // Detecta quando a etapa ACTS atual zera, pra tocar o chime — a lógica
  // de motor (running/elapsed/pausa por aba oculta/wake lock) é do hook
  // compartilhado (src/timer/useStepTimer.js).
  function handleTick(now) {
    if (!acts) return
    const stageLocal = now - stageElapsedBefore
    const remaining = stageDurations[currentStageIdx] - stageLocal
    if (remaining <= 0 && !zeroedStagesRef.current.has(currentStageIdx)) {
      zeroedStagesRef.current.add(currentStageIdx)
      navigator.vibrate?.(200)
      playStageChime()
      setJustZeroed(true)
      setTimeout(() => setJustZeroed(false), 700)
    }
  }
  const { running, elapsedSeconds: elapsed, start, toggle: toggleRunning, pause, computeElapsed } = useStepTimer({ onTick: handleTick })
  const planPriorSeconds = usePlanTotalToday()
  const planSeconds = planPriorSeconds + elapsed

  // ACTS: o relógio começa a contar quando a tela aparece — o cabeçalho
  // novo não tem botão de iniciar, só a pílula, que pausa e retoma. Uma
  // vez só: quem pausa (ou sai do app, que pausa) retoma pelo toque.
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (!acts || !active || autoStartedRef.current) return
    autoStartedRef.current = true
    start()
  }, [acts, active, start])

  // Avança pra próxima etapa. `redistribute`=true (Pular) devolve o que
  // sobrou da etapa atual pras seguintes; o botão nomeado (ex.:
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

  // Ao trocar de etapa, a tela volta ao topo.
  const bodyRef = useRef(null)
  useEffect(() => { bodyRef.current?.scrollTo?.(0, 0) }, [currentStageIdx])

  function setStageNote(text) {
    const stage = PRAYER_STAGES[currentStageIdx]
    setStageNotes(prev => ({ ...prev, [stage.id]: text }))
  }

  // Seta de voltar em modo guiado (varredura 2026-10-25): onExitGuided só
  // zera o fluxo, não navega — parecia morta no 1º toque. Sai do modo
  // guiado E volta.
  function handleBack() {
    if (guided) onExitGuided?.()
    onBack?.()
  }

  function finishPrayer() {
    pause()
    logSessionSeconds('prayer', elapsed).catch(err => console.error('Failed to log prayer session seconds', err))
    incrementPrayerStat(email, 'timerCompletions').catch(() => {})
    onPrayerCompleted?.()
  }

  // Pedido dela (2026-10-22): o relógio da Oração já continua contando
  // em segundo plano ao trocar de aba (a tela fica sempre montada, ver
  // prayerVisitedRef em App.jsx) — faltava só um jeito de VER isso de
  // outra aba. `timerControlsRef` (dono é o App, ver lá) guarda os
  // controles pro pill flutuante global ler/chamar de fora; reescrever
  // a cada render é de graça (mesma técnica de prayerVisitedRef — sem
  // efeito, sem re-render extra). O efeito só avisa o App quando
  // `running` muda de VERDADE (liga/pausa), não a cada tick de 250ms.
  if (timerControlsRef) {
    timerControlsRef.current = { toggle: toggleRunning, finish: finishPrayer, computeElapsed, totalSeconds: TOTAL_SECONDS, label: L('pageTitle') }
  }
  useEffect(() => { onTimerRunningChange?.(running) }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  // O teclado passa por cima da página: o fundo da tela sobe com ele, e o
  // rodapé e o campo ficam à vista.
  const keyboardInset = useKeyboardInset()

  if (acts) {
    const stage = PRAYER_STAGES[currentStageIdx]
    const isSuplica = stage.id === 'suplica'
    const footer = actsFooter(PRAYER_STAGES, currentStageIdx, lang)
    return (
      <div style={{ ...styles.screen, paddingBottom: keyboardInset, boxSizing: 'border-box' }}>
        <CabecalhoDoPasso
          title="Oração" subtitle={stepSubtitle(session.todaysSteps, 'prayer', 'ACTS')}
          onBack={handleBack} backLabel={t('a11y.goBack', undefined, lang)}
          clock={<RelogioDoPasso totalSeconds={TOTAL_SECONDS} elapsedSeconds={elapsed} running={running} onToggle={toggleRunning} flash={justZeroed} />}
          segments={dayBarSegments({ todaysSteps: session.todaysSteps, minutes: resolveMinutes(stepMinutes, session.plan), dayEntry: session.todayRoutine, current: 'prayer' })}
          barLabel={dayBarAria(session.todaysSteps, 'prayer')}
        />

        <div ref={bodyRef} style={styles.actsBody}>
          <TrilhaActs trail={actsTrail(PRAYER_STAGES, currentStageIdx, lang)} ariaLabel={actsTrailAria(PRAYER_STAGES, currentStageIdx, lang)} />
          <CartaoAgora
            label={stageCardLabel(currentStageIdx, PRAYER_STAGES.length, stageDurations[currentStageIdx])}
            title={stage.title[lang] ?? stage.title.pt}
            text={stage.explanation[lang] ?? stage.explanation.pt}
          />
          {!isSuplica ? (
            <CartaoDeEscrita
              key={stage.id}
              starters={stage.starters[lang] ?? stage.starters.pt}
              value={stageNotes[stage.id] ?? ''} onChange={setStageNote}
            />
          ) : !session.hasPremium ? (
            <PremiumLockCard lang={lang} onNavigate={onNavigate} title={L('suplicaLockTitle')} sub={L('suplicaLockSub')} />
          ) : (
            <PedidosDaSuplica
              list={pedidos.list} loading={pedidos.loading} error={pedidos.error} sessionMarks={pedidos.sessionMarks}
              onOrar={pedidos.orar} onDesfazer={pedidos.desfazer} onAdd={() => setAddRequestOpen(true)}
              onOpenAll={() => { pause(); onNavigate?.('prayerRequests') }}
            />
          )}
        </div>

        <RodapeDoPasso
          secondary={{ label: footer.skip, onClick: footer.last ? finishPrayer : () => advanceStage(true) }}
          primary={{ label: footer.primary, onClick: footer.last ? finishPrayer : () => advanceStage(false) }}
        />

        {addRequestOpen && (
          <FolhaFazerPedido
            lang={lang} authUser={authUser} hasAI={session.hasAI} api={formApi}
            onClose={() => setAddRequestOpen(false)}
            onCreated={() => { setAddRequestOpen(false); pedidos.reload() }}
          />
        )}
      </div>
    )
  }

  // ── Oração livre (36c) — sem mudança ──────────────────────────────────
  // "passo N de M" do cabeçalho — sempre os passos de HOJE (session.
  // todaysSteps, App.jsx), não só dentro do modo guiado: Oração pode ser o
  // único passo restante hoje e nunca entrar em guidedFlow (ver
  // startGuidedRoutine em App.jsx), mas o cabeçalho sempre mostra a
  // posição mesmo assim.
  const todaysSteps = session.todaysSteps ?? ['prayer']
  const stepIdx = Math.max(0, todaysSteps.indexOf('prayer'))
  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={handleBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.title}>{L('pageTitle')}</p>
          <p style={styles.subtitle}>{L('stepOf', { n: stepIdx + 1, total: todaysSteps.length })} · {L('methodSuffixFree')}</p>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.fixedCard}>
          <p style={styles.fixedText}>{L('fixedVerse')}</p>
        </div>

        {/* Sem etapas: o cronômetro compartilhado conta o passo inteiro,
            em contagem regressiva contra o total configurado. */}
        <StepTimerCard
          lang={lang}
          planSeconds={planSeconds} etapaSeconds={elapsed}
          etapaDurationSeconds={TOTAL_SECONDS}
          running={running} onToggle={toggleRunning} onStop={finishPrayer}
          playLabel={L('playBtn')} pauseLabel={L('pauseBtn')}
        />

        <div style={styles.helpCard}>
          <p style={styles.helpLabel}>{L('freeNoteLabel')}</p>
          <textarea
            style={styles.textarea}
            placeholder={L('freeWritePlaceholder')}
            value={freeNote}
            onChange={e => setFreeNote(e.target.value)}
          />
        </div>

        {/* Pedidos de oração — linha navegável → PrayerRequestsScreen. */}
        <button type="button" style={styles.requestsRow} onClick={() => onNavigate?.('prayerRequests')}>
          <span style={styles.requestsIcon}><AppIcon name="Heart" size={16} color="var(--bento-sand-icon)" /></span>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <p style={styles.requestsTitle}>{L('requestsRowTitle')}</p>
            <p style={styles.requestsSub}>
              {requestsLoadError ? L('suplicaLoadError') : (
                <>
                  {L(requestCounts.active === 1 ? 'requestsCountActiveOne' : 'requestsCountActiveMany', { n: requestCounts.active })}
                  {requestCounts.group > 0 ? ` · ${L(requestCounts.group === 1 ? 'requestsCountGroupOne' : 'requestsCountGroupMany', { n: requestCounts.group })}` : ''}
                </>
              )}
            </p>
          </div>
          <AppIcon name="ChevronRight" size={15} color="var(--bento-t5)" />
        </button>
      </div>

      <div style={styles.footer}>
        <button style={{ ...styles.nextBtn, flex: 1 }} onClick={finishPrayer}>
          <span>{L('finishPrayingBtn')}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },

  // ACTS (S1/S2): o corpo rola entre o cabeçalho e o rodapé presos.
  actsBody: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 },

  // Oração livre (36c).
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.3px', margin: 0 },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  fixedCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '16px 18px', borderLeft: '3px solid var(--bento-sand-icon)' },
  fixedText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--bento-sand-ink-strong)', margin: 0 },

  helpCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px' },
  helpLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  textarea: { width: '100%', minHeight: 84, boxSizing: 'border-box', border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: '12px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)', resize: 'vertical', margin: '4px 0 10px' },

  requestsRow: { width: '100%', boxSizing: 'border-box', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bento-card)', borderRadius: 22, padding: '16px 18px' },
  requestsIcon: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  requestsTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 2px' },
  requestsSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  nextBtn: { flex: 1, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
}
