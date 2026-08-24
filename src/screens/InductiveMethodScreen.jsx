// InductiveMethodScreen.jsx
// Explicação detalhada do método de Estudo Bíblico Indutivo (Observação →
// Interpretação → Verdade Atemporal → Aplicação) — conteúdo de referência,
// não "chrome" de UI curto, por isso vive aqui como dado local bilíngue
// (mesmo espírito de src/data/studies.js) em vez de translations.js.
// Acessível a partir de qualquer lugar dos estudos indutivos (ver o link
// fixo em StudiesScreen.jsx) — tela só de leitura, sem estado próprio,
// então não precisa do tratamento "sempre montada" que Notas/Estudos têm.
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

const STEPS = [
  {
    icon: 'Search',
    title: 'Observação',
    titleEn: 'Observation',
    question: '"O que o texto diz?"',
    questionEn: '"What does the text say?"',
    body: 'Antes de tirar qualquer conclusão, você observa cuidadosamente o texto: quem está falando, para quem, quando, onde e em que circunstâncias. Você repara em palavras repetidas, contrastes, comparações, conectivos ("portanto", "mas", "porque"), listas, perguntas feitas no texto, e na estrutura geral da passagem.',
    bodyEn: 'Before drawing any conclusion, you carefully observe the text: who is speaking, to whom, when, where, and under what circumstances. You notice repeated words, contrasts, comparisons, connectors ("therefore", "but", "because"), lists, questions asked within the text, and the overall structure of the passage.',
  },
  {
    icon: 'BookOpen',
    title: 'Interpretação',
    titleEn: 'Interpretation',
    question: '"O que o texto significava para os primeiros ouvintes?"',
    questionEn: '"What did the text mean to the first hearers?"',
    body: 'Com base nas observações, você busca entender o que aquela passagem quis dizer para o autor e para os leitores originais, dentro do contexto histórico e cultural deles. Pergunte: por que essa observação é significativa? O que isso comunicava na época em que foi escrito?',
    bodyEn: 'Based on your observations, you try to understand what that passage meant to the author and to the original readers, within their historical and cultural context. Ask: why is this observation significant? What did this communicate at the time it was written?',
  },
  {
    icon: 'Sparkles',
    title: 'Verdade Atemporal',
    titleEn: 'Timeless Truth',
    question: '"Que princípio continua válido em qualquer época?"',
    questionEn: '"What principle still holds true in any era?"',
    body: 'Muitos praticantes do método incluem esse passo intermediário entre interpretação e aplicação: da interpretação, você extrai um princípio atemporal — uma verdade sobre o caráter de Deus, o Reino ou a vida cristã que continua válida em qualquer época e cultura, não só para os primeiros ouvintes.',
    bodyEn: 'Many practitioners of the method include this intermediate step between interpretation and application: from the interpretation, you extract a timeless principle — a truth about God\'s character, the Kingdom, or the Christian life that remains valid in any era and culture, not just for the first hearers.',
  },
  {
    icon: 'PenLine',
    title: 'Aplicação',
    titleEn: 'Application',
    question: '"O que isso significa para mim, hoje?"',
    questionEn: '"What does this mean for me, today?"',
    body: 'Você busca uma forma prática e concreta de aplicar esse princípio à sua própria vida — algo realista de colocar em prática, por exemplo, na semana seguinte. Sem esse último passo, o estudo fica só no campo das ideias.',
    bodyEn: 'You look for a practical, concrete way to apply that principle to your own life — something realistic to put into practice, for example, over the following week. Without this last step, the study stays only in the realm of ideas.',
  },
]

const PRACTICE_STEPS = [
  {
    body: 'Escolha uma passagem ou livro. Pode ser um capítulo, uma carta curta ou uma seção de um livro maior.',
    bodyEn: 'Choose a passage or book. It can be a chapter, a short letter, or a section of a larger book.',
  },
  {
    body: 'Leia o texto várias vezes. A primeira leitura é para ter uma visão geral. Nas leituras seguintes, comece a marcar o que observa: sublinhe palavras-chave, circule nomes de pessoas e lugares, marque palavras repetidas.',
    bodyEn: 'Read the text several times. The first reading is to get an overview. In the following readings, start marking what you observe: underline key words, circle names of people and places, mark repeated words.',
  },
  {
    body: 'Dê um título a cada parágrafo. Depois de algumas leituras, resuma o assunto de cada parágrafo em poucas palavras. Isso ajuda a enxergar onde o autor muda de assunto e como o argumento se desenvolve.',
    bodyEn: 'Give each paragraph a title. After a few readings, summarize the subject of each paragraph in a few words. This helps you see where the author shifts subject and how the argument develops.',
  },
  {
    body: 'Faça perguntas abertas ao texto. Pergunte "por quê" e "como": Por que o autor disse isso aqui? Como isso se conecta com o que veio antes e depois? O que isso revela sobre Deus?',
    bodyEn: 'Ask the text open questions. Ask "why" and "how": Why did the author say this here? How does this connect with what came before and after? What does this reveal about God?',
  },
  {
    body: 'Registre suas observações. Anote datas, lugares, personagens, repetições, contrastes e a estrutura do argumento.',
    bodyEn: 'Record your observations. Note down dates, places, characters, repetitions, contrasts, and the structure of the argument.',
  },
  {
    body: 'Interprete à luz do contexto original. Pesquise o pano de fundo histórico e cultural, se necessário. Pergunte o que a passagem significava para quem a recebeu primeiro.',
    bodyEn: 'Interpret in light of the original context. Research the historical and cultural background, if needed. Ask what the passage meant to those who first received it.',
  },
  {
    body: 'Extraia um princípio atemporal. Resuma, em uma frase, uma verdade sobre Deus ou sobre a vida cristã que continua válida hoje.',
    bodyEn: 'Extract a timeless principle. Summarize, in one sentence, a truth about God or the Christian life that still holds true today.',
  },
  {
    body: 'Escreva uma aplicação pessoal e prática. Transforme o princípio em uma ação concreta para sua vida esta semana — algo mensurável e realizável.',
    bodyEn: 'Write a personal, practical application. Turn the principle into a concrete action for your life this week — something measurable and achievable.',
  },
]

