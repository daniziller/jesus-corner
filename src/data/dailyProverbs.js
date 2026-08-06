// Um provérbio marcante por capítulo de Provérbios (1 a 31) — como o livro tem
// exatamente 31 capítulos, cada dia do mês exibe o versículo do capítulo
// correspondente. Texto extraído verbatim das mesmas versões usadas na
// leitura do app: New Living Translation — NLT (en) e Nova Versão
// Transformadora — NVT (pt).

export const PROVERBS_OF_THE_DAY = [
  { pt: { text: 'O temor do Senhor é o princípio do conhecimento, mas os tolos desprezam a sabedoria e a disciplina.', ref: 'Provérbios 1:7' }, en: { text: 'Fear of the Lord is the foundation of true knowledge, but fools despise wisdom and discipline.', ref: 'Proverbs 1:7' } },
  { pt: { text: 'Pois o Senhor concede sabedoria; de sua boca vêm conhecimento e entendimento.', ref: 'Provérbios 2:6' }, en: { text: 'For the Lord grants wisdom! From his mouth come knowledge and understanding.', ref: 'Proverbs 2:6' } },
  { pt: { text: 'Confie no Senhor de todo o coração; não dependa de seu próprio entendimento.', ref: 'Provérbios 3:5' }, en: { text: 'Trust in the Lord with all your heart; do not depend on your own understanding.', ref: 'Proverbs 3:5' } },
  { pt: { text: 'Acima de todas as coisas, guarde seu coração, pois ele dirige o rumo de sua vida.', ref: 'Provérbios 4:23' }, en: { text: 'Guard your heart above all else, for it determines the course of your life.', ref: 'Proverbs 4:23' } },
  { pt: { text: 'Pois o Senhor vê com clareza o que o homem faz e examina todos os seus caminhos.', ref: 'Provérbios 5:21' }, en: { text: 'For the Lord sees clearly what a man does, examining every path he takes.', ref: 'Proverbs 5:21' } },
  { pt: { text: 'Aprenda com a formiga, preguiçoso! Observe como ela age e seja sábio.', ref: 'Provérbios 6:6' }, en: { text: 'Take a lesson from the ants, you lazybones. Learn from their ways and become wise!', ref: 'Proverbs 6:6' } },
  { pt: { text: 'Meu filho, siga meu conselho; guarde meus mandamentos como um tesouro. Obedeça a meus mandamentos e viva; cuide de minhas instruções como da menina de seus olhos.', ref: 'Provérbios 7:1-2' }, en: { text: 'Follow my advice, my son; always treasure my commands. Obey my commands and live! Guard my instructions as you guard your own eyes.', ref: 'Proverbs 7:1-2' } },
  { pt: { text: 'Pois a sabedoria vale muito mais que rubis; nada do que você deseja se compara a ela.', ref: 'Provérbios 8:11' }, en: { text: 'For wisdom is far more valuable than rubies. Nothing you desire can compare with it.', ref: 'Proverbs 8:11' } },
  { pt: { text: 'O temor do Senhor é o princípio da sabedoria; o conhecimento do Santo resulta em discernimento.', ref: 'Provérbios 9:10' }, en: { text: 'Fear of the Lord is the foundation of wisdom. Knowledge of the Holy One results in good judgment.', ref: 'Proverbs 9:10' } },
  { pt: { text: 'O ódio provoca brigas, mas o amor cobre todas as ofensas.', ref: 'Provérbios 10:12' }, en: { text: 'Hatred stirs up quarrels, but love makes up for all offenses.', ref: 'Proverbs 10:12' } },
  { pt: { text: 'O generoso prospera; quem revigora outros será revigorado.', ref: 'Provérbios 11:25' }, en: { text: 'The generous will prosper; those who refresh others will themselves be refreshed.', ref: 'Proverbs 11:25' } },
  { pt: { text: 'O insensato pensa que sua conduta é correta, mas o sábio dá ouvidos aos conselhos.', ref: 'Provérbios 12:15' }, en: { text: 'Fools think their own way is right, but the wise listen to others.', ref: 'Proverbs 12:15' } },
  { pt: { text: 'Quem anda com os sábios se torna sábio, mas quem anda com os tolos sofrerá as consequências.', ref: 'Provérbios 13:20' }, en: { text: 'Walk with the wise and become wise; associate with fools and get in trouble.', ref: 'Proverbs 13:20' } },
  { pt: { text: 'Há caminhos que a pessoa considera corretos, mas que acabam levando à estrada da morte.', ref: 'Provérbios 14:12' }, en: { text: 'There is a path before each person that seems right, but it ends in death.', ref: 'Proverbs 14:12' } },
  { pt: { text: 'A resposta gentil desvia o furor, mas a palavra ríspida desperta a ira.', ref: 'Provérbios 15:1' }, en: { text: 'A gentle answer deflects anger, but harsh words make tempers flare.', ref: 'Proverbs 15:1' } },
  { pt: { text: 'Confie ao Senhor tudo que você faz, e seus planos serão bem-sucedidos.', ref: 'Provérbios 16:3' }, en: { text: 'Commit your actions to the Lord, and your plans will succeed.', ref: 'Proverbs 16:3' } },
  { pt: { text: 'O amigo é sempre leal, e um irmão nasce na hora da dificuldade.', ref: 'Provérbios 17:17' }, en: { text: 'A friend is always loyal, and a brother is born to help in time of need.', ref: 'Proverbs 17:17' } },
  { pt: { text: 'O nome do Senhor é fortaleza segura; o justo corre para ele e fica protegido.', ref: 'Provérbios 18:10' }, en: { text: 'The name of the Lord is a strong fortress; the godly run to him and are safe.', ref: 'Proverbs 18:10' } },
  { pt: { text: 'É da natureza humana fazer planos, mas o propósito do Senhor prevalecerá.', ref: 'Provérbios 19:21' }, en: { text: 'You can make many plans, but the Lord’s purpose will prevail.', ref: 'Proverbs 19:21' } },
  { pt: { text: 'É o Senhor que dirige nossos passos; então por que tentar entender tudo ao longo do caminho?', ref: 'Provérbios 20:24' }, en: { text: 'The Lord directs our steps, so why try to understand everything along the way?', ref: 'Proverbs 20:24' } },
  { pt: { text: 'Quem busca a justiça e o amor encontra vida, justiça e honra.', ref: 'Provérbios 21:21' }, en: { text: 'Whoever pursues righteousness and unfailing love will find life, righteousness, and honor.', ref: 'Proverbs 21:21' } },
  { pt: { text: 'Ensine seus filhos no caminho certo, e, mesmo quando envelhecerem, não se desviarão dele.', ref: 'Provérbios 22:6' }, en: { text: 'Direct your children onto the right path, and when they are older, they will not leave it.', ref: 'Proverbs 22:6' } },
  { pt: { text: 'Você será recompensado por isso; sua esperança não será frustrada.', ref: 'Provérbios 23:18' }, en: { text: 'You will be rewarded for this; your hope will not be disappointed.', ref: 'Proverbs 23:18' } },
  { pt: { text: 'Ainda que o justo tropece sete vezes, voltará a se levantar, mas uma só calamidade é suficiente para derrubar o perverso.', ref: 'Provérbios 24:16' }, en: { text: 'The godly may trip seven times, but they will get up again. But one disaster is enough to overthrow the wicked.', ref: 'Proverbs 24:16' } },
  { pt: { text: 'O conselho oferecido na hora certa é agradável como maçãs de ouro numa bandeja de prata.', ref: 'Provérbios 25:11' }, en: { text: 'Timely advice is lovely, like golden apples in a silver basket.', ref: 'Proverbs 25:11' } },
  { pt: { text: 'Sem lenha, o fogo apaga; sem intrigas, as brigas cessam.', ref: 'Provérbios 26:20' }, en: { text: 'Fire goes out without wood, and quarrels disappear when gossip stops.', ref: 'Proverbs 26:20' } },
  { pt: { text: 'Como o ferro afia o ferro, assim um amigo afia o outro.', ref: 'Provérbios 27:17' }, en: { text: 'As iron sharpens iron, so a friend sharpens a friend.', ref: 'Proverbs 27:17' } },
  { pt: { text: 'Quem oculta seus pecados não prospera; quem os confessa e os abandona recebe misericórdia.', ref: 'Provérbios 28:13' }, en: { text: 'People who conceal their sins will not prosper, but if they confess and turn from them, they will receive mercy.', ref: 'Proverbs 28:13' } },
  { pt: { text: 'O povo que não aceita a orientação divina se corrompe, mas quem obedece à lei é feliz.', ref: 'Provérbios 29:18' }, en: { text: 'When people do not accept divine guidance, they run wild. But whoever obeys the law is joyful.', ref: 'Proverbs 29:18' } },
  { pt: { text: 'Toda palavra de Deus se prova verdadeira; ele é escudo para quem busca sua proteção.', ref: 'Provérbios 30:5' }, en: { text: 'Every word of God proves true. He is a shield to all who come to him for protection.', ref: 'Proverbs 30:5' } },
  { pt: { text: 'Os encantos são enganosos, e a beleza não dura para sempre, mas a mulher que teme o Senhor será elogiada.', ref: 'Provérbios 31:30' }, en: { text: 'Charm is deceptive, and beauty does not last; but a woman who fears the Lord will be greatly praised.', ref: 'Proverbs 31:30' } },
]

export function getProverbOfDay(date = new Date(), lang = 'pt') {
  const entry = PROVERBS_OF_THE_DAY[date.getDate() - 1][lang] ?? PROVERBS_OF_THE_DAY[date.getDate() - 1].pt
  return { text: `"${entry.text}"`, ref: `${entry.ref} · ${lang === 'en' ? 'NLT' : 'NVT'}` }
}
