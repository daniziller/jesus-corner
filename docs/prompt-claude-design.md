# Prompt para o Claude Design — arte da apresentação de sociedade

Cole o bloco abaixo inteiro no Claude Design. Ele já contém a identidade do
Jesus' Corner, os 16 quadros e o conteúdo real de cada um (versão
conservadora, de 08/09/2026) — não precisa de
nenhum anexo. O conteúdo integral está em `docs/valuation-2026-09.md`; a versão
HTML já montada está em `docs/pitch-socio-20pct.html`.

> **Antes de rodar:** se quiser um deck mais curto, corte os quadros 4 e 10 —
> a narrativa continua fechando. Os quadros 11, 12 e 14 são o núcleo do
> argumento conservador e não devem sair. Se for apresentar impresso, peça no fim
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

**01 — Capa.** Logotipo no topo. Título gigante em duas linhas: "20% de um app
pronto, a preço de ativo." Subtítulo: "Leitura bíblica, rotina espiritual,
comunidade e IA — 61 telas, 3 rails de cobrança, dois idiomas. Zero usuários.
Este deck não esconde a segunda parte: ela é o motivo de o preço ser este."
Embaixo, quatro blocos em linha: **268 h** investidas em 3 meses · **R$ 150 mil**
de piso de ativo · **R$ 220 mil** de valuation pré-money · **R$ 44 mil** por 20%
(este último no bloco preto). Rodapé: "Proposta de sociedade · Setembro de 2026 ·
Leitura conservadora."

**02 — A tese (fundo escuro).** Título: "A parte difícil já foi feita. Mas
trabalho feito não é valor de mercado." Três blocos: *O que já existe* — app de
categoria completa, no ar como PWA, pagamento nas três lojas, LGPD, IA em
produção, painel admin. *O que falta* — tudo o que dá valor: usuários, retenção
medida, receita, canal, marca, orçamento. *O que isso vale* — um ativo de
software funcionando, mais um prêmio fino pela chance de dar certo; custo de
construção é dinheiro gasto, não patrimônio.

**03 — O produto.** Título: "Não é um leitor de Bíblia. É a rotina inteira."
Grade de seis blocos, cada um com subtítulo e cinco itens curtos:
*Leitura* (Bíblia completa em pt e en, ordem canônica e cronológica, 4 ritmos,
destaques e anotações, mãos-livres com voz natural) · *Rotina* (oração ACTS com
temporizador, pedidos de oração, reflexão com perguntas geradas, bênção, imagem
do dia pro Stories) · *Comunidade* (amigos, grupos, salas de capítulo, planos
coletivos, digest semanal) · *Inteligência artificial* (chat sobre o trecho
aberto, planos por tema de 3 a 30 dias, estudos, busca semântica, narração) ·
*Monetização* (três tiers, Stripe + Google Play + App Store, webhooks, convites,
portal de assinatura) · *Operação* (painel com MRR e coortes, funil de
onboarding, 4 rotinas diárias, push e moderação, LGPD).

**04 — Escopo medido.** Título: "Números do repositório, não do discurso."
Oito blocos numéricos: **64.409** linhas de código · **61** telas · **50**
endpoints serverless · **60** migrations · **3** rails de cobrança · **2**
idiomas nativos · **21 MB** de texto bíblico licenciado · **27** scripts de
teste. Nota: PWA no ar em app.jesuscorner.app; pacote Android e projeto iOS
prontos, **ainda não submetidos às lojas**.

**05 — Alavancagem (fundo escuro).** Título: "268 horas construíram 1.200. Isso
é velocidade, não patrimônio." Subtítulo: 4 horas por dia útil, de 8 de junho a
8 de setembro de 2026, um único desenvolvedor com IA. Gráfico de três barras
numa escala de um só laranja, do mais claro ao mais forte: clone enxuto de
1.200 h a R$ 100/h = R$ 120.000 · clone enxuto a R$ 140/h = R$ 168.000 · clone
de fidelidade total de 2.050 h = R$ 369.000, este último rotulado como "só
referência". Embaixo: **4,5×** de alavancagem · **R$ 150 mil** de piso de ativo
adotado · e um bloco de texto: "Só o clone enxuto entra na conta. Ninguém compra
participação para pagar por telas que não pediu."

**06 — O nicho.** Título: "Mercado grande. Com um incumbente de graça."
Quatro blocos: **183 mi** brasileiros cristãos (86,9%, Censo 2022) · **47,4 mi**
evangélicos, eram 35 mi em 2010 · **~28 mi** já usam algum app bíblico ·
**~560 mil** alvo pagante a 2% do SAM (bloco preto). Abaixo, dois blocos: "A
demanda existe" (um concorrente brasileiro passa de 20 milhões de downloads; o
Hallow fez ~US$ 40 milhões de receita líquida em 2025) e "O gargalo não é o
tamanho" (o líder tem 1 bilhão de instalações e é gratuito — toda conversão
começa respondendo "por que pagar, se o YouVersion é de graça?").

