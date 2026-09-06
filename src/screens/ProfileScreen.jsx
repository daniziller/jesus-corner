import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { t, LANGUAGES } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getMyProfile, updateProfile } from '../profile/profileStore'
import { getFriendsCount } from '../friends/friendsStore'
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
// Múltiplos de 5 — o cron roda a cada 5 minutos (ver api/send-reading-reminders.js),
// minuto exato qualquer um exigiria rodar a cada minuto, sem ganho perceptível
// pra um lembrete de leitura.
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

// Versão desktop (≥768px, ver Sidebar.jsx) do perfil — sem quadro próprio
// no Figma (o handoff só desenhou a versão mobile, a folha de
// ProfileSheet.jsx, quadro 19a). Redesenhado em Bento seguindo exatamente
// a mesma linguagem visual/componentes de ProfileSheet (Row/Switch/cards)
// em vez de inventar um tratamento novo — só a moldura muda (página cheia
// com título, sem backdrop/puxador de folha) porque aqui há espaço de
// sobra pra mostrar tudo de uma vez, sem a gaveta "Mais opções" da folha.
export default function ProfileScreen({ session, authUser, subscription, isAdmin, onNavigate, onLogout, onResetProgress, onChangeLanguage, onChangeReadingOrder, onSelectPace, onProfileUpdated }) {
  const [notifications, setNotifications] = useState(false)
  const [remindersBusy, setRemindersBusy] = useState(false)
  const [remindersError, setRemindersError] = useState('')
  const [remindersConfigOpen, setRemindersConfigOpen] = useState(false)
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR)
  const [reminderMinute, setReminderMinute] = useState(DEFAULT_REMINDER_MINUTE)
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS)
  const [langPickerOpen, setLangPickerOpen] = useState(false)
  const [readingOrderPickerOpen, setReadingOrderPickerOpen] = useState(false)
  const [pacePickerOpen, setPacePickerOpen] = useState(false)
  // Card da frase de aplicação na Home (ver HomeScreen.jsx) — preferência
  // só de UI, por dispositivo (localStorage, não backend).
  const [showApplicationCard, setShowApplicationCardState] = useState(getShowApplicationCard)

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

  const lang = session.lang
  const L = (k, vars) => t(`profile.${k}`, vars, lang)

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
        setReminderMinute(schedule.minute)
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
      if (next) await subscribeToPush({ hour: reminderHour, minute: reminderMinute, days: reminderDays })
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
    if (nextDays.length === 0) return // sempre pelo menos 1 dia selecionado
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
    if (window.confirm(L('resetConfirm'))) {
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
    // Tier grátis — sem assinatura ativa.
    return t('billing.subscriptionUpgradeSub', undefined, lang)
  }

  const currentLang = LANGUAGES.find(l => l.id === (authUser.language ?? 'pt')) ?? LANGUAGES[0]
  const displayAvatarUrl = profile?.avatarUrl

  return (
    <div style={s.screen}>
      <div style={s.bHeader}>
        <p style={s.bTitle}>{L('pageTitle')}</p>
      </div>

      <div style={s.body}>

        {/* Bloco escuro — quem você é (mesmo tratamento de ProfileSheet). */}
        <div style={s.userCard}>
          {!editMode && (
            <button style={s.editBtn} onClick={startEdit} aria-label={L('editProfile')}>
              <AppIcon name="PenLine" size={14} color="#fff" />
            </button>
          )}
          <div style={s.avatarTile}>
            {displayAvatarUrl
              ? <img src={displayAvatarUrl} alt="" style={s.avatarImg} />
              : <span style={s.avatarInitials}>{session.avatarInitials}</span>}
          </div>

          {editMode ? (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          ) : (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.userName}>{authUser.name}</p>
              <p style={s.userEmail}>{authUser.email}</p>
              {profile?.bio && <p style={s.bioDisplay}>{profile.bio}</p>}
              <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
                <StatItem value={`${session.biblePercent}%`} label={L('bibleLabel')} />
                {session.hasPremium ? (
                  <>
                    <StatItem value={session.level.level} label={L('levelLabel')} />
                    <StatItem value={friendsCount} label={L('friendsLabel')} />
                  </>
                ) : (
                  <StatItem value={session.chaptersRead} label={t('home.chaptersLabel', undefined, lang)} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* "Minhas métricas" (30b, Bloco 7) — acima de conta/preferências
            (Configurações, logo abaixo), como pede o handoff. */}
        <div style={s.card}>
          <Row icon="BarChart3" label={t('profile.metricsLabel', undefined, lang)} sub={t('profile.metricsSub', undefined, lang)} onPress={() => onNavigate('metrics')} last />
        </div>

        {/* Configurações — mesmo padrão Row/Switch de ProfileSheet.jsx, sem
            a gaveta "Mais opções" (aqui há espaço de sobra pra mostrar
            tudo de uma vez). */}
        <div style={s.card}>
          <Row icon="Crown" label={t('billing.mySubscriptionLabel', undefined, lang)} sub={subscriptionSub()} onPress={handleSubscriptionClick} />
          <Row
            icon="Bell" label={L('remindersLabel')} sub={`${reminderHourLabel()} · ${reminderDaysLabel()}`}
            onPress={() => setRemindersConfigOpen(v => !v)}
            right={<Switch value={notifications} onChange={handleToggleReminders} disabled={remindersBusy} />}
            last={!remindersConfigOpen}
          />
          {remindersConfigOpen && (
            <div style={s.expandPanel}>
              <span style={s.lightFieldLabel}>{L('reminderHourLabel')}</span>
              <div style={{ position: 'relative', margin: '6px 0 14px' }}>
                <div style={s.wheelHighlight} />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <WheelPicker values={HOURS} value={reminderHour} disabled={remindersBusy} formatValue={h => String(h).padStart(2, '0')} onChange={h => handleScheduleChange(h, reminderMinute, reminderDays)} />
                  <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: 'var(--bento-ink)' }}>:</span>
                  <WheelPicker values={MINUTES} value={reminderMinute} disabled={remindersBusy} formatValue={m => String(m).padStart(2, '0')} onChange={m => handleScheduleChange(reminderHour, m, reminderDays)} />
                </div>
              </div>
              <span style={s.lightFieldLabel}>{L('reminderDaysLabel')}</span>
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

          <Row icon="Globe" label={L('languageLabel')} sub={`${currentLang.flag} ${currentLang.label}`} onPress={() => setLangPickerOpen(v => !v)} last={!langPickerOpen} />
          {langPickerOpen && (
            <div style={s.expandPanel}>
              <div style={{ display: 'flex', gap: 8 }}>
                {LANGUAGES.map(l => (
                  <button key={l.id} onClick={() => { onChangeLanguage?.(l.id); setLangPickerOpen(false) }} style={{ ...s.chip, flex: 1, ...(currentLang.id === l.id ? s.chipActive : {}) }}>
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {session.hasPremium && (
            <Row icon="StickyNote" label={t('nav.notes', undefined, lang)} sub={L('notesLinkSub')} onPress={() => onNavigate('notes')} />
          )}
          {session.hasPremium && (
            <Row icon="GraduationCap" label={t('nav.studies', undefined, lang)} sub={L('studiesLinkSub')} onPress={() => onNavigate('studies')} />
          )}
          {/* Ajustes do assistente de IA (10f) — só quem tem Premium + IA
              vê; sem isso não há nada pra ajustar. */}
          {session.hasAI && (
            <Row icon="Sparkles" label={L('aiSettingsLabel')} sub={L('aiSettingsSub')} onPress={() => onNavigate('aiSettings')} />
          )}
          {/* Grátis configura o ritmo aqui (não tem a aba "Meu Plano");
              assinante ajusta lá dentro, então aqui só abre a Bíblia. */}
          <Row
            icon="BookOpen" label={L('readingPlanLabel')}
            sub={L('readingPlanSub', { plan: lang === 'en' ? session.plan.labelEn : session.plan.label, n: session.plan.avgChapters })}
            onPress={() => session.hasPremium ? onNavigate('journey') : setPacePickerOpen(v => !v)}
            last={session.hasPremium || !pacePickerOpen}
          />
          {!session.hasPremium && pacePickerOpen && (
            <div style={s.expandPanel}>
              {PLANS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onSelectPace?.(p.id); setPacePickerOpen(false) }}
                  style={{ ...s.chip, width: '100%', textAlign: 'left', marginBottom: 6, ...(session.plan.id === p.id ? s.chipActive : {}) }}
                >
                  {(lang === 'en' ? p.labelEn : p.label)}
                  {p.avgChapters ? ` · ${L('readingPlanChapters', { n: p.avgChapters })}` : ''}
                </button>
              ))}
            </div>
          )}
          <Row
            icon="ArrowUp" label={L('readingOrderLabel')}
            sub={L(session.readingOrder === 'nt_first' ? 'readingOrderSubNt' : 'readingOrderSubOt')}
            onPress={() => setReadingOrderPickerOpen(v => !v)}
            last={!readingOrderPickerOpen}
          />
          {readingOrderPickerOpen && (
            <div style={s.expandPanel}>
              <button
                onClick={() => { onChangeReadingOrder?.('ot_first'); setReadingOrderPickerOpen(false) }}
                style={{ ...s.chip, width: '100%', marginBottom: 6, ...(session.readingOrder !== 'nt_first' ? s.chipActive : {}) }}
              >
                {L('readingOrderOtFirstBtn')}
              </button>
              <button
                onClick={() => { onChangeReadingOrder?.('nt_first'); setReadingOrderPickerOpen(false) }}
                style={{ ...s.chip, width: '100%', ...(session.readingOrder === 'nt_first' ? s.chipActive : {}) }}
              >
                {L('readingOrderNtFirstBtn')}
              </button>
            </div>
          )}
          <Row icon="RefreshCw" label={L('resetReadingLabel')} sub={L('resetReadingSub', { block: session.firstBlockName })} onPress={handleResetClick} />
          <Row icon="Sparkles" label={L('applicationPhrasesLabel')} sub={L('applicationPhrasesSub')} onPress={() => onNavigate('applicationPhrases')} />
          <Row
            icon="Sparkles" label={L('applicationCardLabel')} sub={L('applicationCardSub')}
            right={<Switch value={showApplicationCard} onChange={() => {
              const next = !showApplicationCard
              setShowApplicationCardState(next)
              setShowApplicationCard(next)
            }} />}
          />
          <Row icon="Mail" label={L('contactLabel')} sub={L('contactSub')} onPress={() => onNavigate('contact')} />
          {isAdmin && (
            <Row icon="Wrench" label={L('adminLabel')} sub={L('adminSub')} onPress={() => onNavigate('admin')} />
          )}
          <Row icon="Instagram" label={L('instagramLabel')} sub={L('instagramSub')} onPress={() => window.open('https://www.instagram.com/jesuscorner.app/', '_blank', 'noopener,noreferrer')} />
          <Row icon="Download" label={L('exportDataLabel')} sub={L('exportDataSub')} onPress={handleExport} />
          <Row icon="LogOut" label={L('logoutLabel')} sub={L('logoutSub')} onPress={onLogout} />
          <Row icon="Trash2" iconColor="var(--re)" label={L('deleteAccountLabel')} sub={L('deleteAccountSub')} onPress={() => setDeleteOpen(true)} last />
        </div>

        {exportState === 'loading' && <p style={s.hintText}>{L('exportDataLoading')}</p>}
        {exportState === 'error' && <p style={s.errorText}>{L('exportDataError')}</p>}
        {remindersError && <p style={s.errorText}>{remindersError}</p>}

        {deleteOpen && (
          <DeleteAccountDialog
            lang={lang}
            email={authUser.email}
            hasStoreSubscription={subscription?.billing_provider === 'apple' || subscription?.billing_provider === 'google_play'}
            onCancel={() => setDeleteOpen(false)}
            onDeleted={onLogout}
          />
        )}

        {/* Sobre o nome */}
        <div style={s.aboutCard}>
          <p style={s.aboutTitle}>{L('aboutNameTitle')}</p>
          <p style={s.aboutVerse}>"{L('aboutNameVerseText')}"</p>
          <p style={s.aboutVerseRef}>{L('aboutNameVerseRef')}</p>
          <p style={s.aboutBody}>{L('aboutNameBody')}</p>
        </div>

        {/* Links legais */}
        <p style={s.legalRow}>
          <span style={s.legalLink} onClick={() => window.open(privacyUrl(authUser.language ?? 'pt'), '_blank', 'noopener,noreferrer')}>
            {L('privacyLabel')}
          </span>
          {'   ·   '}
          <span style={s.legalLink} onClick={() => window.open(termsUrl(authUser.language ?? 'pt'), '_blank', 'noopener,noreferrer')}>
            {L('termsLabel')}
          </span>
        </p>

        {/* Versão */}
        <p style={s.versionText}>{L('versionLabel')}</p>

      </div>
    </div>
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

function StatItem({ value, label }) {
  return (
    <div>
      <p style={s.statValue}>{value}</p>
      <p style={s.statLabel}>{label}</p>
    </div>
  )
}

// Confirmação de exclusão. Pede o email digitado — o servidor recusa se não
// bater com o da sessão (ver api/delete-account.js). É irreversível e não
// tem "desfazer", então a fricção aqui é proposital. Mesmo conteúdo/lógica
// e estilo de ProfileSheet.jsx — restilizado igual, telas diferentes.
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

  // position:'fixed' aqui dentro quebrava (aparecia fora da tela) porque
  // .app-content-inner tem zoom:1.15 sempre ativo, o que cria um novo
  // "containing block" pra descendentes fixed em Chromium/WebKit — mesmo
  // bug já documentado e corrigido no FAB/overlay de chat da IA em
  // ReadingBlockView.jsx. createPortal escapa dessa árvore, direto pro body.
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

        {hasStoreSubscription && (
          <p style={s.deleteWarn}>{L('deleteAccountStoreWarning')}</p>
        )}

        <label style={s.deleteLabel}>{L('deleteAccountConfirmLabel', { email })}</label>
        <input
          type="email" value={typed} onChange={e => setTyped(e.target.value)}
          style={s.deleteInput} autoComplete="off" placeholder={email}
        />

        {error && <p style={s.errorText}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" style={s.lightSecondaryBtn} onClick={onCancel} disabled={busy}>
            {L('deleteAccountCancel')}
          </button>
          <button
            type="button" style={{ ...s.primarySmallBtn, background: 'var(--re)', opacity: matches && !busy ? 1 : 0.45 }}
            onClick={confirm} disabled={!matches || busy}
          >
            {busy ? L('deleteAccountDeleting') : L('deleteAccountConfirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Coluna que rola e "encaixa" (scroll-snap) num valor por vez — como os
// seletores de hora nativos de iOS/Android. Usada 2x lado a lado (hora e
// minuto) no seletor de horário do lembrete, acima. Mesmo componente de
// ProfileSheet.jsx, restilizado igual.
const WHEEL_ITEM_HEIGHT = 34
const WHEEL_VISIBLE_ITEMS = 3
function WheelPicker({ values, value, onChange, formatValue, disabled }) {
  const containerRef = useRef(null)
  const settleTimer = useRef(null)
  const padding = WHEEL_ITEM_HEIGHT * Math.floor(WHEEL_VISIBLE_ITEMS / 2)

  // Rola pro valor certo quando ele muda de fora (ex: carregado do servidor,
  // ou trocado pelo outro seletor) — sem behavior:smooth pra não animar toda
  // vez que a tela abre.
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
    // Espera a rolagem "assentar" antes de ler a posição — cada evento de
    // scroll durante o gesto ainda não é a parada final.
    settleTimer.current = setTimeout(() => {
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT)))
      el.scrollTo({ top: idx * WHEEL_ITEM_HEIGHT, behavior: 'smooth' })
      if (values[idx] !== value) onChange(values[idx])
    }, 120)
  }

  return (
    <div
      ref={containerRef}
      onScroll={disabled ? undefined : handleScroll}
      style={{
        height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS,
        width: 56,
        overflowY: disabled ? 'hidden' : 'auto',
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{ height: padding }} />
      {values.map(v => (
        <div
          key={v}
          style={{
            height: WHEEL_ITEM_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            scrollSnapAlign: 'center',
            fontFamily: FONT,
            fontSize: v === value ? 17 : 13,
            fontWeight: v === value ? 800 : 500,
            color: v === value ? 'var(--bento-ink)' : 'var(--bento-t4)',
          }}
        >
          {formatValue ? formatValue(v) : v}
        </div>
      ))}
      <div style={{ height: padding }} />
    </div>
  )
}

const s = {
  screen: { background: 'var(--bento-bg)', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  bHeader: { padding: '24px 24px 4px' },
  bTitle: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.7px', color: 'var(--bento-ink)', margin: 0 },
  body: { maxWidth: 560, margin: '0 auto', padding: '16px 24px 40px', display: 'flex', flexDirection: 'column', gap: 12 },

  userCard: { position: 'relative', borderRadius: 28, background: 'var(--bento-ink)', padding: 22, display: 'flex', gap: 18 },
  editBtn: { position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  avatarTile: { width: 64, height: 64, borderRadius: 20, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitials: { fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '-.8px', color: 'var(--bento-ink)' },
  userName: { fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.6px', color: '#fff', margin: '0 0 3px' },
  userEmail: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },
  bioDisplay: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.7)', lineHeight: 1.5, margin: '8px 0 0' },
  statValue: { fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.4px', color: '#fff', margin: 0 },
  statLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', margin: '2px 0 0' },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '0 20px' },
  row: { display: 'flex', alignItems: 'center', gap: 14, minHeight: 52, padding: '10px 0' },
  rowLabel: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: 0 },
  rowSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)', margin: '2px 0 0' },
  rowChevron: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },
  rowIconTile: { width: 32, height: 32, borderRadius: 10, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  switch: { flexShrink: 0, width: 46, height: 28, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'background .15s' },
  switchThumb: { width: 22, height: 22, borderRadius: 99 },

  expandPanel: { padding: '4px 0 16px', borderBottom: '1px solid var(--bento-line)', display: 'flex', flexDirection: 'column', gap: 10 },
  // fieldLabel (abaixo) é ajustado pro fundo escuro do cartão de usuário
  // (onde vive o formulário de editar nome/idade/bio) — dentro do
  // expandPanel dos lembretes, que fica sobre o cartão CLARO das
  // configurações, a mesma cor ficaria quase invisível, daí o par
  // lightFieldLabel/lightSecondaryBtn abaixo (cores originais de
  // ProfileSheet.jsx, pensadas pra fundo claro).
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)' },
  lightFieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  lightSecondaryBtn: { flex: 1, border: 'none', borderRadius: 12, padding: '11px 12px', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-t3)', background: 'var(--bento-line)', cursor: 'pointer' },
  fieldInput: { width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', outline: 'none', background: '#fff' },
  bioInput: { width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: '#fff', resize: 'none' },
  bioCounter: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,.5)', textAlign: 'right' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: '12px 14px' },
  toggleLabel: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: '#fff', margin: 0 },
  toggleSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.6)', margin: '2px 0 0', lineHeight: 1.4 },
  primarySmallBtn: { flex: 1, border: 'none', borderRadius: 12, padding: '11px 12px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', background: 'var(--bento-accent)', cursor: 'pointer' },
  secondarySmallBtn: { flex: 1, border: 'none', borderRadius: 12, padding: '11px 12px', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.12)', cursor: 'pointer' },
  errorText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--re)', margin: 0 },
  wheelHighlight: { position: 'absolute', top: WHEEL_ITEM_HEIGHT, left: '50%', transform: 'translateX(-50%)', width: 130, height: WHEEL_ITEM_HEIGHT, background: 'var(--bento-line)', borderRadius: 8, pointerEvents: 'none' },
  chip: { textAlign: 'center', padding: '9px 8px', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', borderRadius: 10, border: 'none', background: 'var(--bento-line)' },
  chipActive: { color: '#fff', background: 'var(--bento-ink)' },

  hintText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', margin: 0 },
  aboutCard: { borderRadius: 20, background: 'var(--bento-line)', padding: 18 },
  aboutTitle: { fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 8px' },
  aboutVerse: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, fontStyle: 'italic', color: 'var(--bento-t2)', lineHeight: 1.5, margin: '0 0 4px' },
  aboutVerseRef: { fontFamily: FONT, fontSize: 10.5, fontWeight: 700, color: 'var(--bento-accent)', margin: '0 0 9px' },
  aboutBody: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.55, margin: 0 },
  legalRow: { textAlign: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-t3)' },
  legalLink: { textDecoration: 'underline', cursor: 'pointer' },
  versionText: { textAlign: 'center', fontFamily: FONT, fontSize: 10, fontWeight: 500, color: 'var(--bento-t4)' },

  deleteBackdrop: { position: 'fixed', inset: 0, background: 'rgba(26,23,20,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 },
  deleteCard: { background: 'var(--bento-bg)', borderRadius: 24, padding: 22, width: '100%', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto', fontFamily: FONT },
  deleteTitle: { fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 8 },
  deleteBody: { fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.5 },
  deleteList: { margin: '10px 0 4px 16px', display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.45 },
  deleteWarn: { fontSize: 11.5, fontWeight: 600, color: 'var(--bento-sand-ink)', background: 'var(--bento-sand)', borderRadius: 12, padding: '10px 12px', marginTop: 10, lineHeight: 1.45 },
  deleteLabel: { display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)', marginTop: 14, marginBottom: 5 },
  deleteInput: { width: '100%', border: 'none', background: 'var(--bento-line)', borderRadius: 12, padding: '11px 14px', fontSize: 13, fontFamily: FONT, color: 'var(--bento-ink)' },
}
