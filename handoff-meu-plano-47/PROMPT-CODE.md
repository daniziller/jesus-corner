# Prompt para o Claude Code — Meu Plano, mais simples

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-meu-plano-47/` copiada para a raiz do repositório `jesus-corner`.

---

Redesenhe tudo o que fica dentro da aba **Meu Plano** do Jesus Corner a partir do pacote em `handoff-meu-plano-47/`: a própria aba (P1–P5), uma tela nova chamada "Seu plano" (P6) e o "Ajustar meu plano" (A1–A4). Elas substituem as telas 35a, 35b e 35c. **Nada mais muda no app.**

## Antes de escrever qualquer código

1. Leia por inteiro `handoff-meu-plano-47/README.md` e `HANDOFF-meu-plano.md`, e abra os doze PNGs de `screens/`. Os dois que começam com `ANTES-` são as telas que saem — servem para você localizar no código o que será substituído e conferir que nenhuma função ficou para trás.
2. Leia `handoff-meu-plano-35/HANDOFF-35-meu-plano.md` — as regras dos passos, dos dias por trilha, do ritmo aprendido e de dados continuam valendo, sem exceção.
3. Leia no código, sem alterar nada: a tela atual do Meu Plano, a tela atual de Ajustar e todos os componentes que as duas usam; `src/routine/goals.js`; `src/index.css`; `src/components/BottomNav.jsx`; o fluxo que abre um passo e emenda o seguinte; e como o plano é lido e gravado hoje.
4. Me responda, **antes de codar**, com:
   - a lista de componentes e arquivos que o Meu Plano e o Ajustar atuais usam, e para cada um: **fica, muda ou sai** — e, para os que saem, quais outras telas ainda os usam;
   - onde está a lógica do "botão único que emenda os passos" e como você vai **reaproveitá-la sem reescrever**;
   - como o Ajustar grava hoje (campo a campo ou tudo de uma vez) e como você vai implementar o **rascunho** do HANDOFF §12.1 sem mudar o formato do que é gravado;
   - de onde vem cada dado que as telas novas mostram: passos de hoje e seus minutos, estado de cada passo (feito / em andamento / por vir), hora de conclusão, próximo dia com algo marcado, estudo ativo (nome, dia, total, referência, data de volta da leitura), projeção de término, dias da semana de cada passo, modo da oração e da reflexão, opções do cronômetro, lembrete;
   - **o que falta** — qualquer dado que o HANDOFF pede e o app não guarda hoje (por exemplo, a hora em que cada passo foi concluído, ou se um passo foi aberto e interrompido). Não improvise: me diga e proponha como guardar;
   - o plano em etapas, na ordem do README.

## Regras de código — para nada quebrar

- **P1 a P5: mesma rota, mesmo componente, cinco estados.** O estado sai dos dados (passos de hoje, o que foi feito, se há estudo ativo), nunca de uma flag manual. **A1 a A3: a mesma tela**, com um passo aberto ou nenhum.
- **Não reescreva o que funciona.** O fluxo de abrir um passo e emendar o seguinte, o relógio, o modo mãos-livres, a leitura livre, Organizar a leitura (35i), Organizar o estudo (35j), Estudos (35h), Criar estudo (35d/35e) e a tela de lembrete **não são tocados** — as telas novas só levam até eles. Se precisar mudar a assinatura de alguma função compartilhada, pare e me pergunte.
- **O formato do plano gravado não muda.** O Ajustar novo edita exatamente os mesmos campos que o atual: passo ligado/desligado, minutos, modo, dias de cada passo, as três opções do cronômetro. Nenhum campo novo, nenhuma migração — se achar que precisa de uma, pare e me pergunte.
- **Ajustar trabalha num rascunho.** Nada é gravado antes de "Salvar plano". O cartão da semana, os resumos e o rodapé são derivados do rascunho a cada toque. Voltar com mudanças pede confirmação. O rascunho sobrevive à ida e volta para 35i, 35j e lembrete.
- **As regras de 35c continuam:** pelo menos um entre Leitura e Estudo ligado (explique, não bloqueie em silêncio); minutos de 5 a 60, de 5 em 5; dias independentes por passo; os dias de Leitura e de Estudo continuam editáveis também em 35i e 35j — é o mesmo dado, não uma cópia.
- **A aba Hoje e a barra de abas ficam byte a byte como estão.**
- **Reaproveite tokens, componentes e helpers** que já existem: cores e fontes de `src/index.css`, o botão de voltar, o chevron, o interruptor, o seletor de minutos, os botões de dia, a folha inferior, o ícone de controles, o losango do "Criar", os helpers de data, hora e plural. Nenhuma cor solta, nenhuma dependência nova, nenhuma biblioteca de ícones ou de gráfico — as barras do cartão da semana são `div`.
- **Lógica em funções puras, com testes**, fora dos componentes:
  - o estado do Meu Plano — nada feito; um feito e um por vir; passo aberto e interrompido; tudo feito; dia de descanso; todos os passos desligados; dia de estudo; leitura + estudo no mesmo dia; um passo só; virada de dia;
  - o rótulo do botão e o texto da direita da barra;
  - os minutos de cada dia da semana a partir do plano (e do rascunho), o total semanal e "{n} dias com algo";
  - o resumo de cada passo, incluindo a escrita dos dias ("ter, qui, sáb", "seg a sáb", "todos os dias");
  - a comparação rascunho × salvo: quantas mudanças e a frase do rodapé.
- **Só os passos de hoje entram no caminho do Meu Plano.** Passo desligado ou que não cai hoje não é renderizado — não o esconda com CSS. No Ajustar é o contrário: os quatro passos aparecem sempre, o desligado apagado.
- **Nenhuma linha de passo é tocável no Meu Plano.** No Ajustar, tocar na linha abre o passo e tocar no interruptor liga/desliga — são dois alvos separados.
- **Acessibilidade:** alvos de toque ≥ 44px (inclusive os botões de dia, que têm 38px de altura visual, e o link "Prefiro só ouvir"); o cartão preto do Meu Plano anuncia "Agora, passo 2 de 3, Leitura, 15 minutos"; a barra de progresso tem `role="progressbar"`; cada linha do Ajustar anuncia nome, minutos, ligado/desligado e aberto/fechado; os botões de dia são `aria-pressed`; a folha do cronômetro prende o foco e fecha com voltar.
- **Sem código morto.** Aprovadas as telas novas, apague o que só 35a/35b/35c usavam (lista no HANDOFF §11), depois de confirmar que nenhuma outra tela usa. Sem flag, sem TODO, sem versão antiga comentada.
- Rode lint, testes e build ao fim de cada etapa e me mostre a saída. Não avance com teste quebrado.

## Regras de design — para nada sair do quadro

- **Abra o PNG antes e depois de cada tela** e compare bloco por bloco. Os PNGs são o layout final: mesma ordem de blocos, mesmo enquadramento, e todas as medidas do HANDOFF — paddings, gaps, raios, alturas, pesos, tamanhos e cores. Em dúvida de valor, vale o HANDOFF; se o HANDOFF e o PNG discordarem, **pare e me pergunte**.
- **Meu Plano:** um botão laranja por tela, dentro do cartão preto; nenhum em P3 e P4. O cartão preto é o único elemento grande — passos feitos e por vir são linhas de texto, não cartões. O fio do trilho tem 2px, `#D6CFC7`, acompanha a altura do conteúdo ao lado e não existe no último passo. Os segmentos da barra são **proporcionais aos minutos**.
- **Ajustar:** o cartão preto da semana fica no topo e **não é tocável**; a altura de cada barra é `minutos ÷ 40 × 48px`. **Só um passo aberto por vez**, com contorno de 2px preto. Os dias de um passo ficam **dentro** dele — não recrie o bloco único de dias. O rodapé é fixo, fora da rolagem; sem mudanças o botão fica apagado e diz "Nada para salvar".
- **Texto fixo em português, palavra por palavra**, em tudo o que o HANDOFF marca como fixo — entre eles: "Meu plano", "Ajustar", "AGORA · PASSO {n} DE {total}", "Começar meu plano", "Prefiro só ouvir", "AMANHÃ · {DIA}", "SEU PLANO", "Criar um estudo", "PLANO DE HOJE COMPLETO", "Ler mais, por conta própria", "HOJE É DESCANSO", "Nada marcado para hoje.", "Quero ler hoje mesmo assim", "Retomar já", "Mudar meus dias", "Ajustar meu plano", "SUA SEMANA COM ESTE PLANO", "PASSOS, NA ORDEM DO DIA", "COMO", "QUANTO TEMPO", "EM QUE DIAS", "Os outros dias podem ser do estudo.", "Organizar a leitura", "Organizar o estudo", "Cronômetro", "Vale para a leitura e para o estudo.", "Pronto", "Lembrete diário", "Nada para salvar", "Salvar plano".
- **Texto sobre laranja é `#1A1714`, nunca branco.**
- **Sem cobrança:** nenhum vermelho, alerta, "atrasado", "perdido" ou "você ainda não…".
- **Nada hardcoded.** Tudo o que está nas imagens é de uma conta de exemplo. Quando o número muda, a frase muda junto, em português correto: "1 de 1 passo", "falta 1 min", "1 leitura por semana", "1 dia com algo", "1 mudança", "Oração e leitura", "feita"/"feito" e "Desligada"/"Desligado" concordando com o passo, vírgula decimal ("2,5 min por etapa").
- Implemente os estados e casos extremos das tabelas do HANDOFF §10 e §12.6 — inclusive carregando (esqueleto, nunca spinner de tela cheia), salvando, erro ao salvar, um passo só, quatro passos, passo interrompido e a tentativa de desligar o último entre Leitura e Estudo.
- Não "melhore" o layout, não troque ícone, não adicione seção, não traga de volta o que saiu (a grade de bolinhas, "Esta semana", o cartão do modo mãos-livres, a pílula "40 min / dia", o bloco único de dias). Se algo parecer estranho, faltar informação ou conflitar com o código, **pergunte antes de decidir**.

## Como entregar

Siga a ordem do README: (1) P1 + P2; (2) P3 + P4; (3) P5; (4) P6; (5) A1; (6) A2 + A3; (7) A4; (8) limpeza.

**Depois de cada etapa, pare** e me mostre: a tela ao lado do PNG correspondente, o checklist do fim do HANDOFF preenchido para aquelas telas, a lista de arquivos criados / alterados / apagados, e a saída de lint, testes e build. Deixe um seletor de debug, só em desenvolvimento, que me permita ver cada um dos cinco estados do Meu Plano e os casos extremos. Só siga para a etapa seguinte depois do meu ok.

Comece pelo levantamento do item 4. Não escreva código ainda.
