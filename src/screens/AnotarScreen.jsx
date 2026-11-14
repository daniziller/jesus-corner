// AnotarScreen.jsx — a página onde as anotações são feitas (N2, handoff-
// biblioteca-55 §7A.2). Uma página só para qualquer tipo — sermão, culto,
// aula, palestra, vídeo, livre e os tipos que a pessoa criou; o tipo muda
// o que vem preenchido, não a tela. Não há botão de gravar: a anotação é
// gravada sozinha (useAnotacao.js); a seta para baixo fecha e o rascunho
// fica; "Finalizar" encerra.
//
// O texto é uma lista de blocos (anotarMath.js): parágrafo, tópico
// numerado e versículo citado — um bloco areia que entra e sai inteiro.
// As quatro ferramentas ficam no pé do cartão e, com o teclado aberto,
// numa barra colada acima dele. Os detalhes (N3) sobem por cima.
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAnotacao } from '../anotar/useAnotacao'
import { anotarApi } from '../anotar/anotarApi'
import {
  UNTITLED, headerSecondLine, noteTypeName, passagesPill, tagsPill, annotatingLabel, topicNumbers, addTopic, topicEnter,
  backspaceAtStart, removeCitation, insertCitation, insertDictation, passageRows, noteHasContent,
} from '../anotar/anotarMath'
import { useKeyboardInset } from '../passos/useKeyboardInset'
import { useSpeechToText } from '../utils/useSpeechToText'
import CampoDeBloco from '../components/anotar/CampoDeBloco'
import DetalhesDaAnotacao from '../components/anotar/DetalhesDaAnotacao'
import SeletorDeVersiculo from '../components/anotar/SeletorDeVersiculo'
import FolhaDePassagens from '../components/anotar/FolhaDePassagens'
import Icone from '../components/anotar/Icone'

const FONT = 'var(--font-bento)'
const NO_GROUPS = []

