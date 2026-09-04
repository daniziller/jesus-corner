// AiSettingsScreen.jsx — "Assistente de leitura" (tela 10f do redesign
// Bento). Reunião dos interruptores/preferências que hoje já existem
// espalhados pelos stores de cada feature de IA (10a-10d), sem UI própria
// até agora — esta tela só liga a interface a eles. Alcançada por
// ProfileScreen.jsx ("Assistente de leitura", dentro de Preferências),
// só pra quem tem session.hasAI.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getAskEnabled, setAskEnabled, getResponseTone, setResponseTone } from '../aiChat/aiPreferencesStore'
import { getChapterContextEnabled, setChapterContextEnabled } from '../aiChat/chapterContextStore'
import { getReflectionQuestionsEnabled, setReflectionQuestionsEnabled, clearAllReflections } from '../aiChat/reflectionQuestionsStore'
import { getSaveQuestionsEnabled, setSaveQuestionsEnabled, clearAllPassageQuestions } from '../aiChat/passageQuestionStore'
import { getGroupNoticeEnabled, setGroupNoticeEnabled } from '../groups/groupNoticeStore'
import { getMyGroups } from '../groups/groupsStore'

const TONES = [
  { id: 'direct', labelKey: 'toneDirect', subKey: 'toneDirectSub' },
  { id: 'explained', labelKey: 'toneExplained', subKey: 'toneExplainedSub' },
  { id: 'study', labelKey: 'toneStudy', subKey: 'toneStudySub' },
]

