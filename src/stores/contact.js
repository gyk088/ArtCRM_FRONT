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
