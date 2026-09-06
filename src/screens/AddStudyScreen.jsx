// AddStudyScreen.jsx — "Adicionar um estudo" (quadro 26e, Bloco 12).
// Entrada real pra 22a agora (RoutineScreen/ThemePlanScreen navegam pra cá
// primeiro): prontos primeiro (sem precisar de IA nem de session.hasAI —
// só session.hasPremium, como o resto de Meu Plano), IA depois.
//
// "Usar" um pronto pula direto pra 22b/26f (StudyProposalScreen) com o
// plano já montado — sem passar por 22a, que só existe pra QUEM escreve um
// pedido. "Criar estudo" aqui manda o texto digitado pra 22a
// (CreateStudyScreen.jsx) já preenchido, pra revisar formato antes de
// gerar — sem duplicar a chamada de IA aqui.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getReadyMadeStudies } from '../studies/publicStudiesStore'

const FONT = 'var(--font-bento)'

export default function AddStudyScreen({ session, onBack, onUseReadyMade, onCreateWithPrompt, onExploreBank, onContinueWithoutStudy }) {
  const lang = session.lang
  const L = (k, vars) => t(`addStudy.${k}`, vars, lang)
  const [readyMade, setReadyMade] = useState([])
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    getReadyMadeStudies().then(setReadyMade).catch(err => console.error('Failed to load ready-made studies', err))
  }, [])

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>{L('title')}</p>
      </div>
      <p style={s.sub}>{L('sub')}</p>

      <div style={s.body}>
        <div style={s.card}>
          <div style={s.cardHeadRow}>
            <p style={s.cardLabel}>{L('readyMadeLabel')}</p>
            <span style={s.cardHint}>{L('readyMadeHint')}</span>
          </div>
          {readyMade.map((study, i) => {
            const days = study.passages.length
            const books = [...new Set(study.passages.map(p => p.book))]
            return (
              <div key={study.id} style={{ ...s.readyRow, borderBottom: i === readyMade.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
                <div style={s.readyIcon}><span style={s.readyIconText}>{days}d</span></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.readyTitle}>{study.title}</p>
                  <p style={s.readySub}>{L('readyMadeMeta', { n: days, books: books.join(', ') })}</p>
                </div>
                <button type="button" style={s.useBtn} onClick={() => onUseReadyMade?.(study)}>{L('useBtn')}</button>
              </div>
            )
          })}
          <button type="button" style={s.exploreRow} onClick={onExploreBank}>
            <span style={{ flex: 1, textAlign: 'left' }}>{L('exploreBankRow')}</span>
            <span style={s.chevron}>›</span>
          </button>
        </div>

        {session.hasAI && (
          <div style={s.darkCard}>
            <div style={s.darkLabelRow}>
              <span style={s.diamond} />
              <p style={s.darkLabel}>{L('aiCardLabel')}</p>
            </div>
            <p style={s.aiCardTitle}>{L('aiCardTitle')}</p>
            <input
              style={s.aiInput}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={L('aiInputPlaceholder')}
              maxLength={200}
            />
            <button type="button" style={s.aiSubmitBtn} onClick={() => onCreateWithPrompt?.(prompt.trim())} disabled={!prompt.trim()}>
              <span>{L('aiSubmitBtn')}</span>
              <span>→</span>
            </button>
          </div>
        )}

        <p style={s.footnote}>{L('footnote')}</p>
      </div>

      <div style={s.footer}>
        <button type="button" style={s.continueBtn} onClick={onContinueWithoutStudy}>{L('continueWithoutStudyBtn')}</button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: '10px 20px 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px 4px' },
  cardHeadRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 4px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  cardHint: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t5)' },
  readyRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0' },
  readyIcon: { width: 38, height: 38, flexShrink: 0, borderRadius: 13, background: 'var(--bento-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  readyIconText: { fontFamily: FONT, fontSize: 11, fontWeight: 800, color: 'var(--bento-sand-icon)' },
  readyTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  readySub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t4)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  useBtn: { height: 32, padding: '0 14px', flexShrink: 0, borderRadius: 11, border: 'none', background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  exploreRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, height: 50, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)' },
  chevron: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)' },

  darkCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px' },
  darkLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  diamond: { width: 9, height: 9, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  darkLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  aiCardTitle: { fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.6px', color: '#fff', margin: '0 0 12px', textWrap: 'pretty' },
  aiInput: { width: '100%', height: 46, border: 'none', outline: 'none', borderRadius: 15, background: 'rgba(255,255,255,.08)', padding: '0 16px', fontFamily: FONT, fontSize: 13, fontWeight: 500, color: '#fff', margin: '0 0 10px', boxSizing: 'border-box' },
  aiSubmitBtn: { width: '100%', height: 46, border: 'none', borderRadius: 15, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)' },

  footnote: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t4)', margin: '2px 0 0' },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  continueBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-t3)', cursor: 'pointer' },
}
