# Prompt para colar no Claude Code

Cole o texto entre as linhas, dentro do repositório `jesus-corner`, com a pasta
`design_handoff_jesus_corner/` copiada para dentro do projeto (ou em qualquer lugar
que o Claude Code consiga ler).

Antes de colar, **substitua a lista de telas** pela sua escolha final — a linha
"Telas canônicas" abaixo é a minha recomendação, não uma decisão sua.

---

```
Contexto
--------
Este repositório é o app Jesus' Corner (React 18 + Vite). Preciso implementar um
redesign que já está desenhado. O design vive em:

  design_handoff_jesus_corner/Jesus Corner Redesign.dc.html

Abra esse arquivo e LEIA O HTML. Ele é a fonte da verdade — mais confiável que
qualquer descrição em prosa. É um canvas com várias rodadas de exploração,
numeradas por turno: cada opção tem um id no atributo `id` do seu wrapper
(`10a`, `10b`, `4a`…) e um rótulo em texto logo acima do quadro do celular.
Cada quadro de 390×800px é UMA tela do app.

Leia também design_handoff_jesus_corner/README.md para o racional de produto,
as mudanças de lógica (constância semanal, progresso antes da conta) e as
decisões de navegação e monetização. Onde o README e o HTML divergirem em
valores visuais, o HTML manda — ele é mais novo.

Telas canônicas (o arquivo já foi limpo — tudo que está nele vale)
----------------------------------------------------------------
Identidade "Bento", marca preto/cinza/laranja (rodada 16):

  3c   Início (padrão; também a Home dos primeiros 7 dias)
  12a  Início com painel de métricas (entra depois da 1ª semana cumprida)
  4a   Leitura
  4b   Meu Plano
  4c   Progresso / Caminhada
  5a   Ajustes
  5b   Biblioteca
  5c   Onboarding antigo (pergunta única) — SUBSTITUÍDO por 15f; ignore
  5d   Comunidade
  5f   Bíblia (leitura livre)
  10a–10f  IA na leitura (menu Perguntar, resposta, contexto, reflexão,
           recusas, ajustes da IA)
  13a–13d  Boas-vindas, Entrar, Criar conta, Recuperar senha
  15a–15f  Onboarding: 5 perguntas + resultado (ordem no texto da rodada 15)
  14b/14c/14e/14f  Demonstrações do onboarding — só UMA aparece, escolhida
           pela resposta de 15b
  16a–16c  Marca: símbolo, logotipo, ícone em 4 tamanhos, variações e limites
  17a–17c  Leitura social (sala do capítulo, retrospectiva do mês, camada do
           grupo na leitura) — PROPOSTA aprovada, implementar por último

Rodadas 1, 2, 6–9 e 11 foram removidas do arquivo. Se encontrar referência a
elas em algum texto, ignore.

Como implementar
----------------
REGRA ZERO — reproduza EXATAMENTE o que está no HTML. Não simplifique, não
"adapte", não omita elementos, não troque textos, não mude a ordem dos blocos.
Se algo do HTML parecer errado ou impossível, PARE e me pergunte — nunca
resolva por conta própria.

Antes de codar cada tela, faça este ritual e me mostre o resultado:
  1. Abra o wrapper com o id da tela (ex.: `div#10b`) e liste TODOS os
     elementos visíveis dentro do quadro de 390×800, de cima para baixo,
     um por linha: tipo, texto exato, cor de fundo, cor do texto, fonte
     (tamanho/peso/entrelinha/tracking), padding, gap, raio, altura fixa.
  2. Marque cada linha com o componente/arquivo do repositório onde ela vai
     viver. Se não existir componente, diga que vai criar.
  3. Só depois escreva o código.

Depois de codar cada tela, faça a conferência e me mostre:
  4. Abra a tela no app e o quadro do HTML lado a lado. Percorra a lista do
     passo 1 e marque ✅ ou ❌ por item. Qualquer ❌ é corrigido antes de
     passar para a próxima tela. Não me apresente uma tela com ❌.
  5. Confira também o que NÃO deve existir: nenhum elemento a mais, nenhum
     texto diferente, nenhuma cor fora da lista de tokens do ADENDO.

