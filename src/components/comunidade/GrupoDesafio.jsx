// GrupoDesafio.jsx — os desafios de leitura de um grupo: cada desafio em
// andamento com o progresso da pessoa e o placar ("quem está onde"),
// propor um desafio e os desafios anteriores. Moderador pode concluir um
// desafio antes do prazo. Um grupo pode ter mais de um em andamento.
import { useEffect, useState } from 'react'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'
import Cabecalho from './Cabecalho'
import FolhaDeConfirmacao from '../FolhaDeConfirmacao'
import FolhaProporDesafio from './FolhaProporDesafio'
import { e, Esqueleto } from './estilos'
import { avatarInitialsOf } from '../../utils/avatarInitials'
import { bookNameFor } from '../../utils/progress'
import { createChallenge, getChallengesForGroup, getChallengeLeaderboard, completeChallenge } from '../../groups/challengesStore'
import { plural, challengeBoard, daysLeft, nextChallengeChapter, pastChallengeSummary } from '../../comunidade/comunidadeMath'

const ROWS_SHOWN = 4
const realApi = { list: getChallengesForGroup, board: getChallengeLeaderboard, complete: completeChallenge, create: createChallenge }

export default function GrupoDesafio({ lang, groupId, groupName, isModerator, myUserId, chapterCounts, blocks, onBack, onOpenBible, api = realApi }) {
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const say = piece => t(piece.key, piece.vars, lang)
  // null enquanto carrega; depois, [{ challenge, leaderboard }].
  const [items, setItems] = useState(null)
  const [proposing, setProposing] = useState(false)
  const [completing, setCompleting] = useState(null)
  const [expanded, setExpanded] = useState([])

  async function reload() {
    try {
      const list = await api.list(groupId)
      setItems(await Promise.all(list.map(async challenge => ({ challenge, leaderboard: await api.board(challenge.id) }))))
    } catch (err) {
      console.error('[grupo] desafios', err)
      setItems(current => current ?? [])
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, [groupId])

  const active = (items ?? []).filter(i => i.challenge.active)
  const past = (items ?? []).filter(i => !i.challenge.active)
  const locale = lang === 'en' ? 'en' : 'pt-BR'
  const day = iso => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const books = challenge => challenge.books.map(b => bookNameFor(b, lang)).join(', ')

  return (
    <div style={e.screen} data-comunidade="desafio">
      <Cabecalho lang={lang} title={L('challengeTitle')} sub={groupName} onBack={onBack} />
      <div style={e.body}>
        {items === null && <Esqueleto heights={[230, 250]} />}
        {items && active.length === 0 && <section style={e.card} data-desafio="nenhum"><p style={e.empty}>{L('challengeNone')}</p></section>}

        {active.map(({ challenge, leaderboard }) => {
          const board = challengeBoard(challenge, leaderboard, chapterCounts, myUserId)
          const left = daysLeft(challenge.endsAt)
          const next = board.mine && nextChallengeChapter(challenge, leaderboard.find(p => p.userId === myUserId)?.completedKeys, chapterCounts)
          const open = expanded.includes(challenge.id)
          const rows = open ? board.rows : board.rows.slice(0, ROWS_SHOWN)
          return (
            <div key={challenge.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-desafio={challenge.id}>
              <section style={e.inkCard}>
                <p style={e.inkLabel}>{L('challengeRunning')} · {left === 0 ? L('endsToday') : say(plural('community.daysLeft', left))}</p>
                <div>
                  <p style={s.title}>{challenge.name || books(challenge)}</p>
                  <p style={s.meta}>{[challenge.name ? books(challenge) : null, L('dateRange', { start: day(challenge.startsAt), end: day(challenge.endsAt) }), L('proposedBy', { name: challenge.createdByName })].filter(Boolean).join(' · ')}</p>
                  {challenge.description && <p style={{ ...s.meta, marginTop: 8 }}>{challenge.description}</p>}
                </div>
                <div style={s.mine}>
                  {board.mine ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                        <p style={s.mineText}>{L('youRead', { done: board.mine.done, total: board.total })}</p>
                        <p style={s.minePercent}>{board.mine.percent}%</p>
                      </div>
                      <div role="img" aria-label={L('percentRead', { n: board.mine.percent })} style={s.track}><div style={{ ...s.fill, width: `${board.mine.percent}%` }} /></div>
                    </>
                  ) : <p style={s.mineText}>{L('youNotIn')}</p>}
                </div>
                {next && onOpenBible && (
                  <button type="button" style={s.read} onClick={() => onOpenBible(next.book, next.chapter)}>
                    {L('readNext', { ref: `${bookNameFor(next.book, lang)} ${next.chapter}` })}
                    <AppIcon name="ArrowRight" size={16} strokeWidth={2.4} color="var(--bento-ink)" />
                  </button>
                )}
                {isModerator && <button type="button" style={s.finish} onClick={() => setCompleting(challenge)}>{L('finishChallenge')}</button>}
              </section>

              {board.rows.length > 0 && (
                <>
                  <h2 style={e.label}>{L('whoIsWhere')}</h2>
                  <section style={e.listCard} aria-label={L('whoIsWhere')}>
                    {rows.map((r, i) => (
                      <div key={r.userId} style={{ ...s.rank, ...(r.isMe ? s.rankMe : i === rows.length - 1 && board.rows.length <= ROWS_SHOWN ? e.rowLast : null) }} data-posicao={r.position}>
                        <span style={s.position}>{r.position}</span>
                        <span aria-hidden="true" style={{ ...e.avatar, ...(r.isMe ? { background: 'var(--bento-ink)', color: '#fff' } : null) }}>{avatarInitialsOf(r.name).slice(0, 1)}</span>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <p style={{ ...s.rankName, ...(r.isMe ? { fontWeight: 800 } : null) }}>{r.isMe ? L('you') : r.name}</p>
                          <div aria-hidden="true" style={{ ...s.bar, ...(r.isMe ? { background: 'rgba(26,23,20,.12)' } : null) }}><div style={{ ...s.fill, width: `${r.percent}%` }} /></div>
                        </div>
                        <p style={s.percent}>{r.percent}%</p>
                      </div>
                    ))}
                    {board.rows.length > ROWS_SHOWN && (
                      <button type="button" style={{ ...e.textBtn, width: '100%', minHeight: 48 }} onClick={() => setExpanded(list => (open ? list.filter(id => id !== challenge.id) : [...list, challenge.id]))}>
                        {open ? L('seeLess') : say(plural('community.seePeople', board.rows.length))}
                      </button>
                    )}
                  </section>
                </>
              )}
            </div>
          )
        })}

        {items && (
          <button type="button" style={{ ...e.secondary, marginTop: 4 }} onClick={() => setProposing(true)}>
            <AppIcon name="Plus" size={16} strokeWidth={2.4} color="var(--bento-ink)" />
            {L(active.length === 0 ? 'proposeFirst' : 'proposeAnother')}
          </button>
        )}

        {past.length > 0 && (
          <>
            <h2 style={e.label}>{L('pastChallenges')}</h2>
            <section style={e.listCard} aria-label={L('pastChallenges')} data-desafio="anteriores">
              {past.map(({ challenge, leaderboard }, i) => {
                const sum = pastChallengeSummary(challenge, leaderboard, chapterCounts)
                const month = new Date(challenge.endsAt).toLocaleDateString(locale, { month: 'long' })
                return (
                  <div key={challenge.id} style={{ ...e.row, ...(i === past.length - 1 ? e.rowLast : null) }}>
                    <span style={e.rowText}>
                      <span style={e.rowTitle}>{challenge.name || books(challenge)}</span>
                      <span style={e.rowSub}>{[month.charAt(0).toUpperCase() + month.slice(1), sum.participants > 0 ? L('finishedOf', { done: sum.finished, total: sum.participants }) : null].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span style={{ ...e.badge, ...(challenge.manuallyCompleted ? { background: 'var(--bento-sand)', color: 'var(--bento-sand-ink-strong)' } : null) }}>{L(challenge.manuallyCompleted ? 'challengeCompleted' : 'challengeEnded')}</span>
                  </div>
                )
              })}
            </section>
          </>
        )}
      </div>

      {proposing && (
        <FolhaProporDesafio
          lang={lang} blocks={blocks} onClose={() => setProposing(false)}
          onCreate={async ({ name, description, books: picked, endsAt }) => { await api.create(groupId, picked, endsAt, name, description); setProposing(false); await reload() }}
        />
      )}
      {completing && (
        <FolhaDeConfirmacao
          lang={lang} title={L('finishTitle', { name: completing.name || books(completing) })} text={L('finishText')}
          confirmLabel={L('finishChallenge')} cancelLabel={L('keepRunning')}
          onClose={() => setCompleting(null)} onConfirm={async () => { await api.complete(completing.id); setCompleting(null); await reload() }}
        />
      )}
    </div>
  )
}

const s = {
  title: { fontFamily: e.font, fontSize: 24, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.9px', color: '#fff', margin: 0 },
  meta: { fontFamily: e.font, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.72)', margin: '6px 0 0' },
  mine: { borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 },
  mineText: { fontFamily: e.font, fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 },
  minePercent: { fontFamily: e.font, fontSize: 13, fontWeight: 800, color: 'var(--bento-accent)', margin: 0 },
  track: { height: 8, borderRadius: 99, background: 'rgba(255,255,255,.14)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },
  read: { height: 48, border: 'none', borderRadius: 16, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: e.font, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },
  finish: { height: 44, border: 'none', borderRadius: 15, background: 'rgba(255,255,255,.12)', color: '#fff', fontFamily: e.font, fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  rank: { minHeight: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--bento-line)' },
  rankMe: { margin: '0 -10px', padding: '8px 10px', borderRadius: 16, borderBottom: 'none', background: 'var(--bento-mark)' },
  position: { width: 16, flexShrink: 0, fontFamily: e.font, fontSize: 12, fontWeight: 800, color: 'var(--bento-t2)' },
  rankName: { fontFamily: e.font, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  bar: { height: 6, borderRadius: 99, background: 'var(--bento-line)', overflow: 'hidden' },
  percent: { width: 44, flexShrink: 0, textAlign: 'right', fontFamily: e.font, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', margin: 0 },
}
