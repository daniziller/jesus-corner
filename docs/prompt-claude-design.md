# Prompt para o Claude Design — arte da apresentação de sociedade

Cole o bloco abaixo inteiro no Claude Design. Ele já contém a identidade do
Jesus' Corner, os 16 quadros e o conteúdo real de cada um — não precisa de
nenhum anexo. O conteúdo integral está em `docs/valuation-2026-09.md`; a versão
HTML já montada está em `docs/pitch-socio-20pct.html`.

> **Antes de rodar:** se quiser um deck mais curto, corte os quadros 4, 10 e 14 —
> a narrativa continua fechando. Se for apresentar impresso, peça no fim
> "gerar também em 1920×1080 e em A4 paisagem".

---

## ⬇️ COPIE DAQUI PARA BAIXO

Crie um deck de investimento de 16 artboards em formato 1920×1080 (paisagem),
para ser apresentado ao vivo a um possível sócio operador. Assunto: a venda de
20% do **Jesus' Corner**, um aplicativo brasileiro de leitura bíblica, rotina
espiritual, comunidade e IA, pronto e ainda não lançado.

### Identidade visual — siga à risca

Esta é a marca real do produto, não invente outra.

**Símbolo:** um livro aberto, desenhado como um tile quadrado de cantos
arredondados (raio de 29% do lado), fundo preto quente `#1A1714`, duas páginas
retangulares `#A29A91` com linhas de texto finas em `#1A1714`, e a lombada
central em laranja `#F0662B`. Não incline, não abra em perspectiva, não
arredonde as páginas além de 6px, não mude a cor da lombada.

**Logotipo:** "Jesus' Corner" em Manrope 800, tracking −5%. "Jesus'" na cor da
tinta (preto sobre fundo claro, branco sobre fundo escuro) e **"Corner" sempre
em `#F0662B`**, em qualquer fundo.

**Paleta:**

| Papel | Hex |
|---|---|
| Tinta / preto quente | `#1A1714` |
| Fundo claro (areia clara) | `#EDE8E2` |
| Superfície dos cards | `#FFFFFF` |
| Areia (blocos de destaque) | `#E6DACB` |
| Laranja da marca (acento único) | `#F0662B` |
| Laranja profundo (segundo passo) | `#9D4300` |
| Tinta secundária (texto de apoio) | `#5A4C3C` |
| Tinta terciária (rótulos) | `#8A7A67` |

Um só acento: o laranja. Nada de segunda cor decorativa, nada de gradiente
roxo-azul, nada de emoji como marcador de seção.

**Tipografia:** Manrope (800 para títulos e números, 700 para rótulos) +
Be Vietnam Pro (400/500 para texto corrido). Títulos com tracking negativo
(−4%), rótulos de seção em caixa alta com tracking +16% no laranja profundo
`#9D4300`. Números grandes sempre em Manrope 800 com algarismos tabulares.

**Sistema de layout — "Bento":** cada quadro é uma composição de blocos
retangulares de cantos arredondados (raio 18px) sobre o fundo areia. Blocos
brancos para conteúdo comum, blocos areia `#E6DACB` para o comentário que
merece peso, blocos pretos `#1A1714` com texto claro para o número que decide o
quadro. Grade de 12 colunas, respiro generoso, um único bloco em destaque por
quadro. Alterne quadros de fundo claro e quadros de fundo preto para dar ritmo —
os quadros 2, 5, 8, 11 e 15 são os escuros.

**Regra dos gráficos:** barras horizontais finas de cantos levemente
arredondados, sempre com o valor escrito ao lado (nunca só a barra). Itens de
contexto em cinza-areia dessaturado; só o item que é o ponto do quadro recebe o
laranja. Sem legenda flutuante, sem eixo 3D, sem pizza, sem dois eixos y.

**Numeração:** cada quadro leva seu número (01 a 16) no canto superior direito,
em Manrope 700, 13px, tracking largo, cor `#8A7A67`. É uma sequência de
apresentação, então a numeração diz algo verdadeiro.

### Os 16 quadros

