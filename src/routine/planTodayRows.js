// planTodayRows.js — ordem canônica dos passos do plano (Oração, Leitura,
// Estudo, Reflexão), usada pelo guiado (App.jsx), pela Home, pelo modo
// mãos-livres e pelo Meu Plano. As funções que montavam a lista "Seu plano
// de hoje" de 35a/35b (ordem com os "de folga" no fim, status e meta de cada
// linha) saíram com aquela tela (handoff-meu-plano-47, HANDOFF §11) — o
// Meu Plano novo deriva tudo em src/meuPlano/meuPlanoMath.js.
export const STEP_ORDER = ['prayer', 'reading', 'study', 'reflection']
