// ReportedMessageScreen.jsx — 42l do handoff-admin-42 ("Mensagem
// denunciada"). Fila do admin do grupo: uma denúncia pendente por vez,
// decidir avança pra próxima sozinho (mesmo comportamento de 42f, um
// nível abaixo — aqui é só do PRÓPRIO grupo). "O poder para aqui": o
// admin de grupo apaga, silencia e remove dentro do grupo dele —
// bloquear conta é só do Master (Bloco 4/5, 42c/42f/42d), esta tela nem
// tem esse botão.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getPendingGroupReports, getGroupReportDetail, decideGroupReport } from '../groups/reportsStore'

const FONT = 'var(--font-bento)'

function firstName(name) {
  return (name ?? '').trim().split(/\s+/)[0] ?? ''
}

function formatMemberSince(iso, lang) {
  if (!iso) return '—'
  const d = new Date(iso)
  const month = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { month: 'short' }).replace('.', '')
  return `${month}/${String(d.getFullYear()).slice(-2)}`
}

function formatWhen(iso, lang) {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return t('groupReport.whenToday', { time }, lang)
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return t('groupReport.whenYesterday', { time }, lang)
  const dateStr = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' })
  return `${dateStr}, ${time}`
}

// "aberta há 6 h" / "aberta há 2 d" — espaço antes da unidade, formato
// fixo do HANDOFF (42l: "1 de 1 · aberta há 6 h").
function timeOpenLabel(createdAtIso, lang) {
  const hours = Math.max(1, Math.floor((Date.now() - new Date(createdAtIso).getTime()) / 3600000))
  if (hours < 24) return t('groupReport.timeOpenHours', { n: hours }, lang)
  return t('groupReport.timeOpenDays', { n: Math.floor(hours / 24) }, lang)
}

const REASON_IDS = ['propaganda', 'cobranca', 'linguagem_agressiva', 'conteudo_improprio', 'outro']

