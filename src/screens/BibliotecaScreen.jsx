// BibliotecaScreen.jsx — a aba Biblioteca (handoff-biblioteca-55): a raiz
// por tipo (L1) e, por dentro dela, a tela de cada tipo (L2, L3…), a
// página de leitura e a busca (L4/L5). A aba
// lê os dados UMA vez (useBiblioteca) e entrega às telas — a raiz e as
// telas de tipo contam com as mesmas funções, sobre os mesmos itens.
//
// A aba só lista, busca e abre. O que um toque abre é de quem chama
// (App.jsx): a anotação longa, a Bíblia no versículo. O menu de um item
// (segurar) tem Editar e Compartilhar, que só levam a outro lugar, e
// Apagar, que usa a gravação de sempre de cada tipo (bibliotecaApi.js).
//
// Fora da raiz a barra de abas some: `onPastRootChange` avisa.
import { useState, useEffect, useMemo, useRef } from 'react'
import { bibliotecaApi } from '../biblioteca/bibliotecaApi'
import { useBiblioteca } from '../biblioteca/useBiblioteca'
import { itemTitle } from '../biblioteca/bibliotecaMath'
import { shareText, readingPage } from '../biblioteca/tiposMath'
import { NO_REFINE } from '../biblioteca/buscaDaBiblioteca'
import { getLibraryRecentSearches, rememberLibraryRecentSearch, clearLibraryRecentSearches } from '../biblioteca/buscasRecentesStore'
import BibliotecaRaiz from '../components/biblioteca/BibliotecaRaiz'
import FolhaDoItem from '../components/biblioteca/FolhaDoItem'
import NotasScreen from './NotasScreen'
import MarcacoesScreen from './MarcacoesScreen'
import ReflexoesScreen from './ReflexoesScreen'
import PregacoesScreen from './PregacoesScreen'
import AplicacoesScreen from './AplicacoesScreen'
import PerguntasScreen from './PerguntasScreen'
import LeituraDoItemScreen from './LeituraDoItemScreen'
import FolhaNova from '../components/anotar/FolhaNova'
import { draftLine } from '../anotar/notaMath'
import BuscaDaBibliotecaScreen from './BuscaDaBibliotecaScreen'
import { useConfirmacao } from '../components/FolhaDeConfirmacao'
import { t } from '../i18n'

const TYPE_SCREENS = { nota: NotasScreen, marcacao: MarcacoesScreen, reflexao: ReflexoesScreen, pregacao: PregacoesScreen, aplicacao: AplicacoesScreen, pergunta: PerguntasScreen }

