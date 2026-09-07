import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { BIBLE_BLOCKS, SESSIONS_BY_PLAN } from '../data/bibleBlocks'
import { computeBookChapterCounts, deriveProgress, computeOverallStats, pickActiveBlock } from '../utils/progress'
import {
  getFriends, getPendingRequests, getFriendFriendsList, sendFriendRequestByUserId,
} from '../friends/friendsStore'
import {
  getMyGroups, getPendingGroupInvites, getGroupDetail, createGroup,
  inviteFriendToGroup, respondToGroupInvite, leaveGroup, setMemberRole,
  redeemGroupInviteCode, getGroupMemberCounts,
} from '../groups/groupsStore'
import AddFriendsScreen from './AddFriendsScreen'
import CreateGroupSheet from '../components/CreateGroupSheet'
import { createChallenge, getChallengesForGroup, getChallengeLeaderboard, completeChallenge } from '../groups/challengesStore'
import { getComments, postComment, deleteComment, toggleCommentLike, setCommentPinned } from '../groups/commentsStore'
import { getFriendProfile, getFriendProgressSummary } from '../profile/profileStore'
import { logActivity } from '../activity/activityStore'
import { avatarInitialsOf } from '../utils/avatarInitials'
import {
  getPrayerRequestsFeed, deletePrayerRequest, closePrayerRequest, togglePraying,
} from '../groups/prayerRequestsStore'
import AddPrayerRequestSheet from '../components/prayer/AddPrayerRequestSheet'
import { getRoomStats } from '../groups/chapterRoomStore'
import { getGroupMessagesSummary } from '../groups/messagesStore'
import { formatRelativeTime } from '../utils/time'

// Todos os 66 livros (pt/en), na mesma ordem/nomes usados em completed_keys
// — reaproveitado do mesmo dado que já alimenta a Jornada, pra montar o
// seletor de livros ao propor um desafio.
const ALL_BLOCKS_WITH_BOOKS = BIBLE_BLOCKS.map(b => ({ id: b.id, name: b.name, nameEn: b.nameEn, books: b.books, booksEn: b.booksEn }))
// Contagem de capítulos por livro independe do plano escolhido (o texto é
// sempre o mesmo) — usa o plano 'standard' só como fonte dos dados brutos.
const BOOK_CHAPTER_COUNTS = computeBookChapterCounts(SESSIONS_BY_PLAN.standard)

const DURATION_PRESETS = [
  { id: '7d', days: 7 },
  { id: '14d', days: 14 },
  { id: '30d', days: 30 },
]

function formatDate(iso, lang) {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR')
}

