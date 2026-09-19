// PrayerRequestsScreen.jsx — Pedidos de oração (quadro 36d, pacote
// 36-37, Bloco 2). Push dentro de Meu Plano (barra de abas fixa no
// rodapé — não entra em navHidden, ver App.jsx), alcançada a partir da
// linha "Pedidos de oração" de PrayerScreen.jsx (36b/36c).
//
// Etapa 2026-09-19 (pedido dela): os chips (Ativos/Respondidos/Do meu
// grupo) viraram 2 ABAS — "Meus pedidos" (Ativos + Respondidos, como já
// era) e "Pedidos dos grupos" (só os abertos de outras pessoas do seu
// grupo — nunca tem "Respondidos" aqui, a RPC só devolve os ABERTOS de
// quem não é você). Cada card agora abre o detalhe do pedido
// (PrayerRequestDetailScreen — comentários + "Orei por isso").
//
// "Novo" abre a mesma folha de compor pedido que já existe (25b,
// AddPrayerRequestSheet) — o quadro não desenha essa tela própria; reusar
// evita duplicar escolha de grupo/amigos/só-eu + "escrever com ajuda"
// (IA) que ela já tem.
import { useState, useEffect, useCallback } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import PrayerRequestCard from '../components/prayer/PrayerRequestCard'
import ArchivePrayerRequestSheet from '../components/prayer/ArchivePrayerRequestSheet'
import AddPrayerRequestSheet from '../components/prayer/AddPrayerRequestSheet'
import { getMyPrayerRequests, markPraying, archivePrayerRequest } from '../groups/prayerRequestsStore'

const TABS = ['mine', 'group']

export default function PrayerRequestsScreen({ session, authUser, onBack, onOpenRequest }) {
  const { lang } = session
  const L = (k, vars) => t(`prayerRequests.${k}`, vars, lang)

  const [requests, setRequests] = useState([])
  const [tab, setTab] = useState('mine')
  const [archiving, setArchiving] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const reload = useCallback(() => {
    setLoadError(false)
    getMyPrayerRequests().then(setRequests).catch(err => { console.error('Failed to load prayer requests', err); setLoadError(true) })
  }, [])

  useEffect(() => { reload() }, [reload])

  const activeRequests = requests.filter(r => r.status !== 'closed')
  const answeredRequests = requests.filter(r => r.status === 'closed')
  const myActive = activeRequests.filter(r => r.isMine)
  const groupActive = activeRequests.filter(r => !r.isMine)

  function handlePray(request) {
    setRequests(prev => prev.map(r => r.id === request.id
      ? { ...r, prayedToday: true, prayCount: r.isMine ? r.prayCount : r.prayCount + 1, diasOrados: r.isMine ? r.diasOrados + 1 : r.diasOrados }
      : r))
    markPraying(request.id).catch(err => console.error('Failed to mark praying', err))
  }

  async function handleArchive(request, response, note) {
    if (response === 'espere') { setArchiving(null); return }
    try {
      await archivePrayerRequest(request.id, response, note)
      setArchiving(null)
      reload()
    } catch (err) {
      console.error('Failed to archive prayer request', err)
    }
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.title}>{L('headerTitle')}</p>
          <p style={styles.subtitle}>
            {L(activeRequests.length === 1 ? 'headerActiveOne' : 'headerActiveMany', { n: activeRequests.length })}
            {' · '}
            {L(answeredRequests.length === 1 ? 'headerAnsweredOne' : 'headerAnsweredMany', { n: answeredRequests.length })}
          </p>
        </div>
        <button style={styles.newBtn} onClick={() => setAddOpen(true)}>
          <AppIcon name="Plus" size={14} strokeWidth={2.6} color="var(--bento-accent)" />
          <span>{L('newBtn')}</span>
        </button>
      </div>

      <div style={styles.body}>
        <div style={styles.fixedCard}>
          <p style={styles.fixedText}>{t('prayer.fixedVerse', undefined, lang)}</p>
        </div>

        <div style={styles.tabsRow}>
          {TABS.map(key => (
            <button
              key={key}
              type="button"
              style={{ ...styles.tab, ...(tab === key ? styles.tabOn : {}) }}
              onClick={() => setTab(key)}
            >
              {L(key === 'mine' ? 'tabMine' : 'tabGroup')}
            </button>
          ))}
        </div>

        {loadError ? (
          <p style={styles.emptyHint}>{L('loadError')}</p>
        ) : tab === 'mine' ? (
          <>
            {myActive.length === 0 ? (
              <p style={styles.emptyHint}>{L('emptyActive')}</p>
            ) : (
              <div style={styles.list}>
                {myActive.map(r => (
                  <PrayerRequestCard key={r.id} request={r} lang={lang} onPray={handlePray} onArchive={setArchiving} onOpen={onOpenRequest} />
                ))}
              </div>
            )}

            <p style={styles.sectionLabel}>{L('answeredSectionTitle')}</p>
            {answeredRequests.length === 0 ? (
              <p style={styles.emptyHint}>{L('emptyAnswered')}</p>
            ) : (
              <div style={styles.list}>
                {answeredRequests.map(r => (
                  <PrayerRequestCard key={r.id} request={r} lang={lang} onOpen={onOpenRequest} />
                ))}
              </div>
            )}
          </>
        ) : (
          groupActive.length === 0 ? (
            <p style={styles.emptyHint}>{L('emptyGroup')}</p>
          ) : (
            <div style={styles.list}>
              {groupActive.map(r => (
                <PrayerRequestCard key={r.id} request={r} lang={lang} onPray={handlePray} onOpen={onOpenRequest} />
              ))}
            </div>
          )
        )}
      </div>

      {archiving && (
        <ArchivePrayerRequestSheet request={archiving} lang={lang} onClose={() => setArchiving(null)} onArchive={handleArchive} />
      )}
      {addOpen && (
        <AddPrayerRequestSheet lang={lang} authUser={authUser} hasAI={session.hasAI} onClose={() => setAddOpen(false)} onCreated={reload} />
      )}
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.5px', margin: 0 },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0' },
  newBtn: { flexShrink: 0, height: 36, borderRadius: 14, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 12 },

  fixedCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '16px 18px', borderLeft: '3px solid var(--bento-sand-icon)' },
  fixedText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--bento-sand-ink-strong)', margin: 0 },

  tabsRow: { display: 'flex', gap: 8 },
  tab: { flex: 1, height: 40, borderRadius: 14, border: 'none', background: 'var(--bento-card)', cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-t2)' },
  tabOn: { background: 'var(--bento-ink)', color: '#fff' },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  emptyHint: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },
  sectionLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '4px 0 0' },
}
