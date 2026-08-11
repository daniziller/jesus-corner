// ThemePlanScreen.jsx
// "Plano por tema" (IA) — a pessoa digita um tema, escolhe minutos por
// sessão, e a IA busca passagens relevantes na Bíblia inteira, divididas
// em sessões desse tamanho (ver api/generate-theme-plan.js). Alcançada só
// por um card em PlanScreen.jsx — não é aba própria, mesmo padrão não-aba
// de NotesScreen.jsx/ApplicationPhrasesScreen.jsx.
//
// Pra LER um plano gerado, em vez de construir um leitor novo, monta um
// "bloco" sintético em memória (só precisa de id/name/nameEn/sessionsTotal
// — os únicos campos que ReadingBlockView.jsx de fato lê do objeto block)
// e reaproveita o ReadingBlockView de verdade — hero, chips de capítulo,
// texto bíblico real, Contexto/Notas, marcar concluído, botão de ir pra
// Reflexão, tudo de graça. completedSet/onToggleSession/onToggleChapter
// são os MESMOS de sempre (vindos de App.jsx) — não existe um "concluído"
// separado por plano temático: ler Gênesis 4 aqui já conta pro progresso
// geral da Bíblia, porque é a mesma chave livro:capítulo de sempre.
import { useState, useEffect } from 'react'
import { getThemePlans, saveThemePlan, deleteThemePlan, generateThemePlan } from '../themePlans/themePlansStore'
import { sessionKeys } from '../utils/progress'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'

const DURATION_OPTIONS = [5, 10, 15, 20, 30]

