// Testes do limite de IA (pedido dela, 2026-11-18): a conta grátis não usa
// IA nenhuma; cada conta Premium gasta até US$1,50 por mês em texto gerado.
// A voz natural fica fora do limite (gerada uma vez por trecho, guardada pra
// todos).
// node scripts/test-limite-ia.mjs
import { readFileSync, readdirSync } from 'node:fs'
import {
  MODEL_PRICES, MONTHLY_BUDGET_MICROS, budgetMonth, budgetResetsAt, tokensOf, costMicros, budgetState,
  readBudget, meterAi, recordModelUsage,
} from '../api/_lib/aiBudget.js'
import { STRINGS } from '../src/i18n/translations.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')

// ── O preço e a conta ───────────────────────────────────────────────────
const MODEL = ler('api/_lib/ai.js').match(/const MODEL = '([^']+)'/)[1]
check('o modelo usado em ai.js tem preço na tabela', [MODEL, MODEL_PRICES[MODEL]], ['anthropic/claude-sonnet-5', { inputPerM: 2, outputPerM: 10 }])
check('teto de US$1,50 por mês, em micro-dólares', MONTHLY_BUDGET_MICROS, 1_500_000)
check('custo: 1M de entrada = US$2; 1M de saída = US$10', [costMicros({ input: 1_000_000 }, MODEL), costMicros({ output: 1_000_000 }, MODEL)], [2_000_000, 10_000_000])
check('uma pergunta típica (3 mil de entrada, 600 de saída) custa ~1,2 centavo', costMicros({ input: 3000, output: 600 }, MODEL), 12_000)
check('arredonda para cima, nunca de graça', costMicros({ input: 1 }, MODEL), 2)
check('modelo sem preço é cobrado pelo mais caro, nunca de graça', costMicros({ output: 1000 }, 'outro/modelo'), 10_000)
check('tokens: nomes novos e antigos do AI SDK; ausente vale zero', [tokensOf({ inputTokens: 10, outputTokens: 5 }), tokensOf({ promptTokens: 7, completionTokens: 3 }), tokensOf(undefined), tokensOf({ inputTokens: -4, outputTokens: NaN })], [{ input: 10, output: 5 }, { input: 7, output: 3 }, { input: 0, output: 0 }, { input: 0, output: 0 }])

// ── O mês (Brasília) ────────────────────────────────────────────────────
check('mês em Brasília: 1º de dezembro às 01h UTC ainda é novembro lá', budgetMonth(Date.UTC(2026, 11, 1, 1, 0)), '2026-11')
check('mês em Brasília: 1º de dezembro às 04h UTC já é dezembro', budgetMonth(Date.UTC(2026, 11, 1, 4, 0)), '2026-12')
check('volta à meia-noite do dia 1º, em Brasília', budgetResetsAt(Date.UTC(2026, 10, 18, 12)), '2026-12-01T03:00:00.000Z')
check('virada de ano', budgetResetsAt(Date.UTC(2026, 11, 20, 12)), '2027-01-01T03:00:00.000Z')

// ── O estado do saldo ───────────────────────────────────────────────────
const agora = Date.UTC(2026, 10, 18, 12)
check('sem gasto: saldo inteiro', (({ remainingMicros, exhausted }) => [remainingMicros, exhausted])(budgetState(0, agora)), [1_500_000, false])
check('quase no teto: ainda libera', budgetState(1_499_999, agora).exhausted, false)
check('no teto: bloqueia', budgetState(1_500_000, agora).exhausted, true)
check('acima do teto (a última chamada passou um pouco): bloqueia, saldo zero', (({ remainingMicros, exhausted }) => [remainingMicros, exhausted])(budgetState(1_550_000, agora)), [0, true])

// Banco de mentira: guarda o que a RPC somaria.
function fakeDb(start = 0) {
  const db = { total: start, rpcCalls: [] }
  db.from = () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.total ? { cost_micros: db.total } : null, error: null }) }) }) }) })
  db.rpc = async (name, args) => { db.rpcCalls.push([name, args]); db.total += args.p_cost_micros; return { data: db.total, error: null } }
  return db
}
const db = fakeDb(1_000_000)
check('lê o gasto do mês', (await readBudget('u1', { db, nowMs: agora })).spentMicros, 1_000_000)

