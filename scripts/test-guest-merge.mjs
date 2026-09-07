// Testa src/backend/guestMergeMath.js — a peça que, sem esta checagem
// ("servidor vence" sempre, nunca sobrescreve um campo não-vazio), apagou
// de verdade meses de daily_routine de uma conta real em produção
// (2026-09-07). Roda com: node scripts/test-guest-merge.mjs
import { isEmptyValue, computeGuestMergePatch } from '../src/backend/guestMergeMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`)
    failures++
  } else {
    console.log(`OK: ${label} = ${JSON.stringify(actual)}`)
  }
}

check('isEmptyValue(null)', isEmptyValue(null), true)
check('isEmptyValue(undefined)', isEmptyValue(undefined), true)
check('isEmptyValue([])', isEmptyValue([]), true)
check('isEmptyValue({})', isEmptyValue({}), true)
check('isEmptyValue(0) — número não é vazio', isEmptyValue(0), false)
check('isEmptyValue("") — string vazia não conta como vazio (tipos diferentes de completed_keys/daily_routine)', isEmptyValue(''), false)
check('isEmptyValue([1,2])', isEmptyValue([1, 2]), false)
check('isEmptyValue({a:1})', isEmptyValue({ a: 1 }), false)
check('isEmptyValue("standard")', isEmptyValue('standard'), false)

// O caso que causou a perda de dado real: conta com meses de daily_routine
// (não vazio) + resto de progresso de convidado no mesmo aparelho — o
// campo da conta NUNCA pode ser trocado, não importa o motivo da chamada.
{
  const guestPatch = {
    daily_routine: { '2026-09-07': { reading: true } },
    plan_id: 'free',
    completed_keys: ['Gênesis:1'],
  }
  const serverRow = {
    daily_routine: { '2026-07-01': { reading: true }, '2026-07-02': { reading: true } },
    plan_id: 'standard',
    completed_keys: ['Gênesis:1', 'Gênesis:2', 'Gênesis:3'],
  }
  const patch = computeGuestMergePatch(guestPatch, serverRow)
  check('conta com histórico real: nenhum campo do convidado entra', patch, {})
}

// Conta genuinamente nova (linha ainda não existe — corrida rara logo
// após o signup): tudo do convidado migra, porque não há nada pra perder.
{
  const guestPatch = { daily_routine: { '2026-09-07': { reading: true } }, plan_id: 'free' }
  const patch = computeGuestMergePatch(guestPatch, null)
  check('conta sem linha ainda: tudo migra', patch, guestPatch)
}

// Conta nova mas já com a linha criada pelo gatilho do banco (plan_id com
// valor padrão não-vazio) — só os campos REALMENTE vazios da conta
// (daily_routine/completed_keys, que começam {}/[] em qualquer conta nova)
// recebem o valor do convidado; plan_id (já não-vazio por padrão) fica
// como está — efeito colateral aceitável, documentado em userDataStore.js.
{
  const guestPatch = { daily_routine: { '2026-09-07': { reading: true } }, plan_id: 'free', completed_keys: ['Gênesis:1'] }
  const serverRow = { daily_routine: {}, plan_id: 'standard', completed_keys: [] }
  const patch = computeGuestMergePatch(guestPatch, serverRow)
  check(
    'conta nova com defaults do gatilho: daily_routine/completed_keys migram, plan_id não',
    patch,
    { daily_routine: { '2026-09-07': { reading: true } }, completed_keys: ['Gênesis:1'] },
  )
}

// Mistura: alguns campos vazios na conta, outros não — só os vazios mudam.
{
  const guestPatch = { notes: { a: 1 }, weekly_days: [true, true, true, true, true, false, false] }
  const serverRow = { notes: {}, weekly_days: [true, false, true, false, true, false, false] }
  const patch = computeGuestMergePatch(guestPatch, serverRow)
  check('notes vazio migra, weekly_days não-vazio não migra', patch, { notes: { a: 1 } })
}

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de guestMergeMath passaram.')