export default function AnotarScreen({ lang = 'pt', api = anotarApi, target, groups = NO_GROUPS, initialDetails = null, onClose, onFinalized, onOpenBiblePassage }) {
  const { status, draft, library, save, change, persist, leave, finalize, seconds } = useAnotacao({ api, target })
  const keyboardInset = useKeyboardInset()
  const keyboardOpen = keyboardInset > 0

  const [focusedId, setFocusedId] = useState(null)
  const [focusRequest, setFocusRequest] = useState(null)
  const [details, setDetails] = useState(initialDetails)
  const [picking, setPicking] = useState(false)
  const [passagesOpen, setPassagesOpen] = useState(false)
  const [memberCounts, setMemberCounts] = useState({})
  const [busy, setBusy] = useState(false)
  const [, setTick] = useState(0)
  const fieldRef = useRef(null)
  const focusKey = useRef(0)

  // O tempo anotando e "salvo há {n} min" andam sozinhos.
  useEffect(() => {
    const timer = setInterval(() => setTick(n => n + 1), 20000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (groups.length === 0) return undefined
    let cancelled = false
    api.memberCounts(groups.map(g => g.groupId)).then(counts => { if (!cancelled) setMemberCounts(counts ?? {}) }).catch(() => {})
    return () => { cancelled = true }
  }, [api, groups])

  const focusOn = useCallback((id, caret = null) => {
    if (!id) return
    focusKey.current += 1
    setFocusRequest({ id, key: focusKey.current, caret })
  }, [])

  // Uma anotação nova ou um rascunho abrem prontos para escrever, com o
  // cursor no fim; uma já finalizada abre para ler.
  const opened = useRef(false)
  useEffect(() => {
    if (status !== 'ready' || !draft || opened.current) return
    opened.current = true
    if (!draft.finalizedAt) focusOn(draft.body[draft.body.length - 1].id)
  }, [status, draft, focusOn])

  // O ditado entra onde está o cursor; sem cursor, no fim do texto.
  const dictation = useSpeechToText({
    lang,
    onResult: heard => {
      if (!draft) return
      const el = fieldRef.current
      const active = !!el && el === document.activeElement
      const seg = draft.body.find(b => b.id === focusedId && (b.type === 'text' || b.type === 'topic')) ?? draft.body[draft.body.length - 1]
      const next = insertDictation(seg.text, heard, active ? el.selectionStart : null, active ? el.selectionEnd : null)
      change(prev => ({ ...prev, body: prev.body.map(b => (b.id === seg.id ? { ...b, text: next.text } : b)) }))
      if (active) focusOn(seg.id, next.caret)
    },
  })

  if (status === 'loading') return <div style={s.screen} aria-busy="true" />
  if (status === 'error' || !draft) {
    return (
      <div style={s.screen}>
        <div style={s.header}>
          <button type="button" className="biblioteca-alvo" style={s.close} onClick={onClose} aria-label="Fechar">
            <Icone name="down" />
          </button>
        </div>
        <p style={s.problem} role="alert">Não deu para abrir a anotação agora. Confira sua internet e tente de novo.</p>
      </div>
    )
  }

  const numbers = topicNumbers(draft.body)
  const empty = draft.body.length === 1 && !draft.body[0].text
  const passages = passagesPill(draft)
  const tags = tagsPill(draft)
  const typeName = noteTypeName(draft.noteType)

  function apply(result) {
    change(prev => ({ ...prev, body: result.body, ...(result.passages ? { passages: result.passages } : null) }))
    if (result.focusId) focusOn(result.focusId, result.caret ?? null)
  }
  function setText(segId, text) {
    change(prev => ({ ...prev, body: prev.body.map(seg => (seg.id === segId ? { ...seg, text } : seg)) }))
  }
  function onFieldKeyDown(seg, e) {
    if (e.key === 'Enter' && seg.type === 'topic' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      apply(topicEnter(draft.body, seg.id))
      return
    }
    if (e.key === 'Backspace' && e.target.selectionStart === 0 && e.target.selectionEnd === 0) {
      const result = backspaceAtStart(draft, seg.id)
      if (result) { e.preventDefault(); apply(result) }
    }
  }
  function onCitationKeyDown(seg, e) {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return
    e.preventDefault()
    apply(removeCitation(draft, seg.id))
  }

  async function close() {
    if (busy) return
    setBusy(true)
    await leave()
    onClose()
  }
  async function finish() {
    if (busy) return
    if (!noteHasContent(draft)) { close(); return }
    setBusy(true)
    const saved = await finalize()
    setBusy(false)
    if (saved) onFinalized(saved)
  }
  async function openInBible({ book, chapter, verse }) {
    await persist()
    onOpenBiblePassage(book, chapter, verse ?? undefined)
  }

  // As ferramentas não tiram o cursor do texto (o teclado não fecha).
  const keepFocus = e => e.preventDefault()
  const tools = (
    <>
      <button type="button" style={s.tool} onPointerDown={keepFocus} onClick={() => setPicking(true)}>
        <Icone name="plus" size={14} color="var(--bento-sand-icon)" />Versículo
      </button>
      <button type="button" style={s.tool} onPointerDown={keepFocus} onClick={() => apply(addTopic(draft.body, focusedId))}>
        <Icone name="lines" size={14} />Tópico
      </button>
      <button type="button" style={s.toolSquare} onPointerDown={keepFocus} onClick={() => setDetails('tags')} aria-label="Etiquetas">#</button>
      <span style={{ flex: 1 }} />
      {dictation.supported && (
        <button
          type="button" style={{ ...s.voice, ...(dictation.listening ? s.voiceOn : null) }} aria-pressed={dictation.listening} aria-label="Ditar"
          onPointerDown={keepFocus} onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
        >
          <Icone name="mic" size={17} color={dictation.listening ? 'var(--bento-ink)' : 'var(--bento-accent)'} />
        </button>
      )}
    </>
  )

  const covered = !!details || picking
  return (
    <div style={{ ...s.screen, paddingBottom: keyboardInset }}>
      <div style={s.page} inert={covered ? '' : undefined}>
        <div style={s.header}>
          <button type="button" className="biblioteca-alvo" style={s.close} onClick={close} aria-label="Fechar a anotação">
            <Icone name="down" />
          </button>
          <button type="button" style={s.heading} onClick={() => setDetails('title')} aria-label={`${draft.title.trim() || UNTITLED}. Abrir os detalhes da anotação`}>
            <span style={{ ...s.title, ...(draft.title.trim() ? null : s.untitled) }}>{draft.title.trim() || UNTITLED}</span>
            <span style={s.sub}>{headerSecondLine(draft, save)}</span>
          </button>
          <button type="button" className="biblioteca-alvo" style={s.finish} onClick={finish} disabled={busy}>Finalizar</button>
        </div>
        {save.error && <p style={s.saveError} role="status">Não deu para gravar agora. O texto está guardado neste aparelho e vai ser gravado quando a internet voltar.</p>}

        <div style={s.pills}>
          <button type="button" className="biblioteca-pastilha" style={s.typePill} onClick={() => setDetails('type')} aria-label={`Tipo: ${typeName}`}>
            <span style={s.typeSquare} />
            <span style={s.typeName}>{typeName}</span>
            <Icone name="down" size={11} color="var(--bento-t3)" />
          </button>
          {passages && <button type="button" className="biblioteca-pastilha" style={s.passagesPill} onClick={() => setPassagesOpen(true)}>{passages}</button>}
          {tags && <button type="button" className="biblioteca-pastilha" style={s.tagsPill} onClick={() => setDetails('tags')} aria-label={`Etiquetas: ${draft.tags.length}`}>{tags}</button>}
          <span style={{ flex: 1 }} />
          <span style={s.time} aria-label={`${annotatingLabel(seconds())} anotando`}>{annotatingLabel(seconds())}</span>
        </div>

        <div style={s.scroll} data-anotar-rolagem>
          <div style={s.wrap}>
            <div style={s.card}>
              {draft.body.map((seg, i) => {
                const last = i === draft.body.length - 1
                if (seg.type === 'quote' || seg.type === 'link') {
                  return (
                    <div
                      key={seg.id} style={{ ...s.quote, ...(last ? s.lastBlock : null) }} tabIndex={0} role="group" onKeyDown={e => onCitationKeyDown(seg, e)}
                      aria-label={`Versículo citado: ${seg.ref}. Apagar remove o bloco inteiro.`}
                    >
                      {seg.type === 'quote' && <p style={s.quoteText}>&quot;{seg.text}&quot;</p>}
                      <div style={s.quoteFoot}>
                        <span style={s.quoteRef}>{[seg.ref, api.versionShort(lang)].filter(Boolean).join(' · ')}</span>
                        <button type="button" style={s.quoteOpen} onClick={() => openInBible({ book: seg.book, chapter: seg.chapter, verse: seg.verseStart })} aria-label={`Abrir ${seg.ref} na Bíblia`}>abrir</button>
                      </div>
                    </div>
                  )
                }
                const focus = focusRequest?.id === seg.id ? focusRequest : null
                const fieldProps = {
                  value: seg.text, focus, revealKey: keyboardInset,
                  onChange: text => setText(seg.id, text),
                  onFocus: e => { setFocusedId(seg.id); fieldRef.current = e.target },
                  onKeyDown: e => onFieldKeyDown(seg, e),
                }
                if (seg.type === 'topic') {
                  const closes = draft.body[i + 1]?.type !== 'topic'
                  return (
                    <div key={seg.id} style={{ ...s.topic, ...(closes ? s.topicLast : null), ...(last ? s.lastBlock : null) }}>
                      <span style={s.topicNumber} aria-hidden="true">{numbers[seg.id]}</span>
                      <CampoDeBloco {...fieldProps} style={s.topicText} aria-label={`Tópico ${numbers[seg.id]}`} enterKeyHint="enter" />
                    </div>
                  )
                }
                return (
                  <CampoDeBloco
                    key={seg.id} {...fieldProps} style={{ ...s.paragraph, ...(last ? s.lastBlock : null) }} className="anotar-campo"
                    placeholder={empty ? 'Comece a escrever…' : undefined} aria-label="Texto da anotação"
                  />
                )
              })}
              {!keyboardOpen && <div style={s.toolbar} role="toolbar" aria-label="Ferramentas">{tools}</div>}
            </div>
          </div>
        </div>

        {keyboardOpen && <div style={s.dock} role="toolbar" aria-label="Ferramentas">{tools}</div>}
      </div>

      {passagesOpen && <FolhaDePassagens rows={passageRows(draft, lang)} onClose={() => setPassagesOpen(false)} onOpen={row => { setPassagesOpen(false); openInBible(row) }} />}
      {picking && (
        <SeletorDeVersiculo
          lang={lang} api={api} onClose={() => setPicking(false)}
          onPick={quote => { setPicking(false); apply(insertCitation(draft, quote, focusedId, lang)) }}
        />
      )}
      {details && (
        <DetalhesDaAnotacao
          lang={lang} draft={draft} library={library} groups={groups} memberCounts={memberCounts}
          focus={details} onChange={change} onClose={() => setDetails(null)}
        />
      )}
    </div>
  )
}

const s = {
  screen: { position: 'relative', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  page: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 0' },
  close: { width: 38, height: 38, flexShrink: 0, border: 'none', borderRadius: 13, background: 'var(--bento-card)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  heading: { flex: 1, minWidth: 0, minHeight: 44, margin: '-3px 0', border: 'none', background: 'none', padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left', cursor: 'pointer' },
  title: { display: 'block', maxWidth: '100%', fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  untitled: { color: 'var(--bento-t4)' },
  sub: { display: 'block', maxWidth: '100%', fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  finish: { flexShrink: 0, height: 38, border: 'none', borderRadius: 13, background: 'var(--bento-accent)', padding: '0 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  saveError: { flexShrink: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 700, lineHeight: 1.45, color: 'var(--bento-now-text)', margin: '10px 22px 0' },
  problem: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '18px 22px 0' },

  pills: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px 0' },
  typePill: { minWidth: 0, height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-card)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  typeSquare: { width: 8, height: 8, flexShrink: 0, borderRadius: 3, background: 'var(--bento-sand-icon)' },
  typeName: { minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '2px 0' },
  passagesPill: { flexShrink: 0, height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-sand)', padding: '0 12px', fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-icon)', whiteSpace: 'nowrap', cursor: 'pointer' },
  tagsPill: { flexShrink: 0, height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-card)', padding: '0 12px', fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', whiteSpace: 'nowrap', cursor: 'pointer' },
  time: { flexShrink: 0, fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t4)', fontVariantNumeric: 'tabular-nums' },

  scroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  wrap: { padding: '12px 20px calc(22px + var(--safe-bottom))' },
  card: { borderRadius: 26, background: 'var(--bento-card)', padding: '22px 22px 16px' },
  paragraph: { fontFamily: FONT, fontSize: 17, fontWeight: 500, lineHeight: 1.65, letterSpacing: '-.2px', color: 'var(--bento-ink)', margin: '0 0 16px' },
  lastBlock: { margin: 0 },
  quote: { borderRadius: 18, background: 'var(--bento-sand)', padding: '13px 15px', margin: '0 0 16px', outlineOffset: 2 },
  quoteText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--bento-sand-ink-strong)', margin: '0 0 7px', overflowWrap: 'anywhere' },
  quoteFoot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  quoteRef: { minWidth: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-icon)' },
  quoteOpen: { flexShrink: 0, border: 'none', background: 'none', padding: '17px 0 17px 14px', margin: '-17px 0', fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-sand-label)', cursor: 'pointer' },
  topic: { display: 'flex', alignItems: 'flex-start', gap: 11, margin: '0 0 9px' },
  topicLast: { margin: '0 0 16px' },
  topicNumber: { width: 24, height: 24, flexShrink: 0, borderRadius: 8, background: 'var(--bento-ink)', margin: '2px 0 0', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, lineHeight: '24px', color: '#fff', textAlign: 'center', fontVariantNumeric: 'tabular-nums' },
  topicText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 16, fontWeight: 700, lineHeight: 1.5, letterSpacing: '-.2px', color: 'var(--bento-ink)' },

  toolbar: { display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--bento-line)', margin: '18px 0 0', padding: '14px 0 0' },
  dock: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--bento-line)', background: 'var(--bento-card)', padding: '8px 20px' },
  tool: { flexShrink: 0, height: 44, border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: '0 13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  toolSquare: { flexShrink: 0, width: 44, height: 44, border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: 0, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  voice: { flexShrink: 0, width: 44, height: 44, border: 'none', borderRadius: 14, background: 'var(--bento-ink)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  voiceOn: { background: 'var(--bento-accent)' },
}
