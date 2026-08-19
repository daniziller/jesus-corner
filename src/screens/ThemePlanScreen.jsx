// ThemePlanScreen.jsx
// "Plano por tema" (IA) — a pessoa escolhe um título (só pra identificar o
// plano na lista) e descreve o escopo (o assunto de verdade, usado pra IA
// buscar as passagens). A IA busca passagens relevantes ao escopo na
// Bíblia inteira; cada passagem vira um "texto" do plano, com o tempo de
// leitura já calculado (ver api/generate-theme-plan.js/
// src/themePlans/themeTexts.js) — não existe mais ritmo dividindo isso em
// sessões de tamanho fixo, a pessoa escolhe quais textos ler a cada dia
// (checklist em PlanScreen.jsx). Alcançada só por um card em
// PlanScreen.jsx — não é aba própria, mesmo padrão não-aba de
// NotesScreen.jsx/ApplicationPhrasesScreen.jsx.
//
// A lista de planos salvos (`plans`) vem de fora (App.jsx) em vez de ser
// buscada aqui — App.jsx precisa dela pra saber as sessões do plano por
// tema ativo em Home/Rotina (ver resolveActivePlanSessions/buildSession),
// então essa tela deixou de ter fetch próprio; só repassa pra
// `onPlansChanged` a lista atualizada que saveThemePlan/deleteThemePlan já
// devolvem prontas. `autoOpenPlanId` abre direto num plano específico
// (usado pelo "Continuar sessão" da Home/Rotina quando o plano ativo é um
// plano por tema — ver App.jsx/continueToday), mesmo padrão de
// entryMode/initialBlockId que JourneyScreen.jsx já usa. `autoOpenKeys`
// (opcional, junto de autoOpenPlanId) restringe a leitura só aos textos
// escolhidos pra hoje (ver ThemeTextsChecklist em PlanScreen.jsx) — sem
// ele, mostra o plano inteiro (ex: abrindo pela lista completa abaixo).
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
import { themePlanTitle, themePlanProgress } from '../plan/resolveActivePlan'
import { deriveThemeTexts, themeTextKey } from '../themePlans/themeTexts'
import { sessionKeys } from '../utils/progress'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'
import { ThemeTextsChecklist } from './RoutineScreen'

// Mesmo limite e mesma janela (30 dias corridos, não mês-calendário) do
// servidor (ver MAX_PLANS_PER_MONTH/THIRTY_DAYS_MS em
// api/generate-theme-plan.js) — checado aqui também só pra dar feedback
// na hora, sem esperar a chamada falhar; o servidor reconfere de qualquer
// jeito antes de gastar uma chamada de IA.
const MAX_PLANS_PER_MONTH = 4
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
// Não existe mais ritmo escolhido pela pessoa pra plano por tema — esse
// valor só serve de dica de tamanho pro prompt da IA (ver
// buildSizeInstruction em api/_lib/ai.js), sem efeito visível.
const DEFAULT_PACE_ID = 'standard'

