// LivroCompletoScreen.jsx — Livro completo (G8, HANDOFF §6.1): o momento
// de parabéns ao terminar um livro — o selo grande girado −3°, "Parabéns,
// você leu {Livro}.", o que este livro representa, e Capítulos · Em ·
// Tempo. Tem prioridade sobre qualquer outra conquista da mesma sessão
// (as demais ficam como "novas" em G5). Mostrada por App.jsx depois da
// tela de conclusão, nunca no lugar dela.
import { useEffect, useState } from 'react'
import { blockColorVar } from '../data/gamificationBlocks'
import { summarizeSeal, representsPhrase, terminadoEm } from '../gamification/sealDetails'
import { formatInt } from '../gamification/format'
import { blockAchievementId } from '../data/achievements'
import { blockById } from '../data/gamificationBlocks'

const FONT = 'var(--font-bento)'

// `data` = resultado de evaluateGamification (stats, progress, row,
// newIds); `nome` = o livro terminado.
export default function LivroCompletoScreen({ nome, data, onVerEstante, onContinuar }) {
  const [sum, setSum] = useState(null)
  useEffect(() => {
    const seal = data?.row?.bookSeals?.[nome] ?? null
    setSum(summarizeSeal(nome, { seal, chapterRows: data?.stats?.chapterRows ?? [], sessionRows: data?.stats?.sessionRows ?? [] }))
  }, [nome, data])

  if (!sum) return <div style={s.screen} />
  const blocoCompletado = (data?.newIds ?? []).map(id => (id.startsWith('bloco:') ? id.slice(6) : null)).find(id => id === sum.blocoId)
  const represents = representsPhrase({ livrosCompletos: data?.progress?.livrosCompletos ?? 1, blocoCompletadoNome: blocoCompletado ? blockById(blocoCompletado).nome : null })

  return (
    <div style={s.screen}>
      <div style={s.content}>
        <p style={s.kicker}>LIVRO COMPLETO</p>
        <div style={{ ...s.seal, background: blockColorVar(sum.blocoId) }} role="img" aria-label={`Selo de ${nome}, ${sum.posicao} de 66`}>
          <div style={s.sealHead}>
            <span style={s.sealKicker}>{sum.blocoNome.toUpperCase()}</span>
            <span style={s.sealKicker}>{sum.posicao}/66</span>
          </div>
          <p style={s.sealSigla}>{sum.sigla}</p>
          <p style={s.sealName}>{nome}</p>
          <div style={s.sealRule} />
          {sum.completedAt && <p style={s.sealDate}>{terminadoEm(sum.completedAt)}</p>}
        </div>
        <p style={s.title}>Parabéns, você leu {nome}.</p>
        <p style={s.sub}>{represents}</p>
        <div style={s.statsRow}>
          <div style={s.stat}><p style={s.statLabel}>Capítulos</p><p style={s.statValue}>{formatInt(sum.capitulos)}</p></div>
          {sum.daysLabel && <div style={s.stat}><p style={s.statLabel}>Em</p><p style={s.statValue}>{sum.daysLabel}</p></div>}
          {sum.timeLabel && <div style={s.stat}><p style={s.statLabel}>Tempo</p><p style={s.statValue}>{sum.timeLabel}</p></div>}
        </div>
      </div>
      <div style={s.footer}>
        <button type="button" style={s.primary} onClick={onVerEstante}>Ver minha estante</button>
        <button type="button" style={s.secondary} onClick={onContinuar}>Continuar</button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-ink)', padding: '60px 24px 26px', boxSizing: 'border-box', overflowY: 'auto' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  kicker: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 30px' },
  seal: { width: 210, boxSizing: 'border-box', borderRadius: 30, padding: '22px 20px 20px', transform: 'rotate(-3deg)', boxShadow: '0 24px 60px rgba(0,0,0,.45)', textAlign: 'left', marginBottom: 40 },
  sealHead: { display: 'flex', justifyContent: 'space-between', marginBottom: 22 },
  sealKicker: { fontFamily: FONT, fontSize: 9, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)' },
  sealSigla: { fontFamily: FONT, fontSize: 64, fontWeight: 800, letterSpacing: '-3px', lineHeight: 0.9, color: '#fff', margin: '0 0 6px' },
  sealName: { fontFamily: FONT, fontSize: 19, fontWeight: 800, color: '#fff', margin: '0 0 18px' },
  sealRule: { height: 1, background: 'rgba(255,255,255,.22)', marginBottom: 12 },
  sealDate: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.85)', margin: 0 },
  title: { fontFamily: FONT, fontSize: 28, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, color: '#fff', margin: '0 0 12px' },
  sub: { fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.6)', margin: '0 0 26px', maxWidth: 320 },
  statsRow: { display: 'flex', gap: 10, width: '100%' },
  stat: { flex: 1, minWidth: 0, borderRadius: 18, background: 'rgba(255,255,255,.07)', padding: '14px 14px 13px', textAlign: 'left' },
  statLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', margin: '0 0 6px' },
  statValue: { fontFamily: FONT, fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, whiteSpace: 'nowrap' },
  footer: { flex: 'none', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 24 },
  primary: { height: 52, borderRadius: 17, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  secondary: { height: 48, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,.08)', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' },
}
