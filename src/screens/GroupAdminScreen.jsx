// GroupAdminScreen.jsx — 42i "Painel do grupo" (handoff-admin-42, Bloco 2).
// Substitui de vez a 19c antiga (README do pacote): o painel agora é só a
// entrada — "Esperando você", 3 números, seis linhas de administração,
// Criar estudo/Criar desafio fixos no rodapé. A lista de membros por
// inteiro virou tela própria (42j, GroupMembersScreen.jsx) e "quem está
// lendo" também (42k, GroupReadingActivityScreen.jsx).
//
// Código de convite, editar nome/descrição e "pergunta da semana" — reais
// na 19c antiga, mas fora do quadro de 42i — foram realocados (decisão
// dela, 2026-09-13): o código de convite mora agora no topo de 42j
// (Membros — faz mais sentido lá, é sobre trazer gente pro grupo); editar
// grupo e pergunta da semana viraram a folha "Editar grupo", aberta pelo
// toque no cabeçalho (avatar/nome/"N membros..."), sem quadro próprio no
// pacote.
//
// "Regra Zero" do comentário antigo desta tela (mostrar progresso de
// membro sem amizade aceita não era possível) finalmente resolvida pra
// valer aqui: get_group_reading_activity (migration 0066) é um RPC
// PRIVILEGIADO — só o moderador do próprio grupo pode chamar — que
// contorna a exigência de amizade porque é um poder de moderação
// explícito, não a leitura geral "ver progresso de qualquer um".
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import {
  getGroupDetail, getPendingJoinRequests, updateGroupInfo, setGroupPinnedNotice,
} from '../groups/groupsStore'
import { getLatestGroupPlan } from '../groups/groupPlansStore'
import { getActiveGroupChallenge } from '../groups/groupChallengesStore'
import { getPendingGroupReports } from '../groups/reportsStore'
import { getGroupReadingActivity } from '../groups/readingActivityStore'

const FONT = 'var(--font-bento)'

function initialsOf(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatMonthYear(iso, lang) {
  if (!iso) return '—'
  const d = new Date(iso)
  const month = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { month: 'short' }).replace('.', '')
  return `${month}/${String(d.getFullYear()).slice(-2)}`
}

// "há 6 h" / "há 2 d" — sem "aberta" na frente (diferente de
// groupReport.timeOpenHours/Days, usado em 42l); frase própria de 42i.
function hoursAgoLabel(iso, lang) {
  const hours = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 3600000))
  if (hours < 24) return t('groupAdmin.hoursAgo', { n: hours }, lang)
  return t('groupAdmin.daysAgo', { n: Math.floor(hours / 24) }, lang)
}

