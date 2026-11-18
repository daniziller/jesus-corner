// Limite de gasto com IA por pessoa (pedido dela, 2026-11-18): cada conta
// Premium pode gastar até US$1,50 por mês em texto gerado (perguntas sobre
// o texto, resumos, planos, estudos). Acabou, esses recursos respondem
// `ai_budget_reached` até o mês seguinte. A voz natural fica FORA do
// limite: é gerada conforme o uso e guardada pra todos (api/tts.js,
// api/_lib/ttsCache.js), então cada trecho custa uma vez só, ao app. A conta
// grátis nem chega aqui — não usa IA nenhuma (api/_lib/caller.js e
// entitlement.js barram antes).
//
// Como funciona:
//   1. Antes de gerar, o endpoint chama ensureAiBudget: lê o gasto do mês
//      (ai_usage_monthly) e recusa se já bateu o teto.
//   2. A geração roda dentro de meterAi(userId, feature, fn). Toda chamada
//      ao modelo em api/_lib/ai.js passa por um generateText medido, que
//      soma os tokens usados ao medidor aberto por meterAi.
//   3. Ao terminar (dê certo ou não), meterAi grava o custo pela RPC
//      add_ai_usage (soma atômica no banco).
//
// O custo usa o preço de tabela do modelo, sem desconto de cache: o número
// sai igual ou um pouco ACIMA do que de fato se paga — o limite nunca é
// estourado por subestimar.
//
// O mês é o de Brasília (aaaa-mm), o mesmo fuso do resto do painel.
import { AsyncLocalStorage } from 'node:async_hooks'
import { createClient } from '@supabase/supabase-js'

// US$ por milhão de tokens. anthropic/claude-sonnet-5 no Vercel AI Gateway
// (o MODEL de api/_lib/ai.js): US$2 de entrada, US$10 de saída. Trocar o
// modelo lá exige atualizar o preço aqui — um modelo sem preço conhecido
// é cobrado pelo mais caro da tabela, nunca de graça.
export const MODEL_PRICES = {
  'anthropic/claude-sonnet-5': { inputPerM: 2, outputPerM: 10 },
}
const FALLBACK_PRICE = Object.values(MODEL_PRICES).reduce((a, b) => (b.outputPerM > a.outputPerM ? b : a))

// O teto mensal por pessoa, em dólares (era US$2; baixou para US$1,50 em
// 2026-11-18, pra sobrar margem até no plano anual vendido pela loja). Só
// texto gerado — a voz natural não entra.
export const MONTHLY_BUDGET_USD = 1.5
export const MONTHLY_BUDGET_MICROS = Math.round(MONTHLY_BUDGET_USD * 1_000_000)

const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000

// 'aaaa-mm' no fuso de Brasília.
export function budgetMonth(nowMs = Date.now()) {
  return new Date(nowMs - BRAZIL_OFFSET_MS).toISOString().slice(0, 7)
}

// Quando o limite volta: meia-noite do dia 1 do mês seguinte, em Brasília
// (ISO, UTC).
export function budgetResetsAt(nowMs = Date.now()) {
  const br = new Date(nowMs - BRAZIL_OFFSET_MS)
  return new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth() + 1, 1) + BRAZIL_OFFSET_MS).toISOString()
}

// Os tokens de uma resposta do AI SDK — `usage` mudou de nome entre
// versões (inputTokens/outputTokens agora; promptTokens/completionTokens
// antes). Ausente ou inválido conta como zero.
export function tokensOf(usage) {
  const n = v => (Number.isFinite(v) && v > 0 ? Math.round(v) : 0)
  return {
    input: n(usage?.inputTokens ?? usage?.promptTokens),
    output: n(usage?.outputTokens ?? usage?.completionTokens),
  }
}

// Custo em micro-dólares (1 dólar = 1.000.000), arredondado pra cima.
export function costMicros({ input = 0, output = 0 }, model) {
  const price = MODEL_PRICES[model] ?? FALLBACK_PRICE
  return Math.ceil(input * price.inputPerM + output * price.outputPerM)
}

// O que sobra no mês, a partir do gasto (micro-dólares).
export function budgetState(spentMicros, nowMs = Date.now()) {
  const spent = Math.max(0, Number(spentMicros) || 0)
  return {
    spentMicros: spent,
    limitMicros: MONTHLY_BUDGET_MICROS,
    remainingMicros: Math.max(0, MONTHLY_BUDGET_MICROS - spent),
    exhausted: spent >= MONTHLY_BUDGET_MICROS,
    resetsAt: budgetResetsAt(nowMs),
  }
}

let admin = null
function supabaseAdmin() {
  if (!admin) admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  return admin
}

export async function readBudget(userId, { db = supabaseAdmin(), nowMs = Date.now() } = {}) {
  const { data, error } = await db
    .from('ai_usage_monthly')
    .select('cost_micros')
    .eq('user_id', userId)
    .eq('month', budgetMonth(nowMs))
    .maybeSingle()
  // Sem conseguir ler o gasto, não libera às cegas — mas também não pune
  // quem paga por uma falha nossa: deixa passar e registra o erro. O teto
  // continua valendo assim que a leitura voltar.
  if (error) console.error('[aiBudget] leitura do gasto falhou:', error.message)
  return budgetState(data?.cost_micros ?? 0, nowMs)
}

// Confere o teto antes de gerar. Bateu: responde 429 com quando volta e
// devolve false (`if (!(await ensureAiBudget(res, id))) return`).
export async function ensureAiBudget(res, userId, opts) {
  const state = await readBudget(userId, opts)
  if (!state.exhausted) return true
  res.status(429).json({ error: 'ai_budget_reached', resetsAt: state.resetsAt })
  return false
}

// ── O medidor ───────────────────────────────────────────────────────────
const meterStore = new AsyncLocalStorage()

// Chamado pelo generateText medido de api/_lib/ai.js a cada resposta do
// modelo. Fora de um meterAi (não deveria acontecer), só avisa no log.
export function recordModelUsage(model, usage) {
  const meter = meterStore.getStore()
  const tokens = tokensOf(usage)
  if (!meter) {
    console.warn('[aiBudget] chamada de IA fora de meterAi — custo não atribuído a ninguém:', model, tokens)
    return
  }
  meter.input += tokens.input
  meter.output += tokens.output
  meter.micros += costMicros(tokens, model)
}

// Roda `fn` medindo toda chamada ao modelo feita dentro dela, e grava o
// custo na conta de `userId` no fim — também quando `fn` falha depois de
// já ter gasto tokens (uma resposta recusada pela verificação, por
// exemplo, custou do mesmo jeito).
export async function meterAi(userId, feature, fn, { db = supabaseAdmin(), nowMs = Date.now() } = {}) {
  const meter = { input: 0, output: 0, micros: 0 }
  try {
    return await meterStore.run(meter, fn)
  } finally {
    if (meter.micros > 0 || meter.input > 0 || meter.output > 0) {
      const { error } = await db.rpc('add_ai_usage', {
        p_user_id: userId,
        p_month: budgetMonth(nowMs),
        p_cost_micros: meter.micros,
        p_input_tokens: meter.input,
        p_output_tokens: meter.output,
      })
      if (error) console.error(`[aiBudget] não gravou o uso (${feature}) de ${userId}:`, error.message)
    }
  }
}
