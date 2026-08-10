// Portabilidade e acesso — art. 18, II e V da LGPD. Devolve tudo que o app
// guarda sobre quem chama, num JSON legível por máquina e por gente.
//
// Lê com o client escopado ao chamador (RLS aplicada), não com service role:
// se uma policy estiver errada, o export falha em vez de vazar dado alheio.
// A única exceção é auth.users, que vem do próprio token.
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

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

  const grab = async (table, col = 'user_id') => {
    const { data, error } = await supabase.from(table).select('*').eq(col, uid)
    if (error) {
      console.error(`export-my-data: ${table}`, error)
      return { erro: 'não foi possível ler esta tabela' }
    }
    return data
  }

  const [
    perfil, dados, assinatura, consentimentos,
    comentarios, pedidosOracao, comentariosOracao,
    membroDeGrupos, progressoDesafios, notificacoes,
  ] = await Promise.all([
    grab('profiles'), grab('user_data'), grab('subscriptions'), grab('consents'),
    grab('group_comments'), grab('group_prayer_requests'), grab('group_prayer_comments'),
    grab('reading_group_members'), grab('reading_challenge_progress'), grab('notifications'),
  ])

  const { data: amizades } = await supabase
    .from('friendships').select('*')
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)

  const payload = {
    _sobre: {
      descricao: "Todos os dados pessoais que o Jesus' Corner guarda sobre você.",
      base_legal: 'Exportação fornecida em atendimento ao art. 18, II e V da LGPD.',
      gerado_em: new Date().toISOString(),
      duvidas: 'Fale com a gente pela tela de Contato no app.',
    },
    conta: {
      id: user.id,
      email: user.email,
      criada_em: user.created_at,
      ultimo_login: user.last_sign_in_at,
      email_confirmado_em: user.email_confirmed_at,
      metadados: user.user_metadata ?? {},
    },
    perfil,
    progresso_e_conteudo_privado: dados,
    assinatura,
    consentimentos,
    amizades: amizades ?? [],
    grupos: { participacoes: membroDeGrupos, progresso_em_desafios: progressoDesafios },
    conteudo_em_grupo: {
      comentarios,
      pedidos_de_oracao: pedidosOracao,
      comentarios_em_pedidos: comentariosOracao,
    },
    notificacoes,
  }

  const stamp = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="jesus-corner-meus-dados-${stamp}.json"`)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).send(JSON.stringify(payload, null, 2))
}
