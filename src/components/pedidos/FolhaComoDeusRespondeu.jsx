// FolhaComoDeusRespondeu.jsx — "Como Deus respondeu?" (O3, handoff-passos-
// pedidos-53-54 §9). Folha inferior aberta ao tocar num pedido meu.
//
// O pedido aparece dentro da folha, com há quanto tempo e quantas vezes
// foi orado. As cinco respostas ficam numa grade de duas colunas (a quinta
// na linha inteira) e nenhuma vem escolhida. Com "Sim", "Não", "Aprenda"
// ou "Se mova" o pedido é guardado em Respondidos; com "Espere" ele
// CONTINUA ativo — o botão diz "Seguir orando" e nada é gravado.
//
// A linha "Comentários" leva ao detalhe do pedido: os comentários
// continuam existindo, e é lá que ficam.
import { useState } from 'react'
import AppIcon from '../../icons/AppIcon'
import FolhaInferior from '../FolhaInferior'
import { ANSWER_OPTIONS, answerSheetState, prayedSummary, commentsLine } from '../../pedidos/pedidosMath.js'

const FONT = 'var(--font-bento)'

export default function FolhaComoDeusRespondeu({ request, onClose, onArchive, onOpenComments }) {
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const sheet = answerSheetState(selected)

  async function save() {
    if (!sheet.canSave || saving) return
    setSaving(true)
    try {
      await onArchive?.(request, selected, note)
    } finally {
      setSaving(false)
    }
  }

  return (
    <FolhaInferior onClose={onClose} labelledBy="como-deus-respondeu" fixed form>
      <h2 style={s.title} id="como-deus-respondeu">Como Deus respondeu?</h2>
      <p style={s.sub}>Todo pedido orado tem resposta — nem toda resposta é sim.</p>

      <div style={s.request}>
        <p style={s.requestBody}>{request.body}</p>
        <p style={s.requestSub}>{prayedSummary(request)}</p>
      </div>

      <div style={s.grid} role="radiogroup" aria-labelledby="como-deus-respondeu">
        {ANSWER_OPTIONS.map((opt, i) => {
          const on = opt.key === selected
          const wide = i === ANSWER_OPTIONS.length - 1 && ANSWER_OPTIONS.length % 2 === 1
          return (
            <button
              key={opt.key} type="button" role="radio" aria-checked={on}
              style={{ ...s.option, ...(wide ? s.optionWide : null), ...(on ? s.optionOn : null) }}
              onClick={() => setSelected(opt.key)}
            >
              <span style={{ ...s.optionTitle, ...(on ? { color: '#fff' } : null) }}>{opt.title}</span>
              <span style={{ ...s.optionSub, ...(on ? { color: 'rgba(255,255,255,.6)' } : null) }}>{opt.sub}</span>
            </button>
          )
        })}
      </div>

      <label style={s.noteCard}>
        <span style={s.noteLabel}>O que eu vi (opcional)</span>
        <input
          className="passo-campo" style={s.noteInput} value={note} onChange={e => setNote(e.target.value)}
          placeholder="Uma linha para lembrar daqui a um ano." maxLength={240}
        />
      </label>

      {onOpenComments && (
        <button type="button" style={s.comments} onClick={onOpenComments}>
          <span style={{ flex: 1 }}>{commentsLine(request.commentCount) ? `Comentários · ${request.commentCount}` : 'Comentários'}</span>
          <AppIcon name="ChevronRight" size={14} strokeWidth={2.6} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
        </button>
      )}

      <button type="button" style={{ ...s.save, ...(sheet.canSave ? null : s.saveOff) }} onClick={save} disabled={!sheet.canSave || saving}>
        {sheet.button}
      </button>
    </FolhaInferior>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 6px' },

  request: { borderRadius: 16, background: 'var(--bento-sand)', padding: '11px 14px', margin: '8px 0 12px' },
  requestBody: { fontFamily: FONT, fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-sand-ink-strong)', margin: '0 0 2px', overflowWrap: 'anywhere' },
  requestSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-sand-label)', margin: 0 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, margin: '0 0 10px' },
  option: { border: 'none', borderRadius: 16, background: 'var(--bento-card)', padding: '12px 10px', textAlign: 'left', cursor: 'pointer' },
  optionWide: { gridColumn: '1 / -1' },
  optionOn: { background: 'var(--bento-ink)' },
  optionTitle: { display: 'block', fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1.1, color: 'var(--bento-ink)', margin: '0 0 4px' },
  optionSub: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)' },

  noteCard: { display: 'block', borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px 15px', margin: '0 0 14px', cursor: 'text' },
  noteLabel: { display: 'block', fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  noteInput: { display: 'block', width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'none', padding: 0, margin: '9px 0 0', fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-ink)' },

  // Fora do quadro: a entrada para os comentários do pedido.
  comments: { width: '100%', height: 50, boxSizing: 'border-box', border: 'none', borderRadius: 20, background: 'var(--bento-card)', padding: '0 16px', margin: '-4px 0 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },

  save: { width: '100%', height: 54, border: 'none', borderRadius: 18, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 14.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  saveOff: { opacity: 0.45, cursor: 'default' },
}
