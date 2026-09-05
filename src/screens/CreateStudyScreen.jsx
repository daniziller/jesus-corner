// CreateStudyScreen.jsx — "Criar estudo" (quadro 22a). Alcançada pelo
// botão "Criar" no cabeçalho de Meu Plano (RoutineScreen.jsx).
//
// Um campo de texto livre (é a IA ouvindo, por isso o bloco escuro com
// losango) em vez do formulário Título+Escopo de antes — a pessoa só
// descreve o que quer, a IA propõe até o título (ver ThemePassagesSchema
// em api/_lib/ai.js). Regra Zero, documentada: o quadro diz que o
// "Formato" é INFERIDO do pedido e só pré-selecionado — isso exigiria uma
// classificação própria (mais uma chamada de IA só pra adivinhar a
// intenção). Pra não fingir uma inferência que não existe, o padrão fica
// sempre "Plano temático" e a pessoa escolhe à mão — o texto already deixa
// claro que dá pra trocar ("a pessoa corrige se a IA errou" vira "a
// pessoa escolhe").
//
// "Para o grupo" só aparece pra quem modera algum grupo (mesmo gate de
// "Administração do grupo" em ProfileSheet.jsx) — ver nota no card.
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { generateThemePlan } from '../themePlans/themePlansStore'
import { buildBookPlan, allBooksFlat } from '../themePlans/bookPlan'

const FONT = 'var(--font-bento)'
const MAX_SCOPE_LENGTH = 200
const SUGGESTION_KEYS = ['sugForgiveness', 'sugPhilippians', 'sugJoseph', 'sugPsalms']
const FORMATS = [
  { id: 'thematic', labelKey: 'formatThematicLabel', subKey: 'formatThematicSub' },
  { id: 'book', labelKey: 'formatBookLabel', subKey: 'formatBookSub' },
  { id: 'crossref', labelKey: 'formatCrossrefLabel', subKey: 'formatCrossrefSub' },
  { id: 'group', labelKey: 'formatGroupLabel', subKey: 'formatGroupSub' },
]

export default function CreateStudyScreen({ session, onBack, onGenerated }) {
  const lang = session.lang
  const L = (k, vars) => t(`createStudy.${k}`, vars, lang)

  const [text, setText] = useState('')
  const [format, setFormat] = useState('thematic')
  const [bookPickerOpen, setBookPickerOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const books = allBooksFlat(lang)
  const trimmed = text.trim()
  const canSubmit = format === 'book' ? !!selectedBook : trimmed.length > 0 && trimmed.length <= MAX_SCOPE_LENGTH

  function chooseFormat(id) {
    setFormat(id)
    setBookPickerOpen(id === 'book')
  }

  async function handleSubmit() {
    if (!canSubmit || generating) return
    setGenerating(true)
    setError('')
    try {
      if (format === 'book') {
        onGenerated?.(buildBookPlan(selectedBook, lang))
      } else {
        const plan = await generateThemePlan(trimmed, 'standard', lang)
        onGenerated?.({ ...plan, format })
      }
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
            <textarea
              style={s.promptInput}
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX_SCOPE_LENGTH))}
              placeholder={L('promptPlaceholder')}
              rows={4}
            />
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
              // "Para o grupo" (quadro 22d) ainda não existe como tela —
              // fica de fora do grid até a próxima leva desta etapa, em
              // vez de apontar pra um fluxo que não foi construído.
              if (f.id === 'group') return null
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

        <div style={s.sandCard}>
          <p style={s.sandText}>{L('replaceNote')}</p>
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
  promptInput: { width: '100%', border: 'none', outline: 'none', background: 'rgba(255,255,255,.06)', borderRadius: 18, padding: '14px 16px', fontFamily: FONT, fontSize: 15.5, fontWeight: 500, lineHeight: 1.5, color: '#fff', resize: 'none', minHeight: 90 },

  bookPickerCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320 },
  darkLabelRowLight: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  bookPickerLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  bookPickerSelected: { fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-accent)' },
  bookList: { overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  bookRow: { textAlign: 'left', border: 'none', background: 'none', padding: '10px 4px', fontFamily: FONT, fontSize: 14, fontWeight: 600, color: 'var(--bento-ink)', cursor: 'pointer', borderBottom: '1px solid var(--bento-line)' },
  bookRowOn: { color: 'var(--bento-accent)', fontWeight: 800 },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 12px' },
  chip: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-ink)', background: 'var(--bento-line)', border: 'none', borderRadius: 99, padding: '9px 13px', cursor: 'pointer' },

  formatGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 },
  formatCell: { borderRadius: 16, background: 'var(--bento-line)', border: 'none', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3 },
  formatCellOn: { background: 'var(--bento-ink)' },
  formatCellLabel: { fontFamily: FONT, fontSize: 13, fontWeight: 800, lineHeight: 1.2 },
  formatCellSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, lineHeight: 1.3 },

  sandCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 18px' },
  sandText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--re)', margin: 0, textAlign: 'center' },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  submitBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer' },
  submitBtnText: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
  submitBtnArrow: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-ink)' },
}
