// LanguageSettingsScreen.jsx — "Idioma e versão da Bíblia" (quadro 19b).
// Alcançada por ProfileSheet.jsx ("Idioma" e "Versão da Bíblia", no card
// "Meus dados").
//
// Regra Zero, aplicada: o quadro 19b mostra 3 idiomas (PT/EN/ES) e 4
// versões por idioma (NVT/NVI/ARA/NTLH) com seleção livre. O app de
// verdade só tem 2 idiomas (pt/en — ver i18n/index.js) e exatamente 1
// versão bíblica por idioma (ver data/bibleVersions.js, que já documenta:
// "Quando um idioma só tem 1 opção, o seletor de versão não aparece na
// UI" — mesma regra aplicada em BibleTextPanel/ReadingBlockView.jsx).
// Por isso o card de versão aqui é informativo, não um seletor: mostra a
// versão do idioma escolhido, sem opção de trocar (não existe outra pra
// trocar), com uma nota explicando o porquê.
import { useState } from 'react'
import { t, LANGUAGES } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { findBibleVersion } from '../data/bibleVersions'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'

export default function LanguageSettingsScreen({ session, authUser, onBack, onChangeLanguage }) {
  const lang = session.lang
  const L = (k, vars) => t(`languageSettings.${k}`, vars, lang)
  const [selected, setSelected] = useState(authUser.language ?? 'pt')
  const [saved, setSaved] = useState(false)

  const version = findBibleVersion(getSelectedVersionId(selected))
  const dirty = selected !== (authUser.language ?? 'pt')

  function apply() {
    if (dirty) onChangeLanguage?.(selected)
    setSaved(true)
    setTimeout(() => onBack?.(), 400)
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={styles.headerTitle}>{L('pageTitle')}</p>
          <p style={styles.headerSub}>{L('pageSub')}</p>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.card}>
          <p style={styles.sectionLabel}>{L('appLanguageTitle')}</p>
          {LANGUAGES.map((option, i) => {
            const on = selected === option.id
            return (
              <button
                key={option.id}
                style={{ ...styles.optionRow, borderBottom: i === LANGUAGES.length - 1 ? 'none' : '1px solid var(--bento-line)' }}
                onClick={() => setSelected(option.id)}
              >
                <span style={styles.optionLabel}>{option.label}</span>
                <span style={{ ...styles.checkbox, ...(on ? styles.checkboxOn : {}) }}>
                  {on && <AppIcon name="Check" size={12} strokeWidth={3} color="#fff" />}
                </span>
              </button>
            )
          })}
        </div>

        <div style={styles.card}>
          <p style={styles.sectionLabel}>{L('bibleVersionTitle')}</p>
          <div style={styles.versionRow}>
            <span style={styles.optionLabel}>{version?.label ?? '—'}</span>
            <span style={styles.versionBadge}>{version?.short}</span>
          </div>
        </div>

        <div style={styles.noteCard}>
          <p style={styles.noteText}>{L('versionNote')}</p>
        </div>
      </div>

      <div style={styles.footer}>
        <button style={styles.applyBtn} onClick={apply}>{saved ? L('appliedBtn') : L('applyBtn')}</button>
      </div>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '0 0 4px' },
  headerSub: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px' },
  sectionLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 8px' },
  optionRow: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 0', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' },
  optionLabel: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)' },
  checkbox: { width: 22, height: 22, borderRadius: 7, border: '2px solid var(--bento-line)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { background: 'var(--bento-accent)', border: '2px solid var(--bento-accent)' },
  versionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '4px 0' },
  versionBadge: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: 'var(--bento-t3)', background: 'var(--bento-line)', borderRadius: 99, padding: '4px 10px' },
  noteCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '15px 18px' },
  noteText: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },
  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  applyBtn: { width: '100%', height: 52, borderRadius: 16, border: 'none', background: 'var(--bento-ink)', color: '#fff', fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 800, cursor: 'pointer' },
}
