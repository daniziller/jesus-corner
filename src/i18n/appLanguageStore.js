// Preferência de idioma "pré-login": escolhida na primeira tela do app,
// antes de existir qualquer conta/usuário logado. Guardada por dispositivo
// (não por conta) — é o que faz a tela de login/criar conta já nascer no
// idioma certo. Depois de logado, o idioma salvo na própria conta manda
// (ver authStore.updateLanguage), mas essa preferência de dispositivo
// continua servindo de idioma padrão pra próxima conta criada aqui.
const KEY = 'jc_app_language'

export function getAppLanguage() {
  return localStorage.getItem(KEY)
}

export function setAppLanguage(language) {
  localStorage.setItem(KEY, language)
}
