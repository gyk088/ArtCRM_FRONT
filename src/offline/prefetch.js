// Подготовка к работе без интернета: пока сеть есть, в фоне загружаем
// основные списки (они сохраняются кешем API — см. apiCache.js) и
// миниатюры работ (их сохраняет service worker). Тогда офлайн откроются
// даже те разделы, в которые с сетью не заходили.
import apiClient from '@/services/api.js'
import { getToken } from '@/services/auth.js'
import { idbGet, idbPut } from './db.js'
import { network } from './network.js'

// не чаще, чем раз в столько минут
const EVERY_MINUTES = 10

const LISTS = [
  '/api/v1/art/art-objects',
  '/api/v1/art/artists',
  '/api/v1/art/statuses',
  '/api/v1/art/serias',
  '/api/v1/art/media',
  '/api/v1/art/locations',
  '/api/v1/art/tags',
  '/api/v1/collections',
  '/api/v1/collections/folder',
  '/api/v1/exhibitions',
  '/api/v1/contacts',
  '/api/v1/contacts/categories',
  '/api/v1/contacts/sources',
  '/api/v1/notes',
  '/api/v1/reports',
  '/api/v1/tasks/boards',
  '/api/v1/tasks/statuses',
  '/api/v1/file/folder',
  '/api/v1/sales/sellers',
]

const MAX_THUMBS = 3000
const THUMB_CONCURRENCY = 4

let running = false

// true — миниатюры загружены (их сохранил service worker)
async function prefetchThumbs(urls) {
  // сохраняет service worker (runtimeCaching artcrm-thumbs) — пока он не
  // управляет страницей (первый запуск), смысла нет: попробуем в следующий раз
  if (!navigator.serviceWorker?.controller) return false
  const queue = [...new Set(urls)].slice(0, MAX_THUMBS)
  const worker = async () => {
    while (queue.length && network.online) {
      const url = queue.shift()
      try {
        await fetch(url, { credentials: 'same-origin' })
      } catch {
        // нет сети — остановимся на следующей итерации
      }
    }
  }
  await Promise.all(Array.from({ length: THUMB_CONCURRENCY }, worker))
  return true
}

export async function prefetchForOffline({ force = false } = {}) {
  if (running || !getToken() || !navigator.onLine) return
  running = true
  try {
    const last = await idbGet('meta', 'prefetchedAt').catch(() => null)
    if (!force && last && Date.now() - last < EVERY_MINUTES * 60 * 1000) return

    const thumbs = []
    const soldIds = []
    for (const url of LISTS) {
      if (!navigator.onLine) return
      try {
        const { data } = await apiClient.get(url)
        if (url === '/api/v1/art/art-objects' && Array.isArray(data)) {
          for (const w of data) if (w?.avatar?.thumb_url) thumbs.push(w.avatar.thumb_url)
          soldIds.push(...data.filter(w => w?.sale).map(w => w.id))
        }
      } catch {
        // раздел недоступен этой роли и т.п. — пропускаем
      }
    }
    // продажи проданных работ — чтобы офлайн в карточке работы был виден блок «Продажа»
    for (const id of soldIds.slice(0, 1000)) {
      if (!navigator.onLine) break
      try { await apiClient.get(`/api/v1/sales/art/${id}/list`) } catch { /* пропускаем */ }
    }
    // время подготовки запоминаем, только если и миниатюры удалось сохранить —
    // иначе (service worker ещё не подключился) повторим при следующем запуске
    if (await prefetchThumbs(thumbs)) await idbPut('meta', Date.now(), 'prefetchedAt').catch(() => {})
  } finally {
    running = false
  }
}

// Запустить подготовку: при старте (с паузой, чтобы не мешать первой
// загрузке экрана), при возвращении сети и периодически
export function startOfflinePrefetch() {
  const run = () => prefetchForOffline().catch(() => {})
  setTimeout(run, 4000)
  // service worker только что подключился (первый запуск) — догрузить миниатюры
  navigator.serviceWorker?.addEventListener('controllerchange', () => setTimeout(run, 1000))
  window.addEventListener('online', () => setTimeout(run, 2000))
  setInterval(run, EVERY_MINUTES * 60 * 1000)
}
