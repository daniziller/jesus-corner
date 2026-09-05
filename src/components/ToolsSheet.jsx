// Folha inferior "Ferramentas" da tela de Leitura (quadro 5e) — grade 2×2
// (Contexto / Mapa / Minhas notas / Curiosidades), a mesma folha que antes
// era uma lista de linhas. Aberta pelo botão "Ferramentas" do rodapé ou
// pelo menu (⋮) do cabeçalho.
//
// Fidelidade ao quadro 5e: reproduz o fundo escurecido sobre a leitura, o
// puxador e a grade — MAS o raio da folha fica só no topo (22px 22px 0 0,
// como as demais folhas Bento — ver NotesScreen.jsx), não nos 4 cantos do
// quadro: aquele arredondamento embaixo é a moldura do próprio aparelho no
// mock, não uma instrução de estilo pra folha real. A linha "Comparar
// versões" do quadro não entra — só existe uma versão da Bíblia por idioma
// hoje (ver src/data/bibleVersions.js), então "lado a lado" é impossível
// com dado real; fica pendente até existir mais de uma versão.
//
// O quadro só desenha 4 ferramentas fixas, mas quem monta esta folha
// (ReadingBlockView) manda uma lista dinâmica — nem todo item do quadro
// sempre existe (ex: sem contexto de livro) e existem ferramentas reais
// fora do quadro (áudio do capítulo em grupo, "Perguntar à IA"). Por isso:
// os 4 papéis do quadro (contexto/mapa/notas/curiosidades) viram cards da
// grade quando presentes; qualquer outro item (ex: 'audio') vira uma linha
// cheia abaixo da grade, no mesmo estilo que a linha "Comparar versões"
// teria — preservando a funcionalidade real sem inventar um 5º card fixo.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'

const GRID_KEYS = ['contexto', 'mapa', 'notas', 'curiosidades']
const GRID_STYLE = {
  contexto: { bg: 'var(--bento-mark)', icon: 'var(--bento-accent)' },
  mapa: { bg: 'var(--bento-sand)', icon: 'var(--bento-sand-icon)' },
  notas: { bg: 'var(--bento-line)', icon: 'var(--bento-ink)' },
  curiosidades: { bg: 'var(--bento-line)', icon: 'var(--bento-ink)' },
}
const ROW_STYLE = { bg: 'var(--bento-line)', icon: 'var(--bento-ink)' }

// items: [{ key, icon, label, sub, node }] — `node` é o conteúdo do painel
// daquela ferramenta (só montado quando aberto). extra: nós avulsos no fim
// da lista (ex: "Perguntar à IA"). subtitle: linha "{livro} {capítulo} ·
// tudo que era barra lateral" do quadro — montada por quem chama, que é
// quem sabe a referência da sessão.
export default function ToolsSheet({ open, onClose, lang, items = [], extra = null, title, subtitle }) {
  const [openKey, setOpenKey] = useState(null)
  if (!open) return null

  const active = items.find(i => i.key === openKey) ?? null
  const gridItems = items.filter(i => GRID_KEYS.includes(i.key))
  const rowItems = items.filter(i => !GRID_KEYS.includes(i.key))

  function close() {
    setOpenKey(null)
    onClose?.()
  }

  return createPortal(
    <div style={styles.backdrop} onClick={close}>
      <div style={styles.sheet} onClick={e => e.stopPropagation()}>
        <div style={styles.handleWrap} onClick={close}><div style={styles.handle} /></div>

        {active ? (
          <>
            <div style={styles.panelHead}>
              <button style={styles.backBtn} onClick={() => setOpenKey(null)} aria-label={t('a11y.goBack', undefined, lang)}>
                <AppIcon name="ArrowLeft" size={17} color="var(--bento-ink)" />
              </button>
              <span style={styles.panelTitle}>{active.label}</span>
            </div>
            <div style={styles.panelBody}>{active.node}</div>
          </>
        ) : (
          <>
            {title && <p style={styles.sheetTitle}>{title}</p>}
            {subtitle && <p style={styles.sheetSubtitle}>{subtitle}</p>}

            <div style={styles.grid}>
              {gridItems.map(item => {
                const c = GRID_STYLE[item.key] ?? ROW_STYLE
                return (
                  <button key={item.key} style={styles.card} onClick={() => setOpenKey(item.key)}>
                    <span style={{ ...styles.cardIcon, background: c.bg }}>
                      <AppIcon name={item.icon} size={15} color={c.icon} />
                    </span>
                    <span style={styles.cardTitle}>{item.label}</span>
                    {item.sub && <span style={styles.cardSub}>{item.sub}</span>}
                  </button>
                )
              })}
            </div>

            {rowItems.map(item => (
              <button key={item.key} style={styles.row} onClick={() => setOpenKey(item.key)}>
                <span style={{ ...styles.rowIcon, background: ROW_STYLE.bg }}>
                  <AppIcon name={item.icon} size={15} color={ROW_STYLE.icon} />
                </span>
                <span style={styles.rowText}>
                  <span style={styles.cardTitle}>{item.label}</span>
                  {item.sub && <span style={styles.cardSub}>{item.sub}</span>}
                </span>
                <AppIcon name="ChevronRight" size={16} color="var(--bento-t5)" />
              </button>
            ))}

            {extra && <div style={styles.extra}>{extra}</div>}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(26,23,20,.45)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)',
    borderRadius: '22px 22px 0 0', maxHeight: '86vh', overflowY: 'auto',
    padding: '0 20px calc(24px + var(--safe-bottom))',
    animation: 'bookOpenIn .26s cubic-bezier(.32,.72,0,1)',
  },
  handleWrap: { display: 'flex', justifyContent: 'center', padding: '14px 0 18px', cursor: 'pointer' },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)' },
  sheetTitle: {
    fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, letterSpacing: '-.6px',
    color: 'var(--bento-ink)', margin: '0 0 4px',
  },
  sheetSubtitle: {
    fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500,
    color: 'var(--bento-t3)', margin: '0 0 16px',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  card: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
    border: 'none', background: 'var(--bento-card)', borderRadius: 20, padding: 18, cursor: 'pointer',
  },
  cardIcon: {
    width: 32, height: 32, borderRadius: 11, display: 'flex', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  cardTitle: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 3 },
  cardSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)' },
  row: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
    border: 'none', background: 'var(--bento-card)', borderRadius: 20, padding: '16px 18px',
    cursor: 'pointer', marginBottom: 10,
  },
  rowIcon: {
    width: 32, height: 32, flexShrink: 0, borderRadius: 11, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  extra: { marginTop: 2 },
  panelHead: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 14px' },
  backBtn: {
    width: 34, height: 34, borderRadius: 11, border: 'none', background: 'var(--bento-line)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  panelTitle: { fontFamily: 'var(--font-bento)', fontSize: 15.5, fontWeight: 800, color: 'var(--bento-ink)' },
  panelBody: { padding: '0 0 8px' },
}
