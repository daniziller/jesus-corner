# Prompt para o Claude Code — aba Bíblia, redesenhada

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-biblia-52/` copiada para a raiz do repositório `jesus-corner`.

---

Redesenhe a aba **Bíblia** do Jesus Corner a partir do pacote em `handoff-biblia-52/`: a raiz (B1), o livro (B2), a leitura (B3/B4) e a busca (B5–B7). Elas substituem as telas 39a, 39b, 39c, 39d e 39k. **Nada mais muda no app.**

## Antes de escrever qualquer código

1. Leia por inteiro `handoff-biblia-52/README.md` e `HANDOFF-biblia.md`, e abra os sete PNGs de `screens/`.
2. Leia `handoff-biblia-39/HANDOFF-39-biblia.md` (as regras da aba continuam valendo) e `handoff-gamificacao-43-46/HANDOFF-gamificacao.md` (blocos, cores, selo, conquistas, telas de parabéns).
3. Leia no código, sem alterar nada: as telas atuais da aba Bíblia e todos os componentes que elas usam; a busca atual; `src/data/bibleBlocks.js`; `src/index.css`; `src/components/BottomNav.jsx`; e o que a gamificação já entregou (blocos, `SeloDeLivro`, cálculo de progresso, conquistas).
4. Me responda, **antes de codar**, com:
   - **o pacote de gamificação já está implementado?** Blocos com cores, `SeloDeLivro`, progresso por livro e por bloco, família "Leitura", G2, G8, G10. Se faltar alguma parte de que estas telas dependem, **pare e me diga** — não reimplemente aqui;
   - a lista de componentes e arquivos das telas atuais da aba, e para cada um: **fica, muda ou sai** — e, para os que saem, quais outras telas ainda os usam;
   - de onde vem cada dado: capítulos lidos por livro (no app e marcados à mão), tempo de leitura por livro, data do primeiro capítulo lido de cada livro, notas e marcações por livro, sessão de hoje, última leitura livre (capítulo, versículo, quando), versão atual;
   - **o que falta** — qualquer dado que o HANDOFF pede e o app não guarda (por exemplo, tempo de leitura por livro na leitura livre). Não improvise: me diga e proponha como guardar, ou proponha esconder o número;
   - como a busca funciona hoje: existe índice do texto? Roda no aparelho ou no servidor? Existe tabela de abreviações de livros e de versículos por capítulo? Existe **lista de passagens com nome**? (Se não existir, eu forneço — não invente.)
   - o plano em etapas, na ordem do README.

## Regras de código — para nada quebrar

- **Não reescreva o que funciona.** A seleção de versículo e tudo o que sai dela (39e, 39f, 39g, 39i, 39j), a tela do tema (39l), o seletor de versão, o seletor de livro/capítulo, o menu de três pontos, a marcação por toque longo, "Marcar o livro inteiro", "Começar meu plano aqui" e a leitura pela sessão do plano **não são tocados** — as telas novas só levam até eles.
- **A tipografia do texto bíblico não muda** — fonte, tamanho, entrelinha, número de versículo, realce. B3 só muda o que está em volta do texto.
- **Uma fonte só para blocos e cores:** a mesma que a gamificação usa. Não duplique `data/blocos-da-biblia.json` se o código já tem esses dados; se `bibleBlocks.js` divergir, pare e pergunte.
- **Reaproveite:** `SeloDeLivro`, as funções de progresso por livro/bloco/testamento, o cálculo do próximo degrau, os tokens de `src/index.css`, o botão de voltar, o chevron, as pílulas, os helpers de plural, de número (vírgula decimal, ponto de milhar) e de data. Nenhuma cor solta, nenhuma dependência nova, nenhuma biblioteca de ícones ou de busca sem me perguntar.
- **B3 e B4 são a mesma tela; B5, B6 e B7 são a mesma tela.** O estado sai dos dados e do que está digitado, nunca de rota separada.
- **A tela 39b deixa de existir.** Todo link que levava a ela passa a levar a B1 (com o testamento certo selecionado) ou direto a B2.
- **Lógica em funções puras, com testes**, fora dos componentes:
  - progresso por testamento (lidos, total, faltam, %) e a barra dos oito blocos;
  - o estado de cada pastilha de livro e de cada casa de capítulo;
  - os textos do cartão do livro ("Faltam N capítulos para o selo" e variações) e do botão do rodapé;
  - o terceiro número de B4 (próxima conquista × selo do livro) e a decisão **B4 ou tela de parabéns**;
  - **o interpretador de referências** — teste, no mínimo: "jo 3 16", "jo 3:16", "joao 3.16", "João 3", "1co 13", "1 co 13", "i co 13", "salmo 23", "sl 23 4", "rm 8:28-39", "mt 5-7", "jo" (ambíguo → João, 1 João, Jó, Joel, Jonas, nesta ordem), "jo 3 99" (não existe → sem cartão), "ob 1 4" (livro de um capítulo), texto que não é referência ("pastor");
  - a normalização da busca (acento, caixa, pontuação) e o realce de todas as ocorrências;
  - a montagem dos grupos, das contagens e dos filtros de tipo e de testamento.
- **Busca responsiva:** espera ~250 ms depois da última tecla, cancela a consulta anterior, nunca trava a digitação; lista de versículos em páginas de 30. Buscas recentes ficam só no aparelho.
- **Desempenho da raiz:** são 66 pastilhas; calcule o progresso uma vez e memorize; a troca de testamento não pode recarregar dados.
- **Acessibilidade:** alvos de toque ≥ 44px (as casas de capítulo têm 40px de altura visual; os filtros, 34px; o X de B4, 16px); os cartões de testamento são `role="tab"` com `aria-selected`; cada pastilha anuncia "Gênesis, 40 de 50 capítulos"; o botão do lápis tem `aria-label="Ferramentas"`; o toque longo da grade tem alternativa acessível; o cartão de B4 é anunciado como status e não rouba o foco do texto.
- **Sem código morto.** Aprovadas as telas novas, apague o que só 39a/39b/39c/39d/39k usavam (HANDOFF §7), depois de confirmar que nenhuma outra tela usa. Sem flag, sem TODO, sem versão antiga comentada.
- Rode lint, testes e build ao fim de cada etapa e me mostre a saída. Não avance com teste quebrado.

## Regras de design — para nada sair do quadro

- **Abra o PNG antes e depois de cada tela** e compare bloco por bloco. Os PNGs são o layout final: mesma ordem de blocos, mesmo enquadramento, e todas as medidas do HANDOFF. **Em dúvida de valor, vale `referencia/Jesus Corner Redesign.dc.html`, turno 52**; se o HANDOFF e o arquivo discordarem, pare e me pergunte.
- **B1 — testamentos:** dois cartões lado a lado; **o nome do testamento é o maior elemento do cartão, em duas linhas; a porcentagem é pequena**, logo abaixo; depois a barra, "N de M capítulos lidos" e "faltam K". O selecionado é preto, o outro branco. Não volte ao anel de porcentagem nem ao botão "Abrir".
- **B1 — livros:** **sempre com o nome por extenso**, em duas colunas. Nenhuma sigla, nenhuma abreviação, nenhum corte com reticências. Três estados, conforme a tabela do HANDOFF §2.
- **Cada bloco tem a sua cor, a mesma em todas as telas.** Laranja é só para ação e para "próximo". Progresso nunca é laranja, exceto na barra dos testamentos e no bloco Evangelhos e Atos, cuja cor é o laranja da marca.
- **B3:** o texto fica quase sozinho. Não acrescente cabeçalho, estatística, banner ou botão além do que está na captura.
- **B4 é pequeno e fica embaixo.** Não vire tela cheia, não ganhe confete, emoji, som ou "Parabéns!". Tela cheia continua só para livro completo e conquista.
- **Busca:** os grupos aparecem na ordem do HANDOFF e só quando têm resultado; **o único bloco escuro de B6 é o primeiro tema**; o realce da palavra não tem padding lateral.
- **Texto fixo em português, palavra por palavra**, em tudo o que o HANDOFF marca como fixo — entre eles: "Bíblia", "Livro, referência, palavra ou tema", "SESSÃO DE HOJE · CONTA NO PLANO", "Ler", "Antigo Testamento", "Novo Testamento", "lido", "CAPÍTULOS", "toque abre · segure marca", "lido no app", "marcado à mão", "próximo", "Marcar o livro inteiro como lido", "Começar meu plano aqui", "Marcar como lido", "Leitura livre · não mexe no seu plano", "IR DIRETO A UM TEXTO", "ONDE VOCÊ ESTAVA", "BUSCAS RECENTES", "Limpar", "PASSAGENS MAIS PROCURADAS", "Toda a Bíblia", "IR DIRETO", "TAMBÉM PODE SER", "O CAPÍTULO INTEIRO", "NAS SUAS NOTAS".
- **Texto sobre laranja é `#1A1714`, nunca branco.**
- **Nada hardcoded.** Tudo o que está nas imagens é de uma conta de exemplo, e **os textos bíblicos das capturas são ilustrativos** — o app mostra o texto da versão do usuário. Quando o número muda, a frase muda junto, em português correto: "1 capítulo", "Falta 1 capítulo para o selo", "1 livro completo · 1 bloco começado", "1 de 5 livros", "Ver os 14 versículos", vírgula decimal ("5,4%"), ponto de milhar ("1.189").
- Implemente os estados que o HANDOFF descreve e que não têm captura — **Novo Testamento selecionado, conta nova, carregando (esqueleto, nunca spinner de tela cheia), livro não começado, livro completo, capítulo já lido, busca sem resultado** — e me mostre cada um.
- Não "melhore" o layout, não troque ícone, não adicione seção, não traga de volta o que saiu. Se algo parecer estranho, faltar informação ou conflitar com o código, **pergunte antes de decidir**.

## Como entregar

Siga a ordem do README: (1) B1; (2) B2; (3) B3 + B4; (4) B5 + B7; (5) B6; (6) limpeza.

**Depois de cada etapa, pare** e me mostre: a tela ao lado do PNG correspondente, o checklist do fim do HANDOFF preenchido para aquelas telas, a lista de arquivos criados / alterados / apagados, e a saída de lint, testes e build. Deixe um seletor de debug, só em desenvolvimento, para eu ver cada estado. Só siga para a etapa seguinte depois do meu ok.

Comece pelo levantamento do item 4. Não escreva código ainda.
