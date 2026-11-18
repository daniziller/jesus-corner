// Verificação em duas etapas do painel do admin (revisão de LGPD,
// 2026-11-18 — art. 46). O servidor só atende o painel com um token aal2
// (api/_lib/adminAuth.js); esta tela fica na frente do painel até isso:
//   - sem autenticador cadastrado: mostra o QR code (Supabase MFA, TOTP)
//     para o Google Authenticator / 1Password / Authy, e confirma com o
//     primeiro código;
//   - já cadastrado: pede o código de 6 dígitos.
// Depois de confirmar, a sessão vira aal2 e o painel abre.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { t } from '../i18n'

const FONT = 'var(--font-bento)'

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const res = await fetch('/api/admin/check', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: '{}' })
  if (!res.ok) throw new Error(`check_failed_${res.status}`)
  return res.json()
}

export default function AdminMfaGate({ lang, onExit, children }) {
  const L = k => t(`admin.mfa.${k}`, undefined, lang)
  const [stage, setStage] = useState('loading') // loading | ok | verify | enroll | error
  const [factorId, setFactorId] = useState(null)
  const [qr, setQr] = useState(null)
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { mfaRequired } = await checkAdmin()
        if (!mfaRequired) { if (alive) setStage('ok'); return }
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal?.currentLevel === 'aal2') { if (alive) setStage('ok'); return }
        const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors()
        if (listErr) throw listErr
        const verified = (factors?.totp ?? []).find(f => f.status === 'verified')
        if (verified) { if (alive) { setFactorId(verified.id); setStage('verify') } return }
        // Cadastro largado no meio deixa um fator "unverified" — tira antes.
        for (const f of factors?.all ?? []) {
          if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {})
        }
        const { data: enrolled, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Jesus' Corner admin ${new Date().toISOString().slice(0, 10)}` })
        if (enrollErr) throw enrollErr
        if (alive) { setFactorId(enrolled.id); setQr(enrolled.totp?.qr_code ?? null); setSecret(enrolled.totp?.secret ?? ''); setStage('enroll') }
      } catch (err) {
        console.error('AdminMfaGate:', err?.message ?? err)
        if (alive) setStage('error')
      }
    })()
    return () => { alive = false }
  }, [])

  async function confirm() {
    setBusy(true); setError('')
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    setBusy(false)
    if (verifyErr) { setError(L('wrongCode')); return }
    setStage('ok')
  }

  if (stage === 'ok') return children
  return (
    <div style={styles.screen}>
      <div style={styles.card}>
        <p style={styles.kicker}>{L('kicker')}</p>
        {stage === 'loading' && <p style={styles.body}>{L('loading')}</p>}
        {stage === 'error' && (<><p style={styles.title}>{L('errorTitle')}</p><p style={styles.body}>{L('errorBody')}</p></>)}
        {(stage === 'enroll' || stage === 'verify') && (
          <>
            <p style={styles.title}>{L(stage === 'enroll' ? 'enrollTitle' : 'verifyTitle')}</p>
            <p style={styles.body}>{L(stage === 'enroll' ? 'enrollBody' : 'verifyBody')}</p>
            {stage === 'enroll' && qr && <img src={qr} alt={L('qrAlt')} style={styles.qr} />}
            {stage === 'enroll' && secret && <p style={styles.secret}>{L('secretLabel')} <code>{secret}</code></p>}
            <input
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter' && code.length === 6) confirm() }}
              style={styles.input}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button type="button" style={styles.primary} disabled={busy || code.length !== 6} onClick={confirm}>{busy ? L('checking') : L('confirm')}</button>
          </>
        )}
        <button type="button" style={styles.secondary} onClick={onExit}>{L('exit')}</button>
      </div>
    </div>
  )
}

const styles = {
  screen: { minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bento-bg)', boxSizing: 'border-box' },
  card: { width: '100%', maxWidth: 420, background: 'var(--bento-card)', borderRadius: 24, padding: 22, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 10 },
  kicker: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  title: { fontFamily: FONT, fontSize: 21, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  body: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)', margin: 0 },
  qr: { width: 200, height: 200, alignSelf: 'center', background: '#fff', borderRadius: 12, padding: 8 },
  secret: { fontFamily: FONT, fontSize: 12, color: 'var(--bento-t3)', margin: 0, wordBreak: 'break-all' },
  input: { height: 52, borderRadius: 14, border: 'none', background: 'var(--bento-line)', fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '.3em', textAlign: 'center', color: 'var(--bento-ink)' },
  error: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-accent)', margin: 0 },
  primary: { height: 50, border: 'none', borderRadius: 14, background: 'var(--bento-accent)', color: '#fff', fontFamily: FONT, fontSize: 15, fontWeight: 800, cursor: 'pointer' },
  secondary: { height: 40, border: 'none', background: 'transparent', color: 'var(--bento-t2)', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' },
}
