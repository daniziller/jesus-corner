// NotasScreen.jsx — a tela do tipo Notas (handoff-biblioteca-55 §5, montada
// com as peças de L3): as notas presas a um versículo (e as notas de
// sessão de leitura, presas aos capítulos). Por livro — cartões brancos
// com o quadradinho na cor do bloco, as duas notas mais recentes e "Ver
// as N" — ou por data. Tocar numa nota abre a Bíblia ali, com a nota
// aberta. Só lista e abre; as contas moram em src/biblioteca/tiposMath.js.
import { useState, useMemo } from 'react'
import { notesSummary, notesTabs, notesByBook, bookMarksShown, noteRow, groupByMonth, pageOf, emptyNotes } from '../biblioteca/tiposMath'
import { byRecent, bibliotecaText } from '../biblioteca/bibliotecaMath'
import { usePaginas } from '../biblioteca/usePaginas'
import { useSegurar } from '../biblioteca/useSegurar'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import AbasDePedidos from '../components/pedidos/AbasDePedidos'
import RotuloDeGrupo from '../components/biblioteca/RotuloDeGrupo'
import CartaoDeLivro from '../components/biblioteca/CartaoDeLivro'
import LinhaDeNota from '../components/biblioteca/LinhaDeNota'
import { BotaoDaLupa, ListaDoTipo, EstadoDoTipo, tipoStyles as t } from '../components/biblioteca/TelaDeTipo'

export default function NotasScreen({ lang, status, items, initial, onBack, onOpenSearch, onOpenItem, onMenu }) {
  const [tab, setTab] = useState(initial?.tab ?? 'livro')
  const [expanded, setExpanded] = useState(() => new Set(initial?.expanded ?? []))
  const books = useMemo(() => notesByBook(items, lang), [items, lang])
  const list = useMemo(() => byRecent(items), [items])
  const [pages, sentinelRef] = usePaginas(tab)
  const { visible, hasMore } = pageOf(list, pages)
  const { holdProps, wasHeld } = useSegurar(onMenu)

  const row = (item, first = false) => (
    <LinhaDeNota key={item.key} row={noteRow(item, { lang })} first={first} hold={holdProps(item)} onOpen={() => { if (!wasHeld()) onOpenItem(item) }} />
  )

  return (
    <div style={t.screen}>
      <CabecalhoDoPasso title={bibliotecaText(lang, 'type_nota')} subtitle={status === 'ready' ? notesSummary(items, lang) : ''} onBack={onBack} clock={<BotaoDaLupa onClick={onOpenSearch} />} />
      <ListaDoTipo>
        {status !== 'ready' ? <EstadoDoTipo status={status} /> : (
          <>
            <AbasDePedidos tabs={notesTabs(lang)} current={tab} onChange={setTab} label={bibliotecaText(lang, 'howNotes')} />
            {items.length === 0 ? <div style={t.empty}><p style={t.emptyText}>{emptyNotes(lang)}</p></div> : tab === 'livro' ? (
              books.map(group => (
                <CartaoDeLivro
                  key={group.book} tone="white" group={group} expanded={expanded.has(group.book)} renderRow={item => row(item)}
                  onExpand={() => setExpanded(prev => new Set(prev).add(group.book))}
                />
              ))
            ) : (
              groupByMonth(visible, lang).map(group => (
                <section key={group.key} style={t.group} aria-label={group.label}>
                  <RotuloDeGrupo>{group.label}</RotuloDeGrupo>
                  <div style={t.whiteCard}>{group.items.map((item, i) => row(item, i === 0))}</div>
                </section>
              ))
            )}
            {tab !== 'livro' && hasMore && <div ref={sentinelRef} style={t.sentinel} aria-hidden="true" />}
          </>
        )}
      </ListaDoTipo>
    </div>
  )
}
