// "Aviso do grupo" — quarta chave dos Ajustes de IA (quadro 10f): "seu grupo
// terminou o capítulo de hoje". Desligada por padrão e só visível pra quem
// está num grupo (AiSettingsScreen consulta getMyGroups). Fica na linha de
// dados (user_data.group_notice_enabled, migration 0044) porque quem manda o
// aviso é o servidor — precisa ler a preferência de lá, não do aparelho.
//
// A preferência em si está gravada e lida de verdade (este arquivo) — o que
// AINDA NÃO EXISTE é o disparo: nenhum código em api/ lê esta coluna nem
// detecta "grupo terminou o capítulo de hoje" pra mandar o push. Construir
// isso é trabalho de Comunidade (Bloco 10 do redesign — 24a/24b/24c/17a),
// não de IA; fica documentado aqui pra não passar como "pronto" por engano.
import { fetchRow, updateRow } from '../backend/userDataStore'

export async function getGroupNoticeEnabled() {
  const row = await fetchRow()
  return !!row?.group_notice_enabled
}

export async function setGroupNoticeEnabled(enabled) {
  await updateRow({ group_notice_enabled: !!enabled })
}
