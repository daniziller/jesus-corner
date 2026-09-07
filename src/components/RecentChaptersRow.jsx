// Cards estilo "stories" (Instagram) com os últimos capítulos abertos na
// navegação livre pela Bíblia — deixa voltar direto a um deles com um
// toque, sem precisar re-navegar pelo mapa de Antigo/Novo Testamento. Ver
// src/reading/recentChaptersStore.js. Os dois usos atuais (dentro de
// ReadingBlockView.jsx, ramos "mode='browse' && !embedded" pro desktop e
// pra tela cheia antiga) são código morto — nenhum call site de hoje passa
// por ali (ver auditoria de identidade, Bloco 1) — mas o componente
// continua existindo (e na identidade Bento) pra quando esse caminho
// master-detail for retomado.
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function RecentChaptersRow({ chapters, lang, onOpen, sticky }) {
  if (!chapters?.length) return null

  return (
    <div style={{ ...styles.wrap, ...(sticky ? styles.sticky : {}) }}>
      <p style={styles.title}>
        <AppIcon name="RefreshCw" size={11} color="var(--bento-t4)" style={{ verticalAlign: 'middle', marginRight: 4 }} />
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
  wrap:   { padding: '4px 0 4px', background: 'var(--bento-bg)' },
  sticky: { position: 'sticky', top: 0, zIndex: 5 },
  title:  { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 20px 8px' },
  // touchAction: 'pan-x' — sem isso, um gesto vertical (rolar a página)
  // iniciado em cima dessa fileira (rolagem horizontal) podia ser
  // "sequestrado" pelo scroll horizontal no celular, travando a rolagem
  // vertical da lista de capítulos logo abaixo enquanto o dedo estivesse
  // sobre os cards. Com pan-x, só gestos horizontais ficam contidos aqui;
  // verticais passam direto pro scroll da página.
  row:    { display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 2px', touchAction: 'pan-x' },
  item:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', flexShrink: 0, width: 52 },
  circle: { width: 46, height: 46, borderRadius: 14, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 16, fontWeight: 800, color: '#fff' },
  label:  { fontFamily: 'var(--font-bento)', fontSize: 9, fontWeight: 600, color: 'var(--bento-t3)', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}
