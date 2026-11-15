// LanguageSelectScreen.jsx — primeira tela do app quando ainda não existe
// usuário logado nem idioma escolhido no dispositivo. Depois da escolha,
// login/criar conta já nascem no idioma certo (ver i18n/index.js:
// currentLanguage() lê essa preferência).
//
// Sem quadro no handoff (redesign Bento cobre 52 telas a partir de
// WelcomeScreen.jsx/13a, que já pressupõe idioma escolhido) — esta tela
// vem ANTES até de 13a, então segue a mesma linguagem visual dela (fundo
// --bento-ink cheio, sem o hero escuro + folha branca que tinha antes),
// mantendo a própria bilíngue (pt+en juntos, já que ainda não dá pra saber
// em qual idioma escrever).
import { LANGUAGES } from '../i18n'
import BrandMark from '../components/BrandMark'
import BrandLogo from '../components/BrandLogo'
import { setAppLanguage } from '../i18n/appLanguageStore'
import AppIcon from '../icons/AppIcon'

export default function LanguageSelectScreen({ onSelect }) {
  function choose(lang) {
    setAppLanguage(lang)
    onSelect(lang)
  }

  return (
    <div style={s.screen}>
      <div style={s.top}>
        <div style={s.brandRow}>
          <BrandMark size={54} variant="plate" />
          <BrandLogo size={18} onDark letterSpacing="-.8px" />
        </div>
        <p style={s.title}>Escolha seu idioma<br />Choose your language</p>
        <p style={s.subtitle}>Você pode trocar depois no seu perfil.<br />You can change this later in your profile.</p>
      </div>

      <div style={s.footer}>
        {LANGUAGES.map(l => (
          <button key={l.id} style={s.langBtn} onClick={() => choose(l.id)}>
            <span style={s.langFlag} aria-hidden="true">{l.id.toUpperCase()}</span>
            <span style={s.langLabel}>{l.label}</span>
            <span style={s.langArrow}><AppIcon name="ArrowRight" size={16} strokeWidth={2.4} style={{ verticalAlign: '-3px' }} /></span>
          </button>
        ))}
      </div>
    </div>
  )
}

const s = {
  screen: { minHeight: '100%', height: '100%', background: 'var(--bento-ink)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflowY: 'auto' },
  top: { flex: 1, padding: '52px 26px 0', display: 'flex', flexDirection: 'column' },
  brandRow: { display: 'flex', alignItems: 'center', gap: 13, margin: '0 0 34px' },
  title: { fontFamily: 'var(--font-bento)', fontSize: 24, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-.6px', color: '#fff', margin: '0 0 12px', textWrap: 'pretty' },
  subtitle: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.6, color: 'rgba(255,255,255,.55)', margin: 0, textWrap: 'pretty' },
  footer: { flex: 'none', padding: '0 26px calc(32px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },
  langBtn: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', border: 'none', background: 'rgba(255,255,255,.07)', borderRadius: 18, padding: '16px 18px', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  langFlag: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, letterSpacing: '.06em', color: '#fff' },
  langLabel: { flex: 1, fontSize: 15, fontWeight: 700, color: '#fff' },
  langArrow: { fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,.5)' },
}
