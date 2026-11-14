// BuscaDaBibliotecaScreen.jsx — a busca da aba Biblioteca (L4 e L5,
// handoff-biblioteca-55 §6): uma tela só, em dois estados. Antes de
// digitar (L4): em que tipo buscar, os três refinamentos (livro, período,
// pregador), as etiquetas mais usadas e as buscas recentes. Com algo a
// procurar (L5): as pastilhas com contagem, os refinamentos aplicados e
// os resultados separados por tipo, cada grupo no visual do seu tipo, com
// a palavra realçada. O estado sai do que está digitado e dos filtros
// (isSearching) — nunca de uma rota à parte.
//
// O que está digitado, os filtros e a rolagem moram em quem chama
// (BibliotecaScreen.jsx): abrir um resultado e voltar devolve a busca
// como estava. A resposta espera ~250 ms depois da última tecla; a conta
// é feita no aparelho, sobre os itens que a aba já carregou — só o que é
// da pessoa. As contas moram em src/biblioteca/buscaDaBiblioteca.js (os
// filtros) e resultadosDaBusca.js (a comparação e os grupos).
import { useRef, useState, useMemo, useEffect, useLayoutEffect } from 'react'
import { SEARCH_TYPES, refineSelectors, bookOptions, preacherOptions, tagCloud } from '../biblioteca/buscaDaBiblioteca'
import { isSearching, searchLibrary, withoutFilters, foundCounts } from '../biblioteca/resultadosDaBusca'
import { useTrechos } from '../biblioteca/useTrechos'
import { useDebounced } from '../utils/useDebounced'
import { CabecalhoDeBusca, ListaCartao, ListaLinha } from '../components/biblia/BuscaPartes'
import RotuloDeGrupo from '../components/biblioteca/RotuloDeGrupo'
import PastilhaDeFiltro, { FileiraDePastilhas } from '../components/biblioteca/PastilhaDeFiltro'
import SeletorDeRefinar from '../components/biblioteca/SeletorDeRefinar'
import GrupoDeResultados from '../components/biblioteca/GrupoDeResultados'
import FolhaDeOpcoes from '../components/biblioteca/FolhaDeOpcoes'
import FolhaDePeriodo from '../components/biblioteca/FolhaDePeriodo'
import { ListaDoTipo, tipoStyles as t } from '../components/biblioteca/TelaDeTipo'

const FONT = 'var(--font-bento)'

const DEBOUNCE_MS = 250

