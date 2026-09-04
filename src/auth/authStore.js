// Autenticação real via Supabase Auth. Nome e idioma ficam no user_metadata
// do próprio usuário (definidos no signUp, editáveis via updateUser) — o
// progresso do app (leitura, oração, notas etc.) mora à parte, na tabela
// user_data (ver src/backend/userDataStore.js).
import { supabase } from '../lib/supabaseClient'
import { isUnderMinAge, MIN_AGE } from '../privacy/minAge'

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// Senha forte: pelo menos 8 caracteres, com maiúscula, minúscula, número e
// caractere especial — no lugar do PIN de 6 dígitos antigo. Cada regra vira
// uma linha do checklist ao vivo no campo (ver PasswordField em
// AuthScreen.jsx), então fica exposta aqui como função separada em vez de só
// um regex opaco.
export function passwordRequirements(password) {
  const p = password ?? ''
  return {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    number: /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  }
}
export function isValidPassword(password) {
  return Object.values(passwordRequirements(password)).every(Boolean)
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

// O Supabase throttla envio de email de confirmação/recuperação por dois
// motivos: um cooldown curto por email ("For security purposes, you can
// only request this after N seconds") e uma cota do projeto inteiro
// ("email rate limit exceeded", 2/hora por padrão sem SMTP customizado —
// ver docs/lgpd.md ou o painel do Supabase, Authentication → Rate Limits).
// Sem esse tratamento, quem tentasse de novo rápido demais (ex: cadastro
// que não confirmou e tenta cadastrar com o mesmo email outra vez) via o
// texto cru em inglês do Supabase na tela — confuso, e não deixa claro que
// um email JÁ foi mandado na tentativa anterior.
function isRateLimitError(message) {
  return /security purposes|rate limit/i.test(message ?? '')
}

// O GoTrue recusa updateUser({password}) quando a nova senha é igual à
// atual, com mensagem só em inglês ("New password should be different from
// the old password.") — sem esse mapeamento, esse texto cru subia direto
// pra tela (mesmo padrão dos outros erros crus já corrigidos nesta área).
function isSamePasswordError(message) {
  return /different from the old password/i.test(message ?? '')
}

function mapUser(authUser) {
  if (!authUser) return null
  return {
    id: authUser.id,
    name: authUser.user_metadata?.name ?? '',
    email: authUser.email,
    language: authUser.user_metadata?.language ?? 'pt',
    birthdate: authUser.user_metadata?.birthdate ?? null,
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
//
// Idade mínima (ver src/privacy/minAge.js): a tela de criar conta do redesign
// (13c, SignupScreen.jsx) não pede mais a idade em número — a pessoa declara
// "Tenho 18 anos ou mais" na mesma linha do consentimento. Por isso
// `birthdate` virou opcional quando `ageConfirmed` vem true; a data de
// nascimento continua podendo ser preenchida depois em Perfil (o gate de
// idade da Comunidade tolera data ausente, ver isAtLeast em utils/age.js).
export async function signup({ name, email, password, language, birthdate, isPublic, ageConfirmed }) {
  const cleanEmail = normalizeEmail(email)
  if (!name.trim()) throw new Error('Informe seu nome.')
  if (!isValidEmail(cleanEmail)) throw new Error('Informe um email válido.')
  if (!isValidPassword(password)) throw new Error('A senha precisa ter pelo menos 8 caracteres, com maiúscula, minúscula, número e caractere especial.')
  if (!birthdate && !ageConfirmed) throw new Error('Informe sua data de nascimento.')
  if (birthdate) {
    const birthDateObj = new Date(birthdate)
    if (Number.isNaN(birthDateObj.getTime()) || birthDateObj > new Date()) {
      throw new Error('Informe uma data de nascimento válida.')
    }
    // O Jesus' Corner é para maiores de 18 (ver src/privacy/minAge.js). A
    // tela também checa antes de chegar aqui — esta é a rede de segurança
    // para quem chamar signup() por outro caminho.
    if (isUnderMinAge(birthdate)) {
      throw new Error(`É preciso ter pelo menos ${MIN_AGE} anos para criar uma conta.`)
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        name: name.trim(), language: language ?? 'pt', birthdate: birthdate ?? null, is_public: !!isPublic,
        // Registro da declaração de idade (quando a tela não pediu a data).
        ...(ageConfirmed && !birthdate ? { age_confirmed_at: new Date().toISOString() } : {}),
      },
    },
  })
  if (error) {
    if (isRateLimitError(error.message)) throw new Error('rate_limited')
    if (/already/i.test(error.message)) throw new Error('Já existe uma conta com esse email.')
    throw new Error(error.message)
  }
  return { ...mapUser(data.user), needsEmailConfirmation: !data.session }
}

// Reenvia o email de confirmação de cadastro — pra quando a pessoa não
// recebeu (caiu no spam, digitou certo mas demorou, etc.) e ainda está na
// tela "confirme seu email" logo após o cadastro. type: 'signup' é o que
// distingue esse reenvio do de recuperação de senha (que usa outro fluxo,
// resetPasswordForEmail, acima).
export async function resendConfirmationEmail(email) {
  const cleanEmail = normalizeEmail(email)
  const { error } = await supabase.auth.resend({ type: 'signup', email: cleanEmail })
  if (error) throw new Error(isRateLimitError(error.message) ? 'rate_limited' : error.message)
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

// Entrar com Google/Apple (botões da tela 13b, LoginScreen.jsx). Usa o fluxo
// OAuth do próprio Supabase: redireciona pro provedor e volta pra esta
// mesma origem já com sessão (onAuthStateChange acima cuida do resto). Só
// funciona depois de o provedor estar ativado no projeto (Authentication →
// Providers) — enquanto não estiver, o Supabase responde com erro de
// provedor não suportado/ativado, que a tela mostra como "ainda não
// disponível" em vez de quebrar.
export async function loginWithProvider(provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
  })
  if (error) {
    if (/not enabled|unsupported|not supported|disabled/i.test(error.message)) throw new Error('provider_unavailable')
    throw new Error(error.message)
  }
}

