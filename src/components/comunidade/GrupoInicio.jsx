// GrupoInicio.jsx — a tela de um grupo (redesenho de 2026-11): a leitura
// de hoje e a sala do capítulo, quatro quadros que levam às partes do
// grupo (Oração, Conversa, Desafio, Pessoas), o último pedido de oração, o
// último recado, "Escrever no grupo" e "Sair do grupo".
//
// Busca o que mostra (sala, pedidos, recados, desafio em andamento); as
// contas são de comunidadeMath.js. `api` é trocável na pré-visualização.
import { useEffect, useState } from 'react'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'
import Cabecalho from './Cabecalho'
import FolhaInferior from '../FolhaInferior'
import { avatarInitialsOf } from '../../utils/avatarInitials'
import { formatRelativeTime } from '../../utils/time'
import { getRoomStats } from '../../groups/chapterRoomStore'
import { getPrayerRequestsFeed } from '../../groups/prayerRequestsStore'
import { getComments } from '../../groups/commentsStore'
import { getChallengesForGroup, getChallengeLeaderboard } from '../../groups/challengesStore'
import { orarPor } from '../../pedidos/orei'
import { plural, todayReading, readingProgress, challengeBoard, groupTiles, markPrayed } from '../../comunidade/comunidadeMath'

const FONT = 'var(--font-bento)'
const TONES = ['var(--bento-accent)', 'var(--bento-sand)', 'var(--bento-mark)']
const TILE_ICONS = { prayer: 'Heart', talk: 'MessageCircle', challenge: 'Award', people: 'Users' }
const TILE_NAMES = { prayer: 'tilePrayerName', talk: 'tileTalkName', challenge: 'tileChallengeLabel', people: 'tilePeopleName' }
const realApi = {
  roomStats: getRoomStats,
  prayers: groupId => getPrayerRequestsFeed(groupId, 50),
  comments: getComments,
  challenges: getChallengesForGroup,
  leaderboard: getChallengeLeaderboard,
  pray: orarPor,
}

