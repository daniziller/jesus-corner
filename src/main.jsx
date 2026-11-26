import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { installAiConsentInterceptor } from './privacy/aiConsentGate'

// Recarrega a página sozinha quando um novo service worker assume o
// controle — achado corrigindo um caso real (2026-09-09): o registro do SW
// injetado pelo vite-plugin-pwa (dist/registerSW.js) só faz
// `navigator.serviceWorker.register(...)`, nada mais. src/sw.js já chama
// skipWaiting()/clients.claim() sozinho a cada deploy nada, então o SW novo
// assume o controle rápido — mas a ABA já aberta continua rodando o JS
// antigo (só uma navegação nova busca o HTML/bundle novo através do SW
// atualizado). Sem isso, alguém que deixa o app/PWA aberto por muito tempo
// nunca vê o código novo sozinho — precisa descobrir e limpar o cache do
// site manualmente, o que não é razoável pedir de ninguém. `reloaded` evita
// um loop (o evento pode disparar mais de uma vez em teoria).
//
// Duas correções (varredura 2026-11-15): na primeira visita não havia
// versão antiga nenhuma pra trocar, e mesmo assim a página recarregava
// sozinha segundos depois de abrir (quando o service worker terminava de
// instalar); e numa atualização a recarga caía no meio do uso, levando o
// que a pessoa estava digitando. Agora só recarrega se já havia uma versão
// controlando a página, e só quando ela não está à vista (trocou de app,
// bloqueou a tela) — na volta, já é o código novo.
//
// Mais duas (2026-11-26, caso real no PC): ao abrir o app depois de um
// deploy, o service worker antigo entrega o app antigo; o novo assume
// segundos depois, mas a aba do PC fica à vista o tempo todo, então a
// recarga "quando escondida" nunca vinha e a pessoa usou a versão velha
// inteira (e caiu no reconsentimento antigo, que o servidor recusa).
//   1. Se a pessoa ainda não mexeu na página (nenhum toque/tecla desde que
//      abriu), recarrega na hora — não há nada a perder.
//   2. Aba que fica aberta por horas: o navegador só procura SW novo ao
//      navegar (e no máximo a cada 24h). Agora procura ao voltar pra aba e
//      a cada 30 min.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  let interacted = false
  const markInteracted = () => { interacted = true }
  for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, markInteracted, { once: true, capture: true })
  const reload = () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  }
  const reloadWhenHidden = () => { if (document.hidden) reload() }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return
    if (document.hidden || !interacted) reload()
    else document.addEventListener('visibilitychange', reloadWhenHidden)
  })

  const checkForUpdate = () => {
    navigator.serviceWorker.getRegistration().then(reg => reg?.update()).catch(() => {})
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate() })
  setInterval(checkForUpdate, 30 * 60 * 1000)
}

// Pedido de consentimento da escrita assistida na hora do uso — ver
// src/privacy/aiConsentGate.js.
installAiConsentInterceptor()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