Regras de fidelidade:
- Extraia os valores exatos do HTML: hex, tamanho de fonte, peso,
  entrelinha, tracking, padding, gap, raio, altura. Não arredonde e não
  invente valores "parecidos". 12.5px é 12.5px, não 12 nem 13.
- Os textos do protótipo são a copy final, letra por letra — inclusive
  rótulos em caixa alta, notas em cinza, textos de botão e as frases de
  recusa da IA. Não reescreva, não traduza, não encurte.
- A ordem vertical dos blocos e a hierarquia (o que é bloco escuro, o que é
  cartão branco, o que é areia #E6DACB) é parte do design. Mantenha.
- Ícones: use a biblioteca do app, mas no MESMO tamanho, peso e posição do
  protótipo. Se não houver equivalente, copie o SVG do HTML.
- Fidelidade alta. Extraia os valores exatos do HTML: hex, tamanho de fonte,
  peso, entrelinha, tracking, padding, gap, raio. Não arredonde e não invente
  valores "parecidos".
- O HTML usa estilos inline porque é protótipo. No app, escreva CSS de verdade
  com as variáveis de `src/index.css`. Se um valor da nova identidade não
  existir como token, ADICIONE o token — não espalhe hex literal pelos
  componentes. A lista completa de tokens novos está em
  design_handoff_jesus_corner/ADENDO-identidade-e-IA.md.
- Reaproveite os componentes que já existem no repositório. Não introduza
  biblioteca de UI, framework de estilo ou dependência nova.
- Ícones: os SVGs do protótipo foram desenhados só para o mock. Use a
  biblioteca de ícones já adotada no app, mantendo tamanho e peso equivalentes.
- Textos: os do protótipo são reais e revisados em português — use-os como
  copy final, inclusive os textos de recusa da IA em 10e.
- Os quadros de 390×800 com raio 34px e sombra dupla são a moldura do
  protótipo. NÃO recrie moldura, raio externo nem sombra nas telas do app.
- Altura mínima de toque: 44px em qualquer elemento clicável.
- Todo container rolável precisa de padding-bottom que inclua os 74px da
  barra inferior.

Ordem
-----
Comece por 4a (Leitura) e depois 10a + 10b, que é o fluxo de IA completo e não
mexe em nenhuma outra tela. Faça uma tela por vez e me mostre antes de seguir
para a próxima. Não refatore nada que não esteja no escopo da tela atual.

Sobre as features de IA (turno 10)
----------------------------------
Regras que valem para toda a implementação, não só para o visual:

1. A IA nunca é uma aba nova. Ela nasce de um gesto que já existe: selecionar
   um trecho do texto.
2. Toda resposta termina com no mínimo uma citação de versículo dentro do
   próprio texto lido, e traz "escrito por IA, confira no texto" no pé.
3. Texto bíblico nunca aparece dentro do bloco escuro da IA sem a referência
   ao lado.
4. Pergunta de doutrina divergente: a IA não decide, mostra os textos dos dois
   lados e sugere conversar com o pastor.
5. Pergunta fora do texto ("meu casamento vai dar certo?"): a IA responde que
   não sabe. Não improvise consolo.
6. Sinal de risco ou sofrimento: para de responder, mostra ajuda humana
   (CVV 188, 24h) ANTES de qualquer versículo.
7. Tudo desligável em Ajustes (10f), e o app inteiro continua funcionando sem
   a IA. Sem internet, o assistente avisa na hora que está indisponível —
   não deixa o usuário esperando.
8. As perguntas do usuário ficam no aparelho por padrão, com opção de apagar
   todas.
```

---

## Dica prática

Se o Claude Code começar a improvisar valores, mande ele voltar ao arquivo com
algo direto: *"leia o bloco com id 10b no HTML e me diga os hex e os tamanhos de
fonte que você vai usar, antes de escrever código"*. Ele acerta muito mais
quando lê o markup do que quando trabalha a partir de descrição.
