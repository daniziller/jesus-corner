// noteKeys.js — o formato das chaves e das entradas do mapa de notas
// (user_data.notes), sem I/O: notesStore.js reexporta tudo daqui; a
// Biblioteca e os testes leem direto.

// Desmonta uma chave de volta no que ela representa — usado pela
// Biblioteca (bibliotecaMath.js) pra saber de que tipo é cada anotação,
// sem duplicar o conhecimento do formato da chave.
// application:pinned nunca deve aparecer no histórico — não é uma entrada
// por dia, é só o valor "fixado" no card da Home (ver
// reflection/applicationPhraseStore.js); por isso o type 'unknown', o
// mesmo que a Biblioteca já deixa de fora da lista.
export function parseNoteKey(key) {
  if (key === 'application:pinned') return { type: 'unknown' }
  const dailyApplication = key.match(/^application:(\d{4}-\d{2}-\d{2})$/)
  if (dailyApplication) return { type: 'application-phrase', date: dailyApplication[1] }
  const daily = key.match(/^reflection:(\d{4}-\d{2}-\d{2})$/)
  if (daily) return { type: 'daily-reflection', date: daily[1] }
  // Retrospectiva do mês guardada na Biblioteca (quadro 17b).
  const recap = key.match(/^recap:(\d{4}-\d{2})$/)
  if (recap) return { type: 'recap', month: recap[1] }
  const bookReflection = key.match(/^(.+):reflection$/)
  if (bookReflection) return { type: 'book-reflection', book: bookReflection[1] }
  const reading = key.match(/^(.+):(\d+)-(\d+)$/)
  if (reading) return { type: 'reading', book: reading[1], chStart: Number(reading[2]), chEnd: Number(reading[3]) }
  return { type: 'unknown' }
}

// Entradas guardadas antes desta versão eram string pura (só o texto); a
// partir de agora viram { text, updatedAt } pra dar pra ordenar o histórico
// por data (ver bibliotecaMath.js). Essas duas funções aceitam os dois
// formatos na leitura, então notas antigas continuam funcionando.
export function noteTextOf(entry) {
  if (entry == null) return ''
  return typeof entry === 'string' ? entry : entry.text ?? ''
}
export function noteUpdatedAtOf(entry) {
  return (typeof entry === 'object' && entry?.updatedAt) || null
}
// Só a frase de aplicação usa isso — o título da sessão de leitura do dia
// em que ela foi escrita, gravado junto na hora (ver ReflectionScreen.jsx),
// pra ApplicationPhrasesScreen.jsx conseguir mostrar "escrita lendo X" sem
// precisar tentar reconstruir isso depois a partir só da data.
export function noteSessionTitleOf(entry) {
  return (typeof entry === 'object' && entry?.sessionTitle) || null
}
// "Me lembrar às 18h" (quadro antigo 29b, só a frase de aplicação) —
// intenção gravada junto da frase num campo que ainda existe no dado,
// mas não tem mais controle de UI pra ligar (saiu do pacote 36-37/37a,
// que não mostra esse toggle) nem entrega de aviso implementada.
export function noteReminderRequestedOf(entry) {
  return (typeof entry === 'object' && !!entry?.reminderRequested) || false
}
