// Painel admin — só monta quando session.isAdmin é true (ver App.jsx), então
// as buscas abaixo já ficam restritas a quem de fato usa essa tela, sem
// guarda extra. Shell novo (Bloco 14, quadros 23a-23d do design handoff):
// desktop-only, 1280px, sidebar própria de 232px com 9 seções — 5 reais
// (Visão geral/Usuários/IA/Mensagens/Convites) e 4 que o mockup nomeia mas
// não desenha (Assinaturas/Onboarding/Grupos e igrejas/Saúde técnica), que
// abrem uma tela honesta explicando que ainda não existem nesta leva em vez
// de um item desabilitado sem explicação. No celular (<768px) mostra um
// aviso pra abrir num computador — o mockup em si já assume 1280px e não
// desenhou versão reduzida ("celular reduzido... que desenho depois se
// aprovar"), então fingir uma versão compacta aqui seria simular tela que
// não existe.
import { useState, useEffect, useRef } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import BrandMark from '../components/BrandMark'
import BrandLogo from '../components/BrandLogo'
import { formatAmount } from '../billing/formatAmount'
import {
  getAdminMetrics, listContactMessages, replyToContactMessage, deleteContactMessage,
  sendBroadcast, listBroadcastLog, searchAdminUsers, getAdminUserDetail, listReadingGroupsForAdmin,
  createInvite, listAdminInvites, revokeInvite, listAnswerReports, updateAnswerReport,
} from '../admin/adminStore'

// Ordem e rótulo batem com a navegação lateral do mockup (23a-23d) —
// `built` decide se a seção tem tela de verdade ou a de "ainda não
// desenhada". Onboarding e Grupos e igrejas já aparecem como CARTÕES dentro
// de Visão geral (funil, retenção por coorte, stats de grupo) — os itens de
// nav abaixo seriam uma página própria de detalhe pra cada um, que o mockup
// nomeia mas não chegou a desenhar.
const NAV_SECTIONS = [
  { id: 'overview', icon: 'BarChart3', built: true },
  { id: 'users', icon: 'Users', built: true },
  { id: 'subscriptions', icon: 'Crown', built: false },
  { id: 'onboarding', icon: 'Compass', built: false },
  { id: 'ai', icon: 'Sparkles', built: true },
  { id: 'groups', icon: 'Landmark', built: false },
  { id: 'messages', icon: 'Megaphone', built: true },
  { id: 'invites', icon: 'Gift', built: true },
  { id: 'health', icon: 'Wrench', built: false },
]

export default function AdminScreen({ session }) {
  const { lang } = session
  const [section, setSection] = useState('overview')
  const activeNav = NAV_SECTIONS.find(s => s.id === section)

  return (
    <>
      <div className="hide-on-mobile" style={styles.shell}>
        <aside style={styles.sidebar}>
          <div style={styles.brandRow}>
            <BrandMark size={32} />
            <div>
              <BrandLogo size={14} letterSpacing="-.4px" />
              <p style={styles.brandCaption}>{t('admin.nav.brandCaption', undefined, lang)}</p>
            </div>
          </div>

          <div style={styles.navList}>
            {NAV_SECTIONS.map(s => {
              const active = s.id === section
              return (
                <button key={s.id} style={{ ...styles.navItem, ...(active ? styles.navItemActive : null) }} onClick={() => setSection(s.id)}>
                  <span style={{ ...styles.navDot, background: active ? 'var(--bento-accent)' : 'var(--bento-t6)' }} />
                  <span style={{ ...styles.navLabel, color: active ? '#fff' : 'var(--bento-t2)' }}>{t(`admin.nav.${s.id}`, undefined, lang)}</span>
                </button>
              )
            })}
          </div>

          <div style={styles.accountChip}>
            <div style={styles.accountAvatar}>{session.avatarInitials}</div>
            <div style={{ minWidth: 0 }}>
              <p style={styles.accountName}>{session.userName}</p>
              <p style={styles.accountRole}>{t('admin.nav.superAdmin', undefined, lang)}</p>
            </div>
          </div>
        </aside>

        <main style={styles.main}>
          {activeNav?.built ? (
            <>
              {section === 'overview' && <OverviewSection lang={lang} onNavigate={setSection} />}
              {section === 'users' && <UsersSection lang={lang} onNavigate={setSection} />}
              {section === 'ai' && <AiSection lang={lang} />}
              {section === 'messages' && <MessagesSection lang={lang} />}
              {section === 'invites' && <InvitesSection lang={lang} />}
            </>
          ) : (
            <NotBuiltSection lang={lang} sectionId={section} />
          )}
        </main>
      </div>

      <div className="hide-on-desktop" style={styles.mobileNotice}>
        <AppIcon name="Wrench" size={30} color="var(--bento-t4)" />
        <p style={styles.mobileNoticeTitle}>{t('admin.mobileNotice.title', undefined, lang)}</p>
        <p style={styles.mobileNoticeBody}>{t('admin.mobileNotice.body', undefined, lang)}</p>
      </div>
    </>
  )
}