export default function ThemePlanScreen({ session, authUser, completedSet, onToggleSession, onToggleChapter, onNavigate }) {
  const { lang } = session
  const [state, setState] = useState({ status: 'loading', plans: [] })
  const [activePlanId, setActivePlanId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [theme, setTheme] = useState('')
  const [minutes, setMinutes] = useState(10)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  useEffect(() => {
    if (!authUser?.email) { setState({ status: 'ready', plans: [] }); return }
    let cancelled = false
    getThemePlans(authUser.email)
      .then(plans => { if (!cancelled) setState({ status: 'ready', plans }) })
      .catch(err => {
        console.error('Failed to load theme plans', err)
        if (!cancelled) setState({ status: 'error', plans: [] })
      })
    return () => { cancelled = true }
  }, [authUser?.email])

  async function handleGenerate() {
    if (!theme.trim() || generating) return
    setGenerating(true)
    setGenError('')
    try {
      const plan = await generateThemePlan(theme.trim(), minutes, lang)
      await saveThemePlan(authUser.email, plan)
      setState(s => ({ ...s, plans: [plan, ...s.plans] }))
      setCreating(false)
      setTheme('')
      setActivePlanId(plan.id)
    } catch (err) {
      console.error('Failed to generate theme plan', err)
      setGenError(
        err.message === 'subscription_required'
          ? t('themePlan.subscriptionRequired', undefined, lang)
          : t('themePlan.generateError', undefined, lang)
      )
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(plan) {
    if (!window.confirm(t('themePlan.deleteConfirm', undefined, lang))) return
    try {
      await deleteThemePlan(authUser.email, plan.id)
      setState(s => ({ ...s, plans: s.plans.filter(p => p.id !== plan.id) }))
    } catch (err) {
      console.error('Failed to delete theme plan', err)
    }
  }

  const activePlan = state.plans.find(p => p.id === activePlanId)

  if (activePlan) {
    // Sessões com status calculado NA HORA a partir do completedSet
    // compartilhado — nunca guardado à parte, pra nunca dessincronizar
    // (ver comentário no topo do arquivo).
    const sessionsWithStatus = activePlan.sessions.map(s => ({
      ...s,
      status: sessionKeys(s).every(k => completedSet.has(k)) ? 'done' : 'pending',
    }))
    const syntheticBlock = {
      id: `theme:${activePlan.id}`,
      name: activePlan.theme,
      nameEn: activePlan.theme,
      sessionsTotal: sessionsWithStatus.length,
    }
    return (
      <ReadingBlockView
        session={session}
        authUser={authUser}
        onNavigate={onNavigate}
        blockId={syntheticBlock.id}
        blocks={[syntheticBlock]}
        sessionsByBlock={{ [syntheticBlock.id]: sessionsWithStatus }}
        mode="session"
        completedSet={completedSet}
        onToggleSession={onToggleSession}
        onToggleChapter={onToggleChapter}
        onBack={() => setActivePlanId(null)}
      />
    )
  }

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div style={styles.body}>
        <div className="page-header" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('themePlan.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('themePlan.heroSub', undefined, lang)}</p>
        </div>

        {creating ? (
          <div style={styles.createCard}>
            <p style={styles.createLabel}>{t('themePlan.themeLabel', undefined, lang)}</p>
            <input
              type="text"
              style={styles.themeInput}
              value={theme}
              onChange={e => setTheme(e.target.value)}
              placeholder={t('themePlan.themePlaceholder', undefined, lang)}
              maxLength={80}
              autoFocus
            />

            <p style={{ ...styles.createLabel, marginTop: 14 }}>{t('themePlan.minutesLabel', undefined, lang)}</p>
            <div style={styles.durationSel}>
              {DURATION_OPTIONS.map(n => (
                <button
                  key={n}
                  style={{ ...styles.durationBtn, ...(n === minutes ? styles.durationBtnActive : {}) }}
                  onClick={() => setMinutes(n)}
                >
                  <span style={styles.durationBtnNum}>{n}</span>
                  <span style={styles.durationBtnUnit}>{t('routine.min', undefined, lang)}</span>
                </button>
              ))}
            </div>

            {genError && <p style={styles.errorText}>{genError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={styles.generateBtn} onClick={handleGenerate} disabled={generating || !theme.trim()}>
                {generating ? t('themePlan.generating', undefined, lang) : t('themePlan.generateBtn', undefined, lang)}
              </button>
              <button style={styles.cancelBtn} onClick={() => { setCreating(false); setGenError('') }} disabled={generating}>
                {t('notes.cancelEdit', undefined, lang)}
              </button>
            </div>
          </div>
        ) : (
          <button style={styles.newPlanBtn} onClick={() => setCreating(true)}>
            <AppIcon name="Sparkles" size={16} color="white" />
            {t('themePlan.newPlanBtn', undefined, lang)}
          </button>
        )}

        {state.status === 'loading' && <p style={styles.emptyHint}>{t('themePlan.loading', undefined, lang)}</p>}
        {state.status === 'ready' && state.plans.length === 0 && !creating && (
          <p style={styles.emptyHint}>{t('themePlan.empty', undefined, lang)}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {state.plans.map(plan => {
            const doneCount = plan.sessions.filter(s => sessionKeys(s).every(k => completedSet.has(k))).length
            return (
              <div key={plan.id} style={styles.planCard}>
                <button style={styles.planCardMain} onClick={() => setActivePlanId(plan.id)}>
                  <span style={styles.planCardIcon}><AppIcon name="Sparkles" size={16} color="#A21CAF" /></span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={styles.planCardTheme}>{plan.theme}</span>
                    <span style={styles.planCardMeta}>
                      {t('themePlan.sessionsCount', { done: doneCount, total: plan.sessions.length }, lang)} · {plan.minutesPerSession} {t('routine.min', undefined, lang)}/{t('themePlan.perSession', undefined, lang)}
                    </span>
                  </span>
                  <AppIcon name="ChevronRight" size={16} color="var(--g4)" />
                </button>
                <button style={styles.planDeleteBtn} onClick={() => handleDelete(plan)} aria-label={t('themePlan.deleteAction', undefined, lang)}>
                  <AppIcon name="Trash2" size={13} color="var(--re)" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  body:       { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  heroSub:    { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: '0 2px' },
  emptyHint:  { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', padding: '24px 12px' },

  newPlanBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 14, padding: 13, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: '#A21CAF', boxShadow: '0 8px 20px rgba(162,28,175,.3)' },

  createCard:   { background: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', border: '0.5px dashed rgba(192,38,211,.4)', borderRadius: 18, padding: 14 },
  createLabel:  { fontSize: 9.5, fontWeight: 700, color: '#A21CAF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  themeInput:   { width: '100%', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'white' },
  durationSel:  { display: 'flex', gap: 6 },
  durationBtn:  { flex: 1, height: 44, borderRadius: 10, border: '0.5px solid var(--g2)', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--g5)', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 },
  durationBtnActive: { color: 'white', border: 'none', background: '#A21CAF' },
  durationBtnNum:  { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, lineHeight: 1 },
  durationBtnUnit: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, opacity: 0.75, lineHeight: 1 },
  errorText:    { fontSize: 11.5, fontWeight: 600, color: 'var(--re)', marginTop: 10 },
  generateBtn:  { flex: 1, background: '#A21CAF', border: 'none', borderRadius: 11, padding: 11, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },
  cancelBtn:    { flex: 1, background: 'white', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: 11, fontSize: 12.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },

  planCard:     { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 18, padding: 6, boxShadow: 'var(--shadow-card)' },
  planCardMain: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', padding: 7 },
  planCardIcon: { width: 32, height: 32, borderRadius: 10, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  planCardTheme:{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 1 },
  planCardMeta: { display: 'block', fontSize: 10.5, fontWeight: 500, color: 'var(--g5)' },
  planDeleteBtn:{ width: 30, height: 30, border: 'none', background: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
}
