// ThemePlanScreen.jsx
// Lista de planos por tema/livro salvos + o leitor de um plano ativo.
// Criar um plano novo mora em CreateStudyScreen.jsx (22a) e
// StudyProposalScreen.jsx (22b) desde a Etapa 10 — esta tela só lista o
// que já existe (`onCreateStudy` abre 22a) e lê um plano já salvo.
//
// A lista de planos salvos (`plans`) vem de fora (App.jsx) em vez de ser
// buscada aqui — App.jsx precisa dela pra saber as sessões do plano por
// tema ativo em Home/Rotina (ver resolveActivePlanSessions/buildSession),
// então essa tela deixou de ter fetch próprio; só repassa pra
// `onPlansChanged` a lista atualizada que deleteThemePlan devolve pronta.
// `autoOpenPlanId` abre direto num plano específico (usado pelo
// "Continuar sessão" da Home/Rotina quando o plano ativo é um plano por
// tema — ver App.jsx/continueToday), mesmo padrão de entryMode/
// initialBlockId que JourneyScreen.jsx já usa. `autoOpenKeys` (opcional,
// junto de autoOpenPlanId) restringe a leitura só aos textos escolhidos
// pra hoje — sem ele, mostra o plano inteiro.
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
import { deleteThemePlan } from '../themePlans/themePlansStore'
import { themePlanTitle, themePlanProgress } from '../plan/resolveActivePlan'
import { deriveThemeTexts, themeTextKey } from '../themePlans/themeTexts'
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

export default function ThemePlanScreen({ session, authUser, completedSet, plans, isAdmin, onPlansChanged, autoOpenPlanId, autoOpenKeys, onToggleSession, onToggleChapter, onNavigate, onCreateStudy, onGoToReflectionFrom }) {
  const { lang } = session
  const [activePlanId, setActivePlanId] = useState(autoOpenPlanId ?? null)

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

        {atPlanLimit ? (
          <p style={styles.limitHint}>{t('themePlan.limitReached', undefined, lang)}</p>
        ) : (
          <button style={styles.newPlanBtn} onClick={onCreateStudy}>
            <AppIcon name="Sparkles" size={16} color="white" />
            {t('themePlan.newPlanBtn', undefined, lang)}
          </button>
        )}

        {plans.length === 0 && (
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

  heroSub:    { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: '0 2px' },
  plansRemainingNote: { fontSize: 11, fontWeight: 600, color: '#A21CAF', lineHeight: 1.4, margin: '4px 2px 0' },
  emptyHint:  { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', padding: '24px 12px' },
  limitHint:  { fontSize: 12, fontWeight: 600, color: 'var(--g5)', textAlign: 'center', background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 14, padding: 13 },

  newPlanBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 14, padding: 13, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: '#A21CAF', boxShadow: '0 8px 20px rgba(162,28,175,.3)' },

  planCard:     { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 18, padding: 6, boxShadow: 'var(--shadow-card)' },
  planCardMain: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', padding: 7 },
  planCardIcon: { width: 32, height: 32, borderRadius: 10, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  planCardTheme:{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 1 },
  planCardMeta: { display: 'block', fontSize: 10.5, fontWeight: 500, color: 'var(--g5)' },
  planDeleteBtn:{ width: 30, height: 30, border: 'none', background: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
}