// ── Cabeçalho comum a toda seção construída (título + subtítulo + ações à
// direita, opcional) — mesma estrutura das 4 telas do mockup. ──
function SectionHeader({ title, subtitle, right }) {
  return (
    <div style={styles.sectionHeader}>
      <div style={{ minWidth: 0 }}>
        <p style={styles.sectionTitle}>{title}</p>
        {subtitle && <p style={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
      {right && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

function NotBuiltSection({ lang, sectionId }) {
  return (
    <div style={styles.sectionBody}>
      <SectionHeader title={t(`admin.nav.${sectionId}`, undefined, lang)} />
      <div style={styles.notBuiltCard}>
        <AppIcon name={NAV_SECTIONS.find(s => s.id === sectionId)?.icon ?? 'Wrench'} size={26} color="var(--bento-t4)" />
        <p style={styles.notBuiltTitle}>{t('admin.notBuilt.title', undefined, lang)}</p>
        <p style={styles.notBuiltBody}>{t('admin.notBuilt.body', undefined, lang)}</p>
      </div>
    </div>
  )
}

// ══════════════════════════ Visão geral (23a) ══════════════════════════
const FUNNEL_DAY_OPTIONS = [7, 30, 90, 180]
const FUNNEL_LANGUAGE_OPTIONS = ['all', 'pt', 'en']

function overviewDateLabel(lang) {
  const now = new Date()
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'
  const dateStr = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  const timeStr = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return t('admin.overview.dateLine', { date: capitalized, time: timeStr }, lang)
}

function OverviewSection({ lang, onNavigate }) {
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState('')
  const [funnelDays, setFunnelDays] = useState(30)
  const [funnelLanguage, setFunnelLanguage] = useState('all')
  const requestIdRef = useRef(0)

  useEffect(() => {
    // Mesma trava de request-mais-recente-vence da versão anterior — trocar
    // o filtro de idioma (que faz uma busca extra em auth.users) pode
    // demorar mais que o de dias e chegar depois, sobrescrevendo com dado
    // desatualizado se não houvesse essa checagem.
    const requestId = ++requestIdRef.current
    getAdminMetrics({ days: funnelDays, language: funnelLanguage === 'all' ? undefined : funnelLanguage })
      .then(data => { if (requestIdRef.current === requestId) { setMetrics(data); setError('') } })
      .catch(err => { if (requestIdRef.current === requestId) setError(err.message) })
  }, [funnelDays, funnelLanguage])

  if (error) return <div style={styles.sectionBody}><p style={styles.errorMsg}>{error}</p></div>
  if (!metrics) return <div style={styles.sectionBody}><p style={styles.hint}>{t('admin.loading', undefined, lang)}</p></div>

  const { users, subscriptions, contact, pastDueSubscriptions, paymentErrorsToday, retentionByWeek, weeklySignups, dau, ai, groups, onboardingFunnel } = metrics

  // "Exportar" (23a) — os números já estão na mão (mesmo `metrics` que
  // preenche a tela toda), então isto é um CSV de verdade, não um botão
  // decorativo: uma linha por número do topo, mais o funil e a retenção por
  // coorte. Sem endpoint novo — tudo client-side, igual o resto da tela.
  function handleExport() {
    const rows = [
      ['metrica', 'valor'],
      ['assinantes_ativos', subscriptions.activeTotal],
      ['mrr_brl', (subscriptions.mrrCents.brl / 100).toFixed(2)],
      ['mrr_usd', (subscriptions.mrrCents.usd / 100).toFixed(2)],
      ['dau', dau],
      ['em_trial', subscriptions.trialCount],
      ['trials_vencem_48h', subscriptions.trialsExpiringSoon],
      ['grupos_ativos', groups.activeCount],
      ['pct_assinantes_em_grupo', groups.pctSubscribersInGroup],
      ['ia_perguntas_hoje', ai.questionsToday],
      ['ia_respostas_reportadas', ai.pendingReports],
      ['pagamentos_com_erro_hoje', paymentErrorsToday],
      ...onboardingFunnel.steps.map(s => [`funil_${s.step}`, s.count]),
      ['funil_assinaram', onboardingFunnel.subscribed],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jesus-corner-admin-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const dauPct = users.total > 0 ? Math.round((dau / users.total) * 100) : 0
  const maxWeeklySignup = Math.max(1, ...weeklySignups.map(w => w.count))

  const actionItems = [
    ai.pendingReports > 0 && { key: 'reports', label: t('admin.overview.actionReports', { count: ai.pendingReports }, lang), cta: t('admin.overview.actionReview', undefined, lang), onClick: () => onNavigate('ai') },
    paymentErrorsToday > 0 && { key: 'payments', label: t('admin.overview.actionPayments', { count: paymentErrorsToday }, lang), cta: t('admin.overview.actionView', undefined, lang), onClick: () => onNavigate('users') },
    subscriptions.trialsExpiringSoon > 0 && { key: 'trials', label: t('admin.overview.actionTrials', { count: subscriptions.trialsExpiringSoon }, lang), cta: t('admin.overview.actionMessage', undefined, lang), onClick: () => onNavigate('messages') },
  ].filter(Boolean)

  return (
    <div style={styles.sectionBody}>
      <SectionHeader
        title={t('admin.section.overview.title', undefined, lang)}
        subtitle={overviewDateLabel(lang)}
        right={<button type="button" className="btn-secondary" style={{ width: 'auto', padding: '9px 16px' }} onClick={handleExport}>{t('admin.overview.exportBtn', undefined, lang)}</button>}
      />

      <div style={styles.grid12}>
        <div style={{ gridColumn: 'span 3' }}>
          <div style={styles.darkStatCard}>
            <p style={styles.darkStatLabel}>{t('admin.overview.activeSubscribers', undefined, lang)}</p>
            <p style={styles.darkStatValue}>{subscriptions.activeTotal}</p>
            <p style={styles.darkStatSub}>
              {subscriptions.newActivePct30d != null
                ? t('admin.overview.activeGrowth', { count: subscriptions.newActiveIn30d, pct: subscriptions.newActivePct30d }, lang)
                : t('admin.overview.activeGrowthNoPct', { count: subscriptions.newActiveIn30d }, lang)}
            </p>
          </div>
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <div style={styles.whiteStatCard}>
            <p style={styles.whiteStatLabel}>{t('admin.overview.mrr', undefined, lang)}</p>
            <p style={styles.whiteStatValue}>{formatAmount(subscriptions.mrrCents.brl, 'brl')}</p>
            <p style={styles.whiteStatSubMuted}>{formatAmount(subscriptions.mrrCents.usd, 'usd')}</p>
          </div>
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <div style={styles.whiteStatCard}>
            <p style={styles.whiteStatLabel}>{t('admin.overview.dau', undefined, lang)}</p>
            <p style={styles.whiteStatValue}>{dau}</p>
            <p style={styles.whiteStatSubMuted}>{t('admin.overview.pctOfUsers', { pct: dauPct }, lang)}</p>
          </div>
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <div style={styles.whiteStatCard}>
            <p style={styles.whiteStatLabel}>{t('admin.overview.trialsNow', undefined, lang)}</p>
            <p style={styles.whiteStatValue}>{subscriptions.trialCount}</p>
            <p style={styles.whiteStatSubMuted}>{t('admin.overview.trialsExpiringSub', { count: subscriptions.trialsExpiringSoon }, lang)}</p>
          </div>
        </div>

        <div style={{ gridColumn: 'span 5' }}>
          <div style={styles.whiteCard}>
            <div style={styles.cardHeaderRow}>
              <p style={styles.cardKicker}>{t('admin.overview.weeklySignups', undefined, lang)}</p>
              <span style={styles.cardHeaderAside}>{t('admin.overview.last12Weeks', undefined, lang)}</span>
            </div>
            <div style={styles.barsRow}>
              {weeklySignups.map((w, i) => (
                <div key={w.weekStart} style={{ flex: 1, height: `${Math.max(6, Math.round((w.count / maxWeeklySignup) * 100))}%`, borderRadius: 5, background: i === weeklySignups.length - 1 ? 'var(--bento-accent)' : 'var(--bento-ink)' }} title={`${w.weekStart}: ${w.count}`} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <div style={styles.whiteCard}>
            <div style={styles.cardHeaderRow}>
              <p style={styles.cardKicker}>{t('admin.funnel.title', undefined, lang)}</p>
              {/* Leva pra 'Onboarding' na nav lateral — hoje é a tela honesta
                  de "ainda não construída" (ver NAV_SECTIONS), porque o
                  detalhe completo do funil não existe como página própria
                  nesta leva; o resumo aqui já é o dado real. */}
              <button type="button" style={styles.cardHeaderLink} onClick={() => onNavigate('onboarding')}>{t('admin.overview.viewDetail', undefined, lang)}</button>
            </div>
            <div style={styles.funnelFilters}>
              <div style={styles.funnelFilterGroup}>
                {FUNNEL_DAY_OPTIONS.map(d => (
                  <button key={d} type="button" style={{ ...styles.chipBtn, ...(funnelDays === d ? styles.chipBtnActive : null) }} onClick={() => setFunnelDays(d)}>
                    {t('admin.funnel.daysOption', { days: d }, lang)}
                  </button>
                ))}
              </div>
              <div style={styles.funnelFilterGroup}>
                {FUNNEL_LANGUAGE_OPTIONS.map(l => (
                  <button key={l} type="button" style={{ ...styles.chipBtn, ...(funnelLanguage === l ? styles.chipBtnActive : null) }} onClick={() => setFunnelLanguage(l)}>
                    {t(`admin.funnel.language.${l}`, undefined, lang)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {onboardingFunnel.steps.slice(0, 5).map(s => (
                <FunnelRow key={s.step} label={t(`admin.funnel.step.${s.step}`, undefined, lang)} count={s.count} pct={s.pct} />
              ))}
              <FunnelRow label={t('admin.funnel.subscribedLabel', undefined, lang)} count={onboardingFunnel.subscribed} pct={onboardingFunnel.subscribedPct} highlight />
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...styles.darkCard, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={styles.diamondDot} />
              <p style={styles.darkKicker}>{t('admin.overview.aiToday', undefined, lang)}</p>
            </div>
            <p style={styles.darkStatValue}>{ai.questionsToday}</p>
            <p style={styles.darkStatSub}>{t('admin.overview.aiQuestions', undefined, lang)}</p>
            {ai.pendingReports > 0 && (
              <button style={styles.darkActionRow} onClick={() => onNavigate('ai')}>
                <span>{t('admin.overview.aiPendingReports', { count: ai.pendingReports }, lang)}</span>
                <span>{t('admin.overview.actionReview', undefined, lang)} →</span>
              </button>
            )}
          </div>
          <div style={styles.whiteCard}>
            <p style={styles.cardKicker}>{t('admin.overview.contactCard', undefined, lang)}</p>
            <div style={styles.miniStatRow}>
              <span style={styles.miniStatLabel}>{t('admin.metric.contactTotal', undefined, lang)}</span>
              <span style={styles.miniStatValue}>{contact.total}</span>
            </div>
            <div style={styles.miniStatRow}>
              <span style={styles.miniStatLabel}>{t('admin.metric.contactUnanswered', undefined, lang)}</span>
              <span style={{ ...styles.miniStatValue, color: contact.unanswered > 0 ? 'var(--bento-accent)' : 'var(--bento-ink)' }}>{contact.unanswered}</span>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <div style={styles.whiteCard}>
            <div style={styles.cardHeaderRow}>
              <p style={styles.cardKicker}>{t('admin.overview.retentionCohort', { month: retentionByWeek.cohortMonth }, lang)}</p>
              <span style={styles.cardHeaderAside}>{t('admin.overview.pctActive', undefined, lang)}</span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {retentionByWeek.weeks.map(w => (
                <div key={w.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: '100%', height: 36, borderRadius: 8, background: w.pct == null ? 'var(--bento-line)' : w.week <= 1 ? 'var(--bento-ink)' : 'var(--bento-t3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ font: '800 11px/1 var(--font-bento)', color: w.pct == null ? 'var(--bento-t4)' : '#fff' }}>{w.pct ?? '—'}</span>
                  </div>
                  <span style={styles.weekLabel}>S{w.week}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ gridColumn: 'span 4' }}>
          <div style={styles.whiteCard}>
            <div style={styles.cardHeaderRow}>
              <p style={{ ...styles.cardKicker, margin: 0 }}>{t('admin.overview.groupsTitle', undefined, lang)}</p>
              {/* Leva pra 'Grupos e igrejas' na nav — mesma honestidade do
                  link do funil acima: hoje é a tela de "ainda não
                  construída", os 3 números aqui já são o dado real. */}
              <button type="button" style={styles.cardHeaderLink} onClick={() => onNavigate('groups')}>{t('admin.overview.viewAll', undefined, lang)}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <div style={styles.groupStatChip}>
                <p style={styles.groupStatValue}>{groups.activeCount}</p>
                <p style={styles.groupStatLabel}>{t('admin.overview.activeGroups', undefined, lang)}</p>
              </div>
              <div style={styles.groupStatChip}>
                <p style={styles.groupStatValue}>{groups.pctSubscribersInGroup}%</p>
                <p style={styles.groupStatLabel}>{t('admin.overview.pctInGroup', undefined, lang)}</p>
              </div>
              <div style={{ ...styles.groupStatChip, background: 'var(--bento-sand)' }}>
                <p style={{ ...styles.groupStatValue, color: 'var(--bento-sand-ink-strong)' }}>{groups.retentionMultiplier != null ? `${groups.retentionMultiplier}×` : '—'}</p>
                <p style={{ ...styles.groupStatLabel, color: 'var(--bento-sand-label)' }}>{t('admin.overview.retentionMultiplier', undefined, lang)}</p>
              </div>
            </div>
          </div>
        </div>
        <div style={{ gridColumn: 'span 4' }}>
          <div style={styles.sandCard}>
            <p style={styles.sandKicker}>{t('admin.overview.needsAction', undefined, lang)}</p>
            {actionItems.length === 0 ? (
              <p style={styles.sandAllGood}>{t('admin.overview.allGood', undefined, lang)}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {actionItems.map(item => (
                  <button key={item.key} style={styles.sandActionRow} onClick={item.onClick}>
                    <span style={styles.sandDot} />
                    <span style={styles.sandActionLabel}>{item.label}</span>
                    <span style={styles.sandActionCta}>{item.cta}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FunnelRow({ label, count, pct, highlight }) {
  return (
    <div style={styles.funnelRow}>
      <span style={{ ...styles.funnelLabel, ...(highlight ? styles.funnelLabelHighlight : null) }}>{label}</span>
      <div style={styles.funnelBarTrack}>
        <div style={{ ...styles.funnelBarFill, ...(highlight ? styles.funnelBarFillHighlight : null), width: `${pct}%` }} />
      </div>
      <span style={{ ...styles.funnelCount, ...(highlight ? styles.funnelLabelHighlight : null) }}>{count}</span>
    </div>
  )
}

// ══════════════════════════ Usuários (23b) ══════════════════════════
// Mantém o fluxo de busca (não a tabela paginada com coluna de grupo/CSV/
// impersonar/desativar do mockup — decisão do Bloco 14: sem infra de
// paginação completa nem ação de sessão-como-outro-usuário nesta leva).
function UsersSection({ lang, onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      searchAdminUsers(query.trim())
        .then(users => { if (!cancelled) setResults(users) })
        .catch(() => { if (!cancelled) setResults([]) })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  function selectUser(u) {
    setResults([])
    setQuery('')
    setDetail(null)
    setDetailError('')
    setLoadingDetail(true)
    getAdminUserDetail(u.id)
      .then(setDetail)
      .catch(err => setDetailError(err.message))
      .finally(() => setLoadingDetail(false))
  }

  return (
    <div style={styles.sectionBody}>
      <SectionHeader
        title={t('admin.section.users.title', undefined, lang)}
        subtitle={t('admin.section.users.subtitle', undefined, lang)}
        right={<button type="button" className="btn-primary" style={{ width: 'auto', padding: '9px 16px' }} onClick={() => onNavigate('messages')}>{t('admin.users.sendMessageBtn', undefined, lang)}</button>}
      />
      <div style={styles.twoPane}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={styles.searchBar}>
            <AppIcon name="Search" size={16} color="var(--bento-t4)" />
            <input style={styles.searchInput} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('admin.users.searchPlaceholder', undefined, lang)} />
          </div>
          {searching && <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>}
          {results.length > 0 && (
            <div style={styles.whiteCard}>
              {results.map(u => (
                <button key={u.id} type="button" style={styles.userRow} onClick={() => selectUser(u)}>
                  <span style={styles.userRowName}>{u.name ?? u.email}</span>
                  {u.name && <span style={styles.userRowEmail}>{u.email}</span>}
                </button>
              ))}
            </div>
          )}
          {!query.trim() && !detail && <p style={styles.hint}>{t('admin.users.searchPlaceholder', undefined, lang)}</p>}
        </div>

        <div style={{ width: 340, flexShrink: 0 }}>
          {loadingDetail && <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>}
          {detailError && <p style={styles.errorMsg}>{detailError}</p>}
          {detail && <UserDetailCard detail={detail} lang={lang} />}
        </div>
      </div>
    </div>
  )
}

function UserDetailCard({ detail, lang }) {
  const sub = detail.subscription
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'
  const joined = new Date(detail.createdAt).toLocaleDateString(locale)
  const lastSignIn = detail.lastSignInAt ? new Date(detail.lastSignInAt).toLocaleDateString(locale) : '—'

  return (
    <div style={styles.userDetailCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={styles.userDetailAvatar}>{(detail.name ?? detail.email ?? '?').slice(0, 2).toUpperCase()}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={styles.userDetailName}>{detail.name ?? detail.email}</p>
          <p style={styles.userDetailEmail}>{detail.email}</p>
        </div>
        <span style={styles.userDetailLangBadge}>{detail.language.toUpperCase()}</span>
      </div>

      <div style={styles.userDetailGrid}>
        <UserDetailStat label={t('admin.users.joined', undefined, lang)} value={joined} />
        <UserDetailStat label={t('admin.users.lastSignIn', undefined, lang)} value={lastSignIn} />
        <UserDetailStat label={t('admin.users.streak', undefined, lang)} value={detail.progress.streak} />
        <UserDetailStat label={t('admin.users.biblePercent', undefined, lang)} value={`${detail.progress.biblePercent}%`} />
      </div>

      <div>
        <p style={styles.userDetailSectionTitle}>{t('admin.users.subscription', undefined, lang)}</p>
        {sub ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <StatusBadge status={sub.status} lang={lang} />
            <span style={styles.userDetailSubDetail}>
              {sub.accessType === 'recurring'
                ? `${t(sub.plan === 'annual' ? 'admin.metric.annual' : 'admin.metric.monthly', undefined, lang)} · ${formatAmount(sub.amountCents, sub.currency ?? 'brl')}`
                : t(`admin.users.accessType.${sub.accessType}`, undefined, lang)}
            </span>
          </div>
        ) : (
          <p style={styles.hint}>{t('admin.users.noSubscription', undefined, lang)}</p>
        )}
      </div>

      <div>
        <p style={styles.userDetailSectionTitle}>{t('admin.users.profile', undefined, lang)}</p>
        <p style={styles.userDetailSubDetail}>{t(detail.profile?.isPublic ? 'admin.users.profilePublic' : 'admin.users.profilePrivate', undefined, lang)}</p>
      </div>

      <a href={`mailto:${detail.email}`} style={styles.userDetailMailBtn}>{t('admin.users.emailBtn', undefined, lang)}</a>
    </div>
  )
}

function StatusBadge({ status, lang }) {
  const isGood = status === 'active' || status === 'trialing'
  return (
    <span style={{ ...styles.statusBadge, ...(isGood ? styles.statusBadgeGood : styles.statusBadgeBad) }}>
      {t(`admin.users.status.${status}`, undefined, lang)}
    </span>
  )
}

function UserDetailStat({ label, value }) {
  return (
    <div style={styles.userDetailStatBox}>
      <p style={styles.userDetailStatLabel}>{label}</p>
      <p style={styles.userDetailStatValue}>{value}</p>
    </div>
  )
}

// ══════════════════════════ IA — moderação (item 18) ══════════════════════════
function AiSection({ lang }) {
  const [filter, setFilter] = useState('pending')
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const R = (k, vars) => t(`admin.reports.${k}`, vars, lang)

  function reload() {
    setReports(null)
    listAnswerReports({ filter }).then(setReports).catch(err => setError(err.message))
  }
  useEffect(reload, [filter])

  async function setStatus(report, status) {
    if (busyId) return
    setBusyId(report.id)
    setError('')
    try {
      await updateAnswerReport({ id: report.id, status })
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function passageLabel(key) {
    const m = key.match(/^(.+):(\d+):(\d+)-(\d+)$/)
    if (!m) return key
    const verses = m[3] === m[4] ? m[3] : `${m[3]}-${m[4]}`
    return `${m[1]} ${m[2]}:${verses}`
  }

  function answerText(answer) {
    if (!answer || typeof answer !== 'object') return ''
    if (answer.outcome === 'answer') return answer.reply ?? ''
    return `[${answer.outcome}] ${answer.reply ?? answer.nearTopic ?? ''}`.trim()
  }

  return (
    <div style={styles.sectionBody}>
      <SectionHeader title={t('admin.section.ai.title', undefined, lang)} subtitle={t('admin.section.ai.subtitle', undefined, lang)} />
      <div style={styles.filterRow}>
        {['pending', 'all'].map(f => (
          <button key={f} style={{ ...styles.chipBtn, ...(filter === f ? styles.chipBtnActive : null) }} onClick={() => setFilter(f)}>{R(`filter.${f}`)}</button>
        ))}
      </div>

      {error && <p style={styles.errorMsg}>{error}</p>}
      {!reports && <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>}
      {reports?.length === 0 && <p style={styles.hint}>{R('empty')}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reports?.map(r => (
          <div key={r.id} style={styles.whiteCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div>
                <p style={styles.userRowName}>{passageLabel(r.passageKey)}</p>
                <p style={styles.userRowEmail}>
                  {[r.reporterName, r.reporterEmail].filter(Boolean).join(' · ')}
                  {' · '}{new Date(r.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR')}
                  {r.tone ? ` · ${R(`tone.${r.tone}`)}` : ''}
                </p>
              </div>
              {r.status === 'pending' ? <span style={styles.pendingBadge}>{R('status.pending')}</span> : <span style={styles.answeredBadge}>{R(`status.${r.status}`)}</span>}
            </div>

            <div style={styles.replyPreview}>
              <p style={styles.replyPreviewLabel}>{R('question')}</p>
              <p style={styles.replyPreviewBody}>{r.question}</p>
            </div>
            <div style={styles.replyPreview}>
              <p style={styles.replyPreviewLabel}>{R('answer')}</p>
              <p style={styles.replyPreviewBody}>{answerText(r.answer)}</p>
              {r.answer?.supportCitation && (
                <p style={{ ...styles.replyPreviewBody, marginTop: 6, fontStyle: 'italic' }}>{r.answer.supportCitation.reference}: "{r.answer.supportCitation.quote}"</p>
              )}
              {r.answer?.expansionCitation && (
                <p style={{ ...styles.replyPreviewBody, marginTop: 4 }}>{r.answer.expansionCitation.reference} — {r.answer.expansionCitation.note}</p>
              )}
            </div>
            {r.reason && (
              <div style={styles.replyPreview}>
                <p style={styles.replyPreviewLabel}>{R('reason')}</p>
                <p style={styles.replyPreviewBody}>{r.reason}</p>
              </div>
            )}

            {r.status === 'pending' ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} disabled={busyId === r.id} onClick={() => setStatus(r, 'reviewed')}>{R('markReviewed')}</button>
                <button style={styles.deleteBtn} disabled={busyId === r.id} onClick={() => setStatus(r, 'dismissed')}>{R('dismiss')}</button>
              </div>
            ) : (
              <button style={{ ...styles.deleteBtn, alignSelf: 'flex-start', color: 'var(--bento-t3)', marginTop: 8 }} disabled={busyId === r.id} onClick={() => setStatus(r, 'pending')}>{R('reopen')}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════ Mensagens (23c) + Fale Conosco ══════════════════════════
// O mockup só desenha o compositor de aviso — Fale Conosco (mensagens que
// CHEGAM, não que saem) não tem tela própria nos 9 itens de nav, então
// entra como sub-aba desta mesma seção em vez de inventar um décimo item.
const MESSAGES_SUBTABS = ['broadcast', 'contact']
const SEGMENT_PRESETS = ['trialExpiring48h', 'inactive14d', 'noGroup']
const RECIPIENT_MODES = ['all', 'user', 'segment']

function MessagesSection({ lang }) {
  const [subtab, setSubtab] = useState('broadcast')
  return (
    <div style={styles.sectionBody}>
      <SectionHeader title={t('admin.section.messages.title', undefined, lang)} subtitle={t('admin.section.messages.subtitle', undefined, lang)} />
      <div style={styles.filterRow}>
        {MESSAGES_SUBTABS.map(s => (
          <button key={s} style={{ ...styles.chipBtn, ...(subtab === s ? styles.chipBtnActive : null) }} onClick={() => setSubtab(s)}>{t(`admin.messages.subnav.${s}`, undefined, lang)}</button>
        ))}
      </div>
      {subtab === 'broadcast' ? <BroadcastSection lang={lang} /> : <ContactSection lang={lang} />}
    </div>
  )
}

function segmentLabelFor(recipientMode, selectedUser, segment, lang) {
  if (recipientMode === 'all') return t('admin.broadcast.recipientMode.all', undefined, lang)
  if (recipientMode === 'user') return selectedUser?.email ?? t('admin.broadcast.recipientMode.user', undefined, lang)
  if (segment?.preset) return t(`admin.messages.preset.${segment.preset}`, undefined, lang)
  return t('admin.broadcast.recipientMode.segment', undefined, lang)
}

function BroadcastSection({ lang }) {
  const [titlePt, setTitlePt] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [bodyPt, setBodyPt] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [alsoEmail, setAlsoEmail] = useState(false)
  const [alsoPush, setAlsoPush] = useState(false)
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [previewCount, setPreviewCount] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [log, setLog] = useState(null)

  const [recipientMode, setRecipientMode] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [segment, setSegment] = useState({ accessType: null, plan: null, currency: null, language: null, groupId: null, preset: null })
  const [languages, setLanguages] = useState(['pt', 'en'])
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState([])
  const [searchingUser, setSearchingUser] = useState(false)
  const [groups, setGroups] = useState([])

  function reloadLog() {
    setLog(null)
    listBroadcastLog().then(setLog).catch(() => setLog([]))
  }
  useEffect(reloadLog, [])

  useEffect(() => {
    if (recipientMode === 'segment') listReadingGroupsForAdmin().then(setGroups).catch(() => setGroups([]))
  }, [recipientMode])

  useEffect(() => {
    if (recipientMode !== 'user' || !userQuery.trim()) { setUserResults([]); return }
    let cancelled = false
    setSearchingUser(true)
    const timer = setTimeout(() => {
      searchAdminUsers(userQuery.trim())
        .then(users => { if (!cancelled) setUserResults(users) })
        .catch(() => { if (!cancelled) setUserResults([]) })
        .finally(() => { if (!cancelled) setSearchingUser(false) })
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [recipientMode, userQuery])

  function resetFeedback() {
    setPreviewCount(null)
    setResult(null)
  }

  function toggleLanguage(l) {
    setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
    resetFeedback()
  }

  function togglePreset(preset) {
    setSegment(prev => ({ ...prev, preset: prev.preset === preset ? null : preset }))
    resetFeedback()
  }

  function updateSegment(patch) {
    setSegment(prev => ({ ...prev, ...patch }))
    resetFeedback()
  }

  const recipientPayload = {
    recipientMode,
    recipientUserId: recipientMode === 'user' ? selectedUser?.id ?? null : null,
    segment: recipientMode === 'segment' ? segment : null,
    segmentLabel: segmentLabelFor(recipientMode, selectedUser, segment, lang),
  }

  // Botões nunca ficam disabled por validação (ver comentário original em
  // Bloco 11/adminStore) — valida no clique e mostra por que não deu, em
  // vez de um botão "quebrado" sem explicação.
  function validationError() {
    if (languages.length === 0) return t('admin.broadcast.missingLanguageError', undefined, lang)
    if (languages.includes('pt') && (!titlePt.trim() || !bodyPt.trim())) return t('admin.broadcast.missingFieldsError', undefined, lang)
    if (languages.includes('en') && (!titleEn.trim() || !bodyEn.trim())) return t('admin.broadcast.missingFieldsError', undefined, lang)
    if (recipientMode === 'user' && !selectedUser) return t('admin.broadcast.missingUserError', undefined, lang)
    return null
  }

  async function handleCheckRecipients() {
    if (checking) return
    const msg = validationError()
    if (msg) { setError(msg); return }
    setChecking(true)
    setError('')
    try {
      const res = await sendBroadcast({ languages, titlePt, titleEn, bodyPt, bodyEn, sendEmail: alsoEmail, sendPush: alsoPush, ...recipientPayload, dryRun: true })
      setPreviewCount(res.recipients)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  async function handleSubmit() {
    if (sending) return
    const msg = validationError()
    if (msg) { setError(msg); return }
    setSending(true)
    setError('')
    setResult(null)
    try {
      const res = await sendBroadcast({ languages, titlePt, titleEn, bodyPt, bodyEn, sendEmail: alsoEmail, sendPush: alsoPush, ...recipientPayload })
      setResult(res)
      setTitlePt(''); setTitleEn(''); setBodyPt(''); setBodyEn('')
      setPreviewCount(null)
      reloadLog()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={styles.twoPane}>
      <div style={{ ...styles.whiteCard, flex: 1.35, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <p style={styles.fieldLabel}>{t('admin.broadcast.recipientLabel', undefined, lang)}</p>
          <div style={styles.filterRow}>
            {RECIPIENT_MODES.map(m => (
              <button key={m} type="button" style={{ ...styles.chipBtn, ...(recipientMode === m ? styles.chipBtnActive : null) }} onClick={() => { setRecipientMode(m); resetFeedback() }}>
                {t(`admin.broadcast.recipientMode.${m}`, undefined, lang)}
              </button>
            ))}
          </div>

          {recipientMode === 'user' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <input style={styles.input} type="text" value={selectedUser ? selectedUser.email : userQuery} onChange={e => { setSelectedUser(null); setUserQuery(e.target.value) }} placeholder={t('admin.broadcast.userSearchPlaceholder', undefined, lang)} />
              {selectedUser && <button type="button" style={styles.linkBtn} onClick={() => { setSelectedUser(null); setUserQuery('') }}>{t('admin.broadcast.clearSelection', undefined, lang)}</button>}
              {!selectedUser && searchingUser && <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>}
              {!selectedUser && userResults.length > 0 && (
                <div style={styles.userResultsBox}>
                  {userResults.map(u => (
                    <button key={u.id} type="button" style={styles.userResultItem} onClick={() => { setSelectedUser(u); setUserResults([]) }}>
                      <span style={{ fontWeight: 700 }}>{u.name ?? u.email}</span>
                      {u.name && <span style={{ color: 'var(--bento-t3)', marginLeft: 6 }}>{u.email}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {recipientMode === 'segment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <p style={styles.presetHint}>{t('admin.messages.presetHint', undefined, lang)}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SEGMENT_PRESETS.map(p => (
                  <button key={p} type="button" style={{ ...styles.pill, ...(segment.preset === p ? styles.pillActive : null) }} onClick={() => togglePreset(p)}>
                    {t(`admin.messages.preset.${p}`, undefined, lang)}
                  </button>
                ))}
              </div>
              <div style={styles.segmentGrid}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={styles.fieldLabel}>{t('admin.broadcast.segment.accessType', undefined, lang)}</span>
                  <select style={styles.select} value={segment.accessType ?? ''} onChange={e => updateSegment({ accessType: e.target.value || null })}>
                    <option value="">{t('admin.broadcast.segment.any', undefined, lang)}</option>
                    <option value="free">{t('admin.broadcast.segment.free', undefined, lang)}</option>
                    <option value="lifetime">{t('admin.broadcast.segment.lifetime', undefined, lang)}</option>
                    <option value="recurring">{t('admin.broadcast.segment.recurring', undefined, lang)}</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={styles.fieldLabel}>{t('admin.broadcast.segment.plan', undefined, lang)}</span>
                  <select style={styles.select} value={segment.plan ?? ''} onChange={e => updateSegment({ plan: e.target.value || null })}>
                    <option value="">{t('admin.broadcast.segment.any', undefined, lang)}</option>
                    <option value="monthly">{t('admin.metric.monthly', undefined, lang)}</option>
                    <option value="annual">{t('admin.metric.annual', undefined, lang)}</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={styles.fieldLabel}>{t('admin.broadcast.segment.language', undefined, lang)}</span>
                  <select style={styles.select} value={segment.language ?? ''} onChange={e => updateSegment({ language: e.target.value || null })}>
                    <option value="">{t('admin.broadcast.segment.any', undefined, lang)}</option>
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={styles.fieldLabel}>{t('admin.broadcast.segment.group', undefined, lang)}</span>
                  <select style={styles.select} value={segment.groupId ?? ''} onChange={e => updateSegment({ groupId: e.target.value || null })}>
                    <option value="">{t('admin.broadcast.segment.any', undefined, lang)}</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>

        <div>
          <p style={styles.fieldLabel}>{t('admin.broadcast.languageLabel', undefined, lang)}</p>
          <div style={styles.filterRow}>
            {['pt', 'en'].map(l => (
              <button key={l} type="button" style={{ ...styles.chipBtn, ...(languages.includes(l) ? styles.chipBtnActive : null) }} onClick={() => toggleLanguage(l)}>{t(`admin.broadcast.language.${l}`, undefined, lang)}</button>
            ))}
          </div>
        </div>

        {languages.includes('pt') && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={styles.fieldLabel}>{t('admin.broadcast.titlePt', undefined, lang)}</span>
              <input style={styles.input} type="text" value={titlePt} onChange={e => setTitlePt(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={styles.fieldLabel}>{t('admin.broadcast.bodyPt', undefined, lang)}</span>
              <textarea style={styles.textarea} rows={3} value={bodyPt} onChange={e => setBodyPt(e.target.value)} />
            </label>
          </>
        )}
        {languages.includes('en') && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={styles.fieldLabel}>{t('admin.broadcast.titleEn', undefined, lang)}</span>
              <input style={styles.input} type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={styles.fieldLabel}>{t('admin.broadcast.bodyEn', undefined, lang)}</span>
              <textarea style={styles.textarea} rows={3} value={bodyEn} onChange={e => setBodyEn(e.target.value)} />
            </label>
          </>
        )}
        <p style={styles.presetHint}>{t('admin.messages.nameVarHint', undefined, lang)}</p>

        <label style={styles.checkboxRow}>
          <input type="checkbox" checked={alsoEmail} onChange={e => setAlsoEmail(e.target.checked)} />
          <span style={styles.checkboxLabel}>{t('admin.broadcast.alsoEmail', undefined, lang)}</span>
        </label>
        <label style={styles.checkboxRow}>
          <input type="checkbox" checked={alsoPush} onChange={e => setAlsoPush(e.target.checked)} />
          <span style={styles.checkboxLabel}>{t('admin.messages.sendPush', undefined, lang)}</span>
        </label>

        {error && <p style={styles.errorMsg}>{error}</p>}
        {previewCount != null && <p style={styles.hint}>{t('admin.broadcast.previewCount', { count: previewCount }, lang)}</p>}
        {result && (
          <p style={styles.resultMsg}>
            {t('admin.broadcast.resultWithPush', { recipients: result.recipients, sent: result.emailsSent, failed: result.emailsFailed, pushSent: result.pushSent, pushFailed: result.pushFailed }, lang)}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button className="btn-secondary" style={{ flex: 1 }} disabled={checking || sending} onClick={handleCheckRecipients}>{checking ? t('admin.loading', undefined, lang) : t('admin.broadcast.checkBtn', undefined, lang)}</button>
          <button className="btn-primary" style={{ flex: 1 }} disabled={sending || checking} onClick={handleSubmit}>{sending ? t('admin.sending', undefined, lang) : t('admin.broadcast.sendBtn', undefined, lang)}</button>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.whiteCard}>
          <p style={styles.cardKicker}>{t('admin.messages.recentTitle', undefined, lang)}</p>
          {!log && <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>}
          {log?.length === 0 && <p style={styles.hint}>{t('admin.messages.recentEmpty', undefined, lang)}</p>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {log?.map(entry => (
              <div key={entry.id} style={styles.logRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.userRowName}>{entry.title || entry.segment_label || '—'}</p>
                  <p style={styles.userRowEmail}>
                    {entry.recipient_count} · {(entry.channels ?? []).map(c => t(`admin.messages.channels.${c}`, undefined, lang)).join(' + ')}
                  </p>
                </div>
                <span style={styles.logDate}>{new Date(entry.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactSection({ lang }) {
  const [filter, setFilter] = useState('unanswered')
  const [messages, setMessages] = useState(null)
  const [error, setError] = useState('')
  const [replyingId, setReplyingId] = useState(null)
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)

  function reload() {
    setMessages(null)
    listContactMessages({ filter }).then(setMessages).catch(err => setError(err.message))
  }
  useEffect(reload, [filter])

  function startReply(msg) {
    setReplyingId(msg.id)
    setReplyBody('')
  }

  async function submitReply(id) {
    if (!replyBody.trim() || sending) return
    setSending(true)
    setError('')
    try {
      await replyToContactMessage({ id, replyBody: replyBody.trim() })
      setReplyingId(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(msg) {
    if (!window.confirm(t('admin.contact.deleteConfirm', undefined, lang))) return
    setError('')
    try {
      await deleteContactMessage({ id: msg.id })
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={styles.filterRow}>
        {['unanswered', 'all'].map(f => (
          <button key={f} style={{ ...styles.chipBtn, ...(filter === f ? styles.chipBtnActive : null) }} onClick={() => setFilter(f)}>{t(`admin.contact.filter.${f}`, undefined, lang)}</button>
        ))}
      </div>

      {error && <p style={styles.errorMsg}>{error}</p>}
      {!messages && <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>}
      {messages?.length === 0 && <p style={styles.hint}>{t('admin.contact.empty', undefined, lang)}</p>}

      {messages?.map(msg => (
        <div key={msg.id} style={styles.whiteCard}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div>
              <p style={styles.userRowName}>{msg.name}</p>
              <p style={styles.userRowEmail}>{msg.email}</p>
            </div>
            {msg.replied_at ? <span style={styles.answeredBadge}>{t('admin.contact.answered', undefined, lang)}</span> : <span style={styles.pendingBadge}>{t('admin.contact.pending', undefined, lang)}</span>}
          </div>
          <p style={styles.replyPreviewBody}>{msg.message}</p>

          {msg.admin_reply && (
            <div style={{ ...styles.replyPreview, marginTop: 8 }}>
              <p style={styles.replyPreviewLabel}>{t('admin.contact.yourReply', undefined, lang)}</p>
              <p style={styles.replyPreviewBody}>{msg.admin_reply}</p>
            </div>
          )}

          {!msg.replied_at && (
            replyingId === msg.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <textarea style={styles.textarea} rows={3} value={replyBody} onChange={e => setReplyBody(e.target.value)} placeholder={t('admin.contact.replyPlaceholder', undefined, lang)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ flex: 1 }} disabled={sending} onClick={() => submitReply(msg.id)}>{sending ? t('admin.sending', undefined, lang) : t('admin.contact.sendReplyBtn', undefined, lang)}</button>
                  <button className="btn-secondary" style={{ width: 'auto', padding: '9px 16px' }} onClick={() => setReplyingId(null)}>{t('admin.cancelBtn', undefined, lang)}</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => startReply(msg)}>{t('admin.contact.replyBtn', undefined, lang)}</button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(msg)}>{t('admin.contact.deleteBtn', undefined, lang)}</button>
              </div>
            )
          )}

          {msg.replied_at && (
            <button style={{ ...styles.deleteBtn, alignSelf: 'flex-start', marginTop: 8 }} onClick={() => handleDelete(msg)}>{t('admin.contact.deleteBtn', undefined, lang)}</button>
          )}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════ Convites e códigos (23d) ══════════════════════════
// Mantém o modelo existente (1 código = 1 e-mail, uso único) — não o
// sistema de código reutilizável/multi-uso/ligado-a-igreja/com-indicação
// do mockup (Bloco 14, decisão registrada no PR: fora de escopo nesta leva).
function InvitesSection({ lang }) {
  const [email, setEmail] = useState('')
  const [kind, setKind] = useState('free')
  const [discountPercent, setDiscountPercent] = useState('50')
  const [discountDuration, setDiscountDuration] = useState('forever')
  const [emailLanguages, setEmailLanguages] = useState(['pt', 'en'])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)
  const [invites, setInvites] = useState(null)

  function toggleEmailLanguage(l) {
    setEmailLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
  }

  function reload() {
    setInvites(null)
    listAdminInvites().then(setInvites).catch(err => setError(err.message))
  }
  useEffect(reload, [])

  async function handleCreate() {
    if (creating || !email.trim()) return
    if (emailLanguages.length === 0) { setError(t('admin.invites.missingLanguageError', undefined, lang)); return }
    setCreating(true)
    setError('')
    setCreated(null)
    try {
      const res = await createInvite({
        email: email.trim(),
        kind,
        discountPercent: kind === 'discount' ? Number(discountPercent) : undefined,
        discountDuration: kind === 'discount' ? discountDuration : undefined,
        languages: emailLanguages,
      })
      setCreated(res)
      setEmail('')
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(invite) {
    if (!window.confirm(t('admin.invites.revokeConfirm', undefined, lang))) return
    setError('')
    try {
      await revokeInvite({ id: invite.id })
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={styles.sectionBody}>
      <SectionHeader title={t('admin.section.invites.title', undefined, lang)} subtitle={t('admin.section.invites.subtitle', undefined, lang)} />
      <div style={styles.twoPane}>
        <div style={{ ...styles.whiteCard, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={styles.fieldLabel}>{t('admin.invites.emailLabel', undefined, lang)}</span>
            <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pessoa@exemplo.com" />
          </label>

          <div>
            <p style={styles.fieldLabel}>{t('admin.invites.kindLabel', undefined, lang)}</p>
            <div style={styles.filterRow}>
              {['free', 'discount'].map(k => (
                <button key={k} type="button" style={{ ...styles.chipBtn, ...(kind === k ? styles.chipBtnActive : null) }} onClick={() => setKind(k)}>{t(`admin.invites.kind.${k}`, undefined, lang)}</button>
              ))}
            </div>
          </div>

          {kind === 'discount' && (
            <div style={styles.segmentGrid}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={styles.fieldLabel}>{t('admin.invites.discountPercentLabel', undefined, lang)}</span>
                <input style={styles.input} type="number" min="1" max="100" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={styles.fieldLabel}>{t('admin.invites.discountDurationLabel', undefined, lang)}</span>
                <select style={styles.select} value={discountDuration} onChange={e => setDiscountDuration(e.target.value)}>
                  <option value="once">{t('admin.invites.durationOnce', undefined, lang)}</option>
                  <option value="forever">{t('admin.invites.durationForever', undefined, lang)}</option>
                </select>
              </label>
            </div>
          )}

          <div>
            <p style={styles.fieldLabel}>{t('admin.invites.emailLanguageLabel', undefined, lang)}</p>
            <div style={styles.filterRow}>
              {['pt', 'en'].map(l => (
                <button key={l} type="button" style={{ ...styles.chipBtn, ...(emailLanguages.includes(l) ? styles.chipBtnActive : null) }} onClick={() => toggleEmailLanguage(l)}>{t(`admin.broadcast.language.${l}`, undefined, lang)}</button>
              ))}
            </div>
          </div>

          {error && <p style={styles.errorMsg}>{error}</p>}
          {created && (
            <p style={styles.resultMsg}>
              {t('admin.invites.createdResult', { code: created.code }, lang)}
              {!created.emailSent && ` ${t('admin.invites.emailFailedNote', undefined, lang)}`}
            </p>
          )}

          <button className="btn-primary" disabled={creating || !email.trim()} onClick={handleCreate}>{creating ? t('admin.sending', undefined, lang) : t('admin.invites.createBtn', undefined, lang)}</button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.whiteCard}>
            {!invites && <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>}
            {invites?.length === 0 && <p style={styles.hint}>{t('admin.invites.empty', undefined, lang)}</p>}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {invites?.map(inv => (
                <div key={inv.id} style={styles.logRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.userRowName}>{inv.email}</p>
                    <p style={styles.userRowEmail}>
                      {t(`admin.invites.kind.${inv.kind}`, undefined, lang)}
                      {inv.kind === 'discount' && ` · ${inv.discount_percent}% · ${t(`admin.invites.duration${inv.discount_duration === 'once' ? 'Once' : 'Forever'}`, undefined, lang)}`}
                      {' · '}{inv.code}
                    </p>
                  </div>
                  <span style={inv.status === 'claimed' ? styles.answeredBadge : styles.pendingBadge}>{t(`admin.invites.status.${inv.status}`, undefined, lang)}</span>
                  {inv.status === 'pending' && (
                    <button style={{ ...styles.deleteBtn, marginTop: 0 }} onClick={() => handleRevoke(inv)}>{t('admin.invites.revokeBtn', undefined, lang)}</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  shell:              { display: 'flex', height: '100%', background: 'var(--bento-bg)', fontFamily: 'var(--font-bento)' },
  sidebar:            { width: 232, flexShrink: 0, padding: '22px 16px', display: 'flex', flexDirection: 'column', gap: 4, borderRight: '1px solid rgba(0,0,0,.05)', height: '100%', overflowY: 'auto' },
  brandRow:           { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 22px' },
  brandCaption:       { font: '800 9px/1 var(--font-bento)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '3px 0 0' },
  navList:            { display: 'flex', flexDirection: 'column', gap: 4 },
  navItem:            { display: 'flex', alignItems: 'center', gap: 12, height: 42, padding: '0 14px', borderRadius: 14, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' },
  navItemActive:      { background: 'var(--bento-ink)' },
  navDot:             { width: 8, height: 8, borderRadius: 3, flexShrink: 0 },
  navLabel:           { font: '700 13.5px/1 var(--font-bento)' },
  accountChip:        { marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: 'var(--bento-card)' },
  accountAvatar:      { width: 32, height: 32, borderRadius: 11, background: 'var(--bento-accent)', font: '800 11px/32px var(--font-bento)', color: 'var(--bento-ink)', textAlign: 'center', flexShrink: 0 },
  accountName:        { font: '700 12.5px/1 var(--font-bento)', color: 'var(--bento-ink)', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  accountRole:        { font: '600 10.5px/1 var(--font-bento)', color: 'var(--bento-t4)', margin: 0 },
  main:               { flex: 1, minWidth: 0, overflowY: 'auto', height: '100%' },
  sectionBody:        { padding: '24px 28px 32px', display: 'flex', flexDirection: 'column', gap: 18 },
  sectionHeader:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle:       { font: '800 24px/1.1 var(--font-bento)', letterSpacing: '-.9px', color: 'var(--bento-ink)', margin: 0 },
  sectionSubtitle:    { font: '500 12.5px/1.3 var(--font-bento)', color: 'var(--bento-t3)', margin: '5px 0 0' },
  grid12:             { display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 10 },
  darkStatCard:       { borderRadius: 20, background: 'var(--bento-ink)', padding: '18px 20px', minWidth: 0, height: '100%', boxSizing: 'border-box' },
  darkStatLabel:      { font: '800 10px/1 var(--font-bento)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: '0 0 12px' },
  darkStatValue:      { font: '800 28px/1 var(--font-bento)', letterSpacing: '-1.2px', color: '#fff', margin: '0 0 8px' },
  darkStatSub:        { font: '700 11.5px/1 var(--font-bento)', color: 'var(--bento-accent)', margin: 0 },
  whiteStatCard:      { borderRadius: 20, background: 'var(--bento-card)', padding: '18px 20px', minWidth: 0, height: '100%', boxSizing: 'border-box' },
  whiteStatLabel:     { font: '800 10px/1 var(--font-bento)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 12px' },
  whiteStatValue:     { font: '800 28px/1 var(--font-bento)', letterSpacing: '-1.2px', color: 'var(--bento-ink)', margin: '0 0 8px' },
  whiteStatSubMuted:  { font: '700 11.5px/1 var(--font-bento)', color: 'var(--bento-t3)', margin: 0 },
  whiteCard:          { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px' },
  darkCard:           { borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px' },
  cardHeaderRow:      { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' },
  cardKicker:         { font: '800 10.5px/1 var(--font-bento)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  darkKicker:         { font: '800 10px/1 var(--font-bento)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  cardHeaderAside:    { font: '700 11.5px/1 var(--font-bento)', color: 'var(--bento-t3)' },
  cardHeaderLink:     { border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: '700 11.5px/1 var(--font-bento)', color: 'var(--bento-accent)' },
  barsRow:            { display: 'flex', alignItems: 'flex-end', gap: 5, height: 100 },
  diamondDot:         { width: 9, height: 9, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2 },
  darkActionRow:      { marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, background: 'rgba(240,102,43,.16)', padding: '10px 12px', border: 'none', cursor: 'pointer', font: '700 12px/1 var(--font-bento)', color: 'var(--bento-accent)' },
  miniStatRow:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  miniStatLabel:      { font: '600 12.5px/1 var(--font-bento)', color: 'var(--bento-t2)' },
  miniStatValue:      { font: '800 14px/1 var(--font-bento)', color: 'var(--bento-ink)' },
  weekLabel:          { font: '600 10px/1 var(--font-bento)', color: 'var(--bento-t5)' },
  groupStatChip:      { flex: 1, borderRadius: 16, background: 'var(--bento-line)', padding: '12px 14px' },
  groupStatValue:     { font: '800 22px/1 var(--font-bento)', letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  groupStatLabel:     { font: '600 10.5px/1.2 var(--font-bento)', color: 'var(--bento-t3)', margin: 0 },
  sandCard:           { borderRadius: 24, background: 'var(--bento-sand)', padding: '18px 20px' },
  sandKicker:         { font: '800 10.5px/1 var(--font-bento)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 12px' },
  sandAllGood:        { font: '600 12.5px/1.4 var(--font-bento)', color: 'var(--bento-sand-ink)', margin: 0 },
  sandActionRow:      { display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', textAlign: 'left' },
  sandDot:            { width: 7, height: 7, borderRadius: 99, background: 'var(--bento-sand-icon)', flexShrink: 0 },
  sandActionLabel:    { flex: 1, font: '600 12.5px/1.3 var(--font-bento)', color: 'var(--bento-sand-ink)' },
  sandActionCta:      { font: '800 11.5px/1 var(--font-bento)', color: 'var(--bento-sand-icon)', flexShrink: 0 },
  funnelFilters:      { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  funnelFilterGroup:  { display: 'flex', flexWrap: 'wrap', gap: 6 },
  funnelRow:          { display: 'grid', gridTemplateColumns: '1fr 40px', alignItems: 'center', gap: 8 },
  funnelLabel:        { font: '600 11.5px/1.2 var(--font-bento)', color: 'var(--bento-t2)', gridColumn: '1 / -1', marginBottom: -3 },
  funnelLabelHighlight: { color: 'var(--bento-accent)', fontWeight: 800 },
  funnelBarTrack:     { height: 8, borderRadius: 5, background: 'var(--bento-line)', overflow: 'hidden' },
  funnelBarFill:      { height: '100%', borderRadius: 5, background: 'var(--bento-t4)', minWidth: 3 },
  funnelBarFillHighlight: { background: 'var(--bento-accent)' },
  funnelCount:        { font: '800 11.5px/1 var(--font-bento)', color: 'var(--bento-ink)', textAlign: 'right' },
  notBuiltCard:       { borderRadius: 24, background: 'var(--bento-card)', padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, maxWidth: 460 },
  notBuiltTitle:      { font: '800 15px/1.3 var(--font-bento)', color: 'var(--bento-ink)', margin: 0 },
  notBuiltBody:       { font: '500 13px/1.55 var(--font-bento)', color: 'var(--bento-t3)', margin: 0 },
  mobileNotice:       { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '60px 28px', height: '100%', justifyContent: 'center', background: 'var(--bento-bg)' },
  mobileNoticeTitle:  { font: '800 16px/1.3 var(--font-bento)', color: 'var(--bento-ink)', margin: 0 },
  mobileNoticeBody:   { font: '500 13px/1.55 var(--font-bento)', color: 'var(--bento-t3)', margin: 0, maxWidth: 320 },
  twoPane:            { display: 'flex', gap: 10, alignItems: 'flex-start' },
  searchBar:          { display: 'flex', alignItems: 'center', gap: 10, height: 42, borderRadius: 14, background: 'var(--bento-card)', padding: '0 16px' },
  searchInput:        { flex: 1, border: 'none', outline: 'none', background: 'none', font: '500 13px/1 var(--font-bento)', color: 'var(--bento-ink)' },
  userRow:            { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '9px 4px', cursor: 'pointer', borderBottom: '1px solid var(--bento-line)' },
  userRowName:        { font: '700 13.5px/1.2 var(--font-bento)', color: 'var(--bento-ink)', margin: 0 },
  userRowEmail:       { font: '500 11px/1.2 var(--font-bento)', color: 'var(--bento-t4)', margin: '2px 0 0' },
  userDetailCard:     { borderRadius: 24, background: 'var(--bento-card)', padding: '20px 20px 22px', display: 'flex', flexDirection: 'column', gap: 14 },
  userDetailAvatar:   { width: 44, height: 44, borderRadius: 15, background: 'var(--bento-sand)', font: '800 14px/44px var(--font-bento)', color: 'var(--bento-sand-icon)', textAlign: 'center', flexShrink: 0 },
  userDetailName:     { font: '800 15.5px/1.2 var(--font-bento)', color: 'var(--bento-ink)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userDetailEmail:    { font: '500 12px/1.2 var(--font-bento)', color: 'var(--bento-t3)', margin: '2px 0 0' },
  userDetailLangBadge: { font: '800 10.5px/1 var(--font-bento)', color: 'var(--bento-t3)', background: 'var(--bento-line)', borderRadius: 7, padding: '4px 7px', flexShrink: 0 },
  userDetailGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  userDetailStatBox:  { background: 'var(--bento-line)', borderRadius: 12, padding: '9px 11px' },
  userDetailStatLabel: { font: '700 10px/1 var(--font-bento)', color: 'var(--bento-t4)', textTransform: 'uppercase', letterSpacing: '.3px', margin: '0 0 3px' },
  userDetailStatValue: { font: '800 14.5px/1 var(--font-bento)', color: 'var(--bento-ink)', margin: 0 },
  userDetailSectionTitle: { font: '700 11px/1 var(--font-bento)', color: 'var(--bento-t4)', textTransform: 'uppercase', letterSpacing: '.3px', margin: '0 0 5px' },
  userDetailSubDetail: { font: '600 12.5px/1 var(--font-bento)', color: 'var(--bento-ink)', margin: 0 },
  userDetailMailBtn:  { textAlign: 'center', width: '100%', border: '1px solid var(--bento-divider)', background: 'var(--bento-line)', borderRadius: 12, padding: 11, font: '700 13px/1 var(--font-bento)', color: 'var(--bento-ink)', textDecoration: 'none', boxSizing: 'border-box' },
  statusBadge:        { font: '800 10.5px/1 var(--font-bento)', borderRadius: 7, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '.3px' },
  statusBadgeGood:    { color: '#2E8B57', background: 'rgba(46,139,87,.12)' },
  statusBadgeBad:     { color: 'var(--bento-accent)', background: 'rgba(240,102,43,.14)' },
  hint:               { font: '500 12.5px/1 var(--font-bento)', color: 'var(--bento-t4)', padding: '10px 2px' },
  errorMsg:           { font: '600 12.5px/1.4 var(--font-bento)', color: 'var(--bento-accent)', background: 'rgba(240,102,43,.1)', borderRadius: 8, padding: '8px 10px' },
  resultMsg:          { font: '600 12.5px/1.4 var(--font-bento)', color: '#2E8B57', background: 'rgba(46,139,87,.1)', borderRadius: 8, padding: '8px 10px' },
  filterRow:          { display: 'flex', gap: 6, flexWrap: 'wrap' },
  chipBtn:            { border: 'none', background: 'var(--bento-card)', borderRadius: 10, padding: '7px 14px', font: '700 12px/1 var(--font-bento)', color: 'var(--bento-t3)', cursor: 'pointer' },
  chipBtnActive:      { background: 'var(--bento-ink)', color: '#fff' },
  pill:               { display: 'inline-flex', alignItems: 'center', height: 26, borderRadius: 99, background: 'var(--bento-line)', padding: '0 12px', font: '700 11.5px/1 var(--font-bento)', color: 'var(--bento-t3)', border: 'none', cursor: 'pointer' },
  pillActive:         { background: 'var(--bento-ink)', color: '#fff' },
  presetHint:         { font: '500 11.5px/1.4 var(--font-bento)', color: 'var(--bento-t4)', margin: 0 },
  deleteBtn:          { border: 'none', background: 'none', borderRadius: 8, padding: '8px 10px', font: '700 11.5px/1 var(--font-bento)', color: 'var(--bento-accent)', cursor: 'pointer' },
  replyPreview:       { background: 'var(--bento-line)', borderRadius: 10, padding: 10, marginTop: 8 },
  replyPreviewLabel:  { font: '700 9.5px/1 var(--font-bento)', color: 'var(--bento-t4)', textTransform: 'uppercase', letterSpacing: '.3px', margin: '0 0 4px' },
  replyPreviewBody:   { font: '500 12px/1.5 var(--font-bento)', color: 'var(--bento-t2)', margin: 0, whiteSpace: 'pre-wrap' },
  answeredBadge:      { font: '700 10px/1 var(--font-bento)', color: '#2E8B57', background: 'rgba(46,139,87,.1)', borderRadius: 999, padding: '3px 9px', flexShrink: 0 },
  pendingBadge:       { font: '700 10px/1 var(--font-bento)', color: 'var(--bento-accent)', background: 'rgba(240,102,43,.14)', borderRadius: 999, padding: '3px 9px', flexShrink: 0 },
  fieldLabel:         { font: '700 10px/1 var(--font-bento)', color: 'var(--bento-t4)', letterSpacing: '.3px', textTransform: 'uppercase' },
  input:              { width: '100%', border: '1px solid var(--bento-divider)', borderRadius: 10, padding: '10px 12px', font: '600 12.5px/1 var(--font-bento)', color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)', boxSizing: 'border-box' },
  textarea:           { width: '100%', border: '1px solid var(--bento-divider)', borderRadius: 10, padding: '10px 12px', font: '500 12.5px/1.4 var(--font-bento)', color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)', resize: 'vertical', boxSizing: 'border-box' },
  select:             { width: '100%', border: '1px solid var(--bento-divider)', borderRadius: 10, padding: '9px 10px', font: '600 12.5px/1 var(--font-bento)', color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)', boxSizing: 'border-box' },
  segmentGrid:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  checkboxRow:        { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  checkboxLabel:      { font: '600 12.5px/1 var(--font-bento)', color: 'var(--bento-t2)' },
  linkBtn:            { alignSelf: 'flex-start', border: 'none', background: 'none', font: '700 11.5px/1 var(--font-bento)', color: 'var(--bento-t3)', cursor: 'pointer', padding: '2px 0' },
  userResultsBox:     { display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--bento-card)', border: '1px solid var(--bento-divider)', borderRadius: 10, overflow: 'hidden' },
  userResultItem:     { textAlign: 'left', border: 'none', background: 'none', padding: '9px 12px', font: '500 12.5px/1 var(--font-bento)', color: 'var(--bento-ink)', cursor: 'pointer' },
  logRow:             { display: 'flex', alignItems: 'center', gap: 10, minHeight: 50, borderBottom: '1px solid var(--bento-line)', padding: '8px 0' },
  logDate:            { font: '600 11px/1 var(--font-bento)', color: 'var(--bento-t5)', flexShrink: 0 },
}
