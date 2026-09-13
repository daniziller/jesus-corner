// ReportMessageSheet.jsx — 42p do handoff-admin-42 ("Membro denuncia"): a
// origem de todo o fluxo de moderação de mensagem do mural. Sem estado de
// dados próprio (quem chama já sabe QUAL mensagem/QUEM é o autor) — só a
// escolha do motivo e, em "Outro motivo", o texto livre. Reaproveita o
// mesmo esqueleto de folha inferior de FriendPickerSheet.jsx/CreateGroupSheet.jsx.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'

const FONT = 'var(--font-bento)'

// Ordem e ids batendo com o check constraint de group_message_reports.reason
// (migration 0065) — mudar aqui sem mudar lá quebra a denúncia.
const REASONS = ['propaganda', 'cobranca', 'linguagem_agressiva', 'conteudo_improprio', 'outro']

export default function ReportMessageSheet({ lang, reportedUserName, onClose, onSubmit }) {
  const [reason, setReason] = useState('propaganda')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(reason, reason === 'outro' ? detail : null)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handleWrap}><div style={s.handle} /></div>
        <p style={s.title}>{t('report.title', undefined, lang)}</p>
        <p style={s.subtitle}>{t('report.subtitle', { name: reportedUserName }, lang)}</p>

        <div style={s.optionList}>
          {REASONS.map((id, i) => (
            <button
              key={id} type="button" style={{ ...s.optionRow, ...(i === 0 ? { borderTop: 'none' } : {}) }}
              onClick={() => setReason(id)} aria-pressed={reason === id}
            >
              <span style={s.optionLabel}>{t(`report.reason.${id}`, undefined, lang)}</span>
              <span style={{ ...s.radio, ...(reason === id ? s.radioOn : {}) }}>
                {reason === id && <span style={s.radioDot} />}
              </span>
            </button>
          ))}
        </div>

        {reason === 'outro' && (
          <textarea
            style={s.detailInput} rows={3} value={detail} onChange={e => setDetail(e.target.value)}
            placeholder={t('report.detailPlaceholder', undefined, lang)}
          />
        )}

        {error && <p style={s.errorText}>{error}</p>}

        <button type="button" style={{ ...s.submitBtn, ...(submitting ? s.submitBtnDisabled : {}) }} onClick={handleSubmit} disabled={submitting}>
          {t('report.submitBtn', undefined, lang)}
        </button>
      </div>
    </div>,
    document.body,
  )
}

const s = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 170, background: 'rgba(26,23,20,.34)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-card)', borderRadius: '28px 28px 0 0', boxShadow: '0 -8px 30px rgba(0,0,0,.12)', padding: '10px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', animation: 'bookOpenIn .22s cubic-bezier(.32,.72,0,1)' },
  handleWrap: { display: 'flex', justifyContent: 'center', padding: '6px 0 10px' },
  handle: { width: 36, height: 4, borderRadius: 99, background: 'var(--bento-t6)' },
  title: { fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  subtitle: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '0 0 8px' },
  optionList: { display: 'flex', flexDirection: 'column' },
  optionRow: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 58, padding: '14px 0', border: 'none', borderTop: '1px solid var(--bento-line)', background: 'none', cursor: 'pointer', textAlign: 'left' },
  optionLabel: { fontFamily: FONT, fontSize: 15, fontWeight: 600, color: 'var(--bento-ink)' },
  radio: { width: 24, height: 24, flexShrink: 0, borderRadius: 99, border: '2px solid var(--bento-t6)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  radioOn: { border: '2px solid var(--bento-ink)' },
  radioDot: { width: 10, height: 10, borderRadius: 99, background: 'var(--bento-accent)' },
  detailInput: { width: '100%', border: 'none', borderRadius: 14, padding: '12px 14px', marginTop: 10, fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)', resize: 'none' },
  errorText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-destructive)', margin: '10px 0 0' },
  submitBtn: { width: '100%', height: 52, marginTop: 16, border: 'none', borderRadius: 16, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  submitBtnDisabled: { opacity: .6, cursor: 'default' },
}
