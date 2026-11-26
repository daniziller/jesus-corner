// Testes dos consentimentos da revisão de LGPD (2026-11-18): e-mails com
// descadastro e respeitando a escolha, escrita assistida só com
// consentimento próprio (conferido no servidor), idade 18+ exigida pelo
// servidor, portão de consentimento que falha fechado.
// node scripts/test-consentimento-lgpd.mjs
import { readFileSync } from 'node:fs'

process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'chave-de-teste'
process.env.VITE_SUPABASE_URL ||= 'https://teste.invalid'
const { unsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl, unsubscribeHeaders, consentMap, EMAIL_PURPOSES } = await import('../api/_lib/emailConsent.js')
const { ensureAiBudget } = await import('../api/_lib/aiBudget.js')
const { POLICY_VERSION } = await import('../src/privacy/policyVersion.js')

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')

// ── Link de descadastro ─────────────────────────────────────────────────
const tok = unsubscribeToken('u1', 'weekly_email')
check('link assinado vale para a pessoa e a finalidade dele', verifyUnsubscribeToken('u1', 'weekly_email', tok), true)
check('não vale para outra pessoa, outra finalidade, nem adulterado', [
  verifyUnsubscribeToken('u2', 'weekly_email', tok),
  verifyUnsubscribeToken('u1', 'marketing_email', tok),
  verifyUnsubscribeToken('u1', 'weekly_email', tok.slice(0, -2) + 'xx'),
  verifyUnsubscribeToken('u1', 'terms', unsubscribeToken('u1', 'terms')),
], [false, false, false, false])
const url = unsubscribeUrl('u1', EMAIL_PURPOSES.MARKETING)
check('link aponta pra /api/unsubscribe', url.startsWith('https://app.jesuscorner.app/api/unsubscribe?u=u1&p=marketing_email&t='), true)
check('cabeçalhos de descadastro com um clique (RFC 8058)', unsubscribeHeaders(url), { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' })

// ── Estado das finalidades ──────────────────────────────────────────────
function consentsDb(rows, { fail = false } = {}) {
  return {
    from: () => {
      const q = { filters: {} }
      q.select = () => q
      q.eq = (k, v) => { q.filters[k] = v; return q }
      q.in = (k, v) => { q.filters[k] = v; return q }
      q.order = () => fail ? Promise.resolve({ data: null, error: { message: 'fora' } })
        : Promise.resolve({ data: rows.filter(r => r.purpose === q.filters.purpose && q.filters.user_id.includes(r.user_id)).sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null })
      return q
    },
  }
}
const rows = [
  { user_id: 'a', purpose: 'marketing_email', granted: true, created_at: '2026-01-01' },
  { user_id: 'a', purpose: 'marketing_email', granted: false, created_at: '2026-02-01' },
  { user_id: 'b', purpose: 'marketing_email', granted: true, created_at: '2026-01-01' },
  { user_id: 'a', purpose: 'weekly_email', granted: false, created_at: '2026-03-01' },
]
const mk = await consentMap(consentsDb(rows), 'marketing_email', ['a', 'b', 'c'])
check('novidades: a linha mais recente vence; sem linha = não manda (opt-in)', [mk.get('a'), mk.get('b'), mk.get('c')], [false, true, false])
const wk = await consentMap(consentsDb(rows), 'weekly_email', ['a', 'c'])
check('resumo semanal: quem desligou não recebe; sem linha = recebe', [wk.get('a'), wk.get('c')], [false, true])
const ai = await consentMap(consentsDb(rows), 'ai_processing', ['a'])
check('escrita assistida: sem linha = não (opt-in)', ai.get('a'), false)
let erro = null
try { await consentMap(consentsDb(rows, { fail: true }), 'marketing_email', ['a']) } catch (e) { erro = e }
check('sem conseguir ler os consentimentos, não manda às cegas (lança)', !!erro, true)

// ── Escrita assistida: conferida no servidor antes de gerar ─────────────
function aiDb({ consent, fail = false, spent = 0 }) {
  return {
    from: table => {
      const q = {}
      q.select = () => q; q.eq = () => q; q.order = () => q; q.limit = () => q
      q.maybeSingle = async () => {
        if (table === 'consents') return fail ? { data: null, error: { message: 'fora' } } : { data: consent === undefined ? null : { granted: consent }, error: null }
        return { data: { cost_micros: spent }, error: null }
      }
      return q
    },
  }
}
function fakeRes() { const r = { code: null, body: null }; r.status = c => { r.code = c; return r }; r.json = b => { r.body = b; return r }; return r }
const silencio = console.error
console.error = () => {}
for (const [label, opts, expected] of [
  ['sem consentimento: 403 ai_consent_required', { consent: undefined }, [false, 403, 'ai_consent_required']],
  ['consentimento retirado: 403', { consent: false }, [false, 403, 'ai_consent_required']],
  ['leitura falhou: 503 (não manda texto pra fora sem confirmar)', { fail: true }, [false, 503, 'consent_check_failed']],
  ['com consentimento e saldo: libera', { consent: true }, [true, null, null]],
  ['com consentimento, sem saldo: 429 do limite', { consent: true, spent: 5_000_000 }, [false, 429, 'ai_budget_reached']],
]) {
  const res = fakeRes()
  const ok = await ensureAiBudget(res, 'u1', { db: aiDb(opts) })
  check(`escrita assistida — ${label}`, [ok, res.code, res.body?.error ?? null], expected)
}
console.error = silencio

// ── Servidor: idade e versão da política ────────────────────────────────
const rec = ler('api/record-consent.js')
check('aceitar os termos exige a declaração de 18+ no mesmo envio', [/grantsTerms && !declaresAdult/.test(rec), /adult_required/.test(rec)], [true, true])
check('a versão gravada é a do servidor', [/policy_version: POLICY_VERSION/.test(rec), /policy_version_mismatch/.test(rec)], [true, true])
check('finalidades novas aceitas', ['adult', 'ai_processing', 'weekly_email'].every(p => rec.includes(`'${p}'`)), true)
check('a versão da política subiu com a revisão', POLICY_VERSION, '2026-11-18')
const mig = ler('supabase/migrations/0083_consentimentos_novos.sql')
check('migração: banco aceita as finalidades novas', ['adult', 'ai_processing', 'weekly_email'].every(p => mig.includes(`'${p}'`)), true)

// ── App: consentimento ──────────────────────────────────────────────────
const consent = ler('src/privacy/consent.js')
check('obrigatórios: termos, dados sobre a fé e idade', /REQUIRED_PURPOSES = \[PURPOSES\.TERMS, PURPOSES\.SENSITIVE_DATA, PURPOSES\.ADULT\]/.test(consent), true)
check('portão falha fechado (sem leitura e sem confirmação neste aparelho = pede de novo)', [/catch \(err\) \{\n\s*console\.error\('Falha ao conferir o consentimento', err\)\n\s*try \{ return !\(userId && localStorage\.getItem\(CONFIRMED_KEY\(userId\)\) === '1'\) \} catch \{ return true \}/.test(consent)], [true])
const app = ler('src/App.jsx') + ler('src/screens/AuthScreen.jsx')
check('ninguém mais engole o erro do portão como "não precisa"', /needsConsentRefresh\(\)\.catch\(\(\) => false\)/.test(app), false)
const choices = ler('src/privacy/ConsentChoices.jsx')
check('caixas começam todas desmarcadas', /EMPTY_CHOICES = \{ adult: false, terms: false, sensitive: false, ai: false, marketing: false \}/.test(choices), true)
check('a dos dados sobre a fé vem destacada', /highlight kicker=\{A\('sensitiveKicker'\)\}/.test(choices), true)
check('cadastro, política atualizada e Google/Apple usam as mesmas caixas', ['src/screens/SignupScreen.jsx', 'src/screens/ConsentRefreshScreen.jsx', 'src/screens/LoginScreen.jsx'].map(f => /<ConsentChoices /.test(ler(f))), [true, true, true])
check('Google/Apple: consentimento guardado antes de sair pro provedor', /savePendingConsents\(consentRecords\(consent\)\)\n\s*try \{/.test(ler('src/screens/LoginScreen.jsx')), true)
check('conta nova que recusa é apagada', /if \(isNewAccount\) \{[\s\S]*deleteMyAccount\(email\)/.test(ler('src/screens/ConsentRefreshScreen.jsx')), true)
const profile = ler('src/screens/ProfileScreen.jsx')
check('Privacidade: liga/desliga escrita assistida, resumo por e-mail e novidades', ['PURPOSES.AI_PROCESSING', 'PURPOSES.WEEKLY_EMAIL', 'PURPOSES.MARKETING_EMAIL'].every(p => profile.includes(p)), true)
check('perfil público registra o consentimento a cada troca; idade < 18 recusada', [/setConsent\(PURPOSES\.PUBLIC_PROFILE, editIsPublic\)/.test(profile), /isUnderMinAge\(birthdate\)/.test(profile)], [true, true])
check('o app abre o pedido quando o servidor responde ai_consent_required', [/ai_consent_required/.test(ler('src/privacy/aiConsentGate.js')), /installAiConsentInterceptor\(\)/.test(ler('src/main.jsx')), /<AiConsentSheet \/>/.test(ler('src/App.jsx'))], [true, true, true])

// App antigo em cache (caso real, 2026-11-26): aceite da política nova
// feito em outro aparelho vale aqui; o servidor responde 409 antes do 400
// de idade, e o app novo se recarrega nesse 409.
const fonte = ler('src/privacy/consent.js')
const corpo = fonte.slice(fonte.indexOf('export function isConsentMissing'), fonte.indexOf('export async function needsConsentRefresh'))
const isConsentMissing = new Function('REQUIRED_PURPOSES', 'POLICY_VERSION', `${corpo.replace('export ', '')}; return isConsentMissing`)(['terms', 'sensitive_data', 'adult'], POLICY_VERSION)
const linhas = v => Object.fromEntries(['terms', 'sensitive_data', 'adult'].map(p => [p, { granted: true, policy_version: v }]))
check('consentimento da versão atual ou mais nova vale; o de versão anterior não', [isConsentMissing(linhas(POLICY_VERSION)), isConsentMissing(linhas('2999-01-01')), isConsentMissing(linhas('2026-09-02')), isConsentMissing({})], [false, false, true, true])
check('servidor confere a versão antes da idade (app antigo recebe 409)', rec.indexOf('policy_version_mismatch') < rec.indexOf('adult_required'), true)
check('reconsentimento recarrega o app quando o servidor diz que a versão mudou', /policy_version_mismatch[\s\S]*window\.location\.reload\(\)/.test(ler('src/screens/ConsentRefreshScreen.jsx')), true)

// ── E-mails ─────────────────────────────────────────────────────────────
const digest = ler('api/send-weekly-digest.js')
check('resumo por e-mail só para quem não desligou, com descadastro', [/if \(weeklyEmailConsent\.get\(row\.user_id\)\)/.test(digest), /headers: unsubscribeHeaders\(unsubscribe\)/.test(digest)], [true, true])
check('o e-mail não leva o texto do resumo nem as anotações', [/openingParagraph|closingParagraph|noteQuotes\}|summaryData/.test(digest.slice(digest.indexOf('function buildSummaryHtml'), digest.indexOf('export default'))), /copy\.emailBody/.test(digest)], [false, true])
const bc = ler('api/admin/broadcast.js')
check('avisos por e-mail só para quem aceitou novidades, com descadastro e HTML escapado', [/consentMap\(supabaseAdmin, EMAIL_PURPOSES\.MARKETING/.test(bc), /emailable = withEmail\.filter\(r => consent\.get\(r\.id\)\)/.test(bc), /unsubscribeHeaders\(url\)/.test(bc), /title = escapeHtml\(title\)/.test(bc)], [true, true, true, true])
const un = ler('api/unsubscribe.js')
check('descadastro: GET só mostra a página (leitores de e-mail abrem links); POST grava granted=false', [un.indexOf("if (req.method === 'GET')") < un.indexOf(".from('consents').insert"), /granted: false/.test(un), /verifyUnsubscribeToken\(u, p, t\)/.test(un)], [true, true, true])

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes de consentimento passaram.')
