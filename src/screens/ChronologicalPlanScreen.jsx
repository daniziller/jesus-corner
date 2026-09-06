// ChronologicalPlanScreen.jsx
// "Plano Cronológico" — a Bíblia inteira (66 livros) reordenada numa
// sequência aproximada de quando os eventos aconteceram, em vez da ordem
// canônica (Gênesis → Apocalipse). Diferente do plano por tema (IA), essa
// ordem é fixa e não depende de nenhuma chamada externa — ver
// src/data/chronologicalPlan.js pros detalhes e limitações da ordenação.
//
// Alcançada só por um card em PlanScreen.jsx — não é aba própria, mesmo
// padrão não-aba de ThemePlanScreen.jsx/NotesScreen.jsx. Reaproveita
// ReadingBlockView.jsx de verdade (mesmo padrão do plano por tema): os
// "movimentos" cronológicos fazem o papel dos 8 blocos temáticos de
// sempre, com blocks/sessionsByBlock no mesmo formato que deriveProgress
// já produz — por isso dá pra passar a lista INTEIRA de movimentos (não só
// o aberto), o que dá de graça a navegação automática pro próximo
// movimento quando termina o atual (mesma lógica de blocks[] em
// ReadingBlockView.jsx).
//
// O ritmo (Leve/Padrão/Intensivo/Livre) não é mais escolhido aqui dentro —
// é a MESMA escolha da ordem padrão, feita de uma vez só na aba Plano (ver
// PlanScreen.jsx, seção "Ordem de leitura" + "Ritmo de leitura"), pra não
// ter dois seletores de ritmo espalhados. `paceId` sempre vem de fora,
// refletindo esse ritmo atual. `autoOpenMovementId` abre direto no
// movimento onde a pessoa parou (usado pelo "Continuar sessão" da
// Home/Rotina quando o plano ativo é o cronológico — ver
// App.jsx/continueToday).
import { useState, useMemo, useEffect } from 'react'
import { CHRONOLOGICAL_MOVEMENTS, deriveChronoProgress } from '../data/chronologicalPlan'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'

