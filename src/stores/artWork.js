// stores/artWork.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useArtWork = defineStore('art-objects', {
  state: () => {
    return {
      // ArtWorks
      listArtWorks: [],           // Список всех работ
      currentArtWork: null,       // Текущая выбранная работа
      loading: false,
      error: null,
    }
  },

  getters: {
    /**
     * Получить работу по ID
     */
    getArtWorkById: (state) => (id) => {
      return state.listArtWorks.find(item => item.id === id)
    },
    
    /**
     * Общее количество работ
     */
    totalArtWorks: (state) => state.listArtWorks.length,
    
    /**
     * Получить работы по статусу
     */
    getArtWorksByStatus: (state) => (statusId) => {
      return state.listArtWorks.filter(item => item.status === statusId)
    },
    
    /**
     * Получить работы по серии
     */
    getArtWorksBySeries: (state) => (seriaId) => {
      return state.listArtWorks.filter(item => item.seria === seriaId)
    },
    
    /**
     * Получить работы по медиа
     */
    getArtWorksByMedia: (state) => (mediaId) => {
      return state.listArtWorks.filter(item => item.media === mediaId)
    },
    
    /**
     * Получить работы по локации
     */
    getArtWorksByLocation: (state) => (locationId) => {
      return state.listArtWorks.filter(item => item.location === locationId)
    },
  },

  actions: {
    // ==================== ARTWORK ACTIONS ====================
    
    /**
     * GET /api/v1/art/art-objects - Получить все работы
     */
    async getListArtWorks() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/art/art-objects')
        this.listArtWorks = resp.data || []
        console.log('ArtWorks loaded:', this.listArtWorks)
      } catch (e) {
        console.error('Error fetching artworks:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load artworks')
        this.error = e?.response?.data?.message || 'Failed to load artworks'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * GET /api/v1/art/art-objects/:id - Получить работу по ID
     * @param {string} id - ID работы
     */
    async getArtWorkById(id) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.get(`/api/v1/art/art-objects/${id}`)
        result = resp.data
        this.currentArtWork = result
        console.log('ArtWork by ID:', result)
      } catch (e) {
        console.error('Error fetching artwork by id:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load artwork details')
        this.error = e?.response?.data?.message || 'Failed to load artwork details'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * GET /api/v1/art/art-objects/user/:userId - Получить работы по user_id
     * @param {string} userId - ID пользователя
     */
    async getArtWorksByUserId(userId) {
      this.loading = true
      this.error = null
      let result = []

      try {
        const resp = await apiClient.get(`/api/v1/art/art-objects/user/${userId}`)
        result = resp.data || []
        console.log('ArtWorks by user:', result)
      } catch (e) {
        console.error('Error fetching artworks by user:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load user artworks')
        this.error = e?.response?.data?.message || 'Failed to load user artworks'
        result = []
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * POST /api/v1/art/art-objects - Создать новую работу
     * @param {Object} workData - данные работы
     * {
     *   user_id: string (uuid),
     *   name: string,
     *   technique: string,
     *   media: string (uuid) - ссылка на my_media,
     *   seria: string (uuid) - ссылка на my_seria,
     *   status: string (uuid) - ссылка на my_status,
     *   location: string (uuid) - ссылка на my_location,
     *   price: number,
     *   year: number
     * }
     */
    async createArtWork(workData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.post('/api/v1/art/art-objects', workData)
        result = resp.data

        if (result) {
          this.listArtWorks.push(result)
          notifyServerSuccess('ArtWork created successfully')
          console.log('ArtWork created:', result)
        }
      } catch (e) {
        console.error('Error creating artwork:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to create artwork')
        this.error = e?.response?.data?.message || 'Failed to create artwork'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * PUT /api/v1/art/art-objects - Обновить работу (полное обновление)
     * @param {Object} workData - данные работы с id
     */
    async updateArtWork(workData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.put('/api/v1/art/art-objects', workData)
        result = resp.data

        if (result) {
          const index = this.listArtWorks.findIndex(item => item.id === workData.id)
          if (index !== -1) {
            this.listArtWorks[index] = result
          }
          if (this.currentArtWork?.id === workData.id) {
            this.currentArtWork = result
          }
          notifyServerSuccess('ArtWork updated successfully')
          console.log('ArtWork updated:', result)
        }
      } catch (e) {
        console.error('Error updating artwork:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to update artwork')
        this.error = e?.response?.data?.message || 'Failed to update artwork'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * PATCH /api/v1/art/art-objects/:id - Частичное обновление работы
     * @param {string} id - ID работы
     * @param {Object} patchData - данные для обновления
     */
    async patchArtWork(id, patchData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.patch(`/api/v1/art/art-objects/${id}`, patchData)
        result = resp.data

        if (result) {
          const index = this.listArtWorks.findIndex(item => item.id === id)
          if (index !== -1) {
            this.listArtWorks[index] = { ...this.listArtWorks[index], ...result }
          }
          if (this.currentArtWork?.id === id) {
            this.currentArtWork = { ...this.currentArtWork, ...result }
          }
          notifyServerSuccess('ArtWork updated successfully')
          console.log('ArtWork patched:', result)
        }
      } catch (e) {
        console.error('Error patching artwork:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to patch artwork')
        this.error = e?.response?.data?.message || 'Failed to patch artwork'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * DELETE /api/v1/art/art-objects/:id - Удалить работу
     * @param {string} id - ID работы
     */
    async deleteArtWork(id) {
      this.loading = true
      this.error = null
      let success = true

      try {
        await apiClient.delete(`/api/v1/art/art-objects/${id}`)

        this.listArtWorks = this.listArtWorks.filter(item => item.id !== id)
        
        if (this.currentArtWork?.id === id) {
          this.currentArtWork = null
        }
        
        notifyServerSuccess('ArtWork deleted successfully')
        console.log('ArtWork deleted:', id)
      } catch (e) {
        console.error('Error deleting artwork:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to delete artwork')
        this.error = e?.response?.data?.message || 'Failed to delete artwork'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * POST /api/v1/art/art-objects/bulk-delete - Массовое удаление работ
     * @param {array} ids - массив ID работ
     */
    async bulkDeleteArtWorks(ids) {
      this.loading = true
      this.error = null
      let success = true

      try {
        await apiClient.post('/api/v1/art/art-objects/bulk-delete', { ids })

        this.listArtWorks = this.listArtWorks.filter(item => !ids.includes(item.id))
        
        if (this.currentArtWork && ids.includes(this.currentArtWork.id)) {
          this.currentArtWork = null
        }
        
        notifyServerSuccess('ArtWorks deleted successfully')
        console.log('ArtWorks deleted:', ids)
      } catch (e) {
        console.error('Error bulk deleting artworks:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to delete artworks')
        this.error = e?.response?.data?.message || 'Failed to delete artworks'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * Очистить текущую выбранную работу
     */
    clearCurrentArtWork() {
      this.currentArtWork = null
    },

    /**
     * Сбросить ошибку
     */
    clearError() {
      this.error = null
    },

    /**
     * Сбросить все состояние работ
     */
    resetArtWorksState() {
      this.listArtWorks = []
      this.currentArtWork = null
      this.loading = false
      this.error = null
    }
  }
})