# Marca — Jesus' Corner

Identidade Bento (quadros 16a–16c de `design_handoff_jesus_corner/Jesus Corner
Redesign.dc.html`). O símbolo é um livro aberto: tile preto quente `#1A1714`
com raio de ~29% do lado, duas páginas `#A29A91` com linhas de texto
`#1A1714` e a lombada `#F0662B`. O logotipo é Manrope 800 com tracking −5%,
"Jesus'" na tinta (branco sobre escuro) e **"Corner" sempre em `#F0662B`**.

## Uma geometria, duas saídas

| onde | arquivo |
| --- | --- |
| geometria e cores (sem React) | `src/brand/brandSymbol.js` |
| símbolo na interface (SVG) | `src/components/BrandMark.jsx` |
| logotipo na interface | `src/components/BrandLogo.jsx` |
| ícones do app (PNG) | `brand/render-icons.mjs` |

Os PNGs são renderizados pelo Chromium a partir da mesma geometria que o app
desenha — nunca divergem da tela.

## Regra de redução (quadro 16b)

72px com três linhas por página, 44px com duas, 28px e 16px sem nenhuma —
só as duas páginas e a lombada. `BrandMark` aplica isso sozinho pelo tamanho.

## Variações (quadro 16c) — três, e só três

- **Padrão**: tile preto, páginas cinza, lombada laranja — sobre fundo claro
  e sobre laranja (onde o logotipo inteiro fica preto).
- **Sobre fundo escuro**: o mesmo símbolo dentro de uma placa `#EDE8E2` com
  7px de respiro (quadro 13a) — `variant="plate"`.
- **Monocromática**: só para carimbo, fatura e favicon — `variant="mono"`.

Não inclinar, não abrir em perspectiva, não arredondar as páginas além de
6px, não trocar a cor da lombada, não colorir "Jesus'" de laranja e não usar
o símbolo dentro dos blocos escuros de IA (ali o sinal é o losango).

## Arquivos gerados

| arquivo | onde usar |
| --- | --- |
| `icon-512.png`, `icon-192.png` | PWA (`purpose: any`), `public/icons/` |
| `icon-maskable-512.png` | PWA/Android `purpose: maskable` — tile sangrando, livro na zona segura |
| `icon-ios-1024.png` | Xcode / App Store — quadrado, sem alpha |
| `favicon-48.png`, `favicon-32.png` | favicon (32px já sem linhas) |
| `icon-plate-512.png` | sobre fundo escuro (placa creme) |
| `icon-inverse-512.png` | sobre preto: tile laranja, páginas pretas (16c) |
| `icon-mono-512.png` | carimbo/fatura |

O script também instala: `public/icons/*`, o AppIcon e os splashes do iOS,
e no Android TWA o launcher legado, a camada de frente do ícone adaptativo
(`ic_maskable`, fundo `#1A1714` em `values/colors.xml`), o ícone de
notificação (silhueta branca) e os splashes.

## Regenerar

```
node brand/render-icons.mjs
```

Precisa do Playwright com Chromium (`npx playwright install chromium`).
