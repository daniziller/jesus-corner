const pptxgen = require('pptxgenjs')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const sharp = require('sharp')
const Fi = require('react-icons/fi')
const fs = require('fs')

// ---------- paleta (derivada da marca do app: --or #9D4300 / --olt #F5E9DE) ----------
const BRAND = '9D4300'   // marrom-queimado da logo (dominante)
const DEEP  = '2A1712'   // marrom quase preto, fundo escuro
const INK   = '17100D'   // fundo escuro principal
const CREAM = 'F5E9DE'   // tom claro do design system
const CARD  = 'FAF3EC'   // cartao claro
const GOLD  = 'C98A3C'   // acento (numeros, destaques)
const MUT   = '7A6A60'   // texto secundario claro
const MUTD  = 'C0AC9E'   // texto secundario sobre escuro
const LINE  = 'E4D6C8'

const HEAD = 'Cambria'
const BODY = 'Calibri'

const W = 13.3, H = 7.5
const M = 0.7             // margem lateral
const CW = W - M * 2      // largura util = 11.9

const iconCache = {}
async function icon (name, color) {
  const key = name + color
  if (iconCache[key]) return iconCache[key]
  const Comp = Fi[name]
  if (!Comp) throw new Error('icone inexistente: ' + name)
  let svg = renderToStaticMarkup(React.createElement(Comp, { size: 256 }))
  svg = svg.replace(/currentColor/g, '#' + color)
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer()
  iconCache[key] = 'image/png;base64,' + buf.toString('base64')
  return iconCache[key]
}

const shadow = () => ({ type: 'outer', color: '8A6E5C', blur: 10, offset: 2, angle: 90, opacity: 0.16 })

function titleLight (s, text, sub) {
  s.addText(text, { x: M, y: 0.42, w: CW, h: 0.62, fontFace: HEAD, fontSize: 34, bold: true, color: INK, margin: 0 })
  if (sub) s.addText(sub, { x: M, y: 1.06, w: CW, h: 0.36, fontFace: BODY, fontSize: 14.5, color: MUT, margin: 0 })
}
function titleDark (s, text, sub) {
  s.addText(text, { x: M, y: 0.42, w: CW, h: 0.62, fontFace: HEAD, fontSize: 34, bold: true, color: CREAM, margin: 0 })
  if (sub) s.addText(sub, { x: M, y: 1.06, w: CW, h: 0.36, fontFace: BODY, fontSize: 14.5, color: MUTD, margin: 0 })
}
function source (s, text) {
  s.addText(text, { x: M, y: H - 0.62, w: CW, h: 0.3, fontFace: BODY, fontSize: 9.5, color: MUT, italic: true, margin: 0 })
}
// cartao claro
function card (s, o) {
  s.addShape('roundRect', { x: o.x, y: o.y, w: o.w, h: o.h, fill: { color: o.fill || CARD }, line: { color: o.lineColor || LINE, width: 0.75 }, rectRadius: 0.09, shadow: shadow() })
}
async function iconCircle (s, x, y, name, opts = {}) {
  const d = opts.d || 0.46
  s.addShape('ellipse', { x, y, w: d, h: d, fill: { color: opts.bg || BRAND }, line: { color: opts.bg || BRAND, width: 0 } })
  const p = d * 0.26
  s.addImage({ data: await icon(name, opts.fg || CREAM), x: x + p, y: y + p, w: d - p * 2, h: d - p * 2 })
}
function numCircle (s, x, y, n, opts = {}) {
  const d = opts.d || 0.5
  s.addShape('ellipse', { x, y, w: d, h: d, fill: { color: opts.bg || BRAND }, line: { color: opts.bg || BRAND, width: 0 } })
  s.addText(String(n), { x, y, w: d, h: d, align: 'center', valign: 'middle', fontFace: HEAD, fontSize: 17, bold: true, color: opts.fg || CREAM, margin: 0 })
}

