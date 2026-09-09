import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
if ('serviceWorker' in navigator) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
