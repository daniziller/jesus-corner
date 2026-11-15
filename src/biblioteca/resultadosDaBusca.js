// resultadosDaBusca.js — os resultados da busca da Biblioteca (L5,
// handoff-biblioteca-55 §6 e §6.2), parte pura: como o texto digitado é
// lido (palavras, expressão entre aspas, referência), como cada item é
// comparado, o realce de todas as ocorrências, as contagens por tipo e os
// grupos — na ordem das pastilhas, dois por grupo em "Tudo", todos (em
// páginas de 30) com um tipo ativo. Testes em
// scripts/test-biblioteca-busca.mjs.
//
// Regras da comparação: sem acento, sem caixa, sem pontuação (a mesma
// normalização da busca da Bíblia — o texto normalizado tem o mesmo
// comprimento do original, então a posição achada é a posição do trecho
// no texto de verdade). Várias palavras = todas precisam aparecer, em
// qualquer campo do item. Entre aspas = a expressão exata, num campo só.
// Uma palavra também acha as suas variações ("espera" acha "espero",
// "esperar", "esperamos") — pelo radical, sem biblioteca. Se o texto é
// uma referência ("gn 39", "jo 3 16"), entra também o que está ligado
// àquele livro, capítulo ou versículo.
import { normalizeForSearch } from '../bible/searchNormalize.js'
import { queryWords, highlightSegments, MIN_QUERY_LENGTH } from '../busca/palavra.js'
import { interpretReference } from '../busca/referencia.js'
import { formatInt, dayMonthShort } from '../gamification/format.js'
import { tr, trN } from '../i18n/tr.js'
import { byRecent, itemReference, reflectionTitle, reflectionFirstAnswer, whenLabel } from './bibliotecaMath.js'
import { sermonCard, sermonTypeLabel, applicationCard, reflectionBlocks, PAGE_SIZE } from './tiposMath.js'
import { SEARCH_TYPE_KEYS, searchTypeLabel, refineItems, isRefined, NO_REFINE } from './buscaDaBiblioteca.js'

const tx = (lang, key, vars) => tr(lang, `bibliotecaTx.${key}`, vars)
const txN = (lang, base, n, vars) => trN(lang, `bibliotecaTx.${base}`, n, { n: formatInt(n, lang), ...vars })

const oneLine = text => String(text ?? '').replace(/\s+/g, ' ').trim()

// ── O radical de uma palavra ────────────────────────────────────────────

const MIN_STEM = 4
// Terminações de verbo e de derivação, das mais longas para as mais
// curtas (já sem o "s" final, que sai antes).
const SUFFIXES = [
  'amento', 'imento', 'adora', 'aremo', 'eremo', 'iremo', 'assem', 'essem', 'issem', 'ariam', 'eriam', 'iriam',
  'ador', 'ando', 'endo', 'indo', 'aram', 'eram', 'iram', 'avam', 'aria', 'eria', 'iria', 'asse', 'esse', 'isse',
  'ado', 'ido', 'ada', 'ida', 'amo', 'emo', 'imo', 'ava', 'ar', 'er', 'ir', 'ou', 'ei', 'eu', 'iu', 'am', 'em',
]

// O radical de uma palavra já normalizada, para achar as variações dela:
// tira o plural ("orações" → "oração", "fiéis" → "fiel", "mulheres" →
// "mulher"), depois uma terminação de verbo ou de derivação, depois a
// vogal final — sempre deixando pelo menos quatro letras. Palavra curta
// fica como está ("Deus" não vira "deu").
export function stemWord(word) {
  let w = word
  if (w.length < MIN_STEM || /\d/.test(w)) return w
  if (w.length >= 5 && /(oes|aes)$/.test(w)) w = `${w.slice(0, -3)}ao`
  else if (w.length >= 5 && /[aeo]is$/.test(w)) w = `${w.slice(0, -2)}l`
  else if (w.length >= 5 && w.endsWith('ns')) w = `${w.slice(0, -2)}m`
  else if (w.length >= 5 && /[rzs]es$/.test(w)) w = w.slice(0, -2)
  else if (w.endsWith('s') && !/(us|ss)$/.test(w) && w.length - 1 >= 3) w = w.slice(0, -1)
  const suffix = SUFFIXES.find(sfx => w.endsWith(sfx) && w.length - sfx.length >= MIN_STEM)
  if (suffix) w = w.slice(0, -suffix.length)
  if (/[aeo]$/.test(w) && w.length - 1 >= MIN_STEM) w = w.slice(0, -1)
  return w
}

