// Folha inferior "Ferramentas" da tela de Leitura (redesign 1b) — substitui
// a fileira de chips (Contexto / Mapa / Notas / Curiosidades) que ficava no
// cabeçalho, empurrando o texto pra baixo. Aberta pelo botão "Ferramentas"
// do rodapé ou pelo menu (⋮) do cabeçalho.
//
// Entra de baixo em 260ms cubic-bezier(.32,.72,0,1); fecha por arraste no
// puxador, toque no fundo ou na seta ← de um painel aberto.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'

// items: [{ key, icon, label, sub, node }] — `node` é o conteúdo do painel
// daquela ferramenta (só montado quando aberto). extra: nós avulsos no fim
// da lista (ex: "Ir para Reflexão", troca de versão).
export default function ToolsSheet({ open, onClose, lang, items = [], extra = null, title }) {
  const [openKey, setOpenKey] = useState(null)
  if (!open) return null

  const active = items.find(i => i.key === openKey) ?? null

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
                <AppIcon name="ArrowLeft" size={17} color="var(--bk)" />
              </button>
              <span style={styles.panelTitle}>{active.label}</span>
            </div>
            <div style={styles.panelBody}>{active.node}</div>
          </>
        ) : (
          <>
            {title && <p style={styles.sheetTitle}>{title}</p>}
            <div style={styles.list}>
              {items.map(item => (
                <button key={item.key} style={styles.row} onClick={() => setOpenKey(item.key)}>
                  <span style={styles.rowIcon}><AppIcon name={item.icon} size={17} color="var(--or)" /></span>
                  <span style={styles.rowText}>
                    <span style={styles.rowLabel}>{item.label}</span>
                    {item.sub && <span style={styles.rowSub}>{item.sub}</span>}
                  </span>
                  <AppIcon name="ChevronRight" size={16} color="var(--g4)" />
                </button>
              ))}
            </div>
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
    position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(18,18,18,.4)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    width: '100%', maxWidth: 'var(--max-width)', background: 'var(--white)',
    borderRadius: '22px 22px 0 0', maxHeight: '82vh', overflowY: 'auto',
    padding: '0 0 calc(20px + var(--safe-bottom))',
    animation: 'bookOpenIn .26s cubic-bezier(.32,.72,0,1)',
  },
  handleWrap: { display: 'flex', justifyContent: 'center', padding: '10px 0 6px', cursor: 'pointer' },
  handle: { width: 36, height: 4, borderRadius: 99, background: 'var(--g3)' },
  sheetTitle: {
    fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 700, color: 'var(--bk)',
    padding: '2px 22px 10px',
  },
  list: { display: 'flex', flexDirection: 'column' },
  row: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
    padding: '15px 22px', border: 'none', background: 'none', cursor: 'pointer',
    borderTop: '1px solid rgba(18,18,18,.07)', fontFamily: 'var(--font)', textAlign: 'left',
  },
  rowIcon: {
    width: 34, height: 34, flexShrink: 0, borderRadius: 10, background: 'var(--olt)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  rowLabel: { fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--bk)' },
  rowSub: { fontSize: 12.5, fontWeight: 400, color: 'var(--g5)' },
  extra: { padding: '14px 22px 4px', borderTop: '1px solid rgba(18,18,18,.07)' },
  panelHead: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 18px 10px' },
  backBtn: {
    width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--g1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  panelTitle: { fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 700, color: 'var(--bk)' },
  panelBody: { padding: '0 14px 8px' },
}
