// Cabecalho.jsx — o cabeçalho das telas de dentro da Comunidade (o grupo,
// desafio, pedidos, conversa, pessoas, amigos): voltar, título, uma linha
// de apoio e, à direita, o que a tela precisar (`children`).
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function Cabecalho({ lang, title, sub, onBack, children }) {
  return (
    <header style={s.header}>
      <button type="button" style={s.back} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
        <AppIcon name="ChevronLeft" size={17} strokeWidth={2.2} color="var(--bento-ink)" />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={s.title}>{title}</h1>
        {sub && <p style={s.sub}>{sub}</p>}
      </div>
      {children}
    </header>
  )
}

const s = {
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' },
  back: { width: 44, height: 44, flexShrink: 0, border: 'none', padding: 0, borderRadius: 14, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 19, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t2)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}
