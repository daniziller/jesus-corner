// GrupoConversa.jsx — a conversa de um grupo: o aviso fixado, os recados
// fixados, os demais do mais novo pro mais antigo e, embaixo, o campo de
// escrever. Cada recado tem o coração e um botão de "mais opções" que
// guarda fixar/desafixar, apagar e denunciar (commentActions, em
// comunidadeMath.js, decide o que cada pessoa pode).
import { useEffect, useState } from 'react'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'
import Cabecalho from './Cabecalho'
import FolhaDeConfirmacao from '../FolhaDeConfirmacao'
import FolhaInferior from '../FolhaInferior'
import ReportMessageSheet from '../ReportMessageSheet'
import { e, Esqueleto } from './estilos'
import { avatarInitialsOf } from '../../utils/avatarInitials'
import { formatRelativeTime } from '../../utils/time'
import { getComments, postComment, deleteComment, toggleCommentLike, setCommentPinned } from '../../groups/commentsStore'
import { reportGroupMessage } from '../../groups/reportsStore'
import { plural, talkLists, commentActions, toggleLike } from '../../comunidade/comunidadeMath'

const realApi = { list: getComments, post: postComment, remove: deleteComment, like: toggleCommentLike, pin: setCommentPinned, report: reportGroupMessage }
const ACTION = {
  pin: { icon: 'Pin', label: 'pin' },
  unpin: { icon: 'Pin', label: 'unpin' },
  delete: { icon: 'Trash2', label: 'delete' },
  report: { icon: 'CircleAlert', label: 'report' },
}

