// reiniciarMath.js — "Reiniciar a leitura do zero" (Sua Bíblia e Perfil):
// o que muda na linha da pessoa, conforme o que ela escolheu reiniciar.
// Pura, sem I/O — testes em scripts/test-reiniciar.mjs.
//
// Sempre: os capítulos lidos voltam a "por ler" e o plano volta ao começo
// (ponto de partida e posição da ordem livre). O resto é escolha dela:
//   seals        — os selos dos livros;
//   achievements — as conquistas que vêm da leitura (capítulos lidos,
//                  livros completos e blocos);
//   dates        — as datas em que cada capítulo foi lido (chapters_read,
//                  apagadas à parte — ver reiniciarStore.js).
// Notas, marcações, tempo de leitura e as conquistas de constância, tempo
// e oração nunca entram: não são "a leitura", são o histórico da pessoa.
export const RESTART_EXTRAS = ['seals', 'achievements', 'dates']

// Conquistas que vêm da leitura: as famílias Leitura e Livros completos e
// as de bloco completo.
const READING_ACHIEVEMENT = /^(leitura|livros|bloco):/

export function withoutReadingAchievements(store) {
  return Object.fromEntries(Object.entries(store ?? {}).filter(([id]) => !READING_ACHIEVEMENT.test(id)))
}

// O que gravar em user_data. `row`: a linha de agora (só as conquistas são
// lidas, pra tirar as de leitura e deixar as outras).
export function restartPatch(row, extras = {}) {
  return {
    completed_keys: [],
    reading_plan_position: null,
    ...(extras.seals ? { book_seals: {} } : null),
    ...(extras.achievements ? { achievements: withoutReadingAchievements(row?.achievements) } : null),
  }
}

// A palavra que confirma o reinício para quem entra sem senha (Google ou
// Apple): maiúsculas e espaços em volta não importam.
export function confirmWordMatches(typed, word) {
  return String(typed ?? '').trim().toLocaleUpperCase() === String(word).toLocaleUpperCase()
}
