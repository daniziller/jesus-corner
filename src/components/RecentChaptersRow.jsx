// Cards estilo "stories" (Instagram) com os últimos capítulos abertos na
// navegação livre pela Bíblia — deixa voltar direto a um deles com um
// toque, sem precisar re-navegar pelo mapa de Antigo/Novo Testamento.
// Reaproveitado em dois lugares (ver src/reading/recentChaptersStore.js):
// a tela inicial da aba Bíblia (JourneyScreen.jsx) e dentro de um livro já
// aberto (ReadingBlockView.jsx, onde fica fixo no topo ao rolar).
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function RecentChaptersRow({ chapters, lang, onOpen, sticky }) {
  if (!chapters?.length) return null

  return (
    <div style={{ ...styles.wrap, ...(sticky ? styles.sticky : {}) }}>
      <p style={styles.title}>
        <AppIcon name="RefreshCw" size={11} color="var(--g4)" style={{ verticalAlign: 'middle', marginRight: 4 }} />
        {t('journey.recentlyReadTitle', undefined, lang)}
      </p>
      <div style={styles.row}>
        {chapters.map(c => (
          <button
            key={`${c.book}:${c.chapter}`}
            style={styles.item}
            onClick={() => onOpen(c.blockId, c.sessionId)}
          >
            <span style={styles.circle}>{c.chapter}</span>
            <span style={styles.label}>{lang === 'en' ? c.bookEn : c.book}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  wrap:   { padding: '8px 0 4px' },
  sticky: { position: 'sticky', top: 0, zIndex: 5, background: 'var(--white)' },
  title:  { fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', letterSpacing: 0.5, textTransform: 'uppercase', margin: '0 14px 8px' },
  row:    { display: 'flex', gap: 12, overflowX: 'auto', padding: '0 14px 2px' },
  item:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0, width: 52 },
  circle: { width: 46, height: 46, borderRadius: '50%', background: 'var(--grad-vivid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'white', boxShadow: '0 4px 12px rgba(157,67,0,.25)' },
  label:  { fontSize: 9, fontWeight: 600, color: 'var(--g5)', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}
