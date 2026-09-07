// CreateGroupSheet.jsx — "Criar um grupo" (quadro 24b, Bloco 10). Folha em
// três decisões: nome, o que o grupo lê (cada um no seu plano / um plano
// só) e quem entra. Substitui o antigo formulário só-de-nome embutido em
// GroupsListSection (GroupsScreen.jsx).
//
// "Quem entra" é só uma pré-visualização de expectativa, não um campo
// gravado: as duas opções já levam ao MESMO mecanismo real (link + código
// de 6 letras, aprovado pelo moderador — ver redeemGroupInviteCode/
// join_requests) — não existe hoje um grupo "achável numa busca" pra
// diferenciar de verdade. "O que o grupo lê" grava de verdade
// (reading_mode, migration 0051), mas com uma limitação documentada: opção
// 'shared' ainda não sincroniza a leitura de ninguém, só guarda a intenção
// (ver nota na própria migração e em GroupHomeView.jsx).
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { avatarInitialsOf } from '../utils/avatarInitials'

const FONT = 'var(--font-bento)'

export default function CreateGroupSheet({ lang, onClose, onCreate }) {
  const L = (k, vars) => t(`createGroup.${k}`, vars, lang)
  const [name, setName] = useState('')
  const [readingMode, setReadingMode] = useState('individual')
  const [joinPolicy, setJoinPolicy] = useState('invite') // 'invite' | 'code' — visual only, ver nota acima
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    const clean = name.trim()
    if (!clean || loading) return
    setLoading(true)
    setError('')
    try {
      await onCreate(clean, readingMode)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return createPortal(
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handleWrap}><div style={s.handle} /></div>
        <div style={s.header}>
          <p style={s.title}>{L('title')}</p>
          <p style={s.sub}>{L('sub')}</p>
        </div>

        <div style={s.body}>
          <div style={s.card}>
            <p style={s.sectionLabel}>{L('nameLabel')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={s.avatarPreview}>{name.trim() ? avatarInitialsOf(name.trim()) : ''}</div>
              <input
                style={s.nameInput} value={name} onChange={e => setName(e.target.value)}
                placeholder={L('namePlaceholder')} maxLength={60} autoFocus
              />
            </div>
          </div>

          <div style={s.card}>
            <p style={s.sectionLabel}>{L('whatReadsLabel')}</p>
            <button type="button" style={s.radioRow} onClick={() => setReadingMode('individual')}>
              <Radio on={readingMode === 'individual'} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={s.radioTitle}>{L('individualTitle')}</p>
                <p style={s.radioSub}>{L('individualSub')}</p>
              </div>
            </button>
            <button type="button" style={{ ...s.radioRow, borderTop: '1px solid var(--bento-line)', marginTop: 12, paddingTop: 12 }} onClick={() => setReadingMode('shared')}>
              <Radio on={readingMode === 'shared'} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={s.radioTitle}>{L('sharedTitle')}</p>
                <p style={s.radioSub}>{L('sharedSub')}</p>
              </div>
            </button>
          </div>

          <div style={s.card}>
            <p style={s.sectionLabel}>{L('whoJoinsLabel')}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button type="button" style={{ ...s.joinBtn, ...(joinPolicy === 'invite' ? s.joinBtnOn : {}) }} onClick={() => setJoinPolicy('invite')}>
                {L('inviteOnly')}
              </button>
              <button type="button" style={{ ...s.joinBtn, ...(joinPolicy === 'code' ? s.joinBtnOn : {}) }} onClick={() => setJoinPolicy('code')}>
                {L('withCode')}
              </button>
            </div>
            <p style={s.joinHint}>{L('joinHint')}</p>
          </div>

          <div style={s.noteCard}>
            <div style={s.noteIcon}><AppIcon name="Share2" size={15} strokeWidth={2} color="var(--bento-sand)" /></div>
            <p style={s.noteText}>{L('inviteNote')}</p>
          </div>

          {error && <p style={s.errorText}>{error}</p>}
        </div>

        <div style={s.footer}>
          <button type="button" style={{ ...s.submitBtn, ...(loading || !name.trim() ? { opacity: .6 } : {}) }} onClick={submit} disabled={loading || !name.trim()}>
            <span>{loading ? t('groups.loading', undefined, lang) : L('submitBtn')}</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>→</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Radio({ on }) {
  return (
    <span style={{
      width: 20, height: 20, borderRadius: 99, flexShrink: 0, boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: on ? 'var(--bento-accent)' : 'transparent',
      border: on ? 'none' : '2px solid var(--bento-t6)',
    }}>
      {on && <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--bento-ink)' }} />}
    </span>
  )
}

const s = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 140, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 'var(--max-width)', maxHeight: '88vh', background: 'var(--bento-bg)', borderRadius: '34px 34px 0 0', display: 'flex', flexDirection: 'column' },
  handleWrap: { flex: 'none', display: 'flex', justifyContent: 'center', padding: '14px 0 0' },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)' },
  header: { flex: 'none', padding: '18px 22px 0' },
  title: { fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 22px 4px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px' },
  sectionLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  avatarPreview: { width: 40, height: 40, flexShrink: 0, borderRadius: 13, background: 'var(--bento-ink)', color: 'var(--bento-accent)', fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: '40px', textAlign: 'center' },
  nameInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: FONT, fontSize: 16, fontWeight: 700, color: 'var(--bento-ink)' },
  radioRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'none', padding: 0, cursor: 'pointer' },
  radioTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  radioSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.25, color: 'var(--bento-t3)', margin: 0 },
  joinBtn: { flex: 1, height: 38, borderRadius: 13, border: 'none', background: 'var(--bento-line)', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-t3)', cursor: 'pointer' },
  joinBtnOn: { background: 'var(--bento-ink)', color: '#fff' },
  joinHint: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  noteCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  noteIcon: { width: 32, height: 32, flexShrink: 0, borderRadius: 11, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-accent)', margin: 0 },
  footer: { flex: 'none', padding: '14px 22px calc(20px + var(--safe-bottom))' },
  submitBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
}
