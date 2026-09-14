// Reportar problema ao Master (handoff-admin-42, 42o) — canal direto do
// admin de grupo, sem esperar as 24h de escalação de denúncia
// (reportsStore.js). Ver migration 0067_group_challenges_and_reports.sql.
import { supabase } from '../lib/supabaseClient'

export async function createAdminReport({ groupId, category, body, attachedUserId, attachedMessageIds }) {
  const { data, error } = await supabase.rpc('create_admin_report', {
    target_group_id: groupId,
    p_category: category,
    p_body: body,
    p_attached_user_id: attachedUserId ?? null,
    p_attached_message_ids: attachedMessageIds ?? [],
  })
  if (error) throw new Error(error.message)
  return data
}
