// ArchivePrayerRequestSheet.jsx — "Como Deus respondeu?" (quadro 36e,
// pacote 36-37, Bloco 2). Folha sobre 36d (ou sobre a etapa Súplica de
// PrayerScreen.jsx), com o texto do pedido visível acima.
//
// Cinco respostas fixas (texto do handoff, não gerado por IA); nenhuma
// vem pré-selecionada — "Guardar o pedido" fica desabilitado até escolher
// uma. "Espere" devolve pro Ativos sem zerar o contador de dias (não
// chama o servidor — ver archivePrayerRequest em prayerRequestsStore.js);
// as outras quatro arquivam com selo em Respondidos.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'
const RESPONSES = ['sim', 'nao', 'espere', 'aprenda', 'se_mova']

function labelKey(key) {
  return { sim: 'Sim', nao: 'Nao', espere: 'Espere', aprenda: 'Aprenda', se_mova: 'SeMova' }[key]
}

export default function ArchivePrayerRequestSheet({ request, lang, onClose, onArchive }) {
  const L = (k, vars) => t(`prayerRequests.${k}`, vars, lang)
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!selected || saving) return
    setSaving(true)
    try {
      await onArchive?.(request, selected, note)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.dimmedBody}>
        <p style={s.dimmedText}>{request?.body}</p>
      </div>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handleWrap}><div style={s.handle} /></div>
        <div style={s.scroll}>
          <p style={s.title}>{L('archiveTitle')}</p>
          <p style={s.sub}>{L('archiveSub')}</p>

          <div style={s.options}>
            {RESPONSES.map((key, i) => {
              const on = selected === key
              return (
                <button
                  key={key}
                  type="button"
                  style={{ ...s.option, ...(on ? s.optionOn : {}), ...(i > 0 ? { marginTop: 8 } : {}) }}
                  onClick={() => setSelected(key)}
                >
                  <span style={{ ...s.optionLabel, color: on ? '#fff' : 'var(--bento-ink)' }}>{L(`response${labelKey(key)}`)}</span>
                  <span style={{ ...s.optionExplain, color: on ? 'rgba(255,255,255,.65)' : 'var(--bento-t3)' }}>{L(`option${labelKey(key)}Explanation`)}</span>
                  {on && <span style={s.optionCheck}><AppIcon name="Check" size={16} strokeWidth={2.6} color="var(--bento-accent)" /></span>}
                </button>
              )
            })}
          </div>

          <div style={s.noteCard}>
            <p style={s.noteLabel}>{L('noteLabel')}</p>
            <input
              style={s.noteInput}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={L('notePlaceholder')}
              maxLength={240}
            />
          </div>
        </div>

        <div style={s.footer}>
          <button type="button" style={{ ...s.saveBtn, ...(!selected ? { opacity: .6 } : {}) }} onClick={save} disabled={!selected || saving}>
            {L('saveBtn')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const s = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(26,23,20,.55)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
  dimmedBody: { flexShrink: 0, padding: '28px 24px 0' },
  dimmedText: { fontFamily: FONT, fontSize: 19, fontWeight: 800, lineHeight: 1.3, color: 'rgba(255,255,255,.75)', margin: 0 },
  sheet: { width: '100%', maxWidth: 'var(--max-width)', maxHeight: '85vh', margin: '24px auto 0', alignSelf: 'center', background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column' },
  handleWrap: { flex: 'none', display: 'flex', justifyContent: 'center', padding: '14px 0 0' },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)' },
  scroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '18px 22px 4px' },
  title: { fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 8px' },
  sub: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: '0 0 18px' },
  options: { display: 'flex', flexDirection: 'column' },
  option: { position: 'relative', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 3, borderRadius: 18, border: 'none', background: 'var(--bento-card)', padding: '14px 44px 14px 18px', cursor: 'pointer' },
  optionOn: { background: 'var(--bento-ink)' },
  optionLabel: { fontFamily: FONT, fontSize: 14.5, fontWeight: 800, margin: 0 },
  optionExplain: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, margin: 0 },
  optionCheck: { position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex' },
  noteCard: { borderRadius: 18, background: 'var(--bento-card)', padding: '14px 18px', margin: '14px 0 16px' },
  noteLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 8px' },
  noteInput: { width: '100%', border: 'none', outline: 'none', background: 'none', boxSizing: 'border-box', fontFamily: FONT, fontSize: 14, fontWeight: 500, color: 'var(--bento-ink)' },
  footer: { flex: 'none', padding: '10px 22px calc(20px + var(--safe-bottom))' },
  saveBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
}
