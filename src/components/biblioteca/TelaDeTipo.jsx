// TelaDeTipo.jsx — as peças que toda tela de tipo da Biblioteca usa
// (handoff-biblioteca-55 §1): o botão da lupa do cabeçalho, o corpo que
// rola, o estado de carregando/erro e os estilos comuns (grupo, vazio,
// cartão areia de linhas). O cabeçalho é o de sempre (CabecalhoDoPasso):
// voltar · nome do tipo com a linha de resumo · lupa.
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

export function BotaoDaLupa({ onClick }) {
  return (
    <button type="button" className="biblioteca-alvo" style={tipoStyles.lupa} onClick={onClick} aria-label="Buscar neste tipo">
      <AppIcon name="Search" size={16} strokeWidth={2.4} color="var(--bento-ink)" />
    </button>
  )
}

export function ListaDoTipo({ children }) {
  return <div style={tipoStyles.scroll}><div style={tipoStyles.body}>{children}</div></div>
}

// Carregando: caixas vazias, nunca um spinner de tela cheia.
export function EstadoDoTipo({ status }) {
  if (status === 'error') return <p style={tipoStyles.note}>Não foi possível carregar a sua Biblioteca agora.</p>
  return (
    <div aria-busy="true" aria-label="Carregando" style={{ display: 'contents' }}>
      {[0, 1, 2].map(i => <div key={i} className="rb-context-skeleton" style={{ height: 132, borderRadius: 24, background: 'var(--bento-line)' }} />)}
    </div>
  )
}

export const tipoStyles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  scroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  body: { padding: '14px 20px calc(22px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },
  lupa: { width: 38, height: 38, flexShrink: 0, border: 'none', borderRadius: 13, background: 'var(--bento-card)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  group: { display: 'flex', flexDirection: 'column', gap: 10 },
  sandCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '2px 18px 3px' },
  empty: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  emptyText: { fontFamily: FONT, fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, color: 'var(--bento-t2)', margin: 0 },
  emptyButton: { alignSelf: 'flex-start', height: 44, border: 'none', borderRadius: 14, background: 'var(--bento-ink)', padding: '0 16px', fontFamily: FONT, fontSize: 13, fontWeight: 800, lineHeight: 1, color: '#fff', cursor: 'pointer' },
  note: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '10px 2px 0' },
  sentinel: { height: 1 },
}
