import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { BIBLE_BLOCKS, SESSIONS_BY_PLAN } from '../data/bibleBlocks'
import { computeBookChapterCounts } from '../utils/progress'
import { getFriends, getPendingRequests, respondToFriendRequest } from '../friends/friendsStore'
import {
  getMyGroups, getPendingGroupInvites, getGroupDetail, createGroup, respondToGroupInvite, leaveGroup,
  redeemGroupInviteCode, getGroupMemberCounts, leaveGroupWithNewModerator, deleteGroup,
} from '../groups/groupsStore'
import AddFriendsScreen from './AddFriendsScreen'
import CreateGroupSheet from '../components/CreateGroupSheet'
import { logActivity } from '../activity/activityStore'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { getGroupMessagesSummary, getGroupMessages } from '../groups/messagesStore'
import ComunidadeRaiz from '../components/comunidade/ComunidadeRaiz'
import GrupoInicio from '../components/comunidade/GrupoInicio'
import GrupoDesafio from '../components/comunidade/GrupoDesafio'
import GrupoOracao from '../components/comunidade/GrupoOracao'
import GrupoConversa from '../components/comunidade/GrupoConversa'
import GrupoPessoas from '../components/comunidade/GrupoPessoas'
import Cabecalho from '../components/comunidade/Cabecalho'
import FolhaDeConfirmacao from '../components/comunidade/FolhaDeConfirmacao'
import { leavePlan } from '../comunidade/comunidadeMath'

// Todos os 66 livros (pt/en), na mesma ordem/nomes usados em completed_keys
// — reaproveitado do mesmo dado que já alimenta a Jornada, pra montar o
// seletor de livros ao propor um desafio.
const ALL_BLOCKS_WITH_BOOKS = BIBLE_BLOCKS.map(b => ({ id: b.id, name: b.name, nameEn: b.nameEn, books: b.books, booksEn: b.booksEn }))
// Contagem de capítulos por livro independe do plano escolhido (o texto é
// sempre o mesmo) — usa o plano 'standard' só como fonte dos dados brutos.
const BOOK_CHAPTER_COUNTS = computeBookChapterCounts(SESSIONS_BY_PLAN.standard)

