// Envia mensagens do formulário "Fale Conosco" pra tabela contact_messages
// (ver supabase/migrations/0014_contact_messages.sql) — só INSERT, ninguém
// lê essas mensagens de volta pelo app.
import { supabase } from '../lib/supabaseClient'

export async function submitContactMessage({ name, email, message }) {
  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, message, source: 'app' })
  if (error) throw error
}
