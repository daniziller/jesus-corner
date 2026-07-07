import { useState } from 'react'
import { t, LANGUAGES } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function ProfileScreen({ session, authUser, onNavigate, onLogout, onResetProgress, onChangeLanguage }) {
  const [notifications, setNotifications] = useState(true)
  const [langPickerOpen, setLangPickerOpen] = useState(false)

  function handleResetClick() {
    if (window.confirm(t('profile.resetConfirm'))) {
      onResetProgress?.()
    }
  }

  const currentLang = LANGUAGES.find(l => l.id === (authUser.language ?? 'pt')) ?? LANGUAGES[0]

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header"><h1 className="page-title">{t('profile.pageTitle')}</h1></div>

      <div style={{ padding: '8px 14px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>

        <div className="dashboard-grid">
          {/* Card do usuário */}
          <div className="dashboard-col" style={{ background: 'white', border: '0.5px solid var(--g1)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', padding: 3, background: 'var(--grad-vivid)', boxShadow: 'var(--shadow-glow)' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'var(--or)', letterSpacing: '-0.5px' }}>
                {session.avatarInitials}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' }}>{authUser.name}</p>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--g4)' }}>{authUser.email}</p>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              <StatItem value={session.streak}       label={t('profile.sequenceLabel')} />
              <StatItem value={`${session.biblePercent}%`} label={t('profile.bibleLabel')} />
              <StatItem value={<><AppIcon name={session.level.icon} size={14} style={{ verticalAlign: 'middle', marginRight: 3 }} />{session.level.level}</>} label={session.level.title} />
            </div>
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
            icon="Shield" iconBg="#EFF6FF"
            label={t('profile.privacyLabel')} sub={t('profile.privacySub')}
            onPress={() => window.open('https://jesuscorner.app/privacidade', '_blank', 'noopener,noreferrer')}
          />
          <SettingsLink
            icon="ClipboardList" iconBg="#EFF6FF"
            label={t('profile.termsLabel')} sub={t('profile.termsSub')}
            onPress={() => window.open('https://jesuscorner.app/termos', '_blank', 'noopener,noreferrer')}
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
  plannerSub:   { fontSize: 10, fontWeight: 500, color: 'var(--g6)', marginTop: 2 },
  langBtn:      { flex: 1, textAlign: 'center', padding: '9px 8px', fontSize: 12, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 10, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  langBtnActive:{ color: 'white', background: 'var(--grad-primary)', borderColor: 'transparent', boxShadow: 'var(--shadow-glow)' },
  aboutNameCard:    { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 16, padding: 15 },
  aboutNameTitle:   { fontSize: 12, fontWeight: 800, color: 'var(--bk)', marginBottom: 8 },
  aboutNameVerse:   { fontSize: 12, fontWeight: 500, fontStyle: 'italic', color: 'var(--g6)', lineHeight: 1.5, marginBottom: 3 },
  aboutNameVerseRef:{ fontSize: 10, fontWeight: 700, color: 'var(--or)', marginBottom: 9 },
  aboutNameBody:    { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.55 },
}
