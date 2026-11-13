// FolhaFazerPedido.jsx — "Fazer um pedido" (O2, handoff-passos-pedidos-
// 53-54 §8). Folha inferior aberta pela lista de pedidos ("Novo"), pela
// Súplica e pela aba de oração de um grupo.
//
// "Quem vê" são blocos lado a lado, e o padrão é SEMPRE "Só eu": toda vez
// que a folha abre, de onde quer que abra — a última escolha não é
// lembrada. Com "Só eu" o pedido é guardado no diário da pessoa. Ele só é
// publicado se ela escolher um grupo (ou "Meus amigos") e tocar em
// "Publicar pedido"; aí aparece também "Publicar sem meu nome", que vem
// desligado.
//
// "Escrever com ajuda" (só para quem tem IA): o mesmo campo aceita o
// desabafo cru; o botão manda o texto atual e troca pelo pedido curto que
// volta, que a pessoa ainda edita antes de guardar.
//
// `api` só existe para a pré-visualização de desenvolvimento trocar a
// leitura de grupos e a gravação por versões de memória.
import { useState, useEffect } from 'react'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'
import FolhaInferior from '../FolhaInferior'
import CampoQueCresce from '../passos/CampoQueCresce'
import { getMyGroups, getGroupMemberCounts } from '../../groups/groupsStore'
import { getFriendsCount } from '../../friends/friendsStore'
import { createPrayerRequest, composePrayerRequestDraft } from '../../groups/prayerRequestsStore'
import { incrementPrayerStat } from '../../prayer/prayerStatsStore'
import { DEFAULT_WHO_SEES, whoSeesOptions, requestFormState, requestPayload } from '../../pedidos/pedidosMath.js'

const FONT = 'var(--font-bento)'
const realApi = { getMyGroups, getGroupMemberCounts, getFriendsCount, createPrayerRequest, composePrayerRequestDraft }

