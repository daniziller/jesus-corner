// DetalhesDaAnotacao.jsx — os detalhes de uma anotação (N3, handoff-
// biblioteca-55 §7A.3). Sobe por cima da página de escrever: o tipo (três
// colunas, com "Livre" e os tipos que a pessoa criou), de onde veio
// (título, preletor, instituição, link — tudo opcional; com o tipo Livre,
// só o título), as etiquetas e quem vê. As mudanças valem na hora (são
// gravadas com o rascunho); "Pronto" só volta para a página. Escolher um
// grupo aqui só guarda a escolha — nada vai a grupo nesta tela.
import { useState, useEffect, useRef } from 'react'
import {
  typeOptions, customTypesOf, sourceRows, fieldSuggestions, createdLine, tagVocabulary, tagChoices, toggleTag,
  whoSeesBlocks, toggleWhoSees, whoSeesWarning, WHO_SEES_NOTE,
} from '../../anotar/anotarMath'
import Icone from './Icone'
import QuemVe from './QuemVe'
import EtiquetasDaAnotacao from './EtiquetasDaAnotacao'

const FONT = 'var(--font-bento)'

export default function DetalhesDaAnotacao({ lang, draft, library, groups, memberCounts, focus = null, onChange, onClose }) {
  const [creatingType, setCreatingType] = useState(false)
  const [typeText, setTypeText] = useState('')
  const titleRef = useRef(null)
  const tagsRef = useRef(null)
  const whoRef = useRef(null)
  // Abre já no ponto pedido: o campo Título em foco, as etiquetas ou "Quem vê".
  useEffect(() => {
    if (focus === 'title') titleRef.current?.focus()
    else if (focus === 'tags') tagsRef.current?.scrollIntoView({ block: 'center' })
    else if (focus === 'who') whoRef.current?.scrollIntoView({ block: 'center' })
  }, [focus])
  useEffect(() => {
    const onKeyDown = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const others = library.sermonNotes.filter(note => note.id !== draft.id)
  const types = typeOptions(customTypesOf(library.sermonNotes), draft.noteType)
  // As etiquetas da pessoa como estavam ao abrir (a ordem não pula enquanto ela marca e desmarca).
  const vocabulary = tagVocabulary(library)
  const warning = whoSeesWarning({ selected: draft.sharedGroupIds, passages: draft.passages })

  function confirmType() {
    const clean = typeText.trim()
    if (clean) onChange({ noteType: clean })
    setTypeText('')
    setCreatingType(false)
  }

  return (
    <div style={s.layer} role="dialog" aria-modal="true" aria-labelledby="anotar-detalhes-titulo">
      <div style={s.header}>
        <button type="button" className="biblioteca-alvo" style={s.close} onClick={onClose} aria-label="Fechar os detalhes">
          <Icone name="down" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 id="anotar-detalhes-titulo" style={s.title}>Detalhes da anotação</h1>
          <p style={s.sub}>{createdLine(draft.createdAt, lang)}</p>
        </div>
        <button type="button" className="biblioteca-alvo" style={s.done} onClick={onClose}>Pronto</button>
      </div>

      <div style={s.scroll}>
        <div style={s.body}>
          <section style={s.card} aria-label="O que você está anotando">
            <h2 style={s.label}>O que você está anotando</h2>
            <div style={s.grid} role="radiogroup" aria-label="O que você está anotando">
              {types.map(option => (
                <button key={option.key} type="button" role="radio" aria-checked={option.on} style={{ ...s.type, ...(option.on ? s.typeOn : null) }} onClick={() => onChange({ noteType: option.key })}>
                  <span style={{ ...s.dot, ...(option.on ? s.dotOn : null) }} />
                  <span style={s.typeName}>{option.label}</span>
                </button>
              ))}
            </div>
            {creatingType ? (
              <input
                autoFocus type="text" style={s.typeInput} value={typeText} maxLength={32} placeholder="Retiro, célula, devocional em família…" aria-label="Outro tipo"
                onChange={e => setTypeText(e.target.value)} onBlur={confirmType}
                onKeyDown={e => { if (e.key === 'Enter') confirmType(); if (e.key === 'Escape') { setTypeText(''); setCreatingType(false) } }}
              />
            ) : (
              <button type="button" className="biblioteca-alvo" style={s.otherType} onClick={() => setCreatingType(true)}>
                <span style={{ flex: 1 }}>Outro tipo…</span>
                <Icone name="right" size={14} strokeWidth={2.2} color="var(--bento-t5)" />
              </button>
            )}
          </section>

          <section style={s.source} aria-label="De onde veio">
            <div style={s.labelRow}>
              <h2 style={s.label}>De onde veio</h2>
              <span style={s.hint}>tudo opcional</span>
            </div>
            <div style={{ height: 6 }} />
            {sourceRows(draft.noteType).map((row, i, rows) => {
              const suggestions = row.key === 'preacher' || row.key === 'church' ? fieldSuggestions(others, row.key) : []
              return (
                <label key={row.key} style={{ ...s.row, ...(i < rows.length - 1 ? s.rowLine : null) }}>
                  <span style={s.rowLabel}>{row.label}</span>
                  <input
                    ref={row.key === 'title' ? titleRef : null}
                    type={row.key === 'link' ? 'url' : 'text'} inputMode={row.key === 'link' ? 'url' : undefined}
                    className="anotar-campo" style={s.input} value={draft[row.key] ?? ''} placeholder={row.placeholder}
                    list={suggestions.length ? `anotar-sugestoes-${row.key}` : undefined} autoComplete="off"
                    onChange={e => onChange({ [row.key]: e.target.value })}
                  />
                  {suggestions.length > 0 && <datalist id={`anotar-sugestoes-${row.key}`}>{suggestions.map(value => <option key={value} value={value} />)}</datalist>}
                </label>
              )
            })}
          </section>

          <section ref={tagsRef} style={s.card} aria-label="Etiquetas">
            <div style={s.labelRow}>
              <h2 style={s.label}>Etiquetas</h2>
              <span style={s.hint}>para achar depois</span>
            </div>
            <EtiquetasDaAnotacao choices={tagChoices(vocabulary, draft.tags)} onToggle={tag => onChange({ tags: toggleTag(draft.tags, tag) })} />
          </section>

          <section ref={whoRef} style={s.who} aria-label="Quem vê">
            <h2 style={s.label}>Quem vê</h2>
            <QuemVe
              blocks={whoSeesBlocks({ groups, memberCounts, selected: draft.sharedGroupIds })}
              onToggle={key => onChange({ sharedGroupIds: toggleWhoSees(draft.sharedGroupIds, key) })}
            />
            <p style={s.note}>{WHO_SEES_NOTE}</p>
            {warning && <p style={s.warning} role="status">{warning}</p>}
          </section>
        </div>
      </div>
    </div>
  )
}

const s = {
  layer: { position: 'absolute', inset: 0, zIndex: 4, display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 0' },
  close: { width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 13, background: 'var(--bento-card)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: 0 },
  done: { flexShrink: 0, height: 38, border: 'none', borderRadius: 13, background: 'var(--bento-accent)', padding: '0 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  scroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  body: { padding: '14px 20px calc(22px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 16 },
  who: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 16px 14px' },
  source: { borderRadius: 24, background: 'var(--bento-card)', padding: '14px 18px 4px' },
  // A altura é a do apoio (11px): alinhados pela linha de base, o rótulo
  // menor não a aumenta.
  labelRow: { height: 11, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  hint: { fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, margin: '12px 0 0' },
  type: { minWidth: 0, height: 46, border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: '0 13px', display: 'flex', alignItems: 'center', gap: 9, fontFamily: FONT, fontSize: 13, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)', textAlign: 'left', cursor: 'pointer' },
  typeOn: { background: 'var(--bento-ink)', fontWeight: 800, color: '#fff' },
  typeName: { minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '2px 0' },
  dot: { width: 7, height: 7, flexShrink: 0, borderRadius: 99, background: 'var(--bento-t6)' },
  dotOn: { background: 'var(--bento-accent)' },
  otherType: { width: '100%', height: 40, border: 'none', background: 'none', padding: 0, margin: '6px 0 -6px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-sand-icon)', textAlign: 'left', cursor: 'pointer' },
  typeInput: { width: '100%', height: 44, boxSizing: 'border-box', border: 'none', borderRadius: 14, background: 'var(--bento-line)', outline: '2px solid var(--bento-ink)', padding: '0 13px', margin: '8px 0 0', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)' },

  row: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 50, cursor: 'text' },
  rowLine: { minHeight: 51, borderBottom: '1px solid var(--bento-line)' },
  rowLabel: { width: 84, flexShrink: 0, fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)' },
  // O texto fica 1px acima do centro do campo, como o valor da linha no quadro.
  input: { flex: 1, minWidth: 0, height: 44, border: 'none', background: 'none', outline: 'none', padding: '0 0 2px', fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)', caretColor: 'var(--bento-accent)' },

  note: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: '0 2px' },
  warning: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, lineHeight: 1.45, color: 'var(--bento-now-text)', margin: '8px 2px 0' },
}
