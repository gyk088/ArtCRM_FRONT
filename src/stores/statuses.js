// stores/art.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useStatuses = defineStore('statuses', {
  state: () => {
    return {
      // Statuses
      listStatuses: [],           // Список всех статусов
      currentStatus: null,        // Текущий выбранный статус
      loading: false,
      error: null,
    }
  },

  getters: {
    // Statuses getters
    getStatusById: (state) => (id) => {
      return state.listStatuses.find(item => item.id === id)
    },
    totalStatuses: (state) => state.listStatuses.length,
  },

  actions: {
    // ==================== STATUSES ACTIONS ====================
    
    /**
     * GET /api/v1/art/statuses - Получить все статусы
     */
    async getListStatuses() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/art/statuses')
        this.listStatuses = resp.data || []
        console.log('Statuses loaded:', this.listStatuses)
      } catch (e) {
        console.error('Error fetching statuses:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load statuses')
        this.error = e?.response?.data?.message || 'Failed to load statuses'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * GET /api/v1/art/statuses/:id - Получить статус по ID
     */
    async getStatusById(id) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.get(`/api/v1/art/statuses/${id}`)
        result = resp.data
        this.currentStatus = result
        console.log('Status by ID:', result)
      } catch (e) {
        console.error('Error fetching status by id:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load status details')
        this.error = e?.response?.data?.message || 'Failed to load status details'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * GET /api/v1/art/statuses/user/:userId - Получить статусы по user_id
     */
    async getStatusesByUserId(userId) {
      this.loading = true
      this.error = null
      let result = []

      try {
        const resp = await apiClient.get(`/api/v1/art/statuses/user/${userId}`)
        result = resp.data || []
        console.log('Statuses by user:', result)
      } catch (e) {
        console.error('Error fetching statuses by user:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load user statuses')
        this.error = e?.response?.data?.message || 'Failed to load user statuses'
        result = []
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * POST /api/v1/art/statuses - Создать новый статус
     * @param {Object} statusData - { user_id: string, name: string }
     */
    async createStatus(statusData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.post('/api/v1/art/statuses', statusData)
        result = resp.data

        // Добавляем новый статус в список
        if (result) {
          this.listStatuses.push(result)
          notifyServerSuccess('Status created successfully')
          console.log('Status created:', result)
        }
      } catch (e) {
        console.error('Error creating status:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to create status')
        this.error = e?.response?.data?.message || 'Failed to create status'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * PUT /api/v1/art/statuses - Обновить статус (полное обновление)
     * @param {Object} statusData - { id: string, name: string }
     */
    async updateStatus(statusData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.put('/api/v1/art/statuses', statusData)
        result = resp.data

        // Обновляем статус в списке
        if (result) {
          const index = this.listStatuses.findIndex(item => item.id === statusData.id)
          if (index !== -1) {
            this.listStatuses[index] = result
          }
          if (this.currentStatus?.id === statusData.id) {
            this.currentStatus = result
          }
          notifyServerSuccess('Status updated successfully')
          console.log('Status updated:', result)
        }
      } catch (e) {
        console.error('Error updating status:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to update status')
        this.error = e?.response?.data?.message || 'Failed to update status'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * DELETE /api/v1/art/statuses/:id - Удалить статус
     * @param {string} id - ID статуса
     */
    async deleteStatus(id) {
      this.loading = true
      this.error = null
      let success = true

      try {
        await apiClient.delete(`/api/v1/art/statuses/${id}`)

        // Удаляем статус из списка
        this.listStatuses = this.listStatuses.filter(item => item.id !== id)
        
        // Если удалили текущий статус, очищаем его
        if (this.currentStatus?.id === id) {
          this.currentStatus = null
        }
        
        notifyServerSuccess('Status deleted successfully')
        console.log('Status deleted:', id)
      } catch (e) {
        console.error('Error deleting status:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to delete status')
        this.error = e?.response?.data?.message || 'Failed to delete status'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * Очистить текущий выбранный статус
     */
    clearCurrentStatus() {
      this.currentStatus = null
    },

    /**
     * Сбросить ошибку
     */
    clearError() {
      this.error = null
    },

    /**
     * Сбросить все состояние статусов
     */
    resetStatusesState() {
      this.listStatuses = []
      this.currentStatus = null
      this.loading = false
      this.error = null
    }
  }
})