export default function GroupsScreen({ session, authUser, pendingGroupPlanInvites, onRespondGroupPlanInvite, onSocialChange, onOpenGroupRoom, onOpenMessages, onOpenProfile, entryTarget, onEntryTargetConsumed, onDetailOpenChange }) {
  const { lang, todaySession } = session
  const [myGroups, setMyGroups] = useState([])
  const [memberCounts, setMemberCounts] = useState({})
  const [groupInvites, setGroupInvites] = useState([])
  const [openGroupId, setOpenGroupId] = useState(null)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // Lista inteira (não só a contagem) — o cartão "Amigos" (33a) mostra os
  // 3 primeiros em quadrados próprios (avatar + nome), não um número solto.
  const [friends, setFriends] = useState([])
  const [pendingFriendsCount, setPendingFriendsCount] = useState(0)
  // Resumo de mensagens por grupo (33a: selo por linha em "Seus grupos" +
  // soma pro sino do cabeçalho junto com pendingFriendsCount; 33b lê a
  // lista completa por conta própria, ver messagesStore.js) — substitui o
  // "Sala aberta agora"/roomStatsByGroup de antes: o quadro novo tirou o
  // card escuro do topo e trocou o selo "hoje só" por mensagens de
  // verdade (sala de capítulo + pedidos de oração + discussão, ver
  // migration 0057), então cobre TODO grupo com coisa nova, não só o que
  // tem sala aberta hoje.
  const [messagesSummary, setMessagesSummary] = useState([])
  // Filtro de "Seus grupos" (33a, ícone de lupa no cabeçalho) — client-side
  // sobre myGroups, que já está todo carregado; achar amigos novos
  // continua sendo o buscador de AddFriendsScreen.jsx (24c), não este.
  const [groupsSearchOpen, setGroupsSearchOpen] = useState(false)
  const [groupsSearch, setGroupsSearch] = useState('')

  function reload() {
    setReloadKey(k => k + 1)
    onSocialChange?.()
  }

  useEffect(() => {
    getMyGroups().then(groups => {
      setMyGroups(groups)
      if (groups.length) getGroupMemberCounts(groups.map(g => g.groupId)).then(setMemberCounts).catch(() => {})
    }).catch(err => console.error('Failed to load groups', err))
    getPendingGroupInvites().then(setGroupInvites).catch(err => console.error('Failed to load group invites', err))
    getFriends().then(setFriends).catch(() => {})
    getPendingRequests().then(p => setPendingFriendsCount(p.length)).catch(() => {})
    getGroupMessagesSummary().then(setMessagesSummary).catch(() => {})
  }, [reloadKey])

  const messagesSummaryByGroup = Object.fromEntries(messagesSummary.map(s => [s.groupId, s]))
  const unreadMessagesTotal = messagesSummary.reduce((sum, s) => sum + s.unreadCount, 0)
  const bellBadgeCount = unreadMessagesTotal + pendingFriendsCount

  // Avisa o shell (App.jsx) se uma tela interna está aberta (um grupo ou
  // Adicionar amigos) — 5d/24c têm cabeçalho Bento próprio; a lista (24a)
  // também tem o seu (aHeader/bTitle abaixo) — 'groups' está sempre no
  // bentoScreen do App.jsx desde a correção do cabeçalho duplicado
  // (2026-09-07), então o AppHeader antigo não aparece nunca mais aqui.
  const detailOpen = !!openGroupId || friendsOpen
  useEffect(() => {
    onDetailOpenChange?.(detailOpen)
    return () => onDetailOpenChange?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpen])

  const openGroup = myGroups.find(g => g.groupId === openGroupId) ?? null

  // Chegando de 33b ("Ver" num item de mensagem/pedido de amizade) — abre
  // direto no grupo certo ou em Adicionar amigos, mesmo padrão de
  // browseJumpTarget em JourneyScreen.jsx/App.jsx. Só roda quando o alvo
  // muda de verdade (App.jsx zera pra null depois de consumido).
  useEffect(() => {
    if (!entryTarget) return
    if (entryTarget.type === 'group') setOpenGroupId(entryTarget.groupId)
    else if (entryTarget.type === 'friends') setFriendsOpen(true)
    onEntryTargetConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryTarget])

  async function handleCreateGroup(name, readingMode) {
    const created = await createGroup(name, readingMode)
    setCreateSheetOpen(false)
    reload()
    setOpenGroupId(created.groupId)
  }

  async function handleRespondInvite(groupId, accept, groupName) {
    await respondToGroupInvite(groupId, accept)
    if (accept) logActivity('joined_group', { groupName }).catch(err => console.error('Failed to log activity', err))
    reload()
  }

  // Convite de Plano do grupo (22d) — diferente do convite de MEMBRO acima
  // (respondToGroupInvite): aqui a pessoa já é do grupo, só está decidindo
  // se troca a leitura de hoje pelo plano que o moderador enviou (ver
  // App.jsx/respondToGroupPlanInvite — nunca troca sem essa decisão
  // explícita, ver README "Duas regras de produto").
  async function handleRespondGroupPlan(planId, accept) {
    await onRespondGroupPlanInvite?.(planId, accept)
  }

  const pendingCount = (pendingGroupPlanInvites?.length ?? 0) + groupInvites.length

  return (
    <div className="master-detail">
      {/* Master = quadro 33a (substitui 24a, ver handoff-comunidade-33/):
          cabeçalho sem subtítulo, cartão de perfil, seus grupos, amigos,
          criar/entrar. "Sala aberta agora" saiu daqui de propósito — volta
          como linha do grupo (selo de mensagens abaixo) e como notificação
          em 33b (sino no cabeçalho, onOpenMessages). */}
      <div className={`master-pane${detailOpen ? ' hide-on-mobile' : ''}`} style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%', background: 'var(--bento-bg)' }}>
        <div style={styles.aHeader}>
          <p style={styles.bTitle}>{t('groups.pageTitle', undefined, lang)}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button" style={styles.aSearchBtn}
              onClick={() => setGroupsSearchOpen(v => { if (v) setGroupsSearch(''); return !v })}
              aria-label={t(groupsSearchOpen ? 'groups.searchClose' : 'groups.searchGroups', undefined, lang)}
            >
              <AppIcon name={groupsSearchOpen ? 'X' : 'Search'} size={15} strokeWidth={2.2} color="var(--bento-ink)" />
            </button>
            <button type="button" style={styles.aBellBtn} onClick={() => onOpenMessages?.()} aria-label={t('groups.messagesTitle', undefined, lang)}>
              <AppIcon name="Bell" size={16} strokeWidth={1.9} color="var(--bento-ink)" />
              {bellBadgeCount > 0 && <span style={styles.aBellBadge}>{bellBadgeCount > 99 ? '99+' : bellBadgeCount}</span>}
            </button>
            <button type="button" style={styles.aAddBtn} onClick={() => setCreateSheetOpen(true)} aria-label={t('groups.createGroup', undefined, lang)}>
              <AppIcon name="Plus" size={16} strokeWidth={2.2} color="var(--bento-accent)" />
            </button>
          </div>
        </div>
        {/* Busca de "Seus grupos" (33a, ícone de lupa) — filtra a lista
            abaixo pelo nome, client-side; achar gente/grupo NOVO continua
            sendo Criar grupo/Entrar com código/Adicionar amigo. */}
        {groupsSearchOpen && (
          <div style={{ padding: '10px 20px 0' }}>
            <input
              type="text"
              autoFocus
              style={styles.aSearchInput}
              placeholder={t('groups.searchGroupsPlaceholder', undefined, lang)}
              value={groupsSearch}
              onChange={e => setGroupsSearch(e.target.value)}
            />
          </div>
        )}
        <div style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ProfileSummaryCard session={session} authUser={authUser} myGroupsCount={myGroups.length} friendsCount={friends.length} lang={lang} onOpenProfile={onOpenProfile} />

          {myGroups.length === 0 && <CreateOrJoinTiles lang={lang} onCreateTap={() => setCreateSheetOpen(true)} onReload={reload} />}

          {pendingCount > 0 && (
            <div style={styles.bCard}>
              <div style={styles.bCardHeadRow}>
                <p style={{ ...styles.bCardLabel, color: 'var(--bento-accent)' }}>{t('groups.pendingInvitesTitle', undefined, lang)}</p>
                <span style={styles.bCardCount}>{pendingCount}</span>
              </div>
              {pendingGroupPlanInvites?.map((inv, i) => (
                <div key={inv.planId} style={{ ...styles.bInviteRow, borderBottom: (i === pendingGroupPlanInvites.length - 1 && groupInvites.length === 0) ? 'none' : '1px solid var(--bento-line)' }}>
                  <span style={{ ...styles.bAvatarCircle, background: 'var(--bento-mark)', color: 'var(--bento-sand-icon)' }}>
                    <AppIcon name="Users" size={14} color="var(--bento-sand-icon)" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.bMemberName}>{lang === 'en' ? inv.bookEn : inv.book}</p>
                    <p style={styles.bMemberSub}>{t('groups.groupPlanInvitedBy', { group: inv.groupName }, lang)}</p>
                  </div>
                  <button style={styles.bDeclineBtn} onClick={() => handleRespondGroupPlan(inv.planId, false)} aria-label={t('groupAdmin.declineAction', undefined, lang)}>
                    <AppIcon name="X" size={13} strokeWidth={2.4} color="var(--bento-t3)" />
                  </button>
                  <button style={styles.bAcceptBtn} onClick={() => handleRespondGroupPlan(inv.planId, true)} aria-label={t('groupAdmin.acceptAction', undefined, lang)}>
                    <AppIcon name="Check" size={13} strokeWidth={2.8} color="var(--bento-accent)" />
                  </button>
                </div>
              ))}
              {groupInvites.map((inv, i) => (
                <div key={inv.groupId} style={{ ...styles.bInviteRow, borderBottom: i === groupInvites.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
                  <span style={styles.bAvatarCircle}>{avatarInitialsOf(inv.groupName)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.bMemberName}>{inv.groupName}</p>
                    <p style={styles.bMemberSub}>{t('groups.invitedBy', { name: inv.invitedByName }, lang)}</p>
                  </div>
                  <button style={styles.bDeclineBtn} onClick={() => handleRespondInvite(inv.groupId, false)} aria-label={t('groupAdmin.declineAction', undefined, lang)}>
                    <AppIcon name="X" size={13} strokeWidth={2.4} color="var(--bento-t3)" />
                  </button>
                  <button style={styles.bAcceptBtn} onClick={() => handleRespondInvite(inv.groupId, true, inv.groupName)} aria-label={t('groupAdmin.acceptAction', undefined, lang)}>
                    <AppIcon name="Check" size={13} strokeWidth={2.8} color="var(--bento-accent)" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <GroupsListSection groups={myGroups} memberCounts={memberCounts} messagesSummaryByGroup={messagesSummaryByGroup} search={groupsSearch} lang={lang} onOpen={setOpenGroupId} />
          <FriendsPreviewCard lang={lang} friends={friends} pendingCount={pendingFriendsCount} onOpen={() => setFriendsOpen(true)} />

          {myGroups.length > 0 && <CreateOrJoinTiles lang={lang} onCreateTap={() => setCreateSheetOpen(true)} onReload={reload} />}
        </div>
      </div>

      {/* Detail: grupo selecionado (5d) ou Adicionar amigos (24c) */}
      <div className={`detail-pane${!detailOpen ? ' hide-on-mobile' : ''}`}>
        {friendsOpen ? (
          <AddFriendsScreen session={session} authUser={authUser} onBack={() => setFriendsOpen(false)} onChange={reload} />
        ) : openGroup ? (
          <GroupDetailView
            key={openGroupId}
            groupId={openGroupId}
            groupName={openGroup.name}
            lang={lang}
            authUser={authUser}
            hasAI={session.hasAI}
            todaySession={todaySession}
            onOpenGroupRoom={onOpenGroupRoom}
            onBack={() => setOpenGroupId(null)}
            onLeft={() => { setOpenGroupId(null); reload() }}
          />
        ) : (
          <GroupsEmptyState lang={lang} />
        )}
      </div>

      {createSheetOpen && (
        <CreateGroupSheet lang={lang} onClose={() => setCreateSheetOpen(false)} onCreate={handleCreateGroup} />
      )}
    </div>
  )
}

function GroupsEmptyState({ lang }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, textAlign: 'center' }}>
      <AppIcon name="Users" size={30} color="var(--bento-t4)" />
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-t3)' }}>{t('groups.emptyStateTitle', undefined, lang)}</p>
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', maxWidth: 260 }}>{t('groups.emptyStateSub', undefined, lang)}</p>
    </div>
  )
}

// Cartão escuro de perfil (33a, topo da tela) — três números que são "os
// da comunidade, não os da leitura" (grupos/amigos/% lido), como o próprio
// handoff explica na nota de rodapé do quadro. "Desde {mês}" reaproveita
// EXATAMENTE o cálculo que já existia em ProgressScreen.jsx (5b) — dia
// mais antigo registrado na rotina — pra não inventar uma segunda fonte
// pra "quando a pessoa começou". A pílula de posição usa
// session.lastReadPosition (onde a pessoa REALMENTE parou — ver
// lastReadPositionStore.js), caindo pra currentBlock (próximo pendente)
// só quando ainda não existe nenhuma leitura salva.
function ProfileSummaryCard({ session, authUser, myGroupsCount, friendsCount, lang, onOpenProfile }) {
  const { avatarInitials, dailyRoutine, weeklyGoalDays, weeksInGoal, lastReadPosition, currentBlock, biblePercent } = session
  const fullName = (authUser?.name ?? '').trim() || session.userName
  const locale = lang === 'en' ? 'en' : 'pt-BR'

  const earliestKey = Object.keys(dailyRoutine ?? {}).sort()[0]
  const sinceLabel = (() => {
    if (!earliestKey) return null
    const [y, m] = earliestKey.split('-').map(Number)
    const monthName = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long' })
    return t('groups.profileSince', { month: lang === 'en' ? monthName : monthName.toLowerCase(), n: weeklyGoalDays ?? 5 }, lang)
  })()

  const positionBook = lastReadPosition?.book ?? currentBlock?.book ?? null
  const positionChapter = lastReadPosition?.chapter ?? currentBlock?.chapter ?? null
  const positionLabel = positionBook && positionChapter ? `${positionBook} ${positionChapter}` : null

  const biblePercentLabel = (biblePercent ?? 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'

  return (
    <div style={styles.pCard}>
      <div style={styles.pIdentityRow}>
        <span style={styles.pAvatar}>{avatarInitials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.pName}>{fullName}</p>
          {sinceLabel && <p style={styles.pSince}>{sinceLabel}</p>}
          <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
            {!!weeksInGoal && <span style={styles.pPillGoal}>{t('groups.profileWeeksInGoal', { n: weeksInGoal }, lang)}</span>}
            {positionLabel && <span style={styles.pPillPosition}>{positionLabel}</span>}
          </div>
        </div>
        <button type="button" style={styles.pEditBtn} onClick={() => onOpenProfile?.()} aria-label={t('groups.myProfileBtn', undefined, lang)}>
          <AppIcon name="Pencil" size={14} color="#fff" />
        </button>
      </div>

      <div style={styles.pStatsRow}>
        <div style={styles.pStatItem}>
          <p style={styles.pStatValue}>{myGroupsCount}</p>
          <p style={styles.pStatLabel}>{t('groups.profileGroupsLabel', undefined, lang)}</p>
        </div>
        <div style={{ ...styles.pStatItem, ...styles.pStatItemDivided }}>
          <p style={styles.pStatValue}>{friendsCount}</p>
          <p style={styles.pStatLabel}>{t('groups.profileFriendsLabel', undefined, lang)}</p>
        </div>
        <div style={{ ...styles.pStatItem, ...styles.pStatItemDivided }}>
          <p style={styles.pStatValue}>{biblePercentLabel}</p>
          <p style={styles.pStatLabel}>{t('groups.profileBibleReadLabel', undefined, lang)}</p>
        </div>
      </div>

      <div style={styles.pFooter}>
        <p style={styles.pFooterNote}>{t('groups.profilePrivacyNote', undefined, lang)}</p>
        <button type="button" style={styles.pFooterBtn} onClick={() => onOpenProfile?.()}>{t('groups.myProfileBtn', undefined, lang)}</button>
      </div>
    </div>
  )
}

// "Criar grupo" / "Entrar com código" (33a) — bloco próprio, separado da
// lista de grupos (antes vivia dentro de GroupsListSection); o handoff
// pede ele LOGO ABAIXO DO PERFIL quando a pessoa não tem grupo nenhum
// ainda, e no fim de tudo (depois de Amigos) no caso normal — por isso o
// componente é usado duas vezes em posições diferentes no JSX do pai, uma
// só ativa por vez (ver myGroups.length no return de GroupsScreen).
function CreateOrJoinTiles({ lang, onCreateTap, onReload }) {
  const [joining, setJoining] = useState(false)
  const [code, setCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')

  // Entrar num grupo pelo código de convite (quadro 19c) — não entra na
  // hora: cria um pedido 'requested' que um moderador do grupo aprova
  // depois (ver redeemGroupInviteCode/groupAdmin.joinRequestsLabel).
  async function submitJoin(e) {
    e.preventDefault()
    if (!code.trim()) return
    setJoinLoading(true)
    setJoinError('')
    try {
      const { name: groupName } = await redeemGroupInviteCode(code)
      setJoinSuccess(t('groups.joinRequestSent', { group: groupName }, lang))
      setCode('')
      setJoining(false)
      onReload?.()
    } catch (err) {
      setJoinError(
        err.message === 'invalid_code' ? t('groups.joinCodeInvalid', undefined, lang)
        : err.message === 'already_in_group' ? t('groups.joinCodeAlready', undefined, lang)
        : err.message
      )
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" style={styles.aCreateTile} onClick={onCreateTap}>
          <AppIcon name="Plus" size={17} strokeWidth={2} color="var(--bento-sand-icon)" />
          <p style={styles.aTileTitle}>{t('groups.createGroup', undefined, lang)}</p>
          <p style={styles.aTileSub}>{t('groups.createGroupTileSub', undefined, lang)}</p>
        </button>
        <button type="button" style={styles.aJoinTile} onClick={() => { setJoining(v => !v); setJoinError(''); setJoinSuccess('') }}>
          <AppIcon name="Ticket" size={17} strokeWidth={2} color="var(--bento-ink)" />
          <p style={{ ...styles.aTileTitle, color: 'var(--bento-ink)' }}>{t('groups.joinWithCode', undefined, lang)}</p>
          <p style={{ ...styles.aTileSub, color: 'var(--bento-t4)' }}>{t('groups.joinWithCodeTileSub', undefined, lang)}</p>
        </button>
      </div>

      {joining && (
        <div style={styles.bCard}>
          <form onSubmit={submitJoin} style={{ display: 'flex', gap: 8 }}>
            <input
              style={styles.bFieldInput}
              placeholder={t('groups.joinCodePlaceholder', undefined, lang)}
              value={code}
              onChange={e => setCode(e.target.value)}
              autoFocus
            />
            <button type="submit" style={styles.bPrimarySmallBtn} disabled={joinLoading}>
              {joinLoading ? t('groups.loading', undefined, lang) : t('groups.join', undefined, lang)}
            </button>
          </form>
        </div>
      )}
      {joinError && <p style={styles.bErrorText}>{joinError}</p>}
      {joinSuccess && <p style={styles.bEmptyHint}>{joinSuccess}</p>}
    </>
  )
}

// Lista "Seus grupos" (33a) — selo laranja de mensagens novas por linha
// (messagesSummaryByGroup, ver migration 0057 — substitui o selo antigo
// que só olhava a sala de hoje). Mais de GROUPS_SHOWN_MAX grupos: mostra
// só os primeiros + "Ver todos" expande o resto na hora, sem tela nova —
// o handoff pede o link mas não descreve uma tela de lista completa
// própria, e todo grupo já carrega de uma vez (não tem por que buscar de
// novo, só revelar).
const GROUPS_SHOWN_MAX = 4
function GroupsListSection({ groups, memberCounts, messagesSummaryByGroup, search, lang, onOpen }) {
  const [showAll, setShowAll] = useState(false)
  const clean = search.trim().toLowerCase()
  const filtered = clean ? groups.filter(g => g.name.toLowerCase().includes(clean)) : groups
  const shownGroups = (showAll || clean) ? filtered : filtered.slice(0, GROUPS_SHOWN_MAX)

  return (
    <div style={styles.bCard}>
      <div style={styles.bCardHeadRow}>
        <p style={styles.bCardLabel}>{t('groups.myGroupsTitle', undefined, lang)}</p>
        {groups.length > GROUPS_SHOWN_MAX && (
          <button type="button" style={styles.aSeeAllLink} onClick={() => setShowAll(v => !v)}>
            {t(showAll ? 'groups.showLess' : 'groups.seeAllGroups', undefined, lang)}
          </button>
        )}
      </div>
      {groups.length === 0 ? (
        <p style={styles.bEmptyHint}>{t('groups.noGroupsYet', undefined, lang)}</p>
      ) : shownGroups.length === 0 ? (
        <p style={styles.bEmptyHint}>{t('groups.searchNoResults', undefined, lang)}</p>
      ) : (
        shownGroups.map((g, i) => {
          const unread = messagesSummaryByGroup[g.groupId]?.unreadCount ?? 0
          return (
            <button
              key={g.groupId}
              style={{ ...styles.bLinkRow, borderBottom: i === shownGroups.length - 1 ? 'none' : '1px solid var(--bento-line)' }}
              onClick={() => onOpen(g.groupId)}
            >
              <span style={{ ...styles.bAvatarCircle, borderRadius: 12, ...(unread > 0 ? styles.bAvatarCircleActive : {}) }}>{avatarInitialsOf(g.name)}</span>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={styles.bMemberName}>{g.name}</p>
                <p style={styles.bMemberSub}>
                  {t(memberCounts[g.groupId] === 1 ? 'groups.memberCountOne' : 'groups.memberCountMany', { n: memberCounts[g.groupId] ?? 0 }, lang)}
                  {g.myRole === 'moderator' ? ` · ${t('groups.youAreModerator', undefined, lang)}` : ''}
                </p>
              </div>
              {unread > 0 ? <span style={styles.bUnreadBadge}>{unread}</span> : <span style={styles.bChevron}>›</span>}
            </button>
          )
        })
      )}
    </div>
  )
}

// Cartão "Amigos" (24a) — cada amigo em seu próprio quadrado (avatar +
// nome), mesmo padrão visual da grade cheia de AddFriendsScreen.jsx (24c,
// friendGridItem/friendGridAvatar/friendGridName), só que com no máximo 3
// pra caber numa fileira, mais um quadrado "+N · Ver" pro resto — igual
// ao quadro (Adicionar, Marina, Thiago, Ana, +9 Ver). Substitui a antiga
// FriendsSection embutida, que agora mora inteira em AddFriendsScreen.jsx
// (24c), aberta ao tocar em qualquer quadrado aqui.
const FRIENDS_PREVIEW_MAX = 3
function FriendsPreviewCard({ lang, friends, pendingCount, onOpen }) {
  const shown = friends.slice(0, FRIENDS_PREVIEW_MAX)
  const restCount = friends.length - shown.length
  return (
    <div style={styles.bCard}>
      <div style={styles.bCardHeadRow}>
        <p style={styles.bCardLabel}>{t('groups.myFriendsTitle', undefined, lang)}</p>
        {pendingCount > 0 && <span style={{ ...styles.bCardCount, background: 'none', color: 'var(--bento-accent)' }}>{t('groups.pendingRequestsCount', { n: pendingCount }, lang)}</span>}
      </div>
      <div style={styles.friendsPreviewGrid}>
        <button type="button" style={styles.friendsPreviewItem} onClick={onOpen}>
          <span style={{ ...styles.friendsPreviewAvatar, ...styles.friendsPreviewAddAvatar }}>
            <AppIcon name="Plus" size={15} strokeWidth={2.2} color="var(--bento-t3)" />
          </span>
          <span style={styles.friendsPreviewName}>{t('groups.addFriendShort', undefined, lang)}</span>
        </button>
        {shown.map(f => (
          <button type="button" key={f.friendshipId} style={styles.friendsPreviewItem} onClick={onOpen}>
            <span style={styles.friendsPreviewAvatar}>
              {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : avatarInitialsOf(f.name)}
            </span>
            <span style={styles.friendsPreviewName}>{f.name}</span>
          </button>
        ))}
        {restCount > 0 && (
          <button type="button" style={styles.friendsPreviewItem} onClick={onOpen}>
            <span style={{ ...styles.friendsPreviewAvatar, ...styles.friendsPreviewMoreAvatar }}>+{restCount}</span>
            <span style={styles.friendsPreviewName}>{t('groups.seeAll', undefined, lang)}</span>
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Painel de perfil de um amigo (expande abaixo do nome, na grade de
   amigos de AddFriendsScreen.jsx, 24c) — nome/foto/mensagem sempre
   aparecem pra amigos; progresso, o que está estudando, os grupos e a
   lista de amigos dele só aparecem se o dono marcou o perfil como público
   (ver get_friend_progress_summary e get_friend_friends_list em
   0004/0012_*.sql). Exportado porque a antiga FriendsSection embutida
   (que vivia aqui, ao lado dele) virou AddFriendsScreen.jsx — o painel em
   si não mudou, só passou a ser chamado de outro arquivo. ── */
export function FriendProfilePanel({ friendUserId, lang, authUser, myFriendIds, onUnfriend, onFriendAdded }) {
  const [profile, setProfile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [friendsOfFriend, setFriendsOfFriend] = useState(null)
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState(null)
  const [addedIds, setAddedIds] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getFriendProfile(friendUserId).then(async p => {
      if (cancelled) return
      setProfile(p)
      if (p?.isPublic) {
        const [s, f] = await Promise.all([
          getFriendProgressSummary(friendUserId),
          getFriendFriendsList(friendUserId),
        ])
        if (!cancelled) { setSummary(s); setFriendsOfFriend(f) }
      }
      setLoading(false)
    }).catch(err => { console.error('Failed to load friend profile', err); if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [friendUserId])

  async function handleAddFriend(targetUserId) {
    setAddingId(targetUserId)
    try {
      await sendFriendRequestByUserId(targetUserId)
      setAddedIds(prev => new Set(prev).add(targetUserId))
      onFriendAdded?.()
    } catch (err) {
      console.error('Failed to send friend request', err)
    } finally {
      setAddingId(null)
    }
  }

  if (loading) return <div style={styles.bFriendPanel} />
  if (!profile) return null

  let activeBlockName = null
  let biblePercent = null
  if (summary?.isPublic) {
    const { blocks } = deriveProgress(new Set(summary.completedKeys), summary.planId)
    const overall = computeOverallStats(blocks)
    const activeBlock = pickActiveBlock(blocks)
    activeBlockName = lang === 'en' ? activeBlock.nameEn : activeBlock.name
    biblePercent = overall.biblePercent
  }

  const otherFriends = (friendsOfFriend?.friends ?? []).filter(f => f.userId !== authUser?.id)

  return (
    <div style={styles.bFriendPanel}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={styles.bAvatarCircle}>
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : avatarInitialsOf(profile.name)}
        </span>
        <div style={{ flex: 1 }}>
          <p style={styles.bMemberName}>{profile.name}</p>
          {profile.bio && <p style={{ ...styles.bMemberSub, marginTop: 2 }}>{profile.bio}</p>}
        </div>
      </div>

      {summary?.isPublic ? (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <StatItemSmall value={`${biblePercent}%`} label={t('groups.friendBibleLabel', undefined, lang)} />
            <StatItemSmall value={summary.studiesCompletedCount} label={t('groups.friendStudiesLabel', undefined, lang)} />
            <StatItemSmall value={otherFriends.length} label={t('groups.friendFriendsCountLabel', undefined, lang)} />
          </div>
          <p style={styles.bMemberSub}>
            {t('groups.friendCurrentlyReading', { block: activeBlockName }, lang)}
          </p>
          {summary.groups.length > 0 && (
            <p style={styles.bMemberSub}>
              {t('groups.friendGroupsLabel', { groups: summary.groups.map(g => g.name).join(', ') }, lang)}
            </p>
          )}

          {otherFriends.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <p style={styles.bFriendOfFriendTitle}>{t('groups.friendFriendsListTitle', { name: profile.name }, lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {otherFriends.map(f => {
                  const alreadyFriend = myFriendIds?.has(f.userId) || addedIds.has(f.userId)
                  return (
                    <div key={f.userId} style={styles.bFriendOfFriendRow}>
                      <span style={{ ...styles.bAvatarCircle, width: 26, height: 26 }}>
                        {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : avatarInitialsOf(f.name)}
                      </span>
                      <span style={{ flex: 1, ...styles.bMemberName, fontSize: 12 }}>{f.name}</span>
                      {alreadyFriend ? (
                        <span style={styles.bFriendOfFriendAdded}>{t('groups.alreadyFriends', undefined, lang)}</span>
                      ) : (
                        <button
                          style={styles.bLinkBtn}
                          disabled={addingId === f.userId}
                          onClick={() => handleAddFriend(f.userId)}
                        >
                          {addingId === f.userId ? t('groups.loading', undefined, lang) : t('groups.addFriend', undefined, lang)}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p style={{ ...styles.bEmptyHint, marginTop: 8 }}>{t('groups.friendProfilePrivate', undefined, lang)}</p>
      )}

      <button style={styles.bUnfriendLink} onClick={onUnfriend}>{t('groups.removeFriend', undefined, lang)}</button>
    </div>
  )
}

function StatItemSmall({ value, label }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-0.3px', margin: 0 }}>{value}</p>
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 9, fontWeight: 700, color: 'var(--bento-t4)', margin: 0 }}>{label}</p>
    </div>
  )
}

/* ── Detalhe de um grupo: sub-abas Desafio / Discussão ── */
// Quadro 5d: abrir um grupo cai direto no painel único (Leitura do grupo /
// Pedido de oração / nota compartilhada / escrever no grupo) — não mais nas
// 3 abas de cara. Desafio/Oração completa/Discussão completa continuam
// existindo (nada do que já funcionava foi tirado), só que agora vivem atrás
// de "ver mais" — decisão da autora: o quadro 5d não desenha desafios nem
// lista de membros, então isso sai do primeiro plano em vez de ser recriado
// do zero num visual que o quadro nunca definiu.
function GroupDetailView({ groupId, groupName, lang, authUser, hasAI, todaySession, onOpenGroupRoom, onBack, onLeft }) {
  const [view, setView] = useState('home') // 'home' | 'challenge' | 'prayer' | 'discussion'
  const [autoInvite, setAutoInvite] = useState(false)
  const [detail, setDetail] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  function reload() { setReloadKey(k => k + 1) }

  useEffect(() => {
    getGroupDetail(groupId).then(setDetail).catch(err => console.error('Failed to load group detail', err))
  }, [groupId, reloadKey])

  const myMembership = detail?.members.find(m => m.userId === authUser?.id)
  const isModerator = myMembership?.role === 'moderator'

  async function handleLeave() {
    if (!window.confirm(t('groups.leaveConfirm', undefined, lang))) return
    await leaveGroup(groupId)
    onLeft()
  }

  if (!detail) {
    return <div style={{ padding: 20 }} />
  }

  if (view === 'home') {
    return (
      <GroupHomeView
        groupId={groupId}
        groupName={groupName}
        members={detail.members}
        lang={lang}
        todaySession={todaySession}
        onOpenGroupRoom={onOpenGroupRoom}
        onBack={onBack}
        onInvite={() => { setAutoInvite(true); setView('challenge') }}
        onGoPrayer={() => setView('prayer')}
        onGoDiscussion={() => setView('discussion')}
      />
    )
  }

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
      <div style={styles.detailHeader}>
        <button onClick={() => setView('home')} style={styles.backBtn} aria-label="back">
          <AppIcon name="ArrowLeft" size={19} color="var(--bento-ink)" />
        </button>
        <h1 style={styles.detailTitle}>{groupName}</h1>
      </div>

      <div style={{ padding: '0 14px 4px', display: 'flex', gap: 8 }}>
        <button style={{ ...styles.subTab, ...(view === 'challenge' ? styles.subTabActive : {}) }} onClick={() => { setAutoInvite(false); setView('challenge') }}>
          {t('groups.challengeTab', undefined, lang)}
        </button>
        <button style={{ ...styles.subTab, ...(view === 'prayer' ? styles.subTabActive : {}) }} onClick={() => setView('prayer')}>
          {t('groups.prayerTab', undefined, lang)}
        </button>
        <button style={{ ...styles.subTab, ...(view === 'discussion' ? styles.subTabActive : {}) }} onClick={() => setView('discussion')}>
          {t('groups.discussionTab', undefined, lang)}
        </button>
      </div>

      <div style={{ padding: '10px 14px 14px' }}>
        {view === 'challenge' && (
          <ChallengeTab
            groupId={groupId}
            members={detail.members}
            isModerator={isModerator}
            authUser={authUser}
            lang={lang}
            onChange={reload}
            onLeave={handleLeave}
            autoInvite={autoInvite}
          />
        )}
        {view === 'prayer' && (
          <GroupPrayerTab groupId={groupId} isModerator={isModerator} authUser={authUser} lang={lang} hasAI={hasAI} />
        )}
        {view === 'discussion' && (
          <DiscussionTab groupId={groupId} members={detail.members} isModerator={isModerator} authUser={authUser} lang={lang} />
        )}
      </div>
    </div>
  )
}

// Quadro 5d propriamente dito. Só o que o quadro desenha: cabeçalho com
// "Convidar", card de leitura do grupo (liga na Sala do Capítulo — 17a — do
// livro/capítulo da sessão de hoje da própria pessoa, mesma lógica que já
// existe em ReadingBlockView ao ler com o grupo), prévia do pedido de
// oração mais recente, prévia da nota mais recente e o atalho "Escrever no
// grupo". Cada card leva pra tela completa correspondente ao ser tocado.
function GroupHomeView({ groupId, groupName, members, lang, todaySession, onOpenGroupRoom, onBack, onInvite, onGoPrayer, onGoDiscussion }) {
  const [roomStats, setRoomStats] = useState(null)
  const [latestPrayer, setLatestPrayer] = useState(undefined)
  const [latestNote, setLatestNote] = useState(undefined)
  const [writeOpen, setWriteOpen] = useState(false)

  // "Leitura do grupo" usa a sessão de hoje da própria pessoa — não existe
  // hoje um "capítulo combinado do grupo" separado disso; é a mesma leitura
  // que, se tocada em grupo (ReadingBlockView), já abre a Sala do Capítulo.
  const hasReading = !!(todaySession && !todaySession.needsThemePick && todaySession.type !== 'reflection' && todaySession.book)
  const bookDisplay = hasReading ? (lang === 'en' ? todaySession.bookEn : todaySession.book) : ''
  const chapterLabel = hasReading
    ? `${bookDisplay} ${todaySession.chStart}${todaySession.chStart !== todaySession.chEnd ? `–${todaySession.chEnd}` : ''}`
    : ''

  useEffect(() => {
    if (!hasReading) { setRoomStats(null); return }
    getRoomStats(groupId, todaySession.book, todaySession.chStart).then(setRoomStats).catch(err => console.error('Failed to load room stats', err))
  }, [groupId, hasReading, todaySession?.book, todaySession?.chStart])

  useEffect(() => {
    // Feed (não a súplica capada em 3) porque isto é só uma prévia de UM
    // grupo específico — mais recente primeiro, pode incluir um pedido meu
    // (ver isMine abaixo: nesse caso não faz sentido mostrar o botão Orei).
    getPrayerRequestsFeed(groupId, 1).then(list => setLatestPrayer(list[0] ?? null)).catch(err => { console.error('Failed to load prayer requests', err); setLatestPrayer(null) })
    // getComments vem em ordem crescente (ver commentsStore.js) — a mais
    // recente é a última do array, fixada ou não (aqui é só uma prévia).
    getComments(groupId).then(list => setLatestNote(list[list.length - 1] ?? null)).catch(err => { console.error('Failed to load comments', err); setLatestNote(null) })
  }, [groupId])

  function handlePray(e) {
    e.stopPropagation()
    if (!latestPrayer || latestPrayer.isMine) return
    setLatestPrayer(p => ({ ...p, prayingByMe: !p.prayingByMe, prayCount: p.prayCount + (p.prayingByMe ? -1 : 1) }))
    togglePraying(latestPrayer.id).catch(err => console.error('Failed to toggle praying', err))
  }

  const AVATAR_PALETTE = [
    { bg: 'var(--bento-accent)', ink: 'var(--bento-ink)' },
    { bg: 'var(--bento-sand)', ink: 'var(--bento-sand-icon)' },
    { bg: 'var(--bento-mark)', ink: 'var(--bento-sand-icon)' },
  ]
  const visibleMembers = members.slice(0, 3)
  const overflow = members.length - visibleMembers.length

  return (
    <div style={styles.homeWrap}>
      <div style={styles.homeHeader}>
        <button onClick={onBack} style={styles.homeBackBtn} aria-label="back">
          <AppIcon name="ArrowLeft" size={18} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.homeTitle}>{t('groups.pageTitle', undefined, lang)}</p>
          <p style={styles.homeSubtitle}>{t('groups.homeSubtitle', { name: groupName, n: members.length }, lang)}</p>
        </div>
        <button style={styles.inviteBtn} onClick={onInvite}>{t('groups.invite', undefined, lang)}</button>
      </div>

      <div style={styles.homeScroll}>
        {hasReading && (
          <div style={styles.readingCard}>
            <p style={styles.readingLabel}>{t('groups.homeReadingLabel', undefined, lang)}</p>
            <p style={styles.readingTitle}>{chapterLabel}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ display: 'flex' }}>
                {visibleMembers.map((m, i) => {
                  const c = AVATAR_PALETTE[i % AVATAR_PALETTE.length]
                  return (
                    <div key={m.userId} style={{ ...styles.readingAvatar, background: c.bg, color: c.ink, marginLeft: i > 0 ? -6 : 0 }}>
                      {avatarInitialsOf(m.name)}
                    </div>
                  )
                })}
                {overflow > 0 && (
                  <div style={{ ...styles.readingAvatar, background: 'rgba(255,255,255,.12)', color: '#fff', marginLeft: -6 }}>
                    +{overflow}
                  </div>
                )}
              </div>
              {roomStats && (
                <span style={styles.readingStatus}>{t('groups.homeReadStatus', { done: roomStats.completed, total: roomStats.members }, lang)}</span>
              )}
            </div>
            <button
              style={styles.readingCta}
              onClick={() => onOpenGroupRoom?.({ group: { groupId, name: groupName }, book: todaySession.book, bookEn: todaySession.bookEn, chapter: todaySession.chStart })}
            >
              {t('groups.homeReadCta', undefined, lang)}
            </button>
          </div>
        )}

        <div style={styles.prayerCard} onClick={onGoPrayer}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={styles.prayerLabel}>{t('groups.homePrayerLabel', undefined, lang)}</p>
            {latestPrayer && <span style={styles.prayerTime}>{formatRelativeTime(latestPrayer.createdAt, lang)}</span>}
          </div>
          {latestPrayer === undefined ? null : latestPrayer ? (
            <>
              <p style={styles.prayerQuote}>"{latestPrayer.body}" — {latestPrayer.anonymous ? t('prayer.anonymousLabel', undefined, lang) : latestPrayer.authorName}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {!latestPrayer.isMine && (
                  <button style={styles.prayBtn} onClick={handlePray}>{t('groups.homePrayBtn', undefined, lang)}</button>
                )}
                <span style={styles.prayerCount}>{t('groups.homePrayedCount', { n: latestPrayer.prayCount }, lang)}</span>
              </div>
            </>
          ) : (
            <p style={styles.prayerEmpty}>{t('groups.homeNoPrayerYet', undefined, lang)}</p>
          )}
        </div>

        <div style={styles.noteCard} onClick={onGoDiscussion}>
          {latestNote === undefined ? null : latestNote ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={styles.noteAvatar}>{avatarInitialsOf(latestNote.authorName)}</div>
                <p style={styles.noteTitle}>{t('groups.homeNoteShared', { name: latestNote.authorName }, lang)}</p>
                <span style={styles.noteTime}>{formatRelativeTime(latestNote.createdAt, lang)}</span>
              </div>
              <p style={styles.noteBody}>"{latestNote.body}"</p>
            </>
          ) : (
            <p style={styles.noteEmptyText}>{t('groups.homeNoNoteYet', undefined, lang)}</p>
          )}
        </div>

        <div>
          <button style={styles.writeRow} onClick={() => setWriteOpen(o => !o)}>
            <div style={styles.writeIcon}><AppIcon name="Plus" size={16} color="var(--bento-accent)" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.writeTitle}>{t('groups.homeWriteTitle', undefined, lang)}</p>
              <p style={styles.writeSub}>{t('groups.homeWriteSub', undefined, lang)}</p>
            </div>
            <span style={styles.writeChevron}>›</span>
          </button>
          {writeOpen && (
            <div style={styles.writeChooser}>
              <button style={styles.writeChooserBtn} onClick={onGoDiscussion}>{t('groups.homeWriteNoteOption', undefined, lang)}</button>
              <button style={styles.writeChooserBtn} onClick={onGoPrayer}>{t('groups.homeWritePrayerOption', undefined, lang)}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Aba Desafio: membros, placar, propor desafio, convidar, sair ── */
// autoInvite: abre o painel de convite já expandido — usado pelo atalho
// "Convidar" do cabeçalho do quadro 5d, que cai aqui reaproveitando a
// mesma lista de amigos convidáveis em vez de duplicá-la.
function ChallengeTab({ groupId, members, isModerator, authUser, lang, onChange, onLeave, autoInvite = false }) {
  const [challenges, setChallenges] = useState([])
  const [leaderboards, setLeaderboards] = useState({})
  const [proposing, setProposing] = useState(false)
  const [inviting, setInviting] = useState(autoInvite)
  const [friends, setFriends] = useState([])

  function reload() {
    getChallengesForGroup(groupId).then(async list => {
      setChallenges(list)
      const boards = {}
      for (const c of list) {
        boards[c.id] = await getChallengeLeaderboard(c.id)
      }
      setLeaderboards(boards)
    }).catch(err => console.error('Failed to load challenges', err))
  }

  useEffect(() => { reload() }, [groupId])
  useEffect(() => { if (inviting) getFriends().then(setFriends).catch(err => console.error('Failed to load friends', err)) }, [inviting])

  const memberIds = new Set(members.map(m => m.userId))
  const invitableFriends = friends.filter(f => !memberIds.has(f.userId))
  // Um grupo pode ter mais de um desafio em andamento ao mesmo tempo — todos
  // aparecem (não só "o" ativo), pra "Concluir desafio" nunca agir sobre um
  // desafio diferente do que a pessoa está de fato olhando.
  const activeChallenges = challenges.filter(c => c.active)
  const pastChallenges = challenges.filter(c => !c.active)

  async function handleInvite(friendUserId) {
    await inviteFriendToGroup(groupId, friendUserId)
    setInviting(false)
  }

  async function handlePromote(userId, currentRole) {
    await setMemberRole(groupId, userId, currentRole === 'moderator' ? 'member' : 'moderator')
    onChange()
  }

  async function handleCompleteChallenge(challengeId) {
    if (!window.confirm(t('groups.completeChallengeConfirm', undefined, lang))) return
    try {
      await completeChallenge(challengeId)
      reload()
    } catch (err) {
      console.error('Failed to complete challenge', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Membros */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>{t('groups.membersTitle', { n: members.length }, lang)}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {members.map(m => (
            <div key={m.userId} style={styles.memberRow}>
              <span style={styles.friendName}>{m.name}</span>
              {m.role === 'moderator' && <span style={styles.badgeModerator}>{t('groups.moderatorBadge', undefined, lang)}</span>}
              {isModerator && m.userId !== authUser?.id && (
                <button style={styles.smallLinkBtn} onClick={() => handlePromote(m.userId, m.role)}>
                  {m.role === 'moderator' ? t('groups.demote', undefined, lang) : t('groups.promote', undefined, lang)}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Desafios ativos — todos, não só o mais recente */}
      {activeChallenges.length === 0 ? (
        <p style={styles.emptyHint}>{t('groups.noActiveChallenge', undefined, lang)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeChallenges.length > 1 && (
            <p style={styles.cardTitle}>{t('groups.activeChallengesTitle', { n: activeChallenges.length }, lang)}</p>
          )}
          {activeChallenges.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              leaderboard={leaderboards[c.id] ?? []}
              lang={lang}
              isModerator={isModerator}
              onComplete={() => handleCompleteChallenge(c.id)}
            />
          ))}
        </div>
      )}

      {proposing ? (
        <ProposeChallengeForm groupId={groupId} lang={lang} onDone={() => { setProposing(false); reload() }} onCancel={() => setProposing(false)} />
      ) : (
        <button style={styles.secondaryBtn} onClick={() => setProposing(true)}>{t('groups.proposeChallenge', undefined, lang)}</button>
      )}

      {pastChallenges.length > 0 && (
        <div>
          <p style={styles.cardTitle}>{t('groups.pastChallengesTitle', undefined, lang)}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pastChallenges.map(c => (
              <ChallengeCard key={c.id} challenge={c} leaderboard={leaderboards[c.id] ?? []} lang={lang} ended />
            ))}
          </div>
        </div>
      )}

      {/* Convidar amigo */}
      {inviting ? (
        <div style={styles.card}>
          <p style={styles.cardTitle}>{t('groups.inviteFriendTitle', undefined, lang)}</p>
          {invitableFriends.length === 0 ? (
            <p style={styles.emptyHint}>{t('groups.noInvitableFriends', undefined, lang)}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {invitableFriends.map(f => (
                <div key={f.userId} style={styles.memberRow}>
                  <span style={styles.friendName}>{f.name}</span>
                  <button style={styles.smallLinkBtn} onClick={() => handleInvite(f.userId)}>{t('groups.invite', undefined, lang)}</button>
                </div>
              ))}
            </div>
          )}
          <button style={{ ...styles.smallLinkBtn, marginTop: 8 }} onClick={() => setInviting(false)}>{t('groups.cancel', undefined, lang)}</button>
        </div>
      ) : (
        <button style={styles.secondaryBtn} onClick={() => setInviting(true)}>{t('groups.inviteFriendTitle', undefined, lang)}</button>
      )}

      <button style={styles.leaveBtn} onClick={onLeave}>{t('groups.leaveGroup', undefined, lang)}</button>
    </div>
  )
}

function ProposeChallengeForm({ groupId, lang, onDone, onCancel }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedBooks, setSelectedBooks] = useState([])
  const [duration, setDuration] = useState('7d')
  const [customDate, setCustomDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleBook(book) {
    setSelectedBooks(prev => prev.includes(book) ? prev.filter(b => b !== book) : [...prev, book])
  }

  async function submit() {
    if (!name.trim()) { setError(t('groups.pickChallengeName', undefined, lang)); return }
    if (selectedBooks.length === 0) { setError(t('groups.pickAtLeastOneBook', undefined, lang)); return }
    let endsAt
    if (duration === 'custom') {
      if (!customDate) { setError(t('groups.pickEndDate', undefined, lang)); return }
      endsAt = new Date(customDate).toISOString()
    } else {
      const preset = DURATION_PRESETS.find(p => p.id === duration)
      endsAt = new Date(Date.now() + preset.days * 24 * 60 * 60 * 1000).toISOString()
    }
    setLoading(true)
    try {
      await createChallenge(groupId, selectedBooks, endsAt, name, description)
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.card}>
      <p style={styles.cardTitle}>{t('groups.proposeChallenge', undefined, lang)}</p>

      <input
        type="text"
        style={{ ...styles.input, marginBottom: 8 }}
        placeholder={t('groups.challengeNamePlaceholder', undefined, lang)}
        value={name}
        onChange={e => setName(e.target.value)}
        maxLength={100}
      />
      <textarea
        style={{ ...styles.textarea, marginBottom: 10 }}
        placeholder={t('groups.challengeDescPlaceholder', undefined, lang)}
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        maxLength={500}
      />

      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {ALL_BLOCKS_WITH_BOOKS.map(block => (
          <div key={block.id}>
            <p style={styles.blockLabel}>{lang === 'en' ? block.nameEn : block.name}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(lang === 'en' ? block.booksEn : block.books).map((bookName, i) => {
                const bookKey = block.books[i] // sempre a chave em português, igual completed_keys
                const active = selectedBooks.includes(bookKey)
                return (
                  <span
                    key={bookKey}
                    style={{ ...styles.bookChip, ...(active ? styles.bookChipActive : {}) }}
                    onClick={() => toggleBook(bookKey)}
                  >
                    {bookName}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p style={styles.cardTitle}>{t('groups.durationLabel', undefined, lang)}</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {DURATION_PRESETS.map(p => (
          <span
            key={p.id}
            style={{ ...styles.durationChip, ...(duration === p.id ? styles.durationChipActive : {}) }}
            onClick={() => setDuration(p.id)}
          >
            {t(`groups.duration_${p.id}`, undefined, lang)}
          </span>
        ))}
        <span
          style={{ ...styles.durationChip, ...(duration === 'custom' ? styles.durationChipActive : {}) }}
          onClick={() => setDuration('custom')}
        >
          {t('groups.durationCustom', undefined, lang)}
        </span>
      </div>
      {duration === 'custom' && (
        <input
          type="date"
          style={{ ...styles.input, marginBottom: 10 }}
          value={customDate}
          onChange={e => setCustomDate(e.target.value)}
        />
      )}

      {error && <p style={styles.error}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={styles.primaryBtn} onClick={submit} disabled={loading}>
          {loading ? t('groups.loading', undefined, lang) : t('groups.startChallenge', undefined, lang)}
        </button>
        <button style={styles.secondaryBtn} onClick={onCancel}>{t('groups.cancel', undefined, lang)}</button>
      </div>
    </div>
  )
}

function ChallengeCard({ challenge, leaderboard, lang, ended, isModerator, onComplete }) {
  const totalChapters = challenge.books.reduce((sum, book) => sum + (BOOK_CHAPTER_COUNTS[book] ?? 0), 0)
  const ranked = [...leaderboard].sort((a, b) => b.completedKeys.length - a.completedKeys.length)

  return (
    <div style={{ ...styles.card, ...(ended ? styles.cardEnded : {}) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <p style={styles.cardTitle}>{challenge.name || challenge.books.join(', ')}</p>
        {ended && (
          <span style={styles.badgeEnded}>
            {t(challenge.manuallyCompleted ? 'groups.challengeCompleted' : 'groups.challengeEnded', undefined, lang)}
          </span>
        )}
      </div>
      {challenge.name && <p style={styles.challengeBooks}>{challenge.books.join(', ')}</p>}
      {challenge.description && <p style={styles.challengeDesc}>{challenge.description}</p>}
      <p style={styles.challengeMeta}>
        {formatDate(challenge.startsAt, lang)} → {formatDate(challenge.endsAt, lang)} · {t('groups.proposedBy', { name: challenge.createdByName }, lang)}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {ranked.map((p, i) => {
          const pct = totalChapters ? Math.min(100, Math.round((p.completedKeys.length / totalChapters) * 100)) : 0
          return (
            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={styles.rankNumber}>{i + 1}</span>
              <span style={{ ...styles.friendName, flex: 'none', width: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--bento-line)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--bento-accent)', borderRadius: 99, width: `${pct}%` }} />
              </div>
              <span style={{ fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 700, color: 'var(--bento-t3)', width: 32, textAlign: 'right' }}>{pct}%</span>
            </div>
          )
        })}
      </div>
      {!ended && isModerator && (
        <button style={styles.completeChallengeBtn} onClick={onComplete}>
          <AppIcon name="Check" size={13} /> {t('groups.completeChallenge', undefined, lang)}
        </button>
      )}
    </div>
  )
}

/* ── Aba Discussão: mural tipo fórum ── */
function DiscussionTab({ groupId, members, isModerator, authUser, lang }) {
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [pinError, setPinError] = useState('')

  const moderatorIds = new Set(members.filter(m => m.role === 'moderator').map(m => m.userId))

  function reload() {
    getComments(groupId).then(setComments).catch(err => console.error('Failed to load comments', err))
  }

  useEffect(() => { reload() }, [groupId])

  async function submit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    try {
      await postComment(groupId, body)
      setBody('')
      reload()
    } catch (err) {
      console.error('Failed to post comment', err)
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(commentId) {
    if (!window.confirm(t('groups.deleteCommentConfirm', undefined, lang))) return
    await deleteComment(commentId)
    reload()
  }

  async function handleLike(comment) {
    // otimista: atualiza local antes de esperar o servidor
    setComments(prev => prev.map(c => c.id === comment.id
      ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likeCount + (c.likedByMe ? -1 : 1) }
      : c))
    toggleCommentLike(comment.id).catch(err => console.error('Failed to toggle like', err))
  }

  async function handleTogglePin(comment) {
    setPinError('')
    try {
      await setCommentPinned(comment.id, !comment.pinned)
      reload()
    } catch (err) {
      setPinError(err.message)
    }
  }

  const pinnedComments = comments.filter(c => c.pinned).sort((a, b) => new Date(a.pinnedAt) - new Date(b.pinnedAt))
  const regularComments = comments.filter(c => !c.pinned)
  const pinnedCount = pinnedComments.length

  function renderComment(c) {
    const canDelete = c.userId === authUser?.id || isModerator
    const authorIsModerator = moderatorIds.has(c.userId)
    const canPinMore = pinnedCount < 3
    return (
      <div key={c.id} style={{ ...styles.commentCard, ...(authorIsModerator ? styles.commentCardModerator : {}) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={styles.commentAuthor}>
            {c.authorName}
            {authorIsModerator && <span style={{ ...styles.badgeModerator, marginLeft: 6 }}>{t('groups.moderatorBadge', undefined, lang)}</span>}
          </span>
          <span style={styles.commentDate}>{formatDate(c.createdAt, lang)}</span>
        </div>
        <p style={styles.commentBody}>{c.body}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <button style={{ ...styles.likeBtn, ...(c.likedByMe ? styles.likeBtnActive : {}) }} onClick={() => handleLike(c)}>
            <AppIcon name="Heart" size={13} color={c.likedByMe ? 'var(--bento-accent)' : 'var(--bento-t4)'} /> {c.likeCount}
          </button>
          {isModerator && (
            <button
              style={{ ...styles.smallLinkBtn, ...(!c.pinned && !canPinMore ? styles.smallLinkBtnDisabled : {}) }}
              onClick={() => handleTogglePin(c)}
              disabled={!c.pinned && !canPinMore}
            >
              <AppIcon name="Pin" size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
              {c.pinned ? t('groups.unpinComment', undefined, lang) : t('groups.pinComment', undefined, lang)}
            </button>
          )}
          {canDelete && (
            <button style={styles.smallLinkBtn} onClick={() => handleDelete(c.id)}>{t('groups.deleteComment', undefined, lang)}</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          style={styles.textarea}
          placeholder={t('groups.commentPlaceholder', undefined, lang)}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
        />
        <button type="submit" style={styles.primaryBtn} disabled={posting}>
          {posting ? t('groups.loading', undefined, lang) : t('groups.postComment', undefined, lang)}
        </button>
      </form>

      {pinError && <p style={styles.error}>{pinError}</p>}

      {pinnedComments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={styles.pinnedSectionTitle}>
            <AppIcon name="Pin" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {t('groups.pinnedSectionTitle', undefined, lang)}
          </p>
          {pinnedComments.map(renderComment)}
        </div>
      )}

      {comments.length === 0 ? (
        <p style={styles.emptyHint}>{t('groups.noCommentsYet', undefined, lang)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {regularComments.map(renderComment)}
        </div>
      )}
    </div>
  )
}

/* ── Aba Oração: pedidos deste grupo, modelo novo (25a/25b, Bloco 11) —
   sem comentário nenhum (o design novo proíbe), "Orei" só conta, nunca
   expõe quem (ver get_prayer_requests_feed). Publicar abre a mesma folha
   de 25b, já com este grupo escolhido. ── */
function GroupPrayerTab({ groupId, isModerator, authUser, lang, hasAI }) {
  const [requests, setRequests] = useState([])
  const [addOpen, setAddOpen] = useState(false)

  function reload() {
    getPrayerRequestsFeed(groupId).then(setRequests).catch(err => console.error('Failed to load prayer requests', err))
  }

  useEffect(() => { reload() }, [groupId])

  async function handleDelete(requestId) {
    if (!window.confirm(t('groups.deletePrayerRequestConfirm', undefined, lang))) return
    await deletePrayerRequest(requestId)
    reload()
  }

  function handleClose(requestId) {
    if (!window.confirm(t('prayer.closeRequestConfirm', undefined, lang))) return
    setRequests(prev => prev.filter(r => r.id !== requestId))
    closePrayerRequest(requestId).catch(err => console.error('Failed to close prayer request', err))
  }

  function handleTogglePraying(request) {
    // otimista: atualiza local antes de esperar o servidor
    setRequests(prev => prev.map(r => r.id === request.id
      ? { ...r, prayingByMe: !r.prayingByMe, prayCount: r.prayCount + (r.prayingByMe ? -1 : 1) }
      : r))
    togglePraying(request.id).catch(err => console.error('Failed to toggle praying', err))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button type="button" style={styles.primaryBtn} onClick={() => setAddOpen(true)}>
        {t('groups.postPrayerRequest', undefined, lang)}
      </button>

      {requests.length === 0 ? (
        <p style={styles.emptyHint}>{t('groups.noPrayerRequestsYet', undefined, lang)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map(r => {
            const canDelete = isModerator && !r.isMine
            return (
              <div key={r.id} style={styles.commentCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={styles.commentAuthor}>{r.anonymous ? t('prayer.anonymousLabel', undefined, lang) : r.authorName}</span>
                  <span style={styles.commentDate}>{formatDate(r.createdAt, lang)}</span>
                </div>
                <p style={styles.commentBody}>{r.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  {r.isMine ? (
                    <button style={styles.smallLinkBtn} onClick={() => handleClose(r.id)}>{t('prayer.closeRequestBtn', undefined, lang)}</button>
                  ) : (
                    <button style={{ ...styles.prayingBtn, ...(r.prayingByMe ? styles.prayingBtnActive : {}) }} onClick={() => handleTogglePraying(r)}>
                      <AppIcon name="HandHeart" size={13} color={r.prayingByMe ? 'var(--bento-accent)' : 'var(--bento-t4)'} /> {t('groups.homePrayedCount', { n: r.prayCount }, lang)}
                    </button>
                  )}
                  {canDelete && (
                    <button style={styles.smallLinkBtn} onClick={() => handleDelete(r.id)}>{t('groups.deleteComment', undefined, lang)}</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {addOpen && (
        <AddPrayerRequestSheet
          lang={lang}
          authUser={authUser}
          hasAI={hasAI}
          defaultGroupId={groupId}
          onClose={() => setAddOpen(false)}
          onCreated={reload}
        />
      )}
    </div>
  )
}

const styles = {
  // ── Redesign Bento da lista (sem quadro no handoff — só o quadro 5d,
  // "dentro de um grupo", tem desenho; ver GroupHomeView). Prefixo `b`
  // pra não colidir com os estilos antigos abaixo, ainda usados pelas
  // sub-abas Desafio/Discussão/Oração completas (atrás de "ver mais" de
  // dentro de um grupo — fora do escopo desta leva). Mesma linguagem
  // visual de GroupAdminScreen.jsx (quadro 19c): cartões brancos
  // arredondados-24, rótulo uppercase pequeno, avatar circular, "vê tudo"
  // como botão de texto.
  bTitle: { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.7px', color: 'var(--bento-ink)', margin: 0 },

  // Cabeçalho (33a) — só o título "Comunidade" à esquerda (a linha "N
  // grupos · N amigos" saiu, foi pro cartão de perfil) e três botões de
  // 34px à direita (busca/sino/+).
  aHeader: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 20px 0' },
  // 33a: "+" é o único botão escuro do cabeçalho (ícone laranja em cima de
  // --bento-ink) — não o cinza/areia que estava aqui antes (achado na
  // mesma auditoria de cor de fundo).
  aAddBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  aSearchBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  // Sino (33a) — entre a lupa e o "+"; badge no canto, mesma pílula
  // laranja/tinta de sempre. Abre 33b (Mensagens), não um painel dropdown
  // (esse já existe em NotificationBell.jsx, é outra tela/outro uso — não
  // reaproveitado aqui de propósito, os dois não coexistem: 'groups' está
  // sempre no bentoScreen, então o AppHeader/Sidebar com o sino antigo
  // nunca aparece por cima desta tela).
  aBellBtn: { position: 'relative', width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  aBellBadge: { position: 'absolute', top: -4, right: -4, height: 19, minWidth: 19, padding: '0 5px', borderRadius: 99, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  aSearchInput: { width: '100%', height: 42, borderRadius: 14, border: 'none', background: 'var(--bento-card)', padding: '0 14px', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', boxSizing: 'border-box' },
  aSeeAllLink: { border: 'none', background: 'none', padding: 0, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  // Cartão escuro de perfil (33a) — substitui "Sala aberta agora" no topo.
  pCard: { borderRadius: 26, background: 'var(--bento-ink)', padding: '18px 20px' },
  pIdentityRow: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  pAvatar: { width: 56, height: 56, flexShrink: 0, borderRadius: 19, background: 'var(--bento-accent)', color: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 18, fontWeight: 800 },
  pName: { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.5px', color: '#fff', margin: 0 },
  pSince: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: '2px 0 0' },
  pPillGoal: { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, color: 'var(--bento-accent)', background: 'rgba(240,102,43,.16)', borderRadius: 99, padding: '5px 8px' },
  pPillPosition: { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.6)', background: 'rgba(255,255,255,.09)', borderRadius: 99, padding: '5px 8px' },
  pEditBtn: { width: 30, height: 30, flexShrink: 0, borderRadius: 11, border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  pStatsRow: { display: 'flex', marginBottom: 12 },
  pStatItem: { flex: 1 },
  pStatItemDivided: { paddingLeft: 14, borderLeft: '1px solid rgba(255,255,255,.1)', marginLeft: 0 },
  pStatValue: { fontFamily: 'var(--font-bento)', fontSize: 23, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1, color: '#fff', margin: '0 0 3px' },
  pStatLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,.45)', margin: 0 },
  pFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 11, borderTop: '1px solid rgba(255,255,255,.1)' },
  pFooterNote: { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 600, lineHeight: 1.35, color: 'rgba(255,255,255,.5)', margin: 0 },
  pFooterBtn: { flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 11, border: 'none', background: 'rgba(255,255,255,.1)', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, color: '#fff', cursor: 'pointer' },

  // Atalhos "Criar grupo" / "Entrar com código" (33a), lado a lado — o de
  // criar em sand (ação principal), o de entrar em branco (secundária);
  // aTileTitle/aTileSub nascem pensados pro fundo sand e cada chamada do
  // tile de entrar sobrescreve a cor pra ink/t4 (ver JSX).
  aCreateTile: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderRadius: 18, background: 'var(--bento-sand)', border: 'none', padding: 14, cursor: 'pointer', textAlign: 'left' },
  aJoinTile: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderRadius: 18, background: 'var(--bento-card)', border: 'none', padding: 14, cursor: 'pointer', textAlign: 'left' },
  aTileTitle: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: '4px 0 0' },
  aTileSub: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 500, color: 'var(--bento-sand-ink-mid)', margin: 0 },

  // Grade de amigos do cartão "Amigos" (24a) — mesmo padrão visual de
  // friendGridItem/friendGridAvatar/friendGridName em AddFriendsScreen.jsx
  // (24c), só que sem o grid de 4 colunas (aqui é 1 fileira só).
  friendsPreviewGrid: { display: 'flex', gap: 14, marginTop: 6, overflowX: 'auto' },
  friendsPreviewItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 },
  friendsPreviewAvatar: { width: 44, height: 44, borderRadius: 15, background: 'var(--bento-line)', color: 'var(--bento-t3)', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, lineHeight: '44px', textAlign: 'center', overflow: 'hidden' },
  friendsPreviewAddAvatar: { background: 'var(--bento-bg)', border: '1.5px dashed var(--bento-t5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  friendsPreviewMoreAvatar: { background: 'var(--bento-sand)', color: 'var(--bento-sand-icon)' },
  friendsPreviewName: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t3)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 56 },

  bCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '14px 20px 4px' },
  bCardHeadRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  bCardLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  bCardCount: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, color: 'var(--bento-accent)' },
  bLinkBtn: { border: 'none', background: 'none', padding: 0, fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  bIconBtn: { width: 28, height: 28, flexShrink: 0, borderRadius: 9, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  bIconBtnOn: { background: 'var(--bento-ink)' },

  bLinkRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '10px 0', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' },
  bInviteRow: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '10px 0' },
  bAvatarCircle: { width: 32, height: 32, flexShrink: 0, borderRadius: 99, background: 'var(--bento-sand)', color: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, overflow: 'hidden' },
  // Avatar do grupo com sala aberta hoje vira escuro (24a: "GS" preto vs.
  // "BC"/"CA" areia) — o mesmo grupo que carrega o selo de mensagens novas.
  bAvatarCircleActive: { background: 'var(--bento-ink)', color: '#fff' },
  // Selo "N mensagens novas" (24a) — pílula laranja, texto tinta (nunca
  // branco em cima de laranja, regra do design system).
  bUnreadBadge: { flexShrink: 0, minWidth: 24, height: 24, padding: '0 8px', borderRadius: 99, background: 'var(--bento-accent)', color: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 800 },
  bMemberName: { fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  bMemberSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  bAcceptBtn: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  bDeclineBtn: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  bChevron: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },

  bEmptyHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '14px 4px' },
  bErrorText: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, color: '#DC2626', margin: '0 0 8px' },
  bInviteSentMsg: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, color: 'var(--bento-accent)', margin: '0 0 8px' },
  bAddFriendHint: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.5, margin: '0 0 10px' },
  bFieldInput: { flex: 1, border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 600, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)' },
  bPrimarySmallBtn: { flexShrink: 0, border: 'none', borderRadius: 12, padding: '11px 16px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', background: 'var(--bento-accent)', cursor: 'pointer' },

  bFriendPanel: { borderRadius: 20, background: 'var(--bento-line)', padding: '14px 16px', marginBottom: 12 },
  bFriendOfFriendTitle: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  bFriendOfFriendRow: { display: 'flex', alignItems: 'center', gap: 8 },
  bFriendOfFriendAdded: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t4)' },
  bUnfriendLink: { display: 'block', marginTop: 10, border: 'none', background: 'none', padding: 0, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: '#DC2626', cursor: 'pointer' },

  input: { flex: 1, border: 'none', borderRadius: 12, padding: '10px 12px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)' },
  textarea: { width: '100%', border: 'none', borderRadius: 12, padding: '10px 12px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-ink)', resize: 'none', outline: 'none', lineHeight: 1.5, background: 'var(--bento-line)' },
  error: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 600, color: '#DC2626', background: '#FEE2E2', borderRadius: 12, padding: '8px 10px', marginBottom: 8 },
  emptyHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', padding: '4px 2px' },
  backBtn: { width: 32, height: 32, borderRadius: 10, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  card: { background: 'var(--bento-card)', borderRadius: 20, padding: 14 },
  cardEnded: { background: 'var(--bento-line)', opacity: 0.75 },
  completeChallengeBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', background: 'rgba(30,142,79,.12)', color: '#1E8E4F', borderRadius: 12, padding: '10px 12px', marginTop: 12, fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  cardTitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 8 },
  memberRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px' },
  friendName: { flex: 1, fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)' },
  smallLinkBtn: { border: 'none', background: 'none', color: 'var(--bento-accent)', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 },
  smallLinkBtnDisabled: { color: 'var(--bento-t4)', cursor: 'not-allowed' },
  subTab: { flex: 1, textAlign: 'center', padding: '9px 4px', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', borderRadius: 9, border: 'none', background: 'var(--bento-line)' },
  subTabActive: { color: '#fff', background: 'var(--bento-ink)', fontWeight: 800 },
  blockLabel: { fontFamily: 'var(--font-bento)', fontSize: 9, fontWeight: 700, color: 'var(--bento-t3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  bookChip: { background: 'var(--bento-line)', border: 'none', borderRadius: 20, padding: '5px 10px', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },
  bookChipActive: { background: 'var(--bento-ink)', color: '#fff' },
  durationChip: { background: 'var(--bento-line)', border: 'none', borderRadius: 20, padding: '6px 12px', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },
  durationChipActive: { background: 'var(--bento-ink)', color: '#fff' },
  challengeMeta: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 500, color: 'var(--bento-t3)' },
  challengeBooks: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 600, color: 'var(--bento-accent)', marginBottom: 6 },
  challengeDesc: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.5, marginBottom: 6 },
  rankNumber: { width: 18, fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 800, color: 'var(--bento-t4)', flexShrink: 0 },
  leaveBtn: { background: '#FEE2E2', border: 'none', borderRadius: 12, padding: 11, fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: '#DC2626', cursor: 'pointer' },
  commentCard: { background: 'var(--bento-card)', borderRadius: 18, padding: 12 },
  commentCardModerator: { background: 'var(--bento-line)' },
  pinnedSectionTitle: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, color: 'var(--bento-t3)', letterSpacing: 0.5, textTransform: 'uppercase' },
  commentAuthor: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-ink)' },
  commentDate: { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 500, color: 'var(--bento-t4)' },
  commentBody: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.5, marginTop: 4 },
  likeBtn: { display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: 'var(--bento-t3)', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 },
  likeBtnActive: { color: 'var(--bento-accent)' },
  prayingBtn: { display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: 'var(--bento-t3)', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 },
  prayingBtnActive: { color: 'var(--bento-accent)' },
  badgeModerator: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, color: 'var(--bento-accent)', background: 'var(--bento-mark)', borderRadius: 20, padding: '2px 8px', display: 'inline-block', letterSpacing: '.02em' },
  badgeEnded: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 700, color: 'var(--bento-t3)', background: 'var(--bento-line)', borderRadius: 20, padding: '2px 8px', display: 'inline-block', letterSpacing: '.02em' },
  detailHeader: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 4px' },
  detailTitle: { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  primaryBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'var(--bento-accent)', borderRadius: 14, padding: 13, fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', border: 'none', cursor: 'pointer' },
  secondaryBtn: { background: 'var(--bento-line)', borderRadius: 12, padding: '10px 16px', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-ink)', border: 'none', cursor: 'pointer' },

  // Quadro 5d — painel único do grupo (GroupHomeView).
  homeWrap: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bento-bg)' },
  homeHeader: { flex: 'none', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '20px 20px 0' },
  homeBackBtn: {
    width: 34, height: 34, borderRadius: 11, border: 'none', background: 'var(--bento-card)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  homeTitle: { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: 0 },
  homeSubtitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '4px 0 0' },
  inviteBtn: {
    height: 34, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--bento-card)',
    fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer', flexShrink: 0,
  },
  homeScroll: {
    flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    padding: '18px 20px calc(96px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 12,
  },
  readingCard: { borderRadius: 28, background: 'var(--bento-ink)', padding: 22, color: '#fff' },
  readingLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: '0 0 14px' },
  readingTitle: { fontFamily: 'var(--font-bento)', fontSize: 24, fontWeight: 800, letterSpacing: '-.9px', margin: '0 0 14px' },
  readingAvatar: { width: 28, height: 28, borderRadius: 10, fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, lineHeight: '28px', textAlign: 'center' },
  readingStatus: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)' },
  readingCta: { width: '100%', height: 48, borderRadius: 16, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  prayerCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: 20, cursor: 'pointer' },
  prayerLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: 0 },
  prayerTime: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 600, color: 'var(--bento-sand-label)' },
  prayerQuote: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 600, lineHeight: 1.55, color: 'var(--bento-sand-ink-strong)', margin: '0 0 14px' },
  prayBtn: { height: 38, padding: '0 16px', borderRadius: 14, border: 'none', background: 'var(--bento-sand-icon)', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: 'var(--bento-sand)', cursor: 'pointer' },
  prayerCount: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, color: 'var(--bento-sand-label)' },
  prayerEmpty: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 500, color: 'var(--bento-sand-ink-mid)', margin: 0 },
  noteCard: { borderRadius: 24, background: 'var(--bento-card)', padding: 20, cursor: 'pointer' },
  noteAvatar: { width: 30, height: 30, borderRadius: 10, background: 'var(--bento-line)', fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, color: 'var(--bento-t3)', textAlign: 'center', lineHeight: '30px', flexShrink: 0 },
  noteTitle: { flex: 1, fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', margin: 0 },
  noteTime: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 600, color: 'var(--bento-t5)' },
  noteBody: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-t2)', margin: 0 },
  noteEmptyText: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  writeRow: {
    width: '100%', borderRadius: 24, background: 'rgba(255,255,255,.6)', padding: '18px 20px',
    display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
  },
  writeIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  writeTitle: { fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  writeSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  writeChevron: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)' },
  writeChooser: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 },
  writeChooserBtn: {
    width: '100%', textAlign: 'left', borderRadius: 16, background: 'var(--bento-card)', padding: '14px 18px',
    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)',
  },
}
