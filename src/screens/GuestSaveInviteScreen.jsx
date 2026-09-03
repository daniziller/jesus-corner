// GuestSaveInviteScreen.jsx — "Entrada" (redesign 1g/etapa 7), tela 2 de 2.
//
// Aparece depois da primeira leitura concluída em modo convidado (ver
// App.jsx — condição baseada em completedSet.size e
// src/onboarding/guestInviteStore.js). Duas etapas nesta MESMA tela: o
// convite persuasivo primeiro; ao tocar "Salvar minha leitura", vira o
// formulário de cadastro de verdade (SignupStep, o mesmo do onboarding
// completo — reaproveitado pra não duplicar validação de senha/idade/
// consentimento). "Continuar sem conta" nunca perde o que já foi lido: o
// progresso já está salvo (localStorage, ver userDataStore.js), só o
// convite some por ora.
import { useState } from 'react'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { PLANS } from '../data/bibleBlocks'
import AppIcon from '../icons/AppIcon'
import { SignupStep } from './AuthScreen'

export default function GuestSaveInviteScreen({ lastReadLabel, chaptersRead, planId, onAuthenticated, onDismiss, onGoLogin }) {
  const lang = getAppLanguage() ?? 'pt'
  const [showSignup, setShowSignup] = useState(false)
  const L = (k, vars) => t(`guestEntry.${k}`, vars, lang)

  if (showSignup) {
    const plan = PLANS.find(p => p.id === planId) ?? PLANS.find(p => p.id === 'standard')
    // Mesma estrutura de wrapper de AuthScreen.jsx (className auth-screen/
    // auth-sheet) — SignupStep foi feito pra viver dentro dela (rolagem,
    // largura máxima no desktop via index.css). Sem header (não veio de um
    // assistente com passos anteriores).
    return (
      <div className="auth-screen" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#141414' }}>
        <div className="auth-sheet" style={{ flex: 1, overflowY: 'auto', background: 'var(--white)', borderRadius: '20px 20px 0 0', padding: '32px 22px' }}>
          <SignupStep
            header={null}
            name=""
            prayerMinutes={plan.prayerMinutes}
            reflectionMinutes={plan.reflectionMinutes}
            planId={planId}
            readingOrder="ot_first"
            onAuthenticated={onAuthenticated}
            onGoLogin={onGoLogin}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={styles.screen}>
      <div style={styles.checkCircle}><AppIcon name="Check" size={24} color="white" /></div>
      <h1 style={styles.title}>{L('inviteTitle', { passage: lastReadLabel })}</h1>
      <p style={styles.body}>{L('inviteBody')}</p>

      <div style={styles.lossCard}>
        <div style={styles.lossRow}>
          <span style={styles.lossDot} />
          <span style={styles.lossText}>{L('lossChapters', { n: chaptersRead })}</span>
        </div>
        <div style={{ ...styles.lossRow, borderTop: '1px solid rgba(18,18,18,.07)', paddingTop: 12, marginTop: 12 }}>
          <span style={styles.lossDot} />
          <span style={styles.lossText}>{L('lossPlan', { min: PLANS.find(p => p.id === planId)?.minutesPerDay ?? 30 })}</span>
        </div>
      </div>

      <button style={styles.saveBtn} onClick={() => setShowSignup(true)}>{L('saveBtn')}</button>
      <button style={styles.continueLink} onClick={onDismiss}>{L('continueWithoutAccount')}</button>
    </div>
  )
}

const styles = {
  screen: {
    minHeight: '100%', background: 'var(--g1)', padding: '50px 30px 40px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxSizing: 'border-box',
  },
  checkCircle: {
    width: 52, height: 52, borderRadius: '50%', background: 'var(--or)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.9px',
    color: 'var(--bk)', margin: '0 0 10px', lineHeight: 1.15,
  },
  body: { fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: '#5a5350', margin: '0 0 24px', maxWidth: 340 },
  lossCard: { width: '100%', maxWidth: 360, background: 'var(--white)', borderRadius: 18, padding: 20, marginBottom: 28 },
  lossRow: { display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' },
  lossDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--or)', flexShrink: 0 },
  lossText: { fontSize: 13.5, fontWeight: 600, color: 'var(--bk)' },
  saveBtn: {
    width: '100%', maxWidth: 360, height: 52, borderRadius: 14, border: 'none', background: 'var(--grad-primary)',
    color: 'white', fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', marginBottom: 14,
  },
  continueLink: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: 'var(--g5)', fontFamily: 'var(--font)' },
}
