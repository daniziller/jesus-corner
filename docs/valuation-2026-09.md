# Valuation — Jesus' Corner

**Data:** 08/09/2026 · **Estágio:** produto pronto, pré-lançamento (0 assinantes)
**Objetivo:** vender 20% para um sócio operador
**Fonte dos números do produto:** levantamento direto do repositório (commit `1add509`)
**Postura:** conservadora. Onde havia dúvida, o número foi para baixo.

> Esta é a segunda leitura. A primeira chegou a R$ 800 mil e estava alta —
> o porquê está na seção 11. Isto não é laudo de avaliação nem parecer jurídico.

---

## 1. Resumo executivo

| | |
|---|---|
| **Piso de ativo (clone enxuto do que existe)** | R$ 120k – R$ 180k |
| **Comparáveis de marketplace (apps sem receita)** | R$ 60k – R$ 150k |
| **Opção real com probabilidades duras** | ~R$ 210k |
| **Comparáveis pré-seed BR (o que se *pede*, não o que se fecha)** | R$ 300k – R$ 500k |
| **Faixa defensável** | **R$ 180k – R$ 300k** |
| **Âncora recomendada (pré-money)** | **R$ 220.000** |
| **Preço de 20%** | **R$ 44.000** |

**A consequência prática:** R$ 44 mil não financia um lançamento. A esse preço,
**vender 20% por dinheiro é um mau negócio para o vendedor** — a diluição é
permanente e o cheque acaba em quatro meses. Os 20% só se justificam se o sócio
entrar com **canal e trabalho**, não com dinheiro. Daí a estrutura da seção 8:
5% à vista, 15% conquistados por metas.

E a alternativa honesta continua sendo **não vender agora**: publicar nas lojas
custa cerca de R$ 10 mil e algumas semanas. Com 300 assinantes pagantes medidos,
a mesma fatia vale de 2 a 4 vezes mais.

---

## 2. O que existe hoje (escopo real, medido)

| Métrica | Valor |
|---|---|
| Arquivos de código (`src` + `api` + `supabase`) | 376 |
| Linhas de código | 64.409 |
| Telas | 61 |
| Endpoints serverless | 50 |
| Migrations de banco | 60 |
| Scripts de teste | 27 |
| Idiomas | 2 (pt/en, com detecção por IP) |
| Rails de cobrança | 3 (Stripe · Google Play Billing · Apple StoreKit) |
| Produtos de assinatura | 4 (2 tiers × 2 intervalos, em BRL e USD) |
| Texto bíblico embarcado | 21 MB (NVT pt + NLT en, via API.Bible licenciada) + índice de busca |

Blocos funcionais prontos: leitura completa (canônica e cronológica, 4 ritmos,
destaques, notas, busca, mãos-livres com voz natural) · rotina (oração ACTS,
pedidos de oração, reflexão, bênção, imagem do dia) · comunidade (amigos,
grupos, salas de capítulo, planos coletivos, digest) · IA (chat sobre o trecho,
planos por tema, estudos, busca semântica, TTS) · monetização em três tiers com
webhooks nas três lojas · operação (admin com MRR, funil, coortes, 4 crons,
push, moderação) · LGPD tratada como dado sensível · PWA no ar, pacote Android
(TWA) e projeto iOS (Capacitor) prontos, **não submetidos**.

Isto não é um MVP — é um produto de categoria completa. **Mas escopo não é
tração**, e é exatamente essa distinção que a seção seguinte cobra.

---

## 3. Horas investidas — e por que elas não são o valor

**Esforço do fundador:** 4h por dia útil, de 08/06/2026 a 08/09/2026 =
**67 dias úteis × 4h = 268 horas**.

**A correção mais importante desta segunda leitura:** custo de construção é
*sunk cost*. Um comprador racional não paga pelo que custou fazer; paga pelo
fluxo de caixa futuro. O custo de reposição só serve como **teto** do que um
comprador pagaria pelo acesso a um código funcionando — e mesmo esse teto entra
com dois descontos:

