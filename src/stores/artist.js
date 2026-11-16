import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

// Ошибки бэкенда по художникам — по-русски
function artistErrorText(e, fallback) {
    const raw = e?.response?.data?.error || ''
    const used = raw.match(/^Cannot delete artist: it is used by (\d+) art object/)
    if (used) return `Нельзя удалить художника: у него есть работы (${used[1]}). Сначала перенесите или удалите их.`
    const map = {
        'Artist not found': 'Художник не найден',
        'Artist name is required': 'Укажите имя художника',
        'File not found': 'Файл не найден',
        'commission_pct must be between 0 and 100': 'Комиссия — от 0 до 100%',
        'Artist birth_year must be a year': 'Год рождения указан неверно',
    }
    return map[raw] || raw || fallback
}

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
                notifyServerError(e?.response?.data?.error || 'Failed to load artists')
                this.error = e?.response?.data?.error || 'Failed to load artists'
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
                notifyServerError(e?.response?.data?.error || 'Failed to load artist details')
                this.error = e?.response?.data?.error || 'Failed to load artist details'
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
                notifyServerError(e?.response?.data?.error || 'Failed to load user artists')
                this.error = e?.response?.data?.error || 'Failed to load user artists'
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
                notifyServerError(e?.response?.data?.error || 'Failed to create artist')
                this.error = e?.response?.data?.error || 'Failed to create artist'
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
                notifyServerError(e?.response?.data?.error || 'Failed to update artist')
                this.error = e?.response?.data?.error || 'Failed to update artist'
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
                notifyServerError(e?.response?.data?.error || 'Failed to delete artist')
                this.error = e?.response?.data?.error || 'Failed to delete artist'
                success = false
            } finally {
                this.loading = false
            }
            return success
        },

        // ==================== «Мои художники» ====================

        /**
         * GET /api/v1/art/artists/summary — художники со сводкой (работы,
         * продажи, не выплачено, открытые задачи) и лимит галереи
         * { quota: { used, limit } | null, artists: [...] }
         */
        async getSummary() {
            try {
                const resp = await apiClient.get('/api/v1/art/artists/summary')
                return resp.data
            } catch (e) {
                console.error('Error fetching artists summary:', e)
                notifyServerError(artistErrorText(e, 'Не удалось загрузить художников'))
                return null
            }
        },

        /** GET /api/v1/art/artists/byline-options — { gallery, own } для поля «Художник/Галерея» */
        async getBylineOptions() {
            try {
                const resp = await apiClient.get('/api/v1/art/artists/byline-options')
                return resp.data
            } catch (e) {
                // Подсказки необязательны — поле остаётся обычным текстовым
                console.error('Error fetching byline options:', e)
                return null
            }
        },

        /** GET /api/v1/art/artists/:id/overview — карточка художника */
        async getOverview(id) {
            try {
                const resp = await apiClient.get(`/api/v1/art/artists/${id}/overview`)
                return resp.data
            } catch (e) {
                console.error('Error fetching artist overview:', e)
                if (e?.response?.status !== 404) notifyServerError(artistErrorText(e, 'Не удалось загрузить художника'))
                return null
            }
        },

        /**
         * PUT /api/v1/art/artists — имя и анкета (фото, контакты, комиссия);
         * в отличие от updateArtist — с понятными сообщениями об ошибках
         */
        async saveProfile(data) {
            try {
                const resp = await apiClient.put('/api/v1/art/artists', data)
                this.listArtists = this.listArtists.map(a => (a.id === resp.data.id ? resp.data : a))
                return resp.data
            } catch (e) {
                console.error('Error saving artist profile:', e)
                notifyServerError(artistErrorText(e, 'Не удалось сохранить художника'))
                return null
            }
        },

        /** POST /api/v1/art/artists — с понятным текстом при превышении лимита */
        async addArtist(data) {
            try {
                const resp = await apiClient.post('/api/v1/art/artists', data)
                this.listArtists.push(resp.data)
                return resp.data
            } catch (e) {
                console.error('Error creating artist:', e)
                notifyServerError(artistErrorText(e, 'Не удалось добавить художника'))
                return null
            }
        },

        /** DELETE /api/v1/art/artists/:id — нельзя, если у художника есть работы */
        async removeArtist(id) {
            try {
                await apiClient.delete(`/api/v1/art/artists/${id}`)
                this.listArtists = this.listArtists.filter(a => a.id !== id)
                return true
            } catch (e) {
                console.error('Error deleting artist:', e)
                notifyServerError(artistErrorText(e, 'Не удалось удалить художника'))
                return false
            }
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
