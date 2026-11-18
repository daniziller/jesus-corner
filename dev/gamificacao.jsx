// dev/gamificacao.jsx — pré-visualização das telas da gamificação SÓ em
// desenvolvimento (handoff-gamificacao-43-46, PROMPT-CODE "deixe um seletor
// de debug (só em desenvolvimento)"). Entrada à parte do Vite
// (dev/gamificacao.html → http://localhost:5173/dev/gamificacao.html);
// `vite build` só empacota index.html, então nada daqui vai pra produção.
//
// Renderiza as telas REAIS (HomeScreen, SuaBibliaScreen) com uma sessão
// de exemplo montada aqui — o app de verdade exige conta (decisão de
// 2026-09-07), e assim dá pra pôr cada tela e cada estado do HANDOFF §8
// ao lado do PNG sem login.
//
// Uso: ?tela=hoje|suaBiblia|conquistas|familia|novaConquista|estante|selo|livroCompleto|meuPlano
//      Meu Plano (handoff-meu-plano-47): &plano=p1|p2|p1i|p3|p4|um|quatro · tela=seuPlano · tela=ajustar&abrir=reading (Mudar meus dias)
//      Hoje (handoff-hoje-50): os mesmos &plano= valem pro cartão do plano (p1 no meio · p2 nada feito ·
//      p1i interrompido · p3 tudo feito · p4 descanso · um · quatro · p5 dia de estudo) + semplano · erro · carregando
//      Ordem do plano (35i): tela=ordem — "Leitura da Bíblia" com a fila do plano de verdade. &ordem=canonical|chronological|custom|free
//      · &livros=João,Salmos,Rute (minha ordem) · &partida=Salmos:23 · &livre=João:3 · &abrir=leitura (a leitura do plano)
//      Reiniciar a leitura do zero: tela=suaBiblia — o botão no fim da tela; a senha de mentira é "certa123". &senha=nao · &rede=fora · &gravar=falha
//      Comunidade (redesenho 2026-11): tela=comunidade — a raiz. &grupos=0|1|3|6 · &amigos=0|2|5 · &novas=0|1|4 · &trecho=nao · &espera=0|3
//      · &carregando=sim · &foto=sim · &envio=falha · &responder=falha. Código que entra: BC-4271 (JA = já pediu; outro = inválido)
//      tela=grupo — a tela de um grupo. &leitura=nao · &pedido=nenhum|meu|orei · &recado=nenhum · &desafio=nao · &aviso=nao · &orar=falha · &sair=falha
//      tela=grupo&ver=desafio|oracao|conversa|pessoas — as telas de dentro do grupo, com dados na memória. &moderador=nao · &vazio=sim · &rede=fora · &convidar=sim
//      tela=amigos — a tela de Amigos. &amigos=0 · &pedidos=0 · &grupos=nao · &rede=fora
//      Bíblia (handoff-biblia-52): tela=biblia — a aba de verdade (JourneyScreen), com os capítulos marcáveis na memória.
//      &estado=b1 (a conta da captura: Gênesis 40/50, Salmos 6/150, Jonas completo) | exemplo | nova | inteira | carregando
//      &livro=Gênesis (B2, o livro direto) &lidos=0|N (quantos capítulos dele estão lidos)
//      &cap=23 (B3, o capítulo direto na leitura livre) &marcar=1 (B4, ou o parabéns) &parabens=nao
//      &leitura=plano (a leitura pela sessão do plano, sem mudança nesta fase)
//      &busca= (B5, a busca ao abrir) &busca=jo 3 16 (B7) &busca=pastor (B6) &recentes=nao
//      &testamento=at|nt (a escolha lembrada) · &livre=4|sem|nao (leitura livre em Salmos 23: com versículo, sem, nenhuma)
//      · &lapis=rascunho|finalizada|vazio (o lápis flutuante, 34e: só aparece com uma anotação em andamento)
//      tela=estudos — a tela Estudos (35h). &lupa=nao · &meus=exemplo (convites, publicados e guardados) · &rede=fora
//      · sessão de hoje: os mesmos &plano= (p2 tem sessão · p3 leitura feita · p4 descanso)
//      Passos do plano (handoff-passos-pedidos-53-54): tela=oracao — a oração ACTS (S1/S2), com os pedidos na memória.
//      &etapa=1|2|3|4 (Adoração, Confissão, Gratidão, Súplica) · &pedidos=3|0|7|erro|carregando (a lista da Súplica;
//      7 inclui amigo e anônimo) · &premium=nao (cartão de bloqueio) · &dia=estudo|um (quatro passos, ou só a oração)
//      · &feitos=prayer,reading (passos já feitos hoje) · &minutos=12 (duração da oração) · &metodo=livre (36c, sem mudança)
//      &plano=sim (com oracao/reflexao/biblia&leitura=plano) — a tela dentro do plano guiado, com o relógio do plano no topo.
//      tela=reflexao — a reflexão com perguntas (S4), com as perguntas na memória. &pergunta=1|2|3 (a pergunta aberta)
//      · &perguntas=ok|erro|carregando|limite (a geração) · &trecho=marcado|lido|nenhum (o cartão areia)
//      · &feitos=prayer,reading (com um passo faltando, "Terminar a reflexão") · &dia=estudo|um · &metodo=livre (37b, sem mudança)
//      · &aplicacao=ontem|nenhuma (com frase já fixada no Início, terminar pergunta se troca)
//      tela=dia — o dia concluído (S5), com os tempos de hoje semeados. &tempo=32|1|0 (minutos reais: 10 + 17 + 5,
//      um minuto só, ou nenhum registrado) · &frase=nao (sem frase escrita hoje) · &dia=estudo (oração, estudo e
//      reflexão: "Estudo · Ansiedade, dia 2" e "dia 2 de 7 / no estudo") · &dia=um (só a oração)
//      · "Compartilhar meu dia" abre o editor da imagem (37d)
//      tela=pedidos — a lista de pedidos (O1), com os pedidos na memória. &aba=ativos|respondidos|grupo|amigos
//      · &pedidos=3|0|7|erro|carregando (7 traz dois de amigos e a aba Amigos) · &respondidos=12|2|0
//      · &oracoes=47|0|49|1200 (o cartão "orações pelos outros") · &comentarios=2 (contagem na linha de um pedido)
//      · "Novo" abre "Fazer um pedido" (O2): &grupos=1|0|3 (blocos de "Quem vê"; com 3, a fileira rola) · &ia=nao
//      · tocar num pedido meu abre "Como Deus respondeu?" (O3)
//      Página de anotação (handoff-biblioteca-55 §7A): tela=anotar — N2 e N3, com as anotações na memória.
//      · a anotação guardada (N5): &nota=guardada · &guardada=curta|semtopicos|sempassagens|minima · &sintese=guardada|lenta|erro · &grupo=falha
//      &nota=exemplo|nova|pregacao|semtitulo|rascunho|antiga · &tipo=livre · &detalhes=tipo|title|tags|who (N3)
//      · &grupos=0|2|3 · &grupo=escolhido · &teclado=aberto · &rede=fora · &persistir=sim · &estado=carregando|erro
//      tela=nota — a nota em um versículo (N4). &nota=exemplo|nova|marcacao|comnota|escolher|sumiu · &grupos=0|2|3
//      · &grupo=escolhido · &teclado=aberto · &rede=fora · &persistir=sim · tela=biblioteca&nova=abrir&rascunho=domingo|semtitulo (N1)
//      Para hoje: &aplicacao=ontem|cumprida|hoje|nenhuma · &resumo=novo|lido|nenhum · &parahoje=todas (as cinco linhas,
//      com o desafio do grupo) · barra de abas: &msgs=0|1|9|99|100 · &pendente=1 (bolinha de pedidos/convites)
//      &livro=Jonas (G10/G8) &bloco=poeticos (G9 rolada até a prateleira)
//      &estado=exemplo|nova|inteira|carregando &modo=livros|capitulos
//      &familia=constancia|leitura|tempo|oracao|livros (G6)
//      &id=tempo:2|bloco:profetas-menores (G4) &novas=1 (pontos de "nova" em G5)
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import HomeScreen from '../src/screens/HomeScreen'
import CartaoBiblia from '../src/components/hoje/CartaoBiblia'
import QuadradosCaminhada from '../src/components/hoje/QuadradosCaminhada'
import { computeBibleProgress } from '../src/gamification/bibleProgressMath'
import CartaoPlano from '../src/components/hoje/CartaoPlano'
import { buildPlanCard, paraHojeRows } from '../src/hoje/hojeMath'
import ParaHoje from '../src/components/hoje/ParaHoje'
import BottomNav from '../src/components/BottomNav'
import JourneyScreen from '../src/screens/JourneyScreen'
import BibliaRaiz from '../src/components/biblia/BibliaRaiz'
import { deriveProgress, computeBookChapterCounts, bookNameFor } from '../src/utils/progress'
import SuaBibliaScreen from '../src/screens/SuaBibliaScreen'
import { PLANS } from '../src/data/bibleBlocks'
import { GAMIFICATION_BOOKS, bookInfo } from '../src/data/gamificationBlocks'
import BookChapterScreen from '../src/screens/BookChapterScreen'
import BuscaScreen from '../src/screens/BuscaScreen'
import { getFreeReadingPosition } from '../src/bible/freeReadingPositionStore'
import { setWheelMode } from '../src/gamification/wheelModeStore'
import { dateKey } from '../src/utils/dateKey'
import ConquistasScreen from '../src/screens/ConquistasScreen'
import FamiliaScreen from '../src/screens/FamiliaScreen'
import NovaConquistaScreen from '../src/screens/NovaConquistaScreen'
import EstanteScreen from '../src/screens/EstanteScreen'
import SeloScreen from '../src/screens/SeloScreen'
import LivroCompletoScreen from '../src/screens/LivroCompletoScreen'
import MeuPlanoScreen from '../src/screens/MeuPlanoScreen'
import SeuPlanoScreen from '../src/screens/SeuPlanoScreen'
import AjustarPlanoScreen from '../src/screens/AjustarPlanoScreen'
import { evaluateGamification, loadGamificationStats, markAchievementsSeen } from '../src/gamification/evaluate'
import PrayerScreen from '../src/screens/PrayerScreen'
import DayCompleteScreen from '../src/screens/DayCompleteScreen'
import PrayerRequestsScreen from '../src/screens/PrayerRequestsScreen'
import ReflectionScreen from '../src/screens/ReflectionScreen'
import PlanClockBar from '../src/components/timer/PlanClockBar'
import { usePlanClock } from '../src/timer/usePlanClock'
import { PlanClockContext } from '../src/timer/PlanClockContext'
import { setReflectionMethod } from '../src/reflection/reflectionMethodStore'
import { setPrayerMethod } from '../src/prayer/prayerMethodStore'
import { mergePedidos } from '../src/pedidos/pedidosMath'
import BibliotecaScreen from '../src/screens/BibliotecaScreen'
import PaginaDeAnotacao from '../src/screens/PaginaDeAnotacao'
import { meusEstudosApi } from '../src/studies/meusEstudosApi'
import NotaDeVersiculoScreen from '../src/screens/NotaDeVersiculoScreen'
import { wordsFingerprint } from '../src/anotar/guardadaMath'
import { keepLocalDraft, readLocalDraft, clearLocalDraft, keepLocalNote, readLocalNote, clearLocalNote } from '../src/anotar/rascunhoLocal'
import { verseCount } from '../src/data/versiculosPorCapitulo'
import AddStudyScreen from '../src/screens/AddStudyScreen'
import { pickLibraryData, libraryItems, withReadings, chaptersByDay, studiesSummary, studyItems, typeMeta } from '../src/biblioteca/bibliotecaMath'
import { bibliotecaApi } from '../src/biblioteca/bibliotecaApi'
import ReadingOrganizeScreen from '../src/screens/ReadingOrganizeScreen'
import ComunidadeRaiz from '../src/components/comunidade/ComunidadeRaiz'
import GrupoInicio from '../src/components/comunidade/GrupoInicio'
import FolhaDeConfirmacao from '../src/components/FolhaDeConfirmacao'
import GrupoDesafio from '../src/components/comunidade/GrupoDesafio'
import GrupoOracao from '../src/components/comunidade/GrupoOracao'
import GrupoConversa from '../src/components/comunidade/GrupoConversa'
import GrupoPessoas from '../src/components/comunidade/GrupoPessoas'
import AddFriendsScreen from '../src/screens/AddFriendsScreen'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks'
import { squareAvatarBlob } from '../src/profile/avatarImage'
import { restartReading } from '../src/reading/reiniciarStore'
import { planQueue, splitPointsFor, findPlanSession, sessionAt, resolveNextChapter } from '../src/reading/bibleOrderMath'
import { deriveChronoProgress } from '../src/data/chronologicalPlan'
import { linhaDeExemplo, perguntasDeExemplo, leiturasDeExemplo, buscasRecentesDeExemplo } from './bibliotecaFixture'

const params = new URLSearchParams(location.search)
const tela = params.get('tela') ?? 'hoje'

// Biblioteca: as capturas são de uma terça, 10 de novembro de 2026 — o
// "domingo" da pregação e as datas dos cartões só batem nesse dia. Na
// pré-visualização dessa aba o relógio parte de lá (`&hoje=AAAA-MM-DD`
// troca; `&hoje=real` usa o de verdade).
if ((tela === 'biblioteca' || tela === 'anotar') && params.get('hoje') !== 'real') {
  // A página de anotação parte de 2025: nas capturas N3 e N5 a anotação é
  // de uma terça, 2 de setembro, do ano corrente.
  const [ano, mes, dia] = (params.get('hoje') ?? (tela === 'anotar' ? '2025-11-10' : '2026-11-10')).split('-').map(Number)
  const RealDate = Date
  const offset = new RealDate(ano, mes - 1, dia, 10, 0).getTime() - RealDate.now()
  window.Date = class extends RealDate {
    constructor(...args) { if (args.length === 0) super(RealDate.now() + offset); else super(...args) }
    static now() { return RealDate.now() + offset }
  }
}
const estado = params.get('estado') ?? 'exemplo'
if (params.get('modo')) setWheelMode(params.get('modo'))

