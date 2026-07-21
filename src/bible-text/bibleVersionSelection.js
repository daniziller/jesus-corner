import { BIBLE_VERSIONS } from '../data/bibleVersions'

// Preferência de versão bíblica por idioma — mesmo padrão de
// appLanguageStore.js/textScaleStore.js (localStorage, por dispositivo).
// Sem valor salvo ainda (ou idioma sem essa versão mais), cai na 1a versão
// da lista daquele idioma (ver BIBLE_VERSIONS).
const KEY = 'jc_bible_version'

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

export function getSelectedVersionId(lang) {
  const versions = BIBLE_VERSIONS[lang] ?? []
  const saved = readMap()[lang]
  if (saved && versions.some(v => v.id === saved)) return saved
  return versions[0]?.id
}

export function setSelectedVersionId(lang, versionId) {
  const map = readMap()
  map[lang] = versionId
  localStorage.setItem(KEY, JSON.stringify(map))
}
