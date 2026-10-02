// stores/admin.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'
import { startImpersonation, endImpersonation } from '@/services/auth.js'

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
     * PATCH /api/v1/admin/users/:id/gallery - Переместить менеджера/художника
     * в другую галерею (galleryId = null — убрать из галереи)
     */
    async assignUserToGallery(id, galleryId) {
      let result = null
      try {
        const resp = await apiClient.patch(`/api/v1/admin/users/${id}/gallery`, { galleryId })
        result = resp.data
        if (result) {
          const index = this.listUsers.findIndex(u => u.id === id)
          if (index !== -1) this.listUsers[index] = result
          notifyServerSuccess('Галерея изменена')
        }
      } catch (e) {
        console.error('Error assigning user to gallery:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось изменить галерею')
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

    /**
     * PATCH /api/v1/admin/users/:id/storage-limit
     * @param {string} id
     * @param {number} limitBytes
     */
    async changeStorageLimit(id, limitBytes) {
      let result = null
      try {
        const resp = await apiClient.patch(`/api/v1/admin/users/${id}/storage-limit`, { limit_bytes: limitBytes })
        result = resp.data
        if (result) {
          const index = this.listUsers.findIndex(u => u.id === id)
          if (index !== -1) this.listUsers[index] = result
          notifyServerSuccess('Лимит места на диске изменён')
        }
      } catch (e) {
        console.error('Error changing storage limit:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось изменить лимит места на диске')
        result = null
      }
      return result
    },

    /**
     * GET /api/v1/admin/galleries/:id/quotas - Квоты галереи + использование
     */
    async getQuotaUsage(galleryId) {
      try {
        const resp = await apiClient.get(`/api/v1/admin/galleries/${galleryId}/quotas`)
        return resp.data
      } catch (e) {
        console.error('Error fetching quota usage:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось загрузить квоты')
        return null
      }
    },

    /**
     * PATCH /api/v1/admin/galleries/:id/quotas - Изменить квоты (только Super Admin)
     * @param {string} galleryId
     * @param {{quota_managers?, quota_artist_cabinets?, quota_catalog_artists?}} quotas
     */
    async updateQuotas(galleryId, quotas) {
      try {
        const resp = await apiClient.patch(`/api/v1/admin/galleries/${galleryId}/quotas`, quotas)
        notifyServerSuccess('Квоты обновлены')
        return resp.data
      } catch (e) {
        console.error('Error updating quotas:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось изменить квоты')
        return null
      }
    },

    /**
     * GET /api/v1/admin/galleries/:id/invites - Пригласительные ссылки (лениво создаются на бэкенде)
     */
    async getInviteLinks(galleryId) {
      try {
        const resp = await apiClient.get(`/api/v1/admin/galleries/${galleryId}/invites`)
        return resp.data
      } catch (e) {
        console.error('Error fetching invite links:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось загрузить пригласительные ссылки')
        return null
      }
    },

    /**
     * PATCH /api/v1/admin/galleries/:id/invites/regenerate - Перевыпустить ссылку (старая перестаёт работать)
     * @param {string} galleryId
     * @param {'manager'|'artist'} role
     */
    async regenerateInviteLink(galleryId, role) {
      try {
        const resp = await apiClient.patch(`/api/v1/admin/galleries/${galleryId}/invites/regenerate`, { role })
        notifyServerSuccess('Ссылка перевыпущена, старая больше не действует')
        return resp.data
      } catch (e) {
        console.error('Error regenerating invite link:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось перевыпустить ссылку')
        return null
      }
    },

    /**
     * POST /api/v1/admin/users/:id/impersonate - Зайти под пользователем.
     * Переключает активную сессию браузера на имперсонируемого пользователя,
     * запомнив исходную (свою) сессию для последующего возврата.
     */
    async impersonate(id) {
      let success = true
      try {
        const resp = await apiClient.post(`/api/v1/admin/users/${id}/impersonate`)
        const { user, session } = resp.data
        startImpersonation(user, session)
      } catch (e) {
        console.error('Error impersonating user:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось зайти под пользователем')
        success = false
      }
      return success
    },

    /**
     * POST /api/v1/admin/impersonate/stop - Выйти из режима имперсонации
     * обратно в свой аккаунт. Запрос обязан уйти ДО переключения токена
     * обратно — бэкенд определяет завершаемую сессию по текущему заголовку
     * Authorization (см. UserManagementService.stopImpersonation).
     */
    async stopImpersonation() {
      try {
        await apiClient.post('/api/v1/admin/impersonate/stop')
      } catch (e) {
        console.error('Error stopping impersonation:', e)
      } finally {
        endImpersonation()
      }
    },
  }
})
