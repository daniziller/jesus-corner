// ContactScreen.jsx — formulário "Fale Conosco" (aba Perfil > Fale Conosco).
// Nome/e-mail vêm pré-preenchidos da conta logada, mas continuam editáveis
// (quem quiser responder num e-mail diferente do cadastro pode). Grava
// direto na tabela contact_messages via contactStore.js.
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { submitContactMessage } from '../contact/contactStore'

export default function ContactScreen({ session, authUser }) {
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
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header"><h1 className="page-title">{t('contact.pageTitle', undefined, lang)}</h1></div>

      <div style={styles.body}>
        <div style={styles.hero}>
          <div style={styles.heroOrb} />
          <span style={{ position: 'relative' }}><AppIcon name="Mail" size={26} color="white" /></span>
          <p style={{ position: 'relative', ...styles.heroTitle }}>{t('contact.heroTitle', undefined, lang)}</p>
          <p style={{ position: 'relative', ...styles.heroSub }}>{t('contact.heroSub', undefined, lang)}</p>
        </div>

        {sent ? (
          <div style={styles.successCard}>
            <AppIcon name="CheckCircle2" size={30} color="#16A34A" />
            <p style={styles.successTitle}>{t('contact.successTitle', undefined, lang)}</p>
            <p style={styles.successSub}>{t('contact.successSub', undefined, lang)}</p>
            <button className="btn-secondary" style={{ width: 'auto', marginTop: 6, padding: '9px 20px' }} onClick={() => setSent(false)}>
              {t('contact.sendAnother', undefined, lang)}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.fieldWrap}>
              <span style={styles.fieldLabel}>{t('contact.nameLabel', undefined, lang)}</span>
              <input
                style={styles.input}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('contact.namePlaceholder', undefined, lang)}
              />
            </label>
            <label style={styles.fieldWrap}>
              <span style={styles.fieldLabel}>{t('contact.emailLabel', undefined, lang)}</span>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('contact.emailPlaceholder', undefined, lang)}
              />
            </label>
            <label style={styles.fieldWrap}>
              <span style={styles.fieldLabel}>{t('contact.messageLabel', undefined, lang)}</span>
              <textarea
                style={styles.textarea}
                rows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('contact.messagePlaceholder', undefined, lang)}
              />
            </label>

            {error && <p style={styles.errorMsg}>{error}</p>}

            <button type="submit" className="btn-primary" disabled={sending}>
              {sending ? t('contact.sending', undefined, lang) : t('contact.submitBtn', undefined, lang)}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const styles = {
  body:        { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  hero:        { position: 'relative', overflow: 'hidden', borderRadius: 22, padding: '22px 20px', background: 'var(--grad-vivid)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center', boxShadow: 'var(--shadow-glow)' },
  heroOrb:     { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.18)', filter: 'blur(50px)', top: -70, right: -50 },
  heroTitle:   { fontSize: 15, fontWeight: 800, color: 'white', marginTop: 4, letterSpacing: '-0.2px' },
  heroSub:     { fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.85)', lineHeight: 1.5, maxWidth: 280 },
  form:        { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: 'var(--shadow-card)' },
  fieldWrap:   { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel:  { fontSize: 10, fontWeight: 700, color: 'var(--g5)', letterSpacing: 0.3, textTransform: 'uppercase' },
  input:       { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'var(--g1)', boxSizing: 'border-box' },
  textarea:    { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', outline: 'none', background: 'var(--g1)', resize: 'vertical', boxSizing: 'border-box' },
  errorMsg:    { fontSize: 12.5, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' },
  successCard: { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  successTitle:{ fontSize: 14, fontWeight: 800, color: 'var(--bk)', marginTop: 4 },
  successSub:  { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, maxWidth: 260 },
}
