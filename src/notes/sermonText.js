// sermonText.js — o texto que a pessoa escreveu numa anotação longa, sem
// I/O (sermonNotesStore.js reexporta; a Biblioteca e os testes leem daqui).

// "Só as palavras dela" (34h, Regra 4 §10) — junta os segmentos de TEXTO
// e TÓPICO do corpo estruturado (turno 34, Bloco 3), pulando os blocos
// de CITAÇÃO (texto bíblico, não anotação) e de LINK (correção
// 2026-09-09 — só a referência, sem texto próprio nenhum). Compat com
// quem só usou a área simples de 34d (sem body nenhum): usa `text` direto.
export function sermonOwnWordsText(draft) {
  if (Array.isArray(draft?.body) && draft.body.length > 0) {
    return draft.body.filter(s => s.type !== 'quote' && s.type !== 'link').map(s => s.text ?? '').filter(Boolean).join('\n\n')
  }
  return draft?.text ?? ''
}

// "Com menos de ~40 palavras escritas, o bloco preto não aparece" (34h,
// estado de anotação curta) — mesmo texto de sermonOwnWordsText, só a
// contagem.
export function sermonOwnWordCount(draft) {
  return sermonOwnWordsText(draft).trim().split(/\s+/).filter(Boolean).length
}
