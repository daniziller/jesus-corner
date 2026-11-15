// MarcacoesScreen.jsx — a tela do tipo Marcações (L3, handoff-
// biblioteca-55 §4): os trechos grifados, com ou sem nota. Por livro (um
// cartão areia por livro, em ordem canônica, com o quadradinho na cor do
// bloco e os dois trechos mais recentes), por data ou só os que têm nota.
// Tocar num trecho abre a Bíblia naquele versículo. Só lista e abre; as
// contas moram em src/biblioteca/tiposMath.js.
import { useState, useMemo } from 'react'
import { marksSummary, marksTabs, marksByBook, bookMarksShown, marksList, markRow, groupByMonth, pageOf, emptyMarks } from '../biblioteca/tiposMath'
import { bibliotecaText } from '../biblioteca/bibliotecaMath'
import { usePaginas } from '../biblioteca/usePaginas'
import { useSegurar } from '../biblioteca/useSegurar'
import { useTrechos } from '../biblioteca/useTrechos'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import AbasDePedidos from '../components/pedidos/AbasDePedidos'
import RotuloDeGrupo from '../components/biblioteca/RotuloDeGrupo'
import CartaoDeLivro from '../components/biblioteca/CartaoDeLivro'
import LinhaDeTrecho from '../components/biblioteca/LinhaDeTrecho'
import { BotaoDaLupa, ListaDoTipo, EstadoDoTipo, tipoStyles as t } from '../components/biblioteca/TelaDeTipo'

export default function MarcacoesScreen({ lang, api, status, items, initial, onBack, onOpenSearch, onOpenItem, onMenu }) {
  const [tab, setTab] = useState(initial?.tab ?? 'livro')
  // Os livros abertos por "Ver os N de {Livro}".
  const [expanded, setExpanded] = useState(() => new Set(initial?.expanded ?? []))

  const books = useMemo(() => marksByBook(items, lang), [items, lang])
  const list = useMemo(() => marksList(items, tab), [items, tab])
  const [pages, sentinelRef] = usePaginas(tab)
  const { visible, hasMore } = pageOf(list, pages)

  // O texto só dos trechos que estão na tela.
  const shown = useMemo(
    () => (tab === 'livro' ? books.flatMap(group => bookMarksShown(group, expanded.has(group.book))) : visible),
    [tab, books, expanded, visible],
  )
  const texts = useTrechos(shown, api, lang)
  const { holdProps, wasHeld } = useSegurar(onMenu)

  const row = (item, first = false) => (
    <LinhaDeTrecho
      key={item.key} row={markRow(item, { lang })} text={texts[item.key]} first={first}
      hold={holdProps(item)} onOpen={() => { if (!wasHeld()) onOpenItem(item) }}
    />
  )

  return (
    <div style={t.screen}>
      <CabecalhoDoPasso title={bibliotecaText(lang, 'type_marcacao')} subtitle={status === 'ready' ? marksSummary(items, lang) : ''} onBack={onBack} clock={<BotaoDaLupa onClick={onOpenSearch} />} />
      <ListaDoTipo>
        {status !== 'ready' ? <EstadoDoTipo status={status} /> : (
          <>
            <AbasDePedidos tabs={marksTabs(items, lang)} current={tab} onChange={setTab} label={bibliotecaText(lang, 'howMarks')} />
            {tab === 'livro' ? (
              books.map(group => (
                <CartaoDeLivro
                  key={group.book} group={group} expanded={expanded.has(group.book)} renderRow={item => row(item)}
                  onExpand={() => setExpanded(prev => new Set(prev).add(group.book))}
                />
              ))
            ) : (
              groupByMonth(visible, lang).map(group => (
                <section key={group.key} style={t.group} aria-label={group.label}>
                  <RotuloDeGrupo>{group.label}</RotuloDeGrupo>
                  <div style={t.sandCard}>{group.items.map((item, i) => row(item, i === 0))}</div>
                </section>
              ))
            )}
            {(tab === 'livro' ? books.length : list.length) === 0 && <div style={t.empty}><p style={t.emptyText}>{emptyMarks(tab, lang)}</p></div>}
            {tab !== 'livro' && hasMore && <div ref={sentinelRef} style={t.sentinel} aria-hidden="true" />}
          </>
        )}
      </ListaDoTipo>
    </div>
  )
}
