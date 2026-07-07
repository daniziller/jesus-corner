import { useState } from 'react'
import { currentLanguage } from '../../i18n'

const ACTS_DATA = [
  {
    id: 'A',
    letter: 'A',
    title: { pt: 'Adoração', en: 'Adoration' },
    subtitle: { pt: 'Louve quem Deus é', en: 'Praise who God is' },
    duration: { pt: '4 min', en: '4 min' },
    bgColor: 'rgba(249,115,22,.1)',
    letterColor: '#C2410C',
    borderColor: 'rgba(249,115,22,.4)',
    stepBg: '#FFF7ED',
    dotColor: '#EA580C',
    glow: 'rgba(249,115,22,.28)',
    verseBg: '#FFF7ED',
    verseBorder: '#EA580C',
    verseRefColor: '#C2410C',
    description: {
      pt: 'Comece focando em <b>quem Deus é</b>, não no que Ele fez. Declare Seus atributos com louvor genuíno.',
      en: 'Start by focusing on <b>who God is</b>, not what He has done. Declare His attributes with genuine praise.',
    },
    steps: {
      pt: [
        'Declare: <b>"Deus, Tu és Santo, Soberano, Eterno, Fiel..."</b>',
        'Use um <b>Salmo de louvor</b>: Salmo 145, 148 ou 150.',
        'Evite pedir. Foque em <b>contemplar Deus</b>.',
      ],
      en: [
        'Declare: <b>"God, You are Holy, Sovereign, Eternal, Faithful..."</b>',
        'Use a <b>psalm of praise</b>: Psalm 145, 148, or 150.',
        "Avoid asking for anything. Focus on <b>contemplating God</b>.",
      ],
    },
    verse: {
      pt: '"Grande é o Senhor e digníssimo de louvor; a sua grandeza é inescrutável."',
      en: '"Great is the Lord and most worthy of praise; his greatness no one can fathom."',
    },
    verseRef: { pt: 'Salmos 145:3', en: 'Psalm 145:3' },
  },
  {
    id: 'C',
    letter: 'C',
    title: { pt: 'Confissão', en: 'Confession' },
    subtitle: { pt: 'Reconheça seus pecados', en: 'Acknowledge your sins' },
    duration: { pt: '3 min', en: '3 min' },
    bgColor: 'rgba(220,38,38,.1)',
    letterColor: '#B91C1C',
    borderColor: 'rgba(220,38,38,.4)',
    stepBg: '#FFF1F2',
    dotColor: '#DC2626',
    glow: 'rgba(220,38,38,.28)',
    verseBg: '#FFF1F2',
    verseBorder: '#DC2626',
    verseRefColor: '#B91C1C',
    description: {
      pt: 'Com humildade, traga diante de Deus os pecados da semana — em pensamento, palavra ou ação.',
      en: "With humility, bring before God this week's sins — in thought, word, or deed.",
    },
    steps: {
      pt: [
        'Pergunte: <b>"Senhor, em que pequei esta semana?"</b> e espere.',
        'Confesse <b>especificamente</b>, sem generalizações.',
        'Depois, <b>receba o perdão</b> pela fé.',
      ],
      en: [
        'Ask: <b>"Lord, where have I sinned this week?"</b> and wait.',
        'Confess <b>specifically</b>, without generalizing.',
        'Then, <b>receive forgiveness</b> by faith.',
      ],
    },
    verse: {
      pt: '"Se confessarmos os nossos pecados, ele é fiel e justo para perdoar."',
      en: 'If we confess our sins, he is faithful and just and will forgive us.',
    },
    verseRef: { pt: '1 João 1:9', en: '1 John 1:9' },
  },
  {
    id: 'T',
    letter: 'T',
    title: { pt: 'Ação de Graças', en: 'Thanksgiving' },
    subtitle: { pt: 'Expresse gratidão', en: 'Express gratitude' },
    duration: { pt: '4 min', en: '4 min' },
    bgColor: 'rgba(22,163,74,.1)',
    letterColor: '#15803D',
    borderColor: 'rgba(22,163,74,.4)',
    stepBg: '#F0FDF4',
    dotColor: '#16A34A',
    glow: 'rgba(22,163,74,.28)',
    verseBg: '#F0FDF4',
    verseBorder: '#16A34A',
    verseRefColor: '#15803D',
    description: {
      pt: 'Aqui você agradece pelo que Deus <b>fez</b> — bênçãos concretas da sua vida.',
      en: 'Here you thank God for what He has <b>done</b> — concrete blessings in your life.',
    },
    steps: {
      pt: [
        'Liste <b>3 a 5 coisas específicas</b> pelas quais é grato hoje.',
        'Inclua também <b>dificuldades</b> pelas quais pode agradecer.',
        'Agradeça pelo <b>estudo de hoje</b> e pelo que Deus falou pela Palavra.',
      ],
      en: [
        "List <b>3 to 5 specific things</b> you're grateful for today.",
        "Also include <b>hardships</b> you can be thankful for.",
        "Thank God for <b>today's study</b> and what He spoke through the Word.",
      ],
    },
    verse: {
      pt: '"Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus."',
      en: 'Give thanks in all circumstances; for this is God\'s will for you in Christ Jesus.',
    },
    verseRef: { pt: '1 Tessalonicenses 5:18', en: '1 Thessalonians 5:18' },
  },
  {
    id: 'S',
    letter: 'S',
    title: { pt: 'Súplicas', en: 'Supplication' },
    subtitle: { pt: 'Apresente seus pedidos', en: 'Bring your requests' },
    duration: { pt: '4 min', en: '4 min' },
    bgColor: 'rgba(79,70,229,.1)',
    letterColor: '#4338CA',
    borderColor: 'rgba(79,70,229,.4)',
    stepBg: '#EEF2FF',
    dotColor: '#4F46E5',
    glow: 'rgba(79,70,229,.28)',
    verseBg: '#EEF2FF',
    verseBorder: '#4F46E5',
    verseRefColor: '#4338CA',
    description: {
      pt: 'Com o coração preparado, traga seus pedidos a Deus — e os dos outros.',
      en: "With your heart prepared, bring your requests to God — and those of others.",
    },
    steps: {
      pt: [
        'Comece por <b>outros</b> antes de pedir por si mesmo.',
        'Ore com <b>fé e especificidade</b>.',
        'Encerre: <b>"Seja feita a Tua vontade, não a minha."</b>',
      ],
      en: [
        'Start with <b>others</b> before asking for yourself.',
        'Pray with <b>faith and specificity</b>.',
        'Close with: <b>"Your will be done, not mine."</b>',
      ],
    },
    verse: {
      pt: '"Em tudo sejam conhecidas, diante de Deus, as vossas petições."',
      en: 'In every situation, by prayer and petition, present your requests to God.',
    },
    verseRef: { pt: 'Filipenses 4:6', en: 'Philippians 4:6' },
  },
]

