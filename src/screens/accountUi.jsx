// accountUi.jsx — peças compartilhadas das telas de conta do redesign Bento
// (quadros 13b Entrar, 13c Criar conta, 13d Recuperar senha). Todas as três
// têm a mesma casca: fundo --bento-bg, botão de voltar 38px branco no canto,
// corpo com cartão branco raio 24 e campos #F2EEE9 raio 16 (50–52px), botão
// primário laranja 56px raio 18. Os valores vêm direto do HTML do redesign
// (ver design_handoff_jesus_corner/) — não há tema aqui, só medidas.
import { useState } from 'react'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import AppIcon from '../icons/AppIcon'

export const FONT = 'var(--font-bento)'

// Casca: cabeçalho (voltar), corpo rolável e rodapé fixo. No desktop o
// conteúdo fica numa coluna de até 440px (invisível no celular, onde a
// tela tem menos que isso) — mesma largura que a tela de login antiga usava.
export function AccountShell({ onBack, body, bodyStyle, footer, footerStyle }) {
  const lang = getAppLanguage() ?? 'pt'
  return (
    <div style={ui.screen}>
      <div style={ui.header}>
        <div style={ui.col}>
          <button type="button" style={ui.backBtn} onClick={onBack} aria-label={t('account.back', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={17} strokeWidth={2} color="var(--bento-ink)" />
          </button>
        </div>
      </div>
      <div style={{ ...ui.body, ...bodyStyle }}>
        <div style={{ ...ui.col, display: 'flex', flexDirection: 'column', flex: 1, ...(bodyStyle?.gap != null ? { gap: bodyStyle.gap } : {}) }}>
          {body}
        </div>
      </div>
      {footer && (
        <div style={{ ...ui.footer, ...footerStyle }}>
          <div style={ui.col}>{footer}</div>
        </div>
      )}
    </div>
  )
}

export function AccountLabel({ children, style }) {
  return <p style={{ ...ui.label, ...style }}>{children}</p>
}

// Campo de texto: label 10px acima, caixa #F2EEE9 raio 16. `height` é 52 no
// login/recuperar e 50 no criar conta (medidas dos quadros).
export function AccountField({ label, value, onChange, type = 'text', height = 52, marginBottom = 0, autoComplete, inputMode, autoFocus, maxLength }) {
  return (
    <label style={{ display: 'block', margin: `0 0 ${marginBottom}px` }}>
      <AccountLabel>{label}</AccountLabel>
      <div style={{ ...ui.field, height }}>
        <input
          style={ui.input}
          type={type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </label>
  )
}

// Campo de senha com "mostrar"/"ocultar" em texto (não em ícone), como no
// quadro. Enquanto oculta, o texto usa 16px/700 com espaçamento 2px — é o
// tamanho das bolinhas no HTML; quando visível, volta ao 14.5px/600 dos
// outros campos.
export function AccountPasswordField({ label, value, onChange, height = 52, marginBottom = 0, autoComplete, hint }) {
  const [visible, setVisible] = useState(false)
  const lang = getAppLanguage() ?? 'pt'
  return (
    <div style={{ margin: `0 0 ${marginBottom}px` }}>
      <label style={{ display: 'block' }}>
        <AccountLabel>{label}</AccountLabel>
        <div style={{ ...ui.field, height, gap: 10 }}>
          <input
            style={{ ...ui.input, ...(visible ? {} : ui.inputMasked) }}
            type={visible ? 'text' : 'password'}
            value={value}
            autoComplete={autoComplete}
            onChange={e => onChange(e.target.value)}
          />
          <button type="button" style={ui.showBtn} onClick={() => setVisible(v => !v)}>
            {t(visible ? 'account.hide' : 'account.show', undefined, lang)}
          </button>
        </div>
      </label>
      {hint && <p style={ui.hint}>{hint}</p>}
    </div>
  )
}

export function AccountPrimaryButton({ label, onClick, disabled, type = 'button', style }) {
  return (
    <button type={type} style={{ ...ui.primaryBtn, ...(disabled ? { opacity: .6, cursor: 'default' } : {}), ...style }} onClick={onClick} disabled={disabled}>
      <span style={ui.primaryText}>{label}</span>
    </button>
  )
}

// Estado de erro (não existe no quadro): uma linha no laranja de acento,
// única cor de destaque da identidade — nada de vermelho novo.
export function AccountError({ text, style }) {
  if (!text) return null
  return <p style={{ ...ui.error, ...style }} role="alert">{text}</p>
}

// Bloco escuro "Depois de enviar" (13d) — reaproveitado pela confirmação
// de e-mail do cadastro, que não tem quadro próprio.
export function SentCard({ label, title, body, buttonLabel, onButton, buttonDisabled, style }) {
  return (
    <div style={{ ...ui.sentCard, ...style }}>
      <div style={ui.sentHead}>
        <div style={ui.sentIcon}>
          <AppIcon name="Check" size={15} strokeWidth={2.8} color="var(--bento-ink)" />
        </div>
        <p style={ui.sentLabel}>{label}</p>
      </div>
      <p style={ui.sentTitle}>{title}</p>
      <p style={ui.sentBody}>{body}</p>
      <button type="button" style={{ ...ui.sentBtn, ...(buttonDisabled ? { cursor: 'default' } : {}) }} onClick={onButton} disabled={buttonDisabled}>
        {buttonLabel}
      </button>
    </div>
  )
}

// Contador "0:42" do reenvio.
export function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const ui = {
  screen: { height: '100%', minHeight: '100%', background: 'var(--bento-bg)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: FONT },
  col: { width: '100%', maxWidth: 440, margin: '0 auto' },
  header: { flex: 'none', padding: '22px 20px 0' },
  backBtn: { width: 38, height: 38, borderRadius: 13, background: 'var(--bento-card)', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  footer: { flex: 'none' },
  label: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 8px' },
  field: { borderRadius: 16, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', padding: '0 16px', boxSizing: 'border-box' },
  input: { flex: 1, minWidth: 0, width: '100%', border: 'none', outline: 'none', background: 'transparent', padding: 0, margin: 0, fontFamily: FONT, fontSize: 14.5, fontWeight: 600, lineHeight: 1, color: 'var(--bento-ink)' },
  inputMasked: { fontSize: 16, fontWeight: 700, letterSpacing: 2 },
  showBtn: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', flex: 'none' },
  hint: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t5)', margin: '9px 0 0' },
  primaryBtn: { width: '100%', height: 56, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 },
  primaryText: { fontFamily: FONT, fontSize: 16, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' },
  error: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, color: 'var(--bento-accent)', margin: '12px 0 0' },
  sentCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: 22 },
  sentHead: { display: 'flex', alignItems: 'center', gap: 11, margin: '0 0 14px' },
  sentIcon: { width: 30, height: 30, borderRadius: 11, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  sentLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  sentTitle: { fontFamily: FONT, fontSize: 20, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.7px', color: '#fff', margin: '0 0 10px', overflowWrap: 'anywhere' },
  sentBody: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,.55)', margin: '0 0 18px' },
  sentBtn: { width: '100%', height: 48, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1, color: 'rgba(255,255,255,.8)', padding: 0 },
  // Rodapé "Voltar para entrar" (13d) / "Não tem conta? Criar conta" (13b).
  footLink: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, lineHeight: 1, color: 'var(--bento-t3)', margin: 0, display: 'block', width: '100%', textAlign: 'center' },
  footAccent: { color: 'var(--bento-accent)', fontWeight: 800 },
}