**07 — Concorrência.** Título: "Centenas de apps. Nenhum fazendo isso aqui."
Tabela: YouVersion (1 bilhão de downloads, ONG, grátis) · Hallow (24 mi,
US$ 157 mi levantados) · Glorify (25 mi, US$ 84 mi) · Pray.com (US$ 20 mi+) ·
apps brasileiros de Bíblia (20 mi+, bootstrap, monetizados por anúncio) ·
**Jesus' Corner** (pré-lançamento, bootstrap, leitura + rotina + comunidade +
IA, nativo em português) — esta última linha destacada com faixa laranja à
esquerda e fundo laranja a 9%. Nota em duas partes: um catálogo independente
lista 508 apps cristãos em 27 categorias e o Jesus' Corner atravessa os quatro
sub-nichos; **mas diferenciação não é distribuição** — Hallow e Glorify ganharam
com US$ 157 e US$ 84 milhões em aquisição, e aqui o orçamento é zero.

**08 — Preço (fundo escuro).** Título: "Um terço do preço — dos dois lados da
moeda." Cinco barras horizontais em escala comum, valor anual ao lado:
Pray.com R$ 535 · Glorify R$ 453 · Hallow R$ 378 — todas em cinza-areia
dessaturado; Jesus' Corner Premium + IA R$ 199,90 e Premium R$ 119,90 — as duas
em laranja. Nota: o preço baixo converte melhor, mas exige **3 vezes mais
assinantes para o mesmo faturamento**; com CAC igual, sobra menos por cliente.

**09 — Forças e fraquezas.** Título: "O que joga a favor. E o que manda no
preço." Duas colunas de peso visual idêntico, cada uma com etiqueta no topo
(Forças em laranja, Fraquezas em cinza) e seis pares de título em negrito + uma
frase.
*Forças:* produto completo e não protótipo · a infraestrutura chata está
resolvida · velocidade comprovada, clone de 1.200 h em 268 h reais · comunidade
como retenção, porque igreja é uma rede social que já existe offline · IA em
produção, não no roadmap · bilíngue desde a origem.
*Fraquezas:* zero tração, e este item sozinho define o preço · retenção é
desconhecida e é *a* métrica da categoria, porque app devocional morre de churn
no dia 8 · não está nas lojas · um único desenvolvedor conhece as 64 mil
linhas · a conta de aquisição é apertada, com LTV de ~R$ 70 exigindo CAC abaixo
de R$ 23 · sem canal, sem marca, sem audiência, sem orçamento, contra um
incumbente gratuito com 1 bilhão de instalações.

**10 — Economia por assinante.** Título: "A conta fecha por canal — e por
pouco." Tabela de duas colunas (Premium / Premium + IA): preço mensal R$ 12,90 e
R$ 21,90 · líquido de comissão de loja R$ 10,97 e R$ 18,62 · **ARPU líquido
blended assumido R$ 10,00** (linha destacada) · infraestrutura ~R$ 1,00 · custo
de IA R$ 2 a 5 · margem bruta ~80% e ~65 a 70%. Embaixo: **R$ 70** de LTV a 7
meses de retenção · **R$ 23** de CAC-teto · e um bloco areia: "Orgânico R$ 8 a
25 · creator gospel R$ 20 a 45 · tráfego frio R$ 35 a 70. Só o primeiro cabe no
teto — e no limite."

**11 — Cenários (fundo escuro).** Título: "Quatro futuros — e o mais provável é
o ruim." Tabela, com a **primeira linha destacada**: Falha, resta só o ativo —
0 assinantes, R$ 150 mil, peso **78%** · Conservador — 1.200 assinantes, ARR
R$ 144 mil, 1,8×, R$ 260 mil, peso 17% · Base — 5.000, ARR R$ 600 mil, 2,5×,
R$ 1,5 mi, peso 4,5% · Otimista — 18.000, ARR R$ 2,16 mi, 3,0×, R$ 6,5 mi, peso
0,5%. Nota: ARPU líquido de R$ 10/mês; o peso de 78% na falha é a taxa-base
honesta para consumo por assinatura pré-lançamento, sem canal, contra um
incumbente gratuito; piso de ativo de R$ 150 mil mais o excedente ponderado e
descontado a 25% ao ano dá **valor de hoje ≈ R$ 207 mil**.

**12 — Valuation.** Título: "Quatro referências. Uma faixa estreita." O quadro
mais importante do deck. Gráfico de faixas horizontais numa mesma escala de
R$ 0 a R$ 700 mil, com marcas de eixo em 0, R$ 175 mil, R$ 350 mil, R$ 525 mil e
R$ 700 mil: *Marketplace, apps sem receita* R$ 60 a 150 mil, em cinza ·
*Piso de ativo (clone enxuto)* R$ 120 a 180 mil, em cinza · *Opção real, pesos
duros* R$ 207 mil, faixa estreita em cinza · *Pré-seed BR (o que se pede)*
R$ 300 a 500 mil, em cinza, rotulado como teto · **Faixa defensável** R$ 180 a
300 mil, em laranja cheio, com traço vertical preto marcando a âncora de
R$ 220 mil. Valores escritos à direita de cada faixa. Embaixo, três blocos:
**R$ 220 mil** de âncora pré-money (bloco preto) · **R$ 44 mil** de preço de
20% · e o comentário: a faixa pré-seed é o que se *pede* no Brasil com produto
pronto e zero tração, quase nunca o que se fecha — entra como teto, não como
âncora.