// ── O que foi digitado ──────────────────────────────────────────────────

// O texto digitado em partes: as expressões entre aspas (cada uma é uma
// sequência exata de palavras), as palavras soltas (cada uma com o seu
// radical) e, se o texto todo é uma referência, a referência. Nulo quando
// ainda não há o que procurar (menos de 2 caracteres).
export function parseLibraryQuery(text, { lang = 'pt' } = {}) {
  const raw = String(text ?? '')
  const phrases = []
  const rest = raw.replace(/["“”]([^"“”]+)["“”]/g, (_, inside) => {
    const words = queryWords(inside)
    if (words.length) phrases.push(words)
    return ' '
  })
  const words = queryWords(rest.replace(/["“”]/g, ' ')).map(word => ({ word, stem: stemWord(word) }))
  const term = oneLine(raw)
  const size = [...phrases.flat(), ...words.map(w => w.word)].join(' ').length
  if (size < MIN_QUERY_LENGTH) return null
  // A referência só vale para o texto sem aspas.
  const interpreted = phrases.length === 0 ? interpretReference(raw, { lang }) : null
  // Das leituras possíveis ("jo" também pode ser Jó ou Joel), vale a
  // primeira — a mesma que a busca da Bíblia põe no cartão.
  const reference = interpreted?.type === 'ref' ? [interpreted.readings[0]]
    : interpreted?.type === 'book' ? [{ book: interpreted.books[0], chapter: null, verse: null, verseEnd: null, chapterEnd: null }]
    : null
  return { term, phrases, words, reference }
}

// ── A comparação ────────────────────────────────────────────────────────

const WORD = /[a-z0-9]+/g

// Onde cada palavra solta e cada expressão aparecem num texto. Devolve os
// trechos a realçar ([início, comprimento], em ordem, sem sobreposição) e
// quais palavras e expressões o texto contém. Uma palavra solta bate com
// a palavra do texto que começa por ela (dá resultado enquanto se digita)
// ou que tem o mesmo radical.
export function matchText(text, query) {
  const norm = normalizeForSearch(String(text ?? ''))
  const ranges = []
  const words = new Set()
  const phrases = new Set()
  if (query.words.length) {
    for (const m of norm.matchAll(WORD)) {
      const token = m[0]
      let stem = null
      query.words.forEach((q, i) => {
        if (token.startsWith(q.word) || (q.word.length >= MIN_STEM && (stem ??= stemWord(token)) === q.stem)) {
          words.add(i)
          ranges.push([m.index, token.length])
        }
      })
    }
  }
  query.phrases.forEach((phrase, i) => {
    const source = `(?<![a-z0-9])${phrase.join('[^a-z0-9]+')}(?![a-z0-9])`
    for (const m of norm.matchAll(new RegExp(source, 'g'))) {
      phrases.add(i)
      ranges.push([m.index, m[0].length])
    }
  })
  return { ranges: mergeRanges(ranges), words, phrases }
}

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || b[1] - a[1])
  const out = []
  for (const [start, length] of sorted) {
    const last = out[out.length - 1]
    if (last && start <= last[0] + last[1]) last[1] = Math.max(last[1], start + length - last[0])
    else out.push([start, length])
  }
  return out
}

// As referências bíblicas de um item, cada uma { book, chStart, chEnd,
// vStart, vEnd } (versículos nulos = o capítulo inteiro; capítulo nulo = o
// livro inteiro).
export function itemRefs(item) {
  if (item.type === 'pregacao') return (item.passages ?? []).map(p => ({ book: p.book, chStart: p.chapter, chEnd: p.chapter, vStart: p.verseStart ?? null, vEnd: p.verseEnd ?? p.verseStart ?? null }))
  if (item.type === 'estudo') return (item.books ?? []).map(book => ({ book, chStart: null, chEnd: null, vStart: null, vEnd: null }))
  if (item.read?.length) return item.read.map(r => ({ book: r.book, chStart: r.chapter, chEnd: r.chapter, vStart: null, vEnd: null }))
  if (!item.book) return []
  if (item.verses?.length) return [{ book: item.book, chStart: item.chapter, chEnd: item.chapter, vStart: item.verses[0], vEnd: item.verses[item.verses.length - 1] }]
  if (item.verseStart) return [{ book: item.book, chStart: item.chapter, chEnd: item.chapter, vStart: item.verseStart, vEnd: item.verseEnd ?? item.verseStart }]
  return [{ book: item.book, chStart: item.chapter ?? null, chEnd: item.chapterEnd ?? item.chapter ?? null, vStart: null, vEnd: null }]
}

