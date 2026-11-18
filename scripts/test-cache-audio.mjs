// Testes do cache do áudio da voz natural no servidor (pedido dela,
// 2026-11-18): cada trecho é gerado uma vez e servido a todos os
// assinantes. A voz fica fora do limite mensal de IA da pessoa.
// node scripts/test-cache-audio.mjs
import { readFileSync } from 'node:fs'
import { ttsCachePath, findCachedAudio, storeAudio, TTS_BUCKET, SIGNED_URL_SECONDS } from '../api/_lib/ttsCache.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')

// ── A chave ─────────────────────────────────────────────────────────────
const base = { model: 'openai/gpt-4o-mini-tts', voice: 'sage', lang: 'pt', instructions: 'Leia com calma.', text: 'No princípio, Deus criou os céus e a terra.' }
const p = ttsCachePath(base)
check('caminho: idioma/sha256.mp3', /^pt\/[0-9a-f]{64}\.mp3$/.test(p), true)
check('o mesmo trecho dá sempre o mesmo arquivo (é o que permite servir a todos)', ttsCachePath({ ...base }), p)
check('qualquer coisa que muda o áudio muda o arquivo', [
  ttsCachePath({ ...base, text: base.text + ' ' }) !== p,
  ttsCachePath({ ...base, voice: 'alloy' }) !== p,
  ttsCachePath({ ...base, model: 'outro/modelo' }) !== p,
  ttsCachePath({ ...base, instructions: 'Leia rápido.' }) !== p,
  ttsCachePath({ ...base, lang: 'en' }).startsWith('en/'),
], [true, true, true, true, true])
check('idioma desconhecido vira pt', ttsCachePath({ ...base, lang: 'xx' }), p)
check('o nome do arquivo não revela o texto', p.includes('princ') || p.includes('Deus'), false)
check('separador entre campos: "a"+"bc" não colide com "ab"+"c"', ttsCachePath({ ...base, voice: 'a', instructions: 'bc' }) !== ttsCachePath({ ...base, voice: 'ab', instructions: 'c' }), true)

// ── Buscar e guardar ────────────────────────────────────────────────────
function fakeBucket({ has = new Set(), failUpload = false } = {}) {
  const b = { has, uploads: [] }
  b.createSignedUrl = async (path, secs) => (has.has(path) ? { data: { signedUrl: `https://x.supabase.co/sign/${path}?exp=${secs}` }, error: null } : { data: null, error: { message: 'Object not found' } })
  b.upload = async (path, bytes, opts) => { b.uploads.push([path, bytes.length, opts]); if (failUpload) return { data: null, error: { message: 'cota' } }; has.add(path); return { data: { path }, error: null } }
  return b
}
const bucket = fakeBucket()
check('ainda não guardado: null (e aí gera)', await findCachedAudio(p, { bucket }), null)
check('guarda o áudio gerado como mp3, sobrescrevendo se outro gerou junto', [await storeAudio(p, Buffer.from('mp3'), 'audio/mpeg', { bucket }), bucket.uploads[0][2]], [true, { contentType: 'audio/mpeg', upsert: true, cacheControl: '31536000' }])
check('depois de guardado: link assinado, válido por uma hora', await findCachedAudio(p, { bucket }), `https://x.supabase.co/sign/${p}?exp=3600`)
check('falha ao guardar não derruba nada (só avisa)', await storeAudio(p, Buffer.from('mp3'), 'audio/mpeg', { bucket: fakeBucket({ failUpload: true }) }), false)
check('bucket e validade do link', [TTS_BUCKET, SIGNED_URL_SECONDS], ['tts-audio', 3600])

// ── O endpoint ──────────────────────────────────────────────────────────
const tts = ler('api/tts.js')
const pos = t => tts.indexOf(t)
check('já guardado: devolve o link sem gerar', [pos('findCachedAudio(cachePath)') < pos('generateSpeech({'), /if \(cachedUrl\) \{\n[^}]*return res\.status\(200\)\.json\(\{ url: cachedUrl \}\)/.test(tts)], [true, true])
check('o Premium vem antes do cache (a voz natural é do Premium)', pos('if (!ent.hasPremium)') < pos('findCachedAudio(cachePath)'), true)
check('gerado agora: guarda antes de responder', pos('await storeAudio(cachePath, bytes') > pos('generateSpeech({') && pos('await storeAudio(cachePath, bytes') < pos('res.status(200).send(bytes)'), true)
check('a chave usa as mesmas instruções que vão pro modelo', [/const instructions = INSTRUCTIONS\[cleanLang\]/.test(tts), /ttsCachePath\(\{ model: MODEL, voice: VOICE, lang: cleanLang, instructions, text: clean \}\)/.test(tts), /instructions,\n/.test(tts)], [true, true, true])

// ── O app ───────────────────────────────────────────────────────────────
const fala = ler('src/audio/premiumSpeech.js')
check('app: resposta com link baixa o áudio do Storage e guarda no aparelho', [/includes\('application\/json'\)/.test(fala), /audioRes = await fetch\(url\)/.test(fala), /cache\.put\(key, audioRes\.clone\(\)\)/.test(fala)], [true, true, true])

// ── A migração ──────────────────────────────────────────────────────────
const sql = ler('supabase/migrations/0080_cache_audio.sql')
check('bucket privado, só mp3, até 5 MB', [/values \('tts-audio', 'tts-audio', false, 5242880, array\['audio\/mpeg'\]\)/.test(sql), /create policy/i.test(sql)], [true, false])

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes do cache de áudio passaram.')
