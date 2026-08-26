// stores/admin.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useAdmin = defineStore('admin', {
  state: () => {
    return {
      listUsers: [],
      loading: false,
      error: null,
    }
  },

  actions: {
    /**
     * GET /api/v1/admin/users - Super Admin видит всех, Gallery — только своих
     */
    async getAllUsers() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/admin/users')
        this.listUsers = resp.data || []
      } catch (e) {
        console.error('Error fetching admin users:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось загрузить пользователей')
        this.error = e?.response?.data?.error || 'Не удалось загрузить пользователей'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * POST /api/v1/admin/users - Создать Manager/Artist
     */
    async createUser(data) {
      let result = null
      try {
        const resp = await apiClient.post('/api/v1/admin/users', data)
        result = resp.data
        if (result) {
          this.listUsers.unshift(result)
          notifyServerSuccess('Пользователь создан')
        }
      } catch (e) {
        console.error('Error creating user:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось создать пользователя')
        result = null
      }
      return result
    },

    /**
     * POST /api/v1/admin/galleries - Создать Gallery (только Super Admin)
     */
    async createGallery(data) {
      let result = null
      try {
        const resp = await apiClient.post('/api/v1/admin/galleries', data)
        result = resp.data
        if (result) {
          this.listUsers.unshift(result)
          notifyServerSuccess('Галерея создана')
        }
      } catch (e) {
        console.error('Error creating gallery:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось создать галерею')
        result = null
      }
      return result
    },

    /**
     * PATCH /api/v1/admin/users/:id/role
     */
    async changeRole(id, role) {
      let result = null
      try {
        const resp = await apiClient.patch(`/api/v1/admin/users/${id}/role`, { role })
        result = resp.data
        if (result) {
          const index = this.listUsers.findIndex(u => u.id === id)
          if (index !== -1) this.listUsers[index] = result
          notifyServerSuccess('Роль изменена')
        }
      } catch (e) {
        console.error('Error changing role:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось изменить роль')
        result = null
      }
      return result
    },

    /**
     * PATCH /api/v1/admin/users/:id/block
     */
    async toggleBlock(id, active) {
      let result = null
      try {
        const resp = await apiClient.patch(`/api/v1/admin/users/${id}/block`, { active })
        result = resp.data
        if (result) {
          const index = this.listUsers.findIndex(u => u.id === id)
          if (index !== -1) this.listUsers[index] = result
          notifyServerSuccess(active ? 'Пользователь разблокирован' : 'Пользователь заблокирован')
        }
      } catch (e) {
        console.error('Error toggling block:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось изменить статус блокировки')
        result = null
      }
      return result
    },

    /**
     * PATCH /api/v1/admin/users/:id/password
     */
    async changePassword(id, password) {
      let success = true
      try {
        await apiClient.patch(`/api/v1/admin/users/${id}/password`, { password })
        notifyServerSuccess('Пароль изменён')
      } catch (e) {
        console.error('Error changing password:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось изменить пароль')
        success = false
      }
      return success
    },

    /**
     * PATCH /api/v1/admin/users/:id/email
     */
    async changeEmail(id, email) {
      let result = null
      try {
        const resp = await apiClient.patch(`/api/v1/admin/users/${id}/email`, { email })
        result = resp.data
        if (result) {
          const index = this.listUsers.findIndex(u => u.id === id)
          if (index !== -1) this.listUsers[index] = result
          notifyServerSuccess('Email изменён')
        }
      } catch (e) {
        console.error('Error changing email:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось изменить email')
        result = null
      }
      return result
    },
  }
})
