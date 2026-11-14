// ComunidadeRaiz.jsx — a tela inicial da aba Comunidade (redesenho de
// 2026-11): perfil, novidades, "esperando você", meus grupos, meus amigos
// e criar/entrar. Sem grupo nenhum, vira a tela de primeira vez (convite
// pra criar um grupo, as outras formas de começar e o que os outros veem).
//
// Só desenha: os dados chegam prontos de GroupsScreen.jsx e as contas
// (quem aparece, em que ordem, que frase) são de comunidadeMath.js.
import { useState } from 'react'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'
import CartaoDePerfil from './CartaoDePerfil'
import { avatarInitialsOf } from '../../utils/avatarInitials'
import { bookNameFor } from '../../utils/progress'
import { plural, sinceMonth, profileStats, newsCard, waitingItems, groupRowSub, groupRows, friendTiles } from '../../comunidade/comunidadeMath'

const FONT = 'var(--font-bento)'
// As cores dos amigos sem foto, em rodízio.
const FRIEND_TONES = ['var(--bento-accent)', 'var(--bento-sand)', 'var(--bento-mark)', 'var(--bento-select)']

export default function ComunidadeRaiz({
  session, authUser, avatarUrl, onAvatarChange, photoApi,
  loaded, groups, memberCounts, messagesSummary, messages, planInvites, groupInvites, friendRequests, friends,
  onOpenMessages, onOpenProfile, onOpenGroup, onOpenFriends, onCreateGroup, onJoinWithCode, onAnswer,
}) {
  const { lang } = session
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const say = piece => t(piece.key, piece.vars, lang)
  const [showAll, setShowAll] = useState(false)

  const news = newsCard(messagesSummary, messages)
  const waiting = waitingItems({ planInvites, groupInvites, friendRequests })
  const list = groupRows(groups, messagesSummary, showAll)
  const row = friendTiles(friends)
  const empty = loaded && groups.length === 0
  const unread = news?.unread ?? 0

  const since = sinceMonth(session.dailyRoutine)
  const monthName = since ? new Date(since.year, since.month - 1, 1).toLocaleDateString(lang === 'en' ? 'en' : 'pt-BR', { month: 'long' }) : null
  const days = session.weeklyGoalDays ?? 5
  const facts = [...(monthName ? [L('since', { month: monthName })] : []), say(plural('community.daysPerWeek', days))]

  return (
    <div style={s.screen} data-comunidade="raiz">
      <header style={s.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={s.title}>{L('title')}</h1>
          {empty && <p style={s.subtitle}>{L('emptySubtitle')}</p>}
        </div>
        <button type="button" style={s.headerBtn} onClick={onOpenMessages} aria-label={unread > 0 ? say(plural('community.messagesAria', unread)) : L('messagesAriaNone')}>
          <AppIcon name="Bell" size={18} strokeWidth={2} color="var(--bento-ink)" />
          {unread > 0 && <span style={s.headerBadge}>{unread > 99 ? '99+' : unread}</span>}
        </button>
        {empty && (
          <button type="button" style={{ ...s.headerBtn, ...s.headerAvatar }} onClick={onOpenProfile} aria-label={L('myProfile')}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={s.headerAvatarImg} /> : session.avatarInitials}
          </button>
        )}
      </header>

      <div style={s.body}>
        {!loaded && <Skeleton />}

        {loaded && !empty && (
          <CartaoDePerfil
            lang={lang} name={(authUser?.name ?? '').trim() || session.userName} initials={session.avatarInitials}
            avatarUrl={avatarUrl} onAvatarChange={onAvatarChange} photoApi={photoApi} facts={facts}
            stats={profileStats({ groups: groups.length, friends: friends.length, weeksInGoal: session.weeksInGoal, biblePercent: session.biblePercent })}
            onOpenProfile={onOpenProfile}
          />
        )}

        {loaded && news && (
          <section aria-label={L('newsLabel')} style={s.news} data-comunidade="novidades">
            <p style={s.newsLabel}>{L('newsLabel')}</p>
            <div>
              <p style={s.newsTitle}>{say(plural('community.newsTitle', news.unread))}</p>
              <p style={s.newsSub}>{say(plural('community.newsGroups', news.groups))}</p>
            </div>
            {news.preview && (
              <div style={s.newsPreview}>
                <p style={s.newsFrom}>{[news.preview.author ?? L('anonymous'), news.preview.group, previewContext(news.preview, lang)].join(' · ')}</p>
                <p style={s.newsBody}>“{news.preview.body}”</p>
              </div>
            )}
            <button type="button" style={s.newsBtn} onClick={onOpenMessages}>
              {L('newsOpen')}
              <AppIcon name="ArrowRight" size={16} strokeWidth={2.4} color="var(--bento-ink)" />
            </button>
          </section>
        )}

        {loaded && waiting.length > 0 && <Waiting lang={lang} items={waiting} onAnswer={onAnswer} />}

        {empty && (
          <>
            <section style={s.hero} data-comunidade="primeira-vez">
              <p style={s.newsLabel}>{L('emptyLabel')}</p>
              <p style={s.heroTitle}>{L('emptyTitle')}</p>
              <p style={s.heroText}>{L('emptyText')}</p>
              <button type="button" style={{ ...s.newsBtn, height: 52, borderRadius: 17, fontSize: 14.5 }} onClick={onCreateGroup}>
                {L('emptyCreate')}
                <AppIcon name="ArrowRight" size={16} strokeWidth={2.4} color="var(--bento-ink)" />
              </button>
            </section>
            <JoinWithCode lang={lang} onJoin={onJoinWithCode} asRow onOpenFriends={onOpenFriends} />
            <section style={s.privacy}>
              <span aria-hidden="true" style={s.privacyIcon}><AppIcon name="Lock" size={16} strokeWidth={2.2} color="var(--bento-sand)" /></span>
              <div>
                <p style={s.privacyTitle}>{L('privacyTitle')}</p>
                <p style={s.privacyText}>{L('privacyText')}</p>
              </div>
            </section>
          </>
        )}

        {loaded && !empty && (
          <>
            <div style={s.labelRow}>
              <h2 style={s.label}>{L('groupsLabel')}</h2>
              {list.hidden > 0 && <button type="button" style={s.labelLink} onClick={() => setShowAll(v => !v)}>{L(showAll ? 'seeLess' : 'seeAll')}</button>}
            </div>
            <section aria-label={L('groupsLabel')} style={s.listCard} data-comunidade="grupos">
              {list.rows.map((g, i) => (
                <button key={g.groupId} type="button" style={{ ...s.row, ...(i === list.rows.length - 1 ? s.rowLast : null) }} onClick={() => onOpenGroup(g.groupId)} data-grupo={g.groupId}>
                  <span aria-hidden="true" style={{ ...s.groupAvatar, ...(g.unread > 0 ? null : s.groupAvatarQuiet) }}>{avatarInitialsOf(g.name)}</span>
                  <span style={s.rowText}>
                    <span style={s.rowTitle}>{g.name}</span>
                    <span style={s.rowSub}>{groupRowSub(g, memberCounts[g.groupId]).map(say).join(' · ')}</span>
                  </span>
                  {g.unread > 0
                    ? <span style={s.unread} aria-label={say(plural('community.newsTitle', g.unread))}>{g.unread > 99 ? '99+' : g.unread}</span>
                    : <AppIcon name="ChevronRight" size={15} strokeWidth={2.4} color="var(--bento-t2)" />}
                </button>
              ))}
            </section>
          </>
        )}

        {loaded && (!empty || row.total > 0) && (
          <>
            <div style={s.labelRow}>
              <h2 style={s.label}>{L('friendsLabel')}</h2>
              {row.total > 0 && <button type="button" style={s.labelLink} onClick={onOpenFriends}>{say(plural('community.friendsSee', row.total))}</button>}
            </div>
            <section aria-label={L('friendsLabel')} style={s.friends} data-comunidade="amigos">
              <button type="button" style={s.friend} onClick={onOpenFriends} aria-label={L('addFriendAria')}>
                <span aria-hidden="true" style={{ ...s.friendAvatar, ...s.friendAdd }}><AppIcon name="Plus" size={18} strokeWidth={2.4} color="var(--bento-ink)" /></span>
                <span style={{ ...s.friendName, fontWeight: 700, color: 'var(--bento-ink)' }}>{L('addFriend')}</span>
              </button>
              {row.tiles.map((f, i) => (
                <button key={f.id} type="button" style={s.friend} onClick={onOpenFriends} aria-label={f.fullName}>
                  <span aria-hidden="true" style={{ ...s.friendAvatar, background: FRIEND_TONES[i % FRIEND_TONES.length] }}>
                    {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={s.friendImg} /> : avatarInitialsOf(f.fullName).slice(0, 1)}
                  </span>
                  <span style={s.friendName}>{f.name}</span>
                </button>
              ))}
            </section>
          </>
        )}

        {loaded && !empty && <JoinWithCode lang={lang} onJoin={onJoinWithCode} onCreateGroup={onCreateGroup} />}
      </div>
    </div>
  )
}

