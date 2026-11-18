// Visibilidade e minimização (revisão de LGPD, 2026-11-18, segunda
// entrega): moderador só vê a leitura do plano do grupo; adicionar amigo
// por e-mail não revela quem tem conta; logs sem dado pessoal; eventos do
// cadastro só ligados à conta com o token dela; prazo de 15 dias.
// node scripts/test-visibilidade-lgpd.mjs
import { readFileSync, readdirSync } from 'node:fs'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')

const mod = ler('supabase/migrations/0087_moderador_ve_so_o_plano_do_grupo.sql')
check('moderador: só capítulos do livro do plano, desde o início do plano', [/and cr\.livro = plan_book/.test(mod), /where plan_book is not null/.test(mod)], [true, true])
check('moderador: nenhuma leitura fora do recorte do plano', /from public\.chapters_read cr\s+where cr\.user_id = m\.user_id/.test(mod), false)

const amizade = ler('supabase/migrations/0086_amizade_por_email_sem_enumeracao.sql')
check('procura por e-mail só no servidor; o app perde find_user_by_email', [/grant execute on function public\.request_friend_by_email\(uuid, text, integer\) to service_role/.test(amizade), /revoke all on function public\.find_user_by_email\(text\) from public, anon, authenticated/.test(amizade)], [true, true])
check('teto de 20 tentativas por dia', /p_max integer default 20/.test(amizade) && /interval '1 day'\) >= p_max/.test(amizade), true)
const invite = ler('api/invite-friend.js')
check('tem conta ou não, a resposta é a mesma', [/if \(outcome !== 'not_found'\) return json\(\{ status: 'ok' \}\)/.test(invite), /return json\(\{ status: 'ok' \}\)\n\}\s*$/.test(invite)], [true, true])
check('falha do e-mail de convite não vira erro (contaria que não há conta)', /email_service_not_configured|error: 'send_failed'/.test(invite), false)
const store = ler('src/friends/friendsStore.js')
check('o app não procura mais e-mail', /rpc\('find_user_by_email'/.test(store), false)

const onboarding = ler('api/track-onboarding-event.js')
check('evento do cadastro só fica ligado à conta com o token dela', [/if \(data\?\.user\?\.id === userId\) verifiedUserId = userId/.test(onboarding), /user_id: verifiedUserId/.test(onboarding)], [true, true])

const logsCrus = readdirSync(new URL('../api/', import.meta.url), { recursive: true })
  .filter(f => f.endsWith('.js'))
  .filter(f => /console\.(error|warn|log)\('[^']*'\s*,\s*(err|error|e)\)/.test(ler(`api/${f}`)))
check('nenhum log imprime o objeto de erro inteiro (pode trazer e-mail, corpo da requisição)', logsCrus, [])
check('Resend: só o status no log', [ler('api/_lib/resend.js'), ler('api/auth-email-hook.js'), invite].some(s => /await (res|emailRes)\.text\(\)/.test(s)), false)

const tr = ler('src/i18n/translations.js')
check('prazo de resposta aos pedidos de direitos: 15 dias (art. 19)', [/Respondemos em até 15 dias/.test(tr), /Respondemos em até 30 dias/.test(tr)], [true, false])

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes de visibilidade passaram.')
