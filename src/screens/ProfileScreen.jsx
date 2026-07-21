import { useState, useEffect, useRef } from 'react'
import { t, LANGUAGES } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getMyProfile, updateProfile, uploadAvatar } from '../profile/profileStore'
import { getFriendsCount } from '../friends/friendsStore'
import { termsUrl, privacyUrl } from '../utils/legalLinks'

const MAX_BIO_LENGTH = 280

export default function ProfileScreen({ session, authUser, onNavigate, onLogout, onResetProgress, onChangeLanguage, onProfileUpdated }) {
  const [notifications, setNotifications] = useState(true)
  const [langPickerOpen, setLangPickerOpen] = useState(false)

  const [profile, setProfile] = useState(null) // { bio, avatarUrl, isPublic }
  const [friendsCount, setFriendsCount] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBirthdate, setEditBirthdate] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    getMyProfile().then(setProfile).catch(err => console.error('Failed to load profile', err))
    getFriendsCount().then(setFriendsCount).catch(err => console.error('Failed to load friends count', err))
  }, [])

  function startEdit() {
    setEditName(authUser.name)
    setEditBirthdate(authUser.birthdate ?? '')
    setEditBio(profile?.bio ?? '')
    setEditIsPublic(profile?.isPublic ?? false)
    setAvatarFile(null)
    setAvatarPreview(null)
    setSaveError('')
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
    setAvatarFile(null)
    setAvatarPreview(null)
    setSaveError('')
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function saveEdit() {
    if (!editName.trim()) { setSaveError(t('profile.nameRequiredError')); return }
    const birthDateObj = new Date(editBirthdate)
    if (!editBirthdate || Number.isNaN(birthDateObj.getTime()) || birthDateObj > new Date()) {
      setSaveError(t('profile.birthdateInvalidError'))
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      let avatarUrl = profile?.avatarUrl ?? null
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile)
      }
      await updateProfile({ name: editName, birthdate: editBirthdate, bio: editBio, isPublic: editIsPublic })
      setProfile({ bio: editBio.trim(), avatarUrl, isPublic: editIsPublic })
      onProfileUpdated?.({ name: editName.trim(), birthdate: editBirthdate, avatarUrl })
      setEditMode(false)
      setAvatarFile(null)
      setAvatarPreview(null)
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

  const currentLang = LANGUAGES.find(l => l.id === (authUser.language ?? 'pt')) ?? LANGUAGES[0]
  const displayAvatarUrl = editMode ? (avatarPreview ?? profile?.avatarUrl) : profile?.avatarUrl

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header"><h1 className="page-title">{t('profile.pageTitle')}</h1></div>

      <div style={{ padding: '8px 14px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>

        <div className="dashboard-grid">
          {/* Card do usuário */}
          <div className="dashboard-col" style={{ background: 'white', border: '0.5px solid var(--g1)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-card)', position: 'relative' }}>
            {!editMode && (
              <button style={styles.editBtn} onClick={startEdit} aria-label={t('profile.editProfile')}>
                <AppIcon name="PenLine" size={14} color="var(--g5)" />
              </button>
            )}

            <div style={{ position: 'relative' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', padding: 3, background: 'var(--grad-vivid)', boxShadow: 'var(--shadow-glow)' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'var(--or)', letterSpacing: '-0.5px', overflow: 'hidden' }}>
                  {displayAvatarUrl ? <img src={displayAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : session.avatarInitials}
                </div>
              </div>
              {editMode && (
                <button style={styles.avatarEditBtn} onClick={() => fileInputRef.current?.click()} aria-label={t('profile.changePhoto')}>
                  <AppIcon name="PenLine" size={12} color="white" />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </div>

            {editMode ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <EditField label={t('profile.nameLabel')} value={editName} onChange={setEditName} />
                <EditField label={t('profile.birthdateLabel')} type="date" value={editBirthdate} onChange={setEditBirthdate} max={new Date().toISOString().slice(0, 10)} />
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
                  <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' }}>{authUser.name}</p>
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
        <div style={{ background: 'white', border: '0.5px solid var(--g1)', borderRadius: 17, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>

          <SettingsToggle
            icon="Bell" iconBg="var(--olt)"
            label={t('profile.remindersLabel')} sub={t('profile.remindersSub')}
            value={notifications} onChange={setNotifications}
          />
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
            icon="RefreshCw" iconBg="var(--olt)"
            label={t('profile.resetReadingLabel')} sub={t('profile.resetReadingSub')}
            onPress={handleResetClick}
          />
          <SettingsLink
            icon="Mail" iconBg="var(--olt)"
            label={t('profile.contactLabel')} sub={t('profile.contactSub')}
            onPress={() => onNavigate('contact')}
          />
          <SettingsLink
            icon="Shield" iconBg="#EFF6FF"
            label={t('profile.privacyLabel')} sub={t('profile.privacySub')}
            onPress={() => window.open(privacyUrl(authUser.language ?? 'pt'), '_blank', 'noopener,noreferrer')}
          />
          <SettingsLink
            icon="ClipboardList" iconBg="#EFF6FF"
            label={t('profile.termsLabel')} sub={t('profile.termsSub')}
            onPress={() => window.open(termsUrl(authUser.language ?? 'pt'), '_blank', 'noopener,noreferrer')}
          />
          <SettingsLink
            icon="LogOut" iconBg="var(--rel)" iconColor="var(--re)"
            label={t('profile.logoutLabel')} sub={t('profile.logoutSub')}
            onPress={onLogout}
          />

        </div>

        {/* Sobre o nome */}
        <div style={styles.aboutNameCard}>
          <p style={styles.aboutNameTitle}>{t('profile.aboutNameTitle')}</p>
          <p style={styles.aboutNameVerse}>"{t('profile.aboutNameVerseText')}"</p>
          <p style={styles.aboutNameVerseRef}>{t('profile.aboutNameVerseRef')}</p>
          <p style={styles.aboutNameBody}>{t('profile.aboutNameBody')}</p>
        </div>

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
      <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--bk)', letterSpacing: '-0.5px' }}>{value}</p>
      <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--g4)' }}>{label}</p>
    </div>
  )
}

function SettingsToggle({ icon, iconBg, iconColor = 'var(--or)', label, sub, value, onChange }) {
  return (
    <div className="settings-item">
      <div className="settings-icon" style={{ background: iconBg }}><AppIcon name={icon} size={15} color={iconColor} /></div>
      <div className="settings-info">
        <p className="settings-label">{label}</p>
        <p className="settings-sub">{sub}</p>
      </div>
      <div
        className={`toggle ${value ? '' : 'off'}`}
        onClick={() => onChange(v => !v)}
        role="switch"
        aria-checked={value}
      >
        <div className="toggle-thumb" />
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
  plannerCard:  { background: 'linear-gradient(135deg,#FFF3E8,#FFE0BE)', border: '0.5px solid rgba(249,115,22,.25)', borderRadius: 16, padding: 13, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font)' },
  plannerLabel: { fontSize: 10, fontWeight: 700, color: '#EA580C', marginBottom: 3, letterSpacing: 0.4 },
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
  avatarEditBtn:    { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', border: '2px solid white', background: 'var(--or)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
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