export default function ChronologicalPlanScreen({
  session, authUser, completedSet, onToggleSession, onToggleChapter, onNavigate,
  paceId, autoOpenMovementId, onGoToReflectionFrom, onBack,
}) {
  const { lang } = session
  const [activeMovementId, setActiveMovementId] = useState(autoOpenMovementId ?? null)

  // Re-sincroniza sempre que App.jsx pedir pra abrir um movimento específico
  // (ex: "Continuar sessão" da Home/Rotina, ver App.jsx) — mesmo padrão de
  // JourneyScreen.jsx pra entryMode/initialBlockId.
  useEffect(() => {
    if (autoOpenMovementId != null) setActiveMovementId(autoOpenMovementId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenMovementId])

  const { blocks, sessionsByBlock } = useMemo(
    () => deriveChronoProgress(completedSet, paceId),
    [completedSet, paceId]
  )

  if (activeMovementId != null) {
    return (
      <ReadingBlockView
        session={session}
        authUser={authUser}
        onNavigate={onNavigate}
        blockId={activeMovementId}
        blocks={blocks}
        sessionsByBlock={sessionsByBlock}
        mode="session"
        completedSet={completedSet}
        onToggleSession={onToggleSession}
        onToggleChapter={onToggleChapter}
        onBack={() => setActiveMovementId(null)}
        onGoToReflection={() => onGoToReflectionFrom?.({ tab: 'chronologicalPlan', movementId: activeMovementId })}
      />
    )
  }

  const totalDone = blocks.reduce((s, b) => s + b.sessionsDone, 0)
  const totalSessions = blocks.reduce((s, b) => s + b.sessionsTotal, 0)
  const overallPercent = totalSessions ? Math.round((totalDone / totalSessions) * 1000) / 10 : 0

  // Sem quadro no handoff — cabeçalho e cartões seguem o mesmo padrão de
  // tela secundária já usado em ThemePlanScreen.jsx/GroupAdminScreen.jsx,
  // no lugar do degradê por bloco que essa lista tinha antes do redesign
  // Bento (ver GRADIENT_MAP/ACCENT_MAP/GLOW_MAP, não usados mais aqui).
  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={styles.headerTitle}>{t('chronoPlan.pageTitle', undefined, lang)}</p>
          <p style={styles.headerSub}>{t('chronoPlan.heroSub', undefined, lang)}</p>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.overallCard}>
          <div style={styles.overallBar}>
            <div style={{ ...styles.overallBarFill, width: `${overallPercent}%` }} />
          </div>
          <p style={styles.overallLabel}>{overallPercent}% · {t('chronoPlan.sessionsCount', { done: totalDone, total: totalSessions }, lang)}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {blocks.map(block => (
            <MovementCard
              key={block.id}
              block={block}
              onOpen={() => setActiveMovementId(block.id)}
              lang={lang}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MovementCard({ block, onOpen, lang }) {
  const name = lang === 'en' ? block.nameEn : block.name
  const desc = lang === 'en' ? block.descEn : block.desc
  const isActive = block.status === 'active'
  const isDone = block.status === 'done'

  return (
    <button
      style={{ ...styles.movementCard, ...(isActive ? styles.movementCardActive : {}) }}
      onClick={onOpen}
    >
      <div style={{ ...styles.movementIcon, ...(isActive ? styles.movementIconActive : {}) }}>
        <AppIcon name={block.icon} size={19} color={isActive ? 'var(--bento-ink)' : 'var(--bento-sand-icon)'} />
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <p style={{ ...styles.movementName, ...(isActive ? { color: '#fff' } : {}) }}>{name}</p>
        <p style={{ ...styles.movementDesc, ...(isActive ? { color: 'rgba(255,255,255,.6)' } : {}) }}>{desc}</p>
        {isActive && <span style={styles.badgeActive}>{t('journey.inProgressBadge', undefined, lang)}</span>}
        {isDone && <span style={styles.badgeDone}>{t('journey.doneBadge', undefined, lang)}</span>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ ...styles.movementPercent, ...(isActive ? { color: 'var(--bento-accent)' } : {}) }}>{block.percent}%</div>
        <div style={{ ...styles.movementCount, ...(isActive ? { color: 'rgba(255,255,255,.45)' } : {}) }}>{block.sessionsDone}/{block.sessionsTotal}</div>
      </div>
    </button>
  )
}

const styles = {
  screen:     { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header:     { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 14px' },
  backBtn:    { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle:{ fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  headerSub:  { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },

  body:       { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 },

  overallCard:   { background: 'var(--bento-card)', borderRadius: 16, padding: '12px 14px' },
  overallBar:    { height: 6, background: 'var(--bento-line)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  overallBarFill:{ height: '100%', background: 'var(--bento-accent)', borderRadius: 99 },
  overallLabel:  { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)' },

  movementCard:  { display: 'flex', alignItems: 'center', gap: 11, width: '100%', background: 'var(--bento-card)', border: 'none', borderRadius: 20, padding: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-bento)' },
  movementCardActive: { background: 'var(--bento-ink)' },
  movementIcon:  { width: 44, height: 44, borderRadius: 13, background: 'var(--bento-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  movementIconActive: { background: 'var(--bento-accent)' },
  movementName:  { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 2, letterSpacing: '-0.2px' },
  movementDesc:  { fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  movementPercent: { fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-0.5px' },
  movementCount: { fontFamily: 'var(--font-bento)', fontSize: 9, fontWeight: 600, color: 'var(--bento-t4)' },
  badgeActive: { display: 'inline-block', marginTop: 3, fontSize: 9.5, fontWeight: 800, color: 'var(--bento-accent)', background: 'rgba(240,102,43,.16)', borderRadius: 999, padding: '2px 8px' },
  badgeDone:   { display: 'inline-block', marginTop: 3, fontSize: 9.5, fontWeight: 800, color: '#1E8E4F', background: '#E1F5E9', borderRadius: 999, padding: '2px 8px' },
}
