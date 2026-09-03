// GuestPaceScreen.jsx — "Entrada" (redesign 1g/etapa 7), tela 1 de 2.
//
// A única pergunta antes de ler: quanto tempo por dia. Sem conta, sem
// consentimento, sem idade — isso tudo entra só no cadastro (ver
// GuestSaveInviteScreen.jsx), depois da primeira leitura. Escolher aqui já
// entra direto na leitura (App.jsx/startGuestReading), sem tela intermediária.
import { useState } from 'react'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { PLANS } from '../data/bibleBlocks'
import AppIcon from '../icons/AppIcon'

// Só 3 dos 4 ritmos do app entram aqui — "Livre" (sem meta de tempo) é uma
// opção pra quem já sabe o que quer, não faz sentido como 1ª pergunta pra
// quem nunca abriu o app. Usa os valores REAIS de src/data/bibleBlocks.js
// (minutesPerDay/avgChapters) em vez de inventar números novos.
const OPTION_IDS = ['light', 'standard', 'intensive']

export default function GuestPaceScreen({ onStart, onGoLogin }) {
  const lang = getAppLanguage() ?? 'pt'
  const [planId, setPlanId] = useState('standard')
  const [starting, setStarting] = useState(false)
  const L = (k, vars) => t(`guestEntry.${k}`, vars, lang)

  async function handleStart() {
    if (starting) return
    setStarting(true)
    try {
      await onStart(planId)
    } catch (err) {
      console.error('Failed to start guest reading', err)
      setStarting(false)
    }
  }

  return (
    <div style={styles.screen}>
      <div style={styles.brandMark}><AppIcon name="BookOpen" size={20} color="white" /></div>
      <p style={styles.stepLabel}>{L('stepLabel')}</p>
      <h1 style={styles.title}>{L('title')}</h1>
      <p style={styles.subtitle}>{L('subtitle')}</p>

      <div style={styles.options}>
        {OPTION_IDS.map(id => {
          const plan = PLANS.find(p => p.id === id)
          const selected = planId === id
          const label = lang === 'en' ? plan.labelEn : plan.label
          return (
            <button
              key={id}
              style={{ ...styles.option, ...(selected ? styles.optionSelected : {}) }}
              onClick={() => setPlanId(id)}
            >
              <span style={{ ...styles.optionMin, color: selected ? 'white' : 'white' }}>{plan.minutesPerDay}</span>
              <span style={styles.optionText}>
                <span style={{ ...styles.optionLabel, color: selected ? 'white' : 'rgba(245,233,222,.85)' }}>{label}</span>
                <span style={{ ...styles.optionSub, color: selected ? 'rgba(255,255,255,.85)' : 'rgba(245,233,222,.6)' }}>
                  {L('optionSub', { label, n: plan.avgChapters })}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div style={styles.footer}>
        <button style={styles.startBtn} onClick={handleStart} disabled={starting}>
          {starting ? L('starting') : L('startBtn')}
        </button>
        <p style={styles.footerNote}>{L('footerNote')}</p>
        <button style={styles.loginLink} onClick={onGoLogin}>{L('goLoginLink')}</button>
      </div>
    </div>
  )
}

const styles = {
  screen: {
    minHeight: '100%', background: 'var(--bk)', padding: '56px 30px 40px',
    display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
  },
  brandMark: {
    width: 44, height: 44, borderRadius: 12, background: 'var(--grad-vivid)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  stepLabel: { fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#E08A3C', margin: '0 0 12px' },
  title: {
    fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-1px',
    color: 'white', lineHeight: 1.15, margin: '0 0 10px',
  },
  subtitle: { fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: 'rgba(245,233,222,.65)', margin: '0 0 30px' },
  options: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 'auto' },
  option: {
    height: 62, borderRadius: 16, border: '1px solid rgba(245,233,222,.2)', background: 'none',
    display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', cursor: 'pointer', textAlign: 'left',
  },
  optionSelected: { background: 'var(--grad-primary)', border: 'none', boxShadow: 'var(--shadow-glow)' },
  optionMin: { width: 44, flexShrink: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 },
  optionText: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  optionLabel: { fontSize: 14, fontWeight: 700 },
  optionSub: { fontSize: 12, fontWeight: 500 },
  footer: { paddingTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  startBtn: {
    width: '100%', height: 54, borderRadius: 99, border: 'none', background: 'white',
    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--or)', cursor: 'pointer',
  },
  footerNote: { fontSize: 12.5, fontWeight: 500, color: 'rgba(245,233,222,.45)', textAlign: 'center', margin: '12px 0 18px' },
  loginLink: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'rgba(245,233,222,.55)', fontFamily: 'var(--font)' },
}
