// NovaConquistaScreen.jsx — Nova conquista (G4, HANDOFF §5.3): o momento
// de parabéns ao subir um degrau de uma família (ou acender um bloco).
// Tela cheia preta, uma por sessão, depois da tela de conclusão que já
// existe — nunca no lugar dela (App.jsx decide quando). Sem confete, sem
// emoji, sem som: a medalha em 168px com dois anéis suaves, o nome, a
// frase com o fato e a escada da família.
import { useMemo } from 'react'
import Medalha from '../components/gamificacao/Medalha'
import { familyById, parseAchievementId, blockAchievementId, BLOCK_ACHIEVEMENTS } from '../data/achievements'
import { GAMIFICATION_BLOCKS, blockById } from '../data/gamificationBlocks'
import { familyRatePerMonth, monthsToNext, dateInMonths } from '../gamification/familiesMath'
import { familyCelebrationPhrase, blockCelebrationPhrase, thresholdLabel, degrauCount } from '../gamification/celebrationText'
import { monthName } from '../gamification/format'

const FONT = 'var(--font-bento)'

// `data` = resultado de evaluateGamification/loadGamificationStats
// (states, stats, progress, row, firstActivityIso).
export default function NovaConquistaScreen({ celebration, data, userName, onContinue, onOpenConquistas }) {
  const parsed = parseAchievementId(celebration.id)
  const store = data?.row?.achievements ?? {}
  const sinceMonth = data?.firstActivityIso ? monthName(new Date(data.firstActivityIso)) : null

  const view = useMemo(() => {
    if (parsed.blocoId) {
      const bloco = blockById(parsed.blocoId)
      const earnedBlocks = BLOCK_ACHIEVEMENTS.filter(b => store[b.id]).length
      const dates = data?.states?.completionDates ?? {}
      const ultimo = [...bloco.livros].map(l => l.nome).sort((a, b) => ((dates[a] ?? '') < (dates[b] ?? '') ? 1 : -1))[0]
      return {
        medal: <Medalha bloco={parsed.blocoId} size={168} ganha sobreEscuro />,
        nome: bloco.nome,
        phrase: blockCelebrationPhrase(parsed.blocoId, { nome: userName, ultimoLivro: dates[ultimo] ? ultimo : null }),
        cardLabel: `BLOCOS DA BÍBLIA · ${earnedBlocks} DE 8`,
        nextIn: null,
        ladder: GAMIFICATION_BLOCKS.map(b => ({ key: b.id, medal: <Medalha bloco={b.id} size={40} ganha={!!store[blockAchievementId(b.id)]} sobreEscuro />, label: null, state: store[blockAchievementId(b.id)] ? 'ganha' : 'depois' })),
      }
    }
    const fam = familyById(parsed.familyId)
    const st = data?.states?.families.find(f => f.id === fam.id)
    const degrau = fam.degraus.find(d => d.degrau === parsed.degrau)
    // Na hora do parabéns o valor já cruzou o limiar; nunca mostra menos
    // que ele (ex.: leitura ainda carregando).
    const value = Math.max(st?.value ?? 0, degrau.limiar)
    let nextIn = null
    if (st?.next && data?.stats) {
      const months = monthsToNext(st.remaining, familyRatePerMonth(fam.id, data.stats, data.states))
      if (months != null) nextIn = monthName(dateInMonths(months))
    }
    return {
      medal: <Medalha familia={fam.id} degrau={parsed.degrau} size={168} ganha sobreEscuro />,
      nome: degrau.nome,
      phrase: familyCelebrationPhrase(fam.id, { nome: userName, value, sinceMonth }),
      cardLabel: degrauCount(fam.id, parsed.degrau),
      nextIn,
      ladder: fam.degraus.map(d => {
        const ganha = d.degrau <= parsed.degrau
        const isNext = d.degrau === parsed.degrau + 1
        return {
          key: d.degrau,
          medal: <Medalha familia={fam.id} degrau={d.degrau} size={40} ganha={ganha} sobreEscuro contorno={isNext} />,
          label: thresholdLabel(fam.id, d.limiar),
          state: ganha ? 'ganha' : isNext ? 'proxima' : 'depois',
        }
      }),
    }
  }, [celebration.id, data, userName, sinceMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={s.screen}>
      <div style={s.content}>
        <p style={s.kicker}>NOVA CONQUISTA</p>
        <div style={s.medalWrap}>{view.medal}</div>
        <p style={s.name}>{view.nome}</p>
        <p style={s.phrase}>{view.phrase}</p>

        <div style={s.card}>
          <div style={s.cardHead}>
            <p style={s.cardLabel}>{view.cardLabel}</p>
            {view.nextIn && <p style={s.cardNext}>próxima em {view.nextIn}</p>}
          </div>
          <div style={s.ladder}>
            {view.ladder.map(item => (
              <div key={item.key} style={{ ...s.ladderItem, opacity: item.state === 'depois' ? 0.45 : 1 }}>
                {item.medal}
                {item.label && <p style={{ ...s.ladderLabel, color: item.state === 'proxima' ? 'var(--bento-accent)' : '#fff' }}>{item.label}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <button type="button" style={s.primary} onClick={onContinue}>Continuar</button>
        <button type="button" style={s.secondary} onClick={onOpenConquistas}>Ver minhas conquistas</button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-ink)', padding: '64px 26px 26px', boxSizing: 'border-box', overflowY: 'auto' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  kicker: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 28px' },
  medalWrap: { borderRadius: 50, boxShadow: '0 0 0 18px rgba(240,102,43,.08), 0 0 0 40px rgba(240,102,43,.04)', margin: '20px 0 36px' },
  name: { fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: '-1.1px', lineHeight: 1.1, color: '#fff', margin: '0 0 12px' },
  phrase: { fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.6)', margin: '0 0 28px', maxWidth: 300 },
  card: { width: '100%', boxSizing: 'border-box', borderRadius: 22, background: 'rgba(255,255,255,.06)', padding: '16px 18px 18px' },
  cardHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
  cardLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', margin: 0, textAlign: 'left' },
  cardNext: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.6)', margin: 0, flexShrink: 0 },
  ladder: { display: 'flex', justifyContent: 'space-between', gap: 4 },
  ladderItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0 },
  ladderLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 700, margin: 0, whiteSpace: 'nowrap' },
  footer: { flex: 'none', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 24 },
  primary: { height: 52, borderRadius: 17, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  secondary: { height: 48, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,.08)', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' },
}
