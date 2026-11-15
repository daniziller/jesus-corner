// NotaDeVersiculoScreen.jsx — a nota em um versículo (N4, handoff-
// biblioteca-55 §7A.4). Abre pelas ações do versículo na leitura, pela
// folha "Nova" (aí o seletor de versículo vem antes) e ao tocar numa nota
// na Biblioteca. O versículo em areia, a nota, as etiquetas e "Quem vê" —
// que nasce em "Só eu" e só vale ao tocar em "Pronto". Não há botão de
// gravar: a nota é gravada sozinha (useNotaDeVersiculo.js).
import { useState, useEffect, useRef } from 'react'
import { useNotaDeVersiculo } from '../anotar/useNotaDeVersiculo'
import { anotarApi } from '../anotar/anotarApi'
import { noteTitle, noteSubtitle, verseReference, verseRange, notePlaceholder, whoSeesVerseNote } from '../anotar/notaMath'
import { tagVocabulary, tagChoices, toggleTag, whoSeesBlocks, toggleWhoSees, insertDictation } from '../anotar/anotarMath'
import { useKeyboardInset } from '../passos/useKeyboardInset'
import { useSpeechToText } from '../utils/useSpeechToText'
import CampoDeBloco from '../components/anotar/CampoDeBloco'
import EtiquetasDaAnotacao from '../components/anotar/EtiquetasDaAnotacao'
import QuemVe from '../components/anotar/QuemVe'
import SeletorDeVersiculo from '../components/anotar/SeletorDeVersiculo'
import Icone from '../components/anotar/Icone'
import { tr } from '../i18n/tr.js'

const FONT = 'var(--font-bento)'
const NO_GROUPS = []

// Sem trecho nem marcação (a folha "Nova"): o seletor de livro, capítulo
// e versículo vem primeiro.
export default function NotaDeVersiculoScreen({ lang = 'pt', api = anotarApi, reference = null, highlight = null, highlightId = null, onClose, ...rest }) {
  const N = (key, vars) => tr(lang, `notasTx.${key}`, vars)
  const [picked, setPicked] = useState(reference)
  if (!picked && !highlight && !highlightId) {
    return (
      <div style={s.screen}>
        <SeletorDeVersiculo
          lang={lang} api={api} confirmLabel={N('continue')} onClose={onClose}
          onPick={quote => setPicked({ book: quote.book, bookEn: quote.bookEn, chapter: quote.chapter, verses: verseRange(quote.verseStart, quote.verseEnd) })}
        />
      </div>
    )
  }
  return <Nota lang={lang} api={api} reference={picked} highlight={highlight} highlightId={highlightId} onClose={onClose} {...rest} />
}

