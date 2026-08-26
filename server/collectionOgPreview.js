// Express-middleware: отдаёт краулерам мессенджеров (WhatsApp, Telegram,
// iMessage, Facebook, Slack и т.п.) статичный HTML с правильными og-тегами
// для страницы /collection/:id, включая обложку коллекции.
//
// Зачем это нужно отдельно от SPA: эти краулеры парсят <meta>-теги из
// сырого HTML и НЕ выполняют JavaScript, поэтому Vue-компонент, который
// проставляет og:image динамически через document.head, для них не
// сработает — им нужен уже готовый HTML с этими тегами в ответе сервера.
//
// Как подключить (пример для Express, сервер раздаёт собранный SPA из dist/):
//
//   const { collectionOgPreviewMiddleware } = require('./server/collectionOgPreview')
//
//   app.get('/collection/:id', collectionOgPreviewMiddleware({
//     apiBaseUrl: 'https://artapi.myoffer.life',
//     siteBaseUrl: 'https://<ваш-домен-фронтенда>',
//     indexHtmlPath: path.join(__dirname, 'dist', 'index.html')
//   }))
//
// Это должно стоять ДО статической раздачи dist/ (express.static), но
// обрабатывать именно маршрут /collection/:id — для всех остальных путей
// обычная раздача SPA продолжает работать как раньше.

const fs = require('fs')
const https = require('https')

// User-Agent'ы краулеров, которым нужно отдать статичный HTML с og-тегами.
// Обычным браузерам (Chrome/Safari/Firefox/итп) middleware ничего не меняет —
// они получают обычный index.html и SPA работает как всегда.
const CRAWLER_UA_PATTERN = /facebookexternalhit|Facebot|Twitterbot|TelegramBot|WhatsApp|Slackbot|LinkedInBot|Discordbot|SkypeUriPreview|Pinterest|iMessageLinkPreview|Googlebot|vkShare/i

function isCrawlerRequest(userAgent) {
  return CRAWLER_UA_PATTERN.test(userAgent || '')
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        res.resume()
        reject(new Error(`Request failed with status ${res.statusCode}`))
        return
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Убираем HTML-теги из описания коллекции (оно хранится как rich text) —
// для og:description нужен обычный текст, без разметки.
function stripHtml(html) {
  return String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function renderOgHtml({ title, description, imageUrl, pageUrl }) {
  const safeTitle = escapeHtml(title || 'ArtCRM')
  const safeDescription = escapeHtml(stripHtml(description).slice(0, 200))
  const safeImage = escapeHtml(imageUrl || '')
  const safeUrl = escapeHtml(pageUrl || '')

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  ${safeImage ? `<meta property="og:image" content="${safeImage}" />` : ''}
  <meta property="og:url" content="${safeUrl}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  ${safeImage ? `<meta name="twitter:image" content="${safeImage}" />` : ''}
</head>
<body>
  <!-- Эта страница отдаётся только краулерам мессенджеров/соцсетей ради
       og-тегов. Обычные пользователи сюда не попадают — им отдаётся SPA. -->
  ${safeTitle}
</body>
</html>`
}

/**
 * @param {object} options
 * @param {string} options.apiBaseUrl   Базовый URL API, например 'https://artapi.myoffer.life'
 * @param {string} options.siteBaseUrl  Базовый URL фронтенда, например 'https://artcrm.example.com'
 * @param {string} options.indexHtmlPath Путь к собранному dist/index.html — отдаётся обычным браузерам
 */
function collectionOgPreviewMiddleware({ apiBaseUrl, siteBaseUrl, indexHtmlPath }) {
  return async function handler(req, res, next) {
    const userAgent = req.headers['user-agent']

    // Обычный браузер — просто отдаём SPA как обычно, ничего не меняем
    if (!isCrawlerRequest(userAgent)) {
      return next()
    }

    const collectionId = req.params.id

    try {
      const collection = await fetchJson(`${apiBaseUrl}/api/v1/collections/public/${collectionId}`)

      const html = renderOgHtml({
        title: collection.name || collection.artistOrGallery || 'ArtCRM',
        description: collection.description,
        imageUrl: collection.avatar?.url,
        pageUrl: `${siteBaseUrl}/collection/${collectionId}`
      })

      res.set('Content-Type', 'text/html; charset=utf-8')
      return res.send(html)
    } catch (error) {
      // Коллекция не найдена или API недоступно — отдаём обычный SPA,
      // краулер просто не увидит превью, но страница не сломается
      console.error('collectionOgPreviewMiddleware: failed to build og preview', error)
      return res.sendFile(indexHtmlPath)
    }
  }
}

module.exports = { collectionOgPreviewMiddleware, isCrawlerRequest }
