// stores/user.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'
import { setUser } from '@/services/auth.js'

export const useUser = defineStore('user', {
  state: () => {
    return {
      loading: false,
      error: null,
    }
  },

  actions: {
    /**
     * PATCH /api/v1/users/update - Обновить свой профиль
     * @param {Object} userData - { name, surname, bdate, country, city, sex, phone }
     */
    async updateUser(userData) {
      this.loading = true
      this.error = null
      let result = null

      try {
        const resp = await apiClient.patch('/api/v1/users/update', userData)
        result = resp.data

        if (result) {
          setUser(result) // обновляем закэшированного пользователя, чтобы изменения не потерялись после перезагрузки
          notifyServerSuccess('Профиль обновлён')
        }
      } catch (e) {
        console.error('Error updating user:', e)
        const reason = e?.response?.data?.message || e?.response?.data?.error || 'Не удалось обновить профиль'
        notifyServerError(reason)
        this.error = reason
        result = null
      } finally {
        this.loading = false
      }
      return result
    },
  }
})
