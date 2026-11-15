// AplicacoesScreen.jsx — a tela do tipo Aplicações (handoff-biblioteca-55
// §5): as frases do dia, cada uma num cartão preto, com o filtro Todas ·
// Cumpridas · Em aberto e grupos por mês. Tocar numa frase abre a
// reflexão daquele dia. Só lista e abre; as contas moram em
// src/biblioteca/tiposMath.js.
import { useState, useMemo } from 'react'
import { applicationsSummary, applicationFilters, applicationList, applicationCard, groupByMonth, pageOf, emptyApplications } from '../biblioteca/tiposMath'
import { bibliotecaText } from '../biblioteca/bibliotecaMath'
import { usePaginas } from '../biblioteca/usePaginas'
import { useSegurar } from '../biblioteca/useSegurar'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import RotuloDeGrupo from '../components/biblioteca/RotuloDeGrupo'
import PastilhaDeFiltro, { FileiraDePastilhas } from '../components/biblioteca/PastilhaDeFiltro'
import CartaoDeAplicacao from '../components/biblioteca/CartaoDeAplicacao'
import { BotaoDaLupa, ListaDoTipo, EstadoDoTipo, tipoStyles as t } from '../components/biblioteca/TelaDeTipo'

export default function AplicacoesScreen({ lang, status, items, initial, onBack, onOpenSearch, onOpenItem, onMenu }) {
  const [filter, setFilter] = useState(initial?.filter ?? 'all')
  const list = useMemo(() => applicationList(items, filter), [items, filter])
  const [pages, sentinelRef] = usePaginas(filter)
  const { visible, hasMore } = pageOf(list, pages)
  const { holdProps, wasHeld } = useSegurar(onMenu)

  return (
    <div style={t.screen}>
      <CabecalhoDoPasso title={bibliotecaText(lang, 'type_aplicacao')} subtitle={status === 'ready' ? applicationsSummary(items, lang) : ''} onBack={onBack} clock={<BotaoDaLupa onClick={onOpenSearch} />} />
      <ListaDoTipo>
        {status !== 'ready' ? <EstadoDoTipo status={status} /> : (
          <>
            <FileiraDePastilhas label={bibliotecaText(lang, 'filter')}>
              {applicationFilters(items, lang).map(f => (
                <PastilhaDeFiltro key={f.key} label={f.label} count={f.count} active={f.key === filter} onClick={() => setFilter(f.key)} />
              ))}
            </FileiraDePastilhas>
            {list.length === 0 && <div style={t.empty}><p style={t.emptyText}>{emptyApplications(filter, lang)}</p></div>}
            {groupByMonth(visible, lang).map(group => (
              <section key={group.key} style={t.group} aria-label={group.label}>
                <RotuloDeGrupo>{group.label}</RotuloDeGrupo>
                {group.items.map(item => (
                  <CartaoDeAplicacao key={item.key} card={applicationCard(item, { lang })} hold={holdProps(item)} onOpen={() => { if (!wasHeld()) onOpenItem(item) }} />
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
