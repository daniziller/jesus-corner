// ProfileSheet.jsx — Perfil, quadro 19a. Não é mais aba/tela cheia: sobe
// como folha ao tocar nas iniciais no cabeçalho de Hoje, com a barra de
// abas continuando visível por trás (ver App.jsx — profileOpen). Fecha
// tocando no puxador, no fundo escurecido, ou navegando pra qualquer linha
// que leve a outra tela.
//
// O quadro só desenha 8 linhas (Meus dados, Lembrete, Idioma, Versão da
// Bíblia, Administração do grupo, Assistente de leitura, Aparência e
// texto, Ajuda/Sair). Tudo que já existia no Perfil antes do reskin e não
// está no quadro (assinatura, atalhos de Notas/Estudos, ritmo/ordem de
// leitura, reiniciar leitura, frases de aplicação, admin do site,
// Instagram, baixar meus dados, excluir conta) continua funcionando —
// mora no card "Mais opções", fora do desenho do quadro. O "Reconfigurar
// Planejador" antigo não entrou: era só um alerta "em breve", nunca teve
// funcionalidade de verdade por trás.
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { t, LANGUAGES } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getMyProfile, updateProfile } from '../profile/profileStore'
import { termsUrl, privacyUrl } from '../utils/legalLinks'
import { getManageSubscriptionUrl } from '../billing/subscriptionStore'
import { formatAmount } from '../billing/formatAmount'
import { exportMyData, deleteMyAccount } from '../privacy/privacyStore'
import { calculateAge, ageToApproxBirthdate } from '../utils/age'
import { getShowApplicationCard, setShowApplicationCard } from '../reflection/applicationCardVisibilityStore'
import { PLANS } from '../data/bibleBlocks'
import {
  isSubscribedToPush, subscribeToPush, unsubscribeFromPush, getMyReminderSchedule,
  DEFAULT_REMINDER_HOUR, DEFAULT_REMINDER_MINUTE, DEFAULT_REMINDER_DAYS,
} from '../notifications/pushStore'

const FONT = 'var(--font-bento)'
const MAX_BIO_LENGTH = 280
const REMINDER_DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

