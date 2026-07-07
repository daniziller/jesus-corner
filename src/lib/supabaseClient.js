// Cliente Supabase — backend real do app (autenticação + dados por usuário).
// As chaves vêm de variáveis de ambiente (ver .env.example); a "anon key" é
// pública por natureza (protegida pelas políticas de RLS no banco, não por
// sigilo), então é seguro ela ir pro bundle do frontend.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env (veja .env.example).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
