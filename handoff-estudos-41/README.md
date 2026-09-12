# Estudos — pacote de handoff (turno 41)

Nove telas: tudo o que existe depois de tocar em **Estudos**, na ordem em que a pessoa encontra.

| PNG | Tela | O que é |
|---|---|---|
| `41a-estudos-hub.png` | **41a** Estudos (hub) | Busca, chips de origem, criar, estudo em andamento, Jesus Corner, grupos, banco público. Única tela da área com barra de abas. |
| `41b-criar-pedido.png` | **41b** Criar estudo · o pedido | Limite do mês, o que quer estudar, sugestões, formato, duração, publicar no banco. |
| `41c-proposta.png` | **41c** Proposta | Os 7 dias visíveis, trocar trecho, refazer, começar. |
| `41d-dia-aberto.png` | **41d** O dia do estudo, aberto | Trecho → ensino → versículo → pergunta + resposta. É o miolo da área. |
| `41e-fim-do-dia.png` | **41e** Fim do dia | Resposta devolvida, virar pedido de oração, o próximo dia anunciado, volta ao plano. |
| `41f-estudo-por-dentro.png` | **41f** O estudo por dentro | Os 7 dias com histórico, retomar o dia de hoje, **substituir ou somar à leitura**. |
| `41g-estudo-concluido.png` | **41g** Estudo concluído | Dia 7 de 7: síntese das respostas, a leitura voltando, próximo estudo. |
| `41h-organizar-estudo.png` | **41h** Organizar o estudo | Estudo ativo, dias da semana, o que fazer quando terminar. |
| `41i-banco-publico.png` | **41i** Banco público | Busca por situação, chips de tema, cartões com autor e quantas pessoas fizeram. |

## Mapa de navegação

```
Meu Plano → "Meus estudos"/"Organizar o estudo" ─┬→ 41h (organizar) → 41a
                                                 └→ 41a (hub)
41a  "Criar um estudo" ────────────────→ 41b → 41c → (aprovado) entra no plano
41a  cartão do Jesus Corner/grupo ─────→ prévia do estudo → entra no plano
41a  chip "Públicos" / ver mais ───────→ 41i → prévia → entra no plano
41a  cartão "Em andamento" ────────────→ 41f
Meu Plano (passo Estudo) ──────────────→ 41d → 41e → próximo passo do plano
41f  "Retomar o dia N" ────────────────→ 41d
41e/41f  último dia concluído ─────────→ 41g → volta ao plano
41f/41h  "Mudar dias" / "Salvar" ──────→ 41h
```

## Ordem de implementação

1. **41a + 41i** — listagem e origens (dados de leitura, nada de escrita).
2. **41b + 41c** — criação e aprovação (gerador + cota mensal).
3. **41d + 41e** — o dia sendo feito e o fecho. É o coração; entregue com o encadeamento do plano funcionando.
4. **41f + 41h** — o estudo por dentro, dias e a regra substituir/somar.
5. **41g** — o fim do estudo, que depende de todas as respostas já estarem gravadas.

Pare depois de cada bloco e mostre a tela ao lado do PNG.

## Os valores mudam de conta para conta

Tudo escrito nos PNGs é de uma conta de exemplo: "Ansiedade: o que a Bíblia diz", "dia 2 de 7", "2 de 4 criados em setembro", "Filipenses 4:4-9", "Pr. João Silva", "382 pessoas seguindo", as respostas do Diego. **Nada disso hardcoded.** O que é idêntico ao quadro é a estrutura: quais blocos existem, em que ordem, com que aparência, em que estado e para onde levam. Os textos fixos de interface estão marcados no HANDOFF como **fixo**.
