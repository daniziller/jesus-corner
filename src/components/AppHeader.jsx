export default function AppHeader({ avatarInitials, onNavigate }) {
  return (
    <div className="app-header" style={styles.header}>
      <div style={styles.brand} onClick={() => onNavigate?.('home')}>
        <img src="/icons/icon-192.png" alt="" style={styles.logo} />
        <span style={styles.brandName}>JESUS' <span style={{ color: 'var(--or)' }}>CORNER</span></span>
      </div>
      <div style={styles.avatarRing} onClick={() => onNavigate?.('profile')}>
        <div style={styles.avatar}>{avatarInitials}</div>
      </div>
    </div>
  )
}

const styles = {
  header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', flexShrink: 0, background: 'var(--white)', borderBottom: '0.5px solid var(--g1)' },
  brand:      { display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' },
  logo:       { width: 32, height: 32, borderRadius: 8, flexShrink: 0 },
  brandName:  { fontSize: 14, fontWeight: 900, color: 'var(--bk)', letterSpacing: 0.5 },
  avatarRing: { width: 32, height: 32, borderRadius: '50%', padding: 2, background: 'var(--grad-vivid)', cursor: 'pointer', flexShrink: 0 },
  avatar:     { width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white' },
}
