// Офлайн для чтения: каждый успешный GET-запрос к API сохраняется на
// устройстве; если сети нет (или сервер недоступен) — отдаётся сохранённый
// ответ. Работает для всех сторов сразу: встраивается в axios-клиент как
// обёртка над адаптером, сами сторы ничего об этом не знают.
//
// Ответ «из сохранённого» помечен заголовком x-offline: 1 (и временем
// сохранения в x-offline-cached-at); собранный из списка (см. DERIVED) —
// ещё и x-offline-partial: 1.
import axios from 'axios'
import { idbGet, idbPut } from './db.js'
import { markOffline, markOnline } from './network.js'
import { getUser } from '@/services/auth.js'
import { enqueue, matchRule, newKey } from './outbox.js'

// GET с сохранённым ответом не ждём дольше этого — на плохой связи лучше
// быстро показать сохранённое, чем крутить загрузку минуту
const GET_TIMEOUT_WITH_CACHE = 12000

// Сервер недоступен (сети нет, обрыв, nginx/бэкенд лежит)
function isNetworkFailure(error) {
  if (!error) return false
  if (!error.response) return true
  return [502, 503, 504].includes(error.response.status)
}

function cacheKey(client, config) {
  const userId = getUser()?.id || 'anon'
  return `${userId}|${client.getUri({ ...config, baseURL: '' })}`
}

// Записи, которые можно взять из сохранённого общего списка, если сама
// запись ни разу не открывалась с сетью (у работы в списке нет доп.
// изображений — такой ответ помечается как неполный)
const UUID = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'
const DERIVED = [
  { re: new RegExp(`^/api/v1/art/art-objects/${UUID}$`), list: '/api/v1/art/art-objects', partial: true },
  { re: new RegExp(`^/api/v1/collections/${UUID}$`), list: '/api/v1/collections', partial: false },
  // Продажи работы: у непроданной — сводка экземпляров из списка работ
  // (у проданной список продаж подгружается заранее, см. prefetch.js)
  {
    re: new RegExp(`^/api/v1/sales/art/${UUID}/list$`),
    list: '/api/v1/art/art-objects',
    partial: true,
    map: (w) => (w.sale ? null : {
      total: w.quantity ?? 1, sold: w.sold_count ?? 0, available: w.available ?? (w.quantity ?? 1),
      edition: w.edition ?? null, art_status: w.status ?? null, sales: [],
    }),
  },
]

async function deriveFromList(key, path) {
  for (const rule of DERIVED) {
    const m = rule.re.exec(path)
    if (!m) continue
    const listKey = key.slice(0, key.indexOf('|') + 1) + rule.list
    const hit = await idbGet('responses', listKey).catch(() => null)
    if (!hit) return null
    let list
    try {
      list = typeof hit.data === 'string' ? JSON.parse(hit.data) : hit.data
    } catch {
      return null
    }
    const item = Array.isArray(list) ? list.find(x => x?.id === m[1]) : null
    if (!item) return null
    const value = rule.map ? rule.map(item) : item
    if (!value) return null
    return { data: JSON.stringify(value), time: hit.time, partial: rule.partial }
  }
  return null
}

function fakeResponse(config, hit) {
  return {
    data: hit.data,
    status: 200,
    statusText: 'OK',
    headers: {
      'x-offline': '1',
      'x-offline-cached-at': String(hit.time),
      ...(hit.partial ? { 'x-offline-partial': '1' } : {}),
    },
    config,
    request: {},
  }
}

// Действие недоступно без интернета — ошибка в том же виде, что от сервера,
// чтобы сторы показали понятный текст
function offlineBlocked(config) {
  const text = 'Нет интернета — это действие можно сделать только при подключении к сети'
  const err = new Error(text)
  err.config = config
  err.response = { status: 503, statusText: 'Offline', data: { error: text }, headers: {}, config }
  err.isOfflineBlocked = true
  return err
}

function parseBody(data) {
  if (data == null) return {}
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return null }
  }
  return typeof data === 'object' && !(data instanceof FormData) ? data : null
}

// config.headers на этом этапе — AxiosHeaders (get/set), но на всякий случай и обычный объект
const getHeader = (config, name) => (typeof config.headers?.get === 'function' ? config.headers.get(name) : config.headers?.[name])
function setHeader(config, name, value) {
  if (typeof config.headers?.set === 'function') config.headers.set(name, value)
  else config.headers = { ...(config.headers || {}), [name]: value }
}

// Без сети — в очередь (outbox.js); ответ «как от сервера»
async function queueMutation(config, method, path, match) {
  const body = parseBody(config.data)
  if (body === null) throw offlineBlocked(config) // файлы и т.п. — только с сетью
  const data = await enqueue({ method, path, body, key: getHeader(config, 'Idempotency-Key'), match })
  markOffline()
  window.dispatchEvent(new CustomEvent('artcrm-outbox-changed'))
  return {
    data: JSON.stringify(data),
    status: 200,
    statusText: 'OK',
    headers: { 'x-offline': '1', 'x-offline-queued': '1' },
    config,
    request: {},
  }
}

// Ответы, которые не сохраняем: файлы (blob) и служебное
const SKIP = [/^\/api\/v1\/auth\//, /^\/api\/v1\/backup\//]

export function installApiCache(client) {
  const defaultAdapter = axios.getAdapter(client.defaults.adapter || axios.defaults.adapter)

  client.defaults.adapter = async (config) => {
    const method = (config.method || 'get').toLowerCase()
    const binary = config.responseType && !['json', 'text'].includes(config.responseType)
    const path = (config.url || '').split('?')[0]

    // === Изменения ===
    if (method !== 'get') {
      // отправка из очереди (sync.js) — как есть, без повторной постановки
      if (config.offlineQueue === false) return defaultAdapter(config)
      const match = matchRule(method, path)
      // ключ повтора — чтобы при обрыве связи изменение не выполнилось дважды
      if (match && !getHeader(config, 'Idempotency-Key')) setHeader(config, 'Idempotency-Key', newKey())
      if (!navigator.onLine) {
        if (match) return queueMutation(config, method, path, match)
        throw offlineBlocked(config)
      }
      try {
        return await defaultAdapter(config)
      } catch (error) {
        if (isNetworkFailure(error)) {
          markOffline()
          if (match) return queueMutation(config, method, path, match)
          throw offlineBlocked(config)
        }
        throw error
      }
    }

    if (binary || config.offlineCache === false || SKIP.some(re => re.test(path))) {
      return defaultAdapter(config)
    }

    const key = cacheKey(client, config)
    const cached = await idbGet('responses', key).catch(() => null)

    // Сети точно нет — сразу отдаём сохранённое
    if (!navigator.onLine) {
      const hit = cached || await deriveFromList(key, path)
      if (hit) {
        markOffline(hit.time)
        return fakeResponse(config, hit)
      }
    }

    try {
      const resp = await defaultAdapter(cached ? { ...config, timeout: Math.min(config.timeout || GET_TIMEOUT_WITH_CACHE, GET_TIMEOUT_WITH_CACHE) } : config)
      if (resp.status >= 200 && resp.status < 300) {
        markOnline()
        idbPut('responses', { data: resp.data, time: Date.now() }, key).catch(() => {})
      }
      return resp
    } catch (error) {
      if (isNetworkFailure(error)) {
        const hit = cached || await deriveFromList(key, path)
        if (hit) {
          markOffline(hit.time)
          return fakeResponse(config, hit)
        }
        markOffline()
      }
      throw error
    }
  }
}

// Ответ взят не с сервера, а из сохранённого
export const isOfflineResponse = (resp) => resp?.headers?.['x-offline'] === '1'
