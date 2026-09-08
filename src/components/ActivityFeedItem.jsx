// Um item do feed de atividade dos amigos — reaproveitado tanto no bloco
// compacto da Home quanto na lista completa da aba Comunidade (ver
// HomeScreen.jsx / GroupsScreen.jsx). Só sabe renderizar; quem busca os
// dados é cada tela (getFriendsActivity, em src/activity/activityStore.js).
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { bookNameFor } from '../utils/progress'
import { formatRelativeTime } from '../utils/time'
import { STAT_THEMES } from '../utils/statThemes'

// "level_up" existiu aqui (feed de amigos mostrando "fulano subiu de
// nível") — removido na varredura de identidade (handoff-app-completo,
// specs/LEGADO-fluxo-do-app.md §11: "cartões de nível/XP — apagados").
// Nada grava esse tipo de atividade desde então (confirmado: só
// 'book_completed' e 'joined_group' são logados, ver activityStore.js/
// App.jsx/GroupsScreen.jsx) — uma linha antiga com esse tipo, se ainda
// existir no banco, cai no fallback de tema/ícone abaixo e mostra texto
// vazio, sem quebrar.
const TYPE_ICON = { book_completed: 'BookMarked', joined_group: 'Users' }
const TYPE_THEME = {
  book_completed: STAT_THEMES.orange,
  joined_group:   STAT_THEMES.sand,
}

function activityText(activity, lang) {
  const name = activity.authorName
  if (activity.type === 'book_completed') {
    const book = bookNameFor(activity.payload.book, lang)
    return t('activity.bookCompleted', { name, book }, lang)
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
        <p style={{ fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.4 }}>{activityText(activity, lang)}</p>
        <p style={{ fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 600, color: 'var(--bento-t4)', marginTop: 1 }}>{formatRelativeTime(activity.createdAt, lang)}</p>
      </div>
    </div>
  )
}
