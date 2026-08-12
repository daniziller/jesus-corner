// ThemePlanScreen.jsx
// "Plano por tema" (IA) — a pessoa escolhe um título (só pra identificar o
// plano na lista) e descreve o escopo (o assunto de verdade, usado pra IA
// buscar as passagens), mais o ritmo de leitura (Leve/Padrão/Intensivo/
// Livre — mesmo conjunto do resto do app, em vez de minutos escolhidos na
// hora). A IA busca passagens relevantes ao escopo na Bíblia inteira,
// divididas em sessões do tamanho do ritmo escolhido (ver
// api/generate-theme-plan.js). Alcançada só por um card em PlanScreen.jsx
// — não é aba própria, mesmo padrão não-aba de NotesScreen.jsx/
// ApplicationPhrasesScreen.jsx.
//
// A lista de planos salvos (`plans`) vem de fora (App.jsx) em vez de ser
// buscada aqui — App.jsx precisa dela pra saber as sessões do plano por
// tema ativo em Home/Rotina (ver resolveActivePlanSessions/buildSession),
// então essa tela deixou de ter fetch próprio; só repassa pra
// `onPlansChanged` a lista atualizada que saveThemePlan/deleteThemePlan já
// devolvem prontas. `autoOpenPlanId` abre direto num plano específico
// (usado pelo "Continuar sessão" da Home/Rotina quando o plano ativo é um
// plano por tema — ver App.jsx/continueToday), mesmo padrão de
// entryMode/initialBlockId que JourneyScreen.jsx já usa.
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
import { saveThemePlan, deleteThemePlan, generateThemePlan } from '../themePlans/themePlansStore'
import { themePlanTitle, themePlanReadingMinutes } from '../plan/resolveActivePlan'
import { PLANS } from '../data/bibleBlocks'
import { sessionKeys } from '../utils/progress'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'

