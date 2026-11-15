// As regras que escrevem frases (hojeMath, meuPlanoMath, seuPlanoMath,
// ajustarMath, a Bíblia, a busca e a Biblioteca) usam chaves de
// translations.js por tx(lang, 'chave'): toda chave usada precisa existir
// em português e em inglês, e o inglês não pode cair no português.
import { readFileSync } from 'node:fs'
import { STRINGS } from '../src/i18n/translations.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${label}${ok ? '' : ` — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`}`)
}

const FILES = { 'src/hoje/hojeMath.js': 'hojeTx', 'src/meuPlano/meuPlanoMath.js': 'planoTx', 'src/meuPlano/seuPlanoMath.js': 'planoTx', 'src/meuPlano/ajustarMath.js': 'planoTx', 'src/biblia/bibliaMath.js': 'bibliaTx', 'src/busca/buscaMath.js': 'buscaTx', 'src/busca/palavra.js': 'buscaTx', 'src/biblioteca/bibliotecaMath.js': 'bibliotecaTx', 'src/biblioteca/tiposMath.js': 'bibliotecaTx', 'src/biblioteca/buscaDaBiblioteca.js': 'bibliotecaTx', 'src/biblioteca/resultadosDaBusca.js': 'bibliotecaTx', 'src/anotar/notaMath.js': 'notasTx', 'src/anotar/anotarMath.js': 'notasTx', 'src/anotar/guardadaMath.js': 'notasTx', 'src/passos/passosMath.js': 'passosTx', 'src/passos/reflexaoMath.js': 'passosTx', 'src/passos/diaConcluidoMath.js': 'passosTx', 'src/pedidos/pedidosMath.js': 'pedidosTx' }
for (const [file, ns] of Object.entries(FILES)) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  const used = new Set()
  for (const m of src.matchAll(/\btx\(lang, '([A-Za-z0-9_]+)'/g)) used.add(m[1])
  for (const m of src.matchAll(/\btxN\(lang, '([A-Za-z0-9_]+)'/g)) { used.add(`${m[1]}One`); used.add(`${m[1]}Many`) }
  for (const m of src.matchAll(/labelKey: '([A-Za-z0-9_]+)'/g)) used.add(m[1])
  const missing = lang => [...used].filter(k => STRINGS[lang][ns]?.[k] == null)
  check(`${file}: chaves usadas existem em pt`, missing('pt'), [])
  check(`${file}: chaves usadas existem em en`, missing('en'), [])
  const pt = Object.keys(STRINGS.pt[ns]).sort(), en = Object.keys(STRINGS.en[ns]).sort()
  check(`${ns}: as mesmas chaves nos dois idiomas`, pt, en)
}

// As telas da Biblioteca usam as mesmas chaves por bibliotecaText(lang,
// 'chave'), L('chave') ou t('bibliotecaTx.chave').
{
  const { readdirSync } = await import('node:fs')
  const screens = ['BibliotecaScreen', 'NotasScreen', 'MarcacoesScreen', 'PregacoesScreen', 'PerguntasScreen', 'ReflexoesScreen', 'AplicacoesScreen', 'LeituraDoItemScreen', 'BuscaDaBibliotecaScreen'].map(n => `src/screens/${n}.jsx`)
  const parts = readdirSync(new URL('../src/components/biblioteca/', import.meta.url)).filter(f => f.endsWith('.jsx')).map(f => `src/components/biblioteca/${f}`)
  const used = new Set()
  for (const file of [...screens, ...parts]) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    for (const m of src.matchAll(/(?:bibliotecaText\(lang, |\bL\(|\bt{1,2}\('bibliotecaTx\.)'?([A-Za-z0-9_]+)'/g)) used.add(m[1])
  }
  check('telas da Biblioteca: chaves usadas existem em pt', [...used].filter(k => STRINGS.pt.bibliotecaTx[k] == null), [])
  check('telas da Biblioteca: chaves usadas existem em en', [...used].filter(k => STRINGS.en.bibliotecaTx[k] == null), [])
  check('telas da Biblioteca: alguma chave foi achada', used.size > 20, true)
}

// As telas do editor de notas usam N('chave') ou t('notasTx.chave').
{
  const { readdirSync } = await import('node:fs')
  const files = ['AnotarScreen', 'NotaDeVersiculoScreen', 'AnotacaoGuardadaScreen'].map(n => `src/screens/${n}.jsx`)
    .concat(readdirSync(new URL('../src/components/anotar/', import.meta.url)).filter(f => f.endsWith('.jsx')).map(f => `src/components/anotar/${f}`))
  const used = new Set()
  for (const file of files) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    for (const m of src.matchAll(/(?:\bN\(|\bt\('notasTx\.)'?([A-Za-z0-9_]+)'/g)) used.add(m[1])
  }
  check('editor de notas: chaves usadas existem em pt', [...used].filter(k => STRINGS.pt.notasTx[k] == null), [])
  check('editor de notas: chaves usadas existem em en', [...used].filter(k => STRINGS.en.notasTx[k] == null), [])
  check('editor de notas: alguma chave foi achada', used.size > 40, true)
}

// As telas dos passos usam P('chave') ou t('passosTx.chave').
{
  const { readdirSync } = await import('node:fs')
  const files = ['PrayerScreen', 'ReflectionScreen', 'DayCompleteScreen'].map(n => `src/screens/${n}.jsx`)
    .concat(readdirSync(new URL('../src/components/passos/', import.meta.url)).filter(f => f.endsWith('.jsx')).map(f => `src/components/passos/${f}`))
  const used = new Set()
  for (const file of files) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    for (const m of src.matchAll(/(?:\bP\(|\bt\('passosTx\.)'?([A-Za-z0-9_]+)'/g)) used.add(m[1])
  }
  check('passos: chaves usadas existem em pt', [...used].filter(k => STRINGS.pt.passosTx[k] == null), [])
  check('passos: chaves usadas existem em en', [...used].filter(k => STRINGS.en.passosTx[k] == null), [])
  check('passos: alguma chave foi achada', used.size > 15, true)
}

// As telas dos pedidos usam Q('chave') ou t('pedidosTx.chave').
{
  const { readdirSync } = await import('node:fs')
  const files = ['src/screens/PrayerRequestsScreen.jsx', 'src/components/passos/PedidosDaSuplica.jsx']
    .concat(readdirSync(new URL('../src/components/pedidos/', import.meta.url)).filter(f => f.endsWith('.jsx')).map(f => `src/components/pedidos/${f}`))
  const used = new Set()
  for (const file of files) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    for (const m of src.matchAll(/(?:\bQ\(|\bt\('pedidosTx\.)'?([A-Za-z0-9_]+)'/g)) used.add(m[1])
  }
  check('pedidos: chaves usadas existem em pt', [...used].filter(k => STRINGS.pt.pedidosTx[k] == null), [])
  check('pedidos: chaves usadas existem em en', [...used].filter(k => STRINGS.en.pedidosTx[k] == null), [])
  check('pedidos: alguma chave foi achada', used.size > 20, true)
}

// As conquistas: as telas usam C('chave') ou t('conquistasTx.chave'); as
// frases de celebration.js, tx(lang, 'chave'). Os nomes de família e de
// degrau só existem em inglês (em português, vêm de data/achievements.js).
{
  const files = ['src/screens/ConquistasScreen.jsx', 'src/screens/FamiliaScreen.jsx', 'src/screens/NovaConquistaScreen.jsx', 'src/screens/EstanteScreen.jsx', 'src/screens/LivroCompletoScreen.jsx', 'src/screens/SeloScreen.jsx', 'src/screens/SuaBibliaScreen.jsx', 'src/components/gamificacao/Medalha.jsx', 'src/components/gamificacao/RodaDaBiblia.jsx', 'src/gamification/celebrationText.js', 'src/gamification/sealDetails.js']
  const used = new Set()
  for (const file of files) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    for (const m of src.matchAll(/(?:\bC\(|\btx\(lang, |\bt\('conquistasTx\.)'?([A-Za-z0-9_]+)'/g)) used.add(m[1])
  }
  check('conquistas: chaves usadas existem em pt', [...used].filter(k => STRINGS.pt.conquistasTx[k] == null), [])
  check('conquistas: chaves usadas existem em en', [...used].filter(k => STRINGS.en.conquistasTx[k] == null), [])
  const onlyEn = Object.keys(STRINGS.en.conquistasTx).filter(k => !(k in STRINGS.pt.conquistasTx))
  check('conquistas: o que só existe em inglês são os nomes dos dados', onlyEn.filter(k => !/^(fam|deg|unitOne|unitMany|mede)_/.test(k)), [])
}

if (failures) { console.log(`\n${failures} falha(s).`); process.exit(1) }
console.log('\nAs frases das regras existem nos dois idiomas.')
