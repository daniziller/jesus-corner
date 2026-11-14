// FolhaNova.jsx — a folha que o botão "Nova" da Biblioteca abre (N1,
// handoff-biblioteca-55 §7A.1): "O que você quer guardar?" e quatro
// opções — só "Anotação livre" em preto — e, se há uma anotação não
// finalizada, a linha do rascunho. `draft` vem de notaMath.js/draftLine.
import FolhaInferior from '../FolhaInferior'
import { NEW_OPTIONS, NEW_TITLE, NEW_SUPPORT } from '../../anotar/notaMath'
import Icone from './Icone'

const FONT = 'var(--font-bento)'
const MARKER = { accent: 'var(--bento-accent)', sand: 'var(--bento-sand-icon)', ink: 'var(--bento-ink)' }

export default function FolhaNova({ draft = null, onChoose, onOpenDraft, onClose }) {
  return (
    <FolhaInferior fixed form onClose={onClose} labelledBy="biblioteca-nova-titulo">
      <h2 id="biblioteca-nova-titulo" style={s.title}>{NEW_TITLE}</h2>
      <p style={s.support}>{NEW_SUPPORT}</p>
      <div style={s.options}>
        {NEW_OPTIONS.map(option => (
          <button key={option.key} type="button" style={{ ...s.option, ...(option.dark ? s.optionDark : null) }} onClick={() => onChoose(option.key)}>
            <span style={{ ...s.marker, borderRadius: option.marker === 'circle' ? 99 : 3, background: MARKER[option.color] }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ ...s.optionTitle, ...(option.dark ? s.onDark : null) }}>{option.title}</span>
              <span style={{ ...s.optionSupport, ...(option.dark ? s.supportOnDark : null) }}>{option.support}</span>
            </span>
            {option.dark
              ? <Icone name="arrow" size={15} strokeWidth={2.2} color="var(--bento-accent)" />
              : <Icone name="right" size={14} strokeWidth={2.2} color="var(--bento-t5)" />}
          </button>
        ))}
      </div>
      {draft && (
        <button type="button" style={s.draft} onClick={() => onOpenDraft(draft.id)} aria-label={draft.aria}>
          <span style={s.diamond} />
          <span style={s.draftText}>{draft.lead}<strong style={s.draftTitle}>{draft.title}</strong>{draft.tail}</span>
          <Icone name="right" size={14} strokeWidth={2.2} color="var(--bento-t5)" />
        </button>
      )}
    </FolhaInferior>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  support: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 14px' },
  options: { display: 'flex', flexDirection: 'column', gap: 8 },
  option: { width: '100%', border: 'none', borderRadius: 22, background: 'var(--bento-card)', padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', cursor: 'pointer' },
  optionDark: { background: 'var(--bento-ink)' },
  marker: { width: 10, height: 10, flexShrink: 0 },
  optionTitle: { display: 'block', fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.3px', color: 'var(--bento-ink)', margin: '0 0 3px' },
  optionSupport: { display: 'block', fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-t3)' },
  onDark: { color: '#fff' },
  supportOnDark: { color: 'rgba(255,255,255,.6)' },
  // A linha fica a 14px das opções; os 14px de cima e de baixo são dela,
  // para a área de toque passar de 44px sem mudar o espaço.
  draft: { width: 'calc(100% - 4px)', border: 'none', background: 'none', padding: '14px 0', margin: '0 2px -14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' },
  diamond: { width: 7, height: 7, flexShrink: 0, borderRadius: 1.5, background: 'var(--bento-accent)', transform: 'rotate(45deg)' },
  draftText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-quote-ink)' },
  draftTitle: { fontWeight: 800, color: 'var(--bento-ink)' },
}
