// Preferências gerais do assistente de IA — tela 10f do redesign Bento
// (ver ADENDO-identidade-e-IA.md). Os outros dois interruptores de 10f
// (Contexto antes do capítulo, Perguntas na reflexão) já moram nos stores
// das próprias features — chapterContextStore.js e
// reflectionQuestionsStore.js — porque nasceram junto com elas; aqui só
// ficam as duas coisas que são de fato TRANSVERSAIS: se "Perguntar" (10a)
// aparece, e o tom das respostas por trecho (10a/10b).
const ASK_ENABLED_KEY = 'jc_ask_about_text_enabled'
const TONE_KEY = 'jc_ai_response_tone'

// Liga por padrão (mesmo espírito de chapterContextStore — só "Perguntas
// na reflexão" nasce desligada, ver ADENDO).
export function getAskEnabled() {
  try {
    const v = localStorage.getItem(ASK_ENABLED_KEY)
    return v === null ? true : v === '1'
  } catch {
    return true
  }
}
export function setAskEnabled(enabled) {
  try { localStorage.setItem(ASK_ENABLED_KEY, enabled ? '1' : '0') } catch { /* ignora */ }
}

// 'direct' (2 frases) · 'explained' (com contexto) · 'study' (com
// referências) — muda tamanho/tom da resposta, nunca o conteúdo (ver
// answerAboutPassage em api/_lib/ai.js). Padrão 'explained': é o
// comportamento que a resposta por trecho já tinha ANTES deste ajuste
// existir (até 2 parágrafos) — quem nunca abriu esta tela não sente
// nenhuma mudança de comportamento, mesmo com o valor "oficial" do
// mockup sendo 'direct'.
const VALID_TONES = ['direct', 'explained', 'study']
export function getResponseTone() {
  try {
    const v = localStorage.getItem(TONE_KEY)
    return VALID_TONES.includes(v) ? v : 'explained'
  } catch {
    return 'explained'
  }
}
export function setResponseTone(tone) {
  if (!VALID_TONES.includes(tone)) return
  try { localStorage.setItem(TONE_KEY, tone) } catch { /* ignora */ }
}
