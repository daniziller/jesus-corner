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
      includeAssets: ['icons/*.png'],
      manifest: {
        name: "Jesus' Corner",
        short_name: "Jesus' Corner",
        description: 'Seu tempo. Sua rotina. Sua conexão com Deus.',
        theme_color: '#121212',
        background_color: '#121212',
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            // Texto bíblico (public/bible-text/) — não entra no precache de
            // instalação (globPatterns não inclui .json), só fica disponível
            // offline depois que a pessoa abre aquele livro pela 1a vez.
            //
            // Nome do cache com sufixo de versão (-v2): o formato do JSON
            // mudou (de {versículo: texto} pra {verses, breaks}) sem mudar a
            // URL do arquivo — com CacheFirst e 1 ano de validade, quem já
            // tinha aberto o app antes ficava preso pra sempre no formato
            // velho (tela branca, o código novo não reconhecia o shape
            // antigo). Trocar o nome força buscar tudo de novo da rede; se o
            // formato mudar de novo no futuro, sobe esse número de novo.
            urlPattern: /\/bible-text\/.*\.json$/,
            handler: 'CacheFirst',
            options: { cacheName: 'bible-text-cache-v2', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ]
})
