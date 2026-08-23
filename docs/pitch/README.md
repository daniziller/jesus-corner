# Pitch deck — venda de 30% do app

`jesus-corner-pitch-30.pptx` — 18 slides, em português, para apresentar a
oportunidade de participação societária a um investidor.

## Antes de enviar

O deck foi montado no estágio **pré-lançamento, sem tração publicada**. O
slide 6 ("Onde estamos hoje") tem quatro campos marcados em amarelo com
"a preencher":

- Usuários cadastrados
- Assinantes ativos
- Retenção em 30 dias
- Lista de espera / beta

Preencha ou apague o cartão inteiro — não deixe o marcador amarelo à vista.
O slide 18 tem o contato como `[seu nome] · [e-mail] · [telefone]`.

Cada slide tem notas do apresentador (aba "Notas" no PowerPoint) com o
argumento a usar e as perguntas prováveis do investidor.

## Números que o deck usa

| Dado | Origem |
|---|---|
| 147,6 mi de cristãos no Brasil (56,7% católicos + 26,9% evangélicos, pop. 10+) | IBGE, Censo 2022 |
| Mercado global de apps de bem-estar espiritual: US$ 2,2 bi (2024) → 2,8 bi (2026) → 7,3 bi (2033) | Grand View Research / Business Research Company |
| Hallow: US$ 157 mi captados, primeiro app religioso no top 10 da App Store | Anúncios públicos de captação + perfis de investimento |
| Hallow ≈ US$ 70/ano · Glorify ≈ US$ 60/ano | Preços de lista públicos, agosto de 2026 |
| R$ 16,90/mês · R$ 169,90/ano · US$ 6,90 · US$ 69,90 | `src/billing/storeTiers.js` |
| 166 arquivos · 33.456 linhas | `find src api -name "*.js*"` |

Projeções (slides 11 e 12) são **premissas declaradas**, não histórico: receita
líquida de R$ 13,50 por assinante/mês e cancelamento de 6% ao mês. O deck diz
isso na cara do investidor — é proposital.

A faixa de valuation (R$ 1,5 mi a R$ 3,0 mi pré-aporte, 30% por R$ 450 a 900
mil) é estimativa de negociação a partir do custo de reposição do software e
do estágio. Não é laudo de avaliação.

## Regenerar

```bash
cd docs/pitch
npm install pptxgenjs react react-dom react-icons sharp   # se ainda não estiverem instalados
node gerar-deck.js
```

O script lê `../../brand/icon-512.png` (logo) e `cross-alpha.png` (a mesma
cruz com fundo transparente, usada como marca d'água nos slides escuros).
Ícones são renderizados de `react-icons` na hora, na cor da marca.
