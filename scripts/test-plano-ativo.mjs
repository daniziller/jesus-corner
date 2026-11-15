// src/plan/resolveActivePlan.js — qual plano decide a leitura de hoje.
// Roda com: node scripts/test-plano-ativo.mjs
import { resolveActivePlanSessions } from '../src/plan/resolveActivePlan.js'
import { deriveProgress } from '../src/utils/progress.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) { console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`); failures++ }
  else console.log(`OK: ${label}`)
}

const { blocks, sessionsByBlock } = deriveProgress(new Set(), 'standard', 'ot_first')
const lidos = keys => new Set(keys)
const resolve = (alt, completed, { groupPlans = [], themePlans = [], mode = 'canonical', planId = 'standard' } = {}) =>
  resolveActivePlanSessions(alt, themePlans, completed, blocks, sessionsByBlock, planId, null, groupPlans, null,
    { mode, customOrder: null, position: null, readingOrder: 'ot_first' })
const where = r => `${r.kind} ${r.current.session.book} ${r.current.session.chStart}`

const grupo = { id: 'g1', title: 'Rute no grupo', passages: [{ book: 'Rute', chStart: 1, chEnd: 2 }, { book: 'Rute', chStart: 3, chEnd: 4 }] }
const alt = { type: 'group', planId: 'g1' }

check('plano de grupo em andamento decide o hoje', where(resolve(alt, lidos([]), { groupPlans: [grupo] })), 'group Rute 1')
check('plano de grupo pela metade segue no próximo texto', where(resolve(alt, lidos(['Rute:1', 'Rute:2']), { groupPlans: [grupo] })), 'group Rute 3')
check('plano de grupo terminado volta ao plano da Bíblia', where(resolve(alt, lidos(['Rute:1', 'Rute:2', 'Rute:3', 'Rute:4']), { groupPlans: [grupo] })), 'fixed Gênesis 1')
check('plano de grupo que sumiu volta ao plano da Bíblia', where(resolve(alt, lidos([]), { groupPlans: [] })), 'fixed Gênesis 1')
check('plano de grupo sem textos volta ao plano da Bíblia', where(resolve(alt, lidos([]), { groupPlans: [{ ...grupo, passages: [] }] })), 'fixed Gênesis 1')
check('plano de grupo terminado, ordem cronológica guardada: volta ao cronológico',
  resolve(alt, lidos(['Rute:1', 'Rute:2', 'Rute:3', 'Rute:4']), { groupPlans: [grupo], mode: 'chronological' }).kind, 'chrono')

const tema = { id: 't1', title: 'Esperança', passages: [{ book: 'Salmos', chStart: 23, chEnd: 23 }] }
const altTema = { type: 'theme', planId: 't1' }
check('plano por tema em andamento decide o hoje', resolve(altTema, lidos([]), { themePlans: [tema] }).kind, 'theme')
check('plano por tema terminado volta ao plano da Bíblia', where(resolve(altTema, lidos(['Salmos:23']), { themePlans: [tema] })), 'fixed Gênesis 1')

check('cronológico escolhido continua cronológico', resolve({ type: 'chrono', paceId: 'standard' }, lidos([])).kind, 'chrono')
check('sem estudo nem cronológico: plano de sempre', resolve(null, lidos([])).kind, 'fixed')

if (failures) { console.error(`\n${failures} falha(s).`); process.exit(1) }
console.log('\nTodas as regras do plano ativo passaram.')
