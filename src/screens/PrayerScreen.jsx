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
import { getMyPrayerRequests, getSupplicationRequests, markPraying } from '../groups/prayerRequestsStore'
import { originTimeLabel } from '../prayer/prayerRequestFormat'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { incrementPrayerStat } from '../prayer/prayerStatsStore'
import { logSessionSeconds } from '../metrics/sessionDurationStore'
import { playStageChime } from '../utils/chime'
import { useStepTimer } from '../timer/useStepTimer'
import { usePlanTotalToday } from '../timer/usePlanTotalToday'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import AddPrayerRequestSheet from '../components/prayer/AddPrayerRequestSheet'
import PremiumLockCard from '../components/PremiumLockCard'
import StepTimerCard from '../components/timer/StepTimerCard'

// Avatar da linha de Súplica (PD3) — cor pelo ORIGEM do pedido, não por
// quem é (areia grupo, pêssego amigo, F2EEE9 anônimo — handoff). Anônimo
// usa "AN" fixo (as duas primeiras letras da palavra em si, não iniciais
// de nome nenhum — não existe nome pra tirar iniciais de um anônimo).
function suplicaAvatar(r) {
  if (r.anonymous) return { initials: 'AN', bg: 'var(--bento-line)', color: 'var(--bento-t3)' }
  if (r.scope === 'friends') return { initials: avatarInitialsOf(r.authorName), bg: 'var(--bento-mark)', color: 'var(--bento-sand-icon)' }
  return { initials: avatarInitialsOf(r.authorName), bg: 'var(--bento-sand)', color: 'var(--bento-sand-ink)' }
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

  // Pedidos de oração — a linha-resumo (fora da Súplica) usa "meus + do meu
  // grupo" (mesma fonte de PD1). A etapa Súplica em si (PD3, handoff-
  // oracao-pedidos) é uma tela DIFERENTE — pedidos de OUTRAS pessoas
  // esperando oração, no máximo três, ordenados por quem recebeu menos
  // (getSupplicationRequests, RPC própria pra isso — nunca a mesma lista
  // de PD1, que é "os meus", não "pra eu orar").
  // Bug real (varredura geral, 2026-09-19): o próprio store
  // (prayerRequestsStore.js, comentário no topo do arquivo) já foi
  // corrigido nesta mesma sessão pra LANÇAR em vez de engolir erro de
  // leitura — exatamente pra distinguir "vazio de verdade" de "falha de
  // leitura". Mas esta tela (o passo Súplica da Oração) continuava com
  // `.catch(() => setX([]))`, jogando fora essa distinção de novo — uma
  // falha real mostrava "ninguém esperando oração" (suplicaEmpty), o
  // mesmo texto de "não tem pedido nenhum mesmo", sem aviso nenhum.
  const [requests, setRequests] = useState([])
  const [requestsLoadError, setRequestsLoadError] = useState(false)
  useEffect(() => {
    getMyPrayerRequests().then(setRequests).catch(err => { console.error('Failed to load prayer requests', err); setRequestsLoadError(true) })
  }, [])
  const activeRequests = requests.filter(r => r.status !== 'closed')
  const requestCounts = { active: activeRequests.length, group: activeRequests.filter(r => !r.isMine).length }

  const [suplicaRequests, setSuplicaRequests] = useState([])
  const [suplicaLoadError, setSuplicaLoadError] = useState(false)
  useEffect(() => {
    getSupplicationRequests(3).then(setSuplicaRequests).catch(err => { console.error('Failed to load supplication requests', err); setSuplicaLoadError(true) })
  }, [])

  // "Fazer pedido" direto na Súplica (pedido dela, 2026-09-12: "deixar o
  // campo de pedidos de oração aberto para adicionar novos") — antes esse
  // botão navegava pra fora (PrayerRequestsScreen, 36d) só pra abrir a
  // MESMA folha que já existia pronta (AddPrayerRequestSheet.jsx, comentário
  // dela mesma já dizia "aberta a partir da Súplica" — nunca tinha sido
  // ligada aqui). Reload da lista local ao criar, sem sair da oração.
  const [addRequestOpen, setAddRequestOpen] = useState(false)

  function handlePray(request) {
    setRequests(prev => prev.map(r => r.id === request.id
      ? { ...r, prayedToday: true, prayCount: r.isMine ? r.prayCount : r.prayCount + 1, diasOrados: r.isMine ? r.diasOrados + 1 : r.diasOrados }
      : r))
    markPraying(request.id).catch(err => console.error('Failed to mark praying', err))
  }

  // "Um toque marca que você orou" (PD3) — mesma marca-por-dia de sempre
  // (markPraying), só que na lista de Súplica, não na de PD1.
  function handleSuplicaPray(request) {
    setSuplicaRequests(prev => prev.map(r => r.id === request.id
      ? { ...r, prayingByMe: true, prayCount: r.prayCount + 1 }
      : r))
    markPraying(request.id).catch(err => console.error('Failed to mark praying (suplica)', err))
  }

  const zeroedStagesRef = useRef(new Set())

  // Detecta quando a etapa ACTS atual zera, pra tocar o chime — a lógica
  // de motor (running/elapsed/pausa por aba oculta/wake lock) agora é do
  // hook compartilhado (src/timer/useStepTimer.js).
  function handleTick(now) {
    if (method !== 'acts') return
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
  const { running, elapsedSeconds: elapsed, toggle: toggleRunning, pause, computeElapsed } = useStepTimer({ onTick: handleTick })
  const planPriorSeconds = usePlanTotalToday()
  const planSeconds = planPriorSeconds + elapsed

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
  const wholeProgress = Math.min(1, elapsed / TOTAL_SECONDS)
  // Chips do cronômetro compartilhado (StepTimerCard) — mesmos 4 estágios
  // do ACTS, usados tanto na etapa normal quanto na Súplica.
  const actsChipSteps = PRAYER_STAGES.map(s => ({ id: s.id, title: s.title[lang] ?? s.title.pt }))

  return (
    <div style={styles.screen}>
      {isSuplica ? (
        // PD3 — cabeçalho próprio (pd3-suplica-pedidos.png): pílula preta
        // "Oração · passo N de M" + "Pular" à direita, sem o título/
        // subtítulo empilhado das outras 3 etapas.
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={guided ? onExitGuided : onBack} aria-label={t('a11y.goBack', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
          </button>
          <div style={styles.stepPill}>
            <span style={styles.stepPillTitle}>{L('pageTitle')}</span>
            <span style={styles.stepPillSub}>{L('stepOf', { n: stepIdx + 1, total: todaysSteps.length })}</span>
          </div>
          <div style={{ flex: 1 }} />
          {/* "Pular avança sem marcar oração" (handoff Regra 5.8) — Súplica
              é sempre a última etapa do ACTS, então pular ela é terminar a
              oração sem interagir com a lista de pedidos (mesma ação de
              "Concluir", só que sem exigir que a pessoa veja a lista antes). */}
          <button style={styles.pularBtn} onClick={finishPrayer}>{L('pularBtn')}</button>
        </div>
      ) : (
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={guided ? onExitGuided : onBack} aria-label={t('a11y.goBack', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.title}>{L('pageTitle')}</p>
            <p style={styles.subtitle}>{L('stepOf', { n: stepIdx + 1, total: todaysSteps.length })} · {method === 'acts' ? L('methodSuffixActs') : L('methodSuffixFree')}</p>
          </div>
        </div>
      )}

      {method === 'acts' && (
        <div style={styles.wholeTrack}>
          <div style={{ ...styles.wholeFill, width: `${wholeProgress * 100}%` }} />
        </div>
      )}

      <div style={styles.body}>
        {/* Frase fixa — idêntica em 36b/36c, mas PD3 (Súplica) não a mostra
            (pd3-suplica-pedidos.png começa direto no cartão de progresso). */}
        {!isSuplica && (
          <div style={styles.fixedCard}>
            <p style={styles.fixedText}>{L('fixedVerse')}</p>
          </div>
        )}

        {isSuplica ? (
          <>
            <StepTimerCard
              lang={lang} steps={actsChipSteps} currentIndex={currentStageIdx}
              planSeconds={planSeconds} passoSeconds={elapsed} etapaSeconds={stageLocalElapsed}
              etapaDurationSeconds={stageDurations[currentStageIdx]}
              running={running} onToggle={toggleRunning} onStop={finishPrayer}
              playLabel={L('playBtn')} pauseLabel={L('pauseBtn')} justZeroed={justZeroed}
            />

            <div style={styles.suplicaBlackCard}>
              <p style={styles.suplicaBlackLabel}>{L('suplicaTodayLabel')}</p>
              <p style={styles.suplicaBlackBody}>{L('suplicaTodayBody')}</p>
            </div>

            {/* Divisão de planos (2026): pedidos de oração é parte da
                Comunidade, então Premium — quem não assina vê só a frase
                fixa acima; a lista de pedidos de outras pessoas e "Fazer um
                pedido" ficam atrás deste cartão. */}
            {!session.hasPremium ? (
              <PremiumLockCard lang={lang} onNavigate={onNavigate} title={L('suplicaLockTitle')} sub={L('suplicaLockSub')} />
            ) : (
              <>
                <div style={styles.suplicaWaitingCard}>
                  <div style={styles.suplicaWaitingHead}>
                    <p style={styles.helpLabel}>{L('waitingLabel', { n: suplicaRequests.length })}</p>
                    <button type="button" style={styles.seeAllBtn} onClick={() => { pause(); onNavigate?.('prayerRequests') }}>{L('seeAllBtn')}</button>
                  </div>
                  {suplicaLoadError ? (
                    <p style={styles.requestsSub}>{L('suplicaLoadError')}</p>
                  ) : suplicaRequests.length === 0 ? (
                    <p style={styles.requestsSub}>{L('suplicaEmpty')}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {suplicaRequests.map((r, i) => {
                        const avatar = suplicaAvatar(r)
                        const origin = r.anonymous ? '' : r.scope === 'group' ? r.groupName : r.scope === 'friends' ? L('originFriend') : L('originDiary')
                        return (
                          <div key={r.id} style={{ ...styles.suplicaRow, ...(i > 0 ? { borderTop: '1px solid var(--bento-line)' } : {}) }}>
                            <div style={styles.suplicaRowHead}>
                              <span style={{ ...styles.suplicaAvatar, background: avatar.bg, color: avatar.color }}>{avatar.initials}</span>
                              <p style={styles.suplicaName}>
                                {r.anonymous ? L('anonymousLabel') : r.authorName}
                                <span style={styles.suplicaOrigin}> · {origin ? `${origin} · ` : ''}{originTimeLabel(r.createdAt, lang)}</span>
                              </p>
                            </div>
                            <p style={styles.suplicaBody}>{r.body}</p>
                            <div style={styles.suplicaActionRow}>
                              {r.prayingByMe ? (
                                <span style={styles.suplicaPrayedBtn}>
                                  <AppIcon name="Check" size={12} strokeWidth={3} color="var(--bento-sand-icon)" />
                                  {t('prayerRequests.prayedTodayBtn', undefined, lang)}
                                </span>
                              ) : (
                                <button type="button" style={styles.suplicaPrayBtn} onClick={() => handleSuplicaPray(r)}>
                                  <AppIcon name="Check" size={12} strokeWidth={3} color="var(--bento-accent)" />
                                  {L('prayShortBtn')}
                                </button>
                              )}
                              <span style={styles.suplicaPrayedCount}>{L(r.prayCount === 1 ? 'prayedCountOne' : 'prayedCountMany', { n: r.prayCount })}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <button type="button" style={styles.suplicaComposeRow} onClick={() => setAddRequestOpen(true)}>
                  <span style={styles.requestsIcon}><AppIcon name="Plus" size={16} strokeWidth={2.4} color="var(--bento-sand-icon)" /></span>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <p style={styles.requestsTitle}>{t('addPrayerRequest.title', undefined, lang)}</p>
                    <p style={styles.requestsSub}>{L('suplicaComposeSub')}</p>
                  </div>
                  <AppIcon name="ChevronRight" size={15} color="var(--bento-t5)" />
                </button>
              </>
            )}
          </>
        ) : method === 'acts' ? (
          <>
            {/* Cronômetro compartilhado (mesmo padrão de Reflexão/Leitura
                agora) — chips de etapa + os três tempos (plano/passo/
                etapa) + tocar/pausar/parar. Nome e explicação da etapa
                atual entram como children, dentro do mesmo cartão. */}
            <StepTimerCard
              lang={lang} steps={actsChipSteps} currentIndex={currentStageIdx}
              planSeconds={planSeconds} passoSeconds={elapsed} etapaSeconds={stageLocalElapsed}
              etapaDurationSeconds={stageDurations[currentStageIdx]}
              running={running} onToggle={toggleRunning} onStop={finishPrayer}
              playLabel={L('playBtn')} pauseLabel={L('pauseBtn')} justZeroed={justZeroed}
            >
              <p style={styles.stageTitle}>{stageTitle}</p>
              <p style={styles.stageExplanation}>{stage.explanation[lang] ?? stage.explanation.pt}</p>
            </StepTimerCard>

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
            {/* Oração livre — sem etapas, mesmo cronômetro compartilhado
                (etapa = o passo inteiro, contagem regressiva contra o
                total configurado, igual sempre foi). */}
            <StepTimerCard
              lang={lang} steps={null}
              planSeconds={planSeconds} passoSeconds={elapsed} etapaSeconds={elapsed}
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
          </>
        )}

        {/* Pedidos de oração — linha navegável → PrayerRequestsScreen (PD1).
            Na etapa Súplica (PD3) o corpo inteiro já é outro (acima) — essa
            linha-resumo só aparece nas outras 3 etapas do ACTS/oração livre. */}
        {!isSuplica && (
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
        )}
      </div>

      <div style={styles.footer}>
        {isSuplica ? (
          // PD3 — "Concluir e ir para a leitura" (fixo), sempre um botão só
          // (Súplica é a última etapa do ACTS, não tem "próxima etapa").
          <button style={{ ...styles.nextBtn, flex: 1 }} onClick={finishPrayer}>
            <span>{L('finishToReadingBtn')}</span>
            <span>→</span>
          </button>
        ) : method === 'acts' && !isLastStage ? (
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

      {addRequestOpen && (
        <AddPrayerRequestSheet
          lang={lang}
          authUser={authUser}
          hasAI={session.hasAI}
          onClose={() => setAddRequestOpen(false)}
          onCreated={() => {
            setAddRequestOpen(false)
            getMyPrayerRequests().then(setRequests).catch(() => {})
          }}
        />
      )}
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

  wholeTrack: { flexShrink: 0, height: 4, background: 'var(--bento-line)', margin: '0 20px' },
  wholeFill: { height: '100%', background: 'var(--bento-accent)', borderRadius: 99 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  fixedCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '16px 18px', borderLeft: '3px solid var(--bento-sand-icon)' },
  fixedText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--bento-sand-ink-strong)', margin: 0 },

  // Chips de etapa, cartão do cronômetro (relógio grande, tocar/pausar,
  // parar, progresso) agora moram em StepTimerCard.jsx — só o título e a
  // explicação de cada etapa continuam aqui, como children do card.
  stageTitle: { fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: '-.8px', color: '#fff', margin: '0 0 12px' },
  stageExplanation: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,.75)', margin: 0 },

  helpCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px' },
  helpLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  starterLine: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, fontStyle: 'italic', color: 'var(--bento-t2)', margin: '0 0 8px' },
  textarea: { width: '100%', minHeight: 84, boxSizing: 'border-box', border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: '12px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)', resize: 'vertical', margin: '4px 0 10px' },
  privacyNote: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t4)', margin: 0 },

  requestsRow: { width: '100%', boxSizing: 'border-box', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bento-card)', borderRadius: 22, padding: '16px 18px' },
  requestsIcon: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  requestsTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 2px' },
  requestsSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  skipBtn: { flexShrink: 0, height: 54, padding: '0 18px', borderRadius: 18, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },
  nextBtn: { flex: 1, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },

  // PD3 — Súplica (pd3-suplica-pedidos.png), casca própria.
  stepPill: { flexShrink: 0, height: 34, borderRadius: 14, background: 'var(--bento-ink)', display: 'flex', alignItems: 'baseline', gap: 6, padding: '0 14px' },
  stepPillTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: '#fff' },
  stepPillSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.55)' },
  pularBtn: { flexShrink: 0, height: 34, padding: '0 16px', borderRadius: 14, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },

  // Barras de progresso da Súplica (4 etapas) e o relógio próprio dela
  // também saíram — usa o mesmo StepTimerCard das outras etapas agora.
  suplicaBlackCard: { borderRadius: 22, background: 'var(--bento-ink)', padding: '16px 18px' },
  suplicaBlackLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: '0 0 8px' },
  suplicaBlackBody: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, lineHeight: 1.5, color: '#fff', margin: 0 },

  suplicaWaitingCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px' },
  suplicaWaitingHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 6px' },
  seeAllBtn: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-ink)' },
  suplicaRow: { padding: '12px 0' },
  suplicaRowHead: { display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 8px' },
  suplicaAvatar: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 12.5, fontWeight: 800 },
  suplicaName: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  suplicaOrigin: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t4)' },
  suplicaBody: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t2)', margin: '0 0 10px' },
  suplicaActionRow: { display: 'flex', alignItems: 'center', gap: 10 },
  suplicaPrayBtn: { flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 11, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: '#fff' },
  suplicaPrayedBtn: { flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 11, background: 'var(--bento-sand)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-sand-ink)' },
  suplicaPrayedCount: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t5)' },

  suplicaComposeRow: { width: '100%', boxSizing: 'border-box', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bento-card-soft)', borderRadius: 22, padding: '16px 18px' },
}
