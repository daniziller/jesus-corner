# Valuation — Jesus' Corner

**Data:** 08/09/2026 · **Estágio:** produto pronto, pré-lançamento (0 assinantes)
**Objetivo:** vender 20% para um sócio operador
**Fonte dos números do produto:** levantamento direto do repositório (commit `1add509`)

> Isto não é laudo de avaliação nem parecer jurídico. É uma triangulação de
> três métodos, com as premissas explícitas para poderem ser contestadas na
> mesa de negociação.

---

## 1. Resumo executivo

| | |
|---|---|
| **Custo de reposição do que já existe** | R$ 250k – R$ 460k |
| **Comparáveis pré-seed BR (produto pronto, sem tração)** | R$ 600k – R$ 1,2M |
| **Opção real descontada (cenários × probabilidade)** | ~R$ 870k |
| **Faixa justa triangulada** | **R$ 600k – R$ 1,0M** |
| **Âncora recomendada (pré-money)** | **R$ 800.000** |
| **Preço de 20%** | **R$ 160.000** |

**A conclusão desconfortável:** o app vale hoje muito menos do que vale o mesmo
app com 1.000 assinantes pagantes. Cada mês de atraso no lançamento custa mais
valor do que qualquer ganho possível na negociação. Se em 6 meses houver 1.000
assinantes (ARR ~R$ 180k), a faixa vai para R$ 1,5M – R$ 2,5M e os 20% passam a
valer R$ 300k – R$ 500k. **Negociar melhor rende dezenas de milhares; lançar
rende centenas de milhares.**

---

## 2. O que existe hoje (escopo real, medido)

Inventário do código, não da apresentação:

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

### Blocos funcionais prontos

- **Leitura** — Bíblia completa nos dois testamentos, ordem canônica e
  cronológica, 4 ritmos, leitura livre em tela cheia, marcação, destaques,
  anotações, "último texto lido", busca por texto.
- **Planos** — plano diário, plano por tema gerado por IA (3 a 30 dias),
  planos de grupo com proposta e aprovação, banco de estudos, método indutivo.
- **Rotina espiritual** — oração ACTS com timer, oração livre, pedidos de
  oração (pessoais e de grupo), reflexão com perguntas geradas ou livre,
  bênção, "dia concluído" com imagem compartilhável para Stories.
- **Comunidade** — amigos, grupos, salas de capítulo, mensagens, atividade de
  quem leu, desafios, resumo semanal, digest por e-mail.
- **IA** — chat sobre o trecho que está sendo lido, geração de planos por tema,
  geração de estudos, pares de pergunta de reflexão, busca semântica nas
  anotações, TTS com voz natural (modo mãos-livres tipo audiolivro),
  cache de contexto por capítulo e canal de denúncia de resposta.
- **Monetização** — três tiers (`free`, `premium`, `premium_ai`), gate no
  cliente e revalidação no servidor, webhooks Stripe / RTDN Google /
  App Store Server Notifications, portal de gestão de assinatura,
  pay-what-you-want, convites e códigos.
- **Operação** — painel admin com métricas, MRR, funil de onboarding por
  período e idioma, coortes de retenção, convites, broadcast, moderação e
  Fale Conosco; 4 crons (lembretes de leitura a cada 5 min, digest semanal,
  lembretes de contribuição, retenção).
- **Conformidade** — LGPD tratada como dado sensível (convicção religiosa,
  art. 5º II): consentimento registrado, política de senha, exportação de
  dados e exclusão de conta implementadas (`docs/lgpd.md`).
- **Distribuição** — PWA instalável, TWA Android empacotado via Bubblewrap
  (`com.jesuscorner.app`, `app.jesuscorner.app`) e projeto iOS via Capacitor.
  Falta apenas submeter às lojas.

Isto **não é um MVP**. É um produto de categoria completa, com a infraestrutura
chata (pagamento em três lojas, LGPD, admin, i18n, push) já resolvida — que é
justamente a parte que costuma matar projetos deste nicho no mês 4.

---

## 3. Horas investidas e alavancagem

**Esforço do fundador:** 4h por dia útil, de 08/06/2026 a 08/09/2026 =
**67 dias úteis × 4h = 268 horas**.

**Reconstrução por uma equipe convencional** (estimativa bottom-up, por bloco):

