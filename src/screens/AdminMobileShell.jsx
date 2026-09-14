// Master no celular (handoff-admin-42, Bloco 5: 42a-42e) — Regra 6.10 do
// pacote: "Master mobile é o desktop adaptado. As abas Visão, Pessoas,
// Grupos, Alertas cobrem as telas desenhadas; 'Mais' leva às demais seções
// de 23a (assinaturas, onboarding, IA, acessos, mensagens, ajustes,
// exportar) na mesma casca mobile." Por isso este arquivo NÃO duplica
// lógica de servidor — toda ação chama os mesmos endpoints já construídos
// nos Blocos 1-4 (adminStore.js/masterModerationStore.js), só desenha uma
// casca de telefone (cabeçalho preto arredondado + rolagem única + nav
// inferior preta de 5 abas) em cima do dado real.
//
// Arquivo separado de AdminScreen.jsx (que já passava de 2000 linhas antes
// deste bloco) em vez de crescer ainda mais aquele arquivo — mas reaproveita
// o MESMO t()/AppIcon/stores, então não é um sistema paralelo.
import { useState, useEffect, useCallback } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { formatAmount } from '../billing/formatAmount'
import { getAdminMetrics, searchAdminUsers, listAnswerReports, sendBroadcast } from '../admin/adminStore'
import {
  getModerationCase, decideModerationCase, exportModerationLog,
  getAdminGroupsList, getAdminGroupDetail, adminGroupAction, getGroupWall,
  getAccessGrants, grantAccess,
  getMasterAlerts, decideMasterAlert, markAllAlertsSeen,
  getPersonDetail, extendPersonTrial, enterAsPerson, blockPersonAccount,
} from '../admin/masterModerationStore'

function M(key, vars, lang) { return t(`admin.mobile.${key}`, vars, lang) }
// Português pluraliza substantivo — "1 grupo" vs "3 grupos" — então onde a
// contagem pode mesmo ser 1 de verdade (não só no exemplo do quadro),
// duas chaves (Singular/Plural) em vez de uma só, mesmo padrão já usado
// em admin.groupReport.timeOpenHours/timeOpenDays.
function pluralKey(n, base) { return Math.abs(n) === 1 ? `${base}Singular` : `${base}Plural` }
function initials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}
function monthYear(iso, lang) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
}
function relativeTime(iso, lang) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return M('agoMinutes', { n: mins }, lang)
  const hours = Math.floor(mins / 60)
  if (hours < 24) return M('agoHours', { n: hours }, lang)
  return M('agoDays', { n: Math.floor(hours / 24) }, lang)
}
// "REGISTRO DE MODERAÇÃO" (42d) — `action` vem de vários lugares
// diferentes (RPCs dos Blocos 1-3, decideCase do Master, este Bloco 5) e
// inclui formas dinâmicas (`muted_user_7d`, `muted_user_30d`...), então
// isto monta a frase em JS por padrão de prefixo em vez de uma chave de
// tradução por valor literal (impraticável, e quebraria pra qualquer
// action nova sem exigir tocar aqui). Sempre cai num fallback legível
// (o motivo cru) se não reconhecer a forma.
function describeModerationAction(h, lang) {
  const { action, actorName, groupName, reason } = h
  if (action === 'deleted_message') return M('modAction.deletedMessage', { actor: actorName, group: groupName }, lang)
  if (action === 'removed_member') return M('modAction.removedMember', { actor: actorName, group: groupName }, lang)
  if (action === 'blocked_account') return M('modAction.blockedAccount', { actor: actorName }, lang)
  if (action === 'archived' || action === 'kept_message') return M('modAction.archived', { group: groupName }, lang)
  if (action === 'ended_group') return M('modAction.endedGroup', undefined, lang)
  if (action === 'extended_trial') return M('modAction.extendedTrial', { detail: reason }, lang)
  if (action === 'viewed_as_user') return M('modAction.viewedAsUser', { actor: actorName }, lang)
  if (action.startsWith('muted_user')) {
    const days = action.match(/(\d+)d$/)?.[1] ?? '7'
    return M('modAction.mutedUser', { n: days, group: groupName }, lang)
  }
  return reason || action
}
function todayOrDate(iso, lang) {
  if (!iso) return M('never', undefined, lang)
  const d = new Date(iso)
  const isToday = d.toDateString() === new Date().toDateString()
  if (isToday) return M('today', undefined, lang)
  const yest = new Date(Date.now() - 86400000)
  if (d.toDateString() === yest.toDateString()) return M('yesterday', undefined, lang)
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' })
}
function timeOfDay(iso, lang) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ══════════════════════════ casca ══════════════════════════
const TABS = [
  { id: 'overview', icon: 'BarChart3' },
  { id: 'people', icon: 'User' },
  { id: 'groups', icon: 'Users' },
  { id: 'alerts', icon: 'TriangleAlert' },
  { id: 'more', icon: 'MoreHorizontal' },
]

