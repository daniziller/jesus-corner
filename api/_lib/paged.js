// Lê todas as linhas de uma consulta, em páginas. A API do banco devolve no
// máximo 1.000 linhas por vez e cortava o resto em silêncio — o funil, os
// "ativos hoje" e o segmento "inativos há 14 dias" do painel já passavam
// disso. Devolve { data, error }, como uma consulta comum do supabase-js.
//
// `apply`: os filtros (q => q.gte(...)); `order`: colunas que dão uma ordem
// estável entre as páginas.
const PAGE = 1000

export async function fetchAllPaged(client, table, columns, { apply, order = ['id'] } = {}) {
  const data = []
  for (let from = 0; ; from += PAGE) {
    let q = client.from(table).select(columns)
    if (apply) q = apply(q)
    for (const col of order) q = q.order(col)
    const { data: page, error } = await q.range(from, from + PAGE - 1)
    if (error) return { data: null, error }
    data.push(...(page ?? []))
    if (!page || page.length < PAGE) return { data, error: null }
  }
}
