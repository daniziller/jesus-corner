// chapterOrigin.js — separa, dentro de um livro já lido (completedSet), o
// que veio de sessão de leitura ('sessao', a cor do bloco na grade de
// capítulos, B2) do que foi marcado à mão ('manual', o tom do bloco) — regra
// "duas origens distintas... contam igual na porcentagem, mas aparecem
// separadas". A fonte é chapters_read (migration 0049,
// bible/chapterReadLog.js), um traço de auditoria "1ª vez que este
// capítulo foi marcado feito, por qual caminho" — não tem linha pra
// capítulos concluídos ANTES dessa tabela existir (limitação já
// documentada em MetricsScreen.jsx). Sem linha correspondente, o
// capítulo entra como 'sessao' — é a suposição mais segura (a marcação
// manual é a feature nova; o que já estava lido antes dela quase sempre
// veio de ler de verdade, não de marcar em lote).
export function buildChapterOriginMap(rows) {
  const map = new Map()
  for (const row of rows) {
    if (!row?.livro || !row?.capitulo) continue
    map.set(`${row.livro}:${row.capitulo}`, row.origem === 'manual' ? 'manual' : 'sessao')
  }
  return map
}

export function originOf(originMap, book, chapter) {
  return originMap.get(`${book}:${chapter}`) ?? 'sessao'
}
