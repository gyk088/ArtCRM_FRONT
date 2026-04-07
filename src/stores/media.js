// stores/art.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useMedia = defineStore('media', {
  state: () => {
    return {
      // Media
      listMedia: [],           // Список всех медиа
      currentMedia: null,     // Текущее выбранное медиа
      loading: false,
      error: null,
    }
  },

  getters: {
    // Media getters
    getMediaById: (state) => (id) => {
      return state.listMedia.find(item => item.id === id)
    },
    totalMedia: (state) => state.listMedia.length,
  },

  actions: {
    // ==================== MEDIA ACTIONS ====================
    
    /**
     * GET /api/v1/art/media - Получить все медиа
     */
    async getListMedia() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/art/media')
        this.listMedia = resp.data || []
        console.log('Media loaded:', this.listMedia)
      } catch (e) {
        console.error('Error fetching media:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load media')
        this.error = e?.response?.data?.message || 'Failed to load media'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * GET /api/v1/art/media/:id - Получить медиа по ID
     */
    async getMediaById(id) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.get(`/api/v1/art/media/${id}`)
        result = resp.data
        this.currentMedia = result
        console.log('Media by ID:', result)
      } catch (e) {
        console.error('Error fetching media by id:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load media details')
        this.error = e?.response?.data?.message || 'Failed to load media details'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * GET /api/v1/art/media/user/:userId - Получить медиа по user_id
     */
    async getMediaByUserId(userId) {
      this.loading = true
      this.error = null
      let result = []

      try {
        const resp = await apiClient.get(`/api/v1/art/media/user/${userId}`)
        result = resp.data || []
        console.log('Media by user:', result)
      } catch (e) {
        console.error('Error fetching media by user:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load user media')
        this.error = e?.response?.data?.message || 'Failed to load user media'
        result = []
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * POST /api/v1/art/media - Создать новое медиа
     * @param {Object} mediaData - { user_id: string, name: string }
     */
    async createMedia(mediaData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.post('/api/v1/art/media', mediaData)
        result = resp.data

        // Добавляем новое медиа в список
        if (result) {
          this.listMedia.push(result)
          notifyServerSuccess('Media created successfully')
          console.log('Media created:', result)
        }
      } catch (e) {
        console.error('Error creating media:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to create media')
        this.error = e?.response?.data?.message || 'Failed to create media'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * PUT /api/v1/art/media - Обновить медиа (полное обновление)
     * @param {Object} mediaData - { id: string, name: string }
     */
    async updateMedia(mediaData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.put('/api/v1/art/media', mediaData)
        result = resp.data

        // Обновляем медиа в списке
        if (result) {
          const index = this.listMedia.findIndex(item => item.id === mediaData.id)
          if (index !== -1) {
            this.listMedia[index] = result
          }
          if (this.currentMedia?.id === mediaData.id) {
            this.currentMedia = result
          }
          notifyServerSuccess('Media updated successfully')
          console.log('Media updated:', result)
        }
      } catch (e) {
        console.error('Error updating media:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to update media')
        this.error = e?.response?.data?.message || 'Failed to update media'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * DELETE /api/v1/art/media/:id - Удалить медиа
     * @param {string} id - ID медиа
     */
    async deleteMedia(id) {
      this.loading = true
      this.error = null
      let success = true

      try {
        await apiClient.delete(`/api/v1/art/media/${id}`)

        // Удаляем медиа из списка
        this.listMedia = this.listMedia.filter(item => item.id !== id)
        
        // Если удалили текущее медиа, очищаем его
        if (this.currentMedia?.id === id) {
          this.currentMedia = null
        }
        
        notifyServerSuccess('Media deleted successfully')
        console.log('Media deleted:', id)
      } catch (e) {
        console.error('Error deleting media:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to delete media')
        this.error = e?.response?.data?.message || 'Failed to delete media'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * Очистить текущее выбранное медиа
     */
    clearCurrentMedia() {
      this.currentMedia = null
    },

    /**
     * Сбросить ошибку
     */
    clearError() {
      this.error = null
    },

    /**
     * Сбросить все состояние медиа
     */
    resetMediaState() {
      this.listMedia = []
      this.currentMedia = null
      this.loading = false
      this.error = null
    }
  }
})