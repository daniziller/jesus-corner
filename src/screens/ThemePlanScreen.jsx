// ThemePlanScreen.jsx
// Lista de planos por tema/livro salvos + o leitor de um plano ativo.
// Criar um plano novo mora em AddStudyScreen.jsx (26e, entrada real desde
// o Bloco 12) → CreateStudyScreen.jsx (22a) → StudyProposalScreen.jsx
// (22b/26f) — esta tela só lista o que já existe (`onCreateStudy` abre
// 26e) e lê um plano já salvo.
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
//
// Lista sem quadro no handoff (a criação, 22a/22b, já é Bento desde a
// Etapa 10) — cabeçalho e cartões seguem o mesmo padrão de tela
// secundária já usado em GroupAdminScreen.jsx/GroupsScreen.jsx.
import { useState, useEffect } from 'react'
import { deleteThemePlan } from '../themePlans/themePlansStore'
import { themePlanTitle, themePlanProgress } from '../plan/resolveActivePlan'
import { deriveThemeTexts, themeTextKey } from '../themePlans/themeTexts'
import { sessionKeys } from '../utils/progress'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'

const FONT = 'var(--font-bento)'

// Mesmo limite e mesma janela (30 dias corridos, não mês-calendário) do
// servidor (ver MAX_PLANS_PER_MONTH/THIRTY_DAYS_MS em
// api/generate-theme-plan.js) — checado aqui também só pra dar feedback
// na hora, sem esperar a chamada falhar; o servidor reconfere de qualquer
// jeito antes de gastar uma chamada de IA.
const MAX_PLANS_PER_MONTH = 4
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export default function ThemePlanScreen({ session, authUser, completedSet, plans, isAdmin, onPlansChanged, autoOpenPlanId, autoOpenKeys, onToggleSession, onToggleChapter, onNavigate, onCreateStudy, onGoToReflectionFrom, onBack }) {
  const { lang } = session
  const L = (k, vars) => t(`themePlan.${k}`, vars, lang)
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
        onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'themePlan', planId: activePlan.id, keys: [themeTextKey(heroSession)], book: heroSession.book, bookEn: heroSession.bookEn, chStart: heroSession.chStart, chEnd: heroSession.chEnd, words: heroSession.words, type: heroSession.type })}
      />
    )
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={s.headerTitle}>{L('pageTitle')}</p>
          <p style={s.headerSub}>{L('heroSub')}</p>
        </div>
      </div>

      <div style={s.body}>
        {/* Contador de quantos planos ainda dá pra criar esse mês — só
            enquanto não bateu no limite (atPlanLimit já mostra uma
            mensagem própria, mais completa, nesse caso — ver abaixo) e só
            pra quem tem limite de verdade (conta admin nunca bate nele,
            ver isAdmin). */}
        {!isAdmin && !atPlanLimit && (
          <p style={s.plansRemainingNote}>{L('plansRemaining', { remaining: MAX_PLANS_PER_MONTH - recentPlansCount, total: MAX_PLANS_PER_MONTH })}</p>
        )}

        {atPlanLimit ? (
          <p style={s.sandCard}>{L('limitReached')}</p>
        ) : (
          <button style={s.newPlanBtn} onClick={onCreateStudy}>
            <AppIcon name="Sparkles" size={16} color="var(--bento-ink)" />
            {L('newPlanBtn')}
          </button>
        )}

        {plans.length === 0 ? (
          <p style={s.emptyHint}>{L('empty')}</p>
        ) : (
          <div style={s.card}>
            {plans.map((plan, i) => {
              const progress = themePlanProgress(plan, completedSet)
              return (
                <div key={plan.id} style={{ ...s.planRow, borderBottom: i === plans.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
                  <button style={s.planRowMain} onClick={() => setActivePlanId(plan.id)}>
                    <span style={s.planIcon}><AppIcon name="Sparkles" size={15} color="#A21CAF" /></span>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <p style={s.planTitle}>{themePlanTitle(plan)}</p>
                      <p style={s.planMeta}>
                        {L('sessionsCount', { done: progress.done, total: progress.total })}
                        {progress.totalMinutes != null && ` · ~${progress.totalMinutes} ${t('routine.min', undefined, lang)}`}
                      </p>
                    </div>
                    <span style={s.chevron}>›</span>
                  </button>
                  <button style={s.deleteBtn} onClick={() => handleDelete(plan)} aria-label={L('deleteAction')}>
                    <AppIcon name="Trash2" size={13} color="#DC2626" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  plansRemainingNote: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#A21CAF', lineHeight: 1.4, margin: '0 2px' },
  emptyHint: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '24px 12px' },
  sandCard: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-sand-ink)', textAlign: 'center', background: 'var(--bento-sand)', borderRadius: 18, padding: 14, margin: 0 },

  newPlanBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 16, padding: 14, fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer', background: 'var(--bento-accent)' },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '4px 14px' },
  planRow: { display: 'flex', alignItems: 'center', gap: 4 },
  planRowMain: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FONT, padding: '12px 0' },
  planIcon: { width: 32, height: 32, borderRadius: 11, background: 'rgba(162,28,175,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  planTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  planMeta: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  chevron: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },
  deleteBtn: { width: 30, height: 30, border: 'none', background: 'none', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
}