export default function ActsCard({ data }) {
  const [open, setOpen] = useState(false)
  const lang = currentLanguage()
  const pick = (field) => field[lang] ?? field.pt

  return (
    <div
      style={{
        background: 'var(--white)',
        border: `0.5px solid ${open ? data.borderColor : 'var(--g1)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: open ? `0 10px 24px ${data.glow}` : 'var(--shadow-card)',
        cursor: 'pointer',
        transition: 'border-color .2s, box-shadow .2s',
      }}
      onClick={() => setOpen(v => !v)}
    >
      {/* Header */}
      <div style={{ padding: 13, display: 'flex', alignItems: 'center', gap: 11, userSelect: 'none' }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: data.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: data.letterColor, lineHeight: 1 }}>{data.letter}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--bk)', marginBottom: 1 }}>{pick(data.title)}</div>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--g5)' }}>{pick(data.subtitle)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: data.letterColor }}>{pick(data.duration)}</span>
          <span style={{ fontSize: 13, color: 'var(--g4)', fontWeight: 600, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }}>∨</span>
        </div>
      </div>

      {/* Body expansível */}
      {open && (
        <div style={{ padding: '0 13px 13px' }} onClick={e => e.stopPropagation()}>
          <div style={{ height: 0.5, background: 'var(--g2)', marginBottom: 12 }} />

          {/* Descrição */}
          <p
            style={{ fontSize: 11.5, fontWeight: 500, color: '#1C1C1E', lineHeight: 1.65, marginBottom: 11 }}
            dangerouslySetInnerHTML={{ __html: pick(data.description) }}
          />

          {/* Passos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pick(data.steps).map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 11px', borderRadius: 9, background: data.stepBg }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: data.dotColor, flexShrink: 0, marginTop: 4 }} />
                <p style={{ fontSize: 11.5, fontWeight: 500, color: '#1C1C1E', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: step }} />
              </div>
            ))}
          </div>

          {/* Versículo */}
          <div style={{ borderRadius: 9, padding: '10px 12px', marginTop: 10, borderLeft: `3px solid ${data.verseBorder}`, background: data.verseBg }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#1C1C1E', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 4 }}>
              {pick(data.verse)}
            </p>
            <span style={{ fontSize: 10, fontWeight: 700, color: data.verseRefColor, letterSpacing: 0.3 }}>
              {pick(data.verseRef)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export { ACTS_DATA }