// "sala de João 3", "pedidos de oração" ou "conversa": de onde veio a mensagem.
function previewContext(preview, lang) {
  if (preview.kind === 'sala_capitulo' && preview.book) return t('community.newsRoom', { ref: `${bookNameFor(preview.book, lang)} ${preview.chapter}` }, lang)
  return t(preview.kind === 'pedido_oracao' ? 'community.newsPrayer' : 'community.newsTalk', undefined, lang)
}

function Skeleton() {
  return (
    <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-comunidade="carregando">
      {[168, 190, 200].map(h => <div key={h} className="rb-context-skeleton" style={{ height: h, borderRadius: 24, background: 'var(--bento-line)' }} />)}
    </div>
  )
}

// Convites e pedidos que esperam resposta. Cada linha some ao responder;
// se a resposta não for gravada, a linha fica e a tela avisa.
function Waiting({ lang, items, onAnswer }) {
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const [busy, setBusy] = useState(null)
  const [failed, setFailed] = useState(false)

  async function answer(item, accept) {
    setBusy(item.id)
    setFailed(false)
    try {
      await onAnswer(item, accept)
    } catch (err) {
      console.error('[comunidade] responder', err)
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-label={L('waitingLabel', { n: items.length })} style={s.waiting} data-comunidade="esperando">
      <p style={s.waitingLabel}>{L('waitingLabel', { n: items.length })}</p>
      {items.map((item, i) => {
        const title = lang === 'en' && item.titleEn ? item.titleEn : item.title
        return (
          <div key={item.id} style={{ ...s.waitingRow, ...(i === items.length - 1 ? s.rowLast : null) }} data-espera={item.kind}>
            <span aria-hidden="true" style={{ ...s.waitingAvatar, borderRadius: item.kind === 'friend' ? 99 : 13 }}>
              {item.avatarUrl ? <img src={item.avatarUrl} alt="" style={s.friendImg} />
                : item.kind === 'plan' ? <AppIcon name="BookOpen" size={16} strokeWidth={2.1} color="var(--bento-sand)" /> : avatarInitialsOf(item.title)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.waitingTitle}>{title}</p>
              <p style={s.waitingSub}>{t(item.sub.key, item.sub.vars, lang)}</p>
            </div>
            <button type="button" style={s.decline} disabled={busy === item.id} onClick={() => answer(item, false)} aria-label={L('declineAria', { title })}>
              <AppIcon name="X" size={16} strokeWidth={2.4} color="var(--bento-sand-ink-strong)" />
            </button>
            <button type="button" style={s.accept} disabled={busy === item.id} onClick={() => answer(item, true)} aria-label={L('acceptAria', { title })}>
              <AppIcon name="Check" size={16} strokeWidth={2.6} color="#fff" />
            </button>
          </div>
        )
      })}
      {failed && <p style={s.waitingError} role="alert">{L('answerFailed')}</p>}
    </section>
  )
}

// "Criar grupo" e "Entrar com código". Entrar não é na hora: o código vira
// um pedido que um moderador do grupo aprova. `asRow`: na tela de primeira
// vez, em linhas de um cartão (com "Adicionar um amigo") no lugar dos dois
// quadros.
function JoinWithCode({ lang, onJoin, onCreateGroup, onOpenFriends, asRow = false }) {
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { ok, text }

  async function submit(e) {
    e.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setMessage(null)
    try {
      const groupName = await onJoin(code)
      setMessage({ ok: true, text: L('joinSent', { group: groupName }) })
      setCode('')
      setOpen(false)
    } catch (err) {
      setMessage({ ok: false, text: L(err.message === 'invalid_code' ? 'joinInvalid' : err.message === 'already_in_group' ? 'joinAlready' : 'joinFailed') })
    } finally {
      setBusy(false)
    }
  }
  const toggle = () => { setOpen(v => !v); setMessage(null) }

  return (
    <>
      {asRow ? (
        <section style={s.listCard}>
          <button type="button" style={{ ...s.row, minHeight: 66 }} onClick={toggle} aria-expanded={open} data-comunidade="entrar">
            <span aria-hidden="true" style={s.rowIcon}><AppIcon name="Ticket" size={18} strokeWidth={2.1} color="var(--bento-ink)" /></span>
            <span style={s.rowText}><span style={s.rowTitle}>{L('joinTitle')}</span><span style={s.rowSub}>{L('emptyJoinSub')}</span></span>
            <AppIcon name="ChevronRight" size={15} strokeWidth={2.4} color="var(--bento-t2)" />
          </button>
          <button type="button" style={{ ...s.row, ...s.rowLast, minHeight: 66 }} onClick={onOpenFriends}>
            <span aria-hidden="true" style={s.rowIcon}><AppIcon name="UserPlus" size={18} strokeWidth={2.1} color="var(--bento-ink)" /></span>
            <span style={s.rowText}><span style={s.rowTitle}>{L('emptyFriendTitle')}</span><span style={s.rowSub}>{L('emptyFriendSub')}</span></span>
            <AppIcon name="ChevronRight" size={15} strokeWidth={2.4} color="var(--bento-t2)" />
          </button>
        </section>
      ) : (
        <div style={s.tiles}>
          <button type="button" style={{ ...s.tile, background: 'var(--bento-sand)', color: 'var(--bento-sand-ink-strong)' }} onClick={onCreateGroup} data-comunidade="criar">
            <AppIcon name="Users" size={18} strokeWidth={2.2} color="var(--bento-sand-icon)" />
            <span style={s.tileTitle}>{L('createTitle')}</span>
            <span style={{ ...s.tileSub, color: 'var(--bento-sand-ink)' }}>{L('createSub')}</span>
          </button>
          <button type="button" style={s.tile} onClick={toggle} aria-expanded={open} data-comunidade="entrar">
            <AppIcon name="Ticket" size={18} strokeWidth={2.2} color="var(--bento-ink)" />
            <span style={s.tileTitle}>{L('joinTitle')}</span>
            <span style={s.tileSub}>{L('joinSub')}</span>
          </button>
        </div>
      )}
      {open && (
        <form onSubmit={submit} style={s.joinForm}>
          <label style={s.joinField}>
            <span style={s.hidden}>{L('joinTitle')}</span>
            <input className="passo-campo" style={s.joinInput} value={code} onChange={e => setCode(e.target.value)} placeholder={L('joinPlaceholder')} autoFocus autoCapitalize="characters" autoComplete="off" />
          </label>
          <button type="submit" style={{ ...s.joinBtn, ...(code.trim() && !busy ? null : { opacity: 0.45 }) }} disabled={!code.trim() || busy}>{busy ? L('joinWorking') : L('joinSubmit')}</button>
        </form>
      )}
      {message && <p style={{ ...s.joinMessage, color: message.ok ? 'var(--bento-t2)' : 'var(--bento-now-text)' }} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}
    </>
  )
}

const s = {
  screen: { minHeight: '100%', background: 'var(--bento-bg)', fontFamily: FONT, color: 'var(--bento-ink)' },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '22px 20px 0' },
  title: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: 0 },
  subtitle: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t2)', margin: '4px 0 0' },
  headerBtn: { position: 'relative', width: 44, height: 44, flexShrink: 0, border: 'none', padding: 0, borderRadius: 14, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerBadge: { position: 'absolute', top: -4, right: -4, minWidth: 19, height: 19, boxSizing: 'border-box', padding: '0 5px', borderRadius: 99, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: '19px', textAlign: 'center' },
  headerAvatar: { background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', overflow: 'hidden' },
  headerAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  body: { padding: '16px 20px calc(var(--nav-height) + 20px)', display: 'flex', flexDirection: 'column', gap: 10 },

  news: { borderRadius: 26, background: 'var(--bento-ink)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  newsLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  newsTitle: { fontFamily: FONT, fontSize: 23, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.8px', color: '#fff', margin: 0 },
  newsSub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.7)', margin: '5px 0 0' },
  newsPreview: { borderRadius: 16, background: 'rgba(255,255,255,.09)', padding: '12px 14px' },
  newsFrom: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.7)', margin: '0 0 5px' },
  newsBody: { fontFamily: FONT, fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: '#fff', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  newsBtn: { height: 48, border: 'none', borderRadius: 16, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },

  waiting: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px 8px' },
  waitingLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-sand-ink)', margin: '0 0 6px' },
  waitingRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--bento-sand-line)' },
  waitingAvatar: { width: 38, height: 38, flexShrink: 0, overflow: 'hidden', background: 'var(--bento-sand-icon)', color: 'var(--bento-sand)', fontFamily: FONT, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  waitingTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  waitingSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-sand-ink)', margin: '2px 0 0' },
  decline: { width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 14, background: 'var(--bento-sand-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  accept: { width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 14, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  waitingError: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-now-text)', margin: '4px 0 8px' },

  hero: { borderRadius: 26, background: 'var(--bento-ink)', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 },
  heroTitle: { fontFamily: FONT, fontSize: 24, fontWeight: 800, lineHeight: 1.12, letterSpacing: '-.9px', color: '#fff', margin: 0 },
  heroText: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: 'rgba(255,255,255,.72)', margin: 0 },
  privacy: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' },
  privacyIcon: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  privacyTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: '0 0 4px' },
  privacyText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },

  labelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 2px 0', minHeight: 20 },
  label: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t2)', margin: 0 },
  // 44px de toque num link pequeno: a área cresce pra cima e pra baixo sem empurrar nada.
  labelLink: { border: 'none', background: 'none', minHeight: 44, padding: '14px 2px 14px 14px', margin: '-15px 0', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-now-text)', cursor: 'pointer' },
  listCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '4px 18px' },
  row: { width: '100%', minHeight: 62, boxSizing: 'border-box', border: 'none', borderBottom: '1px solid var(--bento-line)', background: 'none', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: FONT, color: 'var(--bento-ink)', cursor: 'pointer' },
  rowLast: { borderBottom: 'none' },
  rowText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  rowTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t2)' },
  rowIcon: { width: 40, height: 40, flexShrink: 0, borderRadius: 14, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  groupAvatar: { width: 40, height: 40, flexShrink: 0, borderRadius: 14, background: 'var(--bento-ink)', color: '#fff', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  groupAvatarQuiet: { background: 'var(--bento-line)', color: 'var(--bento-ink)' },
  unread: { minWidth: 24, height: 24, boxSizing: 'border-box', padding: '0 7px', borderRadius: 99, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, lineHeight: '24px', textAlign: 'center' },

  friends: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 14px', display: 'flex', gap: 4 },
  friend: { flex: '0 0 20%', minWidth: 0, minHeight: 44, border: 'none', background: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, fontFamily: FONT, cursor: 'pointer' },
  friendAvatar: { width: 48, height: 48, boxSizing: 'border-box', borderRadius: 99, overflow: 'hidden', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  friendAdd: { border: '2px dashed var(--bento-t3)' },
  friendImg: { width: '100%', height: '100%', objectFit: 'cover' },
  friendName: { maxWidth: '100%', fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  tiles: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, paddingTop: 6 },
  tile: { border: 'none', borderRadius: 22, background: 'var(--bento-card)', padding: '14px 14px 13px', textAlign: 'left', fontFamily: FONT, color: 'var(--bento-ink)', display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' },
  tileTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 800 },
  tileSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-t2)' },
  joinForm: { display: 'flex', gap: 8 },
  joinField: { flex: 1, minWidth: 0, height: 50, borderRadius: 17, background: 'var(--bento-card)', padding: '0 15px', display: 'flex', alignItems: 'center' },
  joinInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: FONT, fontSize: 14, fontWeight: 600, color: 'var(--bento-ink)' },
  joinBtn: { height: 50, flexShrink: 0, border: 'none', borderRadius: 17, background: 'var(--bento-accent)', padding: '0 18px', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  joinMessage: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, margin: '0 2px' },
  hidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' },
}
