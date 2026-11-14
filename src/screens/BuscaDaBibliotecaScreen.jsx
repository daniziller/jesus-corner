// BuscaDaBibliotecaScreen.jsx — a busca da aba Biblioteca (L4 e L5,
// handoff-biblioteca-55 §6): uma tela só. Antes de digitar (L4): em que
// tipo buscar, os três refinamentos (livro, período, pregador), as
// etiquetas mais usadas e as buscas recentes. O que está digitado e os
// filtros moram em `search`, de quem chama (BibliotecaScreen.jsx) — é o
// que deixa a busca como estava ao voltar de um resultado.
//
// A busca lê só os itens da pessoa, os mesmos da raiz. As contas moram em
// src/biblioteca/buscaDaBiblioteca.js.
import { useRef, useState } from 'react'
import { SEARCH_TYPES, refineSelectors, bookOptions, preacherOptions, tagCloud } from '../biblioteca/buscaDaBiblioteca'
import { CabecalhoDeBusca, ListaCartao, ListaLinha } from '../components/biblia/BuscaPartes'
import RotuloDeGrupo from '../components/biblioteca/RotuloDeGrupo'
import PastilhaDeFiltro, { FileiraDePastilhas } from '../components/biblioteca/PastilhaDeFiltro'
import SeletorDeRefinar from '../components/biblioteca/SeletorDeRefinar'
import FolhaDeOpcoes from '../components/biblioteca/FolhaDeOpcoes'
import FolhaDePeriodo from '../components/biblioteca/FolhaDePeriodo'
import { ListaDoTipo, tipoStyles as t } from '../components/biblioteca/TelaDeTipo'

const FONT = 'var(--font-bento)'

export default function BuscaDaBibliotecaScreen({ lang, items, search, onSearchChange, recents, onClearRecents, onBack }) {
  const inputRef = useRef(null)
  const [sheet, setSheet] = useState(null)
  const set = patch => onSearchChange({ ...search, ...patch })
  // Uma etiqueta ou uma busca recente: preenche o campo e busca.
  function fill(text) {
    set({ query: text })
    inputRef.current?.focus()
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
      <ListaDoTipo>
        <RotuloDeGrupo>Buscar em</RotuloDeGrupo>
        <FileiraDePastilhas label="Buscar em">
          {SEARCH_TYPES.map(type => (
            <PastilhaDeFiltro key={type.key} label={type.label} active={type.key === search.type} onClick={() => set({ type: type.key })} />
          ))}
        </FileiraDePastilhas>

        <RotuloDeGrupo>Refinar</RotuloDeGrupo>
        <div style={s.selectors}>
          {selectors.map(selector => <SeletorDeRefinar key={selector.key} selector={selector} onClick={() => setSheet(selector.key)} />)}
        </div>

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
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: { height: 32, border: 'none', borderRadius: 11, background: 'var(--bento-card)', padding: '0 11px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', whiteSpace: 'nowrap', cursor: 'pointer' },
  tagCount: { fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t4)' },
  footnote: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t4)', textAlign: 'center', margin: '0 2px' },
}
