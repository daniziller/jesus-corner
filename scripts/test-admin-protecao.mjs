// Painel do admin: verificação em duas etapas e registro de acesso
// (revisão de LGPD, 2026-11-18 — art. 37 e 46).
// node scripts/test-admin-protecao.mjs
import { readFileSync, readdirSync } from 'node:fs'
const { tokenAal, adminMfaRequired } = await import('../api/_lib/adminAuth.js')

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')
const jwt = payload => `Bearer x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`

check('lê o nível do token', [tokenAal(jwt({ aal: 'aal2' })), tokenAal(jwt({ aal: 'aal1' })), tokenAal(jwt({})), tokenAal('Bearer lixo')], ['aal2', 'aal1', 'aal1', 'aal1'])
delete process.env.ADMIN_REQUIRE_MFA
check('segunda etapa ligada por padrão', adminMfaRequired(), true)
process.env.ADMIN_REQUIRE_MFA = 'false'
check('ADMIN_REQUIRE_MFA=false desliga (emergência)', adminMfaRequired(), false)
delete process.env.ADMIN_REQUIRE_MFA

const auth = ler('api/_lib/adminAuth.js')
check('sem aal2: 403 mfa_required', /if \(!allowWithoutMfa && adminMfaRequired\(\) && aal !== 'aal2'\) \{\n\s*res\.status\(403\)\.json\(\{ error: 'mfa_required' \}\)/.test(auth), true)
check('cada acesso fica registrado (quem, endpoint, operação, de quem)', [/from\('admin_access_log'\)\.insert\(\{/.test(auth), /if \(log\) await logAccess\(req, userData\.user, aal\)/.test(auth)], [true, true])
const checkSrc = ler('api/admin/check.js')
check('só o /check passa sem a segunda etapa (é ele que avisa que falta)', /requireAdmin\(req, res, \{ allowWithoutMfa: true, log: false \}\)/.test(checkSrc), true)
const outros = readdirSync(new URL('../api/admin/', import.meta.url)).filter(f => f !== 'check.js' && f.endsWith('.js'))
check('nenhum outro endpoint do painel dispensa a segunda etapa', outros.filter(f => /allowWithoutMfa/.test(ler(`api/admin/${f}`))), [])
check('nenhum endpoint do painel fica sem requireAdmin', outros.filter(f => !/await requireAdmin\(req, res/.test(ler(`api/admin/${f}`))), [])
check('o painel fica atrás da tela da segunda etapa', /<AdminMfaGate lang=\{session\.lang\} onExit=\{exitAdmin\}><AdminScreen /.test(ler('src/App.jsx')), true)
check('registro de acesso guardado 24 meses', /table: 'admin_access_log',\n\s*days: 730/.test(ler('api/retention.js')), true)

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes de proteção do painel passaram.')
