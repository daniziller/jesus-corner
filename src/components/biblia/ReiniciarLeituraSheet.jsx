// ReiniciarLeituraSheet.jsx — a folha de "Reiniciar a leitura do zero"
// (botão no fim de Sua Bíblia e linha "Reiniciar leitura" do Perfil). A
// pessoa escolhe o que reiniciar além dos capítulos lidos — selos,
// conquistas de leitura, datas das leituras — e confirma com a senha da
// conta, porque não tem volta. Quem entra sem senha (Google ou Apple)
// confirma digitando a palavra.
//
// Sem quadro no pacote de design: composição nossa, com a casca de folha
// de formulário do app (FolhaInferior) e os tokens Bento (pedido da
// autora, 2026-11-14).
//
// `auth` (trocável na pré-visualização): hasPassword() → se a conta tem
// senha; check(senha) → true/false, ou lança se não deu pra conferir.
// `onRestart(extras)` grava e devolve uma promessa; a folha só fecha
// (onDone) depois que ela resolve.
import { useEffect, useState } from 'react'
import FolhaInferior from '../FolhaInferior'
import AppIcon from '../../icons/AppIcon'
import { t } from '../../i18n'
import { accountHasPassword, checkAccountPassword } from '../../auth/authStore'
import { RESTART_EXTRAS, confirmWordMatches } from '../../reading/reiniciarMath'

const FONT = 'var(--font-bento)'
const accountAuth = { hasPassword: accountHasPassword, check: checkAccountPassword }
// Título e explicação de cada escolha (chaves de restartReading.*).
const EXTRA_TEXT = {
  seals: ['sealsTitle', 'sealsSub'],
  achievements: ['achievementsTitle', 'achievementsSub'],
  dates: ['datesTitle', 'datesSub'],
}

export default function ReiniciarLeituraSheet({ lang, onClose, onRestart, onDone, auth = accountAuth }) {
  const L = (k, vars) => t(`restartReading.${k}`, vars, lang)
  const [extras, setExtras] = useState({ seals: false, achievements: false, dates: false })
  // null enquanto não se sabe se a conta tem senha.
  const [hasPassword, setHasPassword] = useState(null)
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    auth.hasPassword().then(has => { if (alive) setHasPassword(has) }).catch(() => { if (alive) setHasPassword(true) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const word = L('confirmWord')
  const ready = hasPassword != null && (hasPassword ? secret.length > 0 : confirmWordMatches(secret, word))

  // Confere a senha e, só então, reinicia. A folha fecha (onDone) depois
  // que o reinício foi gravado; qualquer falha fica escrita nela.
  async function submit(e) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    let failure = null
    try {
      if (hasPassword && !(await auth.check(secret))) failure = 'wrongPassword'
    } catch {
      failure = 'checkFailed'
    }
    if (!failure) {
      try {
        await onRestart(extras)
        onDone()
        return
      } catch {
        failure = 'restartFailed'
      }
    }
    setError(failure)
    setBusy(false)
  }

  return (
    <FolhaInferior onClose={busy ? () => {} : onClose} labelledBy="reiniciar-leitura" fixed form over>
      <form onSubmit={submit} data-folha="reiniciar-leitura">
        <h2 style={s.title} id="reiniciar-leitura">{L('title')}</h2>
        <p style={s.sub}>{L('sub')}</p>

        <div style={s.card}>
          <div style={s.row}>
            <span style={{ ...s.box, ...s.boxOn, ...s.boxFixed }} aria-hidden="true"><AppIcon name="Check" size={13} strokeWidth={3} color="#fff" /></span>
            <span style={s.rowText}>
              <span style={s.rowTitle}>{L('chaptersTitle')} <span style={s.always}>{L('always')}</span></span>
              <span style={s.rowSub}>{L('chaptersSub')}</span>
            </span>
          </div>
          {RESTART_EXTRAS.map((key, i) => {
            const on = extras[key]
            return (
              <button
                key={key} type="button" role="checkbox" aria-checked={on} data-reiniciar={key} disabled={busy}
                style={{ ...s.row, ...s.rowButton, ...(i === RESTART_EXTRAS.length - 1 ? s.rowLast : null) }}
                onClick={() => setExtras(prev => ({ ...prev, [key]: !prev[key] }))}
              >
                <span style={{ ...s.box, ...(on ? s.boxOn : null) }} aria-hidden="true">{on && <AppIcon name="Check" size={13} strokeWidth={3} color="#fff" />}</span>
                <span style={s.rowText}>
                  <span style={s.rowTitle}>{L(EXTRA_TEXT[key][0])}</span>
                  <span style={s.rowSub}>{L(EXTRA_TEXT[key][1])}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p style={s.keeps}>{L('keeps')}</p>

        {hasPassword != null && (
          <label style={s.field}>
            <span style={s.fieldLabel}>{hasPassword ? L('passwordLabel') : L('wordLabel', { word })}</span>
            <input
              className="passo-campo" style={s.input}
              type={hasPassword ? 'password' : 'text'} autoComplete={hasPassword ? 'current-password' : 'off'} autoCapitalize={hasPassword ? 'none' : 'characters'}
              value={secret} onChange={e => { setSecret(e.target.value); setError(null) }}
              placeholder={hasPassword ? L('passwordPlaceholder') : word}
              aria-invalid={error === 'wrongPassword'} aria-describedby={error ? 'reiniciar-erro' : undefined}
            />
          </label>
        )}
        {error && <p style={s.error} id="reiniciar-erro" role="alert">{L(error)}</p>}

        <button type="submit" style={{ ...s.primary, ...(ready && !busy ? null : s.primaryOff) }} disabled={!ready || busy}>
          {busy ? L('working') : L('confirm')}
        </button>
        <button type="button" style={s.cancel} onClick={onClose} disabled={busy}>{L('cancel')}</button>
      </form>
    </FolhaInferior>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 14px' },
  card: { borderRadius: 20, background: 'var(--bento-card)', padding: '4px 16px' },
  row: { width: '100%', minHeight: 44, boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--bento-line)', textAlign: 'left' },
  rowButton: { border: 'none', borderBottom: '1px solid var(--bento-line)', background: 'none', cursor: 'pointer', fontFamily: FONT },
  rowLast: { borderBottom: 'none' },
  box: { width: 22, height: 22, flexShrink: 0, boxSizing: 'border-box', borderRadius: 7, border: '2px solid var(--bento-t5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { border: '2px solid var(--bento-ink)', background: 'var(--bento-ink)' },
  boxFixed: { opacity: 0.45 },
  rowText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  rowTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1.25, color: 'var(--bento-ink)' },
  always: { fontSize: 11, fontWeight: 700, color: 'var(--bento-t4)', marginLeft: 4 },
  rowSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)' },
  keeps: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '10px 2px 14px' },
  field: { display: 'block', borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px 15px', cursor: 'text' },
  fieldLabel: { display: 'block', fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1.3, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  input: { display: 'block', width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'none', padding: 0, margin: '9px 0 0', fontFamily: FONT, fontSize: 16, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-ink)' },
  error: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, color: 'var(--bento-accent)', margin: '10px 2px 0' },
  primary: { width: '100%', height: 54, marginTop: 14, borderRadius: 18, border: 'none', background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: '#fff', cursor: 'pointer' },
  primaryOff: { opacity: 0.35, cursor: 'default' },
  cancel: { width: '100%', height: 48, marginTop: 4, border: 'none', background: 'none', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
}