| Bloco | Horas |
|---|---:|
| Bíblia, leitor, índice de busca, destaques e notas | 250 |
| Planos (canônico, cronológico, por tema/IA, de grupo) | 200 |
| Oração, reflexão, rotina guiada | 180 |
| Comunidade (amigos, grupos, salas, mensagens) | 280 |
| IA (chat, geração, busca em notas, TTS) | 220 |
| Billing 3 rails + entitlements + webhooks | 200 |
| Auth, LGPD, consentimento, exportação/exclusão | 120 |
| Push, crons, e-mail transacional | 100 |
| Admin (métricas, funil, convites, broadcast, moderação) | 150 |
| i18n, design system, onboarding, PWA/TWA/Capacitor, marca | 200 |
| Integração e QA | 150 |
| **Total** | **2.050** |

| Cenário de reconstrução | Taxa | Custo |
|---|---:|---:|
| Freelancer pleno BR | R$ 120/h | R$ 246.000 |
| Agência (só engenharia) | R$ 180/h | R$ 369.000 |
| Agência com design/PM/QA (+25%) | — | R$ 461.000 |

**Alavancagem: 268h entregaram ~2.050h de produto — fator 7,6x.**
Traduzido: **cerca de R$ 1.300 de ativo gerado por hora trabalhada.**

Isso é um argumento de valuation por si só — não porque as horas valham caro,
mas porque **a velocidade de iteração é um ativo que continua rendendo.** O
sócio não está comprando 64 mil linhas paradas; está comprando uma máquina que
entrega um bloco funcional por semana.

---

## 4. Mercado e nicho

### 4.1 Tamanho (Brasil, mercado primário)

- **47,4 milhões de evangélicos** (26,9% da população, Censo 2022 do IBGE) —
  crescimento de 35M para 47,4M entre 2010 e 2022.
- **86,9% da população de 10+ anos se declara cristã** (~183 milhões).
- Prova de demanda digital: o app "Bíblia Sagrada" (br.biblia) passa de
  **20 milhões de downloads** só na Play Store brasileira.
- Mais da metade dos cristãos que leem a Bíblia regularmente já lê no celular.

**Funil de mercado (premissas explícitas):**

| Camada | Estimativa | Premissa |
|---|---:|---|
| TAM — cristãos no Brasil | 183M | Censo 2022 |
| SAM — usam algum app bíblico | ~28M | ~15% dos cristãos, coerente com os 20M+ downloads de um único concorrente |
| Alvo pagante — dispostos a assinar | ~1,1M | 4% do SAM (freemium de consumo converte 2–5%) |
| SOM 36 meses (cenário base) | 12.000 | ~1% do alvo pagante |

### 4.2 Quem já está no ringue

| App | Downloads | Capital levantado | Preço 2026 | Modelo |
|---|---|---|---|---|
| YouVersion (Bible App) | **1 bilhão** de instalações | ONG / doações | Grátis | Gratuito, imbatível em alcance |
| Hallow | 24M | **US$ 157M** (Thiel, Founders Fund, General Catalyst, SoftBank) | US$ 69,99/ano | Católico, oração/meditação, ~US$ 40M de receita líquida em 2025 |
| Glorify | 25M+ | **US$ 84M** (a16z) | US$ 83,88/ano | Devocional cristão, foco EUA/Europa/LatAm |
| Pray.com | — | US$ 20M+ | US$ 99/ano | Áudio, histórias bíblicas, sono |
| Bíblia Sagrada / JFA / Mobidic (BR) | 20M+ | Bootstrap | Grátis + anúncios | Leitura pura, monetização por ads |

**Quantos apps existem com a mesma ideia?** Há um catálogo independente com
**508 apps cristãos** revisados, divididos em 27 categorias — e centenas de
apps bíblicos em português nas lojas. A categoria já se dividiu em quatro
sub-nichos: **leitura** (hábito e traduções), **estudo** (referências
cruzadas e comentários), **devocional** (ritmo emocional) e **chat de IA**
(respostas conversacionais).

**Onde o Jesus' Corner se encaixa:** é o raro app que atravessa os quatro —
leitura + rotina guiada + comunidade + IA — e o único desta lista construído
**em português como idioma nativo**, e não traduzido. Os gigantes globais
tratam o Brasil como mercado de localização; aqui o Brasil é o mercado.

