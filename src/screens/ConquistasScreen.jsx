// ConquistasScreen.jsx — Minhas conquistas (G5, HANDOFF §5.4): total ganho
// de 38, os 38 traços, "A mais perto", um cartão por família e o cartão
// "Blocos da Bíblia". Aberta pelo cartão SUAS SEMANAS do Hoje e por
// Perfil → "Minhas conquistas". Conquistas gravadas e ainda não vistas
// levam um ponto laranja ("nova") nesta visita e são marcadas como vistas
// ao abrir (HANDOFF §7).
//
// O que está GANHO vem de user_data.achievements (fonte de verdade, nunca
// recalculada pra menos); os números de progresso vêm de
// loadGamificationStats (ver gamification/evaluate.js), carregados depois
// da primeira pintura, com esqueleto no lugar — nunca spinner.
import { useEffect, useMemo, useState } from 'react'
import AppIcon from '../icons/AppIcon'
import Medalha from '../components/gamificacao/Medalha'
import { FAMILIES, TOTAL_ACHIEVEMENTS, familyAchievementId, blockAchievementId, ALL_ACHIEVEMENT_IDS } from '../data/achievements'
import { GAMIFICATION_BLOCKS, blockColorVar } from '../data/gamificationBlocks'
import { loadGamificationStats } from '../gamification/evaluate'
import { pickClosest, unseenIds } from '../gamification/achievementsMath'
import { nextBlockToLight } from '../gamification/bibleProgressMath'
import { closestPhrase, nextBlockFooter } from '../gamification/celebrationText'
import { formatInt, deOf, monthName } from '../gamification/format'
import { t } from '../i18n'

const FONT = 'var(--font-bento)'