export default function ReportedMessageScreen({ session, groupId, onBack }) {
  const { lang } = session
  const [queue, setQueue] = useState(null) // null = carregando; [] = vazio
  const [detail, setDetail] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [pendingDecision, setPendingDecision] = useState(null) // 'deleted_message' | 'muted_user' | 'removed_member' | null
  const [decisionReason, setDecisionReason] = useState('')
  const [deciding, setDeciding] = useState(false)
  const [decideError, setDecideError] = useState('')

  useEffect(() => {
    if (!groupId) return
    getPendingGroupReports(groupId).then(setQueue).catch(() => setQueue([]))
  }, [groupId])

  useEffect(() => {
    if (!queue || queue.length === 0) { setDetail(null); return }
    let cancelled = false
    getGroupReportDetail(queue[0].id).then(d => { if (!cancelled) setDetail(d) }).catch(err => { if (!cancelled) setLoadError(err.message) })
    return () => { cancelled = true }
  }, [queue])

  async function runDecision(decision, reason) {
    if (!detail) return
    setDeciding(true)
    setDecideError('')
    try {
      await decideGroupReport(detail.id, decision, reason)
      setPendingDecision(null)
      setDecisionReason('')
      setQueue(prev => prev.filter(r => r.id !== detail.id))
    } catch (err) {
      setDecideError(err.message)
    } finally {
      setDeciding(false)
    }
  }

  function chooseAction(decision) {
    setDecideError('')
    // "Manter a mensagem" é o equivalente de "arquivar" — sem motivo
    // obrigatório, executa na hora (mesma regra de 42c).
    if (decision === 'kept_message') { runDecision(decision, null); return }
    setPendingDecision(decision)
    setDecisionReason('')
  }

  const L = (k, vars) => t(`groupReport.${k}`, vars, lang)

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" style={s.backBtn} onClick={onBack} aria-label={L('backAria')}>
          <AppIcon name="ChevronLeft" size={18} color="#fff" strokeWidth={2.2} />
        </button>
        <div>
          <p style={s.headerTitle}>{L('headerTitle')}</p>
          {detail && (
            <p style={s.headerSub}>
              {L('queuePosition', { current: 1, total: queue?.length ?? 1 })} · {timeOpenLabel(detail.createdAt, lang)}
            </p>
          )}
        </div>
      </div>

      <div style={s.body}>
        {loadError && <p style={s.errorText}>{loadError}</p>}

        {queue?.length === 0 && (
          <p style={s.emptyHint}>{L('emptyQueue')}</p>
        )}

        {detail && (
          <>
            <div style={s.warningCard}>
              <AppIcon name="TriangleAlert" size={18} color="var(--bento-sand-icon)" />
              <p style={s.warningText}>{L('escalationWarning')}</p>
            </div>

            <div style={s.card}>
              <div style={s.authorRow}>
                <span style={s.avatar}>{firstName(detail.reportedUserName).slice(0, 2).toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={s.authorName}>{detail.reportedUserName}</p>
                  <p style={s.authorSub}>{L('muralLabel', { when: formatWhen(detail.createdAt, lang) })}</p>
                </div>
              </div>
              <p style={s.quoteBlock}>&ldquo;{detail.messageSnapshot}&rdquo;</p>
              <div style={s.reportedByRow}>
                <span style={s.reportedByPill}>{L('reportedByLabel', { name: detail.reporterName })}</span>
                <span style={s.reasonInline}>
                  {L('reasonInline', { reason: detail.reason === 'outro' && detail.reasonDetail ? detail.reasonDetail : t(`groupReport.reasonShort.${detail.reason}`, undefined, lang) })}
                </span>
              </div>
            </div>

            <div style={s.card}>
              <p style={s.personCardTitle}>{L('personCardTitle', { name: firstName(detail.reportedUserName) })}</p>
              <div style={s.statRow}>
                <span style={s.statLabel}>{L('memberSinceLabel')}</span>
                <span style={s.statValue}>{formatMemberSince(detail.memberSince, lang)}</span>
              </div>
              <div style={s.statRow}>
                <span style={s.statLabel}>{L('messagesInMuralLabel')}</span>
                <span style={s.statValue}>{detail.messageCount}</span>
              </div>
              <div style={s.statRow}>
                <span style={s.statLabel}>{L('priorReportsLabel')}</span>
                <span style={{ ...s.statValue, ...(detail.priorReportsCount > 0 ? { color: 'var(--bento-destructive)' } : {}) }}>{detail.priorReportsCount}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {detail && (
        <div style={s.footer}>
          {decideError && <p style={s.errorText}>{decideError}</p>}
          {pendingDecision ? (
            <div style={s.reasonPrompt}>
              <label style={s.reasonFieldLabel}>{L('reasonFieldLabel', { name: firstName(detail.reportedUserName) })}</label>
              <input
                style={s.reasonInput} value={decisionReason} onChange={e => setDecisionReason(e.target.value)}
                autoFocus
              />
              <div style={s.reasonPromptBtns}>
                <button type="button" style={s.cancelBtn} onClick={() => setPendingDecision(null)} disabled={deciding}>{L('cancelBtn')}</button>
                <button
                  type="button" style={{ ...s.confirmBtn, ...(deciding || !decisionReason.trim() ? s.btnDisabled : {}) }}
                  onClick={() => runDecision(pendingDecision, decisionReason)}
                  disabled={deciding || !decisionReason.trim()}
                >
                  {L('confirmBtn')}
                </button>
              </div>
            </div>
          ) : (
            <div style={s.actionGrid}>
              <button type="button" style={s.actionPrimary} onClick={() => chooseAction('deleted_message')} disabled={deciding}>{L('actionDeleteMessage')}</button>
              <button type="button" style={s.actionSecondary} onClick={() => chooseAction('muted_user')} disabled={deciding}>{L('actionMute7')}</button>
              <button type="button" style={{ ...s.actionSecondary, color: 'var(--bento-destructive)' }} onClick={() => chooseAction('removed_member')} disabled={deciding}>{L('actionRemoveMember')}</button>
              <button type="button" style={s.actionOutline} onClick={() => chooseAction('kept_message')} disabled={deciding}>{L('actionKeepMessage')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 18px', background: 'var(--bento-ink)', borderRadius: '0 0 24px 24px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.5px', color: '#fff', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: '3px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  emptyHint: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '40px 20px' },
  errorText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-destructive)', margin: 0 },

  warningCard: { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--bento-sand)', borderRadius: 20, padding: '16px 18px' },
  warningText: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },

  card: { background: 'var(--bento-card)', borderRadius: 22, padding: '18px 18px' },
  authorRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, flexShrink: 0, borderRadius: 99, background: 'var(--bento-line)', color: 'var(--bento-t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 12, fontWeight: 800 },
  authorName: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 2px' },
  authorSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  quoteBlock: { background: 'var(--bento-line)', borderLeft: '3px solid var(--bento-t6)', borderRadius: '0 14px 14px 0', padding: '14px 16px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-quote-ink)', margin: '0 0 12px' },
  reportedByRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  reportedByPill: { background: 'var(--bento-line)', borderRadius: 99, padding: '5px 12px', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-ink)' },
  reasonInline: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)' },

  personCardTitle: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 12px' },
  statRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 30 },
  statLabel: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-t2)' },
  statValue: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)' },

  footer: { flexShrink: 0, padding: '14px 20px calc(14px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bento-bg)', boxShadow: '0 -8px 30px rgba(0,0,0,.06)' },
  actionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  actionPrimary: { height: 50, border: 'none', borderRadius: 16, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  actionSecondary: { height: 50, border: 'none', borderRadius: 16, background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  actionOutline: { height: 50, border: '1px solid var(--bento-t6)', borderRadius: 16, background: 'none', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  reasonPrompt: { display: 'flex', flexDirection: 'column', gap: 8 },
  reasonFieldLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)' },
  reasonInput: { width: '100%', height: 44, border: 'none', borderRadius: 14, padding: '0 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-card)' },
  reasonPromptBtns: { display: 'flex', gap: 10 },
  cancelBtn: { flex: 1, height: 46, border: '1px solid var(--bento-t6)', borderRadius: 14, background: 'none', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  confirmBtn: { flex: 1, height: 46, border: 'none', borderRadius: 14, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  btnDisabled: { opacity: .5, cursor: 'default' },
}
