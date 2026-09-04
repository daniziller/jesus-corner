// Retrospectiva do mês (quadro 17b) — "só mostra números que subiram".
//
// Não existe data por capítulo lido, então o app guarda um snapshot dos
// totais no primeiro uso de cada mês (user_data.monthly_snapshots, migration
// 0045). A retrospectiva do mês P é a diferença entre o snapshot tirado na
// entrada de P+1 e o tirado na entrada de P. Aparece uma vez (__shown) no
// primeiro dia em que a pessoa abre o app no mês seguinte.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'
import { computeRecentWeeksStatus } from '../routine/routineStreak'

export function monthKeyOf(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function prevMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  return monthKeyOf(new Date(y, m - 2, 1))
}

// Garante o snapshot do mês corrente e devolve a retrospectiva do mês
// anterior, se ela ainda não foi mostrada. `totals` vem do estado já
// carregado do app (ver App.jsx): { chaptersRead, readingSeconds,
// completedBooks: [nomes], highlights: [...], dailyRoutine, weeklyGoalDays }.
export async function ensureSnapshotAndGetDueRecap(totals, today = new Date()) {
  const key = monthKeyOf(today)
  const prev = prevMonthKey(key)
  return withRowLock(async () => {
    const row = await fetchRow()
    const snaps = { ...(row?.monthly_snapshots ?? {}) }
    const shown = new Set(snaps.__shown ?? [])
    if (!snaps[key]) {
      snaps[key] = {
        chapters: totals.chaptersRead,
        seconds: totals.readingSeconds,
        books: totals.completedBooks,
        takenAt: today.toISOString(),
      }
      await updateRow({ monthly_snapshots: snaps })
    }

    const base = snaps[prev]
    if (!base || shown.has(prev)) return null
    const cur = snaps[key]
    const [py, pm] = prev.split('-').map(Number)
    const monthStart = new Date(py, pm - 1, 1)
    const monthEnd = new Date(py, pm, 0, 23, 59, 59)
    const inMonth = iso => { const d = new Date(iso); return d >= monthStart && d <= monthEnd }

    // Semanas da meta cujo domingo cai dentro do mês.
    const weeks = computeRecentWeeksStatus(totals.dailyRoutine ?? {}, totals.weeklyGoalDays, 12, monthEnd)
      .filter(w => { const end = new Date(w.start); end.setDate(end.getDate() + 6); return end >= monthStart && end <= monthEnd })
    const highlightsInMonth = (totals.highlights ?? []).filter(h => !h.hidden && h.createdAt && inMonth(h.createdAt))
    // "O versículo que você mais voltou": o versículo marcado mais vezes no
    // mês; em empate, o mais recente.
    const counts = new Map()
    for (const h of highlightsInMonth) {
      for (const v of h.verses ?? []) {
        const k = `${h.book}|${h.bookEn ?? ''}|${h.chapter}|${v}`
        const e = counts.get(k) ?? { n: 0, last: '' }
        e.n += 1; if (h.createdAt > e.last) e.last = h.createdAt
        counts.set(k, e)
      }
    }
    let topVerse = null
    for (const [k, e] of counts) {
      if (!topVerse || e.n > topVerse.n || (e.n === topVerse.n && e.last > topVerse.last)) {
        const [book, bookEn, chapter, verse] = k.split('|')
        topVerse = { book, bookEn: bookEn || null, chapter: Number(chapter), verse: Number(verse), n: e.n, last: e.last }
      }
    }
    const booksFinished = (cur.books ?? []).filter(b => !(base.books ?? []).includes(b))

    return {
      month: prev,
      chapters: Math.max(0, (cur.chapters ?? 0) - (base.chapters ?? 0)),
      seconds: Math.max(0, (cur.seconds ?? 0) - (base.seconds ?? 0)),
      weeksMet: weeks.filter(w => w.met).length,
      weeksTotal: weeks.length,
      highlights: highlightsInMonth.length,
      booksFinished,
      topVerse,
    }
  })
}

export async function markRecapShown(monthKey) {
  return withRowLock(async () => {
    const row = await fetchRow()
    const snaps = { ...(row?.monthly_snapshots ?? {}) }
    const shown = new Set(snaps.__shown ?? [])
    shown.add(monthKey)
    snaps.__shown = [...shown]
    await updateRow({ monthly_snapshots: snaps })
  })
}
