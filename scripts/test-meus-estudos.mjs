// As ações de "Meus estudos" na tela Estudos: o que aparece em Salvos, o
// que "tirar" quer dizer para cada tipo, os publicados e os convites.
// node scripts/test-meus-estudos.mjs
import { readFileSync } from 'node:fs'
import { savedStudyEntries, removalOf, progressLine, publishedLine, inviteRow, matchesStudyQuery } from '../src/studies/meusEstudosMath.js'
import { STRINGS } from '../src/i18n/translations.js'

let failures = 0
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}`)
  if (!ok) console.log(`    esperado: ${JSON.stringify(want)}\n    recebido: ${JSON.stringify(got)}`)
}

const sessoes = n => Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}` }))
const ai = [{ id: 'ai-1', title: 'Ansiedade', sessions: sessoes(7) }, { id: 'ai-ativo', title: 'Em andamento', sessions: sessoes(5) }]
const indutivos = [{ id: 'ind-1', title: 'Filipenses', sessions: sessoes(2) }]
const catalogo = [{ id: 'pentateuco', title: 'Pentateuco', sessions: sessoes(10) }, { id: 'evangelhos', title: 'Evangelhos', sessions: sessoes(8) }]
const feitas = new Set(['pentateuco:s1', 'pentateuco:s2', 'ai-1:s1'])
const guardados = savedStudyEntries({ ai, inductive: indutivos, catalog: catalogo, isDone: (id, s) => feitas.has(`${id}:${s}`), activeStudyId: 'ai-ativo' })

check('Salvos: os criados/adotados e os indutivos sempre; do catálogo, só os já começados; o em andamento fica de fora', guardados.map(e => `${e.id}/${e.kind}`), ['ai-1/ai', 'ind-1/inductive', 'pentateuco/catalog'])
check('o progresso de cada um', guardados.map(e => `${e.done}/${e.total}`), ['1/7', '0/2', '2/10'])
check('um estudo do catálogo em andamento não aparece em Salvos', savedStudyEntries({ catalog: catalogo, isDone: () => true, activeStudyId: 'pentateuco' }).map(e => e.id), ['evangelhos'])
check('sem nada guardado: lista vazia', savedStudyEntries(), [])
check('tirar um estudo da pessoa apaga; um do catálogo só zera o progresso', guardados.map(e => removalOf(e).action), ['delete', 'delete', 'clear'])
check('os rótulos e as confirmações de cada ação', [removalOf(guardados[0]), removalOf(guardados[2])], [{ action: 'delete', labelKey: 'deleteBtn', confirmKey: 'deleteConfirm' }, { action: 'clear', labelKey: 'clearBtn', confirmKey: 'clearConfirm' }])
check('zerar o progresso leva as sessões daquele estudo', guardados[2].sessionIds.length, 10)
check('"1 de 10 feito" / "2 de 10 feitos"', [progressLine({ done: 1, total: 10 }), progressLine(guardados[2])], [{ key: 'progressOne', vars: { n: 1, total: 10 } }, { key: 'progressMany', vars: { n: 2, total: 10 } }])

check('publicado: público ou só convidados; ninguém, uma pessoa, várias', [
  publishedLine({ visibility: 'public', usesCount: 0 }), publishedLine({ visibility: 'public', usesCount: 1 }), publishedLine({ visibility: 'public', usesCount: 12 }),
  publishedLine({ visibility: 'invited' }), publishedLine({ visibility: 'invited', usesCount: 1 }), publishedLine({ visibility: 'invited', usesCount: 3 }),
].map(l => l.key), ['publishedPublicNone', 'publishedPublicOne', 'publishedPublicMany', 'publishedInvitedNone', 'publishedInvitedOne', 'publishedInvitedMany'])

const convite = { status: 'invited', study: { id: 'st-1', title: 'Rute', authorName: 'Marina' } }
check('convite por aceitar e convite já aceito', [inviteRow(convite), inviteRow({ ...convite, status: 'accepted' })].map(r => [r.id, r.title, r.authorName, r.pending]), [['st-1', 'Rute', 'Marina', true], ['st-1', 'Rute', 'Marina', false]])
check('o campo da tela filtra por título ou autor, sem diferenciar caixa', [matchesStudyQuery('', convite.study), matchesStudyQuery('rut', convite.study), matchesStudyQuery('MARI', convite.study), matchesStudyQuery('jó', convite.study)], [true, true, true, false])

// os textos existem nos dois idiomas
const chaves = ['sectionInvites', 'invitedBy', 'acceptBtn', 'continueBtn', 'sectionPublished', 'publishedPublicNone', 'publishedPublicOne', 'publishedPublicMany', 'publishedInvitedNone', 'publishedInvitedOne', 'publishedInvitedMany', 'withdrawBtn', 'withdrawConfirm', 'deleteBtn', 'deleteConfirm', 'clearBtn', 'clearConfirm', 'progressOne', 'progressMany', 'actionError']
check('todo texto das quatro ações existe em português e em inglês', chaves.filter(k => !STRINGS.pt.addStudy[k] || !STRINGS.en.addStudy[k]), [])
check('plural certo', [STRINGS.pt.addStudy.publishedPublicOne, STRINGS.pt.addStudy.publishedPublicMany.replace('{n}', '12')], ['Público · 1 pessoa fez', 'Público · 12 pessoas fizeram'])

// regras, no código
const tela = readFileSync(new URL('../src/screens/AddStudyScreen.jsx', import.meta.url), 'utf8')
check('sair do banco, apagar e tirar da lista pedem confirmação antes', (tela.match(/window\.confirm\(/g) ?? []).length >= 2, true)
check('as quatro ações estão na tela Estudos', ['api.acceptInvite(', 'api.withdraw(', 'api.remove('].every(x => tela.includes(x)), true)

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