export default function AiSettingsScreen({ session, onBack }) {
  const { lang } = session
  const L = (k, vars) => t(`aiSettings.${k}`, vars, lang)

  // Lidos direto do localStorage no useState inicial (não há backend nem
  // outro lugar que mude esses valores enquanto esta tela está aberta),
  // mesmo padrão de AdjustPlanScreen.jsx pros próprios campos dela.
  const [askOn, setAskOn] = useState(getAskEnabled)
  const [contextOn, setContextOn] = useState(getChapterContextEnabled)
  const [reflectionOn, setReflectionOn] = useState(getReflectionQuestionsEnabled)
  const [tone, setTone] = useState(getResponseTone)
  const [saveOn, setSaveOn] = useState(getSaveQuestionsEnabled)
  // "Aviso do grupo" (quadro 10f): só aparece pra quem está num grupo, nasce
  // desligado e mora na linha de dados (o servidor é quem manda o aviso).
  const [inGroup, setInGroup] = useState(false)
  const [groupNoticeOn, setGroupNoticeOn] = useState(false)
  useEffect(() => {
    let cancelled = false
    Promise.all([getMyGroups().catch(() => []), getGroupNoticeEnabled().catch(() => false)]).then(([groups, on]) => {
      if (cancelled) return
      setInGroup(groups.length > 0)
      setGroupNoticeOn(on)
    })
    return () => { cancelled = true }
  }, [])
  function toggleGroupNotice() {
    const next = !groupNoticeOn
    setGroupNoticeOn(next)
    setGroupNoticeEnabled(next).catch(err => console.error('Failed to save group notice preference', err))
  }

  function toggleAsk() { setAskEnabled(!askOn); setAskOn(!askOn) }
  function toggleContext() { setChapterContextEnabled(!contextOn); setContextOn(!contextOn) }
  function toggleReflection() { setReflectionQuestionsEnabled(!reflectionOn); setReflectionOn(!reflectionOn) }
  function toggleSave() { setSaveQuestionsEnabled(!saveOn); setSaveOn(!saveOn) }
  function chooseTone(id) { setResponseTone(id); setTone(id) }

  // Uma ação só, os dois stores (10a/10b e 10d são "minhas perguntas" pra
  // quem usa — ver comentário em reflectionQuestionsStore.js).
  function clearQuestions() {
    if (!window.confirm(L('clearConfirm'))) return
    clearAllPassageQuestions()
    clearAllReflections()
  }

  return (
    <div style={styles.screen}>
      {/* O quadro 10f não tem botão de voltar nem barra inferior — mas sem
          os dois a pessoa ficaria presa aqui. O botão fica (única saída),
          com o mesmo desenho dos outros quadros (34 r12 branco, chevron). */}
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
          <ToggleRow label={L('askLabel')} sub={L('askSub')} value={askOn} onChange={toggleAsk} />
          <ToggleRow label={L('contextLabel')} sub={L('contextSub')} value={contextOn} onChange={toggleContext} />
          <ToggleRow label={L('reflectionLabel')} sub={L('reflectionSub')} value={reflectionOn} onChange={toggleReflection} last={!inGroup} noBorder={!inGroup} />
          {inGroup && (
            <ToggleRow label={L('groupNoticeLabel')} sub={L('groupNoticeSub')} value={groupNoticeOn} onChange={toggleGroupNotice} last noBorder />
          )}
        </div>

        <div style={styles.card}>
          <p style={styles.sectionLabel}>{L('toneTitle')}</p>
          <p style={styles.sectionHint}>{L('toneHint')}</p>
          <div style={styles.toneRow}>
            {TONES.map(opt => {
              const on = tone === opt.id
              return (
                <button key={opt.id} style={{ ...styles.toneBtn, ...(on ? styles.toneBtnOn : {}) }} onClick={() => chooseTone(opt.id)}>
                  <span style={{ ...styles.toneLabel, color: on ? '#fff' : 'var(--bento-ink)' }}>{L(opt.labelKey)}</span>
                  <span style={{ ...styles.toneSub, color: on ? 'rgba(255,255,255,.5)' : 'var(--bento-t4)' }}>{L(opt.subKey)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={styles.card}>
          <ToggleRow label={L('saveQuestionsLabel')} sub={L('saveQuestionsSub')} value={saveOn} onChange={toggleSave} last noBorder />
          <button style={styles.clearBtn} onClick={clearQuestions}>{L('clearQuestions')}</button>
        </div>
      </div>

      <div style={styles.footer}>
        <div style={styles.offlineCard}>
          <p style={styles.offlineText}>{L('offlineNote')}</p>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, sub, value, onChange, last, noBorder }) {
  return (
    <div style={{ ...styles.toggleRow, padding: last ? 0 : '0 0 14px', marginBottom: last ? 0 : 14, borderBottom: noBorder ? 'none' : '1px solid var(--bento-line)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={styles.toggleLabel}>{label}</p>
        <p style={styles.toggleSub}>{sub}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={onChange}
        style={{
          ...styles.switch,
          background: value ? 'var(--bento-ink)' : 'var(--bento-toggle-off)',
          justifyContent: value ? 'flex-end' : 'flex-start',
        }}
      >
        <span style={{ ...styles.switchThumb, background: value ? 'var(--bento-accent)' : '#fff' }} />
      </button>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  // Medidas do quadro 10f: cabeçalho 24px 20px 14px, título 19/800/1.1/-.6
  // com 4px até o subtítulo 12.5/500/1.4; cartões com gap 10.
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '0 0 4px' },
  headerSub: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 12 },
  toggleLabel: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 3px' },
  toggleSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },
  switch: { flexShrink: 0, width: 46, height: 28, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'background .15s' },
  switchThumb: { width: 22, height: 22, borderRadius: 99 },
  sectionLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  sectionHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 14px' },
  toneRow: { display: 'flex', gap: 8 },
  toneBtn: { flex: 1, height: 66, borderRadius: 16, border: 'none', background: 'var(--bento-line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  toneBtnOn: { background: 'var(--bento-ink)' },
  toneLabel: { fontSize: 13.5, fontWeight: 800, lineHeight: 1 },
  toneSub: { fontSize: 10.5, fontWeight: 600, lineHeight: 1 },
  clearBtn: { width: '100%', border: 'none', background: 'none', marginTop: 14, textAlign: 'left', padding: 0, fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-accent)', cursor: 'pointer' },
  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  offlineCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '15px 18px' },
  offlineText: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },
}
