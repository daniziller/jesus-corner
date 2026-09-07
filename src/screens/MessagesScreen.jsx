// MessagesScreen.jsx — Mensagens (quadro 33b, ver
// handoff-comunidade-33/HANDOFF-33a-33b-comunidade.md), rota
// /comunidade/mensagens, página interna com voltar. Uma caixa só com o
// que chegou dos grupos — sala de capítulo, pedido de oração de grupo e
// discussão geral, unificados por get_group_messages (migration 0057,
// ver src/groups/messagesStore.js). Cada item diz quem escreveu e em que
// grupo — é o que resolve "badge sem contexto" que o handoff aponta.
import { useState, useEffect, useMemo } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getGroupMessages, getGroupMessagesSummary, markGroupMessagesRead } from '../groups/messagesStore'
import { getPendingRequests } from '../friends/friendsStore'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { formatRelativeTime } from '../utils/time'
import { BIBLE_BLOCKS } from '../data/bibleBlocks'

const FONT = 'var(--font-bento)'

// Mesmo padrão de bookLabel() já usado em StudiesScreen.jsx/NotesScreen.jsx
// — nome do livro em pt vem sempre assim do banco (get_group_messages),
// traduz pro nome em inglês só na hora de mostrar.
const BOOK_NAME_EN = Object.fromEntries(BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]])))

// Junta nomes com "e"/"and" (Bloco 8, mesmo espírito de weekRemainingNote
// em HomeDashboard.jsx antes de sair — "A, B e C", nunca só vírgulas).
function joinNames(names, lang) {
  if (names.length <= 1) return names[0] ?? ''
  const sep = lang === 'en' ? ' and ' : ' e '
  return `${names.slice(0, -1).join(', ')}${sep}${names[names.length - 1]}`
}