1. **Ele não precisa de tudo isso.** Um clone comercialmente suficiente — o que
   basta para testar o mercado — é bem menor que as 61 telas atuais.
2. **Código de terceiro vale menos.** Uma base que ele não desenhou, com uma
   só pessoa conhecendo as 64 mil linhas, vale entre 50% e 70% do custo de
   refazer do jeito dele.

### Clone enxuto — a estimativa que sustenta o piso

| Bloco (versão comercialmente suficiente) | Horas |
|---|---:|
| Bíblia, leitor, busca | 160 |
| Planos (canônico + por tema) | 110 |
| Oração e reflexão | 90 |
| Comunidade básica | 150 |
| IA (chat + geração) | 120 |
| Billing nas 3 rails | 140 |
| Auth e LGPD | 80 |
| Push e crons | 60 |
| Admin | 80 |
| i18n, design, onboarding, empacotamento | 120 |
| QA | 90 |
| **Total** | **1.200** |

| Cenário | Taxa | Custo |
|---|---:|---:|
| Freelancer pleno BR | R$ 100/h | R$ 120.000 |
| Freelancer sênior | R$ 140/h | R$ 168.000 |

**Piso de ativo: R$ 120k – R$ 180k.** O fundador vem junto no negócio, o que
elimina o desconto de bus factor — por isso o piso fica na faixa cheia e não
nos 50% dela.

*Para referência apenas:* um clone de fidelidade total (todas as 61 telas, as 60
migrations, o admin inteiro) sairia por ~2.050h, ou R$ 250k a R$ 460k em preço
de agência. **Esse número não entra na valuation** — ninguém compra participação
para pagar por telas que não pediu.

**O que as 268 horas provam** não é valor de estoque, é velocidade: um clone
enxuto de 1.200h saiu em 268h de trabalho real. Isso importa para o futuro
(cada aposta de produto custa uma fração do normal), não para o preço de hoje.

---

## 4. Mercado e nicho

### 4.1 Tamanho (Brasil)

- **47,4 milhões de evangélicos** (26,9% da população, Censo 2022 do IBGE),
  contra 35 milhões em 2010.
- **86,9% da população de 10+ anos se declara cristã** (~183 milhões).
- O app "Bíblia Sagrada" (br.biblia) passa de **20 milhões de downloads** só na
  Play Store brasileira.

**Funil, com as premissas apertadas:**

| Camada | Estimativa | Premissa |
|---|---:|---|
| TAM — cristãos no Brasil | 183M | Censo 2022 |
| SAM — usam algum app bíblico | ~28M | ~15% dos cristãos |
| Dispostos a pagar por app de fé | ~560 mil | **2% do SAM** (era 4% na primeira leitura — 2% é o piso da faixa freemium de consumo, e o Brasil está no piso) |
| SOM em 36 meses, cenário conservador | **1.200** | 0,2% do alvo pagante |

O tamanho do nicho **não é o gargalo**. O gargalo é chegar até ele: o
incumbente é gratuito, tem 1 bilhão de instalações e nenhuma necessidade de
cobrar. Mercado grande com incumbente grátis é um mercado difícil, não fácil.

### 4.2 Quem já está no ringue

| App | Downloads | Capital levantado | Preço 2026 |
|---|---|---|---|
| YouVersion | **1 bilhão** | ONG / doações | Grátis |
| Hallow | 24M | US$ 157M | US$ 69,99/ano |
| Glorify | 25M+ | US$ 84M | US$ 83,88/ano |
| Pray.com | — | US$ 20M+ | US$ 99/ano |
| Bíblia Sagrada / JFA / Mobidic (BR) | 20M+ | bootstrap | Grátis + anúncios |
| **Jesus' Corner** | **pré-lançamento** | bootstrap | R$ 119,90/ano |

