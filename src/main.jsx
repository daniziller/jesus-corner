import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

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
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  const reloadWhenHidden = () => {
    if (reloaded || !document.hidden) return
    reloaded = true
    window.location.reload()
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return
    if (document.hidden) reloadWhenHidden()
    else document.addEventListener('visibilitychange', reloadWhenHidden)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
