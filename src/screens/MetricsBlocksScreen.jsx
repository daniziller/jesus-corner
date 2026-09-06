// MetricsBlocksScreen.jsx — "Progresso por bloco" (quadro 30c, Bloco 7).
// Alcançada pelo rodapé de MetricsScreen.jsx (30b), "Ver progresso por
// bloco". Bloco, não livro: 66 barras não dizem nada, oito dizem (mesma
// lógica do handoff).
//
// "Tocar num bloco abre a lista de livros dele" — implementado como
// expandir o próprio bloco NESTA tela (accordion), não como navegar pra
// JourneyScreen.jsx (28b): aquela tela filtra por BIBLE_BLOCKS, que agrupa
// os livros DIFERENTE de METRICS_BLOCKS (ver nota em data/metricsBlocks.js)
// — não há uma correspondência 1:1 seguinda entre as duas divisões, então
// mapear uma pra outra seria frágil. Expandir localmente usa os MESMOS
// dados (computeMetricsBlockBooks), sem esse risco.
//
// "Exportar meu histórico" gera um PDF de verdade (exportMetricsPdf.js,
// jsPDF) com os mesmos números desta tela e de 30b — nada é fingido: quem
// não tem nenhum capítulo lido ainda recebe um PDF real, só que com zeros.
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { METRICS_BLOCKS, BOOK_EN, computeMetricsBlocks, computeTestamentTotals, computeMetricsBlockBooks } from '../data/metricsBlocks'
import { exportMetricsPdf } from '../metrics/exportMetricsPdf'

export default function MetricsBlocksScreen({ session, completedSet, onBack }) {
  const { lang } = session
  const L = (k, vars) => t(`metrics.${k}`, vars, lang)
  const [openBlockId, setOpenBlockId] = useState(null)

  const metricsBlocks = computeMetricsBlocks(completedSet)
  const { ot, nt } = computeTestamentTotals(metricsBlocks)

  function toggleBlock(id) {
    setOpenBlockId(prev => prev === id ? null : id)
  }

  function handleExport() {
    const generatedLabel = L('exportGeneratedAt', { date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR') })
    exportMetricsPdf({
      fileName: `jesus-corner-${lang === 'en' ? 'metrics' : 'metricas'}.pdf`,
      title: L('exportTitle'),
      generatedLabel,
      sections: [
        {
          heading: L('exportSectionTestaments'),
          lines: [
            `${L('oldTestament')}: ${ot.percent}% (${ot.chaptersRead} ${L('exportOf')} ${ot.chaptersTotal})`,
            `${L('newTestament')}: ${nt.percent}% (${nt.chaptersRead} ${L('exportOf')} ${nt.chaptersTotal})`,
          ],
        },
        {
          heading: L('blocksLabel'),
          table: {
            headers: [L('exportColBlock'), L('exportColChapters'), L('exportColPercent')],
            rows: metricsBlocks.map(b => [
              lang === 'en' ? b.nameEn : b.name,
              `${b.chaptersRead} ${L('exportOf')} ${b.chaptersTotal}`,
              `${b.percent}%`,
            ]),
          },
        },
      ],
    })
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>{L('blocksTitle')}</p>
      </div>

      <div style={s.body}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={s.testamentDark}>
            <p style={s.testamentLabelDark}>{L('oldTestament')}</p>
            <p style={s.testamentPctDark}>{ot.percent}%</p>
            <p style={s.testamentSubDark}>{ot.chaptersRead} {L('exportOf')} {ot.chaptersTotal}</p>
          </div>
          <div style={s.testamentLight}>
            <p style={s.testamentLabelLight}>{L('newTestament')}</p>
            <p style={s.testamentPctLight}>{nt.percent}%</p>
            <p style={s.testamentSubLight}>{nt.chaptersRead} {L('exportOf')} {nt.chaptersTotal}</p>
          </div>
        </div>

        <div style={s.blocksCard}>
          <p style={s.blocksLabel}>{L('blocksLabel')}</p>
          {metricsBlocks.map((b, i) => {
            const open = openBlockId === b.id
            const books = open ? computeMetricsBlockBooks(b.id, completedSet) : []
            return (
              <div key={b.id} style={{ borderBottom: i === metricsBlocks.length - 1 && !open ? 'none' : '1px solid var(--bento-line)' }}>
                <button style={s.blockRow} onClick={() => toggleBlock(b.id)}>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <p style={s.blockName}>{lang === 'en' ? b.nameEn : b.name}</p>
                    <p style={s.blockSub}>{L('chaptersOfTotal', { done: b.chaptersRead, total: b.chaptersTotal })}</p>
                  </div>
                  <div style={s.blockRight}>
                    <div style={s.blockBarTrack}><div style={{ ...s.blockBarFill, width: `${b.percent}%`, background: b.percent > 0 ? 'var(--bento-accent)' : 'transparent' }} /></div>
                    <span style={{ ...s.blockPct, color: b.percent > 0 ? 'var(--bento-accent)' : 'var(--bento-t2)' }}>{b.percent}%</span>
                  </div>
                  <AppIcon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} strokeWidth={2} color="var(--bento-t4)" />
                </button>
                {open && (
                  <div style={s.bookList}>
                    {books.map(bk => (
                      <div key={bk.book} style={s.bookRow}>
                        <span style={s.bookName}>{lang === 'en' ? (BOOK_EN[bk.book] ?? bk.book) : bk.book}</span>
                        <span style={s.bookStat}>{bk.chaptersRead}/{bk.chaptersTotal}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={s.footer}>
        <button style={s.exportBtn} onClick={handleExport}>
          <span>{L('exportBtn')}</span>
          <span style={s.exportPdfTag}>PDF</span>
        </button>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', padding: '22px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  testamentDark: { flex: 1, borderRadius: 22, background: 'var(--bento-ink)', padding: '16px 18px' },
  testamentLabelDark: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 10px' },
  testamentPctDark: { fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: '-1.1px', color: '#fff', margin: '0 0 8px' },
  testamentSubDark: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },
  testamentLight: { flex: 1, borderRadius: 22, background: '#fff', padding: '16px 18px' },
  testamentLabelLight: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  testamentPctLight: { fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: '-1.1px', color: 'var(--bento-t2)', margin: '0 0 8px' },
  testamentSubLight: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t2)', margin: 0 },

  blocksCard: { borderRadius: 24, background: '#fff', padding: '16px 18px' },
  blocksLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 4px' },
  blockRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, height: 56, border: 'none', background: 'none', padding: 0, cursor: 'pointer' },
  blockName: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  blockSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t2)', margin: 0 },
  blockRight: { width: 62, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 },
  blockBarTrack: { width: 62, height: 5, borderRadius: 99, background: 'var(--bento-line)' },
  blockBarFill: { height: 5, borderRadius: 99 },
  blockPct: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800 },
  bookList: { padding: '0 0 12px 4px', display: 'flex', flexDirection: 'column', gap: 8 },
  bookRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  bookName: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t2)' },
  bookStat: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)' },

  footer: { flex: 'none', padding: '12px 20px calc(20px + var(--safe-bottom))' },
  exportBtn: { width: '100%', height: 50, borderRadius: 17, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)' },
  exportPdfTag: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t2)' },
}
