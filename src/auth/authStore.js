// Autenticação real via Supabase Auth. Nome e idioma ficam no user_metadata
// do próprio usuário (definidos no signUp, editáveis via updateUser) — o
// progresso do app (leitura, oração, notas etc.) mora à parte, na tabela
// user_data (ver src/backend/userDataStore.js).
import { supabase } from '../lib/supabaseClient'

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
export function isValidPassword(password) {
  return /^\d{6}$/.test(password)
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function mapUser(authUser) {
  if (!authUser) return null
  return {
    name: authUser.user_metadata?.name ?? '',
    email: authUser.email,
    language: authUser.user_metadata?.language ?? 'pt',
  }
}

// Cache síncrono do usuário logado, mantido em dia pelo próprio Supabase
// (evento disparado no login/logout/updateUser) — existe só pra permitir que
// currentLanguage() (i18n/index.js) leia o idioma da conta sem precisar virar
// assíncrona, já que t() é chamada em toda a UI sem poder esperar uma Promise.
let cachedUser = null
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUser = mapUser(session?.user ?? null)
})

export function getCachedUser() {
  return cachedUser
}

// Sessão atual (assíncrono — chame no bootstrap do app, não num useState
// initializer). Retorna null se ninguém estiver logado.
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) return null
  return mapUser(data.session.user)
}

// Se a confirmação de email estiver ativada no projeto Supabase (Authentication
// → Providers → Email → "Confirm email"), signUp() não retorna uma sessão —
// só o usuário é criado, e ele só consegue entrar depois de clicar no link
// enviado por email. Sinalizamos isso via needsEmailConfirmation pra que a
// UI (AuthScreen) mostre a mensagem certa em vez de fingir que já logou.
export async function signup({ name, email, password, language }) {
  const cleanEmail = normalizeEmail(email)
  if (!name.trim()) throw new Error('Informe seu nome.')
  if (!isValidEmail(cleanEmail)) throw new Error('Informe um email válido.')
  if (!isValidPassword(password)) throw new Error('A senha deve ter exatamente 6 números.')

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: { data: { name: name.trim(), language: language ?? 'pt' } },
  })
  if (error) {
    if (/already/i.test(error.message)) throw new Error('Já existe uma conta com esse email.')
    throw new Error(error.message)
  }
  return { ...mapUser(data.user), needsEmailConfirmation: !data.session }
}

export async function login({ email, password }) {
  const cleanEmail = normalizeEmail(email)
  const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
  if (error) {
    if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message)) {
      throw new Error('Confirme seu email antes de entrar — verifique sua caixa de entrada.')
    }
    throw new Error('Email ou senha incorretos.')
  }
  return mapUser(data.user)
}

// Troca o idioma do app pra esse usuário (chamado a partir da aba Perfil).
// Atua sempre sobre a sessão autenticada atual (é assim que o Supabase Auth
// funciona no client) — o parâmetro email existe só pra manter a mesma
// assinatura de antes.
export async function updateLanguage(_email, language) {
  const { error } = await supabase.auth.updateUser({ data: { language } })
  if (error) throw new Error(error.message)
}

export async function logout() {
  await supabase.auth.signOut()
}

// Envia o email de redefinição de senha — usa especificamente o template
// "Reset Password" do Supabase (Authentication → Email Templates), que
// customizamos pra mostrar {{ .Token }} (código numérico) em vez do link
// mágico padrão. Importante: signInWithOtp() dispararia o template "Magic
// Link" em vez desse — por isso o método certo aqui é resetPasswordForEmail().
export async function requestPasswordReset(email) {
  const cleanEmail = normalizeEmail(email)
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail)
  if (error) throw new Error('Não encontramos uma conta com esse email.')
  return { email: cleanEmail }
}

export async function resetPassword({ email, code, newPassword }) {
  const cleanEmail = normalizeEmail(email)
  if (!isValidPassword(newPassword)) throw new Error('A nova senha deve ter exatamente 6 números.')

  // type: 'recovery' — o token foi gerado por resetPasswordForEmail(), não
  // pelo fluxo de confirmação de signup (que usaria type: 'email').
  const { data, error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code, type: 'recovery' })
  if (error) throw new Error('Código inválido ou expirado.')

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) throw new Error(updateError.message)

  return mapUser(data.user)
}