export default function BuscaDaBibliotecaScreen({
  lang, api, items, studyItems, readByDay, refreshKey, search, onSearchChange, scrollMemory,
  recents, onClearRecents, onRemember, onBack, onOpenItem,
}) {
  const inputRef = useRef(null)
  const [sheet, setSheet] = useState(null)
  const set = patch => onSearchChange({ ...search, ...patch })
  // Uma etiqueta ou uma busca recente: preenche o campo e busca.
  function fill(text) {
    set({ query: text })
    inputRef.current?.focus()
  }

  // O texto que vale para a conta: o digitado, ~250 ms depois da última
  // tecla (apagar tudo vale na hora).
  const debounced = useDebounced(search.query, DEBOUNCE_MS)
  const term = search.query.trim() ? debounced : ''
  const effective = useMemo(() => ({ ...search, query: term }), [search, term])
  const searching = isSearching(effective)

  // O texto dos trechos marcados: a busca procura neles, e eles aparecem
  // nos resultados. A marcação não guarda o texto do versículo.
  const marks = useMemo(() => items.filter(i => i.type === 'marcacao'), [items])
  const verseTexts = useTrechos(marks, api, lang)

  const everything = useMemo(() => [...items, ...studyItems], [items, studyItems])
  const [pages, setPages] = useState(1)
  const resetKey = JSON.stringify([term, search.type, search.book, search.period, search.preacher, !!search.browse])
  useEffect(() => { setPages(1) }, [resetKey])
  const result = useMemo(
    () => (searching ? searchLibrary({ items: everything, search: effective, verseTexts, readByDay, lang, pages }) : null),
    [searching, everything, effective, verseTexts, readByDay, lang, pages],
  )

  // Mais uma página quando o fim da lista entra na tela.
  const sentinelRef = useRef(null)
  const hasMore = !!result?.groups.some(g => g.hasMore)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) setPages(p => p + 1) }, { rootMargin: '400px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  })

  // A rolagem volta para onde estava: ao voltar de um resultado aberto
  // por dentro da aba (a tela remonta) e ao voltar de outra aba (a aba
  // fica montada, mas escondida — `refreshKey` muda a cada visita).
  const scrollRef = useRef(null)
  useLayoutEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollMemory.current }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // Uma busca nova começa do topo.
  const firstKey = useRef(resetKey)
  useEffect(() => {
    if (firstKey.current === resetKey) return
    firstKey.current = resetKey
    scrollMemory.current = 0
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [resetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Abrir um resultado (ou um grupo inteiro) guarda a busca nas recentes.
  function remember() {
    if (result?.term) onRemember({ text: result.term, counts: foundCounts(result) })
  }
  function openResult(item) {
    remember()
    onOpenItem(item)
  }
  function seeAll(type) {
    remember()
    set({ type })
  }

  const selectors = refineSelectors(search, items, lang)
  const tags = tagCloud(items)
  const preachers = preacherOptions(items)

  return (
    <div style={t.screen}>
      <CabecalhoDeBusca
        value={search.query} onChange={query => set({ query })} onClear={() => fill('')} inputRef={inputRef}
        onBack={onBack} placeholder="Palavra, referência, pregador…" label="Buscar na Biblioteca"
      />
      <ListaDoTipo scrollRef={scrollRef} onScroll={e => { scrollMemory.current = e.currentTarget.scrollTop }}>
        {searching ? (
          <FileiraDePastilhas label="Buscar em">
            {result.pills.map(pill => (
              <PastilhaDeFiltro key={pill.key} label={pill.label} count={pill.count} active={pill.key === result.active} onClick={() => set({ type: pill.key })} />
            ))}
          </FileiraDePastilhas>
        ) : (
          <>
            <RotuloDeGrupo>Buscar em</RotuloDeGrupo>
            <FileiraDePastilhas label="Buscar em">
              {SEARCH_TYPES.map(type => (
                <PastilhaDeFiltro key={type.key} label={type.label} active={type.key === search.type} onClick={() => set({ type: type.key })} />
              ))}
            </FileiraDePastilhas>
            <RotuloDeGrupo>Refinar</RotuloDeGrupo>
          </>
        )}

        <div style={s.selectors}>
          {selectors.map(selector => <SeletorDeRefinar key={selector.key} selector={selector} onClick={() => setSheet(selector.key)} />)}
        </div>

        {searching ? (
          <div style={s.results} aria-live="polite">
            {result.groups.map(group => (
              <GrupoDeResultados key={group.type} group={group} onOpen={openResult} onSeeAll={() => seeAll(group.type)} />
            ))}
            {result.empty && (
              <div style={t.empty}>
                <p style={t.emptyText}>{result.empty.message}</p>
                {result.empty.canClear && <button type="button" style={t.emptyButton} onClick={() => onSearchChange(withoutFilters(search))}>Buscar sem os filtros</button>}
              </div>
            )}
            {hasMore && <div ref={sentinelRef} style={t.sentinel} aria-hidden="true" />}
          </div>
        ) : (
          <>
            {tags.length > 0 && (
              <>
                <RotuloDeGrupo>Suas etiquetas</RotuloDeGrupo>
                <div style={s.tags} role="group" aria-label="Suas etiquetas">
                  {tags.map(tag => (
                    <button key={tag.tag} type="button" className="biblioteca-etiqueta" style={s.tag} onClick={() => fill(tag.tag)} aria-label={`Buscar pela etiqueta ${tag.tag}, ${tag.count}`}>
                      {tag.label}
                      <span style={s.tagCount}>{tag.count}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {recents.length > 0 && (
              <>
                <RotuloDeGrupo right="Limpar" onRight={onClearRecents}>Buscas recentes</RotuloDeGrupo>
                <ListaCartao>
                  {recents.map((recent, i) => (
                    <ListaLinha key={recent.text} icon="Clock" title={recent.text} sub={recent.sub} last={i === recents.length - 1} onClick={() => fill(recent.text)} />
                  ))}
                </ListaCartao>
              </>
            )}

            <p style={s.footnote}>A busca lê só o que é seu. Nada daqui vai para grupo.</p>
          </>
        )}
      </ListaDoTipo>

      {sheet === 'book' && (
        <FolhaDeOpcoes
          title="Livro" groups={bookOptions(items, lang).map(block => ({ id: block.id, name: block.name, options: block.books.map(b => ({ key: b.book, label: b.label, count: b.count })) }))}
          current={search.book} onChoose={book => set({ book })} onClear={search.book ? () => set({ book: null }) : null} onClose={() => setSheet(null)}
          empty="Ainda não há nada guardado em nenhum livro."
        />
      )}
      {sheet === 'period' && <FolhaDePeriodo period={search.period} onChange={period => set({ period })} onClose={() => setSheet(null)} />}
      {sheet === 'preacher' && (
        <FolhaDeOpcoes
          title="Pregador" options={preachers.map(p => ({ key: p.label, label: p.label, count: p.count }))}
          current={search.preacher} onChoose={preacher => set({ preacher })} onClear={search.preacher ? () => set({ preacher: null }) : null} onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

const s = {
  selectors: { display: 'flex', gap: 6 },
  results: { display: 'flex', flexDirection: 'column', gap: 10 },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: { height: 32, border: 'none', borderRadius: 11, background: 'var(--bento-card)', padding: '0 11px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', whiteSpace: 'nowrap', cursor: 'pointer' },
  tagCount: { fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t4)' },
  footnote: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t4)', textAlign: 'center', margin: '0 2px' },
}
