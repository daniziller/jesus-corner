// PlanScreen.jsx
// Aba "Plano de Leitura" (rótulo curto "Plano" no menu) — no lugar que a
// aba Oração ocupava antes (ver App.jsx/BottomNav.jsx/Sidebar.jsx).
//
// Duas partes: (1) "Plano de leitura" — ordem (padrão × cronológica) e
// ritmo (Leve/Padrão/Intensivo/Livre) são dois eixos independentes que se
// combinam numa escolha só, direto ao tocar (sem botão "Escolher" — mesmo
// padrão imediato de qualquer seletor de chips do app); (2) "Plano por
// tema (IA)" — só os 4 planos salvos mais recentes (ver recentThemePlans),
// cada um com botão "Escolher" (esse sim precisa de confirmação explícita,
// já que pode ter vários salvos e só um fica ativo por vez). Planos mais
// antigos e a criação de um plano novo moram só em ThemePlanScreen.jsx
// (link "Lista de planos por tema" no fim da seção). O escolhido (de
// qualquer uma das duas partes) fica em destaque no topo (ActivePlanCard)
// E passa a ser a "sessão de hoje" que Home/Rotina mostram (ver
// session.activePlan/resolveActivePlanSessions em App.jsx) —
// RoutineScreen.jsx não tem seletor próprio, só um resumo com link pra cá.
//
// A lista "Sessões do plano" (mais abaixo) sempre reflete o plano ATIVO no
// momento — não só a ordem padrão. Pra ordem cronológica usa os 9
// "movimentos" (ver src/data/chronologicalPlan.js); pra um plano por tema
// usa o bloco sintético dele (1 só, sem sub-divisão). Mesma resolução que
// App.jsx usa pra "sessão de hoje" (ver src/plan/resolveActivePlan.js),
// reaproveitada aqui pra não duplicar a lógica.
import { useState, useEffect } from 'react'
import { PLANS, GRADIENT_MAP } from '../data/bibleBlocks'
import { ACCENT_MAP, GLOW_MAP } from '../utils/blockColors'
import { groupSessionsByBook } from '../utils/groupByBook'
import { resolveActivePlanSessions, themePlanTitle, themePlanProgress } from '../plan/resolveActivePlan'
import { deriveThemeTexts, themeTextKey } from '../themePlans/themeTexts'
import { sessionKeys } from '../utils/progress'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function PlanScreen({
  session, blocks, sessionsByBlock, completedSet, themePlans, activeAltPlan, todayThemePicks,
  onSelectActivePlan, onContinueSession, onOpenThemePlan, onAddSessionsToRoutine, onStartThemeReading, onToggleSession, onOpenSession, onOpenChronoSession, onNavigate,
}) {
  const { lang, plan, activePlan, todaySession } = session
  const activePlanData = resolveActivePlanSessions(activeAltPlan, themePlans, completedSet, blocks, sessionsByBlock, plan.id)

  const activeThemePlan = activeAltPlan?.type === 'theme' ? themePlans.find(p => p.id === activeAltPlan.planId) : null

  // Só os 4 planos por tema mais recentes aparecem aqui (pra não virar uma
  // lista enorme na aba principal) — planos mais antigos continuam
  // acessíveis pela "Lista de planos por tema" (ThemePlanScreen.jsx, ver
  // link mais abaixo), que mostra todos.
  const recentThemePlans = [...themePlans]
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
    .slice(0, 4)

  // Só o bloco ativo (onde a pessoa está lendo agora) começa aberto — os
  // outros ficam colapsados, senão a lista inteira apareceria de uma vez
  // só. Reabre sozinho no bloco ativo sempre que o PLANO ativo muda (trocar
  // ordem/ritmo/tema não deveria deixar a lista toda fechada até a pessoa
  // tocar de novo).
  const [openBlockId, setOpenBlockId] = useState(() => activePlanData.blocks.find(b => b.status === 'active')?.id ?? activePlanData.blocks[0]?.id)
  useEffect(() => {
    setOpenBlockId(activePlanData.blocks.find(b => b.status === 'active')?.id ?? activePlanData.blocks[0]?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlanData.kind, activeAltPlan?.planId, activeAltPlan?.paceId])

  // Roteia pro destino certo conforme o plano ativo — só a ordem padrão usa
  // o mapa de blocos de sempre (aba Bíblia); cronológica/tema têm cada uma
  // sua própria tela de leitura (ver App.jsx).
  function openSession(blockId, sessionId) {
    if (activePlanData.kind === 'chrono') onOpenChronoSession?.(blockId)
    else if (activePlanData.kind === 'theme') onOpenThemePlan?.(activeAltPlan.planId)
    else onOpenSession?.(blockId, sessionId)
  }

  // Ordem e ritmo atuais — dois eixos independentes, derivados direto do
  // plano ativo (nada de estado próprio, pra nunca dessincronizar): ordem
  // cronológica é só mais um "kind" de activeAltPlan, ritmo é o mesmo
  // seletor nos dois casos (PLANS), só muda pra onde a escolha aponta.
  const currentOrder = activeAltPlan?.type === 'chrono' ? 'chrono' : 'standard'
  const currentPaceId = activeAltPlan?.type === 'chrono' ? activeAltPlan.paceId : plan.id

  function chooseOrder(order) {
    onSelectActivePlan?.(order === 'chrono' ? { type: 'chrono', paceId: currentPaceId } : { type: 'fixed', id: currentPaceId })
  }
  function choosePace(paceId) {
    onSelectActivePlan?.(currentOrder === 'chrono' ? { type: 'chrono', paceId } : { type: 'fixed', id: paceId })
  }

  // Um botão-push do lado de CADA título (mesmo componente/estilo do
  // lembrete e da frase do dia na aba Perfil — ver SettingsToggle em
  // ProfileScreen.jsx), não um seletor único — ligar o de "Plano de
  // leitura" ativa a Bíblia toda (ordem+ritmo já escolhidos no card
  // abaixo, sem mudar nada neles); ligar o de "Plano por tema" ativa o
  // plano por tema em questão (o já ativo, ou o mais recente salvo). Como
  // só um pode estar ativo por vez, ligar um sempre desliga o outro
  // sozinho — não precisam de estado próprio, só refletem activePlanData.kind.
  function activateBiblePlan() {
    onSelectActivePlan?.({ type: 'fixed', id: currentPaceId })
  }
  function activateThemePlan() {
    const targetPlanId = activeThemePlan?.id ?? recentThemePlans[0]?.id
    if (!targetPlanId) return
    onSelectActivePlan?.({ type: 'theme', planId: targetPlanId })
  }

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div style={styles.body}>
        <div className="page-header hide-on-mobile" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('plan.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('plan.heroSub', undefined, lang)}</p>
        </div>

        {/* Plano ativo em destaque — mesmos dados que Home/Rotina mostram
            como "sessão de hoje" (session.activePlan/todaySession). */}
        <div>
          <p style={styles.sectionLabel}>{t('plan.activePlanTitle', undefined, lang)}</p>
          <ActivePlanCard activePlan={activePlan} todaySession={todaySession} lang={lang} onContinue={onContinueSession} />
        </div>

        {/* Ordem (padrão × cronológica) e ritmo (Leve/Padrão/Intensivo/
            Livre), dois eixos que se combinam numa escolha só, direto ao
            tocar (ver chooseOrder/choosePace acima). As duas seções (essa e
            "Plano por tema" mais abaixo) ficam sempre visíveis, uma embaixo
            da outra — o botão-push do lado de cada título só decide qual
            das duas está ATIVA no momento, sem esconder nenhuma. */}
        <div style={styles.sectionHeaderRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...styles.sectionLabel, margin: 0 }}>{t('plan.readingPlanTitle', undefined, lang)}</p>
            <p style={{ ...styles.sectionSub, margin: '2px 0 0' }}>{t('plan.readingPlanSub', undefined, lang)}</p>
          </div>
          <div
            className={`toggle ${activePlanData.kind !== 'theme' ? '' : 'off'}`}
            onClick={activateBiblePlan}
            role="switch"
            aria-checked={activePlanData.kind !== 'theme'}
          >
            <div className="toggle-thumb" />
          </div>
        </div>

        {/* Some junto com o botão push acima quando "Plano de leitura" não é
            o ativo no momento — mesmo padrão do card do "Plano por tema"
            logo abaixo, que já só aparece quando ELE é o ativo (activeThemePlan). */}
        {activePlanData.kind !== 'theme' && (
          <div style={styles.readingPlanCard}>
            <p style={styles.chipsLabel}>{t('plan.orderLabel', undefined, lang)}</p>
            <div style={styles.orderSel}>
              <button
                style={{ ...styles.orderBtn, ...(currentOrder === 'standard' ? styles.orderBtnActive : {}) }}
                onClick={() => chooseOrder('standard')}
              >
                <AppIcon name="BookOpen" size={15} color={currentOrder === 'standard' ? 'white' : 'var(--g4)'} />
                {t('plan.orderStandard', undefined, lang)}
              </button>
              <button
                style={{ ...styles.orderBtn, ...(currentOrder === 'chrono' ? styles.orderBtnActive : {}) }}
                onClick={() => chooseOrder('chrono')}
              >
                <AppIcon name="Hourglass" size={15} color={currentOrder === 'chrono' ? 'white' : 'var(--g4)'} />
                {t('plan.orderChronological', undefined, lang)}
              </button>
            </div>

            <p style={{ ...styles.chipsLabel, marginTop: 12 }}>{t('plan.paceLabel', undefined, lang)}</p>
            <div style={styles.paceSel}>
              {PLANS.map(p => (
                <button
                  key={p.id}
                  style={{ ...styles.paceBtn, ...(currentPaceId === p.id ? styles.paceBtnActive : {}) }}
                  onClick={() => choosePace(p.id)}
                >
                  <AppIcon name={p.icon} size={14} color={currentPaceId === p.id ? 'white' : 'var(--g4)'} />
                  <span>{lang === 'en' ? p.labelEn : p.label}</span>
                  <span style={{ ...styles.paceBtnTime, ...(currentPaceId === p.id ? styles.paceBtnTimeActive : {}) }}>
                    {p.readingMinutes != null ? t('journey.minPerDay', { n: p.readingMinutes }, lang) : t('journey.noTimeTarget', undefined, lang)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Título da linha acompanha o botão-push: enquanto o plano por tema
            estiver ativo, mostra o título ESPECÍFICO do plano escolhido
            (ex: "Ansiedade") na mesma altura do toggle, em vez do rótulo
            genérico "Plano por tema (IA)" — a explicação (overview) do
            plano fica só no card abaixo, sem repetir o título ali. */}
        <div style={styles.sectionHeaderRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...styles.sectionLabel, margin: 0 }}>
              {activeThemePlan ? themePlanTitle(activeThemePlan) : t('plan.themePlanTitle', undefined, lang)}
            </p>
            <p style={{ ...styles.sectionSub, margin: '2px 0 0' }}>{t('plan.themePlanSub', undefined, lang)}</p>
          </div>
          <div
            className={`toggle ${activePlanData.kind === 'theme' ? '' : 'off'}`}
            style={themePlans.length === 0 ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
            onClick={activateThemePlan}
            role="switch"
            aria-checked={activePlanData.kind === 'theme'}
          >
            <div className="toggle-thumb" />
          </div>
        </div>

        {/* Plano por tema ativo no momento — em vez de sessões pré-divididas
            por ritmo, mostra cada texto (passagem que a IA escolheu) com o
            tempo de leitura já calculado; a pessoa marca quais vai ler hoje
            e o total alimenta a aba Rotina (ver ThemeTextsChecklist
            abaixo/resolveActivePlan.js). Planos salvos antes desse recurso
            existir (sem `passages`) só mostram a contagem, sem checklist. */}
        {activeThemePlan && (
          <div style={styles.readingPlanCard}>
            {/* Contexto do plano — parágrafo que a própria IA escreve na
                hora de gerar (ver api/_lib/ai.js, campo overview),
                explicando o fio condutor por trás das passagens escolhidas.
                Planos salvos antes desse campo existir simplesmente não
                mostram nada aqui. */}
            {activeThemePlan.overview && (
              <p style={{ ...styles.themeOverview, marginTop: 0 }}>{activeThemePlan.overview}</p>
            )}
            {activeThemePlan.passages ? (
              // key={activeThemePlan.id} — remonta do zero (seleção de hoje
              // limpa) sempre que o plano por tema ativo muda, em vez de
              // carregar a seleção de um plano diferente por engano.
              <ThemeTextsChecklist
                key={activeThemePlan.id}
                plan={activeThemePlan}
                completedSet={completedSet}
                todayThemePicks={todayThemePicks}
                lang={lang}
                onOpenText={key => onStartThemeReading?.(activeThemePlan.id, [key])}
                onAddToRoutine={keys => onAddSessionsToRoutine?.(activeThemePlan.id, keys)}
                onStartReading={keys => onStartThemeReading?.(activeThemePlan.id, keys)}
              />
            ) : (
              <p style={styles.sectionSub}>
                {t('themePlan.sessionsCount', { done: themePlanProgress(activeThemePlan, completedSet).done, total: themePlanProgress(activeThemePlan, completedSet).total }, lang)}
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentThemePlans.map(tp => {
            const progress = themePlanProgress(tp, completedSet)
            return (
              <PlanRow
                key={tp.id}
                icon="Sparkles"
                iconColor="#A21CAF"
                iconBg="#FAE8FF"
                title={themePlanTitle(tp)}
                sub={progress.totalMinutes != null
                  ? `${t('themePlan.sessionsCount', { done: progress.done, total: progress.total }, lang)} · ~${progress.totalMinutes} ${t('routine.min', undefined, lang)}`
                  : t('themePlan.sessionsCount', { done: progress.done, total: progress.total }, lang)}
                isActive={activeAltPlan?.type === 'theme' && activeAltPlan.planId === tp.id}
                lang={lang}
                onOpen={() => onOpenThemePlan?.(tp.id)}
                onChoose={() => onSelectActivePlan?.({ type: 'theme', planId: tp.id })}
              />
            )
          })}
          {/* Só os 4 mais recentes aparecem acima — este link sempre leva
              pra lista completa (ThemePlanScreen.jsx), que também é onde
              "criar plano" mora de verdade (ver comentário no topo). */}
          <button style={styles.createThemePlanLink} onClick={() => onNavigate?.('themePlan')}>
            {t('plan.createThemePlanLink', undefined, lang)}
          </button>
        </div>

        {/* Sessões do plano ATIVO no momento — bloco/movimento > livro >
            sessão numerada, cada uma tocável. Não aparece pro plano por
            tema — o card acima já mostra (e deixa escolher) os textos dele,
            mostrar de novo aqui seria duplicado. */}
        {activePlanData.kind !== 'theme' && (
          <>
            <div style={{ margin: '4px 2px 0' }}>
              <p style={styles.overviewTitle}>{t('plan.sessionsOverviewTitle', undefined, lang)}</p>
              <p style={styles.overviewSub}>{t('plan.sessionsOverviewSub', undefined, lang)}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activePlanData.blocks.map(block => (
                <PlanBlockSection
                  key={block.id}
                  block={block}
                  sessions={activePlanData.sessionsByBlock[block.id] ?? []}
                  open={openBlockId === block.id}
                  onToggle={() => setOpenBlockId(v => (v === block.id ? null : block.id))}
                  completedSet={completedSet}
                  onToggleSession={onToggleSession}
                  onOpenSession={s => openSession(block.id, s.id)}
                  lang={lang}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ActivePlanCard({ activePlan, todaySession, lang, onContinue }) {
  const ctaLabel = activePlan.needsThemePick
    ? t('themePlan.chooseTodayCta', undefined, lang)
    : todaySession.progress === 100 ? t('home.reviewSession', undefined, lang)
    : todaySession.progress > 0   ? t('home.continueSession', undefined, lang)
    : t('home.startSession', undefined, lang)
  // Plano por tema (IA) foge do gradiente de marca de sempre — usa o mesmo
  // roxo já usado em ThemePlanScreen.jsx/PlanRow (#A21CAF), pra ficar claro
  // de relance que a leitura de hoje vem de um plano gerado por IA, não do
  // plano fixo/cronológico. Mesmo tom replicado em RoutineScreen.jsx
  // (todaySessionCard) — se mudar aqui, mudar lá também.
  const isAiPlan = activePlan.kind === 'theme'

  return (
    <div style={{ ...styles.activeCard, ...(isAiPlan ? styles.activeCardAi : {}) }}>
      <div style={styles.activeCardTop}>
        <span style={styles.activeCardIcon}><AppIcon name={activePlan.icon} size={18} color="white" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.activeCardLabel}>{activePlan.label}</p>
          <p style={styles.activeCardMeta}>
            {t('themePlan.sessionsCount', { done: activePlan.doneCount, total: activePlan.totalCount }, lang)}
          </p>
        </div>
        <span style={styles.activeCardPercent}>{activePlan.percent}%</span>
      </div>
      <div style={styles.activeCardBar}>
        <div style={{ ...styles.activeCardBarFill, width: `${activePlan.percent}%` }} />
      </div>
      <button style={styles.activeCardBtn} onClick={onContinue}>
        {ctaLabel} <AppIcon name="ChevronRight" size={14} color="white" />
      </button>
    </div>
  )
}

// Textos de um plano por tema, agrupados por livro, cada um com checkbox +
// tempo de leitura (ver deriveThemeTexts) — a pessoa marca quais vai ler
// hoje; o resumo no fim soma o tempo e "Começar leitura de hoje" abre a
// leitura só com os marcados. Seleção fica em estado LOCAL até tocar em
// "Começar" (ver key={plan.id} no chamador — remonta ao trocar de plano).
// Exportado (não só usado aqui) — ThemePlanScreen.jsx reaproveita pra
// deixar escolher os textos de hoje logo depois de gerar um plano novo,
// mesmo componente/estilos (padrão "genuine reuse" já usado com LegendDot
// em RoutineCalendar.jsx). Dois botões, sempre os dois — "Adicionar à
// rotina" grava a escolha e leva pra aba Rotina (mostrando o tempo somado
// lá); "Começar leitura de hoje" grava a mesma escolha e já pula pra
// leitura. Ambos os chamadores (aqui e ThemePlanScreen.jsx) passam as duas
// funções — nenhum caso precisa esconder uma das opções.
export function ThemeTextsChecklist({ plan, completedSet, todayThemePicks, lang, onOpenText, onAddToRoutine, onStartReading }) {
  const texts = deriveThemeTexts(plan.passages).map(s => ({
    ...s,
    status: sessionKeys(s).every(k => completedSet.has(k)) ? 'done' : 'pending',
  }))
  const initialKeys = todayThemePicks?.planId === plan.id ? todayThemePicks.keys ?? [] : []
  const [selected, setSelected] = useState(() => new Set(initialKeys))

  function toggle(key) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedTexts = texts.filter(s => s.status !== 'done' && selected.has(themeTextKey(s)))
  const totalMinutes = selectedTexts.reduce((sum, s) => sum + s.minutes, 0)
  const bookGroups = groupSessionsByBook(texts)

  return (
    <>
      <p style={styles.chipsLabel}>{t('themePlan.textsLabel', undefined, lang)}</p>
      <p style={styles.textsInstructions}>{t('themePlan.textsInstructions', undefined, lang)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {bookGroups.map(group => (
          <div key={group.book} style={styles.textGroup}>
            <p style={styles.textGroupHeader}>{lang === 'en' ? group.sessions[0]?.bookEn : group.book}</p>
            {group.sessions.map(s => {
              const key = themeTextKey(s)
              const isDone = s.status === 'done'
              const isChecked = !isDone && selected.has(key)
              return (
                <div key={s.id} style={styles.textRow}>
                  <span
                    role={isDone ? undefined : 'checkbox'}
                    aria-checked={isChecked}
                    style={{ ...styles.textCheckbox, ...(isDone ? styles.textCheckboxDone : isChecked ? styles.textCheckboxChecked : {}) }}
                    onClick={() => !isDone && toggle(key)}
                  >
                    {isDone && <AppIcon name="Check" size={13} color="white" />}
                    {!isDone && isChecked && <AppIcon name="Check" size={13} color="white" />}
                  </span>
                  <button style={styles.textInfo} onClick={() => onOpenText?.(key)}>
                    <span style={styles.textTitle}>{lang === 'en' ? s.titleEn : s.title}</span>
                    <span style={styles.textMinutes}>{t('themePlan.minutesEach', { n: s.minutes }, lang)}</span>
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={styles.todaySummary}>
        <span style={styles.todaySummaryText}>
          {t('themePlan.todaySummary', { minutes: totalMinutes, count: selectedTexts.length }, lang)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        <button
          style={{ ...styles.addToRoutineBtn, ...(selectedTexts.length === 0 ? styles.addToRoutineBtnDisabled : {}) }}
          disabled={selectedTexts.length === 0}
          onClick={() => onAddToRoutine?.([...selected])}
        >
          {t('themePlan.addToRoutineCta', undefined, lang)}
        </button>
        <button
          style={{ ...styles.startTodayBtn, ...(selectedTexts.length === 0 ? styles.startTodayBtnDisabled : {}) }}
          disabled={selectedTexts.length === 0}
          onClick={() => onStartReading?.([...selected])}
        >
          {t('themePlan.startTodayCta', undefined, lang)} <AppIcon name="ChevronRight" size={14} color="white" />
        </button>
      </div>
    </>
  )
}

function PlanRow({ icon, iconColor, iconBg, title, sub, isActive, lang, onOpen, onChoose }) {
  return (
    <div style={{ ...styles.planRow, border: isActive ? '0.5px solid var(--gold-soft)' : styles.planRow.border }}>
      <button style={styles.planRowMain} onClick={onOpen} disabled={!onOpen}>
        <span style={{ ...styles.planRowIcon, background: iconBg }}><AppIcon name={icon} size={16} color={iconColor} /></span>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <span style={styles.planRowTitle}>{title}</span>
          <span style={styles.planRowSub}>{sub}</span>
        </span>
      </button>
      {isActive
        ? <span style={styles.activeBadge}>{t('plan.activeBadge', undefined, lang)}</span>
        : <button style={styles.chooseBtn} onClick={onChoose}>{t('plan.chooseAction', undefined, lang)}</button>}
    </div>
  )
}

function PlanBlockSection({ block, sessions, open, onToggle, completedSet, onToggleSession, onOpenSession, lang }) {
  const gradient = GRADIENT_MAP[block.gradientKey]
  const accent = ACCENT_MAP[block.gradientKey]
  const name = lang === 'en' ? block.nameEn : block.name
  const tag = lang === 'en' ? block.tagEn : block.tag
  const bookGroups = groupSessionsByBook(sessions)

  return (
    <div style={{
      ...styles.blockSection,
      boxShadow: block.status === 'active' ? `var(--shadow-premium), 0 8px 22px ${GLOW_MAP[block.gradientKey]}` : `0 8px 22px ${GLOW_MAP[block.gradientKey]}`,
      border: block.status === 'active' ? '0.5px solid var(--gold-soft)' : styles.blockSection.border,
    }}>
      <button style={styles.blockHeader} onClick={onToggle}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AppIcon name={block.icon} size={19} color={accent} />
        </div>
        {/* minWidth:0 — sem isso, item flex com texto recusa encolher/
            quebrar linha por padrão e vaza pra fora do card (ver mesmo
            ajuste em PrayerScreen.jsx/ReflectionScreen.jsx). */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {tag && <p style={styles.blockTag}>{tag}</p>}
          <p style={styles.blockName}>{name}</p>
        </div>
        <span style={{ ...styles.blockPercent, color: accent }}>{block.percent}%</span>
        <AppIcon name="ChevronDown" size={16} color="var(--g4)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={styles.blockBody}>
          {bookGroups.map(group => (
            <PlanBookGroup
              key={group.book}
              group={group}
              completedSet={completedSet}
              onToggleSession={onToggleSession}
              onOpenSession={onOpenSession}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PlanBookGroup({ group, completedSet, onToggleSession, onOpenSession, lang }) {
  const total = group.sessions.length
  const doneCount = group.sessions.filter(s => s.status === 'done').length
  // Livro em leitura no momento já abre sozinho — os outros ficam
  // fechados, só o nome + contagem visíveis, até a pessoa tocar.
  const [open, setOpen] = useState(() => group.sessions.some(s => s.status === 'current'))
  const displayName = lang === 'en' ? group.sessions[0]?.bookEn : group.book

  return (
    <div style={styles.bookGroup}>
      <button style={styles.bookHeader} onClick={() => setOpen(v => !v)}>
        <span style={styles.bookName}>{displayName}</span>
        <span style={styles.bookMeta}>{doneCount}/{total}</span>
        <AppIcon name="ChevronDown" size={13} color="var(--g4)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={styles.sessionList}>
          {group.sessions.map(s => (
            <PlanSessionRow key={s.id} s={s} onToggleSession={onToggleSession} onOpen={() => onOpenSession(s)} lang={lang} />
          ))}
        </div>
      )}
    </div>
  )
}

function PlanSessionRow({ s, onToggleSession, onOpen, lang }) {
  const isDone = s.status === 'done'
  const isCurrent = s.status === 'current'
  const isReflection = s.type === 'reflection'
  const title = lang === 'en' ? s.titleEn : s.title
  const passage = lang === 'en' ? s.passageEn : s.passage

  return (
    <div style={{ ...styles.sessionRow, background: isCurrent ? 'var(--olt)' : 'var(--g1)', border: `0.5px solid ${isCurrent ? 'var(--gold-soft)' : isReflection ? 'rgba(168,85,247,.3)' : 'var(--g2)'}` }}>
      {/* Ícone de status — toque rápido marca/desmarca, mesmo padrão de
          ReadingBlockView.jsx (SessionCard), sem precisar abrir a leitura. */}
      <span
        role="button"
        aria-label={t('home.routineMarkDone', undefined, lang)}
        style={{ ...styles.sessionCheck, background: isDone ? 'var(--grad-vivid)' : isCurrent ? 'var(--bk)' : isReflection ? '#A855F7' : 'var(--g3)' }}
        onClick={() => onToggleSession?.(s, !isDone)}
      >
        {isDone
          ? <AppIcon name="Check" size={13} color="white" />
          : isReflection
            ? <AppIcon name="PenLine" size={12} color="white" />
            : <span style={{ fontSize: 9.5, fontWeight: 700, color: isCurrent ? 'white' : 'var(--g5)' }}>{s.id}</span>}
      </span>
      <button style={styles.sessionInfo} onClick={onOpen}>
        <span style={styles.sessionTitle}>
          {isReflection ? title : `${t('reading.sessionLabel', { n: s.id }, lang)} · ${title}`}
        </span>
        <span style={styles.sessionPassage}>{passage}</span>
      </button>
      <AppIcon name="ChevronRight" size={14} color="var(--g4)" style={{ flexShrink: 0 }} />
    </div>
  )
}

const styles = {
  body:        { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  heroSub:     { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: '0 2px' },

  sectionLabel: { fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 2px 6px' },
  sectionSub:   { fontSize: 11, fontWeight: 500, color: 'var(--g5)', margin: '-4px 2px 6px' },

  activeCard:      { background: 'var(--grad-vivid)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-glow)' },
  activeCardAi:    { background: 'linear-gradient(135deg, #C026D4 0%, #86198F 100%)', boxShadow: '0 10px 28px rgba(162,28,175,.35)' },
  activeCardTop:   { display: 'flex', alignItems: 'center', gap: 10 },
  activeCardIcon:  { width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activeCardLabel: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  activeCardMeta:  { fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,.8)', marginTop: 1 },
  activeCardPercent: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'white', flexShrink: 0 },
  activeCardBar:   { height: 5, background: 'rgba(255,255,255,.25)', borderRadius: 99, overflow: 'hidden', margin: '10px 0' },
  activeCardBarFill: { height: '100%', background: 'white', borderRadius: 99 },
  activeCardBtn:   { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 11, padding: 10, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },

  sectionHeaderRow: { display: 'flex', alignItems: 'center', gap: 10, margin: '0 2px 6px' },

  readingPlanCard: { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  themeOverview: { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, marginBottom: 12 },
  chipsLabel:      { fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  textsInstructions: { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.45, marginTop: -6, marginBottom: 10 },

  orderSel:    { display: 'flex', gap: 6 },
  orderBtn:    { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 11, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  orderBtnActive: { color: 'white', borderColor: 'transparent', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },

  paceSel:     { display: 'flex', gap: 6, flexWrap: 'wrap' },
  paceBtn:     { flex: '1 1 0', minWidth: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, textAlign: 'center', padding: '10px 6px', fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  paceBtnActive: { color: 'white', borderColor: 'transparent', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  paceBtnTime: { fontSize: 8.5, fontWeight: 700, color: 'var(--g4)' },
  paceBtnTimeActive: { color: 'rgba(255,255,255,.8)' },

  // Checklist de textos do plano por tema (ThemeTextsChecklist) — mesmo
  // roxo do resto dos cards de IA (#A21CAF, ver ActivePlanCard/
  // ThemePlanScreen.jsx).
  textGroup:       { background: 'var(--white)', border: '0.5px solid var(--g1)', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  textGroupHeader: { fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', marginBottom: 2 },
  textRow:         { display: 'flex', alignItems: 'center', gap: 9 },
  textCheckbox:    { width: 24, height: 24, borderRadius: 7, border: '1.5px solid var(--g3)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' },
  textCheckboxChecked: { background: '#A21CAF', borderColor: '#A21CAF' },
  textCheckboxDone:    { background: 'var(--grad-vivid)', borderColor: 'transparent', cursor: 'default' },
  textInfo:        { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', padding: 0 },
  textTitle:       { fontSize: 11.5, fontWeight: 700, color: 'var(--bk)' },
  textMinutes:     { fontSize: 9.5, fontWeight: 500, color: 'var(--g5)' },

  todaySummary:      { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--olt)', border: '0.5px solid rgba(162,28,175,.25)', borderRadius: 13, padding: '10px 10px 10px 13px' },
  todaySummaryText:  { flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 700, color: '#A21CAF' },
  startTodayBtn:     { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: 'none', borderRadius: 10, padding: '10px 13px', fontSize: 11.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: '#A21CAF' },
  startTodayBtnDisabled: { background: 'var(--g3)', cursor: 'default' },
  addToRoutineBtn:   { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: '0.5px solid rgba(162,28,175,.35)', borderRadius: 10, padding: '10px 13px', fontSize: 11.5, fontWeight: 700, color: '#A21CAF', cursor: 'pointer', fontFamily: 'var(--font)', background: 'white' },
  addToRoutineBtnDisabled: { color: 'var(--g4)', borderColor: 'var(--g3)', cursor: 'default' },

  planRow:      { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 16, padding: 6, boxShadow: 'var(--shadow-card)' },
  planRowMain:  { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', padding: 6 },
  planRowIcon:  { width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  planRowTitle: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--bk)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  planRowSub:   { display: 'block', fontSize: 10, fontWeight: 500, color: 'var(--g5)' },
  chooseBtn:    { flexShrink: 0, border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 10.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: 'var(--grad-primary)' },
  activeBadge:  { flexShrink: 0, borderRadius: 9, padding: '7px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--brand-deep)', background: 'var(--olt)' },
  createThemePlanLink: { alignSelf: 'flex-start', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: 'var(--or)', padding: '2px 6px' },

  overviewTitle: { fontSize: 13, fontWeight: 700, color: 'var(--bk)' },
  overviewSub:   { fontSize: 11, fontWeight: 500, color: 'var(--g5)', marginTop: 1 },

  blockSection: { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, overflow: 'hidden' },
  blockHeader:  { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' },
  blockTag:     { fontSize: 8, fontWeight: 700, color: 'var(--g4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  blockName:    { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  blockPercent: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '-0.3px', flexShrink: 0 },
  blockBody:    { padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 },

  bookGroup:   { background: 'var(--white)', border: '0.5px solid var(--g1)', borderRadius: 14, overflow: 'hidden' },
  bookHeader:  { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' },
  bookName:    { flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: 'var(--bk)' },
  bookMeta:    { fontSize: 10, fontWeight: 600, color: 'var(--g4)' },
  sessionList: { padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 },

  sessionRow:   { display: 'flex', alignItems: 'center', gap: 9, borderRadius: 12, padding: '8px 9px', cursor: 'pointer' },
  sessionCheck: { width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' },
  sessionInfo:  { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', padding: 0 },
  sessionTitle: { fontSize: 11.5, fontWeight: 700, color: 'var(--bk)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sessionPassage: { fontSize: 9.5, fontWeight: 500, color: 'var(--g5)' },
}
