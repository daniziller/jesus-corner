// familiesMath.js — o valor atual de cada uma das cinco famílias de
// conquista, o degrau em que a pessoa está, o próximo, e a DATA em que
// cada limiar foi cruzado (reconstruída do histórico, HANDOFF §7). Pura,
// sem I/O. Testes em scripts/test-gamificacao.mjs.
//
// Fontes (ver levantamento de 2026-11-11):
//   Constância — daily_routine + weekly_goal_history (weeksMath.js);
//   Leitura    — completed_keys (contagem) + chapters_read (datas, só a 1ª
//                vez de cada capítulo, e só desde a migration 0049);
//   Tempo      — session_seconds (passo + data); reading_seconds (acumulador
//                anterior a 0049, sem data nem passo) NÃO entra — decisão
//                da autora (2026-11-11);
//   Oração     — group_prayer_intentions (prayed_date), menos os pedidos
//                da própria pessoa;
//   Livros     — completed_keys + a data do último capítulo de cada livro
//                em chapters_read.
//
// Data desconhecida (null) acontece quando o limiar foi cruzado com dados
// anteriores às tabelas datadas; quem grava usa a data da migração e não
// mostra mês (HANDOFF §7). A convenção: entre os N itens que compõem um
// valor, os `undated` primeiros são os mais antigos (foram lidos antes de
// existir a tabela), então o k-ésimo item tem data só se k > undated.
import { FAMILIES } from '../data/achievements.js'
import { GAMIFICATION_BLOCKS, GAMIFICATION_BOOKS } from '../data/gamificationBlocks.js'
import { parseLocalDateKey } from '../utils/dateKey.js'
import { computeMetWeeks } from './weeksMath.js'

