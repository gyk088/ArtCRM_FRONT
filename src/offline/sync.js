// Отправка изменений, сделанных без интернета (очередь outbox.js).
//
// По порядку, по одному. Для каждого:
//   успех      — убираем из очереди; если запись создавалась офлайн, её
//                временный id заменяем на настоящий в следующих действиях
//                (например, продажа новому контакту) и в адресе страницы;
//   409        — конфликт: запись поменяли на сервере после правки офлайн;
//                ждём решения человека (оставить своё / отменить своё);
//   нет связи  — останавливаемся, попробуем позже;
//   иначе      — ошибка с текстом сервера (можно повторить или отменить).
import { reactive } from 'vue'
import apiClient from '@/services/api.js'
import { getToken } from '@/services/auth.js'
import { idbDelete, idbGet, idbGetAll, idbPut } from './db.js'
import { prefetchForOffline } from './prefetch.js'

export const syncState = reactive({
  items: [],
  syncing: false,
  // сколько отправлено в последний раз (для уведомления)
  lastSent: 0,
})

const listeners = new Set()
// подписка на завершение синхронизации: ({ sent, failed }) => void
export const onSynced = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

export async function refreshOutbox() {
  const items = await idbGetAll('outbox').catch(() => [])
  syncState.items = items.sort((a, b) => a.id - b.id)
  return syncState.items
}

const isNetworkFailure = (e) => !e?.response || [502, 503, 504].includes(e.response.status)

const SERVER_TEXT = {
  'Art object is already sold': 'Работа уже продана',
  'Seller not found': 'Этого сотрудника нельзя указать продавцом',
  'Contact not found': 'Покупатель не найден',
  'Art object not found': 'Работа не найдена (возможно, её удалили)',
  'Collection not found': 'Ссылка не найдена (возможно, её удалили)',
  'Note not found': 'Заметка не найдена (возможно, её удалили)',
}
function errorText(e) {
  const raw = e?.response?.data?.error || e?.message || 'Ошибка'
  const notEnough = /^Not enough copies: (\d+) available$/.exec(raw)
  if (notEnough) return `Столько экземпляров уже нет — осталось ${notEnough[1]}`
  return SERVER_TEXT[raw] || raw
}

// временный id → настоящий во всех следующих действиях
function replaceId(item, from, to) {
  const swap = (v) => JSON.parse(JSON.stringify(v).split(from).join(to))
  return {
    ...item,
    url: item.url.split(from).join(to),
    body: item.body ? swap(item.body) : item.body,
    entityId: item.entityId === from ? to : item.entityId,
  }
}

let running = null

export function syncNow() {
  if (running) return running
  running = doSync().finally(() => { running = null })
  return running
}

async function doSync() {
  if (!navigator.onLine || !getToken()) return
  // Читаем из IndexedDB заново: элементы syncState — реактивные прокси Vue,
  // а IndexedDB их сохранить не может (DataCloneError)
  const items = (await idbGetAll('outbox').catch(() => [])).sort((a, b) => a.id - b.id)
  await refreshOutbox()
  if (!items.some(i => i.status === 'pending')) return

  syncState.syncing = true
  let sent = 0
  let failed = 0
  try {
    // id-замены применяем к ещё не отправленным
    const queue = items
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      if (item.status !== 'pending') continue
      const headers = { 'Idempotency-Key': item.key }
      if (item.baseUtime) headers['X-Base-Utime'] = item.baseUtime
      if (item.force) headers['X-Force'] = '1'
      try {
        const resp = await apiClient.request({
          method: item.method,
          url: item.url,
          data: item.body,
          headers,
          offlineQueue: false,
          offlineCache: false,
        })
        await idbDelete('outbox', item.id)
        sent++
        const realId = resp.data?.id
        for (let j = i + 1; j < queue.length; j++) {
          let next = queue[j]
          if (item.tempId && realId && realId !== item.tempId) next = replaceId(next, item.tempId, realId)
          // следующая правка той же записи — сверять уже с только что сохранённой версией
          if (next.entityId && next.entityId === (realId || item.entityId) && resp.data?.utime && next.baseUtime) {
            next = { ...next, baseUtime: resp.data.utime }
          }
          if (next !== queue[j]) {
            queue[j] = next
            await idbPut('outbox', next)
          }
        }
        // открыта страница записи, созданной офлайн, — подставить настоящий id
        if (item.tempId && realId && window.location.pathname.includes(item.tempId)) {
          window.history.replaceState(window.history.state, '', window.location.pathname.split(item.tempId).join(realId) + window.location.search)
        }
      } catch (e) {
        if (isNetworkFailure(e)) break
        if (e.response?.status === 401) break
        failed++
        const conflict = e.response?.status === 409
        const updated = {
          ...item,
          status: conflict ? 'conflict' : 'error',
          error: conflict ? 'Пока вы были без сети, эту запись изменили на сервере' : errorText(e),
          force: false,
        }
        queue[i] = updated
        await idbPut('outbox', updated)
      }
    }
  } finally {
    syncState.syncing = false
    syncState.lastSent = sent
    await refreshOutbox()
  }
  // сначала сообщаем, потом в фоне обновляем сохранённые данные (это долго — списки и миниатюры)
  if (sent || failed) listeners.forEach(fn => fn({ sent, failed }))
  if (sent) prefetchForOffline({ force: true }).catch(() => {})
}

// === Решения человека по проблемным изменениям ===
async function updateItem(id, patch) {
  // из IndexedDB, а не из syncState (там реактивные прокси — их не сохранить)
  const item = await idbGet('outbox', id).catch(() => null)
  if (!item) return
  await idbPut('outbox', { ...item, ...patch })
  await refreshOutbox()
}

// Конфликт: отправить своё поверх серверной версии
export const keepMine = (id) => updateItem(id, { status: 'pending', force: true, error: null }).then(() => syncNow())
// Ошибка: попробовать ещё раз
export const retryItem = (id) => updateItem(id, { status: 'pending', error: null }).then(() => syncNow())
// Отменить своё изменение (на устройстве данные обновятся при следующей загрузке с сервера)
export async function discardItem(id) {
  await idbDelete('outbox', id)
  await refreshOutbox()
  if (navigator.onLine) prefetchForOffline({ force: true }).catch(() => {})
}

// Запуск: при старте, при появлении сети и периодически, пока есть очередь
export function startSync() {
  refreshOutbox()
  setTimeout(() => syncNow(), 3000)
  window.addEventListener('online', () => setTimeout(() => syncNow(), 1500))
  setInterval(() => {
    if (syncState.items.some(i => i.status === 'pending')) syncNow()
  }, 30000)
}
