// OnboardingDemo.jsx — a demonstração do onboarding (quadros 14b/14c/14e/14f).
//
// Só UMA aparece, escolhida pela resposta do 15b (ver demoFor em
// src/onboarding/onboardingAnswers.js). O recorte é um cartão estático com
// conteúdo de amostra (Gênesis 41) — mostra como o app vai ser antes de a
// pessoa entrar. Embaixo, o chip "O que o app faz com isso", título, texto e
// o botão "Continuar".
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import AppIcon from '../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function OnboardingDemo({ kind, onContinue, onSkip }) {
  const lang = getAppLanguage() ?? 'pt'
  const L = (k, vars) => t(`onb.${k}`, vars, lang)
  const copy = {
    reading: { title: L('demoReadingTitle'), body: L('demoReadingBody') },
    ask: { title: L('demoAskTitle'), body: L('demoAskBody') },
    week: { title: L('demoWeekTitle'), body: L('demoWeekBody') },
    group: { title: L('demoGroupTitle'), body: L('demoGroupBody') },
  }[kind] ?? { title: L('demoReadingTitle'), body: L('demoReadingBody') }
  // 14f é a única com o botão laranja (texto escuro) e 54px.
  const orangeBtn = kind === 'group'

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" style={s.skip} onClick={onSkip}>{L('skip')}</button>
      </div>
      <div style={s.stage}>
        {kind === 'ask' ? <AskCard L={L} /> : kind === 'week' ? <WeekCard L={L} /> : kind === 'group' ? <GroupCard L={L} /> : <ReadingCard L={L} />}
      </div>
      <div style={s.footer}>
        <div style={s.chip}><span style={s.chipDot} /><span style={s.chipText}>{L('demoChip')}</span></div>
        <p style={s.title}>{copy.title}</p>
        <p style={s.body}>{copy.body}</p>
        <button type="button" style={{ ...s.btn, ...(orangeBtn ? s.btnOrange : {}) }} onClick={onContinue}>
          <span style={{ ...s.btnText, ...(orangeBtn ? { fontSize: 15.5, color: 'var(--bento-ink)' } : {}) }}>{L('continueBtn')}</span>
          <span style={{ ...s.btnArrow, ...(orangeBtn ? { fontSize: 15, color: 'var(--bento-ink)' } : {}) }}>→</span>
        </button>
      </div>
    </div>
  )
}

/* ── 14b — a tela de leitura ── */
function ReadingCard({ L }) {
  const V = ({ n, first }) => <span style={{ ...s.verseNum, margin: first ? '0 4px 0 0' : '0 4px 0 6px' }}>{n}</span>
  return (
    <div style={{ ...s.card, padding: '22px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 18px' }}>
        <div>
          <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.3px', color: 'var(--bento-ink)', margin: 0 }}>{L('demoChapter')}</p>
          <p style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: '3px 0 0' }}>{L('demoChapterSub')}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={s.squareBtn} />
          <div style={s.squareBtn} />
        </div>
      </div>
      <p style={s.chapterLabel}>{L('demoChapterLabel')}</p>
      <p style={s.verse}><V n="1" first />{L('demoVerse1')}<V n="2" />{L('demoVerse2')}</p>
      <p style={s.verse}><V n="3" first />{L('demoVerse3a')}<span style={s.mark}>{L('demoVerse3mark')}</span>{L('demoVerse3b')}</p>
      <div style={s.player}>
        <div style={s.playBtn}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="#1A1714" aria-hidden="true"><path d="M5 3l8 5-8 5z" /></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 700, lineHeight: 1.2, color: '#fff', margin: '0 0 6px' }}>{L('demoListen')}</p>
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,.2)' }}><div style={{ width: '22%', height: 3, borderRadius: 99, background: 'var(--bento-accent)' }} /></div>
        </div>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,.45)', flex: 'none' }}>7:12</span>
      </div>
    </div>
  )
}

