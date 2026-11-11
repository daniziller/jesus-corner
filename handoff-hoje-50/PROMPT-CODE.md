# Prompt para o Claude Code — Hoje, mais limpo

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-hoje-50/` copiada para a raiz do repositório `jesus-corner`.

---

Redesenhe a aba **Hoje** do Jesus Corner a partir do pacote em `handoff-hoje-50/`. A tela passa de dez blocos para quatro. **Só a aba Hoje muda** (mais um número na aba Comunidade da barra de abas).

Este trabalho pressupõe que a gamificação (`handoff-gamificacao-43-46/`) e o Meu Plano novo (`handoff-meu-plano-47/`) já estão implementados. Se algum dos dois não estiver, **pare e me avise antes de começar**.

## Antes de escrever qualquer código

1. Leia por inteiro `handoff-hoje-50/README.md` e `HANDOFF-hoje.md`, e abra os dois PNGs de `screens/`. `ANTES-hoje.png` é a tela que sai.
2. Leia no código, sem alterar nada: a tela atual do Hoje e todos os componentes que ela usa; `RodaDaBiblia`, `Medalha`, `SeloDeLivro` e o módulo de cálculo da gamificação; a função que diz quais são os passos de hoje e o estado de cada um; o botão do Meu Plano que abre o passo de agora e emenda os seguintes; `src/components/BottomNav.jsx`; `src/index.css`.
3. Me responda, **antes de codar**, com:
   - a lista dos componentes que o Hoje atual usa e, para cada um: **fica, muda ou sai** — e, para os que saem, quais outras telas ainda os usam;
   - qual função existente fornece cada dado da tela nova: percentual da Bíblia, livro atual e capítulos que faltam, semanas na meta, as 12 cápsulas, feitos/meta e o estado de cada dia desta semana, selos ganhos (com data) e o livro em andamento mais adiantado, passos de hoje com estado, minutos e detalhe, "a mais perto" com o progresso, versículo do dia, aplicação de ontem, resumo semanal não lido, mensagens novas;
   - **o que falta** — qualquer dado ou função que o HANDOFF pede e não existe. Não improvise: me diga e proponha;
   - se já existe uma tela ou folha para abrir o versículo do dia com salvar/compartilhar e para abrir a aplicação com "trocar"; se não existir, me diga o que pretende reaproveitar;
   - o plano em etapas, na ordem do README.

## Regras de código — para nada quebrar

- **Nada é calculado de novo.** O Hoje só consome as funções que a gamificação e o Meu Plano já têm. Se precisar de um valor que elas não devolvem, estenda a função existente (com teste) — não escreva uma segunda versão no componente.
- **Um componente por coisa.** A roda de 132px é a mesma `RodaDaBiblia`, com uma prop para o tamanho do texto do centro (HANDOFF §3). As cápsulas são as mesmas do contador, com a altura por prop. Os sete pontos usam o mesmo estado por dia que o contador já calcula. Os selos são o mesmo `SeloDeLivro`. A medalha é a mesma `Medalha`. Não copie SVG para dentro do Hoje.
- **O botão do plano chama a mesma função do Meu Plano** — abrir o passo de agora e emendar os seguintes. Não reimplemente o fluxo.
- **Só os passos de hoje** entram na lista do plano, vindos da mesma função que o Meu Plano usa. Passo fora do dia não é renderizado (não o esconda com CSS). **As linhas não são tocáveis.**
- **"Cumpri" faz exatamente o que o botão do cartão antigo fazia** — mesma chamada, mesmo dado gravado.
- **Barra de abas:** a única mudança é o número na Comunidade. Como a barra é compartilhada, confira que as outras quatro abas e todas as telas que a mostram continuam idênticas.
- **Nenhuma outra tela muda.** Sua Bíblia, Minhas conquistas, Minha estante, Minhas métricas, Meu Plano, Comunidade, a folha de anotação — o Hoje só leva até elas.
- **Reaproveite tokens, componentes e helpers** de `src/index.css` e do projeto (chevron, botão, folha inferior, plural, data). Nenhuma cor solta, nenhuma dependência nova.
- **Testes** para o que for lógica nova: o estado do cartão do plano (nada feito, no meio, passo interrompido, tudo feito, descanso, sem plano, um passo só), o texto da direita do cabeçalho, o rótulo do botão, quais linhas de "Para hoje" aparecem, e o número da Comunidade (0, 1, 99, 100).
- **Desempenho:** o Hoje não pode abrir mais devagar. O cartão do plano pinta primeiro; roda e conquista podem chegar logo depois, com esqueleto.
- **Acessibilidade:** quatro alvos na caminhada — o cartão da Bíblia e os três quadrados — cada um com rótulo ("Sua Bíblia, 4,2% lida, 50 de 1.189 capítulos", "18 semanas na meta", "1 de 4 dias na meta esta semana", "1 selo de 66 livros"); cada passo anuncia nome, minutos e "feito"/"a fazer"; o botão "Cumpri" tem área de 44px; o número da Comunidade entra no rótulo da aba ("Comunidade, 9 mensagens novas"); respeite `prefers-reduced-motion`.
- **Sem código morto.** Aprovada a tela, apague o que só o Hoje antigo usava (lista no HANDOFF §9), depois de confirmar que nenhuma outra tela usa. Sem flag, sem TODO, sem versão antiga comentada.
- Rode lint, testes e build ao fim de cada etapa e me mostre a saída. Não avance com teste quebrado.

## Regras de design — para nada sair do quadro

- **Abra `H1-hoje.png` antes e depois de cada bloco** e compare. O PNG é o layout final: mesma ordem, mesmo enquadramento, e todas as medidas do HANDOFF — paddings, gaps, raios, alturas, pesos, tamanhos e cores. Se o HANDOFF e o PNG discordarem, **pare e me pergunte**.
- **Quatro blocos e nada entre eles:** caminhada (o cartão da Bíblia e os três quadrados Semanas · Dias · Selos) · plano de hoje · próxima conquista · para hoje.
- **Um botão laranja na tela.** Nos estados "tudo feito" e "descanso", o botão do plano é o secundário, translúcido.
- **Círculos do plano:** 20px; a fazer = vazio com contorno de 2px `rgba(255,255,255,.4)`; feito = `#F0662B` cheio com visto `#1A1714`. Nenhum outro estado, nenhuma outra cor.
- **Texto fixo em português, palavra por palavra:** "SUA BÍBLIA", "da Bíblia", "SEMANAS", "na meta", "DIAS", "esta semana", "SELOS", "de 66 livros", "SEU PLANO DE HOJE", "Começar meu plano", "Continuar meu plano", "Ver meu plano", "Plano completo", "Hoje é descanso", "Quero ler hoje mesmo assim", "PRÓXIMA CONQUISTA", "PARA HOJE", "Resumo da sua semana", "Versículo do dia", "Sua aplicação de ontem", "Cumpri", "Cumprida", "Anotar uma pregação", "Abre a Bíblia com a folha de anotação".
- **Texto sobre laranja é `#1A1714`, nunca branco.**
- **Nada hardcoded.** Tudo nas imagens é de uma conta de exemplo. Quando o número muda, a frase muda junto, em português correto: "1 semana na meta", "falta 1 capítulo", "1 passo", "falta 1 min", "falta 1 h", "feita"/"feito" concordando com o passo, vírgula decimal e ponto de milhar.
- **Não traga de volta o que saiu:** o parágrafo do plano, os três quadrados de minutos, a legenda de oito blocos, a fileira grande de sete dias, o parágrafo do contador, a faixa do livro, quadros areia dentro de cartão, os dois quadrados, os cartões areia. Não acrescente pontos, nível, ranking, sequência, vermelho, confete ou emoji.
- Implemente os estados e casos extremos do HANDOFF §4 e §8 — inclusive carregando (esqueleto, nunca spinner de tela cheia), conta nova, sem plano, tudo conquistado e linhas condicionais de "Para hoje".
- Não "melhore" o layout, não troque ícone, não adicione seção. Se algo parecer estranho, faltar informação ou conflitar com o código, **pergunte antes de decidir**.

## Como entregar

Siga a ordem do README: (1) a caminhada — cartão da Bíblia e três quadrados; (2) cartão do plano, nos cinco estados; (3) próxima conquista; (4) lista "Para hoje" e o número na Comunidade; (5) limpeza.

**Depois de cada etapa, pare** e me mostre: a tela ao lado do PNG, o checklist do fim do HANDOFF preenchido para aquele bloco, a lista de arquivos criados / alterados / apagados, e a saída de lint, testes e build. Deixe um seletor de debug, só em desenvolvimento, para eu ver os cinco estados do plano e os casos extremos. Só siga para a etapa seguinte depois do meu ok.

Comece pelo levantamento do item 3. Não escreva código ainda.
