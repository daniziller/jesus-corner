// FolhaDeConfirmacao.jsx — a folha que pede confirmação antes de uma ação
// que não tem volta na Comunidade (sair de um grupo, apagar um grupo, um
// recado, um pedido…), no lugar da caixa "OK/Cancelar" do navegador.
// `onConfirm` devolve uma promessa: enquanto ela roda a folha espera; se
// falhar, a folha fica aberta e avisa.
import { useState } from 'react'
import FolhaInferior from '../FolhaInferior'
import AppIcon from '../../icons/AppIcon'
import { t } from '../../i18n'

const FONT = 'var(--font-bento)'

export default function FolhaDeConfirmacao({ lang, title, text, keeps, confirmLabel, cancelLabel, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function confirm() {
    setBusy(true)
    setFailed(false)
    try {
      await onConfirm()
    } catch (err) {
      console.error('[comunidade] confirmar', err)
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <FolhaInferior onClose={busy ? () => {} : onClose} labelledBy="confirmacao-titulo" fixed over>
      <div data-folha="confirmacao">
        <h2 style={s.title} id="confirmacao-titulo">{title}</h2>
        <p style={s.text}>{text}</p>
        {keeps && (
          <div style={s.keeps}>
            <AppIcon name="Check" size={17} strokeWidth={2.4} color="var(--bento-sand-icon)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={s.keepsText}>{keeps}</p>
          </div>
        )}
        {failed && <p style={s.error} role="alert">{t('community.confirmFailed', undefined, lang)}</p>}
        <button type="button" style={{ ...s.confirm, ...(busy ? { opacity: 0.5 } : null) }} onClick={confirm} disabled={busy}>
          {busy ? t('community.confirmWorking', undefined, lang) : confirmLabel}
        </button>
        <button type="button" style={s.cancel} onClick={onClose} disabled={busy}>{cancelLabel}</button>
      </div>
    </FolhaInferior>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '2px 0 8px' },
  text: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-quote-ink)', margin: '0 0 14px' },
  keeps: { borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start' },
  keepsText: { fontFamily: FONT, fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  error: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-now-text)', margin: '0 0 12px' },
  confirm: { width: '100%', height: 54, border: 'none', borderRadius: 18, background: 'var(--bento-ink)', color: '#fff', fontFamily: FONT, fontSize: 15, fontWeight: 800, cursor: 'pointer' },
  cancel: { width: '100%', height: 48, marginTop: 4, border: 'none', background: 'none', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-quote-ink)', cursor: 'pointer' },
}
