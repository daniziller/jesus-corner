# Anotação de pregação — pacote de handoff (turno 34)

Cinco telas: tudo o que acontece depois de tocar em **"Anotar uma pregação"** no Hoje, na ordem em que a pessoa encontra.

O cartão do Hoje não abre um formulário. Ele **abre a Bíblia no último capítulo lido, já com a folha de anotação expandida** — a anotação nunca existe sem texto atrás.

| PNG | Tela | O que é |
|---|---|---|
| `34d-folha-sobre-o-texto.png` | **34d** Folha sobre o texto | O destino do botão do Hoje. Capítulo visível e rolável em cima, folha de anotação por baixo, "Na tela agora" oferecendo o versículo. |
| `34e-lapis-flutuante.png` | **34e** Lápis flutuante | A folha recolhida. Texto em tela cheia, lápis laranja arrastável com o número de passagens. |
| `34f-campos-da-anotacao.png` | **34f** Campos da anotação | Aberta pelo chevron de 34d. Tipo (seis opções) + título, preletor, instituição, link — tudo opcional. |
| `34g-escrevendo.png` | **34g** Escrevendo | Teclado em pé: a folha toma a tela, o texto sai de cena. Versículos entram como blocos citados no meio da escrita. |
| `34h-resumo-da-anotacao.png` | **34h** Resumo da anotação | Depois de "Finalizar": o app devolve um resumo escrito a partir das palavras da pessoa, os tópicos e as passagens. |

## Mapa de navegação

```
Hoje · cartão "Anotar uma pregação"
  └─► abre a Bíblia no último capítulo lido, com 34d já expandida

34d  Folha sobre o texto
├── chevron do cabeçalho ─────────► 34f (campos completos) · "Pronto" volta a 34d
├── "+ Gênesis 43:3" ─────────────► prende a passagem que está na tela
├── toque na área de escrita ─────► 34g (teclado sobe, folha em tela cheia)
├── "Minimizar" ──────────────────► 34e
├── "Grupo" ──────────────────────► escolha de grupos (a mesma de 39f, desligada por padrão)
└── ícone de compartilhar ────────► texto ou imagem

34e  Lápis flutuante · arrastável, vive nas duas leituras e na Bíblia inteira
└── toque ────────────────────────► reabre 34d · sem anotação em andamento, começa uma nova

34g  Escrevendo
├── "Versículo" ──────────────────► busca de referência · insere bloco citado no texto
├── "Tópico" ─────────────────────► quebra em pontos numerados
├── ditar ────────────────────────► transcrição por voz no ponto do cursor
├── botão escuro ─────────────────► baixa o teclado, volta a 34d
└── "Finalizar" ──────────────────► 34h

34h  Resumo
├── "Marcar na Bíblia" ───────────► as passagens viram marcações
├── toggle de grupo ──────────────► publica no grupo escolhido (nasce desligado)
├── "Voltar e escrever mais" ─────► 34g com a anotação reaberta
└── "Guardar na biblioteca" ──────► Biblioteca · chip "Sermões"
```

## Ordem de implementação

1. **34d + 34e** — a folha sobre o texto e o lápis. É a casca de tudo; entregue com o arrasto, o minimizar e o "Na tela agora" funcionando.
2. **34f** — os campos, abertos pelo chevron. Nada obrigatório.
3. **34g** — a escrita em tela cheia, com o bloco citado inserido no meio do texto e o rascunho automático.
4. **34h** — o resumo, que depende do texto e das passagens já estarem gravados.

Pare depois de cada bloco e mostre a tela ao lado do PNG.

## Os valores mudam de conta para conta

Tudo escrito nos PNGs é de uma conta de exemplo: "A espera que forma", "Pr. João Ribeiro", "Batista Central", "Gênesis 43", "Terça, 2 de setembro · 20:14", "2 passagens", "24 min anotando", "Manhã com a Palavra · 8 pessoas", o texto que o Diego escreveu. **Nada disso hardcoded.** O que é idêntico ao quadro é a estrutura: quais blocos existem, em que ordem, com que aparência, em que estado e para onde levam. Os textos fixos de interface estão marcados no HANDOFF como **fixo**.
