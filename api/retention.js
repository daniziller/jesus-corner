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
  {
    table: 'text_ai_chats',
    days: 60,
    // Chat sobre o texto bíblico (ver api/chat-about-text.js) — conversa
    // costuma ser pontual, ligada à leitura daquele dia; 60 dias dá tempo
    // de rever sem reter esse tipo de conteúdo (mais pessoal) indefinidamente.
    reason: 'chat sobre o texto — 60 dias',
  },
  {
    table: 'notifications',
    days: 90,
    // Alertas in-app (convite, curtida, lembrete etc.) — só têm valor
    // enquanto recentes; sem prazo, cresciam pra sempre pra quem usa o app
    // há muito tempo.
    reason: 'alertas in-app — 90 dias',
  },
  // ── Revisão de LGPD, 2026-11-18 (segunda entrega) ───────────────────
  {
    table: 'ai_answer_reports',
    days: 365,
    // Pergunta e resposta que a pessoa denunciou como erradas. Servem pra
    // revisar o assistente; um ano cobre a revisão e a comparação.
    reason: 'respostas denunciadas — 12 meses',
  },
  {
    table: 'group_message_reports',
    days: 365,
    column: 'decided_at',
    // Denúncia de mensagem em grupo, com cópia do texto. Só depois de
    // decidida: 12 meses pra eventual recurso ou reincidência.
    reason: 'denúncias decididas — 12 meses após a decisão',
  },
  {
    table: 'admin_reports',
    days: 365,
    // Relatos de moderadores à equipe — mesmo horizonte das denúncias.
    reason: 'relatos à equipe — 12 meses',
  },
  {
    table: 'moderation_actions',
    days: 730,
    // Registro do que a moderação fez (e de quem viu a conta de quem):
    // prestação de contas — 24 meses.
    reason: 'registro de moderação — 24 meses',
  },
  {
    table: 'master_alerts',
    days: 180,
    // Alertas internos do painel — só valem enquanto recentes.
    reason: 'alertas do painel — 6 meses',
  },
  {
    table: 'admin_invites',
    days: 180,
    apply: q => q.neq('status', 'pending'),
    // Convite de acesso grátis/desconto mandado pro e-mail de alguém. Depois
    // de usado ou revogado, 6 meses bastam pra conferir a cortesia.
    reason: 'convites usados ou revogados — 6 meses',
  },
  {
    table: 'tts_daily_usage',
    days: 30,
    column: 'day',
    dateOnly: true,
    // Contador diário de trechos de voz (limite do dia) — passado o dia,
    // só serve pra conferir abuso recente.
    reason: 'contador diário de voz — 30 dias',
  },
  {
    table: 'ai_usage_monthly',
    days: 400,
    column: 'month',
    monthOnly: true,
    // Gasto mensal com a escrita assistida — 13 meses pra comparar com o
    // mesmo mês do ano anterior.
    reason: 'uso mensal da escrita assistida — 13 meses',
  },
  {
    table: 'admin_access_log',
    days: 730,
    // Quem do time abriu o quê no painel (0085) — prestação de contas,
    // 24 meses, igual ao registro de moderação.
    reason: 'registro de acesso ao painel — 24 meses',
  },
  {
    table: 'consent_archive',
    days: 1826,
    column: 'archived_at',
    // Prova de consentimento de contas excluídas (0084) — 5 anos, prazo de
    // prescrição de reclamação de consumidor (CDC art. 27).
    reason: 'prova de consentimento de contas excluídas — 5 anos',
  },
]

// Referências que seguram a lápide (perfil "Conta removida") viva.
export const TOMBSTONE_REFERENCES = [
  ['group_comments', 'user_id'],
  ['group_chapter_posts', 'user_id'],
  ['group_prayer_requests', 'user_id'],
  ['reading_groups', 'created_by'],
  ['reading_challenges', 'created_by'],
  ['group_reading_plans', 'created_by'],
  ['group_challenges', 'created_by'],
  ['group_message_reports', 'reported_user_id'],
  ['group_message_reports', 'reporter_id'],
  ['group_message_reports', 'decided_by'],
  ['moderation_actions', 'target_user_id'],
  ['moderation_actions', 'actor_id'],
  ['admin_reports', 'created_by'],
  ['admin_reports', 'attached_user_id'],
  ['blocked_accounts', 'user_id'],
  ['blocked_accounts', 'blocked_by'],
  ['access_grants', 'granted_by'],
]

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  // Falha fechada sem o secret — este cron APAGA dados; não pode ficar
  // aberto por falta de configuração (varredura 2026-10-25).
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const results = []

  for (const { table, days, reason, column = 'created_at', apply, dateOnly, monthOnly } of POLICIES) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const cutoff = monthOnly ? cutoffDate.toISOString().slice(0, 7)
      : dateOnly ? cutoffDate.toISOString().slice(0, 10)
      : cutoffDate.toISOString()
    try {
      let q = supabaseAdmin.from(table).delete({ count: 'exact' }).lt(column, cutoff)
      if (apply) q = apply(q)
      const { count, error } = await q
      if (error) throw error
      results.push({ table, reason, cutoff, deleted: count ?? 0 })
    } catch (err) {
      console.error(`retention: falha ao limpar ${table}:`, err.message)
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
      try {
        // TODA tabela que aponta pra profiles com conteúdo de outras pessoas
        // ou registro que deve ficar: com ON DELETE CASCADE, apagar a lápide
        // levaria junto conversa e planos do grupo inteiro (ver 0082). Só
        // sai quando nenhuma delas aponta mais pra ela.
        const counts = await Promise.all(
          TOMBSTONE_REFERENCES.map(([t, col]) => supabaseAdmin
            .from(t)
            .select('*', { count: 'exact', head: true })
            .eq(col, user_id)),
        )
        const stillReferenced = counts.some(c => (c.count ?? 0) > 0)
        if (!stillReferenced) {
          // invited_by não tem ON DELETE (não é FK dela que deve decidir se a
          // lápide pode sumir) — zera antes, senão o delete abaixo falha com
          // violação de FK sempre que essa lápide já convidou alguém que
          // ainda está no grupo, e por estar no mesmo try teria travado o
          // laço inteiro no meio, parando a limpeza das lápides seguintes.
          await supabaseAdmin.from('reading_group_members').update({ invited_by: null }).eq('invited_by', user_id)
          await supabaseAdmin.from('profiles').delete().eq('user_id', user_id)
          removed++
        }
      } catch (err) {
        console.error('retention: falha ao limpar uma lápide:', err.message)
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
