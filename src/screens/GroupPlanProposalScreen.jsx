// GroupPlanProposalScreen.jsx — "Plano do grupo" (quadro 22d). Alcançada
// pelo formato "Para o grupo" em CreateStudyScreen.jsx (22a) depois de
// escolher o livro — revisar antes de enviar, mesmo espírito de
// StudyProposalScreen.jsx (22b), mas pro grupo inteiro em vez de só a
// própria pessoa.
//
// "Pergunta da semana" (só da 1ª semana — as seguintes ficam pra quando
// chegarem, ver comentário abaixo) já chega SUGERIDA pela IA (GET público,
// cacheado — ver api/suggest-weekly-question.js), mas sempre editável antes
// de enviar: o quadro pede um toggle "sugerida"/"editar" à parte, mas como
// nada é publicado antes de "Enviar para o grupo", o campo já nasce
// editável direto — não muda o que a pessoa PODE fazer, só uma etapa a
// menos de clique.
//
// Regra Zero, documentada: só a pergunta da 1ª semana é sugerida aqui —
// pré-gerar a pergunta de TODAS as semanas de um livro grande (1 semana = 1
// capítulo, ver groupBookPlan.js — Gênesis seriam 50 chamadas de IA de
// uma vez) gastaria uma chamada por semana antes mesmo de alguém chegar
// lá. As semanas seguintes usam o MESMO fluxo que já existe pra qualquer
// sala de capítulo (editar a pergunta em ChapterRoomScreen.jsx, ver
// GroupAdminScreen.jsx "Pergunta da semana") quando a vez delas chegar —
// nenhum código novo precisou entrar ali.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getGroupDetail } from '../groups/groupsStore'
import { fetchWeeklyQuestionSuggestion } from '../groups/groupPlansStore'

const FONT = 'var(--font-bento)'
const VISIBLE_WEEKS = 4

export default function GroupPlanProposalScreen({ session, authUser, plan, onBack, onSend }) {
  const lang = session.lang
  const L = (k, vars) => t(`groupPlanProposal.${k}`, vars, lang)

  const [memberCount, setMemberCount] = useState(null)
  const [question, setQuestion] = useState('')
  const [questionLoading, setQuestionLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const firstWeek = plan.weeks[0]
  const visibleWeeks = expanded ? plan.weeks : plan.weeks.slice(0, VISIBLE_WEEKS)
  const bookDisplay = lang === 'en' ? plan.bookEn : plan.book
  const overview = L('overviewTemplate', {
    date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
  })
  const moderatorFirstName = authUser?.name?.trim().split(/\s+/)[0] ?? ''

  useEffect(() => {
    let cancelled = false
    getGroupDetail(plan.groupId).then(detail => {
      if (!cancelled) setMemberCount(detail?.members.length ?? null)
    }).catch(err => console.error('Failed to load group detail', err))
    return () => { cancelled = true }
  }, [plan.groupId])

  useEffect(() => {
    if (!firstWeek) { setQuestionLoading(false); return }
    let cancelled = false
    setQuestionLoading(true)
    fetchWeeklyQuestionSuggestion({ book: plan.book, bookEn: plan.bookEn, chStart: firstWeek.chStart, chEnd: firstWeek.chEnd, lang })
      .then(q => { if (!cancelled) setQuestion(q ?? '') })
      .catch(err => console.error('Failed to fetch weekly question suggestion', err))
      .finally(() => { if (!cancelled) setQuestionLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id])

  async function handleSend() {
    if (sending) return
    setSending(true)
    setError('')
    try {
      await onSend?.(plan, question)
    } catch (err) {
      console.error('Failed to send group plan', err)
      setError(L('errorGeneric'))
      setSending(false)
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.headerTitle}>{L('pageTitle')}</p>
          <p style={s.headerSub}>{L('pageSub', { group: plan.groupName })}</p>
        </div>
        <span style={s.adminTag}>{L('adminTag')}</span>
      </div>

      <div style={s.body}>
        <div style={s.darkCard}>
          <div style={s.darkLabelRow}>
            <span style={s.diamond} />
            <p style={s.darkLabel}>{L('metaLabel', { weeks: plan.weeks.length, people: memberCount ?? '–' })}</p>
          </div>
          <p style={s.planTitle}>{bookDisplay}</p>
          <p style={s.planOverview}>{overview}</p>
        </div>

        {visibleWeeks.map((week, wi) => (
          <div key={wi} style={s.weekRow}>
            <span style={s.weekNum}>{wi + 1}</span>
            <span style={s.weekText}>{L('weekTitle', { book: bookDisplay, ch: week.chStart })}</span>
          </div>
        ))}

        {plan.weeks.length > VISIBLE_WEEKS && (
          <button style={s.expandBtn} onClick={() => setExpanded(v => !v)}>
            {expanded ? L('showLessWeeksBtn') : L('viewAllWeeksBtn', { n: plan.weeks.length })}
            <AppIcon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={13} color="var(--bento-t3)" />
          </button>
        )}

        <div style={s.card}>
          <p style={s.cardLabel}>{L('weeklyQuestionLabel')}</p>
          <textarea
            style={s.questionInput}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder={questionLoading ? L('questionLoadingHint') : L('questionPlaceholder')}
            rows={3}
            disabled={questionLoading}
          />
        </div>

        <div style={s.card}>
          <div style={s.infoRow}>
            <p style={s.infoLabel}>{L('whoPublishesLabel')}</p>
            <p style={s.infoValue}>{L('whoPublishesValue', { name: moderatorFirstName })}</p>
          </div>
          <div style={{ ...s.infoRow, borderTop: '1px solid var(--bento-line)', marginTop: 10, paddingTop: 10 }}>
            <p style={s.infoLabel}>{L('replacesLabel')}</p>
            <p style={s.infoValue}>{L('replacesValue')}</p>
          </div>
        </div>

        {error && <p style={s.errorText}>{error}</p>}
      </div>

      <div style={s.footer}>
        <button style={{ ...s.sendBtn, opacity: sending ? .6 : 1 }} onClick={handleSend} disabled={sending}>
          <span style={s.sendBtnText}>{sending ? L('sendingBtn') : L('sendBtn')}</span>
          {!sending && <span style={s.sendBtnArrow}>→</span>}
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
  headerSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  adminTag: { flexShrink: 0, fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--bento-accent)' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  darkCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '20px 22px' },
  darkLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  diamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  darkLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  planTitle: { fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: '-.9px', color: '#fff', margin: '0 0 8px', lineHeight: 1.15 },
  planOverview: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.5)', margin: 0 },

  weekRow: { borderRadius: 16, background: 'var(--bento-card)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  weekNum: { width: 26, height: 26, flexShrink: 0, borderRadius: 9, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: '#fff' },
  weekText: { fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)' },

  expandBtn: { alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)' },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  questionInput: { width: '100%', border: 'none', outline: 'none', background: 'var(--bento-line)', borderRadius: 14, padding: '12px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-ink)', resize: 'none' },

  infoRow: { display: 'flex', flexDirection: 'column', gap: 3 },
  infoLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  infoValue: { fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--bento-t2)', margin: 0 },

  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#DC2626', margin: 0, textAlign: 'center' },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  sendBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer' },
  sendBtnText: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
  sendBtnArrow: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-ink)' },
}
