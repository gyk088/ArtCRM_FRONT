// Состояние сети для интерфейса: есть ли интернет, показываем ли сейчас
// сохранённые данные и когда они были обновлены.
import { reactive } from 'vue'

export const network = reactive({
  // браузер считает, что сеть есть, и последний запрос к серверу прошёл
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  // хоть один экран показан из сохранённых данных (а не с сервера)
  fromCache: false,
  // самое старое время сохранения среди показанных офлайн данных
  cachedAt: null,
})

export function markOnline() {
  network.online = true
  network.fromCache = false
  network.cachedAt = null
}

export function markOffline(cachedAt = null) {
  network.online = false
  if (cachedAt) {
    network.fromCache = true
    network.cachedAt = network.cachedAt ? Math.min(network.cachedAt, cachedAt) : cachedAt
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { network.online = true })
  window.addEventListener('offline', () => { network.online = false })
}
