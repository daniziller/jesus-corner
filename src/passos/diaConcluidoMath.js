// diaConcluidoMath.js — a parte pura do dia concluído (handoff-passos-
// pedidos-53-54 §6, S5): o que a pessoa fez e o que mudou. Tudo aqui é
// número real — os segundos registrados de cada passo hoje, a semana, o
// livro, a Bíblia.
import { stepName } from '../meuPlano/meuPlanoMath.js'
import { formatInt, formatPct, deOf, plural } from '../gamification/format.js'

const minutesOf = seconds => Math.round(Math.max(0, seconds ?? 0) / 60)

// "32 minutos / com Deus." — as duas linhas do topo. Qualquer tempo
// registrado conta pelo menos 1 minuto; sem tempo registrado nenhum (os
// passos foram marcados sem relógio), a tela não inventa um número.
export function minutesHeadline(totalSeconds) {
  if (!(totalSeconds > 0)) return ['Seu tempo', 'com Deus.']
  const n = Math.max(1, minutesOf(totalSeconds))
  return [`${formatInt(n)} ${plural(n, 'minuto', 'minutos')}`, 'com Deus.']
}

// "Gênesis 41" · "Gênesis 40–41" — o trecho lido hoje, pela sessão do
// plano. A reflexão de fechamento de livro não é um trecho.
export function readingLabel(readingSession) {
  if (!readingSession?.book || readingSession.type === 'reflection') return ''
  const { book, chStart, chEnd } = readingSession
  return chStart === chEnd || chEnd == null ? `${book} ${chStart}` : `${book} ${chStart}–${chEnd}`
}

// O dia do estudo que foi feito hoje: depois de concluído, é o número de
// dias feitos; antes disso, o dia da vez.
export function studyDayDone(study) {
  if (!study) return null
  return Math.min(study.dayTotal, Math.max(1, study.dayDone || study.dayN || 1))
}

// As linhas do cartão preto, uma por passo feito, e a barra do dia: `flex`
// são os minutos reais do passo (no mínimo um fio, pra o passo sem tempo
// registrado não sumir da barra) e `minutes` o texto à direita ("17 min";
// vazio quando o passo não tem tempo registrado — o estudo, hoje).
// seconds: { prayer, reading, reflection } de hoje.
export function dayRows({ steps, seconds, reading = '', study = null }) {
  return (steps ?? []).map(key => {
    const secs = seconds?.[key] ?? 0
    const n = secs > 0 ? Math.max(1, minutesOf(secs)) : 0
    const detail = key === 'reading' ? reading : key === 'study' && study ? `${study.title}, dia ${studyDayDone(study)}` : ''
    return {
      key,
      name: detail ? `${stepName(key)} · ${detail}` : stepName(key),
      minutes: n ? `${formatInt(n)} min` : '',
      flex: Math.max(1, n),
    }
  })
}

// Os três números. O do meio é o livro lido hoje ("41 de 50" / "em
// Gênesis", na cor do bloco); em dia sem leitura, o estudo ("dia 2 de 7" /
// "no estudo"); sem um nem outro, não aparece.
// week: { feitos, meta } — a mesma conta do contador de semanas.
// book: { name, lidos, total, blocoId } | null.
export function dayNumbers({ week, book = null, study = null, biblePercent = 0 }) {
  const middle = book
    ? { key: 'book', value: deOf(book.lidos, book.total), caption: `em ${book.name}`, blocoId: book.blocoId }
    : study
      ? { key: 'study', value: `dia ${deOf(studyDayDone(study), study.dayTotal)}`, caption: 'no estudo' }
      : null
  return [
    week ? { key: 'week', value: deOf(week.feitos, week.meta), caption: 'dias nesta semana' } : null,
    middle,
    { key: 'bible', value: formatPct(biblePercent ?? 0), caption: 'da Bíblia' },
  ].filter(Boolean)
}

// A frase de hoje, entre aspas — ou nada: sem frase escrita hoje, o
// cartão não aparece.
export function dayPhrase(text) {
  const clean = String(text ?? '').trim()
  return clean ? `"${clean}"` : null
}