export default function FolhaFazerPedido({ lang, authUser, hasAI, onClose, onCreated, api = realApi }) {
  const L = (k, vars) => t(`addPrayerRequest.${k}`, vars, lang)
  const email = authUser?.email

  const [groups, setGroups] = useState([])
  const [memberCounts, setMemberCounts] = useState({})
  const [friendsCount, setFriendsCount] = useState(0)
  useEffect(() => {
    api.getMyGroups().then(async list => {
      setGroups(list)
      setMemberCounts(await api.getGroupMemberCounts(list.map(g => g.groupId)))
    }).catch(err => console.error('Failed to load groups', err))
    api.getFriendsCount().then(setFriendsCount).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [body, setBody] = useState('')
  const [choice, setChoice] = useState(DEFAULT_WHO_SEES)
  const [anonymous, setAnonymous] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const options = whoSeesOptions({ groups, memberCounts, friendsCount })
  const form = requestFormState({ body, choice })
  const canSubmit = form.canSubmit && !posting

  async function submit() {
    if (!canSubmit) return
    setPosting(true)
    setError('')
    try {
      await api.createPrayerRequest(requestPayload({ body, choice, anonymous }))
      incrementPrayerStat(email, 'requestsAdded').catch(err => console.error('Failed to persist prayer stat', err))
      onCreated?.()
      onClose?.()
    } catch (err) {
      setError(err.message)
      setPosting(false)
    }
  }

  async function askAiHelp() {
    const draft = body.trim()
    if (!draft || aiLoading) return
    setAiLoading(true)
    setAiError('')
    try {
      setBody(await api.composePrayerRequestDraft({ text: draft, lang }))
    } catch (err) {
      setAiError(err.message === 'daily_limit_reached' ? t('aiChat.dailyLimitReached', undefined, lang) : L('aiAssistError'))
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <FolhaInferior onClose={onClose} labelledBy="fazer-pedido-titulo" fixed form focusField>
      <h2 style={s.title} id="fazer-pedido-titulo">Fazer um pedido</h2>
      <p style={s.sub}>Uma frase basta. Começa só seu — você escolhe se alguém mais vê.</p>

      <div style={s.field}>
        <CampoQueCresce
          className="passo-campo" style={s.textarea} minHeight={46}
          value={body} onChange={setBody} placeholder={L('placeholder')} aria-label="Seu pedido de oração" maxLength={1200}
        />
        <div style={s.fieldBottom}>
          <span style={{ ...s.counter, ...(form.over ? s.counterOver : null) }} aria-live={form.over ? 'polite' : 'off'}>{form.counter}</span>
          {hasAI && (
            <button type="button" className="passo-rotulo" style={{ ...s.ai, ...(body.trim() ? null : s.aiOff) }} onClick={askAiHelp} disabled={aiLoading || !body.trim()}>
              {aiLoading ? 'Reescrevendo…' : 'Escrever com ajuda'}
            </button>
          )}
        </div>
        {aiError && <p style={s.error} role="status">{aiError}</p>}
      </div>

      <p style={s.label} id="quem-ve">Quem vê</p>
      <div style={{ ...s.who, ...(options.length > 3 ? s.whoScroll : null) }} role="radiogroup" aria-labelledby="quem-ve">
        {options.map(opt => {
          const on = opt.key === choice
          return (
            <button
              key={opt.key} type="button" role="radio" aria-checked={on}
              style={{ ...s.block, ...(options.length > 3 ? s.blockFixed : null), ...(on ? s.blockOn : null) }}
              onClick={() => setChoice(opt.key)}
            >
              <span style={{ ...s.blockTitle, ...(on ? { color: '#fff' } : null) }}>{opt.title}</span>
              <span style={{ ...s.blockSub, ...(on ? { color: 'rgba(255,255,255,.55)' } : null) }}>{opt.sub}</span>
            </button>
          )
        })}
      </div>

      {form.showAnonymous && (
        <div style={s.anon}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.anonTitle} id="sem-meu-nome">Publicar sem meu nome</p>
            <p style={s.anonSub}>Aparece como &quot;Anônimo&quot; para o grupo</p>
          </div>
          <button
            type="button" role="switch" aria-checked={anonymous} aria-labelledby="sem-meu-nome"
            style={{ ...s.switch, background: anonymous ? 'var(--bento-ink)' : 'var(--bento-t6)', justifyContent: anonymous ? 'flex-end' : 'flex-start' }}
            onClick={() => setAnonymous(v => !v)}
          >
            <span style={{ ...s.thumb, background: anonymous ? 'var(--bento-accent)' : '#fff' }} />
          </button>
        </div>
      )}

      <p style={s.note}>{form.note}</p>
      {error && <p style={s.error} role="status">{error}</p>}

      <button type="button" style={{ ...s.submit, ...(canSubmit ? null : s.submitOff) }} onClick={submit} disabled={!canSubmit}>
        <span>{posting ? 'Guardando…' : form.button}</span>
        <AppIcon name="ArrowRight" size={16} strokeWidth={2.6} color="var(--bento-ink)" style={{ flexShrink: 0 }} />
      </button>
    </FolhaInferior>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 14px' },

  field: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 16px 13px', boxShadow: 'inset 0 0 0 2px var(--bento-ink)', margin: '0 0 10px' },
  textarea: { background: 'none', padding: 0, fontFamily: FONT, fontSize: 16, fontWeight: 600, lineHeight: 1.45, color: 'var(--bento-ink)', margin: '0 0 14px' },
  fieldBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  counter: { fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },
  counterOver: { color: 'var(--bento-sand-icon)', fontWeight: 800 },
  ai: { border: 'none', background: 'none', padding: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-icon)', cursor: 'pointer' },
  aiOff: { opacity: 0.5, cursor: 'default' },

  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '14px 2px 9px' },
  who: { display: 'flex', gap: 6, margin: '0 0 12px' },
  // Com mais de dois grupos, a fileira rola de lado (e sangra até a borda).
  whoScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -20px 12px', padding: '0 20px' },
  block: { flex: 1, minWidth: 0, border: 'none', borderRadius: 16, background: 'var(--bento-card)', padding: '12px 8px', textAlign: 'center', cursor: 'pointer' },
  blockFixed: { flex: '0 0 112px' },
  blockOn: { background: 'var(--bento-ink)' },
  blockTitle: { display: 'block', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1.15, color: 'var(--bento-ink)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  blockSub: { display: 'block', fontFamily: FONT, fontSize: 10.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },

  anon: { borderRadius: 20, background: 'var(--bento-card)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 12px' },
  anonTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 2px' },
  anonSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },
  // O interruptor do app (o mesmo desenho do Ajustar).
  switch: { width: 46, height: 28, borderRadius: 99, border: 'none', padding: 3, display: 'flex', alignItems: 'center', flexShrink: 0, cursor: 'pointer', boxSizing: 'border-box' },
  thumb: { width: 22, height: 22, borderRadius: 99, display: 'block' },

  note: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: '0 2px 14px' },
  error: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-icon)', margin: '8px 2px 0' },
  submit: { width: '100%', height: 54, border: 'none', borderRadius: 18, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  submitOff: { opacity: 0.45, cursor: 'default' },
}
