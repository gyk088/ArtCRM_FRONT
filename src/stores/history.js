// stores/history.js — история изменений (кто и когда), см. ChangeLogService на бэкенде
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError } from '@/services/notify.js'

export const useHistory = defineStore('history', {
  actions: {
    /** GET /api/v1/history/:type/:id — история одной записи */
    async getEntityHistory(type, id) {
      try {
        const resp = await apiClient.get(`/api/v1/history/${type}/${id}`)
        return resp.data || []
      } catch (e) {
        console.error('Error fetching history:', e)
        notifyServerError('Не удалось загрузить историю изменений')
        return null
      }
    },

    /** GET /api/v1/history — журнал галереи { items, has_more, actors } */
    async getJournal(params = {}) {
      try {
        const resp = await apiClient.get('/api/v1/history', { params })
        return resp.data
      } catch (e) {
        console.error('Error fetching journal:', e)
        notifyServerError(e?.response?.status === 403 ? 'Журнал доступен галерее' : 'Не удалось загрузить журнал изменений')
        return null
      }
    },
  },
})
