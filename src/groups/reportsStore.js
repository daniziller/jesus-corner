// Denúncia de mensagem do mural do grupo (handoff-admin-42, Bloco 1: 42p +
// 42l) — ver supabase/migrations/0065_group_message_reports.sql pro schema
// e as duas RPCs (report_group_message/decide_group_message_report) que
// fazem todo o trabalho de permissão e efeito colateral; este arquivo só
// empacota as chamadas, igual aos outros stores de src/groups/.
import { supabase } from '../lib/supabaseClient'

// 42p — "Denunciar". messageKind é 'comment' (mural geral, group_comments —
// único produtor ligado neste bloco) ou 'chapter_post' (sala de capítulo,
// schema pronto, sem tela chamando ainda). messageSnapshot é o texto NA
// HORA da denúncia, pra sobreviver mesmo se a mensagem for apagada antes
// da decisão.
export async function reportGroupMessage({ groupId, messageKind, messageId, reportedUserId, messageSnapshot, reason, reasonDetail }) {
  const { data, error } = await supabase.rpc('report_group_message', {
    target_group_id: groupId,
    p_message_kind: messageKind,
    p_message_id: messageId,
    p_reported_user_id: reportedUserId,
    p_message_snapshot: messageSnapshot,
    p_reason: reason,
    p_reason_detail: reasonDetail ?? null,
  })
  if (error) throw new Error(error.message)
  return data
}

// Fila do admin do grupo (42l, "1 de N") — só as ainda pendentes (uma vez
// escalada pras 24h, deixa de ser problema deste admin e vira fila do
// Master em 42f/Bloco 4/5), mais antiga primeiro. Leve — só o que a lista
// e o cabeçalho "N de N" precisam; o cartão cheio vem de
// getGroupReportDetail.
export async function getPendingGroupReports(groupId) {
  const { data, error } = await supabase
    .from('group_message_reports')
    .select('id, created_at')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

// Cartão inteiro de 42l: a mensagem, quem denunciou (o admin PODE ver —
// só quem foi denunciado nunca vê, e nem tem acesso a esta tabela pra
// começo de conversa), e o histórico de "[Nome] neste grupo".
export async function getGroupReportDetail(reportId) {
  const { data: report, error } = await supabase
    .from('group_message_reports')
    .select(`
      id, group_id, message_kind, message_id, message_snapshot,
      reported_user_id, reporter_id, reason, reason_detail,
      status, created_at,
      reported:profiles!group_message_reports_reported_user_id_fkey(name),
      reporter:profiles!group_message_reports_reporter_id_fkey(name)
    `)
    .eq('id', reportId)
    .maybeSingle()
  if (error) { console.error('[reportsStore] getGroupReportDetail failed:', error.message); return null }
  if (!report) return null

  const [memberRow, commentCount, priorReportsCount] = await Promise.all([
    supabase.from('reading_group_members').select('joined_at').eq('group_id', report.group_id).eq('user_id', report.reported_user_id).maybeSingle(),
    supabase.from('group_comments').select('id', { count: 'exact', head: true }).eq('group_id', report.group_id).eq('user_id', report.reported_user_id),
    supabase.from('group_message_reports').select('id', { count: 'exact', head: true }).eq('group_id', report.group_id).eq('reported_user_id', report.reported_user_id).neq('id', reportId),
  ])

  return {
    id: report.id,
    groupId: report.group_id,
    messageKind: report.message_kind,
    messageId: report.message_id,
    messageSnapshot: report.message_snapshot,
    reportedUserId: report.reported_user_id,
    reportedUserName: report.reported?.name ?? '',
    reporterName: report.reporter?.name ?? '',
    reason: report.reason,
    reasonDetail: report.reason_detail,
    status: report.status,
    createdAt: report.created_at,
    memberSince: memberRow.data?.joined_at ?? null,
    messageCount: commentCount.count ?? 0,
    priorReportsCount: priorReportsCount.count ?? 0,
  }
}

// 42l, rodapé — as quatro ações. decision: 'deleted_message' |
// 'muted_user' | 'removed_member' | 'kept_message'. Motivo obrigatório
// pras três primeiras (a RPC recusa sem ele); "manter a mensagem" não
// precisa (mesma regra de "arquivar" em 42c).
export async function decideGroupReport(reportId, decision, decisionReason) {
  const { error } = await supabase.rpc('decide_group_message_report', {
    target_report_id: reportId,
    p_decision: decision,
    p_decision_reason: decisionReason ?? null,
  })
  if (error) throw new Error(error.message)
}
