// stores/contactCategory.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useContactCategory = defineStore('contact-category', {
  state: () => {
    return {
      listCategories: [],
      loading: false,
      error: null,
    }
  },

  actions: {
    /**
     * GET /api/v1/contacts/categories - Получить все категории контактов
     */
    async getListCategories() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/contacts/categories')
        this.listCategories = resp.data || []
      } catch (e) {
        console.error('Error fetching contact categories:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось загрузить категории')
        this.error = e?.response?.data?.error || 'Не удалось загрузить категории'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * POST /api/v1/contacts/categories - Создать категорию
     * @param {Object} data - { name: string }
     */
    async createCategory(data) {
      let result = null
      try {
        const resp = await apiClient.post('/api/v1/contacts/categories', data)
        result = resp.data
        if (result) {
          this.listCategories.push(result)
          notifyServerSuccess('Категория добавлена')
        }
      } catch (e) {
        console.error('Error creating contact category:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось создать категорию')
        result = null
      }
      return result
    },

    /**
     * PUT /api/v1/contacts/categories - Обновить категорию
     * @param {Object} data - { id: string, name: string }
     */
    async updateCategory(data) {
      let result = null
      try {
        const resp = await apiClient.put('/api/v1/contacts/categories', data)
        result = resp.data
        if (result) {
          const index = this.listCategories.findIndex(item => item.id === data.id)
          if (index !== -1) this.listCategories[index] = result
          notifyServerSuccess('Категория обновлена')
        }
      } catch (e) {
        console.error('Error updating contact category:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось обновить категорию')
        result = null
      }
      return result
    },

    /**
     * DELETE /api/v1/contacts/categories/:id - Удалить категорию
     */
    async deleteCategory(id) {
      let success = true
      try {
        await apiClient.delete(`/api/v1/contacts/categories/${id}`)
        this.listCategories = this.listCategories.filter(item => item.id !== id)
        notifyServerSuccess('Категория удалена')
      } catch (e) {
        console.error('Error deleting contact category:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось удалить категорию')
        success = false
      }
      return success
    },
  }
})
