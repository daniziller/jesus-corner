// meusEstudosMath.js — as ações de "Meus estudos" na tela Estudos (vieram
// da Biblioteca antiga, tela 4c), parte pura: os estudos guardados com a
// ação que cada um aceita (apagar, ou tirar da lista), os publicados por
// mim e os convites de amigos. Testes em scripts/test-meus-estudos.mjs.

// Os estudos guardados da pessoa, fora o que está em andamento: os que
// ela criou ou adotou (`ai`) e os indutivos, sempre; os do catálogo
// pronto, só os que ela já começou. `isDone(studyId, sessionId)` diz se
// uma sessão está feita.
export function savedStudyEntries({ ai = [], inductive = [], catalog = [], isDone = () => false, activeStudyId = null } = {}) {
  const entry = (study, kind) => {
    const sessions = study.sessions ?? []
    return { id: study.id, kind, study, total: sessions.length, done: sessions.filter(s => isDone(study.id, s.id)).length, sessionIds: sessions.map(s => s.id) }
  }
  return [
    ...ai.map(study => entry(study, 'ai')),
    ...inductive.map(study => entry(study, 'inductive')),
    ...catalog.map(study => entry(study, 'catalog')).filter(e => e.done > 0),
  ].filter(e => e.id !== activeStudyId)
}

// O que "tirar" um estudo guardado quer dizer: o que é da pessoa (criado,
// adotado ou indutivo) é apagado inteiro; um estudo do catálogo é conteúdo
// fixo do app — só o progresso é zerado, e ele sai da lista.
export function removalOf(entry) {
  return entry.kind === 'catalog'
    ? { action: 'clear', labelKey: 'clearBtn', confirmKey: 'clearConfirm' }
    : { action: 'delete', labelKey: 'deleteBtn', confirmKey: 'deleteConfirm' }
}

// A linha de apoio de um estudo do catálogo já começado: "2 de 10 feitos".
export function progressLine(entry) {
  return { key: entry.done === 1 ? 'progressOne' : 'progressMany', vars: { n: entry.done, total: entry.total } }
}

// A linha de um estudo que publiquei: quem vê e quantas pessoas fizeram.
export function publishedLine(study) {
  const n = study.usesCount ?? 0
  const who = study.visibility === 'public' ? 'Public' : 'Invited'
  return { key: `published${who}${n === 0 ? 'None' : n === 1 ? 'One' : 'Many'}`, vars: { n } }
}

// Um convite de amigo: ainda por aceitar ("Aceitar") ou já aceito
// ("Continuar").
export function inviteRow({ status, study }) {
  return { id: study.id, title: study.title, authorName: study.authorName ?? '', pending: status === 'invited', study }
}

// Filtra pelo que está digitado no campo da tela (título ou autor).
export function matchesStudyQuery(query, { title = '', authorName = '' } = {}) {
  const q = String(query ?? '').trim().toLowerCase()
  return !q || String(title ?? '').toLowerCase().includes(q) || String(authorName ?? '').toLowerCase().includes(q)
}
