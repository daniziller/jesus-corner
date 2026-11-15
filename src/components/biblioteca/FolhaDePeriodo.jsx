// FolhaDePeriodo.jsx — a folha do seletor PERÍODO (handoff-biblioteca-55
// §6.1): Sempre · Esta semana · Este mês · Este ano · De… até…. As
// quatro primeiras escolhem e fecham; "De… até…" abre os dois campos de
// data, e "Aplicar" vale o intervalo. "Limpar" volta a "Sempre".
import { useState } from 'react'
import { periods, normalizePeriod } from '../../biblioteca/buscaDaBiblioteca'
import { t, currentLanguage } from '../../i18n'
import FolhaDeOpcoes from './FolhaDeOpcoes'

const FONT = 'var(--font-bento)'

export default function FolhaDePeriodo({ period, onChange, onClose }) {
  const [key, setKey] = useState(period.key)
  const [from, setFrom] = useState(period.from ?? '')
  const [to, setTo] = useState(period.to ?? '')
  function choose(next) {
    setKey(next)
    if (next !== 'custom') onChange({ key: next })
  }
  return (
    <FolhaDeOpcoes
      title={t('bibliotecaTx.sel_period')} options={periods(currentLanguage())} current={key} onChoose={choose} onClose={onClose} stay={k => k === 'custom'}
      onClear={period.key !== 'always' ? () => onChange({ key: 'always' }) : null}
    >
      {key === 'custom' && (
        <div style={s.dates}>
          <label style={s.field}>
            <span style={s.fieldLabel}>{t('bibliotecaTx.from')}</span>
            <input type="date" style={s.input} value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
          </label>
          <label style={s.field}>
            <span style={s.fieldLabel}>{t('bibliotecaTx.until')}</span>
            <input type="date" style={s.input} value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
          </label>
          <button type="button" style={s.apply} onClick={() => { onChange(normalizePeriod({ key: 'custom', from, to })); onClose() }}>{t('bibliotecaTx.apply')}</button>
        </div>
      )}
    </FolhaDeOpcoes>
  )
}

const s = {
  dates: { display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 0' },
  field: { flex: '1 1 140px', minWidth: 0, borderRadius: 16, background: 'var(--bento-card)', padding: '9px 14px 8px', display: 'block' },
  fieldLabel: { display: 'block', fontFamily: FONT, fontSize: 8.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 3px' },
  input: { width: '100%', height: 26, border: 'none', background: 'none', outline: 'none', padding: 0, fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)' },
  apply: { flex: '1 0 100%', height: 50, border: 'none', borderRadius: 17, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1, color: '#fff', cursor: 'pointer' },
}
