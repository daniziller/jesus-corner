// Rede de segurança do app inteiro: um erro ao desenhar qualquer tela
// deixava tudo em branco, sem mensagem nem saída (já aconteceu — ver o
// comentário em AdminMobileShell.jsx). Aqui o erro vira uma tela simples
// com "Recarregar o app"; o que já foi gravado continua na conta.
import { Component } from 'react'
import { t } from '../i18n'

const FONT = 'var(--font-bento)'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('[app] tela quebrou', error, info?.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" style={s.screen}>
        <div style={s.card}>
          <h1 style={s.title}>{t('errorScreen.title')}</h1>
          <p style={s.body}>{t('errorScreen.body')}</p>
          <button type="button" style={s.button} onClick={() => window.location.reload()}>{t('errorScreen.reload')}</button>
        </div>
      </div>
    )
  }
}

const s = {
  screen: { minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bento-bg)', boxSizing: 'border-box' },
  card: { width: '100%', maxWidth: 360, background: 'var(--bento-card)', borderRadius: 24, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  title: { margin: 0, fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)' },
  body: { margin: 0, fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)' },
  button: { marginTop: 8, minHeight: 52, border: 'none', borderRadius: 18, background: 'var(--bento-ink)', color: 'var(--bento-card)', fontFamily: FONT, fontSize: 15, fontWeight: 800, cursor: 'pointer' },
}
