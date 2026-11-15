// AnotacaoGuardadaScreen.jsx — a anotação guardada (N5, handoff-
// biblioteca-55 §7A.5): o que aparece ao "Finalizar" e ao tocar numa
// anotação longa na Biblioteca. A síntese em preto (só com as palavras da
// pessoa; guardada no registro e pedida de novo só se o texto mudar; com
// menos de ~40 palavras, não aparece), os três números, os pontos, as
// passagens, "Ler a anotação inteira", "Quem vê" e um botão só —
// "Continuar escrevendo". A anotação já está guardada: compartilhar é por
// "Quem vê"; quando ela vai a um grupo, aparece a linha de confirmação,
// com "Desfazer".
import { useState, useEffect, useRef } from 'react'
import { useAnotacao } from '../anotar/useAnotacao'
import { anotarApi } from '../anotar/anotarApi'
import { shareNote } from '../anotar/levarAoGrupo'
import { whoSeesLabel } from '../anotar/anotarMath'
import {
  savedTitle, savedHeaderLine, summaryLabel, summaryNote, summaryPlan, storedSummary, summaryParts, savedNumbers, savedPoints,
  pointsLabel, passagesLabel, markLabel, savedPassages, passagesToMark, markState, readLine, groupsToShare, sharedLine,
  notSharedNoPassage, notSharedFailed, shareTextOfNote,
} from '../anotar/guardadaMath'
import DetalhesDaAnotacao from '../components/anotar/DetalhesDaAnotacao'
import FolhaDoItem from '../components/biblioteca/FolhaDoItem'
import Icone from '../components/anotar/Icone'
import { useConfirmacao } from '../components/FolhaDeConfirmacao'
import { t } from '../i18n'
import { tr } from '../i18n/tr.js'

const FONT = 'var(--font-bento)'
const NO_GROUPS = []

