// BibliotecaScreen.jsx — a raiz da aba Biblioteca (L1, handoff-
// biblioteca-55 §2). Um índice, não uma lista: a busca, o total, um
// quadrado por tipo de anotação, o cartão preto de Estudos e só os três
// itens mais recentes. Cada quadrado abre a tela do seu tipo; "Nova" abre
// a folha do que guardar. Aqui nada é criado nem editado.
//
// As contas (contagens, total, recentes, o cartão de Estudos) moram em
// src/biblioteca/bibliotecaMath.js; a leitura dos dados, em
// bibliotecaApi.js (`api`, trocável na pré-visualização).
import { useState, useEffect, useMemo } from 'react'
import { bibliotecaApi } from '../biblioteca/bibliotecaApi'
import { useBiblioteca } from '../biblioteca/useBiblioteca'
import { totalCard, typeTiles, recentItems, recentRows, studiesCard, isEmptyLibrary, EMPTY_LIBRARY_TEXT } from '../biblioteca/bibliotecaMath'
import AppIcon from '../icons/AppIcon'
import RotuloDeGrupo from '../components/biblioteca/RotuloDeGrupo'
import QuadradoDoTipo from '../components/biblioteca/QuadradoDoTipo'
import CartaoEstudos from '../components/biblioteca/CartaoEstudos'
import CartaoRecentes from '../components/biblioteca/CartaoRecentes'

const FONT = 'var(--font-bento)'

export default function BibliotecaScreen({
  session, api = bibliotecaApi, refreshKey = 0,
  onOpenSearch, onNova, onOpenType, onOpenStudies, onCreateStudy, onSeeAll, onOpenItem,
}) {
  const { lang } = session
  const { status, items, readByDay, studies } = useBiblioteca({ api, refreshKey })

  // O trecho das marcações sem nota que estão entre os recentes — a
  // marcação não guarda o texto do versículo.
  const recents = useMemo(() => recentItems(items), [items])
  const [verseTexts, setVerseTexts] = useState({})
  useEffect(() => {
    let cancelled = false
    for (const item of recents) {
      if (item.type !== 'marcacao' || item.note) continue
      api.verseText(item, lang).then(text => { if (!cancelled && text) setVerseTexts(prev => ({ ...prev, [item.key]: text })) }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [recents, api, lang])

  const total = totalCard(items)
  const tiles = typeTiles(items)
  const rows = recentRows(items, { readByDay, verseTexts, lang })
  const estudos = studiesCard(studies)

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <h1 style={s.title}>Biblioteca</h1>
        <button type="button" className="biblioteca-alvo" style={s.nova} onClick={onNova}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--bento-accent)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 1v10M1 6h10" /></svg>
          Nova
        </button>
      </div>

      <div style={s.body}>
        <button type="button" style={s.search} onClick={onOpenSearch}>
          <AppIcon name="Search" size={16} strokeWidth={2.5} color="var(--bento-ink)" style={{ flexShrink: 0 }} />
          <span style={s.searchText}>Buscar em tudo o que você guardou</span>
        </button>

        {status === 'loading' ? <Esqueleto /> : status === 'error' ? (
          <p style={s.note}>Não foi possível carregar a sua Biblioteca agora.</p>
        ) : (
          <>
            <div style={s.totalCard}>
              <span style={s.totalNumber}>{total.total}</span>
              <div style={s.totalText}>
                <p style={s.totalLabel}>{total.label}</p>
                {total.sub && <p style={s.totalSub}>{total.sub}</p>}
              </div>
            </div>

            <RotuloDeGrupo>Por tipo</RotuloDeGrupo>
            <div style={s.grid}>
              {tiles.map(tile => <QuadradoDoTipo key={tile.type} tile={tile} onClick={() => onOpenType(tile.type)} />)}
            </div>

            <CartaoEstudos card={estudos} onClick={estudos.action === 'create' ? onCreateStudy : onOpenStudies} />

            {isEmptyLibrary(items) ? (
              <div style={s.emptyCard}><p style={s.emptyText}>{EMPTY_LIBRARY_TEXT}</p></div>
            ) : (
              <>
                <RotuloDeGrupo right="Ver tudo" onRight={onSeeAll}>Recentes</RotuloDeGrupo>
                <CartaoRecentes rows={rows} onOpen={onOpenItem} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Carregando: as mesmas caixas, vazias — nunca um spinner de tela cheia.
function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Carregando a sua Biblioteca" style={{ display: 'contents' }}>
      <div className="rb-context-skeleton" style={{ ...s.bone, height: 66, borderRadius: 24 }} />
      <div style={s.grid}>
        {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="rb-context-skeleton" style={{ ...s.bone, height: 104, borderRadius: 22 }} />)}
      </div>
      <div className="rb-context-skeleton" style={{ ...s.bone, height: 84, borderRadius: 22 }} />
    </div>
  )
}

const s = {
  screen: { height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'var(--bento-bg)' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '22px 20px 0' },
  title: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: 0 },
  nova: { flexShrink: 0, height: 38, border: 'none', borderRadius: 13, background: 'var(--bento-ink)', padding: '0 13px', display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: '#fff', cursor: 'pointer' },
  body: { padding: '14px 20px calc(var(--nav-height) + 18px)', display: 'flex', flexDirection: 'column', gap: 10 },

  search: { width: '100%', height: 50, flexShrink: 0, border: 'none', borderRadius: 17, background: 'var(--bento-card)', padding: '0 15px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' },
  searchText: { fontFamily: FONT, fontSize: 14, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  totalCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px', display: 'flex', alignItems: 'flex-end', gap: 12 },
  totalNumber: { fontFamily: FONT, fontSize: 40, fontWeight: 800, lineHeight: 0.85, letterSpacing: '-2px', color: 'var(--bento-ink)' },
  totalText: { flex: 1, minWidth: 0, padding: '0 0 1px' },
  totalLabel: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)', margin: 0 },
  totalSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 },

  emptyCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px' },
  emptyText: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-sand-ink-strong)', margin: 0, textWrap: 'pretty' },

  note: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '10px 2px 0' },
  bone: { background: 'var(--bento-line)' },
}
