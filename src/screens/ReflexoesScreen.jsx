// ReflexoesScreen.jsx — a tela do tipo Reflexões (handoff-biblioteca-55
// §5, montada com as peças de L2): o que foi escrito no passo Reflexão do
// plano, mais recentes primeiro, em grupos por mês. Cada cartão traz o
// livro e os capítulos do dia, o começo da primeira resposta e, se
// houver, a frase daquele dia. Tocar abre a reflexão em leitura. Só lista
// e abre; as contas moram em src/biblioteca/tiposMath.js.
import { useMemo } from 'react'
import { reflectionsSummary, reflectionCard, phrasesByDate, groupByMonth, pageOf, emptyReflections } from '../biblioteca/tiposMath'
import { byRecent, bibliotecaText } from '../biblioteca/bibliotecaMath'
import { usePaginas } from '../biblioteca/usePaginas'
import { useSegurar } from '../biblioteca/useSegurar'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import RotuloDeGrupo from '../components/biblioteca/RotuloDeGrupo'
import CartaoDeReflexao from '../components/biblioteca/CartaoDeReflexao'
import { BotaoDaLupa, ListaDoTipo, EstadoDoTipo, tipoStyles as t } from '../components/biblioteca/TelaDeTipo'

export default function ReflexoesScreen({ lang, status, items, allItems, readByDay, onBack, onOpenSearch, onOpenItem, onMenu }) {
  const list = useMemo(() => byRecent(items), [items])
  const phrases = useMemo(() => phrasesByDate(allItems), [allItems])
  const [pages, sentinelRef] = usePaginas('reflexoes')
  const { visible, hasMore } = pageOf(list, pages)
  const { holdProps, wasHeld } = useSegurar(onMenu)

  return (
    <div style={t.screen}>
      <CabecalhoDoPasso title={bibliotecaText(lang, 'type_reflexao')} subtitle={status === 'ready' ? reflectionsSummary(items, lang) : ''} onBack={onBack} clock={<BotaoDaLupa onClick={onOpenSearch} />} />
      <ListaDoTipo>
        {status !== 'ready' ? <EstadoDoTipo status={status} /> : items.length === 0 ? (
          <div style={t.empty}><p style={t.emptyText}>{emptyReflections(lang)}</p></div>
        ) : (
          <>
            {groupByMonth(visible, lang).map(group => (
              <section key={group.key} style={t.group} aria-label={group.label}>
                <RotuloDeGrupo>{group.label}</RotuloDeGrupo>
                {group.items.map(item => (
                  <CartaoDeReflexao
                    key={item.key} card={reflectionCard(item, { readByDay, phrases, lang })} hold={holdProps(item)}
                    onOpen={() => { if (!wasHeld()) onOpenItem(item) }}
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
