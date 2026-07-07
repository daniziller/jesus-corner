import { LANGUAGES } from '../i18n'
import { setAppLanguage } from '../i18n/appLanguageStore'

// Primeira tela do app quando ainda não existe usuário logado nem idioma
// escolhido no dispositivo. Depois da escolha, login/criar conta já nascem
// no idioma certo (ver i18n/index.js: currentLanguage() lê essa preferência).
export default function LanguageSelectScreen({ onSelect }) {
  function choose(lang) {
    setAppLanguage(lang)
    onSelect(lang)
  }

  return (
    <div style={styles.screen}>
      <div style={styles.hero}>
        <div style={styles.heroOrbOrange} />
        <div style={styles.heroOrbPink} />
        <img src="/icons/icon-192.png" alt="" style={styles.logo} />
        <span style={styles.brandName}>JESUS' <span style={{ color: 'var(--or)' }}>CORNER</span></span>
      </div>

      <div style={styles.sheet}>
        <h1 style={styles.title}>Escolha seu idioma<br />Choose your language</h1>
        <p style={styles.subtitle}>Você pode trocar depois no seu perfil.<br />You can change this later in your profile.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22 }}>
          {LANGUAGES.map(l => (
            <button key={l.id} style={styles.langBtn} onClick={() => choose(l.id)}>
              <span style={styles.langFlag}>{l.flag}</span>
              <span style={styles.langLabel}>{l.label}</span>
              <span style={styles.langArrow}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  screen:        { display: 'flex', flexDirection: 'column', height: '100%' },
  hero:          { background: '#141414', padding: '48px 24px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, position: 'relative', overflow: 'hidden' },
  heroOrbOrange: { position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: '#F97316', filter: 'blur(70px)', opacity: 0.5, top: -80, right: -60 },
  heroOrbPink:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: '#EC4899', filter: 'blur(70px)', opacity: 0.32, bottom: -70, left: -50 },
  logo:          { position: 'relative', width: 60, height: 60, borderRadius: 15, marginBottom: 10, boxShadow: '0 10px 24px rgba(0,0,0,.35)' },
  brandName:     { position: 'relative', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 1 },
  sheet:         { flex: 1, overflowY: 'auto', background: 'var(--white)', borderRadius: '20px 20px 0 0', marginTop: -14, padding: '28px 22px 32px' },
  title:         { fontSize: 20, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px', lineHeight: 1.35, textAlign: 'center' },
  subtitle:      { fontSize: 12, fontWeight: 500, color: 'var(--g5)', marginTop: 8, lineHeight: 1.5, textAlign: 'center' },
  langBtn:       { display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 14, padding: '16px 18px', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' },
  langFlag:      { fontSize: 26, flexShrink: 0 },
  langLabel:     { flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--bk)' },
  langArrow:     { fontSize: 16, color: 'var(--g4)', fontWeight: 700 },
}
