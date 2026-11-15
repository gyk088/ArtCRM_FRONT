// stores/notes.js
// Заметки: заголовок, форматированный текст (HTML из редактора), привязка
// к художнику, кто/когда создал и изменил. В галерее — общие (см. NoteService).
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError } from '@/services/notify.js'

const SERVER_ERRORS = {
  'Note not found': 'Заметка не найдена',
  'Note title is required': 'Укажите заголовок заметки',
  'Note is too long': 'Заметка слишком большая',
  'Artist not found': 'Художник не найден — обновите страницу',
}

function errorText(e, fallback) {
  const raw = e?.response?.data?.error
  return SERVER_ERRORS[raw] || raw || fallback
}

export const useNotes = defineStore('notes', {
  state: () => ({
    listNotes: [],
    loading: false,
  }),

  actions: {
    /** GET /api/v1/notes — список (без полного текста, с preview) */
    async getListNotes() {
      this.loading = true
      try {
        const resp = await apiClient.get('/api/v1/notes')
        this.listNotes = resp.data || []
        return true
      } catch (e) {
        console.error('Error fetching notes:', e)
        notifyServerError(errorText(e, 'Не удалось загрузить заметки'))
        return false
      } finally {
        this.loading = false
      }
    },

    /** GET /api/v1/notes/:id */
    async getNote(id) {
      try {
        const resp = await apiClient.get(`/api/v1/notes/${id}`)
        return resp.data
      } catch (e) {
        console.error('Error fetching note:', e)
        notifyServerError(errorText(e, 'Не удалось загрузить заметку'))
        return null
      }
    },

    /** POST /api/v1/notes — { title, content?, artist_id? } */
    async createNote(data) {
      try {
        const resp = await apiClient.post('/api/v1/notes', data)
        return resp.data
      } catch (e) {
        console.error('Error creating note:', e)
        notifyServerError(errorText(e, 'Не удалось создать заметку'))
        return null
      }
    },

    /** PUT /api/v1/notes/:id — { title?, content?, artist_id? } */
    async updateNote(id, data) {
      try {
        const resp = await apiClient.put(`/api/v1/notes/${id}`, data)
        return resp.data
      } catch (e) {
        console.error('Error updating note:', e)
        notifyServerError(errorText(e, 'Не удалось сохранить заметку'))
        return null
      }
    },

    /** DELETE /api/v1/notes/:id */
    async deleteNote(id) {
      try {
        await apiClient.delete(`/api/v1/notes/${id}`)
        this.listNotes = this.listNotes.filter(n => n.id !== id)
        return true
      } catch (e) {
        console.error('Error deleting note:', e)
        notifyServerError(errorText(e, 'Не удалось удалить заметку'))
        return false
      }
    },
  },
})
