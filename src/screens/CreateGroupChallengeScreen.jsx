// CreateGroupChallengeScreen.jsx — 42m "Criar desafio" (handoff-admin-42,
// Bloco 3). Um campo de texto grande e nada mais — mesma decisão de 41b
// (CreateStudyScreen.jsx/CreateAiStudyScreen.jsx): o líder não traduz a
// necessidade dele em formulário, a IA que monta os dias.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { generateGroupChallenge } from '../groups/groupChallengesStore'
import { getGroupDetail } from '../groups/groupsStore'

const FONT = 'var(--font-bento)'

// Pílulas fixas (rótulo do HANDOFF); o TEXTO que cada uma insere no campo
// é minha escrita — o quadro só diz "preenchem o campo", não qual frase.
const STARTERS = [
  { key: 'john7', label: 'starterJohn7', text: 'Quero uma semana de leitura passando pelo Evangelho de João.' },
  { key: 'proverbs31', label: 'starterProverbs31', text: 'Quero um mês inteiro lendo um capítulo de Provérbios por dia.' },
  { key: 'hardWeek', label: 'starterHardWeek', text: 'O grupo está passando por uma semana difícil — queria uma leitura de Salmos que conforte.' },
  { key: 'advent', label: 'starterAdvent', text: 'Queria uma leitura especial de Advento, sobre a espera e a chegada de Jesus.' },
  { key: 'wedding', label: 'starterWedding', text: 'Tem um casal do grupo se casando — queria uma leitura sobre amor e aliança no casamento.' },
]

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function CreateGroupChallengeScreen({ session, groupId, onBack, onProposalReady }) {
  const lang = session.lang
  const L = (k, vars) => t(`createChallenge.${k}`, vars, lang)

  const [text, setText] = useState('')
  const [startsAt, setStartsAt] = useState(tomorrowISO())
  const [pauseGroupPlan, setPauseGroupPlan] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [groupName, setGroupName] = useState('')

  useEffect(() => {
    getGroupDetail(groupId).then(detail => setGroupName(detail?.name ?? ''))
  }, [groupId])

  async function handleGenerate() {
    if (!text.trim()) return
    setGenerating(true)
    setError('')
    try {
      const challenge = await generateGroupChallenge(groupId, text.trim(), lang)
      onProposalReady({ challenge, startsAt, pauseGroupPlan })
    } catch (err) {
      setError(err.message === 'subscription_required' ? L('subscriptionRequiredError') : L('genericError'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" style={s.closeBtn} onClick={onBack} aria-label={t('a11y.close', undefined, lang)}>
          <AppIcon name="X" size={16} strokeWidth={2.2} color="#fff" />
        </button>
        <p style={s.headerBadge}>{L('headerBadge', { group: groupName })}</p>
        <h1 style={s.title}>{L('title')}</h1>
        <p style={s.subtitle}>{L('subtitle')}</p>
      </div>

      <div style={s.body}>
        <textarea style={s.textarea} value={text} onChange={e => setText(e.target.value)} placeholder={L('placeholder')} />

        <p style={s.dividerLabel}>{L('orStartFrom')}</p>
        <div style={s.starterRow}>
          {STARTERS.map(st => (
            <button key={st.key} type="button" style={s.starterPill} onClick={() => setText(st.text)}>
              {L(st.label)}
            </button>
          ))}
        </div>

        <div style={s.card}>
          <label style={s.settingRow}>
            <span style={s.settingLabel}>{L('startsOnLabel')}</span>
            <input type="date" style={s.dateInput} value={startsAt} onChange={e => setStartsAt(e.target.value)} />
          </label>
          <div style={{ ...s.settingRow, borderTop: '1px solid var(--bento-line)' }}>
            <span style={s.settingLabel}>{L('pauseGroupPlanLabel')}</span>
            <button
              type="button" role="switch" aria-checked={pauseGroupPlan}
              style={{ ...s.toggle, background: pauseGroupPlan ? 'var(--bento-ink)' : 'var(--bento-toggle-off)', justifyContent: pauseGroupPlan ? 'flex-end' : 'flex-start' }}
              onClick={() => setPauseGroupPlan(v => !v)}
            >
              <span style={s.toggleThumb} />
            </button>
          </div>
        </div>

        {error && <p style={s.errorText}>{error}</p>}
      </div>

      <div style={s.footer}>
        <button type="button" style={{ ...s.submitBtn, ...(generating || !text.trim() ? s.submitBtnDisabled : {}) }} onClick={handleGenerate} disabled={generating || !text.trim()}>
          <span style={s.diamond} />
          {generating ? L('generatingBtn') : L('submitBtn')}
        </button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, padding: '24px 20px 22px', background: 'var(--bento-ink)', display: 'flex', flexDirection: 'column', gap: 4 },
  closeBtn: { width: 34, height: 34, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 10 },
  headerBadge: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: '0 0 10px' },
  title: { fontFamily: FONT, fontSize: 25, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.15, color: '#fff', margin: '0 0 8px' },
  subtitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.6)', margin: 0 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  textarea: { width: '100%', minHeight: 130, border: 'none', borderRadius: 20, padding: '16px 18px', fontFamily: FONT, fontSize: 15, fontWeight: 400, lineHeight: 1.5, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-card)', resize: 'none', caretColor: 'var(--bento-accent)' },
  dividerLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', textAlign: 'center', margin: '4px 0' },
  starterRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  starterPill: { border: 'none', borderRadius: 99, padding: '10px 16px', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

  card: { background: 'var(--bento-card)', borderRadius: 20, overflow: 'hidden' },
  settingRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, padding: '10px 18px' },
  settingLabel: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)' },
  dateInput: { border: 'none', background: 'none', fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: 'var(--bento-t3)', textAlign: 'right' },
  toggle: { width: 46, height: 28, borderRadius: 99, border: 'none', padding: 3, display: 'flex', cursor: 'pointer' },
  toggleThumb: { width: 22, height: 22, borderRadius: 99, background: '#fff' },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-destructive)', margin: 0 },

  footer: { flexShrink: 0, padding: '14px 20px calc(14px + var(--safe-bottom))' },
  submitBtn: { width: '100%', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', borderRadius: 18, background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  submitBtnDisabled: { opacity: .6, cursor: 'default' },
  diamond: { width: 9, height: 9, background: 'var(--bento-ink)', transform: 'rotate(45deg)', borderRadius: 2 },
}
