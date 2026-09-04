import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    allowedHosts: ['.loca.lt'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest (em vez do generateSW padrão) porque o service worker
      // agora tem lógica própria — os listeners de push/notificationclick do
      // lembrete de leitura (ver src/sw.js) — que o generateSW não permite
      // adicionar, já que ele gera o arquivo inteiro sozinho.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: "Jesus' Corner",
        short_name: "Jesus' Corner",
        description: 'Seu tempo. Seu plano. Sua conexão com Deus.',
        // Marca Bento: tinta #1A1714 na barra do sistema; splash do PWA no
        // creme #EDE8E2 (mesmo fundo dos splashes iOS/Android).
        theme_color: '#1A1714',
        background_color: '#EDE8E2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        // 'any' e 'maskable' precisam ser arquivos DIFERENTES: o maskable é
        // recortado pelo sistema num círculo de 80% do lado, então a arte
        // dele é menor e o fundo sangra. Declarar o mesmo PNG pros dois
        // (como estava) fazia o Android cortar as pontas do ícone.
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      // globPatterns do precache de instalação — o runtime caching (fontes do
      // Google, texto bíblico) agora mora dentro de src/sw.js, já que
      // injectManifest não lê a chave `workbox.runtimeCaching` (isso é só
      // pro modo generateSW).
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Limite padrão é 2 MiB — o bundle principal (index-*.js) passou
        // disso conforme o app cresceu; sem isso o build da injectManifest
        // falha (não é sobre performance real, só sobre o que entra no
        // precache de instalação do service worker).
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      }
    })
  ]
})
