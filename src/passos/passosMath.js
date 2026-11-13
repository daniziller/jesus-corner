// passosMath.js — a parte pura das telas de dentro do plano (handoff-
// passos-pedidos-53-54, S1–S5): a barra do dia, o cabeçalho do passo, o
// relógio, e a oração ACTS (trilha das etapas, rótulos, botões e as
// pastilhas de frase). As telas só mostram o que sai daqui.
import { stepName } from '../meuPlano/meuPlanoMath.js'
import { formatClock } from '../timer/formatClock.js'

// ── A barra do dia e o cabeçalho ────────────────────────────────────────

// Os passos de hoje com o passo que está na tela. Um passo feito fora do
// plano de hoje (dia de descanso, passo desligado) aparece sozinho — é o
// mesmo critério de "passo 1 de 1" que as telas já usavam.
export function stepPosition(todaysSteps, key) {
  const keys = (todaysSteps ?? []).includes(key) ? todaysSteps : [key]
  return { keys, n: keys.indexOf(key) + 1, total: keys.length }
}

// Um segmento por passo de hoje, com `minutes` (o flex) e o estado:
// 'done' (feito), 'now' (o passo que está na tela) ou 'upcoming'. É a
// mesma barra do Meu Plano; lá o "agora" é o primeiro não feito, aqui é o
// passo aberto.
export function dayBarSegments({ todaysSteps, minutes, dayEntry, current }) {
  const { keys } = stepPosition(todaysSteps, current)
  return keys.map(key => ({
    key,
    minutes: Math.max(1, minutes?.[key] ?? 1),
    status: key === current ? 'now' : dayEntry?.[key] ? 'done' : 'upcoming',
  }))
}

// "Passo 1 de 3, Oração" — o texto alternativo da barra.
export function dayBarAria(todaysSteps, key) {
  const { n, total } = stepPosition(todaysSteps, key)
  return `Passo ${n} de ${total}, ${stepName(key)}`
}

// "Passo 1 de 3 · ACTS" — a linha de baixo do cabeçalho do passo.
export function stepSubtitle(todaysSteps, key, mode) {
  const { n, total } = stepPosition(todaysSteps, key)
  return `Passo ${n} de ${total}${mode ? ` · ${mode}` : ''}`
}

// ── O relógio ───────────────────────────────────────────────────────────

// O que a pílula mostra: o tempo que falta, "MM:SS"; zerado, passa a
// contar para cima (overtime), como o relógio sempre fez.
export function clockDisplay(totalSeconds, elapsedSeconds) {
  const remaining = Math.round(totalSeconds - elapsedSeconds)
  return { text: formatClock(Math.abs(remaining)), overtime: remaining < 0 }
}

// O que o leitor de tela ouve — muda de minuto em minuto, não a cada
// segundo.
export function clockAria(totalSeconds, elapsedSeconds, running) {
  const remaining = Math.round(totalSeconds - elapsedSeconds)
  const minutes = Math.ceil(Math.abs(remaining) / 60)
  const amount = `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  const base = remaining > 0
    ? `${minutes === 1 ? 'Falta' : 'Faltam'} ${amount}`
    : remaining === 0 ? 'Tempo previsto encerrado' : `Tempo previsto encerrado há ${amount}`
  return running ? `${base}. Toque para pausar.` : `${base}. Relógio pausado. Toque para continuar.`
}

// ── Oração ACTS (S1/S2) ─────────────────────────────────────────────────

// A trilha: cada etapa com o estado — 'done' (feita), 'now' (atual) ou
// 'upcoming'. `stages` é PRAYER_STAGES (prayer/prayerStages.js).
export function actsTrail(stages, currentIdx, lang = 'pt') {
  return stages.map((st, i) => ({
    id: st.id,
    name: st.title[lang] ?? st.title.pt,
    status: i < currentIdx ? 'done' : i === currentIdx ? 'now' : 'upcoming',
  }))
}

// "Etapa 2 de 4, Confissão" — o texto alternativo da trilha.
export function actsTrailAria(stages, currentIdx, lang = 'pt') {
  const st = stages[currentIdx]
  return `Etapa ${currentIdx + 1} de ${stages.length}, ${st.title[lang] ?? st.title.pt}`
}

// "2,5" · "3" · "3,8" — minutos de uma etapa, com uma casa quando precisa.
export function stageMinutes(seconds) {
  const rounded = Math.round((Math.max(0, seconds) / 60) * 10) / 10
  return String(rounded).replace('.', ',')
}

// "Etapa 2 de 4 · 2,5 min" — o rótulo do cartão preto (vira maiúscula por
// CSS).
export function stageCardLabel(currentIdx, total, stageSeconds) {
  return `Etapa ${currentIdx + 1} de ${total} · ${stageMinutes(stageSeconds)} min`
}

// O rodapé: "Pular" à esquerda; o botão laranja nomeia a próxima etapa e,
// na última, termina a oração.
export function actsFooter(stages, currentIdx, lang = 'pt') {
  const next = stages[currentIdx + 1]
  return {
    skip: 'Pular',
    last: !next,
    primary: next ? (next.title[lang] ?? next.title.pt) : 'Terminar a oração',
  }
}

// A frase de uma pastilha, do jeito que entra no campo: sem as reticências.
export function starterText(phrase) {
  return String(phrase ?? '').replace(/\s*(…|\.{3})\s*$/, '').trimEnd()
}

// Tocar numa pastilha escreve a frase no campo: campo vazio recebe a
// frase; campo com texto ganha a frase numa linha nova; a mesma frase de
// novo, logo depois de posta, não repete. Termina com um espaço — o
// cursor fica no fim, pronto pra continuar a frase.
export function insertStarter(text, phrase) {
  const start = starterText(phrase)
  if (!start) return text ?? ''
  const current = (text ?? '').replace(/\s+$/, '')
  if (!current) return `${start} `
  const lastLine = current.slice(current.lastIndexOf('\n') + 1).trim()
  if (lastLine === start) return `${current} `
  return `${current}\n${start} `
}