// O item está ligado àquela referência? Só o livro: tudo o que é do
// livro. Capítulo (ou capítulos): o que toca aquele capítulo. Versículo
// (ou intervalo): só o que tem versículo e cruza com ele.
export function matchesReference(item, readings) {
  const refs = itemRefs(item)
  return (readings ?? []).some(r => refs.some(ref => {
    if (ref.book !== r.book) return false
    if (r.chapter == null) return true
    if (ref.chStart == null) return false
    const lastChapter = r.chapterEnd ?? r.chapter
    if (ref.chEnd < r.chapter || ref.chStart > lastChapter) return false
    if (r.verse == null) return true
    if (ref.vStart == null) return false
    return ref.vEnd >= r.verse && ref.vStart <= (r.verseEnd ?? r.verse)
  }))
}

// O que a pessoa escreveu numa reflexão: as respostas, sem as perguntas
// (que foram geradas, não são palavras dela).
export function ownReflectionText(item) {
  return item.kind === 'dia' ? reflectionBlocks(item.text).map(block => block.answer).join('\n\n') : item.text
}

// Os campos de um item em que a busca procura. `show`: o campo pode ser
// mostrado no resultado, com o realce (o texto, o trecho, a nota). Os
// outros (título, pregador, etiquetas, referências) só fazem achar.
export function searchFields(item, { verseTexts = {}, readByDay = {}, lang = 'pt' } = {}) {
  const tags = (item.tags ?? []).map(tag => ({ key: 'tag', text: tag }))
  const ref = item.book ? [{ key: 'ref', text: itemReference(item, lang) }] : []
  if (item.type === 'nota') return [{ key: 'text', text: item.text, show: true }, ...ref, ...tags]
  if (item.type === 'marcacao') return [{ key: 'verse', text: verseTexts[item.key] ?? '', show: true }, { key: 'note', text: item.note, show: true }, ...ref, ...tags]
  if (item.type === 'reflexao') return [{ key: 'text', text: ownReflectionText(item), show: true }, { key: 'title', text: reflectionTitle(item, readByDay, lang) }]
  if (item.type === 'pregacao') {
    return [
      { key: 'text', text: item.text, show: true }, { key: 'title', text: item.title }, { key: 'preacher', text: item.preacher }, { key: 'church', text: item.church },
      { key: 'type', text: sermonTypeLabel(item.noteType) },
      ...(item.passages ?? []).map(p => ({ key: 'ref', text: itemReference({ book: p.book, chapter: p.chapter, verseStart: p.verseStart, verseEnd: p.verseEnd }, lang) })),
      ...tags,
    ]
  }
  if (item.type === 'aplicacao') return [{ key: 'text', text: item.text, show: true }]
  if (item.type === 'pergunta') return [{ key: 'answer', text: item.answer, show: true }, { key: 'text', text: item.text }, ...ref]
  if (item.type === 'estudo') return [{ key: 'title', text: item.title }, { key: 'title', text: item.titleEn }]
  return []
}

// Um item contra a busca. Nulo se não bate; senão, os trechos a realçar
// em cada campo que pode ser mostrado ({ [campo]: ranges }).
export function matchItem(item, query, ctx = {}) {
  const fields = searchFields(item, ctx).filter(f => f.text)
  const words = new Set()
  const phrases = new Set()
  const shown = {}
  for (const field of fields) {
    const m = matchText(field.text, query)
    m.words.forEach(i => words.add(i))
    m.phrases.forEach(i => phrases.add(i))
    if (field.show && m.ranges.length) shown[field.key] = m.ranges
  }
  const byText = words.size === query.words.length && phrases.size === query.phrases.length
  if (byText) return { ranges: shown }
  return query.reference && matchesReference(item, query.reference) ? { ranges: {} } : null
}

// ── O trecho de um resultado ────────────────────────────────────────────

