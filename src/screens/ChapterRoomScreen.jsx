// ChapterRoomScreen.jsx — Sala do capítulo (quadro 17a).
//
// Uma sala por capítulo dentro do grupo, trancada até a pessoa concluir o
// capítulo — resolve spoiler e tira a pressão de quem está atrasado. A
// pergunta vem do líder (moderador) do grupo, não da IA: aqui a voz é humana
// de propósito. Reação única ("Amém") em vez de curtidas. Campo de resposta
// no rodapé. Aberta pelo botão "Grupo" do cabeçalho da leitura (17c).
import { useState, useEffect, useRef } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { getRoomStats, getRoomQuestion, setRoomQuestion, getRoomPosts, postToRoom, toggleAmen, deleteRoomPost } from '../groups/chapterRoomStore'

const FONT = 'var(--font-bento)'
// Três cores de avatar do quadro (laranja/areia/cinza), escolhidas pelo id.
const AVATAR_PALETTE = [
  { bg: 'var(--bento-accent)', fg: 'var(--bento-ink)' },
  { bg: 'var(--bento-sand)', fg: 'var(--bento-sand-icon)' },
  { bg: 'var(--bento-t4)', fg: '#fff' },
]
export function avatarPaletteFor(seed) {
  let h = 0
  for (const ch of String(seed ?? '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function relativeTime(iso, L) {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return L('justNow')
  if (hours < 24) return L('hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return L('yesterday')
  return L('daysAgo', { n: days })
}

export default function ChapterRoomScreen({ group, book, bookEn, chapter, completed, isModerator, lang, authUser, onBack }) {
  const L = (k, vars) => t(`room.${k}`, vars, lang)
  const ref = `${lang === 'en' ? (bookEn || book) : book} ${chapter}`
  const [stats, setStats] = useState({ members: 0, completed: 0, posts: 0 })
  const [question, setQuestion] = useState(null)
  const [posts, setPosts] = useState([])
  const [draft, setDraft] = useState('')
  const [questionDraft, setQuestionDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  async function reload() {
    const [s, q, p] = await Promise.all([
      getRoomStats(group.groupId, book, chapter),
      getRoomQuestion(group.groupId, book, chapter),
      completed ? getRoomPosts(group.groupId, book, chapter) : Promise.resolve([]),
    ])
    setStats(s); setQuestion(q); setPosts(p)
  }
  useEffect(() => { reload().catch(err => console.error('Failed to load chapter room', err)) }, [group.groupId, book, chapter, completed])

  async function send() {
    const clean = draft.trim()
    if (!clean || busy || !completed) return
    setBusy(true)
    try {
      await postToRoom(group.groupId, book, chapter, clean)
      setDraft('')
      await reload()
    } catch (err) {
      console.error('Failed to post to room', err)
    } finally {
      setBusy(false)
    }
  }

  async function publishQuestion() {
    const clean = questionDraft.trim()
    if (!clean || busy) return
    setBusy(true)
    try {
      await setRoomQuestion(group.groupId, book, chapter, clean)
      setQuestionDraft('')
      await reload()
    } catch (err) {
      console.error('Failed to publish question', err)
    } finally {
      setBusy(false)
    }
  }

  async function amen(post) {
    // Otimista: a contagem muda na hora, o servidor confirma depois.
    setPosts(ps => ps.map(p => p.id === post.id ? { ...p, amenByMe: !p.amenByMe, amenCount: p.amenCount + (p.amenByMe ? -1 : 1) } : p))
    try { await toggleAmen(post.id, post.amenByMe) } catch (err) { console.error('Failed to toggle amen', err); reload() }
  }

  function replyTo(post) {
    setDraft(d => (d.startsWith(`@${post.authorName.split(' ')[0]} `) ? d : `@${post.authorName.split(' ')[0]} ${d}`))
    inputRef.current?.focus()
  }

  async function remove(post) {
    if (!window.confirm(L('delete') + '?')) return
    try { await deleteRoomPost(post.id); await reload() } catch (err) { console.error('Failed to delete post', err) }
  }

  const answerAvatars = posts.slice(0, 3)

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.title}>{L('title', { ref })}</p>
          <p style={s.sub}>{L('sub', { group: group.name, n: stats.members })}</p>
        </div>
      </div>

      <div style={s.body}>
        {/* Aviso areia: aberta pra quem leu; contagem sem spoiler pra quem não. */}
        <div style={s.noticeCard}>
          <div style={{ ...s.noticeIcon, ...(completed ? {} : { background: 'var(--bento-sand-label)' }) }}>
            {completed
              ? <AppIcon name="Check" size={14} strokeWidth={2.4} color="var(--bento-sand)" />
              : <AppIcon name="Lock" size={14} strokeWidth={2.4} color="var(--bento-sand)" />}
          </div>
          <p style={s.noticeText}>{L(completed ? 'openNote' : 'lockedNote', { done: stats.completed, total: stats.members })}</p>
        </div>

        {/* Pergunta da semana — humana, do moderador. */}
        <div style={s.questionCard}>
          {question ? (
            <>
              <p style={s.questionLabel}>{L('questionLabel', { author: question.authorName })}</p>
              <p style={s.questionText}>{question.body}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {answerAvatars.length > 0 && (
                  <div style={{ display: 'flex' }}>
                    {answerAvatars.map((p, i) => (
                      <span key={p.id} style={{ ...s.qAvatar, background: avatarPaletteFor(p.userId).bg, marginLeft: i ? -8 : 0 }} />
                    ))}
                  </div>
                )}
                <span style={s.answersCount}>{stats.posts === 1 ? L('answerOne') : L('answers', { n: stats.posts })}</span>
              </div>
            </>
          ) : isModerator ? (
            <>
              <p style={s.questionLabel}>{L('questionLabel', { author: authUser?.name?.split(' ')[0] ?? '' })}</p>
              <textarea
                style={s.questionInput} rows={3} value={questionDraft} maxLength={500}
                onChange={e => setQuestionDraft(e.target.value)} placeholder={L('questionPlaceholder')}
              />
              <button type="button" style={s.questionSaveBtn} onClick={publishQuestion} disabled={busy || !questionDraft.trim()}>{L('questionSave')}</button>
            </>
          ) : (
            <p style={{ ...s.questionText, margin: 0, color: 'rgba(255,255,255,.55)', fontSize: 15 }}>{L('questionMissing')}</p>
          )}
        </div>

        {completed && posts.map(post => {
          const pal = avatarPaletteFor(post.userId)
          const mine = authUser?.id && post.userId === authUser.id
          return (
            <div key={post.id} style={s.postCard}>
              <div style={s.postHead}>
                <span style={{ ...s.postAvatar, background: pal.bg, color: pal.fg }}>{avatarInitialsOf(post.authorName)}</span>
                <span style={s.postName}>{post.authorName.split(' ')[0]}</span>
                <span style={s.postTime}>{relativeTime(post.createdAt, L)}</span>
              </div>
              {post.quoteText && (
                <div style={s.quoteBlock}>
                  <p style={s.quoteText}>"{post.quoteText}" {post.quoteRef && <span style={s.quoteRef}>{post.quoteRef}</span>}</p>
                </div>
              )}
              <p style={s.postBody}>{post.body}</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" style={{ ...s.chip, color: post.amenCount > 0 || post.amenByMe ? 'var(--bento-ink)' : 'var(--bento-t3)' }} onClick={() => amen(post)}>
                  {post.amenCount > 0 ? L('amenCount', { n: post.amenCount }) : L('amen')}
                </button>
                <button type="button" style={{ ...s.chip, color: 'var(--bento-t3)' }} onClick={() => replyTo(post)}>{L('reply')}</button>
                {(mine || isModerator) && (
                  <button type="button" style={{ ...s.chip, color: 'var(--bento-t3)', marginLeft: 'auto' }} onClick={() => remove(post)}>{L('delete')}</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={s.footer}>
        <div style={{ ...s.composer, opacity: completed ? 1 : .6 }}>
          <input
            ref={inputRef} type="text" style={s.composerInput} value={draft} maxLength={2000} disabled={!completed}
            onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder={completed ? L('composer') : L('composerLocked')}
          />
          <button type="button" style={s.sendBtn} onClick={send} disabled={!completed || busy || !draft.trim()} aria-label={L('send')}>
            <AppIcon name="ArrowUp" size={15} strokeWidth={2.4} color="var(--bento-accent)" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Medidas do quadro 17a.
const s = {
  screen: { height: '100%', background: 'var(--bento-bg)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: FONT },
  header: { flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, borderRadius: 12, background: 'var(--bento-card)', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' },
  title: { fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  noticeCard: { flex: 'none', borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  noticeIcon: { width: 30, height: 30, borderRadius: 10, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  noticeText: { flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },
  questionCard: { flex: 'none', borderRadius: 24, background: 'var(--bento-ink)', padding: 20 },
  questionLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: '0 0 12px' },
  questionText: { fontFamily: FONT, fontSize: 19, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.6px', color: '#fff', margin: '0 0 14px', textWrap: 'pretty' },
  qAvatar: { width: 24, height: 24, borderRadius: 99, border: '2px solid var(--bento-ink)', boxSizing: 'border-box', display: 'block' },
  answersCount: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,.5)' },
  questionInput: { width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', borderRadius: 14, background: 'rgba(255,255,255,.08)', padding: '12px 14px', fontFamily: FONT, fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: '#fff', margin: '0 0 10px' },
  questionSaveBtn: { height: 44, borderRadius: 14, border: 'none', background: 'var(--bento-accent)', padding: '0 16px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  postCard: { flex: 'none', borderRadius: 20, background: 'var(--bento-card)', padding: '16px 18px' },
  postHead: { display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 9px' },
  postAvatar: { width: 26, height: 26, borderRadius: 99, fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: '26px', textAlign: 'center', flex: 'none' },
  postName: { fontFamily: FONT, fontSize: 13, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' },
  postTime: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t5)', marginLeft: 'auto' },
  quoteBlock: { borderLeft: '3px solid var(--bento-accent)', padding: '2px 0 2px 12px', margin: '0 0 10px' },
  quoteText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  quoteRef: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-icon)', fontStyle: 'normal' },
  postBody: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-t2)', margin: '0 0 12px' },
  chip: { border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, background: 'var(--bento-line)', borderRadius: 99, padding: '7px 11px' },
  footer: { flex: 'none', padding: '12px 20px calc(20px + var(--safe-bottom))' },
  composer: { height: 52, borderRadius: 18, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', padding: '0 6px 0 18px', gap: 10 },
  composerInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', padding: 0, fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1, color: 'var(--bento-ink)' },
  sendBtn: { width: 40, height: 40, borderRadius: 13, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none', padding: 0 },
}
