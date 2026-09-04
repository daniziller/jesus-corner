// Gravado no primeiro login/cadastro bem-sucedido — sem isso, quem já usa o
// app veria a capa de boas-vindas (pensada pra quem chega pela primeira vez)
// toda vez que a sessão expirasse, em vez de cair direto no login. App.jsx
// usa a MESMA chave pra decidir, no bootstrap, se mostra o login direto (quem
// já tem conta neste dispositivo) ou as boas-vindas do convidado. Vive num
// módulo próprio pra AuthScreen.jsx e as telas de conta (LoginScreen/
// SignupScreen/ForgotPasswordScreen) poderem importar sem ciclo.
export const HAS_AUTH_KEY = 'jc_has_authenticated'

export function markHasAuthenticated() {
  try { localStorage.setItem(HAS_AUTH_KEY, '1') } catch { /* ignora */ }
}
