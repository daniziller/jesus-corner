# Prompt para o Claude Code — aba Biblioteca e página de anotação

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-biblioteca-55/` copiada para a raiz do repositório `jesus-corner`.

---

Redesenhe a aba **Biblioteca** do Jesus Corner e **a página onde as anotações são feitas**, a partir do pacote em `handoff-biblioteca-55/`: a raiz por tipo (L1), as telas de cada tipo (L2, L3 e as cinco descritas no HANDOFF §5), a busca (L4/L5), e a folha "Nova" (N1), a página de escrever (N2), os detalhes (N3), a nota de versículo (N4) e a anotação guardada (N5). Elas substituem as telas 4c, 34f, 34g, 34h e 39f. **Nada mais muda no app.**

## Antes de escrever qualquer código

1. Leia por inteiro `handoff-biblioteca-55/README.md` e `HANDOFF-biblioteca.md`, abra os dez PNGs de `screens/` e abra no navegador `referencia/Biblioteca 55.dc.html` e `referencia/Anotar 56.dc.html` — são a fonte de verdade para cores, tamanhos e espaçamentos. Leia também `handoff-anotacao-34/HANDOFF-34-anotacao.md`: as regras de lá (rascunho que persiste, sem "Salvar", síntese só com as palavras da pessoa) continuam valendo.
2. Leia no código, sem alterar nada: a tela atual da Biblioteca e seus componentes; onde e como cada tipo é gravado — nota de versículo, marcação, reflexão, anotação de pregação, frase do dia, pergunta guardada, estudo; a busca atual da Biblioteca; a busca da Bíblia e o interpretador de referências, se já existirem; `src/data/bibleBlocks.js`; `src/index.css`; `src/components/BottomNav.jsx`.
3. Me responda, **antes de codar**, com:
   - para **cada um dos sete tipos**: a tabela/coleção, os campos, se tem data, referência bíblica, versão e etiqueta, e qual tela abre hoje ao tocar. Diga se algum tipo **não existe** como dado próprio (por exemplo, Aplicações ou Perguntas);
   - como uma marcação com nota é guardada (um registro ou dois), para ela não ser contada duas vezes;
   - **as três perguntas de "Em aberto" (HANDOFF §8):** como o tipo da anotação é guardado e se "Livre" cabe sem migração; o que é preciso para a anotação longa ter as mesmas etiquetas da nota de versículo; como a busca atual casa palavras, e se é viável encontrar variações ("espera" → "espero");
   - como a página de escrever funciona hoje: como o texto é guardado (blocos? texto com marcações?), como o versículo citado e o tópico são representados, quando o rascunho é gravado, como o tempo anotando é contado, como o ditado funciona;
   - como "Levar ao grupo" (34h) e "Compartilhar em um grupo" (39f) publicam hoje, para "Quem vê" reaproveitar a mesma chamada;
   - como a busca funciona hoje: no aparelho ou no servidor, com índice ou varrendo; quanto custa buscar nos sete tipos de uma vez;
   - a lista de componentes e arquivos da tela atual, e para cada um: **fica, muda ou sai** — e quais outras telas usam os que saem;
   - **o que falta** — qualquer dado que o HANDOFF pede e o app não guarda. Não improvise: me diga e proponha;
   - o plano em etapas, na ordem do README.

## Regras de código — para nada quebrar

- **L1–L5 só listam, buscam e abrem.** Fora das telas N1–N5, não mude como nenhum tipo é criado, editado ou gravado; não crie campo, tabela ou migração sem me perguntar. A folha sobre a Bíblia e o lápis flutuante (34d, 34e), a marcação (39e), a reflexão e os estudos **não são tocados**.
- **N1–N5 trocam a apresentação, não o formato do dado.** O texto, os versículos citados, os tópicos, o rascunho, o ditado, a síntese e a publicação no grupo continuam gravados e gerados como hoje. Uma anotação antiga precisa abrir na página nova sem perder nada — inclua um teste com anotações reais de formato antigo.
- **Não existe botão "Salvar".** N2 e N4 gravam ao pausar; fechar nunca perde texto; "Pronto" e "Finalizar" só navegam. Teste: fechar o app no meio da escrita e reabrir.
- **"Quem vê" nasce em "Só eu", sempre**, em N3 e N4. Nada vai a grupo sem a pessoa escolher o grupo; as etiquetas nunca vão. Inclua testes que provem.
- **Uma página de escrever para todos os tipos.** N2 é um componente só; o tipo muda o que vem preenchido, não a tela.
- **A oração nunca entra na Biblioteca** — nem na lista, nem nas contagens, nem na busca. Inclua um teste que prove.
- **Só o que é do usuário logado.** Nenhuma consulta desta aba pode devolver conteúdo de grupo ou de outra pessoa. Inclua um teste que prove.
- **Contagens em um lugar só.** O total, os seis quadrados, os resumos das telas de tipo e as contagens dos filtros saem das mesmas funções. O total é a soma dos seis tipos (estudos fora). Marcação com nota conta uma vez, em Marcações.
- **Itens de "Em aberto":** não crie o tipo "Livre", não estenda as etiquetas à anotação longa e não troque o motor de busca antes de me responder as perguntas do HANDOFF §8 e eu aprovar.
- **Reaproveite:** o interpretador de referências e a normalização (acento, caixa, pontuação) da busca da Bíblia; as cores dos blocos; a folha inferior; o segmentado; o botão de voltar; o chevron; os helpers de data ("hoje", "ontem", "há 3 dias", "dom, 8 nov"), de plural e de número; os tokens de `src/index.css`. Nenhuma cor solta, nenhuma dependência nova, nenhuma biblioteca de busca sem me perguntar.
- **L4 e L5 são a mesma tela.** O estado sai do que está digitado e dos filtros, nunca de rota separada. Voltar de um resultado devolve a busca como estava (termo, filtros, rolagem).
- **Lógica em funções puras, com testes**, fora dos componentes:
  - as contagens por tipo e o total (inclusive conta nova e marcação com nota);
  - "os três mais recentes" e o título de cada tipo em "Recentes";
  - os filtros de Pregações (só tipos usados, ordem) e o agrupamento por mês e por pregador;
  - Marcações por livro (ordem canônica, dois por livro, "Ver os N"), por data e com nota;
  - a busca: normalização, várias palavras, expressão entre aspas, referência ("gn 39", "jo 3 16"), combinação de tipo + livro + período + pregador, contagens por tipo coerentes com os grupos, ordem dos grupos, "dois por grupo" em Tudo, paginação de 30, realce de todas as ocorrências (no trecho e na nota).
- Também em funções puras, com testes: a numeração dos tópicos (criar, apagar no meio, Enter em tópico vazio); inserir e apagar um versículo citado como unidade; a contagem de passagens, pontos, palavras e minutos de N5; o que aparece e o que some em N5 (menos de ~40 palavras, sem tópicos, sem passagens); a segunda linha do cabeçalho de N2; a seleção de "Quem vê" ("Só eu" desmarca grupos; vários grupos); a linha do rascunho em N1.
- **Teclado:** em N2 a barra de ferramentas fica colada acima do teclado e o cursor nunca fica escondido; em N4 o campo e o botão "Pronto" ficam sempre alcançáveis.
- **Busca responsiva:** ~250 ms depois da última tecla, cancela a consulta anterior, nunca trava a digitação. Buscas recentes só no aparelho.
- **Desempenho:** a raiz abre com as contagens sem carregar o conteúdo dos itens; as listas de tipo paginam.
- **Acessibilidade:** alvos de toque ≥ 44px (pastilhas de 34px, referências de 24px e etiquetas de 32px precisam de área ampliada); cada quadrado anuncia "Notas, 31"; os filtros são `aria-pressed`; o seletor aplicado anuncia o valor ("Livro: Gênesis"); o realce não depende só de cor (o peso 800 fica); as folhas prendem o foco.
- **Sem código morto.** Aprovadas as telas, apague o que só 4c, 34f, 34g, 34h e 39f usavam (HANDOFF §7), depois de confirmar que nada mais usa. Sem flag, sem TODO, sem versão antiga comentada.
- Rode lint, testes e build ao fim de cada etapa e me mostre a saída. Não avance com teste quebrado.

## Regras de design — para nada sair do quadro

- **Abra o PNG antes e depois de cada tela** e compare bloco por bloco: mesma ordem, mesmo enquadramento, mesmas cores, raios, pesos, tamanhos e espaçamentos. **Em dúvida de valor, vale o arquivo de `referencia/`**; se ele e o HANDOFF discordarem, pare e pergunte.
- **A raiz é um índice, não uma lista.** Seis quadrados em duas colunas, na ordem Notas · Marcações · Reflexões · Pregações · Aplicações · Perguntas; o cartão preto de Estudos; e só três itens em "Recentes". Não traga de volta a lista única nem o botão flutuante.
- **Cada tipo tem o seu tratamento, igual em toda a aba:** Marcações em areia, Aplicações em preto, os demais em branco. Não invente cor por tipo.
- **A cor dos blocos da Bíblia aparece só no quadradinho ao lado do nome do livro** (Marcações e Notas por livro).
- **As cinco telas sem captura (HANDOFF §5)** são montadas com as peças de L2 e L3 — mesmo cabeçalho, mesmos cartões, mesmos rótulos. Não crie layout novo; monte e me mostre cada uma.
- **N2:** a página é o texto. Quatro ferramentas e nenhuma a mais; o versículo citado é um bloco areia **sem barra lateral**; os tópicos têm número em quadrado preto. Não traga de volta a pastilha "+ Gênesis 43:3" nem o botão de seta da barra.
- **N3 e N4:** "Quem vê" são três blocos lado a lado, "Só eu" primeiro e selecionado. Não volte ao interruptor nem à lista com caixas de seleção.
- **N5:** não tem interruptor "Levar ao grupo" nem os botões "Guardar na biblioteca" / "Voltar e escrever mais". Um botão preto, "Continuar escrevendo".
- **Busca:** os grupos aparecem na ordem das pastilhas e só quando têm resultado; cada grupo no visual do seu tipo; o seletor com valor aplicado fica preto.
- **Texto fixo em português, palavra por palavra**, em tudo o que o HANDOFF marca como fixo — entre eles: "Biblioteca", "Nova", "Buscar em tudo o que você guardou", "anotações guardadas", "POR TIPO", "Notas", "Marcações", "Reflexões", "Pregações", "Aplicações", "Perguntas", "Suas frases do dia", "O que você perguntou e guardou", "RECENTES", "Ver tudo", "Por livro", "Por data", "Com nota", "Mais recentes", "Palavra, referência, pregador…", "BUSCAR EM", "Tudo", "REFINAR", "LIVRO", "PERÍODO", "PREGADOR", "Qualquer", "Sempre", "SUAS ETIQUETAS", "BUSCAS RECENTES", "Limpar", "A busca lê só o que é seu. Nada daqui vai para grupo.", "O que você quer guardar?", "Tudo fica só com você, na sua Biblioteca.", "Anotação livre", "Anotar uma pregação", "Nota em um versículo", "Criar um estudo", "Finalizar", "Versículo", "Tópico", "abrir", "Detalhes da anotação", "Pronto", "O QUE VOCÊ ESTÁ ANOTANDO", "Outro tipo…", "DE ONDE VEIO", "tudo opcional", "ETIQUETAS", "para achar depois", "+ nova", "QUEM VÊ", "Só eu", "Nasce só sua. Se escolher um grupo, vão o texto e as passagens — as etiquetas ficam com você.", "Salva sozinha · só sua", "O que este versículo diz para você hoje?", "O QUE FICOU DESTA ANOTAÇÃO", "Escrito a partir das suas próprias palavras. Nada foi acrescentado.", "OS PONTOS QUE VOCÊ MARCOU", "AS PASSAGENS", "Marcar na Bíblia", "Ler a anotação inteira", "Continuar escrevendo"
- **Texto sobre laranja é `#1A1714`, nunca branco.**
- **Nada hardcoded.** Tudo o que está nas imagens é de uma conta de exemplo. Frases mudam com os números, em português correto: "1 anotação guardada", "em 1 livro da Bíblia", "1 trecho · 1 livro", "1 anotação · 1 pregador", "Ver as 7 reflexões" / "Ver os 5 trechos", "1 pregação".
- Implemente e me mostre os estados sem captura: conta nova; tipo com zero itens; N1 sem rascunho; N2 em branco (anotação livre), sem título e com o teclado aberto; N3 com o tipo "Livre" e com um grupo escolhido; N4 vazia; N5 com menos de ~40 palavras, sem tópicos, sem passagens e com a linha "Compartilhada com {grupo}"; Marcações "Por data" e "Com nota"; Pregações "Por pregador"; as três folhas de refinar; busca por referência; busca com um tipo ativo; busca sem resultado, com e sem filtro aplicado.
- Não "melhore" o layout, não troque ícone, não adicione seção, não traga de volta o que saiu. Se algo parecer estranho, faltar informação ou conflitar com o código, **pergunte antes de decidir**.

## Como entregar

Siga a ordem do README: (1) L1; (2) L3 e L2; (3) as outras cinco telas de tipo; (4) L4; (5) L5; (6) N2 + N3; (7) N1 e N4; (8) N5; (9) limpeza.

**Depois de cada etapa, pare** e me mostre: a tela ao lado do PNG correspondente, o checklist do fim do HANDOFF preenchido para aquelas telas, a lista de arquivos criados / alterados / apagados, e a saída de lint, testes e build. Deixe um seletor de debug, só em desenvolvimento, para eu ver cada estado. Só siga para a etapa seguinte depois do meu ok.

Comece pelo levantamento do item 3. Não escreva código ainda.
