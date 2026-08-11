// "Não me notificar enquanto eu estiver aqui" (toggle em RoutineScreen.jsx)
// — pausa só a EXIBIÇÃO da notificação push enquanto o app já está aberto
// em alguma aba/janela no momento em que ela chega; não mexe na inscrição
// em si (isso é o toggle "Lembretes" do Perfil, que liga/desliga de vez).
//
// Guardado em IndexedDB, não localStorage: quem precisa ler esse valor é o
// service worker (ver 'push' em src/sw.js), na hora que a notificação
// chega — e o worker não enxerga localStorage da página, só IndexedDB
// (compartilhado entre página e worker no mesmo domínio).
const DB_NAME = 'jc-prefs'
const STORE_NAME = 'kv'
const KEY = 'muteWhileOpen'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getMuteWhileOpen() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(KEY)
    req.onsuccess = () => resolve(req.result === true)
    req.onerror = () => reject(req.error)
  })
}

export async function setMuteWhileOpen(value) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
