// LeituraTopo.jsx — o topo da tela de leitura, preso em cima; some ao rolar
// para baixo e volta ao rolar para cima, com tudo o que tem dentro.
//
// Na leitura livre (handoff-biblia-52 §4, B3): voltar · pílula "{Livro}
// {capítulo}" (abre o seletor de capítulo) · pílula da versão · três
// pontos (Ferramentas), e embaixo o fio de progresso do livro na cor do
// bloco, com "{lidos} de {n} lidos · leitura livre".
//
// Na leitura do plano (handoff-passos-pedidos-53-54 §4, S3): no lugar da
// versão e dos três pontos fica o relógio (`clock`; sem ele, nada); entre
// o cabeçalho e o fio entra a barra do dia (`daySegments`), e o fio diz
// "Passo {n} de {total} · {lidos} de {capítulos} lidos".
import { forwardRef } from 'react'
import AppIcon from '../../icons/AppIcon'
import BibleVersionChip from '../bible/BibleVersionChip'
import BarraDoDia from '../passos/BarraDoDia'
import { blockColorVar, blockToneVar } from '../../data/gamificationBlocks'
import { t } from '../../i18n'

const FONT = 'var(--font-bento)'

const LeituraTopo = forwardRef(function LeituraTopo({
  lang, title, hidden, blocoId, thread, lidos, total,
  versionId, onChangeVersion, onBack, onOpenPicker, onOpenMenu,
  plan = false, clock = null, daySegments, dayLabel,
}, ref) {
  return (
    <div ref={ref} style={{ ...s.wrap, transform: hidden ? 'translateY(-100%)' : 'none' }}>
      <div style={s.row}>
        <button type="button" className="biblia-alvo" style={s.square} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        {onOpenPicker ? (
          <button type="button" className="biblia-alvo" style={s.pill} onClick={onOpenPicker} aria-label={`${title}, trocar de capítulo`}>
            <span style={s.pillText}>{title}</span>
            <AppIcon name="ChevronDown" size={12} strokeWidth={2.4} color="var(--bento-t3)" style={{ flexShrink: 0 }} />
          </button>
        ) : (
          <div style={s.pill}><span style={s.pillText}>{title}</span></div>
        )}
        <div style={{ flex: 1 }} />
        {plan ? clock : (
          <>
            <BibleVersionChip lang={lang} versionId={versionId} onChange={onChangeVersion} />
            <button type="button" className="biblia-alvo" style={{ ...s.square, flexDirection: 'column', gap: 3 }} onClick={onOpenMenu} aria-label="Mais opções">
              <span style={s.dot} /><span style={s.dot} /><span style={s.dot} />
            </button>
          </>
        )}
      </div>
      {daySegments?.length > 0 && <BarraDoDia segments={daySegments} style={s.dayBar} role="img" aria-label={dayLabel} />}
      {thread && (
        <div style={{ ...s.thread, ...(daySegments?.length > 0 ? s.threadAfterBar : null) }}>
          <div
            style={{ ...s.bar, background: blockToneVar(blocoId) }}
            role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={lidos} aria-label={thread.text}
          >
            {lidos > 0 && <div style={{ ...s.fill, width: `${thread.ratio * 100}%`, background: blockColorVar(blocoId) }} />}
          </div>
          <span style={s.threadText}>{thread.text}</span>
        </div>
      )}
    </div>
  )
})

export default LeituraTopo

// Medidas dos quadros B3 (handoff-biblia-52 §4, itens 1 e 2) e S3. Os 14px
// de baixo são a distância do fio até o cartão do texto; em S3 o fio fica
// a 10px da barra do dia.
const s = {
  wrap: { position: 'sticky', top: 0, zIndex: 20, background: 'var(--bento-bg)', paddingBottom: 14, transition: 'transform .2s ease-out' },
  row: { display: 'flex', alignItems: 'center', gap: 8, padding: '20px 20px 0' },
  square: { width: 38, height: 38, flexShrink: 0, borderRadius: 13, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' },
  pill: { height: 38, minWidth: 0, borderRadius: 13, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 13px', cursor: 'pointer' },
  pillText: { fontFamily: FONT, fontSize: 13, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  dot: { width: 3.5, height: 3.5, borderRadius: 9, background: 'var(--bento-ink)', display: 'block' },
  dayBar: { padding: '14px 20px 0' },
  thread: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px 0' },
  threadAfterBar: { paddingTop: 10 },
  bar: { flex: 1, height: 4, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', minWidth: 6, borderRadius: 99 },
  threadText: { fontFamily: FONT, fontSize: 10.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', whiteSpace: 'nowrap' },
}
