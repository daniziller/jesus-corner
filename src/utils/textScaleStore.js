// Tamanho do texto (acessibilidade) — por dispositivo, mesmo padrão de
// appLanguageStore.js. Persiste entre sessões até a pessoa trocar de novo.
//
// 2026-09-08 — trocou de um liga/desliga (jc_large_text, 1 nível) pra um
// seletor de verdade em pontos (19a, "Aparência e texto": "Claro · 18 pt"
// — a tela mostra um valor numérico, não um interruptor). Migra sozinho
// quem já tinha o "texto grande" ligado pro tamanho grande novo (18pt),
// sem perder a preferência.
const KEY = 'jc_font_size_pt'
const LEGACY_KEY = 'jc_large_text'

export const FONT_SIZE_STEPS = [15, 16, 18, 20, 22]
export const DEFAULT_FONT_SIZE_PT = 16

export function getFontSizePt() {
  const saved = Number(localStorage.getItem(KEY))
  if (FONT_SIZE_STEPS.includes(saved)) return saved
  // Migração do modelo antigo (booleano) — só na primeira leitura depois
  // da troca, nunca mais (a chave nova já existe a partir daqui).
  return localStorage.getItem(LEGACY_KEY) === '1' ? 18 : DEFAULT_FONT_SIZE_PT
}

export function setFontSizePt(pt) {
  localStorage.setItem(KEY, String(pt))
}

// zoom do container de conteúdo (ver .app-content-inner, index.css) — o
// tamanho base do app é DEFAULT_FONT_SIZE_PT; os outros passos escalam
// proporcionalmente a partir dele, mesmo mecanismo (CSS zoom) que já
// existia pro liga/desliga antigo.
export function zoomForFontSize(pt) {
  return pt / DEFAULT_FONT_SIZE_PT
}
