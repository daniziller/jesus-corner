// Sistema de níveis: substitui "horas de leitura" como medida de progresso.
// XP vem de capítulos lidos, livros e blocos concluídos (ver computeGamificationStats).
export const LEVELS = [
  { level: 1,  minXp: 0,     title: { pt: 'Semente',                         en: 'Seed' },                          icon: 'Sprout' },
  { level: 2,  minXp: 300,   title: { pt: 'Aprendiz da Palavra',             en: 'Word Apprentice' },               icon: 'BookOpen' },
  { level: 3,  minXp: 800,   title: { pt: 'Discípulo',                       en: 'Disciple' },                      icon: 'Cross' },
  { level: 4,  minXp: 1600,  title: { pt: 'Estudioso das Escrituras',        en: 'Scripture Scholar' },             icon: 'Search' },
  { level: 5,  minXp: 3000,  title: { pt: 'Conhecedor da Palavra',           en: 'Knower of the Word' },            icon: 'Scroll' },
  { level: 6,  minXp: 5000,  title: { pt: 'Guardião da Fé',                  en: 'Guardian of the Faith' },         icon: 'Shield' },
  { level: 7,  minXp: 8000,  title: { pt: 'Mestre das Escrituras',           en: 'Master of the Scriptures' },      icon: 'GraduationCap' },
  { level: 8,  minXp: 12000, title: { pt: 'Sábio',                          en: 'Sage' },                          icon: 'Bird' },
  { level: 9,  minXp: 17000, title: { pt: 'Fiel Servo da Palavra',          en: 'Faithful Servant of the Word' },  icon: 'Feather' },
  { level: 10, minXp: 22000, title: { pt: 'Conhecedor Pleno das Escrituras', en: 'Full Knower of the Scriptures' }, icon: 'Crown' },
]

function resolveLevel(l, lang) {
  return { ...l, title: l.title[lang] ?? l.title.pt }
}

export function levelFor(xp, lang = 'pt') {
  let current = LEVELS[0]
  for (const l of LEVELS) if (xp >= l.minXp) current = l
  return resolveLevel(current, lang)
}

export function levelProgress(xp, lang = 'pt') {
  const currentRaw = (() => { let c = LEVELS[0]; for (const l of LEVELS) if (xp >= l.minXp) c = l; return c })()
  const current = resolveLevel(currentRaw, lang)
  const nextRaw = LEVELS[LEVELS.indexOf(currentRaw) + 1] ?? null
  if (!nextRaw) return { current, next: null, percent: 100, xpIntoLevel: xp - current.minXp, xpForNext: 0 }

  const next = resolveLevel(nextRaw, lang)
  const span = next.minXp - current.minXp
  const xpIntoLevel = xp - current.minXp
  return { current, next, percent: Math.min(100, Math.round((xpIntoLevel / span) * 100)), xpIntoLevel, xpForNext: span - xpIntoLevel }
}
