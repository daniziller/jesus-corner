// StudyProposalScreen.jsx — "Ajustar o estudo antes de começar" (quadro
// 26f, que estende o antigo 22b: a IA propõe, a pessoa aprova, ajusta
// quantos dias, decide quem vê e com quem faz — só então vira real).
//
// "Trocar o trecho"/"Quantos dias" (26f): não existe um endpoint dedicado
// pra regenerar/estender 1 dia só — reaproveita generateThemePlan (mesmo
// assunto) e pega da resposta nova a primeira passagem que ainda não está
// no plano atual, pra não duplicar. Custa uma chamada de IA inteira por
// troca/dia a mais (mais caro que "editar 1 item" de verdade seria),
// documentado aqui em vez de fingir uma edição mais barata que não existe.
// Nenhum dos dois existe pro formato Livro (sem `scope` — não tem assunto
// pra pedir de novo; "quantos dias" ali é o próprio livro, fixo).
//
// "Quem pode ver"/"Fazer junto com"/"Tema" são nova infraestrutura real
// (banco de estudos, migration 0053_public_studies.sql — ver
// publicStudiesStore.js): 'only_me' não publica nada (comportamento de
// sempre, só a cópia pessoal); 'invited'/'public' publicam uma linha
// própria no banco, sem misturar com a cópia pessoal (ver App.jsx:
// startGeneratedStudy/saveStudyForLater). `onStart`/`onSaveForLater`
// recebem um 3º argumento `shareOptions` (null quando 'only_me').
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { deriveThemeTexts } from '../themePlans/themeTexts'
import { generateThemePlan } from '../themePlans/themePlansStore'
import { STUDY_THEMES, studyThemeLabel } from '../data/studyThemes'
import FriendPickerSheet from '../components/FriendPickerSheet'

const FONT = 'var(--font-bento)'
const VISIBLE_DAYS = 4
const MIN_DAYS = 1
const MAX_DAYS = 60

