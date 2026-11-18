// Folha "Permitir a escrita assistida?" — abre quando uma função de
// escrita assistida foi usada sem o consentimento ai_processing (ver
// aiConsentGate.js). Explica para onde o texto vai (art. 9º e 33) e grava a
// escolha no registro de consentimento. "Agora não" não grava nada: a
// função só continua indisponível.
import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { setConsent, PURPOSES } from './consent'
import { onAiConsentRequired } from './aiConsentGate'

const FONT = 'var(--font-bento)'

export default function AiConsentSheet() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState('ask') // ask | saving | done | error
  const lang = getAppLanguage() ?? 'pt'
  const L = k => t(`aiConsent.${k}`, undefined, lang)

  useEffect(() => onAiConsentRequired(() => { setState('ask'); setOpen(true) }), [])
  if (!open) return null

  async function allow() {
    setState('saving')
    try {
      await setConsent(PURPOSES.AI_PROCESSING, true)
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <div style={styles.backdrop} onClick={() => setOpen(false)}>
      <div style={styles.sheet} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        {state === 'done' ? (
          <>
            <p style={styles.title}>{L('doneTitle')}</p>
            <p style={styles.body}>{L('doneBody')}</p>
            <button type="button" style={styles.primary} onClick={() => setOpen(false)}>{L('ok')}</button>
          </>
        ) : (
          <>
            <p style={styles.kicker}>{L('kicker')}</p>
            <p style={styles.title}>{L('title')}</p>
            <p style={styles.body}>{L('body')}</p>
            <p style={styles.small}>{L('small')}</p>
            {state === 'error' && <p style={styles.error}>{L('error')}</p>}
            <button type="button" style={styles.primary} disabled={state === 'saving'} onClick={allow}>{state === 'saving' ? L('saving') : L('allow')}</button>
            <button type="button" style={styles.secondary} onClick={() => setOpen(false)}>{L('notNow')}</button>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 480, background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', padding: '24px 20px calc(24px + var(--safe-bottom, 0px))', boxSizing: 'border-box' },
  kicker: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 6px' },
  title: { fontFamily: FONT, fontSize: 21, fontWeight: 800, letterSpacing: '-.5px', lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 10px' },
  body: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)', margin: '0 0 10px' },
  small: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: '0 0 16px' },
  error: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-accent)', margin: '0 0 10px' },
  primary: { width: '100%', height: 52, border: 'none', borderRadius: 16, background: 'var(--bento-accent)', color: '#fff', fontFamily: FONT, fontSize: 15, fontWeight: 800, cursor: 'pointer', margin: '0 0 8px' },
  secondary: { width: '100%', height: 44, border: 'none', borderRadius: 16, background: 'transparent', color: 'var(--bento-t2)', fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
}
