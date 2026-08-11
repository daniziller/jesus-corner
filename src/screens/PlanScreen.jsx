// PlanScreen.jsx
// Aba "Plano de Leitura" (rótulo curto "Plano" no menu) — no lugar que a
// aba Oração ocupava antes (ver App.jsx/BottomNav.jsx/Sidebar.jsx). Reúne
// as duas coisas que antes só existiam espalhadas: escolher o plano de
// leitura (duplicado aqui e em Rotina — decisão consciente, ver conversa)
// e ver a Bíblia INTEIRA já dividida nas sessões desse plano (Sessão 1, 2,
// 3... por livro, dentro de cada bloco), não só a sessão de hoje. Tocar
// numa sessão pula direto pra ela dentro da aba Bíblia (ver onOpenSession
// vindo de App.jsx), do mesmo jeito que "Continuar sessão" já fazia.
import { useState } from 'react'
import { PLANS, GRADIENT_MAP } from '../data/bibleBlocks'
import { ACCENT_MAP, GLOW_MAP } from '../utils/blockColors'
import { groupSessionsByBook } from '../utils/groupByBook'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function PlanScreen({ session, blocks, sessionsByBlock, completedSet, onSelectPlan, onToggleSession, onOpenSession, onNavigate }) {
  const { lang, plan } = session
  // Só o bloco ativo (onde a pessoa está lendo agora) começa aberto — os
  // outros ficam colapsados, senão a Bíblia inteira dividida em sessões
  // apareceria de uma vez só, uma lista gigante pra rolar.
  const [openBlockId, setOpenBlockId] = useState(() => blocks.find(b => b.status === 'active')?.id ?? blocks[0]?.id)

  function openSession(blockId, sessionId) {
    onOpenSession?.(blockId, sessionId)
  }

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div style={styles.body}>
        <div className="page-header hide-on-mobile" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('plan.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('plan.heroSub', undefined, lang)}</p>
        </div>

        {/* Seletor de plano — mesmas 4 opções de Rotina (ver conversa: fica
            duplicado de propósito, cada tela com seu próprio contexto). */}
        <div style={styles.planCard}>
          <p style={styles.changePlanLabel}>{t('plan.changePlanLabel', undefined, lang)}</p>
          <div style={styles.planSel}>
            {PLANS.map(p => (
              <button
                key={p.id}
                style={{ ...styles.planBtn, ...(plan.id === p.id ? styles.planBtnActive : {}) }}
                onClick={() => onSelectPlan?.(p.id)}
              >
                <AppIcon name={p.icon} size={15} color={plan.id === p.id ? 'white' : 'var(--g4)'} />
                {lang === 'en' ? p.labelEn : p.label}
                {/* Tempo de leitura por dia — o principal critério pra
                    escolher entre os planos, então fica sempre visível no
                    próprio botão, não só depois de já ter escolhido. */}
                <span style={{ ...styles.planBtnTime, ...(plan.id === p.id ? styles.planBtnTimeActive : {}) }}>
                  {p.readingMinutes != null ? t('journey.minPerDay', { n: p.readingMinutes }, lang) : t('journey.noTimeTarget', undefined, lang)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Entrada pro plano de leitura por tema (IA) — tela própria
            (ThemePlanScreen.jsx), não misturado com o plano fixo acima. */}
        <button style={styles.themePlanCard} onClick={() => onNavigate?.('themePlan')}>
          <span style={styles.themePlanIcon}><AppIcon name="Sparkles" size={17} color="white" /></span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={styles.themePlanTitle}>{t('plan.themePlanTitle', undefined, lang)}</span>
            <span style={styles.themePlanSub}>{t('plan.themePlanSub', undefined, lang)}</span>
          </span>
          <AppIcon name="ChevronRight" size={16} color="var(--g4)" />
        </button>

        {/* Bíblia inteira, dividida nas sessões do plano escolhido acima —
            bloco > livro > sessão numerada, cada uma tocável. */}
        <div style={{ margin: '4px 2px 0' }}>
          <p style={styles.overviewTitle}>{t('plan.sessionsOverviewTitle', undefined, lang)}</p>
          <p style={styles.overviewSub}>{t('plan.sessionsOverviewSub', undefined, lang)}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {blocks.map(block => (
            <PlanBlockSection
              key={block.id}
              block={block}
              sessions={sessionsByBlock[block.id] ?? []}
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
          <p style={styles.blockTag}>{tag}</p>
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

  planCard:    { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  changePlanLabel: { fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  planSel:     { display: 'flex', gap: 6, flexWrap: 'wrap' },
  planBtn:     { flex: '1 1 0', minWidth: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, textAlign: 'center', padding: '10px 6px', fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  planBtnActive: { color: 'white', borderColor: 'transparent', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  planBtnTime: { fontSize: 8.5, fontWeight: 700, color: 'var(--g4)' },
  planBtnTimeActive: { color: 'rgba(255,255,255,.8)' },

  themePlanCard:  { display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', borderRadius: 18, padding: 13, cursor: 'pointer', fontFamily: 'var(--font)', background: 'linear-gradient(135deg,#A21CAF,#C026D3)', boxShadow: '0 8px 20px rgba(162,28,175,.3)' },
  themePlanIcon:  { width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  themePlanTitle: { display: 'block', fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 1 },
  themePlanSub:   { display: 'block', fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.8)' },

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
