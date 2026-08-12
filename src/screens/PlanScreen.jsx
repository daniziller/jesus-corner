// PlanScreen.jsx
// Aba "Plano de Leitura" (rótulo curto "Plano" no menu) — no lugar que a
// aba Oração ocupava antes (ver App.jsx/BottomNav.jsx/Sidebar.jsx).
//
// Duas partes: (1) "Plano de leitura" — ordem (padrão × cronológica) e
// ritmo (Leve/Padrão/Intensivo/Livre) são dois eixos independentes que se
// combinam numa escolha só, direto ao tocar (sem botão "Escolher" — mesmo
// padrão imediato de qualquer seletor de chips do app); (2) "Plano por
// tema (IA)" — lista dos planos salvos, cada um com botão "Escolher"
// (esse sim precisa de confirmação explícita, já que pode ter vários
// salvos e só um fica ativo por vez). O escolhido (de qualquer uma das
// duas partes) fica em destaque no topo (ActivePlanCard) E passa a ser a
// "sessão de hoje" que Home/Rotina mostram (ver
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
import { resolveActivePlanSessions, themePlanTitle, themePlanReadingMinutes } from '../plan/resolveActivePlan'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function PlanScreen({
  session, blocks, sessionsByBlock, completedSet, themePlans, activeAltPlan,
  onSelectActivePlan, onContinueSession, onOpenThemePlan, onChangeThemePlanPace, onToggleSession, onOpenSession, onOpenChronoSession, onNavigate,
}) {
  const { lang, plan, activePlan, todaySession } = session
  const activePlanData = resolveActivePlanSessions(activeAltPlan, themePlans, completedSet, blocks, sessionsByBlock, plan.id)

  // Botão-push no topo: qual dos dois "tipos" de plano está sendo mostrado
  // abaixo — Bíblia toda (ordem padrão/cronológica) ou Tema (IA). Começa
  // refletindo o que estiver ativo, e se re-sincroniza sozinho sempre que o
  // plano ativo de verdade mudar (ex: escolhido pela Home) — mas trocar só
  // a VISÃO aqui (sem escolher nada ainda) não mexe no que está ativo.
  const [viewMode, setViewMode] = useState(activeAltPlan?.type === 'theme' ? 'theme' : 'bible')
  useEffect(() => {
    setViewMode(activeAltPlan?.type === 'theme' ? 'theme' : 'bible')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAltPlan?.type])

  const activeThemePlan = activeAltPlan?.type === 'theme' ? themePlans.find(p => p.id === activeAltPlan.planId) : null

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

        {/* Botão-push: qual dos dois tipos de plano está sendo mostrado
            abaixo — reflete o que está ativo, mas dá pra só espiar o outro
            sem trocar nada (ver useEffect acima). */}
        <div style={styles.modeSel}>
          <button
            style={{ ...styles.modeBtn, ...(viewMode === 'bible' ? styles.modeBtnActive : {}) }}
            onClick={() => setViewMode('bible')}
          >
            <AppIcon name="BookOpen" size={15} color={viewMode === 'bible' ? 'white' : 'var(--g4)'} />
            {t('plan.modeBible', undefined, lang)}
          </button>
          <button
            style={{ ...styles.modeBtn, ...(viewMode === 'theme' ? styles.modeBtnActive : {}) }}
            onClick={() => setViewMode('theme')}
          >
            <AppIcon name="Sparkles" size={15} color={viewMode === 'theme' ? 'white' : 'var(--g4)'} />
            {t('plan.modeTheme', undefined, lang)}
          </button>
        </div>

        {viewMode === 'bible' ? (
          <>
            {/* Ordem (padrão × cronológica) e ritmo (Leve/Padrão/Intensivo/
                Livre), dois eixos que se combinam numa escolha só, direto
                ao tocar (ver chooseOrder/choosePace acima). */}
            <div>
              <p style={styles.sectionLabel}>{t('plan.readingPlanTitle', undefined, lang)}</p>
              <p style={styles.sectionSub}>{t('plan.readingPlanSub', undefined, lang)}</p>
            </div>

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
          </>
        ) : (
          <>
            <div>
              <p style={styles.sectionLabel}>{t('plan.themePlanTitle', undefined, lang)}</p>
              <p style={styles.sectionSub}>{t('plan.themePlanSub', undefined, lang)}</p>
            </div>

            {/* Plano por tema ativo no momento — mesmo padrão do card de
                "Plano de leitura" acima: ritmo sempre visível, trocável a
                qualquer momento (re-divide as MESMAS passagens já achadas
                pela IA num tamanho de sessão novo, sem chamar a IA de novo
                — ver chunkThemePassages.js). Planos salvos antes desse
                recurso existir (sem `passages`) só mostram o ritmo, sem
                poder trocar. */}
            {activeThemePlan && (
              <div style={styles.readingPlanCard}>
                <p style={styles.activeThemeTitle}>{themePlanTitle(activeThemePlan)}</p>
                {activeThemePlan.passages ? (
                  <>
                    <p style={styles.chipsLabel}>{t('plan.paceLabel', undefined, lang)}</p>
                    <div style={styles.paceSel}>
                      {PLANS.map(p => (
                        <button
                          key={p.id}
                          style={{ ...styles.paceBtn, ...(activeThemePlan.paceId === p.id ? styles.paceBtnActive : {}) }}
                          onClick={() => onChangeThemePlanPace?.(activeThemePlan.id, p.id)}
                        >
                          <AppIcon name={p.icon} size={14} color={activeThemePlan.paceId === p.id ? 'white' : 'var(--g4)'} />
                          <span>{lang === 'en' ? p.labelEn : p.label}</span>
                          <span style={{ ...styles.paceBtnTime, ...(activeThemePlan.paceId === p.id ? styles.paceBtnTimeActive : {}) }}>
                            {p.readingMinutes != null ? t('journey.minPerDay', { n: p.readingMinutes }, lang) : t('journey.noTimeTarget', undefined, lang)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={styles.sectionSub}>
                    {themePlanReadingMinutes(activeThemePlan) != null
                      ? `${themePlanReadingMinutes(activeThemePlan)} ${t('routine.min', undefined, lang)}/${t('themePlan.perSession', undefined, lang)}`
                      : t('journey.noTimeTarget', undefined, lang)}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {themePlans.map(tp => (
                <PlanRow
                  key={tp.id}
                  icon="Sparkles"
                  iconColor="#A21CAF"
                  iconBg="#FAE8FF"
                  title={themePlanTitle(tp)}
                  sub={themePlanReadingMinutes(tp) != null
                    ? `${themePlanReadingMinutes(tp)} ${t('routine.min', undefined, lang)}/${t('themePlan.perSession', undefined, lang)}`
                    : t('journey.noTimeTarget', undefined, lang)}
                  isActive={activeAltPlan?.type === 'theme' && activeAltPlan.planId === tp.id}
                  lang={lang}
                  onOpen={() => onOpenThemePlan?.(tp.id)}
                  onChoose={() => onSelectActivePlan?.({ type: 'theme', planId: tp.id })}
                />
              ))}
              <button style={styles.createThemePlanLink} onClick={() => onNavigate?.('themePlan')}>
                {t('plan.createThemePlanLink', undefined, lang)}
              </button>
            </div>
          </>
        )}

        {/* Sessões do plano ATIVO no momento — bloco/movimento > livro >
            sessão numerada, cada uma tocável. */}
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
      </div>
    </div>
  )
}

function ActivePlanCard({ activePlan, todaySession, lang, onContinue }) {
  const ctaLabel =
    todaySession.progress === 100 ? t('home.reviewSession', undefined, lang)
    : todaySession.progress > 0   ? t('home.continueSession', undefined, lang)
    : t('home.startSession', undefined, lang)

  return (
    <div style={styles.activeCard}>
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
  activeCardTop:   { display: 'flex', alignItems: 'center', gap: 10 },
  activeCardIcon:  { width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activeCardLabel: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  activeCardMeta:  { fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,.8)', marginTop: 1 },
  activeCardPercent: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'white', flexShrink: 0 },
  activeCardBar:   { height: 5, background: 'rgba(255,255,255,.25)', borderRadius: 99, overflow: 'hidden', margin: '10px 0' },
  activeCardBarFill: { height: '100%', background: 'white', borderRadius: 99 },
  activeCardBtn:   { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 11, padding: 10, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },

  modeSel:     { display: 'flex', gap: 6 },
  modeBtn:     { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 8px', fontSize: 12, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  modeBtnActive: { color: 'white', borderColor: 'transparent', background: 'var(--bk)', boxShadow: 'var(--shadow-premium)' },

  readingPlanCard: { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  activeThemeTitle: { fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 10 },
  chipsLabel:      { fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  orderSel:    { display: 'flex', gap: 6 },
  orderBtn:    { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 11, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  orderBtnActive: { color: 'white', borderColor: 'transparent', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },

  paceSel:     { display: 'flex', gap: 6, flexWrap: 'wrap' },
  paceBtn:     { flex: '1 1 0', minWidth: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, textAlign: 'center', padding: '10px 6px', fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  paceBtnActive: { color: 'white', borderColor: 'transparent', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  paceBtnTime: { fontSize: 8.5, fontWeight: 700, color: 'var(--g4)' },
  paceBtnTimeActive: { color: 'rgba(255,255,255,.8)' },

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
