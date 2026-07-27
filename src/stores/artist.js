import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useArtist = defineStore('artist', {
    state: () => {
        return {
            // Artists
            listArtists: [],           // Список всех артистов
            currentArtist: null,       // Текущий выбранный артист
            loading: false,
            error: null,
        }
    },

    getters: {
        // Artists getters
        findArtistById: (state) => (id) => {
            return state.listArtists.find(item => item.id === id)
        },
        totalArtists: (state) => state.listArtists.length,
    },

    actions: {
        // ==================== Artists ACTIONS ====================

        /**
         * GET /api/v1/art/artists - Получить всех артистов
         */
        async getListArtists() {
            this.loading = true
            this.error = null
            let success = true

            try {
                const resp = await apiClient.get('/api/v1/art/artists')
                this.listArtists = resp.data || []
                console.log('Artists loaded:', this.listArtists)
            } catch (e) {
                console.error('Error fetching artists:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to load artists')
                this.error = e?.response?.data?.message || 'Failed to load artists'
                success = false
            } finally {
                this.loading = false
            }
            return success
        },

        /**
         * GET /api/v1/art/artists/:id - Получить артиста по ID
         */
        async getArtistById(id) {
            this.loading = true
            this.error = null
            let result = null

            try {
                const resp = await apiClient.get(`/api/v1/art/artists/${id}`)
                result = resp.data
                this.currentArtist = result
                console.log('Artist by ID:', result)
            } catch (e) {
                console.error('Error fetching artist by id:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to load artist details')
                this.error = e?.response?.data?.message || 'Failed to load artist details'
                result = null
            } finally {
                this.loading = false
            }
            return result
        },

        /**
         * GET /api/v1/art/artists/user/:userId - Получить артистов по user_id
         */
        async getArtistByUserId(userId) {
            this.loading = true
            this.error = null
            let result = []

            try {
                const resp = await apiClient.get(`/api/v1/art/artists/user/${userId}`)
                result = resp.data || []
                console.log('Artists by user:', result)
            } catch (e) {
                console.error('Error fetching artists by user:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to load user artists')
                this.error = e?.response?.data?.message || 'Failed to load user artists'
                result = []
            } finally {
                this.loading = false
            }
            return result
        },

        /**
         * POST /api/v1/art/artists - Создать нового артиста
         * @param {Object} artistData - { user_id: string, name: string }
         */
        async createArtist(artistData) {
            this.loading = true
            this.error = null
            let result = null

            try {
                const resp = await apiClient.post('/api/v1/art/artists', artistData)
                result = resp.data

                if (result) {
                    this.listArtists.push(result)
                    notifyServerSuccess('Artist created successfully')
                    console.log('Artist created:', result)
                }
            } catch (e) {
                console.error('Error creating artist:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to create artist')
                this.error = e?.response?.data?.message || 'Failed to create artist'
                result = null
            } finally {
                this.loading = false
            }
            return result
        },

        /**
         * PUT /api/v1/art/artists - Обновить артиста (полное обновление)
         * @param {Object} artistData - { id: string, name: string }
         */
        async updateArtist(artistData) {
            this.loading = true
            this.error = null
            let result = null

            try {
                const resp = await apiClient.put('/api/v1/art/artists', artistData)
                result = resp.data

                if (result) {
                    const index = this.listArtists.findIndex(item => item.id === artistData.id)
                    if (index !== -1) {
                        this.listArtists[index] = result
                    }
                    if (this.currentArtist?.id === artistData.id) {
                        this.currentArtist = result
                    }
                    notifyServerSuccess('Artist updated successfully')
                    console.log('Artist updated:', result)
                }
            } catch (e) {
                console.error('Error updating artist:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to update artist')
                this.error = e?.response?.data?.message || 'Failed to update artist'
                result = null
            } finally {
                this.loading = false
            }
            return result
        },

        /**
         * DELETE /api/v1/art/artists/:id - Удалить артиста
         * @param {string} id - ID артиста
         */
        async deleteArtist(id) {
            this.loading = true
            this.error = null
            let success = true

            try {
                await apiClient.delete(`/api/v1/art/artists/${id}`)

                this.listArtists = this.listArtists.filter(item => item.id !== id)

                if (this.currentArtist?.id === id) {
                    this.currentArtist = null
                }

                notifyServerSuccess('Artist deleted successfully')
                console.log('Artist deleted:', id)
            } catch (e) {
                console.error('Error deleting artist:', e)
                notifyServerError(e?.response?.data?.message || 'Failed to delete artist')
                this.error = e?.response?.data?.message || 'Failed to delete artist'
                success = false
            } finally {
                this.loading = false
            }
            return success
        },

        /**
         * Очистить текущего выбранного артиста
         */
        clearCurrentArtist() {
            this.currentArtist = null
        },

        /**
         * Сбросить ошибку
         */
        clearError() {
            this.error = null
        },

        /**
        * Сбросить все состояние артиста
        */
        resetArtistState() {
            this.listArtists = []
            this.currentArtist = null
            this.loading = false
            this.error = null
        }
    }
})
