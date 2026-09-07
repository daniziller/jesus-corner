// Parte pura de readingPaceStore.js (sem I/O) — "ritmo aprendido"
// (HANDOFF-35-meu-plano.md, seção "Ritmo aprendido — como calcular"):
// mediana móvel de palavras/minuto das últimas 10–12 sessões de leitura,
// com cold start pras 3 primeiras. Testável com `node` puro — ver
// scripts/test-reading-pace.mjs.
//
// A GRAVAÇÃO de verdade de cada sessão (versiculos_lidos/palavras_lidas/
// segundos_ativos) só começa no Bloco 3 (35f, o relógio de leitura) — este
// módulo já existe desde o Bloco 1 (35i lê/mostra o ritmo e o interruptor
// "montar os blocos pelo meu ritmo") pra não ter dois lugares decidindo essa
// conta depois. Sem nenhuma sessão registrada ainda, tudo aqui cai no cold
// start (200 palavras/min, "ainda calibrando") — comportamento correto e
// esperado pra toda conta antes do Bloco 3 existir.
export const COLD_START_WORDS_PER_MINUTE = 200
export const COLD_START_SESSION_COUNT = 3
export const MOVING_WINDOW = 12
export const MIN_ACTIVE_SECONDS = 60

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Só sessões com pelo menos MIN_ACTIVE_SECONDS de tempo ativo contam — uma
// sessão interrompida não deve puxar a mediana pra um extremo artificial.
function usableSessions(sessions) {
  return (sessions ?? []).filter(s => (s?.activeSeconds ?? 0) >= MIN_ACTIVE_SECONDS && (s?.wordsPerMinute ?? 0) > 0)
}

// { wordsPerMinute, isColdStart, sampleCount } — mediana móvel das últimas
// MOVING_WINDOW sessões utilizáveis (mais recentes primeiro em `sessions`,
// mesma ordem que readingPaceStore.js grava). Cold start enquanto não há
// pelo menos COLD_START_SESSION_COUNT sessões utilizáveis.
export function estimateReadingPace(sessions) {
  const usable = usableSessions(sessions).slice(0, MOVING_WINDOW)
  if (usable.length < COLD_START_SESSION_COUNT) {
    return { wordsPerMinute: COLD_START_WORDS_PER_MINUTE, isColdStart: true, sampleCount: usable.length }
  }
  return { wordsPerMinute: median(usable.map(s => s.wordsPerMinute)), isColdStart: false, sampleCount: usable.length }
}

// Ritmo do início (as COLD_START_SESSION_COUNT sessões utilizáveis mais
// antigas) — só pra frase de evolução ("no começo era 0,9 — você
// acelerou"). null enquanto não há sessão suficiente pra comparar.
export function earlyReadingPace(sessions) {
  const usable = usableSessions(sessions)
  if (usable.length < COLD_START_SESSION_COUNT) return null
  const earliest = usable.slice(-COLD_START_SESSION_COUNT)
  return median(earliest.map(s => s.wordsPerMinute))
}

// Capítulos por sessão de `minutesPerDay`, a uma taxa de wordsPerMinute e um
// tamanho médio de capítulo (palavras) — "1,4 capítulo por 15 min" do
// quadro. avgWordsPerChapter <= 0 devolve 0 (sem base pra estimar).
export function chaptersPerSession(wordsPerMinute, minutesPerDay, avgWordsPerChapter) {
  if (!avgWordsPerChapter || avgWordsPerChapter <= 0) return 0
  return Math.round(((wordsPerMinute * minutesPerDay) / avgWordsPerChapter) * 10) / 10
}

// Adiciona uma amostra de sessão ao log, mais recente primeiro, capado em
// MOVING_WINDOW (o cliente nunca precisa guardar mais que isso).
export function pushPaceSession(sessions, sample) {
  return [sample, ...(sessions ?? [])].slice(0, MOVING_WINDOW)
}