export default function GrupoInicio({
  lang, groupId, groupName, readingMode, members, pinnedNotice, todaySession, myUserId, chapterCounts,
  onBack, onInvite, onOpen, onWrite, onOpenRoom, onLeave, api = realApi,
}) {
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const say = piece => t(piece.key, piece.vars, lang)
  const [roomStats, setRoomStats] = useState(null)
  // null enquanto não chegou; depois, a lista (vazia se a busca falhou).
  const [prayers, setPrayers] = useState(null)
  const [comments, setComments] = useState(null)
  const [challenge, setChallenge] = useState(undefined) // undefined = buscando; null = nenhum em andamento
  const [writeOpen, setWriteOpen] = useState(false)

  const reading = todayReading(todaySession)

  useEffect(() => {
    if (!reading) { setRoomStats(null); return }
    api.roomStats(groupId, reading.book, reading.chStart).then(setRoomStats).catch(err => console.error('[grupo] sala', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, reading?.book, reading?.chStart])

  useEffect(() => {
    let alive = true
    api.prayers(groupId).then(list => { if (alive) setPrayers(list) }).catch(err => { console.error('[grupo] pedidos', err); if (alive) setPrayers([]) })
    api.comments(groupId).then(list => { if (alive) setComments(list) }).catch(err => { console.error('[grupo] recados', err); if (alive) setComments([]) })
    api.challenges(groupId).then(async list => {
      const active = list.find(c => c.active) ?? null
      const board = active ? challengeBoard(active, await api.leaderboard(active.id), chapterCounts, myUserId) : null
      if (alive) setChallenge(active ? { ...active, myPercent: board.mine?.percent ?? 0 } : null)
    }).catch(err => { console.error('[grupo] desafio', err); if (alive) setChallenge(null) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const ready = prayers !== null && comments !== null && challenge !== undefined
  const tiles = groupTiles({ prayers, comments, pinnedNotice, challenge, myPercent: challenge?.myPercent, members })
  const progress = readingProgress(roomStats)
  // O pedido mais recente ainda aberto e o recado mais recente (os recados
  // chegam do mais antigo pro mais novo).
  const latestPrayer = (prayers ?? []).find(p => p.status !== 'closed') ?? null
  const latestNote = comments?.length ? comments[comments.length - 1] : null
  const nameOf = item => (item.anonymous ? L('anonymous') : item.authorName)

  // "Orei por isso" marca o dia e conta pessoas, não toques (markPrayed);
  // se a gravação falhar, volta ao que era.
  function pray() {
    const { requests, undo } = markPrayed(prayers, latestPrayer.id)
    if (requests === prayers) return
    setPrayers(requests)
    api.pray(latestPrayer).catch(err => { console.error('[grupo] orei', err); setPrayers(undo) })
  }

  const chapterLabel = reading ? `${lang === 'en' ? reading.bookEn : reading.book} ${reading.chStart}${reading.chEnd !== reading.chStart ? `–${reading.chEnd}` : ''}` : ''
  const headerSub = [say(plural('community.people', members.length)), L(readingMode === 'shared' ? 'readingShared' : 'readingIndividual')].join(' · ')

  return (
    <div style={s.screen} data-comunidade="grupo">
      <Cabecalho lang={lang} title={groupName} sub={headerSub} onBack={onBack}>
        <button type="button" style={s.invite} onClick={onInvite}>
          <AppIcon name="UserPlus" size={15} strokeWidth={2.2} color="var(--bento-ink)" />
          {L('invite')}
        </button>
      </Cabecalho>

      <div style={s.body}>
        {reading && (
          <section aria-label={L('readingLabel')} style={s.reading} data-grupo="leitura">
            <p style={s.readingLabel}>{L('readingLabel')}</p>
            <p style={s.readingTitle}>{chapterLabel}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {progress && (
                <div role="img" aria-label={L('readToday', { done: progress.done, total: progress.total })} style={s.readingTrack}>
                  <div style={{ ...s.readingFill, width: `${progress.percent}%` }} />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 32 }}>
                <div aria-hidden="true" style={{ display: 'flex' }}>
                  {members.slice(0, 3).map((m, i) => <span key={m.userId} style={{ ...s.readingAvatar, background: TONES[i], marginLeft: i ? -8 : 0 }}>{avatarInitialsOf(m.name).slice(0, 1)}</span>)}
                </div>
                {progress && <p style={s.readingStatus}>{L('readToday', { done: progress.done, total: progress.total })}</p>}
              </div>
            </div>
            <button type="button" style={s.readingBtn} onClick={() => onOpenRoom({ group: { groupId, name: groupName }, book: reading.book, bookEn: reading.bookEn, chapter: reading.chStart })}>
              {L('openRoom')}
              <AppIcon name="ArrowRight" size={16} strokeWidth={2.4} color="var(--bento-ink)" />
            </button>
          </section>
        )}

        <nav aria-label={L('partsLabel')} style={s.tiles}>
          {tiles.map(tile => (
            <button key={tile.id} type="button" style={s.tile} onClick={() => onOpen(tile.id)} data-quadro={tile.id}>
              <span style={s.tileName}>
                <AppIcon name={TILE_ICONS[tile.id]} size={15} strokeWidth={2.2} color="var(--bento-now-text)" />
                {L(TILE_NAMES[tile.id])}
              </span>
              <span style={s.tileValue}>{!ready && tile.id !== 'people' ? '–' : tile.value == null ? '—' : `${tile.value}${tile.percent ? '%' : ''}`}</span>
              <span style={s.tileSub}>{!ready && tile.id !== 'people' ? ' ' : say(tile.sub)}</span>
            </button>
          ))}
        </nav>

        {ready && (
          <section aria-label={L('lastPrayerLabel')} style={s.prayer} data-grupo="pedido">
            {latestPrayer ? (
              <>
                <p style={s.prayerLabel}>{L('lastPrayerLabel')} · {formatRelativeTime(latestPrayer.createdAt, lang)}</p>
                <p style={s.prayerBody}>“{latestPrayer.body}”</p>
                <p style={s.prayerAuthor}>{latestPrayer.isMine ? L('yourRequest') : nameOf(latestPrayer)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {!latestPrayer.isMine && (
                    latestPrayer.prayingByMe
                      ? <p style={{ ...s.prayBtn, ...s.prayDone }}><AppIcon name="Check" size={15} strokeWidth={2.6} color="var(--bento-sand-ink-strong)" />{L('prayedToday')}</p>
                      : <button type="button" style={s.prayBtn} onClick={pray}><AppIcon name="Heart" size={15} strokeWidth={2.2} color="#fff" />{L('pray')}</button>
                  )}
                  <p style={s.prayCount}>{latestPrayer.prayCount === 0 ? L('prayedNone') : say(plural('community.prayed', latestPrayer.prayCount))}</p>
                </div>
              </>
            ) : (
              <>
                <p style={s.prayerLabel}>{L('lastPrayerLabel')}</p>
                <p style={s.emptyText}>{L('noPrayerYet')}</p>
              </>
            )}
          </section>
        )}

        {ready && (
          <section aria-label={L('lastNoteLabel')} style={s.note} data-grupo="recado">
            <p style={s.noteLabel}>{L('lastNoteLabel')}</p>
            {latestNote ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span aria-hidden="true" style={s.noteAvatar}>{avatarInitialsOf(nameOf(latestNote)).slice(0, 1)}</span>
                  <p style={s.noteAuthor}>{nameOf(latestNote)} <span style={s.noteTime}>· {formatRelativeTime(latestNote.createdAt, lang)}</span></p>
                </div>
                <p style={s.noteBody}>{latestNote.body}</p>
                <button type="button" style={s.noteLink} onClick={() => onOpen('talk')}>{L('seeTalk')}</button>
              </>
            ) : (
              <p style={{ ...s.emptyText, color: 'var(--bento-t2)' }}>{L('noNoteYet')}</p>
            )}
          </section>
        )}

        <button type="button" style={s.write} onClick={() => setWriteOpen(true)}>
          <AppIcon name="Plus" size={17} strokeWidth={2.4} color="var(--bento-ink)" />
          {L('write')}
        </button>
        <button type="button" style={s.leave} onClick={onLeave}>{L('leave')}</button>
      </div>

      {writeOpen && (
        <FolhaInferior onClose={() => setWriteOpen(false)} labelledBy="escrever-no-grupo" fixed>
          <h2 style={s.sheetTitle} id="escrever-no-grupo">{L('write')}</h2>
          <button type="button" style={s.sheetRow} onClick={() => { setWriteOpen(false); onWrite('talk') }}>
            <span aria-hidden="true" style={s.sheetIcon}><AppIcon name="MessageCircle" size={18} strokeWidth={2.1} color="var(--bento-ink)" /></span>
            <span style={s.sheetText}><span style={s.sheetRowTitle}>{L('writeNote')}</span><span style={s.sheetRowSub}>{L('writeNoteSub')}</span></span>
          </button>
          <button type="button" style={{ ...s.sheetRow, borderBottom: 'none' }} onClick={() => { setWriteOpen(false); onWrite('prayer') }}>
            <span aria-hidden="true" style={s.sheetIcon}><AppIcon name="Heart" size={18} strokeWidth={2.1} color="var(--bento-ink)" /></span>
            <span style={s.sheetText}><span style={s.sheetRowTitle}>{L('writePrayer')}</span><span style={s.sheetRowSub}>{L('writePrayerSub')}</span></span>
          </button>
        </FolhaInferior>
      )}
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)', fontFamily: FONT, color: 'var(--bento-ink)' },
  invite: { height: 44, flexShrink: 0, border: 'none', borderRadius: 14, background: 'var(--bento-card)', padding: '0 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px calc(var(--nav-height) + 22px)', display: 'flex', flexDirection: 'column', gap: 10 },

  reading: { borderRadius: 26, background: 'var(--bento-ink)', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 },
  readingLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  readingTitle: { fontFamily: FONT, fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.1px', color: '#fff', margin: 0 },
  readingTrack: { height: 6, borderRadius: 99, background: 'rgba(255,255,255,.14)', overflow: 'hidden' },
  readingFill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },
  readingAvatar: { width: 28, height: 28, boxSizing: 'content-box', borderRadius: 10, border: '2px solid var(--bento-ink)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  readingStatus: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.75)', margin: 0 },
  readingBtn: { height: 50, border: 'none', borderRadius: 16, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },

  tiles: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 },
  tile: { border: 'none', borderRadius: 22, background: 'var(--bento-card)', padding: '14px 14px 13px', textAlign: 'left', fontFamily: FONT, color: 'var(--bento-ink)', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' },
  tileName: { display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontSize: 13.5, fontWeight: 800 },
  tileValue: { fontFamily: FONT, fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.2px' },
  tileSub: { minHeight: 15, fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  prayer: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  prayerLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-sand-ink)', margin: 0 },
  prayerBody: { fontFamily: FONT, fontSize: 15, fontWeight: 700, lineHeight: 1.4, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  prayerAuthor: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-sand-ink)', margin: 0 },
  prayBtn: { height: 44, border: 'none', borderRadius: 15, background: 'var(--bento-sand-icon)', color: '#fff', padding: '0 16px', margin: 0, fontFamily: FONT, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' },
  prayDone: { background: 'var(--bento-sand-line)', color: 'var(--bento-sand-ink-strong)', cursor: 'default' },
  prayCount: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-sand-ink)', margin: 0 },
  emptyText: { fontFamily: FONT, fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },

  note: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  noteLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t2)', margin: 0 },
  noteAvatar: { width: 34, height: 34, flexShrink: 0, borderRadius: 99, background: 'var(--bento-sand)', fontFamily: FONT, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  noteAuthor: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, margin: 0 },
  noteTime: { fontWeight: 500, color: 'var(--bento-t2)' },
  noteBody: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-quote-ink)', margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  noteLink: { alignSelf: 'flex-start', minHeight: 44, border: 'none', background: 'none', padding: '0 12px 0 0', margin: '-8px 0 -12px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-now-text)', cursor: 'pointer' },

  write: { height: 54, flexShrink: 0, marginTop: 6, border: 'none', borderRadius: 18, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },
  leave: { height: 44, flexShrink: 0, border: 'none', background: 'none', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },

  sheetTitle: { fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  sheetRow: { width: '100%', minHeight: 66, border: 'none', borderBottom: '1px solid var(--bento-line)', background: 'none', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: FONT, color: 'var(--bento-ink)', cursor: 'pointer' },
  sheetIcon: { width: 40, height: 40, flexShrink: 0, borderRadius: 14, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sheetText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  sheetRowTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 800 },
  sheetRowSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t2)' },
}
