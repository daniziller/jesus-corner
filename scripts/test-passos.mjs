// Testes das telas de dentro do plano (handoff-passos-pedidos-53-54),
// parte pura: barra do dia, cabeçalho, relógio e a oração ACTS.
// node scripts/test-passos.mjs
import { readFileSync } from 'node:fs'
import {
  stepPosition, dayBarSegments, dayBarAria, stepSubtitle, clockDisplay, clockAria,
  actsTrail, actsTrailAria, stageMinutes, stageCardLabel, actsFooter, starterText, insertStarter,
} from '../src/passos/passosMath.js'
import { PRAYER_STAGES } from '../src/prayer/prayerStages.js'
import { readingThread } from '../src/biblia/bibliaMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}

// ── Barra do dia e cabeçalho ────────────────────────────────────────────
const hoje = ['prayer', 'reading', 'reflection']
const minutos = { prayer: 10, reading: 15, study: 15, reflection: 5 }
check('posição do passo: "1 de 3", "2 de 3", "3 de 3"', hoje.map(k => { const p = stepPosition(hoje, k); return `${p.n} de ${p.total}` }), ['1 de 3', '2 de 3', '3 de 3'])
check('passo fora do plano de hoje aparece sozinho', [stepPosition(['reading'], 'prayer'), stepPosition([], 'prayer'), stepPosition(undefined, 'reflection').total], [{ keys: ['prayer'], n: 1, total: 1 }, { keys: ['prayer'], n: 1, total: 1 }, 1])
check('barra na oração (S1): o primeiro é agora, os outros por vir; flex = minutos', dayBarSegments({ todaysSteps: hoje, minutes: minutos, dayEntry: {}, current: 'prayer' }), [{ key: 'prayer', minutes: 10, status: 'now' }, { key: 'reading', minutes: 15, status: 'upcoming' }, { key: 'reflection', minutes: 5, status: 'upcoming' }])
check('barra na leitura (S3): oração feita, leitura agora', dayBarSegments({ todaysSteps: hoje, minutes: minutos, dayEntry: { prayer: true }, current: 'reading' }).map(s => s.status), ['done', 'now', 'upcoming'])
check('barra na reflexão (S4): os dois primeiros feitos', dayBarSegments({ todaysSteps: hoje, minutes: minutos, dayEntry: { prayer: true, reading: true }, current: 'reflection' }).map(s => s.status), ['done', 'done', 'now'])
check('refazer um passo já feito: ele é o "agora", não "feito"', dayBarSegments({ todaysSteps: hoje, minutes: minutos, dayEntry: { prayer: true, reading: true, reflection: true }, current: 'prayer' }).map(s => s.status), ['now', 'done', 'done'])
check('fora de ordem: reflexão antes da leitura', dayBarSegments({ todaysSteps: hoje, minutes: minutos, dayEntry: { prayer: true }, current: 'reflection' }).map(s => s.status), ['done', 'upcoming', 'now'])
check('dia de estudo: quatro segmentos', dayBarSegments({ todaysSteps: ['prayer', 'reading', 'study', 'reflection'], minutes: minutos, dayEntry: {}, current: 'prayer' }).map(s => s.minutes), [10, 15, 15, 5])
check('minutos faltando não quebram a barra', dayBarSegments({ todaysSteps: ['prayer'], minutes: undefined, dayEntry: null, current: 'prayer' }), [{ key: 'prayer', minutes: 1, status: 'now' }])
check('texto alternativo da barra', [dayBarAria(hoje, 'prayer'), dayBarAria(hoje, 'reflection'), dayBarAria([], 'reading')], ['Passo 1 de 3, Oração', 'Passo 3 de 3, Reflexão', 'Passo 1 de 1, Leitura'])
check('linha do cabeçalho: "Passo 1 de 3 · ACTS"', [stepSubtitle(hoje, 'prayer', 'ACTS'), stepSubtitle(hoje, 'reflection', 'com perguntas'), stepSubtitle(['prayer'], 'prayer', 'ACTS'), stepSubtitle(hoje, 'reading')], ['Passo 1 de 3 · ACTS', 'Passo 3 de 3 · com perguntas', 'Passo 1 de 1 · ACTS', 'Passo 2 de 3'])