export default function ThemePlanScreen({ session, authUser, completedSet, plans, isAdmin, onPlansChanged, autoOpenPlanId, autoOpenKeys, onToggleSession, onToggleChapter, onNavigate, onAddSessionsToRoutine, onStartThemeReading, onGoToReflectionFrom }) {
  const { lang } = session
  const [activePlanId, setActivePlanId] = useState(autoOpenPlanId ?? null)
  // Plano recém-gerado (ainda não é o ativo do app) — em vez de já pular
  // pra leitura, mostra o checklist de textos de hoje (mesmo componente da
  // aba Plano) com um CTA pra ativar o plano e mandar pra Rotina, já com o
  // tempo escolhido (ver onAddSessionsToRoutine/App.jsx). Só existe entre
  // gerar o plano e a pessoa decidir; nunca reidratado de autoOpenPlanId.
  const [justCreatedPlan, setJustCreatedPlan] = useState(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  const recentPlansCount = plans.filter(p => p.createdAt && Date.now() - new Date(p.createdAt).getTime() < THIRTY_DAYS_MS).length
  // Conta admin (mesma allowlist de api/_lib/adminAuth.js, ver isAdmin em
  // App.jsx) fica de fora do limite — o servidor já pula a checagem pra ela
  // (ver api/generate-theme-plan.js), então a trava daqui só atrapalharia.
  const atPlanLimit = !isAdmin && recentPlansCount >= MAX_PLANS_PER_MONTH

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
      const plan = await generateThemePlan(title.trim(), scope.trim(), DEFAULT_PACE_ID, lang)
      const updated = await saveThemePlan(authUser.email, plan)
      onPlansChanged?.(updated)
      setCreating(false)
      setTitle('')
      setScope('')
      setJustCreatedPlan(plan)

      // As passagens que a IA escolheu podem coincidir com capítulos já
      // lidos antes, fora desse plano — sem desmarcar, o checklist de hoje
      // (ver ThemeTextsChecklist em PlanScreen.jsx) mostraria esses textos
      // como "concluído", travados pra não poderem ser escolhidos de novo,
      // mesmo sendo a primeira vez que a pessoa lê aquele texto DENTRO
      // desse plano temático.
      const newTexts = deriveThemeTexts(plan.passages)
      const alreadyReadTexts = newTexts.filter(txt => sessionKeys(txt).some(k => completedSet.has(k)))
      if (alreadyReadTexts.length > 0 && window.confirm(t('themePlan.unmarkReadConfirm', { count: alreadyReadTexts.length }, lang))) {
        alreadyReadTexts.forEach(txt => onToggleSession?.(txt, false))
      }
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

  if (justCreatedPlan) {
    return (
      <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
        <div style={styles.body}>
          <div style={styles.createdHeader}>
            <span style={styles.createdIcon}><AppIcon name="Sparkles" size={18} color="#A21CAF" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.createdTitle}>{t('themePlan.planCreatedTitle', undefined, lang)}</p>
              <p style={styles.createdSub}>{themePlanTitle(justCreatedPlan)}</p>
            </div>
            <button style={styles.createdCloseBtn} onClick={() => setJustCreatedPlan(null)} aria-label={t('notes.cancelEdit', undefined, lang)}>
              <AppIcon name="X" size={15} color="var(--g5)" />
            </button>
          </div>
          {justCreatedPlan.overview && <p style={styles.createdOverview}>{justCreatedPlan.overview}</p>}
          <ThemeTextsChecklist
            plan={justCreatedPlan}
            completedSet={completedSet}
            todayThemePicks={null}
            lang={lang}
            onOpenText={key => onStartThemeReading?.(justCreatedPlan.id, [key])}
            onAddToRoutine={keys => onAddSessionsToRoutine?.(justCreatedPlan.id, keys)}
            onStartReading={keys => onStartThemeReading?.(justCreatedPlan.id, keys)}
          />
        </div>
      </div>
    )
  }

  const activePlan = plans.find(p => p.id === activePlanId)

  if (activePlan) {
    // Sessões com status calculado NA HORA a partir do completedSet
    // compartilhado — nunca guardado à parte, pra nunca dessincronizar
    // (ver comentário no topo do arquivo). Planos com `passages` (formato
    // atual) derivam os textos na hora; planos bem antigos, sem `passages`,
    // caem no fallback das sessões estáticas de sempre.
    const allTexts = (activePlan.passages ? deriveThemeTexts(activePlan.passages) : (activePlan.sessions ?? [])).map(s => ({
      ...s,
      status: sessionKeys(s).every(k => completedSet.has(k)) ? 'done' : 'pending',
    }))
    // autoOpenKeys só vale enquanto está mostrando EXATAMENTE o plano pro
    // qual ele foi passado — sem essa checagem, tocar num plano diferente
    // na lista logo abaixo (setActivePlanId) podia herdar chaves de outro
    // plano por engano.
    const restrictKeys = activePlanId === autoOpenPlanId ? autoOpenKeys : null
    const restricted = restrictKeys ? allTexts.filter(s => restrictKeys.includes(themeTextKey(s))) : null
    // Nunca deixa ReadingBlockView.jsx receber uma lista vazia (ele sempre
    // espera ter pelo menos 1 sessão pra destacar) — se a restrição não
    // bateu com nada (chave desatualizada, por exemplo), mostra o plano
    // inteiro em vez de travar.
    const sessionsWithStatus = restricted?.length ? restricted : allTexts
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
        onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'themePlan', planId: activePlan.id, keys: [themeTextKey(heroSession)] })}
      />
    )
  }

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
      <div style={styles.body}>
        <div className="page-header" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('themePlan.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('themePlan.heroSub', undefined, lang)}</p>
          {/* Contador de quantos planos ainda dá pra criar esse mês — só
              enquanto não bateu no limite (atPlanLimit já mostra uma
              mensagem própria, mais completa, nesse caso — ver abaixo) e só
              pra quem tem limite de verdade (conta admin nunca bate nele,
              ver isAdmin). */}
          {!isAdmin && !atPlanLimit && (
            <p style={styles.plansRemainingNote}>
              {t('themePlan.plansRemaining', { remaining: MAX_PLANS_PER_MONTH - recentPlansCount, total: MAX_PLANS_PER_MONTH }, lang)}
            </p>
          )}
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

            {genError && <p style={styles.errorText}>{genError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={styles.generateBtn} onClick={handleGenerate} disabled={generating || !title.trim() || !scope.trim()}>
                {generating ? t('themePlan.generating', undefined, lang) : t('themePlan.generateBtn', undefined, lang)}
              </button>
              <button style={styles.cancelBtn} onClick={() => { setCreating(false); setGenError('') }} disabled={generating}>
                {t('notes.cancelEdit', undefined, lang)}
              </button>
            </div>

            {generating && <p style={styles.generatingHint}>{t('themePlan.generatingHint', undefined, lang)}</p>}
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
            const progress = themePlanProgress(plan, completedSet)
            return (
              <div key={plan.id} style={styles.planCard}>
                <button style={styles.planCardMain} onClick={() => setActivePlanId(plan.id)}>
                  <span style={styles.planCardIcon}><AppIcon name="Sparkles" size={16} color="#A21CAF" /></span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={styles.planCardTheme}>{themePlanTitle(plan)}</span>
                    <span style={styles.planCardMeta}>
                      {t('themePlan.sessionsCount', { done: progress.done, total: progress.total }, lang)}
                      {progress.totalMinutes != null && ` · ~${progress.totalMinutes} ${t('routine.min', undefined, lang)}`}
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

  createdHeader:  { display: 'flex', alignItems: 'center', gap: 10 },
  createdIcon:    { width: 36, height: 36, borderRadius: 11, background: '#FAE8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  createdTitle:   { fontSize: 14, fontWeight: 800, color: 'var(--bk)', margin: 0 },
  createdSub:     { fontSize: 12, fontWeight: 600, color: 'var(--g5)', margin: '1px 0 0' },
  createdCloseBtn:{ width: 28, height: 28, border: 'none', background: 'var(--g1)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  createdOverview:{ fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: '2px 2px 0' },
  heroSub:    { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: '0 2px' },
  plansRemainingNote: { fontSize: 11, fontWeight: 600, color: '#A21CAF', lineHeight: 1.4, margin: '4px 2px 0' },
  emptyHint:  { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', padding: '24px 12px' },
  limitHint:  { fontSize: 12, fontWeight: 600, color: 'var(--g5)', textAlign: 'center', background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 14, padding: 13 },

  newPlanBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 14, padding: 13, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: '#A21CAF', boxShadow: '0 8px 20px rgba(162,28,175,.3)' },

  createCard:   { background: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', border: '0.5px dashed rgba(192,38,211,.4)', borderRadius: 18, padding: 14 },
  createLabel:  { fontSize: 9.5, fontWeight: 700, color: '#A21CAF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  themeInput:   { width: '100%', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'white' },
  scopeInput:   { width: '100%', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', outline: 'none', background: 'white', resize: 'vertical', lineHeight: 1.4 },
  errorText:    { fontSize: 11.5, fontWeight: 600, color: 'var(--re)', marginTop: 10 },
  generatingHint: { fontSize: 11, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', lineHeight: 1.4, marginTop: 10 },
  generateBtn:  { flex: 1, background: '#A21CAF', border: 'none', borderRadius: 11, padding: 11, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },
  cancelBtn:    { flex: 1, background: 'white', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: 11, fontSize: 12.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },

  planCard:     { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 18, padding: 6, boxShadow: 'var(--shadow-card)' },
  planCardMain: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', padding: 7 },
  planCardIcon: { width: 32, height: 32, borderRadius: 10, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  planCardTheme:{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 1 },
  planCardMeta: { display: 'block', fontSize: 10.5, fontWeight: 500, color: 'var(--g5)' },
  planDeleteBtn:{ width: 30, height: 30, border: 'none', background: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
}