// meterAi soma o que as chamadas ao modelo usaram e grava uma vez.
await meterAi('u1', 'teste', async () => {
  recordModelUsage(MODEL, { inputTokens: 100_000, outputTokens: 10_000 }) // 0,20 + 0,10 = US$0,30
  recordModelUsage(MODEL, { inputTokens: 50_000, outputTokens: 0 }) // US$0,10
  return 'ok'
}, { db, nowMs: agora })
check('meterAi grava a soma das chamadas, no mês certo', db.rpcCalls.map(([n, a]) => [n, a.p_user_id, a.p_month, a.p_cost_micros, a.p_input_tokens, a.p_output_tokens]), [['add_ai_usage', 'u1', '2026-11', 400_000, 150_000, 10_000]])
check('com US$1,40 gastos, ainda libera', (await readBudget('u1', { db, nowMs: agora })).exhausted, false)
await meterAi('u1', 'teste', async () => { recordModelUsage(MODEL, { outputTokens: 20_000 }) }, { db, nowMs: agora })
check('passou de US$1,50: bloqueado até o mês seguinte', (await readBudget('u1', { db, nowMs: agora })).exhausted, true)

// Falhou depois de gastar: o gasto conta do mesmo jeito.
const db2 = fakeDb()
let falhou = false
try { await meterAi('u2', 'teste', async () => { recordModelUsage(MODEL, { inputTokens: 1000 }); throw new Error('verificação recusou') }, { db: db2, nowMs: agora }) } catch { falhou = true }
check('resposta recusada depois de gerar: o erro sobe e o custo é gravado', [falhou, db2.total], [true, 2000])
const db3 = fakeDb()
await meterAi('u3', 'teste', async () => 'nada gerado', { db: db3, nowMs: agora })
check('nada gerado (cache): nada gravado', db3.rpcCalls.length, 0)

// Chamadas paralelas de duas pessoas não se misturam.
const db4 = fakeDb()
await Promise.all([
  meterAi('a', 'teste', async () => { await new Promise(r => setTimeout(r, 5)); recordModelUsage(MODEL, { inputTokens: 1000 }) }, { db: db4, nowMs: agora }),
  meterAi('b', 'teste', async () => { recordModelUsage(MODEL, { outputTokens: 1000 }) }, { db: db4, nowMs: agora }),
])
check('duas pessoas ao mesmo tempo: cada uma paga o seu', db4.rpcCalls.map(([, a]) => [a.p_user_id, a.p_cost_micros]).sort(), [['a', 2000], ['b', 10_000]])

// ── A voz natural fica fora do limite ───────────────────────────────────
const tts = ler('api/tts.js')
check('tts.js: não confere nem cobra o limite mensal da pessoa', [/ensureAiBudget|meterAi|recordSpeechUsage|aiBudget/.test(tts)], [false])
check('tts.js: continua exigindo o Premium', /if \(!ent\.hasPremium\) return res\.status\(403\)/.test(tts), true)
check('aiBudget.js: sem cálculo de custo de voz', /speechCostMicros|recordSpeechUsage|SPEECH_PRICES/.test(ler('api/_lib/aiBudget.js')), false)
const fala = ler('src/audio/premiumSpeech.js')
check('app: sem tratamento de limite na voz (o servidor não recusa mais por limite)', /tts_budget_reached/.test(fala), false)
check('a mensagem do limite diz que a voz natural continua', [STRINGS.pt.aiChat.budgetReached.includes('voz natural continua'), STRINGS.en.aiChat.budgetReached.includes('natural voice keeps')], [true, true])

