// As caixas de consentimento — uma lista só, usada no cadastro
// (SignupScreen), na tela de política atualizada (ConsentRefreshScreen) e
// antes de entrar com Google/Apple (LoginScreen). Revisão de LGPD de
// 2026-11-18: cada finalidade numa caixa própria, todas desmarcadas.
//
//   Obrigatórias: idade (18+), termos e privacidade, dados sobre a fé.
//     A dos dados sobre a fé (dado sensível, art. 11 I) vem destacada —
//     cartão com borda laranja e título —, lista as finalidades e lembra
//     de não identificar outras pessoas nos pedidos de oração.
//   Opcionais: escrita assistida (o texto vai para a Anthropic, nos EUA —
//     art. 33) e e-mails de novidades.
import { t } from '../i18n'
import { termsUrl, privacyUrl } from '../utils/legalLinks'
import AppIcon from '../icons/AppIcon'
import { PURPOSES } from './consent'

const FONT = 'var(--font-bento)'

export const EMPTY_CHOICES = { adult: false, terms: false, sensitive: false, ai: false, marketing: false }

export function requiredChecked(c) {
  return c.adult && c.terms && c.sensitive
}

// O que gravar no servidor a partir das caixas.
export function consentRecords(c) {
  return [
    { purpose: PURPOSES.ADULT, granted: c.adult },
    { purpose: PURPOSES.TERMS, granted: c.terms },
    { purpose: PURPOSES.SENSITIVE_DATA, granted: c.sensitive },
    { purpose: PURPOSES.AI_PROCESSING, granted: c.ai },
    { purpose: PURPOSES.MARKETING_EMAIL, granted: c.marketing },
  ]
}

export default function ConsentChoices({ value, onChange, lang }) {
  const set = key => () => onChange({ ...value, [key]: !value[key] })
  const A = k => t(`auth.${k}`, undefined, lang)
  const L = k => t(`account.${k}`, undefined, lang)
  const stop = e => e.stopPropagation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Row checked={value.adult} onToggle={set('adult')}>{A('consentAdult')}</Row>
      <Row checked={value.terms} onToggle={set('terms')}>
        {L('consentPrefix')}
        <a href={termsUrl(lang)} target="_blank" rel="noopener noreferrer" style={styles.link} onClick={stop}>{L('consentTerms')}</a>
        {L('consentMiddle')}
        <a href={privacyUrl(lang)} target="_blank" rel="noopener noreferrer" style={styles.link} onClick={stop}>{L('consentPrivacy')}</a>
        {L('consentSuffix')}
      </Row>
      <Row checked={value.sensitive} onToggle={set('sensitive')} highlight kicker={A('sensitiveKicker')} hint={A('sensitiveHint')}>
        {A('agreeToSensitiveData')}
      </Row>
      <Row checked={value.ai} onToggle={set('ai')}>{A('agreeToAi')}</Row>
      <Row checked={value.marketing} onToggle={set('marketing')}>{A('agreeToMarketing')}</Row>
    </div>
  )
}

function Row({ checked, onToggle, highlight = false, kicker, hint, children }) {
  return (
    <div
      role="checkbox" aria-checked={checked} tabIndex={0} onClick={onToggle}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle() } }}
      style={{ ...styles.card, ...(highlight ? styles.cardHighlight : null) }}
    >
      <div style={{ ...styles.box, background: checked ? 'var(--bento-accent)' : 'var(--bento-line)' }}>
        {checked && <AppIcon name="Check" size={14} strokeWidth={2.8} color="var(--bento-ink)" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {kicker && <p style={styles.kicker}>{kicker}</p>}
        <p style={styles.text}>{children}</p>
        {hint && <p style={styles.hint}>{hint}</p>}
      </div>
    </div>
  )
}

const styles = {
  card: { borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 13, cursor: 'pointer' },
  cardHighlight: { boxShadow: 'inset 0 0 0 2px var(--bento-accent)' },
  box: { width: 26, height: 26, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  kicker: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '2px 0 4px' },
  text: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t2)', margin: 0 },
  hint: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '6px 0 0' },
  link: { color: 'var(--bento-accent)', fontWeight: 700, textDecoration: 'none' },
}
