import { useState } from 'react'
import { currentLanguage } from '../../i18n'

// `open`/`onToggle` são opcionais — se não vierem, o card controla o próprio
// estado. O ReflectionScreen passa os dois pra poder auto-expandir o card
// da etapa em andamento conforme o cronômetro avança (mesmo padrão de
// ActsCard.jsx).
export default function ReflectionGuideCard({ data, open: openProp, onToggle }) {
  const [openState, setOpenState] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : openState
  const lang = currentLanguage()
  const pick = (field) => field[lang] ?? field.pt

  function handleToggle() {
    if (isControlled) onToggle?.()
    else setOpenState(v => !v)
  }

  return (
    <div
      style={{
        background: 'var(--white)',
        border: `0.5px solid ${open ? data.borderColor : 'var(--g1)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: open ? `0 10px 24px ${data.glow}` : 'var(--shadow-card)',
        cursor: 'pointer',
        transition: 'border-color .2s, box-shadow .2s',
      }}
      onClick={handleToggle}
    >
      {/* Header */}
      <div style={{ padding: 13, display: 'flex', alignItems: 'center', gap: 11, userSelect: 'none' }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: data.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: data.letterColor, lineHeight: 1 }}>{data.letter}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--bk)', marginBottom: 1 }}>{pick(data.title)}</div>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--g5)' }}>{pick(data.subtitle)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: data.letterColor }}>{pick(data.duration)}</span>
          <span style={{ fontSize: 13, color: 'var(--g4)', fontWeight: 600, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }}>∨</span>
        </div>
      </div>

      {/* Body expansível */}
      {open && (
        <div style={{ padding: '0 13px 13px' }} onClick={e => e.stopPropagation()}>
          <div style={{ height: 0.5, background: 'var(--g2)', marginBottom: 12 }} />

          {/* Descrição */}
          <p
            style={{ fontSize: 11.5, fontWeight: 500, color: '#1C1C1E', lineHeight: 1.65, marginBottom: 11 }}
            dangerouslySetInnerHTML={{ __html: pick(data.description) }}
          />

          {/* Passos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pick(data.steps).map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 11px', borderRadius: 9, background: data.stepBg }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: data.dotColor, flexShrink: 0, marginTop: 4 }} />
                <p style={{ fontSize: 11.5, fontWeight: 500, color: '#1C1C1E', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: step }} />
              </div>
            ))}
          </div>

          {/* Versículo */}
          <div style={{ borderRadius: 9, padding: '10px 12px', marginTop: 10, borderLeft: `3px solid ${data.verseBorder}`, background: data.verseBg }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#1C1C1E', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 4 }}>
              {pick(data.verse)}
            </p>
            <span style={{ fontSize: 10, fontWeight: 700, color: data.verseRefColor, letterSpacing: 0.3 }}>
              {pick(data.verseRef)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