export default function InductiveMethodScreen({ session }) {
  const { lang } = session

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
      <div style={styles.body}>
        <div className="page-header" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('studies.inductiveMethodPageTitle', undefined, lang)}</h1>
        </div>

        <div style={styles.hero}>
          <p style={styles.heroText}>
            {lang === 'en'
              ? 'The Inductive Bible Study method is a way of reading Scripture that starts directly from the text to reach its conclusions — unlike the deductive method, which starts from an already-defined theme or doctrine and looks for verses to confirm it.'
              : 'O Estudo Bíblico Indutivo é um método de leitura das Escrituras que parte diretamente do texto para chegar às conclusões — ao contrário do método dedutivo, que parte de um tema ou doutrina já definida e busca versículos que o confirmem.'}
          </p>
        </div>

        <p style={styles.paragraph}>
          {lang === 'en'
            ? 'In the inductive approach, the reader sets preconceived ideas aside, slows down, and pays close attention to what the text actually says, before interpreting or applying anything. The goal is to let the Bible speak for itself, seeking to understand what the original author meant to communicate to their original audience — only then asking what that means for us today.'
            : 'Na abordagem indutiva, o leitor deixa de lado suas ideias pré-concebidas, desacelera e observa com atenção o que o texto realmente diz, antes de interpretar ou aplicar qualquer coisa. A meta é deixar que a Bíblia fale por si mesma, buscando entender o que o autor original quis comunicar ao seu público original — para só depois perguntar o que isso significa hoje, para nós.'}
        </p>
        <p style={styles.sectionTitle}>
          {lang === 'en' ? 'The four fundamental steps' : 'As quatro etapas fundamentais'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map((step, i) => (
            <div key={step.title} style={styles.stepCard}>
              <div style={styles.stepHeader}>
                <span style={styles.stepIcon}><AppIcon name={step.icon} size={16} color="var(--or)" /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.stepTitle}>{i + 1}. {lang === 'en' ? step.titleEn : step.title}</p>
                  <p style={styles.stepQuestion}>{lang === 'en' ? step.questionEn : step.question}</p>
                </div>
              </div>
              <p style={styles.paragraph}>{lang === 'en' ? step.bodyEn : step.body}</p>
            </div>
          ))}
        </div>

        <p style={styles.sectionTitle}>
          {lang === 'en' ? 'How to practice the method, step by step' : 'Como praticar o método, passo a passo'}
        </p>
        <div style={styles.panel}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PRACTICE_STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={styles.qNumber}>{i + 1}</span>
                <p style={styles.panelText}>{lang === 'en' ? step.bodyEn : step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sugestão de por onde começar — pedido explícito: sem isso, o
            passo "escolha uma passagem ou livro" fica abstrato demais pra
            quem nunca praticou o método. Filipenses é curta (4 capítulos),
            prática (bastante aplicação direta) e não exige contexto
            histórico pesado pra começar a observar. Bíblia de papel (não
            digital) porque o método pede sublinhar/circular/marcar o
            texto (ver "Como praticar o método" acima) — mais natural no
            papel do que numa tela. */}
        <div style={styles.tipCard}>
          <AppIcon name="Sparkles" size={16} color="var(--or)" />
          <p style={styles.tipText}>
            {lang === 'en'
              ? "Never practiced the method before? We suggest starting with the letter to the Philippians — short (just 4 chapters), practical, and full of direct, everyday application. We also recommend using a paper Bible instead of a digital one: underlining, circling, and marking up the text is a lot more natural on paper."
              : 'Nunca praticou o método antes? Sugerimos começar pela carta aos Filipenses — curta (só 4 capítulos), prática e cheia de aplicação direta pro dia a dia. Recomendamos também usar uma Bíblia de papel, não digital: sublinhar, circular e marcar o texto fica bem mais natural no papel do que numa tela.'}
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  body:         { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  hero:         { background: 'var(--grad-vivid)', borderRadius: 18, padding: 16, boxShadow: 'var(--shadow-glow)' },
  heroText:     { fontSize: 13, fontWeight: 600, color: 'white', lineHeight: 1.6 },
  paragraph:    { fontSize: 12.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.6 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: 'var(--g5)', letterSpacing: 0.5, textTransform: 'uppercase', margin: '6px 2px 0' },
  stepCard:     { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 18, padding: 14, boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 8 },
  stepHeader:   { display: 'flex', gap: 10, alignItems: 'flex-start' },
  stepIcon:     { width: 30, height: 30, borderRadius: 10, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepTitle:    { fontSize: 13.5, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  stepQuestion: { fontSize: 11.5, fontWeight: 600, color: 'var(--or)', fontStyle: 'italic', marginTop: 1 },
  panel:        { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  panelText:    { fontSize: 12.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.6 },
  qNumber:      { width: 20, height: 20, borderRadius: '50%', background: 'var(--or)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  tipCard:      { display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--olt)', border: '0.5px solid rgba(157,67,0,.2)', borderRadius: 16, padding: 14 },
  tipText:      { fontSize: 12, fontWeight: 600, color: 'var(--bk)', lineHeight: 1.55 },
}
