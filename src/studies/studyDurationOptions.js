// Durações fixas oferecidas ao criar um estudo por IA (35d) — mesma lista
// usada pro cliente desenhar os chips e pro servidor validar o pedido
// (api/generate-theme-plan.js), pra nunca dessincronizar as duas.
//
// "5" foi adicionado pro Bloco 6 do pacote 39 (39l, "Virar um estudo" a
// partir de um tema): o quadro pede exatamente 5/7/14/21 dias ali — em vez
// de inventar um conjunto separado só pra essa tela (e duplicar a validação
// do servidor), o valor entrou neste conjunto global, com a autora ok
// (perguntado explicitamente: opção "adicionar ao conjunto global"). 35d
// (criar estudo livre) continua mostrando os mesmos 5 chips de sempre —
// só ganhou "5" como valor tecnicamente válido, sem aparecer lá.
export const ALLOWED_STUDY_DAYS = [3, 5, 7, 14, 21, 30]
export const DEFAULT_STUDY_DAYS = 7

// Chips de fato mostrados em CreateAiStudyScreen.jsx (35d, "criar estudo
// livre") — um subconjunto fixo de ALLOWED_STUDY_DAYS, sem o "5" (a tela
// não mudou, só o conjunto de valores válidos no servidor cresceu). O
// quadro de 39l pede seus próprios 4 chips (5/7/14/21), escritos direto em
// ThemeAsStudyScreen.jsx — não precisam de uma constante própria aqui.
export const CREATE_STUDY_DURATION_CHIPS = [3, 7, 14, 21, 30]