// ── Toda geração passa pelo limite ──────────────────────────────────────
const ai = ler('api/_lib/ai.js')
check('ai.js chama o modelo só pelo generateText medido', [/import \{ generateText as sdkGenerateText, Output \} from 'ai'/.test(ai), /recordModelUsage\(options\.model, result\.totalUsage \?\? result\.usage\)/.test(ai), (ai.match(/sdkGenerateText\(/g) ?? []).length], [true, true, 1])
const endpoints = readdirSync(new URL('../api/', import.meta.url)).filter(f => f.endsWith('.js')).filter(f => /from '\.\/_lib\/ai\.js'/.test(ler(`api/${f}`)))
check('15 endpoints e o resumo semanal usam IA', endpoints.length, 16)
const semMedidor = endpoints.filter(f => !/meterAi\(/.test(ler(`api/${f}`)))
check('todo endpoint com IA mede o gasto (meterAi)', semMedidor, [])
const semTeto = endpoints.filter(f => f !== 'send-weekly-digest.js').filter(f => { const s = ler(`api/${f}`); return !/ensureAiBudget\(res,/.test(s) && !/requireCaller\(req, res, \{ needsAI: true, budget: true \}\)/.test(s) })
check('todo endpoint com IA confere o teto antes de gerar', semTeto, [])
const semPremium = endpoints.filter(f => f !== 'send-weekly-digest.js').filter(f => { const s = ler(`api/${f}`); return !/if \(!ent\.hasAI\)/.test(s) && !/needsAI: true/.test(s) })
check('todo endpoint com IA exige o Premium (o grátis não gera nada)', semPremium, [])
check('resumo da leitura e pergunta da semana agora exigem Premium', [/needsAI: true, budget: true/.test(ler('api/generate-reading-summary.js')), /needsAI: true, budget: true/.test(ler('api/suggest-weekly-question.js'))], [true, true])
const digest = ler('api/send-weekly-digest.js')
check('resumo semanal: texto só para quem assina, consentiu a escrita assistida e tem saldo', [/premiumUsers\.has\(row\.user_id\) && aiConsent\.get\(row\.user_id\) && !\(await readBudget\(row\.user_id\)\)\.exhausted/.test(digest), /let summaryText = null/.test(digest)], [true, true])
check('as telas do resumo semanal aguentam o resumo sem texto', [/\{current\.summary && \(/.test(ler('src/screens/WeeklySummaryTextScreen.jsx')), /const written = current\.summary \?\? null/.test(ler('src/screens/WeeklySummaryPrayerGroupScreen.jsx'))], [true, true])
check('a migração cria a tabela e a RPC só para o service role', (m => [/create table if not exists public\.ai_usage_monthly/.test(m), /revoke all on function public\.add_ai_usage[^;]*from public, anon, authenticated/.test(m), /grant execute on function public\.add_ai_usage[^;]*to service_role/.test(m)])(ler('supabase/migrations/0079_limite_ia.sql')), [true, true, true])

// ── No app, o grátis não alcança nada gerado ────────────────────────────
const app = ler('src/App.jsx')
check('desafio do grupo: criar e refazer travados sem Premium', [/createChallenge: !session\.hasAI\s*\?\s*<PremiumRequired feature="ai"/.test(app), /groupChallengeProposal: !session\.hasAI\s*\?\s*<PremiumRequired feature="ai"/.test(app)], [true, true])
check('anotação de pregação: síntese só no Premium', [/canSummarize=\{!!session\.hasAI\}/.test(app), /if \(!canSummarize \|\| plan\.action === 'none'\)/.test(ler('src/screens/AnotacaoGuardadaScreen.jsx'))], [true, true])
check('Hoje: desafio do grupo só para quem assina', /if \(!session\.hasPremium \|\| groups\.length === 0\)/.test(ler('src/screens/HomeScreen.jsx')), true)

// ── Sem o nome "IA" no app ──────────────────────────────────────────────
// O painel administrativo (admin.*) e o painel do Master continuam falando
// em IA: só a equipe vê.
const ADMIN = new Set(['admin', 'master', 'masterTx', 'adminTx', 'adminMobile'])
function aiStrings(node, path = []) {
  if (typeof node === 'string') return /(^|[^A-Za-zÀ-ú])(IA|AI)([^A-Za-zÀ-ú]|$)/.test(node) ? [path.join('.')] : []
  if (!node || typeof node !== 'object') return []
  return Object.entries(node).flatMap(([k, v]) => (path.length === 0 && ADMIN.has(k) ? [] : aiStrings(v, [...path, k])))
}
const restantes = [...aiStrings(STRINGS.pt), ...aiStrings(STRINGS.en)].filter(k => !/^(admin|master)/i.test(k) && !k.includes('.reports.'))
check('nenhum texto que a pessoa vê fala em "IA"/"AI"', restantes, [])
check('mensagem de limite do mês nos dois idiomas', [!!STRINGS.pt.aiChat.budgetReached, !!STRINGS.en.aiChat.budgetReached], [true, true])

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes do limite de IA passaram.')
