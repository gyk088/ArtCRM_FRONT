// stores/collection.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useCollection = defineStore('collection', {
  state: () => {
    return {
      listCollections: [],
      loading: false,
      error: null,
    }
  },

  actions: {
    /**
     * GET /api/v1/collections - Получить все свои ссылки
     */
    async getAllCollections() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/collections')
        this.listCollections = resp.data || []
      } catch (e) {
        console.error('Error fetching collections:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to load collections')
        this.error = e?.response?.data?.error || 'Failed to load collections'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * GET /api/v1/collections/:id - Получить свою ссылку по ID (для редактирования)
     */
    async getCollectionById(id) {
      let result = null
      try {
        const resp = await apiClient.get(`/api/v1/collections/${id}`)
        result = resp.data
      } catch (e) {
        console.error('Error fetching collection by id:', e)
        if (e?.response?.status !== 404) {
          notifyServerError(e?.response?.data?.error || 'Failed to load collection')
        }
        result = null
      }
      return result
    },

    /**
     * GET /api/v1/collections/public/:id - Публичная страница ссылки (без авторизации)
     */
    async getPublicCollection(id) {
      let result = null
      try {
        const resp = await apiClient.get(`/api/v1/collections/public/${id}`)
        result = resp.data
      } catch (e) {
        if (e?.response?.status !== 404) {
          console.error('Error fetching public collection:', e)
        }
        result = null
      }
      return result
    },

    /**
     * POST /api/v1/collections - Создать новую ссылку
     */
    async createCollection(data) {
      let result = null
      try {
        const resp = await apiClient.post('/api/v1/collections', data)
        result = resp.data
        if (result) {
          this.listCollections.unshift(result)
          notifyServerSuccess('Ссылка создана')
        }
      } catch (e) {
        console.error('Error creating collection:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось создать ссылку')
        this.error = e?.response?.data?.error || 'Не удалось создать ссылку'
        result = null
      }
      return result
    },

    /**
     * PUT /api/v1/collections/:id - Обновить ссылку
     */
    async updateCollection(id, data) {
      let result = null
      try {
        const resp = await apiClient.put(`/api/v1/collections/${id}`, data)
        result = resp.data
        if (result) {
          const index = this.listCollections.findIndex(c => c.id === id)
          if (index !== -1) this.listCollections[index] = result
          notifyServerSuccess('Ссылка обновлена')
        }
      } catch (e) {
        console.error('Error updating collection:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось обновить ссылку')
        this.error = e?.response?.data?.error || 'Не удалось обновить ссылку'
        result = null
      }
      return result
    },

    /**
     * DELETE /api/v1/collections/:id - Удалить ссылку
     */
    async deleteCollection(id) {
      let success = true
      try {
        await apiClient.delete(`/api/v1/collections/${id}`)
        this.listCollections = this.listCollections.filter(c => c.id !== id)
        notifyServerSuccess('Ссылка удалена')
      } catch (e) {
        console.error('Error deleting collection:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось удалить ссылку')
        this.error = e?.response?.data?.error || 'Не удалось удалить ссылку'
        success = false
      }
      return success
    },
  }
})
