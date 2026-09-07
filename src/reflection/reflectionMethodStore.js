// Método de reflexão escolhido — 'questions' (padrão, três perguntas
// geradas do trecho do dia) ou 'free' (folha em branco, nada sugerido) —
// ver HANDOFF-35-meu-plano.md, 35c. Mesmo padrão de prayerMethodStore.js:
// por aparelho (preferência de uso, não dado de progresso; não precisa de
// coluna própria pra sincronizar entre aparelhos).
const KEY = 'jc_reflection_method'

export function getReflectionMethod() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'free' ? 'free' : 'questions'
  } catch {
    return 'questions'
  }
}

export function setReflectionMethod(method) {
  try {
    localStorage.setItem(KEY, method === 'free' ? 'free' : 'questions')
  } catch {
    // localStorage indisponível — a escolha só não persiste; sem risco.
  }
}