async function build () {
  const p = new pptxgen()
  p.layout = 'LAYOUT_WIDE'
  p.author = "Jesus' Corner"
  p.title = "Jesus' Corner — proposta de participacao societaria"

  // PowerPoint ancora texto no topo por padrao, mas so quando o atributo esta
  // escrito; sem ele alguns renderizadores centralizam verticalmente e abrem
  // um buraco entre o titulo do cartao e o corpo. Default explicito aqui.
  const addSlideRaw = p.addSlide.bind(p)
  p.addSlide = function (...args) {
    const s = addSlideRaw(...args)
    const addTextRaw = s.addText.bind(s)
    s.addText = (txt, opt = {}) => addTextRaw(txt, 'valign' in opt ? opt : { ...opt, valign: 'top' })
    return s
  }

  // ================= 1 · CAPA =================
  {
    const s = p.addSlide(); s.background = { color: INK }
    s.addImage({ path: 'cross-alpha.png', x: 9.5, y: 1.15, w: 4.4, h: 4.4, transparency: 88 })
    s.addImage({ path: '../../brand/icon-512.png', x: M, y: 2.05, w: 1.35, h: 1.35 })
    s.addText("Jesus' Corner", { x: 2.35, y: 2.05, w: 7.6, h: 0.82, fontFace: HEAD, fontSize: 48, bold: true, color: CREAM, margin: 0 })
    s.addText('O método que faz a pessoa terminar a Bíblia — e voltar todo dia.', { x: 2.35, y: 2.92, w: 7.6, h: 0.5, fontFace: BODY, fontSize: 17, color: MUTD, margin: 0 })
    s.addShape('roundRect', { x: M, y: 4.55, w: 6.9, h: 0.92, fill: { color: DEEP }, line: { color: GOLD, width: 1 }, rectRadius: 0.1 })
    s.addText('Proposta de participação societária · 30% do app', { x: M + 0.35, y: 4.55, w: 6.2, h: 0.92, valign: 'middle', fontFace: HEAD, fontSize: 19, bold: true, color: GOLD, margin: 0 })
    s.addText('Agosto de 2026 · Documento confidencial', { x: M, y: 6.35, w: 6.5, h: 0.3, fontFace: BODY, fontSize: 11, color: MUT, margin: 0 })
    s.addNotes('Abertura em 20 segundos: o app existe, está pronto, roda em três plataformas e cobra em três lojas. A conversa de hoje é sobre acelerar, não sobre construir.')
  }

  // ================= 2 · PROBLEMA =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'O problema')
    s.addText('147,6', { x: M, y: 1.5, w: 5.0, h: 1.15, fontFace: HEAD, fontSize: 76, bold: true, color: BRAND, margin: 0 })
    s.addText('milhões de brasileiros', { x: M, y: 2.62, w: 5.0, h: 0.4, fontFace: HEAD, fontSize: 21, bold: true, color: INK, margin: 0 })
    s.addText('se declaram cristãos — 56,7% católicos e 26,9% evangélicos da população de 10 anos ou mais. É o maior público cristão do mundo fora do inglês, e ele consome aplicativo em português.', { x: M, y: 3.12, w: 4.9, h: 1.5, fontFace: BODY, fontSize: 14, color: MUT, margin: 0 })
    const probs = [
      ['Target', 'Ler a Bíblia inteira é a meta que quase ninguém cumpre', 'A intenção reaparece todo janeiro. O plano morre em Levítico e o abandono vira culpa.'],
      ['Compass', 'O obstáculo não é vontade — é método', 'Quanto ler hoje? Onde parar? Quanto falta? Sem essas respostas, a leitura vira sorteio de versículo.'],
      ['Smartphone', 'Os apps líderes resolvem o acesso, não o percurso', 'Entregam o texto e o versículo do dia. Nenhum entrega um plano de fôlego com constância medida.'],
    ]
    probs.forEach(([ic, h, b], i) => {
      const y = 1.5 + i * 1.62
      card(s, { x: 6.2, y, w: 6.4, h: 1.42 })
      s.addText(h, { x: 7.15, y: y + 0.16, w: 5.3, h: 0.46, fontFace: HEAD, fontSize: 15, bold: true, color: INK, margin: 0 })
      s.addText(b, { x: 7.15, y: y + 0.62, w: 5.3, h: 0.68, fontFace: BODY, fontSize: 12.5, color: MUT, margin: 0 })
    })
    card(s, { x: M, y: 4.72, w: 5.0, h: 1.55, fill: CREAM, lineColor: 'E0CDBB' })
    s.addText('Ninguém precisa ser convencido a querer ler a Bíblia. Precisa de um caminho que caiba no dia — e de alguém contando os dias junto.', { x: M + 0.35, y: 4.72, w: 4.3, h: 1.55, valign: 'middle', fontFace: HEAD, fontSize: 14, bold: true, color: '5C2700', margin: 0 })
    await iconCircle(s, 6.5, 1.5 + 0.28, 'FiTarget')
    await iconCircle(s, 6.5, 3.12 + 0.28, 'FiCompass')
    await iconCircle(s, 6.5, 4.74 + 0.28, 'FiSmartphone')
    source(s, 'Fonte: IBGE, Censo 2022 (divulgação de religião, junho de 2025).')
    s.addNotes('O tamanho do público não é a novidade — a novidade é que ninguém atacou o percurso completo em português. Os líderes globais são de acesso, não de método.')
  }

  // ================= 3 · SOLUCAO =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'A solução: um método, não um catálogo', 'O app decide por você o que ler hoje — e prova que você voltou.')
    const steps = [
      ['8 blocos temáticos', 'A Bíblia inteira dividida em 8 percursos com começo, meio e fim — do Pentateuco às Cartas — mais o plano cronológico.'],
      ['3 ritmos', 'Leve, Padrão ou Intensivo. O ritmo não muda quantos dias você lê: muda o tamanho da sessão de cada dia.'],
      ['1 sessão = 1 dia', 'A sessão nunca corta um capítulo no meio. Abriu o app, já sabe exatamente o que ler e quanto falta para o fim.'],
      ['Rotina diária', 'Oração, Leitura e Reflexão num fluxo só, com anel de constância, sequência, XP e metas pessoais.'],
    ]
    steps.forEach(([h, b], i) => {
      const x = M + i * 3.03
      card(s, { x, w: 2.78, y: 1.72, h: 3.05 })
      numCircle(s, x + 0.3, 1.98, i + 1)
      s.addText(h, { x: x + 0.3, y: 2.6, w: 2.2, h: 0.44, fontFace: HEAD, fontSize: 16.5, bold: true, color: BRAND, margin: 0 })
      s.addText(b, { x: x + 0.3, y: 3.12, w: 2.2, h: 1.75, fontFace: BODY, fontSize: 12.5, color: MUT, margin: 0 })
    })
    card(s, { x: M, y: 5.45, w: CW, h: 1.1, fill: CREAM, lineColor: 'E0CDBB' })
    s.addText('O progresso é gravado por capítulo lido, não por sessão. Trocar de ritmo no meio do caminho não apaga um dia sequer — detalhe pequeno que é exatamente onde os planos concorrentes quebram a confiança do usuário.', { x: M + 0.4, y: 5.45, w: CW - 0.8, h: 1.1, valign: 'middle', fontFace: BODY, fontSize: 13, color: '4A3A30', margin: 0 })
    s.addNotes('Esse é o coração do produto e o que dá defensabilidade: o algoritmo de divisão por contagem de palavras da versão bíblica, com regras que respeitam o capítulo inteiro.')
  }

  // ================= 4 · PRODUTO =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'Isto não é uma ideia. É um app pronto.', 'Tudo abaixo já está escrito, integrado e rodando — não é roadmap.')
    const feats = [
      ['FiBookOpen', 'Bíblia licenciada', 'NVT em português e NLT em inglês, via API.Bible, com o texto disponível dentro do app.'],
      ['FiCalendar', 'Meu Plano', 'Rotina passo a passo configurável, estudo guiado e cronograma até o fim da Bíblia.'],
      ['FiHeart', 'Oração', 'Cronômetro, método ACTS e pedidos de oração com registro de resposta.'],
      ['FiEdit3', 'Notas e marcações', 'Cinco cores de marcação, busca por palavra e busca por tema com IA.'],
      ['FiCpu', 'Estudos com IA', 'Estudo novo por tema gerado sob demanda e conversa sobre o trecho que está sendo lido.'],
      ['FiUsers', 'Grupos e amigos', 'Grupos de leitura, desafios, comentários, pedidos coletivos e convites com desconto.'],
    ]
    for (let i = 0; i < feats.length; i++) {
      const [ic, h, b] = feats[i]
      const x = M + (i % 3) * 4.05
      const y = 1.78 + Math.floor(i / 3) * 1.98
      card(s, { x, y, w: 3.8, h: 1.76 })
      await iconCircle(s, x + 0.28, y + 0.26, ic, { d: 0.42 })
      s.addText(h, { x: x + 0.82, y: y + 0.24, w: 2.75, h: 0.42, valign: 'middle', fontFace: HEAD, fontSize: 15, bold: true, color: INK, margin: 0 })
      s.addText(b, { x: x + 0.28, y: y + 0.78, w: 3.24, h: 0.85, fontFace: BODY, fontSize: 12, color: MUT, margin: 0 })
    }
    const tiles = [['166 arquivos · 33.456 linhas', 'de código em produção'], ['PWA + Android + iOS', 'um código, três lojas'], ['Português e inglês', 'interface e texto bíblico'], ['Painel administrativo', 'métricas, convites e suporte']]
    tiles.forEach(([a, b], i) => {
      const x = M + i * 3.03
      card(s, { x, y: 5.9, w: 2.78, h: 0.86, fill: CREAM, lineColor: 'E0CDBB' })
      s.addText(a, { x: x + 0.2, y: 5.99, w: 2.4, h: 0.32, fontFace: HEAD, fontSize: 13, bold: true, color: BRAND, margin: 0 })
      s.addText(b, { x: x + 0.2, y: 6.31, w: 2.4, h: 0.3, fontFace: BODY, fontSize: 10.5, color: MUT, margin: 0 })
    })
    s.addNotes('Se o investidor só olhar um slide, que seja este: o risco de execução do produto já foi pago. O que resta é risco de distribuição, que é o que o dinheiro resolve.')
  }

  // ================= 5 · INFRAESTRUTURA (escuro) =================
  {
    const s = p.addSlide(); s.background = { color: INK }
    titleDark(s, 'O que já está construído — e é o que custa caro', 'A parte invisível do app é a que leva meses e derruba a maioria dos projetos.')
    const cols = [
      ['FiCreditCard', 'Pagamentos', 'Stripe no site, Google Play Billing e Apple StoreKit nos apps. Webhooks, verificação de compra, renovação e portal do assinante — os três trilhos integrados.'],
      ['FiDatabase', 'Conta e dados', 'Supabase com Postgres e autenticação, sincronização entre dispositivos, recuperação por código, exportação e exclusão de conta pelo próprio usuário.'],
      ['FiSmartphone', 'Distribuição', 'PWA instalável, projeto TWA para o Android e shell Capacitor para o iOS. Um código-fonte, três canais de distribuição.'],
      ['FiShield', 'Conformidade', 'Levantamento de LGPD feito sobre o código: convicção religiosa é dado sensível, e o app já trata consentimento específico e registro de aceite.'],
    ]
    for (let i = 0; i < cols.length; i++) {
      const [ic, h, b] = cols[i]
      const x = M + i * 3.03
      s.addShape('roundRect', { x, y: 1.85, w: 2.78, h: 3.0, fill: { color: DEEP }, line: { color: '4A2E24', width: 0.75 }, rectRadius: 0.09 })
      await iconCircle(s, x + 0.3, 2.12, ic, { bg: GOLD, fg: INK })
      s.addText(h, { x: x + 0.3, y: 2.72, w: 2.2, h: 0.4, fontFace: HEAD, fontSize: 16.5, bold: true, color: CREAM, margin: 0 })
      s.addText(b, { x: x + 0.3, y: 3.16, w: 2.2, h: 1.85, fontFace: BODY, fontSize: 12, color: MUTD, margin: 0 })
    }
    s.addShape('roundRect', { x: M, y: 5.25, w: CW, h: 0.95, fill: { color: '241511' }, line: { color: GOLD, width: 1 }, rectRadius: 0.1 })
    s.addText('Refazer isto do zero é de 9 a 12 meses de um time sênior — e é trabalho que já está pago.', { x: M + 0.4, y: 5.25, w: CW - 0.8, h: 0.95, valign: 'middle', fontFace: HEAD, fontSize: 15.5, bold: true, color: GOLD, margin: 0 })
    s.addNotes('Aqui é onde se justifica o piso do valuation: custo de reposição. Licença de texto bíblico e aprovação nas lojas são barreiras de tempo, não de dinheiro.')
  }

  // ================= 6 · STATUS =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'Onde estamos hoje')
    s.addText('Concluído', { x: M, y: 1.6, w: 6.0, h: 0.36, fontFace: HEAD, fontSize: 18, bold: true, color: BRAND, margin: 0 })
    const done = [
      'Produto completo, em produção na web',
      'Cobrança integrada nas três plataformas',
      'Texto bíblico licenciado em dois idiomas',
      'Interface e conteúdo em português e inglês',
      'Painel administrativo com métricas e suporte',
      'Base de conformidade com a LGPD',
    ]
    for (let i = 0; i < done.length; i++) {
      const y = 1.98 + i * 0.63
      await iconCircle(s, M, y, 'FiCheck', { d: 0.38 })
      s.addText(done[i], { x: M + 0.58, y, w: 5.3, h: 0.38, valign: 'middle', fontFace: BODY, fontSize: 13.5, color: '33261F', margin: 0 })
    }
    card(s, { x: 6.9, y: 1.6, w: 5.7, h: 3.9, fill: 'FDF6EC', lineColor: GOLD })
    s.addText('A preencher antes de enviar', { x: 7.25, y: 1.85, w: 5.0, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: GOLD, margin: 0 })
    const gaps = ['Usuários cadastrados', 'Assinantes ativos', 'Retenção em 30 dias', 'Lista de espera / beta']
    gaps.forEach((g, i) => {
      const y = 2.45 + i * 0.62
      s.addText(g, { x: 7.25, y, w: 3.1, h: 0.4, valign: 'middle', fontFace: BODY, fontSize: 13.5, color: '33261F', margin: 0 })
      s.addShape('roundRect', { x: 10.5, y: y + 0.03, w: 1.75, h: 0.36, fill: { color: 'FFFFFF' }, line: { color: GOLD, width: 1 }, rectRadius: 0.05 })
      s.addText('a preencher', { x: 10.5, y: y + 0.03, w: 1.75, h: 0.36, align: 'center', valign: 'middle', fontFace: BODY, fontSize: 10.5, italic: true, color: GOLD, margin: 0 })
    })
    s.addText('Estágio: pré-lançamento nas lojas. O deck trata o app como produto pronto sem tração publicada — números entram aqui quando existirem.', { x: 7.25, y: 4.86, w: 5.0, h: 0.52, fontFace: BODY, fontSize: 11, italic: true, color: MUT, margin: 0 })
    card(s, { x: M, y: 5.75, w: CW, h: 1.0, fill: CREAM, lineColor: 'E0CDBB' })
    s.addText('Honestidade como argumento: o app ainda não tem histórico de retenção. Toda projeção deste deck é premissa declarada, não resultado medido.', { x: M + 0.4, y: 5.75, w: CW - 0.8, h: 1.0, valign: 'middle', fontFace: BODY, fontSize: 13, color: '4A3A30', margin: 0 })
    s.addNotes('IMPORTANTE: preencha as quatro lacunas em amarelo antes de enviar o deck. Se ainda não há nenhum usuário, apague o cartão inteiro e diga na conversa que o lançamento é o primeiro marco do aporte. Não invente número: investidor cobra fonte.')
  }

  // ================= 7 · MERCADO =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'O mercado')
    const stats = [['US$ 2,8 bi', 'mercado global de apps de bem-estar espiritual em 2026'], ['14,6% a.a.', 'crescimento projetado até 2033, chegando a US$ 7,3 bi'], ['147,6 mi', 'cristãos no Brasil — mercado que os líderes globais não atendem em português']]
    stats.forEach(([n, l], i) => {
      const x = M + i * 4.05
      card(s, { x, y: 1.55, w: 3.8, h: 1.6 })
      s.addText(n, { x: x + 0.28, y: 1.68, w: 3.3, h: 0.62, fontFace: HEAD, fontSize: 32, bold: true, color: BRAND, margin: 0 })
      s.addText(l, { x: x + 0.28, y: 2.3, w: 3.3, h: 0.75, fontFace: BODY, fontSize: 12, color: MUT, margin: 0 })
    })
    s.addChart(p.ChartType.bar, [{ name: 'Mercado global (US$ bi)', labels: ['2024', '2026', '2033'], values: [2.2, 2.8, 7.3] }], {
      x: M, y: 3.4, w: 6.6, h: 3.0, barDir: 'col', barGapWidthPct: 90,
      chartColors: [BRAND], showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: '33261F', dataLabelFontSize: 12, dataLabelFontFace: BODY, dataLabelFormatCode: '0.0',
      showTitle: true, title: 'Apps de bem-estar espiritual — receita global (US$ bi)', titleFontSize: 13, titleFontFace: HEAD, titleColor: '33261F',
      catAxisLabelColor: MUT, catAxisLabelFontFace: BODY, catAxisLabelFontSize: 12, valAxisLabelColor: MUT, valAxisLabelFontSize: 10, valAxisHidden: true,
      valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false, plotArea: { fill: { color: 'FFFFFF' } },
    })
    card(s, { x: 7.65, y: 3.4, w: 4.95, h: 3.0, fill: CREAM, lineColor: 'E0CDBB' })
    s.addText('O que isso significa aqui', { x: 8.0, y: 3.62, w: 4.3, h: 0.36, fontFace: HEAD, fontSize: 16, bold: true, color: BRAND, margin: 0 })
    s.addText([
      { text: 'Não é preciso liderar o mercado. Com 0,003% dos cristãos brasileiros assinando, o app faz R$ 800 mil de receita anual.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'O ticket em real (R$ 16,90/mês) é metade do preço dos apps americanos convertidos — e ainda assim é margem alta de software.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'O mesmo código já fala inglês: expandir para fora é decisão de marketing, não de engenharia.', options: { bullet: true } },
    ], { x: 8.0, y: 4.08, w: 4.3, h: 2.1, fontFace: BODY, fontSize: 12.5, color: '4A3A30', margin: 0 })
    source(s, 'Fontes: Grand View Research / Business Research Company (apps de bem-estar espiritual, 2024–2033); IBGE, Censo 2022.')
    s.addNotes('Cuidado com o TAM inflado: o número que convence é o de baixo, o quanto é pequeno o pedaço necessário para o negócio funcionar.')
  }

  // ================= 8 · CONCORRENCIA =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'Quem já está no campo', 'Os grandes resolvem acesso e devocional. O percurso completo está vago.')
    const hdr = ['', 'YouVersion', 'Hallow', 'Glorify', "Jesus' Corner"]
    const rows = [
      ['Foco do produto', 'Versículo do dia e planos devocionais', 'Oração e meditação católica', 'Devocional em áudio', 'Ler a Bíblia inteira, com rotina diária'],
      ['Mercado principal', 'Global, em inglês', 'Estados Unidos', 'EUA e Reino Unido', 'Brasil, em português (e inglês pronto)'],
      ['Plano até o fim da Bíblia', 'Genérico, sem ritmo', 'Não', 'Não', 'Sim — 8 blocos e 3 ritmos'],
      ['Constância medida', 'Sequência simples', 'Sequência simples', 'Sequência simples', 'Anel diário, metas, XP e desafios em grupo'],
      ['IA sobre o trecho lido', 'Não', 'Parcial', 'Parcial', 'Sim — estudo, busca e conversa'],
      ['Preço de lista', 'Grátis (doações)', '≈ US$ 70/ano', '≈ US$ 60/ano', 'R$ 169,90/ano'],
    ]
    const tblRows = [hdr.map((h, i) => ({ text: h, options: { bold: true, color: i === 4 ? CREAM : CREAM, fill: { color: i === 4 ? BRAND : '4A3A30' }, fontSize: 12, fontFace: HEAD, align: i === 0 ? 'left' : 'center', valign: 'middle' } }))]
    rows.forEach((r, ri) => {
      tblRows.push(r.map((c, ci) => ({
        text: c,
        options: {
          fontSize: 11, fontFace: ci === 0 ? HEAD : BODY, bold: ci === 0, color: ci === 4 ? '5C2700' : '3D2F27',
          fill: { color: ci === 4 ? 'F6E7D8' : (ri % 2 ? 'FBF7F3' : 'FFFFFF') },
          align: ci === 0 ? 'left' : 'center', valign: 'middle',
        },
      })))
    })
    s.addTable(tblRows, { x: M, y: 1.85, w: CW, colW: [2.5, 2.15, 2.15, 2.15, 2.95], rowH: 0.62, border: { type: 'solid', color: LINE, pt: 0.75 }, margin: 0.08 })
    source(s, 'Preços de lista aproximados, consultados em agosto de 2026; podem variar por região e promoção.')
    s.addNotes('O objetivo não é dizer que os outros são ruins — é mostrar que eles vendem outra coisa. YouVersion é grátis e não vai cobrar; isso é oportunidade, não ameaça, porque quem quer método não é atendido lá.')
  }

  // ================= 9 · POR QUE AGORA (escuro) =================
  {
    const s = p.addSlide(); s.background = { color: INK }
    titleDark(s, 'Por que agora')
    const whys = [
      ['O mercado já foi provado — por outro', 'A Hallow levantou US$ 157 milhões e foi o primeiro app religioso a entrar no top 10 da App Store americana. A tese não precisa mais ser defendida: precisa ser ocupada em português.'],
      ['A IA ficou barata na hora certa', 'O que era inviável há dois anos hoje custa centavos por conversa. Estudo por tema, busca semântica nas notas e conversa sobre o trecho lido já rodam no app — não são promessa de roadmap.'],
      ['O Brasil está descoberto', 'O maior público cristão fora do inglês paga assinatura em real, instala PWA e compra na Play Store. Os líderes globais não falam com ele, e nenhum concorrente local tem produto equivalente.'],
    ]
    whys.forEach(([h, b], i) => {
      const y = 1.75 + i * 1.72
      s.addShape('roundRect', { x: M, y, w: CW, h: 1.5, fill: { color: DEEP }, line: { color: '4A2E24', width: 0.75 }, rectRadius: 0.09 })
      numCircle(s, M + 0.35, y + 0.5, i + 1, { bg: GOLD, fg: INK })
      s.addText(h, { x: M + 1.1, y: y + 0.18, w: 10.4, h: 0.42, fontFace: HEAD, fontSize: 18, bold: true, color: CREAM, margin: 0 })
      s.addText(b, { x: M + 1.1, y: y + 0.62, w: 10.4, h: 0.75, fontFace: BODY, fontSize: 13, color: MUTD, margin: 0 })
    })
    s.addText('Fontes: anúncios públicos de captação da Hallow (Série C de US$ 50 mi, 2023) e perfis públicos de investimento consultados em agosto de 2026.', { x: M, y: H - 0.62, w: CW, h: 0.3, fontFace: BODY, fontSize: 9.5, italic: true, color: MUT, margin: 0 })
    s.addNotes('Hallow: US$ 157 mi captados em 6 rodadas, Série C de US$ 50 mi liderada pela Goodwater. Use como prova de mercado, nunca como comparável de valuation.')
  }

  // ================= 10 · RECEITA =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'Como o app ganha dinheiro', 'Assinatura pura, já cobrando nos três canais — nada disso precisa ser construído.')
    // cartoes de preco
    card(s, { x: M, y: 1.8, w: 3.55, h: 2.35 })
    s.addText('Mensal', { x: M + 0.3, y: 2.0, w: 2.9, h: 0.34, fontFace: HEAD, fontSize: 15, bold: true, color: MUT, margin: 0 })
    s.addText('R$ 16,90', { x: M + 0.3, y: 2.38, w: 2.9, h: 0.7, fontFace: HEAD, fontSize: 38, bold: true, color: BRAND, margin: 0 })
    s.addText('US$ 6,90 fora do Brasil', { x: M + 0.3, y: 3.12, w: 2.9, h: 0.34, fontFace: BODY, fontSize: 12.5, color: MUT, margin: 0 })
    s.addText('Acesso completo, sem anúncios.', { x: M + 0.3, y: 3.48, w: 2.9, h: 0.34, fontFace: BODY, fontSize: 12, color: MUT, margin: 0 })

    card(s, { x: 4.5, y: 1.8, w: 3.55, h: 2.35, fill: CREAM, lineColor: BRAND })
    s.addText('Anual · mais rentável', { x: 4.8, y: 2.0, w: 2.9, h: 0.34, fontFace: HEAD, fontSize: 15, bold: true, color: BRAND, margin: 0 })
    s.addText('R$ 169,90', { x: 4.8, y: 2.38, w: 2.9, h: 0.7, fontFace: HEAD, fontSize: 38, bold: true, color: BRAND, margin: 0 })
    s.addText('US$ 69,90 fora do Brasil', { x: 4.8, y: 3.12, w: 2.9, h: 0.34, fontFace: BODY, fontSize: 12.5, color: MUT, margin: 0 })
    s.addText('Doze meses pelo preço de dez — e caixa adiantado.', { x: 4.8, y: 3.48, w: 2.9, h: 0.5, fontFace: BODY, fontSize: 12, color: '4A3A30', margin: 0 })

    card(s, { x: 8.3, y: 1.8, w: 4.3, h: 2.35 })
    s.addText('Próximo degrau', { x: 8.6, y: 2.0, w: 3.7, h: 0.34, fontFace: HEAD, fontSize: 15, bold: true, color: MUT, margin: 0 })
    s.addText('Premium + IA · R$ 29,90', { x: 8.6, y: 2.38, w: 3.7, h: 0.62, fontFace: HEAD, fontSize: 22, bold: true, color: GOLD, margin: 0 })
    s.addText('Tier superior com o agente de IA sobre o texto lido, já especificado em documento técnico e com o custo por conversa mapeado.', { x: 8.6, y: 3.04, w: 3.7, h: 0.95, fontFace: BODY, fontSize: 12, color: MUT, margin: 0 })

    const rails = [['FiCreditCard', 'Stripe', 'assinatura na web, com portal de gestão e webhooks'], ['FiSmartphone', 'Google Play', 'billing nativo, verificação de compra e notificações em tempo real'], ['FiShoppingBag', 'App Store', 'StoreKit com validação de recibo e notificações do servidor Apple']]
    for (let i = 0; i < rails.length; i++) {
      const [ic, h, b] = rails[i]
      const x = M + i * 4.05
      card(s, { x, y: 4.45, w: 3.8, h: 1.5 })
      await iconCircle(s, x + 0.28, 4.63, ic, { d: 0.42 })
      s.addText(h, { x: x + 0.82, y: 4.63, w: 2.7, h: 0.42, valign: 'middle', fontFace: HEAD, fontSize: 15, bold: true, color: INK, margin: 0 })
      s.addText(b, { x: x + 0.28, y: 5.14, w: 3.24, h: 0.7, fontFace: BODY, fontSize: 11.5, color: MUT, margin: 0 })
    }
    s.addText('Cada trilho já integrado é um canal de venda que não precisa esperar desenvolvimento para faturar.', { x: M, y: 6.15, w: CW, h: 0.36, fontFace: BODY, fontSize: 12.5, italic: true, color: MUT, margin: 0 })
    s.addNotes('Ponto forte: a receita já pode ser cobrada hoje. A pergunta do investidor vira "quantos usuários você traz", não "quando dá para cobrar".')
  }

  // ================= 11 · PROJECAO =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'Três cenários, uma conta simples', 'Receita recorrente mensal, em R$ mil, ao fim do mês 12 e do mês 24.')
    s.addChart(p.ChartType.bar, [
      { name: 'Mês 12', labels: ['Conservador', 'Base', 'Otimista'], values: [20, 68, 203] },
      { name: 'Mês 24', labels: ['Conservador', 'Base', 'Otimista'], values: [54, 203, 608] },
    ], {
      x: M, y: 1.75, w: 7.3, h: 3.7, barDir: 'col', barGapWidthPct: 60,
      chartColors: [BRAND, GOLD], showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: '33261F', dataLabelFontSize: 10.5, dataLabelFontFace: BODY,
      catAxisLabelColor: MUT, catAxisLabelFontFace: BODY, catAxisLabelFontSize: 12,
      valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
      showLegend: true, legendPos: 't', legendColor: MUT, legendFontFace: BODY, legendFontSize: 11,
      plotArea: { fill: { color: 'FFFFFF' } },
    })
    card(s, { x: 8.35, y: 1.75, w: 4.25, h: 3.7, fill: CREAM, lineColor: 'E0CDBB' })
    s.addText('Premissas declaradas', { x: 8.65, y: 1.95, w: 3.7, h: 0.36, fontFace: HEAD, fontSize: 16, bold: true, color: BRAND, margin: 0 })
    s.addText([
      { text: 'Receita líquida por assinante: R$ 13,50/mês, já descontada a taxa de loja e o desconto do plano anual.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'Cancelamento: 6% ao mês, típico de assinatura de hábito.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'Cenário Base: 5.000 assinantes no mês 12 e 15.000 no mês 24.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'Nenhum cenário considera o tier de IA nem venda para igrejas.', options: { bullet: true } },
    ], { x: 8.65, y: 2.42, w: 3.7, h: 2.85, fontFace: BODY, fontSize: 12, color: '4A3A30', margin: 0 })
    card(s, { x: M, y: 5.65, w: CW, h: 0.98, fill: 'FDF6EC', lineColor: GOLD })
    s.addText('O cenário Base pede 5.000 assinantes: 0,003% dos cristãos brasileiros. O gargalo deste negócio nunca foi o tamanho do mercado — é a distribuição.', { x: M + 0.4, y: 5.65, w: CW - 0.8, h: 0.98, valign: 'middle', fontFace: HEAD, fontSize: 14.5, bold: true, color: '5C2700', margin: 0 })
    s.addNotes('Deixe explícito que é modelagem, não previsão. Se perguntarem de onde vem o churn de 6%: é referência de mercado para apps de hábito, o app ainda não tem histórico próprio.')
  }

  // ================= 12 · UNIT ECONOMICS =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'A economia de um assinante', 'Por que a conta fecha mesmo com aquisição paga.')
    const tiles = [['R$ 13,50', 'receita líquida por assinante/mês', 'depois da taxa de loja e do mix anual'], ['≈ 17 meses', 'tempo médio de permanência', 'a 6% de cancelamento mensal'], ['≈ R$ 225', 'valor de um assinante (LTV)', 'receita acumulada por pessoa'], ['R$ 50 a 70', 'custo-alvo de aquisição', 'retorno em 4 a 5 meses']]
    tiles.forEach(([n, l, sub], i) => {
      const x = M + i * 3.03
      card(s, { x, y: 1.72, w: 2.78, h: 2.0 })
      s.addText(n, { x: x + 0.26, y: 1.9, w: 2.3, h: 0.66, fontFace: HEAD, fontSize: 27, bold: true, color: BRAND, margin: 0 })
      s.addText(l, { x: x + 0.26, y: 2.56, w: 2.3, h: 0.62, fontFace: HEAD, fontSize: 13, bold: true, color: INK, margin: 0 })
      s.addText(sub, { x: x + 0.26, y: 3.14, w: 2.3, h: 0.46, fontFace: BODY, fontSize: 11, color: MUT, margin: 0 })
    })
    card(s, { x: M, y: 3.98, w: 5.85, h: 2.35, fill: CREAM, lineColor: 'E0CDBB' })
    s.addText('Relação LTV / CAC: 3 a 4,5 vezes', { x: M + 0.32, y: 4.2, w: 5.2, h: 0.4, fontFace: HEAD, fontSize: 17, bold: true, color: BRAND, margin: 0 })
    s.addText('Acima de 3 é a faixa em que faz sentido acelerar aquisição paga. Abaixo disso, o crescimento é feito por indicação e comunidade — canais que o app já tem construídos.', { x: M + 0.32, y: 4.68, w: 5.2, h: 1.4, fontFace: BODY, fontSize: 12.5, color: '4A3A30', margin: 0 })
    card(s, { x: 6.75, y: 3.98, w: 5.85, h: 2.35 })
    s.addText('As três alavancas', { x: 7.07, y: 4.2, w: 5.2, h: 0.36, fontFace: HEAD, fontSize: 17, bold: true, color: INK, margin: 0 })
    s.addText([
      { text: 'Empurrar o plano anual reduz cancelamento e adianta caixa.', options: { bullet: true, breakLine: true, paraSpaceAfter: 7 } },
      { text: 'O tier Premium + IA (R$ 29,90) eleva a receita por assinante sem novo custo de aquisição.', options: { bullet: true, breakLine: true, paraSpaceAfter: 7 } },
      { text: 'Grupos e convites derrubam o custo de aquisição: quem entra por indicação de um líder tende a ficar.', options: { bullet: true } },
    ], { x: 7.07, y: 4.65, w: 5.2, h: 1.5, fontFace: BODY, fontSize: 12.5, color: '4A3A30', margin: 0 })
    s.addText('Premissas de modelagem — o app ainda não possui histórico próprio de cancelamento.', { x: M, y: H - 0.62, w: CW, h: 0.3, fontFace: BODY, fontSize: 9.5, italic: true, color: MUT, margin: 0 })
    s.addNotes('Se o investidor pressionar em cima do churn de 6%, ofereça o teste: os primeiros 90 dias pós-lançamento medem isso, e o aporte pode ser liberado em tranches contra esse marco.')
  }

  // ================= 13 · GTM =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'Como crescer', 'Quatro canais — três deles já implementados dentro do app.')
    const lanes = [
      ['FiShare2', 'Convite e indicação', 'O app já gera códigos de convite com desconto e acesso liberado. Cada assinante satisfeito é um canal de aquisição com custo próximo de zero.'],
      ['FiUsers', 'Grupos e desafios', 'Leitura em grupo, desafios e comentários já existem. Uma célula ou grupo de igreja entra inteira — a unidade de aquisição não é a pessoa, é o grupo.'],
      ['FiHome', 'Líderes e igrejas', 'Pastores e líderes de estudo distribuem o plano para a congregação. Um único líder engajado vale centenas de instalações. Formato de licença coletiva no roadmap.'],
      ['FiTrendingUp', 'Busca nas lojas e criadores', 'ASO em português para "plano de leitura bíblica" e parceria com criadores cristãos brasileiros — mídia paga só depois que a retenção estiver medida.'],
    ]
    for (let i = 0; i < lanes.length; i++) {
      const [ic, h, b] = lanes[i]
      const x = M + (i % 2) * 6.05
      const y = 1.78 + Math.floor(i / 2) * 2.4
      card(s, { x, y, w: 5.85, h: 2.15 })
      await iconCircle(s, x + 0.32, y + 0.28, ic, { d: 0.48 })
      s.addText(h, { x: x + 0.95, y: y + 0.26, w: 4.6, h: 0.5, valign: 'middle', fontFace: HEAD, fontSize: 17, bold: true, color: INK, margin: 0 })
      s.addText(b, { x: x + 0.32, y: y + 0.9, w: 5.2, h: 1.1, fontFace: BODY, fontSize: 12.5, color: MUT, margin: 0 })
    }
    s.addText('A vantagem escondida: um app de leitura em grupo cresce por convite de líder, não por leilão de anúncio.', { x: M, y: 6.55, w: CW, h: 0.36, fontFace: BODY, fontSize: 12.5, italic: true, color: MUT, margin: 0 })
    s.addNotes('Enfatize que os mecanismos de convite e grupo já estão no código — não é plano, é funcionalidade esperando usuário.')
  }

  // ================= 14 · ROADMAP =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'Os próximos 12 meses', 'O que o aporte compra, trimestre a trimestre.')
    const qs = [
      ['T1', 'Lançar e medir', ['Publicação na Play Store e na App Store', 'Agente de IA liberado por lista de convidados', 'Primeira medição real de retenção em 30 dias']],
      ['T2', 'Elevar a receita', ['Tier Premium + IA a R$ 29,90', 'Otimização de conversão do plano anual', 'Início do ASO e das parcerias com criadores']],
      ['T3', 'Abrir o topo do funil', ['Nível grátis com limites por funcionalidade', 'Espanhol como terceiro idioma', 'Programa formal de indicação']],
      ['T4', 'Vender para grupos', ['Licença coletiva para igrejas e células', 'Painel do líder com progresso do grupo', 'Primeiro teste sério de mídia paga']],
    ]
    qs.forEach(([q, h, items], i) => {
      const x = M + i * 3.03
      card(s, { x, y: 1.8, w: 2.78, h: 3.4 })
      s.addShape('roundRect', { x: x + 0.28, y: 2.02, w: 0.72, h: 0.42, fill: { color: BRAND }, line: { color: BRAND, width: 0 }, rectRadius: 0.06 })
      s.addText(q, { x: x + 0.28, y: 2.02, w: 0.72, h: 0.42, align: 'center', valign: 'middle', fontFace: HEAD, fontSize: 14, bold: true, color: CREAM, margin: 0 })
      s.addText(h, { x: x + 0.28, y: 2.58, w: 2.24, h: 0.44, fontFace: HEAD, fontSize: 16, bold: true, color: INK, margin: 0 })
      s.addText(items.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < items.length - 1, paraSpaceAfter: 9 } })), { x: x + 0.28, y: 3.08, w: 2.24, h: 2.55, fontFace: BODY, fontSize: 11.5, color: MUT, margin: 0 })
    })
    s.addText('Marcos são também gatilhos de liberação: o aporte pode ser parcelado contra T1 e T2.', { x: M, y: 5.5, w: CW, h: 0.36, fontFace: BODY, fontSize: 12.5, italic: true, color: MUT, margin: 0 })
    s.addNotes('Ordem intencional: primeiro medir retenção, só depois gastar em mídia. Investidor experiente reconhece essa disciplina e ela reduz o risco percebido.')
  }

  // ================= 15 · A PROPOSTA (escuro) =================
  {
    const s = p.addSlide(); s.background = { color: INK }
    s.addImage({ path: 'cross-alpha.png', x: 10.9, y: 5.25, w: 2.7, h: 2.7, transparency: 90 })
    titleDark(s, 'A proposta')
    s.addText('30%', { x: M, y: 1.55, w: 3.2, h: 1.5, fontFace: HEAD, fontSize: 96, bold: true, color: GOLD, margin: 0 })
    s.addText('do capital do Jesus’ Corner', { x: M, y: 3.02, w: 5.5, h: 0.42, fontFace: HEAD, fontSize: 20, bold: true, color: CREAM, margin: 0 })
    s.addText('por R$ 450 mil a R$ 900 mil', { x: M, y: 3.55, w: 5.5, h: 0.55, fontFace: HEAD, fontSize: 28, bold: true, color: CREAM, margin: 0 })
    s.addText('Valuation pré-aporte implícito: R$ 1,5 milhão a R$ 3,0 milhões.', { x: M, y: 4.18, w: 5.5, h: 0.4, fontFace: BODY, fontSize: 13.5, color: MUTD, margin: 0 })
    s.addShape('roundRect', { x: 6.6, y: 1.55, w: 6.0, h: 3.4, fill: { color: DEEP }, line: { color: '4A2E24', width: 0.75 }, rectRadius: 0.09 })
    s.addText('Como se chega a essa faixa', { x: 6.95, y: 1.78, w: 5.3, h: 0.4, fontFace: HEAD, fontSize: 17, bold: true, color: GOLD, margin: 0 })
    s.addText([
      { text: 'Piso — custo de reposição: refazer o app que existe hoje custa de R$ 350 a 500 mil em time sênior por 9 a 12 meses, sem contar licença de texto bíblico, marca e integrações de loja.', options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
      { text: 'Teto — comparáveis de estágio: rodadas pré-receita no Brasil, com produto pronto e mercado grande, costumam ficar entre R$ 2 e 4 milhões de pré-money. O desconto aqui é a ausência de tração publicada.', options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
      { text: 'O que empurra para o topo da faixa: primeiros números de retenção, aprovação nas duas lojas e o tier de IA no ar.', options: { bullet: true } },
    ], { x: 6.95, y: 2.3, w: 5.3, h: 3.2, fontFace: BODY, fontSize: 12.5, color: MUTD, margin: 0 })
    s.addShape('roundRect', { x: M, y: 4.9, w: 5.6, h: 1.15, fill: { color: DEEP }, line: { color: '4A2E24', width: 0.75 }, rectRadius: 0.09 })
    s.addText('Formato aberto a negociação: parcela única, duas tranches contra marcos, ou mútuo conversível.', { x: M + 0.32, y: 4.9, w: 5.0, h: 1.15, valign: 'middle', fontFace: BODY, fontSize: 13, color: MUTD, margin: 0 })
    s.addText('Faixa de negociação estimada a partir do estágio e do custo de reposição — não é laudo de avaliação.', { x: M, y: H - 0.62, w: CW, h: 0.3, fontFace: BODY, fontSize: 10, italic: true, color: MUT, margin: 0 })
    s.addNotes('Ancore alto e justifique pelo piso: o investidor não está comprando uma ideia, está comprando 9 a 12 meses de trabalho já entregue. 30% é uma fatia grande para este estágio — só aceite no topo da faixa, ou parcele em tranches.')
  }

  // ================= 16 · USO DOS RECURSOS =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'Para onde vai o dinheiro', 'Doze meses de caixa, com a maior parte em aquisição de usuário.')
    s.addChart(p.ChartType.doughnut, [{ name: 'Uso dos recursos', labels: ['Marketing e aquisição', 'Produto e engenharia', 'Conteúdo e licenças', 'Infraestrutura e IA', 'Jurídico e contábil'], values: [40, 25, 15, 10, 10] }], {
      x: 0.5, y: 1.7, w: 5.6, h: 4.4, holeSize: 55,
      chartColors: [BRAND, 'C0632B', GOLD, 'A98A6B', '7A6A60'],
      showValue: true, showPercent: false, dataLabelPosition: 'ctr', dataLabelColor: 'FFFFFF', dataLabelFontSize: 12, dataLabelFontFace: BODY, dataLabelFormatCode: '0"%"',
      showLegend: true, legendPos: 'b', legendColor: '33261F', legendFontFace: BODY, legendFontSize: 11,
      plotArea: { fill: { color: 'FFFFFF' } },
    })
    const uses = [
      ['Marketing e aquisição', '40%', 'ASO, criadores cristãos, programa de indicação e o primeiro teste de mídia paga depois da retenção medida.'],
      ['Produto e engenharia', '25%', 'Tier de IA, nível grátis, painel do líder e manutenção das três plataformas.'],
      ['Conteúdo e licenças', '15%', 'Novas versões bíblicas, terceiro idioma e produção de estudos.'],
      ['Infraestrutura e IA', '10%', 'Supabase, hospedagem, notificações e custo por conversa do agente.'],
      ['Jurídico e contábil', '10%', 'Societário, LGPD, contratos de licença e contabilidade.'],
    ]
    uses.forEach(([h, pc, b], i) => {
      const y = 1.75 + i * 0.98
      s.addText(pc, { x: 6.4, y, w: 0.85, h: 0.36, fontFace: HEAD, fontSize: 18, bold: true, color: BRAND, margin: 0 })
      s.addText(h, { x: 7.3, y, w: 5.3, h: 0.34, fontFace: HEAD, fontSize: 14.5, bold: true, color: INK, margin: 0 })
      s.addText(b, { x: 7.3, y: y + 0.34, w: 5.3, h: 0.56, fontFace: BODY, fontSize: 11.5, color: MUT, margin: 0 })
    })
    s.addNotes('A proporção comunica a tese: o dinheiro não é para construir o produto, é para colocar gente dentro dele.')
  }

  // ================= 17 · ESTRUTURA =================
  {
    const s = p.addSlide(); s.background = { color: 'FFFFFF' }
    titleLight(s, 'Estrutura do negócio', 'O desenho sugerido para a operação — a ser fechado com advogado societário.')
    card(s, { x: M, y: 1.78, w: 5.85, h: 2.75, fill: CREAM, lineColor: BRAND })
    s.addText('O que o investidor recebe', { x: M + 0.32, y: 2.0, w: 5.2, h: 0.4, fontFace: HEAD, fontSize: 17, bold: true, color: BRAND, margin: 0 })
    s.addText([
      { text: '30% das quotas da sociedade que detém o app, a marca e o código.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'Relatório trimestral de métricas: assinantes, receita, cancelamento e caixa.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'Direito de acompanhar a venda (tag along) e preferência em nova rodada.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'Veto sobre decisões estruturais: venda do app, novo sócio, mudança de objeto.', options: { bullet: true } },
    ], { x: M + 0.32, y: 2.48, w: 5.2, h: 1.9, fontFace: BODY, fontSize: 12.5, color: '4A3A30', margin: 0 })

    card(s, { x: 6.75, y: 1.78, w: 5.85, h: 2.75 })
    s.addText('O que permanece com o fundador', { x: 7.07, y: 2.0, w: 5.2, h: 0.4, fontFace: HEAD, fontSize: 17, bold: true, color: INK, margin: 0 })
    s.addText([
      { text: '70% do capital e o controle da sociedade.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'Gestão do dia a dia e decisão final de produto e roadmap.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'Autoria e continuidade do método — o ativo central do app.', options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
      { text: 'Compromisso de dedicação, com vesting do fundador se o investidor pedir.', options: { bullet: true } },
    ], { x: 7.07, y: 2.48, w: 5.2, h: 1.9, fontFace: BODY, fontSize: 12.5, color: '4A3A30', margin: 0 })

    card(s, { x: M, y: 4.78, w: CW, h: 1.75, fill: 'FDF6EC', lineColor: GOLD })
    s.addText('Sugestão de formato', { x: M + 0.4, y: 4.96, w: CW - 0.8, h: 0.36, fontFace: HEAD, fontSize: 15.5, bold: true, color: GOLD, margin: 0 })
    s.addText('Aporte em duas parcelas, liberadas contra marcos — a primeira na assinatura, a segunda na publicação nas duas lojas com a retenção de 30 dias medida. Formalização por contrato de compra e venda de quotas somado a acordo de sócios, ou por mútuo conversível se as partes preferirem adiar a definição do valuation. Revisão por advogado antes de qualquer assinatura.', { x: M + 0.4, y: 5.34, w: CW - 0.8, h: 1.05, fontFace: BODY, fontSize: 12.5, color: '4A3A30', margin: 0 })
    s.addNotes('Ceder 30% neste estágio é bastante diluição: vale negociar tranches, ou 15% agora com opção de mais 15% na próxima etapa. O acordo de sócios importa mais que o percentual.')
  }

  // ================= 18 · FECHO =================
  {
    const s = p.addSlide(); s.background = { color: INK }
    s.addImage({ path: 'cross-alpha.png', x: 9.7, y: 1.3, w: 4.2, h: 4.2, transparency: 89 })
    s.addImage({ path: '../../brand/icon-512.png', x: M, y: 1.35, w: 1.1, h: 1.1 })
    s.addText('O produto está pronto.\nFalta combustível.', { x: M, y: 2.75, w: 8.4, h: 1.7, fontFace: HEAD, fontSize: 42, bold: true, color: CREAM, lineSpacingMultiple: 1.1, margin: 0 })
    s.addText('O método, o código, as licenças e a cobrança já existem — foram 9 a 12 meses de trabalho entregues antes desta conversa. O que 30% compram não é a construção do app: é a velocidade de colocá-lo na frente de 147 milhões de pessoas.', { x: M, y: 4.55, w: 7.6, h: 1.1, fontFace: BODY, fontSize: 14.5, color: MUTD, margin: 0 })
    s.addShape('roundRect', { x: M, y: 5.95, w: 7.6, h: 0.78, fill: { color: DEEP }, line: { color: GOLD, width: 1 }, rectRadius: 0.09 })
    s.addText('[seu nome] · [e-mail] · [telefone]', { x: M + 0.32, y: 5.95, w: 7.0, h: 0.78, valign: 'middle', fontFace: HEAD, fontSize: 15, bold: true, color: GOLD, margin: 0 })
    s.addNotes('Feche pedindo o próximo passo concreto: uma demonstração do app ao vivo, com o investidor abrindo o plano no próprio celular.')
  }

  await p.writeFile({ fileName: 'jesus-corner-pitch-30.pptx' })
  console.log('deck gerado')
}

build().catch(e => { console.error(e); process.exit(1) })
