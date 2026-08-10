# Ícones — Jesus' Corner

A **cruz é a mesma do logo original** — nada foi redesenhado. `render.py` a
extrai do PNG existente por luminância, preservando cada detalhe do pincel, e
recompõe sobre o novo fundo.

Fundo principal: `#9D4300` (`--brand-deep`), a mesma cor do wordmark.
Cruz: creme `#FFF7F0`.

## O que foi corrigido

| defeito no arquivo antigo | consequência | correção |
|---|---|---|
| marca ocupava 46% do canvas (81% transparente) | ícone aparecia menor que os vizinhos na tela inicial | o tile agora sangra até a borda — 100% |
| PNG com canal alpha | o iOS não aceita alpha e pinta o transparente de preto | saída de iOS opaca |
| não havia versão maskable | o Android recorta num círculo de 80% e cortaria a arte | variante com a cruz dentro da zona segura |
| cinza-azulado `#242C34` no fundo | cor fora do design system | substituído por `--brand-deep` |

## Arquivos

| arquivo | onde usar |
|---|---|
| `icon-512.png`, `icon-192.png` | PWA (`purpose: any`), header do app |
| `icon-ios-1024.png` | Xcode / App Store — quadrado, **sem alpha** |
| `icon-maskable-512.png` | PWA/Android `purpose: maskable` |
| `favicon-48.png`, `favicon-32.png` | favicon |
| `icon-dark-512.png` | cruz branca sobre `--bk` — contextos escuros (splash, email) |
| `icon-light-512.png` | cruz `--brand-deep` sobre `--olt` — superfícies claras, marca d'água |

## Verificado

- iOS sem canal alpha, quadrado cheio de 1024
- maskable com a cruz inteira dentro do círculo de 80%
- contraste: principal 6,1:1 · escura 18,7:1 · clara 5,8:1
- legível a 24px

## Limitação conhecida

A maior fonte disponível no repositório tem a marca com **234px**, então os
tamanhos grandes são interpolados e ficam um pouco macios — aceitável até
512px, perceptível no 1024 do iOS.

Para resolver, troque `SRC` no `render.py` por um SVG ou PNG de 1024px ou mais
e rode de novo. O resto do script não muda.

## Também encontrado

`ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` ainda é o
**placeholder azul do Capacitor** — o app iOS nunca recebeu o logo do Jesus'
Corner.

## Regenerar

```
cd brand && python3 render.py
```

Requer apenas Pillow.
