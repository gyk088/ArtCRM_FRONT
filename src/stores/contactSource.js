// stores/contactSource.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useContactSource = defineStore('contact-source', {
  state: () => {
    return {
      listSources: [],
      loading: false,
      error: null,
    }
  },

  actions: {
    /**
     * GET /api/v1/contacts/sources - Получить все источники контактов
     */
    async getListSources() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/contacts/sources')
        this.listSources = resp.data || []
      } catch (e) {
        console.error('Error fetching contact sources:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось загрузить источники')
        this.error = e?.response?.data?.error || 'Не удалось загрузить источники'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * POST /api/v1/contacts/sources - Создать источник
     * @param {Object} data - { name: string }
     */
    async createSource(data) {
      let result = null
      try {
        const resp = await apiClient.post('/api/v1/contacts/sources', data)
        result = resp.data
        if (result) {
          this.listSources.push(result)
          notifyServerSuccess('Источник добавлен')
        }
      } catch (e) {
        console.error('Error creating contact source:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось создать источник')
        result = null
      }
      return result
    },

    /**
     * PUT /api/v1/contacts/sources - Обновить источник
     * @param {Object} data - { id: string, name: string }
     */
    async updateSource(data) {
      let result = null
      try {
        const resp = await apiClient.put('/api/v1/contacts/sources', data)
        result = resp.data
        if (result) {
          const index = this.listSources.findIndex(item => item.id === data.id)
          if (index !== -1) this.listSources[index] = result
          notifyServerSuccess('Источник обновлён')
        }
      } catch (e) {
        console.error('Error updating contact source:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось обновить источник')
        result = null
      }
      return result
    },

    /**
     * DELETE /api/v1/contacts/sources/:id - Удалить источник
     */
    async deleteSource(id) {
      let success = true
      try {
        await apiClient.delete(`/api/v1/contacts/sources/${id}`)
        this.listSources = this.listSources.filter(item => item.id !== id)
        notifyServerSuccess('Источник удалён')
      } catch (e) {
        console.error('Error deleting contact source:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось удалить источник')
        success = false
      }
      return success
    },
  }
})
