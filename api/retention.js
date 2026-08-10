// Descarte automático — art. 15 e 16 da LGPD: os dados devem ser eliminados
// quando a finalidade se esgota. Sem isso, `onboarding_events`,
// `contact_messages` e `friend_activity` cresceriam para sempre, guardando
// dado pessoal muito depois de ele servir para alguma coisa.
//
// Cron diário (ver vercel.json). Só o Vercel Cron deve conseguir chamar: ele
// manda `Authorization: Bearer $CRON_SECRET` automaticamente — mesmo padrão
// de api/send-contribution-reminders.js.
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Prazos por finalidade. Cada um precisa de justificativa — "guardar por via
// das dúvidas" não é finalidade e não sustenta retenção.
const POLICIES = [
  {
    table: 'onboarding_events',
    days: 365,
    // Serve para medir funil de conversão. Comparação ano a ano é o horizonte
    // útil; além disso vira só histórico.
    reason: 'métrica de funil — 12 meses',
  },
  {
    table: 'contact_messages',
    days: 730,
    // Nome, email e mensagem livre. Dois anos cobre o histórico de suporte e
    // eventual disputa sobre atendimento.
    reason: 'histórico de atendimento — 24 meses',
  },
  {
    table: 'friend_activity',
    days: 365,
    // Feed social: só o recente tem valor. Um ano é generoso.
    reason: 'feed de atividade — 12 meses',
  },
]

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const results = []

  for (const { table, days, reason } of POLICIES) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    try {
      const { data, error } = await supabaseAdmin
        .from(table)
        .delete()
        .lt('created_at', cutoff)
        .select('id')
      if (error) throw error
      results.push({ table, reason, cutoff, deleted: data?.length ?? 0 })
    } catch (err) {
      console.error(`retention: falha ao limpar ${table}`, err)
      results.push({ table, reason, cutoff, error: err.message })
    }
  }

  // Lápides de contas excluídas que não são mais referenciadas por nada.
  // Enquanto houver comentário ou pedido de oração apontando para a linha,
  // ela precisa existir para a conversa dos outros não quebrar. Quando não
  // sobra nenhuma referência, a lápide perde a razão de ser.
  try {
    const { data: tombstones } = await supabaseAdmin
      .from('profiles').select('user_id').not('deleted_at', 'is', null)

    let removed = 0
    for (const { user_id } of tombstones ?? []) {
      const counts = await Promise.all(
        ['group_comments', 'group_prayer_requests', 'group_prayer_comments', 'reading_groups']
          .map(t => supabaseAdmin
            .from(t)
            .select('*', { count: 'exact', head: true })
            .eq(t === 'reading_groups' ? 'created_by' : 'user_id', user_id)),
      )
      const stillReferenced = counts.some(c => (c.count ?? 0) > 0)
      if (!stillReferenced) {
        await supabaseAdmin.from('profiles').delete().eq('user_id', user_id)
        removed++
      }
    }
    results.push({ table: 'profiles (lápides órfãs)', deleted: removed })
  } catch (err) {
    console.error('retention: falha ao limpar lápides', err)
    results.push({ table: 'profiles (lápides órfãs)', error: err.message })
  }

  console.log('retention:', JSON.stringify(results))
  return res.status(200).json({ ok: true, results })
}
