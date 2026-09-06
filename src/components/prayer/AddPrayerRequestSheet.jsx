// AddPrayerRequestSheet.jsx — "Fazer um pedido" (quadro 25b, Bloco 11).
// Aberta a partir da Súplica (26a) ou do "+" na aba de oração de um grupo
// (nesse caso `defaultGroupId` já vem preenchido e a lista de "quem vê"
// nasce em cima dele).
//
// "Quem vê": uma linha por grupo que a pessoa já é membro (escopo
// 'group'), + "Meus amigos" (escopo 'friends') + "Só eu" (escopo
// 'only_me', vira lembrete pessoal — ver prayerRequestsStore.js). Sem
// grupo nenhum, a lista some e some só as duas últimas opções.
//
// "Escrever com ajuda": não é um modo separado — o mesmo campo de texto
// aceita tanto o desabafo cru quanto o pedido final; o botão manda o texto
// ATUAL pra IA (api/compose-prayer-request.js) e troca pelo resultado, que
// a pessoa ainda pode editar antes de publicar. Exige session.hasAI (quem
// não tem simplesmente não vê o botão).
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'
import { avatarInitialsOf } from '../../utils/avatarInitials'
import { getMyGroups, getGroupMemberCounts } from '../../groups/groupsStore'
import { getFriendsCount } from '../../friends/friendsStore'
import { createPrayerRequest, composePrayerRequestDraft } from '../../groups/prayerRequestsStore'
import { incrementPrayerStat } from '../../prayer/prayerStatsStore'

const FONT = 'var(--font-bento)'
const MAX_LEN = 240