// Chave de dia local (YYYY-MM-DD) → ISO de meio-dia local; usada pra
// gravar earnedAt a partir de uma data sem hora sem cair no dia anterior
// em UTC-3 (mesmo cuidado de parseLocalDateKey).
export function dayKeyToIso(key) {
  const d = parseLocalDateKey(key)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

// k-ésimo item (1-based) de uma lista de ISO ordenada, considerando
// `undated` itens anteriores sem data.
export function thresholdDate(datedSorted, undated, k) {
  if (k <= undated) return null
  return datedSorted[k - undated - 1] ?? null
}

function sortIso(list) {
  return [...list].sort()
}

// ── Leitura ────────────────────────────────────────────────────────────
// `chapterRows`: linhas de chapters_read ({livro, capitulo, created_at}).
// Só capítulos que ESTÃO em completedSet contam (desmarcar recalcula o
// valor; a conquista já gravada fica, mas isso é do store, não daqui).
export function leituraStats(progress, completedSet, chapterRows) {
  const dated = []
  for (const row of chapterRows ?? []) {
    if (!row?.livro || !row?.capitulo || !row?.created_at) continue
    if (completedSet.has(`${row.livro}:${row.capitulo}`)) dated.push(new Date(row.created_at).toISOString())
  }
  const datedSorted = sortIso(dated)
  const value = progress.capitulosLidos
  return { value, datedSorted, undated: Math.max(0, value - datedSorted.length) }
}

// ── Tempo com Deus ─────────────────────────────────────────────────────
// `sessionRows`: linhas de session_seconds ({data, passo, segundos,
// created_at}). Valor = horas inteiras. A data de cada limiar é a da
// sessão em que o acumulado cruzou h×3600.
export function tempoStats(sessionRows) {
  const rows = [...(sessionRows ?? [])]
    .filter(r => r && r.segundos > 0)
    .sort((a, b) => ((a.data ?? '') < (b.data ?? '') ? -1 : (a.data ?? '') > (b.data ?? '') ? 1 : ((a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1)))
  let total = 0
  const cumulative = [] // [{ seconds após a sessão, iso }]
  for (const r of rows) {
    total += r.segundos
    cumulative.push({ seconds: total, iso: r.created_at ? new Date(r.created_at).toISOString() : dayKeyToIso(r.data) })
  }
  return {
    value: Math.floor(total / 3600),
    totalSeconds: total,
    dateForHours(h) {
      const hit = cumulative.find(c => c.seconds >= h * 3600)
      return hit ? hit.iso : null
    },
  }
}

// ── Oração pelos outros ────────────────────────────────────────────────
// `intentionRows`: as próprias linhas de group_prayer_intentions
// ({prayer_request_id, prayed_date}); `myRequestIds`: Set com os ids dos
// pedidos da própria pessoa (orar pelo próprio pedido não conta).
export function oracaoStats(intentionRows, myRequestIds) {
  const dated = []
  for (const row of intentionRows ?? []) {
    if (!row?.prayer_request_id || myRequestIds?.has(row.prayer_request_id)) continue
    if (row.prayed_date) dated.push(dayKeyToIso(row.prayed_date))
  }
  const datedSorted = sortIso(dated)
  return { value: datedSorted.length, datedSorted, undated: 0 }
}

// ── Livros completos e blocos ──────────────────────────────────────────
// Data de conclusão de um livro = created_at do último capítulo lido, se
// TODOS os capítulos dele têm linha em chapters_read; senão desconhecida.
export function bookCompletionDates(progress, chapterRows) {
  const byBook = new Map()
  for (const row of chapterRows ?? []) {
    if (!row?.livro || !row?.capitulo || !row?.created_at) continue
    if (!byBook.has(row.livro)) byBook.set(row.livro, new Map())
    byBook.get(row.livro).set(row.capitulo, new Date(row.created_at).toISOString())
  }
  const dates = {}
  for (const nome of progress.completos) {
    const total = progress.porLivro[nome].total
    const map = byBook.get(nome)
    let max = null
    for (let ch = 1; ch <= total; ch++) {
      const iso = map?.get(ch)
      if (!iso) { max = null; break }
      if (!max || iso > max) max = iso
    }
    dates[nome] = max
  }
  return dates
}

export function livrosStats(progress, completionDates) {
  const dated = []
  let undated = 0
  for (const nome of progress.completos) {
    if (completionDates[nome]) dated.push(completionDates[nome])
    else undated++
  }
  return { value: progress.completos.length, datedSorted: sortIso(dated), undated }
}

// Blocos: completo quando todos os livros estão completos; data = a maior
// data de conclusão dos livros, só se todas forem conhecidas.
export function blockStates(progress, completionDates) {
  return GAMIFICATION_BLOCKS.map(block => {
    const bp = progress.porBloco.find(b => b.id === block.id)
    let earnedAt = null
    if (bp.completo) {
      let max = null
      for (const livro of block.livros) {
        const iso = completionDates[livro.nome]
        if (!iso) { max = null; break }
        if (!max || iso > max) max = iso
      }
      earnedAt = max
    }
    return { id: block.id, nome: block.nome, completo: bp.completo, earnedAt, livrosCompletos: bp.livrosCompletos, livrosTotal: bp.livrosTotal }
  })
}

// ── Constância ─────────────────────────────────────────────────────────
export function constanciaStats(metWeeks) {
  return {
    value: metWeeks.length,
    datedSorted: metWeeks.map(w => dayKeyToIso(w.metOnKey)).sort(),
    undated: 0,
  }
}

// ── Famílias ───────────────────────────────────────────────────────────
// Estado de uma família a partir do valor atual e de uma função
// `dateFor(limiar)` (ISO ou null se desconhecida):
//   degrau      — quantos limiares já cruzados (0–6);
//   next        — próximo degrau {degrau, limiar, nome} ou null;
//   remaining   — quanto falta pro próximo;
//   progress    — 0–1 entre o degrau atual e o próximo (barra de G5/G6);
//   ratio       — value/limiar do próximo (critério de "a mais perto");
//   earned      — [{degrau, limiar, nome, earnedAt}] dos já ganhos.
export function familyState(family, value, dateFor) {
  const earned = []
  for (const d of family.degraus) {
    if (value >= d.limiar) earned.push({ ...d, earnedAt: dateFor(d.limiar) })
  }
  const degrau = earned.length
  const next = family.degraus[degrau] ?? null
  const prevLimiar = degrau > 0 ? family.degraus[degrau - 1].limiar : 0
  const progress = next ? Math.max(0, Math.min(1, (value - prevLimiar) / (next.limiar - prevLimiar))) : 1
  return {
    id: family.id, nome: family.nome, unidade: family.unidade, unidadeSingular: family.unidadeSingular,
    value, degrau, next,
    remaining: next ? next.limiar - value : 0,
    progress,
    ratio: next ? value / next.limiar : 1,
    earned,
    degraus: family.degraus,
  }
}

// Tudo de uma vez — a entrada de computeEarnedAchievements e das telas.
// `stats` = { progress, completedSet, chapterRows, sessionRows,
//             intentionRows, myRequestIds, dailyRoutine, goalHistory,
//             weeklyGoalDays, today }.
export function computeFamilyStates(stats) {
  const { progress, completedSet, chapterRows, sessionRows, intentionRows, myRequestIds, dailyRoutine, goalHistory, weeklyGoalDays, today = new Date() } = stats
  const metWeeks = computeMetWeeks(dailyRoutine, goalHistory, weeklyGoalDays, today)
  const constancia = constanciaStats(metWeeks)
  const leitura = leituraStats(progress, completedSet, chapterRows)
  const tempo = tempoStats(sessionRows)
  const oracao = oracaoStats(intentionRows, myRequestIds)
  const completionDates = bookCompletionDates(progress, chapterRows)
  const livros = livrosStats(progress, completionDates)

  const byId = {
    constancia: familyState(FAMILIES[0], constancia.value, k => thresholdDate(constancia.datedSorted, constancia.undated, k)),
    leitura: familyState(FAMILIES[1], leitura.value, k => thresholdDate(leitura.datedSorted, leitura.undated, k)),
    tempo: familyState(FAMILIES[2], tempo.value, h => tempo.dateForHours(h)),
    oracao: familyState(FAMILIES[3], oracao.value, k => thresholdDate(oracao.datedSorted, oracao.undated, k)),
    livros: familyState(FAMILIES[4], livros.value, k => thresholdDate(livros.datedSorted, livros.undated, k)),
  }
  return {
    families: FAMILIES.map(f => byId[f.id]),
    blocks: blockStates(progress, completionDates),
    completionDates,
    metWeeks,
    totalSeconds: tempo.totalSeconds,
  }
}

// ── Ritmo das últimas 8 semanas e "próxima em {mês}" (HANDOFF §5.3) ───
// Unidades ganhas nos últimos 56 dias, por família, a partir das mesmas
// fontes datadas. Devolve unidades por mês (30 dias).
const EIGHT_WEEKS_DAYS = 56

function countSince(datedSorted, sinceIso) {
  let n = 0
  for (const iso of datedSorted) if (iso >= sinceIso) n++
  return n
}

export function familyRatePerMonth(familyId, stats, states, today = new Date()) {
  const since = new Date(today.getFullYear(), today.getMonth(), today.getDate() - EIGHT_WEEKS_DAYS).toISOString()
  const perMonth = n => (n / EIGHT_WEEKS_DAYS) * 30
  if (familyId === 'constancia') return perMonth(states.metWeeks.filter(w => dayKeyToIso(w.metOnKey) >= since).length)
  if (familyId === 'leitura') return perMonth(countSince(leituraStats(stats.progress, stats.completedSet, stats.chapterRows).datedSorted, since))
  if (familyId === 'tempo') {
    const secs = (stats.sessionRows ?? []).filter(r => r?.segundos > 0 && dayKeyToIso(r.data) >= since).reduce((s, r) => s + r.segundos, 0)
    return perMonth(secs / 3600)
  }
  if (familyId === 'oracao') return perMonth(countSince(oracaoStats(stats.intentionRows, stats.myRequestIds).datedSorted, since))
  if (familyId === 'livros') return perMonth(Object.values(states.completionDates).filter(iso => iso && iso >= since).length)
  return 0
}

// Meses até o próximo limiar no ritmo dado; null se não dá pra estimar
// (ritmo zero, mais de 36 meses, ou família completa).
export const MAX_ESTIMATE_MONTHS = 36
export function monthsToNext(remaining, ratePerMonth) {
  if (remaining <= 0 || !ratePerMonth || ratePerMonth <= 0) return null
  const months = remaining / ratePerMonth
  return months > MAX_ESTIMATE_MONTHS ? null : months
}

// A data (Date) a `months` meses de hoje — quem mostra formata o mês.
export function dateInMonths(months, today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  d.setDate(d.getDate() + Math.round(months * 30))
  return d
}

// Livro em ordem canônica cujo nome é `nome` — exportado pra G8/G10
// montarem "{posição}/66" sem repetir a busca.
export function bookPosition(nome) {
  return GAMIFICATION_BOOKS.find(b => b.nome === nome)?.posicao ?? null
}
