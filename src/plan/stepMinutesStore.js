// Tempo por passo configurável, sincronizado por conta (item 2 da seção 5;
// telas 26d/15f) — prayer_minutes/reading_minutes/reflection_minutes
// (migration 0049), e study_minutes (migration 0058, turno 35 — Estudo
// deixa de ser só liga/desliga e ganha stepper próprio, ver 35c). Zero
// desliga o passo (some da rotina e do cabeçalho).
//
// Antes de existirem estas colunas, Oração e Reflexão já tinham preferência
// própria, mas só no aparelho: src/prayer/prayerDurationStore.js e
// src/reflection/reflectionDurationStore.js (chave em localStorage). Esta
// store é a versão de conta, que sincroniza entre aparelhos — as duas
// antigas continuam existindo por enquanto (as telas ainda chamam elas);
// Bloco 4 troca PrayerScreen/ReflectionScreen/AdjustPlanScreen pra usar
// esta aqui, com as duas antigas viram um fallback só pra convidado antes
// da primeira sincronização, depois saem de vez.
//
// reading_minutes não tem consumidor ainda: hoje o trecho diário de leitura
// vem do "ritmo" (Leve/Padrão/Intensivo/Livre — ver src/data/bibleBlocks.js
// PLANS), não de um número de minutos livre. Bloco 4 decide, com a autora,
// se 26d/15f substituem o seletor de ritmo por este número ou convivem os
// dois — por enquanto esta coluna só existe pra 26d/15f terem onde salvar
// e a projeção (readingProjection.js) já poder usá-la quando presente.
import { fetchRow, updateRow } from '../backend/userDataStore'

const STEPS = ['prayer', 'reading', 'study', 'reflection']
const COLUMN = { prayer: 'prayer_minutes', reading: 'reading_minutes', study: 'study_minutes', reflection: 'reflection_minutes' }

// { prayer, reading, study, reflection } em minutos — null pra um passo
// significa "sem preferência salva ainda" (quem chama decide o padrão:
// 10/—/—/5, ver telas). 0 é uma resposta válida (passo desligado), diferente
// de null.
export async function getStepMinutes() {
  const row = await fetchRow()
  return {
    prayer: row?.prayer_minutes ?? null,
    reading: row?.reading_minutes ?? null,
    study: row?.study_minutes ?? null,
    reflection: row?.reflection_minutes ?? null,
  }
}

// Salva um ou mais passos de uma vez — ex: setStepMinutes({ prayer: 10,
// reflection: 5 }). Cada valor precisa ser null (sem preferência) ou um
// inteiro entre 0 e 60 (mesma faixa do banco).
export async function setStepMinutes(patch) {
  const columnPatch = {}
  for (const step of STEPS) {
    if (!(step in patch)) continue
    const value = patch[step]
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > 60)) {
      throw new Error(`${step}_minutes precisa ser null ou um inteiro entre 0 e 60`)
    }
    columnPatch[COLUMN[step]] = value
  }
  if (Object.keys(columnPatch).length === 0) return
  await updateRow(columnPatch)
}

export function isStepEnabled(minutes) {
  return minutes == null || minutes > 0
}