export default function AdminMobileShell({ session }) {
  const { lang } = session
  const [tab, setTab] = useState('overview')
  const [openCount, setOpenCount] = useState(0)
  const [groupFocusId, setGroupFocusId] = useState(null)
  const [alertCase, setAlertCase] = useState(null) // { kind, id } | null

  const reloadAlertCount = useCallback(() => {
    getMasterAlerts().then(d => setOpenCount(d.openCount ?? 0)).catch(() => {})
  }, [])
  useEffect(() => { reloadAlertCount() }, [reloadAlertCount])

  function openGroup(groupId) { setGroupFocusId(groupId); setTab('groups') }
  function openAlertCase(kindAndId) { setAlertCase(kindAndId); setTab('alerts') }

  return (
    <div className="hide-on-desktop" style={styles.shell}>
      <div style={styles.screenArea}>
        {tab === 'overview' && <OverviewMobile lang={lang} session={session} onOpenAlerts={() => setTab('alerts')} />}
        {tab === 'people' && <PeopleMobile lang={lang} />}
        {tab === 'groups' && <GroupsMobile lang={lang} focusGroupId={groupFocusId} onConsumedFocus={() => setGroupFocusId(null)} />}
        {tab === 'alerts' && (
          <AlertsMobile
            lang={lang} openCase={alertCase} onOpenCase={setAlertCase}
            onOpenGroup={openGroup} onChanged={reloadAlertCount}
          />
        )}
        {tab === 'more' && <MoreMobile lang={lang} onOpenAlertCase={openAlertCase} />}
      </div>

      <nav style={styles.bottomNav}>
        {TABS.map(tb => {
          const active = tb.id === tab
          return (
            <button key={tb.id} type="button" style={styles.navBtn} onClick={() => setTab(tb.id)}>
              <span style={styles.navIconWrap}>
                <AppIcon name={tb.icon} size={22} color={active ? '#fff' : 'var(--bento-t5)'} />
                {tb.id === 'alerts' && openCount > 0 && <span style={styles.navDotBadge}>{openCount}</span>}
              </span>
              <span style={{ ...styles.navLabel, color: active ? 'var(--bento-accent)' : 'var(--bento-t5)' }}>{M(`nav.${tb.id}`, undefined, lang)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// Cabeçalho preto comum a toda tela do Master no celular.
function DarkHeader({ children }) {
  return <div style={styles.darkHeader}>{children}</div>
}
function BackHeader({ title, subtitle, onBack }) {
  return (
    <DarkHeader>
      <button type="button" style={styles.backBtn} onClick={onBack}><AppIcon name="ChevronLeft" size={20} color="#fff" /></button>
      <p style={styles.backHeaderTitle}>{title}</p>
      {subtitle && <p style={styles.backHeaderSub}>{subtitle}</p>}
    </DarkHeader>
  )
}
// Folha inferior com véu (Rule 2: "folhas inferiores com véu") — usada
// onde uma ação precisa de um motivo digitado antes de confirmar, sem
// sair da tela.
function Sheet({ title, onClose, children }) {
  return (
    <div style={styles.sheetVeil} onClick={onClose}>
      <div style={styles.sheetPanel} onClick={e => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <p style={styles.cardTitle}>{title}</p>
        {children}
      </div>
    </div>
  )
}
function StatChip({ label, value, sub, tone }) {
  return (
    <div style={{ ...styles.statChip, background: tone === 'dark' ? 'var(--bento-card-soft)' : 'var(--bento-bg)' }}>
      <p style={styles.statChipValue}>{value}</p>
      <p style={styles.statChipLabel}>{sub ?? label}</p>
    </div>
  )
}

// ══════════════════════════ 42a — Visão geral ══════════════════════════
function OverviewMobile({ lang, session, onOpenAlerts }) {
  const [metrics, setMetrics] = useState(null)
  const [alerts, setAlerts] = useState(null)
  useEffect(() => {
    getAdminMetrics({ days: 30 }).then(setMetrics).catch(() => {})
    getMasterAlerts().then(setAlerts).catch(() => {})
  }, [])

  if (!metrics) return <div style={styles.loadingBody}><p style={styles.hint}>{t('admin.loading', undefined, lang)}</p></div>
  const { subscriptions, dau, ai, groups, weeklySignups } = metrics
  const maxWeek = Math.max(1, ...weeklySignups.map(w => w.count))
  const dauPct = metrics.users.total > 0 ? Math.round((dau / metrics.users.total) * 100) : 0
  const now = new Date()
  const dateLabel = now.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateCap = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

  // "Precisa de ação" — agrupa alertas abertos por tipo (mesma fonte de
  // 42b), uma linha por tipo com contagem quando há mais de um.
  const actionLines = []
  if (alerts) {
    const byKind = {}
    for (const a of alerts.open) { (byKind[a.kind] ??= []).push(a) }
    for (const kind of ['denuncia', 'tecnico', 'crescimento', 'cancelamentos']) {
      const items = byKind[kind]
      if (!items || items.length === 0) continue
      actionLines.push({ key: kind, label: items.length > 1 ? M(`actionGroup.${kind}`, { n: items.length }, lang) : items[0].title, item: items[0] })
    }
  }

  return (
    <div style={styles.scrollBody}>
      <DarkHeader>
        <div style={styles.overviewHeadRow}>
          <span style={styles.adminBadge}>{M('adminBadge', undefined, lang)}</span>
          <div style={{ flex: 1 }} />
          <button type="button" style={styles.bellBtn} onClick={onOpenAlerts}>
            <AppIcon name="Bell" size={18} color="#fff" />
            {alerts?.openCount > 0 && <span style={styles.bellDot} />}
          </button>
          <span style={styles.avatarChip}>{session.avatarInitials}</span>
        </div>
        <p style={styles.h1White}>{M('overviewTitle', undefined, lang)}</p>
        <p style={styles.subWhite}>{M('overviewSubtitle', { date: dateCap, time: timeOfDay(now.toISOString(), lang) }, lang)}</p>
        <div style={styles.twoCol}>
          <div style={styles.darkCardChip}>
            <p style={styles.chipLabel}>{M('subscribersLabel', undefined, lang)}</p>
            <p style={styles.chipValueLg}>{subscriptions.activeTotal.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR')}</p>
            <p style={styles.chipAccentSub}>+{subscriptions.newActiveIn30d} · {subscriptions.newActivePct30d != null ? `${subscriptions.newActivePct30d}%` : '—'}</p>
          </div>
          <div style={styles.darkCardChip}>
            <p style={styles.chipLabel}>{M('mrrLabel', undefined, lang)}</p>
            <p style={styles.chipValueLg}>{formatAmount(subscriptions.mrrCents.brl, 'brl')}</p>
            <p style={styles.chipAccentSub}>{M('churnLabel', { pct: subscriptions.churnPct30d ?? '—' }, lang)}</p>
          </div>
        </div>
      </DarkHeader>

      <div style={styles.body}>
        {actionLines.length > 0 && (
          <div style={styles.sandCard}>
            <div style={styles.cardTopRow}>
              <p style={styles.cardKicker}>{M('needsActionTitle', undefined, lang)}</p>
              <span style={styles.countBadge}>{alerts.openCount}</span>
            </div>
            {actionLines.map(line => (
              <button key={line.key} type="button" style={styles.actionLineRow} onClick={onOpenAlerts}>
                <span style={styles.dotBullet} />
                <span style={styles.actionLineText}>{line.label}</span>
                <AppIcon name="ChevronRight" size={16} color="var(--bento-sand-ink-mid)" />
              </button>
            ))}
          </div>
        )}

        <div style={styles.threeCol}>
          <StatChip label={M('activeTodayLabel', undefined, lang)} value={dau} sub={M('activeTodayLabel', undefined, lang)} />
          <StatChip label={M('trialsLabel', undefined, lang)} value={subscriptions.trialCount} sub={M('trialsLabel', undefined, lang)} />
          <StatChip label={M('groupsLabel', undefined, lang)} value={groups.activeCount} sub={M('groupsLabel', undefined, lang)} />
        </div>
        <div style={styles.threeColSubs}>
          <p style={styles.chipSubMuted}>{M('pctOfBase', { pct: dauPct }, lang)}</p>
          <p style={styles.chipSubMuted}>{M('trialsConvert', { pct: subscriptions.trialConversionPct ?? '—' }, lang)}</p>
          <p style={styles.chipSubMuted}>{M('activeSuffix', undefined, lang)}</p>
        </div>

        <div style={styles.whiteCard}>
          <div style={styles.cardTopRow}>
            <p style={styles.cardKicker}>{M('newSubscribersTitle', undefined, lang)}</p>
            <span style={styles.cardHeaderAside}>{M('last12Weeks', undefined, lang)}</span>
          </div>
          <div style={styles.barsRow}>
            {weeklySignups.map((w, i) => (
              <div key={w.weekStart} style={{ flex: 1, height: `${Math.max(6, Math.round((w.count / maxWeek) * 100))}%`, borderRadius: 5, background: i === weeklySignups.length - 1 ? 'var(--bento-accent)' : 'var(--bento-ink)' }} />
            ))}
          </div>
        </div>

        <div style={styles.darkCard}>
          <p style={styles.iaKicker}><AppIcon name="Sparkles" size={12} color="var(--bento-accent)" /> {M('aiTodayTitle', undefined, lang)}</p>
          <p style={styles.iaValue}>{ai.questionsToday.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR')} <span style={styles.iaValueSub}>{M('aiQuestionsAndCost', { cost: formatAmount(Math.round(ai.estimatedCostTodayBrl * 100), 'brl') }, lang)}</span></p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════ 42b — Alertas + 42c — Denúncia ══════════════════════════
const ALERT_PILLS = ['open', 'denuncia', 'tecnico', 'resolved']
const ALERT_BADGE_STYLE = {
  denuncia: { background: 'var(--bento-mark)', color: 'var(--bento-destructive)' },
  tecnico: { background: 'var(--bento-line)', color: 'var(--bento-t2)' },
  crescimento: { background: 'var(--bento-sand)', color: 'var(--bento-sand-ink)' },
  cancelamentos: { background: 'var(--bento-mark)', color: 'var(--bento-destructive)' },
}

function AlertsMobile({ lang, openCase, onOpenCase, onOpenGroup, onChanged }) {
  const [data, setData] = useState(null)
  const [pill, setPill] = useState('open')
  const [busyId, setBusyId] = useState(null)

  const reload = useCallback(() => { getMasterAlerts().then(setData).catch(() => {}) }, [])
  useEffect(() => { reload() }, [reload])

  if (openCase) {
    return <ModerationCaseMobile lang={lang} kind={openCase.kind} id={openCase.id} onBack={() => onOpenCase(null)} onDecided={() => { onOpenCase(null); reload(); onChanged() }} />
  }
  if (!data) return <div style={styles.loadingBody}><p style={styles.hint}>{t('admin.loading', undefined, lang)}</p></div>

  const rows = pill === 'resolved' ? data.resolved
    : pill === 'open' ? data.open
    : data.open.filter(a => a.kind === pill)

  async function decide(alert, decision) {
    setBusyId(alert.id)
    try { await decideMasterAlert({ id: alert.id, decision }); reload(); onChanged() } finally { setBusyId(null) }
  }
  function primaryLabel(kind) {
    if (kind === 'denuncia') return M('alertOpenBtn', undefined, lang)
    if (kind === 'tecnico') return M('alertLogBtn', undefined, lang)
    if (kind === 'crescimento') return M('alertGroupBtn', undefined, lang)
    return M('alertOpenBtn', undefined, lang)
  }
  function primaryAction(alert) {
    if (alert.primaryAction === 'moderation_case') onOpenCase({ kind: 'message_report', id: alert.sourceId })
    else if (alert.primaryAction === 'group_detail') onOpenGroup(alert.sourceId)
  }

  return (
    <div style={styles.scrollBody}>
      <DarkHeader>
        <div style={styles.overviewHeadRow}>
          <div style={{ flex: 1 }} />
          <button type="button" style={styles.textLinkBtn} onClick={() => markAllAlertsSeen().then(() => { reload(); onChanged() })}>{M('markAllSeen', undefined, lang)}</button>
        </div>
        <p style={styles.h1White}>{M('nav.alerts', undefined, lang)}</p>
        <p style={styles.subWhite}>{M('alertsSubtitle', { open: data.openCount, resolved: data.resolvedThisWeekCount }, lang)}</p>
        <div style={styles.pillRow}>
          {ALERT_PILLS.map(p => (
            <button key={p} type="button" style={{ ...styles.pill, ...(pill === p ? styles.pillActive : null) }} onClick={() => setPill(p)}>{M(`alertPill.${p}`, undefined, lang)}</button>
          ))}
        </div>
      </DarkHeader>

      <div style={styles.body}>
        {rows.length === 0 && <p style={styles.hint}>{M('alertsEmpty', undefined, lang)}</p>}
        {rows.map(a => (
          <div key={a.id} style={styles.whiteCard}>
            <div style={styles.cardTopRow}>
              <span style={{ ...styles.kindBadge, ...(ALERT_BADGE_STYLE[a.kind] ?? {}) }}>{M(`alertKind.${a.kind}`, undefined, lang).toUpperCase()}</span>
              <span style={styles.mutedTime}>{relativeTime(a.createdAt, lang)}</span>
            </div>
            <p style={styles.cardTitle}>{a.title}</p>
            <p style={styles.cardDetail}>{a.detail}</p>
            {pill !== 'resolved' && (
              <div style={styles.twoBtnRow}>
                <button type="button" className="btn-primary" style={styles.footerBtnPrimary} disabled={busyId === a.id || !a.primaryAction} onClick={() => primaryAction(a)}>{primaryLabel(a.kind)}</button>
                <button type="button" style={styles.footerBtnSecondary} disabled={busyId === a.id} onClick={() => decide(a, 'archived')}>{t('admin.moderation.archiveBtn', undefined, lang)}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ModerationCaseMobile({ lang, kind, id, onBack, onDecided }) {
  const [detail, setDetail] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setDetail(null); getModerationCase(kind, id).then(setDetail).catch(() => {}) }, [kind, id])

  if (!detail) return <div style={styles.loadingBody}><p style={styles.hint}>{t('admin.loading', undefined, lang)}</p></div>

  async function decide(decision) {
    setBusy(true)
    try { await decideModerationCase({ kind, id, decision, reason }); onDecided() } finally { setBusy(false) }
  }

  return (
    <div style={styles.scrollBody}>
      <BackHeader title={t('admin.moderation.caseTitle', { id: (detail.id ?? '').slice(0, 4).toUpperCase() }, lang)} subtitle={M('reportOpenFor', { time: relativeTime(detail.createdAt, lang) }, lang)} onBack={onBack} />
      <div style={styles.body}>
        {detail.kind === 'message_report' && (
          <>
            <div style={styles.whiteCard}>
              <p style={styles.cardKicker}>{M('reportedMessageTitle', undefined, lang)}</p>
              <div style={styles.personRow}>
                <span style={styles.avatarSm}>{initials(detail.reportedName)}</span>
                <div>
                  <p style={styles.personName}>{detail.reportedName}</p>
                  <p style={styles.personSub}>{detail.groupName} · {new Date(detail.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <p style={styles.quoteBubble}>&quot;{detail.messageSnapshot}&quot;</p>
            </div>

            <div style={styles.whiteCard}>
              <p style={styles.cardKicker}>{M('reportsCountTitle', { n: detail.reportCount ?? 1 }, lang)}</p>
              {(detail.reasonBreakdown ?? []).map(rb => (
                <div key={rb.reason} style={styles.breakdownRow}>
                  <span style={styles.dotBullet} />
                  <span style={{ flex: 1 }}>{t(`report.reason.${rb.reason}`, undefined, lang)}</span>
                  <span style={styles.breakdownCount}>{rb.count}</span>
                </div>
              ))}
              <div style={styles.hairline} />
              <p style={styles.mutedLine}>{M('groupAdminDidNotAct', { name: detail.groupModeratorName }, lang)}</p>
            </div>

            <div style={styles.sandCard}>
              <p style={styles.cardKicker}>{M('historyTitle', { name: (detail.reportedName ?? '').split(' ')[0] }, lang)}</p>
              <p style={styles.sandBody}>{M('historyLine', { n: detail.reportsIn30Days ?? 1, since: monthYear(detail.subscriberSince, lang), groups: detail.groupsCount ?? 0, groupsNoun: M(pluralKey(detail.groupsCount ?? 0, 'groupWord'), undefined, lang) }, lang)}</p>
            </div>

            <textarea style={styles.textArea} placeholder={M('reasonPlaceholder', undefined, lang)} value={reason} onChange={e => setReason(e.target.value)} />
          </>
        )}

        {detail.kind === 'admin_report' && (
          <div style={styles.whiteCard}>
            <p style={styles.cardKicker}>{detail.groupName}</p>
            <p style={styles.cardTitle}>{t(`reportProblem.category.${detail.category}`, undefined, lang)}</p>
            <p style={styles.cardDetail}>{detail.body}</p>
            <textarea style={styles.textArea} placeholder={M('reasonPlaceholder', undefined, lang)} value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        )}

        {detail.kind === 'ai_answer' && (
          <div style={styles.whiteCard}>
            <p style={styles.cardKicker}>{M('aiQuestionTitle', undefined, lang)}</p>
            <p style={styles.cardDetail}>{detail.question}</p>
            <p style={styles.cardKicker}>{M('aiAnswerTitle', undefined, lang)}</p>
            <p style={styles.cardDetail}>{detail.answer}</p>
            <p style={styles.mutedLine}>{M('aiReportReason', { reason: detail.reason }, lang)}</p>
          </div>
        )}
      </div>

      <div style={styles.footerFixed}>
        {detail.kind === 'ai_answer' ? (
          <div style={styles.twoBtnRow}>
            <button type="button" className="btn-primary" style={styles.footerBtnPrimary} disabled={busy} onClick={() => decide('archived')}>{M('keepAnswerBtn', undefined, lang)}</button>
            <button type="button" style={styles.footerBtnSecondary} disabled={busy} onClick={() => decide('archived')}>{t('admin.moderation.archiveBtn', undefined, lang)}</button>
          </div>
        ) : (
          <div style={styles.fourBtnGrid}>
            <button type="button" className="btn-primary" style={styles.footerBtnPrimary} disabled={busy || !reason.trim()} onClick={() => decide('deleted_message')}>{t('admin.moderation.deleteMessageBtn', undefined, lang)}</button>
            <button type="button" style={styles.footerBtnSecondary} disabled={busy || !reason.trim()} onClick={() => decide('muted_user')}>{t('admin.moderation.mute7Btn', undefined, lang)}</button>
            <button type="button" style={styles.footerBtnDestructive} disabled={busy || !reason.trim()} onClick={() => decide('blocked_account')}>{t('admin.moderation.blockAccountBtn', undefined, lang)}</button>
            <button type="button" style={styles.footerBtnMuted} disabled={busy} onClick={() => decide('archived')}>{M('archiveNoActionBtn', undefined, lang)}</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════ 42d — Pessoa ══════════════════════════
function PeopleMobile({ lang }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const id = setTimeout(() => { searchAdminUsers(query).then(setResults).catch(() => {}) }, 300)
    return () => clearTimeout(id)
  }, [query])

  if (selected) return <PersonDetailMobile lang={lang} userId={selected} onBack={() => setSelected(null)} />

  return (
    <div style={styles.scrollBody}>
      <DarkHeader>
        <p style={styles.h1White}>{M('nav.people', undefined, lang)}</p>
        <p style={styles.subWhite}>{M('peopleSubtitle', undefined, lang)}</p>
        <div style={styles.searchRow}>
          <AppIcon name="Search" size={16} color="var(--bento-t5)" />
          <input style={styles.searchInput} placeholder={M('peopleSearchPlaceholder', undefined, lang)} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </DarkHeader>
      <div style={styles.body}>
        {query.trim() && results.length === 0 && <p style={styles.hint}>{M('peopleNoResults', undefined, lang)}</p>}
        {results.length > 0 && (
          <div style={styles.whiteCard}>
            {results.map((u, i) => (
              <button key={u.id} type="button" style={{ ...styles.listRow, borderTop: i > 0 ? '1px solid var(--bento-line)' : 'none' }} onClick={() => setSelected(u.id)}>
                <span style={styles.avatarSm}>{initials(u.name ?? u.email)}</span>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={styles.personName}>{u.name || u.email}</p>
                  <p style={styles.personSub}>{u.email}</p>
                </div>
                <AppIcon name="ChevronRight" size={16} color="var(--bento-t4)" />
              </button>
            ))}
          </div>
        )}
        {!query.trim() && <p style={styles.hint}>{M('peopleSearchHint', undefined, lang)}</p>}
      </div>
    </div>
  )
}

function PersonDetailMobile({ lang, userId, onBack }) {
  const [person, setPerson] = useState(null)
  const [grantOpen, setGrantOpen] = useState(false)
  const [enterAsMsg, setEnterAsMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [blockSheetOpen, setBlockSheetOpen] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  const reload = useCallback(() => { getPersonDetail(userId).then(setPerson).catch(() => {}) }, [userId])
  useEffect(() => { reload() }, [reload])

  if (!person) return <div style={styles.loadingBody}><p style={styles.hint}>{t('admin.loading', undefined, lang)}</p></div>

  const sub = person.subscription
  const isTrialing = sub?.status === 'trialing'
  const planLabel = !sub || sub.status === 'none' ? M('planFree', undefined, lang)
    : sub.accessType === 'lifetime' ? M('planLifetime', undefined, lang)
    : isTrialing ? M('planTrial', undefined, lang)
    : sub.plan === 'annual' ? M('planAnnual', undefined, lang) : M('planMonthly', undefined, lang)
  const adminCount = person.groups.filter(g => g.role === 'moderator').length

  async function confirmBlock() {
    if (!blockReason.trim()) return
    setBusy(true)
    try { await blockPersonAccount({ userId, reason: blockReason }); setBlockSheetOpen(false); setBlockReason(''); reload() } finally { setBusy(false) }
  }
  async function handleEnterAs() {
    setBusy(true)
    try { await enterAsPerson(userId); setEnterAsMsg(M('enterAsDone', undefined, lang)); reload() } finally { setBusy(false) }
  }
  async function handleExtendTrial() {
    setBusy(true)
    try { await extendPersonTrial({ userId, days: 7 }); reload() } finally { setBusy(false) }
  }

  if (grantOpen) {
    return <GrantAccessMobile lang={lang} prefillEmail={person.email} onBack={() => setGrantOpen(false)} onDone={() => { setGrantOpen(false); reload() }} />
  }

  return (
    <div style={styles.scrollBody}>
      <DarkHeader>
        <button type="button" style={styles.backBtn} onClick={onBack}><AppIcon name="ChevronLeft" size={20} color="#fff" /></button>
        <p style={styles.eyebrowWhite}>{M('personEyebrow', undefined, lang)}</p>
        <div style={styles.personHeadRow}>
          <span style={styles.avatarLg}>{initials(person.name ?? person.email)}</span>
          <div style={{ minWidth: 0 }}>
            <p style={styles.h1White}>{person.name || person.email}</p>
            <p style={styles.subWhite}>{person.email}</p>
          </div>
        </div>
        <div style={styles.pillRowLoose}>
          <span style={styles.pillAccentSolid}>{planLabel.toUpperCase()}</span>
          <span style={styles.pillDark}>{M('sinceLabel', { date: monthYear(person.createdAt, lang) }, lang)}</span>
          {person.blocked && <span style={styles.pillDestructive}>{M('blockedLabel', undefined, lang)}</span>}
        </div>
      </DarkHeader>

      <div style={styles.body}>
        <div style={styles.threeCol}>
          <StatChip label={M('constancyLabel', undefined, lang)} value={`${person.progress.constancyPct}%`} sub={M('days90', undefined, lang)} />
          <StatChip label={M('lastAccessLabel', undefined, lang)} value={todayOrDate(person.lastSignInAt, lang)} sub={timeOfDay(person.lastSignInAt, lang)} />
          <StatChip label={M('groupsLabel', undefined, lang)} value={person.groups.length} sub={M('adminInN', { n: adminCount }, lang)} />
        </div>

        <div style={styles.whiteCard}>
          <button type="button" style={styles.listRow} onClick={() => setGrantOpen(true)}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={styles.rowTitle}>{M('grantAccessBtn', undefined, lang)}</p>
              <p style={styles.rowSub}>{M('grantAccessSub', undefined, lang)}</p>
            </div>
            <AppIcon name="ChevronRight" size={16} color="var(--bento-t4)" />
          </button>
          <div style={styles.hairline} />
          <div style={{ ...styles.listRow, opacity: isTrialing ? 1 : 0.55 }}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={styles.rowTitle}>{M('extendTrialBtn', undefined, lang)}</p>
              <p style={styles.rowSub}>{isTrialing ? M('extendTrialSubActive', undefined, lang) : M('extendTrialSubDisabled', undefined, lang)}</p>
            </div>
            {isTrialing && <button type="button" disabled={busy} onClick={handleExtendTrial} style={styles.smallActionBtn}>+7d</button>}
          </div>
          <div style={styles.hairline} />
          <div style={styles.listRow}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={styles.rowTitle}>{M('billingBtn', undefined, lang)}</p>
              <p style={styles.rowSub}>
                {sub && sub.amountCents ? M('billingSub', { amount: formatAmount(sub.amountCents, sub.currency ?? 'brl'), period: sub.plan === 'annual' ? M('perYear', undefined, lang) : M('perMonth', undefined, lang), date: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' }) : '—' }, lang) : M('billingSubNone', undefined, lang)}
              </p>
            </div>
          </div>
          <div style={styles.hairline} />
          <button type="button" style={styles.listRow} onClick={handleEnterAs} disabled={busy}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={styles.rowTitle}>{M('enterAsBtn', undefined, lang)}</p>
              <p style={styles.rowSub}>{enterAsMsg || M('enterAsSub', undefined, lang)}</p>
            </div>
            <AppIcon name="ChevronRight" size={16} color="var(--bento-t4)" />
          </button>
        </div>

        {person.moderationHistory.length > 0 && (
          <div style={styles.sandCard}>
            <p style={styles.cardKicker}>{M('moderationHistoryTitle', undefined, lang)}</p>
            {person.moderationHistory.map((h, i) => (
              <div key={i} style={styles.historyRow}>
                <span style={styles.historyDate}>{monthYear(h.createdAt, lang)}</span>
                <span style={styles.historyText}>{describeModerationAction(h, lang)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.footerFixed}>
        <div style={styles.twoBtnRow}>
          <button type="button" style={{ ...styles.footerBtnDestructive, opacity: person.blocked ? 0.5 : 1 }} disabled={busy || !!person.blocked} onClick={() => setBlockSheetOpen(true)}>{t('admin.moderation.blockAccountBtn', undefined, lang)}</button>
          <button type="button" className="btn-primary" style={styles.footerBtnPrimary} onClick={() => setGrantOpen(true)}>{M('grantAccessBtn', undefined, lang)}</button>
        </div>
      </div>

      {blockSheetOpen && (
        <Sheet title={t('admin.moderation.blockAccountBtn', undefined, lang)} onClose={() => setBlockSheetOpen(false)}>
          <p style={styles.mutedLine}>{M('blockSheetIntro', { name: person.name || person.email }, lang)}</p>
          <textarea style={styles.textArea} placeholder={M('reasonPlaceholder', undefined, lang)} value={blockReason} onChange={e => setBlockReason(e.target.value)} />
          <button type="button" style={{ ...styles.footerBtnDestructiveOnDark, background: 'var(--bento-destructive)' }} disabled={busy || !blockReason.trim()} onClick={confirmBlock}>{M('blockAccountConfirmBtn', undefined, lang)}</button>
        </Sheet>
      )}
    </div>
  )
}

function GrantAccessMobile({ lang, prefillEmail, onBack, onDone }) {
  const [kind, setKind] = useState('3_months')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const KINDS = ['3_months', '6_months', '12_months', 'lifetime']

  async function submit() {
    if (!reason.trim()) return
    setBusy(true)
    try { await grantAccess({ emailOrName: prefillEmail, kind, reason }); onDone() } finally { setBusy(false) }
  }

  return (
    <div style={styles.scrollBody}>
      <BackHeader title={M('grantAccessBtn', undefined, lang)} subtitle={prefillEmail} onBack={onBack} />
      <div style={styles.body}>
        <div style={styles.whiteCard}>
          <p style={styles.cardKicker}>{M('grantKindLabel', undefined, lang)}</p>
          <div style={styles.pillRowLoose}>
            {KINDS.map(k => (
              <button key={k} type="button" style={{ ...styles.pillOutline, ...(kind === k ? styles.pillActive : null) }} onClick={() => setKind(k)}>{t('admin.access.kind.' + k, undefined, lang)}</button>
            ))}
          </div>
          <p style={styles.cardKicker}>{M('grantReasonLabel', undefined, lang)}</p>
          <textarea style={styles.textArea} value={reason} onChange={e => setReason(e.target.value)} placeholder={t('admin.access.reasonPlaceholder', undefined, lang)} />
        </div>
      </div>
      <div style={styles.footerFixed}>
        <button type="button" className="btn-primary" style={{ ...styles.footerBtnPrimary, width: '100%' }} disabled={busy || !reason.trim()} onClick={submit}>{M('grantConfirmBtn', undefined, lang)}</button>
      </div>
    </div>
  )
}

// "Falar com admin" (42e/42g) — sem folha desenhada pro pacote de mobile,
// mas um recado enlatado seria simular a ação (Regra 6); mesma folha de
// motivo/mensagem digitada na hora que já uso em outros lugares deste
// arquivo (Sheet), aqui reaproveitada pra escrever a mensagem de verdade.
function MessageAdminSheet({ lang, groupName, onClose, onSent }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function send() {
    if (!message.trim()) return
    setBusy(true)
    try { await onSent(message); onClose() } finally { setBusy(false) }
  }
  return (
    <Sheet title={M('talkToAdminBtn', undefined, lang)} onClose={onClose}>
      <p style={styles.mutedLine}>{groupName}</p>
      <textarea style={styles.textArea} placeholder={t('admin.groups.talkToAdminPlaceholder', undefined, lang)} value={message} onChange={e => setMessage(e.target.value)} />
      <button type="button" className="btn-primary" style={styles.footerBtnPrimary} disabled={busy || !message.trim()} onClick={send}>{t('admin.groups.sendMessageBtn', undefined, lang)}</button>
    </Sheet>
  )
}

// ══════════════════════════ 42e — Grupos ══════════════════════════
const GROUP_PILLS = ['all', 'flagged', 'largest', 'stopped']

function GroupsMobile({ lang, focusGroupId, onConsumedFocus }) {
  const [data, setData] = useState(null)
  const [pctSubscribersInGroup, setPctSubscribersInGroup] = useState(null)
  const [pill, setPill] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [messageTarget, setMessageTarget] = useState(null)

  const reload = useCallback(() => { getAdminGroupsList().then(setData).catch(() => {}) }, [])
  useEffect(() => { reload() }, [reload])
  useEffect(() => { getAdminMetrics({ days: 30 }).then(m => setPctSubscribersInGroup(m.groups.pctSubscribersInGroup)).catch(() => {}) }, [])
  useEffect(() => { if (focusGroupId) { setSelectedId(focusGroupId); onConsumedFocus() } }, [focusGroupId, onConsumedFocus])

  if (selectedId) return <GroupDetailMobile lang={lang} groupId={selectedId} onBack={() => { setSelectedId(null); reload() }} />
  if (!data) return <div style={styles.loadingBody}><p style={styles.hint}>{t('admin.loading', undefined, lang)}</p></div>

  let rows = data.groups
  if (pill === 'flagged') rows = rows.filter(g => g.flagged)
  else if (pill === 'largest') rows = [...rows].sort((a, b) => b.memberCount - a.memberCount).slice(0, 20)
  else if (pill === 'stopped') rows = rows.filter(g => g.stopped)
  if (query.trim()) {
    const q = query.trim().toLowerCase()
    rows = rows.filter(g => g.name.toLowerCase().includes(q) || (g.adminName ?? '').toLowerCase().includes(q))
  }
  const flaggedFirst = [...rows].sort((a, b) => (b.flagged ? 1 : 0) - (a.flagged ? 1 : 0))

  return (
    <div style={styles.scrollBody}>
      <DarkHeader>
        <p style={styles.h1White}>{M('nav.groups', undefined, lang)}</p>
        <p style={styles.subWhite}>{M('groupsSubtitle', { active: data.activeCount, pct: pctSubscribersInGroup ?? '—' }, lang)}</p>
        <div style={styles.searchRow}>
          <AppIcon name="Search" size={16} color="var(--bento-t5)" />
          <input style={styles.searchInput} placeholder={M('groupsSearchPlaceholder', undefined, lang)} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </DarkHeader>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={styles.pillRow}>
          {GROUP_PILLS.map(p => (
            <button key={p} type="button" style={{ ...styles.pill, ...(pill === p ? styles.pillActive : null) }} onClick={() => setPill(p)}>{M(`groupPill.${p}`, undefined, lang)}</button>
          ))}
        </div>
      </div>

      <div style={styles.body}>
        {flaggedFirst.filter(g => g.flagged).map(g => (
          <div key={g.id} style={styles.flaggedGroupCard}>
            <div style={styles.groupHeadRow}>
              <span style={styles.avatarSm}>{initials(g.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.cardTitle}>{g.name}</p>
                <p style={styles.personSub}>{g.adminName} · {M('createdIn', { date: monthYear(g.createdAt, lang) }, lang)}</p>
              </div>
              <span style={styles.pillFlagged}>{M('flaggedLabel', undefined, lang)}</span>
            </div>
            <div style={styles.threeColTight}>
              <StatChip value={g.memberCount} sub={M('membersLabel', undefined, lang)} />
              <StatChip value={`+${g.recentJoins}`} sub={M('in2Days', undefined, lang)} tone="dark" />
              <StatChip value={g.openReportsCount} sub={M(pluralKey(g.openReportsCount, 'reportWord'), undefined, lang)} />
            </div>
            <div style={styles.groupBtnRow}>
              <button type="button" className="btn-primary" style={styles.footerBtnPrimary} onClick={() => setSelectedId(g.id)}>{M('openGroupBtn', undefined, lang)}</button>
              <button type="button" style={styles.footerBtnSecondary} onClick={() => setMessageTarget(g)}>{M('talkToAdminBtn', undefined, lang)}</button>
              {/* "•••" do quadro — mesmas ações extras (código, mural,
                  encerrar) já vivem na tela de detalhe; sem menu flutuante
                  novo pra não inventar uma segunda superfície pras mesmas
                  ações. */}
              <button type="button" style={styles.moreIconBtn} onClick={() => setSelectedId(g.id)} aria-label={M('openGroupBtn', undefined, lang)}>
                <AppIcon name="MoreHorizontal" size={18} color="var(--bento-t2)" />
              </button>
            </div>
          </div>
        ))}

        <div style={styles.whiteCard}>
          {flaggedFirst.filter(g => !g.flagged).map((g, i) => (
            <button key={g.id} type="button" style={{ ...styles.listRow, borderTop: i > 0 ? '1px solid var(--bento-line)' : 'none' }} onClick={() => setSelectedId(g.id)}>
              <span style={styles.avatarSm}>{initials(g.name)}</span>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={styles.personName}>{g.name}</p>
                <p style={styles.personSub}>{g.stopped ? M(pluralKey(g.lastReadDaysAgo ?? 0, 'stoppedFor'), { n: g.lastReadDaysAgo ?? 0 }, lang) : M(pluralKey(g.memberCount, 'membersReading'), { n: g.memberCount, pct: g.readingPct }, lang)}</p>
              </div>
              <AppIcon name="ChevronRight" size={16} color="var(--bento-t4)" />
            </button>
          ))}
        </div>
      </div>

      {messageTarget && (
        <MessageAdminSheet
          lang={lang} groupName={messageTarget.name} onClose={() => setMessageTarget(null)}
          onSent={message => adminGroupAction({ groupId: messageTarget.id, action: 'message_admin', message })}
        />
      )}
    </div>
  )
}

function GroupDetailMobile({ lang, groupId, onBack }) {
  const [group, setGroup] = useState(null)
  const [wallOpen, setWallOpen] = useState(false)
  const [wall, setWall] = useState([])
  const [confirming, setConfirming] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [busy, setBusy] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)

  const reload = useCallback(() => { getAdminGroupDetail(groupId).then(setGroup).catch(() => {}) }, [groupId])
  useEffect(() => { reload() }, [reload])

  if (!group) return <div style={styles.loadingBody}><p style={styles.hint}>{t('admin.loading', undefined, lang)}</p></div>

  async function act(action) {
    setBusy(true)
    try { await adminGroupAction({ groupId, action }); reload() } finally { setBusy(false) }
  }

  return (
    <div style={styles.scrollBody}>
      <BackHeader title={group.name} subtitle={M(pluralKey(group.memberCount, 'membersReading'), { n: group.memberCount, pct: group.readingPct }, lang)} onBack={onBack} />
      <div style={styles.body}>
        <div style={styles.whiteCard}>
          <button type="button" style={styles.listRow} onClick={() => act('invalidate_code')} disabled={busy}>
            <div style={{ flex: 1, textAlign: 'left' }}><p style={styles.rowTitle}>{M('invalidateCodeBtn', undefined, lang)}</p><p style={styles.rowSub}>{group.inviteCode}</p></div>
          </button>
          <div style={styles.hairline} />
          <button type="button" style={styles.listRow} onClick={() => { setWallOpen(true); getGroupWall(groupId).then(setWall) }}>
            <div style={{ flex: 1, textAlign: 'left' }}><p style={styles.rowTitle}>{M('viewWallBtn', undefined, lang)}</p></div>
            <AppIcon name="ChevronRight" size={16} color="var(--bento-t4)" />
          </button>
          <div style={styles.hairline} />
          <button type="button" style={styles.listRow} onClick={() => setMessageOpen(true)}>
            <div style={{ flex: 1, textAlign: 'left' }}><p style={styles.rowTitle}>{M('talkToAdminBtn', undefined, lang)}</p><p style={styles.rowSub}>{group.adminName}</p></div>
          </button>
        </div>

        {messageOpen && (
          <MessageAdminSheet lang={lang} groupName={group.name} onClose={() => setMessageOpen(false)} onSent={message => adminGroupAction({ groupId, action: 'message_admin', message })} />
        )}

        {wallOpen && (
          <div style={styles.sandCard}>
            <p style={styles.cardKicker}>{M('wallTitle', undefined, lang)}</p>
            {wall.length === 0 && <p style={styles.mutedLine}>{M('wallEmpty', undefined, lang)}</p>}
            {wall.slice(0, 15).map(c => (
              <div key={c.id} style={{ marginBottom: 8 }}>
                <p style={styles.historyText}><b>{c.name}</b> · {relativeTime(c.createdAt, lang)}</p>
                <p style={styles.mutedLine}>{c.body}</p>
              </div>
            ))}
          </div>
        )}

        <div style={styles.endGroupCard}>
          <p style={styles.cardKickerLight}>{M('endGroupTitle', undefined, lang)}</p>
          <p style={styles.endGroupBody}>{M('endGroupBody', { n: group.memberCount }, lang)}</p>
          {!confirming ? (
            <button type="button" style={styles.footerBtnMutedOnDark} onClick={() => setConfirming(true)}>{M('endGroupBtn', undefined, lang)}</button>
          ) : (
            <>
              <input style={styles.textInputOnDark} placeholder={group.name} value={typedName} onChange={e => setTypedName(e.target.value)} />
              <button type="button" style={styles.footerBtnDestructiveOnDark} disabled={typedName !== group.name || busy} onClick={() => act('end_group')}>{M('endGroupConfirmBtn', undefined, lang)}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════ Mais ══════════════════════════
const MORE_ITEMS = [
  { id: 'ai', icon: 'Sparkles', built: true },
  { id: 'access', icon: 'Ticket', built: true },
  { id: 'messages', icon: 'Megaphone', built: true },
  { id: 'export', icon: 'Download', built: true },
  { id: 'subscriptions', icon: 'Crown', built: false },
  { id: 'onboarding', icon: 'Compass', built: false },
  { id: 'health', icon: 'Wrench', built: false },
]

function MoreMobile({ lang, onOpenAlertCase }) {
  const [section, setSection] = useState(null)
  if (section === 'ai') return <MoreAiMobile lang={lang} onBack={() => setSection(null)} onOpenCase={onOpenAlertCase} />
  if (section === 'access') return <MoreAccessMobile lang={lang} onBack={() => setSection(null)} />
  if (section === 'messages') return <MoreMessagesMobile lang={lang} onBack={() => setSection(null)} />
  if (section === 'export') return <MoreExportMobile lang={lang} onBack={() => setSection(null)} />
  if (section) {
    return (
      <div style={styles.scrollBody}>
        <BackHeader title={M(`nav2.${section}`, undefined, lang)} onBack={() => setSection(null)} />
        <div style={styles.body}>
          <div style={styles.notBuiltCard}>
            <AppIcon name={MORE_ITEMS.find(m => m.id === section)?.icon ?? 'Wrench'} size={24} color="var(--bento-t4)" />
            <p style={styles.cardTitle}>{t('admin.notBuilt.title', undefined, lang)}</p>
            <p style={styles.mutedLine}>{t('admin.notBuilt.body', undefined, lang)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.scrollBody}>
      <DarkHeader><p style={styles.h1White}>{M('nav.more', undefined, lang)}</p></DarkHeader>
      <div style={styles.body}>
        <div style={styles.whiteCard}>
          {MORE_ITEMS.map((item, i) => (
            <button key={item.id} type="button" style={{ ...styles.listRow, borderTop: i > 0 ? '1px solid var(--bento-line)' : 'none' }} onClick={() => setSection(item.id)}>
              <AppIcon name={item.icon} size={18} color="var(--bento-t2)" />
              <div style={{ flex: 1, textAlign: 'left' }}><p style={styles.rowTitle}>{M(`nav2.${item.id}`, undefined, lang)}</p></div>
              <AppIcon name="ChevronRight" size={16} color="var(--bento-t4)" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MoreAiMobile({ lang, onBack, onOpenCase }) {
  const [reports, setReports] = useState(null)
  useEffect(() => { listAnswerReports({ filter: 'pending' }).then(setReports).catch(() => setReports([])) }, [])
  return (
    <div style={styles.scrollBody}>
      <BackHeader title={M('nav2.ai', undefined, lang)} subtitle={M('aiPendingCount', { n: reports?.length ?? 0 }, lang)} onBack={onBack} />
      <div style={styles.body}>
        {(reports ?? []).length === 0 && reports !== null && <p style={styles.hint}>{M('aiNoPending', undefined, lang)}</p>}
        {(reports ?? []).map(r => (
          <button key={r.id} type="button" style={styles.whiteCard} onClick={() => onOpenCase({ kind: 'ai_answer', id: r.id })}>
            <p style={styles.cardKicker}>{relativeTime(r.createdAt ?? r.created_at, lang)}</p>
            <p style={styles.cardDetail}>{r.question}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

const GRANT_KINDS = ['3_months', '6_months', '12_months', 'lifetime']
function MoreAccessMobile({ lang, onBack }) {
  const [data, setData] = useState(null)
  const [form, setForm] = useState({ open: false, emailOrName: '', kind: '3_months', reason: '' })
  const [busy, setBusy] = useState(false)
  const reload = useCallback(() => { getAccessGrants().then(setData).catch(() => {}) }, [])
  useEffect(() => { reload() }, [reload])

  async function submit() {
    if (!form.emailOrName.trim() || !form.reason.trim()) return
    setBusy(true)
    try { await grantAccess({ emailOrName: form.emailOrName, kind: form.kind, reason: form.reason }); setForm({ open: false, emailOrName: '', kind: '3_months', reason: '' }); reload() } finally { setBusy(false) }
  }

  return (
    <div style={styles.scrollBody}>
      <BackHeader title={M('nav2.access', undefined, lang)} subtitle={data ? t('admin.access.subtitle', { n: data.totalAccounts, brl: data.abdicatedMonthlyBrl.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }, lang) : ''} onBack={onBack} />
      <div style={styles.body}>
        {data && (
          <div style={styles.threeCol}>
            <StatChip value={data.lifetimeCount} sub={t('admin.access.lifetimeLabel', undefined, lang)} />
            <StatChip value={data.periodCount} sub={t('admin.access.periodLabel', undefined, lang)} />
            <StatChip value={formatAmount(Math.round(data.abdicatedMonthlyBrl * 100), 'brl')} sub={M('abdicatedLabel', undefined, lang)} />
          </div>
        )}
        {!form.open ? (
          <button type="button" className="btn-primary" style={{ ...styles.footerBtnPrimary, width: '100%' }} onClick={() => setForm(f => ({ ...f, open: true }))}>{M('grantAccessBtn', undefined, lang)}</button>
        ) : (
          <div style={styles.whiteCard}>
            <input style={styles.textInput} placeholder={t('admin.access.forWhomPlaceholder', undefined, lang)} value={form.emailOrName} onChange={e => setForm(f => ({ ...f, emailOrName: e.target.value }))} />
            <div style={styles.pillRowLoose}>
              {GRANT_KINDS.map(k => (
                <button key={k} type="button" style={{ ...styles.pillOutline, ...(form.kind === k ? styles.pillActive : null) }} onClick={() => setForm(f => ({ ...f, kind: k }))}>{t('admin.access.kind.' + k, undefined, lang)}</button>
              ))}
            </div>
            <textarea style={styles.textArea} placeholder={t('admin.access.reasonPlaceholder', undefined, lang)} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            <button type="button" className="btn-primary" style={{ ...styles.footerBtnPrimary, width: '100%' }} disabled={busy || !form.emailOrName.trim() || !form.reason.trim()} onClick={submit}>{M('grantConfirmBtn', undefined, lang)}</button>
          </div>
        )}
        {(data?.grants ?? []).map(g => (
          <div key={g.id} style={styles.whiteCard}>
            <p style={styles.cardTitle}>{g.name || g.email}</p>
            <p style={styles.mutedLine}>{t('admin.access.kind.' + g.kind, undefined, lang)} · {g.reason}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MoreMessagesMobile({ lang, onBack }) {
  const [titlePt, setTitlePt] = useState('')
  const [bodyPt, setBodyPt] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!titlePt.trim() || !bodyPt.trim()) return
    setBusy(true)
    try { await sendBroadcast({ languages: ['pt'], titlePt, titleEn: titlePt, bodyPt, bodyEn: bodyPt, sendPush: true, recipientMode: 'all' }); setDone(true) } finally { setBusy(false) }
  }

  return (
    <div style={styles.scrollBody}>
      <BackHeader title={M('nav2.messages', undefined, lang)} onBack={onBack} />
      <div style={styles.body}>
        <div style={styles.whiteCard}>
          <input style={styles.textInput} placeholder={M('broadcastTitlePlaceholder', undefined, lang)} value={titlePt} onChange={e => setTitlePt(e.target.value)} />
          <textarea style={styles.textArea} placeholder={M('broadcastBodyPlaceholder', undefined, lang)} value={bodyPt} onChange={e => setBodyPt(e.target.value)} />
          {done && <p style={styles.mutedLine}>{M('broadcastSent', undefined, lang)}</p>}
        </div>
      </div>
      <div style={styles.footerFixed}>
        <button type="button" className="btn-primary" style={{ ...styles.footerBtnPrimary, width: '100%' }} disabled={busy || !titlePt.trim() || !bodyPt.trim()} onClick={submit}>{M('broadcastSendBtn', undefined, lang)}</button>
      </div>
    </div>
  )
}

function MoreExportMobile({ lang, onBack }) {
  function exportCsv(filename, rows) {
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }
  async function exportModeration() {
    const rows = await exportModerationLog()
    exportCsv(`jesus-corner-moderacao-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['data', 'escopo', 'acao', 'motivo', 'autor', 'alvo', 'grupo'],
      ...rows.map(r => [r.createdAt, r.scope, r.action, r.reason, r.actorName, r.targetName, r.groupName]),
    ])
  }
  async function exportMetrics() {
    const m = await getAdminMetrics({ days: 30 })
    exportCsv(`jesus-corner-metricas-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['metrica', 'valor'],
      ['assinantes_ativos', m.subscriptions.activeTotal],
      ['mrr_brl', (m.subscriptions.mrrCents.brl / 100).toFixed(2)],
      ['dau', m.dau],
      ['em_trial', m.subscriptions.trialCount],
      ['grupos_ativos', m.groups.activeCount],
    ])
  }
  return (
    <div style={styles.scrollBody}>
      <BackHeader title={M('nav2.export', undefined, lang)} onBack={onBack} />
      <div style={styles.body}>
        <div style={styles.whiteCard}>
          <button type="button" style={styles.listRow} onClick={exportMetrics}><div style={{ flex: 1, textAlign: 'left' }}><p style={styles.rowTitle}>{M('exportMetricsBtn', undefined, lang)}</p></div><AppIcon name="Download" size={16} color="var(--bento-t4)" /></button>
          <div style={styles.hairline} />
          <button type="button" style={styles.listRow} onClick={exportModeration}><div style={{ flex: 1, textAlign: 'left' }}><p style={styles.rowTitle}>{M('exportModerationBtn', undefined, lang)}</p></div><AppIcon name="Download" size={16} color="var(--bento-t4)" /></button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════ estilos ══════════════════════════
const styles = {
  shell: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)', fontFamily: 'var(--font-bento)' },
  screenArea: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  scrollBody: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  loadingBody: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body: { display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 24px' },

  darkHeader: { background: 'var(--bento-ink)', color: '#fff', padding: '16px 20px 18px', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, display: 'flex', flexDirection: 'column', gap: 4 },
  overviewHeadRow: { display: 'flex', alignItems: 'center', gap: 10 },
  adminBadge: { font: '800 11px/1 var(--font-bento)', letterSpacing: '.06em', color: 'var(--bento-accent)' },
  bellBtn: { position: 'relative', width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: '50%', background: 'var(--bento-accent)' },
  avatarChip: { width: 34, height: 34, borderRadius: 10, background: 'var(--bento-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 12px/1 var(--font-bento)' },
  textLinkBtn: { background: 'none', border: 'none', color: 'var(--bento-t5)', font: '600 13px/1 var(--font-bento)' },

  h1White: { font: '800 26px/1.1 var(--font-bento)', margin: '10px 0 0' },
  subWhite: { font: '500 13px/1.4 var(--font-bento)', color: 'var(--bento-t5)', margin: '4px 0 0' },
  eyebrowWhite: { font: '700 11px/1 var(--font-bento)', letterSpacing: '.08em', color: 'var(--bento-t5)', margin: '10px 0 0' },

  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 },
  darkCardChip: { background: 'rgba(255,255,255,.06)', borderRadius: 18, padding: '14px 16px' },
  chipLabel: { font: '700 10px/1 var(--font-bento)', letterSpacing: '.06em', color: 'var(--bento-t5)', margin: 0 },
  chipValueLg: { font: '800 22px/1.2 var(--font-bento)', color: '#fff', margin: '6px 0 2px' },
  chipAccentSub: { font: '700 12px/1 var(--font-bento)', color: 'var(--bento-accent)', margin: 0 },

  pillRow: { display: 'flex', gap: 8, marginTop: 14, overflowX: 'auto' },
  pillRowLoose: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 12px' },
  pill: { flexShrink: 0, padding: '9px 16px', borderRadius: 999, border: 'none', background: 'rgba(255,255,255,.08)', color: 'var(--bento-t5)', font: '700 13px/1 var(--font-bento)' },
  pillOutline: { padding: '8px 14px', borderRadius: 999, border: '1px solid var(--bento-divider)', background: 'var(--bento-bg)', color: 'var(--bento-t2)', font: '700 12px/1 var(--font-bento)' },
  pillActive: { background: 'var(--bento-accent)', color: '#fff', border: 'none' },
  pillAccentSolid: { padding: '7px 12px', borderRadius: 999, background: 'rgba(240,102,43,.18)', color: 'var(--bento-accent)', font: '800 11px/1 var(--font-bento)', letterSpacing: '.04em' },
  pillDark: { padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,.08)', color: 'var(--bento-t5)', font: '700 12px/1 var(--font-bento)' },
  pillDestructive: { padding: '7px 12px', borderRadius: 999, background: 'rgba(194,78,25,.2)', color: '#FF8A5C', font: '800 11px/1 var(--font-bento)' },
  pillFlagged: { padding: '7px 12px', borderRadius: 999, background: 'var(--bento-mark)', color: 'var(--bento-destructive)', font: '800 11px/1 var(--font-bento)', flexShrink: 0 },

  searchRow: { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: '12px 14px', marginTop: 14 },
  searchInput: { flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', font: '500 14px/1 var(--font-bento)' },

  sandCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  whiteCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  darkCard: { borderRadius: 22, background: 'var(--bento-ink)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 },
  cardTopRow: { display: 'flex', alignItems: 'center', gap: 10 },
  cardKicker: { font: '700 11px/1 var(--font-bento)', letterSpacing: '.06em', color: 'var(--bento-sand-label)', margin: 0, flex: 1 },
  cardKickerLight: { font: '700 11px/1 var(--font-bento)', letterSpacing: '.06em', color: 'var(--bento-t5)', margin: 0 },
  cardTitle: { font: '700 16px/1.3 var(--font-bento)', color: 'var(--bento-ink)', margin: 0 },
  cardDetail: { font: '500 13px/1.5 var(--font-bento)', color: 'var(--bento-t2)', margin: 0 },
  countBadge: { width: 24, height: 24, borderRadius: '50%', background: 'var(--bento-sand-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 11px/1 var(--font-bento)' },
  cardHeaderAside: { font: '600 11px/1 var(--font-bento)', color: 'var(--bento-t4)' },

  actionLineRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', border: 'none', background: 'none', width: '100%', textAlign: 'left' },
  dotBullet: { width: 6, height: 6, borderRadius: '50%', background: 'var(--bento-sand-ink)', flexShrink: 0 },
  actionLineText: { flex: 1, font: '600 13px/1.4 var(--font-bento)', color: 'var(--bento-sand-ink)' },

  threeCol: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  threeColTight: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  threeColSubs: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: -8 },
  statChip: { borderRadius: 16, padding: '12px 12px', textAlign: 'center' },
  statChipValue: { font: '800 18px/1.1 var(--font-bento)', color: 'var(--bento-ink)', margin: 0 },
  statChipLabel: { font: '600 10px/1.3 var(--font-bento)', color: 'var(--bento-t3)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '.02em' },
  chipSubMuted: { font: '500 11px/1.3 var(--font-bento)', color: 'var(--bento-t4)', textAlign: 'center', margin: 0 },

  barsRow: { display: 'flex', alignItems: 'flex-end', gap: 5, height: 60, marginTop: 4 },
  iaKicker: { display: 'flex', alignItems: 'center', gap: 6, font: '700 11px/1 var(--font-bento)', letterSpacing: '.06em', color: 'var(--bento-t5)', margin: 0 },
  iaValue: { font: '800 24px/1.2 var(--font-bento)', color: '#fff', margin: '6px 0 0' },
  iaValueSub: { font: '500 13px/1 var(--font-bento)', color: 'var(--bento-t5)' },

  backBtn: { width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  backHeaderTitle: { font: '800 20px/1.2 var(--font-bento)', color: '#fff', margin: '10px 0 0' },
  backHeaderSub: { font: '500 13px/1.4 var(--font-bento)', color: 'var(--bento-t5)', margin: '2px 0 0' },

  kindBadge: { padding: '5px 10px', borderRadius: 999, font: '800 10px/1 var(--font-bento)', letterSpacing: '.05em' },
  mutedTime: { font: '600 12px/1 var(--font-bento)', color: 'var(--bento-t4)' },
  mutedLine: { font: '500 13px/1.5 var(--font-bento)', color: 'var(--bento-t3)', margin: 0 },

  twoBtnRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 4 },
  fourBtnGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  footerFixed: { padding: '12px 16px 18px', background: 'var(--bento-bg)', borderTop: '1px solid var(--bento-divider)' },
  footerBtnPrimary: { background: 'var(--bento-ink)', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 18px', font: '700 14px/1 var(--font-bento)' },
  footerBtnSecondary: { background: 'var(--bento-card-soft)', color: 'var(--bento-ink)', border: '1px solid var(--bento-divider)', borderRadius: 16, padding: '14px 18px', font: '700 14px/1 var(--font-bento)' },
  footerBtnMuted: { background: 'var(--bento-sand)', color: 'var(--bento-sand-ink)', border: 'none', borderRadius: 16, padding: '14px 18px', font: '700 14px/1 var(--font-bento)' },
  footerBtnDestructive: { background: 'var(--bento-card)', color: 'var(--bento-destructive)', border: '1px solid var(--bento-divider)', borderRadius: 16, padding: '14px 18px', font: '700 14px/1 var(--font-bento)' },
  footerBtnMutedOnDark: { background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 18px', font: '700 14px/1 var(--font-bento)', width: '100%' },
  footerBtnDestructiveOnDark: { background: 'var(--bento-destructive)', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 18px', font: '700 14px/1 var(--font-bento)', width: '100%', marginTop: 8 },
  textInputOnDark: { width: '100%', background: 'rgba(255,255,255,.1)', border: 'none', outline: 'none', borderRadius: 12, height: 42, padding: '0 14px', font: '500 13px/1 var(--font-bento)', color: '#fff', marginTop: 8 },

  personRow: { display: 'flex', alignItems: 'center', gap: 10 },
  avatarSm: { width: 38, height: 38, borderRadius: 12, background: 'var(--bento-sand)', color: 'var(--bento-sand-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 13px/1 var(--font-bento)', flexShrink: 0 },
  avatarLg: { width: 56, height: 56, borderRadius: 16, background: 'var(--bento-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 18px/1 var(--font-bento)', flexShrink: 0 },
  personName: { font: '700 14px/1.3 var(--font-bento)', color: 'var(--bento-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  personSub: { font: '500 12px/1.4 var(--font-bento)', color: 'var(--bento-t3)', margin: '2px 0 0' },
  personHeadRow: { display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 },

  quoteBubble: { background: 'var(--bento-bg)', borderRadius: 16, padding: '14px 16px', font: '500 14px/1.55 var(--font-bento)', color: 'var(--bento-quote-ink)', margin: 0 },
  breakdownRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' },
  breakdownCount: { font: '700 13px/1 var(--font-bento)', color: 'var(--bento-t3)' },
  hairline: { height: 1, background: 'var(--bento-line)', margin: '2px 0' },
  sandBody: { font: '500 14px/1.5 var(--font-bento)', color: 'var(--bento-sand-ink)', margin: 0 },
  textArea: { width: '100%', minHeight: 64, resize: 'vertical', border: '1px solid var(--bento-divider)', outline: 'none', background: 'var(--bento-card)', borderRadius: 14, padding: '12px 14px', font: '500 13px/1.5 var(--font-bento)', color: 'var(--bento-ink)', boxSizing: 'border-box' },
  textInput: { width: '100%', border: '1px solid var(--bento-divider)', outline: 'none', background: 'var(--bento-card)', borderRadius: 12, height: 42, padding: '0 14px', font: '500 13px/1 var(--font-bento)', color: 'var(--bento-ink)', boxSizing: 'border-box' },

  listRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', border: 'none', background: 'none', width: '100%' },
  rowTitle: { font: '700 14px/1.3 var(--font-bento)', color: 'var(--bento-ink)', margin: 0 },
  rowSub: { font: '500 12px/1.4 var(--font-bento)', color: 'var(--bento-t3)', margin: '2px 0 0' },
  smallActionBtn: { background: 'var(--bento-ink)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 12px', font: '700 12px/1 var(--font-bento)' },

  historyRow: { display: 'flex', gap: 12, alignItems: 'baseline' },
  historyDate: { font: '700 12px/1 var(--font-bento)', color: 'var(--bento-sand-ink-mid)', flexShrink: 0, width: 40 },
  historyText: { font: '500 13px/1.4 var(--font-bento)', color: 'var(--bento-sand-ink)', margin: 0 },

  groupHeadRow: { display: 'flex', alignItems: 'center', gap: 10 },
  flaggedGroupCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, border: '1.5px solid var(--bento-accent)' },
  groupBtnRow: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10 },
  moreIconBtn: { width: 48, height: 48, borderRadius: 16, background: 'var(--bento-card-soft)', border: '1px solid var(--bento-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  endGroupCard: { background: 'var(--bento-ink)', borderRadius: 22, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 },
  endGroupBody: { font: '500 13px/1.5 var(--font-bento)', color: 'var(--bento-t5)', margin: 0 },

  notBuiltCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 },
  hint: { font: '500 13px/1.5 var(--font-bento)', color: 'var(--bento-t3)', textAlign: 'center', padding: '20px 0' },

  sheetVeil: { position: 'fixed', inset: 0, background: 'rgba(26,23,20,.55)', display: 'flex', alignItems: 'flex-end', zIndex: 40 },
  sheetPanel: { width: '100%', background: 'var(--bento-bg)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)', display: 'flex', flexDirection: 'column', gap: 10 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, background: 'var(--bento-t6)', alignSelf: 'center', marginBottom: 4 },

  bottomNav: { display: 'flex', background: 'var(--bento-ink)', padding: '10px 4px calc(env(safe-area-inset-bottom, 0px) + 8px)', flexShrink: 0 },
  navBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', padding: '4px 0' },
  navIconWrap: { position: 'relative' },
  navDotBadge: { position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, borderRadius: 8, background: 'var(--bento-accent)', color: '#fff', font: '800 9px/16px var(--font-bento)', textAlign: 'center', padding: '0 3px' },
  navLabel: { font: '700 10px/1 var(--font-bento)' },
}