// Envia o email de redefinição de senha — usa especificamente o template
// "Reset Password" do Supabase (Authentication → Email Templates), que
// customizamos pra mostrar {{ .Token }} (código numérico) em vez do link
// mágico padrão. Importante: signInWithOtp() dispararia o template "Magic
// Link" em vez desse — por isso o método certo aqui é resetPasswordForEmail().
export async function requestPasswordReset(email) {
  const cleanEmail = normalizeEmail(email)
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail)
  // O Supabase NUNCA devolve erro aqui só por email não existir (de
  // propósito, pra não deixar dar pra descobrir quais emails têm conta só
  // tentando recuperar senha) — então "Não encontramos uma conta com esse
  // email" (o que este catch dizia antes) na prática só disparava quando o
  // erro de verdade era limite de envio (pedir de novo rápido demais),
  // mostrando uma mensagem enganosa dizendo que a conta não existe quando
  // ela existe e o código já tinha sido mandado segundos antes.
  if (error) throw new Error(isRateLimitError(error.message) ? 'rate_limited' : error.message)
  return { email: cleanEmail }
}

export async function resetPassword({ email, code, newPassword }) {
  const cleanEmail = normalizeEmail(email)
  if (!isValidPassword(newPassword)) throw new Error('A nova senha precisa ter pelo menos 8 caracteres, com maiúscula, minúscula, número e caractere especial.')

  // type: 'recovery' — o token foi gerado por resetPasswordForEmail(), não
  // pelo fluxo de confirmação de signup (que usaria type: 'email').
  const { data, error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code, type: 'recovery' })
  if (error) throw new Error('Código inválido ou expirado.')

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) throw new Error(isSamePasswordError(updateError.message) ? 'same_as_old_password' : updateError.message)

  // A senha nova já nasce no padrão forte, então não faz sentido pedir troca
  // de novo no próximo login — mesmo raciocínio de changePassword() abaixo.
  await clearPasswordNeedsUpdate(data.user?.id)

  return mapUser(data.user)
}

// true quando esta conta precisa trocar a senha antes de continuar — quem
// já tinha conta quando a política de senha endureceu de PIN de 6 dígitos
// pra senha forte (ver migration 0026 e ForceChangePasswordStep em
// AuthScreen.jsx). Lido do próprio perfil.
export async function needsPasswordChange() {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return false
  // A policy de SELECT em profiles também libera amigos aceitos e colegas
  // de grupo, não só o dono (ver 0002_friends_groups_challenges.sql) — sem
  // o .eq() abaixo, quem tem qualquer amigo faz essa query bater em mais de
  // uma linha, .single() falha, e o erro fazia essa função sempre devolver
  // false (era esse o bug: a troca forçada nunca disparava pra ninguém com
  // amigos).
  const { data, error } = await supabase
    .from('profiles')
    .select('password_needs_update')
    .eq('user_id', userId)
    .single()
  if (error) { console.error('Falha ao checar password_needs_update', error); return false }
  return !!data?.password_needs_update
}

async function clearPasswordNeedsUpdate(userId) {
  if (!userId) return
  const { error } = await supabase
    .from('profiles')
    .update({ password_needs_update: false })
    .eq('user_id', userId)
  if (error) console.error('Falha ao limpar password_needs_update', error)
}

// Troca de senha por quem já está autenticado — usado tanto no fluxo forçado
// (ForceChangePasswordStep) quanto, no futuro, por uma opção voluntária em
// Perfil. Sempre exige a senha atual pro Supabase reautenticar antes de
// trocar (ele já faz isso por baixo dos panos ao chamar updateUser com uma
// sessão válida — não é preciso reautenticar manualmente aqui).
export async function changePassword(newPassword) {
  if (!isValidPassword(newPassword)) {
    throw new Error('A nova senha precisa ter pelo menos 8 caracteres, com maiúscula, minúscula, número e caractere especial.')
  }
  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(isSamePasswordError(error.message) ? 'same_as_old_password' : error.message)
  await clearPasswordNeedsUpdate(userData?.user?.id)
}
