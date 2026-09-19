# fastlane — capturas e ficha da loja

Estrutura para `deliver` (App Store Connect) e `supply` (Google Play), gerada
a partir de `handoff-lojas/`. Sobe **só capturas e metadados de texto — nunca
o binário** (AAB/IPA). Ver `Fastfile`, `Deliverfile` e `Supplyfile`.

## Como rodar

```bash
bundle install                        # primeira vez, instala as gems (fastlane)
bundle exec fastlane ios upload_store_listing       # App Store Connect
bundle exec fastlane android upload_store_listing   # Google Play
```

Cada lane sobe todos os locales que tiverem conteúdo. Os textos (pt-BR e
en-US) já estão preenchidos nos dois — mas as capturas do en-US ainda não
existem (só as pastas de screenshot ficam vazias, com um `NOTE.md`
explicando isso; texto e imagem são enviados por mecanismos separados no
`deliver`/`supply`, então um locale pode ter um preenchido e o outro não).
Quando as capturas em inglês existirem, apague os `NOTE.md` e a lane sobe
os dois locales completos sem precisar de ajuste.

## O que já está aqui

- **Capturas pt-BR**, na ordem exata de `handoff-lojas/README.md` (não
  reordenar — as três primeiras são o que a busca da loja mostra):
  `01-hoje`, `02-meu-plano`, `03-biblia`, `04-metricas`, `05-comunidade`,
  `06-oracao`.
  - iOS: `screenshots/pt-BR/` (1290×2796, originais, sem recorte/recompressão)
  - Android: `metadata/android/pt-BR/images/phoneScreenshots/` (1080×1920, idem)
  - Imagem de destaque do Play: `metadata/android/pt-BR/images/featureGraphic.png` (1024×500)

## Textos da ficha — preenchidos (pt-BR e en-US)

`metadata/{pt-BR,en-US}/*.txt` (iOS) e `metadata/android/{pt-BR,en-US}/*.txt`
(Android) têm conteúdo real. O pt-BR é baseado no que já estava levantado em
`~/Desktop/Play Store - Jesus Corner/ficha-da-loja.md` (não é texto
genérico); o en-US é uma versão em inglês escrita do zero pro mesmo
conteúdo — não é tradução literal do pt-BR (frase por frase seria
estranha em inglês; a estrutura e o sentido de cada seção foram mantidos).

- `name.txt`/`title.txt`: `Jesus' Corner` (mesmo nome nos dois idiomas)
- `subtitle.txt` (iOS, 30 car.): `Bíblia, oração e reflexão` /
  `Bible, prayer & reflection`
- `short_description.txt` (Android, 80 car.): a linha de abertura da ficha
- `description.txt`/`full_description.txt` (4000 car., mesmo texto nas duas
  lojas em cada idioma): a descrição completa — como funciona, leitura
  bíblica, oração guiada, reflexão, estudos, comunidade, progresso,
  disponível em pt/en, plano grátis vs. Premium vs. Premium + IA (sem citar
  preço — preço é o que a própria loja mostra, e os valores em
  `storeTiers.js` ainda não foram confirmados como finais)
- `keywords.txt` (iOS, 100 car.): termos que não repetem nome/subtítulo
- `promotional_text.txt` (iOS, 170 car., atualizável sem novo binário)
- `release_notes.txt` (iOS): nota de lançamento da primeira versão
- `marketing_url.txt`: `https://jesuscorner.app`
- `privacy_url.txt`: `https://jesuscorner.app/privacidade` (rota real do
  site; a mesma URL nos dois locales — o site troca o idioma do conteúdo
  pelo seletor da própria página, não por caminho)
- `support_url.txt`: `https://jesuscorner.app/#contato` (seção de contato
  da home do site — não existe página dedicada de suporte)
- `video.txt` (Android, os dois locales): deixado vazio de propósito — não
  existe vídeo de divulgação do app

Todos os campos respeitam o limite de caracteres de cada loja (conferido
por script antes de gravar).

## Ícone — pronto

Gerado pelo `brand/render-icons.mjs` já existente no repo — mesma
geometria/cores de `src/brand/brandSymbol.js` que desenha a marca na
interface (BrandMark.jsx), então o ícone da loja nunca diverge da marca do
app. Rodar de novo se o símbolo mudar: `node brand/render-icons.mjs`
(precisa do Chromium do Playwright — `npx playwright install chromium`
depois de `npm install`; adicionei `playwright` como devDependency porque
o script já dependia dele sem declarar).

- **iOS (1024×1024):** não existe campo separado no `deliver` — o ícone da
  App Store vem do próprio binário. Atualizado direto no asset catalog do
  Xcode: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
  (nome do arquivo é herança do Capacitor; o conteúdo é 1024×1024).
  Quadrado, opaco, sem cantos arredondados — a Apple aplica a máscara dela.
- **Android (512×512):** `metadata/android/{pt-BR,en-US}/images/icon.png` —
  mesmo ícone nos dois locales (o ícone de loja não muda por idioma).
  Fundo sólido até a borda (sem transparência), símbolo reduzido pra caber
  na zona seguro de máscara do Android.

Rodar `node brand/render-icons.mjs` sem querer também regenera o ícone real
do app (launcher, notificação, splash, PWA) — nada disso foi commitado
aqui de propósito, só os dois arquivos de loja acima. Esses outros já
estavam corretos/atualizados; se algum dia divergirem da marca, é rodar o
script e revisar o diff completo, não só a parte da loja.

## O que ainda falta

- **Capturas em inglês** (`screenshots/en-US/`,
  `metadata/android/en-US/images/phoneScreenshots/`): os textos do locale
  en-US já existem (acima), mas as imagens não — ver `NOTE.md` dentro de
  cada uma dessas pastas. As telas em inglês existem em
  `handoff-screenshots-en/`; falta escrever a frase de venda de cada
  captura (não é tradução literal das frases em pt-BR) e montar as seis
  imagens, igual foi feito pro pt-BR em `handoff-lojas/`.
