// PrayerRequestsScreen.jsx — Pedidos de oração, a lista (O1, handoff-
// passos-pedidos-53-54 §7). Com a barra de abas do app no rodapé.
//
// De cima para baixo: o cabeçalho com "Novo"; o cartão "orações pelos
// outros" (a família "Oração pelos outros"); as abas Ativos · Respondidos
// · Do grupo (e Amigos, quando há pedido de amigo); um cartão por pedido
// ativo, com UM botão — o "orei", o mesmo da Súplica (pedidos/orei.js),
// uma vez por pedido por dia, sem desmarcar; e o bloco areia dos
// respondidos.
//
// "Novo" abre "Fazer um pedido" (O2). Tocar num pedido meu abre "Como Deus
// respondeu?" (O3); tocar num pedido de
// outra pessoa, ou num já respondido, abre o detalhe do pedido — é onde
// ficam os comentários, que continuam existindo.
//
// Privacidade: de um pedido aparecem o texto, a origem e QUANTAS pessoas
// oraram — nunca quem.
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import CartaoOracoesPelosOutros from '../components/pedidos/CartaoOracoesPelosOutros'
import AbasDePedidos from '../components/pedidos/AbasDePedidos'
import CartaoDoPedido from '../components/pedidos/CartaoDoPedido'
import BlocoRespondidos from '../components/pedidos/BlocoRespondidos'
import FolhaComoDeusRespondeu from '../components/pedidos/FolhaComoDeusRespondeu'
import FolhaFazerPedido from '../components/pedidos/FolhaFazerPedido'
import { archivePrayerRequest } from '../groups/prayerRequestsStore'
import { usePedidos } from '../pedidos/usePedidos'
import { pedidosTabs, pedidosOfTab, answeredBlock, answeredRow, cardTap, othersCard } from '../pedidos/pedidosMath'

const FONT = 'var(--font-bento)'
const EMPTY = {
  ativos: 'Nenhum pedido por enquanto.',
  respondidos: 'Nenhum pedido respondido ainda.',
  grupo: 'Nenhum pedido do grupo por enquanto.',
  amigos: 'Nenhum pedido de amigos por enquanto.',
}

// `pedidosApi`, `formApi` e `initialTab` só existem para a pré-visualização
// de desenvolvimento.
export default function PrayerRequestsScreen({ session, authUser, onBack, onOpenRequest, onOpenFamilia, pedidosApi, formApi, initialTab = 'ativos' }) {
  const { lang } = session
  const pedidos = usePedidos({ api: pedidosApi })
  const [tab, setTab] = useState(initialTab)
  const [archiving, setArchiving] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const list = pedidos.list ?? []
  const tabs = pedidosTabs(list)
  // A aba dos amigos some quando o último pedido de amigo sai: volta a Ativos.
  const current = tabs.some(x => x.key === tab) ? tab : 'ativos'
  const rows = pedidosOfTab(list, current)
  const answered = current === 'ativos' ? answeredBlock(list) : null

  function openPedido(p) {
    if (cardTap(p) === 'responder') setArchiving(p)
    else onOpenRequest?.(p)
  }
  function openById(id) {
    const p = list.find(r => r.id === id)
    if (p) onOpenRequest?.(p)
  }

  // "Espere" não arquiva nada: o pedido continua ativo, com a contagem
  // intacta (archivePrayerRequest não chama o servidor nesse caso).
  async function handleArchive(request, response, note) {
    if (response === 'espere') { setArchiving(null); return }
    try {
      await archivePrayerRequest(request.id, response, note)
      setArchiving(null)
      pedidos.reload()
    } catch (err) {
      console.error('Failed to archive prayer request', err)
    }
  }

  return (
    <div style={s.screen}>
      <CabecalhoDoPasso
        title="Pedidos de oração" onBack={onBack} backLabel={t('a11y.goBack', undefined, lang)}
        clock={(
          <button type="button" className="passo-alvo" style={s.newBtn} onClick={() => setAddOpen(true)}>
            <AppIcon name="Plus" size={13} strokeWidth={2.6} absoluteStrokeWidth color="var(--bento-accent)" />
            <span>Novo</span>
          </button>
        )}
      />

      <div style={s.body}>
        {pedidos.othersPrayed != null && (
          <CartaoOracoesPelosOutros card={othersCard(pedidos.othersPrayed)} onOpen={() => onOpenFamilia?.('oracao')} />
        )}

        <AbasDePedidos tabs={tabs} current={current} onChange={setTab} />

        <div style={s.list} role="tabpanel">
          {pedidos.loading ? (
            <p style={s.note}>Carregando os pedidos…</p>
          ) : pedidos.error ? (
            <p style={s.note}>Não foi possível carregar os pedidos agora.</p>
          ) : current === 'respondidos' ? (
            rows.length > 0
              ? <BlocoRespondidos rows={rows.map(answeredRow)} onOpen={openById} />
              : <div style={s.empty}><p style={s.emptyText}>{EMPTY.respondidos}</p></div>
          ) : (
            <>
              {rows.map(p => <CartaoDoPedido key={p.id} pedido={p} onOpen={openPedido} onOrar={pedidos.orar} />)}
              {rows.length === 0 && (
                <div style={s.empty}>
                  <p style={s.emptyText}>{EMPTY[current]}</p>
                  {current === 'ativos' && (
                    <button type="button" style={s.emptyAction} onClick={() => setAddOpen(true)}>
                      <span style={s.diamond} aria-hidden="true" />
                      <span style={s.emptyActionText}>Fazer um pedido</span>
                      <AppIcon name="ChevronRight" size={14} strokeWidth={2.6} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
                    </button>
                  )}
                </div>
              )}
              {answered && (
                <BlocoRespondidos rows={answered.rows} more={answered.more} onMore={() => setTab('respondidos')} onOpen={openById} style={s.answeredGap} />
              )}
            </>
          )}
        </div>
      </div>

      {archiving && (
        <FolhaComoDeusRespondeu
          request={archiving} onClose={() => setArchiving(null)} onArchive={handleArchive}
          onOpenComments={() => { const p = archiving; setArchiving(null); onOpenRequest?.(p) }}
        />
      )}
      {addOpen && (
        <FolhaFazerPedido lang={lang} authUser={authUser} hasAI={session.hasAI} api={formApi} onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); pedidos.reload() }} />
      )}
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  newBtn: { height: 38, flexShrink: 0, padding: '0 13px', borderRadius: 13, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: '#fff', cursor: 'pointer' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  // 6px de respiro a mais acima do bloco areia.
  answeredGap: { marginTop: 6 },
  note: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '4px 2px 0' },
  empty: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 16px 4px' },
  emptyText: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 12px' },
  emptyAction: { width: '100%', height: 50, boxSizing: 'content-box', border: 'none', borderTop: '1px solid var(--bento-line)', background: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' },
  emptyActionText: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' },
  diamond: { width: 7, height: 7, flexShrink: 0, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 1.5 },
}