function Nota({ lang, api, reference, highlight, highlightId, groups = NO_GROUPS, sessionMode = 'browse', onHighlights = null, onClose }) {
  const N = (key, vars) => tr(lang, `notasTx.${key}`, vars)
  const { status, note, library, chosen, setChosen, verseText, save, change, setVerses, leave } = useNotaDeVersiculo({ api, lang, reference, highlight, highlightId, sessionMode, onHighlights })
  const keyboardInset = useKeyboardInset()
  const [memberCounts, setMemberCounts] = useState({})
  const [extending, setExtending] = useState(false)
  const [focus, setFocus] = useState(null)
  const [busy, setBusy] = useState(false)
  const fieldRef = useRef(null)
  const tagsRef = useRef(null)
  const focusKey = useRef(0)

  const groupIds = groups.map(g => g.groupId).join(',')
  useEffect(() => {
    if (!groupIds) return undefined
    let cancelled = false
    api.memberCounts(groupIds.split(',')).then(counts => { if (!cancelled) setMemberCounts(counts ?? {}) }).catch(() => {})
    return () => { cancelled = true }
  }, [api, groupIds])

  const focusAt = caret => { focusKey.current += 1; setFocus({ key: focusKey.current, caret }) }

  // Uma nota nova abre pronta para escrever.
  const opened = useRef(false)
  useEffect(() => {
    if (status !== 'ready' || !note || opened.current) return
    opened.current = true
    if (!note.text) focusAt(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, note])

  // O ditado entra onde está o cursor; sem cursor, no fim do texto.
  const dictation = useSpeechToText({
    lang,
    onResult: heard => {
      if (!note) return
      const el = fieldRef.current
      const active = !!el && el === document.activeElement
      const next = insertDictation(note.text, heard, active ? el.selectionStart : null, active ? el.selectionEnd : null)
      change({ text: next.text })
      if (active) focusAt(next.caret)
    },
  })

  if (status === 'loading') return <div style={s.screen} aria-busy="true" />
  if (status !== 'ready' || !note) {
    return (
      <div style={s.screen}>
        <div style={s.header}>
          <button type="button" className="biblioteca-alvo" style={s.back} onClick={onClose} aria-label={N('back')}>
            <Icone name="left" />
          </button>
        </div>
        <p style={s.problem} role="alert">{status === 'missing' ? N('missingVerseNote') : N('openVerseError')}</p>
      </div>
    )
  }

  const ref = verseReference(note, lang)
  const version = api.versionShort(lang)
  // As etiquetas da pessoa como estavam ao abrir (a ordem não pula enquanto ela marca e desmarca).
  const vocabulary = tagVocabulary(library)

  async function close(done) {
    if (busy) return
    setBusy(true)
    await leave({ done, versionShort: version })
    onClose()
  }
  function showTags() {
    tagsRef.current?.scrollIntoView({ block: 'center' })
    tagsRef.current?.querySelector('button')?.focus({ preventScroll: true })
  }

  return (
    <div style={{ ...s.screen, paddingBottom: keyboardInset }}>
      <div style={s.page} inert={extending ? '' : undefined}>
        <div style={s.header}>
          <button type="button" className="biblioteca-alvo" style={s.back} onClick={() => close(false)} aria-label={N('back')}>
            <Icone name="left" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={s.title}>{noteTitle(note, lang)}</h1>
            <p style={s.sub}>{noteSubtitle({ groups, shared: note.sharedGroupIds }, lang)}</p>
          </div>
          <button type="button" className="biblioteca-alvo" style={s.done} onClick={() => close(true)} disabled={busy}>{N('done')}</button>
        </div>
        {save.error && <p style={s.saveError} role="status">{N('saveError')}</p>}

        <div style={s.scroll} data-anotar-rolagem>
          <div style={s.body}>
            <section style={s.verse} aria-label={N('verseAria', { ref })}>
              {verseText && <p style={s.verseText}>&quot;{verseText}&quot;</p>}
              <div style={s.verseFoot}>
                <span style={s.verseRef}>{[ref, version].filter(Boolean).join(' · ')}</span>
                <button type="button" style={s.more} onClick={() => setExtending(true)} aria-label={N('extendAria')}>{N('plusVerse')}</button>
              </div>
            </section>

            <section style={s.note} aria-label={N('theNote')}>
              <CampoDeBloco
                value={note.text} onChange={text => change({ text })} focus={focus} revealKey={keyboardInset} style={s.text} aria-label={N('yourNote')}
                onFocus={e => { fieldRef.current = e.target }}
              />
              <div style={s.tools}>
                <button type="button" style={s.hash} onClick={showTags} aria-label={N('tags')}>#</button>
                <span style={s.helper}>{note.text.trim() ? '' : notePlaceholder(lang)}</span>
                {dictation.supported && (
                  <button
                    type="button" style={{ ...s.voice, ...(dictation.listening ? s.voiceOn : null) }} aria-pressed={dictation.listening} aria-label={N('dictate')}
                    onPointerDown={e => e.preventDefault()} onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
                  >
                    <Icone name="mic" size={17} color={dictation.listening ? 'var(--bento-ink)' : 'var(--bento-accent)'} />
                  </button>
                )}
              </div>
            </section>

            <section ref={tagsRef} style={s.card} aria-label={N('tags')}>
              <h2 style={s.label}>{N('tags')}</h2>
              <EtiquetasDaAnotacao choices={tagChoices(vocabulary, note.tags)} onToggle={tag => change({ tags: toggleTag(note.tags, tag) })} />
            </section>

            <section style={s.who} aria-label={N('whoSees')}>
              <h2 style={s.label}>{N('whoSees')}</h2>
              <QuemVe blocks={whoSeesBlocks({ groups, memberCounts, selected: chosen, lang })} onToggle={key => setChosen(prev => toggleWhoSees(prev, key))} />
              <p style={s.line}>{whoSeesVerseNote(lang)}</p>
            </section>
          </div>
        </div>
      </div>

      {extending && (
        <SeletorDeVersiculo
          lang={lang} api={api} confirmLabel={N('done')} start={{ book: note.book, chapter: note.chapter, selected: note.verses }}
          onClose={() => setExtending(false)}
          onPick={quote => { setExtending(false); setVerses(verseRange(quote.verseStart, quote.verseEnd)) }}
        />
      )}
    </div>
  )
}

const s = {
  screen: { position: 'relative', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  page: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 0' },
  back: { width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 13, background: 'var(--bento-card)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  done: { flexShrink: 0, height: 38, border: 'none', borderRadius: 13, background: 'var(--bento-accent)', padding: '0 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  saveError: { flexShrink: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 700, lineHeight: 1.45, color: 'var(--bento-now-text)', margin: '10px 22px 0' },
  problem: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '18px 22px 0' },

  scroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  body: { padding: '14px 20px calc(22px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },

  verse: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px 15px' },
  verseText: { fontFamily: FONT, fontSize: 16, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--bento-sand-ink-strong)', margin: '0 0 9px', overflowWrap: 'anywhere' },
  verseFoot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  verseRef: { minWidth: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-icon)' },
  // 11px de texto, 44px de área de toque, sem mudar a altura da linha.
  more: { flexShrink: 0, border: 'none', background: 'none', padding: '17px 0 17px 14px', margin: '-17px 0', fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-sand-label)', cursor: 'pointer' },

  note: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 18px 14px' },
  text: { minHeight: 150, fontFamily: FONT, fontSize: 17, fontWeight: 500, lineHeight: 1.6, letterSpacing: '-.2px', color: 'var(--bento-ink)' },
  tools: { display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--bento-line)', padding: '12px 0 0' },
  hash: { flexShrink: 0, width: 44, height: 44, border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: 0, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  helper: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t4)', padding: '0 4px' },
  voice: { flexShrink: 0, width: 44, height: 44, border: 'none', borderRadius: 14, background: 'var(--bento-ink)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  voiceOn: { background: 'var(--bento-accent)' },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 16 },
  who: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 16px 14px' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  line: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: '0 2px' },
}
