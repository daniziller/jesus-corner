// Um item do feed de atividade dos amigos — reaproveitado tanto no bloco
// compacto da Home quanto na lista completa da aba Comunidade (ver
// HomeScreen.jsx / GroupsScreen.jsx). Só sabe renderizar; quem busca os
// dados é cada tela (getFriendsActivity, em src/activity/activityStore.js).
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { bookNameFor } from '../utils/progress'
import { formatRelativeTime } from '../utils/time'
import { LEVELS } from '../utils/levels'

const TYPE_ICON = { book_completed: 'BookMarked', level_up: 'Award', joined_group: 'Users' }
const TYPE_THEME = {
  book_completed: { bg: 'linear-gradient(135deg,#FFF3E8,#FFDDB8)', color: '#EA580C' },
  level_up:       { bg: 'linear-gradient(135deg,#F3E8FF,#E1CBFF)', color: '#9333EA' },
  joined_group:   { bg: 'linear-gradient(135deg,#E4FBEC,#C7F5D6)', color: '#16A34A' },
}

function activityText(activity, lang) {
  const name = activity.authorName
  if (activity.type === 'book_completed') {
    const book = bookNameFor(activity.payload.book, lang)
    return t('activity.bookCompleted', { name, book }, lang)
  }
  if (activity.type === 'level_up') {
    const levelDef = LEVELS.find(l => l.level === activity.payload.level)
    const title = levelDef ? (levelDef.title[lang] ?? levelDef.title.pt) : ''
    return t('activity.levelUp', { name, level: activity.payload.level, title }, lang)
  }
  if (activity.type === 'joined_group') {
    return t('activity.joinedGroup', { name, groupName: activity.payload.groupName ?? '' }, lang)
  }
  return ''
}

export default function ActivityFeedItem({ activity, lang }) {
  const theme = TYPE_THEME[activity.type] ?? TYPE_THEME.book_completed
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name={TYPE_ICON[activity.type] ?? 'Sparkles'} size={14} color={theme.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.4 }}>{activityText(activity, lang)}</p>
        <p style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--g4)', marginTop: 1 }}>{formatRelativeTime(activity.createdAt, lang)}</p>
      </div>
    </div>
  )
}
