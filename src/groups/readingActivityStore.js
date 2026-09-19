// "Quem está lendo" (handoff-admin-42, 42k) — só o moderador do grupo,
// nunca os membros (ver comentário da RPC em
// supabase/migrations/0066_group_admin_panel.sql). "Escrever para os N"
// (42k, cartão "Pararam esta semana") reaproveita notifications (0018) —
// mensagem individual de verdade, não um recado no mural, sem precisar de
// um sistema de conversa 1:1 novo só pra isto.
import { supabase } from '../lib/supabaseClient'

// dias_since_last_read: null (nunca leu nada) conta como "parou".
export function classifyReadingActivity(daysSinceLastRead) {
  if (daysSinceLastRead === null || daysSinceLastRead >= 7) return 'stopped'
  if (daysSinceLastRead <= 1) return 'onTrack'
  return 'behind'
}

export async function getGroupReadingActivity(groupId) {
  const { data, error } = await supabase.rpc('get_group_reading_activity', { target_group_id: groupId })
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => ({
    userId: row.member_user_id,
    name: row.member_name,
    role: row.member_role,
    isMe: row.is_me,
    daysActiveLast7: row.days_active_last_7 ?? [],
    daysSinceLastRead: row.days_since_last_read,
    planDayCount: row.plan_day_count,
    status: classifyReadingActivity(row.days_since_last_read),
  }))
}

export async function sendGroupEncouragement(groupId, userIds, message) {
  const { error } = await supabase.rpc('send_group_encouragement', {
    target_group_id: groupId, target_user_ids: userIds, p_message: message,
  })
  if (error) throw new Error(error.message)
}
