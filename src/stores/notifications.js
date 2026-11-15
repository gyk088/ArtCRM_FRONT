// stores/notifications.js
// Уведомления внутри приложения (например, «вам назначили задачу»).
// Раз в минуту спрашиваем у бэкенда количество непрочитанных; о новых
// показываем всплывающее уведомление, по клику — переход к задаче.
import { defineStore } from 'pinia'
import { notification } from 'ant-design-vue'
import apiClient from '@/services/api.js'
import { getToken } from '@/services/auth.js'

// Переход по ссылке уведомления задаёт Home.vue (setNotificationNavigator):
// импортировать сюда роутер нельзя — получится цикл
// router -> Home.vue -> этот стор -> router, и сборка падает при загрузке.
let navigate = (link) => { window.location.assign(link) }
export function setNotificationNavigator(fn) {
  navigate = fn
}

const POLL_MS = 60 * 1000
// какие уведомления уже показывали всплывающими — чтобы не повторять
const SHOWN_KEY = 'ATR_NOTIFICATIONS_SHOWN'

function loadShown() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SHOWN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export const useNotifications = defineStore('notifications', {
  state: () => ({
    unreadCount: 0,
    list: [],
    loading: false,
    pollTimer: null,
    shown: loadShown(),
  }),

  actions: {
    startPolling() {
      if (this.pollTimer) return
      this.refreshUnread({ silentFirst: true })
      this.pollTimer = setInterval(() => this.refreshUnread(), POLL_MS)
    },

    stopPolling() {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    },

    /** GET /api/v1/notifications/unread — счётчик + всплывающие о новых */
    async refreshUnread({ silentFirst = false } = {}) {
      if (!getToken()) return
      try {
        const { data } = await apiClient.get('/api/v1/notifications/unread')
        this.unreadCount = data.count
        const fresh = (data.latest || []).filter(n => !this.shown.has(n.id))
        // при первой загрузке страницы показываем не больше одного свежего
        for (const n of (silentFirst ? fresh.slice(0, 1) : fresh).reverse()) this.popup(n)
        for (const n of fresh) this.shown.add(n.id)
        localStorage.setItem(SHOWN_KEY, JSON.stringify([...this.shown].slice(-200)))
      } catch {
        // сеть/сессия — молча, повторим при следующем опросе
      }
    },

    popup(n) {
      notification.info({
        key: n.id,
        message: n.title,
        description: n.body || undefined,
        placement: 'topRight',
        duration: 8,
        style: { cursor: n.link ? 'pointer' : 'default' },
        onClick: () => {
          notification.close(n.id)
          this.open(n)
        },
      })
    },

    async getList() {
      this.loading = true
      try {
        const { data } = await apiClient.get('/api/v1/notifications')
        this.list = data || []
      } catch (e) {
        console.error('Error fetching notifications:', e)
      } finally {
        this.loading = false
      }
    },

    async markRead(ids) {
      try {
        const { data } = await apiClient.post('/api/v1/notifications/read', ids ? { ids } : { all: true })
        this.unreadCount = data.count
        this.list = this.list.map(n => (!ids || ids.includes(n.id) ? { ...n, is_read: true } : n))
      } catch (e) {
        console.error('Error marking notifications read:', e)
      }
    },

    async remove(id) {
      try {
        await apiClient.delete(`/api/v1/notifications/${id}`)
        const n = this.list.find(x => x.id === id)
        this.list = this.list.filter(x => x.id !== id)
        if (n && !n.is_read) this.unreadCount = Math.max(0, this.unreadCount - 1)
      } catch (e) {
        console.error('Error deleting notification:', e)
      }
    },

    /** Открыть уведомление: отметить прочитанным и перейти по ссылке */
    async open(n) {
      if (!n.is_read) await this.markRead([n.id])
      if (n.link) navigate(n.link)
    },
  },
})
