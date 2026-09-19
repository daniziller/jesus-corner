// PrayerRequestDetailScreen.jsx — detalhe de um pedido de oração, com
// comentários (pedido dela, 2026-09-19; ver migration 0070). Sem
// referência visual pronta pra isso (o handoff original proibia
// comentário) — desenhado seguindo os mesmos tokens/padrões do resto da
// feature (PrayerRequestCard.jsx, AddPrayerRequestSheet.jsx).
//
// Aberto a partir de PrayerRequestsScreen.jsx (PD1), nas duas abas —
// "Meus pedidos" e "Pedidos dos grupos". Reaproveita o mesmo card visual
// pro corpo do pedido (topo) e adiciona a lista de comentários + campo
// de novo comentário embaixo.
//
// Quem pode comentar: quem já pode VER o pedido (mesma regra de sempre —
// autor, membro do grupo se for de grupo, amigo do autor se for de
// amigos). O autor do comentário sempre aparece com nome, mesmo se o
// PEDIDO for anônimo — a anonimidade é do pedido, não de quem comenta.
//
// Apagar comentário: só mostra a opção pro autor do próprio comentário
// (o RLS também deixa o moderador do grupo apagar, mas isso exigiria
// saber se ela modera aquele grupo especificamente — sem essa
// informação à mão aqui, a ação fica de fora da UI por ora; decisão
// minha, avisada no PR).
import { useState, useEffect, useCallback } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { relativeTimeSpan } from '../prayer/prayerRequestFormat'
import {
  getPrayerRequestComments, addPrayerRequestComment, deletePrayerRequestComment, markPraying,
} from '../groups/prayerRequestsStore'

const FONT = 'var(--font-bento)'

