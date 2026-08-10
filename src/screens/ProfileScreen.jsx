import { useState, useEffect } from 'react'
import { t, LANGUAGES } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getMyProfile, updateProfile } from '../profile/profileStore'
import { getFriendsCount } from '../friends/friendsStore'
import { termsUrl, privacyUrl } from '../utils/legalLinks'
import { getManageSubscriptionUrl } from '../billing/subscriptionStore'
import { formatAmount } from '../billing/formatAmount'
import { exportMyData, deleteMyAccount } from '../privacy/privacyStore'
import { calculateAge, ageToApproxBirthdate } from '../utils/age'
import {
  isSubscribedToPush, subscribeToPush, unsubscribeFromPush, getMyReminderSchedule,
  DEFAULT_REMINDER_HOUR, DEFAULT_REMINDER_DAYS,
} from '../notifications/pushStore'

const MAX_BIO_LENGTH = 280
const REMINDER_DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ProfileScreen({ session, authUser, subscription, isAdmin, onNavigate, onLogout, onResetProgress, onChangeLanguage, onChangeReadingOrder, onProfileUpdated }) {
  const [notifications, setNotifications] = useState(false)
  const [remindersBusy, setRemindersBusy] = useState(false)
  const [remindersError, setRemindersError] = useState('')
  const [remindersConfigOpen, setRemindersConfigOpen] = useState(false)
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR)
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS)
  const [langPickerOpen, setLangPickerOpen] = useState(false)
  const [readingOrderPickerOpen, setReadingOrderPickerOpen] = useState(false)

  const [profile, setProfile] = useState(null) // { bio, avatarUrl, isPublic }
  const [friendsCount, setFriendsCount] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Direitos do titular (LGPD art. 18) — ver src/privacy/privacyStore.js
  const [exportState, setExportState] = useState('idle')
  const [deleteOpen, setDeleteOpen] = useState(false)

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

  useEffect(() => {
    getMyProfile().then(setProfile).catch(err => console.error('Failed to load profile', err))
    getFriendsCount().then(setFriendsCount).catch(err => console.error('Failed to load friends count', err))
    isSubscribedToPush().then(subscribed => {
      setNotifications(subscribed)
      if (!subscribed) return
      getMyReminderSchedule().then(schedule => {
        if (!schedule) return
        setReminderHour(schedule.hour)
        setReminderDays(schedule.days)
      })
    }).catch(() => {})
  }, [])

  // Liga/desliga o lembrete de leitura de verdade (push, ver
  // src/notifications/pushStore.js) — não é só um estado local: pede
  // permissão do navegador e inscreve/desinscreve esse dispositivo.
  async function handleToggleReminders() {
    if (remindersBusy) return
    const next = !notifications
    setRemindersBusy(true)
    setRemindersError('')
    try {
      if (next) await subscribeToPush({ hour: reminderHour, days: reminderDays })
      else await unsubscribeFromPush()
      setNotifications(next)
    } catch (err) {
      setRemindersError(err.message)
    } finally {
      setRemindersBusy(false)
    }
  }

  // Muda horário/dias já com o lembrete ativo — regrava a mesma inscrição
  // (subscribeToPush faz upsert pelo endpoint, não pede permissão de novo
  // nem cria uma inscrição nova já que uma existe).
  async function handleScheduleChange(nextHour, nextDays) {
    setReminderHour(nextHour)
    setReminderDays(nextDays)
    if (!notifications || remindersBusy) return
    setRemindersBusy(true)
    setRemindersError('')
    try {
      await subscribeToPush({ hour: nextHour, days: nextDays })
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
    if (nextDays.length === 0) return // sempre pelo menos 1 dia selecionado
    handleScheduleChange(reminderHour, nextDays)
  }

  function reminderDaysLabel() {
    const isWeekdays = reminderDays.length === 5 && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every(d => reminderDays.includes(d))
    if (reminderDays.length === 7) return t('profile.reminderEveryDay')
    if (isWeekdays) return t('profile.reminderWeekdays')
    return REMINDER_DAY_KEYS.filter(d => reminderDays.includes(d)).map(d => t(`profile.reminderDay${d}`)).join(', ')
  }

  function reminderHourLabel() {
    if (session.lang === 'en') {
      const period = reminderHour < 12 ? 'AM' : 'PM'
      const h12 = reminderHour % 12 === 0 ? 12 : reminderHour % 12
      return `${h12}:00 ${period}`
    }
    return `${String(reminderHour).padStart(2, '0')}:00`
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
    if (!editName.trim()) { setSaveError(t('profile.nameRequiredError')); return }
    const ageNum = Number(editAge)
    if (!editAge || !Number.isFinite(ageNum) || ageNum <= 0 || ageNum > 120) {
      setSaveError(t('profile.ageInvalidError'))
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const avatarUrl = profile?.avatarUrl ?? null
      // O Perfil só pede idade — convertemos pra uma data sintética antes de
      // guardar (ver ageToApproxBirthdate em src/utils/age.js).
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
    if (window.confirm(t('profile.resetConfirm'))) {
      onResetProgress?.()
    }
  }

  async function handleSubscriptionClick() {
    if (subscription?.access_type !== 'recurring') {
      onNavigate('upgrade')
      return
    }
    try {
      const url = await getManageSubscriptionUrl(subscription)
      window.location.href = url
    } catch {
      // Sem portal pra abrir (ex: customer do Stripe não existe mais nesse
      // modo — ver api/create-portal-session.js) não é um beco sem saída:
      // manda pra tela de assinatura, onde dá pra escolher o valor de novo.
      onNavigate('upgrade')
    }
  }

  function subscriptionSub() {
    if (subscription?.access_type === 'free') return t('billing.subscriptionFreeSub', undefined, session.lang)
    if (subscription?.access_type === 'lifetime') return t('billing.subscriptionLifetimeSub', undefined, session.lang)
    if (subscription?.access_type === 'recurring' && subscription.amount_cents != null && subscription.currency) {
      const key = subscription.plan === 'annual' ? 'billing.subscriptionRecurringAnnualSub' : 'billing.subscriptionRecurringSub'
      return t(key, { amount: formatAmount(subscription.amount_cents, subscription.currency) }, session.lang)
    }
    return t('billing.subscriptionActiveSub', undefined, session.lang)
  }

  const currentLang = LANGUAGES.find(l => l.id === (authUser.language ?? 'pt')) ?? LANGUAGES[0]
  const displayAvatarUrl = profile?.avatarUrl

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>

      <div style={{ padding: '20px 14px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>

        {/* Título — só no desktop (≥1024px). Perfil não tem frame próprio
            no Figma (só mobile), então isso segue o padrão confirmado nas
            outras telas (Rotina/Início/Progresso/Estudos/Comunidade/Admin)
            em vez de uma referência direta. */}
        <div className="page-header hide-on-mobile" style={{ padding: 0, marginBottom: -4 }}>
          <h1 className="page-title">{t('profile.pageTitle')}</h1>
        </div>

        <div className="dashboard-grid">
          {/* Card do usuário */}
          <div className="dashboard-col" style={{ background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-card)', position: 'relative' }}>
            {!editMode && (
              <button style={styles.editBtn} onClick={startEdit} aria-label={t('profile.editProfile')}>
                <AppIcon name="PenLine" size={14} color="var(--g5)" />
              </button>
            )}

            <div style={{ position: 'relative' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', padding: 3, background: 'var(--grad-vivid)', boxShadow: 'var(--shadow-glow)' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--or)', letterSpacing: '-0.5px', overflow: 'hidden' }}>
                  {displayAvatarUrl ? <img src={displayAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : session.avatarInitials}
                </div>
              </div>
            </div>

            {editMode ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <EditField label={t('profile.nameLabel')} value={editName} onChange={setEditName} />
                <EditField label={t('profile.ageLabel')} type="number" value={editAge} onChange={setEditAge} />
                <label style={styles.editFieldWrap}>
                  <span style={styles.editFieldLabel}>{t('profile.bioLabel')}</span>
                  <textarea
                    style={styles.bioInput}
                    value={editBio}
                    onChange={e => setEditBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
                    placeholder={t('profile.bioPlaceholder')}
                    rows={3}
                  />
                  <span style={styles.bioCounter}>{editBio.length}/{MAX_BIO_LENGTH}</span>
                </label>
                <div style={styles.publicToggleRow}>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={styles.publicToggleLabel}>{t('profile.publicProfileLabel')}</p>
                    <p style={styles.publicToggleSub}>{t('profile.publicProfileSub')}</p>
                  </div>
                  <div className={`toggle ${editIsPublic ? '' : 'off'}`} onClick={() => setEditIsPublic(v => !v)} role="switch" aria-checked={editIsPublic}>
                    <div className="toggle-thumb" />
                  </div>
                </div>

                {saveError && <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' }}>{saveError}</p>}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ width: 'auto', flex: 1, padding: '10px 16px' }} onClick={saveEdit} disabled={saving}>
                    {saving ? t('profile.saving') : t('profile.save')}
                  </button>
                  <button className="btn-secondary" style={{ width: 'auto', flex: 1 }} onClick={cancelEdit} disabled={saving}>{t('profile.cancel')}</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' }}>{authUser.name}</p>
                  <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--g4)' }}>{authUser.email}</p>
                  {profile?.bio && <p style={styles.bioDisplay}>{profile.bio}</p>}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  <StatItem value={session.streak}       label={t('profile.sequenceLabel')} />
                  <StatItem value={`${session.biblePercent}%`} label={t('profile.bibleLabel')} />
                  <StatItem value={<><AppIcon name={session.level.icon} size={14} style={{ verticalAlign: 'middle', marginRight: 3 }} />{session.level.level}</>} label={session.level.title} />
                  <StatItem value={friendsCount} label={t('profile.friendsLabel')} />
                </div>
              </>
            )}
          </div>

          {/* Reconfigurar planejador */}
          <button
            style={{ ...styles.plannerCard, flex: 1, alignSelf: 'stretch' }}
            onClick={() => alert(t('profile.plannerComingSoon'))}
          >
            <p style={styles.plannerLabel}>{t('profile.currentPlanLabel', { plan: session.plan.label.toUpperCase(), n: session.plan.avgChapters })}</p>
            <p style={styles.plannerTitle}>{t('profile.reconfigurePlanner')}</p>
            <p style={styles.plannerSub}>{t('profile.plannerAutoRecalc')}</p>
          </button>
        </div>

        {/* Configurações */}
        <div style={{ background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 21, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>

          <SettingsLink
            icon="Crown" iconBg="var(--olt)"
            label={t('billing.mySubscriptionLabel', undefined, session.lang)}
            sub={subscriptionSub()}
            onPress={handleSubscriptionClick}
          />
          <SettingsToggle
            icon="Bell" iconBg="var(--olt)"
            label={t('profile.remindersLabel')} sub={`${reminderHourLabel()} · ${reminderDaysLabel()}`}
            value={notifications} onChange={handleToggleReminders} disabled={remindersBusy}
            onLabelClick={() => setRemindersConfigOpen(v => !v)}
          />
          {remindersConfigOpen && (
            <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '0.5px solid var(--g1)' }}>
              <label style={styles.editFieldWrap}>
                <span style={styles.editFieldLabel}>{t('profile.reminderHourLabel')}</span>
                <select
                  style={styles.editInput}
                  value={reminderHour}
                  disabled={remindersBusy}
                  onChange={e => handleScheduleChange(Number(e.target.value), reminderDays)}
                >
                  {Array.from({ length: 24 }, (_, h) => h).map(h => (
                    <option key={h} value={h}>{session.lang === 'en' ? `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}` : `${String(h).padStart(2, '0')}:00`}</option>
                  ))}
                </select>
              </label>
              <div>
                <span style={styles.editFieldLabel}>{t('profile.reminderDaysLabel')}</span>
                <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                  {REMINDER_DAY_KEYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      disabled={remindersBusy}
                      onClick={() => toggleReminderDay(day)}
                      style={{ ...styles.langBtn, flex: 1, padding: '9px 4px', ...(reminderDays.includes(day) ? styles.langBtnActive : {}) }}
                    >
                      {t(`profile.reminderDay${day}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <SettingsLink
            icon="Globe" iconBg="#EFF6FF"
            label={t('profile.languageLabel')} sub={`${currentLang.flag} ${currentLang.label}`}
            onPress={() => setLangPickerOpen(v => !v)}
          />
          {langPickerOpen && (
            <div style={{ padding: '8px 14px 14px', display: 'flex', gap: 8, borderTop: '0.5px solid var(--g1)' }}>
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => { onChangeLanguage?.(l.id); setLangPickerOpen(false) }}
                  style={{ ...styles.langBtn, ...(currentLang.id === l.id ? styles.langBtnActive : {}) }}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          )}
          <SettingsLink
            icon="BookOpen" iconBg="var(--olt)"
            label={t('profile.readingPlanLabel')} sub={t('profile.readingPlanSub', { plan: session.plan.label, n: session.plan.avgChapters })}
            onPress={() => onNavigate('journey')}
          />
          <SettingsLink
            icon="ArrowUp" iconBg="var(--olt)"
            label={t('profile.readingOrderLabel')}
            sub={t(session.readingOrder === 'nt_first' ? 'profile.readingOrderSubNt' : 'profile.readingOrderSubOt')}
            onPress={() => setReadingOrderPickerOpen(v => !v)}
          />
          {readingOrderPickerOpen && (
            <div style={{ padding: '8px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '0.5px solid var(--g1)' }}>
              <button
                onClick={() => { onChangeReadingOrder?.('ot_first'); setReadingOrderPickerOpen(false) }}
                style={{ ...styles.langBtn, flex: 'unset', width: '100%', ...(session.readingOrder !== 'nt_first' ? styles.langBtnActive : {}) }}
              >
                {t('profile.readingOrderOtFirstBtn')}
              </button>
              <button
                onClick={() => { onChangeReadingOrder?.('nt_first'); setReadingOrderPickerOpen(false) }}
                style={{ ...styles.langBtn, flex: 'unset', width: '100%', ...(session.readingOrder === 'nt_first' ? styles.langBtnActive : {}) }}
              >
                {t('profile.readingOrderNtFirstBtn')}
              </button>
            </div>
          )}
          <SettingsLink
            icon="RefreshCw" iconBg="var(--olt)"
            label={t('profile.resetReadingLabel')} sub={t('profile.resetReadingSub', { block: session.firstBlockName })}
            onPress={handleResetClick}
          />
          <SettingsLink
            icon="Mail" iconBg="var(--olt)"
            label={t('profile.contactLabel')} sub={t('profile.contactSub')}
            onPress={() => onNavigate('contact')}
          />
          {isAdmin && (
            <SettingsLink
              icon="Wrench" iconBg="var(--olt)"
              label={t('profile.adminLabel')} sub={t('profile.adminSub')}
              onPress={() => onNavigate('admin')}
            />
          )}
          <SettingsLink
            icon="Instagram" iconBg="var(--olt)"
            label={t('profile.instagramLabel')} sub={t('profile.instagramSub')}
            onPress={() => window.open('https://www.instagram.com/jesuscorner.app/', '_blank', 'noopener,noreferrer')}
          />
          <SettingsLink
            icon="Download" iconBg="#EFF6FF"
            label={t('profile.exportDataLabel')} sub={t('profile.exportDataSub')}
            onPress={handleExport}
          />
          <SettingsLink
            icon="LogOut" iconBg="var(--rel)" iconColor="var(--re)"
            label={t('profile.logoutLabel')} sub={t('profile.logoutSub')}
            onPress={onLogout}
          />
          <SettingsLink
            icon="Trash2" iconBg="var(--rel)" iconColor="var(--re)"
            label={t('profile.deleteAccountLabel')} sub={t('profile.deleteAccountSub')}
            onPress={() => setDeleteOpen(true)}
          />

        </div>

        {exportState === 'loading' && <p style={styles.privacyHint}>{t('profile.exportDataLoading')}</p>}
        {exportState === 'error' && <p style={styles.privacyError}>{t('profile.exportDataError')}</p>}
        {remindersError && <p style={styles.privacyError}>{remindersError}</p>}

        {deleteOpen && (
          <DeleteAccountDialog
            email={authUser.email}
            hasStoreSubscription={subscription?.billing_provider === 'apple' || subscription?.billing_provider === 'google_play'}
            onCancel={() => setDeleteOpen(false)}
            onDeleted={onLogout}
          />
        )}

        {/* Sobre o nome */}
        <div style={styles.aboutNameCard}>
          <p style={styles.aboutNameTitle}>{t('profile.aboutNameTitle')}</p>
          <p style={styles.aboutNameVerse}>"{t('profile.aboutNameVerseText')}"</p>
          <p style={styles.aboutNameVerseRef}>{t('profile.aboutNameVerseRef')}</p>
          <p style={styles.aboutNameBody}>{t('profile.aboutNameBody')}</p>
        </div>

        {/* Links legais */}
        <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--g5)' }}>
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => window.open(privacyUrl(authUser.language ?? 'pt'), '_blank', 'noopener,noreferrer')}>
            {t('profile.privacyLabel')}
          </span>
          {'   ·   '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => window.open(termsUrl(authUser.language ?? 'pt'), '_blank', 'noopener,noreferrer')}>
            {t('profile.termsLabel')}
          </span>
        </p>

        {/* Versão */}
        <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 500, color: 'var(--g4)' }}>
          {t('profile.versionLabel')}
        </p>

      </div>
    </div>
  )
}

function EditField({ label, value, onChange, type = 'text', max }) {
  return (
    <label style={styles.editFieldWrap}>
      <span style={styles.editFieldLabel}>{label}</span>
      <input
        style={styles.editInput}
        type={type}
        value={value}
        max={max}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function StatItem({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.5px' }}>{value}</p>
      <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--g4)' }}>{label}</p>
    </div>
  )
}

function SettingsToggle({ icon, iconBg, iconColor = 'var(--or)', label, sub, value, onChange, disabled, onLabelClick }) {
  return (
    <div className="settings-item">
      <div className="settings-icon" style={{ background: iconBg }}><AppIcon name={icon} size={15} color={iconColor} /></div>
      <div
        className="settings-info"
        onClick={onLabelClick}
        style={onLabelClick ? { cursor: 'pointer' } : undefined}
      >
        <p className="settings-label">{label}</p>
        <p className="settings-sub">{sub}</p>
      </div>
      {onLabelClick && <span className="settings-arrow" onClick={onLabelClick} style={{ cursor: 'pointer' }}>›</span>}
      <div
        className={`toggle ${value ? '' : 'off'}`}
        style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
        onClick={() => !disabled && onChange()}
        role="switch"
        aria-checked={value}
      >
        <div className="toggle-thumb" />
      </div>
    </div>
  )
}

// Confirmação de exclusão. Pede o email digitado — o servidor recusa se não
// bater com o da sessão (ver api/delete-account.js). É irreversível e não
// tem "desfazer", então a fricção aqui é proposital.
function DeleteAccountDialog({ email, hasStoreSubscription, onCancel, onDeleted }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const matches = typed.trim().toLowerCase() === (email ?? '').toLowerCase()

  async function confirm() {
    setBusy(true); setError('')
    try {
      await deleteMyAccount(typed.trim())
      onDeleted?.()
    } catch (err) {
      console.error('Falha ao excluir conta', err)
      setError(t('profile.deleteAccountError'))
      setBusy(false)
    }
  }

  return (
    <div style={styles.deleteBackdrop} role="dialog" aria-modal="true">
      <div style={styles.deleteCard}>
        <p style={styles.deleteTitle}>{t('profile.deleteAccountTitle')}</p>
        <p style={styles.deleteBody}>{t('profile.deleteAccountBody')}</p>

        <ul style={styles.deleteList}>
          <li>{t('profile.deleteAccountItemErased')}</li>
          <li>{t('profile.deleteAccountItemAnonymized')}</li>
          <li>{t('profile.deleteAccountItemIrreversible')}</li>
        </ul>

        {hasStoreSubscription && (
          <p style={styles.deleteWarn}>{t('profile.deleteAccountStoreWarning')}</p>
        )}

        <label style={styles.deleteLabel}>{t('profile.deleteAccountConfirmLabel', { email })}</label>
        <input
          type="email" value={typed} onChange={e => setTyped(e.target.value)}
          style={styles.deleteInput} autoComplete="off" placeholder={email}
        />

        {error && <p style={styles.privacyError}>{error}</p>}

        <div style={styles.deleteActions}>
          <button type="button" style={styles.deleteCancel} onClick={onCancel} disabled={busy}>
            {t('profile.deleteAccountCancel')}
          </button>
          <button
            type="button" style={{ ...styles.deleteConfirm, opacity: matches && !busy ? 1 : 0.45 }}
            onClick={confirm} disabled={!matches || busy}
          >
            {busy ? t('profile.deleteAccountDeleting') : t('profile.deleteAccountConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingsLink({ icon, iconBg, iconColor = 'var(--or)', label, sub, onPress }) {
  return (
    <div className="settings-item" onClick={onPress} style={{ cursor: onPress ? 'pointer' : 'default' }}>
      <div className="settings-icon" style={{ background: iconBg }}><AppIcon name={icon} size={15} color={iconColor} /></div>
      <div className="settings-info">
        <p className="settings-label">{label}</p>
        <p className="settings-sub">{sub}</p>
      </div>
      <span className="settings-arrow">›</span>
    </div>
  )
}

const styles = {
  privacyHint:  { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', marginTop: 8 },
  privacyError: { fontSize: 11.5, fontWeight: 600, color: 'var(--re)', textAlign: 'center', marginTop: 8 },

  deleteBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 },
  deleteCard:   { background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto' },
  deleteTitle:  { fontSize: 16, fontWeight: 800, color: 'var(--bk)', marginBottom: 8 },
  deleteBody:   { fontSize: 12.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5 },
  deleteList:   { margin: '10px 0 4px 16px', display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.45 },
  deleteWarn:   { fontSize: 11.5, fontWeight: 600, color: 'var(--g6)', background: 'var(--olt)', border: '0.5px solid rgba(249,115,22,.3)', borderRadius: 10, padding: '9px 11px', marginTop: 10, lineHeight: 1.45 },
  deleteLabel:  { display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--g5)', marginTop: 14, marginBottom: 5 },
  deleteInput:  { width: '100%', border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--bk)' },
  deleteActions:{ display: 'flex', gap: 8, marginTop: 16 },
  deleteCancel: { flex: 1, border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 12, padding: '11px 12px', fontSize: 12.5, fontWeight: 700, color: 'var(--g6)', cursor: 'pointer', fontFamily: 'var(--font)' },
  deleteConfirm:{ flex: 1, border: 'none', background: 'var(--re)', borderRadius: 12, padding: '11px 12px', fontSize: 12.5, fontWeight: 700, color: 'var(--white)', cursor: 'pointer', fontFamily: 'var(--font)' },

  plannerCard:  { background: 'var(--card-highlight-bg)', border: 'var(--card-highlight-border)', borderRadius: 16, padding: 13, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font)' },
  plannerLabel: { fontSize: 10, fontWeight: 700, color: 'var(--or)', marginBottom: 3, letterSpacing: 0.4 },
  plannerTitle: { fontSize: 12, fontWeight: 700, color: 'var(--bk)' },
  plannerSub:   { fontSize: 11.5, fontWeight: 500, color: 'var(--g6)', marginTop: 2 },
  langBtn:      { flex: 1, textAlign: 'center', padding: '9px 8px', fontSize: 12, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 10, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  langBtnActive:{ color: 'white', background: 'var(--grad-primary)', borderColor: 'transparent', boxShadow: 'var(--shadow-glow)' },
  aboutNameCard:    { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 16, padding: 15 },
  aboutNameTitle:   { fontSize: 12, fontWeight: 800, color: 'var(--bk)', marginBottom: 8 },
  aboutNameVerse:   { fontSize: 12, fontWeight: 500, fontStyle: 'italic', color: 'var(--g6)', lineHeight: 1.5, marginBottom: 3 },
  aboutNameVerseRef:{ fontSize: 10, fontWeight: 700, color: 'var(--or)', marginBottom: 9 },
  aboutNameBody:    { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.55 },
  editBtn:          { position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: '50%', border: '0.5px solid var(--g2)', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  bioDisplay:       { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, marginTop: 6, maxWidth: 260 },
  editFieldWrap:    { display: 'flex', flexDirection: 'column', gap: 5 },
  editFieldLabel:   { fontSize: 10, fontWeight: 700, color: 'var(--g5)', letterSpacing: 0.3, textTransform: 'uppercase' },
  editInput:        { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'var(--g1)' },
  bioInput:         { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', outline: 'none', background: 'var(--g1)', resize: 'none' },
  bioCounter:       { fontSize: 9.5, fontWeight: 600, color: 'var(--g4)', textAlign: 'right' },
  publicToggleRow:  { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 12, padding: '10px 12px' },
  publicToggleLabel:{ fontSize: 11.5, fontWeight: 700, color: 'var(--bk)' },
  publicToggleSub:  { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', marginTop: 2, lineHeight: 1.4 },
}