function keysFor(estado) {
  const set = new Set()
  const add = (nome, ate) => { for (let c = 1; c <= ate; c++) set.add(`${nome}:${c}`) }
  if (estado === 'exemplo') { add('Gênesis', 41); add('Salmos', 5); add('Jonas', 4) }
  if (estado === 'b1') { add('Gênesis', 40); add('Salmos', 6); add('Jonas', 4) }
  if (estado === 'inteira') for (const b of GAMIFICATION_BOOKS) add(b.nome, b.capitulos)
  return set
}

const completedSet = keysFor(estado)
// B2 (o livro): &livro=Rute abre o livro direto; &lidos=3 força quantos
// capítulos dele estão lidos (0 = não começado, o total = completo).
if (tela === 'biblia' && params.get('livro') && params.get('lidos') != null) {
  const nome = params.get('livro')
  for (let c = 1; c <= bookInfo(nome).capitulos; c++) completedSet.delete(`${nome}:${c}`)
  for (let c = 1; c <= Math.min(Number(params.get('lidos')), bookInfo(nome).capitulos); c++) completedSet.add(`${nome}:${c}`)
}

// Linhas locais de convidado (guestTableStore.js lê daqui sem conta) com
// DATAS — é o que alimenta ritmo/projeção (G2) e, nas etapas seguintes,
// as datas das conquistas. Semeadas uma vez por estado.
function seedGuestTables(estado) {
  const day = n => new Date(Date.now() - n * 86400000).toISOString()
  const chapters = []
  const sessions = []
  let i = 0
  for (const key of completedSet) {
    const [livro, cap] = key.split(':')
    // estado=b1 é a conta dos quadros da aba Bíblia: Gênesis começado há
    // 23 dias, com os capítulos 39 e 40 marcados à mão (B2).
    const b1Genesis = estado === 'b1' && livro === 'Gênesis'
    chapters.push({
      livro, capitulo: Number(cap), origem: b1Genesis && Number(cap) >= 39 ? 'manual' : 'sessao',
      created_at: day(estado === 'inteira' ? Math.floor(i / 4) : b1Genesis ? Math.max(1, 23 - Math.floor(i / 2)) : 70 - i),
    })
    i++
  }
  // Conta nova: nenhum registro de atividade (nem sessão, nem capítulo).
  if (estado !== 'nova') for (let d = 70; d >= 2; d -= 2) sessions.push({ data: day(d).slice(0, 10), passo: 'reading', segundos: estado === 'b1' ? 600 : 900, created_at: day(d), livro: d >= 30 && d <= 36 ? 'Jonas' : 'Gênesis' })
  // B2: 6 h 10 de leitura em Gênesis (as sessões acima já somam parte).
  if (estado === 'b1') {
    const jaTem = sessions.filter(x => x.livro === 'Gênesis').reduce((t, x) => t + x.segundos, 0)
    sessions.push({ data: day(1).slice(0, 10), passo: 'reading', segundos: Math.max(0, 22200 - jaTem), created_at: day(1), livro: 'Gênesis' })
  }
  // Dia concluído (S5): os tempos reais de hoje — 10 + 17 + 5 minutos.
  if (tela === 'dia') {
    const tempo = params.get('tempo') ?? '32'
    const soEstudo = params.get('dia') === 'estudo'
    const hojeKey = dateKey()
    const linha = (passo, segundos) => ({ data: hojeKey, passo, segundos, created_at: new Date().toISOString(), livro: passo === 'reading' ? 'Gênesis' : null })
    if (tempo === '1') sessions.push(linha('prayer', 40))
    else if (tempo !== '0') sessions.push(linha('prayer', 600), ...(soEstudo || params.get('dia') === 'um' ? [] : [linha('reading', 1020)]), ...(params.get('dia') === 'um' ? [] : [linha('reflection', 300)]))
  }
  localStorage.setItem('jc_guest_table_chapters_read', JSON.stringify(chapters))
  localStorage.setItem('jc_guest_table_session_seconds', JSON.stringify(sessions))
  // 20 semanas de rotina: meta 4 dias (Seg/Ter/Qui/Sáb); 18 batem, 2 não.
  const routine = {}
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  for (let w = 20; w >= 1; w--) {
    const miss = w === 10 || w === 3
    for (const i of miss ? [0, 3] : [0, 1, 3, 5]) {
      const d = new Date(monday); d.setDate(d.getDate() - 7 * w + i)
      routine[dateKey(d)] = { reading: true, prayer: true }
    }
  }
  routine[dateKey(monday)] = { reading: true }
  const history = [{ desde: dateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7 * 20)), dias: 4 }]
  const nova = estado === 'nova'
  const highlights = nova ? [] : [{ id: 'hl-1', book: 'Jonas', bookEn: 'Jonah', chapter: 2, verses: [2], text: '', color: 'amarelo', createdAt: day(30), date: day(30).slice(0, 10) }]
  const notes = nova ? {} : { 'Jonas:1-2': { text: 'nota', updatedAt: day(33) }, 'Jonas:3-4': { text: 'nota', updatedAt: day(30) }, 'Jonas:4-4': { text: 'nota', updatedAt: day(30) } }
  // B3/B6: o versículo 4 do Salmo 23 marcado, com a nota do quadro da busca.
  if (estado === 'b1') highlights.push({ id: 'hl-sl-23', book: 'Salmos', bookEn: 'Psalms', chapter: 23, verses: [4], text: 'O pastor não tira o vale — anda comigo nele.', tags: ['Consolo'], color: 'yellow', createdAt: day(2), date: day(2).slice(0, 10) })
  // B2: 12 notas e marcações em Gênesis (5 notas + 7 marcações).
  if (estado === 'b1') {
    for (let n = 1; n <= 5; n++) notes[`Gênesis:${n}-${n}`] = { text: 'nota', updatedAt: day(20 - n) }
    for (let n = 1; n <= 7; n++) highlights.push({ id: `hl-gn-${n}`, book: 'Gênesis', bookEn: 'Genesis', chapter: n, verses: [1], text: '', color: 'amarelo', createdAt: day(20 - n), date: day(20 - n).slice(0, 10) })
  }
  // Sua aplicação (Para hoje): a frase fixada + a entrada do dia em que foi escrita.
  // Reflexão (S4): um trecho marcado hoje na leitura do plano (Gênesis 41:51).
  if (tela === 'reflexao' && (params.get('trecho') ?? 'marcado') === 'marcado') highlights.push({ id: 'hl-hoje', book: 'Gênesis', bookEn: 'Genesis', chapter: 41, verses: [51], text: '', color: 'amarelo', createdAt: new Date().toISOString(), date: dateKey(), sessionMode: 'session' })
  const aplicacao = params.get('aplicacao') ?? (nova ? 'nenhuma' : 'ontem')
  if (aplicacao !== 'nenhuma') {
    const frase = 'Hoje eu espero sem cobrar resposta.'
    const quando = dateKey(new Date(Date.now() - (aplicacao === 'hoje' ? 0 : 86400000)))
    notes['application:pinned'] = { text: frase, updatedAt: day(1) }
    notes[`application:${quando}`] = { text: frase, updatedAt: day(1), fulfilled: aplicacao === 'cumprida' }
  }
  // Dia concluído (S5): a frase escrita hoje na reflexão (a do quadro).
  if (tela === 'dia') {
    if (params.get('frase') === 'nao') delete notes[`application:${dateKey()}`]
    else notes[`application:${dateKey()}`] = { text: 'Deus não desperdiça a espera — vou parar de cobrar de mim um prazo que não é meu.', updatedAt: new Date().toISOString() }
  }
  // Meu Plano (P1–P5): dias por passo e a entrada de HOJE conforme `plano`.
  const todayIdx = (new Date().getDay() + 6) % 7
  const all = [true, true, true, true, true, true, true]
  const semHoje = all.map((_, i) => i !== todayIdx)
  const planoState = params.get('plano') ?? 'p1'
  const soHoje = all.map((_, i) => i === todayIdx)
  const nenhumDia = [false, false, false, false, false, false, false]
  const stepDays = planoState === 'semplano'
    ? { prayer: nenhumDia, reading: nenhumDia, study: nenhumDia, reflection: nenhumDia }
    : planoState === 'p4'
    ? { prayer: semHoje, reading: semHoje, study: [false, false, false, false, false, false, false], reflection: semHoje }
    : planoState === 'p5'
      ? { prayer: all, reading: semHoje, study: soHoje.map((v, i) => v || i === (todayIdx + 2) % 7 || i === (todayIdx + 4) % 7), reflection: all }
      : planoState === 'quatro'
        ? { prayer: all, reading: all, study: soHoje, reflection: all }
        : { prayer: all, reading: all, study: [false, false, false, false, false, false, false], reflection: all }
  // Estudo ativo de exemplo (formato novo, 7 dias, dia 1 feito) pra p5/quatro.
  const estudo = {
    id: 'est-ansiedade', title: 'Ansiedade', createdAt: day(10),
    sessions: [[4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4]].map(([a, b], i) => ({ id: i + 1, book: 'Filipenses', chStart: a, chEnd: b, passage: `Filipenses 4:${4 + i}-${6 + i}`, completedAt: i === 0 ? day(2) : (i === 1 && tela === 'dia') ? new Date().toISOString() : undefined })),
  }
  const comEstudo = planoState === 'p5' || planoState === 'quatro' || (tela === 'dia' && params.get('dia') === 'estudo')
  const hoje = new Date(); hoje.setHours(6, 42, 0, 0)
  const atH = (h, m) => { const d = new Date(hoje); d.setHours(h, m, 0, 0); return d.toISOString() }
  const todayEntry = {
    p1: { prayer: true, prayerAt: atH(6, 42) },
    p1i: { prayer: true, prayerAt: atH(6, 42), readingProgress: { startedAt: atH(7, 0), elapsedSeconds: 372 } },
    p2: {},
    p3: { prayer: true, prayerAt: atH(6, 42), reading: true, readingAt: atH(7, 1), reflection: true, reflectionAt: atH(7, 8) },
    p4: {}, um: {}, quatro: {}, p5: { prayer: true, prayerAt: atH(6, 40) },
  }[planoState] ?? {}
  routine[dateKey(new Date())] = { ...(routine[dateKey(new Date())] ?? {}), ...todayEntry }
  // `&meus=exemplo` (tela=estudos): estudos guardados — dois criados, um
  // indutivo e um do catálogo já começado — para as ações de "Meus estudos".
  const sessoesDeEstudo = n => Array.from({ length: n }, (_, i) => ({ id: i + 1, book: 'Filipenses', chStart: 1 + (i % 4), chEnd: 1 + (i % 4) }))
  const meusEstudos = tela === 'estudos' && params.get('meus') === 'exemplo'
    ? {
        ai: [{ id: 'est-perdao', title: 'Perdão em sete dias', sessions: sessoesDeEstudo(7), origin: 'created', createdAt: '2026-10-01T10:00:00.000Z' }, { id: 'est-rute', title: 'Rute, do começo ao fim', sessions: sessoesDeEstudo(4), origin: 'public', createdAt: '2026-09-01T10:00:00.000Z' }],
        inductive: [{ id: 'ind-filipenses', title: 'Filipenses, método indutivo', book: 'Filipenses', sessions: sessoesDeEstudo(2), createdAt: '2026-08-01T10:00:00.000Z' }],
        completed: ['pentateuco:1', 'pentateuco:2'],
      }
    : { ai: [], inductive: [], completed: [] }
  // `&lapis=rascunho|finalizada|vazio` (tela=biblia): as anotações longas
  // da conta de exemplo — com um rascunho em andamento, o lápis flutuante
  // (34e) aparece na Bíblia.
  const lapis = params.get('lapis')
  const anotacaoDoLapis = { id: 'sermon-r', createdAt: '2026-11-08T13:00:00.000Z', updatedAt: '2026-11-08T13:30:00.000Z', title: 'A espera que forma', passages: [{ book: 'Gênesis', chapter: 43, verseStart: 3, verseEnd: 3 }, { book: 'Tiago', chapter: 1, verseStart: 3, verseEnd: 4 }], body: [{ id: 'a', type: 'text', text: 'Judá voltou.' }], text: 'Judá voltou.', finalizedAt: null, tags: ['espera'], sharedGroupIds: ['g1'] }
  const sermon_notes = lapis === 'rascunho' ? [{ ...anotacaoDoLapis, id: 'sermon-f', finalizedAt: '2026-11-09T10:00:00.000Z' }, anotacaoDoLapis]
    : lapis === 'finalizada' ? [{ ...anotacaoDoLapis, finalizedAt: '2026-11-09T10:00:00.000Z' }]
      : lapis === 'vazio' ? [{ ...anotacaoDoLapis, title: '', passages: [], body: [{ id: 'a', type: 'text', text: '  ' }], text: '' }] : []
  localStorage.setItem('jc_guest_data', JSON.stringify({ sermon_notes, completed_keys: [...completedSet], daily_routine: nova ? {} : routine, weekly_goal_history: nova ? [] : history, highlights, notes, step_days: stepDays, ai_studies: [...(comEstudo ? [estudo] : []), ...meusEstudos.ai], inductive_studies: meusEstudos.inductive, studies_completed: meusEstudos.completed, active_study: comEstudo ? { studyId: estudo.id } : null, reading_clock_prefs: { showOnReading: params.get('relogio') !== 'nao', warnAtZero: true, askToContinue: params.get('perguntar') === 'sim' } }))
  return nova ? {} : routine
}
const dailyRoutine = seedGuestTables(estado)
const planoState = params.get('plano') ?? 'p1'
const plan = PLANS.find(p => p.id === 'standard')
const todaySession = estado === 'inteira'
  ? { book: 'Apocalipse', chStart: 22, chEnd: 22, type: 'reading', needsThemePick: false, title: 'Apocalipse 22', id: 1 }
  : { book: 'Gênesis', chStart: 42, chEnd: 42, type: 'reading', needsThemePick: false, title: 'Gênesis 42', id: 1 }

// &lang=en: a pré-visualização em inglês (a sessão e o t() sem idioma).
const previewLang = params.get('lang') === 'en' ? 'en' : 'pt'
try { localStorage.setItem('jc_app_language', previewLang) } catch { /* sem localStorage */ }

