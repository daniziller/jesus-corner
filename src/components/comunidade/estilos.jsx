// estilos.js — os estilos que as telas de dentro do grupo repetem (Desafio,
// Oração, Conversa, Pessoas): tela, corpo que rola, rótulo de seção,
// cartões, linhas, avatar, selo e botões.
const FONT = 'var(--font-bento)'

export const e = {
  font: FONT,
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)', fontFamily: FONT, color: 'var(--bento-ink)' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px calc(var(--nav-height) + 22px)', display: 'flex', flexDirection: 'column', gap: 10 },
  bodyWithFooter: { paddingBottom: 12 },
  footer: { flexShrink: 0, padding: '12px 20px calc(var(--nav-height) + 14px)', background: 'var(--bento-bg)' },
  label: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t2)', margin: 0, padding: '8px 2px 0' },
  card: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px' },
  listCard: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-card)', padding: '4px 18px' },
  sandCard: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px' },
  inkCard: { flexShrink: 0, borderRadius: 26, background: 'var(--bento-ink)', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 },
  inkLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  sandLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-sand-ink)', margin: 0 },
  row: { minHeight: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--bento-line)' },
  rowLast: { borderBottom: 'none' },
  rowText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  rowTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t2)', margin: 0 },
  avatar: { width: 34, height: 34, flexShrink: 0, borderRadius: 99, background: 'var(--bento-sand)', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  author: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)', margin: 0 },
  when: { fontWeight: 500, color: 'var(--bento-t2)' },
  badge: { flexShrink: 0, height: 22, padding: '0 9px', borderRadius: 8, background: 'var(--bento-line)', color: 'var(--bento-quote-ink)', fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', lineHeight: '22px' },
  primary: { width: '100%', height: 54, border: 'none', borderRadius: 18, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },
  secondary: { flexShrink: 0, height: 50, border: 'none', borderRadius: 17, background: 'var(--bento-card)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },
  small: { flexShrink: 0, height: 44, border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: '0 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  textBtn: { minHeight: 44, border: 'none', background: 'none', padding: '0 4px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-now-text)', cursor: 'pointer' },
  empty: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)', margin: 0 },
  error: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-now-text)', margin: 0 },
  skeleton: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-line)' },
  sheetTitle: { fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  sheetRow: { width: '100%', minHeight: 56, borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid var(--bento-line)', background: 'none', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
}

export function Esqueleto({ heights }) {
  return heights.map((h, i) => <div key={i} aria-hidden="true" className="rb-context-skeleton" style={{ ...e.skeleton, height: h }} />)
}
