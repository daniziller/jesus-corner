// BlessingScreen.jsx — Fim da oração (pacote 36-37, quadro 36f). Única
// tela do app com fundo escuro inteiro, altura de celular, sem rolagem.
// Texto do app, nunca gerado por IA — só o nome e o próximo passo variam
// (ver HANDOFF-36-37-passos.md). Se a oração era o último passo do dia, o
// botão vira "Terminar o dia" (leva pro fecho do dia — routineComplete até
// o Bloco 5 desta leva trazer o 37c de verdade).
import { t } from '../i18n'

function cap(s) { return s[0].toUpperCase() + s.slice(1) }

// Rótulo do botão primário por passo seguinte — Oração nunca é o próximo
// (é o passo desta própria tela), então só leitura/estudo/reflexão têm
// entrada; goToReadingBtn é o fallback se algo inesperado chegar aqui.
const GO_TO_BTN_KEY = { reading: 'goToReadingBtn', study: 'goToStudyBtn', reflection: 'goToReflectionBtn' }

export default function BlessingScreen({ session, stepMinutes, onContinueSession, onNavigate, onFinishDay, onBackToPlan }) {
  const { lang, userName, todaySession, hasNoPlan } = session
  const L = (k, vars) => t(`blessing.${k}`, vars, lang)
  const totalMinutes = stepMinutes?.prayer ?? session.plan.prayerMinutes

  const todaysSteps = session.todaysSteps ?? []
  const nextStepKey = todaysSteps[todaysSteps.indexOf('prayer') + 1] ?? null

  function stepName(k) { return t(`home.routine${cap(k)}`, undefined, lang) }
  function stepMinutesFor(k) {
    if (k === 'reading') return stepMinutes?.reading ?? session.plan.readingMinutes
    if (k === 'reflection') return stepMinutes?.reflection ?? session.plan.reflectionMinutes
    if (k === 'study') return stepMinutes?.reading ?? session.plan.readingMinutes
    return null
  }
  function stepDetail(k) {
    if (k === 'reading' && !hasNoPlan) return todaySession?.title ?? null
    return null
  }

  function handlePrimary() {
    if (!nextStepKey) { onFinishDay?.(); return }
    if (nextStepKey === 'reading') onContinueSession?.()
    else onNavigate?.(nextStepKey)
  }

  const nextLine = nextStepKey
    ? L('nextLine', {
        step: stepDetail(nextStepKey) ? `${stepName(nextStepKey)} · ${stepDetail(nextStepKey)}` : stepName(nextStepKey),
        min: stepMinutesFor(nextStepKey),
      })
    : null

  return (
    <div style={styles.screen}>
      <div style={styles.top}>
        <p style={styles.doneTag}>{L('doneTag', { n: totalMinutes })}</p>
      </div>

      <div style={styles.middle}>
        <span style={styles.diamond} />
        <p style={styles.label}>{L('label')}</p>
        <p style={styles.title}>{L('title', { name: userName })}</p>
        <p style={styles.body}>{L('body')}</p>
        <p style={styles.reference}>{L('reference')}</p>
      </div>

      <div style={styles.bottom}>
        {nextStepKey && (
          <div style={styles.nextCard}>
            <p style={styles.nextLabel}>{L('nextLabel')}</p>
            <p style={styles.nextLine}>{nextLine}</p>
          </div>
        )}
        <button style={styles.primaryBtn} onClick={handlePrimary}>
          {/* HANDOFF: "o botão vira 'Terminar o dia'... muda apenas o
              nome e o próximo passo" — o próximo passo nem sempre é
              Leitura (pode ser Estudo, num dia de estudo ativo, ou
              Reflexão, se Leitura já tiver sido feita antes da Oração);
              cada passo tem seu próprio rótulo por causa da concordância
              de gênero do artigo ("a leitura"/"o estudo"/"a reflexão"). */}
          <span>{nextStepKey ? L(GO_TO_BTN_KEY[nextStepKey] ?? 'goToReadingBtn') : L('finishDayBtn')}</span>
          <span style={styles.primaryArrow}>→</span>
        </button>
        <button style={styles.backLink} onClick={onBackToPlan}>{L('backToPlanLink')}</button>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-ink)', padding: '20px 24px calc(20px + var(--safe-bottom))', boxSizing: 'border-box' },
  top: { flexShrink: 0, display: 'flex', justifyContent: 'flex-end' },
  doneTag: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.55)', margin: 0 },

  middle: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 },
  diamond: { width: 16, height: 16, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 4, marginBottom: 28 },
  label: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  title: { fontFamily: FONT, fontSize: 30, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.8px', color: '#fff', margin: '0 0 18px' },
  body: { fontFamily: FONT, fontSize: 15, fontWeight: 500, lineHeight: 1.6, color: 'rgba(255,255,255,.6)', margin: '0 0 16px' },
  reference: { fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },

  bottom: { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  nextCard: { borderRadius: 18, background: 'rgba(255,255,255,.06)', padding: '14px 18px' },
  nextLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  nextLine: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: '#fff', margin: 0 },
  primaryBtn: { height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
  primaryArrow: { fontSize: 15, fontWeight: 700 },
  backLink: { border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--bento-t4)', textAlign: 'center' },
}
