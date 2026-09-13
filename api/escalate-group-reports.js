// Escalação automática das denúncias de mensagem do mural (handoff-admin-42,
// Regra 6.1: "sem decisão em 24h, escala sozinha: vira alerta em 42b e
// entra na fila de 42f com o selo 'Subiu do grupo'"). Cron (ver
// vercel.json) — só o Vercel Cron deve conseguir chamar: ele manda
// `Authorization: Bearer $CRON_SECRET` automaticamente, mesmo padrão de
// api/retention.js.
//
// Consumo de status='escalated' (badge de 42b, fila de 42f) é dos Blocos
// 4/5 — este cron só precisa existir agora pra o prazo realmente "gravar
// e escalar sozinho" desde o Bloco 1, sem reescrever nada depois.
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export default async function handler(req, res) {
  // Falha FECHADA se CRON_SECRET não estiver configurado — sem isso, um
  // ambiente onde a variável some (erro de deploy, etc.) deixaria este
  // endpoint aberto pra qualquer um chamar sem autenticação nenhuma
  // (achado por revisão de segurança automática nesta PR; api/retention.js
  // tem o mesmo padrão fail-open hoje, fora do escopo desta mudança).
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('escalate-group-reports: CRON_SECRET não configurado')
    return res.status(500).json({ error: 'server misconfigured' })
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('group_message_reports')
    .update({ status: 'escalated', escalated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id, group_id')

  if (error) {
    console.error('escalate-group-reports: falha ao escalar', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ escalated: data?.length ?? 0 })
}