**01 — Capa.** Logotipo no topo. Título gigante em duas linhas:
"20% de um app que já está pronto." Subtítulo: "Produto completo de leitura
bíblica, rotina espiritual, comunidade e IA — 61 telas, 3 rails de cobrança,
dois idiomas. Falta uma coisa: quem leve ele até as igrejas." Embaixo, quatro
blocos em linha: **268 h** investidas em 3 meses · **2.050 h** para uma equipe
refazer · **R$ 800 mil** valuation pré-money · **R$ 160 mil** por 20% (este
último no bloco preto). Rodapé: "Proposta de sociedade · Setembro de 2026".

**02 — A tese (fundo escuro).** Título: "A parte difícil já foi feita. A parte
cara ainda não custou nada." Três blocos: *O que já existe* — um app que um
estúdio cobraria R$ 250 a 460 mil para construir, com pagamento em três lojas,
LGPD, IA em produção e painel admin. *O que falta* — distribuição: nenhum
usuário, nenhuma loja, nenhum canal. *O que se compra aqui* — um ativo pronto,
com o custo e o risco de engenharia já pagos, e o upside inteiro pela frente.

**03 — O produto.** Título: "Não é um leitor de Bíblia. É a rotina inteira."
Grade de seis blocos, cada um com um subtítulo e cinco itens curtos:
*Leitura* (Bíblia completa em pt e en, ordem canônica e cronológica, 4 ritmos,
destaques e anotações, modo mãos-livres com voz natural) · *Rotina* (oração
ACTS com temporizador, pedidos de oração, reflexão com perguntas geradas,
bênção, imagem do dia pro Stories) · *Comunidade* (amigos, grupos, salas de
capítulo, planos coletivos, digest semanal) · *Inteligência artificial* (chat
sobre o trecho aberto, planos por tema de 3 a 30 dias, estudos, busca semântica
nas anotações, narração) · *Monetização* (três tiers, Stripe + Google Play +
App Store, webhooks, convites, portal de assinatura) · *Operação* (painel com
MRR e coortes, funil de onboarding, 4 rotinas diárias, push e moderação, LGPD).

**04 — Escopo medido.** Título: "Números do repositório, não do discurso."
Oito blocos numéricos: **64.409** linhas de código · **61** telas · **50**
endpoints serverless · **60** migrations · **3** rails de cobrança · **2**
idiomas nativos · **21 MB** de texto bíblico licenciado · **27** scripts de
teste. Nota de rodapé: PWA no ar em app.jesuscorner.app, pacote Android e
projeto iOS prontos, aguardando submissão.

**05 — Alavancagem (fundo escuro).** Título: "268 horas entregaram 2.050 horas
de produto." Subtítulo: 4 horas por dia útil, de 8 de junho a 8 de setembro de
2026, um único desenvolvedor com IA. Gráfico de três barras crescentes numa
mesma escala de laranja (do mais escuro ao mais claro): freelancer pleno a
R$ 120/h = R$ 246.000 · agência só engenharia = R$ 369.000 · agência com design,
PM e QA = R$ 461.000. Embaixo: **7,6×** de alavancagem · **R$ 1.300** de ativo
gerado por hora · e um bloco de texto: "O sócio não compra 64 mil linhas
paradas. Compra uma máquina que entrega um bloco funcional por semana."

**06 — O nicho.** Título: "47,4 milhões de evangélicos. E ninguém falando com
eles em português." Quatro blocos: **183 mi** brasileiros cristãos (86,9%,
Censo 2022) · **47,4 mi** evangélicos, eram 35 mi em 2010 · **~28 mi** já usam
algum app bíblico · **~1,1 mi** alvo pagante estimado (bloco preto). Abaixo,
dois blocos: "A demanda já está provada" (um único concorrente brasileiro passa
de 20 milhões de downloads na Play Store) e "A disposição de pagar também" (o
Hallow fez ~US$ 40 milhões de receita líquida em 2025).

