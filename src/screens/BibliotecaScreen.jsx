// BibliotecaScreen.jsx — a aba Biblioteca (handoff-biblioteca-55): a raiz
// por tipo (L1) e, por dentro dela, a tela de cada tipo (L2, L3…). A aba
// lê os dados UMA vez (useBiblioteca) e entrega às telas — a raiz e as
// telas de tipo contam com as mesmas funções, sobre os mesmos itens.
//
// A aba só lista, busca e abre. O que um toque abre é de quem chama
// (App.jsx): a anotação longa, a Bíblia no versículo. O menu de um item
// (segurar) tem Editar e Compartilhar, que só levam a outro lugar, e
// Apagar, que usa a gravação de sempre de cada tipo (bibliotecaApi.js).
//
// Fora da raiz a barra de abas some: `onPastRootChange` avisa.
import { useState, useEffect, useMemo } from 'react'
import { bibliotecaApi } from '../biblioteca/bibliotecaApi'
import { useBiblioteca } from '../biblioteca/useBiblioteca'
import { itemTitle } from '../biblioteca/bibliotecaMath'
import { shareText } from '../biblioteca/tiposMath'
import BibliotecaRaiz from '../components/biblioteca/BibliotecaRaiz'
import FolhaDoItem from '../components/biblioteca/FolhaDoItem'
import PregacoesScreen from './PregacoesScreen'
import MarcacoesScreen from './MarcacoesScreen'

// As telas de tipo que já existem no desenho novo.
const TYPE_SCREENS = { pregacao: PregacoesScreen, marcacao: MarcacoesScreen }

export default function BibliotecaScreen({
  session, api = bibliotecaApi, refreshKey = 0, initialView = null,
  onPastRootChange, onNova, onOpenStudies, onCreateStudy, onOpenSermonNote, onOpenBible, onOpenList,
}) {
  const { lang } = session
  const bib = useBiblioteca({ api, refreshKey })
  const [view, setView] = useState(initialView ?? { name: 'raiz' })
  const pastRoot = view.name !== 'raiz'
  useEffect(() => { onPastRootChange?.(pastRoot) }, [pastRoot]) // eslint-disable-line react-hooks/exhaustive-deps

  const itemsOfType = useMemo(() => (view.name === 'tipo' ? bib.items.filter(i => i.type === view.type) : []), [bib.items, view])

  function openType(type) {
    if (TYPE_SCREENS[type]) setView({ name: 'tipo', type })
    else onOpenList()
  }

  // O destino de cada tipo: a anotação longa, na página dela; nota,
  // marcação e pergunta, na Bíblia, no versículo (com a nota aberta, se
  // houver); reflexão e frase do dia, na lista.
  function openItem(item, { edit = false } = {}) {
    if (item.type === 'pregacao') onOpenSermonNote(item.id)
    else if (item.type === 'marcacao' || (item.type === 'nota' && item.id)) onOpenBible(item.book, item.chapter, item.verses[0], item.note || item.type === 'nota' || edit ? { noteId: item.id } : undefined)
    else if (item.type === 'pergunta') onOpenBible(item.book, item.chapter, item.verseStart ?? undefined)
    else if (item.type === 'nota') onOpenBible(item.book, item.chapter)
    else onOpenList()
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
    if (!window.confirm('Deletar essa anotação? Não dá pra desfazer.')) return
    try {
      await api.remove(item)
      await bib.reload()
    } catch (err) {
      console.error('[biblioteca] apagar', err)
    }
  }

  const TypeScreen = view.name === 'tipo' ? TYPE_SCREENS[view.type] : null
  return (
    <>
      {TypeScreen ? (
        <TypeScreen
          lang={lang} api={api} status={bib.status} items={itemsOfType} initial={view}
          onBack={() => setView({ name: 'raiz' })} onOpenSearch={onOpenList}
          onOpenItem={openItem} onOpenPassage={p => onOpenBible(p.book, p.chapter, p.verse ?? undefined)} onMenu={setMenu} onNova={onNova}
        />
      ) : (
        <BibliotecaRaiz
          lang={lang} api={api} status={bib.status} items={bib.items} readByDay={bib.readByDay} studies={bib.studies}
          onOpenSearch={onOpenList} onNova={onNova} onOpenType={openType} onSeeAll={onOpenList}
          onOpenStudies={onOpenStudies} onCreateStudy={onCreateStudy} onOpenItem={openItem}
        />
      )}
      {menu && (
        <FolhaDoItem
          title={(menu.type === 'pregacao' && menu.title) || itemTitle(menu, { readByDay: bib.readByDay, lang })}
          onEdit={() => { setMenu(null); openItem(menu, { edit: true }) }}
          onShare={() => shareItem(menu)} onDelete={() => deleteItem(menu)} onClose={() => setMenu(null)}
        />
      )}
    </>
  )
}