function addDaysLabel(n, lang) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function StudyProposalScreen({ session, plan, onBack, onRefazer, onSaveForLater, onStart }) {
  const lang = session.lang
  const L = (k, vars) => t(`studyProposal.${k}`, vars, lang)
  const [currentPlan, setCurrentPlan] = useState(plan)
  const [expanded, setExpanded] = useState(false)
  const [swapping, setSwapping] = useState(null)
  const [addingDay, setAddingDay] = useState(false)
  const [refazing, setRefazing] = useState(false)
  const [actionError, setActionError] = useState('')

  // Compartilhar (26f) — 'only_me' é o padrão de sempre, sem publicar nada.
  const [visibility, setVisibility] = useState('only_me')
  const [tags, setTags] = useState([])
  const [inviteeIds, setInviteeIds] = useState([])
  const [invitees, setInvitees] = useState([]) // {userId, name} — só pra mostrar avatar/nome
  const [pickerOpen, setPickerOpen] = useState(false)

  const texts = deriveThemeTexts(currentPlan.passages)
  const visibleTexts = expanded ? texts : texts.slice(0, VISIBLE_DAYS)
  const totalMinutes = texts.reduce((sum, tx) => sum + (tx.minutes ?? 0), 0)
  const format = currentPlan.format ?? 'thematic'
  const kindLabel = format === 'book' ? L('kindBook') : format === 'crossref' ? L('kindCrossref') : L('kindThematic')
  // Trocar o trecho, "Refazer" e "Quantos dias" pedem outra geração de IA
  // pro MESMO assunto (ver comentário no topo) — não existem pro formato
  // Livro, que não tem `scope` nenhum.
  const canRegenerate = !!currentPlan.scope

  // Sem sessão de hoje ainda concluída = ainda dá pra começar hoje; já
  // concluída = amanhã (mesma regra do quadro: "'hoje' aparece se ainda
  // não leu"). O card "enquanto isso" some se não houver plano fixo pra
  // pausar (raríssimo, mas real: tier Livre sem sessão de hoje definida).
  const startedToday = session.todaySession?.progress > 0
  const pausedTitle = session.todaySession?.title ?? null

  async function swapDay(index) {
    if (!canRegenerate || swapping != null) return
    setSwapping(index)
    setActionError('')
    try {
      const fresh = await generateThemePlan(currentPlan.scope, 'standard', lang)
      const usedKeys = new Set(currentPlan.passages.map(p => `${p.book}:${p.chStart}-${p.chEnd}`))
      const replacement = fresh.passages.find(p => !usedKeys.has(`${p.book}:${p.chStart}-${p.chEnd}`))
      if (replacement) {
        setCurrentPlan(prev => {
          const nextPassages = [...prev.passages]
          nextPassages[index] = { book: replacement.book, chStart: replacement.chStart, chEnd: replacement.chEnd, reason: replacement.reason, words: replacement.words }
          return { ...prev, passages: nextPassages }
        })
      }
    } catch (err) {
      console.error('Failed to swap study day', err)
      setActionError(L('actionError'))
    } finally {
      setSwapping(null)
    }
  }

  // "Quantos dias" (26f) — "+" busca mais um trecho ainda não usado pro
  // mesmo assunto e acrescenta no fim; "−" só tira o último (nunca abre
  // buraco no meio). Ver nota no topo do arquivo sobre o custo de IA disto.
  async function addDay() {
    if (!canRegenerate || addingDay || currentPlan.passages.length >= MAX_DAYS) return
    setAddingDay(true)
    setActionError('')
    try {
      const fresh = await generateThemePlan(currentPlan.scope, 'standard', lang)
      const usedKeys = new Set(currentPlan.passages.map(p => `${p.book}:${p.chStart}-${p.chEnd}`))
      const extra = fresh.passages.find(p => !usedKeys.has(`${p.book}:${p.chStart}-${p.chEnd}`))
      if (extra) {
        setCurrentPlan(prev => ({
          ...prev,
          passages: [...prev.passages, { book: extra.book, chStart: extra.chStart, chEnd: extra.chEnd, reason: extra.reason, words: extra.words }],
        }))
      }
    } catch (err) {
      console.error('Failed to add study day', err)
      setActionError(L('actionError'))
    } finally {
      setAddingDay(false)
    }
  }

  function removeDay() {
    if (currentPlan.passages.length <= MIN_DAYS) return
    setCurrentPlan(prev => ({ ...prev, passages: prev.passages.slice(0, -1) }))
  }

  async function handleRefazer() {
    if (!canRegenerate || refazing) return
    setRefazing(true)
    setActionError('')
    try {
      await onRefazer?.(currentPlan)
    } catch (err) {
      console.error('Failed to redo study proposal', err)
      setActionError(L('actionError'))
    } finally {
      setRefazing(false)
    }
  }

  function toggleTag(tagId) {
    setTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId])
  }

  function confirmInvitees(ids) {
    setInviteeIds(ids)
    setPickerOpen(false)
  }

  // shareOptions é null pra 'only_me' — App.jsx só publica no banco quando
  // isto vem preenchido (ver comentário no topo do arquivo).
  const shareOptions = visibility === 'only_me' ? null : { visibility, tags, inviteeIds }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1 }}>
          <p style={s.headerTitle}>{L('pageTitle')}</p>
          <p style={s.headerSub}>{L('pageSub')}</p>
        </div>
        {canRegenerate && (
          <button style={s.refazerBtn} onClick={handleRefazer} disabled={refazing}>{refazing ? L('refazerBusy') : L('refazerBtn')}</button>
        )}
      </div>

      <div style={s.body}>
        <div style={s.darkCard}>
          <div style={s.darkLabelRow}>
            <span style={s.diamond} />
            <p style={s.darkLabel}>{L('metaLabel', { kind: kindLabel, n: texts.length, min: totalMinutes })}</p>
          </div>
          <p style={s.planTitle}>{currentPlan.title}</p>
          {currentPlan.overview && <p style={s.planOverview}>{currentPlan.overview}</p>}
        </div>
        {actionError && <p style={s.errorText}>{actionError}</p>}

        {canRegenerate && (
          <div style={s.card}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.rowTitle}>{L('daysCountLabel')}</p>
              <p style={s.rowSub}>{L('daysCountSub')}</p>
            </div>
            <div style={s.stepperWrap}>
              <button type="button" style={s.stepperBtn} onClick={removeDay} disabled={currentPlan.passages.length <= MIN_DAYS} aria-label={L('removeDayAction')}>
                <AppIcon name="Minus" size={13} strokeWidth={2.6} color="var(--bento-ink)" />
              </button>
              <span style={s.stepperValue}>{L('daysCountValue', { n: currentPlan.passages.length })}</span>
              <button type="button" style={s.stepperBtnAccent} onClick={addDay} disabled={addingDay || currentPlan.passages.length >= MAX_DAYS} aria-label={L('addDayAction')}>
                <AppIcon name="Plus" size={13} strokeWidth={2.6} color="var(--bento-accent)" />
              </button>
            </div>
          </div>
        )}

        {visibleTexts.map((tx, i) => (
          <div key={tx.id ?? i} style={s.dayRow}>
            <span style={s.dayNum}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.dayTitle}>{lang === 'en' ? tx.titleEn : tx.title}</p>
              {tx.reason && <p style={s.daySub}>{tx.reason}</p>}
            </div>
            {canRegenerate && (
              <button style={s.swapBtn} onClick={() => swapDay(i)} disabled={swapping != null} aria-label={L('swapAction')}>
                <AppIcon name="RefreshCw" size={13} strokeWidth={2} color={swapping === i ? 'var(--bento-t5)' : 'var(--bento-t3)'} />
              </button>
            )}
          </div>
        ))}

        {texts.length > VISIBLE_DAYS && (
          <button style={s.expandBtn} onClick={() => setExpanded(v => !v)}>
            {expanded ? L('showLessDays') : L('moreDays', { n: texts.length - VISIBLE_DAYS })}
            <AppIcon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={13} color="var(--bento-t3)" />
          </button>
        )}

        {/* Quem pode ver (26f) — 'only_me' nunca publica; as outras duas
            entram no banco de estudos ao "Começar"/"Salvar". */}
        <div style={{ ...s.card, flexDirection: 'column', alignItems: 'stretch', padding: '14px 18px 6px' }}>
          <p style={s.sectionLabel}>{L('whoSeesLabel')}</p>
          <VisibilityRow on={visibility === 'only_me'} title={L('onlyMeTitle')} sub={L('onlyMeSub')} onClick={() => setVisibility('only_me')} />
          <VisibilityRow on={visibility === 'invited'} title={L('invitedTitle')} sub={L('invitedSub')} onClick={() => setVisibility('invited')} />
          <VisibilityRow on={visibility === 'public'} title={L('publicTitle')} sub={L('publicSub')} last onClick={() => setVisibility('public')} />
        </div>

        {visibility === 'invited' && (
          <div style={s.card}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.rowTitle}>{L('doTogetherLabel')}</p>
              {invitees.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <div style={{ display: 'flex' }}>
                    {invitees.slice(0, 3).map((f, i) => (
                      <div key={f.userId} style={{ ...s.inviteeAvatar, marginLeft: i === 0 ? 0 : -6 }}>{avatarInitialsOf(f.name)}</div>
                    ))}
                  </div>
                  <span style={s.rowSub}>{invitees.map(f => f.name).join(', ')}</span>
                </div>
              ) : (
                <p style={s.rowSub}>{L('doTogetherEmptySub')}</p>
              )}
            </div>
            <button type="button" style={s.chooseBtn} onClick={() => setPickerOpen(true)}>{L('chooseBtn')}</button>
          </div>
        )}

        {visibility !== 'only_me' && (
          <div style={{ ...s.card, flexDirection: 'column', alignItems: 'stretch' }}>
            <p style={s.sectionLabel}>{L('themeLabel')}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STUDY_THEMES.map(theme => {
                const on = tags.includes(theme.id)
                return (
                  <button key={theme.id} type="button" style={{ ...s.themeChip, ...(on ? s.themeChipOn : {}) }} onClick={() => toggleTag(theme.id)}>
                    {studyThemeLabel(theme.id, lang)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {pausedTitle && (
          <div style={s.sandCard}>
            <p style={s.sandLabel}>{L('meanwhileLabel')}</p>
            <p style={s.sandText}>
              {L('meanwhileText', { title: pausedTitle, date: addDaysLabel(texts.length, lang) })}
            </p>
          </div>
        )}
      </div>

      <div style={s.footer}>
        <button style={s.saveBtn} onClick={() => onSaveForLater?.(currentPlan, shareOptions)}>{L('saveForLaterBtn')}</button>
        <button style={s.startBtn} onClick={() => onStart?.(currentPlan, startedToday, shareOptions)}>
          {startedToday ? L('startTomorrowBtn') : L('startTodayBtn')}
        </button>
      </div>

      {pickerOpen && (
        <FriendPickerSheet
          lang={lang}
          initialSelectedIds={inviteeIds}
          onClose={() => setPickerOpen(false)}
          onConfirm={(ids, friends) => { confirmInvitees(ids); if (friends) setInvitees(friends) }}
        />
      )}
    </div>
  )
}

function VisibilityRow({ on, title, sub, onClick, last }) {
  return (
    <button type="button" style={{ ...s.visRow, ...(last ? { borderBottom: 'none' } : {}) }} onClick={onClick}>
      <span style={{ ...s.radio, ...(on ? s.radioOn : {}) }}>{on && <span style={s.radioDot} />}</span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <p style={s.visTitle}>{title}</p>
        <p style={s.visSub}>{sub}</p>
      </div>
    </button>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  refazerBtn: { height: 34, flexShrink: 0, padding: '0 12px', borderRadius: 12, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  darkCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '20px 22px' },
  darkLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  diamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  darkLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  planTitle: { fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: '-.9px', color: '#fff', margin: '0 0 8px', lineHeight: 1.15 },
  planOverview: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.5)', margin: 0 },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#DC2626', margin: 0, textAlign: 'center' },

  card: { borderRadius: 22, background: 'var(--bento-card)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  rowTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  rowSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },
  stepperWrap: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  stepperBtn: { width: 30, height: 30, borderRadius: 10, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepperBtnAccent: { width: 30, height: 30, borderRadius: 10, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepperValue: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', width: 56, textAlign: 'center', whiteSpace: 'nowrap' },

  sectionLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  visRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, height: 52, border: 'none', background: 'none', padding: 0, cursor: 'pointer', borderBottom: '1px solid var(--bento-line)' },
  radio: { width: 20, height: 20, borderRadius: 99, border: '2px solid var(--bento-t6)', flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  radioOn: { border: 'none', background: 'var(--bento-accent)' },
  radioDot: { width: 7, height: 7, borderRadius: 99, background: 'var(--bento-ink)' },
  visTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  visSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t4)', margin: 0, lineHeight: 1.3 },

  inviteeAvatar: { width: 26, height: 26, borderRadius: 9, background: 'var(--bento-sand)', color: 'var(--bento-sand-icon)', fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: '26px', textAlign: 'center', border: '2px solid var(--bento-card)' },
  chooseBtn: { height: 32, padding: '0 14px', flexShrink: 0, borderRadius: 11, border: 'none', background: 'var(--bento-line)', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },

  themeChip: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', background: 'var(--bento-line)', border: 'none', borderRadius: 99, padding: '9px 12px', cursor: 'pointer' },
  themeChipOn: { color: '#fff', background: 'var(--bento-ink)', fontWeight: 800 },

  dayRow: { borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  dayNum: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff' },
  dayTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  daySub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  swapBtn: { width: 32, height: 32, flexShrink: 0, borderRadius: 11, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  expandBtn: { alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)' },

  sandCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 18px', marginTop: 'auto' },
  sandLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 6px' },
  sandText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  saveBtn: { flexShrink: 0, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-card)', padding: '0 18px', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  startBtn: { flex: 1, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
}