**07 — Concorrência.** Título: "Centenas de apps. Nenhum fazendo isso aqui."
Tabela: YouVersion (1 bilhão de downloads, ONG, grátis) · Hallow (24 mi,
US$ 157 mi levantados, católico, foco EUA) · Glorify (25 mi, US$ 84 mi,
devocional, EUA e Europa) · Pray.com (US$ 20 mi+, áudio) · apps brasileiros de
Bíblia (20 mi+, bootstrap, monetizados por anúncio) · **Jesus' Corner**
(pré-lançamento, bootstrap, leitura + rotina + comunidade + IA, nativo em
português) — esta última linha destacada com faixa laranja à esquerda e fundo
laranja a 9% de opacidade. Nota: um catálogo independente lista 508 apps
cristãos em 27 categorias; a categoria se dividiu em leitura, estudo,
devocional e chat de IA, e o Jesus' Corner atravessa os quatro.

**08 — Preço (fundo escuro).** Título: "Um terço do preço do concorrente global
mais barato." Cinco barras horizontais em escala comum, valor anual escrito ao
lado: Pray.com R$ 535 · Glorify R$ 453 · Hallow R$ 378 — todas em cinza-areia
dessaturado; Jesus' Corner Premium + IA R$ 199,90 e Jesus' Corner Premium
R$ 119,90 — as duas em laranja. Nota: preços convertidos a R$ 5,40; Hallow e
Glorify não conseguem baixar o preço no Brasil sem canibalizar a receita nos
EUA.

**09 — Forças e fraquezas.** Título: "O que joga a favor. E o que joga contra."
Duas colunas lado a lado, cada uma com uma etiqueta no topo (Forças em laranja,
Fraquezas em cinza) e seis pares de título em negrito + uma frase.
*Forças:* produto completo e não protótipo · a infraestrutura chata está
resolvida · velocidade comprovada de 7,6× · preço 3× abaixo dos globais ·
comunidade como retenção, porque igreja é uma rede social que já existe offline ·
bilíngue desde a origem.
*Fraquezas:* zero tração, e isso domina tudo · não está nas lojas · um único
desenvolvedor conhece as 64 mil linhas · tráfego pago não fecha a conta, porque
o LTV de ~R$ 120 exige CAC abaixo de R$ 40 · licença do texto bíblico e custo
de IA a confirmar · sem marca, sem canal, sem audiência.
Trate as duas colunas com o mesmo peso visual — a honestidade é o argumento.

**10 — Economia por assinante.** Título: "A conta fecha por canal, não por
anúncio." Tabela de duas colunas (Premium / Premium + IA): preço mensal
R$ 12,90 e R$ 21,90 · líquido de comissão de loja R$ 10,97 e R$ 18,62 · líquido
via web R$ 12,32 e R$ 20,91 · infraestrutura ~R$ 1,00 nos dois · custo de IA
R$ 2 a 5 · margem bruta ~80% e ~65 a 70% (linha destacada). Embaixo: **R$ 120**
de LTV · **R$ 40** de CAC-teto · e um bloco areia: "Orgânico R$ 8 a 25 · creator
gospel R$ 20 a 45 · tráfego frio R$ 35 a 70. Só um dos três fecha."

**11 — Cenários (fundo escuro).** Título: "Quatro futuros, com peso em cada um."
Tabela: Falha, resta só o ativo — 0 assinantes, R$ 350 mil, peso 60% ·
Conservador — 3.000 assinantes, ARR R$ 540 mil, 3,0×, R$ 1,6 mi, peso 25% ·
Base — 12.000, ARR R$ 2,16 mi, 3,5×, R$ 7,6 mi, peso 12% · Otimista — 40.000,
ARR R$ 7,2 mi, 4,0×, R$ 28,8 mi, peso 3% · linha final destacada: valor
esperado trazido a valor presente a 40% a.a. = **R$ 870 mil**. Nota: se o
cenário base se confirmar, os 20% comprados hoje por R$ 160 mil valeriam
R$ 1,5 milhão.

**12 — Valuation.** Título: "Três métodos independentes. Uma faixa." O quadro
mais importante do deck. Um gráfico de faixas horizontais sobre uma mesma
escala de R$ 0 a R$ 1,4 milhão, com marcas de eixo em 0, R$ 350 mil, R$ 700 mil,
R$ 1,05 mi e R$ 1,4 mi: *Custo de reposição (piso)* de R$ 250 a 460 mil, em
cinza · *Comparáveis pré-seed BR* de R$ 600 mil a 1,2 mi, em cinza · *Opção real
descontada* em R$ 870 mil, faixa estreita em cinza · **Faixa justa** de R$ 600
mil a R$ 1,0 mi, em laranja cheio, com um traço vertical preto marcando a âncora
de R$ 800 mil. Valores escritos à direita de cada faixa. Embaixo, três blocos:
**R$ 800 mil** de âncora pré-money (bloco preto) · **R$ 160 mil** de preço de
20% · e o comentário: abaixo de R$ 250 mil sai mais barato contratar uma
agência; acima de R$ 1 milhão, sem tração, não há comparável que sustente.