export default function ProfileSheet({
  open, session, authUser, subscription, isAdmin, largeText, onToggleLargeText,
  onNavigate, onClose, onLogout, onResetProgress, onChangeReadingOrder, onSelectPace, onProfileUpdated,
}) {
  const [notifications, setNotifications] = useState(false)
  const [remindersBusy, setRemindersBusy] = useState(false)
  const [remindersError, setRemindersError] = useState('')
  const [remindersConfigOpen, setRemindersConfigOpen] = useState(false)
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR)
  const [reminderMinute, setReminderMinute] = useState(DEFAULT_REMINDER_MINUTE)
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS)
  const [readingOrderPickerOpen, setReadingOrderPickerOpen] = useState(false)
  const [pacePickerOpen, setPacePickerOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [showApplicationCard, setShowApplicationCardState] = useState(getShowApplicationCard)

  const [profile, setProfile] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [exportState, setExportState] = useState('idle')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const lang = session.lang
  const L = (k, vars) => t(`profile.${k}`, vars, lang)

  useEffect(() => {
    if (!open) return
    getMyProfile().then(setProfile).catch(err => console.error('Failed to load profile', err))
    isSubscribedToPush().then(subscribed => {
      setNotifications(subscribed)
      if (!subscribed) return
      getMyReminderSchedule().then(schedule => {
        if (!schedule) return
        setReminderHour(schedule.hour)
        setReminderMinute(schedule.minute)
        setReminderDays(schedule.days)
      })
    }).catch(() => {})
  }, [open])

  async function handleToggleReminders() {
    if (remindersBusy) return
    const next = !notifications
    setRemindersBusy(true)
    setRemindersError('')
    try {
      if (next) await subscribeToPush({ hour: reminderHour, minute: reminderMinute, days: reminderDays })
      else await unsubscribeFromPush()
      setNotifications(next)
    } catch (err) {
      setRemindersError(err.message)
    } finally {
      setRemindersBusy(false)
    }
  }

  async function handleScheduleChange(nextHour, nextMinute, nextDays) {
    setReminderHour(nextHour)
    setReminderMinute(nextMinute)
    setReminderDays(nextDays)
    if (!notifications || remindersBusy) return
    setRemindersBusy(true)
    setRemindersError('')
    try {
      await subscribeToPush({ hour: nextHour, minute: nextMinute, days: nextDays })
    } catch (err) {
      setRemindersError(err.message)
    } finally {
      setRemindersBusy(false)
    }
  }

  function toggleReminderDay(day) {
    const nextDays = reminderDays.includes(day)
      ? reminderDays.filter(d => d !== day)
      : REMINDER_DAY_KEYS.filter(d => reminderDays.includes(d) || d === day)
    if (nextDays.length === 0) return
    handleScheduleChange(reminderHour, reminderMinute, nextDays)
  }

  function reminderDaysLabel() {
    const isWeekdays = reminderDays.length === 5 && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every(d => reminderDays.includes(d))
    if (reminderDays.length === 7) return L('reminderEveryDay')
    if (isWeekdays) return L('reminderWeekdays')
    return REMINDER_DAY_KEYS.filter(d => reminderDays.includes(d)).map(d => L(`reminderDay${d}`)).join(', ')
  }

  function reminderHourLabel() {
    const mm = String(reminderMinute).padStart(2, '0')
    if (lang === 'en') {
      const period = reminderHour < 12 ? 'AM' : 'PM'
      const h12 = reminderHour % 12 === 0 ? 12 : reminderHour % 12
      return `${h12}:${mm} ${period}`
    }
    return `${String(reminderHour).padStart(2, '0')}:${mm}`
  }

  function startEdit() {
    setEditName(authUser.name)
    const currentAge = calculateAge(authUser.birthdate)
    setEditAge(currentAge !== null ? String(currentAge) : '')
    setEditBio(profile?.bio ?? '')
    setEditIsPublic(profile?.isPublic ?? false)
    setSaveError('')
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
    setSaveError('')
  }

  async function saveEdit() {
    if (!editName.trim()) { setSaveError(L('nameRequiredError')); return }
    const ageNum = Number(editAge)
    if (!editAge || !Number.isFinite(ageNum) || ageNum <= 0 || ageNum > 120) {
      setSaveError(L('ageInvalidError'))
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const avatarUrl = profile?.avatarUrl ?? null
      const birthdate = ageToApproxBirthdate(ageNum)
      await updateProfile({ name: editName, birthdate, bio: editBio, isPublic: editIsPublic })
      setProfile({ bio: editBio.trim(), avatarUrl, isPublic: editIsPublic })
      onProfileUpdated?.({ name: editName.trim(), birthdate, avatarUrl })
      setEditMode(false)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleResetClick() {
    if (window.confirm(L('resetConfirm'))) onResetProgress?.()
  }

  async function handleSubscriptionClick() {
    if (subscription?.access_type !== 'recurring') { go('upgrade'); return }
    try {
      const url = await getManageSubscriptionUrl(subscription)
      window.location.href = url
    } catch {
      go('upgrade')
    }
  }

  function subscriptionSub() {
    if (subscription?.access_type === 'free') return t('billing.subscriptionFreeSub', undefined, lang)
    if (subscription?.access_type === 'lifetime') return t('billing.subscriptionLifetimeSub', undefined, lang)
    if (session.hasPremium) {
      const tierName = t(session.tier === 'premium' ? 'billing.tiers.premium' : 'billing.tiers.premiumAi', undefined, lang)
      if (subscription?.access_type === 'recurring' && subscription.amount_cents != null && subscription.currency) {
        const key = subscription.plan === 'annual' ? 'billing.subscriptionRecurringAnnualSub' : 'billing.subscriptionRecurringSub'
        return `${tierName} · ${t(key, { amount: formatAmount(subscription.amount_cents, subscription.currency) }, lang)}`
      }
      return `${tierName} · ${t('billing.subscriptionActiveSub', undefined, lang)}`
    }
    return t('billing.subscriptionUpgradeSub', undefined, lang)
  }

  async function handleExport() {
    setExportState('loading')
    try {
      await exportMyData()
      setExportState('idle')
    } catch (err) {
      console.error('Falha ao exportar dados', err)
      setExportState('error')
    }
  }

  // Qualquer navegação pra outra tela fecha a folha antes — não faz
  // sentido a folha continuar "aberta" por cima de uma tela diferente.
  function go(tab) {
    onClose?.()
    onNavigate?.(tab)
  }

  if (!open) return null

  const myGroup = session.myGroups?.[0] ?? null
  const displayAvatarUrl = profile?.avatarUrl

  return createPortal(
    <div style={s.backdrop} onClick={onClose}>
      <div className="profile-sheet-panel" style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handleWrap} onClick={onClose}><div style={s.handle} /></div>

        <div style={s.body}>
          {/* Bloco escuro — quem você é (quadro 19a). */}
          <div style={s.userCard}>
            <div style={s.avatarTile}>
              {displayAvatarUrl
                ? <img src={displayAvatarUrl} alt="" style={s.avatarImg} />
                : <span style={s.avatarInitials}>{session.avatarInitials}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.userName}>{authUser.name}</p>
              <p style={s.userEmail}>{authUser.email}</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                {isAdmin && <span style={s.adminBadge}>{L('adminBadge')}</span>}
                {myGroup && <span style={s.groupBadge}>{myGroup.name}</span>}
              </div>
            </div>
          </div>

          {/* Card 1 — Meus dados / Lembrete / Idioma / Versão da Bíblia. */}
          <div style={s.card}>
            <Row label={L('myDataLabel')} sub={L('myDataSub')} onPress={() => editMode ? cancelEdit() : startEdit()} last={!editMode} />
            {editMode && (
              <div style={s.expandPanel}>
                <EditField label={L('nameLabel')} value={editName} onChange={setEditName} />
                <EditField label={L('ageLabel')} type="number" value={editAge} onChange={setEditAge} />
                <label style={s.fieldWrap}>
                  <span style={s.fieldLabel}>{L('bioLabel')}</span>
                  <textarea
                    style={s.bioInput}
                    value={editBio}
                    onChange={e => setEditBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
                    placeholder={L('bioPlaceholder')}
                    rows={3}
                  />
                  <span style={s.bioCounter}>{editBio.length}/{MAX_BIO_LENGTH}</span>
                </label>
                <div style={s.toggleRow}>
                  <div style={{ flex: 1 }}>
                    <p style={s.toggleLabel}>{L('publicProfileLabel')}</p>
                    <p style={s.toggleSub}>{L('publicProfileSub')}</p>
                  </div>
                  <Switch value={editIsPublic} onChange={() => setEditIsPublic(v => !v)} />
                </div>
                {saveError && <p style={s.errorText}>{saveError}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.primarySmallBtn} onClick={saveEdit} disabled={saving}>{saving ? L('saving') : L('save')}</button>
                  <button style={s.secondarySmallBtn} onClick={cancelEdit} disabled={saving}>{L('cancel')}</button>
                </div>
              </div>
            )}

            <Row
              label={L('remindersLabel')} sub={`${reminderHourLabel()} · ${reminderDaysLabel()}`}
              onPress={() => setRemindersConfigOpen(v => !v)}
              right={<Switch value={notifications} onChange={handleToggleReminders} disabled={remindersBusy} />}
              last={!remindersConfigOpen}
            />
            {remindersConfigOpen && (
              <div style={s.expandPanel}>
                <span style={s.fieldLabel}>{L('reminderHourLabel')}</span>
                <div style={{ position: 'relative', margin: '6px 0 14px' }}>
                  <div style={s.wheelHighlight} />
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <WheelPicker values={HOURS} value={reminderHour} disabled={remindersBusy} formatValue={h => String(h).padStart(2, '0')} onChange={h => handleScheduleChange(h, reminderMinute, reminderDays)} />
                    <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: 'var(--bento-ink)' }}>:</span>
                    <WheelPicker values={MINUTES} value={reminderMinute} disabled={remindersBusy} formatValue={m => String(m).padStart(2, '0')} onChange={m => handleScheduleChange(reminderHour, m, reminderDays)} />
                  </div>
                </div>
                <span style={s.fieldLabel}>{L('reminderDaysLabel')}</span>
                <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                  {REMINDER_DAY_KEYS.map(day => (
                    <button key={day} type="button" disabled={remindersBusy} onClick={() => toggleReminderDay(day)} style={{ ...s.chip, flex: 1, ...(reminderDays.includes(day) ? s.chipActive : {}) }}>
                      {L(`reminderDay${day}`)}
                    </button>
                  ))}
                </div>
                {remindersError && <p style={s.errorText}>{remindersError}</p>}
              </div>
            )}

            <Row label={L('languageLabel')} sub={LANGUAGES.find(l => l.id === (authUser.language ?? 'pt'))?.label} onPress={() => go('language')} />
            <Row label={L('bibleVersionLabel')} sub={L('bibleVersionSub')} onPress={() => go('language')} last />
          </div>

          {/* Card 2 — Administração do grupo (moderador) / Assistente de
              leitura (IA) / Aparência. "Administração do grupo" (quadro
              19c) ainda não tem tela própria — entra numa próxima leva,
              junto com o backend de convite por código (ver PR #47);
              até lá a linha fica de fora em vez de apontar pra lugar
              nenhum. */}
          <div style={s.card}>
            {session.hasAI && (
              <Row label={L('aiSettingsLabel')} sub={L('aiSettingsSub')} onPress={() => go('aiSettings')} />
            )}
            <Row
              label={L('appearanceLabel')} sub={largeText ? L('appearanceSubOn') : L('appearanceSubOff')}
              onPress={onToggleLargeText}
              right={<Switch value={!!largeText} onChange={onToggleLargeText} />}
              last
            />
          </div>

          {/* Fora do quadro 19a — funcionalidade real que já existia,
              mantida atrás de "Mais opções" em vez de sumir. */}
          <button style={s.moreToggle} onClick={() => setMoreOpen(v => !v)}>
            {L('moreSectionLabel')} <AppIcon name={moreOpen ? 'ChevronUp' : 'ChevronDown'} size={13} color="var(--bento-t3)" />
          </button>
          {moreOpen && (
            <div style={s.card}>
              <Row icon="Crown" label={t('billing.mySubscriptionLabel', undefined, lang)} sub={subscriptionSub()} onPress={handleSubscriptionClick} />
              {session.hasPremium && <Row icon="StickyNote" label={t('nav.notes', undefined, lang)} sub={L('notesLinkSub')} onPress={() => go('notes')} />}
              {session.hasPremium && <Row icon="GraduationCap" label={t('nav.studies', undefined, lang)} sub={L('studiesLinkSub')} onPress={() => go('studies')} />}
              <Row
                icon="BookOpen" label={L('readingPlanLabel')}
                sub={L('readingPlanSub', { plan: lang === 'en' ? session.plan.labelEn : session.plan.label, n: session.plan.avgChapters })}
                onPress={() => session.hasPremium ? go('journey') : setPacePickerOpen(v => !v)}
                last={!(!session.hasPremium && pacePickerOpen)}
              />
              {!session.hasPremium && pacePickerOpen && (
                <div style={s.expandPanel}>
                  {PLANS.map(p => (
                    <button key={p.id} onClick={() => { onSelectPace?.(p.id); setPacePickerOpen(false) }} style={{ ...s.chip, width: '100%', textAlign: 'left', marginBottom: 6, ...(session.plan.id === p.id ? s.chipActive : {}) }}>
                      {(lang === 'en' ? p.labelEn : p.label)}{p.avgChapters ? ` · ${L('readingPlanChapters', { n: p.avgChapters })}` : ''}
                    </button>
                  ))}
                </div>
              )}
              <Row icon="ArrowUp" label={L('readingOrderLabel')} sub={L(session.readingOrder === 'nt_first' ? 'readingOrderSubNt' : 'readingOrderSubOt')} onPress={() => setReadingOrderPickerOpen(v => !v)} last={!readingOrderPickerOpen} />
              {readingOrderPickerOpen && (
                <div style={s.expandPanel}>
                  <button onClick={() => { onChangeReadingOrder?.('ot_first'); setReadingOrderPickerOpen(false) }} style={{ ...s.chip, width: '100%', marginBottom: 6, ...(session.readingOrder !== 'nt_first' ? s.chipActive : {}) }}>{L('readingOrderOtFirstBtn')}</button>
                  <button onClick={() => { onChangeReadingOrder?.('nt_first'); setReadingOrderPickerOpen(false) }} style={{ ...s.chip, width: '100%', ...(session.readingOrder === 'nt_first' ? s.chipActive : {}) }}>{L('readingOrderNtFirstBtn')}</button>
                </div>
              )}
              <Row icon="RefreshCw" label={L('resetReadingLabel')} sub={L('resetReadingSub', { block: session.firstBlockName })} onPress={handleResetClick} />
              <Row icon="Sparkles" label={L('applicationPhrasesLabel')} sub={L('applicationPhrasesSub')} onPress={() => go('applicationPhrases')} />
              <Row
                icon="Sparkles" label={L('applicationCardLabel')} sub={L('applicationCardSub')}
                right={<Switch value={showApplicationCard} onChange={() => { const next = !showApplicationCard; setShowApplicationCardState(next); setShowApplicationCard(next) }} />}
              />
              {isAdmin && <Row icon="Wrench" label={L('adminLabel')} sub={L('adminSub')} onPress={() => go('admin')} />}
              <Row icon="Instagram" label={L('instagramLabel')} sub={L('instagramSub')} onPress={() => window.open('https://www.instagram.com/jesuscorner.app/', '_blank', 'noopener,noreferrer')} />
              <Row icon="Download" label={L('exportDataLabel')} sub={L('exportDataSub')} onPress={handleExport} />
              <Row icon="Trash2" iconColor="var(--re)" label={L('deleteAccountLabel')} sub={L('deleteAccountSub')} onPress={() => setDeleteOpen(true)} last />
            </div>
          )}

          {exportState === 'loading' && <p style={s.hintText}>{L('exportDataLoading')}</p>}
          {exportState === 'error' && <p style={s.errorText}>{L('exportDataError')}</p>}

          {/* Sobre o nome — conteúdo mantido, restilizado. */}
          <div style={s.aboutCard}>
            <p style={s.aboutTitle}>{L('aboutNameTitle')}</p>
            <p style={s.aboutVerse}>"{L('aboutNameVerseText')}"</p>
            <p style={s.aboutVerseRef}>{L('aboutNameVerseRef')}</p>
            <p style={s.aboutBody}>{L('aboutNameBody')}</p>
          </div>

          <p style={s.legalRow}>
            <span style={s.legalLink} onClick={() => window.open(privacyUrl(authUser.language ?? 'pt'), '_blank', 'noopener,noreferrer')}>{L('privacyLabel')}</span>
            {'   ·   '}
            <span style={s.legalLink} onClick={() => window.open(termsUrl(authUser.language ?? 'pt'), '_blank', 'noopener,noreferrer')}>{L('termsLabel')}</span>
          </p>
          <p style={s.versionText}>{L('versionLabel')}</p>
        </div>

        {/* Rodapé — Ajuda / Sair da conta (quadro 19a). */}
        <div style={s.footer}>
          <button style={s.footerBtn} onClick={() => go('contact')}>{L('helpLabel')}</button>
          <button style={{ ...s.footerBtn, color: 'var(--bento-t3)' }} onClick={onLogout}>{L('logoutLabel')}</button>
        </div>
      </div>

      {deleteOpen && (
        <DeleteAccountDialog
          lang={lang}
          email={authUser.email}
          hasStoreSubscription={subscription?.billing_provider === 'apple' || subscription?.billing_provider === 'google_play'}
          onCancel={() => setDeleteOpen(false)}
          onDeleted={onLogout}
        />
      )}
    </div>,
    document.body,
  )
}

