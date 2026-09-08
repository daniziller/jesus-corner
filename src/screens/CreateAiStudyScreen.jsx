// CreateAiStudyScreen.jsx — "Criar estudo" (turno 35, Bloco 4, tela 35d).
// Tela NOVA — não reaproveita CreateStudyScreen.jsx (22a) porque o destino
// final é diferente: aqui o estudo criado ativa via ai_studies/
// selectActiveStudy (o "Estudo ativo" de verdade — 35b, "Gênesis pausado
// em 41", trilha de dias — já em produção desde o Bloco 2), não o
// mecanismo antigo de plano por tema (theme_plans/activeAltPlan.theme, sem
// contagem de dia fixa) que CreateStudyScreen.jsx ainda serve pra quem
// chega por ThemePlanScreen.jsx — decisão tomada com a autora ao montar
// este bloco, pra não misturar os dois fluxos nem quebrar o que já existe.
//
// Duração fixa (3/7/14/21/30) e "Deixar público no banco" são novos deste
// quadro — só fazem sentido pros formatos gerados por IA (Plano temático/
// Tema); Livro e Para o grupo têm o próprio tamanho/destino (ver
// needsBook/isGroupFormat abaixo).
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { buildBookPlan, allBooksFlat } from '../themePlans/bookPlan'
import { buildGroupPlan } from '../groups/groupBookPlan'
import { CREATE_STUDY_DURATION_CHIPS, DEFAULT_STUDY_DAYS } from '../studies/studyDurationOptions'

const FONT = 'var(--font-bento)'
const MAX_SCOPE_LENGTH = 200
const SUGGESTION_KEYS = ['sugForgiveness', 'sugPhilippians', 'sugJoseph', 'sugPsalms']
const FORMATS = [
  { id: 'thematic', labelKey: 'formatThematicLabel', subKey: 'formatThematicSub' },
  { id: 'book', labelKey: 'formatBookLabel', subKey: 'formatBookSub' },
  { id: 'crossref', labelKey: 'formatCrossrefLabel', subKey: 'formatCrossrefSub' },
  { id: 'group', labelKey: 'formatGroupLabel', subKey: 'formatGroupSub' },
]

// Web Speech API — só existe em alguns navegadores (principalmente Chrome/
// Safari mobile); sem suporte, o botão de ditado some (não falha, não
// mostra erro — ver getSpeechRecognition abaixo, mesmo espírito de
// navigator.vibrate?.() opcional no relógio de leitura, Bloco 3).
function getSpeechRecognition() {
  return typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
}