Um catálogo independente lista **508 apps cristãos** em 27 categorias. A
categoria se dividiu em quatro sub-nichos — leitura, estudo, devocional e chat
de IA — e o Jesus' Corner atravessa os quatro, nativo em português.

**Leitura conservadora disso:** a diferenciação é real, mas **diferenciação não
é distribuição**. Hallow e Glorify não venceram por produto melhor; venceram
com US$ 84M e US$ 157M em aquisição de usuário. O Jesus' Corner tem R$ 0.

### 4.3 Preço

| | Preço anual | Em BRL (câmbio ~5,4) |
|---|---|---|
| Pray.com | US$ 99,00 | ~R$ 535 |
| Glorify | US$ 83,88 | ~R$ 453 |
| Hallow | US$ 69,99 | ~R$ 378 |
| **Jesus' Corner Premium** | **R$ 119,90** | **R$ 120** |
| **Jesus' Corner Premium + IA** | **R$ 199,90** | **R$ 200** |

Custar um terço do concorrente global mais barato é uma vantagem de conversão e
uma desvantagem de receita ao mesmo tempo: **é preciso 3 vezes mais assinantes
para o mesmo faturamento.** Com CAC igual, margem menor por cliente.

---

## 5. Pontos fortes e fracos

### Fortes

1. **Produto completo, não protótipo.** 61 telas, 60 migrations, 50 endpoints.
2. **A infraestrutura chata está resolvida** — três rails de cobrança, LGPD com
   dado sensível, admin com funil e coortes. É onde projetos bootstrap travam.
3. **Velocidade de execução comprovada** — clone enxuto de 1.200h entregue em
   268h reais. Reduz o custo de cada aposta futura.
4. **IA já em produção**, não no roadmap, no sub-nicho que mais cresce.
5. **Comunidade como retenção** — igreja é uma rede social que já existe
   offline; o app espelha uma estrutura pronta.
6. **Bilíngue desde a origem** — expansão sem refatoração estrutural.

### Fracos (o lado que manda no preço)

1. **Zero tração. Este item sozinho define a valuation.** Sem usuários, sem
   retenção, sem receita — não há nada para multiplicar.
2. **Não está nas lojas.** Enquanto não estiver, o ativo é um site.
3. **Retenção é desconhecida, e é *a* métrica da categoria.** App devocional
   morre de churn no dia 8. Nada no repositório prova que este não morre.
4. **Bus factor 1.** Uma pessoa conhece as 64 mil linhas.
5. **Sem canal, sem marca, sem audiência, sem orçamento de marketing.**
6. **A conta de aquisição é apertada** — LTV de ~R$ 70 exige CAC abaixo de
   R$ 23. Praticamente nenhum canal pago fecha nessa faixa.
7. **Incumbente gratuito com 1 bilhão de instalações.** Toda conversão começa
   respondendo "por que pagar, se o YouVersion é de graça?".
8. **Licença do texto bíblico a confirmar por escrito** (NVT e NLT via
   API.Bible) e **margem do tier com IA ainda não medida com uso real.**
9. **Comissão das lojas** de 15% a 30% da receita mobile.
10. **Concorrentes com US$ 100M+** podem entrar no Brasil a qualquer momento.

---

## 6. Unidade econômica (premissas apertadas)

| Item | Premium | Premium + IA |
|---|---:|---:|
| Preço mensal | R$ 12,90 | R$ 21,90 |
| Líquido de comissão de loja (15%) | R$ 10,97 | R$ 18,62 |
| **ARPU líquido blended assumido** | **R$ 10,00/mês** | — |
| Custo de infraestrutura | ~R$ 1,00 | ~R$ 1,00 |
| Custo de IA por usuário ativo | — | R$ 2,00 – 5,00 |
| Margem bruta | ~80% | ~65 – 70% |

