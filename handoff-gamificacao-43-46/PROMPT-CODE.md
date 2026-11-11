# Prompt para o Claude Code — gamificação

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-gamificacao-43-46/` copiada para a raiz do repositório `jesus-corner`.

---

Implemente a **gamificação** do Jesus Corner a partir do pacote em `handoff-gamificacao-43-46/`: a roda da Bíblia, o contador de semanas, as conquistas e a estante de selos.

## Antes de escrever qualquer código

1. Leia por inteiro `handoff-gamificacao-43-46/README.md` e `HANDOFF-gamificacao.md`, e abra os onze PNGs de `screens/`.
2. Leia no código atual, sem alterar nada: `src/index.css` (tokens), `src/components/BottomNav.jsx`, `src/data/bibleBlocks.js`, `src/utils/levels.js`, `src/routine/goals.js`, a tela da aba Hoje e tudo o que hoje grava capítulo lido, duração de sessão, meta semanal e "Orei" em pedido de oração.
3. Me responda, **antes de codar**, com:
   - onde cada um destes dados mora hoje e em que formato: capítulos lidos (com data), duração por sessão e por passo, meta semanal e seu histórico, dias com plano cumprido, "Orei" em pedidos de outros, versículos destacados e notas por livro;
   - **o que falta** — qualquer dado que o HANDOFF exige e o banco não guarda. Não improvise um substituto: me diga e proponha a migração;
   - como `src/data/bibleBlocks.js` divide a Bíblia hoje e se bate com os oito blocos de `data/blocos-da-biblia.json`. Se a divisão for outra, **pare e pergunte** — não troque em silêncio, porque outras telas podem depender dela;
   - o que `src/utils/levels.js` faz hoje e onde é usado. O sistema novo **não tem níveis nem pontos**; me diga o que seria removido e onde isso aparece, e espere meu ok antes de apagar;
   - o plano em etapas, na ordem do README.

## Regras de código — para nada quebrar

- **Não mude nenhuma tela além das listadas.** Na aba Hoje saem **só** o cartão "ESTA SEMANA" e entram **só** os cartões SUA BÍBLIA e SUAS SEMANAS, na posição dele. Cabeçalho, plano do dia, versículo, aplicação de ontem, os dois quadrados, "Anotar uma pregação", "SUA SEMANA" e a barra de abas ficam **byte a byte** como estão.
- **Reaproveite, não duplique.** Use os tokens, componentes, helpers de data e de plural que o projeto já tem. Variável nova só para o que não existe (as cores e os tons dos oito blocos). Nenhuma cor solta no meio de componente.
- **Nenhuma dependência nova.** A roda e as medalhas são SVG escritos à mão, com a geometria exata do HANDOFF (§2 e §5.2). Nada de biblioteca de gráfico, de animação ou de ícones.
- **Um componente por coisa**, reutilizado em todo lugar: uma `RodaDaBiblia` (Hoje 250px, Sua Bíblia 300px, miniaturas 92px), uma `Medalha` (família, degrau, tamanho, ganha/não ganha, sobre claro/sobre escuro), um `SeloDeLivro` (três estados). Não copie o SVG de tela em tela.
- **O cálculo fica fora da interface.** Funções puras — progresso por livro e por bloco, semanas na meta, degrau de cada família, conquistas ganhas, "a mais perto", estimativa de data — num módulo próprio, **com testes unitários** cobrindo: conta nova, livro completo, bloco completo, releitura, capítulo desmarcado, troca de meta semanal, virada de semana e de fuso, limiares exatos (9/10, 10/10, 11/10).
- **Semana** é de segunda a domingo no fuso do usuário. Use o mesmo helper de data que o plano já usa; não crie outro.
- **Conquista ganha é gravada e nunca mais removida.** Guarde id, data em que foi ganha e se já foi vista. Desmarcar um capítulo recalcula a roda e os contadores, mas não tira conquista nem selo.
- **Migração retroativa silenciosa** (HANDOFF §7): na primeira execução, calcule o que a pessoa já tem, grave como ganho **e já visto**. Nenhuma fila de parabéns atrasados. A migração tem que ser idempotente — rodar duas vezes não duplica nada.
- **Um parabéns por sessão**, depois da tela de conclusão que já existe, nunca no lugar dela, nunca no meio de uma sessão. Prioridade e regras em §7.
- **Desempenho:** a roda tem 132 paths; calcule a geometria uma vez (memo) e recalcule só quando o progresso muda. O Hoje não pode ficar mais lento para abrir — se o cálculo das conquistas for pesado, faça-o depois da primeira pintura.
- **Acessibilidade e movimento:** `aria-label` na roda e nas medalhas; alvos de toque ≥ 44px; respeite `prefers-reduced-motion`.
- **Sem código morto:** apague o componente de "ESTA SEMANA" e o que só ele usava. Não deixe flag, TODO ou versão antiga comentada.
- Rode o lint, os testes e o build ao fim de cada etapa e me mostre o resultado. Não avance com teste quebrado.

## Regras de design — para nada sair do quadro

- **Abra o PNG antes e depois de cada tela** e compare bloco por bloco. Os PNGs são o layout final, não uma referência aproximada: mesma ordem de blocos, mesmo enquadramento, mesmas cores, raios, pesos, tamanhos, alturas, paddings e gaps do HANDOFF.
- **Texto fixo em português, palavra por palavra**: "SUA BÍBLIA", "Ver livros", "SUAS SEMANAS", "semanas na meta", "esta semana", "12 semanas atrás", "agora", a frase do contador, "NOVA CONQUISTA", "LIVRO COMPLETO", "Parabéns, você leu {Livro}.", "A MAIS PERTO", "Próxima:", "O PRÓXIMO SELO", "COMO A RODA VAI FICANDO", "O VERSÍCULO QUE VOCÊ MARCOU", "Leituras deste livro", os nomes das cinco famílias, dos trinta degraus e dos oito blocos.
- **As cores de bloco são um contrato**: o mesmo bloco tem exatamente a mesma cor na roda, na legenda, na estante, no selo e na medalha de bloco. Os Evangelhos usam o laranja da marca.
- **O que este sistema não tem, em tela nenhuma:** pontos, XP, nível, ranking, sequência ("streak"), comparação com outras pessoas, vermelho ou X em dia perdido, confete, emoji, som, "Incrível!". Se sentir falta de algo assim, a ausência é intencional — pergunte antes de acrescentar.
- `G2b`, `G3` e `G7` são **referências**, não telas: G2b mostra só a roda no modo Capítulos, G3 é o cartão do contador ampliado, G7 é a tabela das 38 conquistas.
- Tudo o que está escrito nas imagens é de uma conta de exemplo ("4,2%", "18", "10 de 38", "Jonas", "Diego", "fevereiro"). **Nada hardcoded.** Quando o número muda, a frase muda junto, em português correto ("1 semana na meta", "falta 1 capítulo"), com vírgula decimal e ponto de milhar.
- Implemente os estados e casos extremos da tabela do HANDOFF §8 — conta nova, carregando (esqueleto, nunca spinner de tela cheia), Bíblia inteira, releitura, capítulo desmarcado, meta alterada.
- Não "melhore" o layout, não troque glifo, não adicione seção. Se algo parecer estranho, faltar informação ou conflitar com o código que existe, **pergunte antes de decidir**.

## Como entregar

Siga a ordem do README: (1) dados e cálculo com testes, sem UI; (2) a roda — Hoje e Sua Bíblia; (3) o contador de semanas; (4) conquistas — G5, G6, G4; (5) selos — G9, G10, G8.

**Depois de cada etapa, pare** e me mostre: a tela ao lado do PNG correspondente, o checklist do fim do HANDOFF preenchido para aquelas telas, a lista de arquivos criados/alterados/apagados, e a saída de lint, testes e build. Para as telas de parabéns e os estados, deixe um seletor de debug (só em desenvolvimento) que me permita ver cada um. Só siga para a etapa seguinte depois do meu ok.

Comece pelo levantamento do item 3. Não escreva código ainda.
