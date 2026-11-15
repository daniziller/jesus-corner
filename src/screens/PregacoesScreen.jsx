// PregacoesScreen.jsx — a tela do tipo Pregações (L2, handoff-
// biblioteca-55 §3): as anotações de sermão, culto, aula, palestra, vídeo
// e as anotações livres. Filtro pelos tipos de mensagem que a pessoa já
// usou, grupos por mês (ou por pregador) e, em cada cartão, as passagens
// citadas — tocáveis. Só lista e abre; as contas moram em
// src/biblioteca/tiposMath.js.
import { useState, useMemo } from 'react'
import {
  sermonsSummary, sermonTypeFilters, effectiveSermonType, sermonList, sermonGroups, sermonCard,
  sermonOrders, sermonOrderLabel, pageOf, emptySermons,
} from '../biblioteca/tiposMath'
import { bibliotecaText } from '../biblioteca/bibliotecaMath'
import { usePaginas } from '../biblioteca/usePaginas'
import { useSegurar } from '../biblioteca/useSegurar'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import RotuloDeGrupo from '../components/biblioteca/RotuloDeGrupo'
import PastilhaDeFiltro, { FileiraDePastilhas } from '../components/biblioteca/PastilhaDeFiltro'
import CartaoDePregacao from '../components/biblioteca/CartaoDePregacao'
import FolhaDeOpcoes from '../components/biblioteca/FolhaDeOpcoes'
import { BotaoDaLupa, ListaDoTipo, EstadoDoTipo, tipoStyles as t } from '../components/biblioteca/TelaDeTipo'

export default function PregacoesScreen({ lang, status, items, initial, onBack, onOpenSearch, onOpenItem, onOpenPassage, onMenu, onNova }) {
  const [chosenType, setChosenType] = useState(initial?.filter ?? 'all')
  const [order, setOrder] = useState(initial?.order ?? 'recent')
  const [choosingOrder, setChoosingOrder] = useState(false)
  const type = effectiveSermonType(chosenType, items)

  const list = useMemo(() => sermonList(items, { type, order }), [items, type, order])
  const [pages, sentinelRef] = usePaginas(`${type}|${order}`)
  const { visible, hasMore } = pageOf(list, pages)
  const groups = sermonGroups(visible, order, lang)
  const { holdProps, wasHeld } = useSegurar(onMenu)

  return (
    <div style={t.screen}>
      <CabecalhoDoPasso title={bibliotecaText(lang, 'type_pregacao')} subtitle={status === 'ready' ? sermonsSummary(items, lang) : ''} onBack={onBack} clock={<BotaoDaLupa onClick={onOpenSearch} />} />
      <ListaDoTipo>
        {status !== 'ready' ? <EstadoDoTipo status={status} /> : items.length === 0 ? (
          <div style={t.empty}>
            <p style={t.emptyText}>{emptySermons(lang)}</p>
            <button type="button" style={t.emptyButton} onClick={onNova}>{bibliotecaText(lang, 'newSermon')}</button>
          </div>
        ) : (
          <>
            <FileiraDePastilhas label={bibliotecaText(lang, 'messageType')}>
              {sermonTypeFilters(items, lang).map(f => (
                <PastilhaDeFiltro key={f.key} label={f.label} count={f.count} active={f.key === type} onClick={() => setChosenType(f.key)} />
              ))}
            </FileiraDePastilhas>
            {groups.map((group, i) => (
              <section key={group.key} style={t.group} aria-label={group.label}>
                {i === 0
                  ? <RotuloDeGrupo select right={sermonOrderLabel(order, lang)} rightLabel={bibliotecaText(lang, 'orderAria', { order: sermonOrderLabel(order, lang) })} onRight={() => setChoosingOrder(true)}>{group.label}</RotuloDeGrupo>
                  : <RotuloDeGrupo>{group.label}</RotuloDeGrupo>}
                {group.items.map(item => (
                  <CartaoDePregacao
                    key={item.key} card={sermonCard(item, { lang })} hold={holdProps(item)}
                    onOpen={() => { if (!wasHeld()) onOpenItem(item) }} onOpenPassage={onOpenPassage}
                  />
                ))}
              </section>
            ))}
            {hasMore && <div ref={sentinelRef} style={t.sentinel} aria-hidden="true" />}
          </>
        )}
      </ListaDoTipo>
      {choosingOrder && <FolhaDeOpcoes title={bibliotecaText(lang, 'order')} options={sermonOrders(lang)} current={order} onChoose={setOrder} onClose={() => setChoosingOrder(false)} />}
    </div>
  )
}