/* ── 14c — perguntar sobre o texto ── */
function AskCard({ L }) {
  return (
    <div style={{ ...s.card, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '20px 20px 0' }}>
        <p style={{ ...s.chapterLabel, margin: '0 0 12px' }}>{L('demoChapterLabel')}</p>
        <p style={{ fontFamily: FONT, fontSize: 15, fontWeight: 500, lineHeight: 1.65, color: 'var(--bento-t3)', margin: 0, textWrap: 'pretty' }}>
          {L('demoAskExcerptA')}<span style={s.selection}>{L('demoAskExcerptSel')}</span>
        </p>
      </div>
      <div style={s.sheet}>
        <div style={{ width: 38, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.22)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 14px' }}>
          <div style={{ width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2 }} />
          <p style={{ fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 }}>{L('demoAskLabel')}</p>
        </div>
        <div style={{ borderRadius: 14, background: 'rgba(255,255,255,.06)', padding: '11px 13px', margin: '0 0 14px' }}>
          <p style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.35, color: '#fff', margin: 0 }}>{L('demoAskQuestion')}</p>
        </div>
        <p style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.6, color: 'rgba(255,255,255,.88)', margin: '0 0 14px', textWrap: 'pretty' }}>
          {L('demoAskAnswerA')}<strong style={{ color: '#fff', fontWeight: 800 }}>{L('demoAskAnswerStrong')}</strong>{L('demoAskAnswerB')}
        </p>
        <div style={{ borderRadius: 14, background: 'rgba(240,102,43,.14)', padding: '12px 14px', margin: '0 0 auto' }}>
          <p style={{ fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 6px' }}>{L('demoAskSourceLabel')}</p>
          <p style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.45, color: 'rgba(255,255,255,.8)', margin: 0 }}>{L('demoAskSource')}</p>
        </div>
        <div style={{ height: 44, borderRadius: 14, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', padding: '0 5px 0 15px', gap: 10, marginTop: 14 }}>
          <span style={{ flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1, color: 'rgba(255,255,255,.35)' }}>{L('demoAskMore')}</span>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="ArrowUp" size={14} strokeWidth={2.4} color="var(--bento-ink)" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 14e — constância sem culpa ── */
function WeekCard({ L }) {
  const bars = [
    { h: '60%', c: 'rgba(240,102,43,.45)' }, { h: '100%', c: 'var(--bento-accent)' }, { h: '80%', c: 'var(--bento-accent)' },
    { h: '100%', c: 'var(--bento-accent)' }, { h: '45%', c: 'rgba(240,102,43,.45)' }, { h: '100%', c: 'var(--bento-accent)' },
    { h: '88%', c: 'var(--bento-accent)' }, { h: '100%', c: 'var(--bento-accent)' }, { h: '32%', c: 'rgba(255,255,255,.18)' },
  ]
  const stat = (n, label, bg, color, labelColor) => (
    <div style={{ flex: 1, borderRadius: 18, background: bg, padding: '14px 13px' }}>
      <p style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.2px', color, margin: '0 0 5px' }}>{n}</p>
      <p style={{ fontFamily: FONT, fontSize: 9.5, fontWeight: 600, lineHeight: 1.25, color: labelColor, margin: 0, whiteSpace: 'pre-line' }}>{label}</p>
    </div>
  )
  return (
    <div style={{ ...s.card, padding: '22px 20px' }}>
      <p style={s.cardTitle}>{L('demoWalkTitle')}</p>
      <div style={{ borderRadius: 22, background: 'var(--bento-ink)', padding: 18, margin: '0 0 10px' }}>
        <p style={s.darkLabel}>{L('demoConstancy')}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, margin: '0 0 14px' }}>
          <p style={{ fontFamily: FONT, fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.8px', color: '#fff', margin: 0 }}>18</p>
          <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.3, color: 'rgba(255,255,255,.5)', margin: 0, whiteSpace: 'pre-line' }}>{L('demoWeeksInGoal')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 40 }}>
          {bars.map((b, i) => <div key={i} style={{ flex: 1, height: b.h, borderRadius: 4, background: b.c }} />)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, margin: '0 0 10px' }}>
        {stat('243', L('demoChaptersRead'), 'var(--bento-line)', 'var(--bento-ink)', 'var(--bento-t3)')}
        {stat(<>41<span style={{ fontSize: 15 }}>h</span></>, L('demoHoursRead'), 'var(--bento-line)', 'var(--bento-ink)', 'var(--bento-t3)')}
        {stat('2', L('demoBooksDone'), 'var(--bento-sand)', 'var(--bento-sand-icon)', 'var(--bento-sand-label)')}
      </div>
      <div style={{ borderRadius: 20, background: 'var(--bento-card-soft)', padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' }}>
          <p style={{ fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 }}>{L('demoThisWeek')}</p>
          <p style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t3)', margin: 0 }}><span style={{ fontWeight: 800, color: 'var(--bento-ink)' }}>{L('demoComplete')}</span>{L('demoCompleteOf')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {['done', 'done', 'today', 'off', 'off', 'off', 'off'].map((k, i) => (
            <div key={i} style={{ width: 26, height: 26, borderRadius: 9, boxSizing: 'border-box',
              ...(k === 'done' ? { background: 'var(--bento-accent)' } : k === 'today' ? { border: '2px dashed var(--bento-accent)' } : { background: 'var(--bento-line)' }) }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 14f — comunidade ── */
function GroupCard({ L }) {
  const avatar = (bg, extra) => <div style={{ width: 26, height: 26, borderRadius: 99, background: bg, border: '2px solid var(--bento-ink)', boxSizing: 'border-box', ...extra }} />
  const post = (initials, initialsBg, initialsColor, name, when, text) => (
    <div style={{ borderRadius: 18, background: 'var(--bento-card-soft)', padding: '15px 16px', margin: '0 0 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 8px' }}>
        <div style={{ width: 24, height: 24, borderRadius: 99, background: initialsBg, fontFamily: FONT, fontSize: 9, fontWeight: 800, lineHeight: '24px', color: initialsColor, textAlign: 'center' }}>{initials}</div>
        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' }}>{name}</span>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t5)', marginLeft: 'auto' }}>{when}</span>
      </div>
      <p style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)', margin: 0 }}>{text}</p>
    </div>
  )
  return (
    <div style={{ ...s.card, padding: '22px 20px' }}>
      <p style={s.cardTitle}>{L('demoCommunity')}</p>
      <div style={{ borderRadius: 22, background: 'var(--bento-ink)', padding: 18, margin: '0 0 10px', color: '#fff' }}>
        <p style={s.darkLabel}>{L('demoGroupReading')}</p>
        <p style={{ fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.8px', margin: '0 0 14px' }}>{L('demoChapter')}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 14px' }}>
          <div style={{ display: 'flex' }}>
            {avatar('var(--bento-accent)')}
            {avatar('var(--bento-sand)', { marginLeft: -9 })}
            {avatar('var(--bento-sand-icon)', { marginLeft: -9 })}
            <div style={{ width: 26, height: 26, borderRadius: 99, background: 'rgba(255,255,255,.14)', border: '2px solid var(--bento-ink)', boxSizing: 'border-box', marginLeft: -9, fontFamily: FONT, fontSize: 8.5, fontWeight: 800, lineHeight: '22px', color: '#fff', textAlign: 'center' }}>+9</div>
          </div>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: 'rgba(255,255,255,.5)' }}>{L('demoReadToday')}</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.15)' }}><div style={{ width: '58%', height: 5, borderRadius: 99, background: 'var(--bento-accent)' }} /></div>
      </div>
      {post('MC', 'var(--bento-sand)', 'var(--bento-sand-icon)', L('demoPost1Name'), L('demoPost1When'), L('demoPost1'))}
      {post('RS', 'var(--bento-accent)', 'var(--bento-ink)', L('demoPost2Name'), L('demoPost2When'), L('demoPost2'))}
      <div style={{ borderRadius: 18, background: 'var(--bento-sand)', padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 11, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <AppIcon name="Plus" size={15} strokeWidth={2.4} color="var(--bento-sand)" />
        </div>
        <p style={{ flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-sand-ink)', margin: 0 }}>{L('demoJoinGroup')}</p>
      </div>
    </div>
  )
}

// Medidas dos quadros 14b/14c/14e/14f.
const s = {
  screen: { height: '100%', minHeight: '100%', background: 'var(--bento-bg)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: FONT, overflow: 'hidden' },
  header: { flex: 'none', display: 'flex', justifyContent: 'flex-end', padding: '20px 22px 0' },
  skip: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t4)' },
  stage: { flex: 1, minHeight: 0, padding: '14px 22px 0', overflow: 'hidden' },
  card: { height: '100%', borderRadius: 26, background: 'var(--bento-card)', boxSizing: 'border-box', boxShadow: '0 12px 30px rgba(0,0,0,.08)', overflow: 'hidden' },
  footer: { flex: 'none', padding: '20px 24px calc(30px + var(--safe-bottom))' },
  chip: { display: 'inline-flex', alignItems: 'center', gap: 8, height: 26, borderRadius: 99, background: 'var(--bento-card)', padding: '0 12px 0 8px', margin: '0 0 16px' },
  chipDot: { width: 8, height: 8, borderRadius: 99, background: 'var(--bento-accent)' },
  chipText: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-ink)' },
  title: { fontFamily: FONT, fontSize: 25, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1.1px', color: 'var(--bento-ink)', margin: '0 0 8px', textWrap: 'pretty' },
  body: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-t2)', margin: '0 0 18px', textWrap: 'pretty' },
  btn: { width: '100%', height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: 0 },
  btnOrange: { height: 54, background: 'var(--bento-accent)', gap: 9 },
  btnText: { fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1, color: '#fff' },
  btnArrow: { fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1, color: 'var(--bento-accent)' },
  // recortes
  squareBtn: { width: 28, height: 28, borderRadius: 10, background: 'var(--bento-line)' },
  chapterLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 14px' },
  verse: { fontFamily: FONT, fontSize: 16, fontWeight: 500, lineHeight: 1.7, color: 'var(--bento-ink)', margin: '0 0 14px', textWrap: 'pretty' },
  verseNum: { fontFamily: FONT, fontSize: 9, fontWeight: 800, lineHeight: 1, color: 'var(--bento-accent)', verticalAlign: 'super' },
  mark: { background: 'var(--bento-mark)', borderRadius: 4, padding: '1px 3px' },
  player: { marginTop: 'auto', borderRadius: 18, background: 'var(--bento-ink)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 11 },
  playBtn: { width: 32, height: 32, flex: 'none', borderRadius: 12, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  selection: { background: 'var(--bento-select)', borderRadius: 4, padding: '1px 3px', color: 'var(--bento-select-ink)', boxShadow: '0 0 0 1.5px var(--bento-select-border)' },
  sheet: { flex: 1, margin: '18px 0 0', borderRadius: '26px 26px 0 0', background: 'var(--bento-ink)', padding: '20px 20px 22px', display: 'flex', flexDirection: 'column' },
  cardTitle: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 14px' },
  darkLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: '0 0 12px' },
}
