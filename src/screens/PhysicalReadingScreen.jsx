// PhysicalReadingScreen.jsx — Leitura na Bíblia física (pedido dela,
// 2026-10-25, par de ReadingChoiceScreen.jsx). De propósito mostra SÓ o
// que ler hoje (livro + capítulos, título da sessão) e o botão de marcar
// — nada de texto, marcações ou IA: a leitura acontece fora do app.
// Marcar passa por finishPhysicalReading (App.jsx), que marca os
// capítulos da sessão como lidos igual ao "Concluir" do leitor (conta no
// progresso, no passo do dia e no encadeamento guiado).
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function PhysicalReadingScreen({ session, done: doneProp, onMarkDone, onReadInApp, onBack }) {
  const { lang, guided } = session
  const L = (k, vars) => t(`physicalReading.${k}`, vars, lang)

  // Foto da sessão de hoje tirada na montagem (varredura 2026-10-25): assim
  // que "Marcar como lida" grava, session.todaySession já avança pra
  // PRÓXIMA sessão no mesmo render — a tela trocava a referência
  // ("Salmos 25") embaixo da pessoa, `done` voltava a false e o botão
  // reabria: um 2º toque nos 2,6 s do modo guiado marcava a sessão
  // seguinte também. `marked` local segura o estado até sair da tela.
  const [todaySession] = useState(() => session.todaySession)
  const [marked, setMarked] = useState(false)
  const done = doneProp || marked

  const book = lang === 'en' ? (todaySession?.bookEn || todaySession?.book) : todaySession?.book
  const chStart = todaySession?.chStart
  const chEnd = todaySession?.chEnd ?? chStart
  const reference = chStart == null ? book : (chStart === chEnd ? `${book} ${chStart}` : `${book} ${chStart}–${chEnd}`)
  const chapterCount = chStart == null ? 0 : chEnd - chStart + 1

  function handleMark() {
    if (done) return
    setMarked(true)
    onMarkDone?.()
  }

  // Em modo guiado, marcar dispara o avanço automático pro próximo passo
  // (advanceGuided via toggleSession) — a tela só mostra o "marcada" até
  // lá. Fora do modo guiado, finishPhysicalReading já volta pra Meu Plano.
  const waitingNext = done && guided?.step === 'reading'

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.headerTitle}>{L('pageTitle')}</p>
          <p style={styles.headerSub}>{L('eyebrow')}</p>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.card}>
          <p style={styles.cardLabel}>{L('readLabel')}</p>
          <p style={styles.reference}>{reference}</p>
          {todaySession?.title && <p style={styles.sessionTitle}>{todaySession.title}</p>}
          {chapterCount > 0 && (
            <p style={styles.chapters}>{L(chapterCount === 1 ? 'chaptersOne' : 'chaptersMany', { n: chapterCount })}</p>
          )}
        </div>

        <p style={styles.hint}>{done ? L('doneLine') : L('hint')}</p>
        {waitingNext && <p style={styles.nextLine}>{L('nextLine')}</p>}
      </div>

      <div style={styles.footer}>
        <button style={{ ...styles.markBtn, ...(done ? styles.markBtnDone : {}) }} onClick={handleMark} disabled={done}>
          <AppIcon name="Check" size={16} strokeWidth={2.6} color="var(--bento-ink)" />
          <span>{done ? L('markedBtn') : L('markBtn')}</span>
        </button>
        {!done && <button style={styles.readInAppLink} onClick={onReadInApp}>{L('readInAppLink')}</button>}
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.3px', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 20px', display: 'flex', flexDirection: 'column', gap: 12 },

  card: { borderRadius: 24, background: 'var(--bento-ink)', padding: '22px 22px 24px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 12px' },
  reference: { fontFamily: FONT, fontSize: 30, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.8px', color: '#fff', margin: '0 0 8px' },
  sessionTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: 'rgba(255,255,255,.75)', margin: '0 0 6px' },
  chapters: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },

  hint: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '2px 2px 0' },
  nextLine: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-accent)', margin: '0 2px' },

  footer: { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  markBtn: { height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
  markBtnDone: { background: 'var(--bento-card)', cursor: 'default' },
  readInAppLink: { border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--bento-t3)', textAlign: 'center' },
}
