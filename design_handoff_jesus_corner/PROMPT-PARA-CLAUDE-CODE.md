# Prompt para colar no Claude Code

Cole o texto entre as linhas, dentro do repositório `jesus-corner`, com a pasta
`design_handoff_jesus_corner/` copiada para dentro do projeto (ou em qualquer lugar
que o Claude Code consiga ler).

Antes de colar, **substitua a lista de telas** pela sua escolha final — a linha
"Telas canônicas (o arquivo já foi limpo — tudo que está nele vale)
----------------------------------------------------------------
Identidade "Bento", marca preto/cinza/laranja (rodada 16). Quadros de 390×800
são telas do app; quadros de 1280×800 (rodada 23) são o painel web do admin.

  APP — navegação com 5 abas: Hoje · Meu Plano · Bíblia · Biblioteca · Comunidade
  3c   Hoje (padrão; obrigatória nos primeiros 7 dias ou com painel zerado)
  12a  Hoje com painel de métricas (entra depois da 1ª semana cumprida)
  19a  Perfil — folha que abre ao tocar nas iniciais em Hoje (não é aba)
  19b  Idioma do app + versão da Bíblia
  19c  Administração do grupo (só para admin de grupo)
  4a   Leitura — cabeçalho com chip escuro "Gênesis 41 ˄" que abre 18b
  18a  Página do livro — grade de capítulos
  18b  Seletor de capítulo dentro da leitura (folha escura)
  5f   Bíblia — lista de livros por nome completo, agrupados por seção
  4b   Meu Plano — 3 passos com tempos independentes; botões "Criar" e "Ajustar"
  21a  Oração — método ACTS, 4 etapas com 1/4 do tempo cada
  21b  Reflexão — 3 perguntas geradas (10d) com cabeçalho de passo
  21c  Rotina concluída (fundo escuro)
  5a   Ajustar plano — stepper por passo (0 min desliga o passo)
  22a  Criar estudo/plano com IA — pedido (texto livre ou sugestão)
  22b  Proposta — revisar dia a dia, trocar trecho, refazer
  22c  Meu Plano com estudo ativo (Gênesis pausado, "Retomar já")
  22d  Plano do grupo — admin cria, líder revisa a pergunta da semana
  4c   Progresso / Caminhada
  5b   Biblioteca
  5d   Comunidade
  5e   Ferramentas da leitura (folha)
  17a  Sala do capítulo — abre só para quem concluiu
  17b  Retrospectiva do mês — cartão compartilhável
  17c  Leitura com camada do grupo (pontilhado + chip "N do grupo marcaram")
  10a–10f  IA na leitura: menu Perguntar, resposta (com "Reportar resposta"),
           contexto, reflexão, recusas, ajustes da IA (inclui "Aviso do grupo")
  13a–13d  Boas-vindas, Entrar, Criar conta, Recuperar senha
  15a–15f  Onboarding: 15a → 15b → uma demonstração → 15f → 15c → 15d → 15e
           (15f = três tempos separados: oração / leitura / reflexão)
  14b/14c/14e/14f  Demonstrações — só UMA aparece, pela resposta de 15b
  16a–16c  Marca: símbolo, logotipo ("Corner" sempre #F0662B), ícone, limites

  ADMIN DO APP (web 1280px) — rodada 23
  23a  Visão geral · 23b Usuários · 23c Mensagens · 23d Convites e códigos
  (as outras 5 seções da navegação ainda não têm tela; não invente)

Removidos do arquivo: rodadas 1, 2, 6–9, 11 e a tela 5c. Rodadas 17 e 20 têm
textos de revisão sem tela nova — leia como regra de produto.
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
Primeiro, auditoria: para cada tela já implementada, rode o passo 4 contra o
HTML atual e me traga a lista de ❌ antes de corrigir. Depois, nesta ordem:
  1. Bíblia: 5f → 18a → 18b → chip no cabeçalho de 4a
  2. Perfil: 19a → 19b → 19c (abre pelas iniciais em 3c/12a; sem aba nova)
  3. Meu Plano: 4b → 21a (ACTS) → 21b → 21c → 5a (steppers) → 15f (3 tempos)
  4. Estudos com IA: 22a → 22b → 22c → 22d
  5. Leitura social: 17a → 17b → 17c
  6. Admin web: 23a → 23b → 23c → 23d (projeto/rota separada, mesma identidade)
Uma tela por vez; me mostre antes de seguir. Não refatore fora do escopo.

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
9. "Reportar resposta" (10b) é obrigatório antes de a IA ir ao ar: ao
   reportar, a resposta sai do histórico e entra na fila de revisão (23a).
10. Estudos/planos gerados (22): toda referência é verificada contra o texto
    da versão escolhida antes de aparecer — trecho que não existe é descartado.
    A IA propõe, a pessoa aprova; o plano principal pausa com data de retorno
    visível e "Retomar já" sempre disponível.
11. Plano de grupo (22d): a pergunta da semana sugerida pela IA só entra na
    sala (17a) depois que o líder revisa. Membros recebem como convite.
```

---

## Dica prática

Se o Claude Code começar a improvisar valores, mande ele voltar ao arquivo com
algo direto: *"leia o bloco com id 10b no HTML e me diga os hex e os tamanhos de
fonte que você vai usar, antes de escrever código"*. Ele acerta muito mais
quando lê o markup do que quando trabalha a partir de descrição.