export default function ConquistasScreen({ session, completedSet, gamification, onBack, onOpenFamilia, onOpenEstante, onSeen }) {
  const { lang, dailyRoutine, weeklyGoalDays } = session
  const store = gamification?.achievements ?? {}
  const [data, setData] = useState(null)
  // Pontos de "nova" desta visita — fixados assim que a linha gravada
  // existe (pode chegar um instante depois da montagem), e só então
  // marcados como vistos; senão sumiriam no mesmo instante.
  const [dotIds, setDotIds] = useState(null)

  useEffect(() => {
    let alive = true
    loadGamificationStats({ completedSet, dailyRoutine, weeklyGoalDays }).then(d => { if (alive) setData(d) }).catch(err => console.error('[conquistas] carregar', err))
    return () => { alive = false }
  }, [completedSet, dailyRoutine, weeklyGoalDays])

  useEffect(() => {
    if (dotIds !== null || !gamification) return
    const ids = unseenIds(gamification.achievements)
    setDotIds(new Set(ids))
    if (ids.length > 0) onSeen?.(ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamification])

  const earnedCount = useMemo(() => ALL_ACHIEVEMENT_IDS.filter(id => store[id]).length, [store])
  const closest = data ? pickClosest(data.states.families) : null
  const sinceMonth = data?.firstActivityIso ? monthName(new Date(data.firstActivityIso)) : null
  const blocksEarned = GAMIFICATION_BLOCKS.filter(b => store[blockAchievementId(b.id)]).length
  const nextBlock = data ? nextBlockToLight(data.progress) : null

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>Minhas conquistas</p>
      </div>

      <div style={s.body}>
        <div style={s.hero}>
          <div style={s.heroTop}>
            <p style={s.heroBig}>{formatInt(earnedCount)}</p>
            <p style={s.heroCaption}>de {TOTAL_ACHIEVEMENTS} conquistas{sinceMonth ? <><br />desde {sinceMonth}</> : null}</p>
          </div>
          <div style={s.ticks} aria-hidden="true">
            {Array.from({ length: TOTAL_ACHIEVEMENTS }, (_, i) => (
              <span key={i} style={{ ...s.tick, background: i < earnedCount ? 'var(--bento-accent)' : 'rgba(255,255,255,.14)' }} />
            ))}
          </div>
          {data ? (
            closest ? (
              <button type="button" style={s.closest} onClick={() => onOpenFamilia?.(closest.familyId)}>
                <Medalha familia={closest.familyId} degrau={closest.degrau} size={44} ganha={false} sobreEscuro tracejadoLaranja />
                <span style={s.closestText}>
                  <span style={s.closestLabel}>A MAIS PERTO</span>
                  <span style={s.closestPhrase}>{closestPhrase(closest)}</span>
                </span>
              </button>
            ) : null
          ) : (
            <div className="rb-context-skeleton" style={s.closestSkeleton} />
          )}
        </div>

        {FAMILIES.map(fam => {
          const st = data?.states.families.find(f => f.id === fam.id)
          const earnedN = fam.degraus.filter(d => store[familyAchievementId(fam.id, d.degrau)]).length
          const complete = earnedN === fam.degraus.length
          return (
            <button key={fam.id} type="button" style={s.famCard} onClick={() => onOpenFamilia?.(fam.id)}>
              <span style={s.famHead}>
                <span style={s.famName}>{fam.nome}</span>
                <span style={s.famCount}>{earnedN} de 6</span>
              </span>
              <span style={s.famMedals}>
                {fam.degraus.map(d => {
                  const id = familyAchievementId(fam.id, d.degrau)
                  return (
                    <span key={d.degrau} style={s.medalWrap}>
                      <Medalha familia={fam.id} degrau={d.degrau} size={47} ganha={!!store[id]} ariaLabel={`${d.nome}, ${store[id] ? 'ganha' : 'ainda não'}`} />
                      {dotIds?.has(id) && <span style={s.newDot} aria-label="nova" />}
                    </span>
                  )
                })}
              </span>
              {!complete && (
                st ? (
                  <>
                    <span style={s.nextRow}>
                      <span style={s.nextLabel}>Próxima: <strong style={s.nextName}>{st.next?.nome}</strong></span>
                      <span style={s.nextCount}>{deOf(st.value, st.next?.limiar ?? 0)}</span>
                    </span>
                    <span style={s.bar}><span style={{ ...s.barFill, width: `${Math.round(st.progress * 100)}%` }} /></span>
                  </>
                ) : (
                  <span className="rb-context-skeleton" style={s.nextSkeleton} />
                )
              )}
            </button>
          )
        })}

        <button type="button" style={s.famCard} onClick={() => onOpenEstante?.()}>
          <span style={s.famHead}>
            <span style={s.famName}>Blocos da Bíblia</span>
            <span style={s.famCount}>{blocksEarned} de 8</span>
          </span>
          <span style={s.blockGrid}>
            {GAMIFICATION_BLOCKS.map(b => (
              <span key={b.id} style={s.blockCell}>
                <span style={s.medalWrap}>
                  <Medalha bloco={b.id} size={50} ganha={!!store[blockAchievementId(b.id)]} />
                  {dotIds?.has(blockAchievementId(b.id)) && <span style={s.newDot} aria-label="nova" />}
                </span>
                <span style={s.blockName}>{b.nome}</span>
              </span>
            ))}
          </span>
          {data && (
            <span style={s.blockFooter}>
              <span style={{ ...s.footDot, background: nextBlock ? blockColorVar(nextBlock.id) : 'var(--bento-accent)' }} />
              <span style={s.footText}>{nextBlockFooter(data.progress, nextBlock)}</span>
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '22px 20px 12px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px calc(var(--nav-height) + 24px)', display: 'flex', flexDirection: 'column', gap: 10 },
  hero: { borderRadius: 26, background: 'var(--bento-ink)', padding: '20px 20px 18px' },
  heroTop: { display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 14 },
  heroBig: { fontFamily: FONT, fontSize: 50, fontWeight: 800, lineHeight: 0.85, letterSpacing: '-2.5px', color: '#fff', margin: 0 },
  heroCaption: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: 'rgba(255,255,255,.55)', margin: 0 },
  ticks: { display: 'flex', gap: 3, marginBottom: 14 },
  tick: { flex: 1, minWidth: 0, height: 8, borderRadius: 99 },
  closest: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, background: 'rgba(255,255,255,.06)', border: 'none', padding: 12, cursor: 'pointer', textAlign: 'left', minHeight: 44 },
  closestSkeleton: { height: 68, borderRadius: 16, background: 'rgba(255,255,255,.06)' },
  closestText: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  closestLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)' },
  closestPhrase: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.3 },
  famCard: { width: '100%', borderRadius: 24, background: 'var(--bento-card)', border: 'none', padding: '16px 18px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT },
  famHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' },
  famName: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)' },
  famCount: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t3)' },
  famMedals: { display: 'flex', justifyContent: 'space-between' },
  medalWrap: { position: 'relative', display: 'inline-flex' },
  newDot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: 'var(--bento-accent)', boxShadow: '0 0 0 2px var(--bento-card)' },
  nextRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  nextLabel: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-ink)' },
  nextName: { fontWeight: 800 },
  nextCount: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t3)', flexShrink: 0 },
  nextSkeleton: { height: 30, borderRadius: 8, background: 'var(--bento-line)' },
  bar: { display: 'block', height: 6, borderRadius: 99, background: 'var(--bento-line)', overflow: 'hidden' },
  barFill: { display: 'block', height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },
  blockGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px 8px' },
  blockCell: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  blockName: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1.25, color: 'var(--bento-t3)', textAlign: 'center' },
  blockFooter: { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14, background: 'var(--bento-line)', padding: '11px 13px' },
  footDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  footText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-quote-ink)' },
}
