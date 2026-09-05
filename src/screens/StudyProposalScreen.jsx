// StudyProposalScreen.jsx — "Proposta" (quadro 22b). A IA propõe, a
// pessoa aprova: mostra o plano gerado em CreateStudyScreen.jsx (22a),
// ainda não salvo, com a lista dia a dia antes de ativar de verdade.
//
// "Trocar o trecho" (ícone por dia, quadro 22b): não existe um endpoint
// dedicado pra regenerar 1 passagem só — reaproveita generateThemePlan
// (mesmo assunto) e pega da resposta nova a primeira passagem que ainda
// não está no plano atual, pra não duplicar. Custa uma chamada de IA
// inteira por troca (mais caro que um "trocar 1 item" de verdade seria),
// documentado aqui em vez de fingir uma troca mais barata que não existe.
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { deriveThemeTexts } from '../themePlans/themeTexts'
import { generateThemePlan } from '../themePlans/themePlansStore'

const FONT = 'var(--font-bento)'
const VISIBLE_DAYS = 4

function addDaysLabel(n, lang) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function StudyProposalScreen({ session, plan, onBack, onRefazer, onSaveForLater, onStart }) {
  const lang = session.lang
  const L = (k, vars) => t(`studyProposal.${k}`, vars, lang)
  const [currentPlan, setCurrentPlan] = useState(plan)
  const [expanded, setExpanded] = useState(false)
  const [swapping, setSwapping] = useState(null)
  const [refazing, setRefazing] = useState(false)
  const [actionError, setActionError] = useState('')

  const texts = deriveThemeTexts(currentPlan.passages)
  const visibleTexts = expanded ? texts : texts.slice(0, VISIBLE_DAYS)
  const totalMinutes = texts.reduce((sum, tx) => sum + (tx.minutes ?? 0), 0)
  const format = currentPlan.format ?? 'thematic'
  const kindLabel = format === 'book' ? L('kindBook') : format === 'crossref' ? L('kindCrossref') : L('kindThematic')
  // Trocar o trecho e "Refazer" pedem outra geração de IA pro MESMO
  // assunto (ver comentário no topo) — não existem pro formato Livro, que
  // não tem `scope` nenhum (é só o livro escolhido, sem IA envolvida).
  const canRegenerate = !!currentPlan.scope

  // Sem sessão de hoje ainda concluída = ainda dá pra começar hoje; já
  // concluída = amanhã (mesma regra do quadro: "'hoje' aparece se ainda
  // não leu"). O card "enquanto isso" some se não houver plano fixo pra
  // pausar (raríssimo, mas real: tier Livre sem sessão de hoje definida).
  const startedToday = session.todaySession?.progress > 0
  const pausedTitle = session.todaySession?.title ?? null

  async function swapDay(index) {
    if (!canRegenerate || swapping != null) return
    setSwapping(index)
    setActionError('')
    try {
      const fresh = await generateThemePlan(currentPlan.scope, 'standard', lang)
      const usedKeys = new Set(currentPlan.passages.map(p => `${p.book}:${p.chStart}-${p.chEnd}`))
      const replacement = fresh.passages.find(p => !usedKeys.has(`${p.book}:${p.chStart}-${p.chEnd}`))
      if (replacement) {
        setCurrentPlan(prev => {
          const nextPassages = [...prev.passages]
          nextPassages[index] = { book: replacement.book, chStart: replacement.chStart, chEnd: replacement.chEnd, reason: replacement.reason, words: replacement.words }
          return { ...prev, passages: nextPassages }
        })
      }
    } catch (err) {
      console.error('Failed to swap study day', err)
      setActionError(L('actionError'))
    } finally {
      setSwapping(null)
    }
  }

  async function handleRefazer() {
    if (!canRegenerate || refazing) return
    setRefazing(true)
    setActionError('')
    try {
      await onRefazer?.(currentPlan)
    } catch (err) {
      console.error('Failed to redo study proposal', err)
      setActionError(L('actionError'))
    } finally {
      setRefazing(false)
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
            <p style={s.darkLabel}>{L('metaLabel', { kind: kindLabel, n: texts.length, min: totalMinutes })}</p>
          </div>
          <p style={s.planTitle}>{currentPlan.title}</p>
          {currentPlan.overview && <p style={s.planOverview}>{currentPlan.overview}</p>}
        </div>
        {actionError && <p style={s.errorText}>{actionError}</p>}

        {visibleTexts.map((tx, i) => (
          <div key={tx.id ?? i} style={s.dayRow}>
            <span style={s.dayNum}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.dayTitle}>{lang === 'en' ? tx.titleEn : tx.title}</p>
              {tx.reason && <p style={s.daySub}>{tx.reason}</p>}
            </div>
            {canRegenerate && (
              <button style={s.swapBtn} onClick={() => swapDay(i)} disabled={swapping != null} aria-label={L('swapAction')}>
                <AppIcon name="RefreshCw" size={13} strokeWidth={2} color={swapping === i ? 'var(--bento-t5)' : 'var(--bento-t3)'} />
              </button>
            )}
          </div>
        ))}

        {texts.length > VISIBLE_DAYS && (
          <button style={s.expandBtn} onClick={() => setExpanded(v => !v)}>
            {expanded ? L('showLessDays') : L('moreDays', { n: texts.length - VISIBLE_DAYS })}
            <AppIcon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={13} color="var(--bento-t3)" />
          </button>
        )}

        {pausedTitle && (
          <div style={s.sandCard}>
            <p style={s.sandLabel}>{L('meanwhileLabel')}</p>
            <p style={s.sandText}>
              {L('meanwhileText', { title: pausedTitle, date: addDaysLabel(texts.length, lang) })}
            </p>
          </div>
        )}
      </div>

      <div style={s.footer}>
        <button style={s.saveBtn} onClick={() => onSaveForLater?.(currentPlan)}>{L('saveForLaterBtn')}</button>
        <button style={s.startBtn} onClick={() => onStart?.(currentPlan, startedToday)}>
          {startedToday ? L('startTomorrowBtn') : L('startTodayBtn')}
        </button>
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
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--re)', margin: 0, textAlign: 'center' },

  dayRow: { borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  dayNum: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff' },
  dayTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  daySub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  swapBtn: { width: 32, height: 32, flexShrink: 0, borderRadius: 11, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  expandBtn: { alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)' },

  sandCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 18px', marginTop: 'auto' },
  sandLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 6px' },
  sandText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  saveBtn: { flexShrink: 0, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-card)', padding: '0 18px', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  startBtn: { flex: 1, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
}
