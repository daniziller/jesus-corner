// Regras das cortesias do painel (api/_lib/accessRules.js).
import { pickPersonByName, grantBlockedBy, likeContains } from '../api/_lib/accessRules.js'

let failures = 0
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${name}${ok ? '' : ` — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`}`)
}

const ana = { user_id: 'a', name: 'Ana' }
const mariana = { user_id: 'm', name: 'Mariana Souza' }
const anaPaula = { user_id: 'p', name: 'Ana Paula' }

check('nome exato vence quem só contém', pickPersonByName([mariana, ana, anaPaula], 'ana'), { userId: 'a' })
check('exato ignora maiúsculas e espaços', pickPersonByName([mariana, ana], '  ANA '), { userId: 'a' })
check('um só candidato que contém', pickPersonByName([mariana], 'mari'), { userId: 'm' })
check('vários candidatos sem exato = ambíguo', pickPersonByName([mariana, anaPaula], 'an'), { error: 'ambiguous_name' })
check('dois com o mesmo nome exato = ambíguo', pickPersonByName([ana, { user_id: 'b', name: 'ana' }], 'Ana'), { error: 'ambiguous_name' })
check('ninguém', pickPersonByName([], 'zé'), { error: 'person_not_found' })
check('lista ausente', pickPersonByName(null, 'zé'), { error: 'person_not_found' })

check('sem assinatura: pode', grantBlockedBy(null), null)
check('vitalício comprado: recusa', grantBlockedBy({ status: 'active', access_type: 'lifetime' }), 'already_lifetime')
check('mensal em dia: recusa', grantBlockedBy({ status: 'active', access_type: 'recurring' }), 'already_paying')
check('mensal em teste: recusa', grantBlockedBy({ status: 'trialing', access_type: 'recurring' }), 'already_paying')
check('mensal com pagamento atrasado: recusa', grantBlockedBy({ status: 'past_due', access_type: 'recurring' }), 'already_paying')
check('mensal cancelada: pode', grantBlockedBy({ status: 'canceled', access_type: 'recurring' }), null)
check('cortesia vigente: pode renovar', grantBlockedBy({ status: 'active', access_type: 'free' }), null)
check('cortesia vencida: pode', grantBlockedBy({ status: 'none', access_type: 'free' }), null)

check('curingas escapados', likeContains('50%_a\\b'), '%50\\%\\_a\\\\b%')
check('texto comum', likeContains('Ana'), '%Ana%')

if (failures) { console.log(`\n${failures} falha(s).`); process.exit(1) }
console.log('\nTodas as regras das cortesias passaram.')
