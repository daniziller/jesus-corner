// StudyProposalNewScreen.jsx — "Proposta" (turno 35, Bloco 4, tela 35e).
// Tela NOVA (não reaproveita StudyProposalScreen.jsx/22b — ver
// CreateAiStudyScreen.jsx pro porquê: aqui o destino é ai_studies/
// selectActiveStudy, não theme_plans/activeAltPlan.theme).
//
// Fiel ao quadro: TODOS os dias sempre visíveis (nunca "ver mais" — o
// próprio handoff pede isso explicitamente), sem seletor de "quantos dias"
// (a duração já foi decidida em 35d) e sem a seção "quem pode ver"/"fazer
// junto com"/tema do 22b antigo — 35e não tem nenhuma dessas no quadro; a
// única decisão de compartilhar é o toggle "Deixar público no banco" de
// 35d, já embutido no plano antes de chegar aqui.
//
// mode: 'generate' (estudo fresco, saído da IA — Refazer + trocar dia por
// dia disponíveis) | 'preview' (cartão de 35h: Jesus Corner/grupo/banco
// público — só "Começar", sem editar nada).
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function StudyProposalNewScreen({ session, plan, mode = 'generate', onBack, onRefazer, onSwapDay, onSaveForLater, onStart }) {
  const lang = session.lang
  const L = (k, vars) => t(`studyProposal.${k}`, vars, lang)
  const [swappingIndex, setSwappingIndex] = useState(null)
  const [refazing, setRefazing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [savingForLater, setSavingForLater] = useState(false)
  const [actionError, setActionError] = useState('')

  const passages = plan.passages ?? plan.sessions ?? []
  const totalMinutes = passages.reduce((sum, p) => sum + (p.minutes ?? 0), 0)
  const kindLabel = plan.format === 'book' ? L('kindBook') : plan.format === 'crossref' ? L('kindCrossref') : L('kindThematic')
  const canRegenerate = mode === 'generate' && !!plan.scope

  const startedToday = session.todaySession?.progress > 0
  // "Enquanto isso" (35e) — achado conferindo Hoje contra Meu Plano
  // (handoff-app-completo, 34b/34c): trilhas independentes, não existe
  // mais "a leitura pausa até o estudo acabar" (o quadro original do
  // pacote ainda mostra esse texto — "Gênesis pausa em 41..." —, mas ele
  // é anterior à decisão "34b/34c vencem — Meu Plano perde a pausa", que
  // tirou pausedAtBook/resumesAt de vez, ver activeStudyStore.js). O
  // aviso agora só tranquiliza que a leitura contínua não muda, sem
  // inventar uma data de retorno que não existe mais.
  const hasReadingPlan = !session.hasNoPlan

  async function handleSwap(index) {
    if (!canRegenerate || swappingIndex != null) return
    setSwappingIndex(index)
    setActionError('')
    try {
      await onSwapDay?.(index)
    } catch (err) {
      console.error('Failed to swap study day', err)
      setActionError(L('actionError'))
    } finally {
      setSwappingIndex(null)
    }
  }

  async function handleRefazer() {
    if (!canRegenerate || refazing) return
    setRefazing(true)
    setActionError('')
    try {
      await onRefazer?.()
    } catch (err) {
      console.error('Failed to redo study proposal', err)
      setActionError(L('actionError'))
    } finally {
      setRefazing(false)
    }
  }

  async function handleSaveForLater() {
    if (savingForLater) return
    setSavingForLater(true)
    try {
      await onSaveForLater?.()
    } finally {
      setSavingForLater(false)
    }
  }

  async function handleStart() {
    if (starting) return
    setStarting(true)
    try {
      await onStart?.(startedToday)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1 }}>
          <p style={s.headerTitle}>{L('pageTitle')}</p>
          <p style={s.headerSub}>{L('pageSub')}</p>
        </div>
        {canRegenerate && (
          <button style={s.refazerBtn} onClick={handleRefazer} disabled={refazing}>{refazing ? L('refazerBusy') : L('refazerBtn')}</button>
        )}
      </div>

      <div style={s.body}>
        <div style={s.darkCard}>
          <div style={s.darkLabelRow}>
            <span style={s.diamond} />
            <p style={s.darkLabel}>{L('metaLabel', { kind: kindLabel, n: passages.length, min: totalMinutes })}</p>
          </div>
          <p style={s.planTitle}>{plan.title}</p>
          {plan.overview && <p style={s.planOverview}>{plan.overview}</p>}
        </div>
        {actionError && <p style={s.errorText}>{actionError}</p>}

        {passages.map((p, i) => (
          <div key={p.id ?? i} style={s.dayRow}>
            <span style={s.dayNum}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.dayTitle}>{lang === 'en' ? (p.titleEn ?? p.title) : p.title}</p>
              {p.reason && <p style={s.daySub}>{p.reason}</p>}
            </div>
            {canRegenerate && (
              <button style={s.swapBtn} onClick={() => handleSwap(i)} disabled={swappingIndex != null} aria-label={L('swapAction')}>
                <AppIcon name="RefreshCw" size={13} strokeWidth={2} color={swappingIndex === i ? 'var(--bento-t5)' : 'var(--bento-t3)'} />
              </button>
            )}
          </div>
        ))}

        {/* "A regra de ouro" ficando visível — nenhuma referência não
            conferida chega até aqui (ver api/generate-theme-plan.js e
            api/regenerate-theme-passage.js: toda passagem é validada
            contra o texto real antes de entrar na proposta). */}
        <div style={s.verifiedRow}>
          <span style={s.verifiedIcon}><AppIcon name="Check" size={13} strokeWidth={2.6} color="var(--bento-t4)" /></span>
          <p style={s.verifiedText}>{passages.length === 1 ? L('verifiedLineOne') : L('verifiedLineMany', { n: passages.length })}</p>
        </div>

        {mode === 'generate' && hasReadingPlan && (
          <div style={s.sandCard}>
            <p style={s.sandLabel}>{L('meanwhileLabel')}</p>
            <p style={s.sandText}>{L('meanwhileTextIndependent')}</p>
          </div>
        )}
      </div>

      <div style={s.footer}>
        {mode === 'preview' ? (
          <button style={s.startBtn} onClick={handleStart} disabled={starting}>{L('previewStartBtn')}</button>
        ) : (
          <>
            <button style={s.saveBtn} onClick={handleSaveForLater} disabled={savingForLater}>{L('saveForLaterBtn')}</button>
            <button style={s.startBtn} onClick={handleStart} disabled={starting}>
              {startedToday ? L('startTomorrowBtn') : L('startTodayBtn')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  refazerBtn: { height: 34, flexShrink: 0, padding: '0 12px', borderRadius: 12, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  darkCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '20px 22px' },
  darkLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  diamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  darkLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  planTitle: { fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: '-.9px', color: '#fff', margin: '0 0 8px', lineHeight: 1.15 },
  planOverview: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.5)', margin: 0 },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#DC2626', margin: 0, textAlign: 'center' },

  dayRow: { borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  dayNum: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff' },
  dayTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  daySub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  swapBtn: { width: 32, height: 32, flexShrink: 0, borderRadius: 11, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  verifiedRow: { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 20, background: 'rgba(255,255,255,.6)', padding: '14px 18px' },
  verifiedIcon: { width: 26, height: 26, flexShrink: 0, borderRadius: 9, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  verifiedText: { flex: 1, fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },

  sandCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 18px', marginTop: 4 },
  sandLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 6px' },
  sandText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  saveBtn: { flexShrink: 0, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-card)', padding: '0 18px', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  startBtn: { flex: 1, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
}
