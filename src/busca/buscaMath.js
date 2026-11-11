// buscaMath.js — a parte pura da busca da aba Bíblia (handoff-biblia-52
// §6): os textos fixos, "onde você estava", as buscas recentes e as
// passagens com nome. O interpretador de referências mora ao lado, em
// referencia.js. A tela (components/biblia/Busca*.jsx) só mostra.
import { bookDisplayName } from './referencia.js'
import { dateKey } from '../utils/dateKey.js'
import { relativeDayPeriod } from '../bible/relativeDayPeriod.js'
import { dayMonthLong, formatInt } from '../gamification/format.js'
import { bookInfo, blockById } from '../data/gamificationBlocks.js'

// O texto de apoio do campo — o mesmo da raiz (B1).
export const SEARCH_HINT = 'Livro, referência, palavra ou tema'

// Os filtros de tipo (B5/B6), na ordem das pastilhas.
export const TYPE_FILTERS = [
  { id: 'all', label: 'Tudo' },
  { id: 'books', label: 'Livros' },
  { id: 'verses', label: 'Versículos' },
  { id: 'passages', label: 'Passagens' },
  { id: 'themes', label: 'Temas' },
  { id: 'notes', label: 'Minhas notas' },
]

// Cartão areia "Ir direto a um texto" (B5): os quatro exemplos.
export const REFERENCE_EXAMPLES = ['jo 3 16', 'Salmo 23', '1co 13', 'rm 8:28-39']

// ── Onde você estava ────────────────────────────────────────────────────

const PERIOD = { morning: 'de manhã', afternoon: 'à tarde', evening: 'à noite' }

// "hoje de manhã" · "ontem à noite" · "sábado à noite" · "em 14 de
// setembro" (de uma semana pra trás, o dia da semana já não diz qual).
export function whenPhrase(iso, now = new Date()) {
  const days = Math.round((new Date(dateKey(now)) - new Date(dateKey(new Date(iso)))) / 86400000)
  if (days >= 7) return `em ${dayMonthLong(iso)}`
  const { day, period } = relativeDayPeriod(iso, 'pt', now)
  return `${day === 'today' ? 'hoje' : day === 'yesterday' ? 'ontem' : day} ${PERIOD[period]}`
}

// Até duas linhas: a sessão de hoje e a última leitura livre. Some o que
// não existir; lista vazia = o grupo não aparece. `free`: { book (nome já
// no idioma da conta), chapter, verse, readAt }.
export function whereYouWere({ sessionTitle, free, now = new Date() }) {
  const rows = []
  if (sessionTitle) rows.push({ key: 'session', title: sessionTitle, sub: 'Sessão de hoje · conta no plano' })
  if (free?.book && free?.chapter) {
    rows.push({
      key: 'free',
      title: `${free.book} ${free.chapter}${free.verse > 1 ? `, versículo ${free.verse}` : ''}`,
      sub: free.readAt ? `Leitura livre · ${whenPhrase(free.readAt, now)}` : 'Leitura livre',
    })
  }
  return rows
}

// ── Buscas recentes ─────────────────────────────────────────────────────

const MAX_RECENT_SEARCHES = 5

const sameText = text => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Põe uma busca no topo: { text (o que volta pro campo), sub (o que era:
// "14 versículos", "Capítulo", "Tema · 21 trechos") }. A mesma busca de
// novo (sem contar acento e caixa) sobe em vez de repetir. No máximo cinco.
export function addRecentSearch(list, item, max = MAX_RECENT_SEARCHES) {
  const text = String(item?.text ?? '').trim()
  if (!text) return list ?? []
  const rest = (list ?? []).filter(r => sameText(r.text) !== sameText(text))
  return [{ text, sub: item.sub ?? '' }, ...rest].slice(0, max)
}

// ── Passagens com nome ──────────────────────────────────────────────────

// "Salmos 23" · "Mateus 5–7" · "Lucas 15:11-32" · "Gênesis 1:1–2:3".
export function passageReference(p, lang = 'pt') {
  const name = bookDisplayName(p.livro, lang)
  const sameChapter = p.capInicio === p.capFim
  if (p.versInicio == null) return sameChapter ? `${name} ${p.capInicio}` : `${name} ${p.capInicio}–${p.capFim}`
  if (sameChapter) return `${name} ${p.capInicio}:${p.versInicio}${p.versFim != null && p.versFim !== p.versInicio ? `-${p.versFim}` : ''}`
  return `${name} ${p.capInicio}:${p.versInicio}–${p.capFim}:${p.versFim}`
}

// Onde a passagem começa — é onde a leitura abre.
export function passageStart(p) {
  return { book: p.livro, chapter: p.capInicio, verse: p.versInicio ?? null }
}

// "Passagens mais procuradas" (B5): as marcadas como destaque, até quatro.
export function featuredPassages(list, max = 4) {
  return (list ?? []).filter(p => p.destaque).slice(0, max)
}

// ── Livros ──────────────────────────────────────────────────────────────

// A linha de um livro no grupo LIVROS: o nome e "{Bloco} · {n} capítulos ·
// {lidos} lidos". `progress` é o de computeBibleProgress.
export function bookRow(nome, progress, lang = 'pt') {
  const info = bookInfo(nome)
  const lidos = progress.porLivro[nome].lidos
  return {
    book: nome,
    title: bookDisplayName(nome, lang),
    sub: `${blockById(info.blocoId).nome} · ${formatInt(info.capitulos)} ${info.capitulos === 1 ? 'capítulo' : 'capítulos'} · ${formatInt(lidos)} ${lidos === 1 ? 'lido' : 'lidos'}`,
  }
}

