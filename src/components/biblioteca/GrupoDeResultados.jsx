// GrupoDeResultados.jsx — um grupo dos resultados da busca da Biblioteca
// (L5, handoff-biblioteca-55 §6.2): o rótulo do tipo com a contagem à
// direita e os resultados no visual do tipo — Reflexões, Notas, Pregações
// e Perguntas em cartão branco (título · quando · o trecho onde a palavra
// aparece); Marcações em areia (o trecho em itálico · a referência · "Com
// nota: …"); Aplicações em preto (a frase em itálico e "Frase do dia · …");
// Estudos em linhas (o nome e "dia {x} de {y}"). Todas as ocorrências vêm
// realçadas. Em "Tudo", a linha "Ver as {n} …" ativa o filtro daquele
// tipo. `group` vem de resultadosDaBusca.js/searchLibrary.
import AppIcon from '../../icons/AppIcon'
import { ListaCartao, ListaLinha } from '../biblia/BuscaPartes'
import RotuloDeGrupo from './RotuloDeGrupo'

const FONT = 'var(--font-bento)'

// Um texto em pedaços, com o realce — o peso 800 fica, o realce não
// depende só da cor. Em itálico (trecho, frase) o realce ganha um respiro
// dos lados.
export function Realce({ segments, italic = false }) {
  return (segments ?? []).map((seg, i) => (seg.highlighted
    ? <mark key={i} style={{ ...s.mark, ...(italic ? s.markItalic : null) }}>{seg.text}</mark>
    : seg.text))
}

function VerMais({ label, tone = 'white', onClick }) {
  return (
    <button type="button" style={{ ...s.more, ...(tone === 'sand' ? s.moreSand : null) }} onClick={onClick}>
      {label}
      <AppIcon name="ArrowRight" size={15} strokeWidth={2.2} color={tone === 'sand' ? 'var(--bento-sand-icon)' : 'var(--bento-accent)'} style={{ flexShrink: 0 }} />
    </button>
  )
}

export default function GrupoDeResultados({ group, onOpen, onSeeAll }) {
  const { type, rows, more } = group
  let body
  if (type === 'marcacao') {
    body = (
      <div style={s.sandCard}>
        {rows.map((row, i) => (
          <button key={row.key} type="button" style={{ ...s.sandRow, ...(i > 0 ? s.sandLine : null) }} onClick={() => onOpen(row.item)}>
            {row.quote && <span style={s.sandQuote}><Realce segments={row.quote} italic /></span>}
            <span style={s.sandRef}>{row.reference}</span>
            {row.note && <span style={s.sandNote}><Realce segments={row.note} /></span>}
          </button>
        ))}
        {more && <VerMais label={more} tone="sand" onClick={onSeeAll} />}
      </div>
    )
  } else if (type === 'aplicacao') {
    body = (
      <>
        {rows.map(row => (
          <button key={row.key} type="button" style={s.blackCard} onClick={() => onOpen(row.item)}>
            <span style={s.blackQuote}><Realce segments={row.quote} italic /></span>
            <span style={s.blackMeta}>{row.meta}</span>
          </button>
        ))}
        {more && <div style={s.moreCard}><VerMais label={more} onClick={onSeeAll} /></div>}
      </>
    )
  } else if (type === 'estudo') {
    body = (
      <>
        <ListaCartao>
          {rows.map((row, i) => <ListaLinha key={row.key} title={row.title} sub={row.sub} last={i === rows.length - 1} onClick={() => onOpen(row.item)} />)}
        </ListaCartao>
        {more && <div style={s.moreCard}><VerMais label={more} onClick={onSeeAll} /></div>}
      </>
    )
  } else {
    body = (
      <div style={{ ...s.whiteCard, ...(more ? s.whiteCardMore : null) }}>
        {rows.map((row, i) => (
          <button key={row.key} type="button" style={{ ...s.whiteRow, ...(i < rows.length - 1 ? s.whiteLine : null) }} onClick={() => onOpen(row.item)}>
            <span style={s.whiteTop}>
              <span style={s.whiteTitle}>{row.title}</span>
              <span style={s.whiteWhen}>{row.when}</span>
            </span>
            {row.excerpt.length > 0 && <span style={s.whiteExcerpt}><Realce segments={row.excerpt} /></span>}
          </button>
        ))}
        {more && <VerMais label={more} onClick={onSeeAll} />}
      </div>
    )
  }
  return (
    <section style={s.group} aria-label={`${group.label}, ${group.count}`}>
      <RotuloDeGrupo right={group.count}>{group.label}</RotuloDeGrupo>
      {body}
    </section>
  )
}

// As bordas das linhas vão lado a lado (sem o atalho `border`): o fio
// entre duas linhas liga e desliga conforme a posição.
const noBorder = { borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: 'none' }
const rowReset = { ...noBorder, width: '100%', background: 'none', display: 'block', textAlign: 'left', cursor: 'pointer' }

const s = {
  group: { display: 'flex', flexDirection: 'column', gap: 10 },
  mark: { background: 'var(--bloco-evangelhos-atos-tom)', borderRadius: 4, padding: '1px 0', fontWeight: 800, color: 'var(--bento-ink)' },
  markItalic: { padding: '1px 4px 1px 2px' },

  more: { ...noBorder, width: '100%', height: 46, borderTop: '1px solid var(--bento-line)', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', textAlign: 'left', cursor: 'pointer' },
  moreSand: { borderTop: '1px solid var(--bento-sand-line)', color: 'var(--bento-sand-ink-strong)' },
  // "Ver as N" de um grupo que não é um cartão só (frases, estudos).
  moreCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '0 18px', overflow: 'hidden' },

  whiteCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '2px 18px' },
  whiteCardMore: { padding: '2px 18px 0' },
  whiteRow: { ...rowReset, padding: '12px 0' },
  whiteLine: { borderBottom: '1px solid var(--bento-line)' },
  whiteTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '0 0 5px' },
  whiteTitle: { minWidth: 0, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', overflowWrap: 'anywhere' },
  whiteWhen: { flexShrink: 0, fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },
  whiteExcerpt: { display: 'block', fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-quote-ink)', overflowWrap: 'anywhere' },

  sandCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '0 18px' },
  sandRow: { ...rowReset, padding: '14px 0 15px' },
  sandLine: { borderTop: '1px solid var(--bento-sand-line)' },
  sandQuote: { display: 'block', fontFamily: FONT, fontSize: 14, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.45, color: 'var(--bento-sand-ink-strong)', margin: '0 0 7px', overflowWrap: 'anywhere' },
  sandRef: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-icon)' },
  sandNote: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-note)', margin: '8px 0 0', overflowWrap: 'anywhere' },

  blackCard: { ...rowReset, borderRadius: 24, background: 'var(--bento-ink)', padding: '15px 18px' },
  blackQuote: { display: 'block', fontFamily: FONT, fontSize: 14.5, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.45, color: '#fff', margin: '0 0 8px', overflowWrap: 'anywhere' },
  blackMeta: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,.55)' },
}
