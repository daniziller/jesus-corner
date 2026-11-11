# Aba Bíblia, redesenhada — pacote de handoff (turno 52)

A aba **Bíblia** com o progresso e a gamificação dentro da própria navegação, e uma busca completa. Substitui, do pacote `handoff-biblia-39/`, as telas **39a** (raiz), **39b** (lista de livros — deixa de existir), **39c** (o livro), **39d** (leitura) e **39k** (busca).

**Continua valendo de `handoff-biblia-39/`, sem mudança:** 39e (versículo selecionado), 39f (anotar), 39g (copiar), 39i (compartilhar), 39j (perguntar), 39l (um tema) e **todas as regras da aba** — leitura livre não mexe no plano, marcação manual de capítulo e de livro, referências de IA conferidas, nada publicado sem toque explícito.

**Depende de `handoff-gamificacao-43-46/`:** os oito blocos e suas cores, o selo de livro, as conquistas e as telas de parabéns. Se aquele pacote ainda não foi implementado, **pare e me avise** antes de começar.

## A ideia

Em 39 a estatística morava em cartões à parte (anéis de %, bloco preto "40 de 50") e a gamificação não aparecia. Aqui **a pessoa navega pelo próprio progresso**: cada livro é uma pastilha que enche na cor do seu bloco, cada capítulo lido se pinta nessa cor, e marcar um capítulo devolve, no lugar, o que mudou.

## Telas

| PNG | Tela | O que é |
|---|---|---|
| `screens/B1-biblia-raiz.png` | **B1** Bíblia · raiz | Busca, progresso geral, continuar, os dois testamentos e os livros por bloco, com o nome por extenso. A captura mostra o Antigo Testamento selecionado. |
| `screens/B2-livro.png` | **B2** O livro | Selo enchendo, três números do livro, grade de capítulos na cor do bloco. |
| `screens/B3-lendo.png` | **B3** Lendo | O capítulo, com o fio de progresso do livro. |
| `screens/B4-capitulo-marcado.png` | **B4** Capítulo marcado | A mesma tela logo depois de "Marcar como lido". |
| `screens/B5-busca-ao-abrir.png` | **B5** Busca · ao abrir | Antes de digitar. |
| `screens/B6-busca-por-palavra.png` | **B6** Busca · por palavra | Resultados agrupados. |
| `screens/B7-busca-por-referencia.png` | **B7** Busca · por referência | Ir direto a um texto. |

B3 e B4 são **a mesma tela** em dois estados. B5, B6 e B7 são **a mesma tela** em três estados. O teclado não está desenhado nas capturas da busca; ele sobe normalmente.

Dados prontos em `data/blocos-da-biblia.json` (os 8 blocos, 66 livros, cores, tons, capítulos) — é o mesmo arquivo do pacote de gamificação. Use **uma fonte só** no código.

## O que sai, o que entra

| Antes (39) | Agora |
|---|---|
| Subtítulo "50 de 1.189 capítulos · 4,2% lidos" | Cartão de progresso: "4,2%" + barra dos oito blocos |
| Cartão areia "Continuar a leitura livre" + cartão "Ler pela sessão de hoje" no fim | **Um** cartão preto com os dois: sessão de hoje (botão) e leitura livre (linha) |
| Dois cartões grandes de testamento com anel de % e botão "Abrir" | Dois cartões lado a lado que **selecionam** a lista abaixo |
| Tela 39b, lista de livros do testamento | **Não existe mais.** Os livros estão na raiz, por bloco |
| 39c: bloco preto com anel "80%" | Selo do livro enchendo + "Faltam N capítulos para o selo" + três números |
| 39c: grade de 6 colunas em preto/cinza | Grade de 7 colunas, na cor do bloco |
| 39c: cartão de legenda, cartão areia "Marcar o livro inteiro", cartão "Começar meu plano aqui" | Legenda dentro do cartão da grade; as duas ações numa lista |
| 39d: tarja "LEITURA LIVRE · NÃO CONTA NO PLANO" | Fio de progresso do livro + "N de M lidos · leitura livre" |
| 39d: botão "Ferramentas" largo | Botão quadrado com ícone, ao lado de "Marcar como lido" |
| — | Cartão "capítulo marcado" (B4) |
| 39k: resultados da busca | B5–B7: busca com filtros, referência direta, passagens, versículos, temas e notas |

## Mapa de navegação

```
Bíblia · raiz (B1)
 ├ campo de busca ─────────────────────→ B5
 ├ "NVT" ──────────────────────────────→ seletor de versão (como hoje)
 ├ cartão de progresso ────────────────→ Sua Bíblia (G2, do pacote de gamificação)
 ├ "Ler" (sessão de hoje) ─────────────→ leitura do plano, com relógio (sai da aba)
 ├ linha "Leitura livre · …" ──────────→ B3 naquele capítulo, rolado até o versículo
 ├ cartão "Antigo Testamento" / "Novo Testamento" → troca a lista abaixo, sem navegar
 └ pastilha de um livro ───────────────→ B2

O livro (B2)
 ├ capítulo: toque ────────────────────→ B3 · segurar → marca/desmarca (regra de 39c)
 ├ selo ───────────────────────────────→ Um selo (G10), só se o livro está completo
 ├ "Marcar o livro inteiro como lido" ─→ confirmação (como em 39c)
 ├ "Começar meu plano aqui" ───────────→ 35i
 └ botão fixo ─────────────────────────→ B3 no próximo capítulo não lido

Lendo (B3/B4)
 ├ pílula "Salmos 23 ⌄" ───────────────→ seletor de livro/capítulo (como hoje)
 ├ selecionar versículo ───────────────→ 39e (sem mudança)
 ├ botão do lápis ─────────────────────→ o que "Ferramentas" abria em 39d
 ├ "Marcar como lido" ─────────────────→ B4
 └ B4 "Seguir para …" ─────────────────→ B3 no capítulo seguinte · X → fecha o cartão

Busca (B5–B7)
 ├ livro ──────────────────────────────→ B2
 ├ capítulo / passagem / versículo ────→ B3, rolado até o versículo e com ele em foco
 ├ tema ───────────────────────────────→ 39l (sem mudança)
 ├ nota ───────────────────────────────→ B3 no versículo, com a nota aberta
 └ "Ver os N versículos" ──────────────→ a mesma tela com o filtro "Versículos"
```

## Ordem de implementação

1. **B1** — a raiz, com os dois testamentos e os livros por bloco.
2. **B2** — o livro.
3. **B3 + B4** — a leitura e o cartão de capítulo marcado.
4. **B5 + B7** — a busca ao abrir e a referência direta (o interpretador de referências).
5. **B6** — a busca por palavra, com os grupos e os filtros.
6. **Limpeza** — apagar 39b e o que só 39a/39c/39d/39k usavam.

Pare depois de cada etapa e mostre a tela ao lado do PNG.

## Os valores mudam de conta para conta

"4,2%", "50 de 1.189", "5,4% lido", "faltam 879", "Gênesis 40 de 50", "6 h 10", "23 dias", "12", "7 de 150", "faltam 99", "pastor", "14", os textos dos versículos — **nada hardcoded**. Os textos bíblicos das capturas são ilustrativos: o app mostra **o texto da versão do usuário**.