export default function MessagesScreen({ session, authUser, blocks, onBack, onOpenGroupRoom, onOpenGroup, onOpenFriends, onOpenBiblePassage }) {
  const { lang } = session
  const L = (k, vars) => t(`groups.${k}`, vars, lang)
  const bookLabel = book => (lang === 'en' ? (BOOK_NAME_EN[book] ?? book) : book)

  const [messages, setMessages] = useState([])
  const [summary, setSummary] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('new')
  const [marking, setMarking] = useState(false)

  function load() {
    setLoading(true)
    Promise.all([getGroupMessages(100), getGroupMessagesSummary(), getPendingRequests()])
      .then(([m, s, r]) => { setMessages(m); setSummary(s); setFriendRequests(r) })
      .catch(err => console.error('Failed to load messages', err))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleMarkRead() {
    if (marking) return
    setMarking(true)
    try {
      await markGroupMessagesRead()
      const now = new Date().toISOString()
      setMessages(prev => prev.map(m => ({ ...m, isRead: true })))
      setSummary(prev => prev.map(s => ({ ...s, unreadCount: 0 })))
    } catch (err) {
      console.error('Failed to mark messages read', err)
    } finally {
      setMarking(false)
    }
  }

  // Grupos com pelo menos 1 mensagem (lida ou não) — as abas de filtro,
  // além de "Novas". Ordem: quem tem mais não lida primeiro.
  const groupsWithMessages = useMemo(() => {
    const byId = new Map()
    for (const m of messages) {
      if (!byId.has(m.groupId)) byId.set(m.groupId, { groupId: m.groupId, groupName: m.groupName })
    }
    const unreadByGroup = Object.fromEntries(summary.map(s => [s.groupId, s.unreadCount]))
    return [...byId.values()].sort((a, b) => (unreadByGroup[b.groupId] ?? 0) - (unreadByGroup[a.groupId] ?? 0))
  }, [messages, summary])

  const unreadTotal = summary.reduce((sum, s) => sum + s.unreadCount, 0)

  // "Novas": só não lidas (+ pedidos de amizade, sempre "novos" enquanto
  // pendentes). Aba de um grupo: tudo daquele grupo, lida ou não.
  const shownMessages = filter === 'new'
    ? messages.filter(m => !m.isRead)
    : messages.filter(m => m.groupId === filter)
  const shownFriendRequests = filter === 'new' ? friendRequests : []

  // Mensagens seguidas do MESMO autor no MESMO grupo colapsam numa linha
  // só ("+ N mensagens depois desta") — só entre itens adjacentes na
  // lista já ordenada, nunca agrupando o que não está em sequência.
  const collapsedMessages = useMemo(() => {
    const out = []
    for (const m of shownMessages) {
      const prev = out[out.length - 1]
      if (prev && prev.authorId != null && prev.authorId === m.authorId && prev.groupId === m.groupId && prev.kind === m.kind) {
        prev.extraCount += 1
      } else {
        out.push({ ...m, extraCount: 0 })
      }
    }
    return out
  }, [shownMessages])

  // "Lidas antes de hoje" — um atalho por grupo com histórico, só na aba
  // "Novas" (numa aba de grupo específico a pessoa já está vendo tudo
  // daquele grupo, o atalho seria redundante).
  const archiveGroups = filter === 'new' ? summary.filter(s => s.totalCount > 0) : []

  function openMessage(m) {
    if (m.kind === 'sala_capitulo') {
      if (m.locked) { onOpenBiblePassage?.(m.contextBook, m.contextChapter); return }
      onOpenGroupRoom?.({ group: { groupId: m.groupId, name: m.groupName }, book: m.contextBook, bookEn: bookLabel(m.contextBook), chapter: m.contextChapter })
      return
    }
    onOpenGroup?.(m.groupId)
  }

  const isEmpty = !loading && messages.length === 0 && friendRequests.length === 0

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.title}>{L('messagesTitle')}</p>
          <p style={s.subtitle}>{L('messagesSubtitle', { n: unreadTotal, groups: groupsWithMessages.filter(g => (Object.fromEntries(summary.map(x => [x.groupId, x.unreadCount]))[g.groupId] ?? 0) > 0).length })}</p>
        </div>
        <button type="button" style={s.markReadBtn} onClick={handleMarkRead} disabled={marking || unreadTotal === 0}>
          {L('markAllRead')}
        </button>
      </div>

      <div style={s.filterRow}>
        <button type="button" style={{ ...s.filterPill, ...(filter === 'new' ? s.filterPillActive : {}) }} onClick={() => setFilter('new')}>
          {L('filterNew')}
        </button>
        {groupsWithMessages.map(g => (
          <button
            key={g.groupId}
            type="button"
            style={{ ...s.filterPill, ...(filter === g.groupId ? s.filterPillActive : {}) }}
            onClick={() => setFilter(g.groupId)}
          >
            {g.groupName}
          </button>
        ))}
      </div>

      <div style={s.list}>
        {isEmpty ? (
          <div style={s.emptyCard}>
            <p style={s.emptyTitle}>{L('messagesEmptyTitle')}</p>
            <p style={s.emptySub}>{L('messagesEmptySub')}</p>
          </div>
        ) : (
          <>
            {shownFriendRequests.length > 0 && (
              <div style={s.friendCard}>
                <span style={s.friendIcon}><AppIcon name="UserPlus" size={16} color="var(--bento-sand)" /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.friendNames}>{joinNames(shownFriendRequests.map(r => r.name), lang)}</p>
                  <p style={s.friendSub}>{L('wantsToFollowLabel')}</p>
                </div>
                <button type="button" style={s.friendSeeBtn} onClick={() => onOpenFriends?.()}>{L('seeAll')}</button>
              </div>
            )}

            {collapsedMessages.map(m => (
              <button key={m.id} type="button" style={s.msgCard} onClick={() => openMessage(m)}>
                <div style={s.msgHeadRow}>
                  <span style={s.msgAvatar}>
                    {m.authorAvatarUrl ? <img src={m.authorAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : avatarInitialsOf(m.authorName ?? L('anonymousAuthor'))}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.msgAuthor}>{m.authorName ?? L('anonymousAuthor')}</p>
                    <p style={s.msgContext}>
                      {m.kind === 'sala_capitulo'
                        ? L('messageContextRoom', { group: m.groupName, book: bookLabel(m.contextBook), chapter: m.contextChapter })
                        : L('messageContextGeneral', { group: m.groupName, place: L(m.kind === 'pedido_oracao' ? 'contextPrayer' : 'contextDiscussion') })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={s.msgTime}>{formatRelativeTime(m.createdAt, lang)}</span>
                    {!m.isRead && <span style={s.unreadDot} />}
                  </div>
                </div>
                <p style={s.msgBody}>
                  {m.kind === 'pedido_oracao'
                    ? L('prayerRequestEvent')
                    : m.locked
                      ? L('roomLockedBody', { book: bookLabel(m.contextBook), chapter: m.contextChapter })
                      : (m.kind === 'sala_capitulo' || m.kind === 'geral') ? `"${m.body}"` : m.body}
                </p>
                {m.extraCount > 0 && <p style={s.msgMore}>{L('moreMessagesAfter', { n: m.extraCount })}</p>}
              </button>
            ))}

            {archiveGroups.map(g => (
              <button key={g.groupId} type="button" style={s.archiveCard} onClick={() => onOpenGroup?.(g.groupId)}>
                <span style={s.archiveIcon}>{avatarInitialsOf(g.groupName)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.archiveTitle}>{L('readBeforeToday')}</p>
                  <p style={s.archiveSub}>{L('archiveGroupCount', { group: g.groupName, n: g.totalCount })}</p>
                </div>
                <span style={s.archiveChevron}>›</span>
              </button>
            ))}
          </>
        )}
      </div>

      <div style={s.footerWrap}>
        <div style={s.footerCard}>
          <span style={s.footerIcon}><AppIcon name="Info" size={14} color="var(--bento-t3)" /></span>
          <p style={s.footerText}>{L('messagesFooterNote')}</p>
        </div>
      </div>
    </div>
  )
}

