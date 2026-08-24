// Cores fixas dos passos da rotina diária — compartilhadas entre o card
// da Home, o calendário de histórico e a métrica de uso da aba Progresso,
// pra sempre bater a mesma cor com o mesmo passo em qualquer tela.
export const ROUTINE_STEP_COLORS = {
  prayer:     '#B5005D', // rosa/magenta da marca (mesmo tom de --grad-vivid) — antes cinza, quase igual ao estado "desligado" do toggle (var(--g2)), difícil de distinguir num relance
  reading:    '#9D4300', // marrom-queimado da logo (= --or)
  study:      '#C99A4A', // dourado/âmbar (= --gold) — parte da paleta da marca, mais claro que reading, ainda assim distinto do roxo dos planos por tema (IA)
  reflection: '#18181B', // preto
}
