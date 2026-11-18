// Testes do limite diário de trechos novos da voz natural (pedido dela,
// 2026-11-18): só trechos que precisam ser gerados contam; os guardados
// tocam sem limite.
// node scripts/test-limite-diario-voz.mjs
import { readFileSync } from 'node:fs'
import { TTS_DAILY_MAX, ttsDay, claimTtsGeneration, releaseTtsGeneration } from '../api/_lib/ttsLimit.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')

// ── O dia (Brasília) ────────────────────────────────────────────────────
check('300 trechos novos por dia', TTS_DAILY_MAX, 300)
check('dia em Brasília: 02h UTC ainda é o dia anterior lá', ttsDay(Date.UTC(2026, 10, 19, 2, 0)), '2026-11-18')
check('dia em Brasília: 03h UTC já é o dia seguinte', ttsDay(Date.UTC(2026, 10, 19, 3, 0)), '2026-11-19')

// ── Reservar e devolver (banco de mentira com a mesma regra da RPC) ─────
function fakeDb({ fail = false } = {}) {
  const db = { counts: new Map(), calls: [] }
  db.rpc = async (name, args) => {
    db.calls.push([name, args])
    if (fail) return { data: null, error: { message: 'fora do ar' } }
    const key = `${args.p_user_id}|${args.p_day}`
    const n = db.counts.get(key) ?? 0
    if (name === 'claim_tts_generation') {
      if (n >= args.p_max) return { data: null, error: null }
      db.counts.set(key, n + 1)
      return { data: n + 1, error: null }
    }
    if (name === 'release_tts_generation') { db.counts.set(key, Math.max(0, n - 1)); return { data: null, error: null } }
    return { data: null, error: { message: 'rpc desconhecida' } }
  }
  return db
}
const agora = Date.UTC(2026, 10, 18, 15)
const db = fakeDb()
const reservas = []
for (let i = 0; i < 3; i++) reservas.push(await claimTtsGeneration('u1', { db, nowMs: agora, max: 2 }))
check('reserva até o teto e recusa depois', reservas, [true, true, false])
check('a reserva vai pra RPC com a pessoa, o dia de Brasília e o teto', db.calls[0], ['claim_tts_generation', { p_user_id: 'u1', p_day: '2026-11-18', p_max: 2 }])
await releaseTtsGeneration('u1', { db, nowMs: agora })
check('geração que falhou devolve a reserva e libera mais uma', await claimTtsGeneration('u1', { db, nowMs: agora, max: 2 }), true)
check('outra pessoa tem o próprio dia', await claimTtsGeneration('u2', { db, nowMs: agora, max: 2 }), true)
check('no dia seguinte recomeça', await claimTtsGeneration('u1', { db, nowMs: agora + 86400000, max: 2 }), true)
check('banco fora do ar: deixa gerar (falha nossa não tira a voz de quem paga)', await claimTtsGeneration('u1', { db: fakeDb({ fail: true }), nowMs: agora }), true)

// ── O endpoint ──────────────────────────────────────────────────────────
const tts = ler('api/tts.js')
const pos = t => tts.indexOf(t)
check('ordem: Premium, cache, limite diário, geração', (([a, b, c, d]) => [a > 0, a < b, b < c, c < d])([pos('if (!ent.hasPremium)'), pos('findCachedAudio(cachePath)'), pos('claimTtsGeneration(userId)'), pos('generateSpeech({')]), [true, true, true, true])
check('no teto: 429 tts_daily_limit (o app cai pra voz do aparelho)', /if \(!\(await claimTtsGeneration\(userId\)\)\) \{\n\s*return res\.status\(429\)\.json\(\{ error: 'tts_daily_limit' \}\)/.test(tts), true)
check('geração que falhou devolve a reserva', pos('await releaseTtsGeneration(userId)') > pos("console.error('TTS generation failed:'"), true)
const maxChars = Number(tts.match(/const MAX_CHARS = (\d+)/)[1])
const batch = Number(ler('src/audio/premiumSpeech.js').match(/const BATCH_CHARS = (\d+)/)[1])
check('trecho máximo de 1.500 caracteres, com folga sobre o que o app manda', [maxChars, maxChars >= batch * 2], [1500, true])
check('a voz continua fora do limite mensal de IA', /ensureAiBudget|meterAi/.test(tts), false)

// ── A migração ──────────────────────────────────────────────────────────
const sql = ler('supabase/migrations/0081_limite_diario_voz.sql')
check('tabela com RLS e sem política; RPCs só para o service role', [
  /create table if not exists public\.tts_daily_usage/.test(sql),
  /alter table public\.tts_daily_usage enable row level security/.test(sql),
  /create policy/i.test(sql),
  /revoke all on function public\.claim_tts_generation[^;]*from public, anon, authenticated/.test(sql),
  /grant execute on function public\.claim_tts_generation[^;]*to service_role/.test(sql),
], [true, true, false, true, true])
check('a soma só acontece abaixo do teto (atômica)', /where public\.tts_daily_usage\.generated < p_max/.test(sql), true)

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes do limite diário da voz passaram.')