export default function GroupAdminScreen({ session, authUser, onBack, onNavigate, onOpenGroupRoom, onOpenMembers, onOpenReadingActivity, onOpenReportedMessages }) {
  const lang = session.lang
  const L = (k, vars) => t(`groupAdmin.${k}`, vars, lang)
  const myGroup = session.myGroups?.find(g => g.myRole === 'moderator') ?? session.myGroups?.[0]
  const groupId = myGroup?.groupId

  const [group, setGroup] = useState(null)
  const [requests, setRequests] = useState([])
  const [groupPlan, setGroupPlan] = useState(undefined) // undefined = ainda carregando, null = nenhum
  const [challenge, setChallenge] = useState(undefined)
  const [pendingReports, setPendingReports] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeText, setNoticeText] = useState('')
  const [savingNotice, setSavingNotice] = useState(false)
  const [noticeError, setNoticeError] = useState('')

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!groupId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    Promise.all([
      getGroupDetail(groupId), getPendingJoinRequests(groupId), getLatestGroupPlan(groupId),
      getActiveGroupChallenge(groupId), getPendingGroupReports(groupId), getGroupReadingActivity(groupId),
    ]).then(([detail, pending, plan, activeChallenge, reports, activityRows]) => {
      if (cancelled) return
      setGroup(detail)
      setRequests(pending)
      setGroupPlan(plan)
      setChallenge(activeChallenge)
      setPendingReports(reports)
      setActivity(activityRows)
      setLoading(false)
    }).catch(err => {
      // Bug real (varredura geral, 2026-09-19): as 6 chamadas acima
      // engoliam erro e devolviam um default vazio — uma falha de leitura
      // de verdade fazia esta tela ficar presa pra sempre no esqueleto
      // (loading nunca virava false, sem nenhum aviso). Agora as stores
      // lançam de verdade; este catch é o que finalmente existia pra
      // tratar isso.
      if (cancelled) return
      console.error('Failed to load group admin panel', err)
      setLoading(false)
      setLoadError(true)
    })
    return () => { cancelled = true }
  }, [groupId, reloadKey])

  function startEditGroup() {
    setEditName(group.name)
    setEditDescription(group.description ?? '')
    setSaveError('')
    setEditOpen(true)
  }

  async function saveGroupInfo() {
    if (!editName.trim()) { setSaveError(L('groupNameRequiredError')); return }
    setSavingInfo(true)
    setSaveError('')
    try {
      await updateGroupInfo(groupId, editName, editDescription)
      setGroup(g => ({ ...g, name: editName.trim(), description: editDescription.trim() || null }))
      setEditOpen(false)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSavingInfo(false)
    }
  }

  function startEditNotice() {
    setNoticeText(group.pinnedNotice ?? '')
    setNoticeError('')
    setNoticeOpen(true)
  }

  async function saveNotice() {
    setSavingNotice(true)
    setNoticeError('')
    try {
      await setGroupPinnedNotice(groupId, noticeText)
      setGroup(g => ({ ...g, pinnedNotice: noticeText.trim() || null }))
      setNoticeOpen(false)
    } catch (err) {
      setNoticeError(err.message)
    } finally {
      setSavingNotice(false)
    }
  }

  if (!groupId) {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <BackBtn onBack={onBack} lang={lang} />
        </div>
        <p style={styles.emptyHint}>{L('noGroupHint')}</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <BackBtn onBack={onBack} lang={lang} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <p style={styles.emptyHint}>{L('loadError')}</p>
          <button type="button" style={styles.retryBtn} onClick={() => setReloadKey(k => k + 1)}>{L('retryBtn')}</button>
        </div>
      </div>
    )
  }

  if (loading || !group) {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <BackBtn onBack={onBack} lang={lang} />
        </div>
      </div>
    )
  }

  const todaySession = session.todaySession
  const canOpenWeeklyQuestion = todaySession && !todaySession.needsThemePick

  const stoppedCount = activity.filter(a => a.status === 'stopped').length
  const readingTodayCount = activity.filter(a => a.daysActiveLast7[a.daysActiveLast7.length - 1]).length
  const totalCells = activity.length * 7
  const filledCells = activity.reduce((sum, a) => sum + a.daysActiveLast7.filter(Boolean).length, 0)
  const weekPct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0

  // "Gên 41" — a leitura do dia atual dentro do plano do grupo. passages é
  // achatado, uma entrada por dia, na ordem de leitura (ver comentário do
  // schema em 0048_group_reading_plans.sql).
  let planDayIndex = 0
  let planTotalDays = 0
  let planTodayRef = null
  if (groupPlan) {
    planTotalDays = groupPlan.passages?.length ?? 0
    const elapsedDays = Math.floor((Date.now() - new Date(groupPlan.starts_at).getTime()) / 86400000) + 1
    planDayIndex = Math.min(Math.max(elapsedDays, 1), planTotalDays)
    const todayPassage = groupPlan.passages?.[planDayIndex - 1]
    if (todayPassage) {
      // passages é achatado num livro só (buildGroupPlan, groupBookPlan.js)
      // — cada entrada só tem `book` (pt), sem variante por idioma; o
      // nome em inglês vem do PLANO (book_en), não da passagem.
      const bookLabel = lang === 'en' ? groupPlan.book_en : groupPlan.book
      planTodayRef = `${bookLabel} ${todayPassage.chStart}`
    }
  }

  // "Esperando você" — até 3 linhas, nesta ordem, cada uma só se houver
  // algo; card some (vira linha discreta) se as três estiverem vazias.
  const waitingLines = []
  if (requests.length > 0) {
    waitingLines.push({
      key: 'requests',
      text: L(requests.length === 1 ? 'waitingRequestsOne' : 'waitingRequestsMany', { n: requests.length }),
      onClick: () => onOpenMembers?.(groupId),
    })
  }
  if (pendingReports.length > 0) {
    waitingLines.push({
      key: 'reports',
      text: L(pendingReports.length === 1 ? 'waitingReportOne' : 'waitingReportsMany', { n: pendingReports.length, time: hoursAgoLabel(pendingReports[0].created_at, lang) }),
      onClick: () => onOpenReportedMessages?.(groupId),
    })
  }
  if (stoppedCount > 0) {
    waitingLines.push({
      key: 'stopped',
      text: L(stoppedCount === 1 ? 'waitingStoppedOne' : 'waitingStoppedMany', { n: stoppedCount }),
      onClick: () => onOpenReadingActivity?.(groupId),
    })
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <BackBtn onBack={onBack} lang={lang} />
        <p style={styles.headerBadge}>{L('headerBadge')}</p>
      </div>
      <button type="button" style={styles.groupIdentityRow} onClick={startEditGroup}>
        <span style={styles.groupAvatar}>{initialsOf(group.name)}</span>
        <div style={{ minWidth: 0, textAlign: 'left' }}>
          <p style={styles.groupName}>{group.name}</p>
          <p style={styles.groupSub}>{L('groupSub', { n: group.members.length, date: formatMonthYear(group.members.find(m => m.userId === authUser?.id)?.joinedAt, lang) })}</p>
        </div>
      </button>

      <div style={styles.body}>
        {waitingLines.length > 0 ? (
          <div style={styles.waitingCard}>
            <p style={styles.waitingLabel}>{L('waitingLabel')}</p>
            {waitingLines.map(line => (
              <button key={line.key} type="button" style={styles.waitingRow} onClick={line.onClick}>
                <span style={styles.waitingDot} />
                <span style={styles.waitingText}>{line.text}</span>
                <span style={styles.chevronSand}>›</span>
              </button>
            ))}
          </div>
        ) : (
          <p style={styles.nothingWaiting}>{L('nothingWaiting')}</p>
        )}

        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>{L('readingTodayLabel')}</p>
            <p style={styles.statValue}>{L('readingTodayValue', { n: readingTodayCount, total: activity.length })}</p>
            <p style={styles.statSub}>{L('readingTodaySub', { pct: weekPct })}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>{L('inPlanLabel')}</p>
            <p style={styles.statValue}>{planTodayRef ?? '—'}</p>
            <p style={styles.statSub}>{groupPlan ? L('inPlanSub', { day: planDayIndex, total: planTotalDays }) : L('inPlanNone')}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>{L('challengeLabel')}</p>
            <p style={styles.statValue}>{challenge ? challenge.title : '—'}</p>
            <p style={styles.statSub}>{challenge ? L('challengeActiveSub') : L('challengeNone')}</p>
          </div>
        </div>

        <div style={styles.card}>
          <button type="button" style={{ ...styles.actionRow, borderBottom: '1px solid var(--bento-line)' }} onClick={() => onOpenMembers?.(groupId)}>
            <span style={styles.actionIconWrap}><AppIcon name="UserPlus" size={17} color="var(--bento-t2)" /></span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={styles.actionLabel}>{L('membersRowLabel')}</p>
              <p style={styles.actionSub}>{requests.length > 0 ? L(requests.length === 1 ? 'membersRowSubPendingOne' : 'membersRowSubPendingMany', { n: group.members.length, pending: requests.length }) : L('membersRowSub', { n: group.members.length })}</p>
            </div>
            <span style={styles.chevron}>›</span>
          </button>

          <div style={{ ...styles.actionRow, borderBottom: '1px solid var(--bento-line)' }}>
            <button type="button" style={styles.actionRowBtn} onClick={() => onOpenReportedMessages?.(groupId)}>
              <span style={styles.actionIconWrap}><AppIcon name="MessageCircle" size={17} color="var(--bento-t2)" /></span>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={styles.actionLabel}>{L('muralRowLabel')}</p>
                <p style={styles.actionSub}>{pendingReports.length > 0 ? L(pendingReports.length === 1 ? 'muralRowSubOne' : 'muralRowSubMany', { n: pendingReports.length }) : L('muralRowSubNone')}</p>
              </div>
            </button>
            {pendingReports.length > 0 && <span style={styles.badge}>{pendingReports.length}</span>}
          </div>

          <button type="button" style={{ ...styles.actionRow, borderBottom: '1px solid var(--bento-line)' }} onClick={() => onOpenReadingActivity?.(groupId)}>
            <span style={styles.actionIconWrap}><AppIcon name="BarChart3" size={17} color="var(--bento-t2)" /></span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={styles.actionLabel}>{L('readingActivityRowLabel')}</p>
              <p style={styles.actionSub}>{L(stoppedCount === 1 ? 'readingActivityRowSubOne' : 'readingActivityRowSubMany', { n: stoppedCount })}</p>
            </div>
            <span style={styles.chevron}>›</span>
          </button>

          <button
            type="button" style={{ ...styles.actionRow, borderBottom: '1px solid var(--bento-line)' }}
            onClick={() => onNavigate?.(groupPlan ? 'groupPlanReader' : 'createStudy')}
          >
            <span style={styles.actionIconWrap}><AppIcon name="StickyNote" size={17} color="var(--bento-t2)" /></span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={styles.actionLabel}>{L('groupPlanLabel')}</p>
              <p style={styles.actionSub}>{groupPlan ? L('groupPlanSub', { book: lang === 'en' ? groupPlan.book_en : groupPlan.book, days: planTotalDays }) : L('groupPlanNone')}</p>
            </div>
            <span style={styles.chevron}>›</span>
          </button>

          <button type="button" style={{ ...styles.actionRow, borderBottom: '1px solid var(--bento-line)' }} onClick={startEditNotice}>
            <span style={styles.actionIconWrap}><AppIcon name="Bookmark" size={17} color="var(--bento-t2)" /></span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={styles.actionLabel}>{L('pinnedNoticeLabel')}</p>
              <p style={styles.actionSub}>{group.pinnedNotice ? group.pinnedNotice : L('pinnedNoticeNone')}</p>
            </div>
            <span style={styles.chevron}>›</span>
          </button>

          <button type="button" style={styles.actionRow} onClick={() => onNavigate?.('reportProblem')}>
            <span style={styles.actionIconWrap}><AppIcon name="TriangleAlert" size={17} color="var(--bento-t2)" /></span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={styles.actionLabel}>{L('reportProblemLabel')}</p>
              <p style={styles.actionSub}>{L('reportProblemSub')}</p>
            </div>
            <span style={styles.chevron}>›</span>
          </button>
        </div>
      </div>

      <div style={styles.footer}>
        <button type="button" style={styles.footerSecondaryBtn} onClick={() => onNavigate?.('createStudy')}>{L('createStudyBtn')}</button>
        <button type="button" style={styles.footerPrimaryBtn} onClick={() => onNavigate?.('createChallenge')}>{L('createChallengeBtn')}</button>
      </div>

      {editOpen && (
        <EditGroupSheet
          L={L} name={editName} description={editDescription} saving={savingInfo} error={saveError}
          canOpenWeeklyQuestion={canOpenWeeklyQuestion}
          onOpenWeeklyQuestion={() => onOpenGroupRoom?.({ group: { groupId, name: group.name, myRole: 'moderator' }, book: todaySession?.book, bookEn: todaySession?.bookEn, chapter: todaySession?.chStart })}
          weeklyQuestionSub={todaySession ? `${lang === 'en' ? todaySession.bookEn : todaySession.book} ${todaySession.chStart}` : ''}
          onChangeName={setEditName} onChangeDescription={setEditDescription}
          onSave={saveGroupInfo} onClose={() => setEditOpen(false)}
        />
      )}

      {noticeOpen && (
        <NoticeSheet
          L={L} text={noticeText} saving={savingNotice} error={noticeError}
          onChangeText={setNoticeText} onSave={saveNotice} onClose={() => setNoticeOpen(false)}
        />
      )}
    </div>
  )
}

