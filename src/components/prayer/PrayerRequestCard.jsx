// PrayerRequestCard.jsx — um cartão de pedido de oração (quadro 36d,
// pacote 36-37, Bloco 2). Compartilhado entre PrayerRequestsScreen.jsx
// (lista completa) e a etapa Súplica de PrayerScreen.jsx (a linha vira a
// própria lista, ver handoff) — mesmo cartão, dois lugares.
//
// Três variantes, pela combinação status/isMine:
//   - ativo + meu:   selo "MEU" laranja, "orando há N dias" à direita,
//                    botões "Orei por isso" (desabilita depois de marcar
//                    hoje) + "Arquivar" (→ 36e).
//   - ativo + grupo: selo com o nome do grupo, tempo desde a publicação,
//                    "N pessoas do grupo já oraram", só "Orei por isso"
//                    (quem arquiva é o autor, não quem vê).
//   - respondido:    cartão areia, selo da resposta (Sim sólido, as
//                    outras translúcidas), "orado por N dias", nota em
//                    itálico se a pessoa escreveu uma ao arquivar.
import { t } from '../../i18n'
import { daysOrMonthsSpan, calendarDaysSince } from '../../prayer/prayerRequestFormat'

const FONT = 'var(--font-bento)'

export default function PrayerRequestCard({ request: r, lang, onPray, onArchive }) {
  const L = (k, vars) => t(`prayerRequests.${k}`, vars, lang)

  if (r.status === 'closed') {
    const isSim = r.resposta === 'sim'
    return (
      <div style={s.answeredCard}>
        <div style={s.topRow}>
          <span style={{ ...s.badge, ...(isSim ? s.badgeSolid : s.badgeTint) }}>{L(`response${capResponse(r.resposta)}`)}</span>
          <span style={s.timeText}>{L('answeredDaysLabel', { span: daysOrMonthsSpan(r.diasOrados, lang) })}</span>
        </div>
        <p style={s.body}>{r.body}</p>
        {r.notaResposta && <p style={s.note}>&ldquo;{r.notaResposta}&rdquo;</p>}
      </div>
    )
  }

  if (r.isMine) {
    return (
      <div style={s.card}>
        <div style={s.topRow}>
          <span style={{ ...s.badge, ...s.mineBadge }}>{L('mineTag')}</span>
          <span style={s.timeText}>{L('activeDaysLabel', { span: daysOrMonthsSpan(r.diasOrados, lang) })}</span>
        </div>
        <p style={s.body}>{r.body}</p>
        <div style={s.actionsRow}>
          <button type="button" style={{ ...s.prayBtn, ...(r.prayedToday ? s.prayBtnDone : {}) }} onClick={() => onPray?.(r)} disabled={r.prayedToday}>
            {r.prayedToday ? L('prayedTodayBtn') : L('prayBtn')}
          </button>
          <button type="button" style={s.archiveBtn} onClick={() => onArchive?.(r)}>{L('archiveBtn')}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.card}>
      <div style={s.topRow}>
        <span style={{ ...s.badge, ...s.groupBadge }}>{(r.groupName || '').toUpperCase()}</span>
        <span style={s.timeText}>{L('timeAgoLabel', { span: daysOrMonthsSpan(calendarDaysSince(r.createdAt), lang) })}</span>
      </div>
      <p style={s.body}>{r.body}</p>
      <p style={s.groupPrayedLine}>{L(r.prayCount === 1 ? 'groupPrayedOne' : 'groupPrayedMany', { n: r.prayCount })}</p>
      <div style={s.actionsRow}>
        <button type="button" style={{ ...s.prayBtn, ...(r.prayedToday ? s.prayBtnDone : {}) }} onClick={() => onPray?.(r)} disabled={r.prayedToday}>
          {r.prayedToday ? L('prayedTodayBtn') : L('prayBtn')}
        </button>
      </div>
    </div>
  )
}

function capResponse(key) {
  return { sim: 'Sim', nao: 'Nao', espere: 'Espere', aprenda: 'Aprenda', se_mova: 'SeMova' }[key] ?? 'Sim'
}

const s = {
  card: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  answeredCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 },
  topRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  badge: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 0' },
  mineBadge: { color: 'var(--bento-accent)' },
  groupBadge: { color: 'var(--bento-sand-icon)' },
  badgeSolid: { background: 'var(--bento-sand-icon)', color: '#fff', borderRadius: 99, padding: '4px 12px' },
  badgeTint: { background: 'rgba(122,74,30,.2)', color: 'var(--bento-sand-icon)', borderRadius: 99, padding: '4px 12px' },
  timeText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t4)', whiteSpace: 'nowrap' },
  body: { fontFamily: FONT, fontSize: 15.5, fontWeight: 700, lineHeight: 1.35, color: 'var(--bento-ink)', margin: 0 },
  note: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },
  groupPrayedLine: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  actionsRow: { display: 'flex', gap: 8 },
  prayBtn: { height: 42, padding: '0 18px', borderRadius: 14, border: 'none', background: 'var(--bento-accent)', cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)' },
  prayBtnDone: { background: 'var(--bento-line)', color: 'var(--bento-t3)', cursor: 'default' },
  archiveBtn: { height: 42, padding: '0 18px', borderRadius: 14, border: 'none', background: 'var(--bento-line)', cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-t2)' },
}
