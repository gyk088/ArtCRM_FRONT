// stores/tags.js
// Теги работ — справочник по аналогии со статусами (название + цвет), но у
// одной работы может быть несколько тегов (work.tags — массив id). Внутри
// галереи теги общие для галереи и всех её менеджеров.
// Набор действий совпадает со статусами — чтобы работал ReferenceEntityPanel.
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

const SERVER_ERRORS = {
  'Tag not found': 'Тег не найден',
  'Tag name is required': 'Укажите название тега',
  'Tag name too long (max 100 characters)': 'Название тега слишком длинное (максимум 100 символов)',
  'Invalid color: must be a hex string like #8a6d2f': 'Некорректный цвет',
}

function errorText(e, fallback) {
  const raw = e?.response?.data?.error
  return SERVER_ERRORS[raw] || raw || fallback
}

// Цвета для тегов, созданных «на лету» из карточки работы (без выбора цвета)
export const TAG_PALETTE = ['#8a6d2f', '#2e86de', '#27ae60', '#c0392b', '#8e44ad', '#d35400', '#16a085', '#7f8c8d']

export const useTags = defineStore('tags', {
  state: () => ({
    listTags: [],
    loading: false,
    error: null,
  }),

  getters: {
    getTagById: (state) => (id) => state.listTags.find(t => t.id === id),
  },

  actions: {
    /** GET /api/v1/art/tags */
    async getListTags() {
      this.loading = true
      this.error = null
      try {
        const resp = await apiClient.get('/api/v1/art/tags')
        this.listTags = resp.data || []
        return true
      } catch (e) {
        console.error('Error fetching tags:', e)
        this.error = errorText(e, 'Не удалось загрузить теги')
        notifyServerError(this.error)
        return false
      } finally {
        this.loading = false
      }
    },

    /** POST /api/v1/art/tags — { name, color? } */
    async createTag(tagData, { silent = false } = {}) {
      this.loading = true
      this.error = null
      try {
        const resp = await apiClient.post('/api/v1/art/tags', tagData)
        const tag = resp.data
        if (tag) {
          this.listTags = [...this.listTags, tag].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
          if (!silent) notifyServerSuccess('Тег создан')
        }
        return tag
      } catch (e) {
        console.error('Error creating tag:', e)
        this.error = errorText(e, 'Не удалось создать тег')
        notifyServerError(this.error)
        return null
      } finally {
        this.loading = false
      }
    },

    /** PUT /api/v1/art/tags — { id, name?, color? } */
    async updateTag(tagData) {
      this.loading = true
      this.error = null
      try {
        const resp = await apiClient.put('/api/v1/art/tags', tagData)
        const tag = resp.data
        if (tag) {
          const index = this.listTags.findIndex(t => t.id === tagData.id)
          if (index !== -1) this.listTags[index] = tag
          notifyServerSuccess('Тег обновлён')
        }
        return tag
      } catch (e) {
        console.error('Error updating tag:', e)
        this.error = errorText(e, 'Не удалось обновить тег')
        notifyServerError(this.error)
        return null
      } finally {
        this.loading = false
      }
    },

    /** DELETE /api/v1/art/tags/:id — тег снимается со всех работ */
    async deleteTag(id) {
      this.loading = true
      this.error = null
      try {
        const resp = await apiClient.delete(`/api/v1/art/tags/${id}`)
        this.listTags = this.listTags.filter(t => t.id !== id)
        const n = resp.data?.removedFromWorks || 0
        notifyServerSuccess(n ? `Тег удалён и снят с работ: ${n}` : 'Тег удалён')
        return true
      } catch (e) {
        console.error('Error deleting tag:', e)
        this.error = errorText(e, 'Не удалось удалить тег')
        notifyServerError(this.error)
        return false
      } finally {
        this.loading = false
      }
    },
  },
})
