// AddStudyScreen.jsx — "Estudos" (turno 35, Bloco 4, tela 35h; turno 41,
// handoff-estudos-41/, 41a "Estudos (hub)" — mesma tela, cota mensal e
// "Feito pela equipe · {detalhe}" acrescentados). Busca por tema/livro/
// autor, filtro por origem, e as 4 fontes reais — criar por IA, Jesus
// Corner, grupos, banco público — mais o estudo em andamento e um atalho
// pros salvos.
//
// "Dos seus grupos" reaproveita group_reading_plans (getMyAcceptedGroupPlans)
// — o mecanismo de "a moderadora manda um plano pro grupo todo" que já
// existia antes deste turno; não é uma tabela nova. `authorName`/
// `acceptedCount` (turno 41) vêm de lá também — o comentário antigo aqui
// dizia que "quantas pessoas fazendo" não existia pra planos de grupo;
// existia sim (created_by desde a 0048), só não estava selecionado.
//
// Cota mensal (41a "N de 4 criados em <mês>"/"4 de 4 usados"): por ora
// conta tudo em ai_studies criado este mês-calendário (criações E adoções
// do banco — ver comentário no useEffect abaixo). Vira exato quando o
// Bloco 2 (41b/41c) unificar geração e cota num só mecanismo.
//
// Retirado da navegação (decisão confirmada com a autora, 2026-09-09,
// junto do pacote 41): os estudos "profundos" antigos (src/data/
// studies.js — Pentateuco etc., sem pergunta única por dia, sem PNG no
// pacote novo). Esta tela nunca os mostrou (só lê ai_studies/inductive),
// então nada mudou aqui — quem os mostrava era StudiesScreen.jsx/aba
// 'studies', hoje só alcançável via deep-link de um estudo específico já
// ativo (openActiveStudy em App.jsx), não como hub de navegação.
//
// "Meus estudos" (as ações que viviam na Biblioteca antiga, tela 4c):
// os convites de amigos (aceitar), o que publiquei no banco (sair do
// banco) e, em Salvos, apagar um estudo guardado — ou, num estudo do
// catálogo já começado, tirá-lo da lista (só o progresso é zerado). Ver
// studies/meusEstudosMath.js.
import { useEffect, useMemo, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getReadyMadeStudies, searchPublicStudies } from '../studies/publicStudiesStore'
import { getMyAcceptedGroupPlans } from '../groups/groupPlansStore'
import { getAiStudies } from '../studies/aiStudiesStore'
import { getInductiveStudies } from '../studies/inductiveStudiesStore'
import { getCompletedStudySessions, isStudySessionDone } from '../studies/studiesProgressStore'
import { getStepDays } from '../routine/stepDaysStore'
import { WEEKDAY_ABBR3 } from '../routine/weeklyDaysMath'
import { deriveThemeTexts } from '../themePlans/themeTexts'
import { countCreatedThisMonth } from '../studies/estudosStore'
import { STUDIES } from '../data/studies'
import { meusEstudosApi } from '../studies/meusEstudosApi'
import { savedStudyEntries, removalOf, progressLine, publishedLine, inviteRow, matchesStudyQuery } from '../studies/meusEstudosMath'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import { BotaoDaLupa } from '../components/biblioteca/TelaDeTipo'
import { useConfirmacao } from '../components/FolhaDeConfirmacao'

const FONT = 'var(--font-bento)'
const CHIPS = ['all', 'jesusCorner', 'groups', 'public', 'saved']

