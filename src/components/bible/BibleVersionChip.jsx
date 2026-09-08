// BibleVersionChip.jsx — o seletor de versão do cabeçalho (39b/39c/39d,
// pacote 39): "vale para toda a aba, por isso mora no cabeçalho" (regra 3
// da aba inteira). Hoje o app tem uma versão só por idioma — o chip
// aparece mesmo assim (é o "já existe na interface" do handoff); a folha
// que ele abre só teria 1 linha pra tocar, então tocar no chip com 1
// versão só não abre nada — comparar versões volta como tela própria
// quando houver uma segunda (HANDOFF, regra 3).
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { BIBLE_VERSIONS, findBibleVersion } from '../../data/bibleVersions'
import { setSelectedVersionId } from '../../bible-text/bibleVersionSelection'
import AppIcon from '../../icons/AppIcon'

export default function BibleVersionChip({ lang, versionId, onChange }) {
  const [open, setOpen] = useState(false)
  const available = BIBLE_VERSIONS[lang] ?? []
  const current = findBibleVersion(versionId) ?? available[0]

  function choose(id) {
    setSelectedVersionId(lang, id)
    onChange?.(id)
    setOpen(false)
  }

  return (
    <>
      <button type="button" style={s.chip} onClick={() => available.length > 1 && setOpen(true)}>
        <span>{current?.short ?? ''}</span>
        <AppIcon name="ChevronDown" size={13} strokeWidth={2.4} color="var(--bento-t3)" />
      </button>
      {open && createPortal(
        <div style={s.backdrop} onClick={() => setOpen(false)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <div style={s.handleWrap}><div style={s.handle} /></div>
            {available.map(v => (
              <button key={v.id} type="button" style={{ ...s.row, ...(v.id === (current?.id) ? s.rowOn : {}) }} onClick={() => choose(v.id)}>
                <span style={s.rowLabel}>{v.label}</span>
                {v.id === current?.id && <AppIcon name="Check" size={16} strokeWidth={2.6} color="var(--bento-accent)" />}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

const FONT = 'var(--font-bento)'
const s = {
  chip: { flexShrink: 0, height: 34, display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'var(--bento-card)', borderRadius: 12, padding: '0 10px', cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)' },
  backdrop: { position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', padding: '0 18px calc(18px + var(--safe-bottom))' },
  handleWrap: { display: 'flex', justifyContent: 'center', padding: '14px 0' },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)' },
  row: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, height: 54, border: 'none', background: 'none', padding: '0 4px', cursor: 'pointer', textAlign: 'left' },
  rowOn: {},
  rowLabel: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)' },
}
