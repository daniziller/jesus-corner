// ApplicationStepCard.jsx — o passo "Aplicar" refeito (quadro 29b), o
// último de qualquer um dos dois fluxos de Reflexão (manual ou com IA):
// uma frase no imperativo sobre o que fazer HOJE com a leitura — não mais
// uma pergunta aberta. Fica salva no histórico do dia (NotesScreen.jsx) e,
// se for a primeira ou a pessoa confirmar a troca, fixada como a frase
// atual (ver applicationPhraseStore.js) — o card "Sua aplicação de ontem"
// que existia na Home (HomeDashboard.jsx) saiu de cena em 2026-09-07,
// quando a Home voltou a ser sempre o quadro 3c.
//
// "Me ajuda a escrever" (só com IA — session.hasAI) reaproveita o mesmo
// endpoint de compose-reflection (compose-reflection-draft) que já existe
// pra juntar respostas num parágrafo — aqui só pede um trecho curto como
// ponto de partida; a pessoa sempre edita e confirma antes de salvar,
// nunca salva sozinho. O lembrete das 18h grava a intenção real (extra no
// mesmo registro do dia) — a ENTREGA do aviso (push com o texto da frase)
// depende de infraestrutura de agendamento por mensagem que o app ainda
// não tem (o que existe, subscribeToPush, é só o lembrete diário genérico
// do onboarding); fica registrado como pendência, não fingido como pronto.
import { useState } from 'react'
import { t as translate } from '../../i18n'
import AppIcon from '../../icons/AppIcon'

export default function ApplicationStepCard({
  lang, hasAI, value, onSave, pendingPin, onConfirmPin,
  reminderRequested, onToggleReminder, aiContext, onFinish, finishLabel,
}) {
  const L = (k, vars) => translate(`applyStep.${k}`, vars, lang)
  const [text, setText] = useState(value)
  const [busy, setBusy] = useState(false)
  const [assisting, setAssisting] = useState(false)
  const [assistError, setAssistError] = useState(false)

  async function handleAssist() {
    if (!aiContext || assisting) return
    setAssisting(true)
    setAssistError(false)
    try {
      const draft = await aiContext()
      if (draft) setText(draft)
    } catch {
      setAssistError(true)
    } finally {
      setAssisting(false)
    }
  }

  async function handleFinish() {
    if (busy) return
    setBusy(true)
    try {
      await onSave(text)
      onFinish?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div style={s.darkCard}>
        <div style={s.labelRow}>
          <span style={s.diamond} />
          <p style={s.label}>{L('label')}</p>
        </div>
        <p style={s.prompt}>{L('prompt')}</p>
        <p style={s.hint}>{L('hint')}</p>
      </div>

      <div style={s.answerCard}>
        <textarea
          style={s.textarea}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={L('placeholder')}
          rows={3}
          maxLength={140}
        />
        {hasAI && aiContext && (
          <div style={s.chipRow}>
            <button style={s.chip} onClick={handleAssist} disabled={assisting}>
              {assisting ? L('assisting') : L('assistChip')}
            </button>
          </div>
        )}
        {assistError && <p style={s.assistError}>{L('assistError')}</p>}
      </div>

      {pendingPin && (
        <div style={s.pinConfirmCard}>
          <p style={s.pinConfirmText}>{L('pinConfirmText')}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.pinConfirmYes} onClick={() => onConfirmPin(true)}>{L('pinConfirmYes')}</button>
            <button style={s.pinConfirmNo} onClick={() => onConfirmPin(false)}>{L('pinConfirmNo')}</button>
          </div>
        </div>
      )}

      <div style={s.reminderCard}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.reminderTitle}>{L('reminderTitle')}</p>
          <p style={s.reminderSub}>{L('reminderSub')}</p>
        </div>
        <button
          role="switch" aria-checked={reminderRequested}
          style={{ ...s.reminderSwitch, background: reminderRequested ? 'var(--bento-ink)' : 'var(--bento-toggle-off)', justifyContent: reminderRequested ? 'flex-end' : 'flex-start' }}
          onClick={() => onToggleReminder(!reminderRequested)}
        >
          <span style={{ ...s.reminderThumb, background: reminderRequested ? 'var(--bento-accent)' : '#fff' }} />
        </button>
      </div>

      <div style={s.privacyCard}>
        <p style={s.privacyText}>{L('privacyText')}</p>
      </div>

      <button style={s.finishBtn} onClick={handleFinish} disabled={busy}>
        <span>{busy ? L('saving') : finishLabel ?? L('finishBtn')}</span>
        <span style={s.finishArrow}>→</span>
      </button>
    </>
  )
}

const FONT = 'var(--font-bento)'
const s = {
  darkCard: { borderRadius: 26, background: 'var(--bento-ink)', padding: 20 },
  labelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  diamond: { width: 9, height: 9, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  label: { flex: 1, fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  prompt: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.28, letterSpacing: '-.7px', color: '#fff', margin: '0 0 10px' },
  hint: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'rgba(255,255,255,.45)', margin: 0 },

  answerCard: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  textarea: { width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'none', fontFamily: FONT, fontSize: 15, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-ink)' },
  chipRow: { marginTop: 12, display: 'flex', gap: 7, flexWrap: 'wrap' },
  chip: { border: 'none', background: 'var(--bento-line)', borderRadius: 99, padding: '9px 12px', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  assistError: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-t4)', margin: '8px 0 0' },

  pinConfirmCard: { borderRadius: 18, background: 'var(--bento-card)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 },
  pinConfirmText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-ink)', lineHeight: 1.4, margin: 0 },
  pinConfirmYes: { flex: 1, background: 'var(--bento-accent)', border: 'none', borderRadius: 12, padding: '10px 12px', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  pinConfirmNo: { flex: 1, background: 'var(--bento-line)', border: 'none', borderRadius: 12, padding: '10px 12px', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  reminderCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 },
  reminderTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  reminderSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  reminderSwitch: { flexShrink: 0, width: 44, height: 26, borderRadius: 99, border: 'none', display: 'flex', alignItems: 'center', padding: '0 3px', cursor: 'pointer' },
  reminderThumb: { width: 20, height: 20, borderRadius: 99 },

  privacyCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '13px 18px' },
  privacyText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },

  finishBtn: { height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  finishArrow: { fontSize: 15, fontWeight: 700 },
}
