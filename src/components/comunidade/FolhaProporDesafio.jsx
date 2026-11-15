// FolhaProporDesafio.jsx — a folha de propor um desafio de leitura ao
// grupo: nome, uma frase (opcional), os livros e por quanto tempo. As
// regras (o que falta preencher, quando termina) são de comunidadeMath.js.
import { useState } from 'react'
import FolhaInferior from '../FolhaInferior'
import { t } from '../../i18n'
import { CHALLENGE_DURATIONS, challengeFormError, challengeEnd } from '../../comunidade/comunidadeMath'

const FONT = 'var(--font-bento)'
const DURATION_LABEL = { '7d': 'duration7', '14d': 'duration14', '30d': 'duration30', custom: 'durationCustom' }

export default function FolhaProporDesafio({ lang, blocks, onClose, onCreate }) {
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [books, setBooks] = useState([])
  const [duration, setDuration] = useState('7d')
  const [customDate, setCustomDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const toggle = book => setBooks(list => (list.includes(book) ? list.filter(b => b !== book) : [...list, book]))

  async function submit(ev) {
    ev.preventDefault()
    const missing = challengeFormError({ name, books, duration, customDate })
    if (missing) { setError(t(missing, undefined, lang)); return }
    setBusy(true)
    setError(null)
    try {
      await onCreate({ name: name.trim(), description: description.trim(), books, endsAt: challengeEnd({ duration, customDate }) })
    } catch (err) {
      console.error('[grupo] propor desafio', err)
      setError(L('challengeFailed'))
      setBusy(false)
    }
  }

  return (
    <FolhaInferior onClose={busy ? () => {} : onClose} labelledBy="propor-desafio" fixed form focusField>
      <form onSubmit={submit} data-folha="propor-desafio">
        <h2 style={s.title} id="propor-desafio">{L('proposeTitle')}</h2>
        <p style={s.sub}>{L('proposeSub')}</p>

        <label style={s.field}>
          <span style={s.fieldLabel}>{L('challengeName')}</span>
          <input className="passo-campo" style={s.input} value={name} onChange={ev => setName(ev.target.value)} placeholder={L('challengeNamePlaceholder')} maxLength={100} />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>{L('challengeDescription')}</span>
          <input className="passo-campo" style={s.input} value={description} onChange={ev => setDescription(ev.target.value)} placeholder={L('challengeDescriptionPlaceholder')} maxLength={500} />
        </label>

        <div style={s.field}>
          <p style={s.fieldLabel}>{books.length === 0 ? L('challengeBooks') : `${L('challengeBooks')} · ${books.length}`}</p>
          <div style={s.books}>
            {blocks.map(block => (
              <div key={block.id}>
                <p style={s.blockName}>{lang === 'en' ? block.nameEn : block.name}</p>
                <div style={s.chips}>
                  {block.books.map((book, i) => {
                    const on = books.includes(book)
                    return <button key={book} type="button" aria-pressed={on} style={{ ...s.chip, ...(on ? s.chipOn : null) }} onClick={() => toggle(book)} data-livro={book}>{lang === 'en' ? block.booksEn[i] : book}</button>
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.field}>
          <p style={s.fieldLabel}>{L('challengeDuration')}</p>
          <div style={{ ...s.chips, marginTop: 10 }} role="radiogroup" aria-label={L('challengeDuration')}>
            {[...CHALLENGE_DURATIONS.map(d => d.id), 'custom'].map(id => (
              <button key={id} type="button" role="radio" aria-checked={duration === id} style={{ ...s.chip, ...(duration === id ? s.chipOn : null) }} onClick={() => setDuration(id)}>{L(DURATION_LABEL[id])}</button>
            ))}
          </div>
          {duration === 'custom' && (
            <label style={{ display: 'block', marginTop: 12 }}>
              <span style={s.fieldLabel}>{L('challengeUntil')}</span>
              <input type="date" style={{ ...s.input, height: 44 }} value={customDate} onChange={ev => setCustomDate(ev.target.value)} />
            </label>
          )}
        </div>

        {error && <p style={s.error} role="alert">{error}</p>}
        <button type="submit" style={{ ...s.primary, ...(busy ? { opacity: 0.5 } : null) }} disabled={busy}>{busy ? t('confirmSheet.working', undefined, lang) : L('startChallenge')}</button>
        <button type="button" style={s.cancel} onClick={onClose} disabled={busy}>{L('cancel')}</button>
      </form>
    </FolhaInferior>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t2)', margin: '0 0 14px' },
  field: { display: 'block', borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px 15px', marginBottom: 10 },
  fieldLabel: { display: 'block', fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1.3, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t2)', margin: 0 },
  input: { display: 'block', width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'none', padding: 0, margin: '9px 0 0', fontFamily: FONT, fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-ink)' },
  books: { maxHeight: 250, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 },
  blockName: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t2)', margin: '10px 0 6px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 44, minWidth: 44, border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: '0 13px', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  chipOn: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },
  error: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-now-text)', margin: '2px 2px 10px' },
  primary: { width: '100%', height: 54, marginTop: 4, border: 'none', borderRadius: 18, background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  cancel: { width: '100%', height: 48, marginTop: 4, border: 'none', background: 'none', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },
}