- **Retenção média assumida: 7 meses** (era 10 na primeira leitura; 7 é o que
  se vê em app devocional sem programação de conteúdo semanal).
- **LTV: ~R$ 70.**
- **CAC-teto para LTV/CAC = 3: R$ 23.**
- CAC por canal: orgânico e igreja R$ 8–25 · creator gospel R$ 20–45 · tráfego
  pago frio R$ 35–70.

**Só o canal orgânico fecha — e por pouco.** Isso não é um detalhe de
marketing: é a razão de o valor de um sócio-operador com igrejas na agenda ser
maior que o valor do dinheiro dele.

---

## 7. Os métodos, refeitos com probabilidades duras

### Método 1 — Piso de ativo
Clone enxuto (seção 3): **R$ 120k – R$ 180k**. Midpoint **R$ 150k**.

### Método 2 — Comparáveis de marketplace
- Negócios digitais abaixo de US$ 100k de valor fecham a **1,68× o lucro anual**
  (Flippa, 2026); SaaS bootstrap abaixo de US$ 1M de ARR, a 2,85× em média.
- **Com lucro zero, o multiplicador não tem em que incidir.** App sem receita em
  marketplace vende por valor de ativo: na prática, **R$ 60k – R$ 150k**.
- Micro-SaaS abaixo de US$ 10k de MRR negocia a 2×–3,5× ARR — irrelevante aqui,
  porque o ARR é zero. Esses múltiplos precificam o *futuro*, não o presente.

### Método 3 — Opção real, com pesos realistas

ARPU líquido de **R$ 10/mês** (R$ 120/ano por assinante). Múltiplos de saída
rebaixados para a faixa de micro-SaaS sem histórico de retenção.

| Cenário | Assinantes em 36m | ARR | Múltiplo | Valor | Peso |
|---|---:|---:|---:|---:|---:|
| Falha — resta só o ativo | 0 | R$ 0 | — | R$ 150k | **78%** |
| Conservador | 1.200 | R$ 144k | 1,8× | R$ 260k | 17% |
| Base | 5.000 | R$ 600k | 2,5× | R$ 1,5M | 4,5% |
| Otimista | 18.000 | R$ 2,16M | 3,0× | R$ 6,5M | 0,5% |

O peso de 78% na falha é a taxa-base honesta para app de consumo por assinatura,
pré-lançamento, fundador solo, sem canal e sem orçamento, numa categoria com
incumbente gratuito. Na primeira leitura eu usei 60% — era otimismo disfarçado
de prudência.

**Cálculo:**

- Piso de ativo disponível hoje, sem desconto de tempo: **R$ 150k**
- Excedente sobre o piso, ponderado:
  `0,17 × 110k + 0,045 × 1.350k + 0,005 × 6.350k` = **R$ 111k**
- Trazido a valor presente a 25% a.a. por 3 anos (÷1,95): **R$ 57k**
- **Valor total: R$ 150k + R$ 57k ≈ R$ 207k**

### Método 4 — Comparáveis pré-seed BR
Produto pronto, fundador solo, sem tração: **pede-se** R$ 300k a R$ 500k de
pré-money. **Fecha-se** bem abaixo disso, e quase sempre com parte em vesting.
Serve como teto, não como âncora.

### Triangulação

```
Marketplace (sem receita)  |████░░░░░░░░░░░░░░|  R$  60k – 150k
Piso de ativo              |░░████░░░░░░░░░░░░|  R$ 120k – 180k
Opção real                 |░░░░░█░░░░░░░░░░░░|  R$ 207k
Pré-seed BR (o que se pede)|░░░░░░░████████░░░|  R$ 300k – 500k   (teto)
                           ─────────────────────────────────────
FAIXA DEFENSÁVEL           |░░░█████░░░░░░░░░░|  R$ 180k – 300k
ÂNCORA                                           R$ 220k pré-money
```

**20% = R$ 44.000.**

---

## 8. Estrutura recomendada para os 20%