export default function PrayerRequestDetailScreen({ session, request, onBack }) {
  const { lang } = session
  const L = (k, vars) => t(`prayerRequests.${k}`, vars, lang)
  const Ld = (k, vars) => t(`prayerRequestDetail.${k}`, vars, lang)

  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const [prayedToday, setPrayedToday] = useState(!!request.prayedToday)
  const [prayCount, setPrayCount] = useState(request.prayCount)

  const reload = useCallback(() => {
    setLoadError(false)
    getPrayerRequestComments(request.id)
      .then(list => { setComments(list); setLoading(false) })
      .catch(err => { console.error('Failed to load comments', err); setLoadError(true); setLoading(false) })
  }, [request.id])

  useEffect(() => { reload() }, [reload])

  function handlePray() {
    if (prayedToday) return
    setPrayedToday(true)
    setPrayCount(n => request.isMine ? n : n + 1)
    markPraying(request.id).catch(err => console.error('Failed to mark praying', err))
  }

  async function submitComment() {
    const trimmed = body.trim()
    if (!trimmed || posting) return
    setPosting(true)
    setPostError('')
    try {
      await addPrayerRequestComment(request.id, trimmed)
      setBody('')
      reload()
    } catch (err) {
      setPostError(err.message)
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(commentId) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    try {
      await deletePrayerRequestComment(commentId)
    } catch (err) {
      console.error('Failed to delete comment', err)
      reload()
    }
  }

  const badgeLabel = request.status === 'closed'
    ? L(`response${capResponse(request.resposta)}`)
    : request.isMine ? L('mineTag') : (request.groupName || '').toUpperCase()

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={styles.title}>{Ld('title')}</p>
      </div>

      <div style={styles.body}>
        <div style={styles.card}>
          <div style={styles.topRow}>
            <span style={{ ...styles.badge, ...(request.status === 'closed' ? styles.answeredBadge : request.isMine ? styles.mineBadge : styles.groupBadge) }}>{badgeLabel}</span>
            <span style={styles.timeText}>{L('timeAgoLabel', { span: relativeTimeSpan(request.createdAt, lang) })}</span>
          </div>
          <p style={styles.requestBody}>{request.body}</p>
          {request.notaResposta && <p style={styles.note}>&ldquo;{request.notaResposta}&rdquo;</p>}
          {request.status !== 'closed' && (
            <div style={styles.actionsRow}>
              <button type="button" style={{ ...styles.prayBtn, ...(prayedToday ? styles.prayBtnDone : {}) }} onClick={handlePray} disabled={prayedToday}>
                <AppIcon name="Check" size={13} strokeWidth={2.8} color={prayedToday ? 'var(--bento-sand-ink)' : 'var(--bento-accent)'} />
                {prayedToday ? L('prayedTodayBtn') : L('prayBtn')}
              </button>
              <span style={styles.prayCountText}>{L(prayCount === 1 ? 'groupPrayedOne' : 'groupPrayedMany', { n: prayCount })}</span>
            </div>
          )}
        </div>

        <p style={styles.sectionLabel}>{Ld('commentsLabel', { n: comments.length })}</p>

        {loading ? null : loadError ? (
          <p style={styles.emptyHint}>{Ld('loadError')}</p>
        ) : comments.length === 0 ? (
          <p style={styles.emptyHint}>{Ld('emptyComments')}</p>
        ) : (
          <div style={styles.commentsList}>
            {comments.map(c => (
              <div key={c.id} style={styles.commentRow}>
                <span style={styles.commentAvatar}>{avatarInitialsOf(c.authorName)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.commentMeta}>
                    <span style={styles.commentAuthor}>{c.authorName}</span>
                    <span style={styles.commentTime}> · {L('timeAgoLabel', { span: relativeTimeSpan(c.createdAt, lang) })}</span>
                  </p>
                  <p style={styles.commentBody}>{c.body}</p>
                </div>
                {c.isMine && (
                  <button type="button" style={styles.commentDeleteBtn} onClick={() => handleDelete(c.id)} aria-label={Ld('deleteCommentA11y')}>
                    <AppIcon name="X" size={13} strokeWidth={2.4} color="var(--bento-t4)" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        {postError && <p style={styles.errorText}>{postError}</p>}
        <div style={styles.composeRow}>
          <input
            style={styles.composeInput}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={Ld('commentPlaceholder')}
            maxLength={500}
            onKeyDown={e => { if (e.key === 'Enter') submitComment() }}
          />
          <button type="button" style={{ ...styles.sendBtn, ...(!body.trim() || posting ? styles.sendBtnOff : {}) }} onClick={submitComment} disabled={!body.trim() || posting}>
            <AppIcon name="ArrowUp" size={16} strokeWidth={2.6} color={!body.trim() || posting ? 'var(--bento-t5)' : 'var(--bento-ink)'} />
          </button>
        </div>
      </div>
    </div>
  )
}

function capResponse(key) {
  return { sim: 'Sim', nao: 'Nao', espere: 'Espere', aprenda: 'Aprenda', se_mova: 'SeMova' }[key] ?? 'Sim'
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.5px', margin: 0 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 14 },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  topRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  badge: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 0' },
  mineBadge: { color: 'var(--bento-accent)' },
  groupBadge: { color: 'var(--bento-sand-icon)' },
  answeredBadge: { color: 'var(--bento-sand-icon)' },
  timeText: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-t5)', whiteSpace: 'nowrap' },
  requestBody: { fontFamily: FONT, fontSize: 15.5, fontWeight: 700, lineHeight: 1.4, color: 'var(--bento-ink)', margin: 0 },
  note: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  actionsRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 },
  prayBtn: { height: 38, padding: '0 16px', borderRadius: 14, border: 'none', background: 'var(--bento-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)' },
  prayBtnDone: { background: 'var(--bento-sand)', color: 'var(--bento-sand-ink)', cursor: 'default' },
  prayCountText: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)' },

  sectionLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  emptyHint: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },

  commentsList: { display: 'flex', flexDirection: 'column', gap: 14 },
  commentRow: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  commentAvatar: { flexShrink: 0, width: 30, height: 30, borderRadius: 99, background: 'var(--bento-sand)', color: 'var(--bento-sand-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 800 },
  commentMeta: { margin: '0 0 2px' },
  commentAuthor: { fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)' },
  commentTime: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t4)' },
  commentBody: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)', margin: 0 },
  commentDeleteBtn: { flexShrink: 0, width: 26, height: 26, borderRadius: 99, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  footer: { flexShrink: 0, padding: '10px 20px calc(14px + var(--safe-bottom))', borderTop: '1px solid var(--bento-line)', display: 'flex', flexDirection: 'column', gap: 6 },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-accent)', margin: 0 },
  composeRow: { display: 'flex', alignItems: 'center', gap: 8 },
  composeInput: { flex: 1, height: 44, borderRadius: 16, border: 'none', background: 'var(--bento-card)', padding: '0 16px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none' },
  sendBtn: { flexShrink: 0, width: 44, height: 44, borderRadius: 16, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  sendBtnOff: { background: 'var(--bento-line)', cursor: 'default' },
}
