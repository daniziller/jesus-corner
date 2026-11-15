// Cabeçalho com o token da sessão, pros endpoints de IA que exigem conta
// (ver api/_lib/caller.js). Sem sessão devolve {} — o servidor responde
// 401 e quem chama já trata falha como "segue sem o conteúdo gerado".
import { supabase } from './supabaseClient'

export async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
