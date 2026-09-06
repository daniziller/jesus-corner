// ChooseStartScreen.jsx — "Onde você começa" (quadro 28d, Bloco 6).
//
// Duas decisões separadas: ONDE (Gênesis, Mateus, um livro escolhido, ou
// sem plano — leio e vou marcando) e EM QUE ORDEM (bíblica ou cronológica,
// só faz sentido pra quem tem plano). Alcançada por "Trocar plano" em
// Ajustar meu plano (5a) — a mesma tela do fim do onboarding, aplica se
// aprovar.
//
// Simplificação deliberada: "escolher outro livro" não reposiciona o
// ponteiro de leitura pro meio do testamento — a granularidade que já
// existe no app (readingOrder) é por TESTAMENTO inteiro (Gênesis→Apocalipse
// ou Mateus→Apocalipse→Gênesis…), não por livro específico. Escolher
// qualquer livro do AT te leva pro mesmo lugar que "Gênesis 1"; qualquer
// um do NT, pro mesmo lugar que "Mateus 1" — o valor real de escolher um
// livro específico aqui é ver se ELE já tem progresso (e cair em 28e), não
// reordenar a Bíblia inteira ao redor dele. Documentado, não escondido.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

function Radio({ on, dark }) {
  return (
    <span style={{
      width: 20, height: 20, borderRadius: 99, flexShrink: 0, boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: on ? 'var(--bento-accent)' : 'transparent',
      border: on ? 'none' : `2px solid ${dark ? 'rgba(255,255,255,.3)' : 'var(--bento-t6)'}`,
    }}>
      {on && <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--bento-ink)' }} />}
    </span>
  )
}

