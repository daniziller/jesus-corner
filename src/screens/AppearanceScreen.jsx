// AppearanceScreen.jsx — "Aparência e texto" (quadro 19a: a linha mostra
// "Claro · 18 pt" com seta, ou seja, abre uma tela própria com tema e
// tamanho de texto). Alcançada por ProfileSheet.jsx.
//
// Regra Zero, aplicada (mesmo espírito de LanguageSettingsScreen.jsx/19b
// pra versão da Bíblia): o app inteiro — todas as telas do redesign Bento,
// deste pacote e dos anteriores — só existe em modo claro; nunca houve um
// tema escuro construído. "Tema" aqui fica informativo (mostra "Claro",
// sem seletor, com uma nota explicando por quê), igual o card de versão
// de 19b. O que É de verdade um seletor, e funciona, é o tamanho do texto
// — decisão dela (2026-09-08): trocar o liga/desliga antigo por um
// seletor de pontos de verdade (ver textScaleStore.js).
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { FONT_SIZE_STEPS } from '../utils/textScaleStore'

export default function AppearanceScreen({ session, fontSizePt, onChangeFontSizePt, onBack }) {
  const lang = session.lang
  const L = (k, vars) => t(`appearance.${k}`, vars, lang)

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
        <div style={s.card}>
          <p style={s.sectionLabel}>{L('themeTitle')}</p>
          <div style={s.themeRow}>
            <span style={s.optionLabel}>{L('themeLight')}</span>
            <span style={s.themeBadge}><AppIcon name="Check" size={12} strokeWidth={3} color="#fff" /></span>
          </div>
        </div>

        <div style={s.noteCard}>
          <p style={s.noteText}>{L('themeNote')}</p>
        </div>

        <div style={s.card}>
          <p style={s.sectionLabel}>{L('textSizeTitle')}</p>
          <div style={s.sizeRow}>
            {FONT_SIZE_STEPS.map(pt => {
              const on = fontSizePt === pt
              return (
                <button
                  key={pt} type="button"
                  style={{ ...s.sizeChip, ...(on ? s.sizeChipOn : {}) }}
                  onClick={() => onChangeFontSizePt?.(pt)}
                >
                  {pt}
                </button>
              )
            })}
          </div>
          <p style={{ ...s.previewText, fontSize: fontSizePt }}>{L('previewText')}</p>
        </div>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '0 0 4px' },
  headerSub: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px' },
  sectionLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 8px' },
  themeRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '4px 0' },
  optionLabel: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)' },
  themeBadge: { width: 22, height: 22, flexShrink: 0, borderRadius: 7, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  noteCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '15px 18px' },
  noteText: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },
  sizeRow: { display: 'flex', gap: 7, marginBottom: 14 },
  sizeChip: { flex: 1, height: 44, borderRadius: 14, border: 'none', background: 'var(--bento-line)', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  sizeChipOn: { background: 'var(--bento-ink)', color: '#fff' },
  previewText: { fontFamily: 'var(--font-bento)', fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-ink)', margin: 0 },
}