export default function AddStudyScreen({ session, api = meusEstudosApi, onBack, onOpenSearch = null, onCreateStudy, onChangeStudyDays, onOpenPreview, onOpenPublicBank, onOpenStudyDetail, onOpenCatalogStudy }) {
  const { lang, activeStudyId } = session
  const L = (k, vars) => t(`addStudy.${k}`, vars, lang)
  const [perguntar, folha] = useConfirmacao(lang)

  const [query, setQuery] = useState('')
  const [chip, setChip] = useState('all')
  const [readyMade, setReadyMade] = useState([])
  const [groupStudies, setGroupStudies] = useState([])
  const [publicResults, setPublicResults] = useState([])
  const [savedStudies, setSavedStudies] = useState([])
  // "Meus estudos": os publicados por mim e os convites de amigos.
  const [published, setPublished] = useState([])
  const [invites, setInvites] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [actionFailed, setActionFailed] = useState(false)
  const [activeStudy, setActiveStudy] = useState(null)
  const [quotaExplainOpen, setQuotaExplainOpen] = useState(false)
  const [quotaUsed, setQuotaUsed] = useState(0)
  const MAX_STUDIES_PER_MONTH = 4
  const quota = { used: Math.min(quotaUsed, MAX_STUDIES_PER_MONTH), max: MAX_STUDIES_PER_MONTH, exhausted: quotaUsed >= MAX_STUDIES_PER_MONTH }
  const localeName = lang === 'en' ? 'en-US' : 'pt-BR'
  const monthLabel = new Date().toLocaleDateString(localeName, { month: 'long' })
  const resetLabel = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString(localeName, { month: 'long' })
  function handleExhaustedTap() { setQuotaExplainOpen(true) }
  // "DIAS DO ESTUDO / Seg · Qua · Sex" (35h) — os DIAS de verdade, não uma
  // contagem ("3 dias"): mesma fonte que Meu Plano/Ajustar (stepDays.
  // study), só formatada como lista curta em vez de grade.
  const [studyDaysAbbr, setStudyDaysAbbr] = useState('')

  useEffect(() => {
    getReadyMadeStudies().then(setReadyMade).catch(err => console.error('Failed to load ready-made studies', err))
    getMyAcceptedGroupPlans().then(plans => {
      setGroupStudies(plans.map(p => ({
        ...p,
        sessions: deriveThemeTexts(p.passages),
        groupName: session.myGroups?.find(g => g.groupId === p.groupId)?.name ?? '',
      })))
    }).catch(err => console.error('Failed to load group plans', err))
    const abbr = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt
    getStepDays().then(days => setStudyDaysAbbr(abbr.filter((_, i) => days.study[i]).join(' · '))).catch(() => {})
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      searchPublicStudies({ query }).then(setPublicResults).catch(err => console.error('Failed to search public studies', err))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  function loadMine() {
    return Promise.all([getAiStudies(), getInductiveStudies(), getCompletedStudySessions()]).then(([ai, inductive, doneSet]) => {
      const mine = [...ai, ...inductive]
      // Salvos: os meus (fora o que está em andamento) e, do catálogo
      // pronto, os que já comecei.
      setSavedStudies(savedStudyEntries({ ai, inductive, catalog: STUDIES, isDone: (id, sessionId) => isStudySessionDone(doneSet, id, sessionId), activeStudyId }))
      const active = mine.find(s => s.id === activeStudyId)
      if (active) {
        const total = active.sessions?.length ?? 0
        const done = (active.sessions ?? []).filter(sess => isStudySessionDone(doneSet, active.id, sess.id)).length
        setActiveStudy({ ...active, doneCount: done, totalCount: total })
      } else {
        setActiveStudy(null)
      }
      // Cota mensal (regra 4 §3, HANDOFF-41): 4 CRIADOS por mês-calendário,
      // zerando dia 1º — exata desde o Bloco 2 (origin:'created' gravado
      // em App.jsx na hora de salvar; adotar do banco/grupo/Jesus Corner
      // grava outro origin e não conta aqui).
      setQuotaUsed(countCreatedThisMonth(mine))
    }).catch(err => console.error('Failed to load my studies', err))
  }
  useEffect(() => { loadMine() }, [activeStudyId]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadShared() {
    return Promise.all([api.published(), api.invites()])
      .then(([mine, invited]) => { setPublished(mine); setInvites(invited.map(inviteRow)) })
      .catch(err => console.error('Failed to load published studies and invites', err))
  }
  useEffect(() => { loadShared() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Uma ação de "Meus estudos" de cada vez; se falha, a tela avisa.
  async function act(id, run) {
    if (busyId) return
    setBusyId(id)
    setActionFailed(false)
    try {
      await run()
    } catch (err) {
      console.error('Study action failed', err)
      setActionFailed(true)
    } finally {
      setBusyId(null)
    }
  }
  // Abre a prévia de um estudo do banco (o mesmo caminho do banco público).
  const openBankStudy = study => onOpenPreview?.({ title: study.title, overview: study.overview, format: study.format, scope: null, sessions: deriveThemeTexts(study.passages), sourceStudyId: study.id, fromPublicBank: true, origin: 'public' })
  // "Aceitar" um convite de amigo: aceita e abre o estudo; "Continuar",
  // num já aceito, só abre.
  function acceptInvite(row) {
    if (!row.pending) { openBankStudy(row.study); return }
    act(row.id, async () => { await api.acceptInvite(row.id); openBankStudy(row.study) })
  }
  // "Sair do banco": tira o estudo que publiquei; quem já usou fica com a
  // própria cópia.
  async function withdraw(study) {
    if (!(await perguntar({ title: t('confirmations.withdrawTitle', undefined, lang), text: t('confirmations.withdrawText', undefined, lang), confirmLabel: t('confirmations.withdrawBtn', undefined, lang) }))) return
    act(study.id, async () => { await api.withdraw(study.id); await loadShared() })
  }
  // "Apagar" um estudo guardado, ou "Tirar da lista" um do catálogo.
  async function removeSaved(entry) {
    const clearing = removalOf(entry).action === 'clear'
    const asked = clearing
      ? { title: t('confirmations.removeStudyTitle', undefined, lang), text: t('confirmations.removeStudyText', undefined, lang), confirmLabel: t('confirmations.removeBtn', undefined, lang) }
      : { title: t('confirmations.deleteStudyTitle', undefined, lang), text: t('confirmations.deleteStudyText', undefined, lang), confirmLabel: t('confirmations.deleteBtn', undefined, lang) }
    if (!(await perguntar(asked))) return
    act(entry.id, async () => { await api.remove(entry); await loadMine() })
  }
  // Um estudo do catálogo abre na tela dele; os meus, na prévia.
  function openSaved(entry) {
    const { study } = entry
    if (entry.kind === 'catalog') { onOpenCatalogStudy?.(study.id); return }
    onOpenPreview?.({ title: study.title, overview: study.overview, format: 'thematic', scope: study.scope ?? null, sessions: study.sessions, sourceStudyId: study.id, origin: study.origin ?? 'created', createdAt: study.createdAt })
  }

  const q = query.trim().toLowerCase()
  const matchesQuery = study => !q || study.title.toLowerCase().includes(q) || (study.authorName ?? '').toLowerCase().includes(q)

  const filteredJesusCorner = useMemo(() => readyMade.filter(matchesQuery), [readyMade, q])
  const filteredGroups = useMemo(() => groupStudies.filter(matchesQuery), [groupStudies, q])
  const savedTitle = entry => (lang === 'en' ? entry.study.titleEn ?? entry.study.title : entry.study.title ?? entry.study.titleEn)
  const filteredSaved = useMemo(() => savedStudies.filter(entry => matchesStudyQuery(query, { title: savedTitle(entry) })), [savedStudies, query, lang]) // eslint-disable-line react-hooks/exhaustive-deps
  const filteredInvites = useMemo(() => invites.filter(row => matchesStudyQuery(query, row)), [invites, query])
  const filteredPublished = useMemo(() => published.filter(study => matchesStudyQuery(query, study)), [published, query])
  // A busca pública já roda no servidor (searchPublicStudies), não precisa filtrar de novo.

  const showAll = chip === 'all'
  const showSection = key => showAll || chip === key

  const noResults = q.length > 0
    && (!showSection('jesusCorner') || filteredJesusCorner.length === 0)
    && (!showSection('groups') || filteredGroups.length === 0)
    && (!showSection('public') || publicResults.length === 0)
    && (!showSection('saved') || filteredSaved.length === 0)
    && (!showAll || (filteredInvites.length === 0 && filteredPublished.length === 0))

  return (
    <div style={s.screen}>
      {/* O cabeçalho das telas de tipo da Biblioteca (handoff-biblioteca-55
          §1): voltar · nome com a linha de resumo · a lupa, quando a tela
          foi aberta pela Biblioteca. */}
      <CabecalhoDoPasso
        title={L('title')} subtitle={L('subtitle')} onBack={onBack} backLabel={t('a11y.goBack', undefined, lang)}
        clock={onOpenSearch ? <BotaoDaLupa onClick={onOpenSearch} /> : null}
      />

      <div style={s.searchWrap}>
        <div style={s.searchRow}>
          <AppIcon name="Search" size={16} color="var(--bento-t5)" />
          <input style={s.searchInput} value={query} onChange={e => setQuery(e.target.value)} placeholder={L('searchPlaceholder')} />
        </div>
      </div>

      <div style={s.chipsWrap}>
        {CHIPS.map(key => (
          <button key={key} style={{ ...s.chip, ...(chip === key ? s.chipOn : {}) }} onClick={() => setChip(key)}>
            {L(`chip${key[0].toUpperCase()}${key.slice(1)}`)}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {showAll && (
          <button
            type="button"
            style={{ ...s.createCard, ...(quota.exhausted ? s.createCardExhausted : {}) }}
            onClick={quota.exhausted ? handleExhaustedTap : onCreateStudy}
          >
            <span style={s.createDiamond} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={s.createTitle}>{L('createCardTitle')}</p>
              <p style={s.createSub}>{L('createCardSub')}</p>
              <span style={s.quotaChip}>
                {quota.exhausted ? L('quotaExhausted', { max: quota.max, reset: resetLabel }) : L('quotaRemaining', { used: quota.used, max: quota.max, month: monthLabel })}
              </span>
            </div>
            {!quota.exhausted && <AppIcon name="ArrowRight" size={16} color="var(--bento-accent)" />}
          </button>
        )}
        {/* Cota esgotada: "tocar explica, não abre 41b" — sem modal/toast
            no app (nenhum outro lugar usa), então a explicação abre como
            um parágrafo extra dentro do próprio cartão. */}
        {showAll && quota.exhausted && quotaExplainOpen && (
          <p style={s.quotaExplainText}>{L('quotaExhaustedExplain', { max: quota.max, reset: resetLabel })}</p>
        )}

        {/* Nav map do pacote 41: "cartão 'Em andamento' → 41f" — o cartão
            inteiro abre 41f (StudyDetailScreen.jsx) pra um Estudo do
            formato novo; "Mudar dias" continua indo pra 41h por cima
            (stopPropagation, senão os dois cliques disparariam juntos).
            Formato antigo (sem study.sessions[0].book) não tem 41f — o
            cartão fica só informativo, como sempre foi. */}
        {showAll && activeStudy && (
          <div
            style={s.sandCard}
            onClick={activeStudy.sessions?.[0]?.book ? onOpenStudyDetail : undefined}
            role={activeStudy.sessions?.[0]?.book ? 'button' : undefined}
          >
            <div style={s.sandHead}>
              <p style={s.sandLabel}>{L('inProgressLabel')}</p>
              <p style={s.sandDay}>{L('inProgressDayOf', { n: Math.min(activeStudy.doneCount + 1, activeStudy.totalCount || 1), total: activeStudy.totalCount })}</p>
            </div>
            <p style={s.sandTitle}>{activeStudy.title ?? activeStudy.titleEn}</p>
            <p style={s.sandSub}>{L('inProgressAuthorSelf', { min: activeStudy.minutesPerDay ?? 15 })}</p>
            <div style={s.sandDaysRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={s.sandDaysLabel}>{L('inProgressDaysLabel')}</p>
                <p style={s.sandDaysValue}>{studyDaysAbbr}</p>
              </div>
              <button style={s.changeDaysBtn} onClick={e => { e.stopPropagation(); onChangeStudyDays() }}>{L('changeDaysBtn')}</button>
            </div>
          </div>
        )}

        {noResults && <p style={s.emptyText}>{L('emptyResults')}</p>}
        {actionFailed && <p style={s.actionError} role="alert">{L('actionError')}</p>}

        {showAll && filteredInvites.length > 0 && (
          <StudySection label={L('sectionInvites')}>
            <div style={s.rowsCard}>
              {filteredInvites.map((row, i) => (
                <div key={row.id} style={{ ...s.row, ...(i > 0 ? s.rowLine : null) }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.rowTitle}>{row.title}</p>
                    <p style={s.rowSub}>{L('invitedBy', { name: row.authorName })}</p>
                  </div>
                  <button type="button" className="biblioteca-etiqueta" style={{ ...s.rowBtn, ...(row.pending ? s.rowBtnDark : null) }} disabled={busyId === row.id} onClick={() => acceptInvite(row)}>
                    {L(row.pending ? 'acceptBtn' : 'continueBtn')}
                  </button>
                </div>
              ))}
            </div>
          </StudySection>
        )}

        {showSection('jesusCorner') && filteredJesusCorner.length > 0 && (
          <StudySection label={L('sectionJesusCorner')}>
            {filteredJesusCorner.map(study => (
              <StudyCard
                key={study.id} badge={L('badgeJesusCorner')}
                title={study.title} sub={L('authorTeamDetail', { detail: t(`createStudy.format${study.format[0].toUpperCase()}${study.format.slice(1)}Sub`, undefined, lang) })}
                meta={L('cardDaysMeta', { n: study.passages?.length ?? 0 })}
                onClick={() => onOpenPreview?.({ title: study.title, overview: study.overview, format: study.format, scope: null, sessions: deriveThemeTexts(study.passages), sourceStudyId: study.id, origin: 'jesus_corner' })}
              />
            ))}
          </StudySection>
        )}

        {showSection('groups') && filteredGroups.length > 0 && (
          <StudySection label={L('sectionGroups')}>
            {filteredGroups.map(study => (
              <StudyCard
                key={study.id} badge={study.groupName} badgeTone="group"
                title={study.title} sub={L('authorByGroup', { author: study.authorName, n: study.acceptedCount ?? 1 })} meta={L('cardDaysMeta', { n: study.sessions.length })}
                onClick={() => onOpenPreview?.({ title: study.title, overview: study.overview, format: 'book', scope: null, sessions: study.sessions, sourceStudyId: study.id, origin: 'group' })}
              />
            ))}
          </StudySection>
        )}

        {showSection('public') && publicResults.length > 0 && (
          <StudySection label={L('sectionPublic')} action={<button style={s.seeMoreLink} onClick={onOpenPublicBank}>{L('seeMoreBtn')}</button>}>
            {publicResults.map(study => (
              <StudyCard
                key={study.id} badge={L('badgePublic')} badgeTone="public"
                title={study.title} sub={L('authorBy', { author: study.authorName })}
                meta={L('followersCount', { n: study.usesCount })}
                onClick={() => onOpenPreview?.({ title: study.title, overview: study.overview, format: study.format, scope: null, sessions: deriveThemeTexts(study.passages), sourceStudyId: study.id, fromPublicBank: true, origin: 'public' })}
              />
            ))}
          </StudySection>
        )}

        {showSection('saved') && filteredSaved.length > 0 && (
          <StudySection label={L('chipSaved')}>
            {filteredSaved.map(entry => (
              <StudyCard
                key={entry.id} badge={null}
                title={savedTitle(entry)} sub={entry.kind === 'catalog' ? L(progressLine(entry).key, progressLine(entry).vars) : null}
                meta={L('cardDaysMeta', { n: entry.total })}
                onClick={() => openSaved(entry)}
                action={{ label: L(removalOf(entry).labelKey), disabled: busyId === entry.id, onClick: () => removeSaved(entry) }}
              />
            ))}
          </StudySection>
        )}

        {showAll && filteredPublished.length > 0 && (
          <StudySection label={L('sectionPublished')}>
            <div style={s.rowsCard}>
              {filteredPublished.map((study, i) => (
                <div key={study.id} style={{ ...s.row, ...(i > 0 ? s.rowLine : null) }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.rowTitle}>{study.title}</p>
                    <p style={s.rowSub}>{L(publishedLine(study).key, publishedLine(study).vars)}</p>
                  </div>
                  <button type="button" className="biblioteca-etiqueta" style={s.rowBtn} disabled={busyId === study.id} onClick={() => withdraw(study)}>{L('withdrawBtn')}</button>
                </div>
              ))}
            </div>
          </StudySection>
        )}

        <div style={s.trustCard}>
          <p style={s.trustText}>{L('trustNote')}</p>
        </div>
      </div>
      {folha}
    </div>
  )
}

function StudySection({ label, action, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHead}>
        <p style={s.sectionLabel}>{label}</p>
        {action}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

// `action` ({ label, onClick, disabled }): uma ação do próprio cartão
// ("Apagar", "Tirar da lista"), à direita, fora do toque que abre o
// estudo.
function StudyCard({ badge, badgeTone, title, sub, meta, onClick, action = null }) {
  const body = (
    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
      <div style={s.cardTopRow}>
        {badge && <span style={{ ...s.badge, ...(badgeTone === 'group' ? s.badgeGroup : badgeTone === 'public' ? s.badgePublicTone : {}) }}>{badge}</span>}
        <span style={s.cardMeta}>{meta}</span>
      </div>
      <p style={s.cardTitle}>{title}</p>
      {sub && <p style={s.cardSub}>{sub}</p>}
    </div>
  )
  if (!action) return <button style={s.card} onClick={onClick}>{body}</button>
  return (
    <div style={s.cardWithAction}>
      <button style={s.cardOpen} onClick={onClick}>{body}</button>
      <button type="button" className="biblioteca-etiqueta" style={s.rowBtn} disabled={action.disabled} onClick={action.onClick} aria-label={`${action.label}: ${title}`}>{action.label}</button>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },

  searchWrap: { flex: 'none', padding: '14px 20px 0' },
  searchRow: { height: 46, borderRadius: 16, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' },
  searchInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: FONT, fontSize: 14, fontWeight: 500, color: 'var(--bento-ink)' },

  chipsWrap: { flex: 'none', display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 20px 0' },
  chip: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', background: 'var(--bento-card)', border: 'none', borderRadius: 99, padding: '9px 14px', cursor: 'pointer' },
  chipOn: { color: '#fff', background: 'var(--bento-ink)', fontWeight: 800 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px 20px calc(var(--nav-height) + 20px)', display: 'flex', flexDirection: 'column', gap: 12 },

  createCard: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 'none', borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px', cursor: 'pointer' },
  // Cota esgotada (41a): fundo mais apagado, sem seta — "tocar explica,
  // não abre 41b" (o card continua clicável, só a ação muda).
  createCardExhausted: { background: 'rgba(255,255,255,.06)' },
  createDiamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  createTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 3px' },
  createSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0, lineHeight: 1.3 },
  quotaChip: { display: 'inline-block', marginTop: 8, fontFamily: FONT, fontSize: 10.5, fontWeight: 800, color: 'var(--bento-accent)', background: 'rgba(240,102,43,.16)', borderRadius: 99, padding: '4px 10px' },
  quotaExplainText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '-4px 4px 0', padding: '0 4px' },

  sandCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 20px' },
  sandHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sandLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: 0 },
  sandDay: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-sand-ink-mid)', margin: 0 },
  sandTitle: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-sand-ink-strong)', margin: '0 0 4px' },
  sandSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-sand-ink-mid)', margin: '0 0 14px' },
  sandDaysRow: { display: 'flex', alignItems: 'center', gap: 12 },
  sandDaysLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 3px' },
  sandDaysValue: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  changeDaysBtn: { flexShrink: 0, height: 38, padding: '0 16px', borderRadius: 13, border: 'none', background: 'var(--bento-sand-icon)', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },

  emptyText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', textAlign: 'center', margin: '8px 0' },

  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  seeMoreLink: { fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: 'var(--bento-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 },

  card: { width: '100%', border: 'none', borderRadius: 20, background: 'var(--bento-card)', padding: '14px 18px', cursor: 'pointer' },
  cardTopRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  badge: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-accent)', background: 'rgba(240,102,43,.14)', borderRadius: 99, padding: '4px 9px' },
  badgeGroup: { color: 'var(--bento-sand-icon)', background: 'var(--bento-sand)' },
  // Banco público (41a) — etiqueta CINZA, não laranja (só Jesus Corner usa
  // laranja) — cor da própria etiqueta some do banco de tokens? não, reusa
  // --bento-t4/--bento-line, mesmo par neutro do resto do app.
  badgePublicTone: { color: 'var(--bento-t4)', background: 'var(--bento-line)' },
  cardMeta: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-t4)' },
  cardTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  cardSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },

  // Cartão com ação: o mesmo cartão branco, com o toque que abre à
  // esquerda e a ação à direita.
  cardWithAction: { display: 'flex', alignItems: 'center', gap: 12, borderRadius: 20, background: 'var(--bento-card)', paddingRight: 18 },
  cardOpen: { flex: 1, minWidth: 0, border: 'none', background: 'none', padding: '14px 0 14px 18px', cursor: 'pointer' },

  // "Convites de amigos" e "Publicados por mim": linhas num cartão branco.
  rowsCard: { borderRadius: 20, background: 'var(--bento-card)', padding: '2px 18px' },
  row: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '10px 0', boxSizing: 'border-box' },
  rowLine: { borderTop: '1px solid var(--bento-line)' },
  rowTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, color: 'var(--bento-ink)', margin: '0 0 2px', overflowWrap: 'anywhere' },
  rowSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },
  rowBtn: { flexShrink: 0, height: 32, border: 'none', borderRadius: 11, background: 'var(--bento-line)', padding: '0 12px', fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', whiteSpace: 'nowrap', cursor: 'pointer' },
  rowBtnDark: { background: 'var(--bento-ink)', fontWeight: 800, color: '#fff' },
  actionError: { fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1.4, color: 'var(--bento-now-text)', margin: '0 4px' },

  trustCard: { borderRadius: 20, background: 'rgba(255,255,255,.6)', padding: '14px 18px' },
  trustText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: 0 },
}
