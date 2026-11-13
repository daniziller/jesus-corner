# Passos do plano e Pedidos de oração — pacote de handoff (turnos 53–54)

Redesenho, na linha nova do app, das telas **de dentro do plano** (os passos do dia) e das telas de **pedidos de oração**.

Substitui: de `handoff-passos-36-37/` — **36b** (oração ACTS), **36d** (pedidos dentro da oração), **37a** (reflexão com perguntas), **37c** (dia concluído); de `handoff-meu-plano-35/` — **35f** (leitura com relógio); de `handoff-oracao-pedidos/` — **pd1** (lista), **pd2** (fazer pedido), **pd3** (súplica com pedidos), **pd4** (arquivar).

**Continua valendo, sem mudança:** abertura da oração (36a), oração livre (36c), bênção (36f), reflexão livre (37b), imagem compartilhável (37d), concluir leitura (37e), fim antes do tempo (35g), e **todas as regras de dados e de privacidade** dos três pacotes. Essas telas ainda serão redesenhadas em outro pacote — **não mexa nelas agora**.

**Depende de:** `handoff-meu-plano-47/` (a barra do dia e o botão que emenda os passos), `handoff-biblia-52/` (a tela de leitura B3) e `handoff-gamificacao-43-46/` (cores dos blocos, família "Oração pelos outros", contador de semanas). Se algum não estiver implementado, **pare e me avise**.

## A ideia

Três coisas valem para todos os passos:
1. **A barra do dia** — a mesma do Meu Plano — acompanha a pessoa dentro de cada passo.
2. **Um cartão preto diz o que fazer agora.**
3. **Um botão laranja leva adiante.**

Nos pedidos: **orar por um pedido é um toque só**, e o pedido **nasce privado** ("Só eu").

## Telas

| PNG | Tela | Substitui |
|---|---|---|
| `screens/S1-oracao-acts.png` | **S1** Oração · uma etapa do ACTS (exemplo: Confissão) | 36b |
| `screens/S2-oracao-suplica.png` | **S2** Oração · Súplica, com os pedidos dentro | 36d, pd3 |
| `screens/S3-leitura-relogio.png` | **S3** Leitura com relógio | 35f |
| `screens/S4-reflexao.png` | **S4** Reflexão com perguntas | 37a |
| `screens/S5-dia-concluido.png` | **S5** Dia concluído | 37c |
| `screens/O1-lista-pedidos.png` | **O1** Pedidos de oração · lista | pd1 |
| `screens/O2-fazer-pedido.png` | **O2** Fazer um pedido (estado padrão: "Só eu") | pd2 |
| `screens/O3-como-deus-respondeu.png` | **O3** Como Deus respondeu? | pd4 |

S1 e S2 são **a mesma tela** em etapas diferentes. O2 e O3 são **folhas** sobre a tela escurecida.

Em `referencia/Passos e Pedidos 53-54.dc.html` estão as oito telas com todos os estilos inline — **é a fonte de verdade para qualquer valor** (abra no navegador; precisa do `support.js` ao lado).

## O que sai, o que entra

| Antes | Agora |
|---|---|
| 36b: citação fixa no topo da oração | **Sai desta tela.** Fica só na abertura (36a). |
| 36b: quatro pastilhas grandes de etapa | Trilha fina de quatro segmentos com os nomes |
| 36b: frases de começo em texto | Pastilhas tocáveis — tocar joga a frase no campo |
| 36b: cartão "Pedidos de oração" em toda etapa | Os pedidos aparecem **só na Súplica**, dentro da tela |
| 36d/pd3: tela de pedidos separada, com barra de abas | Lista dentro da Súplica, um check por pedido |
| 35f: barra de progresso do tempo + "Ferramentas" largo | Barra do dia + fio do livro na cor do bloco + botão quadrado |
| 37a: três perguntas abertas ao mesmo tempo | **Uma pergunta por vez** no cartão preto |
| 37a: cartão de aviso de privacidade com ícone | Uma linha de texto |
| 37c: a tela é o cartão de compartilhar, com 6 controles | O que a pessoa fez e o que mudou; compartilhar é uma linha → 37d |
| pd1: citação fixa no topo | Cartão "orações pelos outros" com a próxima conquista |
| pd1: botões "Orei por isso" e "Arquivar" em cada cartão | **Um botão só** (o check). Arquivar/responder: toque no pedido |
| pd2: lista de rádio "Quem vê", padrão no grupo | Três blocos lado a lado, **padrão "Só eu"** |
| pd4: cinco respostas em lista, com rolagem | Grade de duas colunas, sem rolagem |

## Mapa de navegação

```
Meu Plano → botão laranja → emenda os passos de hoje:

Oração (S1 … S2)
 ├ "Pular" ────────────────────→ próxima etapa (na última: termina a oração)
 ├ botão laranja ──────────────→ próxima etapa · na Súplica: "Terminar a oração" → bênção (36f) → próximo passo
 ├ S2: check de um pedido ─────→ marca "orei" (não navega)
 └ S2: "Fazer um pedido" ──────→ O2 (folha), volta para a Súplica

Leitura (S3)
 ├ botão do lápis ─────────────→ ferramentas (como hoje)
 ├ selecionar versículo ───────→ ações do versículo (39e, sem mudança)
 └ "Concluir a leitura" ───────→ concluir leitura (37e) → próximo passo

Reflexão (S4)
 ├ "Trocar" ───────────────────→ troca a pergunta atual (como "Trocar perguntas" em 37a)
 └ botão laranja ──────────────→ próxima pergunta · na 3ª: "Terminar o dia" → S5

Dia concluído (S5)
 ├ "Compartilhar meu dia" ─────→ 37d (sem mudança)
 └ "Voltar ao plano" ──────────→ Meu Plano, estado "dia completo"
   (se houver conquista ou livro completo, a tela de parabéns vem depois de S5)

Pedidos de oração (O1)  — Meu Plano / Comunidade / Perfil, como hoje
 ├ "Novo" ─────────────────────→ O2
 ├ check de um pedido ─────────→ marca "orei" (não navega)
 ├ toque num pedido meu ───────→ O3
 ├ toque num pedido do grupo ──→ nada além do check (ninguém comenta)
 └ "Ver os 12" ────────────────→ aba Respondidos
```

## Ordem de implementação

1. **S1 + S2** — a oração, com a trilha das etapas e os pedidos na Súplica.
2. **S3** — a leitura com relógio (reaproveitando B3).
3. **S4** — a reflexão, uma pergunta por vez.
4. **S5** — o dia concluído.
5. **O1** — a lista de pedidos.
6. **O2 + O3** — as duas folhas.
7. **Limpeza.**

Pare depois de cada etapa e mostre a tela ao lado do PNG.

## Os valores mudam de conta para conta

"07:46", "Etapa 2 de 4 · 2,5 min", os pedidos, "1 de 3 orado", "Gênesis 41", "40 de 50 lidos", as perguntas, "32 minutos", "2 de 6", "41 de 50", "4,3%", a frase do dia, "47", "Faltam 3", "Grupo Semente · 6 pessoas", "Orado por 24 dias · 9 vezes" — **nada hardcoded**.
