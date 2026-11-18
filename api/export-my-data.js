// Acesso e portabilidade — art. 18, I, II e V e art. 19 da LGPD. Devolve
// tudo o que o app guarda sobre quem chama, num JSON legível por máquina e
// por gente.
//
// Revisão de LGPD (2026-11-18): antes cobria 10 tabelas e dizia "todos os
// dados". Agora lê cada tabela que guarda algo da pessoa (o inventário é
// EXPORT_SOURCES, conferido por scripts/test-exportacao.mjs contra as
// migrações). Lê com o service role porque várias tabelas não têm política
// de leitura para o próprio dono (contadores de uso, denúncias, registro de
// moderação) — por isso CADA consulta filtra explicitamente pelo id (ou
// e-mail) de quem chama, e só traz as colunas que são da pessoa: nada de
// texto de outra pessoa, nem segredos técnicos (chaves do push).
import { createClient } from '@supabase/supabase-js'
import { fetchAllPaged } from './_lib/paged.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// [seção, chave, tabela, colunas, coluna do id da pessoa, ordem]
export const EXPORT_SOURCES = [
  ['perfil', 'perfil', 'profiles', 'name, bio, avatar_url, is_public, username, has_seen_tour', 'user_id', ['user_id']],
  ['conteudo_privado', 'progresso_anotacoes_e_preferencias', 'user_data', '*', 'user_id', ['user_id']],
  ['conteudo_privado', 'capitulos_lidos', 'chapters_read', 'livro, capitulo, origem, created_at', 'user_id', ['id']],
  ['conteudo_privado', 'tempo_por_passo', 'session_seconds', 'data, passo, segundos, livro, created_at', 'user_id', ['id']],
  ['conteudo_privado', 'perguntas_sobre_o_texto', 'text_ai_chats', 'passage_key, role, content, created_at', 'user_id', ['id']],
  ['conteudo_privado', 'respostas_que_voce_denunciou', 'ai_answer_reports', 'passage_key, lang, question, answer, reason, status, created_at', 'user_id', ['id']],
  ['assinatura_e_uso', 'assinatura', 'subscriptions', '*', 'user_id', ['user_id']],
  ['assinatura_e_uso', 'uso_mensal_da_escrita_assistida', 'ai_usage_monthly', 'month, calls, input_tokens, output_tokens, cost_micros', 'user_id', ['month']],
  ['assinatura_e_uso', 'trechos_de_voz_gerados_por_dia', 'tts_daily_usage', 'day, generated', 'user_id', ['day']],
  ['assinatura_e_uso', 'acessos_cortesia', 'access_grants', 'kind, reason, expires_at, revoked_at, created_at', 'user_id', ['created_at']],
  ['comunidade', 'amizades_que_voce_pediu', 'friendships', '*', 'requester_id', ['created_at']],
  ['comunidade', 'amizades_que_pediram_a_voce', 'friendships', '*', 'addressee_id', ['created_at']],
  ['comunidade', 'atividade_mostrada_aos_amigos', 'friend_activity', 'type, payload, created_at', 'user_id', ['id']],
  ['comunidade', 'participacao_em_grupos', 'reading_group_members', 'group_id, status, role, joined_at, created_at, muted, silenced_until', 'user_id', ['group_id']],
  ['comunidade', 'grupos_que_voce_criou', 'reading_groups', 'id, name, created_at', 'created_by', ['id']],
  ['comunidade', 'ultima_leitura_das_mensagens', 'message_reads', 'group_id, last_read_at', 'user_id', ['group_id']],
  ['comunidade', 'recados_no_grupo', 'group_comments', 'group_id, body, anonymous, pinned, created_at', 'user_id', ['id']],
  ['comunidade', 'curtidas_em_recados', 'group_comment_likes', '*', 'user_id', ['created_at']],
  ['comunidade', 'pedidos_de_oracao', 'group_prayer_requests', 'id, scope, group_id, body, anonymous, status, resposta, nota_resposta, respondido_em, created_at', 'user_id', ['id']],
  ['comunidade', 'oracoes_pelos_pedidos_de_outros', 'group_prayer_intentions', 'prayer_request_id, prayed_date, created_at', 'user_id', ['created_at']],
  ['comunidade', 'comentarios_em_pedidos', 'group_prayer_comments', 'prayer_request_id, body, created_at', 'user_id', ['id']],
  ['comunidade', 'posts_na_sala_do_capitulo', 'group_chapter_posts', 'group_id, book, chapter, body, quote_text, quote_ref, anonymous, created_at', 'user_id', ['id']],
  ['comunidade', 'perguntas_na_sala_do_capitulo', 'group_chapter_questions', 'group_id, book, chapter, body, created_at', 'author_id', ['id']],
  ['comunidade', 'amens', 'group_post_amens', '*', 'user_id', ['created_at']],
  ['comunidade', 'desafios_de_leitura_que_voce_criou', 'reading_challenges', 'id, group_id, name, books, starts_at, ends_at, created_at', 'created_by', ['id']],
  ['comunidade', 'progresso_em_desafios_de_leitura', 'reading_challenge_progress', '*', 'user_id', ['challenge_id']],
  ['comunidade', 'planos_de_grupo_que_voce_criou', 'group_reading_plans', 'id, group_id, title, book, starts_at, created_at', 'created_by', ['id']],
  ['comunidade', 'participacao_em_planos_de_grupo', 'group_reading_plan_members', '*', 'user_id', ['plan_id']],
  ['comunidade', 'desafios_de_grupo_que_voce_criou', 'group_challenges', 'id, group_id, title, explanation, leader_text, starts_at, created_at', 'created_by', ['id']],
  ['comunidade', 'participacao_em_desafios_de_grupo', 'group_challenge_members', '*', 'user_id', ['challenge_id']],
  ['estudos', 'estudos_que_voce_escreveu', 'studies', 'id, title, overview, format, tags, passages, visibility, created_at', 'author_id', ['id']],
  ['estudos', 'estudos_que_voce_usou', 'study_uses', '*', 'user_id', ['study_id']],
  ['estudos', 'convites_para_estudos', 'study_invitees', '*', 'invitee_id', ['study_id']],
  ['estudos', 'estudos_que_voce_denunciou', 'study_reports', 'study_id, created_at', 'reporter_id', ['study_id']],
  ['moderacao', 'denuncias_que_voce_fez', 'group_message_reports', 'group_id, message_kind, reason, reason_detail, status, decision, created_at', 'reporter_id', ['id']],
  ['moderacao', 'denuncias_sobre_mensagens_suas', 'group_message_reports', 'group_id, message_kind, message_snapshot, reason, status, decision, decision_reason, decided_at, created_at', 'reported_user_id', ['id']],
  ['moderacao', 'acoes_de_moderacao_sobre_voce', 'moderation_actions', 'scope, group_id, action, reason, created_at', 'target_user_id', ['id']],
  ['moderacao', 'relatos_que_voce_mandou_a_equipe', 'admin_reports', 'group_id, category, body, status, created_at', 'created_by', ['id']],
  ['moderacao', 'bloqueio_da_conta', 'blocked_accounts', 'reason, blocked_at', 'user_id', ['user_id']],
  ['aparelho_e_privacidade', 'consentimentos', 'consents', 'purpose, granted, policy_version, ip, user_agent, created_at', 'user_id', ['created_at']],
  ['aparelho_e_privacidade', 'lembretes_por_notificacao', 'push_subscriptions', 'endpoint, timezone, reminder_hour, reminder_minute, reminder_days, created_at', 'user_id', ['id']],
  ['aparelho_e_privacidade', 'notificacoes_no_app', 'notifications', '*', 'user_id', ['created_at']],
  ['aparelho_e_privacidade', 'passos_do_cadastro', 'onboarding_events', 'step, language, created_at', 'user_id', ['id']],
]

