// Registro de auditoria de capítulo lido (chapters_read, migration 0049) —
// compartilhado entre marcação manual (manualChapterMarks.js, origem
// 'manual') e conclusão normal de sessão do plano (App.jsx toggleSession/
// toggleChapter, origem 'sessao'). Uma linha por livro:capítulo — UNIQUE
// (user_id, livro, capitulo) no banco, então a 1a vez que um capítulo é
// marcado feito, por qualquer caminho, grava aqui; uma 2a marcação do mesmo
// capítulo (desmarcar e marcar de novo, ou marcar por um caminho depois do
// outro) falha silenciosamente no unique constraint — é o comportamento
// certo pra um traço de "quando você leu isso pela 1a vez", não um
// acumulador.
//
// Esta tabela é o que permite às métricas (30b) filtrar "capítulos lidos"
// por período (30 dias/este ano) via created_at — antes desta mudança, só
// marcação manual gravava aqui, então só ela tinha data. Limitação real,
// documentada em MetricsScreen.jsx: capítulos concluídos ANTES desta
// mudança não têm linha aqui, então "30 dias"/"este ano" só refletem
// leitura feita a partir de agora; "desde o começo" não depende disso (usa
// completed_keys via countChaptersRead, sempre correto).
import { insertRow, selectRows } from '../backend/guestTableStore'

const TABLE = 'chapters_read'

// `keys` no formato "Livro:capítulo" (sessionKeys/completed_keys) — ignora
// sozinho chaves de reflexão ("Livro:reflection"), que não são capítulo.
// Best-effort: cada insert é independente (erro num capítulo não derruba
// os outros) e nunca lança — quem chama não precisa dar catch.
export function logChaptersRead(keys, origem) {
  const chapterKeys = keys.filter(k => !k.endsWith(':reflection'))
  return Promise.all(
    chapterKeys.map(k => {
      const [livro, capStr] = k.split(':')
      const capitulo = Number(capStr)
      return insertRow(TABLE, { livro, capitulo, origem }).catch(err =>
        console.error(`Failed to log chapter read ${k}`, err)
      )
    })
  )
}

// Todas as linhas do usuário (autenticado ou convidado), qualquer origem —
// base de "capítulos lidos" por período em métricas (30b, ver
// chaptersReadInPeriod em metricsSummary.js).
export function getAllChapterReadRows() {
  return selectRows(TABLE)
}