function Row({ icon, iconColor, label, sub, onPress, right, last }) {
  return (
    <div
      style={{ ...s.row, borderBottom: last ? 'none' : '1px solid var(--bento-line)', cursor: onPress ? 'pointer' : 'default' }}
      onClick={onPress}
    >
      {icon && (
        <div style={s.rowIconTile}>
          <AppIcon name={icon} size={15} color={iconColor ?? 'var(--bento-t2)'} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={s.rowLabel}>{label}</p>
        {sub && <p style={s.rowSub}>{sub}</p>}
      </div>
      {right ?? (onPress && <span style={s.rowChevron}>›</span>)}
    </div>
  )
}

function Switch({ value, onChange, disabled }) {
  return (
    <button
      role="switch" aria-checked={value} disabled={disabled}
      onClick={e => { e.stopPropagation(); onChange() }}
      style={{ ...s.switch, background: value ? 'var(--bento-ink)' : 'var(--bento-toggle-off)', justifyContent: value ? 'flex-end' : 'flex-start', opacity: disabled ? 0.5 : 1 }}
    >
      <span style={{ ...s.switchThumb, background: value ? 'var(--bento-accent)' : '#fff' }} />
    </button>
  )
}

function EditField({ label, value, onChange, type = 'text' }) {
  return (
    <label style={s.fieldWrap}>
      <span style={s.fieldLabel}>{label}</span>
      <input style={s.fieldInput} type={type} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

// Mesmo seletor de hora "de rolo" que já existia — só restilizado.
const WHEEL_ITEM_HEIGHT = 34
const WHEEL_VISIBLE_ITEMS = 3
function WheelPicker({ values, value, onChange, formatValue, disabled }) {
  const containerRef = useRef(null)
  const settleTimer = useRef(null)
  const padding = WHEEL_ITEM_HEIGHT * Math.floor(WHEEL_VISIBLE_ITEMS / 2)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const idx = values.indexOf(value)
    if (idx === -1) return
    const target = idx * WHEEL_ITEM_HEIGHT
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target
  }, [value, values])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT)))
      el.scrollTo({ top: idx * WHEEL_ITEM_HEIGHT, behavior: 'smooth' })
      if (values[idx] !== value) onChange(values[idx])
    }, 120)
  }

  return (
    <div ref={containerRef} onScroll={disabled ? undefined : handleScroll} style={{ height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS, width: 56, overflowY: disabled ? 'hidden' : 'auto', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ height: padding }} />
      {values.map(v => (
        <div key={v} style={{ height: WHEEL_ITEM_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center', fontFamily: FONT, fontSize: v === value ? 17 : 13, fontWeight: v === value ? 800 : 500, color: v === value ? 'var(--bento-ink)' : 'var(--bento-t4)' }}>
          {formatValue ? formatValue(v) : v}
        </div>
      ))}
      <div style={{ height: padding }} />
    </div>
  )
}

// Confirmação de exclusão — mesmo conteúdo/lógica de sempre, restilizado.
function DeleteAccountDialog({ lang, email, hasStoreSubscription, onCancel, onDeleted }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const matches = typed.trim().toLowerCase() === (email ?? '').toLowerCase()
  const L = (k, vars) => t(`profile.${k}`, vars, lang)

  async function confirm() {
    setBusy(true); setError('')
    try {
      await deleteMyAccount(typed.trim())
      onDeleted?.()
    } catch (err) {
      console.error('Falha ao excluir conta', err)
      setError(L('deleteAccountError'))
      setBusy(false)
    }
  }

  return createPortal(
    <div style={s.deleteBackdrop} role="dialog" aria-modal="true">
      <div style={s.deleteCard}>
        <p style={s.deleteTitle}>{L('deleteAccountTitle')}</p>
        <p style={s.deleteBody}>{L('deleteAccountBody')}</p>
        <ul style={s.deleteList}>
          <li>{L('deleteAccountItemErased')}</li>
          <li>{L('deleteAccountItemAnonymized')}</li>
          <li>{L('deleteAccountItemIrreversible')}</li>
        </ul>
        {hasStoreSubscription && <p style={s.deleteWarn}>{L('deleteAccountStoreWarning')}</p>}
        <label style={s.deleteLabel}>{L('deleteAccountConfirmLabel', { email })}</label>
        <input type="email" value={typed} onChange={e => setTyped(e.target.value)} style={s.deleteInput} autoComplete="off" placeholder={email} />
        {error && <p style={s.errorText}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" style={s.secondarySmallBtn} onClick={onCancel} disabled={busy}>{L('deleteAccountCancel')}</button>
          <button type="button" style={{ ...s.primarySmallBtn, background: 'var(--re)', opacity: matches && !busy ? 1 : 0.45 }} onClick={confirm} disabled={!matches || busy}>
            {busy ? L('deleteAccountDeleting') : L('deleteAccountConfirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const s = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  // Some acima da barra de abas (a barra continua visível/tocável — quadro
  // 19a: "a barra continua com cinco abas").
  // bottom vem da classe .profile-sheet-panel (index.css) — responsivo,
  // ver comentário lá.
  sheet: {
    width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)',
    borderRadius: '32px 32px 0 0', height: 'calc(100% - 96px)', boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', position: 'absolute',
    animation: 'bookOpenIn .26s cubic-bezier(.32,.72,0,1)',
  },
  handleWrap: { display: 'flex', justifyContent: 'center', padding: '12px 0 10px', cursor: 'pointer', flexShrink: 0 },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 },

  userCard: { borderRadius: 28, background: 'var(--bento-ink)', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 },
  avatarTile: { width: 60, height: 60, borderRadius: 20, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitials: { fontFamily: FONT, fontSize: 21, fontWeight: 800, letterSpacing: '-.8px', color: 'var(--bento-ink)' },
  userName: { fontFamily: FONT, fontSize: 21, fontWeight: 800, letterSpacing: '-.8px', color: '#fff', margin: '0 0 4px' },
  userEmail: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },
  adminBadge: { display: 'inline-flex', alignItems: 'center', height: 24, borderRadius: 99, background: 'rgba(240,102,43,.18)', padding: '0 9px', fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--bento-accent)' },
  groupBadge: { display: 'inline-flex', alignItems: 'center', height: 24, borderRadius: 99, background: 'rgba(255,255,255,.08)', padding: '0 9px', fontFamily: FONT, fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.75)' },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '0 20px' },
  row: { display: 'flex', alignItems: 'center', gap: 14, minHeight: 52, padding: '10px 0' },
  rowLabel: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: 0 },
  rowSub: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t3)', margin: '2px 0 0' },
  rowChevron: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },
  rowIconTile: { width: 32, height: 32, borderRadius: 10, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  switch: { flexShrink: 0, width: 46, height: 28, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'background .15s' },
  switchThumb: { width: 22, height: 22, borderRadius: 99 },

  expandPanel: { padding: '4px 0 16px', borderBottom: '1px solid var(--bento-line)', display: 'flex', flexDirection: 'column', gap: 10 },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  fieldInput: { width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)' },
  bioInput: { width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)', resize: 'none' },
  bioCounter: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t4)', textAlign: 'right' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bento-line)', borderRadius: 14, padding: '12px 14px' },
  toggleLabel: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', margin: 0 },
  toggleSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0', lineHeight: 1.4 },
  primarySmallBtn: { flex: 1, border: 'none', borderRadius: 12, padding: '11px 12px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', background: 'var(--bento-accent)', cursor: 'pointer' },
  secondarySmallBtn: { flex: 1, border: 'none', borderRadius: 12, padding: '11px 12px', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-t3)', background: 'var(--bento-line)', cursor: 'pointer' },
  errorText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--re)', margin: 0 },
  wheelHighlight: { position: 'absolute', top: WHEEL_ITEM_HEIGHT, left: '50%', transform: 'translateX(-50%)', width: 130, height: WHEEL_ITEM_HEIGHT, background: 'var(--bento-line)', borderRadius: 8, pointerEvents: 'none' },
  chip: { textAlign: 'center', padding: '9px 8px', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', borderRadius: 10, border: 'none', background: 'var(--bento-line)' },
  chipActive: { color: '#fff', background: 'var(--bento-ink)' },

  moreToggle: { alignSelf: 'center', border: 'none', background: 'none', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)' },

  hintText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', margin: 0 },
  aboutCard: { borderRadius: 20, background: 'var(--bento-line)', padding: 18 },
  aboutTitle: { fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 8px' },
  aboutVerse: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, fontStyle: 'italic', color: 'var(--bento-t2)', lineHeight: 1.5, margin: '0 0 4px' },
  aboutVerseRef: { fontFamily: FONT, fontSize: 10.5, fontWeight: 700, color: 'var(--bento-accent)', margin: '0 0 9px' },
  aboutBody: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.55, margin: 0 },
  legalRow: { textAlign: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-t3)' },
  legalLink: { textDecoration: 'underline', cursor: 'pointer' },
  versionText: { textAlign: 'center', fontFamily: FONT, fontSize: 10, fontWeight: 500, color: 'var(--bento-t4)', marginBottom: 10 },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  footerBtn: { flex: 1, height: 48, borderRadius: 16, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

  deleteBackdrop: { position: 'fixed', inset: 0, background: 'rgba(26,23,20,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 },
  deleteCard: { background: 'var(--bento-bg)', borderRadius: 24, padding: 22, width: '100%', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto', fontFamily: FONT },
  deleteTitle: { fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 8 },
  deleteBody: { fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.5 },
  deleteList: { margin: '10px 0 4px 16px', display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.45 },
  deleteWarn: { fontSize: 11.5, fontWeight: 600, color: 'var(--bento-sand-ink)', background: 'var(--bento-sand)', borderRadius: 12, padding: '10px 12px', marginTop: 10, lineHeight: 1.45 },
  deleteLabel: { display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)', marginTop: 14, marginBottom: 5 },
  deleteInput: { width: '100%', border: 'none', background: 'var(--bento-line)', borderRadius: 12, padding: '11px 14px', fontSize: 13, fontFamily: FONT, color: 'var(--bento-ink)' },
}