function BackBtn({ onBack, lang }) {
  return (
    <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
      <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="#fff" />
    </button>
  )
}

function EditGroupSheet({ L, name, description, saving, error, canOpenWeeklyQuestion, onOpenWeeklyQuestion, weeklyQuestionSub, onChangeName, onChangeDescription, onSave, onClose }) {
  return createPortal(
    <div style={styles.sheetBackdrop} onClick={onClose}>
      <div style={styles.sheetPanel} onClick={e => e.stopPropagation()}>
        <p style={styles.sheetTitle}>{L('editGroupLabel')}</p>
        <label style={styles.fieldWrap}>
          <span style={styles.fieldLabel}>{L('groupNameFieldLabel')}</span>
          <input style={styles.fieldInput} value={name} onChange={e => onChangeName(e.target.value)} />
        </label>
        <label style={styles.fieldWrap}>
          <span style={styles.fieldLabel}>{L('groupDescriptionFieldLabel')}</span>
          <textarea style={styles.bioInput} rows={3} value={description} onChange={e => onChangeDescription(e.target.value)} placeholder={L('groupDescriptionPlaceholder')} />
        </label>
        {error && <p style={styles.errorText}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button style={styles.secondarySmallBtn} onClick={onClose} disabled={saving}>{L('cancelAction')}</button>
          <button style={styles.primarySmallBtn} onClick={onSave} disabled={saving}>{saving ? L('savingGroupInfo') : L('saveGroupInfo')}</button>
        </div>
        {canOpenWeeklyQuestion && (
          <button style={{ ...styles.linkRow, marginTop: 6, borderTop: '1px solid var(--bento-line)' }} onClick={onOpenWeeklyQuestion}>
            <span style={styles.linkLabel}>{L('weeklyQuestionLabel')}</span>
            <span style={styles.linkSub}>{weeklyQuestionSub}</span>
            <span style={styles.chevron}>›</span>
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}

function NoticeSheet({ L, text, saving, error, onChangeText, onSave, onClose }) {
  return createPortal(
    <div style={styles.sheetBackdrop} onClick={onClose}>
      <div style={styles.sheetPanel} onClick={e => e.stopPropagation()}>
        <p style={styles.sheetTitle}>{L('pinnedNoticeLabel')}</p>
        <textarea
          style={styles.bioInput} rows={3} value={text} onChange={e => onChangeText(e.target.value)}
          placeholder={L('pinnedNoticePlaceholder')}
        />
        {error && <p style={styles.errorText}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button style={styles.secondarySmallBtn} onClick={onClose} disabled={saving}>{L('cancelAction')}</button>
          <button style={styles.primarySmallBtn} onClick={onSave} disabled={saving}>{saving ? L('savingGroupInfo') : L('saveGroupInfo')}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 4px', background: 'var(--bento-ink)' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerBadge: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  groupIdentityRow: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px 20px', border: 'none', background: 'var(--bento-ink)', borderRadius: '0 0 24px 24px', cursor: 'pointer' },
  groupAvatar: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, background: 'rgba(255,255,255,.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 800 },
  groupName: { fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.5px', color: '#fff', margin: '0 0 2px' },
  groupSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },
  emptyHint: { fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '0 20px' },
  retryBtn: { height: 40, padding: '0 20px', borderRadius: 14, border: 'none', background: 'var(--bento-ink)', cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 },

  waitingCard: { background: 'var(--bento-sand)', borderRadius: 22, padding: '16px 18px 6px' },
  waitingLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 6px' },
  waitingRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, padding: '8px 0', border: 'none', borderTop: '1px solid rgba(122,74,30,.12)', background: 'none', cursor: 'pointer', textAlign: 'left' },
  waitingDot: { width: 6, height: 6, flexShrink: 0, borderRadius: 99, background: 'var(--bento-sand-icon)' },
  waitingText: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: 'var(--bento-sand-ink)' },
  chevronSand: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-sand-label)' },
  nothingWaiting: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t4)', margin: 0, padding: '2px 4px' },

  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  statCard: { background: 'var(--bento-card)', borderRadius: 18, padding: '12px 12px' },
  statLabel: { fontFamily: FONT, fontSize: 9, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  statValue: { fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  card: { background: 'var(--bento-card)', borderRadius: 22, overflow: 'hidden' },
  actionRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, minHeight: 62, padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' },
  actionRowBtn: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 },
  actionIconWrap: { width: 36, height: 36, flexShrink: 0, borderRadius: 11, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  actionSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chevron: { fontFamily: FONT, fontSize: 16, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },
  badge: { flexShrink: 0, marginRight: 16, minWidth: 22, height: 22, borderRadius: 99, background: 'var(--bento-accent)', color: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 800, padding: '0 6px' },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(12px + var(--safe-bottom))' },
  footerSecondaryBtn: { flex: 1, height: 50, border: 'none', borderRadius: 16, background: 'var(--bento-card)', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  footerPrimaryBtn: { flex: 1, height: 50, border: 'none', borderRadius: 16, background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },

  sheetBackdrop: { position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheetPanel: { width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', padding: '20px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10, animation: 'bookOpenIn .22s cubic-bezier(.32,.72,0,1)' },
  sheetTitle: { fontFamily: FONT, fontSize: 16, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 4px' },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  fieldInput: { width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-card)' },
  bioInput: { width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-card)', resize: 'none' },
  errorText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-destructive)', margin: 0 },
  secondarySmallBtn: { flex: 1, height: 44, border: 'none', borderRadius: 13, background: 'var(--bento-line)', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },
  primarySmallBtn: { flex: 1, height: 44, border: 'none', borderRadius: 13, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  linkRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, minHeight: 52, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' },
  linkLabel: { flex: 1, fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)' },
  linkSub: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t3)' },
}
