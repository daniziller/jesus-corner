// Vocabulário fixo de temas/tags pra estudos do banco (26f "Tema", 26g
// busca por tema) — não vem de nenhum dado real, é só a lista de opções
// que aparece nos dois seletores (mesmo espírito de WEEKLY_DAYS_PRESETS em
// weeklyDaysMath.js: uma constante de UI, não um dado bíblico ou de
// usuário). Cobre os exemplos do próprio mockup (26f: Perdão/Família;
// 26g: Perdão/Ansiedade/Casamento/Luto/Dinheiro/Salmos).
export const STUDY_THEMES = [
  { id: 'perdao', pt: 'Perdão', en: 'Forgiveness' },
  { id: 'familia', pt: 'Família', en: 'Family' },
  { id: 'ansiedade', pt: 'Ansiedade', en: 'Anxiety' },
  { id: 'casamento', pt: 'Casamento', en: 'Marriage' },
  { id: 'luto', pt: 'Luto', en: 'Grief' },
  { id: 'dinheiro', pt: 'Dinheiro', en: 'Money' },
  { id: 'salmos', pt: 'Salmos', en: 'Psalms' },
  { id: 'sabedoria', pt: 'Sabedoria', en: 'Wisdom' },
  { id: 'fe', pt: 'Fé', en: 'Faith' },
  { id: 'proposito', pt: 'Propósito', en: 'Purpose' },
  { id: 'saude', pt: 'Saúde', en: 'Health' },
  { id: 'relacionamentos', pt: 'Relacionamentos', en: 'Relationships' },
]

export function studyThemeLabel(id, lang) {
  const theme = STUDY_THEMES.find(t => t.id === id)
  if (!theme) return id
  return lang === 'en' ? theme.en : theme.pt
}
