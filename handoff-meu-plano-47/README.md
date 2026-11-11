# Meu Plano — pacote de handoff completo (turnos 47–49)

Tudo o que foi redesenhado dentro da aba **Meu Plano**: a própria aba, a tela nova "Seu plano" e o "Ajustar meu plano". Substitui `35a`, `35b` e `35c` do pacote `handoff-meu-plano-35/`.

**Continua valendo daquele pacote, sem mudança:** Organizar a leitura (35i), Organizar o estudo (35j), Estudos (35h), Criar estudo (35d/35e), a leitura com relógio (35f/35g), a tela de lembrete e todas as regras de dados, de passos, de dias por trilha e de ritmo aprendido.

## A ideia

- **Meu Plano** mostra **uma coisa para fazer**: o passo de agora, num cartão preto, com o único botão da tela. O que já foi feito encolhe para uma linha; o que vem depois fica pequeno.
- **Seu plano** guarda o que é para consultar: onde a leitura está, quando termina, a semana por extenso.
- **Ajustar** mostra o resultado em cima — a semana que o plano produz — e os passos embaixo, **um aberto de cada vez**, com o modo, o tempo e os dias de cada passo no mesmo lugar.

## Telas

| PNG | Tela | O que é |
|---|---|---|
| `screens/P1-meu-plano.png` | **P1** Meu Plano · no meio do dia | Um passo feito, um em andamento, um por vir. |
| `screens/P2-antes-de-comecar.png` | **P2** Meu Plano · antes de começar | Nenhum passo feito. Botão "Começar meu plano". |
| `screens/P3-dia-completo.png` | **P3** Meu Plano · dia completo | Todos os passos feitos. Sem botão laranja. |
| `screens/P4-dia-de-descanso.png` | **P4** Meu Plano · dia de descanso | Dia sem nada marcado. |
| `screens/P5-dia-de-estudo.png` | **P5** Meu Plano · dia de estudo | Estudo no caminho; leitura contínua pausada. |
| `screens/P6-seu-plano.png` | **P6** Seu plano | Tela nova, aberta pela linha "Seu plano". |
| `screens/A1-ajustar.png` | **A1** Ajustar · tudo fechado | A semana em cima, os quatro passos em linhas. |
| `screens/A2-ajustar-leitura-aberta.png` | **A2** Ajustar · Leitura aberta | Um passo aberto, com mudanças ainda não salvas. |
| `screens/A3-ajustar-oracao-aberta.png` | **A3** Ajustar · Oração aberta, Reflexão desligada | O seletor de modo e o passo desligado. |
| `screens/A4-cronometro.png` | **A4** Cronômetro | Folha aberta pela linha "Cronômetro". |
| `screens/ANTES-35a-meu-plano.png` | referência | O Meu Plano que sai. **Não implemente.** |
| `screens/ANTES-35c-ajustar.png` | referência | O Ajustar que sai. **Não implemente.** Serve para conferir que nenhuma função ficou para trás. |

P1 a P5 são **a mesma rota e o mesmo componente** em cinco estados. A1 a A3 são **a mesma tela** em três estados.

## O que sai, o que entra, para onde foi

**Meu Plano (35a/35b → P1–P5)**

| Antes | Agora |
|---|---|
| Botão **Criar** no cabeçalho | Linha **"Criar um estudo"**, no cartão "Meus estudos" |
| **"Ajustar meu plano"** dentro do bloco | Botão **Ajustar** no cabeçalho |
| Bloco "SEU PLANO DE HOJE" + pílula "30 min no total" | Barra em segmentos + "N de M passos · faltam X min" |
| Lista branca com os 4 passos | **Caminho vertical**: linha feita · cartão preto · linha por vir |
| Linha de passo desligado / "hoje não é dia de…" | **Não aparece** |
| Bloco preto "Continuar meu plano" | Botão laranja **dentro do cartão do passo de agora** |
| Cartão "Modo mãos-livres" | Link **"Prefiro só ouvir"**, no cartão do passo de agora |
| Cartão "Seu plano" com a grade de bolinhas | **Uma linha** → tela **P6**, com a semana por extenso |
| Cartão "Esta semana" | **Sai** — o contador de semanas do Hoje já mostra |
| — | Cartão areia **"Amanhã"** |