export default function CreateAiStudyScreen({ session, initialText = '', onBack, onGeneratePersonal, onGeneratedGroup }) {
  const lang = session.lang
  const L = (k, vars) => t(`createStudy.${k}`, vars, lang)

  const moderatedGroup = session.myGroups?.find(g => g.myRole === 'moderator')

  const [text, setText] = useState(initialText)
  const [format, setFormat] = useState('thematic')
  const [days, setDays] = useState(DEFAULT_STUDY_DAYS)
  const [publicToBank, setPublicToBank] = useState(false)
  const [bookPickerOpen, setBookPickerOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')

  const books = allBooksFlat(lang)
  const trimmed = text.trim()
  const needsBook = format === 'book' || format === 'group'
  const canDictate = !needsBook && !!getSpeechRecognition()
  const canSubmit = needsBook ? !!selectedBook : trimmed.length > 0 && trimmed.length <= MAX_SCOPE_LENGTH

  function chooseFormat(id) {
    setFormat(id)
    setBookPickerOpen(id === 'book' || id === 'group')
  }

  function toggleDictation() {
    const Recognition = getSpeechRecognition()
    if (!Recognition) return
    if (listening) { setListening(false); return }
    const recognition = new Recognition()
    recognition.lang = lang === 'en' ? 'en-US' : 'pt-BR'
    recognition.interimResults = false
    recognition.onresult = e => {
      const heard = e.results?.[0]?.[0]?.transcript ?? ''
      if (heard) setText(prev => (prev ? `${prev} ${heard}` : heard).slice(0, MAX_SCOPE_LENGTH))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.start()
    setListening(true)
  }

  async function handleSubmit() {
    if (!canSubmit || generating) return
    setGenerating(true)
    setError('')
    try {
      if (format === 'group') {
        onGeneratedGroup?.({ ...buildGroupPlan(selectedBook, lang), format, groupId: moderatedGroup.groupId, groupName: moderatedGroup.name })
        return
      }
      if (format === 'book') {
        await onGeneratePersonal?.({ plan: buildBookPlan(selectedBook, lang), format, publicToBank: false })
        return
      }
      await onGeneratePersonal?.({ scope: trimmed, format, days, publicToBank })
    } catch (err) {
      console.error('Failed to generate study', err)
      setError(
        err.message === 'subscription_required' ? L('errorSubscription')
        : err.message === 'plan_limit_reached' ? L('errorLimit')
        : L('errorGeneric')
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={s.headerTitle}>{L('pageTitle')}</p>
          <p style={s.headerSub}>{L('pageSub')}</p>
        </div>
      </div>

      <div style={s.body}>
        {!bookPickerOpen ? (
          <div style={s.darkCard}>
            <div style={s.darkLabelRow}>
              <span style={s.diamond} />
              <p style={s.darkLabel}>{L('promptLabel')}</p>
            </div>
            <div style={{ position: 'relative' }}>
              <textarea
                style={s.promptInput}
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_SCOPE_LENGTH))}
                placeholder={L('promptPlaceholder')}
                rows={4}
              />
              {canDictate && (
                <button
                  type="button" style={{ ...s.dictateBtn, ...(listening ? s.dictateBtnOn : {}) }}
                  onClick={toggleDictation} aria-label={L('dictateAction')}
                >
                  <AppIcon name="AudioLines" size={15} color={listening ? 'var(--bento-ink)' : '#fff'} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={s.bookPickerCard}>
            <div style={s.darkLabelRowLight}>
              <p style={s.bookPickerLabel}>{L('bookPickerLabel')}</p>
              {selectedBook && <span style={s.bookPickerSelected}>{books.find(b => b.canonicalName === selectedBook)?.displayName}</span>}
            </div>
            <div style={s.bookList}>
              {books.map(b => (
                <button
                  key={`${b.block.id}:${b.canonicalName}`}
                  style={{ ...s.bookRow, ...(selectedBook === b.canonicalName ? s.bookRowOn : {}) }}
                  onClick={() => setSelectedBook(b.canonicalName)}
                >
                  {b.displayName}
                </button>
              ))}
            </div>
          </div>
        )}

        {!bookPickerOpen && (
          <div style={s.card}>
            <p style={s.cardLabel}>{L('suggestionsLabel')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {SUGGESTION_KEYS.map(k => (
                <button key={k} style={s.chip} onClick={() => setText(L(k))}>{L(k)}</button>
              ))}
            </div>
          </div>
        )}

        <div style={s.card}>
          <p style={s.cardLabel}>{L('formatLabel')}</p>
          <div style={s.formatGrid}>
            {FORMATS.map(f => {
              // "Para o grupo" (quadro 22a/35d: "só admin") só aparece pra
              // quem modera algum grupo.
              if (f.id === 'group' && !moderatedGroup) return null
              const on = format === f.id
              return (
                <button key={f.id} style={{ ...s.formatCell, ...(on ? s.formatCellOn : {}) }} onClick={() => chooseFormat(f.id)}>
                  <span style={{ ...s.formatCellLabel, color: on ? '#fff' : 'var(--bento-ink)' }}>{L(f.labelKey)}</span>
                  <span style={{ ...s.formatCellSub, color: on ? 'rgba(255,255,255,.5)' : 'var(--bento-t4)' }}>{L(f.subKey)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {!needsBook && (
          <div style={s.card}>
            <div style={s.cardHeadRow}>
              <p style={s.cardLabel}>{L('durationLabel')}</p>
              <span style={s.durationValue}>{L('durationDays', { n: days })}</span>
            </div>
            <div style={s.durationRow}>
              {CREATE_STUDY_DURATION_CHIPS.map(n => (
                <button key={n} style={{ ...s.durationChip, ...(days === n ? s.durationChipOn : {}) }} onClick={() => setDays(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {!needsBook && (
          <div style={s.toggleCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.rowTitle}>{L('publicToggleTitle')}</p>
              <p style={s.rowSub}>{L('publicToggleSub')}</p>
            </div>
            <button
              role="switch" aria-checked={publicToBank}
              onClick={() => setPublicToBank(v => !v)}
              style={{ ...s.switch, background: publicToBank ? 'var(--bento-accent)' : 'var(--bento-line)', justifyContent: publicToBank ? 'flex-end' : 'flex-start' }}
            >
              <span style={s.switchThumb} />
            </button>
          </div>
        )}

        <div style={s.sandCard}>
          <p style={s.sandText}>{L('replaceNoteIndependent')}</p>
        </div>
        {error && <p style={s.errorText}>{error}</p>}
      </div>

      <div style={s.footer}>
        <button style={{ ...s.submitBtn, opacity: canSubmit && !generating ? 1 : .5 }} onClick={handleSubmit} disabled={!canSubmit || generating}>
          <span style={s.submitBtnText}>{generating ? L('generatingBtn') : L('submitBtn')}</span>
          {!generating && <span style={s.submitBtnArrow}>→</span>}
        </button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 },

  darkCard: { borderRadius: 28, background: 'var(--bento-ink)', padding: '18px 20px' },
  darkLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  diamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2 },
  darkLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  promptInput: { width: '100%', border: 'none', outline: 'none', background: 'rgba(255,255,255,.06)', borderRadius: 18, padding: '14px 50px 14px 16px', fontFamily: FONT, fontSize: 15.5, fontWeight: 500, lineHeight: 1.5, color: '#fff', resize: 'none', minHeight: 90, boxSizing: 'border-box' },
  dictateBtn: { position: 'absolute', right: 10, bottom: 10, width: 34, height: 34, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  dictateBtnOn: { background: 'var(--bento-accent)' },

  bookPickerCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320 },
  darkLabelRowLight: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  bookPickerLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  bookPickerSelected: { fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-accent)' },
  bookList: { overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  bookRow: { textAlign: 'left', border: 'none', background: 'none', padding: '10px 4px', fontFamily: FONT, fontSize: 14, fontWeight: 600, color: 'var(--bento-ink)', cursor: 'pointer', borderBottom: '1px solid var(--bento-line)' },
  bookRowOn: { color: 'var(--bento-accent)', fontWeight: 800 },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px' },
  cardHeadRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 12px' },
  chip: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-ink)', background: 'var(--bento-line)', border: 'none', borderRadius: 99, padding: '9px 13px', cursor: 'pointer' },

  formatGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 },
  formatCell: { borderRadius: 16, background: 'var(--bento-line)', border: 'none', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3 },
  formatCellOn: { background: 'var(--bento-ink)' },
  formatCellLabel: { fontFamily: FONT, fontSize: 13, fontWeight: 800, lineHeight: 1.2 },
  formatCellSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, lineHeight: 1.3 },

  durationValue: { fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)', margin: 0 },
  durationRow: { display: 'flex', gap: 7 },
  durationChip: { flex: 1, height: 40, borderRadius: 13, border: 'none', background: 'var(--bento-line)', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  durationChipOn: { background: 'var(--bento-ink)', color: '#fff' },

  toggleCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 },
  rowTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  rowSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  switch: { width: 46, height: 28, flexShrink: 0, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' },
  switchThumb: { width: 22, height: 22, borderRadius: '50%', background: '#fff' },

  sandCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 18px' },
  sandText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-accent)', margin: 0, textAlign: 'center' },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  submitBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer' },
  submitBtnText: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
  submitBtnArrow: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-ink)' },
}
