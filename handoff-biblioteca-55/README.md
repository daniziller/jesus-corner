# Aba Biblioteca e página de anotação — pacote de handoff (turnos 55–56)

A aba **Biblioteca** como um **índice por tipo** — cada tipo de anotação com a sua contagem e a sua própria tela — e uma **busca completa** dentro do que a pessoa guardou. Substitui a tela **4c** (lista única com quatro filtros).

Inclui também **a página onde as anotações são feitas** (turno 56): a folha "Nova", a página de escrever, os detalhes, a nota de versículo e a anotação guardada. Elas substituem **34f**, **34g**, **34h** (de `handoff-anotacao-34/`) e **39f** (de `handoff-biblia-39/`), e acrescentam a **anotação livre**, que não existia.

**Continua valendo, sem mudança:** a folha de anotação sobre o texto da Bíblia e o lápis flutuante (34d, 34e), a marcação (39e), a reflexão do plano (S4 / 37b), a frase do dia, as perguntas guardadas da IA, os estudos (35d, 35e, 35h, pacote `handoff-estudos-41/`), e **todas as regras de `handoff-anotacao-34/`** — sem botão "Salvar", rascunho que persiste, síntese só com as palavras da pessoa, sem síntese abaixo de ~40 palavras.

**A oração nunca entra na Biblioteca** — nem na lista, nem na busca, nem na contagem.

**Depende de:** `handoff-gamificacao-43-46/` e `handoff-biblia-52/` só para as **cores dos blocos da Bíblia** (usadas no agrupamento de Marcações por livro) e para o interpretador de referências da busca. Se não estiverem implementados, me avise.

## Telas

| PNG | Tela | O que é |
|---|---|---|
| `screens/L1-biblioteca-raiz.png` | **L1** Biblioteca · raiz | Busca, total, seis tipos em quadrados, estudos, recentes. |
| `screens/L2-pregacoes.png` | **L2** Um tipo · Pregações | A lista do tipo, com filtro e agrupamento por mês. |
| `screens/L3-marcacoes.png` | **L3** Um tipo · Marcações | Agrupadas por livro. |
| `screens/L4-busca-ao-abrir.png` | **L4** Busca · ao abrir | Antes de digitar. |
| `screens/L5-busca-resultados.png` | **L5** Busca · resultados | Separados por tipo. |

| `screens/N1-nova.png` | **N1** "Nova" · o que guardar | A folha do botão "Nova". |
| `screens/N2-escrevendo.png` | **N2** Escrevendo | A página de escrever, para qualquer tipo. |
| `screens/N3-detalhes.png` | **N3** Detalhes da anotação | Tipo, de onde veio, etiquetas, quem vê. |
| `screens/N4-nota-versiculo.png` | **N4** Nota em um versículo | A nota curta, presa ao versículo. |
| `screens/N5-anotacao-guardada.png` | **N5** A anotação guardada | O que abre ao tocar numa anotação na Biblioteca. |

L4 e L5 são **a mesma tela** em dois estados. O teclado não está desenhado em nenhuma captura.

**Há cinco telas de tipo sem captura** — Notas, Reflexões, Aplicações, Perguntas e Estudos. O HANDOFF (§5) descreve cada uma a partir das peças de L2 e L3. **Monte e me mostre antes de seguir**; não invente layout novo.

`referencia/Biblioteca 55.dc.html` (L1–L5) e `referencia/Anotar 56.dc.html` (N1–N5) têm as telas com todos os estilos inline — **são a fonte de verdade para qualquer valor** (abra no navegador; precisam do `support.js` ao lado).

## Os sete tipos

| Tipo | O que é | De onde vem | Abre em |
|---|---|---|---|
| **Notas** | Texto preso a um versículo | N4 | Bíblia, no versículo, com a nota aberta |
| **Marcações** | Trecho grifado, com ou sem nota | 39e | Bíblia, no versículo |
| **Reflexões** | O que foi escrito no passo Reflexão | S4 / 37b | A reflexão do dia, em leitura |
| **Pregações** | Anotações de sermão, culto, aula… e as **anotações livres** | N2 / 34d | A anotação guardada (N5) |
| **Aplicações** | As frases do dia | pergunta 3 da reflexão | A reflexão daquele dia |
| **Perguntas** | Perguntas à IA que a pessoa guardou | 39j / 10f | A conversa guardada |
| **Estudos** | Em andamento, salvos e concluídos | 35d–35h | O estudo (35b / 35h) |

