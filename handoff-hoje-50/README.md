# Hoje, mais limpo — pacote de handoff (turno 50, opção 50a)

Redesenho da aba **Hoje**: de dez blocos para **quatro**, com as métricas e a próxima conquista na primeira tela. Substitui o Hoje do pacote `handoff-gamificacao-43-46/` (G1). **Só a aba Hoje muda.**

Depende de: a roda, as semanas na meta, as conquistas e os selos de `handoff-gamificacao-43-46/`, e as regras de passos do dia de `handoff-meu-plano-47/`. Este pacote **não recalcula nada** — só mostra, de outro jeito, dados que esses dois já definem.

## Telas

| PNG | O que é |
|---|---|
| `screens/H1-hoje.png` | **H1** — o Hoje novo, no meio do dia (1 de 3 passos feito). É o layout final. |
| `screens/ANTES-hoje.png` | O Hoje que sai. **Não implemente.** Serve para localizar no código o que é substituído e conferir que nenhuma função ficou sem caminho. |

## O que sai, o que entra, para onde foi

| Antes (10 blocos) | Agora (4 blocos) |
|---|---|
| Cartão preto do plano com parágrafo e três quadrados de minutos | Cartão preto do plano com **a lista dos passos de hoje** e círculos (aberto / laranja cheio) — 2º bloco |
| Cartão "VERSÍCULO DO DIA" | Linha **"Versículo do dia"** na lista "Para hoje" |
| Cartão areia "SUA APLICAÇÃO DE ONTEM" | Linha **"Sua aplicação de ontem"** na lista, com o botão "Cumpri" |
| Cartão "SUA BÍBLIA" (roda 250px + legenda de 8 blocos) | Cartão baixo com a roda de **132px**, "N de 1.189 capítulos" e o livro atual. A legenda fica só em "Sua Bíblia" |
| Cartão "SUAS SEMANAS" (número, 12 cápsulas, 7 dias, parágrafo) | Dois quadrados: **"Semanas"** (número + 12 cápsulas) e **"Dias"** (N de M + 7 pontos). O parágrafo sai do Hoje |
| Quadrado "Mensagens novas" | **Número laranja na aba Comunidade** |
| Quadrado "Minhas métricas" | Sai. A tela de métricas abre ao tocar no quadrado **"Semanas"** ou **"Dias"** |
| Linha "Anotar uma pregação" | Linha **"Anotar uma pregação"** na lista "Para hoje" |
| Cartão areia "SUA SEMANA" (resumo pronto) | Linha **"Resumo da sua semana"** na lista, **só quando há resumo não lido** |
| — | Quadrado **"Selos"** (novo no Hoje) |
| — | Cartão **"Próxima conquista"** (novo no Hoje) |

## Mapa de navegação

```
Hoje (H1)
 ├ avatar ────────────────────────────→ Perfil (como hoje)
 ├ cartão da Bíblia (inteiro) ────────→ Sua Bíblia (G2)
 ├ quadrado "Semanas" ────────────────→ Minhas métricas (a tela que o quadrado antigo abria)
 ├ quadrado "Dias" ───────────────────→ Minhas métricas
 ├ quadrado "Selos" ──────────────────→ Minha estante (G9)
 ├ plano · botão laranja ─────────────→ abre o passo de agora e emenda os seguintes (o mesmo do Meu Plano)
 ├ plano · resto do cartão ───────────→ aba Meu Plano
 ├ Próxima conquista ─────────────────→ a família daquela conquista (G6)
 ├ Para hoje · Resumo da sua semana ──→ o resumo (como hoje)
 ├ Para hoje · Versículo do dia ──────→ o versículo aberto, com salvar e compartilhar
 ├ Para hoje · Sua aplicação de ontem ─→ a aplicação aberta, com "trocar"  ·  "Cumpri" marca sem navegar
 ├ Para hoje · Anotar uma pregação ───→ a Bíblia com a folha de anotação (como hoje)
 └ aba Comunidade (com o número) ─────→ Comunidade (como hoje)
```

## Ordem de implementação

1. **Sua caminhada** — o cartão da Bíblia e os três quadrados Semanas · Dias · Selos.
2. **Cartão do plano** — lista de passos com círculos, nos cinco estados.
3. **Próxima conquista**.
4. **Lista "Para hoje"** e o número na aba Comunidade.
5. **Limpeza** — apagar os blocos antigos do Hoje que ninguém mais usa.

Pare depois de cada etapa e mostre a tela ao lado do PNG.

## Os valores mudam de conta para conta

"Bom dia, Diego", "Terça, 2 de setembro", "4,2%", "18", "1 de 4", "50 de 1.189 capítulos", "Gênesis 41 de 50 · faltam 9 para o selo", "1 de 66 livros", "Gênesis 42", "1 de 3 passos", "faltam 23 min", "ACTS", "15 min", "Dez horas com Deus", "falta 1 h", o versículo, a aplicação, o "9" — **nada hardcoded**. Idêntico ao quadro é a estrutura.