### 4.3 Preço — o posicionamento mais forte

| | Preço anual | Em BRL (câmbio ~5,4) |
|---|---|---|
| Pray.com | US$ 99,00 | ~R$ 535 |
| Glorify | US$ 83,88 | ~R$ 453 |
| Hallow | US$ 69,99 | ~R$ 378 |
| **Jesus' Corner Premium** | **R$ 119,90** | **R$ 120** |
| **Jesus' Corner Premium + IA** | **R$ 199,90** | **R$ 200** |

O Premium custa **um terço** do concorrente global mais barato, num produto de
escopo comparável ou maior. Isso não é sub-precificação: é o preço certo para o
poder de compra brasileiro — e é uma barreira real, porque Hallow e Glorify não
conseguem baixar preço no Brasil sem canibalizar a receita nos EUA.

---

## 5. Pontos fortes e fracos

### Fortes

1. **Produto completo, não protótipo.** 61 telas, 60 migrations, 50 endpoints.
   O comprador entra num ativo pronto, não numa promessa.
2. **A infraestrutura chata está resolvida.** Três rails de cobrança, LGPD com
   dado sensível, painel admin com funil e coortes, i18n, push e crons. É onde
   a maioria dos concorrentes bootstrap trava.
3. **Velocidade de execução comprovada.** 7,6x de alavancagem em horas. Isso
   reduz o custo de cada aposta futura de produto.
4. **Preço 3x abaixo dos globais** com escopo equivalente.
5. **Nicho grande, crescente e com fé comprovada em pagar** — 47,4M de
   evangélicos no Brasil, e Hallow provou que o segmento gera US$ 40M/ano.
6. **IA já em produção** (chat contextual, geração de planos, TTS), não no
   roadmap — no sub-nicho que mais cresce em 2026.
7. **Comunidade como retenção.** Grupos, salas de capítulo e planos coletivos
   são o antídoto natural ao churn de app devocional. Igreja é uma rede social
   que já existe offline; o app só precisa espelhá-la.
8. **Bilíngue desde a origem.** Expansão para o mercado hispânico e para a
   diáspora brasileira nos EUA não exige refazer nada estrutural.

### Fracos

1. **Zero tração — este é o ponto que domina todos os outros.** Sem usuários
   ativos, sem retenção medida, sem um único real de receita, qualquer
   valuation é negociação, não cálculo.
2. **Não está nas lojas.** TWA e projeto iOS prontos, mas não submetidos. Até
   que estejam, o alcance é de link compartilhado.
3. **Bus factor 1.** Um único desenvolvedor conhece as 64 mil linhas. É o
   maior risco que um sócio vai apontar — e é legítimo.
4. **CAC × LTV apertado.** Com ARPU de ~R$ 15/mês e retenção realista de 8 a
   12 meses, o LTV fica em R$ 90–145 líquido de loja. Tráfego pago em massa
   não fecha a conta. **O crescimento tem que ser orgânico: igrejas, líderes,
   grupos e indicação.** Isso é exatamente o que um sócio operador deveria
   trazer — e é a razão de o perfil de sócio importar mais que o cheque.
5. **Licença do texto bíblico.** Hoje via API.Bible (NVT e NLT). Antes de
   escalar comercialmente é preciso confirmar por escrito os termos de uso
   comercial com os detentores — risco pequeno, mas de resolução obrigatória.
6. **Custo variável de IA.** Chat e TTS têm custo por uso. A margem do tier
   `premium_ai` precisa ser medida com usuários reais, não estimada.
7. **Comissão das lojas.** 15% a 30% da receita das assinaturas mobile.
8. **Concorrentes com US$ 100M+ de capital** podem entrar no Brasil com preço
   agressivo a qualquer momento.
9. **Sem marca, sem canal, sem audiência.** O produto é forte; a distribuição
   é zero.

---

## 6. Unidade econômica (premissas para o sócio contestar)

| Item | Premium | Premium + IA |
|---|---:|---:|
| Preço mensal | R$ 12,90 | R$ 21,90 |
| Líquido de loja (15%) | R$ 10,97 | R$ 18,62 |
| Líquido via web/Stripe (~4,5%) | R$ 12,32 | R$ 20,91 |
| Custo de infra por usuário/mês | ~R$ 1,00 | ~R$ 1,00 |
| Custo de IA por usuário ativo/mês | — | R$ 2,00 – 5,00 |
| **Margem bruta** | **~80%** | **~65–70%** |

