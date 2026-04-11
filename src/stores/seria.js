import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useSerias = defineStore('seria', {
    state: () => {
        return {
            // Serias
            listSerias: [],           // Список всех серий
            currentSeria: null,     // Текущее выбранное медиа
            loading: false,
            error: null,
        }
    },

    getters: {
        // Serias getters
        getSeriaById: (state) => (id) => {
            return state.listSerias.find(item => item.id === id)
        },
        totalSerias: (state) => state.listSerias.length,
    },

    actions: {
        // ==================== Serias ACTIONS ====================

        /**
         * GET /api/v1/art/serias - Получить все серии  
         */
        async getListSerias() {
            this.loading = true
            this.error = null
            let success = true

            try {
                console.log('Serias loaded:', this.listSerias)
                const resp = await apiClient.get('/api/v1/art/serias')
                this.listSerias = resp.data || []
                console.log('Serias loaded:', this.listSerias)
            } catch (e) {
                console.error('Error fetching serias:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to load serias')
                this.error = e?.response?.data?.message || 'Failed to load serias'
                success = false
            } finally {
                this.loading = false
            }
            return success
        },

        /**
     * GET /api/v1/art/serias/:id - Получить серии по ID
     */
        async getSeriasById(id) {
            this.loading = true
            this.error = null
            let result = null

            try {
                const resp = await apiClient.get(`/api/v1/art/serias/${id}`)
                result = resp.data
                this.currentSeria = result
                console.log('Seria by ID:', result)
            } catch (e) {
                console.error('Error fetching seria by id:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to load seria details')
                this.error = e?.response?.data?.message || 'Failed to load seria details'
                result = null
            } finally {
                this.loading = false
            }
            return result
        },

        /**
         * GET /api/v1/art/serias/user/:userId - Получить серии по user_id
         */
        async getSeriaByUserId(userId) {
            this.loading = true
            this.error = null
            let result = []

            try {
                const resp = await apiClient.get(`/api/v1/art/serias/user/${userId}`)
                result = resp.data || []
                console.log('Seria by user:', result)
            } catch (e) {
                console.error('Error fetching seria by user:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to load user seria')
                this.error = e?.response?.data?.message || 'Failed to load user seria'
                result = []
            } finally {
                this.loading = false
            }
            return result
        },

        /**
         * POST /api/v1/art/serias - Создать новую серию
         * @param {Object} seriaData - { user_id: string, name: string }
         */
        async createSeria(seriaData) {
            this.loading = true
            this.error = null
            let result = null

            try {
                const resp = await apiClient.post('/api/v1/art/serias', seriaData)
                result = resp.data

                // Добавляем новое серию в список
                if (result) {
                    this.listSerias.push(result)
                    notifyServerSuccess('Seria created successfully')
                    console.log('Seria created:', result)
                }
            } catch (e) {
                console.error('Error creating seria:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to create seria')
                this.error = e?.response?.data?.message || 'Failed to create seria'
                result = null
            } finally {
                this.loading = false
            }
            return result
        },

        /**
         * PUT /api/v1/art/seria - Обновить серии (полное обновление)
         * @param {Object} seriaData - { id: string, name: string }
         */
        async updateSeria(seriaData) {
            this.loading = true
            this.error = null
            let result = null

            try {
                const resp = await apiClient.put('/api/v1/art/serias', seriaData)
                result = resp.data

                // Обновляем серию в списке
                if (result) {
                    const index = this.listSerias.findIndex(item => item.id === seriaData.id)
                    if (index !== -1) {
                        this.listSerias[index] = result
                    }
                    if (this.currentSeria?.id === seriaData.id) {
                        this.currentSeria = result
                    }
                    notifyServerSuccess('Seria updated successfully')
                    console.log('Seria updated:', result)
                }
            } catch (e) {
                console.error('Error updating seria:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to update seria')
                this.error = e?.response?.data?.message || 'Failed to update seria'
                result = null
            } finally {
                this.loading = false
            }
            return result
        },

        /**
         * DELETE /api/v1/art/serias/:id - Удалить серию
         * @param {string} id - ID серии
         */
        async deleteSeria(id) {
            this.loading = true
            this.error = null
            let success = true

            try {
                console.log('Seria deleted:', id)
                await apiClient.delete(`/api/v1/art/serias/${id}`)

                // Удаляем серию из списка
                this.listSerias = this.listSerias.filter(item => item.id !== id)
                console.log('Seria deleted:', id)

                // Если удалили текущую серию, очищаем его
                if (this.currentSeria?.id === id) {
                    this.currentSeria = null
                    console.log('Seria deleted:', id)
                }

                notifyServerSuccess('Seria deleted successfully')
                console.log('Seria deleted:', id)
            } catch (e) {
                console.error('Error deleting seria:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to delete seria')
                this.error = e?.response?.data?.message || 'Failed to delete seria'
                success = false
            } finally {
                this.loading = false
            }
            return success
        },

        /**
         * Очистить текущее выбранную серию
         */
        clearCurrentSeria() {
            this.currentSeria = null
        },

        /**
         * Сбросить ошибку
         */
        clearError() {
            this.error = null
        },

        /**
        * Сбросить все состояние серии
        */
        resetSeriaState() {
            this.listSerias = []
            this.currentSeria = null
            this.loading = false
            this.error = null
        }
    }
})