**13 — A proposta.** Título: "A R$ 44 mil, canal vale mais que cheque." Um bloco
preto largo dividido em duas metades. À esquerda, etiqueta "Estrutura
recomendada" e um **5% à vista** gigantesco em laranja (o "à vista" em corpo bem
menor e cinza), com a linha: "por R$ 11.000, a R$ 220 mil de pré-money — mais
15% conquistados por metas em 24 meses. Total de 20%, com só um quarto liberado
de imediato." À direita, cinco linhas com o marcador em negrito: **+3%** em 6
meses, apps nas duas lojas e 500 cadastros · **+5%** em 12 meses, 250 assinantes
pagantes, ARR ~R$ 30 mil · **+7%** em 24 meses, 1.000 assinantes pagantes, ARR
~R$ 120 mil · **+** as despesas de lançamento (~R$ 40 mil em 12 meses) entram
como despesa contabilizada da sociedade, não como compra de participação ·
**—** meta não cumprida, fatia não emitida; vesting mensal, cliff de 6 meses.
Abaixo do bloco preto, dois blocos brancos: "Por que não vender por dinheiro"
(a diluição é permanente e o caixa dura um trimestre; dinheiro puro só faz
sentido se vier com o canal junto) e "Cláusulas inegociáveis" (acordo de sócios,
vesting reverso do fundador, cessão de IP, direito de preferência, tag along e
drag along, reversão por metas não cumpridas).

**14 — A escada de valor.** Título: "Cada degrau custa meses, não milhões."
Tabela de três colunas — marco, valuation, valor dos 20% — com a primeira linha
destacada: hoje, produto pronto e zero tração, R$ 180 a 300 mil, 20% = R$ 36 a
60 mil · nas lojas + 500 cadastros + curva D30 medida, R$ 350 a 600 mil, 20% =
R$ 70 a 120 mil · 300 assinantes pagantes, R$ 500 a 900 mil, 20% = R$ 100 a
180 mil · 1.000 assinantes pagantes, R$ 900 mil a 1,5 mi, 20% = R$ 180 a
300 mil · 3.000 assinantes com retenção provada, R$ 1,8 a 3,0 mi, 20% = R$ 360 a
600 mil. Abaixo, quatro barras curtas com o uso dos R$ 44 mil, em degradê de um
só laranja: marketing de lançamento R$ 20.000 · lojas, licenças e jurídico
R$ 12.000 · infraestrutura e IA R$ 8.000 · reserva R$ 4.000. Nota: nenhum
centavo vai para desenvolvimento — o dinheiro compra os dois primeiros degraus
da tabela.

**15 — Chances de fechar (fundo escuro).** Título: "O preço mais baixo é o que
torna a conversa possível." Tabela de três linhas: investidor financeiro puro,
10 a 15% (sem tração, e a R$ 44 mil o cheque é pequeno demais para justificar a
diligência) · **sócio operador com canal gospel, 45 a 55%** (linha destacada —
entra com R$ 11 mil e conquista o resto trabalhando) · estratégico, 15%. Embaixo,
quatro blocos numerados: *1 · Publicar* nas duas lojas, ~R$ 10 mil e algumas
semanas · *2 · Medir* 200 usuários de igreja e a curva D7/D30 · *3 · Cobrar* os
10 primeiros pagantes · *4 · Ancorar* uma carta de intenção de uma igreja.

**16 — Fecho.** Frase única, grande, em duas linhas: "R$ 11 mil e um canal. É
essa a conversa." Parágrafo: o produto está pronto e o preço está baixo porque a
tração não existe — isso é dito aqui, não descoberto depois; quem entra agora
paga preço de ativo por algo que, com os dois primeiros degraus cumpridos, vale
de duas a quatro vezes mais; e a alternativa continua na mesa — se o sócio traz
só dinheiro, é melhor o fundador publicar sozinho e conversar de novo em seis
meses. Três blocos finais: **R$ 11 mil** por 5% à vista · **+15%** conquistados
em 24 meses de metas · **1ª meta**: nas duas lojas e 500 cadastros em 6 meses.
Assinatura com o símbolo e o logotipo no rodapé.

### O que evitar

Nada de fundo creme com serifada e terracota, nada de gradiente roxo-azul, nada
de Inter ou Space Grotesk, nada de emoji como ícone de seção, nada de tudo
centralizado, nada de sombra em todos os cards. Hierarquia por tamanho, peso e
espaço — não por moldura. Se um bloco não carrega informação, tire o bloco.

Todo o texto em português do Brasil. Todos os números exatamente como escritos
aqui — são valores calculados, não exemplos.

## ⬆️ COPIE ATÉ AQUI