- **LTV** (retenção média assumida de 10 meses, mix 70% mensal / 30% anual):
  **~R$ 120**
- **CAC-teto para LTV/CAC = 3:** **R$ 40**
- CAC realista por canal: orgânico/igreja R$ 8–25 · creator gospel R$ 20–45 ·
  tráfego pago frio R$ 35–70

**Leitura direta:** tráfego pago frio não fecha. O modelo só funciona com
canal — parceria com igrejas, líderes e criadores do meio gospel. É essa a vaga
que o sócio operador preenche.

---

## 7. Os três métodos de valuation

### Método 1 — Custo de reposição (piso)

O que custaria refazer o que existe: **R$ 250k – R$ 460k**.
Este é o piso duro. Abaixo disso, é mais barato para o comprador contratar uma
agência do que comprar participação — mas ele perderia 3 meses e a marca.

### Método 2 — Comparáveis

- Micro-SaaS bootstrap abaixo de US$ 1M de ARR vende, em média, a **2,85x o
  lucro anual** (Flippa, 2026), com o quartil superior chegando a 6,13x.
- SaaS privado negocia a **3x–8x ARR**; micro-SaaS abaixo de US$ 10k de MRR,
  a **2x–3,5x ARR**.
- **Nenhum desses múltiplos se aplica hoje**, porque a receita é zero. Servem
  para precificar o *futuro*, não o presente.
- Para pré-lançamento no Brasil, com produto pronto e fundador solo, a faixa
  praticada de pré-money anjo é **R$ 600k – R$ 1,2M**.

### Método 3 — Opção real (cenários ponderados)

Assinantes e receita projetados em 36 meses, com ARPU blended de R$ 15/mês:

| Cenário | Assinantes em 36m | ARR | Múltiplo | Valor da empresa | Probabilidade |
|---|---:|---:|---:|---:|---:|
| Falha / só o ativo | 0 | R$ 0 | — | R$ 350k | 60% |
| Conservador | 3.000 | R$ 540k | 3,0x | R$ 1,6M | 25% |
| Base | 12.000 | R$ 2,16M | 3,5x | R$ 7,6M | 12% |
| Otimista | 40.000 | R$ 7,2M | 4,0x | R$ 28,8M | 3% |

- **Valor esperado em 36 meses:** R$ 2,39M
- **Trazido a valor presente** a 40% a.a. (taxa de risco para pré-lançamento):
  R$ 2,39M ÷ 1,40³ = **R$ 870k**

### Triangulação

```
Custo de reposição   |████████░░░░░░░░░░|  R$ 250k – 460k   (piso)
Comparáveis pré-seed |░░░░░░████████████|  R$ 600k – 1,2M
Opção real           |░░░░░░░░███░░░░░░░|  R$ 870k
                     ──────────────────────────────────────
FAIXA JUSTA          |░░░░░░█████████░░░|  R$ 600k – 1,0M
ÂNCORA                                     R$ 800k pré-money
```

**20% = R$ 160.000.**

---

## 8. Estrutura recomendada para os 20%

O sócio é operador — traz canal e trabalho, não só cheque. Vender 20% por
dinheiro puro subaproveita isso. Três desenhos, em ordem de preferência:

### Opção B — Dinheiro + suor (**recomendada**)
- **10% por R$ 80.000 em dinheiro** (pré-money efetivo de R$ 800k).
- **10% em earn-in**, com vesting de 24 meses, cliff de 6, atrelado a metas:
  - 6 meses: apps publicados nas duas lojas + 1.000 usuários cadastrados
  - 12 meses: 1.000 assinantes pagantes (ARR ~R$ 180k)
  - 24 meses: 5.000 assinantes pagantes (ARR ~R$ 900k)
- Metas não cumpridas ⇒ a fatia não vestida volta para a sociedade.

### Opção A — Dinheiro puro
- **20% por R$ 160.000**, R$ 800k pré-money, integralização à vista ou em duas
  parcelas contra marcos de lançamento.