export default function BibliotecaScreen({
  session, api = bibliotecaApi, refreshKey = 0, initialView = null, initialSearch = null, initialNew = false, searchRequest = null,
  onPastRootChange, onNewNote, onNewVerseNote, onOpenVerseNote, onOpenStudies, onCreateStudy, onOpenSermonNote, onOpenBible,
  onEditApplication, onApplicationChanged,
}) {
  const { lang } = session
  const [perguntar, folha] = useConfirmacao(lang)
  const bib = useBiblioteca({ api, refreshKey })
  const [view, setView] = useState(initialView ?? { name: 'raiz' })
  const pastRoot = view.name !== 'raiz'
  useEffect(() => { onPastRootChange?.(pastRoot) }, [pastRoot]) // eslint-disable-line react-hooks/exhaustive-deps

  const itemsOfType = useMemo(() => (view.name === 'tipo' ? bib.items.filter(i => i.type === view.type) : []), [bib.items, view])

  function openType(type) {
    setView({ name: 'tipo', type })
  }

  // A busca (L4/L5). O que está digitado e os filtros ficam aqui, não na
  // tela: abrir um resultado e voltar devolve a busca como estava. Abrir a
  // busca de novo (pela raiz, pela lupa de um tipo) começa do zero, já
  // com aquele tipo em "Buscar em".
  const [search, setSearch] = useState(() => ({ query: '', type: 'all', ...NO_REFINE, ...initialSearch }))
  const [recents, setRecents] = useState(getLibraryRecentSearches)
  const searchScroll = useRef(0)
  // `browse`: os resultados sem termo — tudo o que está guardado, por
  // tipo, do mais recente para o mais antigo (o "Ver tudo" da raiz).
  function openSearch(type = 'all', { browse = false } = {}) {
    setSearch({ query: '', type, ...NO_REFINE, browse })
    setRecents(getLibraryRecentSearches())
    searchScroll.current = 0
    setView(prev => ({ name: 'busca', back: prev.name === 'busca' ? prev.back : prev }))
  }
  // A lupa da tela Estudos (fora da aba) pede a busca já em "Estudos".
  useEffect(() => { if (searchRequest) openSearch(searchRequest.type) }, [searchRequest]) // eslint-disable-line react-hooks/exhaustive-deps

  // O destino de cada tipo: a anotação longa, na tela da anotação guardada
  // (um rascunho, direto na página de escrever); a nota de
  // versículo, na tela da nota (N4); a marcação, na Bíblia, no versículo
  // (com a nota aberta, se houver); a nota de uma sessão de leitura, na
  // Bíblia, no capítulo; reflexão, frase do dia e pergunta, na página de
  // leitura; um estudo, na tela Estudos.
  function openItem(item) {
    if (item.type === 'pregacao') onOpenSermonNote(item.id, { draft: item.draft })
    else if (item.type === 'estudo') onOpenStudies()
    else if (item.type === 'marcacao') onOpenBible(item.book, item.chapter, item.verses[0], item.note ? { noteId: item.id } : undefined)
    else if (item.type === 'nota' && item.id) onOpenVerseNote(item.id)
    else if (item.type === 'nota') onOpenBible(item.book, item.chapter)
    else setView(prev => ({ name: 'leitura', item, back: prev }))
  }

  // "Editar" no menu leva ao lugar onde aquele tipo já se edita: a
  // anotação longa e a nota, onde abrem; a marcação, na Bíblia com a nota
  // aberta; a frase do dia, na lista de frases do Perfil. Reflexão antiga
  // e pergunta não têm onde editar.
  function editItem(item) {
    if (item.type === 'marcacao') onOpenBible(item.book, item.chapter, item.verses[0], { noteId: item.id })
    else if (item.type === 'aplicacao') onEditApplication()
    else openItem(item)
  }
  const canEdit = item => item.type !== 'reflexao' && item.type !== 'pergunta'

  // "Nova" abre a folha N1: anotação livre, pregação (os detalhes vêm
  // antes da página), nota em um versículo, estudo — ou o rascunho.
  const [novaOpen, setNovaOpen] = useState(initialNew)
  const onNova = () => setNovaOpen(true)
  function chooseNew(key) {
    setNovaOpen(false)
    if (key === 'free') onNewNote('free')
    else if (key === 'sermon') onNewNote('sermon', 'type')
    else if (key === 'verse') onNewVerseNote()
    else onCreateStudy()
  }

  // O menu de um item (segurar).
  const [menu, setMenu] = useState(null)
  async function shareItem(item) {
    setMenu(null)
    const verseText = item.type === 'marcacao' ? await api.verseText(item, lang).catch(() => '') : ''
    const text = shareText(item, { lang, verseText })
    try {
      if (navigator.share) await navigator.share({ text })
      else await navigator.clipboard?.writeText(text)
    } catch {
      // A pessoa fechou a folha de compartilhar — nada a fazer.
    }
  }
  async function deleteItem(item) {
    setMenu(null)
    if (!(await perguntar({ title: t('confirmations.deleteNoteTitle', undefined, lang), text: t('confirmations.cantUndo', undefined, lang), confirmLabel: t('confirmations.deleteBtn', undefined, lang) }))) return
    try {
      await api.remove(item)
      // A frase fixada no Hoje pode ter saído junto.
      if (item.type === 'aplicacao') onApplicationChanged?.()
      await bib.reload()
    } catch (err) {
      console.error('[biblioteca] apagar', err)
    }
  }

  const TypeScreen = view.name === 'tipo' ? TYPE_SCREENS[view.type] : null
  const openPassage = p => onOpenBible(p.book, p.chapter, p.verse ?? undefined)
  return (
    <>
      {view.name === 'busca' ? (
        <BuscaDaBibliotecaScreen
          lang={lang} api={api} items={bib.items} studyItems={bib.studyItems} readByDay={bib.readByDay} refreshKey={refreshKey}
          search={search} onSearchChange={setSearch} scrollMemory={searchScroll}
          recents={recents} onClearRecents={() => setRecents(clearLibraryRecentSearches())}
          onRemember={entry => setRecents(rememberLibraryRecentSearch(entry))}
          onBack={() => setView(view.back ?? { name: 'raiz' })} onOpenItem={openItem}
        />
      ) : view.name === 'leitura' ? (
        <LeituraDoItemScreen
          page={readingPage(view.item, { items: bib.items, readByDay: bib.readByDay, lang })}
          onBack={() => setView(view.back ?? { name: 'raiz' })} onOpenPassage={openPassage}
        />
      ) : TypeScreen ? (
        <TypeScreen
          lang={lang} api={api} status={bib.status} items={itemsOfType} allItems={bib.items} readByDay={bib.readByDay} initial={view}
          onBack={() => setView({ name: 'raiz' })} onOpenSearch={() => openSearch(view.type)}
          onOpenItem={openItem} onOpenPassage={openPassage} onMenu={setMenu} onNova={onNova}
        />
      ) : (
        <BibliotecaRaiz
          lang={lang} api={api} status={bib.status} items={bib.items} readByDay={bib.readByDay} studies={bib.studies}
          onOpenSearch={() => openSearch()} onNova={onNova} onOpenType={openType} onSeeAll={() => openSearch('all', { browse: true })}
          onOpenStudies={onOpenStudies} onCreateStudy={onCreateStudy} onOpenItem={openItem}
        />
      )}
      {novaOpen && (
        <FolhaNova
          draft={draftLine(bib.items)} onChoose={chooseNew} onClose={() => setNovaOpen(false)}
          onOpenDraft={id => { setNovaOpen(false); onOpenSermonNote(id, { draft: true }) }}
        />
      )}
      {menu && (
        <FolhaDoItem
          title={(menu.type === 'pregacao' && menu.title) || itemTitle(menu, { readByDay: bib.readByDay, lang })}
          onEdit={canEdit(menu) ? () => { setMenu(null); editItem(menu) } : null}
          onShare={() => shareItem(menu)} onDelete={() => deleteItem(menu)} onClose={() => setMenu(null)}
        />
      )}
      {folha}
    </>
  )
}