**13 — A proposta.** Título: "Dinheiro e suor — nesta ordem." Um bloco preto
largo, dividido em duas metades. À esquerda, etiqueta "Estrutura recomendada" e
um **20%** gigantesco em laranja, com a linha: "por R$ 160 mil em valor total,
sendo R$ 80 mil em dinheiro e o restante conquistado por metas." À direita,
cinco linhas com o marcador em negrito: **10%** por R$ 80.000 à vista, pré-money
efetivo de R$ 800 mil · **10%** em earn-in, vesting de 24 meses, cliff de 6 ·
**6 m** apps publicados nas duas lojas e 1.000 cadastros · **12 m** 1.000
assinantes pagantes, ARR ~R$ 180 mil · **24 m** 5.000 assinantes pagantes, ARR
~R$ 900 mil. Abaixo do bloco preto, dois blocos brancos: "Alternativas na mesa"
(dinheiro puro: 20% por R$ 160 mil; só suor: 20% por vesting de 36 meses, só com
canal comprovado) e "Cláusulas inegociáveis" (acordo de sócios, vesting reverso
do fundador, cessão de IP, direito de preferência, tag along e drag along,
reversão por metas não cumpridas).

**14 — Uso dos recursos.** Título: "Para onde vão os R$ 160 mil, em 12 meses."
Cinco barras numa escala comum, em degradê de um só laranja, do maior para o
menor: marketing de lançamento com igrejas, líderes e creators R$ 70.000 ·
publicação nas lojas, licenças e jurídico R$ 25.000 · infraestrutura e IA por 12
meses R$ 25.000 · conteúdo R$ 20.000 · reserva de caixa R$ 20.000. Nota: nenhum
centavo vai para desenvolvimento — essa parte continua sendo aportada em horas
pelo fundador. O dinheiro compra exatamente o que o produto não tem: alcance.

**15 — Chances de fechar (fundo escuro).** Título: "Com quem essa conversa
funciona." Tabela de três linhas: investidor financeiro puro, 15 a 20% ·
**sócio operador com canal gospel, 40 a 50%** (linha destacada) · estratégico
(editora, rede de igrejas, mídia), 20%, subindo para mais de 60% com 10 mil
usuários ativos. Embaixo, quatro blocos numerados em sequência: *1 · Publicar*
nas duas lojas · *2 · Medir* 200 usuários de igreja e a curva de retenção
D7/D30 · *3 · Cobrar* os 10 primeiros pagantes · *4 · Ancorar* uma carta de
intenção de uma igreja ou rede.

**16 — Fecho.** Frase única, grande, em duas linhas: "O produto está pronto. O
relógio está correndo contra os dois lados." Parágrafo: cada mês sem lançar
custa mais valor do que qualquer ganho nesta negociação; em seis meses com mil
assinantes, o mesmo 20% vale de R$ 300 a 500 mil — e o vendedor deixa de
precisar de sócio. Três blocos finais: **R$ 80 mil** em dinheiro por 10% ·
**+10%** conquistados em 24 meses de metas · **1ª meta**: nas duas lojas em 6
meses. Assinatura com o símbolo e o logotipo no rodapé.

### O que evitar

Nada de fundo creme com serifada e terracota, nada de gradiente roxo-azul, nada
de Inter ou Space Grotesk, nada de emoji como ícone de seção, nada de tudo
centralizado, nada de sombra em todos os cards. Hierarquia por tamanho, peso e
espaço — não por moldura. Se um bloco não carrega informação, tire o bloco.

Todo o texto em português do Brasil. Todos os números exatamente como escritos
aqui — são valores calculados, não exemplos.

## ⬆️ COPIE ATÉ AQUI
