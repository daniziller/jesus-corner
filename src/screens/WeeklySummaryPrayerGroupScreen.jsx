// WeeklySummaryPrayerGroupScreen.jsx — "A semana em oração e no grupo"
// (quadro 31c, Bloco 13). Terceira e última tela do Resumo semanal.
//
// "Levar para a reflexão"/"Levar ao grupo" (a pergunta da próxima semana):
// não existe hoje um jeito de "empurrar" uma pergunta pronta direto pra
// dentro da Reflexão livre nem pra sala de um grupo específico sem saber
// QUAL sala está ativa — em vez de inventar essa ponte, os dois botões
// copiam a pergunta (clipboard/compartilhar) com uma instrução de onde
// colar (a Reflexão livre, ou "Pergunta da semana" em Administração do
// grupo, que já existe). Simplificação real, documentada — não um link
// direto fingido.
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { weekRangeLabel, chaptersRangeLabel } from '../recap/weeklySummaryMath'

const FONT = 'var(--font-bento)'

async function copyText(text) {
  if (navigator.share) {
    try { await navigator.share({ text }); return true } catch { /* cancelado — cai pro clipboard */ }
  }
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

export default function WeeklySummaryPrayerGroupScreen({ session, summaries, selectedIndex, onBack }) {
  const lang = session.lang
  const L = (k, vars) => t(`weeklySummary.${k}`, vars, lang)
  const current = summaries[selectedIndex] ?? null
  if (!current) return null

  const prayerMinutes = Math.round((current.stepSeconds.prayer ?? 0) / 60)
  const chaptersLabel = chaptersRangeLabel(current.chapters, lang)

  async function shareWeek() {
    const text = L('shareMessage', { theme: current.summary.openingParagraph.split('.')[0], chapters: chaptersLabel || '—' })
    await copyText(text)
  }

  async function takeQuestionTo(destinationKey) {
    const ok = await copyText(current.summary.nextWeekQuestion)
    if (ok) window.alert?.(L(destinationKey))
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={s.title}>{L('prayerAndGroupTitle')}</p>
          <p style={s.dateRange}>{weekRangeLabel(current.startKey, current.endKey, lang)}</p>
        </div>
      </div>

      <div style={s.body}>
        <div style={s.card}>
          <p style={s.cardLabel}>{L('prayerLabel')}</p>
          <div style={s.listRow}>
            <span style={s.listLabelText}>{L('youPrayedForLabel')}</span>
            <span style={s.listValue}>{t(current.prayer.prayedForCount === 1 ? 'weeklySummary.requestsCountOne' : 'weeklySummary.requestsCountMany', { n: current.prayer.prayedForCount }, lang)}</span>
          </div>
          <div style={s.listRow}>
            <span style={s.listLabelText}>{L('peoplePrayedForYouLabel')}</span>
            <span style={s.listValue}>{t(current.prayer.peoplePrayedForMe === 1 ? 'weeklySummary.peopleCountOne' : 'weeklySummary.peopleCountMany', { n: current.prayer.peoplePrayedForMe }, lang)}</span>
          </div>
          <div style={{ ...s.listRow, borderBottom: 'none' }}>
            <span style={s.listLabelText}>{L('prayerTimeLabel')}</span>
            <span style={s.listValue}>{L('minutesValue', { n: prayerMinutes })}</span>
          </div>
        </div>

        {current.groups.length > 0 ? (
          current.groups.map(g => (
            <div key={g.groupId} style={s.darkCard}>
              <div style={s.darkLabelRow}>
                <span style={s.diamond} />
                <p style={s.darkLabel}>{L('inGroupLabel', { group: g.groupName })}</p>
              </div>
              <p style={s.groupText}>{t(g.messageCount === 1 ? 'weeklySummary.groupMessagesOne' : 'weeklySummary.groupMessagesMany', { n: g.messageCount }, lang)}</p>
            </div>
          ))
        ) : (
          <div style={s.card}>
            <p style={s.emptyGroupText}>{L('noGroupActivityLine')}</p>
          </div>
        )}

        <div style={s.card}>
          <p style={s.cardLabel}>{L('nextWeekQuestionLabel')}</p>
          <p style={s.questionText}>"{current.summary.nextWeekQuestion}"</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={s.takeToReflectionBtn} onClick={() => takeQuestionTo('takeToReflectionConfirm')}>{L('takeToReflectionBtn')}</button>
            <button type="button" style={s.takeToGroupBtn} onClick={() => takeQuestionTo('takeToGroupConfirm')}>{L('takeToGroupBtn')}</button>
          </div>
        </div>

        <div style={s.sandCard}>
          <p style={s.sandText}>{L('privacyNote')}</p>
        </div>
      </div>

      <div style={s.footer}>
        <button style={s.shareBtn} onClick={shareWeek}>
          <AppIcon name="Share2" size={16} strokeWidth={2.2} color="var(--bento-ink)" />
          <span>{L('shareWeekBtn')}</span>
        </button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  dateRange: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px', display: 'flex', flexDirection: 'column', gap: 8 },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 12px' },
  listRow: { display: 'flex', alignItems: 'center', gap: 12, height: 42, borderBottom: '1px solid var(--bento-line)' },
  listLabelText: { flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t3)' },
  listValue: { fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)' },

  darkCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: 20 },
  darkLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  diamond: { width: 9, height: 9, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  darkLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  groupText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 600, lineHeight: 1.55, color: 'rgba(255,255,255,.9)', margin: 0, textWrap: 'pretty' },
  emptyGroupText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },

  questionText: { fontFamily: FONT, fontSize: 15.5, fontWeight: 700, lineHeight: 1.45, color: 'var(--bento-ink)', margin: '0 0 12px', textWrap: 'pretty' },
  takeToReflectionBtn: { flex: 1, height: 40, border: 'none', borderRadius: 14, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  takeToGroupBtn: { flex: 'none', width: 110, height: 40, border: 'none', borderRadius: 14, background: 'var(--bento-line)', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-t3)', cursor: 'pointer' },

  sandCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '14px 18px' },
  sandText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  shareBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)' },
}
