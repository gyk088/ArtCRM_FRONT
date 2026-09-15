// stores/contact.js
//
// Бэкенд-эндпоинта /api/v1/art/contacts пока не существует (фронтенд ходит
// на удалённый сервер, к которому нет доступа), поэтому контакты временно
// хранятся локально в localStorage браузера. Публичный интерфейс стора
// (getListContacts/createContact/updateContact/deleteContact) сделан таким
// же, как у остальных сущностей (locations, artist и т.д.), чтобы страницу
// не пришлось переписывать, когда появится реальный бэкенд — тогда нужно
// будет заменить только тело этих методов на apiClient-запросы.
import { defineStore } from 'pinia'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

const STORAGE_KEY = 'artcrm_contacts_local'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Error reading contacts from localStorage:', e)
    return []
  }
}

function saveToStorage(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

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
     * Загрузить все контакты (из localStorage)
     */
    async getListContacts() {
      this.loading = true
      this.error = null
      let success = true

      try {
        this.listContacts = loadFromStorage()
      } catch (e) {
        console.error('Error loading contacts:', e)
        notifyServerError('Failed to load contacts')
        this.error = 'Failed to load contacts'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * Получить контакт по ID (из localStorage)
     */
    async getContactById(id) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const list = loadFromStorage()
        result = list.find(item => item.id === id) || null
        this.currentContact = result
      } catch (e) {
        console.error('Error fetching contact by id:', e)
        notifyServerError('Failed to load contact details')
        this.error = 'Failed to load contact details'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * Создать новый контакт (сохраняется в localStorage)
     * @param {Object} contactData - { user_id: string, name: string, phone: string, messenger: string, notes: string }
     */
    async createContact(contactData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const list = loadFromStorage()
        result = { ...contactData, id: generateId(), createdAt: new Date().toISOString() }
        list.push(result)
        saveToStorage(list)

        this.listContacts = list
        notifyServerSuccess('Контакт сохранён')
      } catch (e) {
        console.error('Error creating contact:', e)
        notifyServerError('Failed to create contact')
        this.error = 'Failed to create contact'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * Обновить контакт (полное обновление, локально)
     * @param {Object} contactData - { id: string, name: string, phone: string, messenger: string, notes: string }
     */
    async updateContact(contactData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const list = loadFromStorage()
        const index = list.findIndex(item => item.id === contactData.id)
        if (index === -1) throw new Error('Contact not found')

        result = { ...list[index], ...contactData }
        list[index] = result
        saveToStorage(list)

        this.listContacts = list
        if (this.currentContact?.id === contactData.id) {
          this.currentContact = result
        }
        notifyServerSuccess('Контакт обновлён')
      } catch (e) {
        console.error('Error updating contact:', e)
        notifyServerError('Failed to update contact')
        this.error = 'Failed to update contact'
        result = null
      } finally {
        this.loading = false
      }
      return result
    },

    /**
     * Удалить контакт (локально)
     * @param {string} id - ID контакта
     */
    async deleteContact(id) {
      this.loading = true
      this.error = null
      let success = true

      try {
        const list = loadFromStorage().filter(item => item.id !== id)
        saveToStorage(list)

        this.listContacts = list
        if (this.currentContact?.id === id) {
          this.currentContact = null
        }
        notifyServerSuccess('Контакт удалён')
      } catch (e) {
        console.error('Error deleting contact:', e)
        notifyServerError('Failed to delete contact')
        this.error = 'Failed to delete contact'
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
