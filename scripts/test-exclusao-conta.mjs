// Testes da exclusão de conta completa (revisão de LGPD, 2026-11-18):
// pedidos privados, username e conteúdo em grupo não ficam mais para trás,
// e a equipe consegue excluir a pedido por e-mail.
// node scripts/test-exclusao-conta.mjs
import { readFileSync } from 'node:fs'
import { eraseAccount } from '../api/_lib/eraseAccount.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')

// ── A ordem e as paradas ────────────────────────────────────────────────
function fakeDb({ sub = null, rpcError = null, deleteError = null, files = [] } = {}) {
  const log = []
  return {
    log,
    from: table => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { log.push(`select:${table}`); return { data: sub, error: null } } }) }) }),
    rpc: async (name, args) => { log.push(`rpc:${name}:${args.p_user_id}:${args.p_email}`); return { data: {}, error: rpcError } },
    storage: { from: () => ({ list: async () => ({ data: files }), remove: async paths => { log.push(`remove:${paths.join(',')}`); return { error: null } } }) },
    auth: { admin: { deleteUser: async id => { log.push(`deleteUser:${id}`); return { error: deleteError } } } },
  }
}
const fakeStripe = (err = null) => { const s = { canceled: [] }; s.subscriptions = { cancel: async id => { if (err) throw err; s.canceled.push(id) } }; return s }
const silencio = console.error
console.error = () => {}

{
  const db = fakeDb({ sub: { stripe_subscription_id: 'sub_1', status: 'active' }, files: [{ name: 'a.jpg' }] })
  const stripe = fakeStripe()
  const r = await eraseAccount({ userId: 'u1', email: 'A@x.com', db, stripe })
  check('ordem: assinatura, conteúdo, foto, usuário', [r.ok, stripe.canceled, db.log], [true, ['sub_1'], ['select:subscriptions', 'rpc:erase_user_content:u1:A@x.com', 'remove:u1/a.jpg', 'deleteUser:u1']])
}
{
  const db = fakeDb({ sub: { stripe_subscription_id: 'sub_1', status: 'active' } })
  const r = await eraseAccount({ userId: 'u1', email: 'a@x.com', db, stripe: fakeStripe(new Error('stripe fora')) })
  check('Stripe falhou: para antes de apagar qualquer coisa (senão continua cobrando)', [r.ok, db.log.some(l => l.startsWith('rpc') || l.startsWith('deleteUser'))], [false, false])
}
{
  const db = fakeDb({ sub: { stripe_subscription_id: 'sub_1', status: 'active' } })
  const err = Object.assign(new Error('No such subscription'), { code: 'resource_missing' })
  const r = await eraseAccount({ userId: 'u1', email: 'a@x.com', db, stripe: fakeStripe(err) })
  check('assinatura que já não existe no Stripe não trava a exclusão', r.ok, true)
}
{
  const db = fakeDb({ rpcError: { message: 'deadlock' } })
  const r = await eraseAccount({ userId: 'u1', email: 'a@x.com', db, stripe: fakeStripe() })
  check('limpeza do conteúdo falhou: não apaga o usuário (dá pra tentar de novo)', [r.ok, db.log.some(l => l.startsWith('deleteUser'))], [false, false])
}
{
  const db = fakeDb({ deleteError: { message: 'x' } })
  check('usuário do auth não apagado: falha', (await eraseAccount({ userId: 'u1', email: 'a@x.com', db, stripe: fakeStripe() })).ok, false)
}
{
  const r = await eraseAccount({ userId: 'u1', email: 'a@x.com', db: fakeDb({ sub: { billing_provider: 'google_play' } }), stripe: fakeStripe() })
  check('assinatura da loja: avisa (só a pessoa cancela na loja)', r.storeSubscription, true)
}
console.error = silencio

// ── A função do banco ───────────────────────────────────────────────────
const sql = ler('supabase/migrations/0082_exclusao_completa.sql')
check('pedidos privados apagados; os do grupo ficam sem nome', [
  /delete from public\.group_prayer_requests where user_id = p_user_id and scope <> 'group'/.test(sql),
  /update public\.group_prayer_requests set anonymous = true where user_id = p_user_id and scope = 'group'/.test(sql),
], [true, true])
check('username, nome, bio e foto limpos no perfil', /set name = 'Conta removida', bio = '', avatar_url = null, username = null/.test(sql), true)
check('posts e recados do grupo ficam sem nome', [/update public\.group_chapter_posts set anonymous = true/.test(sql), /update public\.group_comments set anonymous = true/.test(sql)], [true, true])
const apagadas = ['group_prayer_comments', 'group_chapter_questions', 'group_comment_likes', 'group_post_amens', 'group_prayer_intentions', 'message_reads', 'group_reading_plan_members', 'group_challenge_members', 'reading_challenge_progress', 'study_uses', 'study_invitees', 'study_reports', 'friend_activity', 'friendships', 'reading_group_members', 'access_grants', 'user_data']
check('vínculos só da pessoa apagados', apagadas.filter(t => !new RegExp(`delete from public\\.${t} where`).test(sql)), [])
check('mensagens de contato achadas sem diferença de maiúsculas', /delete from public\.contact_messages where lower\(trim\(email\)\) = v_email/.test(sql), true)
check('grupo sem mais ninguém é apagado; com gente, passa adiante', [/delete from public\.reading_groups where id = v_group\.id/.test(sql), /update public\.reading_groups set created_by = v_heir/.test(sql)], [true, true])
check('só o service role executa', [/revoke all on function public\.erase_user_content\(uuid, text\) from public, anon, authenticated/.test(sql), /grant execute on function public\.erase_user_content\(uuid, text\) to service_role/.test(sql)], [true, true])

// ── Os dois caminhos usam a mesma exclusão ──────────────────────────────
const app = ler('api/delete-account.js')
const admin = ler('api/admin/person.js')
check('app e equipe usam eraseAccount', [/eraseAccount\(\{ userId, email, db: supabaseAdmin, stripe \}\)/.test(app), /eraseAccount\(\{ userId, email, db: supabaseAdmin, stripe \}\)/.test(admin)], [true, true])
check('a equipe também confirma digitando o e-mail da conta', /confirmation_mismatch/.test(admin) && /op === 'delete_account'/.test(admin), true)
check('a tabela que não existe mais saiu da lista', /group_prayer_comment_likes/.test(app + ler('api/_lib/eraseAccount.js')), false)

// ── A limpeza de lápides não apaga conteúdo dos outros ──────────────────
// retention.js cria o cliente do Supabase ao carregar: precisa de uma URL.
process.env.VITE_SUPABASE_URL ||= 'https://teste.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'teste'
const { TOMBSTONE_REFERENCES } = await import('../api/retention.js')
const refs = TOMBSTONE_REFERENCES.map(([t, c]) => `${t}.${c}`)
const precisam = ['group_chapter_posts.user_id', 'group_reading_plans.created_by', 'group_challenges.created_by', 'group_comments.user_id', 'group_prayer_requests.user_id', 'reading_groups.created_by', 'moderation_actions.target_user_id']
check('lápide só sai quando nada mais aponta pra ela (inclui posts e planos do grupo)', precisam.filter(r => !refs.includes(r)), [])

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes da exclusão de conta passaram.')
