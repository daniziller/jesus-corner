// CartaoDePerfil.jsx — o cartão de perfil no topo da Comunidade: a foto (ou
// as iniciais), o nome, uma linha por fato (`facts`: desde quando a pessoa
// está no app, quantos dias por semana lê) e os quatro números (grupos, amigos, semanas na meta, quanto da Bíblia leu).
//
// A foto: tocar nela ou em "Adicionar foto"/"Trocar foto" abre a escolha
// de imagem do aparelho; a foto é recortada em quadrado, reduzida e
// enviada (avatarImage.js + profileStore.uploadMyAvatar). `photoApi` é
// trocável na pré-visualização.
import { useRef, useState } from 'react'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'
import { squareAvatarBlob } from '../../profile/avatarImage'
import { uploadMyAvatar } from '../../profile/profileStore'
import { AVATAR_TYPES } from '../../comunidade/comunidadeMath'

const FONT = 'var(--font-bento)'
const realPhotoApi = { prepare: squareAvatarBlob, upload: uploadMyAvatar }

export default function CartaoDePerfil({ lang, name, initials, avatarUrl, facts, stats, onOpenProfile, onAvatarChange, photoApi = realPhotoApi }) {
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const inputRef = useRef(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSending(true)
    setError(null)
    try {
      const url = await photoApi.upload(await photoApi.prepare(file))
      onAvatarChange?.(url)
    } catch (err) {
      setError(err.message === 'not_image' ? 'photoNotImage' : 'photoFailed')
    } finally {
      setSending(false)
    }
  }

  const choose = () => inputRef.current?.click()
  const locale = lang === 'en' ? 'en' : 'pt-BR'

  return (
    <section aria-label={L('myProfile')} style={s.card} data-comunidade="perfil">
      <div style={s.top}>
        <button type="button" style={s.avatar} onClick={choose} disabled={sending} aria-label={L(avatarUrl ? 'changePhotoAria' : 'addPhotoAria')}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={s.avatarImg} /> : initials}
          <span aria-hidden="true" style={s.camera}><AppIcon name="Camera" size={13} strokeWidth={2.4} color="#fff" /></span>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.name}>{name}</p>
          {facts.map(fact => <p key={fact} style={s.since}>{fact}</p>)}
          <button type="button" style={s.photoLink} onClick={choose} disabled={sending}>
            {sending ? L('photoSending') : L(avatarUrl ? 'changePhoto' : 'addPhoto')}
          </button>
        </div>
        <button type="button" style={s.profileBtn} onClick={onOpenProfile}>{L('myProfile')}</button>
      </div>
      {error && <p style={s.error} role="alert">{L(error)}</p>}
      <div style={s.stats}>
        {stats.map(stat => (
          <div key={stat.id} style={s.stat} data-numero={stat.id}>
            <span style={s.statValue}>{stat.value.toLocaleString(locale, stat.percent ? { minimumFractionDigits: 1, maximumFractionDigits: 1 } : undefined)}{stat.percent ? '%' : ''}</span>
            <span style={s.statLabel}>{t(stat.label, undefined, lang)}</span>
          </div>
        ))}
      </div>
      <input ref={inputRef} type="file" accept={AVATAR_TYPES.join(',')} onChange={pick} style={s.file} tabIndex={-1} aria-hidden="true" />
    </section>
  )
}

const s = {
  card: { borderRadius: 26, background: 'var(--bento-card)', padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  top: { display: 'flex', alignItems: 'center', gap: 14 },
  avatar: { position: 'relative', width: 64, height: 64, flexShrink: 0, border: 'none', padding: 0, borderRadius: 22, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: '-.5px', cursor: 'pointer' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 22, display: 'block' },
  camera: { position: 'absolute', right: -5, bottom: -5, width: 28, height: 28, boxSizing: 'border-box', borderRadius: 99, background: 'var(--bento-ink)', border: '3px solid var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: FONT, fontSize: 18, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  since: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-t2)', margin: '2px 0 0', whiteSpace: 'nowrap' },
  // 44px de toque numa linha de texto: a área sobe e desce além da letra.
  photoLink: { border: 'none', background: 'none', padding: '8px 12px 8px 0', margin: '-4px 0 -8px', minHeight: 44, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-now-text)', cursor: 'pointer' },
  profileBtn: { height: 44, flexShrink: 0, border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: '0 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  error: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-now-text)', margin: '-6px 0 0' },
  stats: { borderTop: '1px solid var(--bento-line)', paddingTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 },
  stat: { display: 'flex', flexDirection: 'column', gap: 4 },
  statValue: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '-.8px', color: 'var(--bento-ink)' },
  statLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1.25, color: 'var(--bento-t2)' },
  file: { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' },
}
