// Um provérbio marcante por capítulo de Provérbios (1 a 31) — como o livro tem
// exatamente 31 capítulos, cada dia do mês exibe o versículo do capítulo
// correspondente. Texto parafraseado (o da NVI/NIV é licenciado pela Biblica).

export const PROVERBS_OF_THE_DAY = [
  { pt: { text: 'O temor do Senhor é o princípio do conhecimento.', ref: 'Provérbios 1:7' }, en: { text: 'The fear of the Lord is the beginning of knowledge.', ref: 'Proverbs 1:7' } },
  { pt: { text: 'O Senhor dá sabedoria; de sua boca vêm o conhecimento e o discernimento.', ref: 'Provérbios 2:6' }, en: { text: 'The Lord gives wisdom; from his mouth come knowledge and understanding.', ref: 'Proverbs 2:6' } },
  { pt: { text: 'Confie no Senhor de todo o coração e não se apoie em seu próprio entendimento.', ref: 'Provérbios 3:5' }, en: { text: 'Trust in the Lord with all your heart and lean not on your own understanding.', ref: 'Proverbs 3:5' } },
  { pt: { text: 'Acima de tudo, guarde o seu coração, pois dele depende toda a sua vida.', ref: 'Provérbios 4:23' }, en: { text: 'Above all else, guard your heart, for everything you do flows from it.', ref: 'Proverbs 4:23' } },
  { pt: { text: 'Os caminhos do homem estão abertos diante do Senhor, que examina todas as suas veredas.', ref: 'Provérbios 5:21' }, en: { text: "A person's ways are in full view of the Lord, and he examines all their paths.", ref: 'Proverbs 5:21' } },
  { pt: { text: 'Vá até a formiga, preguiçoso; observe os caminhos dela e seja sábio.', ref: 'Provérbios 6:6' }, en: { text: 'Go to the ant, you sluggard; consider its ways and be wise.', ref: 'Proverbs 6:6' } },
  { pt: { text: 'Filho, obedeça às minhas palavras e guarde os meus mandamentos, e você viverá.', ref: 'Provérbios 7:1-2' }, en: { text: 'My son, keep my words and store up my commands within you, and you will live.', ref: 'Proverbs 7:1-2' } },
  { pt: { text: 'A sabedoria é mais valiosa do que rubis; nada do que você possa desejar se compara a ela.', ref: 'Provérbios 8:11' }, en: { text: 'Wisdom is more precious than rubies, and nothing you desire can compare with her.', ref: 'Proverbs 8:11' } },
  { pt: { text: 'O temor do Senhor é o princípio da sabedoria, e conhecer o Santo é ter entendimento.', ref: 'Provérbios 9:10' }, en: { text: 'The fear of the Lord is the beginning of wisdom, and knowledge of the Holy One is understanding.', ref: 'Proverbs 9:10' } },
  { pt: { text: 'O ódio provoca dissensão, mas o amor cobre todas as transgressões.', ref: 'Provérbios 10:12' }, en: { text: 'Hatred stirs up conflict, but love covers over all wrongs.', ref: 'Proverbs 10:12' } },
  { pt: { text: 'Quem é generoso prospera; quem dá alívio aos outros, dele também receberá alívio.', ref: 'Provérbios 11:25' }, en: { text: 'A generous person will prosper; whoever refreshes others will be refreshed.', ref: 'Proverbs 11:25' } },
  { pt: { text: 'O caminho do insensato é reto aos seus próprios olhos, mas o sábio ouve conselhos.', ref: 'Provérbios 12:15' }, en: { text: 'The way of fools seems right to them, but the wise listen to advice.', ref: 'Proverbs 12:15' } },
  { pt: { text: 'Quem anda com os sábios cresce em sabedoria, mas quem se associa a tolos acaba mal.', ref: 'Provérbios 13:20' }, en: { text: 'Walk with the wise and become wise, for a companion of fools suffers harm.', ref: 'Proverbs 13:20' } },
  { pt: { text: 'Há caminho que ao homem parece direito, mas o fim dele é caminho de morte.', ref: 'Provérbios 14:12' }, en: { text: 'There is a way that appears to be right, but in the end it leads to death.', ref: 'Proverbs 14:12' } },
  { pt: { text: 'A resposta calma desvia a fúria, mas a palavra ríspida desperta a ira.', ref: 'Provérbios 15:1' }, en: { text: 'A gentle answer turns away wrath, but a harsh word stirs up anger.', ref: 'Proverbs 15:1' } },
  { pt: { text: 'Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos.', ref: 'Provérbios 16:3' }, en: { text: 'Commit to the Lord whatever you do, and he will establish your plans.', ref: 'Proverbs 16:3' } },
  { pt: { text: 'O amigo ama em todos os momentos; para as horas difíceis é que existem os irmãos.', ref: 'Provérbios 17:17' }, en: { text: 'A friend loves at all times, and a brother is born for a time of adversity.', ref: 'Proverbs 17:17' } },
  { pt: { text: 'O nome do Senhor é uma torre forte; a ele correm os justos e ficam em segurança.', ref: 'Provérbios 18:10' }, en: { text: 'The name of the Lord is a fortified tower; the righteous run to it and are safe.', ref: 'Proverbs 18:10' } },
  { pt: { text: 'Muitos são os planos no coração do homem, mas prevalece o propósito do Senhor.', ref: 'Provérbios 19:21' }, en: { text: "Many are the plans in a person's heart, but it is the Lord's purpose that prevails.", ref: 'Proverbs 19:21' } },
  { pt: { text: 'Os passos do homem são dirigidos pelo Senhor; como pode alguém entender o seu próprio caminho?', ref: 'Provérbios 20:24' }, en: { text: "A person's steps are directed by the Lord. How then can anyone understand their own way?", ref: 'Proverbs 20:24' } },
  { pt: { text: 'Quem segue a retidão e a lealdade encontra vida, retidão e honra.', ref: 'Provérbios 21:21' }, en: { text: 'Whoever pursues righteousness and love finds life, prosperity, and honor.', ref: 'Proverbs 21:21' } },
  { pt: { text: 'Instrua a criança no caminho em que deve andar, e, ainda quando for idosa, não se desviará dele.', ref: 'Provérbios 22:6' }, en: { text: 'Start children off on the way they should go, and even when they are old they will not turn from it.', ref: 'Proverbs 22:6' } },
  { pt: { text: 'Sem dúvida, há um futuro para você, e a sua esperança não falhará.', ref: 'Provérbios 23:18' }, en: { text: 'There is surely a future hope for you, and your hope will not be cut off.', ref: 'Proverbs 23:18' } },
  { pt: { text: 'O justo pode cair sete vezes e mais uma vez se levanta, mas os ímpios são derrubados pela desgraça.', ref: 'Provérbios 24:16' }, en: { text: 'though the righteous fall seven times, they rise again, but the wicked stumble in times of calamity.', ref: 'Proverbs 24:16' } },
  { pt: { text: 'A palavra dita a seu tempo é como maçãs de ouro em bandeja de prata.', ref: 'Provérbios 25:11' }, en: { text: 'A word fitly spoken is like apples of gold in settings of silver.', ref: 'Proverbs 25:11' } },
  { pt: { text: 'Sem lenha a fogueira apaga; sem fofocas as brigas cessam.', ref: 'Provérbios 26:20' }, en: { text: 'Without wood a fire goes out; without a gossip a quarrel dies down.', ref: 'Proverbs 26:20' } },
  { pt: { text: 'Assim como o ferro afia o ferro, um homem afia o outro.', ref: 'Provérbios 27:17' }, en: { text: 'As iron sharpens iron, so one person sharpens another.', ref: 'Proverbs 27:17' } },
  { pt: { text: 'Quem esconde os seus pecados jamais prosperará, mas quem os confessa e os abandona receberá misericórdia.', ref: 'Provérbios 28:13' }, en: { text: 'Whoever conceals their sins does not prosper, but the one who confesses and renounces them finds mercy.', ref: 'Proverbs 28:13' } },
  { pt: { text: 'Onde não há revelação, o povo se corrompe; mas feliz é aquele que obedece à lei.', ref: 'Provérbios 29:18' }, en: { text: "Where there is no revelation, people cast off restraint; but blessed is the one who heeds wisdom's instruction.", ref: 'Proverbs 29:18' } },
  { pt: { text: 'Toda palavra de Deus é comprovadamente fiel; ele é um escudo para os que nele se refugiam.', ref: 'Provérbios 30:5' }, en: { text: 'Every word of God is flawless; he is a shield to those who take refuge in him.', ref: 'Proverbs 30:5' } },
  { pt: { text: 'O encanto é enganoso, e a beleza é passageira; mas a mulher que teme o Senhor será elogiada.', ref: 'Provérbios 31:30' }, en: { text: 'Charm is deceptive, and beauty is fleeting; but a woman who fears the Lord is to be praised.', ref: 'Proverbs 31:30' } },
]

export function getProverbOfDay(date = new Date(), lang = 'pt') {
  const entry = PROVERBS_OF_THE_DAY[date.getDate() - 1][lang] ?? PROVERBS_OF_THE_DAY[date.getDate() - 1].pt
  return { text: `"${entry.text}"`, ref: `${entry.ref} · ${lang === 'en' ? 'NIV' : 'NVI'}` }
}