export default function GrupoConversa({ lang, groupId, groupName, members, isModerator, myUserId, pinnedNotice, onBack, api = realApi }) {
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const [comments, setComments] = useState(null)
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState(null)
  const [menuFor, setMenuFor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [reporting, setReporting] = useState(null)

  function reload() {
    return api.list(groupId).then(setComments).catch(err => { console.error('[grupo] recados', err); setComments(list => list ?? []) })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, [groupId])

  async function submit(ev) {
    ev.preventDefault()
    if (!body.trim() || posting) return
    setPosting(true)
    setError(null)
    try {
      await api.post(groupId, body)
      setBody('')
      await reload()
    } catch (err) {
      // Inclui o membro silenciado: o banco recusa e a tela avisa.
      console.error('[grupo] publicar', err)
      setError('postFailed')
    } finally {
      setPosting(false)
    }
  }

  // Otimista: muda na tela e grava; se a gravação falhar, volta.
  function like(comment) {
    setComments(list => toggleLike(list, comment.id))
    api.like(comment.id).catch(err => { console.error('[grupo] curtir', err); setComments(list => toggleLike(list, comment.id)) })
  }

  async function run(action, comment) {
    setMenuFor(null)
    if (action === 'delete') { setDeleting(comment); return }
    if (action === 'report') { setReporting(comment); return }
    setError(null)
    try {
      await api.pin(comment.id, action === 'pin')
      await reload()
    } catch (err) {
      console.error('[grupo] fixar', err)
      setError('pinFailed')
    }
  }

  const lists = talkLists(comments)
  const moderators = new Set(members.filter(m => m.role === 'moderator').map(m => m.userId))
  const nameOf = c => (c.anonymous ? L('anonymous') : c.userId === myUserId ? L('you') : c.authorName)

  const card = c => (
    <article key={c.id} style={s.card} data-recado={c.id}>
      <div style={s.head}>
        <span aria-hidden="true" style={{ ...e.avatar, ...(c.userId === myUserId && !c.anonymous ? s.avatarMine : null) }}>{avatarInitialsOf(c.anonymous ? L('anonymous') : c.authorName).slice(0, 1)}</span>
        <p style={e.author}>{nameOf(c)} <span style={e.when}>· {formatRelativeTime(c.createdAt, lang)}</span></p>
        {/* Quem saiu do grupo vira "Anônimo" — e perde o selo, que entregaria quem é. */}
        {!c.anonymous && moderators.has(c.userId) && <span style={e.badge}>{L('moderator')}</span>}
      </div>
      <p style={s.body}>{c.body}</p>
      <div style={s.foot}>
        <button type="button" style={{ ...s.like, ...(c.likedByMe ? { color: 'var(--bento-now-text)' } : null) }} onClick={() => like(c)} aria-pressed={c.likedByMe} aria-label={L(c.likeCount === 1 ? 'likeAriaOne' : 'likeAriaMany', { n: c.likeCount })}>
          <AppIcon name="Heart" size={16} strokeWidth={2.2} color={c.likedByMe ? 'var(--bento-accent)' : 'var(--bento-t2)'} fill={c.likedByMe ? 'var(--bento-accent)' : 'none'} />
          {c.likeCount}
        </button>
        <button type="button" style={s.more} onClick={() => setMenuFor(c)} aria-label={L('moreAria', { name: nameOf(c) })}>
          <AppIcon name="MoreHorizontal" size={18} strokeWidth={2.2} color="var(--bento-t2)" />
        </button>
      </div>
    </article>
  )

  return (
    <div style={e.screen} data-comunidade="conversa">
      <Cabecalho lang={lang} title={L('talkTitle')} sub={comments ? `${groupName} · ${t(plural('community.notes', comments.length).key, { n: comments.length }, lang)}` : groupName} onBack={onBack} />
      <div style={{ ...e.body, ...e.bodyWithFooter }}>
        {(pinnedNotice ?? '').trim() && (
          <section aria-label={L('pinnedNotice')} style={{ ...e.sandCard, display: 'flex', gap: 12, alignItems: 'flex-start' }} data-conversa="aviso">
            <span aria-hidden="true" style={s.noticeIcon}><AppIcon name="Bookmark" size={16} strokeWidth={2.2} color="var(--bento-sand)" /></span>
            <div>
              <p style={{ ...e.sandLabel, marginBottom: 5 }}>{L('pinnedNotice')}</p>
              <p style={s.notice}>{pinnedNotice}</p>
            </div>
          </section>
        )}
        {comments === null && <Esqueleto heights={[150, 150, 150]} />}
        {comments && comments.length === 0 && <section style={e.card}><p style={e.empty}>{L('talkEmpty')}</p></section>}
        {lists.pinned.length > 0 && <h2 style={e.label}>{L('pinnedLabel')}</h2>}
        {lists.pinned.map(card)}
        {lists.pinned.length > 0 && lists.regular.length > 0 && <h2 style={e.label}>{L('notesLabel')}</h2>}
        {lists.regular.map(card)}
      </div>

      <form onSubmit={submit} style={{ ...e.footer, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {error && <p style={e.error} role="alert">{L(error)}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={s.field}>
            <span style={s.hidden}>{L('writeNoteLabel')}</span>
            <input className="passo-campo" style={s.input} value={body} onChange={ev => setBody(ev.target.value)} placeholder={L('talkPlaceholder')} maxLength={2000} />
          </label>
          <button type="submit" style={{ ...s.send, ...(body.trim() && !posting ? null : { opacity: 0.45 }) }} disabled={!body.trim() || posting} aria-label={L('publish')}>
            <AppIcon name="ArrowUp" size={18} strokeWidth={2.4} color="var(--bento-ink)" />
          </button>
        </div>
      </form>

      {menuFor && (
        <FolhaInferior onClose={() => setMenuFor(null)} labelledBy="opcoes-do-recado" fixed>
          <h2 style={e.sheetTitle} id="opcoes-do-recado">{L('moreTitle', { name: nameOf(menuFor) })}</h2>
          {commentActions(menuFor, { myUserId, isModerator, pinnedCount: lists.pinned.length }).map((action, i, all) => (
            <button key={action} type="button" style={{ ...e.sheetRow, ...(i === all.length - 1 ? e.rowLast : null) }} onClick={() => run(action, menuFor)} data-acao={action}>
              <AppIcon name={ACTION[action].icon} size={18} strokeWidth={2.1} color="var(--bento-ink)" />
              {L(ACTION[action].label)}
            </button>
          ))}
        </FolhaInferior>
      )}
      {deleting && (
        <FolhaDeConfirmacao
          lang={lang} title={L('deleteNoteTitle')} text={L('deleteNoteText')} confirmLabel={L('delete')} cancelLabel={L('keep')}
          onClose={() => setDeleting(null)} onConfirm={async () => { await api.remove(deleting.id); setDeleting(null); await reload() }}
        />
      )}
      {reporting && (
        <ReportMessageSheet
          lang={lang} reportedUserName={reporting.anonymous ? L('anonymous') : reporting.authorName} onClose={() => setReporting(null)}
          onSubmit={(reason, reasonDetail) => api.report({ groupId, messageKind: 'comment', messageId: reporting.id, reportedUserId: reporting.userId, messageSnapshot: reporting.body, reason, reasonDetail })}
        />
      )}
    </div>
  )
}

const s = {
  card: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px 6px', display: 'flex', flexDirection: 'column', gap: 10 },
  head: { display: 'flex', alignItems: 'center', gap: 10 },
  avatarMine: { background: 'var(--bento-ink)', color: '#fff' },
  body: { fontFamily: e.font, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-quote-ink)', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  foot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  like: { minWidth: 44, height: 44, border: 'none', background: 'none', padding: '0 6px 0 0', fontFamily: e.font, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-t2)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  more: { width: 44, height: 44, border: 'none', background: 'none', padding: 0, marginRight: -10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  noticeIcon: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  notice: { fontFamily: e.font, fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: 'var(--bento-sand-ink-strong)', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  field: { flex: 1, minWidth: 0, height: 52, borderRadius: 18, background: 'var(--bento-card)', padding: '0 16px', display: 'flex', alignItems: 'center' },
  input: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: e.font, fontSize: 14, fontWeight: 600, color: 'var(--bento-ink)' },
  send: { width: 52, height: 52, flexShrink: 0, border: 'none', borderRadius: 18, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  hidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' },
}