export default function AddPrayerRequestSheet({ lang, authUser, hasAI, defaultGroupId = null, onClose, onCreated }) {
  const L = (k, vars) => t(`addPrayerRequest.${k}`, vars, lang)
  const email = authUser?.email

  const [groups, setGroups] = useState([])
  const [memberCounts, setMemberCounts] = useState({})
  const [friendsCount, setFriendsCount] = useState(0)
  const [scope, setScope] = useState(defaultGroupId ? 'group' : null)
  const [groupId, setGroupId] = useState(defaultGroupId)

  const [body, setBody] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyGroups().then(async list => {
      setGroups(list)
      setMemberCounts(await getGroupMemberCounts(list.map(g => g.groupId)))
      // Sem grupo escolhido de fora (aba de um grupo específico) — o
      // primeiro disponível vira o padrão: um grupo, se houver, senão amigos.
      if (!defaultGroupId) {
        setScope(list.length > 0 ? 'group' : 'friends')
        if (list.length > 0) setGroupId(list[0].groupId)
      }
    }).catch(err => console.error('Failed to load groups', err))
    getFriendsCount().then(setFriendsCount).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trimmedLen = body.trim().length
  const overLimit = trimmedLen > MAX_LEN
  const canSubmit = trimmedLen > 0 && !overLimit && scope && !posting

  async function submit() {
    if (!canSubmit) return
    setPosting(true)
    setError('')
    try {
      await createPrayerRequest({ body: body.trim(), scope, groupId: scope === 'group' ? groupId : null, anonymous })
      incrementPrayerStat(email, 'requestsAdded').catch(err => console.error('Failed to persist prayer stat', err))
      onCreated?.()
      onClose?.()
    } catch (err) {
      setError(err.message)
      setPosting(false)
    }
  }

  async function useAiHelp() {
    const draft = body.trim()
    if (!draft || aiLoading) return
    setAiLoading(true)
    setAiError('')
    try {
      const rewritten = await composePrayerRequestDraft({ text: draft, lang })
      setBody(rewritten)
    } catch (err) {
      setAiError(err.message === 'daily_limit_reached' ? t('aiChat.dailyLimitReached', undefined, lang) : L('aiAssistError'))
    } finally {
      setAiLoading(false)
    }
  }

  function selectGroup(gid) {
    setScope('group')
    setGroupId(gid)
  }

  const whoSeesOptions = useMemo(() => {
    const opts = groups.map(g => ({
      key: `group:${g.groupId}`,
      on: scope === 'group' && groupId === g.groupId,
      label: g.name,
      sub: t(memberCounts[g.groupId] === 1 ? 'addPrayerRequest.peopleCountOne' : 'addPrayerRequest.peopleCountMany', { n: memberCounts[g.groupId] ?? 0 }, lang),
      onClick: () => selectGroup(g.groupId),
    }))
    opts.push({
      key: 'friends',
      on: scope === 'friends',
      label: L('friendsOptionLabel'),
      sub: t(friendsCount === 1 ? 'addPrayerRequest.peopleCountOne' : 'addPrayerRequest.peopleCountMany', { n: friendsCount }, lang),
      onClick: () => { setScope('friends'); setGroupId(null) },
    })
    opts.push({
      key: 'only_me',
      on: scope === 'only_me',
      label: L('onlyMeOptionLabel'),
      sub: L('onlyMeOptionSub'),
      onClick: () => { setScope('only_me'); setGroupId(null) },
    })
    return opts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, memberCounts, friendsCount, scope, groupId, lang])

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
            <textarea
              style={s.textarea}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={L('placeholder')}
              maxLength={1200}
              rows={3}
              autoFocus
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...s.charCount, ...(overLimit ? s.charCountOver : {}) }}>{L('charCount', { used: trimmedLen, max: MAX_LEN })}</span>
              {hasAI && (
                <button type="button" style={s.aiBtn} onClick={useAiHelp} disabled={aiLoading || !body.trim()}>
                  {aiLoading ? L('aiAssistLoading') : L('aiAssistBtn')}
                </button>
              )}
            </div>
            {aiError && <p style={s.errorText}>{aiError}</p>}
          </div>

          <div style={s.card}>
            <p style={s.sectionLabel}>{L('whoSeesLabel')}</p>
            {whoSeesOptions.length === 0 && <p style={s.noGroupsHint}>{L('noGroupsYet')}</p>}
            {whoSeesOptions.map((opt, i) => (
              <button
                key={opt.key}
                type="button"
                style={{ ...s.radioRow, ...(i > 0 ? { borderTop: '1px solid var(--bento-line)' } : {}) }}
                onClick={opt.onClick}
              >
                <Radio on={opt.on} />
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)' }}>{opt.label}</span>
                <span style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t4)' }}>{opt.sub}</span>
              </button>
            ))}
          </div>

          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={s.toggleTitle}>{L('anonymousToggleTitle')}</p>
                <p style={s.toggleSub}>{L('anonymousToggleSub')}</p>
              </div>
              <button type="button" style={{ ...s.toggle, background: anonymous ? 'var(--bento-ink)' : 'var(--bento-line)' }} onClick={() => setAnonymous(v => !v)} aria-pressed={anonymous}>
                <div style={{ ...s.toggleKnob, ...(anonymous ? { marginLeft: 'auto', background: 'var(--bento-accent)' } : {}) }} />
              </button>
            </div>
          </div>

          <div style={s.noteCard}>
            <div style={s.noteIcon}><AppIcon name="Lock" size={15} strokeWidth={2} color="var(--bento-sand-icon)" /></div>
            <p style={s.noteText}>{L('noteText')}</p>
          </div>

          {error && <p style={s.errorText}>{error}</p>}
        </div>

        <div style={s.footer}>
          <button type="button" style={{ ...s.submitBtn, ...(!canSubmit ? { opacity: .6 } : {}) }} onClick={submit} disabled={!canSubmit}>
            <span>{posting ? t('groups.loading', undefined, lang) : L('submitBtn')}</span>
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
  sheet: { width: '100%', maxWidth: 'var(--max-width)', maxHeight: '90vh', background: 'var(--bento-bg)', borderRadius: '34px 34px 0 0', boxShadow: '0 -18px 40px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column' },
  handleWrap: { flex: 'none', display: 'flex', justifyContent: 'center', padding: '14px 0 0' },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)' },
  header: { flex: 'none', padding: '18px 22px 0' },
  title: { fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 22px 4px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px' },
  textarea: { width: '100%', border: 'none', outline: 'none', background: 'none', resize: 'none', fontFamily: FONT, fontSize: 15, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-ink)', margin: '0 0 10px' },
  charCount: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-t5)' },
  charCountOver: { color: 'var(--bento-accent)', fontWeight: 800 },
  aiBtn: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-accent)' },
  sectionLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  noGroupsHint: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t4)', margin: '4px 0' },
  radioRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, height: 50, border: 'none', background: 'none', padding: 0, cursor: 'pointer' },
  toggleTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  toggleSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.25, color: 'var(--bento-t3)', margin: 0 },
  toggle: { width: 44, height: 26, borderRadius: 99, border: 'none', display: 'flex', alignItems: 'center', padding: 3, flexShrink: 0, cursor: 'pointer', boxSizing: 'border-box' },
  toggleKnob: { width: 20, height: 20, borderRadius: 99, background: '#fff' },
  noteCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  noteIcon: { width: 32, height: 32, flexShrink: 0, borderRadius: 11, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-accent)', margin: 0 },
  footer: { flex: 'none', padding: '14px 22px calc(20px + var(--safe-bottom))' },
  submitBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
}