const s = {
  screen: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bento-bg)' },
  header: { flex: 'none', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '22px 20px 12px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },
  subtitle: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  markReadBtn: { flexShrink: 0, border: 'none', background: 'none', padding: '6px 0 0', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  filterRow: { flex: 'none', display: 'flex', gap: 6, padding: '0 20px 12px', overflowX: 'auto' },
  filterPill: { flexShrink: 0, border: 'none', background: 'var(--bento-card)', borderRadius: 99, padding: '9px 13px', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  filterPillActive: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },

  list: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 },

  emptyCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '28px 20px', textAlign: 'center' },
  emptyTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-t3)', margin: '0 0 6px' },
  emptySub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },

  msgCard: { border: 'none', background: '#fff', borderRadius: 24, padding: '16px 18px', textAlign: 'left', cursor: 'pointer' },
  msgHeadRow: { display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 10 },
  msgAvatar: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-sand)', color: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 800, overflow: 'hidden' },
  msgAuthor: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 2px' },
  msgContext: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t3)', margin: 0 },
  msgTime: { fontFamily: FONT, fontSize: 10, fontWeight: 600, color: 'var(--bento-t5)' },
  unreadDot: { width: 8, height: 8, borderRadius: 99, background: 'var(--bento-accent)' },
  msgBody: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-ink)', margin: 0, textWrap: 'pretty', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  msgMore: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-t3)', margin: '8px 0 0' },

  friendCard: { display: 'flex', alignItems: 'center', gap: 12, borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px' },
  friendIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  friendNames: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: '0 0 2px' },
  friendSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'var(--bento-sand-label)', margin: 0 },
  friendSeeBtn: { flexShrink: 0, height: 32, padding: '0 13px', borderRadius: 12, border: 'none', background: 'var(--bento-sand-icon)', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: 'var(--bento-sand)', cursor: 'pointer' },

  archiveCard: { display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: '#fff', opacity: 0.72, borderRadius: 24, padding: '16px 18px', textAlign: 'left', cursor: 'pointer' },
  archiveIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-line)', color: 'var(--bento-t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 800 },
  archiveTitle: { fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  archiveSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  archiveChevron: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },

  footerWrap: { flex: 'none', padding: '10px 20px calc(var(--nav-height) + 14px)' },
  footerCard: { display: 'flex', alignItems: 'center', gap: 12, borderRadius: 20, background: '#fff', padding: '14px 18px' },
  footerIcon: { width: 30, height: 30, flexShrink: 0, borderRadius: 11, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  footerText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
}
