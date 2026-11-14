// GrupoOracao.jsx — os pedidos de oração de um grupo: os abertos (cada um
// com "Orei por isso" e quantas pessoas oraram — nunca quem), o pedido da
// própria pessoa em destaque com "Encerrar pedido", os encerrados e
// "Fazer um pedido". Moderador pode apagar um pedido.
import { useEffect, useState } from 'react'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'
import Cabecalho from './Cabecalho'
import FolhaDeConfirmacao from './FolhaDeConfirmacao'
import FolhaFazerPedido from '../pedidos/FolhaFazerPedido'
import { e, Esqueleto } from './estilos'
import { avatarInitialsOf } from '../../utils/avatarInitials'
import { formatRelativeTime } from '../../utils/time'
import { getPrayerRequestsFeed, deletePrayerRequest, closePrayerRequest } from '../../groups/prayerRequestsStore'
import { orarPor } from '../../pedidos/orei'
import { plural, prayerLists, markPrayed } from '../../comunidade/comunidadeMath'

const realApi = { list: getPrayerRequestsFeed, pray: orarPor, close: closePrayerRequest, remove: deletePrayerRequest }

export default function GrupoOracao({ lang, groupId, groupName, isModerator, authUser, hasAI, startWriting = false, onBack, api = realApi }) {
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const say = piece => t(piece.key, piece.vars, lang)
  const [requests, setRequests] = useState(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [addOpen, setAddOpen] = useState(startWriting)
  // A confirmação aberta: { kind: 'close' | 'remove', request }.
  const [confirming, setConfirming] = useState(null)

  function reload() {
    setLoadFailed(false)
    api.list(groupId).then(setRequests).catch(err => { console.error('[grupo] pedidos', err); setRequests(list => list ?? []); setLoadFailed(true) })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [groupId])

  function pray(request) {
    const { requests: next, undo } = markPrayed(requests, request.id)
    if (next === requests) return
    setRequests(next)
    api.pray(request).catch(err => { console.error('[grupo] orei', err); setRequests(undo) })
  }

  async function confirm() {
    await (confirming.kind === 'close' ? api.close : api.remove)(confirming.request.id)
    setConfirming(null)
    reload()
  }

  const lists = prayerLists(requests)
  const nameOf = r => (r.anonymous ? L('anonymous') : r.authorName)
  const count = r => (r.prayCount === 0 ? L('prayedNone') : say(plural('community.prayed', r.prayCount)))

  return (
    <div style={e.screen} data-comunidade="oracao">
      <Cabecalho lang={lang} title={L('prayerTitle')} sub={requests ? `${groupName} · ${say(plural('community.openCount', lists.open.length))}` : groupName} onBack={onBack} />
      <div style={{ ...e.body, ...e.bodyWithFooter }}>
        {requests === null && <Esqueleto heights={[170, 170, 130]} />}
        {loadFailed && <p style={e.error} role="alert">{L('loadFailed')}</p>}
        {requests && lists.open.length === 0 && <section style={e.card}><p style={e.empty}>{L('prayerEmpty')}</p></section>}

        {lists.open.map(r => (r.isMine ? (
          <article key={r.id} style={{ ...e.sandCard, ...s.stack }} data-pedido="meu">
            <p style={e.sandLabel}>{L('yourRequest')} · {formatRelativeTime(r.createdAt, lang)}</p>
            <p style={{ ...s.body, fontWeight: 700, color: 'var(--bento-sand-ink-strong)' }}>{r.body}</p>
            <div style={s.actions}>
              <p style={{ ...s.count, flex: 1, color: 'var(--bento-sand-ink)' }}>{count(r)}</p>
              <button type="button" style={s.sandBtn} onClick={() => setConfirming({ kind: 'close', request: r })}>{L('closeRequest')}</button>
            </div>
          </article>
        ) : (
          <article key={r.id} style={{ ...e.card, ...s.stack }} data-pedido="outro">
            <div style={s.head}>
              <span aria-hidden="true" style={{ ...e.avatar, ...(r.anonymous ? { background: 'var(--bento-line)' } : { background: 'var(--bento-mark)' }) }}>
                {r.anonymous ? <AppIcon name="Lock" size={15} strokeWidth={2.2} color="var(--bento-ink)" /> : avatarInitialsOf(r.authorName).slice(0, 1)}
              </span>
              <p style={e.author}>{nameOf(r)} <span style={e.when}>· {formatRelativeTime(r.createdAt, lang)}</span></p>
              {isModerator && <button type="button" style={e.textBtn} onClick={() => setConfirming({ kind: 'remove', request: r })}>{L('delete')}</button>}
            </div>
            <p style={s.body}>{r.body}</p>
            <div style={s.actions}>
              {r.prayingByMe
                ? <p style={{ ...s.prayBtn, ...s.prayDone }}><AppIcon name="Check" size={15} strokeWidth={2.6} color="var(--bento-ink)" />{L('prayedToday')}</p>
                : <button type="button" style={s.prayBtn} onClick={() => pray(r)}><AppIcon name="Heart" size={15} strokeWidth={2.2} color="var(--bento-ink)" />{L('pray')}</button>}
              <p style={s.count}>{count(r)}</p>
            </div>
          </article>
        )))}

        {lists.closed.length > 0 && (
          <>
            <h2 style={e.label}>{L('closedLabel')}</h2>
            <section style={e.listCard} aria-label={L('closedLabel')} data-pedido="encerrados">
              {lists.closed.map((r, i) => (
                <div key={r.id} style={{ ...e.row, ...(i === lists.closed.length - 1 ? e.rowLast : null) }}>
                  <span style={e.rowText}>
                    <span style={{ ...e.rowTitle, fontSize: 13.5, fontWeight: 700 }}>{r.body}</span>
                    <span style={e.rowSub}>{r.isMine ? L('yourRequest') : nameOf(r)} · {formatRelativeTime(r.createdAt, lang)}</span>
                  </span>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
      <div style={e.footer}>
        <button type="button" style={e.primary} onClick={() => setAddOpen(true)}>
          <AppIcon name="Plus" size={17} strokeWidth={2.4} color="var(--bento-ink)" />
          {L('makeRequest')}
        </button>
      </div>

      {addOpen && <FolhaFazerPedido lang={lang} authUser={authUser} hasAI={hasAI} onClose={() => setAddOpen(false)} onCreated={reload} />}
      {confirming && (
        <FolhaDeConfirmacao
          lang={lang} onClose={() => setConfirming(null)} onConfirm={confirm}
          title={L(confirming.kind === 'close' ? 'closeRequestTitle' : 'deleteRequestTitle')}
          text={L(confirming.kind === 'close' ? 'closeRequestText' : 'deleteRequestText')}
          confirmLabel={L(confirming.kind === 'close' ? 'closeRequest' : 'deleteRequestConfirm')} cancelLabel={L('keep')}
        />
      )}
    </div>
  )
}

const s = {
  stack: { display: 'flex', flexDirection: 'column', gap: 10 },
  head: { display: 'flex', alignItems: 'center', gap: 10 },
  body: { fontFamily: e.font, fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: 'var(--bento-ink)', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  actions: { display: 'flex', alignItems: 'center', gap: 12 },
  prayBtn: { height: 44, border: 'none', borderRadius: 15, background: 'var(--bento-accent)', color: 'var(--bento-ink)', padding: '0 16px', margin: 0, fontFamily: e.font, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' },
  prayDone: { background: 'var(--bento-line)', cursor: 'default' },
  sandBtn: { height: 44, border: 'none', borderRadius: 15, background: 'var(--bento-sand-icon)', color: '#fff', padding: '0 16px', fontFamily: e.font, fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  count: { fontFamily: e.font, fontSize: 12, fontWeight: 600, color: 'var(--bento-t2)', margin: 0 },
}
