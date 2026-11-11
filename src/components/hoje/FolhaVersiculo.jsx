// FolhaVersiculo.jsx — o versículo do dia aberto (handoff-hoje-50 §6): a
// folha inferior padrão com o versículo inteiro, a referência e as duas
// ações que eram ícones no cartão antigo do Hoje — salvar (vira marcação)
// e compartilhar. Tocar na referência abre o capítulo na Bíblia, como o
// toque no texto fazia. Salvar/compartilhar/abrir são de quem chama
// (HomeScreen): a folha só mostra.
import FolhaInferior from '../FolhaInferior'
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function FolhaVersiculo({ verse, saved, sharing, onSave, onShare, onOpenText, onClose }) {
  const canOpen = !!(verse.bookPt && verse.chapter)
  const ref = `${verse.ref}${verse.version ? ` · ${verse.version}` : ''}`
  return (
    <FolhaInferior fixed onClose={onClose} labelledBy="hoje-versiculo-titulo">
      <p id="hoje-versiculo-titulo" style={s.title}>Versículo do dia</p>
      <p style={s.verse}>&ldquo;{verse.text}&rdquo;</p>
      {canOpen ? (
        <button type="button" style={s.refBtn} onClick={onOpenText} aria-label={`${ref}. Ir para o texto na Bíblia`}>
          {ref}
          <AppIcon name="ChevronRight" size={14} strokeWidth={2.2} color="var(--bento-t5)" />
        </button>
      ) : <p style={s.ref}>{ref}</p>}
      <div style={s.actions}>
        <button type="button" style={s.secondary} onClick={onSave} disabled={saved} aria-label={saved ? 'Versículo salvo' : 'Salvar versículo'}>
          <AppIcon name="BookMarked" size={15} strokeWidth={2} color="var(--bento-ink)" />
          {saved ? 'Salvo' : 'Salvar'}
        </button>
        <button type="button" style={s.primary} onClick={onShare} disabled={sharing} aria-label="Compartilhar versículo">
          <AppIcon name="Share2" size={15} strokeWidth={2} color="#fff" />
          Compartilhar
        </button>
      </div>
    </FolhaInferior>
  )
}

const btn = { flex: 1, minWidth: 0, height: 52, borderRadius: 17, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FONT, fontSize: 14, fontWeight: 800, cursor: 'pointer' }
const refText = { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-t2)' }
const s = {
  title: { fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--bento-ink)', margin: 0 },
  verse: { fontFamily: FONT, fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: 'var(--bento-ink)', margin: '12px 0 6px' },
  ref: { ...refText, margin: '0 0 14px' },
  refBtn: { ...refText, minHeight: 44, display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: 0, margin: '0 0 4px', cursor: 'pointer' },
  actions: { display: 'flex', gap: 8, marginTop: 6 },
  secondary: { ...btn, background: 'var(--bento-line)', color: 'var(--bento-ink)' },
  primary: { ...btn, background: 'var(--bento-ink)', color: '#fff' },
}
