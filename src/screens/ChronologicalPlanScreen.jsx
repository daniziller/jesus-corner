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
import { GRADIENT_MAP } from '../data/bibleBlocks'
import { ACCENT_MAP, GLOW_MAP } from '../utils/blockColors'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'

export default function ChronologicalPlanScreen({
  session, authUser, completedSet, onToggleSession, onToggleChapter, onNavigate,
  paceId, autoOpenMovementId, onGoToReflectionFrom,
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

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div style={styles.body}>
        <div className="page-header" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('chronoPlan.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('chronoPlan.heroSub', undefined, lang)}</p>
        </div>

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
  const gradient = GRADIENT_MAP[block.gradientKey]
  const accent = ACCENT_MAP[block.gradientKey]
  const name = lang === 'en' ? block.nameEn : block.name
  const desc = lang === 'en' ? block.descEn : block.desc

  return (
    <button
      style={{
        ...styles.movementCard,
        boxShadow: block.status === 'active' ? `var(--shadow-premium), 0 8px 22px ${GLOW_MAP[block.gradientKey]}` : `0 8px 22px ${GLOW_MAP[block.gradientKey]}`,
        border: block.status === 'active' ? '0.5px solid var(--gold-soft)' : styles.movementCard.border,
      }}
      onClick={onOpen}
    >
      <div style={{ width: 44, height: 44, borderRadius: 13, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <AppIcon name={block.icon} size={20} color={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <p style={styles.movementName}>{name}</p>
        <p style={styles.movementDesc}>{desc}</p>
        {block.status === 'active' && <span className="badge badge-orange" style={{ marginTop: 3 }}>{t('journey.inProgressBadge', undefined, lang)}</span>}
        {block.status === 'done' && <span className="badge badge-green" style={{ marginTop: 3 }}>{t('journey.doneBadge', undefined, lang)}</span>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: accent, letterSpacing: '-0.5px' }}>{block.percent}%</div>
        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--g5)' }}>{block.sessionsDone}/{block.sessionsTotal}</div>
      </div>
    </button>
  )
}

const styles = {
  body:       { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  heroSub:    { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: '0 2px' },

  overallCard:   { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 16, padding: '12px 14px', boxShadow: 'var(--shadow-card)' },
  overallBar:    { height: 6, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  overallBarFill:{ height: '100%', background: 'var(--grad-vivid)', borderRadius: 99 },
  overallLabel:  { fontSize: 11, fontWeight: 700, color: 'var(--g5)' },

  movementCard: { display: 'flex', alignItems: 'center', gap: 11, width: '100%', background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' },
  movementName: { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, color: 'var(--bk)', marginBottom: 2, letterSpacing: '-0.2px' },
  movementDesc: { fontSize: 10.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
}
