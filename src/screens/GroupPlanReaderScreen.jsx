// GroupPlanReaderScreen.jsx — leitura de um Plano do grupo (22d) já
// aceito. Mesma ideia do leitor de plano por tema em ThemePlanScreen.jsx
// (monta um "bloco" sintético em memória e reaproveita ReadingBlockView de
// verdade), só que sem lista/exclusão própria — plano de grupo não é "meu"
// pra apagar, só recebido e lido (ver src/groups/groupPlansStore.js). Ler
// aqui conta pro progresso geral da Bíblia igual qualquer outra leitura
// (mesma chave livro:capítulo de sempre, completedSet compartilhado).
import { deriveThemeTexts, themeTextKey } from '../themePlans/themeTexts'
import { sessionKeys } from '../utils/progress'
import ReadingBlockView from './ReadingBlockView'

export default function GroupPlanReaderScreen({ session, authUser, completedSet, plan, onToggleSession, onToggleChapter, onNavigate, onBack, onGoToReflectionFrom }) {
  // Só acontece se o plano foi deletado/recusado entre o momento de tocar
  // "Continuar leitura" e esta tela montar — sem plano, não tem o que ler.
  if (!plan) return null

  const texts = deriveThemeTexts(plan.passages).map(s => ({
    ...s,
    status: sessionKeys(s).every(k => completedSet.has(k)) ? 'done' : 'pending',
  }))
  const syntheticBlock = {
    id: `group:${plan.id}`, name: plan.title, nameEn: plan.title, sessionsTotal: texts.length,
  }

  return (
    <ReadingBlockView
      session={session}
      authUser={authUser}
      onNavigate={onNavigate}
      blockId={syntheticBlock.id}
      blocks={[syntheticBlock]}
      sessionsByBlock={{ [syntheticBlock.id]: texts }}
      mode="session"
      completedSet={completedSet}
      onToggleSession={onToggleSession}
      onToggleChapter={onToggleChapter}
      onBack={onBack}
      onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'groupPlanReader', planId: plan.id, keys: [themeTextKey(heroSession)], book: heroSession.book, bookEn: heroSession.bookEn, chStart: heroSession.chStart, chEnd: heroSession.chEnd, words: heroSession.words, type: heroSession.type })}
    />
  )
}
