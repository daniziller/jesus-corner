// WelcomeScreen.jsx — Boas-vindas (quadro 13a do redesign Bento).
//
// A única tela do app que pode ser uma capa: fundo escuro, a assinatura da
// marca (símbolo na placa clara + logotipo, quadro 16a/13a), a frase, as três
// promessas reais do produto e dois caminhos — "Começar a ler" (primário,
// sem conta) e "Já tenho conta". Ninguém precisa de conta para ler; a conta
// entra depois da primeira leitura (ver SignupScreen.jsx, quadro 13c).
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import BrandMark from '../components/BrandMark'
import BrandLogo from '../components/BrandLogo'

export default function WelcomeScreen({ onStart, onGoLogin }) {
  const lang = getAppLanguage() ?? 'pt'
  const L = (k, vars) => t(`welcome.${k}`, vars, lang)
  return (
    <div style={styles.screen}>
      <div style={styles.top}>
        <div style={styles.brandRow}>
          <BrandMark size={66} variant="plate" />
          <div>
            <BrandLogo size={19} onDark letterSpacing="-.8px" style={{ display: 'block', margin: '0 0 5px' }} />
            <p style={styles.tagline}>{L('tagline')}</p>
          </div>
        </div>

        <p style={styles.title}>{L('title')}</p>
        <p style={styles.subtitle}>{L('subtitle')}</p>

        <div style={styles.promises}>
          {['promise1', 'promise2', 'promise3'].map(k => (
            <div key={k} style={styles.promiseRow}>
              <span style={styles.promiseDot} />
              <p style={styles.promiseText}>{L(k)}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.footer}>
        <button style={styles.primaryBtn} onClick={onStart}>
          <span style={styles.primaryText}>{L('startBtn')}</span>
          <span style={styles.primaryArrow}>→</span>
        </button>
        <button style={styles.secondaryBtn} onClick={onGoLogin}>{L('loginBtn')}</button>
        <p style={styles.note}>{L('note')}</p>
      </div>
    </div>
  )
}

// Medidas do quadro 13a.
const styles = {
  screen: { minHeight: '100%', height: '100%', background: 'var(--bento-ink)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflowY: 'auto' },
  top: { flex: 1, padding: '52px 26px 0', display: 'flex', flexDirection: 'column' },
  brandRow: { display: 'flex', alignItems: 'center', gap: 13, margin: '0 0 auto' },
  tagline: { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', margin: 0 },
  title: { fontFamily: 'var(--font-bento)', fontSize: 38, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.8px', color: '#fff', margin: '0 0 16px', textWrap: 'pretty' },
  subtitle: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 500, lineHeight: 1.6, color: 'rgba(255,255,255,.55)', margin: '0 0 30px', textWrap: 'pretty' },
  promises: { display: 'flex', flexDirection: 'column', gap: 12, margin: '0 0 34px' },
  promiseRow: { display: 'flex', alignItems: 'center', gap: 13 },
  promiseDot: { width: 8, height: 8, borderRadius: 99, background: 'var(--bento-accent)', flex: 'none' },
  promiseText: { fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'rgba(255,255,255,.82)', margin: 0 },
  footer: { flex: 'none', padding: '0 26px calc(32px + var(--safe-bottom))' },
  primaryBtn: { width: '100%', height: 56, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, margin: '0 0 10px', cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  primaryText: { fontSize: 16, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' },
  primaryArrow: { fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' },
  secondaryBtn: { width: '100%', height: 56, borderRadius: 18, border: 'none', background: 'rgba(255,255,255,.07)', fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'rgba(255,255,255,.85)', cursor: 'pointer' },
  note: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.35)', margin: '18px 0 0', textAlign: 'center' },
}