export const EXCERPT_LENGTH = 150
// O recorte começa numa pausa da frase, entre 12 e 48 caracteres antes da
// palavra; sem pausa por ali, numa palavra, uns 32 caracteres antes.
const LEAD_MAX = 48
const LEAD_MIN = 12
const LEAD = 32

// Um texto numa linha só, com os trechos a realçar — recortado em volta
// da primeira ocorrência quando ela está longe do começo ("…Ele age no
// tempo dele; a espera é parte da resposta."). Devolve os pedaços
// { text, highlighted }.
export function excerptSegments(text, query) {
  const flat = oneLine(text)
  const first = query ? matchText(flat, query).ranges[0] : null
  let cut = flat
  if (first && first[0] > LEAD_MAX) {
    const window = flat.slice(first[0] - LEAD_MAX, first[0] - LEAD_MIN)
    const pause = Math.max(...['. ', ', ', '; ', ': ', '! ', '? ', '— '].map(mark => { const i = window.lastIndexOf(mark); return i === -1 ? -1 : i + mark.length }))
    const from = pause > 0 ? first[0] - LEAD_MAX + pause : flat.lastIndexOf(' ', first[0] - LEAD) + 1
    cut = `…${flat.slice(from)}`
  }
  if (cut.length > EXCERPT_LENGTH) cut = `${cut.slice(0, cut.lastIndexOf(' ', EXCERPT_LENGTH))}…`
  return highlightSegments(cut, query ? matchText(cut, query).ranges : [])
}

// Um texto inteiro com o realce (o trecho de uma marcação, a frase do
// dia), sem recorte.
export function fullSegments(text, query) {
  const flat = oneLine(text)
  return highlightSegments(flat, query ? matchText(flat, query).ranges : [])
}

const plain = text => [{ text, highlighted: false }]

function shortDate(iso, now, lang) {
  if (!iso) return ''
  const d = new Date(iso)
  const short = dayMonthShort(d, lang)
  return d.getFullYear() === now.getFullYear() ? short : `${short} ${d.getFullYear()}`
}

// ── As linhas de cada tipo ──────────────────────────────────────────────

// O que cada resultado mostra, no visual do seu tipo. Reflexões, Notas,
// Pregações e Perguntas: título, quando e o trecho onde a palavra aparece
// (nas pregações, começa com o pregador). Marcações: o trecho bíblico, a
// referência e "Com nota: …". Aplicações: a frase e "Frase do dia · …".
// Estudos: o nome e "dia {x} de {y}".
export function resultRow(item, query, { verseTexts = {}, readByDay = {}, now = new Date(), lang = 'pt' } = {}) {
  const base = { key: item.key, type: item.type, item }
  if (item.type === 'marcacao') {
    const verse = verseTexts[item.key] ?? ''
    return {
      ...base,
      quote: verse ? [...plain('"'), ...fullSegments(verse, query), ...plain('"')] : null,
      reference: itemReference(item, lang),
      note: item.note ? [...plain(`${tx(lang, 'withNote')}"`), ...fullSegments(item.note, query), ...plain('"')] : null,
    }
  }
  if (item.type === 'aplicacao') {
    return { ...base, quote: [...plain('"'), ...fullSegments(item.text, query), ...plain('"')], meta: applicationCard(item, { now, lang }).meta }
  }
  if (item.type === 'estudo') {
    return { ...base, title: (lang === 'en' && item.titleEn) || item.title, sub: item.total > 0 ? (item.finished ? tx(lang, 'studyFinished', { days: txN(lang, 'days', item.total) }) : tx(lang, 'studyDayOf', { day: item.day, total: item.total })) : '' }
  }
  const when = whenLabel(item.at, now, { lang })
  if (item.type === 'pregacao') {
    const body = excerptSegments(item.text, query)
    const who = item.preacher ? [...fullSegments(item.preacher, query), ...plain(' · ')] : []
    const quoted = body.some(seg => seg.text) ? [...plain('"'), ...body, ...plain('"')] : []
    // A pregação mostra a data ("8 nov"), não "há 2 dias".
    return { ...base, title: sermonCard(item, { now, lang }).title, when: shortDate(item.at, now, lang), excerpt: [...who, ...quoted] }
  }
  if (item.type === 'pergunta') return { ...base, title: item.text, when, excerpt: excerptSegments(item.answer, query) }
  if (item.type === 'reflexao') {
    // Sem palavra no texto (achada pelo título ou pela referência), o
    // começo da primeira resposta.
    const own = ownReflectionText(item)
    const hit = query && matchText(own, query).ranges.length > 0
    return { ...base, title: reflectionTitle(item, readByDay, lang), when, excerpt: hit ? excerptSegments(own, query) : excerptSegments(item.kind === 'dia' ? reflectionFirstAnswer(item.text) : item.text, null) }
  }
  return { ...base, title: itemReference(item, lang), when, excerpt: excerptSegments(item.text, query) }
}

