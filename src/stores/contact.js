// stores/contact.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useContact = defineStore('contact', {
  state: () => {
    return {
      listContacts: [],
      currentContact: null,
      loading: false,
      error: null,
    }
  },

  actions: {
    /**
     * GET /api/v1/contacts - Получить все свои контакты
     */
    async getListContacts() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/contacts')
        this.listContacts = resp.data || []
      } catch (e) {
        console.error('Error loading contacts:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to load contacts')
        this.error = e?.response?.data?.error || 'Failed to load contacts'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * GET /api/v1/contacts/:id - Получить контакт по ID
     */
    async getContactById(id) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.get(`/api/v1/contacts/${id}`)
        result = resp.data
        this.currentContact = result
      } catch (e) {
        console.error('Error fetching contact by id:', e)
        if (e?.response?.status !== 404) {
          notifyServerError(e?.response?.data?.error || 'Failed to load contact details')
        }
        this.error = e?.response?.data?.error || 'Failed to load contact details'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * POST /api/v1/contacts - Создать новый контакт
     * @param {Object} contactData - { user_id: string, name: string, phone: string, messenger: string, notes: string }
     */
    async createContact(contactData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.post('/api/v1/contacts', contactData)
        result = resp.data
        this.listContacts = [result, ...this.listContacts]
        notifyServerSuccess('Контакт сохранён')
      } catch (e) {
        console.error('Error creating contact:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to create contact')
        this.error = e?.response?.data?.error || 'Failed to create contact'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * PUT /api/v1/contacts/:id - Обновить контакт
     * @param {Object} contactData - { id: string, name: string, phone: string, messenger: string, notes: string }
     */
    async updateContact(contactData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const { id, ...payload } = contactData
        const resp = await apiClient.put(`/api/v1/contacts/${id}`, payload)
        result = resp.data

        const index = this.listContacts.findIndex(item => item.id === id)
        if (index !== -1) this.listContacts[index] = result
        if (this.currentContact?.id === id) {
          this.currentContact = result
        }
        notifyServerSuccess('Контакт обновлён')
      } catch (e) {
        console.error('Error updating contact:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to update contact')
        this.error = e?.response?.data?.error || 'Failed to update contact'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * DELETE /api/v1/contacts/:id - Удалить контакт
     * @param {string} id - ID контакта
     */
    async deleteContact(id) {
      this.loading = true
      this.error = null
      let success = true

      try {
        await apiClient.delete(`/api/v1/contacts/${id}`)
        this.listContacts = this.listContacts.filter(item => item.id !== id)
        if (this.currentContact?.id === id) {
          this.currentContact = null
        }
        notifyServerSuccess('Контакт удалён')
      } catch (e) {
        console.error('Error deleting contact:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to delete contact')
        this.error = e?.response?.data?.error || 'Failed to delete contact'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * POST /api/v1/contacts/:id/works - Привязать работу к контакту
     * @param {string} contactId
     * @param {string} artId
     * @param {'purchased'|'interested'} status
     */
    async addWorkToContact(contactId, artId, status) {
      try {
        const resp = await apiClient.post(`/api/v1/contacts/${contactId}/works`, { artId, status })
        this.__setContactWorks(contactId, resp.data)
        notifyServerSuccess(status === 'purchased' ? 'Отмечено как купленное' : 'Добавлено в интересы')
        return resp.data
      } catch (e) {
        console.error('Error linking work to contact:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось привязать работу')
        return null
      }
    },

    /**
     * PATCH /api/v1/contacts/:id/works/:artId - Изменить статус связи
     * (например, "интересуется" -> "купил")
     */
    async updateContactWorkStatus(contactId, artId, status) {
      try {
        const resp = await apiClient.patch(`/api/v1/contacts/${contactId}/works/${artId}`, { status })
        this.__setContactWorks(contactId, resp.data)
        notifyServerSuccess('Статус обновлён')
        return resp.data
      } catch (e) {
        console.error('Error updating contact work status:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось изменить статус')
        return null
      }
    },

    /**
     * DELETE /api/v1/contacts/:id/works/:artId - Отвязать работу от контакта
     */
    async removeWorkFromContact(contactId, artId) {
      try {
        const resp = await apiClient.delete(`/api/v1/contacts/${contactId}/works/${artId}`)
        this.__setContactWorks(contactId, resp.data)
        notifyServerSuccess('Работа отвязана')
        return resp.data
      } catch (e) {
        console.error('Error removing work from contact:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось отвязать работу')
        return null
      }
    },

    // Обновляет works и в списке, и в currentContact (если это он) — сервер
    // в ответ на изменение связи присылает уже полный актуальный список работ.
    __setContactWorks(contactId, works) {
      const index = this.listContacts.findIndex(c => c.id === contactId)
      if (index !== -1) this.listContacts[index] = { ...this.listContacts[index], works }
      if (this.currentContact?.id === contactId) {
        this.currentContact = { ...this.currentContact, works }
      }
    },

    clearCurrentContact() {
      this.currentContact = null
    },

    clearError() {
      this.error = null
    },

    resetContactsState() {
      this.listContacts = []
      this.currentContact = null
      this.loading = false
      this.error = null
    }
  }
})
