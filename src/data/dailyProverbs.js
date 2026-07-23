// Um provérbio marcante por capítulo de Provérbios (1 a 31) — como o livro tem
// exatamente 31 capítulos, cada dia do mês exibe o versículo do capítulo
// correspondente. Texto extraído verbatim das mesmas versões usadas na
// leitura do app: World English Bible (en) e Bíblia Livre — BLIVRE (pt).

export const PROVERBS_OF_THE_DAY = [
  { pt: { text: 'O temor ao SENHOR é o principio do conhecimento; os tolos desprezam a sabedoria e a instrução.', ref: 'Provérbios 1:7' }, en: { text: 'The fear of Yahweh is the beginning of knowledge; but the foolish despise wisdom and instruction.', ref: 'Proverbs 1:7' } },
  { pt: { text: 'Porque o SENHOR dá sabedoria; de sua boca vem o conhecimento e o entendimento.', ref: 'Provérbios 2:6' }, en: { text: 'For Yahweh gives wisdom. Out of his mouth comes knowledge and understanding.', ref: 'Proverbs 2:6' } },
  { pt: { text: 'Confia no SENHOR com todo o teu coração, e não te apoies no teu próprio entendimento.', ref: 'Provérbios 3:5' }, en: { text: "Trust in Yahweh with all your heart, and don't lean on your own understanding.", ref: 'Proverbs 3:5' } },
  { pt: { text: 'Acima de tudo o que se deve guardar, guarda o teu coração; porque dele procedem as fontes da vida.', ref: 'Provérbios 4:23' }, en: { text: 'Keep your heart with all diligence, for out of it is the wellspring of life.', ref: 'Proverbs 4:23' } },
  { pt: { text: 'Pois os caminhos do homem estão perante os olhos do SENHOR; e ele pondera todos os seus percursos.', ref: 'Provérbios 5:21' }, en: { text: "For the ways of man are before Yahweh's eyes. He examines all his paths.", ref: 'Proverbs 5:21' } },
  { pt: { text: 'Vai até a formiga, preguiçoso; olha para os caminhos dela, e sê sábio.', ref: 'Provérbios 6:6' }, en: { text: 'Go to the ant, you sluggard. Consider her ways, and be wise;', ref: 'Proverbs 6:6' } },
  { pt: { text: 'Filho meu, guarda minhas palavras; e deposita em ti meus mandamentos. Guarda meus mandamentos, e vive; e minha lei, como as pupilas de teus olhos.', ref: 'Provérbios 7:1-2' }, en: { text: 'My son, keep my words. Lay up my commandments within you. Keep my commandments and live! Guard my teaching as the apple of your eye.', ref: 'Proverbs 7:1-2' } },
  { pt: { text: 'Porque a sabedoria é melhor do que rubis; e todas as coisas desejáveis nem sequer podem ser comparadas a ela.', ref: 'Provérbios 8:11' }, en: { text: "For wisdom is better than rubies. All the things that may be desired can't be compared to it.", ref: 'Proverbs 8:11' } },
  { pt: { text: 'O temor ao SENHOR é o princípio da sabedoria; e o conhecimento dos santos é a prudência.', ref: 'Provérbios 9:10' }, en: { text: 'The fear of Yahweh is the beginning of wisdom. The knowledge of the Holy One is understanding.', ref: 'Proverbs 9:10' } },
  { pt: { text: 'O ódio desperta brigas; mas o amor cobre todas as transgressões.', ref: 'Provérbios 10:12' }, en: { text: 'Hatred stirs up strife, but love covers all wrongs.', ref: 'Proverbs 10:12' } },
  { pt: { text: 'A alma generosa prosperará, e aquele que saciar também será saciado.', ref: 'Provérbios 11:25' }, en: { text: 'The liberal soul shall be made fat. He who waters shall be watered also himself.', ref: 'Proverbs 11:25' } },
  { pt: { text: 'O caminho do tolo é correto aos seus próprios olhos; mas aquele que ouve o bom conselho é sábio.', ref: 'Provérbios 12:15' }, en: { text: 'The way of a fool is right in his own eyes, but he who is wise listens to counsel.', ref: 'Proverbs 12:15' } },
  { pt: { text: 'Quem anda com os sábios se torna sábio; mas aquele que acompanha os tolos sofrerá.', ref: 'Provérbios 13:20' }, en: { text: 'One who walks with wise men grows wise, but a companion of fools suffers harm.', ref: 'Proverbs 13:20' } },
  { pt: { text: 'Há um caminho que parece correto para o homem, porém o fim dele são caminhos de morte.', ref: 'Provérbios 14:12' }, en: { text: 'There is a way which seems right to a man, but in the end it leads to death.', ref: 'Proverbs 14:12' } },
  { pt: { text: 'A resposta suave desvia o furor, mas a palavra pesada faz a ira aumentar.', ref: 'Provérbios 15:1' }, en: { text: 'A gentle answer turns away wrath, but a harsh word stirs up anger.', ref: 'Proverbs 15:1' } },
  { pt: { text: 'Confia tuas obras ao SENHOR, e teus pensamentos serão firmados.', ref: 'Provérbios 16:3' }, en: { text: 'Commit your deeds to Yahweh, and your plans shall succeed.', ref: 'Proverbs 16:3' } },
  { pt: { text: 'O amigo ama em todo tempo, e o irmão nasce para a adversidade.', ref: 'Provérbios 17:17' }, en: { text: 'A friend loves at all times; and a brother is born for adversity.', ref: 'Proverbs 17:17' } },
  { pt: { text: 'O nome do SENHOR é uma torre forte; o justo correrá até ele, e ficará seguro.', ref: 'Provérbios 18:10' }, en: { text: "Yahweh's name is a strong tower: the righteous run to him, and are safe.", ref: 'Proverbs 18:10' } },
  { pt: { text: 'Há muitos pensamentos no coração do homem; porém o conselho do SENHOR prevalecerá.', ref: 'Provérbios 19:21' }, en: { text: "There are many plans in a man's heart, but Yahweh's counsel will prevail.", ref: 'Proverbs 19:21' } },
  { pt: { text: 'Os passos do homem pertencem ao SENHOR; como, pois, o homem entenderá seu caminho?', ref: 'Provérbios 20:24' }, en: { text: "A man's steps are from Yahweh; how then can man understand his way?", ref: 'Proverbs 20:24' } },
  { pt: { text: 'Quem segue a justiça e a bondade achará vida, justiça e honra.', ref: 'Provérbios 21:21' }, en: { text: 'He who follows after righteousness and kindness finds life, righteousness, and honor.', ref: 'Proverbs 21:21' } },
  { pt: { text: 'Instrui ao menino no caminho em que deve andar, e até quando envelhecer não se desviará dele.', ref: 'Provérbios 22:6' }, en: { text: 'Train up a child in the way he should go, and when he is old he will not depart from it.', ref: 'Proverbs 22:6' } },
  { pt: { text: 'Porque certamente há um bom futuro para ti, e tua expectativa não será cortada.', ref: 'Provérbios 23:18' }, en: { text: 'Indeed surely there is a future hope, and your hope will not be cut off.', ref: 'Proverbs 23:18' } },
  { pt: { text: 'Porque o justo cai sete vezes, e se levanta; mas os perversos tropeçam no mal.', ref: 'Provérbios 24:16' }, en: { text: 'for a righteous man falls seven times and rises up again; but the wicked are overthrown by calamity.', ref: 'Proverbs 24:16' } },
  { pt: { text: 'A palavra dita em tempo apropriado é como maçãs de ouro em bandejas de prata.', ref: 'Provérbios 25:11' }, en: { text: 'A word fitly spoken is like apples of gold in settings of silver.', ref: 'Proverbs 25:11' } },
  { pt: { text: 'Sem lenha, o fogo se apaga; e sem fofoqueiro, a briga termina.', ref: 'Provérbios 26:20' }, en: { text: 'For lack of wood a fire goes out. Without gossip, a quarrel dies down.', ref: 'Proverbs 26:20' } },
  { pt: { text: 'O ferro é afiado com ferro; assim também o homem afia o rosto de seu amigo.', ref: 'Provérbios 27:17' }, en: { text: "Iron sharpens iron; so a man sharpens his friend's countenance.", ref: 'Proverbs 27:17' } },
  { pt: { text: 'Quem encobre suas transgressões nunca prosperará, mas aquele que as confessa e as abandona alcançará misericórdia.', ref: 'Provérbios 28:13' }, en: { text: "He who conceals his sins doesn't prosper, but whoever confesses and renounces them finds mercy.", ref: 'Proverbs 28:13' } },
  { pt: { text: 'Não havendo visão profética, o povo fica confuso; porém o que guarda a lei, ele é bem-aventurado.', ref: 'Provérbios 29:18' }, en: { text: 'Where there is no revelation, the people cast off restraint; but one who keeps the law is blessed.', ref: 'Proverbs 29:18' } },
  { pt: { text: 'Toda palavra de Deus é pura; é escudo para os que nele confiam.', ref: 'Provérbios 30:5' }, en: { text: 'Every word of God is flawless. He is a shield to those who take refuge in him.', ref: 'Proverbs 30:5' } },
  { pt: { text: 'A beleza é enganosa, e a formosura é passageira; mas a mulher que teme ao SENHOR, essa será louvada.', ref: 'Provérbios 31:30' }, en: { text: 'Charm is deceitful, and beauty is vain; but a woman who fears Yahweh, she shall be praised.', ref: 'Proverbs 31:30' } },
]

export function getProverbOfDay(date = new Date(), lang = 'pt') {
  const entry = PROVERBS_OF_THE_DAY[date.getDate() - 1][lang] ?? PROVERBS_OF_THE_DAY[date.getDate() - 1].pt
  return { text: `"${entry.text}"`, ref: `${entry.ref} · ${lang === 'en' ? 'WEB' : 'BLIVRE'}` }
}
