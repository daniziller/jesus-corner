// A exportação de dados (art. 18 II e V da LGPD) cobre toda tabela que
// guarda algo da pessoa — revisão de LGPD, 2026-11-18. Antes eram 10
// tabelas e o arquivo dizia "todos os dados".
// node scripts/test-exportacao.mjs
import { readFileSync, readdirSync } from 'node:fs'
process.env.VITE_SUPABASE_URL ||= 'https://teste.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'teste'
const { EXPORT_SOURCES } = await import('../api/export-my-data.js')

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}

// Toda tabela que as migrações ligam a uma pessoa (auth.users ou profiles).
const dir = new URL('../supabase/migrations/', import.meta.url)
const ligadas = new Set()
for (const f of readdirSync(dir).filter(f => f.endsWith('.sql'))) {
  const sql = readFileSync(new URL(f, dir), 'utf8')
  for (const m of sql.matchAll(/create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
    if (/references (?:public\.profiles|auth\.users)\s*\(/.test(m[2])) ligadas.add(m[1])
  }
}
// O que não entra, e por quê.
const FORA = {
  admin_invites: 'exportado à parte, pelo e-mail (convites_recebidos)',
  admin_broadcast_log: 'registro do que a equipe mandou; não é dado da pessoa',
  contact_messages: 'exportado à parte, pelo e-mail',
  group_prayer_comment_likes: 'tabela que não existe mais (0052)',
}
const exportadas = new Set(EXPORT_SOURCES.map(s => s[2]))
check('toda tabela ligada a uma pessoa entra na exportação (ou tem motivo pra ficar de fora)', [...ligadas].filter(t => !exportadas.has(t) && !FORA[t]).sort(), [])
check('pelo menos 40 fontes (antes eram 10)', EXPORT_SOURCES.length >= 40, true)
check('cada fonte filtra por uma coluna de id da pessoa', EXPORT_SOURCES.filter(s => !['user_id', 'requester_id', 'addressee_id', 'created_by', 'author_id', 'invitee_id', 'reporter_id', 'reported_user_id', 'target_user_id'].includes(s[4])).map(s => s[2]), [])
const push = EXPORT_SOURCES.find(s => s[2] === 'push_subscriptions')
check('push: sem as chaves técnicas do aparelho', /p256dh|auth\b/.test(push[3]), false)
const feitas = EXPORT_SOURCES.find(s => s[1] === 'denuncias_que_voce_fez')
check('denúncias que a pessoa fez: sem o texto de quem foi denunciado', /message_snapshot/.test(feitas[3]), false)
const sobre = EXPORT_SOURCES.find(s => s[1] === 'denuncias_sobre_mensagens_suas')
check('denúncias sobre ela: sem quem denunciou', /reporter_id/.test(sobre[3]), false)
const mod = EXPORT_SOURCES.find(s => s[2] === 'moderation_actions')
check('moderação sobre ela: sem quem moderou', /actor_id/.test(mod[3]), false)
const src = readFileSync(new URL('../api/export-my-data.js', import.meta.url), 'utf8')
check('cada consulta filtra pelo id de quem chama', /apply: q => q\.eq\(idColumn, uid\)/.test(src), true)
check('foto de perfil vai como link temporário', /createSignedUrls\(/.test(src), true)
check('e-mail na busca por contato: curingas escapados', /escapeLike\(email\)/.test(src), true)

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes da exportação passaram.')
