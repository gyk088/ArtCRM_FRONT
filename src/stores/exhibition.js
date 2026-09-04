// stores/exhibition.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useExhibition = defineStore('exhibition', {
  state: () => {
    return {
      listExhibitions: [],
      loading: false,
      error: null,
    }
  },

  actions: {
    /**
     * GET /api/v1/exhibitions - Получить все свои выставки
     */
    async getAllExhibitions() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/exhibitions')
        this.listExhibitions = resp.data || []
      } catch (e) {
        console.error('Error fetching exhibitions:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to load exhibitions')
        this.error = e?.response?.data?.error || 'Failed to load exhibitions'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * GET /api/v1/exhibitions/:id - Получить свою выставку по ID (для редактирования)
     */
    async getExhibitionById(id) {
      let result = null
      try {
        const resp = await apiClient.get(`/api/v1/exhibitions/${id}`)
        result = resp.data
      } catch (e) {
        console.error('Error fetching exhibition by id:', e)
        if (e?.response?.status !== 404) {
          notifyServerError(e?.response?.data?.error || 'Failed to load exhibition')
        }
        result = null
      }
      return result
    },

    /**
     * GET /api/v1/exhibitions/public/:id - Публичная страница выставки (без авторизации)
     */
    async getPublicExhibition(id) {
      let result = null
      try {
        const resp = await apiClient.get(`/api/v1/exhibitions/public/${id}`)
        result = resp.data
      } catch (e) {
        if (e?.response?.status !== 404) {
          console.error('Error fetching public exhibition:', e)
        }
        result = null
      }
      return result
    },

    /**
     * POST /api/v1/exhibitions - Создать новую выставку
     */
    async createExhibition(data) {
      let result = null
      try {
        const resp = await apiClient.post('/api/v1/exhibitions', data)
        result = resp.data
        if (result) {
          this.listExhibitions.unshift(result)
          notifyServerSuccess('Выставка создана')
        }
      } catch (e) {
        console.error('Error creating exhibition:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось создать выставку')
        this.error = e?.response?.data?.error || 'Не удалось создать выставку'
        result = null
      }
      return result
    },

    /**
     * PUT /api/v1/exhibitions/:id - Обновить выставку
     */
    async updateExhibition(id, data) {
      let result = null
      try {
        const resp = await apiClient.put(`/api/v1/exhibitions/${id}`, data)
        result = resp.data
        if (result) {
          const index = this.listExhibitions.findIndex(e => e.id === id)
          if (index !== -1) this.listExhibitions[index] = result
          notifyServerSuccess('Выставка обновлена')
        }
      } catch (e) {
        console.error('Error updating exhibition:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось обновить выставку')
        this.error = e?.response?.data?.error || 'Не удалось обновить выставку'
        result = null
      }
      return result
    },

    /**
     * DELETE /api/v1/exhibitions/:id - Удалить выставку
     */
    async deleteExhibition(id) {
      let success = true
      try {
        await apiClient.delete(`/api/v1/exhibitions/${id}`)
        this.listExhibitions = this.listExhibitions.filter(e => e.id !== id)
        notifyServerSuccess('Выставка удалена')
      } catch (e) {
        console.error('Error deleting exhibition:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось удалить выставку')
        this.error = e?.response?.data?.error || 'Не удалось удалить выставку'
        success = false
      }
      return success
    },

    // ==================== ГАЛЕРЕЯ ФОТО СОБЫТИЯ ====================

    /**
     * POST /api/v1/exhibitions/:id/photos - Добавить фото в галерею
     * @return {object[]|null} обновлённый список фото выставки
     */
    async addPhoto(exhibitionId, { fileId, caption }) {
      let result = null
      try {
        const resp = await apiClient.post(`/api/v1/exhibitions/${exhibitionId}/photos`, { fileId, caption })
        result = resp.data
      } catch (e) {
        console.error('Error adding exhibition photo:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось добавить фото')
        result = null
      }
      return result
    },

    /**
     * PUT /api/v1/exhibitions/:id/photos/:photoId - Изменить подпись фото
     */
    async updatePhotoCaption(exhibitionId, photoId, caption) {
      let result = null
      try {
        const resp = await apiClient.put(`/api/v1/exhibitions/${exhibitionId}/photos/${photoId}`, { caption })
        result = resp.data
      } catch (e) {
        console.error('Error updating exhibition photo:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось обновить подпись')
        result = null
      }
      return result
    },

    /**
     * DELETE /api/v1/exhibitions/:id/photos/:photoId - Удалить фото из галереи
     */
    async deletePhoto(exhibitionId, photoId) {
      let result = null
      try {
        const resp = await apiClient.delete(`/api/v1/exhibitions/${exhibitionId}/photos/${photoId}`)
        result = resp.data
        notifyServerSuccess('Фото удалено')
      } catch (e) {
        console.error('Error deleting exhibition photo:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось удалить фото')
        result = null
      }
      return result
    },

    /**
     * PATCH /api/v1/exhibitions/:id/photos/reorder - Пересортировать галерею после drag&drop
     */
    async reorderPhotos(exhibitionId, ids) {
      let result = null
      try {
        const resp = await apiClient.patch(`/api/v1/exhibitions/${exhibitionId}/photos/reorder`, { ids })
        result = resp.data
      } catch (e) {
        console.error('Error reordering exhibition photos:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось изменить порядок фото')
        result = null
      }
      return result
    },
  }
})
