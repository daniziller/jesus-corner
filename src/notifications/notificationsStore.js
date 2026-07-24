// Notificações persistentes geradas pelo backend (hoje só o lembrete de
// contribuição — ver api/send-contribution-reminders.js). RLS permite
// só ler/marcar como lida a própria linha (ver
// supabase/migrations/0018_notifications.sql); criar é só a service role.
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

export async function getUnreadNotifications() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, created_at')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
  if (error) { console.error('[notificationsStore] getUnreadNotifications failed:', error.message); return [] }
  return data ?? []
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) console.error('[notificationsStore] markNotificationRead failed:', error.message)
}
