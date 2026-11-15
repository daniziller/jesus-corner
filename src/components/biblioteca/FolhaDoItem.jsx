// FolhaDoItem.jsx — o menu de um item da Biblioteca, aberto ao segurar o
// item numa tela de tipo (Editar · Compartilhar · Apagar) e pelos três
// pontos da anotação guardada (aí, "Editar detalhes"). A folha só
// mostra; o que cada ação faz é de quem chama.
import FolhaInferior from '../FolhaInferior'
import AppIcon from '../../icons/AppIcon'
import { t } from '../../i18n'

const FONT = 'var(--font-bento)'

export default function FolhaDoItem({ title, editLabel = t('bibliotecaTx.edit'), onEdit, onShare, onDelete, onClose }) {
  const rows = [
    { key: 'edit', label: editLabel, icon: 'Pencil', run: onEdit },
    { key: 'share', label: t('bibliotecaTx.share'), icon: 'Share2', run: onShare },
    { key: 'delete', label: t('bibliotecaTx.delete'), icon: 'Trash2', run: onDelete, danger: true },
  ].filter(row => row.run)
  return (
    <FolhaInferior fixed onClose={onClose} labelledBy="biblioteca-item-titulo">
      <h2 id="biblioteca-item-titulo" style={s.title}>{title}</h2>
      {rows.map((row, i) => (
        <button key={row.key} type="button" style={{ ...s.row, ...(i > 0 ? s.rowLine : null) }} onClick={row.run}>
          <AppIcon name={row.icon} size={16} strokeWidth={2} color={row.danger ? 'var(--bento-destructive)' : 'var(--bento-ink)'} />
          <span style={{ ...s.label, ...(row.danger ? s.danger : null) }}>{row.label}</span>
        </button>
      ))}
    </FolhaInferior>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 16, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: '0 0 8px', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' },
  row: { width: '100%', height: 52, border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' },
  rowLine: { borderTop: '1px solid var(--bento-line)' },
  label: { fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)' },
  danger: { color: 'var(--bento-destructive)' },
}