### Opção C — Só suor
- **20% integralmente por vesting de 36 meses** com metas.
- Só aceitar se o sócio trouxer canal comprovado e verificável (rede de
  igrejas, base de audiência gospel, editora). Sem dinheiro na mesa, o custo de
  errar de sócio é alto demais.

### Cláusulas inegociáveis (em qualquer opção)
Acordo de sócios · vesting reverso do fundador (protege ambos) · cessão formal
de IP para a sociedade · direito de preferência · tag along e drag along ·
não-concorrência no nicho · reversão da participação por metas não cumpridas ·
definição escrita de quem decide produto e quem decide comercial.

### Uso dos recursos (R$ 160k, 12 meses)

| Destino | Valor |
|---|---:|
| Publicação nas lojas, licenças, jurídico e contábil | R$ 25.000 |
| Marketing de lançamento (igrejas, líderes, creators gospel) | R$ 70.000 |
| Infra e IA por 12 meses | R$ 25.000 |
| Conteúdo (planos, estudos, áudio) | R$ 20.000 |
| Reserva de caixa | R$ 20.000 |

---

## 9. Chances reais de vender

| Perfil de comprador | Probabilidade de fechar hoje | Por quê |
|---|---:|---|
| Investidor financeiro puro (anjo) | **15–20%** | Pré-lançamento sem tração é a coisa mais difícil de vender no mercado brasileiro |
| **Sócio operador com canal gospel** | **40–50%** | Ele aporta exatamente o que falta (distribuição) e enxerga o produto pronto como economia de 3 meses e R$ 350k |
| Estratégico (editora, rede de igrejas, mídia gospel) | **20% hoje** | Precisa de prova de uso; sobe para 60%+ com 10k usuários ativos |

**O que mais aumenta a chance de fechar — em ordem de impacto:**

1. **Publicar nas duas lojas.** Muda o ativo de "site" para "app". Semanas.
2. **200 usuários reais de igreja e uma curva de retenção D7/D30.** Retenção
   é a única métrica que um sócio de verdade vai olhar.
3. **Os 10 primeiros assinantes pagantes.** A diferença entre R$ 0 e R$ 129 de
   MRR é qualitativa, não quantitativa: prova que o funil de pagamento
   funciona ponta a ponta nas três rails.
4. **Uma carta de intenção de uma igreja ou rede.** Vale mais que qualquer
   slide de mercado.

**Recomendação honesta:** se o sócio operador certo aparecer agora, feche a
Opção B — a distribuição vale mais que a diluição. Se for investidor financeiro
puro, espere 6 meses de tração; o mesmo 20% deve valer o dobro ou o triplo.

---

## 10. Fontes

- IBGE, Censo 2022 — evangélicos e religião no Brasil
  ([Agência Brasil](https://agenciabrasil.ebc.com.br/geral/noticia/2025-06/evangelicos-crescem-e-representam-mais-de-um-quarto-da-populacao),
  [Agência Gov](https://agenciagov.ebc.com.br/noticias/202506/censo-2022-catolicos-seguem-em-queda-evangelicos-e-sem-religiao-crescem-no-pais))
- [YouVersion — 1 bilhão de instalações](https://www.youversion.com/news/bible-app-reaches-one-billion-installs)
- [Hallow — perfil de negócio e receita (Contrary Research)](https://research.contrary.com/company/hallow)
- [Appfigures — receita de apps de oração](https://appfigures.com/resources/insights/hallow-lent-surge-prayer-app-revenue)
- [Christianity Today — investimento de VC em apps de fé](https://www.christianitytoday.com/2022/01/app-investment-prayer-bible-meditation-glorify-hallow/)
- [Forbes — US$ 175,3M captados por apps religiosos](https://www.forbes.com/sites/zacharysmith/2021/12/27/faith-based-apps-attract-1753-million-as-worshipers-desert-churches/)
- [Learn of Christ — catálogo de 508 apps cristãos](https://learnofchrist.com/resources/apps)
- [Flippa — múltiplos de valuation de negócios digitais 2026](https://flippa.com/blog/digital-business-valuation-multiples/)
- [BigIdeasDB — múltiplos de SaaS 2026 (615 negócios)](https://bigideasdb.com/saas-valuation-multiples-2026)
- [Bíblia Sagrada (br.biblia) — Google Play](https://play.google.com/store/apps/details?id=br.biblia)