export default function GroupsScreen({ session, authUser, avatarUrl, onAvatarChange, pendingGroupPlanInvites, onRespondGroupPlanInvite, onSocialChange, onOpenGroupRoom, onOpenBiblePassage, onOpenMessages, onOpenProfile, entryTarget, onEntryTargetConsumed, onDetailOpenChange }) {
  const { lang, todaySession } = session
  const [myGroups, setMyGroups] = useState([])
  const [memberCounts, setMemberCounts] = useState({})
  const [groupInvites, setGroupInvites] = useState([])
  const [openGroupId, setOpenGroupId] = useState(null)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // Amigos e pedidos de amizade recebidos — a raiz mostra os primeiros
  // amigos numa fileira e deixa responder aos pedidos ali mesmo.
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  // Mensagens dos grupos: o resumo por grupo (selo de cada linha e o sino)
  // e as mais recentes, pro trecho do cartão de novidades (ver
  // messagesStore.js e newsCard em comunidadeMath.js).
  const [messagesSummary, setMessagesSummary] = useState([])
  const [messages, setMessages] = useState([])
  // Enquanto os grupos não chegam, a raiz mostra o esqueleto — sem isso a
  // tela de "primeira vez" piscava pra quem já tem grupo.
  const [loaded, setLoaded] = useState(false)

  function reload() {
    setReloadKey(k => k + 1)
    onSocialChange?.()
  }

  useEffect(() => {
    getMyGroups().then(groups => {
      setMyGroups(groups)
      if (groups.length) getGroupMemberCounts(groups.map(g => g.groupId)).then(setMemberCounts).catch(() => {})
    }).catch(err => console.error('Failed to load groups', err)).finally(() => setLoaded(true))
    getPendingGroupInvites().then(setGroupInvites).catch(err => console.error('Failed to load group invites', err))
    getFriends().then(setFriends).catch(() => {})
    getPendingRequests().then(setFriendRequests).catch(() => {})
    getGroupMessagesSummary().then(setMessagesSummary).catch(() => {})
    getGroupMessages(20).then(setMessages).catch(() => {})
  }, [reloadKey])

  // Avisa o shell (App.jsx) se uma tela interna está aberta (um grupo ou
  // Amigos) — cada uma tem o seu cabeçalho, como a raiz.
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

  // "Esperando você": responder a um convite de plano do grupo, a um
  // convite para entrar num grupo ou a um pedido de amizade. O convite de
  // plano é diferente do de membro: a pessoa já é do grupo, só decide se
  // troca a leitura de hoje pelo plano que o moderador enviou (ver
  // App.jsx/respondToGroupPlanInvite — nunca troca sem essa decisão).
  async function answerWaiting(item, accept) {
    if (item.kind === 'plan') await onRespondGroupPlanInvite?.(item.ref, accept)
    else if (item.kind === 'group') {
      await respondToGroupInvite(item.ref, accept)
      if (accept) logActivity('joined_group', { groupName: item.title }).catch(err => console.error('Failed to log activity', err))
    } else await respondToFriendRequest(item.ref, accept)
    reload()
  }

  // Entrar num grupo pelo código de convite — não entra na hora: cria um
  // pedido que um moderador do grupo aprova depois. Devolve o nome do grupo.
  async function joinWithCode(code) {
    const { name } = await redeemGroupInviteCode(code)
    reload()
    return name
  }

  return (
    <div className="master-detail">
      {/* Master: a tela inicial da Comunidade (ComunidadeRaiz.jsx). */}
      <div className={`master-pane${detailOpen ? ' hide-on-mobile' : ''}`} style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', height: '100%', background: 'var(--bento-bg)' }}>
        <ComunidadeRaiz
          session={session} authUser={authUser} avatarUrl={avatarUrl} onAvatarChange={onAvatarChange}
          loaded={loaded} groups={myGroups} memberCounts={memberCounts} messagesSummary={messagesSummary} messages={messages}
          planInvites={pendingGroupPlanInvites} groupInvites={groupInvites} friendRequests={friendRequests} friends={friends}
          onOpenMessages={() => onOpenMessages?.()} onOpenProfile={() => onOpenProfile?.()} onOpenGroup={setOpenGroupId} onOpenFriends={() => setFriendsOpen(true)}
          onCreateGroup={() => setCreateSheetOpen(true)} onJoinWithCode={joinWithCode} onAnswer={answerWaiting}
        />
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
            readingMode={openGroup.readingMode}
            lang={lang}
            authUser={authUser}
            hasAI={session.hasAI}
            todaySession={todaySession}
            onOpenGroupRoom={onOpenGroupRoom}
            onOpenBiblePassage={onOpenBiblePassage}
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

/* ── Um grupo: a tela do grupo e as partes dele ── */
// Abrir um grupo cai na tela do grupo (GrupoInicio.jsx); Oração, Conversa,
// Desafio e Pessoas abrem a partir dos quadros dela. Sair do grupo passa
// por uma folha de confirmação — e, para a única moderadora, por escolher
// quem assume (ver leavePlan em comunidadeMath.js).
function GroupDetailView({ groupId, groupName, readingMode, lang, authUser, hasAI, todaySession, onOpenGroupRoom, onOpenBiblePassage, onBack, onLeft }) {
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  // 'home' | 'challenge' | 'prayer' | 'writePrayer' | 'talk' | 'people' | 'invite' | 'leaveModerator'
  const [view, setView] = useState('home')
  const [detail, setDetail] = useState(null)
  const [detailLoadError, setDetailLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // A confirmação aberta: { kind: 'leave' | 'delete' | 'hand', member? }.
  const [confirming, setConfirming] = useState(null)

  function reload() { setReloadKey(k => k + 1) }

  useEffect(() => {
    setDetailLoadError(false)
    // Grupo que não existe mais (ou falha de rede): a tela avisa e deixa
    // tentar de novo — nunca fica em branco.
    getGroupDetail(groupId).then(found => { if (found) setDetail(found); else setDetailLoadError(true) }).catch(err => {
      console.error('Failed to load group detail', err)
      setDetailLoadError(true)
    })
  }, [groupId, reloadKey])

  const myMembership = detail?.members.find(m => m.userId === authUser?.id)
  const isModerator = myMembership?.role === 'moderator'
  const otherMembers = (detail?.members ?? []).filter(m => m.userId !== authUser?.id)

  // Quem sai sendo a única moderadora escolhe outra pessoa pra assumir, ou
  // apaga o grupo — nunca deixa o grupo sem moderador. Sem mais ninguém no
  // grupo, sair é apagar.
  function startLeaving() {
    const plan = leavePlan(detail.members, authUser?.id)
    if (plan === 'pickModerator') setView('leaveModerator')
    else setConfirming({ kind: plan === 'deleteGroup' ? 'delete' : 'leave' })
  }

  async function confirmLeaving() {
    if (confirming.kind === 'leave') await leaveGroup(groupId)
    else if (confirming.kind === 'delete') await deleteGroup(groupId)
    else await leaveGroupWithNewModerator(groupId, confirming.member.userId)
    onLeft()
  }

  const confirmation = confirming && (
    <FolhaDeConfirmacao
      lang={lang} onClose={() => setConfirming(null)} onConfirm={confirmLeaving}
      title={confirming.kind === 'leave' ? L('leaveTitle', { group: groupName }) : confirming.kind === 'delete' ? L('deleteTitle', { group: groupName }) : L('handTitle', { name: confirming.member.name })}
      text={confirming.kind === 'leave' ? L('leaveText') : confirming.kind === 'delete' ? L(otherMembers.length === 0 ? 'deleteSoloText' : 'deleteText') : L('handText', { name: confirming.member.name })}
      keeps={confirming.kind === 'delete' ? null : L('leaveKeeps')}
      confirmLabel={L(confirming.kind === 'leave' ? 'leaveConfirm' : confirming.kind === 'delete' ? 'deleteConfirm' : 'handConfirm')}
      cancelLabel={L(confirming.kind === 'leave' ? 'leaveCancel' : confirming.kind === 'delete' ? 'deleteCancel' : 'handCancel')}
    />
  )

  if (detailLoadError) {
    return (
      <div style={styles.gScreen} data-comunidade="grupo-erro">
        <Cabecalho lang={lang} title={groupName} onBack={onBack} />
        <div style={styles.gCenter}>
          <p style={styles.gCenterText}>{L('groupLoadError')}</p>
          <button type="button" style={styles.gRetry} onClick={reload}>{L('retry')}</button>
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div style={styles.gScreen} data-comunidade="grupo-carregando">
        <Cabecalho lang={lang} title={groupName} onBack={onBack} />
        <div aria-hidden="true" style={styles.gBody}>
          {[236, 216, 150].map(h => <div key={h} className="rb-context-skeleton" style={{ height: h, flexShrink: 0, borderRadius: 24, background: 'var(--bento-line)' }} />)}
        </div>
      </div>
    )
  }

  if (view === 'leaveModerator') {
    return (
      <div style={styles.gScreen} data-comunidade="escolher-moderador">
        <Cabecalho lang={lang} title={L('pickTitle')} sub={L('pickSub')} onBack={() => setView('home')} />
        <div style={styles.gBody}>
          <p style={styles.gIntro}>{L('pickIntro')}</p>
          <div style={styles.gListCard}>
            {otherMembers.map((m, i) => (
              <button key={m.userId} type="button" style={{ ...styles.gRow, ...(i === otherMembers.length - 1 ? { borderBottom: 'none' } : null) }} onClick={() => setConfirming({ kind: 'hand', member: m })}>
                <span aria-hidden="true" style={styles.gAvatar}>{avatarInitialsOf(m.name).slice(0, 1)}</span>
                <span style={styles.gRowName}>{m.name}</span>
                <AppIcon name="ChevronRight" size={15} strokeWidth={2.4} color="var(--bento-t2)" />
              </button>
            ))}
          </div>
          <button type="button" style={styles.gTextBtn} onClick={() => setConfirming({ kind: 'delete' })}>{L('pickDelete')}</button>
        </div>
        {confirmation}
      </div>
    )
  }

  if (view === 'home') {
    return (
      <>
        <GrupoInicio
          lang={lang} groupId={groupId} groupName={groupName} readingMode={readingMode}
          members={detail.members} pinnedNotice={detail.pinnedNotice} todaySession={todaySession}
          myUserId={authUser?.id} chapterCounts={BOOK_CHAPTER_COUNTS}
          onBack={onBack}
          onInvite={() => setView('invite')}
          onOpen={setView}
          onWrite={part => setView(part === 'prayer' ? 'writePrayer' : 'talk')}
          onOpenRoom={target => onOpenGroupRoom?.(target)}
          onLeave={startLeaving}
        />
        {confirmation}
      </>
    )
  }

  const back = () => setView('home')
  const common = { lang, groupId, groupName, myUserId: authUser?.id, isModerator, onBack: back }
  if (view === 'challenge') return <GrupoDesafio {...common} chapterCounts={BOOK_CHAPTER_COUNTS} blocks={ALL_BLOCKS_WITH_BOOKS} onOpenBible={onOpenBiblePassage} />
  if (view === 'talk') return <GrupoConversa {...common} members={detail.members} pinnedNotice={detail.pinnedNotice} />
  if (view === 'people' || view === 'invite') return <GrupoPessoas {...common} members={detail.members} focusInvite={view === 'invite'} onChange={reload} />
  return <GrupoOracao {...common} authUser={authUser} hasAI={hasAI} startWriting={view === 'writePrayer'} />
}

const styles = {
  // Telas de dentro do grupo (erro, carregando, escolher quem assume a
  // moderação).
  gScreen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  gBody: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px calc(var(--nav-height) + 22px)', display: 'flex', flexDirection: 'column', gap: 10 },
  gCenter: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  gCenterText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t2)', textAlign: 'center', margin: 0 },
  gRetry: { height: 46, padding: '0 22px', border: 'none', borderRadius: 15, background: 'var(--bento-ink)', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  gIntro: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-quote-ink)', margin: '0 2px 4px' },
  gListCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '4px 18px' },
  gRow: { width: '100%', minHeight: 60, border: 'none', borderBottom: '1px solid var(--bento-line)', background: 'none', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' },
  gAvatar: { width: 38, height: 38, flexShrink: 0, borderRadius: 99, background: 'var(--bento-sand)', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  gRowName: { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  gTextBtn: { height: 48, flexShrink: 0, border: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 700, color: 'var(--bento-now-text)', cursor: 'pointer' },
}