const session = {
  lang: previewLang, userName: 'Diego', avatarInitials: 'DZ', todaySession,
  routineModules: planoState === 'um' ? ['prayer'] : ['prayer', 'reading', 'study', 'reflection'], plan,
  todayRoutine: {}, dailyRoutine,
  lastReadPosition: { book: 'Gênesis', chapter: 41 },
  biblePercent: 4.2, activeStudyId: (planoState === 'p5' || planoState === 'quatro') ? 'est-ansiedade' : null,
  chaptersRead: completedSet.size,
  myGroups: [], hasNoPlan: false, hasPremium: true, weeklyGoalDays: 4, weeklyDays: [true, true, false, true, false, true, false],
  currentBlock: { name: 'Pentateuco', book: 'Gênesis', chapter: estado === 'b1' ? 41 : 42, bookChapters: 50, bookPercent: 82 },
}
const authUser = { email: 'preview@example.com' }
// Resumo da semana (Para hoje): pronto e não lido, já lido, ou nenhum.
const resumo = params.get('resumo') ?? 'nenhum'
const weeklySummaries = resumo === 'nenhum' ? [] : [{ weekKey: '2026-08-25', startKey: '2026-08-25', endKey: '2026-08-31', seen: resumo === 'lido' }]

// Conquistas: a migração silenciosa roda uma vez sobre os dados semeados
// (guest row) e devolve a linha; com `novas=1`, duas ficam como não vistas
// pra mostrar o ponto laranja de G5.
function useGamificationRow() {
  const [row, setRow] = useState(null)
  const [data, setData] = useState(null)
  useState(() => {
    localStorage.removeItem('jc_guest_gami_done')
    evaluateGamification({ completedSet, dailyRoutine, weeklyGoalDays: 4, silent: true }).then(async res => {
      let r = res.row
      if (params.get('novas') === '1') {
        const raw = JSON.parse(localStorage.getItem('jc_guest_data'))
        for (const id of ['leitura:2', 'constancia:3']) if (raw.achievements[id]) raw.achievements[id].seen = false
        localStorage.setItem('jc_guest_data', JSON.stringify(raw))
        r = { ...r, achievements: raw.achievements }
      }
      setRow(r)
      setData(await loadGamificationStats({ completedSet, dailyRoutine, weeklyGoalDays: 4 }))
    })
  })
  return [row, setRow, data]
}

