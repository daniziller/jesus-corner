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

Cada lane sobe só o locale `pt-BR` por enquanto — `en-US` está vazio (ver
abaixo) e o `deliver`/`supply` simplesmente ignoram um locale sem arquivos
de screenshot novos, mas os `.txt` vazios de `en-US` **não** devem ser
enviados até terem conteúdo real (um `description.txt` vazio sobrescreveria
a ficha em inglês com texto em branco). Enquanto `en-US` não tiver conteúdo,
rode as lanes apontando só pra `pt-BR` ou remova a pasta `en-US` da lane —
ajustar isso é o próximo passo, não foi feito aqui pra não travar em decisão
sem sua confirmação.

## O que já está aqui

- **Capturas pt-BR**, na ordem exata de `handoff-lojas/README.md` (não
  reordenar — as três primeiras são o que a busca da loja mostra):
  `01-hoje`, `02-meu-plano`, `03-biblia`, `04-metricas`, `05-comunidade`,
  `06-oracao`.
  - iOS: `screenshots/pt-BR/` (1290×2796, originais, sem recorte/recompressão)
  - Android: `metadata/android/pt-BR/images/phoneScreenshots/` (1080×1920, idem)
  - Imagem de destaque do Play: `metadata/android/pt-BR/images/featureGraphic.png` (1024×500)

## Textos da ficha (pt-BR) — preenchidos

`metadata/pt-BR/*.txt` (iOS) e `metadata/android/pt-BR/*.txt` (Android) têm
conteúdo real, baseado no que já estava levantado em
`~/Desktop/Play Store - Jesus Corner/ficha-da-loja.md` (nome, descrição
curta/completa, categoria, palavras-chave, URLs — tudo escrito nesta sessão
a pedido dela, não é texto genérico):

- `name.txt`/`title.txt`: `Jesus' Corner`
- `subtitle.txt` (iOS, 30 car.): `Bíblia, oração e reflexão`
- `short_description.txt` (Android, 80 car.): a linha de abertura da ficha
- `description.txt`/`full_description.txt` (4000 car., mesmo texto nas duas
  lojas): a descrição completa — como funciona, leitura bíblica, oração
  guiada, reflexão, estudos, comunidade, progresso, disponível em pt/en,
  plano grátis vs. Premium vs. Premium + IA (sem citar preço — preço é o
  que a própria loja mostra, e os valores em `storeTiers.js` ainda não
  foram confirmados como finais)
- `keywords.txt` (iOS, 100 car.): termos que não repetem nome/subtítulo
- `promotional_text.txt` (iOS, 170 car., atualizável sem novo binário)
- `release_notes.txt` (iOS): nota de lançamento da primeira versão
- `marketing_url.txt`: `https://jesuscorner.app`
- `privacy_url.txt`: `https://jesuscorner.app/privacidade` (rota real do site)
- `support_url.txt`: `https://jesuscorner.app/#contato` (seção de contato
  da home do site — não existe página dedicada de suporte)
- `video.txt` (Android): deixado vazio de propósito — não existe vídeo de
  divulgação do app

Todos os campos respeitam o limite de caracteres de cada loja (conferido
por script antes de gravar).

## O que ainda falta

- **Ícone do app.** Não tem arquivo aqui pra nenhuma das duas lojas:
  - **iOS (1024×1024):** a App Store Connect API não aceita mais ícone de
    loja enviado à parte — ele vem do próprio binário (asset catalog do
    Xcode, `ios/App/App/Assets.xcassets/AppIcon.appiconset/`). Não existe
    campo do `deliver` pra isso; não criei arquivo porque não haveria onde
    o `deliver` o lesse.
  - **Android (512×512):** o `supply` aceita um ícone de alta resolução em
    `metadata/android/pt-BR/images/icon.png`, mas não criei o arquivo — uma
    imagem vazia/inválida quebraria o upload. Quando o ícone existir, salve
    nesse caminho exato.
- **Locale `en-US`** (`screenshots/en-US/`, `metadata/en-US/`,
  `metadata/android/en-US/`): pastas e arquivos de texto criados, mesma
  estrutura da `pt-BR`, tudo vazio — inclusive os textos, que precisam ser
  escritos em inglês, não traduzidos ao pé da letra. As capturas em inglês
  também ainda não existem — ver `NOTE.md` dentro de cada pasta de
  screenshots.