// ── A busca ─────────────────────────────────────────────────────────────

export const GROUP_PREVIEW = 2

// "Ver as 7 reflexões" · "Ver os 5 trechos"
const TYPE_ORDER = SEARCH_TYPE_KEYS.filter(key => key !== 'all')

// A tela está em resultados (L5) quando há o que procurar: um texto de 2
// caracteres ou mais, um refinamento aplicado (livro, período, pregador)
// ou o pedido de ver tudo (`browse`, o "Ver tudo" da raiz). Senão, é a
// busca ao abrir (L4).
export function isSearching(search) {
  return !!parseLibraryQuery(search?.query) || isRefined(search) || !!search?.browse
}

// A busca inteira. `items`: os itens da Biblioteca e os estudos. Devolve
// o termo, as pastilhas com contagem ("Tudo {total}" e só os tipos com
// resultado, do que tem mais para o que tem menos — já contando os
// refinamentos), o tipo que vale, os grupos na ordem das pastilhas e, sem
// resultado, a mensagem. Em "Tudo", cada grupo traz os dois mais recentes
// e a linha "Ver as {n} …"; com um tipo ativo, todos os resultados dele
// (`pages` páginas de 30).
export function searchLibrary({ items = [], search = {}, verseTexts = {}, readByDay = {}, now = new Date(), lang = 'pt', pages = 1 } = {}) {
  const { type = 'all', book = null, period = NO_REFINE.period, preacher = null } = search
  const query = parseLibraryQuery(search.query, { lang })
  const ctx = { verseTexts, readByDay, now, lang }
  const pool = refineItems(items, { type: 'all', book, period, preacher }, now)
  const found = query ? pool.filter(item => matchItem(item, query, ctx)) : pool

  const counts = Object.fromEntries(TYPE_ORDER.map(key => [key, 0]))
  for (const item of found) if (item.type in counts) counts[item.type]++
  const total = TYPE_ORDER.reduce((sum, key) => sum + counts[key], 0)
  const order = TYPE_ORDER.filter(key => counts[key] > 0).sort((a, b) => counts[b] - counts[a] || TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b))
  const active = type !== 'all' && counts[type] > 0 ? type : 'all'
  const pills = [{ key: 'all', label: searchTypeLabel('all', lang), count: formatInt(total, lang) }, ...order.map(key => ({ key, label: searchTypeLabel(key, lang), count: formatInt(counts[key], lang) }))]

  const groups = (active === 'all' ? order : [active]).map(key => {
    const list = byRecent(found.filter(item => item.type === key))
    const visible = active === 'all' ? list.slice(0, GROUP_PREVIEW) : list.slice(0, pages * PAGE_SIZE)
    return {
      type: key, label: searchTypeLabel(key, lang), count: formatInt(list.length, lang),
      rows: visible.map(item => resultRow(item, query, ctx)),
      more: active === 'all' && list.length > GROUP_PREVIEW ? tx(lang, `more_${key}`, { n: formatInt(list.length, lang) }) : null,
      hasMore: active !== 'all' && visible.length < list.length,
    }
  })

  const refined = isRefined({ book, period, preacher }) || type !== 'all'
  const empty = total > 0 ? null : {
    message: query ? tx(lang, 'emptyQuery', { term: query.term }) : tx(lang, 'emptyFilters'),
    canClear: refined,
  }
  return { term: query?.term ?? '', query, counts: { all: total, ...counts }, pills, active, groups, empty }
}

// "Buscar sem os filtros": o mesmo texto, em tudo, sem refinar.
export function withoutFilters(search) {
  return { ...search, type: 'all', ...NO_REFINE }
}

// As contagens de uma busca, para a linha das buscas recentes — só os
// tipos com resultado.
export function foundCounts(result) {
  return Object.fromEntries(TYPE_ORDER.filter(key => result.counts[key] > 0).map(key => [key, result.counts[key]]))
}