// Mesmo limite e mesma janela (30 dias corridos, não mês-calendário) do
// servidor (ver MAX_PLANS_PER_MONTH/THIRTY_DAYS_MS em
// api/generate-theme-plan.js) — checado aqui também só pra dar feedback
// na hora, sem esperar a chamada falhar; o servidor reconfere de qualquer
// jeito antes de gastar uma chamada de IA.
const MAX_PLANS_PER_MONTH = 4
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export default function ThemePlanScreen({ session, authUser, completedSet, plans, onPlansChanged, autoOpenPlanId, onToggleSession, onToggleChapter, onNavigate }) {
  const { lang } = session
  const [activePlanId, setActivePlanId] = useState(autoOpenPlanId ?? null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [paceId, setPaceId] = useState('standard')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  const recentPlansCount = plans.filter(p => p.createdAt && Date.now() - new Date(p.createdAt).getTime() < THIRTY_DAYS_MS).length
  const atPlanLimit = recentPlansCount >= MAX_PLANS_PER_MONTH

  // Re-sincroniza sempre que App.jsx pedir pra abrir um plano específico
  // (ex: "Continuar sessão" clicado de novo com essa aba já montada) —
  // mesmo padrão de JourneyScreen.jsx pra entryMode/initialBlockId.
  useEffect(() => {
    if (autoOpenPlanId) setActivePlanId(autoOpenPlanId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenPlanId])

  async function handleGenerate() {
    if (!title.trim() || !scope.trim() || generating) return
    setGenerating(true)
    setGenError('')
    try {
      const plan = await generateThemePlan(title.trim(), scope.trim(), paceId, lang)
      const updated = await saveThemePlan(authUser.email, plan)
      onPlansChanged?.(updated)
      setCreating(false)
      setTitle('')
      setScope('')
      setActivePlanId(plan.id)
    } catch (err) {
      console.error('Failed to generate theme plan', err)
      setGenError(
        err.message === 'subscription_required' ? t('themePlan.subscriptionRequired', undefined, lang)
        : err.message === 'plan_limit_reached' ? t('themePlan.limitReached', undefined, lang)
        : t('themePlan.generateError', undefined, lang)
      )
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(plan) {
    if (!window.confirm(t('themePlan.deleteConfirm', undefined, lang))) return
    try {
      const updated = await deleteThemePlan(authUser.email, plan.id)
      onPlansChanged?.(updated)
    } catch (err) {
      console.error('Failed to delete theme plan', err)
    }
  }

  const activePlan = plans.find(p => p.id === activePlanId)

  if (activePlan) {
    // Sessões com status calculado NA HORA a partir do completedSet
    // compartilhado — nunca guardado à parte, pra nunca dessincronizar
    // (ver comentário no topo do arquivo).
    const sessionsWithStatus = activePlan.sessions.map(s => ({
      ...s,
      status: sessionKeys(s).every(k => completedSet.has(k)) ? 'done' : 'pending',
    }))
    const activePlanTitleText = themePlanTitle(activePlan)
    const syntheticBlock = {
      id: `theme:${activePlan.id}`,
      name: activePlanTitleText,
      nameEn: activePlanTitleText,
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
            <p style={styles.createLabel}>{t('themePlan.titleLabel', undefined, lang)}</p>
            <input
              type="text"
              style={styles.themeInput}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('themePlan.titlePlaceholder', undefined, lang)}
              maxLength={60}
              autoFocus
            />

            <p style={{ ...styles.createLabel, marginTop: 14 }}>{t('themePlan.scopeLabel', undefined, lang)}</p>
            <textarea
              style={styles.scopeInput}
              value={scope}
              onChange={e => setScope(e.target.value)}
              placeholder={t('themePlan.scopePlaceholder', undefined, lang)}
              maxLength={200}
              rows={3}
            />

            <p style={{ ...styles.createLabel, marginTop: 14 }}>{t('themePlan.paceLabel', undefined, lang)}</p>
            <div style={styles.durationSel}>
              {PLANS.map(p => (
                <button
                  key={p.id}
                  style={{ ...styles.durationBtn, ...(p.id === paceId ? styles.durationBtnActive : {}) }}
                  onClick={() => setPaceId(p.id)}
                >
                  <AppIcon name={p.icon} size={14} color={p.id === paceId ? 'white' : 'var(--g4)'} />
                  <span style={styles.durationBtnLabel}>{lang === 'en' ? p.labelEn : p.label}</span>
                  <span style={{ ...styles.durationBtnTime, ...(p.id === paceId ? styles.durationBtnTimeActive : {}) }}>
                    {p.readingMinutes != null ? t('journey.minPerDay', { n: p.readingMinutes }, lang) : t('journey.noTimeTarget', undefined, lang)}
                  </span>
                </button>
              ))}
            </div>

            {genError && <p style={styles.errorText}>{genError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={styles.generateBtn} onClick={handleGenerate} disabled={generating || !title.trim() || !scope.trim()}>
                {generating ? t('themePlan.generating', undefined, lang) : t('themePlan.generateBtn', undefined, lang)}
              </button>
              <button style={styles.cancelBtn} onClick={() => { setCreating(false); setGenError('') }} disabled={generating}>
                {t('notes.cancelEdit', undefined, lang)}
              </button>
            </div>
          </div>
        ) : atPlanLimit ? (
          <p style={styles.limitHint}>{t('themePlan.limitReached', undefined, lang)}</p>
        ) : (
          <button style={styles.newPlanBtn} onClick={() => setCreating(true)}>
            <AppIcon name="Sparkles" size={16} color="white" />
            {t('themePlan.newPlanBtn', undefined, lang)}
          </button>
        )}

        {plans.length === 0 && !creating && (
          <p style={styles.emptyHint}>{t('themePlan.empty', undefined, lang)}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {plans.map(plan => {
            const doneCount = plan.sessions.filter(s => sessionKeys(s).every(k => completedSet.has(k))).length
            return (
              <div key={plan.id} style={styles.planCard}>
                <button style={styles.planCardMain} onClick={() => setActivePlanId(plan.id)}>
                  <span style={styles.planCardIcon}><AppIcon name="Sparkles" size={16} color="#A21CAF" /></span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={styles.planCardTheme}>{themePlanTitle(plan)}</span>
                    <span style={styles.planCardMeta}>
                      {t('themePlan.sessionsCount', { done: doneCount, total: plan.sessions.length }, lang)}
                      {themePlanReadingMinutes(plan) != null && ` · ${themePlanReadingMinutes(plan)} ${t('routine.min', undefined, lang)}/${t('themePlan.perSession', undefined, lang)}`}
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
  limitHint:  { fontSize: 12, fontWeight: 600, color: 'var(--g5)', textAlign: 'center', background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 14, padding: 13 },

  newPlanBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 14, padding: 13, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: '#A21CAF', boxShadow: '0 8px 20px rgba(162,28,175,.3)' },

  createCard:   { background: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', border: '0.5px dashed rgba(192,38,211,.4)', borderRadius: 18, padding: 14 },
  createLabel:  { fontSize: 9.5, fontWeight: 700, color: '#A21CAF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  themeInput:   { width: '100%', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'white' },
  scopeInput:   { width: '100%', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', outline: 'none', background: 'white', resize: 'vertical', lineHeight: 1.4 },
  durationSel:  { display: 'flex', gap: 6, flexWrap: 'wrap' },
  durationBtn:  { flex: '1 1 0', minWidth: 70, padding: '8px 6px', borderRadius: 10, border: '0.5px solid var(--g2)', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--g5)', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 },
  durationBtnActive: { color: 'white', border: 'none', background: '#A21CAF' },
  durationBtnLabel: { fontSize: 11, fontWeight: 700 },
  durationBtnTime: { fontSize: 8.5, fontWeight: 700, color: 'var(--g4)' },
  durationBtnTimeActive: { color: 'rgba(255,255,255,.8)' },
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