Uma marcação **com nota** aparece em Marcações (com a nota embaixo) e **não** é contada de novo em Notas.

## O que sai, o que entra

| Antes (4c) | Agora |
|---|---|
| Uma lista só, com tudo misturado | Raiz com um quadrado por tipo + só os 3 mais recentes |
| Filtros Todas · Notas · Marcações · Estudos | Cada tipo tem a sua tela; os filtros ficam dentro dela |
| Campo "Buscar nas suas anotações" que filtra a lista | Tela de busca própria, com tipo, livro, período, pregador e etiqueta |
| Linha "Estudo: Filipenses" no meio da lista | Cartão preto "Estudos" com o que está em andamento |
| Botão flutuante "+" | Botão "Nova" no cabeçalho |

## Mapa de navegação

```
Biblioteca · raiz (L1)
 ├ campo de busca ─────────────────→ L4
 ├ "Nova" ─────────────────────────→ N1
 ├ cartão do total ────────────────→ não é tocável
 ├ quadrado de um tipo ────────────→ a tela daquele tipo (L2, L3 e as de §5)
 ├ cartão "Estudos" ───────────────→ tela Estudos
 ├ "Ver tudo" ─────────────────────→ L5 sem termo, filtro "Tudo", ordenado por data
 └ um item recente ────────────────→ o destino do tipo (tabela acima)

Tela de um tipo
 ├ lupa ───────────────────────────→ L4 já com aquele tipo selecionado em "Buscar em"
 ├ um item ────────────────────────→ o destino do tipo
 ├ L2: uma referência (Gn 39:21) ──→ Bíblia naquele versículo
 └ segurar um item ────────────────→ menu que já existe (editar · compartilhar · apagar)

"Nova" (N1)
 ├ Anotação livre ─────────────────→ N2 em branco, tipo "Livre"
 ├ Anotar uma pregação ────────────→ N3 (escolher tipo e de onde veio) → "Pronto" → N2
 ├ Nota em um versículo ───────────→ seletor de livro/capítulo/versículo → N4
 ├ Criar um estudo ────────────────→ 35d (sem mudança)
 └ rascunho ───────────────────────→ N2 naquele rascunho

Escrevendo (N2)
 ├ seta para baixo ────────────────→ fecha; o rascunho fica guardado
 ├ pastilha do tipo / "# n" ───────→ N3
 ├ "n passagens" ──────────────────→ lista das passagens citadas (folha)
 ├ "+ Versículo" ──────────────────→ seletor de versículo; entra como bloco areia
 ├ "abrir" num bloco areia ────────→ Bíblia naquele versículo, com o lápis flutuante (34e) para voltar
 └ "Finalizar" ────────────────────→ N5

A anotação guardada (N5)
 ├ uma passagem ───────────────────→ Bíblia naquele versículo
 ├ "Marcar na Bíblia" ─────────────→ marca as passagens (como em 34h)
 ├ "Ler a anotação inteira" ───────→ N2 em modo leitura
 ├ "Quem vê" ──────────────────────→ N3, na seção "Quem vê"
 ├ três pontos ────────────────────→ Editar detalhes · Compartilhar · Apagar
 └ "Continuar escrevendo" ─────────→ N2

Busca (L4 / L5)
 ├ etiqueta ou busca recente ──────→ preenche e busca
 ├ Livro / Período / Pregador ─────→ folha de escolha
 ├ um resultado ───────────────────→ o destino do tipo
 └ "Ver as N …" ───────────────────→ a mesma tela com o filtro daquele tipo
```

## Ordem de implementação

1. **L1** — a raiz.
2. **L3 e L2** — Marcações e Pregações (as duas com captura).
3. **As outras cinco telas de tipo** (§5) — me mostre cada uma.
4. **L4** — a busca ao abrir, com os filtros.
5. **L5** — os resultados.
6. **N2 + N3** — a página de escrever e os detalhes.
7. **N1 e N4** — a folha "Nova" e a nota de versículo.
8. **N5** — a anotação guardada.
9. **Limpeza** — apagar 4c e o que só 34f/34g/34h/39f usavam.

Pare depois de cada etapa e mostre a tela ao lado do PNG.

## Os valores mudam de conta para conta

"128", "23 livros", "9 este mês", as contagens dos quadrados, "Filipenses · dia 2 de 6", os títulos, pregadores, datas, trechos, etiquetas, "espera", "18" — **nada hardcoded**. Os textos das anotações nas capturas são exemplos.