export default function ChooseStartScreen({ session, completedSet, bookChapterCounts, blocks, initialChoice, onContinue, onBack }) {
  const { lang } = session
  const L = (k, vars) => t(`chooseStart.${k}`, vars, lang)

  const atBlock1 = blocks.find(b => b.id === 1)
  const ntBlock1 = blocks.find(b => b.id === 5)
  const genesisName = lang === 'en' ? atBlock1.booksEn[0] : atBlock1.books[0]
  const matthewName = lang === 'en' ? ntBlock1.booksEn[0] : ntBlock1.books[0]

  // Estado inicial: reflete o que já está ativo (readingOrder/hasNoPlan/
  // cronológica) na primeira vez, ou o que a pessoa tinha escolhido antes
  // de ir olhar 28e e voltar (initialChoice).
  const [book, setBook] = useState(initialChoice?.book ?? (session.hasNoPlan ? null : session.readingOrder === 'nt_first' ? matthewName : genesisName))
  const [order, setOrder] = useState(initialChoice?.order ?? (session.hasNoPlan ? 'none' : session.activeAltPlan?.type === 'chrono' ? 'chrono' : 'biblical'))
  const [pickerOpen, setPickerOpen] = useState(false)

  const isCustomBook = book && book !== genesisName && book !== matthewName

  function progressFor(b) {
    const total = bookChapterCounts[b] ?? 0
    let done = 0
    for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${b}:${ch}`)) done++
    return { done, total }
  }
  const { done: bookDone } = book ? progressFor(book) : { done: 0 }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div style={s.headerTop}>
          <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
          </button>
          <p style={s.title}>{L('title')}</p>
        </div>
        <p style={s.sub}>{L('sub')}</p>
      </div>

      <div style={s.body}>
        <button style={{ ...s.optionCard, ...(order !== 'none' && book === genesisName ? s.optionCardOn : {}) }} onClick={() => { setBook(genesisName); if (order === 'none') setOrder('biblical') }}>
          <Radio on={order !== 'none' && book === genesisName} dark={order !== 'none' && book === genesisName} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <p style={{ ...s.optionTitle, color: order !== 'none' && book === genesisName ? '#fff' : 'var(--bento-ink)' }}>{L('genesisTitle', { book: genesisName })}</p>
              <span style={s.suggestedBadge}>{L('suggested')}</span>
            </div>
            <p style={{ ...s.optionSub, color: order !== 'none' && book === genesisName ? 'rgba(255,255,255,.5)' : 'var(--bento-t3)' }}>{L('genesisSub')}</p>
          </div>
        </button>

        <button style={s.optionCardLight} onClick={() => { setBook(matthewName); if (order === 'none') setOrder('biblical') }}>
          <Radio on={order !== 'none' && book === matthewName} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.optionTitleLight}>{L('matthewTitle', { book: matthewName })}</p>
            <p style={s.optionSubLight}>{L('matthewSub')}</p>
          </div>
        </button>

        {isCustomBook && (
          <button style={s.optionCardLight} onClick={() => setPickerOpen(true)}>
            <Radio on />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.optionTitleLight}>{book}</p>
              <p style={s.optionSubLight}>{L('customBookSub')}</p>
            </div>
          </button>
        )}

        <button style={s.optionCardSmall} onClick={() => { setBook(null); setOrder('none') }}>
          <Radio on={order === 'none'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.optionTitleSmall}>{L('noPlanTitle')}</p>
            <p style={s.optionSubLight}>{L('noPlanSub')}</p>
          </div>
        </button>

        {order !== 'none' && (
          <div style={s.orderCard}>
            <p style={s.orderLabel}>{L('orderLabel')}</p>
            <button style={{ ...s.orderRow, borderBottom: '1px solid var(--bento-line)' }} onClick={() => setOrder('biblical')}>
              <Radio on={order === 'biblical'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={s.orderRowTitle}>{L('biblicalOrderTitle')}</p>
                <p style={s.orderRowSub}>{L('biblicalOrderSub')}</p>
              </div>
            </button>
            <button style={s.orderRow} onClick={() => setOrder('chrono')}>
              <Radio on={order === 'chrono'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={s.orderRowTitle}>{L('chronoOrderTitle')}</p>
                <p style={s.orderRowSub}>{L('chronoOrderSub')}</p>
              </div>
            </button>
          </div>
        )}

        <button style={s.chooseBookRow} onClick={() => setPickerOpen(true)}>
          <span style={s.chooseBookIcon}><AppIcon name="Search" size={16} strokeWidth={2} color="var(--bento-accent)" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.chooseBookTitle}>{L('chooseOtherBookTitle')}</p>
            <p style={s.chooseBookSub}>{L('chooseOtherBookSub')}</p>
          </div>
          <span style={s.chooseBookChevron}>›</span>
        </button>

        {book && bookDone > 0 && (
          <div style={s.progressCard}>
            <p style={s.progressTitle}>{L('progressTitle', { n: bookDone, book })}</p>
            <p style={s.progressSub}>{L('progressSub')}</p>
          </div>
        )}
      </div>

      <div style={s.footer}>
        <button style={s.continueBtn} onClick={() => onContinue(book, order)}>
          <span>{L('continueBtn')}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>→</span>
        </button>
      </div>

      {pickerOpen && (
        <BookPickerSheet
          lang={lang}
          blocks={blocks}
          onClose={() => setPickerOpen(false)}
          onSelect={b => { setBook(b); if (order === 'none') setOrder('biblical'); setPickerOpen(false) }}
        />
      )}
    </div>
  )
}

// Folha simples de escolha de livro (66 opções, agrupadas por bloco) — só
// pra este fluxo; a busca completa com capítulo/versículo mora na aba
// Bíblia (JourneyScreen.jsx).
function BookPickerSheet({ lang, blocks, onClose, onSelect }) {
  const t2 = (k, v) => t(`chooseStart.${k}`, v, lang)
  return createPortal(
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handleWrap} onClick={onClose}><div style={s.handle} /></div>
        <p style={s.sheetTitle}>{t2('pickerTitle')}</p>
        <div style={s.sheetBody}>
          {blocks.map(block => (
            <div key={block.id}>
              <p style={s.pickerGroupLabel}>{lang === 'en' ? block.nameEn : block.name}</p>
              {(lang === 'en' ? block.booksEn : block.books).map((name, i) => (
                <button key={name} style={s.pickerRow} onClick={() => onSelect(block.books[i])}>
                  <span>{name}</span>
                  <AppIcon name="ChevronRight" size={14} color="var(--bento-t5)" />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

const FONT = 'var(--font-bento)'
const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', padding: '22px 20px 0' },
  headerTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  optionCard: { display: 'flex', alignItems: 'center', gap: 14, borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' },
  optionCardOn: { background: 'var(--bento-ink)' },
  optionCardLight: { display: 'flex', alignItems: 'center', gap: 14, borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' },
  optionCardSmall: { display: 'flex', alignItems: 'center', gap: 14, borderRadius: 22, background: 'var(--bento-card)', padding: '14px 18px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' },
  optionTitle: { fontFamily: FONT, fontSize: 16.5, fontWeight: 800, lineHeight: 1.2, margin: 0 },
  optionTitleLight: { fontFamily: FONT, fontSize: 16.5, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 4px' },
  optionTitleSmall: { fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 3px' },
  optionSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, margin: 0 },
  optionSubLight: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.25, color: 'var(--bento-t3)', margin: 0 },
  suggestedBadge: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', background: 'rgba(240,102,43,.16)', borderRadius: 99, padding: '5px 8px' },

  orderCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px 6px' },
  orderLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  orderRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, height: 56, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' },
  orderRowTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  orderRowSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },

  chooseBookRow: { display: 'flex', alignItems: 'center', gap: 14, borderRadius: 22, background: 'rgba(255,255,255,.6)', padding: '16px 20px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' },
  chooseBookIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chooseBookTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  chooseBookSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  chooseBookChevron: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)' },

  progressCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 18px' },
  progressTitle: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, color: 'var(--bento-sand-icon)', margin: '0 0 3px' },
  progressSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-sand-label)', margin: 0 },

  footer: { flex: 'none', padding: '12px 20px calc(20px + var(--safe-bottom))' },
  continueBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },

  backdrop: { position: 'fixed', inset: 0, zIndex: 130, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)', borderRadius: '22px 22px 0 0', maxHeight: '82vh', display: 'flex', flexDirection: 'column', padding: '0 20px calc(20px + var(--safe-bottom))' },
  handleWrap: { display: 'flex', justifyContent: 'center', padding: '14px 0 10px', cursor: 'pointer', flex: 'none' },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)' },
  sheetTitle: { flex: 'none', fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '0 0 12px' },
  sheetBody: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  pickerGroupLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '14px 0 4px' },
  pickerRow: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 46, border: 'none', background: 'none', borderBottom: '1px solid var(--bento-line)', cursor: 'pointer', textAlign: 'left', fontFamily: FONT, fontSize: 14, fontWeight: 600, color: 'var(--bento-ink)' },
}
