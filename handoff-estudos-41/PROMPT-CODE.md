# Prompt para o Claude Code — área de Estudos

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-estudos-41/` disponível no projeto.

---

Implemente a **área de Estudos** do Jesus Corner a partir do pacote em `handoff-estudos-41/` — as nove telas que existem depois de tocar em "Estudos".

**Leia primeiro, nesta ordem:** `README.md` (mapa de navegação e ordem de implementação) e `HANDOFF-41-estudos.md` (especificação tela por tela, com os textos fixos, os estados e os tokens). Os dois têm os PNGs embutidos.

## Regra 1 — abra o PNG antes e depois de cada tela

**Antes** de escrever a tela, abra o PNG dela e olhe o quadro inteiro. **Depois** de codar, abra o PNG de novo ao lado do que você fez e compare bloco por bloco. Os nove arquivos:

`41a-estudos-hub.png`, `41b-criar-pedido.png`, `41c-proposta.png`, `41d-dia-aberto.png`, `41e-fim-do-dia.png`, `41f-estudo-por-dentro.png`, `41g-estudo-concluido.png`, `41h-organizar-estudo.png`, `41i-banco-publico.png`.

Os screenshots existem para você entender o **layout**: o que é cada bloco, onde ele fica, o que está dentro do quê, qual é a hierarquia e o estado de cada controle.

## Regra 2 — o layout é exatamente o do quadro

Os PNGs não são referência aproximada, são o layout final. Para cada tela reproduza **exatamente**:

- a **ordem dos blocos** de cima para baixo, sem inserir, remover, agrupar nem reordenar nada;
- o **enquadramento**: o que está dentro de um cartão no quadro fica dentro dele no código;
- **cores, raios, pesos e tamanhos de fonte, alturas de controle, paddings e gaps** conforme os tokens do HANDOFF — inclusive o significado dos fundos: branco é a Bíblia e a pessoa, preto é o app explicando, areia é o que ela leva embora ou a consequência no plano;
- o **texto de interface em português, palavra por palavra**, em tudo que o HANDOFF marca como **fixo** — "Diga o tema e quantos dias — a IA monta e você revisa", "Você pode criar até 4 estudos por mês", "O trecho de hoje", "O que este trecho diz", "Guarde esta", "Fica só com você, a não ser que você mande para o grupo", as duas linhas de conferência do texto bíblico. Esses textos **são** o design;
- os **estados**: dia feito / hoje / futuro, rascunho salvo a meio caminho, cota do mês esgotada, sem estudo ativo, cada toggle no padrão certo (publicar no banco **desligado**, virar pedido de oração **ligado**, devolver os dias à Bíblia **ligado**);
- **tela única com rolagem**, botão primário fixo no rodapé, barra de abas **só em 41a**. Nunca quebre uma tela alta em duas nem em abas — 41d é longa de propósito.

Não "melhore" o layout, não troque ícone, não adicione seção, não mude hierarquia tipográfica. Se algo no quadro parecer estranho ou faltar informação, **pergunte antes de decidir**.

## Regra 3 — os valores mudam de conta para conta; os quadros não

Tudo escrito nas imagens é de uma conta de exemplo: "Ansiedade: o que a Bíblia diz", "dia 2 de 7", "2 de 4 criados em setembro", "Filipenses 4:4-9", "16 minutos", "Pr. João Silva · 12 pessoas fazendo", "382 pessoas seguindo", "1h52 no total", as respostas escritas pelo Diego, as datas de setembro.

**Nada disso hardcoded** — tudo vem do modelo de dados, do texto bíblico e do que o usuário escreveu. O que precisa ser idêntico ao quadro é a **estrutura**: quais blocos existem, em que ordem, com que aparência, em que estado e para onde levam.

Quando o número muda, a frase muda junto, em português correto: "1 dia" / "7 dias", "1 pessoa" / "12 pessoas", "3º de 4 em setembro" / "4 de 4 usados".

## Regra 4 — o que não estiver codado, você escreve

Não simule, implemente:

1. **Gerador de estudo** — do texto livre em 41b saem formato, duração e a proposta de 41c. "Refazer" gera outra proposta inteira; o botão de recarregar de cada linha troca **só aquele trecho**. Nada entra no plano sem aprovação.
2. **Conferência do texto** — todo trecho citado é validado contra a versão da Bíblia do usuário antes de aparecer; o que não bate não entra. As duas linhas de conferência refletem isso.
3. **Cota mensal** — 4 estudos **criados** por mês, por conta, zerando no dia 1º. Seguir estudo do banco, de grupo ou do Jesus Corner é ilimitado; refazer proposta não consome. O saldo aparece em 41a e 41b; esgotada, 41b não abre e o cartão explica.
4. **O dia do estudo (41d)** — ensino gerado **uma vez** e guardado com o dia (não regenerar a cada abertura); rascunho salvo automaticamente; chip de tempo contando sem barra de progresso e sem expiração; segurar versículo abre as ações de versículo da Bíblia; "Concluir" exige resposta escrita ou confirmação de pular.
5. **Respostas guardadas por dia** — com data e duração. É o que alimenta o histórico de 41f, a síntese de 41g e a Biblioteca.
6. **Encadeamento com o plano** — 41e leva ao próximo passo do dia; se o estudo era o último passo, leva ao resumo do dia. No último dia, 41e é substituída por 41g.
7. **Substituir ou somar (41f)** — em dia de estudo a leitura do plano cede o lugar (padrão, e a data de retomada é calculada e mostrada) ou soma (o dia passa a ter 4 passos e +N min). Trocar recalcula as datas na hora e o texto de 41c/41g acompanha.
8. **Agenda própria do estudo (41h)** — dias da semana independentes dos da leitura, com a projeção em semanas; "Encerrar" para antes do fim mantendo o progresso; ao terminar, encadear o próximo salvo e/ou devolver os dias à leitura.
9. **Síntese do fim (41g)** — escrita a partir das respostas dela: assuntos que voltaram, mudança de linguagem, e uma frase dela em destaque. Com menos de 3 respostas escritas, só a frase. Nunca elogio genérico.
10. **Virar pedido de oração (41e)** — a resposta do dia entra nos pedidos de oração do dia seguinte, ligado por padrão.
11. **Banco público (41i)** — busca por situação (não por livro), chips de tema, ordenação com "Mais seguido", contagem real de quem fez, "Ver" abre prévia antes de entrar no plano, e publicação de estudo próprio. **O estado vazio da busca não foi desenhado** — monte na mesma casca e me mostre antes de finalizar.

## Como entregar

Siga a ordem do README: (1) 41a + 41i, (2) 41b + 41c, (3) 41d + 41e, (4) 41f + 41h, (5) 41g. **Depois de cada bloco, pare** e me mostre a tela ao lado do PNG correspondente, com o checklist do fim do HANDOFF preenchido para aquelas telas. Só siga para o bloco seguinte depois do meu ok.