// A aba Bíblia de verdade (handoff-biblia-52): JourneyScreen com os mesmos
// dados de navegação que o App monta (deriveProgress) e os capítulos
// marcáveis na memória, pra dar pra abrir livro, ler e marcar.
if (tela === 'biblia') {
  const livre = params.get('livre') ?? '4'
  if (livre === 'nao') localStorage.removeItem('jc_free_reading_position')
  else localStorage.setItem('jc_free_reading_position', JSON.stringify({ book: 'Salmos', bookEn: 'Psalms', chapter: 23, verse: livre === 'sem' ? null : Number(livre), readAt: new Date(Date.now() - 2 * 86400000).toISOString() }))
  if (params.get('testamento')) localStorage.setItem('jc_bible_testament', params.get('testamento'))
  else localStorage.removeItem('jc_bible_testament')
  // Busca (B5): as três buscas recentes do quadro; &recentes=nao começa sem nenhuma.
  if (params.get('recentes') === 'nao') localStorage.removeItem('jc_bible_recent_searches')
  else localStorage.setItem('jc_bible_recent_searches', JSON.stringify([{ text: 'pastor', sub: '14 versículos' }, { text: 'Romanos 8', sub: 'Capítulo' }, { text: 'ansiedade', sub: 'Tema · 21 trechos' }]))
}
function BibliaPreview({ onPastRootChange }) {
  const [done, setDone] = useState(completedSet)
  const { blocks, sessionsByBlock } = deriveProgress(done, 'standard')
  const { sessionsByBlock: browseSessionsByBlock } = deriveProgress(done, 'free')
  const mark = (book, chapters, on) => setDone(prev => {
    const next = new Set(prev)
    for (const ch of chapters) { if (on) next.add(`${book}:${ch}`); else next.delete(`${book}:${ch}`) }
    return next
  })
  if (estado === 'carregando') {
    // Os dias do plano chegam na hora no preview — o esqueleto do cartão preto é montado aqui.
    return <BibliaRaiz lang="pt" completedSet={done} versionId="pt-nvt" sessionTitle={undefined} free={null} currentBook="Gênesis" />
  }
  // B5–B7 direto: &busca= (vazio = ao abrir) ou &busca=jo 3 16 — a tela da
  // busca de verdade; &plano=semplano tira a sessão de hoje, &livre=nao a
  // leitura livre e &recentes=nao as buscas recentes.
  if (params.has('busca')) {
    const freePos = getFreeReadingPosition()
    return (
      <BuscaScreen
        session={session} authUser={authUser} initialQuery={params.get('busca')} completedSet={done}
        sessionTitle={planoState === 'semplano' ? null : `${session.currentBlock.book} ${session.currentBlock.chapter}`} free={freePos}
        onBack={() => alert('voltar à raiz da Bíblia')}
        onOpenChapter={(book, chapter, verse, extra) => alert(`abrir ${book} ${chapter}${verse ? ` no versículo ${verse}` : ''}${extra?.noteId ? ' com a nota aberta' : ''}`)}
        onOpenTheme={id => alert(`abrir o tema ${id}`)}
        onOpenBook={nome => alert(`abrir o livro ${nome}`)}
        onReadSession={() => alert('ler a sessão de hoje (conta no plano)')}
        onOpenFree={() => alert('continuar a leitura livre')}
      />
    )
  }
  const livro = params.get('livro')
  // B3/B4: &cap=23 abre o capítulo direto na leitura livre; &marcar=1 toca
  // "Marcar como lido" sozinho (o cartão B4, ou o parabéns quando for o
  // caso); &parabens=nao simula a avaliação que não achou parabéns nenhum.
  const cap = Number(params.get('cap')) || null
  const celebrarAgora = () => {
    if (params.get('parabens') === 'nao') return Promise.resolve(false)
    alert('parabéns na hora (G8 ou G4)')
    return Promise.resolve(true)
  }
  useEffect(() => {
    if (!cap || params.get('marcar') !== '1') return undefined
    const timer = setTimeout(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Marcar como lido')?.click(), 900)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (livro) {
    // B2 direto: a tela do livro de verdade, sem passar pela raiz.
    const block = blocks.find(x => x.books.includes(livro))
    return (
      <BookChapterScreen
        session={session} authUser={authUser} block={block} bookName={livro} displayName={bookNameFor(livro, session.lang)}
        browseSessionsByBlock={browseSessionsByBlock} completedSet={done}
        onToggleSession={() => {}} onToggleChapter={(sn, chapter, on) => mark(sn.book, [chapter], on)}
        onMarkChaptersManually={(book, chapters, on) => mark(book, chapters, on)} onOpenSelo={nome => alert(`abrir o selo de ${nome}`)}
        onNavigate={t => alert(`navegar: ${t}`)} onBack={() => alert('voltar à raiz da Bíblia')}
        onCelebrateNow={celebrarAgora}
        initialSessionId={cap ? (browseSessionsByBlock[block.id] ?? []).find(x => x.book === livro && x.chStart <= cap && cap <= x.chEnd)?.id : undefined}
        initialTextOpen={!!cap}
      />
    )
  }
  // &leitura=plano: a leitura pela sessão do plano (a sessão em andamento do
  // primeiro bloco) — pra conferir que ela não muda quando a leitura livre muda.
  const planReading = params.get('leitura') === 'plano'
  const planSession = planReading ? (sessionsByBlock[blocks[0].id].find(x => x.status === 'current') ?? sessionsByBlock[blocks[0].id].find(x => x.status !== 'done')) : null
  // S3: os passos de hoje (barra do dia), o plano da Bíblia contínua (é ele
  // que tem relógio) e, com &grupo=sim, um grupo.
  const dia = params.get('dia')
  const planSessionData = !planReading ? session : {
    ...session,
    activePlan: { kind: 'fixed' },
    todaysSteps: dia === 'um' ? ['reading'] : dia === 'estudo' ? ['prayer', 'reading', 'study', 'reflection'] : ['prayer', 'reading', 'reflection'],
    todayRoutine: Object.fromEntries((params.get('feitos') ?? 'prayer').split(',').filter(Boolean).map(k => [k, true])),
    myGroups: params.get('grupo') === 'sim' ? [{ groupId: 'g1', name: 'Grupo Semente' }] : [],
  }
  return (
    <JourneyScreen
      session={planSessionData} authUser={authUser} stepMinutes={{ prayer: 10, reading: 15, study: 15, reflection: 5 }} blocks={blocks} sessionsByBlock={sessionsByBlock} browseSessionsByBlock={browseSessionsByBlock}
      completedSet={done} entryMode={planReading ? 'reading' : 'overview'} initialBlockId={planReading ? blocks[0].id : undefined} resumeSessionId={planSession?.id}
      onGoToReflectionFrom={() => alert('ir pra reflexão')} onExitReading={() => alert('sair da leitura')}
      onToggleSession={() => {}} onToggleChapter={(sn, chapter, on) => mark(sn.book, [chapter], on)}
      onMarkChaptersManually={(book, chapters, on) => mark(book, chapters, on)} onOpenSelo={nome => alert(`abrir o selo de ${nome}`)}
      onNavigate={t => alert(`navegar: ${t}`)} onContinueSession={() => alert('ler a sessão de hoje (conta no plano)')}
      onOpenSuaBiblia={() => alert('abrir Sua Bíblia')} onPastRootChange={onPastRootChange} onCelebrateNow={celebrarAgora}
      onOpenGroupRoom={alvo => alert(`abrir a sala do grupo: ${alvo.book} ${alvo.chapter}`)}
      onOpenSermonNote={() => alert('abrir a página de anotação no rascunho em andamento')}
    />
  )
}

// Oração ACTS (S1/S2): a tela de verdade, com os pedidos na memória — os
// da captura S2 e, com &pedidos=7, mais quatro (um de amigo, um anônimo).
if (tela === 'oracao') setPrayerMethod(params.get('metodo') === 'livre' ? 'free' : 'acts')
function pedidosDeExemplo() {
  const ha = dias => new Date(Date.now() - dias * 86400000).toISOString()
  const meu = (id, body, dias, extra = {}) => ({ id, body, scope: 'only_me', groupId: null, groupName: '', isMine: true, status: 'open', resposta: null, notaResposta: null, createdAt: ha(dias), respondidoEm: null, prayCount: 0, diasOrados: 0, prayedToday: false, prayedEver: false, commentCount: 0, ...extra })
  const tres = [
    meu('p1', 'Sabedoria para decidir sobre a mudança de cidade', 24, { diasOrados: 9, prayedToday: true, prayedEver: true }),
    { ...meu('p2', 'A cirurgia da mãe da Marina, na quinta', 2), scope: 'group', groupId: 'g1', groupName: 'Grupo Semente', isMine: false, prayCount: 5 },
    meu('p3', 'Meu pai voltar a falar com meu irmão', 92),
  ]
  const mais = [
    { ...meu('p4', 'Emprego para o Lucas, que está há oito meses procurando', 5), scope: 'group', groupId: 'g2', groupName: 'Batista Central', isMine: false, prayCount: 1 },
    meu('p5', 'Paciência com as crianças nas manhãs', 11),
  ]
  const amigos = [
    { id: 'p6', authorName: 'Marina Alves', body: 'Prova de residência no sábado', anonymous: false, scope: 'friends', createdAt: ha(1), prayCount: 0, prayingByMe: false, prayedEver: false, isMine: false, status: 'open' },
    { id: 'p7', authorName: null, body: 'Um diagnóstico que ainda não contei a ninguém', anonymous: true, scope: 'friends', createdAt: ha(3), prayCount: 12, prayingByMe: false, prayedEver: false, isMine: false, status: 'open' },
  ]
  // Respondidos (O1): doze, os dois mais recentes como no quadro.
  const respostas = ['sim', 'aprenda', 'nao', 'se_mova', 'sim', 'sim', 'aprenda', 'nao', 'sim', 'se_mova', 'sim', 'aprenda']
  const respondidos = params.get('respondidos') === '0' ? [] : respostas.slice(0, Number(params.get('respondidos')) || 12).map((resposta, i) => meu(`r${i}`,
    ['Trabalho para a Juliana', 'Que meu chefe mudasse', 'A viagem em julho', 'A casa nova', 'A prova do Davi', 'O exame da minha mãe', 'Vender o carro', 'Mudar de turma', 'O visto', 'A conversa com o Paulo', 'O aluguel de março', 'Dormir melhor'][i],
    [59, 250, 40, 90, 20, 15, 70, 33, 120, 12, 45, 28][i] + 10 * (i + 1),
    { status: 'closed', resposta, respondidoEm: ha(10 * (i + 1)), notaResposta: i === 0 ? 'Começou em março, no lugar que ela nem tinha pedido.' : i === 1 ? 'Ele segue igual. Eu que aprendi a responder diferente.' : null }))
  const qual = params.get('pedidos') ?? '3'
  const ativos = qual === '0' ? [] : qual === '7' ? [...tres, ...mais] : tres
  const mine = tela === 'pedidos' ? [...ativos.map((p, i) => (i === 1 ? { ...p, commentCount: Number(params.get('comentarios') ?? 0) } : p)), ...respondidos] : ativos
  return mergePedidos({ mine, feed: qual === '7' ? amigos : [], intentions: null, todayKey: dateKey() })
}
const pedidosDePreview = {
  load: () => {
    const qual = params.get('pedidos')
    if (qual === 'carregando') return new Promise(() => {})
    if (qual === 'erro') return Promise.reject(new Error('sem rede (pré-visualização)'))
    return new Promise(resolve => setTimeout(() => resolve({ pedidos: pedidosDeExemplo(), othersPrayed: Number(params.get('oracoes') ?? 47) }), 150))
  },
  orar: p => { console.log('[preview] orei:', p.id, p.isMine ? '(meu: só a data)' : '(de outra pessoa: conta em "Oração pelos outros")'); return Promise.resolve() },
  desfazer: p => { console.log('[preview] desfiz o orei:', p.id); return Promise.resolve() },
}
// "Fazer um pedido" (O2) na pré-visualização: grupos e gravação de memória.
// &grupos=1|0|3 (com três, a fileira de "Quem vê" rola) · &ia=nao
const formDePreview = {
  getMyGroups: async () => [{ groupId: 'g1', name: 'Grupo Semente' }, { groupId: 'g2', name: 'Batista Central' }, { groupId: 'g3', name: 'Família' }].slice(0, Number(params.get('grupos') ?? 1)),
  getGroupMemberCounts: async () => ({ g1: 6, g2: 31, g3: 1 }),
  getFriendsCount: async () => 12,
  createPrayerRequest: async pedido => { console.log('[preview] pedido gravado:', JSON.stringify(pedido)); alert(`${pedido.scope === 'only_me' ? 'guardado só para mim' : 'publicado'}: ${JSON.stringify(pedido)}`) },
  composePrayerRequestDraft: async () => new Promise(resolve => setTimeout(() => resolve('Peço coragem e paz para acompanhar meu pai no tratamento que começa na terça.'), 400)),
}
function OracaoPreview() {
  const dia = params.get('dia')
  const steps = dia === 'um' ? ['prayer'] : dia === 'estudo' ? ['prayer', 'reading', 'study', 'reflection'] : ['prayer', 'reading', 'reflection']
  const feitos = Object.fromEntries((params.get('feitos') ?? '').split(',').filter(Boolean).map(k => [k, true]))
  const minutos = Number(params.get('minutos')) || 10
  const s = { ...session, hasPremium: params.get('premium') !== 'nao', todaysSteps: steps, todayRoutine: feitos }
  return (
    <PrayerScreen
      session={s} authUser={authUser} stepMinutes={{ prayer: minutos, reading: 15, study: 15, reflection: 5 }}
      initialStage={Math.min(4, Math.max(1, Number(params.get('etapa')) || 1)) - 1} pedidosApi={pedidosDePreview} formApi={formDePreview}
      onPrayerCompleted={() => alert('oração terminada → bênção (36f)')} onNavigate={t => alert(`navegar: ${t}`)}
      onExitGuided={() => {}} onBack={() => alert('voltar')}
    />
  )
}

// Reflexão com perguntas (S4): a tela de verdade, com perguntas de exemplo
// no lugar da geração (cada "Trocar" traz um par novo).
if (tela === 'reflexao') setReflectionMethod(params.get('metodo') === 'livre' ? 'free' : 'questions')
const paresDeExemplo = [
  ['José passou treze anos entre o poço e o palácio. O que você está esperando há mais tempo do que gostaria?', 'Quem Deus usou na sua vida por um caminho que você não escolheria?'],
  ['O faraó sonhou e ninguém soube explicar. Que pergunta sua ainda está sem resposta?', 'José deu a Deus o crédito pela resposta. Onde você tem ficado com um crédito que não é seu?'],
  ['Sete anos de fartura antes de sete de fome. O que você pode guardar agora para os dias difíceis?', 'José perdoou sem esquecer o que viveu. Que lembrança você ainda precisa entregar?'],
]
function perguntasDePreview({ avoidQuestions }) {
  const como = params.get('perguntas') ?? 'ok'
  if (como === 'carregando') return new Promise(() => {})
  if (como === 'erro') return Promise.reject(new Error('sem rede (pré-visualização)'))
  if (como === 'limite') return Promise.reject(new Error('daily_limit_reached'))
  // O primeiro par que ainda não apareceu (o pedido diz quais evitar).
  const par = paresDeExemplo.find(p => !p.some(q => avoidQuestions.includes(q))) ?? paresDeExemplo[0]
  console.log('[preview] perguntas pedidas; evitar', avoidQuestions.length)
  return new Promise(resolve => setTimeout(() => resolve(par), 250))
}
function ReflexaoPreview() {
  const dia = params.get('dia')
  const steps = dia === 'um' ? ['reflection'] : dia === 'estudo' ? ['prayer', 'reading', 'study', 'reflection'] : ['prayer', 'reading', 'reflection']
  const feitos = Object.fromEntries((params.get('feitos') ?? 'prayer,reading,study').split(',').filter(Boolean).map(k => [k, true]))
  const s = { ...session, hasAI: true, todaysSteps: steps, todayRoutine: feitos }
  const trecho = params.get('trecho') ?? 'marcado'
  return (
    <ReflectionScreen
      session={s} authUser={authUser} stepMinutes={{ prayer: 10, reading: 15, study: 15, reflection: 5 }}
      lastReadChapterInfo={trecho === 'nenhum' ? null : { book: 'Gênesis', bookEn: 'Genesis', chStart: 41, chEnd: 41 }}
      initialQuestion={Math.min(3, Math.max(1, Number(params.get('pergunta')) || 1)) - 1} questionsApi={perguntasDePreview}
      onReflectionCompleted={() => alert('reflexão terminada → dia concluído (ou o passo que falta)')}
      onApplicationChanged={() => console.log('[preview] a frase fixada no Início mudou')}
      onExitGuided={() => {}} onBack={() => alert('voltar')}
    />
  )
}

// Dia concluído (S5): a tela de verdade, sobre os dados semeados (tempos de
// hoje, frase, semana, estudo). Gênesis 41 acabou de ser lido.
function DiaPreview() {
  const dia = params.get('dia')
  const steps = dia === 'um' ? ['prayer'] : dia === 'estudo' ? ['prayer', 'study', 'reflection'] : ['prayer', 'reading', 'reflection']
  const lidos = new Set([...completedSet, 'Gênesis:41'])
  const s = { ...session, biblePercent: 4.3, activeStudyId: dia === 'estudo' ? 'est-ansiedade' : null }
  return (
    <DayCompleteScreen
      session={s} authUser={authUser} completedSet={lidos} steps={steps}
      readingSession={dia === 'estudo' || dia === 'um' ? null : { book: 'Gênesis', bookEn: 'Genesis', chStart: 41, chEnd: 41, type: 'reading' }}
      onBack={() => alert('voltar ao plano (e, se houver, a tela de parabéns)')}
    />
  )
}

// A Biblioteca com a conta de exemplo, em memória. `&conta=nova|um`,
// `&estudos=guardados|um|nenhum`, `&estado=carregando|erro`.
const bibliotecaDePreview = {
  load() {
    const como = params.get('estado')
    if (como === 'carregando') return new Promise(() => {})
    if (como === 'erro') return Promise.reject(new Error('sem rede (pré-visualização)'))
    const conta = params.get('conta') ?? 'exemplo'
    const linha = linhaDeExemplo({ conta, estudos: params.get('estudos') ?? 'andamento' })
    // `&rascunho=domingo|semtitulo`: uma anotação não finalizada, para a
    // linha do rascunho da folha "Nova" (N1).
    const rascunho = params.get('rascunho')
    if (rascunho) {
      const domingo = new Date(2026, 10, 8, 10, 30).toISOString()
      linha.sermon_notes = [{ id: 'sermon-rascunho', date: '2026-11-08', createdAt: domingo, updatedAt: domingo, noteType: 'sermon', title: rascunho === 'semtitulo' ? '' : 'A espera que forma', preacher: '', church: '', link: '', passages: [], text: 'Judá é o mesmo que vendeu José. Agora é ele que se oferece.', body: [{ id: 's1', type: 'text', text: 'Judá é o mesmo que vendeu José. Agora é ele que se oferece.' }], finalizedAt: null }, ...linha.sermon_notes]
    }
    const apagados = window.__bibliotecaApagados ?? new Set()
    const data = pickLibraryData({ ...linha, notes: Object.fromEntries(Object.entries(linha.notes).filter(([key]) => !apagados.has(key))), highlights: linha.highlights.filter(h => !apagados.has(h.id)), sermon_notes: linha.sermon_notes.filter(n => !apagados.has(n.id)) })
    const readByDay = chaptersByDay(conta === 'exemplo' ? leiturasDeExemplo() : [])
    return new Promise(resolve => setTimeout(() => resolve({
      items: withReadings(libraryItems({ ...data, questions: perguntasDeExemplo(conta) }), readByDay).filter(item => !apagados.has(item.key)),
      readByDay,
      studies: studiesSummary({ ai: data.aiStudies, inductive: data.inductiveStudies, completed: data.studiesCompleted, activeStudyId: data.activeStudyId }),
      studyItems: studyItems({ ai: data.aiStudies, inductive: data.inductiveStudies, completed: data.studiesCompleted }),
    }), 150))
  },
  verseText: bibliotecaApi.verseText,
  async remove(item) {
    const row = (window.__bibliotecaApagados ??= new Set())
    row.add(item.id ?? item.noteKey ?? item.key)
  },
}

// `&tipo=nota|marcacao|reflexao|pregacao|aplicacao|pergunta` abre direto a
// tela do tipo. Notas e Marcações: `&aba=data` (e `&aba=nota`) e
// `&abrir=Gênesis` (o livro aberto por "Ver os N"). Pregações:
// `&filtro=sermon|service|class|video|free` e `&ordem=oldest|preacher`.
// Aplicações: `&filtro=done|open`.
// A busca: `&busca=abrir` (L4), com `&em=pregacao` (o tipo de "Buscar em"),
// `&livro=Gênesis`, `&periodo=week|month|year` (ou `&de=AAAA-MM-DD&ate=…`),
// `&pregador=Pr. João Silva`, `&q=espera` (os resultados, L5), `&ver=tudo`
// (o "Ver tudo" da raiz) e `&recentes=nao`. A folha "Nova" (N1):
// `&nova=abrir`, com `&rascunho=domingo|semtitulo` (a linha do rascunho).
if (tela === 'biblioteca') {
  if (params.get('recentes') === 'nao' || params.get('conta') === 'nova') localStorage.removeItem('jc_library_recent_searches')
  else localStorage.setItem('jc_library_recent_searches', JSON.stringify(buscasRecentesDeExemplo))
}
function BibliotecaPreview({ onPastRootChange }) {
  const tipo = params.get('tipo')
  const tipoView = tipo ? { name: 'tipo', type: tipo, tab: params.get('aba') ?? undefined, expanded: params.get('abrir') ? [params.get('abrir')] : [], filter: params.get('filtro') ?? undefined, order: params.get('ordem') ?? undefined } : null
  const initialView = params.has('busca') ? { name: 'busca', back: tipoView ?? { name: 'raiz' } } : tipoView
  const periodo = params.get('de') || params.get('ate') ? { key: 'custom', from: params.get('de') ?? '', to: params.get('ate') ?? '' } : { key: params.get('periodo') ?? 'always' }
  const initialSearch = { query: params.get('q') ?? '', type: params.get('em') ?? 'all', book: params.get('livro'), period: periodo, preacher: params.get('pregador'), browse: params.get('ver') === 'tudo' }
  return (
    <BibliotecaScreen
      session={session} api={bibliotecaDePreview} initialView={initialView} initialSearch={initialSearch} onPastRootChange={onPastRootChange}
      initialNew={params.get('nova') === 'abrir'}
      onNewNote={(type, details) => alert(`abrir a página de anotação (N2), tipo ${type}${details ? ', com os detalhes (N3) por cima' : ', em branco'}`)}
      onNewVerseNote={() => alert('abrir o seletor de versículo e, depois, a nota (N4)')}
      onOpenVerseNote={id => alert(`abrir a nota de versículo (N4): ${id}`)}
      onEditApplication={() => alert('abrir a lista de frases do Perfil, onde a frase se edita')} onApplicationChanged={() => {}}
      onOpenStudies={() => alert('abrir a tela Estudos')} onCreateStudy={() => alert('criar um estudo (35d)')}
      onOpenSermonNote={(id, { draft } = {}) => alert(`abrir ${draft ? 'a página de escrever (N2), no rascunho' : 'a anotação guardada (N5)'}: ${id}`)}
      onOpenBible={(book, chapter, verse, extra) => alert(`abrir a Bíblia em ${book} ${chapter}${verse ? `:${verse}` : ''}${extra?.noteId ? ' com a nota aberta' : ''}`)}
    />
  )
}

// A anotação longa (N2, N3 e N5, handoff-biblioteca-55 §7A), com as
// anotações na memória. `&nota=guardada` abre a anotação guardada (N5):
// `&guardada=curta|semtopicos|sempassagens|minima`, `&sintese=guardada|
// lenta|erro`, `&grupo=falha` (a publicação falha). `&nota=sumiu`.
// `&nota=exemplo` (a da captura N2, um rascunho) ·
// `nova` (anotação livre em branco) · `pregacao` (nova, tipo Sermão) ·
// `semtitulo` · `rascunho` (retoma o rascunho em andamento) · `antiga`
// (formato de antes dos blocos, já finalizada). `&tipo=livre` troca o tipo
// da anotação de exemplo; `&tipos=proprios` traz um tipo criado pela
// pessoa. `&detalhes=tipo|title|tags|who` abre os detalhes
// (N3). `&grupos=0|2|3` e `&grupo=escolhido` ("Quem vê"). `&teclado=aberto`
// simula o teclado. `&rede=fora` faz a gravação falhar. `&persistir=sim`
// guarda as anotações entre recargas (para fechar e reabrir).
// `&estado=carregando|erro`.
const ALTURA_DO_TECLADO = 291
if ((tela === 'anotar' || tela === 'nota') && params.get('teclado') === 'aberto') {
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: { get height() { return window.innerHeight - ALTURA_DO_TECLADO }, offsetTop: 0, addEventListener() {}, removeEventListener() {} } })
}
const SINTESE_DE_EXEMPLO = { before: 'Você voltou duas vezes ao mesmo ponto: Judá vendeu José e agora se oferece como fiador de Benjamim. A pregação era sobre fome e escassez, mas o que você anotou foi', highlight: 'a mudança de um homem ao longo de vinte anos de espera', after: '' }
function anotacoesDeExemplo() {
  const criada = new Date(2025, 8, 2, 20, 14).toISOString()
  const exemplo = {
    id: 'sermon-espera', date: '2025-09-02', createdAt: criada, updatedAt: criada,
    noteType: params.get('tipo') === 'livre' ? 'free' : 'sermon', title: params.get('nota') === 'semtitulo' ? '' : 'A espera que forma', preacher: 'Pr. João Ribeiro', church: '', link: '',
    passages: [{ book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 3, verseEnd: 3 }, { book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 9, verseEnd: 9 }, { book: 'Romanos', bookEn: 'Romans', chapter: 8, verseStart: 25, verseEnd: 25 }],
    body: [
      { id: 'seg-1', type: 'text', text: 'Judá é o mesmo que vendeu José. Agora é ele que se oferece como fiador de Benjamim — a espera não passou em vão para ninguém nessa família.' },
      { id: 'seg-2', type: 'quote', text: "O homem nos advertiu seriamente: 'Não voltem à minha presença, a menos que tragam o seu irmão'.", ref: 'Gênesis 43:3', book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 3, verseEnd: 3 },
      { id: 'seg-3', type: 'topic', text: 'A fome que obriga a voltar' },
      { id: 'seg-4', type: 'topic', text: 'O irmão que precisa ser entregue' },
      { id: 'seg-5', type: 'topic', text: 'A garantia que alguém oferece com o próprio nome' },
      { id: 'seg-6', type: 'text', text: 'Perguntar depois: por que Jacó demora tanto a ceder' },
    ],
    text: '', topics: [], durationSeconds: 1440, finalizedAt: null, groupId: null,
    tags: ['espera', 'família'], sharedGroupIds: params.get('grupo') === 'escolhido' ? ['g1'] : [],
  }
  // A anotação guardada da captura N5: 412 palavras, três pontos, três
  // passagens, 24 minutos. `&guardada=curta` (menos de 40 palavras: sem
  // síntese) · `semtopicos` · `sempassagens` · `minima` (só um texto curto,
  // sem tempo: nenhum cartão) · `&sintese=guardada` (já no registro).
  const como = params.get('guardada') ?? 'completa'
  const frases = ['Judá é o mesmo que vendeu José por vinte moedas.', 'Agora é ele que se oferece como fiador de Benjamim diante do pai.', 'A fome obrigou a família a voltar ao Egito, mas quem volta não é o mesmo homem.', 'Vinte anos de espera mudaram o que ele faz quando o irmão mais novo está em risco.', 'A espera não passou em vão para ninguém nessa família.']
  const corrido = n => { const palavras = []; for (let i = 0; palavras.length < n; i++) palavras.push(...frases[i % frases.length].split(' ')); return palavras.slice(0, n).join(' ') }
  const pontos = como === 'semtopicos' || como === 'minima' ? [] : [{ id: 'g-3', type: 'topic', text: 'A fome que obriga a voltar' }, { id: 'g-4', type: 'topic', text: 'O irmão que precisa ser entregue' }, { id: 'g-5', type: 'topic', text: 'A garantia que alguém oferece com o próprio nome' }]
  const passagens = como === 'sempassagens' || como === 'minima' ? [] : [{ book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 3, verseEnd: 3 }, { book: 'Gênesis', bookEn: 'Genesis', chapter: 41, verseStart: 51, verseEnd: 51 }, { book: 'Tiago', bookEn: 'James', chapter: 1, verseStart: 3, verseEnd: 4 }]
  const texto = corrido(como === 'curta' || como === 'minima' ? 18 : 412 - pontos.reduce((n, p) => n + p.text.split(' ').length, 0))
  const guardada = {
    ...exemplo, id: 'sermon-guardada', noteType: 'sermon', title: params.get('nota') === 'semtitulo' ? '' : 'A espera que forma', finalizedAt: new Date(2025, 8, 2, 21, 0).toISOString(),
    passages: passagens, durationSeconds: como === 'minima' ? 0 : 1440, tags: como === 'minima' ? [] : ['espera', 'família'],
    body: [{ id: 'g-1', type: 'text', text: texto }, ...(passagens.length ? [{ id: 'g-2', type: 'quote', text: "O homem nos advertiu seriamente: 'Não voltem à minha presença, a menos que tragam o seu irmão'.", ref: 'Gênesis 43:3', book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 3, verseEnd: 3 }] : []), ...pontos],
  }
  if (params.get('sintese') === 'guardada') guardada.summary = { ...SINTESE_DE_EXEMPLO, of: wordsFingerprint(guardada) }
  const antiga = { id: 'sermon-antiga', date: '2026-03-08', createdAt: '2026-03-08T13:00:00.000Z', title: 'Culto de domingo', preacher: 'Pr. João Silva', church: 'Igreja Batista Central', passages: [{ book: 'Salmos', bookEn: 'Psalms', chapter: 23, verseStart: 1, verseEnd: 1 }], text: 'O Senhor é o meu pastor.\n\nAnotei à mão e passei para cá depois: nada me faltará quer dizer que ele basta.', finalizedAt: '2026-03-08T14:00:00.000Z' }
  return [exemplo, guardada, antiga, { id: 'sermon-outra', noteType: params.get('tipos') === 'proprios' ? 'retiro' : 'service', title: 'Retiro de casais', preacher: 'Pra. Ana Reis', church: 'Comunidade da Graça', text: 'Um fim de semana fora.', tags: ['família'], finalizedAt: '2026-05-01T14:00:00.000Z', createdAt: '2026-05-01T10:00:00.000Z' }]
}
const guardaDeAnotacoes = (() => {
  const persistir = params.get('persistir') === 'sim'
  let lista = null
  return {
    ler() {
      if (lista) return lista
      const salvo = persistir ? sessionStorage.getItem('jc_dev_anotar') : null
      lista = salvo ? JSON.parse(salvo) : anotacoesDeExemplo()
      return lista
    },
    gravar(nova) {
      lista = nova
      if (persistir) sessionStorage.setItem('jc_dev_anotar', JSON.stringify(nova))
      window.__anotacoesGravadas = nova
    },
  }
})()
// As marcações da pré-visualização. Na página de anotação (tela=anotar),
// só as etiquetas importam; na nota de versículo (tela=nota), são as da
// captura N4: a nota de Salmos 23:4 e mais duas, com as etiquetas medo,
// consolo e salmos.
function marcacoesDeExemplo() {
  if (tela !== 'nota') return [{ id: 'h1', tags: ['espera', 'perdão'] }, { id: 'h2', tags: ['espera', 'família'] }, { id: 'h3', tags: ['espera'] }]
  const base = { book: 'Salmos', bookEn: 'Psalms', chapter: 23, color: 'yellow', sharedGroupIds: [], createdAt: '2026-11-03T10:00:00.000Z', date: '2026-11-03', sessionMode: 'browse' }
  return [
    { ...base, id: 'hl-vale', kind: 'note', verses: [4], text: 'O vale é passagem, não endereço. Ele não tira o vale — anda comigo dentro dele', tags: ['medo'], sharedGroupIds: params.get('grupo') === 'escolhido' ? ['g1'] : [] },
    { ...base, id: 'hl-pastor', verses: [1], text: '', color: 'green', tags: ['medo', 'consolo'] },
    { ...base, id: 'hl-mesa', kind: 'note', verses: [5], text: 'Mesa posta na frente de quem me quer mal.', tags: ['medo', 'consolo', 'salmos'] },
    { ...base, id: 'hl-agua', verses: [2], text: 'Descanso não é prêmio, é caminho.', color: 'blue', tags: [] },
  ]
}
const guardaDeMarcacoes = (() => {
  const persistir = params.get('persistir') === 'sim'
  let lista = null
  return {
    ler() {
      if (lista) return lista
      const salvo = persistir ? sessionStorage.getItem('jc_dev_marcacoes') : null
      lista = salvo ? JSON.parse(salvo) : marcacoesDeExemplo()
      return lista
    },
    gravar(nova) {
      lista = nova
      if (persistir) sessionStorage.setItem('jc_dev_marcacoes', JSON.stringify(nova))
      window.__marcacoesGravadas = nova
      return nova
    },
  }
})()
const comRede = fazer => new Promise((resolve, reject) => setTimeout(() => {
  if (params.get('rede') === 'fora' || window.__semRede) reject(new Error('sem rede (pré-visualização)'))
  else resolve(fazer())
}, 300))
const anotarDePreview = {
  load() {
    if (estado === 'carregando') return new Promise(() => {})
    if (estado === 'erro') return Promise.reject(new Error('sem rede (pré-visualização)'))
    return new Promise(resolve => setTimeout(() => resolve({ owner: 'preview', sermonNotes: tela === 'nota' ? [] : guardaDeAnotacoes.ler(), highlights: guardaDeMarcacoes.ler() }), 120))
  },
  createVerseNote: record => comRede(() => guardaDeMarcacoes.gravar([...guardaDeMarcacoes.ler(), record])),
  updateVerseNote: (id, { text, tags, sharedGroupIds }) => comRede(() => guardaDeMarcacoes.gravar(guardaDeMarcacoes.ler().map(h => (h.id === id ? { ...h, text, tags: tags ?? h.tags ?? [], sharedGroupIds: sharedGroupIds ?? h.sharedGroupIds ?? [], updatedAt: new Date().toISOString() } : h)))),
  setVerseNoteVerses: (id, verses) => comRede(() => guardaDeMarcacoes.gravar(guardaDeMarcacoes.ler().map(h => (h.id === id ? { ...h, verses } : h)))),
  hideVerseNote: id => comRede(() => guardaDeMarcacoes.gravar(guardaDeMarcacoes.ler().map(h => (h.id === id ? { ...h, hidden: true } : h)))),
  // `&grupo=falha`: a publicação falha. Devolve o id, como o app.
  async publish(groupId, post) {
    if (params.get('grupo') === 'falha') throw new Error('sem rede (pré-visualização)')
    const id = `post-${(window.__publicacoes ??= []).length + 1}`
    window.__publicacoes.push({ id, groupId, ...post })
    return id
  },
  async unpublish(postId) { window.__publicacoes = (window.__publicacoes ?? []).filter(p => p.id !== postId); (window.__desfeitas ??= []).push(postId) },
  // `&sintese=lenta|erro`: a síntese demora ou falha.
  summarize(words) {
    window.__sintesesPedidas = (window.__sintesesPedidas ?? 0) + 1
    window.__palavrasDaSintese = words
    const como = params.get('sintese')
    if (como === 'lenta') return new Promise(() => {})
    return new Promise((resolve, reject) => setTimeout(() => (como === 'erro' ? reject(new Error('sem rede (pré-visualização)')) : resolve(SINTESE_DE_EXEMPLO)), 500))
  },
  markPassages: records => comRede(() => guardaDeMarcacoes.gravar([...guardaDeMarcacoes.ler(), ...records])),
  keepLocalNote, readLocalNote, clearLocalNote,
  save(note) {
    return new Promise((resolve, reject) => setTimeout(() => {
      if (params.get('rede') === 'fora' || window.__semRede) { reject(new Error('sem rede (pré-visualização)')); return }
      guardaDeAnotacoes.gravar([note, ...guardaDeAnotacoes.ler().filter(n => n.id !== note.id)])
      resolve()
    }, 300))
  },
  async remove(id) { guardaDeAnotacoes.gravar(guardaDeAnotacoes.ler().filter(n => n.id !== id)) },
  keepLocal: keepLocalDraft, readLocal: readLocalDraft, clearLocal: clearLocalDraft,
  async chapterVerses(book, chapter) {
    const n = verseCount(book, chapter)
    const verses = Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i + 1), `Texto do versículo ${i + 1} de ${book} ${chapter}, na versão em uso.`]))
    if (book === 'Gênesis' && chapter === 43) verses['3'] = "Judá, porém, disse: “O homem nos advertiu seriamente: ‘Não voltem à minha presença, a menos que tragam o seu irmão’."
    if (book === 'Salmos' && chapter === 23) { verses['4'] = 'Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum, pois tu estás comigo.'; verses['5'] = 'Preparas um banquete para mim na presença de meus inimigos.' }
    if (book === 'Tiago' && chapter === 1) { verses['3'] = 'pois vocês sabem que, quando sua fé é provada, a perseverança tem a oportunidade de crescer.'; verses['4'] = 'E é necessário que ela cresça, pois quando estiver plenamente desenvolvida vocês serão maduros e completos, sem que nada lhes falte.' }
    return verses
  },
  versionShort: () => 'NVT',
  async memberCounts() { return tela === 'nota' ? { g1: 6, g2: 12, g3: 1 } : { g1: 6, g2: 8, g3: 1 } },
}
const gruposDeAnotar = [{ groupId: 'g1', name: 'Grupo Semente' }, { groupId: 'g2', name: tela === 'nota' ? 'Batista Central' : 'Manhã com a Palavra' }, { groupId: 'g3', name: 'Família Almeida de Souza e agregados' }].slice(0, Number(params.get('grupos') ?? 2))
function AnotarPreview() {
  const nota = params.get('nota') ?? 'exemplo'
  const target = nota === 'nova' ? { fresh: true, type: 'free' } : nota === 'pregacao' ? { fresh: true, type: 'sermon' } : nota === 'rascunho' ? {} : nota === 'guardada' ? { noteId: 'sermon-guardada', saved: true } : nota === 'sumiu' ? { noteId: 'sermon-nao-existe', saved: true } : { noteId: nota === 'antiga' ? 'sermon-antiga' : 'sermon-espera' }
  const [fechada, setFechada] = useState(false)
  if (fechada) return <div style={{ padding: 24, fontFamily: 'var(--font-bento)', fontSize: 14, color: 'var(--bento-ink)' }} data-anotar-fechada>Fechou: volta para de onde veio.</div>
  return (
    <>
      <PaginaDeAnotacao
        lang={session.lang} api={anotarDePreview} target={{ ...target, details: params.get('detalhes') }} groups={gruposDeAnotar}
        onClose={() => setFechada(true)}
        onOpenBiblePassage={(book, chapter, verse) => alert(`abrir a Bíblia em ${book} ${chapter}${verse ? `:${verse}` : ''}`)}
      />
      {params.get('teclado') === 'aberto' && <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: ALTURA_DO_TECLADO, background: '#D1D3D9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: '#6E655C', zIndex: 50 }}>teclado</div>}
    </>
  )
}

// A nota em um versículo (N4, handoff-biblioteca-55 §7A.4), com as
// marcações na memória. `&nota=exemplo` (a da captura, Salmos 23:4) ·
// `nova` (o versículo 3, ainda sem nada) · `marcacao` (o versículo 1, já
// marcado, sem nota) · `comnota` (o versículo 2, marcação com nota) ·
// `escolher` (o seletor antes, como pela folha "Nova") · `sumiu`.
// `&grupos=0|2|3` e `&grupo=escolhido` (uma nota já compartilhada).
// `&teclado=aberto` · `&rede=fora` · `&persistir=sim` · `&estado=carregando|erro`.
function NotaPreview() {
  const nota = params.get('nota') ?? 'exemplo'
  const [fechada, setFechada] = useState(false)
  if (fechada) return <div style={{ padding: 24, fontFamily: 'var(--font-bento)', fontSize: 14, color: 'var(--bento-ink)' }} data-nota-fechada>Fechou: volta para de onde veio.</div>
  const alvo = nota === 'nova' ? { reference: { book: 'Salmos', bookEn: 'Psalms', chapter: 23, verses: [3] } }
    : nota === 'escolher' ? {}
      : { highlightId: nota === 'marcacao' ? 'hl-pastor' : nota === 'comnota' ? 'hl-agua' : nota === 'sumiu' ? 'hl-nao-existe' : 'hl-vale' }
  return (
    <>
      <NotaDeVersiculoScreen lang={session.lang} api={anotarDePreview} groups={gruposDeAnotar} {...alvo} onHighlights={lista => { window.__marcacoesNaLeitura = lista }} onClose={() => setFechada(true)} />
      {params.get('teclado') === 'aberto' && <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: ALTURA_DO_TECLADO, background: '#D1D3D9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: '#6E655C', zIndex: 50 }}>teclado</div>}
    </>
  )
}

// "Meus estudos" na tela Estudos, na memória: o que publiquei no banco e
// os convites de amigos. Apagar um guardado usa a conta de exemplo de
// verdade (a linha de convidado).
const meusEstudosDePreview = (() => {
  const exemplo = tela === 'estudos' && params.get('meus') === 'exemplo'
  const passagens = [{ book: 'Rute', chapter: 1, verseStart: 1, verseEnd: 22 }]
  let publicados = exemplo ? [
    { id: 'pub-1', title: 'Esperar sem desistir', visibility: 'public', usesCount: 12, passages: passagens },
    { id: 'pub-2', title: 'Salmos para noites difíceis', visibility: 'invited', usesCount: 1, passages: passagens },
    { id: 'pub-3', title: 'Tiago na prática', visibility: 'public', usesCount: 0, passages: passagens },
  ] : []
  let convites = exemplo ? [
    { status: 'invited', study: { id: 'conv-1', title: 'Rute: fidelidade no comum', authorName: 'Marina', overview: '', format: 'book', passages: passagens } },
    { status: 'accepted', study: { id: 'conv-2', title: 'O Pai nosso, frase por frase', authorName: 'Pr. João Silva', overview: '', format: 'thematic', passages: passagens } },
  ] : []
  const rede = fazer => new Promise((resolve, reject) => setTimeout(() => (params.get('rede') === 'fora' ? reject(new Error('sem rede (pré-visualização)')) : resolve(fazer())), 200))
  return {
    published: async () => publicados,
    invites: async () => convites,
    withdraw: id => rede(() => { publicados = publicados.filter(e => e.id !== id); (window.__estudosRetirados ??= []).push(id) }),
    acceptInvite: id => rede(() => { convites = convites.map(c => (c.study.id === id ? { ...c, status: 'accepted' } : c)); (window.__convitesAceitos ??= []).push(id) }),
    remove: entry => rede(() => meusEstudosApi.remove(entry)),
  }
})()

// Sua Bíblia com "Reiniciar a leitura do zero" de verdade sobre os dados
// locais do preview (restartReading grava na linha de convidado). A senha
// é de mentira: "certa123" confere; &senha=nao simula a conta sem senha
// (Google/Apple); &rede=fora faz a conferência falhar; &gravar=falha faz o
// reinício falhar depois da senha certa.
const restartAuthDePreview = {
  hasPassword: async () => params.get('senha') !== 'nao',
  check: async senha => {
    await new Promise(r => setTimeout(r, 250))
    if (params.get('rede') === 'fora') throw new Error('unavailable')
    return senha === 'certa123'
  },
}
function SuaBibliaPreview({ onBack }) {
  const [done, setDone] = useState(completedSet)
  return (
    <SuaBibliaScreen
      session={session} authUser={authUser} completedSet={done} onBack={onBack} onOpenBook={nome => alert(`abrir ${nome} na Bíblia`)}
      restartAuth={restartAuthDePreview}
      onRestartReading={async extras => {
        if (params.get('gravar') === 'falha') throw new Error('sem rede')
        await restartReading(extras)
        setDone(new Set())
      }}
    />
  )
}

// A raiz da Comunidade com dados de exemplo na memória: responder a um
// convite tira a linha, entrar com código e enviar foto respondem como o
// app (a foto é recortada de verdade; o envio é de mentira).
const pessoas = ['Marina Costa', 'Rafael Souza', 'Ana Ribeiro', 'Tiago Lima', 'Júlia Almeida']
const gruposDeExemplo = [
  { groupId: 'g1', name: 'Grupo Semente', myRole: 'member', readingMode: 'shared' },
  { groupId: 'g2', name: 'Família Almeida', myRole: 'moderator', readingMode: 'individual' },
  { groupId: 'g3', name: 'Manhã com a Palavra', myRole: 'member', readingMode: 'individual' },
  { groupId: 'g4', name: 'Jovens da Central', myRole: 'member', readingMode: 'shared' },
  { groupId: 'g5', name: 'Casais', myRole: 'member', readingMode: 'individual' },
  { groupId: 'g6', name: 'Discipulado', myRole: 'moderator', readingMode: 'shared' },
]
function ComunidadePreview() {
  const n = (k, padrao) => Number(params.get(k) ?? padrao)
  const groups = gruposDeExemplo.slice(0, n('grupos', 3))
  const novas = n('novas', 4)
  const [avatarUrl, setAvatarUrl] = useState(params.get('foto') === 'sim' ? 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#7A4A1E"/><circle cx="32" cy="26" r="12" fill="#E6DACB"/><rect x="12" y="42" width="40" height="30" rx="14" fill="#E6DACB"/></svg>') : null)
  const [espera, setEspera] = useState(n('espera', 2) === 0 ? { planos: [], convites: [], pedidos: [] } : {
    planos: n('espera', 2) >= 3 ? [{ planId: 'p1', book: 'Marcos', bookEn: 'Mark', groupName: 'Grupo Semente' }] : [],
    convites: [{ groupId: 'g9', groupName: 'Batista Central', invitedByName: 'Rafael' }],
    pedidos: [{ friendshipId: 'f9', name: 'Lucas Mendes', avatarUrl: null }],
  })
  return (
    <ComunidadeRaiz
      session={{ ...session, weeksInGoal: 18, weeklyGoalDays: 4, biblePercent: 4.2, dailyRoutine: { '2026-03-14': {}, '2026-11-10': {} } }}
      authUser={{ ...authUser, name: 'Diego' }} avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl}
      photoApi={{ prepare: squareAvatarBlob, upload: async blob => { await new Promise(r => setTimeout(r, 400)); if (params.get('envio') === 'falha') throw new Error('sem rede'); window.__fotoEnviada = { tipo: blob.type, bytes: blob.size }; return URL.createObjectURL(blob) } }}
      loaded={params.get('carregando') !== 'sim'} groups={groups} memberCounts={{ g1: 12, g2: 6, g3: 8, g4: 1, g5: 14, g6: 3 }}
      messagesSummary={novas === 0 ? [] : novas === 1 ? [{ groupId: 'g1', unreadCount: 1 }] : [{ groupId: 'g1', unreadCount: 3 }, { groupId: 'g2', unreadCount: 1 }]}
      messages={params.get('trecho') === 'nao' ? [] : [{ isRead: false, locked: false, body: 'Nunca tinha reparado que Nicodemos vem de noite e sai sem resposta pronta.', authorName: 'Marina', groupName: 'Grupo Semente', kind: 'sala_capitulo', contextBook: 'João', contextChapter: 3 }]}
      planInvites={espera.planos} groupInvites={espera.convites} friendRequests={espera.pedidos}
      friends={pessoas.slice(0, n('amigos', 5)).map((name, i) => ({ friendshipId: `f${i}`, name, avatarUrl: null }))}
      onOpenMessages={() => alert('abrir Mensagens')} onOpenProfile={() => alert('abrir Meu perfil')} onOpenGroup={id => alert(`abrir o grupo ${id}`)}
      onOpenFriends={() => alert('abrir Amigos')} onCreateGroup={() => alert('abrir Criar um grupo')}
      onJoinWithCode={async code => { await new Promise(r => setTimeout(r, 300)); if (code.trim().toUpperCase() === 'BC-4271') return 'Batista Central'; throw new Error(code.trim().toUpperCase() === 'JA' ? 'already_in_group' : code.trim() === 'rede' ? 'Failed to fetch' : 'invalid_code') }}
      onAnswer={async (item, accept) => {
        await new Promise(r => setTimeout(r, 250))
        if (params.get('responder') === 'falha') throw new Error('sem rede')
        window.__respostas = [...(window.__respostas ?? []), `${item.kind}:${item.ref}:${accept ? 'sim' : 'nao'}`]
        setEspera(e => ({ planos: e.planos.filter(p => p.planId !== item.ref), convites: e.convites.filter(c => c.groupId !== item.ref), pedidos: e.pedidos.filter(p => p.friendshipId !== item.ref) }))
      }}
    />
  )
}

// As telas de dentro do grupo (Desafio, Oração, Conversa, Pessoas) com
// dados na memória: o que a pessoa faz aparece na hora, como no app.
// `window.__chamadas` guarda o que foi "gravado".
function ParteDoGrupoPreview({ ver }) {
  const moderador = params.get('moderador') !== 'nao'
  const vazio = params.get('vazio') === 'sim'
  const fora = params.get('rede') === 'fora'
  const haPouco = h => new Date(Date.now() - h * 3600000).toISOString()
  const gravar = async (nome, ...dados) => { await new Promise(r => setTimeout(r, 200)); if (fora) throw new Error('sem rede'); window.__chamadas = [...(window.__chamadas ?? []), [nome, ...dados].join(':')] }
  const chaves = n => Array.from({ length: n }, (_, i) => `Marcos:${i + 1}`)
  const membros = ['Marina Costa', 'Rafael Souza', 'Ana Ribeiro', 'Tiago Lima', 'Júlia Almeida', 'Diego'].map((name, i) => ({ userId: `u${i}`, name, role: i === 1 || (i === 5 && moderador) ? 'moderator' : 'member' }))
  const [membrosAgora, setMembros] = useState(membros)
  const banco = useState(() => ({ desafios: vazio ? [] : [
    { id: 'd1', active: true, name: 'Maratona de Marcos', description: '', books: ['Marcos'], startsAt: haPouco(96), endsAt: new Date(Date.now() + 6.5 * 86400000).toISOString(), createdByName: 'Rafael' },
    { id: 'd2', active: false, manuallyCompleted: true, name: 'Salmos em 30 dias', books: ['Salmos'], startsAt: haPouco(1500), endsAt: haPouco(700), createdByName: 'Ana' },
    { id: 'd3', active: false, manuallyCompleted: false, name: '', books: ['Tiago'], startsAt: haPouco(2500), endsAt: haPouco(1900), createdByName: 'Ana' },
  ],
  placares: { d1: [['u5', 'Diego', 10], ['u0', 'Marina Costa', 16], ['u2', 'Ana Ribeiro', 7], ['u1', 'Rafael Souza', 12], ['u3', 'Tiago Lima', 3], ['u4', 'Júlia Almeida', 1]], d2: [['u0', 'Marina', 150], ['u1', 'Rafael', 150], ['u2', 'Ana', 20]], d3: [] },
  pedidos: vazio ? [] : [
    { id: 'p1', status: 'open', body: 'Pela cirurgia da minha mãe na quinta. Que ela fique em paz.', authorName: 'Ana', anonymous: false, isMine: false, prayingByMe: false, prayedEver: false, prayCount: 4, createdAt: haPouco(2) },
    { id: 'p2', status: 'open', body: 'Estou sem emprego há quatro meses. Peço direção e calma para a minha casa.', authorName: '', anonymous: true, isMine: false, prayingByMe: true, prayedEver: true, prayCount: 9, createdAt: haPouco(30) },
    { id: 'p3', status: 'open', body: 'Pela prova do meu filho no sábado.', authorName: 'Diego', isMine: true, prayCount: 1, createdAt: haPouco(80) },
    { id: 'p4', status: 'closed', body: 'Pelo exame da Júlia', authorName: 'Júlia', prayCount: 3, createdAt: haPouco(700) },
  ],
  recados: vazio ? [] : [
    { id: 'c1', userId: 'u5', authorName: 'Diego', body: 'Terminei Gênesis hoje. Obrigado por não me deixarem parar em José.', createdAt: haPouco(72), pinned: false, likeCount: 7, likedByMe: false },
    { id: 'c2', userId: 'u0', authorName: 'Marina Costa', body: 'Alguém mais ficou preso em Levítico? Queria uma dica de como não parar ali.', createdAt: haPouco(48), pinned: false, likeCount: 1, likedByMe: false },
    { id: 'c3', userId: 'u1', authorName: 'Rafael Souza', body: 'Li João 3 de novo depois da sala. “Nascer de novo” ficou outra coisa pra mim.', createdAt: haPouco(26), pinned: false, likeCount: 5, likedByMe: true },
    { id: 'c4', userId: 'u9', authorName: 'Saiu', anonymous: true, body: 'Recado de quem saiu do grupo.', createdAt: haPouco(300), pinned: true, pinnedAt: haPouco(200), likeCount: 0, likedByMe: false },
  ] }))[0]
  const comum = { lang: 'pt', groupId: 'g1', groupName: 'Grupo Semente', myUserId: 'u5', isModerator: moderador, onBack: () => alert('voltar para o grupo') }
  if (ver === 'desafio') return (
    <GrupoDesafio
      {...comum} chapterCounts={{ Marcos: 16, Salmos: 150, Tiago: 5 }} blocks={BIBLE_BLOCKS} onOpenBible={(livro, cap) => alert(`abrir a Bíblia em ${livro} ${cap}`)}
      api={{
        list: async () => banco.desafios, board: async id => banco.placares[id].map(([userId, name, n], i) => ({ userId, name, completedKeys: chaves(n), joinedAt: haPouco(90 - i) })),
        complete: async id => { await gravar('concluir', id); banco.desafios = banco.desafios.map(x => (x.id === id ? { ...x, active: false, manuallyCompleted: true } : x)) },
        create: async (grupo, livros, fim, nome, frase) => { await gravar('criar', nome, livros.join('+'), frase); banco.placares.novo = []; banco.desafios = [{ id: 'novo', active: true, name: nome, description: frase, books: livros, startsAt: new Date().toISOString(), endsAt: fim, createdByName: 'Diego' }, ...banco.desafios] },
      }}
    />
  )
  if (ver === 'oracao') return (
    <GrupoOracao
      {...comum} authUser={authUser} hasAI={false} startWriting={params.get('escrever') === 'sim'}
      api={{
        list: async () => { if (fora && window.__carregou) throw new Error('sem rede'); window.__carregou = true; return banco.pedidos },
        pray: r => gravar('orei', r.id),
        close: async id => { await gravar('encerrar', id); banco.pedidos = banco.pedidos.map(x => (x.id === id ? { ...x, status: 'closed' } : x)) },
        remove: async id => { await gravar('apagar', id); banco.pedidos = banco.pedidos.filter(x => x.id !== id) },
      }}
    />
  )
  if (ver === 'conversa') return (
    <GrupoConversa
      {...comum} members={membrosAgora} pinnedNotice={params.get('aviso') === 'nao' ? '' : 'Encontro presencial no sábado, 16h, na casa da Ana. Levem a Bíblia.'}
      api={{
        list: async () => banco.recados,
        post: async (grupo, texto) => { await gravar('publicar', texto); banco.recados = [...banco.recados, { id: `n${banco.recados.length}`, userId: 'u5', authorName: 'Diego', body: texto.trim(), createdAt: new Date().toISOString(), pinned: false, likeCount: 0, likedByMe: false }] },
        remove: async id => { await gravar('apagar', id); banco.recados = banco.recados.filter(x => x.id !== id) },
        like: id => gravar('curtir', id),
        pin: async (id, fixar) => { await gravar(fixar ? 'fixar' : 'desafixar', id); banco.recados = banco.recados.map(x => (x.id === id ? { ...x, pinned: fixar, pinnedAt: fixar ? new Date().toISOString() : null } : x)) },
        report: d => gravar('denunciar', d.messageId, d.reason),
      }}
    />
  )
  return (
    <GrupoPessoas
      {...comum} members={membrosAgora} focusInvite={params.get('convidar') === 'sim'} onChange={() => {}}
      api={{
        friends: async () => (params.get('amigos') === '0' ? [] : [{ userId: 'u0', name: 'Marina Costa' }, { userId: 'x1', name: 'Pedro Nunes' }, { userId: 'x2', name: 'Carla Dias' }].slice(0, params.get('amigos') === 'dentro' ? 1 : 3)),
        setRole: async (grupo, id, papel) => { await gravar('papel', id, papel); setMembros(l => l.map(m => (m.userId === id ? { ...m, role: papel } : m))) },
        invite: (grupo, id) => gravar('convidar', id),
      }}
    />
  )
}

// A tela de Amigos com dados na memória (aceitar, adicionar e procurar
// respondem como o app). Procurar "ana" ou um e-mail envia; "ninguem" não acha.
function AmigosPreview() {
  const fora = params.get('rede') === 'fora'
  const gravar = async (nome, ...dados) => { await new Promise(r => setTimeout(r, 200)); if (fora) throw new Error('sem rede'); window.__chamadas = [...(window.__chamadas ?? []), [nome, ...dados].join(':')] }
  const banco = useState(() => ({
    amigos: params.get('amigos') === '0' ? [] : ['Marina Costa', 'Rafael Souza', 'Ana Ribeiro', 'Tiago Lima', 'Júlia Almeida'].map((name, i) => ({ friendshipId: `f${i}`, userId: `u${i}`, name, avatarUrl: null })),
    pedidos: params.get('pedidos') === '0' ? [] : [{ friendshipId: 'f9', userId: 'x9', name: 'Lucas Mendes', avatarUrl: null }],
  }))[0]
  const lido = n => Array.from({ length: n }, (_, i) => `Gênesis:${i + 1}`)
  return (
    <AddFriendsScreen
      session={{ ...session, lang: 'pt' }} authUser={{ ...authUser, id: 'eu', name: 'Diego' }} onBack={() => alert('voltar para a Comunidade')} onChange={() => {}}
      api={{
        friends: async () => banco.amigos, pending: async () => banco.pedidos,
        groups: async () => (params.get('grupos') === 'nao' ? [] : [{ name: 'Grupo Semente', members: [{ userId: 'eu', name: 'Diego' }, { userId: 'u0', name: 'Marina Costa' }, { userId: 'x9', name: 'Lucas Mendes' }, { userId: 'x1', name: 'Pedro Nunes' }] }, { name: 'Família Almeida', members: [{ userId: 'x2', name: 'Carla Dias' }] }]),
        summary: async id => { await new Promise(r => setTimeout(r, 150)); return id === 'u2' ? { isPublic: false } : { isPublic: true, completedKeys: lido(id === 'u0' ? 50 : 12), planId: 'standard' } },
        respond: async (id, aceitar) => { await gravar('responder', id, aceitar ? 'sim' : 'nao'); const req = banco.pedidos.find(p => p.friendshipId === id); banco.pedidos = banco.pedidos.filter(p => p.friendshipId !== id); if (aceitar) banco.amigos = [...banco.amigos, { ...req }] },
        requestByEmail: v => gravar('email', v),
        requestByUsername: async v => { if (v === 'ninguem') throw new Error('username_not_found'); await gravar('usuario', v) },
        requestByUserId: v => gravar('adicionar', v), remove: v => gravar('desfazer', v),
        inviteLink: async () => 'https://exemplo.app/d/diego',
      }}
    />
  )
}

// A tela de um grupo com dados de exemplo; "Sair do grupo" abre a folha de
// confirmação de verdade.
function GrupoPreview() {
  const [saindo, setSaindo] = useState(false)
  const haPouco = h => new Date(Date.now() - h * 3600000).toISOString()
  const pedido = params.get('pedido') ?? 'outro'
  const pedidos = pedido === 'nenhum' ? [{ id: 'pf', status: 'closed', body: 'Antigo', authorName: 'Ana', createdAt: haPouco(400), prayCount: 2 }] : [
    { id: 'p1', status: 'open', body: 'Pela cirurgia da minha mãe na quinta. Que ela fique em paz.', authorName: 'Ana', anonymous: false, isMine: pedido === 'meu', prayingByMe: pedido === 'orei', prayedEver: pedido === 'orei', prayCount: 4, createdAt: haPouco(2) },
    { id: 'p2', status: 'open', body: 'Emprego', authorName: '', anonymous: true, prayCount: 9, createdAt: haPouco(30) },
    { id: 'p3', status: 'open', body: 'Prova', authorName: 'Eu', isMine: true, prayCount: 6, createdAt: haPouco(80) },
    { id: 'p4', status: 'closed', body: 'Exame', authorName: 'Júlia', prayCount: 3, createdAt: haPouco(700) },
  ]
  const recados = params.get('recado') === 'nenhum' ? [] : [...Array.from({ length: 11 }, (_, i) => ({ id: `c${i}`, authorName: 'Marina', body: 'Recado antigo', createdAt: haPouco(200 + i) })), { id: 'c99', authorName: 'Rafael', anonymous: false, body: 'Li João 3 de novo depois da sala. “Nascer de novo” ficou outra coisa pra mim.', createdAt: haPouco(26) }]
  const membros = ['Marina Costa', 'Rafael Souza', 'Ana Ribeiro', 'Tiago Lima', 'Júlia Almeida', 'Diego', 'Pedro', 'Carla', 'Lucas', 'Bia', 'Sara', 'Davi'].map((name, i) => ({ userId: `u${i}`, name, role: i < 2 ? 'moderator' : 'member' }))
  return (
    <>
      <GrupoInicio
        lang="pt" groupId="g1" groupName="Grupo Semente" readingMode="shared" members={membros}
        pinnedNotice={params.get('aviso') === 'nao' ? null : 'Encontro presencial no sábado, 16h.'}
        todaySession={params.get('leitura') === 'nao' ? { type: 'reflection', book: 'João' } : { book: 'João', bookEn: 'John', chStart: 3, chEnd: 4, type: 'reading' }}
        myUserId="u5" chapterCounts={{ Marcos: 16 }}
        api={{
          roomStats: async () => ({ members: 12, completed: 5 }),
          prayers: async () => pedidos, comments: async () => recados,
          challenges: async () => (params.get('desafio') === 'nao' ? [{ id: 'd0', active: false, name: 'Antigo', books: ['Marcos'] }] : [{ id: 'd1', active: true, name: 'Maratona de Marcos', books: ['Marcos'] }]),
          leaderboard: async () => [{ userId: 'u5', name: 'Diego', completedKeys: Array.from({ length: 10 }, (_, i) => `Marcos:${i + 1}`) }, { userId: 'u0', name: 'Marina', completedKeys: Array.from({ length: 16 }, (_, i) => `Marcos:${i + 1}`) }],
          pray: async () => { await new Promise(r => setTimeout(r, 300)); if (params.get('orar') === 'falha') throw new Error('sem rede'); window.__orei = (window.__orei ?? 0) + 1 },
        }}
        onBack={() => alert('voltar para a Comunidade')} onInvite={() => alert('convidar')} onOpen={parte => alert(`abrir: ${parte}`)} onWrite={parte => alert(`escrever: ${parte}`)}
        onOpenRoom={alvo => alert(`abrir a sala: ${alvo.group.name} · ${alvo.book} ${alvo.chapter}`)} onLeave={() => setSaindo(true)}
      />
      {saindo && (
        <FolhaDeConfirmacao
          lang="pt" title="Sair do Grupo Semente?" text="Você deixa de ver os recados, os pedidos de oração e a sala do capítulo deste grupo."
          keeps="Sua leitura, suas notas e seus amigos continuam com você. Para voltar, basta um novo convite."
          confirmLabel="Sair do grupo" cancelLabel="Ficar no grupo" onClose={() => setSaindo(false)}
          onConfirm={async () => { await new Promise(r => setTimeout(r, 350)); if (params.get('sair') === 'falha') throw new Error('sem rede'); setSaindo(false); alert('saiu do grupo') }}
        />
      )}
    </>
  )
}

// "Leitura da Bíblia" (35i) com a fila do plano de verdade: a ordem, os
// livros de "minha ordem" e o ponto de partida ficam na memória, e a faixa
// de cima mostra a sessão de hoje que sai deles — as mesmas contas de
// App.jsx (planQueue/findPlanSession). "Abrir a leitura" abre a leitura do
// plano nessa sessão; concluir marca os capítulos e volta.
const pontoDe = texto => {
  if (!texto) return null
  const [book, chapter] = texto.split(':')
  return { book, chapter: Number(chapter) }
}
function OrdemPreview() {
  const [done, setDone] = useState(completedSet)
  const [mode, setMode] = useState(params.get('ordem') ?? 'canonical')
  const [custom, setCustom] = useState(params.get('livros') ? params.get('livros').split(',') : null)
  const [position, setPosition] = useState({ start: pontoDe(params.get('partida')), free: pontoDe(params.get('livre')) })
  const [reading, setReading] = useState(params.get('abrir') === 'leitura' ? {} : null)
  const minutes = { prayer: 10, reading: 15, study: 15, reflection: 5 }
  const fixedQueue = planQueue('fixed', mode, custom, position)
  const fixed = deriveProgress(done, 'standard', 'ot_first', minutes.reading, splitPointsFor(fixedQueue.start))
  const chronoQueue = planQueue('chrono', mode, custom, position)
  const today = mode === 'chronological'
    ? findPlanSession({ ...deriveChronoProgress(done, 'standard', splitPointsFor(chronoQueue.start)), ...chronoQueue })
    : findPlanSession({ ...fixed, ...fixedQueue })
  const counts = computeBookChapterCounts(fixed.sessionsByBlock)
  const mark = (book, chapters, on) => setDone(prev => {
    const next = new Set(prev)
    for (const ch of chapters) { if (on) next.add(`${book}:${ch}`); else next.delete(`${book}:${ch}`) }
    return next
  })
  const saveMode = next => {
    if (next === 'free' && mode !== 'free') {
      const queue = mode === 'chronological' ? chronoQueue : fixedQueue
      setPosition(p => ({ ...p, free: resolveNextChapter(done, queue.bookOrder, counts, queue.start) }))
    }
    setMode(next)
  }
  const planSession = { ...session, bibleOrderMode: mode, planQueue: fixedQueue, planBooks: mode === 'custom' ? fixedQueue.bookOrder : null, activePlan: { kind: 'fixed' }, todaysSteps: ['prayer', 'reading', 'reflection'], todayRoutine: { prayer: true } }
  const faixa = (
    <div data-previa="plano" style={{ flexShrink: 0, padding: '6px 12px', background: '#222', color: '#fff', font: '600 11px/1.4 system-ui', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span data-previa="hoje">Sessão de hoje: {today.finished ? 'plano concluído' : today.session.title}</span>
      <span data-previa="lidos">Lidos: {done.size}</span>
      {mode !== 'chronological' && !reading && <button data-previa="abrir" onClick={() => setReading({})}>Abrir a leitura</button>}
      {reading && <button data-previa="fechar" onClick={() => setReading(null)}>Voltar aos ajustes</button>}
    </div>
  )
  if (reading) {
    const open = reading.blockId ? reading : { blockId: today.block.id, sessionId: today.session.id }
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {faixa}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <JourneyScreen
            session={planSession} authUser={authUser} stepMinutes={minutes} blocks={fixed.blocks} sessionsByBlock={fixed.sessionsByBlock} browseSessionsByBlock={deriveProgress(done, 'free').sessionsByBlock}
            completedSet={done} entryMode="reading" initialBlockId={open.blockId} resumeSessionId={open.sessionId}
            onMovePlan={(book, chapter, fromBlockId) => {
              setPosition(p => ({ ...p, free: { book, chapter } }))
              const target = sessionAt(deriveProgress(done, 'standard', 'ot_first', minutes.reading, splitPointsFor({ book, chapter })), book, chapter)
              if (target && target.block.id !== fromBlockId) setReading({ blockId: target.block.id, sessionId: target.session.id })
            }}
            onGoToReflectionFrom={() => setReading(null)} onExitReading={() => setReading(null)}
            onToggleSession={(sn, on) => mark(sn.book, sn.type === 'reflection' ? ['reflection'] : Array.from({ length: sn.chEnd - sn.chStart + 1 }, (_, i) => sn.chStart + i), on)}
            onToggleChapter={(sn, chapter, on) => mark(sn.book, [chapter], on)}
            onMarkChaptersManually={(book, chapters, on) => mark(book, chapters, on)} onOpenSelo={() => {}}
            onNavigate={t => alert(`navegar: ${t}`)} onContinueSession={() => {}}
            onOpenSuaBiblia={() => {}} onPastRootChange={() => {}} onCelebrateNow={() => Promise.resolve(false)}
            onOpenGroupRoom={() => {}} onOpenSermonNote={() => {}}
          />
        </div>
      </div>
    )
  }
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {faixa}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReadingOrganizeScreen
          session={planSession} completedSet={done} blocks={fixed.blocks} bookChapterCounts={counts} stepMinutes={minutes}
          bibleOrderMode={mode} customBookOrder={custom} planPosition={position} readingOrder="ot_first"
          onSaveBibleOrderMode={saveMode} onSaveCustomBookOrder={setCustom}
          onSetStartPosition={(book, chapter) => setPosition(p => (mode === 'free' ? { ...p, free: { book, chapter } } : { ...p, start: { book, chapter } }))}
          onNavigate={t => alert(`navegar: ${t}`)} onBack={() => alert('voltar')}
        />
      </div>
    </div>
  )
}

function Preview() {
  const [screen, setScreen] = useState(tela)
  const [bibliaPastRoot, setBibliaPastRoot] = useState(!!params.get('livro') || params.has('busca'))
  const [bibliotecaPastRoot, setBibliotecaPastRoot] = useState(!!params.get('tipo') || params.has('busca'))
  const [gami, setGami, gamiData] = useGamificationRow()
  const familia = params.get('familia') ?? 'constancia'
  const celebId = params.get('id') ?? 'tempo:2'
  const common = { session, authUser, completedSet }
  let body
  const livro = params.get('livro') ?? 'Jonas'
  const [draftState, setDraftState] = useState(null)
  if (screen === 'ordem') return <OrdemPreview />
  if (screen === 'amigos') return <div style={{ height: '100%' }}><AmigosPreview /><BottomNav activeTab="groups" onNavigate={t => alert(`aba: ${t}`)} lang="pt" /></div>
  if (screen === 'grupo') return <div style={{ height: '100%' }}>{params.get('ver') ? <ParteDoGrupoPreview ver={params.get('ver')} /> : <GrupoPreview />}<BottomNav activeTab="groups" onNavigate={t => alert(`aba: ${t}`)} lang="pt" /></div>
  if (screen === 'comunidade') return <div style={{ height: '100%', overflowY: 'auto' }}><ComunidadePreview /><BottomNav activeTab="groups" onNavigate={t => alert(`aba: ${t}`)} lang="pt" /></div>
  if (screen === 'estudos') {
    // A tela Estudos (35h) com o cabeçalho da Biblioteca; `&lupa=nao`: como
    // abre pelo Meu Plano. (Sem servidor aqui, as listas de fora ficam
    // vazias.) `&meus=exemplo`: as ações de "Meus estudos" — convites de
    // amigos, publicados por mim e estudos guardados; `&rede=fora`: as
    // ações falham.
    body = (
      <AddStudyScreen
        session={session} api={meusEstudosDePreview} onBack={() => alert('voltar')}
        onOpenSearch={params.get('lupa') === 'nao' ? null : () => alert('abrir a busca com "Estudos" selecionado')}
        onCreateStudy={() => alert('criar um estudo')} onChangeStudyDays={() => {}}
        onOpenPreview={estudo => alert(`abrir a prévia do estudo: ${estudo.title}${estudo.fromPublicBank ? ' (do banco)' : ''}`)}
        onOpenCatalogStudy={id => alert(`abrir o estudo do catálogo: ${id}`)}
        onOpenPublicBank={() => {}} onOpenStudyDetail={() => {}}
      />
    )
  } else if (screen === 'biblioteca') {
    body = <BibliotecaPreview onPastRootChange={setBibliotecaPastRoot} />
  } else if (screen === 'anotar') {
    body = <AnotarPreview />
  } else if (screen === 'nota') {
    body = <NotaPreview />
  } else if (screen === 'oracao') {
    body = <OracaoPreview />
  } else if (screen === 'reflexao') {
    body = <ReflexaoPreview />
  } else if (screen === 'dia') {
    body = <DiaPreview />
  } else if (screen === 'pedidos') {
    body = (
      <PrayerRequestsScreen
        session={{ ...session, hasAI: params.get('ia') !== 'nao' }} authUser={authUser} pedidosApi={pedidosDePreview} formApi={formDePreview} initialTab={params.get('aba') ?? 'ativos'}
        onBack={() => alert('voltar')} onOpenRequest={p => alert(`abrir o detalhe do pedido (comentários): ${p.body}`)}
        onOpenFamilia={id => alert(`abrir Minhas conquistas, família ${id}`)}
      />
    )
  } else if (screen === 'ajustar') {
    body = <AjustarPlanoScreen {...common} stepMinutes={{ prayer: 10, reading: 15, study: 10, reflection: 5 }} draftState={draftState} onDraftChange={setDraftState} onClearDraft={() => setDraftState(null)} onSave={async () => { await new Promise(r => setTimeout(r, 800)) }} onBack={() => setScreen('meuPlano')} onNavigate={t => alert(`navegar: ${t}`)} initialOpenStep={params.get('abrir')} scrollToDays={!!params.get('abrir')} />
  } else if (screen === 'seuPlano') {
    body = <SeuPlanoScreen {...common} stepMinutes={{ prayer: 10, reading: 15, study: 10, reflection: 5 }} onBack={() => setScreen('meuPlano')} onNavigate={t => alert(`navegar: ${t}`)} onChangeDays={() => alert('Ajustar com a Leitura aberta')} />
  } else if (screen === 'meuPlano') {
    body = <MeuPlanoScreen {...common} stepMinutes={{ prayer: 10, reading: 15, study: 10, reflection: 5 }} onStartGuided={() => alert('abrir o passo de agora e emendar os seguintes')} onNavigate={t => alert(`navegar: ${t}`)} onEndStudy={() => alert('encerrar o estudo e devolver a leitura')} />
  } else if (screen === 'estante') {
    body = <EstanteScreen {...common} gamification={gami} scrollToBlock={params.get('bloco')} onBack={() => setScreen('hoje')} onOpenSelo={n => alert(`selo ${n}`)} onOpenBook={n => alert(`abrir ${n}`)} onOpenBookAt={(n, c) => alert(`abrir ${n} ${c}`)} />
  } else if (screen === 'selo') {
    body = gami ? <SeloScreen {...common} nome={livro} gamification={gami} onBack={() => setScreen('estante')} onReadAgain={n => alert(`ler ${n} de novo`)} onOpenNotes={() => alert('notas')} /> : null
  } else if (screen === 'livroCompleto') {
    body = gamiData && gami ? <LivroCompletoScreen nome={livro} data={{ ...gamiData, row: gami, newIds: [] }} onVerEstante={() => setScreen('estante')} onContinuar={() => setScreen('hoje')} /> : null
  } else if (screen === 'conquistas') {
    body = <ConquistasScreen {...common} gamification={gami} onBack={() => setScreen('hoje')} onOpenFamilia={id => alert(`família ${id}`)} onSeen={ids => markAchievementsSeen(ids).then(setGami)} />
  } else if (screen === 'familia') {
    body = <FamiliaScreen {...common} familyId={familia} gamification={gami} onBack={() => setScreen('conquistas')} />
  } else if (screen === 'novaConquista') {
    body = gamiData ? <NovaConquistaScreen celebration={{ kind: celebId.startsWith('bloco:') ? 'bloco' : 'degrau', id: celebId }} data={gamiData} userName="Diego" onContinue={() => setScreen('hoje')} onOpenConquistas={() => setScreen('conquistas')} /> : null
  } else if (screen === 'suaBiblia') {
    body = <SuaBibliaPreview onBack={() => setScreen('hoje')} />
  } else if (params.get('parahoje') === 'todas') {
    // As cinco linhas de "Para hoje" juntas (o desafio do grupo depende de
    // um grupo de verdade, então a lista é montada aqui com paraHojeRows).
    const rows = paraHojeRows({
      challenge: { title: 'Romanos em 16 dias', ref: 'Romanos 8', dayTitle: 'Nenhuma condenação', done: false },
      summary: { seen: false, period: '25 a 31 de agosto' },
      verse: { text: 'O Senhor estava com José e lhe mostrou sua fiel bondade.', bookPt: 'Gênesis', chapter: 39, verseNum: 21 },
      application: { text: 'Hoje eu espero sem cobrar resposta — ligo para o meu irmão e não falo do processo.', fulfilled: false, writtenToday: false, visible: true },
    })
    body = (
      <div style={{ background: 'var(--bento-bg)', height: '100%', padding: '14px 20px', boxSizing: 'border-box' }}>
        <ParaHoje rows={rows} onOpen={k => alert(`abrir: ${k}`)} onAction={k => alert(`marcar: ${k}`)} />
      </div>
    )
  } else if (planoState === 'erro' || planoState === 'carregando') {
    // Cartão do plano sem os dias do plano: ainda carregando, ou a busca
    // falhou (os dados locais do preview nunca falham, então monta aqui).
    const card = buildPlanCard({ loadError: planoState === 'erro', stepDays: null, routineModules: session.routineModules, state: null, ctx: {}, nextWeekdayIdx: null })
    body = (
      <div style={{ background: 'var(--bento-bg)', height: '100%', padding: '14px 20px', boxSizing: 'border-box' }}>
        <CartaoPlano card={card} onAction={a => alert(`ação: ${a}`)} />
      </div>
    )
  } else if (estado === 'carregando') {
    // Hoje carregando (handoff-hoje-50 §8): os dados locais do preview
    // chegam na hora, então o esqueleto da caminhada é montado aqui com os
    // mesmos componentes e nada carregado ainda.
    const progress = computeBibleProgress(completedSet)
    const reads = Object.fromEntries(Object.entries(progress.porLivro).map(([nome, p]) => [nome, p.lidos]))
    body = (
      <div style={{ background: 'var(--bento-bg)', height: '100%', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10, boxSizing: 'border-box' }}>
        <CartaoBiblia progress={progress} reads={reads} currentBook="Gênesis" finishedIso={null} />
        <QuadradosCaminhada
          dailyRoutine={dailyRoutine} goalHistory={null} weeklyGoalDays={4} weeklyDays={session.weeklyDays} firstActivityKey={null}
          livrosCompletos={progress.livrosCompletos} totalLivros={progress.totalLivros} sealNames={null}
        />
      </div>
    )
  } else {
    body = (
      <HomeScreen
        {...common} stepMinutes={{ prayer: 10, reading: 15, reflection: 8 }} weeklySummaries={weeklySummaries}
        onNavigate={t => alert(`navegar: ${t}`)} onOpenProfile={() => {}}
        onStartGuided={() => alert('abrir o passo de agora e emendar os seguintes')}
        onOpenWeeklySummary={k => alert(`resumo ${k}`)} onOpenBiblePassage={(b, c) => alert(`abrir ${b} ${c}`)} onOpenSermonNote={() => alert('anotar pregação')}
        applicationRefreshKey={0}
        onOpenSuaBiblia={() => setScreen('suaBiblia')} onOpenEstante={() => setScreen('estante')}
        onOpenFamilia={id => alert(`família ${id}`)}
        gamification={gami}
      />
    )
  }
  // A aba Bíblia com a barra de abas de verdade — que some fora da raiz
  // (livro, leitura, busca), como no App.
  if (screen === 'biblia' && params.get('plano') === 'sim') return <PlanoGuiadoPreview><BibliaPreview onPastRootChange={setBibliaPastRoot} /></PlanoGuiadoPreview>
  if (screen === 'biblia') {
    return (
      <div style={{ height: '100%' }}>
        <BibliaPreview onPastRootChange={setBibliaPastRoot} />
        {!bibliaPastRoot && params.get('leitura') !== 'plano' && <BottomNav activeTab="journey" onNavigate={t => alert(`aba: ${t}`)} lang="pt" />}
      </div>
    )
  }
  const nav = screen === 'hoje' && params.get('msgs') != null
    ? <BottomNav activeTab="home" onNavigate={t => alert(`aba: ${t}`)} groupsUnread={Number(params.get('msgs'))} groupsHasPending={params.get('pendente') === '1'} lang="pt" />
    : screen === 'pedidos' ? <BottomNav activeTab="routine" onNavigate={t => alert(`aba: ${t}`)} lang="pt" />
      : screen === 'biblioteca' && !bibliotecaPastRoot ? <BottomNav activeTab="notes" onNavigate={t => alert(`aba: ${t}`)} lang="pt" /> : null
  if (params.get('plano') === 'sim') return <PlanoGuiadoPreview>{body}</PlanoGuiadoPreview>
  return <div style={{ height: '100%' }}>{body}{nav}</div>
}

// `&plano=sim` — a tela como fica dentro do plano guiado: o relógio do plano
// numa faixa no topo, andando, e o relógio do passo ligado a ele.
function PlanoGuiadoPreview({ children }) {
  const clock = usePlanClock()
  useEffect(() => { clock.resume() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const link = { inPlan: true, running: clock.running, toggle: clock.toggle }
  return (
    <PlanClockContext.Provider value={link}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PlanClockBar lang={params.get('lang') ?? 'pt'} running={clock.running} computeSeconds={clock.computeSeconds} onToggle={clock.toggle} onOpen={() => alert('ir para o passo de agora')} />
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>{children}</div>
      </div>
    </PlanClockContext.Provider>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><Preview /></StrictMode>)
