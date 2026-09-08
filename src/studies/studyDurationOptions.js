// Durações fixas oferecidas ao criar um estudo por IA (35d) — mesma lista
// usada pro cliente desenhar os chips e pro servidor validar o pedido
// (api/generate-theme-plan.js), pra nunca dessincronizar as duas.
export const ALLOWED_STUDY_DAYS = [3, 7, 14, 21, 30]
export const DEFAULT_STUDY_DAYS = 7
