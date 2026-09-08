// formatCopyText.js — os três formatos de 39g. `ref` já vem pronto
// ("Salmos 23:4"); a versão entra sempre junto quando a referência
// aparece ("a versão vai sempre junto quando a referência entra",
// HANDOFF).
export function formatCopyText(format, text, ref, versionShort) {
  const refWithVersion = versionShort ? `${ref} (${versionShort})` : ref
  if (format === 'textOnly') return `"${text}"`
  if (format === 'refOnly') return refWithVersion
  return `"${text}" — ${refWithVersion}`
}
