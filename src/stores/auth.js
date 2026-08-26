// stores/art.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'
import { setUser, setSession } from '@/services/auth.js'

export const useAuth = defineStore('auth', {
  state: () => {
    return {
      // Auth    
      user: null,
      session: null     
    }
  },   

  actions: {
    // ==================== LOCATIONS ACTIONS ====================
    
    /**
     * GET /api/v1/art/locations - Получить все локации
     */
    async login(email, password) {     
      let success = true
      try {
        const resp = await apiClient.post('/api/v1/auth/login', { email, password })
        this.user = resp.data?.user || null
        this.session = resp.data?.session || null
        setUser(this.user)
        setSession(this.session)
        console.log('User Data', resp.data)
      } catch (e) {
        console.error('Error fetching data:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load user data')
        this.error = e?.response?.data?.message || 'Failed to load user data'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },
 
    /**
     * POST /api/v1/auth/register - Регистрация нового пользователя с автоматическим входом
     */
    async register(userData) {
      let success = true
      try {
        const resp = await apiClient.post('/api/v1/auth/register', userData)
        this.user = resp.data?.user || null
        this.session = resp.data?.session || null
        setUser(this.user)
        setSession(this.session)
      } catch (e) {
        console.error('Error registering user:', e)
        notifyServerError(e?.response?.data?.message || 'Не удалось зарегистрироваться')
        this.error = e?.response?.data?.message || 'Не удалось зарегистрироваться'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * POST /api/v1/auth/forgot-password - Запросить восстановление пароля
     */
    async requestPasswordReset(email) {
      let success = true
      try {
        await apiClient.post('/api/v1/auth/forgot-password', { email })
      } catch (e) {
        console.error('Error requesting password reset:', e)
        notifyServerError(e?.response?.data?.message || 'Не удалось отправить письмо')
        this.error = e?.response?.data?.message || 'Не удалось отправить письмо'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * POST /api/v1/auth/reset-password - Установить новый пароль по токену из письма
     */
    async resetPassword(token, password) {
      let success = true
      try {
        await apiClient.post('/api/v1/auth/reset-password', { token, password })
      } catch (e) {
        console.error('Error resetting password:', e)
        notifyServerError(e?.response?.data?.message || 'Не удалось сбросить пароль')
        this.error = e?.response?.data?.message || 'Не удалось сбросить пароль'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * POST /api/v1/auth/change-password - Сменить пароль (требует текущий пароль)
     */
    async changePassword(currentPassword, newPassword) {
      let success = true
      try {
        await apiClient.post('/api/v1/auth/change-password', { currentPassword, newPassword })
        notifyServerSuccess('Пароль изменён')
      } catch (e) {
        console.error('Error changing password:', e)
        notifyServerError(e?.response?.data?.message || 'Не удалось сменить пароль')
        this.error = e?.response?.data?.message || 'Не удалось сменить пароль'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * GET /api/v1/auth/sessions - Получить список активных сессий
     */
    async getSessions() {
      let result = []
      try {
        const resp = await apiClient.get('/api/v1/auth/sessions')
        result = resp.data || []
      } catch (e) {
        console.error('Error fetching sessions:', e)
        notifyServerError(e?.response?.data?.message || 'Не удалось загрузить сессии')
        this.error = e?.response?.data?.message || 'Не удалось загрузить сессии'
        result = []
      }
      return result
    },

    /**
     * POST /api/v1/auth/sessions/revoke - Завершить одну сессию
     */
    async revokeSession(token) {
      let success = true
      try {
        await apiClient.post('/api/v1/auth/sessions/revoke', { token })
        notifyServerSuccess('Сессия завершена')
      } catch (e) {
        console.error('Error revoking session:', e)
        notifyServerError(e?.response?.data?.message || 'Не удалось завершить сессию')
        this.error = e?.response?.data?.message || 'Не удалось завершить сессию'
        success = false
      }
      return success
    },

    /**
     * POST /api/v1/auth/sessions/revoke-others - Завершить все сессии, кроме текущей
     */
    async revokeOtherSessions() {
      let success = true
      try {
        await apiClient.post('/api/v1/auth/sessions/revoke-others')
        notifyServerSuccess('Остальные сессии завершены')
      } catch (e) {
        console.error('Error revoking other sessions:', e)
        notifyServerError(e?.response?.data?.message || 'Не удалось завершить сессии')
        this.error = e?.response?.data?.message || 'Не удалось завершить сессии'
        success = false
      }
      return success
    },

    /**
     * Сбросить все состояние локаций
     */
    resetLocationsState() {
      this.user = null
      this.session = null
    }
  }
})