A R$ 44 mil, **vender 20% por dinheiro destrói mais valor do que cria**: a
diluição é para sempre, o caixa dura um trimestre. A participação só se paga se
o que entrar for canal.

### Opção A — 5% em dinheiro, 15% por metas (**recomendada**)

- **5% por R$ 11.000 à vista** — pré-money de R$ 220 mil. Serve de compromisso
  real, não de financiamento.
- **15% em earn-in**, vesting mensal ao longo de 24 meses, cliff de 6, liberado
  contra metas:

| Marco | Meta | Fatia liberada |
|---|---|---:|
| 6 meses | Apps publicados nas duas lojas + 500 cadastros | 3% |
| 12 meses | **250 assinantes pagantes** (ARR ~R$ 30k) | 5% |
| 24 meses | **1.000 assinantes pagantes** (ARR ~R$ 120k) | 7% |

- O sócio também banca as despesas diretas de lançamento (~R$ 40 mil ao longo
  de 12 meses) **como despesa da sociedade**, contabilizada, não como compra de
  participação adicional.
- Meta não cumprida ⇒ a fatia não liberada não é emitida. Sem discussão.

### Opção B — dinheiro puro
**20% por R$ 44.000.** Só faz sentido se o sócio trouxer o canal junto — caso
contrário o vendedor entrega um quinto da empresa por quatro meses de caixa.

### Opção C — não vender agora (**a alternativa que precisa estar na mesa**)
Publicar nas lojas custa cerca de R$ 10 mil e algumas semanas. Com 300 pagantes
e uma curva D30 medida, a valuation sai da faixa de ativo e entra na faixa de
múltiplo: **R$ 500k a R$ 900k**, e os mesmos 20% passam a valer R$ 100k a
R$ 180k. Se o candidato a sócio traz só dinheiro, esta opção é melhor.

### Cláusulas inegociáveis
Acordo de sócios · vesting reverso do fundador · cessão formal de IP para a
sociedade · direito de preferência · tag along e drag along · não-concorrência
no nicho · reversão da participação por metas não cumpridas · e, por escrito,
quem decide produto e quem decide comercial.

### Uso dos R$ 44 mil (12 meses)

| Destino | Valor |
|---|---:|
| Marketing de lançamento (igrejas, líderes, creators) | R$ 20.000 |
| Publicação nas lojas, licenças, jurídico e contábil | R$ 12.000 |
| Infra e IA por 12 meses | R$ 8.000 |
| Reserva de caixa | R$ 4.000 |

Nenhum centavo para desenvolvimento — essa parte segue aportada em horas pelo
fundador.

---

## 9. Chances reais de vender

| Perfil de comprador | Chance de fechar | Por quê |
|---|---:|---|
| Investidor financeiro puro | **10–15%** | Pré-lançamento sem tração é o ativo mais difícil de vender no mercado brasileiro, e a R$ 44 mil o cheque é pequeno demais para justificar a diligência |
| **Sócio operador com canal gospel** | **45–55%** | O preço realista muda o jogo: ele aporta o que falta e não precisa desembolsar quase nada de início |
| Estratégico (editora, rede de igrejas, mídia) | **15% hoje** | Precisa de prova de uso; sobe muito com 5 mil usuários ativos |

Vale registrar: **baixar a valuation aumenta a chance de fechar.** A R$ 800 mil,
um sócio operador olha a planilha e sai da mesa. A R$ 220 mil, com 5% à vista e
o resto por metas, a conversa é razoável para os dois lados.

**O que mais move o valor — em ordem de impacto:**

1. **Publicar nas duas lojas.** Muda o ativo de "site" para "app". Semanas.
2. **Uma curva de retenção D7/D30 com 200 usuários de igreja.** É a única
   métrica que a categoria respeita, e é a que hoje não existe.
