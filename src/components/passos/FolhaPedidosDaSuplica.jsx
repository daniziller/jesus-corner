// FolhaPedidosDaSuplica.jsx — todos os pedidos, por cima da Súplica, sem
// sair da oração (pedido dela, 2026-11-18). Antes, o rótulo do cartão e
// "Ver os {n} pedidos" levavam à lista de pedidos (O1): o relógio pausava
// e a pessoa saía da tela. Agora abrem esta folha, e o relógio segue
// contando — o tempo que falta na etapa fica no alto da folha, com a
// barra de quanto já passou.
//
// De cima para baixo: o título com o relógio da etapa; a frase de apoio e
// o contador ("2 de 7 orados" — ou "Você orou por todos os pedidos de
// hoje."); as abas Ativos · Do grupo · Amigos (só quando há mais de um
// tipo de pedido); as linhas, com o mesmo check "orei" do cartão (marca e,
// só nesta oração, desmarca); "Fazer um pedido", que abre a folha de
// pedido por cima desta; e "Voltar à oração". A lista completa (O1) fica
// como saída secundária, avisando que pausa a oração.
//
// Privacidade: de cada pedido só aparecem o texto, a origem e QUANTAS
// pessoas oraram — nunca quem.
import { useState } from 'react'
import AppIcon from '../../icons/AppIcon'
import FolhaInferior from '../FolhaInferior'
import AbasDePedidos from '../pedidos/AbasDePedidos'
import LinhaDoPedido from './LinhaDoPedido'
import { suplicaSheetView } from '../../pedidos/pedidosMath.js'
import { t, currentLanguage } from '../../i18n'

const FONT = 'var(--font-bento)'

export default function FolhaPedidosDaSuplica({ list, loading, error, sessionMarks, clock, onOrar, onDesfazer, onAdd, onOpenFullList, onClose }) {
  const lang = currentLanguage()
  const [tab, setTab] = useState('ativos')
  const view = suplicaSheetView(list, tab, lang)

  return (
    <FolhaInferior onClose={onClose} labelledBy="suplica-folha-titulo" fixed form>
      <div style={s.top}>
        <h2 style={s.title} id="suplica-folha-titulo">{t('passosTx.requestsTitle')}</h2>
        {clock && (
          <span style={s.clock} role="img" aria-label={t('passosTx.sheetClockAria', { aria: clock.aria })}>
            <span style={{ ...s.clockTime, ...(clock.overtime ? s.overtime : null), opacity: clock.running === false ? 0.6 : 1 }} aria-hidden="true">{clock.text}</span>
          </span>
        )}
      </div>
      {clock && (
        <div style={s.bar} aria-hidden="true">
          <div style={{ ...s.barFill, width: `${Math.round(clock.progress * 100)}%`, ...(clock.overtime ? s.barDone : null) }} />
        </div>
      )}
      <p style={s.sub}>
        {t('passosTx.sheetSub')}
        {view.counter && <>{' '}<span style={s.counter} role="status">{view.allPrayed ?? view.counter}</span></>}
      </p>

      {view.tabs.length > 0 && (
        <AbasDePedidos tabs={view.tabs} current={view.current} onChange={setTab} label={t('passosTx.requestsTitle')} />
      )}

      <section style={s.card} role={view.tabs.length > 0 ? 'tabpanel' : undefined}>
        {loading ? (
          <p style={s.note}>{t('passosTx.loadingRequests')}</p>
        ) : error ? (
          <p style={s.note}>{t('passosTx.requestsError')}</p>
        ) : view.empty ? (
          <p style={s.note}>{t('passosTx.noRequests')}</p>
        ) : (
          view.rows.map((p, i) => (
            <LinhaDoPedido key={p.id} pedido={p} sessionMarks={sessionMarks} onOrar={onOrar} onDesfazer={onDesfazer} first={i === 0} />
          ))
        )}

        <button type="button" style={s.line} onClick={onAdd}>
          <span style={s.diamond} aria-hidden="true" />
          <span style={s.lineText}>{t('passosTx.makeRequest')}</span>
          <AppIcon name="ChevronRight" size={14} strokeWidth={2.6} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
        </button>
      </section>

      <button type="button" style={s.fullList} onClick={onOpenFullList}>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <span style={s.fullListTitle}>{t('passosTx.openFullList')}</span>
          <span style={s.fullListSub}>{t('passosTx.openFullListSub')}</span>
        </div>
        <AppIcon name="ChevronRight" size={14} strokeWidth={2.6} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
      </button>

      <button type="button" style={s.back} onClick={onClose}>
        <span>{t('passosTx.backToPrayer')}</span>
        <AppIcon name="ArrowRight" size={16} strokeWidth={2.6} color="var(--bento-ink)" style={{ flexShrink: 0 }} />
      </button>
    </FolhaInferior>
  )
}

const s = {
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '0 0 10px' },
  title: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: 0 },
  // O relógio da etapa, como no cartão preto da oração: uma pílula de tinta
  // com o tempo que falta; apagado quando a oração está pausada.
  clock: { flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 11, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center' },
  clockTime: { fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1, letterSpacing: '-.2px', color: '#fff', fontVariantNumeric: 'tabular-nums', transition: 'opacity .2s' },
  overtime: { color: 'rgba(255,255,255,.45)' },
  bar: { height: 4, borderRadius: 99, background: 'var(--bento-line)', margin: '0 0 10px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)', transition: 'width .25s linear' },
  barDone: { background: 'var(--bento-t5)' },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 12px' },
  counter: { fontWeight: 800, color: 'var(--bento-ink)', whiteSpace: 'nowrap' },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '14px 16px 4px', margin: '10px 0 0' },
  note: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0, padding: '2px 0 13px' },
  line: { width: '100%', height: 50, boxSizing: 'content-box', border: 'none', borderTop: '1px solid var(--bento-line)', background: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' },
  lineText: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' },
  diamond: { width: 7, height: 7, flexShrink: 0, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 1.5 },

  fullList: { width: '100%', boxSizing: 'border-box', minHeight: 48, border: 'none', background: 'none', padding: '12px 2px', margin: '6px 0 4px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  fullListTitle: { display: 'block', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-sand-icon)', margin: '0 0 2px' },
  fullListSub: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t4)' },

  back: { width: '100%', height: 54, border: 'none', borderRadius: 18, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
}
