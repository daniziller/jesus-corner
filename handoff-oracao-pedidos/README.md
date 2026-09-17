# Pedidos de oração — pacote de handoff

Quatro telas. Cobrem o ciclo inteiro de um pedido: **fazer → aparecer para quem ora → ser orado → ser guardado com a resposta**.

Origem no quadro de design: `25a`, `25b` (turno 25) e `36d`, `36e` (turno 36).

| PNG | Tela | O que é |
|---|---|---|
| `pd1-lista-pedidos.png` | **PD1** Pedidos de oração | A lista completa: ativos, do grupo e respondidos. Cada pedido mostra **há quanto tempo está sendo orado**. Vive na aba **Meu Plano**. |
| `pd2-fazer-pedido.png` | **PD2** Fazer um pedido | Folha inferior: uma frase, quem vê, publicar sem o nome. |
| `pd3-suplica-pedidos.png` | **PD3** Súplica | Os pedidos dentro da sessão de oração — 4ª etapa do ACTS, no máximo três, um toque em "Orei". |
| `pd4-arquivar-pedido.png` | **PD4** Como Deus respondeu | Folha com as cinco respostas: Sim, Não, Espere, Aprenda, Se mova. |

## As quatro decisões que definem esta parte

1. **Tempo, não curtidas.** O dado de cada pedido é "orando há 24 dias" / "orado por 61 dias" — é o que faz a pessoa persistir. Não existe curtida, comentário nem feed.
2. **Quem pediu recebe o número, nunca os nomes.** "5 pessoas oraram" e nada além disso. Dito na interface antes de publicar (PD2) para a pessoa não hesitar.
3. **Nenhum pedido é cancelado — é respondido.** Arquivar (PD4) exige escolher entre cinco respostas, cada uma com uma linha que explica; "Não" e "Aprenda" são respostas legítimas, não fracasso.
4. **Os respondidos ficam visíveis.** A seção "Respondidos" em PD1 é a memória do que Deus fez, com o selo da resposta e a frase que a pessoa escreveu.

## Mapa de navegação

```
Meu Plano → "Pedidos de oração" ─────────────→ PD1
PD1 "Novo" ──────────────────────────────────→ PD2 → publica → volta a PD1
PD1 "Arquivar" (só nos pedidos próprios) ────→ PD4 → guarda → vai para "Respondidos"

Sessão de oração (36b/36c) → etapa Súplica ──→ PD3
PD3 "Ver todos" ─────────────────────────────→ PD1 (fora do cronômetro)
PD3 "Fazer um pedido" ───────────────────────→ PD2
PD3 "Concluir e ir para a leitura" ──────────→ próximo passo do dia

Mural do grupo → pedido do grupo ────────────→ mesma linha de PD3, com "Orei" e contador
```

## Ordem de implementação

1. **PD2 + PD1** — criar um pedido e vê-lo na lista. Sem isso nada mais existe.
2. **PD4** — arquivar com resposta e a seção "Respondidos" de PD1 ganhando conteúdo real.
3. **PD3** — os pedidos dentro da sessão de oração, com a regra de três e a ordenação.

Pare depois de cada bloco e mostre a tela ao lado do PNG.

## Os valores mudam de pessoa para pessoa

Tudo escrito nos PNGs é exemplo: "Sabedoria para decidir sobre a mudança de cidade", "orando há 24 dias", "A cirurgia da mãe da Marina, na quinta", "Trabalho para a Juliana", "Grupo Semente · 6 pessoas", "63 / 240". **Nada hardcoded.** O que é idêntico ao quadro é a estrutura: quais blocos existem, em que ordem, com que aparência e para onde levam. Os textos fixos de interface estão marcados no HANDOFF como **fixo**.
