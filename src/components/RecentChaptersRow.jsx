// Cards estilo "stories" (Instagram) com os últimos capítulos abertos na
// navegação livre pela Bíblia — deixa voltar direto a um deles com um
// toque, sem precisar re-navegar pelo mapa de Antigo/Novo Testamento.
// Reaproveitado em dois lugares (ver src/reading/recentChaptersStore.js):
// a tela inicial da aba Bíblia (JourneyScreen.jsx, reskin Bento) e dentro
// de um livro já aberto (ReadingBlockView.jsx, modo navegação livre —
// ainda não reskinado, ver comentário lá — onde fica fixo no topo ao
// rolar). `bento` liga o visual novo só no primeiro caso; o segundo
// continua exatamente como estava, pra não destoar do resto daquela tela.
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function RecentChaptersRow({ chapters, lang, onOpen, sticky, bento }) {
  if (!chapters?.length) return null

  return (
    <div style={{ ...styles.wrap, ...(sticky ? styles.sticky : {}), ...(bento ? styles.wrapBento : {}) }}>
      <p style={{ ...styles.title, ...(bento ? styles.titleBento : {}) }}>
        <AppIcon name="RefreshCw" size={11} color={bento ? 'var(--bento-t4)' : 'var(--g4)'} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        {t('journey.recentlyReadTitle', undefined, lang)}
      </p>
      <div style={{ ...styles.row, ...(bento ? styles.rowBento : {}) }}>
        {chapters.map(c => (
          <button
            key={`${c.book}:${c.chapter}`}
            style={styles.item}
            onClick={() => onOpen(c.blockId, c.sessionId)}
          >
            <span style={{ ...styles.circle, ...(bento ? styles.circleBento : {}) }}>{c.chapter}</span>
            <span style={{ ...styles.label, ...(bento ? styles.labelBento : {}) }}>{lang === 'en' ? c.bookEn : c.book}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  wrap:   { padding: '8px 0 4px' },
  wrapBento: { padding: '4px 0 4px', background: 'var(--bento-bg)' },
  sticky: { position: 'sticky', top: 0, zIndex: 5, background: 'var(--white)' },
  title:  { fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', letterSpacing: 0.5, textTransform: 'uppercase', margin: '0 14px 8px' },
  titleBento: { fontFamily: 'var(--font-bento)', color: 'var(--bento-t4)', margin: '0 20px 8px' },
  // touchAction: 'pan-x' — sem isso, um gesto vertical (rolar a página)
  // iniciado em cima dessa fileira (rolagem horizontal) podia ser
  // "sequestrado" pelo scroll horizontal no celular, travando a rolagem
  // vertical da lista de capítulos logo abaixo enquanto o dedo estivesse
  // sobre os cards. Com pan-x, só gestos horizontais ficam contidos aqui;
  // verticais passam direto pro scroll da página.
  row:    { display: 'flex', gap: 12, overflowX: 'auto', padding: '0 14px 2px', touchAction: 'pan-x' },
  rowBento: { padding: '0 20px 2px' },
  item:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0, width: 52 },
  circle: { width: 46, height: 46, borderRadius: '50%', background: 'var(--grad-vivid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'white', boxShadow: '0 4px 12px rgba(157,67,0,.25)' },
  circleBento: { borderRadius: 14, background: 'var(--bento-ink)', fontFamily: 'var(--font-bento)', boxShadow: 'none' },
  label:  { fontSize: 9, fontWeight: 600, color: 'var(--g5)', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  labelBento: { fontFamily: 'var(--font-bento)', color: 'var(--bento-t3)' },
}