// `notice`: o que acabou de acontecer ao finalizar — { shared: [{ groupId,
// postId }], failed: [groupId], reason } (ver PaginaDeAnotacao.jsx).
export default function AnotacaoGuardadaScreen({ lang = 'pt', api = anotarApi, noteId, groups = NO_GROUPS, notice: arrivedWith = null, onBack, onContinue, onRead, onOpenBiblePassage, onDeleted }) {
  const N = (key, vars) => tr(lang, `notasTx.${key}`, vars)
  const [perguntar, folha] = useConfirmacao(lang)
  const { status, draft, library, change, leave, discard } = useAnotacao({ api, target: { noteId }, countTime: false })
  const [summary, setSummary] = useState({ state: 'idle', data: null })
  const [highlights, setHighlights] = useState(null)
  const [marking, setMarking] = useState(false)
  const [details, setDetails] = useState(null)
  const [menu, setMenu] = useState(false)
  const [notice, setNotice] = useState(arrivedWith)
  const [memberCounts, setMemberCounts] = useState({})
  const [busy, setBusy] = useState(false)
  const sharedBefore = useRef([])
  const asked = useRef(null)

  const groupIds = groups.map(g => g.groupId).join(',')
  useEffect(() => {
    if (!groupIds) return undefined
    let cancelled = false
    api.memberCounts(groupIds.split(',')).then(counts => { if (!cancelled) setMemberCounts(counts ?? {}) }).catch(() => {})
    return () => { cancelled = true }
  }, [api, groupIds])

  // A síntese: a guardada, se é do texto como está; senão, pede — e
  // guarda no registro para não pedir de novo.
  const plan = draft ? summaryPlan(draft) : null
  const fingerprint = plan?.fingerprint ?? null
  useEffect(() => {
    if (!plan) return
    if (plan.action === 'none') { setSummary({ state: 'none', data: null }); return }
    if (plan.action === 'stored') { setSummary({ state: 'ready', data: plan.summary }); return }
    if (asked.current === fingerprint) return
    asked.current = fingerprint
    setSummary({ state: 'loading', data: null })
    api.summarize(plan.words, lang)
      .then(result => {
        const stored = storedSummary(result, fingerprint)
        if (!stored) { setSummary({ state: 'none', data: null }); return }
        change({ summary: stored })
      })
      .catch(err => { console.error('[anotar] síntese', err); setSummary({ state: 'none', data: null }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, plan?.action])

  if (status === 'loading') return <div style={s.screen} aria-busy="true" />
  if (status !== 'ready' || !draft) {
    return (
      <div style={s.screen}>
        <div style={s.header}>
          <button type="button" className="biblioteca-alvo" style={s.square} onClick={onBack} aria-label={N('back')}>
            <Icone name="left" />
          </button>
        </div>
        <p style={s.problem} role="alert">{status === 'missing' ? N('missingNote') : N('openError')}</p>
      </div>
    )
  }

  const marks = highlights ?? library.highlights
  const numbers = savedNumbers(draft, lang)
  const points = savedPoints(draft)
  const passages = savedPassages(draft, lang)
  const mark = markState(draft, marks)
  const shared = notice ? sharedLine(groups, notice.shared.map(x => x.groupId), lang) : null
  const notShared = notice?.failed.length ? (notice.reason === 'no_passage' ? notSharedNoPassage(lang) : notSharedFailed(lang)) : null

  // Sair desta tela (voltar, continuar, ler): o que mudou nos detalhes
  // fica gravado antes.
  async function go(next) {
    if (busy) return
    setBusy(true)
    await leave()
    next()
    // Se a tela continua aqui (a Bíblia não abriu), ela volta a responder.
    setBusy(false)
  }
  async function markOnBible() {
    const records = passagesToMark(draft, marks)
    if (marking || records.length === 0) return
    setMarking(true)
    try {
      const updated = await api.markPassages(records)
      setHighlights(updated ?? [...marks, ...records])
    } catch (err) {
      console.error('[anotar] marcar na Bíblia', err)
    } finally {
      setMarking(false)
    }
  }
  function openDetails(focus) {
    sharedBefore.current = draft.sharedGroupIds
    setDetails(focus)
  }
  // Fechar os detalhes: um grupo escolhido agora, numa anotação já
  // finalizada, recebe a anotação — e a linha de confirmação aparece.
  async function closeDetails() {
    setDetails(null)
    const ids = groupsToShare({ chosen: draft.sharedGroupIds, wasFinalized: !!draft.finalizedAt, sharedBefore: sharedBefore.current })
    if (ids.length === 0) return
    const result = await shareNote(api, draft, ids)
    if (result.failed.length) change({ sharedGroupIds: draft.sharedGroupIds.filter(id => !result.failed.includes(id)) })
    setNotice(result)
  }
  async function undoShare() {
    const undone = notice.shared
    setNotice(null)
    change({ sharedGroupIds: draft.sharedGroupIds.filter(id => !undone.some(x => x.groupId === id)) })
    await Promise.allSettled(undone.filter(x => x.postId).map(x => api.unpublish(x.postId)))
  }
  async function share() {
    setMenu(false)
    const text = shareTextOfNote(draft, lang)
    try {
      if (navigator.share) await navigator.share({ text })
      else await navigator.clipboard?.writeText(text)
    } catch { /* a pessoa fechou o seletor: não é erro */ }
  }
  async function remove() {
    setMenu(false)
    if (!(await perguntar({ title: t('confirmations.deleteNoteTitle', undefined, lang), text: t('confirmations.cantUndo', undefined, lang), confirmLabel: t('confirmations.deleteBtn', undefined, lang) }))) return
    discard()
    try {
      await api.remove(draft.id)
      onDeleted()
    } catch (err) {
      console.error('[anotar] apagar', err)
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.page} inert={details ? '' : undefined}>
        <div style={s.header}>
          <button type="button" className="biblioteca-alvo" style={s.square} onClick={() => go(onBack)} aria-label={N('back')}>
            <Icone name="left" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ ...s.title, ...(draft.title.trim() ? null : s.untitled) }}>{savedTitle(draft, lang)}</h1>
            <p style={s.sub}>{savedHeaderLine(draft, new Date(), lang)}</p>
          </div>
          <button type="button" className="biblioteca-alvo" style={s.square} onClick={() => setMenu(true)} aria-label={N('moreOptions')} aria-haspopup="dialog">
            <span style={s.dots} aria-hidden="true"><span style={s.dot} /><span style={s.dot} /><span style={s.dot} /></span>
          </button>
        </div>

        <div style={s.scroll}>
          <div style={s.body}>
            {summary.state !== 'none' && summary.state !== 'idle' && (
              <section style={s.summary} aria-label={summaryLabel(lang)} aria-busy={summary.state === 'loading'}>
                <h2 style={s.summaryLabel}>{summaryLabel(lang)}</h2>
                {summary.state === 'loading' ? (
                  <p style={{ ...s.summaryText, ...s.summaryWait }}>{N('analyzing')}</p>
                ) : (
                  <>
                    <p style={s.summaryText}>{summaryParts(summary.data).before}<strong style={s.summaryKey}>{summaryParts(summary.data).highlight}</strong>{summaryParts(summary.data).after}</p>
                    <p style={s.summaryNote}>{summaryNote(lang)}</p>
                  </>
                )}
              </section>
            )}

            {numbers.length > 0 && (
              <section style={s.numbers} aria-label={N('inNumbers')}>
                {numbers.map(n => (
                  <div key={n.key} style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.number}>{n.value}</p>
                    <p style={s.numberLabel}>{n.label}</p>
                  </div>
                ))}
                {Array.from({ length: 3 - numbers.length }, (_, i) => <div key={`vazio-${i}`} style={{ flex: 1 }} />)}
              </section>
            )}

            {points.length > 0 && (
              <section style={s.points} aria-label={pointsLabel(lang)}>
                <h2 style={s.label}>{pointsLabel(lang)}</h2>
                <ol style={s.pointList}>
                  {points.map(point => (
                    <li key={point.key} style={s.point}>
                      <span style={s.pointNumber} aria-hidden="true">{point.n}</span>
                      <span style={s.pointText}>{point.text}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {passages.length > 0 && (
              <section style={s.passages} aria-label={passagesLabel(lang)}>
                <div style={s.passagesHead}>
                  <h2 style={{ ...s.label, ...s.labelOnSand }}>{passagesLabel(lang)}</h2>
                  {mark === 'todo' && <button type="button" style={s.mark} onClick={markOnBible} disabled={marking}>{markLabel(lang)}</button>}
                  {mark === 'done' && <span style={s.marked} role="status">{N(passages.length === 1 ? 'markedOne' : 'markedMany')}</span>}
                </div>
                <div style={s.pills}>
                  {passages.map(p => (
                    <button key={p.key} type="button" className="biblioteca-etiqueta" style={s.pill} onClick={() => go(() => onOpenBiblePassage(p.book, p.chapter, p.verse ?? undefined))} aria-label={N('openInBible', { ref: p.label })}>{p.label}</button>
                  ))}
                </div>
              </section>
            )}

            {shared && (
              <p style={s.notice} role="status">
                <span style={{ flex: 1, minWidth: 0 }}>{shared}</span>
                <button type="button" style={s.undo} onClick={undoShare}>{N('undo')}</button>
              </p>
            )}
            {notShared && <p style={{ ...s.notice, ...s.noticeProblem }} role="status">{notShared}</p>}

            <section style={s.list} aria-label={N('more')}>
              <button type="button" style={{ ...s.row, ...s.rowLine }} onClick={() => go(onRead)}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={s.rowTitle}>{N('readWhole')}</span>
                  <span style={s.rowSub}>{readLine(draft, lang)}</span>
                </span>
                <Icone name="right" size={14} strokeWidth={2.2} color="var(--bento-t5)" />
              </button>
              <button type="button" style={s.row} onClick={() => openDetails('who')}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={s.rowTitle}>{N('whoSees')}</span>
                  <span style={s.rowSub}>{whoSeesLabel({ groups, selected: draft.sharedGroupIds, lang })}</span>
                </span>
                <Icone name="right" size={14} strokeWidth={2.2} color="var(--bento-t5)" />
              </button>
            </section>

            <button type="button" style={s.continue} onClick={() => go(onContinue)}>
              <span>{N('keepWriting')}</span>
              <Icone name="arrow" size={15} strokeWidth={2.2} color="var(--bento-accent)" />
            </button>
          </div>
        </div>
      </div>

      {details && (
        <DetalhesDaAnotacao
          lang={lang} draft={draft} library={library} groups={groups} memberCounts={memberCounts}
          focus={details} onChange={change} onClose={closeDetails}
        />
      )}
      {menu && (
        <FolhaDoItem
          title={savedTitle(draft, lang)} editLabel={N('editDetails')} onClose={() => setMenu(false)}
          onEdit={() => { setMenu(false); openDetails('type') }} onShare={share} onDelete={remove}
        />
      )}
      {folha}
    </div>
  )
}

const s = {
  screen: { position: 'relative', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  page: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 0' },
  square: { width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 13, background: 'var(--bento-card)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  dots: { display: 'flex', flexDirection: 'column', gap: 3 },
  dot: { width: 3.5, height: 3.5, borderRadius: 9, background: 'var(--bento-ink)' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  untitled: { color: 'var(--bento-t4)' },
  sub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  problem: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '18px 22px 0' },

  scroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  body: { padding: '14px 20px calc(22px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },

  summary: { borderRadius: 26, background: 'var(--bento-ink)', padding: '18px 18px 17px' },
  summaryLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  summaryText: { fontFamily: FONT, fontSize: 15.5, fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,.8)', margin: '12px 0', overflowWrap: 'anywhere' },
  summaryWait: { color: 'rgba(255,255,255,.6)', margin: '12px 0 0' },
  summaryKey: { fontWeight: 800, color: '#fff' },
  summaryNote: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.6)', margin: 0 },

  numbers: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px', display: 'flex', gap: 10 },
  number: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  numberLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1.25, color: 'var(--bento-t3)', margin: 0 },

  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  labelOnSand: { color: 'var(--bento-sand-label)' },
  points: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px 8px' },
  pointList: { listStyle: 'none', margin: '5px 0 0', padding: 0 },
  point: { display: 'flex', gap: 11, padding: '9px 0' },
  pointNumber: { width: 16, flexShrink: 0, fontFamily: FONT, fontSize: 13, fontWeight: 800, lineHeight: 1.45, color: 'var(--bento-accent)' },
  pointText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.45, color: 'var(--bento-ink)', overflowWrap: 'anywhere' },

  passages: { borderRadius: 24, background: 'var(--bento-sand)', padding: 16 },
  // A altura é a da ação (11px): alinhados pela linha de base, o rótulo
  // menor não a aumenta.
  passagesHead: { height: 11, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '0 2px 12px' },
  // 11px de texto, 44px de área de toque, sem mudar a altura da linha.
  mark: { flexShrink: 0, border: 'none', background: 'none', padding: '17px 0 17px 14px', margin: '-17px 0', fontFamily: FONT, fontSize: 11, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-icon)', cursor: 'pointer' },
  marked: { flexShrink: 0, fontFamily: FONT, fontSize: 11, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-label)' },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: { height: 32, border: 'none', borderRadius: 11, background: 'rgba(255,255,255,.6)', padding: '0 11px', display: 'flex', alignItems: 'center', fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-ink-strong)', whiteSpace: 'nowrap', cursor: 'pointer' },

  notice: { display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1.4, color: 'var(--bento-ink)', margin: '4px 4px 0' },
  noticeProblem: { color: 'var(--bento-now-text)' },
  undo: { flexShrink: 0, minHeight: 44, margin: '-12px 0', border: 'none', background: 'none', padding: '0 0 0 12px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-icon)', cursor: 'pointer' },

  list: { borderRadius: 24, background: 'var(--bento-card)', padding: '4px 18px' },
  row: { width: '100%', height: 56, boxSizing: 'content-box', border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' },
  rowLine: { borderBottom: '1px solid var(--bento-line)' },
  rowTitle: { display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 2px' },
  rowSub: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  continue: { flexShrink: 0, width: '100%', height: 54, border: 'none', borderRadius: 18, background: 'var(--bento-ink)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, lineHeight: 1, color: '#fff', cursor: 'pointer' },
}