// ── Relógio ─────────────────────────────────────────────────────────────
check('relógio: o tempo que falta', [clockDisplay(600, 134), clockDisplay(600, 0), clockDisplay(600, 599.6)], [{ text: '07:46', overtime: false }, { text: '10:00', overtime: false }, { text: '00:00', overtime: false }])
check('relógio: zerado, conta para cima', clockDisplay(600, 675), { text: '01:15', overtime: true })
check('leitor de tela ouve minutos, não segundos', [clockAria(600, 134, true), clockAria(600, 139, true)], ['Faltam 8 minutos. Toque para pausar.', 'Faltam 8 minutos. Toque para pausar.'])
check('leitor de tela: singular, pausado e tempo encerrado', [clockAria(600, 545, true), clockAria(600, 134, false), clockAria(600, 600, true), clockAria(600, 700, true)], ['Falta 1 minuto. Toque para pausar.', 'Faltam 8 minutos. Relógio pausado. Toque para continuar.', 'Tempo previsto encerrado. Toque para pausar.', 'Tempo previsto encerrado há 2 minutos. Toque para pausar.'])

// ── ACTS ────────────────────────────────────────────────────────────────
check('as quatro etapas, nesta ordem', PRAYER_STAGES.map(s => s.title.pt), ['Adoração', 'Confissão', 'Gratidão', 'Súplica'])
check('trilha na Confissão (S1): feita, atual, por vir, por vir', actsTrail(PRAYER_STAGES, 1), [{ id: 'adoracao', name: 'Adoração', status: 'done' }, { id: 'confissao', name: 'Confissão', status: 'now' }, { id: 'gratidao', name: 'Gratidão', status: 'upcoming' }, { id: 'suplica', name: 'Súplica', status: 'upcoming' }])
check('trilha na Súplica (S2): três feitas, a última atual', actsTrail(PRAYER_STAGES, 3).map(s => s.status), ['done', 'done', 'done', 'now'])
check('trilha na Adoração: a primeira atual', actsTrail(PRAYER_STAGES, 0).map(s => s.status), ['now', 'upcoming', 'upcoming', 'upcoming'])
check('texto alternativo da trilha', [actsTrailAria(PRAYER_STAGES, 1), actsTrailAria(PRAYER_STAGES, 3)], ['Etapa 2 de 4, Confissão', 'Etapa 4 de 4, Súplica'])
check('minutos da etapa: "2,5" · "3" · "3,8" · "1,3"', [stageMinutes(150), stageMinutes(180), stageMinutes(225), stageMinutes(75), stageMinutes(0)], ['2,5', '3', '3,8', '1,3', '0'])
check('rótulo do cartão preto', [stageCardLabel(1, 4, 150), stageCardLabel(3, 4, 150), stageCardLabel(0, 4, 300)], ['Etapa 2 de 4 · 2,5 min', 'Etapa 4 de 4 · 2,5 min', 'Etapa 1 de 4 · 5 min'])
check('rodapé: o botão nomeia a próxima etapa', [0, 1, 2].map(i => actsFooter(PRAYER_STAGES, i)), [{ skip: 'Pular', last: false, primary: 'Confissão' }, { skip: 'Pular', last: false, primary: 'Gratidão' }, { skip: 'Pular', last: false, primary: 'Súplica' }])
check('rodapé na Súplica: "Terminar a oração"', actsFooter(PRAYER_STAGES, 3), { skip: 'Pular', last: true, primary: 'Terminar a oração' })

// Textos fixos das etapas.
const confissao = PRAYER_STAGES[1]
check('Confissão: a orientação do quadro S1', confissao.explanation.pt, 'Diga o que pesa, com nome. Não é para se acusar — é para entregar. Nada do que você contar aqui é novidade para Deus.')
check('Confissão: as três frases do quadro S1', confissao.starters.pt, ['Senhor, eu errei em…', 'Tenho carregado sozinho…', 'Me ajuda a largar…'])
check('Súplica: a orientação do quadro S2, e sem frases de começo', [PRAYER_STAGES[3].explanation.pt, PRAYER_STAGES[3].starters], ['Peça. Pelos seus e pelos outros. Toque no pedido depois de orar por ele.', undefined])
check('as três primeiras etapas têm três frases de começo, todas com reticências', PRAYER_STAGES.slice(0, 3).map(s => [s.starters.pt.length, s.starters.pt.every(x => x.endsWith('…'))]), [[3, true], [3, true], [3, true]])

