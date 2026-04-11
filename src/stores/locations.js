// stores/art.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useLocations = defineStore('locations', {
  state: () => {
    return {
      // Locations
      listLocations: [],           // Список всех локаций
      currentLocation: null,       // Текущая выбранная локация
      loading: false,
      error: null,
    }
  },

  // getters: {
  //   // Locations getters
  //   getLocationById: (state) => (id) => {
  //     return state.listLocations.find(item => item.id === id)
  //   },
  //   totalLocations: (state) => state.listLocations.length,
  // },

  actions: {
    // ==================== LOCATIONS ACTIONS ====================
    
    /**
     * GET /api/v1/art/locations - Получить все локации
     */
    async getListLocations() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/art/locations')
        this.listLocations = resp.data || []
        console.log('Locations loaded:', this.listLocations)
      } catch (e) {
        console.error('Error fetching locations:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load locations')
        this.error = e?.response?.data?.message || 'Failed to load locations'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * GET /api/v1/art/locations/:id - Получить локацию по ID
     */
    async getLocationById(id) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.get(`/api/v1/art/locations/${id}`)
        result = resp.data
        this.currentLocation = result
        console.log('Location by ID:', result)
      } catch (e) {
        console.error('Error fetching location by id:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load location details')
        this.error = e?.response?.data?.message || 'Failed to load location details'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * GET /api/v1/art/locations/user/:userId - Получить локации по user_id
     */
    async getLocationsByUserId(userId) {
      this.loading = true
      this.error = null
      let result = []

      try {
        const resp = await apiClient.get(`/api/v1/art/locations/user/${userId}`)
        result = resp.data || []
        console.log('Locations by user:', result)
      } catch (e) {
        console.error('Error fetching locations by user:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load user locations')
        this.error = e?.response?.data?.message || 'Failed to load user locations'
        result = []
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * POST /api/v1/art/locations - Создать новую локацию
     * @param {Object} locationData - { user_id: string, name: string }
     */
    async createLocation(locationData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.post('/api/v1/art/locations', locationData)
        result = resp.data

        // Добавляем новую локацию в список
        if (result) {
          this.listLocations.push(result)
          notifyServerSuccess('Location created successfully')
          console.log('Location created:', result)
        }
      } catch (e) {
        console.error('Error creating location:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to create location')
        this.error = e?.response?.data?.message || 'Failed to create location'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * PUT /api/v1/art/locations - Обновить локацию (полное обновление)
     * @param {Object} locationData - { id: string, name: string }
     */
    async updateLocation(locationData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.put('/api/v1/art/locations', locationData)
        result = resp.data

        // Обновляем локацию в списке
        if (result) {
          const index = this.listLocations.findIndex(item => item.id === locationData.id)
          if (index !== -1) {
            this.listLocations[index] = result
          }
          if (this.currentLocation?.id === locationData.id) {
            this.currentLocation = result
          }
          notifyServerSuccess('Location updated successfully')
          console.log('Location updated:', result)
        }
      } catch (e) {
        console.error('Error updating location:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to update location')
        this.error = e?.response?.data?.message || 'Failed to update location'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * DELETE /api/v1/art/locations/:id - Удалить локацию
     * @param {string} id - ID локации
     */
    async deleteLocation(id) {
      this.loading = true
      this.error = null
      let success = true

      try {
        await apiClient.delete(`/api/v1/art/locations/${id}`)

        // Удаляем локацию из списка
        this.listLocations = this.listLocations.filter(item => item.id !== id)
        
        // Если удалили текущую локацию, очищаем её
        if (this.currentLocation?.id === id) {
          this.currentLocation = null
        }
        
        notifyServerSuccess('Location deleted successfully')
        console.log('Location deleted:', id)
      } catch (e) {
        console.error('Error deleting location:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to delete location')
        this.error = e?.response?.data?.message || 'Failed to delete location'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * Очистить текущую выбранную локацию
     */
    clearCurrentLocation() {
      this.currentLocation = null
    },

    /**
     * Сбросить ошибку
     */
    clearError() {
      this.error = null
    },

    /**
     * Сбросить все состояние локаций
     */
    resetLocationsState() {
      this.listLocations = []
      this.currentLocation = null
      this.loading = false
      this.error = null
    }
  }
})