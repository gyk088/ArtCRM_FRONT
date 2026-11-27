import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'
import childProcess from "child_process"
let { version } = require("./package.json");

/* Для отображения версии приложения + коммита при запуске приложения */
try {
  version = `${version} rev. ${childProcess
    .execSync("git rev-parse --short HEAD")
    .toString()
    .trim()}`;
} catch (e) {
  // Если не удалось узнать хэш текущей фиксации, игнорируем ошибку.
}


// https://vite.dev/config/
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  console.log(mode)
  console.log(env.ARTCRM_BASE_URL)
  return {
    plugins: [
      vue(),
      vueDevTools(),
      // PWA: установка на телефон/компьютер и запуск без интернета.
      // Service worker хранит интерфейс (precache), картинки и шрифты.
      // Ответы API он НЕ кеширует — данные для офлайна хранит само
      // приложение (src/offline/), чтобы стирать их при выходе из аккаунта.
      VitePWA({
        registerType: 'prompt', // новая версия — спрашиваем, а не перезагружаем посреди работы
        injectRegister: false, // регистрируем сами (src/offline/pwa.js)
        includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'ArtCRM',
          short_name: 'ArtCRM',
          description: 'Работы, ссылки, продажи и клиенты галереи',
          lang: 'ru',
          start_url: '/home/dashboard',
          scope: '/',
          display: 'standalone',
          background_color: '#16151a',
          theme_color: '#16151a',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          // при первой установке сразу управлять открытой страницей (офлайн
          // работает без перезагрузки); обновления всё равно ждут «Обновить»
          clientsClaim: true,
          navigateFallback: '/index.html',
          // Это не страницы приложения: API, файлы и публичные страницы
          // ссылок/выставок/портфолио (их рендерит бэкенд)
          navigateFallbackDenylist: [/^\/api\//, /^\/files\//, /^\/static\//, /^\/collection\//, /^\/exhibition\//, /^\/portfolio\//],
          runtimeCaching: [
            {
              // миниатюры работ — их много и они маленькие
              urlPattern: ({ url }) => url.pathname.startsWith('/files/thumbs/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'artcrm-thumbs',
                expiration: { maxEntries: 5000, maxAgeSeconds: 90 * 24 * 3600 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // полные изображения — только те, что открывали
              urlPattern: ({ url, request }) => url.pathname.startsWith('/files/') && request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'artcrm-images',
                expiration: { maxEntries: 600, maxAgeSeconds: 60 * 24 * 3600, purgeOnQuotaError: true },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'artcrm-fonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 3600 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    define: {
      __MY_BASE_URL__: JSON.stringify(env.ARTCRM_BASE_URL),
      __MY_VERSION__: JSON.stringify(version),
    },
    css: {
      preprocessorOptions: {
        less: {
          modifyVars: {
            'primary-color': '#0EA47A',
          },
          javascriptEnabled: true,
        },
      },
    },
    server: {
      proxy: {
        // Публичная страница ссылки (SSR) и её статика живут на бэкенде —
        // в проде это делает nginx (art.myoffer.life -> 127.0.0.1:9999),
        // здесь то же самое для локальной разработки, чтобы
        // window.location.origin + '/collection/:id' работал одинаково
        // в обоих окружениях.
        '/collection': 'http://localhost:9999',
        '/exhibition': 'http://localhost:9999',
        '/static': 'http://localhost:9999',
      },
    },
  }
})