// ── Pastilhas de frase ──────────────────────────────────────────────────
check('a frase entra sem as reticências', [starterText('Senhor, eu errei em…'), starterText('Senhor, eu errei em...'), starterText('Sem reticências')], ['Senhor, eu errei em', 'Senhor, eu errei em', 'Sem reticências'])
check('campo vazio: recebe a frase, com o cursor pronto no fim', [insertStarter('', 'Senhor, eu errei em…'), insertStarter('   \n', 'Senhor, eu errei em…'), insertStarter(undefined, 'Me ajuda a largar…')], ['Senhor, eu errei em ', 'Senhor, eu errei em ', 'Me ajuda a largar '])
check('campo com texto: a frase entra numa linha nova', insertStarter('Hoje foi difícil.', 'Me ajuda a largar…'), 'Hoje foi difícil.\nMe ajuda a largar ')
check('a mesma frase de novo, logo depois de posta, não repete', [insertStarter('Senhor, eu errei em ', 'Senhor, eu errei em…'), insertStarter('Hoje foi difícil.\nMe ajuda a largar ', 'Me ajuda a largar…')], ['Senhor, eu errei em ', 'Hoje foi difícil.\nMe ajuda a largar '])
check('a mesma frase depois de a pessoa completar entra de novo, em linha nova', insertStarter('Senhor, eu errei em casa.', 'Senhor, eu errei em…'), 'Senhor, eu errei em casa.\nSenhor, eu errei em ')
check('duas frases diferentes em sequência', insertStarter(insertStarter('', 'Senhor, eu errei em…'), 'Tenho carregado sozinho…'), 'Senhor, eu errei em\nTenho carregado sozinho ')

// ── S3: a leitura com relógio ───────────────────────────────────────────
check('fio da leitura do plano: "Passo 2 de 3 · 40 de 50 lidos"', readingThread({ lidos: 40, total: 50 }, { step: stepSubtitle(hoje, 'reading') }), { ratio: 0.8, text: 'Passo 2 de 3 · 40 de 50 lidos' })
check('fio: singular, nada lido e leitura fora dos passos de hoje', [readingThread({ lidos: 1, total: 4 }, { step: stepSubtitle(hoje, 'reading') }).text, readingThread({ lidos: 0, total: 150 }, { step: stepSubtitle(['prayer', 'reading', 'study', 'reflection'], 'reading') }).text, readingThread({ lidos: 3, total: 3 }, { step: stepSubtitle(['prayer'], 'reading') }).text], ['Passo 2 de 3 · 1 de 4 lido', 'Passo 2 de 4 · 0 de 150 lidos', 'Passo 1 de 1 · 3 de 3 lidos'])
check('fio da leitura livre continua como era', [readingThread({ lidos: 6, total: 150 }, { free: true }).text, readingThread({ lidos: 6, total: 150 }).text], ['6 de 150 lidos · leitura livre', '6 de 150 lidos'])
check('relógio da leitura: 15 min, 3:28 lidos → "11:32"', clockDisplay(900, 208).text, '11:32')
// Uma tela de leitura só: a do plano é a da aba Bíblia, com o mesmo topo e
// o mesmo rodapé, em outro modo.
const leitura = readFileSync(new URL('../src/screens/ReadingBlockView.jsx', import.meta.url), 'utf8')
check('a leitura do plano usa o topo e o rodapé da leitura da Bíblia', [(leitura.match(/<LeituraTopo\b/g) ?? []).length, (leitura.match(/<LeituraRodape\b/g) ?? []).length, /StepTimerPill|readerDoneBtn|readerToolsBtn/.test(leitura)], [1, 2, false])
check('o texto bíblico é o mesmo componente nos dois modos', (leitura.match(/<BibleTextPanel\b/g) ?? []).length, 1)
check('"Concluir a leitura" chama o caminho de sempre', /<LeituraRodape ref=\{measureFooter\} onTools=\{[^}]*\} onConclude=\{handleConcludePress\} \/>/.test(leitura), true)

// ── Privacidade: o que se escreve na oração não sai da tela ─────────────
// O cartão de escrita e a tela da oração não importam nenhum lugar de
// guardar ou enviar texto (notas, biblioteca, grupo, rede).
const forbidden = /notesStore|commentsStore|chapterRoomStore|groupsStore|supabaseClient|fetch\(|localStorage|sessionStorage/
const escrita = readFileSync(new URL('../src/components/passos/CartaoDeEscrita.jsx', import.meta.url), 'utf8')
check('o cartão de escrita não guarda nem envia o texto', forbidden.test(escrita), false)
const oracao = readFileSync(new URL('../src/screens/PrayerScreen.jsx', import.meta.url), 'utf8')
check('a tela da oração nunca passa o que foi escrito a um armazenamento', /(saveNote|postComment|postToRoom|sendMessage)\(/.test(oracao), false)
check('o texto das etapas só vive no estado da tela (stageNotes)', [/stageNotes/.test(oracao), /stageNotes[^\n]*(save|post|send|store)\w*\(/i.test(oracao)], [true, false])

if (failures > 0) { console.error(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes dos passos (parte pura) passaram.')
