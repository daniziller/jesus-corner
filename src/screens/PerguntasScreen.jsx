// PerguntasScreen.jsx — a tela do tipo Perguntas (handoff-biblioteca-55
// §5): as perguntas feitas à IA que a pessoa guardou (ficam só neste
// aparelho), mais recentes primeiro, em grupos por mês. Tocar abre a
// conversa guardada; a referência abre a Bíblia ali. Só lista e abre; as
// contas moram em src/biblioteca/tiposMath.js.
import { useMemo } from 'react'
import { questionsSummary, questionCard, groupByMonth, pageOf, EMPTY_QUESTIONS } from '../biblioteca/tiposMath'
import { byRecent } from '../biblioteca/bibliotecaMath'
import { usePaginas } from '../biblioteca/usePaginas'
import { useSegurar } from '../biblioteca/useSegurar'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import RotuloDeGrupo from '../components/biblioteca/RotuloDeGrupo'
import CartaoDePergunta from '../components/biblioteca/CartaoDePergunta'
import { BotaoDaLupa, ListaDoTipo, EstadoDoTipo, tipoStyles as t } from '../components/biblioteca/TelaDeTipo'

export default function PerguntasScreen({ lang, status, items, onBack, onOpenSearch, onOpenItem, onOpenPassage, onMenu }) {
  const list = useMemo(() => byRecent(items), [items])
  const [pages, sentinelRef] = usePaginas('perguntas')
  const { visible, hasMore } = pageOf(list, pages)
  const { holdProps, wasHeld } = useSegurar(onMenu)

  return (
    <div style={t.screen}>
      <CabecalhoDoPasso title="Perguntas" subtitle={status === 'ready' ? questionsSummary(items) : ''} onBack={onBack} clock={<BotaoDaLupa onClick={onOpenSearch} />} />
      <ListaDoTipo>
        {status !== 'ready' ? <EstadoDoTipo status={status} /> : items.length === 0 ? (
          <div style={t.empty}><p style={t.emptyText}>{EMPTY_QUESTIONS}</p></div>
        ) : (
          <>
            {groupByMonth(visible).map(group => (
              <section key={group.key} style={t.group} aria-label={group.label}>
                <RotuloDeGrupo>{group.label}</RotuloDeGrupo>
                {group.items.map(item => (
                  <CartaoDePergunta
                    key={item.key} card={questionCard(item, { lang })} hold={holdProps(item)}
                    onOpen={() => { if (!wasHeld()) onOpenItem(item) }} onOpenPassage={onOpenPassage}
                  />
                ))}
              </section>
            ))}
            {hasMore && <div ref={sentinelRef} style={t.sentinel} aria-hidden="true" />}
          </>
        )}
      </ListaDoTipo>
    </div>
  )
}