// Fontes achadas pelo e-mail (sem vínculo de id).
const escapeLike = s => s.replace(/[\\%_]/g, c => `\\${c}`)

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })

  const user = userData.user
  const uid = user.id
  const email = (user.email ?? '').trim()

  const failed = []
  const sections = {}
  await Promise.all(EXPORT_SOURCES.map(async ([section, key, table, columns, idColumn, order]) => {
    const { data, error } = await fetchAllPaged(supabaseAdmin, table, columns, { apply: q => q.eq(idColumn, uid), order })
    sections[section] ??= {}
    if (error) {
      console.error(`export-my-data: ${table}:`, error.message)
      failed.push(key)
      sections[section][key] = { erro: 'não foi possível ler agora' }
    } else {
      sections[section][key] = data
    }
  }))

  // Mensagens de contato e convites mandados pro e-mail da pessoa.
  if (email) {
    const [contato, convites] = await Promise.all([
      supabaseAdmin.from('contact_messages').select('name, email, message, source, created_at, replied_at, admin_reply').ilike('email', escapeLike(email)),
      supabaseAdmin.from('admin_invites').select('kind, discount_percent, status, created_at, claimed_at').ilike('email', escapeLike(email)),
    ])
    sections.contato = { mensagens_de_contato: contato.error ? { erro: 'não foi possível ler agora' } : contato.data }
    sections.assinatura_e_uso.convites_recebidos = convites.error ? { erro: 'não foi possível ler agora' } : convites.data
    if (contato.error) failed.push('mensagens_de_contato')
    if (convites.error) failed.push('convites_recebidos')
  }

  // A foto de perfil: um link temporário (24 h) pro arquivo em si.
  let foto = null
  try {
    const { data: files } = await supabaseAdmin.storage.from('avatars').list(uid)
    if (files?.length) {
      const { data } = await supabaseAdmin.storage.from('avatars').createSignedUrls(files.map(f => `${uid}/${f.name}`), 86400)
      foto = (data ?? []).map(d => d.signedUrl).filter(Boolean)
    }
  } catch (err) {
    console.error('export-my-data: avatar:', err?.message ?? err)
    failed.push('foto')
  }

  const payload = {
    _sobre: {
      descricao: "Todos os dados pessoais que o Jesus' Corner guarda sobre você, um bloco por assunto.",
      base_legal: 'Exportação fornecida em atendimento ao art. 18, I, II e V e ao art. 19 da LGPD.',
      gerado_em: new Date().toISOString(),
      fica_de_fora: 'O que outras pessoas escreveram (mesmo nos seus grupos) é delas e não entra aqui. Dados de pagamento ficam no Stripe ou na loja (Google/Apple), não com a gente.',
      ...(failed.length ? { atencao: `Não deu para ler agora: ${failed.join(', ')}. Tente exportar de novo em alguns minutos.` } : {}),
      duvidas: 'Fale com a Encarregada: info@jesuscorner.app',
    },
    conta: {
      id: user.id,
      email: user.email,
      criada_em: user.created_at,
      ultimo_login: user.last_sign_in_at,
      email_confirmado_em: user.email_confirmed_at,
      entrou_com: user.app_metadata?.providers ?? [user.app_metadata?.provider].filter(Boolean),
      metadados: user.user_metadata ?? {},
      foto_de_perfil_link_temporario: foto,
    },
    ...sections,
  }

  const stamp = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="jesus-corner-meus-dados-${stamp}.json"`)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).send(JSON.stringify(payload, null, 2))
}
