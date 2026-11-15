// SeletorDeVersiculo.jsx — o seletor de versículo ("+ Versículo" de N2 e
// "Nota em um versículo" de N1, handoff-biblioteca-55): três toques —
// livro (com um campo que filtra a lista), capítulo e versículo(s). Mais
// de um versículo pode ser marcado: entra o trecho do menor ao maior, num
// bloco só (o trecho aparece embaixo do título antes de adicionar). Devolve, em `onPick`, { book, bookEn, chapter, verseStart,
// verseEnd, text } com o texto da versão em uso.
import { useState } from 'react'
import { GAMIFICATION_BOOKS, bookInfo } from '../../data/gamificationBlocks'
import { verseCount } from '../../data/versiculosPorCapitulo'
import { bookEnFor } from '../../bible/bibleSearch'
import { bookDisplayName } from '../../busca/referencia'
import { normalizeForSearch } from '../../bible/searchNormalize'
import { citationFromSelection, passageLabel } from '../../anotar/anotarMath'
import Icone from './Icone'
import { tr } from '../../i18n/tr.js'

const FONT = 'var(--font-bento)'

// `start` ({ book, chapter, selected }): abre já no capítulo, com os
// versículos marcados — o "+ versículo" da nota (N4); aí voltar fecha.
export default function SeletorDeVersiculo({ lang, api, onPick, onClose, confirmLabel: givenLabel = null, start = null }) {
  const N = (key, vars) => tr(lang, `notasTx.${key}`, vars)
  const confirmLabel = givenLabel ?? N('add')
  const [query, setQuery] = useState('')
  const [book, setBook] = useState(start ? bookInfo(start.book) : null)
  const [chapter, setChapter] = useState(start?.chapter ?? null)
  const [selected, setSelected] = useState(start?.selected ?? [])
  const [state, setState] = useState('idle')

  const step = !book ? 'book' : !chapter ? 'chapter' : 'verse'
  const wanted = normalizeForSearch(query.trim())
  const books = GAMIFICATION_BOOKS.filter(b => !wanted || normalizeForSearch(bookDisplayName(b.nome, lang)).includes(wanted))
  const title = N(step === 'book' ? 'pickBook' : step === 'chapter' ? 'pickChapter' : 'pickVerses')
  // Embaixo do título, o que já está escolhido: "Tiago", "Tiago 1",
  // "Tiago 1:3-4" (do menor ao maior versículo marcado).
  const where = step === 'book' ? null : passageLabel({ book: book.nome, chapter: chapter ?? '', verseStart: selected.length ? Math.min(...selected) : null, verseEnd: selected.length ? Math.max(...selected) : null }, lang).trim()

  function back() {
    setState('idle')
    if (start) onClose()
    else if (step === 'verse') { setChapter(null); setSelected([]) }
    else if (step === 'chapter') setBook(null)
    else onClose()
  }
  function toggle(verse) {
    setSelected(prev => (prev.includes(verse) ? prev.filter(v => v !== verse) : [...prev, verse]))
  }
  async function confirm() {
    if (selected.length === 0 || state === 'busy') return
    setState('busy')
    try {
      const verses = await api.chapterVerses(book.nome, chapter, lang)
      const quote = citationFromSelection({ book: book.nome, bookEn: bookEnFor(book.nome), chapter, verses, selected })
      if (!quote) throw new Error('verse_text_missing')
      onPick(quote)
    } catch (err) {
      console.error('[anotar] texto do versículo', err)
      setState('error')
    }
  }

  return (
    <div style={s.layer} role="dialog" aria-modal="true" aria-labelledby="anotar-seletor-titulo">
      <div style={s.header}>
        <button type="button" className="biblioteca-alvo" style={s.back} onClick={back} aria-label={N('back')}>
          <Icone name="left" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 id="anotar-seletor-titulo" style={{ ...s.title, ...(where ? null : s.titleAlone) }}>{title}</h1>
          {where && <p style={s.sub}>{where}</p>}
        </div>
        {step === 'verse' && selected.length > 0 && (
          <button type="button" className="biblioteca-alvo" style={s.add} onClick={confirm} disabled={state === 'busy'} aria-label={`${confirmLabel}: ${where}`}>{confirmLabel}</button>
        )}
      </div>

      <div style={s.scroll}>
        {state === 'error' && <p style={s.error} role="alert">{N('fetchError')}</p>}
        {step === 'book' && (
          <>
            <input type="search" className="busca-campo" style={s.search} value={query} placeholder={N('searchBook')} aria-label={N('searchBookAria')} autoFocus onChange={e => setQuery(e.target.value)} />
            <div style={s.list}>
              {books.map(b => (
                <button key={b.nome} type="button" style={s.row} onClick={() => setBook(b)}>{bookDisplayName(b.nome, lang)}</button>
              ))}
              {books.length === 0 && <p style={s.none}>{N('noBook')}</p>}
            </div>
          </>
        )}
        {step === 'chapter' && (
          <div style={s.grid}>
            {Array.from({ length: book.capitulos }, (_, i) => i + 1).map(n => (
              <button key={n} type="button" style={s.cell} onClick={() => setChapter(n)} aria-label={N('chapterAria', { n })}>{n}</button>
            ))}
          </div>
        )}
        {step === 'verse' && (
          <div style={s.grid}>
            {Array.from({ length: verseCount(book.nome, chapter) }, (_, i) => i + 1).map(n => {
              const on = selected.includes(n)
              return <button key={n} type="button" aria-pressed={on} style={{ ...s.cell, ...(on ? s.cellOn : null) }} onClick={() => toggle(n)} aria-label={N('verseN', { n })}>{n}</button>
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  layer: { position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 0', minHeight: 38 },
  back: { width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 13, background: 'var(--bento-card)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  titleAlone: { margin: 0 },
  sub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: 0 },
  add: { flexShrink: 0, height: 38, border: 'none', borderRadius: 13, background: 'var(--bento-accent)', padding: '0 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  scroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px calc(22px + var(--safe-bottom))' },
  search: { width: '100%', height: 48, boxSizing: 'border-box', border: 'none', borderRadius: 16, background: 'var(--bento-card)', outline: 'none', padding: '0 16px', fontFamily: FONT, fontSize: 14, fontWeight: 600, color: 'var(--bento-ink)', caretColor: 'var(--bento-accent)' },
  list: { display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0 0' },
  row: { width: '100%', minHeight: 46, border: 'none', borderRadius: 14, background: 'var(--bento-card)', padding: '0 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', textAlign: 'left', cursor: 'pointer' },
  none: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: '8px 2px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 },
  cell: { height: 44, border: 'none', borderRadius: 13, background: 'var(--bento-card)', padding: 0, fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)', fontVariantNumeric: 'tabular-nums', cursor: 'pointer' },
  cellOn: { background: 'var(--bento-ink)', fontWeight: 800, color: '#fff' },
  error: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1.45, color: 'var(--bento-now-text)', margin: '0 2px 12px' },
}