3. **Os 10 primeiros pagantes.** Provam o funil ponta a ponta nas três rails.
4. **Uma carta de intenção de uma igreja ou rede.** Vale mais que o deck.

---

## 10. O que faria o número subir

| Marco atingido | Faixa de valuation |
|---|---|
| Hoje — produto pronto, zero tração | **R$ 180k – 300k** |
| Nas lojas + 500 cadastros + D30 medida | R$ 350k – 600k |
| 300 assinantes pagantes (ARR ~R$ 36k) | R$ 500k – 900k |
| 1.000 assinantes pagantes (ARR ~R$ 120k) | R$ 900k – 1,5M |
| 3.000 assinantes com retenção provada | R$ 1,8M – 3,0M |

Cada linha dessa tabela custa meses, não milhões. É por isso que a decisão de
vender agora é, antes de tudo, uma decisão sobre **quem** compra — não sobre
quanto.

---

## 11. Por que a primeira leitura era alta demais

Registro do que mudou, para a conversa não recomeçar do zero:

| Premissa | 1ª leitura | Agora | Motivo |
|---|---|---|---|
| Custo de reposição usado como valor | R$ 250k – 460k (clone completo) | R$ 120k – 180k (clone enxuto), e **fora da conta principal** | Custo de construção é sunk cost; o comprador não precisa das 61 telas |
| Conversão do SAM em pagantes | 4% | 2% | 4% é topo de faixa de país rico |
| ARPU líquido | R$ 15/mês | R$ 10/mês | Mix real com plano anual e comissão de loja |
| Retenção média | 10 meses | 7 meses | Base de app devocional sem conteúdo semanal |
| Peso do cenário de falha | 60% | **78%** | Taxa-base honesta para consumo pré-lançamento sem canal |
| Assinantes no cenário base (36m) | 12.000 | 5.000 | O anterior exigia um canal que não existe |
| Múltiplos de saída | 3,0× – 4,0× ARR | 1,8× – 3,0× ARR | Faixa de micro-SaaS sem histórico de retenção |
| **Âncora de valuation** | **R$ 800k** | **R$ 220k** | Soma de tudo acima |
| **Preço de 20%** | **R$ 160k** | **R$ 44k** | — |

O erro de fundo era um só: **tratar escopo construído como se fosse valor de
mercado.** Um app completo sem usuários não vale o que custou — vale o que
alguém consegue fazer com ele, descontado pela chance de não conseguir.

---

## 12. Fontes

- IBGE, Censo 2022 — evangélicos e religião no Brasil
  ([Agência Brasil](https://agenciabrasil.ebc.com.br/geral/noticia/2025-06/evangelicos-crescem-e-representam-mais-de-um-quarto-da-populacao),
  [Agência Gov](https://agenciagov.ebc.com.br/noticias/202506/censo-2022-catolicos-seguem-em-queda-evangelicos-e-sem-religiao-crescem-no-pais))
- [YouVersion — 1 bilhão de instalações](https://www.youversion.com/news/bible-app-reaches-one-billion-installs)
- [Hallow — perfil de negócio e receita (Contrary Research)](https://research.contrary.com/company/hallow)
- [Appfigures — receita de apps de oração](https://appfigures.com/resources/insights/hallow-lent-surge-prayer-app-revenue)
- [Christianity Today — investimento de VC em apps de fé](https://www.christianitytoday.com/2022/01/app-investment-prayer-bible-meditation-glorify-hallow/)
- [Learn of Christ — catálogo de 508 apps cristãos](https://learnofchrist.com/resources/apps)
- [Flippa — múltiplos de valuation de negócios digitais 2026](https://flippa.com/blog/digital-business-valuation-multiples/)
- [BigIdeasDB — múltiplos de SaaS 2026 (615 negócios)](https://bigideasdb.com/saas-valuation-multiples-2026)
- [Bíblia Sagrada (br.biblia) — Google Play](https://play.google.com/store/apps/details?id=br.biblia)