**Ajustar (35c → A1–A4)**

| Antes | Agora |
|---|---|
| Pílula "40 min / dia" (soma de tudo) | Cartão preto com **os minutos de cada dia da semana** |
| Um cartão com os quatro passos sempre abertos | Quatro linhas; **um passo aberto por vez** |
| Bloco areia "DIAS DA SEMANA" com 4 fileiras | Os dias de cada passo **dentro do próprio passo** ("EM QUE DIAS") |
| Cartão "CRONÔMETRO" na rolagem | Linha "Cronômetro" → folha **A4** |
| Cartão areia de projeção no fim | Rodapé do cartão preto, no topo |
| Botão "Salvar plano" sempre aceso | Apagado sem mudanças; com mudanças, diz o que vai salvar |

## Mapa de navegação

```
Meu Plano (P1–P5)
 ├ Ajustar (cabeçalho) ───────────────→ A1, tudo fechado
 ├ botão laranja do cartão preto ─────→ abre o passo de agora e emenda os seguintes
 ├ "Prefiro só ouvir" ────────────────→ modo mãos-livres, a partir do passo de agora
 ├ linha "Seu plano" ─────────────────→ P6
 ├ "Meus estudos" ────────────────────→ estudos salvos e concluídos (como hoje)
 ├ "Criar um estudo" ─────────────────→ Criar estudo (35d)
 ├ "Ler mais, por conta própria" (P3) ─→ leitura livre
 ├ "Quero ler hoje mesmo assim" (P4) ──→ leitura livre
 └ "Retomar já" (P5) ─────────────────→ confirmação simples → devolve a leitura contínua

Seu plano (P6)
 ├ Ajustar (cabeçalho) ───────────────→ A1, tudo fechado
 ├ "Mudar meus dias" ─────────────────→ A1 com a Leitura aberta, em "EM QUE DIAS"
 ├ "Organizar a leitura" ─────────────→ 35i
 └ "Lembrete diário" ─────────────────→ tela de lembrete (como hoje)

Ajustar (A1–A3)
 ├ linha de um passo ─────────────────→ abre o passo ali mesmo (fecha o que estava aberto)
 ├ interruptor de um passo ───────────→ liga/desliga, sem abrir
 ├ "Organizar a leitura" (na Leitura) ─→ 35i
 ├ "Organizar o estudo" (no Estudo) ───→ 35j
 ├ "Cronômetro" ──────────────────────→ A4 (folha)
 ├ "Lembrete diário" ─────────────────→ tela de lembrete (como hoje)
 ├ "Salvar plano" ────────────────────→ grava e volta para de onde veio
 └ voltar com mudanças ───────────────→ "Sair sem salvar?" Salvar / Descartar
```

## Ordem de implementação

1. **P1 + P2** — o caminho, o cartão preto, o botão único, a barra de progresso.
2. **P3 + P4** — dia completo e dia de descanso.
3. **P5** — dia de estudo e a pausa da leitura.
4. **P6** — a tela "Seu plano".
5. **A1** — Ajustar fechado: o cartão da semana, as quatro linhas, o rascunho e o rodapé.
6. **A2 + A3** — passo aberto (modo, tempo, dias, atalhos), passo desligado, a entrada por "Mudar meus dias".
7. **A4** — a folha do cronômetro.
8. **Limpeza** — apagar o que 35a/35b/35c usavam e ninguém mais usa.

Pare depois de cada etapa e mostre a tela ao lado do PNG.

## Os valores mudam de conta para conta

"Terça, 2 de setembro", "1 de 3 passos", "faltam 20 min", "feita às 6:42", "Gênesis 41", "Ansiedade · dia 2 de 7", "2 de 6 dias", "6 dias com algo", "2 h 45 por semana", "março de 2029", "25 / 30 / 35 / 15", "2 mudanças · leitura de 20 min, sábado sem leitura", "6:30" — **nada hardcoded**. Idêntico ao quadro é a estrutura.
