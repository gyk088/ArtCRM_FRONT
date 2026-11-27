// Хранилище на устройстве (IndexedDB) для работы без интернета.
//   responses — сохранённые ответы API (ключ: пользователь + адрес запроса)
//   outbox    — действия, сделанные без сети и ждущие отправки на сервер
//   meta      — служебное (время последней подготовки к офлайну и т.п.)
// При выходе из аккаунта база удаляется целиком (clearOfflineData).

const DB_NAME = 'artcrm-offline'
const DB_VERSION = 1

let dbPromise = null

export function openDb() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB недоступна'))
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('responses')) db.createObjectStore('responses')
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => { dbPromise = null; reject(req.error) }
      req.onblocked = () => { dbPromise = null; reject(new Error('IndexedDB заблокирована')) }
    })
  }
  return dbPromise
}

function run(storeName, mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    let result
    const req = fn(store)
    if (req) req.onsuccess = () => { result = req.result }
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  }))
}

export const idbGet = (storeName, key) => run(storeName, 'readonly', s => s.get(key))
export const idbPut = (storeName, value, key) => run(storeName, 'readwrite', s => (key === undefined ? s.put(value) : s.put(value, key)))
export const idbDelete = (storeName, key) => run(storeName, 'readwrite', s => s.delete(key))
export const idbGetAll = (storeName) => run(storeName, 'readonly', s => s.getAll())
export const idbClear = (storeName) => run(storeName, 'readwrite', s => s.clear())

// Стереть всё сохранённое на устройстве: базу и кеши картинок service worker'а
export async function clearOfflineData() {
  const tasks = []
  if (dbPromise) {
    tasks.push(dbPromise.then(db => db.close()).catch(() => {}))
    dbPromise = null
  }
  if ('indexedDB' in window) {
    tasks.push(new Promise(resolve => {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    }))
  }
  if ('caches' in window) {
    tasks.push(caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('artcrm-')).map(k => caches.delete(k))))
      .catch(() => {}))
  }
  await Promise.allSettled(tasks)
}
