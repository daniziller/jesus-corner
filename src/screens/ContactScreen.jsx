// ContactScreen.jsx — formulário "Fale Conosco" (aba Perfil > Fale Conosco).
// Nome/e-mail vêm pré-preenchidos da conta logada, mas continuam editáveis
// (quem quiser responder num e-mail diferente do cadastro pode). Grava
// direto na tabela contact_messages via contactStore.js.
//
// Sem quadro próprio no handoff — segue o mesmo padrão de tela secundária
// já usado em GroupAdminScreen.jsx/CreateStudyScreen.jsx (cabeçalho com
// voltar + título, cartões brancos raio 24, rótulo uppercase pequeno).
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { submitContactMessage } from '../contact/contactStore'

const FONT = 'var(--font-bento)'

export default function ContactScreen({ session, authUser, onBack }) {
  const { lang } = session
  const [name, setName] = useState(authUser?.name ?? '')
  const [email, setEmail] = useState(authUser?.email ?? '')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError(t('contact.requiredError', undefined, lang))
      return
    }
    setSending(true)
    setError('')
    try {
      await submitContactMessage({ name: name.trim(), email: email.trim(), message: message.trim() })
      setSent(true)
      setMessage('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={s.headerTitle}>{t('contact.heroTitle', undefined, lang)}</p>
          <p style={s.headerSub}>{t('contact.heroSub', undefined, lang)}</p>
        </div>
      </div>

      <div style={s.body}>
        {sent ? (
          <div style={s.darkCard}>
            <div style={s.darkIcon}><AppIcon name="Check" size={16} strokeWidth={2.8} color="var(--bento-ink)" /></div>
            <p style={s.successTitle}>{t('contact.successTitle', undefined, lang)}</p>
            <p style={s.successSub}>{t('contact.successSub', undefined, lang)}</p>
            <button style={s.sentBtn} onClick={() => setSent(false)}>{t('contact.sendAnother', undefined, lang)}</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={s.card}>
            <label style={s.fieldWrap}>
              <span style={s.fieldLabel}>{t('contact.nameLabel', undefined, lang)}</span>
              <input
                style={s.input}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('contact.namePlaceholder', undefined, lang)}
              />
            </label>
            <label style={s.fieldWrap}>
              <span style={s.fieldLabel}>{t('contact.emailLabel', undefined, lang)}</span>
              <input
                style={s.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('contact.emailPlaceholder', undefined, lang)}
              />
            </label>
            <label style={s.fieldWrap}>
              <span style={s.fieldLabel}>{t('contact.messageLabel', undefined, lang)}</span>
              <textarea
                style={s.textarea}
                rows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('contact.messagePlaceholder', undefined, lang)}
              />
            </label>

            {error && <p style={s.errorText}>{error}</p>}

            <button type="submit" style={{ ...s.submitBtn, opacity: sending ? .6 : 1 }} disabled={sending}>
              {sending ? t('contact.sending', undefined, lang) : t('contact.submitBtn', undefined, lang)}
            </button>
          </form>
        )}

        {/* Canal do titular de dados. A Resolução CD/ANPD nº 2/2022 dispensa
            agentes de pequeno porte de nomear encarregado, desde que
            mantenham um canal divulgado — precisa estar visível, não só
            existir. Ver docs/lgpd.md. */}
        <div style={s.sandCard}>
          <div style={s.sandHead}>
            <AppIcon name="Shield" size={14} color="var(--bento-sand-icon)" />
            <p style={s.sandTitle}>{t('contact.lgpdTitle', undefined, lang)}</p>
          </div>
          <p style={s.sandBody}>{t('contact.lgpdBody', undefined, lang)}</p>
        </div>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  input: { width: '100%', border: 'none', borderRadius: 14, padding: '13px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)', boxSizing: 'border-box' },
  textarea: { width: '100%', border: 'none', borderRadius: 14, padding: '13px 14px', fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#DC2626', margin: 0, textAlign: 'center' },
  submitBtn: { width: '100%', height: 52, borderRadius: 16, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },

  darkCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '26px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' },
  darkIcon: { width: 34, height: 34, borderRadius: 12, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle: { fontFamily: FONT, fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 },
  successSub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.55)', lineHeight: 1.5, maxWidth: 260, margin: 0 },
  sentBtn: { marginTop: 6, height: 40, padding: '0 18px', borderRadius: 13, border: 'none', background: 'rgba(255,255,255,.08)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.85)', cursor: 'pointer' },

  sandCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 18px' },
  sandHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  sandTitle: { fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  sandBody: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-sand-ink)', lineHeight: 1.5, margin: 0 },
}
