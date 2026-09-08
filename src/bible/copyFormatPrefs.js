// copyFormatPrefs.js — "o último formato usado fica selecionado na
// próxima vez" (39g, pacote 39). localStorage puro (preferência de
// aparelho, não precisa sincronizar entre dispositivos — mesmo padrão de
// bibleVersionSelection.js).
const KEY = 'jc_verse_copy_format'
const VALID = ['full', 'textOnly', 'refOnly']

export function getLastCopyFormat() {
  try {
    const v = localStorage.getItem(KEY)
    return VALID.includes(v) ? v : 'full'
  } catch {
    return 'full'
  }
}

export function setLastCopyFormat(format) {
  if (!VALID.includes(format)) return
  try {
    localStorage.setItem(KEY, format)
  } catch {
    // localStorage indisponível (modo privado etc.) — preferência não
    // persiste, mas a folha continua funcionando normalmente.
  }
}
