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

Cada lane sobe todos os locales que tiverem conteúdo — pt-BR e en-US estão
os dois completos (texto + capturas + ícone).

## O que já está aqui

- **Capturas pt-BR e en-US**, refeitas em 2026-11-18 com as telas atuais
  do app (não reordenar — as três primeiras são o que a busca da loja
  mostra): `01` Hoje/Today, `02` Meu Plano/My Plan, `03` Bíblia/Bible,
  `04` Sua Bíblia/Your Bible, `05` Comunidade/Community, `06`
  Oração/Prayer. A 04 era Métricas; a tela que mostra o progresso hoje é a
  Sua Bíblia (a roda dos livros e os selos).
  - iOS: `screenshots/{pt-BR,en-US}/` (1290×2796). O `Deliverfile` usa
    `overwrite_screenshots(true)`, então subir troca as da loja por estas.
  - Android: `metadata/android/{pt-BR,en-US}/images/phoneScreenshots/`
    (1080×1920). O `supply` já troca as capturas do Play por estas.
  - Imagem de destaque do Play: `metadata/android/{pt-BR,en-US}/images/
    featureGraphic.png` (1024×500), uma por locale, com a tela Hoje atual.
  - De onde vêm: as telas de verdade do app na pré-visualização
    (`dev/gamificacao.html?tela=hoje|meuPlano&plano=p1|biblia&livro=Salmos&cap=23&parabens=nao|suaBiblia|comunidade&grupos=3&amigos=5&novas=1|pedidos&pedidos=7&respondidos=12`,
    com `&lang=en` para o inglês), capturadas a 390 px de largura em 3×,
    com a frase de venda em cima e a tela num quadro de celular que sai
    pela borda de baixo. Fundo claro nas telas 1, 3 e 5; escuro nas 2, 4 e 6.
  - As capturas em inglês não são tradução das telas em pt-BR: são o app
    de verdade em inglês (separador decimal, datas, horário em 12h), com o
    que as pessoas escreveram (pedidos, mensagens, nomes de grupo) também
    em inglês, e as frases de venda foram escritas em inglês, não
    traduzidas ao pé da letra (ex.: "Sua rotina com Deus cabe no dia" virou
    "Time with God that fits your day").
  - A Escritura na tela de leitura é a versão que o app usa (NVT em
    português, NLT em inglês), com a sigla visível no topo da tela. São
    poucos versículos (Salmo 23), dentro do que a Tyndale permite citar
    com crédito.

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
  disponível em pt/en, plano grátis vs. Premium (sem citar preço — o preço
  é o que a própria loja mostra). Reescrita em 2026-11-18 para o app
  atual: meta semanal (não sequência de dias), um plano pago só (sem o
  "Premium + IA"), o que é grátis e o que é Premium igual a
  `src/billing/planFeatures.js`, pedidos de oração, Biblioteca, estudos por
  tema, selos e resumo da semana, e nenhum recurso chamado de "IA".
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

## Status

pt-BR e en-US estão completos: capturas, feature graphic, textos e ícone.
Falta só o que não dá pra fazer daqui — credenciais de loja (`FASTLANE_APPLE_ID`,
`FASTLANE_TEAM_ID`, `SUPPLY_JSON_KEY_FILE`, ver `Appfile`) e os passos manuais
no App Store Connect / Play Console.
